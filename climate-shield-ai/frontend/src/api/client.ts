import {
  Region,
  RiskAssessment,
  RiskSummary,
  ResourceItem,
  ResourceSummary,
  RegionalDemand,
  OptimizationResult,
  ScenarioConfig,
  ClimateObservation,
  TransferHistoryRecord
} from "../types";

const API_BASE = "/api";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson.detail) {
        errorMsg = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch (_) {}
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse<any>(res);
  },

  async getRegions(state?: string, search?: string): Promise<Region[]> {
    const params = new URLSearchParams();
    if (state) params.append("state", state);
    if (search) params.append("search", search);
    const res = await fetch(`${API_BASE}/regions?${params.toString()}`);
    return handleResponse<Region[]>(res);
  },

  async getRegionDetail(regionId: string) {
    const res = await fetch(`${API_BASE}/regions/${regionId}`);
    return handleResponse<{ region: Region; risk: any; resources: any[]; demands: any[] }>(res);
  },

  async getRegionHistory(regionId: string, days: number = 30): Promise<ClimateObservation[]> {
    const res = await fetch(`${API_BASE}/regions/${regionId}/history?days=${days}`);
    return handleResponse<ClimateObservation[]>(res);
  },

  async getRiskAssessments(hazard?: string, category?: string, minScore?: number): Promise<RiskAssessment[]> {
    const params = new URLSearchParams();
    if (hazard && hazard !== "All") params.append("hazard", hazard);
    if (category && category !== "All") params.append("category", category);
    if (minScore !== undefined) params.append("min_score", minScore.toString());
    const res = await fetch(`${API_BASE}/risk?${params.toString()}`);
    return handleResponse<RiskAssessment[]>(res);
  },

  async getRiskSummary(): Promise<RiskSummary> {
    const res = await fetch(`${API_BASE}/risk/summary`);
    return handleResponse<RiskSummary>(res);
  },

  async getResources(regionId?: string, resourceType?: string, search?: string): Promise<ResourceItem[]> {
    const params = new URLSearchParams();
    if (regionId) params.append("region_id", regionId);
    if (resourceType && resourceType !== "All") params.append("resource_type", resourceType);
    if (search) params.append("search", search);
    const res = await fetch(`${API_BASE}/resources?${params.toString()}`);
    return handleResponse<ResourceItem[]>(res);
  },

  async getResourceSummary(): Promise<ResourceSummary> {
    const res = await fetch(`${API_BASE}/resources/summary`);
    return handleResponse<ResourceSummary>(res);
  },

  async updateResource(payload: { region_id: string; resource_type: string; available_quantity?: number; minimum_reserve?: number }) {
    const res = await fetch(`${API_BASE}/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse<any>(res);
  },

  async getDemands(): Promise<RegionalDemand[]> {
    const res = await fetch(`${API_BASE}/demand`);
    return handleResponse<RegionalDemand[]>(res);
  },

  async getScenarios(): Promise<ScenarioConfig[]> {
    const res = await fetch(`${API_BASE}/scenarios`);
    return handleResponse<ScenarioConfig[]>(res);
  },

  async activateScenario(scenarioId: string) {
    const res = await fetch(`${API_BASE}/scenarios/${scenarioId}/activate`, {
      method: "POST"
    });
    return handleResponse<any>(res);
  },

  async simulateWhatIf(payload: {
    hazard_severity_multiplier: number;
    emergency_demand_multiplier: number;
    budget_limit_inr: number;
    reserve_buffer_pct: number;
    max_travel_time_hours: number;
    blocked_routes?: any[];
  }) {
    const res = await fetch(`${API_BASE}/scenarios/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse<any>(res);
  },

  async resetBaseline() {
    const res = await fetch(`${API_BASE}/scenarios/reset`, {
      method: "POST"
    });
    return handleResponse<any>(res);
  },

  async runOptimizer(payload?: {
    scenario_id?: string;
    weights?: {
      unmet_demand_penalty: number;
      transport_cost_weight: number;
      deployment_delay_weight: number;
      excessive_movement_weight: number;
      residual_risk_weight: number;
    };
    budget_limit_inr?: number;
    max_travel_time_hours?: number;
    reserve_buffer_pct?: number;
    blocked_routes?: any[];
  }): Promise<OptimizationResult> {
    const res = await fetch(`${API_BASE}/optimizer/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {})
    });
    return handleResponse<OptimizationResult>(res);
  },

  async getLatestOptimization(): Promise<OptimizationResult> {
    const res = await fetch(`${API_BASE}/optimizer/latest`);
    return handleResponse<OptimizationResult>(res);
  },

  async getLatestImpact() {
    const res = await fetch(`${API_BASE}/impact/latest`);
    return handleResponse<any>(res);
  },

  getImpactCsvUrl() {
    return `${API_BASE}/impact/export/csv`;
  },

  async getLatestPlan() {
    const res = await fetch(`${API_BASE}/plans/latest`);
    return handleResponse<any>(res);
  },

  async executePlanAction(planId: string, action: "approve" | "reject", approvedBy: string = "Emergency Commander", notes?: string) {
    const res = await fetch(`${API_BASE}/plans/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan_id: planId,
        action,
        approved_by: approvedBy,
        notes
      })
    });
    return handleResponse<any>(res);
  },

  async getTransfersHistory(): Promise<TransferHistoryRecord[]> {
    const res = await fetch(`${API_BASE}/plans/history`);
    return handleResponse<TransferHistoryRecord[]>(res);
  },

  async getMethodology() {
    const res = await fetch(`${API_BASE}/methodology`);
    return handleResponse<any>(res);
  },

  // Real-Time Weather & IMD Telemetry API
  async getLiveWeather(forceRefresh: boolean = false) {
    const res = await fetch(`${API_BASE}/weather/live?force_refresh=${forceRefresh}`);
    return handleResponse<any>(res);
  },

  async getDistrictLiveWeather(regionId: string, forceRefresh: boolean = false) {
    const res = await fetch(`${API_BASE}/weather/live/${regionId}?force_refresh=${forceRefresh}`);
    return handleResponse<any>(res);
  },

  async refreshLiveWeather(force: boolean = true) {
    const res = await fetch(`${API_BASE}/weather/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force })
    });
    return handleResponse<any>(res);
  },

  async getIMDStatus() {
    const res = await fetch(`${API_BASE}/weather/imd/status`);
    return handleResponse<any>(res);
  },

  async getWeatherConfig() {
    const res = await fetch(`${API_BASE}/weather/config`);
    return handleResponse<any>(res);
  },

  async updateWeatherConfig(payload: { mode?: "live" | "synthetic"; auto_refresh_interval_sec?: number }) {
    const res = await fetch(`${API_BASE}/weather/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse<any>(res);
  },

  async syncWeatherToRisk(force: boolean = false) {
    const res = await fetch(`${API_BASE}/weather/sync-risk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force })
    });
    return handleResponse<any>(res);
  }
};
