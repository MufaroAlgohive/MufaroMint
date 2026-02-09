import React, { useRef, useState, useEffect, useCallback } from "react";
import { ArrowLeft, Landmark, ShieldCheck, CheckCircle2, Shield, X, XCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useRequiredActions } from "../lib/useRequiredActions";

const BankLinkPage = ({ onBack, onComplete }) => {
  const { bankLinked } = useRequiredActions();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [consumerUrl, setConsumerUrl] = useState(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const collectionIdRef = useRef(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    if (bankLinked) setStatus("already_linked");
  }, [bankLinked]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const startSession = async () => {
    setStatus("connecting");
    setMessage("Initializing secure connection...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication required");

      const response = await fetch("/api/banking/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (!data.success) {
        const errMsg = typeof data.error === "string" ? data.error : data.error?.message || "Connection failed";
        throw new Error(errMsg);
      }

      collectionIdRef.current = data.collectionId;
      setIframeLoaded(false);
      setConsumerUrl(data.consumerUrl);
      setStatus("banking");
      setMessage("");
      startPolling(data.collectionId);
    } catch (err) {
      console.error("Banking initiate error:", err);
      setStatus("error");
      setMessage(err.message);
    }
  };

  const handleCancel = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setConsumerUrl(null);
    setStatus("cancelled");
    setMessage("Bank linking was cancelled. You can try again when you're ready.");
  }, []);

  const pollCountRef = useRef(0);
  const MAX_POLLS = 120;

  const startPolling = (collectionId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollCountRef.current = 0;

    pollingRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > MAX_POLLS) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setConsumerUrl(null);
        setStatus("error");
        setMessage("Connection timed out. Please try again.");
        return;
      }

      try {
        const res = await fetch(`/api/banking/status?collectionId=${collectionId}`);
        const data = await res.json();
        const outcome = data.outcome;

        if (outcome === "completed") {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setConsumerUrl(null);
          setStatus("capturing");
          setMessage("Verifying banking data...");

          try {
            const { data: { session } } = await supabase.auth.getSession();
            const captureRes = await fetch("/api/banking/capture", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: session ? `Bearer ${session.access_token}` : "",
              },
              body: JSON.stringify({ collectionId }),
            });

            const captureData = await captureRes.json();
            if (!captureRes.ok || !captureData.success) {
              throw new Error(captureData.error || "Capture failed");
            }

            setStatus("success");
            setMessage("Bank account linked successfully!");
          } catch (captureErr) {
            console.error("Capture error:", captureErr);
            setStatus("error");
            setMessage("Failed to verify banking data. Please try again.");
          }
        } else if (outcome === "failed") {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setConsumerUrl(null);
          setStatus("error");
          setMessage("Bank connection was cancelled or failed.");
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 3000);
  };

  if (status === "already_linked" || status === "success") {
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
            <h1 className="text-lg font-semibold">Link Bank Account</h1>
            <div className="h-10 w-10" aria-hidden="true" />
          </header>

          <div className="mt-16 flex flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-600 mb-4">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Bank Account Linked</h2>
            <p className="text-sm text-slate-500 mb-8">
              Your bank account has been successfully verified and linked.
            </p>
            <button
              type="button"
              onClick={() => onComplete?.()}
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-8 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "banking" && consumerUrl) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-50">
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm safe-top">
          <div className="flex items-center gap-3">
            <Landmark className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-semibold text-slate-800">Bank Verification</span>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 relative">
          {!iframeLoaded && (
            <div className="absolute inset-0 z-10 bg-white p-6 animate-pulse">
              <div className="mx-auto max-w-md space-y-6 pt-8">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-slate-200" />
                </div>
                <div className="space-y-3">
                  <div className="mx-auto h-5 w-48 rounded-lg bg-slate-200" />
                  <div className="mx-auto h-3 w-64 rounded bg-slate-100" />
                </div>
                <div className="space-y-4 pt-4">
                  <div className="h-12 w-full rounded-xl bg-slate-200" />
                  <div className="h-12 w-full rounded-xl bg-slate-200" />
                  <div className="h-12 w-full rounded-xl bg-slate-100" />
                </div>
                <div className="pt-4">
                  <div className="h-14 w-full rounded-full bg-slate-200" />
                </div>
              </div>
            </div>
          )}
          <iframe
            src={consumerUrl}
            title="TruID Bank Verification"
            className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-300 ${iframeLoaded ? "opacity-100" : "opacity-0"}`}
            allow="camera; microphone"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation allow-modals"
            onLoad={() => setIframeLoaded(true)}
          />
        </div>

        <div className="px-4 py-2 bg-white border-t border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-400 safe-bottom">
          <Shield className="h-3 w-3" />
          <span>Secured by TruID Connect</span>
        </div>
      </div>
    );
  }

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
          <h1 className="text-lg font-semibold">Link Bank Account</h1>
          <div className="h-10 w-10" aria-hidden="true" />
        </header>

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-6 py-4">
            <div
              className={`h-20 w-20 rounded-full flex items-center justify-center transition-all duration-500 ${
                status === "capturing"
                  ? "bg-amber-100 text-amber-600 animate-pulse"
                  : status === "error"
                  ? "bg-red-100 text-red-500"
                  : status === "cancelled"
                  ? "bg-slate-100 text-slate-500"
                  : "bg-blue-100 text-blue-600"
              }`}
            >
              {status === "cancelled" ? (
                <XCircle className="h-8 w-8" />
              ) : (
                <Landmark className="h-8 w-8" />
              )}
            </div>

            <div className="text-center max-w-xs">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                {status === "cancelled" ? "Linking Cancelled" : "Bank Verification"}
              </h2>
              <p className="text-sm text-slate-500">
                {message || "Securely link your bank account through TruID to enable withdrawals and payouts."}
              </p>
              {status === "error" && (
                <p className="text-xs text-red-500 font-semibold mt-2">{message}</p>
              )}
            </div>

            {(status === "idle" || status === "error" || status === "cancelled") && (
              <button
                type="button"
                onClick={startSession}
                className="w-full py-4 rounded-full bg-slate-900 text-white font-semibold text-sm shadow-lg hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="h-5 w-5" />
                {status === "error" || status === "cancelled" ? "Try Again" : "Connect Bank"}
              </button>
            )}

            {status === "connecting" && (
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                <span className="w-2 h-2 rounded-full bg-slate-500 animate-ping" />
                Connecting...
              </div>
            )}

            {status === "capturing" && (
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-spin" />
                Verifying...
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Shield className="h-4 w-4" />
          <span>Your bank details are securely verified through TruID Connect.</span>
        </div>
      </div>
    </div>
  );
};

export default BankLinkPage;
