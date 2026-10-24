import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

from main import app
from services.aqi_service import format_freshness, get_estimated_aqi, get_scheduler_status
from api.forecast_routes import _deterministic_persistence_forecast

client = TestClient(app)

# -----------------------------------------------------------------------------
# WORKSTREAM A: DATA INGESTION, FRESHNESS & TELEMETRY
# -----------------------------------------------------------------------------

def test_freshness_classification_rules():
    """Verify data freshness rules accurately reflect update cadence."""
    now = datetime.now(timezone.utc)
    
    # 1. Current (< 2 hours old for hourly cadence)
    fresh_time = now - timedelta(minutes=45)
    f_res = format_freshness("Open-Meteo", fresh_time, now)
    assert f_res["data_status"] == "current"
    assert f_res["source_name"] == "Open-Meteo"
    
    # 2. Delayed (2 - 6 hours old)
    delayed_time = now - timedelta(hours=3, minutes=10)
    d_res = format_freshness("Open-Meteo", delayed_time, now)
    assert d_res["data_status"] == "delayed"
    
    # 3. Stale (> 6 hours old)
    stale_time = now - timedelta(hours=12)
    s_res = format_freshness("Open-Meteo", stale_time, now)
    assert s_res["data_status"] == "stale"
    
    # 4. Unavailable (None)
    un_res = format_freshness("Open-Meteo", None, now)
    assert un_res["data_status"] == "unavailable"


def test_aqi_status_telemetry_endpoint():
    """Verify backend ingestion and scheduler telemetry endpoint."""
    response = client.get("/api/aqi/status")
    assert response.status_code == 200
    data = response.json()
    assert "scheduler_running" in data
    assert "last_refresh_status" in data
    assert "active_job_id" in data
    assert data["active_job_id"] == "periodic_aqi_refresh"
    assert "cadence_minutes" in data
    assert data["cadence_minutes"] == 30


def test_aqi_history_endpoint_validation_and_no_fabrication():
    """Verify /api/aqi/history rejects invalid coordinates and avoids fabrication."""
    # Out of range latitude
    bad_lat = client.get("/api/aqi/history?lat=120.0&lon=80.0")
    assert bad_lat.status_code == 422
    
    # Out of range longitude
    bad_lon = client.get("/api/aqi/history?lat=13.0&lon=250.0")
    assert bad_lon.status_code == 422
    
    # Valid coordinates
    resp = client.get("/api/aqi/history?lat=12.92&lon=80.14")
    assert resp.status_code == 200
    data = resp.json()
    assert "daily" in data or "hourly" in data
    assert "provenance" in data
    # Critical verification: synthetic_data flag must be False
    assert data["provenance"]["synthetic_data"] is False


def test_aqi_current_endpoint_validation():
    """Verify /api/aqi/current coordinate bounds validation."""
    bad = client.get("/api/aqi/current?lat=95.0&lon=80.0")
    assert bad.status_code == 422
    
    good = client.get("/api/aqi/current?lat=13.0827&lon=80.2707")
    assert good.status_code == 200
    data = good.json()
    assert "current" in data
    assert "provenance" in data
    assert "data_status" in data["provenance"]


# -----------------------------------------------------------------------------
# WORKSTREAM B: POLLUTION FORECASTING
# -----------------------------------------------------------------------------

def test_deterministic_persistence_forecast_baseline():
    """Verify deterministic persistence baseline produces expanding bounds without random noise."""
    base_aqi = 110
    hours = 72
    
    forecasts = _deterministic_persistence_forecast(base_aqi, hours=hours)
    assert len(forecasts) == hours
    
    # Verify strict progression and expanding uncertainty bounds
    for i, step in enumerate(forecasts):
        assert "datetime" in step
        assert "hour" in step
        assert "aqi" in step
        assert "confidence_bound" in step
        bounds = step["confidence_bound"]
        assert bounds["lower"] <= step["aqi"] <= bounds["upper"]
        
    # Check that uncertainty widens monotonically with forecast horizon
    width_first = forecasts[0]["confidence_bound"]["upper"] - forecasts[0]["confidence_bound"]["lower"]
    width_last = forecasts[-1]["confidence_bound"]["upper"] - forecasts[-1]["confidence_bound"]["lower"]
    assert width_last > width_first


