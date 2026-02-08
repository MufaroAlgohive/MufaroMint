import { useCallback, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { createBankNotification } from "./NotificationsContext";

const defaultActions = {
  bankLinked: false,
  bankInReview: false,
  bankSnapshotExists: false,
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

  const oldBank = {
    linked: oldData?.bank_linked || false,
    in_review: oldData?.bank_in_review || false,
  };

  const newBank = {
    linked: newData.bank_linked || false,
    in_review: newData.bank_in_review || false,
  };

  let notificationStatus = null;

  if (!oldBank.linked && newBank.linked) {
    notificationStatus = "linked";
  } else if (!oldBank.in_review && newBank.in_review && !newBank.linked) {
    notificationStatus = "pending";
  }

  if (!notificationStatus) {
    console.log("No bank status change detected requiring notification");
    return;
  }

  const notificationKey = `bank_${notificationStatus}`;

  if (
    notificationKey === globalState.lastNotificationKey &&
    now - globalState.lastNotificationTime < DEBOUNCE_MS
  ) {
    console.log(
      `Debouncing duplicate notification: ${notificationKey} (${now - globalState.lastNotificationTime}ms ago)`
    );
    return;
  }

  globalState.lastNotificationKey = notificationKey;
  globalState.lastNotificationTime = now;

  console.log(`Creating bank notification: ${notificationKey}`);

  try {
    await createBankNotification(userId, notificationStatus);
  } catch (err) {
    console.error("Failed to create bank notification:", err);
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

    const { data: snapshotData, error: snapshotError } = await supabase
      .from("truid_bank_snapshots")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    const bankSnapshotExists = !snapshotError && (snapshotData?.length ?? 0) > 0;

    let { data, error } = await supabase
      .from("required_actions")
      .select("bank_linked, bank_in_review")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      const { data: newData, error: insertError } = await supabase
        .from("required_actions")
        .insert({ user_id: userId })
        .select("bank_linked, bank_in_review")
        .single();

      if (!insertError && newData) {
        data = newData;
      }
    }

    globalState.previousData = data;
    globalState.actions = {
      bankLinked: data?.bank_linked || false,
      bankInReview: data?.bank_in_review || false,
      bankSnapshotExists,
      loading: false,
    };
    notifyListeners();

    if (globalState.subscription) {
      console.log("Subscription already exists, skipping");
      return;
    }

    const channelId = "required-actions-singleton";
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
            bankLinked: newData.bank_linked || false,
            bankInReview: newData.bank_in_review || false,
            bankSnapshotExists: globalState.actions.bankSnapshotExists,
            loading: false,
          };
          notifyListeners();
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
            bankLinked: newData.bank_linked || false,
            bankInReview: newData.bank_in_review || false,
            bankSnapshotExists: globalState.actions.bankSnapshotExists,
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

export async function refetchRequiredActions() {
  if (!supabase || !globalState.userId) return;

  globalState.actions = { ...globalState.actions, loading: true };
  notifyListeners();

  try {
    const [requiredResult, snapshotResult] = await Promise.all([
      supabase
        .from("required_actions")
        .select("bank_linked, bank_in_review")
        .eq("user_id", globalState.userId)
        .maybeSingle(),
      supabase
        .from("truid_bank_snapshots")
        .select("id")
        .eq("user_id", globalState.userId)
        .limit(1),
    ]);

    const data = requiredResult?.data;
    const bankSnapshotExists =
      !snapshotResult?.error && (snapshotResult?.data?.length ?? 0) > 0;

    if (data) {
      globalState.previousData = data;
      globalState.actions = {
        bankLinked: data.bank_linked || false,
        bankInReview: data.bank_in_review || false,
        bankSnapshotExists,
        loading: false,
      };
    } else {
      globalState.actions = {
        ...globalState.actions,
        bankSnapshotExists,
        loading: false,
      };
    }

    notifyListeners();
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
