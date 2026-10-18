// src/components/jahez/CorrectCommissionStartModal.tsx
"use client";

import { useEffect, useState, useId } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import {
  Fund,
  Direction,
  Purpose,
  OperationMode,
  OperationStatus,
  type Operation,
  type Movement,
  type OperationCommissionStartUpdate,
} from "@/lib/jahez/types";
import {
  getJahezOperation,
  updateCommissionStart,
  generateIdempotencyKey,
  getRiyadhTodayDate,
} from "@/lib/jahez/api";
import {
  Calendar,
  CalendarCheck,
  AlertTriangle,
  Lock,
  RefreshCw,
  Coins,
  CreditCard,
  Info,
  UserCheck,
  CheckCircle2,
  Clock,
} from "lucide-react";

export interface CorrectCommissionStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement: Movement | null;
  operationId?: string | null;
  canSettle?: boolean;
  canApproveAdjustment?: boolean;
  canReceive?: boolean;
  canDisburse?: boolean;
  onSuccess?: (updatedOperation: Operation) => void;
}

export function CorrectCommissionStartModal(props: CorrectCommissionStartModalProps) {
  if (!props.isOpen) return null;
  return (
    <CorrectCommissionStartDialogBody
      {...props}
      key={props.movement?.id || props.operationId || "dialog-body"}
    />
  );
}

