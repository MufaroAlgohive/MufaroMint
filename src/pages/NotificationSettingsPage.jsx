import React, { useState, useEffect } from "react";
import { ArrowLeft, Bell, CreditCard, Shield, TrendingUp, Gift, Landmark, Info, UserCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useNotificationsContext } from "../lib/NotificationsContext";

const notificationTypes = [
  {
    id: "transaction",
    label: "Transactions",
    description: "Deposits, withdrawals, and payment confirmations",
    icon: CreditCard,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    id: "security",
    label: "Security",
    description: "Login alerts and security updates",
    icon: Shield,
    color: "bg-red-100 text-red-600",
  },
  {
    id: "investment",
    label: "Investments",
    description: "Portfolio updates and goal progress",
    icon: TrendingUp,
    color: "bg-teal-100 text-teal-600",
  },
  {
    id: "credit",
    label: "Credit & Loans",
    description: "Loan approvals and payment reminders",
    icon: CreditCard,
    color: "bg-indigo-100 text-indigo-600",
  },
  {
    id: "promotion",
    label: "Promotions",
    description: "Special offers and rewards",
    icon: Gift,
    color: "bg-amber-100 text-amber-600",
  },
  {
    id: "verification",
    label: "Verification",
    description: "KYC status and document updates",
    icon: UserCheck,
    color: "bg-purple-100 text-purple-600",
  },
  {
    id: "bank",
    label: "Bank Accounts",
    description: "Bank linking and verification status",
    icon: Landmark,
    color: "bg-slate-100 text-slate-600",
  },
  {
    id: "system",
    label: "System Updates",
    description: "App updates and maintenance notices",
    icon: Info,
    color: "bg-blue-100 text-blue-600",
  },
];

const NotificationSettingsPage = ({ onBack }) => {
  const { preferences: contextPrefs, updatePreferences: updateContextPrefs } = useNotificationsContext();
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allEnabled, setAllEnabled] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    if (!supabase) {
      const defaultPrefs = {};
      notificationTypes.forEach((type) => {
        defaultPrefs[type.id] = true;
      });
      setPreferences(defaultPrefs);
      setLoading(false);
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", userData.user.id)
        .single();

      if (profile?.notification_preferences) {
        setPreferences(profile.notification_preferences);
        const allOn = Object.values(profile.notification_preferences).every((v) => v === true);
        setAllEnabled(allOn);
      } else {
        const defaultPrefs = {};
        notificationTypes.forEach((type) => {
          defaultPrefs[type.id] = true;
        });
        setPreferences(defaultPrefs);
      }
    } catch (err) {
      console.error("Error loading preferences:", err);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPrefs) => {
    if (!supabase) return;

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      await supabase
        .from("profiles")
        .update({ notification_preferences: newPrefs })
        .eq("id", userData.user.id);
      
      updateContextPrefs(newPrefs);
    } catch (err) {
      console.error("Error saving preferences:", err);
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (typeId) => {
    const newPrefs = { ...preferences, [typeId]: !preferences[typeId] };
    setPreferences(newPrefs);
    setAllEnabled(Object.values(newPrefs).every((v) => v === true));
    savePreferences(newPrefs);
  };

  const toggleAll = () => {
    const newValue = !allEnabled;
    const newPrefs = {};
    notificationTypes.forEach((type) => {
      newPrefs[type.id] = newValue;
    });
    setPreferences(newPrefs);
    setAllEnabled(newValue);
    savePreferences(newPrefs);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-10 pt-12 md:max-w-md md:px-8">
          <header className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Back"
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold">Notification Settings</h1>
            <div className="w-10" />
          </header>
          <div className="mt-8 animate-pulse space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-10 pt-12 md:max-w-md md:px-8">
        <header className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Back"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Notification Settings</h1>
          <div className="w-10" />
        </header>

        <div className="mt-6 rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">All Notifications</p>
                <p className="text-xs text-slate-500">Enable or disable all at once</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleAll}
              className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                allEnabled ? "bg-green-500" : "bg-slate-300"
              }`}
              role="switch"
              aria-checked={allEnabled}
            >
              <span
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  allEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Notification Types
          </p>
          {notificationTypes.map((type) => {
            const Icon = type.icon;
            const isEnabled = preferences[type.id] !== false;
            return (
              <div
                key={type.id}
                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${type.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{type.label}</p>
                    <p className="text-xs text-slate-500">{type.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => togglePreference(type.id)}
                  className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isEnabled ? "bg-green-500" : "bg-slate-300"
                  }`}
                  role="switch"
                  aria-checked={isEnabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {saving && (
          <p className="mt-4 text-center text-xs text-slate-400">Saving...</p>
        )}
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
