"use client";

import React from "react";

export function ReportSkeleton({ cardCount = 4, showTable = false }: { cardCount?: number; showTable?: boolean }) {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading report data...">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-96 rounded-lg bg-slate-100 dark:bg-slate-800/60" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-9 w-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>

      {/* Metric Cards Skeleton Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cardCount }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="size-9 rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="h-8 w-20 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-36 rounded bg-slate-100 dark:bg-slate-800/60 pt-2 border-t border-[var(--border)]" />
          </div>
        ))}
      </div>

      {/* Optional Table Skeleton */}
      {showTable && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-24 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-20 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 w-24 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
