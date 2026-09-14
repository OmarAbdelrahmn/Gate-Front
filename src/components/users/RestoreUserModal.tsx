"use client";

import React, { useState } from "react";
import { CheckCircle2, RotateCcw, ShieldCheck, User } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { restoreUser } from "@/lib/users/api";
import type { ManagedUser } from "@/lib/users/types";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth/AuthProvider";

interface RestoreUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ManagedUser | null;
  onSuccess: (restored: ManagedUser) => void;
  onConflict?: () => void;
  onNotFound?: (userId: string) => void;
}

export function RestoreUserModal({
  isOpen,
  onClose,
  user,
  onSuccess,
  onConflict,
  onNotFound,
}: RestoreUserModalProps) {
  const { locale } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !user) return null;

  const displayName =
    locale === "en"
      ? user.displayNameEn || user.displayNameAr || user.userName
      : user.displayNameAr || user.displayNameEn || user.userName;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setBusy(true);
    setError("");

    try {
      // Send the current rowVersion from the archived-users response
      const restored = await restoreUser(user.id, {
        rowVersion: user.rowVersion,
      });

      toast.success(
        locale === "en" ? "User Restored" : "تمت استعادة المستخدم",
        locale === "en"
          ? `User "${displayName}" restored successfully and is now active.`
          : `تمت استعادة المستخدم "${displayName}" بنجاح وتفعيل حسابه.`,
      );

      onSuccess(restored);
      onClose();
    } catch (err: any) {
      const status = err?.status || err?.details?.status;
      const errorCode = err?.details?.errorCode || err?.code;

      if (status === 409 || errorCode === "UserManagement.ConcurrencyConflict") {
        const msg =
          locale === "en"
            ? "Concurrency conflict: User state has changed. List was refreshed, please retry."
            : "تعارض في التحديث: تم تعديل بيانات المستخدم مسبقاً. تم تحديث القائمة، يرجى المحاولة مجدداً.";
        setError(msg);
        toast.error(
          locale === "en" ? "Conflict Detected" : "تعارض في البيانات",
          msg,
        );
        onConflict?.();
        return;
      }

      if (status === 404 || errorCode === "UserManagement.NotFound") {
        const msg =
          locale === "en"
            ? "User was not found in archive or may have already been restored."
            : "المستخدم غير موجود في الأرشيف أو قد تمت استعادته مسبقاً.";
        toast.warning(
          locale === "en" ? "User Not Found" : "المستخدم غير موجود",
          msg,
        );
        onNotFound?.(user.id);
        onClose();
        return;
      }

      if (status === 403 || errorCode === "UserManagement.ProtectedAccount") {
        const msg =
          locale === "en"
            ? "Action forbidden: You lack permission or this account is protected."
            : "غير مصرح: لا تملك الصلاحية الكافية أو أن هذا الحساب محمي.";
        setError(msg);
        return;
      }

      const defaultMsg =
        err?.message ||
        (locale === "en"
          ? "Failed to restore user account."
          : "تعذر استعادة حساب المستخدم. يرجى التحقق والمحاولة مجدداً.");
      setError(defaultMsg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={locale === "en" ? "Restore User Account" : "استعادة حساب المستخدم"}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User Summary Card */}
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-sm">
            {(user.displayNameAr || user.userName || "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-black text-sm truncate">{displayName}</h4>
            <p className="text-xs text-[var(--muted)] font-mono truncate" dir="ltr">
              @{user.userName} · {user.email}
            </p>
          </div>
        </div>

        {/* Informative explanation banner */}
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-50/70 dark:border-emerald-800/40 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-900 dark:text-emerald-200">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">
              {locale === "en"
                ? "What happens when you restore this user?"
                : "ماذا يحدث عند استعادة حساب المستخدم؟"}
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
              <li>
                {locale === "en"
                  ? "Changes account status to Active and clears lockout state."
                  : "تغيير حالة الحساب إلى نشط وإلغاء القفل وحالة الأرشفة."}
              </li>
              <li>
                {locale === "en"
                  ? "Preserves existing employee link, roles, and permissions."
                  : "الاحتفاظ برابط الموظف والأدوار والصلاحيات المباشرة المسندة."}
              </li>
              <li>
                {locale === "en"
                  ? "Password and identity credentials remain unchanged."
                  : "تبقى بيانات تسجيل الدخول وكلمة المرور كما هي دون تغيير."}
              </li>
            </ul>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={onClose}
          >
            {locale === "en" ? "Cancel" : "إلغاء"}
          </Button>
          <Button
            type="submit"
            loading={busy}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RotateCcw size={16} />
            {locale === "en" ? "Confirm Restore" : "تأكيد الاستعادة"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
