// src/app/admin/hunger/components/PerformanceReportTab.tsx
"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { AccountsFilterPanel } from "./AccountsFilterPanel";
import {
  getHungerPerformanceReport,
  exportHungerPerformanceReport,
  getAllHungerAccounts,
  HUNGER_ACTUAL_VEHICLE_OWNERSHIPS,
  getRiyadhCurrentMonthStartIso,
  getRiyadhTodayIso,
  getHungerErrorMessage,
  type BadgeTone,
  type HungerAccountItem,
  type HungerAccountsFilterParams,
  type HungerPerformanceGroupBy,
  type HungerPerformanceLayout,
  type HungerPerformancePeriod,
  type HungerPerformanceReportTotals,
  type HungerPerformanceRowItem,
} from "@/lib/hunger/api";
import { toast } from "@/components/ui/Toast";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  Trash2,
} from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface PerformanceReportTabProps {
  canReadPerformance: boolean;
  canExportPerformance: boolean;
  canDeletePerformance?: boolean;
  onOpenDeleteModal?: (dateStr?: string) => void;
  accountOptions: SelectOption[];
  riderOptions: SelectOption[];
  employeeOptions: SelectOption[];
  cityOptions: SelectOption[];
  sponsorOptions: SelectOption[];
}

function formatNumOrUnknown(
  val: number | null | undefined,
  suffix = "",
): string {
  if (val === null || val === undefined || Number.isNaN(val)) {
    return "غير معروف";
  }
  return `${Number(val).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })}${suffix ? ` ${suffix}` : ""}`;
}

function formatForecast(forecast: number | null | undefined): string {
  if (forecast === null || forecast === undefined) {
    return "لا يوجد توقع موثوق";
  }
  return formatNumOrUnknown(forecast);
}

function formatPeriod(periodStr: string, mode: HungerPerformancePeriod): string {
  if (!periodStr) return "غير معروف";
  if (mode === "month") {
    return periodStr.slice(0, 7);
  }
  return periodStr.slice(0, 10);
}

function isMandatoryOrCoverage(text?: string | null): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes("mandatory") ||
    lower.includes("coverage") ||
    lower.includes("إلزام") ||
    lower.includes("تغطية")
  );
}

function getSeverityTone(severity?: string | null): BadgeTone {
  const norm = (severity || "").toLowerCase();
  if (norm === "critical" || norm === "high") return "red";
  if (norm === "warning") return "orange";
  return "blue";
}

