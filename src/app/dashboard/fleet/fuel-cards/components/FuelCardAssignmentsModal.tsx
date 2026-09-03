"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { X, History, RefreshCw, ExternalLink, Calendar, UserCheck, ShieldCheck } from "lucide-react";
import {
  getFuelCardAssignments,
  FuelCard,
  FuelCardAssignment,
} from "@/lib/fleet/fuel-cards-api";

interface FuelCardAssignmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: FuelCard | null;
}

export function FuelCardAssignmentsModal({
  isOpen,
  onClose,
  card,
}: FuelCardAssignmentsModalProps) {
  const [assignments, setAssignments] = useState<FuelCardAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && card) {
      setLoading(true);
      setError(null);
      getFuelCardAssignments(card.id)
        .then((data) => setAssignments(data || []))
        .catch((err) => {
          console.error("Failed to load assignments history:", err);
          setError(err?.message || "تعذر تحميل سجل التعيينات");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, card]);

  if (!isOpen || !card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" dir="rtl">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <History size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                سجل تعيينات بطاقة الوقود
              </h3>
              <p className="text-xs text-[var(--muted)]">
                رقم البطاقة: <span dir="auto" className="fuel-plate font-bold text-[#1167c9]">{card.cardNumber}</span> ({card.providerNameAr})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--muted)] hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-[var(--muted)] text-xs">
              <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-[#1167c9]" />
              جاري تحميل سجل التعيينات...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 text-red-600 text-xs text-center font-semibold">
              {error}
            </div>
          ) : assignments.length === 0 ? (
            <div className="py-12 text-center text-[var(--muted)] text-xs">
              لا يوجد سجل تعيينات سابق لهذه البطاقة.
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((item, idx) => {
                const isActive = item.effectiveTo === null;

                return (
                  <div
                    key={item.id || idx}
                    className={`p-4 rounded-xl border transition-all ${
                      isActive
                        ? "bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 shadow-xs"
                        : "bg-[var(--surface)] border-[var(--border)]"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dashed border-[var(--border)] pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <UserCheck size={16} className={isActive ? "text-[#1167c9]" : "text-slate-400"} />
                        <Link
                          href={`/dashboard/employees/${item.employeeId}`}
                          className="font-bold text-sm text-[#1167c9] hover:underline flex items-center gap-1"
                        >
                          {item.riderNameAr || item.riderNameEn || "مندوب"}
                          <ExternalLink size={12} className="opacity-60" />
                        </Link>
                        {isActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            تعيين نشط حالياً
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            منتهي
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-mono font-semibold text-[var(--muted)] flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="dir-ltr">{item.effectiveFrom}</span>
                        <span>إلى</span>
                        <span className="dir-ltr">{item.effectiveTo || "الآن"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[var(--muted)] block text-[11px]">سبب التعيين:</span>
                        <span className="font-semibold text-[var(--foreground)]">{item.assignmentReason || "—"}</span>
                      </div>

                      {item.endReason && (
                        <div>
                          <span className="text-[var(--muted)] block text-[11px]">سبب الإنهاء:</span>
                          <span className="font-semibold text-amber-700 dark:text-amber-400">{item.endReason}</span>
                        </div>
                      )}

                      {item.notes && (
                        <div className="sm:col-span-2 text-[11px] text-[var(--muted)] bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                          <span className="font-bold">ملاحظات: </span>
                          {item.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] flex justify-end bg-slate-50/50 dark:bg-slate-800/50">
          <Button variant="secondary" onClick={onClose} className="h-9 px-5 text-xs rounded-xl">
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
}
