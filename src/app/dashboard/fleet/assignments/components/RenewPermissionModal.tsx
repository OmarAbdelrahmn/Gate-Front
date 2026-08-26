"use client";

import { useEffect, useState, useTransition } from "react";
import { renewVehiclePermission, getVehicleDetail } from "@/lib/fleet/api";
import type { VehicleSummaryResponse } from "@/lib/fleet/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedVehicle: VehicleSummaryResponse | null;
}

export function RenewPermissionModal({ isOpen, onClose, onSuccess, preselectedVehicle }: Props) {
  const [isPending, startTransition] = useTransition();
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [rowVersion, setRowVersion] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [formData, setFormData] = useState({
    permissionStartsOn: new Date().toISOString().split("T")[0],
    permissionReference: "",
    reason: "",
  });

  useEffect(() => {
    if (isOpen && preselectedVehicle && preselectedVehicle.currentAssignmentId) {
      setLoadingDetails(true);
      getVehicleDetail(preselectedVehicle.id).then(res => {
        if (res.summary.currentAssignmentId) {
          setAssignmentId(res.summary.currentAssignmentId);
          setRowVersion(res.summary.rowVersion);
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
      toast.error("خطأ", "بيانات غير مكتملة.");
      return;
    }

    startTransition(async () => {
      try {
        await renewVehiclePermission(assignmentId, {
          permissionStartsOn: formData.permissionStartsOn,
          permissionReference: formData.permissionReference,
          reason: formData.reason,
          rowVersion,
        });
        onSuccess();
      } catch (err) {}
    });
  };

  if (loadingDetails) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="تجديد تفويض المركبة">
        <div className="p-8 text-center text-[var(--muted)]">جارٍ جلب البيانات...</div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تجديد تفويض المركبة" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        
        {preselectedVehicle && (
          <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-xl border border-orange-100 dark:border-orange-900/50 mb-4">
            <h4 className="font-bold text-orange-800 dark:text-orange-300 mb-2 text-sm">تفويض مركبة المندوب: {preselectedVehicle.currentRiderName}</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-orange-900 dark:text-orange-200">
              <div>المركبة: <span className="font-bold">{preselectedVehicle.assetNumber}</span></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">تاريخ بداية التفويض</label>
            <Input type="date" value={formData.permissionStartsOn} onChange={(e) => setFormData({ ...formData, permissionStartsOn: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">رقم التفويض الجديد <span className="text-red-500">*</span></label>
            <Input value={formData.permissionReference} onChange={(e) => setFormData({ ...formData, permissionReference: e.target.value })} required />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">السبب</label>
          <Input value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} placeholder="مثال: انتهاء التفويض السابق، طلب المندوب..." />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={isPending} className="bg-orange-600 hover:bg-orange-700">
            {isPending ? "جارٍ الحفظ..." : "تأكيد تجديد التفويض"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