export function PerformanceReportTab({
  canReadPerformance,
  canExportPerformance,
  canDeletePerformance = false,
  onOpenDeleteModal,
  accountOptions,
  riderOptions,
  employeeOptions,
  cityOptions,
  sponsorOptions,
}: PerformanceReportTabProps) {
  const todayIso = getRiyadhTodayIso();
  const [fromDate, setFromDate] = useState(getRiyadhCurrentMonthStartIso());
  const [throughDate, setThroughDate] = useState(todayIso);
  const [groupBy, setGroupBy] = useState<HungerPerformanceGroupBy>("account");
  const [period, setPeriod] = useState<HungerPerformancePeriod>("day");
  const [layout, setLayout] = useState<HungerPerformanceLayout>("vertical");

  // Direct filters
  const [accountId, setAccountId] = useState("");
  const [riderId, setRiderId] = useState("");
  const [cityId, setCityId] = useState("");
  const [sponsorId, setSponsorId] = useState("");
  const [actualVehicle, setActualVehicle] = useState("all");
  const [actualVehicleType, setActualVehicleType] = useState("");
  const [targetAchieved, setTargetAchieved] = useState("all");

  // Prefixed accounts.* filters
  const [accountFilters, setAccountFilters] =
    useState<HungerAccountsFilterParams>({});

  // Pagination & Data
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [items, setItems] = useState<HungerPerformanceRowItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [distinctAccounts, setDistinctAccounts] = useState<number | null>(null);
  const [distinctRiders, setDistinctRiders] = useState<number | null>(null);
  const [totals, setTotals] = useState<HungerPerformanceReportTotals | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState<
    Record<string, boolean>
  >({});

  // Horizontal metric selector
  const [horizontalMetric, setHorizontalMetric] = useState<
    "completedOrders" | "workingHours" | "workedDays"
  >("completedOrders");

  // Client-side cached accounts for entity labels
  const [cachedAccounts, setCachedAccounts] = useState<HungerAccountItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void getAllHungerAccounts()
      .then((accs) => {
        if (!cancelled) {
          setCachedAccounts(accs);
        }
      })
      .catch(() => {
        // ignore lookup error, will fall back
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const getEntityLabel = useCallback(
    (entityId: string, group: HungerPerformanceGroupBy) => {
      if (group === "account") {
        const found = cachedAccounts.find(
          (a) => a.accountId === entityId || a.id === entityId,
        );
        if (found) {
          const ext =
            found.externalAccountId || found.accountCode || entityId.slice(0, 8);
          const owner =
            found.ownerNameAr ||
            found.owner?.nameAr ||
            found.accountName ||
            "";
          return {
            title: ext,
            subtitle: owner,
          };
        }
        const opt = accountOptions.find((o) => o.value === entityId);
        if (opt) {
          return {
            title: opt.label,
            subtitle: opt.sublabel || "",
          };
        }
        return {
          title: entityId.length > 12 ? `${entityId.slice(0, 8)}...` : entityId,
          subtitle: "",
        };
      } else {
        const found = cachedAccounts.find(
          (a) =>
            a.actualRider?.riderProfileId === entityId ||
            a.sourceActualRider?.riderProfileId === entityId,
        );
        if (found) {
          const riderName =
            (found.actualRider?.riderProfileId === entityId
              ? found.actualRider.nameAr
              : found.sourceActualRider?.nameAr) ||
            found.actualRider?.nameEn ||
            found.sourceActualRider?.nameEn ||
            entityId.slice(0, 8);
          return {
            title: riderName,
            subtitle: found.externalAccountId
              ? `حساب: ${found.externalAccountId}`
              : "",
          };
        }
        const opt = riderOptions.find((o) => o.value === entityId);
        if (opt) {
          return {
            title: opt.label,
            subtitle: opt.sublabel || "",
          };
        }
        return {
          title: entityId.length > 12 ? `${entityId.slice(0, 8)}...` : entityId,
          subtitle: "",
        };
      }
    },
    [cachedAccounts, accountOptions, riderOptions],
  );

  const earliestCoverageThrough = useMemo(() => {
    const dates = items
      .map((r) => r.coverageThrough)
      .filter((d): d is string => Boolean(d && d.trim()));
    if (dates.length === 0) return null;
    return dates.sort()[0] || null;
  }, [items]);

  const currentQuery = useMemo(
    () => ({
      from: fromDate,
      through: throughDate,
      groupBy,
      period,
      layout,
      accountId: accountId || undefined,
      riderId: riderId || undefined,
      cityId: cityId || undefined,
      sponsorId: sponsorId || undefined,
      actualVehicle: actualVehicle !== "all" ? actualVehicle : undefined,
      actualVehicleType: actualVehicleType.trim() || undefined,
      targetAchieved: targetAchieved !== "all" ? targetAchieved : undefined,
      page,
      pageSize,
      accountFilters,
    }),
    [
      fromDate,
      throughDate,
      groupBy,
      period,
      layout,
      accountId,
      riderId,
      cityId,
      sponsorId,
      actualVehicle,
      actualVehicleType,
      targetAchieved,
      page,
      pageSize,
      accountFilters,
    ],
  );

  const loadReport = useCallback(async () => {
    if (!canReadPerformance) return;
    if (fromDate > throughDate) {
      toast.error("تاريخ البداية يجب ألا يكون بعد تاريخ النهاية");
      return;
    }
    if (throughDate > todayIso) {
      toast.error("تاريخ النهاية لا يمكن أن يكون في المستقبل");
      return;
    }
    const diffDays = Math.round(
      (new Date(throughDate).getTime() - new Date(fromDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (diffDays > 367) {
      toast.error("نطاق التقرير لا يمكن أن يتجاوز 367 يومًا");
      return;
    }

    setLoading(true);
    try {
      const res = await getHungerPerformanceReport(currentQuery);
      setItems(res.items);
      setTotalRecords(res.totalRecords);
      setDistinctAccounts(res.distinctAccounts ?? null);
      setDistinctRiders(res.distinctRiders ?? null);
      setTotals(res.totals ?? null);
    } catch (err) {
      toast.error(getHungerErrorMessage(err, "تعذر جلب تقرير الأداء"));
    } finally {
      setLoading(false);
    }
  }, [canReadPerformance, fromDate, throughDate, todayIso, currentQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadReport();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadReport]);

  const handleExport = async () => {
    if (!canExportPerformance) return;
    setExporting(true);
    try {
      await exportHungerPerformanceReport({
        ...currentQuery,
        format: "xlsx",
      });
    } catch (err) {
      toast.error(getHungerErrorMessage(err, "تعذر تصدير تقرير الأداء"));
    } finally {
      setExporting(false);
    }
  };

  // Discover horizontal period columns from loaded flat rows
  const horizontalPeriods = useMemo(() => {
    const keySet = new Set<string>();
    items.forEach((row) => {
      if (row.period) keySet.add(row.period);
    });
    return Array.from(keySet).sort();
  }, [items]);

  interface HorizontalGroupItem {
    entityId: string;
    sponsorship: string;
    actualVehicle: string;
    actualVehicleType: string;
    periodMap: Map<string, HungerPerformanceRowItem>;
    totalCompletedOrders: number;
    totalWorkingHours: number;
    totalWorkedDays: number;
  }

  const horizontalGroups = useMemo(() => {
    const map = new Map<string, HorizontalGroupItem>();
    items.forEach((row) => {
      let grp = map.get(row.entityId);
      if (!grp) {
        grp = {
          entityId: row.entityId,
          sponsorship: row.sponsorship,
          actualVehicle: row.actualVehicle,
          actualVehicleType: row.actualVehicleType,
          periodMap: new Map<string, HungerPerformanceRowItem>(),
          totalCompletedOrders: 0,
          totalWorkingHours: 0,
          totalWorkedDays: 0,
        };
        map.set(row.entityId, grp);
      }
      grp.periodMap.set(row.period, row);
      grp.totalCompletedOrders += row.completedOrders || 0;
      grp.totalWorkingHours += row.workingHours || 0;
      grp.totalWorkedDays += row.workedDays || 0;
    });
    return Array.from(map.values());
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  if (!canReadPerformance) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        ليس لديك صلاحية عرض تقارير الأداء (hunger.performance.read).
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Controls & Toggles Card */}
      <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          {/* Date Range + Toggles */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40">
              <DateInput
                label="من تاريخ (from)"
                value={fromDate}
                onChange={(val) => {
                  setFromDate(val);
                  setPage(1);
                }}
              />
            </div>
            <div className="w-40">
              <DateInput
                label="إلى تاريخ (through)"
                value={throughDate}
                onChange={(val) => {
                  setThroughDate(val);
                  setPage(1);
                }}
              />
            </div>

            {/* groupBy Toggle */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                التجميع حسب (groupBy)
              </span>
              <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setGroupBy("account");
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    groupBy === "account"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  حساب (Account)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGroupBy("rider");
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    groupBy === "rider"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  مندوب (Rider)
                </button>
              </div>
            </div>

            {/* period Toggle */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                الفترة (period)
              </span>
              <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setPeriod("day");
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    period === "day"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  يومي (Day)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeriod("month");
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    period === "month"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  شهري (Month)
                </button>
              </div>
            </div>

            {/* layout Toggle */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                طريقة العرض (layout)
              </span>
              <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setLayout("vertical");
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    layout === "vertical"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  رأسي (Vertical)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLayout("horizontal");
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    layout === "horizontal"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  أفقي (Horizontal)
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadReport()}
              loading={loading}
            >
              <RefreshCw className="ml-1.5 h-3.5 w-3.5" />
              تحديث التقرير
            </Button>
            {canExportPerformance && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleExport}
                loading={exporting}
              >
                <Download className="ml-1.5 h-3.5 w-3.5" />
                تصدير الأداء (.xlsx)
              </Button>
            )}
            {canDeletePerformance && onOpenDeleteModal && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenDeleteModal(throughDate || todayIso)}
                className="gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900/50"
                title="حذف تشغيل يوم محدد لتصحيح التكليفات"
              >
                <Trash2 className="ml-1.5 h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                حذف تشغيل يوم
              </Button>
            )}
          </div>
        </div>

        {/* Direct Filters Row */}
        <div className="grid grid-cols-1 gap-3 border-t border-[var(--border)] pt-3 sm:grid-cols-2 lg:grid-cols-7">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
              الحساب (accountId)
            </label>
            <SearchableSelect
              options={[{ value: "", label: "كل الحسابات" }, ...accountOptions]}
              value={accountId}
              onChange={(val) => {
                setAccountId(val);
                setPage(1);
              }}
              placeholder="اختر الحساب..."
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
              المندوب (riderId)
            </label>
            <SearchableSelect
              options={[{ value: "", label: "كل المناديب" }, ...riderOptions]}
              value={riderId}
              onChange={(val) => {
                setRiderId(val);
                setPage(1);
              }}
              placeholder="اختر المندوب..."
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
              المدينة (cityId)
            </label>
            <SearchableSelect
              options={[{ value: "", label: "كل المدن" }, ...cityOptions]}
              value={cityId}
              onChange={(val) => {
                setCityId(val);
                setPage(1);
              }}
              placeholder="اختر المدينة..."
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
              الكفيل (sponsorId)
            </label>
            {sponsorOptions.length > 0 ? (
              <SearchableSelect
                options={[
                  { value: "", label: "كل الكفلاء" },
                  ...sponsorOptions,
                ]}
                value={sponsorId}
                onChange={(val) => {
                  setSponsorId(val);
                  setPage(1);
                }}
                placeholder="اختر الكفيل..."
              />
            ) : (
              <Input
                value={sponsorId}
                onChange={(e) => {
                  setSponsorId(e.target.value);
                  setPage(1);
                }}
                placeholder="UUID الكفيل..."
              />
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
              ملكية المركبة الفعلية (actualVehicle)
            </label>
            <select
              value={actualVehicle}
              onChange={(e) => {
                setActualVehicle(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
            >
              <option value="all">الكل</option>
              {HUNGER_ACTUAL_VEHICLE_OWNERSHIPS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.labelAr}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="نوع المركبة الفعلية (actualVehicleType)"
            value={actualVehicleType}
            onChange={(e) => {
              setActualVehicleType(e.target.value);
              setPage(1);
            }}
            placeholder="سيارة / دراجة..."
          />
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
              تحقيق التارجت (targetAchieved)
            </label>
            <select
              value={targetAchieved}
              onChange={(e) => {
                setTargetAchieved(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
            >
              <option value="all">الكل</option>
              <option value="true">محقق (true)</option>
              <option value="false">غير محقق (false)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Collapsible Accounts.* Filter Panel */}
      <AccountsFilterPanel
        filters={accountFilters}
        onChange={(next) => {
          setAccountFilters(next);
          setPage(1);
        }}
        onReset={() => {
          setAccountFilters({});
          setPage(1);
        }}
        employeeOptions={employeeOptions}
        riderOptions={riderOptions}
        cityOptions={cityOptions}
        sponsorOptions={sponsorOptions}
        hideDateRange
        labelPrefix="فلاتر الحسابات الإضافية (accounts.*)"
      />

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm">
          <p className="text-[11px] font-semibold text-[var(--muted-foreground)]">
            الحسابات المميزة (distinctAccounts)
          </p>
          <p className="mt-1 text-lg font-black text-[var(--foreground)]">
            {formatNumOrUnknown(distinctAccounts)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm">
          <p className="text-[11px] font-semibold text-[var(--muted-foreground)]">
            المناديب المميزون (distinctRiders)
          </p>
          <p className="mt-1 text-lg font-black text-[var(--foreground)]">
            {formatNumOrUnknown(distinctRiders)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm">
          <p className="text-[11px] font-semibold text-[var(--muted-foreground)]">
            أقدم تاريخ تغطية (Earliest Coverage)
          </p>
          <p className="mt-1 font-mono text-sm font-black text-amber-600 dark:text-amber-400">
            {earliestCoverageThrough ? earliestCoverageThrough.slice(0, 10) : "غير معروف"}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm">
          <p className="text-[11px] font-semibold text-[var(--muted-foreground)]">
            إجمالي الطلبات المكتملة (Totals)
          </p>
          <p className="mt-1 text-lg font-black text-emerald-600 dark:text-emerald-400">
            {formatNumOrUnknown(totals?.completedOrders)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm">
          <p className="text-[11px] font-semibold text-[var(--muted-foreground)]">
            إجمالي ساعات العمل (Totals)
          </p>
          <p className="mt-1 text-lg font-black text-sky-600 dark:text-sky-400">
            {formatNumOrUnknown(totals?.workingHours, "ساعة")}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm">
          <p className="text-[11px] font-semibold text-[var(--muted-foreground)]">
            إجمالي السجلات (totalRecords)
          </p>
          <p className="mt-1 text-lg font-black text-[var(--foreground)]">
            {formatNumOrUnknown(totalRecords)}
          </p>
        </div>
      </div>

      {/* Main Performance Table (Vertical or Horizontal) */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-[var(--foreground)]">
              جدول تحليل الأداء والتارجت (
              {groupBy === "account" ? "حسب الحساب" : "حسب المندوب"} —{" "}
              {period === "day" ? "يومي" : "شهري"} —{" "}
              {layout === "vertical" ? "عرض رأسي" : "عرض أفقي"})
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {layout === "horizontal" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--foreground)]">
                  المقياس المعروض:
                </span>
                <select
                  value={horizontalMetric}
                  onChange={(e) =>
                    setHorizontalMetric(
                      e.target.value as
                        | "completedOrders"
                        | "workingHours"
                        | "workedDays",
                    )
                  }
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-semibold"
                >
                  <option value="completedOrders">
                    الطلبات المكتملة (completedOrders)
                  </option>
                  <option value="workingHours">ساعات العمل (workingHours)</option>
                  <option value="workedDays">أيام العمل (workedDays)</option>
                </select>
              </div>
            )}
            <span className="text-xs text-[var(--muted-foreground)]">
              القيم الفارغة (null) تُعرض دائمًا &quot;غير معروف&quot; وليس صفرًا.
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {layout === "vertical" ? (
            <table className="w-full text-right text-xs">
              <thead className="border-b border-[var(--border)] bg-[var(--subtle-bg)] font-bold text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-3 py-2.5">
                    {groupBy === "account" ? "الحساب" : "المندوب"}
                  </th>
                  <th className="px-3 py-2.5">الفترة / التاريخ</th>
                  <th className="px-3 py-2.5">تغطية البيانات حتى</th>
                  <th className="px-3 py-2.5">الكفالة / المركبة</th>
                  <th className="px-3 py-2.5">
                    أيام العمل / المؤهلة / غير المعروفة
                  </th>
                  <th className="px-3 py-2.5">ساعات العمل</th>
                  <th className="px-3 py-2.5">
                    الطلبات (مكتمل / مقبول / مجمع / مرفوض / ملغي)
                  </th>
                  <th className="px-3 py-2.5">الغياب (NoShow)</th>
                  <th className="px-3 py-2.5">
                    التارجت / العجز / الإنجاز
                  </th>
                  <th className="px-3 py-2.5">
                    التوقع (Forecast) والوتيرة المطلوبة
                  </th>
                  <th className="px-3 py-2.5">
                    الأيام الإلزامية والتغطية
                  </th>
                  <th className="px-3 py-2.5">التنبيهات والكتالوج</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="p-8 text-center text-xs text-[var(--muted-foreground)]"
                    >
                      {loading
                        ? "جاري تحميل بيانات الأداء..."
                        : "لا توجد بيانات أداء مطابقة للفلاتر المحددة"}
                    </td>
                  </tr>
                ) : (
                  items.map((row) => {
                    const rowKey = `${row.entityId}-${row.period}`;
                    const isExpanded = Boolean(expandedRowKeys[rowKey]);
                    const alerts = row.alerts ?? [];
                    const catalog = row.catalog ?? [];
                    const mandatoryAlerts = alerts.filter((a) =>
                      isMandatoryOrCoverage(a),
                    );
                    const mandatoryCatalog = catalog.filter(
                      (c) =>
                        isMandatoryOrCoverage(c.code) ||
                        isMandatoryOrCoverage(c.metric) ||
                        isMandatoryOrCoverage(c.kind) ||
                        isMandatoryOrCoverage(c.evidence),
                    );
                    const totalMandatoryAlerts =
                      mandatoryAlerts.length + mandatoryCatalog.length;
                    const entityLabel = getEntityLabel(row.entityId, groupBy);

                    return (
                      <Fragment key={rowKey}>
                        <tr className="hover:bg-[var(--subtle-bg)]/50">
                          {/* Entity */}
                          <td className="px-3 py-2.5">
                            <div>
                              <div className="font-mono font-bold text-[var(--foreground)]">
                                {entityLabel.title}
                              </div>
                              {entityLabel.subtitle && (
                                <div className="text-[11px] text-[var(--muted-foreground)]">
                                  {entityLabel.subtitle}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Period */}
                          <td className="px-3 py-2.5 font-mono">
                            <div className="flex items-center gap-1.5">
                              <span>{formatPeriod(row.period, period)}</span>
                              {canDeletePerformance &&
                                onOpenDeleteModal &&
                                period === "day" &&
                                row.period && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenDeleteModal(row.period.slice(0, 10));
                                    }}
                                    className="rounded p-0.5 text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 transition-colors"
                                    title={`حذف تشغيل يوم ${row.period.slice(0, 10)}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                            </div>
                          </td>

                          {/* Coverage Through */}
                          <td className="px-3 py-2.5 font-mono text-[11px]">
                            {row.coverageThrough ? (
                              <span className="text-emerald-700 dark:text-emerald-400">
                                {row.coverageThrough.slice(0, 10)}
                              </span>
                            ) : (
                              <span className="text-[var(--muted-foreground)]">
                                غير معروف
                              </span>
                            )}
                          </td>

                          {/* Sponsorship & Vehicle */}
                          <td className="px-3 py-2.5">
                            <div>{row.sponsorship || "غير معروف"}</div>
                            <div className="text-[11px] text-[var(--muted-foreground)]">
                              {row.actualVehicle || "غير معروف"}
                              {row.actualVehicleType
                                ? ` (${row.actualVehicleType})`
                                : ""}
                            </div>
                          </td>

                          {/* Worked / Qualified / Unknown Days */}
                          <td className="px-3 py-2.5">
                            <div className="space-y-0.5 text-[11px]">
                              <div>
                                أيام عمل:{" "}
                                <span className="font-bold">
                                  {formatNumOrUnknown(row.workedDays)}
                                </span>
                              </div>
                              <div>
                                مؤهلة (≥8س):{" "}
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {formatNumOrUnknown(row.qualifiedDays)}
                                </span>
                              </div>
                              <div>
                                غير معروفة:{" "}
                                <span className="font-bold text-amber-600 dark:text-amber-400">
                                  {formatNumOrUnknown(row.unknownDays)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Hours */}
                          <td className="px-3 py-2.5 font-mono font-bold">
                            {formatNumOrUnknown(row.workingHours, "س")}
                          </td>

                          {/* Orders Breakdown */}
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-emerald-700 dark:text-emerald-300">
                              مكتمل: {formatNumOrUnknown(row.completedOrders)}
                            </div>
                            <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                              مقبول: {formatNumOrUnknown(row.acceptedOrders)} |
                              مجمع: {formatNumOrUnknown(row.stackedOrders)}
                            </div>
                            <div className="text-[11px] text-rose-600 dark:text-rose-400">
                              مرفوض: {formatNumOrUnknown(row.rejectedOrders)} |
                              ملغي: {formatNumOrUnknown(row.cancelledOrders)}
                            </div>
                          </td>

                          {/* NoShow */}
                          <td className="px-3 py-2.5 font-mono">
                            {row.noShowCount === null ||
                            row.noShowCount === undefined ? (
                              <span className="text-[var(--muted-foreground)]">
                                غير معروف
                              </span>
                            ) : row.noShowCount > 0 ? (
                              <Badge tone="red">{row.noShowCount} شفت</Badge>
                            ) : (
                              <span>0</span>
                            )}
                          </td>

                          {/* Target / Deficit / TargetAchieved */}
                          <td className="px-3 py-2.5">
                            <div className="space-y-0.5 text-[11px]">
                              <div>
                                التارجت:{" "}
                                <span className="font-mono font-bold">
                                  {formatNumOrUnknown(row.target)}
                                </span>
                              </div>
                              <div>
                                العجز:{" "}
                                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                                  {formatNumOrUnknown(row.deficit)}
                                </span>
                              </div>
                              <div>
                                الإنجاز:{" "}
                                {row.targetAchieved === true ? (
                                  <Badge tone="green">محقق</Badge>
                                ) : row.targetAchieved === false ? (
                                  <Badge tone="red">غير محقق</Badge>
                                ) : (
                                  <span className="text-[var(--muted-foreground)]">
                                    غير معروف
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Forecast & Required Pace */}
                          <td className="px-3 py-2.5">
                            <div className="space-y-0.5 text-[11px]">
                              <div>
                                التوقع:{" "}
                                <span className="font-bold">
                                  {formatForecast(row.forecast)}
                                </span>
                              </div>
                              <div>
                                الوتيرة المطلوبة:{" "}
                                <span className="font-mono font-bold">
                                  {formatNumOrUnknown(row.requiredPace)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Mandatory Days & Coverage Alerts */}
                          <td className="px-3 py-2.5">
                            {totalMandatoryAlerts > 0 ? (
                              <Badge tone="orange">
                                {totalMandatoryAlerts} تنبيه إلزام / تغطية
                              </Badge>
                            ) : (
                              <Badge tone="green">ملتزم بالتغطية</Badge>
                            )}
                          </td>

                          {/* Expandable Alerts & Catalog */}
                          <td className="px-3 py-2.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setExpandedRowKeys((prev) => ({
                                  ...prev,
                                  [rowKey]: !prev[rowKey],
                                }))
                              }
                            >
                              <span>
                                تنبيهات ({alerts.length}) | كتالوج (
                                {catalog.length})
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="mr-1 h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="mr-1 h-3.5 w-3.5" />
                              )}
                            </Button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-[var(--subtle-bg)]/40">
                            <td colSpan={12} className="px-6 py-3">
                              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                                {/* Alerts List */}
                                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                                  <h5 className="mb-2 text-xs font-bold text-[var(--foreground)]">
                                    التنبيهات المسجلة ({alerts.length})
                                  </h5>
                                  {alerts.length === 0 ? (
                                    <p className="text-[11px] text-[var(--muted-foreground)]">
                                      لا توجد تنبيهات لهذا السجل.
                                    </p>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {alerts.map((al, aIdx) => {
                                        const isMandatory =
                                          isMandatoryOrCoverage(al);
                                        return (
                                          <div
                                            key={aIdx}
                                            className={`rounded-lg border p-2 text-[11px] ${
                                              isMandatory
                                                ? "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
                                                : "border-[var(--border)]"
                                            }`}
                                          >
                                            <div className="flex items-center justify-between">
                                              <span>{al}</span>
                                              {isMandatory && (
                                                <Badge tone="orange">
                                                  إلزام / تغطية
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* Catalog Evaluations */}
                                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                                  <h5 className="mb-2 text-xs font-bold text-[var(--foreground)]">
                                    تقييمات كتالوج القواعد والأهداف (
                                    {catalog.length})
                                  </h5>
                                  {catalog.length === 0 ? (
                                    <p className="text-[11px] text-[var(--muted-foreground)]">
                                      لا توجد تقييمات كتالوج لهذا السجل.
                                    </p>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {catalog.map((cat, cIdx) => (
                                        <div
                                          key={cIdx}
                                          className="rounded-lg border border-[var(--border)] p-2 text-[11px]"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-mono font-bold">
                                              {cat.code}
                                              {cat.metric
                                                ? ` (${cat.metric})`
                                                : ""}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                              {cat.matches ? (
                                                <Badge tone="red">
                                                  مطابق للقاعدة
                                                </Badge>
                                              ) : (
                                                <Badge tone="gray">
                                                  غير مطابق
                                                </Badge>
                                              )}
                                              <Badge
                                                tone={getSeverityTone(
                                                  cat.severity,
                                                )}
                                              >
                                                {cat.severity || "Info"}
                                              </Badge>
                                            </div>
                                          </div>
                                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[var(--muted-foreground)]">
                                            <span>
                                              الفعلي:{" "}
                                              <strong className="text-[var(--foreground)]">
                                                {formatNumOrUnknown(cat.actual)}
                                              </strong>
                                            </span>
                                            <span>
                                              الحد:{" "}
                                              <strong className="text-[var(--foreground)]">
                                                {formatNumOrUnknown(
                                                  cat.threshold,
                                                )}
                                              </strong>
                                            </span>
                                            {cat.period && (
                                              <span className="font-mono">
                                                الفترة: {cat.period}
                                              </span>
                                            )}
                                          </div>
                                          {cat.evidence && (
                                            <p className="mt-1 font-mono text-[10px] text-[var(--muted-foreground)]">
                                              {cat.evidence}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Mandatory Days & Missing Coverage Breakdown */}
                                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                                  <h5 className="mb-2 text-xs font-bold text-[var(--foreground)]">
                                    تفصيل الأيام الإلزامية ونقص التغطية
                                  </h5>
                                  {mandatoryAlerts.length === 0 &&
                                  mandatoryCatalog.length === 0 ? (
                                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                                      لا توجد تنبيهات نقص تغطية أو غياب في
                                      الأيام الإلزامية لهذا السجل.
                                    </p>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {mandatoryAlerts.map((al, idx) => (
                                        <div
                                          key={`ma-${idx}`}
                                          className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50/50 p-2 text-[11px] dark:border-amber-800 dark:bg-amber-950/20"
                                        >
                                          <span>{al}</span>
                                          <Badge tone="orange">
                                            تنبيه نصي
                                          </Badge>
                                        </div>
                                      ))}
                                      {mandatoryCatalog.map((cat, idx) => (
                                        <div
                                          key={`mc-${idx}`}
                                          className="rounded-lg border border-amber-300 bg-amber-50/50 p-2 text-[11px] dark:border-amber-800 dark:bg-amber-950/20"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-mono font-bold">
                                              {cat.code}
                                            </span>
                                            <Badge
                                              tone={getSeverityTone(
                                                cat.severity,
                                              )}
                                            >
                                              {cat.severity || "تنبيه"}
                                            </Badge>
                                          </div>
                                          {cat.evidence && (
                                            <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                                              {cat.evidence}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* Horizontal Layout Table (Grouped client-side by entityId, columns = distinct periods) */
            <table className="w-full text-right text-xs">
              <thead className="border-b border-[var(--border)] bg-[var(--subtle-bg)] font-bold text-[var(--muted-foreground)]">
                <tr>
                  <th className="sticky right-0 z-10 bg-[var(--subtle-bg)] px-3 py-2.5">
                    {groupBy === "account" ? "الحساب" : "المندوب"}
                  </th>
                  <th className="px-3 py-2.5">الكفالة / المركبة</th>
                  <th className="px-3 py-2.5">
                    {horizontalMetric === "completedOrders"
                      ? "إجمالي الطلبات"
                      : horizontalMetric === "workingHours"
                        ? "إجمالي الساعات"
                        : "إجمالي أيام العمل"}
                  </th>
                  {horizontalPeriods.map((colPeriod) => (
                    <th key={colPeriod} className="px-3 py-2.5 font-mono">
                      <div className="flex items-center justify-center gap-1">
                        <span>{formatPeriod(colPeriod, period)}</span>
                        {canDeletePerformance &&
                          onOpenDeleteModal &&
                          period === "day" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenDeleteModal(colPeriod.slice(0, 10));
                              }}
                              className="rounded p-0.5 text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 transition-colors"
                              title={`حذف تشغيل يوم ${colPeriod.slice(0, 10)}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {horizontalGroups.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3 + horizontalPeriods.length}
                      className="p-8 text-center text-xs text-[var(--muted-foreground)]"
                    >
                      {loading
                        ? "جاري تحميل بيانات العرض الأفقي..."
                        : "لا توجد بيانات أداء مطابقة للفلاتر المحددة"}
                    </td>
                  </tr>
                ) : (
                  horizontalGroups.map((grp) => {
                    const entityLabel = getEntityLabel(grp.entityId, groupBy);
                    return (
                      <tr
                        key={grp.entityId}
                        className="hover:bg-[var(--subtle-bg)]/50"
                      >
                        <td className="sticky right-0 z-10 bg-[var(--surface)] px-3 py-2.5 font-semibold">
                          <div>
                            <div className="font-mono font-bold">
                              {entityLabel.title}
                            </div>
                            {entityLabel.subtitle && (
                              <div className="text-[11px] text-[var(--muted-foreground)]">
                                {entityLabel.subtitle}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-[11px]">
                          <div>{grp.sponsorship || "غير معروف"}</div>
                          <div className="text-[var(--muted-foreground)]">
                            {grp.actualVehicle || "غير معروف"}
                            {grp.actualVehicleType
                              ? ` (${grp.actualVehicleType})`
                              : ""}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {horizontalMetric === "completedOrders"
                            ? formatNumOrUnknown(grp.totalCompletedOrders)
                            : horizontalMetric === "workingHours"
                              ? formatNumOrUnknown(grp.totalWorkingHours, "س")
                              : formatNumOrUnknown(grp.totalWorkedDays, "ي")}
                        </td>
                        {horizontalPeriods.map((colPeriod) => {
                          const cellRow = grp.periodMap.get(colPeriod);
                          if (!cellRow) {
                            return (
                              <td
                                key={colPeriod}
                                className="px-3 py-2.5 text-center font-mono text-[var(--muted-foreground)]"
                              >
                                —
                              </td>
                            );
                          }
                          const displayVal =
                            horizontalMetric === "completedOrders"
                              ? formatNumOrUnknown(cellRow.completedOrders)
                              : horizontalMetric === "workingHours"
                                ? formatNumOrUnknown(cellRow.workingHours, "س")
                                : formatNumOrUnknown(cellRow.workedDays, "ي");
                          return (
                            <td
                              key={colPeriod}
                              className="px-3 py-2.5 font-mono text-center"
                            >
                              {displayVal}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] p-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[var(--muted-foreground)]">
              إجمالي السجلات: <strong>{totalRecords}</strong>
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(
                  Math.min(Math.max(Number(e.target.value) || 25, 1), 100),
                );
                setPage(1);
              }}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
            >
              {[10, 25, 50, 100].map((sz) => (
                <option key={sz} value={sz}>
                  {sz} / صفحة
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              السابق
            </Button>
            <span>
              صفحة {page} من {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              التالي
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
