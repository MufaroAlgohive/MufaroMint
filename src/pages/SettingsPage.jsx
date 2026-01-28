import React, { useEffect, useState } from "react";
import { ArrowLeft, Lock, Fingerprint, Bell } from "lucide-react";
import {
  authenticateWithBiometrics,
  disableBiometrics,
  enableBiometrics,
  getBiometryTypeName,
  isBiometricsAvailable,
  isBiometricsEnabled,
  isNativePlatform,
} from "../lib/biometrics";
import { supabase } from "../lib/supabase";

const SettingsPage = ({ onNavigate }) => {
  const [biometricsOn, setBiometricsOn] = useState(false);
  const [biometryType, setBiometryType] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const init = async () => {
      const { available, biometryType: type } = await isBiometricsAvailable();
      setIsAvailable(available);
      setBiometryType(type);
      setBiometricsOn(isBiometricsEnabled());

      if (supabase) {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.email) {
          setUserEmail(data.user.email);
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
      return;
    }

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
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 pt-12 pb-24">
      <header className="mb-8 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate?.("more")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
      </header>

      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <Fingerprint className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-slate-900">
                  Enable {biometryName}
                </h2>
                <p className="text-sm text-slate-500">
                  Use {biometryName} for faster and secure login
                </p>
              </div>
            </div>
            <button
              onClick={handleToggle}
              disabled={isToggling || (!isAvailable && !biometricsOn)}
              className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                biometricsOn ? "bg-green-500" : "bg-slate-300"
              }`}
              role="switch"
              aria-checked={biometricsOn}
            >
              <span
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  biometricsOn ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate?.("changePassword")}
          className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <Lock className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-900">Change Password</h2>
            <p className="text-sm text-slate-500">Update your account password</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.("notificationSettings")}
          className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <Bell className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-900">Notification Settings</h2>
            <p className="text-sm text-slate-500">Manage notification preferences</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.("biometricsDebug")}
          className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <Fingerprint className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-900">Biometrics Debug</h2>
            <p className="text-sm text-slate-500">Test Face ID and view diagnostic logs</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
