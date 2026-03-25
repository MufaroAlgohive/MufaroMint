import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  Activity,
  Search,
  Zap,
  Clock,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  MoreVertical,
  Layers
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { formatZar } from "../../lib/formatCurrency";
import NavigationPill from "../../components/NavigationPill"; // Assuming this is your bottom nav component

const ActiveLiquidity = ({ onBack, onTabChange, profile }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    text: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
  };

  // Mocking active loan/pledge data
  const activeData = useMemo(() => [
    {
      id: "ACT-001",
      asset: "Naspers Ltd",
      code: "NPN",
      principal: 450000,
      interest: 1250.40,
      ltv: 58,
      status: "Healthy",
      dueDate: "2026-04-12",
      collateralValue: 810000
    },
    {
      id: "ACT-002",
      asset: "Capitec Bank",
      code: "CPI",
      principal: 85000,
      interest: 212.15,
      ltv: 64,
      status: "Warning",
      dueDate: "2026-03-30",
      collateralValue: 132000
    }
  ], []);

  const filteredActive = activeData.filter(item =>
    item.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalOutstanding = activeData.reduce((acc, curr) => acc + curr.principal + curr.interest, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in fade-in duration-500">
      {/* Premium Header */}
      <div className="px-6 pt-14 pb-6 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30">
        <button
          onClick={onBack}
          className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:scale-90 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Live Exposure</h3>
          <p className="text-xs font-bold text-violet-600">Active Capital</p>
        </div>
        <button className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
          <Activity size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-40">
        {/* Main Exposure Card */}
        <div className="py-8">
          <div className="bg-gradient-to-br from-violet-600 to-indigo-900 rounded-[36px] p-8 shadow-2xl shadow-violet-200 relative overflow-hidden">
            <div className="relative z-10 text-white">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">Total Outstanding Debt</p>
                  <h2 className="text-4xl font-light tracking-tight" style={{ fontFamily: fonts.display }}>
                    {formatZar(totalOutstanding)}
                  </h2>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20">
                  <TrendingUp className="text-white" size={20} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/10">
                <div>
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Liquidation Buffer</p>
                  <p className="text-sm font-bold">12.4% Average</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Next Settlement</p>
                  <p className="text-sm font-bold">5 Days</p>
                </div>
              </div>
            </div>
            {/* Decorative Elements */}
            <div className="absolute -right-12 -bottom-12 opacity-10 text-white">
              <Zap size={220} />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Filter active pledges..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-violet-500/5 transition-all"
            />
          </div>
        </div>

        {/* Active Pledges List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ongoing Contracts</p>
            <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">{filteredActive.length} Position(s)</span>
          </div>

          {filteredActive.map((item) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={item.id}
              className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
                    <Layers className="text-violet-600" size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{item.asset}</h4>
                    <p className="text-[10px] font-black text-slate-300 uppercase">{item.code} • {item.id}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${item.status === 'Healthy' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-amber-600 bg-amber-50 border-amber-100'
                  }`}>
                  {item.status}
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Current Balance</p>
                  <p className="text-base font-bold text-slate-900">{formatZar(item.principal + item.interest)}</p>
                </div>
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">LTV Status</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-base font-bold ${item.ltv > 60 ? 'text-amber-500' : 'text-slate-900'}`}>{item.ltv}%</p>
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.ltv > 60 ? 'bg-amber-500' : 'bg-violet-600'}`} style={{ width: `${item.ltv}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock size={14} />
                  <p className="text-[10px] font-bold">Due {new Date(item.dueDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</p>
                </div>
                <button className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
                  Manage <ArrowRight size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActiveLiquidity;