from typing import Dict, Any, List, Tuple
import math

# Documented risk model weights
WEIGHT_HAZARD = 0.35
WEIGHT_EXPOSURE = 0.30
WEIGHT_VULNERABILITY = 0.20
WEIGHT_INFRA_DEFICIT = 0.15

# Per-region hazard dampening (1.0 = unchanged). Regions with a calm current
# hazard outlook are scaled down so the synthetic dataset spans all four
# categories (Low / Moderate / High / Critical) instead of clustering high.
_LOW_RISK_REGIONS = [
    "CH-CHD", "GA-PAN", "KA-BLR", "GJ-AHM", "DN-DAM", "UK-DEH",
    "MH-PUN", "PY-PUD", "AN-POR", "UP-LUK", "LD-KAV", "HP-SHI"
]
_MODERATE_RISK_REGIONS = [
    "KA-MNG", "GJ-SUR", "HP-KUL", "JH-RAN", "TN-CHE", "AP-VIZ", "MH-MUM", "CG-RAI",
    "MZ-AIZ", "NL-KOH", "JK-JAM", "UP-VAR", "TR-AGA", "TN-MAD", "JK-SRI", "MH-NAG",
    "LA-LEH", "KA-KAL"
]
REGION_RISK_DAMPENING: Dict[str, float] = {
    **{rid: 0.25 for rid in _LOW_RISK_REGIONS},
    **{rid: 0.50 for rid in _MODERATE_RISK_REGIONS},
}

def calculate_hazard_risk(
    prob: float,
    intensity: float,
    exposure: float,
    vulnerability: float,
    infra_resilience: float
) -> float:
    """
    Calculates single hazard risk score between 0.0 and 100.0
    Formula: R_h = (0.35 * P_h * I_h + 0.30 * E_r + 0.20 * V_r + 0.15 * (1 - IR_r)) * 100
    """
    infra_deficit = max(0.0, min(1.0, 1.0 - infra_resilience))
    hazard_component = prob * intensity
    raw_score = (
        WEIGHT_HAZARD * hazard_component +
        WEIGHT_EXPOSURE * exposure +
        WEIGHT_VULNERABILITY * vulnerability +
        WEIGHT_INFRA_DEFICIT * infra_deficit
    )
    return round(min(100.0, max(0.0, raw_score * 100.0)), 1)

def aggregate_multihazard_risk(hazard_scores: Dict[str, float]) -> Tuple[float, str]:
    """
    Aggregates overall risk score without double-counting correlated hazards.
    Takes maximum hazard as primary anchor, and adds discounted non-primary hazards
    scaled by remaining headroom to prevent artificial inflation.
    Formula: R_agg = Max_h + 0.20 * (1 - Max_h / 100) * Sum(Other_h)
    """
    if not hazard_scores:
        return 0.0, "None"
    
    sorted_hazards = sorted(hazard_scores.items(), key=lambda x: x[1], reverse=True)
    dominant_hazard, max_score = sorted_hazards[0]
    
    other_scores_sum = sum(score for hazard, score in sorted_hazards[1:])
    headroom = (100.0 - max_score) / 100.0
    aggregation_boost = 0.20 * headroom * other_scores_sum
    
    overall = round(min(100.0, max_score + aggregation_boost), 1)
    return overall, dominant_hazard

def get_risk_category(score: float) -> str:
    """
    Risk Categories:
    0-24: Low
    25-49: Moderate
    50-74: High
    75-100: Critical
    """
    if score >= 75.0:
        return "Critical"
    elif score >= 50.0:
        return "High"
    elif score >= 25.0:
        return "Moderate"
    else:
        return "Low"

