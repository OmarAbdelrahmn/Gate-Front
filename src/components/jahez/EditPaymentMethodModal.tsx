// src/components/jahez/EditPaymentMethodModal.tsx
"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import {
  Fund,
  type Operation,
  type OperationPaymentMethodUpdate,
  canEditPaymentMethod,
} from "@/lib/jahez/types";
import {
  getJahezOperation,
  updateJahezOperationPaymentMethod,
  generateIdempotencyKey,
} from "@/lib/jahez/api";
import {
  Building2,
  CreditCard,
  AlertTriangle,
  Info,
  RefreshCw,
  Calendar,
  User,
  Hash,
  Coins,
  CheckCircle2,
} from "lucide-react";

export interface EditPaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationId: string | null;
  /**
   * Optional preloaded operation. If provided, used immediately;
   * otherwise the modal fetches the latest operation by operationId.
   */
  initialOperation?: Operation | null;
  contextInfo?: {
    riderName?: string | null;
    accountCode?: string | null;
    settlementDate?: string | null;
  };
  canSettle?: boolean;
  canDisburse?: boolean;
  onOpenCorrectCommission?: () => void;
  onSuccess?: (updatedOperation: Operation) => void;
}

export function EditPaymentMethodModal(props: EditPaymentMethodModalProps) {
  if (!props.isOpen) return null;
  return (
    <EditPaymentMethodDialogBody
      {...props}
      key={props.operationId || props.initialOperation?.id || "edit-payment-dialog"}
    />
  );
}

