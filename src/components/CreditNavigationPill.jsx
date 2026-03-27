import React from "react";
import { motion } from "framer-motion";

const CreditNavigationPill = ({ activeTab = "home", onTabChange, className = "" }) => {
  const tabs = [
    { id: "credit", label: "Home" },
    { id: "instantLiquidity", label: "Secured" },
    { id: "creditApply", label: "Unsecured" },
    { id: "more", label: "More" },
  ];

  return (
    <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 ${className}`}>
      <div className="flex items-center rounded-full bg-white/10 p-1 backdrop-blur-md border border-white/10 relative">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onTabChange?.(tab.id)}
              className={`
                relative rounded-full px-4 py-1.5 text-xs font-semibold transition-colors duration-300
                ${isActive ? "text-slate-900" : "text-white/70"}
                ${tab.disabled ? "text-white/30 cursor-default" : "hover:text-white"}
                outline-none tap-highlight-transparent
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="creditActiveTabBackground"
                  className="absolute inset-0 bg-white rounded-full shadow-sm"
                  transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
                  style={{ zIndex: -1 }}
                />
              )}
              
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CreditNavigationPill;
