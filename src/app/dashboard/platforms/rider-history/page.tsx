"use client";

import { useEffect, useState } from "react";
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

export default function RiderPlatformHistoryPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<string>("");
  const [historyData, setHistoryData] = useState<RiderPlatformHistoryResponse | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!can("platform_assignments.read")) return;

    const fetchRiders = async () => {
      setLoadingEmployees(true);
      try {
        const empList = await listEmployees();
        setEmployees(empList);
      } catch (err) {
        console.error("Failed to load riders list", err);
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchRiders();
  }, []);

  const handleSelectRider = async (riderId: string) => {
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
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <History className="h-7 w-7 text-[#1167c9]" />
          {t("platforms.riderHistory")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          عرض وقراءة السجل الكامل لتشغيل المنصات للمندوب عبر كافة الحسابات والمنصات وأصحاب الحسابات
        </p>
      </div>

      {/* Selector Box */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
        <label className="block text-sm font-bold text-slate-800">
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
        <div className="space-y-4 p-6 rounded-2xl border border-slate-200 bg-white">
          <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
        </div>
      ) : !selectedRiderId ? (
        <div className="py-16 text-center text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <User className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="font-bold text-slate-700">يرجى اختيار مندوب من القائمة أعلاه</p>
          <p className="text-xs text-slate-400 mt-1">سيتم عرض السجل التاريخي الكامل لتعيينات المندوب في كافة المنصات</p>
        </div>
      ) : !historyData || historyData.assignments.length === 0 ? (
        <div className="py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          <History className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-bold text-slate-700">لا يوجد سجل تعيينات منصات لهذا المندوب</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Rider Details Header Banner */}
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[#1167c9] uppercase tracking-wider">تفاصيل المندوب:</span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                {historyData.riderNameAr || "مندوب"}
              </h2>
              {historyData.riderNameEn && (
                <p className="text-xs text-slate-500">{historyData.riderNameEn}</p>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 bg-white/80 rounded-xl p-3 border border-slate-200/60">
              <div>
                <span className="text-slate-400 block text-[10px]">Rider Profile ID:</span>
                <span className="font-mono">{historyData.riderProfileId}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">إجمالي التعيينات:</span>
                <span className="font-bold text-[#1167c9]">{historyData.assignments.length}</span>
              </div>
            </div>
          </div>

          {/* Assignments List */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50/80 text-xs font-bold uppercase text-slate-500">
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
                <tbody className="divide-y divide-slate-100">
                  {historyData.assignments.map((item) => (
                    <tr key={item.assignmentId} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <Layers className="h-4 w-4 text-[#1167c9]" />
                          {item.platformNameAr || item.platformCode}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {item.platformCode}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-slate-800 flex items-center gap-1">
                          <Server className="h-3.5 w-3.5 text-slate-400" />
                          {item.accountCode}
                        </div>
                        {item.externalAccountId && (
                          <div className="text-xs text-slate-500 font-mono">
                            Ext: {item.externalAccountId}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {item.paymentModel ? (
                          <Badge
                            className={
                              item.paymentModel === "Salary"
                                ? "bg-purple-50 text-purple-700 border-purple-200 font-semibold"
                                : "bg-blue-50 text-blue-700 border-blue-200 font-semibold"
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
                        <div className="font-medium text-slate-800">
                          {item.ownerRiderNameAr || "—"}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-900">
                          من: {item.effectiveFrom}
                        </div>
                        <div className="text-xs text-slate-500">
                          إلى: {item.effectiveTo || "مستمر حتى الآن"}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {renderAssignmentStatusBadge(item.status)}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-600 space-y-1 max-w-xs">
                        {item.startReason && (
                          <div>
                            <span className="font-bold text-slate-700">البداية:</span> {item.startReason}
                          </div>
                        )}
                        {item.endReason && (
                          <div>
                            <span className="font-bold text-slate-700">النهاية:</span> {item.endReason}
                          </div>
                        )}
                        {item.wasBackdated && (
                          <div className="text-amber-800 bg-amber-50 rounded p-1">
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
