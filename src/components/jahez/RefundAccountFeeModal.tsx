// src/components/jahez/RefundAccountFeeModal.tsx
"use client";

import { useEffect, useState, useId } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  previewJahezFeeRefund,
  executeJahezFeeRefund,
  getJahezHandoverFeeRefunds,
  generateIdempotencyKey,
} from "@/lib/jahez/api";
import type {
  FeeRefundPreviewResponse,
  AccountFeeRefund,
  Account,
  Movement,
} from "@/lib/jahez/types";
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RefreshCw,
  Coins,
  Clock,
  ShieldAlert,
  Info,
  Calendar,
  Check,
  Building2,
  User,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export interface RefundAccountFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  handoverId?: string | null;
  account?: Account | null;
  movement?: Movement | null;
  availableHandovers?: Array<{
    value: string;
    label: string;
    sublabel?: string;
    keywords?: string;
  }>;
  onSuccess?: (refund: AccountFeeRefund) => void;
}

export function RefundAccountFeeModal(props: RefundAccountFeeModalProps) {
  if (!props.isOpen) return null;
  return (
    <RefundAccountFeeDialogBody
      {...props}
      key={props.handoverId || props.account?.currentHandoverId || props.movement?.handoverId || "fee-refund-dialog"}
    />
  );
}

