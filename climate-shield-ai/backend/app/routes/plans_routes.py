from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, Optional
import json
from datetime import datetime

from app.database import get_db_connection
from app.schemas import PlanApprovalRequest, PlanApprovalResponse

router = APIRouter()

@router.get("/plans/latest")
def get_latest_plan():
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
        raise HTTPException(status_code=404, detail="No deployment plan found.")

    run_id = run_row["id"]
    cursor.execute("""
    SELECT pt.*, ro.name as origin_name, ro.state as origin_state,
           rd.name as destination_name, rd.state as destination_state
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
            "origin_name": f"{t['origin_name']} ({t['origin_state']})",
            "destination_id": t["destination_id"],
            "destination_name": f"{t['destination_name']} ({t['destination_state']})",
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
        "plan_id": run_row["id"],
        "scenario_id": run_row["scenario_id"],
        "plan_status": run_row["plan_status"],
        "is_approved": bool(run_row["is_plan_approved"]),
        "timestamp": run_row["timestamp"],
        "impact": json.loads(run_row["impact_json"]),
        "transfers": transfers,
        "diagnostic_notes": json.loads(run_row["diagnostic_notes_json"])
    }

@router.post("/plans/action", response_model=PlanApprovalResponse)
def execute_plan_action(payload: PlanApprovalRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM optimization_runs WHERE id = ?", (payload.plan_id,))
    plan_row = cursor.fetchone()

    if not plan_row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Plan '{payload.plan_id}' not found.")

    now_iso = datetime.now().isoformat()
    action = payload.action.lower()

    if action == "approve":
        # Enforce idempotence: cannot approve already approved plan
        if plan_row["is_plan_approved"]:
            conn.close()
            raise HTTPException(status_code=400, detail="This deployment plan has already been approved and executed.")

        cursor.execute("SELECT * FROM proposed_transfers WHERE run_id = ?", (payload.plan_id,))
        transfers = cursor.fetchall()

        if not transfers:
            conn.close()
            raise HTTPException(status_code=400, detail="No transfers in this plan to execute.")

        # Atomically update inventory
        for t in transfers:
            orig_id = t["origin_id"]
            dest_id = t["destination_id"]
            res_type = t["resource_type"]
            qty = t["quantity"]
            cost = t["movement_cost_inr"]

            # Deduct from origin available stock
            cursor.execute("""
            UPDATE resources
            SET available_quantity = MAX(0, available_quantity - ?),
                deployed_quantity = deployed_quantity + ?
            WHERE region_id = ? AND resource_type = ?;
            """, (qty, qty, orig_id, res_type))

            # Add to destination stock (delivered / deployed)
            cursor.execute("""
            UPDATE resources
            SET available_quantity = available_quantity + ?
            WHERE region_id = ? AND resource_type = ?;
            """, (qty, dest_id, res_type))

            # Reduce unmet demand at destination
            cursor.execute("""
            UPDATE regional_demands
            SET unmet_quantity = MAX(0, unmet_quantity - ?)
            WHERE region_id = ? AND resource_type = ?;
            """, (qty, dest_id, res_type))

            # Record in transfer execution history
            cursor.execute("""
            INSERT INTO transfers_history (plan_id, resource_type, origin_id, destination_id, quantity, movement_cost_inr, executed_at, executed_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """, (payload.plan_id, res_type, orig_id, dest_id, qty, cost, now_iso, payload.approved_by))

        # Mark plan as Approved
        cursor.execute("""
        UPDATE optimization_runs
        SET is_plan_approved = 1, plan_status = 'Approved'
        WHERE id = ?;
        """, (payload.plan_id,))

        cursor.execute("""
        INSERT INTO audit_log (action, entity_type, entity_id, details_json, created_at)
        VALUES (?, ?, ?, ?, ?);
        """, (
            "PLAN_APPROVED", "DEPLOYMENT_PLAN", payload.plan_id,
            json.dumps({"approved_by": payload.approved_by, "transfers_executed": len(transfers)}),
            now_iso
        ))

        conn.commit()
        conn.close()

        return PlanApprovalResponse(
            plan_id=payload.plan_id,
            status="Approved",
            message=f"Plan successfully approved! Executed {len(transfers)} physical resource movements and updated inventory.",
            timestamp=now_iso,
            updated_transfers_count=len(transfers)
        )

    elif action == "reject":
        if plan_row["is_plan_approved"]:
            conn.close()
            raise HTTPException(status_code=400, detail="Cannot reject a plan that has already been approved and executed.")

        cursor.execute("""
        UPDATE optimization_runs
        SET plan_status = 'Rejected'
        WHERE id = ?;
        """, (payload.plan_id,))

        cursor.execute("""
        INSERT INTO audit_log (action, entity_type, entity_id, details_json, created_at)
        VALUES (?, ?, ?, ?, ?);
        """, (
            "PLAN_REJECTED", "DEPLOYMENT_PLAN", payload.plan_id,
            json.dumps({"rejected_by": payload.approved_by, "notes": payload.notes}),
            now_iso
        ))

        conn.commit()
        conn.close()

        return PlanApprovalResponse(
            plan_id=payload.plan_id,
            status="Rejected",
            message="Plan marked as Rejected. Resource inventory and reserves remain unchanged.",
            timestamp=now_iso,
            updated_transfers_count=0
        )
    else:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Invalid action '{payload.action}'. Must be 'approve' or 'reject'.")

@router.get("/plans/history")
def get_transfers_history():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT th.*, ro.name as origin_name, rd.name as destination_name
    FROM transfers_history th
    JOIN regions ro ON th.origin_id = ro.id
    JOIN regions rd ON th.destination_id = rd.id
    ORDER BY th.executed_at DESC
    LIMIT 50;
    """)
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": r["id"],
            "plan_id": r["plan_id"],
            "resource_type": r["resource_type"],
            "origin_name": r["origin_name"],
            "destination_name": r["destination_name"],
            "quantity": r["quantity"],
            "movement_cost_inr": r["movement_cost_inr"],
            "executed_at": r["executed_at"],
            "executed_by": r["executed_by"]
        }
        for r in rows
    ]
