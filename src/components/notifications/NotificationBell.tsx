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
  SEVERITY_CONFIG,
} from "../../lib/notifications/utils";
import { toast } from "../ui/Toast";
import { NotificationDetailModal } from "./NotificationDetailModal";

export function NotificationBell() {
  const { can, locale } = useAuth();
  const isAr = locale === "ar";
  const router = useRouter();

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
            pageSize: 20,
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

  // Mark all visible as read
  const handleMarkAllVisibleAsRead = async () => {
    const unreadItems = items.filter((x) => !x.readAtUtc);
    if (unreadItems.length === 0) return;

    setLoading(true);
    try {
      await Promise.all(
        unreadItems.map((item) =>
          updateNotificationState(item.id, "read", item.rowVersion, {
            suppressErrorToast: true,
          }).catch(() => null)
        )
      );
      toast.success(
        isAr ? "تم بنجاح" : "Success",
        isAr ? "تم تحديد كافة الإشعارات المعروضة كمقروءة" : "Marked visible notifications as read"
      );
      void fetchFeed(activeTab, true);
    } catch {
      void fetchFeed(activeTab, true);
    } finally {
      setLoading(false);
    }
  };

  // Item click handler
  const handleItemClick = (item: NotificationItem) => {
    // If unread, mark read in background
    if (!item.readAtUtc) {
      void handleStateAction(item.id, "read", item.rowVersion);
    }

    if (item.deepLink) {
      setIsOpen(false);
      router.push(item.deepLink);
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
            {items.some((i) => !i.readAtUtc) && (
              <button
                type="button"
                onClick={handleMarkAllVisibleAsRead}
                disabled={loading}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1167c9] dark:text-blue-400 hover:underline disabled:opacity-50"
              >
                <CheckCheck size={14} />
                {isAr ? "تحديد الكل كمقروء" : "Mark all as read"}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[380px] p-1 bg-white dark:bg-[#152238]">
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
                const title = isAr
                  ? item.titleAr || item.titleEn
                  : item.titleEn || item.titleAr;
                const body = isAr
                  ? item.bodyAr || item.bodyEn
                  : item.bodyEn || item.bodyAr;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer rounded-xl ${
                      isUnread
                        ? "bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/30"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    {/* Severity / Status icon badge */}
                    <div
                      className={`mt-0.5 flex-shrink-0 p-2 rounded-xl border ${sev.badgeClass} shadow-xs`}
                    >
                      {severityIcon(item.severity)}
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h5
                          className={`text-xs truncate ${
                            isUnread
                              ? "font-black text-[var(--foreground)]"
                              : "font-semibold text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {title}
                        </h5>

                        {/* Unread glowing indicator */}
                        {isUnread && (
                          <span
                            className="h-2 w-2 flex-shrink-0 rounded-full bg-[#f28b35] ring-2 ring-orange-200 dark:ring-orange-950"
                            title={isAr ? "غير مقروء" : "Unread"}
                          />
                        )}
                      </div>

                      {/* Body snippet */}
                      <p className="text-[11px] text-[var(--muted)] line-clamp-2 leading-relaxed mb-2 font-normal">
                        {body}
                      </p>

                      {/* Footer tags & action row */}
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <div className="flex items-center gap-1.5 text-[var(--muted)]">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock size={11} />
                            {formatRelativeTime(item.visibleAtUtc, locale)}
                          </span>

                          {item.eventType && (
                            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400">
                              {item.eventType}
                            </span>
                          )}

                          {item.acknowledgedAtUtc && (
                            <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                              <Check size={11} />
                              {isAr ? "مؤكد" : "Ack"}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons (visible or on hover) */}
                        <div
                          className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
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
                            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                          >
                            {isUnread ? <Eye size={13} /> : <EyeOff size={13} />}
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
                              className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950 text-emerald-600 dark:text-emerald-400 transition-colors"
                            >
                              <Check size={13} />
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
                            className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-950 text-red-500 hover:text-red-700 transition-colors"
                          >
                            <Archive size={13} />
                          </button>

                          {/* Deep Link icon hint */}
                          {item.deepLink && (
                            <span
                              title={isAr ? "يحتوي على رابط انتقال" : "Has destination link"}
                              className="p-1 text-[#1167c9] dark:text-blue-400"
                            >
                              <ExternalLink size={13} />
                            </span>
                          )}
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
