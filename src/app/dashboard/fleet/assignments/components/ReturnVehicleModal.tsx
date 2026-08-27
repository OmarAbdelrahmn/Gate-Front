"use client";

import { useEffect, useState, useTransition } from "react";
import { returnVehicle, getVehicleDetail, getVehicleAssignment, getRiderVehicleTimeline } from "@/lib/fleet/api";
import { VehicleCondition, type VehicleSummaryResponse } from "@/lib/fleet/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { AlertTriangle } from "lucide-react";

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

  useEffect(() => {
    if (isOpen && preselectedVehicle && preselectedVehicle.currentAssignmentId) {
      setLoadingDetails(true);
      const activeAssignmentId = preselectedVehicle.currentAssignmentId;
      setAssignmentId(activeAssignmentId);

      getVehicleDetail(preselectedVehicle.id)
        .then(async (res) => {
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

          // Fetch Assignment rowVersion specifically
          let foundRowVersion: string | null = null;
          let foundStartedAt: string | null = null;

          try {
            const assignment = await getVehicleAssignment(activeAssignmentId);
            if (assignment && assignment.rowVersion) {
              foundRowVersion = assignment.rowVersion;
              foundStartedAt = assignment.startedAtUtc;
              if (assignment.startOdometer) {
                setMinOdometer(assignment.startOdometer);
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
              if (activeItem?.assignment?.rowVersion) {
                foundRowVersion = activeItem.assignment.rowVersion;
                foundStartedAt = activeItem.assignment.startedAtUtc;
              }
            } catch (e) {
              console.error("Failed to fetch timeline:", e);
            }
          }

          if (foundRowVersion) {
            setRowVersion(foundRowVersion);
          } else {
            // Fallback to vehicle summary rowVersion if assignment rowVersion is unreachable
            setRowVersion(res.summary.rowVersion);
          }

          if (foundStartedAt) {
            setStartedAtUtc(foundStartedAt);
          }
        })
        .finally(() => setLoadingDetails(false));
    }
  }, [isOpen, preselectedVehicle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!assignmentId) {
      toast.error("خطأ", "معرّف التعيين غير موجود.");
      return;
    }

    if (!rowVersion) {
      toast.error("خطأ", "تعذر الحصول على إصدار البيانات (rowVersion) الخاص بالتعيين.");
      return;
    }

    if (!formData.reason || formData.reason.trim() === "") {
      toast.error("حقل مطلوب", "سبب إرجاع المركبة إجباري.");
      return;
    }

    if (formData.endOdometer < minOdometer) {
      toast.error(
        "قراءة عداد غير صحيحة",
        `لا يمكن أن تكون قراءة العداد عند الإرجاع (${formData.endOdometer}) أقل من العداد عند الاستلام (${minOdometer}).`
      );
      return;
    }

    const selectedEndedAt = new Date(formData.endedAtUtc);
    if (startedAtUtc) {
      const startedAt = new Date(startedAtUtc);
      if (selectedEndedAt < startedAt) {
        toast.error(
          "تاريخ غير صحيح",
          `تاريخ الإرجاع لا يمكن أن يكون قبل تاريخ بداية التعيين (${startedAt.toLocaleString("ar-SA")}).`
        );
        return;
      }
    }

    const safeFuel = Math.min(100, Math.max(0, Number(formData.endFuelLevelPercentage) || 0));

    startTransition(async () => {
      try {
        await returnVehicle({
          assignmentId,
          endedAtUtc: selectedEndedAt.toISOString(),
          endOdometer: formData.endOdometer,
          endCondition: formData.endCondition,
          endFuelLevelPercentage: safeFuel,
          reason: formData.reason.trim(),
          rowVersion, // Mandatory Assignment rowVersion
        });
        onSuccess();
      } catch (err: any) {
        console.error("Return vehicle error:", err);
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
    <Modal isOpen={isOpen} onClose={onClose} title="استلام مركبة (إنهاء العهدة)" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
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
              حالة المركبة عند الإرجاع
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
              onChange={(v) =>
                setFormData({ ...formData, endCondition: parseInt(v) as VehicleCondition })
              }
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

        {formData.endCondition === VehicleCondition.Damaged ||
        formData.endCondition === VehicleCondition.Unsafe ? (
          <div className="bg-orange-50 p-4 rounded-xl text-sm text-orange-800 flex gap-2 border border-orange-200 mt-2 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>
              بما أن حالة المركبة متضررة أو غير آمنة، يرجى التوجه لإنشاء بلاغ عطل أو حادث مباشرة بعد إتمام هذه العملية.
            </span>
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" disabled={isPending} className="bg-red-600 hover:bg-red-700">
            {isPending ? "جارٍ الحفظ..." : "إنهاء العهدة واستلام المركبة"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
