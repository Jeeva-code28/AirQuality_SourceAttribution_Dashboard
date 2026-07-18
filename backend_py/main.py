import json
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from apscheduler.schedulers.background import BackgroundScheduler

from database import engine, Base, SessionLocal
from models import CityStation
from api import aqi_routes, map_routes
from services.aqi_service import refresh_data

Base.metadata.create_all(bind=engine)

def seed_database():
    db = SessionLocal()
    try:
        count = db.query(CityStation).count()
        if count == 0:
            print("Database is empty. Seeding from cities.json...")
            cities_file = os.path.join(os.path.dirname(__file__), "cities.json")
            if os.path.exists(cities_file):
                with open(cities_file, 'r', encoding='utf-8') as f:
                    cities_data = json.load(f)
                    
                for idx, c in enumerate(cities_data):
                    db_station = CityStation(
                        name=c.get("city", "Unknown"),
                        country=c.get("country", "Unknown"),
                        lat=c.get("lat"),
                        lon=c.get("lng"),
                        aqi=-1
                    )
                    db.add(db_station)
                    # batch commit to avoid loading too many in memory at once
                    if idx % 100 == 0:
                        db.commit()
                
                db.commit()
                print("Database seeded successfully.")
            else:
                print("cities.json not found!")
    finally:
        db.close()

def scheduled_refresh():
    db = SessionLocal()
    try:
        refresh_data(db)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    seed_database()
    
    # Run a refresh right away
    scheduled_refresh()
    
    # Start APScheduler (run every 30 mins)
    scheduler = BackgroundScheduler()
    scheduler.add_job(scheduled_refresh, 'interval', minutes=30)
    scheduler.start()
    
    yield
    
    # Shutdown
    scheduler.shutdown()

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
