// src/components/jahez/EditSettlementNetModal.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
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
  type OperationNetUpdate,
  canEditSettlementNet,
} from "@/lib/jahez/types";
import {
  getJahezOperation,
  generateIdempotencyKey,
} from "@/lib/jahez/api";
import { jahezClient } from "@/lib/jahez/jahez-v2-client";
import {
  Coins,
  AlertTriangle,
  Lock,
  RefreshCw,
  CheckCircle2,
  Info,
  CalendarCheck,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Equal,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";

export interface EditSettlementNetModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement?: Movement | null;
  operationId?: string | null;
  initialOperation?: Operation | null;
  contextInfo?: {
    riderName?: string | null;
    accountCode?: string | null;
    settlementDate?: string | null;
  };
  canSettle?: boolean;
  canApproveAdjustment?: boolean;
  canReceive?: boolean;
  canDisburse?: boolean;
  onOpenEditPayment?: () => void;
  onOpenCorrectCommission?: () => void;
  onSuccess?: (updatedOperation: Operation) => void;
}

/**
 * Midpoint rounding away from zero (standard commercial rounding)
 */
export function roundAwayFromZero(val: number, decimals = 2): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  const factor = Math.pow(10, decimals);
  const sign = val < 0 ? -1 : 1;
  return sign * (Math.round((Math.abs(val) + Number.EPSILON) * factor) / factor);
}

export function EditSettlementNetModal(props: EditSettlementNetModalProps) {
  if (!props.isOpen) return null;
  return (
    <EditSettlementNetDialogBody
      {...props}
      key={props.movement?.id || props.operationId || props.initialOperation?.id || "dialog-body"}
    />
  );
}

