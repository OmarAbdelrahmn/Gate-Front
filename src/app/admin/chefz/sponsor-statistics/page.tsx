// src/app/admin/chefz/sponsor-statistics/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getAllChefzSponsorStatistics,
  getChefzSponsorStatistic,
  createChefzSponsorStatistic,
  updateChefzSponsorStatistic,
  deleteChefzSponsorStatistic,
} from "@/lib/chefz/api";
import type {
  ChefzStatisticsResponse,
  ChefzStatisticsValues,
  ChefzStatisticsRequest,
} from "@/lib/chefz/types";
import { listSponsors, type Sponsor } from "@/lib/workforce/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import {
  Building2,
  RefreshCw,
  FileSpreadsheet,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Info,
  Layers,
  HelpCircle,
  Hash,
  Users,
} from "lucide-react";

// Category definitions matching workbook handoff
interface CategoryDef {
  key: keyof Omit<ChefzStatisticsValues, "rowVersion">;
  labelAr: string;
  isNullable?: boolean;
  tooltip?: string;
}

const CATEGORIES: CategoryDef[] = [
  { key: "sponsorshipCount", labelAr: "عدد الكفالات", tooltip: "العدد الإجمالي للكفالات المسجلة للكفيل" },
  { key: "working", labelAr: "يعمل", tooltip: "مناديب على رأس العمل" },
  { key: "notWorking", labelAr: "لا يعمل", tooltip: "مناديب غير نشطين" },
  { key: "blocked", labelAr: "بلوك", tooltip: "محظور في المنصة" },
  { key: "permanentlyBlocked", labelAr: "بلوك نهائي", tooltip: "حظر نهائي غير قابل للفك" },
  { key: "updateBlocked", labelAr: "بلوك تحديث", tooltip: "محظور لعدم تحديث البيانات" },
  { key: "uploaded", labelAr: "تم الرفع", tooltip: "تم رفع الملف بنجاح" },
  { key: "privateLicense", labelAr: "خصوصي", tooltip: "رخصة قيادة خاصة" },
  { key: "pendingUpload", labelAr: "جاري الرفع", tooltip: "ملفات جاري معالجتها ورفعها" },
  { key: "noLicense", labelAr: "لا يوجد رخصة", tooltip: "مناديب بدون رخصة مسجلة" },
  { key: "managementSuspended", labelAr: "إيقاف من الإدارة", tooltip: "موقوف بقرار إداري" },
  { key: "motorcycle", labelAr: "دباب", tooltip: "مناديب يعملون بدراجة نارية" },
  { key: "workingOutsideSponsorship", labelAr: "يعمل بدون كفالة", tooltip: "مناديب يعملون خارج كفالة الشركة" },
  {
    key: "workingWithoutPerformance",
    labelAr: "يعمل ولكن لا يوجد في الأداء",
    isNullable: true,
    tooltip: "يعملون فعلياً ولكن لم يظهر لهم أداء في تقارير شيفز (يقبل قيمة فارغة)",
  },
];

