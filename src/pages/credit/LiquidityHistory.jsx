import React, { useState, useEffect } from "react";
import { ChevronLeft, Clock, ArrowUpRight, ArrowDownRight, History, Search } from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase";

const LiquidityHistory = ({ onBack, profile, fonts }) => {
  const [transactions, setTransactions] = useState([]);
  const [lifetimeBorrowed, setLifetimeBorrowed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchHistory() {
      if (!profile?.id) return;
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('loan_application')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const loans = data || [];
        let txs = [];
        let totalBorrowed = 0;

        loans.forEach(loan => {
          totalBorrowed += Number(loan.principal_amount || 0);

          // 1. Disbursement Event (Money received)
          txs.push({
            id: `${loan.id}-disb`,
            type: 'disbursement',
            description: 'Facility Disbursement',
            amount: Number(loan.principal_amount),
            date: loan.created_at,
            status: 'completed',
            originalId: loan.id
          });

          // 2. Repayment Event (Money paid or pending)
          if (loan.status === 'repaid') {
            txs.push({
              id: `${loan.id}-rep`,
              type: 'repayment',
              description: 'Facility Settlement',
              amount: -Number(loan.amount_repayable || loan.principal_amount),
              date: loan.updated_at || loan.created_at,
              status: 'completed',
              originalId: loan.id
            });
          } else {
            txs.push({
              id: `${loan.id}-rep-pend`,
              type: 'pending_repayment',
              description: 'Scheduled Settlement',
              amount: -Number(loan.amount_repayable || loan.principal_amount),
              date: loan.first_repayment_date || loan.created_at,
              status: 'pending',
              originalId: loan.id
            });
          }
        });

        // Sort all derived transactions by date, newest first
        txs.sort((a, b) => new Date(b.date) - new Date(a.date));

        setTransactions(txs);
        setLifetimeBorrowed(totalBorrowed);
      } catch (err) {
        console.error("Error fetching history:", err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [profile?.id]);

  const filteredTransactions = transactions.filter(tx =>
    tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.originalId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-32 relative text-slate-900 overflow-x-hidden">
      {/* Sticky Header */}
      <div className="px-5 pt-14 pb-6 sticky top-0 bg-slate-50/80 backdrop-blur-xl z-30 border-b border-slate-100/50">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm active:scale-95 transition-all"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: fonts?.display }}>Transaction History</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              All Liquidity Transactions
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6 space-y-6">
        {/* Summary Card */}
        <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/40 border border-slate-100 flex justify-between items-center animate-in slide-in-from-bottom-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-1">Lifetime Borrowed</p>
            <h2 className="text-3xl font-light tracking-tight text-slate-900" style={{ fontFamily: fonts?.display }}>
              {formatZar(lifetimeBorrowed)}
            </h2>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-violet-50 flex items-center justify-center border border-violet-100">
            <History className="text-violet-600" size={24} />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-2xl py-3.5 pl-11 pr-4 text-xs font-medium focus:outline-none focus:border-violet-300 shadow-sm transition-all"
          />
        </div>

        {/* Transactions List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-20 opacity-40 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
              Syncing Ledger...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs italic">
              No transactions found
            </div>
          ) : filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-white rounded-[24px] p-4 flex items-center gap-4 shadow-sm border border-slate-100 hover:border-violet-100 transition-all animate-in slide-in-from-bottom-2"
            >
              {/* Transaction Icon */}
              <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center border ${tx.type === 'disbursement' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                tx.type === 'repayment' ? 'bg-violet-50 text-violet-600 border-violet-100' :
                  'bg-slate-50 text-slate-400 border-slate-200'
                }`}>
                {tx.type === 'disbursement' ? (
                  <ArrowDownRight size={20} strokeWidth={2.5} />
                ) : tx.type === 'repayment' ? (
                  <ArrowUpRight size={20} strokeWidth={2.5} />
                ) : (
                  <Clock size={20} strokeWidth={2.5} />
                )}
              </div>

              {/* Transaction Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate mb-0.5">{tx.description}</p>
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <span>{new Date(tx.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span>•</span>
                  <span className={tx.status === 'pending' ? 'text-amber-500' : 'text-emerald-500'}>
                    {tx.status}
                  </span>
                </div>
              </div>

              {/* Transaction Amount */}
              <div className="text-right shrink-0">
                <span className={`block font-bold text-sm tracking-tight ${tx.type === 'disbursement' ? 'text-emerald-600' :
                  tx.type === 'repayment' ? 'text-slate-900' : 'text-slate-400'
                  }`}>
                  {tx.amount > 0 ? '+' : '-'}{formatZar(Math.abs(tx.amount))}
                </span>
                <span className="text-[8px] font-mono text-slate-300">
                  #{tx.originalId.slice(0, 6)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiquidityHistory;