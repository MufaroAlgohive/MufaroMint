import React from "react";
import { ArrowLeft, Camera } from "lucide-react";
import { useProfile } from "../lib/useProfile";

const EditProfilePage = ({ onNavigate }) => {
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

  const fieldValue = (value) => value || "—";

  return (
    <div className="min-h-screen bg-white px-6 pb-10 pt-10">
      <header className="relative mb-8 flex items-center justify-center">
        <button
          type="button"
          onClick={() => onNavigate?.("more")}
          className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">Edit Profile</h1>
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
          <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white">
            <Camera className="h-4 w-4" />
          </span>
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">{displayName}</h2>
        <p className="mt-1 text-sm text-slate-500">{displayUsername}</p>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Full name</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {fieldValue(profile.fullName)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Gender</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {fieldValue(profile.gender)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Birthday</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {fieldValue(profile.birthday)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Phone number</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {fieldValue(profile.phone)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {fieldValue(profile.email)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">User name</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {fieldValue(profile.username || displayUsername)}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="mt-10 w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition active:scale-95"
      >
        Save
      </button>
    </div>
  );
};

export default EditProfilePage;
