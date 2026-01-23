import React from "react";
import {
  ArrowLeft,
  Settings,
  ReceiptText,
  MapPin,
  Lock,
  HelpCircle,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useProfile } from "../lib/useProfile";

const MorePage = ({ onNavigate }) => {
  const { profile } = useProfile();
  const displayName = profile.fullName || "Your Name";
  const displayUsername = profile.username || "@username";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const menuSections = [
    [
      { id: "settings", label: "Settings", icon: Settings, onClick: () => onNavigate?.("settings") },
      { id: "orders", label: "My Orders", icon: ReceiptText },
      { id: "address", label: "Address", icon: MapPin },
      { id: "password", label: "Change Password", icon: Lock },
    ],
    [
      { id: "help", label: "Help & Support", icon: HelpCircle },
      { id: "logout", label: "Log out", icon: LogOut },
    ],
  ];

  return (
    <div className="min-h-screen bg-white px-6 pt-10 pb-24">
      <header className="relative mb-10 flex items-center justify-center">
        <button
          type="button"
          onClick={() => onNavigate?.("home")}
          className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">Profile</h1>
      </header>

      <div className="flex flex-col items-center text-center">
        <div className="relative">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={displayName}
              className="h-20 w-20 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-lg font-semibold text-slate-600">
              {initials || "ME"}
            </div>
          )}
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">{displayName}</h2>
        <p className="mt-1 text-sm text-slate-500">{displayUsername}</p>
        <button
          type="button"
          onClick={() => onNavigate?.("editProfile")}
          className="mt-5 rounded-full bg-slate-900 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition active:scale-95"
        >
          Edit Profile
        </button>
      </div>

      <div className="mt-8 space-y-6">
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
