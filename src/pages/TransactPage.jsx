import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, ArrowDownLeft, ArrowUpRight, RefreshCw,
  TrendingUp, TrendingDown, Search, Bell, ChevronRight,
  FileText, Shield, Settings, HelpCircle, ArrowRightLeft,
  SendHorizonal, Landmark, BarChart3,
} from "lucide-react";
import { useProfile } from "../lib/useProfile";
import { useFinancialData } from "../lib/useFinancialData";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtZAR(val) {
  return "R\u202F" + (Math.abs(val || 0)).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function navigate(page) {
  window.dispatchEvent(
    new CustomEvent("navigate-within-app", { detail: { page } })
  );
}

// ─── animation variants ──────────────────────────────────────────────────────

const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
};
const listItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
};

// ─── category icon map ────────────────────────────────────────────────────────

function TxIcon({ tx }) {
  const isIn = tx.direction === "credit" || tx.type === "transfer_in" || tx.type === "deposit";

  const pathMap = {
    deposit:       <><path d="M12 2v20M2 12h20"/></>,
    investment:    <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>,
    transfer_in:   <><path d="M17 7 7 17M7 17h10M7 17V7"/></>,
    transfer_out:  <><path d="M7 17 17 7M17 7H7M17 7v10"/></>,
    fee:           <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/></>,
  };

  const d = tx.type && pathMap[tx.type]
    ? pathMap[tx.type]
    : isIn
      ? pathMap.transfer_in
      : pathMap.transfer_out;

  return (
    <div
      className="h-[42px] w-[42px] rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{
        background: isIn ? "rgba(34,197,94,0.10)" : "rgba(124,58,237,0.08)",
        color: isIn ? "#16a34a" : "#7c3aed",
      }}
    >
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        {d}
      </svg>
    </div>
  );
}

// ─── Transaction row ──────────────────────────────────────────────────────────

function TxRow({ tx, hide }) {
  const isIn = tx.direction === "credit" || tx.type === "transfer_in" || tx.type === "deposit";
  const rawAmt = Math.abs(Number(tx.amount || tx.net_amount || 0));
  const amtInRands = rawAmt > 10000 ? rawAmt / 100 : rawAmt; // cents vs rands heuristic
  const date = tx.created_at
    ? new Date(tx.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })
    : "";

  return (
    <motion.div
      variants={listItem}
      className="flex items-center gap-3.5 py-3.5 px-1 rounded-xl transition-colors hover:bg-slate-50 cursor-pointer"
    >
      <TxIcon tx={tx} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-900 truncate">
          {tx.description || tx.type || "Transaction"}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">{date}</p>
      </div>
      <p
        className="text-[13px] font-bold tabular-nums whitespace-nowrap"
        style={{
          color: isIn ? "#16a34a" : "#181820",
          filter: hide ? "blur(6px)" : "none",
          userSelect: hide ? "none" : "auto",
          transition: "filter 0.3s",
        }}
      >
        {isIn ? "+" : "−"}{fmtZAR(amtInRands)}
      </p>
    </motion.div>
  );
}

// ─── Quick action button ──────────────────────────────────────────────────────

function QuickBtn({ label, icon: Icon, onClick, delay }) {
  return (
    <motion.button
      onClick={onClick}
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26, delay }}
      whileTap={{ scale: 0.93 }}
    >
      <div
        className="h-[52px] w-[52px] rounded-2xl bg-white flex items-center justify-center text-purple-700 border border-slate-200 transition-all"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
    </motion.button>
  );
}

// ─── Account option row ───────────────────────────────────────────────────────

