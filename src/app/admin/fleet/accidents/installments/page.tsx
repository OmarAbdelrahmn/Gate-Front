"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getVehicleAccidentWorkflows } from "@/lib/fleet/api";
import {
  VehicleAccidentWorkflowSummary,
  VehicleAccidentRefundStatus,
} from "@/lib/fleet/types";
import {
  formatWorkflowStage,
  formatRefundStatus,
} from "@/lib/fleet/formatters";
import { Button } from "@/components/ui/Button";
import {
  CreditCard,
  RefreshCw,
  Search,
  ArrowLeft,
  Car,
  FileCheck,
  AlertCircle,
} from "lucide-react";

export default function AccidentInstallmentsPage() {
  const [data, setData] = useState<VehicleAccidentWorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getVehicleAccidentWorkflows({
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

  const filteredData = data.filter((item) => {
    const matchesSearch =
      !search ||
      item.accidentNumber?.toLowerCase().includes(search.toLowerCase()) ||
      item.riderProfileId?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || String(item.refundStatus) === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-purple-600" />
              متابعة استرداد أقساط الحوادث
            </h1>
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              {filteredData.length} ملف
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            إدارة الأقساط المدفوعة عن أيام تعطل المركبة خلال الحادث، تقديم طلبات الاسترداد وتسجيل المبالغ المحصلة
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={loadData}
          disabled={loading}
          className="h-10 px-3 text-xs flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> تحديث الأقساط
        </Button>
      </div>

      {/* Info Card */}
      <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4 text-purple-900 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-200">
        <div className="flex items-start gap-3">
          <FileCheck className="h-5 w-5 shrink-0 mt-0.5 text-purple-600" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm">قواعد ومسار استرداد الأقساط</p>
            <p>
              يتم تسجيل الأقساط بعد تحديد تاريخ نهاية الحادث. يشترط إرفاق إيصال الدفع البنكي، وتحديد المبلغ المؤهل للاسترداد عن أيام التعطل. لا يمكن إغلاق ملف الحادث ما لم يتم حسم الاسترداد بالاستلام، الرفض الرسمي، أو إثبات عدم وجود أقساط.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الحادث أو المندوب..."
            className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] pr-10 pl-4 text-xs font-semibold focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="all">كافة حالات الاسترداد</option>
          <option value="1">لم يُقدّم طلب الأقساط</option>
          <option value="2">تم تقديم الطلب (قيد الانتظار)</option>
          <option value="3">تم استلام الاسترداد</option>
          <option value="4">تم رفض الاسترداد</option>
          <option value="5">غير منطبق (لا توجد أقساط)</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-[var(--muted)]">جارٍ تحميل بيانات استرداد الأقساط...</div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)]">
            <CreditCard className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-lg font-bold">لا توجد مطالبات أقساط مطابقة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-4">رقم الحادث</th>
                  <th className="px-6 py-4">المركبة</th>
                  <th className="px-6 py-4">مرحلة دورة العمل</th>
                  <th className="px-6 py-4">حالة استرداد الأقساط</th>
                  <th className="px-6 py-4 text-center">إدارة الأقساط</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredData.map((item) => {
                  const refund = formatRefundStatus(item.refundStatus);

                  return (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-6 py-4 font-mono font-bold">
                        <Link
                          href={`/admin/fleet/accidents/${item.accidentId || item.id}`}
                          className="text-purple-600 hover:text-purple-700 hover:underline"
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
                      <td className="px-6 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {formatWorkflowStage(item.stage)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${refund.bg} ${refund.color}`}
                        >
                          {refund.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link
                          href={`/admin/fleet/accidents/${item.accidentId || item.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs font-bold text-purple-700 shadow-sm hover:bg-purple-50 dark:border-purple-800 dark:bg-slate-800 dark:text-purple-300 transition-all"
                        >
                          <span>عرض وتوثيق الأقساط</span>
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
