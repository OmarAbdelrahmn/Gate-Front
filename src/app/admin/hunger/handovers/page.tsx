// src/app/admin/hunger/handovers/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getHungerPlatform,
  getAllHungerAccounts,
  getAllHungerFinanceExceptions,
  createHungerFinanceException,
  approveHungerFinanceException,
  rejectHungerFinanceException,
  generateHungerIdempotencyKey,
  getHungerErrorMessage,
  type HungerAccountItem,
  type HungerExceptionItem,
} from "@/lib/hunger/api";
import { listEmployees } from "@/lib/workforce/api";
import type { Employee } from "@/lib/workforce/types";
import {
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Flame,
  Info,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";

export default function HungerHandoversPage() {
  const { user, can } = useAuth();

  const canRead =
    can("hunger.finance.read") ||
    can("hunger.read") ||
    can("hunger.finance.manage");
  const canExceptionRequest =
    can("hunger.finance.exception.request") || can("hunger.finance.manage");
  const canExceptionApprove =
    can("hunger.finance.exception.approve") || can("hunger.finance.manage");

  const [platformId, setPlatformId] = useState<string>("");
  const [accounts, setAccounts] = useState<HungerAccountItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Exceptions list
  const [exceptions, setExceptions] = useState<HungerExceptionItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState("");
  const [supervisorFilter, setSupervisorFilter] = useState("");

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedSupervisorId, setSelectedSupervisorId] = useState("");
  const [amountSign, setAmountSign] = useState<"+" | "-">("-");
  const [amountMagnitude, setAmountMagnitude] = useState("");
  const [reason, setReason] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Decision Modal (Approve / Reject)
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionTarget, setDecisionTarget] =
    useState<HungerExceptionItem | null>(null);
  const [decisionMode, setDecisionMode] = useState<"approve" | "reject">(
    "approve",
  );
  const [decisionNote, setDecisionNote] = useState("");
  const [deciding, setDeciding] = useState(false);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<HungerExceptionItem | null>(null);

  // Load Platform and lookups
  useEffect(() => {
    void (async () => {
      try {
        const [plat, accs, emps] = await Promise.allSettled([
          getHungerPlatform(),
          getAllHungerAccounts(),
          listEmployees(),
        ]);
        if (plat.status === "fulfilled" && plat.value?.id) {
          setPlatformId(plat.value.id);
        }
        if (accs.status === "fulfilled" && Array.isArray(accs.value)) {
          setAccounts(accs.value);
        }
        if (emps.status === "fulfilled" && Array.isArray(emps.value)) {
          setEmployees(emps.value);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Load NonZeroHandover exceptions
  const loadExceptions = useCallback(async () => {
    if (!platformId || !canRead) return;
    setLoading(true);
    try {
      const items = await getAllHungerFinanceExceptions({
        platformId,
      });
      // Filter for NonZeroHandover only
      const handoverOnly = items.filter(
        (ex) => ex.kind === "NonZeroHandover" || !ex.kind,
      );
      setExceptions(handoverOnly);
    } catch (err) {
      toast.error(
        getHungerErrorMessage(err, "تعذر تحميل استثناءات تسليم المحافظ"),
      );
    } finally {
      setLoading(false);
    }
  }, [platformId, canRead]);

  useEffect(() => {
    if (platformId) {
      const timer = setTimeout(() => {
        void loadExceptions();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [platformId, loadExceptions]);

  // Lookup maps
  const accountLookup = useMemo(() => {
    const map = new Map<string, HungerAccountItem>();
    for (const a of accounts) {
      if (a.accountId) map.set(a.accountId.toLowerCase(), a);
      if (a.id) map.set(a.id.toLowerCase(), a);
      if (a.externalAccountId) map.set(a.externalAccountId.toLowerCase(), a);
    }
    return map;
  }, [accounts]);

  const employeeLookup = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const e of employees) {
      if (e.id) map.set(e.id.toLowerCase(), e);
    }
    return map;
  }, [employees]);

  // Options for Account Select
  const accountOptions = useMemo(
    () => [
      { value: "", label: "جميع الحسابات" },
      ...accounts.map((a) => {
        const bal =
          a.lastWalletBalance !== null && a.lastWalletBalance !== undefined
            ? `${Number(a.lastWalletBalance).toFixed(2)} SAR`
            : "غير معروف";
        return {
          value: a.accountId || a.id || "",
          label: `${a.externalAccountId || a.accountCode || a.accountName || "حساب"} — ${a.ownerNameAr || "بدون مالك"} (الرصيد: ${bal})`,
          sublabel: a.assignedRiderNameAr
            ? `المندوب المكلف: ${a.assignedRiderNameAr}`
            : "شاغر / بدون مندوب",
        };
      }),
    ],
    [accounts],
  );

  // Options for Supervisor Select
  const supervisorOptions = useMemo(
    () => [
      { value: "", label: "جميع المشرفين" },
      ...employees.map((e) => ({
        value: e.id,
        label: `${e.fullNameAr}${e.iqamaNo ? ` — هوية: ${e.iqamaNo}` : ""}`,
      })),
    ],
    [employees],
  );

  // Prefill balance when account is selected in create modal
  const handleSelectAccountForCreate = (accId: string) => {
    setSelectedAccountId(accId);
    if (!accId) return;
    const acc = accountLookup.get(accId.toLowerCase());
    if (
      acc?.lastWalletBalance !== null &&
      acc?.lastWalletBalance !== undefined
    ) {
      const b = Number(acc.lastWalletBalance);
      if (b < 0) {
        setAmountSign("-");
        setAmountMagnitude(Math.abs(b).toFixed(2));
      } else if (b > 0) {
        setAmountSign("+");
        setAmountMagnitude(b.toFixed(2));
      }
    }
  };

  // Submit Create Exception
  const handleCreateException = async () => {
    if (!platformId) {
      toast.warning("لم يتم تحميل معرف منصة هنقرستيشن بعد");
      return;
    }
    if (!selectedAccountId) {
      toast.warning("يرجى اختيار الحساب المطلوب استثناء تسليمه");
      return;
    }
    const mag = Math.abs(parseFloat(amountMagnitude.replace(/,/g, "")) || 0);
    if (mag === 0) {
      toast.warning("يجب أن يكون مبلغ الاستثناء غير صفري");
      return;
    }
    if (!reason.trim()) {
      toast.warning("يرجى إدخال سبب طلب الاستثناء");
      return;
    }

    const signedAmount = amountSign === "-" ? -mag : mag;
    setSubmitting(true);
    try {
      const idempotencyKey = generateHungerIdempotencyKey(
        `non-zero-handover-${selectedAccountId}`,
      );
      await createHungerFinanceException({
        platformId,
        kind: "NonZeroHandover",
        accountId: selectedAccountId,
        supervisorEmployeeId: selectedSupervisorId || undefined,
        amount: signedAmount,
        reason: reason.trim(),
        evidenceReference: evidenceReference.trim() || undefined,
        idempotencyKey,
      });

      toast.success(
        "تم إرسال طلب استثناء NonZeroHandover بنجاح — بانتظار الاعتماد",
      );
      setCreateModalOpen(false);
      setSelectedAccountId("");
      setSelectedSupervisorId("");
      setAmountMagnitude("");
      setReason("");
      setEvidenceReference("");
      await loadExceptions();
    } catch (err) {
      toast.error(
        getHungerErrorMessage(err, "تعذر إنشاء طلب استثناء التسليم"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Decision (Approve / Reject)
  const handleSubmitDecision = async () => {
    if (!decisionTarget) return;
    if (decisionMode === "reject" && !decisionNote.trim()) {
      toast.warning("يرجى تدوين سبب الرفض");
      return;
    }

    setDeciding(true);
    try {
      const exceptionId = decisionTarget.exceptionId || decisionTarget.id || "";
      if (decisionMode === "approve") {
        await approveHungerFinanceException(exceptionId, {
          note: decisionNote.trim() || undefined,
        });
        toast.success("تم اعتماد استثناء التسليم بنجاح");
      } else {
        await rejectHungerFinanceException(exceptionId, {
          note: decisionNote.trim(),
        });
        toast.success("تم رفض طلب الاستثناء");
      }
      setDecisionModalOpen(false);
      setDecisionTarget(null);
      setDecisionNote("");
      await loadExceptions();
    } catch (err) {
      toast.error(
        getHungerErrorMessage(err, "تعذر حفظ قرار الاستثناء"),
      );
    } finally {
      setDeciding(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let consumed = 0;
    let rejected = 0;
    for (const ex of exceptions) {
      const st = ex.status;
      if (st === "Requested" || st === "Pending") pending++;
      else if (st === "Approved") approved++;
      else if (st === "Consumed") consumed++;
      else if (st === "Rejected") rejected++;
    }
    return {
      total: exceptions.length,
      pending,
      approved,
      consumed,
      rejected,
    };
  }, [exceptions]);

  // Filtered exceptions list
  const filteredExceptions = useMemo(() => {
    return exceptions.filter((ex) => {
      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "Pending") {
          if (ex.status !== "Pending" && ex.status !== "Requested") return false;
        } else if (ex.status !== statusFilter) {
          return false;
        }
      }

      // Account filter
      if (accountFilter && ex.accountId !== accountFilter) {
        return false;
      }

      // Supervisor filter
      if (
        supervisorFilter &&
        ex.supervisorEmployeeId !== supervisorFilter
      ) {
        return false;
      }

      // Live search
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const acc = ex.accountId ? accountLookup.get(ex.accountId.toLowerCase()) : null;
        const sup = ex.supervisorEmployeeId
          ? employeeLookup.get(ex.supervisorEmployeeId.toLowerCase())
          : null;
        const text = `${ex.exceptionId} ${ex.reason || ""} ${ex.decisionNote || ""} ${acc?.externalAccountId || ""} ${acc?.accountCode || ""} ${acc?.ownerNameAr || ""} ${sup?.fullNameAr || ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [
    exceptions,
    statusFilter,
    accountFilter,
    supervisorFilter,
    searchQuery,
    accountLookup,
    employeeLookup,
  ]);

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success("تم نسخ رمز الاعتماد بنجاح");
  };

  if (!canRead) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          ليس لديك الصلاحية الكافية لعرض استثناءات تسليم هنقرستيشن.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <Link
              href="/admin/hunger/accounts"
              className="hover:text-[var(--foreground)]"
            >
              إدارة هنقرستيشن
            </Link>
            <span>/</span>
            <span className="font-semibold text-[var(--foreground)]">
              استثناءات التسليم (NonZeroHandover)
            </span>
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-black text-[var(--foreground)] sm:text-2xl">
            <ArrowLeftRight className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            استثناءات تسليم المحافظ (NonZeroHandover Control)
          </h1>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            إدارة طلبات استثناء تسليم حسابات هنقرستيشن ذات الرصيد غير الصفري
            والتحكم بقرارات الاعتماد وفصل الصلاحيات (Dual-Control).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadExceptions()}
            disabled={loading}
          >
            <RefreshCw
              className={`ml-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            تحديث
          </Button>

          <Link href="/admin/hunger/accounts">
            <Button variant="secondary" size="sm">
              <Flame className="ml-1.5 h-3.5 w-3.5 text-amber-600" />
              الحسابات والتسليم
            </Button>
          </Link>

          {canExceptionRequest && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSelectedAccountId("");
                setSelectedSupervisorId("");
                setAmountSign("-");
                setAmountMagnitude("");
                setReason("");
                setEvidenceReference("");
                setCreateModalOpen(true);
              }}
            >
              <Plus className="ml-1.5 h-3.5 w-3.5" />
              طلب استثناء تسليم جديد
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <span className="text-xs text-[var(--muted-foreground)]">
            إجمالي طلبات الاستثناء
          </span>
          <p className="mt-1.5 text-2xl font-black text-[var(--foreground)]">
            {stats.total}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              بانتظار الاعتماد
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-amber-700 dark:text-amber-400">
            {stats.pending}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              معتمد وجاهز للتسليم
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-emerald-700 dark:text-emerald-400">
            {stats.approved}
          </p>
        </div>
        <div className="rounded-2xl border border-blue-200/70 bg-blue-50/50 p-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
              مستهلك بالتسليم
            </span>
            <ArrowLeftRight className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-blue-700 dark:text-blue-400">
            {stats.consumed}
          </p>
        </div>
        <div className="rounded-2xl border border-rose-200/70 bg-rose-50/50 p-4 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">
              مرفوض
            </span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-1.5 text-2xl font-black text-rose-700 dark:text-rose-300">
            {stats.rejected}
          </p>
        </div>
      </div>

      {/* Policy Notice Box */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/70 p-4 text-xs font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          ضابط الحوكمة المالية (NonZeroHandover Policy): الحسابات ذات الرصيد غير
          الصفري أو المحافظ التي تحوي مديونية/مستحقات مرحلة تتطلب استثناءً ماليًا
          معتمدًا قبل تأكيد تسليم الحساب أو تبديل المندوب (Rider Swap). يطبّق
          النظام مبدأ فصل الصلاحيات (Dual-Control) حيث لا يمكن لطالب الاستثناء
          اعتماده بنفسه.
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الحساب أو المالك أو السبب..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pr-9 pl-3 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-amber-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]"
            >
              <option value="all">جميع الحالات</option>
              <option value="Pending">بانتظار الاعتماد (Pending)</option>
              <option value="Approved">معتمد وجاهز للتسليم (Approved)</option>
              <option value="Consumed">مستهلك بالتسليم (Consumed)</option>
              <option value="Rejected">مرفوض (Rejected)</option>
            </select>
          </div>

          <div>
            <SearchableSelect
              options={accountOptions}
              value={accountFilter}
              onChange={setAccountFilter}
              placeholder="تصفية بالحساب..."
            />
          </div>

          <div>
            <SearchableSelect
              options={supervisorOptions}
              value={supervisorFilter}
              onChange={setSupervisorFilter}
              placeholder="تصفية بالمشرف..."
            />
          </div>
        </div>
      </div>

      {/* Exceptions Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--foreground)]">
              سجل استثناءات التسليم (NonZeroHandover Approvals)
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              المعروض: {filteredExceptions.length} من أصل {exceptions.length} طلب
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="border-b-2 border-slate-200 bg-slate-100/95 text-[11px] font-black text-slate-900 dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-100">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">تاريخ الطلب</th>
                <th className="px-4 py-3.5 whitespace-nowrap">الحساب المعني</th>
                <th className="px-4 py-3.5 whitespace-nowrap">المبلغ المرحّل</th>
                <th className="px-4 py-3.5 whitespace-nowrap">المشرف المسؤول</th>
                <th className="px-4 py-3.5 whitespace-nowrap">سبب الاستثناء</th>
                <th className="px-4 py-3.5 whitespace-nowrap">الحالة</th>
                <th className="px-4 py-3.5 whitespace-nowrap">القرار والمسار</th>
                <th className="px-4 py-3.5 whitespace-nowrap">رمز الاستثناء (Approval ID)</th>
                <th className="px-4 py-3.5 text-right whitespace-nowrap">الإجراءات والتحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-12 text-center text-sm text-[var(--muted-foreground)]"
                  >
                    جارٍ تحميل طلبات الاستثناء...
                  </td>
                </tr>
              ) : filteredExceptions.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-12 text-center text-sm text-[var(--muted-foreground)]"
                  >
                    لا توجد استثناءات تسليم مطابقة للبحث أو الفلاتر المحددة.
                  </td>
                </tr>
              ) : (
                filteredExceptions.map((ex) => {
                  const acc = ex.accountId
                    ? accountLookup.get(ex.accountId.toLowerCase())
                    : null;
                  const sup = ex.supervisorEmployeeId
                    ? employeeLookup.get(
                        ex.supervisorEmployeeId.toLowerCase(),
                      )
                    : null;
                  const isSelfRequested =
                    Boolean(user?.id) && ex.requestedByUserId === user?.id;
                  const isPending =
                    ex.status === "Pending" || ex.status === "Requested";
                  const isApproved = ex.status === "Approved";
                  const isConsumed = ex.status === "Consumed";
                  const isRejected = ex.status === "Rejected";

                  const amountNum = Number(ex.amount || 0);

                  return (
                    <tr
                      key={ex.exceptionId || ex.id}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3.5 font-mono text-[11px] whitespace-nowrap">
                        {ex.requestedAtUtc?.slice(0, 10) || "—"}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-[var(--foreground)]">
                          {acc?.externalAccountId ||
                            acc?.accountCode ||
                            (ex.accountId
                              ? `حساب #${ex.accountId.slice(0, 8)}`
                              : "غير محدد")}
                        </div>
                        {acc?.ownerNameAr && (
                          <div className="text-[11px] text-[var(--muted-foreground)]">
                            المالك: {acc.ownerNameAr}
                          </div>
                        )}
                        {acc?.assignedRiderNameAr && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400">
                            المندوب: {acc.assignedRiderNameAr}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`font-mono font-black ${
                            amountNum < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                          dir="ltr"
                        >
                          {amountNum > 0 ? `+${amountNum.toFixed(2)}` : amountNum.toFixed(2)} SAR
                        </span>
                        <div className="text-[10px] text-[var(--muted-foreground)]">
                          {amountNum < 0 ? "مديونية محفظة" : "رصيد دائن"}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-[var(--foreground)]">
                          {sup?.fullNameAr ||
                            (ex.supervisorEmployeeId
                              ? `مشرف #${ex.supervisorEmployeeId.slice(0, 8)}`
                              : "—")}
                        </div>
                        {sup?.iqamaNo && (
                          <div className="text-[11px] text-slate-400">
                            {sup.iqamaNo}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 max-w-[240px]">
                        <p className="line-clamp-2 text-xs text-[var(--foreground)]">
                          {ex.reason}
                        </p>
                        {ex.note && ex.note !== ex.reason && (
                          <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                            {ex.note}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isPending && (
                          <Badge tone="orange">
                            <Clock className="ml-1 h-3 w-3 inline" />
                            بانتظار الاعتماد
                          </Badge>
                        )}
                        {isApproved && (
                          <Badge tone="green">
                            <CheckCircle2 className="ml-1 h-3 w-3 inline" />
                            معتمد للتسليم
                          </Badge>
                        )}
                        {isConsumed && (
                          <Badge tone="blue">
                            <ArrowLeftRight className="ml-1 h-3 w-3 inline" />
                            مستهلك بالتسليم
                          </Badge>
                        )}
                        {isRejected && (
                          <Badge tone="red">
                            <XCircle className="ml-1 h-3 w-3 inline" />
                            مرفوض
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-[11px]">
                        {ex.decidedAtUtc ? (
                          <div>
                            <div className="text-[var(--muted-foreground)]">
                              {ex.decidedAtUtc.slice(0, 10)}
                            </div>
                            {ex.decisionNote && (
                              <div className="text-[var(--foreground)] font-medium">
                                &quot;{ex.decisionNote}&quot;
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {ex.exceptionId.slice(0, 8)}...
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(ex.exceptionId)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                            title="نسخ المعرف بالكامل"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && canExceptionApprove && (
                            <>
                              {isSelfRequested ? (
                                <span className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                  فصل الصلاحيات (بانتظار معتمد آخر)
                                </span>
                              ) : (
                                <>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => {
                                      setDecisionTarget(ex);
                                      setDecisionMode("approve");
                                      setDecisionNote("");
                                      setDecisionModalOpen(true);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    <CheckCircle2 className="ml-1 h-3.5 w-3.5" />
                                    اعتماد
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                      setDecisionTarget(ex);
                                      setDecisionMode("reject");
                                      setDecisionNote("");
                                      setDecisionModalOpen(true);
                                    }}
                                    className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  >
                                    <XCircle className="ml-1 h-3.5 w-3.5" />
                                    رفض
                                  </Button>
                                </>
                              )}
                            </>
                          )}

                          {isApproved && ex.accountId && (
                            <Link
                              href={`/admin/hunger/accounts?account=${ex.accountId}`}
                              className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50/70 px-2.5 py-1 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                              title="الانتقال لصفحة الحساب لتنفيذ التسليم"
                            >
                              <span>تسليم الحساب</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setDetailItem(ex);
                              setDetailModalOpen(true);
                            }}
                            title="عرض كافة التفاصيل"
                          >
                            تفاصيل
                          </Button>
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

      {/* CREATE EXCEPTION MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="طلب استثناء تسليم محفظة برصيد غير صفري (NonZeroHandover)"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              <div>
                <strong>الهدف من الاستثناء:</strong> يسمح بتسليم حساب هنقرستيشن
                أو تبديل المندوب المستلم مع الاحتفاظ برصيد المحفظة الحالي
                (سواء كان مديونية مرحلة أو رصيد دائن). يتطلب الاستثناء موافقة
                إدارية ثنائية (Dual-Control).
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-bold text-[var(--foreground)]">
              اختيار الحساب المطلوب تسليمه *
            </label>
            <SearchableSelect
              options={accountOptions.filter((a) => Boolean(a.value))}
              value={selectedAccountId}
              onChange={handleSelectAccountForCreate}
              placeholder="ابحث برقم حساب هنقرستيشن أو اسم المالك..."
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-bold text-[var(--foreground)]">
                طبيعة الرصيد المرحّل *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAmountSign("-")}
                  className={`rounded-xl border py-2 text-center text-xs font-bold transition-all ${
                    amountSign === "-"
                      ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200 shadow-xs"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-slate-50"
                  }`}
                >
                  مديونية مرحلة (-)
                </button>
                <button
                  type="button"
                  onClick={() => setAmountSign("+")}
                  className={`rounded-xl border py-2 text-center text-xs font-bold transition-all ${
                    amountSign === "+"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200 shadow-xs"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:bg-slate-50"
                  }`}
                >
                  رصيد دائن مستحق (+)
                </button>
              </div>
            </div>

            <div>
              <Input
                label="مبلغ الرصيد غير الصفري (بالريال) *"
                type="number"
                step="0.01"
                value={amountMagnitude}
                onChange={(e) => setAmountMagnitude(e.target.value)}
                placeholder="مثال: 350.00"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-bold text-[var(--foreground)]">
              المشرف الملتزم / المسؤول المالي (اختياري)
            </label>
            <SearchableSelect
              options={supervisorOptions.filter((s) => Boolean(s.value))}
              value={selectedSupervisorId}
              onChange={setSelectedSupervisorId}
              placeholder="اختيار المشرف..."
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="font-bold text-[var(--foreground)]">
                سبب طلب الاستثناء المالي *
              </label>
              <span className="text-[10px] text-[var(--muted-foreground)]">
                نماذج أسباب سريعة:
              </span>
            </div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {[
                "تبديل المندوب مع ترحيل رصيد المحفظة",
                "تسليم الحساب للمندوب بمديونية تشغيلية معتمدة",
                "تسليم مؤقت بانتظار توريد الإيصالات البنكية",
                "تصفية مستحقات المندوب السابق بتعهد المشرف",
              ].map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setReason(pill)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] text-[var(--muted-foreground)] transition-colors hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                >
                  {pill}
                </button>
              ))}
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اكتب التبرير الفني والمالي لتسليم الحساب بالرصيد غير الصفري..."
              rows={3}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs text-[var(--foreground)] focus:border-amber-500 focus:outline-none"
            />
          </div>

          <Input
            label="مرجع المستند / تعميم الاستثناء (اختياري)"
            value={evidenceReference}
            onChange={(e) => setEvidenceReference(e.target.value)}
            placeholder="رقم التعميم أو رابط الملف المرجعي إن وجد..."
          />

          <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
            <Button
              variant="secondary"
              onClick={() => setCreateModalOpen(false)}
              disabled={submitting}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleCreateException()}
              disabled={submitting}
            >
              {submitting ? "جارٍ الإرسال..." : "إرسال طلب الاستثناء"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* DECISION MODAL (APPROVE / REJECT) */}
      <Modal
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        title={
          decisionMode === "approve"
            ? "اعتماد استثناء التسليم (NonZeroHandover)"
            : "رفض استثناء التسليم"
        }
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs">
          {decisionTarget && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)]/40 p-3 space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">المعرف:</span>
                <span className="font-mono font-bold">
                  {decisionTarget.exceptionId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">المبلغ:</span>
                <span className="font-mono font-bold" dir="ltr">
                  {Number(decisionTarget.amount || 0).toFixed(2)} SAR
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">السبب:</span>
                <span className="font-medium text-[var(--foreground)]">
                  {decisionTarget.reason}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block font-bold text-[var(--foreground)]">
              {decisionMode === "approve"
                ? "ملاحظة الاعتماد (اختياري)"
                : "سبب الرفض (إلزامي) *"}
            </label>
            <textarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder={
                decisionMode === "approve"
                  ? "تدوين أي ملاحظات أو شروط للاعتماد..."
                  : "يرجى توضيح سبب رفض طلب الاستثناء..."
              }
              rows={3}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs text-[var(--foreground)] focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
            <Button
              variant="secondary"
              onClick={() => setDecisionModalOpen(false)}
              disabled={deciding}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleSubmitDecision()}
              disabled={deciding}
              className={
                decisionMode === "reject"
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }
            >
              {deciding
                ? "جارٍ المعالجة..."
                : decisionMode === "approve"
                  ? "تأكيد الاعتماد"
                  : "تأكيد الرفض"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="تفاصيل استثناء تسليم المحفظة (NonZeroHandover)"
        maxWidth="max-w-2xl"
      >
        {detailItem && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--border)] p-3">
                <span className="text-[var(--muted-foreground)]">رمز الاستثناء بالكامل:</span>
                <div className="mt-1 flex items-center justify-between font-mono font-bold text-xs">
                  <span>{detailItem.exceptionId}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(detailItem.exceptionId)}
                    className="text-amber-600 hover:text-amber-700"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] p-3">
                <span className="text-[var(--muted-foreground)]">المبلغ المصرح به:</span>
                <p className="mt-1 font-mono text-base font-black" dir="ltr">
                  {Number(detailItem.amount || 0).toFixed(2)} SAR
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] p-3">
                <span className="text-[var(--muted-foreground)]">الحساب المستهدف:</span>
                <p className="mt-1 font-bold">
                  {detailItem.accountId
                    ? accountLookup.get(detailItem.accountId.toLowerCase())
                        ?.externalAccountId || detailItem.accountId
                    : "غير محدد"}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] p-3">
                <span className="text-[var(--muted-foreground)]">المشرف المسؤول:</span>
                <p className="mt-1 font-bold">
                  {detailItem.supervisorEmployeeId
                    ? employeeLookup.get(
                        detailItem.supervisorEmployeeId.toLowerCase(),
                      )?.fullNameAr || detailItem.supervisorEmployeeId
                    : "—"}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] p-3 sm:col-span-2">
                <span className="text-[var(--muted-foreground)]">سبب الاستثناء:</span>
                <p className="mt-1 font-medium text-[var(--foreground)]">
                  {detailItem.reason}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] p-3">
                <span className="text-[var(--muted-foreground)]">طالب الاستثناء (المستخدم):</span>
                <p className="mt-1 font-mono text-slate-600 dark:text-slate-400">
                  {detailItem.requestedByUserId}
                </p>
                <div className="text-[10px] text-slate-400">
                  {detailItem.requestedAtUtc || "—"}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] p-3">
                <span className="text-[var(--muted-foreground)]">معتمد الاستثناء:</span>
                <p className="mt-1 font-mono text-slate-600 dark:text-slate-400">
                  {detailItem.decidedByUserId || "لم يُحسم بعد"}
                </p>
                {detailItem.decidedAtUtc && (
                  <div className="text-[10px] text-slate-400">
                    {detailItem.decidedAtUtc}
                  </div>
                )}
              </div>

              {detailItem.consumedByEventId && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 sm:col-span-2 dark:border-blue-900/50 dark:bg-blue-950/20">
                  <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    <span className="font-bold">تم استهلاك هذا الاستثناء في عملية تسليم محفظة:</span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-blue-800 dark:text-blue-300">
                    Event ID: {detailItem.consumedByEventId}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
              <Button
                variant="secondary"
                onClick={() => setDetailModalOpen(false)}
              >
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
