import React, { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Check, Shield, User, Users, Baby, Landmark, Zap, Shirt, ShoppingCart, Mountain, FileText, Loader2 } from "lucide-react";
import { generateFuneralCoverPDF } from "../lib/generateFuneralCoverPDF";
import { supabase } from "../lib/supabase";

// ─── Premium Tables ───────────────────────────────────────────────────────────

const SINGLE = {
  "18-65": {10000:65.57,12500:75.60,13500:79.60,15000:85.50,16500:91.54,18000:132.36,20000:133.02,25000:192.36,30000:251.66},
  "66-70": {10000:185.36,12500:214.04,13500:225.52,15000:242.75,16500:259.97,18000:272.09,20000:288.22,25000:328.58,30000:368.91},
  "71-75": {10000:274.43,12500:320.83,13500:338.84,15000:365.90,16500:393.00,18000:454.08},
  "76-80": {3000:111.31,4000:148.43,5000:185.53,6000:249.94,7000:314.39,8000:378.81,9000:443.22,10000:443.72},
  "81-85": {3000:139.16,4000:185.59,5000:231.96,6000:296.34,7000:360.82,8000:425.24,9000:489.62,10000:554.10},
  "86-90": {3000:157.74,4000:210.28,5000:262.85,6000:335.91,7000:408.90,8000:481.87,9000:554.86,10000:627.92},
};
const SINGLE_PARENT = {
  "18-65": {10000:75.60,12500:84.68,13500:92.10,15000:103.36,16500:116.52,18000:153.45,20000:187.74,25000:273.08,30000:358.45},
  "66-70": {10000:236.08,12500:284.72,13500:304.16,15000:333.33,16500:326.70,18000:362.97,20000:404.78,25000:465.10,30000:525.46},
  "71-75": {10000:290.90,12500:334.36,13500:358.81,15000:395.54,16500:432.30,18000:452.56},
  "76-80": {3000:134.51,4000:179.39,5000:224.20,6000:286.04,7000:347.92,8000:409.76,9000:471.57,10000:463.88,12500:686.17,13500:744.18},
  "81-85": {3000:166.98,4000:222.65,5000:278.29,6000:333.73,7000:389.10,8000:444.54,9000:499.95},
  "86-90": {3000:197.18,4000:262.91,5000:328.58,6000:393.99,7000:459.39},
};
const FAMILY = {
  "18-65": {10000:122.56,12500:147.64,13500:157.77,15000:172.89,16500:187.97,18000:231.96,20000:270.20,25000:345.02,30000:395.27},
  "66-70": {10000:239.65,12500:286.04,13500:317.79,15000:332.41,16500:360.26,18000:392.99,20000:436.62,25000:545.79,30000:654.95},
  "71-75": {10000:311.26,12500:342.11,13500:369.07,15000:409.60,16500:450.19,18000:468.30},
  "76-80": {3000:150.74,4000:201.04,5000:251.26,6000:309.24,7000:367.22,8000:425.24,9000:483.22,10000:524.37,12500:689.47,13500:749.06},
  "81-85": {3000:213.38,4000:284.49,5000:355.61,6000:435.86,7000:517.61,8000:481.37,9000:680.02},
};
const ACCIDENTAL = {
  "18-65": {10000:15.44,12500:18.38,13500:19.54,15000:21.25,16500:27.62,18000:29.80,20000:33.99,25000:37.65,30000:40.82},
  "66-70": {10000:30.89,12500:37.06,13500:39.53,15000:43.20,16500:53.16,18000:60.52,20000:67.68,25000:72.50,30000:82.96},
  "71-75": {10000:36.73,12500:45.64,13500:49.24,15000:54.62,16500:64.45,18000:75.64,20000:84.08},
};
const SOCIETY = {
  "1+5":  { "<65":{3000:66.43,5000:110.68,8000:177.11,10000:221.43,12500:276.74,15000:330.63}, "<70":{3000:83.46,5000:139.06,8000:222.39,10000:278.16,12500:347.56,15000:417.15}, "<75":{3000:99.63,5000:166.06,8000:265.72,10000:332.18,12500:415.14,15000:519.16} },
  "1+9":  { "<65":{3000:104.45,5000:189.09,8000:278.55,10000:349.64,12500:437.18,15000:524.63}, "<70":{3000:131.14,5000:218.59,8000:349.73,10000:437.09,12500:543.77,15000:655.68}, "<75":{3000:182.23,5000:265.91,8000:399.70,10000:524.54,12500:652.51,15000:774.61} },
  "1+13": { "<65":{3000:143.09,5000:238.43,8000:381.58,10000:476.92,12500:596.21,15000:715.28}, "<70":{3000:178.53,5000:297.56,8000:476.12,10000:596.11,12500:743.95,15000:894.20}, "<75":{3000:214.63,5000:357.72,8000:536.51,10000:715.37,12500:894.37,15000:1073.09} },
};
const ADDONS = [
  { key:"accidental", label:"Accidental Death", sub:"Double payout on accidental death", icon: Zap },
  { key:"tombstone_5k", label:"Tombstone Benefit", sub:"R5,000 benefit", icon: Mountain,
    premiums:{"18-65":{single:45.64,family:72.27},"66-70":{single:127.94,family:146.88},"71-75":{single:139.16,family:185.53}} },
  { key:"tombstone_8k", label:"Tombstone Benefit", sub:"R8,000 benefit", icon: Mountain,
    premiums:{"18-65":{single:57.59,family:102.47},"66-70":{single:162.39,family:202.52},"71-75":{single:220.31,family:239.65}} },
  { key:"grocery_5k", label:"Grocery Benefit", sub:"R5,000 benefit", icon: ShoppingCart,
    premiums:{"18-65":{single:57.59,family:102.47},"66-70":{single:162.39,family:202.52},"71-75":{single:220.31,family:239.65}} },
  { key:"grocery_8k", label:"Grocery Benefit", sub:"R8,000 benefit", icon: ShoppingCart,
    premiums:{"18-65":{single:45.64,family:72.27},"66-70":{single:127.94,family:146.88},"71-75":{single:139.16,family:185.53}} },
  { key:"meat_5k", label:"Meat Benefit", sub:"R5,000 benefit", icon: Shirt,
    premiums:{"18-65":{single:45.64,family:72.27},"66-70":{single:127.94,family:146.88},"71-75":{single:139.16,family:185.53}} },
  { key:"meat_8k", label:"Meat Benefit", sub:"R8,000 benefit", icon: Shirt,
    premiums:{"18-65":{single:57.59,family:102.47},"66-70":{single:162.39,family:202.52},"71-75":{single:220.31,family:239.65}} },
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
function getAgeBand(age) {
  if (age >= 18 && age <= 65) return "18-65";
  if (age >= 66 && age <= 70) return "66-70";
  if (age >= 71 && age <= 75) return "71-75";
  if (age >= 76 && age <= 80) return "76-80";
  if (age >= 81 && age <= 85) return "81-85";
  if (age >= 86 && age <= 90) return "86-90";
  return null;
}
function getSocietyBand(age) {
  if (age <= 65) return "<65";
  if (age <= 70) return "<70";
  if (age <= 75) return "<75";
  return null;
}
function getPremiumTable(planType) {
  if (planType === "single-parent") return SINGLE_PARENT;
  if (planType === "family") return FAMILY;
  return SINGLE;
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
const SOCIETY_SIZES = ["1+5", "1+9", "1+13"];
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
    if (planType === "stokvel") {
      if (!societyBand) return [];
      return Object.keys(SOCIETY[societySize]?.[societyBand] || {}).map(Number).sort((a,b)=>a-b);
    }
    const tbl = getPremiumTable(planType);
    if (!ageBand || !tbl[ageBand]) return [];
    return Object.keys(tbl[ageBand]).map(Number).sort((a,b)=>a-b);
  }, [planType, ageBand, societySize, societyBand]);

  const basePremium = useMemo(() => {
    if (!coverAmount) return 0;
    if (planType === "stokvel") {
      return SOCIETY[societySize]?.[societyBand]?.[coverAmount] || 0;
    }
    return getPremiumTable(planType)[ageBand]?.[coverAmount] || 0;
  }, [planType, ageBand, coverAmount, societySize, societyBand]);

  const addonDetails = useMemo(() => {
    return addons.map(key => {
      const def = ADDONS.find(a => a.key === key);
      if (!def) return { key, label:"", premium:0 };
      if (key === "accidental") {
        const p = ageBand && coverAmount ? (ACCIDENTAL[ageBand]?.[coverAmount] || 0) : 0;
        return { key, label: def.label, sub: def.sub, premium: p };
      }
      const bandPrices = def.premiums?.[ageBand];
      const p = bandPrices ? (isFamily ? bandPrices.family : bandPrices.single) : 0;
      return { key, label: def.label, sub: def.sub, premium: p };
    });
  }, [addons, ageBand, coverAmount, isFamily]);

  const totalMonthly = basePremium + addonDetails.reduce((s,a) => s + a.premium, 0);

  const availableAddons = useMemo(() => {
    const isAdditionalBand = ["18-65","66-70","71-75"].includes(ageBand);
    return ADDONS.map(a => {
      if (a.key === "accidental") {
        const available = ["18-65","66-70","71-75"].includes(ageBand) && !!coverAmount && !!ACCIDENTAL[ageBand]?.[coverAmount];
        const premium = available ? ACCIDENTAL[ageBand][coverAmount] : 0;
        return { ...a, premium, available };
      }
      const available = isAdditionalBand && !!coverAmount && !!a.premiums?.[ageBand];
      const bandPrices = a.premiums?.[ageBand];
      const premium = available ? (isFamily ? bandPrices.family : bandPrices.single) : 0;
      return { ...a, premium, available };
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
      <div className="bg-white border-b border-slate-100 px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div className="text-center">
            <div className="flex items-center gap-1.5 justify-center">
              <Shield className="h-4 w-4 text-violet-600" />
              <span className="text-base font-bold text-slate-900">Funeral Cover</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-px">{stepTitles[step-1]}</p>
          </div>
          <div className="w-9" />
        </div>

        {/* Progress bar */}
        <div className="flex gap-1">
          {Array.from({length: TOTAL_STEPS}).map((_,i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < step ? "bg-violet-600" : "bg-slate-200"}`} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">

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
      <div className="flex-shrink-0 px-4 py-4 bg-white border-t border-slate-100">
        <button
          onClick={step === TOTAL_STEPS ? handleGeneratePDF : handleContinue}
          disabled={!canProceed() || generating}
          className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: (canProceed() && !generating) ? "linear-gradient(135deg,#7c3aed,#6d28d9)" : "#cbd5e1" }}
        >
          {step === TOTAL_STEPS ? (
            generating ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Generating document…</>
            ) : (
              <><FileText className="h-4 w-4" />Generate Policy Document</>
            )
          ) : "Continue"}
        </button>
      </div>
    </div>
  );
}
