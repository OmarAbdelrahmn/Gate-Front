"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getDriverLicenseCategories,
  createDriverLicenseCategory,
  updateDriverLicenseCategory,
} from "@/lib/fleet/api";
import type {
  DriverLicenseCategoryResponse,
  DriverLicenseCategoryRequest,
} from "@/lib/fleet/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import {
  Plus,
  Edit2,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileText,
  IdCard,
  AlertTriangle,
} from "lucide-react";

export function DriverLicenseCategoriesTab() {
  const { can, locale } = useAuth();
  const isEn = locale === "en";

  const [data, setData] = useState<DriverLicenseCategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isPending, startTransition] = useTransition();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DriverLicenseCategoryResponse | null>(null);
  const [formData, setFormData] = useState<DriverLicenseCategoryRequest>({
    code: "",
    nameAr: "",
    nameEn: "",
    status: "Active",
    descriptionAr: "",
    descriptionEn: "",
    rowVersion: null,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getDriverLicenseCategories();
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Failed to load driver license categories:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!can("licenses.read")) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          {isEn ? "Access Denied" : "غير مصرح"}
        </h3>
        <p className="text-sm text-[var(--muted)]">
          {isEn
            ? "You lack permission to view driver license categories (licenses.read)."
            : "عفواً، لا تملك صلاحية عرض فئات رخص القيادة (licenses.read)."}
        </p>
      </div>
    );
  }

  const filtered = data.filter((item) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.code.toLowerCase().includes(q) ||
      item.nameAr.toLowerCase().includes(q) ||
      (item.nameEn && item.nameEn.toLowerCase().includes(q)) ||
      (item.descriptionAr && item.descriptionAr.toLowerCase().includes(q)) ||
      (item.descriptionEn && item.descriptionEn.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === "ALL" ||
      item.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      code: "",
      nameAr: "",
      nameEn: "",
      status: "Active",
      descriptionAr: "",
      descriptionEn: "",
      rowVersion: null,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: DriverLicenseCategoryResponse) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      nameAr: item.nameAr,
      nameEn: item.nameEn || "",
      status: item.status || "Active",
      descriptionAr: item.descriptionAr || "",
      descriptionEn: item.descriptionEn || "",
      rowVersion: item.rowVersion || null,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.nameAr.trim()) {
      toast.error(
        isEn ? "Validation Error" : "تنبيه",
        isEn
          ? "Please fill in the required fields (Code, Arabic Name)."
          : "يرجى تعبئة الحقول الإلزامية (الرمز، الاسم بالعربية)."
      );
      return;
    }

    startTransition(async () => {
      try {
        if (editingItem) {
          await updateDriverLicenseCategory(editingItem.id, {
            code: formData.code.trim().toUpperCase(),
            nameAr: formData.nameAr.trim(),
            nameEn: formData.nameEn?.trim() || null,
            status: formData.status,
            descriptionAr: formData.descriptionAr?.trim() || null,
            descriptionEn: formData.descriptionEn?.trim() || null,
            rowVersion: editingItem.rowVersion,
          });
        } else {
          await createDriverLicenseCategory({
            code: formData.code.trim().toUpperCase(),
            nameAr: formData.nameAr.trim(),
            nameEn: formData.nameEn?.trim() || null,
            status: formData.status,
            descriptionAr: formData.descriptionAr?.trim() || null,
            descriptionEn: formData.descriptionEn?.trim() || null,
            rowVersion: null,
          });
        }
        setIsModalOpen(false);
        loadData();
      } catch (err: any) {
        console.error("Failed to save driver license category:", err);
      }
    });
  };

  const renderStatusBadge = (status: any) => {
    const statusStr = String(status || "").toLowerCase();
    switch (statusStr) {
      case "active":
      case "1":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
            <CheckCircle2 className="h-3 w-3" /> {isEn ? "Active" : "نشط"}
          </Badge>
        );
      case "inactive":
      case "0":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
            <XCircle className="h-3 w-3" /> {isEn ? "Inactive" : "غير نشط"}
          </Badge>
        );
      case "draft":
      case "2":
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-300 gap-1">
            <FileText className="h-3 w-3" /> {isEn ? "Draft" : "مسودة"}
          </Badge>
        );
      default:
        return <Badge>{statusStr || "—"}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isEn
                  ? "Search by name or description..."
                  : "بحث بالاسم أو الوصف..."
              }
              className="pr-10"
            />
          </div>
          <div className="w-40">
            <SearchableSelect
              options={[
                { value: "ALL", label: isEn ? "All Statuses" : "جميع الحالات" },
                { value: "Active", label: isEn ? "Active" : "نشط" },
                { value: "Inactive", label: isEn ? "Inactive" : "غير نشط" },
                { value: "Draft", label: isEn ? "Draft" : "مسودة" },
              ]}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={loadData}
            disabled={loading}
            title={isEn ? "Refresh" : "تحديث"}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {can("licenses.manage") && (
            <Button
              onClick={handleOpenAdd}
              className="gap-2 bg-[#1167c9] hover:bg-[#0e56a8]"
            >
              <Plus className="h-4 w-4" />
              {isEn ? "Add Category" : "إضافة فئة رخصة"}
            </Button>
          )}
        </div>
      </div>

      {/* Table Display */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-[var(--muted)] flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-[#1167c9]" />
            <span>{isEn ? "Loading categories..." : "جارٍ التحميل..."}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)] flex flex-col items-center justify-center gap-2">
            <IdCard className="h-8 w-8 text-slate-400" />
            <span className="font-semibold">
              {isEn
                ? "No driver license categories found"
                : "لا توجد فئات رخص قيادة مطابقة"}
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-4">{isEn ? "Name (Arabic)" : "الاسم (عربي)"}</th>
                  <th className="px-6 py-4">{isEn ? "Name (English)" : "الاسم (إنجليزي)"}</th>
                  <th className="px-6 py-4">{isEn ? "Description (Arabic)" : "الوصف (عربي)"}</th>
                  <th className="px-6 py-4">{isEn ? "Description (English)" : "الوصف (إنجليزي)"}</th>
                  <th className="px-6 py-4">{isEn ? "Status" : "الحالة"}</th>
                  {can("licenses.manage") && (
                    <th className="px-6 py-4 text-center">{isEn ? "Actions" : "الإجراءات"}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-blue-500/5"
                  >
                    <td className="px-6 py-4 font-medium">{item.nameAr}</td>
                    <td className="px-6 py-4 text-[var(--muted)]">
                      {item.nameEn || "—"}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-[var(--muted)]" title={item.descriptionAr || ""}>
                      {item.descriptionAr || "—"}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-[var(--muted)]" title={item.descriptionEn || ""}>
                      {item.descriptionEn || "—"}
                    </td>
                    <td className="px-6 py-4">
                      {renderStatusBadge(item.status)}
                    </td>
                    {can("licenses.manage") && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          title={isEn ? "Edit" : "تعديل"}
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingItem
            ? isEn
              ? "Edit Driver License Category"
              : "تعديل فئة رخصة قيادة"
            : isEn
            ? "Add Driver License Category"
            : "إضافة فئة رخصة قيادة جديدة"
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              {isEn ? "Category Code" : "رمز الفئة"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              placeholder="PRIVATE"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                {isEn ? "Arabic Name" : "الاسم بالعربية"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.nameAr}
                onChange={(e) =>
                  setFormData({ ...formData, nameAr: e.target.value })
                }
                placeholder="خاص"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                {isEn ? "English Name" : "الاسم بالإنجليزية"}
              </label>
              <Input
                value={formData.nameEn || ""}
                onChange={(e) =>
                  setFormData({ ...formData, nameEn: e.target.value })
                }
                placeholder="Private"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              {isEn ? "Status" : "الحالة"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={[
                { value: "Active", label: isEn ? "Active" : "نشط (Active)" },
                { value: "Inactive", label: isEn ? "Inactive" : "غير نشط (Inactive)" },
                { value: "Draft", label: isEn ? "Draft" : "مسودة (Draft)" },
              ]}
              value={formData.status}
              onChange={(val) => setFormData({ ...formData, status: val })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                {isEn ? "Arabic Description" : "الوصف بالعربية"}
              </label>
              <textarea
                value={formData.descriptionAr || ""}
                onChange={(e) =>
                  setFormData({ ...formData, descriptionAr: e.target.value })
                }
                rows={3}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm focus:border-[#1167c9] focus:outline-none"
                placeholder={isEn ? "Optional notes or details..." : "ملاحظات أو تفاصيل اختيارية..."}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                {isEn ? "English Description" : "الوصف بالإنجليزية"}
              </label>
              <textarea
                value={formData.descriptionEn || ""}
                onChange={(e) =>
                  setFormData({ ...formData, descriptionEn: e.target.value })
                }
                rows={3}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm focus:border-[#1167c9] focus:outline-none"
                placeholder={isEn ? "Optional notes or details..." : "ملاحظات أو تفاصيل اختيارية..."}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#1167c9] hover:bg-[#0e56a8]"
            >
              {isPending
                ? isEn
                  ? "Saving..."
                  : "جارٍ الحفظ..."
                : isEn
                ? "Save"
                : "حفظ"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
