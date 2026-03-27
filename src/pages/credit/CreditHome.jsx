import React from "react";
import { 
  Zap, ArrowRight, HelpCircle, ShieldCheck, Home, Shield, Zap as UnsecuredIcon, MoreHorizontal 
} from "lucide-react";
import { motion } from 'framer-motion';
import NavigationPill from "../../components/NavigationPill";
import NotificationBell from "../../components/NotificationBell";

// 1. Integrated BottomNav to fix the "Could not resolve" error
const BottomNav = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'home', label: 'HOME', icon: Home },
    { id: 'secured', label: 'SECURED', icon: Shield },
    { id: 'unsecured', label: 'UNSECURED', icon: UnsecuredIcon },
    { id: 'more', label: 'MORE', icon: MoreHorizontal },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white px-6 py-4 pb-8 flex justify-between items-center z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
      {navItems.map((item) => {
        const isActive = item.id === 'home' || item.id === 'secured'; // Visual indicator for demo
        return (
          <button 
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center gap-1.5 transition-all ${isActive ? 'text-violet-700' : 'text-slate-300 opacity-60'}`}
          >
            <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const CreditHome = ({ profile, onOpenNotifications, onTabChange }) => {
  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
  };

  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  const initials = displayName.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "—";

  const ctaCards = [
    { 
      id: "portfolio",
      label: "Portfolio Backed Credit", 
      description: "Use your investment history for instant liquidity.", 
    },
    { 
      id: "unsecured",
      label: "Unsecured Credit", 
      description: "Access capital solutions based on your digital profile.", 
    }
  ];

  return (
    <div className="min-h-screen pb-40 relative overflow-hidden text-white bg-[#0f0225]">
      {/* Background Gradient Layer */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0b3b] via-[#0f0225] to-[#0a0118] -z-30" />

      {/* Floating Wireframe Coins (Matches Screenshot) */}
      <motion.div 
        animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-32 right-8 w-40 opacity-40 pointer-events-none"
      >
        <img src="/assets/images/Illustration Coin1.webp" alt="" className="w-full grayscale invert brightness-200" />
      </motion.div>
      
      <motion.div 
        animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-[40%] left-[-10px] w-32 opacity-30 pointer-events-none"
      >
        <img src="/assets/images/Illustration Coin2.webp" alt="" className="w-full grayscale invert brightness-200" />
      </motion.div>

      {/* Wavy Line Pattern at Bottom Left */}
      <div className="absolute bottom-24 left-0 w-full h-48 opacity-40 pointer-events-none z-0">
        <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
          {[...Array(8)].map((_, i) => (
            <path 
              key={i}
              d={`M -50 ${180 - i*12} Q 100 ${200 - i*15} 450 ${120 - i*20}`}
              fill="none" 
              stroke="white" 
              strokeWidth="0.8"
              style={{ opacity: 0.1 + (i * 0.05) }}
            />
          ))}
        </svg>
      </div>

      <div className="px-6 pt-12 relative z-20">
        {/* Header matched to Screenshot */}
        <header className="flex items-center justify-between mb-16">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20 text-xs font-semibold">
            {initials}
          </div>
          <NavigationPill activeTab="credit" onTabChange={onTabChange} theme="dark" />
          <NotificationBell onClick={onOpenNotifications} color="white" />
        </header>

        {/* Hero Headline */}
        <div className="mb-12">
          <h1 className="text-white text-[42px] font-light tracking-tight leading-[1.1]" style={{ fontFamily: fonts.display }}>
            Borrowing has<br /> never been <span className="font-semibold text-violet-400">easier</span>
          </h1>
          
          <div className="flex items-center justify-between mt-10">
             <div className="flex items-center gap-2 opacity-60">
                <span className="text-[11px] font-medium tracking-wide">How it works</span>
             </div>
             <HelpCircle className="h-6 w-6 opacity-60" />
          </div>
        </div>

        {/* White Pill CTA Cards */}
        <div className="space-y-4 mb-20">
          {ctaCards.map((item, i) => (
            <motion.button 
                key={i} 
                initial={{ x: -20, opacity: 0 }} 
                animate={{ x: 0, opacity: 1 }} 
                transition={{ delay: 0.2 + (i * 0.1) }}
                onClick={() => {
                    if (item.id === "portfolio") onTabChange("instantLiquidity");
                    if (item.id === "unsecured") onTabChange("creditApply");
                }}
                className="w-full flex items-center justify-between bg-white p-2 pl-8 rounded-full group active:scale-[0.98] transition-all"
            >
                <div className="flex flex-col text-left py-2">
                    <span className="text-[#6366f1] text-[17px] font-bold tracking-tight">
                        {item.label}
                    </span>
                    <span className="text-slate-400 text-[10px] font-medium leading-tight max-w-[180px]">
                        {item.description}
                    </span>
                </div>
                <div className="h-14 w-14 rounded-full bg-[#6366f1] flex items-center justify-center text-white shadow-lg">
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