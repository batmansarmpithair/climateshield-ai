from fastapi import APIRouter, HTTPException, Response
import json
from app.database import get_db_connection
from app.impact_analyzer import generate_impact_csv

router = APIRouter()

@router.get("/impact/latest")
def get_latest_impact():
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
    """, (run_id,))
    transfer_rows = cursor.fetchall()
    conn.close()

    impact_data = json.loads(run_row["impact_json"])

    # Build per-category comparison metrics
    category_breakdown = {}
    for t in transfer_rows:
        cat = t["resource_type"]
        if cat not in category_breakdown:
            category_breakdown[cat] = {
                "resource_type": cat,
                "units_moved": 0,
                "movement_cost_inr": 0.0,
                "transfers_count": 0
            }
        category_breakdown[cat]["units_moved"] += t["quantity"]
        category_breakdown[cat]["movement_cost_inr"] += t["movement_cost_inr"]
        category_breakdown[cat]["transfers_count"] += 1

    return {
        "run_id": run_id,
        "scenario_id": run_row["scenario_id"],
        "status": run_row["status"],
        "timestamp": run_row["timestamp"],
        "summary": impact_data,
        "categories_breakdown": list(category_breakdown.values()),
        "fixed_vs_optimized_comparison": {
            "unmet_demand": {
                "fixed_allocation": impact_data.get("baseline_unmet_demand", 0),
                "optimized_allocation": impact_data.get("optimized_unmet_demand", 0),
                "unit": "Emergency Units",
                "reduction_percentage": impact_data.get("unmet_demand_reduction_pct", 0)
            },
            "coverage_rate": {
                "fixed_allocation": impact_data.get("baseline_coverage_pct", 0),
                "optimized_allocation": impact_data.get("optimized_coverage_pct", 0),
                "unit": "Percentage (%)"
            },
            "movement_expenditure": {
                "fixed_allocation": 0.0,
                "optimized_allocation": impact_data.get("total_movement_cost_inr", 0),
                "unit": "INR"
            },
            "average_delay": {
                "fixed_allocation": 0.0,
                "optimized_allocation": impact_data.get("average_deployment_time_hours", 0),
                "unit": "Hours"
            }
        }
    }

@router.get("/impact/export/csv")
def export_impact_csv():
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

    impact_dict = json.loads(run_row["impact_json"])
    transfers_list = [dict(r) for r in transfer_rows]

    csv_content = generate_impact_csv(transfers_list, impact_dict)

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=climateshield_plan_{run_id[:8]}.csv"}
    )
