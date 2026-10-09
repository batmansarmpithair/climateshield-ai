import React, { useState } from "react";
import { OptimizationResult, ProposedTransfer } from "../types";
import { api } from "../api/client";
import {
  Cpu,
  Play,
  RotateCcw,
  Sliders,
  Clock,
  IndianRupee,
  ShieldAlert,
  ArrowRight,
  Truck,
  CheckCircle2,
  AlertOctagon,
  FileText
} from "lucide-react";

interface ResourceOptimizerPageProps {
  optimizationResult: OptimizationResult | null;
  onRunOptimization: (result: OptimizationResult) => void;
  onNavigatePage: (page: string) => void;
}

export const ResourceOptimizerPage: React.FC<ResourceOptimizerPageProps> = ({
  optimizationResult,
  onRunOptimization,
  onNavigatePage
}) => {
  // Solver weights
  const [unmetWeight, setUnmetWeight] = useState<number>(100.0);
  const [costWeight, setCostWeight] = useState<number>(0.05);
  const [delayWeight, setDelayWeight] = useState<number>(2.0);
  const [moveWeight, setMoveWeight] = useState<number>(5.0);
  const [riskWeight, setRiskWeight] = useState<number>(10.0);

  // Constraints
  const [budgetLakhs, setBudgetLakhs] = useState<number>(65.0); // 65 Lakhs
  const [maxHours, setMaxHours] = useState<number>(48.0);
  const [reserveBuffer, setReserveBuffer] = useState<number>(0.0);

  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"transfers" | "diagnostics">("transfers");

  const handleSolve = async () => {
    setIsSolving(true);
    try {
      const res = await api.runOptimizer({
        weights: {
          unmet_demand_penalty: unmetWeight,
          transport_cost_weight: costWeight,
          deployment_delay_weight: delayWeight,
          excessive_movement_weight: moveWeight,
          residual_risk_weight: riskWeight
        },
        budget_limit_inr: budgetLakhs * 100000,
        max_travel_time_hours: maxHours,
        reserve_buffer_pct: reserveBuffer / 100.0
      });
      onRunOptimization(res);
    } catch (err) {
      alert("Solver error: " + err);
    } finally {
      setIsSolving(false);
    }
  };

  const handleResetWeights = () => {
    setUnmetWeight(100.0);
    setCostWeight(0.05);
    setDelayWeight(2.0);
    setMoveWeight(5.0);
    setRiskWeight(10.0);
    setBudgetLakhs(65.0);
    setMaxHours(48.0);
    setReserveBuffer(0.0);
  };

  const impact = optimizationResult?.impact;
  const transfers = optimizationResult?.transfers || [];

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 bg-[#0a0a0a] text-zinc-100">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-zinc-200" />
            PuLP MILP Mathematical Resource Optimizer
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Minimizes weighted unmet disaster demand and convoy transit delays subject to donor reserves and transportation budget.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetWeights}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Default Weights</span>
          </button>

          <button
            onClick={handleSolve}
            disabled={isSolving}
            className="px-5 py-1.5 rounded-lg bg-gradient-to-r from-zinc-300 to-zinc-200 hover:from-zinc-200 hover:to-zinc-100 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-zinc-900/60 cursor-pointer disabled:opacity-50 transition-all"
          >
            <Play className={`w-3.5 h-3.5 ${isSolving ? "animate-spin" : ""}`} />
            <span>{isSolving ? "Solving Mixed-Integer LP..." : "Run Optimization Engine"}</span>
          </button>
        </div>
      </div>

      {/* Control Panel: Sliders for Weights & Constraints */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Objective Function Weights (7 cols) */}
        <div className="lg:col-span-7 bg-zinc-900/80 rounded-xl border border-zinc-800 p-4 shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 mb-3 flex items-center gap-1.5">
            <Sliders className="w-4 h-4" />
            Objective Penalty & Tradeoff Weights
          </h3>

          <div className="space-y-3.5 text-xs">
            {/* Unmet Demand Penalty */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-300 font-medium">Unmet Demand Penalty (Life-Safety Priority)</span>
                <span className="font-mono text-zinc-200 font-bold">{unmetWeight.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="10"
                max="250"
                step="5"
                value={unmetWeight}
                onChange={(e) => setUnmetWeight(parseFloat(e.target.value))}
                className="w-full accent-zinc-200 cursor-pointer"
              />
              <span className="text-[10px] text-zinc-500">Heavily penalizes leaving critical flood/heatwave shortages unfulfilled.</span>
            </div>

            {/* Transport Cost Weight */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-300 font-medium">Transport Cost Weight</span>
                <span className="font-mono text-zinc-200 font-bold">{costWeight.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.30"
                step="0.01"
                value={costWeight}
                onChange={(e) => setCostWeight(parseFloat(e.target.value))}
                className="w-full accent-zinc-200 cursor-pointer"
              />
              <span className="text-[10px] text-zinc-500">Disincentivizes costly long-distance diesel convoys when closer depots exist.</span>
            </div>

            {/* Deployment Delay Weight */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-300 font-medium">Transit Delay Penalty</span>
                <span className="font-mono text-zinc-200 font-bold">{delayWeight.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.5"
                value={delayWeight}
                onChange={(e) => setDelayWeight(parseFloat(e.target.value))}
                className="w-full accent-zinc-200 cursor-pointer"
              />
              <span className="text-[10px] text-zinc-500">Penalizes hours spent en route; prioritizes rapid regional mutual aid.</span>
            </div>

            {/* Excessive Movement Weight */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-300 font-medium">Excessive Shuffling Penalty</span>
                <span className="font-mono text-zinc-200 font-bold">{moveWeight.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="20.0"
                step="1.0"
                value={moveWeight}
                onChange={(e) => setMoveWeight(parseFloat(e.target.value))}
                className="w-full accent-zinc-200 cursor-pointer"
              />
              <span className="text-[10px] text-zinc-500">Prevents unnecessary fragmented shipments of small quantities.</span>
            </div>
          </div>
        </div>

        {/* Operational Constraints (5 cols) */}
        <div className="lg:col-span-5 bg-zinc-900/80 rounded-xl border border-zinc-800 p-4 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 mb-3 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Operational Hard Constraints
            </h3>

            <div className="space-y-4 text-xs">
              {/* Budget Limit */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-300 font-medium">Logistics Budget Ceiling</span>
                  <span className="font-mono text-zinc-100 font-bold">₹{budgetLakhs.toFixed(0)} Lakhs</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="150"
                  step="5"
                  value={budgetLakhs}
                  onChange={(e) => setBudgetLakhs(parseFloat(e.target.value))}
                  className="w-full accent-zinc-200 cursor-pointer"
                />
                <span className="text-[10px] text-zinc-500">Hard limit on total movement expenditure across all convoys.</span>
              </div>

              {/* Max Travel Time */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-300 font-medium">Maximum Highway Transit Window</span>
                  <span className="font-mono text-zinc-100 font-bold">{maxHours.toFixed(0)} Hours</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="72"
                  step="6"
                  value={maxHours}
                  onChange={(e) => setMaxHours(parseFloat(e.target.value))}
                  className="w-full accent-zinc-200 cursor-pointer"
                />
                <span className="text-[10px] text-zinc-500">Excludes routes requiring longer road transit times.</span>
              </div>

              {/* Extra Reserve Buffer */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-300 font-medium">Donor Reserve Safety Buffer</span>
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
                <span className="text-[10px] text-zinc-500">Adds extra percentage safety margin to origin minimum reserves.</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2.5 rounded bg-zinc-950/70 border border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Solver Engine:</span>
            <span className="text-emerald-400 font-mono font-bold">PuLP CBC (Branch & Cut)</span>
          </div>
        </div>
      </div>

      {/* Solver Execution Summary Banner */}
      {impact && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-zinc-900 via-[#161616] to-zinc-900 border border-zinc-700/60 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-200 border border-zinc-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-zinc-200 font-mono uppercase">
                  Solution Status: {optimizationResult?.status}
                </span>
                <h4 className="text-base font-bold text-white">
                  Identified {transfers.length} Optimal Convoys Relocating {impact.total_units_moved.toLocaleString()} Critical Units
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="text-right">
                <span className="text-zinc-400 text-[10px] block">Unmet Demand Drop</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {impact.unmet_demand_reduction_pct.toFixed(1)}%
                </span>
              </div>

              <div className="text-right">
                <span className="text-zinc-400 text-[10px] block">Budget Utilized</span>
                <span className="text-zinc-100 font-bold text-sm">
                  {impact.budget_utilized_pct.toFixed(1)}% (₹{(impact.total_movement_cost_inr / 100000).toFixed(1)}L)
                </span>
              </div>

              <button
                onClick={() => onNavigatePage("recommendations")}
                className="px-3 py-2 rounded-lg bg-zinc-300 hover:bg-zinc-200 text-zinc-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all font-sans"
              >
                <span>Proceed to Approval</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proposed Transfers Table */}
      <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("transfers")}
              className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                activeTab === "transfers" ? "bg-zinc-300 text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              Proposed Movements ({transfers.length})
            </button>
            <button
              onClick={() => setActiveTab("diagnostics")}
              className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                activeTab === "diagnostics" ? "bg-zinc-300 text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"
              }`}
            >
              Solver Diagnostics & Logs
            </button>
          </div>

          <button
            onClick={() => onNavigatePage("dashboard")}
            className="text-xs text-zinc-200 hover:text-zinc-100 flex items-center gap-1 cursor-pointer"
          >
            <span>View Convoys on India Map</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {activeTab === "transfers" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Commodity</th>
                  <th className="py-3 px-4">Origin Donor Depot</th>
                  <th className="py-3 px-4">Destination Disaster Zone</th>
                  <th className="py-3 px-4 text-right">Transfer Qty</th>
                  <th className="py-3 px-4 text-right">Distance</th>
                  <th className="py-3 px-4 text-right">Est. Transit</th>
                  <th className="py-3 px-4 text-right">Movement Cost</th>
                  <th className="py-3 px-4">Limiting Factors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 font-mono">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-sans font-semibold text-zinc-100">
                      {t.resource_type}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-zinc-200">
                      {t.origin_name}{" "}
                      <span className="text-[10px] text-zinc-500 font-mono">
                        (Res: {t.origin_reserve})
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-sans text-zinc-200">
                      {t.destination_name}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-white">
                      {t.quantity.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right text-zinc-400">
                      {t.distance_km} km
                    </td>
                    <td className="py-2.5 px-4 text-right text-zinc-200">
                      ~{t.estimated_travel_time_hours} hrs
                    </td>
                    <td className="py-2.5 px-4 text-right text-zinc-300">
                      ₹{t.movement_cost_inr.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-sans">
                      {t.limiting_constraints.length > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800">
                          {t.limiting_constraints[0]}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500">Unconstrained</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 bg-zinc-950 font-mono text-xs text-zinc-300 space-y-2">
            <div className="text-zinc-200 font-bold mb-2">--- PuLP Solver Diagnostic Logs ---</div>
            {optimizationResult?.diagnostic_notes.map((note, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-zinc-500">&gt;</span>
                <span>{note}</span>
              </div>
            ))}
            <div className="mt-4 pt-3 border-t border-zinc-800 text-[11px] text-zinc-400">
              Solver Output: Status Code = {optimizationResult?.status} | Total Objective Solved
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
