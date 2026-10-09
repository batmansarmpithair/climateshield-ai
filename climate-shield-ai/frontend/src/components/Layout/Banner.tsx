import React, { useState } from "react";
import { Info, X, Radio, ShieldAlert } from "lucide-react";

interface BannerProps {
  isLiveWeatherMode?: boolean;
}

export const SyntheticDataBanner: React.FC<BannerProps> = ({ isLiveWeatherMode = false }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className={`border-b px-4 py-2 text-xs flex items-center justify-between transition-colors ${
      isLiveWeatherMode
        ? "bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-900 border-zinc-700/60 text-zinc-200"
        : "bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-zinc-800 text-zinc-300"
    }`}>
      <div className="flex items-center gap-2">
        {isLiveWeatherMode ? (
          <Radio className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
        ) : (
          <Info className="w-4 h-4 text-zinc-300 shrink-0" />
        )}
        <span>
          {isLiveWeatherMode ? (
            <>
              <strong className="text-emerald-400">Live Meteorological Stream:</strong> Telemetry ingested from Open-Meteo High-Resolution WMO Models &amp; IMD 4-Color Warning Matrices. Regional risks recalculated dynamically. Resource dispatches require explicit commander sign-off.
            </>
          ) : (
            <>
              <strong className="text-zinc-100">Notice:</strong> ClimateShield AI utilizes a reproducible synthetic climate dataset across all 28 Indian states &amp; 8 Union Territories for decision-support prototyping. Do not interpret as live IMD/NDMA meteorological bulletins.
            </>
          )}
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
        title="Dismiss notice"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
