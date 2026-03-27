import React from "react";
import { 
  Zap, ArrowRight, HelpCircle, ShieldCheck 
} from "lucide-react";
import { motion } from 'framer-motion';
import NavigationPill from "../../components/NavigationPill";
import NotificationBell from "../../components/NotificationBell";

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
    <div className="min-h-screen relative overflow-hidden bg-[#12042d] text-white">
      <div className="absolute inset-0 bg-[#12042d] -z-30" />
      
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay -z-20" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      <motion.div 
        animate={{ y: [0, -100, 0], x: [0, 50, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-10%] left-[-10%] w-[80%] h-[60%] bg-violet-600/20 blur-[120px] rounded-full -z-20" 
      />
      <motion.div 
        animate={{ y: [0, 100, 0], x: [0, -30, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[50%] bg-indigo-500/10 blur-[100px] rounded-full -z-20" 
      />

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

      <div className="absolute bottom-20 left-0 w-full h-64 opacity-30 pointer-events-none z-10">
        <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
          {[...Array(8)].map((_, i) => (
            <path 
              key={i}
              d={`M -50 ${190 - i*14} Q 120 ${210 - i*10} 450 ${130 - i*25}`}
              fill="none" 
              stroke="white" 
              strokeWidth="0.6"
              style={{ opacity: 0.08 + (i * 0.04) }}
            />
          ))}
        </svg>
      </div>

      <header className="fixed top-0 left-0 right-0 px-6 pt-12 flex items-center justify-between z-50 pointer-events-none">
        <div className="pointer-events-auto">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={displayName || "Profile"}
              className="h-10 w-10 rounded-full border border-white/20 object-cover bg-white/10 backdrop-blur-sm"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white backdrop-blur-sm">
              {initials}
            </div>
          )}
        </div>
        
        <div className="pointer-events-auto">
          <NavigationPill activeTab="credit" onTabChange={onTabChange} theme="dark" />
        </div>
        
        <div className="pointer-events-auto">
          <NotificationBell onClick={onOpenNotifications} color="white" />
        </div>
      </header>

      <div className="fixed bottom-[145px] left-6 right-6 z-30">
        <div className="mb-10">
          <h1 className="text-white text-[44px] font-light tracking-tight leading-[1.05] mb-8" style={{ fontFamily: fonts.display }}>
            Borrowing has<br /> never been <span className="font-semibold text-violet-400">easier</span>
          </h1>
          <div className="flex items-center justify-between opacity-60">
            <span className="text-xs font-medium tracking-wide">How it works</span>
            <HelpCircle className="h-6 w-6" />
          </div>
        </div>

        <div className="space-y-4">
          {ctaCards.map((item, i) => (
            <button 
                key={i} 
                onClick={() => {
                    if (item.id === "portfolio") onTabChange("instantLiquidity");
                    if (item.id === "unsecured") onTabChange("creditApply");
                }}
                className="w-full flex items-center justify-between bg-white p-2 pl-8 rounded-full group active:scale-[0.98] transition-all shadow-2xl"
            >
                <div className="flex flex-col text-left py-2">
                    <span className="text-[#6366F1] text-[17px] font-bold tracking-tight">
                        {item.label}
                    </span>
                    <span className="text-slate-400 text-[10px] font-medium leading-tight max-w-[180px]">
                        {item.description}
                    </span>
                </div>
                <div className="h-14 w-14 rounded-full bg-[#6366F1] flex items-center justify-center text-white shadow-lg">
                    <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CreditHome;