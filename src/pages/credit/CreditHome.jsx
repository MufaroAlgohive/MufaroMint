import React from "react";
import { 
  Zap, ArrowRight, HelpCircle, ShieldCheck 
} from "lucide-react";
import { motion } from 'framer-motion';
import NavigationPill from "../../components/NavigationPill";
import NotificationBell from "../../components/NotificationBell";

// Bottom Navigation Placeholder (to ensure the 65px spacing logic works)
const BottomNavUI = () => (
  <div className="fixed bottom-0 left-0 w-full bg-white px-8 py-4 pb-8 flex justify-between items-center z-50">
    <div className="flex flex-col items-center gap-1.5 text-violet-700">
      <div className="bg-violet-50 p-1 rounded-md"><Zap size={20} /></div>
      <span className="text-[9px] font-black uppercase tracking-tighter">Home</span>
    </div>
    <div className="flex flex-col items-center gap-1.5 opacity-20"><ShieldCheck size={20} /><span className="text-[9px] font-black uppercase tracking-tighter">Secured</span></div>
    <div className="flex flex-col items-center gap-1.5 opacity-20"><Zap size={20} /><span className="text-[9px] font-black uppercase tracking-tighter">Unsecured</span></div>
    <div className="flex flex-col items-center gap-1.5 opacity-20"><HelpCircle size={20} /><span className="text-[9px] font-black uppercase tracking-tighter">More</span></div>
  </div>
);

const CreditHome = ({ profile, onOpenNotifications, onTabChange }) => {
  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
      label: "Portfolio Backed Credit", 
      description: "Use your investment history for instant liquidity.", 
      icon: ShieldCheck, 
    },
    { 
      id: "unsecured",
      label: "Unsecured Credit", 
      description: "Access capital solutions based on your digital profile.", 
      icon: Zap, 
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0A0118] text-white">
      {/* 1. Background Gradient & Arcs */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1A0B3B] to-[#0A0118] -z-20" />
      
      {/* Background Arcs (Layer 0) */}
      <div className="absolute bottom-0 left-0 w-full h-[40%] opacity-30 pointer-events-none -z-10">
        <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
          {[...Array(6)].map((_, i) => (
            <path 
              key={i}
              d={`M -50 ${180 - i*15} Q 150 ${200 - i*10} 450 ${100 - i*30}`}
              fill="none" 
              stroke="white" 
              strokeWidth="0.5"
              style={{ opacity: 0.1 + (i * 0.05) }}
            />
          ))}
        </svg>
      </div>

      {/* 2. Flying/Floating Coins (z-index above background, below content) */}
      <motion.img 
        src="/assets/images/Illustration Coin1.webp" 
        initial={{ y: 800, opacity: 0 }}
        animate={{ y: [0, -15, 0], opacity: 0.4 }}
        transition={{ 
          y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          default: { duration: 1.5, ease: "easeOut" }
        }}
        className="absolute top-24 right-[-40px] w-64 pointer-events-none z-0"
      />
      <motion.img 
        src="/assets/images/Illustration Coin2.webp" 
        initial={{ y: 800, opacity: 0 }}
        animate={{ y: [0, 10, 0], opacity: 0.3 }}
        transition={{ 
          y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
          default: { duration: 1.8, ease: "easeOut" }
        }}
        className="absolute top-[35%] left-[-20px] w-40 pointer-events-none z-0"
      />

      <div className="px-6 pt-12 relative z-20">
        {/* Header matched to Screenshot */}
        <header className="flex items-center justify-between mb-16">
          <div className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-xs font-semibold">
            {initials}
          </div>
          <NavigationPill activeTab="credit" onTabChange={onTabChange} theme="dark" />
          <NotificationBell onClick={onOpenNotifications} color="white" />
        </header>

        {/* Hero Text (50px above "How it works") */}
        <div className="mb-[50px]">
          <h1 className="text-5xl font-light tracking-tight leading-[1.05]" style={{ fontFamily: fonts.display }}>
            Borrowing has<br /> never been <span className="font-semibold text-violet-400">easier</span>
          </h1>
        </div>

        {/* How it works (30px above Top CTA) */}
        <div className="mb-[30px] flex items-center justify-between opacity-60">
          <span className="text-xs font-medium tracking-wide">How it works</span>
          <HelpCircle className="h-6 w-6" />
        </div>

        {/* CTA Cards (Fixed 65px above Bottom Nav) */}
        <div className="fixed bottom-[145px] left-6 right-6 space-y-4 z-30">
          {ctaCards.map((item, i) => (
            <motion.button 
                key={i} 
                initial={{ x: -50, opacity: 0 }} 
                animate={{ x: 0, opacity: 1 }} 
                transition={{ delay: 0.8 + (i * 0.1) }}
                onClick={() => {
                    if (item.id === "portfolio") onTabChange("instantLiquidity");
                    if (item.id === "unsecured") onTabChange("creditApply");
                }}
                className="w-full flex items-center justify-between bg-white p-2 pl-8 rounded-full group active:scale-[0.98] transition-all shadow-xl"
            >
                <div className="flex flex-col text-left py-2">
                    <span className="text-[#6366F1] text-[17px] font-bold tracking-tight">
                        {item.label}
                    </span>
                    <span className="text-slate-400 text-[10px] font-medium leading-tight max-w-[180px]">
                        {item.description}
                    </span>
                </div>
                <div className="h-14 w-14 rounded-full bg-[#6366F1] flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </div>
            </motion.button>
          ))}
        </div>
      </div>

      <BottomNavUI />
    </div>
  );
};

export default CreditHome;