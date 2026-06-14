# AQI Monitor & Safe Route Finder - Unified Dashboard

This is a unified platform featuring an **Authority Portal** (HTML/CSS/JS) and a **Citizen Portal** (Vite + React) backed by a **Spring Boot** server. It calculates air quality indexes, provides health advisories, and computes safe/clean routes utilizing GraphHopper and OpenStreetMap data.

---

## 🚀 How to Run the Application

The startup script is configured to work **out-of-the-box with zero installation or setup**.

Simply double-click the **`start_server.bat`** file in the project root. The script will automatically:
1. Check for conflicting processes on port `8080` and clear them if needed.
2. Detect if Apache Maven is installed globally. If not, it will fallback to the **pre-configured local Maven** bundle (`maven-temp`).
3. Compile the Vite React frontend bundle and copy it to the static assets directory.
4. Spin up the unified Spring Boot backend and serve the application on **[http://localhost:8080](http://localhost:8080)**.

---

## 🛠️ Key Debugging & Enhancements Implemented

The following fixes have been applied to ensure the application runs flawlessly:

1. **Zero-Configuration In-Memory Database (H2)**:
   * Originally, the app depended strictly on a local PostgreSQL instance (`localhost:5432/aqi_db`), causing boot crashes if PostgreSQL was missing or inactive.
   * **Fix**: Added the `h2` database runtime dependency to `pom.xml` and configured an in-memory H2 database as the default datasource in `application.properties`. 
   * **Seeding**: On startup, if the database is empty, it automatically parses and seeds the 970+ cities from `src/main/resources/cities.json` into the in-memory database.
   * *If you still want to run PostgreSQL*, a profile has been created. Run:
     ```bash
     mvn spring-boot:run "-Dspring-boot.run.jvmArguments=-Dspring.profiles.active=postgres"
     ```

2. **Open-Meteo Air Quality History Fix**:
   * The Open-Meteo Air Quality API daily endpoint does not support the `us_aqi_max` daily variable directly, resulting in constant `400 Bad Request` errors and falling back to synthetic WAQI data.
   * **Fix**: Updated `AQIService.java` to fetch hourly `us_aqi` history (which is supported) and aggregate it to daily maximum values dynamically in Java. This allows the dashboard to correctly populate 180-day trends with real historical data.

3. **Smart Maven Auto-Detection**:
   * Updated `start_server.bat` to search for `mvn` globally. If not found, it automatically links to the local `maven-temp\apache-maven-3.9.6\bin\mvn.cmd` binary, guaranteeing startup script success.

---

## 📂 Project Navigation & URLs

Once started, access the portals here:
* 🏢 **Authority Portal / Welcome Page**: [http://localhost:8080/index.html](http://localhost:8080/index.html) or [http://localhost:8080/](http://localhost:8080/)
* 🧑 **Citizen Portal (React Dashboard)**: [http://localhost:8080/citizen.html](http://localhost:8080/citizen.html)
