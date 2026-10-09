import React from "react";

interface RiskBadgeProps {
  score?: number;
  category?: string;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  score,
  category,
  size = "md",
  showScore = true
}) => {
  let cat = category;
  if (!cat && score !== undefined) {
    if (score >= 75) cat = "Critical";
    else if (score >= 50) cat = "High";
    else if (score >= 25) cat = "Moderate";
    else cat = "Low";
  }

  let colorClasses = "bg-zinc-800 text-zinc-300 border-zinc-700";
  let dotColor = "bg-zinc-400";

  switch (cat) {
    case "Critical":
      colorClasses = "bg-red-950/70 text-red-300 border-red-700/60 shadow-red-950/50 shadow-sm";
      dotColor = "bg-red-500 animate-pulse";
      break;
    case "High":
      colorClasses = "bg-orange-950/70 text-orange-300 border-orange-700/60 shadow-orange-950/50 shadow-sm";
      dotColor = "bg-orange-500";
      break;
    case "Moderate":
      colorClasses = "bg-amber-950/60 text-amber-300 border-amber-700/50 shadow-amber-950/50 shadow-sm";
      dotColor = "bg-amber-500";
      break;
    case "Low":
      colorClasses = "bg-emerald-950/60 text-emerald-300 border-emerald-700/50 shadow-emerald-950/50 shadow-sm";
      dotColor = "bg-emerald-500";
      break;
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1.5",
    md: "px-2.5 py-1 text-xs gap-2 font-medium",
    lg: "px-3 py-1.5 text-sm gap-2.5 font-semibold"
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border transition-all ${sizeClasses} ${colorClasses}`}
    >
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span>{cat || "Unknown"}</span>
      {showScore && score !== undefined && (
        <span className="font-mono opacity-80 pl-1 border-l border-white/20">
          {score.toFixed(1)}
        </span>
      )}
    </span>
  );
};
