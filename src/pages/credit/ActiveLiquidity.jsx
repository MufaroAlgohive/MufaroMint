import React, { useState, useMemo } from "react";
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
  Search
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatZar } from "../../lib/formatCurrency";

const ActiveLiquidity = ({ onBack, fonts }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // --- Enhanced Mock Data: List of Individual Active Loans ---
  const activeLoans = useMemo(() => [
    {
      id: "LN-8821",
      asset: "Naspers Ltd",
      code: "NPN",
      amount: 150000,
      nextPayment: "2026-03-15",
      status: "overdue",
      ltv: 62.1,
      interestAccrued: 1250.40
    },
    {
      id: "LN-9042",
      asset: "Standard Bank",
      code: "SBK",
      amount: 85000,
      nextPayment: "2026-04-01",
      status: "active",
      ltv: 52.4,
      interestAccrued: 420.15
    },
    {
      id: "LN-9211",
      asset: "Capitec Bank",
      code: "CPI",
      amount: 21450,
      nextPayment: "2026-04-10",
      status: "active",
      ltv: 48.9,
      interestAccrued: 88.50
    }
  ], []);

  // Aggregates for the Hero Card
  const totalBalance = activeLoans.reduce((acc, loan) => acc + loan.amount + loan.interestAccrued, 0);
  const avgLtv = activeLoans.length > 0 ? (activeLoans.reduce((acc, loan) => acc + loan.ltv, 0) / activeLoans.length).toFixed(1) : 0;
  const overdueCount = activeLoans.filter(l => l.status === "overdue").length;

  const ltvTrend = [{ v: 52 }, { v: 54 }, { v: 58 }, { v: 57 }, { v: 61 }, { v: 59 }, { v: avgLtv }];

  // --- Search & Pagination Logic ---
  const filteredLoans = useMemo(() => {
    return activeLoans.filter(loan =>
      loan.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, activeLoans]);

  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);
  const paginatedLoans = filteredLoans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95 transition-all">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Active Debt</h3>
          <p className="text-[10px] font-bold text-violet-600">{activeLoans.length} Outstanding Loans</p>
        </div>
        <div className="h-10 w-10 flex items-center justify-center">
          <ShieldCheck className="text-emerald-500" size={20} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Total Exposure Card - Updated to Light Mode */}
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
                  <p className="text-sm font-bold text-amber-600 whitespace-nowrap">{avgLtv}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">Credit Health</p>
                  <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest whitespace-nowrap">Good</p>
                </div>
              </div>
            </div>
            <div className="absolute -right-10 -top-10 h-40 w-40 bg-violet-600/5 blur-[60px] rounded-full" />
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
            <span className="text-[10px] font-bold text-slate-400">Sort by Date</span>
          </div>

          {paginatedLoans.map((loan) => (
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
                  <p className="text-base font-bold text-slate-900 whitespace-nowrap">{formatZar(loan.amount + loan.interestAccrued)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Asset LTV</p>
                  <p className={`text-base font-bold whitespace-nowrap ${loan.ltv > 60 ? 'text-amber-500' : 'text-slate-900'}`}>{loan.ltv}%</p>
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
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Interest Accrued</p>
                  <p className="text-xs font-bold text-rose-500 whitespace-nowrap">+{formatZar(loan.interestAccrued)}</p>
                </div>
              </div>

              <button className="w-full flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-violet-600" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">View Risk Analysis</p>
                </div>
                <ChevronRight size={16} className="text-slate-200 group-active:translate-x-1 transition-transform" />
              </button>
            </div>
          ))}

          {filteredLoans.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-slate-200">
              <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-slate-300" size={32} />
              </div>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No matching loans</p>
            </div>
          )}
        </div>

        {/* Modern Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-violet-600"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Page {currentPage} of {totalPages}</p>
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

export default ActiveLiquidity;