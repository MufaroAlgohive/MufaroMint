import React, { useCallback, useState } from "react";
import { 
  Zap, ArrowRight, HelpCircle, ShieldCheck 
} from "lucide-react";
import { motion } from 'framer-motion';
import NavigationPill from "../../components/NavigationPill";
import NotificationBell from "../../components/NotificationBell";
import FamilyDropdown from "../../components/FamilyDropdown";
import { supabase } from "../../lib/supabase";

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

  const [navigating, setNavigating] = useState(false);

  // Checkpoint: if the user has an active unsecured loan → dashboard, else → apply flow
  const handleUnsecuredClick = useCallback(async () => {
    if (navigating) return;
    setNavigating(true);
    try {
      if (profile?.id && supabase) {
        const { data: activeLoan } = await supabase
          .from("loan_application")
          .select("id, principal_amount")
          .eq("user_id", profile.id)
          .eq("Secured_Unsecured", "unsecured")
          .in("status", ["active", "in_progress"])
          .gt("principal_amount", 0)
          .gt("amount_repayable", 0)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeLoan?.id) {
          onTabChange("unsecuredCreditDashboard");
          return;
        }
      }
      // No active loan — go to the apply flow (resolves to step 4 calculator if eligible)
      onTabChange("creditApply");
    } catch (err) {
      console.warn("Unsecured checkpoint check failed:", err?.message || err);
      onTabChange("creditApply");
    } finally {
      setNavigating(false);
    }
  }, [profile?.id, onTabChange, navigating]);

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
    <>
      <div className="fixed inset-0 -z-30 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#3a1a7a] via-[#2d1261] to-[#1a083d]" />
        
        <motion.div 
          animate={{ 
            y: [0, -50, 0], 
            x: [0, 30, 0],
            scale: [1, 1.1, 1] 
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-5%] left-[-5%] w-[90%] h-[70%] bg-violet-500/40 blur-[120px] rounded-full" 
        />
        <motion.div 
          animate={{ 
            y: [0, 50, 0], 
            x: [0, -30, 0],
            scale: [1, 1.2, 1] 
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[60%] bg-indigo-400/25 blur-[100px] rounded-full" 
        />
        
        <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      </div>

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

      <div className="relative z-50 rounded-b-[36px] bg-transparent px-4 pb-12 pt-12 text-white md:px-8">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6 md:max-w-md">
          <header className="relative flex items-center justify-between text-white">
            <FamilyDropdown
              profile={profile}
              userId={profile?.id}
              initials={initials}
              avatarUrl={profile?.avatarUrl}
              onOpenFamily={() =>
                window.dispatchEvent(new CustomEvent("navigate-within-app", { detail: { page: "family" } }))
              }
              onSelectMember={(member) =>
                window.dispatchEvent(new CustomEvent("navigate-within-app", { detail: { page: "memberPortfolio", member } }))
              }
            />

            <NavigationPill activeTab="credit" onTabChange={onTabChange} theme="dark" />

            <NotificationBell onClick={onOpenNotifications} />
          </header>

        </div>
      </div>
      

      <div className="fixed bottom-[145px] left-6 right-6 z-30">
        <div className="mb-10">
          <h1 className="text-white text-[44px] font-light tracking-tight leading-[1.05] mb-8" style={{ fontFamily: fonts.display }}>
            Borrowing has<br /> never been <span className="font-semibold text-violet-400">easier</span>
          </h1>
          <div className="flex items-center justify-between opacity-60 text-white">
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
                    if (item.id === "unsecured") handleUnsecuredClick();
                }}
                disabled={navigating}
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
    </>
  );
};

export default CreditHome;