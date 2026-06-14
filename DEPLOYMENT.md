# AQI Monitor & Safe Route Finder - Deployment Guide

This guide provides instructions for containerizing, configuring, and deploying the unified **AQI Monitor & Safe Route Finder** application to production environments.

---

## 🏗️ Architecture Overview

The application is structured as a **unified platform**:
1. **Frontend**: Vite + React (Citizen Portal) and Vanilla HTML/CSS/JS (Authority Portal).
2. **Backend**: Spring Boot 3 + Embedded Tomcat.
3. **Packaging**: During the Maven build phase, the `frontend-maven-plugin` installs Node/NPM, compiles the React assets, and copies them to the backend's static assets directory (`src/main/resources/static`). Everything is packaged into a single runnable JAR file.
4. **Data Engine**:
   - **AQI Estimations**: Loaded from an in-memory H2 database (seeded from `cities.json` on start) or PostgreSQL.
   - **Clean Route Calculator**: Built on **GraphHopper 0.13.0** which loads the North & Central zones merged OpenStreetMap dataset (`osm/ncr-complete.osm.pbf`, 560MB).

---

## ⚡ Critical Deployment Requirements (Memory & CPU)

Because the application processes a large (560MB) OpenStreetMap region file for route finding, it has specific resource demands:

> [!WARNING]
> - **Memory**: The Java Virtual Machine (JVM) requires a minimum of **2GB to 4GB of RAM** (default `-Xmx4g` locally, or `-Xmx2g` / `-Xmx3g` inside containers) to prevent Out of Memory (OOM) crashes.
> - **Initial Startup Time**: On the very first boot, GraphHopper parses the raw OSM file and compiles a high-performance routing cache. This takes **1 to 3 minutes** depending on CPU performance and requires around 2GB-3GB RAM.
> - **Hosting Restrictions**: Do **NOT** deploy this app to free-tier cloud instances with only 512MB RAM (e.g., free Render web services or free Railway plans). It will crash immediately during startup. Ensure your container service offers at least **2GB of RAM**.

---

## 🐳 Running Locally with Docker Compose

Running containerized allows you to emulate a production environment locally.

### Prerequisites
- Docker & Docker Compose installed.

### 1. Build and Run
In the project root (where `docker-compose.yml` lives), execute:
```bash
docker compose up --build
```

### 2. Verify Portals
Once the container starts up and imports the OSM routing graph, you can access the application at:
- **Authority Portal / Welcome Page**: `http://localhost:8080/`
- **Citizen Portal (React Dashboard)**: `http://localhost:8080/citizen.html`

### 3. Graph Cache Persistence
The `docker-compose.yml` configures a named Docker volume (`aqi-routing-cache`) mapped to `/app/target`. This persists the compiled GraphHopper routing cache across restarts, meaning subsequent startups take **less than 5 seconds** instead of re-importing the 560MB OSM file.

---

## 🗄️ Database Configurations

### 1. In-Memory H2 Database (Default)
Ideal for testing and easy deployment.
- **Datasource URL**: `jdbc:h2:mem:aqi_db;DB_CLOSE_DELAY=-1`
- **Behavior**: Seeds ~970 cities on startup if empty.
- **Data Persistence**: Lost on container rebuilds/restarts.

### 2. PostgreSQL (Recommended for Production)
For production persistence, configure an external PostgreSQL database (e.g., AWS RDS, Supabase, Render Postgres) by passing environment variables to the container.

#### Environment Variables to Set:
* `SPRING_PROFILES_ACTIVE=postgres`
* `SPRING_DATASOURCE_URL=jdbc:postgresql://<your-db-host>:<port>/<db_name>`
* `SPRING_DATASOURCE_USERNAME=<username>`
* `SPRING_DATASOURCE_PASSWORD=<password>`

---

## 🚀 Cloud Deployment Guides

### Option A: Render (Recommended)
Render supports Docker deployments natively and can be configured with Infrastructure-as-Code using the provided `render.yaml`.

#### Method 1: Using render.yaml (Blueprint)
1. Push your code repository to GitHub or GitLab.
2. In the Render Dashboard, click **Blueprints** -> **New Blueprint Instance**.
3. Select your repository.
4. Render will parse `render.yaml` and configure a Web Service under the **Starter** plan (2GB RAM).
5. Click **Deploy**.

#### Method 2: Manual Setup on Render
1. Click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Select **Language** as `Docker`.
4. Choose the **Starter** instance plan (2GB RAM).
5. In **Advanced**, add the environment variable:
   - Key: `JAVA_OPTS`
   - Value: `-Xmx1800m -Xms512m` (Leaves 200MB overhead for the container OS).
6. Click **Create Web Service**.

---

### Option B: Railway
1. Install the Railway CLI or connect your GitHub repository in the Railway Dashboard.
2. Click **New Project** -> **Deploy from GitHub**.
3. Select this repository. Railway will automatically detect the `Dockerfile` and start building.
4. Go to the service **Settings** -> **Variables**:
   - Add `JAVA_OPTS` = `-Xmx2g` (or higher depending on your Railway resource plan).
5. Go to **Settings** -> **Service Plan**:
   - Ensure the allocated memory is set to **at least 2GB**.
6. Generate a domain name under **Networking** to access the live app.

---

### Option C: AWS App Runner or Google Cloud Run
These services run Docker containers serverlessly.

1. Build the Docker image locally:
   ```bash
   docker build -t aqi-monitor .
   ```
2. Tag and push the image to AWS ECR (Elastic Container Registry) or GCP GCR/Artifact Registry.
3. Create a service in AWS App Runner or Google Cloud Run pointing to your registry image.
4. **Configure Resources**: Make sure to allocate **2 vCPUs and at least 4GB of Memory** to ensure stable GraphHopper operation and rapid route calculations.
