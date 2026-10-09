from fastapi import APIRouter, Query
from typing import Optional, List
import json
from app.database import get_db_connection

router = APIRouter()

@router.get("/risk")
def get_all_risk_assessments(
    hazard: Optional[str] = Query(None, description="Filter by dominant hazard (Floods, Heatwaves, Droughts, Cyclones)"),
    category: Optional[str] = Query(None, description="Filter by category (Critical, High, Moderate, Low)"),
    min_score: Optional[float] = Query(None, ge=0, le=100)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
    SELECT r.id as region_id, r.name as region_name, r.state, r.latitude, r.longitude, r.population,
           ra.flood_risk, ra.heatwave_risk, ra.drought_risk, ra.cyclone_risk, ra.overall_risk,
           ra.risk_category, ra.dominant_hazard, ra.exposed_population, ra.uncertainty_margin,
           ra.contributing_factors_json, ra.forecasts_json, ra.recommended_actions_json, ra.updated_at
    FROM regions r
    JOIN risk_assessments ra ON r.id = ra.region_id
    WHERE 1=1
    """
    params = []

    if hazard and hazard != "All":
        query += " AND ra.dominant_hazard = ?"
        params.append(hazard)
    if category and category != "All":
        query += " AND ra.risk_category = ?"
        params.append(category)
    if min_score is not None:
        query += " AND ra.overall_risk >= ?"
        params.append(min_score)

    query += " ORDER BY ra.overall_risk DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "region_id": r["region_id"],
            "region_name": r["region_name"],
            "state": r["state"],
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "population": r["population"],
            "flood_risk": r["flood_risk"],
            "heatwave_risk": r["heatwave_risk"],
            "drought_risk": r["drought_risk"],
            "cyclone_risk": r["cyclone_risk"],
            "overall_risk": r["overall_risk"],
            "risk_category": r["risk_category"],
            "dominant_hazard": r["dominant_hazard"],
            "exposed_population": r["exposed_population"],
            "uncertainty_margin": r["uncertainty_margin"],
            "contributing_factors": json.loads(r["contributing_factors_json"]),
            "forecasts": json.loads(r["forecasts_json"]),
            "recommended_actions": json.loads(r["recommended_actions_json"]),
            "updated_at": r["updated_at"]
        })
    return results

@router.get("/risk/summary")
def get_risk_summary():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT 
        COUNT(*) as total_monitored,
        SUM(CASE WHEN risk_category = 'Critical' THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN risk_category = 'High' THEN 1 ELSE 0 END) as high_count,
        SUM(CASE WHEN risk_category = 'Moderate' THEN 1 ELSE 0 END) as moderate_count,
        SUM(CASE WHEN risk_category = 'Low' THEN 1 ELSE 0 END) as low_count,
        AVG(overall_risk) as average_risk,
        SUM(exposed_population) as total_exposed_population
    FROM risk_assessments;
    """)
    summary_row = cursor.fetchone()

    cursor.execute("""
    SELECT r.id, r.name, r.state, ra.overall_risk, ra.risk_category, ra.dominant_hazard, ra.exposed_population
    FROM regions r
    JOIN risk_assessments ra ON r.id = ra.region_id
    ORDER BY ra.overall_risk DESC
    LIMIT 6;
    """)
    top_regions = cursor.fetchall()
    conn.close()

    return {
        "total_monitored": summary_row["total_monitored"] or 0,
        "critical_count": summary_row["critical_count"] or 0,
        "high_count": summary_row["high_count"] or 0,
        "moderate_count": summary_row["moderate_count"] or 0,
        "low_count": summary_row["low_count"] or 0,
        "high_or_critical_count": (summary_row["critical_count"] or 0) + (summary_row["high_count"] or 0),
        "average_risk": round(summary_row["average_risk"] or 0.0, 1),
        "total_exposed_population": summary_row["total_exposed_population"] or 0,
        "top_risk_regions": [
            {
                "id": tr["id"],
                "name": tr["name"],
                "state": tr["state"],
                "risk_score": tr["overall_risk"],
                "risk_category": tr["risk_category"],
                "dominant_hazard": tr["dominant_hazard"],
                "exposed_population": tr["exposed_population"]
            }
            for tr in top_regions
        ]
    }
