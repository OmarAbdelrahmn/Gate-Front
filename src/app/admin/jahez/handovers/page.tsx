// src/app/admin/jahez/handovers/page.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  closeJahezHandover,
  createJahezHandover,
  createLegacyAdoption,
  getJahezHandoverBalance,
  getJahezHandovers,
} from "@/lib/jahez/api";
import {
  type CloseJahezHandoverRequest,
  type CreateJahezHandoverRequest,
  type JahezBalance,
  type JahezHandover,
  type LegacyAdoptionRequest,
} from "@/lib/jahez/types";
import { getPlatformAccounts, type AccountResponse } from "@/lib/platforms/api";
import { listRiders } from "@/lib/workforce/api";
import type { Rider } from "@/lib/workforce/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import {
  Server,
  Plus,
  RefreshCw,
  Search,
  FileSpreadsheet,
  XCircle,
  Eye,
  Info,
} from "lucide-react";

export default function JahezHandoversPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const [handovers, setHandovers] = useState<JahezHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Reference catalogs for creation
  const [availableAccounts, setAvailableAccounts] = useState<AccountResponse[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);

  // 1. New Handover Modal
  const [isNewHandoverOpen, setIsNewHandoverOpen] = useState(false);
  const [handoverAccountId, setHandoverAccountId] = useState("");
  const [handoverRiderId, setHandoverRiderId] = useState("");
  const [handoverEffectiveAt, setHandoverEffectiveAt] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [initialFeePayment, setInitialFeePayment] = useState<number>(0);
  const [handoverReason, setHandoverReason] = useState("للعمل");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // 2. Legacy Adoption Modal
  const [isLegacyOpen, setIsLegacyOpen] = useState(false);
  const [legacyAssignmentId, setLegacyAssignmentId] = useState("");
  const [legacyStartOn, setLegacyStartOn] = useState(new Date().toISOString().split("T")[0]);
  const [legacyDebt, setLegacyDebt] = useState<number>(0);
  const [legacyFees, setLegacyFees] = useState<number>(0);
  const [legacyCommission, setLegacyCommission] = useState<number>(0);
  const [legacyReason, setLegacyReason] = useState("ترحيل واعتماد حساب قائم قبل تطبيق النظام المالي الجديد");
  const [isSubmittingLegacy, setIsSubmittingLegacy] = useState(false);
  const [legacyAssignmentOptions, setLegacyAssignmentOptions] = useState<
    { value: string; label: string; startDate?: string }[]
  >([]);
  const [isManualAssignmentId, setIsManualAssignmentId] = useState(false);

  // 3. Close Handover Modal
  const [closingHandover, setClosingHandover] = useState<JahezHandover | null>(null);
  const [closeEffectiveAt, setCloseEffectiveAt] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [closeReason, setCloseReason] = useState("إنهاء تشغيل الحساب واستلام العهدة");
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);

  // 4. Balance Drawer / Modal
  const [inspectHandover, setInspectHandover] = useState<JahezHandover | null>(null);
  const [inspectBalance, setInspectBalance] = useState<JahezBalance | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const loadHandoversList = async () => {
    setLoading(true);
    try {
      const res = await getJahezHandovers({ page, pageSize: 50 });
      setHandovers(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر استعلام حسابات التسليم";
      toast.error("خطأ", msg);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogs = async () => {
    try {
      const [accs, assignedAccs, rds] = await Promise.all([
        getPlatformAccounts({ status: "Available" }),
        getPlatformAccounts({ status: "Assigned" }),
        listRiders(),
      ]);
      const jahezAccs = (accs || []).filter(
        (a) =>
          a.platformCode === "JAHEZ" ||
          a.platformNameAr?.includes("جاهز") ||
          a.platformNameEn?.toLowerCase().includes("jahez"),
      );
      setAvailableAccounts(jahezAccs);
      setRiders(rds || []);

      const jahezAssigned = (assignedAccs || []).filter(
        (a) =>
          a.currentAssignment?.id &&
          (a.platformCode === "JAHEZ" ||
            a.platformNameAr?.includes("جاهز") ||
            a.platformNameEn?.toLowerCase().includes("jahez")),
      );

      const opts = jahezAssigned.map((a) => {
        const asg = a.currentAssignment!;
        const riderName =
          asg.actualRiderNameAr ||
          asg.actualRiderNameEn ||
          a.ownerRiderNameAr ||
          "مندوب غير محدد";
        const startDate = asg.effectiveFrom ? asg.effectiveFrom.slice(0, 10) : "";
        const accCode = a.code || a.userName || a.externalAccountId || a.id;
        return {
          value: asg.id,
          label: `حساب: ${accCode} | المندوب: ${riderName}${startDate ? ` (تاريخ التعيين: ${startDate})` : ""}`,
          startDate,
        };
      });
      setLegacyAssignmentOptions(opts);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    startTransition(() => {
      loadHandoversList();
    });
    loadCatalogs();
  }, [page]);

  const handleOpenBalance = async (h: JahezHandover) => {
    setInspectHandover(h);
    setInspectLoading(true);
    try {
      const todayDate = new Date().toISOString().split("T")[0];
      const bal = await getJahezHandoverBalance(h.id, todayDate);
      setInspectBalance(bal);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر استعلام الرصيد";
      toast.error("خطأ", msg);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleSubmitNewHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverAccountId || !handoverRiderId) {
      toast.error("تنبيه", "يرجى اختيار الحساب والمندوب");
      return;
    }
    if (initialFeePayment < 0 || initialFeePayment > 200) {
      toast.error("خطأ", "يجب أن تكون الدفعة الأولية لرسوم الحساب بين 0 و200 ر.س");
      return;
    }
    if (!handoverReason.trim()) {
      toast.error("تنبيه", "يرجى كتابة سبب التسليم");
      return;
    }

    setIsSubmittingNew(true);
    try {
      const effectiveUtc = new Date(handoverEffectiveAt).toISOString();
      const payload: CreateJahezHandoverRequest = {
        accountId: handoverAccountId,
        riderProfileId: handoverRiderId,
        effectiveAtUtc: effectiveUtc,
        reason: handoverReason.trim(),
        initialFeePayment,
        feeApprovalRequestId: null,
      };

      await createJahezHandover(payload);
      setIsNewHandoverOpen(false);
      setHandoverReason("للعمل");
      loadHandoversList();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل إنشاء تسليم الحساب";
      toast.error("خطأ", msg);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const handleSubmitLegacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legacyAssignmentId.trim()) {
      toast.error("تنبيه", "يرجى إدخال معرف التعيين السابق (Assignment ID)");
      return;
    }
    if (!legacyReason.trim()) {
      toast.error("تنبيه", "يرجى إدخال سبب الاعتماد المالي السابق");
      return;
    }

    setIsSubmittingLegacy(true);
    try {
      const payload: LegacyAdoptionRequest = {
        assignmentId: legacyAssignmentId.trim(),
        financialStartOn: legacyStartOn,
        openingDebt: Number(legacyDebt) || 0,
        openingFees: Number(legacyFees) || 0,
        openingCommission: Number(legacyCommission) || 0,
        reason: legacyReason.trim(),
      };

      await createLegacyAdoption(payload);
      setIsLegacyOpen(false);
      loadHandoversList();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل اعتماد الحساب السابق";
      toast.error("خطأ", msg);
    } finally {
      setIsSubmittingLegacy(false);
    }
  };

  const handleSubmitClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingHandover) return;
    if (!closeReason.trim()) {
      toast.error("تنبيه", "يرجى كتابة سبب إنهاء استخدام الحساب");
      return;
    }

    setIsSubmittingClose(true);
    try {
      const payload: CloseJahezHandoverRequest = {
        effectiveAtUtc: new Date(closeEffectiveAt).toISOString(),
        reason: closeReason.trim(),
      };
      await closeJahezHandover(closingHandover.id, payload);
      setClosingHandover(null);
      loadHandoversList();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل إنهاء فترة الاستخدام";
      toast.error("خطأ", msg);
    } finally {
      setIsSubmittingClose(false);
    }
  };

  const getRiderDisplayName = (item?: JahezHandover | JahezBalance | null) => {
    if (!item) return "";
    const name = isEn
      ? (item.actualRiderNameEn || item.actualRiderNameAr)
      : (item.actualRiderNameAr || item.actualRiderNameEn);
    return name || "";
  };

  const getOwnerDisplayName = (item?: JahezHandover | JahezBalance | null) => {
    if (!item) return "";
    const name = isEn
      ? (item.ownerRiderNameEn || item.ownerRiderNameAr)
      : (item.ownerRiderNameAr || item.ownerRiderNameEn);
    return name || "";
  };

  const filteredHandovers = handovers.filter((h) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const rName = getRiderDisplayName(h).toLowerCase();
    const oName = getOwnerDisplayName(h).toLowerCase();
    const accCode = (h.account?.code || "").toLowerCase();
    const extId = (h.account?.externalAccountId || h.externalAccountId || "").toLowerCase();
    return (
      h.id.toLowerCase().includes(term) ||
      h.accountId.toLowerCase().includes(term) ||
      h.riderProfileId.toLowerCase().includes(term) ||
      extId.includes(term) ||
      accCode.includes(term) ||
      rName.includes(term) ||
      oName.includes(term)
    );
  });

  const handleExport = () => {
    exportToExcel({
      filename: `jahez_handovers_${new Date().toISOString().slice(0, 10)}.xlsx`,
      data: handovers,
      columns: [
        { header: isEn ? "Handover ID" : "معرف التسليم", accessor: "id" },
        {
          header: isEn ? "Driver ID" : "رقم الحساب الخارجي",
          accessor: (h) => h.account?.externalAccountId || h.externalAccountId || h.account?.code || "-",
        },
        {
          header: isEn ? "Account Code" : "رمز الحساب",
          accessor: (h) => h.account?.code || "-",
        },
        {
          header: isEn ? "Owner Name" : "صاحب الحساب",
          accessor: (h) => getOwnerDisplayName(h) || "-",
        },
        {
          header: isEn ? "Actual Rider" : "المندوب الفعلي",
          accessor: (h) => getRiderDisplayName(h) || h.riderProfileId,
        },
        { header: isEn ? "Started At" : "تاريخ البدء", accessor: "startedAtUtc" },
        { header: isEn ? "Commission Starts" : "بدء العمولة", accessor: "commissionStartsOn" },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Server className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            {isEn ? "Jahez Account Handovers & Operational Lifecycle" : "تسليم وإدارة حسابات جاهز"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isEn
              ? "Manage usage periods, 200 SAR account fee creation, daily commission accrual, and handover closures."
              : "إدارة فترات استخدام حسابات جاهز، ورسوم فتح الحساب (200 ر.س)، والعمولة اليومية (15 ر.س/يوم)، وإغلاق الحسابات."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={loadHandoversList}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {isEn ? "Refresh" : "تحديث"}
          </Button>

          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={handovers.length === 0}
            className="flex items-center gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isEn ? "Export" : "تصدير"}
          </Button>

          {can("jahez.adjustments.manage") && (
            <Button
              variant="secondary"
              onClick={() => {
                if (!legacyReason) {
                  setLegacyReason(
                    isEn
                      ? "Adoption of pre-existing account prior to financial module rollout"
                      : "ترحيل واعتماد حساب قائم قبل تطبيق النظام المالي الجديد",
                  );
                }
                setIsLegacyOpen(true);
              }}
              className="text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              {isEn ? "Old Rider Assign" : "تعيين مندوب قديم"}
            </Button>
          )}

          {can("jahez.handovers.manage") && (
            <Button
              variant="primary"
              onClick={() => {
                setHandoverAccountId("");
                setHandoverRiderId("");
                setHandoverEffectiveAt(new Date().toISOString().slice(0, 16));
                setInitialFeePayment(0);
                setHandoverReason("للعمل");
                setIsNewHandoverOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              {isEn ? "New Handover" : "تسليم حساب جديد"}
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex items-center justify-between">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={isEn ? "Search by Driver ID, Rider, or Handover ID..." : "ابحث برقم الحساب الخارجي، المندوب، أو معرف التسليم..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            نشط: {handovers.filter((h) => !h.endedAtUtc).length}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-400"></span>
            منتهي: {handovers.filter((h) => h.endedAtUtc).length}
          </span>
        </div>
      </div>

      {/* Handovers Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800/60 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3">{isEn ? "Account (Driver ID)" : "الحساب (Driver ID)"}</th>
                <th className="px-4 py-3">{isEn ? "Actual Rider Profile" : "المندوب الفعلي"}</th>
                <th className="px-4 py-3">{isEn ? "Usage Status" : "حالة الاستخدام"}</th>
                <th className="px-4 py-3">{isEn ? "Started At" : "تاريخ البدء"}</th>
                <th className="px-4 py-3">{isEn ? "Commission Starts" : "بدء العمولة"}</th>
                <th className="px-4 py-3">{isEn ? "Commission Cutoff" : "العمولة مرحلة حتى"}</th>
                <th className="px-4 py-3">{isEn ? "Flags" : "ملاحظات"}</th>
                <th className="px-4 py-3">{isEn ? "Actions" : "الإجراءات"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    {isEn ? "Loading handovers..." : "جارٍ تحميل حسابات التسليم..."}
                  </td>
                </tr>
              ) : filteredHandovers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <Server className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-medium text-gray-600 dark:text-gray-300">
                      {isEn ? "No handovers found" : "لا توجد حسابات تسليم مسجلة"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredHandovers.map((h) => {
                  const isActive = !h.endedAtUtc;
                  return (
                    <tr key={h.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-gray-900 dark:text-white block">
                          {h.account?.externalAccountId || h.externalAccountId
                            ? `[${h.account?.externalAccountId || h.externalAccountId}]`
                            : h.account?.code || "-"}
                        </span>
                        {h.account?.code && h.account.code !== (h.account.externalAccountId || h.externalAccountId) && (
                          <span className="block text-xs font-medium text-emerald-600 dark:text-emerald-400 font-sans">
                            {h.account.code}
                          </span>
                        )}
                        {getOwnerDisplayName(h) && (
                          <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5" title={isEn ? "Account Owner" : "صاحب الحساب"}>
                            {getOwnerDisplayName(h)}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                        {getRiderDisplayName(h) || "-"}
                      </td>

                      <td className="px-4 py-3">
                        {isActive ? (
                          <Badge tone="green">
                            نشط بالتشغيل
                          </Badge>
                        ) : (
                          <Badge tone="gray">
                            منتهي الاستخدام
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                        {new Date(h.startedAtUtc).toLocaleDateString("ar-SA")}
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-800 dark:text-gray-200 font-medium">
                        {h.commissionStartsOn}
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                        {h.commissionPostedThrough ?? "-"}
                      </td>

                      <td className="px-4 py-3 text-xs space-x-1">
                        {h.isLegacy && (
                          <Badge tone="orange">
                            Legacy
                          </Badge>
                        )}
                        {h.debtTransferred && (
                          <Badge tone="blue">
                            دين مرحل
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="secondary"
                            onClick={() => handleOpenBalance(h)}
                            className="text-xs py-1 px-2.5 h-8 text-blue-700 border-blue-200 hover:bg-blue-50 flex items-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {isEn ? "Balance" : "الرصيد"}
                          </Button>

                          {isActive && can("jahez.handovers.manage") && (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setClosingHandover(h);
                                setCloseEffectiveAt(new Date().toISOString().slice(0, 16));
                                setCloseReason(isEn ? "Handover termination and account clearance" : "إنهاء تشغيل الحساب واستلام العهدة");
                              }}
                              className="text-xs py-1 px-2.5 h-8 text-red-700 border-red-200 hover:bg-red-50 flex items-center gap-1"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              {isEn ? "Close" : "إنهاء"}
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

      {/* Modal 1: New Handover */}
      <Modal
        isOpen={isNewHandoverOpen}
        onClose={() => setIsNewHandoverOpen(false)}
        title={isEn ? "New Jahez Account Handover" : "تسليم حساب جاهز جديد لمندوب"}
      >
        <form onSubmit={handleSubmitNewHandover} className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200 space-y-1">
            <span className="font-bold block">قواعد تسليم حسابات جاهز:</span>
            <ul className="list-disc pr-4 space-y-0.5">
              <li>يُنشئ التسليم رسماً إلزامياً بقيمة <strong>200 ر.س</strong> على المندوب الفعلي.</li>
              <li>الدفعة الأولية تدخل صندوق رسوم الحساب فورياً، ولا تحتسب تسوية مديونية.</li>
              <li>تبدأ العمولة اليومية (15 ر.س/يوم) من اليوم التالي للتسليم بتوقيت الرياض.</li>
            </ul>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Select Available Jahez Account" : "اختر حساب جاهز المتاح"}
            </label>
            <SearchableSelect
              value={handoverAccountId}
              onChange={(val) => setHandoverAccountId(val)}
              options={availableAccounts.map((a) => ({
                value: a.id,
                label: `حساب [${a.externalAccountId || a.code}] - ${a.status}`,
              }))}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Select Actual Rider" : "اختر المندوب الفعلي المستلم"}
            </label>
            <SearchableSelect
              value={handoverRiderId}
              onChange={(val) => setHandoverRiderId(val)}
              options={riders.map((r) => ({
                value: r.id,
                label: `${r.fullNameAr || r.fullNameEn} (رقم الإقامة/الهوية: ${r.iqamaNo || "-"})`,
              }))}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Effective Date & Time" : "تاريخ ووقت سريان التسليم"}
            </label>
            <Input
              type="datetime-local"
              value={handoverEffectiveAt}
              onChange={(e) => setHandoverEffectiveAt(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex justify-between mb-1">
              <span>{isEn ? "Initial Fee Payment (0 - 200 SAR)" : "الدفعة النقدية الأولية لرسوم الحساب (0 - 200 ر.س)"}</span>
              <span className="text-[11px] text-blue-600">تدخل صندوق رسوم الحساب</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="200"
              value={initialFeePayment}
              onChange={(e) => setInitialFeePayment(Number(e.target.value))}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Reason / Notes" : "سبب التسليم / ملاحظات"}
            </label>
            <Input
              type="text"
              placeholder={isEn ? "e.g., Account handed to rider..." : "مثال: تسليم حساب جاهز للمندوب لبدء العمل..."}
              value={handoverReason}
              onChange={(e) => setHandoverReason(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsNewHandoverOpen(false)}
              disabled={isSubmittingNew}
            >
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmittingNew}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmittingNew ? "جارٍ الإنشاء..." : "تأكيد التسليم"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Legacy Adoption */}
      <Modal
        isOpen={isLegacyOpen}
        onClose={() => setIsLegacyOpen(false)}
        title={
          isEn
            ? "Old Rider Assign"
            : "تعيين مندوب قديم (حساب سابق)"
        }
      >
        <form onSubmit={handleSubmitLegacy} className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 space-y-2">
            <div className="font-semibold text-sm flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
              <Info className="h-4 w-4 shrink-0" />
              <span>ما فائدة هذا الإجراء ومتى يُستخدم؟</span>
            </div>
            <p className="leading-relaxed">
              هذه الشاشة مخصصة <strong>فقط</strong> للمناديب الذين كانوا يستلمون حسابات جاهز ويعملون عليها <strong>قبل تدشين النظام المالي الحالي</strong>.
            </p>
            <div className="border-t border-amber-200/60 dark:border-amber-900/40 pt-2 space-y-1.5 leading-relaxed">
              <div>
                • <strong>لماذا لا نستخدم "تسليم حساب جديد"؟</strong> لأن التسليم الجديد يفرض رسوم فتح حساب جديدة (200 ر.س) ويعتبر المندوب مستلماً جديداً، بينما هذا الخيار يعتمد تعيينه القائم دون تكرار الرسوم.
              </div>
              <div>
                • <strong>ما الذي يفعله هذا الإجراء؟</strong> يربط تعيين المندوب القائم بسجلات جاهز المالية، ويثبت أرصدته الافتتاحية السابقة (المديونيات أو العمولات القديمة)، لتبدأ دورة الحسابات والتسويات الآلية من التاريخ المحدد.
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {isEn ? "Select Assigned Account & Rider" : "اختر الحساب والمندوب المسند له حالياً"}
              </label>
              <button
                type="button"
                onClick={() => setIsManualAssignmentId(!isManualAssignmentId)}
                className="text-[11px] text-blue-600 hover:underline dark:text-blue-400"
              >
                {isManualAssignmentId
                  ? (isEn ? "Select from list" : "الرجوع للاختيار من القائمة")
                  : (isEn ? "Enter UUID manually" : "أو إدخال المعرف يدوياً")}
              </button>
            </div>

            {isManualAssignmentId ? (
              <Input
                type="text"
                placeholder="UUID... e.g. 550e8400-e29b-41d4-a716-446655440000"
                value={legacyAssignmentId}
                onChange={(e) => setLegacyAssignmentId(e.target.value)}
                required
              />
            ) : (
              <SearchableSelect
                value={legacyAssignmentId}
                onChange={(val) => {
                  setLegacyAssignmentId(val);
                  const selected = legacyAssignmentOptions.find((o) => o.value === val);
                  if (selected?.startDate) {
                    setLegacyStartOn(selected.startDate);
                  }
                }}
                options={legacyAssignmentOptions}
                placeholder={
                  legacyAssignmentOptions.length === 0
                    ? (isEn ? "No active assigned Jahez accounts found" : "لا توجد حسابات جاهز مسندة حالياً")
                    : (isEn ? "Select assigned account & rider..." : "اختر الحساب والمندوب من القائمة...")
                }
              />
            )}
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              {isEn
                ? "Selects the existing active assignment in the system to link it to Jahez financial tracking."
                : "يعرض حسابات جاهز المسندة لمناديب حالياً لربطها بدورة المطابقة المالية دون الحاجة لنسخ معرفات UUID."}
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Financial Start On" : "تاريخ البداية المالية"}
            </label>
            <Input
              type="date"
              value={legacyStartOn}
              onChange={(e) => setLegacyStartOn(e.target.value)}
              required
            />
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              {isEn
                ? "The date from which daily commission and order calculations begin in this module."
                : "تاريخ بدء احتساب العمليات والعمولات اليومية في هذا النظام (افتراضياً تاريخ استلام المندوب للحساب)."}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-3 bg-gray-50/50 dark:bg-gray-900/30">
            <div className="text-xs font-semibold text-gray-900 dark:text-white">
              {isEn ? "Opening Balances from Previous Records" : "الأرصدة الافتتاحية المرحلة من السجلات السابقة"}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  مديونية جاهز (ر.س)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={legacyDebt}
                  onChange={(e) => setLegacyDebt(Number(e.target.value))}
                />
                <span className="text-[10px] text-gray-400 block mt-0.5">ديون سابقة مستحقة</span>
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  رسوم الحساب (ر.س)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={legacyFees}
                  onChange={(e) => setLegacyFees(Number(e.target.value))}
                />
                <span className="text-[10px] text-gray-400 block mt-0.5">رسوم فتح غير مسددة</span>
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  عمولة المندوب (ر.س)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={legacyCommission}
                  onChange={(e) => setLegacyCommission(Number(e.target.value))}
                />
                <span className="text-[10px] text-gray-400 block mt-0.5">عمولات سابقة لصالحه</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Reason & Notes" : "السبب والمبرر للترحيل"}
            </label>
            <Input
              type="text"
              value={legacyReason}
              onChange={(e) => setLegacyReason(e.target.value)}
              placeholder="مثال: ترحيل واعتماد حساب قائم قبل تطبيق النظام المالي الجديد"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsLegacyOpen(false)}
              disabled={isSubmittingLegacy}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmittingLegacy}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSubmittingLegacy
                ? (isEn ? "Assigning..." : "جارٍ الحفظ...")
                : (isEn ? "Assign Old Rider" : "تأكيد تعيين المندوب القديم")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Close Handover */}
      <Modal
        isOpen={Boolean(closingHandover)}
        onClose={() => setClosingHandover(null)}
        title={isEn ? "Close Jahez Handover" : "إنهاء فترة استخدام حساب جاهز"}
      >
        <form onSubmit={handleSubmitClose} className="space-y-4">
          <p className="text-xs text-gray-500">
            إنهاء الاستخدام يرحّل العمولة المستحقة حتى يوم الإغلاق، وتبقى الالتزامات المالية السابقة في ذمة المندوب الأصلي على هذا التسليم.
          </p>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Effective Date & Time" : "تاريخ ووقت الإنهاء"}
            </label>
            <Input
              type="datetime-local"
              value={closeEffectiveAt}
              onChange={(e) => setCloseEffectiveAt(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {isEn ? "Reason" : "سبب إنهاء الاستخدام"}
            </label>
            <Input
              type="text"
              placeholder="مثال: انتهاء فترة تشغيل المندوب أو تسليم العهدة..."
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setClosingHandover(null)}
              disabled={isSubmittingClose}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={isSubmittingClose}
            >
              {isSubmittingClose ? "جارٍ الإنهاء..." : "تأكيد إنهاء الاستخدام"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 4: Balance Inspection */}
      <Modal
        isOpen={Boolean(inspectHandover)}
        onClose={() => {
          setInspectHandover(null);
          setInspectBalance(null);
        }}
        title={isEn ? "Handover Real-Time Financial Balance" : "كشف الرصيد المالي المباشر لحساب التسليم"}
      >
        <div className="space-y-4">
          {inspectLoading ? (
            <div className="py-8 text-center text-gray-500">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
              جارٍ استعلام الرصيد...
            </div>
          ) : inspectBalance ? (
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg dark:bg-gray-800 text-xs flex justify-between">
                <div>
                  <span className="text-gray-400 block">رقم الحساب:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {inspectBalance.account?.externalAccountId || inspectBalance.externalAccountId
                      ? `[${inspectBalance.account?.externalAccountId || inspectBalance.externalAccountId}]`
                      : inspectBalance.account?.code || "-"}
                  </span>
                  {inspectBalance.account?.code && inspectBalance.account.code !== (inspectBalance.account.externalAccountId || inspectBalance.externalAccountId) && (
                    <span className="text-xs text-emerald-600 block">
                      {inspectBalance.account.code}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-gray-400 block">المندوب:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {getRiderDisplayName(inspectBalance) || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">تاريخ الاحتساب:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {inspectBalance.throughDate}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                  <span className="text-gray-500 block">رسوم الحساب المستحقة:</span>
                  <span className="text-base font-bold text-blue-600 mt-1 block">
                    {inspectBalance.fees.toLocaleString("ar-SA")} ر.س
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                  <span className="text-gray-500 block">مديونية جاهز من العمليات:</span>
                  <span className="text-base font-bold text-amber-600 mt-1 block">
                    {inspectBalance.platformDebt.toLocaleString("ar-SA")} ر.س
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                  <span className="text-gray-500 block">العمولة المرحلة بالسجل:</span>
                  <span className="text-base font-bold text-purple-600 mt-1 block">
                    {inspectBalance.postedCommission.toLocaleString("ar-SA")} ر.س
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                  <span className="text-gray-500 block">العمولة غير المرحلة (تراكمية):</span>
                  <span className="text-base font-bold text-purple-700 mt-1 block">
                    {inspectBalance.unpostedCommission.toLocaleString("ar-SA")} ر.س
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center dark:bg-emerald-950/20 dark:border-emerald-800">
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium block">
                  إجمالي الذمة المالية المستحقة
                </span>
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 block">
                  {inspectBalance.totalReceivable.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                </span>
              </div>

              <div className="text-xs text-gray-500 flex justify-between pt-1">
                <span>الأيام منذ آخر تسوية: <strong>{inspectBalance.daysSinceSettlementPayment} يوم</strong></span>
                <span>الحالة: {inspectBalance.isOverdue ? <strong className="text-red-600">متأخر بالسداد</strong> : <strong className="text-emerald-600">منتظم</strong>}</span>
              </div>

              {inspectBalance.problems.length > 0 && (
                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-xs text-amber-800">
                  <span className="font-bold block mb-1">ملاحظات اكتمال العمولة:</span>
                  {inspectBalance.problems.map((p, i) => (
                    <div key={i}>• {p}</div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-400">لا تتوفر بيانات للرصيد</p>
          )}

          <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              variant="secondary"
              onClick={() => {
                setInspectHandover(null);
                setInspectBalance(null);
              }}
            >
              إغلاق
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
