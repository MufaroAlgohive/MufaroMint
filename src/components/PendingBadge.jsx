import React from "react";
import { Clock } from "lucide-react";

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

const PendingBadge = ({ size = "sm", label = "Pending", className = "" }) => {
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full bg-amber-50 text-amber-600 border border-amber-200 ${sizeMap[size] || sizeMap.sm} ${className}`}
    >
      <Clock size={iconSizeMap[size] || 10} />
      {label}
    </span>
  );
};

export default PendingBadge;
