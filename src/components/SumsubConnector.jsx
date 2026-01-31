import { useCallback, useMemo, useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";

const styles = {
  wrapper: {
    width: "100%",
  },
  card: {
    width: "100%",
    maxWidth: 720,
    margin: "0 auto",
    background: "rgba(255,255,255,0.75)",
    border: "1px solid rgba(168,85,247,0.1)",
    borderRadius: 20,
    boxShadow:
      "inset 0 1px 2px rgba(255,255,255,0.8), inset 0 -1px 2px rgba(139,92,246,0.08), 0 16px 48px rgba(139,92,246,0.18)",
    padding: 28,
    backdropFilter: "blur(12px)",
  },
  header: {
    textAlign: "center",
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 14,
    color: "#5f5473",
    marginBottom: 8,
  },
  helper: {
    fontSize: 12,
    color: "#7a6f91",
    marginTop: 16,
  },
  button: (state) => ({
    width: "100%",
    borderRadius: 16,
    padding: "16px 24px",
    fontWeight: 600,
    letterSpacing: "0.02em",
    border:
      state === "success"
        ? "1.5px solid rgba(34,197,94,0.6)"
        : "1px solid rgba(168,85,247,0.15)",
    color: state === "success" ? "hsl(142 60% 30%)" : "hsl(270 40% 30%)",
    background:
      state === "success"
        ? "linear-gradient(135deg, rgba(209, 250, 229, 0.7) 0%, rgba(167, 243, 208, 0.5) 55%, rgba(209, 250, 229, 0.4) 100%)"
        : state === "loading"
        ? "linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(216, 180, 254, 0.3) 55%, rgba(255, 255, 255, 0.25) 100%)"
        : "linear-gradient(135deg, rgba(255,255,255,0.7), rgba(216,180,254,0.45))",
    boxShadow:
      state === "success"
        ? "inset 0 2px 4px rgba(255, 255, 255, 0.9), inset 0 -2px 4px rgba(34, 197, 94, 0.3), 0 16px 48px rgba(34, 197, 94, 0.25), 0 8px 24px rgba(34, 197, 94, 0.2)"
        : "inset 0 2px 4px rgba(255, 255, 255, 0.8), inset 0 -2px 4px rgba(139, 92, 246, 0.3), 0 16px 48px rgba(139, 92, 246, 0.25), 0 8px 24px rgba(168, 85, 247, 0.2)",
    cursor: state === "loading" ? "not-allowed" : "pointer",
    transition: "transform 160ms ease, box-shadow 160ms ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  }),
  statusCard: (open) => ({
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
    border: "1px solid rgba(168, 85, 247, 0.15)",
    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(233, 213, 255, 0.2) 100%)",
    maxHeight: open ? 400 : 0,
    overflow: "hidden",
    opacity: open ? 1 : 0,
    transition: "all 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
  }),
  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 0",
    borderBottom: "1px solid rgba(168, 85, 247, 0.1)",
    fontSize: 13,
    color: "hsl(270 30% 35%)",
  },
  badge: (state) => ({
    width: 24,
    height: 24,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    background:
      state === "success"
        ? "rgba(34,197,94,0.15)"
        : state === "loading"
        ? "rgba(59,130,246,0.15)"
        : "rgba(168,85,247,0.15)",
    color:
      state === "success"
        ? "#16a34a"
        : state === "loading"
        ? "#2563eb"
        : "#7c3aed",
  }),
  iframeShell: {
    marginTop: 18,
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid rgba(226,232,240,0.8)",
    boxShadow: "0 12px 36px rgba(0,0,0,0.06)",
  },
  iframeLabel: {
    fontSize: 12,
    color: "hsl(270 20% 45%)",
    marginTop: 24,
    marginBottom: 10,
  },
  iframe: {
    width: "100%",
    height: 640,
    border: "none",
    background: "#fff",
  },
};

const steps = [
  { id: "status-1", label: "Initializing SDK" },
  { id: "status-2", label: "Authenticating device" },
  { id: "status-3", label: "Syncing data" },
  { id: "status-4", label: "Connection established" },
];

const LOCAL_STORAGE_KEYS = {
  externalUserId: "sumsub_external_user_id",
  applicantId: "sumsub_applicant_id",
  websdkUrl: "sumsub_websdk_url",
};

const buildEndpoint = (base, path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!base) return normalizedPath;
  const trimmedBase = base.replace(/\/+$/, "");
  if (trimmedBase.endsWith(normalizedPath)) return trimmedBase;
  if (trimmedBase.endsWith("/api")) return `${trimmedBase}${normalizedPath}`;
  return `${trimmedBase}${normalizedPath}`;
};

