import React from "react";
import { 
  Zap, HandCoins, ChevronRight, HelpCircle, PieChart 
} from "lucide-react";
import { motion } from 'framer-motion';
import NavigationPill from "../../components/NavigationPill";
import NotificationBell from "../../components/NotificationBell";

// --- PURPLE GLOBE GRAPHIC COMPONENT ---
const PurpleGlobeGraphic = () => (
  <div className="relative h-full w-full flex items-center justify-center p-6 lg:p-10">
    {/* Base Spinning Globe */}
    <motion.div 
      initial={{ rotate: 0 }}
      animate={{ rotate: 360 }}
      transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      className="relative h-64 w-64 lg:h-80 lg:w-80 rounded-full shadow-[0_0_100px_rgba(124,58,237,0.2)] overflow-hidden border border-white/5" 
    >
      {/* Globe Surface with CSS Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-900 to-black scale-105" />
      
      {/* Globe Grid Lines */}
      {[...Array(8)].map((_, i) => (
        <div 
          key={i} 
          className="absolute inset-0 border border-white/5 rounded-full" 
          style={{ transform: `rotateY(${i * 45}deg)` }} 
        />
      ))}
      <div className="absolute inset-0 border-y border-white/5 top-1/4 h-1/2" />
    </motion.div>

    {/* Moving Arcs Layer */}
    <div className="absolute inset-0 z-10 pointer-events-none">
        <svg viewBox="0 0 400 400" className="h-full w-full opacity-40">
            {/* Arcs moving from one place to another */}
            <motion.path 
                d="M 100 200 Q 200 50 300 200" 
                stroke="#a78bfa" strokeWidth="2" fill="none" 
                initial={{ pathLength: 0, opacity: 0 }} 
                animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.path 
                d="M 120 250 Q 200 120 280 250" 
                stroke="#c084fc" strokeWidth="1.5" fill="none" 
                initial={{ pathLength: 0, opacity: 0 }} 
                animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            />
            <motion.path 
                d="M 150 150 Q 250 250 350 150" 
                stroke="#8b5cf6" strokeWidth="1" fill="none" 
                initial={{ pathLength: 0, opacity: 0 }} 
                animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 3 }}
            />
        </svg>
    </div>
  </div>
);

const CreditHome = ({ profile, onOpenNotifications, onTabChange }) => {
  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    text: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
  };

  const ctaCards = [
    { 
      id: "portfolio",
      label: "portfolio back credit", 
      description: "Use your investment history for instant liquidity.", 
      icon: HandCoins, 
      badge: "Asset Backed"
    },
    { 
      id: "unsecured",
      label: "unsecured credit", 
      description: "Access capital solutions based on your digital profile.", 
      icon: PieChart, 
      badge: "Direct Access"
    },
    { 
      id: "more",
      label: "find out more", 
      description: "Explore diverse borrowing options and risk profiles.", 
      icon: Zap, 
      badge: "Knowledge Base"
    }
  ];

  return (
    <div className="min-h-screen pb-32 relative overflow-x-hidden text-slate-900 bg-[#0d0d12]">
      {/* Background Gradient Layer */}
      <div className="absolute inset-x-0 top-0 -z-10 h-full">
        <div className="absolute inset-x-0 top-0" style={{ height: '100vh', background: 'linear-gradient(180deg, #0d0d12 0%, #100b18 10%, #1a102e 25%, #2d1b4d 45%, #0d0d12 100%)' }} />
      </div>

      <div className="px-5 pt-12 pb-8">
        {/* Header Section */}
        <header className="relative flex items-center justify-between mb-12">
          <div className="flex items-center gap-2.5">
              <img src="/assets/mint-logo.png" alt="Mint" className="h-6" />
              <span className="text-[11px] font-black text-white uppercase tracking-[0.2em] opacity-80" style={{ fontFamily: fonts.display }}>credit</span>
          </div>
          
          <NavigationPill activeTab="credit" onTabChange={onTabChange} />
          <NotificationBell onClick={onOpenNotifications} color="white" />
        </header>

        {/* Hero Section */}
        <div className="flex flex-col gap-2 mb-16 relative">
            <div className="z-20">
                 <h1 className="text-white text-5xl font-light tracking-tight mb-6 leading-[1.1]" style={{ fontFamily: fonts.display }}>
                    Borrowing has<br /> never been <span className="font-black text-violet-400">easier</span>.
                 </h1>
                 <p className="text-white/50 text-[13px] font-medium max-w-[280px] leading-relaxed">
                    Leverage your digital assets and history for simplified access to capital solutions.
                 </p>
            </div>

            {/* Spinning Globe Graphic */}
            <div className="absolute -right-20 -top-20 w-80 h-80 z-10 opacity-80">
                <PurpleGlobeGraphic />
            </div>
        </div>

        {/* Solutions Grid */}
        <div className="space-y-4 relative z-20">
          <div className="px-1 mb-4 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Credit Solutions Pipeline</p>
            <HelpCircle className="h-3.5 w-3.5 text-white/20" />
          </div>

          {ctaCards.map((item, i) => (
            <motion.button 
                key={i} 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ delay: i * 0.1, duration: 0.4 }}
                onClick={() => {
                    if (item.id === "portfolio") onTabChange("instantLiquidity");
                }}
                className="w-full group relative overflow-hidden bg-white/[0.03] backdrop-blur-md rounded-[32px] p-6 border border-white/10 text-left transition-all active:scale-[0.98] flex items-center gap-5"
            >
                {/* Visual Accent */}
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/0 to-violet-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Icon section */}
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-violet-400 bg-white/5 shrink-0 border border-white/5 shadow-inner">
                    <item.icon className="h-6 w-6" />
                </span>
                
                {/* Text content */}
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest px-2 py-0.5 bg-violet-400/10 rounded-full">{item.badge}</span>
                    </div>
                    <p className="text-lg font-bold text-white mb-0.5" style={{ fontFamily: fonts.display }}>{item.label}</p>
                    <p className="text-[11px] font-medium text-white/40 leading-snug">{item.description}</p>
                </div>

                <div className="flex flex-col items-center opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                    <ChevronRight className="h-5 w-5 text-white" />
                </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CreditHome;