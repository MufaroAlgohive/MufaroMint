import React, { useState, useMemo } from "react";
import {
  Check,
  ChevronLeft,
  Landmark,
  Calendar,
  TrendingDown
} from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";

const RepayLiquidity = ({ onBack, fonts }) => {
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // --- Active Loans Available for Early Repayment ---
  const activeLoans = useMemo(() => [
    {
      id: "LN-8821",
      asset: "Naspers Ltd",
      code: "NPN",
      principal: 150000,
      interestAccrued: 1250.40,
      nextPayment: "2026-03-15",
      projectedMonthlyInterest: 1312.50
    },
    {
      id: "LN-9042",
      asset: "Standard Bank",
      code: "SBK",
      principal: 85000,
      interestAccrued: 420.15,
      nextPayment: "2026-04-01",
      projectedMonthlyInterest: 743.75
    },
    {
      id: "LN-9211",
      asset: "Capitec Bank",
      code: "CPI",
      principal: 21450,
      interestAccrued: 88.50,
      nextPayment: "2026-04-10",
      projectedMonthlyInterest: 187.68
    }
  ], []);

  const totalOutstanding = activeLoans.reduce((sum, loan) => sum + loan.principal + loan.interestAccrued, 0);

  // Handler for selecting a specific loan to pay early
  const handleSelectLoan = (loan) => {
    if (selectedLoanId === loan.id) {
      setSelectedLoanId(null);
      setRepayAmount("");
    } else {
      setSelectedLoanId(loan.id);
      setRepayAmount((loan.principal + loan.interestAccrued).toString());
    }
  };

  const handleConfirm = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
    }, 1500);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
        <div className="h-24 w-24 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-8 shadow-inner">
          <Check size={48} strokeWidth={3} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-4" style={{ fontFamily: fonts?.display }}>Early Settlement Received</h2>
        <p className="text-sm text-slate-500 mb-10 font-medium leading-relaxed">
          Your payment of <span className="font-bold text-slate-900">{formatZar(parseFloat(repayAmount))}</span> has been successfully processed. The locked collateral has been released back into your available portfolio.
        </p>
        <button
          onClick={onBack}
          className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center active:scale-95 transition-all">
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
        <div className="text-center">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Settle Debt</h3>
          <p className="text-[10px] font-bold text-violet-600">Early Repayment</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto pb-32">

        {/* Total Outstanding Header */}
        <div className="px-6 pt-8 pb-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Debt Outstanding</p>
          <h2 className="text-4xl font-light text-slate-900 tracking-tight" style={{ fontFamily: fonts?.display }}>
            {formatZar(totalOutstanding)}
          </h2>
        </div>

        {/* Sleek Custom Input Card (Moved Up) */}
        <div className="px-6 mb-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Repayment Amount</span>
              <button
                onClick={() => {
                  const max = selectedLoanId
                    ? activeLoans.find(l => l.id === selectedLoanId).principal + activeLoans.find(l => l.id === selectedLoanId).interestAccrued
                    : totalOutstanding;
                  setRepayAmount(max.toString());
                }}
                className="text-[10px] font-bold text-violet-600 uppercase tracking-wider bg-violet-50 px-3 py-1 rounded-full active:scale-95 transition-all"
              >
                Max
              </button>
            </div>
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
              <span className="text-2xl font-bold text-slate-300">R</span>
              <input
                type="number"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                placeholder="0.00"
                className="w-full text-4xl font-bold text-slate-900 outline-none placeholder:text-slate-200 tracking-tight bg-transparent"
              />
            </div>
          </div>
        </div>

        {/* Payment Methods (Moved Up, Sleek Light Mode, No Mint Wallet) */}
        <div className="px-6 mb-8 space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Source of Funds</p>
          {[
            { id: 'bank', label: 'Linked Bank Account', sub: 'Standard Bank ••• 429', icon: Landmark }
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`w-full flex items-center justify-between p-5 rounded-[24px] border transition-all active:scale-[0.98] ${method === m.id ? 'bg-violet-50 border-violet-200 text-violet-900 shadow-sm' : 'bg-white border-slate-100 text-slate-900 shadow-sm'}`}
            >
              <div className="flex items-center gap-4 text-left">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors ${method === m.id ? 'bg-white shadow-sm' : 'bg-slate-50'}`}>
                  <m.icon size={20} className={method === m.id ? 'text-violet-600' : 'text-slate-400'} />
                </div>
                <div>
                  <p className="text-sm font-bold">{m.label}</p>
                  <p className={`text-[10px] font-medium mt-0.5 ${method === m.id ? 'text-violet-600/70' : 'text-slate-400'}`}>{m.sub}</p>
                </div>
              </div>
              <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${method === m.id ? 'border-violet-600 bg-violet-600' : 'border-slate-200'}`}>
                {method === m.id && <Check size={14} className="text-white" />}
              </div>
            </button>
          ))}
        </div>

        {/* Action Button (Moved Up) */}
        <div className="px-6 mb-10">
          <button
            onClick={handleConfirm}
            disabled={!repayAmount || isProcessing}
            className="w-full h-14 bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale"
          >
            {isProcessing ? "Processing..." : selectedLoanId ? "Settle Loan Early" : "Confirm Repayment"}
          </button>
        </div>

        {/* Loan Selection List (Moved Down) */}
        <div className="px-6 space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 mt-4">Select Loan to Settle</p>
          {activeLoans.map((loan) => {
            const isSelected = selectedLoanId === loan.id;
            const settlementValue = loan.principal + loan.interestAccrued;

            return (
              <button
                key={loan.id}
                onClick={() => handleSelectLoan(loan)}
                className={`w-full text-left bg-white rounded-[24px] p-5 border transition-all relative overflow-hidden ${isSelected ? 'border-violet-500 shadow-md ring-1 ring-violet-500' : 'border-slate-100 shadow-sm active:scale-[0.98]'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight mb-0.5">Loan ID: {loan.id}</p>
                    <h4 className="text-sm font-bold text-slate-900">{loan.asset}</h4>
                  </div>
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-violet-600 bg-violet-600' : 'border-slate-200'}`}>
                    {isSelected && <Check size={14} className="text-white" />}
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Next Payment Date</p>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Calendar size={12} />
                      <p className="text-xs font-bold">{new Date(loan.nextPayment).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Settlement Balance</p>
                    <p className="text-lg font-bold text-slate-900">{formatZar(settlementValue)}</p>
                  </div>
                </div>

                {/* Early Repayment Benefit Banner (Shows only when selected) */}
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