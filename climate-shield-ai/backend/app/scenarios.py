import json
from typing import Dict, List, Any, Optional

DEFAULT_SCENARIOS = [
    {
        "id": "assam-flood",
        "name": "Assam Flood Emergency",
        "tagline": "Brahmaputra Basin Monsoonal Inundation & Embankment Breach",
        "description": "Unprecedented monsoon rainfall (>220mm/24h) causes severe flooding across Kamrup, Cachar, Barpeta, and Dibrugarh. 4.2M people affected with critical waterlogging, cut-off villages, and washed-away bridges.",
        "hazard_multipliers": {
            "Floods": 2.8,
            "Heatwaves": 0.2,
            "Droughts": 0.1,
            "Cyclones": 0.8
        },
        "demand_multipliers": {
            "Water pumps": 3.5,
            "Rescue teams": 3.0,
            "Rescue boats": 4.0,
            "Temporary shelters": 3.2,
            "Relief supply kits": 2.5,
            "Emergency medical kits": 2.0,
            "Water tankers": 0.5,
            "Emergency funds": 2.5
        },
        "affected_regions": ["AS-KAM", "AS-CAC", "AS-BAR", "AS-DIB", "ML-SHI"],
        "budget_inr": 6500000.0,  # 65 Lakhs
        "notes": "Prioritize high-capacity dewatering pumps from neighboring West Bengal & Bihar depots. Rescue boats and NDRF teams urgently required.",
        "is_preset": True
    },
    {
        "id": "rajasthan-heatwave",
        "name": "Rajasthan Heatwave & Drought",
        "tagline": "Severe Thar Desert Thermal Anomaly & Groundwater Depletion",
        "description": "Sustained maximum temperatures exceeding 48.5°C across Barmer, Jodhpur, Bikaner, and Churu. Acute drinking water shortages, rural agricultural distress, and heatstroke casualties.",
        "hazard_multipliers": {
            "Floods": 0.1,
            "Heatwaves": 3.2,
            "Droughts": 3.0,
            "Cyclones": 0.2
        },
        "demand_multipliers": {
            "Water tankers": 4.5,
            "Emergency medical kits": 3.0,
            "Relief supply kits": 2.5,
            "Emergency funds": 3.0,
            "Water pumps": 0.2,
            "Rescue boats": 0.1,
            "Rescue teams": 0.5,
            "Temporary shelters": 1.5
        },
        "affected_regions": ["RJ-BAR", "RJ-JOD", "RJ-BIK", "RJ-CHU", "RJ-JAI"],
        "budget_inr": 5000000.0,  # 50 Lakhs
        "notes": "Emergency deployment of water tankers and electrolyte supplies. Surplus assets mobilized from northern plains depots.",
        "is_preset": True
    },
    {
        "id": "gujarat-cyclone",
        "name": "Gujarat Coastal Cyclone Preparation",
        "tagline": "Extremely Severe Cyclonic Storm Approaching Saurashtra & Kutch",
        "description": "Category-4 equivalent Arabian Sea cyclone generating sustained winds of 165 km/h, 4-meter tidal surges, and heavy squalls threatening coastal habitations in Kutch, Jamnagar, and Surat.",
        "hazard_multipliers": {
            "Floods": 2.2,
            "Heatwaves": 0.1,
            "Droughts": 0.1,
            "Cyclones": 3.8
        },
        "demand_multipliers": {
            "Rescue boats": 3.8,
            "Rescue teams": 3.5,
            "Temporary shelters": 3.0,
            "Emergency medical kits": 2.8,
            "Relief supply kits": 2.6,
            "Water pumps": 2.5,
            "Water tankers": 1.2,
            "Emergency funds": 2.8
        },
        "affected_regions": ["GJ-KUT", "GJ-JAM", "GJ-SUR", "DN-DAM"],
        "budget_inr": 7500000.0,  # 75 Lakhs
        "notes": "Pre-position evacuation assets, portable generator shelters, and medical trauma teams prior to storm landfall.",
        "is_preset": True
    },
    {
        "id": "monsoon-emergency",
        "name": "Multi-State Monsoon Emergency",
        "tagline": "Compounding Inter-Regional Deluges Across Eastern & Southern Belts",
        "description": "Simultaneous flash floods in Assam, embankment breaches in North Bihar (Katihar, Muzaffarpur), debris flows in Wayanad (Kerala), and coastal surges in Odisha create severe competition for national stockpiles.",
        "hazard_multipliers": {
            "Floods": 2.6,
            "Heatwaves": 0.4,
            "Droughts": 0.3,
            "Cyclones": 2.4
        },
        "demand_multipliers": {
            "Water pumps": 2.8,
            "Rescue teams": 2.9,
            "Rescue boats": 3.2,
            "Temporary shelters": 2.6,
            "Relief supply kits": 2.4,
            "Emergency medical kits": 2.5,
            "Water tankers": 1.0,
            "Emergency funds": 3.0
        },
        "affected_regions": ["AS-KAM", "BR-KAH", "KL-WAY", "OD-PUR", "WB-S24"],
        "budget_inr": 9000000.0,  # 90 Lakhs
        "notes": "Tests multi-objective allocation under extreme national scarcity. PuLP balances fairness, transit delays, and life-safety priority.",
        "is_preset": True
    }
]

def get_scenario_by_id(scenario_id: str) -> Optional[Dict[str, Any]]:
    for s in DEFAULT_SCENARIOS:
        if s["id"] == scenario_id:
            return s
    return None
