# AQI Monitor & Safe Route Finder - Deployment Guide

This guide provides instructions for deploying the modernized **AQI Monitor** application, which now uses a decoupled architecture (Python Backend + React Frontend).

---

## 🏗️ Architecture Overview

The application is now split into two separate deployable parts:
1. **Frontend (Vercel)**: React + Vite application (Citizen Portal & Dashboard). Located in the `frontend/` directory.
2. **Backend (Render)**: Python FastAPI application with an embedded SQLite database and OSRM routing integration. Located in the `backend_py/` directory.

This decoupled structure allows the frontend to be served instantly via global CDNs (Vercel) while the backend runs reliably as a lightweight Python web service.

---

## 🚀 Cloud Deployment Guides

### 1. Deploying the Frontend (Vercel)

Vercel is the recommended hosting platform for the React frontend, providing edge caching and instant deployments.

1. Create a free account at [Vercel](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your Git repository (GitHub/GitLab).
4. **CRITICAL STEP**: In the "Configure Project" screen, set the **Root Directory** to `frontend`.
5. Vercel will automatically detect the Vite framework.
6. Open the **Environment Variables** section and add:
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-url.onrender.com/api/aqi` *(You will get this URL from Render in the next step)*
7. Click **Deploy**. Your frontend will be live in seconds!

---

### 2. Deploying the Backend (Render)

Render is the recommended hosting platform for the Python FastAPI backend, offering a generous free tier.

#### Method 1: Automatic Blueprint (Recommended)
We have included a `render.yaml` file in the root directory that automatically configures the Python backend!
1. Push your code to GitHub.
2. Go to the [Render Dashboard](https://dashboard.render.com).
3. Click **Blueprints** -> **New Blueprint Instance**.
4. Select your repository. Render will read `render.yaml` and configure the Python web service.
5. Click **Apply**. 

#### Method 2: Manual Setup
If you prefer not to use the Blueprint:
1. In the Render Dashboard, click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the following:
   - **Name**: `aqi-monitor-backend`
   - **Root Directory**: `backend_py`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Click **Create Web Service**.

Once deployed, copy the Render URL (e.g., `https://aqi-monitor-backend.onrender.com`) and paste it into your Vercel Environment Variables as `VITE_API_URL`, then redeploy Vercel to connect them!

---

## 🐳 Running Locally with Docker

If you prefer to run the backend in a container locally, a `Dockerfile` is provided in the `backend_py` directory.

1. Build the image:
   ```bash
   cd backend_py
   docker build -t aqi-backend .
   ```
2. Run the container:
   ```bash
   docker run -d -p 8080:8080 aqi-backend
   ```
3. The API will be available at `http://localhost:8080`.
