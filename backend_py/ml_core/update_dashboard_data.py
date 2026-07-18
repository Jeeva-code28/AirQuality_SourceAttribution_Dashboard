import pandas as pd
import joblib
import json
import datetime
import math
import random
import requests
import requests
from source_estimator import AttributionModel
from lstm_aqi_forecaster import AQIForecaster

# --- Configuration ---
MODEL_SOURCE = "model_source.pkl" # This is the pickeled model saved by AttributionModel
OUTPUT_JSON = "dashboard_data.json"
STATIONS_JS = "stations.js" 

# --- Stations ---
# Use the full list from stations.js (converted to Python list for this script)
STATIONS = [
    # --- DELHI ---
    { "name": "Connaught Place, Delhi", "lat": 28.6327, "lon": 77.2197 },
    { "name": "Anand Vihar, Delhi", "lat": 28.6508, "lon": 77.3152 },
    { "name": "Punjabi Bagh, Delhi", "lat": 28.6619, "lon": 77.1242 },
    { "name": "R.K. Puram, Delhi", "lat": 28.5648, "lon": 77.1744 },
    { "name": "Dwarka-Sector 8, Delhi", "lat": 28.5710, "lon": 77.0719 },
    { "name": "Mandir Marg, Delhi", "lat": 28.6366, "lon": 77.1989 },
    { "name": "Lodhi Road, Delhi", "lat": 28.5918, "lon": 77.2274 },
    { "name": "IHBAS, Dilshad Garden, Delhi", "lat": 28.6811, "lon": 77.3050 },
    { "name": "NSIT Dwarka, Delhi", "lat": 28.6090, "lon": 77.0324 },
    { "name": "Siri Fort, Delhi", "lat": 28.5504, "lon": 77.2159 },
    { "name": "D.T.U., Delhi", "lat": 28.7501, "lon": 77.1111 },
    { "name": "Shadipur, Delhi", "lat": 28.6515, "lon": 77.1473 },
    { "name": "North Campus, DU, Delhi", "lat": 28.6574, "lon": 77.1585 },
    { "name": "Jawaharlal Nehru Stadium, Delhi", "lat": 28.5802, "lon": 77.2330 },
    { "name": "Nehru Nagar, Delhi", "lat": 28.5679, "lon": 77.2505 },
    { "name": "Okhla Phase-2, Delhi", "lat": 28.5308, "lon": 77.2713 },
    { "name": "Patparganj, Delhi", "lat": 28.6238, "lon": 77.2872 },
    { "name": "Dr. Karni Singh Shooting Range, Delhi", "lat": 28.4986, "lon": 77.2648 },
    { "name": "Sonia Vihar, Delhi", "lat": 28.7105, "lon": 77.2495 },
    { "name": "Jahangirpuri, Delhi", "lat": 28.7328, "lon": 77.1706 },
    { "name": "Rohini, Delhi", "lat": 28.7325, "lon": 77.1199 },
    { "name": "Vivek Vihar, Delhi", "lat": 28.6723, "lon": 77.3152 },
    { "name": "Narela, Delhi", "lat": 28.8569, "lon": 77.0943 },
    { "name": "Najafgarh, Delhi", "lat": 28.6133, "lon": 76.9856 },
    { "name": "Major Dhyan Chand National Stadium, Delhi", "lat": 28.6129, "lon": 77.2372 },

    # --- MUMBAI ---
    { "name": "Bandra, Mumbai", "lat": 19.0544, "lon": 72.8402 },
    { "name": "Colaba, Mumbai", "lat": 18.9067, "lon": 72.8147 },
    { "name": "Worli, Mumbai", "lat": 19.0163, "lon": 72.8183 },
    { "name": "Sion, Mumbai", "lat": 19.0396, "lon": 72.8631 },
    { "name": "Vile Parle West, Mumbai", "lat": 19.1062, "lon": 72.8360 },
    { "name": "Borivali East, Mumbai", "lat": 19.2295, "lon": 72.8605 },
    { "name": "Powai, Mumbai", "lat": 19.1171, "lon": 72.9038 },
    { "name": "Chhatrapati Shivaji Intl Airport, Mumbai", "lat": 19.0887, "lon": 72.8679 },
    { "name": "Navi Mumbai (Nerul)", "lat": 19.0330, "lon": 73.0297 },
    { "name": "Thane", "lat": 19.2183, "lon": 72.9781 },
    { "name": "Kalyan", "lat": 19.2437, "lon": 73.1355 },
    { "name": "Vasai Virar", "lat": 19.3807, "lon": 72.8258 },
    { "name": "Malad West, Mumbai", "lat": 19.1860, "lon": 72.8411 },
    { "name": "Mazgaon, Mumbai", "lat": 18.9667, "lon": 72.8436 },
    { "name": "Andheri East, Mumbai", "lat": 19.1154, "lon": 72.8653 },
    { "name": "Bhandup West, Mumbai", "lat": 19.1506, "lon": 72.9419 },
    { "name": "Chembur, Mumbai", "lat": 19.0522, "lon": 72.9005 },
    { "name": "Deonar, Mumbai", "lat": 19.0534, "lon": 72.9149 },
    { "name": "Kurla, Mumbai", "lat": 19.0726, "lon": 72.8805 },

    # --- CHENNAI ---
    { "name": "Velachery, Chennai", "lat": 12.9754, "lon": 80.2206 },
    { "name": "Alandur, Chennai", "lat": 12.9975, "lon": 80.2006 },
    { "name": "Manali, Chennai", "lat": 13.1645, "lon": 80.2625 },
    { "name": "Royapuram, Chennai", "lat": 13.1137, "lon": 80.2954 },
    { "name": "Kodungaiyur, Chennai", "lat": 13.1345, "lon": 80.2687 },
    { "name": "Perungudi, Chennai", "lat": 12.9647, "lon": 80.2443 },
    { "name": "Arumbakkam, Chennai", "lat": 13.0655, "lon": 80.2178 },
    { "name": "IIT Madras, Chennai", "lat": 12.9915, "lon": 80.2337 },

    # --- BENGALURU ---
    { "name": "Jayanagar, Bengaluru", "lat": 12.9250, "lon": 77.5938 },
    { "name": "Peenya, Bengaluru", "lat": 13.0285, "lon": 77.5197 },
    { "name": "Hebbal, Bengaluru", "lat": 13.0354, "lon": 77.5988 },
    { "name": "BTM Layout, Bengaluru", "lat": 12.9166, "lon": 77.6101 },
    { "name": "BWSSB Kadabesanahalli, Bengaluru", "lat": 12.9360, "lon": 77.6910 },
    { "name": "City Railway Station, Bengaluru", "lat": 12.9781, "lon": 77.5701 },
    { "name": "SaneguravaHalli, Bengaluru", "lat": 12.9912, "lon": 77.5453 },
    { "name": "Silk Board, Bengaluru", "lat": 12.9174, "lon": 77.6225 },
    { "name": "Hombegowda Nagar, Bengaluru", "lat": 12.9404, "lon": 77.5919 },
    { "name": "Kasturi Nagar, Bengaluru", "lat": 13.0039, "lon": 77.6534 },

    # --- OTHER CITIES ---
    { "name": "Victoria Memorial, Kolkata", "lat": 22.5448, "lon": 88.3426 },
    { "name": "Rabindra Bharati, Kolkata", "lat": 22.5835, "lon": 88.3582 },
    { "name": "Jadavpur, Kolkata", "lat": 22.4955, "lon": 88.3709 },
    { "name": "Ballygunge, Kolkata", "lat": 22.5323, "lon": 88.3630 },
    { "name": "Fort William, Kolkata", "lat": 22.5532, "lon": 88.3421 },

    { "name": "Secretariat, Hyderabad", "lat": 17.4057, "lon": 78.4735 },
    { "name": "Charminar, Hyderabad", "lat": 17.3616, "lon": 78.4747 },
    { "name": "Sanathnagar, Hyderabad", "lat": 17.4566, "lon": 78.4437 },
    { "name": "Bolarum, Hyderabad", "lat": 17.5186, "lon": 78.5065 },
    { "name": "ICRISAT Patancheru, Hyderabad", "lat": 17.5111, "lon": 78.2752 },
    { "name": "Zoo Park, Hyderabad", "lat": 17.3512, "lon": 78.4635 },

    { "name": "Shivajinagar, Pune", "lat": 18.5314, "lon": 73.8446 },
    { "name": "Hadapsar, Pune", "lat": 18.5089, "lon": 73.9260 },
    { "name": "Lohegaon, Pune", "lat": 18.5807, "lon": 73.9189 },
    { "name": "Pashan, Pune", "lat": 18.5372, "lon": 73.7951 },
    { "name": "Bhumkar Chowk, Pune", "lat": 18.5976, "lon": 73.7431 },

    { "name": "Maninagar, Ahmedabad", "lat": 23.0034, "lon": 72.6074 },
    { "name": "Navrangpura, Ahmedabad", "lat": 23.0350, "lon": 72.5630 },
    { "name": "Chandkheda, Ahmedabad", "lat": 23.1091, "lon": 72.5855 },
    { "name": "GIFT City, Gandhinagar", "lat": 23.1595, "lon": 72.6844 },

    { "name": "Shastri Nagar, Jaipur", "lat": 26.9388, "lon": 75.7989 },
    { "name": "Adarsh Nagar, Jaipur", "lat": 26.9023, "lon": 75.8364 },
    { "name": "Police Commissionerate, Jaipur", "lat": 26.9158, "lon": 75.8038 },

    { "name": "Lalbagh, Lucknow", "lat": 26.8488, "lon": 80.9384 },
    { "name": "Gomti Nagar, Lucknow", "lat": 26.8665, "lon": 81.0069 },
    { "name": "Talkatora, Lucknow", "lat": 26.8378, "lon": 80.9038 },
    { "name": "Kukrail, Lucknow", "lat": 26.9036, "lon": 80.9992 },

    { "name": "Sanjay Palace, Agra", "lat": 27.2018, "lon": 78.0055 },
    { "name": "Ardhali Bazar, Varanasi", "lat": 25.3356, "lon": 82.9774 },
    { "name": "Civil Lines, Kanpur", "lat": 26.4716, "lon": 80.3470 },
    { "name": "IGSC Planetarium, Patna", "lat": 25.6106, "lon": 85.1228 },
    { "name": "Bhopal Chauraha, Bhopal", "lat": 23.2599, "lon": 77.4126 },
    { "name": "Sector 16A, Faridabad", "lat": 28.4089, "lon": 77.3178 },
    { "name": "Sector 62, Noida", "lat": 28.6253, "lon": 77.3725 },
    { "name": "Knowledge Park III, Greater Noida", "lat": 28.4727, "lon": 77.5126 },
    { "name": "Sector 51, Gurugram", "lat": 28.4227, "lon": 77.0673 },
    { "name": "Vikas Sadan, Gurugram", "lat": 28.4503, "lon": 77.0264 }
]

