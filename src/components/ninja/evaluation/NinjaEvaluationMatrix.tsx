// src/components/ninja/evaluation/NinjaEvaluationMatrix.tsx
"use client";

import { localizeDigits } from "./localizeDigits";

import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { EvaluationDialog as Modal } from "./EvaluationDialog";
import { NinjaCalculationDetails } from "./NinjaCalculationDetails";
import { NinjaEvaluationOverview } from "./NinjaEvaluationOverview";
import styles from "./evaluation.module.css";
import {
  formatSuggestedCurrency,
  formatNullableMetric,
  formatHoursAsDuration,
  formatRequiredDailyRate,
  getMonthCalendarDates,
  buildRowBreakdownSubrows,
  getHoursStatusLabel,
  getCoverageStatusLabel,
  getEligibilityStatusLabel,
  NINJA_EVALUATION_REQUIRED_LABELS,
  type NinjaEvaluationReport,
  type NinjaEvaluationRow,
  type NinjaEvaluationDay,
  type NinjaEvaluationForecast,
  type PricingType,
} from "@/lib/ninja/api";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  SlidersHorizontal,
  Bike,
  Car,
  MapPin,
  Building2,
  Layers,
  Scale,
  List,
  Table2,
} from "lucide-react";

interface NinjaEvaluationMatrixProps {
  report: NinjaEvaluationReport;
  canManageEvaluation: boolean;
  onOpenDayDetail: (
    accountId: string,
    captainId: string | null,
    date: string
  ) => void;
  onOpenManageAccount?: (
    accountId: string,
    captainId: string | null,
    tab: "context" | "responsibility"
  ) => void;
  locale: "ar" | "en";
}

