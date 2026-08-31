"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  getPhoneSimResponsibilityHistory,
  getPhoneSimAssignmentsHistory,
  PhoneSim,
  PhoneSimResponsibilityChange,
  PhoneSimAssignment,
  PhoneSimStatus,
} from "@/lib/fleet/phone-sims-api";
import {
  Smartphone,
  User,
  History,
  Calendar,
  ShieldAlert,
  ArrowLeftRight,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
} from "lucide-react";

interface SimDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sim: PhoneSim | null;
}

export function SimDetailsModal({
  isOpen,
  onClose,
  sim,
}: SimDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"info" | "responsibility" | "assignments">(
    "info"
  );
  const [respHistory, setRespHistory] = useState<PhoneSimResponsibilityChange[]>([]);
  const [assignHistory, setAssignHistory] = useState<PhoneSimAssignment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen && sim) {
      setActiveTab("info");
      loadHistories(sim.id);
    }
  }, [isOpen, sim]);

  async function loadHistories(simId: string) {
    setLoadingHistory(true);
    try {
      const [respRes, assignRes] = await Promise.allSettled([
        getPhoneSimResponsibilityHistory(simId),
        getPhoneSimAssignmentsHistory(simId),
      ]);

      if (respRes.status === "fulfilled") setRespHistory(respRes.value || []);
      if (assignRes.status === "fulfilled") setAssignHistory(assignRes.value || []);
    } catch (err) {
      console.error("Failed to load SIM histories:", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  if (!sim) return null;

  function renderStatusBadge(status: PhoneSimStatus) {
    switch (status) {
      case "Available":
        return <Badge tone="green">متاحة (Available)</Badge>;
      case "Assigned":
        return <Badge tone="blue">معينة لمندوب (Assigned)</Badge>;
      case "Suspended":
        return <Badge tone="orange">معلقة (Suspended)</Badge>;
      case "Lost":
        return <Badge tone="red">مفقودة (Lost)</Badge>;
      case "Deactivated":
        return <Badge tone="orange">ملغاة (Deactivated)</Badge>;
      default:
        return <Badge tone="blue">{status}</Badge>;
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تفاصيل شريحة الاتصال والسجلات" maxWidth="max-w-4xl">
      <div className="space-y-6">
        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-950 text-[#1167c9] dark:text-blue-400 flex items-center justify-center shrink-0">
              <Smartphone size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black dir-ltr font-mono text-[var(--foreground)]">
                  {sim.phoneNumber}
                </h3>
                {renderStatusBadge(sim.status)}
              </div>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                المشغل: <span className="font-bold text-[var(--foreground)]">{sim.carrierName || "غير محدد"}</span>
                {sim.iccid && (
                  <>
                    {" "}• ICCID: <span className="font-mono">{sim.iccid}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="text-start sm:text-end text-xs text-[var(--muted)]">
            <p>المسؤول الحروفي للعهدة:</p>
            <p className="font-bold text-sm text-[var(--foreground)] mt-0.5">
              {sim.responsibleEmployeeNameAr}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--border)] gap-2">
          <button
            onClick={() => setActiveTab("info")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === "info"
                ? "border-[#1167c9] text-[#1167c9]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <User size={16} />
            البيانات التشغيلية
          </button>
          <button
            onClick={() => setActiveTab("responsibility")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === "responsibility"
                ? "border-[#1167c9] text-[#1167c9]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <ArrowLeftRight size={16} />
            سجل مسؤولية العهدة ({respHistory.length})
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === "assignments"
                ? "border-[#1167c9] text-[#1167c9]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <UserCheck size={16} />
            سجل تعيينات المناديب ({assignHistory.length})
          </button>
        </div>

        {/* Tab 1: Info */}
        {activeTab === "info" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
              <h4 className="font-bold text-sm text-[var(--foreground)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
                <Building size={16} className="text-[#1167c9]" />
                بيانات عهدة الشريحة
              </h4>
              <div className="space-y-2 text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">رقم الهاتف الكانوني:</span>
                  <span className="font-bold font-mono dir-ltr">{sim.phoneNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">مزود الخدمة:</span>
                  <span className="font-bold">{sim.carrierName || "غير محدد"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">رمز التسلسلي (ICCID):</span>
                  <span className="font-bold font-mono dir-ltr">{sim.iccid || "غير متوفر"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">الموظف المسؤول عن العهدة:</span>
                  <span className="font-bold">{sim.responsibleEmployeeNameAr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">حالة الشريحة:</span>
                  <span>{renderStatusBadge(sim.status)}</span>
                </div>
                {sim.statusReason && (
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">سبب الحالة:</span>
                    <span className="font-bold text-amber-600">{sim.statusReason}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
              <h4 className="font-bold text-sm text-[var(--foreground)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
                <UserCheck size={16} className="text-[#1167c9]" />
                حالة التعيين الحالية للمندوب
              </h4>
              {sim.currentRider ? (
                <div className="space-y-2 text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">المندوب الحالي:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {sim.currentRider.fullNameAr || sim.currentRider.fullNameEn}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">تاريخ تسليم الشريحة:</span>
                    <span className="font-bold">{sim.currentRider.effectiveFrom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">رقم التعيين (ID):</span>
                    <span className="font-mono text-[11px]">{sim.currentRider.assignmentId}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-slate-500 font-medium">
                  الشريحة غير معينة لأي مندوب حالياً (متاحة بالمخزون)
                </div>
              )}

              <div className="pt-2 border-t border-[var(--border)] space-y-1 text-[11px] text-[var(--muted)]">
                <p>تاريخ إضافة الشريحة: {new Date(sim.createdAtUtc).toLocaleDateString("ar-SA")}</p>
                {sim.updatedAtUtc && (
                  <p>آخر تحديث: {new Date(sim.updatedAtUtc).toLocaleDateString("ar-SA")}</p>
                )}
                {sim.notes && (
                  <p className="pt-1 text-slate-700 dark:text-slate-300 font-medium">
                    ملاحظات: {sim.notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Responsibility History */}
        {activeTab === "responsibility" && (
          <div className="space-y-3">
            {loadingHistory ? (
              <p className="text-center py-6 text-xs text-[var(--muted)]">جاري تحميل سجل المسؤولية...</p>
            ) : respHistory.length === 0 ? (
              <p className="text-center py-6 text-xs text-[var(--muted)]">لا يوجد سجل سابق لنقل مسؤولية هذه الشريحة.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {respHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--muted)]">من:</span>
                        <span>{item.previousResponsibleEmployeeNameAr || "غير مخصص"}</span>
                        <ArrowLeftRight size={14} className="text-[#1167c9]" />
                        <span className="text-[var(--muted)]">إلى:</span>
                        <span className="text-blue-600 dark:text-blue-400">
                          {item.responsibleEmployeeNameAr}
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--muted)] font-normal dir-ltr">
                        {new Date(item.changedAtUtc).toLocaleString("ar-SA")}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-[var(--foreground)]">السبب:</span> {item.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Assignments History */}
        {activeTab === "assignments" && (
          <div className="space-y-3">
            {loadingHistory ? (
              <p className="text-center py-6 text-xs text-[var(--muted)]">جاري تحميل سجل التعيينات...</p>
            ) : assignHistory.length === 0 ? (
              <p className="text-center py-6 text-xs text-[var(--muted)]">لا يوجد سجل تعيينات سابق لهذه الشريحة.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {assignHistory.map((item) => {
                  const isOpenAssignment = !item.effectiveTo;
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border text-xs space-y-2 ${
                        isOpenAssignment
                          ? "border-blue-200 bg-blue-50/50 dark:bg-blue-950/30"
                          : "border-[var(--border)] bg-[var(--surface)]"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <div className="flex items-center gap-2 text-sm">
                          <UserCheck size={16} className="text-[#1167c9]" />
                          <span>{item.riderNameAr || item.riderNameEn}</span>
                        </div>
                        {isOpenAssignment ? (
                          <Badge tone="blue">مستمرة حالياً</Badge>
                        ) : (
                          <Badge tone="orange">منتهية</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[var(--muted)]">
                        <div>تاريخ الاستلام/البدء: <span className="font-bold text-[var(--foreground)]">{item.effectiveFrom}</span></div>
                        <div>تاريخ الإرجاع/الانهاء: <span className="font-bold text-[var(--foreground)]">{item.effectiveTo || "مفتوح حتى الآن"}</span></div>
                      </div>

                      {item.assignmentReason && (
                        <p className="text-slate-700 dark:text-slate-300">
                          <span className="font-semibold">سبب التسليم:</span> {item.assignmentReason}
                        </p>
                      )}
                      {item.endReason && (
                        <p className="text-slate-700 dark:text-slate-300">
                          <span className="font-semibold">سبب الإرجاع:</span> {item.endReason}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[var(--muted)] italic">
                          ملاحظات: {item.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-[var(--border)]">
          <Button variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
}
