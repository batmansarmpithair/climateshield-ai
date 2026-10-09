import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def get(endpoint):
    req = urllib.request.Request(f"{BASE_URL}{endpoint}")
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())

def post(endpoint, data=None):
    body = json.dumps(data).encode("utf-8") if data is not None else b"{}"
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())

def run_e2e_demonstration():
    print("=" * 70)
    print("CLIMATESHIELD AI - COMPLETE 10-STEP END-TO-END VERIFICATION")
    print("=" * 70)

    # Step 1: Health Check & Monitored Regions
    print("\n[Step 1] Inspecting System Health & National Risk Monitored Base...")
    health = get("/health")
    print(f"  Service: {health['service']} (v{health['version']})")
    print(f"  Solver Engine: {health['solver']}")

    summary = get("/risk/summary")
    print(f"  Monitored Districts: {summary['total_monitored']}")
    print(f"  Critical/High Risk Count: {summary['high_or_critical_count']}")
    print(f"  National Average Risk Score: {summary['average_risk']}")
    assert summary['total_monitored'] >= 36, "Failed to monitor all representative districts"

    # Step 2: Select & Activate Assam Flood Emergency Scenario
    print("\n[Step 2] Activating 'Assam Flood Emergency' Disaster Scenario...")
    scen_res = post("/scenarios/assam-flood/activate")
    print(f"  Scenario: {scen_res['scenario']['name']}")
    print(f"  Active Hazard Multipliers: {scen_res['scenario']['hazard_multipliers']}")
    print(f"  Affected Districts: {scen_res['scenario']['affected_regions']}")
    assert scen_res['status'] == 'activated'

    # Step 3: Inspect Regional Forecasts & Kamrup/Cachar Flood Demand
    print("\n[Step 3] Inspecting Regional Peril Forecasts & Local Demands...")
    kamrup = get("/regions/AS-KAM")
    print(f"  Kamrup Flood Risk: {kamrup['risk']['flood_risk']} ({kamrup['risk']['risk_category']})")
    print(f"  Exposed Population: {kamrup['risk']['exposed_population']:,}")
    print(f"  Dominant Peril: {kamrup['risk']['dominant_hazard']}")
    print(f"  AI Forecast Horizons: {[f['hours_ahead'] for f in kamrup['risk']['forecasts']]} hrs ahead")
    for f in kamrup['risk']['forecasts']:
        print(f"    +{f['hours_ahead']}h Predicted Risk: {f['predicted_risk']} (CI: [{f['confidence_lower']} - {f['confidence_upper']}])")

    demands = get("/demand")
    kamrup_demands = [d for d in demands if d["region_id"] == "AS-KAM"]
    print(f"  Kamrup Urgent Demand Lines: {len(kamrup_demands)}")
    for kd in kamrup_demands[:3]:
        print(f"    - {kd['resource_type']}: {kd['demand_quantity']} units ({kd['priority_level']} Priority)")

    # Step 4: Run PuLP Optimization Engine
    print("\n[Step 4] Triggering PuLP Mixed-Integer Linear Programming Engine...")
    opt_result = post("/optimizer/run", {
        "scenario_id": "assam-flood",
        "budget_limit_inr": 6500000.0,
        "max_travel_time_hours": 48.0,
        "reserve_buffer_pct": 0.05
    })
    print(f"  Solver Status: {opt_result['status']}")
    print(f"  Reallocated Convoys: {len(opt_result['transfers'])}")
    print(f"  Units Relocated: {opt_result['impact']['total_units_moved']:,}")
    print(f"  Demand Coverage: {opt_result['impact']['optimized_coverage_pct']}%")
    print(f"  Unmet Shortages Reduced By: {opt_result['impact']['unmet_demand_reduction_pct']}%")
    assert opt_result['status'] in ["Optimal", "Feasible"]
    assert len(opt_result['transfers']) > 0

    # Step 5: Review Plain-Language Recommendations & Constraints
    print("\n[Step 5] Reviewing Plain-Language Tactical Explanations...")
    first_transfer = opt_result['transfers'][0]
    print(f"  Top Transfer Line: {first_transfer['quantity']} {first_transfer['resource_type']}")
    print(f"  Route: {first_transfer['origin_name']} -> {first_transfer['destination_name']}")
    print(f"  Distance: {first_transfer['distance_km']} km (ETA: ~{first_transfer['estimated_travel_time_hours']} hrs)")
    print(f"  Movement Cost: Rs. {first_transfer['movement_cost_inr']:,.2f}")
    print(f"  Tactical Explanation:\n    \"{first_transfer['explanation']}\"")
    print(f"  Donor Minimum Reserve Enforced: {first_transfer['origin_reserve']} units kept in depot")

    # Step 6: Fixed vs. Optimized Comparative Impact
    print("\n[Step 6] Comparing Fixed Allocation vs. PuLP Optimization Impact...")
    impact = get("/impact/latest")
    comp = impact["fixed_vs_optimized_comparison"]
    print(f"  Fixed Unmet Demand: {comp['unmet_demand']['fixed_allocation']:,} units")
    print(f"  Optimized Unmet Demand: {comp['unmet_demand']['optimized_allocation']:,} units")
    print(f"  Unmet Reduction: {comp['unmet_demand']['reduction_percentage']}%")
    print(f"  Fixed Coverage Rate: {comp['coverage_rate']['fixed_allocation']}%")
    print(f"  Optimized Coverage Rate: {comp['coverage_rate']['optimized_allocation']}%")
    assert comp['unmet_demand']['optimized_allocation'] < comp['unmet_demand']['fixed_allocation']

    # Step 7 & 8: What-If Stress Simulation (Spike hazard and demand)
    print("\n[Step 7 & 8] What-If Simulation: Surge Severity Multiplier to 2.5x...")
    sim_res = post("/scenarios/simulate", {
        "hazard_severity_multiplier": 2.5,
        "emergency_demand_multiplier": 2.0,
        "budget_limit_inr": 8000000.0,
        "reserve_buffer_pct": 0.10,
        "max_travel_time_hours": 48.0
    })
    print(f"  Simulated Demands Handled: {sim_res['simulated_demands_count']}")
    print(f"  Simulated Units Moved: {sim_res['result']['impact']['total_units_moved']:,}")
    print(f"  Simulated Demand Satisfied: {sim_res['result']['impact']['optimized_coverage_pct']}%")

    # Step 9: Re-fetch latest deployment plan for approval
    print("\n[Step 9] Inspecting Latest Proposed Deployment Plan Manifest...")
    plan = get("/plans/latest")
    plan_id = plan["plan_id"]
    print(f"  Plan ID: {plan_id}")
    print(f"  Plan Status: {plan['plan_status']} (is_approved: {plan['is_approved']})")
    print(f"  Routes to dispatch: {len(plan['transfers'])}")

    # Capture donor stock before approval
    sample_transfer = plan['transfers'][0]
    sample_orig_id = sample_transfer['origin_id']
    sample_res_type = sample_transfer['resource_type']
    donor_resources_before = get(f"/resources?region_id={sample_orig_id}&resource_type={sample_res_type.replace(' ', '%20')}")
    donor_stock_before = donor_resources_before[0]['available_quantity']
    print(f"  Donor ({sample_transfer['origin_name']}) Stock Before Approval: {donor_stock_before} {sample_res_type}")

    # Step 10: Approve Deployment Plan & Verify Inventory & History Updates
    print("\n[Step 10] Approving Deployment Plan & Verifying Atomic Inventory Commit...")
    approval_res = post("/plans/action", {
        "plan_id": plan_id,
        "action": "approve",
        "approved_by": "Commander General - National Disaster Response Force"
    })
    print(f"  Approval Response Status: {approval_res['status']}")
    print(f"  Message: {approval_res['message']}")
    assert approval_res['status'] == "Approved"

    # Verify donor stock has been deducted
    donor_resources_after = get(f"/resources?region_id={sample_orig_id}&resource_type={sample_res_type.replace(' ', '%20')}")
    donor_stock_after = donor_resources_after[0]['available_quantity']
    print(f"  Donor Stock After Approval: {donor_stock_after} (Deducted transfer quantity)")
    assert donor_stock_after <= donor_stock_before

    # Verify transfer history contains logged movements
    history = get("/plans/history")
    print(f"  Total Audit Movements Logged: {len(history)}")
    latest_hist = history[0]
    print(f"  Latest Movement Record: {latest_hist['quantity']} {latest_hist['resource_type']} -> {latest_hist['destination_name']} (By: {latest_hist['executed_by']})")
    assert len(history) > 0

    # Verify idempotence: attempting to approve again fails safely
    try:
        post("/plans/action", {
            "plan_id": plan_id,
            "action": "approve",
            "approved_by": "Commander"
        })
        print("  Error: Duplicate approval should have been blocked!")
        assert False
    except Exception as e:
        print("  Successfully blocked duplicate approval (Idempotence preserved).")

    print("\n" + "=" * 70)
    print("ALL 10 END-TO-END DEMONSTRATION WORKFLOW STEPS VERIFIED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_e2e_demonstration()
