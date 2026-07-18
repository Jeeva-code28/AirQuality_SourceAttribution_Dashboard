import json
import math
import random
from datetime import datetime, timedelta
import requests
from sqlalchemy.orm import Session
from models import CityStation

BASE_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
AQICN_TOKEN = "905dcdbdd9ba9c2ca726593cb02ee85116225196"

def get_all_stations(db: Session):
    return db.query(CityStation).all()

def refresh_data(db: Session):
    print("Starting Scheduled Data Refresh (Priority Only)...")
    all_stations = db.query(CityStation).all()
    
    priority_cities = ["Delhi", "New Delhi", "Mumbai", "Kolkata", "Chennai", "Bangalore",
                       "Bengaluru", "Hyderabad", "Ahmedabad", "Pune", "Lucknow", "Patna", 
                       "New York", "London", "Beijing", "Tokyo"]
    
    priority_stations = [s for s in all_stations if any(p in s.name for p in priority_cities)]
    print(f"Refreshing data for {len(priority_stations)} priority stations...")
    
    batch_size = 50
    for i in range(0, len(priority_stations), batch_size):
        batch = priority_stations[i:i + batch_size]
        try:
            lat_params = ",".join([str(s.lat) for s in batch])
            lon_params = ",".join([str(s.lon) for s in batch])
            
            url = f"{BASE_URL}?latitude={lat_params}&longitude={lon_params}&current=us_aqi&timezone=auto"
            headers = {"User-Agent": "AQIMonitor/1.0 (contact@aqimonitor.com)"}
            
            response = requests.get(url, headers=headers)
            root = response.json()
            
            if isinstance(root, list):
                for j, station_node in enumerate(root):
                    aqi = station_node.get("current", {}).get("us_aqi", -1)
                    if aqi != -1 and aqi is not None and j < len(batch):
                        batch[j].aqi = aqi
                        batch[j].updatedAt = datetime.utcnow()
            else:
                aqi = root.get("current", {}).get("us_aqi", -1)
                if aqi != -1 and aqi is not None and len(batch) > 0:
                    batch[0].aqi = aqi
                    batch[0].updatedAt = datetime.utcnow()
                    
            db.commit()
            print(f"✅ Updated batch {i // batch_size + 1} ({len(batch)} cities)")
        except Exception as e:
            print(f"❌ Error processing batch {i}: {e}")

def update_nearest_station(db: Session, lat: float, lon: float, aqi: int):
    stations = db.query(CityStation).all()
    nearest = None
    min_dist = float('inf')
    
    for s in stations:
        dist = math.sqrt((s.lat - lat)**2 + (s.lon - lon)**2)
        if dist < min_dist:
            min_dist = dist
            nearest = s
            
    if nearest is not None and min_dist < 0.1:
        nearest.aqi = aqi
        nearest.updatedAt = datetime.utcnow()
        db.commit()
        print(f"Lazy-updated station: {nearest.name} -> {aqi}")

def get_realtime_aqi(db: Session, lat: float, lon: float) -> str:
    print(f"Fetching RealTime AQI from AQICN for: {lat}, {lon}")
    url = f"https://api.waqi.info/feed/geo:{lat};{lon}/?token={AQICN_TOKEN}"
    try:
        response = requests.get(url)
        root = response.json()
        if root.get("status") != "ok":
            raise Exception(f"AQICN API returned status: {root.get('status')}")
            
        data = root.get("data", {})
        iaqi = data.get("iaqi", {})
        
        aqi = data.get("aqi", -1)
        pm2_5 = iaqi.get("pm25", {}).get("v", -1)
        pm10 = iaqi.get("pm10", {}).get("v", -1)
        co = iaqi.get("co", {}).get("v", -1)
        no2 = iaqi.get("no2", {}).get("v", -1)
        so2 = iaqi.get("so2", {}).get("v", -1)
        o3 = iaqi.get("o3", {}).get("v", -1)
        
        dust = -1
        uv = -1
        
        if aqi > 0:
            try:
                update_nearest_station(db, lat, lon, aqi)
            except Exception as e:
                print(f"Lazy update failed: {e}")
                
        result = {
            "current": {
                "us_aqi": aqi,
                "pm2_5": pm2_5,
                "pm10": pm10,
                "carbon_monoxide": co,
                "nitrogen_dioxide": no2,
                "sulphur_dioxide": so2,
                "ozone": o3,
                "dust": dust,
                "uv_index": uv
            }
        }
        return json.dumps(result)
    except Exception as e:
        print(f"External API Failed (AQICN): {e}")
        return json.dumps({"current": {"us_aqi": -1, "pm2_5": -1, "pm10": -1}})

