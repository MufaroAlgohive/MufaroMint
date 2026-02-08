import React, { useRef, useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck, Landmark, CheckCircle2, UserPen, Zap, TrendingUp, Search, ChevronDown, ChevronUp, Briefcase, Info } from "lucide-react";
import { MintGradientLayout } from "../components/credit/ui/MintGradientLayout";
import { MintCard } from "../components/credit/ui/MintCard";
import { MintRadarChart } from "../components/credit/ui/MintRadarChart";
import { useProfile } from "../lib/useProfile";
import { supabase } from "../lib/supabase";
import { useCreditCheck } from "../lib/useCreditCheck";

// --- Subcomponents for Stages ---

// Stage 1: TruID Connect
const ConnectionStage = ({ onComplete, onError }) => {
  const [status, setStatus] = useState("idle"); // idle, connecting, polling, capturing, success, error
  const [message, setMessage] = useState("");
  const [debugLog, setDebugLog] = useState([]);
  const collectionIdRef = useRef(null);
  const pollingRef = useRef(null);
   const lastStatusRef = useRef(null);
   const popupRef = useRef(null);

  const addLog = (msg) => setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

  const startSession = async () => {
    setStatus("connecting");
    setMessage("Initializing secure connection...");
    addLog("Starting session...");
    
    try {
       const { data: { session } } = await supabase.auth.getSession();
       if (!session) throw new Error("Authentication required");

       const response = await fetch("/api/banking/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({})
       });
       
       const data = await response.json();
       addLog(`Initiate response: ${JSON.stringify(data)}`);
       if (!data.success) throw new Error(data.error || "Connection failed");

       collectionIdRef.current = data.collectionId;
       
       // Open popup
       const width = 500;
       const height = 700;
       const left = (window.screen.width - width) / 2;
       const top = (window.screen.height - height) / 2;
       
       const popup = window.open(
          data.consumerUrl,
          "TruID Banking",
          `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
       );

       if (!popup) throw new Error("Popup blocked. Please allow popups for banking connection.");
       popupRef.current = popup;
       
       setMessage("Complete the process in the popup window...");
       setStatus("polling");
       addLog(`Polling started for collectionId: ${data.collectionId}`);
       startPolling(data.collectionId);

    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage(err.message);
      addLog(`Error starting: ${err.message}`);
      onError(err.message);
    }
  };

  const startPolling = (collectionId) => {
     if (pollingRef.current) clearInterval(pollingRef.current);
     
     pollingRef.current = setInterval(async () => {
        try {
           const res = await fetch(`/api/banking/status?collectionId=${collectionId}`);
           const data = await res.json();
           const rawStatus = data.currentStatus;
           const s = String(rawStatus || "").toUpperCase();
           const numericStatus = Number(rawStatus);
           const hasNumericStatus = Number.isFinite(numericStatus);
           const isComplete = s.includes("SUCCESS") || s.includes("COMPLETED") || (hasNumericStatus && numericStatus >= 2000 && numericStatus < 3000);
           const isFailed = s.includes("FAILED") || s.includes("CANCELLED") || s.includes("ERROR");

           const statusSignature = JSON.stringify({ status: rawStatus });
           if (statusSignature !== lastStatusRef.current) {
             addLog(`Poll Status: ${hasNumericStatus ? numericStatus : s || rawStatus}`);
             addLog(`Status Payload: ${JSON.stringify(data)}`);
             lastStatusRef.current = statusSignature;
           }

           if (isComplete) {
              clearInterval(pollingRef.current);
              setStatus("capturing");
              setMessage("Analyzing banking data...");
              addLog("Status Success. Starting Capture...");

              
              // Capture Data
              try {
                  const { data: { session } } = await supabase.auth.getSession();
                  const captureRes = await fetch(`/api/banking/capture`, {
                      method: "POST",
                      headers: { 
                          "Content-Type": "application/json",
                          "Authorization": session ? `Bearer ${session.access_token}` : ""
                      },
                      body: JSON.stringify({ collectionId })
                  });
                  
                  const captureText = await captureRes.text();
                  addLog(`Capture Raw Response: ${captureText.substring(0, 200)}...`);
                  
                  let captureData;
                  try {
                      captureData = JSON.parse(captureText);
                  } catch(e) {
                      addLog("Failed to parse capture response JSON");
                      throw new Error("Invalid JSON from capture endpoint");
                  }
                  
                  if (!captureRes.ok || !captureData.success) {
                      addLog(`Capture Failed: ${captureData.error || captureRes.statusText}`);
                      throw new Error(captureData.error || "Capture failed");
                  }

                           if (popupRef.current && !popupRef.current.closed) {
                              popupRef.current.close();
                              popupRef.current = null;
                           }

                           setStatus("success");
                  setMessage("Banking data verified successfully.");
                  addLog("Capture Success! Saved Snapshot:");
                  addLog(JSON.stringify(captureData.snapshot, null, 2));
                  
                  // Brief delay to show success
                  setTimeout(() => {
                      onComplete(collectionId, captureData.success ? captureData.snapshot : null);
                  }, 3000); // Increased delay so user can see debug logs

              } catch (err) {
                  console.error("Capture error", err);
                  setStatus("error");
                  setMessage("Failed to retrieve banking data.");
                  addLog(`Capture Error Exception: ${err.message}`);
              }

           } else if (isFailed) {
              clearInterval(pollingRef.current);
              setStatus("error");
              setMessage("Bank connection was cancelled or failed.");
              addLog(`Polling Failed Status: ${s || rawStatus}`);
           }
        } catch (e) {
           console.error("Polling error", e);
           addLog(`Polling Exception: ${e.message}`);
        }
     }, 3000);
  };
  
  // Cleanup
  useEffect(() => {
     return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  return (
    <MintCard title="Bank Verification" subtitle="Securely link your primary account to verify income." className="animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col items-center gap-6 py-4">
        <div className={`h-20 w-20 rounded-full flex items-center justify-center transition-all duration-500 ${status === 'polling' || status === 'capturing' ? 'bg-amber-100 text-amber-600 animate-pulse' : status === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
           <Landmark size={32} />
        </div>
        
        <div className="text-center max-w-xs">
           <p className="text-sm font-medium text-slate-600 mb-1">{message || "We use TruID to verify your affordability in real-time."}</p>
           {status === 'error' && <p className="text-xs text-red-500 font-bold mt-2">{message}</p>}
        </div>

        {status !== 'polling' && status !== 'capturing' && status !== 'success' && (
           <button 
             onClick={startSession}
             className="w-full py-4 rounded-full bg-white/80 text-slate-800 border border-white/70 font-semibold text-sm shadow-sm shadow-black/5 hover:bg-white hover:text-slate-900 active:scale-95 transition-all flex items-center justify-center gap-2"
           >
              <ShieldCheck size={18} /> Connect Bank
           </button>
        )}
        
        {status === 'polling' && (
           <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-600">
             <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping"></span>
             Waiting for bank...
           </div>
        )}

        {status === 'capturing' && (
           <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-600">
             <span className="w-2 h-2 rounded-full bg-amber-600 animate-spin"></span>
             Analyzing...
           </div>
        )}
         
         {status === 'success' && (
           <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600">
             <CheckCircle2 size={16} /> Verified
           </div>
        )}

      </div>
    </MintCard>
  );
};


// Stage 2: Enrichment (Review Details)
const EnrichmentStage = ({ onSubmit, defaultValues, employerOptions, employerLocked, contractLocked, sectorLocked, yearsLocked }) => {
  const [formData, setFormData] = useState({
      employerName: defaultValues?.employerName || "",
      employmentSector: defaultValues?.employmentSector || "",
      contractType: defaultValues?.contractType || "",
         yearsCurrentEmployer: defaultValues?.yearsCurrentEmployer || "",
      ...defaultValues
  });

   const formatContractLabel = (value) => {
      switch (value) {
         case "PERMANENT":
            return "Permanent";
         case "FIXED_TERM_12_PLUS":
            return "Fixed Term (>12m)";
         case "FIXED_TERM_LT_12":
            return "Fixed Term (<12m)";
         case "SELF_EMPLOYED_12_PLUS":
            return "Self Employed";
         default:
            return value ? value.replace(/_/g, " ") : "--";
      }
   };

  useEffect(() => {
    // Keep internal state in sync if defaultValues updates from parent
    setFormData(prev => ({
      ...prev,
      ...defaultValues
    }));
  }, [defaultValues]);

  const handleChange = (f, v) => setFormData(prev => ({...prev, [f]: v}));
   const canContinue = Boolean(
      formData.employerName && formData.employmentSector && formData.contractType && formData.yearsCurrentEmployer
   );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <MintCard title="Employment Details" className="relative overflow-hidden">
         <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <p className="text-slate-500 text-xs">Please confirm these details are correct.</p>
            
            <div className="space-y-3">
               <label className="block">
                 <span className="text-xs font-bold text-slate-400 uppercase">Employer Name</span>
                 {employerLocked ? (
                   <div className="mt-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                     {formData.employerName || "Unknown Employer"}
                   </div>
                 ) : (
                   <>
                     <input 
                       list="employer-list"
                       className="w-full mt-1 border-b border-slate-200 bg-transparent py-2 text-sm font-semibold focus:border-slate-900 focus:outline-none transition-colors"
                       value={formData.employerName}
                       onChange={(e) => handleChange("employerName", e.target.value)}
                       placeholder="e.g. Acme Corp" 
                     />
                     {employerOptions?.length > 0 && (
                       <datalist id="employer-list">
                         {employerOptions.map((name) => (
                            <option key={name} value={name} />
                         ))}
                       </datalist>
                     )}
                   </>
                 )}
               </label>
               
               <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                     <span className="text-xs font-bold text-slate-400 uppercase">Sector</span>
                     {sectorLocked ? (
                        <div className="mt-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                           {formData.employmentSector === "listed"
                              ? "Listed Company"
                              : formData.employmentSector === "government"
                                ? "Government"
                                : formData.employmentSector === "private"
                                  ? "Private"
                                  : formData.employmentSector === "other"
                                    ? "Other"
                                    : "--"}
                        </div>
                     ) : (
                        <select 
                           value={formData.employmentSector}
                           onChange={(e) => handleChange('employmentSector', e.target.value)}
                           className="w-full mt-1 border-b border-slate-200 bg-transparent py-2 text-sm font-semibold focus:border-slate-900 focus:outline-none"
                        >
                            <option value="">Select...</option>
                            <option value="government">Government</option>
                            <option value="private">Private</option>
                            <option value="listed">Listed Company</option>
                            <option value="other">Other</option>
                        </select>
                     )}
                  </label>
                  <label className="block">
                     <span className="text-xs font-bold text-slate-400 uppercase">Contract</span>
                     {contractLocked ? (
                        <div className="mt-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                           {formatContractLabel(formData.contractType)}
                        </div>
                     ) : (
                        <select 
                           value={formData.contractType}
                           onChange={(e) => handleChange('contractType', e.target.value)}
                           className="w-full mt-1 border-b border-slate-200 bg-transparent py-2 text-sm font-semibold focus:border-slate-900 focus:outline-none"
                        >
                            <option value="">Select...</option>
                            <option value="PERMANENT">Permanent</option>
                            <option value="FIXED_TERM_12_PLUS">Fixed Term ({'>'}12m)</option>
                            <option value="FIXED_TERM_LT_12">Fixed Term ({'<'}12m)</option>
                            <option value="SELF_EMPLOYED_12_PLUS">Self Employed</option>
                        </select>
                     )}
                  </label>
               </div>

               <label className="block">
                  <span className="text-xs font-bold text-slate-400 uppercase">Years at current employer</span>
                  {yearsLocked ? (
                     <div className="mt-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                        {formData.yearsCurrentEmployer || "--"}
                     </div>
                  ) : (
                     <select
                        value={formData.yearsCurrentEmployer}
                        onChange={(e) => handleChange("yearsCurrentEmployer", e.target.value)}
                        className="w-full mt-1 border-b border-slate-200 bg-transparent py-2 text-sm font-semibold focus:border-slate-900 focus:outline-none"
                     >
                        <option value="">Select...</option>
                        <option value="<1">Less than 1</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4+">4+</option>
                     </select>
                  )}
               </label>
            </div>
         </div>
      </MintCard>

         <button 
            onClick={() => onSubmit(formData)}
            disabled={!canContinue}
            className="w-full py-4 rounded-full bg-slate-900 text-white font-semibold text-[17px] shadow-lg hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
            Continue <ArrowRight size={18} />
      </button>
    </div>
  );
};


