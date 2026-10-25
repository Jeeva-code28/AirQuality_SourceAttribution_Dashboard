"""
Location Synchronization, Geolocation Accuracy, Monitoring Station Matching,
and Data Provenance Test Suite for BreatheLens.
"""
import pytest
import math
from fastapi.testclient import TestClient

from main import app
from database import SessionLocal
from services.aqi_service import haversine_distance, find_nearest_station_details, validate_coordinates

client = TestClient(app)


# ===========================================================================
# 1. HAVERSINE DISTANCE & GEOSPATIAL CALCULATION TESTS
# ===========================================================================

def test_haversine_identical_points():
    """Distance between the same coordinates must be 0.0 km."""
    d = haversine_distance(12.9553, 80.2455, 12.9553, 80.2455)
    assert abs(d - 0.0) < 1e-6


def test_haversine_perungudi_accuracy():
    """Distance between detected Perungudi coordinates and Perungudi station must be ~1.05 km."""
    # Detected desktop coords: 12.9553, 80.2455
    # Perungudi station coords: 12.9647, 80.2443
    dist_km = haversine_distance(12.9553, 80.2455, 12.9647, 80.2443)
    assert 0.9 <= dist_km <= 1.3, f"Expected ~1.05 km, got {dist_km}"


def test_haversine_west_tambaram_to_tambaram_station():
    """Distance between West Tambaram (phone GPS) and Central Tambaram station is ~3.2 km."""
    # West Tambaram (near Bata Shoe Store / Sri Gokulam Hospital): 12.9230, 80.1180
    # Tambaram station: 12.9249, 80.1472
    dist_km = haversine_distance(12.9230, 80.1180, 12.9249, 80.1472)
    assert 2.5 <= dist_km <= 3.8, f"Expected ~3.2 km, got {dist_km}"


def test_haversine_perungudi_to_tambaram_distance():
    """Distance between Perungudi and Tambaram is ~11 to 14 km (demonstrating why they cannot be equated)."""
    dist_km = haversine_distance(12.9553, 80.2455, 12.9249, 80.1472)
    assert 10.0 <= dist_km <= 15.0, f"Expected ~11-14 km, got {dist_km}"


# ===========================================================================
# 2. NEAREST MONITORING STATION MATCHING TESTS
# ===========================================================================

def test_perungudi_coordinates_match_nearest_station():
    """Perungudi coordinates (12.9553, 80.2455) must match closest station (Velachery, ~3.9km), NEVER Tambaram (14.1km)."""
    db = SessionLocal()
    try:
        match = find_nearest_station_details(db, 12.9553, 80.2455)
        assert match is not None
        station_name = match["station"]["name"]
        # In aqi_db.sqlite, Velachery is 3.9 km away while Tambaram is 14.1 km away
        assert "Velachery" in station_name, (
            f"Expected Velachery as closest station to Perungudi, but got {station_name}"
        )
        assert match["distance_km"] < 5.0
        assert match["is_nearby"] is True
        assert match["classification"] == "local_station"
        # Confirm user coords and station coords are kept strictly separate
        assert match["requested_coordinates"] == {"lat": 12.9553, "lon": 80.2455}
        assert match["station"]["lat"] != 12.9553
    finally:
        db.close()


def test_west_tambaram_coordinates_match_tambaram_station():
    """West Tambaram coordinates (12.9230, 80.1180) must match a Tambaram area station, NOT Perungudi."""
    db = SessionLocal()
    try:
        match = find_nearest_station_details(db, 12.9230, 80.1180)
        assert match is not None
        station_name = match["station"]["name"]
        assert "Tambaram" in station_name or "Irumbuliyur" in station_name, (
            f"Expected Tambaram/Irumbuliyur station, but got {station_name}"
        )
        assert match["distance_km"] < 5.0
        assert match["is_nearby"] is True
    finally:
        db.close()


def test_remote_location_classified_as_regional():
    """A remote location (> 25 km from nearest station) must be classified as regional_station."""
    db = SessionLocal()
    try:
        # Remote point in Bay of Bengal / offshore or rural area: 12.5000, 80.5000
        match = find_nearest_station_details(db, 12.5000, 80.5000)
        assert match is not None
        assert match["distance_km"] > 25.0
        assert match["is_nearby"] is False
        assert match["classification"] == "regional_station"
    finally:
        db.close()


# ===========================================================================
# 3. API ENDPOINT /api/aqi/station/nearest CONTRACT TESTS
# ===========================================================================

def test_nearest_station_api_endpoint():
    """GET /api/aqi/station/nearest returns 200 with schema and correct distance."""
    resp = client.get("/api/aqi/station/nearest?lat=12.9553&lon=80.2455")
    assert resp.status_code == 200
    data = resp.json()

    assert "station" in data
    assert "distance_km" in data
    assert "distance_label" in data
    assert "is_nearby" in data
    assert "classification" in data
    assert "data_provider" in data
    assert "requested_coordinates" in data

    assert "Velachery" in data["station"]["name"]
    assert data["distance_km"] < 5.0


def test_nearest_station_api_coordinate_validation():
    """GET /api/aqi/station/nearest rejects invalid latitude and longitude with 422."""
    # Latitude > 90
    resp_lat = client.get("/api/aqi/station/nearest?lat=100.0&lon=80.0")
    assert resp_lat.status_code == 422

    # Longitude > 180
    resp_lon = client.get("/api/aqi/station/nearest?lat=12.0&lon=200.0")
    assert resp_lon.status_code == 422


# ===========================================================================
# 4. PROVENANCE & TRANSPARENCY AUDIT TESTS
# ===========================================================================

def test_realtime_aqi_provenance_truthfulness():
    """Verify /api/aqi/realtime documents its data source transparently."""
    resp = client.get("/api/aqi/realtime?lat=12.9230&lon=80.1180")
    assert resp.status_code == 200
    data = resp.json()

    assert "provenance" in data
    source = data["provenance"]["source"]
    # Must identify Open-Meteo or WAQI, NEVER claim fabricated direct CPCB without WAQI/ground station
    assert "Open-Meteo" in source or "WAQI" in source
    assert "observation_timestamp" in data["provenance"]
    assert "data_status" in data["provenance"]


def test_location_switching_produces_independent_requests():
    """Requests for Perungudi vs West Tambaram must return location-specific data."""
    resp_perungudi = client.get("/api/aqi/station/nearest?lat=12.9553&lon=80.2455")
    resp_tambaram = client.get("/api/aqi/station/nearest?lat=12.9230&lon=80.1180")

    assert resp_perungudi.status_code == 200
    assert resp_tambaram.status_code == 200

    station_p = resp_perungudi.json()["station"]["name"]
    station_t = resp_tambaram.json()["station"]["name"]

    assert station_p != station_t, f"Locations should have different nearest stations: {station_p} vs {station_t}"
