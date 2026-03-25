import React, { useState, useMemo, useEffect } from "react";
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
import { supabase } from "../../lib/supabase";
import NavigationPill from "../../components/NavigationPill";
import NotificationBell from "../../components/NotificationBell";

const ActiveLiquidity = ({ onBack, fonts, profile, onTabChange, onOpenNotifications }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeLoans, setActiveLoans] = useState([]);
  const itemsPerPage = 6;

  // --- LIVE DATA FETCHING ---
  useEffect(() => {
    async function fetchActiveLoans() {
      if (!profile?.id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('loan_application')
        .select(`
          id, principal_amount, created_at, status,
          pbc_collateral_pledges (
            symbol, pledged_value,
            securities ( name, margin_call_pct )
          )
        `)
        .eq('user_id', profile.id)
        .eq('status', 'approved');

      if (!error && data) {
        const formatted = data.map(loan => {
          const pledge = loan.pbc_collateral_pledges[0];
          const ltvValue = pledge ? (loan.principal_amount / pledge.pledged_value) * 100 : 0;
          return {
            id: loan.id.split('-')[0].toUpperCase(),
            asset: pledge?.securities?.name || "Asset",
            code: pledge?.symbol || "TICKER",
            amount: loan.principal_amount,
            nextPayment: loan.created_at,
            status: loan.status === 'approved' ? 'active' : loan.status,
            ltv: ltvValue,
            interestAccrued: loan.principal_amount * 0.015, // Derived interest
            marginCall: (pledge?.securities?.margin_call_pct || 0.65) * 100
          };
        });
        setActiveLoans(formatted);
      }
      setLoading(false);
    }
    fetchActiveLoans();
  }, [profile?.id]);

  const filteredLoans = useMemo(() => {
    return activeLoans.filter(loan =>
      loan.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeLoans, searchQuery]);

  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);
  const paginatedLoans = filteredLoans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen pb-32 bg-[#f8f6fa]">
      <header className="px-5 pt-12 pb-8 flex items-center justify-between bg-[#0d0d12] text-white">
        <div className="flex items-center gap-2">
          <img src="/assets/mint-logo.png" alt="Mint" className="h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-70" style={{ fontFamily: fonts?.display }}>credit</span>
        </div>
        <NavigationPill activeTab="credit" onTabChange={onTabChange} />
        <NotificationBell onClick={onOpenNotifications} />
      </header>

      <div className="p-6">
        <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={onBack}>
          <ChevronLeft className="text-slate-400" />
          <h2 className="text-xl font-bold" style={{ fontFamily: fonts?.display }}>Active Pledges</h2>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search active loans..."
            className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center text-[10px] font-black uppercase tracking-widest animate-pulse opacity-40">Syncing Vault...</div>
          ) : paginatedLoans.map((loan) => (
            <div key={loan.id} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm overflow-hidden relative">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{loan.id}</p>
                    <h3 className="font-bold text-slate-900">{loan.asset} ({loan.code})</h3>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Principal</p>
                  <p className="text-lg font-black" style={{ fontFamily: fonts?.display }}>{formatZar(loan.amount)}</p>
                </div>
              </div>

              <div className="h-24 w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[{ ltv: 0 }, { ltv: loan.ltv * 0.5 }, { ltv: loan.ltv }]}>
                    <defs>
                      <linearGradient id={`grad-${loan.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="ltv" stroke="#7c3aed" strokeWidth={2} fill={`url(#grad-${loan.id})`} />
                    <ReferenceLine y={loan.marginCall} stroke="#f59e0b" strokeDasharray="3 3" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-slate-400" />
                  <p className="text-[11px] font-bold text-slate-500 uppercase">{new Date(loan.nextPayment).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <AlertCircle size={14} className={loan.ltv > loan.marginCall ? "text-rose-500" : "text-emerald-500"} />
                  <p className={`text-[11px] font-black uppercase ${loan.ltv > loan.marginCall ? "text-rose-600" : "text-emerald-600"}`}>
                    {loan.ltv.toFixed(1)}% LTV
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-violet-600"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Page {currentPage} of {totalPages}</p>
            </div>
            <div className="flex gap-3">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm"><ChevronLeft size={20} /></button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg"><ChevronRight size={20} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveLiquidity;