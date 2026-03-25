// src/pages/credit/LiquidityHistory.jsx
import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, History, ReceiptText, Clock, X } from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase";
import NavigationPill from "../../components/NavigationPill";
import NotificationBell from "../../components/NotificationBell";

const LiquidityHistory = ({ onBack, profile, onTabChange, onOpenNotifications }) => {
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    async function fetchHistory() {
      if (!profile?.id) return;
      setLoading(true);
      const { data } = await supabase
        .from('loan_application')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (data) setHistoryData(data);
      setLoading(false);
    }
    fetchHistory();
  }, [profile?.id]);

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
          <h2 className="text-xl font-bold">Credit History</h2>
        </div>

        {loading ? (
          <div className="text-center py-20 opacity-40 text-[10px] font-black uppercase tracking-widest animate-pulse">Syncing Ledger...</div>
        ) : (
          <div className="space-y-4">
            {historyData.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-[24px] border border-slate-100 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <ReceiptText size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{formatZar(item.principal_amount)}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="text-[9px] font-black px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full uppercase">{item.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiquidityHistory;