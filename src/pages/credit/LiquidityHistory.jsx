import React, { useState, useEffect } from "react";
import { ChevronLeft, History, ReceiptText, Lock, Unlock, Search } from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase"; //

const LiquidityHistory = ({ onBack, profile, fonts }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      if (!profile?.id) return;
      const { data, error } = await supabase
        .from('loan_application')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setHistory(data.map(item => ({
          id: item.id,
          type: item.status === 'repaid' ? 'repayment' : 'pledge', //
          amount: item.principal_amount,
          date: item.created_at,
          status: item.status,
          details: item.status === 'repaid' ? 'Full loan settlement' : 'Collateralized drawdown'
        })));
      }
      setLoading(false);
    }
    fetchHistory();
  }, [profile?.id]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right">
      <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center"><ChevronLeft size={20} /></button>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Archive</h3>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        {/* Performance Card */}
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-[32px] p-8 border border-violet-100 mb-10 shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-1">Lifetime Events</p>
          <h2 className="text-3xl font-bold text-slate-900">{history.length} Transactions</h2>
          <History size={120} className="absolute -right-8 -bottom-8 opacity-5 text-violet-900" />
        </div>

        <div className="space-y-4">
          {history.map(item => (
            <div key={item.id} className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${item.type === 'pledge' ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                    {item.type === 'pledge' ? <Lock size={18} className="text-rose-500" /> : <Unlock size={18} className="text-emerald-500" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 uppercase">{item.type}</h4>
                    <p className="text-[9px] font-bold text-slate-400">{new Date(item.date).toLocaleDateString('en-ZA')}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-900">{formatZar(item.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiquidityHistory;