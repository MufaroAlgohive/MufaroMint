import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import UserOnboardingPage from "./UserOnboardingPage";
import SumsubVerification from "../components/SumsubVerification";
import { useRequiredActions } from "../lib/useRequiredActions";
import { supabase } from "../lib/supabase";

const IdentityCheckPage = ({ onBack, onComplete }) => {
  const { kycVerified, kycPending, kycNeedsResubmission, loading, refetch } = useRequiredActions();
  const [showResubmission, setShowResubmission] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [actualStatus, setActualStatus] = useState(null);

  const updateKycStatusInDb = useCallback(async (status) => {
    if (!supabase) return;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;
      
      const userId = userData.user.id;
      
      let updateData = {};
      if (status === 'verified') {
        updateData = { kyc_verified: true, kyc_pending: false, kyc_needs_resubmission: false };
      } else if (status === 'pending') {
        updateData = { kyc_verified: false, kyc_pending: true, kyc_needs_resubmission: false };
      } else if (status === 'needs_resubmission') {
        updateData = { kyc_verified: false, kyc_pending: false, kyc_needs_resubmission: true };
      }

      if (Object.keys(updateData).length > 0) {
        console.log("Updating KYC status in database:", { status, updateData });
        
        await supabase
          .from("required_actions")
          .update(updateData)
          .eq("user_id", userId);
        
        console.log("Database updated, real-time listener will trigger notification");
        refetch();
      }
    } catch (err) {
      console.error("Failed to update KYC status:", err);
    }
  }, [refetch]);

  useEffect(() => {
    const handleKycStatusChange = () => {
      refetch();
    };
    
    window.addEventListener('kycStatusChanged', handleKycStatusChange);
    return () => window.removeEventListener('kycStatusChanged', handleKycStatusChange);
  }, [refetch]);

  useEffect(() => {
    const checkSumsubStatus = async () => {
      if (loading || kycVerified) return;
      if (!kycPending && !kycNeedsResubmission) return;
      
      setCheckingStatus(true);
      
      try {
        const { data: userData } = await supabase?.auth.getUser();
        if (!userData?.user?.id) {
          setCheckingStatus(false);
          return;
        }

        const response = await fetch("/api/sumsub/check-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: userData.user.id }),
        });

        const data = await response.json();
        
        if (data.success && data.status) {
          const reviewStatus = data.status.reviewStatus;
          const reviewAnswer = data.status.reviewResult?.reviewAnswer;
          const rejectType = data.status.reviewResult?.reviewRejectType;

          if ((reviewStatus === "completed" || reviewStatus === "onHold") && reviewAnswer === "GREEN") {
            setActualStatus('verified');
            await updateKycStatusInDb('verified');
          } else if (reviewAnswer === "RED") {
            if (rejectType === "RETRY") {
              setActualStatus('needs_resubmission');
              if (!kycNeedsResubmission) {
                await updateKycStatusInDb('needs_resubmission');
              }
            }
          } else if (reviewStatus === "pending" || reviewStatus === "queued" || reviewStatus === "onHold") {
            setActualStatus('pending');
          }
        }
      } catch (err) {
        console.error("Failed to check Sumsub status:", err);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkSumsubStatus();
  }, [loading, kycVerified, kycPending, kycNeedsResubmission, updateKycStatusInDb]);

  if (loading || checkingStatus) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mb-4"></div>
        <p className="text-sm text-slate-500">Checking verification status...</p>
      </div>
    );
  }

  if (kycVerified || actualStatus === 'verified') {
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
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-600 mb-6">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Identity Verified</h2>
            <p className="text-sm text-slate-500 mb-8 max-w-xs">
              Your identity has been successfully verified. You have full access to all features.
            </p>
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

  if (kycPending && actualStatus !== 'needs_resubmission') {
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

  if (kycNeedsResubmission || actualStatus === 'needs_resubmission') {
    if (showResubmission) {
      return (
        <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
          <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-10 pt-12 md:max-w-md md:px-8">
            <header className="flex items-center justify-between mb-8">
              <button
                type="button"
                onClick={() => setShowResubmission(false)}
                aria-label="Back"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-lg font-semibold">Resubmit Documents</h1>
              <div className="h-10 w-10" aria-hidden="true" />
            </header>

            <div className="flex-1">
              <SumsubVerification 
                onVerified={() => {
                  refetch();
                  if (onComplete) onComplete();
                }}
              />
            </div>
          </div>
        </div>
      );
    }

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

          <div className="flex flex-col items-center justify-center text-center mt-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-6">
              <AlertTriangle className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Attention Required</h2>
            <p className="text-sm text-slate-500 mb-4 max-w-xs">
              We couldn't verify your identity with the documents you provided. Please resubmit clearer documents.
            </p>
            
            <div className="bg-amber-50 rounded-2xl p-4 mb-8 w-full max-w-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm font-medium text-amber-900">Common issues:</p>
                  <ul className="text-xs text-amber-700 mt-2 space-y-1">
                    <li>• Blurry or unclear photos</li>
                    <li>• Document partially cut off</li>
                    <li>• Glare or shadows on document</li>
                    <li>• Expired identification</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3 w-full max-w-xs">
              <button
                type="button"
                onClick={() => setShowResubmission(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 px-8 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 hover:bg-amber-600"
              >
                <RefreshCw className="h-4 w-4" />
                Resubmit Documents
              </button>
              <button
                type="button"
                onClick={onBack}
                className="w-full inline-flex items-center justify-center rounded-full bg-slate-200 px-8 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-300"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <UserOnboardingPage 
      onBack={onBack} 
      onComplete={onComplete} 
    />
  );
};

export default IdentityCheckPage;
