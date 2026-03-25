import React, { useState, useMemo, useEffect } from "react";
import { ChevronLeft, Search, ChevronRight, ReceiptText } from "lucide-react";
import { formatZar } from "../../lib/formatCurrency";
import { supabase } from "../../lib/supabase";
import NavigationPill from "../../components/NavigationPill";
import NotificationBell from "../../components/NotificationBell";

const LiquidityHistory = ({ onBack, profile, onTabChange, onOpenNotifications }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState([]);
  const itemsPerPage = 6;

  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    text: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
  };

  useEffect(() => {
    async function fetchHistory() {
      if (!profile?.id) return;
      setLoading(true);
      const { data } = await supabase
        .from('loan_application')
        .select(`
          id, principal_amount, created_at, status,
          pbc_collateral_pledges ( symbol, securities ( name ) )
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (data) {
        setHistoryData(data.map(item => ({
          id: item.id,
          asset: item.pbc_collateral_pledges[0]?.securities?.name || "Asset",
          code: item.pbc_collateral_pledges[0]?.symbol || "TICKER",
          amount: item.principal_amount,
          date: new Date(item.created_at).toISOString().split('T')[0],
          status: item.status === 'approved' ? 'active' : item.status
        })));
      }
      setLoading(false);
    }
    fetchHistory();
  }, [profile?.id]);

  const filteredData = useMemo(() => {
    return historyData.filter(item =>
      item.asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [historyData, searchQuery]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen pb-32 bg-[#f8f6fa]">
      <header className="px-5 pt-12 pb-8 flex items-center justify-between bg-[#0d0d12] text-white">
        <div className="flex items-center gap-2">
          <img src="/assets/mint-logo.png" alt="Mint" className="h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-70" style={{ fontFamily: fonts.display }}>credit</span>
        </div>
        <NavigationPill activeTab="credit" onTabChange={onTabChange} />
        <NotificationBell onClick={onOpenNotifications} />
      </header>

      <div className="p-6">
        <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={onBack}>
          <ChevronLeft className="text-slate-400" />
          <h2 className="text-xl font-bold" style={{ fontFamily: fonts.display }}>Credit History</h2>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search transaction history..."
            className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium outline-none shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center text-[10px] font-black uppercase tracking-widest animate-pulse opacity-40">Syncing Ledger...</div>
          ) : paginatedData.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-[28px] border border-slate-100 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400"><ReceiptText size={20} /></div>
                <div>
                  <h3 className="font-bold text-slate-900">{item.asset} ({item.code})</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-slate-900 mb-1">{formatZar(item.amount)}</p>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${item.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                  }`}>{item.status}</span>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-12 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-violet-600"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Page {currentPage} of {totalPages}</p>
            </div>
            <div className="flex gap-3">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm"><ChevronLeft size={20} /></button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20"><ChevronRight size={20} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiquidityHistory;