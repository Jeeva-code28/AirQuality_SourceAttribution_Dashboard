from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from fastapi.responses import JSONResponse

from database import get_db
from models import CityStationSchema, UpdateStationRequest, RouteRequest, RouteResponse
from services.aqi_service import (
    get_all_stations,
    refresh_data,
    get_realtime_aqi,
    get_historical_aqi,
    update_station_name,
    add_station,
    search_stations
)
from models import CityStation

router = APIRouter()

@router.get("/global", response_model=List[CityStationSchema])
def get_global_stations(db: Session = Depends(get_db)):
    return get_all_stations(db)

@router.post("/refresh")
def trigger_refresh(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    background_tasks.add_task(refresh_data, db)
    return "Refresh triggered in background"

@router.get("/current")
@router.get("/realtime")
def get_current_aqi(lat: float, lon: float, db: Session = Depends(get_db)):
    result = get_realtime_aqi(db, lat, lon)
    import json
    return JSONResponse(content=json.loads(result))

@router.get("/history")
def get_history_aqi(lat: float, lon: float):
    result = get_historical_aqi(lat, lon)
    import json
    return JSONResponse(content=json.loads(result))

@router.put("/station/update")
def update_station(request: UpdateStationRequest, db: Session = Depends(get_db)):
    updated = update_station_name(db, request.id, request.name)
    if updated:
        return "Station updated successfully"
    raise HTTPException(status_code=404, detail="Station not found")

@router.post("/station/add", response_model=CityStationSchema)
def add_new_station(station: CityStationSchema, db: Session = Depends(get_db)):
    # Convert schema to SQLAlchemy model
    new_station = CityStation(
        name=station.name,
        country=station.country,
        lat=station.lat,
        lon=station.lon,
        aqi=station.aqi
    )
    return add_station(db, new_station)

@router.get("/search", response_model=List[CityStationSchema])
def search_stations_route(query: str, db: Session = Depends(get_db)):
    return search_stations(db, query)
