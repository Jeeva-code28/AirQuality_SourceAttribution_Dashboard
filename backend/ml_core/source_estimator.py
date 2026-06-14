# This file contains the AttributionModel class and a runnable example.

import os
import json
import math
from typing import List, Tuple, Optional, Dict

import numpy as np
import pandas as pd
import joblib
from sklearn.multioutput import MultiOutputRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import TimeSeriesSplit
import lightgbm as lgb
from tqdm import tqdm
from datetime import datetime, timedelta

# Optuna is optional but recommended for hyperparameter tuning
try:
    import optuna
    _OPTUNA_AVAILABLE = True
except Exception:
    _OPTUNA_AVAILABLE = False


class AttributionModel:
    """
    AttributionModel
    - Uses ALR (additive log-ratio) transform for compositional targets
    - Trains an ensemble of LightGBM models (bootstrapped) and saves artifacts
    - Predict returns mean & std per source and a confidence score

    Usage:
        est = AttributionModel(model_dir="models/source_estimator")
        est.train(df, test_frac=0.2, n_ensemble=5, optuna_trials=30)
        est.predict(input_dict)
    """

    def __init__(self, model_dir: str = "models/source_estimator"):
        self.model_dir = model_dir
        os.makedirs(self.model_dir, exist_ok=True)

        # canonical list of sources (order matters)
        self.sources: List[str] = ["transport", "dust", "industry", "stubble", "residential", "regional"]

        # trained artifacts
        self.feature_list: List[str] = []
        self.scaler = None
        self.ensemble_paths: List[str] = []
        self.alr_ref: str = self.sources[-1]  # default reference ('regional')
        self.meta_path = os.path.join(self.model_dir, "meta.json")

        # in-memory ensemble (filled after load())
        self.models = []  # list of joblib loaded models

        # constants
        self._EPS = 1e-8

        # Try to load existing meta if present
        if os.path.exists(self.meta_path):
            try:
                self._load_meta()
            except Exception:
                # silence; we'll re-train or explicitly load later
                pass

    # -------------------------
    # Compositional utils (ALR)
    # -------------------------
    def _alr_transform(self, Y: np.ndarray, ref_idx: int) -> np.ndarray:
        """
        Y: shape (n_samples, K) where rows sum ~1 (compositions)
        returns Z: shape (n_samples, K-1) where z_i = log(y_i / y_ref) for i != ref
        """
        Y = np.clip(Y, self._EPS, None)
        ref = Y[:, ref_idx:ref_idx + 1]  # shape (n,1)
        others = np.delete(Y, ref_idx, axis=1)  # (n, K-1)
        Z = np.log(others / ref)
        return Z

    def _alr_inverse(self, Z: np.ndarray, ref_idx: int, K: int) -> np.ndarray:
        """
        Z: (n_samples, K-1)
        returns Y: (n_samples, K) compositions summing to 1
        """
        expZ = np.exp(Z)  # (n, K-1)
        denom = 1.0 + np.sum(expZ, axis=1, keepdims=True)  # (n,1)
        ref = 1.0 / denom  # (n,1)
        others = expZ * ref  # broadcast -> (n, K-1)
        # reinsert ref column into correct position
        Y = np.zeros((Z.shape[0], K))
        idx = 0
        for j in range(K):
            if j == ref_idx:
                Y[:, j] = ref.ravel()
            else:
                Y[:, j] = others[:, idx]
                idx += 1
        # numerically normalize
        Y = Y / Y.sum(axis=1, keepdims=True)
        return Y

    # -------------------------
    # Feature engineering & utils
    # -------------------------
    def enrich(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        # Accept timestamp as datetime, string, or numeric epoch
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df['hour'] = df['timestamp'].dt.hour
            df['dow'] = df['timestamp'].dt.dayofweek
            df['month'] = df['timestamp'].dt.month
        else:
            # Do not modify if hour/dow already present or it's intended to be provided
            pass

        # ratio pm2.5 / pm10 (avoid division by zero)
        if 'pm2_5' in df.columns and 'pm10' in df.columns:
            df['pm25_pm10'] = df['pm2_5'] / (df['pm10'] + 1e-6)
        else:
            df['pm25_pm10'] = 0.0

        # wind direction encoding
        if 'wind_dir' in df.columns:
            wd = df['wind_dir'].fillna(0.0).astype(float)
            rad = np.deg2rad(wd)
            df['wind_sin'] = np.sin(rad)
            df['wind_cos'] = np.cos(rad)
        else:
            df['wind_sin'] = 0.0
            df['wind_cos'] = 0.0

        # defaults for optional remote-sensing features
        if 'aod' not in df.columns:
            df['aod'] = 0.0
        if 'fire_count' not in df.columns:
            df['fire_count'] = 0.0

        # ensure numeric dtype for common features
        for c in ['pm2_5','pm10','no2','so2','co','o3','wind_speed','temp','humidity','hour','dow','pm25_pm10','aod','fire_count','wind_sin','wind_cos','month']:
            if c in df.columns:
                df[c] = pd.to_numeric(df[c].fillna(0.0), errors='coerce').fillna(0.0)

        return df

    def features_targets(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Optional[np.ndarray]]:
        """
        Returns X (DataFrame) and Y (np.ndarray) if targets present (transformed ALR),
        otherwise returns X and None.
        """
        df = self.enrich(df)

        # canonical features used by model (extend as needed)
        feats = [
            "pm2_5","pm10","no2","so2","co","o3",
            "wind_speed","wind_sin","wind_cos",
            "temp","humidity","hour","dow","pm25_pm10",
            "aod","fire_count","month"
        ]

        # Ensure columns exist
        for f in feats:
            if f not in df.columns:
                df[f] = 0.0

        X = df[feats].fillna(0.0).astype(float)

        # Targets exist?
        if all(s in df.columns for s in self.sources):
            Y_raw = df[self.sources].fillna(0.0).astype(float).values  # shape (n,K)
            # Normalize rows to compositional (sum to 1)
            row_sums = Y_raw.sum(axis=1, keepdims=True); row_sums[row_sums == 0] = 1.0
            Y_comp = Y_raw / row_sums
            # pick reference index (we store ref as self.alr_ref)
            ref_idx = self.sources.index(self.alr_ref)
            Y_alr = self._alr_transform(Y_comp, ref_idx=ref_idx)  # shape (n, K-1)
            return X, Y_alr
        else:
            return X, None

    # -------------------------
    # Meta save/load utilities
    # -------------------------
    def _save_meta(self):
        meta = {
            "feature_list": self.feature_list,
            "ensemble_paths": self.ensemble_paths,
            "alr_ref": self.alr_ref,
            "sources": self.sources
        }
        with open(self.meta_path, "w") as fh:
            json.dump(meta, fh, indent=2)

    def _load_meta(self):
        with open(self.meta_path, "r") as fh:
            meta = json.load(fh)
        self.feature_list = meta.get("feature_list", [])
        self.ensemble_paths = meta.get("ensemble_paths", [])
        self.alr_ref = meta.get("alr_ref", self.alr_ref)
        self.sources = meta.get("sources", self.sources)

    # -------------------------
    # Training
    # -------------------------
    def train(self, df: pd.DataFrame, test_frac: float = 0.2,
              n_ensemble: int = 5, optuna_trials: int = 30,
              random_seed: int = 42) -> Dict[str, Dict[str, float]]:
        """
        Train ensemble:
          - choose ALR reference automatically (lowest variance component by default)
          - run Optuna to find best hyperparams for LightGBM across ALR targets (mean RMSE)
          - train n_ensemble models via bootstrap sampling with best params
          - save scaler, features.json, ensemble models, meta.json

        Returns holdout metrics per source.
        """
        df = df.copy().reset_index(drop=True)
        # if timestamp exists, sort
        if 'timestamp' in df.columns:
            df = df.sort_values('timestamp').reset_index(drop=True)

        # pick ALR reference: column with smallest variance in composition (after normalization)
        # compute raw target compositions if available
        if not all(s in df.columns for s in self.sources):
            raise ValueError("Training data must contain all source columns: " + ",".join(self.sources))

        # normalize raw targets to compositions first
        Y_raw = df[self.sources].fillna(0.0).astype(float).values
        row_sums = Y_raw.sum(axis=1, keepdims=True); row_sums[row_sums == 0] = 1.0
        Y_comp = Y_raw / row_sums
        variances = np.var(Y_comp, axis=0)
        ref_idx = int(np.argmin(variances))
        self.alr_ref = self.sources[ref_idx]
        print(f"[train] selected ALR reference: '{self.alr_ref}' (index {ref_idx}) based on minimum variance")

        # split
        split = int(len(df) * (1 - test_frac))
        train_df = df.iloc[:split].reset_index(drop=True)
        test_df = df.iloc[split:].reset_index(drop=True)

        X_train, Y_alr_train = self.features_targets(train_df)
        X_test, Y_alr_test = self.features_targets(test_df)

        # save feature ordering
        self.feature_list = list(X_train.columns)

        # Fit scaler on training set
        self.scaler = StandardScaler()
        X_train_s = self.scaler.fit_transform(X_train)
        X_test_s = self.scaler.transform(X_test)

        # Optuna hyperparam tuning (minimize mean RMSE across ALR targets)
        def _run_optuna(trials: int = 30, seed: int = random_seed):
            if not _OPTUNA_AVAILABLE:
                print("[train] optuna not available - using default params")
                return {
                    "n_estimators": 1000, # Increased for better fit
                    "learning_rate": 0.05,
                    "num_leaves": 50,    # Increased for complexity
                    "min_child_samples": 10, # Lowered for precision
                    "subsample": 0.8,
                    "colsample_bytree": 0.8,
                    "reg_alpha": 0.0,
                    "reg_lambda": 0.0
                }

            def objective(trial):
                params = {
                    "n_estimators": trial.suggest_int("n_estimators", 200, 2000, step=100),
                    "learning_rate": trial.suggest_loguniform("learning_rate", 0.01, 0.2),
                    "num_leaves": trial.suggest_int("num_leaves", 16, 256),
                    "min_child_samples": trial.suggest_int("min_child_samples", 5, 100),
                    "subsample": trial.suggest_float("subsample", 0.5, 1.0),
                    "colsample_bytree": trial.suggest_float("colsample_bytree", 0.4, 1.0),
                    "reg_alpha": trial.suggest_loguniform("reg_alpha", 1e-8, 10.0),
                    "reg_lambda": trial.suggest_loguniform("reg_lambda", 1e-8, 10.0),
                }
                # CV by time
                tscv = TimeSeriesSplit(n_splits=4)
                fold_scores = []
                for train_idx, val_idx in tscv.split(X_train_s):
                    Xt = X_train_s[train_idx]; Xv = X_train_s[val_idx]
                    Yt = Y_alr_train[train_idx]; Yv = Y_alr_train[val_idx]

                    # multi-output regressor with pipeline
                    base = lgb.LGBMRegressor(random_state=seed, **params)
                    pipe = Pipeline([("lgbm", base)])  # scaler already applied
                    mor = MultiOutputRegressor(pipe, n_jobs=1)
                    mor.fit(Xt, Yt)
                    pred = mor.predict(Xv)
                    rmse = math.sqrt(mean_squared_error(Yv, pred))
                    fold_scores.append(rmse)
                return float(np.mean(fold_scores))

            study = optuna.create_study(direction="minimize", sampler=optuna.samplers.TPESampler(seed=seed))
            study.optimize(objective, n_trials=trials, show_progress_bar=True)
            print("[train] Optuna best params:", study.best_trial.params)
            return study.best_trial.params

        best_params = _run_optuna(optuna_trials)

        # cast / fill defaults
        best_params = {
            "n_estimators": int(best_params.get("n_estimators", 500)),
            "learning_rate": float(best_params.get("learning_rate", 0.05)),
            "num_leaves": int(best_params.get("num_leaves", 31)),
            "min_child_samples": int(best_params.get("min_child_samples", 20)),
            "subsample": float(best_params.get("subsample", 0.8)),
            "colsample_bytree": float(best_params.get("colsample_bytree", 0.8)),
            "reg_alpha": float(best_params.get("reg_alpha", 0.0)),
            "reg_lambda": float(best_params.get("reg_lambda", 0.0)),
            "random_state": random_seed,
            "verbose": -1
        }

        print("[train] best_params (finalized):", best_params)

        # Train ensemble via bootstrap sampling with different seeds
        self.ensemble_paths = []
        trained_models = []
        for m in tqdm(range(n_ensemble), desc="Training ensemble"):
            seed = random_seed + m
            # bootstrap sample indices from training set
            idxs = np.random.RandomState(seed).choice(np.arange(X_train_s.shape[0]),
                                                      size=X_train_s.shape[0], replace=True)
            Xt_bs = X_train_s[idxs]
            Yt_bs = Y_alr_train[idxs]

            # Remove random_state from best_params if it's there to avoid duplicate argument
            # as random_state is already passed separately with 'seed'
            lgbm_params = best_params.copy()
            if 'random_state' in lgbm_params:
                del lgbm_params['random_state']

            base = lgb.LGBMRegressor(**lgbm_params, random_state=seed)
            pipe = Pipeline([("lgbm", base)])  # scaler handled separately
            mor = MultiOutputRegressor(pipe, n_jobs=-1)
            mor.fit(Xt_bs, Yt_bs)

            model_path = os.path.join(self.model_dir, f"ensemble_model_{m}.joblib")
            joblib.dump(mor, model_path)
            self.ensemble_paths.append(model_path)
            trained_models.append(mor)

        # Save scaler & feature list & meta
        joblib.dump(self.scaler, os.path.join(self.model_dir, "scaler.joblib"))
        with open(os.path.join(self.model_dir, "features.json"), "w") as fh:
            json.dump(self.feature_list, fh, indent=2)
        self._save_meta()

        # Evaluate on test set using ensemble mean
        preds_alr_ensemble = []
        for model in trained_models:
            p = model.predict(X_test_s)  # shape (n_samples, K-1)
            preds_alr_ensemble.append(p)
        preds_alr_mean = np.mean(np.stack(preds_alr_ensemble, axis=0), axis=0)  # (n_samples, K-1)

        # inverse transform to compositions
        K = len(self.sources)
        Y_pred_comp = self._alr_inverse(preds_alr_mean, ref_idx=ref_idx, K=K)
        Y_true_comp = Y_comp[split:]  # original composition for test_df

        # compute per-source metrics on compositions
        from sklearn.metrics import r2_score, mean_absolute_error
        metrics = {}
        for i, s in enumerate(self.sources):
            r2 = float(r2_score(Y_true_comp[:, i], Y_pred_comp[:, i]))
            mae = float(mean_absolute_error(Y_true_comp[:, i], Y_pred_comp[:, i]))
            metrics[s] = {"r2": r2, "mae": mae}
            print(f"[test] {s}: R2={r2:.4f}, MAE={mae:.4f}")

        # keep trained models in memory
        self.models = trained_models

        return metrics

    # -------------------------
    # Load / predict
    # -------------------------
    def load(self):
        """Load scaler, meta and ensemble models into memory."""
        self._load_meta()
        scaler_path = os.path.join(self.model_dir, "scaler.joblib")
        if os.path.exists(scaler_path):
            self.scaler = joblib.load(scaler_path)
        else:
            raise FileNotFoundError("Scaler not found at " + scaler_path)

        # load models
        self.models = []
        for p in self.ensemble_paths:
            if os.path.exists(p):
                self.models.append(joblib.load(p))
            else:
                raise FileNotFoundError("Ensemble model not found: " + p)

    def predict(self, input_dict: dict, return_std: bool = True) -> Dict[str, float]:
        """
        Predict source composition for a single sample.
        input_dict should contain keys for features expected, e.g:
        'pm2_5','pm10','no2','so2','co','o3','wind_speed','wind_dir','temp','humidity','timestamp','aod','fire_count'
        Returns: dict {source: mean_prob, ...} and stores confidences under key 'confidence' if return_std True
        """
        # Ensure models loaded
        if not self.models:
            try:
                self.load()
            except Exception as e:
                raise RuntimeError(f"Model not loaded and could not be loaded: {e}")

        # Prepare single-row DataFrame
        df = pd.DataFrame([input_dict]).copy()
        # If timestamp present in input_dict, keep; else allow model.enrich to fill hour/dow using current time
        if 'timestamp' in df.columns and (isinstance(df.loc[0,'timestamp'], (int,float))):
            df.loc[0,'timestamp'] = pd.to_datetime(df.loc[0,'timestamp'], unit='s')
        elif 'timestamp' in df.columns and isinstance(df.loc[0,'timestamp'], str):
            try:
                df.loc[0,'timestamp'] = pd.to_datetime(df.loc[0,'timestamp'])
            except Exception:
                df.loc[0,'timestamp'] = pd.to_datetime("now")

        X_df, _ = self.features_targets(df)
        # Reorder columns as training feature list if available
        if self.feature_list:
            # ensure feature_list keys exist in X_df
            for f in self.feature_list:
                if f not in X_df.columns:
                    X_df[f] = 0.0
            X_df = X_df[self.feature_list]

        # scale
        if self.scaler is None:
            raise RuntimeError("Scaler is not loaded")
        X_s = self.scaler.transform(X_df)

        # ensemble predictions on ALR space
        preds_alr = []
        for model in self.models:
            p = model.predict(X_s)  # (1, K-1)
            preds_alr.append(p[0])
        preds_alr = np.stack(preds_alr, axis=0)  # (n_models, K-1)

        mean_alr = np.mean(preds_alr, axis=0, keepdims=False)  # (K-1,)
        std_alr = np.std(preds_alr, axis=0, keepdims=False)    # (K-1,)

        # inverse ALR to composition
        ref_idx = self.sources.index(self.alr_ref)
        K = len(self.sources)
        Y_pred_comp = self._alr_inverse(mean_alr.reshape(1, -1), ref_idx=ref_idx, K=K)[0]  # (K,)

        # compute approximate uncertainty in composition space by Monte Carlo from ALR normal approx
        # draw a few samples using mean_alr, std_alr (avoid too many draws)
        try:
            n_draws = min(200, max(50, len(self.models) * 40))
            rng = np.random.default_rng(seed=12345)
            draws = rng.normal(loc=mean_alr, scale=np.maximum(std_alr, 1e-6), size=(n_draws, mean_alr.shape[0]))
            comps = np.array([self._alr_inverse(d.reshape(1, -1), ref_idx=ref_idx, K=K)[0] for d in draws])
            comp_std = comps.std(axis=0)
        except Exception:
            comp_std = np.full(K, 0.0)

        result = {}
        confidences = {}
        for i, s in enumerate(self.sources):
            result[s] = float(np.clip(Y_pred_comp[i], 0.0, 1.0))
            confidences[s] = float(comp_std[i])

        # Normalize again to sum=1 to correct numeric issues
        vals = np.array([result[s] for s in self.sources], dtype=float)
        svals = vals.sum()
        if svals == 0:
            vals = np.ones_like(vals) / len(vals)
        else:
            vals = vals / svals
        for i, s in enumerate(self.sources):
            result[s] = float(vals[i])

        # Provide an aggregate confidence metric (1 - normalized uncertainty)
        # Normalized uncertainty: std_sum / mean_sum (heuristic)
        uncertainty = float(np.sum(list(confidences.values())))
        mean_sum = float(np.sum(vals))
        # confidence in [0,1]
        confidence_score = max(0.0, 1.0 - min(1.0, uncertainty / (mean_sum + 1e-6)))

        if return_std:
            return {
                "sources": result,
                "std": {s: float(confidences[s]) for s in self.sources},
                "confidence": confidence_score
            }
        else:
            return {"sources": result, "confidence": confidence_score}


if __name__ == "__main__":
    # Generate synthetic data for demonstration
    def generate_synthetic_data(num_samples=1000):
        np.random.seed(42)
        start_date = datetime(2023, 1, 1)
        data = {
            'timestamp': [start_date + timedelta(hours=i) for i in range(num_samples)],
            'pm2_5': np.random.rand(num_samples) * 50 + 10,
            'pm10': np.random.rand(num_samples) * 80 + 20,
            'no2': np.random.rand(num_samples) * 30 + 5,
            'so2': np.random.rand(num_samples) * 15 + 1,
            'co': np.random.rand(num_samples) * 5 + 0.1,
            'o3': np.random.rand(num_samples) * 60 + 10,
            'wind_speed': np.random.rand(num_samples) * 10,
            'wind_dir': np.random.rand(num_samples) * 360,
            'temp': np.random.rand(num_samples) * 30 + 5,
            'humidity': np.random.rand(num_samples) * 60 + 20,
            'aod': np.random.rand(num_samples) * 0.5,
            'fire_count': np.random.randint(0, 5, num_samples)
        }

        # Generate compositional targets that sum to 1
        sources = ['transport', 'dust', 'industry', 'stubble', 'residential', 'regional']
        num_sources = len(sources)
        source_data = {src: [] for src in sources}
        for _ in range(num_samples):
            comp = np.random.rand(num_sources)
            comp = comp / comp.sum()
            for i, src in enumerate(sources):
                source_data[src].append(comp[i])
        data.update(source_data)

        df = pd.DataFrame(data)
        return df

    # Generate synthetic data
    df_synthetic = generate_synthetic_data()
    print("Generated Synthetic Data Head:")
    print(df_synthetic.head())

    # Instantiate the AttributionModel
    model_dir = "./trained_attribution_model"
    os.makedirs(model_dir, exist_ok=True)

    est = AttributionModel(model_dir=model_dir)

    # Train the model
    print("\nStarting Model Training...")
    metrics = est.train(df_synthetic, test_frac=0.2, n_ensemble=3, optuna_trials=5)

    print("\nModel Training Complete. Test Set Metrics:")
    for source, vals in metrics.items():
        print(f"  {source}: R2={vals['r2']:.4f}, MAE={vals['mae']:.4f}")

    # Make a prediction on unseen data
    print("\nMaking a prediction on unseen data...")
    unseen_data_input = {
        'timestamp': datetime(2023, 1, 10, 10, 0, 0),
        'pm2_5': 45.0,
        'pm10': 70.0,
        'no2': 25.0,
        'so2': 10.0,
        'co': 3.5,
        'o3': 55.0,
        'wind_speed': 5.5,
        'wind_dir': 270.0, # West wind
        'temp': 20.0,
        'humidity': 70.0,
        'aod': 0.3,
        'fire_count': 1
    }

    prediction_result = est.predict(unseen_data_input, return_std=True)

    print("\nPrediction for unseen data:")
    print("Source Attributions:")
    for source, prob in prediction_result['sources'].items():
        print(f"  {source}: {prob:.4f}")

    print("\nStandard Deviations (Uncertainty):")
    for source, std in prediction_result['std'].items():
        print(f"  {source}: {std:.4f}")

    print(f"\nOverall Confidence Score: {prediction_result['confidence']:.4f}")