import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import { createKycNotification } from "./NotificationsContext";

const CACHE_DURATION_MS = 30000;
const POLL_INTERVAL_MS = 30000; // Poll every 30 seconds for status changes (less frequent to avoid widget interference)
const LOCALSTORAGE_KEY = "lastSumsubKycStatus";
const NOTIFICATION_LOCK_KEY = "kycNotificationLock";
const NOTIFICATION_LOCK_DURATION_MS = 5000; // 5 second lock to prevent duplicates

let cachedStatus = null;
let cacheTimestamp = 0;

const getStatusString = (result) => {
  if (!result.success) return null;
  if (result.status === "verified") return "verified";
  if (result.status === "pending") return "pending";
  if (result.status === "needs_resubmission") return "needs_resubmission";
  return null;
};

const shouldNotifyStatusChange = (oldStatus, newStatus) => {
  if (!newStatus) return false;
  if (oldStatus === newStatus) return false;
  
  const validTransitions = [
    { from: null, to: "pending" },
    { from: undefined, to: "pending" },
    { from: "pending", to: "verified" },
    { from: "pending", to: "needs_resubmission" },
    { from: "needs_resubmission", to: "pending" },
    { from: "needs_resubmission", to: "verified" },
    // Also notify when status goes backwards (e.g., reset or new requirements added)
    { from: "verified", to: "needs_resubmission" },
    { from: "verified", to: "pending" },
  ];
  
  return validTransitions.some(
    (t) => t.from === oldStatus && t.to === newStatus
  );
};

// Global flag to pause polling when Sumsub widget is active
let pollingPaused = false;

export const pauseSumsubPolling = () => {
  pollingPaused = true;
  console.log("Sumsub polling paused");
};

export const resumeSumsubPolling = () => {
  pollingPaused = false;
  console.log("Sumsub polling resumed");
};

export const useSumsubStatus = () => {
  const [status, setStatus] = useState({
    loading: true,
    kycVerified: false,
    kycPending: false,
    kycNeedsResubmission: false,
    notVerified: true,
    reviewStatus: null,
    reviewAnswer: null,
    rejectLabels: [],
    applicantId: null,
  });

  const isMountedRef = useRef(true);
  const hasNotifiedRef = useRef(false);

  const fetchStatus = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    
    if (!forceRefresh && cachedStatus && (now - cacheTimestamp) < CACHE_DURATION_MS) {
      setStatus(cachedStatus);
      return;
    }

    setStatus(prev => ({ ...prev, loading: true }));
    
    try {
      if (!supabase) {
        const defaultStatus = {
          loading: false,
          kycVerified: false,
          kycPending: false,
          kycNeedsResubmission: false,
          notVerified: true,
          reviewStatus: null,
          reviewAnswer: null,
          rejectLabels: [],
          applicantId: null,
        };
        cachedStatus = defaultStatus;
        cacheTimestamp = now;
        if (isMountedRef.current) setStatus(defaultStatus);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        const defaultStatus = {
          loading: false,
          kycVerified: false,
          kycPending: false,
          kycNeedsResubmission: false,
          notVerified: true,
          reviewStatus: null,
          reviewAnswer: null,
          rejectLabels: [],
          applicantId: null,
        };
        cachedStatus = defaultStatus;
        cacheTimestamp = now;
        if (isMountedRef.current) setStatus(defaultStatus);
        return;
      }

      const userId = userData.user.id;
      const apiBase = import.meta.env.VITE_API_URL || window.location.origin;
      
      const response = await fetch(`${apiBase}/api/sumsub/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const kycVerified = result.status === "verified";
        const kycPending = result.status === "pending";
        const kycNeedsResubmission = result.status === "needs_resubmission";
        const notVerified = result.status === "not_verified";
        
        const newStatus = {
          loading: false,
          kycVerified,
          kycPending,
          kycNeedsResubmission,
          notVerified,
          reviewStatus: result.reviewStatus,
          reviewAnswer: result.reviewAnswer,
          rejectLabels: result.rejectLabels || [],
          applicantId: result.applicantId,
        };
        
        const currentStatusString = getStatusString(result);
        
        if (currentStatusString && !hasNotifiedRef.current) {
          try {
            const lastStatus = localStorage.getItem(LOCALSTORAGE_KEY);
            console.log(`KYC status check: stored="${lastStatus}" current="${currentStatusString}"`);
            
            if (shouldNotifyStatusChange(lastStatus, currentStatusString)) {
              // Check for notification lock to prevent duplicates across multiple hook instances
              const lockData = localStorage.getItem(NOTIFICATION_LOCK_KEY);
              const now = Date.now();
              
              if (lockData) {
                const { timestamp, status } = JSON.parse(lockData);
                if (status === currentStatusString && (now - timestamp) < NOTIFICATION_LOCK_DURATION_MS) {
                  // Another instance already sent this notification recently
                  console.log(`KYC notification skipped (locked): ${currentStatusString}`);
                  hasNotifiedRef.current = true;
                  localStorage.setItem(LOCALSTORAGE_KEY, currentStatusString);
                  return;
                }
              }
              
              // Set lock before sending notification
              localStorage.setItem(NOTIFICATION_LOCK_KEY, JSON.stringify({ timestamp: now, status: currentStatusString }));
              
              console.log(`KYC status changed: ${lastStatus || 'null'} → ${currentStatusString}`);
              
              await createKycNotification(userId, currentStatusString);
              
              localStorage.setItem(LOCALSTORAGE_KEY, currentStatusString);
              hasNotifiedRef.current = true;
            } else if (lastStatus !== currentStatusString) {
              localStorage.setItem(LOCALSTORAGE_KEY, currentStatusString);
            }
          } catch (storageError) {
            console.error("Error handling KYC notification:", storageError);
          }
        }
        
        cachedStatus = newStatus;
        cacheTimestamp = now;
        if (isMountedRef.current) setStatus(newStatus);
      } else {
        const errorStatus = {
          loading: false,
          kycVerified: false,
          kycPending: false,
          kycNeedsResubmission: false,
          notVerified: true,
          reviewStatus: null,
          reviewAnswer: null,
          rejectLabels: [],
          applicantId: null,
        };
        cachedStatus = errorStatus;
        cacheTimestamp = now;
        if (isMountedRef.current) setStatus(errorStatus);
      }
    } catch (error) {
      console.error("Failed to fetch Sumsub status:", error);
      const errorStatus = {
        loading: false,
        kycVerified: false,
        kycPending: false,
        kycNeedsResubmission: false,
        notVerified: true,
        reviewStatus: null,
        reviewAnswer: null,
        rejectLabels: [],
        applicantId: null,
      };
      cachedStatus = errorStatus;
      cacheTimestamp = Date.now();
      if (isMountedRef.current) setStatus(errorStatus);
    }
  }, []);

  const refetch = useCallback(() => {
    hasNotifiedRef.current = false;
    return fetchStatus(true);
  }, [fetchStatus]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchStatus();
    
    // Set up polling interval that respects the pause flag
    const pollInterval = setInterval(() => {
      if (!pollingPaused && isMountedRef.current) {
        console.log("Polling Sumsub status...");
        fetchStatus(true); // Force refresh to bypass cache
      } else if (pollingPaused) {
        console.log("Polling paused (widget active)");
      }
    }, POLL_INTERVAL_MS);
    
    return () => {
      isMountedRef.current = false;
      clearInterval(pollInterval);
    };
  }, [fetchStatus]);

  return { ...status, refetch };
};
