"""
AQI Forecasting API Routes
Exposes the LSTM AQI forecasting model as a live endpoint for 72-hour predictions.
"""
import os
import traceback
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
import requests

router = APIRouter()

# Lazy-loaded forecaster singleton
_forecaster = None

def _get_forecaster():
    """Lazy-load the AQIForecaster."""
    global _forecaster
    if _forecaster is None:
        try:
            from ml_core.lstm_aqi_forecaster import AQIForecaster
            _forecaster = AQIForecaster()
            print("[OK] AQI Forecaster loaded successfully")
        except Exception as e:
            print(f"[WARN] AQI Forecaster failed to load: {e}")
            _forecaster = "UNAVAILABLE"
    return _forecaster


def _fetch_current_conditions(lat: float, lon: float) -> dict:
    """Fetch current conditions for the LSTM model input."""
    conditions = {}

    # Air Quality
    aq_url = (
        f"https://air-quality-api.open-meteo.com/v1/air-quality"
        f"?latitude={lat}&longitude={lon}"
        f"&current=us_aqi,pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide"
        f"&timezone=auto"
    )
    try:
        resp = requests.get(aq_url, timeout=10)
        aq = resp.json().get("current", {})
        conditions["pm2_5"] = aq.get("pm2_5", 50) or 50
        conditions["pm10"] = aq.get("pm10", 80) or 80
        conditions["nitrogen_dioxide"] = aq.get("nitrogen_dioxide", 20) or 20
        conditions["sulphur_dioxide"] = aq.get("sulphur_dioxide", 10) or 10
        conditions["ozone"] = aq.get("ozone", 30) or 30
        conditions["carbon_monoxide"] = aq.get("carbon_monoxide", 400) or 400
        conditions["us_aqi"] = aq.get("us_aqi", 100) or 100
    except Exception as e:
        print(f"AQ fetch error for forecast: {e}")
        conditions.update({
            "pm2_5": 50, "pm10": 80, "nitrogen_dioxide": 20,
            "sulphur_dioxide": 10, "ozone": 30, "carbon_monoxide": 400, "us_aqi": 100
        })

    # Weather
    wx_url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m"
        f"&timezone=auto"
    )
    try:
        resp = requests.get(wx_url, timeout=10)
        wx = resp.json().get("current", {})
        conditions["temperature_2m"] = wx.get("temperature_2m", 25) or 25
        conditions["relative_humidity_2m"] = wx.get("relative_humidity_2m", 50) or 50
        conditions["wind_speed_10m"] = wx.get("wind_speed_10m", 5) or 5
        conditions["wind_direction_10m"] = wx.get("wind_direction_10m", 180) or 180
    except Exception as e:
        print(f"Weather fetch error for forecast: {e}")
        conditions.update({
            "temperature_2m": 25, "relative_humidity_2m": 50,
            "wind_speed_10m": 5, "wind_direction_10m": 180
        })

    return conditions


@router.get("/predict")
async def predict_forecast(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    hours: int = Query(72, description="Forecast hours (default 72)")
):
    """
    Generate AQI forecast for the next N hours using the LSTM model.
    Falls back to simulation-based forecast if the model isn't available.
    """
    try:
        # Clamp hours
        hours = max(1, min(hours, 168))  # Max 7 days

        # Fetch conditions
        conditions = _fetch_current_conditions(lat, lon)

        # Get forecaster
        forecaster = _get_forecaster()

        model_used = "simulation_fallback"
        if forecaster and forecaster != "UNAVAILABLE":
            try:
                forecast = forecaster.predict_forecast(conditions, hours=hours)
                # Check if LSTM was actually used vs simulation
                if forecaster.model is not None:
                    model_used = "lstm_v1"
                else:
                    model_used = "simulation_fallback"
            except Exception as e:
                print(f"Forecaster predict error: {e}")
                traceback.print_exc()
                # Manual simulation fallback
                from ml_core.lstm_aqi_forecaster import AQIForecaster
                temp_forecaster = AQIForecaster.__new__(AQIForecaster)
                forecast = temp_forecaster._simulation_forecast(conditions, hours)
        else:
            # Direct simulation
            import math
            import random
            from datetime import timedelta

            forecast = []
            current_time = datetime.now()
            current_aqi = conditions.get("pm2_5", 100)

            for i in range(hours):
                future_time = current_time + timedelta(hours=i + 1)
                hour = future_time.hour
                cycle = math.sin((hour - 4) * math.pi / 12)
                mean_reversion = (100 - current_aqi) * 0.05
                noise = random.randint(-5, 5)
                variation = cycle * 10 + mean_reversion + noise
                val = max(10, current_aqi + variation)
                current_aqi = val

                forecast.append({
                    "hour": future_time.strftime("%H:00"),
                    "datetime": future_time.strftime("%Y-%m-%d %H:00"),
                    "aqi": int(val)
                })

        return JSONResponse(content={
            "forecast": forecast,
            "model": model_used,
            "hours": hours,
            "current_conditions": {
                "aqi": conditions.get("us_aqi", -1),
                "pm2_5": conditions.get("pm2_5", -1),
                "temperature": conditions.get("temperature_2m", -1),
                "wind_speed": conditions.get("wind_speed_10m", -1)
            }
        })

    except Exception as e:
        print(f"Forecast error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Forecast prediction failed: {str(e)}")
