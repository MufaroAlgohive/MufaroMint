import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronDown, Users, Heart } from "lucide-react";

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
      style={{ background: isSpouse ? "linear-gradient(135deg,#db2777,#a855f7)" : isChild ? "linear-gradient(135deg,#5b21b6,#8b5cf6)" : "rgba(255,255,255,0.15)" }}
    >
      {initial}
    </div>
  );
}

export default function FamilyDropdown({ profile, userId, initials, avatarUrl, onOpenFamily }) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [ready, setReady] = useState(false);
  const dropdownRef = useRef(null);
  const fetchedRef = useRef(false);

  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "My Account";

  useEffect(() => {
    if (userId && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchMembers();
    }
  }, [userId]);

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
    try {
      const res = await fetch(`/api/family-members?user_id=${userId}`);
      const json = await res.json();
      setMembers(json.members || []);
    } catch (e) {
      console.error("[family] fetch error", e);
    } finally {
      setReady(true);
    }
  }

  function goToFamily() {
    setOpen(false);
    if (onOpenFamily) onOpenFamily();
  }

  const spouse = members.find((m) => m.relationship === "spouse");
  const children = members.filter((m) => m.relationship === "child");

  return (
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

            {/* Members — shown only once data is ready */}
            {!ready ? (
              /* Unified skeleton — whole section at once, no partial loading */
              <div className="px-4 py-4 space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="h-9 w-9 rounded-full flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)" }} />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 rounded-full w-28" style={{ background: "rgba(255,255,255,0.08)" }} />
                      <div className="h-2 rounded-full w-16" style={{ background: "rgba(255,255,255,0.05)" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Spouse section */}
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
                    <button onClick={goToFamily} className="flex items-center gap-2.5 px-4 py-2.5 w-full text-left group">
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

                {/* Children section */}
                <div>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold tracking-widest text-white/35 uppercase flex items-center gap-1.5">
                    <Users className="h-3 w-3" /> Child Accounts
                  </p>
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
                            {age !== null ? `Age ${age}` : ""}
                            {age !== null && child.mint_number ? " · " : ""}
                            {child.mint_number || ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={goToFamily} className="flex items-center gap-2.5 px-4 py-3 w-full text-left group">
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
                </div>
              </>
            )}

            {/* View all link */}
            {members.length > 0 && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <button
                  onClick={goToFamily}
                  className="w-full px-4 py-3 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors text-center"
                >
                  View Family Dashboard →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
