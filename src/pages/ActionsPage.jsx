import React from "react";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  Landmark,
  UserPlus,
  CheckCircle2,
} from "lucide-react";
import ActionsSkeleton from "../components/ActionsSkeleton";
import { useRequiredActions } from "../lib/useRequiredActions";
import { useSumsubStatus } from "../lib/useSumsubStatus";

const ActionsPage = ({ onBack, onNavigate }) => {
  const { bankLinked, bankInReview } = useRequiredActions();
  const { kycVerified, kycPending, kycNeedsResubmission, loading, rejectLabels } = useSumsubStatus();

  if (loading) {
    return <ActionsSkeleton />;
  }

  const getBankStatus = () => {
    if (bankLinked) return "Verified";
    if (bankInReview) return "In review";
    return "Required";
  };

  const getKycStatus = () => {
    if (kycVerified) return { text: "Verified", style: "bg-green-100 text-green-600" };
    if (kycNeedsResubmission) return { text: "Needs Attention", style: "bg-amber-100 text-amber-700" };
    if (kycPending) return { text: "Pending", style: "bg-blue-100 text-blue-600" };
    return { text: "Required", style: "bg-slate-100 text-slate-500" };
  };

  const kycStatus = getKycStatus();

  const getKycDescription = () => {
    if (kycNeedsResubmission) {
      if (rejectLabels && rejectLabels.length > 0) {
        const labelMap = {
          "INCORRECT_SOCIAL_NUMBER": "Phone verification needs attention",
          "DOCUMENT_PAGE_MISSING": "Missing document page",
          "INCOMPLETE_DOCUMENT": "Incomplete document",
          "UNSATISFACTORY_PHOTOS": "Photo quality issue",
          "DOCUMENT_DAMAGED": "Document appears damaged",
          "SELFIE_MISMATCH": "Selfie doesn't match",
        };
        const firstLabel = rejectLabels[0];
        return labelMap[firstLabel] || "Some documents need resubmission";
      }
      return "Some documents need resubmission";
    }
    return "Needed to unlock higher limits";
  };

  const allActions = [
    {
      id: "identity",
      title: "Complete identity check",
      description: getKycDescription(),
      status: kycStatus.text,
      statusStyle: kycStatus.style,
      icon: BadgeCheck,
      completed: kycVerified,
      navigateTo: "identityCheck",
    },
    {
      id: "bank-link",
      title: "Link your primary bank",
      description: "Connect to enable instant transfers",
      status: getBankStatus(),
      icon: Landmark,
      completed: bankLinked,
      navigateTo: "creditApply",
    },
    {
      id: "invite",
      title: "Invite a friend",
      description: "Share Mint and earn bonus rewards",
      status: "Optional",
      icon: UserPlus,
      completed: false,
      navigateTo: "invite",
    },
  ];

  const outstandingActions = allActions.filter((a) => !a.completed);
  const completedActions = allActions.filter((a) => a.completed);
  const allRequiredComplete = kycVerified && bankLinked;

  const handleActionPress = (action) => {
    if (onNavigate && action.navigateTo) {
      onNavigate(action.navigateTo);
    }
  };

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

        {allRequiredComplete && outstandingActions.length === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-600 mb-4">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">All done!</h2>
            <p className="text-sm text-slate-500">You've completed all required actions.</p>
          </div>
        ) : (
          <>
            {outstandingActions.length > 0 && (
              <div className="mt-6 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Outstanding
                </p>
                {outstandingActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => handleActionPress(action)}
                    className="flex w-full gap-3 rounded-3xl bg-white p-4 shadow-sm text-left transition hover:bg-slate-50 active:scale-[0.98]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                      {action.icon ? <action.icon className="h-5 w-5" /> : null}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-800">{action.title}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${action.statusStyle || "bg-slate-100 text-slate-500"}`}>
                            {action.status}
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">{action.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {completedActions.length > 0 && (
              <div className="mt-6 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Completed
                </p>
                {completedActions.map((action) => (
                  <div
                    key={action.id}
                    className="flex gap-3 rounded-3xl bg-white/60 p-4 shadow-sm opacity-60"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-800">{action.title}</p>
                        <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-semibold text-green-600">
                          Completed
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{action.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ActionsPage;
