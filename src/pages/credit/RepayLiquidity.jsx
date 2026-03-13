import React, { useState, useMemo, useEffect } from "react";
import { 
  Check, 
  ChevronLeft, 
  Landmark, 
  Calendar,
  TrendingDown,
  Clock,
  Plus,
  Building2,
  AlertCircle,
  X
} from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase";

const RepayLiquidity = ({ onBack, fonts, profile }) => {
  const [activeLoans, setActiveLoans] = useState([]);
  const [linkedBank, setLinkedBank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Bank Linking State
  const [showAddBank, setShowAddBank] = useState(false);
  const [bankData, setBankData] = useState({ name: "", account: "" });

  useEffect(() => {
    if (profile?.id) {
      fetchData();
    }
  }, [profile?.id]);

  async function fetchData() {
    setLoading(true);
    try {
      await Promise.all([fetchLoans(), fetchBank()]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBank() {
    const { data } = await supabase
      .from('linked_bank_accounts')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();
    if (data) setLinkedBank(data);
  }

  async function fetchLoans() {
    const { data } = await supabase
      .from('loan_application')
      .select(`
        id, principal_amount, amount_repayable, interest_rate,
        first_repayment_date, status, pbc_collateral_pledges (symbol)
      `)
      .eq('user_id', profile.id)
      .in('status', ['approved', 'active', 'partially_paid'])
      .order('created_at', { ascending: false });

    if (data) {
      setActiveLoans(data.map(loan => ({
        id: `LN-${loan.id.toString().slice(-4)}`,
        dbId: loan.id,
        asset: loan.pbc_collateral_pledges?.[0]?.symbol || "Portfolio Pool",
        principal: loan.principal_amount,
        interestAccrued: loan.amount_repayable - loan.principal_amount,
        nextPayment: loan.first_repayment_date,
        projectedMonthlyInterest: (loan.amount_repayable * (loan.interest_rate / 100)) / 12
      })));
    }
  }

  const handleLinkBank = async () => {
    if (!bankData.name || !bankData.account) return;
    setIsProcessing(true);
    try {
      const { data, error } = await supabase
        .from('linked_bank_accounts')
        .insert([{
          user_id: profile.id,
          bank_name: bankData.name,
          account_number: bankData.account,
          account_holder: `${profile.first_name} ${profile.last_name}`,
          verification_status: 'verified'
        }])
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('required_actions')
        .update({ bank_linked: true, bank_linked_at: new Date().toISOString() })
        .eq('user_id', profile.id);

      setLinkedBank(data);
      setShowAddBank(false);
    } catch (err) {
      alert("Failed to link bank account.");
    } finally {
      setIsProcessing(false);
    }
  };

  const totalOutstanding = useMemo(() => 
    activeLoans.reduce((sum, loan) => sum + loan.principal + loan.interestAccrued, 0), 
  [activeLoans]);

  const handleConfirmRepayment = async () => {
    if (!repayAmount || isProcessing || !linkedBank) return;
    setIsProcessing(true);
    try {
      const amount = parseFloat(repayAmount);
      const { data: account } = await supabase.from('credit_accounts').select('loan_balance').eq('user_id', profile.id).single();
      
      await supabase.from('credit_accounts').update({
        loan_balance: Math.max(0, (account?.loan_balance || 0) - amount),
        updated_at: new Date().toISOString()
      }).eq('user_id', profile.id);

      if (selectedLoanId) {
        const loan = activeLoans.find(l => l.id === selectedLoanId);
        const remaining = (loan.principal + loan.interestAccrued) - amount;
        await supabase.from('loan_application').update({
          amount_repayable: Math.max(0, remaining),
          status: remaining <= 0 ? 'completed' : 'partially_paid'
        }).eq('id', loan.dbId);
      }
      setIsSuccess(true);
    } catch (err) {
      alert("Repayment failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
          <div className="h-24 w-24 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-8 shadow-inner">
              <Check size={48} strokeWidth={3} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Repayment Received</h2>
          <p className="text-sm text-slate-500 mb-10 font-medium">Your payment of <span className="font-bold text-slate-900">{formatZar(parseFloat(repayAmount))}</span> was processed via {linkedBank?.bank_name}.</p>
          <button onClick={onBack} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs">Return to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="px-6 pt-12 pb-6 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center"><ChevronLeft size={20} /></button>
        <div className="text-center">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Settle Debt</h3>
            <p className="text-[10px] font-bold text-violet-600">Early Repayment</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="px-6 pt-8 pb-4 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Debt Outstanding</p>
            <h2 className="text-4xl font-light text-slate-900 tracking-tight" style={{ fontFamily: fonts?.display }}>
                {loading ? "..." : formatZar(totalOutstanding)}
            </h2>
        </div>

        {/* Repayment Input */}
        <div className="px-6 mb-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount to Repay</span>
                    <button onClick={() => setRepayAmount(totalOutstanding.toFixed(2))} className="text-[10px] font-bold text-violet-600 uppercase bg-violet-50 px-3 py-1 rounded-full">Max</button>
                </div>
                <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                    <span className="text-2xl font-bold text-slate-300">R</span>
                    <input type="number" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} placeholder="0.00" className="w-full text-4xl font-bold text-slate-900 outline-none bg-transparent" />
                </div>
            </div>
        </div>

        {/* Source of Funds / Bank Linking */}
        <div className="px-6 mb-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Source of Funds</p>
            {!linkedBank ? (
                <button onClick={() => setShowAddBank(true)} className="w-full flex flex-col items-center justify-center p-8 rounded-[32px] border-2 border-dashed border-slate-200 bg-white hover:bg-slate-50 transition-all group">
                    <div className="h-12 w-12 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Plus size={24} />
                    </div>
                    <p className="text-sm font-bold text-slate-900">Link Bank Account</p>
                    <p className="text-[10px] text-slate-400 mt-1">Required for debt settlement</p>
                </button>
            ) : (
                <div className="w-full flex items-center justify-between p-5 rounded-[24px] border bg-violet-50 border-violet-200 text-violet-900">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                            <Landmark size={20} className="text-violet-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold">{linkedBank.bank_name}</p>
                            <p className="text-[10px] font-medium opacity-70">•••• {linkedBank.account_number.slice(-4)}</p>
                        </div>
                    </div>
                    <Check className="text-violet-600" size={20} />
                </div>
            )}
        </div>

        <div className="px-6 mb-10">
            <button 
                onClick={handleConfirmRepayment} 
                disabled={!repayAmount || isProcessing || !linkedBank} 
                className="w-full h-14 bg-gradient-to-r from-[#111111] via-[#3b1b7a] to-[#5b21b6] text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl disabled:opacity-30"
            >
                {isProcessing ? "Processing..." : "Confirm & Pay"}
            </button>
        </div>

        {/* Loan List */}
        <div className="px-6 space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Select Specific Loan</p>
            {loading ? (
                <div className="text-center py-10 opacity-40 text-[10px] font-black uppercase tracking-widest animate-pulse">Checking Ledger...</div>
            ) : activeLoans.length === 0 ? (
                <div className="p-10 border-2 border-dashed border-slate-200 rounded-[32px] text-center">
                    <AlertCircle className="mx-auto text-slate-200 mb-3" size={32} />
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">No Active Debt Found</p>
                </div>
            ) : (
                activeLoans.map((loan) => (
                    <button key={loan.id} onClick={() => setSelectedLoanId(selectedLoanId === loan.id ? null : loan.id)} className={`w-full text-left bg-white rounded-[24px] p-5 border transition-all ${selectedLoanId === loan.id ? 'border-violet-500 ring-1 ring-violet-500 shadow-md' : 'border-slate-100 shadow-sm'}`}>
                        <div className="flex justify-between mb-4">
                            <div><p className="text-[9px] font-black text-slate-400 uppercase">{loan.id}</p><h4 className="text-sm font-bold text-slate-900">{loan.asset}</h4></div>
                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${selectedLoanId === loan.id ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-200'}`}>{selectedLoanId === loan.id && <Check size={12} />}</div>
                        </div>
                        <div className="flex justify-between items-end">
                            <div><p className="text-[9px] font-bold text-slate-400 uppercase">Due</p><p className="text-xs font-bold text-slate-600">{new Date(loan.nextPayment).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</p></div>
                            <p className="text-lg font-bold text-slate-900">{formatZar(loan.principal + loan.interestAccrued)}</p>
                        </div>
                    </button>
                ))
            )}
        </div>
      </div>

      {/* Add Bank Modal */}
      {showAddBank && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-6">
              <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center"><Building2 /></div>
                    <button onClick={() => setShowAddBank(false)} className="text-slate-300"><X /></button>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-6">Link Your Bank</h3>
                  <div className="space-y-4 mb-8">
                      <input type="text" placeholder="Bank Name" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" value={bankData.name} onChange={e => setBankData({...bankData, name: e.target.value})} />
                      <input type="number" placeholder="Account Number" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm" value={bankData.account} onChange={e => setBankData({...bankData, account: e.target.value})} />
                  </div>
                  <button onClick={handleLinkBank} disabled={isProcessing} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg">{isProcessing ? "Verifying..." : "Link & Continue"}</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default RepayLiquidity;