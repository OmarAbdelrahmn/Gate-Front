"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertTriangle } from "lucide-react";

interface LegalCaseArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  title?: string;
  itemDescription?: string;
  loading?: boolean;
}

export function LegalCaseArchiveModal({
  isOpen,
  onClose,
  onConfirm,
  title = "تأكيد الأرشفة",
  itemDescription,
  loading = false,
}: LegalCaseArchiveModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("سبب الأرشفة مطلوب");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (err: any) {
      console.error("Archive error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
          <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-semibold">تنبيه أرشفة السجل</p>
            <p>
              {itemDescription ||
                "سيتم نقل هذا السجل إلى الأرشيف ولن يظهر في القوائم النشطة. يتطلب النظام تسجيل سبب الأرشفة في سجل التدقيق التاريخي."}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            سبب الأرشفة <span className="text-rose-500">*</span>
          </label>
          <Input
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            placeholder="اكتب سبب أرشفة هذا السجل..."
            disabled={isSubmitting || loading}
          />
          {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting || loading}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
            loading={isSubmitting || loading}
          >
            تأكيد الأرشفة
          </Button>
        </div>
      </form>
    </Modal>
  );
}
