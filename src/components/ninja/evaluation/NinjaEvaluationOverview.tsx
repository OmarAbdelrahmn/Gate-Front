"use client";

import { localizeDigits } from "./localizeDigits";

import { useId, useState } from "react";
import { ChevronDown, ChevronUp, CalendarDays, Scale, SlidersHorizontal, Bike, Car } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  formatNullableMetric, formatSuggestedCurrency, formatHoursAsDuration, getMonthCalendarDates,
  getHoursStatusLabel, getCoverageStatusLabel, getEligibilityStatusLabel,
  type NinjaEvaluationReport, type NinjaEvaluationRow,
} from "@/lib/ninja/api";
import styles from "./evaluation.module.css";

interface Props {
  report: NinjaEvaluationReport;
  locale: "ar" | "en";
  canManageEvaluation: boolean;
  onOpenDayDetail: (accountId: string, captainId: string | null, date: string) => void;
  onOpenManageAccount?: (accountId: string, captainId: string | null, tab: "context" | "responsibility") => void;
  onOpenCalculation: (row: NinjaEvaluationRow) => void;
}

export function NinjaEvaluationOverview({ report, locale, canManageEvaluation, onOpenDayDetail, onOpenManageAccount, onOpenCalculation }: Props) {
  const isEn = locale === "en";
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showAllDays, setShowAllDays] = useState(false);
  const id = useId();
  const metric = (value: number | null, digits = 0) => formatNullableMetric(value, locale, digits);
  const status = (row: NinjaEvaluationRow) => row.targetStatus === "TargetAchieved"
    ? <Badge tone="green">{isEn ? "Target achieved" : "الهدف محقق"}</Badge>
    : row.targetStatus === "BelowTarget"
      ? <Badge tone="orange">{isEn ? "Below target" : "تحت الهدف"}</Badge>
      : <Badge tone="gray">{isEn ? "Unresolved" : "غير محسوم"}</Badge>;

  return (
    <div className={styles.overview}>
      <div className={styles.columnHead} aria-hidden="true">
        <span>{isEn ? "Rider / account" : "المندوب / الحساب"}</span>
        <span>{isEn ? "Observed activity" : "الأداء المرصود"}</span>
        <span>{isEn ? "Target & attendance" : "الهدف والحضور"}</span>
        <span>{isEn ? "Suggested amount" : "المبلغ المقترح"}</span>
        <span>{isEn ? "Details" : "التفاصيل"}</span>
      </div>
      {report.items.map((row, index) => {
        const expanded = expandedKey === row.key;
        const panelId = `${id}-${index}`;
        const rawName = report.view === "accounts" ? row.captainIds.join("، ") || (isEn ? "Account" : "حساب") : row.riderName || (isEn ? "Unnamed rider" : "مندوب بدون اسم");
        const name = report.view === "accounts" ? localizeDigits(rawName, locale) : rawName;
        const accountId = row.accountId || row.accountIds[0];
        const pricing = Array.from(new Set(row.days.map(d => d.pricingType).filter(Boolean)));
        const completion = row.evaluated.completionRate;
        const attendance = getEligibilityStatusLabel(row.attendance.status, locale);
        const dates = expanded ? getMonthCalendarDates(report.year, report.month).filter(date => showAllDays || row.days.some(day => day.date === date && (day.hoursStatus !== "NotScheduled" || (day.orders ?? 0) > 0 || (day.hours ?? 0) > 0))) : [];
        return (
          <article key={row.key} className={styles.result}>
            <div className={styles.resultRow}>
              <div className={styles.identity}>
                <div className={styles.name}><bdi>{name}</bdi></div>
                <div className={styles.meta}>
                  {report.view === "riders" && <span>{isEn ? "Captain" : "الكابتن"}: <bdi>{localizeDigits(row.captainIds.join("، ") || "—", locale)}</bdi></span>}
                  {pricing.map(type => <span key={type} className={styles.vehicle}>{type === "BIKE" ? <Bike size={14} /> : <Car size={14} />}{isEn ? type : type === "BIKE" ? "دراجة" : "سيارة"}</span>)}
                </div>
                <div className={styles.meta}>{[row.establishmentName, row.cityName].filter(Boolean).join(" · ") || "—"}</div>
              </div>
              <div>
                <span className={styles.mobileLabel}>{isEn ? "Observed activity" : "الأداء المرصود"}</span>
                <div className={styles.activity}><strong>{metric(row.observed.orders)}</strong> <span>{isEn ? "orders" : "طلب"}</span></div>
                <div className={styles.meta}>{formatHoursAsDuration(row.observed.hours)} {isEn ? "working hours" : "ساعة عمل"}</div>
              </div>
              <div>
                <div className={styles.targetLine}>{status(row)}<span className={styles.meta}>{completion === null ? "—" : `${metric(completion * 100, 1)}%`}</span></div>
                <div className={styles.progress} role="progressbar" aria-label={isEn ? `Target completion for ${name}` : `نسبة تحقيق هدف ${name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion === null ? undefined : Math.min(100, Math.max(0, completion * 100))} aria-valuetext={completion === null ? (isEn ? "Unavailable" : "غير متاح") : `${metric(completion * 100, 1)}%`}><span style={{ width: `${completion === null ? 0 : Math.min(100, Math.max(0, completion * 100))}%` }} /></div>
                <div className={styles.meta}>{isEn ? "Attendance" : "الحضور"}: {localizeDigits(attendance.label, locale)}</div>
              </div>
              <div>
                <span className={styles.mobileLabel}>{isEn ? "Suggested amount" : "المبلغ المقترح"}</span>
                <div className={row.suggestedMoney ? styles.amount : styles.unavailable}>{row.suggestedMoney ? formatSuggestedCurrency(row.suggestedMoney.suggestedAmount, locale) : (isEn ? "Unavailable / unresolved" : "غير متاح / غير محسوم")}</div>
                <div className={styles.meta}>{row.suggestedMoney ? (isEn ? "Provisional · invoice pending" : "تقديري · بانتظار الفاتورة") : (isEn ? "Review data & calculation details" : "راجع البيانات وتفاصيل الاحتساب")}</div>
              </div>
              <div className={styles.rowActions}>
                <button type="button" className={styles.textButton} aria-expanded={expanded} aria-controls={panelId} onClick={() => { setExpandedKey(expanded ? null : row.key); setShowAllDays(false); }}>
                  <CalendarDays size={16} />{isEn ? "Daily activity" : "الأداء اليومي"}{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <button type="button" className={styles.textButton} onClick={() => onOpenCalculation(row)}><Scale size={16} />{isEn ? "Calculation details" : "تفاصيل الاحتساب"}</button>
              </div>
            </div>
            {expanded && <div id={panelId} className={styles.detailPanel}>
              <div className={styles.detailHeader}>
                <h3>{isEn ? "Daily activity & evaluation context" : "الأداء اليومي وسياق التقييم"}</h3>
                {canManageEvaluation && accountId && onOpenManageAccount && <button type="button" className={styles.textButton} onClick={() => onOpenManageAccount(accountId, row.captainIds[0] || null, "context")}><SlidersHorizontal size={16} />{isEn ? "Manage pricing & responsibility" : "إدارة التسعير والمسؤولية"}</button>}
              </div>
              <dl className={styles.detailStats}>
                {[
                  [isEn ? "Evaluated orders" : "الطلبات المقيّمة", metric(row.evaluated.orders)],
                  [isEn ? "Evaluated hours" : "الساعات المقيّمة", formatHoursAsDuration(row.evaluated.hours)],
                  [isEn ? "Period target" : "هدف الفترة", metric(row.periodTarget, 1)],
                  [isEn ? "Target due today" : "الهدف المستحق اليوم", metric(row.targetDueToday, 1)],
                  [isEn ? "Qualified attendance" : "الحضور المؤهل", `${metric(row.attendance.qualified, 1)} / ${metric(row.attendance.scheduled, 1)}`],
                  [isEn ? "Last import" : "آخر استيراد", localizeDigits(row.latestImportedDate || "—", locale)],
                  [isEn ? "Last complete day" : "آخر يوم مكتمل", localizeDigits(row.latestCompleteDate || "—", locale)],
                  [isEn ? "Data delay (days)" : "تأخر البيانات (يوم)", metric(row.dataDelayDays)],
                ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd><bdi>{value}</bdi></dd></div>)}
              </dl>
              {(row.reasons.length > 0 || pricing.length === 0) && <div className={styles.dataNotice}><strong>{isEn ? "Needs review" : "يحتاج مراجعة"}</strong><p>{row.reasons.length > 0 ? row.reasons.join(" · ") : (isEn ? "Pricing has not been resolved for this period." : "لم يُحسم التسعير لهذه الفترة.")}</p></div>}
              <div className={styles.detailHeader}>
                <p>{isEn ? "Select a day to review its source, assignments and responsibility." : "اختر يوماً لمراجعة المصدر والتكليفات وأوزان المسؤولية."}</p>
                <label className={styles.checkLabel}><input type="checkbox" checked={showAllDays} onChange={e => setShowAllDays(e.target.checked)} />{isEn ? "Show all month days" : "عرض جميع أيام الشهر"}</label>
              </div>
              {dates.length === 0 && <p className={styles.empty}>{isEn ? "No scheduled activity in this period." : "لا يوجد أداء مجدول في هذه الفترة."}</p>}
              <div className={styles.tableScroll} role="region" aria-label={isEn ? "Daily activity" : "الأداء اليومي"} tabIndex={0}>
                <table className={styles.dataTable}>
                  <caption className="sr-only">{isEn ? "Daily orders, hours, targets and responsibility" : "الطلبات والساعات والأهداف والمسؤولية لكل يوم"}</caption>
                  <thead><tr>{[isEn ? "Date" : "التاريخ", isEn ? "Orders" : "الطلبات", isEn ? "Hours" : "الساعات", isEn ? "Target" : "الهدف", isEn ? "Responsibility" : "المسؤولية", isEn ? "Status" : "الحالة", isEn ? "Details" : "التفاصيل"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
                  <tbody>{dates.flatMap(date => {
                    const days = row.days.filter(day => day.date === date);
                    if (days.length === 0) return [<tr key={date}><th scope="row"><bdi>{localizeDigits(date.slice(8), locale)} / {localizeDigits(date.slice(5, 7), locale)}</bdi></th><td colSpan={6} className={styles.meta}>{isEn ? "Not scheduled" : "غير مجدول"}</td></tr>];
                    return days.map((day, dayIndex) => {
                      const hours = getHoursStatusLabel(day.hoursStatus, locale);
                      const coverage = getCoverageStatusLabel(day.coverage, locale);
                      const shortMetric = (value: number | null, digits = 0) => value === null ? "—" : metric(value, digits);
                      return <tr key={`${date}-${day.accountId}-${day.assignmentId}-${dayIndex}`}>
                        <th scope="row"><bdi>{localizeDigits(date.slice(8), locale)} / {localizeDigits(date.slice(5, 7), locale)}</bdi>{days.length > 1 && <span className={styles.meta}>{isEn ? `Share ${localizeDigits(dayIndex + 1, locale)}` : `الحصة ${localizeDigits(dayIndex + 1, locale)}`}</span>}</th>
                        <td className="font-bold">{shortMetric(day.orders)}</td><td>{formatHoursAsDuration(day.hours)}</td><td>{shortMetric(day.target, 1)}</td><td>{day.responsibility === null ? "—" : `${metric(day.responsibility * 100)}%`}</td>
                        <td><span>{localizeDigits(hours.label, locale)}</span>{day.coverage !== "Complete" && <span className={styles.meta}>{localizeDigits(coverage.label, locale)}</span>}{date > report.requestedAsOf && <span className={styles.meta}>{isEn ? "After cutoff" : "بعد حد البيانات"}</span>}</td>
                        <td><button type="button" className={styles.textButton} onClick={() => onOpenDayDetail(day.accountId, day.captainId, date)} aria-label={isEn ? `Day details for ${name}, ${date}, share ${localizeDigits(dayIndex + 1, locale)}` : `تفاصيل يوم ${date} للمندوب ${name}، الحصة ${localizeDigits(dayIndex + 1, locale)}`}>{isEn ? "View day" : "عرض اليوم"}</button></td>
                      </tr>;
                    });
                  })}</tbody>
                </table>
              </div>
            </div>}
          </article>
        );
      })}
    </div>
  );
}
