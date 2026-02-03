import { useState, useEffect, useCallback } from "react";
import SumsubWebSdk from "@sumsub/websdk-react";
import { supabase } from "../lib/supabase";

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

const ClockIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const XCircleIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const LoadingSpinner = () => (
  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
);

const SumsubVerification = ({ onVerified, onGoHome }) => {
  const [accessToken, setAccessToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [rejectionDetails, setRejectionDetails] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [retryCount, setRetryCount] = useState(0);

  // Create notification in database
  const createNotification = useCallback(async (title, body, type = "kyc", payload = {}) => {
    try {
      if (!supabase) return;
      
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id;
      
      if (!currentUserId) return;
      
      await supabase.from("notifications").insert({
        user_id: currentUserId,
        title,
        body,
        type,
        payload,
      });
      
      console.log("Notification created:", title);
    } catch (err) {
      console.error("Error creating notification:", err);
    }
  }, []);

  useEffect(() => {
    const initializeSumsub = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user from Supabase
        let currentUserId = null;
        if (supabase) {
          const { data: userData } = await supabase.auth.getUser();
          currentUserId = userData?.user?.id;
        }
        
        if (!currentUserId) {
          currentUserId = `user_${Date.now()}`;
        }
        
        setUserId(currentUserId);

        // Request access token from backend
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
      } finally {
        setLoading(false);
      }
    };

    initializeSumsub();
  }, [retryCount]);

  // Handler for token expiration
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

  // Update KYC status in database
  const updateKycStatus = useCallback(async (status) => {
    try {
      if (!supabase) return;
      
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id;
      
      if (!currentUserId) return;
      
      // Status can be: 'verified', 'pending', 'needs_resubmission', or false (reset)
      let updateData = { user_id: currentUserId };
      
      if (status === 'verified') {
        updateData.kyc_verified = true;
        updateData.kyc_pending = false;
        updateData.kyc_needs_resubmission = false;
      } else if (status === 'pending') {
        updateData.kyc_verified = false;
        updateData.kyc_pending = true;
        updateData.kyc_needs_resubmission = false;
      } else if (status === 'needs_resubmission') {
        updateData.kyc_verified = false;
        updateData.kyc_pending = false;
        updateData.kyc_needs_resubmission = true;
      } else {
        // Reset or false
        updateData.kyc_verified = false;
        updateData.kyc_pending = false;
        updateData.kyc_needs_resubmission = false;
      }
      
      const { error } = await supabase
        .from("required_actions")
        .upsert(updateData, {
          onConflict: 'user_id'
        });
      
      if (error) {
        console.error("Failed to update KYC status:", error);
      } else {
        console.log("KYC status updated successfully:", status);
        // Dispatch custom event to notify all useRequiredActions hooks to refetch
        window.dispatchEvent(new CustomEvent('kycStatusChanged', { detail: { status } }));
      }
    } catch (err) {
      console.error("Error updating KYC status:", err);
    }
  }, []);

  // Parse rejection labels to user-friendly messages
  const parseRejectionLabels = (labels) => {
    const labelMappings = {
      UNSATISFACTORY_PHOTOS: "Unsatisfactory photos - please retake with better lighting",
      DOCUMENT_DAMAGED: "Document appears damaged",
      DOCUMENT_EXPIRED: "Document has expired",
      DOCUMENT_MISSING_PART: "Part of the document is missing or cut off",
      FORGERY: "Document could not be verified",
      NOT_READABLE: "Document is not readable - please provide clearer photos",
      GRAPHIC_EDITOR: "Image appears to have been edited",
      SCREENSHOTS: "Screenshots are not accepted",
      SELFIE_MISMATCH: "Selfie does not match the document photo",
      BAD_SELFIE: "Selfie quality is not sufficient",
      BAD_FACE_MATCHING: "Face matching failed",
      FRAUDULENT_PATTERNS: "Suspicious patterns detected",
      BLACKLISTED: "Applicant is on a restricted list",
    };

    if (!labels || labels.length === 0) return [];
    
    return labels.map(label => labelMappings[label] || label.replace(/_/g, ' ').toLowerCase());
  };

  // Handle SDK messages
  const messageHandler = useCallback((type, payload) => {
    console.log("Sumsub SDK message:", type, payload);

    switch (type) {
      case "idCheck.onApplicantLoaded":
        console.log("Applicant loaded:", payload);
        // Check if there's already a status from previous attempts
        break;
        
      case "idCheck.onApplicantSubmitted":
        console.log("Applicant submitted for review");
        setVerificationStatus("pending");
        // Mark as pending in database - NOT verified
        updateKycStatus('pending');
        createNotification(
          "Documents Submitted",
          "Your identity documents have been submitted and are being reviewed. We'll notify you once the review is complete.",
          "kyc",
          { status: "pending" }
        );
        break;
        
      case "idCheck.onApplicantResubmitted":
        console.log("Applicant resubmitted");
        setVerificationStatus("pending");
        // Mark as pending in database after resubmission
        updateKycStatus('pending');
        createNotification(
          "Documents Resubmitted",
          "Your updated documents have been submitted for review.",
          "kyc",
          { status: "pending" }
        );
        break;
      
      case "idCheck.onApplicantStatusChanged":
      case "idCheck.applicantStatus":
        console.log("Applicant status changed:", payload);
        
        if (payload?.reviewStatus === "completed") {
          if (payload?.reviewResult?.reviewAnswer === "GREEN") {
            setVerificationComplete(true);
            setVerificationStatus("approved");
            updateKycStatus('verified');
            createNotification(
              "Identity Verified!",
              "Congratulations! Your identity has been successfully verified. You now have full access to all features.",
              "kyc",
              { status: "approved" }
            );
            if (onVerified) {
              onVerified();
            }
          } else if (payload?.reviewResult?.reviewAnswer === "RED") {
            setVerificationStatus("rejected");
            
            const rejectType = payload?.reviewResult?.reviewRejectType;
            const rejectLabels = payload?.reviewResult?.rejectLabels || [];
            const clientComment = payload?.reviewResult?.clientComment;
            
            const parsedLabels = parseRejectionLabels(rejectLabels);
            
            setRejectionDetails({
              type: rejectType,
              labels: parsedLabels,
              comment: clientComment,
              canRetry: rejectType === "RETRY",
            });
            
            // Set appropriate status based on rejection type
            if (rejectType === "RETRY") {
              updateKycStatus('needs_resubmission');
            } else {
              updateKycStatus(false);
            }
            
            const notificationBody = rejectType === "RETRY"
              ? `Your verification needs attention: ${parsedLabels.join(", ") || "Please review and resubmit your documents."}`
              : "Your verification was not successful. Please contact support for assistance.";
            
            createNotification(
              rejectType === "RETRY" ? "Action Required: Resubmission Needed" : "Verification Unsuccessful",
              notificationBody,
              "kyc",
              { status: "rejected", canRetry: rejectType === "RETRY", labels: rejectLabels }
            );
          }
        } else if (payload?.reviewStatus === "pending" || payload?.reviewStatus === "queued") {
          // Status is pending review - do NOT mark as verified yet
          setVerificationStatus("pending");
          updateKycStatus('pending');
        }
        break;

      case "idCheck.onStepCompleted":
        console.log("Step completed:", payload);
        setCompletedSteps(prev => {
          const stepInfo = {
            type: payload?.idDocSetType || payload?.idDocType || "Step",
            docType: payload?.idDocType,
            completedAt: new Date().toISOString(),
          };
          // Avoid duplicates
          if (prev.some(s => s.type === stepInfo.type)) {
            return prev;
          }
          return [...prev, stepInfo];
        });
        break;

      case "idCheck.onError":
        console.error("SDK error:", payload);
        break;

      default:
        break;
    }
  }, [onVerified, updateKycStatus, createNotification]);

  // Handle SDK errors
  const errorHandler = useCallback((error) => {
    console.error("Sumsub SDK error:", error);
    setError("An error occurred during verification. Please try again.");
  }, []);

  // SDK configuration
  const config = {
    lang: "en",
    theme: "light",
  };

  // SDK options
  const options = {
    addViewportTag: false,
    adaptIframeHeight: true,
  };

  // Format step name for display
  const formatStepName = (type) => {
    const names = {
      IDENTITY: "ID Document",
      SELFIE: "Selfie Verification",
      PROOF_OF_RESIDENCE: "Proof of Address",
      PHONE_VERIFICATION: "Phone Verification",
      EMAIL_VERIFICATION: "Email Verification",
      QUESTIONNAIRE: "Questionnaire",
    };
    return names[type] || type?.replace(/_/g, ' ') || "Document";
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

  // Rejection screen with detailed information
  if (verificationStatus === "rejected" && rejectionDetails) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
          <XCircleIcon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">
          {rejectionDetails.canRetry ? "Resubmission Required" : "Verification Unsuccessful"}
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          {rejectionDetails.canRetry 
            ? "Some documents need to be resubmitted. Please review the issues below."
            : "Your verification could not be completed. Please contact support for assistance."}
        </p>
        
        {rejectionDetails.labels && rejectionDetails.labels.length > 0 && (
          <div className="bg-red-50 rounded-xl p-4 text-left mb-4">
            <p className="text-xs font-medium text-red-800 mb-2">Issues found:</p>
            <ul className="space-y-2">
              {rejectionDetails.labels.map((label, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-red-700">
                  <XCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {rejectionDetails.comment && (
          <div className="bg-slate-50 rounded-xl p-4 text-left mb-4">
            <p className="text-xs font-medium text-slate-700 mb-1">Additional notes:</p>
            <p className="text-xs text-slate-600">{rejectionDetails.comment}</p>
          </div>
        )}

        {completedSteps.length > 0 && (
          <div className="bg-emerald-50 rounded-xl p-4 text-left mb-4">
            <p className="text-xs font-medium text-emerald-800 mb-2">Completed steps:</p>
            <ul className="space-y-1">
              {completedSteps.map((step, index) => (
                <li key={index} className="flex items-center gap-2 text-xs text-emerald-700">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>{formatStepName(step.type)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {rejectionDetails.canRetry && (
          <div className="bg-slate-50 rounded-xl p-4 text-left mb-4">
            <p className="text-xs text-slate-600 mb-2">Tips for successful verification:</p>
            <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
              <li>Ensure good lighting when taking photos</li>
              <li>Make sure all text on documents is clearly readable</li>
              <li>Avoid glare and shadows on your documents</li>
              <li>Use original documents, not copies or screenshots</li>
            </ul>
          </div>
        )}

        {rejectionDetails.canRetry ? (
          <button
            type="button"
            onClick={() => {
              // Reset state to allow SDK to reinitialize for retry
              setRejectionDetails(null);
              setVerificationStatus(null);
              setCompletedSteps([]);
              setAccessToken(null);
              setLoading(true);
              setError(null);
              // Trigger useEffect to re-run initialization
              setRetryCount(prev => prev + 1);
            }}
            className="px-6 py-2.5 rounded-xl font-medium text-white transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
          >
            Try Again
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              // For permanent rejection, go back to home
              if (onGoHome) {
                onGoHome();
              }
            }}
            className="px-6 py-2.5 rounded-xl font-medium text-white transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
          >
            Contact Support
          </button>
        )}
      </div>
    );
  }

  if (error) {
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
          onClick={() => {
            setError(null);
            setLoading(true);
            setRetryCount(prev => prev + 1);
          }}
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

  // Pending/Submitted screen - shows actual pending status, does NOT mark as verified
  if (verificationStatus === "pending") {
    return (
      <div className="w-full max-w-md mx-auto text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <ClockIcon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Under Review</h3>
        <p className="text-sm text-slate-500 mb-4">Your documents are being reviewed by our team</p>
        
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-sm font-medium mb-4">
          <ClockIcon className="w-4 h-4" />
          <span>Pending Review</span>
        </div>

        {completedSteps.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-4 text-left mb-4">
            <p className="text-xs font-medium text-slate-700 mb-2">Submitted documents:</p>
            <ul className="space-y-1">
              {completedSteps.map((step, index) => (
                <li key={index} className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                  <span>{formatStepName(step.type)}</span>
                  <span className="text-slate-400">- Submitted</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-slate-400 mb-4">
          This usually takes a few minutes. We'll notify you when the review is complete.
        </p>
        
        <p className="text-xs text-slate-500 bg-blue-50 rounded-lg p-3 mb-6">
          Your verification is still in progress. You'll be notified once the review is complete.
        </p>
        
        <button
          type="button"
          onClick={() => {
            if (onGoHome) {
              onGoHome();
            }
          }}
          className="w-full px-6 py-3 rounded-xl font-medium text-white transition-all duration-200 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg"
        >
          OK
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
