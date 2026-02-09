import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Smartphone, Monitor, Globe, LogOut, Shield, Clock, X, Eye, EyeOff, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

const formatDate = (dateStr) => {
  if (!dateStr) return 'Unknown';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Unknown';
  }
};

const PasswordConfirmModal = ({ show, onConfirm, onCancel, loading: confirming, error }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (show) {
      setPassword('');
      setShowPassword(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <Lock className="h-5 w-5 text-slate-700" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Confirm Password</h3>
            <p className="text-xs text-slate-500">Enter your password to continue</p>
          </div>
        </div>

        <div className="relative mb-3">
          <input
            ref={inputRef}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && password) onConfirm(password); }}
            placeholder="Enter your password"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {error && <p className="mb-3 text-xs text-red-500">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(password)}
            disabled={!password || confirming}
            className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white transition active:scale-95 disabled:opacity-50"
          >
            {confirming ? 'Verifying...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ActiveSessionsPage = ({ onNavigate, onBack }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [passwordModal, setPasswordModal] = useState({ show: false, action: null, actionArg: null });
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const getAuthToken = async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  };

  const fetchSessions = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      setUserEmail(userData?.user?.email || '');
      const fingerprint = localStorage.getItem('mint_session_fingerprint') || '';
      const res = await fetch(`/api/sessions/list?fingerprint=${encodeURIComponent(fingerprint)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setSessions(json.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const verifyPassword = async (password) => {
    if (!supabase || !userEmail) return false;
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password,
      });
      return !error;
    } catch {
      return false;
    }
  };

  const requestPasswordConfirm = (action, actionArg = null) => {
    setPasswordError('');
    setPasswordModal({ show: true, action, actionArg });
  };

  const handlePasswordConfirm = async (password) => {
    setPasswordLoading(true);
    setPasswordError('');
    const valid = await verifyPassword(password);
    if (!valid) {
      setPasswordError('Incorrect password. Please try again.');
      setPasswordLoading(false);
      return;
    }
    const { action, actionArg } = passwordModal;
    setPasswordModal({ show: false, action: null, actionArg: null });
    setPasswordLoading(false);
    if (action === 'revokeSession') await executeRevokeSession(actionArg);
    else if (action === 'signOutOthers') await executeSignOutOthers();
    else if (action === 'signOutGlobal') await executeSignOutGlobal();
  };

  const handlePasswordCancel = () => {
    setPasswordModal({ show: false, action: null, actionArg: null });
    setPasswordError('');
  };

  const handleRevokeSession = (sessionId) => requestPasswordConfirm('revokeSession', sessionId);
  const handleSignOutOthers = () => requestPasswordConfirm('signOutOthers');
  const handleSignOutGlobal = () => requestPasswordConfirm('signOutGlobal');

  const executeRevokeSession = async (sessionId) => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch('/api/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId }),
      });
      const json = await res.json();
      if (json.success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        showToast('Session revoked');
      }
    } catch (err) {
      console.error('Failed to revoke session:', err);
      showToast('Failed to revoke session', 'error');
    }
  };

  const executeSignOutOthers = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const currentSession = sessions.find((s) => s.is_current);
      if (!currentSession) {
        await supabase.auth.signOut({ scope: 'others' });
        showToast('Logged out of all other devices');
        return;
      }
      const res = await fetch('/api/sessions/revoke-others', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentSessionId: currentSession.id }),
      });
      const json = await res.json();
      if (json.success) {
        await supabase.auth.signOut({ scope: 'others' });
        setSessions((prev) => prev.filter((s) => s.is_current));
        showToast('Logged out of all other devices');
      }
    } catch (err) {
      console.error('Failed to sign out others:', err);
      showToast('Failed to log out other devices', 'error');
    }
  };

  const executeSignOutGlobal = async () => {
    try {
      const token = await getAuthToken();
      if (token) {
        const currentSession = sessions.find((s) => s.is_current);
        if (currentSession) {
          await fetch('/api/sessions/revoke-others', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ currentSessionId: 'none' }),
          });
        }
        await fetch('/api/sessions/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sessionId: currentSession?.id }),
        });
      }
      if (supabase) {
        await supabase.auth.signOut({ scope: 'global' });
      }
      onNavigate?.('auth');
    } catch (err) {
      console.error('Failed to sign out globally:', err);
      onNavigate?.('auth');
    }
  };

  const currentSession = sessions.find((s) => s.is_current);
  const otherSessions = sessions.filter((s) => !s.is_current);

  return (
    <div className="min-h-screen bg-slate-50 px-6 pt-12 pb-24">
      <PasswordConfirmModal
        show={passwordModal.show}
        onConfirm={handlePasswordConfirm}
        onCancel={handlePasswordCancel}
        loading={passwordLoading}
        error={passwordError}
      />
      {toast.show && (
        <div
          className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 transform rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      <header className="mb-8 flex items-center gap-3">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : onNavigate?.('settings'))}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-slate-900">Active Sessions</h1>
      </header>

      {loading ? (
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
          <div className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
          <div className="h-14 animate-pulse rounded-2xl bg-white shadow-sm" />
        </div>
      ) : (
        <div className="space-y-4">
          {currentSession && (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Shield className="h-5 w-5 text-slate-700" />
                <h2 className="text-base font-semibold text-slate-900">Current Session</h2>
              </div>
              <SessionCard session={currentSession} email={userEmail} isCurrent />
            </div>
          )}

          {otherSessions.length > 0 && (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Monitor className="h-5 w-5 text-slate-700" />
                <h2 className="text-base font-semibold text-slate-900">Other Devices</h2>
              </div>
              <div className="space-y-3">
                {otherSessions.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    email={userEmail}
                    isCurrent={false}
                    onRevoke={() => handleRevokeSession(s.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {sessions.length === 0 && !loading && (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Shield className="h-5 w-5 text-slate-700" />
                <h2 className="text-base font-semibold text-slate-900">Current Session</h2>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                    {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">This Device</span>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'Mobile Device' : 'Desktop'}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      <Globe className="h-3 w-3" />
                      <span>{userEmail || 'Unknown email'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSignOutOthers}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <LogOut className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-slate-900">Log out other devices</h2>
              <p className="text-sm text-slate-500">Sign out of all other sessions</p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleSignOutGlobal}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <LogOut className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-red-600">Log out everywhere</h2>
              <p className="text-sm text-slate-500">Sign out of all devices including this one</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

const SessionCard = ({ session, email, isCurrent, onRevoke }) => {
  const DeviceIcon = session.device_type === 'mobile' ? Smartphone : Monitor;

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          <DeviceIcon className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 truncate">
              {session.browser || 'Unknown'} on {session.os || 'Unknown'}
            </span>
            {isCurrent && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 flex-shrink-0">
                Active
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {session.device_type === 'mobile' ? 'Mobile Device' : 'Desktop'}
          </p>
          {session.created_at && (
            <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
              <Clock className="h-3 w-3" />
              <span>Signed in {formatDate(session.created_at)}</span>
            </div>
          )}
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
            <Globe className="h-3 w-3" />
            <span>{email || 'Unknown email'}</span>
          </div>
        </div>
        {!isCurrent && onRevoke && (
          <button
            type="button"
            onClick={onRevoke}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-red-500 transition"
            aria-label="Revoke session"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ActiveSessionsPage;
