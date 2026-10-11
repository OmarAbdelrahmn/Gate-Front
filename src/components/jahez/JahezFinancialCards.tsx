// src/components/jahez/JahezFinancialCards.tsx
"use client";

import React from "react";
import type { JahezBalance } from "@/lib/jahez/types";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Coins,
  FileSpreadsheet,
  Info,
  Lock,
  Scale,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

interface JahezFinancialCardsProps {
  balance: JahezBalance;
  locale?: "ar" | "en";
  className?: string;
  compact?: boolean;
}

export function JahezFinancialCards({
  balance,
  locale = "ar",
  className = "",
  compact = false,
}: JahezFinancialCardsProps) {
  const isEn = locale === "en";

  const posted = balance.postedCommission ?? 0;
  const unposted = balance.unpostedCommission ?? 0;
  const totalCommission = Number((posted + unposted).toFixed(2));
  const fees = balance.fees ?? 0;
  const platformDebt = balance.platformDebt ?? 0;
  const totalReceivable = balance.totalReceivable ?? 0; // signed net balance
  const outstandingAmount =
    typeof balance.outstandingAmount === "number"
      ? balance.outstandingAmount
      : Math.max(0, fees) + Math.max(0, platformDebt) + Math.max(0, totalCommission);
  const accountReceivable =
    typeof balance.accountReceivable === "number"
      ? balance.accountReceivable
      : balance.debtTransferred
      ? 0
      : totalReceivable;

  const hasCreditOffset = outstandingAmount !== totalReceivable && (platformDebt < 0 || fees < 0 || totalCommission < 0);

  const formatSAR = (num: number) => {
    return `${num.toLocaleString("ar-SA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ر.س`;
  };

  const formatRiyadhDate = (isoStr?: string | null) => {
    if (!isoStr) return "-";
    try {
      const d = new Date(isoStr);
      return new Intl.DateTimeFormat("ar-SA", {
        timeZone: "Asia/Riyadh",
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(d);
    } catch {
      return isoStr.split("T")[0];
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Critical Notices / Commission incomplete / Freeze cutoff */}
      {!balance.commissionComplete && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/20 text-sm text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <span className="font-bold block">
                {isEn
                  ? "Commission calculation is incomplete for this period; review earnings statements."
                  : "حساب العمولة غير مكتمل؛ راجع بيانات الأرباح."}
              </span>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90">
                {isEn
                  ? "The displayed commission total is not final. Complete earnings statements are required before account clearance or paid confirmation."
                  : "المبلغ المعروض للعمولة غير نهائي. يتطلب تصفية الحساب أو تأكيد اكتمال السداد إدخال وتغطية كشوف الأرباح كاملة."}
              </p>
              {balance.problems && balance.problems.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-xs space-y-0.5 text-amber-900/90 dark:text-amber-300">
                  {balance.problems.map((prob, idx) => (
                    <li key={idx} className="font-mono">
                      {prob}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {balance.frozenAtUtc && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2.5">
          <Lock className="h-4 w-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          <span>
            {isEn
              ? `Commission accrual stopped after Riyadh day ${formatRiyadhDate(balance.frozenAtUtc)} (inclusive).`
              : `توقفت العمولة بعد يوم ${formatRiyadhDate(balance.frozenAtUtc)} (شاملًا هذا اليوم). الحساب محجوز للمندوب.`}
          </span>
        </div>
      )}

      {balance.accountClearedAtUtc && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>
            {isEn
              ? `Account was cleared with Jahez on ${formatRiyadhDate(balance.accountClearedAtUtc)}. Outstanding debt remains on the original rider.`
              : `تمت تصفية الحساب مع جاهز بتاريخ ${formatRiyadhDate(balance.accountClearedAtUtc)}. المديونية الحالية مستحقة على المندوب الأصلي.`}
          </span>
        </div>
      )}

      {balance.debtPaidAtUtc && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/80 p-3 shadow-sm dark:border-teal-900/40 dark:bg-teal-950/20 text-xs text-teal-800 dark:text-teal-200 flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
          <span>
            {isEn
              ? `Last paid confirmation recorded on ${formatRiyadhDate(balance.debtPaidAtUtc)}.`
              : `آخر تأكيد لسداد المديونية مسجل بتاريخ ${formatRiyadhDate(balance.debtPaidAtUtc)}.`}
          </span>
        </div>
      )}

      {hasCreditOffset && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 shadow-sm dark:border-sky-900/40 dark:bg-sky-950/20 text-xs text-sky-800 dark:text-sky-200 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-sky-600 dark:text-sky-400 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold block">
              {isEn ? "Note: Bucket credit does not offset separate liabilities." : "تنبيه: الرصيد الدائن في إحدى السلات لا يسقط مستحقات السلات الأخرى تلقائيًا."}
            </span>
            <p className="text-[11px] text-sky-700 dark:text-sky-300 mt-0.5">
              {isEn
                ? `Total collectible outstanding (${formatSAR(outstandingAmount)}) differs from signed net (${formatSAR(totalReceivable)}) due to credit balance.`
                : `المبلغ المطلوب تحصيله (${formatSAR(outstandingAmount)}) يختلف عن صافي رصيد الفترة (${formatSAR(totalReceivable)}) لوجود رصيد دائن.`}
            </p>
          </div>
        </div>
      )}

      {/* 2. Primary 2 Core Cards: Collectible Outstanding vs Net Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Collectible Outstanding (إجمالي المطلوب من المندوب) */}
        <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/90 to-amber-100/40 p-5 shadow-sm dark:border-amber-700/60 dark:from-amber-950/30 dark:to-amber-900/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              {isEn ? "Collectible Outstanding (From Rider)" : "إجمالي المطلوب من المندوب"}
            </span>
            <span className="text-[11px] rounded-md bg-amber-200/80 px-2 py-0.5 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 font-semibold">
              {isEn ? "Authoritative to Collect" : "الأساس في التحصيل"}
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-extrabold text-amber-950 dark:text-amber-100 font-mono">
              {formatSAR(outstandingAmount)}
            </p>
          </div>

          <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-300/80">
            {isEn
              ? "Sum of positive buckets: max(0, fees) + max(0, debt) + max(0, commission)."
              : "مجموع السلات الإيجابية: الأرصدة المستحقة فقط دون خصم السلات الدائنة."}
          </p>
        </div>

        {/* Card 2: Net Balance of Period (صافي رصيد الفترة) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-gray-400" />
              {isEn ? "Signed Net Balance of Period" : "صافي رصيد الفترة"}
            </span>
            <span className="text-[11px] rounded-md bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-400 font-mono">
              {totalReceivable >= 0 ? "+Net" : "-Credit"}
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <p
              className={`text-3xl font-bold font-mono ${
                totalReceivable > 0
                  ? "text-gray-900 dark:text-white"
                  : totalReceivable < 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-gray-500"
              }`}
            >
              {formatSAR(totalReceivable)}
            </p>
          </div>

          <p className="mt-2 text-xs text-gray-400">
            {isEn
              ? "Mathematical net: fees + platformDebt + totalCommission."
              : "الصافي الحسابي الشامل: الرسوم + مديونية جاهز + العمولات."}
          </p>
        </div>
      </div>

      {/* 3. Detailed Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Fees */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-850">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block truncate">
            {isEn ? "Remaining Account Fee" : "رسوم الحساب المتبقية"}
          </span>
          <p className="mt-1 text-base font-bold text-gray-900 dark:text-white font-mono">
            {formatSAR(fees)}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">fees</span>
        </div>

        {/* Platform Debt */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-850">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block truncate">
            {isEn ? "Jahez Platform Debt" : "رصيد مديونية جاهز"}
          </span>
          <p
            className={`mt-1 text-base font-bold font-mono ${
              platformDebt > 0
                ? "text-red-600 dark:text-red-400"
                : platformDebt < 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {formatSAR(platformDebt)}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">platformDebt</span>
        </div>

        {/* Total Commission */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-850">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block truncate">
            {isEn ? "Total Commission" : "إجمالي العمولة"}
          </span>
          <p className="mt-1 text-base font-bold text-gray-900 dark:text-white font-mono">
            {formatSAR(totalCommission)}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">posted + unposted</span>
        </div>

        {/* Posted Commission */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-850">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block truncate">
            {isEn ? "Posted Commission" : "عمولة مرحلة"}
          </span>
          <p className="mt-1 text-base font-bold text-gray-700 dark:text-gray-300 font-mono">
            {formatSAR(posted)}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">postedCommission</span>
        </div>

        {/* Unposted Commission */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-850">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 block truncate">
            {isEn ? "Unposted Commission" : "عمولة غير مرحلة"}
          </span>
          <p className="mt-1 text-base font-bold text-gray-700 dark:text-gray-300 font-mono">
            {formatSAR(unposted)}
          </p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">unpostedCommission</span>
        </div>

        {/* Account Attributed Receivable */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300 block truncate">
            {isEn ? "Attributed to Account" : "رصيد الفترة على الحساب"}
          </span>
          <p className="mt-1 text-base font-bold text-indigo-900 dark:text-indigo-200 font-mono">
            {formatSAR(accountReceivable)}
          </p>
          <span className="text-[10px] text-indigo-500 mt-0.5 block">
            {balance.debtTransferred ? (isEn ? "0 (Transferred)" : "0 (تم النقل)") : "accountReceivable"}
          </span>
        </div>
      </div>
    </div>
  );
}
