"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import {
  getPhoneSimResponsibilityHistory,
  getPhoneSimAssignmentsHistory,
  downloadPhoneSimReceiptForm,
  previewPhoneSimReceiptForm,
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
  Printer,
  FileText,
  Eye,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface SimDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sim: PhoneSim | null;
  onOpenPrintForm?: (sim: PhoneSim) => void;
}

export function SimDetailsModal({
  isOpen,
  onClose,
  sim,
  onOpenPrintForm,
}: SimDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"info" | "responsibility" | "assignments">(
    "info"
  );
  const [respHistory, setRespHistory] = useState<PhoneSimResponsibilityChange[]>([]);
  const [assignHistory, setAssignHistory] = useState<PhoneSimAssignment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Live File Preview State
  const [previewState, setPreviewState] = useState<{
    isOpen: boolean;
    title: string;
    loading: boolean;
    url: string | null;
    contentType: string | null;
    error: string | null;
  }>({
    isOpen: false,
    title: "",
    loading: false,
    url: null,
    contentType: null,
    error: null,
  });

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

  const handleDownloadReceipt = async () => {
    try {
      const res = await downloadPhoneSimReceiptForm(sim.id);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(res.blob);
      link.download = res.fileName || sim.receiptForm?.originalFileName || `sim-receipt-${sim.phoneNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success("تم التنزيل", "تم تنزيل نموذج استلام الشريحة بنجاح.");
    } catch (e: any) {
      console.error("Failed to download receipt form:", e);
      toast.error("فشل التنزيل", e?.message || "تعذر تنزيل نموذج استلام الشريحة.");
    }
  };

  const handleOpenReceiptPreview = async () => {
    const title = `معاينة نموذج استلام الشريحة: ${sim.receiptForm?.originalFileName || sim.phoneNumber}`;
    setPreviewState({
      isOpen: true,
      title,
      loading: true,
      url: null,
      contentType: null,
      error: null,
    });

    try {
      const res = await previewPhoneSimReceiptForm(sim.id);
      setPreviewState({
        isOpen: true,
        title,
        loading: false,
        url: res.url,
        contentType: res.contentType,
        error: null,
      });
    } catch (e: any) {
      console.error("Failed to preview receipt form:", e);
      setPreviewState((prev) => ({
        ...prev,
        loading: false,
        error: e?.message || "تعذر تحميل معاينة نموذج الاستلام.",
      }));
    }
  };

  const handleCloseReceiptPreview = () => {
    if (previewState.url) {
      URL.revokeObjectURL(previewState.url);
    }
    setPreviewState({
      isOpen: false,
      title: "",
      loading: false,
      url: null,
      contentType: null,
      error: null,
    });
  };

  function renderStatusBadge(status: PhoneSimStatus) {
    switch (status) {
      case "Available":
        return <Badge tone="green">متاحة (Available)</Badge>;
      case "Assigned":
        return <Badge tone="blue">معينة لمندوب (Assigned)</Badge>;
      case "Suspended":
        return <Badge tone="orange">موقوفة مؤقتاً (Suspended)</Badge>;
      case "Lost":
        return <Badge tone="red">مفقودة (Lost)</Badge>;
      case "Deactivated":
        return <Badge>ملغاة الخدمة (Deactivated)</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`تفاصيل شريحة الاتصال: ${sim.phoneNumber}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4 text-right dir-rtl">
        {/* Header Summary */}
        <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/70 dark:border-blue-900 dark:bg-blue-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-mono font-bold text-lg shadow-md shrink-0">
              <Smartphone size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-blue-950 dark:text-blue-200 font-mono dir-ltr">
                  {sim.phoneNumber}
                </h3>
                {renderStatusBadge(sim.status)}
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                المشغل: <span className="font-bold">{sim.carrierName || "غير محدد"}</span> | 
                العهد: <span className="font-bold">{sim.responsibleEmployeeNameAr}</span>
              </p>
            </div>
          </div>

          {sim.receiptForm && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleOpenReceiptPreview}
                className="h-9 px-3 text-xs font-bold gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
              >
                <Eye size={15} />
                معاينة النموذج
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleDownloadReceipt}
                className="h-9 px-3 text-xs font-bold gap-1.5 text-[#1167c9] bg-blue-50 hover:bg-blue-100 border border-blue-200"
              >
                <Download size={15} />
                تنزيل المرفق
              </Button>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--border)]">
          <button
            onClick={() => setActiveTab("info")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === "info"
                ? "border-[#1167c9] text-[#1167c9]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Smartphone size={16} />
            البيانات الأساسية
          </button>
          <button
            onClick={() => setActiveTab("responsibility")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === "responsibility"
                ? "border-[#1167c9] text-[#1167c9]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <History size={16} />
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
                
                {sim.receiptForm && (
                  <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--muted)] font-bold">نموذج استلام الشريحة:</span>
                      <span className="font-bold text-[#1167c9] flex items-center gap-1 dir-ltr text-xs">
                        <FileText size={15} />
                        {sim.receiptForm.originalFileName} ({(sim.receiptForm.fileSizeBytes / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-7 text-xs font-bold gap-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                        onClick={handleOpenReceiptPreview}
                      >
                        <Eye size={13} />
                        معاينة
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-7 text-xs font-bold gap-1 text-[#1167c9] bg-blue-50 hover:bg-blue-100 border border-blue-200"
                        onClick={handleDownloadReceipt}
                      >
                        <Download size={13} />
                        تنزيل
                      </Button>
                    </div>
                  </div>
                )}

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
              <p className="text-center py-6 text-xs text-[var(--muted)]">لا يوجد سجل مسؤولية سابق.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pl-1">
                {respHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs space-y-1"
                  >
                    <div className="flex justify-between font-bold text-[var(--foreground)]">
                      <span>إلى: {item.responsibleEmployeeNameAr}</span>
                      <span className="text-[11px] text-[var(--muted)] font-mono">
                        {new Date(item.changedAtUtc).toLocaleString("ar-SA")}
                      </span>
                    </div>
                    {item.previousResponsibleEmployeeNameAr && (
                      <p className="text-[var(--muted)]">
                        المسؤول السابق: {item.previousResponsibleEmployeeNameAr}
                      </p>
                    )}
                    <p className="text-slate-700 dark:text-slate-300 font-medium">
                      السبب: {item.reason}
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
              <div className="space-y-2 max-h-80 overflow-y-auto pl-1">
                {assignHistory.map((item) => {
                  const isActive = !item.effectiveTo;
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        isActive
                          ? "border-blue-300 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30"
                          : "border-[var(--border)] bg-[var(--surface)]"
                      }`}
                    >
                      <div className="flex justify-between font-bold">
                        <span className="text-blue-950 dark:text-blue-200">
                          المندوب: {item.riderNameAr}
                        </span>
                        {isActive ? (
                          <Badge tone="blue">تعيين نشط</Badge>
                        ) : (
                          <Badge>منتهي</Badge>
                        )}
                      </div>
                      <div className="flex justify-between text-[var(--muted)] text-[11px]">
                        <span>تاريخ البدء: {item.effectiveFrom}</span>
                        <span>تاريخ الانتهاء: {item.effectiveTo || "مستمر حتى الآن"}</span>
                      </div>
                      {item.assignmentReason && (
                        <p className="text-slate-700 dark:text-slate-300">
                          سبب التسليم: {item.assignmentReason}
                        </p>
                      )}
                      {item.endReason && (
                        <p className="text-amber-700 dark:text-amber-300">
                          سبب الإنهاء: {item.endReason}
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

        <div className="flex justify-between items-center pt-4 border-t border-[var(--border)]">
          {onOpenPrintForm ? (
            <Button
              variant="secondary"
              onClick={() => {
                onClose();
                onOpenPrintForm(sim);
              }}
              className="flex items-center gap-2 text-xs font-bold"
            >
              <Printer size={16} className="text-[#1167c9]" />
              طباعة نموذج استلام الشريحة
            </Button>
          ) : (
            <div />
          )}
          <Button variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>

      {/* File Preview Modal */}
      {previewState.isOpen && (
        <Modal
          isOpen={previewState.isOpen}
          onClose={handleCloseReceiptPreview}
          title={previewState.title}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4 pt-2 text-right dir-rtl">
            {previewState.loading ? (
              <div className="flex h-80 items-center justify-center text-slate-500 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-[#1167c9]" />
                <span className="text-sm font-semibold">جارٍ تحميل المعاينة المباشرة للملف...</span>
              </div>
            ) : previewState.error ? (
              <div className="p-8 text-center text-red-600">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold">{previewState.error}</p>
              </div>
            ) : previewState.url ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900/5 dark:bg-slate-900/40 flex items-center justify-center min-h-[400px]">
                {previewState.contentType?.startsWith("image/") ? (
                  <img
                    src={previewState.url}
                    alt={previewState.title}
                    className="max-h-[70vh] object-contain rounded-lg shadow-sm"
                  />
                ) : previewState.contentType?.includes("pdf") ? (
                  <iframe
                    src={previewState.url}
                    className="w-full h-[70vh] rounded-lg border-0"
                    title={previewState.title}
                  />
                ) : (
                  <div className="text-center p-8">
                    <FileText className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      تتوفر المعاينة المباشرة للصور ومستندات PDF. يمكنك تنزيل الملف لمراجعته.
                    </p>
                    <Button onClick={handleDownloadReceipt}>
                      <Download className="h-4 w-4" /> تنزيل الملف
                    </Button>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={handleCloseReceiptPreview}>
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
