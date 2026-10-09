from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.database import init_db, get_db_connection
from app.seed import seed_database
from app.routes import (
    health,
    regions,
    risk,
    resources,
    optimizer_routes,
    scenarios_routes,
    impact_routes,
    plans_routes,
    methodology_routes,
    weather_routes
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify database exists or seed if unseeded
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM regions;")
    count = cursor.fetchone()[0]
    conn.close()

    if count == 0:
        print("Empty database detected. Seeding synthetic Indian climate records...")
        seed_database(reset=True)
    yield

app = FastAPI(
    title="ClimateShield AI — Smart Climate Risk & Resource Optimization Platform",
    description="Backend decision-support REST API with PuLP MILP optimizer and ML forecasting for disaster management across India.",
    version="2.4.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(regions.router, prefix="/api", tags=["Regions & History"])
app.include_router(risk.router, prefix="/api", tags=["Risk Intelligence"])
app.include_router(resources.router, prefix="/api", tags=["Resources & Demand"])
app.include_router(optimizer_routes.router, prefix="/api", tags=["Resource Optimizer"])
app.include_router(scenarios_routes.router, prefix="/api", tags=["What-If Scenarios"])
app.include_router(impact_routes.router, prefix="/api", tags=["Impact Analysis"])
app.include_router(plans_routes.router, prefix="/api", tags=["Recommendations & Workflow"])
app.include_router(methodology_routes.router, prefix="/api", tags=["Methodology"])
app.include_router(weather_routes.router, prefix="/api", tags=["Real-Time Weather & IMD Telemetry"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
