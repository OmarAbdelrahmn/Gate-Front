// src/app/admin/hunger/components/RiderSwapModal.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import {
  AssignmentContextSection,
  type AssignmentContextSectionRef,
} from "@/components/shared/AssignmentContextSection";
import {
  createHungerRiderSwapReview,
  confirmHungerRiderSwap,
  getRiyadhTodayIso,
  getHungerErrorMessage,
  isWalletReviewExpiredOrSuperseded,
  HUNGER_COMPENSATION_MODELS,
  type HungerAccountItem,
  type HungerCompensationModel,
  type HungerRiderSwapReviewResponse,
} from "@/lib/hunger/api";
import { WalletReviewResultCard } from "./WalletReviewResultCard";
import { AlertTriangle, ArrowLeftRight, Info } from "lucide-react";

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
  const [supervisorId, setSupervisorId] = useState(defaultSupervisorId);
  const [businessDate, setBusinessDate] = useState(getRiyadhTodayIso());
  const [mobileBalance, setMobileBalance] = useState(
    account?.lastWalletBalance !== undefined &&
      account?.lastWalletBalance !== null
      ? String(account.lastWalletBalance)
      : "0.00",
  );
  const [closingBalance, setClosingBalance] = useState(
    account?.lastClosingBalance !== undefined &&
      account?.lastClosingBalance !== null
      ? String(account.lastClosingBalance)
      : "",
  );
  const [provenAdjustments, setProvenAdjustments] = useState("0.00");
  const [walletEvidence, setWalletEvidence] = useState("");
  const [closingEvidence, setClosingEvidence] = useState("");
  const [adjustmentEvidence, setAdjustmentEvidence] = useState("");

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

  const oldRiderId =
    account?.assignedRiderProfileId ||
    account?.actualRider?.riderProfileId ||
    "";
  const oldRiderName =
    account?.assignedRiderNameAr ||
    account?.actualRider?.nameAr ||
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
    if (!walletEvidence.trim()) {
      toast.warning("يرجى إدخال مرجع إثبات رصيد المحفظة الحالي");
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

    const parsedClosing =
      closingBalance.trim() === ""
        ? null
        : parseFloat(closingBalance.replace(/,/g, "")) || 0;

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
            mobileBalance: String(mobileBalance).trim(),
            closingBalance: parsedClosing,
            provenAdjustments:
              parseFloat(String(provenAdjustments).replace(/,/g, "")) || 0,
            walletEvidence: walletEvidence.trim(),
            closingEvidence: closingEvidence.trim() || null,
            adjustmentEvidence: adjustmentEvidence.trim() || null,
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
        },
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
              ملاحظة هامة: لا يمكن تأكيد أي طرف من أطراف تبديل المندوب بشكل
              منفرد عبر تأكيد المراجعة العادية المنفردة.
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label="رصيد الجوال الحالي (+ / - / 0) *"
            value={mobileBalance}
            onChange={(e) => setMobileBalance(e.target.value)}
            placeholder="مثال: 100.00 أو -50.00"
          />
          <Input
            label="رصيد الإقفال السابق (اختياري)"
            type="number"
            step="0.01"
            value={closingBalance}
            onChange={(e) => setClosingBalance(e.target.value)}
            placeholder="اتركه فارغًا إن لم يُسجل"
          />
          <Input
            label="التسويات المثبتة"
            type="number"
            step="0.01"
            value={provenAdjustments}
            onChange={(e) => setProvenAdjustments(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label="مرجع إثبات المحفظة *"
            value={walletEvidence}
            onChange={(e) => setWalletEvidence(e.target.value)}
            placeholder="رقم السند / صورة الشاشة"
          />
          <Input
            label="مرجع إثبات الإقفال (اختياري)"
            value={closingEvidence}
            onChange={(e) => setClosingEvidence(e.target.value)}
          />
          <Input
            label="مرجع إثبات التسويات (اختياري)"
            value={adjustmentEvidence}
            onChange={(e) => setAdjustmentEvidence(e.target.value)}
          />
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
