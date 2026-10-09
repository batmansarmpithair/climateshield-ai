from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, List, Dict, Any
import json
import uuid
from app.database import get_db_connection

router = APIRouter()

@router.get("/resources")
def get_resources(
    region_id: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
    SELECT res.*, r.name as region_name, r.state
    FROM resources res
    JOIN regions r ON res.region_id = r.id
    WHERE 1=1
    """
    params = []

    if region_id:
        query += " AND res.region_id = ?"
        params.append(region_id)
    if resource_type and resource_type != "All":
        query += " AND res.resource_type = ?"
        params.append(resource_type)
    if search:
        query += " AND (r.name LIKE ? OR r.state LIKE ? OR res.resource_type LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

    query += " ORDER BY res.resource_type ASC, r.name ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": r["id"],
            "region_id": r["region_id"],
            "region_name": r["region_name"],
            "state": r["state"],
            "resource_type": r["resource_type"],
            "total_quantity": r["total_quantity"],
            "available_quantity": r["available_quantity"],
            "deployed_quantity": r["deployed_quantity"],
            "minimum_reserve": r["minimum_reserve"],
            "unit_movement_cost_inr": r["unit_movement_cost_inr"],
            "suitable_hazards": json.loads(r["suitable_hazards_json"])
        }
        for r in rows
    ]

@router.get("/resources/summary")
def get_resources_summary():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT 
        resource_type,
        SUM(total_quantity) as total_qty,
        SUM(available_quantity) as available_qty,
        SUM(deployed_quantity) as deployed_qty,
        SUM(minimum_reserve) as reserve_qty,
        AVG(unit_movement_cost_inr) as avg_cost_km
    FROM resources
    GROUP BY resource_type
    ORDER BY total_qty DESC;
    """)
    cat_rows = cursor.fetchall()

    cursor.execute("""
    SELECT 
        SUM(total_quantity) as grand_total,
        SUM(available_quantity) as grand_available,
        SUM(deployed_quantity) as grand_deployed,
        SUM(minimum_reserve) as grand_reserve
    FROM resources;
    """)
    totals = cursor.fetchone()
    conn.close()

    return {
        "grand_total": totals["grand_total"] or 0,
        "grand_available": totals["grand_available"] or 0,
        "grand_deployed": totals["grand_deployed"] or 0,
        "grand_reserve": totals["grand_reserve"] or 0,
        "categories": [
            {
                "resource_type": r["resource_type"],
                "total_quantity": r["total_qty"],
                "available_quantity": r["available_qty"],
                "deployed_quantity": r["deployed_qty"],
                "minimum_reserve": r["reserve_qty"],
                "avg_unit_cost_km": round(r["avg_cost_km"], 1)
            }
            for r in cat_rows
        ]
    }

@router.post("/resources")
def update_or_create_resource(payload: Dict[str, Any] = Body(...)):
    region_id = payload.get("region_id")
    resource_type = payload.get("resource_type")
    available_qty = payload.get("available_quantity")
    min_reserve = payload.get("minimum_reserve")

    if not region_id or not resource_type:
        raise HTTPException(status_code=400, detail="region_id and resource_type are required.")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM resources WHERE region_id = ? AND resource_type = ?", (region_id, resource_type))
    existing = cursor.fetchone()

    if existing:
        new_avail = available_qty if available_qty is not None else existing["available_quantity"]
        new_reserve = min_reserve if min_reserve is not None else existing["minimum_reserve"]
        new_total = new_avail + existing["deployed_quantity"]

        cursor.execute("""
        UPDATE resources
        SET available_quantity = ?, minimum_reserve = ?, total_quantity = ?
        WHERE id = ?
        """, (new_avail, new_reserve, new_total, existing["id"]))
        conn.commit()
        res_id = existing["id"]
    else:
        res_id = f"{region_id}_{resource_type.replace(' ', '_')}"
        cost = payload.get("unit_movement_cost_inr", 15.0)
        hazards = payload.get("suitable_hazards", ["Floods", "Heatwaves", "Droughts", "Cyclones"])
        tot = (available_qty or 50)
        res = min_reserve or 10

        cursor.execute("""
        INSERT INTO resources (id, region_id, resource_type, total_quantity, available_quantity, deployed_quantity, minimum_reserve, unit_movement_cost_inr, suitable_hazards_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (res_id, region_id, resource_type, tot, tot, 0, res, cost, json.dumps(hazards)))
        conn.commit()

    conn.close()
    return {"status": "success", "id": res_id, "message": "Resource inventory successfully updated."}

@router.get("/demand")
def get_demands():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT d.*, r.name as region_name, r.state, ra.overall_risk, ra.dominant_hazard
    FROM regional_demands d
    JOIN regions r ON d.region_id = r.id
    LEFT JOIN risk_assessments ra ON d.region_id = ra.region_id
    WHERE d.demand_quantity > 0
    ORDER BY d.priority_level DESC, d.demand_quantity DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": r["id"],
            "region_id": r["region_id"],
            "region_name": r["region_name"],
            "state": r["state"],
            "resource_type": r["resource_type"],
            "demand_quantity": r["demand_quantity"],
            "priority_level": r["priority_level"],
            "unmet_quantity": r["unmet_quantity"],
            "dominant_hazard": r["dominant_hazard"] or "Unknown",
            "overall_risk": r["overall_risk"] or 0
        }
        for r in rows
    ]
