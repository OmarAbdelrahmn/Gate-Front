"use client";

import React from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Archive,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  Info,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Tag,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { NotificationItem, NotificationSeverity } from "../../lib/notifications/types";
import {
  formatFullDateTime,
  formatRelativeTime,
  resolveNotificationContent,
  SEVERITY_CONFIG,
} from "../../lib/notifications/utils";

interface NotificationDetailModalProps {
  notification: NotificationItem | null;
  isOpen: boolean;
  onClose: () => void;
  locale: "ar" | "en";
  onAction: (
    id: string,
    action: "read" | "unread" | "acknowledge" | "archive",
    rowVersion: string
  ) => Promise<void>;
  isActionLoading?: boolean;
}

export function NotificationDetailModal({
  notification,
  isOpen,
  onClose,
  locale,
  onAction,
  isActionLoading,
}: NotificationDetailModalProps) {
  const router = useRouter();

  if (!isOpen || !notification) return null;

  const isAr = locale === "ar";
  const sevConfig = SEVERITY_CONFIG[notification.severity] || SEVERITY_CONFIG.Information;
  const content = resolveNotificationContent(notification, locale);

  const severityIcon = (sev: NotificationSeverity) => {
    switch (sev) {
      case "Critical":
        return <Flame className="h-5 w-5 text-rose-600 animate-pulse" />;
      case "Error":
        return <AlertOctagon className="h-5 w-5 text-red-600" />;
      case "Warning":
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case "Success":
        return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
      case "Information":
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const handleDeepLink = () => {
    const targetLink = notification.deepLink || content.deepLink;
    if (targetLink) {
      if (!notification.readAtUtc) {
        void onAction(notification.id, "read", notification.rowVersion);
      }
      onClose();
      router.push(targetLink);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#152238] text-[var(--foreground)] shadow-2xl overflow-hidden transition-all"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] p-5 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${sevConfig.badgeClass}`}>
              {severityIcon(notification.severity)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${sevConfig.badgeClass}`}
                >
                  {isAr ? sevConfig.labelAr : sevConfig.labelEn}
                </span>
                {!notification.readAtUtc && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    {isAr ? "غير مقروء" : "Unread"}
                  </span>
                )}
                {notification.acknowledgedAtUtc && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                    <Check className="h-3 w-3" />
                    {isAr ? "تم التأكيد" : "Acknowledged"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-[var(--muted)] flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatRelativeTime(notification.visibleAtUtc, locale)} •{" "}
                {formatFullDateTime(notification.visibleAtUtc, locale)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)] hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            aria-label={isAr ? "إغلاق" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Main Title & Category */}
          <div>
            <div className="mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {content.category}
              </span>
            </div>
            <h3 className="text-lg font-black text-[var(--foreground)] leading-snug">
              {content.title}
            </h3>
            {content.secondaryTitle && content.secondaryTitle !== content.title && (
              <p className="text-xs text-[var(--muted)] mt-1 font-medium">
                {content.secondaryTitle}
              </p>
            )}
          </div>

          {/* Body Content */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[var(--border)] leading-relaxed text-sm whitespace-pre-wrap">
            {content.body}
          </div>

          {/* Secondary translation if available */}
          {content.secondaryBody && content.secondaryBody !== content.body && (
            <div className="p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/40 border border-dashed border-[var(--border)] text-xs text-[var(--muted)] leading-relaxed">
              <span className="font-bold block mb-1">
                {isAr ? "النص بالإنجليزية:" : "Arabic text:"}
              </span>
              {content.secondaryBody}
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <span className="text-[var(--muted)] flex items-center gap-1.5 mb-1 font-semibold">
                <Tag className="h-3.5 w-3.5 text-blue-600" />
                {isAr ? "نوع الحدث" : "Event Type"}
              </span>
              <p className="font-mono font-bold text-[var(--foreground)] truncate">
                {notification.eventType || "—"}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <span className="text-[var(--muted)] flex items-center gap-1.5 mb-1 font-semibold">
                <Layers className="h-3.5 w-3.5 text-purple-600" />
                {isAr ? "الكيان المصدر" : "Source Entity"}
              </span>
              <p className="font-mono font-bold text-[var(--foreground)] truncate">
                {notification.sourceEntityType
                  ? `${notification.sourceEntityType}${
                      notification.sourceEntityId ? ` (#${notification.sourceEntityId.slice(0, 8)}...)` : ""
                    }`
                  : isAr
                  ? "إشعار نظام عام"
                  : "General System"}
              </p>
            </div>

            {notification.expiresAtUtc && (
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <span className="text-[var(--muted)] flex items-center gap-1.5 mb-1 font-semibold">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  {isAr ? "تاريخ الانتهاء" : "Expires At"}
                </span>
                <p className="font-semibold text-[var(--foreground)]">
                  {formatFullDateTime(notification.expiresAtUtc, locale)}
                </p>
              </div>
            )}

            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <span className="text-[var(--muted)] flex items-center gap-1.5 mb-1 font-semibold">
                <ShieldAlert className="h-3.5 w-3.5 text-indigo-600" />
                {isAr ? "الجمهور / الصلاحيات" : "Audience / Permissions"}
              </span>
              <p className="font-semibold text-[var(--foreground)]">
                {notification.permissionKeys && notification.permissionKeys.length > 0
                  ? notification.permissionKeys.join(", ")
                  : isAr
                  ? "إشعار شخصي خاص"
                  : "Personal Notification"}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] p-4 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            {/* Read / Unread toggle */}
            <button
              disabled={isActionLoading}
              onClick={() =>
                void onAction(
                  notification.id,
                  notification.readAtUtc ? "unread" : "read",
                  notification.rowVersion
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--surface)] hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--foreground)] transition-colors disabled:opacity-50"
            >
              {notification.readAtUtc ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                  {isAr ? "تعيين كغير مقروء" : "Mark as unread"}
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 text-blue-600" />
                  {isAr ? "تعيين كمقروء" : "Mark as read"}
                </>
              )}
            </button>

            {/* Acknowledge button */}
            {!notification.acknowledgedAtUtc && (
              <button
                disabled={isActionLoading}
                onClick={() =>
                  void onAction(
                    notification.id,
                    "acknowledge",
                    notification.rowVersion
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {isAr ? "تأكيد واستلام" : "Acknowledge"}
              </button>
            )}

            {/* Archive button */}
            <button
              disabled={isActionLoading}
              onClick={() => {
                void onAction(notification.id, "archive", notification.rowVersion);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50"
            >
              <Archive className="h-3.5 w-3.5" />
              {isAr ? "أرشفة" : "Archive"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {(notification.deepLink || content.deepLink) && (
              <button
                onClick={handleDeepLink}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#1167c9] hover:bg-[#0b55a8] text-white shadow-sm transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {isAr ? "الانتقال للرابط" : "Go to Link"}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isAr ? "إغلاق" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
