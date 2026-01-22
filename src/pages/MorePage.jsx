import React from "react";
import { Capacitor } from "@capacitor/core";

const MorePage = () => {
  const isNative =
    typeof Capacitor.isNativePlatform === "function"
      ? Capacitor.isNativePlatform()
      : Capacitor.getPlatform() !== "web";

  const handleSetupBiometrics = async () => {
    try {
      if (!isNative) {
        window.alert("Biometrics only works in the mobile app");
        return;
      }

      const platform = Capacitor.getPlatform();
      if (platform !== "ios" && platform !== "android") {
        window.alert("Not supported");
        return;
      }

      const moduleName = "@aparajita/capacitor-biometric-auth";
      const { BiometricAuth } = await import(
        /* @vite-ignore */
        moduleName
      );

      await BiometricAuth.authenticate({
        reason: "Confirm your identity to enable biometrics",
        cancelTitle: "Cancel",
      });

      localStorage.setItem("biometricsEnabled", "true");
      window.alert("Biometrics enabled successfully");
    } catch (error) {
      console.error("Failed to enable biometrics", error);
      window.alert("Biometric verification failed");
    }
  };

  const handleDisableBiometrics = () => {
    localStorage.removeItem("biometricsEnabled");
  };

  const menuItems = [
    { id: "profile", label: "Profile Details" },
    { id: "kyc", label: "KYC Status" },
    { id: "banks", label: "Linked Bank Accounts" },
    { id: "settings", label: "Settings" },
    { id: "preferences", label: "Preferences" },
    { id: "help", label: "Help & FAQs" },
    { id: "legal", label: "Legal" },
    { id: "privacy", label: "Privacy" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-6 pt-12 pb-24">
      <h1 className="mb-8 text-3xl font-semibold text-slate-900">More</h1>
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">Enable Biometrics</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use Face ID for faster and secure login
          </p>
        </div>
        <button
          onClick={handleSetupBiometrics}
          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-white transition active:scale-95"
        >
          SETUP BIOMETRICS
        </button>
        <button
          onClick={handleDisableBiometrics}
          className="ml-3 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-slate-700 transition active:scale-95"
        >
          Disable Biometrics
        </button>
      </div>
      <div className="space-y-2">
        {menuItems.map((item) => (
          <button 
            key={item.id}
            onClick={item.onClick}
            className="w-full rounded-2xl bg-white p-5 text-left font-medium text-slate-700 shadow-sm transition active:scale-95"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// THIS IS THE MISSING LINE:
export default MorePage;
