// src/app/admin/hunger/components/SeedImportConflictModal.tsx
"use client";

import { useState, useMemo, Fragment } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  downloadHungerAccountsTemplate,
  previewHungerAccountsSeedImport,
  confirmHungerAccountsSeedImport,
  getHungerErrorMessage,
  type BadgeTone,
  type HungerSeedImportPreviewResponse,
  type HungerSeedPreviewRow,
  type HungerSeedResolutionAction,
  type HungerSeedRowStatus,
} from "@/lib/hunger/api";
import { toast } from "@/components/ui/Toast";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Info,
  Upload,
} from "lucide-react";

interface PlatformOption {
  value: string;
  label: string;
}

interface SeedImportConflictModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultPlatformId?: string;
  platformOptions?: PlatformOption[];
}

interface RowDecision {
  action: HungerSeedResolutionAction | "";
  platformId: string;
}

const ROW_STATUS_META: Record<
  HungerSeedRowStatus,
  {
    labelAr: string;
    tone: BadgeTone;
    allowedActions: HungerSeedResolutionAction[];
    defaultAction: HungerSeedResolutionAction;
  }
> = {
  New: {
    labelAr: "حساب جديد (New)",
    tone: "blue",
    allowedActions: ["Create", "Skip"],
    defaultAction: "Create",
  },
  Unchanged: {
    labelAr: "بدون تغيير (Unchanged)",
    tone: "green",
    allowedActions: ["Keep", "Skip"],
    defaultAction: "Keep",
  },
  ChangedField: {
    labelAr: "تغيير في الحقول (ChangedField)",
    tone: "orange",
    allowedActions: ["Update", "Keep", "Skip"],
    defaultAction: "Update",
  },
  ConflictingOwner: {
    labelAr: "تعارض في المالك (ConflictingOwner)",
    tone: "red",
    allowedActions: ["ReplaceOwner", "Keep", "Skip"],
    defaultAction: "Keep",
  },
  MissingAccount: {
    labelAr: "حساب مفقود (MissingAccount)",
    tone: "gray",
    allowedActions: ["Skip"],
    defaultAction: "Skip",
  },
};

const ACTION_LABELS_AR: Record<HungerSeedResolutionAction, string> = {
  Create: "إنشاء الحساب (Create)",
  Update: "تحديث الحقول (Update)",
  ReplaceOwner: "استبدال المالك (ReplaceOwner)",
  Keep: "الإبقاء على الحالي (Keep)",
  Skip: "تخطي الصف (Skip)",
};

function normalizeRowStatus(row: HungerSeedPreviewRow): HungerSeedRowStatus {
  if (row.error || (row.errors && row.errors.length > 0)) {
    return "MissingAccount";
  }
  const raw = (row.status || row.matchStatus || "").trim();
  if (
    raw === "New" ||
    raw === "Unchanged" ||
    raw === "ChangedField" ||
    raw === "ConflictingOwner" ||
    raw === "MissingAccount"
  ) {
    return raw;
  }
  const lower = raw.toLowerCase();
  if (lower.includes("new") || lower.includes("create")) return "New";
  if (lower.includes("unchanged") || lower.includes("same")) return "Unchanged";
  if (lower.includes("changed") || lower.includes("update"))
    return "ChangedField";
  if (lower.includes("conflict") || lower.includes("owner"))
    return "ConflictingOwner";
  if (lower.includes("missing") || lower.includes("error"))
    return "MissingAccount";
  return "New";
}

function getAllowedActionsForRow(
  row: HungerSeedPreviewRow,
): HungerSeedResolutionAction[] {
  const hasError = Boolean(row.error || (row.errors && row.errors.length > 0));
  if (hasError) return ["Skip"];
  const status = normalizeRowStatus(row);
  return ROW_STATUS_META[status]?.allowedActions ?? ["Skip"];
}

