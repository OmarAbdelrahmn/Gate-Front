"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getRiderPlatformHistory,
  type RiderPlatformHistoryResponse,
} from "@/lib/platforms/api";
import { listEmployees } from "@/lib/workforce/api";
import type { Employee } from "@/lib/workforce/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  History,
  User,
  Layers,
  Server,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

function RiderPlatformHistoryContent() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);

  const searchParams = useSearchParams();
  const queryRiderId =
    searchParams.get("riderId") ||
    searchParams.get("riderProfileId") ||
    searchParams.get("employeeId");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<string>("");
  const [historyData, setHistoryData] = useState<RiderPlatformHistoryResponse | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistoryForRider = async (riderId: string) => {
    setSelectedRiderId(riderId);
    if (!riderId) {
      setHistoryData(null);
      return;
    }

    setLoadingHistory(true);
    try {
      const data = await getRiderPlatformHistory(riderId);
      setHistoryData(data);
    } catch (err) {
      console.error("Failed to load rider platform history", err);
      setHistoryData(null);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (!can("platform_assignments.read")) return;

    const fetchRiders = async () => {
      setLoadingEmployees(true);
      try {
        const empList = await listEmployees();
        setEmployees(empList);

        if (queryRiderId) {
          const match = empList.find(
            (e) =>
              e.riderProfileId === queryRiderId ||
              e.id === queryRiderId ||
              e.rider?.id === queryRiderId
          );
          const targetId = match ? match.riderProfileId || match.id : queryRiderId;
          fetchHistoryForRider(targetId);
        }
      } catch (err) {
        console.error("Failed to load riders list", err);
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchRiders();
  }, [queryRiderId]);

  const handleSelectRider = (riderId: string) => {
    fetchHistoryForRider(riderId);
  };

  if (!can("platform_assignments.read")) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800">{t("common.error")}</h2>
        <p className="text-slate-500">
          عفواً، لا تملك صلاحية الوصول لسجل تشغيل المنصات للمندوب (platform_assignments.read).
        </p>
      </div>
    );
  }

  const riderOptions = employees.map((e) => ({
    value: e.riderProfileId || e.id,
    label: `${e.fullNameAr} - ${e.iqamaNo || e.primaryPhone || e.employeeNumber || ""}`,
  }));

  const renderAssignmentStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            نشط
          </Badge>
        );
      case "Ended":
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300 gap-1">
            <Clock className="h-3 w-3" />
            منتهي
          </Badge>
        );
      case "Cancelled":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 gap-1">
            <XCircle className="h-3 w-3" />
            ملغى
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--foreground)]">
          <History className="h-7 w-7 text-[#1167c9]" />
          {t("platforms.riderHistory")}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          عرض وقراءة السجل الكامل لتشغيل المنصات للمندوب عبر كافة الحسابات والمنصات وأصحاب الحسابات
        </p>
      </div>

      {/* Selector Box */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-4">
        <label className="block text-sm font-bold text-[var(--foreground)]">
          اختر المندوب لعرض السجل الكامل:
        </label>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <SearchableSelect
              options={riderOptions}
              value={selectedRiderId}
              onChange={handleSelectRider}
              placeholder="ابحث باسم المندوب أو رقم الإقامة أو الجوال..."
              disabled={loadingEmployees}
            />
          </div>

          {selectedRiderId && (
            <Button
              variant="secondary"
              onClick={() => handleSelectRider(selectedRiderId)}
              disabled={loadingHistory}
              className="gap-2 shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${loadingHistory ? "animate-spin" : ""}`} />
              تحديث السجل
            </Button>
          )}
        </div>
      </div>

      {/* History Content */}
      {loadingHistory ? (
        <div className="space-y-4 p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="h-8 animate-pulse rounded-lg bg-[var(--subtle-bg)]" />
          <div className="h-16 animate-pulse rounded-lg bg-[var(--subtle-bg)]" />
          <div className="h-16 animate-pulse rounded-lg bg-[var(--subtle-bg)]" />
        </div>
      ) : !selectedRiderId ? (
        <div className="py-16 text-center text-[var(--muted)] bg-[var(--subtle-bg)] rounded-2xl border border-dashed border-[var(--border)]">
          <User className="mx-auto mb-3 h-12 w-12 opacity-40" />
          <p className="font-bold text-[var(--foreground)]">يرجى اختيار مندوب من القائمة أعلاه</p>
          <p className="text-xs text-[var(--muted)] mt-1">سيتم عرض السجل التاريخي الكامل لتعيينات المندوب في كافة المنصات</p>
        </div>
      ) : !historyData || historyData.assignments.length === 0 ? (
        <div className="py-12 text-center text-[var(--muted)] bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
          <History className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="font-bold text-[var(--foreground)]">لا يوجد سجل تعيينات منصات لهذا المندوب</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Rider Details Header Banner */}
          <div className="rounded-2xl border border-blue-100 dark:border-blue-900/50 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/40 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[#1167c9] dark:text-blue-400 uppercase tracking-wider">تفاصيل المندوب:</span>
              <h2 className="text-xl font-bold text-[var(--foreground)] mt-0.5">
                {historyData.riderNameAr || "مندوب"}
              </h2>
              {historyData.riderNameEn && (
                <p className="text-xs text-[var(--muted)]">{historyData.riderNameEn}</p>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-[var(--foreground)] bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)]">
              <div>
                <span className="text-[var(--muted)] block text-[10px]">Rider Profile ID:</span>
                <span className="font-mono">{historyData.riderProfileId}</span>
              </div>
              <div>
                <span className="text-[var(--muted)] block text-[10px]">إجمالي التعيينات:</span>
                <span className="font-bold text-[#1167c9] dark:text-blue-400">{historyData.assignments.length}</span>
              </div>
            </div>
          </div>

          {/* Assignments List */}
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                  <tr>
                    <th className="px-6 py-4">المنصة</th>
                    <th className="px-6 py-4">رمز الحساب والمعرف الخارجي</th>
                    <th className="px-6 py-4">{t("platforms.paymentModel")}</th>
                    <th className="px-6 py-4">صاحب الحساب (Owner)</th>
                    <th className="px-6 py-4">فترة التعيين</th>
                    <th className="px-6 py-4">حالة التعيين</th>
                    <th className="px-6 py-4">الأسباب والملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {historyData.assignments.map((item) => (
                    <tr key={item.assignmentId} className="transition-colors hover:bg-blue-500/5">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)] flex items-center gap-2">
                          <Layers className="h-4 w-4 text-[#1167c9] dark:text-blue-400" />
                          {item.platformNameAr || item.platformCode}
                        </div>
                        <div className="text-xs text-[var(--muted)] font-mono">
                          {item.platformCode}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-[var(--foreground)] flex items-center gap-1">
                          <Server className="h-3.5 w-3.5 text-[var(--muted)]" />
                          {item.accountCode}
                        </div>
                        {item.externalAccountId && (
                          <div className="text-xs text-[var(--muted)] font-mono">
                            Ext: {item.externalAccountId}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {item.paymentModel ? (
                          <Badge
                            className={
                              item.paymentModel === "Salary"
                                ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50 font-semibold"
                                : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50 font-semibold"
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

                      <td className="px-6 py-4">
                        <div className="font-medium text-[var(--foreground)]">
                          {item.ownerRiderNameAr || "—"}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-[var(--foreground)]">
                          من: {item.effectiveFrom}
                        </div>
                        <div className="text-xs text-[var(--muted)]">
                          إلى: {item.effectiveTo || "مستمر حتى الآن"}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {renderAssignmentStatusBadge(item.status)}
                      </td>

                      <td className="px-6 py-4 text-xs text-[var(--muted)] space-y-1 max-w-xs">
                        {item.startReason && (
                          <div>
                            <span className="font-bold text-[var(--foreground)]">البداية:</span> {item.startReason}
                          </div>
                        )}
                        {item.endReason && (
                          <div>
                            <span className="font-bold text-[var(--foreground)]">النهاية:</span> {item.endReason}
                          </div>
                        )}
                        {item.wasBackdated && (
                          <div className="text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 rounded p-1">
                            أثر رجي: {item.backdatedReason || "نعم"}
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
        </div>
      )}
    </div>
  );
}

export default function RiderPlatformHistoryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm text-[var(--muted)]">جاري تحميل السجل...</div>}>
      <RiderPlatformHistoryContent />
    </Suspense>
  );
}
