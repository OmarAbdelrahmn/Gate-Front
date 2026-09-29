"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Archive,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth/AuthProvider";
import {
  queryNotifications,
  updateNotificationState,
} from "../../lib/notifications/api";
import type {
  NotificationFeed,
  NotificationItem,
  NotificationSeverity,
  NotificationStateAction,
} from "../../lib/notifications/types";
import {
  formatRelativeTime,
  resolveNotificationContent,
  SEVERITY_CONFIG,
} from "../../lib/notifications/utils";
import { toast } from "../ui/Toast";
import { NotificationDetailModal } from "./NotificationDetailModal";
import { useVehiclePlates } from "../../lib/fleet/vehicle-plate-cache";

export function NotificationBell() {
  const { can, locale } = useAuth();
  const isAr = locale === "ar";
  const router = useRouter();

  // Load and subscribe to vehicle plates cache
  useVehiclePlates();

  // Gate the entire center on 'notifications.read'
  const canReadNotifications = can("notifications.read");

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  // Selected notification for modal preview
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Hover timeout refs to prevent flicker when moving between bell and popover
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hasLoadedOnceRef = useRef(false);

  // Clear hover timeout
  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  // Hover Enter: Open popover
  const handleMouseEnter = () => {
    clearHoverTimeout();
    setIsOpen(true);
  };

  // Hover Leave: Close popover after 250ms grace period
  const handleMouseLeave = () => {
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 260);
  };

  // Click toggle
  const handleClickToggle = () => {
    clearHoverTimeout();
    setIsOpen((prev) => !prev);
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Load feed from /query
  const fetchFeed = useCallback(
    async (
      tab: "all" | "unread" = activeTab,
      isInitialOrReset = true,
      cursor: string | null = null
    ) => {
      if (!canReadNotifications) return;

      if (isInitialOrReset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const res: NotificationFeed = await queryNotifications(
          {
            permissions: null, // null fetches all authorized audiences + personal
            unreadOnly: tab === "unread",
            pageSize: 50,
            cursor: isInitialOrReset ? null : cursor,
          },
          { suppressErrorToast: true }
        );

        if (isInitialOrReset) {
          setItems(res.items || []);
        } else {
          setItems((prev) => {
            const existingIds = new Set(prev.map((i) => i.id));
            const newItems = (res.items || []).filter(
              (i) => !existingIds.has(i.id)
            );
            return [...prev, ...newItems];
          });
        }

        setNextCursor(res.nextCursor || null);
        setUnreadCount(res.unreadCount ?? 0);
        hasLoadedOnceRef.current = true;
      } catch (err) {
        console.error("Failed to load notifications feed:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeTab, canReadNotifications]
  );

  // Initial load
  useEffect(() => {
    if (canReadNotifications) {
      void fetchFeed(activeTab, true);
    }
  }, [canReadNotifications, activeTab, fetchFeed]);

  // Periodic polling (every 45s when document is visible)
  useEffect(() => {
    if (!canReadNotifications) return;

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void fetchFeed(activeTab, true);
      }
    }, 45000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchFeed(activeTab, true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [canReadNotifications, activeTab, fetchFeed]);

  // State Action Handler
  const handleStateAction = async (
    id: string,
    action: NotificationStateAction,
    rowVersion: string
  ) => {
    setActionLoadingId(id);
    try {
      const updated = await updateNotificationState(id, action, rowVersion, {
        suppressErrorToast: true,
      });

      if (action === "archive") {
        // Remove from list
        setItems((prev) => {
          const itemToArchive = prev.find((x) => x.id === id);
          if (itemToArchive && !itemToArchive.readAtUtc) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
          return prev.filter((x) => x.id !== id);
        });
      } else {
        // Replace updated item
        setItems((prev) =>
          prev.map((item) => (item.id === id ? updated : item))
        );

        // Adjust unreadCount
        if (action === "read" || action === "acknowledge") {
          setUnreadCount((c) => Math.max(0, c - 1));
        } else if (action === "unread") {
          setUnreadCount((c) => c + 1);
        }
      }

      // If the selected modal is currently showing this item, update it
      if (selectedNotification?.id === id) {
        if (action === "archive") {
          setSelectedNotification(null);
          setIsDetailModalOpen(false);
        } else {
          setSelectedNotification(updated);
        }
      }
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      // 409 concurrency conflict: reload feed
      if (e?.status === 409) {
        toast.error(
          isAr ? "تعارض في البيانات" : "Concurrency Conflict",
          isAr
            ? "تم تعديل حالة الإشعار من جلسة أخرى؛ جاري إعادة التحميل..."
            : "Notification was modified elsewhere; reloading feed..."
        );
        void fetchFeed(activeTab, true);
      } else {
        toast.error(
          isAr ? "خطأ" : "Error",
          e?.message || (isAr ? "فشل تحديث حالة الإشعار" : "Failed to update notification state")
        );
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Mark all unread notifications as read across the entire account
  const handleMarkAllAsRead = async () => {
    if (isMarkingAllRead) return;

    setIsMarkingAllRead(true);

    // Optimistically mark currently loaded items as read and clear unread count badge
    setItems((prev) =>
      prev.map((item) =>
        item.readAtUtc
          ? item
          : { ...item, readAtUtc: new Date().toISOString() }
      )
    );
    setUnreadCount(0);

    try {
      // 1. Gather all unread items from component state
      const unreadMap = new Map<string, NotificationItem>();
      for (const item of items) {
        if (!item.readAtUtc) {
          unreadMap.set(item.id, item);
        }
      }

      // 2. Fetch all unread notifications from backend via pagination to ensure 100% coverage
      let cursor: string | null = null;
      let hasMore = true;
      let iterations = 0;

      while (hasMore && iterations < 15) {
        iterations++;
        try {
          const res = await queryNotifications(
            {
              permissions: null,
              unreadOnly: true,
              pageSize: 100,
              cursor,
            },
            { suppressErrorToast: true }
          );

          const fetched = res.items || [];
          for (const it of fetched) {
            if (!it.readAtUtc) {
              // Always use the latest server item & rowVersion
              unreadMap.set(it.id, it);
            }
          }

          if (res.nextCursor && fetched.length > 0) {
            cursor = res.nextCursor;
          } else {
            hasMore = false;
          }
        } catch {
          hasMore = false;
        }
      }

      const allUnreadToUpdate = Array.from(unreadMap.values());

      if (allUnreadToUpdate.length > 0) {
        // 3. Process in controlled chunks (concurrency limit 6) to avoid database lock contention & 409s
        const BATCH_SIZE = 6;
        const failedItems: NotificationItem[] = [];

        for (let i = 0; i < allUnreadToUpdate.length; i += BATCH_SIZE) {
          const batch = allUnreadToUpdate.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map(async (item) => {
              try {
                await updateNotificationState(item.id, "read", item.rowVersion, {
                  suppressErrorToast: true,
                });
              } catch {
                failedItems.push(item);
              }
            })
          );
        }

        // 4. Retry any items that encountered concurrency conflicts
        if (failedItems.length > 0) {
          try {
            const refreshRes = await queryNotifications(
              {
                permissions: null,
                unreadOnly: true,
                pageSize: 100,
              },
              { suppressErrorToast: true }
            );
            const freshItems = refreshRes.items || [];
            for (const failed of failedItems) {
              const fresh = freshItems.find((x) => x.id === failed.id);
              if (fresh && !fresh.readAtUtc) {
                try {
                  await updateNotificationState(
                    fresh.id,
                    "read",
                    fresh.rowVersion,
                    { suppressErrorToast: true }
                  );
                } catch {
                  // Silently ignore if already marked as read
                }
              }
            }
          } catch {
            // Ignore retry fetch failure
          }
        }
      }

      toast.success(
        isAr ? "تم بنجاح" : "Success",
        isAr
          ? "تم تحديد كافة الإشعارات كمقروءة بنجاح"
          : "All notifications marked as read successfully"
      );

      // Re-fetch feed to sync completely with backend
      await fetchFeed(activeTab, true);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      await fetchFeed(activeTab, true);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  // Item click handler
  const handleItemClick = (item: NotificationItem, defaultRoute?: string | null) => {
    // If unread, mark read in background
    if (!item.readAtUtc) {
      void handleStateAction(item.id, "read", item.rowVersion);
    }

    const targetRoute = item.deepLink || defaultRoute;
    if (targetRoute) {
      setIsOpen(false);
      router.push(targetRoute);
    } else {
      setSelectedNotification(item);
      setIsDetailModalOpen(true);
    }
  };

  // If user does not have permission, gate and render nothing
  if (!canReadNotifications) {
    return null;
  }

  const severityIcon = (sev: NotificationSeverity) => {
    switch (sev) {
      case "Critical":
        return <Flame className="h-4 w-4 text-rose-600 animate-pulse" />;
      case "Error":
        return <AlertOctagon className="h-4 w-4 text-red-600" />;
      case "Warning":
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case "Success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case "Information":
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div
      className="relative"
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleClickToggle}
        aria-label={isAr ? "الإشعارات" : "Notifications"}
        aria-expanded={isOpen}
        className={`relative grid h-10 w-10 place-items-center rounded-xl transition-all duration-200 ${
          isOpen
            ? "bg-white/25 text-white shadow-inner"
            : "hover:bg-white/15 text-white"
        }`}
      >
        <Bell
          size={18}
          className={`transition-transform duration-300 ${
            unreadCount > 0 ? "rotate-[-10deg] scale-105" : ""
          }`}
        />

        {/* Unread Badge Indicator */}
        {unreadCount > 0 ? (
          <span
            className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f28b35] px-1 text-[11px] font-black leading-none text-white shadow-md ring-2 ring-[#1167c9] animate-in zoom-in-50 duration-200"
            title={`${unreadCount} ${isAr ? "إشعار غير مقروء" : "unread notifications"}`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : (
          <span className="hidden" />
        )}
      </button>

      {/* Flyout / Popover Notification Center */}
      {isOpen && (
        <div
          ref={popoverRef}
          onMouseEnter={clearHoverTimeout}
          onMouseLeave={handleMouseLeave}
          dir={isAr ? "rtl" : "ltr"}
          className={`absolute top-full mt-2.5 z-[60] before:absolute before:-top-3 before:left-0 before:right-0 before:h-3 before:content-[''] ${
            isAr ? "left-0 sm:-left-4" : "right-0 sm:-right-4"
          } w-[360px] sm:w-[420px] max-h-[580px] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#152238] text-[var(--foreground)] shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150 overflow-hidden`}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 bg-slate-50 dark:bg-[#1c2d4a]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1167c9] dark:text-blue-400">
                <Bell size={16} />
              </div>
              <div>
                <h4 className="font-black text-sm text-[var(--foreground)] flex items-center gap-1.5 leading-none">
                  {isAr ? "مركز الإشعارات" : "Notifications"}
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#f28b35] text-white">
                      {unreadCount} {isAr ? "جديد" : "new"}
                    </span>
                  )}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Refresh button */}
              <button
                type="button"
                onClick={() => void fetchFeed(activeTab, true)}
                title={isAr ? "تحديث" : "Refresh"}
                disabled={loading}
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={loading ? "animate-spin text-[#1167c9]" : ""}
                />
              </button>
            </div>
          </div>

          {/* Filter Tabs & Quick Action Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-2 bg-slate-50 dark:bg-[#1c2d4a] text-xs">
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeTab === "all"
                    ? "bg-white dark:bg-slate-700 text-[#1167c9] dark:text-blue-300 shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {isAr ? "الكل" : "All"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("unread")}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "unread"
                    ? "bg-white dark:bg-slate-700 text-[#1167c9] dark:text-blue-300 shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {isAr ? "غير المقروءة" : "Unread"}
                {unreadCount > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f28b35]" />
                )}
              </button>
            </div>

            {/* Mark all as read */}
            {(unreadCount > 0 || items.some((i) => !i.readAtUtc)) && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={loading || isMarkingAllRead}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1167c9] dark:text-blue-400 hover:underline disabled:opacity-50"
              >
                {isMarkingAllRead ? (
                  <Loader2 size={13} className="animate-spin text-[#1167c9]" />
                ) : (
                  <CheckCheck size={14} />
                )}
                {isMarkingAllRead
                  ? isAr
                    ? "جارٍ التحديد..."
                    : "Marking as read..."
                  : isAr
                  ? "تحديد الكل كمقروء"
                  : "Mark all as read"}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[420px] p-2.5 bg-slate-50/60 dark:bg-[#111c30]">
            {loading && items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-[var(--muted)]">
                <Loader2 className="h-6 w-6 animate-spin text-[#1167c9] mb-2" />
                <p>{isAr ? "جارٍ تحميل الإشعارات..." : "Loading notifications..."}</p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#1167c9] dark:text-blue-400 mb-3 shadow-inner">
                  <Sparkles size={22} />
                </div>
                <h5 className="font-bold text-sm text-[var(--foreground)] mb-1">
                  {activeTab === "unread"
                    ? isAr
                      ? "أنت على اطلاع بكل جديد!"
                      : "You're all caught up!"
                    : isAr
                    ? "لا توجد إشعارات حالياً"
                    : "No notifications yet"}
                </h5>
                <p className="text-xs text-[var(--muted)] max-w-xs">
                  {activeTab === "unread"
                    ? isAr
                      ? "لا توجد أي إشعارات غير مقروءة في صندوقك."
                      : "There are no unread notifications in your feed."
                    : isAr
                    ? "ستظهر هنا أي تنبيهات أو إشعارات نظام فور ورودها."
                    : "System alerts and notifications will appear here."}
                </p>
              </div>
            ) : (
              items.map((item) => {
                const isUnread = !item.readAtUtc;
                const isActing = actionLoadingId === item.id;
                const sev = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.Information;
                const content = resolveNotificationContent(item, locale);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item, content.deepLink)}
                    className={`group relative flex items-start gap-3 p-3.5 transition-all cursor-pointer rounded-xl border ${
                      isUnread
                        ? "bg-blue-50/80 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/60 hover:bg-blue-100/70 dark:hover:bg-blue-900/40 shadow-xs"
                        : "bg-white border-slate-200/80 dark:bg-slate-900/40 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-xs"
                    }`}
                  >
                    {/* Visual Accent for Unread: A sleek indicator strip */}
                    {isUnread && (
                      <span
                        className={`absolute ${
                          isAr ? "right-1" : "left-1"
                        } top-3 bottom-3 w-1 rounded-full bg-[#1167c9] dark:bg-blue-400`}
                      />
                    )}

                    {/* Severity / Status icon badge */}
                    <div
                      className={`mt-0.5 flex-shrink-0 p-2.5 rounded-xl border ${sev.badgeClass} shadow-xs`}
                    >
                      {severityIcon(item.severity)}
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0">
                      {/* Top meta row: Category pill + Time + Unread indicator */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {content.category}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--muted)]">
                            <Clock size={11} className="shrink-0" />
                            {formatRelativeTime(item.visibleAtUtc, locale)}
                          </span>
                        </div>

                        {isUnread && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#f28b35] text-white shrink-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                            {isAr ? "جديد" : "New"}
                          </span>
                        )}
                      </div>

                      {/* Main Title */}
                      <h5
                        className={`text-xs sm:text-[13px] leading-snug mb-1 ${
                          isUnread
                            ? "font-black text-slate-900 dark:text-white"
                            : "font-semibold text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {content.title}
                      </h5>

                      {/* Body snippet */}
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2 font-normal">
                        {content.body}
                      </p>

                      {/* Footer actions row without dividing line */}
                      <div className="flex items-center justify-between gap-1 pt-1 text-[10px]">
                        <div className="flex items-center gap-1.5 text-[var(--muted)]">
                          {item.acknowledgedAtUtc && (
                            <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                              <Check size={11} />
                              {isAr ? "مؤكد" : "Ack"}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {content.deepLink && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isUnread) {
                                  void handleStateAction(item.id, "read", item.rowVersion);
                                }
                                setIsOpen(false);
                                router.push(content.deepLink!);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-[#1167c9] dark:text-blue-400 hover:bg-blue-100/60 dark:hover:bg-blue-950/60 transition-colors"
                              title={isAr ? "فتح الصفحة المرتبطة" : "Open link"}
                            >
                              <ExternalLink size={11} />
                              <span>{isAr ? "فتح" : "Open"}</span>
                            </button>
                          )}

                          {/* Toggle read/unread */}
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() =>
                              void handleStateAction(
                                item.id,
                                isUnread ? "read" : "unread",
                                item.rowVersion
                              )
                            }
                            title={
                              isUnread
                                ? isAr
                                  ? "تحديد كمقروء"
                                  : "Mark as read"
                                : isAr
                                ? "تحديد كغير مقروء"
                                : "Mark as unread"
                            }
                            className="p-1 rounded-md text-[var(--muted)] hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                          >
                            {isActing ? (
                              <Loader2 size={12} className="animate-spin text-[#1167c9]" />
                            ) : isUnread ? (
                              <Eye size={12} className="text-[#1167c9]" />
                            ) : (
                              <EyeOff size={12} />
                            )}
                          </button>

                          {/* Acknowledge */}
                          {!item.acknowledgedAtUtc && (
                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() =>
                                void handleStateAction(
                                  item.id,
                                  "acknowledge",
                                  item.rowVersion
                                )
                              }
                              title={isAr ? "تأكيد واستلام" : "Acknowledge"}
                              className="p-1 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-950 text-emerald-600 dark:text-emerald-400 transition-colors disabled:opacity-50"
                            >
                              <Check size={12} />
                            </button>
                          )}

                          {/* Archive */}
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() =>
                              void handleStateAction(
                                item.id,
                                "archive",
                                item.rowVersion
                              )
                            }
                            title={isAr ? "أرشفة" : "Archive"}
                            className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-950 text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                          >
                            <Archive size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Popover Footer */}
          {nextCursor && (
            <div className="border-t border-slate-200 dark:border-slate-800 p-2 bg-slate-50 dark:bg-[#1c2d4a] text-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void fetchFeed(activeTab, false, nextCursor)}
                className="w-full py-1.5 px-3 rounded-xl text-xs font-bold text-[#1167c9] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors flex items-center justify-center gap-1.5"
              >
                {loadingMore ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : isAr ? (
                  <ChevronLeft size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
                {loadingMore
                  ? isAr
                    ? "جارٍ التحميل..."
                    : "Loading..."
                  : isAr
                  ? "تحميل المزيد من الإشعارات"
                  : "Load more notifications"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal for viewing full item metadata */}
      <NotificationDetailModal
        notification={selectedNotification}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedNotification(null);
        }}
        locale={locale}
        onAction={handleStateAction}
        isActionLoading={!!actionLoadingId}
      />
    </div>
  );
}
