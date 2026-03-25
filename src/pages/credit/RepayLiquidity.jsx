import React, { useState, useEffect } from "react";
import { ChevronLeft, Landmark, Calendar, TrendingDown } from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase";
import NavigationPill from "../../components/NavigationPill";
import NotificationBell from "../../components/NotificationBell";

const RepayLiquidity = ({ onBack, fonts, profile, onTabChange, onOpenNotifications }) => {
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeLoans, setActiveLoans] = useState([]);

  useEffect(() => {
    async function fetchLoans() {
      if (!profile?.id) return;
      setLoading(true);
      const { data } = await supabase
        .from('loan_application')
        .select(`
          id, principal_amount, created_at,
          pbc_collateral_pledges ( symbol, securities ( name ) )
        `)
        .eq('user_id', profile.id)
        .eq('status', 'approved');

      if (data) {
        setActiveLoans(data.map(loan => ({
          id: loan.id.split('-')[0].toUpperCase(),
          asset: loan.pbc_collateral_pledges[0]?.securities?.name || "Asset",
          code: loan.pbc_collateral_pledges[0]?.symbol || "TICKER",
          principal: loan.principal_amount,
          interestAccrued: loan.principal_amount * 0.015,
          nextPayment: new Date(new Date(loan.created_at).setMonth(new Date(loan.created_at).getMonth() + 1)),
          projectedMonthlyInterest: loan.principal_amount * 0.008
        })));
      }
      setLoading(false);
    }
    fetchLoans();
  }, [profile?.id]);

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
          <h2 className="text-xl font-bold" style={{ fontFamily: fonts?.display }}>Repay Capital</h2>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center text-[10px] font-black uppercase tracking-widest animate-pulse opacity-40">Syncing Debt Records...</div>
          ) : activeLoans.map((loan) => {
            const isSelected = selectedLoanId === loan.id;
            const settlementValue = loan.principal + loan.interestAccrued;

            return (
              <button
                key={loan.id}
                onClick={() => setSelectedLoanId(isSelected ? null : loan.id)}
                className={`w-full bg-white p-6 rounded-[32px] border text-left transition-all duration-300 ${isSelected ? "border-violet-600 shadow-xl ring-1 ring-violet-600/10" : "border-slate-100 shadow-sm"
                  }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors ${isSelected ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-600"}`}>
                      <Landmark size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{loan.id}</p>
                      <h3 className="font-bold text-slate-900">{loan.asset} ({loan.code})</h3>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar size={12} />
                      <p className="text-xs font-bold">{new Date(loan.nextPayment).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Settlement Balance</p>
                    <p className="text-lg font-bold text-slate-900" style={{ fontFamily: fonts?.display }}>{formatZar(settlementValue)}</p>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-violet-100 flex items-center gap-3 animate-in slide-in-from-top-2">
                    <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                      <TrendingDown size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase">Early Settlement Benefit</p>
                      <p className="text-[10px] text-slate-500 font-medium">Saves ~{formatZar(loan.projectedMonthlyInterest)} in projected future interest.</p>
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  );
};

export default RepayLiquidity;