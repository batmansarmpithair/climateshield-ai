import React from "react";
import {
  RotateCcw,
  Sparkles,
  Wifi,
  WifiOff,
  Flame,
  CloudRain,
  Wind,
  Layers,
  ChevronDown,
  RefreshCw,
  Radio,
  AlertCircle,
  Clock,
  ShieldCheck,
  Check
} from "lucide-react";
import { ScenarioConfig, WeatherSummary } from "../../types";

interface TopbarProps {
  scenarios: ScenarioConfig[];
  currentScenarioId: string;
  onScenarioChange: (scenarioId: string) => void;
  onReset: () => void;
  isBackendConnected: boolean;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  isLoading?: boolean;
  // Weather integration props
  isLiveWeatherMode: boolean;
  onToggleLiveWeatherMode: () => void;
  weatherSummary: WeatherSummary | null;
  isWeatherRefreshing: boolean;
  onRefreshWeather: () => void;
  weatherError: string | null;
  onSyncLiveRisk?: () => void;
  isSyncingRisk?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  scenarios,
  currentScenarioId,
  onScenarioChange,
  onReset,
  isBackendConnected,
  isDemoMode,
  onToggleDemoMode,
  isLoading,
  isLiveWeatherMode,
  onToggleLiveWeatherMode,
  weatherSummary,
  isWeatherRefreshing,
  onRefreshWeather,
  weatherError,
  onSyncLiveRisk,
  isSyncingRisk
}) => {
  const currentScenario = scenarios.find((s) => s.id === currentScenarioId);

  // Live tick to keep "Just now" reactive every 5 seconds without waiting for 10 min refresh
  const [, setTick] = React.useState<number>(0);
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const getScenarioIcon = (id: string) => {
    switch (id) {
      case "assam-flood":
        return <CloudRain className="w-3.5 h-3.5 text-zinc-200" />;
      case "rajasthan-heatwave":
        return <Flame className="w-3.5 h-3.5 text-amber-400" />;
      case "gujarat-cyclone":
        return <Wind className="w-3.5 h-3.5 text-zinc-200" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-zinc-200" />;
    }
  };

  // Format last updated with live refresh reactivity
  const formatLastUpdated = (iso?: string) => {
    if (isWeatherRefreshing) return "Refreshing...";
    if (!iso) return "Just now";
    try {
      const dt = new Date(iso);
      const diffSeconds = Math.max(0, Math.floor((Date.now() - dt.getTime()) / 1000));
      if (diffSeconds < 60) return "Just now";
      const diffMinutes = Math.floor(diffSeconds / 60);
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (_) {
      return "Just now";
    }
  };

  const imdAlerts = weatherSummary?.imd_alerts_breakdown || {};
  const activeAlertsCount = (imdAlerts["Yellow"] || 0) + (imdAlerts["Orange"] || 0) + (imdAlerts["Red"] || 0);

  return (
    <header className="h-14 bg-[#111111] border-b border-zinc-800/80 px-4 flex items-center justify-between shrink-0 gap-3">
      {/* Left: Mode Switcher & Active Scenario / Live Indicator */}
      <div className="flex items-center gap-3">
        {/* Live Weather Mode Switcher Button */}
        <div className="flex items-center rounded-lg border border-zinc-700/80 bg-zinc-900/90 p-0.5">
          <button
            onClick={() => {
              if (isLiveWeatherMode) onToggleLiveWeatherMode();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              !isLiveWeatherMode
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
            title="Calibrated multi-hazard disaster simulation presets"
          >
            <Sparkles className="w-3 h-3 text-zinc-300" />
            <span className="hidden sm:inline">Scenario Mode</span>
          </button>

          <button
            onClick={() => {
              if (!isLiveWeatherMode) onToggleLiveWeatherMode();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              isLiveWeatherMode
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
            title="Real-time Open-Meteo & IMD Numerical Weather Feed"
          >
            <Radio className={`w-3 h-3 ${isLiveWeatherMode ? "text-emerald-400 animate-pulse" : "text-zinc-500"}`} />
            <span className="hidden sm:inline">Live Weather Feed</span>
            {isLiveWeatherMode && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
            )}
          </button>
        </div>

        {/* If in Scenario Mode: Active Disaster Scenario Selector */}
        {!isLiveWeatherMode ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={currentScenarioId}
                onChange={(e) => onScenarioChange(e.target.value)}
                disabled={isLoading}
                className="appearance-none bg-zinc-900 border border-zinc-700/80 rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-zinc-200 focus:outline-none focus:border-zinc-300 hover:border-zinc-600 transition-all cursor-pointer disabled:opacity-50"
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {currentScenario && (
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-300">
                {getScenarioIcon(currentScenario.id)}
                <span className="truncate max-w-xs">{currentScenario.tagline}</span>
              </div>
            )}
          </div>
        ) : (
          /* If in Live Weather Mode: Real-time Telemetry Status */
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-zinc-700/60 text-xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                LIVE
              </span>
              <span className="text-zinc-400 hidden md:inline">|</span>
              <span className="text-zinc-300 font-mono text-[11px]">
                82 Districts Monitored
              </span>
              {weatherSummary && (
                <span className="text-zinc-400 hidden lg:inline font-mono text-[11px]">
                  (Avg: {weatherSummary.national_avg_temperature_c}°C · Rain: {weatherSummary.national_total_rainfall_mm}mm)
                </span>
              )}
            </div>

            {onSyncLiveRisk && (
              <button
                onClick={onSyncLiveRisk}
                disabled={isSyncingRisk || isWeatherRefreshing}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-xs font-semibold text-white transition-all cursor-pointer disabled:opacity-50"
                title="Recalculate all regional risk scores using live weather telemetry"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingRisk ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Sync Live Risk</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right: Telemetry Controls & Status */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Weather Last-Updated & Refresh Button */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-[11px] text-zinc-400 hidden md:inline">
            {isLiveWeatherMode ? "Weather:" : "Telemetry:"}
          </span>
          <span className="text-[11px] font-mono text-zinc-300">
            {formatLastUpdated(weatherSummary?.last_updated_at)}
          </span>

          <button
            onClick={onRefreshWeather}
            disabled={isWeatherRefreshing}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer disabled:opacity-50 ml-1"
            title="Manual refresh from Open-Meteo & IMD APIs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isWeatherRefreshing ? "animate-spin text-zinc-200" : ""}`} />
          </button>
        </div>

        {/* IMD Alert Level Badge (if active alerts exist) */}
        {activeAlertsCount > 0 && (
          <div
            className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-950/40 border border-amber-700/50 text-[11px] text-amber-300"
            title={`Active IMD Warnings: ${imdAlerts["Red"] || 0} Red, ${imdAlerts["Orange"] || 0} Orange, ${imdAlerts["Yellow"] || 0} Yellow`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>IMD: {activeAlertsCount} Alerts</span>
          </div>
        )}

        {/* Stale, Live Stream, or Error Notification */}
        {weatherError ? (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-950/60 border border-red-800/80 text-[11px] text-red-300" title={weatherError}>
            <AlertCircle className="w-3 h-3 text-red-400" />
            <span className="hidden sm:inline truncate max-w-[120px]">API Issue</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-950/50 border border-emerald-700/60 text-[11px] text-emerald-300 shadow-sm" title="Real-time meteorological telemetry pipeline active">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold tracking-wide">Live Stream</span>
          </div>
        )}

        {/* Reset Scenario Baseline Button */}
        <button
          onClick={() => {
            if (window.confirm("Reset all scenario adjustments, inventory, and plans back to baseline?")) {
              onReset();
            }
          }}
          disabled={isLoading}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700/60 hover:border-red-700/60 hover:text-red-300 text-zinc-300 text-xs transition-all cursor-pointer disabled:opacity-50"
          title="Reset database to baseline scenario"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Reset</span>
        </button>

        {/* Backend Connectivity Status */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800">
          {isBackendConnected ? (
            <div className="flex items-center gap-1 text-[11px] text-emerald-400" title="FastAPI backend connected on port 8001">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-red-400" title="Backend disconnected">
              <WifiOff className="w-3.5 h-3.5 text-red-400 animate-bounce" />
              <span className="hidden sm:inline">Offline</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
