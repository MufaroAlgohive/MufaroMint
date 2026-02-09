import { useEffect, useCallback, useRef } from 'react';

const TIMEOUT_MINUTES = 5;
const TIMEOUT_MS = TIMEOUT_MINUTES * 60 * 1000;
const LAST_ACTIVITY_KEY = 'mint_last_activity';

export function getLastActivityTimestamp() {
  const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
  return stored ? parseInt(stored, 10) : null;
}

export function hasInactivityExpired() {
  const last = getLastActivityTimestamp();
  if (!last) return false;
  return Date.now() - last >= TIMEOUT_MS;
}

function saveActivityTimestamp() {
  localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

export const useInactivityTimeout = ({ onLogout, enabled = true } = {}) => {
  const timerRef = useRef(null);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  const resetTimer = useCallback(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    saveActivityTimestamp();
    timerRef.current = setTimeout(() => {
      onLogoutRef.current?.();
    }, TIMEOUT_MS);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    if (hasInactivityExpired()) {
      onLogoutRef.current?.();
      return;
    }

    const last = getLastActivityTimestamp();
    if (last) {
      const elapsed = Date.now() - last;
      const remaining = TIMEOUT_MS - elapsed;
      if (remaining > 0) {
        timerRef.current = setTimeout(() => {
          onLogoutRef.current?.();
        }, remaining);
      } else {
        onLogoutRef.current?.();
        return;
      }
    } else {
      resetTimer();
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handler = () => resetTimer();

    events.forEach((event) => window.addEventListener(event, handler, { passive: true }));

    return () => {
      events.forEach((event) => window.removeEventListener(event, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, resetTimer]);
};

export default useInactivityTimeout;
