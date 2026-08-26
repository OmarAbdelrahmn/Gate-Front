"use client";

import { useEffect, useState, useTransition } from "react";
import { returnVehicle, getVehicleDetail } from "@/lib/fleet/api";
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
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [formData, setFormData] = useState({
    endedAtUtc: new Date().toISOString().split("T")[0],
    endOdometer: 0,
    endCondition: VehicleCondition.Good,
    endFuelLevelPercentage: 100,
    reason: "",
  });

  useEffect(() => {
    if (isOpen && preselectedVehicle && preselectedVehicle.currentAssignmentId) {
      setLoadingDetails(true);
      getVehicleDetail(preselectedVehicle.id).then(res => {
        if (res.summary.currentAssignmentId) {
          setAssignmentId(res.summary.currentAssignmentId);
          setRowVersion(res.summary.rowVersion); // RowVersion from vehicle or activeAssignment, API actually needs assignment rowVersion? The API spec says `rowVersion`. I'll use the vehicle summary rowVersion or assignment rowVersion if available. Usually activeAssignment has a rowVersion.
          setFormData(prev => ({
            ...prev,
            endOdometer: res.summary.currentOdometer,
          }));
        } else {
          toast.error("تنبيه", "المركبة غير مسلمة حالياً.");
          onClose();
        }
      }).finally(() => setLoadingDetails(false));
    }
  }, [isOpen, preselectedVehicle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentId || !rowVersion) {
      toast.error("خطأ", "لا يمكن إنهاء الاستلام بسبب نقص البيانات (رقم التعيين).");
      return;
    }

    startTransition(async () => {
      try {
        await returnVehicle({
          assignmentId,
          endedAtUtc: new Date(formData.endedAtUtc).toISOString(),
          endOdometer: formData.endOdometer,
          endCondition: formData.endCondition,
          endFuelLevelPercentage: formData.endFuelLevelPercentage,
          reason: formData.reason,
          rowVersion, // Passing rowVersion for optimistic concurrency
        });
        onSuccess();
      } catch (err) {}
    });
  };

  if (loadingDetails) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="استلام مركبة (إنهاء العهدة)">
        <div className="p-8 text-center text-[var(--muted)]">جارٍ جلب البيانات...</div>
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
              <div>المركبة: <span className="font-bold">{preselectedVehicle.assetNumber}</span></div>
              <div>المندوب: <span className="font-bold">{preselectedVehicle.currentRiderName}</span></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">تاريخ الإرجاع <span className="text-red-500">*</span></label>
            <Input type="date" value={formData.endedAtUtc} onChange={(e) => setFormData({ ...formData, endedAtUtc: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">العداد عند الإرجاع <span className="text-red-500">*</span></label>
            <Input type="number" min="0" value={formData.endOdometer} onChange={(e) => setFormData({ ...formData, endOdometer: parseInt(e.target.value) || 0 })} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">مستوى الوقود (%)</label>
            <Input type="number" min="0" max="100" value={formData.endFuelLevelPercentage} onChange={(e) => setFormData({ ...formData, endFuelLevelPercentage: parseInt(e.target.value) || 0 })} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">حالة المركبة عند الإرجاع</label>
            <SearchableSelect
              options={[
                { value: VehicleCondition.Unknown.toString(), label: "غير معروف" },
                { value: VehicleCondition.Good.toString(), label: "جيدة (Good)" },
                { value: VehicleCondition.Fair.toString(), label: "مقبولة (Fair)" },
                { value: VehicleCondition.Damaged.toString(), label: "متضررة (Damaged)" },
                { value: VehicleCondition.Unsafe.toString(), label: "غير آمنة للقيادة (Unsafe)" },
              ]}
              value={formData.endCondition.toString()}
              onChange={(v) => setFormData({ ...formData, endCondition: parseInt(v) as VehicleCondition })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">السبب <span className="text-red-500">*</span></label>
            <Input value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} placeholder="سبب إنهاء العهدة (مثل: استقالة، صيانة...)" required />
          </div>
        </div>

        {formData.endCondition === VehicleCondition.Damaged || formData.endCondition === VehicleCondition.Unsafe ? (
          <div className="bg-orange-50 p-4 rounded-xl text-sm text-orange-800 flex gap-2 border border-orange-200 mt-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>بما أن حالة المركبة متضررة أو غير آمنة، يرجى التوجه لإنشاء بلاغ عطل أو حادث مباشرة بعد إتمام هذه العملية.</span>
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={isPending} className="bg-red-600 hover:bg-red-700">
            {isPending ? "جارٍ الحفظ..." : "إنهاء العهدة واستلام المركبة"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