function EditPaymentMethodDialogBody({
  isOpen,
  onClose,
  operationId,
  initialOperation,
  contextInfo,
  canSettle = true,
  canDisburse = true,
  onOpenCorrectCommission,
  onSuccess,
}: EditPaymentMethodModalProps) {
  // Loading & operation state initialized immediately from initialOperation if present
  const [operation, setOperation] = useState<Operation | null>(() => initialOperation || null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form states
  const [selectedFund, setSelectedFund] = useState<Fund>(() => {
    return initialOperation?.fund === Fund.Bank ? Fund.Bank : Fund.Cashbox;
  });
  const [initialFund, setInitialFund] = useState<Fund | null>(() => initialOperation?.fund ?? null);
  const [paymentReference, setPaymentReference] = useState<string>(
    () => initialOperation?.paymentReference || "",
  );
  const [initialReference, setInitialReference] = useState<string>(
    () => initialOperation?.paymentReference || "",
  );
  const [reason, setReason] = useState<string>("");

  // Submission & Retry states
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [requiresReload, setRequiresReload] = useState(false);
  const [activeCommandKey, setActiveCommandKey] = useState<string | null>(null);
  const [lastSubmittedPayload, setLastSubmittedPayload] = useState<string | null>(null);

  // ----------------------------------------------------------------------
  // Load Operation on Open
  // ----------------------------------------------------------------------
  const initFormWithOperation = (op: Operation) => {
    setOperation(op);
    const fundToSet = op.fund === Fund.Bank ? Fund.Bank : Fund.Cashbox;
    setSelectedFund(fundToSet);
    setInitialFund(op.fund);
    const refToSet = op.paymentReference || "";
    setPaymentReference(refToSet);
    setInitialReference(refToSet);
    setReason("");
    setSubmitError(null);
    setRequiresReload(false);
    setActiveCommandKey(null);
    setLastSubmittedPayload(null);
    setLoading(false);
  };

  const loadOperationData = async (opId: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const op = await getJahezOperation(opId);
      initFormWithOperation(op);
    } catch (err: unknown) {
      if (initialOperation) {
        initFormWithOperation(initialOperation);
      } else {
        const msg = err instanceof Error ? err.message : "تعذر تحميل بيانات التصفية";
        setLoadError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOperation) {
      initFormWithOperation(initialOperation);
      return;
    }

    if (operationId) {
      loadOperationData(operationId);
    }
  }, [operationId, initialOperation]);

  // ----------------------------------------------------------------------
  // Validation
  // ----------------------------------------------------------------------
  const trimmedRef = paymentReference.trim();
  const trimmedReason = reason.trim();

  const isFundChanged = selectedFund !== initialFund;
  const isRefChanged = trimmedRef !== initialReference.trim();
  const hasChanges = isFundChanged || isRefChanged;

  const isRefValid = trimmedRef.length > 0 && trimmedRef.length <= 500;
  const isReasonValid = trimmedReason.length > 0 && trimmedReason.length <= 2000;

  const isFormValid = hasChanges && isRefValid && isReasonValid;

  // Eligibility check
  const isEligible = operation
    ? canEditPaymentMethod(operation, canSettle, canDisburse)
    : false;

  // ----------------------------------------------------------------------
  // Submit Action
  // ----------------------------------------------------------------------
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!operation || !isFormValid || submitting) return;

    setSubmitError(null);

    const payload: OperationPaymentMethodUpdate = {
      fund: selectedFund,
      paymentReference: trimmedRef,
      reason: trimmedReason,
      rowVersion: operation.rowVersion,
    };

    const payloadString = JSON.stringify(payload);

    // Reuse command key for exact duplicate retry, or generate fresh command key
    let commandKey = activeCommandKey;
    if (!commandKey || payloadString !== lastSubmittedPayload) {
      commandKey = generateIdempotencyKey("op-pay-method");
      setActiveCommandKey(commandKey);
      setLastSubmittedPayload(payloadString);
    }

    setSubmitting(true);
    try {
      const updated = await updateJahezOperationPaymentMethod(
        operation.id,
        payload,
        commandKey,
      );

      toast.success("تم بنجاح", "تم تحديث طريقة دفع التصفية بنجاح");
      onSuccess?.(updated);
      onClose();
    } catch (err: unknown) {
      const errObj = err as { status?: number; message?: string; details?: unknown };
      const status = errObj?.status;
      const msg = errObj?.message || "تعذر تحديث طريقة دفع التصفية.";
      setSubmitError(msg);

      // Stale rowVersion or server state conflict
      if (
        status === 409 ||
        msg.includes("تغيرت") ||
        msg.includes("rowVersion") ||
        msg.includes("Stale")
      ) {
        setRequiresReload(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تعديل طريقة الدفع"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4" dir="rtl">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs font-semibold">جارٍ تحميل بيانات التصفية...</p>
          </div>
        )}

        {/* Load Error State */}
        {!loading && loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold">فشل تحميل التصفية</p>
                <p className="mt-1">{loadError}</p>
                {operationId && (
                  <button
                    type="button"
                    onClick={() => loadOperationData(operationId)}
                    className="mt-2 text-indigo-700 underline font-semibold hover:opacity-80"
                  >
                    إعادة المحاولة
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ineligible Warning */}
        {!loading && operation && !isEligible && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">التصفية غير مؤهلة لتعديل طريقة الدفع</p>
                <p className="mt-1">
                  يمكن تعديل طريقة الدفع فقط للتصفيات المنفذة (Executed) ذات الصرف الفعلي للمندوب
                  عبر الخزنة أو الحساب البنكي، وبشرط توفر صلاحيتي التصفية والصرف.
                </p>
                <div className="mt-2 text-[11px] space-y-0.5 opacity-90">
                  <div>حالة العملية: {operation.status === 3 ? "منفذة (3)" : `غير منفذة (${operation.status})`}</div>
                  <div>حالة الدفع: {operation.paymentStatus === 2 ? "مدفوع (2)" : `غير مدفوع (${operation.paymentStatus})`}</div>
                  <div>المتبقي: {operation.remaining} ر.س ({operation.remaining < 0 ? "صرف للمندوب" : "قبض أو صفري"})</div>
                  <div>الجهة المسجلة: {operation.fund === 1 ? "الخزنة" : operation.fund === 3 ? "الحساب البنكي" : "أخرى"}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Form */}
        {!loading && operation && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Bridge Notice for Commission Date Correction */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-xs text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-200">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>
                  هذا النموذج مخصص لتعديل <strong>طريقة الدفع (الخزنة ↔ البنك)</strong>.
                </span>
              </div>
              {onOpenCorrectCommission && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCorrectCommission();
                  }}
                  className="font-bold underline text-emerald-700 dark:text-emerald-300 hover:opacity-80 shrink-0 text-[11px]"
                >
                  الانتقال لتصحيح تاريخ بداية احتساب العمولة ←
                </button>
              )}
            </div>

            {/* 1. Settlement Context Card */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-500">رقم التصفية:</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                    #{operation.id.slice(0, 8)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-500">تاريخ التصفية:</span>
                  <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                    {operation.throughDate || contextInfo?.settlementDate || "-"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-500">المندوب:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {contextInfo?.riderName || "-"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">الحساب:</span>
                  <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                    {contextInfo?.accountCode || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Payout Amount & Current Method */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold mb-1 flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-emerald-600" />
                  المبلغ المصروف
                </div>
                <div className="text-lg font-black text-emerald-700 dark:text-emerald-200 font-mono">
                  {Math.abs(operation.remaining).toFixed(2)} ر.س
                </div>
              </div>

              <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/60 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/30">
                <div className="text-[11px] text-indigo-800 dark:text-indigo-300 font-semibold mb-1">
                  طريقة الدفع الحالية
                </div>
                <div className="font-bold text-indigo-950 dark:text-indigo-100 flex items-center gap-1.5">
                  {operation.fund === Fund.Bank ? (
                    <>
                      <CreditCard className="h-4 w-4 text-indigo-600 shrink-0" />
                      الحساب البنكي (3)
                    </>
                  ) : operation.fund === Fund.Cashbox ? (
                    <>
                      <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      الخزنة (1)
                    </>
                  ) : (
                    <span>أخرى ({operation.fund})</span>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Error Banner & Conflict Reload */}
            {submitError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">{submitError}</p>
                    {requiresReload && (
                      <button
                        type="button"
                        onClick={() => loadOperationData(operation.id)}
                        className="mt-2 inline-flex items-center gap-1 rounded-lg bg-red-100 px-2.5 py-1 font-bold text-red-900 hover:bg-red-200 dark:bg-red-900/60 dark:text-red-100"
                      >
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        إعادة تحميل أحدث بيانات التصفية الآن
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. New Method Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                طريقة الدفع الجديدة <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  onClick={() => setSelectedFund(Fund.Cashbox)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
                    selectedFund === Fund.Cashbox
                      ? "border-emerald-600 bg-emerald-50/70 font-bold text-emerald-900 shadow-xs dark:bg-emerald-950/50 dark:text-emerald-200"
                      : "border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">الخزنة (Cashbox)</div>
                      <div className="text-[10px] text-gray-400 font-mono">القيمة: 1</div>
                    </div>
                  </div>
                  {selectedFund === Fund.Cashbox && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  )}
                </label>

                <label
                  onClick={() => setSelectedFund(Fund.Bank)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
                    selectedFund === Fund.Bank
                      ? "border-indigo-600 bg-indigo-50/70 font-bold text-indigo-900 shadow-xs dark:bg-indigo-950/50 dark:text-indigo-200"
                      : "border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-indigo-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">الحساب البنكي (Bank)</div>
                      <div className="text-[10px] text-gray-400 font-mono">القيمة: 3</div>
                    </div>
                  </div>
                  {selectedFund === Fund.Bank && (
                    <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                  )}
                </label>
              </div>
            </div>

            {/* 4. Payment Reference Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  مرجع الدفع <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-gray-400 font-mono">
                  {paymentReference.length}/500
                </span>
              </div>
              <input
                type="text"
                maxLength={500}
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="مثال: BANK-TRANSFER-123 أو رقم إيصال الصرف..."
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 font-mono"
              />
            </div>

            {/* 5. Reason Textarea */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  سبب التعديل <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-gray-400 font-mono">
                  {reason.length}/2000
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={2000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="اذكر سبب تصحيح طريقة الصرف بالتفصيل (مطلوب للتوثيق المحاسبي)..."
                className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            {/* 6. Explanatory Note */}
            <div className="rounded-xl bg-blue-50/60 p-3 text-[11px] text-blue-900 dark:bg-blue-950/30 dark:text-blue-200 border border-blue-200/50 dark:border-blue-900/40 flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
              <span>
                يتم تحديث طريقة تسجيل الصرف مع الاحتفاظ بسجل التعديل. لا يترتب على الحفظ أي حوالة بنكية آلية.
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={submitting}
              >
                إلغاء
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={!isFormValid || submitting || !isEligible}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold min-w-28 gap-1.5"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    جارٍ الحفظ…
                  </>
                ) : (
                  "حفظ التعديل"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
