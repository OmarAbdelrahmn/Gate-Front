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
import { TransferResponsibilityModal } from "../components/TransferResponsibilityModal";
import { SimDetailsModal } from "../components/SimDetailsModal";
import { CreateSimModal } from "../components/CreateSimModal";
import {
  ArrowLeftRight,
  Search,
  RefreshCw,
  Eye,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Smartphone,
  Users,
} from "lucide-react";

export default function PhoneSimTransfersPage() {
  const { can } = useAuth();
  const canRead = can("phone_sims.read");
  const canManage = can("phone_sims.manage");

  // States
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [simPageData, setSimPageData] = useState<PhoneSimPage | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeSimForResp, setActiveSimForResp] = useState<PhoneSim | null>(null);
  const [activeSimForDetails, setActiveSimForDetails] = useState<PhoneSim | null>(null);

  const fetchSims = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const data = await getPhoneSims({
        search: search.trim() || undefined,
        page,
        pageSize,
      });
      setSimPageData(data);
    } catch (err) {
      console.error("Failed to fetch SIM responsibility list:", err);
    } finally {
      setLoading(false);
    }
  }, [canRead, search, page, pageSize]);

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
          يتطلب عرض نقل مسؤولية شرائح الاتصال الحصول على صلاحية (phone_sims.read).
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

      {/* Info Banner */}
      <div className="p-4 rounded-2xl border border-amber-200/80 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20 text-amber-950 dark:text-amber-100 flex items-start gap-3 shadow-xs">
        <div className="size-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
          <ArrowLeftRight size={20} />
        </div>
        <div className="text-xs leading-relaxed">
          <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200 mb-0.5">
            سجل توثيق نقل مسؤولية عهدة الشرائح
          </h3>
          <p className="text-amber-800/90 dark:text-amber-300/90">
            يمكّنك هذا السجل من متابعة ونقل عهدة الشريحة من موظف مسؤول إلى موظف آخر مع الاحتفاظ بالأرشيف والسبب لمنع فقدان التبعية الإدارية.
          </p>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
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
              placeholder="بحث باسم الموظف المسؤول، رقم الهاتف، ICCID..."
              className="w-full h-10 ps-9 pe-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
            />
          </div>

          <div className="text-xs font-semibold text-[var(--muted)]">
            إجمالي الشرائح المعروضة: <span className="font-bold text-[var(--foreground)]">{totalCount}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="border-b border-[var(--border)] bg-slate-50/80 dark:bg-slate-800/60 font-bold text-[var(--muted)] uppercase">
              <tr>
                <th className="px-4 py-3.5 text-start">رقم الهاتف (SIM)</th>
                <th className="px-4 py-3.5 text-start">المشغل / Carrier</th>
                <th className="px-4 py-3.5 text-start">الموظف المسؤول عن العهدة حالياً</th>
                <th className="px-4 py-3.5 text-start">المندوب المستلم (إن وجد)</th>
                <th className="px-4 py-3.5 text-start">حالة الشريحة</th>
                <th className="px-4 py-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--muted)]">
                    <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-[#1167c9]" />
                    جاري تحميل سجل مسؤوليّة الشرائح...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--muted)]">
                    لا توجد شرائح تطابق معايير البحث.
                  </td>
                </tr>
              ) : (
                items.map((sim) => {
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

                      {/* Responsible Employee */}
                      <td className="px-4 py-3.5">
                        {sim.responsibleEmployeeId ? (
                          <Link
                            href={`/dashboard/employees/${sim.responsibleEmployeeId}`}
                            className="font-bold text-[#1167c9] dark:text-blue-400 hover:underline flex items-center gap-1 text-sm"
                          >
                            {sim.responsibleEmployeeNameAr}
                            <ExternalLink size={12} className="opacity-60" />
                          </Link>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>

                      {/* Current Rider */}
                      <td className="px-4 py-3.5">
                        {sim.currentRider ? (
                          <Link
                            href={`/dashboard/employees/${sim.currentRider.employeeId}`}
                            className="font-semibold text-slate-700 dark:text-slate-300 hover:text-[#1167c9] flex items-center gap-1"
                          >
                            {sim.currentRider.fullNameAr || sim.currentRider.fullNameEn}
                            <ExternalLink size={11} className="opacity-40" />
                          </Link>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <Badge
                          tone={
                            sim.status === "Available"
                              ? "green"
                              : sim.status === "Assigned"
                              ? "blue"
                              : "orange"
                          }
                        >
                          {sim.status === "Available"
                            ? "متاحة"
                            : sim.status === "Assigned"
                            ? "معينة لمندوب"
                            : sim.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setActiveSimForDetails(sim)}
                            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[#1167c9] hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="عرض سجل نقل المسؤوليات التفصيلي"
                          >
                            <Eye size={15} />
                          </button>

                          {canManage && (
                            <button
                              onClick={() => setActiveSimForResp(sim)}
                              className="px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200 font-bold flex items-center gap-1 text-xs"
                            >
                              <ArrowLeftRight size={14} />
                              نقل المسؤولية
                            </button>
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
              عرض {items.length} من إجمالي {totalCount} سجل (الصفحة {page} من {totalPages})
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

      <TransferResponsibilityModal
        isOpen={Boolean(activeSimForResp)}
        onClose={() => setActiveSimForResp(null)}
        sim={activeSimForResp}
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
