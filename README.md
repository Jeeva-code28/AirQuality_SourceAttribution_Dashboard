# EnviroGov - Air Quality & Source Attribution Dashboard

EnviroGov is a comprehensive, dual-portal platform designed to monitor air quality, analyze pollutant source contributions, and provide actionable health advisories. It features an **Authority Portal** for government officials and a **Citizen Portal** for the general public.

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

* **Frontend (Citizen Portal):** React, Vite, JavaScript
* **Frontend (Authority Portal):** Vanilla HTML/CSS/JS, Leaflet.js (Mapping)
* **Backend:** Java Spring Boot
* **Database:** H2 (In-Memory) / PostgreSQL
* **External APIs:** Open-Meteo (Air Quality & Weather), OpenStreetMap/Photon (Geocoding)
* **Deployment:** Vercel (Frontend), Render (Backend)

---

## 🚀 How to Run Locally

The project includes a startup script configured to work **out-of-the-box with zero installation or setup** for Windows users.

1. Clone the repository.
2. Double-click the **`start_server.bat`** file in the project root.

**What the script does:**
1. Checks for conflicting processes on port `8080` and clears them if needed.
2. Detects if Apache Maven is installed globally. If not, it falls back to a pre-configured local Maven bundle (`maven-temp`).
3. Compiles the Vite React frontend bundle and copies it to the Spring Boot static assets directory.
4. Spins up the unified Spring Boot backend.
5. Serves the application on **[http://localhost:8080](http://localhost:8080)**.

### Local Database Configuration
By default, the application uses a **Zero-Configuration In-Memory Database (H2)**. On startup, if the database is empty, it automatically parses and seeds over 970 global cities from `src/main/resources/cities.json`.

If you prefer to run a persistent PostgreSQL database (`localhost:5432/aqi_db`), you can run the application with the postgres profile:
```bash
mvn spring-boot:run "-Dspring-boot.run.jvmArguments=-Dspring.profiles.active=postgres"
```

---

## 🔧 Recent Architectural Improvements

* **Direct API Integration:** Both the Authority and Citizen portals have been refactored to fetch live AQI data directly from the Open-Meteo API, bypassing backend bottlenecks and ensuring 100% uptime for real-time metrics.
* **Dynamic History Aggregation:** The Spring Boot backend dynamically aggregates hourly AQI data into daily maximums to support accurate 180-day historical trend analysis.
