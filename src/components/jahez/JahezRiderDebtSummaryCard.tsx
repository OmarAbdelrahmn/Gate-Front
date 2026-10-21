// src/components/jahez/JahezRiderDebtSummaryCard.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  getAllJahezAdministrativeDebts,
  getJahezRiderTransferredDebts,
  getJahezRiderTransferredDebtsSummary,
} from "@/lib/jahez/api";
import type { AdministrativeDebt, TransferredDebt, RiderTransferredDebtSummary } from "@/lib/jahez/types";
import { Coins, ExternalLink, RefreshCw, CheckCircle2 } from "lucide-react";

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

  const [adminDebts, setAdminDebts] = useState<AdministrativeDebt[]>([]);
  const [transferredDebts, setTransferredDebts] = useState<TransferredDebt[]>([]);
  const [debtSummary, setDebtSummary] = useState<RiderTransferredDebtSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchData = async () => {
    if (!riderId) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const [debtsRes, summaryRes, transfersRes] = await Promise.allSettled([
        getAllJahezAdministrativeDebts(100),
        getJahezRiderTransferredDebtsSummary(riderId),
        getJahezRiderTransferredDebts(riderId, 1, 50),
      ]);

      if (debtsRes.status === "fulfilled") {
        const myDebts = (debtsRes.value.items || []).filter(
          (d) => d.riderProfileId === riderId,
        );
        setAdminDebts(myDebts);
      }

      if (summaryRes.status === "fulfilled") {
        setDebtSummary(summaryRes.value);
      }

      if (transfersRes.status === "fulfilled") {
        setTransferredDebts(transfersRes.value?.items || []);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "خطأ أثناء تحميل بيانات جاهز");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [riderId]);

  if (loading) {
    return (
      <div
        className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`}
      >
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-amber-600" />
          <span className="text-xs text-gray-500">
            {isEn ? "Checking Jahez commitments..." : "جارٍ استعلام مستحقات والتزامات جاهز للمندوب..."}
          </span>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return null; // Gracefully hide if error occurs
  }

  const unpaidTransfers = transferredDebts.filter((t) => !t.paidAtUtc);
  const totalAdminDebt = adminDebts.reduce((sum, d) => sum + (d.platformDebt || 0), 0);
  const hasOutstandingTransferred =
    (debtSummary ? debtSummary.unpaidDebtCount > 0 || debtSummary.outstandingAmount > 0 : false) ||
    unpaidTransfers.length > 0;
  const totalUnpaidTransfer =
    debtSummary?.outstandingAmount ??
    unpaidTransfers.reduce((sum, t) => sum + (t.amount || 0), 0);

  if (adminDebts.length === 0 && !hasOutstandingTransferred) {
    return (
      <div
        className={`rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              {isEn
                ? "No outstanding Jahez transferred debts."
                : "لا توجد التزامات مرحلة غير مسددة على المندوب في جاهز."}
            </span>
          </div>
          <Link
            href="/admin/jahez/cashbox"
            className="flex items-center gap-1 font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
          >
            <span>{isEn ? "Transferred Debts" : "مديونيات جاهز المرحلة"}</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border ${
        hasOutstandingTransferred
          ? "border-amber-300 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20"
          : "border-blue-300 bg-blue-50/60 dark:border-blue-900/50 dark:bg-blue-950/20"
      } p-3 text-xs shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Coins className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              {hasOutstandingTransferred
                ? isEn
                  ? "Jahez Transferred Debt (Collection in Progress)"
                  : "التزام مالي مرحل غير مسدد في جاهز (قيد التحصيل)"
                : isEn
                ? "Jahez Administrative Monitoring"
                : "متابعة مديونية جاهز الإدارية"}
            </div>
            <div className="mt-1 flex flex-wrap gap-4 text-gray-600 dark:text-gray-300">

              {hasOutstandingTransferred && (
                <div>
                  <span className="font-medium text-rose-700 dark:text-rose-300">
                    {isEn ? "Transferred Debt: " : "المبلغ المرحل غير المسدد: "}
                  </span>
                  <span className="font-bold text-rose-800 dark:text-rose-200">
                    {totalUnpaidTransfer.toFixed(2)} ر.س
                  </span>
                </div>
              )}
              {totalAdminDebt !== 0 && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    {isEn ? "Administrative Debt: " : "المديونية الإدارية (للمتابعة): "}
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {totalAdminDebt.toFixed(2)} ر.س
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Link
          href={hasOutstandingTransferred ? "/admin/jahez/cashbox" : "/admin/jahez/statistics"}
          className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200"
        >
          <span>{hasOutstandingTransferred ? (isEn ? "Settle Debt" : "سداد المرحل") : (isEn ? "View" : "عرض")}</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
