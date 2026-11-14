// src/app/admin/hunger/operations/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getHungerPlatform,
  getAllHungerAccounts,
  getHungerOperationsReport,
  exportHungerOperationsReport,
  downloadHungerOperationsTemplate,
  previewHungerOperationsImport,
  confirmHungerOperationsImport,
  updateHungerManualOperationsComparison,
  getHungerMonthlySummary,
  getHungerAlertRules,
  createHungerAlertRule,
  getRiyadhTodayIso,
  getRiyadhCurrentMonthStartIso,
  HUNGER_ALERT_RULE_CODES,
  HUNGER_ALERT_SEVERITIES,
  HUNGER_ALERT_METRICS,
  HUNGER_ALERT_OPERATORS,
  HUNGER_ALERT_KINDS,
  HUNGER_ALERT_PERIODS,
  type HungerAccountItem,
  type HungerAccountsFilterParams,
  type HungerOperationItem,
  type HungerOperationReport,
  type HungerOperationsImportPreviewResponse,
  type HungerMonthlySummaryResponse,
  type HungerAlertRuleItem,
  type HungerAlertSeverity,
  type HungerAlertMetric,
  type HungerAlertOperator,
  type HungerAlertKind,
  type HungerAlertPeriod,
} from "@/lib/hunger/api";
import { PerformanceReportTab } from "../components/PerformanceReportTab";
import { PotentialFinesTab } from "../components/PotentialFinesTab";
import { AccountsFilterPanel } from "../components/AccountsFilterPanel";
import { HungerDeletePerformanceModal } from "../components/HungerDeletePerformanceModal";
import {
  listRiders,
  listEmployees,
  listOperatingCities,
  listSponsors,
  type OperatingCity,
  type Sponsor,
} from "@/lib/workforce/api";
import type { Employee, Rider } from "@/lib/workforce/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { DateInput } from "@/components/ui/DateInput";
import { toast } from "@/components/ui/Toast";
import {
  TableHeaderColumnFilter,
  type FilterOption,
} from "@/components/ui/TableHeaderFilter";
import {
  BarChart3,
  Download,
  Upload,
  FileSpreadsheet,
  RefreshCw,
  Edit3,
  BellRing,
  Layers,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Users,
  Server,
  ShieldAlert,
  TrendingUp,
  Trash2,
} from "lucide-react";

type ActiveTab =
  | "operations"
  | "performance"
  | "fines"
  | "summary"
  | "alerts";

