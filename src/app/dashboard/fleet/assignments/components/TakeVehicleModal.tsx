"use client";

import { useEffect, useState, useTransition } from "react";
import { takeVehicle, getVehiclesLookup } from "@/lib/fleet/api";
import { listExternalRiders } from "@/lib/workforce/external-riders-api";
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
  preselectedVehicle: VehicleSummaryResponse | null;
}

export function TakeVehicleModal({ isOpen, onClose, onSuccess, preselectedVehicle }: Props) {
  const [isPending, startTransition] = useTransition();

  const [riderSearch, setRiderSearch] = useState("");
  const [riders, setRiders] = useState<{value: string, label: string}[]>([]);
  
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicles, setVehicles] = useState<{value: string, label: string}[]>([]);

  const [formData, setFormData] = useState({
    riderProfileId: "",
    vehicleId: "",
    startedAtUtc: new Date().toISOString().split("T")[0],
    startOdometer: 0,
    startCondition: VehicleCondition.Good,
    startFuelLevelPercentage: 100,
    permissionReference: "",
    reason: "",
    notes: "",
  });

  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (preselectedVehicle) {
        setFormData(prev => ({
          ...prev, 
          vehicleId: preselectedVehicle.id,
          startOdometer: preselectedVehicle.currentOdometer
        }));
        setVehicles([{ value: preselectedVehicle.id, label: `${preselectedVehicle.assetNumber} - ${preselectedVehicle.plateNumberAr || "بدون لوحة"}` }]);
      } else {
        setFormData({
          riderProfileId: "",
          vehicleId: "",
          startedAtUtc: new Date().toISOString().split("T")[0],
          startOdometer: 0,
          startCondition: VehicleCondition.Good,
          startFuelLevelPercentage: 100,
          permissionReference: "",
          reason: "",
          notes: "",
        });
        setVehicles([]);
      }
      setFiles([]);
    }
  }, [isOpen, preselectedVehicle]);

  useEffect(() => {
    if (riderSearch.length >= 2) {
      const timer = setTimeout(() => {
        listExternalRiders().then(res => {
          const filtered = res.filter(r => 
            r.fullNameAr.includes(riderSearch) || (r.iqamaNo && r.iqamaNo.includes(riderSearch))
          );
          setRiders(filtered.map(r => ({ value: r.riderProfileId || r.employeeId, label: `${r.fullNameAr} (${r.iqamaNo || "—"})` })));
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [riderSearch]);

  useEffect(() => {
    if (vehicleSearch.length >= 2 && !preselectedVehicle) {
      const timer = setTimeout(() => {
        getVehiclesLookup(vehicleSearch).then(res => {
          setVehicles(res.map(v => ({ value: v.id, label: `${v.assetNumber} - ${v.plateNumberAr || "بدون لوحة"}` })));
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [vehicleSearch, preselectedVehicle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.riderProfileId || !formData.vehicleId) {
      toast.error("خطأ", "يجب تحديد المندوب والمركبة.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = new FormData();
        payload.append("riderProfileId", formData.riderProfileId);
        payload.append("vehicleId", formData.vehicleId);
        payload.append("startedAtUtc", new Date(formData.startedAtUtc).toISOString());
        payload.append("startOdometer", formData.startOdometer.toString());
        payload.append("startCondition", formData.startCondition.toString());
        payload.append("startFuelLevelPercentage", formData.startFuelLevelPercentage.toString());
        if (formData.permissionReference) payload.append("permissionReference", formData.permissionReference);
        if (formData.reason) payload.append("reason", formData.reason);
        if (formData.notes) payload.append("notes", formData.notes);

        files.forEach((file) => {
          payload.append("promissoryFiles", file);
        });

        await takeVehicle(payload);
        onSuccess();
      } catch (err) {}
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسليم مركبة لمندوب (عهدة جديدة)" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">المركبة <span className="text-red-500">*</span></label>
            <div className="relative">
              {!preselectedVehicle && (
                <Input 
                  placeholder="ابحث برقم المركبة أو اللوحة..." 
                  value={vehicleSearch} 
                  onChange={(e) => setVehicleSearch(e.target.value)} 
                  className="mb-2" 
                />
              )}
              <SearchableSelect
                options={vehicles}
                value={formData.vehicleId}
                onChange={(v) => {
                  setFormData({ ...formData, vehicleId: v });
                }}
                disabled={!!preselectedVehicle}
              />
            </div>
          </div>
          
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">المندوب <span className="text-red-500">*</span></label>
            <Input 
              placeholder="ابحث بالاسم أو الإقامة..." 
              value={riderSearch} 
              onChange={(e) => setRiderSearch(e.target.value)} 
              className="mb-2" 
            />
            <SearchableSelect
              options={riders}
              value={formData.riderProfileId}
              onChange={(v) => setFormData({ ...formData, riderProfileId: v })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">تاريخ الاستلام <span className="text-red-500">*</span></label>
            <Input type="date" value={formData.startedAtUtc} onChange={(e) => setFormData({ ...formData, startedAtUtc: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">العداد عند التسليم <span className="text-red-500">*</span></label>
            <Input type="number" min="0" value={formData.startOdometer} onChange={(e) => setFormData({ ...formData, startOdometer: parseInt(e.target.value) || 0 })} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">مستوى الوقود (%)</label>
            <Input type="number" min="0" max="100" value={formData.startFuelLevelPercentage} onChange={(e) => setFormData({ ...formData, startFuelLevelPercentage: parseInt(e.target.value) || 0 })} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">حالة المركبة</label>
            <SearchableSelect
              options={[
                { value: VehicleCondition.Unknown.toString(), label: "غير معروف" },
                { value: VehicleCondition.Good.toString(), label: "جيدة (Good)" },
                { value: VehicleCondition.Fair.toString(), label: "مقبولة (Fair)" },
                { value: VehicleCondition.Damaged.toString(), label: "متضررة (Damaged)" },
              ]}
              value={formData.startCondition.toString()}
              onChange={(v) => setFormData({ ...formData, startCondition: parseInt(v) as VehicleCondition })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">رقم التفويض (إن وجد)</label>
            <Input value={formData.permissionReference} onChange={(e) => setFormData({ ...formData, permissionReference: e.target.value })} placeholder="PERM-123" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">مرفقات (سند استلام / تفويض)</label>
          <input 
            type="file" 
            multiple 
            onChange={(e) => setFiles(Array.from(e.target.files || []))} 
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">السبب / ملاحظات</label>
          <Input value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} placeholder="سبب تسليم العهدة..." />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {isPending ? "جارٍ الحفظ..." : "تأكيد الاستلام"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
