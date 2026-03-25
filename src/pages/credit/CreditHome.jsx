import React from "react";
import { 
  Zap, ChevronRight, HelpCircle, ShieldCheck, BookOpen 
} from "lucide-react";
import { motion } from 'framer-motion';
import NavigationPill from "../../components/NavigationPill";
import NotificationBell from "../../components/NotificationBell";

// Removed PurpleGlobeGraphic as requested

const CreditHome = ({ profile, onOpenNotifications, onTabChange }) => {
  const fonts = {
    display: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    text: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif"
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
    <div className="min-h-screen pb-32 relative overflow-x-hidden text-slate-900 bg-slate-50">
      {/* Background Gradient Layer */}
      <div className="absolute inset-x-0 top-0 -z-10 h-full">
        <div className="absolute inset-x-0 top-0" style={{ height: '100vh', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 15%, #e2e8f0 35%, #cbd5e1 100%)' }} />
      </div>

      <div className="px-5 pt-12 pb-8">
        {/* Header Section */}
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

        {/* Hero Section */}
        <div className="flex flex-col gap-2 mb-16 relative">
            <div className="flex items-center gap-2 mb-4 z-20">
              <img src="/assets/mint-logo.png" alt="Mint" className="h-4 brightness-0" />
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] opacity-80" style={{ fontFamily: fonts.display }}>credit</span>
            </div>
            <div className="z-20">
                 <h1 className="text-slate-900 text-5xl font-light tracking-tight mb-6 leading-[1.1]" style={{ fontFamily: fonts.display }}>
                    Borrowing has<br /> never been <span className="font-semibold text-violet-600">easier</span>.
                 </h1>
            </div>
        </div>

        {/* Solutions Grid */}
        <div className="space-y-4 relative z-20">
          <div className="px-1 mb-4 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Credit Solutions Pipeline</p>
            <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
          </div>

          {ctaCards.map((item, i) => (
            <motion.button 
                key={i} 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ delay: i * 0.1, duration: 0.4 }}
                onClick={() => {
                    if (item.id === "portfolio") onTabChange("instantLiquidity");
                    if (item.id === "unsecured") onTabChange("creditApply");
                }}
                className="w-full group relative overflow-hidden bg-white rounded-[32px] p-6 border border-slate-200 text-left transition-all active:scale-[0.98] flex items-center gap-5 shadow-sm shadow-slate-200/50 hover:shadow-md hover:border-violet-200"
            >
                {/* Visual Accent */}
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/0 to-violet-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Icon section */}
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-violet-600 bg-violet-50 shrink-0 border border-violet-100 shadow-inner">
                    <item.icon className="h-6 w-6" />
                </span>
                
                {/* Text content */}
                <div className="flex-1 relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] font-black text-violet-700 uppercase tracking-widest px-2 py-0.5 bg-violet-100 rounded-full">{item.badge}</span>
                    </div>
                    <p className="text-lg font-bold text-slate-900 mb-0.5" style={{ fontFamily: fonts.display }}>{item.label}</p>
                    <p className="text-[11px] font-medium text-slate-500 leading-snug">{item.description}</p>
                </div>

                <div className="flex flex-col items-center opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all z-10">
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-violet-600" />
                </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CreditHome;