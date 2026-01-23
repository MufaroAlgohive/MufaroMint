import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { 
  isBiometricsAvailable, 
  isBiometricsEnabled, 
  enableBiometrics, 
  disableBiometrics,
  authenticateWithBiometrics,
  getBiometryTypeName,
  isNativePlatform
} from "../lib/biometrics";

const MorePage = () => {
  const [biometricsOn, setBiometricsOn] = useState(false);
  const [biometryType, setBiometryType] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const init = async () => {
      const { available, biometryType: type } = await isBiometricsAvailable();
      setIsAvailable(available);
      setBiometryType(type);
      setBiometricsOn(isBiometricsEnabled());
      
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
        }
      }
    };
    init();
  }, []);

  const biometryName = getBiometryTypeName(biometryType);

  const handleToggle = async () => {
    if (isToggling) return;
    
    if (biometricsOn) {
      disableBiometrics();
      setBiometricsOn(false);
    } else {
      if (!isNativePlatform()) {
        window.alert("Biometrics only works in the mobile app");
        return;
      }
      
      if (!userEmail) {
        window.alert("Unable to verify your account. Please try again.");
        return;
      }
      
      setIsToggling(true);
      try {
        await authenticateWithBiometrics(`Enable ${biometryName} for login`);
        enableBiometrics(userEmail);
        setBiometricsOn(true);
      } catch (error) {
        console.error("Failed to enable biometrics:", error);
      } finally {
        setIsToggling(false);
      }
    }
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
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-900">
              {biometricsOn ? `${biometryName} is on` : `Enable ${biometryName}`}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Use {biometryName} for faster and secure login
            </p>
          </div>
          
          <button
            onClick={handleToggle}
            disabled={isToggling || (!isAvailable && !biometricsOn)}
            className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              biometricsOn ? 'bg-green-500' : 'bg-slate-300'
            }`}
            role="switch"
            aria-checked={biometricsOn}
          >
            <span
              className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                biometricsOn ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
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

export default MorePage;
