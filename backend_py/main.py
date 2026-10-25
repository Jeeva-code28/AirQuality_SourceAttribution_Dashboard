import json
import os
import logging
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from apscheduler.schedulers.background import BackgroundScheduler

from database import engine, Base, SessionLocal, db_health_check
from models import CityStation
from api import aqi_routes, map_routes, source_routes, forecast_routes, policy_routes, health_routes
from services.aqi_service import refresh_data

logger = logging.getLogger("breathelens.main")

# Create tables if they do not exist (safe for existing databases — never drops)
Base.metadata.create_all(bind=engine)


def seed_database():
    """Seed or repair city station records from cities.json.

    Behaviour:
    - Empty database: inserts all cities from cities.json.
    - Corrupt records (name='Unknown', lon=NULL): repairs them in-place using
      positional matching against cities.json, preserving primary keys and any
      existing AQI values.
    - Already-correct database: no-op (idempotent).
    """
    db = SessionLocal()
    try:
        cities_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cities.json")
        if not os.path.exists(cities_file):
            logger.error(f"cities.json not found at {cities_file} — cannot seed database")
            return

        with open(cities_file, "r", encoding="utf-8") as f:
            cities_data = json.load(f)

        if not isinstance(cities_data, list) or len(cities_data) == 0:
            logger.error("cities.json is empty or not a list")
            return

        count = db.query(CityStation).count()

        if count == 0:
            # --- Fresh seed ---
            logger.info("Database is empty. Seeding from cities.json...")
            for idx, c in enumerate(cities_data):
                db_station = CityStation(
                    name=c.get("name", "Unknown"),
                    country=c.get("country", "Unknown"),
                    lat=c.get("lat"),
                    lon=c.get("lon"),
                    aqi=-1,
                )
                db.add(db_station)
                if (idx + 1) % 200 == 0:
                    db.flush()  # flush, but commit once at end
            db.commit()
            logger.info(f"Database seeded successfully with {len(cities_data)} cities.")
        else:
            # --- Repair check: detect the known "wrong-keys" corruption ---
            corrupt_count = (
                db.query(CityStation)
                .filter(CityStation.name == "Unknown", CityStation.lon.is_(None))
                .count()
            )
            if corrupt_count > 0 and corrupt_count == count:
                logger.warning(
                    f"Detected {corrupt_count} corrupt station records "
                    "(name='Unknown', lon=NULL). Repairing from cities.json..."
                )
                all_stations = (
                    db.query(CityStation).order_by(CityStation.id).all()
                )
                for idx, station in enumerate(all_stations):
                    if idx < len(cities_data):
                        c = cities_data[idx]
                        station.name = c.get("name", station.name)
                        station.country = c.get("country", station.country)
                        station.lat = c.get("lat", station.lat)
                        station.lon = c.get("lon", station.lon)
                    if (idx + 1) % 200 == 0:
                        db.flush()
                db.commit()
                logger.info(f"Repaired {min(len(all_stations), len(cities_data))} station records.")
            else:
                logger.info(
                    f"Database already contains {count} station(s). "
                    "Skipping seed (idempotent)."
                )
    except Exception:
        db.rollback()
        logger.exception("seed_database failed")
    finally:
        db.close()


def scheduled_refresh():
    """Run a data refresh in its own database session.

    This function creates and closes its own session so it is safe to call
    from APScheduler threads or daemon threads without sharing a
    request-scoped session.
    """
    db = SessionLocal()
    try:
        refresh_data(db)
    except Exception as exc:
        logger.error(f"[APScheduler] Scheduled refresh failed: {exc}", exc_info=True)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: seed static stations if database is empty
    seed_database()
    
    # Launch initial refresh asynchronously in background to avoid blocking API startup
    refresh_thread = threading.Thread(target=scheduled_refresh, name="InitialAQIRefreshWorker", daemon=True)
    refresh_thread.start()
    
    # Start APScheduler with concurrency safeguards:
    # max_instances=1 prevents overlapping refreshes
    # coalesce=True combines missed runs into a single execution
    # misfire_grace_time=300 tolerates short thread delays
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        scheduled_refresh,
        'interval',
        minutes=30,
        id='periodic_aqi_refresh',
        max_instances=1,
        coalesce=True,
        misfire_grace_time=300
    )
    scheduler.start()
    
    yield
    
    # Shutdown
    if scheduler.running:
        scheduler.shutdown(wait=False)

app = FastAPI(title="AQI Monitor Dashboard API", lifespan=lifespan)

# Allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(aqi_routes.router, prefix="/api/aqi", tags=["AQI"])
app.include_router(map_routes.router, prefix="/api/routes", tags=["Routes"])
app.include_router(source_routes.router, prefix="/api/source", tags=["Source Attribution"])
app.include_router(forecast_routes.router, prefix="/api/forecast", tags=["Forecasting"])
app.include_router(policy_routes.router, prefix="/api/policy", tags=["Policy"])
app.include_router(health_routes.router, prefix="/api/health", tags=["Health"])

# Database health endpoint (lightweight, no credentials exposed)
@app.get("/api/db/health", tags=["Database"])
def database_health():
    """Read-only connectivity check for the database."""
    result = db_health_check()
    status_code = 200 if result["status"] == "healthy" else 503
    return JSONResponse(content=result, status_code=status_code)

# Static Files
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    # Serve static html (mimic FrontendController)
    @app.get("/citizen")
    @app.get("/citizen/{rest_of_path:path}")
    async def get_citizen():
        return FileResponse(os.path.join(static_dir, "citizen.html"))
        
    @app.get("/{path:path}")
    async def fallback(path: str):
        if path.startswith("api/") or path.startswith("static/"):
            pass # Let fastapi handle 404
        else:
            file_path = os.path.join(static_dir, path)
            if os.path.exists(file_path) and os.path.isfile(file_path):
                return FileResponse(file_path)
            # Default to index.html
            return FileResponse(os.path.join(static_dir, "index.html"))