function OptRow({ icon: Icon, label, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3.5 px-4 py-[15px] text-left hover:bg-slate-50 transition-colors"
    >
      <div className="h-9 w-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700 flex-shrink-0">
        <Icon size={16} strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-900">{label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
      </div>
      <ChevronRight size={15} className="text-slate-300 flex-shrink-0" />
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Page
// ═════════════════════════════════════════════════════════════════════════════

export default function TransactPage() {
  const { profile } = useProfile();
  const { balance, investments, transactions, loading } = useFinancialData();

  const [balanceVisible, setBalanceVisible] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const displayName = profile?.firstName
    ? `${profile.firstName}${profile.lastName ? " " + profile.lastName[0] + "." : ""}`
    : "You";
  const initials = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .toUpperCase() || "MT";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const filtered = transactions.filter((t) => {
    if (activeTab === "all") return true;
    const isIn = t.direction === "credit" || t.type === "transfer_in" || t.type === "deposit";
    return activeTab === "in" ? isIn : !isIn;
  });

  const walletRands = typeof balance === "number"
    ? (balance > 10000 && !String(balance).includes(".") ? balance / 100 : balance)
    : 0;
  const investRands = typeof investments === "number"
    ? (investments > 10000 && !String(investments).includes(".") ? investments / 100 : investments)
    : 0;

  return (
    <div className="min-h-screen pb-8" style={{ background: "#f4f4f6" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="h-[42px] w-[42px] rounded-full flex items-center justify-center text-white text-[14px] font-bold"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
              boxShadow: "0 4px 12px rgba(91,33,182,0.3)",
            }}
          >
            {initials}
          </div>
          <div>
            <p className="text-[12px] text-slate-500">{greeting}</p>
            <p className="text-[14px] font-bold text-slate-900 leading-tight">{displayName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("notifications")}
            className="h-10 w-10 rounded-[12px] bg-white border border-slate-200 flex items-center justify-center text-slate-500 relative transition-colors hover:text-slate-900"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <Bell size={17} strokeWidth={1.8} />
            <span className="absolute top-2 right-2 h-[7px] w-[7px] rounded-full bg-red-500 border-[1.5px] border-white" />
          </button>
        </div>
      </div>

      {/* ── Balance Card ── */}
      <motion.div
        className="mx-5 rounded-3xl relative overflow-hidden"
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        style={{
          background: "linear-gradient(135deg, #3b1d72 0%, #5b21b6 40%, #7c3aed 75%, #9d5cf6 100%)",
          boxShadow: "0 12px 40px rgba(91,33,182,0.42), 0 2px 8px rgba(91,33,182,0.2)",
        }}
      >
        {/* Orb decorations */}
        <div className="pointer-events-none absolute -top-10 -right-10 h-44 w-44 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
        <div className="pointer-events-none absolute -bottom-8 left-8 h-28 w-28 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />

        <div className="relative p-6">
          {/* Label + eye */}
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-medium text-white/70 uppercase tracking-[0.07em]">Available Balance</p>
            <button
              onClick={() => setBalanceVisible(v => !v)}
              className="text-white/60 hover:text-white/90 transition-colors"
            >
              {balanceVisible ? <Eye size={17} strokeWidth={1.8} /> : <EyeOff size={17} strokeWidth={1.8} />}
            </button>
          </div>

          {/* Main balance */}
          <p
            className="text-[34px] font-extrabold text-white tracking-tight mb-6"
            style={{
              filter: balanceVisible ? "none" : "blur(8px)",
              userSelect: balanceVisible ? "auto" : "none",
              transition: "filter 0.3s",
              letterSpacing: "-0.5px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {loading ? "—" : fmtZAR(walletRands)}
          </p>

          {/* Sub tiles */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "Wallet", value: fmtZAR(walletRands) },
              { label: "Holdings", value: fmtZAR(investRands) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-2xl p-3 border"
                style={{
                  background: "rgba(255,255,255,0.13)",
                  borderColor: "rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <p className="text-[10px] font-medium text-white/60 uppercase tracking-[0.06em] mb-1.5">{label}</p>
                <p
                  className="text-[14px] font-bold text-white"
                  style={{
                    filter: balanceVisible ? "none" : "blur(6px)",
                    userSelect: balanceVisible ? "auto" : "none",
                    transition: "filter 0.3s",
                  }}
                >
                  {loading ? "—" : value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-4 gap-2 px-5 mt-6">
        <QuickBtn label="Send"     icon={SendHorizonal}    onClick={() => navigate("deposit")}     delay={0.05} />
        <QuickBtn label="Receive"  icon={Landmark}         onClick={() => navigate("deposit")}     delay={0.10} />
        <QuickBtn label="Transfer" icon={ArrowRightLeft}   onClick={() => navigate("deposit")}     delay={0.15} />
        <QuickBtn label="Invest"   icon={BarChart3}        onClick={() => navigate("investments")} delay={0.20} />
      </div>

      {/* ── Recent Transactions ── */}
      <div className="px-5 mt-7">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-[16px] font-bold text-slate-900">Recent Transactions</h2>
          {/* All / In / Out tabs */}
          <div className="flex items-center gap-0.5 rounded-[10px] p-[3px]" style={{ background: "#ebebef" }}>
            {["all", "in", "out"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative text-[11px] px-3.5 py-1 rounded-[7px] font-medium transition-all"
                style={{
                  color: activeTab === tab ? "#fff" : "#7c7c8a",
                  background: activeTab === tab ? "#5b21b6" : "transparent",
                  boxShadow: activeTab === tab ? "0 2px 8px rgba(91,33,182,0.3)" : "none",
                  fontWeight: activeTab === tab ? 600 : 500,
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div
          className="rounded-[20px] bg-white border border-slate-200 px-4 py-1"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <RefreshCw size={18} className="text-slate-300 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-[13px] text-slate-400 py-9">No transactions found</p>
          ) : (
            <motion.div
              className="divide-y divide-slate-100"
              variants={listContainer}
              initial="hidden"
              animate="show"
              key={activeTab}
            >
              {filtered.slice(0, 20).map((tx) => (
                <TxRow key={tx.id} tx={tx} hide={!balanceVisible} />
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Account & Details ── */}
      <div className="px-5 mt-7 mb-4">
        <h2 className="text-[16px] font-bold text-slate-900 mb-3.5">Account &amp; Details</h2>
        <div
          className="rounded-[20px] bg-white border border-slate-200 overflow-hidden divide-y divide-slate-100"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
        >
          <OptRow icon={FileText}    label="Statements"       desc="Download monthly statements" onClick={() => navigate("statements")} />
          <OptRow icon={Shield}      label="Security"         desc="Manage security settings"    onClick={() => navigate("settings")} />
          <OptRow icon={Settings}    label="Account Settings" desc="Update account details"       onClick={() => navigate("settings")} />
          <OptRow icon={HelpCircle}  label="Help &amp; Support" desc="Get assistance"            onClick={() => {}} />
        </div>
      </div>

    </div>
  );
}
