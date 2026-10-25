from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from fastapi.responses import JSONResponse
import json

from database import get_db
from models import CityStationSchema, UpdateStationRequest
from services.aqi_service import (
    get_all_stations,
    refresh_data,
    get_realtime_aqi,
    get_historical_aqi,
    update_station_name,
    add_station,
    search_stations,
    get_scheduler_status,
    validate_coordinates,
    find_nearest_station_details
)
from models import CityStation

router = APIRouter()

@router.get("/global", response_model=List[CityStationSchema])
def get_global_stations(db: Session = Depends(get_db)):
    """Return all city monitoring stations with latest telemetry."""
    return get_all_stations(db)

@router.get("/status")
def get_ingestion_status():
    """Return scheduler execution status and data freshness metrics."""
    return JSONResponse(content=get_scheduler_status())

@router.post("/refresh")
def trigger_refresh(background_tasks: BackgroundTasks):
    """Trigger background telemetry refresh for priority monitoring stations.

    Uses a dedicated session so the background task is not racing against
    request-scoped session cleanup.
    """
    from database import SessionLocal
    import logging as _logging

    def _bg_refresh():
        db = SessionLocal()
        try:
            refresh_data(db)
        except Exception as exc:
            _logging.getLogger("breathelens.aqi_routes").error(
                f"Background refresh failed: {exc}", exc_info=True
            )
        finally:
            db.close()

    background_tasks.add_task(_bg_refresh)
    return JSONResponse(content={
        "status": "refresh_dispatched",
        "message": "Background data refresh started for priority monitoring stations."
    })

@router.get("/current")
@router.get("/realtime")
def get_current_aqi(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180"),
    db: Session = Depends(get_db)
):
    """
    Fetch real-time air quality observations with provenance metadata.
    Primary: Open-Meteo Air Quality (WMO/Copernicus).
    Secondary: WAQI / CPCB ground station fallback.
    """
    if not validate_coordinates(lat, lon):
        raise HTTPException(status_code=422, detail="Invalid coordinates: latitude must be in [-90, 90] and longitude in [-180, 180]")
    result_str = get_realtime_aqi(db, lat, lon)
    return JSONResponse(content=json.loads(result_str))

@router.get("/history")
def get_history_aqi(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")
):
    """
    Fetch genuine historical air quality observations up to 180 days.
    Guarantees no synthetic random data insertion.
    """
    if not validate_coordinates(lat, lon):
        raise HTTPException(status_code=422, detail="Invalid coordinates: latitude must be in [-90, 90] and longitude in [-180, 180]")
    result_str = get_historical_aqi(lat, lon)
    return JSONResponse(content=json.loads(result_str))

@router.put("/station/update")
def update_station(request: UpdateStationRequest, db: Session = Depends(get_db)):
    updated = update_station_name(db, request.id, request.name)
    if updated:
        return JSONResponse(content={"status": "success", "message": "Station updated successfully"})
    raise HTTPException(status_code=404, detail="Station not found")

@router.post("/station/add", response_model=CityStationSchema)
def add_new_station(station: CityStationSchema, db: Session = Depends(get_db)):
    if station.lat is not None and station.lon is not None:
        if not validate_coordinates(station.lat, station.lon):
            raise HTTPException(status_code=422, detail="Invalid coordinates for station")
            
    new_station = CityStation(
        name=station.name.strip(),
        country=station.country.strip() if station.country else "Unknown",
        lat=station.lat,
        lon=station.lon,
        aqi=station.aqi if station.aqi is not None else -1
    )
    return add_station(db, new_station)

@router.get("/search", response_model=List[CityStationSchema])
def search_stations_route(query: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    return search_stations(db, query)


@router.get("/station/nearest")
def get_nearest_station_endpoint(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180"),
    db: Session = Depends(get_db)
):
    """Find the closest verified environmental monitoring station to requested coordinates.
    
    Guarantees strict separation between user-selected coordinates and station coordinates.
    Calculates great-circle distance in kilometers and determines locality status.
    """
    if not validate_coordinates(lat, lon):
        raise HTTPException(status_code=422, detail="Invalid coordinates")
    result = find_nearest_station_details(db, lat, lon)
    if not result:
        raise HTTPException(status_code=404, detail="No stations found in database")
    return JSONResponse(content=result)

