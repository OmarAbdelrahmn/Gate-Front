// src/app/admin/chefz/settlements/page.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getChefzPlatform,
  getAllChefzAccounts,
  getChefzSettlements,
  getAllChefzSettlements,
  previewChefzSettlement,
  createChefzSettlement,
  getRiyadhTodayDate,
} from "@/lib/chefz/api";
import type {
  ChefzAccount,
  ChefzSettlement,
  ChefzSettlementRequest,
} from "@/lib/chefz/types";
import {
  getPlatformAccounts,
  getAllPlatformAccounts,
  getAccountAssignmentHistory,
  type AccountResponse,
  type AssignmentResponse,
  type PlatformResponse,
} from "@/lib/platforms/api";
import { listRiders } from "@/lib/workforce/api";
import type { Rider } from "@/lib/workforce/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import { ChefzBulkOrderSettlementPanel } from "@/components/chefz/ChefzBulkOrderSettlementPanel";
import {
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  FileSpreadsheet,
  AlertTriangle,
  Calendar,
  User,
  CheckCircle2,
  Printer,
  Info,
  DollarSign,
  Coins,
  Clock,
  ArrowRight,
  ShieldAlert,
  Upload,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

export default function ChefzSettlementsPage() {
  const searchParams = useSearchParams();
  const preselectedAccountId = searchParams.get("accountId") || "";

  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  // Data states
  const [platform, setPlatform] = useState<PlatformResponse | null>(null);
  const [settlements, setSettlements] = useState<ChefzSettlement[]>([]);
  const [baseAccounts, setBaseAccounts] = useState<AccountResponse[]>([]);
  const [chefzAccounts, setChefzAccounts] = useState<ChefzAccount[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Filters
  const [filterAccountId, setFilterAccountId] = useState(preselectedAccountId);
  const [filterRiderId, setFilterRiderId] = useState("");
  const [filterSponsor, setFilterSponsor] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterHalf, setFilterHalf] = useState<string>("all");

  // View Mode: History vs Bulk Order Settlements
  const [viewMode, setViewMode] = useState<"history" | "bulk-orders">("history");
  const [viewImportId, setViewImportId] = useState<string | null>(null);

  // New Settlement Modal State (Manual Wallet)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAccountId, setModalAccountId] = useState(preselectedAccountId);
  const [accountAssignments, setAccountAssignments] = useState<AssignmentResponse[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [modalYear, setModalYear] = useState<number>(currentYear);
  const [modalMonth, setModalMonth] = useState<number>(currentMonth);
  const [modalHalf, setModalHalf] = useState<1 | 2>(1);

  const [startWalletAmount, setStartWalletAmount] = useState<string>("0");
  const [endWalletAmount, setEndWalletAmount] = useState<string>("");

  const [previewResult, setPreviewResult] = useState<ChefzSettlement | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Detail / Print Receipt Modal
  const [selectedSettlement, setSelectedSettlement] = useState<ChefzSettlement | null>(null);

  // -------------------------------------------------------------
  // Load Platform, Accounts, Settlements (ALL settlements)
  // -------------------------------------------------------------
  const loadData = async () => {
    setLoading(true);
    try {
      const plat = await getChefzPlatform();
      setPlatform(plat);

      if (plat) {
        const [accs, chefzAccs, riderList, settleItems] = await Promise.all([
          getAllPlatformAccounts({ platformId: plat.id, includeArchived: false }).catch(() => []),
          getAllChefzAccounts().catch(() => []),
          listRiders().catch(() => []),
          getAllChefzSettlements().catch(() => []),
        ]);

        setBaseAccounts(accs);
        setChefzAccounts(chefzAccs);
        setRiders(riderList);
        setSettlements(settleItems);
      }
    } catch (err: unknown) {
      toast.error("خطأ", "تعذر تحميل تصفيات شيفز.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Lookup helpers
  const baseAccountMap = useMemo(() => {
    const map = new Map<string, AccountResponse>();
    for (const a of baseAccounts) map.set(a.id, a);
    return map;
  }, [baseAccounts]);

  const chefzAccountMap = useMemo(() => {
    const map = new Map<string, ChefzAccount>();
    for (const a of chefzAccounts) map.set(a.accountId, a);
    return map;
  }, [chefzAccounts]);

  const riderMap = useMemo(() => {
    const map = new Map<string, Rider>();
    for (const r of riders) map.set(r.id, r);
    return map;
  }, [riders]);

  // When modalAccountId changes, fetch its assignment history
  useEffect(() => {
    if (!modalAccountId) {
      setAccountAssignments([]);
      setSelectedAssignmentId("");
      setPreviewResult(null);
      return;
    }

    setLoadingAssignments(true);
    setSelectedAssignmentId("");
    setPreviewResult(null);
    setPreviewError(null);

    getAccountAssignmentHistory(modalAccountId)
      .then((history) => {
        // Only active or ended assignments (exclude cancelled)
        const valid = (history || []).filter((a) => a.status === "Active" || a.status === "Ended");
        setAccountAssignments(valid);
        if (valid.length > 0) {
          // Preselect current active assignment or most recent
          const active = valid.find((a) => a.status === "Active") || valid[0];
          setSelectedAssignmentId(active.id);
        }
      })
      .catch(() => setAccountAssignments([]))
      .finally(() => setLoadingAssignments(false));
  }, [modalAccountId]);

  // Invalidate preview on any input change
  const invalidatePreview = () => {
    setPreviewResult(null);
    setPreviewError(null);
  };

  // Selected assignment metadata
  const selectedAssignment = useMemo(() => {
    return accountAssignments.find((a) => a.id === selectedAssignmentId) || null;
  }, [accountAssignments, selectedAssignmentId]);

  // Selected account metadata
  const selectedChefzAccount = useMemo(() => {
    return chefzAccountMap.get(modalAccountId) || null;
  }, [chefzAccountMap, modalAccountId]);

  // Calendar Period computation for display
  const calendarPeriodDisplay = useMemo(() => {
    const mm = String(modalMonth).padStart(2, "0");
    if (modalHalf === 1) {
      return {
        from: `${modalYear}-${mm}-01`,
        to: `${modalYear}-${mm}-15`,
        label: `النصف الأول من شهر ${modalMonth} / ${modalYear} (1 - 15)`,
      };
    } else {
      const lastDay = new Date(modalYear, modalMonth, 0).getDate();
      return {
        from: `${modalYear}-${mm}-16`,
        to: `${modalYear}-${mm}-${String(lastDay).padStart(2, "0")}`,
        label: `النصف الثاني من شهر ${modalMonth} / ${modalYear} (16 - ${lastDay})`,
      };
    }
  }, [modalYear, modalMonth, modalHalf]);

  // Is future check
  const isFuturePreview = useMemo(() => {
    if (!previewResult) return false;
    const riyadhToday = getRiyadhTodayDate();
    return previewResult.chargedTo > riyadhToday;
  }, [previewResult]);

  // Last settlement information for selected account & assignment in modal
  const lastSettlementInfo = useMemo(() => {
    if (!modalAccountId) return null;

    const forAccount = settlements.filter((s) => s.accountId === modalAccountId);
    if (forAccount.length === 0) {
      return {
        latest: null,
        totalCount: 0,
        isSpecificToAssignment: false,
        nextSuggested: null,
      };
    }

    const forAssignment = selectedAssignmentId
      ? forAccount.filter((s) => s.assignmentId === selectedAssignmentId)
      : [];

    const targetList = forAssignment.length > 0 ? forAssignment : forAccount;

    const sorted = [...targetList].sort((a, b) => {
      const dateA = a.periodTo || a.chargedTo || "";
      const dateB = b.periodTo || b.chargedTo || "";
      return dateB.localeCompare(dateA);
    });

    const latest = sorted[0];

    // Compute next suggested period
    let nextSuggested: { year: number; month: number; half: 1 | 2 } | null = null;
    const refDateStr = latest?.periodTo || latest?.chargedTo;
    if (refDateStr) {
      const parts = refDateStr.split("-");
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          if (d <= 15) {
            // Last was Half 1 -> next is Half 2 of same month
            nextSuggested = { year: y, month: m, half: 2 };
          } else {
            // Last was Half 2 -> next is next month Half 1
            if (m === 12) {
              nextSuggested = { year: y + 1, month: 1, half: 1 };
            } else {
              nextSuggested = { year: y, month: m + 1, half: 1 };
            }
          }
        }
      }
    }

    return {
      latest,
      totalCount: forAccount.length,
      isSpecificToAssignment: forAssignment.length > 0,
      nextSuggested,
    };
  }, [settlements, modalAccountId, selectedAssignmentId]);

  // -------------------------------------------------------------
  // Handle Preview
  // -------------------------------------------------------------
  const handlePreview = async () => {
    setPreviewError(null);

    if (!selectedAssignmentId) {
      setPreviewError("يرجى اختيار تكليف المندوب أولاً.");
      return;
    }

    const startNum = parseFloat(startWalletAmount);
    const endNum = parseFloat(endWalletAmount);

    if (isNaN(startNum) || startNum < 0) {
      setPreviewError("رصيد البداية يجب أن يكون رقماً غير سالب (0 مسموح).");
      return;
    }

    if (isNaN(endNum) || endNum < 0) {
      setPreviewError("رصيد النهاية يجب أن يكون رقماً غير سالب.");
      return;
    }

    if (endNum < startNum) {
      setPreviewError("رصيد النهاية يجب أن يكون أكبر من أو يساوي رصيد البداية.");
      return;
    }

    const payload: ChefzSettlementRequest = {
      assignmentId: selectedAssignmentId,
      year: modalYear,
      month: modalMonth,
      half: modalHalf,
      startWalletAmount: startNum,
      endWalletAmount: endNum,
    };

    setPreviewLoading(true);
    try {
      const res = await previewChefzSettlement(payload);
      setPreviewResult(res);
    } catch (err: unknown) {
      const e = err as { details?: { detail?: string; message?: string }; message?: string };
      const msg = e?.details?.detail || e?.details?.message || e?.message || "تعذر إجراء المعاينة.";
      setPreviewError(msg);
      setPreviewResult(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Handle Save
  // -------------------------------------------------------------
  const handleSaveSettlement = async () => {
    if (!previewResult || !selectedAssignmentId) return;

    setSaveLoading(true);
    setPreviewError(null);

    const startNum = parseFloat(startWalletAmount);
    const endNum = parseFloat(endWalletAmount);

    const payload: ChefzSettlementRequest = {
      assignmentId: selectedAssignmentId,
      year: modalYear,
      month: modalMonth,
      half: modalHalf,
      startWalletAmount: startNum,
      endWalletAmount: endNum,
    };

    try {
      const saved = await createChefzSettlement(payload);
      setSettlements((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
      setIsModalOpen(false);
      setPreviewResult(null);
      setSelectedSettlement(saved); // Open receipt
    } catch (err: unknown) {
      const e = err as { status?: number; details?: { detail?: string; message?: string }; message?: string };
      const msg =
        e?.details?.detail ||
        e?.details?.message ||
        e?.message ||
        "تعذر حفظ التصفية (قد تكون محفوظة مسبقاً بأرقام مختلفة).";
      setPreviewError(msg);
    } finally {
      setSaveLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Filtered settlements list
  // -------------------------------------------------------------
  const filteredSettlements = useMemo(() => {
    return settlements.filter((s) => {
      if (filterAccountId && s.accountId !== filterAccountId) return false;
      if (filterRiderId && s.riderProfileId !== filterRiderId) return false;
      if (filterSponsor !== "all" && (s.sponsorNameAr?.trim() || "") !== filterSponsor) return false;
      if (filterYear !== "all") {
        const sYear = s.periodFrom.slice(0, 4);
        if (sYear !== filterYear) return false;
      }
      if (filterMonth !== "all") {
        const sMonth = String(parseInt(s.periodFrom.slice(5, 7), 10));
        if (sMonth !== filterMonth) return false;
      }
      if (filterHalf !== "all") {
        const day = parseInt(s.periodFrom.slice(8, 10), 10);
        const isFirstHalf = !isNaN(day) ? day <= 15 : s.periodFrom.endsWith("-01");
        if (filterHalf === "1" && !isFirstHalf) return false;
        if (filterHalf === "2" && isFirstHalf) return false;
      }
      return true;
    });
  }, [settlements, filterAccountId, filterRiderId, filterSponsor, filterYear, filterMonth, filterHalf]);

  // Reset to first page when any filter changes
  useEffect(() => {
    setPage(1);
  }, [filterAccountId, filterRiderId, filterSponsor, filterYear, filterMonth, filterHalf, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredSettlements.length / pageSize));

  const paginatedSettlements = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredSettlements.slice(startIndex, startIndex + pageSize);
  }, [filteredSettlements, page, pageSize]);

  const availableSponsors = useMemo(() => {
    const set = new Set<string>();
    for (const s of settlements) {
      if (s.sponsorNameAr?.trim()) {
        set.add(s.sponsorNameAr.trim());
      }
    }
    return Array.from(set).sort();
  }, [settlements]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    const curYear = String(new Date().getFullYear());
    set.add(curYear);
    set.add(String(Number(curYear) - 1));
    for (const s of settlements) {
      const yr = s.periodFrom?.slice(0, 4);
      if (yr) set.add(yr);
    }
    return Array.from(set).sort().reverse();
  }, [settlements]);

  const hasActiveFilters =
    Boolean(filterAccountId) ||
    Boolean(filterRiderId) ||
    filterSponsor !== "all" ||
    filterYear !== "all" ||
    filterMonth !== "all" ||
    filterHalf !== "all";

  const clearFilters = () => {
    setFilterAccountId("");
    setFilterRiderId("");
    setFilterSponsor("all");
    setFilterYear("all");
    setFilterMonth("all");
    setFilterHalf("all");
  };

  // Excel Export
  const handleExportExcel = () => {
    exportToExcel({
      filename: `chefz-settlements-${new Date().toISOString().split("T")[0]}`,
      sheetName: "Chefz Settlements",
      data: filteredSettlements,
      columns: [
        {
          header: "المصدر",
          accessor: (s) => (s.source === "Orders" || s.importId ? "ملف الطلبات" : "رصيد المحفظة"),
          isText: true,
        },
        { header: "الفترة من", accessor: (s) => s.periodFrom, isText: true },
        { header: "الفترة إلى", accessor: (s) => s.periodTo, isText: true },
        { header: "كود الحساب", accessor: (s) => baseAccountMap.get(s.accountId)?.code || s.accountId, isText: true },
        {
          header: "المعرف الخارجي",
          accessor: (s) => baseAccountMap.get(s.accountId)?.externalAccountId || "—",
          isText: true,
        },
        {
          header: "المندوب الفعلي",
          accessor: (s) => s.riderName || riderMap.get(s.riderProfileId)?.fullNameAr || "مندوب سابق",
        },
        {
          header: "رقم الإقامة",
          accessor: (s) => s.riderIqamaNo ?? "—",
          isText: true,
        },
        {
          header: "الكفيل",
          accessor: (s) => s.sponsorNameAr || "—",
          isText: true,
        },
        {
          header: "نوع الحساب",
          accessor: (s) => (s.accountType === "Freelancer" ? "فريلانسر" : "دوام كامل"),
        },
        { header: "أيام التكليف المحسوبة", accessor: (s) => s.assignedDays },
        { header: "صفوف التقرير", accessor: (s) => s.sourceRows ?? "—" },
        {
          header: "رصيد البداية",
          accessor: (s) => (s.source === "Orders" ? "—" : s.startWalletAmount),
        },
        {
          header: "رصيد النهاية",
          accessor: (s) => (s.source === "Orders" ? "—" : s.endWalletAmount),
        },
        { header: "إجمالي الأرباح", accessor: (s) => s.grossEarnings },
        { header: "مستحق الشركة", accessor: (s) => s.companyAmount },
        { header: "مستحق المندوب", accessor: (s) => s.riderAmount },
      ],
    });
  };

  if (!can("chefz.read")) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <div className="mx-auto max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <ShieldAlert className="mx-auto mb-3 text-red-500" size={32} />
          <h2 className="text-lg font-bold text-[var(--foreground)]">لا توجد صلاحية للوصول</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            ليس لديك الصلاحية الكافية لعرض تصفيات شيفز (chefz.read).
          </p>
        </div>
      </div>
    );
  }

  // If in Bulk Order Settlements Mode, render the full-width panel
  if (viewMode === "bulk-orders") {
    return (
      <ChefzBulkOrderSettlementPanel
        viewImportId={viewImportId}
        onBack={() => {
          setViewMode("history");
          setViewImportId(null);
          loadData();
        }}
        onSaveSuccess={() => {
          loadData();
        }}
      />
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
              تصفيات شيفز
            </h1>
            <Badge tone="blue">نصف شهرية</Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            احتساب وتوثيق تصفيات الحسابات لنصفي الشهر (من ملف الطلبات أو المحفظة اليدوية) وفق قواعد فريلانسر ودوام كامل.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={loadData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>

          <Button
            variant="secondary"
            onClick={handleExportExcel}
            disabled={loading || filteredSettlements.length === 0}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            تصدير إكسل
          </Button>

          {/* Action: Bulk Order Settlements */}
          <Button
            variant="secondary"
            onClick={() => {
              setViewImportId(null);
              setViewMode("bulk-orders");
            }}
            className="gap-2 border-[var(--brand)] text-[var(--brand)] hover:bg-blue-50 dark:hover:bg-blue-950/40"
          >
            <Upload className="h-4 w-4" />
            تصفية من ملف الطلبات
          </Button>

          {can("chefz.settlements.create") && (
            <Button
              onClick={() => {
                setIsModalOpen(true);
                invalidatePreview();
              }}
              className="gap-2 bg-[var(--brand)] text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              تصفية يدوية
            </Button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {/* Account Filter */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">تصفية بالحساب</label>
            <SearchableSelect
              value={filterAccountId}
              onChange={setFilterAccountId}
              options={[
                { value: "", label: "جميع حسابات شيفز" },
                ...baseAccounts.map((a) => ({
                  value: a.id,
                  label: `${a.code} ${a.externalAccountId ? `(${a.externalAccountId})` : ""} — ${a.ownerRiderNameAr || "بدون مالك"}${
                    a.currentAssignment?.actualRiderNameAr && a.currentAssignment.actualRiderNameAr !== a.ownerRiderNameAr
                      ? ` (${a.currentAssignment.actualRiderNameAr})`
                      : ""
                  }`,
                  keywords: `${a.code} ${a.externalAccountId || ""} ${a.userName || ""} ${a.ownerRiderNameAr || ""} ${a.ownerRiderNameEn || ""} ${a.currentAssignment?.actualRiderNameAr || ""} ${a.currentAssignment?.actualRiderNameEn || ""}`,
                })),
              ]}
              placeholder="اختر الحساب..."
            />
          </div>

          {/* Rider Filter */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">تصفية بالمندوب الفعلي</label>
            <SearchableSelect
              value={filterRiderId}
              onChange={setFilterRiderId}
              options={[
                { value: "", label: "جميع المناديب" },
                ...riders.map((r) => ({
                  value: r.id,
                  label: `${r.fullNameAr} (${r.iqamaNo || "بدون إقامة"})`,
                  keywords: `${r.fullNameAr} ${r.iqamaNo || ""}`,
                })),
              ]}
              placeholder="اختر المندوب..."
            />
          </div>

          {/* Sponsor Filter */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">تصفية بالكفيل</label>
            <select
              value={filterSponsor}
              onChange={(e) => setFilterSponsor(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            >
              <option value="all">جميع الكفلاء {availableSponsors.length > 0 ? `(${availableSponsors.length})` : ""}</option>
              {availableSponsors.map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">السنة (محلي)</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            >
              <option value="all">جميع السنوات</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">الشهر (محلي)</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            >
              <option value="all">جميع الشهور</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={String(m)}>
                  شهر {m}
                </option>
              ))}
            </select>
          </div>

          {/* Half Filter */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">نصف الشهر</label>
            <select
              value={filterHalf}
              onChange={(e) => setFilterHalf(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            >
              <option value="all">كلا النصفيْن (كامل الشهر)</option>
              <option value="1">النصف الأول (1 - 15)</option>
              <option value="2">النصف الثاني (16 - نهاية الشهر)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--muted)] border-t border-[var(--border)] pt-3">
          <span>
            عدد التصفيات المعروضة:{" "}
            <strong className="text-[var(--foreground)]">{filteredSettlements.length}</strong>
            {filteredSettlements.length !== settlements.length && (
              <span className="font-mono mr-1">(من إجمالي {settlements.length})</span>
            )}
          </span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[var(--brand)] hover:underline font-semibold flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" />
              إلغاء التصفية
            </button>
          )}
        </div>
      </div>

      {/* Settlements Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--table-header-bg)] text-xs font-bold text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3.5">فترة التصفية</th>
                <th className="px-4 py-3.5">المصدر</th>
                <th className="px-4 py-3.5">الحساب</th>
                <th className="px-4 py-3.5">المندوب الفعلي</th>
                <th className="px-4 py-3.5">الكفيل</th>
                <th className="px-4 py-3.5">النوع</th>
                <th className="px-4 py-3.5">أيام التكليف</th>
                <th className="px-4 py-3.5">بداية المحفظة</th>
                <th className="px-4 py-3.5">نهاية المحفظة</th>
                <th className="px-4 py-3.5">إجمالي الأرباح</th>
                <th className="px-4 py-3.5">مستحق الشركة</th>
                <th className="px-4 py-3.5">مستحق المندوب</th>
                <th className="px-4 py-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-sm text-[var(--muted)]">
                    <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-[var(--brand)]" />
                    جارٍ تحميل سجلات التصفيات...
                  </td>
                </tr>
              ) : filteredSettlements.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-sm text-[var(--muted)]">
                    لا توجد تصفيات مسجلة مطابقة للبحث.
                  </td>
                </tr>
              ) : (
                paginatedSettlements.map((s) => {
                  const acc = baseAccountMap.get(s.accountId);
                  const rider = riderMap.get(s.riderProfileId);
                  const isOrdersSource = s.source === "Orders" || Boolean(s.importId);

                  return (
                    <tr
                      key={s.id}
                      className="transition-colors hover:bg-[var(--table-row-hover)]"
                    >
                      {/* Period */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--foreground)]" dir="ltr">
                          {s.periodFrom} → {s.periodTo}
                        </div>
                        <div className="text-xs text-[var(--muted)]">
                          {s.periodFrom.slice(8, 10) === "01" ? "النصف الأول" : "النصف الثاني"}
                        </div>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3">
                        {isOrdersSource ? (
                          <Badge tone="blue" className="gap-1">
                            <FileSpreadsheet className="h-3 w-3 text-emerald-600" />
                            ملف الطلبات
                          </Badge>
                        ) : (
                          <Badge tone="gray">رصيد المحفظة</Badge>
                        )}
                        {s.sourceRows ? (
                          <div className="text-[10px] text-[var(--muted)] mt-0.5">
                            {s.sourceRows} صف بالتقرير
                          </div>
                        ) : null}
                      </td>

                      {/* Account */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--foreground)]">
                          {acc?.code || s.accountId.slice(0, 8)}
                        </div>
                        {acc?.externalAccountId && (
                          <div className="text-xs text-[var(--muted)]" dir="ltr">
                            {acc.externalAccountId}
                          </div>
                        )}
                      </td>

                      {/* Actual Rider */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--foreground)]">
                          {s.riderName || rider?.fullNameAr || "مندوب سابق"}
                        </div>
                        <div className="text-xs text-[var(--muted)] font-mono" dir="ltr">
                          الإقامة: {s.riderIqamaNo ?? "—"}
                        </div>
                      </td>

                      {/* Sponsor */}
                      <td className="px-4 py-3 text-xs text-[var(--foreground)]">
                        {s.sponsorNameAr || "—"}
                      </td>

                      {/* Account Type */}
                      <td className="px-4 py-3">
                        <Badge tone={s.accountType === "Freelancer" ? "blue" : "orange"}>
                          {s.accountType === "Freelancer" ? "فريلانسر" : "دوام كامل"}
                        </Badge>
                      </td>

                      {/* Assigned Days */}
                      <td className="px-4 py-3 text-xs">
                        <div className="font-bold text-[var(--foreground)]" dir="ltr">
                          {s.assignedDays} يوم
                        </div>
                        <div className="text-[var(--muted)]" dir="ltr">
                          {s.chargedFrom} إلى {s.chargedTo}
                        </div>
                      </td>

                      {/* Start Wallet */}
                      <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                        {isOrdersSource ? (
                          <span className="text-[var(--muted)]" title="تصفية من ملف الطلبات (لا تعتمد على رصيد المحفظة)">
                            —
                          </span>
                        ) : (
                          `${s.startWalletAmount.toLocaleString()} ر.س`
                        )}
                      </td>

                      {/* End Wallet */}
                      <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                        {isOrdersSource ? (
                          <span className="text-[var(--muted)]" title="تصفية من ملف الطلبات (لا تعتمد على رصيد المحفظة)">
                            —
                          </span>
                        ) : (
                          `${s.endWalletAmount.toLocaleString()} ر.س`
                        )}
                      </td>

                      {/* Gross Earnings */}
                      <td className="px-4 py-3 font-bold text-xs" dir="ltr">
                        {s.grossEarnings.toLocaleString()} ر.س
                      </td>

                      {/* Company Amount */}
                      <td className="px-4 py-3 font-bold text-xs text-blue-600 dark:text-blue-400" dir="ltr">
                        {s.companyAmount.toLocaleString()} ر.س
                      </td>

                      {/* Rider Amount */}
                      <td className="px-4 py-3 font-bold text-xs" dir="ltr">
                        {s.riderAmount >= 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +{s.riderAmount.toLocaleString()} ر.س
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">
                            {s.riderAmount.toLocaleString()} ر.س (مستحق عليه)
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {s.importId ? (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setViewImportId(s.importId!);
                                setViewMode("bulk-orders");
                              }}
                              className="gap-1.5 text-xs text-[var(--brand)] border-[var(--brand)]"
                              title="عرض التصفية المحفوظة بالكامل"
                            >
                              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                              عرض التصفية المحفوظة
                            </Button>
                          ) : null}

                          <Button
                            variant="secondary"
                            onClick={() => setSelectedSettlement(s)}
                            className="gap-1.5 text-xs"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            عرض الإيصال
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-[var(--border)] bg-[var(--table-header-bg)] px-4 py-3 text-xs text-[var(--muted)]">
          <div>
            عرض {paginatedSettlements.length} من أصل {filteredSettlements.length} تصفية مطابقة
            {filteredSettlements.length !== settlements.length && (
              <span className="font-mono mr-1">
                (من إجمالي {settlements.length} تصفية)
              </span>
            )}
            {" "}— (الصفحة {page} من {totalPages})
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <span>عرض:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-[var(--border)] bg-[var(--card-bg)] px-2 py-1 text-xs text-[var(--foreground)] focus:outline-hidden"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(1)}
                className="h-8 px-2 text-[11px]"
                title="الصفحة الأولى"
              >
                الأولى
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8 p-0"
                title="الصفحة السابقة"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-[var(--foreground)] px-1">
                {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 w-8 p-0"
                title="الصفحة التالية"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                className="h-8 px-2 text-[11px]"
                title="الصفحة الأخيرة"
              >
                الأخيرة
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Modal: New Settlement (Workflow)                               */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="إنشاء تصفية محفظة جديدة لشيفز"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5" dir="rtl">
          {previewError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{previewError}</span>
              </div>
            </div>
          )}

          {/* Step 1: Select Account */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">
              1. اختيار الحساب <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              value={modalAccountId}
              onChange={(val) => {
                setModalAccountId(val);
                invalidatePreview();
              }}
              options={baseAccounts.map((a) => {
                const chefz = chefzAccountMap.get(a.id);
                const assignedRider = a.currentAssignment?.actualRiderNameAr;
                return {
                  value: a.id,
                  label: `${a.code} — ${a.ownerRiderNameAr || "بدون مالك"}${
                    assignedRider && assignedRider !== a.ownerRiderNameAr
                      ? ` (المعيّن: ${assignedRider})`
                      : ""
                  } ${
                    chefz ? `(${chefz.accountType === "Freelancer" ? "فريلانسر" : "دوام كامل"})` : "(غير معد)"
                  }`,
                  sublabel: `${a.userName ? `المستخدم: ${a.userName}` : ""} ${a.externalAccountId ? `| معرف: ${a.externalAccountId}` : ""}`.trim() || undefined,
                  keywords: `${a.code} ${a.externalAccountId || ""} ${a.userName || ""} ${a.ownerRiderNameAr || ""} ${a.ownerRiderNameEn || ""} ${a.currentAssignment?.actualRiderNameAr || ""} ${a.currentAssignment?.actualRiderNameEn || ""}`,
                };
              })}
              placeholder="ابحث بكود الحساب، اسم المالك، المندوب المعيّن، أو اسم المستخدم..."
            />
          </div>

          {/* Step 2: Select Assignment */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">
              2. اختيار فترة تكليف المندوب <span className="text-red-500">*</span>
            </label>
            {loadingAssignments ? (
              <div className="p-3 text-xs text-[var(--muted)] flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                جارٍ تحميل فترات التكليف المسجلة للحساب...
              </div>
            ) : accountAssignments.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                لا توجد تكليفات نشطة أو سابقة لهذا الحساب. يجب تعيين مندوب أولاً قبل إجراء التصفية.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto rounded-xl border border-[var(--border)] p-2">
                {accountAssignments.map((asgn) => {
                  const isSelected = selectedAssignmentId === asgn.id;
                  return (
                    <div
                      key={asgn.id}
                      onClick={() => {
                        setSelectedAssignmentId(asgn.id);
                        invalidatePreview();
                      }}
                      className={`flex cursor-pointer items-center justify-between rounded-lg p-2.5 text-xs transition-all ${
                        isSelected
                          ? "border border-[var(--brand)] bg-blue-50/60 dark:bg-blue-950/40 font-semibold"
                          : "hover:bg-[var(--subtle-bg)]"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-[var(--foreground)]">
                          {asgn.actualRiderNameAr || "مندوب سابق"}
                        </div>
                        <div className="text-[var(--muted)]" dir="ltr">
                          من {asgn.effectiveFrom} إلى {asgn.effectiveTo || "مستمر"}
                        </div>
                      </div>
                      <Badge tone={asgn.status === "Active" ? "green" : "gray"}>
                        {asgn.status === "Active" ? "نشط حالياً" : "منتهي"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Last Settlement Information Card */}
          {modalAccountId && (
            <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/70 p-3.5 dark:border-indigo-900/50 dark:bg-indigo-950/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                    تاريخ آخر تصفية:
                  </span>
                </div>

                {lastSettlementInfo?.latest ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 font-mono text-xs font-bold text-white shadow-xs">
                      {lastSettlementInfo.latest.periodTo || lastSettlementInfo.latest.chargedTo}
                    </span>
                    <span className="text-[11px] text-gray-600 dark:text-gray-300">
                      (الفترة: {lastSettlementInfo.latest.periodFrom || lastSettlementInfo.latest.chargedFrom} إلى {lastSettlementInfo.latest.periodTo || lastSettlementInfo.latest.chargedTo})
                    </span>
                  </div>
                ) : (
                  <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    لا توجد تصفية سابقة لهذا الحساب
                  </span>
                )}
              </div>

              {lastSettlementInfo?.latest && (
                <div className="mt-2.5 space-y-2 border-t border-indigo-200/60 pt-2 text-[11px] text-gray-600 dark:border-indigo-900/40 dark:text-gray-400">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>
                      إجمالي التصفيات المنفذة للحساب:{" "}
                      <strong className="text-indigo-700 dark:text-indigo-300 font-bold">
                        {lastSettlementInfo.totalCount}
                      </strong>
                    </span>
                    <span>
                      مصدر آخر تصفية:{" "}
                      <strong className="font-semibold text-gray-800 dark:text-gray-200">
                        {lastSettlementInfo.latest.source === "Orders" ? "ملف طلبات إكسل" : "تصفية محفظة يدوية"}
                      </strong>
                    </span>
                    {lastSettlementInfo.latest.riderAmount !== undefined && (
                      <span>
                        صافي المندوب:{" "}
                        <strong className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {Number(lastSettlementInfo.latest.riderAmount).toFixed(2)} ر.س
                        </strong>
                      </span>
                    )}
                    {lastSettlementInfo.latest.endWalletAmount !== undefined && (
                      <span>
                        رصيد إغلاق المحفظة السابق:{" "}
                        <strong className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {Number(lastSettlementInfo.latest.endWalletAmount).toFixed(2)} ر.س
                        </strong>
                      </span>
                    )}
                  </div>

                  {/* Quick-action helpers based on last settlement */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {lastSettlementInfo.nextSuggested && (
                      <button
                        type="button"
                        onClick={() => {
                          if (lastSettlementInfo.nextSuggested) {
                            setModalYear(lastSettlementInfo.nextSuggested.year);
                            setModalMonth(lastSettlementInfo.nextSuggested.month);
                            setModalHalf(lastSettlementInfo.nextSuggested.half);
                            invalidatePreview();
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-indigo-100 hover:bg-indigo-200 px-2 py-1 text-[10px] font-bold text-indigo-800 dark:bg-indigo-900/60 dark:hover:bg-indigo-900 dark:text-indigo-200 transition-colors"
                        title="تحديد الفترة التالية مباشرة بناءً على تاريخ آخر تصفية"
                      >
                        <Clock className="h-3 w-3" />
                        الفترة المقترحة التالية: شهر {lastSettlementInfo.nextSuggested.month} / {lastSettlementInfo.nextSuggested.year} ({lastSettlementInfo.nextSuggested.half === 1 ? "النصف الأول" : "النصف الثاني"}) — اضغط للتطبيق
                      </button>
                    )}

                    {lastSettlementInfo.latest.endWalletAmount !== undefined &&
                      Number(lastSettlementInfo.latest.endWalletAmount) >= 0 &&
                      startWalletAmount !== String(lastSettlementInfo.latest.endWalletAmount) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (lastSettlementInfo.latest.endWalletAmount !== undefined) {
                              setStartWalletAmount(String(lastSettlementInfo.latest.endWalletAmount));
                              invalidatePreview();
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-100 hover:bg-emerald-200 px-2 py-1 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 dark:text-emerald-200 transition-colors"
                          title="استخدام رصيد إغلاق آخر تصفية كرصيد بداية لهذه التصفية"
                        >
                          <Coins className="h-3 w-3" />
                          استخدام رصيد الإغلاق ({Number(lastSettlementInfo.latest.endWalletAmount).toFixed(2)} ر.س) كرصيد بداية
                        </button>
                      )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Period Selection (Year, Month, Half) */}
          <div className="space-y-2 border-t border-[var(--border)] pt-3">
            <label className="text-xs font-bold text-[var(--foreground)]">
              3. تحديد فترة التصفية
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-[var(--muted)] mb-1 block">السنة</label>
                <input
                  type="number"
                  value={modalYear}
                  onChange={(e) => {
                    setModalYear(parseInt(e.target.value, 10) || currentYear);
                    invalidatePreview();
                  }}
                  min={2020}
                  max={2030}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
                />
              </div>

              <div>
                <label className="text-[11px] text-[var(--muted)] mb-1 block">الشهر</label>
                <select
                  value={modalMonth}
                  onChange={(e) => {
                    setModalMonth(parseInt(e.target.value, 10));
                    invalidatePreview();
                  }}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      شهر {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-[var(--muted)] mb-1 block">نصف الشهر</label>
                <select
                  value={modalHalf}
                  onChange={(e) => {
                    setModalHalf(parseInt(e.target.value, 10) as 1 | 2);
                    invalidatePreview();
                  }}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
                >
                  <option value={1}>النصف الأول (1 - 15)</option>
                  <option value={2}>النصف الثاني (16 - النهاية)</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-[var(--muted)] font-mono" dir="ltr">
              الفترة التقويمية: {calendarPeriodDisplay.from} إلى {calendarPeriodDisplay.to}
            </div>
          </div>

          {/* Step 4: Wallet Readings */}
          <div className="space-y-2 border-t border-[var(--border)] pt-3">
            <label className="text-xs font-bold text-[var(--foreground)]">
              4. قراءات المحفظة (SAR)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[var(--muted)] mb-1 block">
                  رصيد البداية <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={startWalletAmount}
                  onChange={(e) => {
                    setStartWalletAmount(e.target.value);
                    invalidatePreview();
                  }}
                  placeholder="0.00"
                  dir="ltr"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)] font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-[var(--muted)] mb-1 block">
                  رصيد النهاية <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={endWalletAmount}
                  onChange={(e) => {
                    setEndWalletAmount(e.target.value);
                    invalidatePreview();
                  }}
                  placeholder="0.00"
                  dir="ltr"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)] font-mono"
                />
              </div>
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              يجب إدخال رصيدي البداية والنهاية بشكل صريح ومستقل لكل نصف شهر (0 مسموح).
            </p>
          </div>

          {/* Action: Preview Button */}
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handlePreview}
              disabled={previewLoading || !selectedAssignmentId || !endWalletAmount}
              className="gap-2 border-[var(--brand)] text-[var(--brand)] hover:bg-blue-50 dark:hover:bg-blue-950/40 min-w-[160px]"
            >
              <RefreshCw className={`h-4 w-4 ${previewLoading ? "animate-spin" : ""}`} />
              {previewLoading ? "جارٍ الحساب..." : "معاينة نتائج التصفية"}
            </Button>
          </div>

          {/* Step 5: Preview Results Breakdown */}
          {previewResult && (
            <div className="rounded-2xl border border-[var(--brand)] bg-blue-50/40 dark:bg-blue-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--brand)]/20 pb-2">
                <div>
                  <span className="font-bold text-sm text-[var(--foreground)]">نتائج المعاينة المعتمدة من الخادم</span>
                  {(previewResult.riderName || previewResult.riderIqamaNo) && (
                    <div className="text-xs text-[var(--muted)] mt-0.5">
                      {previewResult.riderName && <strong className="text-[var(--foreground)] ml-2">{previewResult.riderName}</strong>}
                      <span>رقم الإقامة: <strong className="font-mono text-[var(--foreground)]">{previewResult.riderIqamaNo ?? "—"}</strong></span>
                    </div>
                  )}
                </div>
                <Badge tone={previewResult.accountType === "Freelancer" ? "blue" : "orange"}>
                  {previewResult.accountType === "Freelancer" ? "فريلانسر (15%)" : "دوام كامل (25 ر.س/يوم)"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[var(--muted)]">فترة الاحتساب:</span>{" "}
                  <strong dir="ltr">{previewResult.chargedFrom} → {previewResult.chargedTo}</strong>
                </div>
                <div>
                  <span className="text-[var(--muted)]">أيام التكليف:</span>{" "}
                  <strong>{previewResult.assignedDays} يوم</strong>
                </div>
                <div>
                  <span className="text-[var(--muted)]">رصيد البداية:</span>{" "}
                  <strong dir="ltr">{previewResult.startWalletAmount.toLocaleString()} ر.س</strong>
                </div>
                <div>
                  <span className="text-[var(--muted)]">رصيد النهاية:</span>{" "}
                  <strong dir="ltr">{previewResult.endWalletAmount.toLocaleString()} ر.س</strong>
                </div>
                <div>
                  <span className="text-[var(--muted)]">إجمالي الأرباح:</span>{" "}
                  <strong dir="ltr">{previewResult.grossEarnings.toLocaleString()} ر.س</strong>
                </div>
                <div>
                  <span className="text-[var(--muted)]">مستحق الشركة:</span>{" "}
                  <strong className="text-blue-600" dir="ltr">{previewResult.companyAmount.toLocaleString()} ر.س</strong>
                </div>
              </div>

              {/* Final Rider Net Amount */}
              <div className="rounded-xl bg-white dark:bg-slate-900 p-3 flex items-center justify-between border border-[var(--border)]">
                <span className="font-bold text-sm text-[var(--foreground)]">صافي المستحق للمندوب:</span>
                <span
                  className={`font-extrabold text-base ${
                    previewResult.riderAmount >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                  dir="ltr"
                >
                  {previewResult.riderAmount >= 0
                    ? `+${previewResult.riderAmount.toLocaleString()} ر.س`
                    : `${previewResult.riderAmount.toLocaleString()} ر.س (مستحق على المندوب)`}
                </span>
              </div>

              {/* Future Notice */}
              {isFuturePreview && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    هذه معاينة فقط لفترة مستقبلية. لا يمكن حفظ التصفية حتى ينتهي يوم الاحتساب ({previewResult.chargedTo}).
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={saveLoading}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleSaveSettlement}
              disabled={saveLoading || !previewResult || isFuturePreview}
              className="bg-[var(--brand)] text-white hover:opacity-90 min-w-[130px]"
            >
              {saveLoading ? "جارٍ الحفظ..." : "حفظ التصفية"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* Modal: Receipt View / Print                                    */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(selectedSettlement)}
        onClose={() => setSelectedSettlement(null)}
        title="إيصال تصفية محفظة شيفز"
        maxWidth="max-w-md"
      >
        {selectedSettlement && (
          <div className="space-y-4 text-xs" dir="rtl" id="settlement-receipt">
            <div className="text-center border-b border-[var(--border)] pb-3">
              <h2 className="text-base font-extrabold text-[var(--foreground)]">إيصال تصفية معتمد</h2>
              <p className="text-[var(--muted)] font-mono text-[11px]" dir="ltr">
                ID: {selectedSettlement.id}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">الحساب:</span>
                <span className="font-bold text-[var(--foreground)]">
                  {baseAccountMap.get(selectedSettlement.accountId)?.code || selectedSettlement.accountId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">المندوب الفعلي:</span>
                <span className="font-bold text-[var(--foreground)]">
                  {selectedSettlement.riderName || riderMap.get(selectedSettlement.riderProfileId)?.fullNameAr || "مندوب سابق"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">رقم الإقامة:</span>
                <span className="font-mono font-bold text-[var(--foreground)]" dir="ltr">
                  {selectedSettlement.riderIqamaNo ?? "—"}
                </span>
              </div>
              {selectedSettlement.sponsorNameAr && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">الكفيل:</span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {selectedSettlement.sponsorNameAr}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">فترة التصفية:</span>
                <span className="font-mono text-[var(--foreground)]" dir="ltr">
                  {selectedSettlement.periodFrom} → {selectedSettlement.periodTo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">أيام التكليف المحسوبة:</span>
                <span className="font-semibold text-[var(--foreground)]" dir="ltr">
                  {selectedSettlement.assignedDays} يوم ({selectedSettlement.chargedFrom} إلى {selectedSettlement.chargedTo})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">نوع الحساب وقاعدته:</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {selectedSettlement.accountType === "Freelancer"
                    ? "فريلانسر (15% عمولة)"
                    : "دوام كامل (25 ر.س / يوم)"}
                </span>
              </div>
            </div>

            {/* Financial Details */}
            {selectedSettlement.source === "Orders" || selectedSettlement.importId ? (
              <div className="border-t border-dashed border-[var(--border)] pt-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">مصدر التصفية:</span>
                  <span className="font-bold text-blue-600">ملف الطلبات (.xlsx)</span>
                </div>
                {selectedSettlement.importId && (
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">معرّف الدفعة:</span>
                    <span className="font-mono text-[10px]" dir="ltr">
                      {selectedSettlement.importId}
                    </span>
                  </div>
                )}
                {typeof selectedSettlement.sourceRows === "number" && (
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">عدد صفوف التقرير:</span>
                    <span className="font-mono font-bold">{selectedSettlement.sourceRows}</span>
                  </div>
                )}
                {typeof selectedSettlement.deliveryFees === "number" && (
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">رسوم التوصيل:</span>
                    <span className="font-mono" dir="ltr">
                      {selectedSettlement.deliveryFees.toLocaleString()} ر.س
                    </span>
                  </div>
                )}
                {typeof selectedSettlement.vatAmount === "number" && (
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">خصم الضريبة:</span>
                    <span className="font-mono text-red-600" dir="ltr">
                      -{selectedSettlement.vatAmount.toLocaleString()} ر.س
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span className="text-[var(--foreground)]">صافي الأرباح:</span>
                  <span className="font-mono text-[var(--foreground)]" dir="ltr">
                    {selectedSettlement.grossEarnings.toLocaleString()} ر.س
                  </span>
                </div>
                <div className="flex justify-between font-bold text-blue-600">
                  <span>مستحق الشركة:</span>
                  <span className="font-mono" dir="ltr">
                    {selectedSettlement.companyAmount.toLocaleString()} ر.س
                  </span>
                </div>
              </div>
            ) : (
              <div className="border-t border-dashed border-[var(--border)] pt-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">رصيد بداية المحفظة:</span>
                  <span className="font-mono text-[var(--foreground)]" dir="ltr">
                    {selectedSettlement.startWalletAmount.toLocaleString()} ر.س
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">رصيد نهاية المحفظة:</span>
                  <span className="font-mono text-[var(--foreground)]" dir="ltr">
                    {selectedSettlement.endWalletAmount.toLocaleString()} ر.س
                  </span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-[var(--foreground)]">إجمالي الأرباح:</span>
                  <span className="font-mono text-[var(--foreground)]" dir="ltr">
                    {selectedSettlement.grossEarnings.toLocaleString()} ر.س
                  </span>
                </div>
                <div className="flex justify-between font-bold text-blue-600">
                  <span>مستحق الشركة:</span>
                  <span className="font-mono" dir="ltr">
                    {selectedSettlement.companyAmount.toLocaleString()} ر.س
                  </span>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3 flex justify-between items-center text-sm font-extrabold">
              <span className="text-[var(--foreground)]">
                {selectedSettlement.riderAmount >= 0 ? "صافي مستحق للمندوب:" : "مبلغ مستحق على المندوب:"}
              </span>
              <span
                className={selectedSettlement.riderAmount >= 0 ? "text-emerald-600" : "text-red-600"}
                dir="ltr"
              >
                {Math.abs(selectedSettlement.riderAmount).toLocaleString()} ر.س
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
              <Button
                variant="secondary"
                onClick={() => window.print()}
                className="gap-1.5 text-xs"
              >
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
              <Button
                variant="secondary"
                onClick={() => setSelectedSettlement(null)}
              >
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
