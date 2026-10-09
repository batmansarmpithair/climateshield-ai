from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List, Optional
import json
import random
import math
from datetime import datetime

from app.database import get_db_connection
from app.data_generator import (
    INDIAN_REGIONS_MASTER,
    RESOURCE_CATEGORIES,
    RANDOM_SEED,
    get_hazard_climate_signature
)
from app.risk_engine import compute_regional_risk_profile
from app.optimizer import ResourceOptimizer
from app.scenarios import DEFAULT_SCENARIOS, get_scenario_by_id
from app.seed import seed_database

router = APIRouter()

@router.get("/scenarios")
def list_scenarios():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM scenarios;")
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": r["id"],
            "name": r["name"],
            "tagline": r["tagline"],
            "description": r["description"],
            "hazard_multipliers": json.loads(r["hazard_multipliers_json"]),
            "demand_multipliers": json.loads(r["demand_multipliers_json"]),
            "affected_regions": json.loads(r["affected_regions_json"]),
            "budget_inr": r["budget_inr"],
            "notes": r["notes"],
            "is_preset": bool(r["is_preset"])
        }
        for r in rows
    ]

@router.post("/scenarios/{scenario_id}/activate")
def activate_scenario(scenario_id: str):
    scenario = get_scenario_by_id(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found.")

    conn = get_db_connection()
    cursor = conn.cursor()

    rng = random.Random(RANDOM_SEED + hash(scenario_id))
    hazard_mults = scenario["hazard_multipliers"]
    demand_mults = scenario["demand_multipliers"]
    affected_regs = set(scenario["affected_regions"])

    # 1. Update risk assessments
    risk_map = {}
    for r in INDIAN_REGIONS_MASTER:
        is_affected = r["id"] in affected_regs
        mults = hazard_mults if is_affected else {"Floods": 1.0, "Heatwaves": 1.0, "Droughts": 1.0, "Cyclones": 1.0}
        
        climate_sig = get_hazard_climate_signature(r, 90, rng)
        risk_profile = compute_regional_risk_profile(r, climate_sig, mults)
        risk_map[r["id"]] = risk_profile

        cursor.execute("""
        UPDATE risk_assessments
        SET flood_risk = ?, heatwave_risk = ?, drought_risk = ?, cyclone_risk = ?,
            overall_risk = ?, risk_category = ?, dominant_hazard = ?, exposed_population = ?,
            contributing_factors_json = ?, recommended_actions_json = ?, updated_at = ?
        WHERE region_id = ?
        """, (
            risk_profile["flood_risk"], risk_profile["heatwave_risk"], risk_profile["drought_risk"],
            risk_profile["cyclone_risk"], risk_profile["overall_risk"], risk_profile["risk_category"],
            risk_profile["dominant_hazard"], risk_profile["exposed_population"],
            json.dumps(risk_profile["contributing_factors"]),
            json.dumps(risk_profile["recommended_actions"]),
            datetime.now().isoformat(),
            r["id"]
        ))
    conn.commit()

    # 2. Update regional demands
    cursor.execute("DELETE FROM regional_demands;")
    demands_list = []
    for r in INDIAN_REGIONS_MASTER:
        risk_data = risk_map[r["id"]]
        is_affected = r["id"] in affected_regs

        if is_affected or risk_data["risk_category"] in ["Critical", "High"]:
            prio = "Critical" if risk_data["risk_category"] == "Critical" else "High"
            
            for rc in RESOURCE_CATEGORIES:
                if risk_data["dominant_hazard"] in rc["suitable_hazards"]:
                    res_mult = demand_mults.get(rc["type"], 1.0) if is_affected else 1.0
                    base_demand = int(rng.uniform(15, 65) * res_mult)
                    if rc["type"] == "Relief supply kits":
                        base_demand = int(rng.uniform(400, 1500) * res_mult)
                    elif rc["type"] == "Emergency medical kits":
                        base_demand = int(rng.uniform(80, 300) * res_mult)
                    elif rc["type"] == "Temporary shelters":
                        base_demand = int(rng.uniform(50, 250) * res_mult)

                    if base_demand > 0:
                        dem_id = f"DEM_{r['id']}_{rc['type'].replace(' ', '_')}"
                        demands_list.append({
                            "id": dem_id,
                            "region_id": r["id"],
                            "resource_type": rc["type"],
                            "demand_quantity": base_demand,
                            "priority_level": prio
                        })
                        cursor.execute("""
                        INSERT INTO regional_demands (id, region_id, resource_type, demand_quantity, priority_level, unmet_quantity)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """, (dem_id, r["id"], rc["type"], base_demand, prio, base_demand))
    conn.commit()

    # 3. Fetch inventories
    cursor.execute("SELECT * FROM resources;")
    inv_rows = cursor.fetchall()
    inventories_list = [
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

    # 4. Rerun optimization with new scenario
    optimizer = ResourceOptimizer()
    opt_result = optimizer.optimize(
        regions=INDIAN_REGIONS_MASTER,
        inventories=inventories_list,
        demands=demands_list,
        risk_assessments=risk_map,
        budget_limit_inr=scenario["budget_inr"]
    )

    run_id = opt_result["run_id"]
    cursor.execute("""
    INSERT INTO optimization_runs (id, scenario_id, status, timestamp, impact_json, diagnostic_notes_json, is_plan_approved, plan_status)
    VALUES (?, ?, ?, ?, ?, ?, 0, 'Draft')
    """, (
        run_id, scenario["id"], opt_result["status"], opt_result["timestamp"],
        json.dumps(opt_result["impact"]), json.dumps(opt_result["diagnostic_notes"])
    ))

    for t in opt_result["transfers"]:
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

    conn.commit()
    conn.close()

    return {
        "status": "activated",
        "scenario": scenario,
        "optimization_result": opt_result
    }

@router.post("/scenarios/simulate")
def simulate_what_if(payload: Dict[str, Any] = Body(...)):
    """
    Interactive What-If Simulation:
    Takes live slider tweaks:
      - hazard_severity_multiplier (e.g. 1.0 to 4.0)
      - emergency_demand_multiplier (e.g. 0.5 to 3.0)
      - budget_limit_inr
      - reserve_buffer_pct
      - max_travel_time_hours
      - blocked_routes
    Recalculates risks, demands, and executes PuLP optimization with diff comparison!
    """
    hazard_mult = float(payload.get("hazard_severity_multiplier", 1.5))
    demand_mult = float(payload.get("emergency_demand_multiplier", 1.5))
    budget_limit = float(payload.get("budget_limit_inr", 5000000.0))
    reserve_buffer = float(payload.get("reserve_buffer_pct", 0.0))
    max_travel_time = float(payload.get("max_travel_time_hours", 48.0))
    blocked_routes = payload.get("blocked_routes", [])

    conn = get_db_connection()
    cursor = conn.cursor()

    # Load base regions and assessments
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

    cursor.execute("SELECT * FROM regional_demands;")
    base_demands = cursor.fetchall()

    # Adjust demands by simulator slider
    simulated_demands = []
    for d in base_demands:
        sim_qty = int(math.ceil(d["demand_quantity"] * demand_mult))
        simulated_demands.append({
            "id": d["id"],
            "region_id": d["region_id"],
            "resource_type": d["resource_type"],
            "demand_quantity": sim_qty,
            "priority_level": d["priority_level"]
        })

    cursor.execute("SELECT region_id, dominant_hazard, overall_risk, risk_category FROM risk_assessments;")
    risk_rows = cursor.fetchall()
    simulated_risk_map = {}
    for r in risk_rows:
        sim_score = min(100.0, r["overall_risk"] * hazard_mult)
        simulated_risk_map[r["region_id"]] = {
            "dominant_hazard": r["dominant_hazard"],
            "overall_risk": sim_score,
            "risk_category": "Critical" if sim_score >= 75 else ("High" if sim_score >= 50 else ("Moderate" if sim_score >= 25 else "Low"))
        }

    # Execute optimizer under simulated conditions
    optimizer = ResourceOptimizer()
    sim_result = optimizer.optimize(
        regions=regions,
        inventories=inventories,
        demands=simulated_demands,
        risk_assessments=simulated_risk_map,
        budget_limit_inr=budget_limit,
        max_travel_time_hours=max_travel_time,
        reserve_buffer_pct=reserve_buffer,
        blocked_routes=blocked_routes
    )

    conn.close()
    return {
        "status": "success",
        "simulation_parameters": {
            "hazard_severity_multiplier": hazard_mult,
            "emergency_demand_multiplier": demand_mult,
            "budget_limit_inr": budget_limit,
            "reserve_buffer_pct": reserve_buffer,
            "max_travel_time_hours": max_travel_time,
            "blocked_routes_count": len(blocked_routes)
        },
        "simulated_demands_count": len(simulated_demands),
        "result": sim_result
    }

@router.post("/scenarios/reset")
def reset_to_baseline():
    seed_database(reset=True)
    return {
        "status": "success",
        "message": "Database and demonstration scenario successfully reset to baseline state."
    }
