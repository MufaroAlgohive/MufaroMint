import React from "react";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  HandCoins,
  Landmark,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import ActionsSkeleton from "../components/ActionsSkeleton";

const ActionsPage = ({ onBack, isLoading = false }) => {
  if (isLoading) {
    return <ActionsSkeleton />;
  }
  const actions = [
    {
      id: "identity",
      title: "Complete identity check",
      description: "Needed to unlock higher limits",
      status: "Required",
      icon: BadgeCheck,
    },
    {
      id: "bank-link",
      title: "Link your primary bank",
      description: "Connect to enable instant transfers",
      status: "In review",
      icon: Landmark,
    },
    {
      id: "investments",
      title: "Review investment allocation",
      description: "Confirm your latest risk profile",
      status: "Optional",
      icon: TrendingUp,
    },
    {
      id: "credit",
      title: "Confirm credit preferences",
      description: "Set your preferred repayment day",
      status: "Required",
      icon: HandCoins,
    },
    {
      id: "invite",
      title: "Invite a friend",
      description: "Share Mint and earn bonus rewards",
      status: "Optional",
      icon: UserPlus,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-10 pt-12 md:max-w-md md:px-8">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Actions</h1>
          <div className="h-10 w-10" aria-hidden="true" />
        </header>

        <div className="mt-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Outstanding
          </p>
          {actions.map((action) => (
            <div key={action.id} className="flex gap-3 rounded-3xl bg-white p-4 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                {action.icon ? <action.icon className="h-5 w-5" /> : null}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">{action.title}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                      {action.status}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
                <p className="text-xs text-slate-500">{action.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActionsPage;
