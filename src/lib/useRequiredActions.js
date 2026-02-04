import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { createKycNotification, createBankNotification } from "./NotificationsContext";

const defaultActions = {
  kycVerified: false,
  kycPending: false,
  kycNeedsResubmission: false,
  bankLinked: false,
  bankInReview: false,
  loading: true,
};

const globalState = {
  actions: { ...defaultActions },
  previousData: null,
  userId: null,
  subscription: null,
  subscriberCount: 0,
  listeners: new Set(),
  lastNotificationKey: null,
  lastNotificationTime: 0,
};

const DEBOUNCE_MS = 3000;

function notifyListeners() {
  globalState.listeners.forEach((listener) => listener());
}

function getSnapshot() {
  return globalState.actions;
}

function subscribe(listener) {
  globalState.listeners.add(listener);
  globalState.subscriberCount++;
  
  if (globalState.subscriberCount === 1 && !globalState.subscription) {
    initializeSubscription();
  }
  
  return () => {
    globalState.listeners.delete(listener);
    globalState.subscriberCount--;
  };
}

async function handleStatusChange(oldData, newData) {
  if (!globalState.userId) return;
  
  const userId = globalState.userId;
  const now = Date.now();

  const oldKyc = {
    verified: oldData?.kyc_verified || false,
    pending: oldData?.kyc_pending || false,
    needs_resubmission: oldData?.kyc_needs_resubmission || false,
  };
  
  const newKyc = {
    verified: newData.kyc_verified || false,
    pending: newData.kyc_pending || false,
    needs_resubmission: newData.kyc_needs_resubmission || false,
  };

  const oldBank = {
    linked: oldData?.bank_linked || false,
    in_review: oldData?.bank_in_review || false,
  };
  
  const newBank = {
    linked: newData.bank_linked || false,
    in_review: newData.bank_in_review || false,
  };

  let notificationType = null;
  let notificationStatus = null;

  if (!oldKyc.verified && newKyc.verified) {
    notificationType = 'kyc';
    notificationStatus = 'verified';
  } else if (!oldKyc.pending && newKyc.pending && !newKyc.verified) {
    notificationType = 'kyc';
    notificationStatus = 'pending';
  } else if (!oldKyc.needs_resubmission && newKyc.needs_resubmission) {
    notificationType = 'kyc';
    notificationStatus = 'needs_resubmission';
  } else if (!oldBank.linked && newBank.linked) {
    notificationType = 'bank';
    notificationStatus = 'linked';
  } else if (!oldBank.in_review && newBank.in_review && !newBank.linked) {
    notificationType = 'bank';
    notificationStatus = 'pending';
  }

  if (!notificationType) {
    console.log("No status change detected requiring notification");
    return;
  }

  const notificationKey = `${notificationType}_${notificationStatus}`;
  
  if (notificationKey === globalState.lastNotificationKey && 
      now - globalState.lastNotificationTime < DEBOUNCE_MS) {
    console.log(`Debouncing duplicate notification: ${notificationKey} (${now - globalState.lastNotificationTime}ms ago)`);
    return;
  }

  globalState.lastNotificationKey = notificationKey;
  globalState.lastNotificationTime = now;

  console.log(`Creating single notification: ${notificationKey}`);
  
  try {
    if (notificationType === 'kyc') {
      await createKycNotification(userId, notificationStatus);
    } else if (notificationType === 'bank') {
      await createBankNotification(userId, notificationStatus);
    }
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}

async function initializeSubscription() {
  if (!supabase) {
    globalState.actions = { ...defaultActions, loading: false };
    notifyListeners();
    return;
  }

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      globalState.actions = { ...defaultActions, loading: false };
      notifyListeners();
      return;
    }

    const userId = userData.user.id;
    globalState.userId = userId;

    let { data, error } = await supabase
      .from("required_actions")
      .select("kyc_verified, kyc_pending, kyc_needs_resubmission, bank_linked, bank_in_review")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      const { data: newData, error: insertError } = await supabase
        .from("required_actions")
        .insert({ user_id: userId })
        .select("kyc_verified, kyc_pending, kyc_needs_resubmission, bank_linked, bank_in_review")
        .single();

      if (!insertError && newData) {
        data = newData;
      }
    }

    globalState.previousData = data;
    globalState.actions = {
      kycVerified: data?.kyc_verified || false,
      kycPending: data?.kyc_pending || false,
      kycNeedsResubmission: data?.kyc_needs_resubmission || false,
      bankLinked: data?.bank_linked || false,
      bankInReview: data?.bank_in_review || false,
      loading: false,
    };
    notifyListeners();

    if (globalState.subscription) {
      console.log("Subscription already exists, skipping");
      return;
    }

    const channelId = `required-actions-singleton`;
    console.log("Setting up SINGLETON real-time subscription:", channelId);

    globalState.subscription = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "required_actions",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log("Singleton: Real-time UPDATE received:", payload);
          
          const newData = payload.new;

          await handleStatusChange(globalState.previousData, newData);

          globalState.previousData = newData;
          globalState.actions = {
            kycVerified: newData.kyc_verified || false,
            kycPending: newData.kyc_pending || false,
            kycNeedsResubmission: newData.kyc_needs_resubmission || false,
            bankLinked: newData.bank_linked || false,
            bankInReview: newData.bank_in_review || false,
            loading: false,
          };
          notifyListeners();

          window.dispatchEvent(new CustomEvent('kycStatusChanged', { 
            detail: { 
              kycVerified: newData.kyc_verified,
              kycPending: newData.kyc_pending,
              kycNeedsResubmission: newData.kyc_needs_resubmission,
            } 
          }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "required_actions",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Singleton: Real-time INSERT received:", payload);
          const newData = payload.new;

          globalState.previousData = newData;
          globalState.actions = {
            kycVerified: newData.kyc_verified || false,
            kycPending: newData.kyc_pending || false,
            kycNeedsResubmission: newData.kyc_needs_resubmission || false,
            bankLinked: newData.bank_linked || false,
            bankInReview: newData.bank_in_review || false,
            loading: false,
          };
          notifyListeners();
        }
      )
      .subscribe((status) => {
        console.log("Singleton subscription status:", status);
      });

  } catch (error) {
    console.error("Failed to initialize required actions:", error);
    globalState.actions = { ...defaultActions, loading: false };
    notifyListeners();
  }
}

