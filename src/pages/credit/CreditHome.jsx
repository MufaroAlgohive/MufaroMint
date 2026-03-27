import React from "react";
import { 
  Zap, ArrowRight, HelpCircle, ShieldCheck 
} from "lucide-react";
import { motion } from 'framer-motion';
import NavigationPill from "../../components/NavigationPill";
import NotificationBell from "../../components/NotificationBell";
import BottomNav from "../../components/BottomNav";

const CreditHome = ({ profile, onOpenNotifications, onTabChange }) => {
  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
  };

  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "—";

  const ctaCards = [
    { 
      id: "portfolio",
      label: "portfolio back credit", 
      description: "Use your investment history for instant liquidity.", 
      icon: ShieldCheck, 
      badge: "Asset Backed"
    },
    { 
      id: "unsecured",
      label: "unsecured credit", 
      description: "Access capital solutions based on your digital profile.", 
      icon: Zap, 
      badge: "Direct Access"
    }
  ];

  return (
    <div className="min-h-screen pb-32 relative overflow-hidden text-slate-900 bg-slate-50">
      <div className="absolute inset-x-0 top-0 -z-30 h-full">
        <div className="absolute inset-x-0 top-0" style={{ height: '100vh', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 15%, #e2e8f0 35%, #cbd5e1 100%)' }} />
      </div>

      <div className="absolute bottom-0 left-0 w-full h-[40%] -z-20 opacity-30 pointer-events-none">
        <svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="none">
          {[...Array(6)].map((_, i) => (
            <path 
              key={i}
              d={`M -50 ${380 - i*18} Q 150 ${400 - i*12} 450 ${300 - i*45}`}
              fill="none" 
              stroke="#6366f1" 
              strokeWidth="1.2"
              style={{ opacity: 0.05 + (i * 0.04) }}
            />
          ))}
        </svg>
      </div>

      <motion.img 
        src="/assets/images/Illustration Coin1.webp" 
        initial={{ y: 900, opacity: 0 }}
        animate={{ y: [0, -15, 0], opacity: 0.4 }}
        transition={{ 
          y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
          default: { duration: 1.2, ease: "easeOut" }
        }}
        className="absolute top-24 right-[-45px] w-64 pointer-events-none z-0"
      />
      <motion.img 
        src="/assets/images/Illustration Coin2.webp" 
        initial={{ y: 900, opacity: 0 }}
        animate={{ y: [0, 12, 0], opacity: 0.3 }}
        transition={{ 
          y: { duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 },
          default: { duration: 1.5, ease: "easeOut", delay: 0.2 }
        }}
        className="absolute top-[40%] left-[-20px] w-48 pointer-events-none z-0"
      />

      <div className="px-5 pt-12 relative z-20">
        <header className="relative flex items-center justify-between mb-12 z-20">
          <div className="flex items-center gap-3">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={displayName || "Profile"}
                className="h-10 w-10 rounded-full border border-slate-200 object-cover bg-white"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 border border-slate-300 text-xs font-semibold text-slate-700">
                {initials}
              </div>
            )}
          </div>
          <NavigationPill activeTab="credit" onTabChange={onTabChange} theme="light" />
          <NotificationBell onClick={onOpenNotifications} color="black" />
        </header>

        <div className="flex items-center gap-2 mb-4">
          <img src="/assets/mint-logo.png" alt="Mint" className="h-4 brightness-0" />
          <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] opacity-80" style={{ fontFamily: fonts.display }}>credit</span>
        </div>

        <h1 className="text-slate-900 text-[46px] font-light tracking-tight leading-[1.05] mb-8" style={{ fontFamily: fonts.display }}>
            Borrowing has<br /> never been <span className="font-semibold text-violet-600">easier</span>.
        </h1>

        <div className="flex items-center justify-between mb-8 opacity-40">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">How it works</span>
            <HelpCircle className="h-5 w-5 text-slate-400" />
        </div>

        <div className="fixed bottom-[135px] left-5 right-5 space-y-4 z-40">
          {ctaCards.map((item, i) => (
            <motion.button 
                key={i} 
                initial={{ x: -30, opacity: 0 }} 
                animate={{ x: 0, opacity: 1 }} 
                transition={{ delay: 0.6 + (i * 0.1), ease: "easeOut" }}
                onClick={() => {
                    if (item.id === "portfolio") onTabChange("instantLiquidity");
                    if (item.id === "unsecured") onTabChange("creditApply");
                }}
                className="w-full flex items-center justify-between bg-white p-1.5 pl-8 rounded-full border border-slate-100 shadow-[0_10px_25px_rgba(0,0,0,0.05)] group active:scale-[0.98] transition-all"
            >
                <div className="flex flex-col text-left py-1">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[7px] font-black text-violet-700 uppercase tracking-widest px-1.5 py-0.5 bg-violet-50 rounded-full">{item.badge}</span>
                    </div>
                    <span className="text-slate-900 text-[17px] font-bold tracking-tight leading-tight capitalize">
                        {item.label}
                    </span>
                    <span className="text-slate-400 text-[10px] font-medium leading-tight max-w-[190px]">
                        {item.description}
                    </span>
                </div>
                <div className="h-14 w-14 rounded-full bg-violet-600 flex items-center justify-center text-white relative overflow-hidden shadow-lg shadow-violet-200">
                    <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </div>
            </motion.button>
          ))}
        </div>
      </div>

      <BottomNav activeTab="credit" onTabChange={onTabChange} />
    </div>
  );
};

export default CreditHome;