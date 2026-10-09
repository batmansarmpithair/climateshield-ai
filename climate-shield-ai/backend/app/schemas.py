from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class RegionSchema(BaseModel):
    id: str
    name: str
    state: str
    is_union_territory: bool = False
    latitude: float
    longitude: float
    population: int
    vulnerability_index: float  # 0.0 to 1.0
    infrastructure_resilience: float  # 0.0 to 1.0
    terrain_type: str = "Plains"

class ClimateObservationSchema(BaseModel):
    region_id: str
    date: str
    rainfall_mm: float
    temperature_c: float
    humidity_pct: float
    wind_speed_kmh: float
    flood_indicator: float
    heatwave_indicator: float
    drought_indicator: float
    cyclone_indicator: float
    calculated_risk: float

class ContributingFactors(BaseModel):
    hazard_intensity: float
    hazard_probability: float
    population_exposure: float
    regional_vulnerability: float
    infrastructure_deficit: float

class ForecastHorizon(BaseModel):
    hours_ahead: int
    predicted_risk: float
    confidence_lower: float
    confidence_upper: float
    dominant_hazard: str

class RiskAssessmentSchema(BaseModel):
    region_id: str
    region_name: str
    state: str
    latitude: float
    longitude: float
    flood_risk: float
    heatwave_risk: float
    drought_risk: float
    cyclone_risk: float
    overall_risk: float
    risk_category: str  # "Low" | "Moderate" | "High" | "Critical"
    dominant_hazard: str
    exposed_population: int
    uncertainty_margin: float
    contributing_factors: ContributingFactors
    forecasts: List[ForecastHorizon]
    recommended_actions: List[str]

class ResourceItemSchema(BaseModel):
    id: str
    region_id: str
    region_name: str
    resource_type: str
    total_quantity: int
    available_quantity: int
    deployed_quantity: int
    minimum_reserve: int
    unit_movement_cost_inr: float
    suitable_hazards: List[str]

class RegionalDemandSchema(BaseModel):
    id: str
    region_id: str
    region_name: str
    resource_type: str
    demand_quantity: int
    priority_level: str  # "Critical", "High", "Medium", "Standard"
    unmet_quantity: int = 0

class ProposedTransferSchema(BaseModel):
    id: str
    resource_type: str
    origin_id: str
    origin_name: str
    destination_id: str
    destination_name: str
    quantity: int
    distance_km: float
    estimated_travel_time_hours: float
    movement_cost_inr: float
    priority: str
    explanation: str
    destination_hazard: str
    destination_demand: int
    origin_surplus: int
    origin_reserve: int
    limiting_constraints: List[str] = []

class OptimizationWeights(BaseModel):
    unmet_demand_penalty: float = 100.0
    transport_cost_weight: float = 0.05
    deployment_delay_weight: float = 2.0
    excessive_movement_weight: float = 5.0
    residual_risk_weight: float = 10.0

class OptimizationRequestSchema(BaseModel):
    scenario_id: Optional[str] = None
    weights: OptimizationWeights = Field(default_factory=OptimizationWeights)
    budget_limit_inr: float = 5000000.0  # 50 Lakhs default
    max_travel_time_hours: float = 48.0
    reserve_buffer_pct: float = 0.0  # Extra safety buffer on minimum reserves
    blocked_routes: List[Dict[str, str]] = []  # List of {"origin_id": ..., "destination_id": ...}

class ImpactMetricsSchema(BaseModel):
    baseline_unmet_demand: int
    optimized_unmet_demand: int
    unmet_demand_reduction_pct: float
    baseline_coverage_pct: float
    optimized_coverage_pct: float
    total_movement_cost_inr: float
    average_deployment_time_hours: float
    total_units_moved: int
    resource_utilization_pct: float
    critical_shortage_regions: int
    budget_utilized_pct: float

class OptimizationResultSchema(BaseModel):
    run_id: str
    scenario_id: Optional[str] = None
    status: str  # "Optimal" | "Feasible" | "Infeasible" | "NoActionNeeded"
    timestamp: str
    impact: ImpactMetricsSchema
    transfers: List[ProposedTransferSchema]
    diagnostic_notes: List[str] = []

class PlanApprovalRequest(BaseModel):
    plan_id: str
    action: str  # "approve" | "reject"
    approved_by: str = "Emergency Commander"
    notes: Optional[str] = None

class PlanApprovalResponse(BaseModel):
    plan_id: str
    status: str  # "Approved" | "Rejected"
    message: str
    timestamp: str
    updated_transfers_count: int

class ScenarioConfigSchema(BaseModel):
    id: str
    name: str
    tagline: str
    description: str
    hazard_multipliers: Dict[str, float]  # e.g. {"Floods": 2.5, "Heatwaves": 1.0, ...}
    demand_multipliers: Dict[str, float]
    affected_regions: List[str]
    budget_inr: float
    notes: str
    is_preset: bool = True
