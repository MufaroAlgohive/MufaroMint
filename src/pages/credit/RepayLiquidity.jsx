import React, { useState, useEffect } from "react";
import { Check, ChevronLeft, Landmark } from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase";

const RepayLiquidity = ({ onBack, profile }) => {
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function fetchRepayable() {
      if (!profile?.id) return;
      const { data } = await supabase.from('loan_application').select('*').neq('status', 'repaid').eq('user_id', profile.id);
      setLoans(data || []);
    }
    fetchRepayable();
  }, [profile?.id]);

  const handleRepay = async () => {
    setIsProcessing(true);
    // Atomic update to mark as repaid and release credit [cite: 11]
    const { error } = await supabase.from('loan_application').update({ status: 'repaid' }).eq('id', selectedLoan.id);
    if (!error) setIsSuccess(true);
    setIsProcessing(false);
  };

  if (isSuccess) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
      <div className="h-20 w-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-6"><Check size={40} /></div>
      <h2 className="text-2xl font-bold mb-2">Debt Cleared</h2>
      <p className="text-sm text-slate-500 mb-10">Sync script will update your eligibility at 07:00 SAST.</p>
      <button onClick={onBack} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase text-[10px]">Back to Dashboard</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 pt-14 pb-6 flex items-center justify-between bg-white border-b border-slate-100">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center"><ChevronLeft size={20} /></button>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Repayment</p>
        <div className="w-10" />
      </header>

      <div className="p-6">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Active Obligations</p>
        {loans.map(loan => (
          <button key={loan.id} onClick={() => setSelectedLoan(loan)} className={`w-full p-6 rounded-[28px] border mb-3 text-left transition-all ${selectedLoan?.id === loan.id ? 'border-violet-500 bg-violet-50' : 'bg-white border-slate-100'}`}>
            <p className="text-[9px] font-black text-slate-300 uppercase mb-1">Application {loan.id.slice(0, 8)}</p>
            <p className="text-lg font-bold text-slate-900">{formatZar(loan.amount_repayable)}</p>
          </button>
        ))}
      </div>

      <div className="mt-auto p-6 bg-white border-t border-slate-100">
        <button disabled={!selectedLoan || isProcessing} onClick={handleRepay} className="w-full h-16 bg-slate-900 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest active:scale-95">
          {isProcessing ? "Authorizing..." : "Confirm Repayment"}
        </button>
      </div>
    </div>
  );
};

export default RepayLiquidity;