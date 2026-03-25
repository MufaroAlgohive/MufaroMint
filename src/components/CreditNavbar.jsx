import React, { useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  Home,
  ShieldCheck,
  Zap,
  MoreHorizontal,
} from "lucide-react";

// We use the same fixed format as the main Navbar
const CreditNavbar = ({ activeTab, setActiveTab }) => {
  const navRef = useRef(null);
  const ImpactStyle = {
    Light: "LIGHT",
  };
 
  const tabs = [
    { id: "credit", label: "Home", icon: Home },
    { id: "instantLiquidity", label: "Secured", icon: ShieldCheck },
    { id: "creditApply", label: "Unsecured", icon: Zap },
    { id: "more", label: "More", icon: MoreHorizontal },
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

  const updateNavbarHeight = () => {
    if (navRef.current) {
      const { offsetHeight } = navRef.current;
      document.documentElement.style.setProperty("--navbar-height", `${offsetHeight}px`);
    }
  };

  useLayoutEffect(() => {
    updateNavbarHeight();
    window.addEventListener("resize", updateNavbarHeight);
    window.addEventListener("orientationchange", updateNavbarHeight);
    return () => {
      window.removeEventListener("resize", updateNavbarHeight);
      window.removeEventListener("orientationchange", updateNavbarHeight);
    };
  }, []);

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
      {createPortal(
        <nav
          ref={navRef}
          className="fixed bottom-0 left-0 right-0 z-[1000] border-t border-white/10 bg-white/70 pb-1 pt-3 backdrop-blur-2xl"
          style={{
            paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
            transform: "translateZ(0)",
            willChange: "transform"
          }}
        >
          <div className="relative mx-auto grid w-full max-w-lg grid-cols-4 items-center px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHaptic(ImpactStyle.Light);
                  setActiveTab(tab.id);
                }}
                className={`flex flex-col items-center justify-center gap-1.5 py-1 transition-all ${
                  activeTab === tab.id ? "text-[#31005e] scale-110" : "text-slate-400 opacity-60"
                }`}
              >
                <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 1.5} />
                <span className="text-[9px] font-black uppercase tracking-[0.1em]">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>,
        document.body
      )}
    </>
  );
};
 
export default CreditNavbar;
