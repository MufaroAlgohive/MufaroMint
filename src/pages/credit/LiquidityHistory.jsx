import React, { useState, useMemo } from "react";
import { 
  ChevronLeft, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  ChevronRight,
  Calendar,
  Filter,
  HandCoins,
  History,
  Lock,
  Unlock,
  ReceiptText,
  Clock
} from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";

const LiquidityHistory = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    text: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
  };

  const historyData = useMemo(() => [
    { 
      id: 1, 
      type: 'pledge', 
      asset: 'Naspers Ltd', 
      code: 'NPN',
      amount: 450000, 
      date: '2026-03-08', 
      status: 'active', 
      interestAccrued: 450.20, 
      ltv: '55%',
      details: 'Initial drawdown against 150 shares.'
    },
    { 
      id: 2, 
      type: 'repayment', 
      asset: 'Standard Bank', 
      code: 'SBK',
      amount: 120000, 
      date: '2026-03-05', 
      status: 'completed', 
      interestPaid: 840.00, 
      ltv: '50%',
      loanDuration: '45 days',
      details: 'Full settlement of Feb 1st drawdown.'
    },
    { 
      id: 3, 
      type: 'pledge', 
      asset: 'Capitec Bank', 
      code: 'CPI',
      amount: 85000, 
      date: '2026-03-01', 
      status: 'active', 
      interestAccrued: 112.50, 
      ltv: '50%',
      details: 'Collateral locked at R150,000 market value.'
    },
    { 
      id: 4, 
      type: 'margin_call', 
      asset: 'Portfolio Wide', 
      code: 'PORT',
      amount: 15000, 
      date: '2026-02-28', 
      status: 'resolved', 
      ltv: '65%',
      details: 'Automatic adjustment due to market volatility.'
    },
    { 
      id: 5, 
      type: 'repayment', 
      asset: 'Naspers Ltd', 
      code: 'NPN',
      amount: 50000, 
      date: '2026-02-15', 
      status: 'completed', 
      interestPaid: 120.00, 
      ltv: '55%',
      loanDuration: '12 days',
      details: 'Partial repayment to improve LTV buffer.'
    }
  ], []);

  const filteredHistory = useMemo(() => {
    return historyData.filter(item => 
      item.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, historyData]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedData = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  const getStatusStyle = (status) => {
    switch(status) {
      case 'active': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'completed': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'resolved': return 'text-blue-600 bg-blue-50 border-blue-100';
      default: return 'text-slate-400 bg-slate-50 border-slate-100';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
          <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95 transition-all">
              <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Liquidity Archive</h3>
            <p className="text-[10px] font-bold text-violet-600">Lifetime Tracking</p>
          </div>
          <button className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95">
              <Filter size={18} />
          </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Loan Performance Summary - Updated to Light Purple Brand Color */}
        <div className="px-6 py-8">
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-[32px] p-8 shadow-xl shadow-violet-900/5 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500 mb-1">Total Life-cycle Interest</p>
                            <h2 className="text-4xl font-light tracking-tight text-slate-900" style={{ fontFamily: fonts.display }}>{formatZar(6535.40)}</h2>
                        </div>
                        <div className="bg-white p-2 rounded-2xl border border-violet-100 shadow-sm">
                            <ReceiptText className="text-violet-600" size={24} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-violet-200/50">
                        <div>
                            <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">Active Collateral</p>
                            <p className="text-sm font-bold text-slate-900">{formatZar(535000)}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">Avg. Loan Term</p>
                            <p className="text-sm font-bold text-emerald-600">22 Days</p>
                        </div>
                    </div>
                </div>
                <div className="absolute -right-10 -bottom-10 opacity-50 text-violet-200">
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
                    placeholder="Search by asset name or ticker..." 
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-white border border-slate-200 rounded-[22px] py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 shadow-sm transition-all"
                />
            </div>
        </div>

        {/* Dynamic History List */}
        <div className="px-6 space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2">Loan Events</p>
            {paginatedData.map((item) => (
                <div key={item.id} className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] transition-all">
                    <div className="flex justify-between items-start mb-5">
                        <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${item.type === 'pledge' ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                {item.type === 'pledge' ? <Lock className="text-rose-500" size={20} /> : <Unlock className="text-emerald-500" size={20} />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-slate-900">{item.asset}</h4>
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">{item.code}</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                                    {item.type === 'pledge' ? 'Drawdown Initiated' : 'Repayment Settled'}
                                </p>
                            </div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase border ${getStatusStyle(item.status)}`}>
                            {item.status}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 mb-5 pb-5 border-b border-slate-50">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Transaction Value</p>
                            <p className={`text-base font-bold ${item.type === 'repayment' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                {item.type === 'repayment' ? '-' : '+'}{formatZar(item.amount)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">LTV Utilization</p>
                            <p className="text-base font-bold text-slate-900">{item.ltv}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Date</p>
                            <div className="flex items-center gap-1.5 text-slate-600">
                                <Calendar size={12} className="text-slate-400" />
                                <p className="text-xs font-bold">{new Date(item.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{item.type === 'pledge' ? 'Current Interest' : 'Final Interest'}</p>
                            <p className="text-xs font-bold text-rose-500">{formatZar(item.interestAccrued || item.interestPaid)}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50/50 rounded-2xl p-3">
                        <div className="flex items-center gap-2">
                            <Clock size={12} className="text-slate-300" />
                            <p className="text-[10px] font-medium text-slate-500 italic">"{item.details}"</p>
                        </div>
                        {item.loanDuration && (
                            <span className="text-[9px] font-bold text-violet-600 uppercase bg-white px-2 py-0.5 rounded-lg border border-slate-100 shadow-sm">
                                Term: {item.loanDuration}
                            </span>
                        )}
                    </div>
                </div>
            ))}

            {filteredHistory.length === 0 && (
                <div className="text-center py-24 bg-white rounded-[32px] border border-dashed border-slate-200">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="text-slate-300" size={32} />
                    </div>
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No matching history</p>
                    <p className="text-xs text-slate-300 mt-1">Try searching for a different asset or ticker.</p>
                </div>
            )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
            <div className="px-6 py-12 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-violet-600"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Page {currentPage} of {totalPages}</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30 active:scale-90 transition-all shadow-sm"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button 
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white disabled:opacity-30 active:scale-90 transition-all shadow-lg shadow-slate-900/20"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        )}
      </div>

      <div className="h-28 bg-transparent" />
    </div>
  );
};

export default LiquidityHistory;