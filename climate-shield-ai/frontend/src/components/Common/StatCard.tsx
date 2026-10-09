import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  trendText?: string;
  icon?: LucideIcon;
  variant?: "default" | "critical" | "warning" | "cyan" | "emerald";
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  trend,
  trendText,
  icon: Icon,
  variant = "default"
}) => {
  const variantStyles = {
    default: "border-zinc-800/80 bg-zinc-900/60 text-zinc-100",
    critical: "border-red-900/50 bg-gradient-to-br from-red-950/40 to-zinc-900/70 text-red-200",
    warning: "border-amber-900/50 bg-gradient-to-br from-amber-950/40 to-zinc-900/70 text-amber-200",
    cyan: "border-zinc-700/50 bg-gradient-to-br from-zinc-900/40 to-zinc-900/70 text-zinc-200",
    emerald: "border-emerald-800/50 bg-gradient-to-br from-emerald-950/40 to-zinc-900/70 text-emerald-200"
  }[variant];

  const iconColor = {
    default: "text-zinc-400 bg-zinc-800/50",
    critical: "text-red-400 bg-red-950/60 border border-red-800/40",
    warning: "text-amber-400 bg-amber-950/60 border border-amber-800/40",
    cyan: "text-zinc-200 bg-zinc-900/60 border border-zinc-700/40",
    emerald: "text-emerald-400 bg-emerald-950/60 border border-emerald-800/40"
  }[variant];

  return (
    <div className={`p-4 rounded-xl border backdrop-blur-md shadow-lg transition-all hover:border-zinc-700 ${variantStyles}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          {label}
        </span>
        {Icon && (
          <div className={`p-2 rounded-lg ${iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight font-mono text-zinc-50">
          {value}
        </span>
        {subValue && (
          <span className="text-xs text-zinc-400">
            {subValue}
          </span>
        )}
      </div>

      {trendText && (
        <div className="mt-2 text-xs flex items-center gap-1">
          <span
            className={
              trend === "down"
                ? "text-emerald-400"
                : trend === "up"
                ? "text-red-400"
                : "text-zinc-400"
            }
          >
            {trendText}
          </span>
        </div>
      )}
    </div>
  );
};
