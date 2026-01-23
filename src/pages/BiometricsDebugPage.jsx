import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  authenticateWithBiometrics,
  isBiometricsAvailable,
  isNativePlatform,
} from "../lib/biometrics";

const formatErrorDetails = (error) => {
  if (!error) return "Unknown error";
  const name = error?.name || "Unknown";
  const message = error?.message || String(error);
  const code = error?.code ?? "Unknown";
  const details = [`Error name: ${name}`, `Error code: ${code}`, `Error message: ${message}`];
  if (error?.stack) details.push(`Stack: ${error.stack}`);
  return details.join("\n");
};

export default function BiometricsDebugPage({ onNavigate }) {
  const [logs, setLogs] = useState([]);
  const [isTesting, setIsTesting] = useState(false);

  const addLog = useCallback((message) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const platform = useMemo(() => Capacitor.getPlatform(), []);
  const nativePlatform = useMemo(() => isNativePlatform(), []);

  useEffect(() => {
    addLog(`Platform: ${platform}`);
    addLog(`Native platform: ${nativePlatform}`);
  }, [addLog, nativePlatform, platform]);

  const handleTest = async () => {
    if (isTesting) return;
    setIsTesting(true);

    addLog("Starting biometrics test...");
    addLog(`Platform live: ${Capacitor.getPlatform()}`);
    addLog(`Native live: ${isNativePlatform()}`);

    try {
      addLog("Checking biometrics availability...");
      const { available, biometryType } = await isBiometricsAvailable();
      addLog(`Availability: ${available ? "available" : "unavailable"}`);
      addLog(`Biometry type: ${biometryType || "unknown"}`);

      if (!available) {
        addLog("Biometrics not available; skipping authentication.");
        return;
      }

      addLog("Prompting biometrics...");
      await authenticateWithBiometrics("Sign in to Mint");
      addLog("Authentication successful.");
    } catch (error) {
      addLog("Authentication failed.");
      addLog(formatErrorDetails(error));
      console.log("Biometrics full error:", error);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 pt-12 pb-24">
      <div className="mb-8 flex items-center gap-3">
        <button
          onClick={() => onNavigate?.("settings")}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition active:scale-95"
        >
          Back
        </button>
        <h1 className="text-3xl font-semibold text-slate-900">Biometrics Debug</h1>
      </div>

      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">
          Use this tool to validate biometrics wiring and review step by step logs.
        </p>

        <button
          onClick={handleTest}
          disabled={isTesting}
          className="mt-4 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/20 transition active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isTesting ? "Testing..." : "Test Biometrics"}
        </button>

        <button
          onClick={() => setLogs([])}
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-800 shadow-sm transition active:scale-95"
        >
          Clear Logs
        </button>
      </div>

      <div className="rounded-2xl bg-slate-900 p-4 text-sm text-slate-100 shadow-inner">
        <pre className="max-h-[380px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950/50 p-3 text-xs leading-relaxed">
          {logs.length ? logs.join("\n\n") : "No logs yet."}
        </pre>
      </div>
    </div>
  );
}
