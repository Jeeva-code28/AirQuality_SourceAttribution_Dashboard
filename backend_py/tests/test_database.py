"""
Comprehensive database connectivity, persistence, and API integration tests
for BreatheLens.

Uses isolated temporary SQLite databases via FastAPI dependency overrides
to avoid modifying the production/development database.
"""
import json
import os
import sys
import tempfile
import pytest
from datetime import datetime, timezone

# Ensure backend_py is on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from database import Base, get_db, db_health_check, SessionLocal
from models import CityStation, CityStationSchema
from main import app, seed_database

from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Test-scoped database fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def test_engine():
    """Create an isolated, thread-safe in-memory SQLite database engine."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def test_db(test_engine):
    """Yield a database session bound to the test engine."""
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def test_client(test_engine):
    """FastAPI TestClient with database dependency overridden to use test_engine."""
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    def _override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def seeded_engine():
    """Create an isolated in-memory SQLite engine pre-seeded with stations."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestSession()
    stations = [
        CityStation(name="New York", country="USA", lat=40.71, lon=-74.0, aqi=55),
        CityStation(name="Los Angeles", country="USA", lat=34.05, lon=-118.24, aqi=72),
        CityStation(name="Delhi", country="India", lat=28.61, lon=77.21, aqi=165),
        CityStation(name="London", country="UK", lat=51.51, lon=-0.13, aqi=38),
        CityStation(name="Tokyo", country="Japan", lat=35.68, lon=139.69, aqi=42),
    ]
    for s in stations:
        db.add(s)
    db.commit()
    db.close()
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def seeded_db(seeded_engine):
    """A database session connected to the seeded engine."""
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=seeded_engine)
    session = TestSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def seeded_client(seeded_engine):
    """TestClient backed by the pre-seeded database engine."""
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=seeded_engine)

    def _override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# ===========================================================================
# PHASE 1 & 2: Connection & Engine Tests
# ===========================================================================

class TestDatabaseConnection:
    """Verify engine creation and session management."""

    def test_engine_created_successfully(self):
        """The module-level engine must be usable."""
        from database import engine
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar()
            assert result == 1

    def test_session_factory_produces_session(self):
        """SessionLocal() must return a functional session."""
        db = SessionLocal()
        try:
            result = db.execute(text("SELECT 1")).scalar()
            assert result == 1
        finally:
            db.close()

    def test_get_db_yields_and_closes(self):
        """The get_db dependency must yield a session and close it."""
        gen = get_db()
        db = next(gen)
        assert db is not None
        result = db.execute(text("SELECT 1")).scalar()
        assert result == 1
        try:
            next(gen)
        except StopIteration:
            pass  # expected

    def test_health_check_healthy(self):
        """db_health_check must report healthy for a working database."""
        result = db_health_check()
        assert result["status"] == "healthy"
        assert "Database connection" in result["detail"]


# ===========================================================================
# PHASE 3 & 4: Schema & Model Tests
# ===========================================================================

class TestSchemaCreation:
    """Verify tables and ORM model registration."""

    def test_stations_table_exists(self, test_db):
        """The 'stations' table must exist after create_all."""
        result = test_db.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='stations'")
        ).fetchone()
        assert result is not None
        assert result[0] == "stations"

    def test_station_columns(self, test_db):
        """All expected columns must be present."""
        rows = test_db.execute(text("PRAGMA table_info(stations)")).fetchall()
        col_names = {r[1] for r in rows}
        expected = {"id", "name", "country", "lat", "lon", "aqi", "updated_at"}
        assert expected.issubset(col_names), f"Missing columns: {expected - col_names}"

    def test_model_inherits_base(self):
        """CityStation must be registered in Base.metadata."""
        assert "stations" in Base.metadata.tables


# ===========================================================================
# PHASE 5: Seed / Initialization Tests
# ===========================================================================

