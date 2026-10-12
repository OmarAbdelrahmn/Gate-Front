// src/components/jahez/JahezRiderDebtSummaryCard.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getJahezRiderAllPeriods, getJahezRiderDebtSummary } from "@/lib/jahez/api";
import type { JahezRiderDebtSummary } from "@/lib/jahez/types";
import { JahezPaymentStatusBadge } from "./JahezPaymentStatusBadge";
import {
  Coins,
  Scale,
  Lock,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface JahezRiderDebtSummaryCardProps {
  riderId: string;
  locale?: "ar" | "en";
  className?: string;
}

export function JahezRiderDebtSummaryCard({
  riderId,
  locale = "ar",
  className = "",
}: JahezRiderDebtSummaryCardProps) {
  const isEn = locale === "en";

  const [summary, setSummary] = useState<JahezRiderDebtSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSummary = async () => {
    if (!riderId) return;
    setLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);

    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await getJahezRiderAllPeriods(riderId, today);
      setSummary(res.summary);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status ?? 500;
      const msg = err instanceof Error ? err.message : "تعذر استعلام ملخص مديونية المندوب";
      setErrorStatus(status);
      setErrorMessage(msg);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [riderId]);

  if (loading) {
    return (
      <div className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`}>
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-amber-600" />
          <span className="text-sm text-gray-500">
            {isEn ? "Loading Jahez debt summary..." : "جارٍ استعلام ملخص مستحقات جاهز للمندوب..."}
          </span>
        </div>
      </div>
    );
  }

  // 404 Rider does not exist
  if (errorStatus === 404) {
    return (
      <div className={`rounded-2xl border border-gray-200 bg-gray-50/70 p-5 dark:border-gray-800 dark:bg-gray-900/50 ${className}`}>
        <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
          <HelpCircle className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold block text-gray-800 dark:text-gray-200">
              {isEn ? "Rider Profile Not Found in Jahez" : "ملف المندوب غير مسجل في نظام جاهز"}
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEn
                ? "This rider profile has no corresponding record in the Jahez system."
                : "معرف المندوب غير موجود في سجلات مناديب جاهز (404)."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error other than 404
  if (errorStatus && errorStatus !== 404) {
    return (
      <div className={`rounded-2xl border border-red-200 bg-red-50/80 p-5 dark:border-red-900/60 dark:bg-red-950/20 ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 text-sm text-red-800 dark:text-red-200">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold block">
                {isEn ? "Failed to Load Jahez Debt Summary" : "تعذر استعلام ملخص مديونية جاهز"}
              </span>
              <p className="text-xs text-red-700/80 dark:text-red-300/80 mt-0.5">
                {errorMessage}
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={fetchSummary} className="h-8 text-xs">
            {isEn ? "Retry" : "إعادة المحاولة"}
          </Button>
        </div>
      </div>
    );
  }

  // Existing rider with zero periods or empty summary
  const hasZeroDebts =
    summary &&
    summary.outstandingAmount === 0 &&
    summary.totalReceivable === 0 &&
    summary.fees === 0 &&
    summary.platformDebt === 0 &&
    (summary.postedCommission + summary.unpostedCommission) === 0 &&
    summary.frozenAccountCount === 0;

  const formatSAR = (num?: number) => {
    return `${(num ?? 0).toLocaleString("ar-SA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ر.س`;
  };

  const commTotal = (summary?.postedCommission ?? 0) + (summary?.unpostedCommission ?? 0);

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4 ${className}`}>
      {/* Header with Title and Payment Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              {isEn ? "Jahez Total Liability Summary" : "ملخص مديونيات ومستحقات جاهز (كافة الفترات)"}
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {isEn
              ? "All historical periods (active, closed, frozen, transferred, and cleared) for this rider."
              : "يشمل جميع فترات المندوب (المفتوحة، المغلقة، المجمدة، المنقولة، والمصفاة) دون تكرار حسابات التشغيل."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {summary && (
            <JahezPaymentStatusBadge
              status={summary.paymentStatus}
              locale={locale}
            />
          )}

          {summary && summary.frozenAccountCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
              <Lock className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              <span>
                {isEn
                  ? `${summary.frozenAccountCount} Frozen Accounts`
                  : `${summary.frozenAccountCount} حسابات مجمدة`}
              </span>
            </span>
          )}
        </div>
      </div>

      {hasZeroDebts ? (
        <div className="py-6 text-center text-gray-500">
          <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
          <p className="font-semibold text-gray-800 dark:text-gray-200">
            {isEn ? "No Amounts Due for Collection" : "لا توجد مبالغ مستحقة للتحصيل"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {isEn
              ? "This rider currently has no outstanding fees, debt, or unposted commissions to collect."
              : "لا توجد رسوم أو مديونيات أو عمولات تشغيل مستحقة للتحصيل على هذا المندوب حاليًا."}
          </p>
        </div>
      ) : summary ? (
        <>
          {/* Main 2 Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
                {isEn ? "Total Collectible Outstanding" : "إجمالي المطلوب من المندوب"}
              </span>
              <p className="mt-1 text-2xl font-black text-amber-950 dark:text-amber-100 font-mono">
                {formatSAR(summary.outstandingAmount)}
              </p>
              <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5 block">
                {isEn ? "Sum of positive receivables to collect" : "مجموع الذمم الإيجابية المطلوب تحصيلها"}
              </span>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-850">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {isEn ? "Signed Net Balance (Across Periods)" : "صافي رصيد المندوب الشامل"}
              </span>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white font-mono">
                {formatSAR(summary.totalReceivable)}
              </p>
              <span className="text-[11px] text-gray-400 mt-0.5 block">
                {isEn ? "Net signed balance including credits" : "الصافي الحسابي شاملاً الأرصدة الدائنة"}
              </span>
            </div>
          </div>

          {/* Breakdown Mini Cards */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-850">
              <span className="text-[11px] text-gray-500 block">{isEn ? "Fees" : "رسوم الحساب"}</span>
              <span className="font-bold text-gray-900 dark:text-white font-mono text-sm block mt-0.5">
                {formatSAR(summary.fees)}
              </span>
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-850">
              <span className="text-[11px] text-gray-500 block">{isEn ? "Platform Debt" : "مديونية جاهز"}</span>
              <span className="font-bold text-gray-900 dark:text-white font-mono text-sm block mt-0.5">
                {formatSAR(summary.platformDebt)}
              </span>
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-850">
              <span className="text-[11px] text-gray-500 block">{isEn ? "Commission" : "إجمالي العمولة"}</span>
              <span className="font-bold text-gray-900 dark:text-white font-mono text-sm block mt-0.5">
                {formatSAR(commTotal)}
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5">
                {isEn
                  ? `Posted: ${formatSAR(summary.postedCommission)} | Unposted: ${formatSAR(summary.unpostedCommission)}`
                  : `مرحّلة: ${formatSAR(summary.postedCommission)} | غير مرحّلة: ${formatSAR(summary.unpostedCommission)}`}
              </span>
            </div>
          </div>
        </>
      ) : null}

      {/* Navigation Links to Periods and Debts */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/jahez/debts?riderId=${encodeURIComponent(riderId)}`}
            className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-800 dark:text-amber-400"
          >
            <span>{isEn ? "View in Debts Monitor" : "عرض في شاشة المديونيات"}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          <Link
            href={`/admin/jahez/handovers?riderId=${encodeURIComponent(riderId)}`}
            className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-800 dark:text-indigo-400"
          >
            <span>{isEn ? "View Handover Periods" : "عرض فترات التسليم"}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        <Button
          variant="secondary"
          onClick={fetchSummary}
          className="h-7 text-[11px] px-2 flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          {isEn ? "Refresh" : "تحديث"}
        </Button>
      </div>
    </div>
  );
}
