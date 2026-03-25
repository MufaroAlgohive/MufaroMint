// src/pages/credit/ActiveLiquidity.jsx
import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft, ShieldCheck, Clock, AlertCircle, Lock, ChevronRight,
  Calendar, Search, X, ShieldAlert, Zap
} from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase";
import NavigationPill from "../../components/NavigationPill";
import NotificationBell from "../../components/NotificationBell";

const ActiveLiquidity = ({ onBack, profile, onTabChange, onOpenNotifications }) => {
  const [loading, setLoading] = useState(true);
  const [activeLoans, setActiveLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => { setPortalTarget(document.body); }, []);

  useEffect(() => {
    async function fetchActiveLoans() {
      if (!profile?.id) return;
      setLoading(true);
      // Join loans with collateral pledges and securities to get live risk thresholds
      const { data, error } = await supabase
        .from('loan_application')
        .select(`
          *,
          pbc_collateral_pledges (
            symbol, pledged_value, recognised_value, ltv_applied,
            securities ( logo_url, margin_call_pct, auto_liq_pct )
          )
        `)
        .eq('user_id', profile.id)
        .eq('status', 'approved');

      if (!error) setActiveLoans(data);
      setLoading(false);
    }
    fetchActiveLoans();
  }, [profile?.id]);

  return (
    <div className="min-h-screen pb-32 relative text-slate-900 bg-[#f8f6fa]">
      <header className="px-5 pt-12 pb-8 flex items-center justify-between bg-[#0d0d12] text-white">
        <div className="flex items-center gap-2">
          <img src="/assets/mint-logo.png" alt="Mint" className="h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-70">credit</span>
        </div>
        <NavigationPill activeTab="credit" onTabChange={onTabChange} />
        <NotificationBell onClick={onOpenNotifications} />
      </header>

      <div className="p-6">
        <div className="flex items-center gap-3 mb-8" onClick={onBack}>
          <ChevronLeft className="text-slate-400" />
          <h2 className="text-xl font-bold">Active Pledges</h2>
        </div>

        {loading ? (
          <div className="py-20 text-center text-[10px] font-black uppercase tracking-widest animate-pulse opacity-40">Retrieving Vault Data...</div>
        ) : activeLoans.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[32px] border border-slate-100">
            <p className="text-slate-400 font-medium">No active credit positions found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeLoans.map((loan) => (
              <button
                key={loan.id}
                onClick={() => setSelectedLoan(loan)}
                className="w-full bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm text-left flex justify-between items-center active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Principal</p>
                    <p className="text-lg font-bold">{formatZar(loan.principal_amount)}</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-300" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* --- DETAILED LOAN AUDIT MODAL --- */}
      {selectedLoan && portalTarget && createPortal(
        <div className="fixed inset-0 z-[150] bg-white flex flex-col animate-in slide-in-from-right duration-300">
          <div className="px-6 pt-12 pb-6 flex items-center justify-between border-b border-slate-100">
            <button onClick={() => setSelectedLoan(null)} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center"><X /></button>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Position Health</h3>
            <div className="w-10" />
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="mb-10 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Debt</p>
              <p className="text-4xl font-bold tracking-tight">{formatZar(selectedLoan.principal_amount)}</p>
            </div>

            {/* DYNAMIC RISK BARS */}
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-[28px] p-6 border border-slate-100">
                <div className="flex justify-between mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Margin Call Trigger</span>
                  <span className="text-xs font-bold text-amber-600">{(selectedLoan.pbc_collateral_pledges[0]?.securities?.margin_call_pct * 100).toFixed(0)}% LTV</span>
                </div>
                <div className="relative h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${(selectedLoan.principal_amount / selectedLoan.pbc_collateral_pledges[0]?.pledged_value) * 100}%` }} />
                </div>
              </div>

              <div className="bg-slate-50 rounded-[28px] p-6 border border-slate-100">
                <div className="flex justify-between mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Auto-Liquidation</span>
                  <span className="text-xs font-bold text-rose-600">{(selectedLoan.pbc_collateral_pledges[0]?.securities?.auto_liq_pct * 100).toFixed(0)}% LTV</span>
                </div>
                <div className="relative h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500" style={{ width: `${(selectedLoan.principal_amount / selectedLoan.pbc_collateral_pledges[0]?.pledged_value) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
        , portalTarget)}
    </div>
  );
};

export default ActiveLiquidity;