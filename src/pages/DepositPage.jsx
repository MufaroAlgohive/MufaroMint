import React, { useState, useEffect } from "react";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useProfile } from "../lib/useProfile";

const SuccessModal = ({ isOpen, onClose, reference }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] flex items-center justify-center p-4">
      <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-8 max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-10 h-10 text-green-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Deposit Recorded</h2>
          <p className="text-zinc-400">
            We've recorded your deposit intent. Once your funds reflect in our
            account, your wallet balance will be updated automatically.
          </p>
          <div className="bg-white/5 rounded-xl p-4 mt-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
              Payment Reference
            </p>
            <p className="text-lg font-mono font-medium text-white">{reference}</p>
          </div>
        </div>
        <p className="text-sm text-zinc-500">
          Processing usually takes 1-2 business days depending on your bank.
        </p>
        <button
          onClick={onClose}
          className="w-full bg-white text-black font-semibold py-4 rounded-xl hover:bg-zinc-200 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};

const DepositPage = ({ onBack }) => {
  const { profile } = useProfile();
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(null);
  const [reference, setReference] = useState("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  useEffect(() => {
    // Reference should be user's MINT ID
    if (profile?.mintNumber) {
        setReference(profile.mintNumber);
    } else if (profile?.mint_number) {
        setReference(profile.mint_number);
    }
  }, [profile]);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConfirmDeposit = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      alert("Please enter a valid deposit amount");
      return;
    }

    try {
      // Record the pending transaction
      const { error } = await supabase.from("transactions").insert([
        {
          user_id: profile?.id,
          type: "deposit",
          status: "pending",
          direction: "credit",
          amount: Math.round(parseFloat(amount) * 100), // Cents
          store_reference: reference, // Using the mint_number here as requested
          description: "Bank Deposit (EFT)",
          currency: "ZAR",
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
    { label: "Account Holder", value: "MINT PLATFORMS (PTY) LTD" },
    { label: "Bank", value: "STANDARD BANK" },
    { label: "Account Type", value: "BUSINESS CURRENT ACCOUNT" },
    { label: "Account Number", value: "02 154 470 0" },
    { label: "Branch", value: "SANDTON CITY" },
    { label: "Branch Code", value: "002064" },
    { label: "SWIFT Code", value: "SBZAZAJJ" },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden font-sans">
      {/* Background Decor */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-violet-100/30 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 -z-10" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-purple-100/20 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 -z-10" />

      <div className="max-w-xl mx-auto px-6 pt-12 pb-40">
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
            className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Deposit Funds</h1>
          <div className="w-10" />
        </div>

        {/* Deposit Amount Input */}
        <div className="space-y-4">
          <label className="text-sm text-zinc-400 font-medium">
            How much would you like to deposit?
          </label>
          <div className="relative group">
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-medium text-zinc-500 group-focus-within:text-white transition-colors">
              R
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-zinc-900 border-none rounded-2xl py-6 pl-12 pr-6 text-3xl font-bold focus:ring-2 focus:ring-white/20 placeholder:text-zinc-700 outline-none"
            />
          </div>
          <p className="text-sm text-zinc-500">
            Funds will reflect in your wallet balance once confirmed.
          </p>
        </div>

        {/* Bank Details Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
              Standard Bank Details
            </h2>
          </div>

          <div className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5">
            <div className="p-6">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                Payment Reference
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xl font-mono text-white">
                  {reference || "Generating..."}
                </p>
                <button
                  onClick={() => handleCopy(reference, "ref")}
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                >
                  {copied === "ref" ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">
                * Please use this exact reference to avoid processing delays.
              </p>
            </div>

            {bankDetails.map((detail) => (
              <div
                key={detail.label}
                className="p-6 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                    {detail.label}
                  </p>
                  <p className="text-base text-zinc-200">{detail.value}</p>
                </div>
                <button
                  onClick={() => handleCopy(detail.value, detail.label)}
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                >
                  {copied === detail.label ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Sticky Action Button */}
      <div className="fixed bottom-20 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/80 to-transparent z-20">
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

      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={onBack}
        reference={reference}
      />
    </div>
  );
};

export default DepositPage;
