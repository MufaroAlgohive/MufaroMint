import React from "react";
import Navbar from "../components/Navbar.jsx";

const AppLayout = ({ activeTab, onTabChange, children }) => {
  return (
    <div className="app-shell flex min-h-screen flex-col bg-white overflow-hidden">
      <main
        className="app-content flex-1 overflow-y-auto"
        style={{
          paddingBottom: "var(--navbar-height, calc(6rem + env(safe-area-inset-bottom)))",
        }}
      >
        {children}
      </main>
      <Navbar activeTab={activeTab} setActiveTab={onTabChange} />
    </div>
  );
};

export default AppLayout;
