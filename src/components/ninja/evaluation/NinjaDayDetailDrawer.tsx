// src/components/ninja/evaluation/NinjaDayDetailDrawer.tsx
"use client";

import { localizeDigits } from "./localizeDigits";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { EvaluationDialog as Modal } from "./EvaluationDialog";
import { NinjaDayDetailContent } from "./NinjaDayDetailContent";
import styles from "./evaluation.module.css";
import { Button } from "@/components/ui/Button";
import {
  ninjaEvaluationClient,
  type NinjaEvaluationDayDetail,
} from "@/lib/ninja/api";
import { RefreshCw, SlidersHorizontal, ArrowRightLeft } from "lucide-react";

interface NinjaDayDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string | null;
  captainId?: string | null;
  date: string | null;
  riderNamesMap: Record<string, string | null | undefined>;
  canManageEvaluation: boolean;
  onOpenSharedDayUsage?: (accountId: string, captainId: string | null, date: string) => void;
  onOpenManageAccount?: (accountId: string, captainId: string | null, tab: "context" | "responsibility") => void;
  locale: "ar" | "en";
}

export function NinjaDayDetailDrawer({
  isOpen,
  onClose,
  accountId,
  captainId,
  date,
  riderNamesMap,
  canManageEvaluation,
  onOpenSharedDayUsage,
  onOpenManageAccount,
  locale,
}: NinjaDayDetailDrawerProps) {
  const isEn = locale === "en";
  const [loading, setLoading] = useState(isOpen);
  const requestNumber = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<NinjaEvaluationDayDetail | null>(null);

  const loadDayDetail = useCallback(async () => {
    if (!accountId || !date) return;
    const request = ++requestNumber.current;
    setLoading(true);
    setError(null);
    try {
      const res = await ninjaEvaluationClient.day(accountId, date);
      if (request === requestNumber.current) setDetail(res);
    } catch (err: unknown) {
      if (request !== requestNumber.current) return;
      const e = err as { message?: string; status?: number };
      setError(
        e.message ||
          (isEn
            ? "Could not load day details. Please try again."
            : "تعذر تحميل تفاصيل اليوم من الخادم.")
      );
      setDetail(null);
    } finally {
      if (request === requestNumber.current) setLoading(false);
    }
  }, [accountId, date, isEn]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      if (isOpen && accountId && date) void loadDayDetail();
      else { setDetail(null); setError(null); }
    });
    return () => { cancelled = true; requestNumber.current += 1; };
  }, [isOpen, accountId, date, loadDayDetail]);

  const source = detail?.source ?? null;

  return (
    <Modal locale={locale} isOpen={isOpen} onClose={onClose} title={isEn ? `Day details — ${localizeDigits(date || "", locale)}` : `تفاصيل اليوم — ${localizeDigits(date || "", locale)}`} maxWidth="max-w-4xl">
      <div className="space-y-5" dir={isEn ? "ltr" : "rtl"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">{isEn ? "Orders, hours and rider shares for this day" : "الطلبات والساعات وحصص المناديب لهذا اليوم"}</p>
          <Button variant="secondary" size="sm" onClick={loadDayDetail} loading={loading}><RefreshCw size={16} />{isEn ? "Refresh" : "تحديث"}</Button>
        </div>
        {loading && <div role="status" className="flex items-center justify-center gap-3 py-12 text-sm text-[var(--muted)]"><RefreshCw size={20} className="animate-spin" />{isEn ? "Loading day details…" : "جارٍ تحميل تفاصيل اليوم…"}</div>}
        {!loading && error && <div role="alert" className="rounded-xl border border-rose-200 p-4 text-sm text-rose-700">{error}</div>}
        {!loading && !error && detail && <NinjaDayDetailContent detail={detail} riderNamesMap={riderNamesMap} locale={locale} />}
        {accountId && date && <details className={styles.advanced}>
          <summary>{isEn ? "Review or update day data" : "مراجعة أو تعديل بيانات اليوم"}</summary>
          <div className="flex flex-wrap gap-2">
            {onOpenSharedDayUsage && <Button variant="secondary" size="sm" onClick={() => onOpenSharedDayUsage(accountId, source?.captainId || captainId || null, date)}><ArrowRightLeft size={16} />{isEn ? "Review shared day" : "مراجعة اليوم المشترك"}</Button>}
            {canManageEvaluation && onOpenManageAccount && <>
              <Button variant="secondary" size="sm" onClick={() => onOpenManageAccount(accountId, source?.captainId || captainId || null, "responsibility")}><SlidersHorizontal size={16} />{isEn ? "Edit responsibility shares" : "تعديل حصص المسؤولية"}</Button>
              <Button variant="secondary" size="sm" onClick={() => onOpenManageAccount(accountId, source?.captainId || captainId || null, "context")}><SlidersHorizontal size={16} />{isEn ? "Edit pricing" : "تعديل التسعير"}</Button>
            </>}
          </div>
        </details>}
      </div>
    </Modal>
  );
}
