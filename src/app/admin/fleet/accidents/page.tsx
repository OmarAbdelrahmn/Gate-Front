"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getVehicleAccidents } from "@/lib/fleet/api";
import {
  VehicleAccidentStatus,
  VehicleAccidentSeverity,
  type VehicleAccidentSummaryResponse,
} from "@/lib/fleet/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  AlertTriangle,
  RefreshCw,
  Plus,
  Search,
  ArrowLeft,
  Calendar,
  MapPin,
  Car,
  User,
  ShieldAlert,
} from "lucide-react";
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [data, setData] = useState<VehicleAccidentSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

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

    const handleCreated = () => loadData();
    window.addEventListener("accident-created", handleCreated);
    return () => window.removeEventListener("accident-created", handleCreated);
  }, [page]);

  const filteredData = data.filter((item) => {
    const matchesSearch =
      !search ||
      String(item.accidentNumber).includes(search) ||
      (item.riderProfileId &&
        item.riderProfileId.toLowerCase().includes(search.toLowerCase())) ||
      (item.locationDescription &&
        item.locationDescription.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" || String(item.status) === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const renderStatus = (status: VehicleAccidentStatus) => {
    switch (status) {
      case VehicleAccidentStatus.Reported:
        return (
          <Badge className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800">
            مسجل (مبدئي)
          </Badge>
        );
      case VehicleAccidentStatus.Finalized:
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
            معتمد
          </Badge>
        );
      case VehicleAccidentStatus.Closed:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300">
            مغلق
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const renderSeverity = (severity: VehicleAccidentSeverity) => {
    switch (severity) {
      case VehicleAccidentSeverity.Minor:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            بسيط
          </span>
        );
      case VehicleAccidentSeverity.Moderate:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            متوسط
          </span>
        );
      case VehicleAccidentSeverity.Serious:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
            خطير
          </span>
        );
      case VehicleAccidentSeverity.Critical:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle className="h-3 w-3" /> حرج (تلف كلي)
          </span>
        );
      default:
        return <span>{severity}</span>;
    }
  };

  if (!can("fleet.accidents.read")) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center" dir="rtl">
        <ShieldAlert className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">صلاحية غير كافية</h2>
        <p className="text-sm text-slate-500 max-w-md">
          لا تملك صلاحية استعراض سجل الحوادث والمطالبات (fleet.accidents.read). يرجى مراجعة إدارة النظام.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              سجل الحوادث الأصلية
            </h1>
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {filteredData.length} حادث
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            استعراض كافة الحوادث المسجلة، تقارير نجم، وتفاصيل الأضرار مع إمكانية متابعة دورة المطالبة لكل حالة
          </p>
        </div>

        {can("fleet.accidents.report") && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/20"
          >
            <Plus className="h-4 w-4" /> تسجيل حادث جديد
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الحادث، المندوب، أو الموقع..."
            className="pr-10"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">كافة الحالات</option>
            <option value="1">مسجل (مبدئي)</option>
            <option value="2">معتمد</option>
            <option value="3">مغلق</option>
          </select>

          <Button
            variant="secondary"
            onClick={loadData}
            disabled={loading}
            className="h-10 px-3 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> تحديث
          </Button>
        </div>
      </div>

      {/* Accidents Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-[var(--muted)]">جارٍ تحميل بيانات الحوادث...</div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)]">
            <AlertTriangle className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-lg font-bold">لا توجد تقارير حوادث مطابقة</p>
            <p className="text-xs mt-1">جرب تغيير معايير البحث أو تسجيل تقرير حادث جديد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-4">رقم الحادث</th>
                  <th className="px-6 py-4">المركبة المعنية</th>
                  <th className="px-6 py-4">المندوب (السائق)</th>
                  <th className="px-6 py-4">تاريخ الحادث</th>
                  <th className="px-6 py-4">الشدة والأضرار</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredData.map((item) => (
                  <tr
                    key={item.id}
                    className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-6 py-4 font-mono font-bold">
                      <Link
                        href={`/admin/fleet/accidents/${item.id}`}
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
                        <span>عرض المركبة</span>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/employees/${item.riderProfileId}`}
                        className="flex items-center gap-1.5 font-mono text-xs text-slate-600 hover:text-blue-600 dark:text-slate-300"
                      >
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>{item.riderProfileId.substring(0, 12)}...</span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {formatDateTime(item.occurredAtUtc)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {renderSeverity(item.severity)}
                        {!item.isDrivable && (
                          <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] px-1.5 py-0">
                            غير قابلة للقيادة
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[var(--muted)] line-clamp-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span>{item.locationDescription || "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{renderStatus(item.status)}</td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/admin/fleet/accidents/${item.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:border-red-500 hover:text-red-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all"
                      >
                        <span>دورة العمل</span>
                        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateAccidentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          setIsCreateOpen(false);
          loadData();
        }}
      />
    </div>
  );
}
