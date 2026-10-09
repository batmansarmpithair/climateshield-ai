import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import {
  BookOpen,
  Cpu,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Code,
  CheckCircle,
  Sparkles
} from "lucide-react";

export const MethodologyPage: React.FC = () => {
  const [methodologyData, setMethodologyData] = useState<any>(null);

  useEffect(() => {
    api
      .getMethodology()
      .then((data) => setMethodologyData(data))
      .catch((err) => console.error("Error loading methodology:", err));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 bg-[#0a0a0a] text-zinc-100 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="pb-4 border-b border-zinc-800">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-700 text-zinc-100 text-xs font-semibold mb-2">
          <BookOpen className="w-3.5 h-3.5" />
          Technical & Mathematical Documentation
        </div>
        <h2 className="text-2xl font-bold text-white">
          ClimateShield AI Mathematical Formulation & Constraints
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Complete transparent disclosure of risk aggregation algorithms, time-series ML validation, PuLP Mixed-Integer Linear Program constraints, and synthetic assumptions.
        </p>
      </div>

      {/* Section 1: Multi-Hazard Risk Scoring */}
      <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5 shadow-lg space-y-3">
        <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm">
          <Activity className="w-4 h-4" />
          <span>1. Multi-Hazard Regional Risk Engine</span>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          Hazard-specific normalized scoring (0–100) integrated across four primary hazards: Floods, Heatwaves, Droughts, and Cyclones. Normalizes probability, physical intensity, exposed population, vulnerability, and infrastructure deficits:
        </p>

        <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-100 overflow-x-auto">
          R_h = [0.35 × (P_h × I_h) + 0.30 × E_r + 0.20 × V_r + 0.15 × (1 - IR_r)] × 100
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
          <div><code className="text-zinc-200 font-mono font-bold">P_h, I_h:</code> Normalized hazard probability and intensity index [0.0 - 1.0].</div>
          <div><code className="text-zinc-200 font-mono font-bold">E_r:</code> Logarithmically scaled population exposure metric [0.0 - 1.0].</div>
          <div><code className="text-zinc-200 font-mono font-bold">V_r:</code> Socio-economic vulnerability rating of the district [0.0 - 1.0].</div>
          <div><code className="text-zinc-200 font-mono font-bold">IR_r:</code> Regional infrastructure resilience index [0.0 - 1.0].</div>
        </div>

        <div className="pt-2 text-xs text-zinc-300">
          <strong className="text-white block mb-1">Non-Correlated Aggregation Formula:</strong>
          To avoid artificial double-counting of correlated hazards (e.g. concurrent monsoon rain and coastal storm surge), the primary dominant hazard sets the baseline score, and additional secondary hazards contribute scaled strictly by remaining headroom:
          <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-zinc-100 mt-2 text-xs">
            R_agg = Max_h(R_h) + 0.20 × (1 - Max_h / 100) × ∑ (R_secondary)
          </div>
        </div>
      </div>

      {/* Section 2: AI Forecasting Engine */}
      <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5 shadow-lg space-y-3">
        <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm">
          <Cpu className="w-4 h-4" />
          <span>2. Time-Series AI Risk Forecasting</span>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          The forecasting engine projects 24h, 48h, and 72h horizons using lagged autoregressive features (t-1, t-2, t-3), 3-day and 7-day rolling statistics, and regularized L2-Ridge regression trained on time-split historical observations:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="font-semibold text-zinc-400 block">Horizon 1: 24 Hours</span>
            <span className="text-zinc-100 font-bold">Tactical Deployment</span>
            <p className="text-[11px] text-zinc-500 mt-1">High fidelity, immediate convoy dispatch.</p>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="font-semibold text-zinc-400 block">Horizon 2: 48 Hours</span>
            <span className="text-zinc-100 font-bold">Operational Staging</span>
            <p className="text-[11px] text-zinc-500 mt-1">Pre-positioning mobile water tankers and pumps.</p>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="font-semibold text-zinc-400 block">Horizon 3: 72 Hours</span>
            <span className="text-zinc-100 font-bold">Strategic Reserve Allocation</span>
            <p className="text-[11px] text-zinc-500 mt-1">Inter-state mutual aid coordination.</p>
          </div>
        </div>

        <p className="text-xs text-zinc-400">
          Evaluation metrics (<code className="text-zinc-100 font-mono">R²</code>, <code className="text-zinc-100 font-mono">MAE</code>, <code className="text-zinc-100 font-mono">RMSE</code>) are calculated strictly on held-out temporal validation observations without lookahead leakage.
        </p>
      </div>

      {/* Section 3: Optimization Formulation */}
      <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5 shadow-lg space-y-3">
        <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm">
          <Code className="w-4 h-4" />
          <span>3. PuLP Mixed-Integer Linear Programming Formulation</span>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          The authoritative optimization engine minimizes unmet disaster demand, physical convoy freight costs, and transit delay subject to operational and statutory bounds:
        </p>

        <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-100 overflow-x-auto">
          Min ∑ (w_unmet × p_k × S_j,k) + ∑ (w_cost × cost_i,j × X_i,j,k) + ∑ (w_delay × time_i,j × X_i,j,k) + ∑ (w_move × X_i,j,k)
        </div>

        <div className="space-y-2 text-xs text-zinc-300">
          <div className="font-semibold text-white">System Constraints:</div>
          <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 space-y-1.5 font-mono text-[11px]">
            <div>1. Donor Reserve: ∑_j X_i,j,k ≤ Available_i,k - MinReserve_i,k</div>
            <div>2. Demand Balance: LocalSupply_j,k + ∑_i X_i,j,k + S_j,k ≥ Demand_j,k</div>
            <div>3. Budget Ceiling: ∑ (Cost_i,j,k × X_i,j,k) ≤ Budget_Limit</div>
            <div>4. Route Reachability: X_i,j,k = 0 if TravelTime_i,j &gt; MaxTransitHours</div>
            <div>5. Hazard Suitability: X_i,j,k = 0 if Commodity k incompatible with Hazard j</div>
            <div>6. Integrality: X_i,j,k ∈ ℤ⁺, S_j,k ∈ ℤ⁺</div>
          </div>
        </div>
      </div>

      {/* Section 4: Assumptions & Disclaimers */}
      <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5 shadow-lg space-y-3 text-xs text-zinc-300">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>4. Assumptions, Caveats & Prototype Disclaimers</span>
        </div>

        <ul className="space-y-2 list-disc list-inside text-zinc-400 leading-relaxed">
          <li>
            <strong className="text-zinc-200">Synthetic Profiles:</strong> All climate observations, flood/heatwave indices, and regional depot inventories are reproducible synthetic profiles developed for decision-support algorithm testing.
          </li>
          <li>
            <strong className="text-zinc-200">Highway Transit Speed:</strong> Emergency vehicle convoys are modeled at an average speed of 50 km/h across national highway corridors using Haversine geodesic distance.
          </li>
          <li>
            <strong className="text-zinc-200">Zero Artificial Risk Inflation:</strong> Impact metrics report verifiable demand satisfied units and unmet shortage reductions rather than claiming speculative reductions in meteorological intensity.
          </li>
        </ul>
      </div>
    </div>
  );
};
