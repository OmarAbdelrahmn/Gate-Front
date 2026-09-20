"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Clock,
  User,
  Server,
  Layers,
  FileCode,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  PlusCircle,
  Edit3,
  Trash2,
  CheckCircle,
  Activity,
  Globe,
  Monitor,
  Hash,
  ExternalLink,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { getAuditEntry } from "@/lib/audit/api";
import type { AuditEntry, AuditChange } from "@/lib/audit/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  resolveAuditRecordInfo,
  resolveChangeValue,
  getAuditRecordNavigation,
  getChangeValueNavigation,
} from "@/lib/audit/audit-resolver";
import { getDocumentTypes } from "@/lib/workforce/documents-api";

interface AuditEntryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
  initialEntry?: AuditEntry | null;
  documentTypesMap?: Record<string, { nameAr?: string; nameEn?: string; code?: string }>;
  onFilterByCorrelationId?: (correlationId: string) => void;
  employeesList?: any[];
  vehiclesList?: any[];
  auditItems?: AuditEntry[];
  documentsMap?: Record<string, { employeeId: string; docName?: string; fileName?: string }>;
  vehiclePeriodsMap?: Record<string, { vehicleId: string; plateNumber?: string }>;
}

export function AuditEntryDetailModal({
  isOpen,
  onClose,
  eventId,
  initialEntry,
  documentTypesMap,
  onFilterByCorrelationId,
  employeesList,
  vehiclesList,
  auditItems,
  documentsMap,
  vehiclePeriodsMap,
}: AuditEntryDetailModalProps) {
  const { locale } = useAuth();
  const isEn = locale === "en";

  const [entry, setEntry] = useState<AuditEntry | null>(initialEntry || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showTechnical, setShowTechnical] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Document types catalog map
  const [docTypes, setDocTypes] = useState<Record<string, { nameAr?: string; nameEn?: string; code?: string }>>(documentTypesMap || {});

  useEffect(() => {
    if (documentTypesMap && Object.keys(documentTypesMap).length > 0) {
      setDocTypes(documentTypesMap);
    } else if (isOpen) {
      getDocumentTypes()
        .then((docs) => {
          if (Array.isArray(docs)) {
            const map: Record<string, { nameAr?: string; nameEn?: string; code?: string }> = {};
            for (const d of docs) {
              if (d && d.id) {
                map[d.id] = { nameAr: d.nameAr, nameEn: d.nameEn, code: d.code };
              }
            }
            setDocTypes(map);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, documentTypesMap]);

  useEffect(() => {
    if (!isOpen || !eventId) {
      setEntry(null);
      setError(null);
      setShowTechnical(false);
      setShowRawJson(false);
      return;
    }

    if (initialEntry && initialEntry.eventId === eventId) {
      setEntry(initialEntry);
    }

    // Always fetch latest/complete detail
    setLoading(true);
    setError(null);
    getAuditEntry(eventId)
      .then((data) => setEntry(data))
      .catch((err) => {
        setError(err?.message || (isEn ? "Failed to load audit entry details." : "تعذر تحميل تفاصيل حدث التدقيق."));
      })
      .finally(() => setLoading(false));
  }, [isOpen, eventId, initialEntry, isEn]);

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  const action = entry?.action || "Unknown";
  const getActionBadge = (act: string) => {
    switch (act) {
      case "Created":
        return {
          icon: PlusCircle,
          label: isEn ? "Created" : "إنشاء جديد",
          cls: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
        };
      case "Updated":
        return {
          icon: Edit3,
          label: isEn ? "Updated" : "تعديل",
          cls: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
        };
      case "SoftDeleted":
        return {
          icon: Trash2,
          label: isEn ? "Soft Deleted" : "حذف مؤقت",
          cls: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
        };
      case "Closed":
        return {
          icon: CheckCircle,
          label: isEn ? "Closed" : "إغلاق",
          cls: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
        };
      default:
        return {
          icon: Activity,
          label: act,
          cls: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
        };
    }
  };

  const actionMeta = getActionBadge(action);
  const ActionIcon = actionMeta.icon;

  const formatUtcDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat(isEn ? "en-US" : "ar-SA-u-nu-latn", {
        dateStyle: "medium",
        timeStyle: "medium",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "boolean") return val ? (isEn ? "True" : "نعم") : (isEn ? "False" : "لا");
    if (typeof val === "object") {
      try {
        return JSON.stringify(val, null, 2);
      } catch {
        return String(val);
      }
    }
    return String(val);
  };

  const actorDisplayName =
    entry?.actor?.displayNameAr ||
    entry?.actor?.displayNameEn ||
    entry?.actor?.userName ||
    entry?.actorType ||
    (isEn ? "System" : "النظام");

  const resolvedRecord = entry ? resolveAuditRecordInfo(entry, isEn, docTypes, documentsMap, employeesList, vehiclePeriodsMap) : null;
  const recordNav = entry
    ? getAuditRecordNavigation(entry, resolvedRecord || undefined, employeesList, vehiclesList, auditItems, documentsMap, vehiclePeriodsMap)
    : null;
  const RecordEntityIcon = resolvedRecord?.entityIcon || Layers;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6 -mt-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#1167c9]">
              <ActionIcon size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${actionMeta.cls}`}>
                  <ActionIcon size={12} />
                  {actionMeta.label}
                </span>
                {resolvedRecord && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${resolvedRecord.badgeCls}`}>
                    <RecordEntityIcon size={12} />
                    <span>{resolvedRecord.entityLabel}</span>
                  </span>
                )}
                <span className="text-xs font-mono font-bold text-slate-500">
                  Seq: #{entry?.sequence ?? "—"}
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                {resolvedRecord?.primaryTitle || (isEn ? "Audit Event" : "حدث تدقيق")}
              </h2>
              {resolvedRecord?.secondaryTitle && (
                <p className="text-xs text-[var(--muted)] font-medium mt-0.5">
                  {resolvedRecord.secondaryTitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <Clock size={14} className="text-[#1167c9]" />
            <span className="font-mono">{formatUtcDate(entry?.occurredAtUtc)}</span>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && !entry && (
          <div className="space-y-3 py-6">
            <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-40 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
        )}

        {entry && (
          <>
            {/* Cards: Actor & Record Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Actor Details */}
              <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 pb-1.5 border-b border-[var(--border)]">
                  {entry.actorType === "System" ? <Server size={14} className="text-[#1167c9]" /> : <User size={14} className="text-[#1167c9]" />}
                  <span>{isEn ? "Actor / User" : "المستخدم / القائم بالعملية"}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">{isEn ? "Name / Actor:" : "الاسم / الفاعل:"}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{actorDisplayName}</span>
                  </div>
                  {entry.actor?.userName && (
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">{isEn ? "Username:" : "اسم المستخدم:"}</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">@{entry.actor.userName}</span>
                    </div>
                  )}
                  {entry.actor?.userId && (
                    <div className="pt-2 border-t border-[var(--border)]/60">
                      <Link
                        href={`/admin/users/${entry.actor.userId}`}
                        className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-1.5 rounded-xl text-xs font-bold text-[#1167c9] hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-800 transition-all"
                      >
                        <User size={13} />
                        <span>{isEn ? "View User Profile" : "عرض حساب المستخدم"}</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  )}
                  {entry.actor?.status && (
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">{isEn ? "Account Status:" : "حالة الحساب:"}</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{entry.actor.status}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Target Record Details */}
              <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 pb-1.5 border-b border-[var(--border)]">
                  <RecordEntityIcon size={14} className="text-[#1167c9]" />
                  <span>{isEn ? "Target Business Record" : "السجل المستهدف وبياناته"}</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--muted)]">{isEn ? "Entity Type:" : "نوع الكيان:"}</span>
                    <span className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded border ${resolvedRecord?.badgeCls}`}>
                      <RecordEntityIcon size={12} />
                      <span>{resolvedRecord?.entityLabel || entry.entityType}</span>
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[var(--muted)]">{isEn ? "What this refers to:" : "ماذا يمثل هذا السجل:"}</span>
                    <span className="font-bold text-slate-900 dark:text-white text-end max-w-[240px] truncate" title={resolvedRecord?.primaryTitle}>
                      {resolvedRecord?.primaryTitle}
                    </span>
                  </div>

                  {resolvedRecord?.secondaryTitle && (
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--muted)]">{isEn ? "Context:" : "تفاصيل إضافية:"}</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium text-end max-w-[240px] truncate" title={resolvedRecord.secondaryTitle}>
                        {resolvedRecord.secondaryTitle}
                      </span>
                    </div>
                  )}

                  {resolvedRecord?.code && (
                    <div className="flex justify-between">
                      <span className="text-[var(--muted)]">{isEn ? "Record Code:" : "رمز السجل:"}</span>
                      <span className="font-mono font-bold text-[#1167c9]">{resolvedRecord.code}</span>
                    </div>
                  )}

                  {recordNav && (
                    <div className="pt-2 border-t border-[var(--border)]/60">
                      <Link
                        href={recordNav.url}
                        className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl text-xs font-bold bg-[#1167c9] text-white hover:bg-[#0e56a8] transition-all shadow-xs"
                      >
                        <ExternalLink size={13} />
                        <span>{isEn ? recordNav.labelEn : recordNav.labelAr}</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reason if present */}
            {entry.reason && (
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300 mb-1">
                  <AlertTriangle size={14} />
                  <span>{isEn ? "Business Reason / Justification" : "سبب الإجراء / التبرير"}</span>
                </div>
                <p className="text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                  {entry.reason}
                </p>
              </div>
            )}

            {/* Structured Changes Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCode size={15} className="text-[#1167c9]" />
                  <span>{isEn ? "Field-Level Changes" : "التغييرات على الحقول"}</span>
                </h3>
                {entry.changes && entry.changes.length > 0 && (
                  <span className="text-[11px] font-bold text-[var(--muted)]">
                    {entry.changes.length} {isEn ? "fields changed" : "حقول معدلة"}
                  </span>
                )}
              </div>

              {entry.changes && entry.changes.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                  <table className="w-full text-xs text-start">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold text-[var(--muted)] border-b border-[var(--border)]">
                      <tr>
                        <th className="p-3 text-start w-1/4">{isEn ? "Field Name" : "اسم الحقل"}</th>
                        <th className="p-3 text-start w-[37.5%]">{isEn ? "Previous Value (Before)" : "القيمة السابقة"}</th>
                        <th className="p-3 text-start w-[37.5%]">{isEn ? "New Value (After)" : "القيمة الجديدة"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {entry.changes.map((c: AuditChange, idx: number) => {
                        const hasBefore = c.before !== undefined && c.before !== null;
                        const hasAfter = c.after !== undefined && c.after !== null;

                        const resolvedBefore = resolveChangeValue(c.field, c.before, entry, isEn, docTypes);
                        const resolvedAfter = resolveChangeValue(c.field, c.after, entry, isEn, docTypes);

                        const navBefore = resolvedBefore.isId
                          ? getChangeValueNavigation(c.field, resolvedBefore.rawId, entry, employeesList, vehiclesList, auditItems, documentsMap, vehiclePeriodsMap)
                          : null;
                        const navAfter = resolvedAfter.isId
                          ? getChangeValueNavigation(c.field, resolvedAfter.rawId, entry, employeesList, vehiclesList, auditItems, documentsMap, vehiclePeriodsMap)
                          : null;

                        return (
                          <tr key={`${c.field}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            {/* Field Name */}
                            <td className="p-3 align-top">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 dark:text-white text-xs">
                                  {resolvedAfter.fieldLabel}
                                </span>
                                {resolvedAfter.fieldLabel !== c.field && (
                                  <span className="font-mono text-[10px] text-slate-400">
                                    {c.field}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Previous Value */}
                            <td className="p-3 align-top">
                              {hasBefore ? (
                                <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-1.5">
                                  <div className="flex items-center justify-between gap-1 flex-wrap">
                                    {resolvedBefore.badgeText && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200">
                                        <Layers size={10} />
                                        <span>{resolvedBefore.badgeText}</span>
                                      </span>
                                    )}
                                    {navBefore && (
                                      <Link
                                        href={navBefore.url}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1167c9] dark:text-blue-400 hover:underline"
                                        title={isEn ? navBefore.labelEn : navBefore.labelAr}
                                      >
                                        <span>{isEn ? "Go to Record" : "الانتقال للسجل"}</span>
                                        <ExternalLink size={11} />
                                      </Link>
                                    )}
                                  </div>
                                  {navBefore ? (
                                    <Link
                                      href={navBefore.url}
                                      className="block font-bold text-xs text-rose-950 dark:text-rose-100 hover:text-[#1167c9] dark:hover:text-blue-400 transition-colors"
                                    >
                                      {resolvedBefore.primaryText}
                                    </Link>
                                  ) : (
                                    <div className="font-bold text-xs text-rose-900 dark:text-rose-200">
                                      {resolvedBefore.primaryText}
                                    </div>
                                  )}
                                  {resolvedBefore.secondaryText && (
                                    <div className="text-[10px] text-rose-700/80 dark:text-rose-300/80">
                                      {resolvedBefore.secondaryText}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[var(--muted)] font-mono">—</span>
                              )}
                            </td>

                            {/* New Value */}
                            <td className="p-3 align-top">
                              {hasAfter ? (
                                <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-1.5">
                                  <div className="flex items-center justify-between gap-1 flex-wrap">
                                    {resolvedAfter.badgeText && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200">
                                        <Layers size={10} />
                                        <span>{resolvedAfter.badgeText}</span>
                                      </span>
                                    )}
                                    {navAfter && (
                                      <Link
                                        href={navAfter.url}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1167c9] dark:text-blue-400 hover:underline"
                                        title={isEn ? navAfter.labelEn : navAfter.labelAr}
                                      >
                                        <span>{isEn ? "Go to Record" : "الانتقال للسجل"}</span>
                                        <ExternalLink size={11} />
                                      </Link>
                                    )}
                                  </div>
                                  {navAfter ? (
                                    <Link
                                      href={navAfter.url}
                                      className="block font-bold text-xs text-emerald-950 dark:text-emerald-100 hover:text-[#1167c9] dark:hover:text-blue-400 transition-colors"
                                    >
                                      {resolvedAfter.primaryText}
                                    </Link>
                                  ) : (
                                    <div className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
                                      {resolvedAfter.primaryText}
                                    </div>
                                  )}
                                  {resolvedAfter.secondaryText && (
                                    <div className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80">
                                      {resolvedAfter.secondaryText}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[var(--muted)] font-mono">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[var(--muted)] rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30">
                  {action === "Created"
                    ? isEn
                      ? "Initial record creation snapshot."
                      : "تم إنشاء السجل لأول مرة."
                    : action === "SoftDeleted"
                      ? isEn
                        ? "Record was soft deleted."
                        : "تم وضع علامة الحذف المؤقت على السجل."
                      : isEn
                        ? "No field-level changes recorded for this event."
                        : "لم يتم تسجيل فروقات على مستوى الحقول لهذا الحدث."}
                </div>
              )}
            </div>

            {/* Collapsible Technical Details */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTechnical(!showTechnical)}
                className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Monitor size={15} className="text-[#1167c9]" />
                  <span>{isEn ? "Technical & Session Evidence" : "تفاصيل الجلسة والطلب (Technical Evidence)"}</span>
                </div>
                {showTechnical ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showTechnical && (
                <div className="p-4 pt-0 border-t border-[var(--border)] space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3">
                    {/* Event ID */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-[var(--border)]">
                      <div className="flex justify-between items-center text-[var(--muted)] mb-1">
                        <span>Event ID:</span>
                        <button
                          type="button"
                          onClick={() => handleCopy("eventId", entry.eventId)}
                          className="hover:text-[#1167c9]"
                        >
                          {copiedKey === "eventId" ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        </button>
                      </div>
                      <span className="font-mono font-bold text-[11px] block truncate">{entry.eventId}</span>
                    </div>

                    {/* Correlation ID */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-[var(--border)]">
                      <div className="flex justify-between items-center text-[var(--muted)] mb-1">
                        <span>Correlation ID:</span>
                        <div className="flex items-center gap-2">
                          {entry.correlationId && onFilterByCorrelationId && (
                            <button
                              type="button"
                              onClick={() => {
                                onFilterByCorrelationId(entry.correlationId!);
                                onClose();
                              }}
                              className="text-[10px] text-[#1167c9] hover:underline flex items-center gap-0.5"
                              title={isEn ? "Filter timeline by this correlation ID" : "تصفية السجل بهذا المعرف"}
                            >
                              <Filter size={10} />
                              {isEn ? "Filter" : "تصفية"}
                            </button>
                          )}
                          {entry.correlationId && (
                            <button
                              type="button"
                              onClick={() => handleCopy("correlationId", entry.correlationId!)}
                              className="hover:text-[#1167c9]"
                            >
                              {copiedKey === "correlationId" ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                            </button>
                          )}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-[11px] block truncate">
                        {entry.correlationId || "—"}
                      </span>
                    </div>

                    {/* IP Address */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-[var(--border)]">
                      <span className="text-[var(--muted)] block mb-1">IP Address:</span>
                      <span className="font-mono font-bold text-[11px] block">
                        {entry.request?.ipAddress || "—"}
                      </span>
                    </div>

                    {/* Session ID */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-[var(--border)]">
                      <span className="text-[var(--muted)] block mb-1">Session ID:</span>
                      <span className="font-mono font-bold text-[11px] block truncate">
                        {entry.request?.sessionId || "—"}
                      </span>
                    </div>

                    {/* Trace ID */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-[var(--border)]">
                      <span className="text-[var(--muted)] block mb-1">Trace ID:</span>
                      <span className="font-mono font-bold text-[11px] block truncate">
                        {entry.request?.traceId || "—"}
                      </span>
                    </div>

                    {/* Source & Category */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-[var(--border)]">
                      <span className="text-[var(--muted)] block mb-1">Source / Category:</span>
                      <span className="font-mono font-bold text-[11px] block">
                        {entry.source || entry.request?.source || "—"} · {entry.category}
                      </span>
                    </div>
                  </div>

                  {/* User Agent */}
                  {entry.request?.userAgent && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-[var(--border)] text-xs">
                      <span className="text-[var(--muted)] block mb-1">User Agent:</span>
                      <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all">
                        {entry.request.userAgent}
                      </span>
                    </div>
                  )}

                  {/* Raw JSON toggle */}
                  {(entry.beforeJson || entry.afterJson) && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowRawJson(!showRawJson)}
                        className="text-xs font-bold text-[#1167c9] hover:underline flex items-center gap-1"
                      >
                        <FileCode size={13} />
                        <span>{showRawJson ? (isEn ? "Hide Raw JSON Snapshots" : "إخفاء الـ JSON الخام") : (isEn ? "View Raw JSON Snapshots" : "عرض بيانات الـ JSON الخام")}</span>
                      </button>

                      {showRawJson && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          {entry.beforeJson && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 block">
                                Before Snapshot (JSON):
                              </span>
                              <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-60 dir-ltr text-left">
                                {(() => {
                                  try {
                                    return JSON.stringify(JSON.parse(entry.beforeJson), null, 2);
                                  } catch {
                                    return entry.beforeJson;
                                  }
                                })()}
                              </pre>
                            </div>
                          )}
                          {entry.afterJson && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block">
                                After Snapshot (JSON):
                              </span>
                              <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-60 dir-ltr text-left">
                                {(() => {
                                  try {
                                    return JSON.stringify(JSON.parse(entry.afterJson), null, 2);
                                  } catch {
                                    return entry.afterJson;
                                  }
                                })()}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-3 border-t border-[var(--border)]">
          <Button variant="secondary" onClick={onClose}>
            {isEn ? "Close" : "إغلاق"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
