"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getVehicleSuppliers,
  createVehicleSupplier,
  updateVehicleSupplier,
  archiveVehicleSupplier,
} from "@/lib/fleet/api";
import type { VehicleSupplierResponse, VehicleSupplierRequest } from "@/lib/fleet/types";
import { VehicleCatalogStatus } from "@/lib/fleet/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import { Plus, Edit2, Search, RefreshCw, CheckCircle2, XCircle, Archive, AlertTriangle } from "lucide-react";

export function SuppliersTab() {
  const { can } = useAuth();
  const [data, setData] = useState<VehicleSupplierResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VehicleSupplierResponse | null>(null);
  const [formData, setFormData] = useState<VehicleSupplierRequest>({
    code: "",
    nameAr: "",
    nameEn: "",
    commercialRegistrationNumber: "",
    taxNumber: "",
    phone: "",
    address: {
      buildingNumber: "",
      street: "",
      district: "",
      city: "",
      postalCode: "",
      additionalNumber: "",
    },
    status: VehicleCatalogStatus.Active,
    notes: "",
    rowVersion: null,
  });

  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archivingItem, setArchivingItem] = useState<VehicleSupplierResponse | null>(null);
  const [archiveReason, setArchiveReason] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getVehicleSuppliers();
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
      commercialRegistrationNumber: "",
      taxNumber: "",
      phone: "",
      address: {
        buildingNumber: "",
        street: "",
        district: "",
        city: "",
        postalCode: "",
        additionalNumber: "",
      },
      status: VehicleCatalogStatus.Active,
      notes: "",
      rowVersion: null,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: VehicleSupplierResponse) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      commercialRegistrationNumber: item.commercialRegistrationNumber || "",
      taxNumber: item.taxNumber || "",
      phone: item.phone || "",
      address: {
        buildingNumber: item.address?.buildingNumber || "",
        street: item.address?.street || "",
        district: item.address?.district || "",
        city: item.address?.city || "",
        postalCode: item.address?.postalCode || "",
        additionalNumber: item.address?.additionalNumber || "",
      },
      status: item.status,
      notes: item.notes || "",
      rowVersion: item.rowVersion,
    });
    setIsModalOpen(true);
  };

  const handleOpenArchive = (item: VehicleSupplierResponse) => {
    setArchivingItem(item);
    setArchiveReason("");
    setIsArchiveModalOpen(true);
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
          await updateVehicleSupplier(editingItem.id, {
            ...formData,
            rowVersion: editingItem.rowVersion,
          });
        } else {
          await createVehicleSupplier(formData);
        }
        setIsModalOpen(false);
        loadData();
      } catch (err: any) {
        // error handled by fetch
      }
    });
  };

  const handleArchive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivingItem || !archiveReason) return;
    startTransition(async () => {
      try {
        await archiveVehicleSupplier(archivingItem.id, {
          reason: archiveReason,
          rowVersion: archivingItem.rowVersion,
        });
        setIsArchiveModalOpen(false);
        loadData();
      } catch (err: any) {}
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
              <Plus className="h-4 w-4" /> إضافة مورد
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
                  <th className="px-6 py-4">الاسم (عربي/انجليزي)</th>
                  <th className="px-6 py-4">السجل التجاري</th>
                  <th className="px-6 py-4">الهاتف</th>
                  <th className="px-6 py-4">الحالة</th>
                  {can("fleet.vehicles.manage") && <th className="px-6 py-4 text-center">الإجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-blue-500/5">
                    <td className="px-6 py-4 font-mono font-bold">{item.code}</td>
                    <td className="px-6 py-4">
                      {item.nameAr}
                      <div className="text-xs text-[var(--muted)]">{item.nameEn}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {item.commercialRegistrationNumber || "—"}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono">{item.phone || "—"}</td>
                    <td className="px-6 py-4">{renderStatusBadge(item.status)}</td>
                    {can("fleet.vehicles.manage") && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="rounded-lg p-2 text-[var(--muted)] hover:bg-blue-50 hover:text-[#1167c9] dark:hover:bg-blue-950/60 dark:hover:text-blue-400"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {can("fleet.vehicles.archive") && item.status !== VehicleCatalogStatus.Archived && (
                            <button
                              onClick={() => handleOpenArchive(item)}
                              className="rounded-lg p-2 text-[var(--muted)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/60 dark:hover:text-red-400"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? "تعديل المورد" : "إضافة مورد جديد"}>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">رمز المورد <span className="text-red-500">*</span></label>
              <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="SUP-01" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">الحالة <span className="text-red-500">*</span></label>
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
              <label className="mb-1 block text-sm font-semibold text-slate-700">السجل التجاري (CR)</label>
              <Input value={formData.commercialRegistrationNumber || ""} onChange={(e) => setFormData({ ...formData, commercialRegistrationNumber: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">الرقم الضريبي (Tax)</label>
              <Input value={formData.taxNumber || ""} onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">رقم الهاتف</label>
            <Input value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-4">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">العنوان الوطني</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">رقم المبنى</label>
                <Input value={formData.address?.buildingNumber || ""} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, buildingNumber: e.target.value }})} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">الشارع</label>
                <Input value={formData.address?.street || ""} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value }})} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">الحي</label>
                <Input value={formData.address?.district || ""} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, district: e.target.value }})} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">المدينة</label>
                <Input value={formData.address?.city || ""} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value }})} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">الرمز البريدي</label>
                <Input value={formData.address?.postalCode || ""} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, postalCode: e.target.value }})} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">الرقم الإضافي</label>
                <Input value={formData.address?.additionalNumber || ""} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, additionalNumber: e.target.value }})} />
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">ملاحظات</label>
            <textarea
              className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-[#1167c9] focus:outline-none"
              rows={2}
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            ></textarea>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
            <Button type="submit" disabled={isPending} className="bg-[#1167c9] hover:bg-[#0e56a8]">
              {isPending ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isArchiveModalOpen} onClose={() => setIsArchiveModalOpen(false)} title="أرشفة المورد">
        <form onSubmit={handleArchive} className="space-y-4 pt-2">
          <div className="rounded-xl bg-amber-50 p-4 text-amber-800 text-sm">
            <p className="font-bold mb-1 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              تنبيه
            </p>
            هل أنت متأكد من أرشفة هذا المورد؟
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">سبب الأرشفة <span className="text-red-500">*</span></label>
            <Input value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsArchiveModalOpen(false)}>إلغاء</Button>
            <Button type="submit" disabled={isPending} variant="danger">
              {isPending ? "جارٍ الحفظ..." : "أرشفة المورد"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
