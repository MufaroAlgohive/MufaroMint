import React, { useState, useEffect } from "react";
import { X, CreditCard, Zap, Building2, Copy, Check, ChevronDown, ChevronUp, Loader2, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useProfile } from "../lib/useProfile";

const STANDARD_BANK_LOGO = "/standard-bank-logo.jpg";

const PaymentMethodModal = ({
  isOpen,
  onClose,
  amount,
  strategyName,
  onSelectPaystack,
  onSelectOzow,
  onEFTConfirm,
  onSelectWallet,
}) => {
  const [eftExpanded, setEftExpanded] = useState(false);
  const [copied, setCopied] = useState(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const { profile, loading: profileLoading } = useProfile();

  // ── FIX 1: Mint number pulled directly from profile ──────────────────────
  const mintNumber = profile?.mintNumber || profile?.mint_number || null;

  // ── FIX 2: Wallet balance fetched from the wallets table ─────────────────
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    const fetchWallet = async () => {
      setWalletLoading(true);
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", profile.id)
        .single();
      if (!error && data?.balance !== undefined) {
        setWalletBalance(Number(data.balance));
      }
      setWalletLoading(false);
    };
    fetchWallet();
  }, [profile?.id]);

  const handleCopy = (value, label) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const CopyBtn = ({ value, label }) => (
    <button
      type="button"
      onClick={() => handleCopy(value, label)}
      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${copied === label
          ? "bg-emerald-50 text-emerald-600"
          : "bg-slate-100 text-slate-500"
        }`}
    >
      {copied === label
        ? <><Check className="h-3 w-3" />Copied</>
        : <><Copy className="h-3 w-3" />Copy</>}
    </button>
  );

  const formatAmount = (amt) => {
    if (!amt) return "R0.00";
    return `R${Number(amt).toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const isWalletReady = !profileLoading && !walletLoading;
  const hasWalletFunds = walletBalance > 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="w-full max-w-md rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-violet-600" />
                <h2 className="text-base font-semibold text-slate-900">
                  Choose Payment Method
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {/* Amount summary */}
              <div className="px-5 pt-4 pb-2">
                <p className="text-xs text-slate-500">
                  Paying{" "}
                  <span className="font-semibold text-slate-700">
                    {formatAmount(amount)}
                  </span>{" "}
                  for{" "}
                  <span className="font-semibold text-slate-700">
                    {strategyName || "Investment"}
                  </span>
                </p>
              </div>

              <div className="px-5 pb-5 space-y-2.5 pt-3">

                {/* ── Pay with Wallet ── */}
                <button
                  type="button"
                  disabled={!isWalletReady || !hasWalletFunds}
                  onClick={() => {
                    if (hasWalletFunds) onSelectWallet?.();
                  }}
                  className={`w-full flex items-center gap-4 rounded-2xl border-2 px-4 py-3.5 text-left transition active:scale-[0.98] ${!hasWalletFunds
                      ? "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
                      : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40"
                    }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${!hasWalletFunds ? "bg-slate-200" : "bg-violet-100"
                      }`}
                  >
                    {!isWalletReady ? (
                      <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                    ) : (
                      <Wallet
                        className={`h-5 w-5 ${!hasWalletFunds ? "text-slate-400" : "text-violet-600"
                          }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold ${!hasWalletFunds ? "text-slate-500" : "text-slate-900"
                        }`}
                    >
                      Pay with Wallet
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {!isWalletReady
                        ? "Checking balance..."
                        : !hasWalletFunds
                          ? "Insufficient balance — please top up"
                          : `Available: ${formatAmount(walletBalance)}`}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0 ${!hasWalletFunds
                        ? "text-slate-400 bg-slate-200"
                        : "text-violet-600 bg-violet-100"
                      }`}
                  >
                    {!hasWalletFunds ? "Top Up Required" : "Wallet"}
                  </span>
                </button>

                {/* ── Paystack ── */}
                <button
                  type="button"
                  onClick={() => onSelectPaystack?.()}
                  className="w-full flex items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3.5 text-left transition active:scale-[0.98] hover:border-[#00bbff]/30 hover:bg-[#00bbff]/5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00bbff]/10 flex-shrink-0 p-1">
                    <img
                      src="/paystack-logo.svg"
                      alt="Paystack"
                      className="w-8 h-8 object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Paystack</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Card, instant EFT, bank transfer & more
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-[#3bb3e8] bg-[#dcf2ff] rounded-full px-2 py-0.5 flex-shrink-0">
                    Instant
                  </span>
                </button>

                {/* ── Ozow (Coming Soon) ── */}
                <div className="relative w-full">
                  <div className="w-full flex items-center gap-4 rounded-2xl border-2 border-slate-100 bg-slate-50/60 px-4 py-3.5 opacity-60 select-none cursor-not-allowed">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-100 shadow-sm flex-shrink-0 p-1.5">
                      <img
                        src="/ozow-logo.png"
                        alt="Ozow"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-500">Ozow</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Instant bank-to-bank payment
                      </p>
                    </div>
                  </div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white shadow-md"
                      style={{
                        background:
                          "linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)",
                        boxShadow:
                          "0 1px 8px 0 rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
                        letterSpacing: "0.12em",
                      }}
                    >
                      Coming Soon
                    </span>
                  </div>
                </div>

                {/* ── Direct EFT ── */}
                <div className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setEftExpanded(!eftExpanded)}
                    className="w-full flex items-center gap-4 px-4 py-3.5 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0033a1]/5 border border-[#0033a1]/10 flex-shrink-0 p-1">
                      <img
                        src="/standard-bank-logo.png"
                        alt="Standard Bank"
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">Direct EFT</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Manual bank transfer — 1–2 business days
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[11px] text-slate-400 font-medium">Manual</span>
                      {eftExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {eftExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-slate-100">
                          {/* Bank header */}
                          <div className="flex items-center justify-between px-4 py-2.5 bg-[#001f5b]">
                            <div>
                              <p className="text-[10px] uppercase tracking-widest text-white/50">
                                Receiving Bank
                              </p>
                              <p className="text-[11px] text-white/70 mt-0.5">
                                EFT / Bank Transfer
                              </p>
                            </div>
                            <img
                              src={STANDARD_BANK_LOGO}
                              alt="Standard Bank"
                              className="h-6 object-contain"
                            />
                          </div>

                          <div className="px-4 py-3 space-y-2">
                            <div className="space-y-1.5 pb-2">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] text-slate-400">Account Holder</p>
                                <p className="text-xs font-semibold text-slate-900">
                                  MINT PLATFORMS (PTY) LTD
                                </p>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] text-slate-400">Account Type</p>
                                <p className="text-xs font-semibold text-slate-900">
                                  Business Current Account
                                </p>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] text-slate-400">Branch</p>
                                <p className="text-xs font-semibold text-slate-900">
                                  Sandton City
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                              <div>
                                <p className="text-[10px] text-slate-400 mb-0.5">
                                  Account Number
                                </p>
                                <p className="text-xs font-bold text-slate-900 tracking-widest">
                                  02 154 470 0
                                </p>
                              </div>
                              <CopyBtn value="021544700" label="Account Number" />
                            </div>

                            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                              <div>
                                <p className="text-[10px] text-slate-400 mb-0.5">
                                  Branch Code
                                </p>
                                <p className="text-xs font-bold text-slate-900 tracking-widest">
                                  002064
                                </p>
                              </div>
                              <CopyBtn value="002064" label="Branch Code" />
                            </div>

                            {/* ── Mint Number reference ── */}
                            <div className="flex items-center justify-between rounded-xl bg-violet-50 px-3 py-2">
                              <div>
                                <p className="text-[10px] text-violet-500 mb-0.5">
                                  Your Reference (Mint Number)
                                </p>
                                <p className="text-xs font-bold text-violet-900 tracking-widest">
                                  {profileLoading
                                    ? "Loading..."
                                    : mintNumber ?? "Not available"}
                                </p>
                              </div>
                              {mintNumber && (
                                <CopyBtn value={mintNumber} label="Mint Number" />
                              )}
                            </div>

                            <p className="text-[10px] text-slate-400 leading-relaxed pt-0.5">
                              Use your Mint number as the reference. Deposits reflect
                              within 1–2 business days.
                            </p>

                            <button
                              type="button"
                              onClick={() => setShowThankYou(true)}
                              className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold transition active:scale-95"
                            >
                              I've sent the payment
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ── Thank-you confirmation popup ── */}
      <AnimatePresence>
        {showThankYou && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center px-6"
            style={{ background: "rgba(0,0,0,0.55)" }}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="bg-white rounded-3xl overflow-hidden w-full max-w-sm shadow-2xl"
            >
              {/* Green header */}
              <div className="flex flex-col items-center pt-8 pb-6 px-6"
                style={{ background: "linear-gradient(160deg, #f0fdf4 0%, #dcfce7 100%)" }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", boxShadow: "0 8px 24px rgba(34,197,94,0.35)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width={32} height={32}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-1 text-center">Thank You!</h3>
                <p className="text-sm font-semibold text-emerald-600 text-center">Payment Received</p>
              </div>

              {/* Body */}
              <div className="px-6 pt-5 pb-2">
                <p className="text-sm text-slate-600 text-center leading-relaxed mb-5">
                  We've noted your EFT payment. Your deposit will reflect within{" "}
                  <span className="font-semibold text-slate-800">1–3 business days</span>{" "}
                  once it clears with the bank.
                </p>

                {/* Pending badge info */}
                <div className="flex items-start gap-3 rounded-2xl p-4 mb-5"
                  style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "#fef3c7" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" width={14} height={14}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-0.5">
                      Balance Pending
                    </p>
                    <p className="text-xs text-amber-600 leading-relaxed">
                      Your balance will show as <span className="font-semibold">Pending</span> until the payment is verified and confirmed by our team.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="px-6 pb-7">
                <button
                  type="button"
                  onClick={async () => {
                    setShowThankYou(false);
                    if (onEFTConfirm) await onEFTConfirm();
                  }}
                  className="w-full py-3.5 rounded-2xl bg-slate-900 text-white text-sm font-bold tracking-wide transition active:scale-95"
                >
                  Got it — Go to Dashboard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default PaymentMethodModal;