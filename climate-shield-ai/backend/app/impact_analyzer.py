import io
import csv
from typing import Dict, List, Any

def calculate_impact_comparison(
    total_demand: int,
    baseline_unmet: int,
    optimized_unmet: int,
    movement_cost: float,
    total_units_moved: int,
    avg_travel_time: float,
    total_system_capacity: int,
    critical_demands_total: int,
    critical_demands_unmet_opt: int
) -> Dict[str, Any]:
    """
    Computes rigorous mathematical comparison between fixed (stay-in-place)
    and optimized cross-region allocation.
    """
    # Baseline coverage
    baseline_satisfied = max(0, total_demand - baseline_unmet)
    baseline_coverage_pct = round((baseline_satisfied / total_demand * 100.0), 1) if total_demand > 0 else 100.0

    # Optimized coverage
    optimized_satisfied = max(0, total_demand - optimized_unmet)
    optimized_coverage_pct = round((optimized_satisfied / total_demand * 100.0), 1) if total_demand > 0 else 100.0

    # Unmet demand reduction
    if baseline_unmet > 0:
        unmet_reduction_pct = round(((baseline_unmet - optimized_unmet) / baseline_unmet * 100.0), 1)
    else:
        unmet_reduction_pct = 100.0 if optimized_unmet == 0 else 0.0

    # Resource utilization
    utilization_pct = round(((total_units_moved + baseline_satisfied) / max(1, total_system_capacity) * 100.0), 1)

    # Critical demand coverage
    crit_satisfied = max(0, critical_demands_total - critical_demands_unmet_opt)
    crit_coverage_pct = round((crit_satisfied / max(1, critical_demands_total) * 100.0), 1) if critical_demands_total > 0 else 100.0

    return {
        "total_demand_units": total_demand,
        "baseline": {
            "unmet_demand_units": baseline_unmet,
            "satisfied_demand_units": baseline_satisfied,
            "coverage_percentage": baseline_coverage_pct,
            "movement_cost_inr": 0.0,
            "transfers_count": 0,
            "average_deployment_hours": 0.0
        },
        "optimized": {
            "unmet_demand_units": optimized_unmet,
            "satisfied_demand_units": optimized_satisfied,
            "coverage_percentage": optimized_coverage_pct,
            "movement_cost_inr": round(movement_cost, 2),
            "units_moved": total_units_moved,
            "average_deployment_hours": round(avg_travel_time, 1),
            "resource_utilization_percentage": min(100.0, utilization_pct),
            "critical_demand_coverage_percentage": crit_coverage_pct
        },
        "differential": {
            "unmet_demand_reduction_percentage": max(0.0, unmet_reduction_pct),
            "coverage_percentage_gain": round(optimized_coverage_pct - baseline_coverage_pct, 1),
            "additional_lives_safeguarded_estimate": int((baseline_unmet - optimized_unmet) * 45)  # 45 people per relief kit/shelter average
        }
    }

def generate_impact_csv(transfers: List[Dict[str, Any]], impact: Dict[str, Any]) -> str:
    """Generates standard CSV report of the optimization and deployment plan."""
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["ClimateShield AI - Emergency Resource Allocation Report"])
    writer.writerow(["Generated via Mixed-Integer Linear Programming Engine"])
    writer.writerow([])
    writer.writerow(["Impact Summary Metric", "Value"])
    writer.writerow(["Baseline Unmet Demand (Units)", impact.get("baseline_unmet_demand", 0)])
    writer.writerow(["Optimized Unmet Demand (Units)", impact.get("optimized_unmet_demand", 0)])
    writer.writerow(["Demand Coverage Gain (%)", f"{impact.get('optimized_coverage_pct', 0) - impact.get('baseline_coverage_pct', 0):.1f}%"])
    writer.writerow(["Unmet Demand Reduction (%)", f"{impact.get('unmet_demand_reduction_pct', 0):.1f}%"])
    writer.writerow(["Total Movement Cost (INR)", f"Rs. {impact.get('total_movement_cost_inr', 0):,.2f}"])
    writer.writerow(["Average Travel Time (Hours)", f"{impact.get('average_deployment_time_hours', 0):.1f} hrs"])
    writer.writerow([])
    writer.writerow(["Transfer ID", "Resource Type", "Origin", "Destination", "Quantity", "Distance (km)", "Travel Time (hrs)", "Cost (INR)", "Priority", "Explanation"])

    for t in transfers:
        writer.writerow([
            t.get("id"),
            t.get("resource_type"),
            t.get("origin_name"),
            t.get("destination_name"),
            t.get("quantity"),
            t.get("distance_km"),
            t.get("estimated_travel_time_hours"),
            t.get("movement_cost_inr"),
            t.get("priority"),
            t.get("explanation")
        ])

    return output.getvalue()
