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
  TrendingUp
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatZar } from "../../lib/formatCurrency";

const ActiveLiquidity = ({ onBack, fonts }) => {
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
  const avgLtv = (activeLoans.reduce((acc, loan) => acc + loan.ltv, 0) / activeLoans.length).toFixed(1);
  const overdueCount = activeLoans.filter(l => l.status === "overdue").length;

  const ltvTrend = [{ v: 52 }, { v: 54 }, { v: 58 }, { v: 57 }, { v: 61 }, { v: 59 }, { v: avgLtv }];

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
        {/* Total Exposure Card */}
        <div className="px-6 pt-8 pb-6">
          <div className="bg-slate-900 rounded-[36px] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Total Debt Balance</p>
                   <h2 className="text-4xl font-light tracking-tight" style={{ fontFamily: fonts.display }}>{formatZar(totalBalance)}</h2>
                </div>
                {overdueCount > 0 && (
                    <div className="bg-rose-500/20 px-3 py-1.5 rounded-full border border-rose-500/30 flex items-center gap-1.5">
                       <AlertCircle size={10} className="text-rose-400" />
                       <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">{overdueCount} Overdue</p>
                    </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-white/10">
                <div>
                   <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Portfolio LTV</p>
                   <p className="text-sm font-bold text-amber-500">{avgLtv}%</p>
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Credit Health</p>
                   <p className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Good</p>
                </div>
              </div>
            </div>
            <div className="absolute -right-10 -top-10 h-40 w-40 bg-violet-600/20 blur-[60px] rounded-full" />
          </div>
        </div>

        {/* Active Loans List */}
        <div className="px-6 mb-12 space-y-4">
          <div className="flex items-center justify-between mb-2 px-2">
             <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Loan Portfolio</h4>
             <span className="text-[10px] font-bold text-slate-400">Sort by Date</span>
          </div>
          
          {activeLoans.map((loan) => (
            <div key={loan.id} className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm transition-all active:scale-[0.98]">
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${loan.status === 'overdue' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                    <Lock size={20} className={loan.status === 'overdue' ? 'text-rose-500' : 'text-slate-400'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{loan.asset}</h4>
                        <span className="text-[10px] font-black text-slate-300 uppercase">{loan.code}</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">Loan ID: {loan.id}</p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase border ${loan.status === 'overdue' ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                    {loan.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-4 mb-5 pb-5 border-b border-slate-50">
                <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Settlement Balance</p>
                    <p className="text-base font-bold text-slate-900">{formatZar(loan.amount + loan.interestAccrued)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Asset LTV</p>
                    <p className={`text-base font-bold ${loan.ltv > 60 ? 'text-amber-500' : 'text-slate-900'}`}>{loan.ltv}%</p>
                </div>
                <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Next Payment</p>
                    <div className="flex items-center gap-1.5">
                        <Calendar size={12} className={loan.status === 'overdue' ? 'text-rose-500' : 'text-slate-400'} />
                        <p className={`text-xs font-bold ${loan.status === 'overdue' ? 'text-rose-500' : 'text-slate-600'}`}>
                            {new Date(loan.nextPayment).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Interest Accrued</p>
                    <p className="text-xs font-bold text-rose-500">+{formatZar(loan.interestAccrued)}</p>
                </div>
              </div>

              <button className="w-full flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-violet-600" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">View Risk Analysis</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-200 group-active:translate-x-1 transition-transform" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer (Offset for Navbar) */}
      <div className="p-6 bg-white border-t border-slate-100 pb-28 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] flex gap-4">
        <button className="flex-1 h-14 rounded-2xl bg-slate-100 text-slate-900 text-[11px] font-bold uppercase tracking-widest active:scale-95 transition-all">
          Management
        </button>
        <button className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] text-white text-[11px] font-bold uppercase tracking-widest shadow-xl active:scale-95 transition-all">
          Quick Repay All
        </button>
      </div>
    </div>
  );
};

export default ActiveLiquidity;