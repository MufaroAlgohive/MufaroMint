import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  ChevronLeft, 
  Lock, 
  AlertCircle, 
  TrendingUp, 
  Zap, 
  ArrowRight, 
  Sparkles,
  Check,
  FileText,
  ShieldCheck,
  HelpCircle,
  Plus,
  Search,
  SlidersHorizontal
} from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";

const ApplyForCredit = ({ onBack, onNavigateToMarkets, profile, fonts }) => {
  // --- Workflow States ---
  const [view, setView] = useState("diagnostic"); // 'diagnostic' or 'application'
  const [workflowStep, setWorkflowStep] = useState("idle"); // idle, review, auth, success
  const [selectedAssetIds, setSelectedAssetIds] = useState(new Set());
  const [requestAmount, setRequestAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => { setPortalTarget(document.body); }, []);

  // --- Portfolio Diagnostic Data ---
  const ineligibleAssets = [
    { id: 1, name: "Penny Stock Ltd", code: "PNY", reason: "Low Liquidity (ADVT < R10m)", value: 12500, cap: "R2bn", vol: "12%" },
    { id: 2, name: "Speculative Mining", code: "SPM", reason: "High Volatility (> 50%)", value: 45000, cap: "R6bn", vol: "65%" },
    { id: 3, name: "Micro-Cap Tech", code: "MCT", reason: "Market Cap < R10bn", value: 8000, cap: "R4bn", vol: "22%" }
  ];

  const selectedAssets = ineligibleAssets.filter(a => selectedAssetIds.has(a.id));
  const totalCollateralValue = selectedAssets.reduce((sum, a) => sum + a.value, 0);
  
  // Logic: Manual review typically allows lower LTV, e.g., 20% 
  const estimatedLimit = totalCollateralValue * 0.20;

  // --- Handlers ---
  const toggleAsset = (id) => {
    const next = new Set(selectedAssetIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedAssetIds(next);
  };

  const closeWorkflow = () => {
    setWorkflowStep("idle");
    setDisclaimerChecked(false);
    setRequestAmount("");
  };

  if (view === "application") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10">
          <button onClick={() => setView("diagnostic")} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600"><ChevronLeft size={20} /></button>
          <div className="text-center">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Credit Application</h3>
            <p className="text-[10px] font-bold text-violet-600">Manual Review Process</p>
          </div>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8 pb-32">
          <div className="mb-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estimated Limit (20% LTV)</p>
            <h2 className="text-4xl font-light text-slate-900" style={{ fontFamily: fonts.display }}>{formatZar(estimatedLimit)}</h2>
            <p className="text-[10px] text-slate-400 mt-2 italic">Based on {selectedAssetIds.size} selected assets</p>
          </div>

          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm mb-8">
            <div className="flex justify-between items-center mb-6">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Requested Amount</span>
                <input 
                    type="number" value={requestAmount} onChange={(e) => setRequestAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-32 bg-slate-50 px-4 py-2 rounded-xl text-right font-bold text-slate-900 outline-none" 
                />
            </div>
            <div className="p-4 bg-violet-50 rounded-2xl border border-violet-100">
                <p className="text-[10px] text-violet-700 font-medium leading-relaxed">
                    Note: Manual applications take 24-48 hours for risk assessment as these assets do not meet automated liquidity depth requirements.
                </p>
            </div>
          </div>

          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Selected Collateral</p>
          <div className="space-y-3">
            {selectedAssets.map(asset => (
                <div key={asset.id} className="bg-white rounded-[24px] p-4 border border-slate-100 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 text-[10px]">{asset.code}</div>
                        <div><p className="text-xs font-bold text-slate-900">{asset.name}</p><p className="text-[9px] text-rose-500 font-bold uppercase">{asset.reason}</p></div>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{formatZar(asset.value)}</p>
                </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-white border-t border-slate-100 pb-28 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
            <button 
                disabled={!requestAmount || selectedAssetIds.size === 0}
                onClick={() => setWorkflowStep("review")}
                className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all disabled:opacity-30"
            >
                Review Application
            </button>
        </div>

        {/* Workflow Modals */}
        {workflowStep !== "idle" && portalTarget && createPortal(
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md px-6 pb-20">
                {workflowStep === "review" && (
                    <div className="bg-white w-full max-w-sm rounded-[36px] p-8 shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-6"><div className="h-10 w-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center"><FileText size={20} /></div><h3 className="text-xl font-bold text-slate-900">Application Review</h3></div>
                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between pb-3 border-b border-slate-50 text-sm"><span className="text-slate-500 font-medium">Requested Credit</span><span className="font-bold text-slate-900">{formatZar(requestAmount)}</span></div>
                            <div className="flex justify-between pb-3 border-b border-slate-50 text-sm"><span className="text-slate-500 font-medium">Review Period</span><span className="font-bold text-slate-900">1-2 Business Days</span></div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl mb-6 border border-slate-100">
                            <p className="text-[9px] text-slate-400 font-medium leading-relaxed italic">
                                Disclaimer: Submission does not guarantee approval. Assets will be evaluated based on Market Cap (min R10bn) and ADVT (min R10m) benchmarks.
                            </p>
                        </div>

                        <label className="flex items-center gap-3 mb-8 cursor-pointer group">
                            <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${disclaimerChecked ? 'bg-violet-600 border-violet-600' : 'bg-white border-slate-200'}`}>
                                {disclaimerChecked && <Check size={14} className="text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={disclaimerChecked} onChange={() => setDisclaimerChecked(!disclaimerChecked)} />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">I authorize this credit assessment.</span>
                        </label>

                        <div className="flex flex-col gap-3">
                            <button disabled={!disclaimerChecked} onClick={() => setWorkflowStep("auth")} className="w-full bg-slate-900 text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-xl disabled:opacity-30">Submit for Review</button>
                            <button onClick={closeWorkflow} className="w-full py-2 text-xs font-bold text-slate-400 uppercase">Cancel</button>
                        </div>
                    </div>
                )}
                {workflowStep === "auth" && (
                    <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl">
                        <div className="h-16 w-16 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-6"><Lock size={28} /></div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Authorize</h3>
                        <div className="flex justify-center gap-3 my-8">{[1,2,3,4].map(i => <div key={i} className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 font-bold">•</div>)}</div>
                        <button onClick={() => { setIsProcessing(true); setTimeout(() => { setIsProcessing(false); setWorkflowStep("success"); }, 1500); }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest">{isProcessing ? "Submitting..." : "Confirm PIN"}</button>
                    </div>
                )}
                {workflowStep === "success" && (
                    <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl">
                        <div className="h-20 w-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-inner"><Check size={40} strokeWidth={3} /></div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Application Sent</h3>
                        <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed">Our risk team is reviewing your selected collateral. You will be notified of the decision.</p>
                        <button onClick={onBack} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg">Done</button>
                    </div>
                )}
            </div>
        , portalTarget)}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95 transition-all">
          <ChevronLeft size={20} />
        </button>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Apply for Credit</h3>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="px-6 pt-8 pb-6">
          <div className="bg-slate-900 rounded-[36px] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/10">
                <Lock className="text-violet-400" size={28} />
              </div>
              <h2 className="text-3xl font-light tracking-tight mb-3" style={{ fontFamily: fonts.display }}>Liquidity Locked</h2>
              <p className="text-white/50 text-xs leading-relaxed max-w-[240px]">
                Your current assets don't meet the automated thresholds for <span className="text-white font-bold">Instant Credit</span>[cite: 109, 117].
              </p>
            </div>
            <div className="absolute -right-20 -bottom-20 h-64 w-64 bg-violet-600/20 blur-[80px] rounded-full" />
          </div>
        </div>

        <div className="px-6 mb-8">
          <div className="flex items-center justify-between mb-4 px-2">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Portfolio Diagnostic</h4>
            <HelpCircle size={14} className="text-slate-300" />
          </div>

          <div className="space-y-3">
            {ineligibleAssets.map((asset) => (
              <button 
                key={asset.id} 
                onClick={() => toggleAsset(asset.id)}
                className={`w-full bg-white rounded-[24px] p-5 border transition-all flex items-center justify-between text-left ${selectedAssetIds.has(asset.id) ? 'border-violet-500 ring-1 ring-violet-500 shadow-md' : 'border-slate-100 shadow-sm opacity-70'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center border transition-colors ${selectedAssetIds.has(asset.id) ? 'bg-violet-50 border-violet-200' : 'bg-slate-50 border-slate-100'}`}>
                    {selectedAssetIds.has(asset.id) ? <Check size={18} className="text-violet-600" /> : <Plus size={18} className="text-slate-300" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{asset.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <AlertCircle size={10} className="text-rose-400" />
                      <p className="text-[9px] text-rose-500 font-bold uppercase">{asset.reason}</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-900">{formatZar(asset.value)}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 mb-12">
            <button 
                disabled={selectedAssetIds.size === 0}
                onClick={() => setView("application")}
                className="w-full bg-white rounded-[32px] p-6 border border-violet-100 shadow-lg shadow-violet-100/20 flex items-center justify-between group active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale"
            >
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                        <ShieldCheck size={20} />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-bold text-slate-900">Request Manual Review</p>
                        <p className="text-[10px] text-slate-400 font-medium">Submit {selectedAssetIds.size} assets for assessment.</p>
                    </div>
                </div>
                <ArrowRight size={16} className="text-slate-300 group-hover:text-violet-600 transition-colors" />
            </button>
        </div>

        <div className="px-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-4">How to qualify for instant credit</p>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-[28px] p-5 border border-slate-100 shadow-sm">
                    <TrendingUp className="text-violet-600 mb-3" size={16} />
                    <p className="text-[10px] font-black text-slate-900 uppercase mb-1">Scale</p>
                    <p className="text-[9px] text-slate-500 leading-tight">Focus on companies with Market Cap {'>'} R10bn[cite: 112].</p>
                </div>
                <div className="bg-white rounded-[28px] p-5 border border-slate-100 shadow-sm">
                    <Zap className="text-emerald-600 mb-3" size={16} />
                    <p className="text-[10px] font-black text-slate-900 uppercase mb-1">Depth</p>
                    <p className="text-[9px] text-slate-500 leading-tight">High liquidity shares (ADVT {'>'} R10m)[cite: 119].</p>
                </div>
            </div>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-slate-100 pb-28 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <button 
            onClick={onNavigateToMarkets}
            className="w-full h-14 rounded-2xl bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-xl"
        >
          View Qualifying Markets
        </button>
      </div>
    </div>
  );
};

export default ApplyForCredit;