// Stage 3: Results
const ResultStage = ({ score, isCalculating, breakdown, engineResult, engineError, onRunAssessment, onContinue }) => {
      const [showAllData, setShowAllData] = useState(false);
      const [loaderValue, setLoaderValue] = useState(0);

      useEffect(() => {
         let interval;
         if (isCalculating) {
             setLoaderValue(0);
             interval = setInterval(() => {
                 setLoaderValue(prev => {
                     if (prev >= 99) return 99;
                     return prev + 0.5;
                 });
             }, 20);
         } else if (score > 0) {
             setLoaderValue(score);
         }
         return () => clearInterval(interval);
      }, [isCalculating, score]);

      const sanitizeData = (value) => {
         if (Array.isArray(value)) return value.map(sanitizeData);
         if (value && typeof value === "object") {
            return Object.entries(value).reduce((acc, [key, val]) => {
               const blockedKeys = new Set([
                  "gross_monthly_income",
                  "net_monthly_income",
                  "avg_monthly_income",
                  "avg_monthly_expenses",
                  "monthly_income",
                  "monthlyIncome",
                  "monthly_expenses",
                  "monthlyExpenses"
               ]);
               if (blockedKeys.has(key)) return acc;
               acc[key] = sanitizeData(val);
               return acc;
            }, {});
         }
         return value;
      };

      const safeResult = engineResult ? sanitizeData(engineResult) : null;
      const scoreReasons = engineResult?.scoreReasons || [];
      const tenureMonths = engineResult?.breakdown?.employmentTenure?.monthsInCurrentJob;

      const hasAssessment = score > 0 || isCalculating;
      const isDeclined = !isCalculating && score > 0 && score < 50;
      const scoreOutcome = score >= 80
         ? "Auto-approval at best rate"
         : score >= 70
            ? "Approval with risk-adjusted pricing"
            : score >= 50
               ? "Borderline – manual review"
               : "Decline";

      const progressDeg = (isCalculating ? loaderValue : score) * 3.6;

      const statusMessages = [
        'Initializing...',
        'Connecting...',
        'Processing...',
        'Analyzing...',
        'Finalizing...'
      ];
      const messageIndex = Math.min(statusMessages.length - 1, Math.floor((loaderValue / 100) * statusMessages.length));
      const statusText = hasAssessment 
        ? (isCalculating ? statusMessages[messageIndex] : "Trust Score")
        : "Start Check";


      return (
            <MintCard className="animate-in zoom-in-95 duration-500 min-h-[400px]">
                  <div className="flex flex-col items-center justify-center py-12">
                      <button
                          onClick={hasAssessment ? undefined : onRunAssessment}
                          disabled={hasAssessment}
                          className="group relative outline-none focus-visible:ring-4 focus-visible:ring-purple-500/40 rounded-full transition-all duration-300"
                      >
                         <div
                            className="w-[190px] h-[190px] rounded-full relative grid place-items-center transition-transform duration-300 ease-out group-hover:scale-[1.02] active:scale-[0.98]"
                            style={{
                                background: `
                                    radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.6) 55%, rgba(255, 255, 255, 0)),
                                    conic-gradient(
                                    from -90deg,
                                    #6a43ff 0deg,
                                    #9370ff ${Math.max(0.1, progressDeg * 0.8)}deg,
                                    #8d6bff ${Math.max(0.1, progressDeg)}deg,
                                    rgba(106, 67, 255, 0.15) ${Math.max(0.1, progressDeg)}deg,
                                    rgba(106, 67, 255, 0.08) 360deg
                                    )
                                `,
                                boxShadow: `
                                    inset 0 4px 10px rgba(255, 255, 255, 0.8),
                                    inset 0 -6px 12px rgba(75, 34, 214, 0.1),
                                    inset 1px 1px 4px rgba(255, 255, 255, 0.4),
                                    0 10px 24px rgba(75, 34, 214, 0.15),
                                    0 4px 8px rgba(106, 67, 255, 0.1)
                                `
                            }}
                         >
                            {/* Inner White Circle */}
                            <div
                                className="absolute inset-[10px] rounded-full bg-gradient-to-br from-white via-[#faf8ff] to-[#f2edff] z-10"
                                style={{
                                    boxShadow: `
                                        0 2px 6px rgba(75, 34, 214, 0.05),
                                        inset 0 4px 8px rgba(0, 0, 0, 0.01),
                                        inset 0 -2px 6px rgba(106, 67, 255, 0.02)
                                    `
                                }}
                            >
                                {/* Glare */}
                                <div className="absolute top-[14px] left-[14px] right-[14px] h-1/2 rounded-t-full bg-gradient-to-b from-white/60 to-transparent blur-md pointer-events-none z-20" />
                            </div>

                            {/* Content */}
                            <div className="relative z-30 text-center flex flex-col items-center">
                                <span
                                    className="text-5xl font-light tracking-tight"
                                    style={{
                                        background: 'linear-gradient(135deg, #4b22d6 0%, #6a43ff 50%, #8d6bff 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        filter: 'drop-shadow(0 1px 2px rgba(75, 34, 214, 0.1))'
                                    }}
                                >
                                    {Math.round(isCalculating ? loaderValue : score)}%
                                </span>
                                <span className="text-[11px] font-medium text-slate-400 mt-2 tracking-widest uppercase">
                                    {statusText}
                                </span>
                            </div>
                         </div>
                      </button>
                  </div>

                  {!isCalculating && score > 0 && (
                     <div className="pt-8 border-t border-slate-50 mt-8 space-y-4">
                        <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                           isDeclined
                             ? "border-red-200 bg-red-50 text-red-700"
                             : score >= 80
                               ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                               : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}>
                           {scoreOutcome}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-slate-50 p-3 rounded-xl text-center">
                              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Credit Score</p>
                              <p className="text-lg font-black text-slate-800">{engineResult?.creditScore ?? "--"}</p>
                           </div>
                           <div className="bg-slate-50 p-3 rounded-xl text-center">
                              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Tenure</p>
                              <p className="text-lg font-black text-slate-800">{Number.isFinite(tenureMonths) ? `${tenureMonths} months` : "--"}</p>
                           </div>
                        </div>

                        <details className="group rounded-xl border border-slate-100 bg-white/80 p-4">
                           <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-slate-500">Show Experian reasons</summary>
                           <div className="mt-3 space-y-2 text-sm text-slate-700">
                              {scoreReasons.length ? (
                                 <ul className="list-disc pl-5 space-y-1">
                                    {scoreReasons.map((reason, idx) => (
                                       <li key={idx}>{reason}</li>
                                    ))}
                                 </ul>
                              ) : (
                                 <p className="text-slate-500">No reasons returned.</p>
                              )}
                           </div>
                        </details>

                        <details className="group rounded-xl border border-slate-100 bg-white/80 p-4">
                           <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-slate-500">Show all data</summary>
                           <div className="mt-3">
                              <button
                                 type="button"
                                 onClick={() => setShowAllData((prev) => !prev)}
                                 className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                              >
                                 {showAllData ? "Hide details" : "Reveal details"}
                              </button>
                              {showAllData && (
                                 <div className="mt-4 space-y-4 text-xs text-slate-700">
                                    <div className="grid grid-cols-2 gap-3">
                                       <div className="rounded-lg border border-slate-100 bg-white p-3">
                                          <p className="text-[10px] uppercase font-bold text-slate-400">Borrower status</p>
                                          <p className="text-sm font-semibold text-slate-800">
                                             {engineResult?.raw?.userData?.algolend_is_new_borrower ? "New borrower" : "Existing borrower"}
                                          </p>
                                       </div>
                                       <div className="rounded-lg border border-slate-100 bg-white p-3">
                                          <p className="text-[10px] uppercase font-bold text-slate-400">Contract type</p>
                                          <p className="text-sm font-semibold text-slate-800">
                                             {engineResult?.breakdown?.contractType?.contractType || "--"}
                                          </p>
                                       </div>
                                    </div>

                                    <div className="rounded-lg border border-slate-100 bg-white p-3">
                                       <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Exposure snapshot</p>
                                       <div className="grid grid-cols-2 gap-3">
                                          <div>
                                             <p className="text-[10px] text-slate-400">Revolving utilization</p>
                                             <p className="font-semibold text-slate-800">
                                                {Number.isFinite(engineResult?.breakdown?.creditUtilization?.ratioPercent)
                                                  ? `${engineResult.breakdown.creditUtilization.ratioPercent.toFixed(1)}%`
                                                  : "--"}
                                             </p>
                                          </div>
                                          <div>
                                             <p className="text-[10px] text-slate-400">Total balance</p>
                                             <p className="font-semibold text-slate-800">
                                                {Number.isFinite(engineResult?.creditExposure?.totalBalance)
                                                  ? `R ${engineResult.creditExposure.totalBalance.toLocaleString()}`
                                                  : "--"}
                                             </p>
                                          </div>
                                          <div>
                                             <p className="text-[10px] text-slate-400">Total limits</p>
                                             <p className="font-semibold text-slate-800">
                                                {Number.isFinite(engineResult?.creditExposure?.totalLimits)
                                                  ? `R ${engineResult.creditExposure.totalLimits.toLocaleString()}`
                                                  : "--"}
                                             </p>
                                          </div>
                                          <div>
                                             <p className="text-[10px] text-slate-400">Monthly installments</p>
                                             <p className="font-semibold text-slate-800">
                                                {Number.isFinite(engineResult?.creditExposure?.totalMonthlyInstallment)
                                                  ? `R ${engineResult.creditExposure.totalMonthlyInstallment.toLocaleString()}`
                                                  : "--"}
                                             </p>
                                          </div>
                                       </div>
                                    </div>

                                    <div className="rounded-lg border border-slate-100 bg-white p-3">
                                       <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Score breakdown</p>
                                       <div className="space-y-2">
                                          {Object.entries(engineResult?.breakdown || {}).map(([key, value]) => (
                                             <div key={key} className="flex items-center justify-between">
                                                <span className="text-slate-500">
                                                   {key.replace(/([A-Z])/g, " $1").trim()}
                                                </span>
                                                <span className="font-semibold text-slate-800">
                                                   {Number.isFinite(value?.contributionPercent)
                                                     ? `${(value.contributionPercent * 100).toFixed(1)}%`
                                                     : "--"}
                                                </span>
                                             </div>
                                          ))}
                                       </div>
                                    </div>
                                 </div>
                              )}
                           </div>
                        </details>

                        {onContinue && (
                           <button
                              type="button"
                              onClick={onContinue}
                              disabled={isDeclined}
                              className="w-full mt-2 py-4 rounded-full bg-slate-900 text-white text-sm font-semibold uppercase tracking-[0.2em] shadow-lg shadow-slate-900/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                              {isDeclined ? "Loan declined" : "Continue to loan configuration"}
                           </button>
                        )}
                        {engineError && (
                           <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] font-semibold text-rose-700">
                              Experian log: {engineError}
                           </div>
                        )}
                     </div>
                  )}
            </MintCard>
      );
};


