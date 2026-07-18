from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from database import get_db
from models import RouteRequest, RouteResponse
from services.route_service import calculate_safe_routes

router = APIRouter()

@router.post("/calculate", response_model=Dict[str, RouteResponse])
def calculate_route(request: RouteRequest, db: Session = Depends(get_db)):
    try:
        routes = calculate_safe_routes(db, request)
        if not routes:
            # Return empty 204 or just empty dict
            return {}
        return routes
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal Server Error")
