import requests
import pandas as pd
import datetime
import time
import json
import os

# --- Configuration ---
DAYS_OF_HISTORY = 30  # Number of days to look back
OUTPUT_FILE = "dataset.csv"

# --- Stations Data (from stations.js) ---
# I'm embedding a subset of stations here for demonstration. 
# In a full implementation, we could parse stations.js directly.
STATIONS = [
    # --- DELHI ---
    { "name": "Connaught Place, Delhi", "lat": 28.6327, "lon": 77.2197 },
    { "name": "Anand Vihar, Delhi", "lat": 28.6508, "lon": 77.3152 },
    { "name": "Punjabi Bagh, Delhi", "lat": 28.6619, "lon": 77.1242 },
    { "name": "R.K. Puram, Delhi", "lat": 28.5648, "lon": 77.1744 },
    { "name": "Dwarka-Sector 8, Delhi", "lat": 28.5710, "lon": 77.0719 },
    
    # --- MUMBAI ---
    { "name": "Bandra, Mumbai", "lat": 19.0544, "lon": 72.8402 },
    { "name": "Colaba, Mumbai", "lat": 18.9067, "lon": 72.8147 },
    { "name": "Worli, Mumbai", "lat": 19.0163, "lon": 72.8183 },

    # --- CHENNAI ---
    { "name": "Velachery, Chennai", "lat": 12.9754, "lon": 80.2206 },
    { "name": "Alandur, Chennai", "lat": 12.9975, "lon": 80.2006 },

    # --- BENGALURU ---
    { "name": "Jayanagar, Bengaluru", "lat": 12.9250, "lon": 77.5938 },
    { "name": "Peenya, Bengaluru", "lat": 13.0285, "lon": 77.5197 },
]

def fetch_weather_data(lat, lon, start_date, end_date):
    """Fetches historical weather data from Open-Meteo Archive API."""
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "hourly": "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m",
        "timezone": "auto"
    }
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        # Create DataFrame
        df = pd.DataFrame(data['hourly'])
        df['time'] = pd.to_datetime(df['time'])
        return df
    except Exception as e:
        print(f"Error fetching weather data for {lat}, {lon}: {e}")
        return None

def fetch_air_quality_data(lat, lon, start_date, end_date):
    """Fetches historical air quality data from Open-Meteo Air Quality API."""
    url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "hourly": "pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide,us_aqi",
        "timezone": "auto"
    }
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        # Create DataFrame
        df = pd.DataFrame(data['hourly'])
        df['time'] = pd.to_datetime(df['time'])
        return df
    except Exception as e:
        print(f"Error fetching AQI data for {lat}, {lon}: {e}")
        return None

def assign_source_contribution(row):
    """
    Heuristic to assign a primary source contribution based on pollutant levels.
    THIS IS A SIMPLIFIED MODEL for demonstration purposes.
    Real source apportionment requires complex chemical transport models.
    """
    pm2_5 = row.get('pm2_5', 0)
    no2 = row.get('nitrogen_dioxide', 0)
    so2 = row.get('sulphur_dioxide', 0)
    co = row.get('carbon_monoxide', 0)
    o3 = row.get('ozone', 0)
    
    # 1. Traffic: High NO2 and CO
    if no2 > 40 and co > 1000:
        return "Traffic"
    
    # 2. Industry: High SO2 and PM2.5
    if so2 > 20 and pm2_5 > 60:
        return "Industry"
        
    # 3. Dust/Construction: High PM10 (using PM2.5 as proxy if PM10 missing, or just PM2.5 high but others low)
    if pm2_5 > 80 and no2 < 30 and so2 < 10:
        return "Dust/Construction"

    # 4. Biomass Burning: High PM2.5 and CO, relatively lower NO2 compared to Traffic
    if pm2_5 > 100 and co > 800:
        return "Biomass Burning"
    
    # 5. Secondary Aerosols: High Ozone
    if o3 > 100:
        return "Secondary Aerosols"

    # Default/Background
    return "Background/Other"

def main():
    print("Starting dataset creation...")
    
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=DAYS_OF_HISTORY)
    
    print(f"Fetching data from {start_date} to {end_date} ({DAYS_OF_HISTORY} days)")
    
    all_data = []

    for station in STATIONS:
        name = station['name']
        lat = station['lat']
        lon = station['lon']
        
        print(f"Processing: {name}...")
        
        # Fetch Data
        weather_df = fetch_weather_data(lat, lon, start_date, end_date)
        aqi_df = fetch_air_quality_data(lat, lon, start_date, end_date)
        
        if weather_df is not None and aqi_df is not None:
            # Merge DataFrames on 'time'
            merged_df = pd.merge(weather_df, aqi_df, on='time', how='inner')
            
            # Add Station Metadata
            merged_df['station_name'] = name
            merged_df['latitude'] = lat
            merged_df['longitude'] = lon
            
            # Add Derived Features
            merged_df['month'] = merged_df['time'].dt.month
            merged_df['day_of_week'] = merged_df['time'].dt.dayofweek
            merged_df['hour'] = merged_df['time'].dt.hour
            
            # Add Source Contribution Label
            merged_df['source_contribution'] = merged_df.apply(assign_source_contribution, axis=1)
            
            all_data.append(merged_df)
            
        # Respect API rate limits
        time.sleep(1) 

    if all_data:
        final_dataset = pd.concat(all_data, ignore_index=True)
        
        # Save to CSV
        final_dataset.to_csv(OUTPUT_FILE, index=False)
        print(f"\nSUCCESS! Dataset saved to '{OUTPUT_FILE}' with {len(final_dataset)} rows.")
        print(final_dataset.head())
    else:
        print("\nFAILED. No data collected.")

if __name__ == "__main__":
    main()
