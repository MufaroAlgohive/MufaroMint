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
import FamilyDropdown from "../../components/FamilyDropdown";
import { supabase } from "../../lib/supabase";
import { useRequiredActions } from "../../lib/useRequiredActions";
import LiquidityFlow from "./LiquidityFlow";
import LiquidityHistory from "./LiquidityHistory";
import ActiveLiquidity from "./ActiveLiquidity";
import RepayLiquidity from "./RepayLiquidity";
import NewPortfolio from "../NewPortfolioPage.jsx";

// --- LIB ---
import { LendingEngine } from "../../lib/LendingEngine";

// --- CONSTANTS ---
const sortOptions = ["Balance (High)", "Score (High)", "Market Cap", "Dividend Yield"];
const sectorOptions = ["Technology", "Financials", "Consumer", "Healthcare", "Energy", "Materials"];
const normalizeLoanType = (value, fallback = "secured") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "secured" || normalized === "unsecured") return normalized;
  return fallback;
};

// --- MINI CHART COMPONENT ---
const AssetMiniChart = ({ data, color = "#7c3aed" }) => (
  <div className="h-8 w-16">
    <ResponsiveContainer width="100%" height="100%" minHeight={32}>
      <LineChart data={data.map((v, i) => ({ v, i }))}>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const InstantLiquidity = ({ profile, onOpenNotifications, onTabChange, onLinkBank, onBack }) => {
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
  const [workflowStep, setWorkflowStep] = useState("idle");
  const [isProcessing, setIsProcessing] = useState(false);

  // --- USER INPUT STATE ---
  const [pledgeAmount, setPledgeAmount] = useState(0);
  const [pinInput, setPinInput] = useState("");
  const [activeLoanId, setActiveLoanId] = useState(null);
  const [nextSalaryDate, setNextSalaryDate] = useState(new Date().toISOString().split('T')[0]);
  const [termMonths, setTermMonths] = useState(1);

  useEffect(() => { setPortalTarget(document.body); }, []);

  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    text: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
  };

  // --- DATA FETCHING ---
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

            const balance = (item.quantity * (sec.last_price || 0)) / 100;

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
              spark,
              marginCall: sec.margin_call_pct,
              autoLiq: sec.auto_liq_pct
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

  // --- CALCULATIONS ---
  const totalPortfolioValue = useMemo(() => portfolioItems.reduce((acc, item) => acc + item.balance, 0), [portfolioItems]);
  const totalAvailable = useMemo(() => portfolioItems.reduce((acc, item) => acc + item.available, 0), [portfolioItems]);
  const qualifyingCount = useMemo(() => portfolioItems.filter(i => i.isEligible).length, [portfolioItems]);

  const filteredItems = useMemo(() => {
    let results = portfolioItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSector = selectedSectors.size === 0 || selectedSectors.has(item.sector);
      return matchesSearch && matchesSector;
    });
    if (selectedSort === "Balance (High)") results.sort((a, b) => b.balance - a.balance);
    if (selectedSort === "Score (High)") results.sort((a, b) => b.score - a.score);
    return results;
  }, [searchQuery, selectedSort, selectedSectors, portfolioItems]);

  const totalSelectedAvailable = selectedAssets.reduce((sum, item) => sum + item.available, 0);
  const totalSelectedBalance = selectedAssets.reduce((sum, item) => sum + item.balance, 0);

  // --- HANDLERS ---
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

  const closeDetail = () => {
    setIsDetailOpen(false);
    setWorkflowStep("idle");
    setTimeout(() => {
      setSelectedAssets([]);
      setPledgeAmount(0);
    }, 300);
  };

  const toggleDraftSet = (set, setter, val) => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    setter(next);
  };

  const handleConfirmPledge = async () => {
    setIsProcessing(true);
    try {
      const principal = parseFloat(pledgeAmount);
      const engine = new LendingEngine({
        loanType: 'securitised',
        principal: principal,
        originationDate: new Date(),
        nextSalaryDate: nextSalaryDate,
        termMonths: termMonths
      });
      const calculation = engine.calculateLoan();

      const { data: loan, error: loanErr } = await supabase.from('loan_application').insert({
        user_id: profile.id,
        principal_amount: principal,
        interest_rate: engine.getMonthlyRate(),
        amount_repayable: calculation.totalRepayable,
        number_of_months: termMonths,
        first_repayment_date: calculation.paymentDates[0].toISOString(),
        status: 'in_progress',
        Secured_Unsecured: normalizeLoanType('secured'),
        step_number: 1
      }).select().single();

      if (loanErr) throw loanErr;
      setActiveLoanId(loan.id);
      const { error: historyErr } = await supabase
        .from('credit_transactions_history')
        .insert({
          user_id: profile.id,
          loan_application_id: loan.id,
          loan_type: normalizeLoanType('secured'),
          transaction_type: 'application_created',
          direction: 'credit',
          amount: Number(principal),
          occurred_at: new Date().toISOString(),
          description: 'Secured loan application created',
          metadata: {
            number_of_months: termMonths,
            first_repayment_date: calculation.paymentDates?.[0]?.toISOString?.() || null,
          },
        });

      if (historyErr && historyErr.code !== '23505') {
        console.warn('Failed to create secured credit history row:', historyErr.message || historyErr);
      }

      const pledges = selectedAssets.map(item => ({
        user_id: profile.id,
        loan_application_id: loan.id,
        security_id: item.id,
        symbol: item.code,
        pledged_quantity: item.quantity,
        pledged_value: item.balance,
        recognised_value: item.available,
        ltv_applied: item.ltv,
        loan_value: principal * (item.balance / totalSelectedBalance)
      }));

      // The following tables are protected by RLS and cannot be written to directly from the client.
      // In a production environment, these should be handled via a server-side API or RPC function.
      /*
      await supabase.from('pbc_collateral_pledges').insert(pledges);

      // Upsert credit account info
      const { data: account } = await supabase.from('credit_accounts')
        .select('loan_balance, available_credit')
        .eq('user_id', profile.id)
        .maybeSingle();

      const newLoanBalance = (account?.loan_balance || 0) + principal;
      const newAvailableCredit = (account?.available_credit || 0) + principal;

      await supabase.from('credit_accounts').upsert({
        user_id: profile.id,
        loan_balance: newLoanBalance,
        available_credit: newAvailableCredit,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      */

      setWorkflowStep("liquidity_flow");
    } catch (err) {
      console.error("Pledge failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- ROUTING ---
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
        {/* Header - Combined Layout and Features */}
        <header className="relative flex items-center justify-between mb-8 text-white">
          <div className="flex items-center gap-4">
            <FamilyDropdown
              profile={profile}
              userId={profile?.id}
              initials={`${profile?.firstName?.[0] || ""}${profile?.lastName?.[0] || ""}`.toUpperCase()}
              avatarUrl={profile?.avatarUrl}
              onOpenFamily={() =>
                window.dispatchEvent(new CustomEvent("navigate-within-app", { detail: { page: "family" } }))
              }
              onSelectMember={(member) =>
                window.dispatchEvent(new CustomEvent("navigate-within-app", { detail: { page: "memberPortfolio", member } }))
              }
            />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Welcome back, {profile?.firstName}</p>
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: fonts.display }}>Liquidity Hub</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NavigationPill activeTab="credit" onTabChange={onTabChange} />
            <NotificationBell onClick={onOpenNotifications} />
          </div>
        </header>

        {/* Portfolio Summary Card - Layout from Index.tsx, Style from InstantLiquidity */}
        <div className="bg-white/40 backdrop-blur-3xl rounded-[36px] p-6 shadow-xl border border-white/80 mb-6 relative overflow-hidden">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Portfolio Value</p>
          <div className="text-3xl font-light text-slate-900 mb-6" style={{ fontFamily: fonts.display }}>
            {loading ? "..." : formatZar(totalPortfolioValue)}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-900/5">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Max Liquidity</p>
                <button onClick={() => setInfoModal('collateral')}><Info size={10} className="text-slate-300" /></button>
              </div>
              <p className="text-lg font-bold text-violet-700">{formatZar(totalAvailable)}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1">Eligible Assets</p>
              <p className="text-lg font-bold text-slate-900">{qualifyingCount} / {portfolioItems.length}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions - 2 Column Grid from Index.tsx */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { label: "Portfolio", sub: "View Holdings", icon: PieChart, onClick: () => setView("portfolio"), color: "bg-blue-50 text-blue-600" },
            { label: "Active", sub: "Manage Loans", icon: FileSignature, onClick: () => setView("active"), color: "bg-emerald-50 text-emerald-600" },
            { label: "Pay", sub: "Repay Capital", icon: HandCoins, onClick: () => setView("repay"), color: "bg-violet-50 text-violet-600" },
            { label: "History", sub: "Past Actions", icon: History, onClick: () => setView("history"), color: "bg-slate-50 text-slate-600" }
          ].map((action, i) => (
            <button key={i} onClick={action.onClick} className="flex items-center gap-4 p-4 rounded-[28px] bg-white shadow-sm border border-slate-100 active:scale-95 transition-all text-left">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${action.color}`}><action.icon size={18} /></span>
              <div>
                <p className="text-xs font-bold text-slate-900">{action.label}</p>
                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">{action.sub}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Active Loan Card - Conditional Layout from Index.tsx */}
        {activeLoanId && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Current Facility</h2>
              <button onClick={() => setView("active")} className="text-[10px] font-bold text-violet-600 flex items-center gap-1">
                Manage <ArrowRight size={12} />
              </button>
            </div>
            <div className="bg-slate-900 rounded-[32px] p-5 text-white shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-mono text-white/40">#{activeLoanId.slice(0, 8)}</span>
                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">In Progress</span>
              </div>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                <div>
                  <p className="text-[8px] text-white/40 uppercase font-black">Principal</p>
                  <p className="text-sm font-bold">{formatZar(pledgeAmount)}</p>
                </div>
                <div>
                  <p className="text-[8px] text-white/40 uppercase font-black">Status</p>
                  <p className="text-sm font-bold">Awaiting Sign</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filter Header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Eligible Collateral</h2>
          <div className="flex gap-2">
            <button onClick={() => setIsFilterOpen(true)} className="h-8 w-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm"><SlidersHorizontal size={14} /></button>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-2xl py-3.5 pl-11 text-xs focus:outline-none shadow-sm"
          />
        </div>

        {/* Holdings List - Layout from Index.tsx (List Items) */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-10 opacity-40 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Analyzing Portfolio...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs italic">No matching assets found</div>
          ) : filteredItems.map((item) => {
            const isSelected = selectedAssets.some(a => a.id === item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleAsset(item)}
                disabled={!item.isEligible}
                className={`relative w-full flex items-center justify-between bg-white rounded-[24px] p-4 shadow-sm border transition-all ${!item.isEligible ? 'opacity-40 grayscale pointer-events-none' : 'active:scale-[0.98]'} ${isSelected ? 'border-violet-500 bg-violet-50/30' : 'border-slate-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100">
                    {item.logo ? <img src={item.logo} alt={item.code} className="h-full w-full object-contain p-1.5" /> : <span className="font-black text-slate-300 text-[10px]">{item.code}</span>}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900">{item.code}</p>
                    <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">{item.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <AssetMiniChart data={item.spark} />
                  <div className="text-right min-w-[80px]">
                    <p className="text-xs font-bold text-slate-900">{formatZar(item.balance)}</p>
                    <p className="text-[9px] font-black text-emerald-500 uppercase">Limit {formatZar(item.available)}</p>
                  </div>
                  {isSelected ? <div className="h-5 w-5 rounded-full bg-violet-600 flex items-center justify-center text-white"><Check size={12} strokeWidth={4} /></div> : <ChevronRight className="h-4 w-4 text-slate-200" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Floating Multi-Select Bar */}
      <AnimatePresence>
        {selectedAssets.length > 0 && !isDetailOpen && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-24 left-0 right-0 z-40 px-6">
            <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between border border-white/10 backdrop-blur-md">
              <div className="pl-2">
                <p className="font-bold text-sm">{selectedAssets.length} Selected</p>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Cap: {formatZar(totalSelectedAvailable)}</p>
              </div>
              <button onClick={handleOpenPledgeModal} className="bg-violet-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-lg shadow-violet-600/30">Configure Loan</button>
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
              <button onClick={() => { setSelectedSort(draftSort); setSelectedSectors(new Set(draftSectors)); setIsFilterOpen(false); }} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl active:scale-[0.97]">Apply Filter Logic</button>
            </div>
          </div>
        </div>
        , portalTarget)}

      {/* --- PLEDGE MODAL --- */}
      {isDetailOpen && portalTarget && createPortal(
        <div className="fixed inset-0 z-[150] bg-white flex flex-col animate-in slide-in-from-right duration-300">
          <div className="px-6 pt-12 pb-6 flex items-center justify-between border-b border-slate-100 sticky top-0 bg-white z-10">
            <button onClick={closeDetail} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center active:scale-95 transition-all"><ChevronLeft size={20} /></button>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Pledge Analysis</h3>
            <div className="w-10" />
          </div>

          <div className="flex-1 overflow-y-auto p-8 pb-32">
            <div className="mb-8 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-lg"><Zap size={24} /></div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1" style={{ fontFamily: fonts.display }}>{selectedAssets.length === 1 ? selectedAssets[0].name : "Consolidated Pool"}</h1>
                  <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Pledging {selectedAssets.length} Strategic Assets</p>
                </div>
              </div>
            </div>

            <div className="text-center mb-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Max Borrowing Capacity</p>
              <p className="text-4xl font-extralight text-slate-900 tracking-tight" style={{ fontFamily: fonts.display }}>{formatZar(totalSelectedAvailable)}</p>
            </div>

            {/* Input & Range */}
            <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-lg mb-8">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Requested Capital</span>
                <input type="number" value={pledgeAmount} onChange={(e) => setPledgeAmount(e.target.value)} className="w-32 bg-slate-50 px-4 py-2 rounded-xl text-right font-bold text-slate-900 outline-none" />
              </div>
              <input type="range" min="0" max={totalSelectedAvailable || 1000} step={100} value={pledgeAmount || 0} onChange={(e) => setPledgeAmount(Number(e.target.value))} className="w-full h-2 bg-slate-100 rounded-lg appearance-none accent-slate-900 cursor-pointer mb-2" />
            </div>

            {/* NCR Schedule */}
            <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-lg mb-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Repayment Strategy</p>
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase mb-2 block">Salary Date</label>
                  <input type="date" value={nextSalaryDate} onChange={(e) => setNextSalaryDate(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl font-bold text-xs text-slate-900" />
                </div>
                <div className="flex-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase mb-2 block">Term (Months)</label>
                  <div className="flex bg-slate-50 rounded-xl p-1">
                    {[1, 2, 3].map(m => (
                      <button key={m} onClick={() => setTermMonths(m)} className={`flex-1 py-2 text-xs font-black rounded-lg ${termMonths === m ? "bg-slate-900 text-white shadow-md" : "text-slate-400"}`}>{m}</button>
                    ))}
                  </div>
                </div>
              </div>

              {(() => {
                const engine = new LendingEngine({ loanType: 'securitised', principal: pledgeAmount || 0, originationDate: new Date(), nextSalaryDate: nextSalaryDate, termMonths: termMonths });
                const calc = engine.calculateLoan();
                return (
                  <div className="bg-slate-900 rounded-2xl p-5 text-white">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                      <span className="text-[9px] font-bold uppercase text-white/40">Estimated Installment</span>
                      <span className="text-xl font-black">{formatZar(calc.installmentAmount)}</span>
                    </div>
                    <div className="space-y-2 text-[10px] text-white/40">
                      <div className="flex justify-between"><span>Fees</span><span className="text-white">{formatZar(calc.initiationFee + calc.totalServiceFees)}</span></div>
                      <div className="flex justify-between"><span>Interest</span><span className="text-white">{formatZar(calc.totalInterest)}</span></div>
                      <div className="flex justify-between text-xs pt-2 mt-2 border-t border-white/10 font-black uppercase text-violet-400"><span>Total Repayable</span><span>{formatZar(calc.totalRepayable)}</span></div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="p-6 bg-white border-t border-slate-100 pb-28">
            <button disabled={!pledgeAmount || pledgeAmount <= 0} onClick={handleConfirmPledge} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 disabled:opacity-30">Review & Sign Agreement</button>
          </div>
        </div>
        , portalTarget)}

      {/* --- DRAWDOWN FLOW --- */}
      {workflowStep !== "idle" && portalTarget && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md px-6 pb-20">
          {workflowStep === "liquidity_flow" && (
            <div className="w-full max-w-4xl max-h-screen overflow-y-auto no-scrollbar animate-in zoom-in-95">
              <LiquidityFlow principal={pledgeAmount} profile={profile} loanId={activeLoanId} termMonths={termMonths} salaryDate={nextSalaryDate} selectedAssets={selectedAssets} onComplete={() => setWorkflowStep("success")} onCancel={() => setWorkflowStep("idle")} />
            </div>
          )}
          {workflowStep === "success" && (
            <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl animate-in zoom-in-95">
              <div className="h-20 w-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-6"><Check size={40} strokeWidth={3} /></div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Transaction Final</h3>
              <div className="bg-slate-50 rounded-2xl p-6 mb-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">New Credit Balance</p>
                <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: fonts.display }}>{formatZar(pledgeAmount)}</h2>
              </div>
              <button onClick={closeDetail} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">Return to Wealth</button>
            </div>
          )}
        </div>
        , portalTarget)}
    </div>
  );
};

export default InstantLiquidity;