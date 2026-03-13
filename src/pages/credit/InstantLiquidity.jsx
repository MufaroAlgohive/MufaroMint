import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from "../../lib/supabase";
import { 
  Search, SlidersHorizontal, ChevronRight, X, ShieldCheck, 
  ArrowRight, Check, AlertCircle, Banknote, Clock, Wallet, Percent,
  CreditCard, ArrowUpRight, ArrowDownLeft, RefreshCw, FileText, Settings, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstantLiquidity({ profile }) {
  const [activeTab, setActiveTab] = useState("borrow");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  
  // Data States
  const [portfolio, setPortfolio] = useState([]);
  const [creditAccount, setCreditAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Multi-Select & Modal States
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [isPledging, setIsPledging] = useState(false);
  const [pledgeAmount, setPledgeAmount] = useState(0);
  const [workflowStep, setWorkflowStep] = useState("amount"); // amount, review, pin, success
  const [pin, setPin] = useState(["", "", "", "", ""]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Formatting utility
  const formatZAR = (value) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  };

  useEffect(() => {
    if (profile?.id) {
      fetchPortfolio();
      fetchCreditAccount();
    }
  }, [profile]);

  const fetchPortfolio = async () => {
    try {
      const { data: holdingsData, error: holdingsError } = await supabase
        .from('stock_holdings')
        .select(`
          *,
          securities!inner (
            id,
            symbol,
            name,
            last_price,
            exchange,
            pbc_screen_results (
              eligible,
              ltv,
              margin_call,
              auto_liquidation
            )
          )
        `)
        .eq('user_id', profile.id);

      if (holdingsError) throw holdingsError;

      const formatted = holdingsData.map(holding => {
        const security = holding.securities;
        const screen = security.pbc_screen_results?.[0] || {};
        
        const price = parseFloat(security.last_price || 0);
        const quantity = parseFloat(holding.quantity || 0);
        const balance = price * quantity;
        const ltv = parseFloat(screen.ltv || 0);
        const available = balance * ltv;
        
        // Generate random sparkline for visual effect
        const spark = Array.from({length: 20}, () => Math.random() * 100);

        return {
          id: holding.id,
          security_id: security.id,
          name: security.name,
          code: security.symbol,
          exchange: security.exchange,
          quantity: quantity,
          price: price,
          balance: balance,
          available: available,
          ltv: ltv,
          isEligible: screen.eligible === true,
          marginCall: screen.margin_call,
          autoLiq: screen.auto_liquidation,
          change: (Math.random() * 5) - 2.5, // Dummy change
          spark: spark,
          type: security.exchange === 'MINT' ? 'Strategies' : 'Equities' // Basic categorisation
        };
      });

      setPortfolio(formatted);
    } catch (err) {
      console.error("Error fetching portfolio:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCreditAccount = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_accounts')
        .select('*')
        .eq('user_id', profile.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (data) setCreditAccount(data);
    } catch (err) {
      console.error("Error fetching credit account:", err);
    }
  };

  // ----------------------------------------------------------------
  // Multi-Select & Pledging Logic
  // ----------------------------------------------------------------

  const toggleAsset = (asset) => {
    if (!asset.isEligible) return;
    setSelectedAssets(prev => {
      const exists = prev.find(a => a.id === asset.id);
      if (exists) return prev.filter(a => a.id !== asset.id);
      return [...prev, asset];
    });
  };

  const handlePledgeAll = () => {
    const eligible = portfolio.filter(item => item.isEligible);
    if (eligible.length > 0) {
      setSelectedAssets(eligible);
      openPledgeModal(eligible);
    }
  };

  const openPledgeModal = (assetsToPledge = selectedAssets) => {
    if (assetsToPledge.length === 0) return;
    setWorkflowStep("amount");
    const totalAvail = assetsToPledge.reduce((sum, item) => sum + item.available, 0);
    setPledgeAmount(totalAvail * 0.5); // Default slider to 50%
    setIsPledging(true);
  };

  const closePledgeModal = () => {
    setIsPledging(false);
    setTimeout(() => {
      setWorkflowStep("amount");
      setPin(["", "", "", "", ""]);
      setSelectedAssets([]); // Clear selection on close
    }, 300);
  };

  const handleConfirmPledge = async () => {
    setIsProcessing(true);
    try {
      const principal = parseFloat(pledgeAmount);
      const interestRate = 10.5; // Prime Interest
      const annualInterest = principal * (interestRate / 100);
      const monthlyRepayable = annualInterest / 12; 

      // 1. Create Master Loan Header
      const { data: loan, error: loanErr } = await supabase
        .from('loan_application')
        .insert({
          user_id: profile.id,
          principal_amount: principal,
          interest_rate: interestRate,
          amount_repayable: principal + annualInterest,
          monthly_repayable: monthlyRepayable,
          status: 'approved',
        })
        .select()
        .single();

      if (loanErr) throw loanErr;

      // 2. Map Multi-Asset Ratio Distribution
      const totalSelectedBalance = selectedAssets.reduce((sum, item) => sum + item.balance, 0);
      
      const pledges = selectedAssets.map(item => {
        const weightRatio = item.balance / totalSelectedBalance;
        const assignedDebt = principal * weightRatio;

        return {
          user_id: profile.id,
          loan_application_id: loan.id,
          security_id: item.security_id,
          symbol: item.code,
          pledged_quantity: item.quantity,
          pledged_value: item.balance,
          recognised_value: item.available,
          ltv_applied: item.ltv,
          loan_value: assignedDebt
        };
      });

      // 3. Batch Insert Collateral Splits
      const { error: pledgeErr } = await supabase
        .from('pbc_collateral_pledges')
        .insert(pledges);

      if (pledgeErr) throw pledgeErr;

      // Move to success step
      setWorkflowStep("success");
    } catch (err) {
      console.error("Loan generation failed:", err);
      alert("Failed to process loan. Please try again.");
      setWorkflowStep("amount");
    } finally {
      setIsProcessing(false);
    }
  };

  // Aggregated Values
  const totalBalance = portfolio.reduce((sum, item) => sum + item.balance, 0);
  const totalAvailable = portfolio.filter(i => i.isEligible).reduce((sum, item) => sum + item.available, 0);
  const totalSelectedBalance = selectedAssets.reduce((sum, item) => sum + item.balance, 0);
  const totalSelectedAvailable = selectedAssets.reduce((sum, item) => sum + item.available, 0);

  // Filtering
  const filteredPortfolio = useMemo(() => {
    return portfolio.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = selectedFilter === "All" || item.type === selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }, [portfolio, searchQuery, selectedFilter]);

  // Mini Chart Component
  const AssetMiniChart = ({ data, isPositive }) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * 60;
      const y = 30 - ((val - min) / range) * 30;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="60" height="30" className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={isPositive ? "#10B981" : "#EF4444"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      
      {/* Header */}
      <div className="px-6 pt-12 pb-6 bg-slate-50">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Credit & Loans</h1>
        <p className="text-slate-500 text-sm">Manage your liquidity and credit facilities</p>
      </div>

      <div className="px-6">
        
        {/* Main Hero Card (Your Original Styling) */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl -ml-10 -mb-10"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-slate-400 text-sm font-medium mb-1">Available to Borrow</p>
                <h2 className="text-4xl font-bold tracking-tight">
                  {formatZAR(totalAvailable)}
                </h2>
              </div>
              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                <CreditCard className="w-6 h-6 text-blue-400" />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handlePledgeAll}
                className="flex-1 bg-blue-500 hover:bg-blue-400 text-white py-3 px-4 rounded-xl font-medium shadow-lg shadow-blue-500/25 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowDownLeft className="w-5 h-5" />
                Get Cash
              </button>
              <button className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-xl font-medium backdrop-blur-md transition-colors flex items-center justify-center gap-2">
                <ArrowUpRight className="w-5 h-5" />
                Repay
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions (Your Original Styling) */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { icon: RefreshCw, label: "Auto-Pay", color: "text-blue-600", bg: "bg-blue-50" },
            { icon: FileText, label: "Statements", color: "text-purple-600", bg: "bg-purple-50" },
            { icon: Settings, label: "Settings", color: "text-slate-600", bg: "bg-slate-100" },
            { icon: HelpCircle, label: "Support", color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map((action, i) => (
            <button key={i} className="flex flex-col items-center gap-2">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${action.bg}`}>
                <action.icon className={`w-6 h-6 ${action.color}`} />
              </div>
              <span className="text-xs font-medium text-slate-600">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-slate-200/50 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab("borrow")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "borrow" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            Credit
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "history" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            History
          </button>
        </div>

        {activeTab === "borrow" && (
          <div className="space-y-6">
            
            {/* Search & Filter */}
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search collateral..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
              {["All", "Equities", "Crypto", "Strategies"].map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedFilter(category)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors border ${
                    selectedFilter === category 
                      ? "bg-slate-900 text-white border-slate-900" 
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Eligible Assets List (New Selectable List Style) */}
            <div className="space-y-4">
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-lg font-bold text-slate-900">Eligible Collateral</h3>
                <span className="text-sm font-medium text-blue-600">{filteredPortfolio.filter(i => i.isEligible).length} Assets</span>
              </div>

              {isLoading ? (
                <div className="text-center py-10 text-slate-500">Loading portfolio...</div>
              ) : (
                filteredPortfolio.map((item) => {
                  const isSelected = selectedAssets.some(a => a.id === item.id);
                  
                  return (
                    <div 
                      key={item.id}
                      onClick={() => item.isEligible && toggleAsset(item)}
                      className={`p-4 rounded-2xl border relative ${
                        item.isEligible 
                          ? isSelected
                            ? "bg-blue-50/50 border-blue-400 shadow-sm"
                            : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all" 
                          : "bg-slate-50 border-slate-100 opacity-60 grayscale"
                      }`}
                    >
                      {/* Selection Indicator */}
                      {item.isEligible && (
                        <div className={`absolute top-4 right-4 rounded-full p-1 border ${
                          isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 text-transparent"
                        }`}>
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-4 pr-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                            {item.code.substring(0,2)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 leading-tight">{item.code}</h4>
                            <p className="text-xs text-slate-500 truncate max-w-[120px]">{item.name}</p>
                          </div>
                        </div>
                        {item.isEligible && (
                          <div className="text-right">
                            <AssetMiniChart data={item.spark} isPositive={item.change >= 0} />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Holdings Value</p>
                          <p className="font-semibold text-slate-900">{formatZAR(item.balance)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Available Limit ({item.ltv * 100}%)</p>
                          <p className="font-semibold text-emerald-600">{formatZAR(item.available)}</p>
                        </div>
                      </div>

                      {!item.isEligible && (
                        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-500">
                          <AlertCircle className="w-4 h-4" />
                          Does not meet current liquidity requirements
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Multi-Select Floating Action Bar */}
      <AnimatePresence>
        {selectedAssets.length > 0 && !isPledging && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-0 right-0 z-40 px-6"
          >
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10">
              <div>
                <p className="font-semibold">{selectedAssets.length} Assets Selected</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Max Limit: <span className="text-white font-medium">{formatZAR(totalSelectedAvailable)}</span>
                </p>
              </div>
              <button 
                onClick={() => openPledgeModal(selectedAssets)}
                className="bg-blue-500 hover:bg-blue-400 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20"
              >
                Configure
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Pledge Modal */}
      <AnimatePresence>
        {isPledging && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-white z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {workflowStep === "amount" ? "Configure Loan" : 
                 workflowStep === "review" ? "Review Agreement" : 
                 workflowStep === "pin" ? "Security Verification" : "Success"}
              </h2>
              <button onClick={closePledgeModal} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              
              {/* STEP 1: AMOUNT SELECTION */}
              {workflowStep === "amount" && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                  
                  <div className="text-center space-y-2">
                    <p className="text-slate-500 font-medium">Desired Loan Amount</p>
                    <div className="text-5xl font-bold text-slate-900 tracking-tight">
                      {formatZAR(pledgeAmount)}
                    </div>
                    <p className="text-sm text-emerald-600 font-medium bg-emerald-50 inline-block px-3 py-1 rounded-full mt-2">
                      Max Available: {formatZAR(totalSelectedAvailable)}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <input 
                      type="range" 
                      min="1000" 
                      max={totalSelectedAvailable} 
                      step="1000"
                      value={pledgeAmount}
                      onChange={(e) => setPledgeAmount(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs font-medium text-slate-400">
                      <span>R1,000</span>
                      <span>{formatZAR(totalSelectedAvailable)}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-slate-900">Collateral Allocation (Value Ratio)</h4>
                      <span className="text-xs font-medium text-slate-500">{selectedAssets.length} Assets</span>
                    </div>
                    <div className="space-y-3">
                      {selectedAssets.map(asset => {
                        const weight = ((asset.balance / totalSelectedBalance) * 100).toFixed(1);
                        const assignedDebt = pledgeAmount * (weight / 100);
                        return (
                          <div key={asset.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <span className="text-sm font-medium text-slate-700">{asset.code}</span>
                              <span className="text-xs text-slate-400">({weight}%)</span>
                            </div>
                            <span className="text-sm font-semibold text-slate-900">{formatZAR(assignedDebt)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </motion.div>
              )}

              {/* STEP 2: REVIEW AGREEMENT */}
              {workflowStep === "review" && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  
                  {/* Prime Interest Highlight */}
                  <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-start gap-4">
                    <div className="bg-blue-500 text-white p-2.5 rounded-xl">
                      <Percent className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">10.5% Prime Interest Rate</h3>
                      <p className="text-sm text-slate-600 mt-1">This loan is calculated using the current prime lending rate. Interest is calculated daily and billed monthly.</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                      <h4 className="font-bold text-slate-900">Loan Breakdown</h4>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Principal Amount</span>
                        <span className="font-bold text-slate-900">{formatZAR(pledgeAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Monthly Interest (est)</span>
                        <span className="font-bold text-slate-900">{formatZAR((pledgeAmount * 0.105) / 12)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Initiation Fee</span>
                        <span className="font-bold text-emerald-600">R 0.00</span>
                      </div>
                      <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                        <span className="font-bold text-slate-900">Total Repayable (12 Mo)</span>
                        <span className="font-bold text-blue-600 text-lg">{formatZAR(pledgeAmount + (pledgeAmount * 0.105))}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                      <h4 className="font-bold text-slate-900">Collateral Details</h4>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Portfolio Value Pledged</span>
                        <span className="font-bold text-slate-900">{formatZAR(totalSelectedBalance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Effective LTV Used</span>
                        <span className="font-bold text-slate-900">
                          {((pledgeAmount / totalSelectedBalance) * 100).toFixed(2)}%
                        </span>
                      </div>
                      
                      <div className="pt-4 border-t border-slate-100 space-y-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Asset Distribution</p>
                        {selectedAssets.map(asset => {
                          const weight = ((asset.balance / totalSelectedBalance) * 100).toFixed(1);
                          return (
                            <div key={asset.id} className="flex justify-between items-center text-sm">
                              <span className="text-slate-700">{asset.code} <span className="text-slate-400">({weight}%)</span></span>
                              <span className="font-medium text-slate-900">{formatZAR(pledgeAmount * (weight / 100))}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                </motion.div>
              )}

              {/* STEP 3: PIN VERIFICATION */}
              {workflowStep === "pin" && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-10">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                    <ShieldCheck className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Enter your PIN</h3>
                  <p className="text-slate-500 text-center mb-8">
                    To authorize the drawdown of <span className="font-bold text-slate-900">{formatZAR(pledgeAmount)}</span>
                  </p>

                  <div className="flex gap-3 mb-12">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div 
                        key={i}
                        className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold
                          ${pin[i] ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white'}`}
                      >
                        {pin[i] ? "•" : ""}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button 
                        key={num}
                        onClick={() => {
                          const emptyIndex = pin.findIndex(p => p === "");
                          if (emptyIndex !== -1) {
                            const newPin = [...pin];
                            newPin[emptyIndex] = num.toString();
                            setPin(newPin);
                          }
                        }}
                        className="h-14 bg-slate-50 rounded-2xl text-xl font-bold text-slate-700 hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all"
                      >
                        {num}
                      </button>
                    ))}
                    <div className="col-start-2">
                      <button 
                        onClick={() => {
                          const emptyIndex = pin.findIndex(p => p === "");
                          if (emptyIndex !== -1) {
                            const newPin = [...pin];
                            newPin[emptyIndex] = "0";
                            setPin(newPin);
                          }
                        }}
                        className="w-full h-14 bg-slate-50 rounded-2xl text-xl font-bold text-slate-700 hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all"
                      >
                        0
                      </button>
                    </div>
                    <div>
                      <button 
                        onClick={() => {
                          const lastFilledIndex = pin.map(p => p !== "").lastIndexOf(true);
                          if (lastFilledIndex !== -1) {
                            const newPin = [...pin];
                            newPin[lastFilledIndex] = "";
                            setPin(newPin);
                          }
                        }}
                        className="w-full h-14 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: SUCCESS */}
              {workflowStep === "success" && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 relative">
                    <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping"></div>
                    <Check className="w-12 h-12 text-emerald-600" strokeWidth={3} />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-3">Funds Released!</h3>
                  <p className="text-slate-500 mb-8 max-w-xs">
                    Your {formatZAR(pledgeAmount)} has been instantly credited to your linked Mint account.
                  </p>
                  
                  <div className="bg-slate-50 p-6 rounded-2xl w-full border border-slate-100 text-left space-y-4 mb-8">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">Reference</span>
                      <span className="font-mono font-bold text-slate-900">MNT-{Math.floor(Math.random() * 900000) + 100000}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Assets Pledged</span>
                      <span className="font-bold text-slate-900">{selectedAssets.length} Assets</span>
                    </div>
                  </div>
                </motion.div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-white border-t border-slate-100">
              {workflowStep === "amount" && (
                <button 
                  onClick={() => setWorkflowStep("review")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 transition-all"
                >
                  Review Agreement <ArrowRight className="w-5 h-5" />
                </button>
              )}

              {workflowStep === "review" && (
                <button 
                  onClick={() => setWorkflowStep("pin")}
                  className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 transition-all shadow-xl shadow-slate-900/20"
                >
                  Accept Terms & Proceed
                </button>
              )}

              {workflowStep === "pin" && (
                <button 
                  onClick={handleConfirmPledge}
                  disabled={pin.includes("") || isProcessing}
                  className={`w-full py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 transition-all ${
                    pin.includes("") || isProcessing
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/20"
                  }`}
                >
                  {isProcessing ? "Verifying..." : "Confirm Drawdown"}
                </button>
              )}

              {workflowStep === "success" && (
                <button 
                  onClick={closePledgeModal}
                  className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-bold text-lg transition-all"
                >
                  Return to Dashboard
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}