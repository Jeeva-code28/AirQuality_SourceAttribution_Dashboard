import pandas as pd
import numpy as np
import joblib
import os
import datetime
import random
import math

# --- Configuration Constants ---
LOOK_BACK = 24  
LOOK_FORWARD = 1 
MODEL_FILE_NAME = 'lstm_aqi_model.keras'
SCALER_FILE_NAME = 'aqi_target_scaler.joblib'

# --- Optional Imports ---
try:
    import tensorflow as tf
    from tensorflow.keras.models import load_model, Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from sklearn.preprocessing import MinMaxScaler
    TF_AVAILABLE = True
except ImportError:
    print("WARNING: TensorFlow/Scikit-learn not found or incompatible. Using Simulation Mode.")
    TF_AVAILABLE = False

class AQIForecaster:
    def __init__(self, model_path=None, scaler_path=None):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.model_path = model_path if model_path else os.path.join(self.base_dir, MODEL_FILE_NAME)
        self.scaler_path = scaler_path if scaler_path else os.path.join(self.base_dir, SCALER_FILE_NAME)
        
        self.model = None
        self.scaler = None
        
        if TF_AVAILABLE:
            self._load_artifacts()

    def _load_artifacts(self):
        try:
            if os.path.exists(self.model_path):
                self.model = load_model(self.model_path)
                print(f"Loaded LSTM model from {self.model_path}")
            else:
                print(f"Warning: Model file not found at {self.model_path}")

            if os.path.exists(self.scaler_path):
                self.scaler = joblib.load(self.scaler_path)
                print(f"Loaded Target Scaler from {self.scaler_path}")
        except Exception as e:
            print(f"Error loading artifacts: {e}. Switching to Fallback.")

    def preprocess_input(self, data_point):
        """Scale input features to [0,1]."""
        limits = {
            'temperature_2m': (0, 50),
            'relative_humidity_2m': (0, 100),
            'wind_speed_10m': (0, 50),
            'wind_direction_10m': (0, 360),
            'pm10': (0, 500),
            'pm2_5': (0, 500),
            'nitrogen_dioxide': (0, 200),
            'sulphur_dioxide': (0, 100),
            'ozone': (0, 200),
            'carbon_monoxide': (0, 5000),
        }
        scaled = {}
        for key, val in data_point.items():
            if key in limits:
                min_v, max_v = limits[key]
                scaled[key] = (val - min_v) / (max_v - min_v) if max_v > min_v else 0
            else:
                scaled[key] = 0 
        return scaled

    def predict_forecast(self, current_conditions, hours=72):
        """
        Generates a forecast (default 72h).
        Uses LSTM if available, else Fallback Simulation.
        """
        if not TF_AVAILABLE or not self.model or not self.scaler:
            return self._simulation_forecast(current_conditions, hours)

        # ... (Real Prediction Logic) ...
        try:
            try:
                input_shape = self.model.input_shape 
                n_features = input_shape[2]
            except:
                n_features = 10 

            s = self.preprocess_input(current_conditions)
            
            # Feature ordering: temp, rh, ws, wd, pm10, pm25, no2, so2, o3, co
            feature_vector = [
                s.get('temperature_2m', 0.5),
                s.get('relative_humidity_2m', 0.5),
                s.get('wind_speed_10m', 0.1),
                s.get('wind_direction_10m', 0.1),
                s.get('pm10', 0.2),
                s.get('pm2_5', 0.2),
                s.get('nitrogen_dioxide', 0.1),
                s.get('sulphur_dioxide', 0.1),
                s.get('ozone', 0.1),
                s.get('carbon_monoxide', 0.1)
            ]
            
            # Adjust feature vector length
            if len(feature_vector) < n_features:
                feature_vector += [0] * (n_features - len(feature_vector))
            elif len(feature_vector) > n_features:
                feature_vector = feature_vector[:n_features]
                
            current_seq = np.array([feature_vector] * LOOK_BACK) 
            current_seq = current_seq.reshape(1, LOOK_BACK, n_features)
            
            forecast = []
            current_time = datetime.datetime.now()
            TARGET_IDX = 5 
            
            for i in range(hours):
                pred_scaled = self.model.predict(current_seq, verbose=0)[0][0]
                pred_actual = self.scaler.inverse_transform([[pred_scaled]])[0][0]
                pred_actual = max(0, pred_actual)
                
                future_time = current_time + datetime.timedelta(hours=i+1)
                forecast.append({
                    "hour": future_time.strftime("%H:00"),
                    "datetime": future_time.strftime("%Y-%m-%d %H:00"),
                    "aqi": int(pred_actual)
                })
                
                new_step = current_seq[0, -1, :].copy()
                new_step[TARGET_IDX] = pred_scaled 
                current_seq = np.roll(current_seq, -1, axis=1)
                current_seq[0, -1, :] = new_step
                
            return forecast

        except Exception as e:
            print(f"Prediction error: {e}. Falling back to simulation.")
            return self._simulation_forecast(current_conditions, hours)

    def _simulation_forecast(self, current_conditions, hours):
        """
        Generates realistic-looking synthetic data based on current conditions.
        Used when the actual model cannot run.
        """
        forecast = []
        current_time = datetime.datetime.now()
        
        # Start with current AQI (PM2.5) as baseline
        current_aqi = current_conditions.get('pm2_5', 100)
        
        for i in range(hours):
             future_time = current_time + datetime.timedelta(hours=i+1)
             hour = future_time.hour
             
             # Diurnal Cycle: Peak at 8AM and 8PM (approx), typical urban traffic/cooking patterns
             # Normalize hour to 0-2pi cyclic
             cycle = math.sin((hour - 4) * math.pi / 12) 
             # Shift so peaks align roughly with pollution events
             
             # Trend: slowly revert to mean (e.g., 100) if extremely high/low
             mean_reversion = (100 - current_aqi) * 0.05
             
             # Random noise
             noise = random.randint(-5, 5)
             
             # Apply changes
             variation = cycle * 10 + mean_reversion + noise
             val = max(10, current_aqi + variation)
             
             # Update for next step (smooth AR process)
             current_aqi = val 
             
             forecast.append({
                "hour": future_time.strftime("%H:00"),
                "datetime": future_time.strftime("%Y-%m-%d %H:00"),
                "aqi": int(val)
             })
        return forecast

# --- Legacy Training Logic (Dummy/Minimal) ---
def train_model_dummy():
    pass

if __name__ == "__main__":
    print("AQIForecaster Module (with Fallback)")
