// src/components/ninja/evaluation/NinjaEvaluationManageModals.tsx
"use client";

import { localizeDigits } from "./localizeDigits";

import React, { useEffect, useState, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { toast } from "@/components/ui/Toast";
import {
  ninjaEvaluationClient,
  formatNullableMetric,
  formatRiyadhDateTime,
  type PricingType,
  type NinjaEvaluationPolicyResponse,
  type NinjaEvaluationContextResponse,
  type NinjaPricingPeriod,
  type NinjaResponsibilityResponse,
  type NinjaResponsibilityInput,
  type NinjaEvaluationQuery,
  type NinjaSnapshotResponse,
  type NinjaAccountResponse,
} from "@/lib/ninja/api";
import {
  Scale,
  SlidersHorizontal,
  Camera,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lock,
} from "lucide-react";

// ---------------------------------------------------------------------------
// 1. Policy Viewer Modal
// ---------------------------------------------------------------------------

interface NinjaPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: "ar" | "en";
}

export function NinjaPolicyModal({
  isOpen,
  onClose,
  locale,
}: NinjaPolicyModalProps) {
  const isEn = locale === "en";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<NinjaEvaluationPolicyResponse | null>(
    null
  );

  const loadPolicy = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ninjaEvaluationClient.policy();
      setPolicy(res);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(
        e.message ||
          (isEn
            ? "Could not load Ninja evaluation policy."
            : "تعذر تحميل سياسة تقييم نينجا.")
      );
    } finally {
      setLoading(false);
    }
  }, [isEn]);

  useEffect(() => {
    if (isOpen) {
      loadPolicy();
    }
  }, [isOpen, loadPolicy]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEn
          ? "Ninja Suggested Earnings Policy & Contract Rates"
          : "سياسة وجدول أسعار مقترحات أرباح نينجا (Policy)"
      }
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4" dir={isEn ? "ltr" : "rtl"}>
        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-[var(--muted)]">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span>
              {isEn ? "Loading policy..." : "جارٍ تحميل السياسة..."}
            </span>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        )}

        {!loading && policy && (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-slate-50/70 p-3 text-xs dark:bg-slate-900/50">
              <Badge tone="blue">{policy.version}</Badge>
              <span>
                <strong>{isEn ? "Month Basis:" : "أساس الشهر:"}</strong>{" "}
                {policy.monthBasis}
              </span>
              <span>•</span>
              <span>
                <strong>{isEn ? "Full Day Hours:" : "ساعات اليوم الكامل:"}</strong>{" "}
                {localizeDigits(policy.hoursPerFullDay, locale)}h
              </span>
              <span>•</span>
              <span>
                <strong>
                  {isEn ? "Attendance Threshold:" : "حد التأهل للحضور:"}
                </strong>{" "}
                {localizeDigits((policy.attendanceThreshold * 100).toFixed(0), locale)}%
              </span>
              <span>•</span>
              <span>
                <strong>
                  {isEn ? "Attendance Reduction:" : "تخفيض الحضور التقديري:"}
                </strong>{" "}
                {localizeDigits((policy.attendanceReduction * 100).toFixed(0), locale)}%
              </span>
              <span>•</span>
              <span>
                <strong>{isEn ? "Rounding:" : "التقريب:"}</strong>{" "}
                {policy.rounding}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-slate-100 text-[var(--muted)] dark:bg-slate-900">
                    <th className="px-3 py-2 text-start font-bold">
                      {isEn ? "Contract Rate Item" : "البند التعاقدي"}
                    </th>
                    <th className="px-3 py-2 text-start font-bold">
                      BIKE ({isEn ? "Motorcycle" : "دراجة نارية"})
                    </th>
                    <th className="px-3 py-2 text-start font-bold">
                      CAR ({isEn ? "Car" : "سيارة"})
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  <tr>
                    <td className="px-3 py-2 font-bold">
                      {isEn ? "Monthly Target (Orders)" : "الهدف الشهري الكامل (طلب)"}
                    </td>
                    <td className="px-3 py-2 font-bold">{localizeDigits(policy.bike.target, locale)}</td>
                    <td className="px-3 py-2 font-bold">{localizeDigits(policy.car.target, locale)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold">
                      {isEn ? "Monthly Base (SAR)" : "المبلغ الأساسي الشهري (ر.س)"}
                    </td>
                    <td className="px-3 py-2 font-bold">{localizeDigits(policy.bike.base, locale)}</td>
                    <td className="px-3 py-2 font-bold">{localizeDigits(policy.car.base, locale)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold">
                      {isEn
                        ? "Bonus per Extra Order (SAR)"
                        : "مكافأة الطلب الإضافي فوق الهدف (ر.س)"}
                    </td>
                    <td className="px-3 py-2 font-bold">{localizeDigits(policy.bike.bonus, locale)}</td>
                    <td className="px-3 py-2 font-bold">{localizeDigits(policy.car.bonus, locale)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold">
                      {isEn
                        ? "Shortage Band 1 (≤ 10%) per order"
                        : "عجز الشريحة الأولى (≤ 10%) لكل طلب ناقص"}
                    </td>
                    <td className="px-3 py-2 font-bold">{localizeDigits(policy.bike.rate1, locale)}</td>
                    <td className="px-3 py-2 font-bold">{localizeDigits(policy.car.rate1, locale)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold">
                      {isEn
                        ? "Shortage Band 2 (> 10% and ≤ 20%) per order"
                        : "عجز الشريحة الثانية (> 10% إلى 20%) لكل طلب ناقص"}
                    </td>
                    <td className="px-3 py-2 font-bold">{localizeDigits(policy.bike.rate2, locale)}</td>
                    <td className="px-3 py-2 font-bold">{localizeDigits(policy.car.rate2, locale)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold">
                      {isEn
                        ? "Shortage Band 3 (> 20% and ≤ 30%) per order"
                        : "عجز الشريحة الثالثة (> 20% إلى 30%) لكل طلب ناقص"}
                    </td>
                    <td className="px-3 py-2 font-bold">{localizeDigits(policy.bike.rate3, locale)}</td>
                    <td className="px-3 py-2 font-bold">{localizeDigits(policy.car.rate3, locale)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-bold">
                      {isEn
                        ? "Shortage > 30% (Per Completed Order Fallback)"
                        : "عجز يتجاوز 30% (يُحسب لكل طلب مكتمل بدلاً من الأساسي)"}
                    </td>
                    <td className="px-3 py-2 font-bold">{localizeDigits(policy.bike.fallback, locale)}</td>
                    <td className="px-3 py-2 font-bold">{localizeDigits(policy.car.fallback, locale)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {policy.unavailableConditions &&
              policy.unavailableConditions.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                  <div className="font-bold mb-1">
                    {isEn
                      ? "Conditions Unknown in v1 (Not penalized):"
                      : "شروط غير متوفرة في الإصدار الأول (تظل Unknown ولا ينتج عنها خصم مختلق):"}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {policy.unavailableConditions.map((c) => (
                      <Badge key={c} tone="orange">
                        {c}: Unknown
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
          </>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// 2. Account Context & Responsibility Editor Modal (Requires ninja.evaluation.manage for edits)
// ---------------------------------------------------------------------------

interface NinjaAccountEvaluationManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string | null;
  captainId?: string | null;
  year: number;
  month: number;
  initialTab?: "context" | "responsibility";
  canManage: boolean;
  accounts: NinjaAccountResponse[];
  onSelectAccount?: (accountId: string) => void;
  onSaved?: () => void;
  locale: "ar" | "en";
}

export function NinjaAccountEvaluationManageModal({
  isOpen,
  onClose,
  accountId,
  captainId,
  year,
  month,
  initialTab = "context",
  canManage,
  accounts,
  onSelectAccount,
  onSaved,
  locale,
}: NinjaAccountEvaluationManageModalProps) {
  const isEn = locale === "en";
  const [activeTab, setActiveTab] = useState<"context" | "responsibility">(
    initialTab
  );

  // Context state
  const [contextLoading, setContextLoading] = useState(false);
  const [contextSaving, setContextSaving] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [contextData, setContextData] =
    useState<NinjaEvaluationContextResponse | null>(null);
  const [firstDeliveryDate, setFirstDeliveryDate] = useState<string>("");
  const [pricingPeriods, setPricingPeriods] = useState<NinjaPricingPeriod[]>([]);
  const [contextReason, setContextReason] = useState<string>("");
  const [contextReviewedSnapshotId, setContextReviewedSnapshotId] =
    useState<string>("");

  // Responsibility state
  const [respLoading, setRespLoading] = useState(false);
  const [respSaving, setRespSaving] = useState(false);
  const [respError, setRespError] = useState<string | null>(null);
  const [respData, setRespData] = useState<NinjaResponsibilityResponse | null>(
    null
  );
  const [respLines, setRespLines] = useState<NinjaResponsibilityInput[]>([]);
  const [respReason, setRespReason] = useState<string>("");
  const [respReviewedSnapshotId, setRespReviewedSnapshotId] =
    useState<string>("");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadContext = useCallback(async () => {
    if (!accountId) return;
    setContextLoading(true);
    setContextError(null);
    try {
      const res = await ninjaEvaluationClient.context(accountId);
      setContextData(res);
      setFirstDeliveryDate(res.confirmedFirstDeliveryDate || "");
      setPricingPeriods(
        res.pricingPeriods && res.pricingPeriods.length > 0
          ? res.pricingPeriods.map((p) => ({ ...p }))
          : []
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      setContextError(
        e.message ||
          (isEn
            ? "Could not load account evaluation context."
            : "تعذر تحميل سياق تقييم الحساب.")
      );
    } finally {
      setContextLoading(false);
    }
  }, [accountId, isEn]);

  const loadResponsibility = useCallback(async () => {
    if (!accountId) return;
    setRespLoading(true);
    setRespError(null);
    try {
      const res = await ninjaEvaluationClient.responsibility(
        accountId,
        year,
        month
      );
      setRespData(res);
      setRespLines(
        res.lines && res.lines.length > 0
          ? res.lines.map((l) => ({ ...l }))
          : []
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      setRespError(
        e.message ||
          (isEn
            ? "Could not load responsibility schedule."
            : "تعذر تحميل جدول أوزان المسؤولية.")
      );
    } finally {
      setRespLoading(false);
    }
  }, [accountId, year, month, isEn]);

  useEffect(() => {
    if (isOpen && accountId) {
      loadContext();
      loadResponsibility();
    }
  }, [isOpen, accountId, loadContext, loadResponsibility]);

  const handleSaveContext = async () => {
    if (!canManage || !accountId) return;
    if (!contextReason.trim()) {
      setContextError(
        isEn
          ? "Reason is required to save a new context revision."
          : "سبب التعديل مطلوب لحفظ مراجعة جديدة لسياق التسعير."
      );
      return;
    }
    setContextSaving(true);
    setContextError(null);
    try {
      const updated = await ninjaEvaluationClient.setContext(accountId, {
        expectedRevisionId: contextData?.revisionId ?? null,
        confirmedFirstDeliveryDate: firstDeliveryDate.trim() || null,
        pricingPeriods,
        reason: contextReason.trim(),
        reviewedSnapshotId: contextReviewedSnapshotId.trim() || null,
      });
      setContextData(updated);
      setContextReason("");
      toast.success(
        isEn ? "Context Revision Saved" : "تم حفظ سياق التسعير",
        isEn
          ? `Revision #${localizeDigits(updated.revision, locale)} saved.`
          : `تم حفظ المراجعة رقم #${localizeDigits(updated.revision, locale)} بنجاح.`
      );
      onSaved?.();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setContextError(
        e.message ||
          (isEn ? "Failed to save context revision." : "فشل حفظ سياق التسعير.")
      );
    } finally {
      setContextSaving(false);
    }
  };

  const handleSaveResponsibility = async () => {
    if (!canManage || !accountId) return;
    if (!respReason.trim()) {
      setRespError(
        isEn
          ? "Reason is required to save a responsibility schedule revision."
          : "سبب التعديل مطلوب لحفظ مراجعة جدول أوزان المسؤولية."
      );
      return;
    }
    // Validate per-date weight sum = 1
    const byDate = new Map<string, number>();
    for (const line of respLines) {
      const current = byDate.get(line.date) || 0;
      byDate.set(line.date, current + Number(line.weight));
    }
    for (const [d, sum] of byDate.entries()) {
      if (Math.abs(sum - 1) > 1e-6) {
        setRespError(
          isEn
            ? `Weights for date ${d} sum to ${sum.toFixed(4)}. Every specified day's weights must sum to exactly 1.0.`
            : `مجموع أوزان المسؤولية لتاريخ ${d} هو ${sum.toFixed(
                4
              )}؛ يجب أن يساوي مجموع الأوزان لكل يوم محدد 1.0 تماماً.`
        );
        return;
      }
    }

    setRespSaving(true);
    setRespError(null);
    try {
      const updated = await ninjaEvaluationClient.setResponsibility(accountId, {
        year,
        month,
        expectedRevisionId: respData?.revisionId ?? null,
        lines: respLines,
        reason: respReason.trim(),
        reviewedSnapshotId: respReviewedSnapshotId.trim() || null,
      });
      setRespData(updated);
      setRespReason("");
      toast.success(
        isEn ? "Responsibility Schedule Saved" : "تم حفظ أوزان المسؤولية",
        isEn
          ? `Revision #${localizeDigits(updated.revision, locale)} saved.`
          : `تم حفظ المراجعة رقم #${localizeDigits(updated.revision, locale)} بنجاح.`
      );
      onSaved?.();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setRespError(
        e.message ||
          (isEn
            ? "Failed to save responsibility schedule."
            : "فشل حفظ جدول أوزان المسؤولية.")
      );
    } finally {
      setRespSaving(false);
    }
  };

  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEn
          ? `Account Evaluation Context & Responsibility (${
              captainId || accountId?.slice(0, 8) || "Select Account"
            })`
          : `إدارة سياق التسعير وأوزان المسؤولية للحساب (${
              captainId || accountId?.slice(0, 8) || "اختر حساباً"
            })`
      }
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4" dir={isEn ? "ltr" : "rtl"}>
        {/* Account Selector if needed */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-slate-50/70 p-3 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold">
              {isEn ? "Target Ninja Account:" : "حساب نينجا المستهدف:"}
            </span>
            <select
              value={accountId || ""}
              onChange={(e) => onSelectAccount?.(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs font-bold"
            >
              <option value="">
                {isEn ? "-- Select Account --" : "-- اختر الحساب --"}
              </option>
              {accounts.map((acc) => {
                const id = acc.accountId || acc.id || "";
                return (
                  <option key={id} value={id}>
                    {acc.captainId || acc.code}{" "}
                    {(acc.actualRider?.nameAr || acc.actualRiderNameAr) ? `— ${acc.actualRider?.nameAr || acc.actualRiderNameAr}` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("context")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                activeTab === "context"
                  ? "bg-blue-600 text-white"
                  : "border border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              {isEn
                ? "1. Pricing Context & First Delivery"
                : "1. سياق التسعير وتاريخ أول توصيل"}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("responsibility")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                activeTab === "responsibility"
                  ? "bg-blue-600 text-white"
                  : "border border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              {isEn
                ? `2. Responsibility Weights (${localizeDigits(monthPrefix, locale)})`
                : `2. أوزان المسؤولية (${localizeDigits(monthPrefix, locale)})`}
            </button>
          </div>
        </div>

        {!canManage && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <Lock className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              {isEn
                ? "Read-only mode: Modifying evaluation context or responsibility requires 'ninja.evaluation.manage' permission."
                : "وضع القراءة فقط: تعديل سياق التسعير أو جدول المسؤولية يتطلب صلاحية ninja.evaluation.manage."}
            </span>
          </div>
        )}

        {!accountId ? (
          <div className="py-10 text-center text-xs text-[var(--muted)]">
            {isEn
              ? "Please select a Ninja account above to view or edit its context and responsibility schedule."
              : "يرجى اختيار حساب نينجا من القائمة أعلاه لعرض أو تعديل سياق التسعير وأوزان المسؤولية."}
          </div>
        ) : activeTab === "context" ? (
          /* TAB 1: CONTEXT */
          <div className="space-y-4">
            {contextLoading ? (
              <div className="py-8 text-center text-xs text-[var(--muted)]">
                {isEn ? "Loading context..." : "جارٍ تحميل سياق الحساب..."}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                  <Badge tone="blue">
                    {isEn
                      ? `Current Revision: #${contextData?.revision ?? 0}`
                      : `المراجعة الحالية: #${contextData?.revision ?? 0}`}
                  </Badge>
                  {contextData?.revisionId && (
                    <span className="font-mono">
                      Revision ID: {contextData.revisionId}
                    </span>
                  )}
                </div>

                {contextError && (
                  <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                    {contextError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold">
                      {isEn
                        ? "Confirmed First Delivery Date (confirmedFirstDeliveryDate)"
                        : "تاريخ أول توصيل مؤكّد للحساب (confirmedFirstDeliveryDate)"}
                    </label>
                    <DateInput
                locale={locale}
                      value={firstDeliveryDate}
                      onChange={(val) => setFirstDeliveryDate(val)}
                      disabled={!canManage}
                    />
                    <span className="block text-[10px] text-[var(--muted)]">
                      {isEn
                        ? "Never inferred automatically from first upload. Cannot contradict an earlier positive-order source."
                        : "لا يتم استنتاجه تلقائياً من أول ملف مرفوع، ولا يجوز أن يتعارض مع سجل طلبات موجب أقدم."}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold">
                      {isEn
                        ? "Reviewed Frozen Snapshot ID (Optional — if period is frozen)"
                        : "معرف اللقطة المجمّدة المراجَعة (اختياري عند تعديل فترة مجمّدة)"}
                    </label>
                    <Input
                      value={contextReviewedSnapshotId}
                      onChange={(e) =>
                        setContextReviewedSnapshotId(e.target.value)
                      }
                      placeholder={
                        isEn
                          ? "UUID of frozen snapshot if required"
                          : "أدخل معرف اللقطة المجمّدة إن وُجدت"
                      }
                      disabled={!canManage}
                    />
                  </div>
                </div>

                {/* Pricing Periods */}
                <div className="space-y-2 rounded-xl border border-[var(--border)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">
                      {isEn
                        ? "Non-overlapping Pricing Periods (BIKE / CAR)"
                        : "فترات التسعير غير المتداخلة (BIKE / CAR)"}
                    </span>
                    {canManage && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setPricingPeriods((prev) => [
                            ...prev,
                            {
                              from: `${monthPrefix}-01`,
                              to: `${monthPrefix}-28`,
                              pricingType: "BIKE",
                            },
                          ])
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{isEn ? "Add Period" : "إضافة فترة تسعير"}</span>
                      </Button>
                    )}
                  </div>

                  {pricingPeriods.length === 0 ? (
                    <p className="text-xs text-[var(--muted)] py-2">
                      {isEn
                        ? "No dated pricing overrides configured."
                        : "لا توجد فترات تسعير مخصصة مسجلة حالياً."}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {pricingPeriods.map((period, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-1 gap-2 sm:grid-cols-4 items-end rounded-lg bg-slate-50 p-2 dark:bg-slate-900/50"
                        >
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--muted)]">
                              {isEn ? "From Date" : "من تاريخ"}
                            </label>
                            <DateInput
                locale={locale}
                              value={period.from}
                              onChange={(val) =>
                                setPricingPeriods((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, from: val } : item
                                  )
                                )
                              }
                              disabled={!canManage}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--muted)]">
                              {isEn ? "To Date" : "إلى تاريخ"}
                            </label>
                            <DateInput
                locale={locale}
                              value={period.to}
                              onChange={(val) =>
                                setPricingPeriods((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, to: val } : item
                                  )
                                )
                              }
                              disabled={!canManage}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--muted)]">
                              {isEn ? "Pricing Type" : "نوع التسعير"}
                            </label>
                            <select
                              value={period.pricingType}
                              onChange={(e) =>
                                setPricingPeriods((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? {
                                          ...item,
                                          pricingType: e.target
                                            .value as PricingType,
                                        }
                                      : item
                                  )
                                )
                              }
                              disabled={!canManage}
                              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-2.5 py-2 text-xs font-bold"
                            >
                              <option value="BIKE">BIKE (دراجة نارية)</option>
                              <option value="CAR">CAR (سيارة)</option>
                            </select>
                          </div>
                          <div className="flex justify-end">
                            {canManage && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() =>
                                  setPricingPeriods((prev) =>
                                    prev.filter((_, i) => i !== idx)
                                  )
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="space-y-3 border-t border-[var(--border)] pt-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold">
                        {isEn
                          ? "Audit Reason for Context Revision *"
                          : "سبب تعديل سياق التسعير (إلزامي للتدقيق) *"}
                      </label>
                      <Input
                        value={contextReason}
                        onChange={(e) => setContextReason(e.target.value)}
                        placeholder={
                          isEn
                            ? "e.g. Verified first delivery date and pricing type"
                            : "مثال: توثيق تاريخ أول توصيل ونوع المركبة التعاقدي"
                        }
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="primary"
                        onClick={handleSaveContext}
                        loading={contextSaving}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>
                          {isEn
                            ? "Save Context Revision"
                            : "حفظ مراجعة سياق التسعير"}
                        </span>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* TAB 2: RESPONSIBILITY SCHEDULE */
          <div className="space-y-4">
            {respLoading ? (
              <div className="py-8 text-center text-xs text-[var(--muted)]">
                {isEn
                  ? "Loading responsibility schedule..."
                  : "جارٍ تحميل جدول أوزان المسؤولية..."}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
                  <div className="flex items-center gap-2">
                    <Badge tone="blue">
                      {isEn
                        ? `Month: ${localizeDigits(monthPrefix, locale)} | Revision #${
                            respData?.revision ?? 0
                          }`
                        : `الشهر: ${localizeDigits(monthPrefix, locale)} | المراجعة #${
                            respData?.revision ?? 0
                          }`}
                    </Badge>
                    <span>
                      {isEn
                        ? "Sole-holder days default to weight 1.0. Shared days require explicit lines summing to 1.0."
                        : "الأيام ذات المندوب الوحيد تأخذ وزن 1.0 تلقائياً. الأيام المشتركة تتطلب تحديد أوزان صريحة مجموعها 1.0 لكل تاريخ."}
                    </span>
                  </div>
                </div>

                {respError && (
                  <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                    {respError}
                  </div>
                )}

                <div className="space-y-2 rounded-xl border border-[var(--border)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">
                      {isEn
                        ? "Explicit Daily Assignment Weights (0..1)"
                        : "سطور أوزان المسؤولية الصريحة للتكليفات (0..1)"}
                    </span>
                    {canManage && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setRespLines((prev) => [
                            ...prev,
                            {
                              assignmentId: "",
                              date: `${monthPrefix}-01`,
                              weight: 0.5,
                            },
                          ])
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{isEn ? "Add Line" : "إضافة سطر وزن"}</span>
                      </Button>
                    )}
                  </div>

                  {respLines.length === 0 ? (
                    <p className="text-xs text-[var(--muted)] py-2">
                      {isEn
                        ? "No explicit shared-day responsibility lines defined for this month."
                        : "لا توجد سطور مسؤولية مخصصة مسجلة لهذا الشهر."}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {respLines.map((line, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-1 gap-2 sm:grid-cols-4 items-end rounded-lg bg-slate-50 p-2 dark:bg-slate-900/50"
                        >
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--muted)]">
                              {isEn ? "Business Date" : "التاريخ"}
                            </label>
                            <DateInput
                locale={locale}
                              value={line.date}
                              onChange={(val) =>
                                setRespLines((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, date: val } : item
                                  )
                                )
                              }
                              disabled={!canManage}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--muted)]">
                              {isEn ? "Assignment ID (GUID)" : "معرف التكليف (Assignment ID)"}
                            </label>
                            <Input
                              value={line.assignmentId}
                              onChange={(e) =>
                                setRespLines((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? { ...item, assignmentId: e.target.value }
                                      : item
                                  )
                                )
                              }
                              placeholder="GUID"
                              disabled={!canManage}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--muted)]">
                              {isEn ? "Weight (0..1)" : "الوزن (0..1)"}
                            </label>
                            <Input
                              type="number"
                              step="0.05"
                              min="0"
                              max="1"
                              value={String(line.weight)}
                              onChange={(e) =>
                                setRespLines((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? {
                                          ...item,
                                          weight: Number(e.target.value),
                                        }
                                      : item
                                  )
                                )
                              }
                              disabled={!canManage}
                            />
                          </div>
                          <div className="flex justify-end">
                            {canManage && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() =>
                                  setRespLines((prev) =>
                                    prev.filter((_, i) => i !== idx)
                                  )
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="space-y-3 border-t border-[var(--border)] pt-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold">
                          {isEn
                            ? "Audit Reason for Responsibility Revision *"
                            : "سبب تعديل جدول المسؤولية (إلزامي) *"}
                        </label>
                        <Input
                          value={respReason}
                          onChange={(e) => setRespReason(e.target.value)}
                          placeholder={
                            isEn
                              ? "e.g. Reviewed planned handover responsibility"
                              : "مثال: مراجعة أوزان المسؤولية المخططة ليوم التسليم المشترك"
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold">
                          {isEn
                            ? "Reviewed Frozen Snapshot ID (Optional)"
                            : "معرف اللقطة المجمّدة المراجَعة (اختياري)"}
                        </label>
                        <Input
                          value={respReviewedSnapshotId}
                          onChange={(e) =>
                            setRespReviewedSnapshotId(e.target.value)
                          }
                          placeholder="UUID"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="primary"
                        onClick={handleSaveResponsibility}
                        loading={respSaving}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>
                          {isEn
                            ? "Save Responsibility Schedule"
                            : "حفظ جدول أوزان المسؤولية"}
                        </span>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// 3. Evaluation Snapshot Modal (Create & Inspect Immutable Snapshots)
// ---------------------------------------------------------------------------

interface NinjaSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuery: NinjaEvaluationQuery;
  currentInputRevision: string | null;
  canManage: boolean;
  locale: "ar" | "en";
}

export function NinjaSnapshotModal({
  isOpen,
  onClose,
  currentQuery,
  currentInputRevision,
  canManage,
  locale,
}: NinjaSnapshotModalProps) {
  const isEn = locale === "en";
  const [reason, setReason] = useState("");
  const [freeze, setFreeze] = useState(false);
  const [supersedesId, setSupersedesId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [lookupId, setLookupId] = useState("");
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [snapshotResult, setSnapshotResult] =
    useState<NinjaSnapshotResponse | null>(null);

  const handleCreateSnapshot = async () => {
    if (!canManage) return;
    if (!reason.trim()) {
      setCreateError(
        isEn
          ? "Reason is required to capture an evaluation snapshot."
          : "سبب إنشاء اللقطة مطلوب."
      );
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await ninjaEvaluationClient.snapshot({
        query: currentQuery,
        reason: reason.trim(),
        freeze,
        supersedesId: supersedesId.trim() || null,
        expectedInputRevision: currentInputRevision || null,
      });
      setSnapshotResult(res);
      setReason("");
      toast.success(
        isEn ? "Snapshot Created" : "تم حفظ لقطة التقييم",
        isEn ? `Snapshot ID: ${res.id}` : `معرف اللقطة: ${res.id}`
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      setCreateError(
        e.message ||
          (isEn ? "Failed to create snapshot." : "تعذر إنشاء لقطة التقييم.")
      );
    } finally {
      setCreating(false);
    }
  };

  const handleLoadSnapshot = async () => {
    if (!lookupId.trim()) return;
    setLoadingSnapshot(true);
    setCreateError(null);
    try {
      const res = await ninjaEvaluationClient.getSnapshot(lookupId.trim());
      setSnapshotResult(res);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setCreateError(
        e.message ||
          (isEn
            ? "Could not find or access the requested snapshot."
            : "تعذر العثور على اللقطة المطلوبة أو الوصول إليها.")
      );
    } finally {
      setLoadingSnapshot(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEn
          ? "Evaluation Monitoring Snapshots"
          : "لقطات المراجعة والتجميد الرقابي (Evaluation Snapshots)"
      }
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5" dir={isEn ? "ltr" : "rtl"}>
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200">
          {isEn
            ? "Snapshots capture the complete filtered evaluation result immutably. Freezing a snapshot is a monitoring control (not financial approval): subsequent context or responsibility changes affecting that period must reference the frozen snapshot ID."
            : "تحفظ اللقطة كامل نتائج التقييم المفلترة بشكل غير قابل للتعديل. التجميد (Freeze) هو إجراء رقابي للمتابعة (وليس اعتماداً مالياً للصرف)؛ أي تعديل لاحق للسياق أو المسؤولية في فترة مجمّدة يتطلب الإشارة لمعرف اللقطة."}
        </div>

        {/* Lookup Existing Snapshot (Requires ninja.read) */}
        <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
          <h4 className="text-xs font-bold">
            {isEn
              ? "Inspect Saved Snapshot by ID (GET /api/ninja/evaluation/snapshots/{id})"
              : "استعراض لقطة محفوظة بمعرفها"}
          </h4>
          <div className="flex gap-2">
            <Input
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder={isEn ? "Enter Snapshot UUID..." : "أدخل معرف اللقطة (UUID)..."}
            />
            <Button
              variant="secondary"
              onClick={handleLoadSnapshot}
              loading={loadingSnapshot}
            >
              {isEn ? "Load Snapshot" : "عرض اللقطة"}
            </Button>
          </div>
        </div>

        {/* Create New Snapshot (Requires ninja.evaluation.manage) */}
        {canManage && (
          <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
            <h4 className="text-xs font-bold flex items-center gap-2">
              <Camera className="h-4 w-4 text-blue-600" />
              <span>
                {isEn
                  ? "Capture New Snapshot of Current Filtered Report"
                  : "التقاط وحفظ لقطة جديدة لكامل نتائج الفلتر الحالي"}
              </span>
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-xs font-bold">
                  {isEn ? "Reason *" : "السبب *"}
                </label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    isEn
                      ? "e.g. Supervisor monitoring review"
                      : "مثال: مراجعة إشرافية لنهاية الفترة"
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold">
                  {isEn
                    ? "Supersedes Snapshot ID (Optional)"
                    : "يحل محل اللقطة السابقة رقم (اختياري)"}
                </label>
                <Input
                  value={supersedesId}
                  onChange={(e) => setSupersedesId(e.target.value)}
                  placeholder="UUID"
                />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={freeze}
                onChange={(e) => setFreeze(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span>
                {isEn
                  ? "Freeze monitoring period (freeze = true)"
                  : "تجميد الفترة الرقابية (freeze = true)"}
              </span>
            </label>
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={handleCreateSnapshot}
                loading={creating}
              >
                <Camera className="h-4 w-4" />
                <span>{isEn ? "Save Snapshot" : "حفظ اللقطة"}</span>
              </Button>
            </div>
          </div>
        )}

        {createError && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
            {createError}
          </div>
        )}

        {snapshotResult && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 text-xs space-y-2 dark:border-emerald-800 dark:bg-emerald-950/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-sm">
                {isEn ? "Snapshot Details" : "تفاصيل اللقطة المحفوظة"}
              </span>
              <Badge tone={snapshotResult.frozen ? "orange" : "green"}>
                {snapshotResult.frozen
                  ? isEn
                    ? "Frozen Monitoring Snapshot"
                    : "لقطة مجمّدة"
                  : isEn
                  ? "Standard Snapshot"
                  : "لقطة عادية"}
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <strong>ID:</strong>{" "}
                <code className="font-mono">{snapshotResult.id}</code>
              </div>
              <div>
                <strong>{isEn ? "Created At:" : "تاريخ الإنشاء:"}</strong>{" "}
                {formatRiyadhDateTime(snapshotResult.createdAtUtc, locale)}
              </div>
              <div>
                <strong>{isEn ? "Reason:" : "السبب:"}</strong>{" "}
                {snapshotResult.reason}
              </div>
              <div>
                <strong>{isEn ? "Rows Captured:" : "عدد الصفوف المحفوظة:"}</strong>{" "}
                {snapshotResult.report?.summary?.totalRows ??
                  snapshotResult.report?.items?.length ??
                  0}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
