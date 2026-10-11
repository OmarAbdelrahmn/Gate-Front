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
  ChevronLeft,
  ChevronRight,
  FileText,
  Copy,
  Check,
} from "lucide-react";

export default function JahezHandoversPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const [handovers, setHandovers] = useState<JahezHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(500);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  // Details Modal
  const [inspectDetailsHandover, setInspectDetailsHandover] = useState<JahezHandover | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const BACKEND_MAX_PAGE_SIZE = 100;

  const loadHandoversList = async (targetPage = page, targetPageSize = pageSize) => {
    setLoading(true);
    try {
      if (targetPageSize <= BACKEND_MAX_PAGE_SIZE) {
        const res = await getJahezHandovers({ page: targetPage, pageSize: targetPageSize });
        const items = res.items || [];
        setHandovers(items);

        const rawCount =
          typeof res.totalCount === "number"
            ? res.totalCount
            : typeof res.total === "number"
            ? res.total
            : typeof res.count === "number"
            ? res.count
            : null;

        if (rawCount !== null) {
          setTotalCount(rawCount);
          const calculatedPages = Math.max(1, Math.ceil(rawCount / targetPageSize));
          setTotalPages(calculatedPages);
          setHasNextPage(targetPage < calculatedPages);
        } else {
          setTotalCount(null);
          const hasMore = items.length >= targetPageSize;
          setHasNextPage(hasMore);
          setTotalPages(hasMore ? Math.max(targetPage + 1, totalPages) : targetPage);
        }
        return;
      }

      // targetPageSize > 100 (e.g., 500 items per UI page)
      // Map UI page to backend pages of size 100 (e.g. UI page 1 -> backend pages 1..5)
      const backendPagesPerUiPage = Math.ceil(targetPageSize / BACKEND_MAX_PAGE_SIZE);
      const startBackendPage = (targetPage - 1) * backendPagesPerUiPage + 1;

      // 1. Fetch first backend chunk
      const firstRes = await getJahezHandovers({
        page: startBackendPage,
        pageSize: BACKEND_MAX_PAGE_SIZE,
      });

      let items = [...(firstRes.items || [])];
      const rawCount =
        typeof firstRes.totalCount === "number"
          ? firstRes.totalCount
          : typeof firstRes.total === "number"
          ? firstRes.total
          : typeof firstRes.count === "number"
          ? firstRes.count
          : null;

      let endBackendPage = startBackendPage + backendPagesPerUiPage - 1;
      if (rawCount !== null) {
        const totalBackendPages = Math.ceil(rawCount / BACKEND_MAX_PAGE_SIZE);
        endBackendPage = Math.min(endBackendPage, totalBackendPages);
      }

      // Fetch remaining backend chunks in parallel if needed and if first chunk was full
      if (endBackendPage > startBackendPage && (firstRes.items || []).length === BACKEND_MAX_PAGE_SIZE) {
        const promises = [];
        for (let p = startBackendPage + 1; p <= endBackendPage; p++) {
          promises.push(
            getJahezHandovers({ page: p, pageSize: BACKEND_MAX_PAGE_SIZE }).catch((err) => {
              console.warn(`Failed to fetch handover backend page ${p}:`, err);
              return null;
            })
          );
        }
        const remainingResults = await Promise.all(promises);
        for (const r of remainingResults) {
          if (r?.items) {
            items = items.concat(r.items);
          }
        }
      }

      setHandovers(items);

      if (rawCount !== null) {
        setTotalCount(rawCount);
        const calculatedPages = Math.max(1, Math.ceil(rawCount / targetPageSize));
        setTotalPages(calculatedPages);
        setHasNextPage(targetPage < calculatedPages);
      } else {
        setTotalCount(null);
        const hasMore = items.length >= targetPageSize;
        setHasNextPage(hasMore);
        setTotalPages(hasMore ? Math.max(targetPage + 1, totalPages) : targetPage);
      }
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
      loadHandoversList(page, pageSize);
    });
  }, [page, pageSize]);

  useEffect(() => {
    loadCatalogs();
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    if (totalCount !== null && newPage > totalPages) return;
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    pages.push(1);

    if (page > 3) {
      pages.push("...");
    }

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (page < totalPages - 2) {
      pages.push("...");
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const copyToClipboard = (text: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("تم النسخ", "تم نسخ المعرف إلى الحافظة");
    }
  };

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
      loadHandoversList(1, pageSize);
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
      loadHandoversList(1, pageSize);
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
      loadHandoversList(page, pageSize);
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
      filename: `jahez_handovers_page_${page}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      data: filteredHandovers,
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
        {
          header: isEn ? "Usage Status" : "حالة الاستخدام",
          accessor: (h) => (!h.endedAtUtc ? (isEn ? "Active" : "نشط بالتشغيل") : (isEn ? "Ended" : "منتهي")),
        },
        { header: isEn ? "Started At" : "تاريخ البدء", accessor: "startedAtUtc" },
        { header: isEn ? "Ended At" : "تاريخ الانتهاء", accessor: (h) => h.endedAtUtc || "-" },
        { header: isEn ? "Commission Starts" : "بدء العمولة", accessor: "commissionStartsOn" },
        { header: isEn ? "Commission Cutoff" : "العمولة مرحلة حتى", accessor: (h) => h.commissionPostedThrough || "-" },
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
            onClick={() => loadHandoversList(page, pageSize)}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {isEn ? "Refresh" : "تحديث"}
          </Button>

          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={filteredHandovers.length === 0}
            className="flex items-center gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isEn ? "Export" : "تصدير"}
          </Button>

          {can("jahez.adjustments.create") && (
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

          {can("jahez.handovers.create") && (
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
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 max-w-md w-full relative">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={isEn ? "Search by Driver ID, Rider, or Handover ID..." : "ابحث برقم الحساب الخارجي، المندوب، أو معرف التسليم..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
            {isEn ? "In this page:" : "في هذه الصفحة:"} <strong className="text-gray-900 dark:text-white">{handovers.length}</strong>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            {isEn ? "Active:" : "نشط:"} {handovers.filter((h) => !h.endedAtUtc).length}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gray-400"></span>
            {isEn ? "Ended:" : "منتهي:"} {handovers.filter((h) => h.endedAtUtc).length}
          </span>
          {totalCount !== null && (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
              {isEn ? `Total: ${totalCount.toLocaleString()}` : `الإجمالي العام: ${totalCount.toLocaleString("ar-SA")}`}
            </span>
          )}
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
                            onClick={() => setInspectDetailsHandover(h)}
                            className="text-xs py-1 px-2.5 h-8 text-gray-700 border-gray-200 hover:bg-gray-50 flex items-center gap-1 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800"
                            title={isEn ? "Handover Details" : "تفاصيل التسليم"}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {isEn ? "Details" : "التفاصيل"}
                          </Button>

                          <Button
                            variant="secondary"
                            onClick={() => handleOpenBalance(h)}
                            className="text-xs py-1 px-2.5 h-8 text-blue-700 border-blue-200 hover:bg-blue-50 flex items-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {isEn ? "Balance" : "الرصيد"}
                          </Button>

                          {isActive && can("jahez.handovers.delete") && (
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

        {/* Pagination Bar */}
        <div className="border-t border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-800/40 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          {/* Left / Info & Range */}
          <div className="flex flex-wrap items-center gap-2 text-gray-600 dark:text-gray-300 font-medium">
            <span>
              {isEn
                ? `Showing ${(page - 1) * pageSize + (filteredHandovers.length > 0 ? 1 : 0)} to ${(page - 1) * pageSize + filteredHandovers.length}${totalCount !== null ? ` of ${totalCount.toLocaleString()}` : ""} handovers`
                : `عرض ${(page - 1) * pageSize + (filteredHandovers.length > 0 ? 1 : 0)} إلى ${(page - 1) * pageSize + filteredHandovers.length}${totalCount !== null ? ` من أصل ${totalCount.toLocaleString("ar-SA")}` : ""} تسليم`}
            </span>

            <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
              {isEn ? `Page ${page}${totalPages > 1 ? ` of ${totalPages}` : ""}` : `الصفحة ${page}${totalPages > 1 ? ` من ${totalPages}` : ""}`}
            </span>

            {search && (
              <span className="rounded-md bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 text-[11px] text-blue-800 dark:text-blue-300">
                {isEn ? `Filtered: ${filteredHandovers.length} of ${handovers.length}` : `تصفية: ${filteredHandovers.length} من ${handovers.length}`}
              </span>
            )}
          </div>

          {/* Center / Page Size Selection */}
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <span>{isEn ? "Page size:" : "عدد السجلات:"}</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value={500}>{isEn ? "500 (Default)" : "500 (الافتراضي)"}</option>
              <option value={250}>250</option>
              <option value={100}>100</option>
              <option value={50}>50</option>
            </select>
          </div>

          {/* Right / Pagination Navigation Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Previous Button */}
            <Button
              variant="secondary"
              disabled={page <= 1 || loading}
              onClick={() => handlePageChange(page - 1)}
              className="text-xs py-1 px-3 h-8 gap-1 font-semibold"
              title={isEn ? "Previous Page" : "الصفحة السابقة"}
            >
              {isEn ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span>{isEn ? "Previous" : "السابق"}</span>
            </Button>

            {/* Page Number Pills */}
            {totalPages > 1 &&
              getPageNumbers().map((p, idx) =>
                p === "..." ? (
                  <span key={`dots-${idx}`} className="px-2 text-gray-400 font-bold">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${p}`}
                    type="button"
                    onClick={() => handlePageChange(p as number)}
                    disabled={loading || page === p}
                    className={`min-w-8 h-8 rounded-lg px-2 text-xs font-bold transition-colors ${
                      page === p
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

            {/* Next Button */}
            <Button
              variant="secondary"
              disabled={
                (!hasNextPage && totalCount !== null && page >= totalPages) ||
                (totalCount === null && !hasNextPage) ||
                loading
              }
              onClick={() => handlePageChange(page + 1)}
              className="text-xs py-1 px-3 h-8 gap-1 font-semibold"
              title={isEn ? "Next Page" : "الصفحة التالية"}
            >
              <span>{isEn ? "Next" : "التالي"}</span>
              {isEn ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
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

      {/* Modal 5: Handover Operational Details */}
      <Modal
        isOpen={Boolean(inspectDetailsHandover)}
        onClose={() => setInspectDetailsHandover(null)}
        title={isEn ? "Handover Operational & Lifecycle Details" : "تفاصيل تسليم ودورة حياة حساب جاهز"}
      >
        {inspectDetailsHandover && (
          <div className="space-y-4 text-xs">
            {/* Top summary card */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-gray-400 block text-[11px]">{isEn ? "Handover ID" : "معرف التسليم"}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono font-bold text-gray-900 dark:text-white select-all">
                      {inspectDetailsHandover.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(inspectDetailsHandover.id, "handover-id")}
                      className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"
                      title={isEn ? "Copy ID" : "نسخ المعرف"}
                    >
                      {copiedId === "handover-id" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  {!inspectDetailsHandover.endedAtUtc ? (
                    <Badge tone="green">{isEn ? "Active" : "نشط بالتشغيل"}</Badge>
                  ) : (
                    <Badge tone="gray">{isEn ? "Ended" : "منتهي الاستخدام"}</Badge>
                  )}
                </div>
              </div>

              {inspectDetailsHandover.assignmentId && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-400 block text-[11px]">{isEn ? "Assignment ID" : "معرف التعيين المرتبط (Assignment ID)"}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-gray-700 dark:text-gray-300 select-all">
                      {inspectDetailsHandover.assignmentId}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(inspectDetailsHandover.assignmentId, "assignment-id")}
                      className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"
                      title={isEn ? "Copy ID" : "نسخ المعرف"}
                    >
                      {copiedId === "assignment-id" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Account & Rider Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-1.5">
                <span className="font-bold text-gray-900 dark:text-white block text-sm flex items-center gap-1.5">
                  <Server className="h-4 w-4 text-emerald-600" />
                  {isEn ? "Account Details" : "بيانات الحساب"}
                </span>
                <div>
                  <span className="text-gray-400 block text-[11px]">{isEn ? "External Account ID (Driver ID)" : "رقم الحساب الخارجي (Driver ID)"}</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    {inspectDetailsHandover.account?.externalAccountId || inspectDetailsHandover.externalAccountId || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">{isEn ? "Account Code" : "رمز الحساب الداخلي"}</span>
                  <span className="font-mono text-gray-800 dark:text-gray-200">
                    {inspectDetailsHandover.account?.code || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">{isEn ? "Account UUID" : "معرف الحساب (UUID)"}</span>
                  <span className="font-mono text-[11px] text-gray-600 dark:text-gray-400">
                    {inspectDetailsHandover.accountId}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-1.5">
                <span className="font-bold text-gray-900 dark:text-white block text-sm">
                  {isEn ? "Rider Details" : "بيانات المندوبين"}
                </span>
                <div>
                  <span className="text-gray-400 block text-[11px]">{isEn ? "Actual Rider" : "المندوب الفعلي (المستلم)"}</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {getRiderDisplayName(inspectDetailsHandover) || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">{isEn ? "Actual Rider Profile ID" : "معرف المندوب الفعلي"}</span>
                  <span className="font-mono text-[11px] text-gray-600 dark:text-gray-400">
                    {inspectDetailsHandover.riderProfileId}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[11px]">{isEn ? "Account Owner" : "صاحب الحساب المسجل"}</span>
                  <span className="text-gray-800 dark:text-gray-200 font-medium">
                    {getOwnerDisplayName(inspectDetailsHandover) || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Operational & Financial Timeline */}
            <div className="p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2.5">
              <span className="font-bold text-gray-900 dark:text-white block text-sm">
                {isEn ? "Operational Dates & Financial Status" : "تواريخ التشغيل والارتباط المالي"}
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block text-[11px]">{isEn ? "Started At" : "تاريخ ووقت البدء"}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(inspectDetailsHandover.startedAtUtc).toLocaleString("ar-SA")}
                  </span>
                  <span className="block font-mono text-[10px] text-gray-400 mt-0.5">
                    {inspectDetailsHandover.startedAtUtc}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 block text-[11px]">{isEn ? "Ended At" : "تاريخ ووقت الإنهاء"}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {inspectDetailsHandover.endedAtUtc
                      ? new Date(inspectDetailsHandover.endedAtUtc).toLocaleString("ar-SA")
                      : (isEn ? "Currently Active" : "نشط ومستمر حالياً")}
                  </span>
                  {inspectDetailsHandover.endedAtUtc && (
                    <span className="block font-mono text-[10px] text-gray-400 mt-0.5">
                      {inspectDetailsHandover.endedAtUtc}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-gray-400 block text-[11px]">{isEn ? "Commission Starts On" : "بدء العمولة اليومية (15 ر.س/يوم)"}</span>
                  <span className="font-semibold text-purple-700 dark:text-purple-400">
                    {inspectDetailsHandover.commissionStartsOn}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 block text-[11px]">{isEn ? "Commission Cutoff" : "العمولة مرحلة حتى"}</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {inspectDetailsHandover.commissionPostedThrough || (isEn ? "None" : "لم يتم الترحيل بعد")}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 block text-[11px]">{isEn ? "Last Settlement" : "تاريخ آخر سداد تسوية"}</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {inspectDetailsHandover.lastSettlementPaymentAtUtc
                      ? new Date(inspectDetailsHandover.lastSettlementPaymentAtUtc).toLocaleDateString("ar-SA")
                      : "-"}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 block text-[11px]">{isEn ? "Flags & Attributes" : "السمات والخصائص"}</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    {inspectDetailsHandover.isLegacy ? (
                      <Badge tone="orange">Legacy (سابق)</Badge>
                    ) : (
                      <Badge tone="gray">تسليم قياسي</Badge>
                    )}
                    {inspectDetailsHandover.debtTransferred && (
                      <Badge tone="blue">دين مرحل</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="secondary"
                onClick={() => {
                  const target = inspectDetailsHandover;
                  setInspectDetailsHandover(null);
                  handleOpenBalance(target);
                }}
                className="text-xs text-blue-700 border-blue-200 hover:bg-blue-50 flex items-center gap-1.5"
              >
                <Eye className="h-4 w-4" />
                {isEn ? "View Financial Balance" : "كشف الرصيد المالي"}
              </Button>

              <div className="flex items-center gap-2">
                {!inspectDetailsHandover.endedAtUtc && can("jahez.handovers.delete") && (
                  <Button
                    variant="danger"
                    onClick={() => {
                      const target = inspectDetailsHandover;
                      setInspectDetailsHandover(null);
                      setClosingHandover(target);
                      setCloseEffectiveAt(new Date().toISOString().slice(0, 16));
                      setCloseReason(isEn ? "Handover termination and account clearance" : "إنهاء تشغيل الحساب واستلام العهدة");
                    }}
                    className="text-xs flex items-center gap-1.5"
                  >
                    <XCircle className="h-4 w-4" />
                    {isEn ? "Close Handover" : "إنهاء الاستخدام"}
                  </Button>
                )}

                <Button
                  variant="secondary"
                  onClick={() => setInspectDetailsHandover(null)}
                >
                  {isEn ? "Close" : "إغلاق"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
