import React, { useState, useEffect } from "react";
import { ResourceItem, ResourceSummary, RegionalDemand } from "../types";
import { api } from "../api/client";
import {
  Boxes,
  Search,
  Filter,
  Plus,
  Edit2,
  AlertCircle,
  Truck,
  ShieldAlert,
  ArrowUpDown,
  Check,
  X
} from "lucide-react";

interface ResourceManagementPageProps {
  onRefreshData?: () => void;
}

export const ResourceManagementPage: React.FC<ResourceManagementPageProps> = ({ onRefreshData }) => {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [summary, setSummary] = useState<ResourceSummary | null>(null);
  const [demands, setDemands] = useState<RegionalDemand[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [viewTab, setViewTab] = useState<"inventory" | "demands">("inventory");

  // Edit stock modal state
  const [editingItem, setEditingItem] = useState<ResourceItem | null>(null);
  const [editAvailable, setEditAvailable] = useState<number>(0);
  const [editReserve, setEditReserve] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resList, resSum, demList] = await Promise.all([
        api.getResources(),
        api.getResourceSummary(),
        api.getDemands()
      ]);
      setResources(resList);
      setSummary(resSum);
      setDemands(demList);
    } catch (err) {
      console.error("Failed to load resource data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEdit = (item: ResourceItem) => {
    setEditingItem(item);
    setEditAvailable(item.available_quantity);
    setEditReserve(item.minimum_reserve);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSaving(true);
    try {
      await api.updateResource({
        region_id: editingItem.region_id,
        resource_type: editingItem.resource_type,
        available_quantity: editAvailable,
        minimum_reserve: editReserve
      });
      setEditingItem(null);
      await loadData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      alert("Failed to update resource: " + err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredResources = resources.filter((r) => {
    const matchesCat = selectedCategory === "All" || r.resource_type === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      r.region_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.resource_type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const filteredDemands = demands.filter((d) => {
    const matchesCat = selectedCategory === "All" || d.resource_type === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      d.region_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.state.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 bg-[#0a0a0a] text-zinc-100">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-zinc-200" />
            National Resource Logistics & Stock Reserves
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Maintain district depot inventories across 8 vital disaster response commodities while enforcing statutory reserve limits.
          </p>
        </div>

        {/* View Switcher: Inventory vs Regional Demands */}
        <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs">
          <button
            onClick={() => setViewTab("inventory")}
            className={`px-3 py-1.5 rounded font-medium transition-all cursor-pointer ${
              viewTab === "inventory"
                ? "bg-zinc-300 text-zinc-950 font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Regional Inventory ({resources.length})
          </button>
          <button
            onClick={() => setViewTab("demands")}
            className={`px-3 py-1.5 rounded font-medium transition-all cursor-pointer ${
              viewTab === "demands"
                ? "bg-zinc-300 text-zinc-950 font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Emergency Demands ({demands.length})
          </button>
        </div>
      </div>

      {/* Category Overview Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {summary.categories.map((c) => (
            <div
              key={c.resource_type}
              onClick={() => setSelectedCategory(selectedCategory === c.resource_type ? "All" : c.resource_type)}
              className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                selectedCategory === c.resource_type
                  ? "bg-zinc-900/80 border-zinc-300 shadow-md"
                  : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="text-[10px] font-semibold text-zinc-400 truncate">
                {c.resource_type}
              </div>
              <div className="text-sm font-bold font-mono text-white mt-1">
                {c.available_quantity.toLocaleString()}
              </div>
              <div className="text-[9px] text-zinc-500 mt-0.5 font-mono">
                Res: {c.minimum_reserve.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search district, state, or commodity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-300"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-300 cursor-pointer"
          >
            <option value="All">All 8 Categories</option>
            {summary?.categories.map((c) => (
              <option key={c.resource_type} value={c.resource_type}>
                {c.resource_type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table: Inventory vs Demands */}
      {viewTab === "inventory" ? (
        <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Depot Location</th>
                  <th className="py-3 px-4">Commodity Type</th>
                  <th className="py-3 px-4 text-right">Available Stock</th>
                  <th className="py-3 px-4 text-right">Currently Deployed</th>
                  <th className="py-3 px-4 text-right">Minimum Reserve</th>
                  <th className="py-3 px-4 text-right">Spareable Buffer</th>
                  <th className="py-3 px-4 text-right">Transit Cost (₹/km)</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 font-mono">
                {filteredResources.slice(0, 50).map((r) => {
                  const spareable = Math.max(0, r.available_quantity - r.minimum_reserve);
                  const isSafe = r.available_quantity >= r.minimum_reserve;

                  return (
                    <tr key={r.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-sans font-medium text-zinc-200">
                        {r.region_name}{" "}
                        <span className="text-[11px] text-zinc-500 font-normal">
                          ({r.state})
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-sans text-zinc-100">
                        {r.resource_type}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-white">
                        {r.available_quantity.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right text-zinc-400">
                        {r.deployed_quantity.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right text-amber-400">
                        {r.minimum_reserve.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            spareable > 0
                              ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800"
                              : "bg-red-950/80 text-red-400 border border-red-800"
                          }`}
                        >
                          {spareable > 0 ? `+${spareable}` : "Locked"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-zinc-400">
                        ₹{r.unit_movement_cost_inr.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-all cursor-pointer inline-flex items-center gap-1 font-sans text-[11px]"
                        >
                          <Edit2 className="w-3 h-3 text-zinc-200" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredResources.length > 50 && (
            <div className="p-3 text-center text-xs text-zinc-500 border-t border-zinc-800">
              Showing top 50 records out of {filteredResources.length}. Refine search for specific district.
            </div>
          )}
        </div>
      ) : (
        /* Demands View */
        <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Emergency Zone</th>
                  <th className="py-3 px-4">Dominant Hazard</th>
                  <th className="py-3 px-4">Required Commodity</th>
                  <th className="py-3 px-4 text-right">Gross Demand</th>
                  <th className="py-3 px-4 text-center">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 font-mono">
                {filteredDemands.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-sans font-medium text-zinc-200">
                      {d.region_name}{" "}
                      <span className="text-[11px] text-zinc-500 font-normal">
                        ({d.state})
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-sans text-zinc-100">
                      {d.dominant_hazard}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-white font-semibold">
                      {d.resource_type}
                    </td>
                    <td className="py-2.5 px-4 text-right text-red-300 font-bold">
                      {d.demand_quantity.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                          d.priority_level === "Critical"
                            ? "bg-red-950 text-red-300 border border-red-800"
                            : "bg-orange-950 text-orange-300 border border-orange-800"
                        }`}
                      >
                        {d.priority_level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Resource Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-zinc-200" />
                Modify Depot Inventory
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 my-4 text-xs">
              <div>
                <span className="text-zinc-400">Location:</span>{" "}
                <strong className="text-white">
                  {editingItem.region_name} ({editingItem.state})
                </strong>
              </div>
              <div>
                <span className="text-zinc-400">Resource:</span>{" "}
                <strong className="text-zinc-100">{editingItem.resource_type}</strong>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">
                  Available Quantity in Depot:
                </label>
                <input
                  type="number"
                  min="0"
                  value={editAvailable}
                  onChange={(e) => setEditAvailable(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-zinc-300"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-semibold">
                  Mandatory Reserve Threshold (Cannot be sent away):
                </label>
                <input
                  type="number"
                  min="0"
                  value={editReserve}
                  onChange={(e) => setEditReserve(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-zinc-300"
                />
              </div>

              <div className="p-3 rounded bg-zinc-950/70 border border-zinc-800 text-[11px] text-zinc-400">
                Spareable for disaster reallocation:{" "}
                <strong className="text-emerald-400 font-mono">
                  {Math.max(0, editAvailable - editReserve)} units
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-4 py-1.5 rounded-lg bg-zinc-300 hover:bg-zinc-200 text-zinc-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : "Save Stock"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