export function SeedImportConflictModal({
  open,
  onClose,
  onSuccess,
  defaultPlatformId = "",
  platformOptions = [],
}: SeedImportConflictModalProps) {
  const [seedFile, setSeedFile] = useState<File | null>(null);
  const [preview, setPreview] =
    useState<HungerSeedImportPreviewResponse | null>(null);
  const [decisions, setDecisions] = useState<Record<number, RowDecision>>({});
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [bulkActionsByStatus, setBulkActionsByStatus] = useState<
    Record<HungerSeedRowStatus, HungerSeedResolutionAction>
  >({
    New: "Create",
    Unchanged: "Keep",
    ChangedField: "Update",
    ConflictingOwner: "Keep",
    MissingAccount: "Skip",
  });

  const rows = useMemo(() => preview?.rows ?? [], [preview]);

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      await downloadHungerAccountsTemplate();
    } catch (err) {
      toast.error(getHungerErrorMessage(err, "تعذر تحميل قالب الحسابات"));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handlePreview = async () => {
    if (!seedFile) {
      toast.error("يرجى اختيار ملف الإكسل أولاً");
      return;
    }
    setBusy(true);
    try {
      const res = await previewHungerAccountsSeedImport(seedFile);
      setPreview(res);

      // Initialize default decisions per row
      const nextDecisions: Record<number, RowDecision> = {};
      (res.rows ?? []).forEach((row, idx) => {
        const rowNum = row.rowNumber ?? idx + 1;
        const hasError = Boolean(
          row.error || (row.errors && row.errors.length > 0),
        );
        const status = normalizeRowStatus(row);
        const defaultAction: HungerSeedResolutionAction = hasError
          ? "Skip"
          : (ROW_STATUS_META[status]?.defaultAction ?? "Skip");
        nextDecisions[rowNum] = {
          action: defaultAction,
          platformId: row.platformId || defaultPlatformId || "",
        };
      });
      setDecisions(nextDecisions);
      setExpandedRows({});
    } catch (err) {
      toast.error(
        getHungerErrorMessage(err, "فشل تحليل ومعاينة ملف الحسابات"),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleApplyBulkStatusAction = (status: HungerSeedRowStatus) => {
    const chosenAction = bulkActionsByStatus[status];
    setDecisions((prev) => {
      const next = { ...prev };
      rows.forEach((row, idx) => {
        const rowNum = row.rowNumber ?? idx + 1;
        const rowStatus = normalizeRowStatus(row);
        const allowed = getAllowedActionsForRow(row);
        if (rowStatus === status && allowed.includes(chosenAction)) {
          next[rowNum] = {
            action: chosenAction,
            platformId:
              prev[rowNum]?.platformId ||
              row.platformId ||
              defaultPlatformId ||
              "",
          };
        }
      });
      return next;
    });
    toast.info(
      `تم تطبيق القرار (${ACTION_LABELS_AR[chosenAction]}) على جميع صفوف حالة ${ROW_STATUS_META[status].labelAr}`,
    );
  };

  const allRowsResolved = useMemo(() => {
    if (!preview || rows.length === 0) return false;
    return rows.every((row, idx) => {
      const rowNum = row.rowNumber ?? idx + 1;
      const decision = decisions[rowNum];
      if (!decision || !decision.action) return false;
      const allowed = getAllowedActionsForRow(row);
      if (!allowed.includes(decision.action)) return false;
      // If action is Create and row had no platformId, ensure platformId is provided if options exist
      if (
        decision.action === "Create" &&
        !row.platformId &&
        !decision.platformId &&
        !defaultPlatformId
      ) {
        return false;
      }
      return true;
    });
  }, [preview, rows, decisions, defaultPlatformId]);

  const statusCounts = useMemo(() => {
    const counts: Record<HungerSeedRowStatus, number> = {
      New: 0,
      Unchanged: 0,
      ChangedField: 0,
      ConflictingOwner: 0,
      MissingAccount: 0,
    };
    rows.forEach((row) => {
      const st = normalizeRowStatus(row);
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [rows]);

  const handleConfirm = async () => {
    if (!preview?.previewId || !allRowsResolved) return;
    setBusy(true);
    try {
      const resolutions = rows.map((row, idx) => {
        const rowNum = row.rowNumber ?? idx + 1;
        const dec = decisions[rowNum];
        const action = (dec?.action || "Skip") as HungerSeedResolutionAction;
        const resolvedPlatformId =
          row.platformId || dec?.platformId || defaultPlatformId || undefined;
        return {
          rowNumber: rowNum,
          action,
          ...(action === "Create" && resolvedPlatformId
            ? { platformId: resolvedPlatformId }
            : {}),
        };
      });

      await confirmHungerAccountsSeedImport(preview.previewId, { resolutions });
      setPreview(null);
      setSeedFile(null);
      setDecisions({});
      onSuccess();
      onClose();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        toast.error(
          "تغيرت بيانات الحسابات أو انتهت صلاحية المعاينة (409) — يرجى إعادة تشغيل المعاينة مرة أخرى.",
        );
      } else {
        toast.error(
          getHungerErrorMessage(err, "تعذر تأكيد استيراد الحسابات"),
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => !busy && onClose()}
      title="استيراد وتحديث حسابات هنقرستيشن مع معالجة التعارضات"
      maxWidth="max-w-6xl"
    >
      <div className="space-y-4">
        <p className="text-xs text-[var(--muted-foreground)]">
          رفع ملف الإكسل الرسمي ومراجعة كل صف وتحديد قرار المعالجة قبل الاعتماد النهائي
        </p>

        {/* Prominent Mandatory Business Rule Note */}
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            إنشاء الحساب لا يُسند مندوبًا تلقائيًا — يظل التسليم خاضعًا لمراجعة
            المحفظة.
          </div>
        </div>

        {/* File Picker + Template Download + Preview Trigger */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--subtle-bg)] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                setSeedFile(e.target.files?.[0] || null);
                setPreview(null);
                setDecisions({});
              }}
              className="text-xs file:ml-3 file:rounded-lg file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-amber-600"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePreview}
              loading={busy && !preview}
              disabled={!seedFile}
            >
              <Upload className="ml-1.5 h-4 w-4" />
              تشغيل المعاينة وكشف التعارضات
            </Button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadTemplate}
            loading={downloadingTemplate}
          >
            <Download className="ml-1.5 h-4 w-4" />
            تحميل القالب الرسمي (.xlsx)
          </Button>
        </div>

        {preview && (
          <div className="space-y-4">
            {/* Summary Badges */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              {(Object.keys(ROW_STATUS_META) as HungerSeedRowStatus[]).map(
                (st) => {
                  const meta = ROW_STATUS_META[st];
                  const count = statusCounts[st] || 0;
                  return (
                    <div
                      key={st}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <Badge tone={meta.tone}>{st}</Badge>
                        <span className="text-base font-black">{count}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                        {meta.labelAr}
                      </p>
                    </div>
                  );
                },
              )}
            </div>

            {/* Bulk Resolution Helper per Status */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)]/60 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)]">
                <FileSpreadsheet className="h-4 w-4 text-amber-500" />
                <span>تطبيق جماعي حسب حالة الصف:</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    "New",
                    "Unchanged",
                    "ChangedField",
                    "ConflictingOwner",
                  ] as HungerSeedRowStatus[]
                ).map((st) => {
                  const meta = ROW_STATUS_META[st];
                  const count = statusCounts[st] || 0;
                  if (count === 0) return null;
                  return (
                    <div
                      key={st}
                      className="flex flex-col gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>{meta.labelAr}</span>
                        <Badge tone={meta.tone}>{count}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={bulkActionsByStatus[st]}
                          onChange={(e) =>
                            setBulkActionsByStatus((prev) => ({
                              ...prev,
                              [st]: e.target
                                .value as HungerSeedResolutionAction,
                            }))
                          }
                          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                        >
                          {meta.allowedActions.map((act) => (
                            <option key={act} value={act}>
                              {ACTION_LABELS_AR[act]}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleApplyBulkStatusAction(st)}
                        >
                          تطبيق على جميع الصفوف من هذه الحالة
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Global Warnings / Errors */}
            {preview.errors && preview.errors.length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
                <p className="mb-1 font-bold">تنبيهات وأخطاء عامة في الملف:</p>
                <ul className="list-inside list-disc space-y-0.5">
                  {preview.errors.map((errMsg, idx) => (
                    <li key={idx}>{errMsg}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview Rows Table */}
            <div className="max-h-96 overflow-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-right text-xs">
                <thead className="sticky top-0 z-10 bg-[var(--subtle-bg)] font-bold text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-3 py-2.5">#</th>
                    <th className="px-3 py-2.5">المعرف الخارجي</th>
                    <th className="px-3 py-2.5">المالك (الاسم / الهوية)</th>
                    <th className="px-3 py-2.5">المستخدم بالملف</th>
                    <th className="px-3 py-2.5">الحالة والتعارضات</th>
                    <th className="px-3 py-2.5">الفروقات (Changes)</th>
                    <th className="px-3 py-2.5">قرار المعالجة (Resolution)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {rows.map((r, idx) => {
                    const rowNum = r.rowNumber ?? idx + 1;
                    const status = normalizeRowStatus(r);
                    const statusMeta = ROW_STATUS_META[status];
                    const allowedActions = getAllowedActionsForRow(r);
                    const currentDecision = decisions[rowNum] || {
                      action: statusMeta.defaultAction,
                      platformId: r.platformId || defaultPlatformId || "",
                    };
                    const changes = r.changes ?? [];
                    const isExpanded = Boolean(expandedRows[rowNum]);
                    const needsPlatformSelector =
                      currentDecision.action === "Create" &&
                      !r.platformId &&
                      platformOptions.length > 0;

                    return (
                      <Fragment key={rowNum}>
                        <tr className="hover:bg-[var(--subtle-bg)]/50">
                          <td className="px-3 py-2 font-mono font-bold">
                            {rowNum}
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold">
                            {r.externalAccountId || r.accountCode || "—"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-semibold">
                              {r.ownerNameAr || "—"}
                            </div>
                            <div className="font-mono text-[11px] text-[var(--muted-foreground)]">
                              {r.ownerNationalId || r.ownerIqama || "—"}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div>{r.sourceUserNameAr || "—"}</div>
                            <div className="font-mono text-[11px] text-[var(--muted-foreground)]">
                              {r.sourceNationalId || "—"}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-col items-start gap-1">
                              <Badge tone={statusMeta.tone}>
                                {statusMeta.labelAr}
                              </Badge>
                              {r.error && (
                                <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  {r.error}
                                </span>
                              )}
                              {r.errors &&
                                r.errors.map((eStr, eIdx) => (
                                  <span
                                    key={eIdx}
                                    className="text-[11px] font-semibold text-rose-600 dark:text-rose-400"
                                  >
                                    {eStr}
                                  </span>
                                ))}
                              {r.assignmentIssue && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                                  ملاحظة تكليف: {r.assignmentIssue}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {changes.length > 0 ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setExpandedRows((prev) => ({
                                    ...prev,
                                    [rowNum]: !prev[rowNum],
                                  }))
                                }
                              >
                                <span>{changes.length} حقل متغير</span>
                                {isExpanded ? (
                                  <ChevronUp className="mr-1 h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="mr-1 h-3.5 w-3.5" />
                                )}
                              </Button>
                            ) : (
                              <span className="text-[var(--muted-foreground)]">
                                لا توجد فروقات
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="space-y-1.5">
                              <select
                                value={currentDecision.action}
                                onChange={(e) =>
                                  setDecisions((prev) => ({
                                    ...prev,
                                    [rowNum]: {
                                      ...currentDecision,
                                      action: e.target
                                        .value as HungerSeedResolutionAction,
                                    },
                                  }))
                                }
                                disabled={allowedActions.length === 1}
                                className="w-full min-w-[170px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold"
                              >
                                {allowedActions.map((act) => (
                                  <option key={act} value={act}>
                                    {ACTION_LABELS_AR[act]}
                                  </option>
                                ))}
                              </select>

                              {needsPlatformSelector && (
                                <select
                                  value={currentDecision.platformId}
                                  onChange={(e) =>
                                    setDecisions((prev) => ({
                                      ...prev,
                                      [rowNum]: {
                                        ...currentDecision,
                                        platformId: e.target.value,
                                      },
                                    }))
                                  }
                                  className="w-full rounded-lg border border-amber-400 bg-amber-50/50 px-2 py-1 text-[11px] font-medium dark:bg-amber-950/30"
                                >
                                  <option value="">اختر المنصة...</option>
                                  {platformOptions.map((p) => (
                                    <option key={p.value} value={p.value}>
                                      {p.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                        </tr>

                        {isExpanded && changes.length > 0 && (
                          <tr className="bg-[var(--subtle-bg)]/40">
                            <td colSpan={7} className="px-6 py-3">
                              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5">
                                <p className="mb-2 text-[11px] font-bold text-[var(--foreground)]">
                                  تفاصيل الحقول المتغيرة (قبل ← بعد):
                                </p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                  {changes.map((ch, cIdx) => {
                                    const beforeVal =
                                      ch.existing ?? ch.oldValue ?? "فارغ";
                                    const afterVal =
                                      ch.incoming ?? ch.newValue ?? "فارغ";
                                    return (
                                      <div
                                        key={cIdx}
                                        className="rounded border border-[var(--border)] p-2 text-[11px]"
                                      >
                                        <div className="font-bold text-[var(--foreground)]">
                                          {ch.field}
                                        </div>
                                        <div className="mt-1 flex items-center gap-1.5">
                                          <span className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-rose-700 line-through dark:bg-rose-950/40 dark:text-rose-300">
                                            {beforeVal || "—"}
                                          </span>
                                          <span>←</span>
                                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                            {afterVal || "—"}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {allRowsResolved && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>
                  جميع الصفوف ({rows.length}) لديها قرار معالجة محدد وجاهزة
                  للتأكيد.
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-3">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            إغلاق
          </Button>
          {preview?.previewId && (
            <Button
              variant="primary"
              onClick={handleConfirm}
              loading={busy}
              disabled={!allRowsResolved}
            >
              تأكيد واعتماد القرارات ({rows.length} صف)
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
