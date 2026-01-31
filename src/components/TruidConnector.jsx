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
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    padding: 28,
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
    borderRadius: 9999,
    padding: "16px 24px",
    fontWeight: 600,
    letterSpacing: "0.02em",
    border: "none",
    color: state === "success" ? "hsl(142 60% 30%)" : "#ffffff",
    background:
      state === "success"
        ? "linear-gradient(135deg, rgba(209, 250, 229, 0.7) 0%, rgba(167, 243, 208, 0.5) 55%, rgba(209, 250, 229, 0.4) 100%)"
        : "linear-gradient(90deg, #000000 0%, #5b21b6 100%)",
    boxShadow:
      state === "success"
        ? "inset 0 2px 4px rgba(255, 255, 255, 0.9), inset 0 -2px 4px rgba(34, 197, 94, 0.3), 0 16px 48px rgba(34, 197, 94, 0.25), 0 8px 24px rgba(34, 197, 94, 0.2)"
        : "0 4px 16px rgba(91, 33, 182, 0.25)",
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
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
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
    borderBottom: "1px solid #e5e7eb",
    fontSize: 13,
    color: "#374151",
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    fontSize: 15,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  },
};

const steps = [
  { id: "status-1", label: "Initializing connection" },
  { id: "status-2", label: "Creating verification session" },
  { id: "status-3", label: "Preparing verification portal" },
  { id: "status-4", label: "Ready for verification" },
];

const LOCAL_STORAGE_KEYS = {
  collectionId: "truid_collection_id",
  consumerUrl: "truid_consumer_url",
};

