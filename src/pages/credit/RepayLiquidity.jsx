import React, { useState, useEffect, useMemo } from "react";
import { Check, ChevronLeft, Landmark, Calendar, TrendingDown } from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase"; //

const RepayLiquidity = ({ onBack, profile, fonts }) => {
  const [activeLoans, setActiveLoans] = useState([]);
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function getLoans() {
      if (!profile?.id) return;
      const { data } = await supabase.from('loan_application').select('*').eq('user_id', profile.id).neq('status', 'repaid');
      if (data) setActiveLoans(data);
    }
    getLoans();
  }, [profile?.id]);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      // 1. Update Loan Status
      const { error: loanErr } = await supabase
        .from('loan_application')
        .update({ status: 'repaid', updated_at: new Date().toISOString() })
        .eq('id', selectedLoanId);

      if (loanErr) throw loanErr;

      // 2. Reduce Global Credit Balance
      const { data: account } = await supabase.from('credit_accounts').select('loan_balance').eq('user_id', profile.id).single();
      await supabase.from('credit_accounts').update({
        loan_balance: Math.max(0, (account?.loan_balance || 0) - parseFloat(repayAmount))
      }).eq('user_id', profile.id);

      setIsSuccess(true);
    } catch (err) {
      alert("Settlement failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
      <div className="h-20 w-20 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-6"><Check size={40} /></div>
      <h2 className="text-2xl font-bold mb-2">Debt Settled</h2>
      <p className="text-slate-500 mb-10 text-sm">Collateral is now being released back to your portfolio.</p>
      <button onClick={onBack} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase text-[10px]">Back to Dashboard</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right">
      {/* Full UI from your provided RepayLiquidity file */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center"><ChevronLeft size={20} /></button>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Settle Debt</h3>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Requested Repayment</p>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 mb-8">
          <input
            type="number"
            value={repayAmount}
            onChange={(e) => setRepayAmount(e.target.value)}
            className="text-4xl font-bold text-slate-900 w-full outline-none"
            placeholder="0.00"
          />
        </div>

        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Select Active Loan</p>
          {activeLoans.map(loan => (
            <button
              key={loan.id}
              onClick={() => { setSelectedLoanId(loan.id); setRepayAmount(loan.amount_repayable); }}
              className={`w-full p-6 rounded-[28px] border text-left transition-all ${selectedLoanId === loan.id ? 'border-violet-500 bg-violet-50' : 'bg-white border-slate-100'}`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">ID: {loan.id}</span>
                {selectedLoanId === loan.id && <Check size={16} className="text-violet-600" />}
              </div>
              <p className="font-bold text-slate-900">{formatZar(loan.amount_repayable)}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <button
          disabled={!selectedLoanId || isProcessing}
          onClick={handleConfirm}
          className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl disabled:opacity-30"
        >
          {isProcessing ? "Authorizing..." : "Confirm Settlement"}
        </button>
      </div>
    </div>
  );
};

export default RepayLiquidity;