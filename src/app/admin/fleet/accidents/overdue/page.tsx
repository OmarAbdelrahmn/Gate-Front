"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getVehicleAccidentWorkflows } from "@/lib/fleet/api";
import { VehicleAccidentWorkflowSummary } from "@/lib/fleet/types";
import {
  formatWorkflowStage,
  getWorkflowStageColor,
  formatCountdownTimer,
} from "@/lib/fleet/formatters";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Clock,
  RefreshCw,
  AlertTriangle,
  Building2,
  Car,
  ArrowLeft,
  Calendar,
  PhoneCall,
} from "lucide-react";

export default function AccidentOverduePage() {
  const [data, setData] = useState<VehicleAccidentWorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getVehicleAccidentWorkflows({
        overdueOnly: true,
        pageSize: 100,
      });
      setData(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <Clock className="h-6 w-6" />
              المهل والمتأخرات الحرجة
            </h1>
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
              {data.length} حالة متأخرة
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            تنبيهات فورية للمطالبات التي تجاوزت المهلة المحددة نظاماً (مهلة الـ 15 يوماً لرد التأمين، أو مهلة الـ 10 أيام لتحويل شركة الشراء)
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={loadData}
          disabled={loading}
          className="h-10 px-3 text-xs flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> تحديث المهل
        </Button>
      </div>

      {/* Overview Alert Banner */}
      <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm">تنبيه متابعة وتصعيد المطالبات</p>
            <p>
              يجب على مسؤول المطالبات مراجعة شركة التأمين أو شركة شراء المركبة فور انقضاء المهلة لتسجيل الرد، أو تنفيذ إجراء "متابعة عامة (Follow Up)" لتوثيق الاتصال والتأكيد، أو تصعيد الملف قانونياً.
            </p>
          </div>
        </div>
      </div>

      {/* Overdue Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-[var(--muted)]">جارٍ فحص المواعيد والمهل...</div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)]">
            <Clock className="mx-auto mb-3 h-12 w-12 text-emerald-500 opacity-60" />
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
              لا توجد مطالبات متأخرة حالياً
            </p>
            <p className="text-xs text-slate-500 mt-1">
              كافة المهل التأمينية ومواعيد التحويل ضمن النطاق الزمني النظامي.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-4">رقم الحادث</th>
                  <th className="px-6 py-4">المركبة</th>
                  <th className="px-6 py-4">المرحلة</th>
                  <th className="px-6 py-4">الجهة المعنية</th>
                  <th className="px-6 py-4">مدة التأخير</th>
                  <th className="px-6 py-4 text-center">الإجراء المطلوب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data.map((item, index) => {
                  const stageColor = getWorkflowStageColor(item.stage);
                  const timer = formatCountdownTimer(item.remainingSeconds);

                  return (
                    <tr
                      key={item.accidentId || item.id || `overdue-${index}`}
                      className="transition-colors hover:bg-red-50/40 dark:hover:bg-red-950/20"
                    >
                      <td className="px-6 py-4 font-mono font-bold">
                        <Link
                          href={`/admin/fleet/accidents/${item.accidentId || item.id}`}
                          className="text-red-600 hover:text-red-700 hover:underline"
                        >
                          #{item.accidentNumber}
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
                          {formatWorkflowStage(item.stage)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.supplierName || item.externalReference || "الجهة المعنية"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-2.5 py-1 text-xs font-black text-red-700 dark:bg-red-950/60 dark:text-red-300">
                          <Clock className="h-3.5 w-3.5" />
                          {timer.formatted}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link
                          href={`/admin/fleet/accidents/${item.accidentId || item.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-all"
                        >
                          <span>متابعة وتسجيل الرد</span>
                          <ArrowLeft className="h-3.5 w-3.5" />
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