// --- ORCHESTRATOR ---

const CreditApplyWizard = ({ onBack, onComplete }) => {
   const [step, setStep] = useState(0); // 0=Intro, 1=Connect, 2=Enrich, 3=Result
   const [autoAdvance, setAutoAdvance] = useState(false);
   const [checkedExistingScore, setCheckedExistingScore] = useState(false);
   const [loanApplications, setLoanApplications] = useState([]);
   const [loadingLoans, setLoadingLoans] = useState(true);
   const [showDetails, setShowDetails] = useState(false);
  
  // Real Hook Integration
   const { 
    form: checkForm, 
    setField, 
    runEngine, 
    engineResult, 
    engineStatus, 
      engineError,
    employerCsv,
    lockInputs,
    snapshot,
      proceedToStep3, // Import this to save progress to DB
      loadingProfile,
      onboardingEmployerName,
      contractTypeLocked,
      sectorLocked,
      onboardingYearsAtEmployer,
      yearsAtEmployerLocked
  } = useCreditCheck();

  const isCalculating = engineStatus === "Running";
  const score = engineResult?.loanEngineScoreNormalized ?? engineResult?.loanEngineScore ?? 0;

   const formatAmount = (value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return "—";
      return `R ${numeric.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
   };

  // Sync Supabase Snapshot to Form
  useEffect(() => {
    if (snapshot) {
      if (snapshot.avg_monthly_income) setField("annualIncome", String(snapshot.avg_monthly_income * 12));
      if (snapshot.avg_monthly_expenses) setField("annualExpenses", String(snapshot.avg_monthly_expenses * 12));
    }
  }, [snapshot, setField]);

   useEffect(() => {
      if (loadingProfile) return;
      if (!snapshot || step !== 0) return;
      setAutoAdvance(true);
      const timer = setTimeout(() => {
         setStep(2);
         setAutoAdvance(false);
      }, 900);
      return () => clearTimeout(timer);
   }, [snapshot, step, loadingProfile]);

   useEffect(() => {
      if (loadingProfile) return;
      if (step !== 2) return;
      if (onboardingEmployerName && contractTypeLocked && sectorLocked && yearsAtEmployerLocked) {
         setStep(3);
      }
   }, [loadingProfile, step, onboardingEmployerName, contractTypeLocked, sectorLocked, yearsAtEmployerLocked]);

   useEffect(() => {
      if (loadingProfile || checkedExistingScore) return;

      const checkExistingScore = async () => {
         if (!supabase) return;
         const { data: sessionData } = await supabase.auth.getSession();
         const userId = sessionData?.session?.user?.id;
         if (!userId) return;

         const { data: scoreData } = await supabase
            .from("loan_engine_score")
            .select("engine_score")
            .eq("user_id", userId)
            .order("run_at", { ascending: false })
            .limit(1)
            .maybeSingle();

         if (Number.isFinite(scoreData?.engine_score) && scoreData.engine_score >= 50 && onComplete) {
            onComplete();
         }
      };

      checkExistingScore().finally(() => setCheckedExistingScore(true));
   }, [loadingProfile, checkedExistingScore, onComplete]);

   useEffect(() => {
      const loadLoanApplications = async () => {
         if (!supabase) return;
         const { data: sessionData } = await supabase.auth.getSession();
         const userId = sessionData?.session?.user?.id;
         if (!userId) return;

         const { data: loanData } = await supabase
            .from("loan_application")
            .select("id,principal_amount,amount_repayable,status,created_at,first_repayment_date,number_of_months")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .limit(3);

         if (Array.isArray(loanData)) {
            setLoanApplications(loanData);
         }
      };

      loadLoanApplications().finally(() => setLoadingLoans(false));
   }, []);
  
  const handleStart = () => setStep(1);

  const handleConnectionComplete = (collectionId, snapshotData) => {
     if (snapshotData) {
         if (snapshotData.avg_monthly_income) setField("annualIncome", String(snapshotData.avg_monthly_income * 12));
         if (snapshotData.avg_monthly_expenses) setField("annualExpenses", String(snapshotData.avg_monthly_expenses * 12));
     }
     setStep(2);
  };

  const handleEnrichmentSubmit = async (finalData) => {
     // 1. Sync Form Data to Hook
     if(finalData.employerName) setField("employerName", finalData.employerName);
     if(finalData.employmentSector) setField("employmentSector", finalData.employmentSector);
     if(finalData.contractType) setField("contractType", finalData.contractType);
     if(finalData.yearsCurrentEmployer) setField("yearsCurrentEmployer", finalData.yearsCurrentEmployer);

     const shouldSaveOnboarding = (!onboardingEmployerName && finalData.employerName)
        || (!contractTypeLocked && finalData.contractType)
        || (!sectorLocked && finalData.employmentSector);

     if (shouldSaveOnboarding) {
        try {
           const { data: { session } } = await supabase.auth.getSession();
           const userId = session?.user?.id;
           if (userId) {
              await supabase
                .from("user_onboarding")
                .upsert({
                   user_id: userId,
                   employment_status: "employed",
                   employer_name: finalData.employerName,
                   employment_type: finalData.contractType,
                   employer_industry: finalData.employmentSector
                }, { onConflict: "user_id" });
           }
        } catch (error) {
           console.warn("Failed to save employer name:", error?.message || error);
        }
     }

     if (!yearsAtEmployerLocked && finalData.yearsCurrentEmployer) {
        try {
           const { data: { session } } = await supabase.auth.getSession();
           const userId = session?.user?.id;
           if (userId) {
              const yearsValue = finalData.yearsCurrentEmployer === "<1"
                ? 0.5
                : finalData.yearsCurrentEmployer === "4+"
                  ? 4
                  : Number(finalData.yearsCurrentEmployer);

              const { data: existingScore } = await supabase
                .from("loan_engine_score")
                .select("id")
                .eq("user_id", userId)
                .limit(1)
                .maybeSingle();

              if (existingScore?.id) {
                await supabase
                  .from("loan_engine_score")
                  .update({ years_current_employer: yearsValue })
                  .eq("id", existingScore.id);
              }
           }
        } catch (error) {
           console.warn("Failed to save years at employer:", error?.message || error);
        }
     }
     
     // 2. Lock & Run
     lockInputs(); 
     
     // 3. Save progress to Supabase
     if (proceedToStep3) proceedToStep3();

     setStep(3);
  };

  const handleRunAssessment = async () => {
    lockInputs();
    if (proceedToStep3) proceedToStep3();
    await runEngine();
  };
  
  // Prepare "defaultValues" for Step 2 using the hook's current form state
  const enrichmentDefaults = {
    employerName: checkForm.employerName,
    employmentSector: checkForm.employmentSector,
      contractType: checkForm.contractType,
      yearsCurrentEmployer: onboardingYearsAtEmployer || checkForm.yearsCurrentEmployer
  };
  
  const employerOptions = employerCsv?.map(row => row.split(";")[0]).filter(Boolean).slice(0, 50) || [];

  // Render Based on Step
   const renderContent = () => {
     switch(step) {
        case 0:
                  if (loadingProfile) {
                     return (
                        <MintCard className="animate-in fade-in zoom-in-95 duration-700">
                           <div className="flex flex-col items-center gap-4 py-8 text-center">
                              <div className="h-16 w-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center animate-pulse">
                                 <Search size={28} />
                              </div>
                              <div className="space-y-2">
                                 <h3 className="text-lg font-bold text-slate-900">Checking status...</h3>
                                 <p className="text-sm text-slate-500">Retrieving your verification profile</p>
                              </div>
                           </div>
                        </MintCard>
                     );
                  }

                  if (autoAdvance) {
                     return (
                        <MintCard className="animate-in fade-in zoom-in-95 duration-700">
                           <div className="flex flex-col items-center gap-4 py-8 text-center">
                              <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-pulse">
                                 <CheckCircle2 size={28} />
                              </div>
                              <div className="space-y-2">
                                 <h3 className="text-lg font-bold text-slate-900">Bank data already captured</h3>
                                 <p className="text-sm text-slate-500">Taking you to the review step…</p>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                                 <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                                 Auto‑continue
                              </div>
                           </div>
                        </MintCard>
                     );
                  }
                  return (
                     <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col items-center px-6 pb-10 min-h-screen bg-white">
                        <header className="w-full flex items-center justify-start pt-10 pb-6">
                           <button
                              onClick={() => onBack ? onBack() : window.history.back()}
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-95"
                           >
                              <ArrowLeft className="h-5 w-5" />
                           </button>
                        </header>

                        <div className="mb-6 relative z-10 mt-4">
                           <div style={{ animation: "subtleBounce 3s ease-in-out infinite" }}>
                              <img
                                 src="/assets/images/coinAlgoMoney.png"
                                 alt="Mint"
                                 className="h-20 w-20 object-contain drop-shadow-2xl"
                              />
                           </div>
                           <div
                              className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-1 bg-black/10 blur-md rounded-[100%]"
                              style={{ animation: "shadowScale 3s ease-in-out infinite" }}
                           ></div>
                           <style>{`
                              @keyframes subtleBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
                              @keyframes shadowScale {
                                 0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.2; }
                                 50% { transform: translateX(-50%) scale(0.8); opacity: 0.1; }
                              }
                           `}</style>
                        </div>

                        <h2 className="text-3xl font-light tracking-tight text-center text-slate-900 mb-2 leading-tight">
                           Welcome to <span className="mint-brand font-bold uppercase mr-1.5">MINT</span><br />Credit
                        </h2>
                        <p className="text-sm text-slate-500 text-center max-w-[280px] mb-8">
                           "Data-driven credit solutions that move with you."
                        </p>

                        <div className="w-full space-y-3 mb-6">
                           {[
                              { icon: <Briefcase size={18} />, title: "1. Employment Verification", desc: "Confirming occupational stability." },
                              { icon: <Landmark size={18} />, title: "2. Financial Integration", desc: "Secure data exchange via TruID." },
                              { icon: <Zap size={18} />, title: "3. Proprietary Scoring", desc: "Real-time affordability assessment." }
                           ].map((s, i) => (
                              <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-white/60 border border-white/40 shadow-sm backdrop-blur-sm">
                                 <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm shrink-0">
                                    {s.icon}
                                 </div>
                                 <div>
                                    <h3 className="font-bold text-slate-900 text-xs tracking-tight uppercase">{s.title}</h3>
                                    <p className="text-[10px] text-slate-500 leading-tight">{s.desc}</p>
                                 </div>
                              </div>
                           ))}
                        </div>

                        <button
                           onClick={() => setShowDetails(!showDetails)}
                           className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-slate-600 transition mb-2"
                        >
                           <Info size={14} /> How it works {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {showDetails && (
                           <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100 text-[10px] text-slate-500 leading-relaxed animate-in fade-in zoom-in-95">
                              Our automated credit engine utilizes high-fidelity data from <strong>Experian</strong> and granular cash-flow analysis provided via TruID.
                              By assessing debt-to-income ratios and historical repayment behavior, we ensure alignment with National Credit Act affordability mandates.
                           </div>
                        )}

                        <button
                           onClick={handleStart}
                           className="w-full py-4 bg-slate-900 text-white rounded-full text-sm font-bold uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all mt-4"
                        >
                           Initiate Application
                        </button>

                        <footer className="mt-8 text-center opacity-40">
                           <p className="text-[8px] uppercase tracking-tighter text-slate-500 max-w-[340px] mx-auto leading-relaxed">
                              <span className="mint-brand">MINT</span> (Pty) Ltd is an authorised Financial Services Provider (FSP 55118) and a
                              Registered Credit Provider (NCRCP22892). <span className="mint-brand">MINT</span> Reg no: 2024/644796/07
                           </p>
                        </footer>
                     </div>
                  );
        case 1:
            return <ConnectionStage onComplete={handleConnectionComplete} onError={() => {}} />;
         case 2:
             return <EnrichmentStage 
                         defaultValues={enrichmentDefaults} 
                         employerOptions={employerOptions} 
                         onSubmit={handleEnrichmentSubmit} 
                         employerLocked={Boolean(onboardingEmployerName)}
                         contractLocked={contractTypeLocked}
                         sectorLocked={sectorLocked}
                         yearsLocked={yearsAtEmployerLocked}
                      />;
            case 3:
             return <ResultStage 
             score={score} 
             isCalculating={isCalculating} 
             breakdown={engineResult?.breakdown} 
                engineResult={engineResult}
                engineError={engineError}
                onRunAssessment={handleRunAssessment}
                onContinue={onComplete}
                />;
        default:
            return null;
     }
  };

  const getTitle = () => {
     if (step === 0) return "Credit Application";
     if (step === 1) return "Link Accounts";
     if (step === 2) return "Confirm Details";
     if (step === 3) return "Assessment Result";
     return "";
  };
  
  const getStepInfo = () => {
    if (step === 0) return "Start";
    return `${step} / 3`;
  };

   if (step === 0) {
      return renderContent();
   }

   return (
      <MintGradientLayout 
            title={getTitle()} 
            subtitle={step === 1 ? "We need to verify your income via your primary bank account." : step === 2 ? "Review the details we found." : ""}
            stepInfo={getStepInfo()}
            onBack={() => setStep(s => s - 1)}
      >
         {renderContent()}
      </MintGradientLayout>
   );
};

export default CreditApplyWizard;
