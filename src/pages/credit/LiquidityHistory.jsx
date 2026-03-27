import React, { useState, useEffect } from "react";
import { ChevronLeft, History, Lock, Unlock } from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase";

const LiquidityHistory = ({ onBack, profile }) => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    async function fetchHistory() {
      if (!profile?.id) return;
      const { data } = await supabase.from('loan_application').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });
      setHistory(data || []);
    }
    fetchHistory();
  }, [profile?.id]);

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
            <h2 className="text-3xl font-bold">{formatZar(history.reduce((sum, l) => sum + Number(l.principal_amount), 0))}</h2>
          </div>
          <History className="text-violet-100" size={48} />
        </div>

        <div className="space-y-4">
          {history.map(item => (
            <div key={item.id} className="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${item.status === 'repaid' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400'}`}>
                    {item.status === 'repaid' ? <Unlock size={18} /> : <Lock size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{item.status === 'repaid' ? 'Settled' : 'Pledge'}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(item.created_at).toLocaleDateString('en-ZA')}</p>
                  </div>
                </div>
                <p className="font-bold text-slate-900">{formatZar(item.principal_amount)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiquidityHistory;