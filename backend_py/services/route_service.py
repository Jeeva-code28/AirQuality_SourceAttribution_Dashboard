import math
import requests
from typing import Dict, List, Any
from sqlalchemy.orm import Session
from models import RouteRequest
from services.aqi_service import get_estimated_aqi

def get_breathing_rate(mode: str) -> float:
    mode = mode.upper() if mode else "DRIVER"
    if mode == "JOGGER":
        return 2.5
    elif mode == "CYCLIST":
        return 2.0
    return 1.0

def calculate_exposure(db: Session, points: List[List[float]], time_ms: float, mode: str) -> float:
    total_exposure = 0.0
    # OSRM geojson returns [lon, lat], so we need to reverse it to [lat, lon] for AQI lookup
    
    sample_rate = max(1, len(points) // 10)
    
    for i in range(0, len(points), sample_rate):
        lon = points[i][0]
        lat = points[i][1]
        
        base_aqi = get_estimated_aqi(db, lat, lon)
        
        # HYPER-LOCAL SPATIAL NOISE INJECTION (Exactly as in Java)
        noise_factor = abs(math.sin(lat * 10000) * math.cos(lon * 10000))
        simulated_aqi = base_aqi + int(noise_factor * 40.0) - 10
        if simulated_aqi < 0:
            simulated_aqi = 10
            
        breathing_rate = get_breathing_rate(mode)
        
        # timeInSegment in minutes
        time_in_segment = (time_ms / 1000.0 / 60.0) / (len(points) / sample_rate)
        
        total_exposure += (simulated_aqi * time_in_segment * breathing_rate)
        
    return total_exposure




def calculate_safe_routes(db: Session, request: RouteRequest) -> Dict[str, Any]:
    # 1. Request routes from OSRM Public API
    vehicle = "driving"
    if request.mode.upper() == "JOGGER":
        vehicle = "walking"
    elif request.mode.upper() == "CYCLIST":
        vehicle = "cycling"
        
    url = f"http://router.project-osrm.org/route/v1/{vehicle}/{request.startLon},{request.startLat};{request.endLon},{request.endLat}?alternatives=3&geometries=geojson"
    
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        if data.get("code") != "Ok":
            raise Exception(f"OSRM Error: {data.get('code')}")
            
        routes_data = data.get("routes", [])
        if not routes_data:
            return {}
            
        rated_routes = []
        for route in routes_data:
            distance = route.get("distance", 0)
            time_sec = route.get("duration", 0)
            time_ms = time_sec * 1000.0
            
            # Extract coordinates from geojson
            points = route.get("geometry", {}).get("coordinates", [])
            
            exposure = calculate_exposure(db, points, time_ms, request.mode)
            
            rated_routes.append({
                "distance": distance,
                "time": time_ms,
                "exposure": exposure,
                "points": points
            })
            
        # Sort by Exposure (Lowest is best/green)
        rated_routes.sort(key=lambda x: x["exposure"])
        
        response_dict = {}
        if rated_routes:
            # GREEN: Safest (Min Exposure) - First after sort
            safest = rated_routes[0]
            response_dict["green"] = map_to_response(safest, "#10b981")
            
            # RED: Shortest (Min Distance)
            shortest = min(rated_routes, key=lambda x: x["distance"])
            response_dict["red"] = map_to_response(shortest, "#ef4444")
            
            # YELLOW: Alternative (Find first one that isn't Green or Red)
            for r in rated_routes:
                if r != safest and r != shortest:
                    response_dict["yellow"] = map_to_response(r, "#f59e0b")
                    break
                    
        return response_dict
        
    except Exception as e:
        print(f"Route calculation unsuccessful: {e}")
        return {}

def map_to_response(route_metrics: dict, color: str) -> dict:
    exposure = route_metrics["exposure"]
    time_ms = route_metrics["time"]
    
    avg_aqi = 0
    if time_ms > 0:
        avg_aqi = exposure / (time_ms / 1000.0 / 60.0)
        
    original_points = route_metrics["points"]
    lat_lon_points = [[p[1], p[0]] for p in original_points]
    
    return {
        "distance": route_metrics["distance"],
        "time": time_ms,
        "totalExposure": exposure,
        "avgAQI": avg_aqi,
        "color": color,
        "points": lat_lon_points
    }
