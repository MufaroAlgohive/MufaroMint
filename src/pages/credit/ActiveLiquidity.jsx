import React, { useState } from "react";
import { 
  ChevronLeft, 
  ShieldCheck, 
  TrendingDown, 
  Lock, 
  Info, 
  Zap, 
  ChevronRight, 
  AlertTriangle 
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, YAxis, ReferenceLine, Tooltip } from 'recharts';
import { formatZar } from "../../lib/formatCurrency";

const ActiveLiquidity = ({ onBack, fonts }) => {
  // Mock data representing an active credit position
  const activeDebt = {
    totalBalance: 256450.00,
    principal: 250000.00,
    accruedInterest: 6450.00,
    dailyCost: 72.45,
    currentLTV: 58.4,
    marginCallLTV: 65.0,
    liquidationLTV: 70.0,
    healthStatus: "Secure",
    pledgedAssets: [
      { id: 1, name: "Naspers Ltd", code: "NPN", value: 450000, ltvContribution: "42%", status: "Locked" },
      { id: 2, name: "Standard Bank", code: "SBK", value: 250000, ltvContribution: "16.4%", status: "Locked" }
    ]
  };

  // 7-day LTV trend data
  const ltvTrend = [
    { day: '04 Mar', value: 52.1 },
    { day: '05 Mar', value: 54.5 },
    { day: '06 Mar', value: 58.0 },
    { day: '07 Mar', value: 57.2 },
    { day: '08 Mar', value: 61.4 },
    { day: '09 Mar', value: 59.8 },
    { day: '10 Mar', value: 58.4 }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95 transition-all">
          <ChevronLeft size={20} />
        </button>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Active Liquidity</h3>
        <div className="h-10 w-10 flex items-center justify-center">
            <ShieldCheck className="text-emerald-500" size={20} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Debt Overview Card */}
        <div className="px-6 pt-8 pb-6">
          <div className="bg-slate-900 rounded-[36px] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Total Debt Balance</p>
                   <h2 className="text-4xl font-light tracking-tight" style={{ fontFamily: fonts.display }}>{formatZar(activeDebt.totalBalance)}</h2>
                </div>
                <div className="bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                   <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Status: {activeDebt.healthStatus}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-white/10">
                <div>
                   <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Accrued Interest</p>
                   <p className="text-sm font-bold text-white">+{formatZar(activeDebt.accruedInterest)}</p>
                </div>
                <div>
                   <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Current LTV</p>
                   <p className="text-sm font-bold text-amber-500">{activeDebt.currentLTV}%</p>
                </div>
              </div>
            </div>
            {/* Ambient Brand Glow */}
            <div className="absolute -right-10 -top-10 h-40 w-40 bg-violet-600/20 blur-[60px] rounded-full" />
          </div>
        </div>

        {/* Risk Monitoring Section */}
        <div className="px-6 mb-8">
          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
               <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Health Monitoring</h4>
               <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                  <TrendingDown size={12} className="text-rose-500" />
                  <span>7D Trend</span>
               </div>
            </div>
            
            <div className="h-44 w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ltvTrend}>
                  <defs>
                    <linearGradient id="activeLtvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <ReferenceLine 
                    y={65} 
                    stroke="#fbbf24" 
                    strokeDasharray="4 4" 
                    label={{ position: 'top', value: 'Margin Call', fill: '#fbbf24', fontSize: 9, fontWeight: 'bold' }} 
                  />
                  <ReferenceLine 
                    y={70} 
                    stroke="#f43f5e" 
                    strokeDasharray="4 4" 
                    label={{ position: 'top', value: 'Liquidation', fill: '#f43f5e', fontSize: 9, fontWeight: 'bold' }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#7c3aed" 
                    strokeWidth={3} 
                    fill="url(#activeLtvGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Daily Cost</p>
                  <p className="text-xs font-bold text-slate-900">{formatZar(activeDebt.dailyCost)}</p>
               </div>
               <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Next Settlement</p>
                  <p className="text-xs font-bold text-slate-900">01 April 2026</p>
               </div>
            </div>
          </div>
        </div>

        {/* Collateral Summary */}
        <div className="px-6 mb-12">
          <div className="flex items-center justify-between mb-4 px-2">
             <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Locked Collateral</h4>
             <span className="flex items-center gap-1 text-[10px] font-bold text-violet-600">
                <Lock size={12} />
                Secured
             </span>
          </div>
          
          <div className="space-y-3">
            {activeDebt.pledgedAssets.map((asset) => (
              <div key={asset.id} className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-400 text-[10px] tracking-tighter">
                    {asset.code}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{asset.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Contributes {asset.ltvContribution} cover</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{formatZar(asset.value)}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                     <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                     <span className="text-[9px] font-black uppercase text-slate-400">Active</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Area (Offset for Navbar) */}
      <div className="p-6 bg-white border-t border-slate-100 pb-28 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] flex gap-4">
        <button className="flex-1 h-14 rounded-2xl bg-slate-100 text-slate-900 text-[11px] font-bold uppercase tracking-widest active:scale-95 transition-all">
          Manage Assets
        </button>
        <button className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] text-white text-[11px] font-bold uppercase tracking-widest shadow-xl active:scale-95 transition-all">
          Quick Repay
        </button>
      </div>
    </div>
  );
};

export default ActiveLiquidity;