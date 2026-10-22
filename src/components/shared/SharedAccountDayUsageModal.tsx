"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import {
  RefreshCw,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Calendar,
  CheckCircle2,
  Info,
} from "lucide-react";
import {
  getPlatformAccountDayUsage,
  updatePlatformAccountDayUsage,
  type PlatformAccountDayResponse,
  type PlatformAccountDayParticipant,
  type PlatformAccountDayUsageInput,
  type PlatformAccountDayUpdateRequest,
} from "@/lib/platforms/api";
import { useAuth } from "@/lib/auth/AuthProvider";

interface SharedAccountDayUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountCode?: string | null;
  initialDate?: string | null;
  platformName?: string | null;
  platform?: "generic" | "ninja" | "chefz" | "jahez";
  riderNamesMap?: Record<string, string | null | undefined>;
  canEdit?: boolean;
  onUpdated?: () => void;
}

export function SharedAccountDayUsageModal({
  isOpen,
  onClose,
  accountId,
  accountCode,
  initialDate,
  platformName,
  platform,
  riderNamesMap,
  canEdit: canEditProp,
  onUpdated,
}: SharedAccountDayUsageModalProps) {
  const { can, user } = useAuth();
  const isAdmin = user?.roles?.includes("Admin");

  const resolvedPlatform: "generic" | "ninja" | "chefz" | "jahez" =
    platform ||
    (platformName?.toLowerCase().includes("ninja") || platformName?.includes("نينجا")
      ? "ninja"
      : platformName?.toLowerCase().includes("chefz") || platformName?.includes("شيفز")
        ? "chefz"
        : platformName?.toLowerCase().includes("jahez") || platformName?.includes("جاهز")
          ? "jahez"
          : "generic");

  const canUpdateDayUsage =
    canEditProp !== undefined
      ? canEditProp
      : Boolean(
          isAdmin ||
            (resolvedPlatform === "ninja" &&
              can("ninja.assignments.delete") &&
              can("ninja.accounts.update")) ||
            (resolvedPlatform === "jahez" &&
              (can("jahez.handovers.update") || can("jahez.accounts.update")) &&
              can("jahez.withdraw")) ||
            can("platform_assignments.update")
        );

  const getTodayRiyadh = () => {
    try {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Riyadh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      return formatter.format(new Date());
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  };

  const [date, setDate] = useState<string>(initialDate || getTodayRiyadh());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<PlatformAccountDayResponse | null>(null);
  const [participants, setParticipants] = useState<PlatformAccountDayParticipant[]>([]);
  const [editedFigures, setEditedFigures] = useState<Record<string, PlatformAccountDayUsageInput | null>>({});
  const [dirtyAssignments, setDirtyAssignments] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState<string>("استكمال وتحديث إنتاجية اليوم المشترك");

  const loadDayUsage = useCallback(
    async (targetDate: string) => {
      if (!accountId || !targetDate) return;
      setLoading(true);
      try {
        const res = await getPlatformAccountDayUsage(accountId, targetDate);
        setData(res);
        const sorted = [...(res.assignments || [])].sort((a, b) => {
          if (a.sequence !== null && b.sequence !== null) return a.sequence - b.sequence;
          if (a.sequence !== null) return -1;
          if (b.sequence !== null) return 1;
          return 0;
        });
        setParticipants(sorted);

        // Pre-fill edited figures map preserving null vs complete figure object
        const initialFigMap: Record<string, PlatformAccountDayUsageInput | null> = {};
        for (const p of sorted) {
          initialFigMap[p.assignmentId] = p.figures
            ? {
                ordersCount: p.figures.ordersCount ?? null,
                workingHours: p.figures.workingHours ?? null,
                collectedAmount: p.figures.collectedAmount ?? null,
                deductionsAmount: p.figures.deductionsAmount ?? null,
                totalValidOffers: p.figures.totalValidOffers ?? null,
                declinedOffers: p.figures.declinedOffers ?? null,
                missedOffers: p.figures.missedOffers ?? null,
              }
            : null;
        }
        setEditedFigures(initialFigMap);
        setDirtyAssignments({});
      } catch (err: unknown) {
        console.error("Failed to load day usage:", err);
        const e = err as { message?: string; status?: number };
        toast.error("خطأ في جلب بيانات اليوم المشترك", e.message || "تعذر جلب تفاصيل الاستخدام.");
        setData(null);
        setParticipants([]);
      } finally {
        setLoading(false);
      }
    },
    [accountId]
  );

  useEffect(() => {
    if (isOpen && accountId) {
      const targetDate = initialDate || getTodayRiyadh();
      setDate(targetDate);
      loadDayUsage(targetDate);
    }
  }, [isOpen, accountId, initialDate, loadDayUsage]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    loadDayUsage(newDate);
  };

  const handleMoveParticipant = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= participants.length) return;

    const updated = [...participants];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setParticipants(updated);
  };

  const handleFigureChange = (
    assignmentId: string,
    field: keyof PlatformAccountDayUsageInput,
    rawVal: string
  ) => {
    let nextVal: number | null = null;
    const trimmed = rawVal.trim();
    if (trimmed !== "") {
      const num = Number(trimmed);
      if (!Number.isNaN(num)) {
        nextVal = num;
      }
    }

    setDirtyAssignments((prev) => ({ ...prev, [assignmentId]: true }));
    setEditedFigures((prev) => {
      const currentObj = prev[assignmentId] || {
        ordersCount: null,
        workingHours: null,
        collectedAmount: null,
        deductionsAmount: null,
        totalValidOffers: null,
        declinedOffers: null,
        missedOffers: null,
      };
      return {
        ...prev,
        [assignmentId]: {
          ordersCount: currentObj.ordersCount ?? null,
          workingHours: currentObj.workingHours ?? null,
          collectedAmount: currentObj.collectedAmount ?? null,
          deductionsAmount: currentObj.deductionsAmount ?? null,
          totalValidOffers: currentObj.totalValidOffers ?? null,
          declinedOffers: currentObj.declinedOffers ?? null,
          missedOffers: currentObj.missedOffers ?? null,
          [field]: nextVal,
        },
      };
    });
  };

  const handleLeaveUnchangedOrRemainder = (assignmentId: string) => {
    setDirtyAssignments((prev) => ({ ...prev, [assignmentId]: false }));
    const orig = participants.find((p) => p.assignmentId === assignmentId)?.figures;
    setEditedFigures((prev) => ({
      ...prev,
      [assignmentId]: orig
        ? {
            ordersCount: orig.ordersCount ?? null,
            workingHours: orig.workingHours ?? null,
            collectedAmount: orig.collectedAmount ?? null,
            deductionsAmount: orig.deductionsAmount ?? null,
            totalValidOffers: orig.totalValidOffers ?? null,
            declinedOffers: orig.declinedOffers ?? null,
            missedOffers: orig.missedOffers ?? null,
          }
        : null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUpdateDayUsage) {
      toast.warning("غير مصرح", "لا تملك صلاحية تعديل بيانات استخدام اليوم المشترك.");
      return;
    }
    if (!reason.trim()) {
      toast.warning("سبب التحديث مطلوب", "يرجى كتابة سبب حفظ أو تعديل إنتاجية اليوم المشترك.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: PlatformAccountDayUpdateRequest = {
        assignments: participants.map((p) => {
          const isDirty = Boolean(dirtyAssignments[p.assignmentId]);
          const fig = editedFigures[p.assignmentId];
          // Per contract: figures: null leaves an existing figure object unchanged (or uses remainder for final assignment).
          // When modified, send the complete current object so omitted fields don't unexpectedly become unknown.
          const figuresPayload: PlatformAccountDayUsageInput | null =
            isDirty && fig
              ? {
                  ordersCount: fig.ordersCount ?? null,
                  workingHours: fig.workingHours ?? null,
                  collectedAmount: fig.collectedAmount ?? null,
                  deductionsAmount: fig.deductionsAmount ?? null,
                  totalValidOffers: fig.totalValidOffers ?? null,
                  declinedOffers: fig.declinedOffers ?? null,
                  missedOffers: fig.missedOffers ?? null,
                }
              : null;

          return {
            assignmentId: p.assignmentId,
            figures: figuresPayload,
            rowVersion: p.rowVersion || null,
          };
        }),
        reason: reason.trim(),
      };

      await updatePlatformAccountDayUsage(accountId, payload, date);
      toast.success("تم الحفظ بنجاح", "تم تحديث وتثبيت إنتاجية المندوبين لليوم المشترك.");
      await loadDayUsage(date);
      onUpdated?.();
    } catch (err: unknown) {
      console.error("Failed to update day usage:", err);
      const e = err as { status?: number; message?: string; details?: unknown };
      if (e?.status === 409) {
        toast.error(
          "تعارض في سجل الإنتاجية (409)",
          "تم تعديل البيانات بالتزامن أو هناك تعارض مع الاستيرادات المحفوظة. تم إعادة تحميل أحدث البيانات."
        );
        loadDayUsage(date);
      } else {
        toast.error("فشل حفظ التعديلات", e?.message || "تعذر حفظ بيانات الإنتاجية.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getMissingFieldsArabic = (fields: string[]): string => {
    const map: Record<string, string> = {
      ordersCount: "عدد الطلبات (Orders)",
      workingHours: "ساعات العمل (Hours)",
      collectedAmount: "المبالغ المحصلة (Cash)",
      deductionsAmount: "الاستقطاعات (Deductions)",
      totalValidOffers: "إجمالي العروض الصالحة (Valid Offers)",
      declinedOffers: "العروض المرفوضة (Declined Offers)",
      missedOffers: "العروض الفائتة (Missed Offers)",
    };
    return fields.map((f) => map[f] || f).join("، ");
  };

  const showChefzFields =
    resolvedPlatform === "chefz" ||
    resolvedPlatform === "generic" ||
    participants.some(
      (p) =>
        p.missingFields?.some((f) =>
          ["totalValidOffers", "declinedOffers", "missedOffers"].includes(f)
        ) ||
        (p.figures &&
          (p.figures.totalValidOffers !== null ||
            p.figures.declinedOffers !== null ||
            p.figures.missedOffers !== null))
    );

  const getVisibleFields = useCallback((): (keyof PlatformAccountDayUsageInput)[] => {
    const keys: (keyof PlatformAccountDayUsageInput)[] = ["ordersCount"];
    if (resolvedPlatform !== "jahez") {
      keys.push("workingHours");
    }
    if (resolvedPlatform !== "jahez" && resolvedPlatform !== "chefz") {
      keys.push("collectedAmount", "deductionsAmount");
    }
    if (showChefzFields) {
      keys.push("totalValidOffers", "declinedOffers", "missedOffers");
    }
    return keys;
  }, [resolvedPlatform, showChefzFields]);

  const handleToggleAllZero = (assignmentId: string, checked: boolean) => {
    if (checked) {
      const visibleFields = getVisibleFields();
      setDirtyAssignments((prev) => ({ ...prev, [assignmentId]: true }));
      setEditedFigures((prev) => {
        const currentObj = prev[assignmentId] || {};
        const nextObj: PlatformAccountDayUsageInput = { ...currentObj };
        for (const field of visibleFields) {
          nextObj[field] = 0;
        }
        return {
          ...prev,
          [assignmentId]: nextObj,
        };
      });
    } else {
      handleLeaveUnchangedOrRemainder(assignmentId);
    }
  };

  const checkIsAllZero = (assignmentId: string): boolean => {
    const fig = editedFigures[assignmentId];
    if (!fig) return false;
    const visibleFields = getVisibleFields();
    if (visibleFields.length === 0) return false;
    return visibleFields.every((f) => fig[f] === 0);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`إدارة إنتاجية اليوم المشترك (Shared Account Day Usage)`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4" dir="rtl">
        {/* Header Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3 text-xs">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[var(--muted)]">الحساب: </span>
              <span className="font-bold font-mono text-[var(--foreground)]">
                {accountCode || accountId}
              </span>
            </div>
            {platformName && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-800 dark:bg-purple-950/50 dark:text-purple-300">
                {platformName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[var(--muted)]" />
            <label className="text-[11px] font-bold text-[var(--muted)]">تاريخ اليوم:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--foreground)] outline-none focus:border-purple-600"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => loadDayUsage(date)}
              disabled={loading}
              className="h-7 px-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Informative Guidance */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>قواعد اليوم المشترك وترتيب التسليم والتسلم:</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            يحدد ترتيب القائمة تسلسل استخدام الحساب (المندوب الأول، الثاني، الأخير). تُحسب حصة المندوب الأخير تلقائياً من المتبقي بعد طرح حصص المندوبين المغادرين. اترك الحقل فارغاً إذا كانت القيمة غير معلومة، وضع 0 إذا كانت مؤكدة بصفر.
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--muted)]">
            <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-purple-500" />
            جارٍ تحميل بيانات الاستخدام للتاريخ المحدد...
          </div>
        ) : participants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] py-8 text-center text-xs text-[var(--muted)]">
            لا توجد تعيينات نشطة أو منتهية لهذا الحساب في تاريخ ({date}).
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              {participants.map((p, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === participants.length - 1;
                const fig = editedFigures[p.assignmentId] || {};
                const hasMissing = p.missingFields && p.missingFields.length > 0;
                const riderName = riderNamesMap?.[p.riderProfileId];
                const isUnresolvedSequence = p.sequence === null;
                const isAllZero = checkIsAllZero(p.assignmentId);

                return (
                  <div
                    key={p.assignmentId}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3.5 shadow-sm space-y-3"
                  >
                    {/* Participant Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-[11px] font-bold text-white">
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="text-xs font-bold text-[var(--foreground)]">
                            {isFirst
                              ? "المندوب الأول (Outgoing #1)"
                              : isLast && participants.length > 1
                                ? "المندوب النهائي (Final Holder - المتبقي)"
                                : `المندوب رقم #${idx + 1}`}
                          </span>
                          {riderName && (
                            <span className="mr-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                              — {riderName}
                            </span>
                          )}
                          <span className="mr-2 text-[11px] font-mono text-[var(--muted)]" dir="ltr">
                            ({p.riderProfileId})
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isUnresolvedSequence && (
                          <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10.5px] font-bold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50">
                            ترتيب التسليم غير محدد (سيُحفظ كـ #{idx + 1})
                          </span>
                        )}

                        {hasMissing && (
                          <div className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>حقول مفقودة للاستيراد: {getMissingFieldsArabic(p.missingFields)}</span>
                          </div>
                        )}

                        {/* Reorder Buttons */}
                        {participants.length > 1 && canUpdateDayUsage && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveParticipant(idx, "up")}
                              disabled={isFirst}
                              title="تقديم الترتيب"
                              className="rounded p-1 text-[var(--muted)] hover:bg-[var(--subtle-bg)] disabled:opacity-30"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveParticipant(idx, "down")}
                              disabled={isLast}
                              title="تأخير الترتيب"
                              className="rounded p-1 text-[var(--muted)] hover:bg-[var(--subtle-bg)] disabled:opacity-30"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Zero-All Checkbox Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--subtle-bg)]/80 px-3 py-2 border border-[var(--border)]">
                      <label
                        htmlFor={`rider-all-zero-${p.assignmentId}`}
                        className="inline-flex items-center gap-2 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          id={`rider-all-zero-${p.assignmentId}`}
                          checked={isAllZero}
                          disabled={!canUpdateDayUsage}
                          onChange={(e) => handleToggleAllZero(p.assignmentId, e.target.checked)}
                          className="h-4 w-4 rounded border-[var(--border)] text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer disabled:cursor-not-allowed accent-purple-600"
                        />
                        <span className="text-xs font-bold text-[var(--foreground)]">
                          تصفير جميع قيم هذا المندوب (All at zero)
                        </span>
                        <span className="text-[11px] text-[var(--muted)] hidden sm:inline">
                          (تعيين كافة الحقول كأصفار مؤكدة 0)
                        </span>
                      </label>

                      {dirtyAssignments[p.assignmentId] && canUpdateDayUsage && (
                        <button
                          type="button"
                          onClick={() => handleLeaveUnchangedOrRemainder(p.assignmentId)}
                          className="text-[10.5px] font-semibold text-[var(--muted)] hover:text-rose-600 underline"
                        >
                          إلغاء التعديل (تركها دون تغيير / متبقي)
                        </button>
                      )}
                    </div>

                    {isLast && participants.length > 1 && !dirtyAssignments[p.assignmentId] && p.figures === null && (
                      <div className="rounded-lg bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 px-2.5 py-1.5 text-[11px] text-purple-800 dark:text-purple-300">
                        هذا المندوب هو صاحب الحصة النهائية في اليوم المشترك؛ تُحسب حصته تلقائياً من المتبقي عند الاستيراد (`figures: null`).
                      </div>
                    )}

                    {/* Figure Inputs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-[var(--foreground)]">
                          {resolvedPlatform === "chefz" ? "الطلبات المقبولة (Orders)" : "عدد الطلبات"}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          disabled={!canUpdateDayUsage}
                          placeholder="مجهول (null)"
                          value={fig.ordersCount !== undefined && fig.ordersCount !== null ? fig.ordersCount : ""}
                          onChange={(e) => handleFigureChange(p.assignmentId, "ordersCount", e.target.value)}
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2 text-xs text-[var(--foreground)] outline-none focus:border-purple-600 disabled:opacity-60"
                        />
                      </div>

                      {resolvedPlatform !== "jahez" && (
                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-[var(--foreground)]">
                            ساعات العمل
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="any"
                            disabled={!canUpdateDayUsage}
                            placeholder="0 - 24"
                            value={fig.workingHours !== undefined && fig.workingHours !== null ? fig.workingHours : ""}
                            onChange={(e) => handleFigureChange(p.assignmentId, "workingHours", e.target.value)}
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2 text-xs text-[var(--foreground)] outline-none focus:border-purple-600 disabled:opacity-60"
                          />
                        </div>
                      )}

                      {resolvedPlatform !== "jahez" && resolvedPlatform !== "chefz" && (
                        <>
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-[var(--foreground)]">
                              المحصل كاش
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              disabled={!canUpdateDayUsage}
                              placeholder="0.00 ر.س"
                              value={fig.collectedAmount !== undefined && fig.collectedAmount !== null ? fig.collectedAmount : ""}
                              onChange={(e) => handleFigureChange(p.assignmentId, "collectedAmount", e.target.value)}
                              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2 text-xs text-[var(--foreground)] outline-none focus:border-purple-600 disabled:opacity-60"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-[var(--foreground)]">
                              الخصومات
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              disabled={!canUpdateDayUsage}
                              placeholder="موجب/سالب"
                              value={fig.deductionsAmount !== undefined && fig.deductionsAmount !== null ? fig.deductionsAmount : ""}
                              onChange={(e) => handleFigureChange(p.assignmentId, "deductionsAmount", e.target.value)}
                              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2 text-xs text-[var(--foreground)] outline-none focus:border-purple-600 disabled:opacity-60"
                            />
                          </div>
                        </>
                      )}

                      {showChefzFields && (
                        <>
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-[var(--foreground)]">
                              إجمالي العروض الصالحة
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              disabled={!canUpdateDayUsage}
                              placeholder="مجهول (null)"
                              value={fig.totalValidOffers !== undefined && fig.totalValidOffers !== null ? fig.totalValidOffers : ""}
                              onChange={(e) => handleFigureChange(p.assignmentId, "totalValidOffers", e.target.value)}
                              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2 text-xs text-[var(--foreground)] outline-none focus:border-purple-600 disabled:opacity-60"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-[var(--foreground)]">
                              العروض المرفوضة
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              disabled={!canUpdateDayUsage}
                              placeholder="مجهول (null)"
                              value={fig.declinedOffers !== undefined && fig.declinedOffers !== null ? fig.declinedOffers : ""}
                              onChange={(e) => handleFigureChange(p.assignmentId, "declinedOffers", e.target.value)}
                              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2 text-xs text-[var(--foreground)] outline-none focus:border-purple-600 disabled:opacity-60"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-[var(--foreground)]">
                              العروض الفائتة
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              disabled={!canUpdateDayUsage}
                              placeholder="مجهول (null)"
                              value={fig.missedOffers !== undefined && fig.missedOffers !== null ? fig.missedOffers : ""}
                              onChange={(e) => handleFigureChange(p.assignmentId, "missedOffers", e.target.value)}
                              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2 text-xs text-[var(--foreground)] outline-none focus:border-purple-600 disabled:opacity-60"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reason Input */}
            {canUpdateDayUsage && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[var(--foreground)]">
                  سبب التعديل أو استكمال البيانات <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مثال: استكمال بيانات المندوب المغادر لرفع تقرير الأداء..."
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2.5 text-xs text-[var(--foreground)] outline-none focus:border-purple-600"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                إغلاق
              </Button>
              {canUpdateDayUsage && (
                <Button
                  type="submit"
                  disabled={submitting || participants.length === 0}
                  className="bg-purple-600 text-white hover:bg-purple-700 min-w-[130px] font-bold gap-1.5"
                >
                  {submitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {submitting ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
