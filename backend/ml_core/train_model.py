import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error
import joblib
import json

# --- Configuration ---
DATASET_FILE = "dataset.csv"
MODEL_AQI = "model_aqi.pkl"
MODEL_SOURCE = "model_source.pkl"

def main():
    print("Loading dataset...")
    try:
        df = pd.read_csv(DATASET_FILE)
    except FileNotFoundError:
        print(f"Error: {DATASET_FILE} not found. Please run create_training_dataset.py first.")
        return

    # --- Preprocessing ---
    print("Preprocessing data for AQI Model...")
    df = df.dropna()

    # --- Model 1: AQI Predictor (Random Forest) ---
    # Convert 'time' to datetime for simple feature extraction if not already
    if 'time' in df.columns:
        df['datetime'] = pd.to_datetime(df['time'])
        df['month'] = df['datetime'].dt.month
        df['hour'] = df['datetime'].dt.hour
    
    feature_cols_aqi = ['temperature_2m', 'relative_humidity_2m', 'wind_speed_10m', 'wind_direction_10m', 'month', 'hour', 'latitude', 'longitude']
    target_col_aqi = 'us_aqi'

    X_aqi = df[feature_cols_aqi]
    y_aqi = df[target_col_aqi]

    X_train_aqi, X_test_aqi, y_train_aqi, y_test_aqi = train_test_split(X_aqi, y_aqi, test_size=0.2, random_state=42)

    print("Training AQI Regressor (Random Forest)...")
    rf_aqi = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_aqi.fit(X_train_aqi, y_train_aqi)

    # Evaluation
    y_pred_aqi = rf_aqi.predict(X_test_aqi)
    mse = mean_squared_error(y_test_aqi, y_pred_aqi)
    print(f"AQI Model MSE: {mse:.2f}")
    
    print("Saving AQI model...")
    joblib.dump(rf_aqi, MODEL_AQI)

    print("\nAll models trained and saved successfully.")

if __name__ == "__main__":
    main()
