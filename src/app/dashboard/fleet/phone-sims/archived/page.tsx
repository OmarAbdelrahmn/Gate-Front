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
  PhoneSimStatus,
} from "@/lib/fleet/phone-sims-api";
import { PhoneSimsNav } from "../components/PhoneSimsNav";
import { ChangeSimStatusModal } from "../components/ChangeSimStatusModal";
import { ArchiveSimModal } from "../components/ArchiveSimModal";
import { SimDetailsModal } from "../components/SimDetailsModal";
import { CreateSimModal } from "../components/CreateSimModal";
import {
  Archive,
  Search,
  RefreshCw,
  Eye,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sliders,
  XCircle,
} from "lucide-react";

export default function PhoneSimArchivedPage() {
  const { can } = useAuth();
  const canRead = can("phone_sims.read");
  const canManage = can("phone_sims.manage");

  // States
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<PhoneSimStatus | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [simPageData, setSimPageData] = useState<PhoneSimPage | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeSimForStatus, setActiveSimForStatus] = useState<PhoneSim | null>(null);
  const [activeSimForArchive, setActiveSimForArchive] = useState<PhoneSim | null>(null);
  const [activeSimForDetails, setActiveSimForDetails] = useState<PhoneSim | null>(null);

  const fetchSims = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      // If no specific status is selected, fetch non-active SIMs or filter
      const statusParam = selectedStatus || undefined;
      const data = await getPhoneSims({
        search: search.trim() || undefined,
        status: statusParam,
        page,
        pageSize,
      });
      setSimPageData(data);
    } catch (err) {
      console.error("Failed to fetch archived SIM list:", err);
    } finally {
      setLoading(false);
    }
  }, [canRead, search, selectedStatus, page, pageSize]);

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

  function handleSimRemoved(simId: string) {
    if (!simPageData) return;
    setSimPageData({
      ...simPageData,
      items: simPageData.items.filter((item) => item.id !== simId),
      totalCount: Math.max(0, simPageData.totalCount - 1),
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
          يتطلب عرض الأرشيف الحصول على صلاحية (phone_sims.read).
        </p>
      </div>
    );
  }

  // Filter for suspended, lost, deactivated, or items when no specific status filter is chosen
  const items = (simPageData?.items || []).filter((sim) => {
    if (selectedStatus) return sim.status === selectedStatus;
    return sim.status === "Suspended" || sim.status === "Lost" || sim.status === "Deactivated";
  });
  const totalCount = items.length;

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
      <div className="p-4 rounded-2xl border border-rose-200/80 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/20 text-rose-950 dark:text-rose-100 flex items-start gap-3 shadow-xs">
        <div className="size-9 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
          <Archive size={20} />
        </div>
        <div className="text-xs leading-relaxed">
          <h3 className="font-bold text-sm text-rose-900 dark:text-rose-200 mb-0.5">
            إدارة الشرائح المعلقة، المفقودة، والملغاة (الأرشيف)
          </h3>
          <p className="text-rose-800/90 dark:text-rose-300/90">
            يعرض هذا القسم جميع الشرائح المعطلة عن العمل أو المفقودة. يمكنك مراجعة أسباب التعطيل، وتحديث الحالة لإعادتها للخدمة كمتاحة عند حل المشكلة.
          </p>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
              placeholder="بحث بالرقم، ICCID، السبب..."
              className="w-full h-10 ps-9 pe-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
            />
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as PhoneSimStatus | "");
                setPage(1);
              }}
              className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none cursor-pointer"
            >
              <option value="">جميع الشرائح الغير نشطة (معلقة / مفقودة / ملغاة)</option>
              <option value="Suspended">معلقة (Suspended)</option>
              <option value="Lost">مفقودة (Lost)</option>
              <option value="Deactivated">ملغاة (Deactivated)</option>
            </select>
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
                <th className="px-4 py-3.5 text-start">ICCID</th>
                <th className="px-4 py-3.5 text-start">الحالة الحالية</th>
                <th className="px-4 py-3.5 text-start">الموظف المسؤول عن العهدة</th>
                <th className="px-4 py-3.5 text-start">سبب التعطيل / الأرشفة</th>
                <th className="px-4 py-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--muted)]">
                    <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-[#1167c9]" />
                    جاري تحميل الشرائح المعلقة والمؤرشفة...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--muted)]">
                    لا توجد شرائح معلقة أو مؤرشفة تطابق البحث.
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

                      {/* ICCID */}
                      <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-400 dir-ltr text-start">
                        {sim.iccid || "—"}
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3.5">
                        {sim.status === "Suspended" ? (
                          <Badge tone="orange">معلقة</Badge>
                        ) : sim.status === "Lost" ? (
                          <Badge tone="red">مفقودة</Badge>
                        ) : (
                          <Badge tone="orange">{sim.status}</Badge>
                        )}
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

                      {/* Status Reason */}
                      <td className="px-4 py-3.5 text-[var(--muted)] max-w-xs truncate">
                        {sim.statusReason || sim.notes || "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setActiveSimForDetails(sim)}
                            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[#1167c9] hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="عرض التفاصيل"
                          >
                            <Eye size={15} />
                          </button>

                          {canManage && (
                            <>
                              <button
                                onClick={() => setActiveSimForStatus(sim)}
                                className="px-2.5 py-1 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold flex items-center gap-1 text-xs"
                                title="تغيير حالة الشريحة أو استعادتها كمتاحة"
                              >
                                <Sliders size={14} />
                                تغيير الحالة / استعادة
                              </button>

                              <button
                                onClick={() => setActiveSimForArchive(sim)}
                                className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
                                title="أرشفة نهائية"
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
      </div>

      {/* Modals */}
      <CreateSimModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => fetchSims()}
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
