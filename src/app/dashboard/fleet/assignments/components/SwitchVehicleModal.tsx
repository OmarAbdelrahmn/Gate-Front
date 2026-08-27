"use client";

import { useEffect, useState, useTransition } from "react";
import { switchVehicle, getVehicleDetail, getVehiclesLookup, getVehicleAssignment, getRiderVehicleTimeline } from "@/lib/fleet/api";
import { VehicleCondition, type VehicleSummaryResponse } from "@/lib/fleet/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedVehicle: VehicleSummaryResponse | null; // This is the old vehicle
}

export function SwitchVehicleModal({ isOpen, onClose, onSuccess, preselectedVehicle }: Props) {
  const [isPending, startTransition] = useTransition();
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [rowVersion, setRowVersion] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [vehicleSearch, setVehicleSearch] = useState("");
  const [availableVehicles, setAvailableVehicles] = useState<{value: string, label: string}[]>([]);

  const [formData, setFormData] = useState({
    newVehicleId: "",
    switchedAtUtc: new Date().toISOString().split("T")[0],
    oldVehicleOdometer: 0,
    newVehicleOdometer: 0,
    oldVehicleCondition: VehicleCondition.Good,
    newVehicleCondition: VehicleCondition.Good,
    oldFuelLevelPercentage: 100,
    newFuelLevelPercentage: 100,
    permissionReference: "",
    reason: "",
  });

  const [files, setFiles] = useState<File[]>([]);

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

          setFormData((prev) => ({
            ...prev,
            oldVehicleOdometer: res.summary.currentOdometer,
          }));

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
      setFiles([]);
    }
  }, [isOpen, preselectedVehicle]);

  // Debounced search for new vehicles
  useEffect(() => {
    if (vehicleSearch.length >= 2) {
      const timer = setTimeout(() => {
        getVehiclesLookup(vehicleSearch).then(res => {
          // Exclude the current vehicle
          const filtered = res.filter(v => v.id !== preselectedVehicle?.id);
          setAvailableVehicles(filtered.map(v => ({ value: v.id, label: `${v.assetNumber} - ${v.plateNumberAr || "بدون لوحة"}` })));
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [vehicleSearch, preselectedVehicle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentId || !rowVersion || !formData.newVehicleId) {
      toast.error("خطأ", "بيانات التبديل غير مكتملة.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = new FormData();
        payload.append("currentAssignmentId", assignmentId);
        payload.append("newVehicleId", formData.newVehicleId);
        payload.append("switchedAtUtc", new Date(formData.switchedAtUtc).toISOString());
        payload.append("oldVehicleOdometer", formData.oldVehicleOdometer.toString());
        payload.append("newVehicleOdometer", formData.newVehicleOdometer.toString());
        payload.append("oldVehicleCondition", formData.oldVehicleCondition.toString());
        payload.append("newVehicleCondition", formData.newVehicleCondition.toString());
        payload.append("oldFuelLevelPercentage", formData.oldFuelLevelPercentage.toString());
        payload.append("newFuelLevelPercentage", formData.newFuelLevelPercentage.toString());
        payload.append("reason", formData.reason);
        payload.append("rowVersion", rowVersion);
        if (formData.permissionReference) payload.append("permissionReference", formData.permissionReference);
        
        files.forEach((file) => {
          payload.append("promissoryFiles", file);
        });

        await switchVehicle(payload);
        onSuccess();
      } catch (err) {}
    });
  };

  if (loadingDetails) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="تبديل مركبة">
        <div className="p-8 text-center text-[var(--muted)]">جارٍ جلب البيانات...</div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تبديل مركبة (استلام وتسليم في نفس الوقت)" maxWidth="max-w-4xl">
      <form onSubmit={handleSubmit} className="space-y-6 pt-4">
        
        {preselectedVehicle && (
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 mb-4">
            <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 text-sm">تبديل مركبة المندوب: {preselectedVehicle.currentRiderName}</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-blue-900 dark:text-blue-200">
              <div>المركبة الحالية: <span className="font-bold">{preselectedVehicle.assetNumber}</span></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Old Vehicle Form */}
          <div className="space-y-4 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b pb-2">المركبة القديمة (المسترجعة)</h3>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">تاريخ التبديل <span className="text-red-500">*</span></label>
              <Input type="date" value={formData.switchedAtUtc} onChange={(e) => setFormData({ ...formData, switchedAtUtc: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">العداد عند الإرجاع <span className="text-red-500">*</span></label>
              <Input type="number" min="0" value={formData.oldVehicleOdometer} onChange={(e) => setFormData({ ...formData, oldVehicleOdometer: parseInt(e.target.value) || 0 })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">مستوى الوقود (%)</label>
              <Input type="number" min="0" max="100" value={formData.oldFuelLevelPercentage} onChange={(e) => setFormData({ ...formData, oldFuelLevelPercentage: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">حالة المركبة القديمة</label>
              <SearchableSelect
                options={[
                  { value: VehicleCondition.Good.toString(), label: "جيدة" },
                  { value: VehicleCondition.Fair.toString(), label: "مقبولة" },
                  { value: VehicleCondition.Damaged.toString(), label: "متضررة" },
                  { value: VehicleCondition.Unsafe.toString(), label: "غير آمنة" },
                ]}
                value={formData.oldVehicleCondition.toString()}
                onChange={(v) => setFormData({ ...formData, oldVehicleCondition: parseInt(v) as VehicleCondition })}
              />
            </div>
          </div>

          {/* New Vehicle Form */}
          <div className="space-y-4 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-xl bg-emerald-50/30 dark:bg-emerald-950/10">
            <h3 className="font-bold text-emerald-800 dark:text-emerald-400 border-b border-emerald-200 dark:border-emerald-900/50 pb-2">المركبة الجديدة (المسلمة)</h3>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">المركبة الجديدة <span className="text-red-500">*</span></label>
              <div className="relative">
                <Input 
                  placeholder="ابحث برقم المركبة أو اللوحة..." 
                  value={vehicleSearch} 
                  onChange={(e) => setVehicleSearch(e.target.value)} 
                  className="mb-2" 
                />
                <SearchableSelect
                  options={availableVehicles}
                  value={formData.newVehicleId}
                  onChange={(v) => setFormData({ ...formData, newVehicleId: v })}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">العداد عند الاستلام <span className="text-red-500">*</span></label>
              <Input type="number" min="0" value={formData.newVehicleOdometer} onChange={(e) => setFormData({ ...formData, newVehicleOdometer: parseInt(e.target.value) || 0 })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">مستوى الوقود (%)</label>
              <Input type="number" min="0" max="100" value={formData.newFuelLevelPercentage} onChange={(e) => setFormData({ ...formData, newFuelLevelPercentage: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">حالة المركبة الجديدة</label>
              <SearchableSelect
                options={[
                  { value: VehicleCondition.Good.toString(), label: "جيدة" },
                  { value: VehicleCondition.Fair.toString(), label: "مقبولة" },
                  { value: VehicleCondition.Damaged.toString(), label: "متضررة" },
                ]}
                value={formData.newVehicleCondition.toString()}
                onChange={(v) => setFormData({ ...formData, newVehicleCondition: parseInt(v) as VehicleCondition })}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">سبب التبديل <span className="text-red-500">*</span></label>
            <Input value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} placeholder="مثال: عطل في المركبة القديمة، حادث..." required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">رقم التفويض (للمركبة الجديدة)</label>
            <Input value={formData.permissionReference} onChange={(e) => setFormData({ ...formData, permissionReference: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">مرفقات سند استلام المركبة الجديدة</label>
          <input 
            type="file" 
            multiple 
            onChange={(e) => setFiles(Array.from(e.target.files || []))} 
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
            {isPending ? "جارٍ الحفظ..." : "تأكيد التبديل"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