function EditSettlementNetDialogBody({
  isOpen,
  onClose,
  movement,
  operationId: propOperationId,
  initialOperation,
  contextInfo,
  canSettle = true,
  canApproveAdjustment = true,
  canReceive = true,
  canDisburse = true,
  onOpenEditPayment,
  onOpenCorrectCommission,
  onSuccess,
}: EditSettlementNetModalProps) {
  const actualOperationId = propOperationId || movement?.operationId || initialOperation?.id || null;

  // Operation loading state
  const [operation, setOperation] = useState<Operation | null>(() => initialOperation || null);
  const [loadingOperation, setLoadingOperation] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form states initialized immediately from movement or initialOperation
  const initialNetValue = useMemo(() => {
    if (initialOperation?.net != null) return Number(initialOperation.net);
    if (movement?.net != null) return Number(movement.net);
    return 0;
  }, [initialOperation, movement]);

  const [netInput, setNetInput] = useState<string>(() => initialNetValue.toFixed(2));
  const [reason, setReason] = useState<string>("تصحيح صافي المبلغ المُدخل للتصفية");

  // Submission & Retry states
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [requiresReload, setRequiresReload] = useState(false);
  const [activeCommandKey, setActiveCommandKey] = useState<string | null>(null);
  const [lastSubmittedPayload, setLastSubmittedPayload] = useState<string | null>(null);

  // Handover lock check
  const isLockedByHandover = Boolean(
    movement?.cashboxHandoverId ||
      movement?.isHandedToAccountant ||
      operation?.handoverId,
  );

  // Load operation details on open if not preloaded
  const loadOperationData = async (opId: string) => {
    setLoadingOperation(true);
    setLoadError(null);
    setSubmitError(null);
    setRequiresReload(false);
    try {
      const op = await getJahezOperation(opId);
      setOperation(op);
      if (op.net != null) {
        setNetInput(Number(op.net).toFixed(2));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر جلب تفاصيل التصفية من الخادم";
      setLoadError(msg);
    } finally {
      setLoadingOperation(false);
    }
  };

  useEffect(() => {
    if (initialOperation) {
      setOperation(initialOperation);
      if (initialOperation.net != null) {
        setNetInput(Number(initialOperation.net).toFixed(2));
      }
      return;
    }
    if (actualOperationId) {
      loadOperationData(actualOperationId);
    }
  }, [actualOperationId, initialOperation]);

  // Saved values from operation or fallback movement
  const savedCommission = useMemo(() => {
    if (operation?.commission != null) return Number(operation.commission);
    if (movement?.commission != null) return Number(movement.commission);
    return 0;
  }, [operation, movement]);

  const originalNet = useMemo(() => {
    if (operation?.net != null) return Number(operation.net);
    if (movement?.net != null) return Number(movement.net);
    return 0;
  }, [operation, movement]);

  const originalRemaining = useMemo(() => {
    if (operation?.remaining != null) return Number(operation.remaining);
    if (movement != null) {
      return movement.direction === Direction.Receipt ? movement.amount : -movement.amount;
    }
    return originalNet + savedCommission;
  }, [operation, movement, originalNet, savedCommission]);

  // Parse entered net
  const parsedNet = parseFloat(netInput);
  const isNetValidNumber = !isNaN(parsedNet) && isFinite(parsedNet);
  const roundedNet = isNetValidNumber ? roundAwayFromZero(parsedNet, 2) : 0;

  // Limits: ±1,000,000,000
  const MIN_LIMIT = -1_000_000_000;
  const MAX_LIMIT = 1_000_000_000;
  const isNetWithinLimit = roundedNet >= MIN_LIMIT && roundedNet <= MAX_LIMIT;

  // New remaining calculation: net + commission
  const newRemaining = roundAwayFromZero(roundedNet + savedCommission, 2);
  const isTotalWithinLimit = newRemaining >= MIN_LIMIT && newRemaining <= MAX_LIMIT;

  // Cash movement direction & amount
  const newAmount = Math.abs(newRemaining);
  const newDirection =
    newRemaining > 0
      ? Direction.Receipt
      : newRemaining < 0
      ? Direction.Disbursement
      : Direction.None;

  // Change detection
  const hasNetChanged = Math.abs(roundedNet - originalNet) > 0.0001;

  // Reason validation: required, nonblank, <= 2000 chars
  const trimmedReason = reason.trim();
  const isReasonValid = trimmedReason.length > 0 && trimmedReason.length <= 2000;

  // Permissions validation
  const hasAllPermissions =
    canSettle && canApproveAdjustment && canReceive && canDisburse;

  // Eligibility check
  const isPurposeSettlement = (operation?.purpose ?? movement?.purpose ?? Purpose.Settlement) === Purpose.Settlement;
  const hasTransferredDebt = operation?.transferToRider === true || Boolean(movement?.transferredDebtId);

  const isEligible =
    !isLockedByHandover &&
    hasAllPermissions &&
    isPurposeSettlement &&
    !hasTransferredDebt &&
    Boolean(actualOperationId);

  const isFormValid =
    isEligible &&
    isNetValidNumber &&
    isNetWithinLimit &&
    isTotalWithinLimit &&
    isReasonValid &&
    hasNetChanged;

  // ----------------------------------------------------------------------
  // Submit Handler
  // ----------------------------------------------------------------------
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!actualOperationId || !isFormValid || submitting) return;

    setSubmitError(null);

    const rowVersion =
      operation?.rowVersion || movement?.operationRowVersion || "";

    const payload: OperationNetUpdate = {
      net: roundedNet,
      reason: trimmedReason,
      rowVersion,
    };

    const payloadString = JSON.stringify(payload);

    // Reuse idempotency key for identical payload retry, fresh key for changed payload
    let commandKey = activeCommandKey;
    if (!commandKey || payloadString !== lastSubmittedPayload) {
      commandKey = generateIdempotencyKey("op-net");
      setActiveCommandKey(commandKey);
      setLastSubmittedPayload(payloadString);
    }

    setSubmitting(true);
    try {
      const updatedOp = await jahezClient().updateNet(
        actualOperationId,
        payload,
        commandKey,
      );

      toast.success("تم بنجاح", "تم تعديل صافي المبلغ المُدخل للتصفية بنجاح");
      onSuccess?.(updatedOp);
      onClose();
    } catch (err: unknown) {
      const errObj = err as { status?: number; message?: string; details?: unknown };
      const status = errObj?.status;
      const msg = errObj?.message || "تعذر تعديل صافي مبلغ التصفية.";
      setSubmitError(msg);

      if (
        status === 409 ||
        msg.includes("409") ||
        msg.includes("rowVersion") ||
        msg.includes("تسليم") ||
        msg.includes("Stale")
      ) {
        setRequiresReload(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const riderDisplay =
    contextInfo?.riderName ||
    movement?.userRider?.nameAr ||
    movement?.ownerRider?.nameAr ||
    null;

  const accountDisplay =
    contextInfo?.accountCode ||
    movement?.platformAccountId ||
    null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تعديل صافي المبلغ المُدخل للتصفية (الخزنة)"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 text-xs" dir="rtl">
        {/* Loading overlay / spinner */}
        {loadingOperation && (
          <div className="flex flex-col items-center justify-center p-6 text-center text-gray-500">
            <RefreshCw className="h-7 w-7 animate-spin text-emerald-600 mb-2" />
            <p className="font-semibold text-xs">جارٍ جلب تفاصيل التصفية...</p>
          </div>
        )}

        {/* Load Error */}
        {!loadingOperation && loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold">فشل تحميل التصفية</p>
                <p className="mt-0.5">{loadError}</p>
                <button
                  type="button"
                  onClick={() => actualOperationId && loadOperationData(actualOperationId)}
                  className="mt-2 text-[11px] underline font-bold"
                >
                  إعادة المحاولة
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Context Bar */}
        {(riderDisplay || accountDisplay || contextInfo?.settlementDate) && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 p-2.5 border border-gray-200 dark:border-gray-700">
            {riderDisplay && (
              <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                <span>المندوب:</span>
                <span className="text-emerald-700 dark:text-emerald-400">{riderDisplay}</span>
              </span>
            )}
            {accountDisplay && (
              <span className="text-gray-600 dark:text-gray-300 font-mono text-[11px] bg-white dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                حساب: {accountDisplay}
              </span>
            )}
            {contextInfo?.settlementDate && (
              <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                تاريخ التصفية: {contextInfo.settlementDate}
              </span>
            )}
          </div>
        )}

        {/* Locked by Handover Warning */}
        {isLockedByHandover && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-3.5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200 shadow-xs">
            <div className="flex items-start gap-2.5">
              <Lock className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm">التصفية مشمولة في تسليم محاسب</p>
                <p className="text-xs leading-relaxed">
                  هذه التصفية مشمولة في تسليم أموال للمحاسب (معلق أو معتمد). لا يمكن تعديل صافي المبلغ إلا بعد إلغاء تسليم المحاسب المعلق أولاً لإطلاق الحركة للتصحيح.
                </p>
              </div>
            </div>
          </div>
        )}


        {/* Permissions Warning */}
        {!hasAllPermissions && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold">صلاحيات غير كافية</p>
                <p className="mt-0.5 text-xs">
                  يتطلب تعديل صافي التصفية الصلاحيات: jahez.settle, jahez.requests.adjustment.approve, jahez.money.receive, jahez.money.disburse
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-xs">
                <Coins className="h-4 w-4 text-emerald-600" />
                <span>صافي المبلغ المُدخل للتصفية (ر.س) *</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setNetInput(originalNet.toFixed(2))}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  title="استعادة الصافي الأصلي"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  <span>الصافي الحالي ({originalNet.toFixed(2)})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNetInput("0.00")}
                  className="px-2 py-0.5 rounded text-[10px] font-bold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800"
                >
                  0.00 ر.س
                </button>
              </div>
            </div>

            <div className="relative">
              <Input
                type="number"
                step="0.01"
                disabled={!isEligible || submitting}
                value={netInput}
                onChange={(e) => setNetInput(e.target.value)}
                placeholder="0.00"
                className="text-lg font-bold font-mono tracking-wide h-11 text-right pl-12"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 font-mono pointer-events-none">
                ر.س
              </span>
            </div>

            <p className="text-[11px] text-gray-500 leading-relaxed">
              يقبل قيمة موجبة أو سالبة أو صفر. يتم تطبيق التقريب التجاري لأقرب هللة مع تقريب النصف للأبعد عن الصفر.
            </p>

            {/* Reason */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <label className="font-bold text-gray-700 dark:text-gray-300 text-xs">
                  سبب التعديل والبيان *
                </label>
                <span
                  className={`text-[10px] font-mono ${
                    trimmedReason.length > 2000 ? "text-red-500 font-bold" : "text-gray-400"
                  }`}
                >
                  {trimmedReason.length} / 2000
                </span>
              </div>
              <textarea
                disabled={!isEligible || submitting}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="أدخل سبب تصحيح صافي المبلغ المُدخل للتصفية..."
                className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Live Recalculation Impact Card */}
          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-white to-gray-50 dark:border-emerald-900/50 dark:from-emerald-950/20 dark:via-gray-900 dark:to-gray-800/50 p-4 space-y-3 shadow-xs">
            <div className="font-bold text-gray-900 dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span>المعاينة الفورية لإعادة الاحتساب والتأثير المالي</span>
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                المتبقي = الصافي + العمولة
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {/* Old Net */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                <div className="text-[10px] text-gray-500">الصافي السابق</div>
                <div className="font-mono font-bold text-xs text-gray-700 dark:text-gray-300 mt-1">
                  {originalNet.toFixed(2)} ر.س
                </div>
              </div>

              {/* New Net */}
              <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">الصافي الجديد</div>
                <div className="font-mono font-black text-xs text-emerald-800 dark:text-emerald-200 mt-1">
                  {isNetValidNumber ? `${roundedNet.toFixed(2)} ر.س` : "-"}
                </div>
              </div>

              {/* Commission (constant) */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                <div className="text-[10px] text-gray-500">عمولة الشركة (ثابتة)</div>
                <div className="font-mono font-bold text-xs text-indigo-700 dark:text-indigo-400 mt-1">
                  {savedCommission.toFixed(2)} ر.س
                </div>
              </div>

              {/* New Remaining */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                <div className="text-[10px] text-gray-500">المتبقي الناتج</div>
                <div className="font-mono font-black text-xs text-gray-900 dark:text-white mt-1">
                  {isNetValidNumber ? `${newRemaining.toFixed(2)} ر.س` : "-"}
                </div>
              </div>
            </div>

            {/* Impact on Cashbox Movement */}
            <div className="rounded-xl p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {newDirection === Direction.Receipt && (
                  <Badge tone="green">قبض نقدية من المندوب</Badge>
                )}
                {newDirection === Direction.Disbursement && (
                  <Badge tone="red">صرف نقدية للمندوب</Badge>
                )}
                {newDirection === Direction.None && (
                  <Badge tone="gray">تسوية متعادلة (0.00 ر.س)</Badge>
                )}
                <span className="text-gray-600 dark:text-gray-300 text-[11px]">
                  حركة الخزنة الجديدة:
                </span>
              </div>
              <div className="font-mono font-black text-sm text-gray-900 dark:text-white">
                {newAmount.toFixed(2)} ر.س
              </div>
            </div>

            {/* Direction Flip Alert */}
            {originalRemaining !== 0 &&
              newRemaining !== 0 &&
              Math.sign(originalRemaining) !== Math.sign(newRemaining) && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-2.5 text-[11px] text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300 flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0 text-indigo-600" />
                  <span>
                    تنبيه: سيتم عكس اتجاه حركة الصندوق من{" "}
                    <strong>{originalRemaining > 0 ? "قبض" : "صرف"}</strong> إلى{" "}
                    <strong>{newRemaining > 0 ? "قبض" : "صرف"}</strong> وتحديث القيود والمزامنة تلقائياً.
                  </span>
                </div>
              )}
          </div>

          {/* Submission Error Banner */}
          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 space-y-1.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">تعذر تعديل الصافي</p>
                  <p className="text-xs leading-relaxed">{submitError}</p>
                </div>
              </div>
              {requiresReload && actualOperationId && (
                <div className="pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => loadOperationData(actualOperationId)}
                    className="text-xs font-bold gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    إعادة تحميل أحدث بيانات التصفية والتحقق من التسليم
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-1.5">
              {onOpenEditPayment && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEditPayment();
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline px-2 py-1"
                >
                  <CreditCard className="h-3 w-3" />
                  <span>تعديل طريقة الدفع</span>
                </button>
              )}
              {onOpenCorrectCommission && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCorrectCommission();
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline px-2 py-1"
                >
                  <CalendarCheck className="h-3 w-3" />
                  <span>تصحيح تاريخ العمولة</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={submitting}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 px-4"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>جارٍ الحفظ...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>حفظ وتعديل الصافي</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}