export default function HungerOperationsPage() {
  const { can, canAny, authorization, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const canRead = canAny(
    "hunger.read",
    "hunger.performance.read",
    "hunger.performance.import",
    "hunger.performance.export",
    "hunger.alerts.manage",
  );
  const canReadPerformance = canAny("hunger.performance.read", "hunger.read");
  const canImportOps = can("hunger.performance.import");
  const canExportOps = can("hunger.performance.export") && can("hunger.read");
  const canManageAlerts = can("hunger.alerts.manage");
  const canManageFinance = can("hunger.finance.manage");
  // Allow delete UI when user has delete/import/read permission (and not explicitly denied)
  const isDeleteExplicitlyDenied = Boolean(
    authorization?.deniedPermissionKeys?.includes("hunger.performance.delete") ||
      authorization?.directDenies?.includes("hunger.performance.delete"),
  );
  const canDeleteOps =
    !isDeleteExplicitlyDenied &&
    canAny(
      "hunger.performance.delete",
      "hunger.performance.import",
      "hunger.read",
    );

  const [activeTab, setActiveTab] = useState<ActiveTab>("operations");
  const [platformId, setPlatformId] = useState<string>("");

  // Lookups for dropdowns (no raw IDs)
  const [accounts, setAccounts] = useState<HungerAccountItem[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cities, setCities] = useState<OperatingCity[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  // Tab 1: Operations Report State
  const [fromDate, setFromDate] = useState(getRiyadhCurrentMonthStartIso());
  const [throughDate, setThroughDate] = useState(getRiyadhTodayIso());
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [captainClassificationFilter, setCaptainClassificationFilter] =
    useState("");
  const [opsAccountFilters, setOpsAccountFilters] =
    useState<HungerAccountsFilterParams>({});
  const [opsReport, setOpsReport] = useState<HungerOperationReport | null>(null);
  const [opsRows, setOpsRows] = useState<HungerOperationItem[]>([]);
  const [opsLoading, setOpsLoading] = useState(false);
  const [colFilterAccount, setColFilterAccount] = useState<string[]>([]);
  const [colFilterRider, setColFilterRider] = useState<string[]>([]);
  const [colFilterManual, setColFilterManual] = useState<string[]>([]);
  const [colFilterAlert, setColFilterAlert] = useState<string[]>([]);

  // Import Operations Modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importReportDate, setImportReportDate] =
    useState(getRiyadhTodayIso());
  const [importPreview, setImportPreview] =
    useState<HungerOperationsImportPreviewResponse | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  // Delete Daily Operations Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteReportDate, setDeleteReportDate] = useState(getRiyadhTodayIso());

  // Manual Comparison Modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualRow, setManualRow] = useState<HungerOperationItem | null>(null);
  const [manualOrders, setManualOrders] = useState("");
  const [manualHours, setManualHours] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [manualBusy, setManualBusy] = useState(false);

  // Tab 2: Monthly Summary State
  const [summaryMonth, setSummaryMonth] = useState(
    getRiyadhCurrentMonthStartIso().slice(0, 7),
  );
  const [summaryData, setSummaryData] =
    useState<HungerMonthlySummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Tab 3: Alert Rules & Target Catalog State (Section 2)
  const [alertRules, setAlertRules] = useState<HungerAlertRuleItem[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [ruleCode, setRuleCode] = useState<string>("HoursCritical");
  const [ruleMetric, setRuleMetric] =
    useState<HungerAlertMetric>("WorkingHours");
  const [ruleOperator, setRuleOperator] =
    useState<HungerAlertOperator>("LessThan");
  const [ruleKind, setRuleKind] = useState<HungerAlertKind>("Alert");
  const [rulePeriod, setRulePeriod] = useState<HungerAlertPeriod>("Day");
  const [ruleThreshold, setRuleThreshold] = useState("8");
  const [ruleSeverity, setRuleSeverity] =
    useState<HungerAlertSeverity>("Critical");
  const [ruleCityId, setRuleCityId] = useState<string>("");
  const [ruleEffectiveFrom, setRuleEffectiveFrom] =
    useState(getRiyadhTodayIso());
  const [ruleEffectiveThrough, setRuleEffectiveThrough] = useState("");
  const [ruleEnabled, setRuleEnabled] = useState(true);
  const [ruleEvidence, setRuleEvidence] = useState("");
  const [ruleBusy, setRuleBusy] = useState(false);

  // Load lookups
  useEffect(() => {
    void (async () => {
      const [plat, accs, rids, emps, cits, sps] = await Promise.allSettled([
        getHungerPlatform(),
        getAllHungerAccounts(),
        listRiders(),
        listEmployees(),
        listOperatingCities(),
        listSponsors(),
      ]);
      if (plat.status === "fulfilled" && plat.value?.id) {
        setPlatformId(plat.value.id);
      }
      if (accs.status === "fulfilled" && Array.isArray(accs.value)) {
        setAccounts(accs.value);
      }
      if (rids.status === "fulfilled" && Array.isArray(rids.value)) {
        setRiders(rids.value);
      }
      if (emps.status === "fulfilled" && Array.isArray(emps.value)) {
        setEmployees(emps.value);
      }
      if (cits.status === "fulfilled" && Array.isArray(cits.value)) {
        setCities(cits.value);
      }
      if (sps.status === "fulfilled" && Array.isArray(sps.value)) {
        setSponsors(sps.value);
      }
    })();
  }, []);

  const accountOptions = useMemo(
    () => [
      { value: "", label: "جميع حسابات هنقرستيشن" },
      ...accounts.map((a) => ({
        value: a.accountId || a.id || "",
        label: `${a.externalAccountId || a.accountName || "حساب"}${a.ownerNameAr ? ` — المالك: ${a.ownerNameAr}` : ""}`,
        sublabel: a.assignedRiderNameAr
          ? `المندوب المكلف: ${a.assignedRiderNameAr}`
          : "شاغر",
      })),
    ],
    [accounts],
  );

  const riderOptions = useMemo(
    () => [
      { value: "", label: "جميع المناديب" },
      ...riders.map((r) => ({
        value: r.id,
        label: `${r.fullNameAr}${r.iqamaNo ? ` — هوية: ${r.iqamaNo}` : ""}`,
      })),
    ],
    [riders],
  );

  const employeeSelectOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: e.id,
        label: `${e.fullNameAr}${e.iqamaNo ? ` — هوية: ${e.iqamaNo}` : ""}`,
      })),
    [employees],
  );

  const citySelectOptions = useMemo(
    () =>
      cities.map((c) => ({
        value: c.id,
        label: isEn ? c.globalCityEn || c.globalCityAr : c.globalCityAr,
      })),
    [cities, isEn],
  );

  const sponsorSelectOptions = useMemo(
    () =>
      sponsors.map((s) => ({
        value: s.id,
        label: `${s.registryNameAr}${s.employerIdentityNumber ? ` (${s.employerIdentityNumber})` : ""}`,
      })),
    [sponsors],
  );

  // Fetch Operations Report
  const loadOperations = useCallback(async () => {
    await Promise.resolve();
    if (!canRead) return;
    setOpsLoading(true);
    try {
      const res = await getHungerOperationsReport({
        from: fromDate,
        through: throughDate,
        accountId: selectedAccountId || undefined,
        riderId: selectedRiderId || undefined,
        captainClassification: captainClassificationFilter.trim() || undefined,
        page: 1,
        pageSize: 100,
      });
      setOpsReport(res);
      setOpsRows(res.items);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "تعذر تحميل تقرير التشغيل اليومي",
      );
    } finally {
      setOpsLoading(false);
    }
  }, [
    canRead,
    fromDate,
    throughDate,
    selectedAccountId,
    selectedRiderId,
    captainClassificationFilter,
  ]);

  // Fetch Monthly Summary
  const loadSummary = useCallback(async () => {
    await Promise.resolve();
    if (!canRead) return;
    setSummaryLoading(true);
    try {
      const res = await getHungerMonthlySummary(summaryMonth);
      setSummaryData(res);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "تعذر تحميل الملخص الشهري",
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [canRead, summaryMonth]);

  // Fetch Alert Rules
  const loadAlertRules = useCallback(async () => {
    await Promise.resolve();
    if (!canRead && !canManageAlerts) return;
    setAlertsLoading(true);
    try {
      const res = await getHungerAlertRules();
      setAlertRules(res);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "تعذر تحميل قواعد التنبيهات",
      );
    } finally {
      setAlertsLoading(false);
    }
  }, [canRead, canManageAlerts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "operations") void loadOperations();
      if (activeTab === "summary") void loadSummary();
      if (activeTab === "alerts") void loadAlertRules();
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab, loadOperations, loadSummary, loadAlertRules]);

  // Lookup maps for enriching operations rows
  const accountLookup = useMemo(() => {
    const map = new Map<string, HungerAccountItem>();
    for (const a of accounts) {
      if (a.accountId) map.set(a.accountId.toLowerCase(), a);
      if (a.id) map.set(a.id.toLowerCase(), a);
      if (a.externalAccountId) map.set(a.externalAccountId.toLowerCase(), a);
    }
    return map;
  }, [accounts]);

  const riderLookup = useMemo(() => {
    const map = new Map<string, Rider>();
    for (const r of riders) {
      if (r.id) map.set(r.id.toLowerCase(), r);
    }
    return map;
  }, [riders]);

  const getRowAccountInfo = useCallback(
    (r: HungerOperationItem) => {
      const acc =
        accountLookup.get(r.accountId?.toLowerCase()) ||
        accountLookup.get(r.externalAccountId?.toLowerCase());
      return {
        number:
          r.externalAccountId ||
          acc?.externalAccountId ||
          acc?.accountCode ||
          r.accountId,
        name: acc?.accountName || r.accountName || null,
        owner: acc?.ownerNameAr || r.ownerNameAr || null,
        city: acc?.operatingCityNameAr || r.operatingCityNameAr || null,
      };
    },
    [accountLookup],
  );

  const getRowRiderName = useCallback(
    (r: HungerOperationItem) => {
      if (r.allocations && r.allocations.length > 0) {
        const names = r.allocations
          .map(
            (al) =>
              riderLookup.get(al.riderProfileId?.toLowerCase())?.fullNameAr,
          )
          .filter(Boolean);
        if (names.length > 0) {
          return Array.from(new Set(names)).join("، ");
        }
      }
      const acc =
        accountLookup.get(r.accountId?.toLowerCase()) ||
        accountLookup.get(r.externalAccountId?.toLowerCase());
      return (
        r.assignedRiderNameAr ||
        r.assignedRiderNameEn ||
        acc?.assignedRiderNameAr ||
        acc?.assignedRiderNameEn ||
        null
      );
    },
    [riderLookup, accountLookup],
  );

  const accountColOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<
      string,
      { label: string; sublabel?: string; count: number }
    >();
    for (const r of opsRows) {
      const accInfo = getRowAccountInfo(r);
      const key = accInfo.number || r.externalAccountId || r.accountId || "";
      if (!key) continue;
      const ex = map.get(key);
      if (ex) ex.count++;
      else {
        map.set(key, {
          label: accInfo.number,
          sublabel: accInfo.owner ? `المالك: ${accInfo.owner}` : undefined,
          count: 1,
        });
      }
    }
    return Array.from(map.entries()).map(([value, item]) => ({
      value,
      ...item,
    }));
  }, [opsRows, getRowAccountInfo]);

  const riderColOptions = useMemo<FilterOption[]>(() => {
    const map = new Map<string, number>();
    let unassigned = 0;
    for (const r of opsRows) {
      const name = getRowRiderName(r);
      if (!name) {
        unassigned++;
        continue;
      }
      map.set(name, (map.get(name) || 0) + 1);
    }
    const opts: FilterOption[] = [];
    if (unassigned > 0) {
      opts.push({ value: "UNASSIGNED", label: "غير معين", count: unassigned });
    }
    for (const [name, cnt] of map.entries()) {
      opts.push({ value: name, label: name, count: cnt });
    }
    return opts;
  }, [opsRows, getRowRiderName]);

  const manualColOptions = useMemo<FilterOption[]>(() => {
    let manualCount = 0;
    let sourceMatchCount = 0;
    for (const r of opsRows) {
      if (r.manualOrders !== undefined && r.manualOrders !== null) {
        manualCount++;
      } else {
        sourceMatchCount++;
      }
    }
    return [
      {
        value: "HAS_MANUAL",
        label: "يوجد مقارنة يدوية مسجلة",
        count: manualCount,
      },
      {
        value: "MATCH_SOURCE",
        label: "مطابق للمصدر",
        count: sourceMatchCount,
      },
    ];
  }, [opsRows]);

  const alertColOptions = useMemo<FilterOption[]>(() => {
    let critical = 0;
    let followUp = 0;
    let missing = 0;
    let regular = 0;
    for (const r of opsRows) {
      if (r.alerts?.includes("HoursCritical")) {
        critical++;
      } else if (r.alerts?.includes("HoursFollowUp")) {
        followUp++;
      } else if (
        r.alerts?.includes("MissingHoursCoverage") ||
        r.actualWorkingHours === null
      ) {
        missing++;
      } else {
        regular++;
      }
    }
    return [
      { value: "CRITICAL", label: "ساعات حرجة (<8)", count: critical },
      { value: "FOLLOWUP", label: "متابعة (<10)", count: followUp },
      {
        value: "MISSING",
        label: "ساعات غير مسجلة (Missing)",
        count: missing,
      },
      { value: "REGULAR", label: "منتظم", count: regular },
    ];
  }, [opsRows]);

  const filteredOpsRows = useMemo(() => {
    return opsRows.filter((r) => {
      if (colFilterAccount.length > 0) {
        const accInfo = getRowAccountInfo(r);
        const key = accInfo.number || r.externalAccountId || r.accountId || "";
        if (!colFilterAccount.includes(key)) return false;
      }
      if (colFilterRider.length > 0) {
        const name = getRowRiderName(r);
        const match = colFilterRider.some((v) =>
          v === "UNASSIGNED" ? !name : v === name,
        );
        if (!match) return false;
      }
      if (colFilterManual.length > 0) {
        const hasM = r.manualOrders !== undefined && r.manualOrders !== null;
        const match = colFilterManual.some((v) =>
          v === "HAS_MANUAL" ? hasM : !hasM,
        );
        if (!match) return false;
      }
      if (colFilterAlert.length > 0) {
        const isCrit = Boolean(r.alerts?.includes("HoursCritical"));
        const isFollow = Boolean(r.alerts?.includes("HoursFollowUp"));
        const isMissing = Boolean(
          r.alerts?.includes("MissingHoursCoverage") ||
            r.actualWorkingHours === null,
        );
        const isReg =
          !isCrit &&
          !isFollow &&
          !isMissing &&
          (!r.alerts || r.alerts.length === 0);
        const match = colFilterAlert.some((v) => {
          if (v === "CRITICAL") return isCrit;
          if (v === "FOLLOWUP") return isFollow;
          if (v === "MISSING") return isMissing;
          if (v === "REGULAR") return isReg;
          return false;
        });
        if (!match) return false;
      }
      return true;
    });
  }, [
    opsRows,
    colFilterAccount,
    colFilterRider,
    colFilterManual,
    colFilterAlert,
    getRowAccountInfo,
    getRowRiderName,
  ]);

  // Current page count for critical hours (< 8 h)
  const criticalHoursCount = useMemo(() => {
    return opsRows.filter((r) => r.alerts?.includes("HoursCritical")).length;
  }, [opsRows]);

  // Handlers: Operations Import
  const handlePreviewOperationsImport = async () => {
    if (!importFile) {
      toast.warning("يرجى اختيار ملف الإكسل للتشغيل اليومي");
      return;
    }
    setImportBusy(true);
    try {
      const preview = await previewHungerOperationsImport(
        importFile,
        importReportDate,
      );
      setImportPreview(preview);
      toast.success("تم تحليل ملف التشغيل اليومي بنجاح");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "تعذر معاينة ملف التشغيل اليومي",
      );
    } finally {
      setImportBusy(false);
    }
  };

  const handleConfirmOperationsImport = async () => {
    if (!importPreview?.previewId) return;
    if (
      (importPreview.invalidRows && importPreview.invalidRows > 0) ||
      importPreview.canConfirm === false
    ) {
      toast.warning(
        "استيراد التشغيل اليومي كلي (All-or-Nothing): يرجى تصحيح الصفوف غير الصالحة قبل الاعتماد",
      );
      return;
    }
    setImportBusy(true);
    try {
      await confirmHungerOperationsImport(importPreview.previewId);
      setImportModalOpen(false);
      setImportFile(null);
      setImportPreview(null);
      await loadOperations();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "تعذر تأكيد استيراد التشغيل اليومي",
      );
    } finally {
      setImportBusy(false);
    }
  };

  // Handlers: Manual Comparison
  const openManualModal = (row: HungerOperationItem) => {
    setManualRow(row);
    setManualOrders(
      row.manualOrders !== undefined && row.manualOrders !== null
        ? String(row.manualOrders)
        : String(row.completedOrders ?? row.orders ?? 0),
    );
    setManualHours(
      row.manualHours !== undefined && row.manualHours !== null
        ? String(row.manualHours)
        : row.actualWorkingHours !== null && row.actualWorkingHours !== undefined
          ? String(row.actualWorkingHours)
          : row.hours !== null && row.hours !== undefined
            ? String(row.hours)
            : "",
    );
    setManualReason(row.manualComparisonReason || "");
    setManualModalOpen(true);
  };

  const handleSaveManualComparison = async () => {
    if (!manualRow) return;
    if (!manualReason.trim()) {
      toast.warning("يرجى إدخال سبب المقارنة اليدوية");
      return;
    }
    const sourceId = manualRow.sourceId || manualRow.id || "";
    setManualBusy(true);
    try {
      await updateHungerManualOperationsComparison(sourceId, {
        orders: manualOrders.trim() !== "" ? Number(manualOrders) : null,
        hours: manualHours.trim() !== "" ? Number(manualHours) : null,
        reason: manualReason.trim(),
        rowVersion: manualRow.rowVersion || "",
      });
      setManualModalOpen(false);
      await loadOperations();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "تعذر حفظ المقارنة اليدوية",
      );
    } finally {
      setManualBusy(false);
    }
  };

  // Handlers: Create Alert Rule
  const handleCreateRule = async () => {
    if (!ruleCode.trim()) {
      toast.warning("يرجى تحديد رمز القاعدة");
      return;
    }
    if (!ruleEvidence.trim()) {
      toast.warning("يرجى إدخال مرجع القرار أو التعميم لقاعدة التنبيه");
      return;
    }
    setRuleBusy(true);
    try {
      let resolvedPlatformId = platformId;
      if (!resolvedPlatformId) {
        const p = await getHungerPlatform();
        resolvedPlatformId = p?.id || "";
      }
      await createHungerAlertRule({
        platformId: resolvedPlatformId,
        code: ruleCode.trim(),
        metric: ruleMetric,
        operator: ruleOperator,
        threshold: Number(ruleThreshold) || 0,
        kind: ruleKind,
        period: rulePeriod,
        severity: ruleSeverity,
        operatingCityId: ruleCityId || null,
        effectiveFrom: ruleEffectiveFrom,
        effectiveThrough: ruleEffectiveThrough || null,
        enabled: ruleEnabled,
        evidenceReference: ruleEvidence.trim(),
      });
      setRuleModalOpen(false);
      setRuleEvidence("");
      setRuleEffectiveThrough("");
      await loadAlertRules();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "تعذر حفظ قاعدة التنبيه المؤرخة",
      );
    } finally {
      setRuleBusy(false);
    }
  };

  if (!canRead) {
    return (
      <div
        className="flex h-96 flex-col items-center justify-center gap-3 text-center"
        dir={isEn ? "ltr" : "rtl"}
      >
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          {t("common.error") || "غير مصرح"}
        </h2>
        <p className="max-w-md text-sm text-slate-500">
          ليس لديك الصلاحية الكافية لعرض التشغيل اليومي والملخص الشهري لمنصة
          هنقرستيشن.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isEn ? "ltr" : "rtl"}>
      {/* Breadcrumb & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <Link href="/admin" className="hover:text-[var(--foreground)]">
              {t("nav.dashboard") || "لوحة التحكم"}
            </Link>
            <span>/</span>
            <span className="font-semibold text-[var(--foreground)]">
              {t("nav.hunger") || "إدارة هنقرستيشن"}
            </span>
            <span>/</span>
            <span>التشغيل اليومي والأداء والتنبيهات</span>
          </div>
          <div className="mt-1 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)]">
                التشغيل اليومي والأداء والغرامات والتنبيهات
              </h1>
              <p className="text-xs text-[var(--muted)]">
                متابعة الطلبات وساعات العمل اليومية، تقرير الأداء المتقدم،
                الغرامات المحتملة، الملخص الشهري، وكتالوج التارجت والتنبيهات.
              </p>
            </div>
          </div>
        </div>

        {/* Internal Section Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("operations")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === "operations"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-[var(--muted)] hover:bg-[var(--subtle-bg)] hover:text-[var(--foreground)]"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>التشغيل اليومي</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("performance")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === "performance"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-[var(--muted)] hover:bg-[var(--subtle-bg)] hover:text-[var(--foreground)]"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>الأداء</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("fines")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === "fines"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-[var(--muted)] hover:bg-[var(--subtle-bg)] hover:text-[var(--foreground)]"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>غرامات محتملة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("summary")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === "summary"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-[var(--muted)] hover:bg-[var(--subtle-bg)] hover:text-[var(--foreground)]"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>الملخص الشهري</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("alerts")}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === "alerts"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-[var(--muted)] hover:bg-[var(--subtle-bg)] hover:text-[var(--foreground)]"
            }`}
          >
            <BellRing className="h-3.5 w-3.5" />
            <span>قواعد التنبيهات والكتالوج</span>
          </button>

          {canDeleteOps && (
            <button
              type="button"
              onClick={() => {
                setDeleteReportDate(throughDate || getRiyadhTodayIso());
                setDeleteModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 px-3.5 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
              title="حذف تشغيل يوم محدد لتصحيح التكليفات"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>حذف تشغيل يوم</span>
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          TAB: Performance Report (Section 1)
         ===================================================================== */}
      {activeTab === "performance" && (
        <PerformanceReportTab
          canReadPerformance={canReadPerformance}
          canExportPerformance={canExportOps}
          canDeletePerformance={canDeleteOps}
          onOpenDeleteModal={(dateStr) => {
            setDeleteReportDate(dateStr || throughDate || getRiyadhTodayIso());
            setDeleteModalOpen(true);
          }}
          accountOptions={accountOptions.filter((a) => Boolean(a.value))}
          riderOptions={riderOptions.filter((r) => Boolean(r.value))}
          employeeOptions={employeeSelectOptions}
          cityOptions={citySelectOptions}
          sponsorOptions={sponsorSelectOptions}
        />
      )}

      {/* =====================================================================
          TAB: Potential Fines (Section 3)
         ===================================================================== */}
      {activeTab === "fines" && (
        <PotentialFinesTab
          platformId={platformId}
          canRead={canRead}
          canManageFinance={canManageFinance || canImportOps}
        />
      )}

      {/* =====================================================================
          TAB 1: Daily Operations & Manual Comparison (Section 4)
         ===================================================================== */}
      {activeTab === "operations" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <span className="text-xs text-[var(--muted)]">
                عدد سجلات التشغيل
              </span>
              <p className="mt-1.5 text-2xl font-bold text-[var(--foreground)]">
                {opsReport?.totalRecords ?? opsRows.length}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <span className="text-xs text-emerald-700 dark:text-emerald-300">
                إجمالي الطلبات المنفذة
              </span>
              <p className="mt-1.5 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {opsReport?.completedOrders ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-blue-200/70 bg-blue-50/50 p-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
              <span className="text-xs text-blue-700 dark:text-blue-300">
                إجمالي ساعات العمل
              </span>
              <p className="mt-1.5 text-2xl font-bold text-blue-700 dark:text-blue-300">
                {Number((opsReport?.workingHours ?? 0).toFixed(1))} س
              </p>
            </div>
            <div className="rounded-2xl border border-rose-200/70 bg-rose-50/50 p-4 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20">
              <span className="text-xs text-rose-700 dark:text-rose-300">
                تنبيهات الساعات الحرجة (&lt; 8 س)
              </span>
              <p className="mt-1.5 text-2xl font-bold text-rose-700 dark:text-rose-300">
                {criticalHoursCount}
              </p>
            </div>
          </div>

          {/* Filter & Action Toolbar */}
          <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <DateInput
                label="من تاريخ (حتى سنة كاملة)"
                value={fromDate}
                onChange={setFromDate}
              />
              <DateInput
                label="إلى تاريخ"
                value={throughDate}
                onChange={setThroughDate}
              />
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                  تصفية بالحساب
                </label>
                <SearchableSelect
                  options={accountOptions}
                  value={selectedAccountId}
                  onChange={setSelectedAccountId}
                  placeholder="جميع الحسابات..."
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                  تصفية بالمندوب
                </label>
                <SearchableSelect
                  options={riderOptions}
                  value={selectedRiderId}
                  onChange={setSelectedRiderId}
                  placeholder="جميع المناديب..."
                />
              </div>
              <Input
                label="تصنيف الكابتن (Captain Classification)"
                value={captainClassificationFilter}
                onChange={(e) => setCaptainClassificationFilter(e.target.value)}
                placeholder="مثال: Gold / Silver..."
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void loadOperations()}
                disabled={opsLoading}
              >
                <RefreshCw
                  className={`ml-1.5 h-3.5 w-3.5 ${opsLoading ? "animate-spin" : ""}`}
                />
                تطبيق البحث والتحديث
              </Button>

              <div className="flex flex-wrap items-center gap-2">
                {canImportOps && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void downloadHungerOperationsTemplate()}
                  >
                    <Download className="ml-1.5 h-3.5 w-3.5" />
                    تحميل قالب التشغيل اليومي
                  </Button>
                )}

                {canExportOps && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      void exportHungerOperationsReport({
                        from: fromDate,
                        through: throughDate,
                        accountId: selectedAccountId || undefined,
                        riderId: selectedRiderId || undefined,
                        captainClassification:
                          captainClassificationFilter.trim() || undefined,
                        accountFilters: opsAccountFilters,
                      })
                    }
                  >
                    <FileSpreadsheet className="ml-1.5 h-3.5 w-3.5 text-emerald-600" />
                    تصدير التقرير
                  </Button>
                )}

                {canImportOps && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setImportFile(null);
                      setImportPreview(null);
                      setImportModalOpen(true);
                    }}
                  >
                    <Upload className="ml-1.5 h-3.5 w-3.5" />
                    استيراد التشغيل اليومي
                  </Button>
                )}

                {canDeleteOps && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setDeleteReportDate(throughDate || getRiyadhTodayIso());
                      setDeleteModalOpen(true);
                    }}
                    className="gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900/50"
                    title="حذف تشغيل يوم محدد لتصحيح التكليفات"
                  >
                    <Trash2 className="ml-1.5 h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    حذف تشغيل يوم
                  </Button>
                )}
              </div>
            </div>
          </div>

          <AccountsFilterPanel
            filters={opsAccountFilters}
            onChange={setOpsAccountFilters}
            onReset={() => setOpsAccountFilters({})}
            employeeOptions={employeeSelectOptions}
            riderOptions={riderOptions.filter((r) => Boolean(r.value))}
            cityOptions={citySelectOptions}
            sponsorOptions={sponsorSelectOptions}
            hideDateRange
            labelPrefix="فلاتر الحسابات المتقدمة (للتصدير): "
          />

          {/* Operations Table */}
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b-2 border-slate-200 bg-slate-100/95 text-[11px] font-black text-slate-900 dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-100">
                  <tr>
                    <th className="px-4 py-3.5 whitespace-nowrap">التاريخ</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center justify-start gap-1.5">
                        <span>رقم الحساب والاسم</span>
                        <TableHeaderColumnFilter
                          label="رقم الحساب والاسم"
                          value={colFilterAccount}
                          onChange={setColFilterAccount}
                          options={accountColOptions}
                          placeholder="بحث برقم الحساب أو المالك..."
                          align="right"
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center justify-start gap-1.5">
                        <span>المندوب المكلف</span>
                        <TableHeaderColumnFilter
                          label="المندوب المكلف"
                          value={colFilterRider}
                          onChange={setColFilterRider}
                          options={riderColOptions}
                          placeholder="بحث بالمندوب..."
                          align="right"
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3.5 whitespace-nowrap">
                      الطلبات (المصدر)
                    </th>
                    <th className="px-4 py-3.5 whitespace-nowrap">
                      مقبولة / مكدسة
                    </th>
                    <th className="px-4 py-3.5 whitespace-nowrap">
                      الساعات (المصدر)
                    </th>
                    <th className="px-4 py-3.5 whitespace-nowrap">
                      تصنيف الكابتن
                    </th>
                    <th className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center justify-start gap-1.5">
                        <span>المقارنة اليدوية</span>
                        <TableHeaderColumnFilter
                          label="المقارنة اليدوية"
                          value={colFilterManual}
                          onChange={setColFilterManual}
                          options={manualColOptions}
                          placeholder="تصفية بالمقارنة اليدوية..."
                          align="right"
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center justify-start gap-1.5">
                        <span>التنبيهات والمتابعة</span>
                        <TableHeaderColumnFilter
                          label="التنبيهات والمتابعة"
                          value={colFilterAlert}
                          onChange={setColFilterAlert}
                          options={alertColOptions}
                          placeholder="تصفية بالتنبيهات..."
                          align="right"
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3.5 text-right whitespace-nowrap">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {opsLoading ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-12 text-center text-sm text-[var(--muted)]"
                      >
                        جارٍ تحميل بيانات التشغيل اليومي...
                      </td>
                    </tr>
                  ) : filteredOpsRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-12 text-center text-sm text-[var(--muted)]"
                      >
                        لا توجد سجلات تشغيل يومي في الفترة المحددة.
                      </td>
                    </tr>
                  ) : (
                    filteredOpsRows.map((row, idx) => {
                      const hasManual =
                        row.manualOrders !== undefined &&
                        row.manualOrders !== null;
                      const accInfo = getRowAccountInfo(row);
                      const riderName = getRowRiderName(row);
                      const isCriticalHours =
                        row.alerts?.includes("HoursCritical");
                      const isFollowUpHours =
                        row.alerts?.includes("HoursFollowUp");
                      const isMissingHours =
                        row.actualWorkingHours === null ||
                        row.actualWorkingHours === undefined ||
                        row.alerts?.includes("MissingHoursCoverage");

                      return (
                        <tr
                          key={row.id || row.sourceId || idx}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-4 py-3.5 font-medium">
                            <div className="flex items-center gap-1.5">
                              <span>{row.reportDate?.slice(0, 10) || "—"}</span>
                              {canDeleteOps && row.reportDate && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteReportDate(
                                      row.reportDate.slice(0, 10),
                                    );
                                    setDeleteModalOpen(true);
                                  }}
                                  className="text-[var(--muted)] hover:text-red-600 transition-colors opacity-60 hover:opacity-100"
                                  title={`حذف تشغيل يوم ${row.reportDate.slice(0, 10)}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-[var(--foreground)]">
                              {accInfo.number}
                            </div>
                            {accInfo.owner && (
                              <div className="text-[11px] text-[var(--muted)]">
                                المالك: {accInfo.owner}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div
                              className={`font-semibold ${
                                riderName
                                  ? "text-blue-700 dark:text-blue-400"
                                  : "text-slate-400"
                              }`}
                            >
                              {riderName || "غير معين"}
                            </div>
                            {accInfo.city && (
                              <div className="text-[11px] text-slate-400">
                                {accInfo.city}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-bold">
                            {row.completedOrders ?? row.orders ?? 0}
                          </td>
                          <td className="px-4 py-3.5 text-[11px]">
                            <div>
                              مقبولة:{" "}
                              <span className="font-semibold">
                                {row.acceptedOrders ?? "—"}
                              </span>
                            </div>
                            <div className="text-[var(--muted)]">
                              مكدسة:{" "}
                              <span className="font-semibold">
                                {row.stackedOrders ?? "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            {isMissingHours ? (
                              <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                ساعات غير مسجلة (Missing)
                              </span>
                            ) : (
                              <span
                                className={`font-bold ${
                                  isCriticalHours
                                    ? "text-rose-600"
                                    : isFollowUpHours
                                      ? "text-amber-600"
                                      : "text-emerald-600"
                                }`}
                              >
                                {row.actualWorkingHours ?? row.hours ?? 0} س
                              </span>
                            )}
                            {row.hoursUnit && !isMissingHours && (
                              <div className="text-[10px] text-[var(--muted)]">
                                ({row.hoursUnit === "Minutes"
                                  ? "محولة من دقائق"
                                  : "ساعات"})
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {row.captainClassification ? (
                              <Badge tone="blue">
                                {row.captainClassification}
                              </Badge>
                            ) : (
                              <span className="text-[var(--muted)]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {hasManual ? (
                              <div className="text-[11px]">
                                <span className="font-bold text-[var(--foreground)]">
                                  طلبات: {row.manualOrders} | ساعات:{" "}
                                  {row.manualHours ?? "—"}
                                </span>
                                {row.ordersDifference !== null &&
                                  row.ordersDifference !== undefined && (
                                    <span className="mr-1 text-[10px] text-amber-600 dark:text-amber-400">
                                      (فرق: {row.ordersDifference})
                                    </span>
                                  )}
                                {row.manualComparisonReason && (
                                  <p className="text-[var(--muted)]">
                                    {row.manualComparisonReason}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">
                                مطابق للمصدر
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {isCriticalHours && (
                                <Badge tone="red">ساعات حرجة (&lt;8)</Badge>
                              )}
                              {isFollowUpHours && (
                                <Badge tone="orange">متابعة (&lt;10)</Badge>
                              )}
                              {row.alerts?.includes(
                                "MissingHoursCoverage",
                              ) && (
                                <Badge tone="orange">ساعات غير مغطاة</Badge>
                              )}
                              {row.alerts?.includes("NoShowPositive") && (
                                <Badge tone="red">
                                  غياب شفتات{" "}
                                  {row.noShowCount
                                    ? `(${row.noShowCount})`
                                    : ""}
                                </Badge>
                              )}
                              {row.alerts
                                ?.filter(
                                  (a) =>
                                    ![
                                      "HoursCritical",
                                      "HoursFollowUp",
                                      "MissingHoursCoverage",
                                      "NoShowPositive",
                                    ].includes(a),
                                )
                                .map((al, i) => (
                                  <Badge key={i} tone="purple">
                                    {al}
                                  </Badge>
                                ))}
                              {(!row.alerts || row.alerts.length === 0) && (
                                <Badge tone="green">منتظم</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {canImportOps && (
                                <button
                                  type="button"
                                  onClick={() => openManualModal(row)}
                                  className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 dark:text-amber-300 transition-colors shadow-xs"
                                  title="تسجيل مقارنة يدوية للطلبات والساعات"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                              )}
                              {canDeleteOps && row.reportDate && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteReportDate(
                                      row.reportDate.slice(0, 10),
                                    );
                                    setDeleteModalOpen(true);
                                  }}
                                  className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/60 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 transition-colors shadow-xs"
                                  title={`حذف تشغيل يوم ${row.reportDate.slice(0, 10)}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: Monthly Summary (Inventory, Assignments, Dispositions, People)
         ===================================================================== */}
      {activeTab === "summary" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-[var(--foreground)]">
                شهر التقرير:
              </label>
              <input
                type="month"
                value={summaryMonth}
                onChange={(e) => setSummaryMonth(e.target.value)}
                className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] px-3 py-2 text-xs font-semibold"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadSummary()}
              disabled={summaryLoading}
            >
              <RefreshCw
                className={`ml-1.5 h-3.5 w-3.5 ${summaryLoading ? "animate-spin" : ""}`}
              />
              تحديث الملخص الشهري
            </Button>
          </div>

          {summaryLoading ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-12 text-center text-sm text-[var(--muted)]">
              جارٍ تحميل الملخص الشهري...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                  <Server className="h-4 w-4 text-amber-500" />
                  <span>1. بُعد مخزون الحسابات (Inventory)</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-[var(--subtle-bg)] p-3">
                    <span className="text-[var(--muted)]">إجمالي الحسابات</span>
                    <p className="mt-1 text-xl font-bold">
                      {summaryData?.inventory?.totalAccounts ?? accounts.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/70 p-3 dark:bg-emerald-950/20">
                    <span className="text-emerald-700 dark:text-emerald-300">
                      الحسابات النشطة
                    </span>
                    <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-300">
                      {summaryData?.inventory?.activeAccounts ??
                        accounts.filter(
                          (a) =>
                            (a.disposition || "Normal").toLowerCase() ===
                            "normal",
                        ).length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50/70 p-3 dark:bg-amber-950/20">
                    <span className="text-amber-700 dark:text-amber-300">
                      الموقوفة مؤقتًا / إداريًا
                    </span>
                    <p className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-300">
                      {summaryData?.inventory?.suspendedAccounts ??
                        accounts.filter(
                          (a) =>
                            (a.disposition || "").toLowerCase() ===
                            "administrativestop",
                        ).length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-rose-50/70 p-3 dark:bg-rose-950/20">
                    <span className="text-rose-700 dark:text-rose-300">
                      المحظورة (Blocked)
                    </span>
                    <p className="mt-1 text-xl font-bold text-rose-700 dark:text-rose-300">
                      {summaryData?.inventory?.blockedAccounts ??
                        accounts.filter(
                          (a) =>
                            (a.disposition || "").toLowerCase() === "blocked",
                        ).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  <span>2. بُعد التكليف ونظام المحاسبة (Assignments)</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-blue-50/70 p-3 dark:bg-blue-950/20">
                    <span className="text-blue-700 dark:text-blue-300">
                      مكلفة لمناديب
                    </span>
                    <p className="mt-1 text-xl font-bold text-blue-700 dark:text-blue-300">
                      {summaryData?.assignments?.assignedAccounts ??
                        accounts.filter((a) => Boolean(a.assignedRiderProfileId))
                          .length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--subtle-bg)] p-3">
                    <span className="text-[var(--muted)]">
                      شاغرة (غير مكلفة)
                    </span>
                    <p className="mt-1 text-xl font-bold">
                      {summaryData?.assignments?.unassignedAccounts ??
                        accounts.filter((a) => !a.assignedRiderProfileId).length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--subtle-bg)] p-3">
                    <span className="text-[var(--muted)]">
                      نظام عمولة (Commission)
                    </span>
                    <p className="mt-1 text-xl font-bold">
                      {summaryData?.assignments?.commissionCount ??
                        accounts.filter(
                          (a) =>
                            (a.compensationModel || "").toLowerCase() ===
                            "commission",
                        ).length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--subtle-bg)] p-3">
                    <span className="text-[var(--muted)]">
                      نظام تارجت (Target)
                    </span>
                    <p className="mt-1 text-xl font-bold">
                      {summaryData?.assignments?.targetCount ??
                        accounts.filter(
                          (a) =>
                            (a.compensationModel || "").toLowerCase() ===
                            "target",
                        ).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>3. بُعد الحالات التشغيلية (Dispositions)</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2.5 text-xs">
                  <div className="rounded-xl bg-emerald-50/70 p-3 dark:bg-emerald-950/20">
                    <span className="text-emerald-700">طبيعي (Normal)</span>
                    <p className="mt-1 text-lg font-bold">
                      {summaryData?.dispositions?.normalCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50/70 p-3 dark:bg-amber-950/20">
                    <span className="text-amber-700">مشكلة (Problem)</span>
                    <p className="mt-1 text-lg font-bold">
                      {summaryData?.dispositions?.problemCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-blue-50/70 p-3 dark:bg-blue-950/20">
                    <span className="text-blue-700">إيقاف إداري</span>
                    <p className="mt-1 text-lg font-bold">
                      {summaryData?.dispositions?.administrativeStopCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-rose-50/70 p-3 dark:bg-rose-950/20">
                    <span className="text-rose-700">محظور (Blocked)</span>
                    <p className="mt-1 text-lg font-bold">
                      {summaryData?.dispositions?.blockedCount ?? 0}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-xl bg-[var(--subtle-bg)] p-3">
                    <span className="text-[var(--muted)]">
                      مؤجل للشهر القادم (DeferredNextMonth)
                    </span>
                    <p className="mt-1 text-lg font-bold">
                      {summaryData?.dispositions?.deferredNextMonthCount ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                  <Users className="h-4 w-4 text-purple-500" />
                  <span>
                    4. بُعد الأشخاص المستقل (المالك / مستخدم المصدر / المكلف)
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-[var(--subtle-bg)] p-3">
                    <span className="text-[var(--muted)]">
                      أصحاب الحسابات (الملاك)
                    </span>
                    <p className="mt-1 text-xl font-bold">
                      {summaryData?.people?.distinctOwnersCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--subtle-bg)] p-3">
                    <span className="text-[var(--muted)]">
                      المستخدمون الواردون بالمصدر
                    </span>
                    <p className="mt-1 text-xl font-bold">
                      {summaryData?.people?.distinctSourceUsersCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--subtle-bg)] p-3">
                    <span className="text-[var(--muted)]">
                      المناديب المكلفون فعليًا
                    </span>
                    <p className="mt-1 text-xl font-bold">
                      {summaryData?.people?.distinctAssignedRidersCount ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-purple-50/70 p-3 dark:bg-purple-950/20">
                    <span className="text-purple-700 dark:text-purple-300">
                      حسابات مشتركة خلال الشهر
                    </span>
                    <p className="mt-1 text-xl font-bold text-purple-700 dark:text-purple-300">
                      {summaryData?.people?.sharedAccountsCount ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: Versioned Alert Rules & Target Catalog (Section 2)
         ===================================================================== */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">
                كتالوج قواعد التنبيهات والتارجت والأيام الإلزامية المؤرخة
              </h3>
              <p className="text-xs text-[var(--muted)]">
                يدعم الكتالوج المقاييس المتعددة (الساعات، الطلبات، التقييم، الخ)،
                الفترة الزمنية، وتخصيص المدن.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void loadAlertRules()}
                disabled={alertsLoading}
              >
                <RefreshCw
                  className={`ml-1.5 h-3.5 w-3.5 ${alertsLoading ? "animate-spin" : ""}`}
                />
                تحديث
              </Button>
              {canManageAlerts && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setRuleModalOpen(true)}
                >
                  <Plus className="ml-1.5 h-3.5 w-3.5" />
                  إضافة إصدار قاعدة بالكتالوج
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200">
            <strong>ملاحظة استثناءات المدن:</strong> عند إنشاء إصدار قاعدة مخصص
            لمدينة محددة مع ضبط حالته على <strong>معطلة (Disabled)</strong>، يتم
            إيقاف تطبيق تلك القاعدة على تلك المدينة تحديدًا (استثناء معتمد) مع
            استمرار سريان القاعدة العامة على باقي المدن.
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b-2 border-slate-200 bg-slate-100/95 text-[11px] font-black text-slate-900 dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-100">
                  <tr>
                    <th className="px-4 py-3.5 whitespace-nowrap">رمز القاعدة</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">التصنيف (Kind)</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">المقياس والشرط</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">الفترة</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">النطاق الجغرافي</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">الأهمية</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">فترة السريان</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">الحالة والإصدار</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">مرجع القرار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {alertsLoading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-10 text-center text-[var(--muted)]"
                      >
                        جارٍ تحميل كتالوج قواعد التنبيهات والتارجت...
                      </td>
                    </tr>
                  ) : alertRules.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-10 text-center text-[var(--muted)]"
                      >
                        تعمل المنصة حاليًا بالقواعد الافتراضية (الساعات الحرجة &lt;
                        8، المتابعة &lt; 10، عدم الحضور &gt; 0).
                      </td>
                    </tr>
                  ) : (
                    alertRules.map((rule, idx) => {
                      const codeMeta = HUNGER_ALERT_RULE_CODES.find(
                        (c) => c.value === rule.code,
                      );
                      const sevMeta = HUNGER_ALERT_SEVERITIES.find(
                        (s) => s.value === rule.severity,
                      );
                      const metricMeta = HUNGER_ALERT_METRICS.find(
                        (m) => m.value === rule.metric,
                      );
                      const opMeta = HUNGER_ALERT_OPERATORS.find(
                        (o) => o.value === rule.operator,
                      );
                      const kindMeta = HUNGER_ALERT_KINDS.find(
                        (k) => k.value === rule.kind,
                      );
                      const periodMeta = HUNGER_ALERT_PERIODS.find(
                        (p) => p.value === rule.period,
                      );
                      return (
                        <tr key={rule.ruleId || rule.id || idx}>
                          <td className="px-4 py-3.5 font-bold">
                            <div>{codeMeta ? codeMeta.labelAr : rule.code}</div>
                            <div className="font-mono text-[10px] text-[var(--muted)]">
                              {rule.code}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge
                              tone={
                                rule.kind === "Target"
                                  ? "blue"
                                  : rule.kind === "MandatoryDay"
                                    ? "purple"
                                    : "orange"
                              }
                            >
                              {kindMeta ? kindMeta.labelAr : rule.kind || "تنبيه"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 font-semibold">
                            <span>
                              {metricMeta
                                ? metricMeta.labelAr
                                : rule.metric || "ساعات العمل"}
                            </span>{" "}
                            <span className="font-mono text-amber-600 dark:text-amber-400">
                              {opMeta ? opMeta.symbol : rule.operator || "<"}{" "}
                              {rule.threshold}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {periodMeta
                              ? periodMeta.labelAr
                              : rule.period || "يومي"}
                          </td>
                          <td className="px-4 py-3.5">
                            {rule.operatingCityNameAr ? (
                              <Badge tone="blue">{rule.operatingCityNameAr}</Badge>
                            ) : (
                              <span className="text-[var(--muted)]">
                                جميع المدن
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge tone={sevMeta?.badgeTone || "orange"}>
                              {sevMeta ? sevMeta.labelAr : rule.severity}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-[11px]">
                            <div>
                              من: {rule.effectiveFrom?.slice(0, 10) || "—"}
                            </div>
                            <div className="text-[var(--muted)]">
                              إلى:{" "}
                              {rule.effectiveThrough
                                ? rule.effectiveThrough.slice(0, 10)
                                : "مفتوح"}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap items-center gap-1">
                              <Badge tone={rule.enabled ? "green" : "gray"}>
                                {rule.enabled ? "مفعلة" : "معطلة (استثناء)"}
                              </Badge>
                              {rule.isCurrentlyEffective && (
                                <Badge tone="blue">سارية حاليًا</Badge>
                              )}
                              {rule.versionNumber !== undefined &&
                                rule.versionNumber !== null && (
                                  <span className="font-mono text-[10px] text-[var(--muted)]">
                                    v{rule.versionNumber}
                                  </span>
                                )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-[var(--muted)]">
                            {rule.evidenceReference || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL A: Import Daily Operations (Section 4)
         ===================================================================== */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="استيراد ملف التشغيل اليومي لهنقرستيشن"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            يتم استيراد ملف التشغيل اليومي بنظام{" "}
            <strong>القبول الكامل (All-or-Nothing)</strong>؛ في حال وجود صف غير
            صالح يلزم تصحيحه قبل الاعتماد.
          </div>

          <DateInput
            label="تاريخ تقرير التشغيل اليومي *"
            value={importReportDate}
            onChange={setImportReportDate}
          />

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
              ملف التشغيل اليومي (Excel) *
            </label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                setImportFile(e.target.files?.[0] ?? null);
                setImportPreview(null);
              }}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-2 text-xs"
            />
          </div>

          {importPreview && (
            <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
                <span>إجمالي الصفوف: {importPreview.totalRows ?? importPreview.rows?.length ?? 0}</span>
                <span className="text-emerald-600">
                  صالحة: {importPreview.validRows ?? 0}
                </span>
                <span className="text-rose-600">
                  غير صالحة: {importPreview.invalidRows ?? 0}
                </span>
                <Badge tone={importPreview.canConfirm ? "green" : "red"}>
                  {importPreview.canConfirm ? "جاهز للاعتماد" : "غير قابل للاعتماد (صفوف مرفوضة)"}
                </Badge>
                {importPreview.hoursUnit && (
                  <Badge tone="blue">
                    وحدة الساعات:{" "}
                    {importPreview.hoursUnit === "Minutes"
                      ? "دقائق (Minutes)"
                      : "ساعات (Hours)"}
                  </Badge>
                )}
              </div>

              {importPreview.rows && importPreview.rows.length > 0 && (
                <div className="max-h-64 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                  <table className="w-full text-right text-[11px]">
                    <thead className="sticky top-0 bg-slate-100 font-bold dark:bg-slate-800">
                      <tr>
                        <th className="px-2.5 py-1.5">#</th>
                        <th className="px-2.5 py-1.5">معرف الحساب (accountId)</th>
                        <th className="px-2.5 py-1.5">حالة الصف</th>
                        <th className="px-2.5 py-1.5">التخصيص</th>
                        <th className="px-2.5 py-1.5">الطلبات / الساعات</th>
                        <th className="px-2.5 py-1.5">الخطأ / الملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {importPreview.rows.slice(0, 50).map((r, i) => (
                        <tr
                          key={i}
                          className={
                            r.status === "Rejected" || Boolean(r.error)
                              ? "bg-rose-50/50 dark:bg-rose-950/20"
                              : ""
                          }
                        >
                          <td className="px-2.5 py-1.5">{r.rowNumber ?? i + 1}</td>
                          <td className="px-2.5 py-1.5 font-mono font-bold" dir="ltr">
                            {r.accountId || r.externalAccountId || "—"}
                          </td>
                          <td className="px-2.5 py-1.5">
                            <Badge
                              tone={
                                r.status === "New"
                                  ? "green"
                                  : r.status === "Rejected"
                                    ? "red"
                                    : r.status === "Updated"
                                      ? "orange"
                                      : "gray"
                              }
                            >
                              {r.status === "New"
                                ? "جديد (New)"
                                : r.status === "Rejected"
                                  ? "مرفوض (Rejected)"
                                  : r.status === "Updated"
                                    ? "محدث (Updated)"
                                    : r.status || "—"}
                            </Badge>
                          </td>
                          <td className="px-2.5 py-1.5">
                            {r.allocationStatus ? (
                              <Badge
                                tone={
                                  r.allocationStatus === "Resolved"
                                    ? "blue"
                                    : r.allocationStatus === "UnresolvedAllocation"
                                      ? "orange"
                                      : "gray"
                                }
                              >
                                {r.allocationStatus === "Resolved"
                                  ? "مخصص (Resolved)"
                                  : r.allocationStatus === "UnresolvedAllocation"
                                    ? "معلق (Unresolved)"
                                    : r.allocationStatus}
                              </Badge>
                            ) : (
                              <span className="text-[var(--muted)]">—</span>
                            )}
                          </td>
                          <td className="px-2.5 py-1.5">
                            {r.dailyCounters || r.orders !== null ? (
                              <span>
                                طلبات: <strong>{r.orders ?? 0}</strong> | ساعات:{" "}
                                <strong>{r.hours ?? 0}</strong>
                              </span>
                            ) : (
                              <span className="text-[var(--muted)]">—</span>
                            )}
                          </td>
                          <td className="px-2.5 py-1.5">
                            {r.error || r.errorMessage ? (
                              <span className="font-semibold text-rose-600 dark:text-rose-400">
                                {r.error || r.errorMessage}
                              </span>
                            ) : r.adjustsNextRecord ? (
                              <span className="font-medium text-amber-600 dark:text-amber-400">
                                تعديل السجل التالي
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                سليم
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {importPreview.errors && importPreview.errors.length > 0 && (
                <ul className="list-inside list-disc text-rose-600">
                  {importPreview.errors.slice(0, 8).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setImportModalOpen(false)}
              disabled={importBusy}
            >
              إلغاء
            </Button>
            {!importPreview ? (
              <Button
                variant="primary"
                onClick={() => void handlePreviewOperationsImport()}
                disabled={!importFile || importBusy}
              >
                {importBusy ? "جارٍ الفحص..." : "معاينة الملف"}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => void handleConfirmOperationsImport()}
                disabled={
                  importBusy ||
                  importPreview.canConfirm === false ||
                  Boolean(
                    importPreview.invalidRows && importPreview.invalidRows > 0,
                  )
                }
              >
                {importBusy ? "جارٍ الاعتماد..." : "تأكيد واعتماد التشغيل"}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* =====================================================================
          MODAL B: Manual Comparison Entry
         ===================================================================== */}
      <Modal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        title={`المقارنة اليدوية — ${manualRow?.externalAccountId || manualRow?.accountName || ""}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-[var(--subtle-bg)] p-3 text-xs">
            <div>
              <span className="text-[var(--muted)]">طلبات المصدر:</span>{" "}
              <strong>{manualRow?.orders ?? 0}</strong>
            </div>
            <div>
              <span className="text-[var(--muted)]">ساعات المصدر:</span>{" "}
              <strong>{manualRow?.hours ?? 0} س</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="عدد الطلبات (يدوي)"
              type="number"
              value={manualOrders}
              onChange={(e) => setManualOrders(e.target.value)}
            />
            <Input
              label="ساعات العمل (يدوي)"
              type="number"
              step="0.1"
              value={manualHours}
              onChange={(e) => setManualHours(e.target.value)}
            />
          </div>

          <Input
            label="سبب المقارنة / التعديل اليدوي *"
            value={manualReason}
            onChange={(e) => setManualReason(e.target.value)}
            placeholder="مثال: فرق توقيت إقفال الشفت في التطبيق..."
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setManualModalOpen(false)}
              disabled={manualBusy}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleSaveManualComparison()}
              disabled={manualBusy}
            >
              {manualBusy ? "جارٍ الحفظ..." : "حفظ المقارنة اليدوية"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* =====================================================================
          MODAL C: Add Versioned Alert / Catalog Rule (Section 2)
         ===================================================================== */}
      <Modal
        isOpen={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        title="إضافة إصدار قاعدة تنبيه / تارجت مؤرخة بالكتالوج"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                قالب القاعدة السريع
              </label>
              <select
                value={
                  HUNGER_ALERT_RULE_CODES.some((c) => c.value === ruleCode)
                    ? ruleCode
                    : ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  setRuleCode(val);
                  if (val === "HoursCritical") {
                    setRuleMetric("WorkingHours");
                    setRuleOperator("LessThan");
                    setRuleThreshold("8");
                    setRuleSeverity("Critical");
                  }
                  if (val === "HoursFollowUp") {
                    setRuleMetric("WorkingHours");
                    setRuleOperator("LessThan");
                    setRuleThreshold("10");
                    setRuleSeverity("Warning");
                  }
                  if (val === "NoShowPositive") {
                    setRuleMetric("NoShowCount");
                    setRuleOperator("GreaterThan");
                    setRuleThreshold("0");
                    setRuleSeverity("Critical");
                  }
                }}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
              >
                <option value="">— اختر قالبًا أو أدخل رمزًا مخصصًا —</option>
                {HUNGER_ALERT_RULE_CODES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.labelAr}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="رمز القاعدة (Code) *"
              value={ruleCode}
              onChange={(e) => setRuleCode(e.target.value)}
              placeholder="مثال: HoursCritical أو DailyOrdersTarget"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                التصنيف (Kind) *
              </label>
              <select
                value={ruleKind}
                onChange={(e) => setRuleKind(e.target.value as HungerAlertKind)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
              >
                {HUNGER_ALERT_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.labelAr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                الفترة (Period) *
              </label>
              <select
                value={rulePeriod}
                onChange={(e) =>
                  setRulePeriod(e.target.value as HungerAlertPeriod)
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
              >
                {HUNGER_ALERT_PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.labelAr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                المقياس (Metric) *
              </label>
              <select
                value={ruleMetric}
                onChange={(e) =>
                  setRuleMetric(e.target.value as HungerAlertMetric)
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
              >
                {HUNGER_ALERT_METRICS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.labelAr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                المعامل (Operator) *
              </label>
              <select
                value={ruleOperator}
                onChange={(e) =>
                  setRuleOperator(e.target.value as HungerAlertOperator)
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
              >
                {HUNGER_ALERT_OPERATORS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.labelAr} ({o.symbol})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="الحد الرقمي (Threshold) *"
              type="number"
              step="0.5"
              value={ruleThreshold}
              onChange={(e) => setRuleThreshold(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                درجة الأهمية *
              </label>
              <select
                value={ruleSeverity}
                onChange={(e) =>
                  setRuleSeverity(e.target.value as HungerAlertSeverity)
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
              >
                {HUNGER_ALERT_SEVERITIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.labelAr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                تخصيص لمدينة محددة (اختياري)
              </label>
              <SearchableSelect
                options={[
                  { value: "", label: "جميع المدن (قاعدة عامة)" },
                  ...citySelectOptions,
                ]}
                value={ruleCityId}
                onChange={setRuleCityId}
                placeholder="جميع المدن..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DateInput
              label="ساري من تاريخ *"
              value={ruleEffectiveFrom}
              onChange={setRuleEffectiveFrom}
            />
            <DateInput
              label="ساري حتى تاريخ (اختياري)"
              value={ruleEffectiveThrough}
              onChange={setRuleEffectiveThrough}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="rule-enabled"
              type="checkbox"
              checked={ruleEnabled}
              onChange={(e) => setRuleEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-amber-500"
            />
            <label
              htmlFor="rule-enabled"
              className="text-xs font-semibold text-[var(--foreground)]"
            >
              تفعيل القاعدة (إلغاء التفعيل مع تحديد مدينة يُعد استثناءً معتمدًا لتلك المدينة)
            </label>
          </div>

          <Input
            label="مرجع الإثبات / القرار الإداري *"
            value={ruleEvidence}
            onChange={(e) => setRuleEvidence(e.target.value)}
            placeholder="مثال: تعميم إدارة العمليات رقم 14..."
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setRuleModalOpen(false)}
              disabled={ruleBusy}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleCreateRule()}
              disabled={ruleBusy}
            >
              {ruleBusy ? "جارٍ الحفظ..." : "إضافة القاعدة المؤرخة"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* =====================================================================
          MODAL D: Delete Daily Operations (Section 4)
         ===================================================================== */}
      <HungerDeletePerformanceModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        initialDate={deleteReportDate}
        existingDates={Array.from(new Set(opsRows.map((r) => r.reportDate).filter(Boolean)))}
        sponsors={sponsors}
        onSuccess={() => {
          void loadOperations();
        }}
      />
    </div>
  );
}
