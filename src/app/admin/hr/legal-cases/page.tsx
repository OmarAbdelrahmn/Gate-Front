"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  listLegalCases,
  archiveLegalCase,
  type LegalCaseSummary,
  type CaseStatus,
} from "@/lib/hr/legal-cases-api";
import { listSponsors } from "@/lib/workforce/api";
import {
  CaseStatusBadge,
  PartyRoleBadge,
  PersonTypeBadge,
} from "@/components/hr/legal-cases/LegalCaseStatusBadge";
import { LegalCaseFormModal } from "@/components/hr/legal-cases/LegalCaseFormModal";
import { LegalCaseArchiveModal } from "@/components/hr/legal-cases/LegalCaseArchiveModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { DualCalendarDateInput } from "@/components/ui/DualCalendarDateInput";
import {
  Scale,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  Building2,
  Calendar,
  Clock,
  User,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Briefcase,
} from "lucide-react";

export default function LegalCasesPage() {
  const { can } = useAuth();
  const canRead = can("legal_cases.read");
  const canManage = can("legal_cases.manage");

  // State
  const [cases, setCases] = useState<LegalCaseSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "">("");
  const [sponsorFilter, setSponsorFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Catalogs
  const [sponsors, setSponsors] = useState<{ id: string; name: string }[]>([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<LegalCaseSummary | null>(null);
  const [archivingCase, setArchivingCase] = useState<LegalCaseSummary | null>(null);

  // Load catalogs
  useEffect(() => {
    listSponsors()
      .then((res) => {
        setSponsors(
          res.map((s) => ({
            id: s.id,
            name: s.registryNameAr || s.registryNameEn || s.id,
          }))
        );
      })
      .catch(() => []);
  }, []);

  // Fetch cases
  const fetchCases = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const res = await listLegalCases({
        search,
        status: statusFilter,
        sponsorId: sponsorFilter || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        pageSize,
      });
      setCases(res.items);
      setTotalCount(res.totalCount);
    } catch (err: any) {
      console.error("Failed to load legal cases:", err);
    } finally {
      setLoading(false);
    }
  }, [canRead, search, statusFilter, sponsorFilter, fromDate, toDate, page, pageSize]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = totalCount || cases.length;
    let openCount = 0;
    let inProgressCount = 0;
    let suspendedCount = 0;
    let closedCount = 0;

    cases.forEach((c) => {
      if (c.status === "Open") openCount++;
      else if (c.status === "InProgress") inProgressCount++;
      else if (c.status === "Suspended") suspendedCount++;
      else if (c.status === "Closed") closedCount++;
    });

    return { total, openCount, inProgressCount, suspendedCount, closedCount };
  }, [cases, totalCount]);

  const handleArchiveConfirm = async (reason: string) => {
    if (!archivingCase) return;
    await archiveLegalCase(archivingCase.id, {
      rowVersion: archivingCase.rowVersion,
      reason,
    });
    setArchivingCase(null);
    fetchCases();
  };

  if (!canRead) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto size-14 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600 mb-4">
          <AlertCircle className="size-7" />
        </div>
        <h2 className="text-xl font-bold text-[var(--foreground)]">غير مصرح لك بالوصول</h2>
        <p className="text-sm text-[var(--muted)] mt-1">
          تحتاج إلى صلاحية قراءة القضايا القانونية (`legal_cases.read`) لعرض هذه الصفحة.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Scale className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
                القضايا القانونية (HR Legal Cases)
              </h1>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                إدارة ومتابعة قضايا الكفلاء والموظفين والسائقين والجلسات القضائية
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => fetchCases()}
            disabled={loading}
            className="flex items-center gap-1.5 h-9 px-3 text-xs"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>

          {canManage && (
            <Button
              variant="primary"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 h-9 px-3 text-xs"
            >
              <Plus className="size-4" />
              إنشاء قضية جديدة
            </Button>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <p className="text-xs font-medium text-[var(--muted)]">إجمالي القضايا</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-[var(--foreground)]">{stats.total}</span>
            <Scale className="size-5 text-indigo-500/80" />
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 shadow-sm">
          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">مفتوحة (Open)</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {stats.openCount}
            </span>
            <span className="size-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 p-4 shadow-sm">
          <p className="text-xs font-medium text-blue-800 dark:text-blue-300">قيد النظر (In Progress)</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {stats.inProgressCount}
            </span>
            <Clock className="size-5 text-blue-500/80" />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 p-4 shadow-sm">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">معلقة (Suspended)</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {stats.suspendedCount}
            </span>
            <AlertCircle className="size-5 text-amber-500/80" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">مغلقة (Closed)</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-slate-700 dark:text-slate-400">
              {stats.closedCount}
            </span>
            <CheckCircle2 className="size-5 text-slate-500" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted)] pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="بحث برقم القضية أو اسم الشخص..."
              className="pr-9 text-xs"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as CaseStatus | "");
                setPage(1);
              }}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)] focus:border-indigo-500 focus:outline-none"
            >
              <option value="">جميع الحالات</option>
              <option value="Open">مفتوحة (Open)</option>
              <option value="InProgress">قيد النظر (InProgress)</option>
              <option value="Suspended">معلقة (Suspended)</option>
              <option value="Closed">مغلقة (Closed)</option>
            </select>
          </div>

          {/* Sponsor Filter */}
          <div>
            <select
              value={sponsorFilter}
              onChange={(e) => {
                setSponsorFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)] focus:border-indigo-500 focus:outline-none"
            >
              <option value="">جميع الكفلاء</option>
              {sponsors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Page Size */}
          <div>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)] focus:border-indigo-500 focus:outline-none"
            >
              <option value={20}>20 لكل صفحة</option>
              <option value={50}>50 لكل صفحة</option>
              <option value={100}>100 لكل صفحة</option>
            </select>
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border)] text-xs">
          <span className="text-[var(--muted)] font-medium">تصفية بالتاريخ:</span>
          <div className="w-44">
            <DualCalendarDateInput
              name="fromDate"
              value={fromDate}
              onChange={(val) => {
                setFromDate(val);
                setPage(1);
              }}
            />
          </div>
          <span className="text-[var(--muted)]">إلى</span>
          <div className="w-44">
            <DualCalendarDateInput
              name="toDate"
              value={toDate}
              onChange={(val) => {
                setToDate(val);
                setPage(1);
              }}
            />
          </div>

          {(search || statusFilter || sponsorFilter || fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setSponsorFilter("");
                setFromDate("");
                setToDate("");
                setPage(1);
              }}
              className="mr-auto text-xs text-rose-600 hover:underline font-medium"
            >
              إعادة ضبط الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Cases Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-sm text-[var(--muted)]">
            <div className="size-8 mx-auto mb-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            جاري تحميل القضايا القانونية...
          </div>
        ) : cases.length === 0 ? (
          <div className="py-16 text-center p-6">
            <Scale className="size-12 text-[var(--muted)] mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-semibold text-[var(--foreground)]">
              لا توجد قضايا قانونية مطابقة
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1">
              لم يتم العثور على أي قضايا تطابق خيارات البحث والتصفية المحددة.
            </p>
            {canManage && (
              <Button
                variant="primary"
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 h-9 px-4 text-xs"
              >
                <Plus className="size-4 ml-1.5" />
                إنشاء أول قضية
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/50 border-b border-[var(--border)] text-[var(--muted)] font-medium">
                <tr>
                  <th className="py-3 px-4">رقم القضية</th>
                  <th className="py-3 px-4">الكفيل وصفته</th>
                  <th className="py-3 px-4">الطرف الآخر (الشخص)</th>
                  <th className="py-3 px-4">تاريخ ووقت القضية</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">المستخدم المسؤول</th>
                  <th className="py-3 px-4 text-center">الجلسات</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {cases.map((c) => {
                  const sponsorPartyRole = c.sponsorPartyRole;
                  const personPartyRole =
                    sponsorPartyRole === "Claimant" ? "Defendant" : "Claimant";

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      {/* Case Number */}
                      <td className="py-3 px-4 font-mono font-bold text-[var(--foreground)]">
                        <Link
                          href={`/admin/hr/legal-cases/${c.id}`}
                          className="hover:text-indigo-600 hover:underline flex items-center gap-1.5"
                        >
                          <Scale className="size-3.5 text-indigo-500" />
                          {c.caseNumber}
                        </Link>
                      </td>

                      {/* Sponsor */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-[var(--foreground)]">
                            {c.sponsorNameAr || c.sponsorNameEn || "كفيل مسجل"}
                          </p>
                          <PartyRoleBadge role={sponsorPartyRole} />
                        </div>
                      </td>

                      {/* Person */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <PersonTypeBadge type={c.personType} />
                            <span className="font-medium text-[var(--foreground)]">
                              {c.personName || "—"}
                            </span>
                          </div>
                          <PartyRoleBadge role={personPartyRole} />
                        </div>
                      </td>

                      {/* Date & Time (Riyadh local) */}
                      <td className="py-3 px-4">
                        <div className="text-[var(--muted)] space-y-0.5">
                          <div className="flex items-center gap-1 font-mono">
                            <Calendar className="size-3" />
                            <span>{c.caseDate}</span>
                          </div>
                          <div className="flex items-center gap-1 font-mono text-[11px]">
                            <Clock className="size-3" />
                            <span>{c.caseTime}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <CaseStatusBadge status={c.status} />
                      </td>

                      {/* Responsible User */}
                      <td className="py-3 px-4 text-[var(--muted)]">
                        <div className="flex items-center gap-1.5">
                          <User className="size-3.5" />
                          <span>{c.responsibleUserName || "مستخدم مسؤول"}</span>
                        </div>
                      </td>

                      {/* Hearings Count */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-[var(--foreground)]">
                          {c.hearingsCount ?? 0}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/admin/hr/legal-cases/${c.id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                            title="عرض التفاصيل والجلسات"
                          >
                            <Eye className="size-4" />
                          </Link>

                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingCase(c)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                                title="تعديل القضية"
                              >
                                <Pencil className="size-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setArchivingCase(c)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                title="أرشفة القضية"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between p-4 border-t border-[var(--border)] text-xs text-[var(--muted)]">
            <div>
              عرض {(page - 1) * pageSize + 1} إلى {Math.min(page * pageSize, totalCount)} من أصل {totalCount} قضية
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="h-8 px-2.5 text-xs"
              >
                السابق
              </Button>
              <span className="px-3 py-1 font-medium text-[var(--foreground)]">
                صفحة {page}
              </span>
              <Button
                variant="ghost"
                disabled={page * pageSize >= totalCount}
                onClick={() => setPage(page + 1)}
                className="h-8 px-2.5 text-xs"
              >
                التالي
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Case Modal */}
      <LegalCaseFormModal
        isOpen={isCreateOpen || !!editingCase}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingCase(null);
        }}
        onSuccess={() => {
          fetchCases();
        }}
        caseToEdit={editingCase}
      />

      {/* Archive Case Modal */}
      <LegalCaseArchiveModal
        isOpen={!!archivingCase}
        onClose={() => setArchivingCase(null)}
        onConfirm={handleArchiveConfirm}
        title="أرشفة القضية القانونية"
        itemDescription={`هل أنت متأكد من رغبتك في أرشفة القضية رقم "${archivingCase?.caseNumber}"؟ سيتم الاحتفاظ بكافة بيانات القضية وسجل جلساتها في الأرشيف.`}
      />
    </div>
  );
}