function RefundAccountFeeDialogBody({
  isOpen,
  onClose,
  handoverId: initialHandoverId,
  account,
  movement,
  availableHandovers = [],
  onSuccess,
}: RefundAccountFeeModalProps) {
  const { user, can } = useAuth();
  const checkboxId = useId();

  // Selected session / handover ID
  const defaultHandoverId =
    initialHandoverId ||
    account?.currentHandoverId ||
    movement?.handoverId ||
    "";
  const [selectedHandoverId, setSelectedHandoverId] = useState<string>(defaultHandoverId);
  const [manualMode, setManualMode] = useState<boolean>(!defaultHandoverId && availableHandovers.length === 0);

  // Checkbox: عدم احتساب العمولة (initially false)
  const [waiveCommission, setWaiveCommission] = useState<boolean>(false);

  // Form inputs
  const [reference, setReference] = useState<string>(() => `REFUND-${Date.now().toString().slice(-6)}`);
  const [reason, setReason] = useState<string>("استرداد رسوم فتح الحساب");
  const [ordersCount, setOrdersCount] = useState<number>(0);

  // Preview & execution states
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [preview, setPreview] = useState<FeeRefundPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Submitting state
  const [submitting, setSubmitting] = useState<boolean>(false);

  // History state for this session
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [existingRefund, setExistingRefund] = useState<AccountFeeRefund | null>(null);

  // Permissions check
  const isAdmin =
    Boolean(user?.roles?.some((r) => r.toLowerCase() === "admin")) ||
    can("admin") ||
    can("*");
  const canApproveFee =
    can("jahez.requests.fee.approve") ||
    can("jahez.requests.approve") ||
    isAdmin;
  const canWithdraw = can("jahez.withdraw") || isAdmin;
  const canDisburse = can("jahez.money.disburse") || isAdmin;
  const canApproveCommission =
    can("jahez.requests.commission.approve") ||
    can("jahez.requests.approve") ||
    isAdmin;

  // Basic permission validation
  const hasBasicRefundPermission = canApproveFee && canWithdraw && canDisburse;
  const missingCommissionPermission = waiveCommission && !canApproveCommission;

  // Fetch refund preview
  const fetchPreview = async (handoverId: string, waive: boolean) => {
    if (!handoverId.trim()) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await previewJahezFeeRefund({
        handoverId: handoverId.trim(),
        waiveCommission: waive,
      });
      setPreview(res);
    } catch (err: unknown) {
      setPreview(null);
      const msg = err instanceof Error ? err.message : String(err);
      setPreviewError(msg || "تعذر احتساب استرداد الرسوم من الخادم");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Check existing refund history
  const checkRefundHistory = async (handoverId: string) => {
    if (!handoverId.trim()) {
      setExistingRefund(null);
      return;
    }
    setHistoryLoading(true);
    try {
      const history = await getJahezHandoverFeeRefunds(handoverId.trim());
      if (Array.isArray(history) && history.length > 0) {
        setExistingRefund(history[0]);
      } else {
        setExistingRefund(null);
      }
    } catch {
      // Non-blocking history check
      setExistingRefund(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Run preview & history on mount and when session or waiveCommission changes
  useEffect(() => {
    if (selectedHandoverId.trim()) {
      fetchPreview(selectedHandoverId.trim(), waiveCommission);
      checkRefundHistory(selectedHandoverId.trim());
    } else {
      setPreview(null);
      setPreviewError(null);
      setExistingRefund(null);
    }
  }, [selectedHandoverId, waiveCommission]);

  // Extract server amounts (supporting camelCase and PascalCase)
  const collectedFee = Number(
    preview?.collectedFee ?? (preview as Record<string, unknown>)?.CollectedFee ?? 0,
  );
  const commissionDue = Number(
    preview?.commissionDue ?? (preview as Record<string, unknown>)?.CommissionDue ?? 0,
  );
  const commissionDeducted = Number(
    preview?.commissionDeducted ?? (preview as Record<string, unknown>)?.CommissionDeducted ?? 0,
  );
  const refundAmount = Number(
    preview?.refundAmount ?? (preview as Record<string, unknown>)?.RefundAmount ?? 0,
  );
  const cancelledUncollectedFee = Number(
    preview?.cancelledUncollectedFee ??
      (preview as Record<string, unknown>)?.CancelledUncollectedFee ??
      preview?.uncollectedFeeCancelled ??
      0,
  );
  const deadlineUtc =
    preview?.deadlineUtc ||
    (preview as Record<string, unknown>)?.DeadlineUtc ||
    preview?.deadline;

  // Format deadline and check expiration
  const deadlineInfo = (() => {
    if (!deadlineUtc || typeof deadlineUtc !== "string") return null;
    const deadlineDate = new Date(deadlineUtc);
    if (isNaN(deadlineDate.getTime())) return null;

    const now = new Date();
    const diffMs = deadlineDate.getTime() - now.getTime();
    const isExpired = diffMs <= 0;

    const diffHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remHours = diffHours % 24;

    const formattedDate = deadlineDate.toLocaleString("ar-SA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let relativeLabel = "";
    if (isExpired) {
      relativeLabel = `انتهت المهلة منذ ${diffDays > 0 ? `${diffDays} يوم و ` : ""}${remHours} ساعة`;
    } else if (diffDays > 0) {
      relativeLabel = `متبقي ${diffDays} يوم و ${remHours} ساعة`;
    } else {
      relativeLabel = `متبقي ${remHours} ساعة فقط`;
    }

    return {
      formattedDate,
      isExpired,
      relativeLabel,
    };
  })();

  // Handle execution submit
  const handleSubmit = async () => {
    if (!selectedHandoverId.trim()) {
      toast.error("تنبيه", "يرجى تحديد فترة التسليم / الجلسة");
      return;
    }
    if (!reference.trim()) {
      toast.error("تنبيه", "رقم المرجع الفعلي مطلوب (بحد أقصى 500 حرف)");
      return;
    }
    if (!reason.trim()) {
      toast.error("تنبيه", "سبب وبيان الاسترداد مطلوب (بحد أقصى 2000 حرف)");
      return;
    }
    if (missingCommissionPermission) {
      toast.error(
        "صلاحية غير كافية",
        "عدم احتساب العمولة يتطلب صلاحية اعتماد استثناء العمولة (jahez.requests.commission.approve)",
      );
      return;
    }
    if (!hasBasicRefundPermission) {
      toast.error(
        "صلاحية غير كافية",
        "استرداد الرسوم وسحب الحساب يتطلب صلاحيات الموافقة على الرسوم، السحب، وصرف الأموال",
      );
      return;
    }

    setSubmitting(true);
    try {
      const idempotencyKey = generateIdempotencyKey("fee-refund");
      const result = await executeJahezFeeRefund(
        {
          handoverId: selectedHandoverId.trim(),
          waiveCommission,
          reference: reference.trim(),
          reason: reason.trim(),
          dayUsage: {
            ordersCount: Number(ordersCount) || 0,
          },
        },
        idempotencyKey,
      );

      toast.success(
        "تم استرداد الرسوم بنجاح",
        `تم صرف ${Number(result?.refundAmount || refundAmount).toFixed(2)} ر.س من الخزنة، وإنهاء إسناد الحساب وتحويله إلى متاح.`,
      );

      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("تعذر تنفيذ استرداد الرسوم", msg || "حدث تعارض في تنفيذ العملية");
    } finally {
      setSubmitting(false);
    }
  };

  // Check if execute button should be disabled
  const isSubmitDisabled =
    submitting ||
    previewLoading ||
    !selectedHandoverId.trim() ||
    !reference.trim() ||
    !reason.trim() ||
    reference.length > 500 ||
    reason.length > 2000 ||
    Boolean(existingRefund) ||
    Boolean(previewError) ||
    !preview ||
    missingCommissionPermission ||
    !hasBasicRefundPermission;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="استرداد رسوم فتح حساب — Jahez"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 text-xs" dir="rtl">
        {/* Top Instructions / Policy Banner */}
        <div className="rounded-2xl bg-gradient-to-l from-rose-50 to-amber-50 dark:from-rose-950/40 dark:to-amber-950/30 p-3.5 border border-rose-200/80 dark:border-rose-900/60 shadow-xs">
          <div className="flex items-start gap-2.5">
            <RotateCcw className="h-4 w-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <div className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                سياسة استرداد رسوم فتح الحساب وسحب التكليف
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                يُقبل استرداد واحد لكل جلسة إسناد نشطة خلال مهلة أقصاها <strong>7 أيام (168 ساعة)</strong> من بدء التسليم.
                تنفيذ الاسترداد يسجل صرفاً نقدياً من الخزنة لصافي المبلغ المسترد، ويسحب الحساب ويعيده إلى متاح (Available) فوراً.
              </p>
            </div>
          </div>
        </div>

        {/* Existing Refund Warning if already refunded */}
        {existingRefund && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50 p-3.5 space-y-1.5 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200 text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>تم استرداد رسوم هذه الجلسة مسبقاً (غير قابلة للاسترداد مجدداً)</span>
            </div>
            <div className="text-[11px] text-emerald-800 dark:text-emerald-300 grid grid-cols-2 gap-2 pt-1 font-mono">
              <div>مبلغ الاسترداد: {Number(existingRefund.refundAmount).toFixed(2)} ر.س</div>
              <div>المرجع: {existingRefund.reference}</div>
              <div>تاريخ الاسترداد: {existingRefund.createdAtUtc?.slice(0, 16).replace("T", " ")}</div>
              <div>العمولة: {existingRefund.waiveCommission ? "تم استثناؤها (إعفاء)" : "تم خصمها"}</div>
            </div>
          </div>
        )}

        {/* Session / Handover Selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block font-semibold text-gray-700 dark:text-gray-300">
              جلسة الإسناد المستهدفة (Handover / Session ID) *
            </label>
            {!defaultHandoverId && availableHandovers.length > 0 && (
              <button
                type="button"
                onClick={() => setManualMode(!manualMode)}
                className="text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {manualMode ? "اختر من القائمة المنسدلة" : "إدخال يدوي لمعرف الجلسة"}
              </button>
            )}
          </div>

          {defaultHandoverId ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60 p-2.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-mono font-bold text-xs text-gray-900 dark:text-white">
                  معرف الجلسة: #{defaultHandoverId}
                </div>
                {(account || movement) && (
                  <div className="text-[11px] text-gray-500 flex items-center gap-2">
                    {account?.code && <span>الحساب: <strong>{account.code}</strong></span>}
                    {(account?.actualRider?.nameAr || movement?.userRider?.nameAr) && (
                      <span>• المندوب: <strong>{account?.actualRider?.nameAr || movement?.userRider?.nameAr}</strong></span>
                    )}
                  </div>
                )}
              </div>
              <Badge tone="blue">جلسة محددة</Badge>
            </div>
          ) : !manualMode && availableHandovers.length > 0 ? (
            <SearchableSelect
              options={availableHandovers}
              value={selectedHandoverId}
              onChange={setSelectedHandoverId}
              placeholder="اختر جلسة الإسناد أو ابحث بالحساب أو المندوب..."
              searchPlaceholder="ابحث برقم الحساب، اسم المندوب، أو رقم الإقامة..."
              noOptionsText="لا توجد فترات إسناد نشطة مؤهلة"
            />
          ) : (
            <Input
              value={selectedHandoverId}
              onChange={(e) => setSelectedHandoverId(e.target.value)}
              placeholder="أدخل معرّف الجلسة (Session UUID)..."
              className="font-mono text-xs"
            />
          )}
        </div>

        {/* Waive Commission Checkbox Card */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3.5 shadow-2xs space-y-2">
          <label
            htmlFor={checkboxId}
            className="flex items-start gap-3 cursor-pointer select-none"
          >
            <input
              id={checkboxId}
              type="checkbox"
              checked={waiveCommission}
              onChange={(e) => setWaiveCommission(e.target.checked)}
              disabled={submitting || previewLoading || Boolean(existingRefund)}
              className="mt-0.5 h-4 w-4 rounded-md border-gray-300 text-rose-600 focus:ring-rose-500 dark:border-gray-700 dark:bg-gray-800"
            />
            <div className="space-y-0.5">
              <div className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-xs">
                <span>عدم احتساب العمولة (Waive Commission)</span>
                {waiveCommission && (
                  <Badge tone="purple">إعفاء كامل من العمولة المستحقة</Badge>
                )}
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                {waiveCommission
                  ? "سيتم التنازل عن عمولة الشركة المستحقة بالكامل، وصرف كامل الرسوم المحصلة فعلياً للمندوب دون أي استقطاع."
                  : "سيتم خصم عمولة أيام التشغيل المحسوبة من أصل الرسوم المحصلة فعلياً، وصرف صافي الفارق فقط للمندوب."}
              </p>
            </div>
          </label>

          {waiveCommission && !canApproveCommission && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-2 text-[11px] font-semibold text-amber-900 border border-amber-200 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-200">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                تنبيه: عدم احتساب العمولة يتطلب صلاحية <code>jahez.requests.commission.approve</code>.
              </span>
            </div>
          )}
        </div>

        {/* Preview Calculations Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-700 dark:text-gray-300 text-xs flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-amber-500" />
              <span>مبالغ الاسترداد والاحتساب المعتمدة من الخادم</span>
            </span>
            {previewLoading && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                <RefreshCw className="h-3 w-3 animate-spin" />
                جارٍ إعادة الاحتساب...
              </span>
            )}
          </div>

          {previewError ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-3 text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                <span>تعذر استخراج معاينة الاسترداد:</span>
              </div>
              <p className="text-[11px] leading-relaxed">{previewError}</p>
            </div>
          ) : preview ? (
            <div className="space-y-2.5">
              {/* Amounts Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-xl border border-gray-200 bg-white p-2.5 text-center dark:border-gray-800 dark:bg-gray-900 shadow-2xs">
                  <span className="text-[10px] text-gray-500 block">الرسوم المحصلة</span>
                  <span className="font-mono font-bold text-sm text-gray-900 dark:text-white mt-0.5 block">
                    {collectedFee.toFixed(2)} ر.س
                  </span>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-2.5 text-center dark:border-gray-800 dark:bg-gray-900 shadow-2xs">
                  <span className="text-[10px] text-gray-500 block">العمولة المستحقة</span>
                  <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400 mt-0.5 block">
                    {commissionDue.toFixed(2)} ر.س
                  </span>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-2.5 text-center dark:border-gray-800 dark:bg-gray-900 shadow-2xs">
                  <span className="text-[10px] text-gray-500 block">العمولة المخصومة</span>
                  <span className={`font-mono font-bold text-sm mt-0.5 block ${commissionDeducted > 0 ? "text-rose-600 dark:text-rose-400" : "text-gray-400"}`}>
                    {commissionDeducted.toFixed(2)} ر.س
                  </span>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 text-center dark:border-emerald-900 dark:bg-emerald-950/40 shadow-2xs">
                  <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold block">مبلغ الاسترداد</span>
                  <span className="font-mono font-black text-base text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                    {refundAmount.toFixed(2)} ر.س
                  </span>
                </div>
              </div>

              {/* Deadline & Cancelled Uncollected Fee Callouts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {deadlineInfo && (
                  <div className={`rounded-xl border p-2.5 flex items-center justify-between ${
                    deadlineInfo.isExpired
                      ? "border-rose-200 bg-rose-50/70 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
                      : "border-blue-200 bg-blue-50/70 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200"
                  }`}>
                    <div className="space-y-0.5">
                      <div className="font-bold flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>آخر موعد للاسترداد (7 أيام)</span>
                      </div>
                      <div className="font-mono">{deadlineInfo.formattedDate}</div>
                    </div>
                    <Badge tone={deadlineInfo.isExpired ? "red" : "blue"}>
                      {deadlineInfo.relativeLabel}
                    </Badge>
                  </div>
                )}

                {cancelledUncollectedFee > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-bold flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-amber-600" />
                        <span>رسوم غير محصلة ملغاة</span>
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">
                        سيتم شطب المتبقي غير المقبوض آلياً
                      </div>
                    </div>
                    <span className="font-mono font-bold text-sm text-amber-700 dark:text-amber-400">
                      {cancelledUncollectedFee.toFixed(2)} ر.س
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 text-center text-gray-400">
              حدد جلسة الإسناد لعرض تفاصيل الاحتساب الدقيقة
            </div>
          )}
        </div>

        {/* Inputs Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              مرجع عملية الاسترداد الفعلية * (بحد أقصى 500)
            </label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="مثال: REFUND-000123"
              maxLength={500}
              className="font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              عدد طلبات يوم السحب (اختياري)
            </label>
            <Input
              type="number"
              min={0}
              value={ordersCount}
              onChange={(e) => setOrdersCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
              placeholder="0"
              className="font-mono"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              السبب والملاحظات * (بحد أقصى 2000)
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="استرداد رسوم فتح الحساب..."
              maxLength={2000}
            />
          </div>
        </div>

        {/* Permission warning if missing permissions */}
        {!hasBasicRefundPermission && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-[11px] text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200 flex items-center gap-2 font-semibold">
            <Lock className="h-4 w-4 shrink-0 text-rose-600" />
            <span>
              يتطلب تنفيذ هذا الإجراء صلاحيات: موافقة الرسوم (<code>jahez.requests.fee.approve</code>)، السحب (<code>jahez.withdraw</code>)، وصرف الأموال (<code>jahez.money.disburse</code>).
            </span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            إلغاء
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2 shadow-xs"
            title="استرداد الرسوم وسحب الحساب"
          >
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>جارٍ الاسترداد والسحب...</span>
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                <span>استرداد الرسوم وسحب الحساب</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
