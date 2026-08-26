"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getVehicles } from "@/lib/fleet/api";
import { VehicleOperationalStatus, type VehicleSummaryResponse } from "@/lib/fleet/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Car, Search, Plus, RefreshCw, AlertTriangle, ChevronRight, Filter } from "lucide-react";
import { VehicleUpsertModal } from "./components/VehicleUpsertModal";

export default function VehiclesPage() {
  const { can } = useAuth();
  const [data, setData] = useState<VehicleSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [isUpsertOpen, setIsUpsertOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getVehicles({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        pageSize: 50,
      });
      setData(res?.items || []);
      setTotal(res?.totalCount || 0);
    } catch (e: any) {
      console.warn("Failed to load vehicles data:", e);
      setError(e?.message || "تعذر جلب بيانات المركبات من الخادم.");
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  if (!can("fleet.vehicles.read")) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800">صلاحية غير كافية</h2>
      </div>
    );
  }

  const renderStatus = (status: VehicleOperationalStatus) => {
    switch (status) {
      case VehicleOperationalStatus.Available: return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">متاح</Badge>;
      case VehicleOperationalStatus.Assigned: return <Badge className="bg-blue-50 text-blue-700 border-blue-200">معيّن</Badge>;
      case VehicleOperationalStatus.ProblemHold: return <Badge className="bg-orange-50 text-orange-700 border-orange-200">إيقاف (مشكلة)</Badge>;
      case VehicleOperationalStatus.AccidentHold: return <Badge className="bg-red-50 text-red-700 border-red-200">إيقاف (حادث)</Badge>;
      case VehicleOperationalStatus.Stolen: return <Badge className="bg-purple-50 text-purple-700 border-purple-200">مسروق</Badge>;
      case VehicleOperationalStatus.OutOfService: return <Badge className="bg-slate-100 text-slate-700 border-slate-300">خارج الخدمة</Badge>;
      case VehicleOperationalStatus.Decommissioned: return <Badge className="bg-slate-800 text-slate-300 border-slate-700">مستبعد</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Car className="h-7 w-7 text-[#1167c9]" />
            أسطول المركبات
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            إدارة المركبات، الاستمارات، وتتبع العهدة
          </p>
        </div>
        {can("fleet.vehicles.manage") && (
          <Button onClick={() => setIsUpsertOpen(true)} className="flex items-center gap-2 bg-[#1167c9] hover:bg-[#0e56a8]">
            <Plus className="h-4 w-4" /> إضافة مركبة جديدة
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-1 min-w-[280px] gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالرقم الداخلي، اللوحة، أو الهيكل..."
              className="pr-10"
            />
          </div>
          <Button type="submit" variant="secondary">بحث</Button>
        </form>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <Filter className="h-4 w-4" /> الحالة:
          </div>
          <div className="w-40">
            <SearchableSelect
              options={[
                { value: "", label: "الكل" },
                { value: "Available", label: "متاح" },
                { value: "Assigned", label: "معيّن" },
                { value: "ProblemHold", label: "إيقاف (مشكلة)" },
                { value: "AccidentHold", label: "إيقاف (حادث)" },
                { value: "OutOfService", label: "خارج الخدمة" },
              ]}
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
            />
          </div>
          <Button variant="secondary" onClick={loadData} disabled={loading} className="px-3">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <span>{error}</span>
          </div>
          <Button variant="secondary" onClick={loadData} className="gap-1 text-xs px-3">
            <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-[var(--muted)]">جارٍ التحميل...</div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)]">
            <Car className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-lg font-bold">{error ? "لا توجد بيانات متاحة حالياً" : "لا توجد مركبات مطابقة"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-4">الرقم المرجعي (Asset)</th>
                  <th className="px-6 py-4">رقم اللوحة</th>
                  <th className="px-6 py-4">الموديل</th>
                  <th className="px-6 py-4">المدينة / الكفيل</th>
                  <th className="px-6 py-4">عداد الكيلومترات</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4 text-center">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-mono font-bold text-[#1167c9]">
                      <Link href={`/dashboard/fleet/vehicles/${item.id}`}>{item.assetNumber}</Link>
                    </td>
                    <td className="px-6 py-4">
                      {item.plateNumberAr ? (
                        <div className="flex flex-col">
                          <span className="font-bold border border-slate-300 rounded px-2 py-0.5 w-fit shadow-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                            {item.plateNumberAr}
                          </span>
                          <span className="text-xs text-[var(--muted)] mt-1">{item.plateNumberEn}</span>
                        </div>
                      ) : (
                        <span className="text-[var(--muted)]">بدون لوحة</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold">{item.manufacturer} {item.model}</div>
                      <div className="text-xs text-[var(--muted)]">النوع: {item.vehicleType}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div>{item.operatingCity || "—"}</div>
                      <div className="text-xs text-[var(--muted)]">{item.sponsorName || "—"}</div>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {item.currentOdometer.toLocaleString()} كم
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2 items-start">
                        {renderStatus(item.status)}
                        {!item.isReadyForAssignment && item.status === VehicleOperationalStatus.Available && (
                          <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] px-1">غير جاهزة للتسليم</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link href={`/dashboard/fleet/vehicles/${item.id}`} className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors">
                        <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <VehicleUpsertModal 
        isOpen={isUpsertOpen} 
        onClose={() => setIsUpsertOpen(false)} 
        onSuccess={() => { setIsUpsertOpen(false); loadData(); }}
      />
    </div>
  );
}
