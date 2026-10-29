// src/components/shared/AssignmentContextSection.tsx
"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  getPlatformAssignmentContext,
  type PlatformAssignmentContext,
  type PlatformDayContribution,
  type PreviousDayUsageInput,
  type PlatformAccountDayUsageInput,
} from "@/lib/platforms/api";
import { AlertTriangle, Clock, RefreshCw, UserCheck, AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

export interface AssignmentContextSectionRef {
  reloadContext: () => Promise<void>;
  getPreviousDayUsages: () => PreviousDayUsageInput[] | undefined;
  isValid: boolean;
}

export interface AssignmentContextChangePayload {
  isValid: boolean;
  requiresPreviousUsage: boolean;
  previousDayUsages?: PreviousDayUsageInput[] | null;
  contributionsCount: number;
  loading: boolean;
  error?: string | null;
}

interface AssignmentContextSectionProps {
  accountId?: string | null;
  businessDate?: string | null; // Riyadh YYYY-MM-DD
  riderProfileId?: string | null;
  platform?: "generic" | "ninja" | "jahez" | "chefz";
  isEn?: boolean;
  onChange?: (payload: AssignmentContextChangePayload) => void;
  className?: string;
}

export const AssignmentContextSection = forwardRef<
  AssignmentContextSectionRef,
  AssignmentContextSectionProps
>(function AssignmentContextSection(
  {
    accountId,
    businessDate,
    riderProfileId,
    platform = "generic",
    isEn = false,
    onChange,
    className = "",
  },
  ref
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<PlatformAssignmentContext | null>(null);

  // Preserve user-edited figures across reloads and 409 retries
  // Key: assignmentIds.join(",") -> partial figures
  const [userFigures, setUserFigures] = useState<
    Record<string, Partial<PlatformAccountDayUsageInput>>
  >({});
  const [hasUserEdited, setHasUserEdited] = useState(false);

  const fetchRequestId = useRef(0);

  const getContribKey = (c: PlatformDayContribution) => c.assignmentIds.join(",");

  const loadContext = useCallback(async () => {
    if (!accountId || !businessDate || !riderProfileId) {
      setContext(null);
      setError(null);
      setLoading(false);
      return;
    }

    const currentReq = ++fetchRequestId.current;
    setLoading(true);
    setError(null);

    try {
      const res = await getPlatformAssignmentContext(
        accountId,
        businessDate,
        riderProfileId
      );
      if (currentReq === fetchRequestId.current) {
        setContext(res);
      }
    } catch (err: unknown) {
      if (currentReq === fetchRequestId.current) {
        console.warn("Assignment context fetch failed:", err);
        const e = err as { status?: number; message?: string; details?: { detail?: string } };
        // If 404 or backend route not ready yet, do not block the assignment form entirely
        if (e.status === 404) {
          setContext({
            accountId,
            businessDate,
            riderProfileId,
            requiresPreviousUsage: false,
            contributions: [],
          });
        } else {
          setError(
            e.details?.detail ||
              e.message ||
              (isEn ? "Could not load prior day assignment context" : "تعذر جلب سياق استخدام اليوم المشترك")
          );
        }
      }
    } finally {
      if (currentReq === fetchRequestId.current) {
        setLoading(false);
      }
    }
  }, [accountId, businessDate, riderProfileId, isEn]);

  // Refetch context whenever accountId, businessDate, or riderProfileId changes
  useEffect(() => {
    loadContext();
  }, [loadContext]);

  // Compute validation and build payload
  const computePayloadAndValidity = useCallback(() => {
    if (!context || !context.contributions || context.contributions.length === 0) {
      return {
        isValid: true,
        requiresPreviousUsage: false,
        previousDayUsages: undefined,
        contributionsCount: 0,
      };
    }

    let allRequiredValid = true;
    let anyCompletedOrEdited = hasUserEdited || context.requiresPreviousUsage;

    const previousDayUsages: PreviousDayUsageInput[] = [];

    for (const c of context.contributions) {
      const key = getContribKey(c);
      const userEdit = userFigures[key] || {};

      // Determine effective orders count
      const effectiveOrders =
        userEdit.ordersCount !== undefined ? userEdit.ordersCount : c.figures.ordersCount;

      const isOrdersMissing = effectiveOrders === null || effectiveOrders === undefined;

      // If requiresPreviousUsage is true, missing orders count is required before submission!
      // A confirmed zero (0) is valid; blank and null mean unknown.
      if (context.requiresPreviousUsage && isOrdersMissing) {
        allRequiredValid = false;
      }

      // Merge figures preserving every previously returned figure. Do NOT treat missing optional field as zero.
      const mergedFigures: PlatformAccountDayUsageInput = {
        ordersCount: effectiveOrders ?? null,
        workingHours:
          userEdit.workingHours !== undefined
            ? userEdit.workingHours
            : c.figures.workingHours ?? null,
        collectedAmount:
          userEdit.collectedAmount !== undefined
            ? userEdit.collectedAmount
            : c.figures.collectedAmount ?? null,
        deductionsAmount:
          userEdit.deductionsAmount !== undefined
            ? userEdit.deductionsAmount
            : c.figures.deductionsAmount ?? null,
        totalValidOffers:
          userEdit.totalValidOffers !== undefined
            ? userEdit.totalValidOffers
            : c.figures.totalValidOffers ?? null,
        declinedOffers:
          userEdit.declinedOffers !== undefined
            ? userEdit.declinedOffers
            : c.figures.declinedOffers ?? null,
        missedOffers:
          userEdit.missedOffers !== undefined
            ? userEdit.missedOffers
            : c.figures.missedOffers ?? null,
      };

      previousDayUsages.push({
        assignmentIds: [...c.assignmentIds],
        figures: mergedFigures,
        rowVersion: c.rowVersion,
        usageRowVersions: { ...c.usageRowVersions },
      });
    }

    // Per contract: If all required figures are already saved and user did not edit any figures, omit the array.
    const finalPayload =
      context.requiresPreviousUsage || hasUserEdited ? previousDayUsages : undefined;

    return {
      isValid: allRequiredValid,
      requiresPreviousUsage: context.requiresPreviousUsage,
      previousDayUsages: finalPayload,
      contributionsCount: context.contributions.length,
    };
  }, [context, userFigures, hasUserEdited]);

  // Expose imperative methods to parent via ref (for reloading after 409 and accessing payload)
  useImperativeHandle(
    ref,
    () => ({
      reloadContext: loadContext,
      getPreviousDayUsages: () => computePayloadAndValidity().previousDayUsages,
      isValid: computePayloadAndValidity().isValid,
    }),
    [loadContext, computePayloadAndValidity]
  );

  // Notify parent of state changes
  useEffect(() => {
    const computed = computePayloadAndValidity();
    onChange?.({
      ...computed,
      loading,
      error,
    });
  }, [computePayloadAndValidity, loading, error, onChange]);

  const handleFieldChange = (
    key: string,
    field: keyof PlatformAccountDayUsageInput,
    rawVal: string
  ) => {
    setHasUserEdited(true);
    let parsed: number | null = null;
    const trimmed = rawVal.trim();
    if (trimmed !== "") {
      const num = Number(trimmed);
      if (!Number.isNaN(num)) {
        parsed = num;
      }
    }

    setUserFigures((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [field]: parsed,
      },
    }));
  };

  if (!accountId || !businessDate || !riderProfileId) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border p-4 space-y-3 transition-colors ${
        context?.requiresPreviousUsage
          ? "border-amber-300 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20"
          : "border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/30"
      } ${className}`}
      dir={isEn ? "ltr" : "rtl"}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
            {isEn
              ? "Same-Day Assignment Context & Prior Usage"
              : "سياق عهدات اليوم المشترك والمندوبون السابقون"}
          </h4>
        </div>
        <button
          type="button"
          onClick={loadContext}
          disabled={loading}
          className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-medium"
          title={isEn ? "Refresh context" : "إعادة فحص السياق"}
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          <span>{isEn ? "Refresh" : "تحديث السياق"}</span>
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-600" />
          <span>{isEn ? "Checking same-day assignments..." : "جارٍ فحص عهدات اليوم والمندوبين السابقين..."}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-2.5 text-xs text-rose-800 dark:text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <div>
            <p className="font-bold">{isEn ? "Context error" : "تنبيه سياق الاستخدام"}</p>
            <p className="text-[11px]">{error}</p>
          </div>
        </div>
      )}

      {context && context.contributions.length === 0 && !loading && (
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 py-1">
          <Info className="h-3.5 w-3.5 text-emerald-600" />
          <span>
            {isEn
              ? "No prior riders on this effective date. No day-split required."
              : "لا توجد عهدات سابقة لمندوب آخر في هذا اليوم. لا يلزم فصل يوم."}
          </span>
        </div>
      )}

      {context && context.contributions.length > 0 && (
        <div className="space-y-3">
          {context.requiresPreviousUsage && (
            <div className="rounded-xl border border-amber-300 bg-amber-100/70 dark:border-amber-900/80 dark:bg-amber-950/60 p-2.5 text-xs text-amber-950 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  {isEn
                    ? "Prior usage figures required before assignment"
                    : "يلزم استكمال إنتاجية المندوب السابق قبل إتمام التعيين"}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {isEn
                  ? "OrdersCount is required. A confirmed 0 is valid; blank means unknown. Other fields are optional."
                  : "عدد الطلبات (OrdersCount) مطلوب للمندوب السابق قبل التعيين. الصفر (0) مدخل صحيح ومؤكد؛ بينما الحقل الفارغ يعني غير معروف."}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {context.contributions.map((c, idx) => {
              const key = getContribKey(c);
              const userEdit = userFigures[key] || {};

              const effectiveOrders =
                userEdit.ordersCount !== undefined ? userEdit.ordersCount : c.figures.ordersCount;
              const isOrdersMissing = effectiveOrders === null || effectiveOrders === undefined;
              const ordersInputValue =
                effectiveOrders !== null && effectiveOrders !== undefined ? String(effectiveOrders) : "";

              const effectiveHours =
                userEdit.workingHours !== undefined ? userEdit.workingHours : c.figures.workingHours;
              const hoursInputValue =
                effectiveHours !== null && effectiveHours !== undefined ? String(effectiveHours) : "";

              const effectiveCash =
                userEdit.collectedAmount !== undefined ? userEdit.collectedAmount : c.figures.collectedAmount;
              const cashInputValue =
                effectiveCash !== null && effectiveCash !== undefined ? String(effectiveCash) : "";

              const effectiveDeductions =
                userEdit.deductionsAmount !== undefined ? userEdit.deductionsAmount : c.figures.deductionsAmount;
              const deductionsInputValue =
                effectiveDeductions !== null && effectiveDeductions !== undefined
                  ? String(effectiveDeductions)
                  : "";

              const effectiveOffers =
                userEdit.totalValidOffers !== undefined ? userEdit.totalValidOffers : c.figures.totalValidOffers;
              const offersInputValue =
                effectiveOffers !== null && effectiveOffers !== undefined ? String(effectiveOffers) : "";

              const effectiveDeclined =
                userEdit.declinedOffers !== undefined ? userEdit.declinedOffers : c.figures.declinedOffers;
              const declinedInputValue =
                effectiveDeclined !== null && effectiveDeclined !== undefined ? String(effectiveDeclined) : "";

              const effectiveMissed =
                userEdit.missedOffers !== undefined ? userEdit.missedOffers : c.figures.missedOffers;
              const missedInputValue =
                effectiveMissed !== null && effectiveMissed !== undefined ? String(effectiveMissed) : "";

              return (
                <div
                  key={key || idx}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs space-y-2.5 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-slate-500" />
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {c.riderNameAr || (isEn ? "Prior Rider" : "المندوب السابق")}
                      </span>
                      {c.assignmentIds.length > 1 && (
                        <Badge tone="blue" className="text-[10px]">
                          {isEn
                            ? `${c.assignmentIds.length} consecutive periods combined`
                            : `مجمعة من ${c.assignmentIds.length} فترات متتالية`}
                        </Badge>
                      )}
                    </div>
                    {c.missingRequiredFields && c.missingRequiredFields.length > 0 && (
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        {isEn ? "Missing required: " : "ناقص مطلوب: "}
                        {c.missingRequiredFields.join(", ")}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Orders Count (Required for prior riders when requiresPreviousUsage) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {isEn ? "Orders Count" : "عدد الطلبات (Orders)"}
                        {context.requiresPreviousUsage && <span className="text-red-500"> *</span>}
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={ordersInputValue}
                        onChange={(e) => handleFieldChange(key, "ordersCount", e.target.value)}
                        placeholder={isEn ? "e.g. 0 or 15" : "أدخل عدد الطلبات (الصفر مقبول)..."}
                        className={`font-mono text-xs ${
                          context.requiresPreviousUsage && isOrdersMissing
                            ? "border-amber-400 bg-amber-50/50 dark:border-amber-800 focus:border-amber-600"
                            : ""
                        }`}
                      />
                      {context.requiresPreviousUsage && isOrdersMissing && (
                        <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
                          {isEn ? "Required (0 is valid)" : "مطلوب (الصفر 0 مؤكد ومقبول)"}
                        </span>
                      )}
                    </div>

                    {/* Ninja Fields: Working Hours, Cash, Deductions */}
                    {platform === "ninja" && (
                      <>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {isEn ? "Working Hours" : "ساعات العمل (Hours)"}
                            <span className="text-slate-400 font-normal"> (اختياري)</span>
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            value={hoursInputValue}
                            onChange={(e) => handleFieldChange(key, "workingHours", e.target.value)}
                            placeholder="ساعات العمل..."
                            className="font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {isEn ? "Collected Cash" : "المبالغ المحصلة (Cash)"}
                            <span className="text-slate-400 font-normal"> (اختياري)</span>
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={cashInputValue}
                            onChange={(e) => handleFieldChange(key, "collectedAmount", e.target.value)}
                            placeholder="المبلغ المحصل..."
                            className="font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {isEn ? "Deductions" : "الاستقطاعات (Deductions)"}
                            <span className="text-slate-400 font-normal"> (اختياري)</span>
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={deductionsInputValue}
                            onChange={(e) => handleFieldChange(key, "deductionsAmount", e.target.value)}
                            placeholder="الاستقطاعات..."
                            className="font-mono text-xs"
                          />
                        </div>
                      </>
                    )}

                    {/* Chefz Fields: Valid Offers, Declined, Missed */}
                    {platform === "chefz" && (
                      <>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {isEn ? "Valid Offers" : "إجمالي العروض الصالحة"}
                            <span className="text-slate-400 font-normal"> (اختياري)</span>
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={offersInputValue}
                            onChange={(e) => handleFieldChange(key, "totalValidOffers", e.target.value)}
                            placeholder="العروض الصالحة..."
                            className="font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {isEn ? "Declined Offers" : "العروض المرفوضة"}
                            <span className="text-slate-400 font-normal"> (اختياري)</span>
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={declinedInputValue}
                            onChange={(e) => handleFieldChange(key, "declinedOffers", e.target.value)}
                            placeholder="المرفوضة..."
                            className="font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {isEn ? "Missed Offers" : "العروض الفائتة"}
                            <span className="text-slate-400 font-normal"> (اختياري)</span>
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={missedInputValue}
                            onChange={(e) => handleFieldChange(key, "missedOffers", e.target.value)}
                            placeholder="الفائتة..."
                            className="font-mono text-xs"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
