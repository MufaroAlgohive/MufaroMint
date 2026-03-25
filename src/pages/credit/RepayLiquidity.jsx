import React, { useState, useMemo } from "react";
import {
  Check,
  ChevronLeft,
  Landmark,
  Calendar,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  CreditCard
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { formatZar } from "../../lib/formatCurrency";
import NavigationPill from "../../components/NavigationPill";

const RepayLiquidity = ({ onBack, onTabChange, profile }) => {
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    text: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
  };

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
    // Simulate payment gateway delay
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
    }, 2000);
  };

  // --- SUCCESS VIEW ---
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="h-28 w-28 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-10 shadow-inner">
          <Check size={56} strokeWidth={3} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-4" style={{ fontFamily: fonts.display }}>Payment Settled</h2>
        <p className="text-sm text-slate-500 mb-12 font-medium leading-relaxed max-w-[280px]">
          Your payment of <span className="font-bold text-slate-900">{formatZar(parseFloat(repayAmount))}</span> has been successfully processed.
        </p>
        <div className="w-full space-y-3">
          <button
            onClick={onBack}
            className="w-full h-14 bg-slate-900 text-white rounded-[20px] font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all"
          >
            Return to Dashboard
          </button>
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Transaction ID: TXN-88219-MNT</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:scale-90 transition-all">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Repayment</h3>
          <p className="text-xs font-bold text-violet-600">Settle Capital</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto pb-44">
        {/* Total Debt Summary */}
        <div className="px-6 pt-8 pb-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Total Outstanding Debt</p>
          <h2 className="text-5xl font-light text-slate-900 tracking-tight" style={{ fontFamily: fonts.display }}>
            {formatZar(totalOutstanding)}
          </h2>
        </div>

        {/* Amount Input Card */}
        <div className="px-6 mb-6">
          <div className="bg-white rounded-[32px] p-7 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount to Pay</span>
              <button
                onClick={() => {
                  const max = selectedLoanId
                    ? activeLoans.find(l => l.id === selectedLoanId).principal + activeLoans.find(l => l.id === selectedLoanId).interestAccrued
                    : totalOutstanding;
                  setRepayAmount(max.toString());
                }}
                className="text-[10px] font-bold text-violet-600 uppercase tracking-wider bg-violet-50 px-4 py-1.5 rounded-full active:scale-95 transition-all"
              >
                Max
              </button>
            </div>
            <div className="flex items-baseline gap-2 border-b-2 border-slate-50 pb-4">
              <span className="text-3xl font-light text-slate-300">R</span>
              <input
                type="number"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                placeholder="0.00"
                className="w-full text-5xl font-light text-slate-900 outline-none placeholder:text-slate-100 tracking-tighter bg-transparent"
                style={{ fontFamily: fonts.display }}
              />
            </div>
          </div>
        </div>

        {/* Payment Source */}
        <div className="px-6 mb-8">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Payment Method</p>
          <button
            onClick={() => setMethod('bank')}
            className={`w-full flex items-center justify-between p-6 rounded-[28px] border transition-all active:scale-[0.98] bg-white border-slate-100 shadow-sm`}
          >
            <div className="flex items-center gap-4 text-left">
              <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600">
                <Landmark size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Standard Bank Account</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">Savings ••• 429</p>
              </div>
            </div>
            <div className="h-6 w-6 rounded-full bg-violet-600 flex items-center justify-center text-white">
              <Check size={14} />
            </div>
          </button>
        </div>

        {/* Loan Selection List */}
        <div className="px-6 space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Allocate to Specific Loan</p>
          {activeLoans.map((loan) => {
            const isSelected = selectedLoanId === loan.id;
            const settlementValue = loan.principal + loan.interestAccrued;

            return (
              <button
                key={loan.id}
                onClick={() => handleSelectLoan(loan)}
                className={`w-full text-left bg-white rounded-[28px] p-6 border transition-all relative overflow-hidden ${isSelected ? 'border-violet-500 shadow-md ring-1 ring-violet-500' : 'border-slate-100 shadow-sm active:scale-[0.98]'}`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">ID: {loan.id}</p>
                    <h4 className="text-sm font-bold text-slate-900">{loan.asset}</h4>
                  </div>
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-100 bg-slate-50 text-transparent'}`}>
                    <Check size={12} />
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Due Date</p>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Calendar size={12} className="text-slate-400" />
                      <p className="text-[11px] font-bold">{new Date(loan.nextPayment).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Settle Full</p>
                    <p className="text-lg font-bold text-slate-900">{formatZar(settlementValue)}</p>
                  </div>
                </div>

                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-5 pt-5 border-t border-violet-50 flex items-center gap-4"
                  >
                    <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                      <TrendingDown size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase">Interest Saving</p>
                      <p className="text-[10px] text-slate-400 font-medium">Early payment saves {formatZar(loan.projectedMonthlyInterest)} next month.</p>
                    </div>
                  </motion.div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-40">
        <div className="flex flex-col gap-4">
          <button
            onClick={handleConfirm}
            disabled={!repayAmount || isProcessing}
            className="w-full h-16 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              "Authorizing Transfer..."
            ) : (
              <>
                {selectedLoanId ? "Settle Loan Now" : "Pay Outstanding Amount"}
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RepayLiquidity;