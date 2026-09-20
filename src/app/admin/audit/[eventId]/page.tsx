"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
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
  Monitor,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getAuditEntry } from "@/lib/audit/api";
import type { AuditEntry, AuditChange } from "@/lib/audit/types";
import {
  resolveAuditRecordInfo,
  resolveChangeValue,
  getAuditRecordNavigation,
  getChangeValueNavigation,
} from "@/lib/audit/audit-resolver";
import { getDocumentTypes, getEmployeeActualDocuments } from "@/lib/workforce/documents-api";
import { listEmployees } from "@/lib/workforce/api";
import { getVehicles, getVehicleStatusHistory } from "@/lib/fleet/api";

export default function AuditEntryDetailPage() {
  const params = useParams();
  const eventId = String(params?.eventId || "");

  const { can, locale } = useAuth();
  const isEn = locale === "en";
  const t = (k: string) => translate(locale, k);

  const hasPermission = can("audit.read");

  const [entry, setEntry] = useState<AuditEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showTechnical, setShowTechnical] = useState(true);
  const [showRawJson, setShowRawJson] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Document types catalog map
  const [docTypesMap, setDocTypesMap] = useState<Record<string, { nameAr?: string; nameEn?: string; code?: string }>>({});
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [vehiclesList, setVehiclesList] = useState<any[]>([]);
  const [documentsMap, setDocumentsMap] = useState<Record<string, { employeeId: string; docName?: string; fileName?: string }>>({});
  const [vehiclePeriodsMap, setVehiclePeriodsMap] = useState<Record<string, { vehicleId: string; plateNumber?: string }>>({});

  useEffect(() => {
    if (hasPermission) {
      getDocumentTypes()
        .then((docs) => {
          if (Array.isArray(docs)) {
            const map: Record<string, { nameAr?: string; nameEn?: string; code?: string }> = {};
            for (const d of docs) {
              if (d && d.id) {
                map[d.id] = { nameAr: d.nameAr, nameEn: d.nameEn, code: d.code };
              }
            }
            setDocTypesMap(map);
          }
        })
        .catch(() => {});

      listEmployees()
        .then((res) => {
          if (Array.isArray(res)) {
            setEmployeesList(res);
            Promise.all(
              res.map((emp: any) =>
                getEmployeeActualDocuments(emp.id)
                  .then((docs) => docs || [])
                  .catch(() => [])
              )
            ).then((docArrays) => {
              const map: Record<string, { employeeId: string; docName?: string; fileName?: string }> = {};
              docArrays.flat().forEach((doc: any) => {
                if (!doc) return;
                const val = {
                  employeeId: doc.employeeId,
                  docName: doc.documentTypeNameAr || doc.documentTypeCode,
                  fileName: doc.currentFileName || undefined,
                };
                if (doc.id) map[doc.id] = val;
                if (doc.currentVersionId) map[doc.currentVersionId] = val;
                if (doc.currentFileName) map[String(doc.currentFileName).toLowerCase().trim()] = val;
                if (doc.documentNumber) map[String(doc.documentNumber).toLowerCase().trim()] = val;
              });
              setDocumentsMap(map);
            });
          }
        })
        .catch(() => {});

      getVehicles({ page: 1, pageSize: 200 })
        .then((res: any) => {
          const list = Array.isArray(res) ? res : (res?.items || res?.data || []);
          if (Array.isArray(list)) {
            setVehiclesList(list);
            Promise.all(
              list.map((v: any) =>
                getVehicleStatusHistory(v.id)
                  .then((periods) => (Array.isArray(periods) ? periods.map((p: any) => ({ ...p, vehicleId: v.id, plateNumber: v.plateNumber || v.plateText })) : []))
                  .catch(() => [])
              )
            ).then((periodArrays) => {
              const map: Record<string, { vehicleId: string; plateNumber?: string }> = {};
              periodArrays.flat().forEach((p: any) => {
                if (p && p.id) {
                  map[p.id] = { vehicleId: p.vehicleId, plateNumber: p.plateNumber };
                }
              });
              setVehiclePeriodsMap(map);
            });
          }
        })
        .catch(() => {});
    }
  }, [hasPermission]);

  const loadDetail = () => {
    if (!hasPermission || !eventId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getAuditEntry(eventId)
      .then(setEntry)
      .catch((err) => {
        setError(err?.message || (isEn ? "Failed to load audit entry." : "تعذر تحميل تفاصيل حدث التدقيق."));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDetail();
  }, [eventId, hasPermission]);

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const BackIcon = isEn ? ArrowLeft : ArrowRight;

  if (!hasPermission) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center space-y-3">
          <div className="size-12 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {isEn ? "Access Denied" : "غير مصرح بالوصول"}
          </h3>
          <p className="text-xs text-[var(--muted)] max-w-md mx-auto leading-relaxed">
            {isEn
              ? "You do not have the required 'audit.read' permission to view system audit entries."
              : "عفواً، يتطلب عرض سجل العمليات والتدقيق توفر صلاحية (audit.read) في حسابك."}
          </p>
        </Card>
      </div>
    );
  }

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

  const resolvedRecord = entry ? resolveAuditRecordInfo(entry, isEn, docTypesMap, documentsMap, employeesList, vehiclePeriodsMap) : null;
  const recordNav = entry ? getAuditRecordNavigation(entry, resolvedRecord || undefined, employeesList, vehiclesList, undefined, documentsMap, vehiclePeriodsMap) : null;
  const RecordEntityIcon = resolvedRecord?.entityIcon || Layers;

  return (
    <div className="space-y-6">
      {/* Header & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-1">
            <span>{t("nav.systemManagement")}</span>
            <span>/</span>
            <Link href="/admin/audit" className="hover:text-[#1167c9] transition-colors">
              {t("nav.auditLogs")}
            </Link>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            {resolvedRecord?.primaryTitle || (isEn ? "Audit Event Detail" : "تفاصيل حدث التدقيق")}
          </h1>
          {resolvedRecord?.secondaryTitle && (
            <p className="text-sm text-[var(--muted)] mt-1 font-medium">
              {resolvedRecord.secondaryTitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/audit">
            <Button variant="secondary" className="inline-flex items-center gap-1.5 text-xs">
              <BackIcon size={15} />
              <span>{isEn ? "Back to Audit Logs" : "العودة إلى سجل العمليات"}</span>
            </Button>
          </Link>
          <Button variant="secondary" onClick={loadDetail} disabled={loading} className="size-9 p-0">
            <RefreshCw size={15} className={loading ? "animate-spin text-[#1167c9]" : ""} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading && !entry && (
        <Card className="p-6 space-y-4">
          <div className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          <div className="h-44 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </Card>
      )}

      {entry && (
        <Card className="p-6 space-y-6">
          {/* Action Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#1167c9]">
                <ActionIcon size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border ${actionMeta.cls}`}>
                    <ActionIcon size={13} />
                    {actionMeta.label}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Sequence: #{entry.sequence}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {entry.record?.displayLabel || entry.record?.displayCode || entry.entityType}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <Clock size={15} className="text-[#1167c9]" />
              <span className="font-mono">{formatUtcDate(entry.occurredAtUtc)}</span>
            </div>
          </div>

          {/* Cards: Actor & Target Record */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Actor */}
            <div className="p-4 rounded-2xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 pb-2 border-b border-[var(--border)]">
                {entry.actorType === "System" ? <Server size={15} className="text-[#1167c9]" /> : <User size={15} className="text-[#1167c9]" />}
                <span>{isEn ? "Actor / User Account" : "القائم بالعملية / الحساب"}</span>
              </div>
              <div className="space-y-1.5 text-xs">
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
                    <span className="text-[var(--muted)]">{isEn ? "Status:" : "حالة الحساب:"}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{entry.actor.status}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Target Record */}
            <div className="p-4 rounded-2xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 pb-2 border-b border-[var(--border)]">
                <RecordEntityIcon size={15} className="text-[#1167c9]" />
                <span>{isEn ? "Target Business Record" : "السجل المستهدف وبياناته"}</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--muted)]">{isEn ? "Entity Type:" : "نوع الكيان:"}</span>
                  <span className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-0.5 rounded border ${resolvedRecord?.badgeCls}`}>
                    <RecordEntityIcon size={13} />
                    <span>{resolvedRecord?.entityLabel || entry.entityType}</span>
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[var(--muted)]">{isEn ? "What this refers to:" : "ماذا يمثل هذا السجل:"}</span>
                  <span className="font-bold text-slate-900 dark:text-white text-end max-w-[260px] truncate" title={resolvedRecord?.primaryTitle}>
                    {resolvedRecord?.primaryTitle}
                  </span>
                </div>

                {resolvedRecord?.secondaryTitle && (
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--muted)]">{isEn ? "Context:" : "تفاصيل إضافية:"}</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium text-end max-w-[260px] truncate" title={resolvedRecord.secondaryTitle}>
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
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300 mb-1">
                <AlertTriangle size={15} />
                <span>{isEn ? "Business Reason / Justification" : "سبب الإجراء / التبرير"}</span>
              </div>
              <p className="text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                {entry.reason}
              </p>
            </div>
          )}

          {/* Structured Changes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCode size={16} className="text-[#1167c9]" />
                <span>{isEn ? "Field-Level Changes" : "التغييرات على الحقول"}</span>
              </h3>
              {entry.changes && entry.changes.length > 0 && (
                <span className="text-xs font-bold text-[var(--muted)]">
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

                      const resolvedBefore = resolveChangeValue(c.field, c.before, entry, isEn, docTypesMap);
                      const resolvedAfter = resolveChangeValue(c.field, c.after, entry, isEn, docTypesMap);

                      const navBefore = resolvedBefore.isId ? getChangeValueNavigation(c.field, resolvedBefore.rawId, entry, employeesList, vehiclesList, undefined, documentsMap, vehiclePeriodsMap) : null;
                      const navAfter = resolvedAfter.isId ? getChangeValueNavigation(c.field, resolvedAfter.rawId, entry, employeesList, vehiclesList, undefined, documentsMap, vehiclePeriodsMap) : null;

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
              <div className="p-8 text-center text-xs text-[var(--muted)] rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30">
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

          {/* Technical & Session Evidence */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTechnical(!showTechnical)}
              className="w-full flex items-center justify-between p-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Monitor size={16} className="text-[#1167c9]" />
                <span>{isEn ? "Technical & Session Evidence" : "تفاصيل الجلسة والطلب (Technical Evidence)"}</span>
              </div>
              {showTechnical ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showTechnical && (
              <div className="p-4 pt-0 border-t border-[var(--border)] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-[var(--border)]">
                    <span className="text-[var(--muted)] block mb-1">Event ID:</span>
                    <span className="font-mono font-bold text-[11px] block truncate">{entry.eventId}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-[var(--border)]">
                    <span className="text-[var(--muted)] block mb-1">Correlation ID:</span>
                    <span className="font-mono font-bold text-[11px] block truncate">{entry.correlationId || "—"}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-[var(--border)]">
                    <span className="text-[var(--muted)] block mb-1">IP Address:</span>
                    <span className="font-mono font-bold text-[11px] block">{entry.request?.ipAddress || "—"}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-[var(--border)]">
                    <span className="text-[var(--muted)] block mb-1">Session ID:</span>
                    <span className="font-mono font-bold text-[11px] block truncate">{entry.request?.sessionId || "—"}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-[var(--border)]">
                    <span className="text-[var(--muted)] block mb-1">Trace ID:</span>
                    <span className="font-mono font-bold text-[11px] block truncate">{entry.request?.traceId || "—"}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-[var(--border)]">
                    <span className="text-[var(--muted)] block mb-1">Source / Category:</span>
                    <span className="font-mono font-bold text-[11px] block">
                      {entry.source || entry.request?.source || "—"} · {entry.category}
                    </span>
                  </div>
                </div>

                {entry.request?.userAgent && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-[var(--border)] text-xs">
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
                      <FileCode size={14} />
                      <span>{showRawJson ? (isEn ? "Hide Raw JSON Snapshots" : "إخفاء الـ JSON الخام") : (isEn ? "View Raw JSON Snapshots" : "عرض بيانات الـ JSON الخام")}</span>
                    </button>

                    {showRawJson && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        {entry.beforeJson && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 block">
                              Before Snapshot (JSON):
                            </span>
                            <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-72 dir-ltr text-left">
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
                            <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-72 dir-ltr text-left">
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
        </Card>
      )}
    </div>
  );
}
