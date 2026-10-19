// src/app/admin/jahez/treasury/handovers/page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { TreasuryNavHeader } from "@/components/jahez/treasury/TreasuryNavHeader";
import {
  getTreasuryHandovers,
  getTreasuryHandover,
  previewTreasuryHandover,
  submitTreasuryHandover,
  confirmTreasuryHandover,
  cancelTreasuryHandover,
  getTreasuryAccounts,
  exportTreasuryReport,
  generateTreasuryIdempotencyKey,
  type TreasuryHandover,
  type TreasuryHandoverDetail,
  type TreasuryHandoverPreview,
  type TreasuryAccount,
  TreasuryHandoverStatus,
  TreasuryLocation,
  TreasuryPurpose,
} from "@/lib/jahez/treasury/api";
import {
  formatSAR,
  getRiyadhTodayDate,
  formatRiyadhDateTime,
  displayPersonName,
  getHandoverStatusLabel,
} from "@/lib/jahez/treasury/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import {
  CalendarCheck,
  Plus,
  RefreshCw,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  FileDown,
  Printer,
  AlertTriangle,
  Wallet,
  Building2,
  CreditCard,
  Fuel,
  Lock,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Calculator,
} from "lucide-react";

export default function TreasuryHandoversPage() {
  const { can, user } = useAuth();

  const isAdmin =
    Boolean(user?.roles?.some((r) => r.toLowerCase() === "admin")) ||
    can("admin") ||
    can("*");

  const canRead = can("jahez.cashbox.read") || can("jahez.treasury.read") || isAdmin;
  const canSubmit = can("jahez.cashbox.submit") || isAdmin;
  const canConfirm = can("jahez.cashbox.confirm") || isAdmin;

  const currentUserId = user?.id || "";

  // Data states
  const [handovers, setHandovers] = useState<TreasuryHandover[]>([]);
  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // New Handover Submission State (Supervisor)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submissionDate, setSubmissionDate] = useState<string>(() => getRiyadhTodayDate());
  const [submissionReason, setSubmissionReason] = useState<string>("");
  const [previewData, setPreviewData] = useState<TreasuryHandoverPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submittingHandover, setSubmittingHandover] = useState(false);

  // Detail & Accountant Confirmation State
  const [selectedDetail, setSelectedDetail] = useState<TreasuryHandoverDetail | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [countedAmounts, setCountedAmounts] = useState<Record<string, string>>({});
  const [confirmReason, setConfirmReason] = useState<string>("");
  const [submittingConfirm, setSubmittingConfirm] = useState(false);

  // Cancel State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Export / Print State
  const [exportingId, setExportingId] = useState<string | null>(null);

  // Load Handovers and Accounts
  const loadData = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const [listRes, accsRes] = await Promise.all([
        getTreasuryHandovers(page, pageSize).catch(() => ({ items: [], page: 1, pageSize })),
        getTreasuryAccounts().catch(() => [] as TreasuryAccount[]),
      ]);
      setHandovers(listRes?.items || []);
      setAccounts(accsRes || []);
    } catch (err: any) {
      toast.error(err.message || "تعذر جلب محاضر التسليم");
    } finally {
      setLoading(false);
    }
  }, [canRead, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Accounts Map for Location Check
  const accountsMap = useMemo(() => {
    const map = new Map<string, TreasuryAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  // Load Preview when date changes in submit modal
  const loadPreview = async (date: string) => {
    setPreviewLoading(true);
    try {
      const res = await previewTreasuryHandover(date);
      setPreviewData(res);
    } catch (err: any) {
      toast.error(err.message || "تعذر تحميل معاينة مبالغ التسليم");
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Open Submit Handover Modal
  const openSubmitModal = () => {
    const today = getRiyadhTodayDate();
    setSubmissionDate(today);
    setSubmissionReason("تسليم عهدة المشرف اليومية للمحاسب");
    setIsSubmitModalOpen(true);
    loadPreview(today);
  };

  // Handle Handover Submission
  const handleSubmitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionDate) {
      toast.error("يرجى اختيار يوم العمل المحاسبي");
      return;
    }
    if (!submissionReason.trim()) {
      toast.error("يرجى إدخال سبب وتفاصيل التسليم");
      return;
    }

    setSubmittingHandover(true);
    try {
      const key = generateTreasuryIdempotencyKey("handover-sub");
      await submitTreasuryHandover(
        {
          businessDate: submissionDate,
          reason: submissionReason.trim(),
        },
        key,
      );
      toast.success("تم تقديم محضر تسليم العهدة بنجاح (قيد التأكيد)");
      setIsSubmitModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "فشل تقديم محضر التسليم (تأكد من عدم وجود محضر معلق سابق)");
    } finally {
      setSubmittingHandover(false);
    }
  };

  // View Handover Details
  const viewDetail = async (id: string) => {
    setLoadingDetail(true);
    setIsDetailModalOpen(true);
    setCountedAmounts({});
    setConfirmReason("");
    try {
      const detail = await getTreasuryHandover(id);
      setSelectedDetail(detail);

      // Pre-initialize cash counting fields as empty string (do not auto-fill expected amounts)
      const initialCounts: Record<string, string> = {};
      detail.lines.forEach((line) => {
        const acc = accountsMap.get(line.subAccountId);
        if (acc?.location === TreasuryLocation.Supervisor) {
          initialCounts[line.subAccountId] = "";
        }
      });
      setCountedAmounts(initialCounts);
    } catch (err: any) {
      toast.error(err.message || "تعذر جلب تفاصيل المحضر");
      setIsDetailModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Cash lines inside currently viewed detail
  const supervisorCashLines = useMemo(() => {
    if (!selectedDetail) return [];
    return selectedDetail.lines.filter((line) => {
      const acc = accountsMap.get(line.subAccountId);
      return acc?.location === TreasuryLocation.Supervisor;
    });
  }, [selectedDetail, accountsMap]);

  // Non-cash lines (Bank, PetroApp) inside currently viewed detail
  const nonCashLines = useMemo(() => {
    if (!selectedDetail) return [];
    return selectedDetail.lines.filter((line) => {
      const acc = accountsMap.get(line.subAccountId);
      return acc?.location !== TreasuryLocation.Supervisor;
    });
  }, [selectedDetail, accountsMap]);

  // Check if physical cash count matches expected amount for each line
  const countDiscrepancies = useMemo(() => {
    const list: {
      subAccountId: string;
      accountName: string;
      expected: number;
      actual: number | null;
      diff: number;
    }[] = [];

    supervisorCashLines.forEach((line) => {
      const valStr = countedAmounts[line.subAccountId];
      const actual = valStr !== undefined && valStr !== "" ? parseFloat(valStr) : null;
      const diff = actual !== null ? actual - line.amount : -line.amount;
      list.push({
        subAccountId: line.subAccountId,
        accountName: line.accountNameAr,
        expected: line.amount,
        actual,
        diff,
      });
    });

    return list;
  }, [supervisorCashLines, countedAmounts]);

  // Is confirmation ready & allowed?
  const isConfirmationValid = useMemo(() => {
    if (!selectedDetail || selectedDetail.handover.status !== TreasuryHandoverStatus.Pending) {
      return false;
    }
    // Cannot confirm your own handover
    if (selectedDetail.handover.requestedByUserId === currentUserId && !isAdmin) {
      return false;
    }
    if (!confirmReason.trim()) return false;

    // All cash lines must have a valid actual count that exactly matches line.amount
    return countDiscrepancies.every(
      (item) => item.actual !== null && !isNaN(item.actual) && Math.abs(item.diff) < 0.001,
    );
  }, [selectedDetail, currentUserId, isAdmin, confirmReason, countDiscrepancies]);

  // Handle Confirmation by Accountant
  const handleConfirmHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetail) return;
    if (!isConfirmationValid) {
      toast.error("يجب مطابقة العد الفعلي لكل حساب نقدي على حدة وبدقة دون أي فروق");
      return;
    }

    setSubmittingConfirm(true);
    try {
      const key = generateTreasuryIdempotencyKey("handover-cnf");
      const cashCounts = supervisorCashLines.map((line) => ({
        subAccountId: line.subAccountId,
        amount: parseFloat(countedAmounts[line.subAccountId] || "0"),
      }));

      await confirmTreasuryHandover(
        selectedDetail.handover.id,
        {
          cashCounts,
          reason: confirmReason.trim(),
          rowVersion: selectedDetail.handover.rowVersion,
        },
        key,
      );

      toast.success("تم تأكيد واعتماد محضر تسليم العهدة بنجاح");
      setIsDetailModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "تعذر اعتماد المحضر (قد يوجد تعارض أو نقص صلاحية)");
    } finally {
      setSubmittingConfirm(false);
    }
  };

  // Handle Cancellation
  const handleCancelHandover = async () => {
    if (!selectedDetail) return;
    if (!cancelReason.trim()) {
      toast.error("يرجى إدخال سبب الإلغاء");
      return;
    }

    setSubmittingCancel(true);
    try {
      const key = generateTreasuryIdempotencyKey("handover-cnc");
      await cancelTreasuryHandover(
        selectedDetail.handover.id,
        {
          reason: cancelReason.trim(),
          rowVersion: selectedDetail.handover.rowVersion,
        },
        key,
      );

      toast.success("تم إلغاء محضر التسليم بنجاح");
      setIsCancelModalOpen(false);
      setIsDetailModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "تعذر إلغاء المحضر");
    } finally {
      setSubmittingCancel(false);
    }
  };

  // Download PDF Report from Server
  const handleDownloadReport = async (handover: TreasuryHandover) => {
    setExportingId(handover.id);
    try {
      const filter = {
        fromDate: handover.businessDate,
        toDate: handover.businessDate,
      };
      const { blob, fileName } = await exportTreasuryReport("handover", "pdf", filter, handover.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || `handover-${handover.documentNumber || handover.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("تم تحميل محضر التسليم بنجاح");
    } catch (err: any) {
      toast.error(err.message || "تعذر تحميل محضر التسليم");
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <TreasuryNavHeader
        title="تسليم عهدة المشرف واعتماد المحاسب"
        description="دورة حجز وتجميد عهدة المشرف، العد النقدي الفعلي المنفصل لكل حساب، والاعتماد المحاسبي الموثق."
        onRefresh={loadData}
        isRefreshing={loading}
        extraActions={
          canSubmit && (
            <Button
              size="sm"
              onClick={openSubmitModal}
              className="gap-2 shadow-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>تقديم تسليم عهدة جديد</span>
            </Button>
          )
        }
      />

      {/* Handovers Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="py-3 px-3">رقم المحضر الرسمي</th>
                <th className="py-3 px-3">يوم العمل المحاسبي</th>
                <th className="py-3 px-3">المشرف المسلّم</th>
                <th className="py-3 px-3">نقدية العهدة</th>
                <th className="py-3 px-3">بترو آب (غير نقدي)</th>
                <th className="py-3 px-3">البنك (غير نقدي)</th>
                <th className="py-3 px-3 text-center">عدد الحركات</th>
                <th className="py-3 px-3">المحاسب المستلم</th>
                <th className="py-3 px-3 text-center">الحالة</th>
                <th className="py-3 px-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                      <span>جاري تحميل محاضر التسليم...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && handovers.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    لا توجد محاضر تسليم مسجلة حالياً.
                  </td>
                </tr>
              )}

              {!loading &&
                handovers.map((h) => {
                  const statusInfo = getHandoverStatusLabel(h.status);
                  return (
                    <tr key={h.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-foreground whitespace-nowrap">
                        {h.documentNumber || "محضر سابق بدون رقم"}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] whitespace-nowrap">
                        {h.businessDate}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {displayPersonName(h.requestedByNameAr, "user")}
                      </td>
                      <td className="py-3 px-3 font-bold text-primary whitespace-nowrap">
                        {formatSAR(h.cashboxAmount)}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                        {formatSAR(h.petroAppAmount)}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                        {formatSAR(h.bankAmount)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono whitespace-nowrap">
                        {h.movementCount}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                        {h.status === TreasuryHandoverStatus.Confirmed
                          ? displayPersonName(h.accountantNameAr, "user")
                          : "—"}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <Badge tone={statusInfo.tone} className="text-[10px]">
                          {statusInfo.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => viewDetail(h.id)}
                            title="عرض تفاصيل وعد النقدية"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>عرض</span>
                          </Button>

                          {h.status === TreasuryHandoverStatus.Confirmed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1 text-emerald-600 hover:text-emerald-700"
                              onClick={() => handleDownloadReport(h)}
                              disabled={exportingId === h.id}
                              title="تنزيل المحضر المعتمد PDF"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                              <span>PDF</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Handover Modal (Supervisor) */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="تقديم محضر تسليم العهدة اليومية"
      >
        <form onSubmit={handleSubmitHandover} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                يوم العمل المحاسبي *
              </label>
              <Input
                type="date"
                required
                max={getRiyadhTodayDate()}
                value={submissionDate}
                onChange={(e) => {
                  setSubmissionDate(e.target.value);
                  loadPreview(e.target.value);
                }}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                سبب وبيان التسليم *
              </label>
              <Input
                required
                placeholder="مثال: تسليم عهدة المساء اليومية للمحاسب"
                value={submissionReason}
                onChange={(e) => setSubmissionReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Preview Lines Section */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-primary" />
                معاينة المبالغ المتراكمة غير المسلمة حتى نهاية اليوم المختار:
              </span>
              {previewLoading && (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>

            {previewData && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-card p-2 border border-border">
                    <span className="text-[10px] text-muted-foreground block">
                      إجمالي النقد الفعلي
                    </span>
                    <span className="font-bold text-primary text-sm">
                      {formatSAR(previewData.physicalCash)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-card p-2 border border-border">
                    <span className="text-[10px] text-muted-foreground block">
                      بترو آب (مطابقة)
                    </span>
                    <span className="font-bold text-foreground text-sm">
                      {formatSAR(previewData.petroAppActivity)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-card p-2 border border-border">
                    <span className="text-[10px] text-muted-foreground block">البنك (مطابقة)</span>
                    <span className="font-bold text-foreground text-sm">
                      {formatSAR(previewData.bankActivity)}
                    </span>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-card divide-y divide-border/60">
                  {previewData.lines.map((line, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 text-[11px]">
                      <div>
                        <span className="font-semibold text-foreground">{line.accountNameAr}</span>
                        <span className="text-muted-foreground block text-[10px]">
                          كفيل: {line.sponsorNameAr || "—"} ({line.movementCount} حركة)
                        </span>
                      </div>
                      <span className="font-bold text-primary">{formatSAR(line.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsSubmitModalOpen(false)}
              disabled={submittingHandover}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submittingHandover || previewLoading}
              className="gap-2 font-semibold"
            >
              {submittingHandover ? "جاري التقديم..." : "تجميد وتقديم المحضر للمحاسب"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Handover Detail & Accountant Confirmation Modal */}
      {selectedDetail && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`محضر تسليم العهدة: ${selectedDetail.handover.documentNumber || selectedDetail.handover.id}`}
        >
          <div className="space-y-5 text-xs max-h-[80vh] overflow-y-auto pr-1">
            {/* Header Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl bg-muted/40 p-3">
              <div>
                <span className="text-muted-foreground block">يوم العمل:</span>
                <span className="font-mono font-bold text-foreground">
                  {selectedDetail.handover.businessDate}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">المشرف المسلّم:</span>
                <span className="font-semibold text-foreground">
                  {displayPersonName(selectedDetail.handover.requestedByNameAr, "user")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">حالة المحضر:</span>
                <Badge
                  tone={getHandoverStatusLabel(selectedDetail.handover.status).tone}
                  className="mt-0.5"
                >
                  {getHandoverStatusLabel(selectedDetail.handover.status).label}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground block">إجمالي النقد المتوقع:</span>
                <span className="font-bold text-primary text-sm">
                  {formatSAR(selectedDetail.handover.cashboxAmount)}
                </span>
              </div>
            </div>

            {/* Supervisor Cash Lines (Require Physical Counting by Accountant) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-amber-500" />
                  <span>سطور النقد الفعلي (المشرف) — العد والمطابقة الفردية</span>
                </h4>
                <span className="text-[11px] text-muted-foreground">
                  {supervisorCashLines.length} حسابات نقدية
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-muted/60 text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-2.5">الحساب والكفيل</th>
                      <th className="p-2.5">المبلغ الدفتري المتوقع</th>
                      <th className="p-2.5">المبلغ المعدود فعلياً</th>
                      <th className="p-2.5 text-center">الفرق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {supervisorCashLines.map((line) => {
                      const valStr = countedAmounts[line.subAccountId] || "";
                      const actualNum = valStr !== "" ? parseFloat(valStr) : null;
                      const diff = actualNum !== null ? actualNum - line.amount : -line.amount;
                      const isExact = actualNum !== null && Math.abs(diff) < 0.001;

                      return (
                        <tr key={line.id}>
                          <td className="p-2.5">
                            <span className="font-semibold text-foreground block">
                              {line.accountNameAr}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {line.sponsorNameAr || "كفيل عام"} ({line.movementCount} حركة)
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-foreground">
                            {formatSAR(line.amount)}
                          </td>
                          <td className="p-2.5 w-44">
                            {selectedDetail.handover.status === TreasuryHandoverStatus.Pending ? (
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="أدخل المبلغ بعد العد..."
                                value={valStr}
                                onChange={(e) =>
                                  setCountedAmounts({
                                    ...countedAmounts,
                                    [line.subAccountId]: e.target.value,
                                  })
                                }
                                className={`h-8 text-xs font-bold ${
                                  valStr === ""
                                    ? "border-border"
                                    : isExact
                                      ? "border-emerald-500 bg-emerald-500/5 text-emerald-600"
                                      : "border-red-500 bg-red-500/5 text-red-600"
                                }`}
                              />
                            ) : (
                              <span className="font-bold text-emerald-600">
                                {formatSAR(line.amount)}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-mono">
                            {selectedDetail.handover.status === TreasuryHandoverStatus.Pending ? (
                              valStr === "" ? (
                                <span className="text-muted-foreground">لم يُعد بعد</span>
                              ) : isExact ? (
                                <span className="text-emerald-600 font-bold">مطابق (0.00)</span>
                              ) : (
                                <span className="text-red-600 font-bold">
                                  {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                                </span>
                              )
                            ) : (
                              <span className="text-emerald-600 font-bold">مطابق</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Non-Cash Activities (Bank & PetroApp) */}
            {nonCashLines.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-muted-foreground text-xs flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4" />
                  <span>حركات غير نقدية للمطابقة (لا تدخل في العد النقدي):</span>
                </h4>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 space-y-1 text-xs">
                  {nonCashLines.map((line) => (
                    <div key={line.id} className="flex justify-between items-center py-1">
                      <span>
                        {line.accountNameAr} ({line.sponsorNameAr || "كفيل"})
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatSAR(line.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmation Form (Accountant Only) */}
            {selectedDetail.handover.status === TreasuryHandoverStatus.Pending && canConfirm && (
              <form onSubmit={handleConfirmHandover} className="space-y-3 pt-3 border-t border-border">
                {selectedDetail.handover.requestedByUserId === currentUserId && !isAdmin && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-600 text-xs">
                    ملاحظة فصل المسؤوليات: أنت من قدمت هذا المحضر؛ لا يمكنك اعتماده كمحاسب. يجب أن
                    يقوم محاسب آخر بتأكيده.
                  </div>
                )}

                <div>
                  <label className="block font-medium text-muted-foreground mb-1">
                    بيان وملاحظات اعتماد المحاسب المستلم *
                  </label>
                  <Input
                    required
                    placeholder="مثال: تم عد النقدية واستلامها ومطابقتها بالكامل"
                    value={confirmReason}
                    onChange={(e) => setConfirmReason(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  {/* Cancel Button (Submitter Only) */}
                  {(selectedDetail.handover.requestedByUserId === currentUserId || isAdmin) && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsCancelModalOpen(true)}
                      className="text-destructive hover:bg-destructive/10 text-xs"
                    >
                      إلغاء هذا المحضر
                    </Button>
                  )}

                  <div className="flex items-center gap-2 mr-auto">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsDetailModalOpen(false)}
                      disabled={submittingConfirm}
                    >
                      إغلاق
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!isConfirmationValid || submittingConfirm}
                      className="gap-2 font-semibold"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>{submittingConfirm ? "جاري الاعتماد..." : "تأكيد واستلام النقدية"}</span>
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {/* Confirmed Audit Stamp */}
            {selectedDetail.handover.status === TreasuryHandoverStatus.Confirmed && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-800 dark:text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>محضر تسليم معتمد ومطابق</span>
                </div>
                <p className="text-xs">
                  تم الاستلام بواسطة:{" "}
                  <strong>
                    {displayPersonName(selectedDetail.handover.accountantNameAr, "user")}
                  </strong>{" "}
                  بتاريخ {formatRiyadhDateTime(selectedDetail.handover.confirmedAtUtc)}
                </p>
                {selectedDetail.handover.confirmationReason && (
                  <p className="text-xs">بيان الاعتماد: {selectedDetail.handover.confirmationReason}</p>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="إلغاء محضر تسليم العهدة المعلق"
      >
        <div className="space-y-4 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            عند إلغاء المحضر ستعود جميع سطور الحركات غير المسلّمة إلى عهدة المشرف، لتتمكن من تصحيح
            العمليات وتقديم محضر جديد.
          </p>

          <div>
            <label className="block font-medium text-muted-foreground mb-1">
              سبب الإلغاء والتراجع *
            </label>
            <textarea
              required
              rows={2}
              placeholder="اكتب سبب إلغاء المحضر..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCancelModalOpen(false)}
              disabled={submittingCancel}
            >
              تراجع
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleCancelHandover}
              disabled={submittingCancel || !cancelReason.trim()}
            >
              {submittingCancel ? "جاري الإلغاء..." : "تأكيد إلغاء المحضر"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
