"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  getPhoneSims,
  PhoneSim,
  PhoneSimPage,
} from "@/lib/fleet/phone-sims-api";
import { PhoneSimsNav } from "../components/PhoneSimsNav";
import { AssignSimModal } from "../components/AssignSimModal";
import { ReturnSimModal } from "../components/ReturnSimModal";
import { SimDetailsModal } from "../components/SimDetailsModal";
import { CreateSimModal } from "../components/CreateSimModal";
import {
  UserCheck,
  Search,
  RefreshCw,
  Eye,
  UserPlus,
  RotateCcw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Smartphone,
} from "lucide-react";

export default function PhoneSimAssignmentsPage() {
  const { can } = useAuth();
  const canRead = can("phone_sims.read");
  const canManage = can("phone_sims.manage");

  // States
  const [search, setSearch] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "assigned" | "available">("assigned");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [simPageData, setSimPageData] = useState<PhoneSimPage | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeSimForAssign, setActiveSimForAssign] = useState<PhoneSim | null>(null);
  const [activeSimForReturn, setActiveSimForReturn] = useState<PhoneSim | null>(null);
  const [activeSimForDetails, setActiveSimForDetails] = useState<PhoneSim | null>(null);

  const fetchSims = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const statusFilter = assignmentFilter === "assigned" ? "Assigned" : assignmentFilter === "available" ? "Available" : undefined;
      const data = await getPhoneSims({
        search: search.trim() || undefined,
        status: statusFilter,
        page,
        pageSize,
      });
      setSimPageData(data);
    } catch (err) {
      console.error("Failed to fetch SIM assignments list:", err);
    } finally {
      setLoading(false);
    }
  }, [canRead, search, assignmentFilter, page, pageSize]);

  useEffect(() => {
    fetchSims();
  }, [fetchSims]);

  function handleSimUpdated(updatedSim: PhoneSim) {
    if (!simPageData) return;
    setSimPageData({
      ...simPageData,
      items: simPageData.items.map((item) =>
        item.id === updatedSim.id ? updatedSim : item
      ),
    });
    fetchSims();
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
          يتطلب عرض تعيينات شرائح الاتصال الحصول على صلاحية (phone_sims.read).
        </p>
      </div>
    );
  }

  const items = simPageData?.items || [];
  const totalCount = simPageData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6 p-4 sm:p-6" dir="rtl">
      {/* Top Header Navigation */}
      <PhoneSimsNav
        onRefresh={fetchSims}
        onOpenCreate={() => setIsCreateOpen(true)}
        loading={loading}
        canManage={canManage}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs">
          <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-medium">
            <span>الشرائح المعينة للمناديب</span>
            <UserCheck size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-blue-900 dark:text-blue-100">
            {items.filter((i) => i.status === "Assigned" || Boolean(i.currentRider)).length}
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-medium">
            <span>الشرائح المتاحة في العهدة</span>
            <Smartphone size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900 dark:text-emerald-100">
            {items.filter((i) => i.status === "Available" && !i.currentRider).length}
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
            <span>إجمالي نتائج البحث</span>
            <Search size={18} className="text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
            {totalCount}
          </p>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
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
              placeholder="بحث باسم المندوب، رقم الهاتف، ICCID..."
              className="w-full h-10 ps-9 pe-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
            />
          </div>

          {/* Quick Tab Toggle Filter */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-[var(--border)] text-xs font-bold w-full sm:w-auto">
            <button
              onClick={() => {
                setAssignmentFilter("assigned");
                setPage(1);
              }}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg transition-all ${
                assignmentFilter === "assigned"
                  ? "bg-[var(--surface)] text-[#1167c9] shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              معينة نشطة فقط
            </button>
            <button
              onClick={() => {
                setAssignmentFilter("available");
                setPage(1);
              }}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg transition-all ${
                assignmentFilter === "available"
                  ? "bg-[var(--surface)] text-[#1167c9] shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              جاهزة للتعيين (متاحة)
            </button>
            <button
              onClick={() => {
                setAssignmentFilter("all");
                setPage(1);
              }}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg transition-all ${
                assignmentFilter === "all"
                  ? "bg-[var(--surface)] text-[#1167c9] shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              جميع الحالات
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="border-b border-[var(--border)] bg-slate-50/80 dark:bg-slate-800/60 font-bold text-[var(--muted)] uppercase">
              <tr>
                <th className="px-4 py-3.5 text-start">المندوب المستلم (العهدة)</th>
                <th className="px-4 py-3.5 text-start">رقم الهاتف (SIM)</th>
                <th className="px-4 py-3.5 text-start">المشغل / Carrier</th>
                <th className="px-4 py-3.5 text-start">الموظف المسؤول عن الشريحة</th>
                <th className="px-4 py-3.5 text-start">تاريخ بداية التسليم</th>
                <th className="px-4 py-3.5 text-start">حالة التعيين</th>
                <th className="px-4 py-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--muted)]">
                    <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-[#1167c9]" />
                    جاري تحميل سجل تعيينات الشرائح...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--muted)]">
                    لا توجد تعيينات تطابق معايير البحث.
                  </td>
                </tr>
              ) : (
                items.map((sim) => {
                  const rider = sim.currentRider;
                  const isAssigned = Boolean(rider) || sim.status === "Assigned";
                  const isAvailable = sim.status === "Available" && !rider;

                  return (
                    <tr
                      key={sim.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Rider Info */}
                      <td className="px-4 py-3.5">
                        {rider ? (
                          <div className="flex items-center gap-2">
                            <div>
                              <Link
                                href={`/dashboard/employees/${rider.employeeId}`}
                                className="font-bold text-[#1167c9] dark:text-blue-400 hover:underline flex items-center gap-1"
                              >
                                {rider.fullNameAr || rider.fullNameEn}
                                <ExternalLink size={12} className="opacity-60" />
                              </Link>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[var(--muted)] italic">غير مسند لمندوب</span>
                        )}
                      </td>

                      {/* Phone Number */}
                      <td className="px-4 py-3.5 font-bold font-mono text-sm text-[var(--foreground)] dir-ltr text-start">
                        {sim.phoneNumber}
                      </td>

                      {/* Carrier */}
                      <td className="px-4 py-3.5 text-[var(--foreground)]">
                        {sim.carrierName || "—"}
                      </td>

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
                          "—"
                        )}
                      </td>

                      {/* Effective From */}
                      <td className="px-4 py-3.5 text-[var(--muted)] dir-ltr text-start font-mono">
                        {rider?.effectiveFrom || "—"}
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3.5">
                        {isAssigned ? (
                          <Badge tone="blue">مستلمة بواسطة المندوب</Badge>
                        ) : isAvailable ? (
                          <Badge tone="green">متاحة للتسليم</Badge>
                        ) : (
                          <Badge tone="orange">{sim.status}</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setActiveSimForDetails(sim)}
                            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[#1167c9] hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="عرض التفاصيل والسجل الكامل"
                          >
                            <Eye size={15} />
                          </button>

                          {canManage && (
                            <>
                              {isAvailable && (
                                <button
                                  onClick={() => setActiveSimForAssign(sim)}
                                  className="px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold flex items-center gap-1 text-xs"
                                >
                                  <UserPlus size={14} />
                                  تسليم
                                </button>
                              )}

                              {isAssigned && (
                                <button
                                  onClick={() => setActiveSimForReturn(sim)}
                                  className="px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold flex items-center gap-1 text-xs"
                                >
                                  <RotateCcw size={14} />
                                  استلام (إرجاع)
                                </button>
                              )}
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
              عرض {items.length} من إجمالي {totalCount} تعيين (الصفحة {page} من {totalPages})
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

      {/* Modals */}
      <CreateSimModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => fetchSims()}
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

      <SimDetailsModal
        isOpen={Boolean(activeSimForDetails)}
        onClose={() => setActiveSimForDetails(null)}
        sim={activeSimForDetails}
      />
    </div>
  );
}
