import React, { useState, useEffect } from "react";
import { RiskAssessment, ClimateObservation, LiveWeatherObservation, IMDStatusReport } from "../types";
import { RiskBadge } from "../components/Common/RiskBadge";
import { api } from "../api/client";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CloudRain,
  Flame,
  Wind,
  Droplets,
  Search,
  Filter,
  CheckCircle,
  TrendingUp,
  Shield,
  Layers,
  Info,
  Radio,
  FileText,
  ExternalLink,
  ShieldAlert,
  Thermometer,
  X,
  Gauge
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";

interface RiskIntelligencePageProps {
  assessments: RiskAssessment[];
  selectedRegionId?: string;
  onSelectRegion: (id: string) => void;
  liveWeatherMap?: Record<string, LiveWeatherObservation>;
  isLiveWeatherMode?: boolean;
}

export const RiskIntelligencePage: React.FC<RiskIntelligencePageProps> = ({
  assessments,
  selectedRegionId,
  onSelectRegion,
  liveWeatherMap,
  isLiveWeatherMode
}) => {
  const [selectedHazard, setSelectedHazard] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [historyObservations, setHistoryObservations] = useState<ClimateObservation[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyDays, setHistoryDays] = useState<number>(30);

  const [showIMDModal, setShowIMDModal] = useState<boolean>(false);
  const [imdReport, setImdReport] = useState<IMDStatusReport | null>(null);
  const [loadingIMDReport, setLoadingIMDReport] = useState<boolean>(false);

  const fetchIMDReport = async () => {
    setShowIMDModal(true);
    if (imdReport) return;
    setLoadingIMDReport(true);
    try {
      const rep = await api.getIMDStatus();
      setImdReport(rep);
    } catch (err) {
      console.error("Failed to load IMD status:", err);
    } finally {
      setLoadingIMDReport(false);
    }
  };

  // Default selected region
  const activeRegion = assessments.find((a) => a.region_id === selectedRegionId) || assessments[0];

  // Fetch historical observations when activeRegion changes
  useEffect(() => {
    if (!activeRegion) return;
    setIsLoadingHistory(true);
    api
      .getRegionHistory(activeRegion.region_id, historyDays)
      .then((data) => setHistoryObservations(data))
      .catch((err) => console.error("Error fetching history:", err))
      .finally(() => setIsLoadingHistory(false));
  }, [activeRegion?.region_id, historyDays]);

  const filteredAssessments = assessments.filter((a) => {
    const matchesHazard = selectedHazard === "All" || a.dominant_hazard === selectedHazard;
    const matchesCat = selectedCategory === "All" || a.risk_category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      a.region_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.state.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesHazard && matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 bg-[#0a0a0a] text-zinc-100">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-zinc-200" />
            National Climate Risk Intelligence & AI Forecasting
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Standardized 0–100 composite peril scores across India with 24h, 48h, and 72h time-series regression horizons.
          </p>
        </div>

        {/* Header Actions: Hazard Pill Selector & IMD Diagnostics */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchIMDReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-xs text-zinc-200 transition-colors cursor-pointer"
            title="Inspect Official IMD Endpoints, Access Status, and Color-Code Warning Matrix"
          >
            <FileText className="w-3.5 h-3.5 text-zinc-300" />
            <span className="font-medium">IMD Diagnostics</span>
          </button>

          {/* Hazard Pill Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
            {["All", "Floods", "Heatwaves", "Droughts", "Cyclones"].map((h) => (
              <button
                key={h}
                onClick={() => setSelectedHazard(h)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                  selectedHazard === h
                    ? "bg-zinc-300 text-zinc-950 font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Districts Master List (Left) + Detailed Deep-Dive (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Filterable Districts List (5 cols) */}
        <div className="lg:col-span-5 bg-zinc-900/80 rounded-xl border border-zinc-800 p-4 shadow-lg flex flex-col h-[750px]">
          <div className="space-y-3 mb-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search district or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-300"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400">Severity:</span>
              {["All", "Critical", "High", "Moderate", "Low"].map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                    selectedCategory === c
                      ? "bg-zinc-700 text-white font-bold"
                      : "text-zinc-400 hover:text-white bg-zinc-950 border border-zinc-800"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredAssessments.map((a) => {
              const isSelected = activeRegion?.region_id === a.region_id;
              const obs = liveWeatherMap?.[a.region_id];
              return (
                <div
                  key={a.region_id}
                  onClick={() => onSelectRegion(a.region_id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-zinc-800/90 border-zinc-300 shadow-md"
                      : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="text-xs font-bold text-white">
                        {a.region_name}
                      </span>
                      <span className="text-[11px] text-zinc-400 ml-1.5">
                        {a.state}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {obs && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
                          obs.imd_alert_level === "Red"
                            ? "bg-red-950 text-red-300 border border-red-800"
                            : obs.imd_alert_level === "Orange"
                            ? "bg-orange-950 text-orange-300 border border-orange-800"
                            : obs.imd_alert_level === "Yellow"
                            ? "bg-yellow-950 text-yellow-300 border border-yellow-800"
                            : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        }`}>
                          IMD: {obs.imd_alert_level}
                        </span>
                      )}
                      <RiskBadge score={a.overall_risk} category={a.risk_category} size="sm" />
                    </div>
                  </div>

                  {/* Hazard Breakdown Mini-Bars & Live Metrics */}
                  <div className="grid grid-cols-4 gap-1 text-[10px] text-zinc-400 font-mono mt-2">
                    <div>
                      Flood: <span className="text-zinc-200">{a.flood_risk.toFixed(0)}</span>
                    </div>
                    <div>
                      Heat: <span className="text-amber-400">{a.heatwave_risk.toFixed(0)}</span>
                    </div>
                    <div>
                      Drought: <span className="text-orange-400">{a.drought_risk.toFixed(0)}</span>
                    </div>
                    <div>
                      Cyclone: <span className="text-zinc-200">{a.cyclone_risk.toFixed(0)}</span>
                    </div>
                  </div>

                  {obs && (
                    <div className="mt-2 pt-1.5 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400">
                      <span>Temp: <strong className="text-zinc-200">{obs.temperature_c.toFixed(1)}°C</strong></span>
                      <span>Rain: <strong className="text-zinc-200">{obs.precipitation_mm.toFixed(1)}mm</strong></span>
                      <span>Wind: <strong className="text-zinc-200">{obs.wind_speed_kmh.toFixed(1)}km/h</strong></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active District In-Depth Intelligence Card (7 cols) */}
        {activeRegion && (
          <div className="lg:col-span-7 space-y-5">
            {/* Header Card */}
            <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                <div>
                  <div className="text-xs text-zinc-200 font-mono uppercase tracking-wider">
                    District Risk Profile • {activeRegion.region_id}
                  </div>
                  <h3 className="text-xl font-bold text-white mt-0.5">
                    {activeRegion.region_name},{" "}
                    <span className="text-zinc-400 font-medium text-base">
                      {activeRegion.state}
                    </span>
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <RiskBadge
                    score={activeRegion.overall_risk}
                    category={activeRegion.risk_category}
                    size="lg"
                  />
                  <div className="text-right text-[11px] text-zinc-400">
                    Uncertainty: ±{activeRegion.uncertainty_margin}%
                  </div>
                </div>
              </div>

              {/* Live Surface Telemetry & IMD Advisory (Open-Meteo & IMD Warning Matrix) */}
              {(() => {
                const activeWeather = liveWeatherMap?.[activeRegion.region_id];
                if (!activeWeather) return null;
                return (
                  <div className="mt-4 p-3.5 rounded-lg bg-zinc-950/90 border border-zinc-800">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Real-Time Meteorological Telemetry
                        </span>
                        <span className="text-[11px] text-zinc-300 font-medium">
                          • {activeWeather.weather_condition}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                        activeWeather.imd_alert_level === "Red"
                          ? "bg-red-950 text-red-300 border border-red-800"
                          : activeWeather.imd_alert_level === "Orange"
                          ? "bg-orange-950 text-orange-300 border border-orange-800"
                          : activeWeather.imd_alert_level === "Yellow"
                          ? "bg-yellow-950 text-yellow-300 border border-yellow-800"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      }`}>
                        IMD 4-Tier Warning: {activeWeather.imd_alert_level.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
                        <div className="flex items-center gap-1 text-zinc-400 text-[10px] mb-1">
                          <Thermometer className="w-3 h-3 text-orange-400" />
                          <span>Surface Temp</span>
                        </div>
                        <div className="text-base font-bold font-mono text-zinc-100">{activeWeather.temperature_c.toFixed(1)}°C</div>
                      </div>
                      <div className="p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
                        <div className="flex items-center gap-1 text-zinc-400 text-[10px] mb-1">
                          <CloudRain className="w-3 h-3 text-zinc-300" />
                          <span>24h Precipitation</span>
                        </div>
                        <div className="text-base font-bold font-mono text-zinc-100">{activeWeather.precipitation_mm.toFixed(1)} mm</div>
                      </div>
                      <div className="p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
                        <div className="flex items-center gap-1 text-zinc-400 text-[10px] mb-1">
                          <Droplets className="w-3 h-3 text-zinc-300" />
                          <span>Relative Humidity</span>
                        </div>
                        <div className="text-base font-bold font-mono text-zinc-100">{activeWeather.relative_humidity_pct.toFixed(0)}%</div>
                      </div>
                      <div className="p-2.5 rounded bg-zinc-900/80 border border-zinc-800">
                        <div className="flex items-center gap-1 text-zinc-400 text-[10px] mb-1">
                          <Wind className="w-3 h-3 text-zinc-300" />
                          <span>Sustained Wind</span>
                        </div>
                        <div className="text-base font-bold font-mono text-zinc-100">{activeWeather.wind_speed_kmh.toFixed(1)} km/h</div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex flex-wrap items-center justify-between text-[11px] text-zinc-400 gap-2">
                      <span>
                        Source: <strong className="text-zinc-200">{activeWeather.source}</strong> • WMO Code <strong className="text-zinc-200">{activeWeather.weather_code}</strong> • Status: <span className="text-emerald-400">Verified by FastAPI Ingestion Engine</span>
                      </span>
                      <button
                        onClick={fetchIMDReport}
                        className="text-zinc-200 hover:text-white underline text-[11px] flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <span>Inspect IMD Protocol Report</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 4 Hazard Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/50">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-100 mb-1">
                    <CloudRain className="w-3.5 h-3.5" />
                    <span>Flood Risk</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-zinc-200">
                    {activeRegion.flood_risk.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-zinc-200/80 mt-0.5">
                    {activeRegion.flood_risk >= 75 ? "Critical Inundation" : activeRegion.flood_risk >= 50 ? "High Threat" : "Moderate / Safe"}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/50">
                  <div className="flex items-center gap-1.5 text-xs text-amber-300 mb-1">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Heatwave Risk</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-200">
                    {activeRegion.heatwave_risk.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-amber-400/80 mt-0.5">
                    {activeRegion.heatwave_risk >= 75 ? "Extreme Thermal" : activeRegion.heatwave_risk >= 50 ? "Severe Alert" : "Normal Temp"}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-orange-950/30 border border-orange-900/50">
                  <div className="flex items-center gap-1.5 text-xs text-orange-300 mb-1">
                    <Droplets className="w-3.5 h-3.5" />
                    <span>Drought Risk</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-orange-200">
                    {activeRegion.drought_risk.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-orange-400/80 mt-0.5">
                    {activeRegion.drought_risk >= 75 ? "Acute Deficit" : activeRegion.drought_risk >= 50 ? "High Stress" : "Stable Supply"}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-900/30 border border-zinc-800/50">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-100 mb-1">
                    <Wind className="w-3.5 h-3.5" />
                    <span>Cyclone Risk</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-zinc-200">
                    {activeRegion.cyclone_risk.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-zinc-200/80 mt-0.5">
                    {activeRegion.cyclone_risk >= 75 ? "Severe Gale/Squall" : activeRegion.cyclone_risk >= 50 ? "High Surge" : "Low Wind"}
                  </div>
                </div>
              </div>

              {/* Contributing Factors Breakdown */}
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Contributing Normalized Drivers
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800">
                    <span className="text-zinc-400 text-[10px] block">Hazard Intensity</span>
                    <strong className="text-zinc-100 font-mono">
                      {(activeRegion.contributing_factors.hazard_intensity * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800">
                    <span className="text-zinc-400 text-[10px] block">Hazard Probability</span>
                    <strong className="text-zinc-100 font-mono">
                      {(activeRegion.contributing_factors.hazard_probability * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800">
                    <span className="text-zinc-400 text-[10px] block">Pop. Exposure</span>
                    <strong className="text-zinc-100 font-mono">
                      {(activeRegion.contributing_factors.population_exposure * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800">
                    <span className="text-zinc-400 text-[10px] block">Vulnerability</span>
                    <strong className="text-amber-300 font-mono">
                      {(activeRegion.contributing_factors.regional_vulnerability * 100).toFixed(0)}%
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800">
                    <span className="text-zinc-400 text-[10px] block">Infra Deficit</span>
                    <strong className="text-red-300 font-mono">
                      {(activeRegion.contributing_factors.infrastructure_deficit * 100).toFixed(0)}%
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Multi-Horizon Forecasts (24h, 48h, 72h) */}
            <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-zinc-200" />
                  AI Machine Learning Time-Series Forecasts
                </h4>
                <span className="text-[11px] text-zinc-400 font-mono">
                  Ridge AR Model • Held-out Validation
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {activeRegion.forecasts.map((f) => (
                  <div
                    key={f.hours_ahead}
                    className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-center"
                  >
                    <span className="text-xs font-semibold text-zinc-400">
                      +{f.hours_ahead} Hours Horizon
                    </span>
                    <div className="text-2xl font-bold font-mono text-zinc-100 my-1">
                      {f.predicted_risk.toFixed(1)}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      Confidence Interval: [{f.confidence_lower.toFixed(1)} - {f.confidence_upper.toFixed(1)}]
                    </div>
                    <div className="mt-2 inline-block">
                      <RiskBadge score={f.predicted_risk} size="sm" showScore={false} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 90-Day Historical Trend Chart */}
            <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-200" />
                  <h4 className="text-sm font-bold text-white">
                    Historical Weather Observations & Risk Evolution
                  </h4>
                </div>

                <div className="flex items-center gap-1 text-xs">
                  {[14, 30, 60, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => setHistoryDays(d)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                        historyDays === d
                          ? "bg-zinc-300 text-zinc-950 font-bold"
                          : "text-zinc-400 hover:text-white bg-zinc-950 border border-zinc-800"
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-56 w-full">
                {isLoadingHistory ? (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                    Loading telemetry observations...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyObservations} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#737373", fontSize: 10 }}
                        tickFormatter={(d) => d.slice(5)}
                      />
                      <YAxis tick={{ fill: "#737373", fontSize: 10 }} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#171717",
                          borderColor: "#404040",
                          fontSize: 12
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                      <Line
                        type="monotone"
                        dataKey="calculated_risk"
                        name="Composite Risk Score"
                        stroke="#f5f5f5"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="rainfall_mm"
                        name="Rainfall (mm)"
                        stroke="#a3a3a3"
                        strokeWidth={1.5}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="temperature_c"
                        name="Temperature (°C)"
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Recommended Preparedness Actions */}
            <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5 shadow-lg">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Recommended Preparedness Directives
              </h4>
              <ul className="space-y-1.5 text-xs text-zinc-300">
                {activeRegion.recommended_actions.map((act, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-zinc-200 font-bold">•</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* IMD Platform Investigation & Diagnostics Modal */}
      {showIMDModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-5 text-zinc-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-zinc-300" />
                <h3 className="font-bold text-white text-base">
                  Official IMD Platform Investigation &amp; Diagnostics
                </h3>
              </div>
              <button
                onClick={() => setShowIMDModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingIMDReport ? (
              <div className="py-12 text-center text-zinc-400 text-sm">
                Probing India Meteorological Department (IMD) endpoints...
              </div>
            ) : imdReport ? (
              <div className="space-y-4 mt-4 text-xs">
                {/* Executive Summary */}
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <h4 className="font-semibold text-white mb-1">Investigation Summary</h4>
                  <p className="text-zinc-300 leading-relaxed">
                    {imdReport.investigation_summary}
                  </p>
                </div>

                {/* Status & Configuration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="text-zinc-400 block mb-0.5">Agency</span>
                    <strong className="text-zinc-100">{imdReport.agency}</strong>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="text-zinc-400 block mb-0.5">Access Status</span>
                    <strong className="text-emerald-400">{imdReport.status}</strong>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      Token configured: {imdReport.api_key_configured ? "Yes (NDSAP Token)" : "No (Public Fallback / Zero-auth NWP Active)"}
                    </div>
                  </div>
                </div>

                {/* Tested Endpoints */}
                <div>
                  <h4 className="font-semibold text-white mb-2">Tested IMD Infrastructure Endpoints</h4>
                  <div className="space-y-2">
                    {imdReport.endpoints?.map((ep, idx) => (
                      <div key={idx} className="p-2.5 rounded bg-zinc-950 border border-zinc-800 flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-zinc-100">{ep.endpoint_name}</div>
                          <div className="font-mono text-[10px] text-zinc-400">{ep.url}</div>
                          <div className="text-[11px] text-zinc-400 mt-1">{ep.purpose}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                          ep.reachable ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-zinc-800 text-zinc-300"
                        }`}>
                          {ep.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4-Color Warning Matrix */}
                <div>
                  <h4 className="font-semibold text-white mb-2">Official IMD 4-Color Warning Matrix</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(imdReport.imd_color_code_system || {}).map(([level, desc]) => (
                      <div key={level} className={`p-2.5 rounded border text-xs ${
                        level === "Red"
                          ? "bg-red-950/40 border-red-800 text-red-200"
                          : level === "Orange"
                          ? "bg-orange-950/40 border-orange-800 text-orange-200"
                          : level === "Yellow"
                          ? "bg-yellow-950/40 border-yellow-800 text-yellow-200"
                          : "bg-emerald-950/40 border-emerald-800 text-emerald-200"
                      }`}>
                        <div className="font-bold text-sm mb-0.5">{level.toUpperCase()}</div>
                        <div className="text-[11px] leading-tight opacity-90">{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400">
                  ClimateShield AI maintains complete data provenance: observed weather is fetched via Open-Meteo WMO numerical weather prediction, classified against IMD warning criteria, and passed through the composite risk pipeline. Synthetic scenarios remain clearly segregated.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