function getUUID() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return "xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function SumsubConnector({ apiBase = "", onStart, onVerified }) {
  const [state, setState] = useState("idle");
  const [statusMap, setStatusMap] = useState(() =>
    steps.reduce((acc, step) => ({ ...acc, [step.id]: "pending" }), {})
  );
  const [websdkUrl, setWebsdkUrl] = useState("");
  const [applicantId, setApplicantId] = useState("");
  const [externalUserId, setExternalUserId] = useState("");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("idle");
  const [verificationMessage, setVerificationMessage] = useState("");

  const buttonLabel = useMemo(() => {
    if (state === "loading") return "Processing...";
    if (state === "success") return "Session Ready";
    return "Initialize Sumsub SDK";
  }, [state]);

  const setStatus = useCallback((id, value) => {
    setStatusMap((prev) => ({ ...prev, [id]: value }));
  }, []);

  const resetStatuses = useCallback(() => {
    setStatusMap(steps.reduce((acc, step) => ({ ...acc, [step.id]: "pending" }), {}));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedExternalId = localStorage.getItem(LOCAL_STORAGE_KEYS.externalUserId) || "";
    const storedApplicantId = localStorage.getItem(LOCAL_STORAGE_KEYS.applicantId) || "";
    const storedWebsdkUrl = localStorage.getItem(LOCAL_STORAGE_KEYS.websdkUrl) || "";
    if (storedExternalId) setExternalUserId(storedExternalId);
    if (storedApplicantId) setApplicantId(storedApplicantId);
    if (storedWebsdkUrl) setWebsdkUrl(storedWebsdkUrl);
  }, []);

  const run = useCallback(async () => {
    if (state === "loading") return;
    if (onStart) onStart();
    setState("loading");
    setError("");
    setWebsdkUrl("");
    setApplicantId("");
    setVerificationStatus("idle");
    setVerificationMessage("");
    resetStatuses();
    setStatus("status-1", "loading");

    try {
      let externalUserId = localStorage.getItem(LOCAL_STORAGE_KEYS.externalUserId);
      let resolvedUserId = userId;

      if (supabase && !resolvedUserId) {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) {
          resolvedUserId = data.user.id;
          setUserId(data.user.id);
        }
      }

      if (!externalUserId && resolvedUserId) {
        externalUserId = resolvedUserId;
      }

      if (!externalUserId) {
        externalUserId = `mint-${getUUID()}`;
      }

      const initEndpoint = buildEndpoint(apiBase, "/api/samsub/init-websdk");
      const resp = await fetch(initEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalUserId, userId: resolvedUserId || undefined }),
      });

      const payload = await resp.json();
      if (!resp.ok || !payload?.success) {
        const message = payload?.error?.message || "Failed to initialize Sumsub";
        throw new Error(message);
      }

      localStorage.setItem(LOCAL_STORAGE_KEYS.externalUserId, externalUserId);
      setExternalUserId(externalUserId);

      setStatus("status-1", "success");
      setStatus("status-2", "loading");
      await new Promise((r) => setTimeout(r, 420));
      setStatus("status-2", "success");
      setStatus("status-3", "loading");
      await new Promise((r) => setTimeout(r, 420));
      setStatus("status-3", "success");
      setStatus("status-4", "success");

      const link = payload?.data?.websdkUrl;
      const applicant = payload?.data?.applicantId;
      if (!link) throw new Error("Missing WebSDK URL in response");
      if (applicant) {
        setApplicantId(applicant);
        localStorage.setItem(LOCAL_STORAGE_KEYS.applicantId, applicant);
      }
      setWebsdkUrl(link);
      localStorage.setItem(LOCAL_STORAGE_KEYS.websdkUrl, link);
      setState("success");
    } catch (err) {
      setError(err?.message || "Unable to start Sumsub");
      setState("idle");
      resetStatuses();
    }
  }, [apiBase, onStart, resetStatuses, setStatus, state]);

  const checkStatus = useCallback(async () => {
    if ((!applicantId && !externalUserId) || verificationStatus === "checking") return;
    setVerificationStatus("checking");
    setVerificationMessage("");

    try {
      const statusPath = applicantId
        ? `/api/samsub/status/${encodeURIComponent(applicantId)}`
        : `/api/samsub/status/external?externalUserId=${encodeURIComponent(externalUserId)}`;
      const statusEndpoint = buildEndpoint(apiBase, statusPath);
      const resp = await fetch(statusEndpoint);
      const payload = await resp.json();
      if (!resp.ok || !payload?.success) {
        const message = payload?.error?.message || "Unable to fetch status";
        throw new Error(message);
      }

      const outcome = payload?.data?.outcome || "pending";
      if (outcome === "completed") {
        setVerificationStatus("verified");
        setVerificationMessage("Verification complete.");

        if (supabase) {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user?.id) {
            await supabase
              .from("required_actions")
              .update({ kyc_verified: true })
              .eq("user_id", userData.user.id);
          }
        }

        if (onVerified) onVerified();
        return;
      }

      if (outcome === "failed") {
        setVerificationStatus("failed");
        setVerificationMessage("Verification failed. Please retry.");
        return;
      }

      setVerificationStatus("pending");
      setVerificationMessage("Verification is still pending.");
    } catch (err) {
      setVerificationStatus("failed");
      setVerificationMessage(err?.message || "Unable to fetch status");
    }
  }, [apiBase, applicantId, externalUserId, onVerified, verificationStatus]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={{ fontSize: 26, fontWeight: 300, marginBottom: 6, color: "hsl(270 30% 25%)" }}>
            Sumsub SDK
          </h2>
          <p style={styles.subtitle}>
            Connect your <span className="mint-brand">MINT</span> account with Sumsub services to grant access to bank information.
          </p>
        </div>

        <button
          type="button"
          style={styles.button(state)}
          onClick={run}
          disabled={state === "loading"}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {state === "loading" && (
              <span
                style={{
                  width: 20,
                  height: 20,
                  border: "3px solid rgba(255, 255, 255, 0.3)",
                  borderTopColor: "white",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.8s linear infinite",
                }}
              />
            )}
            {buttonLabel}
          </span>
        </button>

        <div style={styles.statusCard(state !== "idle")}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#4b3f63", marginBottom: 4 }}>
            Connection Status
          </div>
          {steps.map((step) => (
            <div key={step.id} style={styles.statusRow}>
              <div style={styles.badge(statusMap[step.id])}>
                {statusMap[step.id] === "success"
                  ? "✓"
                  : statusMap[step.id] === "loading"
                  ? "⟳"
                  : "⏱"}
              </div>
              <span>{step.label}</span>
            </div>
          ))}
        </div>

        {error && <div style={{ marginTop: 12, color: "#b91c1c", fontSize: 13 }}>{error}</div>}

        {websdkUrl && (
          <div>
            <div style={styles.iframeLabel}>Verification window</div>
            <div style={styles.iframeShell}>
              <iframe
                title="Sumsub WebSDK"
                src={websdkUrl}
                style={styles.iframe}
                allow="camera; microphone"
              />
            </div>
          </div>
        )}

        {(applicantId || externalUserId) && (
          <div style={{ marginTop: 18 }}>
            <button
              type="button"
              style={styles.button(verificationStatus === "verified" ? "success" : "idle")}
              onClick={checkStatus}
              disabled={verificationStatus === "checking"}
            >
              {verificationStatus === "checking" ? "Checking status..." : "Check verification status"}
            </button>
            {verificationMessage && (
              <div style={{ marginTop: 10, fontSize: 13, color: "#4b3f63" }}>
                {verificationMessage}
              </div>
            )}
          </div>
        )}

        <div style={styles.helper}>This will securely connect your account to MINT for verification.</div>
      </div>
    </div>
  );
}

const styleSheet = typeof document !== "undefined" ? document.styleSheets[0] : null;
if (styleSheet && styleSheet.insertRule) {
  try {
    styleSheet.insertRule("@keyframes spin { to { transform: rotate(360deg); } }", styleSheet.cssRules.length);
  } catch (err) {
    // ignore
  }
}

export default SumsubConnector;
