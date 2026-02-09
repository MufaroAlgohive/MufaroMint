import React, { useRef, useState, useEffect } from "react";
import { ArrowLeft, Camera } from "lucide-react";
import { useProfile } from "../lib/useProfile";
import { supabase } from "../lib/supabase";
import EditProfileSkeleton from "../components/EditProfileSkeleton";
import GenderSelector from "../components/GenderSelector";
import DateOfBirthPicker from "../components/DateOfBirthPicker";
import AddressAutocomplete from "../components/AddressAutocomplete";
import PhoneInput from "../components/PhoneInput";

const EditProfilePage = ({ onNavigate, onBack }) => {
  const { profile, setProfile, loading } = useProfile();
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    phoneNumber: "",
    dateOfBirth: "",
    gender: "",
    address: "",
  });

  useEffect(() => {
    if (!loading && profile) {
      setFormData({
        phoneNumber: profile.phoneNumber || "",
        dateOfBirth: profile.dateOfBirth || "",
        gender: profile.gender || "",
        address: profile.address || "",
      });
    }
  }, [loading, profile]);

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

  const handleAvatarSelect = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !supabase) return;

    setIsUploading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error("Unable to load user");
      }

      const userId = userData.user.id;
      const safeFileName = file.name
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9._-]/g, "");
      const filePath = `${userId}/${Date.now()}-${safeFileName || "profile-image"}`;
      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("profile-images")
        .getPublicUrl(filePath);
      const avatarUrl = publicUrlData?.publicUrl;

      if (avatarUrl) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: avatarUrl })
          .eq("id", userId);
        if (updateError) {
          throw updateError;
        }
        setProfile((prev) => ({ ...prev, avatarUrl }));
      }
    } catch (error) {
      console.error("Failed to upload avatar", error);
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!supabase) return;
    
    setIsSaving(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error("Unable to load user");
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          phone_number: formData.phoneNumber,
          date_of_birth: formData.dateOfBirth,
          gender: formData.gender,
          address: formData.address,
        })
        .eq("id", userData.user.id);

      if (updateError) {
        throw updateError;
      }

      setProfile((prev) => ({
        ...prev,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        address: formData.address,
      }));

      setToast({ show: true, message: "Profile updated successfully", type: "success" });
      setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
    } catch (error) {
      console.error("Failed to save profile", error);
      setToast({ show: true, message: "Failed to update profile", type: "error" });
      setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <EditProfileSkeleton />;
  }

  return (
    <div className="min-h-screen bg-white px-6 pb-10 pt-10">
      {toast.show && (
        <div
          className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 transform rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <header className="relative mb-8 flex items-center justify-center">
        <button
          type="button"
          onClick={() => onBack ? onBack() : onNavigate?.("more")}
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
              alt={displayName || "Profile"}
              className="h-20 w-20 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 bg-gradient-to-br from-violet-500 to-purple-600 text-lg font-semibold text-white">
              {initials || (loading ? "" : "—")}
            </div>
          )}
          <button
            type="button"
            onClick={handleAvatarSelect}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm transition active:scale-95"
            aria-label="Upload profile photo"
            disabled={isUploading}
          >
            <Camera className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">
          {displayName || (loading ? "" : "Not set")}
        </h2>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">First name</p>
            <p className="mt-1 text-base font-semibold text-slate-500">
              {fieldValue(profile.firstName)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Last name</p>
            <p className="mt-1 text-base font-semibold text-slate-500">
              {fieldValue(profile.lastName)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
            <p className="mt-1 text-base font-semibold text-slate-500">
              {fieldValue(profile.email)}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Phone number</label>
            <PhoneInput
              value={formData.phoneNumber}
              onChange={(value) => handleInputChange("phoneNumber", value)}
              placeholder="Phone number"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Date of birth</label>
            <DateOfBirthPicker
              value={formData.dateOfBirth}
              onChange={(value) => handleInputChange("dateOfBirth", value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Gender</label>
            <GenderSelector
              value={formData.gender}
              onChange={(value) => handleInputChange("gender", value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Address</label>
            <AddressAutocomplete
              value={formData.address}
              onChange={(value) => handleInputChange("address", value)}
              placeholder="Search for your address"
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="mt-10 w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition active:scale-95 disabled:opacity-50"
      >
        {isSaving ? "Saving..." : "Save"}
      </button>
    </div>
  );
};

export default EditProfilePage;
