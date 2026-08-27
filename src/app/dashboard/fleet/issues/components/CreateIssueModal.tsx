"use client";

import { useEffect, useState, useTransition } from "react";
import { createVehicleIssue, getVehiclesLookup } from "@/lib/fleet/api";
import { VehicleIssueCategory, VehicleIssueSeverity } from "@/lib/fleet/types";
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

export function CreateIssueModal({ isOpen, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();

  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicles, setVehicles] = useState<{value: string, label: string}[]>([]);

  const [formData, setFormData] = useState({
    vehicleId: "",
    category: VehicleIssueCategory.Problem,
    severity: VehicleIssueSeverity.Medium,
    description: "",
    reportedAtUtc: new Date().toISOString().split("T")[0], // Keep date portion for form
    locationDescription: "",
    odometerAtReport: 0,
    blocksOperation: false,
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        vehicleId: "",
        category: VehicleIssueCategory.Problem,
        severity: VehicleIssueSeverity.Medium,
        description: "",
        reportedAtUtc: new Date().toISOString().split("T")[0],
        locationDescription: "",
        odometerAtReport: 0,
        blocksOperation: false,
      });
      getVehiclesLookup("").then((res) => {
        setVehicles(
          res.map((v) => ({
            value: v.id,
            label: `${v.assetNumber} - ${v.plateNumberAr || "بدون لوحة"}`,
          }))
        );
      });
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.description) {
      toast.error("خطأ", "بيانات غير مكتملة (المركبة، الوصف).");
      return;
    }

    startTransition(async () => {
      try {
        await createVehicleIssue({
          ...formData,
          reportedAtUtc: new Date(formData.reportedAtUtc).toISOString(),
        });
        onSuccess();
      } catch (err) {}
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسجيل بلاغ عطل / مشكلة" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4 pt-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">المركبة <span className="text-red-500">*</span></label>
            <SearchableSelect
              options={vehicles}
              value={formData.vehicleId}
              placeholder="اختر المركبة..."
              searchPlaceholder="بحث برقم المركبة أو اللوحة..."
              onChange={(v) => setFormData({ ...formData, vehicleId: v })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">تاريخ البلاغ <span className="text-red-500">*</span></label>
            <Input type="date" value={formData.reportedAtUtc} onChange={(e) => setFormData({ ...formData, reportedAtUtc: e.target.value })} required />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">تصنيف المشكلة</label>
            <SearchableSelect
              options={[
                { value: VehicleIssueCategory.Problem.toString(), label: "عطل ميكانيكي / فني" },
                { value: VehicleIssueCategory.Accident.toString(), label: "حادث" },
                { value: VehicleIssueCategory.Theft.toString(), label: "سرقة" },
                { value: VehicleIssueCategory.Damage.toString(), label: "تلفيات خارجية" },
                { value: VehicleIssueCategory.Administrative.toString(), label: "مشكلة إدارية (أوراق، غرامات...)" },
              ]}
              value={formData.category.toString()}
              onChange={(v) => setFormData({ ...formData, category: parseInt(v) as VehicleIssueCategory })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">الأهمية / الخطورة</label>
            <SearchableSelect
              options={[
                { value: VehicleIssueSeverity.Low.toString(), label: "منخفضة" },
                { value: VehicleIssueSeverity.Medium.toString(), label: "متوسطة" },
                { value: VehicleIssueSeverity.High.toString(), label: "عالية" },
                { value: VehicleIssueSeverity.Critical.toString(), label: "حرجة جداً" },
              ]}
              value={formData.severity.toString()}
              onChange={(v) => setFormData({ ...formData, severity: parseInt(v) as VehicleIssueSeverity })}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">وصف المشكلة <span className="text-red-500">*</span></label>
          <textarea
            className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-[#1167c9] focus:outline-none"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="يرجى وصف المشكلة بالتفصيل..."
            required
          ></textarea>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">العداد وقت البلاغ (إن وجد)</label>
            <Input type="number" min="0" value={formData.odometerAtReport} onChange={(e) => setFormData({ ...formData, odometerAtReport: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">موقع المركبة</label>
            <Input value={formData.locationDescription} onChange={(e) => setFormData({ ...formData, locationDescription: e.target.value })} placeholder="مثال: ورشة الصيانة، الشارع الفلاني..." />
          </div>
        </div>

        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3">
          <input
            type="checkbox"
            id="blocksOperation"
            checked={formData.blocksOperation}
            onChange={(e) => setFormData({ ...formData, blocksOperation: e.target.checked })}
            className="h-5 w-5 rounded border-red-300 text-red-600 focus:ring-red-600 cursor-pointer"
          />
          <label htmlFor="blocksOperation" className="text-sm font-bold text-red-800 cursor-pointer">
            هذا العطل يمنع المركبة من التشغيل (إيقاف المركبة)
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={isPending} className="bg-[#1167c9] hover:bg-[#0e56a8]">
            {isPending ? "جارٍ الحفظ..." : "تسجيل البلاغ"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
