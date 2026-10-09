from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/health")
def get_health():
    return {
        "status": "healthy",
        "service": "ClimateShield AI Disaster Management Engine",
        "version": "2.4.0",
        "timestamp": datetime.now().isoformat(),
        "solver": "PuLP CBC MILP",
        "mode": "Demonstration Prototype (Synthetic Indian Climate Data)",
        "synthetic_notice": "All observations, forecasts, and inventory figures are reproducible synthetic demonstration models."
    }
