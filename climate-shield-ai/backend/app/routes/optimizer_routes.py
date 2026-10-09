from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, Optional, List
import json
import uuid
from datetime import datetime

from app.database import get_db_connection
from app.optimizer import ResourceOptimizer
from app.schemas import OptimizationRequestSchema

router = APIRouter()

@router.post("/optimizer/run")
def run_optimization(request: Optional[OptimizationRequestSchema] = None):
    if request is None:
        request = OptimizationRequestSchema()

    conn = get_db_connection()
    cursor = conn.cursor()

    # Load regions
    cursor.execute("SELECT * FROM regions;")
    reg_rows = cursor.fetchall()
    regions = [
        {
            "id": r["id"],
            "name": r["name"],
            "state": r["state"],
            "lat": r["latitude"],
            "lon": r["longitude"],
            "vuln": r["vulnerability_index"],
            "infra": r["infrastructure_resilience"],
            "pop": r["population"]
        }
        for r in reg_rows
    ]

    # Load resources
    cursor.execute("SELECT * FROM resources;")
    inv_rows = cursor.fetchall()
    inventories = [
        {
            "id": r["id"],
            "region_id": r["region_id"],
            "resource_type": r["resource_type"],
            "total_quantity": r["total_quantity"],
            "available_quantity": r["available_quantity"],
            "deployed_quantity": r["deployed_quantity"],
            "minimum_reserve": r["minimum_reserve"],
            "unit_movement_cost_inr": r["unit_movement_cost_inr"],
            "suitable_hazards": json.loads(r["suitable_hazards_json"])
        }
        for r in inv_rows
    ]

    # Load demands
    cursor.execute("SELECT * FROM regional_demands WHERE demand_quantity > 0;")
    dem_rows = cursor.fetchall()
    demands = [
        {
            "id": d["id"],
            "region_id": d["region_id"],
            "resource_type": d["resource_type"],
            "demand_quantity": d["demand_quantity"],
            "priority_level": d["priority_level"]
        }
        for d in dem_rows
    ]

    # Load risk assessments
    cursor.execute("SELECT region_id, dominant_hazard, overall_risk, risk_category FROM risk_assessments;")
    risk_rows = cursor.fetchall()
    risk_map = {
        r["region_id"]: {
            "dominant_hazard": r["dominant_hazard"],
            "overall_risk": r["overall_risk"],
            "risk_category": r["risk_category"]
        }
        for r in risk_rows
    }

    # Run optimizer
    optimizer = ResourceOptimizer()
    opt_weights = request.weights.model_dump() if request.weights else None
    
    result = optimizer.optimize(
        regions=regions,
        inventories=inventories,
        demands=demands,
        risk_assessments=risk_map,
        weights=opt_weights,
        budget_limit_inr=request.budget_limit_inr,
        max_travel_time_hours=request.max_travel_time_hours,
        reserve_buffer_pct=request.reserve_buffer_pct,
        blocked_routes=request.blocked_routes
    )

    run_id = result["run_id"]
    scenario_id = request.scenario_id or "custom"

    # Store in database
    cursor.execute("""
    INSERT INTO optimization_runs (id, scenario_id, status, timestamp, impact_json, diagnostic_notes_json, is_plan_approved, plan_status)
    VALUES (?, ?, ?, ?, ?, ?, 0, 'Draft')
    """, (
        run_id, scenario_id, result["status"], result["timestamp"],
        json.dumps(result["impact"]), json.dumps(result["diagnostic_notes"])
    ))

    # Clear previous draft proposed transfers or keep them by run_id
    for t in result["transfers"]:
        cursor.execute("""
        INSERT INTO proposed_transfers (id, run_id, resource_type, origin_id, destination_id, quantity, distance_km, estimated_travel_time_hours, movement_cost_inr, priority, explanation, destination_hazard, destination_demand, origin_surplus, origin_reserve, limiting_constraints_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            t["id"], run_id, t["resource_type"], t["origin_id"], t["destination_id"],
            t["quantity"], t["distance_km"], t["estimated_travel_time_hours"],
            t["movement_cost_inr"], t["priority"], t["explanation"],
            t["destination_hazard"], t["destination_demand"], t["origin_surplus"],
            t["origin_reserve"], json.dumps(t["limiting_constraints"])
        ))

    cursor.execute("""
    INSERT INTO audit_log (action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, ?, ?, ?)
    """, (
        "OPTIMIZATION_RUN", "OPTIMIZER", run_id,
        json.dumps({"status": result["status"], "transfers_count": len(result["transfers"])}),
        datetime.now().isoformat()
    ))

    conn.commit()
    conn.close()

    return result

@router.get("/optimizer/latest")
def get_latest_optimization():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT * FROM optimization_runs
    ORDER BY timestamp DESC
    LIMIT 1;
    """)
    run_row = cursor.fetchone()

    if not run_row:
        conn.close()
        raise HTTPException(status_code=404, detail="No optimization run found.")

    run_id = run_row["id"]
    cursor.execute("""
    SELECT pt.*, ro.name as origin_name, rd.name as destination_name
    FROM proposed_transfers pt
    JOIN regions ro ON pt.origin_id = ro.id
    JOIN regions rd ON pt.destination_id = rd.id
    WHERE pt.run_id = ?
    ORDER BY pt.priority DESC, pt.quantity DESC
    """, (run_id,))
    transfer_rows = cursor.fetchall()
    conn.close()

    transfers = []
    for t in transfer_rows:
        transfers.append({
            "id": t["id"],
            "resource_type": t["resource_type"],
            "origin_id": t["origin_id"],
            "origin_name": t["origin_name"],
            "destination_id": t["destination_id"],
            "destination_name": t["destination_name"],
            "quantity": t["quantity"],
            "distance_km": t["distance_km"],
            "estimated_travel_time_hours": t["estimated_travel_time_hours"],
            "movement_cost_inr": t["movement_cost_inr"],
            "priority": t["priority"],
            "explanation": t["explanation"],
            "destination_hazard": t["destination_hazard"],
            "destination_demand": t["destination_demand"],
            "origin_surplus": t["origin_surplus"],
            "origin_reserve": t["origin_reserve"],
            "limiting_constraints": json.loads(t["limiting_constraints_json"])
        })

    return {
        "run_id": run_row["id"],
        "scenario_id": run_row["scenario_id"],
        "status": run_row["status"],
        "timestamp": run_row["timestamp"],
        "plan_status": run_row["plan_status"],
        "is_plan_approved": bool(run_row["is_plan_approved"]),
        "impact": json.loads(run_row["impact_json"]),
        "diagnostic_notes": json.loads(run_row["diagnostic_notes_json"]),
        "transfers": transfers
    }
