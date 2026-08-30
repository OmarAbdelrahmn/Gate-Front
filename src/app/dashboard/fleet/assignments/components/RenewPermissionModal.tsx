"use client";

import { useEffect, useState, useTransition } from "react";
import { renewVehiclePermission, getVehicleDetail, getVehicleAssignment, getRiderVehicleTimeline } from "@/lib/fleet/api";
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
      const activeAssignmentId = preselectedVehicle.currentAssignmentId;
      setAssignmentId(activeAssignmentId);

      getVehicleDetail(preselectedVehicle.id)
        .then(async (res) => {
          if (!res.summary.currentAssignmentId) {
            toast.error("تنبيه", "المركبة غير مسلمة حالياً.");
            onClose();
            return;
          }

          let foundRowVersion: string | null = null;
          try {
            const assignment = await getVehicleAssignment(activeAssignmentId);
            if (assignment?.rowVersion) {
              foundRowVersion = assignment.rowVersion;
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
              }
            } catch (e) {}
          }

          setRowVersion(foundRowVersion || res.summary.rowVersion);
        })
        .finally(() => setLoadingDetails(false));
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
              {(() => {
                const realInfo = preselectedVehicle.realRider;
                const isNotRealRider = preselectedVehicle.isRealRider === false || !!realInfo?.name;

                if (!isNotRealRider || !realInfo?.name) return null;

                return (
                  <div className="col-span-2 mt-1 pt-2 border-t border-orange-200/60 dark:border-orange-800/60 text-xs text-purple-900 dark:text-purple-200">
                    <span className="font-bold text-purple-700 dark:text-purple-300">السائق الفعلي للمركبة: </span>
                    <span>
                      {realInfo.name}
                      {realInfo.iqamaNo ? ` (رقم الإقامة: ${realInfo.iqamaNo})` : ""}
                      {realInfo.relationshipToAssignedRider ? ` - صلة القرابة: ${realInfo.relationshipToAssignedRider}` : ""}
                    </span>
                  </div>
                );
              })()}
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
