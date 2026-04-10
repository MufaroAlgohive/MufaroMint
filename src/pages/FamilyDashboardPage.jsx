import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, X, TrendingUp, TrendingDown, Heart, Users,
  ShieldCheck, Crown, Baby, UserPlus, Mail, Upload, Check, FileText,
  ChevronDown, Clock, AlertCircle, Trash2
} from "lucide-react";
import { useProfile } from "../lib/useProfile";
import { supabase } from "../lib/supabase";
import ChildResponsibilityAgreement from "../components/ChildResponsibilityAgreement";
import MinorProofOfAddressDeclaration from "../components/MinorProofOfAddressDeclaration";

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
      style={{ background: gradient, aspectRatio: "1" }}
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

function AddMemberModal({ type, userId, profile, onSave, onClose }) {
  /* ── Spouse state ── */
  const [spouseMode, setSpouseMode] = useState(null); // null | 'link' | 'invite'
  // Link mode
  const [spouseLinkEmail, setSpouseLinkEmail] = useState("");
  const [spouseLinkId, setSpouseLinkId] = useState("");
  const [spousePending, setSpousePending] = useState(null); // { member_id, masked_email } after code sent
  const [spousePairingCode, setSpousePairingCode] = useState("");
  // Invite mode
  const [spouseFirstName, setSpouseFirstName] = useState("");
  const [spouseLastName, setSpouseLastName] = useState("");
  const [spouseEmail, setSpouseEmail] = useState("");
  // Shared result
  const [spouseResult, setSpouseResult] = useState(null); // null | { linked, kyc_pending, member } | { invited, … }

  /* ── Child state ── */
  const [childForm, setChildForm] = useState({ first_name: "", last_name: "", date_of_birth: "", id_number: "" });
  const [childStep, setChildStep] = useState(0); // 0 = details, 1 = certificate
  const [slideDir, setSlideDir] = useState(1);
  const [certFile, setCertFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newChildMember, setNewChildMember] = useState(null);

  /* ── Shared ── */
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isSpouse = type === "spouse";

  /* ── Spouse: send pairing code (link existing Mint member) ── */
  async function handleSpouseLinkSubmit() {
    if (!spouseLinkEmail.trim() || !spouseLinkEmail.includes("@")) {
      setError("Please enter a valid email address.");
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
          mode: "link",
          email: spouseLinkEmail.trim(),
          id_number: spouseLinkId.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Could not send pairing request."); return; }
      setSpousePending({ member_id: json.member_id, masked_email: json.masked_email });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ── Spouse: confirm pairing code ── */
  async function handleSpouseConfirmCode() {
    const code = spousePairingCode.trim();
    if (!code || code.length < 6) { setError("Please enter the 6-digit code."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/family-members/confirm-pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: spousePending.member_id, code }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Invalid or expired code."); return; }
      setSpouseResult({ linked: true, kyc_pending: json.kyc_pending, member: json.member });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ── Spouse: invite (not yet on Mint) ── */
  async function handleSpouseInviteSubmit() {
    if (!spouseEmail.trim() || !spouseEmail.includes("@")) {
      setError("Please enter a valid email address.");
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
          mode: "invite",
          first_name: spouseFirstName.trim() || undefined,
          last_name: spouseLastName.trim() || undefined,
          email: spouseEmail.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Could not send invite."); return; }
      setSpouseResult({ invited: true, ...json });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ── SA ID DOB cross-check ── */
  function verifyIdVsDob(idNumber, dob) {
    const clean = String(idNumber || "").replace(/\D/g, "");
    if (clean.length !== 13 || !dob) return { checked: false };
    const yy = clean.substring(0, 2);
    const mm = clean.substring(2, 4);
    const dd = clean.substring(4, 6);
    const yearNum = parseInt(yy, 10);
    const fullYear = yearNum <= new Date().getFullYear() % 100 ? `20${yy}` : `19${yy}`;
    const idDob = `${fullYear}-${mm}-${dd}`;
    const match = idDob === dob;
    return { checked: true, match, idDob };
  }

  /* ── Child: advance to cert step ── */
  function handleChildNext() {
    if (!childForm.first_name.trim()) { setError("First name is required."); return; }
    if (!childForm.date_of_birth) { setError("Date of birth is required."); return; }

    const idClean = childForm.id_number.replace(/\D/g, "");
    if (!idClean || idClean.length !== 13) {
      setError("Child's SA ID number is required and must be exactly 13 digits.");
      return;
    }
    const { checked, match } = verifyIdVsDob(idClean, childForm.date_of_birth);
    if (checked && !match) {
      setError("The date of birth extracted from the ID number does not match the date of birth entered. Please check both fields.");
      return;
    }

    setError("");
    setSlideDir(1);
    setChildStep(1);
  }

  function handleChildBack() {
    setError("");
    setSlideDir(-1);
    if (childStep === 3) {
      setChildStep(2);
    } else {
      setChildStep(0);
    }
  }

  /* ── Child: POA complete → upload PDF / file, then proceed to agreement ── */
  async function handlePoaComplete({ livesWithParent, pdfBuffer, fileUpload, signedAt }) {
    if (!newChildMember) return;
    setSaving(true);
    setError("");
    try {
      let poaUrl = null;

      if (livesWithParent && pdfBuffer) {
        const uint8 = new Uint8Array(pdfBuffer);
        let binary = "";
        for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
        const pdfBase64 = btoa(binary);

        const uploadRes = await fetch("/api/onboarding/upload-agreement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfBase64 }),
        });
        const uploadJson = await uploadRes.json();
        if (uploadRes.ok && uploadJson.publicUrl) {
          poaUrl = uploadJson.publicUrl;
        }
      } else if (!livesWithParent && fileUpload) {
        if (supabase) {
          const safeFileName = fileUpload.name.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
          const filePath = `poa/${newChildMember.id}/${Date.now()}-${safeFileName}`;
          const { error: uploadErr } = await supabase.storage
            .from("birth-certificates")
            .upload(filePath, fileUpload, { upsert: true });
          if (!uploadErr) {
            poaUrl = `storage://birth-certificates/${filePath}`;
          }
        }
      }

      if (poaUrl) {
        await fetch(`/api/family-members/${newChildMember.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ poa_declaration_url: poaUrl, poa_declaration_signed_at: signedAt }),
        });
        setNewChildMember(prev => ({ ...prev, poa_declaration_url: poaUrl }));
      }

      setSlideDir(1);
      setChildStep(3);
    } catch (e) {
      console.error("[poa]", e);
      setError("POA upload failed — you can complete this from your child's profile later.");
      setSlideDir(1);
      setChildStep(3);
    } finally {
      setSaving(false);
    }
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

  /* ── Determine certificate verification status ── */
  function getCertVerificationStatus() {
    const idClean = childForm.id_number.replace(/\D/g, "");
    if (idClean.length === 13) {
      const { checked, match } = verifyIdVsDob(idClean, childForm.date_of_birth);
      if (checked && match) return "id_matched_pending_review";
    }
    return "pending_review";
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

      const idClean = childForm.id_number.replace(/\D/g, "");
      const certVerificationStatus = getCertVerificationStatus();

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
          id_number: idClean || undefined,
          certificate_url: certificateUrl,
          certificate_verification_status: certVerificationStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Could not add child."); return; }
      
      // Instead of onSave immediately, we move to the Agreement step
      setNewChildMember(json.member);
      setSlideDir(1);
      setChildStep(2);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }

  async function handleAgreementComplete({ pdfBuffer, signedAt }) {
    if (!newChildMember) return;
    setSaving(true);
    setError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Session expired.");

      // 1. Upload PDF
      const uint8 = new Uint8Array(pdfBuffer);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
      const pdfBase64 = btoa(binary);

      const uploadRes = await fetch("/api/onboarding/upload-agreement", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pdfBase64 }),
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.publicUrl) {
        throw new Error(uploadJson.error || "Failed to upload agreement.");
      }

      // 2. Patch family member record
      const updateRes = await fetch(`/api/family-members/${newChildMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signed_agreement_url: uploadJson.publicUrl,
          signed_at: signedAt,
        }),
      });
      
      if (!updateRes.ok) {
        // Fallback for older API versions or missing endpoint
        console.warn("[family] PATCH failed, trying metadata update via Supabase directly");
        await supabase
          .from("family_members")
          .update({
            signed_agreement_url: uploadJson.publicUrl,
            signed_at: signedAt,
          })
          .eq("id", newChildMember.id);
      }

      const finalMember = { 
        ...newChildMember, 
        signed_agreement_url: uploadJson.publicUrl, 
        signed_at: signedAt 
      };
      onSave(finalMember);
    } catch (err) {
      setError(err.message || "Finalization failed.");
    } finally {
      setSaving(false);
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
          style={{ background: isSpouse ? "linear-gradient(90deg,#a855f7,#7c3aed)" : "linear-gradient(90deg,#8b5cf6,#6366f1)" }}
        />

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        <div className="px-6 pt-3 pb-8">

          {/* ═══════════════ SPOUSE: shared header ═══════════════ */}
          {isSpouse && !spouseResult && (
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {spouseMode !== null && !spousePending && (
                  <button
                    onClick={() => { setSpouseMode(null); setError(""); }}
                    className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition active:scale-95 mr-1"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                )}
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)" }}
                >
                  <Heart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900">
                    {spouseMode === null ? "Add Spouse" :
                     spouseMode === "link" && !spousePending ? "Link Mint Member" :
                     spouseMode === "link" && spousePending ? "Enter Pairing Code" :
                     "Invite to Mint"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {spouseMode === null ? "Choose how to add your spouse" :
                     spouseMode === "link" && !spousePending ? "Your partner has a Mint account" :
                     spouseMode === "link" && spousePending ? `Code sent to ${spousePending.masked_email}` :
                     "We'll send them an invitation"}
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
          )}

          {/* ── Mode selection ── */}
          {isSpouse && !spouseResult && spouseMode === null && (
            <div className="space-y-3">
              <button
                onClick={() => { setSpouseMode("link"); setError(""); }}
                className="w-full flex items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-left hover:border-violet-300 hover:bg-violet-50/50 transition active:scale-[0.98]"
              >
                <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#ede9fe,#ddd6fe)" }}>
                  <ShieldCheck className="h-5 w-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">Link existing Mint member</p>
                  <p className="text-xs text-slate-500 mt-0.5">Your partner already has a Mint account</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400 -rotate-90 flex-shrink-0" />
              </button>

              <button
                onClick={() => { setSpouseMode("invite"); setError(""); }}
                className="w-full flex items-center gap-4 rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-left hover:border-violet-300 hover:bg-violet-50/50 transition active:scale-[0.98]"
              >
                <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#e0f2fe,#bae6fd)" }}>
                  <Mail className="h-5 w-5 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">Invite to Mint</p>
                  <p className="text-xs text-slate-500 mt-0.5">Your partner isn't on Mint yet</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400 -rotate-90 flex-shrink-0" />
              </button>
            </div>
          )}

          {/* ── Link mode: step 1 — enter email + ID ── */}
          {isSpouse && !spouseResult && spouseMode === "link" && !spousePending && (
            <div className="space-y-3">
              <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3">
                <p className="text-xs text-violet-700 leading-relaxed">
                  We'll send your partner a <strong>6-digit pairing code</strong> by email. They share it with you, and you enter it here to confirm the link.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-0.5">
                  Partner's Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={spouseLinkEmail}
                  onChange={(e) => { setSpouseLinkEmail(e.target.value); setError(""); }}
                  placeholder="partner@example.com"
                  autoComplete="off"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-0.5">
                  Partner's SA ID Number <span className="normal-case font-normal text-slate-400">(optional — for verification)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  value={spouseLinkId}
                  onChange={(e) => { setSpouseLinkId(e.target.value.replace(/\D/g, "")); setError(""); }}
                  placeholder="13-digit ID number"
                  autoComplete="off"
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
                onClick={handleSpouseLinkSubmit}
                disabled={saving || !spouseLinkEmail.trim()}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
              >
                {saving ? "Sending…" : "Send Pairing Code"}
              </button>
            </div>
          )}

          {/* ── Link mode: step 2 — enter code ── */}
          {isSpouse && !spouseResult && spouseMode === "link" && spousePending && (
            <div className="space-y-4">
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-4">
                <p className="text-sm font-semibold text-emerald-800 mb-1">Pairing code sent!</p>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  A 6-digit code was emailed to <strong>{spousePending.masked_email}</strong>. Ask your partner to check their email and share the code with you.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-0.5">
                  Enter 6-digit code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={spousePairingCode}
                  onChange={(e) => { setSpousePairingCode(e.target.value.replace(/\D/g, "")); setError(""); }}
                  placeholder="e.g. 482 917"
                  autoComplete="off"
                  className={`${inputCls} text-center text-xl tracking-[0.4em] font-bold`}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 border border-red-100">
                  <X className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-500">{error}</p>
                </div>
              )}

              <button
                onClick={handleSpouseConfirmCode}
                disabled={saving || spousePairingCode.length < 6}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
              >
                {saving ? "Confirming…" : "Confirm & Link"}
              </button>

              <button
                onClick={() => { setSpousePending(null); setSpousePairingCode(""); setError(""); }}
                className="w-full text-xs text-slate-400 hover:text-slate-600 py-1 transition"
              >
                Didn't receive it? Try a different email
              </button>
            </div>
          )}

          {/* ── Invite mode: form ── */}
          {isSpouse && !spouseResult && spouseMode === "invite" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-0.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={spouseFirstName}
                    onChange={(e) => { setSpouseFirstName(e.target.value); setError(""); }}
                    placeholder="e.g. Sarah"
                    autoComplete="off"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-0.5">
                    Surname
                  </label>
                  <input
                    type="text"
                    value={spouseLastName}
                    onChange={(e) => { setSpouseLastName(e.target.value); setError(""); }}
                    placeholder="e.g. Smith"
                    autoComplete="off"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-0.5">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={spouseEmail}
                  onChange={(e) => { setSpouseEmail(e.target.value); setError(""); }}
                  placeholder="partner@example.com"
                  autoComplete="off"
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
                onClick={handleSpouseInviteSubmit}
                disabled={saving || !spouseEmail.trim()}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
              >
                {saving ? "Sending…" : "Send Invitation"}
              </button>
            </div>
          )}

          {/* ═══════════════ SPOUSE: linked success ═══════════════ */}
          {isSpouse && spouseResult?.linked && !spouseResult?.kyc_pending && (
            <motion.div
              className="text-center py-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div
                className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#e9d5ff,#d8b4fe)" }}
              >
                <ShieldCheck className="h-8 w-8 text-purple-600" />
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

          {/* ═══════════════ SPOUSE: linked but KYC pending ═══════════════ */}
          {isSpouse && spouseResult?.linked && spouseResult?.kyc_pending && (
            <motion.div
              className="text-center py-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div
                className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#fef3c7,#fde68a)" }}
              >
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
              <p className="text-lg font-bold text-slate-900">Spouse Added — KYC Pending</p>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                {[spouseResult.member?.first_name, spouseResult.member?.last_name].filter(Boolean).join(" ") || "Your spouse"} has been linked, but their identity verification (KYC) is not yet complete.
              </p>
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-left">
                <p className="text-xs text-amber-700 leading-relaxed">
                  Their account will show a <strong>Pending KYC</strong> badge until they complete verification on the Mint app.
                </p>
              </div>
              <button
                onClick={() => { onSave({ ...spouseResult.member, kyc_pending: true }); }}
                className="mt-6 w-full rounded-xl py-3.5 text-sm font-bold text-white active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
              >
                Got it
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
                style={{ background: "linear-gradient(135deg,#e9d5ff,#d8b4fe)" }}
              >
                <Mail className="h-8 w-8 text-purple-600" />
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
                  {childStep >= 1 && childStep <= 2 && (
                    <button
                      onClick={handleChildBack}
                      className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition active:scale-95 mr-1"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#a78bfa,#7c3aed)" }}
                  >
                    {childStep === 0
                      ? <Baby className="h-5 w-5 text-white" />
                      : <FileText className="h-5 w-5 text-white" />}
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">
                      {childStep === 0 ? "Add Child" :
                       childStep === 1 ? "Birth Certificate" :
                       childStep === 2 ? "Proof of Address" :
                       "Responsibility Agreement"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {childStep === 0 ? "Step 1 of 4 — Child details" :
                       childStep === 1 ? "Step 2 of 4 — Upload document" :
                       childStep === 2 ? "Step 3 of 4 — Address declaration" :
                       "Step 4 of 4 — Sign agreement"}
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
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 ml-0.5">
                            SA ID Number <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={13}
                            value={childForm.id_number}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              setChildForm(f => ({ ...f, id_number: val }));
                              setError("");
                            }}
                            placeholder="13-digit ID number"
                            autoComplete="off"
                            className={inputCls}
                          />
                          {childForm.id_number.replace(/\D/g,"").length === 13 && childForm.date_of_birth && (() => {
                            const { checked, match } = verifyIdVsDob(childForm.id_number, childForm.date_of_birth);
                            if (!checked) return null;
                            return match ? (
                              <p className="text-[10px] text-emerald-600 mt-1 ml-0.5 flex items-center gap-1">
                                <Check className="h-3 w-3" /> ID number matches date of birth
                              </p>
                            ) : (
                              <p className="text-[10px] text-amber-600 mt-1 ml-0.5 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Date of birth does not match ID number
                              </p>
                            );
                          })()}
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
                              ? "border-purple-300 bg-purple-50/60"
                              : "border-slate-200 bg-slate-50 hover:border-purple-300 hover:bg-purple-50/40"
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
                              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                <Check className="h-5 w-5 text-purple-600" />
                              </div>
                              <span className="text-sm font-semibold text-purple-700 truncate max-w-[240px]">
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

                  {/* Step 2 — Proof of Address Declaration */}
                  {childStep === 2 && (
                    <motion.div
                      key="child-poa"
                      custom={slideDir}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <MinorProofOfAddressDeclaration
                        childData={newChildMember}
                        parentProfile={profile}
                        onComplete={handlePoaComplete}
                        onBack={handleChildBack}
                      />
                    </motion.div>
                  )}

                  {/* Step 3 — Computershare Responsibility Agreement */}
                  {childStep === 3 && (
                    <motion.div
                      key="child-agreement"
                      custom={slideDir}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <ChildResponsibilityAgreement
                        parentProfile={profile}
                        childData={newChildMember}
                        saving={saving}
                        onBack={handleChildBack}
                        onComplete={handleAgreementComplete}
                      />
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

function MemberRow({ gradient, name, role, roleIcon, roleColor, detail, value }) {
  return (
    <motion.div variants={item} className="rounded-2xl bg-white border border-slate-200 p-5" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
      <div className="flex items-center gap-4">
        <Avatar name={name} gradient={gradient} size="h-12 w-12" text="text-lg" />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-slate-900 leading-tight truncate">{name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase"
              style={{ background: roleColor.bg, color: roleColor.text }}
            >
              {roleIcon}
              {role}
            </span>
            {detail && <span className="text-[11px] text-slate-400 truncate">{detail}</span>}
          </div>
        </div>
        <p className="text-[15px] font-bold text-slate-900 tabular-nums flex-shrink-0">{value}</p>
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
  const [pledgeExpanded, setPledgeExpanded] = useState(false);
  const [walletBalanceCents, setWalletBalanceCents] = useState(0);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [removingId, setRemovingId] = useState(null);

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
      const [holdingsRes, walletRes] = await Promise.all([
        supabase.from("stock_holdings").select("market_value, unrealized_pnl").eq("user_id", userId),
        supabase.from("wallets").select("balance").eq("user_id", userId).maybeSingle(),
      ]);
      const holdings = holdingsRes.data || [];
      setPortfolioValue(holdings.reduce((s, h) => s + (h.market_value || 0), 0));
      setPortfolioChange(holdings.reduce((s, h) => s + (h.unrealized_pnl || 0), 0));
      const walletRands = walletRes.data?.balance || 0;
      setWalletBalanceCents(Math.round(walletRands * 100));
    } catch (e) { console.error("[family] portfolio", e); }
  }

  async function removeMember(member) {
    setRemovingId(member.id);
    try {
      const res = await fetch("/api/family-members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: member.id, primary_user_id: userId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to remove member");
      }
      setMembers(prev => prev.filter(m => m.id !== member.id));
      setConfirmRemove(null);
    } catch (e) {
      console.error("[family] remove", e.message);
    } finally {
      setRemovingId(null);
    }
  }

  function handleMemberSaved(member) {
    setMembers(prev => [...prev, member]);
    setAddingType(null);
  }

  const changePct = portfolioValue > 0
    ? ((portfolioChange / Math.max(portfolioValue - portfolioChange, 1)) * 100) : 0;
  const totalWealthCents = portfolioValue + walletBalanceCents;
  const spousalPledge = Math.round(totalWealthCents * 0.6);
  const isPositive = portfolioChange >= 0;

  const childAvatarGradients = [
    "linear-gradient(135deg,#7c3aed,#5b21b6)",
    "linear-gradient(135deg,#a855f7,#7c3aed)",
    "linear-gradient(135deg,#8b5cf6,#6366f1)",
    "linear-gradient(135deg,#a78bfa,#7c3aed)",
    "linear-gradient(135deg,#9333ea,#7c3aed)",
  ];

  return (
    <div
      className="min-h-screen pb-[env(safe-area-inset-bottom)]"
      style={{ background: "#f5f5f7" }}
    >
      {/* ── Header ── */}
      <div className="px-4 pt-12 pb-5">
        <div className="mx-auto w-full max-w-sm md:max-w-md">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 backdrop-blur-md text-slate-700 border border-slate-200 shadow-sm transition hover:bg-white active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                {familyLastName ? `${familyLastName} Family` : "My Family"}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">{totalMembers} member{totalMembers !== 1 ? "s" : ""}</p>
            </div>
            <button
              onClick={() => setAddingType(addingType ? null : (spouse ? "child" : "spouse"))}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 backdrop-blur-md text-slate-700 border border-slate-200 shadow-sm transition hover:bg-white active:scale-95"
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
            className="rounded-3xl relative overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #1e1b4b 0%, #312e81 45%, #4c1d95 100%)",
              boxShadow: "0 24px 48px -12px rgba(79,70,229,0.4)",
            }}
          >
            <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.06), transparent 70%)" }} />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-44 w-44 rounded-full" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.15), transparent 70%)" }} />

            <div className="relative px-6 pt-7 pb-6">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-white/45 uppercase mb-1">Family Portfolio</p>
              <p className="text-[2.85rem] font-bold text-white tracking-tight leading-none mb-3">{fmt(portfolioValue)}</p>

              <div className="flex items-center gap-2.5 mb-6">
                <span
                  className="inline-flex items-center gap-1.5 text-sm font-bold"
                  style={{ color: isPositive ? "#86efac" : "#fca5a5" }}
                >
                  {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {isPositive ? "+" : ""}{fmt(portfolioChange)}
                </span>
                <span className="text-xs text-white/40 font-medium">
                  {changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}% all time
                </span>
              </div>

              <div className="h-px w-full mb-4" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)" }} />

              <div className="flex items-center">
                {[...Array(Math.min(totalMembers, 5))].map((_, i) => (
                  <div
                    key={i}
                    className="h-7 w-7 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: "rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.10)", marginLeft: i > 0 ? -10 : 0 }}
                  />
                ))}
                <p className="text-xs text-white/40 ml-3 font-medium">{totalMembers} member{totalMembers !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </motion.div>

          {/* ── Spousal Pledge ── collapsible badge ── */}
          {spouse && (
            <motion.div variants={item}>
              {/* Badge row */}
              <button
                onClick={() => setPledgeExpanded(e => !e)}
                className="w-full flex items-center gap-3 rounded-2xl bg-white border border-slate-200 px-5 py-3.5 shadow-sm transition active:scale-[0.99]"
                style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
              >
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#c084fc,#a855f7)" }}
                >
                  <Heart className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="flex-1 text-[13px] font-semibold text-slate-700 text-left">Spousal Pledge</span>
                <span className="text-[13px] font-bold text-purple-700 bg-purple-50 border border-purple-100 rounded-full px-3 py-1">
                  {fmt(spousalPledge)}
                </span>
                <motion.div animate={{ rotate: pledgeExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </motion.div>
              </button>

              {/* Expanded body */}
              <AnimatePresence initial={false}>
                {pledgeExpanded && (
                  <motion.div
                    key="pledge-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-b-2xl bg-white border-x border-b border-slate-200 -mt-2 pt-5 pb-5 px-5">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {[profile?.firstName || "You", spouse.first_name].map((name) => (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" /> {name} consented
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Both spouses have consented to a combined pledge per FICA requirements.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Parents section ── */}
          <motion.div variants={item}>
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="h-2 w-2 rounded-full bg-slate-300" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Parents</p>
            </div>
            <div className="space-y-3">

              {/* Main user */}
              <MemberRow
                gradient="linear-gradient(135deg,#7c3aed,#5b21b6)"
                name={displayName}
                role="Head"
                roleIcon={<Crown className="h-2.5 w-2.5" />}
                roleColor={{ bg: "#faf5ff", text: "#7c3aed" }}
                detail="Main Account"
                value={fmt(portfolioValue)}
              />

              {/* Spouse or placeholder */}
              {spouse ? (
                <motion.div variants={item} className="rounded-2xl bg-white border border-slate-200 overflow-hidden" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                  <div className="flex items-center gap-4 p-5">
                    <Avatar name={[spouse.first_name, spouse.last_name].filter(Boolean).join(" ")} gradient="linear-gradient(135deg,#a855f7,#7c3aed)" size="h-12 w-12" text="text-lg" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-slate-900 leading-tight truncate">{[spouse.first_name, spouse.last_name].filter(Boolean).join(" ")}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase" style={{ background: "#faf5ff", color: "#9333ea" }}>
                          <Heart className="h-2.5 w-2.5" />Spouse
                        </span>
                        {(spouse.kyc_pending) && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-amber-50 text-amber-600 border border-amber-200">
                            <Clock className="h-2.5 w-2.5" />KYC Pending
                          </span>
                        )}
                        {spouse.mint_number && !spouse.kyc_pending && (
                          <span className="text-[11px] text-slate-400 truncate">{spouse.mint_number}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmRemove(confirmRemove?.id === spouse.id ? null : spouse)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition flex-shrink-0"
                      aria-label="Remove spouse"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <AnimatePresence>
                    {confirmRemove?.id === spouse.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden border-t border-red-100 bg-red-50"
                      >
                        <div className="flex items-center justify-between px-5 py-3 gap-3">
                          <p className="text-[12px] font-semibold text-red-700 flex-1">Remove {spouse.first_name} as spouse?</p>
                          <button
                            onClick={() => setConfirmRemove(null)}
                            className="text-[12px] font-semibold text-slate-500 px-3 py-1.5 rounded-lg hover:bg-white transition"
                          >Cancel</button>
                          <button
                            onClick={() => removeMember(spouse)}
                            disabled={removingId === spouse.id}
                            className="text-[12px] font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition disabled:opacity-60"
                          >{removingId === spouse.id ? "Removing…" : "Remove"}</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : !addingType && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setAddingType("spouse")}
                  className="w-full flex items-center gap-4 rounded-2xl shadow-sm border-2 border-dashed border-slate-200 p-5 text-left hover:border-purple-300 hover:bg-purple-50/50 transition-all group bg-white"
                >
                  <div className="h-14 w-14 rounded-2xl border-2 border-dashed border-slate-200 group-hover:border-purple-300 flex items-center justify-center flex-shrink-0 transition-all" style={{ aspectRatio: "1" }}>
                    <UserPlus className="h-6 w-6 text-slate-400 group-hover:text-purple-500 transition" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition">Add Spouse Account</p>
                    <p className="text-xs text-slate-500 mt-0.5">Link your partner's account</p>
                  </div>
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* ── Children section ── */}
          {children.length > 0 && (
            <motion.div variants={item}>
              <div className="flex items-center gap-2 mb-3 px-1 mt-2">
                <div className="h-2 w-2 rounded-full bg-slate-300" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Children</p>
              </div>
              <div className="space-y-3">
                {children.map((child, i) => {
                  const age = getAge(child.date_of_birth);
                  const childName = [child.first_name, child.last_name].filter(Boolean).join(" ");
                  const parentMint = profile?.mintNumber || profile?.mint_number;
                  const certStatus = child.certificate_verification_status;
                  const certVerified = certStatus === "verified";
                  const certIdMatched = certStatus === "id_matched_pending_review";
                  const certPending = !certVerified && !!child.certificate_url;
                  return (
                    <motion.div
                      key={child.id}
                      variants={item}
                      className="rounded-2xl bg-white border border-slate-200 overflow-hidden"
                      style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
                    >
                      <div className="flex items-center gap-4 p-5">
                        <button
                          className="flex items-center gap-4 flex-1 min-w-0 text-left"
                          onClick={() => onOpenChildDashboard?.(child)}
                        >
                          <Avatar name={childName} gradient={childAvatarGradients[i % childAvatarGradients.length]} size="h-12 w-12" text="text-lg" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-semibold text-slate-900 leading-tight truncate">{childName}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase" style={{ background: "#faf5ff", color: "#7c3aed" }}>
                                <Baby className="h-3 w-3" />Child
                              </span>
                              {age !== null && (
                                <span className="text-[11px] text-slate-400">{age} yr{age !== 1 ? "s" : ""}</span>
                              )}
                              {child.mint_number && (
                                 <span className="text-[11px] text-slate-400">· #{child.mint_number}</span>
                              )}
                              {certVerified && (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <ShieldCheck className="h-2.5 w-2.5" />Verified
                                </span>
                              )}
                              {certIdMatched && !certVerified && (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                                  <Clock className="h-2.5 w-2.5" />ID Matched · Under Review
                                </span>
                              )}
                              {certPending && !certIdMatched && !certVerified && (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                                  <Clock className="h-2.5 w-2.5" />Cert Pending Review
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <ShieldCheck className="h-3 w-3 text-purple-400 flex-shrink-0" />
                              <span className="text-[10px] text-slate-400 truncate">
                                Managed by {profile?.firstName || "Parent"}
                                {parentMint ? ` · #${parentMint}` : ""}
                              </span>
                            </div>
                          </div>
                          <p className="text-[15px] font-bold text-slate-900 tabular-nums flex-shrink-0">{fmt(child.available_balance || 0)}</p>
                        </button>
                        <button
                          onClick={() => setConfirmRemove(confirmRemove?.id === child.id ? null : child)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition flex-shrink-0 ml-1"
                          aria-label={`Remove ${childName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <AnimatePresence>
                        {confirmRemove?.id === child.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden border-t border-red-100 bg-red-50"
                          >
                            <div className="flex items-center justify-between px-5 py-3 gap-3">
                              <p className="text-[12px] font-semibold text-red-700 flex-1">Remove {child.first_name}'s account?</p>
                              <button
                                onClick={() => setConfirmRemove(null)}
                                className="text-[12px] font-semibold text-slate-500 px-3 py-1.5 rounded-lg hover:bg-white transition"
                              >Cancel</button>
                              <button
                                onClick={() => removeMember(child)}
                                disabled={removingId === child.id}
                                className="text-[12px] font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition disabled:opacity-60"
                              >{removingId === child.id ? "Removing…" : "Remove"}</button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}

                {/* Add another child button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setAddingType("child")}
                  className="w-full flex items-center gap-4 rounded-2xl shadow-sm border-2 border-dashed border-slate-200 p-5 text-left hover:border-purple-300 hover:bg-purple-50/50 transition-all group bg-white"
                >
                  <div className="h-14 w-14 rounded-2xl border-2 border-dashed border-slate-200 group-hover:border-purple-300 flex items-center justify-center flex-shrink-0 transition-all" style={{ aspectRatio: "1" }}>
                    <Plus className="h-6 w-6 text-slate-400 group-hover:text-purple-500 transition" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition">Add Child Account</p>
                    <p className="text-xs text-slate-500 mt-0.5">Add another child to your family</p>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Empty children state ── */}
          {children.length === 0 && !loading && !addingType && (
            <motion.div
              variants={item}
              className="rounded-2xl shadow-lg border border-slate-200 p-8 text-center bg-white"
            >
              <div className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#e9d5ff,#d8b4fe)" }}>
                <Users className="h-7 w-7 text-purple-600" />
              </div>
              <p className="text-sm font-bold text-slate-900">No children added yet</p>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">Add your children's accounts to manage the whole family from one place.</p>
              <button
                onClick={() => setAddingType("child")}
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-purple-600 hover:text-purple-700 transition"
              >
                <Plus className="h-4 w-4" /> Add a child account
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
            profile={profile}
            onSave={handleMemberSaved}
            onClose={() => setAddingType(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
