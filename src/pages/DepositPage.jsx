import React, { useState, useEffect } from "react";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useProfile } from "../lib/useProfile";

const SuccessModal = ({ isOpen, onClose, reference }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl space-y-6 animate-fade-in">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
          <Check className="w-10 h-10 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Deposit Recorded</h2>
          <p className="text-slate-500 text-sm leading-relaxed px-2">
            We've recorded your deposit intent. Once your funds reflect in our
            account, your wallet balance will be updated automatically.
          </p>
          <div className="bg-violet-50/50 border border-violet-100 rounded-2xl p-4 mt-4">
            <p className="text-[10px] text-violet-600 font-bold uppercase tracking-wider mb-1">
              Payment Reference
            </p>
            <p className="text-lg font-mono font-bold text-violet-900 tracking-wider uppercase">{reference}</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 font-medium">
          Processing usually takes 1-2 business days depending on your bank.
        </p>
        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-black to-[#5b21b6] text-white font-bold py-4 rounded-2xl shadow-lg transition active:scale-95"
        >
          Done
        </button>
      </div>
    </div>
  );
};

const DepositPage = ({ onBack }) => {
  const { profile, loading: profileLoading } = useProfile();
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Reference is now always the user's MINT ID
  const reference = profile?.mintNumber || profile?.mint_number || "M-REF-PENDING";

  const handleCopy = (text, key) => {
    if (!text || text === "M-REF-PENDING") return;
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConfirmDeposit = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return;
    }

    if (!profile?.id) {
      alert("System error: User profile not loaded.");
      return;
    }

    try {
      // Record the pending transaction
      const { error } = await supabase.from("transactions").insert([
        {
          user_id: profile.id,
          name: "Manual Bank Deposit",
          status: "pending",
          direction: "credit",
          amount: Math.round(parseFloat(amount) * 100), // Cents
          store_reference: reference, // Using the mint_number here as requested
          description: "Manual Bank Deposit",
          currency: "ZAR",
          transaction_date: new Date().toISOString()
        },
      ]);

      if (error) throw error;
      setIsSuccessModalOpen(true);
    } catch (err) {
      console.error("Error recording deposit:", err);
      alert("Failed to record deposit. Please try again.");
    }
  };

  const bankDetails = [
    { label: "Account Name", value: "MINT PLATFORMS (PTY) LTD" },
    { label: "Bank", value: "Standard Bank" },
    { label: "Account Number", value: "02 154 470 0" },
    { label: "Branch Code", value: "002064" },
    { label: "Account Type", value: "Business Current" },
    { label: "SWIFT Code", value: "SBZA ZAJJ" },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden font-sans">
      {/* Background Decor */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-violet-100/30 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 -z-10" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-purple-100/20 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 -z-10" />

      <div className="max-w-xl mx-auto px-6 pt-12 pb-32">
        {/* MINT Brand Header */}
        <div className="mb-8 text-center">
            <h1 className="text-sm font-bold tracking-[0.3em] uppercase opacity-40 mb-8" style={{ fontFamily: "'Future Earth Medium', sans-serif" }}>
                MINT
            </h1>
        </div>

        {/* Header with Back Button */}
        <div className="flex items-center gap-6 mb-10">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:border-violet-300 transition-all active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Deposit Funds</h2>
              <p className="text-sm text-slate-500 font-medium">Manual EFT Transfer</p>
          </div>
        </div>

        {/* Deposit Amount Input */}
        <div className="mb-10 animate-fade-in delay-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">
            Enter Deposit Amount
          </label>
          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-300 group-focus-within:text-violet-500 transition-colors">
              R
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-50 border border-slate-200 rounded-3xl py-6 pl-12 pr-6 text-4xl font-bold focus:bg-white focus:border-violet-300 focus:ring-4 focus:ring-violet-100/50 placeholder:text-slate-200 outline-none transition-all shadow-sm"
            />
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            Funds will reflect in your wallet balance once confirmed.
          </p>
        </div>

        {/* Bank Details Section */}
        <div className="space-y-6 animate-fade-in delay-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
            Standard Bank Recipient Details
          </h2>

          <div className="space-y-3">
            {/* Reference Number - Glass Highlight */}
            <div className="relative group">
                <div className="bg-gradient-to-br from-violet-600 to-indigo-800 p-[1px] rounded-3xl shadow-lg">
                    <div className="bg-white/95 backdrop-blur-xl rounded-[23px] p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Crucial: Payment Reference</span>
                            <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <p className="text-2xl font-mono font-bold text-slate-900 tracking-widest uppercase truncate">
                                {profileLoading ? "LOADING..." : reference}
                            </p>
                            <button
                                onClick={() => handleCopy(reference, "ref")}
                                className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-2xl hover:bg-violet-700 transition-all active:scale-95 shadow-md font-bold text-xs"
                            >
                                {copied === "ref" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied === "ref" ? "Copied" : "Copy"}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-3 bg-slate-50 py-2 px-3 rounded-lg border border-slate-100 flex items-center gap-2">
                            <span className="text-violet-500 font-bold">!</span>
                            Use this exact reference in your banking app.
                        </p>
                    </div>
                </div>
            </div>

            {/* Other details in Glass Cards */}
            <div className="grid gap-3">
                {bankDetails.map((detail, idx) => (
                <div
                    key={detail.label}
                    className="group bg-slate-50/50 border border-slate-100 rounded-3xl p-5 backdrop-blur-sm transition-all hover:bg-white hover:border-violet-100 hover:shadow-md flex items-center justify-between animate-fade-in"
                    style={{ animationDelay: `${(idx + 3) * 0.1}s` }}
                >
                    <div className="min-w-0">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                            {detail.label}
                        </p>
                        <p className="text-base font-bold text-slate-800 truncate pr-2">
                            {detail.value}
                        </p>
                    </div>
                    <button
                        onClick={() => handleCopy(detail.value, detail.label)}
                        className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-violet-600 hover:border-violet-200 transition-all active:scale-90"
                    >
                        {copied === detail.label ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                            <Copy className="w-4 h-4" />
                        )}
                    </button>
                </div>
                ))}
            </div>
          </div>
        </div>

        {/* Sticky Action Button */}
        <div className="fixed bottom-0 left-0 right-0 px-6 pt-6 pb-[100px] bg-gradient-to-t from-white via-white/80 to-transparent z-20">
          <div className="max-w-xl mx-auto">
            <button
                onClick={handleConfirmDeposit}
                disabled={!amount || isNaN(amount) || parseFloat(amount) <= 0 || profileLoading}
                className="w-full bg-gradient-to-r from-black to-[#5b21b6] text-white font-bold py-5 rounded-[24px] shadow-xl hover:shadow-[#5b21b6]/30 transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-2 group overflow-hidden relative"
            >
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                I have made my deposit
            </button>
          </div>
        </div>
      </div>

      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={onBack}
        reference={reference}
      />

      <style jsx="true">{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
      `}</style>
    </div>
  );
};

export default DepositPage;

