// src/components/ninja/evaluation/NinjaEvaluationView.tsx
"use client";

import { localizeDigits } from "./localizeDigits";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  loadAllNinjaEvaluation,
  downloadNinjaEvaluationExport,
  resolveNinjaEvaluationPermissions,
  parseEvaluationQueryFromSearchParams,
  buildEvaluationUrlSearchParams,
  getAllNinjaAccounts,
  getRiyadhTodayDate,
  formatRiyadhDateTime,
  type NinjaEvaluationQuery,
  type NinjaEvaluationReport,
  type NinjaAccountResponse,
  type PricingType,
} from "@/lib/ninja/api";
import {
  listOperatingCities,
  listSponsors,
  listRiders,
  type OperatingCity,
  type Sponsor,
} from "@/lib/workforce/api";
import type { Rider } from "@/lib/workforce/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { SharedAccountDayUsageModal } from "@/components/shared/SharedAccountDayUsageModal";
import { NinjaEvaluationSummaryCards } from "./NinjaEvaluationSummaryCards";
import { NinjaEvaluationMatrix } from "./NinjaEvaluationMatrix";
import styles from "./evaluation.module.css";
import { NinjaDayDetailDrawer } from "./NinjaDayDetailDrawer";
import { NinjaPerformanceImportModal } from "./NinjaPerformanceImportModal";
import {
  NinjaPolicyModal,
  NinjaAccountEvaluationManageModal,
  NinjaSnapshotModal,
} from "./NinjaEvaluationManageModals";
import {
  Scale,
  Upload,
  Download,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  ShieldAlert,
  SlidersHorizontal,
  Camera,
  BookOpen,
  Users,
  Server,
  Calendar,
  X,
} from "lucide-react";

