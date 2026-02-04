import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import { createKycNotification } from "./NotificationsContext";

const CACHE_DURATION_MS = 30000;
const LOCALSTORAGE_KEY = "lastSumsubKycStatus";

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
  ];
  
  return validTransitions.some(
    (t) => t.from === oldStatus && t.to === newStatus
  );
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
            
            if (shouldNotifyStatusChange(lastStatus, currentStatusString)) {
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
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchStatus]);

  return { ...status, refetch };
};
