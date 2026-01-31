import React from "react";
import { CheckCircle2 } from "lucide-react";

const PaymentSuccessPage = ({ onDone }) => (
  <div className="min-h-screen bg-slate-50 text-slate-900">
    <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-10 pt-20 text-center md:max-w-md md:px-8">
      <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
      <h1 className="mt-6 text-2xl font-semibold">Payment successful</h1>
      <p className="mt-2 text-sm text-slate-600">
        Your investment is being processed. We will notify you once it is confirmed.
      </p>
      <button
        type="button"
        onClick={onDone}
        className="mt-8 w-full rounded-2xl bg-gradient-to-r from-black to-purple-600 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg transition-all active:scale-95"
      >
        Back to home
      </button>
    </div>
  </div>
);

export default PaymentSuccessPage;
