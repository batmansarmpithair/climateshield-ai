import json
import random
import uuid
from datetime import datetime
from app.database import get_db_connection, init_db
from app.data_generator import (
    INDIAN_REGIONS_MASTER,
    RESOURCE_CATEGORIES,
    RANDOM_SEED,
    generate_historical_time_series,
    get_hazard_climate_signature
)
from app.risk_engine import compute_regional_risk_profile
from app.ml_forecasting import TimeSeriesRiskForecaster
from app.optimizer import ResourceOptimizer
from app.scenarios import DEFAULT_SCENARIOS

def seed_database(reset: bool = True):
    print("Initializing Database...")
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    if reset:
        cursor.execute("DELETE FROM proposed_transfers;")
        cursor.execute("DELETE FROM optimization_runs;")
        cursor.execute("DELETE FROM transfers_history;")
        cursor.execute("DELETE FROM audit_log;")
        cursor.execute("DELETE FROM regional_demands;")
        cursor.execute("DELETE FROM resources;")
        cursor.execute("DELETE FROM risk_assessments;")
        cursor.execute("DELETE FROM climate_observations;")
        cursor.execute("DELETE FROM scenarios;")
        cursor.execute("DELETE FROM regions;")
        conn.commit()

    rng = random.Random(RANDOM_SEED)

    # 1. Insert Regions
    print(f"Seeding {len(INDIAN_REGIONS_MASTER)} Indian Regions across all 28 states & 8 UTs...")
    for r in INDIAN_REGIONS_MASTER:
        cursor.execute("""
        INSERT INTO regions (id, name, state, is_union_territory, latitude, longitude, population, vulnerability_index, infrastructure_resilience, terrain_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name=excluded.name, state=excluded.state, latitude=excluded.latitude, longitude=excluded.longitude,
            population=excluded.population, vulnerability_index=excluded.vulnerability_index,
            infrastructure_resilience=excluded.infrastructure_resilience, terrain_type=excluded.terrain_type;
        """, (
            r["id"], r["name"], r["state"], 1 if r["is_ut"] else 0,
            r["lat"], r["lon"], r["pop"], r["vuln"], r["infra"], r["terrain"]
        ))
    conn.commit()

    # 2. Insert Scenarios
    print(f"Seeding {len(DEFAULT_SCENARIOS)} Scenario Presets...")
    for s in DEFAULT_SCENARIOS:
        cursor.execute("""
        INSERT INTO scenarios (id, name, tagline, description, hazard_multipliers_json, demand_multipliers_json, affected_regions_json, budget_inr, notes, is_preset)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name=excluded.name, tagline=excluded.tagline, description=excluded.description,
            hazard_multipliers_json=excluded.hazard_multipliers_json,
            demand_multipliers_json=excluded.demand_multipliers_json,
            affected_regions_json=excluded.affected_regions_json,
            budget_inr=excluded.budget_inr, notes=excluded.notes;
        """, (
            s["id"], s["name"], s["tagline"], s["description"],
            json.dumps(s["hazard_multipliers"]), json.dumps(s["demand_multipliers"]),
            json.dumps(s["affected_regions"]), s["budget_inr"], s["notes"], 1
        ))
    conn.commit()

    # 3. Generate Historical Observations & Train ML Forecasters
    print("Generating 90-day historical time-series and training ML risk forecasters...")
    forecaster = TimeSeriesRiskForecaster(l2_alpha=1.5)
    
    # We will gather a representative training set from diverse regions
    sample_history_records = []
    regional_histories = {}
    
    for r in INDIAN_REGIONS_MASTER:
        hist = generate_historical_time_series(r, days=90, rng=rng)
        regional_histories[r["id"]] = hist
        sample_history_records.extend(hist)
        
        # Insert last 14 days into db for quick query
        for obs in hist[-14:]:
            cursor.execute("""
            INSERT INTO climate_observations (region_id, date, rainfall_mm, temperature_c, humidity_pct, wind_speed_kmh, flood_indicator, heatwave_indicator, drought_indicator, cyclone_indicator, calculated_risk)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                obs["region_id"], obs["date"], obs["rainfall_mm"], obs["temperature_c"], obs["humidity_pct"],
                obs["wind_speed_kmh"], obs["flood_indicator"], obs["heatwave_indicator"], obs["drought_indicator"],
                obs["cyclone_indicator"], obs["calculated_risk"]
            ))
    conn.commit()

    # Train forecaster on historical records
    ml_metrics = forecaster.train_and_validate(sample_history_records[:2000])
    print(f"ML Forecaster Trained. Validation R²={ml_metrics['r2']}, MAE={ml_metrics['mae']}, RMSE={ml_metrics['rmse']}")

    # 4. Generate Current Risk Assessments with 24h, 48h, 72h forecasts
    print("Computing baseline risk assessments and multi-horizon forecasts...")
    now_iso = datetime.now().isoformat()
    risk_assessments_map = {}

    # Default to Assam Flood Emergency scenario hazard multipliers for initial load
    active_scenario = DEFAULT_SCENARIOS[0]
    hazard_mults = active_scenario["hazard_multipliers"]

    for r in INDIAN_REGIONS_MASTER:
        # Check if region is in affected regions of scenario to apply full multiplier
        is_affected = r["id"] in active_scenario["affected_regions"]
        mults = hazard_mults if is_affected else {"Floods": 1.0, "Heatwaves": 1.0, "Droughts": 1.0, "Cyclones": 1.0}
        
        climate_sig = get_hazard_climate_signature(r, 90, rng)
        risk_profile = compute_regional_risk_profile(r, climate_sig, mults)
        
        # Forecasts
        recent_hist = regional_histories[r["id"]]
        forecasts = forecaster.predict_horizons(recent_hist, risk_profile["overall_risk"], risk_profile["dominant_hazard"])

        risk_assessments_map[r["id"]] = {
            **risk_profile,
            "region_id": r["id"],
            "region_name": r["name"],
            "state": r["state"],
            "forecasts": forecasts
        }

        cursor.execute("""
        INSERT INTO risk_assessments (region_id, flood_risk, heatwave_risk, drought_risk, cyclone_risk, overall_risk, risk_category, dominant_hazard, exposed_population, uncertainty_margin, contributing_factors_json, forecasts_json, recommended_actions_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(region_id) DO UPDATE SET
            flood_risk=excluded.flood_risk, heatwave_risk=excluded.heatwave_risk, drought_risk=excluded.drought_risk,
            cyclone_risk=excluded.cyclone_risk, overall_risk=excluded.overall_risk, risk_category=excluded.risk_category,
            dominant_hazard=excluded.dominant_hazard, exposed_population=excluded.exposed_population,
            uncertainty_margin=excluded.uncertainty_margin, contributing_factors_json=excluded.contributing_factors_json,
            forecasts_json=excluded.forecasts_json, recommended_actions_json=excluded.recommended_actions_json,
            updated_at=excluded.updated_at;
        """, (
            r["id"], risk_profile["flood_risk"], risk_profile["heatwave_risk"], risk_profile["drought_risk"],
            risk_profile["cyclone_risk"], risk_profile["overall_risk"], risk_profile["risk_category"],
            risk_profile["dominant_hazard"], risk_profile["exposed_population"], risk_profile["uncertainty_margin"],
            json.dumps(risk_profile["contributing_factors"]), json.dumps(forecasts),
            json.dumps(risk_profile["recommended_actions"]), now_iso
        ))
    conn.commit()

    # 5. Seed Resources across Regions
    print("Seeding inventory across 8 resource categories...")
    inventories_list = []
    for r in INDIAN_REGIONS_MASTER:
        # Urban mega-centers or major logistics hubs have higher base stock
        is_metro = r["name"] in ["Kolkata", "Patna", "New Delhi", "Mumbai", "Pune", "Jaipur", "Bengaluru Urban", "Hyderabad", "Bhubaneswar (Khurdha)", "Chennai", "Ahmedabad", "Lucknow", "Guwahati"]
        stock_multiplier = 2.5 if is_metro else 1.0

        for rc in RESOURCE_CATEGORIES:
            res_id = f"{r['id']}_{rc['type'].replace(' ', '_')}"
            min_q, max_q = rc["base_stock"]
            total_qty = int(rng.uniform(min_q, max_q) * stock_multiplier)
            min_reserve = max(1, int(total_qty * rc["min_reserve_ratio"]))
            deployed = int(total_qty * rng.uniform(0.05, 0.25))
            available = max(0, total_qty - deployed)

            inv_obj = {
                "id": res_id,
                "region_id": r["id"],
                "region_name": r["name"],
                "resource_type": rc["type"],
                "total_quantity": total_qty,
                "available_quantity": available,
                "deployed_quantity": deployed,
                "minimum_reserve": min_reserve,
                "unit_movement_cost_inr": rc["movement_cost_per_km"],
                "suitable_hazards": rc["suitable_hazards"]
            }
            inventories_list.append(inv_obj)

            cursor.execute("""
            INSERT INTO resources (id, region_id, resource_type, total_quantity, available_quantity, deployed_quantity, minimum_reserve, unit_movement_cost_inr, suitable_hazards_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                total_quantity=excluded.total_quantity, available_quantity=excluded.available_quantity,
                deployed_quantity=excluded.deployed_quantity, minimum_reserve=excluded.minimum_reserve;
            """, (
                res_id, r["id"], rc["type"], total_qty, available, deployed,
                min_reserve, rc["movement_cost_per_km"], json.dumps(rc["suitable_hazards"])
            ))
    conn.commit()

    # 6. Seed Regional Emergency Demands
    print("Seeding regional demands tailored for the active disaster scenario...")
    demands_list = []
    demand_multipliers = active_scenario["demand_multipliers"]

    for r in INDIAN_REGIONS_MASTER:
        risk_data = risk_assessments_map[r["id"]]
        is_affected = r["id"] in active_scenario["affected_regions"]
        
        # High and Critical risk regions have emergency demand
        if is_affected or risk_data["risk_category"] in ["Critical", "High"]:
            prio = "Critical" if risk_data["risk_category"] == "Critical" else "High"
            
            for rc in RESOURCE_CATEGORIES:
                # Check hazard suitability
                if risk_data["dominant_hazard"] in rc["suitable_hazards"]:
                    res_mult = demand_multipliers.get(rc["type"], 1.0) if is_affected else 1.0
                    base_demand = int(rng.uniform(15, 65) * res_mult)
                    if rc["type"] == "Relief supply kits":
                        base_demand = int(rng.uniform(400, 1500) * res_mult)
                    elif rc["type"] == "Emergency medical kits":
                        base_demand = int(rng.uniform(80, 300) * res_mult)
                    elif rc["type"] == "Temporary shelters":
                        base_demand = int(rng.uniform(50, 250) * res_mult)

                    if base_demand > 0:
                        dem_id = f"DEM_{r['id']}_{rc['type'].replace(' ', '_')}"
                        demand_item = {
                            "id": dem_id,
                            "region_id": r["id"],
                            "region_name": r["name"],
                            "resource_type": rc["type"],
                            "demand_quantity": base_demand,
                            "priority_level": prio
                        }
                        demands_list.append(demand_item)

                        cursor.execute("""
                        INSERT INTO regional_demands (id, region_id, resource_type, demand_quantity, priority_level, unmet_quantity)
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON CONFLICT(id) DO UPDATE SET
                            demand_quantity=excluded.demand_quantity, priority_level=excluded.priority_level;
                        """, (
                            dem_id, r["id"], rc["type"], base_demand, prio, base_demand
                        ))
    conn.commit()

    # 7. Run Initial PuLP Optimization to create a live plan
    print("Running initial PuLP Optimization for Assam Flood Emergency...")
    optimizer = ResourceOptimizer()
    opt_result = optimizer.optimize(
        regions=INDIAN_REGIONS_MASTER,
        inventories=inventories_list,
        demands=demands_list,
        risk_assessments=risk_assessments_map,
        budget_limit_inr=active_scenario["budget_inr"]
    )

    run_id = opt_result["run_id"]
    cursor.execute("""
    INSERT INTO optimization_runs (id, scenario_id, status, timestamp, impact_json, diagnostic_notes_json, is_plan_approved, plan_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        run_id, active_scenario["id"], opt_result["status"], opt_result["timestamp"],
        json.dumps(opt_result["impact"]), json.dumps(opt_result["diagnostic_notes"]),
        0, "Draft"
    ))

    for t in opt_result["transfers"]:
        cursor.execute("""
        INSERT INTO proposed_transfers (id, run_id, resource_type, origin_id, destination_id, quantity, distance_km, estimated_travel_time_hours, movement_cost_inr, priority, explanation, destination_hazard, destination_demand, origin_surplus, origin_reserve, limiting_constraints_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            t["id"], run_id, t["resource_type"], t["origin_id"], t["destination_id"],
            t["quantity"], t["distance_km"], t["estimated_travel_time_hours"],
            t["movement_cost_inr"], t["priority"], t["explanation"],
            t["destination_hazard"], t["destination_demand"], t["origin_surplus"],
            t["origin_reserve"], json.dumps(t["limiting_constraints"])
        ))

    # Log initial seed event to audit log
    cursor.execute("""
    INSERT INTO audit_log (action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, ?, ?, ?);
    """, (
        "DATABASE_INITIALIZED", "SYSTEM", "SEED_JOB",
        json.dumps({"scenario": active_scenario["name"], "transfers_generated": len(opt_result["transfers"])}),
        now_iso
    ))

    conn.commit()
    conn.close()
    print(f"Database seeded successfully! Created {len(opt_result['transfers'])} proposed transfers. Run ID: {run_id}")
    return run_id

if __name__ == "__main__":
    seed_database(reset=True)
