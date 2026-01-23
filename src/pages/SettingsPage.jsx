import React from "react";

const SettingsPage = ({ onNavigate }) => {
  const menuItems = [
    {
      id: "biometrics-debug",
      label: "Biometrics Debug",
      description: "Test Face ID and view diagnostic logs",
      onClick: () => onNavigate?.("biometricsDebug"),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-6 pt-12 pb-24">
      <div className="mb-8 flex items-center gap-3">
        <button
          onClick={() => onNavigate?.("more")}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition active:scale-95"
        >
          Back
        </button>
        <h1 className="text-3xl font-semibold text-slate-900">Settings</h1>
      </div>

      <div className="space-y-3">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className="w-full rounded-2xl bg-white p-5 text-left shadow-sm transition active:scale-95"
          >
            <div className="text-base font-semibold text-slate-900">{item.label}</div>
            <p className="mt-1 text-sm text-slate-500">{item.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SettingsPage;
