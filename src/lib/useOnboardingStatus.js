import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { parseOnboardingFlags } from "./checkOnboardingComplete";

export const useOnboardingStatus = () => {
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkStatus = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setOnboardingComplete(false);
        setLoading(false);
        return;
      }

      // Try API first
      try {
        const res = await fetch("/api/onboarding/status", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const json = await res.json();
          console.log("[useOnboardingStatus] API response:", json);
          setOnboardingComplete(json.is_fully_onboarded === true);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("[useOnboardingStatus] API fallback to DB:", e.message);
      }

      // Fallback to DB
      const { data, error: dbError } = await supabase
        .from("user_onboarding")
        .select("kyc_status, sumsub_raw")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (dbError) throw dbError;

      if (data && data.length > 0) {
        const { allComplete } = parseOnboardingFlags(data[0]);
        setOnboardingComplete(allComplete);
      } else {
        setOnboardingComplete(false);
      }
    } catch (err) {
      console.error("[useOnboardingStatus] Error:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();

    // Listen for changes
    if (!supabase) return;

    const channel = supabase
      .channel('onboarding_status_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_onboarding'
      }, () => checkStatus())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkStatus]);

  return { onboardingComplete, loading, error, refetch: checkStatus };
};
