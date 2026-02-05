import React, { useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import {
  Home,
  PieChart,
  MoreHorizontal,
  FileText
} from "lucide-react";
 
const Navbar = ({ activeTab, setActiveTab }) => {
  const navRef = useRef(null);
  
  const ImpactStyle = {
    Light: "LIGHT",
    Medium: "MEDIUM",
    Heavy: "HEAVY",
  };
 
  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "investments", label: "Portfolio", icon: PieChart },
    { id: "statements", label: "Statements", icon: FileText },
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
  
  return createPortal(
    <nav
      ref={navRef}
      className="fixed bottom-0 left-0 right-0 z-[1000] border-t border-white/10 bg-white/70 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl"
    >
      <div className="relative mx-auto grid w-full max-w-lg grid-cols-4 items-center px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              triggerHaptic(ImpactStyle.Light);
              setActiveTab(tab.id);
            }}
            className={`flex flex-col items-center justify-center gap-1 transition-all ${
              activeTab === tab.id ? "text-[#31005e] scale-110" : "text-slate-400 opacity-60"
            }`}
          >
            <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 1.5} />
            <span className="text-[8px] font-black uppercase tracking-[0.1em]">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>,
    document.body
  );
};
 
export default Navbar;