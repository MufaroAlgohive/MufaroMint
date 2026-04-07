import React, { useState, useEffect } from "react";
import { ChevronLeft, History, Lock, Unlock } from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase";

const LiquidityHistory = ({ onBack, profile }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      if (!profile?.id) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('credit_transactions_history')
        .select('id, transaction_type, direction, amount, occurred_at, description, loan_application_id')
        .eq('user_id', profile.id)
        .eq('loan_type', 'secured')
        .order('occurred_at', { ascending: false });
      if (error) {
        console.warn('Failed to fetch secured credit history:', error.message || error);
        setHistory([]);
      } else {
        setHistory(data || []);
      }
      setLoading(false);
    }
    fetchHistory();
  }, [profile?.id]);

  const lifetimeBorrowed = history
    .filter((row) => String(row?.direction || '').toLowerCase() === 'credit')
    .reduce((sum, row) => sum + Number(row?.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 pt-14 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-30">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center"><ChevronLeft size={20} /></button>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Archive</p>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="bg-white rounded-[32px] p-8 border border-slate-100 mb-8 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-1">Lifetime Borrowed</p>
            <h2 className="text-3xl font-bold">{formatZar(lifetimeBorrowed)}</h2>
          </div>
          <History className="text-violet-100" size={48} />
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm text-[12px] text-slate-400 text-center">
              Loading history…
            </div>
          ) : history.length === 0 ? (
            <div className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm text-[12px] text-slate-400 text-center">
              No secured transaction history found.
            </div>
          ) : history.map(item => {
            const isCredit = String(item?.direction || '').toLowerCase() === 'credit';
            const title = item?.description || String(item?.transaction_type || 'transaction').replace(/_/g, ' ');
            const amount = `${isCredit ? '+' : '-'}${formatZar(Number(item?.amount || 0))}`;
            const txDate = item?.occurred_at ? new Date(item.occurred_at).toLocaleDateString('en-ZA') : '—';

            return (
              <div key={item.id} className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${isCredit ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400'}`}>
                      {isCredit ? <Unlock size={18} /> : <Lock size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{title}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{txDate}</p>
                    </div>
                  </div>
                  <p className={`font-bold ${isCredit ? 'text-emerald-600' : 'text-slate-900'}`}>{amount}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LiquidityHistory;