# --- API Configuration ---
def fetch_live_data(lat, lon):
    """
    Fetches real-time AQI and Weather data from Open-Meteo API.
    Also fetches 24h historical data for trend analysis.
    Returns a dictionary formatted for the AttributionModel.
    """
    try:
        # 1. Fetch Air Quality Data (Current + Past 24h History)
        # We add &past_days=1&hourly=pm2_5 to get history
        aqi_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide,uv_index,aerosol_optical_depth&hourly=pm2_5&past_days=1&timezone=auto"
        aqi_res = requests.get(aqi_url, timeout=10)
        aqi_data = aqi_res.json()
        
        if 'current' not in aqi_data:
            raise ValueError("No current AQI data returned")
            
        aq = aqi_data['current']
        
        # Process History (Last 24 hours)
        history_24h = []
        trend_value = 0
        
        if 'hourly' in aqi_data:
            h_times = aqi_data['hourly']['time']
            h_vals = aqi_data['hourly']['pm2_5']
            
            current_time_str = aq['time'] 
            
            try:
                if current_time_str in h_times:
                    curr_idx = h_times.index(current_time_str)
                    start_idx = max(0, curr_idx - 24)
                    
                    # Extract last 24h
                    for i in range(start_idx, curr_idx + 1):
                        history_24h.append({
                            "time": h_times[i],
                            "aqi": h_vals[i]
                        })
                    
                    # Calculate Trend: Current - (Value 24h ago)
                    if curr_idx >= 24:
                        past_val = h_vals[curr_idx - 24]
                        curr_val = aq['pm2_5']
                        if past_val is not None and curr_val is not None:
                            trend_value = curr_val - past_val
            except Exception as e:
                print(f"Error processing history: {e}")

        # 2. Fetch Weather Data
        wx_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m&timezone=auto"
        wx_res = requests.get(wx_url, timeout=10)
        wx_data = wx_res.json()
        
        if 'current' not in wx_data:
             raise ValueError("No current Weather data returned")
             
        wx = wx_data['current']

        return {
            'pm10': aq.get('pm10', 0),
            'pm2_5': aq.get('pm2_5', 0),
            'nitrogen_dioxide': aq.get('nitrogen_dioxide', 0),
            'sulphur_dioxide': aq.get('sulphur_dioxide', 0),
            'ozone': aq.get('ozone', 0),
            'carbon_monoxide': aq.get('carbon_monoxide', 0),
            'uv_index': aq.get('uv_index', 0),
            'aod': aq.get('aerosol_optical_depth', 0), # AOD
            'temperature_2m': wx.get('temperature_2m', 25),
            'relative_humidity_2m': wx.get('relative_humidity_2m', 50),
            'wind_speed_10m': wx.get('wind_speed_10m', 10),
            'wind_direction_10m': wx.get('wind_direction_10m', 0),
            'history_24h': history_24h,
            'trend_value': trend_value
        }

    except Exception as e:
        print(f"API Fetch Error for {lat},{lon}: {e}")
        # Fallback to random/nominal if API fails to keep script running
        return {
            'pm10': 100 + random.randint(-20, 20), 
            'pm2_5': 60 + random.randint(-15, 15), 
            'nitrogen_dioxide': 40, 'sulphur_dioxide': 20,
            'ozone': 50, 'carbon_monoxide': 500,
            'temperature_2m': 30, 'relative_humidity_2m': 50,
            'wind_speed_10m': 10, 'wind_direction_10m': 180,
            'history_24h': [],
            'trend_value': 0,
            'aod': 0.1,
            'uv_index': 0
        }

# --- NASA FIRMS Configuration ---
FIRMS_MAP_KEY = "e10319437d8808bbe9451a4b69fd64aa"

def fetch_fire_counts(lat, lon, radius_km=100):
    """
    Fetches active fire counts from NASA FIRMS API (VIIRS NOAA-20 NRT).
    Uses a bounding box approximation for the given radius.
    """
    try:
        # Approximate 1 degree lat varies, but ~111km. 1 deg lon varies by cos(lat).
        # Box approximation
        lat_delta = radius_km / 111.0
        lon_delta = radius_km / (111.0 * abs(math.cos(math.radians(lat))))
        
        min_lon = lon - lon_delta
        max_lon = lon + lon_delta
        min_lat = lat - lat_delta
        max_lat = lat + lat_delta
        
        # Format: min_lon,min_lat,max_lon,max_lat
        bbox = f"{min_lon},{min_lat},{max_lon},{max_lat}"
        
        # API: https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/[SOURCE]/[AREA_COORDS]/[DAY_RANGE]
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{FIRMS_MAP_KEY}/VIIRS_NOAA20_NRT/{bbox}/1"
        
        # Short timeout as FIRMS can be slow and we don't want to hang
        res = requests.get(url, timeout=5)
        
        if res.status_code == 200:
            # CSV response. First line header, subsequent lines data.
            lines = res.text.strip().split('\n')
            if len(lines) > 1:
                return len(lines) - 1 # Count data rows
            else:
                return 0
        else:
            print(f"FIRMS API Error {res.status_code} for {lat},{lon}")
            return 0
            
    except Exception as e:
        print(f"Fire Data Fetch Failed for {lat},{lon}: {e}")
        return 0

