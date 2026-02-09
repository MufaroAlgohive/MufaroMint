import React, { useRef, useState, useEffect, useCallback } from "react";
import { ArrowLeft, Landmark, ShieldCheck, CheckCircle2, Shield, X, XCircle, Lock, Info, ChevronDown, ChevronUp, CreditCard, Wallet, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useRequiredActions } from "../lib/useRequiredActions";

const MintBankPage = ({ onBack, onComplete }) => {
  const { bankLinked } = useRequiredActions();
  const [step, setStep] = useState("intro");
  const [showDetails, setShowDetails] = useState(false);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [consumerUrl, setConsumerUrl] = useState(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const collectionIdRef = useRef(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    if (bankLinked) setStep("already_linked");
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

            setStep("success");
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

  if (step === "success" || step === "already_linked") {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col px-6 pb-10 min-h-screen bg-white">
        <header className="w-full flex items-center justify-between pt-10 pb-6">
          <button
            onClick={() => onBack ? onBack() : window.history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Bank Account</h1>
          <div className="h-10 w-10" aria-hidden="true" />
        </header>

        <div className="flex flex-col items-center mt-10 mb-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-5">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Successful</h2>
          <p className="text-sm text-slate-500 mt-2 text-center max-w-[280px]">Your bank account has been securely linked and verified via TruID.</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600 shrink-0">
              <Landmark className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">Primary Bank Account</p>
              <p className="text-xs text-slate-500 mt-0.5">Verified via TruID</p>
            </div>
            <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 shrink-0">
              Linked
            </span>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={() => {
              setStep("intro");
              setStatus("idle");
              setMessage("");
            }}
            className="w-full py-4 rounded-full bg-slate-900 text-white font-semibold text-sm uppercase tracking-[0.15em] shadow-lg shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Link Another Account
          </button>
          <button
            type="button"
            onClick={() => onComplete ? onComplete() : onBack ? onBack() : window.history.back()}
            className="w-full py-4 rounded-full bg-slate-100 text-slate-700 font-semibold text-sm uppercase tracking-[0.15em] active:scale-95 transition-all"
          >
            Done
          </button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Shield className="h-4 w-4" />
          <span>All accounts are securely verified through TruID Connect.</span>
        </div>
      </div>
    );
  }

  if (step === "connect" && status === "banking" && consumerUrl) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-50">
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
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

        <div className="px-4 py-2 bg-white border-t border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-400"
          style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
          <Shield className="h-3 w-3" />
          <span>Secured by TruID Connect</span>
        </div>
      </div>
    );
  }

  if (step === "connect") {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col items-center px-6 pb-10 min-h-screen bg-white">
        <header className="w-full flex items-center justify-start pt-10 pb-6">
          <button
            onClick={() => setStep("intro")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </header>

        <div className="w-full rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex flex-col items-center gap-6 py-4">
            <div className={`h-20 w-20 rounded-full flex items-center justify-center transition-all duration-500 ${
              status === "capturing"
                ? "bg-amber-100 text-amber-600 animate-pulse"
                : status === "error"
                ? "bg-red-100 text-red-500"
                : status === "cancelled"
                ? "bg-slate-100 text-slate-500"
                : "bg-blue-100 text-blue-600"
            }`}>
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
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col items-center px-6 pb-10 min-h-screen bg-white">
      <header className="w-full flex items-center justify-start pt-10 pb-6">
        <button
          onClick={() => onBack ? onBack() : window.history.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </header>

      <div className="mb-6 relative z-10 mt-4">
        <div style={{ animation: "subtleBounce 3s ease-in-out infinite" }}>
          <img
            src="/assets/images/coinAlgoMoney.png"
            alt="Mint"
            className="h-20 w-20 object-contain drop-shadow-2xl"
          />
        </div>
        <div
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-1 bg-black/10 blur-md rounded-[100%]"
          style={{ animation: "shadowScale 3s ease-in-out infinite" }}
        ></div>
        <style>{`
          @keyframes subtleBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
          @keyframes shadowScale {
            0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.2; }
            50% { transform: translateX(-50%) scale(0.8); opacity: 0.1; }
          }
        `}</style>
      </div>

      <h2 className="text-3xl font-light tracking-tight text-center text-slate-900 mb-2 leading-tight">
        <span className="mint-brand font-bold uppercase mr-1.5">MINT</span><br />Bank Linking
      </h2>
      <p className="text-sm text-slate-500 text-center max-w-[280px] mb-8">
        "Securely connect your bank account to unlock the full Mint experience."
      </p>

      <div className="w-full space-y-3 mb-6">
        {[
          { icon: <Lock size={18} />, title: "1. Secure Connection", desc: "Bank-grade encryption via TruID." },
          { icon: <Landmark size={18} />, title: "2. Account Verification", desc: "Verify your primary bank account." },
          { icon: <Wallet size={18} />, title: "3. Enable Transactions", desc: "Deposits, withdrawals & payouts." }
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-white/60 border border-white/40 shadow-sm backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm shrink-0">
              {s.icon}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-xs tracking-tight uppercase">{s.title}</h3>
              <p className="text-[10px] text-slate-500 leading-tight">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-slate-600 transition mb-2"
      >
        <Info size={14} /> How it works {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {showDetails && (
        <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100 text-[10px] text-slate-500 leading-relaxed animate-in fade-in zoom-in-95">
          We use <strong>TruID Connect</strong> to securely verify your bank account. Your credentials are never stored by Mint — 
          all verification happens directly with your bank through an encrypted channel. Once linked, you can make deposits, 
          withdrawals, and receive payouts seamlessly.
        </div>
      )}

      <button
        onClick={() => setStep("connect")}
        className="w-full py-4 bg-slate-900 text-white rounded-full text-sm font-bold uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all mt-4"
      >
        Link Bank Account
      </button>

      <footer className="mt-8 text-center opacity-40">
        <p className="text-[8px] uppercase tracking-tighter text-slate-500 max-w-[340px] mx-auto leading-relaxed">
          <span className="mint-brand">MINT</span> (Pty) Ltd is an authorised Financial Services Provider (FSP 55118) and a
          Registered Credit Provider (NCRCP22892). <span className="mint-brand">MINT</span> Reg no: 2024/644796/07
        </p>
      </footer>
    </div>
  );
};

export default MintBankPage;
