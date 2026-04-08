import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, X, TrendingUp, Heart, Users, ShieldCheck,
  Star, ChevronRight, UserCircle2
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

function InitialAvatar({ name, size = "h-12 w-12", textSize = "text-base", colorClass = "from-violet-500 to-purple-600" }) {
  const initial = (name || "?")[0].toUpperCase();
  return (
    <div className={`${size} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 bg-gradient-to-br ${colorClass}`}>
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
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 mb-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-9 w-9 items-center justify-center rounded-full ${type === "spouse" ? "bg-rose-50 text-rose-500" : "bg-violet-50 text-violet-600"}`}>
            {type === "spouse" ? <Heart className="h-4 w-4" /> : <Users className="h-4 w-4" />}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{type === "spouse" ? "Add Spouse" : "Add Child"}</p>
            <p className="text-xs text-slate-400">{type === "spouse" ? "Link your partner's account" : "Add a child account"}</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={form.first_name}
          onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))}
          placeholder="First name *"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-50 transition"
        />
        <input
          type="text"
          value={form.last_name}
          onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))}
          placeholder="Last name"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-50 transition"
        />
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-0.5">
            Date of birth{type === "child" ? " *" : ""}
          </label>
          <input
            type="date"
            value={form.date_of_birth}
            onChange={(e) => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-50 transition"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2 border border-red-100">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? "Saving..." : type === "spouse" ? "Add Spouse" : "Add Child"}
        </button>
      </div>
    </motion.div>
  );
}

function MemberCard({ avatar, name, badge, badgeColor, subtitle, value, barWidth, barColor, onClick }) {
  const Inner = (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 transition active:scale-[0.99]">
      <div className="flex items-center gap-3">
        {avatar}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {badge && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeColor}`}>
                {badge}
              </span>
            )}
            {subtitle && <span className="text-[11px] text-slate-400">{subtitle}</span>}
          </div>
        </div>
        {value !== undefined && (
          <p className="text-sm font-bold text-slate-900 flex-shrink-0 tabular-nums">{value}</p>
        )}
      </div>
      <div className="mt-3.5 h-1 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );

  if (onClick) {
    return <button onClick={onClick} className="w-full text-left">{Inner}</button>;
  }
  return Inner;
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

  const changePct = portfolioValue > 0 ? ((portfolioChange / Math.max(portfolioValue - portfolioChange, 1)) * 100) : 0;
  const spousalPledge = Math.round(portfolioValue * 0.6);
  const barWidths = [100, 42, 65, 35, 50, 28];

  return (
    <div
      className="min-h-screen pb-[env(safe-area-inset-bottom)]"
      style={{
        backgroundColor: '#f8f6fa',
        backgroundImage: 'linear-gradient(180deg, #0d0d12 0%, #0e0a14 0.5%, #100b18 1%, #120c1c 1.5%, #150e22 2%, #181028 2.5%, #1c122f 3%, #201436 3.5%, #25173e 4%, #2a1a46 5%, #301d4f 6%, #362158 7%, #3d2561 8%, #44296b 9%, #4c2e75 10%, #54337f 11%, #5d3889 12%, #663e93 13%, #70449d 14%, #7a4aa7 15%, #8451b0 16%, #8e58b9 17%, #9860c1 18%, #a268c8 19%, #ac71ce 20%, #b57ad3 21%, #be84d8 22%, #c68edc 23%, #cd98e0 24%, #d4a2e3 25%, #daace6 26%, #dfb6e9 27%, #e4c0eb 28%, #e8c9ed 29%, #ecd2ef 30%, #efdaf1 31%, #f2e1f3 32%, #f4e7f5 33%, #f6ecf7 34%, #f8f0f9 35%, #f9f3fa 36%, #faf5fb 38%, #fbf7fc 40%, #fcf9fd 42%, #fdfafd 45%, #faf8fc 55%, #f8f6fa 100%)',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100vh',
      }}
    >
      {/* Header — sits over the dark gradient top */}
      <div className="px-4 pt-12 pb-6">
        <div className="mx-auto w-full max-w-sm md:max-w-md">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 active:scale-95"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="text-center">
              <h1 className="text-lg font-semibold text-white">
                {familyLastName ? `${familyLastName} Family` : "My Family"}
              </h1>
              <p className="text-xs text-white/50">{totalMembers} member{totalMembers !== 1 ? "s" : ""}</p>
            </div>

            <button
              onClick={() => setAddingType(addingType ? null : (spouse ? "child" : "spouse"))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 active:scale-95"
              aria-label="Add member"
            >
              {addingType ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-sm px-4 pt-2 pb-10 md:max-w-md">

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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 mb-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Family Portfolio</p>
          </div>
          <p className="text-3xl font-bold text-slate-900 tracking-tight mt-2">{fmt(portfolioValue)}</p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                portfolioChange >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
              }`}
            >
              <TrendingUp className="h-3 w-3" />
              {portfolioChange >= 0 ? "+" : ""}{fmt(portfolioChange)}
            </span>
            <span className="text-xs text-slate-400">
              {changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}% all time
            </span>
          </div>
        </motion.div>

        {/* Spousal Pledge Card */}
        {spouse && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 mb-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <Heart className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Combined Spousal Pledge</p>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{fmt(spousalPledge)}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                <ShieldCheck className="h-3 w-3" /> {profile?.firstName || "You"} consented
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                <ShieldCheck className="h-3 w-3" /> {spouse.first_name} consented
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Both spouses have consented to combined pledge per FICA requirements.
            </p>
          </motion.div>
        )}

        {/* Add Child shortcut */}
        {!addingType && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setAddingType("child")}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white p-4 shadow-sm border border-slate-100 text-sm font-medium text-slate-600 hover:bg-slate-50 transition active:scale-[0.99] mb-4"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-50 text-violet-600">
              <Plus className="h-3.5 w-3.5" />
            </span>
            Add Child
          </motion.button>
        )}

        {/* Parents */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.13 }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1 mb-3">Parents</p>
          <div className="space-y-3">

            {/* Main user */}
            <MemberCard
              avatar={<InitialAvatar name={displayName} colorClass="from-violet-500 to-purple-600" />}
              name={displayName}
              badge={
                <><Star className="h-2.5 w-2.5 inline-block mr-0.5" />Head</>
              }
              badgeColor="bg-amber-50 text-amber-600"
              subtitle="· Main Account"
              value={fmt(portfolioValue)}
              barWidth={100}
              barColor="bg-emerald-400"
            />

            {/* Spouse or add spouse */}
            {spouse ? (
              <MemberCard
                avatar={<InitialAvatar name={spouse.first_name} colorClass="from-rose-400 to-pink-500" />}
                name={[spouse.first_name, spouse.last_name].filter(Boolean).join(" ")}
                badge={<><Heart className="h-2.5 w-2.5 inline-block mr-0.5" />Spouse</>}
                badgeColor="bg-rose-50 text-rose-500"
                subtitle={spouse.mint_number ? `· ${spouse.mint_number}` : undefined}
                value={fmt(0)}
                barWidth={42}
                barColor="bg-rose-300"
              />
            ) : (
              !addingType && (
                <button
                  onClick={() => setAddingType("spouse")}
                  className="w-full flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-dashed border-slate-200 text-left hover:bg-slate-50 transition active:scale-[0.99]"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 flex-shrink-0">
                    <Plus className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Add Spouse Account</p>
                    <p className="text-xs text-slate-400">Link your partner's account</p>
                  </div>
                </button>
              )
            )}
          </div>
        </motion.section>

        {/* Children */}
        {children.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-6"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1 mb-3">Children</p>
            <div className="space-y-3">
              {children.map((child, i) => {
                const age = getAge(child.date_of_birth);
                const widths = [65, 35, 55, 28, 48];
                const colors = [
                  "bg-blue-300",
                  "bg-violet-300",
                  "bg-indigo-300",
                  "bg-sky-300",
                  "bg-purple-300",
                ];
                const avatarColors = [
                  "from-blue-400 to-indigo-500",
                  "from-indigo-400 to-violet-500",
                  "from-sky-400 to-blue-500",
                  "from-violet-400 to-purple-500",
                  "from-teal-400 to-cyan-500",
                ];
                return (
                  <MemberCard
                    key={child.id}
                    avatar={<InitialAvatar name={child.first_name} colorClass={avatarColors[i % avatarColors.length]} />}
                    name={[child.first_name, child.last_name].filter(Boolean).join(" ")}
                    badge={
                      age !== null
                        ? <><ShieldCheck className="h-2.5 w-2.5 inline-block mr-0.5" />Managed</>
                        : undefined
                    }
                    badgeColor="bg-slate-100 text-slate-500"
                    subtitle={
                      [age !== null ? `Age ${age}` : null, child.mint_number || null]
                        .filter(Boolean).join(" · ") || undefined
                    }
                    value={fmt(0)}
                    barWidth={widths[i % widths.length]}
                    barColor={colors[i % colors.length]}
                  />
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Empty children state */}
        {children.length === 0 && !loading && !addingType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 rounded-2xl bg-white p-8 shadow-sm border border-slate-100 text-center"
          >
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 mx-auto mb-3">
              <Users className="h-6 w-6" />
            </span>
            <p className="text-sm font-semibold text-slate-700">No children added yet</p>
            <p className="text-xs text-slate-400 mt-1">Add your children's accounts to manage the whole family.</p>
            <button
              onClick={() => setAddingType("child")}
              className="mt-4 text-sm font-semibold text-violet-600 hover:text-violet-700 transition"
            >
              Add a child account
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
