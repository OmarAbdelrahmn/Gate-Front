"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getVehicles } from "@/lib/fleet/api";
import { VehicleOperationalStatus, type VehicleSummaryResponse } from "@/lib/fleet/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Key, Search, RefreshCw, Car, ArrowLeftRight, CalendarClock, ShieldCheck } from "lucide-react";
import { TakeVehicleModal } from "./components/TakeVehicleModal";
import { ReturnVehicleModal } from "./components/ReturnVehicleModal";
import { SwitchVehicleModal } from "./components/SwitchVehicleModal";
import { RenewPermissionModal } from "./components/RenewPermissionModal";

type ActiveModal = "take" | "return" | "switch" | "renew" | null;

export default function AssignmentsPage() {
  const { can } = useAuth();
  const [data, setData] = useState<VehicleSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"assigned" | "available">("assigned");

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSummaryResponse | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getVehicles({
        search,
        status: filterType === "assigned" ? VehicleOperationalStatus.Assigned.toString() : VehicleOperationalStatus.Available.toString(),
        pageSize: 50,
      });
      // Filter out available vehicles that are not ready
      if (filterType === "available") {
        setData(res.items.filter(v => v.isReadyForAssignment));
      } else {
        setData(res.items);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const openModal = (type: ActiveModal, vehicle: VehicleSummaryResponse | null = null) => {
    setSelectedVehicle(vehicle);
    setActiveModal(type);
  };

  const handleModalSuccess = () => {
    setActiveModal(null);
    setSelectedVehicle(null);
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Key className="h-7 w-7 text-[#1167c9]" />
            مركز تعيينات المركبات
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            إدارة تسليم واستلام وتبديل المركبات للمناديب
          </p>
        </div>
        
        {can("fleet.assignments.manage") && (
          <div className="flex gap-2">
            <Button onClick={() => openModal("take")} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Key className="h-4 w-4" /> تسليم مركبة
            </Button>
            <Button onClick={() => openModal("return")} variant="secondary" className="gap-2">
              <ArrowLeftRight className="h-4 w-4" /> استلام مركبة
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Button 
            variant={filterType === "assigned" ? "primary" : "secondary"} 
            className={filterType === "assigned" ? "bg-[#1167c9] hover:bg-[#0e56a8]" : ""}
            onClick={() => setFilterType("assigned")}
          >
            المركبات المسلمة (في العهدة)
          </Button>
          <Button 
            variant={filterType === "available" ? "primary" : "secondary"}
            className={filterType === "available" ? "bg-[#1167c9] hover:bg-[#0e56a8]" : ""}
            onClick={() => setFilterType("available")}
          >
            المركبات المتاحة (جاهزة)
          </Button>
        </div>

        <form onSubmit={handleSearch} className="flex min-w-[280px] gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالرقم أو اللوحة..."
              className="pr-10"
            />
          </div>
          <Button type="submit" variant="secondary">
            <Search className="h-4 w-4" />
          </Button>
          <Button type="button" variant="secondary" onClick={loadData} disabled={loading} className="px-3">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-[var(--muted)]">جارٍ التحميل...</div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)]">
            <Key className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-lg font-bold">لا توجد بيانات مطابقة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-4">المركبة</th>
                  <th className="px-6 py-4">اللوحة</th>
                  {filterType === "assigned" && <th className="px-6 py-4">المندوب الحالي</th>}
                  <th className="px-6 py-4">العداد (كم)</th>
                  {can("fleet.assignments.manage") && <th className="px-6 py-4 text-center">الإجراءات السريعة</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <div className="font-bold font-mono text-[#1167c9]">{item.assetNumber}</div>
                      <div className="text-xs text-[var(--muted)]">{item.manufacturer} {item.model}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold border border-slate-300 rounded px-2 py-0.5 w-fit bg-white dark:bg-slate-900 shadow-sm">
                        {item.plateNumberAr || "بدون لوحة"}
                      </div>
                    </td>
                    {filterType === "assigned" && (
                      <td className="px-6 py-4">
                        <div className="font-bold">{item.currentRiderName || "—"}</div>
                        <div className="text-xs text-[var(--muted)] font-mono">{item.currentRiderProfileId || "—"}</div>
                      </td>
                    )}
                    <td className="px-6 py-4 font-mono">{item.currentOdometer.toLocaleString()}</td>
                    
                    {can("fleet.assignments.manage") && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {filterType === "available" ? (
                            <button
                              onClick={() => openModal("take", item)}
                              className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 bg-emerald-50/50 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 transition-colors"
                              title="تسليم هذه المركبة"
                            >
                              <Key className="h-4 w-4" />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => openModal("return", item)}
                                className="rounded-lg p-2 text-red-600 hover:bg-red-50 bg-red-50/50 dark:bg-red-950/30 dark:hover:bg-red-900/50 transition-colors"
                                title="استلام (إرجاع) المركبة"
                              >
                                <ArrowLeftRight className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openModal("switch", item)}
                                className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 bg-blue-50/50 dark:bg-blue-950/30 dark:hover:bg-blue-900/50 transition-colors"
                                title="تبديل المركبة"
                              >
                                <Car className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openModal("renew", item)}
                                className="rounded-lg p-2 text-orange-600 hover:bg-orange-50 bg-orange-50/50 dark:bg-orange-950/30 dark:hover:bg-orange-900/50 transition-colors"
                                title="تجديد التفويض"
                              >
                                <CalendarClock className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TakeVehicleModal isOpen={activeModal === "take"} onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} preselectedVehicle={selectedVehicle} />
      <ReturnVehicleModal isOpen={activeModal === "return"} onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} preselectedVehicle={selectedVehicle} />
      <SwitchVehicleModal isOpen={activeModal === "switch"} onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} preselectedVehicle={selectedVehicle} />
      <RenewPermissionModal isOpen={activeModal === "renew"} onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} preselectedVehicle={selectedVehicle} />
    </div>
  );
}
