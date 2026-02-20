import React, { useEffect, useState, useRef, useCallback } from "react";
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useProfile } from "../lib/useProfile";
import { supabase } from "../lib/supabase";

const PaymentPage = ({ onBack, strategy, amount, shareCount, onSuccess, onCancel }) => {
  const { profile } = useProfile();
  const [paymentStatus, setPaymentStatus] = useState("initializing");
  const [errorMessage, setErrorMessage] = useState("");
  const hasInitialized = useRef(false);
  const isMounted = useRef(true);

  const launchPaystack = useCallback(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) {
      console.error("Paystack public key missing");
      setPaymentStatus("failed");
      setErrorMessage("Payment system unavailable. Please try again later.");
      return;
    }

    const chargeAmount = Math.round((amount || 0) * 100);
    if (!chargeAmount || chargeAmount <= 0) {
      setPaymentStatus("failed");
      setErrorMessage("Invalid payment amount.");
      return;
    }

    setPaymentStatus("processing");

    const paystack = new window.PaystackPop();
    paystack.newTransaction({
      key: publicKey,
      email: profile?.email || "user@example.com",
      amount: chargeAmount,
      currency: "ZAR",
      channels: ["card", "bank", "bank_transfer"],
      ref: `MINT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        strategy_id: strategy?.id,
        strategy_name: strategy?.name,
        user_id: profile?.id,
        investment_amount: amount,
      },
      onClose: function () {
        console.log("Payment window closed");
        if (!isMounted.current) return;
        setPaymentStatus("failed");
        setErrorMessage("Payment cancelled");
        setTimeout(() => onCancel?.(), 2000);
      },
      onSuccess: async function (response) {
        console.log("Payment successful:", response);
        if (!isMounted.current) return;
        setPaymentStatus("success");

        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          const isStrategy = !!(strategy?.holdings || strategy?.risk_level || strategy?.slug);
          const stratId = strategy?.strategyId || (isStrategy ? strategy?.id : null);
          const recordData = {
            securityId: strategy?.id,
            symbol: strategy?.symbol || strategy?.short_name || "",
            name: strategy?.name || "",
            amount: amount,
            strategyId: stratId,
            paymentReference: response?.reference || "",
            ...(shareCount ? { shareCount: Number(shareCount) } : {}),
          };
          const headers = { "Content-Type": "application/json" };
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }
          await fetch("/api/record-investment", {
            method: "POST",
            headers,
            body: JSON.stringify(recordData),
          });
        } catch (recordError) {
          console.error("Failed to record investment:", recordError);
        }

        setTimeout(() => {
          onSuccess?.(response);
        }, 2000);
      },
      onError: function (error) {
        console.error("Payment error:", error);
        if (!isMounted.current) return;
        setPaymentStatus("failed");
        setErrorMessage("Payment failed. Please try again.");
      },
    });
  }, [strategy, amount, profile, onSuccess, onCancel]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (hasInitialized.current) return;
    if (!profile?.email) return;

    let attempts = 0;
    const maxAttempts = 20;

    const tryInit = () => {
      attempts++;
      if (hasInitialized.current) return;

      if (window.PaystackPop) {
        console.log("Paystack SDK ready, launching payment...");
        launchPaystack();
        return;
      }

      if (attempts >= maxAttempts) {
        console.error("Paystack SDK failed to load after", maxAttempts, "attempts");
        setPaymentStatus("failed");
        setErrorMessage("Payment system unavailable. Please try again later.");
        return;
      }

      setTimeout(tryInit, 500);
    };

    setTimeout(tryInit, 300);
  }, [profile, launchPaystack]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-3 pt-12 md:max-w-md md:px-6">
        <header className="flex items-center justify-center gap-3 mb-6 relative">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Payment</h1>
        </header>

        <section className="mt-20 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm text-center">
          {paymentStatus === "initializing" && (
            <>
              <Loader2 className="h-16 w-16 mx-auto text-violet-600 animate-spin mb-4" />
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Initializing Payment</h2>
              <p className="text-sm text-slate-600">Please wait...</p>
            </>
          )}

          {paymentStatus === "processing" && (
            <>
              <Loader2 className="h-16 w-16 mx-auto text-violet-600 animate-spin mb-4" />
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Processing Payment</h2>
              <p className="text-sm text-slate-600">Complete payment in the popup window</p>
            </>
          )}

          {paymentStatus === "success" && (
            <>
              <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-600 mb-4" />
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Payment Successful!</h2>
              <p className="text-sm text-slate-600">Your investment is being processed</p>
            </>
          )}

          {paymentStatus === "failed" && (
            <>
              <XCircle className="h-16 w-16 mx-auto text-rose-600 mb-4" />
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Payment Failed</h2>
              <p className="text-sm text-slate-600">{errorMessage || "Something went wrong"}</p>
              <button
                type="button"
                onClick={onBack}
                className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] py-3 text-sm font-semibold text-white shadow-lg"
              >
                Try Again
              </button>
            </>
          )}
        </section>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Strategy</span>
              <span className="text-xs font-semibold text-slate-900">{strategy?.name || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Total Cost (incl. fees)</span>
              <span className="text-xs font-semibold text-slate-900">
                {strategy?.currency || "R"}{amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-600">Payment Method</span>
              <span className="text-xs font-semibold text-slate-900">Paystack</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
