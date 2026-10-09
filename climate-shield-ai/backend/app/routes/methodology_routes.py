from fastapi import APIRouter

router = APIRouter()

@router.get("/methodology")
def get_methodology():
    return {
        "title": "ClimateShield AI Methodology, Mathematical Formulation & Constraints",
        "version": "2.4.0",
        "sections": [
            {
                "title": "1. Multi-Hazard Risk Scoring Formulation",
                "summary": "Hazard-specific normalized scoring (0–100) integrated across four primary hazards: Floods, Heatwaves, Droughts, and Cyclones.",
                "formula": "R_h = (0.35 * (P_h * I_h) + 0.30 * E_r + 0.20 * V_r + 0.15 * (1 - IR_r)) * 100",
                "variables": [
                    {"name": "P_h", "desc": "Hazard Probability index [0.0 - 1.0] derived from meteorological signatures"},
                    {"name": "I_h", "desc": "Hazard Intensity index [0.0 - 1.0] scaled to threshold extremes"},
                    {"name": "E_r", "desc": "Logarithmically scaled regional population exposure [0.0 - 1.0]"},
                    {"name": "V_r", "desc": "Socio-economic vulnerability index [0.0 - 1.0]"},
                    {"name": "IR_r", "desc": "Infrastructure resilience rating [0.0 - 1.0]"}
                ],
                "aggregation_method": "R_agg = Max_h(R_h) + 0.20 * (1 - Max_h/100) * Sum_{h != max}(R_h). Avoids double counting while capturing compounded multi-hazard stress."
            },
            {
                "title": "2. AI/ML Time-Series Forecasting",
                "summary": "L2-regularized Ridge Autoregressive Model with rolling multi-day meteorological windows (rainfall, temperature, wind, humidity).",
                "features": [
                    "Lagged risk indicators: t-1, t-2, t-3",
                    "3-day rolling mean & standard deviation of calculated risk",
                    "3-day rolling precipitation, temperature, and wind extremes"
                ],
                "horizons": ["24 Hours (Immediate Rapid Deployment)", "48 Hours (Convoy Pre-positioning)", "72 Hours (Strategic Staging)"],
                "validation": {
                    "split_type": "Temporal Out-of-Sample Holdout (75% Train, 25% Test)",
                    "metrics_calculated": "R², Mean Absolute Error (MAE), Root Mean Squared Error (RMSE)",
                    "uncertainty_intervals": "Empirical Gaussian confidence bounds scaled by sqrt(t) horizon step"
                }
            },
            {
                "title": "3. Mixed-Integer Linear Programming (PuLP MILP)",
                "summary": "Authoritative optimization engine solving multi-commodity network flow with priority penalties and capacity limits.",
                "objective_function": "Min sum(w_unmet * p_k * S_{j,k}) + sum(w_cost * cost_{i,j} * X_{i,j,k}) + sum(w_delay * time_{i,j} * X_{i,j,k}) + sum(w_move * X_{i,j,k})",
                "hard_constraints": [
                    "Donor Minimum Reserve: sum_j X_{i,j,k} <= Available_{i,k} - MinReserve_{i,k}",
                    "Destination Demand Balance: LocalUsable_{j,k} + sum_i X_{i,j,k} + S_{j,k} >= Demand_{j,k}",
                    "Budget Ceiling: sum_{i,j,k} (Cost_{i,j,k} * X_{i,j,k}) <= Budget_Limit",
                    "Hazard-Resource Suitability: X_{i,j,k} = 0 if resource k not compatible with recipient hazard",
                    "Network Reachability: X_{i,j,k} = 0 if travel_time_{i,j} > MaxHours or route is blocked",
                    "Integrality: X_{i,j,k} in Integers >= 0, S_{j,k} in Integers >= 0"
                ]
            },
            {
                "title": "4. Comparative Impact Metrics",
                "metrics": [
                    {"name": "Demand Coverage (%)", "formula": "(Satisfied Demand / Total Demand) * 100"},
                    {"name": "Unmet Demand Reduction (%)", "formula": "((Baseline Unmet - Optimized Unmet) / Baseline Unmet) * 100"},
                    {"name": "Movement Cost", "formula": "Sum(Quantity * Distance * UnitCostPerKm)"},
                    {"name": "Average Deployment Time", "formula": "Sum(Quantity * TravelTime) / TotalUnitsMoved"},
                    {"name": "Resource Utilization Rate", "formula": "(Units Deployed & Moved / Total System Inventory) * 100"}
                ]
            },
            {
                "title": "5. Assumptions & Prototype Disclaimers",
                "items": [
                    "All Indian regional climate metrics and district records are reproducible synthetic profiles for research and decision-support demonstration.",
                    "Road travel times assume an average emergency relief convoy speed of 50 km/h over highway corridors.",
                    "No live satellite weather feeds or real-time GPS tracking data is claimed; all results are generated transparently by the local Python optimization backend."
                ]
            }
        ]
    }