export function TruidConnector({ apiBase = "", onStart, onVerified, userProfile }) {
  const [state, setState] = useState("idle");
  const [statusMap, setStatusMap] = useState(() =>
    steps.reduce((acc, step) => ({ ...acc, [step.id]: "pending" }), {})
  );
  const [consumerUrl, setConsumerUrl] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [error, setError] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("idle");
  const [verificationMessage, setVerificationMessage] = useState("");

  const [fullName, setFullName] = useState(userProfile?.name || "");
  const [idNumber, setIdNumber] = useState(userProfile?.idNumber || "");

  const buttonLabel = useMemo(() => {
    if (state === "loading") return "Processing...";
    if (state === "success") return "Verification Ready";
    return "Start Identity Verification";
  }, [state]);

  const setStatus = useCallback((id, value) => {
    setStatusMap((prev) => ({ ...prev, [id]: value }));
  }, []);

  const resetStatuses = useCallback(() => {
    setStatusMap(steps.reduce((acc, step) => ({ ...acc, [step.id]: "pending" }), {}));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedCollectionId = localStorage.getItem(LOCAL_STORAGE_KEYS.collectionId) || "";
    const storedConsumerUrl = localStorage.getItem(LOCAL_STORAGE_KEYS.consumerUrl) || "";
    if (storedCollectionId) setCollectionId(storedCollectionId);
    if (storedConsumerUrl) setConsumerUrl(storedConsumerUrl);
  }, []);

  useEffect(() => {
    if (userProfile?.name) setFullName(userProfile.name);
    if (userProfile?.idNumber) setIdNumber(userProfile.idNumber);
  }, [userProfile]);

  const run = useCallback(async () => {
    if (state === "loading") return;
    
    if (!fullName.trim() || !idNumber.trim()) {
      setError("Please enter your full name and ID number");
      return;
    }

    if (onStart) onStart();
    setState("loading");
    setError("");
    setConsumerUrl("");
    setCollectionId("");
    setVerificationStatus("idle");
    setVerificationMessage("");
    resetStatuses();
    setStatus("status-1", "loading");

    try {
      let email = "";
      if (supabase) {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.email) {
          email = data.user.email;
        }
      }

      setStatus("status-1", "success");
      setStatus("status-2", "loading");

      const initEndpoint = `${apiBase}/api/truid/initiate`;
      const resp = await fetch(initEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName.trim(),
          idNumber: idNumber.trim(),
          email,
        }),
      });

      const payload = await resp.json();
      if (!resp.ok || !payload?.success) {
        const message = payload?.error?.message || "Failed to initialize verification";
        throw new Error(message);
      }

      setStatus("status-2", "success");
      setStatus("status-3", "loading");
      await new Promise((r) => setTimeout(r, 300));
      setStatus("status-3", "success");
      setStatus("status-4", "success");

      const url = payload?.consumerUrl;
      const collection = payload?.collectionId;
      
      if (!url) throw new Error("Missing verification URL in response");
      
      if (collection) {
        setCollectionId(collection);
        localStorage.setItem(LOCAL_STORAGE_KEYS.collectionId, collection);
      }
      
      setConsumerUrl(url);
      localStorage.setItem(LOCAL_STORAGE_KEYS.consumerUrl, url);
      setState("success");
    } catch (err) {
      setError(err?.message || "Unable to start verification");
      setState("idle");
      resetStatuses();
    }
  }, [apiBase, fullName, idNumber, onStart, resetStatuses, setStatus, state]);

  const checkStatus = useCallback(async () => {
    if (!collectionId || verificationStatus === "checking") return;
    setVerificationStatus("checking");
    setVerificationMessage("");

    try {
      const statusEndpoint = `${apiBase}/api/truid/status?collectionId=${encodeURIComponent(collectionId)}`;
      const resp = await fetch(statusEndpoint);
      const payload = await resp.json();
      
      if (!resp.ok || !payload?.success) {
        const message = payload?.error?.message || "Unable to fetch status";
        throw new Error(message);
      }

      const outcome = payload?.outcome || "pending";
      
      if (outcome === "completed") {
        setVerificationStatus("verified");
        setVerificationMessage("Identity verification complete!");

        if (supabase) {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user?.id) {
            await supabase
              .from("required_actions")
              .update({ kyc_verified: true })
              .eq("user_id", userData.user.id);
          }
        }

        localStorage.removeItem(LOCAL_STORAGE_KEYS.collectionId);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.consumerUrl);

        if (onVerified) onVerified();
        return;
      }

      if (outcome === "failed") {
        setVerificationStatus("failed");
        setVerificationMessage("Verification failed. Please try again.");
        return;
      }

      setVerificationStatus("pending");
      setVerificationMessage(`Status: ${payload?.currentStatus || 'Verification in progress'}. Please complete the verification in the window above.`);
    } catch (err) {
      setVerificationStatus("failed");
      setVerificationMessage(err?.message || "Unable to fetch status");
    }
  }, [apiBase, collectionId, onVerified, verificationStatus]);

  const openInNewWindow = useCallback(() => {
    if (consumerUrl) {
      window.open(consumerUrl, '_blank', 'noopener,noreferrer');
    }
  }, [consumerUrl]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={{ fontSize: 26, fontWeight: 300, marginBottom: 6, color: "hsl(270 30% 25%)" }}>
            Identity Verification
          </h2>
          <p style={styles.subtitle}>
            Verify your identity to complete your <span style={{ fontWeight: 600 }}>MINT</span> account setup.
          </p>
        </div>

        {state === "idle" && (
          <>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name (as on ID)</label>
              <input
                type="text"
                style={styles.input}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>ID Number</label>
              <input
                type="text"
                style={styles.input}
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="Enter your ID number"
              />
            </div>
          </>
        )}

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

        {consumerUrl && (
          <div>
            <div style={styles.iframeLabel}>
              Complete verification below or{" "}
              <button
                type="button"
                onClick={openInNewWindow}
                style={{
                  background: "none",
                  border: "none",
                  color: "#7c3aed",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontSize: 12,
                  padding: 0,
                }}
              >
                open in new window
              </button>
            </div>
            <div style={styles.iframeShell}>
              <iframe
                title="TruID Verification"
                src={consumerUrl}
                style={styles.iframe}
                allow="camera; microphone"
              />
            </div>
          </div>
        )}

        {collectionId && (
          <div style={{ marginTop: 18 }}>
            <button
              type="button"
              style={styles.button(verificationStatus === "verified" ? "success" : "idle")}
              onClick={checkStatus}
              disabled={verificationStatus === "checking"}
            >
              {verificationStatus === "checking" ? "Checking status..." : "Check Verification Status"}
            </button>
            {verificationMessage && (
              <div style={{ marginTop: 10, fontSize: 13, color: verificationStatus === "verified" ? "#16a34a" : "#4b3f63" }}>
                {verificationMessage}
              </div>
            )}
          </div>
        )}

        <div style={styles.helper}>Your information is securely processed through TruID Connect.</div>
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

export default TruidConnector;
