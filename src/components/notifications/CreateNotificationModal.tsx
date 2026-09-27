"use client";

import React, { useState } from "react";
import { Plus, Send, Sparkles, X } from "lucide-react";
import type {
  CreateNotificationRequest,
  NotificationItem,
  NotificationSeverity,
} from "../../lib/notifications/types";
import { createNotification } from "../../lib/notifications/api";
import { toast } from "../ui/Toast";

interface CreateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: "ar" | "en";
  onSuccess?: (item: NotificationItem) => void;
}

export function CreateNotificationModal({
  isOpen,
  onClose,
  locale,
  onSuccess,
}: CreateNotificationModalProps) {
  const isAr = locale === "ar";
  const [loading, setLoading] = useState(false);

  const [recipientUserId, setRecipientUserId] = useState("");
  const [eventType, setEventType] = useState("system.manual_alert");
  const [severity, setSeverity] = useState<NotificationSeverity>("Information");
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [sourceEntityType, setSourceEntityType] = useState("");
  const [sourceEntityId, setSourceEntityId] = useState("");
  const [deduplicationKey, setDeduplicationKey] = useState(
    () => `manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  );
  const [permissionKeysInput, setPermissionKeysInput] = useState("");

  if (!isOpen) return null;

  const generateNewDeduplicationKey = () => {
    setDeduplicationKey(
      `manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientUserId.trim()) {
      toast.error(
        isAr ? "حقل مطلوب" : "Required field",
        isAr ? "يرجى إدخال معرف المستخدم المستلم (GUID)" : "Please enter the recipient user ID (GUID)"
      );
      return;
    }
    if (!titleAr.trim() && !titleEn.trim()) {
      toast.error(
        isAr ? "حقل مطلوب" : "Required field",
        isAr ? "يرجى إدخال عنوان الإشعار" : "Please enter a notification title"
      );
      return;
    }
    if (!bodyAr.trim() && !bodyEn.trim()) {
      toast.error(
        isAr ? "حقل مطلوب" : "Required field",
        isAr ? "يرجى إدخال نص الإشعار" : "Please enter notification body text"
      );
      return;
    }

    setLoading(true);
    try {
      const permissionKeys = permissionKeysInput.trim()
        ? permissionKeysInput
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean)
        : null;

      const payload: CreateNotificationRequest = {
        recipientUserId: recipientUserId.trim(),
        eventType: eventType.trim() || "system.alert",
        severity,
        titleAr: titleAr.trim() || titleEn.trim(),
        titleEn: titleEn.trim() || titleAr.trim(),
        bodyAr: bodyAr.trim() || bodyEn.trim(),
        bodyEn: bodyEn.trim() || bodyAr.trim(),
        sourceEntityType: sourceEntityType.trim() || null,
        sourceEntityId: sourceEntityId.trim() || null,
        deepLink: deepLink.trim() || null,
        deduplicationKey: deduplicationKey.trim() || `key-${Date.now()}`,
        permissionKeys,
      };

      const created = await createNotification(payload);
      toast.success(
        isAr ? "تم الإرسال" : "Sent successfully",
        isAr ? "تم إنشاء وإرسال الإشعار بنجاح" : "Notification created and sent successfully"
      );
      onSuccess?.(created);
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(
        isAr ? "خطأ" : "Error",
        e?.message || (isAr ? "تعذر إنشاء الإشعار" : "Failed to create notification")
      );
    } finally {
      setLoading(false);
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
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#152238] text-[var(--foreground)] shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] p-5 bg-slate-50/70 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--foreground)]">
                {isAr ? "إنشاء إشعار جديد للمستخدم" : "Create User Notification"}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {isAr
                  ? "إرسال إشعار فوري لمستخدم عبر النظام (صلاحية notifications.manage)"
                  : "Send direct notification to a user (requires notifications.manage)"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)] hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Recipient User ID */}
          <div>
            <label className="block font-bold text-[var(--foreground)] mb-1">
              {isAr ? "معرف المستخدم المستلم (GUID) *" : "Recipient User ID (GUID) *"}
            </label>
            <input
              type="text"
              required
              value={recipientUserId}
              onChange={(e) => setRecipientUserId(e.target.value)}
              placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
              className="w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm focus:border-[#1167c9] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Event Type */}
            <div>
              <label className="block font-bold text-[var(--foreground)] mb-1">
                {isAr ? "نوع الحدث (Event Type) *" : "Event Type *"}
              </label>
              <input
                type="text"
                required
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="e.g. fleet.vehicle_assigned"
                className="w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm focus:border-[#1167c9] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none font-mono"
              />
            </div>

            {/* Severity */}
            <div>
              <label className="block font-bold text-[var(--foreground)] mb-1">
                {isAr ? "درجة الأهمية (Severity) *" : "Severity *"}
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as NotificationSeverity)}
                className="w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm focus:border-[#1167c9] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none font-semibold"
              >
                <option value="Information">{isAr ? "معلومات (Information)" : "Information"}</option>
                <option value="Success">{isAr ? "نجاح (Success)" : "Success"}</option>
                <option value="Warning">{isAr ? "تحذير (Warning)" : "Warning"}</option>
                <option value="Error">{isAr ? "خطأ (Error)" : "Error"}</option>
                <option value="Critical">{isAr ? "حرج (Critical)" : "Critical"}</option>
              </select>
            </div>
          </div>

          {/* Bilingual Titles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[var(--foreground)] mb-1">
                {isAr ? "العنوان بالعربية *" : "Arabic Title *"}
              </label>
              <input
                type="text"
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                placeholder={isAr ? "مثال: تم إسناد مركبة جديدة" : "Arabic title"}
                className="w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm focus:border-[#1167c9] outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[var(--foreground)] mb-1">
                {isAr ? "العنوان بالإنجليزية" : "English Title"}
              </label>
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="e.g. New Vehicle Assigned"
                className="w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm focus:border-[#1167c9] outline-none"
              />
            </div>
          </div>

          {/* Bilingual Bodies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[var(--foreground)] mb-1">
                {isAr ? "نص الإشعار بالعربية *" : "Arabic Body *"}
              </label>
              <textarea
                rows={3}
                value={bodyAr}
                onChange={(e) => setBodyAr(e.target.value)}
                placeholder={isAr ? "اكتب نص الإشعار بالتفصيل..." : "Arabic body"}
                className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm focus:border-[#1167c9] outline-none resize-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[var(--foreground)] mb-1">
                {isAr ? "نص الإشعار بالإنجليزية" : "English Body"}
              </label>
              <textarea
                rows={3}
                value={bodyEn}
                onChange={(e) => setBodyEn(e.target.value)}
                placeholder="Detailed notification message..."
                className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm focus:border-[#1167c9] outline-none resize-none"
              />
            </div>
          </div>

          {/* Deep link & Permissions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[var(--foreground)] mb-1">
                {isAr ? "رابط الوجهة (Deep Link)" : "Deep Link"}
              </label>
              <input
                type="text"
                value={deepLink}
                onChange={(e) => setDeepLink(e.target.value)}
                placeholder="/admin/fleet/vehicles"
                className="w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm focus:border-[#1167c9] outline-none font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-[var(--foreground)] mb-1">
                {isAr ? "صلاحيات الجمهور (مفصولة بفواصل)" : "Permission Keys (comma separated)"}
              </label>
              <input
                type="text"
                value={permissionKeysInput}
                onChange={(e) => setPermissionKeysInput(e.target.value)}
                placeholder="e.g. fleet.vehicles.read (leave blank for personal)"
                className="w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm focus:border-[#1167c9] outline-none font-mono text-xs"
              />
              <span className="text-[10px] text-[var(--muted)]">
                {isAr
                  ? "اتركه فارغاً لإنشاء إشعار شخصي بدون قيود صلاحيات"
                  : "Leave blank to create a personal notification"}
              </span>
            </div>
          </div>

          {/* Deduplication Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-[var(--foreground)]">
                {isAr ? "مفتاح منع التكرار (Deduplication Key) *" : "Deduplication Key *"}
              </label>
              <button
                type="button"
                onClick={generateNewDeduplicationKey}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Sparkles className="h-3 w-3" />
                {isAr ? "توليد جديد" : "Regenerate"}
              </button>
            </div>
            <input
              type="text"
              required
              value={deduplicationKey}
              onChange={(e) => setDeduplicationKey(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm focus:border-[#1167c9] outline-none font-mono"
            />
          </div>

          {/* Source Entity Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[var(--foreground)] mb-1">
                {isAr ? "نوع الكيان المصدر (Source Entity Type)" : "Source Entity Type"}
              </label>
              <input
                type="text"
                value={sourceEntityType}
                onChange={(e) => setSourceEntityType(e.target.value)}
                placeholder="e.g. Vehicle, WorkOrder"
                className="w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm focus:border-[#1167c9] outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[var(--foreground)] mb-1">
                {isAr ? "معرف الكيان المصدر (GUID)" : "Source Entity ID"}
              </label>
              <input
                type="text"
                value={sourceEntityId}
                onChange={(e) => setSourceEntityId(e.target.value)}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                className="w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm focus:border-[#1167c9] outline-none font-mono"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#1167c9] hover:bg-[#0b55a8] text-white shadow-md transition-colors disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {loading
                ? isAr
                  ? "جارٍ الإرسال..."
                  : "Sending..."
                : isAr
                ? "إرسال الإشعار"
                : "Send Notification"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
