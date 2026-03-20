import React, { useEffect, useState, useRef, useCallback } from "react";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Landmark, CreditCard } from "lucide-react";
import { useProfile } from "../lib/useProfile";
import { supabase } from "../lib/supabase";

const PaymentPage = ({ onBack, strategy, amount, baseAmount, shareCount, onSuccess, onCancel, onOpenDeposit }) => {
  const { profile } = useProfile();
  const [paymentStatus, setPaymentStatus] = useState("method-selection");
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const hasInitialized = useRef(false);
  const isMounted = useRef(true);
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(true);

  const isStrategyPurchase = !!(strategy?.holdings || strategy?.risk_level || strategy?.slug);
  const assetTypeLabel = isStrategyPurchase ? "Strategy" : "Individual Stock";

  const recordInvestment = useCallback(async (paymentReference = "") => {
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const stratId = strategy?.strategyId || (isStrategyPurchase ? strategy?.id : null);
        const recordData = {
          securityId: strategy?.id,
          symbol: strategy?.symbol || strategy?.short_name || "",
          name: strategy?.name || "",
          amount: amount,
          baseAmount: baseAmount || amount,
          strategyId: stratId,
          paymentReference,
          paymentMethod: selectedMethod,
          ...(shareCount ? { shareCount: Number(shareCount) } : {}),
        };
        const headers = { "Content-Type": "application/json" };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch("/api/record-investment", {
          method: "POST",
          headers,
          body: JSON.stringify(recordData),
        });

        if (res.ok || res.status === 409) {
          return true;
        }

        const errorBody = await res.text();
        console.warn(`Record attempt ${attempt}/${maxRetries} failed (${res.status}):`, errorBody);
        if (res.status === 400) {
          return false;
        }
      } catch (recordError) {
        console.warn(`Record attempt ${attempt}/${maxRetries} network error:`, recordError.message);
      }

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    return false;
  }, [amount, baseAmount, isStrategyPurchase, selectedMethod, shareCount, strategy]);

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
        share_count: shareCount ? Number(shareCount) : null,
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

        const recorded = await recordInvestment(response?.reference || "");

        if (!recorded) {
          console.error("Failed to record investment after all retries. Payment ref:", response?.reference, "— can be recovered via reconciliation.");
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
  }, [strategy, amount, profile, onSuccess, onCancel, shareCount, recordInvestment]);

  const handleMethodSelection = (method) => {
    setSelectedMethod(method);
    setIsMethodModalOpen(false);
    if (method === "paystack") {
      setPaymentStatus("initializing");
      return;
    }
    setPaymentStatus("eft-instructions");
    onOpenDeposit?.();
  };

  const handleEftConfirm = async () => {
    setPaymentStatus("processing");
    const eftReference = `EFT-${Date.now()}`;
    const recorded = await recordInvestment(eftReference);

    if (!recorded) {
      setPaymentStatus("failed");
      setErrorMessage("Could not confirm your EFT. Please try again or use Paystack.");
      return;
    }

    setPaymentStatus("success");
    setTimeout(() => onSuccess?.({ reference: eftReference, method: "direct_eft" }), 1500);
  };

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (hasInitialized.current) return;
    if (selectedMethod !== "paystack") return;
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
  }, [profile, launchPaystack, selectedMethod]);

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

        {isMethodModalOpen && (
          <div className="fixed inset-0 z-20 flex items-end justify-center bg-slate-950/50 px-4 pb-8 pt-20">
            <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
              <h2 className="text-base font-semibold text-slate-900">Choose funding method</h2>
              <p className="mt-1 text-xs text-slate-600">
                Select how you want to fund this {assetTypeLabel.toLowerCase()} investment.
              </p>

              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => handleMethodSelection("direct_eft")}
                  className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-violet-300 hover:bg-violet-50"
                >
                  <div className="flex items-start gap-3">
                    <Landmark className="h-5 w-5 text-violet-700 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Direct EFT</p>
                      <p className="text-xs text-slate-600">Manual bank transfer for strategies and individual stocks.</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleMethodSelection("paystack")}
                  className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-violet-300 hover:bg-violet-50"
                >
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-violet-700 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Paystack</p>
                      <p className="text-xs text-slate-600">Instant checkout using card, bank, or transfer.</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="mt-20 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm text-center">
          {paymentStatus === "method-selection" && (
            <>
              <Loader2 className="h-16 w-16 mx-auto text-violet-600 animate-spin mb-4" />
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Waiting for selection</h2>
              <p className="text-sm text-slate-600">Please choose a funding method to continue</p>
            </>
          )}

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

          {paymentStatus === "eft-instructions" && (
            <div className="text-left">
              <h2 className="text-lg font-semibold text-slate-900 mb-2 text-center">Direct EFT details</h2>
              <p className="text-xs text-slate-600 mb-4 text-center">Use these details to pay, then confirm below.</p>
              <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Account Name</span>
                  <span className="font-semibold text-slate-900">MINT PLATFORMS (PTY) LTD</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Bank</span>
                  <span className="font-semibold text-slate-900">Standard Bank</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Account Number</span>
                  <span className="font-semibold text-slate-900">02 154 470 0</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Branch Code</span>
                  <span className="font-semibold text-slate-900">002064</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">SWIFT Code</span>
                  <span className="font-semibold text-slate-900">SBZAZAJJ</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Reference</span>
                  <span className="font-semibold text-slate-900">{profile?.mintNumber || "Loading..."}</span>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-500 text-center">
                Always use your Mint number as the payment reference so we can allocate your investment correctly.
              </p>
              <button
                type="button"
                onClick={() => onOpenDeposit?.()}
                className="mt-3 w-full rounded-2xl border border-violet-200 bg-violet-50 py-3 text-xs font-semibold text-violet-700"
              >
                View Deposit Page Details
              </button>
              <button
                type="button"
                onClick={handleEftConfirm}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#5b21b6] to-[#7c3aed] py-3 text-sm font-semibold text-white shadow-lg"
              >
                I have paid by EFT
              </button>
            </div>
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
              <span className="text-xs font-semibold text-slate-900">
                {selectedMethod === "direct_eft" ? "Direct EFT" : selectedMethod === "paystack" ? "Paystack" : "Not selected"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
