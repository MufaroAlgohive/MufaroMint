import React, { useState, useMemo } from "react";
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
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { formatZar } from "../../lib/formatCurrency";
import NavigationPill from "../../components/NavigationPill";

const LiquidityHistory = ({ onBack, onTabChange, fonts }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fontConfig = {
    display: fonts?.display || "'SF Pro Display', -apple-system, sans-serif",
    text: fonts?.text || "'SF Pro Text', -apple-system, sans-serif"
  };

  // --- Life-cycle Event Data ---
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
    switch (status) {
      case 'active': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'completed': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'resolved': return 'text-blue-600 bg-blue-50 border-blue-100';
      default: return 'text-slate-400 bg-slate-50 border-slate-100';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:scale-90 transition-all">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Liquidity Archive</h3>
          <p className="text-xs font-bold text-violet-600">Lifetime Tracking</p>
        </div>
        <button className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:scale-90">
          <Filter size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-44 px-6">
        {/* Performance Summary */}
        <div className="pt-8 pb-8">
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-[40px] p-8 shadow-xl shadow-violet-900/5 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500 mb-1.5 ml-1">Lifecycle Interest</p>
                  <h2 className="text-4xl font-light tracking-tight text-slate-900" style={{ fontFamily: fontConfig.display }}>
                    {formatZar(6535.40)}
                  </h2>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-violet-100 shadow-sm">
                  <ReceiptText className="text-violet-600" size={24} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-violet-200/50">
                <div>
                  <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">Active Collateral</p>
                  <p className="text-sm font-bold text-slate-900">{formatZar(535000)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">Avg. Loan Term</p>
                  <p className="text-sm font-bold text-emerald-600">22 Days</p>
                </div>
              </div>
            </div>
            <div className="absolute -right-12 -bottom-12 opacity-5 text-violet-900">
              <History size={200} />
            </div>
          </div>
        </div>

        {/* Search Engine */}
        <div className="mb-10">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search ticker or asset..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-[28px] py-5 pl-14 pr-6 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-violet-500/5 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Dynamic Event List */}
        <div className="space-y-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-2">Historical Events</p>
          <AnimatePresence mode="popLayout">
            {paginatedData.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={item.id}
                className="bg-white rounded-[32px] p-7 border border-slate-100 shadow-sm"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border shadow-inner ${item.type === 'pledge' ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                      {item.type === 'pledge' ? <Lock className="text-rose-500" size={22} /> : <Unlock className="text-emerald-500" size={22} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900">{item.asset}</h4>
                        <span className="text-[10px] font-black text-slate-300 uppercase">{item.code}</span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                        {item.type === 'pledge' ? 'Drawdown Initiated' : 'Repayment Settled'}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase border ${getStatusStyle(item.status)}`}>
                    {item.status}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-6 mb-6 pb-6 border-b border-slate-50">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Transaction Value</p>
                    <p className={`text-lg font-bold ${item.type === 'repayment' ? 'text-emerald-600' : 'text-slate-900'}`} style={{ fontFamily: fontConfig.display }}>
                      {item.type === 'repayment' ? '-' : '+'}{formatZar(item.amount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-1">LTV Utilization</p>
                    <p className="text-lg font-bold text-slate-900">{item.ltv}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Date</p>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar size={14} className="text-slate-400" />
                      <p className="text-xs font-bold">{new Date(item.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mr-1">{item.type === 'pledge' ? 'Current Interest' : 'Final Interest'}</p>
                    <p className="text-xs font-bold text-rose-500">{formatZar(item.interestAccrued || item.interestPaid)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <Clock size={14} className="text-slate-300" />
                    <p className="text-[11px] font-medium text-slate-500 italic">"{item.details}"</p>
                  </div>
                  {item.loanDuration && (
                    <span className="text-[9px] font-black text-violet-600 uppercase bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm whitespace-nowrap">
                      Term: {item.loanDuration}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredHistory.length === 0 && (
            <div className="text-center py-24 bg-white rounded-[40px] border border-dashed border-slate-200">
              <Search className="text-slate-200 mx-auto mb-4" size={48} />
              <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No matching history</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="py-12 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-violet-600"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Page {currentPage} / {totalPages}</p>
            </div>
            <div className="flex gap-4">
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
                className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white disabled:opacity-30 active:scale-90 transition-all shadow-xl shadow-slate-900/20"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiquidityHistory;