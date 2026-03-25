import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  ChevronLeft, 
  Search, 
  ChevronRight,
  Calendar,
  Filter,
  History,
  Lock,
  Unlock,
  ReceiptText,
  Clock,
  Info,
  X,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase";
import NavigationPill from "../../components/NavigationPill";
import NotificationBell from "../../components/NotificationBell";

const LiquidityHistory = ({ onBack, profile, onTabChange, onOpenNotifications }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [portalTarget, setPortalTarget] = useState(null);
  
  const itemsPerPage = 6;

  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    text: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
  };

  useEffect(() => { 
    setPortalTarget(document.body); 
  }, []);

  // --- DATA FETCHING (Live Supabase Integration) ---
  useEffect(() => {
    async function fetchHistory() {
      if (!profile?.id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('pbc_collateral_pledges')
          .select(`
            id,
            symbol,
            pledged_value,
            recognised_value,
            ltv_applied,
            loan_value,
            created_at,
            loan_application (
              id,
              status,
              interest_rate,
              amount_repayable,
              first_repayment_date
            )
          `)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const formatted = data.map(item => ({
            id: item.id,
            type: 'pledge', 
            asset: item.symbol,
            code: item.symbol,
            amount: item.loan_value,
            date: item.created_at,
            status: item.loan_application?.status || 'active',
            interestRate: item.loan_application?.interest_rate,
            ltv: `${(item.ltv_applied * 100).toFixed(0)}%`,
            details: `Drawdown of ${formatZar(item.loan_value)} against ${item.symbol} collateral.`,
            recognisedCollateral: item.recognised_value
          }));
          setHistoryData(formatted);
        }
      } catch (err) {
        console.error("Ledger retrieval error:", err);
      } finally {
        setLoading(false); // Stops the scanning state
      }
    }
    fetchHistory();
  }, [profile?.id]);

  // --- DYNAMIC SUMMARY CALCULATIONS ---
  const summary = useMemo(() => {
    const active = historyData.filter(h => h.status === 'active' || h.status === 'approved');
    return {
      totalActiveDebt: active.reduce((sum, h) => sum + h.amount, 0),
      totalRecognisedCollateral: active.reduce((sum, h) => sum + h.recognisedCollateral, 0),
    };
  }, [historyData]);

  // --- SEARCH & PAGINATION LOGIC ---
  const filteredHistory = useMemo(() => {
    return historyData.filter(item => 
      item.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, historyData]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));
  const paginatedData = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  const getStatusStyle = (status) => {
    switch(status) {
      case 'active': case 'approved': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'completed': case 'settled': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'margin_call': return 'text-rose-600 bg-rose-50 border-rose-100';
      default: return 'text-slate-400 bg-slate-50 border-slate-100';
    }
  };

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
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Liquidity Archive</h3>
            <p className="text-[10px] font-bold text-violet-600">Dynamic Risk Tracking</p>
          </div>
          <button className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600">
              <Filter size={18} />
          </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Updated Summary Card - Light Purple Style */}
        <div className="px-6 py-8">
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-[32px] p-8 shadow-xl shadow-violet-900/5 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500 mb-1">Active Debt Exposure</p>
                            <h2 className="text-4xl font-light tracking-tight text-slate-900" style={{ fontFamily: fonts.display }}>
                              {loading ? "..." : formatZar(summary.totalActiveDebt)}
                            </h2>
                        </div>
                        <div className="bg-white p-2 rounded-2xl border border-violet-100 shadow-sm">
                            <ReceiptText className="text-violet-600" size={24} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-violet-200/50">
                        <div>
                            <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">Recognized Collateral</p>
                            <p className="text-sm font-bold text-slate-900">{formatZar(summary.totalRecognisedCollateral)}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">Current LTV Pool</p>
                            <p className="text-sm font-bold text-emerald-600">
                                {summary.totalRecognisedCollateral > 0 
                                    ? ((summary.totalActiveDebt / summary.totalRecognisedCollateral) * 100).toFixed(1) 
                                    : 0}%
                            </p>
                        </div>
                    </div>
                </div>
                <div className="absolute -right-10 -bottom-10 opacity-50 text-violet-100">
                    <History size={180} />
                </div>
            </div>
        </div>

        {/* Search Engine */}
        <div className="px-6 mb-8">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Filter by Ticker (e.g. NPN)..." 
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-white border border-slate-200 rounded-[22px] py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 shadow-sm transition-all"
                />
            </div>
        </div>

        {/* Dynamic Event List */}
        <div className="px-6 space-y-4">
            {loading ? (
              <div className="text-center py-10 text-[10px] font-black text-slate-400 animate-pulse uppercase tracking-widest">
                Reconstructing Ledger...
              </div>
            ) : historyData.length === 0 ? (
              <div className="p-10 border-2 border-dashed border-slate-200 rounded-[32px] text-center">
                  <AlertCircle className="mx-auto text-slate-200 mb-3" size={32} />
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">No History Found</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-slate-200">
                  <Search className="text-slate-200 mx-auto mb-4" size={40} />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No matching history</p>
              </div>
            ) : (
              paginatedData.map((item) => (
                <button 
                    key={item.id} 
                    onClick={() => setSelectedEvent(item)}
                    className="w-full bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm transition-all active:scale-[0.98] text-left"
                >
                    <div className="flex justify-between items-start mb-5">
                        <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${item.type === 'pledge' ? 'bg-violet-50 border-violet-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                {item.type === 'pledge' ? <Lock className="text-violet-500" size={20} /> : <Unlock className="text-emerald-500" size={20} />}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900">{item.asset} <span className="text-[10px] text-slate-300 ml-1">{item.code}</span></h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                  {item.type === 'pledge' ? 'Asset Drawdown' : 'Debt Settlement'}
                                </p>
                            </div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase border ${getStatusStyle(item.status)}`}>
                            {item.status}
                        </div>
                    </div>

                    <div className="flex justify-between items-end border-t border-slate-50 pt-4">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Loan Value</p>
                            <p className="text-base font-bold text-slate-900">{formatZar(item.amount)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Date</p>
                            <p className="text-xs font-bold text-slate-600">{new Date(item.date).toLocaleDateString('en-ZA')}</p>
                        </div>
                    </div>
                </button>
              ))
            )}
        </div>

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
            <div className="px-6 py-12 flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {currentPage}/{totalPages}</p>
                <div className="flex gap-3">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30 active:scale-90 transition-all"><ChevronLeft size={20} /></button>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white disabled:opacity-30 active:scale-90 transition-all shadow-lg shadow-slate-900/20"><ChevronRight size={20} /></button>
                </div>
            </div>
        )}
      </div>

      {/* --- EVENT AUDIT MODAL --- */}
      {selectedEvent && portalTarget && createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-6">
              <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-start mb-8">
                      <div className="h-14 w-14 rounded-3xl bg-violet-50 text-violet-600 flex items-center justify-center">
                        <Info size={28} />
                      </div>
                      <button onClick={() => setSelectedEvent(null)} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center transition-all active:scale-90">
                        <X size={20} />
                      </button>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Transaction Audit</h3>
                  <p className="text-sm text-slate-500 mb-8 italic">"{selectedEvent.details}"</p>
                  
                  <div className="space-y-4 mb-8">
                      <div className="flex justify-between items-center py-3 border-b border-slate-50">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recognized Value</span>
                          <span className="text-sm font-bold">{formatZar(selectedEvent.recognisedCollateral)}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-slate-50">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interest Applied</span>
                          <span className="text-sm font-bold text-rose-500">{selectedEvent.interestRate}% p.a.</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-slate-50">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LTV Threshold</span>
                          <span className="text-sm font-bold">{selectedEvent.ltv}</span>
                      </div>
                  </div>

                  <button 
                    onClick={() => setSelectedEvent(null)} 
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                  >
                    Close Audit Record
                  </button>
              </div>
          </div>
      , portalTarget)}
      
      <div className="h-28" />
    </div>
  );
};

export default LiquidityHistory;