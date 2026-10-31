"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Droplets,
  Eye,
  Gauge,
  History,
  Info,
  RefreshCw,
  ShieldAlert,
  User,
  Wrench,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import {
  commitOilChangeCancellation,
  getOilChangeDetails,
  previewOilChangeCancellation,
} from "@/lib/maintenance/api";
import {
  WorkOrderStatus,
  type OilChangeDetailsResponse,
  type OilChangeWorkflowResponse,
} from "@/lib/maintenance/types";
import {
  formatCurrency,
  formatDateTime,
  getVehicleTypeLabel,
  workOrderStatusConfig,
} from "@/lib/maintenance/constants";
import { useMaintenanceLookups } from "@/lib/maintenance/lookups";

export interface CancelOilChangeModalProps {
  isOpen: boolean;
  oilChangeId: string;
  vehicleLabel?: string | null;
  onClose: () => void;
  onSuccess?: (result: OilChangeWorkflowResponse) => void;
}

export function CancelOilChangeModal({
  isOpen,
  oilChangeId,
  vehicleLabel,
  onClose,
  onSuccess,
}: CancelOilChangeModalProps) {
  const {
    resolveRiderName,
    resolveLocationName,
    resolveBarrelNumber,
    resolveVehicleLabel,
    resolveWorkOrderLabel,
    resolveUserName,
  } = useMaintenanceLookups();

  const [details, setDetails] = useState<OilChangeDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [committing, setCommitting] = useState(false);

  const [reason, setReason] = useState("");
  const [requiresMileageBaseline, setRequiresMileageBaseline] = useState(false);
  const [mileageBaselineInput, setMileageBaselineInput] = useState("");

  const [previewResult, setPreviewResult] =
    useState<OilChangeWorkflowResponse | null>(null);
  const [concurrencyNotice, setConcurrencyNotice] = useState<string | null>(
    null,
  );
  const commitAttemptKeyRef = useRef<string | null>(null);

  const invalidatePreview = () => {
    setPreviewResult(null);
    commitAttemptKeyRef.current = null;
  };

  const loadOperation = async () => {
    setLoading(true);
    try {
      const det = await getOilChangeDetails(oilChangeId);
      setDetails(det);
    } catch (err: any) {
      toast.error(
        "تعذر تحميل تفاصيل العملية",
        err?.message || "يرجى المحاولة مرة أخرى.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !oilChangeId) return;
    setReason("");
    setRequiresMileageBaseline(false);
    setMileageBaselineInput("");
    setPreviewResult(null);
    setConcurrencyNotice(null);
    commitAttemptKeyRef.current = null;
    void loadOperation();
  }, [isOpen, oilChangeId]);

  const validate = (): boolean => {
    if (!details) return false;
    if (!reason.trim()) {
      toast.error("سبب الإلغاء مطلوب", "يرجى إدخال سبب إلغاء عملية غيار الزيت.");
      return false;
    }
    if (reason.trim().length > 1000) {
      toast.error("السبب طويل جداً", "يجب ألا يتجاوز سبب الإلغاء 1000 حرف.");
      return false;
    }
    if (requiresMileageBaseline && mileageBaselineInput.trim() === "") {
      toast.error(
        "قراءة الأساس مطلوبة",
        "يرجى إدخال قراءة العداد الأساسية المعتمدة (Mileage Baseline) لإعادة احتساب المسافات.",
      );
      return false;
    }
    return true;
  };

  const buildPayload = (expectedEffectsHash: string | null) => {
    const parsedBaseline =
      requiresMileageBaseline && mileageBaselineInput.trim() !== ""
        ? Number(mileageBaselineInput)
        : null;

    return {
      reason: reason.trim(),
      rowVersion: details!.operation.rowVersion,
      workOrderRowVersion: details?.workOrderRowVersion ?? null,
      expectedEffectsHash,
      mileageBaselineKm:
        parsedBaseline !== null && Number.isFinite(parsedBaseline)
          ? parsedBaseline
          : null,
    };
  };

  const handleRunPreview = async () => {
    if (!validate() || !details) return;
    setPreviewLoading(true);
    setConcurrencyNotice(null);
    try {
      const res = await previewOilChangeCancellation(
        oilChangeId,
        buildPayload(null),
      );
      setPreviewResult(res);
      commitAttemptKeyRef.current = null;
      toast.success(
        "تمت معاينة الإلغاء",
        "راجع تفاصيل استعادة المخزون وعكس التكاليف قبل التأكيد النهائي.",
      );
    } catch (err: any) {
      const code =
        err?.code ||
        err?.details?.errorCode ||
        err?.details?.title ||
        err?.errorCode;
      if (code === "maintenance.oil_change_mileage_basis_required") {
        setRequiresMileageBaseline(true);
      } else if (
        code === "maintenance.concurrency_conflict" ||
        code === "maintenance.oil_change_preview_changed"
      ) {
        setConcurrencyNotice(
          "تم تعديل السجل أو المخزون من قِبل مستخدم آخر. تم تحديث البيانات مع الاحتفاظ بسبب الإلغاء؛ يرجى طلب المعاينة مجدداً.",
        );
        await loadOperation();
      } else if (code === "maintenance.oil_change_cancelled") {
        await loadOperation();
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewResult || !details || !validate()) return;
    setCommitting(true);
    setConcurrencyNotice(null);
    commitAttemptKeyRef.current ??= crypto.randomUUID();
    try {
      const res = await commitOilChangeCancellation(
        oilChangeId,
        buildPayload(previewResult.effectsHash),
        commitAttemptKeyRef.current,
      );
      onSuccess?.(res);
      onClose();
    } catch (err: any) {
      const code =
        err?.code ||
        err?.details?.errorCode ||
        err?.details?.title ||
        err?.errorCode;
      if (
        code === "maintenance.concurrency_conflict" ||
        code === "maintenance.oil_change_preview_changed"
      ) {
        commitAttemptKeyRef.current = null;
        setPreviewResult(null);
        setConcurrencyNotice(
          "تغيرت بيانات السجل أو المخزون منذ إنشاء المعاينة. تم جلب أحدث نسخة؛ يرجى إعادة المعاينة قبل التأكيد.",
        );
        await loadOperation();
      } else if (code === "maintenance.oil_change_mileage_basis_required") {
        commitAttemptKeyRef.current = null;
        setPreviewResult(null);
        setRequiresMileageBaseline(true);
      } else if (code === "maintenance.oil_change_cancelled") {
        commitAttemptKeyRef.current = null;
        setPreviewResult(null);
        await loadOperation();
      }
    } finally {
      setCommitting(false);
    }
  };

  if (!isOpen) return null;

  const displayVehicle =
    vehicleLabel ||
    (details?.operation.vehicleId
      ? resolveVehicleLabel(details.operation.vehicleId)
      : details?.operation.maintenanceWorkOrderId
        ? resolveWorkOrderLabel(details.operation.maintenanceWorkOrderId)
        : "مركبة الخدمة");

  const isAlreadyCancelled = Boolean(details?.operation.isCancelled);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`إلغاء عملية غيار الزيت — ${displayVehicle}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5 text-right" dir="rtl">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            جارٍ تحميل تفاصيل عملية غيار الزيت...
          </div>
        ) : !details ? (
          <div className="py-10 text-center text-sm text-rose-600">
            تعذر تحميل بيانات عملية غيار الزيت.
          </div>
        ) : (
          <>
            {/* Warning / Explanation Banner */}
            <div className="p-4 rounded-2xl border border-rose-300 dark:border-rose-800/80 bg-rose-50/70 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100 text-xs space-y-2 leading-relaxed">
              <div className="flex items-center gap-2 font-black text-sm text-rose-900 dark:text-rose-200">
                <Ban size={18} className="text-rose-600 shrink-0" />
                <span>إلغاء محاسبي ومخزني موثق (مع الاحتفاظ بالسجل التاريخي للتدقيق)</span>
              </div>
              <ul className="list-disc pr-5 space-y-1 text-[11px] text-rose-800 dark:text-rose-200/90">
                <li>
                  يبقى السجل التاريخي للعملية محفوظاً لأغراض التدقيق والمراجعة ويُعلَّم بحالة <strong>ملغاة</strong>، وتصبح التكلفة النشطة للعملية <strong>0.00 ر.س</strong>.
                </li>
                <li>
                  يتم عكس صرف الزيت والفلتر وإعادة الكميات للمخزون في الشهر الحالي (أو تسجيلها كهالك إذا كان البرميل الأصلي قد أُغلق).
                </li>
                {!details.operation.vehicleId && (
                  <li>
                    <strong>تنبيه أوامر العمل الخارجية:</strong> في حال وجود مقبوضات مسددة من العميل الخارجي، تبقى سندات القبض محفوظة وتتم تسوية رصيد العميل بشكل منفصل.
                  </li>
                )}
              </ul>
            </div>

            {/* Operation Summary Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {displayVehicle}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                    {getVehicleTypeLabel(details.operation.vehicleType)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                    <History size={12} />
                    <span>مراجعة #{details.operation.revisionNumber ?? 0}</span>
                  </span>
                </div>

                {isAlreadyCancelled && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                    <ShieldAlert size={14} />
                    <span>هذه العملية ملغاة بالفعل</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">تاريخ الخدمة</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {formatDateTime(
                      details.operation.effectiveServiceAtUtc ||
                        details.operation.performedAtUtc,
                    )}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">قراءة العداد</span>
                  <strong className="font-mono text-slate-800 dark:text-slate-200">
                    {Number(
                      details.operation.odometerAtChange ?? 0,
                    ).toLocaleString()}{" "}
                    كم
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">الكمية والفلتر</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {details.operation.oilQuantityLiters} لتر •{" "}
                    {details.operation.oilFilterChanged ? "مع فلتر" : "بدون فلتر"}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">التكلفة المسجلة</span>
                  <strong className="font-mono text-rose-700 dark:text-rose-400">
                    {formatCurrency(details.operation.totalCost)}
                  </strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span>
                  المستودع:{" "}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {resolveLocationName(
                      details.inventoryLocationId ||
                        details.operation.inventoryLocationId,
                    )}
                  </strong>
                </span>
                <span>
                  السائق المرتبط:{" "}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {resolveRiderName(details.operation.riderProfileId)}
                  </strong>
                </span>
              </div>

              {isAlreadyCancelled && details.cancelledAtUtc && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                  <p className="font-bold">
                    تم الإلغاء بتاريخ {formatDateTime(details.cancelledAtUtc)}{" "}
                    بواسطة {resolveUserName(details.cancelledByUserId)}
                  </p>
                  {details.cancellationReason && (
                    <p>سبب الإلغاء: {details.cancellationReason}</p>
                  )}
                </div>
              )}
            </div>

            {concurrencyNotice && (
              <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/90 dark:border-amber-800 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                <RefreshCw
                  size={16}
                  className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                />
                <div className="space-y-1">
                  <p className="font-bold">تنبيه تزامن البيانات</p>
                  <p>{concurrencyNotice}</p>
                </div>
              </div>
            )}

            {!isAlreadyCancelled && (
              <>
                {/* Reason Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    سبب إلغاء عملية غيار الزيت <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    disabled={committing}
                    maxLength={1000}
                    onChange={(e) => {
                      setReason(e.target.value);
                      invalidatePreview();
                    }}
                    placeholder="اكتب سبب الإلغاء بوضوح لتوثيقه في سجل المراجعات والتدقيق..."
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-relaxed outline-none focus:border-rose-600 dark:text-white"
                  />
                </div>

                {/* Mileage Baseline Input if required */}
                {requiresMileageBaseline && (
                  <div className="p-3.5 rounded-xl border border-rose-300 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-950/30 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-black text-rose-900 dark:text-rose-200">
                      <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                      <span>
                        مطلوب إدخال قراءة العداد الأساسية المعتمدة (Mileage Baseline Km)
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-800 dark:text-rose-300">
                      تعد هذه العملية نقطة ارتكاز لعداد المسافات ولا تتوفر قراءة أساس سابقة موثوقة. يرجى إدخال قراءة الأساس الموثقة للمركبة لإتمام عكس القراءة:
                    </p>
                    <Input
                      type="number"
                      min={0}
                      placeholder="أدخل قراءة الأساس المعتمدة بالكم..."
                      value={mileageBaselineInput}
                      onChange={(e) => {
                        setMileageBaselineInput(e.target.value);
                        invalidatePreview();
                      }}
                    />
                  </div>
                )}

                {/* Preview Trigger Bar */}
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3">
                  <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <Info size={16} className="text-rose-600 shrink-0" />
                    <span>
                      يلزم معاينة آثار الإلغاء أولاً للتحقق من استعادة كميات البراميل والعداد والتكاليف قبل تأكيد الإلغاء.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    loading={previewLoading}
                    disabled={previewLoading || committing}
                    onClick={handleRunPreview}
                    className="shrink-0 gap-1.5 text-xs font-bold"
                  >
                    <Eye size={14} />
                    <span>
                      {previewResult ? "تحديث معاينة الإلغاء" : "معاينة آثار الإلغاء"}
                    </span>
                  </Button>
                </div>
              </>
            )}

            {/* Preview Result */}
            {previewResult && (
              <div className="rounded-2xl border-2 border-rose-300 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/20 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-rose-200 dark:border-rose-800/80 pb-3">
                  <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-black text-sm">
                    <CheckCircle2 size={18} className="text-rose-600" />
                    <span>معاينة آثار الإلغاء وعكس الحركات</span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                    جاهز لتأكيد الإلغاء
                  </span>
                </div>

                {/* Closed Barrel Waste Banner */}
                {previewResult.effects.returnedAsWasteLiters > 0 && (
                  <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/50 text-amber-950 dark:text-amber-100 text-xs space-y-1">
                    <div className="flex items-center gap-2 font-black text-sm text-amber-900 dark:text-amber-200">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                      <span>الكمية المرتجعة من البرميل المغلق سُجلت كهالك</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      نظراً لأن البرميل المسحوب منه مغلق حالياً (فارغ أو مرتجع)، سيتم تسجيل الكمية المعكوسة والبالغة{" "}
                      <strong className="font-mono underline">
                        {previewResult.effects.returnedAsWasteLiters} لتر
                      </strong>{" "}
                      كهالك مخزني على المستودع، ويبقى البرميل مغلقاً دون زيادة الرصيد المتاح.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">التكلفة النشطة بعد الإلغاء</span>
                    <strong className="font-mono text-sm text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(previewResult.effects.totalCost)}
                    </strong>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">عداد المركبة بعد الإلغاء</span>
                    <strong className="font-mono text-sm text-blue-700 dark:text-blue-300">
                      {previewResult.effects.vehicleMileageKm != null
                        ? `${Number(previewResult.effects.vehicleMileageKm).toLocaleString()} كم`
                        : "بدون تغيير"}
                    </strong>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">ذمة السائق النشطة</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {previewResult.effects.riderProfileId
                        ? resolveRiderName(previewResult.effects.riderProfileId)
                        : "تم إخلاء التكلفة (0 ر.س)"}
                    </strong>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">حالة أمر العمل الناتجة</span>
                    <strong className="text-rose-700 dark:text-rose-300">
                      {previewResult.effects.workOrderStatus != null
                        ? workOrderStatusConfig[
                            previewResult.effects.workOrderStatus as WorkOrderStatus
                          ]?.label || "ملغي / محدث"
                        : "عملية مباشرة (ملغاة)"}
                    </strong>
                  </div>
                </div>

                {/* Reversed Barrels */}
                {previewResult.effects.barrels &&
                  previewResult.effects.barrels.length > 0 && (
                    <div className="space-y-1.5">
                      <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        استعادة الكميات للبراميل:
                      </h5>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                            <tr>
                              <th className="px-3 py-2 font-bold">رقم البرميل</th>
                              <th className="px-3 py-2 font-bold">الكمية المعكوسة / المستردة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {previewResult.effects.barrels.map((b, idx) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">
                                  {resolveBarrelNumber(b.barrelId, b.barrelNumber)}
                                </td>
                                <td className="px-3 py-2 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                  {b.reversedLiters} لتر
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={committing}
              >
                تراجع
              </Button>
              {!isAlreadyCancelled && (
                <Button
                  type="button"
                  variant="danger"
                  loading={committing}
                  disabled={!previewResult || previewLoading || committing}
                  onClick={handleCommit}
                  className="gap-1.5 font-bold"
                >
                  <Ban size={15} />
                  <span>تأكيد إلغاء غيار الزيت</span>
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