function cleanupSubscription() {
  if (globalState.subscription && supabase) {
    console.log("Cleaning up SINGLETON subscription");
    supabase.removeChannel(globalState.subscription);
    globalState.subscription = null;
  }
  globalState.previousData = null;
  globalState.userId = null;
  globalState.lastNotificationKey = null;
  globalState.lastNotificationTime = 0;
}

export async function refetchRequiredActions() {
  if (!supabase || !globalState.userId) return;
  
  globalState.actions = { ...globalState.actions, loading: true };
  notifyListeners();
  
  try {
    const { data } = await supabase
      .from("required_actions")
      .select("kyc_verified, kyc_pending, kyc_needs_resubmission, bank_linked, bank_in_review")
      .eq("user_id", globalState.userId)
      .maybeSingle();

    if (data) {
      globalState.previousData = data;
      globalState.actions = {
        kycVerified: data.kyc_verified || false,
        kycPending: data.kyc_pending || false,
        kycNeedsResubmission: data.kyc_needs_resubmission || false,
        bankLinked: data.bank_linked || false,
        bankInReview: data.bank_in_review || false,
        loading: false,
      };
      notifyListeners();
    }
  } catch (error) {
    console.error("Failed to refetch required actions:", error);
    globalState.actions = { ...globalState.actions, loading: false };
    notifyListeners();
  }
}

export const useRequiredActions = () => {
  const actions = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  
  const refetch = useCallback(() => {
    refetchRequiredActions();
  }, []);

  return { ...actions, refetch };
};
