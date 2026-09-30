"use client";

import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getVehicleAssignmentsPeriodReport,
  getRiderAssignmentsPeriodReport,
} from "@/lib/reports/api";
import type {
  VehicleAssignmentsPeriodReport,
  VehicleAssignmentsPeriodRow,
  RiderAssignmentsPeriodReport,
  RiderAssignmentsPeriodRow,
  RiderVehiclePeriodAssignment,
} from "@/lib/reports/types";
import {
  getRiyadhTodayDate,
  getRiyadhFirstDayOfMonth,
  formatRiyadhDateTime,
  formatSarAmount,
  formatSarNumber,
  formatDays,
  formatDaysNumber,
} from "@/lib/reports/utils";
import { formatVehicleType } from "@/lib/fleet/formatters";
import { exportToExcel } from "@/lib/export-excel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  FileSpreadsheet,
  Car,
  Users,
  Search,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Calendar,
  CalendarDays,
  ShieldAlert,
  Info,
  ExternalLink,
  CheckCircle2,
  Clock,
  Wallet,
  Hash,
  Filter,
  Layers,
  ChevronLeft,
} from "lucide-react";

// Required permissions per spec: reports, fleet assignments, fleet vehicles
const REQUIRED_PERMISSIONS = [
  { key: "reports.read", label: "قراءة التقارير (reports.read)" },
  { key: "fleet.assignments.read", label: "قراءة تعيينات الأسطول (fleet.assignments.read)" },
  { key: "fleet.vehicles.read", label: "قراءة مركبات الأسطول (fleet.vehicles.read)" },
];

function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, "") // tashkeel
    .replace(/\u0640/g, "") // tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

// Preset date ranges helper in Riyadh calendar
function getPresetDates(preset: "currentMonth" | "prevMonth" | "last30" | "last7"): { from: string; to: string } {
  const today = getRiyadhTodayDate();
  const [y, m, d] = today.split("-").map(Number);

  switch (preset) {
    case "currentMonth":
      return {
        from: `${y}-${String(m).padStart(2, "0")}-01`,
        to: today,
      };
    case "prevMonth": {
      const prevMonthDate = new Date(Date.UTC(y, m - 2, 1));
      const prevYear = prevMonthDate.getUTCFullYear();
      const prevMonth = String(prevMonthDate.getUTCMonth() + 1).padStart(2, "0");
      const lastDayDate = new Date(Date.UTC(y, m - 1, 0));
      const lastDay = String(lastDayDate.getUTCDate()).padStart(2, "0");
      return {
        from: `${prevYear}-${prevMonth}-01`,
        to: `${prevYear}-${prevMonth}-${lastDay}`,
      };
    }
    case "last30": {
      const d30 = new Date(Date.UTC(y, m - 1, d - 29));
      return {
        from: d30.toISOString().split("T")[0],
        to: today,
      };
    }
    case "last7": {
      const d7 = new Date(Date.UTC(y, m - 1, d - 6));
      return {
        from: d7.toISOString().split("T")[0],
        to: today,
      };
    }
  }
}

