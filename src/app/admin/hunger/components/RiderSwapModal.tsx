// src/app/admin/hunger/components/RiderSwapModal.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  AssignmentContextSection,
  type AssignmentContextSectionRef,
} from "@/components/shared/AssignmentContextSection";
import {
  createHungerRiderSwapReview,
  confirmHungerRiderSwap,
  createHungerFinanceException,
  getHungerFinanceExceptions,
  generateHungerIdempotencyKey,
  getRiyadhTodayIso,
  getHungerErrorMessage,
  isWalletReviewExpiredOrSuperseded,
  HUNGER_COMPENSATION_MODELS,
  type HungerAccountItem,
  type HungerCompensationModel,
  type HungerExceptionItem,
  type HungerRiderSwapReviewResponse,
} from "@/lib/hunger/api";
import { WalletReviewResultCard } from "./WalletReviewResultCard";
import {
  AlertTriangle,
  ArrowLeftRight,
  FileImage,
  Info,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface RiderSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: HungerAccountItem | null;
  supervisorOptions: SelectOption[];
  riderOptions: SelectOption[];
  defaultSupervisorId: string;
  canFieldCompensation: boolean;
  onSuccess: () => Promise<void> | void;
}

export function RiderSwapModal({
  isOpen,
  onClose,
  account,
  supervisorOptions,
  riderOptions,
  defaultSupervisorId,
  canFieldCompensation,
  onSuccess,
}: RiderSwapModalProps) {
  const { can } = useAuth();
  const canRequestException = can("hunger.finance.exception.request");

  const [supervisorId, setSupervisorId] = useState(defaultSupervisorId);
  const [businessDate, setBusinessDate] = useState(getRiyadhTodayIso());

  const initialBal =
    account?.lastWalletBalance !== undefined &&
    account?.lastWalletBalance !== null
      ? Number(account.lastWalletBalance)
      : 0;
  const [balanceSign, setBalanceSign] = useState<"+" | "-" | "0">(
    initialBal > 0 ? "+" : initialBal < 0 ? "-" : "0",
  );
  const [balanceMagnitude, setBalanceMagnitude] = useState(
    initialBal !== 0 ? Math.abs(initialBal).toFixed(2) : "0.00",
  );

  const [walletEvidenceFile, setWalletEvidenceFile] = useState<File | null>(
    null,
  );
  const [walletEvidencePreview, setWalletEvidencePreview] = useState<
    string | null
  >(null);
  const [walletEvidenceError, setWalletEvidenceError] = useState<string | null>(
    null,
  );

  // Exception state for handover carry-over
  const [approvedExceptions, setApprovedExceptions] = useState<
    HungerExceptionItem[]
  >([]);
  const [handoverExceptionApprovalId, setHandoverExceptionApprovalId] =
    useState("");
  const [exceptionReason, setExceptionReason] = useState(
    "تبديل مندوب مع رصيد مرحّل غير صفري",
  );
  const [requestingException, setRequestingException] = useState(false);
  const [loadingExceptions, setLoadingExceptions] = useState(false);

  // Old rider return fields
  const [returnReason, setReturnReason] = useState("تبديل المندوب");
  const [ordersCount, setOrdersCount] = useState("0");

  // New rider handover fields
  const [newRiderProfileId, setNewRiderProfileId] = useState("");
  const [handoverReason, setHandoverReason] = useState("تبديل المندوب");
  const [backdatedReason, setBackdatedReason] = useState("");
  const [compensationModel, setCompensationModel] =
    useState<HungerCompensationModel>(
      (account?.compensationModel as HungerCompensationModel) || "Commission",
    );

  const [swapReview, setSwapReview] =
    useState<HungerRiderSwapReviewResponse | null>(null);
  const [staleErrorBanner, setStaleErrorBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const assignmentContextRef = useRef<AssignmentContextSectionRef | null>(null);

  const signedMobileBalance = useMemo(() => {
    if (balanceSign === "0") return 0;
    const mag = Math.abs(
      parseFloat(String(balanceMagnitude).replace(/,/g, "")) || 0,
    );
    if (mag === 0) return 0;
    return balanceSign === "-" ? -mag : mag;
  }, [balanceSign, balanceMagnitude]);

  const loadApprovedExceptions = async () => {
    if (!account?.platformId) return;
    const accId = account.accountId || account.id || "";
    setLoadingExceptions(true);
    try {
      const res = await getHungerFinanceExceptions(
        {
          platformId: account.platformId,
          status: "Approved",
          page: 1,
          pageSize: 50,
        },
        { suppressErrorToast: true },
      );
      const matching = (res.items || []).filter(
        (ex) =>
          ex.kind === "NonZeroHandover" &&
          (!ex.accountId || ex.accountId === accId),
      );
      setApprovedExceptions(matching);
      if (matching.length > 0 && !handoverExceptionApprovalId) {
        setHandoverExceptionApprovalId(matching[0].exceptionId);
      }
    } catch {
      // ignore
    } finally {
      setLoadingExceptions(false);
    }
  };

  useEffect(() => {
    if (isOpen && account?.platformId) {
      void loadApprovedExceptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, account?.accountId, account?.platformId]);

  const handleWalletFileChange = (file: File | null) => {
    if (walletEvidencePreview) {
      URL.revokeObjectURL(walletEvidencePreview);
    }
    setWalletEvidenceError(null);
    if (!file) {
      setWalletEvidenceFile(null);
      setWalletEvidencePreview(null);
      return;
    }
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/bmp",
    ];
    if (!allowed.includes(file.type)) {
      setWalletEvidenceError(
        "صيغة الملف غير مدعومة. يرجى اختيار صورة (JPEG, PNG, WebP, GIF, BMP).",
      );
      setWalletEvidenceFile(null);
      setWalletEvidencePreview(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setWalletEvidenceError(
        "حجم الصورة يتجاوز الحد الأقصى المسموح به (5 ميجابايت).",
      );
      setWalletEvidenceFile(null);
      setWalletEvidencePreview(null);
      return;
    }
    setWalletEvidenceFile(file);
    setWalletEvidencePreview(URL.createObjectURL(file));
  };

  const handleRequestHandoverException = async () => {
    if (!account?.platformId) {
      toast.warning("تعذر تحديد معرف المنصة لطلب الاستثناء");
      return;
    }
    const accId = account.accountId || account.id || "";
    const reqAmount =
      swapReview?.handover.attributedBalance ?? signedMobileBalance;
    if (!exceptionReason.trim()) {
      toast.warning("يرجى كتابة سبب طلب الاستثناء");
      return;
    }
    setRequestingException(true);
    try {
      await createHungerFinanceException({
        platformId: account.platformId,
        kind: "NonZeroHandover",
        accountId: accId,
        supervisorEmployeeId: supervisorId || undefined,
        amount: reqAmount,
        reason: exceptionReason.trim(),
        idempotencyKey: generateHungerIdempotencyKey("exc-swap"),
      });
      await loadApprovedExceptions();
    } catch (err) {
      toast.error(getHungerErrorMessage(err, "تعذر إرسال طلب الاستثناء"));
    } finally {
      setRequestingException(false);
    }
  };

  const oldRiderId =
    account?.actualRider?.riderProfileId ||
    account?.assignedRiderProfileId ||
    "";
  const oldRiderName =
    account?.actualRider?.nameAr ||
    account?.actualRider?.nameEn ||
    account?.assignedRiderNameAr ||
    account?.assignedRiderNameEn ||
    "المندوب الحالي";

  const filteredNewRiderOptions = useMemo(
    () => riderOptions.filter((r) => r.value !== oldRiderId),
    [riderOptions, oldRiderId],
  );

  const canConfirmSwap = useMemo(() => {
    if (!swapReview) return false;
    const retOk =
      swapReview.return.canConfirm !== false &&
      swapReview.return.closingBalance !== null;
    const handOk =
      swapReview.handover.canConfirm !== false &&
      swapReview.handover.closingBalance !== null;
    return retOk && handOk;
  }, [swapReview]);

  const handleReviewSwap = async () => {
    if (!account) return;
    const accId = account.accountId || account.id || "";
    if (!supervisorId) {
      toast.warning("يرجى اختيار المشرف المسؤول عن المراجعة المالية");
      return;
    }
    if (!oldRiderId) {
      toast.warning("لا يوجد مندوب نشط حاليًا على هذا الحساب لتبديله");
      return;
    }
    if (!newRiderProfileId) {
      toast.warning("يرجى اختيار المندوب الجديد المستلم للحساب");
      return;
    }
    if (newRiderProfileId === oldRiderId) {
      toast.warning("يجب أن يكون المندوب الجديد مختلفًا عن المندوب الحالي");
      return;
    }
    if (!walletEvidenceFile) {
      toast.warning(
        "يرجى إرفاق صورة إثبات رصيد المحفظة (إلزامي في مراجعة التبديل)",
      );
      return;
    }
    if (!returnReason.trim() || !handoverReason.trim()) {
      toast.warning("يرجى إدخال سبب الإخلاء والتسليم لتبديل المندوب");
      return;
    }

    const todayIso = getRiyadhTodayIso();
    const isBackdated = businessDate < todayIso;
    if (isBackdated && !backdatedReason.trim()) {
      toast.warning("يرجى كتابة سبب التبديل بأثر رجعي");
      return;
    }

    let previousDayUsages = undefined;
    if (assignmentContextRef.current) {
      if (!assignmentContextRef.current.isValid) {
        toast.warning("يرجى استكمال توزيع استخدام اليوم السابق أولاً");
        return;
      }
      previousDayUsages = assignmentContextRef.current.getPreviousDayUsages();
    }

    setBusy(true);
    setStaleErrorBanner(null);
    try {
      const res = await createHungerRiderSwapReview(
        accId,
        {
          return: {
            action: "Return",
            riderProfileId: oldRiderId,
            supervisorEmployeeId: supervisorId,
            businessDate,
            mobileBalance: signedMobileBalance,
            provenAdjustments: 0,
            return: {
              effectiveTo: businessDate,
              status: "Ended",
              reason: returnReason.trim(),
              rowVersion:
                account.assignmentRowVersion ||
                account.activeAssignmentRowVersion ||
                account.rowVersion ||
                "",
              dayUsage: {
                ordersCount: Math.max(0, parseInt(ordersCount, 10) || 0),
              },
            },
          },
          handover: {
            actualRiderProfileId: newRiderProfileId,
            riderProfileId: newRiderProfileId,
            effectiveFrom: businessDate,
            reason: handoverReason.trim(),
            wasBackdated: isBackdated,
            backdatedReason: isBackdated ? backdatedReason.trim() : null,
            compensationModel,
            paymentModel: account.paymentModel || "Commission",
            previousDayUsages,
          },
          handoverExceptionApprovalId:
            handoverExceptionApprovalId.trim() || null,
        },
        walletEvidenceFile,
        { suppressErrorToast: true },
      );
      setSwapReview(res);
      toast.success(
        "تم إنشاء مراجعة تبديل المندوب للطرفين (الإخلاء والتسليم) بنجاح",
      );
    } catch (err) {
      toast.error(
        getHungerErrorMessage(err, "تعذر إنشاء مراجعة تبديل المندوب"),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmSwap = async () => {
    if (!swapReview?.swapId) return;
    setBusy(true);
    setStaleErrorBanner(null);
    try {
      await confirmHungerRiderSwap(swapReview.swapId, {
        suppressErrorToast: true,
      });
      onClose();
      setSwapReview(null);
      await onSuccess();
    } catch (err) {
      if (isWalletReviewExpiredOrSuperseded(err)) {
        const msg =
          "انتهت صلاحية المراجعة أو استُبدلت بمراجعة أحدث — أنشئ مراجعة جديدة";
        setStaleErrorBanner(msg);
        toast.error(msg);
      } else {
        toast.error(
          getHungerErrorMessage(err, "تعذر تأكيد تبديل المندوب"),
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`تبديل المندوب — ${account?.externalAccountId || account?.accountName || ""}`}
    >
      <div className="space-y-4">
        {/* Atomic swap & standalone confirmation rules notice */}
        <div className="space-y-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs text-indigo-950 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-200">
          <div className="flex items-center gap-2 font-bold">
            <ArrowLeftRight className="h-4 w-4 shrink-0" />
            <span>
              تبديل المندوب الذري (Atomic Rider Swap): ينجح الطرفان معًا (إخلاء
              المندوب السابق وتسليم المندوب الجديد) في معاملة واحدة، أو لا يتغير
              شيء على الإطلاق.
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-800 dark:text-indigo-300">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>
              ملاحظة هامة: يُحتسب رصيد الإقفال السابق والتسويات المثبتة تلقائيًا من النظام (الفاتورة / الإقفال الشهري).
            </span>
          </div>
        </div>

        {staleErrorBanner && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-bold text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{staleErrorBanner}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
              المشرف المسؤول *
            </label>
            <SearchableSelect
              options={supervisorOptions}
              value={supervisorId}
              onChange={setSupervisorId}
              placeholder="اختر المشرف..."
            />
          </div>

          <DateInput
            label="تاريخ التبديل الموحد (إخلاء وتسليم) *"
            value={businessDate}
            onChange={setBusinessDate}
          />
        </div>

        {/* Mobile Balance with 3 exclusive sign controls (+ / - / 0) + Wallet Evidence File */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 p-3">
            <label className="block text-xs font-bold text-[var(--foreground)]">
              رصيد الجوال الحالي (اختر الإشارة ثم المقدار) *
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBalanceSign("+")}
                className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                  balanceSign === "+"
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                + موجب
              </button>
              <button
                type="button"
                onClick={() => setBalanceSign("-")}
                className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                  balanceSign === "-"
                    ? "border-rose-600 bg-rose-600 text-white"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                − سالب
              </button>
              <button
                type="button"
                onClick={() => {
                  setBalanceSign("0");
                  setBalanceMagnitude("0.00");
                }}
                className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                  balanceSign === "0"
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                0 صفر
              </button>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Input
                type="number"
                min="0"
                step="0.01"
                disabled={balanceSign === "0"}
                value={balanceSign === "0" ? "0.00" : balanceMagnitude}
                onChange={(e) => setBalanceMagnitude(e.target.value)}
                placeholder="المقدار"
              />
              <span
                className="shrink-0 rounded-lg bg-[var(--surface)] px-2.5 py-2 font-mono text-xs font-extrabold text-[var(--foreground)]"
                dir="ltr"
              >
                {signedMobileBalance >= 0
                  ? `+${signedMobileBalance.toFixed(2)}`
                  : signedMobileBalance.toFixed(2)}{" "}
                SAR
              </span>
            </div>
          </div>

          <div className="space-y-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 p-3">
            <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)]">
              <FileImage className="h-4 w-4 text-blue-600" />
              <span>صورة إثبات رصيد المحفظة (إلزامي) *</span>
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
              onChange={(e) =>
                handleWalletFileChange(e.target.files?.[0] ?? null)
              }
              className="block w-full text-xs text-[var(--muted)] file:mr-2 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950/60 dark:file:text-blue-300"
            />
            {walletEvidenceError && (
              <p className="text-[11px] font-bold text-rose-600">
                {walletEvidenceError}
              </p>
            )}
            {walletEvidencePreview && (
              <div className="flex items-center gap-2 pt-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={walletEvidencePreview}
                  alt="معاينة إثبات المحفظة"
                  className="h-10 w-10 rounded border object-cover"
                />
                <span className="truncate text-[11px] text-emerald-700 dark:text-emerald-300">
                  {walletEvidenceFile?.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Return & Handover Inputs Side-by-Side */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Leg 1: Old Rider Return */}
          <div className="space-y-3 rounded-xl border border-rose-200/80 bg-rose-50/30 p-3.5 dark:border-rose-900/40 dark:bg-rose-950/10">
            <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">
              الطرف الأول: إخلاء المندوب الحالي ({oldRiderName})
            </h4>
            <Input
              label="سبب إخلاء المندوب السابق *"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="تبديل المندوب"
            />
            <Input
              label="عدد طلبات المندوب السابق في يوم التبديل (dayUsage.ordersCount)"
              type="number"
              min="0"
              value={ordersCount}
              onChange={(e) => setOrdersCount(e.target.value)}
            />
          </div>

          {/* Leg 2: New Rider Handover */}
          <div className="space-y-3 rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/10">
            <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              الطرف الثاني: تسليم المندوب الجديد
            </h4>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                المندوب الجديد المستلم (يجب أن يختلف عن الحالي) *
              </label>
              <SearchableSelect
                options={filteredNewRiderOptions}
                value={newRiderProfileId}
                onChange={setNewRiderProfileId}
                placeholder="اختر المندوب الجديد..."
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                نظام المحاسبة
              </label>
              <select
                value={compensationModel}
                onChange={(e) =>
                  setCompensationModel(
                    e.target.value as HungerCompensationModel,
                  )
                }
                disabled={!canFieldCompensation}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium disabled:opacity-60"
              >
                {HUNGER_COMPENSATION_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.labelAr}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="سبب تسليم المندوب الجديد *"
              value={handoverReason}
              onChange={(e) => setHandoverReason(e.target.value)}
              placeholder="تبديل المندوب"
            />

            {businessDate < getRiyadhTodayIso() && (
              <Input
                label="سبب التبديل بأثر رجعي *"
                value={backdatedReason}
                onChange={(e) => setBackdatedReason(e.target.value)}
                placeholder="سبب التبديل بتاريخ سابق"
              />
            )}
          </div>
        </div>

        {/* NonZeroHandover Exception selection / request section */}
        {(swapReview?.handover.requiresException ||
          approvedExceptions.length > 0 ||
          signedMobileBalance < 0) && (
          <div className="space-y-2.5 rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 text-xs dark:border-amber-800 dark:bg-amber-950/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-950 dark:text-amber-100">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <span>
                  استثناء تسليم برصيد مرحّل غير صفري (handoverExceptionApprovalId)
                </span>
              </div>
              <Button
                variant="secondary"
                onClick={() => void loadApprovedExceptions()}
                disabled={loadingExceptions}
              >
                <RefreshCw className="ml-1 h-3.5 w-3.5" />
                تحديث الاستثناءات المعتمدة
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold">
                  اختر استثناءً معتمدًا (Approved) لهذا الحساب:
                </label>
                <select
                  value={handoverExceptionApprovalId}
                  onChange={(e) =>
                    setHandoverExceptionApprovalId(e.target.value)
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs"
                >
                  <option value="">-- بدون استثناء --</option>
                  {approvedExceptions.map((ex) => (
                    <option key={ex.exceptionId} value={ex.exceptionId}>
                      {ex.exceptionId.slice(0, 8)} — المبلغ: {ex.amount} SAR —{" "}
                      {ex.reason}
                    </option>
                  ))}
                </select>
              </div>

              {canRequestException && (
                <div className="space-y-1.5">
                  <Input
                    label="طلب استثناء جديد (السبب)"
                    value={exceptionReason}
                    onChange={(e) => setExceptionReason(e.target.value)}
                    placeholder="سبب التسليم برصيد غير صفري..."
                  />
                  <Button
                    variant="secondary"
                    onClick={() => void handleRequestHandoverException()}
                    disabled={requestingException}
                  >
                    {requestingException
                      ? "جارٍ إرسال الطلب..."
                      : "طلب استثناء NonZeroHandover"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {newRiderProfileId && (
          <AssignmentContextSection
            ref={assignmentContextRef}
            accountId={account?.accountId || account?.id}
            riderProfileId={newRiderProfileId}
            businessDate={businessDate}
          />
        )}

        {/* Both Legs Review Results Side-by-Side */}
        {swapReview && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <WalletReviewResultCard
                title={`نتيجة الإخلاء (Return) — ${oldRiderName}`}
                review={swapReview.return}
              />
              <WalletReviewResultCard
                title="نتيجة التسليم (Handover) — المندوب الجديد"
                review={swapReview.handover}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            إلغاء
          </Button>
          <Button
            variant={swapReview ? "secondary" : "primary"}
            onClick={() => void handleReviewSwap()}
            disabled={busy}
          >
            {busy
              ? "جارٍ فحص التبديل..."
              : swapReview
                ? "إعادة إنشاء مراجعة التبديل"
                : "1. مراجعة تبديل المندوب (الطرفين)"}
          </Button>
          {swapReview && (
            <Button
              variant="primary"
              onClick={() => void handleConfirmSwap()}
              disabled={busy || !canConfirmSwap}
            >
              {busy
                ? "جارٍ الاعتماد..."
                : "2. تأكيد التبديل النهائي للطرفين معًا"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
