# ClimateShield AI — Quick Start & Real-Time Weather Integration Guide

Requirements: **Node.js 18+** and **Python 3.10+**.

Open this folder (the one containing `backend`, `frontend`, and `package.json`) in VS Code, then run in the terminal:

```powershell
npm run setup   # one time: installs frontend + backend dependencies and seeds the database
npm run dev     # starts backend (port 8000) and frontend together via concurrently
```

Open the `Local:` URL printed by Vite (usually **http://localhost:5173**).

> Always run commands from the folder containing `package.json`
> (`npm run dev` in the wrong folder will give `ENOENT ... package.json`).

---

## Real-Time Weather & IMD Capabilities

ClimateShield AI combines calibrated multi-hazard scenario simulation presets with a live numerical meteorological data ingestion pipeline:

1. **Open-Meteo High-Resolution NWP Integration**:
   - Zero-key, real-time surface telemetry and 72-hour hourly forecasts for all 82 monitored Indian districts.
   - Temperature, precipitation, relative humidity, sustained wind speeds, and WMO standard weather conditions.
   - 15-minute SQLite database cache with stale-data protection and graceful network fallback.

2. **Official IMD Platform Investigation & 4-Color Warning Matrices**:
   - Built-in diagnostic probe of official India Meteorological Department platforms (`mausam.imd.gov.in`, `city.imd.gov.in`, `api.data.gov.in`).
   - Official IMD 4-tier warning categorization (**Green**: No Warning, **Yellow**: Be Updated, **Orange**: Be Prepared, **Red**: Take Action).
   - Click **IMD Diagnostics** on the Risk Intelligence page to inspect live endpoint reachability, NDSAP government token status, and operational metadata.
   - Optional: set environment variable `$env:IMD_API_KEY="your-ndsap-token"` for authenticated government data gateway access.

3. **Dynamic Risk Synchronization & PuLP Optimization**:
   - Toggle between **Scenario Mode** (Assam Flood, Rajasthan Heatwave, Gujarat Cyclone presets) and **Live Weather Stream** in the top navigation bar.
   - Click **Sync Live Risk** to feed live meteorological metrics into the multi-hazard risk engine, dynamically recalculating disaster scores and emergency supply demands.
   - Military-grade commander sign-off safeguards prevent unconfirmed dispatches.

---

## Run Backend and Frontend Separately

If you prefer separate terminal windows in VS Code:

```powershell
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
python -m app.seed
python run.py

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

### Port Conflict Handling (e.g. Port 8000 in use)

If port 8000 is occupied by another application, run the backend on port 8001 and point the frontend proxy at it:

```powershell
# Terminal 1 — Backend on port 8001
cd backend
$env:PORT = "8001"
python run.py

# Terminal 2 — Frontend targeting port 8001
cd frontend
$env:VITE_API_TARGET = "http://127.0.0.1:8001"
npm run dev
```

---

## Weather API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/weather/live` | National weather overview, summary metrics, and all 82 district observations |
| `GET` | `/api/weather/live/{region_id}` | District-level live weather observations and 72-hour hourly forecast |
| `POST` | `/api/weather/refresh` | Force bypass cache TTL and fetch fresh observations from Open-Meteo |
| `GET` | `/api/weather/imd/status` | IMD platform investigation report, endpoints audit, and warning matrix |
| `GET` | `/api/weather/config` | System weather configuration (active mode, sync timestamp, cache TTL) |
| `POST` | `/api/weather/config` | Update active weather mode and auto-refresh intervals |
| `POST` | `/api/weather/sync-risk` | Synchronize live weather telemetry into composite risk & PuLP demand engine |

