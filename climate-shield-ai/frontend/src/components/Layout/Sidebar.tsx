import React from "react";
import {
  ShieldAlert,
  LayoutDashboard,
  Activity,
  Boxes,
  Cpu,
  Sliders,
  BarChart3,
  CheckCheck,
  BookOpen,
  Home,
  AlertTriangle
} from "lucide-react";

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  criticalAlertCount?: number;
  pendingTransfersCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
  criticalAlertCount = 0,
  pendingTransfersCount = 0
}) => {
  const navItems = [
    { id: "landing", label: "Overview", icon: Home },
    { id: "dashboard", label: "National Command", icon: LayoutDashboard },
    {
      id: "risk",
      label: "Risk Intelligence",
      icon: Activity,
      badge: criticalAlertCount > 0 ? criticalAlertCount : undefined,
      badgeColor: "bg-red-600 text-white"
    },
    { id: "resources", label: "Resource Logistics", icon: Boxes },
    { id: "optimizer", label: "PuLP Optimizer", icon: Cpu },
    { id: "simulator", label: "What-If Simulator", icon: Sliders },
    { id: "impact", label: "Impact Analysis", icon: BarChart3 },
    {
      id: "recommendations",
      label: "Dispatches & Approval",
      icon: CheckCheck,
      badge: pendingTransfersCount > 0 ? pendingTransfersCount : undefined,
      badgeColor: "bg-zinc-400 text-white"
    },
    { id: "methodology", label: "Model Methodology", icon: BookOpen },
  ];

  return (
    <aside className="w-64 bg-[#0a0a0a] border-r border-zinc-800/80 flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-zinc-800/80 flex items-center gap-3">
       <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center border border-zinc-700/60 shadow-lg">
  <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
</div>
        <div>
          <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            ClimateShield <span className="text-zinc-200 font-mono text-xs px-1 py-0.5 rounded bg-zinc-900 border border-zinc-700">AI</span>
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            {/* Elegant Mini Indian Flag */}
            <span
              className="inline-flex flex-col w-3.5 h-2.5 rounded-[2px] overflow-hidden border border-zinc-700 shadow-sm shrink-0"
              title="Republic of India"
            >
              <span className="h-1/3 bg-[#FF9933] w-full" />
              <span className="h-1/3 bg-white w-full flex items-center justify-center">
                <span className="w-1 h-1 rounded-full border-[0.5px] border-[#000080]" />
              </span>
              <span className="h-1/3 bg-[#138808] w-full" />
            </span>
            <p className="text-[11px] text-zinc-400 font-medium">
              Disaster Command Center &middot; India
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Command Modules
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-zinc-900/70 text-zinc-100 border border-zinc-600/60 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-zinc-200" : "text-zinc-400"}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/40">
        <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-zinc-400 text-[11px]">Solver Engine</span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              PuLP CBC
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>Data Mode</span>
            <span className="text-zinc-200 font-mono">India Synthetic</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
