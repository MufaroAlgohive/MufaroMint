import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const NavigationPill = ({ activeTab = "credit", onTabChange, className = "", theme = "dark" }) => {
  const isLight = theme === "light";
  const tabs = [
    { id: "home", label: "Wealth" },
    { id: "credit", label: "Credit" },
    { id: "transact", label: "Transact", disabled: true },
  ];

  const [showNewBadge, setShowNewBadge] = useState(false);

  useEffect(() => {
    const hasSeenFeature = localStorage.getItem("mint_seen_credit_feature");
    if (!hasSeenFeature) {
      setShowNewBadge(true);
    }
  }, []);

  const handleTabClick = (tabId) => {
    if (tabId === "credit") {
      localStorage.setItem("mint_seen_credit_feature", "true");
      setShowNewBadge(false);
    }
    onTabChange?.(tabId);
  };

  return (
    <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 ${className}`}>
      <div className={`flex items-center rounded-full p-1 backdrop-blur-md border relative ${isLight ? "bg-slate-100/50 border-slate-200" : "bg-white/10 border-white/10"}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && handleTabClick(tab.id)}
              className={`
                relative rounded-full px-4 py-1.5 text-xs font-semibold transition-colors duration-300
                ${isActive ? (isLight ? "text-white" : "text-slate-900") : (isLight ? "text-slate-500" : "text-white/70")}
                ${tab.disabled ? (isLight ? "text-slate-300 cursor-default" : "text-white/30 cursor-default") : (!isActive ? (isLight ? "hover:text-slate-900" : "hover:text-white") : "")}
                outline-none tap-highlight-transparent
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBackground"
                  className={`absolute inset-0 rounded-full shadow-sm z-0 ${isLight ? "bg-slate-900" : "bg-white"}`}
                  transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                />
              )}

              <span className="relative z-10">{tab.label}</span>

              {!tab.disabled && tab.id === "credit" && showNewBadge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-7 h-7 flex items-center justify-center pointer-events-none">
                  <motion.div
                    animate={{
                      scale: [1, 1.12, 1],
                      boxShadow: [
                        "0 0 0px rgba(139, 92, 246, 0)",
                        "0 0 16px rgba(139, 92, 246, 0.7)", 
                        "0 0 0px rgba(139, 92, 246, 0)"
                      ]
                    }}
                    transition={{
                      duration: 1.6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="w-6 h-6 bg-white rounded-full flex items-center justify-center border border-violet-100 shadow-sm"
                  >
                    <span className="text-violet-600 font-black text-[8px] leading-none tracking-tighter">
                      NEW
                    </span>
                  </motion.div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NavigationPill;