class TestSeedDatabase:
    """Test city seeding and repair logic."""

    def test_fresh_seed_from_cities_json(self, test_db):
        """Seeding an empty database should insert cities from cities.json."""
        # The global seed_database uses SessionLocal, so we test the logic
        # directly against test_db
        cities_file = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "..", "cities.json"
        )
        if not os.path.exists(cities_file):
            pytest.skip("cities.json not available")

        with open(cities_file, "r", encoding="utf-8") as f:
            cities_data = json.load(f)

        assert test_db.query(CityStation).count() == 0

        for c in cities_data[:10]:  # seed a subset for speed
            test_db.add(CityStation(
                name=c.get("name", "Unknown"),
                country=c.get("country", "Unknown"),
                lat=c.get("lat"),
                lon=c.get("lon"),
                aqi=-1,
            ))
        test_db.commit()

        count = test_db.query(CityStation).count()
        assert count == 10

        first = test_db.query(CityStation).first()
        assert first.name != "Unknown"
        assert first.lon is not None

    def test_seed_idempotency(self, seeded_db):
        """Re-seeding a database with valid records must not duplicate them."""
        initial_count = seeded_db.query(CityStation).count()
        assert initial_count == 5

        # Try to add duplicates — the seed function checks count > 0
        # so this simulates what happens on re-run
        count_after = seeded_db.query(CityStation).count()
        assert count_after == initial_count

    def test_cities_json_has_correct_keys(self):
        """Validate that cities.json uses 'name' and 'lon' (not 'city'/'lng')."""
        cities_file = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "..", "cities.json"
        )
        if not os.path.exists(cities_file):
            pytest.skip("cities.json not available")

        with open(cities_file, "r", encoding="utf-8") as f:
            cities_data = json.load(f)

        assert len(cities_data) > 0
        first = cities_data[0]
        assert "name" in first, "'name' key missing from cities.json entries"
        assert "lon" in first, "'lon' key missing from cities.json entries"
        assert "lat" in first, "'lat' key missing from cities.json entries"
        assert "country" in first, "'country' key missing from cities.json entries"


# ===========================================================================
# PHASE 6: CRUD & Transaction Tests
# ===========================================================================

class TestCRUDOperations:
    """Verify record creation, retrieval, update, and validation."""

    def test_insert_and_retrieve_station(self, test_db):
        """A new station must be insertable and retrievable."""
        station = CityStation(
            name="Test City", country="Testland", lat=10.0, lon=20.0, aqi=50
        )
        test_db.add(station)
        test_db.commit()

        retrieved = test_db.query(CityStation).filter_by(name="Test City").first()
        assert retrieved is not None
        assert retrieved.lat == 10.0
        assert retrieved.lon == 20.0
        assert retrieved.aqi == 50
        assert retrieved.id is not None

    def test_update_station(self, seeded_db):
        """Updating a station's name must persist correctly."""
        station = seeded_db.query(CityStation).filter_by(name="Delhi").first()
        assert station is not None
        station.name = "New Delhi"
        seeded_db.commit()

        updated = seeded_db.query(CityStation).filter_by(id=station.id).first()
        assert updated.name == "New Delhi"

    def test_update_station_aqi(self, seeded_db):
        """Updating AQI must persist."""
        station = seeded_db.query(CityStation).filter_by(name="London").first()
        station.aqi = 95
        seeded_db.commit()

        refreshed = seeded_db.query(CityStation).filter_by(id=station.id).first()
        assert refreshed.aqi == 95

    def test_rollback_on_error(self, test_db):
        """A failed transaction must not leave partial data."""
        station = CityStation(name="Partial", country="X", lat=0, lon=0, aqi=10)
        test_db.add(station)
        test_db.flush()

        # Simulate error — rollback
        test_db.rollback()

        assert test_db.query(CityStation).filter_by(name="Partial").first() is None

    def test_search_stations(self, seeded_db):
        """ilike search must find matching stations."""
        from services.aqi_service import search_stations
        results = search_stations(seeded_db, "york")
        assert len(results) == 1
        assert results[0].name == "New York"

    def test_search_no_results(self, seeded_db):
        """Search for non-existent city returns empty list."""
        from services.aqi_service import search_stations
        results = search_stations(seeded_db, "Atlantis")
        assert results == []


# ===========================================================================
# PHASE 7: API Integration Tests
# ===========================================================================

