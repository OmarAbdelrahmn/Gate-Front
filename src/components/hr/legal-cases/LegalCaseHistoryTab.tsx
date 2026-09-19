"use client";

import React, { useState } from "react";
import type { LegalCaseHistoryItem } from "@/lib/hr/legal-cases-api";
import {
  History,
  PlusCircle,
  Pencil,
  Trash2,
  Paperclip,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck,
} from "lucide-react";

interface LegalCaseHistoryTabProps {
  history: LegalCaseHistoryItem[];
  loading?: boolean;
}

export function LegalCaseHistoryTab({ history, loading = false }: LegalCaseHistoryTabProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getChangeTypeInfo = (type: string) => {
    const lower = (type || "").toLowerCase();
    if (lower.includes("create") || lower.includes("add")) {
      return {
        label: "إنشاء / إضافة",
        icon: <PlusCircle className="size-4 text-emerald-600 dark:text-emerald-400" />,
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
      };
    }
    if (lower.includes("update") || lower.includes("edit") || lower.includes("modify")) {
      return {
        label: "تعديل بيانات",
        icon: <Pencil className="size-4 text-blue-600 dark:text-blue-400" />,
        bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
      };
    }
    if (lower.includes("archive") || lower.includes("delete") || lower.includes("remove")) {
      return {
        label: "أرشفة",
        icon: <Trash2 className="size-4 text-rose-600 dark:text-rose-400" />,
        bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
      };
    }
    if (lower.includes("file") || lower.includes("upload")) {
      return {
        label: "إرفاق ملف",
        icon: <Paperclip className="size-4 text-purple-600 dark:text-purple-400" />,
        bg: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800",
      };
    }
    return {
      label: type || "إجراء نظام",
      icon: <History className="size-4 text-slate-600 dark:text-slate-400" />,
      bg: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    };
  };

  const formatTimestamp = (ts?: string | null) => {
    if (!ts) return "—";
    try {
      const date = new Date(ts);
      return new Intl.DateTimeFormat("ar-SA", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date);
    } catch {
      return ts;
    }
  };

  const parseJson = (raw?: string | null) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-[var(--muted)]">
        <div className="size-8 mx-auto mb-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        جاري تحميل سجل التدقيق التاريخي...
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="py-12 text-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <History className="size-10 text-[var(--muted)] mx-auto mb-3" />
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          لا يوجد سجل تغييرات بعد
        </h3>
        <p className="text-xs text-[var(--muted)] mt-1">
          تسجل كافة العمليات والتعديلات على القضية والجلسات والمرفقات تلقائياً في هذا السجل.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            سجل التدقيق والتغييرات التاريخي
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-[var(--foreground)]">
            {history.length} عملية مسجلة
          </span>
        </div>
        <p className="text-xs text-[var(--muted)]">
          سجل غير قابل للتعديل أو الحذف (مرتب من الأحدث للأقدم)
        </p>
      </div>

      <div className="relative border-r-2 border-slate-200 dark:border-slate-800 pr-6 mr-3 space-y-6">
        {history.map((item) => {
          const typeInfo = getChangeTypeInfo(item.changeType);
          const isExpanded = !!expandedIds[item.id];
          const beforeObj = parseJson(item.beforeJson);
          const afterObj = parseJson(item.afterJson);

          const changedFieldsList = Array.isArray(item.changedFields)
            ? item.changedFields
            : typeof item.changedFields === "string" && item.changedFields.trim()
            ? item.changedFields.split(",").map((f) => f.trim())
            : [];

          return (
            <div key={item.id} className="relative group">
              {/* Timeline marker node */}
              <div className="absolute -right-[31px] top-1 size-4 rounded-full border-2 border-[var(--surface)] bg-indigo-600 group-hover:scale-125 transition-transform" />

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm hover:shadow transition-shadow space-y-3">
                {/* Header: Action Type, Actor, Timestamp */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${typeInfo.bg}`}
                    >
                      {typeInfo.icon}
                      {typeInfo.label}
                    </span>
                    <span className="text-xs font-mono text-[var(--muted)]">
                      {item.changeType}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                    <div className="flex items-center gap-1.5">
                      <User className="size-3.5" />
                      <span>{item.actor || item.actorName || item.changedByUserId || "مستخدم النظام"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      <span dir="ltr">{formatTimestamp(item.timestamp || item.createdAtUtc)}</span>
                    </div>
                  </div>
                </div>

                {/* Change Reason Banner */}
                {item.changeReason && (
                  <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/50 text-xs">
                    <span className="font-semibold text-amber-900 dark:text-amber-300 ml-1.5">
                      سبب الإجراء:
                    </span>
                    <span className="text-amber-800 dark:text-amber-200">
                      {item.changeReason}
                    </span>
                  </div>
                )}

                {/* Changed Fields tags */}
                {changedFieldsList.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-[var(--muted)] ml-1">الحقول المعدلة:</span>
                    {changedFieldsList.map((field, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-xs font-mono bg-slate-100 dark:bg-slate-800 text-[var(--foreground)] border border-[var(--border)]"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                )}

                {/* Diff / JSON Accordion */}
                {(beforeObj || afterObj) && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.id)}
                      className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="size-3.5" />
                          إخفاء تفاصيل البيانات
                        </>
                      ) : (
                        <>
                          <ChevronDown className="size-3.5" />
                          عرض تفاصيل البيانات قبل / بعد
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-150 text-xs font-mono">
                        {beforeObj && (
                          <div className="rounded-xl border border-rose-200 bg-rose-50/40 dark:bg-rose-950/20 dark:border-rose-900/40 p-3 overflow-x-auto">
                            <p className="font-semibold text-rose-800 dark:text-rose-300 mb-1.5 font-sans">
                              البيانات قبل الإجراء (Before):
                            </p>
                            <pre className="text-[11px] whitespace-pre-wrap text-rose-900 dark:text-rose-200" dir="ltr">
                              {typeof beforeObj === "object"
                                ? JSON.stringify(beforeObj, null, 2)
                                : String(beforeObj)}
                            </pre>
                          </div>
                        )}

                        {afterObj && (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/40 p-3 overflow-x-auto">
                            <p className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1.5 font-sans">
                              البيانات بعد الإجراء (After):
                            </p>
                            <pre className="text-[11px] whitespace-pre-wrap text-emerald-900 dark:text-emerald-200" dir="ltr">
                              {typeof afterObj === "object"
                                ? JSON.stringify(afterObj, null, 2)
                                : String(afterObj)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
