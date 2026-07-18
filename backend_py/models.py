from sqlalchemy import Column, Integer, String, Float, DateTime
from database import Base
import datetime
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

# SQLAlchemy Model
class CityStation(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    country = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    aqi = Column(Integer, nullable=True, default=-1)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, name="updated_at")


# Pydantic Schemas for API

class CityStationSchema(BaseModel):
    id: Optional[int] = None
    name: str
    country: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    aqi: Optional[int] = None
    updatedAt: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True


class UpdateStationRequest(BaseModel):
    id: int
    name: str


class RouteRequest(BaseModel):
    startLat: float
    startLon: float
    endLat: float
    endLon: float
    mode: str = "DRIVER"


class RouteResponse(BaseModel):
    distance: float
    time: float
    totalExposure: float
    avgAQI: float
    color: str
    points: List[List[float]]
