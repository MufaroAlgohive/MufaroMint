import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Zap, 
  Info, 
  Search, 
  SlidersHorizontal, 
  Plus, 
  FileSignature, 
  HandCoins, 
  History,
  Check,
  ChevronLeft,
  X,
  FileText,
  Lock,
  ChevronRight,
  Star,
  ShieldCheck,
  PieChart,
  HelpCircle
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { formatZar } from "../../lib/formatCurrency";
import NotificationBell from "../../components/NotificationBell";
import NavigationPill from "../../components/NavigationPill";
import { supabase } from "../../lib/supabase";

// --- IMPORT SUB-PAGES ---
import LiquidityHistory from "./LiquidityHistory";
import ActiveLiquidity from "./ActiveLiquidity";
import RepayLiquidity from "./RepayLiquidity";
import NewPortfolio from "../NewPortfolioPage";

// --- CONSTANTS FOR MEGA FILTER ---
const sortOptions = ["Balance (High)", "Score (High)", "Market Cap", "Dividend Yield"];
const riskOptions = ["Low risk", "Balanced", "Growth", "High risk"];
const sectorOptions = ["Technology", "Financials", "Consumer", "Healthcare", "Energy", "Materials"];
const exchangeOptions = ["JSE", "NYSE", "NASDAQ"];

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

