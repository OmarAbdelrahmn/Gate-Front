// src/app/admin/jahez/approvals/page.tsx
"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getJahezRequests,
  getJahezRequestDetails,
  createJahezRequest,
  decideJahezRequest,
  getJahezAccounts,
} from "@/lib/jahez/api";
import {
  ApprovalKind,
  ApprovalStatus,
  AdjustmentTarget,
  type ApprovalRequest,
  type Approval,
  type Account,
} from "@/lib/jahez/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  AlertTriangle,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  X,
  FileText,
  User,
} from "lucide-react";

export default function JahezApprovalsPage() {
  const { user, can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [statusFilter, setStatusFilter] = useState<number | "">("");
  const [kindFilter, setKindFilter] = useState<number | "">("");
  const [search, setSearch] = useState("");

  // Create Request Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<ApprovalKind>(ApprovalKind.FeeException);
  const [createHandoverId, setCreateHandoverId] = useState("");
  const [createReason, setCreateReason] = useState("");
  const [createWaiverAmount, setCreateWaiverAmount] = useState<number>(200);
  const [createTargetAccountId, setCreateTargetAccountId] = useState("");
  const [createFromDate, setCreateFromDate] = useState("");
  const [createToDate, setCreateToDate] = useState("");
  const [createOperationId, setCreateOperationId] = useState("");
  const [createAdjTarget, setCreateAdjTarget] = useState<AdjustmentTarget>(AdjustmentTarget.Settlement);
  const [createProposedNet, setCreateProposedNet] = useState<number | "">("");
  const [createProposedComm, setCreateProposedComm] = useState<number | "">("");
  const [createDebtAdj, setCreateDebtAdj] = useState<number | "">("");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Decision Modal State
  const [isDecisionOpen, setIsDecisionOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [useOriginalValues, setUseOriginalValues] = useState(false);
  const [approvedNet, setApprovedNet] = useState<number | "">("");
  const [approvedCommission, setApprovedCommission] = useState<number | "">("");
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [manualHandoverMode, setManualHandoverMode] = useState(false);
  const [manualTargetAccountMode, setManualTargetAccountMode] = useState(false);

  const loadRequests = async (targetPage = page) => {
    setLoading(true);
    try {
      const [reqRes, accRes] = await Promise.allSettled([
        getJahezRequests(targetPage, pageSize),
        getJahezAccounts(1, 100),
      ]);
      if (reqRes.status === "fulfilled") setRequests(reqRes.value.items || []);
      if (accRes.status === "fulfilled") setAccounts(accRes.value.items || []);
    } catch (err: unknown) {
      toast.error("خطأ", "فشل تحميل طلبات الاعتماد");
    } finally {
      setLoading(false);
    }
  };

  const handoverOptions = useMemo(() => {
    return accounts
      .filter((a) => Boolean(a.currentHandoverId))
      .map((a) => ({
        value: a.currentHandoverId!,
        label: `${a.code} - ${a.actualRider?.nameAr || a.userName || "حساب جاهز"}`,
        sublabel: `المندوب: ${a.actualRider?.nameAr || "غير مسند"} (إقامة: ${a.actualRider?.iqamaNo || "-"}) • المعرف: #${a.currentHandoverId!.slice(0, 8)}`,
        keywords: `${a.code} ${a.userName || ""} ${a.actualRider?.nameAr || ""} ${a.actualRider?.iqamaNo || ""} ${a.currentHandoverId}`,
      }));
  }, [accounts]);

  const targetAccountOptions = useMemo(() => {
    return accounts
      .filter((a) => !a.isAssigned || a.status === "Available")
      .map((a) => ({
        value: a.accountId,
        label: `${a.code} - ${a.cityNameAr} (${a.userName || "حساب"})`,
        sublabel: `الحالة: ${a.status} • الكفيل: ${a.sponsorNameAr || "بدون"}`,
        keywords: `${a.code} ${a.userName || ""} ${a.cityNameAr || ""} ${a.accountId}`,
      }));
  }, [accounts]);

  useEffect(() => {
    loadRequests(page);
  }, [page, pageSize]);

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== "" && r.status !== statusFilter) return false;
    if (kindFilter !== "" && r.kind !== kindFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      r.handoverId.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q)
    );
  });

  // Handle open create modal
  const openCreateModal = () => {
    setCreateKind(ApprovalKind.FeeException);
    setCreateHandoverId("");
    setCreateReason("");
    setCreateWaiverAmount(200);
    setCreateTargetAccountId("");
    setCreateFromDate("");
    setCreateToDate("");
    setCreateOperationId("");
    setCreateAdjTarget(AdjustmentTarget.Settlement);
    setCreateProposedNet("");
    setCreateProposedComm("");
    setCreateDebtAdj("");
    setIsCreateOpen(true);
  };

  const handleCreateRequest = async () => {
    if (!createHandoverId.trim()) {
      toast.warning("تنبيه", "يرجى إدخال معرف فترة التسليم (Handover ID)");
      return;
    }
    if (!createReason.trim()) {
      toast.warning("تنبيه", "يرجى تسجيل سبب الطلب");
      return;
    }

    setCreateSubmitting(true);
    try {
      await createJahezRequest({
        handoverId: createHandoverId.trim(),
        kind: createKind,
        reason: createReason.trim(),
        waiverAmount:
          createKind === ApprovalKind.FeeException || createKind === ApprovalKind.AccountSwitch
            ? Number(createWaiverAmount) || 0
            : undefined,
        targetAccountId:
          createKind === ApprovalKind.AccountSwitch ? createTargetAccountId.trim() : undefined,
        fromDate: createKind === ApprovalKind.PercentageCommission ? createFromDate : undefined,
        toDate: createKind === ApprovalKind.PercentageCommission ? createToDate : undefined,
        operationId:
          createKind === ApprovalKind.SettlementTransfer ||
          (createKind === ApprovalKind.Adjustment && createAdjTarget === AdjustmentTarget.Settlement)
            ? createOperationId.trim()
            : undefined,
        adjustmentTarget:
          createKind === ApprovalKind.Adjustment ? createAdjTarget : undefined,
        proposedNet:
          createKind === ApprovalKind.Adjustment && createProposedNet !== ""
            ? Number(createProposedNet)
            : undefined,
        proposedCommission:
          createKind === ApprovalKind.Adjustment && createProposedComm !== ""
            ? Number(createProposedComm)
            : undefined,
        debtAdjustment:
          createKind === ApprovalKind.Adjustment && createDebtAdj !== ""
            ? Number(createDebtAdj)
            : undefined,
      });

      setIsCreateOpen(false);
      loadRequests(page);
    } catch (err: unknown) {
      toast.error("فشل تقديم الطلب", err instanceof Error ? err.message : "خطأ أثناء إنشاء الطلب");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Decision Modal
  const openDecisionModal = async (requestId: string) => {
    try {
      const app = await getJahezRequestDetails(requestId);
      setSelectedApproval(app);
      setDecisionReason("");
      setUseOriginalValues(false);
      setApprovedNet(app.request.proposedNet ?? "");
      setApprovedCommission(app.request.proposedCommission ?? "");
      setIsDecisionOpen(true);
    } catch (err: unknown) {
      toast.error("خطأ", "تعذر جلب تفاصيل الطلب");
    }
  };

  const submitDecision = async (approve: boolean) => {
    if (!selectedApproval) return;

    // Self-approval check
    if (user?.id && selectedApproval.request.requestedByUserId === user.id) {
      toast.error(
        "غير مسموح",
        "النظام يمنع اعتماد المستخدم لطلبه الشخصي. يجب أن يتخذ القرار مدير آخر.",
      );
      return;
    }

    setDecisionSubmitting(true);
    try {
      await decideJahezRequest(selectedApproval.request.id, {
        approve,
        reason: decisionReason.trim() || (approve ? "اعتماد الطلب" : "رفض الطلب"),
        useOriginalValues: approve ? useOriginalValues : undefined,
        approvedNet:
          approve && !useOriginalValues && approvedNet !== ""
            ? Number(approvedNet)
            : undefined,
        approvedCommission:
          approve && !useOriginalValues && approvedCommission !== ""
            ? Number(approvedCommission)
            : undefined,
      });

      setIsDecisionOpen(false);
      loadRequests(page);
    } catch (err: unknown) {
      toast.error("فشل تسجيل القرار", err instanceof Error ? err.message : "تعذر تنفيذ القرار");
    } finally {
      setDecisionSubmitting(false);
    }
  };

  const getKindLabel = (kind: ApprovalKind) => {
    switch (kind) {
      case ApprovalKind.FeeException:
        return "إعفاء رسوم الحساب";
      case ApprovalKind.AccountSwitch:
        return "تبديل الحساب";
      case ApprovalKind.PercentageCommission:
        return "سياسة عمولة 15%";
      case ApprovalKind.SettlementTransfer:
        return "تصفية وسحب وترحيل مديونية";
      case ApprovalKind.Adjustment:
        return "تعديل تصفية / مديونية";
      default:
        return `طلب نوع ${kind}`;
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">
              طلبات الاعتماد والقرارات
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              إعفاءات الرسوم، تبديل الحسابات، سياسات 15%، الترحيل وتعديل التصفيات
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadRequests(page)}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>

          <Button
            onClick={openCreateModal}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2"
          >
            <Plus className="h-4 w-4" />
            إنشاء طلب جديد
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الطلب، معرف التسليم، أو السبب..."
            className="pr-10 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value === "" ? "" : Number(e.target.value))}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="">جميع أنواع الطلبات</option>
            <option value={ApprovalKind.FeeException}>إعفاء رسوم</option>
            <option value={ApprovalKind.AccountSwitch}>تبديل حساب</option>
            <option value={ApprovalKind.PercentageCommission}>عمولة 15%</option>
            <option value={ApprovalKind.SettlementTransfer}>تصفية وسحب وترحيل</option>
            <option value={ApprovalKind.Adjustment}>تعديل تصفية أو مديونية</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value === "" ? "" : Number(e.target.value))}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="">جميع الحالات</option>
            <option value={ApprovalStatus.Pending}>قيد الانتظار (Pending)</option>
            <option value={ApprovalStatus.Approved}>معتمد (Approved)</option>
            <option value={ApprovalStatus.Rejected}>مرفوض (Rejected)</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-bold text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-300">
              <tr>
                <th className="py-3 px-3">رقم الطلب</th>
                <th className="py-3 px-3">نوع الطلب</th>
                <th className="py-3 px-3">معرف التسليم / العملية</th>
                <th className="py-3 px-3">البيانات المقترحة</th>
                <th className="py-3 px-3">السبب</th>
                <th className="py-3 px-3 text-center">الحالة</th>
                <th className="py-3 px-3">تاريخ التقديم</th>
                <th className="py-3 px-3 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-indigo-500 mb-2" />
                    جارٍ تحميل طلبات الاعتماد...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    لا توجد طلبات مطابقة للمعايير الحالية
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                    <td className="py-3 px-3 font-mono font-bold text-gray-900 dark:text-gray-100">
                      #{req.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-indigo-700 dark:text-indigo-400">
                      {getKindLabel(req.kind)}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-gray-500">
                      <div>تسليم: {req.handoverId.slice(0, 8)}</div>
                      {req.operationId && <div>عملية: {req.operationId.slice(0, 8)}</div>}
                    </td>
                    <td className="py-3 px-3">
                      {req.kind === ApprovalKind.FeeException && (
                        <span>إعفاء: {req.waiverAmount} ريال</span>
                      )}
                      {req.kind === ApprovalKind.AccountSwitch && (
                        <span>
                          بديل: {req.targetAccountId?.slice(0, 8)} • إعفاء: {req.waiverAmount}
                        </span>
                      )}
                      {req.kind === ApprovalKind.PercentageCommission && (
                        <span>
                          من: {req.fromDate} إلى: {req.toDate}
                        </span>
                      )}
                      {req.kind === ApprovalKind.SettlementTransfer && (
                        <span className="text-purple-700 font-bold">ترحيل كامل المستحق وحظر</span>
                      )}
                      {req.kind === ApprovalKind.Adjustment && (
                        <div>
                          {req.proposedNet !== null && (
                            <div>صافي مقترح: {req.proposedNet} ر.س</div>
                          )}
                          {req.proposedCommission !== null && (
                            <div>عمولة مقترحة: {req.proposedCommission} ر.س</div>
                          )}
                          {req.debtAdjustment !== null && (
                            <div>تعديل مديونية: {req.debtAdjustment} ر.س</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300 max-w-xs truncate">
                      {req.reason}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge
                        tone={
                          req.status === ApprovalStatus.Approved
                            ? "green"
                            : req.status === ApprovalStatus.Rejected
                            ? "red"
                            : "orange"
                        }
                      >
                        {req.status === ApprovalStatus.Approved
                          ? "معتمد"
                          : req.status === ApprovalStatus.Rejected
                          ? "مرفوض"
                          : "قيد الانتظار"}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-gray-400">
                      {req.createdAtUtc?.slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Button
                        size="sm"
                        variant={req.status === ApprovalStatus.Pending ? "primary" : "secondary"}
                        onClick={() => openDecisionModal(req.id)}
                        className="h-7 text-xs font-bold"
                      >
                        {req.status === ApprovalStatus.Pending ? "فحص واتخاذ قرار" : "عرض القرار"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Create Request Modal                                               */}
      {/* ================================================================= */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="إنشاء طلب اعتماد جديد — جاهز V2"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              نوع طلب الاعتماد *
            </label>
            <select
              value={createKind}
              onChange={(e) => setCreateKind(Number(e.target.value) as ApprovalKind)}
              className="w-full rounded-xl border border-gray-300 bg-white p-2 text-xs font-bold dark:border-gray-700 dark:bg-gray-800"
            >
              <option value={ApprovalKind.FeeException}>1. إعفاء رسوم فتح الحساب</option>
              <option value={ApprovalKind.AccountSwitch}>2. تبديل الحساب</option>
              <option value={ApprovalKind.PercentageCommission}>3. تطبيق سياسة عمولة 15%</option>
              <option value={ApprovalKind.SettlementTransfer}>
                4. تصفية وسحب وترحيل مديونية
              </option>
              <option value={ApprovalKind.Adjustment}>5. تعديل تصفية / مديونية إدارية</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-gray-700 dark:text-gray-300">
                فترة التسليم النشطة *
              </label>
              <button
                type="button"
                onClick={() => setManualHandoverMode(!manualHandoverMode)}
                className="text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {manualHandoverMode ? "اختر من القائمة المنسدلة" : "إدخال يدوي للمعرف"}
              </button>
            </div>

            {!manualHandoverMode ? (
              <SearchableSelect
                options={handoverOptions}
                value={createHandoverId}
                onChange={setCreateHandoverId}
                placeholder="اختر فترة التسليم أو ابحث بالحساب أو المندوب..."
                searchPlaceholder="ابحث برقم الحساب، اسم المندوب، أو رقم الإقامة..."
                noOptionsText="لا توجد فترات تسليم نشطة حالياً"
              />
            ) : (
              <Input
                value={createHandoverId}
                onChange={(e) => setCreateHandoverId(e.target.value)}
                placeholder="معرف فترة التسليم النشطة..."
              />
            )}
          </div>

          {/* نوع 1: إعفاء رسوم */}
          {createKind === ApprovalKind.FeeException && (
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                قيمة الإعفاء المطلوبة (ريال) *
              </label>
              <Input
                type="number"
                max={200}
                value={createWaiverAmount}
                onChange={(e) => setCreateWaiverAmount(Number(e.target.value) || 0)}
              />
              <span className="text-[10px] text-gray-400">
                200 إعفاء كامل، أو قيمة جزئية لا تتجاوز غير المدفوع
              </span>
            </div>
          )}

          {/* نوع 2: تبديل الحساب */}
          {createKind === ApprovalKind.AccountSwitch && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-gray-700 dark:text-gray-300">
                    الحساب البديل المستهدف *
                  </label>
                  <button
                    type="button"
                    onClick={() => setManualTargetAccountMode(!manualTargetAccountMode)}
                    className="text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {manualTargetAccountMode ? "اختر من القائمة المنسدلة" : "إدخال يدوي للمعرف"}
                  </button>
                </div>

                {!manualTargetAccountMode ? (
                  <SearchableSelect
                    options={targetAccountOptions}
                    value={createTargetAccountId}
                    onChange={setCreateTargetAccountId}
                    placeholder="اختر الحساب البديل المتاح..."
                    searchPlaceholder="ابحث برقم الحساب أو المدينة..."
                    noOptionsText="لا توجد حسابات متاحة للتبديل"
                  />
                ) : (
                  <Input
                    value={createTargetAccountId}
                    onChange={(e) => setCreateTargetAccountId(e.target.value)}
                    placeholder="Target Account ID..."
                  />
                )}
              </div>
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  إعفاء رسوم الحساب البديل (200 مجاني، 140 يعني رسوم 60)
                </label>
                <Input
                  type="number"
                  value={createWaiverAmount}
                  onChange={(e) => setCreateWaiverAmount(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          )}

          {/* نوع 3: عمولة 15% */}
          {createKind === ApprovalKind.PercentageCommission && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  من تاريخ (YYYY-MM-DD)
                </label>
                <Input
                  type="date"
                  value={createFromDate}
                  onChange={(e) => setCreateFromDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  إلى تاريخ (YYYY-MM-DD)
                </label>
                <Input
                  type="date"
                  value={createToDate}
                  onChange={(e) => setCreateToDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* نوع 4: ترحيل */}
          {createKind === ApprovalKind.SettlementTransfer && (
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                معرف العملية (Operation ID) المسجلة كسحب مع ترحيل *
              </label>
              <Input
                value={createOperationId}
                onChange={(e) => setCreateOperationId(e.target.value)}
                placeholder="Operation ID..."
              />
            </div>
          )}

          {/* نوع 5: تعديل */}
          {createKind === ApprovalKind.Adjustment && (
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  هدف التعديل *
                </label>
                <select
                  value={createAdjTarget}
                  onChange={(e) =>
                    setCreateAdjTarget(Number(e.target.value) as AdjustmentTarget)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white p-2 text-xs font-bold dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value={AdjustmentTarget.Settlement}>1. تعديل تصفية جارية</option>
                  <option value={AdjustmentTarget.AdministrativeDebt}>
                    2. تعديل رصيد المديونية الإدارية
                  </option>
                </select>
              </div>

              {createAdjTarget === AdjustmentTarget.Settlement ? (
                <>
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      معرف العملية (Operation ID) *
                    </label>
                    <Input
                      value={createOperationId}
                      onChange={(e) => setCreateOperationId(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        الصافي المقترح
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={createProposedNet}
                        onChange={(e) =>
                          setCreateProposedNet(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        العمولة المقترحة
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={createProposedComm}
                        onChange={(e) =>
                          setCreateProposedComm(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    قيمة تعديل المديونية (حركة فرق موقعة +/-)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={createDebtAdj}
                    onChange={(e) =>
                      setCreateDebtAdj(e.target.value === "" ? "" : Number(e.target.value))
                    }
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              السبب والمبرر الإداري *
            </label>
            <Input
              value={createReason}
              onChange={(e) => setCreateReason(e.target.value)}
              placeholder="اكتب مبرر الطلب..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
              disabled={createSubmitting}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleCreateRequest}
              disabled={createSubmitting || !createHandoverId.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {createSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : "إرسال الطلب"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ================================================================= */}
      {/* Decision Modal (فحص واتخاذ القرار)                                */}
      {/* ================================================================= */}
      <Modal
        isOpen={isDecisionOpen}
        onClose={() => setIsDecisionOpen(false)}
        title="فحص طلب الاعتماد واتخاذ القرار"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          {selectedApproval && (
            <div className="space-y-3">
              <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800 space-y-1">
                <div className="font-bold text-sm">
                  الطلب #{selectedApproval.request.id.slice(0, 8)} —{" "}
                  {getKindLabel(selectedApproval.request.kind)}
                </div>
                <div className="text-gray-500">
                  مقدم الطلب: {selectedApproval.request.requestedByUserId.slice(0, 8)} • تاريخ:{" "}
                  {selectedApproval.request.createdAtUtc.slice(0, 10)}
                </div>
                <div className="text-gray-700 dark:text-gray-300 mt-1">
                  السبب: {selectedApproval.request.reason}
                </div>
              </div>

              {/* التحقق من عدم الاعتماد للنفس */}
              {user?.id && selectedApproval.request.requestedByUserId === user.id && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>
                    تنبيه: أنت مقدم هذا الطلب. وفق سياسة التدقيق الصارمة، لا يمكن لمقدم الطلب
                    اعتماد طلبه الشخصي. يجب أن يعتمده مدير آخر.
                  </span>
                </div>
              )}

              {/* سجل القرارات السابقة */}
              {selectedApproval.decisions.length > 0 && (
                <div className="border-t pt-2">
                  <div className="font-bold text-gray-700 dark:text-gray-300 mb-1">
                    القرارات السابقة:
                  </div>
                  {selectedApproval.decisions.map((d) => (
                    <div key={d.id} className="text-[11px] text-gray-500">
                      قرار #{d.id.slice(0, 6)}:{" "}
                      {d.status === ApprovalStatus.Approved ? "معتمد" : "مرفوض"} بواسطة{" "}
                      {d.actorUserId.slice(0, 8)} في {d.decidedAtUtc.slice(0, 10)} ({d.reason})
                    </div>
                  ))}
                </div>
              )}

              {/* خيارات القرار إذا كان معلقاً */}
              {selectedApproval.request.status === ApprovalStatus.Pending && (
                <div className="space-y-3 pt-2 border-t">
                  {selectedApproval.request.kind === ApprovalKind.Adjustment && (
                    <div className="space-y-2 rounded-xl bg-indigo-50/50 p-3 dark:bg-indigo-950/30">
                      <label className="flex items-center gap-2 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useOriginalValues}
                          onChange={(e) => setUseOriginalValues(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span>اعتماد القيم الأصلية وتجاهل القيم المقترحة (useOriginalValues)</span>
                      </label>

                      {!useOriginalValues && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                              الصافي المعتمد
                            </label>
                            <Input
                              type="number"
                              step="0.01"
                              value={approvedNet}
                              onChange={(e) =>
                                setApprovedNet(
                                  e.target.value === "" ? "" : Number(e.target.value),
                                )
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                              العمولة المعتمدة
                            </label>
                            <Input
                              type="number"
                              step="0.01"
                              value={approvedCommission}
                              onChange={(e) =>
                                setApprovedCommission(
                                  e.target.value === "" ? "" : Number(e.target.value),
                                )
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      مبرر / سبب القرار *
                    </label>
                    <Input
                      value={decisionReason}
                      onChange={(e) => setDecisionReason(e.target.value)}
                      placeholder="سبب الاعتماد أو الرفض..."
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <Button
                      variant="secondary"
                      onClick={() => setIsDecisionOpen(false)}
                      disabled={decisionSubmitting}
                    >
                      إغلاق
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => submitDecision(false)}
                        disabled={decisionSubmitting}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1"
                      >
                        <X className="h-4 w-4" />
                        رفض الطلب
                      </Button>

                      <Button
                        onClick={() => submitDecision(true)}
                        disabled={decisionSubmitting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
                      >
                        <Check className="h-4 w-4" />
                        اعتماد الطلب
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
