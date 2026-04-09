import React, { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Check, Shield, User, Users, Baby, Landmark, Zap, Shirt, ShoppingCart, Mountain, FileText, Loader2 } from "lucide-react";
import { generateFuneralCoverPDF } from "../lib/generateFuneralCoverPDF";
import { supabase } from "../lib/supabase";

// ─── Rates (single source of truth) ──────────────────────────────────────────
import {
  SOCIETY_SIZES,
  getAgeBand, getSocietyBand,
  lookupPremium, lookupSocietyPremium,
  lookupAccidentalPremium, lookupAddonPremium,
  getCoverOptions, getSocietyCoverOptions,
} from "../lib/funeralCoverRates";

// ─── UI-only add-on definitions (icons + metadata; premiums resolved at runtime) ──
const ADDONS = [
  { key: "accidental",   label: "Accidental Death", sub: "Double payout on accidental death",
    icon: Zap, type: "accidental" },
  { key: "tombstone_5k", label: "Tombstone Benefit", sub: "R5,000 in-kind benefit",
    icon: Mountain, type: "tombstone", benefit: 5000 },
  { key: "grocery_5k",   label: "Grocery Benefit",   sub: "R5,000 in-kind benefit",
    icon: ShoppingCart, type: "grocery", benefit: 5000 },
  { key: "grocery_8k",   label: "Grocery Benefit",   sub: "R8,000 in-kind benefit",
    icon: ShoppingCart, type: "grocery", benefit: 8000 },
  { key: "meat_5k",      label: "Meat Benefit",       sub: "R5,000 in-kind benefit",
    icon: Shirt, type: "meat", benefit: 5000 },
  { key: "meat_8k",      label: "Meat Benefit",       sub: "R8,000 in-kind benefit",
    icon: Shirt, type: "meat", benefit: 8000 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDobLocal(dob) {
  if (!dob) return null;
  const parts = dob.split("-").map(Number);
  if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]);
  return new Date(dob);
}
function calcAge(dob) {
  if (!dob) return null;
  const b = parseDobLocal(dob), t = new Date();
  if (!b || isNaN(b)) return null;
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() - b.getMonth() < 0 || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return a;
}
function fmtR(n) {
  return `R${Number(n).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtCover(n) {
  return `R${Number(n).toLocaleString("en-ZA")}`;
}

const PLAN_TYPES = [
  { key:"individual",    label:"Individual",       sub:"Cover for yourself only",           icon: User },
  { key:"single-parent", label:"Single Parent",    sub:"You + children under 21",           icon: Baby },
  { key:"family",        label:"Family",            sub:"You + spouse + all children",       icon: Users },
  { key:"stokvel",       label:"Stokvel / Society", sub:"Group cover (1+5, 1+9, 1+13)",     icon: Landmark },
];
const DEDUCTION_DATES = ["1st", "5th", "10th", "15th", "20th", "25th"];
const TOTAL_STEPS = 6;

function calcMemberAge(dobStr) {
  if (!dobStr) return null;
  const parts = dobStr.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  const now = new Date();
  let a = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) a--;
  return a;
}
let _depId = 0;

// ─── Component ────────────────────────────────────────────────────────────────

export default function FuneralCoverPage({ onBack, profile }) {
  const [step, setStep] = useState(1);

  // Step 1
  const [planType, setPlanType] = useState("individual");

  // Step 2
  const [firstName, setFirstName] = useState(profile?.firstName || "");
  const [lastName, setLastName]   = useState(profile?.lastName  || "");
  const profileDob = profile?.dateOfBirth || "";
  const [dob, setDob]             = useState(profileDob);
  const [manualAge, setManualAge] = useState(35);
  const [useManualAge, setUseManualAge] = useState(!profileDob);

  // Step 4 — Select Cover
  const [societySize, setSocietySize] = useState("1+5");
  const [coverAmount, setCoverAmount] = useState(null);

  // Step 3 — Beneficiary / Dependent details
  const [dependents, setDependents] = useState([]);

  // Step 4 (was 3)
  const [addons, setAddons] = useState([]);

  // Step 6 (was 5)
  const [deductionDate, setDeductionDate] = useState("1st");
  const [generating, setGenerating] = useState(false);

  function addDependent(type) {
    setDependents(prev => [...prev, { id: ++_depId, type, firstName: "", lastName: "", dob: "" }]);
  }
  function removeDependent(id) {
    setDependents(prev => prev.filter(d => d.id !== id));
  }
  function updateDependent(id, field, val) {
    setDependents(prev => prev.map(d => d.id === id ? { ...d, [field]: val } : d));
  }
  const hasSpouse = dependents.some(d => d.type === "spouse");
  const [familyImportCount, setFamilyImportCount] = useState(0);

  // Auto-import family members from the family account on mount
  useEffect(() => {
    let cancelled = false;
    async function loadFamily() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data, error } = await supabase
          .from("family_members")
          .select("first_name, last_name, date_of_birth, relationship")
          .eq("user_id", session.user.id);
        if (error || !data || cancelled) return;
        const imported = data
          .filter(m => m.relationship === "spouse" || m.relationship === "child")
          .map(m => ({
            id: ++_depId,
            type: m.relationship === "spouse" ? "spouse" : "child",
            firstName: m.first_name || "",
            lastName:  m.last_name  || "",
            dob:       m.date_of_birth || "",
          }));
        if (imported.length > 0) {
          setDependents(imported);
          setFamilyImportCount(imported.length);
        }
      } catch { /* ignore */ }
    }
    loadFamily();
    return () => { cancelled = true; };
  }, []);

  // Derived
  const age = useManualAge ? manualAge : (calcAge(dob) ?? manualAge);
  const ageBand = getAgeBand(age);
  const societyBand = getSocietyBand(age);
  const isFamily = planType === "family";

  const coverOptions = useMemo(() => {
    if (planType === "stokvel") return getSocietyCoverOptions(societySize, societyBand);
    return getCoverOptions(planType, ageBand);
  }, [planType, ageBand, societySize, societyBand]);

  const basePremium = useMemo(() => {
    if (!coverAmount) return 0;
    if (planType === "stokvel") return lookupSocietyPremium(societySize, societyBand, coverAmount);
    return lookupPremium(planType, ageBand, coverAmount);
  }, [planType, ageBand, coverAmount, societySize, societyBand]);

  const addonDetails = useMemo(() => {
    return addons.map(key => {
      const def = ADDONS.find(a => a.key === key);
      if (!def) return { key, label: "", premium: 0 };
      if (def.type === "accidental") {
        const premium = ageBand && coverAmount ? lookupAccidentalPremium(ageBand, coverAmount) : 0;
        return { key, label: def.label, sub: def.sub, premium };
      }
      const premium = ageBand ? lookupAddonPremium(def.type, def.benefit, ageBand, isFamily) : 0;
      return { key, label: def.label, sub: def.sub, benefit: def.benefit, premium };
    });
  }, [addons, ageBand, coverAmount, isFamily]);

  const totalMonthly = basePremium + addonDetails.reduce((s, a) => s + a.premium, 0);

  const availableAddons = useMemo(() => {
    const inKindBands = ["18-65", "66-70", "71-75"];
    return ADDONS.map(a => {
      if (a.type === "accidental") {
        const premium = ageBand && coverAmount ? lookupAccidentalPremium(ageBand, coverAmount) : 0;
        return { ...a, premium, available: premium > 0 };
      }
      const premium = ageBand && inKindBands.includes(ageBand)
        ? lookupAddonPremium(a.type, a.benefit, ageBand, isFamily)
        : 0;
      return { ...a, premium, available: premium > 0 };
    }).filter(a => a.available);
  }, [ageBand, coverAmount, isFamily]);

  function toggleAddon(key) {
    setAddons(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key]);
  }

  async function handleGeneratePDF() {
    setGenerating(true);
    try {
      const planLabel = PLAN_TYPES.find(p => p.key === planType)?.label || planType;

      const result = await generateFuneralCoverPDF({
        firstName,
        lastName,
        age,
        ageBand,
        planType,
        planLabel,
        coverAmount,
        basePremium,
        addonDetails,
        totalMonthly,
        deductionDate,
        societySize: planType === "stokvel" ? societySize : null,
        dependents,
      });

      // Send confirmation email to client
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess?.session?.access_token;
        if (token && result?.policyNo) {
          await fetch("/api/insurance/send-policy-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              policyNo:     result.policyNo,
              dateStr:      result.dateStr,
              planLabel,
              coverAmount,
              basePremium,
              addonDetails,
              totalMonthly,
              deductionDate,
              firstName,
              lastName,
            }),
          });
        }
      } catch (emailErr) {
        console.warn("[funeral-cover] Could not send policy email:", emailErr?.message);
      }
    } finally {
      setGenerating(false);
    }
  }

  function handleContinue() {
    if (step === 4) setAddons([]);
    // Skip Beneficiary Details step for individual plan
    if (step === 2 && planType === "individual") { setStep(4); return; }
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  }
  function handleBack() {
    if (step === 1) { onBack?.(); return; }
    // Skip Beneficiary Details step for individual plan (going back from step 4)
    if (step === 4 && planType === "individual") { setStep(2); return; }
    setStep(s => s - 1);
  }

  const stepTitles = ["Choose Plan","Your Details","Beneficiary Details","Select Cover","Add Benefits","Review & Confirm"];

  const canProceed = () => {
    if (step === 1) return true;
    if (step === 2) return firstName.trim() && lastName.trim() && (dob || useManualAge) && ageBand;
    if (step === 3) return true;
    if (step === 4) return !!coverAmount;
    if (step === 5) return true;
    if (step === 6) return !!deductionDate;
    return true;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pt-12 pb-5 flex-shrink-0">
        <div className="mx-auto w-full max-w-sm md:max-w-md">
          <div className="flex items-center justify-between mb-4">
            <button onClick={handleBack} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-95">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <div className="flex items-center gap-1.5 justify-center">
                <Shield className="h-4 w-4 text-violet-300" />
                <span className="text-base font-bold text-white">Funeral Cover</span>
              </div>
              <p className="text-[11px] text-white/50 mt-px">{stepTitles[step-1]}</p>
            </div>
            <div className="w-10" />
          </div>

          {/* Progress bar */}
          <div className="flex gap-1.5">
            {Array.from({length: TOTAL_STEPS}).map((_,i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < step ? "bg-violet-300" : "bg-white/20"}`} />
            ))}
          </div>
          <p className="mt-2 text-right text-[10px] text-white/40">Step {step} of {TOTAL_STEPS}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4 mx-auto w-full max-w-sm md:max-w-md">

        {/* ── Step 1: Choose Plan ── */}
        {step === 1 && (
          <>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Who are we covering?</p>
            <div className="flex flex-col gap-3">
              {PLAN_TYPES.map(pt => {
                const Icon = pt.icon;
                const selected = planType === pt.key;
                return (
                  <button
                    key={pt.key}
                    onClick={() => setPlanType(pt.key)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                      selected
                        ? "border-violet-500 bg-violet-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${selected ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${selected ? "text-violet-700" : "text-slate-900"}`}>{pt.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{pt.sub}</p>
                    </div>
                    {selected && <Check className="h-5 w-5 text-violet-600 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── Step 2: Your Details ── */}
        {step === 2 && (
          <>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Main Member</p>
            <div className="flex gap-3">
              <input
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                placeholder="First name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
              />
              <input
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                placeholder="Surname"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
              />
            </div>

            {profileDob ? (
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-0.5">Date of Birth</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {parseDobLocal(profileDob)?.toLocaleDateString("en-ZA", { day:"2-digit", month:"long", year:"numeric" }) || profileDob}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Age</p>
                  <p className="text-xl font-bold text-violet-600">{calcAge(profileDob)}</p>
                </div>
              </div>
            ) : (
              <>
                {!useManualAge && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Date of Birth</label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      value={dob}
                      onChange={e => setDob(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <button
                    onClick={() => setUseManualAge(p => !p)}
                    className="text-xs text-violet-600 font-medium underline"
                  >
                    {useManualAge ? "Enter date of birth instead" : "Or set age manually"}
                  </button>
                </div>

                {useManualAge && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-500">Age</label>
                      <span className="text-2xl font-bold text-slate-900">{manualAge}</span>
                    </div>
                    <input
                      type="range"
                      min={18} max={90}
                      value={manualAge}
                      onChange={e => setManualAge(Number(e.target.value))}
                      className="w-full accent-violet-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>18</span><span>90</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {!profileDob && age && ageBand && (
              <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3 flex items-center gap-2">
                <Check className="h-4 w-4 text-violet-600 flex-shrink-0" />
                <p className="text-xs text-violet-700 font-medium">Age {age} — {ageBand} age band confirmed</p>
              </div>
            )}
            {age && !ageBand && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                <p className="text-xs text-red-600 font-medium">Cover is available for ages 18–90. Please check the age entered.</p>
              </div>
            )}
          </>
        )}

        {/* ── Step 3: Beneficiary Details ── */}
        {step === 3 && (
          <>
            {familyImportCount > 0 && (
              <div className="flex items-start gap-2.5 bg-violet-900/40 border border-violet-600/50 rounded-2xl px-4 py-3">
                <Check className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-violet-200">
                  <span className="font-bold">{familyImportCount} family member{familyImportCount > 1 ? "s" : ""}</span> imported from your family account.
                  You can edit or remove them below.
                </p>
              </div>
            )}

            <p className="text-sm text-slate-400">
              {planType === "stokvel"
                ? "Enter details for each society member. Ages affect premium calculations."
                : "Enter details for each person on this policy."}
            </p>

            <div className="flex flex-col gap-4">
              {dependents.map((dep, idx) => {
                const memberAge = calcMemberAge(dep.dob);
                const label = dep.type === "spouse"
                  ? "Spouse"
                  : dep.type === "member"
                  ? `Member ${idx + 1}`
                  : `Child ${dependents.filter(d => d.type === "child").indexOf(dep) + 1}`;
                const ageWarning = planType === "stokvel" && memberAge !== null && memberAge > 65;

                return (
                  <div key={dep.id} className="bg-[#1e0a35] rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{label}</span>
                      <div className="flex items-center gap-2">
                        {memberAge !== null && (
                          <span className="text-xs font-bold bg-violet-700 text-white px-2 py-0.5 rounded-full">
                            {memberAge} yrs
                          </span>
                        )}
                        <button
                          onClick={() => removeDependent(dep.id)}
                          className="text-xs text-red-400 hover:text-red-300 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        className="flex-1 rounded-xl bg-[#0e0520] border border-violet-800 px-3 py-2.5 text-sm text-white placeholder-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        placeholder="First name"
                        value={dep.firstName}
                        onChange={e => updateDependent(dep.id, "firstName", e.target.value)}
                      />
                      <input
                        className="flex-1 rounded-xl bg-[#0e0520] border border-violet-800 px-3 py-2.5 text-sm text-white placeholder-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        placeholder="Surname"
                        value={dep.lastName}
                        onChange={e => updateDependent(dep.id, "lastName", e.target.value)}
                      />
                    </div>

                    <div>
                      <p className="text-xs text-violet-300 mb-1">Date of Birth</p>
                      <input
                        type="date"
                        className="w-full rounded-xl bg-[#0e0520] border border-violet-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        value={dep.dob}
                        onChange={e => updateDependent(dep.id, "dob", e.target.value)}
                      />
                    </div>

                    {ageWarning && (
                      <div className="flex items-start gap-2 bg-amber-900/40 border border-amber-700/50 rounded-xl px-3 py-2">
                        <span className="text-amber-400 text-sm mt-px">⚠</span>
                        <p className="text-xs text-amber-300">This member's age may affect the group's premium band</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add buttons */}
            <div className="flex gap-3 flex-wrap">
              {(planType === "family" || planType === "single-parent") && (
                <button
                  onClick={() => addDependent("child")}
                  className="flex-1 py-3 rounded-2xl border-2 border-dashed border-violet-400 text-violet-300 text-sm font-bold hover:border-violet-300 hover:text-violet-200 transition-all flex items-center justify-center gap-1.5"
                >
                  + Add Child
                </button>
              )}
              {planType === "family" && !hasSpouse && (
                <button
                  onClick={() => addDependent("spouse")}
                  className="flex-1 py-3 rounded-2xl border-2 border-dashed border-violet-400 text-violet-300 text-sm font-bold hover:border-violet-300 hover:text-violet-200 transition-all flex items-center justify-center gap-1.5"
                >
                  + Add Spouse
                </button>
              )}
              {planType === "stokvel" && (
                <button
                  onClick={() => addDependent("member")}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-violet-400 text-violet-300 text-sm font-bold hover:border-violet-300 hover:text-violet-200 transition-all flex items-center justify-center gap-1.5"
                >
                  + Add Member
                </button>
              )}
            </div>

            {dependents.length === 0 && (
              <div className="rounded-xl bg-violet-950/50 border border-violet-800/40 px-4 py-4 text-center">
                <p className="text-sm text-violet-300">
                  {planType === "stokvel"
                    ? "Add society members to your policy."
                    : "Add your spouse and/or children to your policy."}
                </p>
                <p className="text-xs text-violet-400 mt-1">You can continue without adding members.</p>
              </div>
            )}

            {/* Estimated premium */}
            {basePremium > 0 && (
              <div className="rounded-2xl bg-[#1e0a35] border border-violet-700/40 px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-violet-300">Estimated Premium</span>
                <span className="text-lg font-bold text-emerald-400">{fmtR(totalMonthly)}/mo</span>
              </div>
            )}
          </>
        )}

        {/* ── Step 4: Select Cover ── */}
        {step === 4 && (
          <>
            {planType === "stokvel" && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Group Size</p>
                <div className="flex gap-2">
                  {SOCIETY_SIZES.map(s => (
                    <button
                      key={s}
                      onClick={() => { setSocietySize(s); setCoverAmount(null); }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                        societySize === s ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select your cover amount</p>

            {coverOptions.length === 0 ? (
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                <p className="text-sm text-amber-700 font-medium">No cover options available for this age band and plan type.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {coverOptions.map(amt => {
                  const selected = coverAmount === amt;
                  return (
                    <button
                      key={amt}
                      onClick={() => setCoverAmount(amt)}
                      className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                        selected
                          ? "border-violet-500 bg-violet-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {fmtCover(amt)}
                    </button>
                  );
                })}
              </div>
            )}

            {coverAmount && basePremium > 0 && (
              <div className="rounded-2xl bg-white border border-slate-100 shadow-md p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Monthly Premium</p>
                <p className="text-2xl font-bold text-violet-600">{fmtR(basePremium)}</p>
                <p className="text-xs text-slate-400 mt-1">Cover: {fmtCover(coverAmount)} · 6 month waiting period</p>
              </div>
            )}
          </>
        )}

        {/* ── Step 5: Add Benefits ── */}
        {step === 5 && (
          <>
            <p className="text-sm text-slate-500">Enhance your cover with optional benefits</p>

            {availableAddons.length === 0 ? (
              <div className="rounded-xl bg-slate-100 px-4 py-6 text-center">
                <p className="text-sm text-slate-500">No additional benefits are available for your age band.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {availableAddons.map(addon => {
                  const Icon = addon.icon;
                  const selected = addons.includes(addon.key);
                  return (
                    <button
                      key={addon.key}
                      onClick={() => toggleAddon(addon.key)}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                        selected
                          ? "border-violet-500 bg-violet-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className={`p-2 rounded-xl flex-shrink-0 ${selected ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${selected ? "text-violet-700" : "text-slate-900"}`}>{addon.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{addon.sub}</p>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${selected ? "text-violet-600" : "text-emerald-600"}`}>
                        +{fmtR(addon.premium)}/mo
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Running total */}
            <div className="rounded-2xl bg-white border border-slate-100 shadow-md p-4 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Total Monthly</p>
              <p className="text-xl font-bold text-slate-900">{fmtR(totalMonthly)}</p>
            </div>
          </>
        )}

        {/* ── Step 6: Review & Confirm ── */}
        {step === 6 && (
          <>
            {/* Policy Summary */}
            <div className="rounded-2xl bg-white border border-slate-100 shadow-md p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Policy Summary</p>
              <div className="flex flex-col gap-3">
                {[
                  { label:"Policyholder", value:`${firstName} ${lastName}`.trim() },
                  { label:"Plan Type", value: PLAN_TYPES.find(p=>p.key===planType)?.label || planType },
                  { label:"Cover Amount", value: fmtCover(coverAmount) },
                  { label:"Age", value: `${age} years` },
                  { label:"Waiting Period", value: "6 months" },
                  ...(dependents.length > 0 ? [{ label: "Covered Members", value: `${dependents.length} person${dependents.length>1?"s":""}` }] : []),
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">{row.label}</span>
                    <span className="text-sm font-semibold text-slate-900">{row.value}</span>
                  </div>
                ))}

                <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Base Premium</span>
                    <span className="text-sm font-medium text-slate-900">{fmtR(basePremium)}</span>
                  </div>
                  {addonDetails.map(a => (
                    <div key={a.key} className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">{a.label}{a.sub ? ` (${a.sub.replace(" benefit","")})` : ""}</span>
                      <span className="text-sm font-medium text-emerald-600">+{fmtR(a.premium)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">Total Monthly</span>
                  <span className="text-lg font-bold text-violet-600">{fmtR(totalMonthly)}</span>
                </div>
              </div>
            </div>

            {/* Deduction Date */}
            <div className="rounded-2xl bg-white border border-slate-100 shadow-md p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Deduction Date</p>
              <p className="text-xs text-slate-500 mb-4">Choose which day of the month your premium will be deducted</p>
              <div className="flex flex-wrap gap-2">
                {DEDUCTION_DATES.map(d => (
                  <button
                    key={d}
                    onClick={() => setDeductionDate(d)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                      deductionDate === d
                        ? "border-violet-500 bg-violet-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
              <p className="text-xs text-amber-700">
                <strong>Important:</strong> A 6-month waiting period applies. Benefits and product offerings may change from time to time. Terms and conditions apply. Mint FSP Number: 55118.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Footer button */}
      <div className="flex-shrink-0 px-4 py-4 bg-white border-t border-slate-100 safe-area-inset-bottom">
        <div className="mx-auto w-full max-w-sm md:max-w-md">
          <button
            onClick={step === TOTAL_STEPS ? handleGeneratePDF : handleContinue}
            disabled={!canProceed() || generating}
            className={`w-full py-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              canProceed() && !generating
                ? "bg-gradient-to-r from-violet-700 to-purple-600 shadow-lg shadow-violet-900/30"
                : "bg-slate-300"
            }`}
          >
            {step === TOTAL_STEPS ? (
              generating ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Generating document…</>
              ) : (
                <><FileText className="h-4 w-4" />Generate Policy Document</>
              )
            ) : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}
