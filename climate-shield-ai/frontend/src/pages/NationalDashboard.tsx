import React from "react";
import {
  RiskAssessment,
  RiskSummary,
  ResourceSummary,
  OptimizationResult,
  ProposedTransfer,
  LiveWeatherObservation,
  WeatherSummary
} from "../types";
import { StatCard } from "../components/Common/StatCard";
import { IndiaRiskMap } from "../components/Map/IndiaRiskMap";
import { RiskBadge } from "../components/Common/RiskBadge";
import {
  Activity,
  AlertTriangle,
  Boxes,
  Truck,
  IndianRupee,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  MapPin,
  Radio,
  Thermometer,
  CloudRain,
  RefreshCw
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface NationalDashboardProps {
  riskSummary: RiskSummary | null;
  resourceSummary: ResourceSummary | null;
  assessments: RiskAssessment[];
  latestOptimization: OptimizationResult | null;
  selectedRegionId?: string;
  onSelectRegion: (regionId: string) => void;
  onNavigatePage: (page: string) => void;
  activeHazardFilter: string;
  onHazardFilterChange: (hazard: string) => void;
  liveWeatherMap?: Record<string, LiveWeatherObservation>;
  weatherSummary?: WeatherSummary | null;
  isLiveWeatherMode?: boolean;
  onRefreshWeather?: () => void;
  isWeatherRefreshing?: boolean;
}

export const NationalDashboard: React.FC<NationalDashboardProps> = ({
  riskSummary,
  resourceSummary,
  assessments,
  latestOptimization,
  selectedRegionId,
  onSelectRegion,
  onNavigatePage,
  activeHazardFilter,
  onHazardFilterChange,
  liveWeatherMap,
  weatherSummary,
  isLiveWeatherMode,
  onRefreshWeather,
  isWeatherRefreshing
}) => {
  const impact = latestOptimization?.impact;
  const transfers = latestOptimization?.transfers || [];

  // Data for Category Demand vs Available Stock chart
  const chartData = resourceSummary?.categories.map((c) => ({
    name: c.resource_type.length > 12 ? c.resource_type.substring(0, 10) + ".." : c.resource_type,
    available: c.available_quantity,
    reserve: c.minimum_reserve
  })) || [];

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5 bg-[#0a0a0a] text-zinc-100">
      {/* Live Meteorological Telemetry Strip (Open-Meteo NWP & IMD Warnings) */}
      {weatherSummary && (
        <div className="bg-zinc-900/90 rounded-xl border border-zinc-800 p-3 shadow-lg flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-emerald-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Meteorological Stream
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {weatherSummary.total_districts_monitored} Districts Ingested
                </span>
                {isLiveWeatherMode && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Active Pipeline
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                Source: <span className="text-zinc-200">Open-Meteo NWP &amp; IMD Diagnostic Criteria</span> • Updated:{" "}
                <span className="font-mono text-zinc-300">
                  {weatherSummary.last_updated_at ? new Date(weatherSummary.last_updated_at).toLocaleTimeString() : "Just now"}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-zinc-400">Avg Temp:</span>
              <strong className="font-mono text-white">{weatherSummary.national_avg_temperature_c.toFixed(1)}°C</strong>
              <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
                (Peak: {weatherSummary.national_max_temperature_c.toFixed(1)}°C)
              </span>
            </div>

            <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-3">
              <CloudRain className="w-3.5 h-3.5 text-zinc-300" />
              <span className="text-zinc-400">Peak Rain:</span>
              <strong className="font-mono text-white">{weatherSummary.national_max_rainfall_mm.toFixed(1)} mm</strong>
            </div>

            {/* IMD Warning Counts */}
            <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-3">
              <span className="text-zinc-400">IMD Alerts:</span>
              {(weatherSummary.imd_alerts_breakdown?.Red || 0) > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-800">
                  {weatherSummary.imd_alerts_breakdown.Red} Red
                </span>
              )}
              {(weatherSummary.imd_alerts_breakdown?.Orange || 0) > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-950 text-orange-300 border border-orange-800">
                  {weatherSummary.imd_alerts_breakdown.Orange} Orange
                </span>
              )}
              {(weatherSummary.imd_alerts_breakdown?.Yellow || 0) > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-950 text-yellow-300 border border-yellow-800">
                  {weatherSummary.imd_alerts_breakdown.Yellow} Yellow
                </span>
              )}
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                {weatherSummary.imd_alerts_breakdown?.Green || 0} Green
              </span>
            </div>

            {onRefreshWeather && (
              <button
                onClick={onRefreshWeather}
                disabled={isWeatherRefreshing}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Force refresh live weather telemetry from Open-Meteo"
              >
                <RefreshCw className={`w-3 h-3 ${isWeatherRefreshing ? "animate-spin" : ""}`} />
                <span>{isWeatherRefreshing ? "Syncing..." : "Sync"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 6 Core Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Monitored Districts"
          value={riskSummary?.total_monitored || assessments.length}
          subValue="All 28 States & 8 UTs"
          icon={Activity}
          variant="cyan"
        />

        <StatCard
          label="High/Critical Risk"
          value={riskSummary?.high_or_critical_count || 0}
          subValue={`${riskSummary?.critical_count || 0} Critical Emergency`}
          icon={AlertTriangle}
          variant={riskSummary?.critical_count ? "critical" : "warning"}
        />

        <StatCard
          label="Available Stock"
          value={resourceSummary?.grand_available?.toLocaleString() || "0"}
          subValue="Ready For Deployment"
          icon={Boxes}
          variant="emerald"
        />

        <StatCard
          label="Unmet Demand"
          value={impact?.optimized_unmet_demand?.toLocaleString() || "0"}
          subValue={`Reduced by ${impact?.unmet_demand_reduction_pct?.toFixed(1) || 0}%`}
          trend={impact?.unmet_demand_reduction_pct ? "down" : "neutral"}
          trendText={impact?.unmet_demand_reduction_pct ? "Optimized via PuLP" : "Static Allocation"}
          icon={ShieldAlert}
          variant={impact?.optimized_unmet_demand ? "warning" : "default"}
        />

        <StatCard
          label="Proposed Convoys"
          value={transfers.length}
          subValue={`${impact?.total_units_moved?.toLocaleString() || 0} units moved`}
          icon={Truck}
          variant="cyan"
        />

        <StatCard
          label="Est. Movement Cost"
          value={`₹${((impact?.total_movement_cost_inr || 0) / 100000).toFixed(1)}L`}
          subValue={`Avg ${impact?.average_deployment_time_hours || 0}h arrival`}
          icon={IndianRupee}
          variant="default"
        />
      </div>

      {/* Main Grid: Interactive Map + Highest Risk Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Interactive India Map (2 columns on large screens) */}
        <div className="lg:col-span-2 h-[560px] flex flex-col">
          <IndiaRiskMap
            assessments={assessments}
            transfers={transfers}
            selectedRegionId={selectedRegionId}
            onSelectRegion={onSelectRegion}
            activeHazardFilter={activeHazardFilter}
            onHazardFilterChange={onHazardFilterChange}
            liveWeatherMap={liveWeatherMap}
          />
        </div>

        {/* Highest-Risk Regions Leaderboard + Quick Actions */}
        <div className="flex flex-col space-y-4">
          {/* Top Risk Districts Card */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-4 shadow-lg flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-bold text-white">
                  Highest-Risk Districts
                </h3>
              </div>
              <button
                onClick={() => onNavigatePage("risk")}
                className="text-xs text-zinc-200 hover:text-zinc-100 flex items-center gap-1 cursor-pointer"
              >
                <span>Full Intelligence</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2 mt-3 flex-1 overflow-y-auto pr-1">
              {riskSummary?.top_risk_regions.map((tr) => (
                <div
                  key={tr.id}
                  onClick={() => onSelectRegion(tr.id)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    selectedRegionId === tr.id
                      ? "bg-zinc-800 border-zinc-300 shadow-sm"
                      : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                      <span>{tr.name}</span>
                      <span className="text-[10px] text-zinc-400 font-normal">
                        ({tr.state})
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Hazard:{" "}
                      <span className="text-zinc-100 font-medium">
                        {tr.dominant_hazard}
                      </span>{" "}
                      • Exposed:{" "}
                      <span className="font-mono text-zinc-300">
                        {(tr.exposed_population / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </div>
                  <RiskBadge score={tr.risk_score} category={tr.risk_category} size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Solver Status Card */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                PuLP MILP Optimization Status
              </h4>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                {latestOptimization?.status || "Ready"}
              </span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed mb-3">
              Satisfies <strong>{impact?.optimized_coverage_pct?.toFixed(1) || 0}%</strong> of emergency demand across disaster zones, reducing unmet shortages by{" "}
              <strong>{impact?.unmet_demand_reduction_pct?.toFixed(1) || 0}%</strong> compared to static allocation.
            </p>

            <button
              onClick={() => onNavigatePage("optimizer")}
              className="w-full py-2 rounded-lg bg-zinc-900/80 border border-zinc-700 text-zinc-100 hover:bg-zinc-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Inspect Reallocation Formulation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Resource Capacity Chart + Key Proposed Transfers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Resource Inventory vs Reserves */}
        <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-4 shadow-lg flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Boxes className="w-4 h-4 text-zinc-200" />
              National Stock: Available vs Mandatory Reserves
            </h3>
            <button
              onClick={() => onNavigatePage("resources")}
              className="text-xs text-zinc-200 hover:text-zinc-100 flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Stock</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#a3a3a3", fontSize: 10 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis tick={{ fill: "#a3a3a3", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#171717",
                    borderColor: "#404040",
                    fontSize: 12
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Bar dataKey="available" name="Available Stock" fill="#f5f5f5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reserve" name="Mandatory Reserve" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Proposed Transfers Preview */}
        <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-4 shadow-lg flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-zinc-200" />
              Priority Reallocations ({transfers.length} Total Routes)
            </h3>
            <button
              onClick={() => onNavigatePage("recommendations")}
              className="text-xs text-zinc-200 hover:text-zinc-100 flex items-center gap-1 cursor-pointer"
            >
              <span>Review Dispatches</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-56 pr-1">
            {transfers.slice(0, 4).map((t) => (
              <div
                key={t.id}
                className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs flex items-center justify-between"
              >
                <div className="flex-1 mr-2">
                  <div className="font-semibold text-zinc-200">
                    {t.quantity} {t.resource_type}
                  </div>
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                    <span>{t.origin_name}</span>
                    <ArrowRight className="w-3 h-3 text-zinc-200" />
                    <span className="text-zinc-100 font-medium">{t.destination_name}</span>
                  </div>
                </div>

                <div className="text-right font-mono text-[11px]">
                  <div className="text-zinc-300">{t.distance_km} km</div>
                  <div className="text-zinc-200">~{t.estimated_travel_time_hours} hrs</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
