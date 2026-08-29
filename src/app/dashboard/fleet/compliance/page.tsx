"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getVehicleComplianceDue } from "@/lib/fleet/api";
import { VehicleComplianceDueStatus, type VehicleComplianceDueResponse } from "@/lib/fleet/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { ShieldCheck, RefreshCw, AlertTriangle, Filter, Search } from "lucide-react";
import Link from "next/link";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().split("T")[0];
  } catch {
    return dateStr;
  }
}

export default function CompliancePage() {
  const { can } = useAuth();
  const [data, setData] = useState<VehicleComplianceDueResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkDate, setCheckDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getVehicleComplianceDue(checkDate || undefined);
      console.log("Compliance Due API Response:", res);
      setData(res || []);
    } catch (e: any) {
      console.error("Failed to load compliance data:", e);
      setError(e?.message || "تعذر جلب بيانات متابعة تجديد التراخيص.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [checkDate]);

  const displayItems = useMemo(() => {
    const list: VehicleComplianceDueResponse[] = [];
    const seenPermitVehicles = new Set<string>();

    for (const item of data) {
      list.push(item);
      if (
        item.type === "Permit" ||
        item.type === "Permission" ||
        item.type === "VehiclePermit" ||
        item.type === "RiderPermit"
      ) {
        seenPermitVehicles.add(item.vehicleId);
      }
    }

    for (const item of data) {
      if (
        (item.permitEndDate || (item.permitStatus !== undefined && item.permitStatus !== null)) &&
        !seenPermitVehicles.has(item.vehicleId)
      ) {
        seenPermitVehicles.add(item.vehicleId);
        list.push({
          vehicleId: item.vehicleId,
          assetNumber: item.assetNumber,
          plateNumber: item.plateNumber,
          plateNumberAr: item.plateNumberAr,
          plateNumberEn: item.plateNumberEn,
          type: "Permit",
          expiryDate: item.permitEndDate || "",
          status: item.permitStatus ?? VehicleComplianceDueStatus.Missing,
          permitEndDate: item.permitEndDate,
          permitStatus: item.permitStatus,
        });
      }
    }

    return list;
  }, [data]);

  const filtered = useMemo(() => {
    return displayItems.filter((item) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      const plate = (item.plateNumberAr || item.plateNumber || item.plateNumberEn || "").toLowerCase();
      return (
        item.assetNumber.toLowerCase().includes(searchLower) ||
        plate.includes(searchLower)
      );
    });
  }, [displayItems, search]);

  const expiredOrMissingCount = useMemo(() => {
    return displayItems.filter(
      (i) =>
        (i.status ?? i.permitStatus) === VehicleComplianceDueStatus.Expired ||
        (i.status ?? i.permitStatus) === VehicleComplianceDueStatus.Missing
    ).length;
  }, [displayItems]);

  const dueTodayCount = useMemo(() => {
    return displayItems.filter(
      (i) => (i.status ?? i.permitStatus) === VehicleComplianceDueStatus.DueToday
    ).length;
  }, [displayItems]);

  const upcomingCount = useMemo(() => {
    return displayItems.filter(
      (i) => (i.status ?? i.permitStatus) === VehicleComplianceDueStatus.Upcoming
    ).length;
  }, [displayItems]);

  if (!can("fleet.compliance.read")) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800">صلاحية غير كافية</h2>
      </div>
    );
  }

  const renderStatus = (status: VehicleComplianceDueStatus) => {
    switch (status) {
      case VehicleComplianceDueStatus.Valid:
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">ساري</Badge>;
      case VehicleComplianceDueStatus.Upcoming:
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">قريب الانتهاء</Badge>;
      case VehicleComplianceDueStatus.DueToday:
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200">ينتهي اليوم</Badge>;
      case VehicleComplianceDueStatus.Expired:
        return <Badge className="bg-red-50 text-red-700 border-red-200">منتهي</Badge>;
      case VehicleComplianceDueStatus.Missing:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-300">مفقود (غير مسجل)</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getDocTypeName = (type: string) => {
    switch (type) {
      case "Registration":
      case "Istimara":
        return "استمارة سير";
      case "InsurancePolicy":
      case "Insurance":
        return "بوليصة تأمين";
      case "Inspection":
      case "Fahs":
        return "فحص دوري";
      case "OperationCard":
        return "كرت تشغيل";
      case "Permit":
      case "Permission":
      case "VehiclePermit":
      case "RiderPermit":
        return "تصريح / تفويض";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <ShieldCheck className="h-7 w-7 text-emerald-600" />
            ملاحظات التراخيص
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            متابعة تجديد الاستمارات، الفحص الدوري والتأمين للمركبات
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <Filter className="h-4 w-4" /> فحص الرصيد لتاريخ:
          </div>
          <div>
            <Input type="date" value={checkDate} onChange={(e) => setCheckDate(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-1 min-w-[280px] gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالرقم المرجعي أو اللوحة..."
              className="pr-10"
            />
          </div>
          <Button variant="secondary" onClick={loadData} disabled={loading} className="px-3">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-sm">
          <div className="text-sm font-bold text-red-800">منتهي أو مفقود</div>
          <div className="text-3xl font-bold text-red-600 mt-2">{expiredOrMissingCount}</div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 shadow-sm">
          <div className="text-sm font-bold text-orange-800">ينتهي اليوم</div>
          <div className="text-3xl font-bold text-orange-600 mt-2">{dueTodayCount}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
          <div className="text-sm font-bold text-blue-800">قريب الانتهاء (30 يوم)</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">{upcomingCount}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-[var(--muted)]">جارٍ التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)]">
            <ShieldCheck className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-lg font-bold">جميع التراخيص سارية أو لا توجد تنبيهات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-4">المركبة</th>
                  <th className="px-6 py-4">نوع الوثيقة</th>
                  <th className="px-6 py-4">تاريخ الانتهاء</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((item, idx) => (
                  <tr
                    key={`${item.vehicleId}-${item.type}-${idx}`}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold text-[#1167c9]">
                        <Link href={`/dashboard/fleet/vehicles/${item.vehicleId}`}>
                          {item.assetNumber}
                        </Link>
                      </div>
                      <div className="mt-1">
                        {item.plateNumberAr || item.plateNumber || item.plateNumberEn ? (
                          <span className="font-bold border border-slate-300 rounded px-2 py-0.5 text-xs shadow-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                            {item.plateNumberAr || item.plateNumber || item.plateNumberEn}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">بدون لوحة</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                      {getDocTypeName(item.type)}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {formatDate(item.expiryDate || item.permitEndDate)}
                    </td>
                    <td className="px-6 py-4">
                      {renderStatus(item.status ?? item.permitStatus!)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/dashboard/fleet/vehicles/${item.vehicleId}`}
                        className="text-sm font-bold text-[#1167c9] hover:underline"
                      >
                        تحديث البيانات
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
