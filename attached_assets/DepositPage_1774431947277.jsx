import React, { useState, useEffect } from "react";
import { Copy, Check, ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";

const STANDARD_BANK_LOGO = "/standard-bank-logo.png";

const DepositPage = ({ onBack }) => {
  const [copied, setCopied] = useState(null);
  const [mintNumber, setMintNumber] = useState(null);

  useEffect(() => {
    const fetchMintNumber = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("mint_number")
          .eq("id", user.id)
          .maybeSingle();
        if (data?.mint_number) setMintNumber(data.mint_number);
      } catch (_) {}
    };
    fetchMintNumber();
  }, []);

  const handleCopy = (value, label) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const CopyButton = ({ value, label }) => (
    <button
      type="button"
      onClick={() => handleCopy(value, label)}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
        copied === label
          ? "bg-emerald-50 text-emerald-600"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
      }`}
    >
      {copied === label ? (
        <><Check className="h-3.5 w-3.5" />Copied</>
      ) : (
        <><Copy className="h-3.5 w-3.5" />Copy</>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#31005e] to-[#5b21b6] px-6 pt-14 pb-12">
        <div className="flex items-center gap-3 mb-5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white">Deposit Funds</h1>
        <p className="mt-1 text-sm text-white/65">
          Use the details below to make an EFT into your Mint account
        </p>
      </div>

      <div className="px-4 -mt-5 space-y-3">

        {/* Bank header card */}
        <div className="rounded-2xl bg-[#001f5b] shadow-md overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Receiving Bank</p>
              <p className="text-xs text-white/70">EFT / Bank Transfer</p>
            </div>
            <img
              src={STANDARD_BANK_LOGO}
              alt="Standard Bank"
              className="h-8 object-contain"
            />
          </div>
        </div>

        {/* Account info */}
        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-3">Account Details</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">Account Holder</p>
                  <p className="text-sm font-semibold text-slate-900">MINT PLATFORMS (PTY) LTD</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">Account Type</p>
                  <p className="text-sm font-semibold text-slate-900">Business Current Account</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">Branch</p>
                  <p className="text-sm font-semibold text-slate-900">Sandton City</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-5 my-3 border-t border-dashed border-slate-100" />

          {/* Copyable fields — grouped */}
          <div className="px-5 pb-4 space-y-2.5">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-3">Copy Details</p>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3">
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Account Number</p>
                <p className="text-sm font-bold text-slate-900 tracking-widest">02 154 470 0</p>
              </div>
              <CopyButton value="021544700" label="Account Number" />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3">
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Branch Code</p>
                <p className="text-sm font-bold text-slate-900 tracking-widest">002064</p>
              </div>
              <CopyButton value="002064" label="Branch Code" />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3">
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">SWIFT Code</p>
                <p className="text-sm font-bold text-slate-900 tracking-widest">SBZAZAJJ</p>
              </div>
              <CopyButton value="SBZAZAJJ" label="SWIFT Code" />
            </div>
          </div>
        </div>

        {/* Reference / Mint Number */}
        <div className="rounded-2xl bg-white shadow-sm border border-[#31005e]/20 overflow-hidden">
          <div className="px-5 py-4">
            <p className="text-[10px] uppercase tracking-widest text-[#31005e]/60 font-semibold mb-3">Payment Reference</p>
            <div className="flex items-center justify-between rounded-xl bg-violet-50 px-3.5 py-3">
              <div>
                <p className="text-[10px] text-violet-500 mb-0.5">Your Mint Number</p>
                <p className="text-sm font-bold text-violet-900 tracking-widest">
                  {mintNumber ?? "Loading..."}
                </p>
              </div>
              {mintNumber && <CopyButton value={mintNumber} label="Mint Number" />}
            </div>
            <p className="mt-2.5 text-[11px] text-slate-500 leading-relaxed">
              Always use your Mint number as the payment reference so we can allocate your deposit correctly.
            </p>
          </div>
        </div>

        {/* Help */}
        <div className="rounded-2xl bg-white border border-slate-100 px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-700 mb-2">Need help?</p>
          <p className="text-xs text-slate-500">Customer Care: <span className="font-semibold text-slate-700">0860 123 000</span></p>
          <p className="text-xs text-slate-500 mt-0.5">Website: <span className="font-semibold text-slate-700">www.standardbank.co.za</span></p>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">Deposits typically reflect within 1–2 business days.</p>
        </div>

      </div>
    </div>
  );
};

export default DepositPage;
