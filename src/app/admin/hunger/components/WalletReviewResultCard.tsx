// src/app/admin/hunger/components/WalletReviewResultCard.tsx
"use client";

import { Badge } from "@/components/ui/Badge";
import type { HungerWalletReviewResponse } from "@/lib/hunger/types";
import { getClosingSourceMeta, resolveHungerEvidenceUrl } from "@/lib/hunger/api";
import { AlertTriangle, Clock, ExternalLink, FileImage, ShieldAlert } from "lucide-react";

interface WalletReviewResultCardProps {
  title: string;
  review: HungerWalletReviewResponse;
  fallbackCurrentPeriodBalance?: number | null;
}

function formatNullableAmount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "غير معروف";
  }
  const num = Number(value);
  return `${num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2)} SAR`;
}

function formatExpiryTime(expiresAtUtc?: string | null): string {
  if (!expiresAtUtc) return "20 دقيقة من الإنشاء";
  try {
    const dt = new Date(expiresAtUtc);
    if (Number.isNaN(dt.getTime())) return expiresAtUtc;
    return dt.toLocaleString("ar-SA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return expiresAtUtc;
  }
}

export function WalletReviewResultCard({
  title,
  review,
}: WalletReviewResultCardProps) {
  const isBlocked = review.canConfirm === false;
  const isPriorCloseUnknown =
    review.closingBalance === null ||
    review.closingSource === "InvoiceAbsent" ||
    review.closingSource === "Unknown";
  const closingSourceMeta = getClosingSourceMeta(review.closingSource);

  return (
    <div
      className={`space-y-2.5 rounded-xl border p-3.5 text-xs ${
        isBlocked
          ? "border-amber-300 bg-amber-50/80 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          : "border-emerald-300 bg-emerald-50/80 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
        <span>{title}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {review.closingSource && (
            <Badge tone={closingSourceMeta.badgeTone}>
              مصدر الإقفال: {closingSourceMeta.labelAr}
            </Badge>
          )}
          <Badge tone={isBlocked ? "orange" : "green"}>
            {isBlocked ? "غير قابل للتأكيد" : "جاهزة للتأكيد النهائي"}
          </Badge>
        </div>
      </div>

      {isPriorCloseUnknown && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 p-2.5 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <p className="font-bold">
            لا يوجد إقفال أو فاتورة مسجلة للشهر السابق — سجّل الفاتورة أو الإقفال الشهري ثم أنشئ مراجعة جديدة
          </p>
        </div>
      )}

      {review.requiresException && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-100/80 p-2.5 text-amber-950 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-0.5">
            <p className="font-bold">
              يتطلب استثناء تسليم برصيد غير صفري (NonZeroHandover)
            </p>
            <p className="text-[11px]">
              رصيد المحفظة المنسوب غير صفري ({formatNullableAmount(review.attributedBalance)}). يرجى طلب استثناء واعتماده ثم إعادة المراجعة مع ربط الاستثناء المعتمد لتفعيل التأكيد.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--surface)]/90 p-2.5 text-[11px]">
        <div>
          <span className="text-[var(--muted)]">رصيد الجوال:</span>
          <p className="font-bold text-[var(--foreground)]" dir="ltr">
            {formatNullableAmount(review.mobileBalance)}
          </p>
        </div>
        <div>
          <span className="text-[var(--muted)]">رصيد الإقفال السابق:</span>
          <p className="font-bold text-[var(--foreground)]" dir="ltr">
            {formatNullableAmount(review.closingBalance)}
          </p>
        </div>
        <div>
          <span className="text-[var(--muted)]">التسويات المثبتة:</span>
          <p className="font-bold text-[var(--foreground)]" dir="ltr">
            {formatNullableAmount(review.provenAdjustments)}
          </p>
        </div>
        <div>
          <span className="text-[var(--muted)]">صافي رصيد الفترة الحالية:</span>
          <p className="font-extrabold text-[var(--foreground)]" dir="ltr">
            {isPriorCloseUnknown && review.currentPeriodBalance === null
              ? "غير معروف"
              : formatNullableAmount(review.currentPeriodBalance)}
          </p>
        </div>
        <div>
          <span className="text-[var(--muted)]">الرصيد المنسوب (Attributed):</span>
          <p className="font-bold text-[var(--foreground)]" dir="ltr">
            {isPriorCloseUnknown &&
            (review.attributedBalance === null ||
              review.attributedBalance === undefined)
              ? "غير معروف"
              : formatNullableAmount(review.attributedBalance)}
          </p>
        </div>
        <div>
          <span className="text-[var(--muted)]">التغير في ذمة المندوب:</span>
          <p className="font-bold text-[var(--foreground)]" dir="ltr">
            {isPriorCloseUnknown &&
            (review.riderBalanceChange === null ||
              review.riderBalanceChange === undefined)
              ? "غير معروف"
              : formatNullableAmount(review.riderBalanceChange)}
          </p>
        </div>
      </div>

      {/* Wallet Evidence Image / Reference */}
      {(() => {
        if (!review.walletEvidence) {
          return (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--surface)]/90 p-2.5 text-[11px]">
              <span className="text-[var(--muted)]">صورة إثبات المحفظة:</span>
              <span className="text-[var(--muted)]">لم يتم إرفاق صورة</span>
            </div>
          );
        }
        const resolvedUrl = resolveHungerEvidenceUrl(review.walletEvidence);
        if (resolvedUrl) {
          return (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--surface)]/90 p-2.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <FileImage className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-[var(--muted)]">مستند إثبات المحفظة:</span>
              </div>
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline dark:text-blue-400"
              >
                <span>عرض صورة الإثبات</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          );
        }
        return (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--surface)]/90 p-2.5 text-[11px]">
            <span className="text-[var(--muted)]">مرجع إثبات المحفظة:</span>
            <span
              className="font-mono font-medium text-[var(--foreground)]"
              dir="ltr"
            >
              {review.walletEvidence}
            </span>
          </div>
        );
      })()}

      <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span>تاريخ انتهاء صلاحية المراجعة (expiresAtUtc):</span>
        <strong className="text-[var(--foreground)]" dir="ltr">
          {formatExpiryTime(review.expiresAtUtc)}
        </strong>
      </div>

      {review.summary && (
        <p className="text-[11px] font-medium">{review.summary}</p>
      )}

      {review.warnings && review.warnings.length > 0 && (
        <ul className="list-inside list-disc space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
          {review.warnings.map((w, idx) => (
            <li key={idx}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
