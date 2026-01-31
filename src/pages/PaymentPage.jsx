import React, { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useProfile } from "../lib/useProfile";

const PaymentPage = ({ onBack, strategy, amount, onSuccess, onCancel }) => {
  const { profile } = useProfile();
  const [paymentStatus, setPaymentStatus] = useState("initializing"); // initializing, processing, success, failed
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const initializePaystack = () => {
      if (!window.PaystackPop) {
        console.error("Paystack SDK not loaded");
        setPaymentStatus("failed");
        setErrorMessage("Payment system unavailable. Please try again later.");
        return;
      }

      const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      if (!publicKey) {
        console.error("Paystack public key missing");
        setPaymentStatus("failed");
        setErrorMessage("Payment system unavailable. Please try again later.");
        return;
      }

      setPaymentStatus("processing");

      const handler = new window.PaystackPop({
        key: publicKey,
        email: profile?.email || "user@example.com",
        amount: Math.round((amount || 0) * 100),
        currency: strategy?.currency || "ZAR",
        ref: `MINT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          strategy_id: strategy?.id,
          strategy_name: strategy?.name,
          user_id: profile?.id,
          investment_amount: amount,
        },
        onClose: function () {
          console.log("Payment window closed");
          setPaymentStatus("failed");
          setErrorMessage("Payment cancelled");
          setTimeout(() => onCancel?.(), 2000);
        },
        callback: function (response) {
          console.log("Payment successful:", response);
          setPaymentStatus("success");
          setTimeout(() => {
            onSuccess?.(response);
          }, 2000);
        },
      });

      handler.open();
    };

    // Small delay to ensure component is mounted
    const timer = setTimeout(initializePaystack, 500);

    return () => clearTimeout(timer);
  }, [strategy, amount, profile, onSuccess, onCancel]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-3 pt-12 md:max-w-md md:px-6">
        {/* Header */}
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

        {/* Payment Status Card */}
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

        {/* Payment Info */}
        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Strategy</span>
              <span className="text-xs font-semibold text-slate-900">{strategy?.name || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Amount</span>
              <span className="text-xs font-semibold text-slate-900">
                {strategy?.currency || "R"}{amount?.toLocaleString() || "0"}
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
