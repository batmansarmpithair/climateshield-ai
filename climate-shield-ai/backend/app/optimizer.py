import uuid
import math
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import pulp
from app.data_generator import haversine_distance, RESOURCE_CATEGORIES

class ResourceOptimizer:
    """
    Authoritative Mixed-Integer Linear Programming (MILP) Resource Optimization Engine.
    Uses PuLP to solve emergency resource transfers across Indian districts.
    
    Objective:
      Min sum_{j,k} (w_unmet * p_k * S_{j,k})
        + sum_{i,j,k} (w_cost * cost_{i,j,k} * X_{i,j,k})
        + sum_{i,j,k} (w_delay * time_{i,j} * X_{i,j,k})
        + sum_{i,j,k} (w_move * X_{i,j,k})
        + sum_j (w_risk * ResidualRisk_j)
    """

    def __init__(self):
        # Average emergency convoy speed across Indian highways (km/h)
        self.avg_convoy_speed_kmh = 50.0

    def optimize(
        self,
        regions: List[Dict[str, Any]],
        inventories: List[Dict[str, Any]],
        demands: List[Dict[str, Any]],
        risk_assessments: Dict[str, Dict[str, Any]],
        weights: Optional[Dict[str, float]] = None,
        budget_limit_inr: float = 5000000.0,
        max_travel_time_hours: float = 48.0,
        reserve_buffer_pct: float = 0.0,
        blocked_routes: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        if weights is None:
            weights = {
                "unmet_demand_penalty": 100.0,
                "transport_cost_weight": 0.05,
                "deployment_delay_weight": 2.0,
                "excessive_movement_weight": 5.0,
                "residual_risk_weight": 10.0,
            }

        blocked_set = set()
        if blocked_routes:
            for b in blocked_routes:
                blocked_set.add((b.get("origin_id"), b.get("destination_id")))

        # Map lookup dicts
        region_map = {r["id"]: r for r in regions}
        res_cat_map = {rc["type"]: rc for rc in RESOURCE_CATEGORIES}

        # Identify demand regions and types
        # Filter for active demands > 0
        active_demands = [d for d in demands if d.get("demand_quantity", 0) > 0]
        
        # Calculate baseline unmet demand before any optimization (fixed allocation)
        # Baseline: initial local inventory vs local demand
        baseline_unmet = {}
        total_demand_units = sum(d["demand_quantity"] for d in active_demands)
        
        # Build donor available stocks and min reserves
        # key: (region_id, resource_type) -> {"available": int, "reserve": int, "cost_km": float}
        stock_map = {}
        for inv in inventories:
            key = (inv["region_id"], inv["resource_type"])
            # Apply reserve buffer if requested (e.g. 10% extra safety)
            effective_reserve = int(math.ceil(inv["minimum_reserve"] * (1.0 + reserve_buffer_pct)))
            spareable = max(0, inv["available_quantity"] - effective_reserve)
            stock_map[key] = {
                "available": inv["available_quantity"],
                "reserve": effective_reserve,
                "spareable": spareable,
                "cost_km": inv.get("unit_movement_cost_inr", 10.0),
                "suitable_hazards": inv.get("suitable_hazards", [])
            }

        # Calculate baseline unmet
        for d in active_demands:
            d_key = (d["region_id"], d["resource_type"])
            local_stock = stock_map.get(d_key, {}).get("available", 0)
            unmet = max(0, d["demand_quantity"] - local_stock)
            baseline_unmet[d_key] = unmet

        total_baseline_unmet_units = sum(baseline_unmet.values())

        if total_demand_units == 0:
            return {
                "run_id": str(uuid.uuid4()),
                "status": "NoActionNeeded",
                "timestamp": datetime.now().isoformat(),
                "impact": {
                    "baseline_unmet_demand": 0,
                    "optimized_unmet_demand": 0,
                    "unmet_demand_reduction_pct": 100.0,
                    "baseline_coverage_pct": 100.0,
                    "optimized_coverage_pct": 100.0,
                    "total_movement_cost_inr": 0.0,
                    "average_deployment_time_hours": 0.0,
                    "total_units_moved": 0,
                    "resource_utilization_pct": 0.0,
                    "critical_shortage_regions": 0,
                    "budget_utilized_pct": 0.0
                },
                "transfers": [],
                "diagnostic_notes": ["No active emergency demand across monitored regions."]
            }

        # Build candidate transfer routes:
        # From donor region i to recipient region j for resource k
        candidate_transfers = []
        for d in active_demands:
            dest_id = d["region_id"]
            res_type = d["resource_type"]
            demand_qty = d["demand_quantity"]
            dest_risk = risk_assessments.get(dest_id, {})
            dest_hazard = dest_risk.get("dominant_hazard", "Floods")

            dest_reg = region_map.get(dest_id)
            if not dest_reg:
                continue

            for donor_reg in regions:
                orig_id = donor_reg["id"]
                if orig_id == dest_id:
                    continue
                if (orig_id, dest_id) in blocked_set:
                    continue

                donor_stock = stock_map.get((orig_id, res_type))
                if not donor_stock or donor_stock["spareable"] <= 0:
                    continue

                # Hazard compatibility check
                suitable_hazards = donor_stock.get("suitable_hazards", [])
                if suitable_hazards and dest_hazard not in suitable_hazards:
                    # Resource not suitable for this disaster hazard
                    continue

                # Geographic distance & travel time
                dist = haversine_distance(donor_reg["lat"], donor_reg["lon"], dest_reg["lat"], dest_reg["lon"])
                travel_time = round(dist / self.avg_convoy_speed_kmh, 1)

                if travel_time > max_travel_time_hours:
                    continue

                unit_cost = round(dist * donor_stock["cost_km"], 2)

                candidate_transfers.append({
                    "orig_id": orig_id,
                    "dest_id": dest_id,
                    "res_type": res_type,
                    "distance_km": dist,
                    "travel_time_hrs": travel_time,
                    "unit_cost": unit_cost,
                    "donor_spareable": donor_stock["spareable"],
                    "demand_qty": demand_qty
                })

        # Initialize PuLP Problem
        prob = pulp.LpProblem("ClimateShield_Emergency_Allocation", pulp.LpMinimize)

        # Decision Variables
        # X[i, j, k]: integer transfer quantity
        X = {}
        for c in candidate_transfers:
            var_key = (c["orig_id"], c["dest_id"], c["res_type"])
            X[var_key] = pulp.LpVariable(
                f"X_{c['orig_id']}_{c['dest_id']}_{c['res_type'].replace(' ', '_')}",
                lowBound=0,
                upBound=min(c["donor_spareable"], c["demand_qty"]),
                cat=pulp.LpInteger
            )

        # S[j, k]: unmet demand slack variable
        S = {}
        for d in active_demands:
            slack_key = (d["region_id"], d["resource_type"])
            # upper bound is the demand itself
            S[slack_key] = pulp.LpVariable(
                f"S_{d['region_id']}_{d['resource_type'].replace(' ', '_')}",
                lowBound=0,
                upBound=d["demand_quantity"],
                cat=pulp.LpInteger
            )

        # Objective Function
        w_unmet = weights.get("unmet_demand_penalty", 100.0)
        w_cost = weights.get("transport_cost_weight", 0.05)
        w_delay = weights.get("deployment_delay_weight", 2.0)
        w_move = weights.get("excessive_movement_weight", 5.0)

        # 1. Unmet demand penalty weighted by urgency
        obj_unmet = []
        for d in active_demands:
            slack_key = (d["region_id"], d["resource_type"])
            prio = d.get("priority_level", "Standard")
            prio_mult = 2.0 if prio == "Critical" else (1.5 if prio == "High" else 1.0)
            obj_unmet.append(w_unmet * prio_mult * S[slack_key])

        # 2. Movement cost, delay, and excessive movement penalty
        obj_transfers = []
        for c in candidate_transfers:
            var_key = (c["orig_id"], c["dest_id"], c["res_type"])
            x_var = X[var_key]
            cost_term = w_cost * c["unit_cost"] * x_var
            delay_term = w_delay * c["travel_time_hrs"] * x_var
            move_term = w_move * x_var
            obj_transfers.append(cost_term + delay_term + move_term)

        prob += pulp.lpSum(obj_unmet) + pulp.lpSum(obj_transfers)

        # Constraints:
        # Constraint 1: Donor reserve & available capacity
        # For each donor i and resource k, sum_j X_{i,j,k} <= Spareable_{i,k}
        donor_res_groups = {}
        for c in candidate_transfers:
            donor_key = (c["orig_id"], c["res_type"])
            donor_res_groups.setdefault(donor_key, []).append((c["dest_id"], c["donor_spareable"]))

        for (orig_id, res_type), dest_list in donor_res_groups.items():
            spareable = dest_list[0][1]
            prob += pulp.lpSum([X[(orig_id, dest_id, res_type)] for dest_id, _ in dest_list]) <= spareable, f"DonorCap_{orig_id}_{res_type.replace(' ', '_')}"

        # Constraint 2: Demand satisfaction
        # For each recipient j and resource k: LocalSupply + IncomingTransfers + S_{j,k} >= Demand_{j,k}
        for d in active_demands:
            dest_id = d["region_id"]
            res_type = d["resource_type"]
            demand_qty = d["demand_quantity"]
            slack_key = (dest_id, res_type)

            incoming_vars = [
                X[(c["orig_id"], dest_id, res_type)]
                for c in candidate_transfers
                if c["dest_id"] == dest_id and c["res_type"] == res_type
            ]

            # Direct local available inventory (up to demand)
            local_avail = stock_map.get((dest_id, res_type), {}).get("available", 0)
            local_usable = min(local_avail, demand_qty)

            prob += local_usable + pulp.lpSum(incoming_vars) + S[slack_key] >= demand_qty, f"DemandSat_{dest_id}_{res_type.replace(' ', '_')}"

        # Constraint 3: Budget Constraint
        cost_expressions = [c["unit_cost"] * X[(c["orig_id"], c["dest_id"], c["res_type"])] for c in candidate_transfers]
        if cost_expressions:
            prob += pulp.lpSum(cost_expressions) <= budget_limit_inr, "Total_Transport_Budget"

        # Solve model
        solver = pulp.PULP_CBC_CMD(msg=0, timeLimit=10)
        solver_status_code = prob.solve(solver)
        status_str = pulp.LpStatus[solver_status_code]

        diagnostic_notes = []
        if status_str not in ["Optimal", "Feasible"]:
            diagnostic_notes.append(f"Solver returned status '{status_str}'. Constraints may be too restrictive (e.g. tight budget or blocked routes).")
            # If infeasible due to budget, explain
            return {
                "run_id": str(uuid.uuid4()),
                "status": "Infeasible",
                "timestamp": datetime.now().isoformat(),
                "impact": {
                    "baseline_unmet_demand": total_baseline_unmet_units,
                    "optimized_unmet_demand": total_baseline_unmet_units,
                    "unmet_demand_reduction_pct": 0.0,
                    "baseline_coverage_pct": round(max(0.0, (total_demand_units - total_baseline_unmet_units) / total_demand_units * 100), 1),
                    "optimized_coverage_pct": round(max(0.0, (total_demand_units - total_baseline_unmet_units) / total_demand_units * 100), 1),
                    "total_movement_cost_inr": 0.0,
                    "average_deployment_time_hours": 0.0,
                    "total_units_moved": 0,
                    "resource_utilization_pct": 0.0,
                    "critical_shortage_regions": len(active_demands),
                    "budget_utilized_pct": 0.0
                },
                "transfers": [],
                "diagnostic_notes": diagnostic_notes + ["Budget or connectivity constraints prevented feasible reallocation. Try increasing budget or relaxing travel time limits."]
            }

        # Extract transfer recommendations
        transfers = []
        total_movement_cost = 0.0
        total_travel_time_weighted = 0.0
        total_units_moved = 0

        for c in candidate_transfers:
            var_key = (c["orig_id"], c["dest_id"], c["res_type"])
            qty = int(round(pulp.value(X[var_key]) or 0))
            if qty > 0:
                cost = round(qty * c["unit_cost"], 2)
                orig_reg = region_map[c["orig_id"]]
                dest_reg = region_map[c["dest_id"]]
                dest_risk = risk_assessments.get(c["dest_id"], {})
                hazard_name = dest_risk.get("dominant_hazard", "Floods")
                
                donor_info = stock_map.get((c["orig_id"], c["res_type"]), {})

                limiting_factors = []
                if donor_info["spareable"] == qty:
                    limiting_factors.append("Donor minimum reserve limit reached")
                if c["travel_time_hrs"] >= max_travel_time_hours * 0.8:
                    limiting_factors.append("Near maximum travel time threshold")

                # Generate explainable text
                explanation = (
                    f"Transfer {qty} {c['res_type']} from {orig_reg['name']} ({orig_reg['state']}) to "
                    f"{dest_reg['name']} ({dest_reg['state']}) because {dest_reg['name']} faces critical {hazard_name} risk "
                    f"with unmet demand. {orig_reg['name']} maintains its required reserve of {donor_info['reserve']} units. "
                    f"Deployment distance is {c['distance_km']} km (~{c['travel_time_hrs']} hrs arrival)."
                )

                transfers.append({
                    "id": str(uuid.uuid4()),
                    "resource_type": c["res_type"],
                    "origin_id": c["orig_id"],
                    "origin_name": orig_reg["name"],
                    "destination_id": c["dest_id"],
                    "destination_name": dest_reg["name"],
                    "quantity": qty,
                    "distance_km": c["distance_km"],
                    "estimated_travel_time_hours": c["travel_time_hrs"],
                    "movement_cost_inr": cost,
                    "priority": "Critical" if dest_risk.get("overall_risk", 0) >= 70 else "High",
                    "explanation": explanation,
                    "destination_hazard": hazard_name,
                    "destination_demand": c["demand_qty"],
                    "origin_surplus": donor_info["spareable"],
                    "origin_reserve": donor_info["reserve"],
                    "limiting_constraints": limiting_factors
                })

                total_movement_cost += cost
                total_travel_time_weighted += c["travel_time_hrs"] * qty
                total_units_moved += qty

        # Calculate final optimized unmet demand from slack variables
        optimized_unmet_units = 0
        critical_shortage_count = 0
        for d in active_demands:
            slack_key = (d["region_id"], d["resource_type"])
            slack_val = int(round(pulp.value(S[slack_key]) or 0))
            optimized_unmet_units += slack_val
            if slack_val > 0 and d.get("priority_level") in ["Critical", "High"]:
                critical_shortage_count += 1

        # Calculate Impact Metrics
        avg_travel_time = round(total_travel_time_weighted / max(1, total_units_moved), 1) if total_units_moved > 0 else 0.0
        
        # Coverage Percentage = Satisfied Demand / Total Demand * 100
        baseline_sat = max(0, total_demand_units - total_baseline_unmet_units)
        baseline_cov_pct = round((baseline_sat / total_demand_units) * 100, 1) if total_demand_units > 0 else 100.0
        
        opt_sat = max(0, total_demand_units - optimized_unmet_units)
        opt_cov_pct = round((opt_sat / total_demand_units) * 100, 1) if total_demand_units > 0 else 100.0

        # Unmet demand reduction = (Baseline Unmet - Opt Unmet) / Baseline Unmet * 100
        if total_baseline_unmet_units > 0:
            reduction_pct = round(((total_baseline_unmet_units - optimized_unmet_units) / total_baseline_unmet_units) * 100, 1)
        else:
            reduction_pct = 100.0

        budget_util_pct = round((total_movement_cost / max(1.0, budget_limit_inr)) * 100, 1)

        # Resource utilization: total deployed & moved / total available stock across system
        total_system_avail = sum(inv["available_quantity"] for inv in inventories)
        res_util_pct = round(((total_units_moved + baseline_sat) / max(1, total_system_avail)) * 100, 1)

        diagnostic_notes.append(f"PuLP CBC Solver completed in status '{status_str}'.")
        diagnostic_notes.append(f"Identified {len(transfers)} optimal inter-district resource transfers moving {total_units_moved} emergency units.")
        if total_movement_cost > budget_limit_inr * 0.9:
            diagnostic_notes.append("Warning: Transport budget utilization exceeded 90%.")

        return {
            "run_id": str(uuid.uuid4()),
            "status": status_str,
            "timestamp": datetime.now().isoformat(),
            "impact": {
                "baseline_unmet_demand": total_baseline_unmet_units,
                "optimized_unmet_demand": optimized_unmet_units,
                "unmet_demand_reduction_pct": max(0.0, reduction_pct),
                "baseline_coverage_pct": baseline_cov_pct,
                "optimized_coverage_pct": opt_cov_pct,
                "total_movement_cost_inr": round(total_movement_cost, 2),
                "average_deployment_time_hours": avg_travel_time,
                "total_units_moved": total_units_moved,
                "resource_utilization_pct": min(100.0, res_util_pct),
                "critical_shortage_regions": critical_shortage_count,
                "budget_utilized_pct": min(100.0, budget_util_pct)
            },
            "transfers": transfers,
            "diagnostic_notes": diagnostic_notes
        }
