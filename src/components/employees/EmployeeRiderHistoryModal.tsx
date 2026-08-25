"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getRiderPlatformHistory,
  type RiderPlatformHistoryResponse,
} from "@/lib/platforms/api";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  History,
  Layers,
  Server,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface EmployeeRiderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  riderProfileId?: string | null;
  riderName?: string | null;
}

export function EmployeeRiderHistoryModal({
  isOpen,
  onClose,
  employeeId,
  riderProfileId,
  riderName,
}: EmployeeRiderHistoryModalProps) {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const [historyData, setHistoryData] = useState<RiderPlatformHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const targetRiderId = riderProfileId || employeeId;

  const fetchHistory = async () => {
    if (!targetRiderId || !isOpen) return;

    setLoading(true);
    setError("");
    try {
      const data = await getRiderPlatformHistory(targetRiderId);
      setHistoryData(data);
    } catch (err) {
      console.error("Failed to load rider platform history", err);
      setError(
        isEn
          ? "Failed to load platform history for this rider."
          : "تعذر تحميل سجل تشغيل المنصات للمندوب.",
      );
      setHistoryData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, targetRiderId]);

  const renderAssignmentStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/50">
            <CheckCircle2 className="h-3 w-3" />
            {isEn ? "Active" : "نشط"}
          </Badge>
        );
      case "Ended":
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300 gap-1 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <Clock className="h-3 w-3" />
            {isEn ? "Ended" : "منتهي"}
          </Badge>
        );
      case "Cancelled":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 gap-1 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900/50">
            <XCircle className="h-3 w-3" />
            {isEn ? "Cancelled" : "ملغى"}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEn ? "Rider Platform History" : "سجل تشغيل المنصات للمندوب"}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5">
        {/* Header Action & Summary */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/40 p-4">
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)]">
              {riderName || historyData?.riderNameAr || (isEn ? "Rider" : "المندوب")}
            </h3>
            <p className="text-xs text-[var(--muted)]">
              {isEn
                ? "Complete historical log of platform assignments, working accounts, and owner details."
                : "السجل التاريخي الكامل لتعيينات المنصات وحسابات العمل وأصحاب الحسابات."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {historyData && (
              <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)]">
                {isEn ? "Total Assignments: " : "إجمالي التعيينات: "}
                <span className="font-bold text-[#1167c9] dark:text-blue-400">
                  {historyData.assignments.length}
                </span>
              </div>
            )}

            <Button
              variant="secondary"
              onClick={fetchHistory}
              disabled={loading}
              className="h-8 min-h-0 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {isEn ? "Refresh" : "تحديث"}
            </Button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="space-y-3 py-8">
            <div className="h-10 animate-pulse rounded-xl bg-[var(--subtle-bg)]" />
            <div className="h-16 animate-pulse rounded-xl bg-[var(--subtle-bg)]" />
            <div className="h-16 animate-pulse rounded-xl bg-[var(--subtle-bg)]" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 gap-2">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <p className="font-bold">{error}</p>
          </div>
        ) : !historyData || historyData.assignments.length === 0 ? (
          <div className="py-12 text-center text-[var(--muted)] bg-[var(--subtle-bg)] rounded-xl border border-dashed border-[var(--border)]">
            <History className="mx-auto mb-2 h-10 w-10 opacity-30" />
            <p className="font-bold text-[var(--foreground)]">
              {isEn ? "No platform assignment history found for this rider." : "لا يوجد سجل تعيينات منصات لهذا المندوب."}
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">
              {isEn ? "Platform assignment records will appear here once created." : "ستظهر سجلات تعيينات المنصات هنا فور إنشائها."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3">{isEn ? "Platform" : "المنصة"}</th>
                    <th className="px-4 py-3">{isEn ? "Account & Working ID" : "رمز الحساب والمعرف الخارجي"}</th>
                    <th className="px-4 py-3">{t("platforms.paymentModel")}</th>
                    <th className="px-4 py-3">{isEn ? "Account Owner" : "صاحب الحساب (Owner)"}</th>
                    <th className="px-4 py-3">{isEn ? "Assignment Period" : "فترة التعيين"}</th>
                    <th className="px-4 py-3">{isEn ? "Status" : "حالة التعيين"}</th>
                    <th className="px-4 py-3">{isEn ? "Notes & Reasons" : "الأسباب والملاحظات"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {historyData.assignments.map((item) => (
                    <tr key={item.assignmentId} className="transition-colors hover:bg-blue-500/5">
                      <td className="px-4 py-3">
                        <div className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-[#1167c9] dark:text-blue-400 shrink-0" />
                          <span>
                            {isEn
                              ? item.platformNameEn || item.platformNameAr || item.platformCode
                              : item.platformNameAr || item.platformNameEn || item.platformCode}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--muted)] font-mono">
                          {item.platformCode}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-[var(--foreground)] flex items-center gap-1">
                          <Server className="h-3.5 w-3.5 text-[var(--muted)] shrink-0" />
                          <span>{item.accountCode}</span>
                        </div>
                        {item.externalAccountId && (
                          <div className="text-[11px] text-[var(--muted)] font-mono">
                            Ext: {item.externalAccountId}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {item.paymentModel ? (
                          <Badge
                            className={
                              item.paymentModel === "Salary"
                                ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50 font-semibold text-xs"
                                : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50 font-semibold text-xs"
                            }
                          >
                            {item.paymentModel === "PayPerOrder"
                              ? t("platforms.payPerOrder")
                              : item.paymentModel === "Salary"
                              ? t("platforms.salary")
                              : item.paymentModel}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--foreground)] text-xs">
                          {isEn
                            ? item.ownerRiderNameEn || item.ownerRiderNameAr || "—"
                            : item.ownerRiderNameAr || item.ownerRiderNameEn || "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-xs">
                        <div className="font-bold text-[var(--foreground)]">
                          {isEn ? "From: " : "من: "}
                          {item.effectiveFrom}
                        </div>
                        <div className="text-[11px] text-[var(--muted)]">
                          {isEn ? "To: " : "إلى: "}
                          {item.effectiveTo || (isEn ? "Ongoing" : "مستمر حتى الآن")}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {renderAssignmentStatusBadge(item.status)}
                      </td>

                      <td className="px-4 py-3 text-xs text-[var(--muted)] space-y-0.5 max-w-xs">
                        {item.startReason && (
                          <div>
                            <span className="font-bold text-[var(--foreground)]">
                              {isEn ? "Start: " : "البداية: "}
                            </span>
                            {item.startReason}
                          </div>
                        )}
                        {item.endReason && (
                          <div>
                            <span className="font-bold text-[var(--foreground)]">
                              {isEn ? "End: " : "النهاية: "}
                            </span>
                            {item.endReason}
                          </div>
                        )}
                        {item.wasBackdated && (
                          <div className="text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 rounded p-1 text-[11px]">
                            {isEn ? "Backdated: " : "أثر رجعي: "}
                            {item.backdatedReason || (isEn ? "Yes" : "نعم")}
                          </div>
                        )}
                        {!item.startReason && !item.endReason && !item.wasBackdated && "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
