// src/pages/credit/RepayLiquidity.jsx
import React, { useState, useEffect } from "react";
import { Check, ChevronLeft, Landmark, Building2, AlertCircle, X } from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase";
import NavigationPill from "../../components/NavigationPill";
import NotificationBell from "../../components/NotificationBell";

const RepayLiquidity = ({ onBack, profile, onTabChange, onOpenNotifications }) => {
  const [activeLoans, setActiveLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) fetchLoans();
  }, [profile?.id]);

  async function fetchLoans() {
    setLoading(true);
    const { data } = await supabase
      .from('loan_application')
      .select('*')
      .eq('user_id', profile.id)
      .eq('status', 'approved');
    if (data) setActiveLoans(data);
    setLoading(false);
  }

  return (
    <div className="min-h-screen pb-32 bg-[#f8f6fa]">
      <header className="px-5 pt-12 pb-8 flex items-center justify-between bg-[#0d0d12] text-white">
        <div className="flex items-center gap-2">
          <img src="/assets/mint-logo.png" alt="Mint" className="h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-70">credit</span>
        </div>
        <NavigationPill activeTab="credit" onTabChange={onTabChange} />
        <NotificationBell onClick={onOpenNotifications} />
      </header>

      <div className="p-6">
        <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={onBack}>
          <ChevronLeft className="text-slate-400" />
          <h2 className="text-xl font-bold">Repay Capital</h2>
        </div>

        {loading ? (
          <div className="text-center py-20 opacity-40 text-[10px] font-black uppercase tracking-widest animate-pulse">Checking Debt Records...</div>
        ) : (
          <div className="space-y-4">
            {activeLoans.map(loan => (
              <div key={loan.id} className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><Landmark size={20} /></div>
                    <p className="font-bold text-slate-900">Principal Debt</p>
                  </div>
                  <p className="text-lg font-black">{formatZar(loan.principal_amount)}</p>
                </div>
                <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95">Initiate Repayment</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RepayLiquidity;