import React from "react";
import { Clock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

const sizeMap = {
  xs: "text-[9px] px-1.5 py-0.5 gap-0.5",
  sm: "text-[10px] px-2 py-0.5 gap-1",
  md: "text-xs px-2.5 py-1 gap-1",
};

const iconSizeMap = {
  xs: 8,
  sm: 10,
  md: 12,
};

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    colors: "bg-amber-50 text-amber-600 border-amber-200",
  },
  pending_broker: {
    label: "Pending",
    icon: Loader2,
    colors: "bg-blue-50 text-blue-600 border-blue-200",
  },
  confirmed: {
    label: "Confirmed",
    icon: CheckCircle2,
    colors: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  failed: {
    label: "Failed",
    icon: AlertTriangle,
    colors: "bg-rose-50 text-rose-600 border-rose-200",
  },
};

const SettlementBadge = ({ status, size = "sm", labelOverride, className = "" }) => {
  const config = statusConfig[status];
  if (!config) return null;

  const Icon = config.icon;
  const label = labelOverride || config.label;

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${config.colors} ${sizeMap[size] || sizeMap.sm} ${className}`}
    >
      <Icon size={iconSizeMap[size] || 10} />
      {label}
    </span>
  );
};

export default SettlementBadge;
