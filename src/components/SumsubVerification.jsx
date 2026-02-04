import { useState, useEffect, useCallback } from "react";
import SumsubWebSdk from "@sumsub/websdk-react";
import { supabase } from "../lib/supabase";
import { pauseSumsubPolling, resumeSumsubPolling } from "../lib/useSumsubStatus";

const ShieldCheckIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
  </svg>
);

const CheckCircleIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const AlertCircleIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
  </svg>
);

const LoadingSpinner = () => (
  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
);

const SumsubVerification = ({ onVerified }) => {
  const [accessToken, setAccessToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'config' | 'resubmit' | 'rejected' | 'generic'
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);

  // Pause polling while the Sumsub widget is active to prevent refreshes
  useEffect(() => {
    pauseSumsubPolling();
    return () => {
      resumeSumsubPolling();
    };
  }, []);

  useEffect(() => {
    const initializeSumsub = async () => {
      try {
        setLoading(true);
        setError(null);

        let currentUserId = null;
        if (supabase) {
          const { data: userData } = await supabase.auth.getUser();
          currentUserId = userData?.user?.id;
        }
        
        if (!currentUserId) {
          currentUserId = `user_${Date.now()}`;
        }
        
        setUserId(currentUserId);

        const response = await fetch("/api/sumsub/access-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: currentUserId,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error?.message || "Failed to initialize verification");
        }

        setAccessToken(data.token);
      } catch (err) {
        console.error("Sumsub initialization error:", err);
        setError(err.message || "Failed to initialize identity verification");
        setErrorType("config");
      } finally {
        setLoading(false);
      }
    };

    initializeSumsub();
  }, []);

  const accessTokenExpirationHandler = useCallback(async () => {
    try {
      const response = await fetch("/api/sumsub/access-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        return data.token;
      }
      throw new Error("Failed to refresh token");
    } catch (err) {
      console.error("Token refresh error:", err);
      return null;
    }
  }, [userId]);

  const messageHandler = useCallback((type, payload) => {
    console.log("Sumsub SDK message:", type, payload);

    switch (type) {
      case "idCheck.onApplicantLoaded":
        console.log("Applicant loaded:", payload);
        break;
        
      case "idCheck.onApplicantSubmitted":
        console.log("Applicant submitted for review");
        setVerificationStatus("submitted");
        break;
        
      case "idCheck.onApplicantResubmitted":
        console.log("Applicant resubmitted");
        break;
        
      case "idCheck.onApplicantStatusChanged":
      case "idCheck.applicantStatus": {
        console.log("Applicant status:", payload);
        const reviewStatus = payload?.reviewStatus;
        const reviewAnswer = payload?.reviewResult?.reviewAnswer;
        const rejectType = payload?.reviewResult?.reviewRejectType;
        
        if ((reviewStatus === "completed" || reviewStatus === "onHold") && reviewAnswer === "GREEN") {
          setVerificationComplete(true);
          setVerificationStatus("approved");
          if (onVerified) {
            onVerified();
          }
        } else if (reviewAnswer === "RED") {
          setVerificationStatus("rejected");
          if (rejectType === "RETRY") {
            setError("Some documents need to be resubmitted. Please try again with clearer images.");
            setErrorType("resubmit");
          } else {
            setError("Verification was not successful. Please contact support for assistance.");
            setErrorType("rejected");
          }
        } else if (reviewStatus === "pending" || reviewStatus === "queued" || reviewStatus === "onHold") {
          setVerificationStatus("pending");
        }
        break;
      }

      case "idCheck.onStepCompleted":
        console.log("Step completed:", payload);
        break;

      case "idCheck.onError":
        console.error("SDK error:", payload);
        break;

      default:
        break;
    }
  }, [onVerified]);

  const errorHandler = useCallback((error) => {
    console.error("Sumsub SDK error:", error);
    setError("An error occurred during verification. Please try again.");
    setErrorType("generic");
  }, []);

  const handleRetry = () => {
    setError(null);
    setErrorType(null);
    setVerificationStatus(null);
    setLoading(true);
    setAccessToken(null);
    
    // Re-initialize Sumsub
    const reinitialize = async () => {
      try {
        const response = await fetch("/api/sumsub/access-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const data = await response.json();
        if (data.success) {
          setAccessToken(data.token);
        } else {
          throw new Error(data.error?.message || "Failed to reinitialize");
        }
      } catch (err) {
        setError(err.message);
        setErrorType("config");
      } finally {
        setLoading(false);
      }
    };
    reinitialize();
  };

  const config = {
    lang: "en",
    theme: "light",
  };

  const options = {
    addViewportTag: false,
    adaptIframeHeight: true,
  };

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <LoadingSpinner />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Initializing Verification</h3>
        <p className="text-sm text-slate-500">Please wait while we set up your identity verification...</p>
      </div>
    );
  }

  if (error) {
    // Resubmission needed - show retry button
    if (errorType === "resubmit") {
      return (
        <div className="w-full max-w-md mx-auto text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <AlertCircleIcon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">Resubmit Documents</h3>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="px-6 py-2.5 rounded-xl font-medium text-white transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
          >
            Try Again
          </button>
        </div>
      );
    }

    // Permanently rejected - show support contact
    if (errorType === "rejected") {
      return (
        <div className="w-full max-w-md mx-auto text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
            <AlertCircleIcon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">Verification Unsuccessful</h3>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <button
            type="button"
            onClick={() => window.open('mailto:support@example.com', '_blank')}
            className="px-6 py-2.5 rounded-xl font-medium text-white transition-all duration-200 bg-slate-600 hover:bg-slate-700"
          >
            Contact Support
          </button>
        </div>
      );
    }

    // Configuration error - show setup instructions
    return (
      <div className="w-full max-w-md mx-auto text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
          <AlertCircleIcon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Configuration Required</h3>
        <p className="text-sm text-slate-500 mb-4">{error}</p>
        <div className="bg-slate-50 rounded-xl p-4 text-left mb-4">
          <p className="text-xs text-slate-600 mb-2">To enable real identity verification:</p>
          <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
            <li>Sign up for a Sumsub account at sumsub.com</li>
            <li>Get your App Token and Secret Key from the dashboard</li>
            <li>Add them as secrets: SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY</li>
          </ol>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-xl font-medium text-white transition-all duration-200"
          style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (verificationComplete) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
          <CheckCircleIcon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Identity Verified</h3>
        <p className="text-sm text-slate-500">Your identity has been successfully verified</p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
          <CheckCircleIcon className="w-4 h-4" />
          <span>Verification Complete</span>
        </div>
      </div>
    );
  }

  if (verificationStatus === "submitted") {
    return (
      <div className="w-full max-w-md mx-auto text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center animate-pulse">
          <ShieldCheckIcon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Verification In Progress</h3>
        <p className="text-sm text-slate-500 mb-4">Your documents have been submitted and are being reviewed</p>
        <p className="text-xs text-slate-400">This usually takes a few minutes. You can proceed and we'll notify you when complete.</p>
        <button
          type="button"
          onClick={() => {
            setVerificationComplete(true);
            if (onVerified) {
              onVerified();
            }
          }}
          className="mt-6 px-6 py-2.5 rounded-xl font-medium text-white transition-all duration-200"
          style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
        >
          Continue
        </button>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
          <AlertCircleIcon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Unable to Initialize</h3>
        <p className="text-sm text-slate-500">Could not initialize identity verification. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 text-center">
        <p className="text-xs text-slate-400">
          Powered by <span className="font-medium">Sumsub</span> Identity Verification
        </p>
      </div>
      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white" style={{ minHeight: "500px" }}>
        <SumsubWebSdk
          accessToken={accessToken}
          expirationHandler={accessTokenExpirationHandler}
          config={config}
          options={options}
          onMessage={messageHandler}
          onError={errorHandler}
        />
      </div>
    </div>
  );
};

export default SumsubVerification;
