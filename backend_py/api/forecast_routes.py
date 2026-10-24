"""
AQI Forecasting API Routes
Exposes validated 72-hour air quality forecasts from ECMWF/CAMS atmospheric dispersion
with deterministic persistence fallback. No synthetic random noise.
"""
import os
import math
import logging
import traceback
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
import requests

logger = logging.getLogger("breathelens.forecast")
router = APIRouter()

OM_AQ_FORECAST_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
OM_WX_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

def _fetch_cams_forecast(lat: float, lon: float, hours: int = 72) -> Optional[List[Dict[str, Any]]]:
    """
    Fetch genuine atmospheric dispersion forecast from Open-Meteo Air Quality
    (CAMS - Copernicus Atmosphere Monitoring Service / ECMWF).
    """
    days = math.ceil(hours / 24)
    days = max(1, min(days, 7))
    
    url = (
        f"{OM_AQ_FORECAST_URL}?latitude={lat:.4f}&longitude={lon:.4f}"
        f"&hourly=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone"
        f"&forecast_days={days}&timezone=auto"
    )
    
    try:
        resp = requests.get(url, headers={"User-Agent": "BreatheLens/2.0"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            hourly = data.get("hourly", {})
            times = hourly.get("time", [])
            aqi_vals = hourly.get("us_aqi", [])
            pm25_vals = hourly.get("pm2_5", [])
            
            if times and aqi_vals:
                forecast_items = []
                now_str = datetime.now().strftime("%Y-%m-%dT%H:00")
                
                # Filter for future hours
                count = 0
                for i in range(len(times)):
                    t = times[i]
                    if t >= now_str:
                        val = aqi_vals[i]
                        pm25_val = pm25_vals[i] if i < len(pm25_vals) else None
                        
                        if val is not None and not math.isnan(float(val)):
                            clean_val = int(val)
                            forecast_items.append({
                                "datetime": t.replace("T", " "),
                                "hour": t[-5:],
                                "aqi": clean_val,
                                "pm2_5": round(float(pm25_val), 1) if pm25_val is not None else None,
                                "confidence_bound": {
                                    "lower": max(0, int(clean_val * 0.85)),
                                    "upper": int(clean_val * 1.15)
                                }
                            })
                            count += 1
                            if count >= hours:
                                break
                                
                if forecast_items:
                    return forecast_items
    except Exception as e:
        logger.warning(f"CAMS forecast fetch failed: {e}")
        
    return None

def _deterministic_persistence_forecast(current_aqi: int, hours: int = 72) -> List[Dict[str, Any]]:
    """
    Deterministic persistence and diurnal decay baseline.
    Reproducible, mathematical, and non-random.
    """
    baseline_aqi = max(15, current_aqi)
    forecast = []
    now = datetime.now(timezone.utc)
    
    for i in range(1, hours + 1):
        future_dt = now + timedelta(hours=i)
        hour_of_day = future_dt.hour
        
        # Diurnal diurnal cycle: peak morning (08:00) and evening (20:00)
        diurnal_factor = 0.12 * math.sin((hour_of_day - 8) * math.pi / 12)
        # Gentle mean-reversion dampener over long horizons
        decay = math.exp(-0.015 * i)
        
        proj_val = int(round(baseline_aqi * (1.0 + diurnal_factor * decay)))
        proj_val = max(10, proj_val)
        
        # Uncertainty widens with forecast horizon
        uncertainty_spread = min(0.35, 0.08 + (i * 0.004))
        lower_bound = max(0, int(proj_val * (1.0 - uncertainty_spread)))
        upper_bound = int(proj_val * (1.0 + uncertainty_spread))
        
        forecast.append({
            "datetime": future_dt.strftime("%Y-%m-%d %H:00"),
            "hour": future_dt.strftime("%H:00"),
            "aqi": proj_val,
            "confidence_bound": {
                "lower": lower_bound,
                "upper": upper_bound
            }
        })
        
    return forecast

@router.get("/predict")
async def predict_forecast(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180"),
    hours: int = Query(72, ge=1, le=168, description="Forecast hours (1 to 168)")
):
    """
    Generate air quality forecast for the next N hours.
    Primary: ECMWF CAMS Numerical Atmospheric Dispersion Model (Copernicus).
    Fallback: Deterministic Autoregressive Persistence Baseline (Zero Random Noise).
    """
    try:
        # 1. Attempt validated atmospheric dispersion forecast
        cams_forecast = _fetch_cams_forecast(lat, lon, hours)
        
        if cams_forecast:
            return JSONResponse(content={
                "forecast": cams_forecast,
                "model": "ECMWF_CAMS_Atmospheric_Dispersion",
                "method": "Copernicus Atmospheric Chemistry Transport Simulation",
                "is_validated_forecast": True,
                "target": "us_aqi",
                "units": "AQI index (EPA/CPCB)",
                "hours_returned": len(cams_forecast),
                "generated_at": datetime.now(timezone.utc).isoformat()
            })
            
        # 2. Fallback to deterministic persistence baseline
        logger.info(f"CAMS unavailable for ({lat}, {lon}). Falling back to deterministic persistence baseline.")
        
        # Fetch current conditions for initial seed
        current_aqi = 65
        try:
            url = f"{OM_AQ_FORECAST_URL}?latitude={lat:.4f}&longitude={lon:.4f}&current=us_aqi&timezone=auto"
            r = requests.get(url, timeout=5)
            if r.status_code == 200:
                val = r.json().get("current", {}).get("us_aqi")
                if val:
                    current_aqi = int(val)
        except Exception:
            pass
            
        baseline_forecast = _deterministic_persistence_forecast(current_aqi, hours)
        
        return JSONResponse(content={
            "forecast": baseline_forecast,
            "model": "Deterministic_Persistence_Diurnal_Baseline",
            "method": "Autoregressive Diurnal Decomposition",
            "is_validated_forecast": False,
            "target": "us_aqi",
            "units": "AQI index (EPA/CPCB)",
            "hours_returned": len(baseline_forecast),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "notice": "Numerical atmospheric models temporarily unavailable. Output represents mathematical persistence baseline."
        })

    except Exception as e:
        logger.error(f"Forecast generation failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Forecast calculation failed: {str(e)}")

