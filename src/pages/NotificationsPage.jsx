import React, { useState, useRef } from "react";
import {
  ArrowLeft,
  Settings,
  Mailbox,
  CheckCheck,
  Trash2,
  Receipt,
  Shield,
  Info,
  Gift,
  UserCheck,
  CreditCard,
  TrendingUp,
  Landmark,
  X,
} from "lucide-react";
import { useNotificationsContext, groupNotificationsByDate, getNotificationIcon } from "../lib/NotificationsContext";
import NotificationsSkeleton from "../components/NotificationsSkeleton";

const NotificationDetailModal = ({ notification, onClose, onDelete }) => {
  if (!notification) return null;

  const { icon, color } = getNotificationIcon(notification.type);
  const iconComponents = {
    receipt: Receipt,
    shield: Shield,
    info: Info,
    gift: Gift,
    "user-check": UserCheck,
    "credit-card": CreditCard,
    "trending-up": TrendingUp,
    landmark: Landmark,
  };
  const IconComponent = iconComponents[icon] || Info;

  const formatFullDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-ZA", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div className={`flex h-14 w-14 items-center justify-center rounded-full ${color}`}>
            <IconComponent className="h-6 w-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2 className="mt-4 text-lg font-semibold text-slate-800">
          {notification.title}
        </h2>

        <p className="mt-1 text-xs text-slate-400">
          {formatFullDate(notification.created_at)}
        </p>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          {notification.body}
        </p>

        {notification.payload && Object.keys(notification.payload).length > 0 && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Additional Info</p>
            <p className="mt-1 text-xs text-slate-600">
              {notification.payload.action === "complete_profile" && "Complete your profile to get started."}
              {notification.payload.amount && `Amount: ${notification.payload.amount}`}
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => {
              onDelete(notification.id);
              onClose();
            }}
            className="flex-1 rounded-full border border-red-200 bg-red-50 py-3 text-sm font-medium text-red-600"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-slate-900 py-3 text-sm font-medium text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const iconComponents = {
  receipt: Receipt,
  shield: Shield,
  info: Info,
  gift: Gift,
  "user-check": UserCheck,
  "credit-card": CreditCard,
  "trending-up": TrendingUp,
  landmark: Landmark,
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-ZA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const NotificationItem = ({ notification, onMarkRead, onDelete, onOpenDetail }) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [swiped, setSwiped] = useState(false);
  const itemRef = useRef(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    if (isLeftSwipe) {
      setSwiped(true);
    } else if (distance < -minSwipeDistance) {
      setSwiped(false);
    }
  };

  const handleClick = () => {
    if (swiped) return;
    if (!notification.read_at) {
      onMarkRead(notification.id);
    }
    onOpenDetail(notification);
  };

  const { icon, color } = getNotificationIcon(notification.type);
  const IconComponent = iconComponents[icon] || Info;

  return (
    <div className="relative overflow-hidden rounded-3xl">
      <div
        className={`absolute inset-y-0 right-0 flex items-center justify-end bg-red-500 px-4 transition-all ${
          swiped ? "w-20" : "w-0"
        }`}
      >
        <button
          type="button"
          onClick={() => onDelete(notification.id)}
          className="text-white"
          aria-label="Delete notification"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      <div
        ref={itemRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleClick}
        className={`relative flex gap-3 bg-white p-4 shadow-sm transition-transform ${
          swiped ? "-translate-x-20" : "translate-x-0"
        } ${!notification.read_at ? "cursor-pointer" : ""}`}
      >
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${color}`}>
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <p className={`text-sm ${!notification.read_at ? "font-semibold" : "font-medium"} text-slate-800`}>
              {notification.title}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{formatDate(notification.created_at)}</span>
              {!notification.read_at && (
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500">{notification.body}</p>
        </div>
      </div>
    </div>
  );
};

const NotificationGroup = ({ title, notifications, onMarkRead, onDelete, onOpenDetail }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkRead={onMarkRead}
          onDelete={onDelete}
          onOpenDetail={onOpenDetail}
        />
      ))}
    </div>
  );
};

const NotificationsPage = ({ onBack, onOpenSettings }) => {
  const [selectedNotification, setSelectedNotification] = useState(null);
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationsContext();

  if (loading) {
    return <NotificationsSkeleton />;
  }

  const hasNotifications = notifications.length > 0;
  const groupedNotifications = groupNotificationsByDate(notifications);

  const handleOpenDetail = (notification) => {
    setSelectedNotification(notification);
  };

  const handleCloseDetail = () => {
    setSelectedNotification(null);
  };

  return (
    <>
      <NotificationDetailModal
        notification={selectedNotification}
        onClose={handleCloseDetail}
        onDelete={deleteNotification}
      />
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="mx-auto flex w-full max-w-sm flex-col px-4 pb-10 pt-12 md:max-w-md md:px-8">
        <header className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Back"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Notifications</h1>
          <button
            type="button"
            aria-label="Settings"
            onClick={onOpenSettings}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
          >
            <Settings className="h-5 w-5" />
          </button>
        </header>

        {hasNotifications && unreadCount > 0 && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={markAllAsRead}
              className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </button>
          </div>
        )}

        {hasNotifications ? (
          <div className="mt-6 space-y-6">
            <NotificationGroup
              title="Today"
              notifications={groupedNotifications.today}
              onMarkRead={markAsRead}
              onDelete={deleteNotification}
              onOpenDetail={handleOpenDetail}
            />
            <NotificationGroup
              title="Yesterday"
              notifications={groupedNotifications.yesterday}
              onMarkRead={markAsRead}
              onDelete={deleteNotification}
              onOpenDetail={handleOpenDetail}
            />
            <NotificationGroup
              title="This Week"
              notifications={groupedNotifications.thisWeek}
              onMarkRead={markAsRead}
              onDelete={deleteNotification}
              onOpenDetail={handleOpenDetail}
            />
            <NotificationGroup
              title="Older"
              notifications={groupedNotifications.older}
              onMarkRead={markAsRead}
              onDelete={deleteNotification}
              onOpenDetail={handleOpenDetail}
            />
          </div>
        ) : (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-100 text-indigo-500">
              <Mailbox className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-lg font-semibold">No notifications yet</h2>
            <p className="mt-2 text-sm text-slate-500">
              Your notifications will appear here once you&apos;ve received them.
            </p>
          </div>
        )}

        <div className="mt-10 text-center text-xs text-slate-400">
          Swipe left on a notification to delete it
        </div>
      </div>
    </div>
    </>
  );
};

export default NotificationsPage;
