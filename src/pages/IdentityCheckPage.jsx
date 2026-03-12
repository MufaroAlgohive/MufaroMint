import React, { useState, useEffect } from "react";
import { ArrowLeft, Clock, CheckCircle2 } from "lucide-react";
import UserOnboardingPage from "./UserOnboardingPage";
import { useSumsubStatus } from "../lib/useSumsubStatus";
import { supabase } from "../lib/supabase";
import { parseOnboardingFlags } from "../lib/checkOnboardingComplete";

const IdentityCheckPage = ({ onBack, onComplete }) => {
  const { kycVerified, kycPending, loading } = useSumsubStatus();
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
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
          .select("kyc_status, sumsub_raw")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1);
        const record = data?.[0];
        const { allComplete } = parseOnboardingFlags(record);
        if (allComplete) {
          setOnboardingComplete(true);
        }
      } catch {
      } finally {
        setCheckingOnboarding(false);
      }
    };
    checkOnboardingStatus();
  }, []);

  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mb-4"></div>
        <p className="text-sm text-slate-500">Checking verification status...</p>
      </div>
    );
  }

  if (kycVerified && onboardingComplete) {
    return (
      <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
        <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-10 pt-12 md:max-w-md md:px-8">
          <header className="flex items-center justify-between mb-8">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold">Onboarding</h1>
            <div className="h-10 w-10" aria-hidden="true" />
          </header>

          <div className="flex flex-col items-center justify-center text-center mt-12">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-600 mb-6">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Onboarding Complete</h2>
            <p className="text-sm text-slate-500 mb-8 max-w-xs">
              Your identity has been verified and all onboarding steps are complete. You have full access to all features.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (kycPending) {
    return (
      <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
        <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-10 pt-12 md:max-w-md md:px-8">
          <header className="flex items-center justify-between mb-8">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold">Identity Check</h1>
            <div className="h-10 w-10" aria-hidden="true" />
          </header>

          <div className="flex flex-col items-center justify-center text-center mt-12">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-600 mb-6">
              <Clock className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Under Review</h2>
            <p className="text-sm text-slate-500 mb-4 max-w-xs">
              Your identity verification is currently being reviewed by our team.
            </p>
            <p className="text-xs text-slate-400 mb-8 max-w-xs">
              This usually takes a few minutes to a few hours. We'll notify you once the review is complete.
            </p>
            
            <div className="bg-blue-50 rounded-2xl p-4 mb-8 w-full max-w-xs">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm font-medium text-blue-900">What happens next?</p>
                  <ul className="text-xs text-blue-700 mt-2 space-y-1">
                    <li>• Our team reviews your documents</li>
                    <li>• You'll receive a notification</li>
                    <li>• Full access once approved</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }



  return (
    <UserOnboardingPage 
      onBack={onBack} 
      onComplete={() => {
        setOnboardingComplete(true);
        if (onComplete) onComplete();
      }} 
    />
  );
};

export default IdentityCheckPage;
