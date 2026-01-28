import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

const NotificationsContext = createContext(null);

const defaultState = {
  notifications: [],
  unreadCount: 0,
  loading: true,
  error: null,
  preferences: {},
};

export const NotificationsProvider = ({ children }) => {
  const [state, setState] = useState(defaultState);

  const loadPreferences = useCallback(async (userId) => {
    if (!supabase || !userId) return {};
    
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", userId)
        .single();
      
      return profile?.notification_preferences || {};
    } catch (err) {
      console.error("Error loading notification preferences:", err);
      return {};
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!supabase) {
      setState({ ...defaultState, loading: false, error: "Supabase not configured" });
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        setState({ ...defaultState, loading: false });
        return;
      }

      const userId = userData.user.id;
      
      const [notificationsResult, preferences] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        loadPreferences(userId)
      ]);

      if (notificationsResult.error) {
        setState({ ...defaultState, loading: false, error: notificationsResult.error.message });
        return;
      }

      const allNotifications = notificationsResult.data || [];
      
      const filteredNotifications = allNotifications.filter((n) => {
        if (Object.keys(preferences).length === 0) return true;
        return preferences[n.type] !== false;
      });

      const unreadCount = filteredNotifications.filter((n) => !n.read_at).length;

      setState({
        notifications: filteredNotifications,
        unreadCount,
        loading: false,
        error: null,
        preferences,
      });
    } catch (err) {
      setState({ ...defaultState, loading: false, error: err.message });
    }
  }, [loadPreferences]);

  const markAsRead = useCallback(async (notificationId) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (!error) {
        setState((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) =>
            n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1),
        }));
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userData.user.id)
        .is("read_at", null);

      if (!error) {
        setState((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) => ({
            ...n,
            read_at: n.read_at || new Date().toISOString(),
          })),
          unreadCount: 0,
        }));
      }
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId) => {
    if (!supabase) return;

    try {
      const notification = state.notifications.find((n) => n.id === notificationId);
      const wasUnread = notification && !notification.read_at;

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (!error) {
        setState((prev) => ({
          ...prev,
          notifications: prev.notifications.filter((n) => n.id !== notificationId),
          unreadCount: wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
        }));
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  }, [state.notifications]);

  const updatePreferences = useCallback((newPreferences) => {
    setState((prev) => {
      const filteredNotifications = prev.notifications.filter((n) => {
        if (Object.keys(newPreferences).length === 0) return true;
        return newPreferences[n.type] !== false;
      });
      const unreadCount = filteredNotifications.filter((n) => !n.read_at).length;
      
      return {
        ...prev,
        preferences: newPreferences,
        notifications: filteredNotifications,
        unreadCount,
      };
    });
  }, []);

  useEffect(() => {
    fetchNotifications();

    if (!supabase) return;

    const setupRealtime = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return null;

      const channel = supabase
        .channel("notifications-changes-global")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userData.user.id}`,
          },
          (payload) => {
            const newNotification = payload.new;
            setState((prev) => {
              if (prev.preferences[newNotification.type] === false) {
                return prev;
              }
              return {
                ...prev,
                notifications: [newNotification, ...prev.notifications],
                unreadCount: prev.unreadCount + 1,
              };
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userData.user.id}`,
          },
          (payload) => {
            setState((prev) => {
              const deleted = prev.notifications.find((n) => n.id === payload.old.id);
              if (!deleted) return prev;
              const wasUnread = !deleted.read_at;
              return {
                ...prev,
                notifications: prev.notifications.filter((n) => n.id !== payload.old.id),
                unreadCount: wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
              };
            });
          }
        )
        .subscribe();

      return channel;
    };

    let channel = null;
    setupRealtime().then((ch) => {
      channel = ch;
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchNotifications]);

  const value = {
    ...state,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    refetch: fetchNotifications,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotificationsContext = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    return {
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      preferences: {},
      markAsRead: () => {},
      markAllAsRead: () => {},
      deleteNotification: () => {},
      updatePreferences: () => {},
      refetch: () => {},
    };
  }
  return context;
};

export const createWelcomeNotification = async (userId) => {
  if (!supabase || !userId) return;

  try {
    const { data: existing, error: existingError } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "system")
      .ilike("title", "%Welcome%")
      .limit(1);

    if (existingError || (existing && existing.length > 0)) {
      return;
    }

    await supabase.from("notifications").insert({
      user_id: userId,
      title: "Welcome to Mint!",
      body: "We're excited to have you on board. Start by completing your profile and exploring your investment options.",
      type: "system",
      payload: { action: "complete_profile" },
    });
  } catch (err) {
    console.error("Error creating welcome notification:", err);
  }
};

export const getNotificationIcon = (type) => {
  const icons = {
    transaction: { icon: "receipt", color: "bg-emerald-100 text-emerald-600" },
    security: { icon: "shield", color: "bg-red-100 text-red-600" },
    system: { icon: "info", color: "bg-blue-100 text-blue-600" },
    promotion: { icon: "gift", color: "bg-amber-100 text-amber-600" },
    kyc: { icon: "user-check", color: "bg-purple-100 text-purple-600" },
    credit: { icon: "credit-card", color: "bg-indigo-100 text-indigo-600" },
    investment: { icon: "trending-up", color: "bg-teal-100 text-teal-600" },
    bank: { icon: "landmark", color: "bg-slate-100 text-slate-600" },
  };
  return icons[type] || icons.system;
};

export const groupNotificationsByDate = (notifications) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };

  notifications.forEach((notification) => {
    const date = new Date(notification.created_at);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      groups.today.push(notification);
    } else if (date.getTime() === yesterday.getTime()) {
      groups.yesterday.push(notification);
    } else if (date >= weekAgo) {
      groups.thisWeek.push(notification);
    } else {
      groups.older.push(notification);
    }
  });

  return groups;
};
