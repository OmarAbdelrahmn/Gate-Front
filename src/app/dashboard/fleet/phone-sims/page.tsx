"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { SearchableSelect, SelectOption } from "@/components/ui/SearchableSelect";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { listEmployees, listRiders } from "@/lib/workforce/api";
import {
  getPhoneSims,
  PhoneSim,
  PhoneSimPage,
  PhoneSimStatus,
} from "@/lib/fleet/phone-sims-api";
import { PhoneSimsNav } from "./components/PhoneSimsNav";
import { CreateSimModal } from "./components/CreateSimModal";
import { EditSimModal } from "./components/EditSimModal";
import { TransferResponsibilityModal } from "./components/TransferResponsibilityModal";
import { AssignSimModal } from "./components/AssignSimModal";
import { ReturnSimModal } from "./components/ReturnSimModal";
import { ChangeSimStatusModal } from "./components/ChangeSimStatusModal";
import { ArchiveSimModal } from "./components/ArchiveSimModal";
import { SimDetailsModal } from "./components/SimDetailsModal";
import {
  Smartphone,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  ArrowLeftRight,
  UserPlus,
  RotateCcw,
  Sliders,
  Archive,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  UserCheck,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from "lucide-react";

export default function PhoneSimsPage() {
  const { can } = useAuth();
  const canRead = can("phone_sims.read");
  const canManage = can("phone_sims.manage");

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<PhoneSimStatus | "">("");
  const [selectedResponsibleId, setSelectedResponsibleId] = useState("");
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Data States
  const [simPageData, setSimPageData] = useState<PhoneSimPage | null>(null);
  const [loading, setLoading] = useState(true);

  // Selectors Data
  const [employees, setEmployees] = useState<SelectOption[]>([]);
  const [riders, setRiders] = useState<SelectOption[]>([]);

  // Active Modals States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeSimForEdit, setActiveSimForEdit] = useState<PhoneSim | null>(null);
  const [activeSimForResp, setActiveSimForResp] = useState<PhoneSim | null>(null);
  const [activeSimForAssign, setActiveSimForAssign] = useState<PhoneSim | null>(null);
  const [activeSimForReturn, setActiveSimForReturn] = useState<PhoneSim | null>(null);
  const [activeSimForStatus, setActiveSimForStatus] = useState<PhoneSim | null>(null);
  const [activeSimForArchive, setActiveSimForArchive] = useState<PhoneSim | null>(null);
  const [activeSimForDetails, setActiveSimForDetails] = useState<PhoneSim | null>(null);

  // Fetch Lookups
  useEffect(() => {
    async function loadLookups() {
      try {
        const [empRes, riderRes] = await Promise.allSettled([
          listEmployees(),
          listRiders(),
        ]);
        if (empRes.status === "fulfilled") {
          const empOptions = (empRes.value || [])
            .filter((e) => e.isEmployee)
            .map((e) => ({
              value: e.id,
              label: e.fullNameAr || e.fullNameEn || "موظف",
              sublabel: `هوية: ${e.iqamaNo || e.employeeNumber || ""}`,
            }));
          setEmployees(empOptions);
        }
        if (riderRes.status === "fulfilled") {
          const riderOptions = (riderRes.value || []).map((r) => ({
            value: r.id, // riderProfileId
            label: r.fullNameAr || r.fullNameEn || "مندوب",
            sublabel: `هوية: ${r.iqamaNo || ""}`,
          }));
          setRiders(riderOptions);
        }
      } catch (err) {
        console.error("Failed to load SIM filter lookups", err);
      }
    }
    if (canRead) {
      loadLookups();
    }
  }, [canRead]);

  // Fetch SIM list
  const fetchSims = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const data = await getPhoneSims({
        search: search.trim() || undefined,
        status: selectedStatus || undefined,
        responsibleEmployeeId: selectedResponsibleId || undefined,
        riderProfileId: selectedRiderId || undefined,
        page,
        pageSize,
      });
      setSimPageData(data);
    } catch (err) {
      console.error("Failed to fetch SIM list:", err);
    } finally {
      setLoading(false);
    }
  }, [canRead, search, selectedStatus, selectedResponsibleId, selectedRiderId, page, pageSize]);

  useEffect(() => {
    fetchSims();
  }, [fetchSims]);

  // Handle single row updates
  function handleSimUpdated(updatedSim: PhoneSim) {
    if (!simPageData) return;
    setSimPageData({
      ...simPageData,
      items: simPageData.items.map((item) =>
        item.id === updatedSim.id ? updatedSim : item
      ),
    });
  }

  // Handle single row removal (archive)
  function handleSimRemoved(simId: string) {
    if (!simPageData) return;
    setSimPageData({
      ...simPageData,
      items: simPageData.items.filter((item) => item.id !== simId),
      totalCount: Math.max(0, simPageData.totalCount - 1),
    });
    fetchSims();
  }

  function renderStatusBadge(status: PhoneSimStatus) {
    switch (status) {
      case "Available":
        return <Badge tone="green">متاحة</Badge>;
      case "Assigned":
        return <Badge tone="blue">معينة لمندوب</Badge>;
      case "Suspended":
        return <Badge tone="orange">معلقة</Badge>;
      case "Lost":
        return <Badge tone="red">مفقودة</Badge>;
      case "Deactivated":
        return <Badge tone="orange">ملغاة</Badge>;
      default:
        return <Badge tone="blue">{status}</Badge>;
    }
  }

  if (!canRead) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
          <AlertTriangle size={32} />
        </div>
        <h2 className="mt-4 text-xl font-bold text-[var(--foreground)]">
          عفواً، لا تملك الصلاحية المطلوبة
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          يتطلب عرض إدارة شرائح الاتصال الحصول على صلاحية (phone_sims.read).
        </p>
      </div>
    );
  }

  const items = simPageData?.items || [];
  const totalCount = simPageData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Stat Counters (Calculated from current result set or high level view)
  const availableCount = items.filter((s) => s.status === "Available").length;
  const assignedCount = items.filter((s) => s.status === "Assigned").length;
  const otherCount = items.filter(
    (s) => s.status === "Suspended" || s.status === "Lost" || s.status === "Deactivated"
  ).length;

  return (
    <div className="space-y-6 p-4 sm:p-6" dir="rtl">
      {/* Top Header Navigation */}
      <PhoneSimsNav
        onRefresh={fetchSims}
        onOpenCreate={() => setIsCreateOpen(true)}
        loading={loading}
        canManage={canManage}
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span>إجمالي الشرائح والمعروضة</span>
            <Smartphone size={18} className="text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {totalCount}
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span>شريحة متاحة في المخزون</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {availableCount}
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span>معينة حالياً لمناديب</span>
            <UserCheck size={18} className="text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
            {assignedCount}
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span>معلقة / مفقودة / ملغاة</span>
            <XCircle size={18} className="text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {otherCount}
          </p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search
              size={16}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="بحث بالرقم، ICCID، المشغل..."
              className="w-full h-10 ps-9 pe-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as PhoneSimStatus | "");
                setPage(1);
              }}
              className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none cursor-pointer"
            >
              <option value="">جميع الحالات...</option>
              <option value="Available">متاحة (Available)</option>
              <option value="Assigned">معينة لمندوب (Assigned)</option>
              <option value="Suspended">معلقة (Suspended)</option>
              <option value="Lost">مفقودة (Lost)</option>
              <option value="Deactivated">ملغاة (Deactivated)</option>
            </select>
          </div>

          {/* Responsible Employee Filter */}
          <div>
            <SearchableSelect
              value={selectedResponsibleId}
              onChange={(val) => {
                setSelectedResponsibleId(val);
                setPage(1);
              }}
              options={employees}
              placeholder="الموظف المسؤول..."
              searchPlaceholder="بحث في الموظفين..."
            />
          </div>

          {/* Current Rider Filter */}
          <div>
            <SearchableSelect
              value={selectedRiderId}
              onChange={(val) => {
                setSelectedRiderId(val);
                setPage(1);
              }}
              options={riders}
              placeholder="المندوب المستلم..."
              searchPlaceholder="بحث في المناديب..."
            />
          </div>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="border-b border-[var(--border)] bg-slate-50/80 dark:bg-slate-800/60 font-bold text-[var(--muted)] uppercase">
              <tr>
                <th className="px-4 py-3.5 text-start">رقم الهاتف</th>
                <th className="px-4 py-3.5 text-start">المشغل / Carrier</th>
                <th className="px-4 py-3.5 text-start">ICCID</th>
                <th className="px-4 py-3.5 text-start">الحالة</th>
                <th className="px-4 py-3.5 text-start">الموظف المسؤول عن العهدة</th>
                <th className="px-4 py-3.5 text-start">المندوب الحالي</th>
                <th className="px-4 py-3.5 text-start">تاريخ بدء التعيين</th>
                <th className="px-4 py-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--muted)]">
                    <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-[#1167c9]" />
                    جاري تحميل بيانات شرائح الاتصال...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--muted)]">
                    لا توجد شرائح اتصال تطابق معايير البحث.
                  </td>
                </tr>
              ) : (
                items.map((sim) => {
                  const isAssigned = sim.status === "Assigned" || Boolean(sim.currentRider);
                  const isAvailable = sim.status === "Available" && !sim.currentRider;

                  return (
                    <tr
                      key={sim.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Phone Number */}
                      <td className="px-4 py-3.5 font-bold font-mono text-sm text-[var(--foreground)] dir-ltr text-start">
                        {sim.phoneNumber}
                      </td>

                      {/* Carrier */}
                      <td className="px-4 py-3.5 text-[var(--foreground)]">
                        {sim.carrierName || "—"}
                      </td>

                      {/* ICCID */}
                      <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-400 dir-ltr text-start">
                        {sim.iccid || "—"}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">{renderStatusBadge(sim.status)}</td>

                      {/* Responsible Employee */}
                      <td className="px-4 py-3.5">
                        {sim.responsibleEmployeeId ? (
                          <Link
                            href={`/dashboard/employees/${sim.responsibleEmployeeId}`}
                            className="font-semibold text-slate-700 dark:text-slate-300 hover:text-[#1167c9] flex items-center gap-1"
                          >
                            {sim.responsibleEmployeeNameAr}
                            <ExternalLink size={11} className="opacity-40" />
                          </Link>
                        ) : (
                          sim.responsibleEmployeeNameAr || "—"
                        )}
                      </td>

                      {/* Current Rider */}
                      <td className="px-4 py-3.5">
                        {sim.currentRider ? (
                          <Link
                            href={`/dashboard/employees/${sim.currentRider.employeeId}`}
                            className="font-bold text-[#1167c9] dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            {sim.currentRider.fullNameAr || sim.currentRider.fullNameEn}
                            <ExternalLink size={12} className="opacity-60" />
                          </Link>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>

                      {/* Assignment Start Date */}
                      <td className="px-4 py-3.5 text-[var(--muted)] dir-ltr text-start font-mono">
                        {sim.currentRider?.effectiveFrom || "—"}
                      </td>

                      {/* Row Actions */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View details */}
                          <button
                            onClick={() => setActiveSimForDetails(sim)}
                            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[#1167c9] hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="عرض التفاصيل والسجل"
                          >
                            <Eye size={15} />
                          </button>

                          {canManage && (
                            <>
                              {/* Edit SIM details */}
                              <button
                                onClick={() => setActiveSimForEdit(sim)}
                                className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[#1167c9] hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="تعديل الشريحة"
                              >
                                <Edit2 size={15} />
                              </button>

                              {/* Transfer Responsibility */}
                              <button
                                onClick={() => setActiveSimForResp(sim)}
                                className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                title="نقل مسؤولية العهدة"
                              >
                                <ArrowLeftRight size={15} />
                              </button>

                              {/* Assign to Rider */}
                              {isAvailable && (
                                <button
                                  onClick={() => setActiveSimForAssign(sim)}
                                  className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                  title="تسليم الشريحة لمندوب"
                                >
                                  <UserPlus size={15} />
                                </button>
                              )}

                              {/* Return from Rider */}
                              {isAssigned && (
                                <button
                                  onClick={() => setActiveSimForReturn(sim)}
                                  className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  title="استلام الشريحة من المندوب"
                                >
                                  <RotateCcw size={15} />
                                </button>
                              )}

                              {/* Change Status */}
                              <button
                                onClick={() => setActiveSimForStatus(sim)}
                                disabled={isAssigned}
                                className={`p-1.5 rounded-lg border border-[var(--border)] ${
                                  isAssigned
                                    ? "opacity-30 cursor-not-allowed text-slate-400"
                                    : "text-[var(--muted)] hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                                }`}
                                title={
                                  isAssigned
                                    ? "لا يمكن تغيير الحالة يدوي أثناء وجود تعيين نشط"
                                    : "تغيير حالة الشريحة"
                                }
                              >
                                <Sliders size={15} />
                              </button>

                              {/* Archive */}
                              <button
                                onClick={() => setActiveSimForArchive(sim)}
                                disabled={isAssigned}
                                className={`p-1.5 rounded-lg border border-[var(--border)] ${
                                  isAssigned
                                    ? "opacity-30 cursor-not-allowed text-slate-400"
                                    : "text-[var(--muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                                }`}
                                title={
                                  isAssigned
                                    ? "لا يمكن الأرشفة أثناء وجود تعيين نشط"
                                    : "أرشفة الشريحة"
                                }
                              >
                                <Archive size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server Pagination */}
        {simPageData && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-[var(--border)] text-xs text-[var(--muted)] font-medium">
            <div>
              عرض {items.length} من إجمالي {totalCount} شريحة (الصفحة {page} من {totalPages})
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronRight size={18} />
              </button>
              <span className="px-2 font-bold text-[var(--foreground)]">{page}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals & Dialogs */}
      <CreateSimModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(newSim) => {
          fetchSims();
        }}
      />

      <EditSimModal
        isOpen={Boolean(activeSimForEdit)}
        onClose={() => setActiveSimForEdit(null)}
        sim={activeSimForEdit}
        onSuccess={handleSimUpdated}
      />

      <TransferResponsibilityModal
        isOpen={Boolean(activeSimForResp)}
        onClose={() => setActiveSimForResp(null)}
        sim={activeSimForResp}
        onSuccess={handleSimUpdated}
      />

      <AssignSimModal
        isOpen={Boolean(activeSimForAssign)}
        onClose={() => setActiveSimForAssign(null)}
        sim={activeSimForAssign}
        onSuccess={handleSimUpdated}
      />

      <ReturnSimModal
        isOpen={Boolean(activeSimForReturn)}
        onClose={() => setActiveSimForReturn(null)}
        sim={activeSimForReturn}
        onSuccess={handleSimUpdated}
      />

      <ChangeSimStatusModal
        isOpen={Boolean(activeSimForStatus)}
        onClose={() => setActiveSimForStatus(null)}
        sim={activeSimForStatus}
        onSuccess={handleSimUpdated}
      />

      <ArchiveSimModal
        isOpen={Boolean(activeSimForArchive)}
        onClose={() => setActiveSimForArchive(null)}
        sim={activeSimForArchive}
        onSuccess={() => {
          if (activeSimForArchive) handleSimRemoved(activeSimForArchive.id);
        }}
      />

      <SimDetailsModal
        isOpen={Boolean(activeSimForDetails)}
        onClose={() => setActiveSimForDetails(null)}
        sim={activeSimForDetails}
      />
    </div>
  );
}
