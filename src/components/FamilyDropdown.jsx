import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ChevronDown, User, Users, Heart } from "lucide-react";

function getAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function MemberAvatar({ firstName, avatarUrl, size = "h-9 w-9", isChild = false, isSpouse = false }) {
  const initial = (firstName || "?")[0].toUpperCase();
  if (avatarUrl) {
    return <img src={avatarUrl} alt={firstName} className={`${size} rounded-full object-cover`} />;
  }
  return (
    <div
      className={`${size} rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}
      style={{ background: isSpouse ? "linear-gradient(135deg,#7c3aed,#a855f7)" : isChild ? "linear-gradient(135deg,#5b21b6,#8b5cf6)" : "rgba(255,255,255,0.15)" }}
    >
      {isChild ? <span className="text-[10px]">🎮</span> : initial}
    </div>
  );
}

export default function FamilyDropdown({ profile, userId, initials, avatarUrl }) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", date_of_birth: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dropdownRef = useRef(null);

  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "My Account";

  useEffect(() => {
    if (open && userId) fetchMembers();
  }, [open, userId]);

  useEffect(() => {
    function handleOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  async function fetchMembers() {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/family-members?user_id=${userId}`);
      const json = await res.json();
      setMembers(json.members || []);
    } catch (e) {
      console.error("[family] fetch error", e);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal(type) {
    setAddType(type);
    setForm({ first_name: "", last_name: "", date_of_birth: "" });
    setError("");
    setShowAddModal(true);
    setOpen(false);
  }

  async function handleSave() {
    if (!form.first_name.trim()) {
      setError("First name is required.");
      return;
    }
    if (addType === "child" && !form.date_of_birth) {
      setError("Date of birth is required for a child.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/family-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_user_id: userId,
          relationship: addType,
          first_name: form.first_name,
          last_name: form.last_name,
          date_of_birth: form.date_of_birth || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not add family member.");
        return;
      }
      setMembers((prev) => [...prev, json.member]);
      setShowAddModal(false);
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const spouse = members.find((m) => m.relationship === "spouse");
  const children = members.filter((m) => m.relationship === "child");

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 focus:outline-none"
          aria-label="Open family menu"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-10 w-10 rounded-full border border-white/40 object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 border border-white/30 text-xs font-semibold text-white">
              {initials || "—"}
            </div>
          )}
          <ChevronDown
            className={`h-4 w-4 text-white/70 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute left-0 top-full mt-2 z-50 min-w-[260px] rounded-2xl shadow-2xl overflow-hidden"
              style={{ background: "#1a1325", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {/* Main Account */}
              <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="relative">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                      style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
                    >
                      {initials || "—"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                  <p className="text-xs text-white/50">Main Account</p>
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
              </div>

              {/* Spouse section */}
              {(spouse || true) && (
                <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold tracking-widest text-white/35 uppercase flex items-center gap-1.5">
                    <Heart className="h-3 w-3" /> Spouse Account
                  </p>
                  {spouse ? (
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <MemberAvatar firstName={spouse.first_name} avatarUrl={spouse.avatar_url} isSpouse />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {[spouse.first_name, spouse.last_name].filter(Boolean).join(" ")}
                        </p>
                        {spouse.mint_number && (
                          <p className="text-[11px] text-white/40 font-mono">{spouse.mint_number}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => openAddModal("spouse")}
                      className="flex items-center gap-2.5 px-4 py-2.5 w-full text-left group"
                    >
                      <div
                        className="h-9 w-9 rounded-full border-2 border-dashed flex items-center justify-center flex-shrink-0 transition-colors group-hover:border-violet-400"
                        style={{ borderColor: "rgba(139,92,246,0.4)" }}
                      >
                        <Plus className="h-3.5 w-3.5 text-violet-400" />
                      </div>
                      <span className="text-sm font-medium text-violet-400 group-hover:text-violet-300 transition-colors">
                        Add Spouse Account
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Children section */}
              <div>
                <p className="px-4 pt-3 pb-1 text-[10px] font-bold tracking-widest text-white/35 uppercase flex items-center gap-1.5">
                  <Users className="h-3 w-3" /> Child Accounts
                </p>
                {loading ? (
                  <div className="px-4 py-3 text-xs text-white/40">Loading...</div>
                ) : (
                  <>
                    {children.map((child) => {
                      const age = getAge(child.date_of_birth);
                      return (
                        <div key={child.id} className="flex items-center gap-3 px-4 py-2.5">
                          <MemberAvatar firstName={child.first_name} avatarUrl={child.avatar_url} isChild />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {[child.first_name, child.last_name].filter(Boolean).join(" ")}
                            </p>
                            <p className="text-[11px] text-white/40">
                              {age !== null ? `Age ${age}` : ""}{age !== null && child.mint_number ? " · " : ""}{child.mint_number || ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => openAddModal("child")}
                      className="flex items-center gap-2.5 px-4 py-3 w-full text-left group"
                    >
                      <div
                        className="h-9 w-9 rounded-full border-2 border-dashed flex items-center justify-center flex-shrink-0 transition-colors group-hover:border-violet-400"
                        style={{ borderColor: "rgba(139,92,246,0.4)" }}
                      >
                        <Plus className="h-3.5 w-3.5 text-violet-400" />
                      </div>
                      <span className="text-sm font-medium text-violet-400 group-hover:text-violet-300 transition-colors">
                        Add Child Account
                      </span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
            <motion.div
              className="relative w-full max-w-sm mx-4 rounded-3xl p-6 shadow-2xl"
              style={{ background: "#1a1325", border: "1px solid rgba(255,255,255,0.1)" }}
              initial={{ y: 60, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <X className="h-4 w-4 text-white/60" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
                >
                  {addType === "spouse" ? <Heart className="h-4 w-4 text-white" /> : <Users className="h-4 w-4 text-white" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {addType === "spouse" ? "Add Spouse" : "Add Child"}
                  </h2>
                  <p className="text-xs text-white/50">
                    {addType === "spouse" ? "Link a spouse to your account" : "Add a child account"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">First Name *</label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                    placeholder="First name"
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                    placeholder="Last name"
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">
                    Date of Birth {addType === "child" ? "*" : ""}
                  </label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", colorScheme: "dark" }}
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full mt-2 rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
                >
                  {saving ? "Adding..." : addType === "spouse" ? "Add Spouse" : "Add Child"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