export default function ChefzSponsorStatisticsPage() {
  const { can } = useAuth();
  const canRead = can("chefz.read");
  const canUpdate = can("chefz.accounts.update");

  // State
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<ChefzStatisticsResponse[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form modal (Create / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChefzStatisticsResponse | null>(null);
  const [selectedSponsorId, setSelectedSponsorId] = useState<string>("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<ChefzStatisticsResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsList, sponsorList] = await Promise.all([
        getAllChefzSponsorStatistics().catch(() => []),
        listSponsors().catch(() => []),
      ]);
      setStatistics(statsList);
      setSponsors(sponsorList);
    } catch (err: unknown) {
      const e = err as { details?: { detail?: string }; message?: string };
      setError(e?.details?.detail || e?.message || "تعذر تحميل إحصائيات الكفلاء.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Company Total for sponsorshipCount
  const companyTotalSponsorships = useMemo(() => {
    return statistics.reduce((acc, curr) => acc + (curr.values.sponsorshipCount || 0), 0);
  }, [statistics]);

  // Compute category totals across sponsors
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number | null> = {};
    for (const cat of CATEGORIES) {
      let sum = 0;
      let hasAnyValue = false;
      for (const stat of statistics) {
        const val = stat.values[cat.key];
        if (typeof val === "number") {
          sum += val;
          hasAnyValue = true;
        }
      }
      totals[cat.key] = hasAnyValue ? sum : null;
    }
    return totals;
  }, [statistics]);

  // Sponsors available for creating new stats
  const availableSponsors = useMemo(() => {
    const existingIds = new Set(statistics.map((s) => s.sponsorId));
    return sponsors.filter((s) => !existingIds.has(s.id));
  }, [sponsors, statistics]);

  // Open Add modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setSelectedSponsorId(availableSponsors[0]?.id || "");
    const initial: Record<string, string> = {};
    for (const cat of CATEGORIES) {
      initial[cat.key] = cat.key === "workingWithoutPerformance" ? "" : "0";
    }
    setFormValues(initial);
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (item: ChefzStatisticsResponse) => {
    setEditingItem(item);
    setSelectedSponsorId(item.sponsorId);
    const initial: Record<string, string> = {};
    for (const cat of CATEGORIES) {
      const val = item.values[cat.key];
      initial[cat.key] = val === null || val === undefined ? "" : String(val);
    }
    setFormValues(initial);
    setFormError(null);
    setIsFormOpen(true);
  };

  // Submit form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSponsorId) {
      setFormError("يرجى اختيار الكفيل.");
      return;
    }

    // Build values payload
    const parsedValues: Partial<ChefzStatisticsRequest> = {};
    for (const cat of CATEGORIES) {
      const raw = formValues[cat.key]?.trim();
      if (cat.isNullable && (raw === "" || raw === undefined)) {
        parsedValues[cat.key] = null as any;
      } else {
        const num = Number(raw);
        if (!Number.isInteger(num) || num < 0) {
          setFormError(`قيمة "${cat.labelAr}" يجب أن تكون عدداً صحيحاً غير سالب (≥ 0).`);
          return;
        }
        parsedValues[cat.key] = num as any;
      }
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingItem) {
        // PUT update
        const payload: ChefzStatisticsRequest = {
          ...(parsedValues as ChefzStatisticsValues),
          rowVersion: editingItem.rowVersion,
        };
        const updated = await updateChefzSponsorStatistic(editingItem.sponsorId, payload);
        toast.success("تم بنجاح", `تم تحديث إحصائيات ${updated.sponsorNameAr || "الكفيل"} بنجاح.`);
      } else {
        // POST create
        const payload = parsedValues as ChefzStatisticsRequest;
        const created = await createChefzSponsorStatistic(selectedSponsorId, payload);
        toast.success("تم بنجاح", `تم حفظ إحصائيات ${created.sponsorNameAr || "الكفيل"} بنجاح.`);
      }

      setIsFormOpen(false);
      loadData();
    } catch (err: unknown) {
      const e = err as { status?: number; details?: { detail?: string }; message?: string };
      if (e?.status === 409) {
        // Conflict: refetch latest and inform user
        setFormError("حدث تعارض في التزامن (تم تعديل البيانات بواسطة مستخدم آخر). جارٍ إعادة تحميل أحدث القيم...");
        try {
          const latest = await getChefzSponsorStatistic(selectedSponsorId);
          setEditingItem(latest);
          const refetched: Record<string, string> = {};
          for (const cat of CATEGORIES) {
            const v = latest.values[cat.key];
            refetched[cat.key] = v === null || v === undefined ? "" : String(v);
          }
          setFormValues(refetched);
        } catch {
          // Ignore
        }
      } else {
        setFormError(e?.details?.detail || e?.message || "تعذر حفظ إحصائيات الكفيل.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Delete modal
  const handleOpenDelete = (item: ChefzStatisticsResponse) => {
    setDeletingItem(item);
    setIsDeleteOpen(true);
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await deleteChefzSponsorStatistic(deletingItem.sponsorId, deletingItem.rowVersion);
      toast.success("تم الحذف", `تم حذف إحصائيات ${deletingItem.sponsorNameAr} بنجاح.`);
      setIsDeleteOpen(false);
      setDeletingItem(null);
      loadData();
    } catch (err: unknown) {
      const e = err as { details?: { detail?: string }; message?: string };
      toast.error("خطأ", e?.details?.detail || e?.message || "تعذر حذف إحصائيات الكفيل.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (statistics.length === 0) return;

    // Build rows where each row is a Category
    const rows = CATEGORIES.map((cat) => {
      const rowData: Record<string, any> = {
        المؤشر: cat.labelAr,
        "إجمالي الشركة":
          cat.key === "sponsorshipCount"
            ? companyTotalSponsorships
            : categoryTotals[cat.key] !== null
            ? categoryTotals[cat.key]
            : "—",
      };

      for (const stat of statistics) {
        const val = stat.values[cat.key];
        rowData[stat.sponsorNameAr] = val !== null && val !== undefined ? val : "—";
      }

      return rowData;
    });

    // Columns config
    const cols = [
      { header: "المؤشر", accessor: (r: any) => r["المؤشر"], isText: true },
      { header: "إجمالي الشركة", accessor: (r: any) => r["إجمالي الشركة"] },
      ...statistics.map((stat) => ({
        header: stat.sponsorNameAr,
        accessor: (r: any) => r[stat.sponsorNameAr],
      })),
    ];

    exportToExcel({
      filename: `إحصائيات-الكفلاء-شيفز-${new Date().toISOString().split("T")[0]}`,
      sheetName: "إحصائيات الكفلاء",
      data: rows,
      columns: cols,
    });
  };

  if (!canRead) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <div className="mx-auto max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <ShieldAlert className="mx-auto mb-3 text-red-500" size={32} />
          <h2 className="text-lg font-bold text-[var(--foreground)]">لا توجد صلاحية للوصول</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            ليس لديك صلاحية لعرض إحصائيات كفلاء شيفز (chefz.read).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
              إحصائيات الكفلاء — منصة شيفز
            </h1>
            <Badge tone="blue">ورقة العمل الرسمية</Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            جدول توزيع وحالات المناديب والتراخيص وحالات البلوك مصنفة في أعمدة الكفلاء المعتمدين.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh button */}
          <Button
            variant="secondary"
            onClick={loadData}
            disabled={loading}
            className="gap-2 text-xs font-semibold"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>

          {/* Extract to Excel button */}
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            disabled={statistics.length === 0}
            className="gap-2 text-xs font-semibold"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            استخراج إكسل
          </Button>

          {/* Add sponsor stats button */}
          {canUpdate && (
            <Button
              onClick={handleOpenAdd}
              disabled={loading || availableSponsors.length === 0}
              className="gap-2 bg-[var(--brand)] text-white hover:opacity-90 text-xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              إضافة إحصائيات كفيل
            </Button>
          )}
        </div>
      </div>

      {/* KPI Overview Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total sponsorships */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-indigo-600">
            <Building2 className="h-5 w-5" />
            <span className="text-xs font-bold text-[var(--muted)]">
              مجموع كفالات الشركة (إحصائية الكفلاء)
            </span>
          </div>
          <span className="font-black font-mono text-3xl text-[var(--foreground)] block">
            {companyTotalSponsorships.toLocaleString()}
          </span>
          <span className="text-[11px] text-[var(--muted)] block">
            مجموع عمود عدد الكفالات لجميع الكفلاء المعتمدين (مثل البوابة، إكسبرس)
          </span>
        </div>

        {/* Configured sponsors count */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-emerald-600">
            <Users className="h-5 w-5" />
            <span className="text-xs font-bold text-[var(--muted)]">
              عدد الكفلاء المسجلين بالجدول
            </span>
          </div>
          <span className="font-black font-mono text-3xl text-emerald-600 dark:text-emerald-400 block">
            {statistics.length} كفيل
          </span>
          <span className="text-[11px] text-[var(--muted)] block">
            أعمدة الكفلاء المعروضة حالياً في ورقة العمل
          </span>
        </div>

        {/* Categories count */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-blue-600">
            <Layers className="h-5 w-5" />
            <span className="text-xs font-bold text-[var(--muted)]">
              فئات التصنيف التشغيلية
            </span>
          </div>
          <span className="font-black font-mono text-3xl text-[var(--foreground)] block">
            {CATEGORIES.length} تصنيفاً
          </span>
          <span className="text-[11px] text-[var(--muted)] block">
            فئات متداخلة ومستقلة تشمل التراخيص والبلوك وأنماط العمل
          </span>
        </div>
      </div>

      {/* Main Worksheet Matrix Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--table-header-bg)] text-xs font-bold text-[var(--muted)]">
              <tr>
                {/* Metric Name column */}
                <th className="px-5 py-4 min-w-[220px]">المؤشر / التصنيف</th>

                {/* Company Total Column */}
                <th className="px-4 py-4 text-center min-w-[130px] bg-slate-100/60 dark:bg-slate-800/40 text-[var(--foreground)] font-black">
                  إجمالي الشركة
                </th>

                {/* Column per Sponsor */}
                {statistics.map((stat) => (
                  <th
                    key={stat.sponsorId}
                    className="px-4 py-4 text-center min-w-[170px] border-r border-[var(--border)]"
                  >
                    <div className="space-y-1.5">
                      <div className="font-black text-sm text-[var(--foreground)]">
                        {stat.sponsorNameAr}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--muted)] truncate max-w-[150px] mx-auto" dir="ltr" title={stat.sponsorId}>
                        {stat.sponsorId.slice(0, 12)}...
                      </div>

                      {/* Sponsor Actions (Edit/Delete) */}
                      {canUpdate && (
                        <div className="flex items-center justify-center gap-1 pt-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(stat)}
                            title="تعديل إحصائيات هذا الكفيل"
                            className="p-1 rounded-md text-[var(--brand)] hover:bg-[var(--subtle-bg)] transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(stat)}
                            title="حذف إحصائيات هذا الكفيل"
                            className="p-1 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={2 + statistics.length} className="py-16 text-center text-xs text-[var(--muted)]">
                    <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--brand)]" />
                    جارٍ تحميل ورقة عمل إحصائيات الكفلاء...
                  </td>
                </tr>
              ) : statistics.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-16 text-center text-sm text-[var(--muted)]">
                    لا توجد إحصائيات كفلاء مدخلة حالياً. اضغط على &quot;إضافة إحصائيات كفيل&quot; لإدخال بيانات أول كفيل.
                  </td>
                </tr>
              ) : (
                CATEGORIES.map((cat, idx) => {
                  const isSponsorshipRow = cat.key === "sponsorshipCount";
                  const isBlockedCategory =
                    cat.key === "blocked" ||
                    cat.key === "permanentlyBlocked" ||
                    cat.key === "updateBlocked" ||
                    cat.key === "managementSuspended";

                  return (
                    <tr
                      key={cat.key}
                      className={`transition-colors hover:bg-[var(--table-row-hover)] ${
                        isSponsorshipRow
                          ? "bg-indigo-50/40 dark:bg-indigo-950/20 font-bold"
                          : idx % 2 === 0
                          ? "bg-transparent"
                          : "bg-[var(--subtle-bg)]/30"
                      }`}
                    >
                      {/* Metric Name */}
                      <td className="px-5 py-3.5 font-bold text-xs text-[var(--foreground)]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={
                              isSponsorshipRow
                                ? "text-indigo-600 dark:text-indigo-400 font-extrabold text-sm"
                                : isBlockedCategory
                                ? "text-rose-700 dark:text-rose-400 font-semibold"
                                : ""
                            }
                          >
                            {cat.labelAr}
                          </span>
                        </div>
                      </td>

                      {/* Company Total for this metric */}
                      <td className="px-4 py-3.5 text-center font-extrabold font-mono text-xs bg-slate-100/60 dark:bg-slate-800/40" dir="ltr">
                        {isSponsorshipRow ? (
                          <span className="text-indigo-700 dark:text-indigo-300 font-black text-sm">
                            {companyTotalSponsorships.toLocaleString()}
                          </span>
                        ) : categoryTotals[cat.key] !== null ? (
                          <span>{categoryTotals[cat.key]?.toLocaleString()}</span>
                        ) : (
                          <span className="text-[var(--muted)] font-normal">—</span>
                        )}
                      </td>

                      {/* Per-Sponsor Value Columns */}
                      {statistics.map((stat) => {
                        const val = stat.values[cat.key];
                        return (
                          <td
                            key={stat.sponsorId}
                            className="px-4 py-3.5 text-center font-bold font-mono text-xs border-r border-[var(--border)]"
                            dir="ltr"
                          >
                            {val !== null && val !== undefined ? (
                              <span
                                className={
                                  isSponsorshipRow
                                    ? "text-indigo-600 dark:text-indigo-400 font-black"
                                    : isBlockedCategory && val > 0
                                    ? "text-rose-600 dark:text-rose-400 font-bold"
                                    : ""
                                }
                              >
                                {val.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[var(--muted)] font-normal">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explanatory notes footer */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--muted)] space-y-2">
        <div className="flex items-center gap-2 font-bold text-[var(--foreground)]">
          <Info className="h-4 w-4 text-blue-500" />
          <span>ملاحظات ورقة العمل والتحقق</span>
        </div>
        <ul className="list-disc list-inside space-y-1 leading-relaxed text-[11px]">
          <li>
            إجمالي كفالات الشركة هو مجموع حقل <strong>عدد الكفالات</strong> للكفلاء (المعتمد 399 كفالة)، وهو مستقل عن إجمالي حسابات شيفز الحية (465 حساباً).
          </li>
          <li>
            الفئات والأعداد متداخلة ولا يشترط رياضياً أن تتطابق مجموع الصفوف مع عدد الكفالات.
          </li>
          <li>
            حقل <strong>&quot;يعمل ولكن لا يوجد في الأداء&quot;</strong> يقبل القيمة الفارغة (null) ويظهر كـ &quot;—&quot; لحين إدخاله.
          </li>
          <li>
            حذف إحصائية كفيل يحذف سجل المؤشرات فقط (Soft Delete) دون المساس بملف الكفيل أو حسابات المنصة في النظام.
          </li>
        </ul>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Create / Edit Modal                                           */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? `تعديل إحصائيات: ${editingItem.sponsorNameAr}` : "إضافة إحصائيات كفيل جديد"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-5" dir="rtl">
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                <span className="font-semibold">{formError}</span>
              </div>
            </div>
          )}

          {/* Sponsor selector (Only selectable on creation) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">
              الكفيل <span className="text-red-500">*</span>
            </label>
            {editingItem ? (
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] font-bold text-sm">
                {editingItem.sponsorNameAr}
              </div>
            ) : (
              <SearchableSelect
                value={selectedSponsorId}
                onChange={setSelectedSponsorId}
                options={availableSponsors.map((s) => ({
                  value: s.id,
                  label: s.registryNameAr || s.registryNameEn || "كفيل",
                  keywords: `${s.registryNameAr || ""} ${s.registryNameEn || ""}`,
                }))}
                placeholder="اختر الكفيل لإدخال إحصائياته..."
              />
            )}
          </div>

          {/* Categories Grid */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--foreground)] block">
              قيم المؤشرات والتصنيفات (أعداد صحيحة ≥ 0)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto p-1">
              {CATEGORIES.map((cat) => (
                <div key={cat.key} className="space-y-1 p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                  <label className="text-xs font-semibold text-[var(--foreground)] block">
                    {cat.labelAr} {cat.isNullable && <span className="text-[10px] text-[var(--muted)] font-normal">(اختياري)</span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder={cat.isNullable ? "فارغ (غير محدد)" : "0"}
                    value={formValues[cat.key] ?? ""}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [cat.key]: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--subtle-bg)] py-1.5 px-3 text-sm text-[var(--foreground)] font-mono outline-none focus:border-[var(--brand)]"
                  />
                  {cat.tooltip && <p className="text-[10px] text-[var(--muted)]">{cat.tooltip}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* RowVersion Token */}
          {editingItem && (
            <div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-1">
              <span>رمز التزامن (Row Version):</span>
              <span className="font-mono text-[10px]" dir="ltr">
                {editingItem.rowVersion}
              </span>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[var(--brand)] text-white hover:opacity-90 min-w-[130px]"
            >
              {isSubmitting ? "جارٍ الحفظ..." : editingItem ? "تحديث الإحصائيات" : "إضافة الإحصائيات"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* Delete Confirmation Modal                                     */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="تأكيد حذف إحصائيات الكفيل"
        maxWidth="max-w-md"
      >
        <div className="space-y-4" dir="rtl">
          <div className="flex items-start gap-3 text-red-600">
            <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-sm text-[var(--foreground)]">
                هل أنت متأكد من حذف إحصائيات {deletingItem?.sponsorNameAr}؟
              </p>
              <p className="text-[var(--muted)] leading-relaxed">
                سيتم حذف سجل ورقة العمل لهذا الكفيل فقط، ويبقى الكفيل وحسابات المنصة كما هي. يمكن إعادة إدخال إحصائيات جديدة له لاحقاً.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700 min-w-[100px]"
            >
              {isDeleting ? "جارٍ الحذف..." : "حذف السجل"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
