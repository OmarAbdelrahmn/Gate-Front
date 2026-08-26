"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getVehicleModels,
  createVehicleModel,
  updateVehicleModel,
  getVehicleManufacturers,
} from "@/lib/fleet/api";
import type { VehicleModelResponse, VehicleModelRequest, VehicleManufacturerResponse } from "@/lib/fleet/types";
import { VehicleCatalogStatus, VehicleType, VehicleFuelType } from "@/lib/fleet/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import { Plus, Edit2, Search, RefreshCw, CheckCircle2, XCircle, Archive } from "lucide-react";

export function ModelsTab() {
  const { can } = useAuth();
  const [data, setData] = useState<VehicleModelResponse[]>([]);
  const [manufacturers, setManufacturers] = useState<VehicleManufacturerResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterManufacturer, setFilterManufacturer] = useState("");
  const [isPending, startTransition] = useTransition();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VehicleModelResponse | null>(null);
  const [formData, setFormData] = useState<VehicleModelRequest>({
    vehicleManufacturerId: "",
    code: "",
    nameAr: "",
    nameEn: "",
    vehicleType: VehicleType.Car,
    defaultFuelType: VehicleFuelType.Petrol,
    status: VehicleCatalogStatus.Active,
    rowVersion: null,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [modelsRes, mfgRes] = await Promise.all([
        getVehicleModels(filterManufacturer || undefined),
        getVehicleManufacturers(),
      ]);
      setData(modelsRes);
      setManufacturers(mfgRes.filter(m => m.status !== VehicleCatalogStatus.Archived));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterManufacturer]);

  const filtered = data.filter(
    (item) =>
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.nameAr.includes(search) ||
      item.nameEn.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      vehicleManufacturerId: filterManufacturer || (manufacturers.length > 0 ? manufacturers[0].id : ""),
      code: "",
      nameAr: "",
      nameEn: "",
      vehicleType: VehicleType.Car,
      defaultFuelType: VehicleFuelType.Petrol,
      status: VehicleCatalogStatus.Active,
      rowVersion: null,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: VehicleModelResponse) => {
    setEditingItem(item);
    setFormData({
      vehicleManufacturerId: item.vehicleManufacturerId,
      code: item.code,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      vehicleType: item.vehicleType,
      defaultFuelType: item.defaultFuelType,
      status: item.status,
      rowVersion: item.rowVersion,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.nameAr || !formData.nameEn || !formData.vehicleManufacturerId) {
      toast.error("تنبيه", "يرجى تعبئة الحقول المطلوبة.");
      return;
    }

    startTransition(async () => {
      try {
        if (editingItem) {
          await updateVehicleModel(editingItem.id, {
            ...formData,
            rowVersion: editingItem.rowVersion,
          });
        } else {
          await createVehicleModel(formData);
        }
        setIsModalOpen(false);
        loadData();
      } catch (err: any) {
        // Handled by fetch
      }
    });
  };

  const getManufacturerName = (id: string) => {
    const m = manufacturers.find(x => x.id === id);
    return m ? m.nameAr : "غير معروف";
  };

  const renderStatusBadge = (status: VehicleCatalogStatus) => {
    switch (status) {
      case VehicleCatalogStatus.Active:
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" /> نشط</Badge>;
      case VehicleCatalogStatus.Disabled:
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200"><XCircle className="h-3 w-3 mr-1" /> معطل</Badge>;
      case VehicleCatalogStatus.Archived:
        return <Badge className="bg-slate-100 text-slate-600 border-slate-300"><Archive className="h-3 w-3 mr-1" /> مؤرشف</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-4">
          <div className="relative min-w-[240px]">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث عن موديل..." className="pr-10" />
          </div>
          <div className="min-w-[200px]">
            <SearchableSelect
              options={[{ value: "", label: "جميع الصنّاع" }, ...manufacturers.map(m => ({ value: m.id, label: m.nameAr }))]}
              value={filterManufacturer}
              onChange={setFilterManufacturer}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {can("fleet.vehicles.manage") && (
            <Button onClick={handleOpenAdd} className="gap-2 bg-[#1167c9] hover:bg-[#0e56a8]">
              <Plus className="h-4 w-4" /> إضافة موديل
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-[var(--muted)]">جارٍ التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-[var(--muted)]">لا توجد بيانات مطابقة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-4">رمز الموديل</th>
                  <th className="px-6 py-4">الاسم (عربي)</th>
                  <th className="px-6 py-4">الصانع</th>
                  <th className="px-6 py-4">النوع / الوقود</th>
                  <th className="px-6 py-4">الحالة</th>
                  {can("fleet.vehicles.manage") && <th className="px-6 py-4 text-center">الإجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-blue-500/5">
                    <td className="px-6 py-4 font-mono font-bold">{item.code}</td>
                    <td className="px-6 py-4">{item.nameAr} <span className="text-xs text-[var(--muted)]">({item.nameEn})</span></td>
                    <td className="px-6 py-4">{getManufacturerName(item.vehicleManufacturerId)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs text-[var(--muted)]">
                        <span>نوع: {item.vehicleType}</span>
                        <span>وقود: {item.defaultFuelType}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{renderStatusBadge(item.status)}</td>
                    {can("fleet.vehicles.manage") && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="rounded-lg p-2 text-[var(--muted)] hover:bg-blue-50 hover:text-[#1167c9]"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? "تعديل الموديل" : "إضافة موديل جديد"}>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">الصانع <span className="text-red-500">*</span></label>
            <SearchableSelect
              options={manufacturers.map(m => ({ value: m.id, label: m.nameAr }))}
              value={formData.vehicleManufacturerId}
              onChange={(val) => setFormData({ ...formData, vehicleManufacturerId: val })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">رمز الموديل <span className="text-red-500">*</span></label>
            <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="COROLLA" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">الاسم بالعربية <span className="text-red-500">*</span></label>
              <Input value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">الاسم بالإنجليزية <span className="text-red-500">*</span></label>
              <Input value={formData.nameEn} onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">النوع</label>
              <SearchableSelect
                options={[
                  { value: VehicleType.Car.toString(), label: "سيارة" },
                  { value: VehicleType.Motorcycle.toString(), label: "دراجة نارية" },
                  { value: VehicleType.Van.toString(), label: "فان" },
                  { value: VehicleType.Truck.toString(), label: "شاحنة" },
                  { value: VehicleType.Other.toString(), label: "أخرى" },
                ]}
                value={formData.vehicleType.toString()}
                onChange={(val) => setFormData({ ...formData, vehicleType: parseInt(val) as VehicleType })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">الوقود</label>
              <SearchableSelect
                options={[
                  { value: VehicleFuelType.Petrol.toString(), label: "بنزين" },
                  { value: VehicleFuelType.Diesel.toString(), label: "ديزل" },
                  { value: VehicleFuelType.Electric.toString(), label: "كهربائي" },
                  { value: VehicleFuelType.Hybrid.toString(), label: "هجين" },
                ]}
                value={formData.defaultFuelType.toString()}
                onChange={(val) => setFormData({ ...formData, defaultFuelType: parseInt(val) as VehicleFuelType })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">الحالة</label>
              <SearchableSelect
                options={[
                  { value: VehicleCatalogStatus.Active.toString(), label: "نشط" },
                  { value: VehicleCatalogStatus.Disabled.toString(), label: "معطل" },
                ]}
                value={formData.status.toString()}
                onChange={(val) => setFormData({ ...formData, status: parseInt(val) as VehicleCatalogStatus })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
            <Button type="submit" disabled={isPending} className="bg-[#1167c9] hover:bg-[#0e56a8]">
              {isPending ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
