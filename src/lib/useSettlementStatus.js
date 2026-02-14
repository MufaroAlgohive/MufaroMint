import { useState, useEffect } from "react";

let cachedConfig = null;
let fetchPromise = null;

async function fetchSettlementConfig() {
  if (cachedConfig) return cachedConfig;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/settlement/config")
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data?.success) {
        cachedConfig = {
          csdpEnabled: data.csdpEnabled,
          brokerEnabled: data.brokerEnabled,
          fullyIntegrated: data.fullyIntegrated,
        };
      } else {
        cachedConfig = { csdpEnabled: false, brokerEnabled: false, fullyIntegrated: false };
      }
      fetchPromise = null;
      return cachedConfig;
    })
    .catch(() => {
      cachedConfig = { csdpEnabled: false, brokerEnabled: false, fullyIntegrated: false };
      fetchPromise = null;
      return cachedConfig;
    });

  return fetchPromise;
}

export function useSettlementConfig() {
  const [config, setConfig] = useState(cachedConfig || {
    csdpEnabled: false,
    brokerEnabled: false,
    fullyIntegrated: false,
    loading: true,
  });

  useEffect(() => {
    fetchSettlementConfig().then(c => {
      setConfig({ ...c, loading: false });
    });
  }, []);

  return config;
}

export function getSettlementStatusForHolding(config) {
  if (!config || config.loading) return null;
  if (config.fullyIntegrated) return "confirmed";
  if (!config.csdpEnabled) return "pending_csdp";
  if (!config.brokerEnabled) return "pending_broker";
  return "confirmed";
}
