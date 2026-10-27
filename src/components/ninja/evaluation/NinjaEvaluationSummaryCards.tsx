// src/components/ninja/evaluation/NinjaEvaluationSummaryCards.tsx
"use client";

import { localizeDigits } from "./localizeDigits";

import React, { useState } from "react";
import styles from "./evaluation.module.css";
import { Badge } from "@/components/ui/Badge";
import {
  formatSuggestedCurrency,
  formatNullableMetric,
  formatHoursAsDuration,
  NINJA_EVALUATION_REQUIRED_LABELS,
  type NinjaEvaluationReport,
  type NinjaAccountResponse,
} from "@/lib/ninja/api";
import {
  CheckCircle2,
  Clock,
  Target,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  Info,
  Scale,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface NinjaEvaluationSummaryCardsProps {
  report: NinjaEvaluationReport;
  accountsMap: Record<string, NinjaAccountResponse | undefined>;
  isFilteredByRider: boolean;
  locale: "ar" | "en";
}

export function NinjaEvaluationSummaryCards({
  report,
  accountsMap,
  isFilteredByRider,
  locale,
}: NinjaEvaluationSummaryCardsProps) {
  const isEn = locale === "en";
  const [showComparisons, setShowComparisons] = useState(false);

  const { summary, items, requestedAsOf } = report;

  // Compute summary metrics across rows
  const targetAchievedCount = items.filter((r) => r.targetStatus === "TargetAchieved").length;
  const belowTargetCount = items.filter((r) => r.targetStatus === "BelowTarget").length;
  const unknownTargetCount = items.filter((r) => r.targetStatus === "Unknown").length;

  // Projected summary across rows on current page + reliability check
  const rowsWithReliableForecast = items.filter(
    (r) => r.forecast !== null && r.forecast.reliable && r.forecast.suggestedMoney !== null
  );
  const rowsWithContinuationScenario = items.filter(
    (r) => r.forecast === null && r.continuationScenario !== null
  );
  const pageProjectedSum =
    rowsWithReliableForecast.length > 0 &&
    rowsWithReliableForecast.length === items.length
      ? rowsWithReliableForecast.reduce(
          (acc, r) => acc + (r.forecast?.suggestedMoney?.suggestedAmount ?? 0),
          0
        )
      : null;

  return (
    <div className="space-y-4">
      <h2 className="sr-only">{isEn ? "Report summary" : "ملخص التقرير"}</h2>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}><span>{isEn ? "Completed orders" : "الطلبات المكتملة"}</span><CheckCircle2 /></div>
          <div className={styles.statValue}>{formatNullableMetric(summary.observedOrders, locale, 0)}</div>
          <p className={styles.statFoot}>{isEn ? `${localizeDigits(summary.riders, locale)} riders · ${localizeDigits(summary.accounts, locale)} accounts · all filtered results` : `${localizeDigits(summary.riders, locale)} مندوب · ${localizeDigits(summary.accounts, locale)} حساب · كامل النتائج المفلترة`}</p>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}><span>{isEn ? "Working hours" : "ساعات العمل"}</span><Clock /></div>
          <div className={styles.statValue}>{formatNullableMetric(summary.observedHours, locale, 1)}</div>
          <p className={styles.statFoot}>{isEn ? `All filtered results through ${localizeDigits(requestedAsOf, locale)}` : `كامل النتائج المفلترة حتى ${localizeDigits(requestedAsOf, locale)}`}</p>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}><span>{isEn ? "Target achieved" : "تحقيق الهدف"}</span><Target /></div>
          <div className={styles.statValue}>{localizeDigits(targetAchievedCount, locale)}<span className="ms-2 text-sm font-normal text-[var(--muted)]">/ {localizeDigits(items.length, locale)}</span></div>
          <p className={styles.statFoot}>{isEn ? `All results · ${localizeDigits(belowTargetCount, locale)} below target · ${localizeDigits(unknownTargetCount, locale)} unresolved` : `كامل النتائج · ${localizeDigits(belowTargetCount, locale)} تحت الهدف · ${localizeDigits(unknownTargetCount, locale)} غير محسوم`}</p>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}><span>{isEn ? "Suggestions missing data" : "مقترحات تحتاج بيانات"}</span><ShieldAlert /></div>
          <div className={styles.statValue}>{localizeDigits(summary.rowsMissingSuggestion, locale)}</div>
          <p className={styles.statFoot}>{summary.mixedCutoffs ? (isEn ? "Different coverage cutoffs across results" : "تواريخ اكتمال البيانات متفاوتة بين النتائج") : (isEn ? "All filtered results · consistent cutoffs" : "كامل النتائج المفلترة · حد بيانات موحد")}</p>
        </div>
      </div>
      <div className={styles.notice} role="note">
        <Info size={18} />
        <div><strong>{NINJA_EVALUATION_REQUIRED_LABELS[locale].basedOnOrdersAndHoursOnly} · {NINJA_EVALUATION_REQUIRED_LABELS[locale].invoicePending}</strong><p>{isEn ? "Provisional monitoring suggestions before VAT and external invoice adjustments. These amounts are not approved salary, payment entitlement or debt." : "مبالغ تقديرية للمتابعة قبل الضريبة وتعديلات الفاتورة الخارجية، ولا تُعد راتباً معتمداً أو مستحقاً واجب الصرف أو مديونية."}</p></div>
      </div>
      <section className={styles.section} aria-label={isEn ? "Suggested earnings" : "المبالغ المقترحة"}>
        <div className={styles.moneyGrid}>
          <div className={styles.money}>
            <h3><Scale size={18} />{isEn ? NINJA_EVALUATION_REQUIRED_LABELS.en.suggestedThroughCutoff(requestedAsOf) : NINJA_EVALUATION_REQUIRED_LABELS.ar.suggestedThroughCutoff}</h3>
            <div className={styles.moneyValue}>{formatSuggestedCurrency(summary.suggestedAmount, locale)}</div>
            <p>{summary.suggestedAmount === null ? (isEn ? "Total unavailable: some rows have missing coverage or different cutoffs." : "الإجمالي غير متاح بسبب نقص التغطية أو تفاوت حد البيانات لبعض الصفوف.") : (isEn ? "Total for all filtered results · provisional" : "إجمالي كامل النتائج المفلترة · تقديري")}</p>
          </div>
          <div className={styles.money}>
            <h3><TrendingUp size={18} />{NINJA_EVALUATION_REQUIRED_LABELS[locale].projectedAmountIfPaceContinues}</h3>
            <div className={styles.moneyValue}>{formatSuggestedCurrency(pageProjectedSum, locale)}</div>
            <p>{isEn ? "All filtered results · requires a reliable forecast for every displayed row." : "لكامل النتائج المفلترة · يتطلب توقعاً موثوقاً لكل صف معروض."}{rowsWithContinuationScenario.length > 0 && (isEn ? ` ${localizeDigits(rowsWithContinuationScenario.length, locale)} rows have an unreliable continuation scenario.` : ` ${localizeDigits(rowsWithContinuationScenario.length, locale)} صفوف لها سيناريو استمراري غير موثوق.`)}</p>
          </div>
        </div>
      </section>

      {/* Independent Account vs Rider Suggestions Comparison Section */}
      {summary.accountComparisons && summary.accountComparisons.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-[var(--foreground)]">
                  {isEn
                    ? "Independent Account vs. Rider Suggestion Comparisons"
                    : "مقارنة مستقلة بين مقترح المعرف (الحساب) ومجموع مقترحات المناديب"}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {isEn
                    ? "Rider suggestions are calculated independently for each rider's responsibility period and are never forced to match the account's contractual total."
                    : "مبلغ كل مندوب هو اقتراح مستقل لفترة مسؤوليته الخاصة، ولا يُشترط أن يساوي مجموع مقترحات الأفراد مبلغ المعرف."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowComparisons((v) => !v)}
              aria-expanded={showComparisons}
              aria-controls="ninja-account-comparisons"
              className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span>
                {showComparisons
                  ? isEn
                    ? "Hide Comparisons"
                    : "إخفاء المقارنات"
                  : isEn
                  ? `Show Comparisons (${localizeDigits(summary.accountComparisons.length, locale)})`
                  : `عرض المقارنات (${localizeDigits(summary.accountComparisons.length, locale)})`}
              </span>
              {showComparisons ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>

          {isFilteredByRider && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                {isEn
                  ? "Rider filter is active. Other riders on shared accounts may be excluded; the account suggestion still reflects the full account."
                  : "الفلترة حسب مندوب مفعّلة؛ قد لا يشمل السياق بقية المناديب على الحساب المشترك، بينما يظل مقترح الحساب معبّراً عن كامل الحساب."}
              </span>
            </div>
          )}

          {showComparisons && (
            <div id="ninja-account-comparisons" className={`mt-3 ${styles.comparisonScroll}`}>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-slate-50/70 text-[var(--muted)] dark:bg-slate-900/50">
                    <th className="px-3 py-2 text-start font-bold">
                      {isEn ? "Account / Captain ID" : "المعرف / الحساب"}
                    </th>
                    <th className="px-3 py-2 text-start font-bold">
                      {isEn ? "Account Cutoff" : "حد بيانات الحساب"}
                    </th>
                    <th className="px-3 py-2 text-start font-bold">
                      {isEn
                        ? "Account Suggested Amount"
                        : "مقترح المعرف (كامل الحساب)"}
                    </th>
                    <th className="px-3 py-2 text-start font-bold">
                      {isEn
                        ? "Sum of Rider Suggestions"
                        : "مجموع مقترحات المناديب"}
                    </th>
                    <th className="px-3 py-2 text-start font-bold">
                      {isEn
                        ? "Difference (Account - Riders)"
                        : "الفرق (المعرف - الأفراد)"}
                    </th>
                    <th className="px-3 py-2 text-start font-bold">
                      {isEn ? "Rider Context" : "اكتمال سياق الأفراد"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {summary.accountComparisons.map((comp) => {
                    const acc = accountsMap[comp.accountId];
                    return (
                      <tr key={comp.accountId} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                        <td className="px-3 py-2 font-bold text-[var(--foreground)]">
                          {localizeDigits(acc?.captainId || acc?.code || (isEn ? "Account" : "حساب"), locale)}
                          {(isEn ? acc?.sponsorNameEn || acc?.sponsorNameAr : acc?.sponsorNameAr) && (
                            <span className="ms-1.5 text-[11px] font-normal text-[var(--muted)]">
                              ({(isEn ? acc?.sponsorNameEn || acc?.sponsorNameAr : acc?.sponsorNameAr)})
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-[var(--muted)]">
                          {localizeDigits(comp.accountCutoff || (isEn ? "Unavailable" : "غير متاح"), locale)}
                        </td>
                        <td className="px-3 py-2 font-bold text-blue-700 dark:text-blue-300">
                          {formatSuggestedCurrency(comp.accountSuggestedAmount, locale)}
                        </td>
                        <td className="px-3 py-2 font-bold text-indigo-700 dark:text-indigo-300">
                          {formatSuggestedCurrency(comp.riderSuggestedAmounts, locale)}
                        </td>
                        <td className="px-3 py-2 font-bold">
                          {comp.difference === null ? (
                            <span className="text-[var(--muted)]">
                              {NINJA_EVALUATION_REQUIRED_LABELS[locale].unavailableData}
                            </span>
                          ) : (
                            <span
                              className={
                                comp.difference === 0
                                  ? "text-emerald-600"
                                  : "text-amber-700 dark:text-amber-400"
                              }
                            >
                              {formatSuggestedCurrency(comp.difference, locale)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {comp.riderContextComplete ? (
                            <Badge tone="green">
                              {isEn ? "Complete Context" : "سياق الأفراد مكتمل"}
                            </Badge>
                          ) : (
                            <Badge tone="orange">
                              {isEn
                                ? "Partial Rider Context (Filtered)"
                                : "سياق الأفراد غير مكتمل (مفلتر)"}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
