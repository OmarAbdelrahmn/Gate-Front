"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getVehicleAccidents } from "@/lib/fleet/api";
import { VehicleAccidentStatus, VehicleAccidentSeverity, type VehicleAccidentSummaryResponse } from "@/lib/fleet/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AlertTriangle, RefreshCw, Filter, Plus } from "lucide-react";
import { CreateAccidentModal } from "./components/CreateAccidentModal";
import Link from "next/link";

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().replace("T", " ").substring(0, 16);
  } catch {
    return dateStr;
  }
}

export default function AccidentsPage() {
  const { can } = useAuth();
  const [data, setData] = useState<VehicleAccidentSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getVehicleAccidents({
        page,
        pageSize: 50,
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
  }, [page]);

  if (!can("fleet.accidents.read")) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800">صلاحية غير كافية</h2>
      </div>
    );
  }

  const renderStatus = (status: VehicleAccidentStatus) => {
    switch (status) {
      case VehicleAccidentStatus.Reported: return <Badge className="bg-orange-50 text-orange-700 border-orange-200">مسجل (مبدئي)</Badge>;
      case VehicleAccidentStatus.Finalized: return <Badge className="bg-blue-50 text-blue-700 border-blue-200">معتمد</Badge>;
      case VehicleAccidentStatus.Closed: return <Badge className="bg-slate-100 text-slate-700 border-slate-300">مغلق</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const renderSeverity = (severity: VehicleAccidentSeverity) => {
    switch (severity) {
      case VehicleAccidentSeverity.Minor: return <span className="text-emerald-600 text-xs font-bold">بسيط</span>;
      case VehicleAccidentSeverity.Moderate: return <span className="text-yellow-600 text-xs font-bold">متوسط</span>;
      case VehicleAccidentSeverity.Serious: return <span className="text-orange-600 text-xs font-bold">خطير</span>;
      case VehicleAccidentSeverity.Critical: return <span className="text-red-600 text-xs font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> حرج جداً (تلف كلي)</span>;
      default: return <span>{severity}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <AlertTriangle className="h-7 w-7 text-red-600" />
            حوادث المركبات
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            إدارة تقارير الحوادث، المطالبات التأمينية وإجراءات الصيانة
          </p>
        </div>
        {can("fleet.accidents.manage") && (
          <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4" /> تسجيل حادث جديد
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <Filter className="h-4 w-4" /> تصفية سريعة
          </div>
        </div>
        <Button variant="secondary" onClick={loadData} disabled={loading} className="px-3">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-[var(--muted)]">جارٍ التحميل...</div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)]">
            <AlertTriangle className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-lg font-bold">لا توجد تقارير حوادث مسجلة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-4">رقم الحادث</th>
                  <th className="px-6 py-4">المركبة</th>
                  <th className="px-6 py-4">المندوب (السائق)</th>
                  <th className="px-6 py-4">تاريخ الحادث</th>
                  <th className="px-6 py-4">الأضرار / الحالة</th>
                  <th className="px-6 py-4">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-mono font-bold text-red-600">
                      #{item.accidentNumber}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold">
                      <Link href={`/dashboard/fleet/vehicles/${item.vehicleId}`} className="hover:underline hover:text-[#1167c9]">
                        المركبة المعنية
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <Link href={`/dashboard/hr/external-riders/${item.riderProfileId}`} className="hover:underline hover:text-[#1167c9]">
                        {item.riderProfileId}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {formatDateTime(item.occurredAtUtc)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 items-center mb-1">
                        {renderSeverity(item.severity)}
                        {!item.isDrivable && <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] px-1">غير قابلة للقيادة</Badge>}
                      </div>
                      <div className="text-xs text-[var(--muted)] line-clamp-1">{item.locationDescription || "—"}</div>
                    </td>
                    <td className="px-6 py-4">
                      {renderStatus(item.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateAccidentModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={() => { setIsCreateOpen(false); loadData(); }} />
    </div>
  );
}
