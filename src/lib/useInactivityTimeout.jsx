import { useState, useEffect, useCallback, useRef } from 'react';
import { Lock, LogOut } from 'lucide-react';
import { supabase } from './supabase';

const TIMEOUT_MINUTES = 5;

export const useInactivityTimeout = ({ onLogout, enabled = true } = {}) => {
  const [isLocked, setIsLocked] = useState(false);
  const timerRef = useRef(null);

  const resetTimer = useCallback(() => {
    if (isLocked || !enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const minutes = TIMEOUT_MINUTES;
    timerRef.current = setTimeout(() => {
      setIsLocked(true);
    }, minutes * 60 * 1000);
  }, [isLocked, enabled]);

  const unlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  const lock = useCallback(() => {
    setIsLocked(true);
  }, []);

  useEffect(() => {
    if (!enabled || isLocked) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    resetTimer();

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handler = () => resetTimer();

    events.forEach((event) => window.addEventListener(event, handler, { passive: true }));

    return () => {
      events.forEach((event) => window.removeEventListener(event, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLocked, enabled, resetTimer]);

  return { isLocked, unlock, lock };
};

export const InactivityLockScreen = ({ onUnlock, onLogout }) => {
  const handleLogout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error('Sign out failed:', e);
    }
    onLogout?.();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center px-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
          <Lock className="h-10 w-10 text-white" />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-white">Session Locked</h1>
        <p className="mt-2 text-center text-sm text-white/60">
          Your session was locked due to inactivity
        </p>

        <button
          type="button"
          onClick={onUnlock}
          className="mt-8 w-full rounded-full bg-white py-3.5 text-sm font-semibold text-slate-900 shadow-lg transition active:scale-95"
        >
          Unlock
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition active:scale-95"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </div>
    </div>
  );
};

export default useInactivityTimeout;