def main():
    print("Loading component models...")

    # Initialize Source Estimator
    # We use current directory '.' as model_dir since joblib files are in root
    source_estimator = AttributionModel(model_dir=".")
    
    # Initialize LSTM AQI Forecaster
    aqi_forecaster = AQIForecaster()
    
    dashboard_data = []
    
    current_time = datetime.datetime.now()
    
    print("Fetching live data and generating predictions...")
    for idx, station in enumerate(STATIONS):
        if idx % 5 == 0: print(f"Processing station {idx+1}/{len(STATIONS)}...")
        
        # Get REAL-TIME current conditions from API
        current_conditions = fetch_live_data(station['lat'], station['lon'])
        
        # Generate 24-hour forecast using LSTM
        # We pass the current live conditions to the forecaster
        hourly_forecast = aqi_forecaster.predict_forecast(current_conditions, hours=24)
        
        # Get Live Fire Count (Radius 100km)
        fire_count = fetch_fire_counts(station['lat'], station['lon'], radius_km=100)
        
        # Prepare input for Source Estimator
        # Expected keys: pm2_5, pm10, no2, so2, co, o3, wind_speed, wind_dir, temp, humidity, timestamp, aod, fire_count
        input_dict = {
            'pm2_5': current_conditions['pm2_5'],
            'pm10': current_conditions['pm10'],
            'no2': current_conditions['nitrogen_dioxide'],
            'so2': current_conditions['sulphur_dioxide'],
            'co': current_conditions['carbon_monoxide'],
            'o3': current_conditions['ozone'],
            'wind_speed': current_conditions['wind_speed_10m'],
            'wind_dir': current_conditions['wind_direction_10m'],
            'temp': current_conditions['temperature_2m'],
            'humidity': current_conditions['relative_humidity_2m'],
            'timestamp': current_time,
            'aod': current_conditions['aod'],
            'fire_count': fire_count
        }
        
        # Get source contribution breakdown
        try:
            # predict returns {'sources': {...}, 'confidence': float, 'std': {...}}
            source_result = source_estimator.predict(input_dict)
            source_breakdown = source_result['sources']
            confidence_score = source_result['confidence']
        except Exception as e:
            print(f"Source prediction failed for {station['name']}: {e}")
            # Fallback
            source_breakdown = {"transport": 0.2, "dust": 0.2, "industry": 0.2, "stubble": 0.1, "residential": 0.1, "regional": 0.2}
            confidence_score = 0.0

        # Determine primary source
        primary_source = max(source_breakdown, key=source_breakdown.get)
        
        # Generate 72-hour forecast using LSTM
        # We pass the current live conditions to the forecaster
        hourly_forecast = aqi_forecaster.predict_forecast(current_conditions, hours=72)
        
        # Compile station data
        station_data = {
            "name": station['name'],
            "lat": station['lat'],
            "lon": station['lon'],
            "current_aqi": current_conditions['pm2_5'], # Use live PM2.5 as current AQI proxy
            "primary_source": primary_source,
            "source_contribution": source_breakdown,
            "confidence_score": confidence_score,
            "pollutants": current_conditions, 
            "hourly_forecast": hourly_forecast,
            "history_24h": current_conditions['history_24h'],
            "trend_value": current_conditions['trend_value']
        }

        dashboard_data.append(station_data)

    # Save to JSON
    with open(OUTPUT_JSON, 'w') as f:
        json.dump(dashboard_data, f, indent=2)
    
    print(f"\nSUCCESS: Dashboard data saved to {OUTPUT_JSON}")
    print(f"Data: Generated 72-hour forecasts for {len(STATIONS)} stations using LSTM")


if __name__ == "__main__":
    main()