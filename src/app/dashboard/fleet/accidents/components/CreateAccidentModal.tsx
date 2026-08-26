"use client";

import { useEffect, useState, useTransition } from "react";
import { createVehicleAccident, getVehiclesLookup } from "@/lib/fleet/api";
import { listExternalRiders } from "@/lib/workforce/external-riders-api";
import { VehicleAccidentSeverity } from "@/lib/fleet/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAccidentModal({ isOpen, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();

  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicles, setVehicles] = useState<{value: string, label: string}[]>([]);
  
  const [riderSearch, setRiderSearch] = useState("");
  const [riders, setRiders] = useState<{value: string, label: string}[]>([]);

  const [formData, setFormData] = useState({
    vehicleId: "",
    riderProfileId: "",
    occurredAtUtc: new Date().toISOString().split("T")[0],
    locationDescription: "",
    policeReportNumber: "",
    insuranceClaimNumber: "",
    severity: VehicleAccidentSeverity.Moderate,
    isDrivable: false,
    hasInjuries: false,
    injuryDetails: "",
    thirdPartyDetails: "",
    damageDescription: "",
    faultAssessment: "",
    narrative: "",
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        vehicleId: "",
        riderProfileId: "",
        occurredAtUtc: new Date().toISOString().split("T")[0],
        locationDescription: "",
        policeReportNumber: "",
        insuranceClaimNumber: "",
        severity: VehicleAccidentSeverity.Moderate,
        isDrivable: false,
        hasInjuries: false,
        injuryDetails: "",
        thirdPartyDetails: "",
        damageDescription: "",
        faultAssessment: "",
        narrative: "",
      });
      setVehicles([]);
      setRiders([]);
      setVehicleSearch("");
      setRiderSearch("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (vehicleSearch.length >= 2) {
      const timer = setTimeout(() => {
        getVehiclesLookup(vehicleSearch).then(res => {
          setVehicles(res.map(v => ({ value: v.id, label: `${v.assetNumber} - ${v.plateNumberAr || "بدون لوحة"}` })));
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [vehicleSearch]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.riderProfileId || !formData.narrative) {
      toast.error("خطأ", "بيانات غير مكتملة (المركبة، المندوب، تقرير الحادث).");
      return;
    }

    startTransition(async () => {
      try {
        await createVehicleAccident({
          ...formData,
          occurredAtUtc: new Date(formData.occurredAtUtc).toISOString(),
        });
        onSuccess();
      } catch (err) {}
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسجيل حادث سير" maxWidth="max-w-4xl">
      <form onSubmit={handleSubmit} className="space-y-6 pt-4">
        
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">المركبة <span className="text-red-500">*</span></label>
            <div className="relative">
              <Input placeholder="ابحث برقم المركبة أو اللوحة..." value={vehicleSearch} onChange={(e) => setVehicleSearch(e.target.value)} className="mb-2" />
              <SearchableSelect
                options={vehicles}
                value={formData.vehicleId}
                onChange={(v) => setFormData({ ...formData, vehicleId: v })}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">المندوب (السائق) <span className="text-red-500">*</span></label>
            <div className="relative">
              <Input placeholder="ابحث بالاسم أو الإقامة..." value={riderSearch} onChange={(e) => setRiderSearch(e.target.value)} className="mb-2" />
              <SearchableSelect
                options={riders}
                value={formData.riderProfileId}
                onChange={(v) => setFormData({ ...formData, riderProfileId: v })}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">تاريخ ووقت الحادث <span className="text-red-500">*</span></label>
            <Input type="date" value={formData.occurredAtUtc} onChange={(e) => setFormData({ ...formData, occurredAtUtc: e.target.value })} required />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-slate-700">موقع الحادث (المدينة، الحي، الشارع)</label>
            <Input value={formData.locationDescription} onChange={(e) => setFormData({ ...formData, locationDescription: e.target.value })} />
          </div>
        </div>

        {/* Status & Severity */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">خطورة الحادث</label>
              <SearchableSelect
                options={[
                  { value: VehicleAccidentSeverity.Minor.toString(), label: "بسيط (خدوش، صدمة خفيفة)" },
                  { value: VehicleAccidentSeverity.Moderate.toString(), label: "متوسط (يحتاج صيانة)" },
                  { value: VehicleAccidentSeverity.Serious.toString(), label: "خطير (تلفيات كبيرة)" },
                  { value: VehicleAccidentSeverity.Critical.toString(), label: "حرج (تلف كلي)" },
                ]}
                value={formData.severity.toString()}
                onChange={(v) => setFormData({ ...formData, severity: parseInt(v) as VehicleAccidentSeverity })}
              />
            </div>
            <div className="flex flex-col gap-3 justify-center">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDrivable}
                  onChange={(e) => setFormData({ ...formData, isDrivable: e.target.checked })}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                المركبة قابلة للقيادة حالياً (لا تحتاج لسطحة)
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-red-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hasInjuries}
                  onChange={(e) => setFormData({ ...formData, hasInjuries: e.target.checked })}
                  className="h-5 w-5 rounded border-red-300 text-red-600 focus:ring-red-600"
                />
                يوجد إصابات بشرية في الحادث
              </label>
            </div>
          </div>
        </div>

        {/* References */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">رقم تقرير المرور / نجم</label>
            <Input value={formData.policeReportNumber} onChange={(e) => setFormData({ ...formData, policeReportNumber: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">رقم مطالبة التأمين (إن وجد)</label>
            <Input value={formData.insuranceClaimNumber} onChange={(e) => setFormData({ ...formData, insuranceClaimNumber: e.target.value })} />
          </div>
        </div>

        {/* Narrative & Assessment */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">وصف الحادث والأضرار (مختصر) <span className="text-red-500">*</span></label>
          <textarea
            className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-[#1167c9] focus:outline-none"
            rows={3}
            value={formData.narrative}
            onChange={(e) => setFormData({ ...formData, narrative: e.target.value })}
            placeholder="يرجى وصف ما حدث بشكل واضح..."
            required
          ></textarea>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">تفاصيل الطرف الثالث (إن وجد)</label>
            <textarea
              className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-[#1167c9] focus:outline-none"
              rows={2}
              value={formData.thirdPartyDetails}
              onChange={(e) => setFormData({ ...formData, thirdPartyDetails: e.target.value })}
              placeholder="بيانات المركبة الأخرى..."
            ></textarea>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">نسبة الخطأ / التقييم المبدئي</label>
            <textarea
              className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-[#1167c9] focus:outline-none"
              rows={2}
              value={formData.faultAssessment}
              onChange={(e) => setFormData({ ...formData, faultAssessment: e.target.value })}
              placeholder="مثال: الخطأ 100% على الطرف الآخر..."
            ></textarea>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={isPending} className="bg-red-600 hover:bg-red-700">
            {isPending ? "جارٍ الحفظ..." : "تسجيل تقرير الحادث"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
