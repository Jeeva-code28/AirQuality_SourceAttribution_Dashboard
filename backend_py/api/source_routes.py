"""
Source Attribution API Routes
Exposes the LightGBM ensemble source attribution model as a live endpoint.
"""
import os
import json
import traceback
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
import requests

router = APIRouter()

# Lazy-loaded model singleton
_attribution_model = None

def _get_model():
    """Lazy-load the AttributionModel to avoid startup overhead."""
    global _attribution_model
    if _attribution_model is None:
        try:
            from ml_core.source_estimator import AttributionModel
            model_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml_core")
            _attribution_model = AttributionModel(model_dir=model_dir)
            _attribution_model.load()
            print("[OK] Source Attribution Model loaded successfully")
        except Exception as e:
            print(f"[WARN] Source Attribution Model failed to load: {e}")
            _attribution_model = "UNAVAILABLE"
    return _attribution_model


def _fetch_live_conditions(lat: float, lon: float) -> dict:
    """Fetch current pollutant + weather data from Open-Meteo APIs."""
    conditions = {}

    # 1. Air Quality Data
    aq_url = (
        f"https://air-quality-api.open-meteo.com/v1/air-quality"
        f"?latitude={lat}&longitude={lon}"
        f"&current=us_aqi,pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide"
        f"&timezone=auto"
    )
    try:
        resp = requests.get(aq_url, timeout=10)
        aq_data = resp.json().get("current", {})
        conditions["pm2_5"] = aq_data.get("pm2_5", 0) or 0
        conditions["pm10"] = aq_data.get("pm10", 0) or 0
        conditions["no2"] = aq_data.get("nitrogen_dioxide", 0) or 0
        conditions["so2"] = aq_data.get("sulphur_dioxide", 0) or 0
        conditions["o3"] = aq_data.get("ozone", 0) or 0
        conditions["co"] = aq_data.get("carbon_monoxide", 0) or 0
        conditions["aqi"] = aq_data.get("us_aqi", 0) or 0
    except Exception as e:
        print(f"AQ API Error: {e}")

    # 2. Weather Data
    wx_url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m"
        f"&timezone=auto"
    )
    try:
        resp = requests.get(wx_url, timeout=10)
        wx_data = resp.json().get("current", {})
        conditions["wind_speed"] = wx_data.get("wind_speed_10m", 5) or 5
        conditions["wind_dir"] = wx_data.get("wind_direction_10m", 180) or 180
        conditions["temp"] = wx_data.get("temperature_2m", 25) or 25
        conditions["humidity"] = wx_data.get("relative_humidity_2m", 50) or 50
    except Exception as e:
        print(f"Weather API Error: {e}")

    # 3. Defaults for missing fields
    conditions.setdefault("wind_speed", 5)
    conditions.setdefault("wind_dir", 180)
    conditions.setdefault("temp", 25)
    conditions.setdefault("humidity", 50)
    conditions.setdefault("aod", 0.2)
    conditions.setdefault("fire_count", 0)
    conditions["timestamp"] = datetime.utcnow().isoformat()

    return conditions


def _heuristic_source_attribution(conditions: dict) -> dict:
    """
    Fallback heuristic-based source attribution when the ML model is unavailable.
    Uses pollutant ratios, seasonal factors, and time-of-day adjustments.
    """
    pm25 = conditions.get("pm2_5", 50)
    pm10 = conditions.get("pm10", 80)
    no2 = conditions.get("no2", 20)
    so2 = conditions.get("so2", 10)
    co = conditions.get("co", 400)
    o3 = conditions.get("o3", 30)
    aqi = conditions.get("aqi", 100)
    wind = conditions.get("wind_speed", 5)
    humidity = conditions.get("humidity", 50)

    # Base scores
    transport = 30
    dust = 20
    industry = 20
    stubble = 10
    residential = 10
    regional = 10

    # Pollutant ratio adjustments
    if pm10 > 0 and pm25 > 0:
        ratio = pm25 / pm10
        if ratio > 0.6:
            # High fine particle ratio → combustion sources
            transport += 10
            residential += 5
            dust -= 10
        else:
            # Low ratio → coarse particles dominant
            dust += 15
            transport -= 5

    if no2 > 40:
        transport += 15
    if so2 > 20:
        industry += 15
    if co > 1000:
        residential += 10

    # Seasonal adjustments
    month = datetime.now().month
    if month in [10, 11]:  # Post-monsoon (stubble season)
        stubble += 25
        dust -= 5
    elif month in [12, 1, 2]:  # Winter
        residential += 15
        regional += 5
        dust -= 10
    elif month in [3, 4, 5]:  # Summer
        dust += 20
        stubble -= 5
    elif month in [6, 7, 8, 9]:  # Monsoon
        dust -= 15
        transport += 5

    # Time-of-day
    hour = datetime.now().hour
    if 7 <= hour <= 10 or 17 <= hour <= 20:
        transport += 10
    elif 22 <= hour or hour <= 5:
        transport -= 10
        residential += 5

    # Wind effects
    if wind < 3:
        regional += 10  # Stagnant air
    elif wind > 15:
        dust += 10

    # Low humidity → more dust
    if humidity < 30:
        dust += 10

    # Normalize to sum = 1.0
    sources = {
        "transport": max(transport, 1),
        "dust": max(dust, 1),
        "industry": max(industry, 1),
        "stubble": max(stubble, 1),
        "residential": max(residential, 1),
        "regional": max(regional, 1)
    }
    total = sum(sources.values())
    for k in sources:
        sources[k] = round(sources[k] / total, 4)

    # Primary source
    primary = max(sources, key=sources.get)

    return {
        "sources": sources,
        "confidence": 0.65,  # Lower confidence for heuristic
        "primary_source": primary,
        "model": "heuristic_v1"
    }


