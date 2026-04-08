import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, X, TrendingUp, TrendingDown, Heart, Users,
  ShieldCheck, Crown, Baby, Sparkles, UserPlus, Mail, Upload, Check, FileText
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

// ─── animation variants ──────────────────────────────────────────────────────

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 340, damping: 28 } },
};

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name, gradient, size = "h-14 w-14", text = "text-xl" }) {
  const initial = (name || "?")[0].toUpperCase();
  return (
    <div
      className={`${size} rounded-2xl flex items-center justify-center font-bold text-white flex-shrink-0`}
      style={{ background: gradient }}
    >
      <span className={text}>{initial}</span>
    </div>
  );
}

// ─── AddMemberModal (bottom-sheet) ───────────────────────────────────────────

const slideVariants = {
  enter: (dir) => ({ x: dir * 200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir * -200, opacity: 0 }),
};

function AddMemberModal({ type, userId, onSave, onClose }) {
  /* ── Spouse state ── */
  const [spouseForm, setSpouseForm] = useState({ first_name: "", last_name: "", email: "" });
  const [spouseResult, setSpouseResult] = useState(null); // null | { linked, member } | { invited, … }

  /* ── Child state ── */
  const [childForm, setChildForm] = useState({ first_name: "", last_name: "", date_of_birth: "" });
  const [childStep, setChildStep] = useState(0); // 0 = details, 1 = certificate
  const [slideDir, setSlideDir] = useState(1);
  const [certFile, setCertFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  /* ── Shared ── */
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isSpouse = type === "spouse";

  /* ── Spouse submit ── */
  async function handleSpouseSubmit() {
    if (!spouseForm.first_name?.trim() || !spouseForm.last_name?.trim()) {
      setError("First name and last name are required.");
      return;
    }
    if (spouseForm.email?.trim() && !spouseForm.email.includes("@")) {
      setError("If provided, email must be valid.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/family-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_user_id: userId,
          relationship: "spouse",
          first_name: spouseForm.first_name,
          last_name: spouseForm.last_name,
          email: spouseForm.email,
        }),
      });
      const json = await res.json();
      if (!res.ok && !json.invited) {
        setError(json.error || "Could not link spouse.");
        return;
      }
      if (json.invited) {
        setSpouseResult({ invited: true, ...json });
      } else {
        // Show success screen first — onSave fires when user taps "Done"
        setSpouseResult({ linked: true, member: json.member });
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ── Child: advance to cert step ── */
  function handleChildNext() {
    if (!childForm.first_name.trim()) { setError("First name is required."); return; }
    if (!childForm.date_of_birth) { setError("Date of birth is required."); return; }
    setError("");
    setSlideDir(1);
    setChildStep(1);
  }

  function handleChildBack() {
    setError("");
    setSlideDir(-1);
    setChildStep(0);
  }

  /* ── Child: file pick ── */
  function handleCertSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("File must be under 10 MB.");
        return;
      }
      setError("");
      setCertFile(file);
    }
  }

  /* ── Child: upload cert + save ── */
  async function handleChildSubmit() {
    if (!certFile) { setError("Please upload the birth certificate."); return; }
    setSaving(true);
    setUploading(true);
    setError("");
    try {
      // Upload to Supabase storage
      const safeFileName = certFile.name.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
      const filePath = `${userId}/${Date.now()}-${safeFileName}`;

      let certificateUrl = null;
      if (supabase) {
        const { error: uploadError } = await supabase.storage
          .from("birth-certificates")
          .upload(filePath, certFile, { upsert: true });

        if (uploadError) {
          console.warn("[family] Certificate upload failed:", uploadError.message);
          certificateUrl = `pending://${safeFileName}`;
        } else {
          certificateUrl = `storage://birth-certificates/${filePath}`;
        }
      } else {
        certificateUrl = `pending://${safeFileName}`;
      }

      setUploading(false);

      // POST to API
      const res = await fetch("/api/family-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_user_id: userId,
          relationship: "child",
          first_name: childForm.first_name,
          last_name: childForm.last_name,
          date_of_birth: childForm.date_of_birth,
          certificate_url: certificateUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Could not add child."); return; }
      onSave(json.member);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  /* ── input classes (shared) ── */
  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 transition";

  /* ── render ── */
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <motion.div
        className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38 }}
      >
        {/* Accent strip */}
        <div
          className="h-1 w-full"
          style={{ background: isSpouse ? "linear-gradient(90deg,#fb7185,#f43f5e)" : "linear-gradient(90deg,#818cf8,#6366f1)" }}
        />

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        <div className="px-6 pt-3 pb-8">

          {/* ═══════════════ SPOUSE: form ═══════════════ */}
          {isSpouse && !spouseResult && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#fda4af,#fb7185)" }}
                  >
                    <Heart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">Add Spouse</p>
                    <p className="text-xs text-slate-400">Link your partner's Mint account</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition active:scale-95"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={spouseForm.first_name}
                  onChange={(e) => setSpouseForm(f => ({ ...f, first_name: e.target.value }))}
                  placeholder="First name"
                  autoComplete="off"
                  className={inputCls}
                />
                <input
                  type="text"
                  value={spouseForm.last_name}
                  onChange={(e) => setSpouseForm(f => ({ ...f, last_name: e.target.value }))}
                  placeholder="Last name"
                  autoComplete="off"
                  className={inputCls}
                />
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-0.5">
                    Email address (optional)
                  </label>
                  <input
                    type="email"
                    value={spouseForm.email}
                    onChange={(e) => setSpouseForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="partner@example.com"
                    autoComplete="off"
                    className={inputCls}
                  />
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed px-1">
                  We'll detect your spouse using first name + surname (case-insensitive). Add email only if you want us to send an invite when no match is found.
                </p>

                {error && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 border border-red-100">
                    <X className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-500">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleSpouseSubmit}
                  disabled={saving}
                  className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
                >
                  {saving ? "Checking…" : "Link Spouse"}
                </button>
              </div>
            </>
          )}

          {/* ═══════════════ SPOUSE: linked success ═══════════════ */}
          {isSpouse && spouseResult?.linked && (
            <motion.div
              className="text-center py-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div
                className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#d1fae5,#a7f3d0)" }}
              >
                <ShieldCheck className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="text-lg font-bold text-slate-900">Spouse Linked!</p>
              <p className="text-sm text-slate-500 mt-2">
                {[spouseResult.member?.first_name, spouseResult.member?.last_name].filter(Boolean).join(" ")} has been linked to your family account.
              </p>
              {spouseResult.member?.mint_number && (
                <p className="text-xs text-slate-400 mt-1">Mint # {spouseResult.member.mint_number}</p>
              )}
              <button
                onClick={() => { onSave(spouseResult.member); }}
                className="mt-6 w-full rounded-xl py-3.5 text-sm font-bold text-white active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
              >
                Done
              </button>
            </motion.div>
          )}

          {/* ═══════════════ SPOUSE: invite sent ═══════════════ */}
          {isSpouse && spouseResult?.invited && (
            <motion.div
              className="text-center py-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div
                className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#e0e7ff,#c7d2fe)" }}
              >
                <Mail className="h-8 w-8 text-indigo-500" />
              </div>
              <p className="text-lg font-bold text-slate-900">Invitation Sent</p>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                {spouseResult.message}
              </p>
              <button
                onClick={onClose}
                className="mt-6 w-full rounded-xl py-3.5 text-sm font-bold text-white active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
              >
                Got it
              </button>
            </motion.div>
          )}

          {/* ═══════════════ CHILD: two-step ═══════════════ */}
          {!isSpouse && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {childStep === 1 && (
                    <button
                      onClick={handleChildBack}
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition active:scale-95 mr-1"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#a5b4fc,#818cf8)" }}
                  >
                    {childStep === 0
                      ? <Baby className="h-5 w-5 text-white" />
                      : <FileText className="h-5 w-5 text-white" />}
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">
                      {childStep === 0 ? "Add Child" : "Birth Certificate"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {childStep === 0 ? "Step 1 of 2 — Child details" : "Step 2 of 2 — Upload document"}
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

              {/* Animated step container */}
              <div className="overflow-hidden">
                <AnimatePresence mode="wait" custom={slideDir} initial={false}>
                  {/* Step 0 — details */}
                  {childStep === 0 && (
                    <motion.div
                      key="child-details"
                      custom={slideDir}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={childForm.first_name}
                          onChange={(e) => setChildForm(f => ({ ...f, first_name: e.target.value }))}
                          placeholder="First name *"
                          autoComplete="off"
                          className={inputCls}
                        />
                        <input
                          type="text"
                          value={childForm.last_name}
                          onChange={(e) => setChildForm(f => ({ ...f, last_name: e.target.value }))}
                          placeholder="Last name"
                          autoComplete="off"
                          className={inputCls}
                        />
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-0.5">
                            Date of birth *
                          </label>
                          <input
                            type="date"
                            value={childForm.date_of_birth}
                            onChange={(e) => setChildForm(f => ({ ...f, date_of_birth: e.target.value }))}
                            className={inputCls}
                          />
                        </div>

                        {error && (
                          <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 border border-red-100">
                            <X className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-red-500">{error}</p>
                          </div>
                        )}

                        <button
                          onClick={handleChildNext}
                          className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98]"
                          style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
                        >
                          Next
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 1 — certificate upload */}
                  {childStep === 1 && (
                    <motion.div
                      key="child-cert"
                      custom={slideDir}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <div className="space-y-4">
                        <p className="text-sm text-slate-500 leading-relaxed">
                          Upload <strong>{childForm.first_name || "your child"}'s</strong> unabridged birth certificate to verify their identity.
                        </p>

                        {/* Upload drop-zone */}
                        <label
                          className={`block w-full cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
                            certFile
                              ? "border-emerald-300 bg-emerald-50/50"
                              : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/30"
                          }`}
                        >
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.heic"
                            className="hidden"
                            onChange={handleCertSelect}
                          />
                          {certFile ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Check className="h-5 w-5 text-emerald-600" />
                              </div>
                              <span className="text-sm font-semibold text-emerald-700 truncate max-w-[240px]">
                                {certFile.name}
                              </span>
                            </div>
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                              <p className="text-sm font-semibold text-slate-600">Tap to upload</p>
                              <p className="text-[11px] text-slate-400 mt-1">PDF, JPG or PNG · Max 10 MB</p>
                            </>
                          )}
                        </label>

                        {certFile && (
                          <button
                            onClick={() => setCertFile(null)}
                            className="text-xs text-slate-400 hover:text-red-500 transition"
                          >
                            Remove file
                          </button>
                        )}

                        {error && (
                          <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 border border-red-100">
                            <X className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-red-500">{error}</p>
                          </div>
                        )}

                        <button
                          onClick={handleChildSubmit}
                          disabled={saving || !certFile}
                          className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
                        >
                          {uploading ? "Uploading…" : saving ? "Adding…" : "Add Child"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── MemberRow ───────────────────────────────────────────────────────────────

function MemberRow({ gradient, name, role, roleIcon, roleColor, detail, value, barPct, barGradient, delay = 0 }) {
  return (
    <motion.div variants={item} className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
      {/* accent bar on left edge */}
      <div className="flex">
        <div className="w-1 flex-shrink-0" style={{ background: barGradient }} />
        <div className="flex-1 p-4">
          <div className="flex items-center gap-3.5">
            <Avatar name={name} gradient={gradient} size="h-13 w-13" style={{ height: 52, width: 52 }} />
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-slate-900 leading-tight truncate">{name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide"
                  style={{ background: roleColor.bg, color: roleColor.text }}
                >
                  {roleIcon}
                  {role}
                </span>
                {detail && <span className="text-[11px] text-slate-400 truncate">{detail}</span>}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[15px] font-bold text-slate-900 tabular-nums">{value}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: barGradient }}
              initial={{ width: 0 }}
              animate={{ width: `${barPct}%` }}
              transition={{ delay: delay + 0.3, duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FamilyDashboardPage({ onBack, userId, onOpenChildDashboard }) {
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
    if (userId) { fetchMembers(); fetchPortfolio(); }
  }, [userId]);

  async function fetchMembers() {
    setLoading(true);
    try {
      const res = await fetch(`/api/family-members?user_id=${userId}`);
      const json = await res.json();
      setMembers(json.members || []);
    } catch (e) { console.error("[family]", e); }
    finally { setLoading(false); }
  }

  async function fetchPortfolio() {
    if (!userId) return;
    try {
      const { data: holdings } = await supabase
        .from("stock_holdings").select("market_value, unrealized_pnl").eq("user_id", userId);
      if (holdings) {
        setPortfolioValue(holdings.reduce((s, h) => s + (h.market_value || 0), 0));
        setPortfolioChange(holdings.reduce((s, h) => s + (h.unrealized_pnl || 0), 0));
      }
    } catch (e) { console.error("[family] portfolio", e); }
  }

  function handleMemberSaved(member) {
    setMembers(prev => [...prev, member]);
    setAddingType(null);
  }

  const changePct = portfolioValue > 0
    ? ((portfolioChange / Math.max(portfolioValue - portfolioChange, 1)) * 100) : 0;
  const spousalPledge = Math.round(portfolioValue * 0.6);
  const isPositive = portfolioChange >= 0;

  const childAvatarGradients = [
    "linear-gradient(135deg,#60a5fa,#3b82f6)",
    "linear-gradient(135deg,#a78bfa,#7c3aed)",
    "linear-gradient(135deg,#34d399,#059669)",
    "linear-gradient(135deg,#f472b6,#db2777)",
    "linear-gradient(135deg,#fb923c,#ea580c)",
  ];
  const childBarGradients = [
    "linear-gradient(90deg,#60a5fa,#3b82f6)",
    "linear-gradient(90deg,#a78bfa,#7c3aed)",
    "linear-gradient(90deg,#34d399,#059669)",
    "linear-gradient(90deg,#f472b6,#db2777)",
    "linear-gradient(90deg,#fb923c,#ea580c)",
  ];
  const childBarWidths = [62, 38, 70, 45, 55];

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
      {/* ── Header ── */}
      <div className="px-4 pt-12 pb-5">
        <div className="mx-auto w-full max-w-sm md:max-w-md">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25 active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-white tracking-tight">
                {familyLastName ? `${familyLastName} Family` : "My Family"}
              </h1>
              <p className="text-xs text-white/50 mt-0.5">{totalMembers} member{totalMembers !== 1 ? "s" : ""}</p>
            </div>
            <button
              onClick={() => setAddingType(addingType ? null : (spouse ? "child" : "spouse"))}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25 active:scale-95"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={addingType ? "x" : "plus"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {addingType ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto w-full max-w-sm px-4 pb-12 md:max-w-md">

        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">

          {/* ── Portfolio card ── */}
          <motion.div
            variants={item}
            className="rounded-3xl p-5 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#3730a3 100%)" }}
          >
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full opacity-10" style={{ background: "radial-gradient(circle,#fff,transparent)" }} />
            <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full opacity-10" style={{ background: "radial-gradient(circle,#818cf8,transparent)" }} />

            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-lg bg-white/15 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-white/80" />
                </div>
                <p className="text-[11px] font-bold tracking-widest text-white/50 uppercase">Family Portfolio</p>
              </div>

              <p className="text-4xl font-bold text-white tracking-tight">{fmt(portfolioValue)}</p>

              <div className="flex items-center gap-2 mt-3">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold"
                  style={{
                    background: isPositive ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)",
                    color: isPositive ? "#6ee7b7" : "#fca5a5",
                  }}
                >
                  {isPositive
                    ? <TrendingUp className="h-3 w-3" />
                    : <TrendingDown className="h-3 w-3" />}
                  {isPositive ? "+" : ""}{fmt(portfolioChange)}
                </span>
                <span className="text-xs text-white/40">
                  {changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}% all time
                </span>
              </div>

              {/* Member count row */}
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-1.5">
                {[...Array(Math.min(totalMembers, 5))].map((_, i) => (
                  <div
                    key={i}
                    className="h-6 w-6 rounded-full border-2 border-indigo-800 bg-indigo-500 flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ marginLeft: i > 0 ? -8 : 0 }}
                  />
                ))}
                <p className="text-xs text-white/40 ml-2">{totalMembers} account{totalMembers !== 1 ? "s" : ""} linked</p>
              </div>
            </div>
          </motion.div>

          {/* ── Spousal Pledge card ── */}
          {spouse && (
            <motion.div
              variants={item}
              className="rounded-3xl bg-white shadow-sm border border-slate-100 overflow-hidden"
            >
              <div className="h-1" style={{ background: "linear-gradient(90deg,#fb7185,#f43f5e,#e11d48)" }} />
              <div className="p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#fda4af,#fb7185)" }}>
                    <Heart className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">Combined Spousal Pledge</p>
                </div>
                <p className="text-3xl font-bold text-slate-900 tracking-tight">{fmt(spousalPledge)}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[profile?.firstName || "You", spouse.first_name].map((name) => (
                    <span key={name} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <ShieldCheck className="h-3 w-3" /> {name} consented
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                  Both spouses have consented to a combined pledge per FICA requirements.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Parents section ── */}
          <motion.div variants={item}>
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Parents</p>
            </div>
            <div className="space-y-3">

              {/* Main user */}
              <MemberRow
                gradient="linear-gradient(135deg,#7c3aed,#5b21b6)"
                name={displayName}
                role="Head"
                roleIcon={<Crown className="h-2.5 w-2.5" />}
                roleColor={{ bg: "#fef3c7", text: "#d97706" }}
                detail="Main Account"
                value={fmt(portfolioValue)}
                barPct={100}
                barGradient="linear-gradient(90deg,#34d399,#059669)"
              />

              {/* Spouse or placeholder */}
              {spouse ? (
                <MemberRow
                  gradient="linear-gradient(135deg,#fb7185,#e11d48)"
                  name={[spouse.first_name, spouse.last_name].filter(Boolean).join(" ")}
                  role="Spouse"
                  roleIcon={<Heart className="h-2.5 w-2.5" />}
                  roleColor={{ bg: "#fff1f2", text: "#e11d48" }}
                  detail={spouse.mint_number || undefined}
                  value={fmt(0)}
                  barPct={40}
                  barGradient="linear-gradient(90deg,#fb7185,#e11d48)"
                />
              ) : !addingType && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setAddingType("spouse")}
                  className="w-full flex items-center gap-4 rounded-2xl bg-white shadow-sm border-2 border-dashed border-slate-200 p-4 text-left hover:border-rose-200 hover:bg-rose-50/30 transition group"
                >
                  <div className="h-13 w-13 rounded-2xl border-2 border-dashed border-slate-200 group-hover:border-rose-300 flex items-center justify-center flex-shrink-0 transition" style={{ height: 52, width: 52 }}>
                    <UserPlus className="h-5 w-5 text-slate-300 group-hover:text-rose-400 transition" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-600 group-hover:text-slate-800 transition">Add Spouse Account</p>
                    <p className="text-xs text-slate-400 mt-0.5">Link your partner's account</p>
                  </div>
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* ── Children section ── */}
          {children.length > 0 && (
            <motion.div variants={item}>
              <div className="flex items-center gap-2 mb-3 px-1 mt-2">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Children</p>
              </div>
              <div className="space-y-3">
                {children.map((child, i) => {
                  const age = getAge(child.date_of_birth);
                  const childName = [child.first_name, child.last_name].filter(Boolean).join(" ");
                  const parentMint = profile?.mintNumber;
                  return (
                    <motion.button
                      key={child.id}
                      variants={item}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onOpenChildDashboard?.(child)}
                      className="w-full text-left rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden"
                    >
                      <div className="flex">
                        <div className="w-1 flex-shrink-0" style={{ background: childBarGradients[i % childBarGradients.length] }} />
                        <div className="flex-1 p-4">
                          <div className="flex items-center gap-3.5">
                            <Avatar name={childName} gradient={childAvatarGradients[i % childAvatarGradients.length]} size="h-13 w-13" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] font-bold text-slate-900 leading-tight truncate">{childName}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide" style={{ background: "#eff6ff", color: "#2563eb" }}>
                                  <Baby className="h-2.5 w-2.5" />
                                  Child
                                </span>
                                {age !== null && (
                                  <span className="text-[11px] font-semibold text-slate-500">{age} yr{age !== 1 ? "s" : ""} old</span>
                                )}
                              </div>
                              {/* Managed by parent */}
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <ShieldCheck className="h-3 w-3 text-indigo-400 flex-shrink-0" />
                                <span className="text-[10px] text-slate-400 truncate">
                                  Managed by {profile?.firstName || "Parent"}
                                  {parentMint ? ` · #${parentMint}` : ""}
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[15px] font-bold text-slate-900 tabular-nums">{fmt(child.available_balance || 0)}</p>
                              {child.mint_number && (
                                <p className="text-[10px] text-slate-400 mt-0.5">{child.mint_number}</p>
                              )}
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-3.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: childBarGradients[i % childBarGradients.length] }}
                              initial={{ width: 0 }}
                              animate={{ width: `${childBarWidths[i % childBarWidths.length]}%` }}
                              transition={{ delay: i * 0.06 + 0.3, duration: 0.8, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}

                {/* Add another child button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setAddingType("child")}
                  className="w-full flex items-center gap-4 rounded-2xl bg-white shadow-sm border-2 border-dashed border-slate-200 p-4 text-left hover:border-indigo-200 hover:bg-indigo-50/30 transition group"
                >
                  <div className="h-[52px] w-[52px] rounded-2xl border-2 border-dashed border-slate-200 group-hover:border-indigo-300 flex items-center justify-center flex-shrink-0 transition">
                    <Plus className="h-5 w-5 text-slate-300 group-hover:text-indigo-400 transition" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-600 group-hover:text-slate-800 transition">Add Child Account</p>
                    <p className="text-xs text-slate-400 mt-0.5">Add another child to your family</p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Empty children state ── */}
          {children.length === 0 && !loading && !addingType && (
            <motion.div
              variants={item}
              className="rounded-3xl bg-white shadow-sm border border-slate-100 p-8 text-center"
            >
              <div className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#e0e7ff,#c7d2fe)" }}>
                <Users className="h-7 w-7 text-indigo-400" />
              </div>
              <p className="text-sm font-bold text-slate-800">No children added yet</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">Add your children's accounts to manage the whole family from one place.</p>
              <button
                onClick={() => setAddingType("child")}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-500 hover:text-indigo-600 transition"
              >
                <Plus className="h-3.5 w-3.5" /> Add a child account
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ── Add member modal (bottom-sheet, fixed overlay) ── */}
      <AnimatePresence>
        {addingType && (
          <AddMemberModal
            type={addingType}
            userId={userId}
            onSave={handleMemberSaved}
            onClose={() => setAddingType(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
