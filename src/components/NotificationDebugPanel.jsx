import React, { useState } from "react";
import { Bug, Bell, CheckCircle, Clock, AlertTriangle, Landmark, Shield, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";
import { createKycNotification, createBankNotification, createSecurityNotification } from "../lib/NotificationsContext";
import { useNotificationsContext } from "../lib/NotificationsContext";
import { useRequiredActions } from "../lib/useRequiredActions";

const NotificationDebugPanel = ({ onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const { notifications, unreadCount, refetch: refetchNotifications } = useNotificationsContext();
  const { kycVerified, kycPending, kycNeedsResubmission, bankLinked, bankInReview, refetch: refetchActions } = useRequiredActions();

  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[NotificationDebug] ${message}`);
  };

  const clearLogs = () => setLogs([]);

  const getUserId = async () => {
    if (!supabase) {
      addLog("Supabase not configured", "error");
      return null;
    }
    const { data } = await supabase.auth.getUser();
    if (!data?.user?.id) {
      addLog("User not logged in", "error");
      return null;
    }
    addLog(`User ID: ${data.user.id}`, "info");
    return data.user.id;
  };

  const testKycNotification = async (status) => {
    setLoading(true);
    addLog(`Testing KYC notification: ${status}`, "info");
    
    const userId = await getUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    const result = await createKycNotification(userId, status);
    addLog(`KYC notification result: ${result ? "SUCCESS" : "FAILED"}`, result ? "success" : "error");
    
    await refetchNotifications();
    setLoading(false);
  };

  const testBankNotification = async (status) => {
    setLoading(true);
    addLog(`Testing Bank notification: ${status}`, "info");
    
    const userId = await getUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    const result = await createBankNotification(userId, status, "Test Bank");
    addLog(`Bank notification result: ${result ? "SUCCESS" : "FAILED"}`, result ? "success" : "error");
    
    await refetchNotifications();
    setLoading(false);
  };

  const testSecurityNotification = async (action) => {
    setLoading(true);
    addLog(`Testing Security notification: ${action}`, "info");
    
    const userId = await getUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    const result = await createSecurityNotification(userId, action, { device: "Test Device" });
    addLog(`Security notification result: ${result ? "SUCCESS" : "FAILED"}`, result ? "success" : "error");
    
    await refetchNotifications();
    setLoading(false);
  };

  const updateKycStatus = async (status) => {
    setLoading(true);
    addLog(`Updating KYC status in database: ${status}`, "info");
    
    const userId = await getUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    let updateData = {};
    if (status === 'verified') {
      updateData = { kyc_verified: true, kyc_pending: false, kyc_needs_resubmission: false };
    } else if (status === 'pending') {
      updateData = { kyc_verified: false, kyc_pending: true, kyc_needs_resubmission: false };
    } else if (status === 'needs_resubmission') {
      updateData = { kyc_verified: false, kyc_pending: false, kyc_needs_resubmission: true };
    } else if (status === 'unverified') {
      updateData = { kyc_verified: false, kyc_pending: false, kyc_needs_resubmission: false };
    }

    const { error } = await supabase
      .from("required_actions")
      .update(updateData)
      .eq("user_id", userId);

    if (error) {
      addLog(`Database update failed: ${error.message}`, "error");
    } else {
      addLog(`Database updated to: ${status}`, "success");
      addLog("Real-time listener should trigger notification...", "info");
    }

    await refetchActions();
    setLoading(false);
  };

  const getStatusColor = (verified, pending, needsResubmission) => {
    if (verified) return "text-green-600";
    if (pending) return "text-blue-600";
    if (needsResubmission) return "text-amber-600";
    return "text-slate-400";
  };

  const getStatusText = () => {
    if (kycVerified) return "Verified";
    if (kycPending) return "Pending";
    if (kycNeedsResubmission) return "Needs Resubmission";
    return "Unverified";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <Bug className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold">Notification Debug</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="mb-6 p-4 rounded-2xl bg-slate-50">
          <p className="text-xs font-semibold text-slate-500 mb-2">CURRENT STATUS</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-400" />
              <span>Notifications: <strong>{unreadCount}</strong> unread</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className={`h-4 w-4 ${getStatusColor(kycVerified, kycPending, kycNeedsResubmission)}`} />
              <span>KYC: <strong className={getStatusColor(kycVerified, kycPending, kycNeedsResubmission)}>{getStatusText()}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Landmark className={`h-4 w-4 ${bankLinked ? "text-green-600" : "text-slate-400"}`} />
              <span>Bank: <strong>{bankLinked ? "Linked" : bankInReview ? "In Review" : "Not Linked"}</strong></span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">TEST KYC STATUS CHANGE (via Database)</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateKycStatus('verified')}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl bg-green-100 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" /> Set Verified
              </button>
              <button
                onClick={() => updateKycStatus('pending')}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-100 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-200 disabled:opacity-50"
              >
                <Clock className="h-4 w-4" /> Set Pending
              </button>
              <button
                onClick={() => updateKycStatus('needs_resubmission')}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-100 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-200 disabled:opacity-50"
              >
                <AlertTriangle className="h-4 w-4" /> Set Needs Resubmission
              </button>
              <button
                onClick={() => updateKycStatus('unverified')}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" /> Reset to Unverified
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">TEST DIRECT NOTIFICATIONS</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => testKycNotification('verified')}
                disabled={loading}
                className="rounded-xl bg-green-50 px-3 py-2 text-xs font-medium text-green-600 hover:bg-green-100 disabled:opacity-50"
              >
                KYC Verified
              </button>
              <button
                onClick={() => testKycNotification('pending')}
                disabled={loading}
                className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-100 disabled:opacity-50"
              >
                KYC Pending
              </button>
              <button
                onClick={() => testKycNotification('needs_resubmission')}
                disabled={loading}
                className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-600 hover:bg-amber-100 disabled:opacity-50"
              >
                KYC Resubmit
              </button>
              <button
                onClick={() => testBankNotification('linked')}
                disabled={loading}
                className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Bank Linked
              </button>
              <button
                onClick={() => testSecurityNotification('login')}
                disabled={loading}
                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
              >
                Security Login
              </button>
              <button
                onClick={() => testSecurityNotification('password_changed')}
                disabled={loading}
                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
              >
                Password Changed
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500">DEBUG LOG</p>
              <button
                onClick={clearLogs}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            </div>
            <div className="h-40 overflow-y-auto rounded-xl bg-slate-900 p-3 font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-slate-500">No logs yet. Click a button to test.</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={`${
                    log.type === 'error' ? 'text-red-400' : 
                    log.type === 'success' ? 'text-green-400' : 
                    'text-slate-300'
                  }`}>
                    <span className="text-slate-500">[{log.timestamp}]</span> {log.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              refetchNotifications();
              refetchActions();
              addLog("Refreshed all data", "info");
            }}
            className="flex-1 rounded-full bg-slate-100 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Refresh Data
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-full bg-slate-900 py-3 text-sm font-medium text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationDebugPanel;
