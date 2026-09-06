"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getVehicleManufacturers,
  createVehicleManufacturer,
  updateVehicleManufacturer,
} from "@/lib/fleet/api";
import type { VehicleManufacturerResponse, VehicleManufacturerRequest } from "@/lib/fleet/types";
import { VehicleCatalogStatus } from "@/lib/fleet/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import { Plus, Edit2, Search, RefreshCw, CheckCircle2, XCircle, Archive } from "lucide-react";

export function ManufacturersTab() {
  const { can } = useAuth();
  const [data, setData] = useState<VehicleManufacturerResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VehicleManufacturerResponse | null>(null);
  const [formData, setFormData] = useState<VehicleManufacturerRequest>({
    code: "",
    nameAr: "",
    nameEn: "",
    status: VehicleCatalogStatus.Active,
    displayOrder: 10,
    rowVersion: null,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getVehicleManufacturers();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = data.filter(
    (item) =>
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.nameAr.includes(search) ||
      item.nameEn.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      code: "",
      nameAr: "",
      nameEn: "",
      status: VehicleCatalogStatus.Active,
      displayOrder: 10,
      rowVersion: null,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: VehicleManufacturerResponse) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      status: item.status,
      displayOrder: item.displayOrder,
      rowVersion: item.rowVersion,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.nameAr || !formData.nameEn) {
      toast.error("تنبيه", "يرجى تعبئة الحقول المطلوبة (الرمز، الاسم).");
      return;
    }

    startTransition(async () => {
      try {
        if (editingItem) {
          await updateVehicleManufacturer(editingItem.id, {
            ...formData,
            rowVersion: editingItem.rowVersion,
          });
        } else {
          await createVehicleManufacturer(formData);
        }
        setIsModalOpen(false);
        loadData();
      } catch (err: any) {
        // error handled by fetch
      }
    });
  };

  const renderStatusBadge = (status: VehicleCatalogStatus) => {
    switch (status) {
      case VehicleCatalogStatus.Active:
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
            <CheckCircle2 className="h-3 w-3" /> نشط
          </Badge>
        );
      case VehicleCatalogStatus.Disabled:
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
            <XCircle className="h-3 w-3" /> معطل
          </Badge>
        );
      case VehicleCatalogStatus.Archived:
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-300 gap-1">
            <Archive className="h-3 w-3" /> مؤرشف
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالرمز أو الاسم..."
            className="pr-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {can("fleet.vehicles.manage") && (
            <Button onClick={handleOpenAdd} className="gap-2 bg-[#1167c9] hover:bg-[#0e56a8]">
              <Plus className="h-4 w-4" /> إضافة صانع
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
                  <th className="px-6 py-4">الرمز</th>
                  <th className="px-6 py-4">الاسم (عربي)</th>
                  <th className="px-6 py-4">الاسم (انجليزي)</th>
                  <th className="px-6 py-4">الترتيب</th>
                  <th className="px-6 py-4">الحالة</th>
                  {can("fleet.vehicles.manage") && <th className="px-6 py-4 text-center">الإجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-blue-500/5">
                    <td className="px-6 py-4 font-mono font-bold">{item.code}</td>
                    <td className="px-6 py-4">{item.nameAr}</td>
                    <td className="px-6 py-4">{item.nameEn}</td>
                    <td className="px-6 py-4">{item.displayOrder}</td>
                    <td className="px-6 py-4">{renderStatusBadge(item.status)}</td>
                    {can("fleet.vehicles.manage") && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="rounded-lg p-2 text-[var(--muted)] hover:bg-blue-50 hover:text-[#1167c9] dark:hover:bg-blue-950/60 dark:hover:text-blue-400"
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? "تعديل صانع" : "إضافة صانع جديد"}>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">رمز الصانع <span className="text-red-500">*</span></label>
            <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="TOYOTA" required />
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">ترتيب العرض</label>
              <Input type="number" min="0" value={formData.displayOrder} onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">الحالة <span className="text-red-500">*</span></label>
              <SearchableSelect
                options={[
                  { value: VehicleCatalogStatus.Active.toString(), label: "نشط (Active)" },
                  { value: VehicleCatalogStatus.Disabled.toString(), label: "معطل (Disabled)" },
                  { value: VehicleCatalogStatus.Archived.toString(), label: "مؤرشف (Archived)" },
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
