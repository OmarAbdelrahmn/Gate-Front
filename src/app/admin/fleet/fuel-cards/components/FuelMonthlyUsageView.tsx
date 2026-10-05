"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { SearchableSelect, SelectOption } from "@/components/ui/SearchableSelect";
import { Badge } from "@/components/ui/Badge";
import { listRiders } from "@/lib/workforce/api";
import {
  getFuelMonthlyUsage,
  getAllFuelMonthlyUsage,
  getFuelUnassignedUsage,
  getAllFuelUnassignedUsage,
  getFuelCard,
  FuelMonthlyUsage,
  FuelMonthlyUsagePage,
  FuelUnassignedUsage,
  FuelUnassignedUsagePage,
  FuelProvider,
  fuelProviderLabels,
  FuelCard,
  getRiyadhTodayDateString,
} from "@/lib/fleet/fuel-cards-api";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Droplet,
  Coins,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  UserPlus,
  Eye,
  Info,
  Layers,
  ArrowRight,
} from "lucide-react";
import { exportToExcel } from "@/lib/export-excel";

interface FuelMonthlyUsageViewProps {
  canManage?: boolean;
  onOpenAssign?: (card: FuelCard) => void;
  onOpenDetail?: (cardId: string) => void;
}

export function FuelMonthlyUsageView({
  canManage = false,
  onOpenAssign,
  onOpenDetail,
}: FuelMonthlyUsageViewProps) {
  // Sub-tab: "monthly" | "unassigned"
  const [subTab, setSubTab] = useState<"monthly" | "unassigned">("monthly");

  // Default to 1st of current month
  const defaultMonth = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}-01`;
  };

  // --- Monthly Usage Tab State ---
  const [month, setMonth] = useState(defaultMonth());
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState<FuelProvider | "">("");
  const [riderProfileId, setRiderProfileId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const [data, setData] = useState<FuelMonthlyUsagePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [ridersOptions, setRidersOptions] = useState<SelectOption[]>([]);
  const [assigningCardId, setAssigningCardId] = useState<string | null>(null);

  // --- Unassigned Queue Tab State ---
  const defaultUnassignedFrom = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}-01`;
  };

  const [unassignedFrom, setUnassignedFrom] = useState(defaultUnassignedFrom());
  const [unassignedTo, setUnassignedTo] = useState(getRiyadhTodayDateString());
  const [unassignedSearch, setUnassignedSearch] = useState("");
  const [unassignedProvider, setUnassignedProvider] = useState<FuelProvider | "">("");
  const [unassignedPage, setUnassignedPage] = useState(1);
  const [unassignedPageSize, setUnassignedPageSize] = useState(50);
  const [unassignedData, setUnassignedData] = useState<FuelUnassignedUsagePage | null>(null);
  const [unassignedLoading, setUnassignedLoading] = useState(false);
  const [unassignedExporting, setUnassignedExporting] = useState(false);

  useEffect(() => {
    listRiders()
      .then((riders) => {
        const options = (riders || []).map((r) => ({
          value: r.id,
          label: r.fullNameAr || r.fullNameEn || "مندوب",
          sublabel: `هوية: ${r.iqamaNo || ""}`,
        }));
        setRidersOptions(options);
      })
      .catch((err) => console.error("Failed to load riders options:", err));
  }, []);

  const fetchMonthlyData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFuelMonthlyUsage({
        month,
        search: search.trim() || undefined,
        provider: provider || undefined,
        riderProfileId: riderProfileId || undefined,
        page,
        pageSize,
      });
      setData(res);
    } catch (err) {
      console.error("Failed to fetch monthly usage:", err);
    } finally {
      setLoading(false);
    }
  }, [month, search, provider, riderProfileId, page, pageSize]);

  useEffect(() => {
    fetchMonthlyData();
  }, [fetchMonthlyData]);

  // Fetch Unassigned Queue Data
  const fetchUnassignedData = useCallback(async () => {
    if (!unassignedFrom || !unassignedTo || unassignedFrom > unassignedTo) return;
    setUnassignedLoading(true);
    try {
      const res = await getFuelUnassignedUsage({
        from: unassignedFrom,
        to: unassignedTo,
        provider: unassignedProvider || undefined,
        search: unassignedSearch.trim() || undefined,
        page: unassignedPage,
        pageSize: unassignedPageSize,
      });
      setUnassignedData(res);
    } catch (err) {
      console.error("Failed to fetch unassigned usage queue:", err);
    } finally {
      setUnassignedLoading(false);
    }
  }, [
    unassignedFrom,
    unassignedTo,
    unassignedProvider,
    unassignedSearch,
    unassignedPage,
    unassignedPageSize,
  ]);

  useEffect(() => {
    if (subTab === "unassigned") {
      fetchUnassignedData();
    }
  }, [subTab, fetchUnassignedData]);

  const items = data?.items || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const totalLiters = data?.totalLiters ?? 0;
  const totalAmount = data?.totalAmount ?? 0;
  const unassignedCount = data?.unassignedCount ?? 0;
  const unassignedTotalLiters = data?.unassignedTotalLiters ?? 0;
  const unassignedTotalAmount = data?.unassignedTotalAmount ?? 0;

  const handleExportExcel = async () => {
    if (totalCount === 0) return;
    setExporting(true);
    try {
      const allMonthlyItems = await getAllFuelMonthlyUsage({
        month,
        search: search.trim() || undefined,
        provider: provider || undefined,
        riderProfileId: riderProfileId || undefined,
      });

      if (allMonthlyItems.length === 0) return;

      await exportToExcel({
        filename: `fuel-monthly-usage-${month}`,
        sheetName: `استهلاك شهر ${month}`.slice(0, 31),
        data: allMonthlyItems,
        columns: [
          { header: "#", accessor: (_, idx) => idx + 1, width: 6 },
          {
            header: "المزود",
            accessor: (item) =>
              item.providerNameAr || fuelProviderLabels[item.provider] || item.provider,
            width: 16,
          },
          { header: "رقم البطاقة", accessor: (item) => item.cardNumber, width: 22, isText: true },
          { header: "رقم اللوحة", accessor: (item) => item.plateNumberText || "—", width: 16, isText: true },
          {
            header: "المندوب المسند له",
            accessor: (item) => item.riderNameAr || item.riderNameEn || (item.riderProfileId ? "مندوب" : "غير مسندة (بحاجة لمراجعة)"),
            width: 24,
          },
          { header: "الرقم الوظيفي للمندوب", accessor: (item) => item.employeeId || "—", width: 18, isText: true },
          { header: "حالة الإسناد", accessor: (item) => item.riderProfileId ? "مسندة" : "بحاجة لمراجعة", width: 16 },
          { header: "الشهر", accessor: (item) => item.reportMonth, width: 14, isText: true },
          { header: "اللترات المستهلكة", accessor: (item) => item.totalLiters ?? 0, width: 18 },
          { header: "المبلغ قبل الضريبة (ر.س)", accessor: (item) => item.amountBeforeTax != null ? item.amountBeforeTax : "—", width: 22 },
          { header: "مبلغ الضريبة (ر.س)", accessor: (item) => item.vatAmount != null ? item.vatAmount : "—", width: 18 },
          { header: "الإجمالي شامل الضريبة (ر.س)", accessor: (item) => item.totalAmount ?? 0, width: 24 },
          { header: "عدد العمليات", accessor: (item) => item.transactionCount != null ? item.transactionCount : "—", width: 14 },
          { header: "نوع الوقود", accessor: (item) => item.fuelType || "—", width: 16 },
          { header: "تاريخ أول عملية", accessor: (item) => item.firstTransactionAtUtc ? item.firstTransactionAtUtc.split("T")[0] : "—", width: 18 },
          { header: "تاريخ آخر عملية", accessor: (item) => item.lastTransactionAtUtc ? item.lastTransactionAtUtc.split("T")[0] : "—", width: 18 },
        ],
      });
    } catch (err) {
      console.error("Export monthly usage error:", err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportUnassignedExcel = async () => {
    if (!unassignedData || unassignedData.totalCount === 0) return;
    setUnassignedExporting(true);
    try {
      const allUnassigned = await getAllFuelUnassignedUsage({
        from: unassignedFrom,
        to: unassignedTo,
        provider: unassignedProvider || undefined,
        search: unassignedSearch.trim() || undefined,
      });

      if (allUnassigned.length === 0) return;

      await exportToExcel({
        filename: `fuel-unassigned-usage-${unassignedFrom}_to_${unassignedTo}`,
        sheetName: "مراجعة الاستهلاك غير المسند".slice(0, 31),
        data: allUnassigned,
        columns: [
          { header: "#", accessor: (_, idx) => idx + 1, width: 6 },
          {
            header: "المزود",
            accessor: (item) => fuelProviderLabels[item.provider] || item.provider,
            width: 16,
          },
          { header: "رقم البطاقة", accessor: (item) => item.cardNumber, width: 22, isText: true },
          { header: "رقم اللوحة", accessor: (item) => item.plateNumberText || "—", width: 16, isText: true },
          { header: "شهر التقرير", accessor: (item) => item.reportMonth, width: 14, isText: true },
          { header: "اللترات المستهلكة", accessor: (item) => item.totalLiters ?? 0, width: 18 },
          { header: "المبلغ الإجمالي (ر.س)", accessor: (item) => item.totalAmount ?? 0, width: 20 },
          { header: "عدد الحركات", accessor: (item) => item.transactionCount != null ? item.transactionCount : "—", width: 14 },
          { header: "تاريخ أول حركة", accessor: (item) => item.firstTransactionAtUtc ? item.firstTransactionAtUtc.split("T")[0] : "—", width: 18 },
          { header: "تاريخ آخر حركة", accessor: (item) => item.lastTransactionAtUtc ? item.lastTransactionAtUtc.split("T")[0] : "—", width: 18 },
          { header: "اسم ملف الاستيراد", accessor: (item) => item.originalFileName, width: 26 },
          { header: "تاريخ الاستيراد", accessor: (item) => item.importedAtUtc ? new Date(item.importedAtUtc).toLocaleString("ar-SA") : "—", width: 22 },
          { header: "ملاحظات البطاقة", accessor: (item) => item.cardNotes || "—", width: 26 },
          { header: "سبب المراجعة", accessor: (item) => item.reviewReason === "card_not_assigned" ? "البطاقة غير مسندة لمندوب" : item.reviewReason, width: 22 },
        ],
      });
    } catch (err) {
      console.error("Export unassigned usage error:", err);
    } finally {
      setUnassignedExporting(false);
    }
  };

  const handleAssignCard = async (fuelCardId: string) => {
    if (!onOpenAssign) return;
    setAssigningCardId(fuelCardId);
    try {
      const card = await getFuelCard(fuelCardId);
      onOpenAssign(card);
    } catch (err) {
      console.error("Failed to load card for assignment:", err);
    } finally {
      setAssigningCardId(null);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
        <button
          type="button"
          onClick={() => setSubTab("monthly")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            subTab === "monthly"
              ? "bg-[#1167c9] text-white shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <FileSpreadsheet size={16} />
          <span>كشف الاستهلاك الشهري</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab("unassigned");
            setUnassignedFrom(month);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            subTab === "unassigned"
              ? "bg-amber-600 text-white shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <AlertCircle size={16} />
          <span>طابور مراجعة الاستهلاك غير المسند</span>
          {unassignedCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-black rounded-full bg-red-500 text-white animate-pulse">
              {unassignedCount}
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: MONTHLY USAGE */}
      {subTab === "monthly" && (
        <div className="space-y-4">
          {/* Unassigned Warning Banner (if any) */}
          {unassignedCount > 0 && (
            <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold">تنبيه حركات غير مسندة: </span>
                  <span>
                    يوجد{" "}
                    <strong className="text-amber-700 dark:text-amber-300 font-black">
                      {unassignedCount}
                    </strong>{" "}
                    سجل استهلاك بحاجة لمراجعة لعدم إسنادها لمندوب، بإجمالي{" "}
                    <strong className="text-amber-700 dark:text-amber-300 font-black">
                      {unassignedTotalAmount.toLocaleString("ar-SA", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      ر.س
                    </strong>{" "}
                    ({unassignedTotalLiters.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} لتر).
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubTab("unassigned");
                  setUnassignedFrom(month);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 transition-colors shadow-xs"
              >
                <span>فتح طابور المراجعة</span>
                <ArrowRight size={14} className="rtl:rotate-180" />
              </button>
            </div>
          )}

          {/* Summary KPI Cards above table */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
              <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
                <span>إجمالي اللترات المستهلكة (للكشف كاملاً)</span>
                <Droplet size={18} className="text-blue-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
                {totalLiters.toLocaleString("ar-SA", { maximumFractionDigits: 2 })}{" "}
                <span className="text-xs font-normal">لتر</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
              <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
                <span>إجمالي المبلغ الشامل للضريبة (للكشف كاملاً)</span>
                <Coins size={18} className="text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {totalAmount.toLocaleString("ar-SA", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                <span className="text-xs font-normal">ر.س</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
              <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
                <span>عدد بطاقات الاستهلاك المقيدة</span>
                <FileSpreadsheet size={18} className="text-indigo-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
                {totalCount} <span className="text-xs font-normal text-[var(--muted)]">سجل</span>
              </p>
            </div>
          </div>

          {/* Filters Toolbar */}
          <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-1">
                {/* Month Selector (Required) */}
                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
                    الشهر المطلوب <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={month}
                    onChange={(e) => {
                      setMonth(e.target.value);
                      setPage(1);
                    }}
                    className="w-full h-10 px-3 text-xs font-bold font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                    required
                  />
                </div>

                {/* Search */}
                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
                    بحث في السجلات
                  </label>
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      placeholder="بحث برقم البطاقة، اللوحة، المندوب..."
                      className="w-full h-10 ps-9 pe-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                    />
                  </div>
                </div>

                {/* Provider Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
                    مزود الخدمة
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => {
                      setProvider(e.target.value as FuelProvider | "");
                      setPage(1);
                    }}
                    className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none cursor-pointer"
                  >
                    <option value="">جميع المزودين...</option>
                    <option value="PetroApp">{fuelProviderLabels.PetroApp}</option>
                    <option value="SayaraApp">{fuelProviderLabels.SayaraApp}</option>
                  </select>
                </div>

                {/* Rider Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
                    تصفية حسب المندوب
                  </label>
                  <SearchableSelect
                    value={riderProfileId}
                    onChange={(val) => {
                      setRiderProfileId(val);
                      setPage(1);
                    }}
                    options={ridersOptions}
                    placeholder="المندوب..."
                    searchPlaceholder="بحث في المناديب..."
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exporting || loading || totalCount === 0}
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
              >
                <FileSpreadsheet size={16} />
                {exporting ? "جاري التصدير..." : "تصدير إكسل"}
              </button>
            </div>
          </div>

          {/* Monthly Usage Table */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="border-b border-[var(--border)] bg-slate-50/80 dark:bg-slate-800/60 font-bold text-[var(--muted)] uppercase">
                  <tr>
                    <th className="px-4 py-3.5 text-start">المزود</th>
                    <th className="px-4 py-3.5 text-start">رقم البطاقة</th>
                    <th className="px-4 py-3.5 text-start">رقم اللوحة</th>
                    <th className="px-4 py-3.5 text-start">المندوب المسند له</th>
                    <th className="px-4 py-3.5 text-start">الشهر</th>
                    <th className="px-4 py-3.5 text-end">اللترات المستهلكة</th>
                    <th className="px-4 py-3.5 text-end">المبلغ قبل الضريبة</th>
                    <th className="px-4 py-3.5 text-end">مبلغ الضريبة</th>
                    <th className="px-4 py-3.5 text-end">الإجمالي شامل الضريبة</th>
                    <th className="px-4 py-3.5 text-center">العمليات / نوع الوقود</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-[var(--muted)]">
                        <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-[#1167c9]" />
                        جاري تحميل تقرير الاستهلاك الشهري...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-[var(--muted)]">
                        لا توجد بيانات استهلاك شهري لشهر ({month}) تطابق الفلترة.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          !item.riderProfileId || item.needsReview
                            ? "bg-amber-50/30 dark:bg-amber-950/15 hover:bg-amber-50/50"
                            : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        {/* Provider */}
                        <td className="px-4 py-3.5">
                          <Badge tone={item.provider === "PetroApp" ? "blue" : "green"}>
                            {item.providerNameAr}
                          </Badge>
                        </td>

                        {/* Card Number */}
                        <td className="px-4 py-3.5 font-bold">
                          <button
                            type="button"
                            onClick={() => onOpenDetail && onOpenDetail(item.fuelCardId)}
                            className="hover:underline text-start"
                          >
                            <span dir="auto" className="fuel-plate text-sm text-[var(--foreground)]">
                              {item.cardNumber}
                            </span>
                          </button>
                        </td>

                        {/* Plate Text */}
                        <td className="px-4 py-3.5">
                          {item.plateNumberText ? (
                            <span
                              dir="auto"
                              className="fuel-plate font-bold text-slate-700 dark:text-slate-300"
                            >
                              {item.plateNumberText}
                            </span>
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>

                        {/* Rider */}
                        <td className="px-4 py-3.5">
                          {item.riderProfileId ? (
                            <Link
                              href={`/admin/employees/${item.employeeId}`}
                              className="font-bold text-[#1167c9] dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              {item.riderNameAr || item.riderNameEn || "مندوب"}
                              <ExternalLink size={12} className="opacity-60" />
                            </Link>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <AlertCircle size={12} />
                                بحاجة لمراجعة
                              </span>
                              {canManage && onOpenAssign && (
                                <button
                                  type="button"
                                  onClick={() => handleAssignCard(item.fuelCardId)}
                                  disabled={assigningCardId === item.fuelCardId}
                                  className="text-[11px] font-bold text-[#1167c9] hover:underline disabled:opacity-50"
                                >
                                  {assigningCardId === item.fuelCardId ? "جاري التحميل..." : "إسناد"}
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Report Month */}
                        <td className="px-4 py-3.5 font-mono text-[var(--muted)] dir-ltr text-start">
                          {item.reportMonth}
                        </td>

                        {/* Total Liters */}
                        <td className="px-4 py-3.5 text-end font-bold text-blue-700 dark:text-blue-400 font-mono">
                          {item.totalLiters.toLocaleString("ar-SA", { maximumFractionDigits: 2 })}
                        </td>

                        {/* Amount Before Tax */}
                        <td className="px-4 py-3.5 text-end font-mono text-[var(--muted)]">
                          {item.amountBeforeTax != null
                            ? item.amountBeforeTax.toLocaleString("ar-SA", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "—"}
                        </td>

                        {/* VAT Amount */}
                        <td className="px-4 py-3.5 text-end font-mono text-[var(--muted)]">
                          {item.vatAmount != null
                            ? item.vatAmount.toLocaleString("ar-SA", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "—"}
                        </td>

                        {/* Total Amount */}
                        <td className="px-4 py-3.5 text-end font-bold text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                          {item.totalAmount.toLocaleString("ar-SA", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          ر.س
                        </td>

                        {/* Operations / Fuel type */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="text-[11px] space-y-0.5">
                            {item.transactionCount != null && (
                              <div className="font-semibold text-slate-700 dark:text-slate-300">
                                {item.transactionCount} عملية
                              </div>
                            )}
                            {item.fuelType && (
                              <div className="text-[var(--muted)]">{item.fuelType}</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Server Pagination */}
            {data && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-[var(--border)] text-xs text-[var(--muted)] font-medium">
                <div>
                  عرض {items.length} من إجمالي {totalCount} سجل (الصفحة {page} من {totalPages})
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                    className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <span className="px-2 font-bold text-[var(--foreground)]">{page}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                    className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: UNASSIGNED USAGE REVIEW QUEUE */}
      {subTab === "unassigned" && (
        <div className="space-y-4">
          {/* Informational Guidance Notice */}
          <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
            <Info size={18} className="text-[#1167c9] dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-sm block">طابور مراجعة الاستهلاك غير المسند لمندوب</span>
              <p className="text-[11px] leading-relaxed text-blue-800/90 dark:text-blue-300">
                يعرض هذا الطابور سجلات الاستهلاك المحفوظة التي لا ترتبط بأي رايدر. يمكنك الاستعانة برقم
                البطاقة، رقم اللوحة، الشهر، وتواريخ الحركات والملف المصدر لمعرفة المندوب المستخدم. لربط
                التكلفة بالرايدر، يجب تصحيح إسناد البطاقة لذلك الشهر ثم إعادة رفع ملف الاستهلاك.
              </p>
            </div>
          </div>

          {/* Unassigned Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-[var(--surface)] shadow-sm">
              <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
                <span>سجلات بحاجة لمراجعة (الفترة المحددة)</span>
                <AlertCircle size={18} className="text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
                {unassignedData?.totalCount ?? 0}{" "}
                <span className="text-xs font-normal text-[var(--muted)]">سجل</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
              <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
                <span>إجمالي اللترات غير المسندة</span>
                <Droplet size={18} className="text-blue-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
                {(unassignedData?.totalLiters ?? 0).toLocaleString("ar-SA", {
                  maximumFractionDigits: 2,
                })}{" "}
                <span className="text-xs font-normal">لتر</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
              <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
                <span>إجمالي المبالغ غير المسندة (شامل الضريبة)</span>
                <Coins size={18} className="text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {(unassignedData?.totalAmount ?? 0).toLocaleString("ar-SA", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                <span className="text-xs font-normal">ر.س</span>
              </p>
            </div>
          </div>

          {/* Unassigned Filters Toolbar */}
          <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-1">
                {/* From Date */}
                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
                    من تاريخ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={unassignedFrom}
                    onChange={(e) => {
                      setUnassignedFrom(e.target.value);
                      setUnassignedPage(1);
                    }}
                    className="w-full h-10 px-3 text-xs font-bold font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                    required
                  />
                </div>

                {/* To Date */}
                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
                    إلى تاريخ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={unassignedTo}
                    onChange={(e) => {
                      setUnassignedTo(e.target.value);
                      setUnassignedPage(1);
                    }}
                    className="w-full h-10 px-3 text-xs font-bold font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                    required
                  />
                </div>

                {/* Search */}
                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
                    بحث برقم البطاقة أو اللوحة
                  </label>
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    />
                    <input
                      type="text"
                      value={unassignedSearch}
                      onChange={(e) => {
                        setUnassignedSearch(e.target.value);
                        setUnassignedPage(1);
                      }}
                      placeholder="رقم البطاقة أو اللوحة..."
                      className="w-full h-10 ps-9 pe-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                    />
                  </div>
                </div>

                {/* Provider Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
                    مزود الخدمة
                  </label>
                  <select
                    value={unassignedProvider}
                    onChange={(e) => {
                      setUnassignedProvider(e.target.value as FuelProvider | "");
                      setUnassignedPage(1);
                    }}
                    className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none cursor-pointer"
                  >
                    <option value="">جميع المزودين...</option>
                    <option value="PetroApp">{fuelProviderLabels.PetroApp}</option>
                    <option value="SayaraApp">{fuelProviderLabels.SayaraApp}</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportUnassignedExcel}
                disabled={
                  unassignedExporting ||
                  unassignedLoading ||
                  (unassignedData?.totalCount ?? 0) === 0
                }
                className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
              >
                <FileSpreadsheet size={16} />
                {unassignedExporting ? "جاري التصدير..." : "تصدير إكسل"}
              </button>
            </div>
          </div>

          {/* Unassigned Queue Table */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="border-b border-[var(--border)] bg-amber-50/50 dark:bg-amber-950/20 font-bold text-[var(--muted)] uppercase">
                  <tr>
                    <th className="px-4 py-3.5 text-start">المزود</th>
                    <th className="px-4 py-3.5 text-start">رقم البطاقة</th>
                    <th className="px-4 py-3.5 text-start">رقم اللوحة</th>
                    <th className="px-4 py-3.5 text-start">الشهر</th>
                    <th className="px-4 py-3.5 text-end">اللترات المستهلكة</th>
                    <th className="px-4 py-3.5 text-end">المبلغ الإجمالي</th>
                    <th className="px-4 py-3.5 text-center">العمليات / الفترات</th>
                    <th className="px-4 py-3.5 text-start">الملف المصدر</th>
                    <th className="px-4 py-3.5 text-start">ملاحظات</th>
                    <th className="px-4 py-3.5 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] font-medium">
                  {unassignedLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-[var(--muted)]">
                        <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-amber-600" />
                        جاري تحميل سجلات الاستهلاك غير المسندة...
                      </td>
                    </tr>
                  ) : !unassignedData || unassignedData.items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-[var(--muted)]">
                        لا توجد سجلات استهلاك غير مسندة في الفترة المحددة ({unassignedFrom} إلى{" "}
                        {unassignedTo}).
                      </td>
                    </tr>
                  ) : (
                    unassignedData.items.map((item) => (
                      <tr
                        key={item.usageId}
                        className="hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-colors"
                      >
                        {/* Provider */}
                        <td className="px-4 py-3.5">
                          <Badge tone={item.provider === "PetroApp" ? "blue" : "green"}>
                            {fuelProviderLabels[item.provider]}
                          </Badge>
                        </td>

                        {/* Card Number */}
                        <td className="px-4 py-3.5 font-bold">
                          <button
                            type="button"
                            onClick={() => onOpenDetail && onOpenDetail(item.fuelCardId)}
                            className="hover:underline text-start"
                          >
                            <span dir="auto" className="fuel-plate text-sm text-[var(--foreground)]">
                              {item.cardNumber}
                            </span>
                          </button>
                        </td>

                        {/* Plate Text */}
                        <td className="px-4 py-3.5">
                          {item.plateNumberText ? (
                            <span
                              dir="auto"
                              className="fuel-plate font-bold text-slate-700 dark:text-slate-300"
                            >
                              {item.plateNumberText}
                            </span>
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>

                        {/* Report Month */}
                        <td className="px-4 py-3.5 font-mono text-[var(--muted)] dir-ltr text-start">
                          {item.reportMonth}
                        </td>

                        {/* Total Liters */}
                        <td className="px-4 py-3.5 text-end font-bold text-blue-700 dark:text-blue-400 font-mono">
                          {item.totalLiters.toLocaleString("ar-SA", { maximumFractionDigits: 2 })}
                        </td>

                        {/* Total Amount */}
                        <td className="px-4 py-3.5 text-end font-bold text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                          {item.totalAmount.toLocaleString("ar-SA", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          ر.س
                        </td>

                        {/* Operations & Dates */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="text-[11px] space-y-0.5">
                            {item.transactionCount != null && (
                              <div className="font-semibold text-slate-700 dark:text-slate-300">
                                {item.transactionCount} عملية
                              </div>
                            )}
                            {item.firstTransactionAtUtc && (
                              <div className="text-[10px] text-[var(--muted)] font-mono">
                                {item.firstTransactionAtUtc.split("T")[0]}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Source File */}
                        <td className="px-4 py-3.5 text-start font-mono text-[11px] text-[var(--muted)] truncate max-w-[140px]" title={item.originalFileName}>
                          {item.originalFileName}
                        </td>

                        {/* Card Notes */}
                        <td className="px-4 py-3.5 text-start text-[11px] text-[var(--muted)] max-w-[140px] truncate" title={item.cardNotes || ""}>
                          {item.cardNotes || "—"}
                        </td>

                        {/* Quick Action */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {canManage && onOpenAssign && (
                              <button
                                type="button"
                                onClick={() => handleAssignCard(item.fuelCardId)}
                                disabled={assigningCardId === item.fuelCardId}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#1167c9] dark:text-blue-400 font-bold text-[11px] hover:bg-blue-100 transition-colors disabled:opacity-50"
                              >
                                <UserPlus size={13} />
                                <span>{assigningCardId === item.fuelCardId ? "تحميل..." : "إسناد لمندوب"}</span>
                              </button>
                            )}
                            {onOpenDetail && (
                              <button
                                type="button"
                                onClick={() => onOpenDetail(item.fuelCardId)}
                                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="عرض تفاصيل البطاقة"
                              >
                                <Eye size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Unassigned Pagination */}
            {unassignedData && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-[var(--border)] text-xs text-[var(--muted)] font-medium">
                <div>
                  عرض {unassignedData.items.length} من إجمالي {unassignedData.totalCount} سجل (الصفحة {unassignedPage} من {Math.ceil(unassignedData.totalCount / unassignedPageSize) || 1})
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setUnassignedPage((p) => Math.max(1, p - 1))}
                    disabled={unassignedPage <= 1 || unassignedLoading}
                    className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <span className="px-2 font-bold text-[var(--foreground)]">{unassignedPage}</span>
                  <button
                    onClick={() =>
                      setUnassignedPage((p) =>
                        Math.min(
                          Math.ceil(unassignedData.totalCount / unassignedPageSize) || 1,
                          p + 1
                        )
                      )
                    }
                    disabled={
                      unassignedPage >=
                        (Math.ceil(unassignedData.totalCount / unassignedPageSize) || 1) ||
                      unassignedLoading
                    }
                    className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
