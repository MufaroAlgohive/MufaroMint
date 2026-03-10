import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  FileText,
} from "lucide-react";
import ActionsSkeleton from "../components/ActionsSkeleton";
import { useSumsubStatus } from "../lib/useSumsubStatus";
import { supabase } from "../lib/supabase";
import { parseOnboardingFlags } from "../lib/checkOnboardingComplete";

const ActionsPage = ({ onBack, onNavigate }) => {
  const { kycVerified, kycPending, kycNeedsResubmission, loading: kycLoading, rejectLabels } = useSumsubStatus();
  const [onboardingData, setOnboardingData] = useState(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!supabase) {
        setCheckingOnboarding(false);
        return;
      }
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) {
          setCheckingOnboarding(false);
          return;
        }
        const { data } = await supabase
          .from("user_onboarding")
          .select("kyc_status, employment_status, sumsub_raw")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1);
        setOnboardingData(data?.[0] || null);
      } catch {
      } finally {
        setCheckingOnboarding(false);
      }
    };
    checkOnboarding();
  }, []);

  if (kycLoading || checkingOnboarding) {
    return <ActionsSkeleton />;
  }

  const hasOnboardingRecord = !!onboardingData;
  const employmentDone = hasOnboardingRecord && onboardingData.employment_status && onboardingData.employment_status !== "not_provided";
  const onboardingMarkedComplete = onboardingData?.kyc_status === "onboarding_complete" || onboardingData?.kyc_status === "verified";
  const identityComplete = kycVerified && (employmentDone || onboardingMarkedComplete);

  const { bankDone, mandateAgreed, riskDone, sofDone, allComplete: allOnboardingComplete } = parseOnboardingFlags(onboardingData);

  const getOnboardingStatus = () => {
    if (allOnboardingComplete) return { text: "Complete", style: "bg-green-100 text-green-600" };
    if (kycNeedsResubmission) return { text: "Documents Required", style: "bg-amber-100 text-amber-700" };
    if (kycPending) return { text: "Under Review", style: "bg-blue-100 text-blue-600" };
    if (!identityComplete) return { text: "Action Required", style: "bg-red-50 text-red-600" };
    return { text: "Required", style: "bg-slate-100 text-slate-500" };
  };

  const onboardingStatus = getOnboardingStatus();

  const getOnboardingDescription = () => {
    if (allOnboardingComplete) return "Identity verified and all onboarding steps complete";
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
        return labelMap[firstLabel] || "Some documents need to be submitted or resubmitted";
      }
      return "Some documents need to be submitted or resubmitted";
    }
    if (kycPending) return "Your documents are being reviewed";
    if (!identityComplete) return "Verify your identity to get started";
    const missing = [];
    if (!bankDone) missing.push("bank details");
    if (!mandateAgreed) missing.push("mandate");
    if (!riskDone) missing.push("risk disclosure");
    if (!sofDone) missing.push("source of funds");
    if (missing.length > 0) return `Still needed: ${missing.join(", ")}`;
    return "Complete your onboarding steps";
  };

  const allActions = [
    {
      id: "onboarding",
      title: "Complete onboarding",
      description: getOnboardingDescription(),
      status: onboardingStatus.text,
      statusStyle: onboardingStatus.style,
      icon: FileText,
      completed: allOnboardingComplete,
      navigateTo: "identityCheck",
    },
  ];

  const outstandingActions = allActions.filter((a) => !a.completed && !a.disabled);
  const completedActions = allActions.filter((a) => a.completed);
  const allRequiredComplete = allOnboardingComplete;

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
            <p className="text-sm text-slate-500 mb-6">You've completed all required actions.</p>
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2.5 rounded-full font-medium text-white text-sm transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
            >
              Go to Home
            </button>
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
