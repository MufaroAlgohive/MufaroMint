import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ShieldCheck, Clock, AlertCircle, Lock, ChevronRight, Calendar, TrendingUp, Search } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase"; //
import NavigationPill from "../../components/NavigationPill";

const ActiveLiquidity = ({ onBack, onTabChange, profile, fonts }) => {
  const [activeLoans, setActiveLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchActiveLoans() {
      if (!profile?.id) return;
      setLoading(true);

      // Fetch open loans and their associated pledged assets
      const { data, error } = await supabase
        .from('loan_application')
        .select(`*, pbc_collateral_pledges(*)`)
        .eq('user_id', profile.id)
        .neq('status', 'repaid')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formatted = data.map(loan => ({
          id: loan.id,
          asset: loan.pbc_collateral_pledges[0]?.symbol || "Multi-Asset Pool",
          code: loan.pbc_collateral_pledges[0]?.symbol || "LP",
          amount: loan.principal_amount,
          nextPayment: loan.first_repayment_date,
          status: loan.status, // e.g., 'approved' or 'overdue'
          ltv: loan.pbc_collateral_pledges[0]?.ltv_applied * 100 || 0,
          interestAccrued: (loan.amount_repayable - loan.principal_amount) || 0
        }));
        setActiveLoans(formatted);
      }
      setLoading(false);
    }
    fetchActiveLoans();
  }, [profile?.id]);

  const totalBalance = activeLoans.reduce((acc, loan) => acc + loan.amount + loan.interestAccrued, 0);
  const overdueCount = activeLoans.filter(l => l.status === "overdue").length; //

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header logic similar to InstantLiquidity */}
      <div className="px-6 pt-14 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-30">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center active:scale-90"><ChevronLeft size={20} /></button>
        <div className="text-center">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live Exposure</h3>
          <p className="text-xs font-bold text-violet-600">{loading ? "Syncing..." : `${activeLoans.length} Active Loans`}</p>
        </div>
        <ShieldCheck className={overdueCount > 0 ? "text-rose-500" : "text-emerald-500"} size={22} />
      </div>

      <div className="flex-1 overflow-y-auto pb-44 px-6">
        {/* Real-time Hero Card */}
        <div className="py-8">
          <div className="bg-gradient-to-br from-violet-50 to-purple-100 rounded-[40px] p-8 shadow-xl relative overflow-hidden">
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-1">Total Outstanding</p>
            <h2 className="text-4xl font-light text-slate-900 mb-6">{formatZar(totalBalance)}</h2>
            <div className="flex justify-between border-t border-violet-200/50 pt-6">
              <div><p className="text-[9px] font-black text-violet-400 uppercase mb-1">Status</p><p className="text-sm font-bold text-emerald-600">Healthy</p></div>
              {overdueCount > 0 && <div className="text-right"><p className="text-[9px] font-black text-rose-400 uppercase mb-1">Attention</p><p className="text-sm font-bold text-rose-600">{overdueCount} Overdue</p></div>}
            </div>
          </div>
        </div>

        {/* Dynamic List */}
        <div className="space-y-4">
          {activeLoans.map(loan => (
            <div key={loan.id} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100"><Lock size={18} className="text-slate-400" /></div>
                  <div><h4 className="text-sm font-bold text-slate-900">{loan.asset}</h4><p className="text-[10px] font-bold text-slate-300 uppercase">ID: {loan.id}</p></div>
                </div>
                <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${loan.status === 'overdue' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{loan.status}</span>
              </div>
              <div className="flex justify-between items-end pt-4 border-t border-slate-50">
                <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Settlement</p><p className="font-bold text-slate-900">{formatZar(loan.amount + loan.interestAccrued)}</p></div>
                <button className="text-[10px] font-black text-violet-600 uppercase flex items-center gap-1">Details <ChevronRight size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-10 left-0 right-0 z-50 flex justify-center px-6">
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl rounded-full px-2 py-2">
          <NavigationPill activeTab="credit" onTabChange={onTabChange} />
        </div>
      </div>
    </div>
  );
};

export default ActiveLiquidity;