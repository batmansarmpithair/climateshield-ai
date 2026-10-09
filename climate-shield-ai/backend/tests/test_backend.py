import unittest
import json
import math
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.data_generator import (
    INDIAN_REGIONS_MASTER,
    RESOURCE_CATEGORIES,
    haversine_distance,
    get_hazard_climate_signature,
    generate_historical_time_series
)
from app.risk_engine import (
    calculate_hazard_risk,
    aggregate_multihazard_risk,
    get_risk_category,
    compute_regional_risk_profile
)
from app.ml_forecasting import TimeSeriesRiskForecaster
from app.optimizer import ResourceOptimizer
from app.impact_analyzer import calculate_impact_comparison
from app.scenarios import DEFAULT_SCENARIOS, get_scenario_by_id

class TestClimateShieldBackend(unittest.TestCase):

    def test_indian_regions_coverage(self):
        """Verify master region data has comprehensive state & UT representation and valid coordinates."""
        self.assertGreaterEqual(len(INDIAN_REGIONS_MASTER), 36)
        states = set(r["state"] for r in INDIAN_REGIONS_MASTER)
        # Should cover all 28 states and major UTs
        self.assertGreaterEqual(len(states), 28)

        for r in INDIAN_REGIONS_MASTER:
            # Latitudes of India span ~8°N to ~37°N
            self.assertTrue(8.0 <= r["lat"] <= 38.0, f"Invalid latitude {r['lat']} for {r['name']}")
            # Longitudes span ~68°E to ~97°E
            self.assertTrue(68.0 <= r["lon"] <= 98.0, f"Invalid longitude {r['lon']} for {r['name']}")
            self.assertGreater(r["pop"], 1000)
            self.assertTrue(0.0 <= r["vuln"] <= 1.0)
            self.assertTrue(0.0 <= r["infra"] <= 1.0)

    def test_haversine_distance(self):
        """Test geographic distance between Delhi and Mumbai (~1150-1200 km)."""
        delhi = next(r for r in INDIAN_REGIONS_MASTER if "Delhi" in r["name"])
        mumbai = next(r for r in INDIAN_REGIONS_MASTER if "Mumbai" in r["name"])
        dist = haversine_distance(delhi["lat"], delhi["lon"], mumbai["lat"], mumbai["lon"])
        self.assertTrue(1100 <= dist <= 1250, f"Expected Delhi-Mumbai dist ~1150-1200 km, got {dist}")

    def test_risk_calculation_bounds_and_categories(self):
        """Verify risk formulas strictly adhere to [0.0, 100.0] and correct categories."""
        # Extreme minimum
        min_risk = calculate_hazard_risk(0.0, 0.0, 0.0, 0.0, 1.0)
        self.assertEqual(min_risk, 0.0)
        self.assertEqual(get_risk_category(min_risk), "Low")

        # Extreme maximum
        max_risk = calculate_hazard_risk(1.0, 1.0, 1.0, 1.0, 0.0)
        self.assertEqual(max_risk, 100.0)
        self.assertEqual(get_risk_category(max_risk), "Critical")

        # Multi-hazard aggregation does not exceed 100 even with all hazards at 95
        high_hazards = {"Floods": 90.0, "Heatwaves": 85.0, "Droughts": 80.0, "Cyclones": 75.0}
        agg_score, dom = aggregate_multihazard_risk(high_hazards)
        self.assertEqual(dom, "Floods")
        self.assertTrue(90.0 <= agg_score <= 100.0)

    def test_time_series_forecaster_metrics(self):
        """Verify time-series forecaster computes valid R2, MAE, and generates 24h, 48h, 72h forecasts."""
        region = INDIAN_REGIONS_MASTER[0]
        history = generate_historical_time_series(region, days=90)
        self.assertEqual(len(history), 90)

        forecaster = TimeSeriesRiskForecaster(l2_alpha=1.0)
        metrics = forecaster.train_and_validate(history)
        self.assertIn("r2", metrics)
        self.assertIn("mae", metrics)
        self.assertIn("rmse", metrics)
        self.assertTrue(metrics["mae"] >= 0.0)

        forecasts = forecaster.predict_horizons(history, current_risk=72.5, dominant_hazard="Floods")
        self.assertEqual(len(forecasts), 3)
        self.assertEqual([f["hours_ahead"] for f in forecasts], [24, 48, 72])
        for f in forecasts:
            self.assertTrue(0.0 <= f["predicted_risk"] <= 100.0)
            self.assertTrue(f["confidence_lower"] <= f["predicted_risk"] <= f["confidence_upper"])

    def test_optimization_solver_with_donor_reserves(self):
        """Test PuLP optimization allocates resources while strictly respecting minimum reserves."""
        optimizer = ResourceOptimizer()

        test_regions = [
            {"id": "R1", "name": "Donor Region", "state": "State A", "lat": 26.0, "lon": 85.0, "vuln": 0.5, "infra": 0.7, "pop": 2000000},
            {"id": "R2", "name": "Affected Region", "state": "State B", "lat": 26.5, "lon": 86.0, "vuln": 0.8, "infra": 0.4, "pop": 1500000}
        ]

        # Donor has 50 pumps, reserve is 20 -> can spare at most 30
        inventories = [
            {
                "id": "INV_1", "region_id": "R1", "resource_type": "Water pumps",
                "total_quantity": 50, "available_quantity": 50, "deployed_quantity": 0,
                "minimum_reserve": 20, "unit_movement_cost_inr": 15.0, "suitable_hazards": ["Floods"]
            },
            {
                "id": "INV_2", "region_id": "R2", "resource_type": "Water pumps",
                "total_quantity": 5, "available_quantity": 5, "deployed_quantity": 0,
                "minimum_reserve": 2, "unit_movement_cost_inr": 15.0, "suitable_hazards": ["Floods"]
            }
        ]

        # Demand in R2 is 40 pumps
        demands = [
            {"id": "DEM_1", "region_id": "R2", "resource_type": "Water pumps", "demand_quantity": 40, "priority_level": "Critical"}
        ]

        risk_assessments = {
            "R1": {"dominant_hazard": "Floods", "overall_risk": 20.0, "risk_category": "Low"},
            "R2": {"dominant_hazard": "Floods", "overall_risk": 85.0, "risk_category": "Critical"}
        }

        res = optimizer.optimize(
            regions=test_regions,
            inventories=inventories,
            demands=demands,
            risk_assessments=risk_assessments,
            budget_limit_inr=500000.0
        )

        self.assertIn(res["status"], ["Optimal", "Feasible"])
        transfers = res["transfers"]
        self.assertEqual(len(transfers), 1)
        transfer = transfers[0]
        # Should transfer exactly 30 (the spareable amount = 50 - 20)
        self.assertEqual(transfer["quantity"], 30)
        self.assertEqual(transfer["origin_id"], "R1")
        self.assertEqual(transfer["destination_id"], "R2")
        # Remaining unmet in R2 should be 40 - (5 local + 30 transferred) = 5
        self.assertEqual(res["impact"]["optimized_unmet_demand"], 5)
        self.assertGreater(res["impact"]["unmet_demand_reduction_pct"], 0.0)

    def test_zero_denominator_impact_metrics(self):
        """Test impact analysis zero-division safety."""
        impact = calculate_impact_comparison(
            total_demand=0,
            baseline_unmet=0,
            optimized_unmet=0,
            movement_cost=0.0,
            total_units_moved=0,
            avg_travel_time=0.0,
            total_system_capacity=0,
            critical_demands_total=0,
            critical_demands_unmet_opt=0
        )
        self.assertEqual(impact["baseline"]["coverage_percentage"], 100.0)
        self.assertEqual(impact["optimized"]["coverage_percentage"], 100.0)
        self.assertEqual(impact["differential"]["unmet_demand_reduction_percentage"], 100.0)

if __name__ == "__main__":
    unittest.main()