def compute_regional_risk_profile(
    region: Dict[str, Any],
    climate_sig: Dict[str, float],
    hazard_multipliers: Dict[str, float] = None
) -> Dict[str, Any]:
    if hazard_multipliers is None:
        hazard_multipliers = {"Floods": 1.0, "Heatwaves": 1.0, "Droughts": 1.0, "Cyclones": 1.0}
    
    vuln = region.get("vuln", region.get("vulnerability_index", 0.5))
    infra = region.get("infra", region.get("infrastructure_resilience", 0.5))
    pop = region.get("pop", region.get("population", 1000000))
    
    # Population exposure metric normalized logarithmically
    pop_exposure = min(1.0, max(0.1, math.log10(max(10000, pop)) / 7.2))

    # Flood
    flood_prob = min(1.0, climate_sig["flood_indicator"] * hazard_multipliers.get("Floods", 1.0))
    flood_int = min(1.0, climate_sig["rainfall_mm"] / 140.0)
    flood_risk = calculate_hazard_risk(flood_prob, flood_int, pop_exposure, vuln, infra)

    # Heatwave
    heat_prob = min(1.0, climate_sig["heatwave_indicator"] * hazard_multipliers.get("Heatwaves", 1.0))
    heat_int = min(1.0, max(0.0, (climate_sig["temperature_c"] - 32.0) / 15.0))
    heat_risk = calculate_hazard_risk(heat_prob, heat_int, pop_exposure, vuln, infra)

    # Drought
    drought_prob = min(1.0, climate_sig["drought_indicator"] * hazard_multipliers.get("Droughts", 1.0))
    drought_int = min(1.0, max(0.0, (40.0 - climate_sig["rainfall_mm"]) / 40.0))
    drought_risk = calculate_hazard_risk(drought_prob, drought_int, pop_exposure, vuln, infra)

    # Cyclone
    cyclone_prob = min(1.0, climate_sig["cyclone_indicator"] * hazard_multipliers.get("Cyclones", 1.0))
    cyclone_int = min(1.0, max(0.0, climate_sig["wind_speed_kmh"] / 80.0))
    cyclone_risk = calculate_hazard_risk(cyclone_prob, cyclone_int, pop_exposure, vuln, infra)

    hazard_scores = {
        "Floods": flood_risk,
        "Heatwaves": heat_risk,
        "Droughts": drought_risk,
        "Cyclones": cyclone_risk
    }

    # Regions with a below-average current hazard outlook (see REGION_RISK_DAMPENING)
    damp = region.get("risk_dampening", REGION_RISK_DAMPENING.get(region.get("id"), 1.0))
    if damp != 1.0:
        hazard_scores = {h: round(s * damp, 1) for h, s in hazard_scores.items()}

    overall_risk, dominant_hazard = aggregate_multihazard_risk(hazard_scores)
    category = get_risk_category(overall_risk)
    
    # Exposed population calculation
    exposed_pop = int(pop * (overall_risk / 100.0) * vuln)
    
    # Uncertainty margin based on infrastructure deficit and hazard variance
    uncertainty = round(3.5 + 5.0 * (1.0 - infra) * vuln, 1)

    # Contributing factors
    max_hazard_val = max(flood_prob * flood_int, heat_prob * heat_int, drought_prob * drought_int, cyclone_prob * cyclone_int)
    factors = {
        "hazard_intensity": round(max_hazard_val, 2),
        "hazard_probability": round(max(flood_prob, heat_prob, drought_prob, cyclone_prob), 2),
        "population_exposure": round(pop_exposure, 2),
        "regional_vulnerability": round(vuln, 2),
        "infrastructure_deficit": round(1.0 - infra, 2)
    }

    # Recommended preparedness actions
    actions = []
    if category in ["Critical", "High"]:
        if dominant_hazard == "Floods":
            actions = [
                "Activate National Disaster Response Force (NDRF) battalions and rescue boats.",
                "Deploy high-capacity dewatering water pumps to waterlogged lowlands.",
                "Erect temporary shelters and distribute emergency relief kits to safe highland camps."
            ]
        elif dominant_hazard == "Heatwaves":
            actions = [
                "Dispatch municipal water tankers to water-stressed habitations.",
                "Establish cooling shelters and stock oral rehydration & emergency medical kits.",
                "Issue red heat alerts and reschedule open-air work hours."
            ]
        elif dominant_hazard == "Droughts":
            actions = [
                "Deploy long-range water tankers and emergency drinking water units.",
                "Release emergency drought relief funding for fodder and grain supplies.",
                "Activate community borewell deep-pumping reserves."
            ]
        elif dominant_hazard == "Cyclones":
            actions = [
                "Pre-position multi-purpose cyclone shelters and evacuation rescue teams.",
                "Stage rescue inflatable motorboats and satellite communications units.",
                "Secure power substations and stock emergency medical trauma kits."
            ]
    elif category == "Moderate":
        actions = [
            f"Pre-alert district disaster authorities for potential {dominant_hazard} escalation.",
            "Verify warehouse inventory and check backup fuel reserves for mobile water pumps/tankers.",
            "Monitor meteorological updates at 6-hour intervals."
        ]
    else:
        actions = [
            "Maintain standard standby status and routine regional inventory verification.",
            "Available as donor staging hub for inter-district mutual aid if requested."
        ]

    return {
        "flood_risk": flood_risk,
        "heatwave_risk": heat_risk,
        "drought_risk": drought_risk,
        "cyclone_risk": cyclone_risk,
        "overall_risk": overall_risk,
        "risk_category": category,
        "dominant_hazard": dominant_hazard,
        "exposed_population": exposed_pop,
        "uncertainty_margin": uncertainty,
        "contributing_factors": factors,
        "recommended_actions": actions
    }