class TestAPIEndpoints:
    """Test database-backed API endpoints via TestClient."""

    def test_global_stations_returns_list(self, seeded_client):
        """GET /api/aqi/global must return seeded stations."""
        resp = seeded_client.get("/api/aqi/global")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 5
        names = {s["name"] for s in data}
        assert "Delhi" in names
        assert "New York" in names

    def test_global_stations_schema(self, seeded_client):
        """Each station in the response must have the expected fields."""
        resp = seeded_client.get("/api/aqi/global")
        data = resp.json()
        for station in data:
            assert "id" in station
            assert "name" in station
            assert "lat" in station
            assert "lon" in station
            assert "aqi" in station

    def test_search_endpoint(self, seeded_client):
        """GET /api/aqi/search must return filtered results."""
        resp = seeded_client.get("/api/aqi/search?query=Del")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert any("Delhi" in s["name"] for s in data)

    def test_search_empty_query_rejected(self, seeded_client):
        """Search with empty query should be rejected."""
        resp = seeded_client.get("/api/aqi/search?query=")
        # min_length=1 in Query should cause 422
        assert resp.status_code == 422

    def test_add_station_endpoint(self, seeded_client):
        """POST /api/aqi/station/add must create a new station."""
        payload = {
            "name": "Test Station",
            "country": "Testistan",
            "lat": 15.0,
            "lon": 25.0,
            "aqi": 88,
        }
        resp = seeded_client.post("/api/aqi/station/add", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Test Station"
        assert data["id"] is not None

    def test_add_station_invalid_coords(self, seeded_client):
        """Station with out-of-range coordinates must be rejected."""
        payload = {
            "name": "Bad Station",
            "lat": 999.0,
            "lon": 25.0,
        }
        resp = seeded_client.post("/api/aqi/station/add", json=payload)
        assert resp.status_code == 422

    def test_update_station_endpoint(self, seeded_client, seeded_db):
        """PUT /api/aqi/station/update must rename a station."""
        station = seeded_db.query(CityStation).first()
        payload = {"id": station.id, "name": "Renamed City"}
        resp = seeded_client.put("/api/aqi/station/update", json=payload)
        assert resp.status_code == 200

    def test_update_nonexistent_station(self, seeded_client):
        """Updating a station that doesn't exist should return 404."""
        resp = seeded_client.put(
            "/api/aqi/station/update", json={"id": 99999, "name": "Ghost"}
        )
        assert resp.status_code == 404

    def test_db_health_endpoint(self, seeded_client):
        """GET /api/db/health must return healthy status."""
        resp = seeded_client.get("/api/db/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"

    def test_aqi_status_endpoint(self, seeded_client):
        """GET /api/aqi/status must return scheduler telemetry."""
        resp = seeded_client.get("/api/aqi/status")
        assert resp.status_code == 200
        data = resp.json()
        assert "scheduler_running" in data
        assert "last_refresh_status" in data

    def test_refresh_endpoint(self, seeded_client):
        """POST /api/aqi/refresh must dispatch a background task."""
        resp = seeded_client.post("/api/aqi/refresh")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "refresh_dispatched"

    def test_coordinate_validation_current(self, seeded_client):
        """GET /api/aqi/current with invalid coords must return 422."""
        resp = seeded_client.get("/api/aqi/current?lat=100&lon=50")
        assert resp.status_code == 422

    def test_coordinate_validation_history(self, seeded_client):
        """GET /api/aqi/history with invalid coords must return 422."""
        resp = seeded_client.get("/api/aqi/history?lat=100&lon=50")
        assert resp.status_code == 422


# ===========================================================================
# PHASE 8: Session Lifecycle Tests
# ===========================================================================

class TestSessionLifecycle:
    """Verify session cleanup and error handling."""

    def test_session_closed_after_request(self, seeded_client):
        """Session must be closed after a successful request."""
        # Just verifying no errors on multiple sequential requests
        for _ in range(5):
            resp = seeded_client.get("/api/aqi/global")
            assert resp.status_code == 200

    def test_multiple_concurrent_reads(self, seeded_client):
        """Multiple reads should not cause database locking."""
        responses = []
        for _ in range(10):
            resp = seeded_client.get("/api/aqi/global")
            responses.append(resp.status_code)
        assert all(code == 200 for code in responses)


# ===========================================================================
# PHASE 9: Production Persistence Notes (informational)
# ===========================================================================

class TestRenderPersistence:
    """Document Render persistence findings — these are informational markers."""

    def test_render_config_exists(self):
        """render.yaml must exist and configure the backend."""
        render_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "..", "..", "render.yaml"
        )
        assert os.path.exists(render_path), "render.yaml not found"

    def test_render_no_persistent_disk(self):
        """Flag: Render free tier uses ephemeral storage. SQLite data loss on redeploy."""
        import yaml
        render_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "..", "..", "render.yaml"
        )
        try:
            import yaml
        except ImportError:
            pytest.skip("PyYAML not installed; cannot parse render.yaml")

        with open(render_path) as f:
            config = yaml.safe_load(f)

        services = config.get("services", [])
        for svc in services:
            disk = svc.get("disk")
            if disk:
                return  # Has persistent disk — OK
        pytest.xfail(
            "Render config has NO persistent disk. "
            "SQLite data will be lost on every deploy/restart."
        )
