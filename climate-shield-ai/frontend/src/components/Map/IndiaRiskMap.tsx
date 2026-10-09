import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RiskAssessment, ProposedTransfer, LiveWeatherObservation } from "../../types";
import { RiskBadge } from "../Common/RiskBadge";
import {
  Play,
  Pause,
  RotateCcw,
  Layers,
  Search,
  Filter,
  Users,
  Box,
  Truck,
  ArrowRight,
  CloudRain,
  Wind,
  Droplets,
  Thermometer,
  ShieldAlert
} from "lucide-react";

interface IndiaRiskMapProps {
  assessments: RiskAssessment[];
  transfers: ProposedTransfer[];
  selectedRegionId?: string;
  onSelectRegion: (regionId: string) => void;
  activeHazardFilter?: string;
  onHazardFilterChange?: (hazard: string) => void;
  liveWeatherMap?: Record<string, LiveWeatherObservation>;
}

export const IndiaRiskMap: React.FC<IndiaRiskMapProps> = ({
  assessments,
  transfers,
  selectedRegionId,
  onSelectRegion,
  activeHazardFilter = "All",
  onHazardFilterChange,
  liveWeatherMap
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  const [forecastHorizon, setForecastHorizon] = useState<number>(0); // 0 = current, 24, 48, 72
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [isPlayingAnimation, setIsPlayingAnimation] = useState<boolean>(false);
  const [animProgress, setAnimProgress] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const animFrameRef = useRef<number | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on India [22.5, 82.0]
    const map = L.map(mapContainerRef.current, {
      center: [22.5, 82.0],
      zoom: 5,
      minZoom: 4,
      maxZoom: 9,
      attributionControl: false
    });

    // Dark Basemap tiles (CARTO now requires an API key, so use keyless OSM tiles
    // and darken them with a CSS filter via the "dark-tiles" class)
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      className: "dark-tiles"
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    const routesLayer = L.layerGroup().addTo(map);

    markersLayerRef.current = markersLayer;
    routesLayerRef.current = routesLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Filter assessments based on search and hazard
  const filteredAssessments = assessments.filter((a) => {
    const matchesHazard =
      activeHazardFilter === "All" || a.dominant_hazard === activeHazardFilter;
    const matchesSearch =
      !searchQuery ||
      a.region_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.state.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesHazard && matchesSearch;
  });

  // Render regional proportional circles on map
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;

    markersLayerRef.current.clearLayers();

    filteredAssessments.forEach((assessment) => {
      // Determine effective score based on forecast horizon
      let effectiveScore = assessment.overall_risk;
      if (forecastHorizon > 0 && assessment.forecasts) {
        const horizonObj = assessment.forecasts.find(
          (f) => f.hours_ahead === forecastHorizon
        );
        if (horizonObj) effectiveScore = horizonObj.predicted_risk;
      }

      // Risk color
      let fillColor = "#10b981"; // Low (emerald)
      if (effectiveScore >= 75) fillColor = "#ef4444"; // Critical (red)
      else if (effectiveScore >= 50) fillColor = "#f97316"; // High (orange)
      else if (effectiveScore >= 25) fillColor = "#f59e0b"; // Moderate (amber)

      const isSelected = selectedRegionId === assessment.region_id;
      const radius = isSelected ? 10 : Math.max(4, Math.min(9, effectiveScore / 10));

      const circle = L.circleMarker([assessment.latitude, assessment.longitude], {
        radius,
        fillColor,
        color: isSelected ? "#f5f5f5" : "#ffffff",
        weight: isSelected ? 3 : 1.2,
        opacity: 0.9,
        fillOpacity: 0.75
      });

      // Weather Telemetry (if available)
      const weather = liveWeatherMap?.[assessment.region_id];
      const weatherHtml = weather
        ? `<div style="margin-top: 5px; padding-top: 4px; border-top: 1px solid #3f3f46; font-size: 10px; color: #d4d4d8;">
            <div style="display:flex; justify-content:space-between; gap:8px;">
              <span>Temp: <strong style="color:#ffffff;">${weather.temperature_c.toFixed(1)}°C</strong></span>
              <span>Rain: <strong style="color:#ffffff;">${weather.precipitation_mm.toFixed(1)} mm</strong></span>
            </div>
            <div style="display:flex; justify-content:space-between; gap:8px; margin-top:2px;">
              <span>Wind: <strong style="color:#ffffff;">${weather.wind_speed_kmh.toFixed(1)} km/h</strong></span>
              <span style="font-weight:700; color:${
                weather.imd_alert_level === "Red"
                  ? "#ef4444"
                  : weather.imd_alert_level === "Orange"
                  ? "#f97316"
                  : weather.imd_alert_level === "Yellow"
                  ? "#f59e0b"
                  : "#10b981"
              };">IMD: ${weather.imd_alert_level.toUpperCase()}</span>
            </div>
          </div>`
        : "";

      // Hover tooltip
      circle.bindTooltip(
        `<div style="font-family: inherit; font-size: 11px; min-width: 140px;">
          <strong>${assessment.region_name}</strong> (${assessment.state})<br/>
          Hazard: <span style="color:${fillColor}; font-weight:600;">${assessment.dominant_hazard}</span><br/>
          Risk Score: <strong>${effectiveScore.toFixed(1)}</strong>
          ${weatherHtml}
        </div>`,
        { direction: "top", offset: [0, -6] }
      );

      circle.on("click", () => {
        onSelectRegion(assessment.region_id);
      });

      circle.addTo(markersLayerRef.current!);
    });
  }, [filteredAssessments, forecastHorizon, selectedRegionId, liveWeatherMap]);

  // Render transfer routes
  useEffect(() => {
    if (!routesLayerRef.current || !mapInstanceRef.current) return;

    routesLayerRef.current.clearLayers();

    if (!showRoutes || !transfers.length) return;

    // Create lookup for region coordinates
    const regionCoords: Record<string, [number, number]> = {};
    assessments.forEach((a) => {
      regionCoords[a.region_id] = [a.latitude, a.longitude];
    });

    transfers.forEach((t) => {
      const orig = regionCoords[t.origin_id];
      const dest = regionCoords[t.destination_id];

      if (!orig || !dest) return;

      // Draw curved or straight route
      const latlngs: L.LatLngExpression[] = [orig, dest];

      const polyline = L.polyline(latlngs, {
        color: "#e5e5e5",
        weight: Math.min(4, Math.max(1.5, t.quantity / 30)),
        opacity: 0.7,
        dashArray: "6, 6"
      });

      polyline.bindTooltip(
        `<div style="font-size: 11px;">
          <strong>Dispatch:</strong> ${t.quantity} ${t.resource_type}<br/>
          ${t.origin_name} &rarr; ${t.destination_name}<br/>
          Distance: ${t.distance_km} km (~${t.estimated_travel_time_hours} hrs)
        </div>`,
        { sticky: true }
      );

      polyline.addTo(routesLayerRef.current!);

      // If animation playing, render moving particle
      if (isPlayingAnimation) {
        const currentLat = orig[0] + (dest[0] - orig[0]) * animProgress;
        const currentLon = orig[1] + (dest[1] - orig[1]) * animProgress;

        const particle = L.circleMarker([currentLat, currentLon], {
          radius: 4,
          fillColor: "#f5f5f5",
          color: "#ffffff",
          weight: 1.5,
          fillOpacity: 1.0
        });
        particle.addTo(routesLayerRef.current!);
      }
    });
  }, [transfers, showRoutes, isPlayingAnimation, animProgress, assessments]);

  // Animation loop
  useEffect(() => {
    if (!isPlayingAnimation) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let start: number | null = null;
    const duration = 4000; // 4s loop

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = ((timestamp - start) % duration) / duration;
      setAnimProgress(progress);
      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlayingAnimation]);

  const selectedAssessment = assessments.find((a) => a.region_id === selectedRegionId);
  const incomingTransfers = transfers.filter((t) => t.destination_id === selectedRegionId);
  const outgoingTransfers = transfers.filter((t) => t.origin_id === selectedRegionId);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0a0a0a] rounded-xl overflow-hidden border border-zinc-800 shadow-xl">
      {/* Top Map Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Hazard Filters and Search */}
        <div className="flex items-center gap-2 pointer-events-auto bg-zinc-900/90 backdrop-blur-md p-1.5 rounded-lg border border-zinc-800 shadow-lg">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Indian district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-950/80 border border-zinc-800 rounded pl-7 pr-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-300 w-36 sm:w-44"
            />
          </div>

          {onHazardFilterChange && (
            <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
              {["All", "Floods", "Heatwaves", "Droughts", "Cyclones"].map((h) => (
                <button
                  key={h}
                  onClick={() => onHazardFilterChange(h)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                    activeHazardFilter === h
                      ? "bg-zinc-300 text-zinc-950 font-bold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Forecast Horizon & Route Controls */}
        <div className="flex items-center gap-2 pointer-events-auto bg-zinc-900/90 backdrop-blur-md p-1.5 rounded-lg border border-zinc-800 shadow-lg">
          {/* Horizon Toggle */}
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <span className="text-[11px] hidden sm:inline">Horizon:</span>
            {[
              { val: 0, label: "Now" },
              { val: 24, label: "+24h" },
              { val: 48, label: "+48h" },
              { val: 72, label: "+72h" }
            ].map((hz) => (
              <button
                key={hz.val}
                onClick={() => setForecastHorizon(hz.val)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all cursor-pointer ${
                  forecastHorizon === hz.val
                    ? "bg-zinc-400 text-white font-bold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                {hz.label}
              </button>
            ))}
          </div>

          {/* Toggle Transfers & Play Animation */}
          <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
            <button
              onClick={() => setShowRoutes(!showRoutes)}
              className={`p-1.5 rounded text-xs transition-all cursor-pointer ${
                showRoutes ? "bg-zinc-900 text-zinc-200 border border-zinc-700" : "text-zinc-400 hover:text-white"
              }`}
              title="Toggle transfer route lines"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>

            {showRoutes && (
              <button
                onClick={() => setIsPlayingAnimation(!isPlayingAnimation)}
                className={`p-1.5 rounded text-xs transition-all cursor-pointer ${
                  isPlayingAnimation ? "bg-zinc-300 text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:text-white"
                }`}
                title={isPlayingAnimation ? "Pause convoy simulation" : "Play convoy simulation preview"}
              >
                {isPlayingAnimation ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Leaflet Map Div */}
      <div ref={mapContainerRef} className="flex-1 w-full h-full min-h-[420px]" />

      {/* Selected Region Detail Bottom Drawer */}
      {selectedAssessment && (
        <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-zinc-900/95 backdrop-blur-md p-3.5 rounded-xl border border-zinc-700/80 shadow-2xl text-zinc-200 max-h-56 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div>
                <h4 className="font-bold text-sm text-white">
                  {selectedAssessment.region_name}{" "}
                  <span className="text-zinc-400 font-normal text-xs">
                    ({selectedAssessment.state})
                  </span>
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Dominant Hazard:{" "}
                  <strong className="text-zinc-200">
                    {selectedAssessment.dominant_hazard}
                  </strong>
                </p>
              </div>
              <RiskBadge
                score={selectedAssessment.overall_risk}
                category={selectedAssessment.risk_category}
              />
            </div>
            <button
              onClick={() => onSelectRegion("")}
              className="text-xs text-zinc-400 hover:text-white cursor-pointer px-2 py-1 rounded bg-zinc-800"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2.5 text-xs">
            {/* Exposed Population & Vulnerability */}
            <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
                <Users className="w-3.5 h-3.5 text-zinc-200" />
                <span>Exposure & Demographics</span>
              </div>
              <p>
                Total Pop:{" "}
                <strong className="font-mono">
                  {(selectedAssessment.population / 1000000).toFixed(2)}M
                </strong>
              </p>
              <p>
                Exposed At-Risk:{" "}
                <strong className="font-mono text-red-400">
                  {selectedAssessment.exposed_population.toLocaleString()}
                </strong>
              </p>
            </div>

            {/* Live Meteorological Telemetry */}
            {liveWeatherMap && liveWeatherMap[selectedAssessment.region_id] ? (
              <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1 text-zinc-400">
                    <CloudRain className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Live Weather (Open-Meteo)</span>
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    liveWeatherMap[selectedAssessment.region_id].imd_alert_level === "Red"
                      ? "bg-red-950 text-red-300 border border-red-800"
                      : liveWeatherMap[selectedAssessment.region_id].imd_alert_level === "Orange"
                      ? "bg-orange-950 text-orange-300 border border-orange-800"
                      : liveWeatherMap[selectedAssessment.region_id].imd_alert_level === "Yellow"
                      ? "bg-yellow-950 text-yellow-300 border border-yellow-800"
                      : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                  }`}>
                    IMD: {liveWeatherMap[selectedAssessment.region_id].imd_alert_level}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
                  <p>Temp: <strong className="font-mono text-zinc-100">{liveWeatherMap[selectedAssessment.region_id].temperature_c.toFixed(1)}°C</strong></p>
                  <p>Rain: <strong className="font-mono text-zinc-100">{liveWeatherMap[selectedAssessment.region_id].precipitation_mm.toFixed(1)} mm</strong></p>
                  <p>Hum: <strong className="font-mono text-zinc-100">{liveWeatherMap[selectedAssessment.region_id].relative_humidity_pct.toFixed(0)}%</strong></p>
                  <p>Wind: <strong className="font-mono text-zinc-100">{liveWeatherMap[selectedAssessment.region_id].wind_speed_kmh.toFixed(1)} km/h</strong></p>
                </div>
              </div>
            ) : (
              <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800/80 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Meteorological Stream</span>
                </div>
                <p className="text-zinc-500 text-[11px]">No active telemetry stream</p>
              </div>
            )}

            {/* Forecast Horizons */}
            <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
              <div className="text-zinc-400 mb-1">AI Risk Trajectory (24h / 48h / 72h)</div>
              <div className="flex items-center gap-2 font-mono">
                {selectedAssessment.forecasts?.map((f) => (
                  <div key={f.hours_ahead} className="text-center">
                    <span className="text-[10px] text-zinc-500">+{f.hours_ahead}h</span>
                    <div
                      className={`text-xs font-bold ${
                        f.predicted_risk >= 75 ? "text-red-400" : f.predicted_risk >= 50 ? "text-orange-400" : "text-emerald-400"
                      }`}
                    >
                      {f.predicted_risk.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inbound & Outbound Movements */}
            <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
                <Truck className="w-3.5 h-3.5 text-zinc-200" />
                <span>Tactical Movements</span>
              </div>
              <p className="text-emerald-300">
                Inbound Reallocations:{" "}
                <strong>{incomingTransfers.length}</strong> routes
              </p>
              <p className="text-amber-300">
                Outbound Donated:{" "}
                <strong>{outgoingTransfers.length}</strong> routes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Legend */}
      <div className="absolute bottom-3 right-3 z-[900] bg-zinc-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-zinc-800 text-[10px] flex items-center gap-3">
        <span className="text-zinc-400 font-semibold uppercase">Risk:</span>
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Low (0-24)
        </span>
        <span className="flex items-center gap-1 text-amber-400">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Mod (25-49)
        </span>
        <span className="flex items-center gap-1 text-orange-400">
          <span className="w-2 h-2 rounded-full bg-orange-500" /> High (50-74)
        </span>
        <span className="flex items-center gap-1 text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-500" /> Crit (75-100)
        </span>
      </div>
    </div>
  );
};
