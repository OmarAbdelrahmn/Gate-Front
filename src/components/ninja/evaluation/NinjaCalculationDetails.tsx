"use client";

import { localizeDigits } from "./localizeDigits";

import { Info, AlertTriangle } from "lucide-react";
import { formatNullableMetric, formatSuggestedCurrency, formatRequiredDailyRate, getOrderBandLabel, getForecastAssumptionLabel, NINJA_EVALUATION_REQUIRED_LABELS, type NinjaEvaluationRow } from "@/lib/ninja/api";
import styles from "./evaluation.module.css";

export function NinjaCalculationDetails({ row, locale }: { row: NinjaEvaluationRow; locale: "ar" | "en" }) {
  const isEn = locale === "en";
  const money = row.suggestedMoney;
  const forecast = row.forecast || row.continuationScenario;
  const unreliable = forecast !== null && (!row.forecast || !forecast.reliable);
  const metric = (value: number | null, digits = 1) => formatNullableMetric(value, locale, digits);
  return <div className={styles.calculation} dir={isEn ? "ltr" : "rtl"}>
    <div className={styles.notice}><Info size={18} /><div><strong>{NINJA_EVALUATION_REQUIRED_LABELS[locale].basedOnOrdersAndHoursOnly}</strong><p>{NINJA_EVALUATION_REQUIRED_LABELS[locale].invoicePending}</p></div></div>
    <section className={styles.calculationSection}>
      <div className={styles.detailHeader}><h3>{isEn ? "Suggested amount to date" : "المبلغ المقترح حتى الآن"}</h3><span className={styles.meta}><bdi>{localizeDigits(row.requestedAsOf, locale)}</bdi></span></div>
      {money ? <dl className={styles.amountRows}>
        <div><dt>{NINJA_EVALUATION_REQUIRED_LABELS[locale].orderAmountBeforeAttendance}</dt><dd>{formatSuggestedCurrency(money.orderAmount, locale)}</dd></div>
        <div><dt>{isEn ? "Attendance adjustment" : "تعديل الحضور"}<span className={styles.meta}>{money.attendanceBasis === "ProjectedAttendance" ? (isEn ? "Based on projected attendance" : "حسب الحضور المتوقع") : (isEn ? "Based on attendance through cutoff" : "حسب الحضور حتى حد البيانات")}</span></dt><dd>{money.attendanceReduction ? (isEn ? "15% reduction applied" : "تم تطبيق تخفيض 15%") : (isEn ? "No reduction" : "بدون تخفيض")}</dd></div>
        <div className={styles.totalRow}><dt>{isEn ? "Suggested total" : "الإجمالي المقترح"}<span className={styles.meta}>{isEn ? "Provisional · before VAT & invoice adjustments" : "تقديري · قبل الضريبة وتعديلات الفاتورة"}</span></dt><dd>{formatSuggestedCurrency(money.suggestedAmount, locale)}</dd></div>
      </dl> : <div className={styles.dataNotice}><strong>{isEn ? "Amount unavailable / unresolved" : "المبلغ غير متاح / غير محسوم"}</strong><p>{isEn ? "Complete the missing performance, pricing or responsibility data before calculating this amount." : "يلزم استكمال بيانات الأداء أو التسعير أو المسؤولية قبل احتساب المبلغ."}</p></div>}
      {money && money.segments.length > 0 && <details className={styles.advanced}>
        <summary>{isEn ? "How the amount is calculated" : "كيف تم احتساب المبلغ؟"}</summary>
        {money.segments.map((segment, index) => <div className={styles.segment} key={`${segment.pricingType}-${index}`}>
          <div className={styles.detailHeader}><h4>{segment.pricingType === "BIKE" ? (isEn ? "Motorbike pricing" : "تسعير الدراجة") : (isEn ? "Car pricing" : "تسعير السيارة")}</h4><span className={styles.meta}>{getOrderBandLabel(segment.calculation.band, locale)}</span></div>
          <dl className={styles.detailStats}>
            {[
              [isEn ? "Responsibility units" : "وحدات المسؤولية", metric(segment.responsibility, 2)],
              [isEn ? "Prorated target" : "الهدف التناسبي", metric(segment.calculation.target)],
              [isEn ? "Prorated base" : "المبلغ الأساسي التناسبي", formatSuggestedCurrency(segment.calculation.base, locale)],
              [isEn ? "Completed orders" : "الطلبات المكتملة", metric(segment.calculation.orders, 0)],
              [isEn ? "Orders below target" : "الطلبات الناقصة عن الهدف", metric(segment.calculation.shortage)],
              [isEn ? "Extra orders" : "الطلبات الإضافية", metric(segment.calculation.extra)],
              [isEn ? "Rate per order" : "سعر الطلب", formatSuggestedCurrency(segment.calculation.rate, locale)],
              [isEn ? "Segment amount" : "مبلغ الشريحة", formatSuggestedCurrency(segment.calculation.amount, locale)],
            ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        </div>)}
      </details>}
    </section>
    <section className={styles.calculationSection}>
      <h3>{NINJA_EVALUATION_REQUIRED_LABELS[locale].projectedAmountIfPaceContinues}</h3>
      {unreliable && <div className={styles.forecastWarning}><AlertTriangle size={18} /><div><strong>{isEn ? "Unreliable continuation scenario" : "سيناريو استمراري غير موثوق"}</strong><p>{isEn ? "Coverage gaps make this scenario uncertain. Do not treat it as a reliable forecast." : "توجد فجوات في البيانات؛ هذا السيناريو غير مؤكد ولا يُعد توقعاً موثوقاً."}</p></div></div>}
      {forecast ? <>
        <dl className={styles.amountRows}>
          <div><dt>{isEn ? "Scenario" : "فرضية التوقع"}</dt><dd>{getForecastAssumptionLabel(forecast.assumption, locale)}</dd></div>
          <div><dt>{isEn ? "Projected orders" : "الطلبات المتوقعة"}</dt><dd>{metric(forecast.projectedOrders)}</dd></div>
          <div><dt>{isEn ? "Current daily rate" : "المعدل اليومي الحالي"}</dt><dd>{metric(forecast.dailyRunRate)} {isEn ? "orders / day" : "طلب / يوم"}</dd></div>
          <div><dt>{isEn ? "Required daily rate to reach target" : "المعدل اليومي المطلوب لتحقيق الهدف"}</dt><dd>{formatRequiredDailyRate(forecast.requiredDailyRate, forecast.remainingOrders, locale)}</dd></div>
          <div className={styles.totalRow}><dt>{unreliable ? (isEn ? "Scenario amount (unreliable)" : "مبلغ السيناريو (غير موثوق)") : (isEn ? "Projected amount" : "المبلغ المتوقع")}</dt><dd>{formatSuggestedCurrency(forecast.suggestedMoney?.suggestedAmount ?? null, locale)}</dd></div>
        </dl>
      </> : <p className={styles.empty}>{isEn ? "No forecast is available until coverage and evaluation context are complete." : "التوقع غير متاح حتى اكتمال البيانات وحسم سياق التقييم."}</p>}
    </section>
  </div>;
}
