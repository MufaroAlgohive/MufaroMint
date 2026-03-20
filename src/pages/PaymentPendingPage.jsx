import React from "react";
import { Clock, ShieldCheck, TrendingUp, Bell } from "lucide-react";

const PaymentPendingPage = ({ strategy, amount, onDone }) => (
  <div className="min-h-screen flex flex-col bg-white">
    <div
      className="relative flex flex-col items-center justify-center px-6 pt-16 pb-10 text-center"
      style={{
        background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 55%, #312e81 100%)",
        minHeight: "52vh",
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -right-10 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl" />
      </div>
      <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10">
        <div className="absolute h-20 w-20 rounded-full bg-amber-400/10 animate-ping" style={{ animationDuration: "2s" }} />
        <Clock className="h-9 w-9 text-amber-400" strokeWidth={1.75} />
      </div>
      <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Payment Received</h1>
      <p className="text-sm text-slate-300 leading-relaxed max-w-xs">
        We've noted your EFT transfer. Once your payment clears, your investment will be activated — typically within{" "}
        <span className="text-white font-semibold">1–2 business days</span>.
      </p>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-xs font-semibold text-amber-300 tracking-wide uppercase">Pending Verification</span>
      </div>
    </div>

    <div className="flex-1 px-5 py-6 space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Investment Summary</p>
        {strategy && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Strategy</span>
            <span className="font-semibold text-slate-900">{strategy}</span>
          </div>
        )}
        {amount != null && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Amount</span>
            <span className="font-semibold text-slate-900">
              R{Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Method</span>
          <span className="font-semibold text-slate-900">Direct EFT</span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
          <span className="text-slate-500">Status</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
            <Clock className="h-3 w-3" /> Pending
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { icon: ShieldCheck, label: "Payment Verified", sub: "We confirm your transfer has cleared" },
          { icon: TrendingUp,  label: "Investment Activated", sub: "Your holdings are live in your portfolio" },
          { icon: Bell,        label: "You'll be notified", sub: "Email confirmation sent on activation" },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
            <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-200">
              <Icon className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="px-5 pb-10">
      <button
        type="button"
        onClick={() => onDone?.()}
        className="w-full rounded-2xl py-4 text-sm font-semibold text-white shadow-lg"
        style={{ background: "linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)" }}
      >
        Return to Home
      </button>
    </div>
  </div>
);

export default PaymentPendingPage;
