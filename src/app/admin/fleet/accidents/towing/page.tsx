"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getVehicleAccidents } from "@/lib/fleet/api";
import { VehicleAccidentSummaryResponse } from "@/lib/fleet/types";
import { Button } from "@/components/ui/Button";
import {
  Truck,
  RefreshCw,
  Search,
  ArrowLeft,
  Car,
  MapPin,
  Calendar,
  AlertTriangle,
  Receipt,
} from "lucide-react";

export default function AccidentTowingPage() {
  const [accidents, setAccidents] = useState<VehicleAccidentSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getVehicleAccidents({
        pageSize: 50,
      });
      // Show accidents, highlighting those not drivable or having towing
      setAccidents(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = accidents.filter(
    (a) =>
      !search ||
      String(a.accidentNumber).includes(search) ||
      (a.locationDescription && a.locationDescription.includes(search))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="h-6 w-6 text-amber-600" />
              السطحات وإيصالات نقل المركبات
            </h1>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              إدارة السطحات
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            توثيق إيصالات سحب ونقل المركبات المتضررة، نقاط الانطلاق والوصول، المبالغ المدفوعة، والمستندات الرسمية
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={loadData}
          disabled={loading}
          className="h-10 px-3 text-xs flex items-center gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> تحديث
        </Button>
      </div>

      {/* Towing Guidelines Banner */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex items-start gap-3">
          <Receipt className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm">متطلبات تسجيل إيصال السطحة (Towing Receipt)</p>
            <p>
              يتم حفظ السطحات في جدول متعدد السجلات بدون حد أقصى. عند رفع إيصال سطحة (نوع المستند 19) يلزم تحديد:
              <strong> وصف الرحلة، موقع التحرك (من)، موقع التسليم (إلى)، تاريخ ووقت النقل، وتكلفة النقل بالريال السعودي</strong> مع إرفاق صورة أو PDF الإيصال.
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الحادث أو الموقع..."
            className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] pr-10 pl-4 text-xs font-semibold focus:outline-none"
          />
        </div>
      </div>

      {/* Table of Accidents with Quick Towing Link */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-[var(--muted)]">جارٍ تحميل بيانات الحوادث...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)]">
            <Truck className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-lg font-bold">لا توجد حوادث مسجلة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-4">رقم الحادث</th>
                  <th className="px-6 py-4">المركبة</th>
                  <th className="px-6 py-4">قابلية القيادة</th>
                  <th className="px-6 py-4">موقع الحادث</th>
                  <th className="px-6 py-4 text-center">إدارة سطحات الحادث</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-red-600">
                      #{item.accidentNumber}
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
                      {!item.isDrivable ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                          <AlertTriangle className="h-3 w-3" />
                          تحتاج سطحة (غير قابلة للقيادة)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          قابلة للقيادة
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{item.locationDescription || "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/admin/fleet/accidents/${item.id}?tab=towing`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-700 shadow-sm hover:bg-amber-50 dark:border-amber-800 dark:bg-slate-800 dark:text-amber-300 transition-all"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        <span>إيصالات ورحلات السطحة</span>
                        <ArrowLeft className="h-3.5 w-3.5" />
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
