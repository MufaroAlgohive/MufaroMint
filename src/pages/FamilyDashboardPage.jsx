import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, X, TrendingUp, Heart, Users, Shield, ChevronRight,
  Star, User
} from "lucide-react";
import { useProfile } from "../lib/useProfile";
import { supabase } from "../lib/supabase";

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
  return `R${val.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function InitialAvatar({ name, size = "h-11 w-11", bg = "from-violet-600 to-purple-500", textSize = "text-sm" }) {
  const initial = (name || "?")[0].toUpperCase();
  return (
    <div
      className={`${size} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 bg-gradient-to-br ${bg}`}
    >
      <span className={textSize}>{initial}</span>
    </div>
  );
}

function AddMemberForm({ type, userId, onSave, onCancel }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", date_of_birth: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!form.first_name.trim()) { setError("First name is required."); return; }
    if (type === "child" && !form.date_of_birth) { setError("Date of birth is required for a child."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/family-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_user_id: userId,
          relationship: type,
          first_name: form.first_name,
          last_name: form.last_name,
          date_of_birth: form.date_of_birth || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Could not add family member."); return; }
      onSave(json.member);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="rounded-2xl p-5 mb-4"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {type === "spouse"
            ? <Heart className="h-4 w-4 text-pink-400" />
            : <Users className="h-4 w-4 text-violet-400" />}
          <p className="text-sm font-semibold text-white">
            {type === "spouse" ? "Add Spouse" : "Add Child"}
          </p>
        </div>
        <button onClick={onCancel} className="h-7 w-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
          <X className="h-3.5 w-3.5 text-white/60" />
        </button>
      </div>
      <div className="space-y-3">
        <input
          type="text"
          value={form.first_name}
          onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))}
          placeholder="First name *"
          className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
        />
        <input
          type="text"
          value={form.last_name}
          onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))}
          placeholder="Last name"
          className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
        />
        <div>
          <label className="block text-xs text-white/40 mb-1.5 ml-1">
            Date of birth{type === "child" ? " *" : ""}
          </label>
          <input
            type="date"
            value={form.date_of_birth}
            onChange={(e) => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
            className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", colorScheme: "dark" }}
          />
        </div>
        {error && <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
        >
          {saving ? "Saving..." : type === "spouse" ? "Add Spouse" : "Add Child"}
        </button>
      </div>
    </motion.div>
  );
}

export default function FamilyDashboardPage({ onBack, userId }) {
  const { profile } = useProfile();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [portfolioChange, setPortfolioChange] = useState(0);
  const [addingType, setAddingType] = useState(null);

  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "My Account";
  const familyLastName = profile?.lastName || "";
  const spouse = members.find(m => m.relationship === "spouse");
  const children = members.filter(m => m.relationship === "child");
  const totalMembers = 1 + members.length;

  useEffect(() => {
    if (userId) {
      fetchMembers();
      fetchPortfolio();
    }
  }, [userId]);

  async function fetchMembers() {
    setLoading(true);
    try {
      const res = await fetch(`/api/family-members?user_id=${userId}`);
      const json = await res.json();
      setMembers(json.members || []);
    } catch (e) {
      console.error("[family]", e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPortfolio() {
    if (!userId) return;
    try {
      const { data: holdings } = await supabase
        .from("stock_holdings")
        .select("market_value, unrealized_pnl")
        .eq("user_id", userId);
      if (holdings) {
        const total = holdings.reduce((s, h) => s + (h.market_value || 0), 0);
        const pnl = holdings.reduce((s, h) => s + (h.unrealized_pnl || 0), 0);
        setPortfolioValue(total);
        setPortfolioChange(pnl);
      }
    } catch (e) {
      console.error("[family] portfolio error", e);
    }
  }

  function handleMemberSaved(member) {
    setMembers(prev => [...prev, member]);
    setAddingType(null);
  }

  const spousalPledge = Math.round(portfolioValue * 0.6);
  const changePct = portfolioValue > 0 ? ((portfolioChange / (portfolioValue - portfolioChange)) * 100) : 0;

  return (
    <div
      className="min-h-screen pb-20"
      style={{ background: "linear-gradient(180deg,#0d0d12 0%,#1a1030 40%,#160d28 100%)" }}
    >
      {/* Header */}
      <div className="px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={onBack}
            className="h-9 w-9 flex items-center justify-center rounded-full"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <ArrowLeft className="h-4 w-4 text-white" />
          </button>
          <button
            onClick={() => setAddingType(addingType ? null : (spouse ? "child" : "spouse"))}
            className="h-9 w-9 flex items-center justify-center rounded-full"
            style={{ background: "rgba(139,92,246,0.25)", border: "1px solid rgba(139,92,246,0.4)" }}
          >
            <Plus className="h-4 w-4 text-violet-300" />
          </button>
        </div>
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-white">
            {familyLastName ? `${familyLastName} Family` : "My Family"}
          </h1>
          <p className="text-sm text-white/45 mt-0.5">{totalMembers} member{totalMembers !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Add form */}
        <AnimatePresence>
          {addingType && (
            <AddMemberForm
              type={addingType}
              userId={userId}
              onSave={handleMemberSaved}
              onCancel={() => setAddingType(null)}
            />
          )}
        </AnimatePresence>

        {/* Family Portfolio Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-3.5 w-3.5 text-white/40" />
            <p className="text-[11px] font-bold tracking-widest text-white/40 uppercase">Family Portfolio</p>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">{fmt(portfolioValue)}</p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ background: portfolioChange >= 0 ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.15)", color: portfolioChange >= 0 ? "#34d399" : "#f87171" }}
            >
              <TrendingUp className="h-3 w-3" />
              {portfolioChange >= 0 ? "+" : ""}{fmt(portfolioChange)}
            </span>
            <span className="text-xs text-white/40">
              {changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}% all time
            </span>
          </div>
        </motion.div>

        {/* Spousal Pledge Card — only if spouse exists */}
        {spouse && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Heart className="h-3.5 w-3.5 text-pink-400" />
              <p className="text-[11px] font-bold tracking-widest text-pink-400 uppercase">Combined Spousal Pledge</p>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">{fmt(spousalPledge)}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-emerald-300" style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.2)" }}>
                <Shield className="h-3 w-3" /> {profile?.firstName || "You"} consented
              </span>
              {spouse && (
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-emerald-300" style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.2)" }}>
                  <Shield className="h-3 w-3" /> {spouse.first_name} consented
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/30 mt-2">Both spouses have consented to combined pledge per FICA requirements.</p>
          </motion.div>
        )}

        {/* Add Child button */}
        {!addingType && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => setAddingType("child")}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-medium transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div
              className="h-5 w-5 rounded-full flex items-center justify-center"
              style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)" }}
            >
              <Plus className="h-3 w-3 text-violet-400" />
            </div>
            <span className="text-white/60">Add Child</span>
          </motion.button>
        )}

        {/* Parents section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-[11px] font-bold tracking-widest text-white/30 uppercase mb-3 px-1">Parents</p>
          <div className="space-y-3">
            {/* Main user */}
            <div
              className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="flex items-center gap-3">
                <InitialAvatar name={displayName} bg="from-violet-600 to-purple-500" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-amber-300" style={{ background: "rgba(251,191,36,0.12)" }}>
                      <Star className="h-2.5 w-2.5" /> Head
                    </span>
                    <span className="text-[11px] text-white/40">· Main Account</span>
                  </div>
                </div>
                <p className="text-sm font-bold text-white flex-shrink-0">{fmt(portfolioValue)}</p>
              </div>
              <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: "100%" }} />
              </div>
            </div>

            {/* Spouse */}
            {spouse ? (
              <div
                className="rounded-2xl p-4"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-center gap-3">
                  <InitialAvatar name={spouse.first_name} bg="from-pink-600 to-purple-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {[spouse.first_name, spouse.last_name].filter(Boolean).join(" ")}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-pink-300" style={{ background: "rgba(236,72,153,0.12)" }}>
                        <Heart className="h-2.5 w-2.5" /> Spouse
                      </span>
                      <span className="text-[11px] text-white/40">· {spouse.mint_number || ""}</span>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-white flex-shrink-0">{fmt(0)}</p>
                </div>
                <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-400" style={{ width: "40%" }} />
                </div>
              </div>
            ) : (
              !addingType && (
                <button
                  onClick={() => setAddingType("spouse")}
                  className="w-full flex items-center gap-3 rounded-2xl p-4 text-left group transition-colors"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.12)" }}
                >
                  <div
                    className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ border: "2px dashed rgba(139,92,246,0.4)" }}
                  >
                    <Plus className="h-4 w-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-violet-400 group-hover:text-violet-300 transition-colors">Add Spouse Account</p>
                    <p className="text-xs text-white/30">Link your partner's account</p>
                  </div>
                </button>
              )
            )}
          </div>
        </motion.div>

        {/* Children section */}
        {children.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <p className="text-[11px] font-bold tracking-widest text-white/30 uppercase mb-3 px-1">Children</p>
            <div className="space-y-3">
              {children.map((child, i) => {
                const age = getAge(child.date_of_birth);
                const barWidths = [55, 38, 70, 45, 30];
                const barWidth = barWidths[i % barWidths.length];
                return (
                  <div
                    key={child.id}
                    className="rounded-2xl p-4"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <div className="flex items-center gap-3">
                      <InitialAvatar name={child.first_name} bg="from-indigo-600 to-violet-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {[child.first_name, child.last_name].filter(Boolean).join(" ")}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Shield className="h-3 w-3 text-white/30" />
                          <p className="text-[11px] text-white/40">
                            {age !== null ? `Age ${age}` : ""}
                            {age !== null && child.mint_number ? " · " : ""}
                            {child.mint_number || ""}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-white flex-shrink-0">{fmt(0)}</p>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Empty children state */}
        {children.length === 0 && !loading && !addingType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6"
          >
            <Users className="h-8 w-8 text-white/15 mx-auto mb-2" />
            <p className="text-sm text-white/30">No children added yet</p>
            <button
              onClick={() => setAddingType("child")}
              className="mt-3 text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              Add a child account
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
