import React from "react";

const CreditActionGrid = ({ actions }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          disabled={action.disabled}
          className={`flex items-center justify-center rounded-2xl border px-3 py-4 text-sm font-semibold shadow-sm transition ${
            action.disabled
              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
              : "border-slate-100 bg-slate-50 text-slate-700 hover:-translate-y-0.5"
          }`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
};

export default CreditActionGrid;