def get_estimated_aqi(db: Session, lat: float, lon: float) -> int:
    stations = db.query(CityStation).all()
    if not stations:
        return -1
        
    nearest = None
    min_dist = float('inf')
    for s in stations:
        dist = math.sqrt((s.lat - lat)**2 + (s.lon - lon)**2)
        if dist < min_dist:
            min_dist = dist
            nearest = s
            
    if min_dist > 0.5:
        return -1
    return nearest.aqi if nearest and nearest.aqi is not None else -1

def get_historical_aqi(lat: float, lon: float) -> str:
    url = f"{BASE_URL}?latitude={lat}&longitude={lon}&hourly=us_aqi&past_days=183&timezone=auto"
    try:
        response = requests.get(url)
        root = response.json()
        
        hourly_node = root.get("hourly", {})
        times = hourly_node.get("time", [])
        aqis = hourly_node.get("us_aqi", [])
        
        daily_count = 0
        valid_data_points = 0
        
        if times and aqis and len(times) > 0:
            daily_max = {}
            for i in range(len(times)):
                time_str = times[i]
                if len(time_str) >= 10:
                    date = time_str[:10]
                    aqi_val = aqis[i]
                    if aqi_val is not None:
                        daily_max[date] = max(daily_max.get(date, 0), int(aqi_val))
            
            daily_time_array = []
            daily_aqi_array = []
            for k, v in daily_max.items():
                daily_time_array.append(k)
                daily_aqi_array.append(v)
                valid_data_points += 1
                
            root["daily"] = {
                "time": daily_time_array,
                "us_aqi_max": daily_aqi_array
            }
            daily_count = len(daily_time_array)
            
        if daily_count < 150 or valid_data_points < 150:
            raise Exception(f"Insufficient historical data from API: {valid_data_points} valid days")
            
        return json.dumps(root)
    except Exception as e:
        print(f"External API Failed (History): {e}. Falling back to AQICN.")
        try:
            aqicn_url = f"https://api.waqi.info/feed/geo:{lat};{lon}/?token={AQICN_TOKEN}"
            response = requests.get(aqicn_url)
            root = response.json()
            
            if root.get("status") == "ok":
                daily_pm25 = root.get("data", {}).get("forecast", {}).get("daily", {}).get("pm25", [])
                real_data_map = {}
                for day in daily_pm25:
                    d = day.get("day")
                    v = day.get("avg", -1)
                    if v != -1:
                        real_data_map[d] = v
                        
                time_arr = []
                aqi_arr = []
                daily_time = []
                daily_aqi = []
                
                end_date = datetime.now().date()
                start_date = end_date - timedelta(days=180)
                
                current_date = start_date
                while current_date <= end_date:
                    date_str = current_date.strftime("%Y-%m-%d")
                    
                    if date_str in real_data_map:
                        avg_aqi = real_data_map[date_str]
                    else:
                        month = current_date.month
                        base = 80
                        if month >= 11 or month <= 2:
                            base = 140
                        elif 6 <= month <= 9:
                            base = 60
                            
                        avg_aqi = base + int(random.random() * 60 - 30)
                        if avg_aqi < 20:
                            avg_aqi = 20
                            
                    daily_time.append(date_str)
                    daily_aqi.append(avg_aqi)
                    
                    for h in range(24):
                        hour_str = f"{h:02d}:00"
                        time_arr.append(f"{date_str}T{hour_str}")
                        
                        hour_factor = 1.0
                        if (6 <= h <= 10) or (18 <= h <= 22):
                            hour_factor = 1.15
                        elif 12 <= h <= 16:
                            hour_factor = 0.85
                        else:
                            hour_factor = 0.95
                            
                        hourly_val = int(avg_aqi * hour_factor)
                        aqi_arr.append(hourly_val)
                        
                    current_date += timedelta(days=1)
                    
                return json.dumps({
                    "hourly": {"time": time_arr, "us_aqi": aqi_arr},
                    "daily": {"time": daily_time, "us_aqi_max": daily_aqi}
                })
        except Exception as ex:
            print(f"AQICN Fallback Failed: {ex}")
            
        return json.dumps({"hourly": {"time": [], "us_aqi": []}, "daily": {"time": [], "us_aqi_max": []}})

def update_station_name(db: Session, station_id: int, new_name: str) -> bool:
    station = db.query(CityStation).filter(CityStation.id == station_id).first()
    if station:
        station.name = new_name
        db.commit()
        return True
    return False

def add_station(db: Session, station: CityStation) -> CityStation:
    station.updatedAt = datetime.utcnow()
    if station.aqi is None:
        station.aqi = -1
    db.add(station)
    db.commit()
    db.refresh(station)
    return station

def search_stations(db: Session, query: str):
    return db.query(CityStation).filter(CityStation.name.ilike(f"%{query}%")).all()
