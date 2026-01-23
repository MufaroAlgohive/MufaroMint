import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Settings,
  BadgeCheck,
  Landmark,
  ReceiptText,
  MapPin,
  Lock,
  HelpCircle,
  Scale,
  ShieldCheck,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  authenticateWithBiometrics,
  disableBiometrics,
  enableBiometrics,
  getBiometryTypeName,
  isBiometricsAvailable,
  isBiometricsEnabled,
  isNativePlatform,
} from "../lib/biometrics";
import ProfileSkeleton from "../components/ProfileSkeleton";

const MorePage = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [biometricsOn, setBiometricsOn] = useState(false);
  const [biometryType, setBiometryType] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const displayName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ");
  const displayUsername = profile?.email
    ? `@${profile.email.split("@")[0]}`
    : "";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

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

  useEffect(() => {
    let alive = true;

    const loadProfile = async () => {
      try {
        if (!supabase) {
          if (alive) {
            setError("Supabase is not configured.");
            setLoading(false);
          }
          return;
        }

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          if (alive) {
            setError("Unable to load profile.");
            setLoading(false);
          }
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("first_name, last_name, email, avatar_url")
          .eq("id", userData.user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        if (alive) {
          setProfile(profileData);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        if (alive) {
          setError("Unable to load profile.");
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      alive = false;
    };
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

  const menuSections = [
    [
      { id: "profile", label: "Profile Details", icon: BadgeCheck },
      { id: "kyc", label: "KYC Status", icon: ShieldCheck },
      { id: "banks", label: "Linked Bank Accounts", icon: Landmark },
      { id: "settings", label: "Settings", icon: Settings, onClick: () => onNavigate?.("settings") },
      { id: "preferences", label: "Preferences", icon: Settings },
    ],
    [
      { id: "help", label: "Help & FAQs", icon: HelpCircle },
      { id: "legal", label: "Legal", icon: Scale },
      { id: "privacy", label: "Privacy", icon: ShieldCheck },
      { id: "orders", label: "My Orders", icon: ReceiptText },
      { id: "address", label: "Address", icon: MapPin },
      { id: "password", label: "Change Password", icon: Lock },
      { id: "logout", label: "Log out", icon: LogOut },
    ],
  ];

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white px-6 pt-10 pb-24">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  const nameLabel = displayName || "Not set";
  const usernameLabel = displayUsername || "Not set";

  return (
    <div className="min-h-screen bg-white px-6 pt-12 pb-24">
      <header className="mb-8 flex items-center">
        <button
          type="button"
          onClick={() => onNavigate?.("home")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-1 justify-center">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName || "Profile"}
              className="h-20 w-20 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-lg font-semibold text-slate-600">
              {initials || "—"}
            </div>
          )}
        </div>
        <div className="h-10 w-10" aria-hidden="true" />
      </header>

      <div className="flex flex-col items-center text-center">
        <h2 className="mt-4 text-xl font-semibold text-slate-900">{nameLabel}</h2>
        <p className="mt-1 text-sm text-slate-500">{usernameLabel}</p>
        <button
          type="button"
          onClick={() => onNavigate?.("editProfile")}
          className="mt-5 rounded-full bg-slate-900 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition active:scale-95"
        >
          Edit Profile
        </button>
      </div>

      <div className="mt-8">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
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
      </div>

      <div className="space-y-6">
        {menuSections.map((section, sectionIndex) => (
          <div key={`section-${sectionIndex}`} className="border-t border-slate-200 pt-4">
            <div className="space-y-2">
              {section.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className="flex w-full items-center justify-between rounded-2xl px-2 py-3 text-left text-slate-700 transition hover:bg-slate-50 active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-base font-medium text-slate-800">{item.label}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MorePage;
