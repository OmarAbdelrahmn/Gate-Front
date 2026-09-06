"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getVehicleAccidentWorkflows } from "@/lib/fleet/api";
import {
  VehicleAccidentWorkflowSummary,
  VehicleAccidentWorkflowStage,
} from "@/lib/fleet/types";
import {
  formatWorkflowStage,
  getWorkflowStageColor,
  formatRefundStatus,
  formatCountdownTimer,
} from "@/lib/fleet/formatters";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  GitBranch,
  RefreshCw,
  Search,
  Clock,
  ArrowLeft,
  AlertTriangle,
  Building2,
  Car,
  User,
  CheckCircle2,
} from "lucide-react";

export default function AccidentWorkflowsPage() {
  const searchParams = useSearchParams();
  const stageParam = searchParams.get("stage");

  const [data, setData] = useState<VehicleAccidentWorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState<string>(stageParam || "all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);

  // Sync stageParam if URL changes
  useEffect(() => {
    if (stageParam) {
      setSelectedStage(stageParam);
    }
  }, [stageParam]);

  // Live countdown timer ticking effect every 15s
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getVehicleAccidentWorkflows({
        stage: selectedStage !== "all" ? parseInt(selectedStage) : undefined,
        overdueOnly: overdueOnly ? true : undefined,
        page,
        pageSize: 50,
      });
      setData(res.items || []);
    } catch (e) {
      console.error("Failed to load workflows:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleCreated = () => loadData();
    window.addEventListener("accident-created", handleCreated);
    return () => window.removeEventListener("accident-created", handleCreated);
  }, [selectedStage, overdueOnly, page]);

  const filteredData = data.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.accidentNumber?.toLowerCase().includes(q) ||
      item.externalReference?.toLowerCase().includes(q) ||
      item.supplierName?.toLowerCase().includes(q) ||
      item.riderProfileId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GitBranch className="h-6 w-6 text-red-600" />
              متابعة دورة المطالبات والمسارات
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {filteredData.length} مطالبة
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            تتبع الحالات عبر مراحلها الـ 18: تقارير نجم، عروض التعويض، مهل التأمين، أوامر الإصلاح، والإتلاف
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={loadData}
          disabled={loading}
          className="h-10 px-3 text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> تحديث المسارات
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الحادث، المرجع الخارجي، أو اسم الشركة..."
            className="pr-10"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">كافة المراحل (1 - 18)</option>
            <option value="1">1. انتظار تقرير نجم والنسب</option>
            <option value="2">2. تم تحديد المسؤولية</option>
            <option value="3">3. إصلاح بسيط على المندوب</option>
            <option value="4">4. إعداد المطالبة</option>
            <option value="5">5. تم التقديم وانتظار التقييم</option>
            <option value="6">6. وصل عرض التعويض</option>
            <option value="7">7. انتظار رد التأمين (15 يوم)</option>
            <option value="8">8. رفض التأمين</option>
            <option value="9">9. قبول التأمين</option>
            <option value="10">10. انتظار تحويل الشركة (10 أيام)</option>
            <option value="11">11. تحددت جهة الإصلاح</option>
            <option value="12">12. الإصلاح جارٍ</option>
            <option value="13">13. اقتراح الإتلاف</option>
            <option value="14">14. انتظار إعادة الفحص</option>
            <option value="15">15. تأكد الإتلاف</option>
            <option value="16">16. انتظار التقدير المالي</option>
            <option value="17">17. تم تسجيل التقدير المالي</option>
            <option value="18">18. مكتمل المسار الأساسي</option>
          </select>

          {/* Overdue Only Switch */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded border-slate-300 text-red-600 focus:ring-red-600 h-4 w-4"
            />
            <span className="flex items-center gap-1 text-red-600">
              <Clock className="h-3.5 w-3.5" />
              المتأخرات فقط
            </span>
          </label>
        </div>
      </div>

      {/* Workflows Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-[var(--muted)]">جارٍ تحميل بيانات دورة العمل...</div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)]">
            <GitBranch className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-lg font-bold">لا توجد مطالبات مطابقة للمعايير</p>
            <p className="text-xs mt-1">جرب تغيير فلتر المرحلة أو إلغاء فلتر المتأخرات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-4">رقم الحادث</th>
                  <th className="px-6 py-4">المركبة</th>
                  <th className="px-6 py-4">المرحلة الحالية</th>
                  <th className="px-6 py-4">المرجع / الشركة</th>
                  <th className="px-6 py-4">الموعد والمهلة</th>
                  <th className="px-6 py-4">استرداد الأقساط</th>
                  <th className="px-6 py-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredData.map((item) => {
                  const stageColor = getWorkflowStageColor(item.stage);
                  const refund = formatRefundStatus(item.refundStatus);
                  const timer = formatCountdownTimer(item.remainingSeconds);

                  return (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-6 py-4 font-mono font-bold">
                        <Link
                          href={`/admin/fleet/accidents/${item.accidentId || item.id}`}
                          className="flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:underline font-black"
                        >
                          <span>#{item.accidentNumber}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/fleet/vehicles/${item.vehicleId}`}
                          className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-blue-600 dark:text-slate-200"
                        >
                          <Car className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.vehiclePlate || "المركبة"}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold ${stageColor.bg} ${stageColor.text} ${stageColor.border}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {formatWorkflowStage(item.stage)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {item.externalReference || "—"}
                        </div>
                        {item.supplierName && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Building2 className="h-3 w-3" />
                            <span>{item.supplierName}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.deadlineAtUtc ? (
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-bold rounded-lg px-2 py-0.5 w-fit ${
                                timer.isOverdue || item.isOverdue
                                  ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 animate-pulse"
                                  : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                              }`}
                            >
                              <Clock className="h-3 w-3" />
                              {timer.formatted}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">لا يوجد موعد نشط</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-semibold ${refund.bg} ${refund.color}`}
                        >
                          {refund.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link
                          href={`/admin/fleet/accidents/${item.accidentId || item.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:border-red-500 hover:text-red-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all"
                        >
                          <span>إدارة الملف</span>
                          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