export function NinjaEvaluationMatrix({
  report,
  canManageEvaluation,
  onOpenDayDetail,
  onOpenManageAccount,
  locale,
}: NinjaEvaluationMatrixProps) {
  const isEn = locale === "en";
  const [displayMode, setDisplayMode] = useState<"overview" | "matrix">("overview");
  const [expandedRowKeys, setExpandedRowKeys] = useState<Record<string, boolean>>({});
  const [selectedBreakdownRow, setSelectedBreakdownRow] =
    useState<NinjaEvaluationRow | null>(null);

  const calendarDates = useMemo(
    () => getMonthCalendarDates(report.year, report.month),
    [report.year, report.month]
  );

  const toggleExpandRow = (rowKey: string) => {
    setExpandedRowKeys((prev) => ({
      ...prev,
      [rowKey]: !prev[rowKey],
    }));
  };

  const mapTone = (variant: "emerald" | "amber" | "rose" | "slate" | "blue") => {
    switch (variant) {
      case "emerald":
        return "green" as const;
      case "amber":
        return "orange" as const;
      case "rose":
        return "red" as const;
      case "blue":
        return "blue" as const;
      default:
        return "gray" as const;
    }
  };

  // Extract distinct pricing types present on a row
  const getRowPricingTypes = (row: NinjaEvaluationRow): PricingType[] => {
    const set = new Set<PricingType>();
    for (const seg of row.suggestedMoney?.segments || []) {
      if (seg.pricingType) set.add(seg.pricingType);
    }
    for (const d of row.days || []) {
      if (d.pricingType) set.add(d.pricingType);
    }
    return Array.from(set);
  };

  // Extract active assignment date range for display
  const getRowAssignmentPeriodText = (row: NinjaEvaluationRow): string => {
    const scheduled = (row.days || [])
      .filter((d) => d.hoursStatus !== "NotScheduled")
      .sort((a, b) => a.date.localeCompare(b.date));
    if (scheduled.length === 0) {
      return isEn ? "No scheduled days" : "لا توجد أيام مجدولة";
    }
    const first = scheduled[0].date;
    const last = scheduled[scheduled.length - 1].date;
    return `${localizeDigits(first.slice(8), locale)}–${localizeDigits(last.slice(8), locale)} (${localizeDigits(scheduled.length, locale)}${
      isEn ? "d" : " يوم"
    })`;
  };

  // Aggregate daily cells for a row on a given calendar date (handles multiple accounts/assignments on same date)
  const renderDateCell = (
    row: NinjaEvaluationRow,
    date: string,
    specificDay?: NinjaEvaluationDay
  ) => {
    const matchingDays = specificDay
      ? [specificDay]
      : (row.days || []).filter((d) => d.date === date);

    const isAfterCutoff = date > report.requestedAsOf;

    if (matchingDays.length === 0) {
      return (
        <td
          key={date}
          className="border-e border-[var(--border)] px-1.5 py-2 text-center align-top text-[10px] text-[var(--muted)] bg-slate-50/40 dark:bg-slate-900/30"
        >
          <span>{isEn ? "Off" : "غير مجدول"}</span>
        </td>
      );
    }

    // Primary cell to inspect when clicked
    const primary = matchingDays[0];
    const allNotScheduled = matchingDays.every(
      (d) => d.hoursStatus === "NotScheduled" && !d.orders && !d.hours
    );

    if (allNotScheduled) {
      return (
        <td
          key={date}
          className="border-e border-[var(--border)] px-1.5 py-2 text-center align-top text-[10px] text-slate-400 bg-slate-50/50 dark:bg-slate-900/40"
        >
          <button
            type="button"
            onClick={() =>
              primary.accountId &&
              onOpenDayDetail(primary.accountId, primary.captainId, date)
            }
            className="w-full rounded p-1 hover:bg-slate-200/50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={`${date} - ${isEn ? "Not Scheduled" : "غير مجدول"}`}
          >
            <div className="font-medium">{isEn ? "Off" : "غير مجدول"}</div>
          </button>
        </td>
      );
    }

    const hMeta = getHoursStatusLabel(primary.hoursStatus, locale);
    const cMeta = getCoverageStatusLabel(primary.coverage, locale);

    const cellBg =
      primary.coverage === "AllocationMismatch"
        ? "bg-rose-50/80 dark:bg-rose-950/30"
        : primary.coverage === "Missing"
        ? isAfterCutoff
          ? "bg-slate-50/60 dark:bg-slate-900/30"
          : "bg-amber-50/70 dark:bg-amber-950/25"
        : primary.hoursStatus === "Qualified"
        ? "bg-emerald-50/50 dark:bg-emerald-950/20"
        : primary.hoursStatus === "ShortHours"
        ? "bg-orange-50/60 dark:bg-orange-950/20"
        : "bg-blue-50/40 dark:bg-blue-950/20";

    return (
      <td
        key={date}
        className={`border-e border-[var(--border)] p-1 align-top text-[10px] ${cellBg}`}
      >
        <button
          type="button"
          onClick={() =>
            primary.accountId &&
            onOpenDayDetail(primary.accountId, primary.captainId, date)
          }
          className="w-full rounded-lg p-1 text-start transition-colors hover:bg-white/80 dark:hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`${date} — ${
            row.riderName || primary.captainId
          } — ${localizeDigits(hMeta.label, locale)} — ${localizeDigits(cMeta.label, locale)}`}
        >
          {/* Orders & Hours */}
          <div className="flex items-center justify-between gap-1 font-bold">
            <span className="text-[var(--foreground)]" title={isEn ? "Orders" : "الطلبات"}>
              {primary.orders === null
                ? "—"
                : `${formatNullableMetric(primary.orders, locale, 0)}${
                    isEn ? "o" : "ط"
                  }`}
            </span>
            <span className="text-blue-700 dark:text-blue-300" title={isEn ? "Hours" : "الساعات"}>
              {primary.hours === null
                ? "—"
                : `${formatHoursAsDuration(primary.hours)}${
                    isEn ? "h" : "س"
                  }`}
            </span>
          </div>

          {/* Responsibility Weight & Target / Gap */}
          <div className="mt-0.5 flex items-center justify-between gap-1 text-[9px] text-[var(--muted)]">
            <span title={isEn ? "Responsibility Weight" : "وزن المسؤولية"}>
              W:{primary.responsibility === null ? "?" : formatNullableMetric(primary.responsibility, locale, 2)}
            </span>
            <span title={isEn ? "Daily Target / Gap" : "هدف اليوم / الفرق"}>
              T:{primary.target === null ? "?" : formatNullableMetric(primary.target, locale, 1)}
              {primary.gap !== null && (
                <span
                  className={
                    primary.gap < 0
                      ? "ms-0.5 font-bold text-rose-600"
                      : "ms-0.5 font-bold text-emerald-600"
                  }
                >
                  ({primary.gap >= 0 ? `+${formatNullableMetric(primary.gap, locale, 0)}` : formatNullableMetric(primary.gap, locale, 0)})
                </span>
              )}
            </span>
          </div>

          {/* Explicit text badges for HoursStatus & Coverage (never rely on color alone!) */}
          <div className="mt-1 flex flex-wrap items-center gap-0.5">
            <span
              className={`inline-block rounded px-1 py-0.2 text-[9px] font-bold ${
                hMeta.variant === "emerald"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                  : hMeta.variant === "amber"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                  : hMeta.variant === "blue"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200"
                  : "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200"
              }`}
            >
              {hMeta.shortLabel}
            </span>
            {primary.coverage !== "Complete" && (
              <span
                className={`inline-block rounded px-1 py-0.2 text-[9px] font-bold ${
                  cMeta.variant === "rose"
                    ? "bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-100"
                    : "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100"
                }`}
              >
                {cMeta.shortLabel}
              </span>
            )}
            {matchingDays.length > 1 && (
              <span className="inline-block rounded bg-purple-100 px-1 text-[9px] font-bold text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                +{localizeDigits(matchingDays.length - 1, locale)}
              </span>
            )}
          </div>
        </button>
      </td>
    );
  };

  const renderForecastOrContinuationCell = (row: NinjaEvaluationRow) => {
    const forecast: NinjaEvaluationForecast | null = row.forecast;
    const continuation: NinjaEvaluationForecast | null =
      row.continuationScenario;

    if (forecast) {
      return (
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-1">
            <Badge tone="purple">
              {isEn ? "Reliable Forecast" : "توقع موثوق مكتمل التغطية"}
            </Badge>
            <span className="text-[10px] font-mono text-[var(--muted)]">
              {forecast.assumption}
            </span>
          </div>
          <div className="font-extrabold text-sm text-purple-900 dark:text-purple-200">
            {formatSuggestedCurrency(
              forecast.suggestedMoney?.suggestedAmount ?? null,
              locale
            )}
          </div>
          <div className="text-[10px] text-[var(--muted)] space-y-0.5">
            <div>
              {NINJA_EVALUATION_REQUIRED_LABELS.ar.projectedAmountIfPaceContinues}
            </div>
            <div>
              {NINJA_EVALUATION_REQUIRED_LABELS.en.projectedAmountIfPaceContinues}
            </div>
            <div className="pt-1 text-[var(--foreground)] font-medium">
              {isEn ? "Projected Orders:" : "الطلبات المتوقعة:"}{" "}
              <strong>{formatNullableMetric(forecast.projectedOrders, locale, 1)}</strong>{" "}
              | {isEn ? "Run Rate:" : "المعدل اليومي:"}{" "}
              <strong>{formatNullableMetric(forecast.dailyRunRate, locale, 1)}/d</strong>
            </div>
            <div>
              {isEn ? "Required Daily Rate:" : "المعدل اليومي المطلوب للهدف:"}{" "}
              <strong className="text-blue-700 dark:text-blue-300">
                {formatRequiredDailyRate(
                  forecast.requiredDailyRate,
                  forecast.remainingOrders,
                  locale
                )}
              </strong>
            </div>
          </div>
        </div>
      );
    }

    if (continuation) {
      // Distinct warning style & title when forecast is null and continuationScenario exists
      return (
        <div className="space-y-1.5 rounded-xl border border-amber-300 bg-amber-50/80 p-2 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-center gap-1 font-bold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span className="text-[11px]">
              {NINJA_EVALUATION_REQUIRED_LABELS[locale].unreliableContinuationTitle}
            </span>
          </div>
          <div className="font-extrabold text-sm text-amber-900 dark:text-amber-100">
            {formatSuggestedCurrency(
              continuation.suggestedMoney?.suggestedAmount ?? null,
              locale
            )}
          </div>
          <div className="text-[10px] space-y-0.5">
            <div>
              {isEn ? "Scenario Orders:" : "طلبات السيناريو:"}{" "}
              <strong>
                {formatNullableMetric(continuation.projectedOrders, locale, 1)}
              </strong>{" "}
              | {isEn ? "Rate:" : "المعدل:"}{" "}
              <strong>
                {formatNullableMetric(continuation.dailyRunRate, locale, 1)}/d
              </strong>
            </div>
            <div>
              {isEn ? "Required Rate:" : "المعدل المطلوب:"}{" "}
              <strong>
                {formatRequiredDailyRate(
                  continuation.requiredDailyRate,
                  continuation.remainingOrders,
                  locale
                )}
              </strong>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="text-xs text-[var(--muted)]">
        <div className="font-bold">
          {NINJA_EVALUATION_REQUIRED_LABELS[locale].unavailableData}
        </div>
        <div className="text-[10px] mt-0.5">
          {isEn
            ? "No forecast available due to missing coverage or unresolved context."
            : "التوقع غير متاح بسبب نقص التغطية أو عدم حسم التسعير/المسؤولية."}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <section className={styles.section} aria-label={isEn ? "Evaluation results" : "نتائج التقييم"}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>{isEn ? "Performance results" : "نتائج الأداء"} <span className="ms-2 text-sm font-normal text-[var(--muted)]">{localizeDigits(report.summary.totalRows, locale)}</span></h2>
            <p>{isEn ? `Data through ${localizeDigits(report.requestedAsOf, locale)}. Expand a rider to review daily activity.` : `البيانات حتى ${localizeDigits(report.requestedAsOf, locale)} · افتح الأداء اليومي لمراجعة تفاصيل المندوب.`}</p>
          </div>
          <div className={styles.viewToggle} role="group" aria-label={isEn ? "Results layout" : "طريقة عرض النتائج"}>
            <button type="button" aria-pressed={displayMode === "overview"} onClick={() => setDisplayMode("overview")}><List size={16} />{isEn ? "Overview" : "عرض مختصر"}</button>
            <button type="button" aria-pressed={displayMode === "matrix"} onClick={() => setDisplayMode("matrix")}><Table2 size={16} />{isEn ? "Monthly matrix" : "مصفوفة الشهر"}</button>
          </div>
        </div>
        {displayMode === "overview" && <NinjaEvaluationOverview report={report} locale={locale} canManageEvaluation={canManageEvaluation} onOpenDayDetail={onOpenDayDetail} onOpenManageAccount={onOpenManageAccount} onOpenCalculation={setSelectedBreakdownRow} />}
      </section>
      {displayMode === "matrix" && <>
      {/* Matrix Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-[var(--foreground)]">
            {isEn ? "Cell Status Legend:" : "دليل حالات الخلايا اليومية:"}
          </span>
          <Badge tone="green">
            {isEn ? "Qual: ≥ 8h Full Day" : "مؤهل: ≥ 8 ساعات"}
          </Badge>
          <Badge tone="orange">
            {isEn ? "Short: < 8h" : "ناقص: < 8 ساعات"}
          </Badge>
          <Badge tone="blue">
            {isEn ? "Split?: Shared Day Unknown" : "مقسوم؟: يوم مشترك غير محسوم"}
          </Badge>
          <Badge tone="red">
            {isEn
              ? "Missing / Mismatch: Coverage Gap"
              : "مفقود / تعارض حصص: فجوة تغطية"}
          </Badge>
          <span className="text-[var(--muted)]">
            {isEn
              ? "• Click any day cell to open Day Details Drawer"
              : "• انقر على أي خلية يوم لعرض تفاصيل اليوم والتكليفات التاريخية"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
          <span>
            {isEn
              ? `Cutoff (requestedAsOf): ${localizeDigits(report.requestedAsOf, locale)}`
              : `حد البيانات (requestedAsOf): ${localizeDigits(report.requestedAsOf, locale)}`}
          </span>
        </div>
      </div>

      {/* Horizontal Scrollable Matrix Table */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] bg-slate-100/90 text-[var(--foreground)] dark:bg-slate-900">
              {/* Sticky Identity Column */}
              <th
                scope="col"
                className="sticky start-0 z-20 min-w-[290px] max-w-[320px] border-e border-[var(--border)] bg-slate-100 px-3 py-3 text-start font-extrabold shadow-sm dark:bg-slate-900"
              >
                {report.view === "accounts"
                  ? isEn
                    ? "Account / Captain Identity & Context"
                    : "بيانات الحساب / الكابتن والفترة"
                  : isEn
                  ? "Historical Rider, Captain ID & Assignment"
                  : "المندوب الفعلي، معرف الكابتن وفترة التكليف"}
              </th>

              {/* Consecutive Calendar Date Columns */}
              {calendarDates.map((d) => {
                const dayNum = d.slice(8);
                const isCutoff = d === report.requestedAsOf;
                const isAfterCutoff = d > report.requestedAsOf;
                return (
                  <th
                    key={d}
                    scope="col"
                    className={`min-w-[88px] border-e border-[var(--border)] px-1.5 py-2 text-center font-bold ${
                      isCutoff
                        ? "bg-blue-100/80 text-blue-950 dark:bg-blue-950/60 dark:text-blue-200"
                        : isAfterCutoff
                        ? "bg-slate-50 text-[var(--muted)] dark:bg-slate-900/40"
                        : ""
                    }`}
                  >
                    <div className="font-mono text-xs">{localizeDigits(dayNum, locale)}</div>
                    <div className="text-[9px] font-normal text-[var(--muted)]">
                      {localizeDigits(d.slice(5), locale)}
                    </div>
                    {isCutoff && (
                      <div className="mt-0.5 rounded bg-blue-600 px-1 text-[8px] font-bold text-white">
                        {isEn ? "Cutoff" : "حد البيانات"}
                      </div>
                    )}
                  </th>
                );
              })}

              {/* Summary & Totals Columns after Dates */}
              <th
                scope="col"
                className="min-w-[210px] border-e border-[var(--border)] px-3 py-3 text-start font-extrabold"
              >
                {isEn
                  ? "Observed vs. Evaluated Totals"
                  : "الإجماليات: المرصود (Observed) مقابل المقيّم (Evaluated)"}
              </th>

              <th
                scope="col"
                className="min-w-[190px] border-e border-[var(--border)] px-3 py-3 text-start font-extrabold"
              >
                {isEn
                  ? "Targets & Attendance (85%)"
                  : "الأهداف الثلاثة وتقييم الحضور (85%)"}
              </th>

              <th
                scope="col"
                className="min-w-[240px] border-e border-[var(--border)] bg-blue-50/50 px-3 py-3 text-start font-extrabold dark:bg-blue-950/20"
              >
                <div>{NINJA_EVALUATION_REQUIRED_LABELS.ar.suggestedThroughCutoff}</div>
                <div className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                  {NINJA_EVALUATION_REQUIRED_LABELS.en.suggestedThroughCutoff(
                    report.requestedAsOf
                  )}
                </div>
              </th>

              <th
                scope="col"
                className="min-w-[250px] border-e border-[var(--border)] bg-purple-50/40 px-3 py-3 text-start font-extrabold dark:bg-purple-950/20"
              >
                <div>
                  {NINJA_EVALUATION_REQUIRED_LABELS.ar.projectedAmountIfPaceContinues}
                </div>
                <div className="text-[10px] font-semibold text-purple-700 dark:text-purple-300">
                  {NINJA_EVALUATION_REQUIRED_LABELS.en.projectedAmountIfPaceContinues}
                </div>
              </th>

              <th
                scope="col"
                className="min-w-[200px] px-3 py-3 text-start font-extrabold"
              >
                {isEn
                  ? "Other Eligibility & Missing-Data Reasons"
                  : "شروط الأهلية الأخرى وأسباب نقص البيانات"}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border)]">
            {report.items.map((row) => {
              const subrows = buildRowBreakdownSubrows(row);
              const hasMultipleSubrows =
                subrows.length > 1 ||
                (row.accountIds && row.accountIds.length > 1) ||
                (row.assignmentIds && row.assignmentIds.length > 1) ||
                (row.suggestedMoney?.segments &&
                  row.suggestedMoney.segments.length > 1);
              const isExpanded = Boolean(expandedRowKeys[row.key]);
              const pricingTypes = getRowPricingTypes(row);
              const assignmentPeriodText = getRowAssignmentPeriodText(row);
              const attMeta = getEligibilityStatusLabel(
                row.attendance.status,
                locale
              );
              const primaryAccountId =
                row.accountId || row.accountIds?.[0] || null;
              const primaryCaptainId = row.captainIds?.[0] || null;

              return (
                <React.Fragment key={row.key}>
                  {/* Main Row */}
                  <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                    {/* Sticky Identity Cell */}
                    <td className="sticky start-0 z-10 border-e border-[var(--border)] bg-[var(--surface)] p-3 align-top shadow-sm">
                      <div className="space-y-1.5">
                        {/* Actual Rider Name or Account Title */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-extrabold text-sm text-[var(--foreground)]">
                            {report.view === "accounts"
                              ? row.captainIds?.join(", ") ||
                                row.accountId?.slice(0, 8)
                              : row.riderName ||
                                (isEn
                                  ? "Historical Rider (Unnamed)"
                                  : "مندوب تاريخي")}
                          </div>
                          {row.targetStatus === "TargetAchieved" ? (
                            <Badge tone="green">
                              {isEn ? "Target Achieved" : "الهدف محقق"}
                            </Badge>
                          ) : row.targetStatus === "BelowTarget" ? (
                            <Badge tone="orange">
                              {isEn ? "Below Target" : "تحت الهدف"}
                            </Badge>
                          ) : (
                            <Badge tone="red">
                              {isEn ? "Unknown Status" : "غير محسوم"}
                            </Badge>
                          )}
                        </div>

                        {/* Captain IDs & Pricing Type Badges */}
                        <div className="flex flex-wrap items-center gap-1 text-[11px]">
                          <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                            {isEn ? "Captain:" : "الكابتن:"}{" "}
                            {row.captainIds && row.captainIds.length > 0
                              ? row.captainIds.join("، ")
                              : "—"}
                          </span>
                          {pricingTypes.length > 0 ? (
                            pricingTypes.map((pt) => (
                              <Badge
                                key={pt}
                                tone={pt === "CAR" ? "purple" : "blue"}
                              >
                                {pt === "CAR" ? (
                                  <span className="inline-flex items-center gap-0.5">
                                    <Car className="h-3 w-3" /> CAR
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5">
                                    <Bike className="h-3 w-3" /> BIKE
                                  </span>
                                )}
                              </Badge>
                            ))
                          ) : (
                            <Badge tone="gray">
                              {isEn ? "Pricing: Unresolved" : "التسعير: غير محدد"}
                            </Badge>
                          )}
                        </div>

                        {/* Establishment & City */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {row.establishmentName ||
                              (isEn ? "No Establishment" : "بدون مؤسسة مسجلة")}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {row.cityName || (isEn ? "No City" : "بدون مدينة")}
                          </span>
                        </div>

                        {/* Assignment Period & Freshness (latestImportedDate, latestCompleteDate, dataDelayDays separately) */}
                        <div className="rounded-lg bg-slate-50 p-1.5 text-[10px] text-[var(--muted)] dark:bg-slate-900/60 space-y-0.5">
                          <div>
                            <strong className="text-[var(--foreground)]">
                              {isEn ? "Assignment Period:" : "فترة التكليف:"}
                            </strong>{" "}
                            {assignmentPeriodText}
                            {row.assignmentIds?.length > 1 && (
                              <span className="ms-1 font-bold text-indigo-600">
                                ({localizeDigits(row.assignmentIds.length, locale)}{" "}
                                {isEn ? "periods" : "فترات"})
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                            <span>
                              <strong>
                                {isEn ? "Last Import:" : "آخر استيراد:"}
                              </strong>{" "}
                              {localizeDigits(row.latestImportedDate ||
                                (isEn ? "None" : "لا يوجد"), locale)}
                            </span>
                            <span>
                              <strong>
                                {isEn ? "Last Complete:" : "آخر يوم مكتمل:"}
                              </strong>{" "}
                              {localizeDigits(row.latestCompleteDate ||
                                (isEn ? "None" : "لا يوجد"), locale)}
                            </span>
                            <span>
                              <strong>
                                {isEn ? "Delay:" : "تأخر البيانات:"}
                              </strong>{" "}
                              {row.dataDelayDays === null
                                ? isEn
                                  ? "N/A"
                                  : "غير متاح"
                                : `${localizeDigits(row.dataDelayDays, locale)} ${
                                    isEn ? "d" : "يوم"
                                  }`}
                            </span>
                          </div>
                        </div>

                        {/* Subrow Expand & Account Context Manage Buttons */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {hasMultipleSubrows && (
                            <button
                              type="button"
                              onClick={() => toggleExpandRow(row.key)}
                              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-800 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200"
                            >
                              <Layers className="h-3 w-3" />
                              <span>
                                {isExpanded
                                  ? isEn
                                    ? "Hide Subrows"
                                    : "إخفاء تفصيل التكليفات"
                                  : isEn
                                  ? `Breakdown (${localizeDigits(subrows.length, locale)})`
                                  : `تفصيل الحسابات/الفترات (${localizeDigits(subrows.length, locale)})`}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedBreakdownRow(row)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-slate-50 px-2 py-1 text-[10px] font-bold text-[var(--foreground)] hover:bg-slate-100 dark:bg-slate-800"
                          >
                            <Scale className="h-3 w-3 text-blue-600" />
                            <span>
                              {isEn ? "Calculation Details" : "تفاصيل الاحتساب"}
                            </span>
                          </button>

                          {canManageEvaluation &&
                            primaryAccountId &&
                            onOpenManageAccount && (
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenManageAccount(
                                    primaryAccountId,
                                    primaryCaptainId,
                                    "context"
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-slate-50 px-2 py-1 text-[10px] font-bold text-[var(--foreground)] hover:bg-slate-100 dark:bg-slate-800"
                              >
                                <SlidersHorizontal className="h-3 w-3" />
                                <span>{isEn ? "Context" : "السياق"}</span>
                              </button>
                            )}
                        </div>
                      </div>
                    </td>

                    {/* Daily Cells across the Month */}
                    {calendarDates.map((d) => renderDateCell(row, d))}

                    {/* Observed vs Evaluated Totals Cell */}
                    <td className="border-e border-[var(--border)] p-3 align-top">
                      <div className="space-y-2 text-xs">
                        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900/50">
                          <div className="font-bold text-[11px] text-[var(--muted)]">
                            {isEn
                              ? "Observed (Through Cutoff)"
                              : "المرصود (Observed)"}
                          </div>
                          <div className="mt-1 flex items-center justify-between font-bold">
                            <span>
                              {formatNullableMetric(
                                row.observed.orders,
                                locale,
                                0
                              )}{" "}
                              {isEn ? "orders" : "طلب"}
                            </span>
                            <span className="text-blue-700 dark:text-blue-300">
                              {formatHoursAsDuration(row.observed.hours)}{" "}
                              {isEn ? "h" : "س"}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[10px] text-[var(--muted)]">
                            W:{" "}
                            {formatNullableMetric(
                              row.observed.responsibility,
                              locale,
                              2
                            )}{" "}
                            |{" "}
                            {row.observed.ordersPerHour !== null
                              ? `${formatNullableMetric(
                                  row.observed.ordersPerHour,
                                  locale,
                                  2
                                )} ${isEn ? "ord/h" : "طلب/س"}`
                              : ""}
                          </div>
                        </div>

                        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-2 dark:border-blue-900/50 dark:bg-blue-950/20">
                          <div className="font-bold text-[11px] text-blue-900 dark:text-blue-200">
                            {isEn
                              ? "Evaluated (Complete Prefix)"
                              : "المقيّم الموثوق (Evaluated)"}
                          </div>
                          <div className="mt-1 flex items-center justify-between font-bold">
                            <span>
                              {formatNullableMetric(
                                row.evaluated.orders,
                                locale,
                                0
                              )}{" "}
                              {isEn ? "orders" : "طلب"}
                            </span>
                            <span className="text-blue-700 dark:text-blue-300">
                              {formatHoursAsDuration(row.evaluated.hours)}{" "}
                              {isEn ? "h" : "س"}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[10px] text-[var(--muted)]">
                            W:{" "}
                            {formatNullableMetric(
                              row.evaluated.responsibility,
                              locale,
                              2
                            )}{" "}
                            | {isEn ? "Rate:" : "الإنجاز:"}{" "}
                            {row.evaluated.completionRate !== null
                              ? `${localizeDigits((row.evaluated.completionRate * 100).toFixed(
                                  1
                                ), locale)}%`
                              : isEn
                              ? "Unavailable"
                              : "غير متاح"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Three Distinct Targets & Attendance Assessment */}
                    <td className="border-e border-[var(--border)] p-3 align-top">
                      <div className="space-y-2 text-xs">
                        {/* Distinct Targets */}
                        <div className="space-y-1 rounded-lg bg-slate-50 p-2 dark:bg-slate-900/50 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-[var(--muted)]">
                              {isEn ? "Period Target:" : "هدف الفترة الكامل:"}
                            </span>
                            <strong>
                              {formatNullableMetric(
                                row.periodTarget,
                                locale,
                                2
                              )}
                            </strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--muted)]">
                              {isEn ? "Target Due Today:" : "المطلوب حتى اليوم:"}
                            </span>
                            <strong>
                              {formatNullableMetric(
                                row.targetDueToday,
                                locale,
                                2
                              )}
                            </strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--muted)]">
                              {isEn
                                ? "Evaluated Target:"
                                : "هدف السلسلة المكتملة:"}
                            </span>
                            <strong>
                              {formatNullableMetric(
                                row.evaluated.target,
                                locale,
                                2
                              )}
                            </strong>
                          </div>
                          <div className="flex justify-between border-t border-[var(--border)] pt-1">
                            <span className="text-[var(--muted)]">
                              {isEn ? "Evaluated Gap:" : "فرق التقييم:"}
                            </span>
                            <strong
                              className={
                                row.evaluated.gap !== null &&
                                row.evaluated.gap < 0
                                  ? "text-rose-600"
                                  : "text-emerald-600"
                              }
                            >
                              {formatNullableMetric(
                                row.evaluated.gap,
                                locale,
                                2
                              )}
                            </strong>
                          </div>
                        </div>

                        {/* Attendance Assessment */}
                        <div className="rounded-lg border border-[var(--border)] p-2 text-[11px] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold">
                              {isEn ? "Attendance:" : "تقييم الحضور:"}
                            </span>
                            <Badge tone={mapTone(attMeta.variant)}>
                              {localizeDigits(attMeta.label, locale)}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-[var(--muted)]">
                            {isEn ? "Qualifying:" : "مؤهل:"}{" "}
                            <strong>
                              {formatNullableMetric(
                                row.attendance.qualified,
                                locale,
                                2
                              )}
                            </strong>{" "}
                            /{" "}
                            {formatNullableMetric(
                              row.attendance.requiredQualifyingUnits,
                              locale,
                              2
                            )}{" "}
                            ({isEn ? "Sched:" : "مجدول:"}{" "}
                            {formatNullableMetric(
                              row.attendance.scheduled,
                              locale,
                              2
                            )}
                            )
                          </div>
                          <div className="text-[10px] text-[var(--muted)]">
                            {isEn ? "Short Days:" : "أيام ناقصة الساعات:"}{" "}
                            <strong>{localizeDigits(row.attendance.shortHoursDays, locale)}</strong> |{" "}
                            {isEn ? "Unknown:" : "غير محسوم:"}{" "}
                            <strong>
                              {formatNullableMetric(
                                row.attendance.unknown,
                                locale,
                                2
                              )}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Suggested Money Through Cutoff */}
                    <td className="border-e border-[var(--border)] bg-blue-50/20 p-3 align-top dark:bg-blue-950/10">
                      {row.suggestedMoney ? (
                        <div className="space-y-1.5 text-xs">
                          <div className="font-extrabold text-base text-blue-950 dark:text-blue-100">
                            {formatSuggestedCurrency(
                              row.suggestedMoney.suggestedAmount,
                              locale
                            )}
                          </div>
                          <div className="text-[10px] text-blue-800 dark:text-blue-300 space-y-0.5">
                            <div>
                              <span className="font-semibold">
                                {
                                  NINJA_EVALUATION_REQUIRED_LABELS[locale]
                                    .orderAmountBeforeAttendance
                                }
                                :
                              </span>{" "}
                              <strong>
                                {formatSuggestedCurrency(
                                  row.suggestedMoney.orderAmount,
                                  locale
                                )}
                              </strong>
                            </div>
                            {row.suggestedMoney.attendanceReduction && (
                              <div className="inline-block rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                                {
                                  NINJA_EVALUATION_REQUIRED_LABELS.ar
                                    .attendanceReduction15
                                }{" "}
                                •{" "}
                                {
                                  NINJA_EVALUATION_REQUIRED_LABELS.en
                                    .attendanceReduction15
                                }
                              </div>
                            )}
                            <div className="pt-1 text-[var(--muted)]">
                              {
                                NINJA_EVALUATION_REQUIRED_LABELS.ar
                                  .basedOnOrdersAndHoursOnly
                              }{" "}
                              •{" "}
                              {
                                NINJA_EVALUATION_REQUIRED_LABELS.en
                                  .basedOnOrdersAndHoursOnly
                              }
                            </div>
                            <div className="font-semibold text-amber-700 dark:text-amber-400">
                              {NINJA_EVALUATION_REQUIRED_LABELS.ar.invoicePending}{" "}
                              •{" "}
                              {NINJA_EVALUATION_REQUIRED_LABELS.en.invoicePending}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1 text-xs">
                          <div className="font-bold text-rose-700 dark:text-rose-400">
                            {
                              NINJA_EVALUATION_REQUIRED_LABELS[locale]
                                .unavailableData
                            }
                          </div>
                          <div className="text-[10px] text-[var(--muted)]">
                            {isEn
                              ? "Suggestion unavailable (never shown as 0). Check missing-data reasons."
                              : "المقترح غير متاح أو غير محسوم (لا يُعرض كصفر أبداً). راجع أسباب النقص."}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Period-End Forecast or Continuation Scenario */}
                    <td className="border-e border-[var(--border)] bg-purple-50/15 p-3 align-top dark:bg-purple-950/10">
                      {renderForecastOrContinuationCell(row)}
                    </td>

                    {/* Other Eligibility & Missing-Data Reasons */}
                    <td className="p-3 align-top">
                      <div className="space-y-2 text-xs">
                        {row.reasons && row.reasons.length > 0 ? (
                          <div className="space-y-1">
                            <div className="font-bold text-[11px] text-amber-800 dark:text-amber-300">
                              {isEn ? "Reasons / Notes:" : "أسباب وملاحظات التقييم:"}
                            </div>
                            <ul className="list-inside list-disc space-y-0.5 text-[11px] text-rose-700 dark:text-rose-300">
                              {row.reasons.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-semibold">
                            {isEn
                              ? "Complete through cutoff"
                              : "مكتمل حتى حد البيانات"}
                          </span>
                        )}

                        <div className="border-t border-[var(--border)] pt-1.5 text-[10px] text-[var(--muted)]">
                          <div className="font-semibold mb-0.5">
                            {isEn
                              ? "Other Contract Eligibility (v1):"
                              : "شروط الأهلية الأخرى (الإصدار 1):"}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(row.otherEligibility || {}).map(
                              ([k, v]) => (
                                <span
                                  key={k}
                                  className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                >
                                  {k}: {v}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Subrows when rider has multiple accounts or responsibility periods */}
                  {hasMultipleSubrows &&
                    isExpanded &&
                    subrows.map((sub) => (
                      <tr
                        key={`${row.key}::sub::${sub.subrowKey}`}
                        className="bg-indigo-50/30 dark:bg-indigo-950/20 text-[11px]"
                      >
                        <td className="sticky start-0 z-10 border-e border-[var(--border)] bg-indigo-50/90 p-2.5 ps-6 align-top dark:bg-indigo-950/90">
                          <div className="space-y-1">
                            <div className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                              <Layers className="h-3.5 w-3.5 text-indigo-600" />
                              <span>
                                {isEn ? "Captain:" : "الكابتن:"} {localizeDigits(sub.captainId, locale)}
                              </span>
                              {sub.pricingTypes.map((pt) => (
                                <Badge key={pt} tone="purple">
                                  {pt}
                                </Badge>
                              ))}
                            </div>
                            <div className="text-[10px] text-[var(--muted)]">
                              {isEn ? "Period:" : "الفترة:"} {localizeDigits(sub.fromDate, locale)} →{" "}
                              {localizeDigits(sub.toDate, locale)}
                            </div>
                            {sub.assignmentId && (
                              <div className="font-mono text-[9px] text-[var(--muted)]">
                                Assignment: {sub.assignmentId.slice(0, 8)}
                              </div>
                            )}
                          </div>
                        </td>

                        {calendarDates.map((d) =>
                          renderDateCell(row, d, sub.daysByDate[d])
                        )}

                        <td className="border-e border-[var(--border)] p-2.5 align-top">
                          <div className="font-bold">
                            {localizeDigits(sub.totalOrders, locale)} {isEn ? "orders" : "طلب"} /{" "}
                            {formatHoursAsDuration(sub.totalHours)}{" "}
                            {isEn ? "h" : "س"}
                          </div>
                          <div className="text-[10px] text-[var(--muted)]">
                            W:{" "}
                            {formatNullableMetric(
                              sub.totalResponsibility,
                              locale,
                              2
                            )}
                          </div>
                        </td>

                        <td className="border-e border-[var(--border)] p-2.5 align-top">
                          <div>
                            {isEn ? "Subrow Target:" : "هدف الفترة الفرعية:"}{" "}
                            <strong>
                              {formatNullableMetric(sub.totalTarget, locale, 2)}
                            </strong>
                          </div>
                        </td>

                        <td
                          colSpan={3}
                          className="p-2.5 align-top text-[10px] text-[var(--muted)]"
                        >
                          {isEn
                            ? "Subrow segment contributes to the row's independent calculation breakdown."
                            : "تدخل هذه الفترة الفرعية ضمن شرائح الاحتساب المستقلة للصف الرئيسي."}
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      </>}
      <p className="px-2 text-sm text-[var(--muted)]" role="status">{isEn ? `Showing all ${localizeDigits(report.items.length, locale)} matching results` : `عرض جميع النتائج المطابقة (${localizeDigits(report.items.length, locale)})`}</p>

      {/* Detailed Calculation & Forecast Breakdown Modal for a Selected Row */}
      <Modal
        locale={locale}
        isOpen={Boolean(selectedBreakdownRow)}
        onClose={() => setSelectedBreakdownRow(null)}
        title={isEn ? `Calculation details${selectedBreakdownRow?.riderName ? ` — ${selectedBreakdownRow.riderName}` : ""}` : `تفاصيل الاحتساب${selectedBreakdownRow?.riderName ? ` — ${selectedBreakdownRow.riderName}` : ""}`}
        maxWidth="max-w-4xl"
      >
        {selectedBreakdownRow && <NinjaCalculationDetails row={selectedBreakdownRow} locale={locale} />}
      </Modal>
    </div>
  );
}
