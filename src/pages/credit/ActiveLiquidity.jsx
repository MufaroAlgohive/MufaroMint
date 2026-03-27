import React, { useState, useEffect } from "react";
import { ChevronLeft, ShieldCheck, Lock, Calendar, AlertCircle } from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase";
import NavigationPill from "../../components/NavigationPill";

const ActiveLiquidity = ({ onBack, onTabChange, profile, fonts }) => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActive() {
      if (!profile?.id) return;
      setLoading(true);
      // Fetch loans joined with securities to get live sync data [cite: 6, 17]
      const { data, error } = await supabase
        .from('loan_application')
        .select(`
          *,
          pbc_collateral_pledges (
            symbol,
            loan_value,
            security_id,
            securities (
              last_price,
              ltv_pct,
              margin_call_pct,
              auto_liq_pct,
              liquidity_grading
            )
          )
        `)
        .eq('user_id', profile.id)
        .neq('status', 'repaid');

      if (!error) setLoans(data || []);
      setLoading(false);
    }
    fetchActive();
  }, [profile?.id]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 pt-14 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-30">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center"><ChevronLeft size={20} /></button>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Exposure</p>
          <p className="text-xs font-bold text-violet-600">Sync Active (07:00 SAST)</p>
        </div>
        <ShieldCheck className="text-emerald-500" size={22} />
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-40">
        {loans.map(loan => {
          const pledge = loan.pbc_collateral_pledges?.[0];
          const sec = pledge?.securities;
          // Calculate current LTV based on live last_price from Yahoo 
          const currentLtv = (loan.principal_amount / pledge?.pledged_value) * 100;
          const isAtRisk = currentLtv >= (sec?.margin_call_pct * 100);

          return (
            <div key={loan.id} className={`bg-white rounded-[32px] p-6 border mt-6 ${isAtRisk ? 'border-rose-200 bg-rose-50/30' : 'border-slate-100'}`}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                    <Lock size={20} className={isAtRisk ? "text-rose-500" : "text-violet-600"} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{pledge?.symbol}</h4>
                    <span className="text-[8px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">{sec?.liquidity_grading}</span>
                  </div>
                </div>
                {isAtRisk && <AlertCircle className="text-rose-500" size={20} />}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Current LTV</p>
                  <p className={`text-lg font-bold ${isAtRisk ? 'text-rose-600' : 'text-slate-900'}`}>{currentLtv.toFixed(1)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Margin Call</p>
                  <p className="text-lg font-bold text-slate-400">{(sec?.margin_call_pct * 100).toFixed(0)}%</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActiveLiquidity;