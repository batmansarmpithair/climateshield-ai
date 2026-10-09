import React, { useState } from "react";
import { ScenarioConfig, OptimizationResult } from "../types";
import { api } from "../api/client";
import {
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Boxes,
  Truck,
  IndianRupee,
  Layers,
  CheckCircle2
} from "lucide-react";

interface WhatIfSimulatorPageProps {
  scenarios: ScenarioConfig[];
  currentScenarioId: string;
  onSelectScenario: (id: string) => void;
  baseOptimization: OptimizationResult | null;
  onApplySimulationResult: (result: OptimizationResult) => void;
}

export const WhatIfSimulatorPage: React.FC<WhatIfSimulatorPageProps> = ({
  scenarios,
  currentScenarioId,
  onSelectScenario,
  baseOptimization,
  onApplySimulationResult
}) => {
  // Simulator Sliders
  const [hazardMultiplier, setHazardMultiplier] = useState<number>(1.8);
  const [demandMultiplier, setDemandMultiplier] = useState<number>(1.5);
  const [budgetLakhs, setBudgetLakhs] = useState<number>(65.0);
  const [reserveBuffer, setReserveBuffer] = useState<number>(10.0);
  const [transitWindow, setTransitWindow] = useState<number>(48.0);

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<OptimizationResult | null>(null);

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await api.simulateWhatIf({
        hazard_severity_multiplier: hazardMultiplier,
        emergency_demand_multiplier: demandMultiplier,
        budget_limit_inr: budgetLakhs * 100000,
        reserve_buffer_pct: reserveBuffer / 100.0,
        max_travel_time_hours: transitWindow
      });
      setSimulationResult(res.result);
      onApplySimulationResult(res.result);
    } catch (err) {
      alert("Simulation failed: " + err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetSliders = () => {
    setHazardMultiplier(1.0);
    setDemandMultiplier(1.0);
    setBudgetLakhs(65.0);
    setReserveBuffer(0.0);
    setTransitWindow(48.0);
    setSimulationResult(null);
  };

  const baseImpact = baseOptimization?.impact;
  const simImpact = simulationResult?.impact;

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 bg-[#0a0a0a] text-zinc-100">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-zinc-200" />
            Disaster Scenario & What-If Stress Simulator
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Simulate climate anomalies, demand surges, and constrained relief budgets. Recalculates risk profiles and reruns PuLP optimizer in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetSliders}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Sliders</span>
          </button>

          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="px-5 py-1.5 rounded-lg bg-gradient-to-r from-zinc-300 to-zinc-300 hover:from-zinc-200 hover:to-zinc-200 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-zinc-900/60 cursor-pointer disabled:opacity-50 transition-all"
          >
            <Play className={`w-3.5 h-3.5 ${isSimulating ? "animate-spin" : ""}`} />
            <span>{isSimulating ? "Executing Simulation..." : "Simulate Stress Test"}</span>
          </button>
        </div>
      </div>

      {/* Preset Scenario Cards Switcher */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
          1. Choose Base Scenario Context
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {scenarios.map((s) => {
            const isSelected = s.id === currentScenarioId;
            return (
              <button
                key={s.id}
                onClick={() => onSelectScenario(s.id)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-zinc-900/80 border-zinc-300 shadow-md"
                    : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{s.name}</span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-zinc-200 animate-pulse" />
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">
                  {s.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stress Simulator Sliders */}
      <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5 shadow-lg">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 mb-4 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          2. Adjust Environmental & Logistical Stress Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
          {/* Hazard Severity Multiplier */}
          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-zinc-200">Hazard Severity Spike</span>
              <span className="font-mono text-zinc-100 font-bold">{hazardMultiplier.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.5"
              step="0.1"
              value={hazardMultiplier}
              onChange={(e) => setHazardMultiplier(parseFloat(e.target.value))}
              className="w-full accent-zinc-200 cursor-pointer"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Amplifies rainfall, storm surge, or heat extremes across disaster zones.
            </span>
          </div>

          {/* Emergency Demand Multiplier */}
          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-zinc-200">Emergency Demand Surge</span>
              <span className="font-mono text-zinc-100 font-bold">{demandMultiplier.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={demandMultiplier}
              onChange={(e) => setDemandMultiplier(parseFloat(e.target.value))}
              className="w-full accent-zinc-200 cursor-pointer"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Increases urgent requests for pumps, rescue boats, and trauma relief kits.
            </span>
          </div>

          {/* Budget Limit */}
          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-zinc-200">Emergency Movement Budget</span>
              <span className="font-mono text-zinc-100 font-bold">₹{budgetLakhs.toFixed(0)} Lakhs</span>
            </div>
            <input
              type="range"
              min="15"
              max="150"
              step="5"
              value={budgetLakhs}
              onChange={(e) => setBudgetLakhs(parseFloat(e.target.value))}
              className="w-full accent-zinc-200 cursor-pointer"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Financial spending ceiling for inter-district fuel & convoy freight.
            </span>
          </div>

          {/* Reserve Buffer */}
          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-zinc-200">Origin Minimum Reserve Buffer</span>
              <span className="font-mono text-zinc-100 font-bold">+{reserveBuffer.toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={reserveBuffer}
              onChange={(e) => setReserveBuffer(parseFloat(e.target.value))}
              className="w-full accent-zinc-200 cursor-pointer"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Guarantees donor regions maintain extra emergency stock for self-defense.
            </span>
          </div>

          {/* Transit Window */}
          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
            <div className="flex justify-between mb-1">
              <span className="font-semibold text-zinc-200">Max Transit Horizon</span>
              <span className="font-mono text-zinc-100 font-bold">{transitWindow.toFixed(0)} Hours</span>
            </div>
            <input
              type="range"
              min="12"
              max="72"
              step="6"
              value={transitWindow}
              onChange={(e) => setTransitWindow(parseFloat(e.target.value))}
              className="w-full accent-zinc-200 cursor-pointer"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Excludes cross-country transfers that cannot reach destinations in time.
            </span>
          </div>
        </div>
      </div>

      {/* Before vs After Impact Diff Comparison */}
      {simImpact && baseImpact && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            3. Stress Test Differential: Baseline vs. Simulated
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Unmet Demand Diff */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-lg">
              <span className="text-xs text-zinc-400 uppercase font-semibold">
                Unmet Emergency Shortages
              </span>
              <div className="flex items-baseline justify-between mt-2 font-mono">
                <div>
                  <span className="text-xs text-zinc-500 block">Baseline</span>
                  <span className="text-lg font-bold text-zinc-300">
                    {baseImpact.optimized_unmet_demand.toLocaleString()}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500" />
                <div className="text-right">
                  <span className="text-xs text-zinc-200 block">Simulated</span>
                  <span className="text-lg font-bold text-red-400">
                    {simImpact.optimized_unmet_demand.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Coverage Percentage Diff */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-lg">
              <span className="text-xs text-zinc-400 uppercase font-semibold">
                Demand Satisfied (%)
              </span>
              <div className="flex items-baseline justify-between mt-2 font-mono">
                <div>
                  <span className="text-xs text-zinc-500 block">Baseline</span>
                  <span className="text-lg font-bold text-zinc-300">
                    {baseImpact.optimized_coverage_pct.toFixed(1)}%
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500" />
                <div className="text-right">
                  <span className="text-xs text-zinc-200 block">Simulated</span>
                  <span
                    className={`text-lg font-bold ${
                      simImpact.optimized_coverage_pct >= baseImpact.optimized_coverage_pct
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  >
                    {simImpact.optimized_coverage_pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Units Moved */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-lg">
              <span className="text-xs text-zinc-400 uppercase font-semibold">
                Reallocated Convoys
              </span>
              <div className="flex items-baseline justify-between mt-2 font-mono">
                <div>
                  <span className="text-xs text-zinc-500 block">Baseline</span>
                  <span className="text-lg font-bold text-zinc-300">
                    {baseOptimization?.transfers.length || 0} routes
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500" />
                <div className="text-right">
                  <span className="text-xs text-zinc-200 block">Simulated</span>
                  <span className="text-lg font-bold text-zinc-100">
                    {simulationResult?.transfers.length || 0} routes
                  </span>
                </div>
              </div>
            </div>

            {/* Movement Cost */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-lg">
              <span className="text-xs text-zinc-400 uppercase font-semibold">
                Convoy Logistics Spend
              </span>
              <div className="flex items-baseline justify-between mt-2 font-mono">
                <div>
                  <span className="text-xs text-zinc-500 block">Baseline</span>
                  <span className="text-lg font-bold text-zinc-300">
                    ₹{(baseImpact.total_movement_cost_inr / 100000).toFixed(1)}L
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500" />
                <div className="text-right">
                  <span className="text-xs text-zinc-200 block">Simulated</span>
                  <span className="text-lg font-bold text-zinc-100">
                    ₹{(simImpact.total_movement_cost_inr / 100000).toFixed(1)}L
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