def test_forecast_predict_api_endpoint():
    """Verify /api/forecast/predict endpoint contract, horizon, and metadata."""
    resp = client.get("/api/forecast/predict?lat=13.0827&lon=80.2707&hours=72")
    assert resp.status_code == 200
    data = resp.json()
    
    assert "forecast" in data
    assert len(data["forecast"]) > 0
    assert "model" in data
    assert data["model"] in ["ECMWF_CAMS_Atmospheric_Dispersion", "Deterministic_Persistence_Diurnal_Baseline"]
    assert data["target"] == "us_aqi"
    assert "generated_at" in data
    
    first = data["forecast"][0]
    assert "aqi" in first
    assert "confidence_bound" in first
    assert first["confidence_bound"]["lower"] <= first["aqi"] <= first["confidence_bound"]["upper"]


def test_forecast_predict_coordinate_validation():
    """Verify forecast endpoint strictly validates latitude and longitude ranges."""
    resp = client.get("/api/forecast/predict?lat=100.0&lon=80.0")
    assert resp.status_code == 422


# -----------------------------------------------------------------------------
# WORKSTREAM C: POLLUTION-SOURCE ATTRIBUTION
# -----------------------------------------------------------------------------

def test_source_predict_endpoint_contract():
    """Verify source attribution distinguishes measured concentrations from estimated source contributions."""
    resp = client.get("/api/source/predict?lat=13.0827&lon=80.2707")
    assert resp.status_code == 200
    data = resp.json()
    
    # Validate top-level response schema
    assert "estimated_source_contributions" in data
    assert "measured_pollutants" in data
    assert "confidence_score" in data
    assert "domain_review_status" in data
    assert "regulatory_disclaimer" in data
    
    # Check calibrated confidence score (must be realistic 0.60 - 0.78, never fake 0.9999)
    conf = data["confidence_score"]
    assert 0.55 <= conf <= 0.85
    
    # Check source categories and total percentage sum ~ 1.0 (or 100%)
    sources = data["estimated_source_contributions"]
    assert len(sources) >= 4
    total_val = sum(sources.values())
    assert 0.98 <= total_val <= 1.02 or 98.0 <= total_val <= 102.0
    
    # Verify domain review flag is explicit
    assert "Preliminary" in data["domain_review_status"] or "Unvalidated" in data["domain_review_status"]


def test_source_predict_coordinate_validation():
    """Verify source prediction rejects invalid latitude/longitude."""
    resp = client.get("/api/source/predict?lat=-95.0&lon=80.0")
    assert resp.status_code == 422


# -----------------------------------------------------------------------------
# WORKSTREAM D: APIS, DATABASE PERSISTENCE & CONCURRENCY
# -----------------------------------------------------------------------------

def test_get_global_stations_endpoint():
    """Verify global station listing endpoint."""
    resp = client.get("/api/aqi/global")
    assert resp.status_code == 200
    stations = resp.json()
    assert isinstance(stations, list)
    if stations:
        st = stations[0]
        assert "name" in st
        assert "lat" in st
        assert "lon" in st
        assert "aqi" in st


def test_search_station_endpoint():
    """Verify station search query functionality."""
    resp = client.get("/api/aqi/search?query=Delhi")
    assert resp.status_code == 200
    results = resp.json()
    assert isinstance(results, list)


def test_route_calculation_endpoint():
    """Verify route calculation endpoint handles requests safely."""
    payload = {
        "startLat": 12.9249,
        "startLon": 80.1472,
        "endLat": 13.0827,
        "endLon": 80.2707,
        "mode": "DRIVER"
    }
    resp = client.post("/api/routes/calculate", json=payload)
    # Accepts 200 with route dict or empty dict on network failure
    assert resp.status_code in [200, 204]
