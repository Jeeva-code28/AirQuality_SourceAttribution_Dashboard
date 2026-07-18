# BreatheLens– AI-Powered Pollution Source Attribution & Forecasting Platform

BreatheLens is a comprehensive, dual-portal platform designed to monitor air quality, analyze pollutant source contributions, and provide actionable health advisories. It features an **Authority Portal** for government officials and a **Citizen Portal** for the general public.

## 🌐 Live Demos

* **Citizen Portal (React Dashboard):** [https://air-quality-source-attribution-dash.vercel.app/citizen.html](https://air-quality-source-attribution-dash.vercel.app/citizen.html)
* **Authority Portal (Government View):** [https://air-quality-source-attribution-dash.vercel.app](https://air-quality-source-attribution-dash.vercel.app)

*(Note: The backend is hosted on Render's free tier, so initial data loads may take ~50 seconds if the server is waking up from sleep).*

---

## ✨ Key Features

### 🏢 Authority Portal
* **Real-time Monitoring:** Live AQI and granular pollutant tracking (PM2.5, PM10, NO₂, SO₂, O₃, CO).
* **Pollutant Insights:** Automated identification of primary pollutants, 24-hour trends, visibility risks, and emergency status.
* **Geospatial Hotspot Detection:** Interactive map tracking critical pollution zones.
* **Automated Advisories:** Situation summaries and health recommendations based on live metrics.

### 🧑 Citizen Portal
* **Location-Based AQI:** Automatic geolocation to provide the most relevant air quality metrics.
* **Health & Weather Integration:** Combined view of air quality and current weather conditions (temperature, humidity, wind speed).
* **Historical Trends:** Visualization of past AQI data to track long-term improvements or degradations.
* **Clean Routing:** Suggests safe routes for joggers, cyclists, and drivers to minimize pollutant exposure.

---

## 🛠️ Technology Stack

* **Frontend (Citizen Portal):** React (18.2.0), Vite, Tailwind CSS, Recharts, Leaflet
* **Frontend (Authority Portal):** Vanilla HTML/CSS/JS, Leaflet.js (Mapping)
* **Backend:** Python (3.11+), FastAPI, SQLAlchemy, APScheduler
* **Machine Learning (`ml_core`):** Python, Pandas, NumPy, Scikit-Learn, LightGBM, TensorFlow / Keras, Joblib
* **Database:** SQLite
* **External APIs:** Open-Meteo (Air Quality & Weather), OpenStreetMap (Geocoding), OSRM (Routing)
* **Deployment:** Vercel (Frontend), Render (Backend)

---

## 🚀 How to Run Locally

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd AirPollution_SourceContribution_Analysis
   ```

2. **Navigate to the Backend and Install Dependencies:**
   ```bash
   cd backend_py
   python -m venv venv
   
   # Activate the virtual environment
   # Windows:
   .\venv\Scripts\activate
   # Mac/Linux:
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```

3. **Start the Server:**
   ```bash
   uvicorn main:app --reload --port 8080
   ```

4. **Access the Application:**
   * Open your browser and go to **[http://localhost:8080](http://localhost:8080)**.

### Local Database Configuration
By default, the application uses a lightweight **SQLite Database**. On startup, if the database is empty, it automatically parses and seeds over 970 global cities from `cities.json`.

---

## 🔧 Recent Architectural Improvements

* **Java to Python Migration:** The backend has been completely rewritten from Java Spring Boot to **Python FastAPI**, seamlessly unifying the application's API endpoints with the native Python machine learning scripts.
* **Direct API Integration:** Both portals fetch live AQI data directly from the Open-Meteo API, bypassing backend bottlenecks. The frontend is built to intelligently fall back to recent historical data if the current hour is unavailable.
* **Dynamic History Aggregation:** The backend dynamically aggregates hourly AQI data into daily maximums to support accurate 180-day historical trend analysis.
* **Cloud Routing Replacement:** GraphHopper routing was successfully replaced with OSRM, reducing local overhead while maintaining accurate safe-route exposure calculations.
