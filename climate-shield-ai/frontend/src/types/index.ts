export interface Region {
  id: string;
  name: string;
  state: string;
  is_union_territory: boolean;
  latitude: float;
  longitude: float;
  population: number;
  vulnerability_index: number;
  infrastructure_resilience: number;
  terrain_type: string;
}

export type float = number;

export interface ContributingFactors {
  hazard_intensity: number;
  hazard_probability: number;
  population_exposure: number;
  regional_vulnerability: number;
  infrastructure_deficit: number;
}

export interface ForecastHorizon {
  hours_ahead: number;
  predicted_risk: number;
  confidence_lower: number;
  confidence_upper: number;
  dominant_hazard: string;
}

export interface RiskAssessment {
  region_id: string;
  region_name: string;
  state: string;
  latitude: number;
  longitude: number;
  population: number;
  flood_risk: number;
  heatwave_risk: number;
  drought_risk: number;
  cyclone_risk: number;
  overall_risk: number;
  risk_category: "Low" | "Moderate" | "High" | "Critical";
  dominant_hazard: "Floods" | "Heatwaves" | "Droughts" | "Cyclones";
  exposed_population: number;
  uncertainty_margin: number;
  contributing_factors: ContributingFactors;
  forecasts: ForecastHorizon[];
  recommended_actions: string[];
  updated_at: string;
}

export interface RiskSummary {
  total_monitored: number;
  critical_count: number;
  high_count: number;
  moderate_count: number;
  low_count: number;
  high_or_critical_count: number;
  average_risk: number;
  total_exposed_population: number;
  top_risk_regions: {
    id: string;
    name: string;
    state: string;
    risk_score: number;
    risk_category: string;
    dominant_hazard: string;
    exposed_population: number;
  }[];
}

export interface ResourceItem {
  id: string;
  region_id: string;
  region_name: string;
  state: string;
  resource_type: string;
  total_quantity: number;
  available_quantity: number;
  deployed_quantity: number;
  minimum_reserve: number;
  unit_movement_cost_inr: number;
  suitable_hazards: string[];
}

export interface ResourceSummary {
  grand_total: number;
  grand_available: number;
  grand_deployed: number;
  grand_reserve: number;
  categories: {
    resource_type: string;
    total_quantity: number;
    available_quantity: number;
    deployed_quantity: number;
    minimum_reserve: number;
    avg_unit_cost_km: number;
  }[];
}

export interface RegionalDemand {
  id: string;
  region_id: string;
  region_name: string;
  state: string;
  resource_type: string;
  demand_quantity: number;
  priority_level: "Critical" | "High" | "Medium" | "Standard";
  unmet_quantity: number;
  dominant_hazard: string;
  overall_risk: number;
}

export interface ProposedTransfer {
  id: string;
  resource_type: string;
  origin_id: string;
  origin_name: string;
  destination_id: string;
  destination_name: string;
  quantity: number;
  distance_km: number;
  estimated_travel_time_hours: number;
  movement_cost_inr: number;
  priority: "Critical" | "High" | "Standard";
  explanation: string;
  destination_hazard: string;
  destination_demand: number;
  origin_surplus: number;
  origin_reserve: number;
  limiting_constraints: string[];
}

export interface ImpactMetrics {
  baseline_unmet_demand: number;
  optimized_unmet_demand: number;
  unmet_demand_reduction_pct: number;
  baseline_coverage_pct: number;
  optimized_coverage_pct: number;
  total_movement_cost_inr: number;
  average_deployment_time_hours: number;
  total_units_moved: number;
  resource_utilization_pct: number;
  critical_shortage_regions: number;
  budget_utilized_pct: number;
}

export interface OptimizationResult {
  run_id: string;
  scenario_id?: string;
  status: string;
  timestamp: string;
  plan_status?: string;
  is_plan_approved?: boolean;
  impact: ImpactMetrics;
  transfers: ProposedTransfer[];
  diagnostic_notes: string[];
}

export interface ScenarioConfig {
  id: string;
  name: string;
  tagline: string;
  description: string;
  hazard_multipliers: Record<string, number>;
  demand_multipliers: Record<string, number>;
  affected_regions: string[];
  budget_inr: number;
  notes: string;
  is_preset: boolean;
}

export interface ClimateObservation {
  date: string;
  rainfall_mm: number;
  temperature_c: number;
  humidity_pct: number;
  wind_speed_kmh: number;
  flood_indicator: number;
  heatwave_indicator: number;
  drought_indicator: number;
  cyclone_indicator: number;
  calculated_risk: number;
}

export interface TransferHistoryRecord {
  id: number;
  plan_id: string;
  resource_type: string;
  origin_name: string;
  destination_name: string;
  quantity: number;
  movement_cost_inr: number;
  executed_at: string;
  executed_by: string;
}

export interface LiveWeatherObservation {
  region_id: string;
  region_name: string;
  state: string;
  latitude: number;
  longitude: number;
  temperature_c: number;
  relative_humidity_pct: number;
  precipitation_mm: number;
  wind_speed_kmh: number;
  weather_code: number;
  weather_condition: string;
  source: string;
  provenance: "live_observation" | "cached_observation" | "stale_cache" | "fallback_baseline";
  imd_alert_level: "Green" | "Yellow" | "Orange" | "Red";
  is_stale: boolean;
  fetched_at: string;
}

export interface LiveWeatherForecast {
  time: string;
  hours_ahead: number;
  temperature_c: number;
  precipitation_mm: number;
  wind_speed_kmh: number;
  humidity_pct?: number;
  source: string;
}

export interface WeatherSummary {
  total_districts_monitored: number;
  national_avg_temperature_c: number;
  national_max_temperature_c: number;
  national_total_rainfall_mm: number;
  national_max_rainfall_mm: number;
  national_avg_humidity_pct: number;
  national_avg_wind_speed_kmh: number;
  imd_alerts_breakdown: Record<string, number>;
  stale_cache_count: number;
  last_updated_at: string;
  data_source: string;
  provenance: string;
}

export interface WeatherOverviewResponse {
  summary: WeatherSummary;
  observations: LiveWeatherObservation[];
}

export interface DistrictLiveWeatherResponse extends LiveWeatherObservation {
  rain_mm: number;
  cache_expires_at: string;
  forecasts: LiveWeatherForecast[];
}

export interface IMDEndpointReport {
  endpoint_name: string;
  url: string;
  status: string;
  reachable: boolean;
  auth_required: boolean;
  purpose: string;
}

export interface IMDStatusReport {
  agency: string;
  status: string;
  api_key_configured: boolean;
  api_key_source: string;
  imd_color_code_system: Record<string, string>;
  investigation_summary: string;
  endpoints: IMDEndpointReport[];
  supported_meteorological_parameters: string[];
}

export interface WeatherSystemConfig {
  active_mode: "live" | "synthetic";
  auto_refresh_interval_sec: number;
  last_weather_risk_sync?: string;
  open_meteo_status: string;
  imd_status: string;
}
