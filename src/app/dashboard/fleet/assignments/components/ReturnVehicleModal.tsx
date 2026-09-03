"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import {
  returnVehicle,
  returnVehicleWithConditionReport,
  getVehicleDetail,
  getVehicleAssignment,
  getRiderVehicleTimeline,
} from "@/lib/fleet/api";
import {
  VehicleCondition,
  type VehicleSummaryResponse,
  type ReturnVehicleRequest,
  type VehicleConditionReport,
} from "@/lib/fleet/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { AlertTriangle, ClipboardList } from "lucide-react";
import { VehicleConditionReportModal } from "./VehicleConditionReportModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedVehicle: VehicleSummaryResponse | null;
}

export function ReturnVehicleModal({ isOpen, onClose, onSuccess, preselectedVehicle }: Props) {
  const [isPending, startTransition] = useTransition();
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [rowVersion, setRowVersion] = useState<string | null>(null);
  const [minOdometer, setMinOdometer] = useState<number>(0);
  const [startedAtUtc, setStartedAtUtc] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [formData, setFormData] = useState({
    endedAtUtc: new Date().toISOString().slice(0, 16), // YYYY-MM-THH:mm for datetime-local
    endOdometer: 0,
    endCondition: VehicleCondition.Good,
    endFuelLevelPercentage: 100,
    reason: "",
  });

  const [activeAssignmentRealRider, setActiveAssignmentRealRider] = useState<{
    isRealRider?: boolean;
    realRider?: { name: string; iqamaNo: string; relationshipToAssignedRider: string } | null;
  } | null>(null);

  // Condition Report Modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [lastPayloadFingerprint, setLastPayloadFingerprint] = useState<string | null>(null);

  const fetchAssignmentData = async () => {
    if (!preselectedVehicle || !preselectedVehicle.currentAssignmentId) return;
    setLoadingDetails(true);
    setActiveAssignmentRealRider(null);
    const activeAssignmentId = preselectedVehicle.currentAssignmentId;
    setAssignmentId(activeAssignmentId);

    try {
      const res = await getVehicleDetail(preselectedVehicle.id);
      if (!res.summary.currentAssignmentId) {
        toast.error("تنبيه", "المركبة غير مسلمة حالياً.");
        onClose();
        return;
      }

      setMinOdometer(res.summary.currentOdometer || 0);
      setFormData((prev) => ({
        ...prev,
        endOdometer: res.summary.currentOdometer || 0,
      }));

      let foundRowVersion: string | null = null;
      let foundStartedAt: string | null = null;

      try {
        const assignment = await getVehicleAssignment(activeAssignmentId);
        if (assignment) {
          if (assignment.rowVersion) {
            foundRowVersion = assignment.rowVersion;
          }
          foundStartedAt = assignment.startedAtUtc;
          if (assignment.startOdometer) {
            setMinOdometer(assignment.startOdometer);
          }
          if (assignment.isRealRider !== undefined) {
            setActiveAssignmentRealRider({
              isRealRider: assignment.isRealRider,
              realRider: assignment.realRider,
            });
          }
        }
      } catch (e) {
        console.warn("Failed to fetch assignment directly, trying timeline...", e);
      }

      if (!foundRowVersion && res.summary.currentRiderProfileId) {
        try {
          const timeline = await getRiderVehicleTimeline(res.summary.currentRiderProfileId);
          const activeItem = timeline?.find(
            (t) => t.assignment.id === activeAssignmentId || t.assignment.status === 1
          );
          if (activeItem?.assignment) {
            if (activeItem.assignment.rowVersion) {
              foundRowVersion = activeItem.assignment.rowVersion;
            }
            foundStartedAt = activeItem.assignment.startedAtUtc;
            if (activeItem.assignment.isRealRider !== undefined) {
              setActiveAssignmentRealRider({
                isRealRider: activeItem.assignment.isRealRider,
                realRider: activeItem.assignment.realRider,
              });
            }
          }
        } catch (e) {
          console.error("Failed to fetch timeline:", e);
        }
      }

      if (foundRowVersion) {
        setRowVersion(foundRowVersion);
      } else {
        setRowVersion(res.summary.rowVersion);
      }

      if (foundStartedAt) {
        setStartedAtUtc(foundStartedAt);
      }
    } catch (err) {
      console.error("Error loading return vehicle details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (isOpen && preselectedVehicle && preselectedVehicle.currentAssignmentId) {
      fetchAssignmentData();
    }
  }, [isOpen, preselectedVehicle]);

  // Handle condition change: close report modal if condition changes to Good
  const handleConditionChange = (newCondition: VehicleCondition) => {
    setFormData((prev) => ({ ...prev, endCondition: newCondition }));
    if (newCondition === VehicleCondition.Good) {
      setIsReportModalOpen(false);
      setIdempotencyKey(null);
      setLastPayloadFingerprint(null);
    }
  };

  const needsConditionReport = formData.endCondition !== VehicleCondition.Good;

  const validateMainForm = (): ReturnVehicleRequest | null => {
    if (!assignmentId) {
      toast.error("خطأ", "معرّف التعيين غير موجود.");
      return null;
    }

    if (!rowVersion) {
      toast.error("خطأ", "تعذر الحصول على إصدار البيانات (rowVersion) الخاص بالتعيين.");
      return null;
    }

    if (!formData.reason || formData.reason.trim() === "") {
      toast.error("حقل مطلوب", "سبب إرجاع المركبة إجباري.");
      return null;
    }

    if (formData.endOdometer < minOdometer) {
      toast.error(
        "قراءة عداد غير صحيحة",
        `لا يمكن أن تكون قراءة العداد عند الإرجاع (${formData.endOdometer}) أقل من العداد عند الاستلام (${minOdometer}).`
      );
      return null;
    }

    const selectedEndedAt = new Date(formData.endedAtUtc);
    if (startedAtUtc) {
      const startedAt = new Date(startedAtUtc);
      if (selectedEndedAt < startedAt) {
        toast.error(
          "تاريخ غير صحيح",
          `تاريخ الإرجاع لا يمكن أن يكون قبل تاريخ بداية التعيين (${startedAt.toLocaleString("ar-SA")}).`
        );
        return null;
      }
    }

    const safeFuel = Math.min(100, Math.max(0, Number(formData.endFuelLevelPercentage) || 0));

    return {
      assignmentId,
      endedAtUtc: selectedEndedAt.toISOString(),
      endOdometer: formData.endOdometer,
      endCondition: formData.endCondition,
      endFuelLevelPercentage: safeFuel,
      reason: formData.reason.trim(),
      rowVersion,
    };
  };

  const handleSubmitMain = (e: React.FormEvent) => {
    e.preventDefault();
    const returnPayload = validateMainForm();
    if (!returnPayload) return;

    if (needsConditionReport) {
      // Open Condition Report Modal
      setIsReportModalOpen(true);
    } else {
      // Direct Good Return
      startTransition(async () => {
        try {
          const res = await returnVehicle(returnPayload);
          console.log("Good Return Vehicle API Response:", res);
          setIsReportModalOpen(false);
          onSuccess();
        } catch (err: any) {
          console.error("Good return vehicle error:", err);
          if (err?.details?.errorCode === "fleet.concurrency_conflict") {
            await fetchAssignmentData();
          } else if (err?.details?.errorCode === "fleet.not_found") {
            onClose();
            onSuccess();
          }
        }
      });
    }
  };

  // Submit Non-Good Return with Condition Report
  const handleConditionReportSubmit = async (
    report: VehicleConditionReport,
    evidenceFiles: File[]
  ) => {
    const returnPayload = validateMainForm();
    if (!returnPayload) return;

    // Generate or reuse Idempotency Key based on payload fingerprint
    const currentFingerprint = JSON.stringify({
      returnPayload,
      report,
      files: evidenceFiles.map((f) => `${f.name}_${f.size}_${f.lastModified}`),
    });

    let activeKey = idempotencyKey;
    if (!activeKey || currentFingerprint !== lastPayloadFingerprint) {
      activeKey = crypto.randomUUID();
      setIdempotencyKey(activeKey);
      setLastPayloadFingerprint(currentFingerprint);
    }

    startTransition(async () => {
      try {
        const res = await returnVehicleWithConditionReport(
          returnPayload,
          report,
          evidenceFiles,
          activeKey
        );
        console.log("Non-Good Return with Condition Report API Response:", res);
        setIsReportModalOpen(false);
        onSuccess();
      } catch (err: any) {
        console.error("Non-good return vehicle error:", err);
        const errorCode = err?.details?.errorCode || err?.code;

        if (errorCode === "fleet.return_condition_report_required") {
          toast.error("خطأ في تقرير الحالة", "تقرير حالة المركبة مطلوب ومكتمل البيانات للحالة المختارة.");
        } else if (errorCode === "fleet.return_condition_report_not_allowed") {
          toast.error("تنبيه", "حالة المركبة جيدة. جاري تنفيذ الإرجاع القياسي...");
          setIsReportModalOpen(false);
          handleConditionChange(VehicleCondition.Good);
        } else if (errorCode === "fleet.invalid_file") {
          toast.error("ملف غير صالح", "الملف المرفق غير صالح. يرجى التاكد من رفع صور أو مستندات PDF بحجم لا يتجاوز 10 ميجابايت.");
        } else if (errorCode === "fleet.idempotency_required" || errorCode === "fleet.idempotency_conflict") {
          // Generate a fresh key and retry
          const newKey = crypto.randomUUID();
          setIdempotencyKey(newKey);
          toast.error("تنبيه", "تم تحديث رمز تكرار الطلب. يرجى إعادة المحاولة.");
        } else if (errorCode === "fleet.concurrency_conflict") {
          toast.error(
            "تعارض بالتزامن",
            "تم تحديث بيانات التعيين من مستخدم آخر. تم إعادة تحميل البيانات، يرجى المراجعة."
          );
          await fetchAssignmentData();
        } else if (errorCode === "fleet.not_found") {
          toast.error("خطأ", "التعيين غير موجود أو تم إغلاقه.");
          setIsReportModalOpen(false);
          onClose();
          onSuccess();
        } else if (errorCode === "fleet.forbidden") {
          toast.error("صلاحية غير كافية", "عفواً، لا تملك الصلاحيات المطلوبة لهذا الإجراء.");
        }
      }
    });
  };

  if (loadingDetails) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="استلام مركبة (إنهاء العهدة)">
        <div className="p-8 text-center text-[var(--muted)]">جارٍ جلب بيانات التعيين والعهدة...</div>
      </Modal>
    );
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="استلام مركبة (إنهاء العهدة)" maxWidth="max-w-2xl">
        <form onSubmit={handleSubmitMain} className="space-y-4 pt-4">
          {preselectedVehicle && (
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 mb-4">
              <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 text-sm">بيانات المركبة والمندوب</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-blue-900 dark:text-blue-200">
                <div>
                  المركبة: <span className="font-bold">{preselectedVehicle.assetNumber}</span>
                </div>
                <div>
                  المندوب: <span className="font-bold">{preselectedVehicle.currentRiderName || "—"}</span>
                </div>
                {(() => {
                  const realInfo = preselectedVehicle.realRider || activeAssignmentRealRider?.realRider;
                  const isNotRealRider =
                    preselectedVehicle.isRealRider === false ||
                    activeAssignmentRealRider?.isRealRider === false ||
                    !!realInfo?.name;

                  if (!isNotRealRider || !realInfo?.name) return null;

                  return (
                    <div className="col-span-2 mt-1 pt-2 border-t border-blue-200/60 dark:border-blue-800/60 text-xs text-purple-900 dark:text-purple-200">
                      <span className="font-bold text-purple-700 dark:text-purple-300">السائق الفعلي للمركبة: </span>
                      <span>
                        {realInfo.name}
                        {realInfo.iqamaNo ? ` (رقم الإقامة: ${realInfo.iqamaNo})` : ""}
                        {realInfo.relationshipToAssignedRider
                          ? ` - صلة القرابة: ${realInfo.relationshipToAssignedRider}`
                          : ""}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                تاريخ ووقت الإرجاع <span className="text-red-500">*</span>
              </label>
              <Input
                type="datetime-local"
                value={formData.endedAtUtc}
                onChange={(e) => setFormData({ ...formData, endedAtUtc: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                العداد عند الإرجاع <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min={minOdometer}
                value={formData.endOdometer}
                onChange={(e) => setFormData({ ...formData, endOdometer: parseInt(e.target.value) || 0 })}
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">الحد الأدنى: {minOdometer} كم</span>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                مستوى الوقود (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.endFuelLevelPercentage}
                onChange={(e) =>
                  setFormData({ ...formData, endFuelLevelPercentage: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                حالة المركبة عند الإرجاع <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={[
                  { value: VehicleCondition.Unknown.toString(), label: "غير معروف (Unknown)" },
                  { value: VehicleCondition.Good.toString(), label: "جيدة (Good)" },
                  { value: VehicleCondition.Fair.toString(), label: "مقبولة (Fair)" },
                  { value: VehicleCondition.Damaged.toString(), label: "متضررة (Damaged)" },
                  { value: VehicleCondition.Unsafe.toString(), label: "غير آمنة للقيادة (Unsafe)" },
                ]}
                value={formData.endCondition.toString()}
                onChange={(v) => handleConditionChange(parseInt(v) as VehicleCondition)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                السبب <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="سبب إنهاء العهدة (مثل: نهاية الدوام، استقالة...)"
                required
              />
            </div>
          </div>

          {needsConditionReport ? (
            <div className="bg-amber-50 p-4 rounded-xl text-sm text-amber-800 flex gap-2 border border-amber-200 mt-2 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
              <ClipboardList className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold">تنبيه: اخترت حالة مركبة غير جيدة</p>
                <p className="text-xs mt-0.5">
                  عند الضغط على المتابعة، سيفتح نموذج &quot;تقرير حالة المركبة&quot; لتوثيق المشكلة ومسؤولية السائق والتكلفة وإرفاق الأدلة.
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className={needsConditionReport ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-red-600 hover:bg-red-700"}
            >
              {isPending
                ? "جارٍ الحفظ..."
                : needsConditionReport
                ? "متابعة إلى تقرير حالة المركبة"
                : "إنهاء العهدة واستلام المركبة"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Vehicle Condition Report Modal stacked over main return form */}
      <VehicleConditionReportModal
        isOpen={isReportModalOpen && needsConditionReport}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleConditionReportSubmit}
        isSubmitting={isPending}
        endCondition={formData.endCondition}
        vehicleInfo={{
          assetNumber: preselectedVehicle?.assetNumber,
          riderName: preselectedVehicle?.currentRiderName,
        }}
      />
    </>
  );
}