@router.get("/predict")
async def predict_source(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")
):
    """
    Predict indicative pollution source attribution for a given location.
    Uses LightGBM ensemble or ratio heuristics.
    Clearly distinguishes measured pollutant concentrations from estimated source contributions.
    """
    try:
        # 1. Fetch live conditions
        conditions = _fetch_live_conditions(lat, lon)

        # 2. Try ML model
        model = _get_model()
        if model and model != "UNAVAILABLE":
            try:
                result = model.predict(conditions, return_std=True)
                raw_sources = result["sources"]
                
                # Calibrate confidence to realistic bounds (0.60 to 0.78)
                calibrated_confidence = round(min(0.78, max(0.60, result.get("confidence", 0.70) * 0.75)), 2)
                primary = max(raw_sources, key=raw_sources.get)
                
                return JSONResponse(content={
                    "estimated_source_contributions": raw_sources,
                    "primary_contributor": primary,
                    "confidence_score": calibrated_confidence,
                    "std_deviation": result.get("std", {}),
                    "methodology": "Indicative Multi-Pollutant Proxy & LightGBM Ensemble",
                    "domain_review_status": "Unvalidated / Preliminary — Chemical speciation (PMF/CMB) ground-truth pending",
                    "measured_pollutants": {
                        "aqi": conditions.get("aqi", -1),
                        "pm2_5": conditions.get("pm2_5", -1),
                        "pm10": conditions.get("pm10", -1),
                        "no2": conditions.get("no2", -1),
                        "so2": conditions.get("so2", -1),
                        "co": conditions.get("co", -1),
                        "wind_speed": conditions.get("wind_speed", -1),
                        "temperature": conditions.get("temp", -1)
                    },
                    "regulatory_disclaimer": "Source contributions are mathematical estimates inferred from ambient criteria pollutant ratios and meteorology. Not certified regulatory source apportionment without particulate chemical speciation.",
                    "timestamp": datetime.utcnow().isoformat()
                })
            except Exception as e:
                print(f"ML prediction failed, falling back to heuristic: {e}")
                traceback.print_exc()

        # 3. Fallback to heuristic
        result = _heuristic_source_attribution(conditions)
        return JSONResponse(content={
            "estimated_source_contributions": result["sources"],
            "primary_contributor": result["primary_source"],
            "confidence_score": 0.65,
            "methodology": "Rule-Based Pollutant Ratio & Meteorological Heuristics",
            "domain_review_status": "Unvalidated / Preliminary — Chemical speciation (PMF/CMB) ground-truth pending",
            "measured_pollutants": {
                "aqi": conditions.get("aqi", -1),
                "pm2_5": conditions.get("pm2_5", -1),
                "pm10": conditions.get("pm10", -1),
                "no2": conditions.get("no2", -1),
                "so2": conditions.get("so2", -1),
                "co": conditions.get("co", -1),
                "wind_speed": conditions.get("wind_speed", -1),
                "temperature": conditions.get("temp", -1)
            },
            "regulatory_disclaimer": "Source contributions are mathematical estimates inferred from ambient criteria pollutant ratios and meteorology. Not certified regulatory source apportionment without particulate chemical speciation.",
            "timestamp": datetime.utcnow().isoformat()
        })

    except Exception as e:
        print(f"Source prediction error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Source attribution calculation failed: {str(e)}")

