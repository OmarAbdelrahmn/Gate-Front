"use client";

import { localizeDigits } from "./localizeDigits";

import { Info } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatNullableMetric, formatHoursAsDuration, formatRiyadhDateTime, getHoursStatusLabel, getCoverageStatusLabel, type NinjaEvaluationDayDetail, type NinjaEvaluationDay } from "@/lib/ninja/api";
import styles from "./evaluation.module.css";

export function NinjaDayDetailContent({ detail, riderNamesMap, locale }: { detail: NinjaEvaluationDayDetail; riderNamesMap: Record<string, string | null | undefined>; locale: "ar" | "en" }) {
  const isEn = locale === "en";
  const { source, riders } = detail;
  const metric = (value: number | null, digits = 1) => formatNullableMetric(value, locale, digits);
  const pricing = (day: NinjaEvaluationDay) => day.pricingType === "BIKE" ? (isEn ? "Motorbike" : "دراجة") : day.pricingType === "CAR" ? (isEn ? "Car" : "سيارة") : (isEn ? "Pricing unresolved" : "التسعير غير محدد");
  const badges = (day: NinjaEvaluationDay) => <div className="flex flex-wrap gap-2"><Badge tone={day.hoursStatus === "Qualified" ? "green" : day.hoursStatus === "ShortHours" ? "orange" : "gray"}>{localizeDigits(getHoursStatusLabel(day.hoursStatus, locale).label, locale)}</Badge><Badge tone={day.coverage === "Complete" ? "green" : "orange"}>{localizeDigits(getCoverageStatusLabel(day.coverage, locale).label, locale)}</Badge></div>;
  const stats = (day: NinjaEvaluationDay) => <dl className={styles.detailStats}>
    {[
      [isEn ? "Orders" : "الطلبات", metric(day.orders, 0)],
      [isEn ? "Working hours" : "ساعات العمل", formatHoursAsDuration(day.hours)],
      [isEn ? "Daily target" : "هدف اليوم", metric(day.target)],
      [isEn ? "Gap to target" : "الفرق عن الهدف", metric(day.gap)],
    ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
  </dl>;
  const issues = [
    !source || source.coverage === "Missing" ? (isEn ? "Daily performance data is missing. Missing values are not zero." : "بيانات أداء اليوم غير مكتملة. البيانات المفقودة لا تعني صفراً.") : null,
    source?.coverage === "AllocationMismatch" || riders.some(r => r.coverage === "AllocationMismatch") ? (isEn ? "Rider shares do not match the account total. Review the shared day." : "حصص المناديب لا تتطابق مع إجمالي الحساب. راجع توزيع اليوم المشترك.") : null,
    riders.some(r => r.responsibility === null) ? (isEn ? "Responsibility shares still need to be confirmed." : "حصص المسؤولية تحتاج إلى تحديد.") : null,
    riders.some(r => r.hoursStatus === "PartialShiftUnknown") ? (isEn ? "Attendance for a split shift is unresolved; the account total alone does not qualify each rider." : "حضور اليوم المقسوم غير محسوم؛ مجموع ساعات الحساب لا يؤهل كل مندوب تلقائياً.") : null,
  ].filter(Boolean);
  return <div className={styles.calculation}>
    {issues.length > 0 && <div className={styles.dataNotice}><strong>{isEn ? "Needs review" : "يحتاج مراجعة"}</strong>{issues.map(issue => <p key={issue}>{issue}</p>)}</div>}
    <section className={styles.calculationSection}>
      <div className={styles.detailHeader}><h3>{isEn ? "Account activity for this day" : "أداء الحساب لهذا اليوم"}</h3>{source && badges(source)}</div>
      {source ? <>{stats(source)}<div className={styles.meta}><span>{pricing(source)}</span><span>{isEn ? "Planned responsibility" : "المسؤولية المخططة"}: {source.responsibility === null ? (isEn ? "Unresolved" : "غير محددة") : `${metric(source.responsibility * 100, 0)}%`}</span>{source.importedAtUtc && <span>{isEn ? "Last imported" : "آخر استيراد"}: {formatRiyadhDateTime(source.importedAtUtc, locale)}</span>}</div></> : <p className={styles.empty}>{isEn ? "No performance data for this day." : "لا توجد بيانات أداء لهذا اليوم."}</p>}
    </section>
    <section className={styles.calculationSection}>
      <h3>{isEn ? "Riders who worked this day" : "المناديب العاملون في هذا اليوم"}<span className="ms-2 font-normal text-[var(--muted)]">({localizeDigits(riders.length, locale)})</span></h3>
      <p className={styles.meta}>{isEn ? "Activity is attributed to each rider's assignment on this date." : "يوزّع الأداء حسب تكليف كل مندوب في هذا التاريخ."}</p>
      {riders.length === 0 ? <p className={styles.empty}>{isEn ? "No rider assignment for this day." : "لا يوجد تكليف مندوب لهذا اليوم."}</p> : riders.map((rider, index) => <div key={`${rider.assignmentId}-${index}`} className={styles.riderShare}>
        <div className={styles.detailHeader}><strong>{(rider.riderProfileId && riderNamesMap[rider.riderProfileId]) || (isEn ? `Rider ${localizeDigits(index + 1, locale)} (name unavailable)` : `مندوب ${localizeDigits(index + 1, locale)} (الاسم غير متاح)`)}</strong>{badges(rider)}</div>
        {stats(rider)}
        <div className={styles.meta}><span>{pricing(rider)}</span><span>{isEn ? "Responsibility share" : "حصة المسؤولية"}: {rider.responsibility === null ? (isEn ? "Unresolved" : "غير محددة") : `${metric(rider.responsibility * 100, 0)}%`}</span><span>{rider.allocationOrigin === "Reported" ? (isEn ? "From imported performance" : "من بيانات الأداء المستوردة") : rider.allocationOrigin === "Declared" ? (isEn ? "From a declared share" : "حسب الحصة المُقرّة") : rider.allocationOrigin === "Remainder" ? (isEn ? "Remaining share" : "الحصة المتبقية") : (isEn ? "Share source needs review" : "مصدر الحصة يحتاج مراجعة")}</span></div>
      </div>)}
    </section>
    <details className={styles.advanced}>
      <summary className="flex items-center gap-2"><Info size={16} />{isEn ? "How is this day evaluated?" : "كيف يُقيّم هذا اليوم؟"}</summary>
      <div className="space-y-3 text-sm leading-7 text-[var(--muted)]">
        <p>{isEn ? "Account totals include all orders and hours. Each rider is evaluated on their allocated share." : "يعرض الحساب إجمالي الطلبات والساعات، ويُقيّم كل مندوب حسب حصته فقط."}</p>
        <p>{isEn ? "A full responsibility day requires at least 8 working hours. Sharing 3 and 5 hours does not automatically qualify both riders." : "يحتاج يوم المسؤولية الكامل إلى 8 ساعات عمل على الأقل. تقاسم 3 و5 ساعات لا يؤهل المندوبين تلقائياً."}</p>
        <p>{isEn ? "The daily target follows planned responsibility. Fewer hours or zero orders do not reduce the planned target." : "يُحدّد هدف اليوم حسب المسؤولية المخططة. نقص الساعات أو عدم تحقيق طلبات لا يُقلل الهدف المخطط."}</p>
      </div>
    </details>
  </div>;
}
