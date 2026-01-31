import React, { useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  CreditCard,
  Plus,
  PieChart,
  MoreHorizontal,
  ArrowUpCircle,
  Wallet,
  TrendingUp,
  HandCoins,
  Gift,
  X
} from "lucide-react";
 
const Navbar = ({ activeTab, setActiveTab, onWithdraw, onShowComingSoon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [wheelCenter, setWheelCenter] = useState({ x: 0, y: 0 });
  const [dynamicRadius, setDynamicRadius] = useState(145);
  const plusButtonRef = useRef(null);
  const navRef = useRef(null);
  const ImpactStyle = {
    Light: "LIGHT",
    Medium: "MEDIUM",
    Heavy: "HEAVY",
  };
 
  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "credit", label: "Credit", icon: CreditCard },
    { id: "investments", label: "Portfolio", icon: PieChart },
    { id: "more", label: "More", icon: MoreHorizontal },
  ];
 
  const transactActions = [
    { id: "withdraw", label: "Withdraw", icon: ArrowUpCircle, angle: -180 },
    { id: "payLoan", label: "Pay", icon: Wallet, angle: -135 },
    { id: "markets", label: "Markets", icon: TrendingUp, angle: -90 },
    { id: "credit", label: "Borrow", icon: HandCoins, angle: -45 },
    { id: "rewards", label: "Rewards", icon: Gift, angle: 0 },
  ];
 
  const triggerHaptic = async (style) => {
    try {
      const haptics = window?.Capacitor?.Plugins?.Haptics;
      if (!haptics?.impact) {
        throw new Error("Haptics unavailable");
      }
      await haptics.impact({ style });
    } catch (error) {
      console.log("Native haptics only");
    }
  };

  const updateLayout = () => {
    if (plusButtonRef.current) {
      const rect = plusButtonRef.current.getBoundingClientRect();
      setWheelCenter({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2 - 10,
      });
      const calculatedRadius = Math.min(145, (window.innerWidth - 110) / 2);
      setDynamicRadius(calculatedRadius);
    }
  };

  const updateNavbarHeight = () => {
    if (navRef.current) {
      const { offsetHeight } = navRef.current;
      document.documentElement.style.setProperty("--navbar-height", `${offsetHeight}px`);
    }
  };

  useLayoutEffect(() => {
    // Update immediately on mount
    updateLayout();
    updateNavbarHeight();
    
    // Ensure navbar height is set before any painting
    if (navRef.current) {
      const height = navRef.current.offsetHeight;
      document.documentElement.style.setProperty("--navbar-height", `${height}px`);
    }
    
    window.addEventListener("resize", updateLayout);
    window.addEventListener("resize", updateNavbarHeight);
    window.addEventListener("orientationchange", updateNavbarHeight);
    
    return () => {
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("resize", updateNavbarHeight);
      window.removeEventListener("orientationchange", updateNavbarHeight);
    };
  }, []);

  useLayoutEffect(() => {
    updateNavbarHeight();
  }, [isOpen]);
  
  // Ensure navbar height persists after app reopen
  useLayoutEffect(() => {
    const interval = setTimeout(() => {
      if (navRef.current) {
        const height = navRef.current.offsetHeight;
        document.documentElement.style.setProperty("--navbar-height", `${height}px`);
      }
    }, 100);
    return () => clearTimeout(interval);
  }, []);
 
  return (
    <>
      {/* 1-2. Backdrop Blur + Rotating Menu Items */}
      {createPortal(
        <div className="fixed inset-0 z-[10000] pointer-events-none">
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  triggerHaptic(ImpactStyle.Light);
                  setIsOpen(false);
                }}
                className="fixed inset-0 pointer-events-auto bg-white/40 backdrop-blur-[6px]"
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ rotate: -180, opacity: 0, scale: 0.8 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 180, opacity: 0, scale: 0.8 }}
                transition={{
                  type: "spring",
                  stiffness: 120,
                  damping: 18,
                  duration: 0.45
                }}
                className="fixed pointer-events-none"
                style={{
                  left: wheelCenter.x,
                  top: wheelCenter.y,
                  width: 0,
                  height: 0,
                }}
              >
                {transactActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      triggerHaptic(ImpactStyle.Medium);
                      if (action.id === "withdraw") {
                        if (onWithdraw) {
                          onWithdraw();
                        }
                      } else if (action.id === "payLoan" || action.id === "rewards") {
                        if (onShowComingSoon) {
                          onShowComingSoon(action.label);
                        }
                      } else {
                        setActiveTab(action.id);
                      }
                      setIsOpen(false);
                    }}
                    className="absolute flex items-center justify-center group pointer-events-auto"
                    style={{
                      left: `${Math.cos(action.angle * (Math.PI / 180)) * dynamicRadius}px`,
                      top: `${Math.sin(action.angle * (Math.PI / 180)) * dynamicRadius}px`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div className="flex h-20 w-20 flex-col items-center justify-center gap-1.5 rounded-full border border-white/20 bg-[#31005e]/40 shadow-2xl transition-all group-active:scale-95 backdrop-blur-md">
                      <motion.div
                        initial={{ rotate: 180 }}
                        animate={{ rotate: 0 }}
                        exit={{ rotate: -180 }}
                        transition={{ duration: 0.45 }}
                        className="flex flex-col items-center"
                      >
                        <action.icon size={24} strokeWidth={1.5} className="text-white" />
                        <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.1em] text-white">
                          {action.label}
                        </span>
                      </motion.div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div
            style={{
              position: "fixed",
              left: 0,
              width: "100vw",
              display: "flex",
              justifyContent: "center",
              bottom: "calc(1rem + env(safe-area-inset-bottom) + 29px)",
              height: 0,
              pointerEvents: "none",
              zIndex: 10001
            }}
          >
            <div style={{ pointerEvents: "auto" }}>
            <button
              onClick={() => {
                updateLayout();
                const newOpenState = !isOpen;
                setIsOpen(newOpenState);
                triggerHaptic(newOpenState ? ImpactStyle.Heavy : ImpactStyle.Light);
              }}
              className={`pointer-events-auto flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full shadow-2xl transition-all active:scale-90 ${
                isOpen ? "bg-white text-[#31005e]" : "bg-black text-white"
              }`}
              style={{ marginTop: "-29px" }}
            >
              <div className="relative h-10 w-10 flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  {!isOpen ? (
                    <motion.div
                      key="plus-icon"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="flex h-full w-full items-center justify-center"
                    >
                      <Plus size={32} strokeWidth={2.5} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      className="flex h-full w-full items-center justify-center"
                    >
                      <X size={32} strokeWidth={3} className="text-[#31005e]" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </button>
            </div>
          </div>
        </div>,
        document.body
      )}
 
      {/* 3. Bottom Navbar */}
      {createPortal(
        <nav
          ref={navRef}
          className="fixed bottom-0 left-0 right-0 z-[1000] border-t border-white/10 bg-white/70 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl"
        >
          <div className="relative mx-auto grid w-full max-w-lg grid-cols-5 items-center px-4">
            {tabs.slice(0, 2).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHaptic(ImpactStyle.Light);
                  setActiveTab(tab.id);
                  setIsOpen(false);
                }}
                className={`flex flex-col items-center justify-center gap-1 transition-all ${
                  activeTab === tab.id ? "text-[#31005e] scale-110" : "text-slate-400 opacity-60"
                } ${isOpen ? "blur-[2px] opacity-40" : ""}`}
              >
                <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 1.5} />
                <span className="text-[8px] font-black uppercase tracking-[0.1em]">{tab.label}</span>
              </button>
            ))}

            <div className="flex h-16 items-center justify-center" ref={plusButtonRef} />

            {tabs.slice(2).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHaptic(ImpactStyle.Light);
                  setActiveTab(tab.id);
                  setIsOpen(false);
                }}
                className={`flex flex-col items-center justify-center gap-1 transition-all ${
                  activeTab === tab.id ? "text-[#31005e] scale-110" : "text-slate-400 opacity-60"
                } ${isOpen ? "blur-[2px] opacity-40" : ""}`}
              >
                <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 1.5} />
                <span className="text-[8px] font-black uppercase tracking-[0.1em]">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>,
        document.body
      )}
    </>
  );
};
 
export default Navbar;