function CorrectCommissionStartDialogBody({
  isOpen,
  onClose,
  movement,
  operationId: propOperationId,
  onSuccess,
}: CorrectCommissionStartModalProps) {
  const actualOperationId = propOperationId || movement?.operationId || null;

  // Operation loading state
  const [operation, setOperation] = useState<Operation | null>(null);
  const [loadingOperation, setLoadingOperation] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form states initialized immediately from movement
  const [startDate, setStartDate] = useState<string>(() => {
    return movement?.startDate || movement?.endDate || getRiyadhTodayDate();
  });
  const [reason, setReason] = useState<string>("تصحيح تاريخ بداية احتساب عمولة التصفية");
  const [selectedFund, setSelectedFund] = useState<Fund>(() => {
    return movement?.fund ?? Fund.Cashbox;
  });
  const [paymentReference, setPaymentReference] = useState<string>(() => {
    return movement?.reference || "";
  });
  const [isMoneyRouteCustomized, setIsMoneyRouteCustomized] = useState<boolean>(false);

  // Submission & Retry states
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [requiresReload, setRequiresReload] = useState(false);
  const [activeCommandKey, setActiveCommandKey] = useState<string | null>(null);
  const [lastSubmittedPayload, setLastSubmittedPayload] = useState<string | null>(null);

  // Handover lock check
  const isLockedByHandover = Boolean(
    movement?.cashboxHandoverId || movement?.isHandedToAccountant,
  );

  // Background lookup for latest operation version
  useEffect(() => {
    let isCancelled = false;
    if (!actualOperationId) return;

    async function fetchOp() {
      setLoadingOperation(true);
      setLoadError(null);
      try {
        const op = await getJahezOperation(actualOperationId!, {
          handoverId: movement?.handoverId,
          riderProfileId: movement?.riderProfileId,
        });
        if (!isCancelled && op) {
          setOperation(op);
          if (op.commissionStartDate) {
            setStartDate(op.commissionStartDate);
          }
          if (op.fund) {
            setSelectedFund(op.fund);
          }
          if (op.paymentReference) {
            setPaymentReference(op.paymentReference);
          }
        }
      } catch (error: unknown) {
        if (!isCancelled) {
          setLoadError(error instanceof Error ? error.message : "تعذر تحميل بيانات العملية الحالية.");
        }
      } finally {
        if (!isCancelled) {
          setLoadingOperation(false);
        }
      }
    }

    fetchOp();
    return () => {
      isCancelled = true;
    };
  }, [actualOperationId, movement?.handoverId, movement?.riderProfileId]);

  // Derived values
  const effectiveEndDate = operation?.throughDate || movement?.endDate || "-";
  const effectiveNet = operation?.net ?? movement?.net ?? null;
  const effectiveCommission = operation?.commission ?? movement?.commission ?? null;
  const effectiveCalculatedCommission =
    operation?.calculatedCommission ?? movement?.calculatedCommission ?? null;

  // State support check
  const isOperationStateSupported = operation
    ? (operation.status === OperationStatus.Ready ||
        operation.status === OperationStatus.Executed) &&
      operation.purpose === Purpose.Settlement &&
      (operation.mode === OperationMode.Settle ||
        operation.mode === OperationMode.SettleAndWithdraw) &&
      operation.transferToRider === false
    : true;

  let stateUnsupportedReason: string | null = null;
  if (operation) {
    if (operation.status === OperationStatus.UnderReview) {
      stateUnsupportedReason =
        "العملية قيد مراجعة واعتماد حالياً. يجب إكمال المراجعة الحالية أولاً قبل تصحيح بداية احتساب العمولة.";
    } else if (
      operation.status !== OperationStatus.Ready &&
      operation.status !== OperationStatus.Executed
    ) {
      stateUnsupportedReason = `حالة العملية (${operation.status}) لا تدعم تصحيح بداية العمولة. يدعم الإجراء العمليات الجاهزة والمنفذة فقط.`;
    } else if (operation.purpose !== Purpose.Settlement) {
      stateUnsupportedReason =
        "يدعم الإجراء عمليات التصفية فقط (purpose = Settlement).";
    } else if (
      operation.mode !== OperationMode.Settle &&
      operation.mode !== OperationMode.SettleAndWithdraw
    ) {
      stateUnsupportedReason =
        "عمليات السحب فقط تستخدم مسار العمل الخاص بها ولا تقبل تعديل بداية العمولة.";
    } else if (operation.transferToRider) {
      stateUnsupportedReason =
        "العملية تم تحويل مستحقاتها للمندوب وتتبع مسار تسوية الديون المحولة.";
    }
  }

  // ----------------------------------------------------------------------
  // Validation
  // ----------------------------------------------------------------------
  const trimmedReason = reason.trim();
  const trimmedRef = paymentReference.trim();

  const isStartDateValid = Boolean(startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate));
  const isDateOrderValid =
    effectiveEndDate && effectiveEndDate !== "-"
      ? startDate <= effectiveEndDate
      : true;

  const isReasonValid = trimmedReason.length > 0 && trimmedReason.length <= 2000;
  const isRefValid = trimmedRef.length <= 500;

  // Money route compatibility check
  let routeValidationError: string | null = null;
  if (isMoneyRouteCustomized) {
    if (selectedFund === Fund.PetroApp && movement?.direction === Direction.Disbursement) {
      routeValidationError = "محفظة بترو آب لا تدعم الصرف (Disbursement). يرجى اختيار الخزنة أو الحساب البنكي.";
    } else if (selectedFund === Fund.Bank && movement?.direction === Direction.Receipt) {
      routeValidationError = "الحساب البنكي لا يدعم القبض المباشر (Receipt). يرجى اختيار الخزنة أو بترو آب.";
    }
  }

  const canSubmit =
    !isLockedByHandover &&
    isOperationStateSupported &&
    !submitting &&
    !requiresReload &&
    isStartDateValid &&
    isDateOrderValid &&
    isReasonValid &&
    isRefValid &&
    !routeValidationError;

  // ----------------------------------------------------------------------
  // Submit Handler
  // ----------------------------------------------------------------------
  const handleSubmit = async () => {
    if (!actualOperationId) return;

    if (isLockedByHandover) {
      toast.error("الحركة مشمولة في تسليم محاسب محمي ولا يمكن تعديلها حالياً.");
      return;
    }

    if (!isStartDateValid) {
      toast.error("يرجى إدخال تاريخ بداية احتساب صالح بصيغة YYYY-MM-DD.");
      return;
    }

    if (!isDateOrderValid) {
      toast.error(
        `تاريخ بداية الاحتساب (${startDate}) يجب أن يكون في أو قبل تاريخ نهاية الاحتساب (${effectiveEndDate}).`,
      );
      return;
    }

    if (!isReasonValid) {
      toast.error("سبب التصحيح مطلوب ويجب ألا يتجاوز 2000 حرف.");
      return;
    }

    if (routeValidationError) {
      toast.error(routeValidationError);
      return;
    }

    const latestRowVersion =
      operation?.rowVersion || movement?.operationRowVersion || "";

    const payload: OperationCommissionStartUpdate = {
      startDate,
      reason: trimmedReason,
      rowVersion: latestRowVersion,
      ...(isMoneyRouteCustomized ? { fund: selectedFund } : {}),
      ...(isMoneyRouteCustomized && trimmedRef ? { paymentReference: trimmedRef } : {}),
    };

    const payloadKey = JSON.stringify(payload);

    // Concurrency / Network Retry: Retain key if payload unchanged, generate new if changed
    let keyToSend = activeCommandKey;
    if (!keyToSend || payloadKey !== lastSubmittedPayload) {
      keyToSend =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : generateIdempotencyKey("comm-start");
      setActiveCommandKey(keyToSend);
      setLastSubmittedPayload(payloadKey);
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const updatedOp = await updateCommissionStart(
        actualOperationId,
        payload,
        keyToSend,
        {
          suppressErrorToast: true,
        },
      );

      toast.success("تم تصحيح بداية احتساب عمولة التصفية بنجاح");
      onSuccess?.(updatedOp);
      onClose();
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : "فشل تصحيح بداية احتساب العمولة";

      const is409 =
        errMsg.includes("409") ||
        errMsg.includes("Conflict") ||
        errMsg.includes("تعارض") ||
        errMsg.includes("نسخة") ||
        errMsg.includes("handover") ||
        errMsg.includes("تسليم");

      const is403 =
        errMsg.includes("403") ||
        errMsg.includes("صلاحية") ||
        errMsg.includes("Forbidden");

      const is404 =
        errMsg.includes("404") ||
        errMsg.includes("Not Found") ||
        errMsg.includes("غير موجودة");

      if (is409) {
        setRequiresReload(true);
        setSubmitError(
          "حدث تعارض في النسخة (409) أو أن الحركة مشمولة في تسليم محاسب معلق/معتمد، أو أن بيانات الأرباح غير مكتملة دون حفظ أي تغييرات جزئية. يرجى إعادة تحميل بيانات العملية والمحاولة مجدداً.",
        );
      } else if (is403) {
        setSubmitError(
          "ليس لديك الصلاحيات الكافية (403): يتطلب الإجراء توفر الصلاحيات الأربع كاملة (jahez.settle, jahez.requests.adjustment.approve, jahez.money.receive, jahez.money.disburse).",
        );
      } else if (is404) {
        setSubmitError("لم يتم العثور على العملية في النظام (404).");
      } else {
        setSubmitError(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fundSelectId = useId();
  const paymentRefId = useId();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تصحيح بداية احتساب عمولة التصفية"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 text-xs" dir="rtl">
        {/* Context Information Card */}
        <div className="rounded-2xl border border-gray-200 bg-gradient-to-l from-gray-50 to-white p-3.5 dark:border-gray-800 dark:bg-gradient-to-l dark:from-gray-800/80 dark:to-gray-900 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-gray-100">
              <CalendarCheck className="h-4 w-4 text-emerald-600" />
              <span>بيانات حركة التصفية والحساب</span>
            </div>
            {movement?.platformAccountId && (
              <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
                حساب #{movement.platformAccountId}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            {/* Rider Info */}
            <div>
              <span className="text-gray-400 block mb-0.5">المندوب الفعلي / صاحب الحساب:</span>
              <div className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                <UserCheck className="h-3 w-3 text-indigo-500 shrink-0" />
                <span className="truncate">
                  {movement?.userRider?.nameAr ||
                    movement?.ownerRider?.nameAr ||
                    movement?.riderProfileId ||
                    "-"}
                </span>
              </div>
            </div>

            {/* Movement Fund & Amount */}
            <div>
              <span className="text-gray-400 block mb-0.5">الحركة المالية المسجلة:</span>
              <div className="font-mono font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>{movement ? `${movement.amount.toFixed(2)} ر.س` : "-"}</span>
                {movement && (
                  <Badge tone={movement.direction === Direction.Receipt ? "green" : "red"}>
                    {movement.direction === Direction.Receipt ? "قبض" : "صرف"}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Handover Protected Warning */}
        {isLockedByHandover && (
          <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <Lock className="h-4 w-4 text-amber-600 shrink-0" />
              <span>الحركة مشمولة في تسليم محاسب ومحمية من التعديل</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
              وفق الضوابط المالية: الحركات المشمولة في تسليم محاسب (معلق أو معتمد) تكون محمية من التعديل. يمكن إلغاء التسليم المعلق عبر تبويب «تسليمات المحاسب»، ثم تصحيح بداية احتساب العمولة وإعادة تقديم التسليم.
            </p>
          </div>
        )}

        {/* Unsupported State Warning */}
        {stateUnsupportedReason && (
          <div className="rounded-xl border border-rose-300 bg-rose-50/80 p-3 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>حالة العملية غير مدعومة للتصحيح</span>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-800 dark:text-rose-300">
              {stateUnsupportedReason}
            </p>
          </div>
        )}

        {/* Load Error State */}
        {loadError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200 text-[11px]">
            <span>تنبيه: {loadError} (تم استخدام القيم المحفوظة في حركة الصندوق).</span>
          </div>
        )}

        {/* Submit Error with Reload on 409 */}
        {submitError && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200 space-y-2">
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{submitError}</span>
            </div>
            {requiresReload && actualOperationId && (
              <div className="pt-1 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => {
                    setRequiresReload(false);
                    setSubmitError(null);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-7 text-xs gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  إعادة المحاولة
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Main Form Fields */}
        <div className="space-y-3.5">
          {/* Controls Table: بداية الاحتساب (Editable), نهاية الاحتساب (Read-only), صافي جاهز (Read-only) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* بداية احتساب العمولة (Editable) */}
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/40 p-2.5 dark:border-emerald-800 dark:bg-emerald-950/20">
              <label className="block font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                بداية احتساب العمولة *
              </label>
              <Input
                type="date"
                value={startDate}
                max={effectiveEndDate !== "-" ? effectiveEndDate : undefined}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setSubmitError(null);
                  setRequiresReload(false);
                }}
                disabled={submitting || isLockedByHandover || !isOperationStateSupported}
                className="font-mono text-xs font-bold bg-white dark:bg-gray-900"
              />
              <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-1">
                تاريخ شامل (معدل)
              </span>
            </div>

            {/* نهاية احتساب العمولة (Read-only) */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-2.5 dark:border-gray-800 dark:bg-gray-800/40">
              <span className="block font-bold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                نهاية احتساب العمولة
              </span>
              <div className="h-9 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-100 text-gray-700 font-mono font-bold text-xs flex items-center dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 cursor-not-allowed">
                {effectiveEndDate}
              </div>
              <span className="text-[10px] text-gray-400 block mt-1">
                تاريخ ثابت غير قابل للتعديل
              </span>
            </div>

            {/* صافي جاهز (Read-only) */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-2.5 dark:border-gray-800 dark:bg-gray-800/40">
              <span className="block font-bold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 text-gray-400" />
                صافي جاهز
              </span>
              <div className="h-9 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-100 text-gray-900 font-mono font-bold text-xs flex items-center dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 cursor-not-allowed">
                {effectiveNet != null ? `${Number(effectiveNet).toFixed(2)} ر.س` : "-"}
              </div>
              <span className="text-[10px] text-gray-400 block mt-1">
                صافي التصفية (محفوظ)
              </span>
            </div>
          </div>

          {/* Current Saved Commission Card */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-800/30">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              <span>عمولة الشركة المعتمدة الحالية:</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {effectiveCommission != null ? `${Number(effectiveCommission).toFixed(2)} ر.س` : "-"}
              </span>
            </div>
            {effectiveCalculatedCommission != null && (
              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span>العمولة المحسوبة الأصلية:</span>
                <span className="font-mono">
                  {Number(effectiveCalculatedCommission).toFixed(2)} ر.س
                </span>
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-2 leading-relaxed flex items-center gap-1 border-t border-gray-200 dark:border-gray-700/60 pt-1.5">
              <Info className="h-3 w-3 shrink-0 text-blue-500" />
              يقوم الخادم بإعادة احتساب عمولة الشركة المعتمدة تلقائياً بناءً على التاريخ الجديد وسياسة العمولة المعتمدة وسجلات الأرباح، ويتم تحديث حركة الصندوق والمتبقي تلقائياً.
            </p>
          </div>

          {/* سبب التصحيح (Required Textarea) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-gray-700 dark:text-gray-300">
                سبب التصحيح *
              </label>
              <span
                className={`text-[10px] font-mono ${
                  trimmedReason.length > 2000
                    ? "text-rose-600 font-bold"
                    : "text-gray-400"
                }`}
              >
                {trimmedReason.length}/2000 حرف
              </span>
            </div>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setSubmitError(null);
                setRequiresReload(false);
              }}
              disabled={submitting || isLockedByHandover || !isOperationStateSupported}
              placeholder="أدخل سبب تصحيح تاريخ بداية احتساب عمولة التصفية بالتفصيل..."
              className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          {/* جهة المال / مرجع الدفع (Optional / Editable when necessary) */}
          <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
                <span>جهة المال ومرجع الدفع</span>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                <input
                  type="checkbox"
                  checked={isMoneyRouteCustomized}
                  onChange={(e) => setIsMoneyRouteCustomized(e.target.checked)}
                  disabled={submitting || isLockedByHandover}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>تعديل جهة المال أو مرجع الدفع</span>
              </label>
            </div>

            {!isMoneyRouteCustomized ? (
              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">الجهة الحالية:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {selectedFund === Fund.Bank
                      ? "البنك"
                      : selectedFund === Fund.PetroApp
                      ? "بترو آب"
                      : "الخزنة"}
                  </span>
                </div>
                {paymentReference ? (
                  <div className="font-mono text-gray-700 dark:text-gray-300">
                    مرجع: {paymentReference}
                  </div>
                ) : (
                  <span className="text-gray-400">بدون مرجع</span>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <label htmlFor={fundSelectId} className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    جهة المال
                  </label>
                  <select
                    id={fundSelectId}
                    value={selectedFund}
                    onChange={(e) => setSelectedFund(Number(e.target.value) as Fund)}
                    disabled={submitting || isLockedByHandover}
                    className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium dark:border-gray-700 dark:bg-gray-800"
                  >
                    <option value={Fund.Cashbox}>الخزنة (Cashbox)</option>
                    <option value={Fund.PetroApp}>بترو آب (PetroApp - قبض فقط)</option>
                    <option value={Fund.Bank}>الحساب البنكي (Bank - صرف فقط)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor={paymentRefId} className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    مرجع الدفع (اختياري / إلزامي للتصفيات المسددة)
                  </label>
                  <Input
                    id={paymentRefId}
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    maxLength={500}
                    placeholder="رقم الإيصال أو مرجع الحركة..."
                    disabled={submitting || isLockedByHandover}
                    className="text-xs font-mono"
                  />
                </div>

                {routeValidationError && (
                  <div className="sm:col-span-2 text-[11px] text-rose-600 font-semibold bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg">
                    {routeValidationError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
            className="text-xs"
          >
            إلغاء
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            {submitting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>جارٍ حفظ التصحيح...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>حفظ التصحيح</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
