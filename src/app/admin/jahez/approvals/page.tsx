// src/app/admin/jahez/approvals/page.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  cancelApprovalRequest,
  createApprovalRequest,
  createEarnings,
  decideApprovalRequest,
  getApprovalRequests,
  getJahezHandovers,
} from "@/lib/jahez/api";
import {
  JahezApprovalKind,
  JahezApprovalStatus,
  type ApprovalCreateRequest,
  type ApprovalDecisionRequest,
  type EarningsRequest,
  type JahezApprovalRequest,
  type JahezHandover,
} from "@/lib/jahez/types";
import { getPlatformAccounts, type AccountResponse } from "@/lib/platforms/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Calculator,
  RotateCcw,
} from "lucide-react";

export default function JahezApprovalsPage() {
  const { user, can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const [requests, setRequests] = useState<JahezApprovalRequest[]>([]);
  const [handovers, setHandovers] = useState<JahezHandover[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<AccountResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<number | "">("");
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Create Request Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [reqHandoverId, setReqHandoverId] = useState("");
  const [reqKind, setReqKind] = useState<JahezApprovalKind>(JahezApprovalKind.FeeException);
  const [reqReason, setReqReason] = useState("");
  const [waiverAmount, setWaiverAmount] = useState<number | "">("");
  const [targetAccountId, setTargetAccountId] = useState("");
  const [policyFromDate, setPolicyFromDate] = useState("");
  const [policyToDate, setPolicyToDate] = useState("");
  const [resetEffectiveAt, setResetEffectiveAt] = useState(new Date().toISOString().slice(0, 16));
  const [externalResetRef, setExternalResetRef] = useState("");
  const [submittingReq, setSubmittingReq] = useState(false);

  // Decision Modal State
  const [decidingRequest, setDecidingRequest] = useState<JahezApprovalRequest | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [isDeciding, setIsDeciding] = useState(false);

  // Manual Earnings Statement Modal State
  const [isEarningsOpen, setIsEarningsOpen] = useState(false);
  const [earnHandoverId, setEarnHandoverId] = useState("");
  const [earnFromDate, setEarnFromDate] = useState("");
  const [earnToDate, setEarnToDate] = useState("");
  const [totalDeliveryPrice, setTotalDeliveryPrice] = useState<number>(0);
  const [totalPenalties, setTotalPenalties] = useState<number>(0);
  const [totalCashAmount, setTotalCashAmount] = useState<number>(0);
  const [totalDriverDebit, setTotalDriverDebit] = useState<number>(0);
  const [totalServiceDeduction, setTotalServiceDeduction] = useState<number>(0);
  const [totalDriverCredit, setTotalDriverCredit] = useState<number>(0);
  const [totalBonuses, setTotalBonuses] = useState<number>(0);
  const [totalTips, setTotalTips] = useState<number>(0);
  const [totalFreeOrders, setTotalFreeOrders] = useState<number>(0);
  const [earnReason, setEarnReason] = useState("");
  const [submittingEarn, setSubmittingEarn] = useState(false);

  const commissionBase =
    totalDeliveryPrice -
    totalPenalties -
    totalCashAmount -
    totalDriverDebit -
    totalServiceDeduction +
    totalDriverCredit +
    totalBonuses +
    totalTips +
    totalFreeOrders;
  const computedCommission = Math.max(0, commissionBase) * 0.15;

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await getApprovalRequests({
        status: statusFilter === "" ? undefined : Number(statusFilter),
        page,
        pageSize: 50,
      });
      setRequests(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر استعلام طلبات الاعتماد";
      toast.error("خطأ", msg);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogs = async () => {
    try {
      const [hRes, accRes] = await Promise.all([
        getJahezHandovers({ pageSize: 100 }),
        getPlatformAccounts({ status: "Available" }),
      ]);
      setHandovers(hRes.items || []);
      setAvailableAccounts(
        (accRes || []).filter(
          (a) =>
            a.platformCode === "JAHEZ" ||
            a.platformNameAr?.includes("جاهز") ||
            a.platformNameEn?.toLowerCase().includes("jahez"),
        ),
      );
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    loadCatalogs();
  }, []);

  useEffect(() => {
    startTransition(() => {
      loadRequests();
    });
  }, [statusFilter, page]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqHandoverId) {
      toast.error("تنبيه", "يرجى اختيار حساب التسليم المستهدف");
      return;
    }
    if (!reqReason.trim()) {
      toast.error("تنبيه", "يرجى كتابة سبب الطلب");
      return;
    }

    setSubmittingReq(true);
    try {
      const payload: ApprovalCreateRequest = {
        handoverId: reqHandoverId,
        kind: reqKind,
        reason: reqReason.trim(),
        waiverAmount: reqKind === JahezApprovalKind.FeeException ? Number(waiverAmount) || 0 : undefined,
        targetAccountId: reqKind === JahezApprovalKind.FreeSwitch ? targetAccountId : undefined,
        fromDate: reqKind === JahezApprovalKind.PercentageCommission ? policyFromDate : undefined,
        toDate: reqKind === JahezApprovalKind.PercentageCommission ? policyToDate : undefined,
        effectiveAtUtc:
          reqKind === JahezApprovalKind.FreeSwitch || reqKind === JahezApprovalKind.AccountResetDebtTransfer
            ? new Date(resetEffectiveAt).toISOString()
            : undefined,
        externalResetReference:
          reqKind === JahezApprovalKind.AccountResetDebtTransfer ? externalResetRef.trim() : undefined,
      };

      await createApprovalRequest(payload);
      setIsCreateOpen(false);
      loadRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل إنشاء طلب الاعتماد";
      toast.error("خطأ", msg);
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleDecide = async (approve: boolean) => {
    if (!decidingRequest) return;
    if (!decisionReason.trim()) {
      toast.error("تنبيه", "يرجى كتابة سبب القرار");
      return;
    }

    setIsDeciding(true);
    try {
      const payload: ApprovalDecisionRequest = {
        approve,
        reason: decisionReason.trim(),
      };
      await decideApprovalRequest(decidingRequest.id, payload);
      setDecidingRequest(null);
      setDecisionReason("");
      loadRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشلت عملية اتخاذ القرار";
      toast.error("خطأ", msg);
    } finally {
      setIsDeciding(false);
    }
  };

  const handleCancel = async (req: JahezApprovalRequest) => {
    const reasonPrompt = window.prompt("يرجى إدخال سبب إلغاء الطلب:", "لم يعد مطلوباً");
    if (!reasonPrompt) return;

    try {
      await cancelApprovalRequest(req.id, { reason: reasonPrompt });
      loadRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر إلغاء الطلب";
      toast.error("خطأ", msg);
    }
  };

  const handleSubmitEarnings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!earnHandoverId || !earnFromDate || !earnToDate) {
      toast.error("تنبيه", "يرجى إدخال حساب التسليم ونطاق التواريخ كاملاً");
      return;
    }
    if (!earnReason.trim()) {
      toast.error("تنبيه", "يرجى إدخال سبب تسجيل بيان الأرباح");
      return;
    }

    setSubmittingEarn(true);
    try {
      const payload: EarningsRequest = {
        handoverId: earnHandoverId,
        fromDate: earnFromDate,
        toDate: earnToDate,
        totalDeliveryPrice,
        totalPenalties,
        totalCashAmount,
        totalDriverDebit,
        totalServiceDeduction,
        totalDriverCredit,
        totalBonuses,
        totalTips,
        totalFreeOrders,
        reason: earnReason.trim(),
        supersedesId: null,
      };

      await createEarnings(payload);
      setIsEarningsOpen(false);
      toast.success("تم بنجاح", `تم حفظ بيان الأرباح واحتساب عمولة ${computedCommission.toFixed(2)} ر.س`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل حفظ بيان الأرباح";
      toast.error("خطأ", msg);
    } finally {
      setSubmittingEarn(false);
    }
  };

  const kindBadge = (k: JahezApprovalKind) => {
    switch (k) {
      case JahezApprovalKind.FeeException:
        return (
          <Badge tone="blue">
            1 - إعفاء رسوم الحساب
          </Badge>
        );
      case JahezApprovalKind.FreeSwitch:
        return (
          <Badge tone="blue">
            2 - تبديل حساب مجاني
          </Badge>
        );
      case JahezApprovalKind.PercentageCommission:
        return (
          <Badge tone="orange">
            3 - سياسة عمولة بالنسبة (15%)
          </Badge>
        );
      case JahezApprovalKind.AccountResetDebtTransfer:
        return (
          <Badge tone="orange">
            4 - تصفير ونقل مديونية
          </Badge>
        );
      default:
        return <Badge tone="gray">{String(k)}</Badge>;
    }
  };

  const statusBadge = (s: JahezApprovalStatus) => {
    switch (s) {
      case JahezApprovalStatus.Pending:
        return (
          <Badge tone="orange">
            <Clock className="h-3 w-3 mr-1 inline" />
            قيد المراجعة
          </Badge>
        );
      case JahezApprovalStatus.Approved:
        return (
          <Badge tone="green">
            <CheckCircle className="h-3 w-3 mr-1 inline" />
            معتمد
          </Badge>
        );
      case JahezApprovalStatus.Rejected:
        return (
          <Badge tone="red">
            <XCircle className="h-3 w-3 mr-1 inline" />
            مرفوض
          </Badge>
        );
      case JahezApprovalStatus.Cancelled:
        return (
          <Badge tone="gray">
            <RotateCcw className="h-3 w-3 mr-1 inline" />
            ملغى
          </Badge>
        );
      default:
        return <Badge tone="gray">{String(s)}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            {isEn ? "Jahez Approval Requests & Commission Policies" : "طلبات اعتمادات وسياسات جاهز"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isEn
              ? "Govern fee exceptions, free account switches, 15% percentage policies, and account resets with separation of duties."
              : "إدارة طلبات إعفاءات الرسوم، والتبديل المجاني، وسياسات العمولة بالنسبة (15%)، وتصفير ونقل المديونية."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={loadRequests}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {isEn ? "Refresh" : "تحديث"}
          </Button>

          {can("jahez.earnings.manage") && (
            <Button
              variant="secondary"
              onClick={() => setIsEarningsOpen(true)}
              className="text-purple-700 border-purple-300 hover:bg-purple-50 flex items-center gap-1.5"
            >
              <Calculator className="h-4 w-4" />
              {isEn ? "Manual Earnings Statement" : "تسجيل بيان أرباح ونسبة"}
            </Button>
          )}

          {can("jahez.requests.create") && (
            <Button
              variant="primary"
              onClick={() => setIsCreateOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              {isEn ? "New Request" : "إنشاء طلب جديد"}
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {isEn ? "Filter by Status:" : "تصفية بالحالة:"}
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value === "" ? "" : Number(e.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">الكل</option>
            <option value="1">قيد المراجعة (Pending)</option>
            <option value="2">معتمد (Approved)</option>
            <option value="3">مرفوض (Rejected)</option>
            <option value="4">ملغى (Cancelled)</option>
          </select>
        </div>

        <div className="text-xs text-gray-500">
          إجمالي الطلبات: {requests.length}
        </div>
      </div>

      {/* Requests Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800/60 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3">{isEn ? "Created At" : "تاريخ الطلب"}</th>
                <th className="px-4 py-3">{isEn ? "Kind" : "نوع الاعتماد"}</th>
                <th className="px-4 py-3">{isEn ? "Handover ID" : "معرف التسليم"}</th>
                <th className="px-4 py-3">{isEn ? "Status" : "الحالة"}</th>
                <th className="px-4 py-3">{isEn ? "Requested By" : "مقدم الطلب"}</th>
                <th className="px-4 py-3">{isEn ? "Details" : "تفاصيل القرار"}</th>
                <th className="px-4 py-3">{isEn ? "Reason" : "السبب"}</th>
                <th className="px-4 py-3">{isEn ? "Actions" : "الإجراءات"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-purple-600 mb-2" />
                    جارٍ استعلام طلبات الاعتماد...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <ShieldCheck className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-medium text-gray-600 dark:text-gray-300">
                      {isEn ? "No approval requests found" : "لا توجد طلبات اعتماد مسجلة"}
                    </p>
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const isPendingStatus = r.status === JahezApprovalStatus.Pending;
                  const isCreator = user?.id === r.requestedByUserId;
                  const canDecideKind =
                    r.kind === JahezApprovalKind.AccountResetDebtTransfer
                      ? can("jahez.resets.approve")
                      : can("jahez.requests.approve");

                  const canDecide = isPendingStatus && canDecideKind && !isCreator;
                  const canCancel = isPendingStatus && isCreator && can("jahez.requests.create");

                  return (
                    <tr key={r.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {new Date(r.createdAtUtc).toLocaleDateString("ar-SA")}
                      </td>

                      <td className="px-4 py-3">{kindBadge(r.kind)}</td>

                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {r.handoverId.slice(0, 8)}...
                      </td>

                      <td className="px-4 py-3">{statusBadge(r.status)}</td>

                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {r.requestedByUserId.slice(0, 8)}...
                        {isCreator && <span className="text-[10px] text-purple-600 block">(أنت)</span>}
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                        {r.kind === JahezApprovalKind.FeeException && (
                          <span>إعفاء: <strong>{r.waiverAmount} ر.س</strong></span>
                        )}
                        {r.kind === JahezApprovalKind.FreeSwitch && (
                          <span>حساب بديل: <strong className="font-mono">{r.targetAccountId?.slice(0, 8)}...</strong></span>
                        )}
                        {r.kind === JahezApprovalKind.PercentageCommission && (
                          <span>فترة: {r.fromDate} → {r.toDate}</span>
                        )}
                        {r.kind === JahezApprovalKind.AccountResetDebtTransfer && (
                          <span>مرجع: {r.externalResetReference || "-"}</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 max-w-xs truncate" title={r.reason}>
                        {r.reason}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {canDecide && (
                            <Button
                              variant="primary"
                              onClick={() => {
                                setDecidingRequest(r);
                                setDecisionReason("");
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white text-xs py-1 px-2.5 h-8 flex items-center gap-1"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              {isEn ? "Decide" : "اتخاذ قرار"}
                            </Button>
                          )}

                          {canCancel && (
                            <Button
                              variant="secondary"
                              onClick={() => handleCancel(r)}
                              className="text-xs py-1 px-2.5 h-8 text-red-600 border-red-200 hover:bg-red-50"
                            >
                              {isEn ? "Cancel" : "إلغاء"}
                            </Button>
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

      {/* Modal 1: Create Approval Request */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={isEn ? "Create Jahez Approval Request" : "إنشاء طلب اعتماد لجاهز"}
      >
        <form onSubmit={handleCreateRequest} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Target Handover Account" : "حساب التسليم المستهدف"}
            </label>
            <SearchableSelect
              value={reqHandoverId}
              onChange={(val) => setReqHandoverId(val)}
              options={handovers.map((h) => ({
                value: h.id,
                label: `حساب [${h.externalAccountId || h.id.slice(0, 8)}] (${h.commissionStartsOn})`,
              }))}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Approval Kind" : "نوع طلب الاعتماد"}
            </label>
            <select
              value={reqKind}
              onChange={(e) => setReqKind(Number(e.target.value) as JahezApprovalKind)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value={JahezApprovalKind.FeeException}>1 - إعفاء من رسوم الحساب</option>
              <option value={JahezApprovalKind.FreeSwitch}>2 - تبديل الحساب مجاناً</option>
              <option value={JahezApprovalKind.PercentageCommission}>3 - سياسة عمولة بنسبة 15%</option>
              <option value={JahezApprovalKind.AccountResetDebtTransfer}>4 - تصفير الحساب ونقل المديونية</option>
            </select>

            {/* بطاقة توضيحية مختصرة لما يقوم به الإجراء المختار */}
            <div className="mt-2 rounded-lg bg-purple-50/70 border border-purple-100 p-2.5 text-xs text-purple-900 dark:bg-purple-950/30 dark:border-purple-900/40 dark:text-purple-200 leading-relaxed">
              {reqKind === JahezApprovalKind.FeeException && (
                <p>
                  <strong>ماذا يفعل هذا الإجراء؟</strong> طلب إعفاء المندوب جزئياً أو كلياً من رسوم فتح الحساب (200 ر.س) لظروف استثنائية، وإسقاط المبلغ المعفى من مطالباته المالية.
                </p>
              )}
              {reqKind === JahezApprovalKind.FreeSwitch && (
                <p>
                  <strong>ماذا يفعل هذا الإجراء؟</strong> نقل المندوب إلى حساب جاهز بديل دون فرض رسوم فتح حساب جديدة (200 ر.س أخرى) عند تعطل حسابه الحالي أو حظره من المنصة.
                </p>
              )}
              {reqKind === JahezApprovalKind.PercentageCommission && (
                <p>
                  <strong>ماذا يفعل هذا الإجراء؟</strong> تطبيق احتساب عمولة المندوب بنسبة 15% من صافي الدخل لفترة محددة بدلاً من الخصم اليومي الثابت (15 ر.س/يوم).
                </p>
              )}
              {reqKind === JahezApprovalKind.AccountResetDebtTransfer && (
                <p>
                  <strong>ماذا يفعل هذا الإجراء؟</strong> تصفير مديونية الحساب في منصة جاهز وترحيلها كمديونية شخصية قائمة على المندوب، مع توثيق رقم المرجع الخارجي للتصفير.
                </p>
              )}
            </div>
          </div>

          {reqKind === JahezApprovalKind.FeeException && (
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                مبلغ الإعفاء المطلوب من الرسوم غير المسددة (ر.س)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max="200"
                value={waiverAmount}
                onChange={(e) => setWaiverAmount(e.target.value === "" ? "" : Number(e.target.value))}
                required
              />
            </div>
          )}

          {reqKind === JahezApprovalKind.FreeSwitch && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  الحساب البديل المتاح
                </label>
                <SearchableSelect
                  value={targetAccountId}
                  onChange={(val) => setTargetAccountId(val)}
                  options={availableAccounts.map((a) => ({
                    value: a.id,
                    label: `حساب [${a.externalAccountId || a.code}] - ${a.status}`,
                  }))}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  تاريخ ووقت سريان التبديل (ضمن فترة الاستخدام الحالية)
                </label>
                <Input
                  type="datetime-local"
                  value={resetEffectiveAt}
                  onChange={(e) => setResetEffectiveAt(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {reqKind === JahezApprovalKind.PercentageCommission && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  من تاريخ (شامل)
                </label>
                <Input
                  type="date"
                  value={policyFromDate}
                  onChange={(e) => setPolicyFromDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  إلى تاريخ (شامل)
                </label>
                <Input
                  type="date"
                  value={policyToDate}
                  onChange={(e) => setPolicyToDate(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {reqKind === JahezApprovalKind.AccountResetDebtTransfer && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  تاريخ ووقت سريان التصفير
                </label>
                <Input
                  type="datetime-local"
                  value={resetEffectiveAt}
                  onChange={(e) => setResetEffectiveAt(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  المرجع الخارجي لتصفير لوحة جاهز (External Reset Reference)
                </label>
                <Input
                  type="text"
                  placeholder="رقم العملية أو التذكرة في لوحة تحكم جاهز..."
                  value={externalResetRef}
                  onChange={(e) => setExternalResetRef(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              سبب ومبرر الطلب
            </label>
            <Input
              type="text"
              placeholder="مثال: ضعف أداء المندوب أو عدم توفر طلبات على الحساب..."
              value={reqReason}
              onChange={(e) => setReqReason(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
              disabled={submittingReq}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submittingReq}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {submittingReq ? "جارٍ الإرسال..." : "إرسال الطلب للاعتماد"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Decision Modal */}
      <Modal
        isOpen={Boolean(decidingRequest)}
        onClose={() => setDecidingRequest(null)}
        title={isEn ? "Approval Request Decision" : "اتخاذ قرار بشأن طلب الاعتماد"}
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">نوع الطلب:</span>
              <span className="font-bold">{decidingRequest && kindBadge(decidingRequest.kind)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">سبب مقدم الطلب:</span>
              <span>{decidingRequest?.reason}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              سبب ومبرر القرار (إلزامي)
            </label>
            <Input
              type="text"
              placeholder="اكتب سبب الموافقة أو الرفض..."
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDecidingRequest(null)}
              disabled={isDeciding}
            >
              إلغاء
            </Button>

            <Button
              type="button"
              variant="danger"
              onClick={() => handleDecide(false)}
              disabled={isDeciding}
            >
              {isDeciding ? "جارٍ الحفظ..." : "رفض الطلب"}
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={() => handleDecide(true)}
              disabled={isDeciding}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isDeciding ? "جارٍ الحفظ..." : "اعتماد الطلب"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal 3: Manual Percentage Earnings Statement */}
      <Modal
        isOpen={isEarningsOpen}
        onClose={() => setIsEarningsOpen(false)}
        title={isEn ? "Manual Percentage Earnings Statement" : "تسجيل بيان أرباح العمولة بالنسبة (15%)"}
      >
        <form onSubmit={handleSubmitEarnings} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 text-xs text-purple-900 dark:border-purple-900/40 dark:bg-purple-950/20 dark:text-purple-200 space-y-1">
            <span className="font-bold block">معادلة احتساب العمولة (15%):</span>
            <code className="text-[11px] block bg-white dark:bg-gray-900 p-1.5 rounded font-mono">
              CommissionBase = (DeliveryPrice + DriverCredit + Bonuses + Tips + FreeOrders)
              - (Penalties + CashAmount + DriverDebit + ServiceDeduction)
            </code>
            <p className="text-[11px] text-purple-700 dark:text-purple-300">
              يجب إدخال جميع العناصر المالية التسعة بدقة بما فيها الأصفار الصريحة، وتغطية فترة الاعتماد كاملة بدون تداخل.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              حساب التسليم
            </label>
            <SearchableSelect
              value={earnHandoverId}
              onChange={(val) => setEarnHandoverId(val)}
              options={handovers.map((h) => ({
                value: h.id,
                label: `حساب [${h.externalAccountId || h.id.slice(0, 8)}] (${h.commissionStartsOn})`,
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                من تاريخ
              </label>
              <Input
                type="date"
                value={earnFromDate}
                onChange={(e) => setEarnFromDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
                إلى تاريخ
              </label>
              <Input
                type="date"
                value={earnToDate}
                onChange={(e) => setEarnToDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* 9 Numerical Inputs */}
          <div className="grid grid-cols-3 gap-2.5 text-xs">
            <div>
              <label className="font-medium text-gray-700 dark:text-gray-300 block mb-0.5">
                سعر التوصيل (+)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={totalDeliveryPrice}
                onChange={(e) => setTotalDeliveryPrice(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 dark:text-gray-300 block mb-0.5">
                الجزاءات (-)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={totalPenalties}
                onChange={(e) => setTotalPenalties(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 dark:text-gray-300 block mb-0.5">
                النقد المستلم (-)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={totalCashAmount}
                onChange={(e) => setTotalCashAmount(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 dark:text-gray-300 block mb-0.5">
                خصم السائق (-)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={totalDriverDebit}
                onChange={(e) => setTotalDriverDebit(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 dark:text-gray-300 block mb-0.5">
                استقطاع الخدمة (-)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={totalServiceDeduction}
                onChange={(e) => setTotalServiceDeduction(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 dark:text-gray-300 block mb-0.5">
                إيداع السائق (+)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={totalDriverCredit}
                onChange={(e) => setTotalDriverCredit(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 dark:text-gray-300 block mb-0.5">
                المكافآت والبوانص (+)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={totalBonuses}
                onChange={(e) => setTotalBonuses(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 dark:text-gray-300 block mb-0.5">
                الإكراميات Tips (+)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={totalTips}
                onChange={(e) => setTotalTips(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 dark:text-gray-300 block mb-0.5">
                مبلغ الطلبات المجانية (+)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={totalFreeOrders}
                onChange={(e) => setTotalFreeOrders(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3.5 dark:border-purple-900/60 dark:bg-purple-950/20 text-center">
            <span className="text-xs text-purple-700 dark:text-purple-300 block">
              أساس احتساب العمولة (Commission Base): <strong>{commissionBase.toFixed(2)} ر.س</strong>
            </span>
            <span className="text-xl font-bold text-purple-800 dark:text-purple-200 mt-1 block">
              العمولة المستحقة (15%): {computedCommission.toFixed(2)} ر.س
            </span>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              السبب والمصدر
            </label>
            <Input
              type="text"
              placeholder="مثال: بيان أرباح معتمد من لوحة جاهز..."
              value={earnReason}
              onChange={(e) => setEarnReason(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEarningsOpen(false)}
              disabled={submittingEarn}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submittingEarn}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {submittingEarn ? "جارٍ الحفظ..." : "حفظ بيان الأرباح واحتساب العمولة"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
