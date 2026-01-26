import React from "react";
import { ChevronRight } from "lucide-react";

const OutstandingActionsSection = ({ actions, onViewAll, onSelectAction }) => {
  if (!actions || actions.length === 0) {
    return null;
  }

  const visibleActions = actions.slice(0, 3);

  return (
    <section className="rounded-3xl bg-white px-5 py-5 shadow-md">
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Outstanding actions</h2>
      </div>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visibleActions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onSelectAction(action)}
            className="flex min-w-[240px] flex-1 snap-start flex-col justify-between rounded-2xl border border-slate-100 bg-white/90 px-4 py-4 text-left shadow-sm"
          >
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                  {action.icon ? <action.icon className="h-4 w-4" /> : null}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900">{action.title}</p>
              <p className="mt-1 text-xs text-slate-500">{action.description}</p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                {action.status}
              </span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onViewAll}
        className="mt-4 flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
      >
        View all actions
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </button>
    </section>
  );
};

export default OutstandingActionsSection;