const InstantLiquidity = ({ profile, onOpenNotifications, onTabChange }) => {
  const [view, setView] = useState("main");
  const [searchQuery, setSearchQuery] = useState("");
  const [portalTarget, setPortalTarget] = useState(null);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("Balance (High)");
  const [selectedTypes, setSelectedTypes] = useState(new Set());
  const [selectedRisks, setSelectedRisks] = useState(new Set());
  const [selectedSectors, setSelectedSectors] = useState(new Set());
  const [selectedExchanges, setSelectedExchanges] = useState(new Set());

  const [draftSort, setDraftSort] = useState("Balance (High)");
  const [draftTypes, setDraftTypes] = useState(new Set());
  const [draftRisks, setDraftRisks] = useState(new Set());
  const [draftSectors, setDraftSectors] = useState(new Set());
  const [draftExchanges, setDraftExchanges] = useState(new Set());

  const [infoModal, setInfoModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [workflowStep, setWorkflowStep] = useState("idle");
  const [isProcessing, setIsProcessing] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [repaymentDate, setRepaymentDate] = useState("");

  const [userPin, setUserPin] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [newPin, setNewPin] = useState("");

  useEffect(() => { setPortalTarget(document.body); }, []);

  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    text: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
  };

  const dateConstraints = useMemo(() => {
    const minDateObj = new Date();
    minDateObj.setDate(minDateObj.getDate() + 14);
    const maxDateObj = new Date();
    maxDateObj.setMonth(maxDateObj.getMonth() + 6);
    return {
      min: minDateObj.toISOString().split('T')[0],
      max: maxDateObj.toISOString().split('T')[0]
    };
  }, []);

  const [portfolioItems, setPortfolioItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initData() {
      if (!profile?.id) return;
      setLoading(true);

      const { data: profData } = await supabase
        .from('profiles')
        .select('pin')
        .eq('id', profile.id)
        .single();
      setUserPin(profData?.pin);

      const { data, error } = await supabase
        .from('stock_holdings')
        .select(`
          quantity,
          securities!inner (
            id, symbol, name, last_price, market_cap,
            pbc_screen_results (
              eligible, score_composite, ltv, margin_call, auto_liquidation
            )
          )
        `)
        .eq('user_id', profile.id);

      if (error) {
        console.error("Error fetching portfolio:", error);
      } else {
        const formatted = await Promise.all(data.map(async item => {
          const sec = item.securities;
          const risk = sec.pbc_screen_results?.[0];
          
          const { data: priceHistory } = await supabase
            .from('security_prices')
            .select('close_price')
            .eq('security_id', sec.id)
            .order('ts', { ascending: false })
            .limit(7);

          const spark = (priceHistory && priceHistory.length > 0) 
            ? priceHistory.map(p => parseFloat(p.close_price)).reverse()
            : [0, 0, 0, 0, 0, 0, 0];

          return {
            id: sec.id,
            name: sec.name,
            code: sec.symbol,
            quantity: item.quantity,
            balance: item.quantity * (sec.last_price || 0),
            isEligible: risk?.eligible || false,
            score: risk?.score_composite || 0,
            ltv: risk?.ltv || 0,
            marginCall: risk?.margin_call || 0,
            liquidation: risk?.auto_liquidation || 0,
            marketCap: sec.market_cap,
            spark
          };
        }));
        setPortfolioItems(formatted);
      }
      setLoading(false);
    }
    initData();
  }, [profile?.id]);

  const totalPortfolioValue = portfolioItems.reduce((acc, item) => acc + item.balance, 0);
  const maxPerCounter = totalPortfolioValue * 0.45;

  const enrichedItems = useMemo(() => portfolioItems.map(item => {
    const recognizedValue = Math.min(item.balance, maxPerCounter);
    const available = item.isEligible ? recognizedValue * item.ltv : 0;
    return { ...item, recognizedValue, available, isCapped: item.balance > maxPerCounter };
  }), [portfolioItems, maxPerCounter]);

  const totalAvailable = enrichedItems.reduce((acc, item) => acc + item.available, 0);
  const qualifyingCount = enrichedItems.filter(i => i.isEligible).length;

  const filteredItems = useMemo(() => {
    let results = enrichedItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedTypes.size === 0 || selectedTypes.has(item.type);
      const matchesRisk = selectedRisks.size === 0 || selectedRisks.has(item.risk_level);
      const matchesSector = selectedSectors.size === 0 || selectedSectors.has(item.sector);
      const matchesExchange = selectedExchanges.size === 0 || selectedExchanges.has(item.exchange);
      return matchesSearch && matchesType && matchesRisk && matchesSector && matchesExchange;
    });

    if (selectedSort === "Balance (High)") results.sort((a, b) => b.balance - a.balance);
    if (selectedSort === "Score (High)") results.sort((a, b) => b.score - a.score);
    if (selectedSort === "Market Cap") results.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
    if (selectedSort === "Dividend Yield") results.sort((a, b) => (b.dividendYield || 0) - (a.dividendYield || 0));
    
    return results;
  }, [searchQuery, selectedSort, selectedTypes, selectedRisks, selectedSectors, selectedExchanges, enrichedItems]);

  const handleConfirmPledge = async () => {
    if (pinInput !== userPin) {
      alert("Incorrect Security PIN.");
      setPinInput("");
      return;
    }
    setIsProcessing(true);
    try {
        const principal = parseFloat(pledgeAmount);
        const interestCost = (principal * 0.105) / 12;
        const { data: loan, error: loanErr } = await supabase
            .from('loan_application')
            .insert({
                user_id: profile.id,
                principal_amount: principal,
                interest_rate: 10.5,
                amount_repayable: principal + interestCost,
                status: 'approved',
                first_repayment_date: repaymentDate
            })
            .select().single();
        if (loanErr) throw loanErr;
        await supabase.from('pbc_collateral_pledges').insert({
            user_id: profile.id,
            loan_application_id: loan.id,
            symbol: selectedItem === 'all' ? 'PORTFOLIO_AGG' : selectedItem.code,
            pledged_quantity: selectedItem === 'all' ? 0 : selectedItem.quantity,
            pledged_value: selectedItem === 'all' ? totalPortfolioValue : selectedItem.balance,
            recognised_value: selectedItem === 'all' ? totalAvailable : selectedItem.recognizedValue,
            ltv_applied: selectedItem === 'all' ? 0.5 : selectedItem.ltv,
            loan_value: principal
        });
        const { data: account } = await supabase.from('credit_accounts').select('loan_balance, available_credit').eq('user_id', profile.id).single();
        await supabase.from('credit_accounts').update({
            loan_balance: (account?.loan_balance || 0) + principal,
            available_credit: (account?.available_credit || 0) + principal,
            updated_at: new Date().toISOString()
        }).eq('user_id', profile.id);
        setWorkflowStep("success");
    } catch (err) {
        console.error("Auth failed:", err.message);
        alert("Transaction failed.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleSetupPin = async () => {
    if (newPin.length !== 5) return;
    setIsProcessing(true);
    const { error } = await supabase.from('profiles').update({ pin: newPin }).eq('id', profile.id);
    if (!error) { setUserPin(newPin); setWorkflowStep("auth"); }
    setIsProcessing(false);
  };

  const handleOpenDetail = (item) => {
    if (item === 'all' && qualifyingCount === 0) return;
    if (item !== 'all' && !item.isEligible) return;
    setSelectedItem(item);
    setIsDetailOpen(true);
    setWorkflowStep("idle");
    setPledgeAmount("");
    setDisclaimerChecked(false);
    setRepaymentDate("");
  };

  const closeDetail = () => { setIsDetailOpen(false); setTimeout(() => setSelectedItem(null), 300); };

  const portfolioUsagePercent = useMemo(() => {
      const val = parseFloat(pledgeAmount) || 0;
      return totalPortfolioValue > 0 ? ((val / totalPortfolioValue) * 100).toFixed(1) : 0;
  }, [pledgeAmount, totalPortfolioValue]);

  const openFilter = () => {
    setDraftSort(selectedSort); setDraftTypes(new Set(selectedTypes)); setDraftRisks(new Set(selectedRisks));
    setDraftSectors(new Set(selectedSectors)); setDraftExchanges(new Set(selectedExchanges));
    setIsFilterOpen(true);
  };

  const applyMegaFilters = () => {
    setSelectedSort(draftSort); setSelectedTypes(new Set(draftTypes)); setSelectedRisks(new Set(draftRisks));
    setSelectedSectors(new Set(draftSectors)); setSelectedExchanges(new Set(draftExchanges));
    setIsFilterOpen(false);
  };

  const toggleDraftSet = (set, setter, val) => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    setter(next);
  };

  const clearAllFilters = () => {
    setDraftSort("Balance (High)"); setDraftTypes(new Set()); setDraftRisks(new Set());
    setDraftSectors(new Set()); setDraftExchanges(new Set());
  };

  if (view === "history") return <LiquidityHistory onBack={() => setView("main")} fonts={fonts} />;
  if (view === "active") return <ActiveLiquidity onBack={() => setView("main")} fonts={fonts} />;
  if (view === "repay") return <RepayLiquidity onBack={() => setView("main")} fonts={fonts} totalDebt={256450} />;
  if (view === "portfolio") return <NewPortfolio onBack={() => setView("main")} fonts={fonts} />;

  return (
    <div className="min-h-screen pb-32 relative overflow-x-hidden text-slate-900">
      <div className="absolute inset-x-0 top-0 -z-10 h-full">
        <div 
          className="absolute inset-x-0 top-0"
          style={{ 
            height: '100vh',
            background: 'linear-gradient(180deg, #0d0d12 0%, #0e0a14 0.5%, #100b18 1%, #120c1c 1.5%, #150e22 2%, #181028 2.5%, #1c122f 3%, #201436 3.5%, #25173e 4%, #2a1a46 5%, #301d4f 6%, #362158 7%, #3d2561 8%, #44296b 9%, #4c2e75 10%, #54337f 11%, #5d3889 12%, #663e93 13%, #70449d 14%, #7a4aa7 15%, #8451b0 16%, #8e58b9 17%, #9860c1 18%, #a268c8 19%, #ac71ce 20%, #b57ad3 21%, #be84d8 22%, #c68edc 23%, #cd98e0 24%, #d4a2e3 25%, #daace6 26%, #dfb6e9 27%, #e4c0eb 28%, #e8c9ed 29%, #ecd2ef 30%, #efdaf1 31%, #f2e1f3 32%, #f4e7f5 33%, #f6ecf7 34%, #f8f0f9 35%, #f9f3fa 36%, #faf5fb 38%, #fbf7fc 40%, #fcf9fd 42%, #fdfafd 45%, #faf8fc 55%, #f8f6fa 100%)'
          }} 
        />
      </div>

      <div className="px-5 pt-12 pb-8">
        <header className="relative flex items-center justify-between mb-10 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 border border-white/30 text-xs font-semibold uppercase">{profile?.firstName?.[0] || 'U'}{profile?.lastName?.[0] || 'S'}</div>
          <NavigationPill activeTab="credit" onTabChange={(tab) => tab === "home" ? onTabChange("home") : null} />
          <NotificationBell onClick={onOpenNotifications} />
        </header>

        {/* Hero Card */}
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
            {/* Logic: Disable "Pledge All" button if no qualifying assets */}
            <button 
              onClick={() => handleOpenDetail('all')} 
              disabled={qualifyingCount === 0}
              className={`w-full text-slate-900 text-[10px] uppercase tracking-[0.2em] font-black py-4 rounded-xl transition-all mt-5 shadow-xl ${qualifyingCount > 0 ? 'bg-white active:scale-[0.97]' : 'bg-white/40 opacity-50 cursor-not-allowed'}`}
            >
              {qualifyingCount > 0 ? "Pledge All Available" : "No Available Liquidity"}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
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

        {/* Search & Filter */}
        <div className="flex gap-2 mb-8 px-1">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search assets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-11 text-sm focus:outline-none shadow-sm" />
          </div>
          <button onClick={openFilter} className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-95"><SlidersHorizontal size={18} /></button>
        </div>

        {/* Asset List Section */}
        <div className="space-y-4">
          <div className="px-5 mb-2 flex items-center justify-between"><p className="text-sm font-semibold text-slate-900">Eligible Collateral</p><button onClick={() => setInfoModal('score')}><Info className="h-4 w-4 text-slate-300" /></button></div>
          
          {loading && <div className="text-center py-10 opacity-40 text-xs font-black uppercase tracking-widest animate-pulse">Syncing Market Data...</div>}

          {/* Logic: Empty State UI for users with no qualifying assets */}
          {!loading && portfolioItems.length === 0 && (
            <div className="bg-white/50 backdrop-blur-sm rounded-[36px] p-10 border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6 text-slate-300">
                <PieChart size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No Qualifying Assets</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-[200px] mx-auto mb-8 font-medium">
                We couldn't find any eligible strategies in your portfolio that meet our liquidity requirements.
              </p>
              <button 
                onClick={() => setView("portfolio")} 
                className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
              >
                <Plus size={14} /> Buy Qualifying Shares
              </button>
            </div>
          )}

          {!loading && filteredItems.map((item) => (
            <button key={item.id} onClick={() => handleOpenDetail(item)} disabled={!item.isEligible} className={`relative w-full overflow-hidden bg-white rounded-[28px] p-5 shadow-sm border text-left transition-all ${!item.isEligible ? 'opacity-40 grayscale pointer-events-none' : 'active:scale-[0.98] border-slate-100'}`}>
              <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center gap-3">
                   <div className="h-11 w-11 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 text-[10px]">{item.code}</div>
                   <div>
                     <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{item.name}</p>
                     </div>
                     <p className="text-xl font-bold text-slate-900" style={{ fontFamily: fonts.display }}>R{item.balance.toLocaleString()}</p>
                   </div>
                 </div>
                 <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full uppercase">Score: {item.score.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                 <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Recognized</p>
                    <p className={`text-xs font-bold ${item.isCapped ? 'text-amber-600' : 'text-slate-900'}`}>{formatZar(item.recognizedValue)}</p>
                 </div>
                 <AssetMiniChart data={item.spark} />
                 <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black text-slate-600 uppercase">LTV {(item.ltv * 100).toFixed(0)}%</span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                 </div>
              </div>
            </button>
          ))}
        </div>
      </div>

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
              <div className="flex items-center justify-center pt-3 shrink-0"><div className="h-1.5 w-12 rounded-full bg-slate-200" /></div>
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-8 pb-4 pt-3 shrink-0">
                  <h3 className="text-lg font-bold text-slate-900">Advanced Filters</h3>
                  <button onClick={clearAllFilters} className="text-xs font-bold text-violet-600">Clear all</button>
              </div>
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Sort By</p>
                      <div className="flex flex-wrap gap-2">{sortOptions.map(opt => (<button key={opt} onClick={() => setDraftSort(opt)} className={`rounded-full px-4 py-2 text-xs font-bold border transition-all ${draftSort === opt ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}>{opt}</button>))}</div>
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Industry Sector</p>
                      <div className="flex flex-wrap gap-2">{sectorOptions.map(s => (<button key={s} onClick={() => toggleDraftSet(draftSectors, setDraftSectors, s)} className={`rounded-full px-4 py-2 text-xs font-bold border transition-all ${draftSectors.has(s) ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}>{s}</button>))}</div>
                  </div>
              </div>
              <div className="p-8 border-t border-slate-100 shrink-0">
                  <button onClick={applyMegaFilters} className="w-full h-14 bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl active:scale-[0.97]">Apply Filter Logic</button>
              </div>
           </div>
        </div>
      , portalTarget)}

      {/* --- PLEDGE WORKFLOW / DETAIL VIEW --- */}
      {isDetailOpen && portalTarget && createPortal(
        <div className="fixed inset-0 z-[150] bg-white flex flex-col animate-in slide-in-from-right">
            <div className="px-6 pt-12 pb-6 flex items-center justify-between border-b border-slate-100 sticky top-0 bg-white z-10">
                <button onClick={closeDetail} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center active:scale-95 transition-all"><ChevronLeft size={20} /></button>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Pledge Analysis</h3>
                <div className="w-10" />
            </div>
            <div className="flex-1 overflow-y-auto p-8 pb-32">
                <div className="mb-8 flex justify-between items-start">
                    <div>
                         <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1" style={{ fontFamily: fonts.display }}>{selectedItem === 'all' ? "Recognized Portfolio" : selectedItem?.name}</h1>
                         <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">LTV Limit: {(selectedItem?.ltv * 100 || 50)}%</p>
                    </div>
                    <div className="h-14 w-14 rounded-full border-4 border-violet-600 flex items-center justify-center font-black text-xs text-violet-600">{(selectedItem?.score || 0.85).toFixed(2)}</div>
                </div>
                <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100 mb-10 shadow-inner">
                    <div className="flex justify-between items-center mb-4"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Liquidation Safety Bar</p><span className="text-[10px] font-bold text-emerald-600">Secure Range</span></div>
                    <div className="relative h-4 w-full bg-slate-200 rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-500" style={{ width: '55%' }} /><div className="h-full bg-amber-400" style={{ width: '10%' }} /><div className="h-full bg-rose-500" style={{ width: '35%' }} />
                        <div className="absolute top-0 bottom-0 w-1 bg-white shadow-xl" style={{ left: `${(selectedItem?.ltv || 0.5) * 100}%` }} />
                    </div>
                </div>
                <div className="text-center mb-10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Maximum Credit Capacity</p>
                    <p className="text-4xl font-extralight text-slate-900 tracking-tight" style={{ fontFamily: fonts.display }}>{formatZar(selectedItem === 'all' ? totalAvailable : selectedItem?.available || 0)}</p>
                </div>
                <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-lg mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Withdrawal Amount</span>
                        <div className="text-right">
                           <input type="number" value={pledgeAmount} onChange={(e) => setPledgeAmount(e.target.value)} placeholder="0.00" className="w-32 bg-slate-50 px-4 py-2 rounded-xl text-right font-bold text-slate-900 outline-none mb-1" />
                           <p className="text-[9px] font-bold text-violet-600 uppercase">Usage: {portfolioUsagePercent}% of Portfolio</p>
                        </div>
                    </div>
                    <input type="range" min="0" max="100" value={(pledgeAmount / (selectedItem === 'all' ? totalAvailable : selectedItem?.available || 1)) * 100 || 0} onChange={(e) => setPledgeAmount(Math.floor((e.target.value / 100) * (selectedItem === 'all' ? totalAvailable : selectedItem?.available)))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none accent-violet-600 cursor-pointer" />
                </div>
            </div>
            <div className="p-6 bg-white border-t border-slate-100 pb-28">
                <button disabled={!pledgeAmount} onClick={() => setWorkflowStep("contract")} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-bold uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all disabled:opacity-30">Review Agreement</button>
            </div>
        </div>
      , portalTarget)}

      {/* --- DRAWDOWN AUTHORIZATION MODALS --- */}
      {workflowStep !== "idle" && portalTarget && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md px-6 pb-20">
            {workflowStep === "setup_pin" && (
                <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl animate-in zoom-in-95">
                    <div className="h-16 w-16 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-6"><ShieldCheck size={28} /></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Set Security PIN</h3>
                    <p className="text-xs text-slate-400 mb-8 font-medium leading-relaxed">Please set a 5-digit PIN to secure your credit transactions.</p>
                    <input type="password" maxLength={5} value={newPin} onChange={(e) => setNewPin(e.target.value)} placeholder="00000" className="w-full h-14 bg-slate-50 rounded-2xl text-center text-2xl font-black tracking-[0.5em] mb-8 outline-none border border-slate-100" />
                    <button onClick={handleSetupPin} disabled={newPin.length !== 5 || isProcessing} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl">Save & Continue</button>
                </div>
            )}
            {workflowStep === "contract" && (
                <div className="bg-white w-full max-w-sm rounded-[36px] p-8 shadow-2xl animate-in zoom-in-95">
                    <div className="flex items-center gap-3 mb-6"><div className="h-10 w-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center"><FileText size={20} /></div><h3 className="text-xl font-bold text-slate-900">Final Confirmation</h3></div>
                    <div className="space-y-4 mb-6">
                        <div className="flex justify-between pb-3 border-b border-slate-50 text-sm"><span className="text-slate-500 font-medium">Applied LTV</span><span className="font-bold text-slate-900">{(selectedItem?.ltv * 100 || 50)}%</span></div>
                        <div className="bg-slate-900 rounded-2xl p-4 flex justify-between items-center text-white"><span className="text-[10px] font-black opacity-40 uppercase">Interest Cost</span><span className="font-bold">{formatZar((pledgeAmount || 0) * 0.105 / 12)} / mo</span></div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Repayment Date</label>
                            <input type="date" min={dateConstraints.min} max={dateConstraints.max} value={repaymentDate} onChange={(e) => setRepaymentDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 text-slate-900 text-sm rounded-xl px-4 py-3 outline-none focus:border-violet-500 font-medium transition-all" />
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl mb-6 border border-slate-100">
                        <p className="text-[9px] text-slate-400 font-medium leading-relaxed italic">Legal Disclaimer: By proceeding, you understand that your assets will be locked as collateral and may be liquidated if the LTV threshold is breached.</p>
                    </div>
                    <label className="flex items-center gap-3 mb-8 cursor-pointer group">
                        <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${disclaimerChecked ? 'bg-violet-600 border-violet-600' : 'bg-white border-slate-200'}`}>{disclaimerChecked && <Check size={14} className="text-white" />}</div>
                        <input type="checkbox" className="hidden" checked={disclaimerChecked} onChange={() => setDisclaimerChecked(!disclaimerChecked)} />
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">I have read and understood the terms.</span>
                    </label>
                    <div className="flex flex-col gap-3">
                        <button disabled={!disclaimerChecked || !repaymentDate} onClick={() => setWorkflowStep(userPin ? "auth" : "setup_pin")} className="w-full bg-slate-900 text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-xl disabled:opacity-30">Agree & Drawdown</button>
                        <button onClick={() => setWorkflowStep("idle")} className="w-full py-2 text-xs font-bold text-slate-400 uppercase">Go Back</button>
                    </div>
                </div>
            )}
            {workflowStep === "auth" && (
                <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl">
                    <div className="h-16 w-16 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-6"><Lock size={28} /></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Authorize</h3>
                    <p className="text-xs text-slate-400 mb-8 font-medium uppercase tracking-widest">Enter Secure PIN</p>
                    <input type="password" maxLength={5} value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="•••••" className="w-full h-14 bg-slate-50 rounded-2xl text-center text-2xl font-black tracking-[0.5em] mb-8 outline-none border border-slate-100" />
                    <button onClick={handleConfirmPledge} disabled={pinInput.length !== 5 || isProcessing} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl">{isProcessing ? "Processing..." : "Confirm Transaction"}</button>
                </div>
            )}
            {workflowStep === "success" && (
                <div className="bg-white w-full max-w-sm rounded-[36px] p-8 text-center shadow-2xl">
                    <div className="h-20 w-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-inner"><Check size={40} strokeWidth={3} /></div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Credit Secured</h3>
                    <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100 shadow-inner"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Available Capital</p><h2 className="text-2xl font-bold text-slate-900">{formatZar(pledgeAmount)}</h2></div>
                    <button onClick={closeDetail} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg">Return to Wealth</button>
                </div>
            )}
        </div>
      , portalTarget)}
    </div>
  );
};

export default InstantLiquidity;