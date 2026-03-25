import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Zap, Info, Search, SlidersHorizontal, Plus, FileSignature,
  HandCoins, History, Check, ChevronLeft, X, FileText, Lock,
  ChevronRight, Star, ShieldCheck, PieChart, HelpCircle, ArrowRight, Percent
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { formatZar } from "../../lib/formatCurrency";
import NotificationBell from "../../components/NotificationBell";
import NavigationPill from "../../components/NavigationPill";
import { supabase } from "../../lib/supabase";
import { useRequiredActions } from "../../lib/useRequiredActions";

// --- SUB-PAGES ---
import LiquidityHistory from "./LiquidityHistory";
import ActiveLiquidity from "./ActiveLiquidity";
import RepayLiquidity from "./RepayLiquidity";
import NewPortfolio from "../NewPortfolioPage";

// --- CONSTANTS ---
const sortOptions = ["Balance (High)", "Score (High)", "Market Cap", "Dividend Yield"];
const sectorOptions = ["Technology", "Financials", "Consumer", "Healthcare", "Energy", "Materials"];

// --- MINI CHART COMPONENT ---
const AssetMiniChart = ({ data, color = "#7c3aed" }) => (
  <div className="h-8 w-16">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data.map((v, i) => ({ v, i }))}>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const InstantLiquidity = ({ profile, onOpenNotifications, onTabChange, onLinkBank }) => {
  // --- CORE UI STATE ---
  const [view, setView] = useState("main");
  const [loading, setLoading] = useState(true);
  const { bankLinked } = useRequiredActions();
  const [portalTarget, setPortalTarget] = useState(null);
  const [infoModal, setInfoModal] = useState(null);

  // --- FILTER & SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("Balance (High)");
  const [selectedSectors, setSelectedSectors] = useState(new Set());
  const [draftSort, setDraftSort] = useState("Balance (High)");
  const [draftSectors, setDraftSectors] = useState(new Set());

  // --- PORTFOLIO & SELECTION STATE ---
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [generatedPin, setGeneratedPin] = useState("");

  // --- WORKFLOW STATE ---
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [workflowStep, setWorkflowStep] = useState("idle"); // idle, contract, auth, success, setup_pin
  const [isProcessing, setIsProcessing] = useState(false);

  // --- USER INPUT STATE ---
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [newPin, setNewPin] = useState("");
  const [repaymentDate, setRepaymentDate] = useState("");
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);

  useEffect(() => { setPortalTarget(document.body); }, []);

  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    text: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
  };

  // 14 days min, 6 months max for the repayment date picker
  const dateConstraints = useMemo(() => {
    const min = new Date(); min.setDate(min.getDate() + 14);
    const max = new Date(); max.setMonth(max.getMonth() + 6);
    return { min: min.toISOString().split('T')[0], max: max.toISOString().split('T')[0] };
  }, []);

  // --- NEW DATA FETCHING ---
  // --- NEW DATA FETCHING (FIXED) ---
  useEffect(() => {
    async function initData() {
      if (!profile?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {

        const { data, error } = await supabase
          .from('stock_holdings')
          .select(`
          quantity,
          securities!inner (
            id, symbol, name, last_price, market_cap, sector,
            logo_url,
            liquidity_grading, collateral_score, collateral_tier, 
            ltv_pct, margin_call_pct, auto_liq_pct, 
            disqualified, disq_reason
          )
        `)
          .eq('user_id', profile.id)
          .neq('securities.exchange', 'MINT');

        if (error) throw error;

        if (data) {
          const formatted = await Promise.all(data.map(async item => {
            const sec = item.securities;

            const { data: prices } = await supabase
              .from('security_prices')
              .select('close_price')
              .eq('security_id', sec.id)
              .order('ts', { ascending: false })
              .limit(7);

            const spark = (prices?.length > 0)
              ? prices.map(p => parseFloat(p.close_price)).reverse()
              : [0, 0, 0, 0, 0, 0, 0];

            const balance = item.quantity * (sec.last_price || 0);

            return {
              id: sec.id,
              name: sec.name,
              code: sec.symbol,
              logo: sec.logo_url,
              sector: sec.sector,
              quantity: item.quantity,
              balance: balance,
              isEligible: !sec.disqualified,
              score: sec.collateral_score || 0,
              ltv: sec.ltv_pct || 0,
              available: !sec.disqualified ? (balance * (sec.ltv_pct || 0)) : 0,
              spark
            };
          }));
          setPortfolioItems(formatted);
        }
      } catch (err) {
        console.error("Initialization error:", err.message);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, [profile?.id]);

  // --- NEW LOGIC CALCULATIONS (Simplified) ---
  const totalPortfolioValue = portfolioItems.reduce((acc, item) => acc + item.balance, 0);
  const totalAvailable = portfolioItems.reduce((acc, item) => acc + item.available, 0);
  const qualifyingCount = portfolioItems.filter(i => i.isEligible).length;

  const filteredItems = useMemo(() => {
    let results = portfolioItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSector = selectedSectors.size === 0 || selectedSectors.has(item.sector);
      return matchesSearch && matchesSector;
    });

    if (selectedSort === "Balance (High)") results.sort((a, b) => b.balance - a.balance);
    if (selectedSort === "Score (High)") results.sort((a, b) => b.score - a.score);
    if (selectedSort === "Market Cap") results.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));

    return results;
  }, [searchQuery, selectedSort, selectedSectors, portfolioItems]);

  const totalSelectedAvailable = selectedAssets.reduce((sum, item) => sum + item.available, 0);
  const totalSelectedBalance = selectedAssets.reduce((sum, item) => sum + item.balance, 0);


  // --- EVENT HANDLERS ---
  const toggleAsset = (asset) => {
    if (!asset.isEligible) return;
    setSelectedAssets(prev => {
      const exists = prev.find(a => a.id === asset.id);
      if (exists) return prev.filter(a => a.id !== asset.id);
      return [...prev, asset];
    });
  };

  const handleOpenPledgeModal = () => {
    if (selectedAssets.length === 0) return;
    setWorkflowStep("idle");
    setPledgeAmount(totalSelectedAvailable * 0.5);
    setIsDetailOpen(true);
  };

  const handlePledgeAll = () => {
    const eligible = portfolioItems.filter(i => i.isEligible);
    if (eligible.length > 0) {
      setSelectedAssets(eligible);
      setWorkflowStep("idle");
      setPledgeAmount(eligible.reduce((sum, i) => sum + i.available, 0));
      setIsDetailOpen(true);
    }
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setWorkflowStep("idle");
    setTimeout(() => {
      setSelectedAssets([]);
      setPinInput("");
      setPledgeAmount("");
    }, 300);
  };

  const toggleDraftSet = (set, setter, val) => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    setter(next);
  };

  // --- SUPABASE TRANSACTION ---
  const initiateSessionAuth = () => {
    // EFT Payout Requirement: Bank must be verified via TruID first
    if (!bankLinked) {
      setWorkflowStep("verify_bank");
      return;
    }
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedPin(randomPin);
    setPinInput("");
    setWorkflowStep("auth");
  };

  const handleConfirmPledge = async () => {
    if (pinInput !== generatedPin) {
      alert("Verification code mismatch. Please type the 6-digit code shown above.");
      setPinInput("");
      return;
    }
    setIsProcessing(true);
    try {
      const principal = parseFloat(pledgeAmount);
      const interestRate = 10.5;

      // Calculate months for the DB constraint
      const start = new Date();
      const end = new Date(repaymentDate);
      const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));

      const { data: loan, error: loanErr } = await supabase.from('loan_application').insert({
        user_id: profile.id,
        principal_amount: principal,
        interest_rate: interestRate,
        amount_repayable: principal * (1 + (interestRate / 100)),
        number_of_months: months,
        first_repayment_date: repaymentDate,
        status: 'approved',
        step_number: 4
      }).select().single();

      if (loanErr) throw loanErr;

      const pledges = selectedAssets.map(item => ({
        user_id: profile.id,
        loan_application_id: loan.id,
        symbol: item.code,
        pledged_quantity: item.quantity,
        pledged_value: item.balance,
        recognised_value: item.available,
        ltv_applied: item.ltv,
        loan_value: principal * (item.balance / totalSelectedBalance)
      }));

      await supabase.from('pbc_collateral_pledges').insert(pledges);

      const { data: account } = await supabase.from('credit_accounts').select('loan_balance, available_credit').eq('user_id', profile.id).single();
      await supabase.from('credit_accounts').update({
        loan_balance: (account?.loan_balance || 0) + principal,
        available_credit: (account?.available_credit || 0) + principal,
        updated_at: new Date().toISOString()
      }).eq('user_id', profile.id);

      setWorkflowStep("success");
    } catch (err) {
      console.error("Pledge failed:", err);
      alert("Transaction failed. Check console for details.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- SUB-PAGE ROUTING ---
  if (view === "history") return <LiquidityHistory onBack={() => setView("main")} fonts={fonts} profile={profile} onTabChange={onTabChange} onOpenNotifications={onOpenNotifications} />;
  if (view === "active") return <ActiveLiquidity onBack={() => setView("main")} fonts={fonts} profile={profile} onTabChange={onTabChange} onOpenNotifications={onOpenNotifications} />;
  if (view === "repay") return <RepayLiquidity onBack={() => setView("main")} fonts={fonts} totalDebt={256450} profile={profile} onTabChange={onTabChange} onOpenNotifications={onOpenNotifications} onLinkBank={onLinkBank} />;
  if (view === "portfolio") return <NewPortfolio onBack={() => setView("main")} fonts={fonts} profile={profile} onTabChange={onTabChange} onOpenNotifications={onOpenNotifications} />;

  return (
    <div className="min-h-screen pb-32 relative overflow-x-hidden text-slate-900">
      {/* Background Layer */}
      <div className="absolute inset-x-0 top-0 -z-10 h-full">
        <div className="absolute inset-x-0 top-0" style={{ height: '100vh', background: 'linear-gradient(180deg, #0d0d12 0%, #100b18 1%, #25173e 4%, #70449d 14%, #f8f0f9 35%, #f8f6fa 100%)' }} />
      </div>

      <div className="px-5 pt-12 pb-8">
        {/* Exact Header Styling */}
        <header className="relative flex items-center justify-between mb-10 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 border border-white/30 text-xs font-semibold uppercase">
            {profile?.firstName?.[0]}{profile?.lastName?.[0]}
          </div>
          <NavigationPill activeTab="credit" onTabChange={onTabChange} />
          <NotificationBell onClick={onOpenNotifications} />
        </header>

        {/* Hero Card Styling */}
        <div className="bg-white/40 backdrop-blur-3xl rounded-[36px] p-6 shadow-xl border border-white/80 mb-8 overflow-hidden relative">
          <div className="flex justify-between items-start mb-6">
            <p className="text-slate-600 text-[12px] leading-tight font-medium max-w-[200px]">Unlock <span className="text-slate-900 font-bold">instant liquidity</span> using your portfolio as collateral.</p>
            <div className="text-6xl font-black text-slate-900/5" style={{ fontFamily: fonts.display }}>{qualifyingCount}</div>
          </div>
          <div className="bg-gradient-to-br from-violet-600 to-purple-900 rounded-[32px] p-6 shadow-xl relative min-h-[160px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <p className="text-white/70 text-[9px] font-black uppercase tracking-[0.2em]">Max Recognized Liquidity</p>
                <button onClick={() => setInfoModal('collateral')}><Info size={11} className="text-white/30" /></button>
              </div>
              <div className="flex items-baseline text-white tracking-tight" style={{ fontFamily: fonts.display }}>
                <span className="text-3xl font-light">R{Math.floor(totalAvailable).toLocaleString()}</span>
                <span className="text-xl font-medium opacity-60">.00</span>
              </div>
            </div>
            <button
              onClick={handlePledgeAll}
              disabled={qualifyingCount === 0}
              className={`w-full text-slate-900 text-[10px] uppercase tracking-[0.2em] font-black py-4 rounded-xl transition-all mt-5 shadow-xl ${qualifyingCount > 0 ? 'bg-white active:scale-[0.97]' : 'bg-white/40 opacity-50 cursor-not-allowed'}`}
            >
              {qualifyingCount > 0 ? "Pledge All Available" : "No Available Liquidity"}
            </button>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-4 gap-3 mb-10 text-[11px] font-medium">
          {[
            { label: "Portfolio", icon: PieChart, onClick: () => setView("portfolio") },
            { label: "Active", icon: FileSignature, onClick: () => setView("active") },
            { label: "Pay", icon: HandCoins, onClick: () => setView("repay") },
            { label: "History", icon: History, onClick: () => setView("history") }
          ].map((action, i) => (
            <button key={i} onClick={action.onClick} className="flex flex-col items-center gap-2 rounded-2xl bg-white px-2 py-3 text-slate-700 shadow-md active:scale-95 border border-slate-100/50">
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-violet-700 bg-violet-50"><action.icon className="h-4 w-4" /></span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {/* Search & Mega Filter Trigger */}
        <div className="flex gap-2 mb-8 px-1">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-11 text-sm focus:outline-none shadow-sm"
            />
          </div>
          <button
            onClick={() => setIsFilterOpen(true)}
            className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-95"
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Eligible Collateral Section */}
        <div className="space-y-4">
          <div className="px-5 mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Eligible Collateral</p>
            <button onClick={() => setInfoModal('score')}><Info className="h-4 w-4 text-slate-300" /></button>
          </div>

          {loading && (
            <div className="text-center py-10 opacity-40 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
              Analyzing Chain Data...
            </div>
          )}

          {!loading && filteredItems.length === 0 && (
            <div className="bg-white/50 backdrop-blur-sm rounded-[36px] p-10 border border-slate-100 text-center">
              <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6 text-slate-300">
                <PieChart size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No Matching Assets</h3>
              <button onClick={() => setView("portfolio")} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                <Plus size={14} className="mr-1 inline" /> Buy Qualifying Shares
              </button>
            </div>
          )}

          {!loading && filteredItems.map((item) => {
            const isSelected = selectedAssets.some(a => a.id === item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleAsset(item)}
                disabled={!item.isEligible}
                className={`relative w-full overflow-hidden bg-white rounded-[28px] p-5 shadow-sm border text-left transition-all ${!item.isEligible ? 'opacity-40 grayscale pointer-events-none' : 'active:scale-[0.98]'} ${isSelected ? 'border-violet-500 bg-violet-50/30' : 'border-slate-100'}`}
              >
                {/* Selection Badge */}
                {isSelected && (
                  <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-violet-600 flex items-center justify-center text-white border-4 border-white shadow-md animate-in zoom-in">
                    <Check size={12} strokeWidth={4} />
                  </div>
                )}

                <div className="flex justify-between items-start mb-4 pr-8">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm">
                      {item.logo ? (
                        <img
                          src={item.logo}
                          alt={item.code}
                          className="h-full w-full object-contain p-1.5"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <span className="font-black text-slate-400 text-[10px] uppercase">
                          {item.code}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.name}</p>
                      <p className="text-xl font-bold text-slate-900" style={{ fontFamily: fonts.display }}>R{item.balance.toLocaleString()}</p>
                    </div>
                  </div>
                  <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full uppercase">Score: {item.score.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Recognized</p>
                    <p className="text-xs font-bold text-slate-900">{formatZar(item.available)}</p>
                  </div>
                  <AssetMiniChart data={item.spark} />
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black text-slate-600 uppercase">LTV {(item.ltv * 100).toFixed(0)}%</span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Action Bar (Multi-Select Control) */}
      <AnimatePresence>
        {selectedAssets.length > 0 && !isDetailOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-0 right-0 z-40 px-6"
          >
            <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between border border-white/10 backdrop-blur-md">
              <div className="pl-2">
                <p className="font-bold text-sm">{selectedAssets.length} Assets Selected</p>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                  Limit: <span className="text-white">{formatZar(totalSelectedAvailable)}</span>
                </p>
              </div>
              <button
                onClick={handleOpenPledgeModal}
                className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-violet-600/30"
              >
                Configure Loan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- INFO MODALS --- */}
      {infoModal && portalTarget && createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 px-6 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-xs shadow-2xl animate-in zoom-in-95">
            <div className="h-12 w-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-6"><HelpCircle size={24} /></div>
            <h3 className="text-lg font-bold text-slate-900 mb-3">{infoModal === 'collateral' ? 'Recognized Collateral' : 'Collateral Score'}</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-8">
              {infoModal === 'collateral' ? "Exposure to a single counter is capped at 45% of total collateral. Any value above this is excluded from lending." :
                "Your score is a weighted combination of Liquidity (40%), Volatility (40%), and Market Cap (20%)."}
            </p>
            <button onClick={() => setInfoModal(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px]">Got it</button>
          </div>
        </div>
        , portalTarget)}

      {/* --- MEGA FILTER SHEET --- */}
      {isFilterOpen && portalTarget && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm px-4 pb-28">
          <button className="absolute inset-0" onClick={() => setIsFilterOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[32px] flex flex-col max-h-[80vh] shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-8 pb-4 pt-8 shrink-0">
              <h3 className="text-lg font-bold text-slate-900">Advanced Filters</h3>
              <button onClick={() => { setDraftSectors(new Set()); setDraftSort("Balance (High)"); }} className="text-xs font-bold text-violet-600">Clear all</button>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Sort By</p>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map(opt => (<button key={opt} onClick={() => setDraftSort(opt)} className={`rounded-full px-4 py-2 text-xs font-bold border transition-all ${draftSort === opt ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}>{opt}</button>))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Industry Sector</p>
                <div className="flex flex-wrap gap-2">
                  {sectorOptions.map(s => (<button key={s} onClick={() => toggleDraftSet(draftSectors, setDraftSectors, s)} className={`rounded-full px-4 py-2 text-xs font-bold border transition-all ${draftSectors.has(s) ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}>{s}</button>))}
                </div>
              </div>
            </div>
            <div className="p-8 border-t border-slate-100 shrink-0">
              <button
                onClick={() => { setSelectedSort(draftSort); setSelectedSectors(new Set(draftSectors)); setIsFilterOpen(false); }}
                className="w-full h-14 bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl active:scale-[0.97]"
              >
                Apply Filter Logic
              </button>
            </div>
          </div>
        </div>
        , portalTarget)}

      {/* --- PLEDGE MODAL (BATCH CONFIGURATION) --- */}
      {isDetailOpen && portalTarget && createPortal(
        <div className="fixed inset-0 z-[150] bg-white flex flex-col animate-in slide-in-from-right duration-300">
          <div className="px-6 pt-12 pb-6 flex items-center justify-between border-b border-slate-100 sticky top-0 bg-white z-10">
            <button onClick={closeDetail} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center active:scale-95 transition-all">
              <ChevronLeft size={20} />
            </button>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Pledge Analysis</h3>
            <div className="w-10" />
          </div>

          <div className="flex-1 overflow-y-auto p-8 pb-32">
            {/* Asset Header with Dynamic Logo */}
            <div className="mb-8 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm">
                  {selectedAssets.length === 1 && selectedAssets[0].logo ? (
                    <img src={selectedAssets[0].logo} alt="logo" className="h-full w-full object-contain p-2" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                      <Zap size={24} />
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1" style={{ fontFamily: fonts.display }}>
                    {selectedAssets.length === 1 ? selectedAssets[0].name : "Consolidated Pool"}
                  </h1>
                  <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                    Pledging {selectedAssets.length} Strategic Assets
                  </p>
                </div>
              </div>
              {/* Quality Score Badge */}
              <div className="h-14 w-14 rounded-full border-4 border-violet-600 flex flex-col items-center justify-center bg-white shadow-lg">
                <span className="text-[8px] font-black text-slate-400 uppercase leading-none mb-0.5">Score</span>
                <span className="font-black text-xs text-violet-600">
                  {(selectedAssets.reduce((sum, a) => sum + a.score, 0) / selectedAssets.length).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Data-Driven Liquidation Safety Bar [cite: 18, 33] */}
            <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100 mb-10 shadow-inner">
              <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Liquidation Safety Bar</p>
                <span className={`text-[10px] font-bold uppercase ${(pledgeAmount / totalSelectedBalance) < (selectedAssets[0]?.marginCall || 0.65)
                  ? 'text-emerald-600' : 'text-rose-500'
                  }`}>
                  {(pledgeAmount / totalSelectedBalance) < (selectedAssets[0]?.marginCall || 0.65) ? 'Secure Range' : 'Critical Risk'}
                </span>
              </div>
              <div className="relative h-4 w-full bg-slate-200 rounded-full overflow-hidden flex">
                {/* Emerald Zone: Safe up to Margin Call  */}
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${(selectedAssets[0]?.marginCall || 0.65) * 100}%` }}
                />
                {/* Amber Zone: Warning up to Auto-Liquidation  */}
                <div
                  className="h-full bg-amber-400"
                  style={{ width: `${((selectedAssets[0]?.autoLiq || 0.70) - (selectedAssets[0]?.marginCall || 0.65)) * 100}%` }}
                />
                {/* Rose Zone: Liquidation Threshold  */}
                <div className="h-full bg-rose-500 flex-1" />

                {/* User's Current Needle */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl transition-all duration-300 ring-2 ring-black/5"
                  style={{ left: `${(pledgeAmount / totalSelectedBalance) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-3 px-1">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Safe Zone</span>
                <span className="text-[8px] font-bold text-rose-400 uppercase tracking-tighter text-right">Liquidation</span>
              </div>
            </div>

            <div className="text-center mb-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Max Borrowing Capacity</p>
              <p className="text-4xl font-extralight text-slate-900 tracking-tight" style={{ fontFamily: fonts.display }}>
                {formatZar(totalSelectedAvailable)}
              </p>
            </div>

            <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-lg mb-8">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Requested Capital</span>
                <div className="text-right">
                  <input
                    type="number"
                    value={pledgeAmount}
                    onChange={(e) => setPledgeAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-32 bg-slate-50 px-4 py-2 rounded-xl text-right font-bold text-slate-900 outline-none mb-1"
                  />
                  <p className="text-[9px] font-bold text-violet-600 uppercase">Usage: {((pledgeAmount / totalSelectedBalance) * 100).toFixed(1)}% of selection</p>
                </div>
              </div>
              <input
                type="range"
                min="1000"
                max={totalSelectedAvailable}
                step="1000"
                value={pledgeAmount}
                onChange={(e) => setPledgeAmount(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none accent-violet-600 cursor-pointer"
              />
            </div>

            <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Debt Ratio Per Counter</p>
              <div className="space-y-4">
                {selectedAssets.map(asset => {
                  const weight = (asset.balance / totalSelectedBalance);
                  return (
                    <div key={asset.id} className="flex justify-between text-sm items-center">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-violet-400" />
                        <span className="text-slate-600 font-bold">{asset.code}</span>
                      </div>
                      <span className="font-bold text-slate-900">{formatZar(pledgeAmount * weight)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border-t border-slate-100 pb-28">
            <button
              disabled={!pledgeAmount || pledgeAmount <= 0}
              onClick={() => setWorkflowStep("contract")}
              className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all disabled:opacity-30"
            >
              Review Final Agreement
            </button>
          </div>
        </div>
        , portalTarget)}

      {/* --- DRAWDOWN FLOW MODALS --- */}
      {workflowStep !== "idle" && portalTarget && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md px-6 pb-20">

          {workflowStep === "contract" && (
            <div className="bg-white w-full max-w-sm rounded-[36px] p-8 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center"><FileText size={20} /></div>
                <h3 className="text-xl font-bold text-slate-900">Legal Review</h3>
              </div>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between pb-3 border-b border-slate-50 text-sm">
                  <span className="text-slate-500 font-medium">Lending Interest</span>
                  <span className="font-bold text-slate-900">10.5% p.a.</span>
                </div>
                <div className="bg-slate-900 rounded-2xl p-4 flex justify-between items-center text-white">
                  <span className="text-[10px] font-black opacity-40 uppercase">Interest Cost</span>
                  <span className="font-bold">{formatZar((pledgeAmount * 0.105) / 12)} / mo</span>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">First Repayment Date</label>
                  <input
                    type="date"
                    min={dateConstraints.min}
                    max={dateConstraints.max}
                    value={repaymentDate}
                    onChange={(e) => setRepaymentDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 text-slate-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-violet-500 font-bold transition-all"
                  />
                </div>
              </div>
              <label className="flex items-start gap-3 mb-8 cursor-pointer group">
                <div className={`mt-1 h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-all ${disclaimerChecked ? 'bg-violet-600 border-violet-600' : 'bg-white border-slate-200'}`}>
                  {disclaimerChecked && <Check size={14} className="text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={disclaimerChecked} onChange={() => setDisclaimerChecked(!disclaimerChecked)} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-tight">
                  I authorize the pledge of {selectedAssets.length} assets and understand the liquidation risks.
                </span>
              </label>
              <div className="space-y-2">
                <button
                  disabled={!disclaimerChecked || !repaymentDate}
                  onClick={initiateSessionAuth}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-30"
                >
                  Authorize Capital
                </button>
                <button
                  onClick={closeDetail}
                  className="w-full py-2 mt-2 text-[9px] font-black text-rose-500 uppercase tracking-[0.2em] hover:bg-rose-50 rounded-xl transition-all"
                >
                  Cancel Application
                </button>
                <button onClick={() => setWorkflowStep("idle")} className="w-full py-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Go Back</button>
              </div>
            </div>
          )}

          {workflowStep === "setup_pin" && (
            <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl animate-in zoom-in-95">
              <div className="h-16 w-16 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-6"><ShieldCheck size={28} /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Create Security PIN</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Set a 5-digit code for loans</p>
              <input type="password" maxLength={5} value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="00000" className="w-full h-14 bg-slate-50 rounded-2xl text-center text-2xl font-black tracking-[0.5em] mb-8 outline-none border border-slate-100" />
              <button onClick={handleSetupPin} disabled={newPin.length !== 5 || isProcessing} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Secure My Account</button>
              <button
                onClick={closeDetail}
                className="w-full py-2 mt-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]"
              >
                Exit & Cancel
              </button>
            </div>
          )}

          {workflowStep === "verify_bank" && (
            <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl animate-in zoom-in-95">
              <div className="h-16 w-16 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-6"><HandCoins size={28} /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Verify Bank Account</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">TruID Verification Required for EFT Payouts</p>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                To receive funds via EFT, Mint requires a secure link to your bank account via **TruID**. This ensures capital is disbursed only to your personal verified account.
              </p>
              <button
                onClick={() => {
                  onLinkBank();
                  closeDetail();
                }}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
              >
                <Zap size={14} fill="currentColor" />
                Verify via TruID Connect
              </button>
              <button
                onClick={() => setWorkflowStep("contract")}
                className="w-full py-2 mt-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]"
              >
                Go Back to Review
              </button>
            </div>
          )}

          {workflowStep === "auth" && (
            <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl animate-in zoom-in-95">
              <div className="h-16 w-16 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-6"><Lock size={28} /></div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Security Verification</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Enter the code shown below</p>

              <div className="bg-slate-900 rounded-2xl py-4 mb-6">
                <span className="text-3xl font-black tracking-[0.5em] text-white ml-2">{generatedPin}</span>
              </div>

              <input
                type="text"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="TYPE CODE"
                className="w-full h-14 bg-slate-50 rounded-2xl text-center text-2xl font-black tracking-[0.2em] mb-8 outline-none border border-slate-100 focus:border-violet-500"
              />

              <button onClick={handleConfirmPledge} disabled={pinInput.length !== 6 || isProcessing} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">
                {isProcessing ? "Verifying..." : "Confirm Release"}
              </button>
              <button onClick={() => setWorkflowStep("contract")} className="w-full py-2 mt-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Go Back</button>
            </div>
          )}

          {workflowStep === "success" && (
            <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl animate-in zoom-in-95">
              <div className="h-20 w-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-inner"><Check size={40} strokeWidth={3} /></div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Transaction Final</h3>
              <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100 shadow-inner">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">New Credit Balance</p>
                <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: fonts.display }}>{formatZar(pledgeAmount)}</h2>
              </div>
              <button onClick={closeDetail} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">Return to Wealth</button>
            </div>
          )}
        </div>
        , portalTarget)}
    </div>
  );
};

export default InstantLiquidity;