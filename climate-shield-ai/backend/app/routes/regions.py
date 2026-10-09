from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import json
from app.database import get_db_connection

router = APIRouter()

@router.get("/regions")
def get_regions(
    state: Optional[str] = Query(None, description="Filter by Indian State"),
    search: Optional[str] = Query(None, description="Search region name or state")
):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM regions WHERE 1=1"
    params = []

    if state:
        query += " AND state = ?"
        params.append(state)
    if search:
        query += " AND (name LIKE ? OR state LIKE ?)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")

    query += " ORDER BY state ASC, name ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": r["id"],
            "name": r["name"],
            "state": r["state"],
            "is_union_territory": bool(r["is_union_territory"]),
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "population": r["population"],
            "vulnerability_index": r["vulnerability_index"],
            "infrastructure_resilience": r["infrastructure_resilience"],
            "terrain_type": r["terrain_type"]
        }
        for r in rows
    ]

@router.get("/regions/{region_id}")
def get_region_detail(region_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM regions WHERE id = ?", (region_id,))
    reg = cursor.fetchone()
    if not reg:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Region '{region_id}' not found.")

    cursor.execute("SELECT * FROM risk_assessments WHERE region_id = ?", (region_id,))
    risk_row = cursor.fetchone()

    cursor.execute("SELECT * FROM resources WHERE region_id = ?", (region_id,))
    resources_rows = cursor.fetchall()

    cursor.execute("SELECT * FROM regional_demands WHERE region_id = ?", (region_id,))
    demands_rows = cursor.fetchall()

    conn.close()

    risk_data = None
    if risk_row:
        risk_data = {
            "flood_risk": risk_row["flood_risk"],
            "heatwave_risk": risk_row["heatwave_risk"],
            "drought_risk": risk_row["drought_risk"],
            "cyclone_risk": risk_row["cyclone_risk"],
            "overall_risk": risk_row["overall_risk"],
            "risk_category": risk_row["risk_category"],
            "dominant_hazard": risk_row["dominant_hazard"],
            "exposed_population": risk_row["exposed_population"],
            "uncertainty_margin": risk_row["uncertainty_margin"],
            "contributing_factors": json.loads(risk_row["contributing_factors_json"]),
            "forecasts": json.loads(risk_row["forecasts_json"]),
            "recommended_actions": json.loads(risk_row["recommended_actions_json"])
        }

    return {
        "region": {
            "id": reg["id"],
            "name": reg["name"],
            "state": reg["state"],
            "is_union_territory": bool(reg["is_union_territory"]),
            "latitude": reg["latitude"],
            "longitude": reg["longitude"],
            "population": reg["population"],
            "vulnerability_index": reg["vulnerability_index"],
            "infrastructure_resilience": reg["infrastructure_resilience"],
            "terrain_type": reg["terrain_type"]
        },
        "risk": risk_data,
        "resources": [
            {
                "id": res["id"],
                "resource_type": res["resource_type"],
                "total_quantity": res["total_quantity"],
                "available_quantity": res["available_quantity"],
                "deployed_quantity": res["deployed_quantity"],
                "minimum_reserve": res["minimum_reserve"],
                "unit_movement_cost_inr": res["unit_movement_cost_inr"]
            }
            for res in resources_rows
        ],
        "demands": [
            {
                "id": d["id"],
                "resource_type": d["resource_type"],
                "demand_quantity": d["demand_quantity"],
                "priority_level": d["priority_level"],
                "unmet_quantity": d["unmet_quantity"]
            }
            for d in demands_rows
        ]
    }

@router.get("/regions/{region_id}/history")
def get_region_history(region_id: str, days: int = Query(30, ge=7, le=90)):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT * FROM climate_observations
    WHERE region_id = ?
    ORDER BY date DESC
    LIMIT ?
    """, (region_id, days))
    rows = cursor.fetchall()
    conn.close()

    # Return chronological order
    rows = list(reversed(rows))
    return [
        {
            "date": r["date"],
            "rainfall_mm": r["rainfall_mm"],
            "temperature_c": r["temperature_c"],
            "humidity_pct": r["humidity_pct"],
            "wind_speed_kmh": r["wind_speed_kmh"],
            "flood_indicator": r["flood_indicator"],
            "heatwave_indicator": r["heatwave_indicator"],
            "drought_indicator": r["drought_indicator"],
            "cyclone_indicator": r["cyclone_indicator"],
            "calculated_risk": r["calculated_risk"]
        }
        for r in rows
    ]
