// src/app/admin/jahez/settlement-reminders/page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getAllJahezSettlementReminders } from "@/lib/jahez/api";
import type { JahezSettlementReminder } from "@/lib/jahez/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import {
  CalendarClock,
  AlertTriangle,
  Clock,
  User,
  Search,
  RefreshCw,
  FileSpreadsheet,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Wallet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Check,
  Calendar,
  ChevronRight,
  TrendingUp,
  DollarSign,
  X,
} from "lucide-react";

type DaysFilter = "all" | "overdue" | "critical" | "within-limit";
type DebtFilter = "all" | "gt-500" | "gt-1000" | "has-debt" | "zero-debt";
type SortOption =
  | "debt-desc"
  | "debt-asc"
  | "days-desc"
  | "days-asc"
  | "date-asc"
  | "name-asc";

export default function JahezSettlementRemindersPage() {
  const { can } = useAuth();
  const hasReadPermission = can("jahez.read");

  // State
  const [reminders, setReminders] = useState<JahezSettlementReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [daysFilter, setDaysFilter] = useState<DaysFilter>("all");
  const [debtFilter, setDebtFilter] = useState<DebtFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("debt-desc");
  const [isExporting, setIsExporting] = useState(false);

  // Table header debt dropdown popover state
  const [isDebtDropdownOpen, setIsDebtDropdownOpen] = useState(false);
  const debtDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        debtDropdownRef.current &&
        !debtDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDebtDropdownOpen(false);
      }
    }
    if (isDebtDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDebtDropdownOpen]);

  // Fetch reminders data (loads all records across all pages)
  const fetchReminders = useCallback(async () => {
    if (!hasReadPermission) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await getAllJahezSettlementReminders();
      setReminders(response.items || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "فشل تحميل تذكيرات التصفية";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [hasReadPermission]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  // Helpers to safely extract normalized fields
  const getRiderName = (item: JahezSettlementReminder): string => {
    return item.riderName || item.RiderName || "مندوب غير محدد";
  };

  const getExternalAccountId = (item: JahezSettlementReminder): string | null => {
    return item.externalAccountId || item.ExternalAccountId || null;
  };

  const getDaysSinceSettlement = (item: JahezSettlementReminder): number => {
    return item.daysSinceSettlement ?? item.DaysSinceSettlement ?? 0;
  };

  const getAdministrativeDebt = (item: JahezSettlementReminder): number => {
    return Number(item.administrativeDebt ?? item.AdministrativeDebt ?? 0) || 0;
  };

  const getAnchorDateUtc = (item: JahezSettlementReminder): string => {
    return item.reminderAnchorAtUtc || item.ReminderAnchorAtUtc || "";
  };

  // Friendly date formatting (in Riyadh timezone)
  const formatAnchorDate = (isoString: string): string => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
        timeZone: "Asia/Riyadh",
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(d);
    } catch {
      return isoString;
    }
  };

  // Relative days text
  const formatRelativeDays = (days: number): string => {
    if (days <= 0) return "اليوم";
    if (days === 1) return "منذ يوم";
    if (days === 2) return "منذ يومين";
    if (days >= 3 && days <= 10) return `منذ ${days} أيام`;
    return `منذ ${days} يوماً`;
  };

  // Currency formatter
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("ar-SA-u-nu-latn", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + " ر.س";
  };

  // Days severity classification (supports <=10 days as recent/within limit)
  const getDaysSeverity = (days: number): "within-limit" | "moderate" | "high" | "critical" => {
    if (days >= 20) return "critical";
    if (days >= 15) return "high";
    if (days > 10) return "moderate";
    return "within-limit";
  };

  // Filter & sort
  const filteredReminders = useMemo(() => {
    let result = [...reminders];

    // Search by rider name or external account
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter((item) => {
        const name = getRiderName(item).toLowerCase();
        const ext = (getExternalAccountId(item) || "").toLowerCase();
        return name.includes(q) || ext.includes(q);
      });
    }

    // Filter by days since settlement
    if (daysFilter !== "all") {
      result = result.filter((item) => {
        const days = getDaysSinceSettlement(item);
        if (daysFilter === "overdue") return days > 10;
        if (daysFilter === "critical") return days >= 20;
        if (daysFilter === "within-limit") return days <= 10;
        return true;
      });
    }

    // Filter by administrative debt
    if (debtFilter !== "all") {
      result = result.filter((item) => {
        const debt = getAdministrativeDebt(item);
        if (debtFilter === "gt-500") return debt > 500;
        if (debtFilter === "gt-1000") return debt > 1000;
        if (debtFilter === "has-debt") return debt > 0;
        if (debtFilter === "zero-debt") return debt <= 0;
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      const debtA = getAdministrativeDebt(a);
      const debtB = getAdministrativeDebt(b);
      const daysA = getDaysSinceSettlement(a);
      const daysB = getDaysSinceSettlement(b);
      const dateA = new Date(getAnchorDateUtc(a)).getTime() || 0;
      const dateB = new Date(getAnchorDateUtc(b)).getTime() || 0;
      const nameA = getRiderName(a);
      const nameB = getRiderName(b);

      switch (sortBy) {
        case "debt-desc":
          return debtB - debtA;
        case "debt-asc":
          return debtA - debtB;
        case "days-desc":
          return daysB - daysA;
        case "days-asc":
          return daysA - daysB;
        case "date-asc":
          return dateA - dateB;
        case "name-asc":
          return nameA.localeCompare(nameB, "ar");
        default:
          return 0;
      }
    });

    return result;
  }, [reminders, searchTerm, daysFilter, debtFilter, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const total = reminders.length;
    if (total === 0) {
      return {
        total: 0,
        totalDebt: 0,
        ridersWithDebt: 0,
        debtGt500Count: 0,
        maxDebt: 0,
        maxDays: 0,
        avgDays: 0,
        criticalDaysCount: 0,
        overdueCount: 0,
      };
    }

    let totalDebt = 0;
    let ridersWithDebt = 0;
    let debtGt500Count = 0;
    let maxDebt = 0;
    let maxDays = 0;
    let sumDays = 0;
    let criticalDaysCount = 0;
    let overdueCount = 0;

    for (const r of reminders) {
      const debt = getAdministrativeDebt(r);
      const days = getDaysSinceSettlement(r);

      totalDebt += debt;
      if (debt > 0) ridersWithDebt++;
      if (debt > 500) debtGt500Count++;
      if (debt > maxDebt) maxDebt = debt;

      if (days > maxDays) maxDays = days;
      sumDays += days;
      if (days >= 20) criticalDaysCount++;
      if (days > 10) overdueCount++;
    }

    return {
      total,
      totalDebt,
      ridersWithDebt,
      debtGt500Count,
      maxDebt,
      maxDays,
      avgDays: Math.round((sumDays / total) * 10) / 10,
      criticalDaysCount,
      overdueCount,
    };
  }, [reminders]);

  // Toggle debt sorting (as / des)
  const toggleDebtSort = () => {
    if (sortBy === "debt-desc") {
      setSortBy("debt-asc");
    } else {
      setSortBy("debt-desc");
    }
  };

  // Export to Excel (strictly no raw internal IDs)
  const handleExport = async () => {
    if (filteredReminders.length === 0) {
      toast.warning("لا توجد بيانات للتصدير");
      return;
    }
    setIsExporting(true);
    try {
      const exportData = filteredReminders.map((item) => {
        const days = getDaysSinceSettlement(item);
        const debt = getAdministrativeDebt(item);
        const sev = getDaysSeverity(days);
        const daysLabel =
          sev === "critical"
            ? "تأخير حرج (>20 يوم)"
            : sev === "high"
            ? "تأخير مرتفع (15-20 يوم)"
            : sev === "moderate"
            ? "تأخير تصفية (>10 أيام)"
            : "ضمن المدة (≤10 أيام)";

        return {
          "اسم المندوب": getRiderName(item),
          "حساب المنصة": getExternalAccountId(item) || "—",
          "المديونية الإدارية (ر.س)": debt,
          "أيام منذ التصفية": days,
          "حالة التصفية": daysLabel,
          "تاريخ بداية الاحتساب / آخر تصفية": formatAnchorDate(getAnchorDateUtc(item)),
        };
      });

      await exportToExcel(
        exportData,
        `تذكيرات_تصفية_ومديونيات_جاهز_${new Date().toISOString().slice(0, 10)}`,
        "تذكيرات التصفية والمديونية",
      );
      toast.success("تم تصدير ملف إكسل بنجاح");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل تصدير الملف";
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  };

  // Permission Check
  if (!hasReadPermission) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h2 className="text-base font-bold">غير مصرح بالوصول</h2>
          <p className="mt-2 text-xs">
            تحتاج إلى صلاحية قراءة بيانات جاهز (<code className="font-mono">jahez.read</code>) لعرض تذكيرات التصفية والمديونيات.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 pb-12" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Link href="/admin/jahez/accounts" className="hover:text-blue-600">
              إدارة جاهز
            </Link>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              تذكيرات التصفية والمديونيات
            </span>
          </div>
          <h1 className="mt-1 flex items-center gap-2.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            <CalendarClock className="h-7 w-7 text-amber-500" />
            تذكيرات تصفية حسابات ومديونيات جاهز
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            متابعة جلسات المناديب المنفذة والجارية، مع رصد المديونيات الإدارية وأيام التأخير
          </p>
          {!loading && reminders.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                تم تحميل كامل السجلات ({reminders.length.toLocaleString("ar-SA-u-nu-latn")} جلسة) في الصفحة الأولى
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchReminders}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={loading || isExporting || filteredReminders.length === 0}
            className="flex items-center gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            {isExporting ? "جارٍ التصدير..." : "تصدير Excel"}
          </Button>

          <Link href="/admin/jahez/cashbox">
            <Button size="sm" className="flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
              <Wallet className="h-4 w-4" />
              الخزنة والتحصيل
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Administrative Debt */}
        <div className="rounded-2xl border border-red-200/80 bg-gradient-to-br from-red-50/50 to-white p-5 shadow-sm transition hover:shadow-md dark:border-red-900/50 dark:from-red-950/20 dark:to-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-700 dark:text-red-300">
              إجمالي المديونيات الإدارية
            </span>
            <div className="rounded-xl bg-red-100 p-2.5 text-red-700 dark:bg-red-900/60 dark:text-red-300">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-red-600 dark:text-red-400">
              {formatCurrency(stats.totalDebt)}
            </span>
          </div>
          <div className="mt-2 text-xs text-red-600/80 dark:text-red-400/80">
            على {stats.ridersWithDebt.toLocaleString("ar-SA-u-nu-latn")} مندوب مطالب بسداد
          </div>
        </div>

        {/* Debt > 500 SAR */}
        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 to-white p-5 shadow-sm transition hover:shadow-md dark:border-amber-900/50 dark:from-amber-950/20 dark:to-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              مديونيات أكثر من 500 ر.س
            </span>
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {stats.debtGt500Count.toLocaleString("ar-SA-u-nu-latn")}
            </span>
            <span className="text-xs text-gray-400">مندوب</span>
          </div>
          <div className="mt-2 text-xs text-amber-700/80 dark:text-amber-300/80">
            أعلى مديونية: {formatCurrency(stats.maxDebt)}
          </div>
        </div>

        {/* Total Overdue Sessions (>10 Days) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              متأخر عن التصفية (&gt; 10 أيام)
            </span>
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
              {stats.overdueCount.toLocaleString("ar-SA-u-nu-latn")}
            </span>
            <span className="text-xs text-gray-400">من {stats.total.toLocaleString("ar-SA-u-nu-latn")} جلسة</span>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            منها {stats.criticalDaysCount.toLocaleString("ar-SA-u-nu-latn")} جلسة بحالة حرجة (&gt;20 يوم)
          </div>
        </div>

        {/* Max Days Overdue */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              أعلى مدة منذ التصفية
            </span>
            <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">
              {stats.maxDays.toLocaleString("ar-SA-u-nu-latn")}
            </span>
            <span className="text-xs text-gray-400">يوم</span>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            متوسط الأيام: {stats.avgDays.toLocaleString("ar-SA-u-nu-latn")} يوم / مندوب
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search by Rider Name / Platform Account */}
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="البحث باسم المندوب أو حساب المنصة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-700 dark:bg-gray-800">
              <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">الترتيب:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="ترتيب القائمة"
                className="bg-transparent text-xs font-bold text-gray-800 outline-none dark:text-gray-200"
              >
                <option value="debt-desc">المديونية: الأعلى أولاً (تنازلي)</option>
                <option value="debt-asc">المديونية: الأقل أولاً (تصاعدي)</option>
                <option value="days-desc">أيام التأخير: الأكثر أولاً</option>
                <option value="days-asc">أيام التأخير: الأقل أولاً</option>
                <option value="date-asc">التاريخ الأقدم أولاً</option>
                <option value="name-asc">اسم المندوب أبجدياً</option>
              </select>
            </div>
          </div>

          {/* Quick Filter Pills (Debt & Days) */}
          <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
            {/* Debt Filter Pills */}
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-xs font-bold text-gray-600 dark:text-gray-400">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                تصفية المديونية:
              </span>
              <div className="flex flex-wrap items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setDebtFilter("all")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    debtFilter === "all"
                      ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setDebtFilter("gt-500")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    debtFilter === "gt-500"
                      ? "bg-red-500 text-white shadow-sm"
                      : "text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                  }`}
                >
                  أكثر من 500 ر.س ({stats.debtGt500Count})
                </button>
                <button
                  type="button"
                  onClick={() => setDebtFilter("gt-1000")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    debtFilter === "gt-1000"
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-red-800 hover:bg-red-50 dark:text-red-200 dark:hover:bg-red-950/40"
                  }`}
                >
                  أكثر من 1,000 ر.س
                </button>
                <button
                  type="button"
                  onClick={() => setDebtFilter("has-debt")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    debtFilter === "has-debt"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40"
                  }`}
                >
                  يوجد مديونية ({stats.ridersWithDebt})
                </button>
                <button
                  type="button"
                  onClick={() => setDebtFilter("zero-debt")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    debtFilter === "zero-debt"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                  }`}
                >
                  بدون مديونية
                </button>
              </div>
            </div>

            {/* Days Filter Pills */}
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-xs font-bold text-gray-600 dark:text-gray-400">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                أيام التصفية:
              </span>
              <div className="flex flex-wrap items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setDaysFilter("all")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    daysFilter === "all"
                      ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  الكل ({stats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setDaysFilter("overdue")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    daysFilter === "overdue"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40"
                  }`}
                >
                  متأخر &gt; 10 أيام ({stats.overdueCount})
                </button>
                <button
                  type="button"
                  onClick={() => setDaysFilter("critical")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    daysFilter === "critical"
                      ? "bg-red-500 text-white shadow-sm"
                      : "text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                  }`}
                >
                  حرج &gt; 20 يوم ({stats.criticalDaysCount})
                </button>
                <button
                  type="button"
                  onClick={() => setDaysFilter("within-limit")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    daysFilter === "within-limit"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                  }`}
                >
                  ضمن المدة (≤ 10 أيام)
                </button>
              </div>
            </div>

            {/* Clear Filters Button if any active */}
            {(debtFilter !== "all" || daysFilter !== "all" || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setDebtFilter("all");
                  setDaysFilter("all");
                  setSearchTerm("");
                }}
                className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
                إلغاء الفلاتر
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table / Data View */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="space-y-4 p-8 text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-500" />
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              جارٍ تحميل جلسات وتذكيرات التصفية مع المديونيات الإدارية...
            </div>
            <p className="text-xs text-gray-400">
              يتم استخراج كافة السجلات والمديونيات الحالية للحسابات
            </p>
          </div>
        ) : filteredReminders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {reminders.length === 0
                ? "لا توجد جلسات مسجلة حالياً"
                : "لا توجد نتائج مطابقة لمعايير البحث والفلترة"}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {reminders.length === 0
                ? "لا توجد جلسات مفتوحة أو منتهية بحاجة للمتابعة."
                : "جرّب تغيير كلمات البحث أو إلغاء فلتر المديونية أو أيام التصفية."}
            </p>
            {searchTerm || daysFilter !== "all" || debtFilter !== "all" ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setDaysFilter("all");
                  setDebtFilter("all");
                }}
                className="mt-4"
              >
                إعادة ضبط الفلاتر
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/70 text-xs font-bold text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-300">
                <tr>
                  <th className="py-3.5 px-4">المندوب</th>
                  <th className="py-3.5 px-4">حساب المنصة</th>

                  {/* Administrative Debt Header with Sort (as/des) and Filter Dropdown */}
                  <th className="relative py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-gray-900 dark:text-white">
                        المديونية الإدارية
                      </span>

                      {/* Sort Button (Toggle Asc / Desc) */}
                      <button
                        type="button"
                        onClick={toggleDebtSort}
                        title={
                          sortBy === "debt-desc"
                            ? "الترتيب الحالي: تنازلي (الأعلى أولاً). انقر للترتيب تصاعدياً"
                            : "الترتيب الحالي: تصاعدي (الأقل أولاً). انقر للترتيب تنازلياً"
                        }
                        className={`flex h-6 w-6 items-center justify-center rounded-md border transition ${
                          sortBy === "debt-desc" || sortBy === "debt-asc"
                            ? "border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/60 dark:text-red-400"
                            : "border-gray-200 bg-white text-gray-400 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800"
                        }`}
                      >
                        {sortBy === "debt-desc" ? (
                          <ArrowDown className="h-3.5 w-3.5" />
                        ) : sortBy === "debt-asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {/* Filter Dropdown Trigger */}
                      <div className="relative" ref={debtDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setIsDebtDropdownOpen(!isDebtDropdownOpen)}
                          title="تصفية المديونية الإدارية"
                          className={`flex h-6 items-center gap-1 rounded-md border px-1.5 text-[11px] font-bold transition ${
                            debtFilter !== "all"
                              ? "border-red-400 bg-red-500 text-white shadow-sm"
                              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          <Filter className="h-3 w-3" />
                          <span>
                            {debtFilter === "gt-500"
                              ? "> 500"
                              : debtFilter === "gt-1000"
                              ? "> 1000"
                              : debtFilter === "has-debt"
                              ? "يوجد"
                              : debtFilter === "zero-debt"
                              ? "0"
                              : "فلتر"}
                          </span>
                        </button>

                        {/* Dropdown Menu */}
                        {isDebtDropdownOpen && (
                          <div className="absolute right-0 top-8 z-50 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                            <div className="border-b border-gray-100 px-2 py-1 text-[11px] font-bold text-gray-400 dark:border-gray-700">
                              ترتيب المديونية:
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSortBy("debt-desc");
                                setIsDebtDropdownOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                                sortBy === "debt-desc"
                                  ? "bg-red-50 font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300"
                                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <ArrowDown className="h-3.5 w-3.5 text-red-500" />
                                تنازلي (الأعلى مديونية أولاً)
                              </span>
                              {sortBy === "debt-desc" && <Check className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSortBy("debt-asc");
                                setIsDebtDropdownOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                                sortBy === "debt-asc"
                                  ? "bg-red-50 font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300"
                                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <ArrowUp className="h-3.5 w-3.5 text-red-500" />
                                تصاعدي (الأقل مديونية أولاً)
                              </span>
                              {sortBy === "debt-asc" && <Check className="h-3.5 w-3.5" />}
                            </button>

                            <div className="mt-2 border-b border-t border-gray-100 px-2 py-1 text-[11px] font-bold text-gray-400 dark:border-gray-700">
                              تصفية حسب المبلغ:
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setDebtFilter("all");
                                setIsDebtDropdownOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                                debtFilter === "all"
                                  ? "bg-blue-50 font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                              }`}
                            >
                              <span>الكل (عرض الجميع)</span>
                              {debtFilter === "all" && <Check className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDebtFilter("gt-500");
                                setIsDebtDropdownOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                                debtFilter === "gt-500"
                                  ? "bg-red-50 font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300"
                                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                              }`}
                            >
                              <span className="flex items-center gap-1.5 font-bold text-red-600">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                أكثر من 500 ر.س
                              </span>
                              {debtFilter === "gt-500" && <Check className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDebtFilter("gt-1000");
                                setIsDebtDropdownOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                                debtFilter === "gt-1000"
                                  ? "bg-red-50 font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300"
                                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                              }`}
                            >
                              <span className="font-bold text-red-700">أكثر من 1,000 ر.س</span>
                              {debtFilter === "gt-1000" && <Check className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDebtFilter("has-debt");
                                setIsDebtDropdownOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                                debtFilter === "has-debt"
                                  ? "bg-amber-50 font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                              }`}
                            >
                              <span>يوجد مديونية (&gt; 0)</span>
                              {debtFilter === "has-debt" && <Check className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDebtFilter("zero-debt");
                                setIsDebtDropdownOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                                debtFilter === "zero-debt"
                                  ? "bg-emerald-50 font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                              }`}
                            >
                              <span>بدون مديونية (0 ر.س)</span>
                              {debtFilter === "zero-debt" && <Check className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </th>

                  <th className="py-3.5 px-4 text-center">أيام منذ التصفية</th>
                  <th className="py-3.5 px-4">بداية الاحتساب / آخر تصفية</th>
                  <th className="py-3.5 px-4">حالة التصفية</th>
                  <th className="py-3.5 px-4 text-center">إجراءات سريعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredReminders.map((item, index) => {
                  const riderName = getRiderName(item);
                  const extAccount = getExternalAccountId(item);
                  const debt = getAdministrativeDebt(item);
                  const days = getDaysSinceSettlement(item);
                  const anchorDate = getAnchorDateUtc(item);
                  const daysSev = getDaysSeverity(days);

                  return (
                    <tr
                      key={`${item.handoverId || item.HandoverId || index}-${index}`}
                      className="transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                    >
                      {/* Rider Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-sm ${
                              debt > 500
                                ? "bg-red-600"
                                : debt > 0
                                ? "bg-amber-500"
                                : daysSev === "critical"
                                ? "bg-red-500"
                                : "bg-blue-500"
                            }`}
                          >
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">
                              {riderName}
                            </div>
                            <div className="text-xs text-gray-400">مندوب توصيل</div>
                          </div>
                        </div>
                      </td>

                      {/* Platform Account */}
                      <td className="py-3.5 px-4">
                        {extAccount ? (
                          <div className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            <span>جاهز:</span>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                              {extAccount}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">غير محدد</span>
                        )}
                      </td>

                      {/* Administrative Debt Amount */}
                      <td className="py-3.5 px-4">
                        {debt > 0 ? (
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-mono text-sm font-black ${
                                  debt > 500
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {formatCurrency(debt)}
                              </span>
                              {debt > 500 && (
                                <Badge tone="red" className="text-[10px]">
                                  &gt; 500
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400">
                              رصيد مديونية إدارية حالي
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <Check className="h-3.5 w-3.5" />
                            <span>0.00 ر.س (لا توجد مديونية)</span>
                          </div>
                        )}
                      </td>

                      {/* Days Metric */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <div className="flex items-center gap-1.5">
                            {daysSev === "critical" && (
                              <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                              </span>
                            )}
                            <span
                              className={`text-lg font-black ${
                                daysSev === "critical"
                                  ? "text-red-600 dark:text-red-400"
                                  : daysSev === "high"
                                  ? "text-orange-600 dark:text-orange-400"
                                  : daysSev === "moderate"
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {days.toLocaleString("ar-SA-u-nu-latn")}
                            </span>
                            <span className="text-xs font-semibold text-gray-400">يوم</span>
                          </div>
                          {days > 10 ? (
                            <span className="text-[10px] text-red-500">
                              تجاوزت الحد بـ {(days - 10).toLocaleString("ar-SA-u-nu-latn")} يوم
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                              ضمن المهلة المحددة
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Anchor Date */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-semibold text-gray-800 dark:text-gray-200">
                              {formatAnchorDate(anchorDate)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatRelativeDays(days)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Settlement Days Status Badge */}
                      <td className="py-3.5 px-4">
                        {daysSev === "critical" ? (
                          <Badge tone="red" className="flex w-fit items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            تأخير حرج (&gt;20 يوم)
                          </Badge>
                        ) : daysSev === "high" ? (
                          <Badge tone="orange" className="flex w-fit items-center gap-1">
                            <Clock className="h-3 w-3" />
                            تأخير مرتفع (15-20 يوم)
                          </Badge>
                        ) : daysSev === "moderate" ? (
                          <Badge tone="blue" className="flex w-fit items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            متأخر (11-14 يوم)
                          </Badge>
                        ) : (
                          <Badge tone="green" className="flex w-fit items-center gap-1">
                            <Check className="h-3 w-3" />
                            ضمن المدة ({days} أيام)
                          </Badge>
                        )}
                      </td>

                      {/* Action Links */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Navigate to Cashbox & Transferred Debt */}
                          <Link
                            href={`/admin/jahez/cashbox?tab=transferredDebt&search=${encodeURIComponent(
                              riderName,
                            )}`}
                            title="الانتقال إلى شاشة الخزنة وسداد المديونية لهذا المندوب"
                          >
                            <Button
                              variant="secondary"
                              size="sm"
                              className={`flex items-center gap-1 border ${
                                debt > 0
                                  ? "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/50"
                                  : "border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/50"
                              }`}
                            >
                              <Wallet className="h-3.5 w-3.5" />
                              {debt > 0 ? "سداد المديونية" : "الخزنة"}
                            </Button>
                          </Link>

                          {/* Navigate to Accounts / Handover */}
                          <Link
                            href={`/admin/jahez/accounts?search=${encodeURIComponent(riderName)}`}
                            title="عرض تفاصيل حساب وتسليم المندوب"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info */}
        {filteredReminders.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/50 px-4 py-3 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-800/30 sm:flex-row">
            <div>
              عرض{" "}
              <span className="font-bold text-gray-700 dark:text-gray-300">
                {filteredReminders.length.toLocaleString("ar-SA-u-nu-latn")}
              </span>{" "}
              من إجمالي{" "}
              <span className="font-bold text-gray-700 dark:text-gray-300">
                {reminders.length.toLocaleString("ar-SA-u-nu-latn")}
              </span>{" "}
              جلسة مسجلة
            </div>
            <div className="text-gray-400">
              تم تحميل كافة السجلات في هذه الصفحة مباشرة • يتم الحساب تلقائياً عند الطلب وفق توقيت الرياض
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
