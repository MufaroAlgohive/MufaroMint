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
  Plus
} from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";

const ApplyLiquidity = ({ onBack, onNavigateToMarkets, totalPortfolioValue, fonts }) => {
  const [view, setView] = useState("diagnostic"); 
  const [workflowStep, setWorkflowStep] = useState("idle"); 
  const [selectedAssetIds, setSelectedAssetIds] = useState(new Set());
  const [requestAmount, setRequestAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => { setPortalTarget(document.body); }, []);

  const ineligibleAssets = [
    { id: 1, name: "Penny Stock Ltd", code: "PNY", reason: "Low Liquidity (ADVT < R10m)", value: 12500 },
    { id: 2, name: "Speculative Mining", code: "SPM", reason: "High Volatility (> 50%)", value: 45000 },
    { id: 3, name: "Micro-Cap Tech", code: "MCT", reason: "Market Cap < R10bn", value: 8000 }
  ];

  const selectedAssets = ineligibleAssets.filter(a => selectedAssetIds.has(a.id));
  const totalCollateralValue = selectedAssets.reduce((sum, a) => sum + a.value, 0);
  const estimatedLimit = totalCollateralValue * 0.20;

  const usagePercentage = useMemo(() => {
    const val = parseFloat(requestAmount) || 0;
    return totalPortfolioValue > 0 ? ((val / totalPortfolioValue) * 100).toFixed(1) : 0;
  }, [requestAmount, totalPortfolioValue]);

  const toggleAsset = (id) => {
    const next = new Set(selectedAssetIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedAssetIds(next);
  };

  if (view === "application") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10">
          <button onClick={() => setView("diagnostic")} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600"><ChevronLeft size={20} /></button>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Credit Application</h3>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8 pb-32">
          <div className="mb-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estimated Limit (20% LTV)</p>
            <h2 className="text-4xl font-light text-slate-900" style={{ fontFamily: fonts.display }}>{formatZar(estimatedLimit)}</h2>
          </div>

          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-lg mb-8">
            <div className="flex justify-between items-center mb-4">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Requested Amount</span>
                <div className="text-right">
                    <input 
                        type="number" value={requestAmount} onChange={(e) => setRequestAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-32 bg-slate-50 px-4 py-2 rounded-xl text-right font-bold text-slate-900 outline-none mb-1" 
                    />
                    <p className="text-[9px] font-bold text-violet-600 uppercase">Usage: {usagePercentage}% of Portfolio</p>
                </div>
            </div>
          </div>
          
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Selected Assets ({selectedAssetIds.size})</p>
          <div className="space-y-3">
            {selectedAssets.map(asset => (
                <div key={asset.id} className="bg-white rounded-[24px] p-4 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 text-[10px]">{asset.code}</div>
                        <div><p className="text-xs font-bold text-slate-900">{asset.name}</p></div>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{formatZar(asset.value)}</p>
                </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-white border-t border-slate-100 pb-28">
            <button 
                disabled={!requestAmount || selectedAssetIds.size === 0}
                onClick={() => setWorkflowStep("review")}
                className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95 disabled:opacity-30"
            >
                Review Application
            </button>
        </div>

        {workflowStep !== "idle" && portalTarget && createPortal(
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md px-6 pb-20">
                {workflowStep === "review" && (
                    <div className="bg-white w-full max-w-sm rounded-[36px] p-8 shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-6"><div className="h-10 w-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center"><FileText size={20} /></div><h3 className="text-xl font-bold text-slate-900">Final Confirmation</h3></div>
                        
                        <div className="p-4 bg-slate-50 rounded-2xl mb-6 border border-slate-100">
                            <p className="text-[9px] text-slate-400 font-medium leading-relaxed italic">
                                Disclaimer: Submission of this manual application initiates a 48-hour risk assessment. Your assets will be restricted if approved.
                            </p>
                        </div>

                        <label className="flex items-center gap-3 mb-8 cursor-pointer">
                            <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${disclaimerChecked ? 'bg-violet-600 border-violet-600' : 'bg-white border-slate-200'}`}>
                                {disclaimerChecked && <Check size={14} className="text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={disclaimerChecked} onChange={() => setDisclaimerChecked(!disclaimerChecked)} />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">I have read and understood the terms.</span>
                        </label>

                        <div className="flex flex-col gap-3">
                            <button disabled={!disclaimerChecked} onClick={() => setWorkflowStep("auth")} className="w-full bg-slate-900 text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-widest">Agree & Submit</button>
                            <button onClick={() => setWorkflowStep("idle")} className="w-full py-2 text-xs font-bold text-slate-400 uppercase">Cancel</button>
                        </div>
                    </div>
                )}
                {/* ... existing Auth & Success states ... */}
            </div>
        , portalTarget)}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95"><ChevronLeft size={20} /></button>
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
              <p className="text-white/50 text-xs leading-relaxed max-w-[240px]">Select ineligible assets to request a manual credit limit assessment.</p>
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
                className={`w-full bg-white rounded-[24px] p-5 border transition-all flex items-center justify-between text-left ${selectedAssetIds.has(asset.id) ? 'border-violet-500 shadow-md' : 'border-slate-100 shadow-sm opacity-70'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center border transition-colors ${selectedAssetIds.has(asset.id) ? 'bg-violet-50 border-violet-200' : 'bg-slate-50'}`}>
                    {selectedAssetIds.has(asset.id) ? <Check size={18} className="text-violet-600" /> : <Plus size={18} className="text-slate-300" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{asset.name}</p>
                    <p className="text-[9px] text-rose-500 font-bold uppercase mt-1">{asset.reason}</p>
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
                className="w-full bg-white rounded-[32px] p-6 border border-violet-100 shadow-lg flex items-center justify-between group active:scale-[0.98] transition-all disabled:opacity-30"
            >
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900">Request Manual Review</p>
                        <p className="text-[10px] text-slate-400 font-medium">Submit {selectedAssetIds.size} assets for review.</p>
                    </div>
                </div>
                <ArrowRight size={16} className="text-slate-300 group-hover:text-violet-600 transition-colors" />
            </button>
        </div>
      </div>

      <div className="p-6 bg-white border-t border-slate-100 pb-28">
        <button onClick={onNavigateToMarkets} className="w-full h-14 rounded-2xl bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest shadow-xl">Explore Qualifying Markets</button>
      </div>
    </div>
  );
};

export default ApplyLiquidity;