export default function VehicleAndRiderAssignmentReportsPage() {
  const { user, can, isLoading: authLoading } = useAuth();

  // Active view tab
  const [activeTab, setActiveTab] = useState<"vehicles" | "riders">("vehicles");

  // Date range inputs (default to current month in Riyadh)
  const [fromDate, setFromDate] = useState<string>(() => getRiyadhFirstDayOfMonth());
  const [toDate, setToDate] = useState<string>(() => getRiyadhTodayDate());

  // Report data states
  const [vehicleReport, setVehicleReport] = useState<VehicleAssignmentsPeriodReport | null>(null);
  const [riderReport, setRiderReport] = useState<RiderAssignmentsPeriodReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search & client-side filters
  const [search, setSearch] = useState("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>("all");
  const [hasAssignmentFilter, setHasAssignmentFilter] = useState<string>("all");
  const [realRiderFilter, setRealRiderFilter] = useState<string>("all");

  // Expanded row keys (vehicleId or riderKey)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  // Check required permissions
  const missingPermissions = useMemo(() => {
    if (user?.roles?.includes("admin") || user?.userName === "omar") return [];
    return REQUIRED_PERMISSIONS.filter((p) => !can(p.key));
  }, [can, user]);

  // Load report data
  const fetchReport = useCallback(
    async (from: string, to: string, tab: "vehicles" | "riders") => {
      if (missingPermissions.length > 0) return;
      if (!from || !to) {
        setErrorMsg("يرجى تحديد تاريخ البداية وتاريخ النهاية.");
        return;
      }
      if (from > to) {
        setErrorMsg("حدد تاريخ بداية ونهاية صالحين، على أن لا يسبق تاريخ النهاية تاريخ البداية.");
        return;
      }
      if (to === "9999-12-31") {
        setErrorMsg("تاريخ النهاية المحدد غير صالح.");
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      try {
        if (tab === "vehicles") {
          const res = await getVehicleAssignmentsPeriodReport(from, to);
          setVehicleReport(res);
        } else {
          const res = await getRiderAssignmentsPeriodReport(from, to);
          setRiderReport(res);
        }
      } catch (err: any) {
        console.error("Fetch report error:", err);
        const detail =
          err?.data?.detail ||
          err?.data?.title ||
          err?.message ||
          "حدث خطأ أثناء جلب بيانات التقرير. يرجى التحقق من المدخلات.";
        setErrorMsg(detail);
      } finally {
        setLoading(false);
      }
    },
    [missingPermissions.length]
  );

  // Initial load and tab change trigger
  useEffect(() => {
    if (!authLoading && missingPermissions.length === 0) {
      fetchReport(fromDate, toDate, activeTab);
    }
  }, [activeTab, authLoading, missingPermissions.length, fetchReport]);

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchReport(fromDate, toDate, activeTab);
  };

  const handleApplyPreset = (preset: "currentMonth" | "prevMonth" | "last30" | "last7") => {
    const range = getPresetDates(preset);
    setFromDate(range.from);
    setToDate(range.to);
    fetchReport(range.from, range.to, activeTab);
  };

  // Toggle row expansion
  const toggleRow = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Expand / collapse all rows
  const handleExpandAll = (keys: string[]) => {
    setExpandedKeys(new Set(keys));
  };
  const handleCollapseAll = () => {
    setExpandedKeys(new Set());
  };

  // Helper: Vehicle type badge
  const renderVehicleTypeBadge = (vType: number) => {
    switch (vType) {
      case 1:
        return <Badge tone="orange">دراجة نارية</Badge>;
      case 2:
        return <Badge tone="blue">سيارة</Badge>;
      case 3:
        return <Badge tone="green">فان</Badge>;
      case 4:
        return <Badge tone="gray">شاحنة</Badge>;
      default:
        return <Badge tone="gray">{formatVehicleType(vType)}</Badge>;
    }
  };

  // Helper: Actual Rider Badge
  const renderDriverBadge = (assignment: RiderVehiclePeriodAssignment) => {
    if (assignment.isRealRider) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
          <CheckCircle2 className="h-3 w-3" /> سائق فعلي
        </span>
      );
    }

    if (assignment.actualRiderName || assignment.actualRiderIqamaNo) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
          سائق بديل / فعلي
          {assignment.relationshipToAssignedRider && (
            <span className="opacity-80">({assignment.relationshipToAssignedRider})</span>
          )}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
        <AlertTriangle className="h-3 w-3" /> سائق فعلي غير محدد
      </span>
    );
  };

  // ----------------------------------------------------
  // Filtered Vehicle Rows
  // ----------------------------------------------------
  const filteredVehicles = useMemo(() => {
    if (!vehicleReport?.vehicles) return [];
    const query = normalizeText(search);

    return vehicleReport.vehicles.filter((v) => {
      // Assignment filter
      if (hasAssignmentFilter === "assigned" && v.assignments.length === 0) return false;
      if (hasAssignmentFilter === "unassigned" && v.assignments.length > 0) return false;

      // Vehicle type filter (from assignments if present)
      if (vehicleTypeFilter !== "all") {
        const matchesType = v.assignments.some(
          (a) => String(a.vehicleType) === vehicleTypeFilter
        );
        if (!matchesType && v.assignments.length > 0) return false;
      }

      // Search query
      if (query) {
        const searchable = [
          v.assetNumber,
          v.plateNumberAr,
          v.serialNumber,
          ...v.assignments.flatMap((a) => [
            a.actualRiderName,
            a.actualRiderIqamaNo,
            a.assignedRiderName,
            a.assignedRiderIqamaNo,
          ]),
        ]
          .filter(Boolean)
          .map((s) => normalizeText(String(s)))
          .join(" ");

        if (!searchable.includes(query)) return false;
      }

      return true;
    });
  }, [vehicleReport, search, hasAssignmentFilter, vehicleTypeFilter]);

  // ----------------------------------------------------
  // Filtered Rider Rows
  // ----------------------------------------------------
  const filteredRiders = useMemo(() => {
    if (!riderReport?.riders) return [];
    const query = normalizeText(search);

    return riderReport.riders.filter((r) => {
      // Real rider filter
      if (realRiderFilter === "original") {
        if (!r.assignments.some((a) => a.isRealRider)) return false;
      } else if (realRiderFilter === "substitute") {
        if (!r.assignments.some((a) => !a.isRealRider)) return false;
      }

      // Vehicle type filter
      if (vehicleTypeFilter !== "all") {
        const matchesType = r.assignments.some(
          (a) => String(a.vehicleType) === vehicleTypeFilter
        );
        if (!matchesType) return false;
      }

      // Search query
      if (query) {
        const searchable = [
          r.riderName,
          r.riderIqamaNo,
          r.riderKey,
          ...r.assignments.flatMap((a) => [
            a.assetNumber,
            a.plateNumberAr,
            a.serialNumber,
            a.assignedRiderName,
          ]),
        ]
          .filter(Boolean)
          .map((s) => normalizeText(String(s)))
          .join(" ");

        if (!searchable.includes(query)) return false;
      }

      return true;
    });
  }, [riderReport, search, realRiderFilter, vehicleTypeFilter]);

  // ----------------------------------------------------
  // KPIs for Vehicles Report
  // ----------------------------------------------------
  const vehicleKpis = useMemo(() => {
    if (!vehicleReport?.vehicles) {
      return { total: 0, assignedCount: 0, unassignedCount: 0, totalDays: 0, totalSar: 0, hasNullCost: false };
    }
    const vehicles = vehicleReport.vehicles;
    const total = vehicles.length;
    let assignedCount = 0;
    let unassignedCount = 0;
    let totalDays = 0;
    let totalSar = 0;
    let hasNullCost = false;

    for (const v of vehicles) {
      if (v.assignments.length > 0) assignedCount++;
      else unassignedCount++;

      totalDays += v.totalDaysAssignedInPeriod || 0;

      if (v.totalAmountToCollectInPeriodSar === null) {
        hasNullCost = true;
      } else {
        totalSar += v.totalAmountToCollectInPeriodSar;
      }
    }

    return { total, assignedCount, unassignedCount, totalDays, totalSar, hasNullCost };
  }, [vehicleReport]);

  // ----------------------------------------------------
  // KPIs for Riders Report
  // ----------------------------------------------------
  const riderKpis = useMemo(() => {
    if (!riderReport?.riders) {
      return { total: 0, totalDays: 0, totalSar: 0, hasNullCost: false, avgDays: 0 };
    }
    const riders = riderReport.riders;
    const total = riders.length;
    let totalDays = 0;
    let totalSar = 0;
    let hasNullCost = false;

    for (const r of riders) {
      totalDays += r.totalDaysWithVehiclesInPeriod || 0;
      if (r.totalVehicleCostInPeriodSar === null) {
        hasNullCost = true;
      } else {
        totalSar += r.totalVehicleCostInPeriodSar;
      }
    }

    const avgDays = total > 0 ? formatDaysNumber(totalDays / total) : 0;

    return { total, totalDays, totalSar, hasNullCost, avgDays };
  }, [riderReport]);

  // ----------------------------------------------------
  // Export to Excel handler
  // ----------------------------------------------------
  const handleExportExcel = async (exportType: "summary" | "detailed") => {
    setExporting(true);
    try {
      if (activeTab === "vehicles") {
        if (!vehicleReport?.vehicles || filteredVehicles.length === 0) return;

        if (exportType === "summary") {
          await exportToExcel<VehicleAssignmentsPeriodRow>({
            filename: `vehicle-assignments-period-${fromDate}-to-${toDate}`,
            sheetName: "تقرير المركبات",
            data: filteredVehicles,
            columns: [
              { header: "#", accessor: (_, idx) => idx + 1, width: 6 },
              { header: "رقم الأصل", accessor: (v) => v.assetNumber, width: 16, isText: true },
              { header: "اللوحة (عربي)", accessor: (v) => v.plateNumberAr || "—", width: 16, isText: true },
              { header: "الرقم التسلسلي", accessor: (v) => v.serialNumber || "—", width: 18, isText: true },
              { header: "عدد التعيينات بالفترة", accessor: (v) => v.assignments.length, width: 18 },
              {
                header: "إجمالي الأيام بالفترة",
                accessor: (v) => formatDaysNumber(v.totalDaysAssignedInPeriod),
                width: 18,
              },
              {
                header: "إجمالي المستحق للتحصيل (ر.س)",
                accessor: (v) =>
                  formatSarNumber(v.totalAmountToCollectInPeriodSar) ?? "لا توجد تسعيرة",
                width: 24,
              },
            ],
          });
        } else {
          // Flatten all assignments
          const flatAssignments: Array<{
            vehicle: VehicleAssignmentsPeriodRow;
            assignment: RiderVehiclePeriodAssignment;
          }> = [];
          for (const v of filteredVehicles) {
            for (const a of v.assignments) {
              flatAssignments.push({ vehicle: v, assignment: a });
            }
          }

          await exportToExcel({
            filename: `vehicle-assignments-detailed-${fromDate}-to-${toDate}`,
            sheetName: "تفاصيل تعيينات المركبات",
            data: flatAssignments,
            columns: [
              { header: "#", accessor: (_, idx) => idx + 1, width: 6 },
              { header: "رقم الأصل", accessor: (i) => i.vehicle.assetNumber, width: 16, isText: true },
              { header: "اللوحة", accessor: (i) => i.vehicle.plateNumberAr || "—", width: 16, isText: true },
              { header: "النوع", accessor: (i) => formatVehicleType(i.assignment.vehicleType), width: 14 },
              {
                header: "السائق الفعلي",
                accessor: (i) =>
                  i.assignment.actualRiderName || (i.assignment.isRealRider ? i.assignment.assignedRiderName : "سائق غير محدد"),
                width: 22,
              },
              {
                header: "هوية السائق الفعلي",
                accessor: (i) => i.assignment.actualRiderIqamaNo || i.assignment.assignedRiderIqamaNo || "—",
                width: 18,
                isText: true,
              },
              {
                header: "صفة السائق",
                accessor: (i) => (i.assignment.isRealRider ? "سائق فعلي" : `بديل (${i.assignment.relationshipToAssignedRider || "—"})`),
                width: 18,
              },
              {
                header: "السائق المسجل الأصلي",
                accessor: (i) => i.assignment.assignedRiderName || "—",
                width: 22,
              },
              {
                header: "بداية الفترة المحتسبة",
                accessor: (i) => formatRiyadhDateTime(i.assignment.periodStartedAtUtc),
                width: 22,
                isText: true,
              },
              {
                header: "نهاية الفترة المحتسبة",
                accessor: (i) => formatRiyadhDateTime(i.assignment.periodEndedAtUtc),
                width: 22,
                isText: true,
              },
              {
                header: "الأيام بالفترة",
                accessor: (i) => formatDaysNumber(i.assignment.daysInPeriod),
                width: 14,
              },
              {
                header: "إجمالي أيام التعيين كاملة",
                accessor: (i) => formatDaysNumber(i.assignment.totalAssignmentDays),
                width: 18,
              },
              {
                header: "التكلفة الشهرية (ر.س)",
                accessor: (i) => formatSarNumber(i.assignment.monthlyCostSar) ?? "لا توجد تسعيرة",
                width: 18,
              },
              {
                header: "التكلفة اليومية (ر.س)",
                accessor: (i) => formatSarNumber(i.assignment.dailyCostSar) ?? "—",
                width: 18,
              },
              {
                header: "المستحق بالفترة (ر.س)",
                accessor: (i) => formatSarNumber(i.assignment.costInPeriodSar) ?? "لا توجد تسعيرة",
                width: 18,
              },
              {
                header: "حالة التعيين الأصلية",
                accessor: (i) => (i.assignment.endedAtUtc ? "منتهية" : "جارية / مفتوحة"),
                width: 16,
              },
            ],
          });
        }
      } else {
        if (!riderReport?.riders || filteredRiders.length === 0) return;

        if (exportType === "summary") {
          await exportToExcel<RiderAssignmentsPeriodRow>({
            filename: `rider-assignments-period-${fromDate}-to-${toDate}`,
            sheetName: "تقرير السائقين الفعليين",
            data: filteredRiders,
            columns: [
              { header: "#", accessor: (_, idx) => idx + 1, width: 6 },
              { header: "اسم السائق", accessor: (r) => r.riderName || "سائق غير محدد", width: 24 },
              { header: "رقم الإقامة", accessor: (r) => r.riderIqamaNo || "—", width: 18, isText: true },
              { header: "معرّف التقرير", accessor: (r) => r.riderKey, width: 24, isText: true },
              { header: "عدد التعيينات", accessor: (r) => r.assignments.length, width: 14 },
              {
                header: "إجمالي الأيام مع مركبات",
                accessor: (r) => formatDaysNumber(r.totalDaysWithVehiclesInPeriod),
                width: 20,
              },
              {
                header: "إجمالي تكلفة المركبات (ر.س)",
                accessor: (r) =>
                  formatSarNumber(r.totalVehicleCostInPeriodSar) ?? "لا توجد تسعيرة",
                width: 24,
              },
            ],
          });
        } else {
          // Detailed flattened assignments
          const flatAssignments: Array<{
            rider: RiderAssignmentsPeriodRow;
            assignment: RiderVehiclePeriodAssignment;
          }> = [];
          for (const r of filteredRiders) {
            for (const a of r.assignments) {
              flatAssignments.push({ rider: r, assignment: a });
            }
          }

          await exportToExcel({
            filename: `rider-assignments-detailed-${fromDate}-to-${toDate}`,
            sheetName: "تفاصيل تعيينات السائقين",
            data: flatAssignments,
            columns: [
              { header: "#", accessor: (_, idx) => idx + 1, width: 6 },
              { header: "اسم السائق", accessor: (i) => i.rider.riderName || "سائق غير محدد", width: 22 },
              { header: "رقم الإقامة", accessor: (i) => i.rider.riderIqamaNo || "—", width: 18, isText: true },
              { header: "رقم الأصل", accessor: (i) => i.assignment.assetNumber, width: 16, isText: true },
              { header: "اللوحة", accessor: (i) => i.assignment.plateNumberAr || "—", width: 16, isText: true },
              { header: "النوع", accessor: (i) => formatVehicleType(i.assignment.vehicleType), width: 14 },
              {
                header: "صفة القيادة",
                accessor: (i) => (i.assignment.isRealRider ? "سائق فعلي" : `سائق بديل (${i.assignment.relationshipToAssignedRider || "—"})`),
                width: 18,
              },
              {
                header: "السائق المسجل بالعهدة",
                accessor: (i) => i.assignment.assignedRiderName || "—",
                width: 22,
              },
              {
                header: "بداية الفترة المحتسبة",
                accessor: (i) => formatRiyadhDateTime(i.assignment.periodStartedAtUtc),
                width: 22,
                isText: true,
              },
              {
                header: "نهاية الفترة المحتسبة",
                accessor: (i) => formatRiyadhDateTime(i.assignment.periodEndedAtUtc),
                width: 22,
                isText: true,
              },
              {
                header: "الأيام بالفترة",
                accessor: (i) => formatDaysNumber(i.assignment.daysInPeriod),
                width: 14,
              },
              {
                header: "إجمالي أيام التعيين كاملة",
                accessor: (i) => formatDaysNumber(i.assignment.totalAssignmentDays),
                width: 18,
              },
              {
                header: "التكلفة الشهرية (ر.س)",
                accessor: (i) => formatSarNumber(i.assignment.monthlyCostSar) ?? "لا توجد تسعيرة",
                width: 18,
              },
              {
                header: "التكلفة بالفترة (ر.س)",
                accessor: (i) => formatSarNumber(i.assignment.costInPeriodSar) ?? "لا توجد تسعيرة",
                width: 18,
              },
            ],
          });
        }
      }
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  // If user lacks required permissions
  if (!authLoading && missingPermissions.length > 0) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-8 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
          <ShieldAlert className="mx-auto h-16 w-16 text-amber-500" />
          <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">
            صلاحيات غير كافية لعرض تقارير الفترات
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            يتطلب هذا التقرير جميع الصلاحيات الأربع التالية للوصول للبيانات:
          </p>
          <ul className="mt-4 space-y-2 text-right text-xs">
            {REQUIRED_PERMISSIONS.map((perm) => {
              const has = can(perm.key);
              return (
                <li
                  key={perm.key}
                  className={`flex items-center justify-between rounded-xl px-4 py-2 border ${has
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 font-bold"
                    }`}
                >
                  <span>{perm.label}</span>
                  <span>{has ? "متاحة ✓" : "مفقودة ✗"}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-6">
            <Link href="/admin/fleet/vehicles">
              <Button variant="secondary" className="gap-2">
                <ArrowRight className="h-4 w-4" /> العودة لقائمة المركبات
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const asOfUtc = activeTab === "vehicles" ? vehicleReport?.asOfUtc : riderReport?.asOfUtc;

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/admin/fleet/vehicles" className="hover:text-[#1167c9] transition-colors">
              أسطول المركبات
            </Link>
            <ChevronLeft size={14} />
            <span className="text-slate-800 dark:text-slate-200 font-bold">تقارير فترات العهد والتعيينات</span>
          </div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-slate-100">
            <div className="rounded-2xl bg-blue-500/10 p-2.5 text-[#1167c9] dark:bg-blue-500/20">
              <FileSpreadsheet className="h-7 w-7" />
            </div>
            تقارير فترات العهد والتعيينات
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            تقرير دقيق لاحتساب فترات التعيين وتكاليف ومستحقات المركبات والمناديب حسب تقويم الرياض (UTC+03:00)
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => handleExportExcel("summary")}
            loading={exporting}
            disabled={exporting || loading}
            className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-bold"
          >
            <FileSpreadsheet size={16} />
            تصدير إكسل (الملخص)
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleExportExcel("detailed")}
            loading={exporting}
            disabled={exporting || loading}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            <FileSpreadsheet size={16} />
            تصدير إكسل (التفصيلي)
          </Button>
          <Button
            variant="secondary"
            onClick={() => fetchReport(fromDate, toDate, activeTab)}
            loading={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Date Filter & Presets Card */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Inputs Form */}
          <form onSubmit={handleApplyFilter} className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-400 shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">من:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">إلى:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                required
              />
            </div>

            <Button type="submit" loading={loading} className="bg-[#1167c9] hover:bg-[#0e56a8] font-bold">
              تطبيق الفترة
            </Button>
          </form>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 border-t pt-3 lg:border-t-0 lg:pt-0 border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-400 ml-1">فترات سريعة:</span>
            <button
              type="button"
              onClick={() => handleApplyPreset("currentMonth")}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              الشهر الحالي
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("prevMonth")}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              الشهر السابق
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("last30")}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              آخر 30 يوم
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("last7")}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              آخر 7 أيام
            </button>
          </div>
        </div>

        {/* Riyadh Timezone & AsOfUtc info bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Info className="h-4 w-4 text-blue-500" />
            <span>
              الفترة تشمل التاريخين بالكامل بتوقيت الرياض (UTC+03:00) من الساعة 00:00 لليوم الأول وحتى نهاية اليوم الأخير.
            </span>
          </div>
          {asOfUtc && (
            <div className="flex items-center gap-1 font-mono font-medium">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>لحظة الاحتساب (As Of): {formatRiyadhDateTime(asOfUtc)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Report Switcher Tabs */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("vehicles")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all ${activeTab === "vehicles"
              ? "border-[#1167c9] text-[#1167c9] dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
        >
          <Car className="h-4 w-4" />
          <span>تقرير حسب المركبة (Vehicle-Centric)</span>
          {vehicleReport && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              {vehicleReport.vehicles.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("riders")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all ${activeTab === "riders"
              ? "border-[#1167c9] text-[#1167c9] dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
        >
          <Users className="h-4 w-4" />
          <span>تقرير حسب السائق الفعلي (Rider-Centric)</span>
          {riderReport && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              {riderReport.riders.length}
            </span>
          )}
        </button>
      </div>

      {/* KPI Cards */}
      {activeTab === "vehicles" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold">إجمالي المركبات بالأسطول</span>
              <Car className="h-5 w-5 text-blue-500" />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {vehicleKpis.total}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span className="text-emerald-600 font-bold">{vehicleKpis.assignedCount} معينة</span>
              <span>•</span>
              <span className="text-slate-400">{vehicleKpis.unassignedCount} بدون عهدة</span>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold">إجمالي أيام التعيين بالفترة</span>
              <CalendarDays className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {formatDays(vehicleKpis.totalDays)}
            </div>
            <p className="mt-1 text-xs text-slate-500">مجموع الأيام المحسوبة بدقة داخل نطاق التقرير</p>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold">إجمالي المستحق للتحصيل</span>
              <Wallet className="h-5 w-5 text-amber-500" />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {vehicleKpis.totalSar.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
              <span className="text-base font-bold text-slate-600 dark:text-slate-300">ر.س</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {vehicleKpis.hasNullCost
                ? "* توجد مركبات بدون تسعيرة محددة (فان/شاحنة)"
                : "إجمالي المبالغ المستحقة للتحصيل من التعيينات"}
            </p>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold">المركبات المعينة بالفترة</span>
              <CheckCircle2 className="h-5 w-5 text-[#1167c9]" />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {vehicleKpis.assignedCount}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {vehicleKpis.total > 0
                ? `${Math.round((vehicleKpis.assignedCount / vehicleKpis.total) * 100)}% من الأسطول`
                : "—"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold">إجمالي السائقين الفعليين</span>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {riderKpis.total}
            </div>
            <p className="mt-1 text-xs text-slate-500">سائقون قادوا مركبات خلال الفترة المحددة</p>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold">إجمالي أيام قيادة المركبات</span>
              <CalendarDays className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {formatDays(riderKpis.totalDays)}
            </div>
            <p className="mt-1 text-xs text-slate-500">مجموع فترات القيادة الفعلية للمناديب</p>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold">إجمالي تكلفة المركبات</span>
              <Wallet className="h-5 w-5 text-amber-500" />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {riderKpis.totalSar.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
              <span className="text-base font-bold text-slate-600 dark:text-slate-300">ر.س</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {riderKpis.hasNullCost
                ? "* توجد تعيينات بدون تسعيرة محددة"
                : "مجموع تكلفة استخدام المركبات للمناديب"}
            </p>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-bold">متوسط أيام القيادة / مندوب</span>
              <Clock className="h-5 w-5 text-[#1167c9]" />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {riderKpis.avgDays} <span className="text-sm font-semibold text-slate-500">يوم</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">متوسط الأيام للسائقين النشطين بالفترة</p>
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder={
                activeTab === "vehicles"
                  ? "بحث برقم الأصل، اللوحة، التسلسلي، أو اسم السائق..."
                  : "بحث باسم السائق، الإقامة، معرّف التقرير، أو رقم الأصل..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Vehicle Type Filter */}
          <select
            value={vehicleTypeFilter}
            onChange={(e) => setVehicleTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">جميع أنواع المركبات</option>
            <option value="2">سيارات (Cars)</option>
            <option value="1">دراجات نارية (Motorcycles)</option>
            <option value="3">فان (Vans)</option>
            <option value="4">شاحنات (Trucks)</option>
            <option value="5">أخرى (Other)</option>
          </select>

          {/* Status Filter for Vehicles */}
          {activeTab === "vehicles" && (
            <select
              value={hasAssignmentFilter}
              onChange={(e) => setHasAssignmentFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">حالة التعيين: الكل</option>
              <option value="assigned">معينة في الفترة فقط</option>
              <option value="unassigned">غير معينة (فارغة)</option>
            </select>
          )}

          {/* Driver Filter for Riders */}
          {activeTab === "riders" && (
            <select
              value={realRiderFilter}
              onChange={(e) => setRealRiderFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">صفة السائق: الكل</option>
              <option value="original">سائق فعلي فقط</option>
              <option value="substitute">سائق بديل / إضافي</option>
            </select>
          )}
        </div>

        {/* Expand / Collapse All */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            onClick={() =>
              activeTab === "vehicles"
                ? handleExpandAll(filteredVehicles.map((v) => v.vehicleId))
                : handleExpandAll(filteredRiders.map((r) => r.riderKey))
            }
            className="text-xs px-2.5 py-1.5"
          >
            <ChevronDown className="h-3.5 w-3.5 ml-1" /> توسيع الكل
          </Button>
          <Button variant="ghost" onClick={handleCollapseAll} className="text-xs px-2.5 py-1.5">
            <ChevronUp className="h-3.5 w-3.5 ml-1" /> طي الكل
          </Button>
        </div>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-[#1167c9]" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            جاري استخراج تقرير فترات العهد والتعيينات...
          </p>
        </div>
      ) : activeTab === "vehicles" ? (
        /* ==================================================== */
        /* VEHICLE REPORT TABLE */
        /* ==================================================== */
        filteredVehicles.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
            <Car className="h-10 w-10 text-slate-300 dark:text-slate-700" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">لا توجد بيانات مركبات</h3>
            <p className="text-xs text-slate-500">لا توجد مركبات تطابق شروط الفلترة المحددة في هذه الفترة.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3.5">اللوحة (عربي)</th>
                    <th className="px-4 py-3.5">الرقم التسلسلي</th>
                    <th className="px-4 py-3.5">التعيينات بالفترة</th>
                    <th className="px-4 py-3.5">الأيام بالفترة</th>
                    <th className="px-4 py-3.5">المستحق للتحصيل (ر.س)</th>
                    <th className="px-4 py-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredVehicles.map((vehicle) => {
                    const isExpanded = expandedKeys.has(vehicle.vehicleId);
                    const hasAssignments = vehicle.assignments.length > 0;

                    return (
                      <Fragment key={vehicle.vehicleId}>
                        <tr
                          className={`group transition-colors ${isExpanded
                              ? "bg-blue-50/40 dark:bg-blue-950/20"
                              : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                            }`}
                        >
                          {/* 1. Plate Number */}
                          <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                            {vehicle.plateNumberAr ? (
                              <span className="inline-block rounded-md border border-slate-200 bg-slate-100/70 px-2 py-0.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800">
                                {vehicle.plateNumberAr}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* 3. Serial Number */}
                          <td className="px-4 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-400">
                            {vehicle.serialNumber || "—"}
                          </td>

                          {/* 4. Assignments Count & Inline Toggle */}
                          <td className="px-4 py-3.5">
                            {hasAssignments ? (
                              <button
                                type="button"
                                onClick={() => toggleRow(vehicle.vehicleId)}
                                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#1167c9] dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shadow-xs"
                              >
                                <span>{vehicle.assignments.length} تعيين</span>
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">بدون تعيين بالفترة</span>
                            )}
                          </td>

                          {/* 5. Total Days */}
                          <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                            {formatDays(vehicle.totalDaysAssignedInPeriod)}
                          </td>

                          {/* 6. Total Amount to Collect */}
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                            {formatSarAmount(vehicle.totalAmountToCollectInPeriodSar)}
                          </td>

                          {/* 7. Actions */}
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {hasAssignments && (
                                <button
                                  type="button"
                                  onClick={() => toggleRow(vehicle.vehicleId)}
                                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-[#1167c9] hover:bg-blue-50 dark:hover:bg-blue-950/40 dark:text-blue-400 transition-colors"
                                >
                                  <span>{isExpanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}</span>
                                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>
                              )}
                              <Link
                                href={`/admin/fleet/vehicles/${vehicle.vehicleId}`}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                              >
                                <span>المركبة</span>
                                <ExternalLink size={12} />
                              </Link>
                            </div>
                          </td>
                        </tr>

                        {/* Inline Expanded Row */}
                        {isExpanded && hasAssignments && (
                          <tr className="bg-slate-50/70 dark:bg-slate-900/50">
                            <td colSpan={6} className="p-4">
                              <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm dark:border-blue-900/50 dark:bg-slate-900">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 mb-3">
                                  <div className="flex items-center gap-2">
                                    <Car className="h-4 w-4 text-[#1167c9]" />
                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                      تفاصيل تعيينات المركبة: {vehicle.plateNumberAr || vehicle.assetNumber}
                                    </span>
                                    {vehicle.plateNumberAr && vehicle.assetNumber && (
                                      <span className="font-mono text-xs text-slate-500">
                                        ({vehicle.assetNumber})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs font-semibold text-slate-500">
                                    إجمالي الفترة: {formatDays(vehicle.totalDaysAssignedInPeriod)} | المستحق للتحصيل:{" "}
                                    {formatSarAmount(vehicle.totalAmountToCollectInPeriodSar)}
                                  </div>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-right text-xs">
                                    <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                                      <tr>
                                        <th className="px-3 py-2">نوع المركبة</th>
                                        <th className="px-3 py-2">السائق الفعلي</th>
                                        <th className="px-3 py-2">السائق المسجل بالعهدة</th>
                                        <th className="px-3 py-2">الفترة المحتسبة بالتقرير</th>
                                        <th className="px-3 py-2">أيام الفترة</th>
                                        <th className="px-3 py-2">فترة التعيين الأصلية</th>
                                        <th className="px-3 py-2">الأيام الكلية</th>
                                        <th className="px-3 py-2">التكلفة الشهرية</th>
                                        <th className="px-3 py-2">المستحق بالفترة</th>
                                        <th className="px-3 py-2 text-center">العهدة</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                      {vehicle.assignments.map((assignment) => (
                                        <tr key={assignment.assignmentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                          <td className="px-3 py-2.5">
                                            {renderVehicleTypeBadge(assignment.vehicleType)}
                                          </td>
                                          <td className="px-3 py-2.5">
                                            <div className="font-bold text-slate-900 dark:text-slate-100">
                                              {assignment.actualRiderName || (assignment.isRealRider ? assignment.assignedRiderName : "سائق غير محدد")}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                              {renderDriverBadge(assignment)}
                                              {(assignment.actualRiderIqamaNo || assignment.assignedRiderIqamaNo) && (
                                                <span className="font-mono text-[11px] text-slate-500">
                                                  {assignment.actualRiderIqamaNo || assignment.assignedRiderIqamaNo}
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                                            <div>{assignment.assignedRiderName || "—"}</div>
                                            {assignment.assignedRiderIqamaNo && (
                                              <div className="font-mono text-[11px] text-slate-400">
                                                {assignment.assignedRiderIqamaNo}
                                              </div>
                                            )}
                                          </td>
                                          <td className="px-3 py-2.5 font-mono text-[11px]">
                                            <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                                              من: {formatRiyadhDateTime(assignment.periodStartedAtUtc)}
                                            </div>
                                            <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                                              إلى: {formatRiyadhDateTime(assignment.periodEndedAtUtc)}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2.5 font-bold text-slate-800 dark:text-slate-200">
                                            {formatDays(assignment.daysInPeriod)}
                                          </td>
                                          <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">
                                            <div>من: {formatRiyadhDateTime(assignment.startedAtUtc)}</div>
                                            <div>
                                              إلى:{" "}
                                              {assignment.endedAtUtc
                                                ? formatRiyadhDateTime(assignment.endedAtUtc)
                                                : "جارية / مفتوحة"}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2.5 font-medium text-slate-600 dark:text-slate-400">
                                            {formatDays(assignment.totalAssignmentDays)}
                                          </td>
                                          <td className="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-300">
                                            {formatSarAmount(assignment.monthlyCostSar)}
                                          </td>
                                          <td className="px-3 py-2.5 font-bold text-[#1167c9] dark:text-blue-400">
                                            {formatSarAmount(assignment.costInPeriodSar)}
                                          </td>
                                          <td className="px-3 py-2.5 text-center">
                                            <Link
                                              href={`/admin/fleet/assignments/${assignment.assignmentId}`}
                                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1167c9] hover:underline dark:text-blue-400"
                                            >
                                              <span>عرض</span>
                                              <ExternalLink size={10} />
                                            </Link>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* ==================================================== */
        /* RIDER REPORT TABLE */
        /* ==================================================== */
        filteredRiders.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
            <Users className="h-10 w-10 text-slate-300 dark:text-slate-700" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">لا توجد بيانات مناديب وسائقين</h3>
            <p className="text-xs text-slate-500">
              لم يسجل أي مندوب قيادة فعلية لمركبة مطابقة للشروط خلال هذه الفترة.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3.5">اسم السائق الفعلي</th>
                    <th className="px-4 py-3.5">رقم الإقامة</th>
                    <th className="px-4 py-3.5">المركبات المستخدمة</th>
                    <th className="px-4 py-3.5">الأيام مع مركبات</th>
                    <th className="px-4 py-3.5">تكلفة المركبات (ر.س)</th>
                    <th className="px-4 py-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRiders.map((rider) => {
                    const isExpanded = expandedKeys.has(rider.riderKey);
                    const hasAssignments = rider.assignments.length > 0;

                    return (
                      <Fragment key={rider.riderKey}>
                        <tr
                          className={`group transition-colors ${isExpanded
                              ? "bg-blue-50/40 dark:bg-blue-950/20"
                              : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                            }`}
                        >
                          {/* 1. Rider Name */}
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                            {rider.riderName || (
                              <span className="text-slate-400 italic">سائق غير محدد</span>
                            )}
                          </td>

                          {/* 2. Iqama No */}
                          <td className="px-4 py-3.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                            {rider.riderIqamaNo ? (
                              <span className="rounded-md border border-slate-200 bg-slate-100/70 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-800">
                                {rider.riderIqamaNo}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* 3. Assignments Count & Inline Toggle */}
                          <td className="px-4 py-3.5">
                            {hasAssignments ? (
                              <button
                                type="button"
                                onClick={() => toggleRow(rider.riderKey)}
                                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#1167c9] dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shadow-xs"
                              >
                                <span>{rider.assignments.length} عهدة/مركبة</span>
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">بدون عهدة</span>
                            )}
                          </td>

                          {/* 4. Days with Vehicles */}
                          <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                            {formatDays(rider.totalDaysWithVehiclesInPeriod)}
                          </td>

                          {/* 5. Vehicle Cost SAR */}
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                            {formatSarAmount(rider.totalVehicleCostInPeriodSar)}
                          </td>

                          {/* 6. Actions */}
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {hasAssignments && (
                                <button
                                  type="button"
                                  onClick={() => toggleRow(rider.riderKey)}
                                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-[#1167c9] hover:bg-blue-50 dark:hover:bg-blue-950/40 dark:text-blue-400 transition-colors"
                                >
                                  <span>{isExpanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}</span>
                                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>
                              )}
                              {rider.riderProfileId && (
                                <Link
                                  href={`/admin/employees/${rider.riderProfileId}`}
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                                >
                                  <span>الملف</span>
                                  <ExternalLink size={12} />
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Inline Expanded Row */}
                        {isExpanded && hasAssignments && (
                          <tr className="bg-slate-50/70 dark:bg-slate-900/50">
                            <td colSpan={6} className="p-4">
                              <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm dark:border-blue-900/50 dark:bg-slate-900">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 mb-3">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-[#1167c9]" />
                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                      تفاصيل مركبات السائق: {rider.riderName || "غير محدد"}
                                    </span>
                                    {rider.riderIqamaNo && (
                                      <span className="font-mono text-xs text-slate-500">
                                        ({rider.riderIqamaNo})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs font-semibold text-slate-500">
                                    إجمالي أيام القيادة: {formatDays(rider.totalDaysWithVehiclesInPeriod)} | التكلفة:{" "}
                                    {formatSarAmount(rider.totalVehicleCostInPeriodSar)}
                                  </div>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-right text-xs">
                                    <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                                      <tr>
                                        <th className="px-3 py-2">رقم الأصل</th>
                                        <th className="px-3 py-2">اللوحة</th>
                                        <th className="px-3 py-2">نوع المركبة</th>
                                        <th className="px-3 py-2">صفة القيادة</th>
                                        <th className="px-3 py-2">السائق المسجل الأصلي</th>
                                        <th className="px-3 py-2">الفترة المحتسبة بالتقرير</th>
                                        <th className="px-3 py-2">أيام الفترة</th>
                                        <th className="px-3 py-2">التكلفة الشهرية</th>
                                        <th className="px-3 py-2">التكلفة بالفترة</th>
                                        <th className="px-3 py-2 text-center">العهدة</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                      {rider.assignments.map((assignment) => (
                                        <tr key={assignment.assignmentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                          <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                                            <Link
                                              href={`/admin/fleet/vehicles/${assignment.vehicleId}`}
                                              className="text-[#1167c9] hover:underline dark:text-blue-400"
                                            >
                                              {assignment.assetNumber}
                                            </Link>
                                          </td>
                                          <td className="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-300">
                                            {assignment.plateNumberAr || "—"}
                                          </td>
                                          <td className="px-3 py-2.5">
                                            {renderVehicleTypeBadge(assignment.vehicleType)}
                                          </td>
                                          <td className="px-3 py-2.5">
                                            {renderDriverBadge(assignment)}
                                          </td>
                                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                                            <div>{assignment.assignedRiderName || "—"}</div>
                                            {assignment.assignedRiderIqamaNo && (
                                              <div className="font-mono text-[11px] text-slate-400">
                                                {assignment.assignedRiderIqamaNo}
                                              </div>
                                            )}
                                          </td>
                                          <td className="px-3 py-2.5 font-mono text-[11px]">
                                            <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                                              من: {formatRiyadhDateTime(assignment.periodStartedAtUtc)}
                                            </div>
                                            <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                                              إلى: {formatRiyadhDateTime(assignment.periodEndedAtUtc)}
                                            </div>
                                          </td>
                                          <td className="px-3 py-2.5 font-bold text-slate-800 dark:text-slate-200">
                                            {formatDays(assignment.daysInPeriod)}
                                          </td>
                                          <td className="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-300">
                                            {formatSarAmount(assignment.monthlyCostSar)}
                                          </td>
                                          <td className="px-3 py-2.5 font-bold text-[#1167c9] dark:text-blue-400">
                                            {formatSarAmount(assignment.costInPeriodSar)}
                                          </td>
                                          <td className="px-3 py-2.5 text-center">
                                            <Link
                                              href={`/admin/fleet/assignments/${assignment.assignmentId}`}
                                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1167c9] hover:underline dark:text-blue-400"
                                            >
                                              <span>عرض</span>
                                              <ExternalLink size={10} />
                                            </Link>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
