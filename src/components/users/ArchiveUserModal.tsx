"use client";

import React, { useState } from "react";
import { AlertTriangle, Archive } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { archiveUser, getUser } from "@/lib/users/api";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth/AuthProvider";

interface ArchiveUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    userName?: string;
    displayNameAr?: string;
    displayNameEn?: string;
    rowVersion?: string;
  } | null;
  onSuccess: () => void;
}

export function ArchiveUserModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: ArchiveUserModalProps) {
  const { locale } = useAuth();
  const [reason, setReason] = useState("User account is no longer required");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !user) return null;

  const displayName =
    locale === "en"
      ? user.displayNameEn || user.displayNameAr || user.userName
      : user.displayNameAr || user.displayNameEn || user.userName;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReason = reason.trim();
    if (!cleanReason) {
      setError(
        locale === "en"
          ? "The reason cannot be empty."
          : "سبب الأرشفة مطلوب ولا يمكن تركه فارغاً."
      );
      return;
    }

    setBusy(true);
    setError("");

    try {
      // 1. Obtain the current rowVersion from GET https://gat.premiumasp.net/api/users/{userId}
      let freshRowVersion = user.rowVersion;
      try {
        const freshUser = await getUser(user.id);
        if (freshUser?.rowVersion) {
          freshRowVersion = freshUser.rowVersion;
        }
      } catch (err) {
        console.warn("Could not obtain fresh user rowVersion, using fallback:", err);
      }

      // 2. Call PATCH https://gat.premiumasp.net/api/users/{userId}/archive
      await archiveUser(user.id, cleanReason, freshRowVersion);

      toast.success(
        locale === "en" ? "User Archived" : "تمت الأرشفة",
        locale === "en"
          ? "User account archived successfully."
          : "تمت أرشفة حساب المستخدم بنجاح."
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err?.message ||
        (locale === "en"
          ? "Failed to archive user account."
          : "تعذر أرشفة حساب المستخدم. يرجى التحقق والمحاولة مجدداً.");
      setError(msg);
      toast.error(
        locale === "en" ? "Action Failed" : "فشلت العملية",
        msg
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={locale === "en" ? "Archive User Account" : "أرشفة حساب المستخدم"}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/40 p-3.5 text-xs text-red-900 dark:text-red-200">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <div className="space-y-1">
            <p className="font-bold">
              {locale === "en"
                ? `Are you sure you want to archive "${displayName}"?`
                : `هل أنت متأكد من رغبتك في أرشفة حساب "${displayName}"؟`}
            </p>
            <p className="text-[11px] opacity-80">
              {locale === "en"
                ? "This will disable access and move the account to the archive."
                : "سيؤدي هذا الإجراء إلى تعطيل تسجيل الدخول ونقل الحساب إلى الأرشيف."}
            </p>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-xs font-bold text-red-600">
            {error}
          </p>
        )}

        <div className="space-y-1.5">
          <Input
            label={locale === "en" ? "Archive Reason *" : "سبب الأرشفة *"}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              locale === "en"
                ? "User account is no longer required"
                : "مثال: لم يعد الحساب مطلوباً"
            }
          />
          <p className="text-[11px] text-[var(--muted)]">
            {locale === "en"
              ? "The reason cannot be empty and will be recorded in audit logs."
              : "سبب الأرشفة إلزامي وسيتم تسجيله في سجلات التدقيق للنظام."}
          </p>
        </div>

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
            variant="danger"
            loading={busy}
          >
            <Archive size={16} />
            {locale === "en" ? "Confirm Archive" : "تأكيد الأرشفة"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
