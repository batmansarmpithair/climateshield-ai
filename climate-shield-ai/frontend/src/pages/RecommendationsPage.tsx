import React, { useState, useEffect } from "react";
import { ProposedTransfer, TransferHistoryRecord } from "../types";
import { api } from "../api/client";
import {
  CheckCheck,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  IndianRupee,
  ShieldAlert,
  ArrowRight,
  Download,
  AlertTriangle,
  FileText,
  RotateCcw,
  History,
  ShieldCheck
} from "lucide-react";

interface RecommendationsPageProps {
  onPlanApproved?: () => void;
}

export const RecommendationsPage: React.FC<RecommendationsPageProps> = ({ onPlanApproved }) => {
  const [planData, setPlanData] = useState<any>(null);
  const [historyRecords, setHistoryRecords] = useState<TransferHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActing, setIsActing] = useState<boolean>(false);
  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);
  const [commanderName, setCommanderName] = useState<string>("National Disaster Commander");

  const [filterPriority, setFilterPriority] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"recommendations" | "audit">("recommendations");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [latestPlan, history] = await Promise.all([
        api.getLatestPlan(),
        api.getTransfersHistory()
      ]);
      setPlanData(latestPlan);
      setHistoryRecords(history);
    } catch (err) {
      console.error("Error loading plan:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprovePlan = async () => {
    if (!planData) return;
    setIsActing(true);
    try {
      await api.executePlanAction(planData.plan_id, "approve", commanderName);
      setShowApprovalModal(false);
      await loadData();
      if (onPlanApproved) onPlanApproved();
      alert("Deployment plan approved! Regional inventory and transfer audit logs have been successfully updated.");
    } catch (err) {
      alert("Approval error: " + err);
    } finally {
      setIsActing(false);
    }
  };

  const handleRejectPlan = async () => {
    if (!planData) return;
    if (!window.confirm("Reject this proposed deployment plan? Inventory will remain unchanged.")) {
      return;
    }
    setIsActing(true);
    try {
      await api.executePlanAction(planData.plan_id, "reject", commanderName);
      await loadData();
      alert("Deployment plan has been marked as Rejected.");
    } catch (err) {
      alert("Rejection error: " + err);
    } finally {
      setIsActing(false);
    }
  };

  const transfers: ProposedTransfer[] = planData?.transfers || [];
  const planStatus: string = planData?.plan_status || "Draft";
  const isApproved: boolean = Boolean(planData?.is_approved);

  const filteredTransfers = transfers.filter((t) => {
    const matchesPrio = filterPriority === "All" || t.priority === filterPriority;
    const matchesSearch =
      !searchQuery ||
      t.origin_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.destination_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.resource_type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPrio && matchesSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 bg-[#0a0a0a] text-zinc-100">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCheck className="w-5 h-5 text-zinc-200" />
            Explainable Recommendations & Deployment Workflow
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Plain-language tactical rationales for every inter-district movement. Review, approve, reject, and export dispatch manifests.
          </p>
        </div>

        {/* Workflow Actions */}
        <div className="flex items-center gap-2">
          <a
            href={api.getImpactCsvUrl()}
            download="climateshield_recommendations.csv"
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-600 text-zinc-300 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>

          {!isApproved && planStatus !== "Rejected" && (
            <>
              <button
                onClick={handleRejectPlan}
                disabled={isActing}
                className="px-3 py-1.5 rounded-lg bg-red-950/70 border border-red-800 hover:bg-red-900 text-red-300 font-semibold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject Plan</span>
              </button>

              <button
                onClick={() => setShowApprovalModal(true)}
                disabled={isActing}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-zinc-200 hover:from-emerald-400 hover:to-zinc-100 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approve & Commit Plan</span>
              </button>
            </>
          )}

          {isApproved && (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-300 font-bold text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Plan Approved & Inventory Updated</span>
            </div>
          )}

          {planStatus === "Rejected" && (
            <div className="px-3 py-1.5 rounded-lg bg-red-950/80 border border-red-700 text-red-300 font-bold text-xs flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-red-400" />
              <span>Plan Rejected</span>
            </div>
          )}
        </div>
      </div>

      {/* View Switcher: Recommendations vs Audit History */}
      <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs w-fit">
        <button
          onClick={() => setActiveTab("recommendations")}
          className={`px-3 py-1.5 rounded font-medium transition-all cursor-pointer ${
            activeTab === "recommendations" ? "bg-zinc-300 text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"
          }`}
        >
          Proposed Transfers ({transfers.length})
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-3 py-1.5 rounded font-medium transition-all cursor-pointer ${
            activeTab === "audit" ? "bg-zinc-300 text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"
          }`}
        >
          Execution History Log ({historyRecords.length})
        </button>
      </div>

      {activeTab === "recommendations" ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Filter Priority:</span>
              {["All", "Critical", "High"].map((p) => (
                <button
                  key={p}
                  onClick={() => setFilterPriority(p)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                    filterPriority === p
                      ? "bg-zinc-300 text-zinc-950 font-bold"
                      : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search origin, destination, commodity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-300 w-64"
            />
          </div>

          {/* Cards List with Plain-Language Rationales */}
          <div className="grid grid-cols-1 gap-3">
            {filteredTransfers.map((t) => (
              <div
                key={t.id}
                className="bg-zinc-900/85 rounded-xl border border-zinc-800 hover:border-zinc-700 p-4 shadow-lg transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.priority === "Critical"
                          ? "bg-red-950 text-red-300 border border-red-800"
                          : "bg-orange-950 text-orange-300 border border-orange-800"
                      }`}
                    >
                      {t.priority} Priority
                    </span>
                    <h4 className="text-sm font-bold text-white font-mono">
                      {t.quantity.toLocaleString()} {t.resource_type}
                    </h4>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
                    <span>
                      Distance: <strong className="text-zinc-200">{t.distance_km} km</strong>
                    </span>
                    <span>
                      ETA: <strong className="text-zinc-100">~{t.estimated_travel_time_hours} hrs</strong>
                    </span>
                    <span>
                      Cost: <strong className="text-zinc-100">₹{t.movement_cost_inr.toLocaleString()}</strong>
                    </span>
                  </div>
                </div>

                {/* Transfer Origin -> Destination Graphic */}
                <div className="flex items-center gap-2 text-xs font-semibold my-2.5">
                  <span className="text-zinc-300 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                    Origin: {t.origin_name}
                  </span>
                  <ArrowRight className="w-4 h-4 text-zinc-200" />
                  <span className="text-zinc-100 bg-zinc-900/60 px-2 py-1 rounded border border-zinc-700">
                    Recipient: {t.destination_name}
                  </span>
                </div>

                {/* Plain-Language Explanation */}
                <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80">
                  <strong className="text-zinc-200">Tactical Rationale:</strong> {t.explanation}
                </p>

                {/* Operational Constraints */}
                <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px] text-zinc-400">
                  <span className="text-zinc-500 font-medium">Enforced Checks:</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300">
                    Origin Reserve Preserved ({t.origin_reserve} units locked)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300">
                    Hazard Compatibility Verified ({t.destination_hazard})
                  </span>
                  {t.limiting_constraints.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Audit History View */
        <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 shadow-xl overflow-hidden">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <span>Executed Transfer Movements (Persistent SQLite Database)</span>
            <span>Total Records: {historyRecords.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Plan Ref</th>
                  <th className="py-3 px-4">Executed Date</th>
                  <th className="py-3 px-4">Commodity</th>
                  <th className="py-3 px-4">Origin Depot</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4 text-right">Units</th>
                  <th className="py-3 px-4 text-right">Cost</th>
                  <th className="py-3 px-4">Authorized By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 font-mono">
                {historyRecords.map((h) => (
                  <tr key={h.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-2.5 px-4 text-zinc-200 font-bold">
                      {h.plan_id.slice(0, 8)}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-400">
                      {h.executed_at.slice(0, 19).replace("T", " ")}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-zinc-200">
                      {h.resource_type}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-zinc-300">
                      {h.origin_name}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-zinc-300">
                      {h.destination_name}
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-400 font-bold">
                      {h.quantity.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right text-zinc-300">
                      ₹{h.movement_cost_inr.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-zinc-400">
                      {h.executed_by}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Plan Approval */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 border-b border-zinc-800 pb-3">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">
                Authorize & Commit Emergency Plan
              </h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Approving this plan will execute <strong>{transfers.length} inter-district movements</strong>, deduct available stock from donor depots while preserving minimum statutory reserves, deploy resources to recipient zones, and create an immutable audit trail.
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Authorizing Commander Identity:
              </label>
              <input
                type="text"
                value={commanderName}
                onChange={(e) => setCommanderName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-zinc-300 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800 text-xs">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApprovePlan}
                disabled={isActing}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold cursor-pointer disabled:opacity-50"
              >
                {isActing ? "Committing..." : "Confirm & Commit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
