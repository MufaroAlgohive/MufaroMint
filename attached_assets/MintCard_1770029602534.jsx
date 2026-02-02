import React from "react";

export const MintCard = ({ children, title, subtitle, className = "", action }) => {
  return (
    <div className={`bg-white rounded-[24px] p-6 shadow-sm border border-slate-100/50 ${className}`}>
      {(title || subtitle) && (
        <div className="flex items-start justify-between mb-6">
          <div>
            {title && <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{title}</h3>}
            {subtitle && <p className="text-sm font-medium text-slate-900 mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
};
