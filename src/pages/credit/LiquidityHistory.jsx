import React, { useState, useMemo } from "react";
import { 
  ChevronLeft, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  SlidersHorizontal, 
  ChevronRight,
  Calendar,
  Filter,
  ArrowRight
} from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";

const LiquidityHistory = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    text: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
  };

  // --- Extensive Dummy History Data ---
  const historyData = useMemo(() => [
    { id: 1, type: 'pledge', asset: 'Naspers Ltd', amount: 450000, date: '2026-03-08', status: 'completed', interest: 1250, ltv: '55%' },
    { id: 2, type: 'repayment', asset: 'Standard Bank', amount: 120000, date: '2026-03-05', status: 'completed', interest: 450, ltv: '50%' },
    { id: 3, type: 'pledge', asset: 'Capitec Bank', amount: 85000, date: '2026-03-01', status: 'completed', interest: 310, ltv: '50%' },
    { id: 4, type: 'margin_call', asset: 'Portfolio Wide', amount: 15000, date: '2026-02-28', status: 'resolved', interest: 0, ltv: '65%' },
    { id: 5, type: 'pledge', asset: 'Nvidia Corp', amount: 210000, date: '2026-02-20', status: 'completed', interest: 980, ltv: '55%' },
    { id: 6, type: 'repayment', asset: 'Apple Inc', amount: 50000, date: '2026-02-15', status: 'completed', interest: 220, ltv: '50%' },
    { id: 7, type: 'pledge', asset: 'Naspers Ltd', amount: 300000, date: '2026-02-10', status: 'completed', interest: 1100, ltv: '55%' },
    { id: 8, type: 'adjustment', asset: 'Market Revaluation', amount: 0, date: '2026-02-05', status: 'info', interest: 0, ltv: '48%' },
    { id: 9, type: 'repayment', asset: 'Global Equity', amount: 250000, date: '2026-01-28', status: 'completed', interest: 1050, ltv: '40%' },
    { id: 10, type: 'pledge', asset: 'Standard Bank', amount: 180000, date: '2026-01-15', status: 'completed', interest: 620, ltv: '50%' },
    { id: 11, type: 'pledge', asset: 'Bitcoin Alpha', amount: 95000, date: '2026-01-05', status: 'completed', interest: 410, ltv: '50%' },
    { id: 12, type: 'repayment', asset: 'Capitec Bank', amount: 30000, date: '2025-12-28', status: 'completed', interest: 115, ltv: '50%' },
  ], []);

  // --- Search & Pagination Logic ---
  const filteredHistory = useMemo(() => {
    return historyData.filter(item => 
      item.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, historyData]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedData = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  const getStatusStyle = (status) => {
    switch(status) {
      case 'completed': return 'text-emerald-600 bg-emerald-50';
      case 'resolved': return 'text-blue-600 bg-blue-50';
      case 'info': return 'text-slate-500 bg-slate-50';
      default: return 'text-slate-400 bg-slate-50';
    }
  };

  const getIcon = (type) => {
    if (type === 'pledge') return <ArrowUpRight className="h-4 w-4 text-rose-500" />;
    if (type === 'repayment') return <ArrowDownLeft className="h-4 w-4 text-emerald-500" />;
    return <Calendar className="h-4 w-4 text-slate-400" />;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10">
          <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95 transition-all">
              <ChevronLeft size={20} />
          </button>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Liquidity History</h3>
          <button className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95">
              <Filter size={18} />
          </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Summary Stats */}
        <div className="px-6 py-8">
            <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Total Life-cycle Interest</p>
                    <h2 className="text-3xl font-light mb-1" style={{ fontFamily: fonts.display }}>{formatZar(6535.40)}</h2>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Avg. Cost of Credit: 10.5%</p>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-10">
                    <HandCoins size={120} />
                </div>
            </div>
        </div>

        {/* Search Input */}
        <div className="px-6 mb-6">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Search history by asset..." 
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none shadow-sm"
                />
            </div>
        </div>

        {/* History List */}
        <div className="px-6 space-y-3">
            {paginatedData.map((item) => (
                <div key={item.id} className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                            {getIcon(item.type)}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.asset}</p>
                            <p className="text-xs font-bold text-slate-900">{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</p>
                            <p className="text-[9px] text-slate-400 font-medium mt-0.5">{new Date(item.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} • LTV {item.ltv}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`text-sm font-bold ${item.type === 'pledge' ? 'text-slate-900' : 'text-emerald-600'}`}>
                            {item.type === 'repayment' ? '-' : ''}{formatZar(item.amount)}
                        </p>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase mt-1 ${getStatusStyle(item.status)}`}>
                            {item.status}
                        </span>
                    </div>
                </div>
            ))}

            {filteredHistory.length === 0 && (
                <div className="text-center py-20">
                    <p className="text-sm text-slate-400 font-medium">No transaction history found.</p>
                </div>
            )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
            <div className="px-6 mt-8 flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {currentPage} of {totalPages}</p>
                <div className="flex gap-2">
                    <button 
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30 active:scale-90 transition-all"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button 
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30 active:scale-90 transition-all"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* Raised Bottom Area to Clear Navbar */}
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none" />
    </div>
  );
};

export default LiquidityHistory;