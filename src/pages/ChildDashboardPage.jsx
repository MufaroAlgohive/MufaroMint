import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowUpRight, ArrowDownLeft, X, TrendingUp, TrendingDown,
  ShieldCheck, Baby, Wallet, BarChart3, ChevronRight,
  RefreshCw, Search, Star, AlertCircle, Check,
} from "lucide-react";
import { useProfile } from "../lib/useProfile";
import { supabase } from "../lib/supabase";

// ─── helpers ────────────────────────────────────────────────────────────────

function getAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function fmt(cents) {
  const val = (cents || 0) / 100;
  return `R\u202F${val.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}


// ─── Animation variants ─────────────────────────────────────────────────────

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 340, damping: 28 } },
};

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name, gradient, size = "h-14 w-14", text = "text-xl" }) {
  const initial = (name || "?")[0].toUpperCase();
  return (
    <div
      className={`${size} rounded-2xl flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ background: gradient, aspectRatio: "1" }}
    >
      <span className={text}>{initial}</span>
    </div>
  );
}

// ─── Transfer Modal (bottom-sheet) ───────────────────────────────────────────

function TransferModal({ child, parentBalance, balancesLoading, onTransfer, onClose }) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const amountCents = Math.round(numAmount * 100);
  const insufficient = !balancesLoading && amountCents > (parentBalance || 0);

  async function handleSubmit() {
    if (numAmount <= 0) { setError("Enter a valid amount."); return; }
    if (insufficient) { setError("Insufficient wallet balance."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/child-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transfer",
          family_member_id: child.id,
          amount: amountCents,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Transfer failed."); return; }
      setSuccess(true);
      onTransfer(json);
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-lg font-bold text-slate-800 text-center placeholder-slate-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 transition tabular-nums";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
      >
        <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-10 rounded-full bg-slate-200" /></div>

        <div className="px-6 pt-3 pb-8">
          {!success ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6ee7b7,#34d399)" }}>
                    <ArrowDownLeft className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">Transfer Funds</p>
                    <p className="text-xs text-slate-400">
                      To {child.first_name}'s account
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition active:scale-95"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Balance info */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 mb-4 border border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Wallet</p>
                  <p className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                    {balancesLoading ? "Loading…" : fmt(parentBalance)}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300" />
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{child.first_name}'s Wallet</p>
                  <p className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                    {balancesLoading ? "Loading…" : fmt(child.available_balance || 0)}
                  </p>
                </div>
              </div>

              {/* Amount input */}
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-0.5">
                Amount (ZAR)
              </label>
              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">R</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={inputCls + " pl-10"}
                  autoFocus
                />
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2 mb-5">
                {[50, 100, 250, 500].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(String(v))}
                    disabled={balancesLoading}
                    className="flex-1 rounded-lg py-2 text-xs font-bold text-purple-600 bg-purple-50 border border-purple-100 hover:bg-purple-100 transition active:scale-95"
                  >
                    R{v}
                  </button>
                ))}
              </div>

              {insufficient && (
                <div className="flex items-start gap-2 rounded-xl bg-purple-50 px-4 py-3 border border-purple-100 mb-3">
                  <AlertCircle className="h-3.5 w-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-purple-600">Amount exceeds your wallet balance.</p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 border border-red-100 mb-3">
                  <X className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-500">{error}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={balancesLoading || saving || numAmount <= 0 || insufficient}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
              >
                {saving ? "Transferring…" : `Transfer R${numAmount.toFixed(2)}`}
              </button>
            </>
          ) : (
            <motion.div
              className="text-center py-4"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#e9d5ff,#d8b4fe)" }}>
                <Check className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-lg font-bold text-slate-900">Transfer Complete!</p>
              <p className="text-sm text-slate-500 mt-2">
                R{numAmount.toFixed(2)} has been transferred to {child.first_name}'s wallet.
              </p>
              <button
                onClick={onClose}
                className="mt-6 w-full rounded-xl py-3.5 text-sm font-bold text-white active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
              >
                Done
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Invest Modal (bottom-sheet) — browse strategies & invest ────────────────

function InvestModal({ child, onInvest, onClose }) {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const childBalance = child.available_balance || 0;
  const numAmount = parseFloat(amount) || 0;
  const amountCents = Math.round(numAmount * 100);
  const insufficient = amountCents > childBalance;

  useEffect(() => {
    fetchStrategies();
  }, []);

  async function fetchStrategies() {
    setLoading(true);
    try {
      if (!supabase) return;
      const { data } = await supabase
        .from("strategies")
        .select("id, name, description, risk_level, min_investment, is_featured, strategy_metrics(change_pct, r_1y)")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("name");
      setStrategies(data || []);
    } catch (e) { console.error("[child-invest] strategies", e); }
    finally { setLoading(false); }
  }

  async function handleInvest() {
    if (!selected) return;
    if (numAmount <= 0) { setError("Enter a valid amount."); return; }
    if (insufficient) { setError("Insufficient funds in child's wallet."); return; }

    const minInv = (selected.min_investment || 0);
    if (amountCents < minInv) {
      setError(`Minimum investment is ${fmt(minInv)}.`);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/child-invest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          family_member_id: child.id,
          strategy_id: selected.id,
          amount: amountCents,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Investment failed."); return; }
      setSuccess(true);
      onInvest(json);
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const filtered = strategies.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  );

  const riskColors = {
    low: { bg: "#faf5ff", text: "#7c3aed" },
    medium: { bg: "#f3e8ff", text: "#8b5cf6" },
    high: { bg: "#ede9fe", text: "#6d28d9" },
    aggressive: { bg: "#ede9fe", text: "#6d28d9" },
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 transition";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]"
        style={{ maxHeight: "85vh" }}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
      >
        <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-10 rounded-full bg-slate-200" /></div>

        <div className="px-6 pt-3 pb-8 overflow-y-auto" style={{ maxHeight: "calc(85vh - 24px)" }}>
          {!success ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {selected && (
                    <button
                      onClick={() => { setSelected(null); setAmount(""); setError(""); }}
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition active:scale-95 mr-1"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#a78bfa,#7c3aed)" }}>
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">
                      {selected ? "Invest Amount" : "Invest for " + child.first_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {selected ? selected.name : "Choose a strategy to invest in"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition active:scale-95"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Available balance pill */}
              <div className="flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-100 px-4 py-2.5 mb-4">
                <Wallet className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-xs font-semibold text-purple-600">{child.first_name}'s balance:</span>
                <span className="text-xs font-bold text-purple-800 ml-auto tabular-nums">{fmt(childBalance)}</span>
              </div>

              {/* Strategy list */}
              {!selected && (
                <>
                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search strategies…"
                      className={inputCls + " pl-10"}
                    />
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-10">
                      <RefreshCw className="h-5 w-5 text-slate-300 animate-spin" />
                    </div>
                  ) : filtered.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-8">No strategies found.</p>
                  ) : (
                    <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                      {filtered.map((s) => {
                        const metric = s.strategy_metrics?.[0] || {};
                        const changePct = metric.change_pct || metric.r_1y || 0;
                        const isUp = changePct >= 0;
                        const risk = (s.risk_level || "medium").toLowerCase();
                        const rc = riskColors[risk] || riskColors.medium;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setSelected(s)}
                            className="w-full flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3.5 text-left hover:bg-purple-50/50 hover:border-purple-200 transition active:scale-[0.98]"
                          >
                            <div
                              className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ background: isUp ? "linear-gradient(135deg,#ede9fe,#ddd6fe)" : "linear-gradient(135deg,#e9d5ff,#d8b4fe)" }}
                            >
                              {isUp
                                ? <TrendingUp className="h-4 w-4 text-purple-600" />
                                : <TrendingDown className="h-4 w-4 text-purple-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">{s.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className="text-[10px] font-bold rounded-full px-2 py-0.5"
                                  style={{ background: rc.bg, color: rc.text }}
                                >
                                  {s.risk_level || "Medium"}
                                </span>
                                {s.is_featured && <Star className="h-3 w-3 text-purple-400" />}
                                {s.min_investment > 0 && (
                                  <span className="text-[10px] text-slate-400">Min {fmt(s.min_investment)}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold tabular-nums text-purple-600">
                                {isUp ? "+" : ""}{changePct.toFixed(1)}%
                              </p>
                              <ChevronRight className="h-3.5 w-3.5 text-slate-300 ml-auto mt-0.5" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Amount entry (after selecting strategy) */}
              {selected && (
                <div className="mt-2">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-0.5">
                    Investment Amount (ZAR)
                  </label>
                  <div className="relative mb-4">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">R</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-lg font-bold text-slate-800 text-center placeholder-slate-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 transition tabular-nums pl-10"
                      autoFocus
                    />
                  </div>

                  {/* Quick amounts */}
                  <div className="flex gap-2 mb-5">
                    {[100, 250, 500, 1000].map((v) => (
                      <button
                        key={v}
                        onClick={() => setAmount(String(v))}
                        className="flex-1 rounded-lg py-2 text-xs font-bold text-purple-600 bg-purple-50 border border-purple-100 hover:bg-purple-100 transition active:scale-95"
                      >
                        R{v}
                      </button>
                    ))}
                  </div>

                  {/* Strategy info */}
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 mb-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Investment Summary</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Strategy</span>
                      <span className="font-semibold text-slate-800">{selected.name}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-slate-500">Amount</span>
                      <span className="font-bold text-slate-900">R{numAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-slate-500">From</span>
                      <span className="font-semibold text-slate-800">{child.first_name}'s wallet</span>
                    </div>
                  </div>

                  {insufficient && (
                    <div className="flex items-start gap-2 rounded-xl bg-purple-50 px-4 py-3 border border-purple-100 mb-3">
                      <AlertCircle className="h-3.5 w-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-purple-600">Insufficient balance. Transfer funds first.</p>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 border border-red-100 mb-3">
                      <X className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-500">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleInvest}
                    disabled={saving || numAmount <= 0 || insufficient}
                    className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
                  >
                    {saving ? "Investing…" : `Invest R${numAmount.toFixed(2)}`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <motion.div
              className="text-center py-4"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#e9d5ff,#d8b4fe)" }}>
                <Check className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-lg font-bold text-slate-900">Investment Placed!</p>
              <p className="text-sm text-slate-500 mt-2">
                R{numAmount.toFixed(2)} invested in {selected?.name} for {child.first_name}.
              </p>
              <button
                onClick={onClose}
                className="mt-6 w-full rounded-xl py-3.5 text-sm font-bold text-white active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
              >
                Done
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── HoldingRow ──────────────────────────────────────────────────────────────

function HoldingRow({ holding }) {
  const isUp = (holding.unrealized_pnl || 0) >= 0;
  const securitySymbol = holding.securities?.symbol || `SEC-${String(holding.security_id || "").slice(0, 6)}`;
  const securityName = holding.securities?.name || "Security";
  return (
    <div className="flex items-center gap-3.5 rounded-xl shadow-lg border border-slate-200 p-4 bg-white">
      <div
        className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: isUp ? "linear-gradient(135deg,#ede9fe,#ddd6fe)" : "linear-gradient(135deg,#e9d5ff,#d8b4fe)" }}
      >
        {isUp
          ? <TrendingUp className="h-5 w-5 text-purple-600" />
          : <TrendingDown className="h-5 w-5 text-purple-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate">{securitySymbol}</p>
        <p className="text-[11px] text-slate-600 truncate font-medium">{securityName}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-slate-900 tabular-nums">{fmt(holding.market_value || 0)}</p>
        <p className="text-[11px] font-semibold tabular-nums text-purple-600">
          {isUp ? "+" : ""}{fmt(holding.unrealized_pnl || 0)}
        </p>
      </div>
    </div>
  );
}

// ─── TransactionRow ──────────────────────────────────────────────────────────

function TransactionRow({ tx }) {
  const isCredit = tx.direction === "credit" || tx.type === "transfer_in";
  const date = tx.created_at ? new Date(tx.created_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : "";
  return (
    <div className="flex items-center gap-3.5 py-3.5">
      <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-purple-100">
        {isCredit
          ? <ArrowDownLeft className="h-4.5 w-4.5 text-purple-600" />
          : <ArrowUpRight className="h-4.5 w-4.5 text-purple-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{tx.description || tx.type || "Transaction"}</p>
        <p className="text-[11px] text-slate-600 mt-0.5">{date}</p>
      </div>
      <p className="text-sm font-bold tabular-nums text-purple-600">
        {isCredit ? "+" : "-"}{fmt(Math.abs(tx.amount || 0))}
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ─── Main Page ──────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════

export default function ChildDashboardPage({ child: initialChild, onBack }) {
  const { profile } = useProfile();
  const isMounted = useRef(true);
  const [child, setChild] = useState(initialChild);
  const [holdings, setHoldings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [parentBalance, setParentBalance] = useState(null);
  const [parentBalanceLoading, setParentBalanceLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showTransfer, setShowTransfer] = useState(false);
  const [openingTransfer, setOpeningTransfer] = useState(false);
  const [showInvest, setShowInvest] = useState(false);

  const childName = [child?.first_name, child?.last_name].filter(Boolean).join(" ") || "Child";
  const age = getAge(child?.date_of_birth);
  const parentName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "Parent";
  const parentMintNumber = profile?.mintNumber || "";
  const childBalance = child?.available_balance || 0;

  useEffect(() => {
    isMounted.current = true;
    fetchAll();
    return () => { isMounted.current = false; };
  }, [child?.id]);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchHoldings(), fetchParentWallet(), fetchTransactions(), fetchChildBalance()]);
    if (isMounted.current) setLoading(false);
  }

  async function fetchChildBalance() {
    try {
      const res = await fetch(`/api/child-wallet?family_member_id=${child.id}`);
      const json = await res.json();
      if (json.balance !== undefined && isMounted.current) {
        setChild(prev => ({ ...prev, available_balance: json.balance }));
      }
    } catch (e) { console.error("[child-dash] balance", e); }
  }

  async function fetchHoldings() {
    try {
      if (!supabase) return;
      const { data } = await supabase
        .from("stock_holdings")
        .select("id, security_id, quantity, avg_fill, market_value, unrealized_pnl, strategy_id, securities(symbol, name)")
        .eq("family_member_id", child.id)
        .order("market_value", { ascending: false });
      if (isMounted.current) setHoldings(data || []);
    } catch (e) { console.error("[child-dash] holdings", e); }
  }

  async function fetchParentWallet() {
    setParentBalanceLoading(true);
    try {
      if (!supabase) return;
      const userId = (await supabase.auth.getUser())?.data?.user?.id;
      if (!userId) return;
      const { data } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();
      const balanceRands = Number(data?.balance || 0);
      const balanceCents = Math.round(balanceRands * 100);
      if (isMounted.current) setParentBalance(balanceCents);
    } catch (e) {
      console.error("[child-dash] parent wallet", e);
    } finally {
      if (isMounted.current) setParentBalanceLoading(false);
    }
  }

  async function openTransferModal() {
    setOpeningTransfer(true);
    await Promise.all([fetchParentWallet(), fetchChildBalance()]);
    if (isMounted.current) {
      setShowTransfer(true);
      setOpeningTransfer(false);
    }
  }

  async function fetchTransactions() {
    try {
      if (!supabase) return;
      const { data } = await supabase
        .from("transactions")
        .select("id, type, direction, amount, description, created_at")
        .eq("family_member_id", child.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (isMounted.current) setTransactions(data || []);
    } catch (e) { console.error("[child-dash] txns", e); }
  }

  function handleTransferDone(result) {
    if (result.child_balance !== undefined) {
      setChild(prev => ({ ...prev, available_balance: result.child_balance }));
    }
    if (result.parent_balance !== undefined) {
      setParentBalance(result.parent_balance);
    }
    fetchTransactions();
    fetchHoldings();
  }

  function handleInvestDone(result) {
    if (result.child_balance !== undefined) {
      setChild(prev => ({ ...prev, available_balance: result.child_balance }));
    }
    fetchHoldings();
    fetchTransactions();
  }

  const totalPortfolio = holdings.reduce((s, h) => s + (h.market_value || 0), 0);
  const totalPnl = holdings.reduce((s, h) => s + (h.unrealized_pnl || 0), 0);
  const pnlPct = totalPortfolio > 0 ? ((totalPnl / Math.max(totalPortfolio - totalPnl, 1)) * 100) : 0;
  const isPortUp = totalPnl >= 0;

  // Avatar gradient based on first letter hash
  const gradients = [
    "linear-gradient(135deg,#7c3aed,#5b21b6)",
    "linear-gradient(135deg,#a855f7,#7c3aed)",
    "linear-gradient(135deg,#8b5cf6,#6366f1)",
    "linear-gradient(135deg,#a78bfa,#7c3aed)",
    "linear-gradient(135deg,#9333ea,#7c3aed)",
  ];
  const avatarGradient = gradients[(childName.charCodeAt(0) || 0) % gradients.length];

  return (
    <div
      className="min-h-screen pb-[env(safe-area-inset-bottom)]"
      style={{
        backgroundColor: "#f8f6fa",
        backgroundImage: "linear-gradient(180deg,#0d0d12 0%,#0e0a14 0.5%,#100b18 1%,#120c1c 1.5%,#150e22 2%,#181028 2.5%,#1c122f 3%,#201436 3.5%,#25173e 4%,#2a1a46 5%,#301d4f 6%,#362158 7%,#3d2561 8%,#44296b 9%,#4c2e75 10%,#54337f 11%,#5d3889 12%,#663e93 13%,#70449d 14%,#7a4aa7 15%,#8451b0 16%,#8e58b9 17%,#9860c1 18%,#a268c8 19%,#ac71ce 20%,#b57ad3 21%,#be84d8 22%,#c68edc 23%,#cd98e0 24%,#d4a2e3 25%,#daace6 26%,#dfb6e9 27%,#e4c0eb 28%,#e8c9ed 29%,#ecd2ef 30%,#efdaf1 31%,#f2e1f3 32%,#f4e7f5 33%,#f6ecf7 34%,#f8f0f9 35%,#f9f3fa 36%,#faf5fb 38%,#fbf7fc 40%,#fcf9fd 42%,#fdfafd 45%,#faf8fc 55%,#f8f6fa 100%)",
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100vh",
        backgroundAttachment: "fixed",
      }}
    >
      {/* ── Header ── */}
      <div className="px-4 pt-12 pb-6">
        <div className="mx-auto w-full max-w-sm md:max-w-md">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 backdrop-blur-md text-slate-700 border border-slate-200 shadow-sm transition hover:bg-white active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1" />
          </div>

          {/* Child profile card */}
          <div className="flex flex-col items-center mt-6">
            <Avatar name={childName} gradient={avatarGradient} size="h-24 w-24" text="text-4xl" />
            <h1 className="text-2xl font-bold text-slate-800 mt-4 tracking-tight">{childName}</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-bold tracking-wide bg-white/90 backdrop-blur-md text-slate-700 border border-slate-200 shadow-sm">
                <Baby className="h-3.5 w-3.5" />
                {age !== null ? `${age} yr${age !== 1 ? "s" : ""} old` : "Child"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-[11px] text-slate-600">
                Managed by {parentName}
                {parentMintNumber ? ` · #${parentMintNumber}` : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto w-full max-w-sm px-4 pb-12 md:max-w-md">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">

          {/* ── Unified Wallet + Portfolio Card ── */}
          <motion.div
            variants={item}
            className="rounded-3xl relative overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #1e1b4b 0%, #312e81 45%, #4c1d95 100%)",
              boxShadow: "0 24px 48px -12px rgba(79,70,229,0.45)",
            }}
          >
            {/* Subtle glare orbs */}
            <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.07), transparent 70%)" }} />
            <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.18), transparent 70%)" }} />

            <div className="relative px-6 pt-7 pb-6">

              {/* Label row */}
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-white/50 uppercase">Available Balance</p>
                <span className="text-[10px] font-semibold tracking-wider text-white/35 uppercase">{child?.first_name}'s Wallet</span>
              </div>

              {/* Wallet balance */}
              <p className="text-[2.85rem] font-bold text-white tracking-tight leading-none mb-6">{fmt(childBalance)}</p>

              {/* Hairline divider */}
              <div className="h-px w-full mb-5" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }} />

              {/* Portfolio row */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.16em] text-white/45 uppercase mb-1">Portfolio Value</p>
                  <p className="text-2xl font-bold text-white tracking-tight">{fmt(totalPortfolio)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold tracking-[0.16em] text-white/45 uppercase mb-1">All-time return</p>
                  <span
                    className="inline-flex items-center gap-1 text-sm font-bold"
                    style={{ color: isPortUp ? "#86efac" : "#fca5a5" }}
                  >
                    {isPortUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {isPortUp ? "+" : ""}{fmt(totalPnl)}&nbsp;
                    <span className="font-semibold opacity-80">({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)</span>
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={openTransferModal}
                  disabled={openingTransfer}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition active:scale-[0.97]"
                  style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.14)", backdropFilter: "blur(12px)" }}
                >
                  <ArrowDownLeft className="h-4 w-4" />
                  {openingTransfer ? "Loading…" : "Transfer"}
                </button>
                <button
                  onClick={() => setShowInvest(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition active:scale-[0.97]"
                  style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.14)", backdropFilter: "blur(12px)" }}
                >
                  <BarChart3 className="h-4 w-4" />
                  Invest
                </button>
              </div>
            </div>
          </motion.div>

          {/* ── Holdings ── */}
          <motion.div variants={item}>
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="h-2 w-2 rounded-full bg-slate-300" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Holdings</p>
              <span className="text-[10px] text-slate-400 ml-auto">{holdings.length} investment{holdings.length !== 1 ? "s" : ""}</span>
            </div>

            {holdings.length > 0 ? (
              <div className="space-y-2">
                {holdings.map((h) => (
                  <HoldingRow key={h.id} holding={h} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 p-8 text-center shadow-lg bg-white">
                <div className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#e9d5ff,#d8b4fe)" }}>
                  <BarChart3 className="h-7 w-7 text-purple-600" />
                </div>
                <p className="text-sm font-bold text-slate-900">No investments yet</p>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Start investing on {child?.first_name}'s behalf to build their future portfolio.
                </p>
                <button
                  onClick={() => setShowInvest(true)}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-purple-600 hover:text-purple-700 transition"
                >
                  <BarChart3 className="h-4 w-4" /> Browse Strategies
                </button>
              </div>
            )}
          </motion.div>

          {/* ── Recent Activity ── */}
          <motion.div variants={item}>
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="h-2 w-2 rounded-full bg-slate-300" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Recent Activity</p>
            </div>

            {transactions.length > 0 ? (
              <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white">
                <div className="divide-y divide-slate-100 px-5">
                  {transactions.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 p-6 text-center shadow-lg bg-white">
                <p className="text-xs text-slate-600">No activity yet. Transfer or invest to get started.</p>
              </div>
            )}
          </motion.div>

          {/* ── Account Info ── */}
          <motion.div variants={item}>
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="h-2 w-2 rounded-full bg-slate-300" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Account Details</p>
            </div>
            <div className="rounded-2xl shadow-lg border border-slate-200 p-5 bg-white">
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Account Type</span>
                  <span className="font-semibold text-slate-900">Child (Minor)</span>
                </div>
                {age !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Age</span>
                    <span className="font-semibold text-slate-900">{age} year{age !== 1 ? "s" : ""}</span>
                  </div>
                )}
                {child?.date_of_birth && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Date of Birth</span>
                    <span className="font-semibold text-slate-900">
                      {new Date(child.date_of_birth).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t border-slate-100 pt-4">
                  <span className="text-slate-600">Managed By</span>
                  <span className="font-semibold text-slate-900">{parentName}</span>
                </div>
                {parentMintNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Parent Mint #</span>
                    <span className="font-mono text-xs font-semibold text-slate-900">{parentMintNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showTransfer && (
          <TransferModal
            child={child}
            parentBalance={parentBalance}
            balancesLoading={parentBalanceLoading}
            onTransfer={handleTransferDone}
            onClose={() => setShowTransfer(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showInvest && (
          <InvestModal
            child={child}
            onInvest={handleInvestDone}
            onClose={() => setShowInvest(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
