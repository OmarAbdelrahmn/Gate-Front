"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DualCalendarDateInput } from "@/components/ui/DualCalendarDateInput";
import type {
  CreateHearingRequest,
  HearingStatus,
  LegalCaseHearing,
  UpdateHearingRequest,
} from "@/lib/hr/legal-cases-api";
import { createHearing, updateHearing } from "@/lib/hr/legal-cases-api";
import { Calendar, Clock, MapPin, AlertCircle } from "lucide-react";

interface HearingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  onSuccess: (hearing: LegalCaseHearing) => void;
  hearingToEdit?: LegalCaseHearing | null;
}

export function HearingFormModal({
  isOpen,
  onClose,
  caseId,
  onSuccess,
  hearingToEdit,
}: HearingFormModalProps) {
  const isEdit = !!hearingToEdit;

  const [hearingDate, setHearingDate] = useState("");
  const [hearingTime, setHearingTime] = useState("10:00:00");
  const [status, setStatus] = useState<HearingStatus>("Scheduled");
  const [location, setLocation] = useState("");
  const [details, setDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [changeReason, setChangeReason] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    if (hearingToEdit) {
      setHearingDate(hearingToEdit.hearingDate || "");
      const rawTime = hearingToEdit.hearingTime || "10:00:00";
      setHearingTime(rawTime.length === 5 ? `${rawTime}:00` : rawTime);
      setStatus(hearingToEdit.status || "Scheduled");
      setLocation(hearingToEdit.location || "");
      setDetails(hearingToEdit.details || "");
      setNotes(hearingToEdit.notes || "");
      setChangeReason("");
    } else {
      const todayStr = new Date().toLocaleDateString("en-CA");
      setHearingDate(todayStr);
      setHearingTime("10:00:00");
      setStatus("Scheduled");
      setLocation("");
      setDetails("");
      setNotes("");
      setChangeReason("");
    }
    setErrors({});
  }, [isOpen, hearingToEdit]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!hearingDate) newErrors.hearingDate = "تاريخ الجلسة مطلوب";
    if (!hearingTime) newErrors.hearingTime = "وقت الجلسة مطلوب";
    if (!details.trim()) newErrors.details = "تفاصيل الجلسة مطلوبة";

    if (isEdit && !changeReason.trim()) {
      newErrors.changeReason = "سبب التعديل مطلوب";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      let formattedTime = hearingTime.trim();
      if (formattedTime.length === 5) formattedTime = `${formattedTime}:00`;

      if (isEdit && hearingToEdit) {
        const payload: UpdateHearingRequest = {
          hearingDate,
          hearingTime: formattedTime,
          status,
          details: details.trim(),
          notes: notes.trim() || null,
          location: location.trim() || null,
          rowVersion: hearingToEdit.rowVersion,
          changeReason: changeReason.trim(),
        };

        const res = await updateHearing(caseId, hearingToEdit.id, payload);
        onSuccess(res);
        onClose();
      } else {
        const payload: CreateHearingRequest = {
          hearingDate,
          hearingTime: formattedTime,
          status,
          details: details.trim(),
          notes: notes.trim() || null,
          location: location.trim() || null,
          rowVersion: null,
          changeReason: null,
        };

        const res = await createHearing(caseId, payload);
        onSuccess(res);
        onClose();
      }
    } catch (err: any) {
      console.error("Failed to save hearing:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEdit
          ? `تعديل بيانات الجلسة رقم ${hearingToEdit?.hearingNumber}`
          : "إضافة جلسة جديدة للقضية"
      }
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date & Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              تاريخ الجلسة <span className="text-rose-500">*</span>
            </label>
            <DualCalendarDateInput
              name="hearingDate"
              value={hearingDate}
              onChange={setHearingDate}
              required
              disabled={submitting}
            />
            {errors.hearingDate && (
              <p className="mt-1 text-xs text-rose-500">{errors.hearingDate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              وقت الجلسة (بتوقيت الرياض) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted)] pointer-events-none" />
              <input
                type="time"
                step="1"
                value={hearingTime}
                onChange={(e) => setHearingTime(e.target.value)}
                disabled={submitting}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pr-9 pl-3 py-2.5 text-sm text-[var(--foreground)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            {errors.hearingTime && (
              <p className="mt-1 text-xs text-rose-500">{errors.hearingTime}</p>
            )}
          </div>
        </div>

        {/* Status & Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              حالة الجلسة <span className="text-rose-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as HearingStatus)}
              disabled={submitting}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--foreground)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Scheduled">مجدولة (Scheduled)</option>
              <option value="Completed">مكتملة (Completed)</option>
              <option value="Postponed">مؤجلة (Postponed)</option>
              <option value="Cancelled">ملغاة (Cancelled)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              مكان انعقاد الجلسة
            </label>
            <div className="relative">
              <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted)] pointer-events-none" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="مثال: المحكمة العمالية بالرياض"
                disabled={submitting}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pr-9 pl-3 py-2 text-sm text-[var(--foreground)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Details */}
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            تفاصيل وموضوع الجلسة <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="اكتب مجريات وتفاصيل الجلسة..."
            disabled={submitting}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {errors.details && (
            <p className="mt-1 text-xs text-rose-500">{errors.details}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            ملاحظات الجلسة (اختياري)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي ملاحظات أو قرارات صادرة في الجلسة..."
            disabled={submitting}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Change reason on edit */}
        {isEdit && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/30 dark:border-amber-900/50 p-3.5 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
              <label className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                سبب تعديل الجلسة <span className="text-rose-500">*</span>
              </label>
            </div>
            <Input
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="مثال: تأجيل موعد الجلسة بناءً على طلب الدائرة القضائية..."
              disabled={submitting}
            />
            {errors.changeReason && (
              <p className="mt-1 text-xs text-rose-500">{errors.changeReason}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
          >
            {isEdit ? "حفظ التعديلات" : "إضافة الجلسة"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