export function NinjaEvaluationView() {
  const { can, locale } = useAuth();
  const isEn = locale === "en";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Strictly enforce documented permissions (never infer import/manage/export from read)
  const permissions = useMemo(
    () => resolveNinjaEvaluationPermissions(can),
    [can]
  );

  const todayRiyadh = useMemo(() => getRiyadhTodayDate(), []);
  const defaultYearMonth = useMemo(() => {
    const parts = todayRiyadh.split("-");
    return {
      year: Number(parts[0]) || 2026,
      month: Number(parts[1]) || 10,
    };
  }, [todayRiyadh]);

  // Derive query directly from URL searchParams (single source of truth)
  const query = useMemo(
    () => parseEvaluationQueryFromSearchParams(searchParams, defaultYearMonth),
    [searchParams, defaultYearMonth]
  );
  const [searchInput, setSearchInput] = useState<string>(
    () => searchParams.get("search") || ""
  );

  const urlSearch = searchParams.get("search") || "";
  const [previousUrlSearch, setPreviousUrlSearch] = useState(urlSearch);
  if (previousUrlSearch !== urlSearch) {
    setPreviousUrlSearch(urlSearch);
    setSearchInput(urlSearch);
  }
  const reportRequest = useRef(0);

  // Sync URL when query changes (called only from user action event handlers)
  const updateQueryAndUrl = useCallback(
    (updater: (prev: NinjaEvaluationQuery) => NinjaEvaluationQuery) => {
      const next = { ...updater(query), page: 1, pageSize: 100 };
      const params = buildEvaluationUrlSearchParams(next);
      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, query]
  );

  // Lookups
  const [accounts, setAccounts] = useState<NinjaAccountResponse[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [cities, setCities] = useState<OperatingCity[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  useEffect(() => {
    if (!permissions.canRead) return;
    let cancelled = false;
    const loadLookups = async () => {
      const [accList, riderList, cityList, sponsorList] = await Promise.all([
        getAllNinjaAccounts(100).catch(() => []),
        listRiders().catch(() => []),
        listOperatingCities().catch(() => []),
        listSponsors().catch(() => []),
      ]);
      if (cancelled) return;
      setAccounts(accList);
      setRiders(riderList);
      setCities(cityList);
      setSponsors(sponsorList);
    };
    loadLookups();
    return () => {
      cancelled = true;
    };
  }, [permissions.canRead]);

  const accountsMap = useMemo(() => {
    const map: Record<string, NinjaAccountResponse | undefined> = {};
    for (const acc of accounts) {
      const id = acc.accountId || acc.id;
      if (id) map[id] = acc;
    }
    return map;
  }, [accounts]);

  const riderNamesMap = useMemo(() => {
    const map: Record<string, string | null | undefined> = {};
    for (const r of riders) {
      if (r.id) {
        map[r.id] = isEn
          ? r.fullNameEn || r.fullNameAr
          : r.fullNameAr || r.fullNameEn;
      }
    }
    return map;
  }, [riders, isEn]);

  // Report state
  const [report, setReport] = useState<NinjaEvaluationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<{
    status?: number;
    code?: string;
    message: string;
    isFeatureOrEndpointUnavailable: boolean;
  } | null>(null);

  const fetchEvaluationReport = useCallback(
    async (targetQuery: NinjaEvaluationQuery) => {
      if (!permissions.canRead) return;
      const request = ++reportRequest.current;
      setLoading(true);
      setErrorState(null);
      try {
        const res = await loadAllNinjaEvaluation(targetQuery);
        if (request !== reportRequest.current) return;
        setReport(res);
      } catch (err: unknown) {
        if (request !== reportRequest.current) return;
        const e = err as {
          status?: number;
          code?: string;
          message?: string;
          details?: { errorCode?: string; code?: string; detail?: string };
        };
        const status = e.status;
        const code = e.code || e.details?.errorCode || e.details?.code;
        // Do NOT simulate successful server responses or hide API errors!
        // When endpoints are not enabled on the deployed API (Features:NinjaEvaluation=false),
        // the server returns 403 or 404 even when the user has ninja.read.
        const isFeatureOrEndpointUnavailable =
          status === 404 || status === 501 || status === 403;
        setReport(null);
        setErrorState({
          status,
          code,
          message:
            e.message ||
            (isEn
              ? "Ninja evaluation endpoint is currently unavailable."
              : "نقطة نهاية تقييم أداء نينجا غير متاحة حالياً."),
          isFeatureOrEndpointUnavailable,
        });
      } finally {
        if (request === reportRequest.current) setLoading(false);
      }
    },
    [permissions.canRead, isEn]
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => { if (!cancelled) void fetchEvaluationReport(query); });
    return () => { cancelled = true; reportRequest.current += 1; };
  }, [query, fetchEvaluationReport]);

  // Export state
  const [exporting, setExporting] = useState(false);
  const handleExportFullFilteredResult = async () => {
    if (!permissions.canExport) return;
    setExporting(true);
    try {
      const { blob, fileName } = await downloadNinjaEvaluationExport(query);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(
        isEn ? "Export Complete" : "تم تصدير التقرير",
        isEn
          ? "Downloaded complete filtered XLSX report (Suggestions, Daily, Metadata)."
          : "تم تنزيل ملف الإكسل الكامل لكامل النتائج المفلترة (المقترحات، اليومي، البيانات الوصفية)."
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(
        isEn ? "Export Failed" : "فشل تصدير التقرير",
        e.message ||
          (isEn
            ? "Could not export Ninja evaluation report."
            : "تعذر تصدير تقرير تقييم نينجا.")
      );
    } finally {
      setExporting(false);
    }
  };

  // Modals & Drawers state
  const [dayDrawerState, setDayDrawerState] = useState<{
    isOpen: boolean;
    accountId: string | null;
    captainId: string | null;
    date: string | null;
  }>({
    isOpen: false,
    accountId: null,
    captainId: null,
    date: null,
  });

  const [sharedDayModalState, setSharedDayModalState] = useState<{
    isOpen: boolean;
    accountId: string;
    accountCode: string | null;
    date: string | null;
  }>({
    isOpen: false,
    accountId: "",
    accountCode: null,
    date: null,
  });

  const [manageModalState, setManageModalState] = useState<{
    isOpen: boolean;
    accountId: string | null;
    captainId: string | null;
    tab: "context" | "responsibility";
  }>({
    isOpen: false,
    accountId: null,
    captainId: null,
    tab: "context",
  });

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);

  // Month input value YYYY-MM
  const monthInputValue = `${query.year}-${String(query.month).padStart(
    2,
    "0"
  )}`;
  const maxYearMonth = todayRiyadh.slice(0, 7);

  // Options for SearchableSelect filters
  const accountOptions = useMemo(
    () => [
      { value: "", label: isEn ? "All Accounts" : "جميع الحسابات" },
      ...accounts.map((acc) => ({
        value: acc.accountId || acc.id || "",
        label: `${localizeDigits(acc.captainId || acc.code, locale)}${
          (acc.actualRider?.nameAr || acc.actualRiderNameAr) ? ` — ${isEn ? acc.actualRider?.nameEn || acc.actualRiderNameEn || acc.actualRider?.nameAr || acc.actualRiderNameAr : acc.actualRider?.nameAr || acc.actualRiderNameAr}` : ""
        }`,
      })),
    ],
    [accounts, isEn, locale]
  );

  const riderOptions = useMemo(
    () => [
      { value: "", label: isEn ? "All Riders" : "جميع المناديب" },
      ...riders.map((r) => ({
        value: r.id,
        label: `${isEn ? r.fullNameEn || r.fullNameAr : r.fullNameAr}${
          r.iqamaNo ? ` (${localizeDigits(r.iqamaNo, locale)})` : ""
        }`,
      })),
    ],
    [riders, isEn, locale]
  );

  const sponsorOptions = useMemo(
    () => [
      {
        value: "",
        label: isEn ? "All Establishments / Sponsors" : "جميع المؤسسات المسجلة",
      },
      ...sponsors.map((s) => ({
        value: s.id,
        label: isEn ? s.registryNameEn || s.registryNameAr : s.registryNameAr,
      })),
    ],
    [sponsors, isEn]
  );

  const cityOptions = useMemo(
    () => [
      { value: "", label: isEn ? "All Cities" : "جميع المدن" },
      ...cities.map((c) => ({
        value: c.id,
        label: isEn ? c.globalCityEn || c.globalCityAr : c.globalCityAr,
      })),
    ],
    [cities, isEn]
  );

  const handleResetFilters = () => {
    setSearchInput("");
    updateQueryAndUrl(() => ({
      year: defaultYearMonth.year,
      month: defaultYearMonth.month,
      view: "riders",
      page: 1,
      pageSize: 100,
    }));
  };

  if (!permissions.canRead && !permissions.canImport) {
    return (
      <div className="p-6" dir={isEn ? "ltr" : "rtl"}>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 shrink-0 text-rose-600" />
            <div className="space-y-1">
              <h2 className="text-base font-bold">
                {isEn
                  ? "Access Restricted"
                  : "لا تملك صلاحية عرض تقييم أداء نينجا"}
              </h2>
              <p className="text-xs">
                {isEn
                  ? "Viewing Ninja evaluation reports requires appropriate access permissions. Please contact your system administrator."
                  : "يتطلب عرض تقارير تقييم أداء نينجا توفر صلاحية الوصول لمنصة نينجا في حسابك. يرجى التواصل مع إدارة النظام للمساعدة."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.page} space-y-5 p-4 md:p-6`} dir={isEn ? "ltr" : "rtl"}>
      {/* Page Title & Action Toolbar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Scale className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-extrabold text-[var(--foreground)]">
              {isEn
                ? "Ninja performance evaluation"
                : "تقييم أداء نينجا"}
            </h1>
            <Badge tone="orange">
              {isEn
                ? "Monitoring Suggestions Only"
                : "اقتراحات رقابية للمتابعة فقط"}
            </Badge>
          </div>
          <p className="text-xs text-[var(--muted)]">
            {isEn
              ? "Evaluate rider and account daily orders, working hours, planned responsibility weights, target attainment, and provisional suggested earnings."
              : "مراقبة الطلبات اليومية وساعات العمل وأوزان المسؤولية التعاقدية وتحقيق الهدف والمبالغ المقترحة الأولية بانتظار فاتورة نينجا الشهرية."}
          </p>
        </div>

        {/* Permission-Gated Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {permissions.canRead && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchEvaluationReport(query)}
              loading={loading}
            >
              <RefreshCw className="h-4 w-4" />
              <span>{isEn ? "Refresh" : "تحديث"}</span>
            </Button>
          )}

          {permissions.canRead && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsPolicyModalOpen(true)}
            >
              <BookOpen className="h-4 w-4" />
              <span>{isEn ? "Contract Policy" : "سياسة وجدول الأسعار"}</span>
            </Button>
          )}

          {permissions.canRead && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSnapshotModalOpen(true)}
            >
              <Camera className="h-4 w-4" />
              <span>{isEn ? "Snapshots" : "لقطات التقييم"}</span>
            </Button>
          )}

          {/* Context & Responsibility Management — strictly gated by ninja.evaluation.manage */}
          {permissions.canManage && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setManageModalState({
                  isOpen: true,
                  accountId: query.accountId || accounts[0]?.accountId || null,
                  captainId: null,
                  tab: "context",
                })
              }
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>
                {isEn
                  ? "Manage Context & Responsibility"
                  : "إدارة التسعير والمسؤولية"}
              </span>
            </Button>
          )}

          {/* Export Full Filtered Result — strictly gated by ninja.read AND ninja.evaluation.export */}
          {permissions.canExport && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportFullFilteredResult}
              loading={exporting}
            >
              <Download className="h-4 w-4" />
              <span>
                {isEn
                  ? "Export Excel"
                  : "تصدير Excel"}
              </span>
            </Button>
          )}

          {/* Import performance — strictly gated by ninja.performance.import (never ninja.read) */}
          {permissions.canImport && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
            >
              <Upload className="h-4 w-4" />
              <span>
                {isEn
                  ? "Import performance"
                  : "استيراد الأداء"}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Comprehensive AND Filter Bar */}
      {permissions.canRead && (
        <div
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm space-y-4"
          role="search"
          aria-label={isEn ? "Evaluation Filters" : "فلاتر تقييم أداء نينجا"}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--foreground)]">
              <Filter className="h-4 w-4 text-blue-600" />
              <span>
                {isEn
                  ? "Report filters"
                  : "فلاتر التقرير"}
              </span>
            </div>

            {/* View Toggle: Riders vs Accounts */}
            <div className="flex items-center gap-2">
              <div
                className="inline-flex rounded-xl border border-[var(--border)] bg-slate-100 p-1 dark:bg-slate-900"
                role="group"
                aria-label={isEn ? "View Mode" : "طريقة العرض"}
              >
                <button
                  type="button"
                  aria-pressed={query.view !== "accounts"}
                  onClick={() =>
                    updateQueryAndUrl((prev) => ({
                      ...prev,
                      view: "riders",
                      page: 1,
                    }))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    (query.view || "riders") === "riders"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>
                    {isEn
                      ? "Riders"
                      : "المناديب"}
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={query.view === "accounts"}
                  onClick={() =>
                    updateQueryAndUrl((prev) => ({
                      ...prev,
                      view: "accounts",
                      page: 1,
                    }))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    query.view === "accounts"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Server className="h-3.5 w-3.5" />
                  <span>
                    {isEn
                      ? "Accounts"
                      : "الحسابات"}
                  </span>
                </button>
              </div>

              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                <X className="h-3.5 w-3.5" />
                <span>{isEn ? "Reset Filters" : "إعادة ضبط"}</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[.8fr_1fr_1.6fr_1fr]">
            {/* 1. Calendar Month (year & month) */}
            <div className="space-y-1">
              <label
                htmlFor="eval-month-input"
                className="block text-xs font-bold text-[var(--foreground)]"
              >
                {isEn ? "Month" : "الشهر"}
              </label>
              <input
                id="eval-month-input"
                type="month"
                lang={isEn ? "en" : "ar"}
                value={monthInputValue}
                max={maxYearMonth}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  const [yStr, mStr] = val.split("-");
                  const y = Number(yStr);
                  const m = Number(mStr);
                  if (y && m) {
                    updateQueryAndUrl((prev) => ({
                      ...prev,
                      year: y,
                      month: m,
                      asOf: undefined,
                      page: 1,
                    }));
                  }
                }}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-bold text-[var(--foreground)]"
              />
            </div>

            {/* 2. Cutoff Date (asOf) */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[var(--foreground)]">
                {isEn
                  ? "Data through"
                  : "البيانات حتى"}
              </label>
              <DateInput
                locale={locale}
                value={query.asOf || ""}
                max={todayRiyadh}
                onChange={(val) =>
                  updateQueryAndUrl((prev) => ({
                    ...prev,
                    asOf: val || undefined,
                    page: 1,
                  }))
                }
              />
            </div>

            {/* 9. Search (Rider name or Captain ID) */}
            <div className="space-y-1">
              <label
                htmlFor="eval-search-input"
                className="block text-xs font-bold text-[var(--foreground)]"
              >
                {isEn
                  ? "Search (Rider Name or Captain ID)"
                  : "بحث (اسم المندوب أو معرف الكابتن)"}
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateQueryAndUrl((prev) => ({
                    ...prev,
                    search: searchInput.trim() || undefined,
                    page: 1,
                  }));
                }}
                className="flex gap-2"
              >
                <Input
                  id="eval-search-input"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={
                    isEn
                      ? "Type Rider Name or Captain ID and press Enter..."
                      : "اكتب اسم المندوب أو معرف الكابتن..."
                  }
                />
                <Button type="submit" variant="secondary" size="sm">
                  <Search className="h-4 w-4" />
                  <span>{isEn ? "Apply" : "بحث"}</span>
                </Button>
              </form>
            </div>
            {/* 6. Evaluation Status (TargetAchieved | BelowTarget | Unknown) */}
            <div className="space-y-1">
              <label
                htmlFor="eval-status-select"
                className="block text-xs font-bold text-[var(--foreground)]"
              >
                {isEn ? "Evaluation Target Status" : "حالة تحقيق الهدف"}
              </label>
              <select
                id="eval-status-select"
                value={query.status || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  updateQueryAndUrl((prev) => ({
                    ...prev,
                    status:
                      val === "TargetAchieved" ||
                      val === "BelowTarget" ||
                      val === "Unknown"
                        ? val
                        : undefined,
                    page: 1,
                  }));
                }}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-bold text-[var(--foreground)]"
              >
                <option value="">
                  {isEn ? "All Evaluation Statuses" : "جميع الحالات"}
                </option>
                <option value="TargetAchieved">
                  {isEn
                    ? "Target achieved"
                    : "محقق للهدف"}
                </option>
                <option value="BelowTarget">
                  {isEn
                    ? "Below target"
                    : "تحت الهدف"}
                </option>
                <option value="Unknown">
                  {isEn
                    ? "Unresolved / missing data"
                    : "غير محسوم / نقص بيانات"}
                </option>
              </select>
            </div>

          </div>
          <details className={styles.advanced} open={Boolean(query.sponsorId || query.cityId || query.pricingType || query.accountId || query.riderId) || undefined}>
            <summary>{isEn ? "More filters: establishment, city, vehicle, account & rider" : "فلاتر إضافية: المؤسسة، المدينة، المركبة، الحساب والمندوب"}</summary>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* 3. Establishment / Sponsor (sponsorId) */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[var(--foreground)]">
                {isEn
                  ? "Registered Establishment / Sponsor"
                  : "المؤسسة المسجلة / الكفيل"}
              </label>
              <SearchableSelect
                options={sponsorOptions}
                value={query.sponsorId || ""}
                onChange={(val) =>
                  updateQueryAndUrl((prev) => ({
                    ...prev,
                    sponsorId: val || undefined,
                    page: 1,
                  }))
                }
                placeholder={
                  isEn ? "All Establishments" : "جميع المؤسسات المسجلة"
                }
              />
            </div>

            {/* 4. City (cityId) */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[var(--foreground)]">
                {isEn ? "Operating City" : "المدينة"}
              </label>
              <SearchableSelect
                options={cityOptions}
                value={query.cityId || ""}
                onChange={(val) =>
                  updateQueryAndUrl((prev) => ({
                    ...prev,
                    cityId: val || undefined,
                    page: 1,
                  }))
                }
                placeholder={isEn ? "All Cities" : "جميع المدن"}
              />
            </div>

            {/* 5. Pricing Type (BIKE | CAR) */}
            <div className="space-y-1">
              <label
                htmlFor="eval-pricing-select"
                className="block text-xs font-bold text-[var(--foreground)]"
              >
                {isEn ? "Pricing Type" : "نوع المركبة"}
              </label>
              <select
                id="eval-pricing-select"
                value={query.pricingType || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  updateQueryAndUrl((prev) => ({
                    ...prev,
                    pricingType:
                      val === "BIKE" || val === "CAR"
                        ? (val as PricingType)
                        : undefined,
                    page: 1,
                  }));
                }}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs font-bold text-[var(--foreground)]"
              >
                <option value="">
                  {isEn ? "All Pricing Types" : "الكل (دراجة نارية + سيارة)"}
                </option>
                <option value="BIKE">BIKE (دراجة نارية)</option>
                <option value="CAR">CAR (سيارة)</option>
              </select>
            </div>

            {/* 7. Specific Account Filter (accountId) */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[var(--foreground)]">
                {isEn ? "Ninja Account" : "حساب نينجا"}
              </label>
              <SearchableSelect
                options={accountOptions}
                value={query.accountId || ""}
                onChange={(val) =>
                  updateQueryAndUrl((prev) => ({
                    ...prev,
                    accountId: val || undefined,
                    page: 1,
                  }))
                }
                placeholder={isEn ? "All Accounts" : "جميع الحسابات"}
              />
            </div>

            {/* 8. Specific Historical Rider Filter (riderId) */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[var(--foreground)]">
                {isEn ? "Historical Rider" : "المندوب"}
              </label>
              <SearchableSelect
                options={riderOptions}
                value={query.riderId || ""}
                onChange={(val) =>
                  updateQueryAndUrl((prev) => ({
                    ...prev,
                    riderId: val || undefined,
                    page: 1,
                  }))
                }
                placeholder={isEn ? "All Riders" : "جميع المناديب"}
              />
            </div>

            </div>
          </details>
        </div>
      )}

      {/* Loading Skeleton State */}
      {loading && (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-16 text-sm text-[var(--muted)] shadow-sm"
          role="status"
          aria-live="polite"
        >
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <div className="font-bold text-[var(--foreground)]">
            {isEn
              ? "Loading Ninja Performance Evaluation Matrix..."
              : "جارٍ تحميل مصفوفة تقييم أداء نينجا والمبالغ المقترحة..."}
          </div>
          <p className="text-xs">
            {isEn
              ? "Evaluating historical assignments, coverage cutoffs, and contract rate bands."
              : "يتم فحص التكليفات التاريخية وتغطية البيانات اليومية وشرائح التسعير."}
          </p>
        </div>
      )}

      {/* User-Friendly Service Notice (When Service is Unavailable or Access Restricted) */}
      {!loading && errorState && (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-amber-950 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100"
          role="alert"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-[var(--foreground)]">
                  {isEn
                    ? "Ninja Evaluation Service Unavailable"
                    : "خدمة تقييم أداء نينجا غير متاحة حالياً"}
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  {errorState.message ||
                    (isEn
                      ? "This service is currently unavailable or your account requires additional access permissions. Please contact your system administrator."
                      : "عفواً، هذه الخدمة غير متاحة حالياً أو يتطلب حسابك صلاحيات وصول إضافية. يرجى التواصل مع إدارة النظام للمساعدة.")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fetchEvaluationReport(query)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{isEn ? "Retry" : "إعادة المحاولة"}</span>
              </Button>
              <Link href="/admin/ninja/performance">
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <span>
                    {isEn ? "Go to Ninja Performance" : "الانتقال لشاشة أداء نينجا"}
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Loaded Report Content */}
      {!loading && !errorState && report && (
        <>
          {/* Summary Cards (Describes Whole Filtered Result) */}
          <NinjaEvaluationSummaryCards
            report={report}
            accountsMap={accountsMap}
            isFilteredByRider={Boolean(query.riderId)}
            locale={locale}
          />

          {/* Empty State if 0 rows match */}
          {report.items.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-14 text-center shadow-sm space-y-3">
              <Calendar className="mx-auto h-8 w-8 text-[var(--muted)]" />
              <div className="text-sm font-bold text-[var(--foreground)]">
                {isEn
                  ? "No evaluation rows match the selected filters"
                  : "لا توجد صفوف تقييم تطابق الفلاتر المحددة"}
              </div>
              <p className="mx-auto max-w-md text-xs text-[var(--muted)]">
                {isEn
                  ? "Try clearing one or more filters (establishment, city, pricing type, status, or search query) or selecting another calendar month."
                  : "جرّب تخفيف الفلاتر المحددة (المؤسسة، المدينة، نوع التسعير، الحالة، أو نص البحث) أو اختيار شهر آخر."}
              </p>
              <div>
                <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                  {isEn ? "Reset Filters" : "إعادة ضبط الفلاتر"}
                </Button>
              </div>
            </div>
          ) : (
            /* Performance Matrix Table */
            <NinjaEvaluationMatrix
              report={report}
              canManageEvaluation={permissions.canManage}
              onOpenDayDetail={(accountId, captainId, date) =>
                setDayDrawerState({
                  isOpen: true,
                  accountId,
                  captainId,
                  date,
                })
              }
              onOpenManageAccount={(accountId, captainId, tab) =>
                setManageModalState({
                  isOpen: true,
                  accountId,
                  captainId,
                  tab,
                })
              }
              locale={locale}
            />
          )}

          {/* Report Provenance & Metadata Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-slate-50/70 px-4 py-2.5 text-[11px] text-[var(--muted)] dark:bg-slate-900/40">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                <strong>{isEn ? "Computed At:" : "وقت الحساب:"}</strong>{" "}
                {formatRiyadhDateTime(report.computedAtUtc, locale)}
              </span>
            </div>
            <div>
              <span>
                {isEn
                  ? `Riyadh Today: ${localizeDigits(report.today, locale)} | Data through: ${localizeDigits(report.requestedAsOf, locale)}`
                  : `تاريخ اليوم (الرياض): ${localizeDigits(report.today, locale)} | حد البيانات: ${localizeDigits(report.requestedAsOf, locale)}`}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Day Detail Drawer / Modal */}
      <NinjaDayDetailDrawer
        key={`${dayDrawerState.accountId}-${dayDrawerState.date}-${dayDrawerState.isOpen}`}
        isOpen={dayDrawerState.isOpen}
        onClose={() =>
          setDayDrawerState((prev) => ({ ...prev, isOpen: false }))
        }
        accountId={dayDrawerState.accountId}
        captainId={dayDrawerState.captainId}
        date={dayDrawerState.date}
        riderNamesMap={riderNamesMap}
        canManageEvaluation={permissions.canManage}
        onOpenSharedDayUsage={(accId, capId, d) => {
          setDayDrawerState((prev) => ({ ...prev, isOpen: false }));
          setSharedDayModalState({
            isOpen: true,
            accountId: accId,
            accountCode: capId,
            date: d,
          });
        }}
        onOpenManageAccount={(accId, capId, tab) => {
          setDayDrawerState((prev) => ({ ...prev, isOpen: false }));
          setManageModalState({
            isOpen: true,
            accountId: accId,
            captainId: capId,
            tab,
          });
        }}
        locale={locale}
      />

      {/* Shared Account Day Usage Modal (for resolving shared-day declarations) */}
      {sharedDayModalState.isOpen && sharedDayModalState.accountId && (
        <SharedAccountDayUsageModal
          isOpen={sharedDayModalState.isOpen}
          onClose={() =>
            setSharedDayModalState((prev) => ({ ...prev, isOpen: false }))
          }
          accountId={sharedDayModalState.accountId}
          accountCode={sharedDayModalState.accountCode}
          initialDate={sharedDayModalState.date}
          platform="ninja"
          riderNamesMap={riderNamesMap}
          onUpdated={() => {
            fetchEvaluationReport(query);
          }}
        />
      )}

      {/* Import performance Modal (Strictly gated by ninja.performance.import) */}
      {permissions.canImport && (
        <NinjaPerformanceImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          defaultReportDate={todayRiyadh}
          canImport={permissions.canImport}
          onImportConfirmed={() => {
            fetchEvaluationReport(query);
          }}
          onOpenSharedDayUsage={(accId, capId, d) => {
            setSharedDayModalOpenFromImport(accId, capId, d);
          }}
          locale={locale}
        />
      )}

      {/* Policy Modal */}
      <NinjaPolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        locale={locale}
      />

      {/* Account Context & Responsibility Editor Modal */}
      <NinjaAccountEvaluationManageModal
        isOpen={manageModalState.isOpen}
        onClose={() =>
          setManageModalState((prev) => ({ ...prev, isOpen: false }))
        }
        accountId={manageModalState.accountId}
        captainId={manageModalState.captainId}
        year={query.year}
        month={query.month}
        initialTab={manageModalState.tab}
        canManage={permissions.canManage}
        accounts={accounts}
        onSelectAccount={(nextId) =>
          setManageModalState((prev) => ({
            ...prev,
            accountId: nextId || null,
            captainId: accountsMap[nextId]?.captainId || null,
          }))
        }
        onSaved={() => {
          fetchEvaluationReport(query);
        }}
        locale={locale}
      />

      {/* Snapshot Modal */}
      <NinjaSnapshotModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        currentQuery={query}
        currentInputRevision={report?.inputRevision || null}
        canManage={permissions.canManage}
        locale={locale}
      />
    </div>
  );

  function setSharedDayModalOpenFromImport(
    accId: string,
    capId: string | null,
    d: string
  ) {
    setSharedDayModalState({
      isOpen: true,
      accountId: accId,
      accountCode: capId,
      date: d,
    });
  }
}
