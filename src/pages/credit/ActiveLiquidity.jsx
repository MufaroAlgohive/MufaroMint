import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  ChevronLeft, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  Lock, 
  ChevronRight, 
  Calendar,
  ArrowUpRight,
  TrendingUp,
  Search,
  X,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase";
import NavigationPill from "../../components/NavigationPill";
import NotificationBell from "../../components/NotificationBell";

const ActiveLiquidity = ({ onBack, fonts, profile, onTabChange, onOpenNotifications }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeLoans, setActiveLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [portalTarget, setPortalTarget] = useState(null);
  
  const itemsPerPage = 6;

  useEffect(() => { setPortalTarget(document.body); }, []);

  // --- LIVE DATA FETCHING ---
  useEffect(() => {
    async function fetchActiveLoans() {
      if (!profile?.id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('loan_application')
          .select(`
            id,
            principal_amount,
            amount_repayable,
            interest_rate,
            status,
            first_repayment_date,
            created_at,
            pbc_collateral_pledges (
              symbol,
              pledged_value,
              recognised_value,
              ltv_applied
            )
          `)
          .eq('user_id', profile.id)
          .in('status', ['approved', 'active', 'partially_paid'])
          .order('created_at', { ascending: false });

        if (!error && data) {
          const formatted = data.map(loan => {
            const pledge = loan.pbc_collateral_pledges?.[0];
            const nextPayment = new Date(loan.first_repayment_date);
            const isOverdue = nextPayment < new Date() && loan.status !== 'completed';

            return {
              id: `LN-${loan.id.toString().slice(-4)}`,
              dbId: loan.id,
              asset: pledge?.symbol || "Portfolio Pool",
              code: pledge?.symbol || "AGG",
              amount: loan.principal_amount,
              repayable: loan.amount_repayable,
              nextPayment: loan.first_repayment_date,
              status: isOverdue ? "overdue" : "active",
              ltv: pledge?.ltv_applied ? (pledge.ltv_applied * 100) : 50,
              interestAccrued: loan.amount_repayable - loan.principal_amount,
              recognisedValue: pledge?.recognised_value || 0,
              pledgedValue: pledge?.pledged_value || 0
            };
          });
          setActiveLoans(formatted);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        // Guaranteed to stop the "Scanning" state
        setLoading(false);
      }
    }
    fetchActiveLoans();
  }, [profile?.id]);

  // --- AGGREGATE CALCULATIONS ---
  const totalBalance = useMemo(() => 
    activeLoans.reduce((acc, loan) => acc + loan.repayable, 0), 
  [activeLoans]);

  const avgLtv = useMemo(() => {
    if (activeLoans.length === 0) return 0;
    const totalRecognised = activeLoans.reduce((acc, l) => acc + l.recognisedValue, 0);
    return totalRecognised > 0 ? ((totalBalance / totalRecognised) * 100).toFixed(1) : 0;
  }, [activeLoans, totalBalance]);

  const overdueCount = activeLoans.filter(l => l.status === "overdue").length;

  const creditHealth = useMemo(() => {
    const val = parseFloat(avgLtv);
    if (val > 70) return { label: "Critical", color: "text-rose-600" };
    if (val > 65) return { label: "Margin Call", color: "text-amber-600" };
    return { label: "Good", color: "text-emerald-600" };
  }, [avgLtv]);

  // --- SEARCH & PAGINATION ---
  const filteredLoans = useMemo(() => {
    return activeLoans.filter(loan => 
      loan.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, activeLoans]);

  const totalPages = Math.max(1, Math.ceil(filteredLoans.length / itemsPerPage));
  const paginatedLoans = filteredLoans.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
      <header className="px-6 pt-12 pb-4 relative flex items-center justify-between bg-white text-slate-900">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 border border-slate-300 text-xs font-semibold text-slate-700 uppercase">
          {profile?.firstName?.[0]}{profile?.lastName?.[0]}
        </div>
        <NavigationPill activeTab="credit" onTabChange={onTabChange} theme="light" />
        <NotificationBell onClick={onOpenNotifications} color="black" />
      </header>

      <div className="px-6 pb-6 pt-2 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95 transition-all">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Active Debt</h3>
            <p className="text-[10px] font-bold text-violet-600">{activeLoans.length} Outstanding Loans</p>
        </div>
        <div className="h-10 w-10 flex items-center justify-center">
            <ShieldCheck className={parseFloat(avgLtv) > 65 ? "text-amber-500" : "text-emerald-500"} size={20} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Total Exposure Card */}
        <div className="px-6 pt-8 pb-6">
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-[36px] p-8 shadow-xl shadow-violet-900/5 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500 mb-1">Total Debt Balance</p>
                   <h2 className="text-4xl font-light tracking-tight text-slate-900 whitespace-nowrap" style={{ fontFamily: fonts.display }}>{formatZar(totalBalance)}</h2>
                </div>
                {overdueCount > 0 && (
                    <div className="bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100 flex items-center gap-1.5">
                       <AlertCircle size={10} className="text-rose-500" />
                       <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider whitespace-nowrap">{overdueCount} Overdue</p>
                    </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-violet-200/50">
                <div>
                   <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">Portfolio LTV</p>
                   <p className={`text-sm font-bold whitespace-nowrap ${parseFloat(avgLtv) > 65 ? 'text-rose-500' : 'text-amber-600'}`}>{avgLtv}%</p>
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">Credit Health</p>
                   <p className={`text-sm font-bold uppercase tracking-widest whitespace-nowrap ${creditHealth.color}`}>{creditHealth.label}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Engine */}
        <div className="px-6 mb-8">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search by asset or loan ID..." 
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-white border border-slate-200 rounded-[22px] py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 shadow-sm transition-all"
                />
            </div>
        </div>

        {/* Active Loans List */}
        <div className="px-6 space-y-4">
          <div className="flex items-center justify-between mb-2 px-2">
             <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Loan Portfolio</h4>
          </div>
          
          {loading ? (
            <div className="text-center py-10 opacity-40 text-[10px] font-black uppercase tracking-widest animate-pulse">Scanning Active Ledger...</div>
          ) : activeLoans.length === 0 ? (
            <div className="p-10 border-2 border-dashed border-slate-200 rounded-[32px] text-center">
                <AlertCircle className="mx-auto text-slate-200 mb-3" size={32} />
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">No Active Debt Found</p>
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-slate-200">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="text-slate-300" size={32} />
                </div>
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No matching loans</p>
            </div>
          ) : (
            paginatedLoans.map((loan) => (
              <div key={loan.id} className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] transition-all active:scale-[0.98]">
                <div className="flex justify-between items-start mb-5">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${loan.status === 'overdue' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                      <Lock size={20} className={loan.status === 'overdue' ? 'text-rose-500' : 'text-slate-400'} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 whitespace-nowrap">{loan.asset}</h4>
                          <span className="text-[10px] font-black text-slate-300 uppercase whitespace-nowrap">{loan.code}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5 whitespace-nowrap">Loan ID: {loan.id}</p>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase border whitespace-nowrap ${loan.status === 'overdue' ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                      {loan.status}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-4 mb-5 pb-5 border-b border-slate-50">
                  <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Settlement Balance</p>
                      <p className="text-base font-bold text-slate-900 whitespace-nowrap">{formatZar(loan.repayable)}</p>
                  </div>
                  <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Asset LTV</p>
                      <p className={`text-base font-bold whitespace-nowrap ${loan.ltv > 65 ? 'text-rose-500' : loan.ltv > 60 ? 'text-amber-500' : 'text-slate-900'}`}>{loan.ltv.toFixed(1)}%</p>
                  </div>
                  <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Next Payment</p>
                      <div className="flex items-center gap-1.5">
                          <Calendar size={12} className={loan.status === 'overdue' ? 'text-rose-500' : 'text-slate-400'} />
                          <p className={`text-xs font-bold whitespace-nowrap ${loan.status === 'overdue' ? 'text-rose-500' : 'text-slate-600'}`}>
                              {new Date(loan.nextPayment).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                          </p>
                      </div>
                  </div>
                  <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Interest Cost</p>
                      <p className="text-xs font-bold text-rose-500 whitespace-nowrap">+{formatZar(loan.interestAccrued)}</p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedLoan(loan)}
                  className="w-full flex items-center justify-between group"
                >
                    <div className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-violet-600" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">View Risk Analysis</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-200 group-active:translate-x-1 transition-transform" />
                </button>
              </div>
            )
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
            <div className="px-6 py-8 flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Page {currentPage} of {totalPages}</p>
                <div className="flex gap-3">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30 active:scale-90 transition-all shadow-sm"><ChevronLeft size={20} /></button>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white disabled:opacity-30 active:scale-90 transition-all shadow-lg shadow-slate-900/20"><ChevronRight size={20} /></button>
                </div>
            </div>
        )}
      </div>

      {/* --- RISK ANALYSIS MODAL --- */}
      {selectedLoan && portalTarget && createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-6">
              <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-start mb-8">
                      <div className="h-14 w-14 rounded-3xl bg-violet-50 text-violet-600 flex items-center justify-center">
                        <ShieldAlert size={28} />
                      </div>
                      <button onClick={() => setSelectedLoan(null)} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center transition-all active:scale-90">
                        <X size={20} />
                      </button>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Liquidation Analysis</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Loan ID: {selectedLoan.id}</p>
                  
                  <div className="space-y-4 mb-8">
                      <div className="bg-slate-50 rounded-2xl p-4">
                        <div className="flex justify-between mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Margin Call Trigger</span>
                            <span className="text-xs font-bold text-amber-600">65% LTV</span>
                        </div>
                        <div className="relative h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (selectedLoan.ltv / 65) * 100)}%` }} />
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-4">
                        <div className="flex justify-between mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Auto-Liquidation</span>
                            <span className="text-xs font-bold text-rose-600">70% LTV</span>
                        </div>
                        <div className="relative h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500" style={{ width: `${Math.min(100, (selectedLoan.ltv / 70) * 100)}%` }} />
                        </div>
                      </div>
                  </div>

                  <button 
                    onClick={() => setSelectedLoan(null)} 
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                  >
                    Return to Portfolio
                  </button>
              </div>
          </div>
      , portalTarget)}

      <div className="h-28 bg-transparent" />
    </div>
  );
};

export default ActiveLiquidity;