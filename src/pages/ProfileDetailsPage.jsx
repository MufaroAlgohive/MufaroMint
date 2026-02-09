import React from "react";
import { ArrowLeft } from "lucide-react";
import { useProfile } from "../lib/useProfile";
import EditProfileSkeleton from "../components/EditProfileSkeleton";

const ProfileDetailsPage = ({ onNavigate, onBack }) => {
  const { profile, loading } = useProfile();

  const displayName = loading
    ? ""
    : [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const fieldValue = (value) => {
    if (loading) return "";
    return value || "Not set";
  };

  if (loading) {
    return <EditProfileSkeleton />;
  }

  return (
    <div className="min-h-screen bg-white px-6 pb-10 pt-10">
      <header className="relative mb-8 flex items-center justify-center">
        <button
          type="button"
          onClick={() => onBack ? onBack() : onNavigate?.("more")}
          className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">Profile Details</h1>
      </header>

      <div className="flex flex-col items-center text-center">
        <div className="relative">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={displayName || "Profile"}
              className="h-20 w-20 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 bg-gradient-to-br from-violet-500 to-purple-600 text-lg font-semibold text-white">
              {initials || "—"}
            </div>
          )}
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">
          {displayName || "Not set"}
        </h2>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">First name</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {fieldValue(profile.firstName)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Last name</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {fieldValue(profile.lastName)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {fieldValue(profile.email)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Phone number</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {fieldValue(profile.phoneNumber)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Date of birth</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {fieldValue(profile.dateOfBirth)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Gender</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {fieldValue(profile.gender)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Address</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {fieldValue(profile.address)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDetailsPage;
