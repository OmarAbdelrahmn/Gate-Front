"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getPlatformAccounts,
  createPlatformAccount,
  updatePlatformAccount,
  assignPlatformAccount,
  releasePlatformAccount,
  getAccountAssignmentHistory,
  getAccountCredentialHistory,
  rotateAccountCredential,
  getPlatforms,
  type AccountResponse,
  type AccountUpsertRequest,
  type AssignRequest,
  type ReleaseRequest,
  type AssignmentResponse,
  type CredentialHistoryResponse,
  type PlatformResponse,
  type AccountStatus,
} from "@/lib/platforms/api";
import { listEmployees, listOperatingCities, listRiders, type OperatingCity } from "@/lib/workforce/api";
import type { Employee, Rider } from "@/lib/workforce/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import {
  Server,
  Plus,
  Search,
  Edit2,
  RefreshCw,
  UserPlus,
  UserMinus,
  KeyRound,
  History,
  AlertTriangle,
  ExternalLink,
  Lock,
  UserCheck,
} from "lucide-react";

export default function PlatformAccountsPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);

  // Data states
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [platforms, setPlatforms] = useState<PlatformResponse[]>([]);
  const [cities, setCities] = useState<OperatingCity[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);

  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [filterPlatformId, setFilterPlatformId] = useState("");
  const [filterCityId, setFilterCityId] = useState("");
  const [filterPaymentModel, setFilterPaymentModel] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOwnerId, setFilterOwnerId] = useState("");
  const [currentOnly, setCurrentOnly] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [search, setSearch] = useState("");

  // Modals
  const [isUpsertOpen, setIsUpsertOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountResponse | null>(null);

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assigningAccount, setAssigningAccount] = useState<AccountResponse | null>(null);

  const [isReleaseOpen, setIsReleaseOpen] = useState(false);
  const [releasingAccount, setReleasingAccount] = useState<AccountResponse | null>(null);

  const [isAssignmentHistoryOpen, setIsAssignmentHistoryOpen] = useState(false);
  const [historyAccount, setHistoryAccount] = useState<AccountResponse | null>(null);
  const [assignmentHistoryList, setAssignmentHistoryList] = useState<AssignmentResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [isCredentialOpen, setIsCredentialOpen] = useState(false);
  const [credentialAccount, setCredentialAccount] = useState<AccountResponse | null>(null);
  const [credentialHistoryList, setCredentialHistoryList] = useState<CredentialHistoryResponse[]>([]);
  const [credentialLoading, setCredentialLoading] = useState(false);
  const [activeCredTab, setActiveCredTab] = useState<"history" | "rotate">("history");

  // Form States
  const [accountFormData, setAccountFormData] = useState<AccountUpsertRequest>({
    platformId: "",
    operatingCityId: "",
    ownerRiderProfileId: "",
    code: "",
    externalAccountId: "",
    userName: "",
    paymentModel: "PayPerOrder",
    status: "Available",
    acquisitionDate: new Date().toISOString().split("T")[0],
    startDate: new Date().toISOString().split("T")[0],
    endDate: null,
    notes: "",
    archiveReason: null,
    rowVersion: null,
  });

  const [assignFormData, setAssignFormData] = useState<AssignRequest>({
    actualRiderProfileId: "",
    effectiveFrom: new Date().toISOString().split("T")[0],
    paymentModel: "PayPerOrder",
    reason: "",
    wasBackdated: false,
    backdatedReason: "",
  });

  const [releaseFormData, setReleaseFormData] = useState({
    effectiveTo: new Date().toISOString().split("T")[0],
    status: "Ended",
    reason: "",
  });

  const [rotateFormData, setRotateFormData] = useState({
    secret: "",
    reason: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [accRes, platRes, cityRes, empRes, riderRes] = await Promise.allSettled([
        getPlatformAccounts({
          platformId: filterPlatformId || undefined,
          operatingCityId: filterCityId || undefined,
          paymentModel: (filterPaymentModel as any) || undefined,
          status: filterStatus || undefined,
          ownerRiderProfileId: filterOwnerId || undefined,
          currentOnly,
          includeArchived,
        }),
        getPlatforms(true),
        listOperatingCities(),
        listEmployees(),
        listRiders(),
      ]);

      if (accRes.status === "fulfilled") {
        console.log("=== All Platform Accounts Returned ===", accRes.value);
        setAccounts(accRes.value);
      } else {
        console.error("=== Platform Accounts API Error ===", accRes.reason);
      }

      if (platRes.status === "fulfilled") {
        console.log("=== All Platforms Returned ===", platRes.value);
        setPlatforms(platRes.value);
      }
      if (cityRes.status === "fulfilled") setCities(cityRes.value);
      if (empRes.status === "fulfilled") setEmployees(empRes.value);
      if (riderRes.status === "fulfilled") setRiders(riderRes.value);
    } catch (err: any) {
      console.error("Failed to load account data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (can("platform_accounts.read")) {
      loadData();
    }
  }, [filterPlatformId, filterCityId, filterPaymentModel, filterStatus, filterOwnerId, currentOnly, includeArchived]);

  if (!can("platform_accounts.read")) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800">{t("common.error")}</h2>
        <p className="text-slate-500">عفواً، لا تملك صلاحية الوصول لحسابات المنصات.</p>
      </div>
    );
  }

  // Options mapping
  const platformOptions = platforms.map((p) => ({
    value: p.id,
    label: `${p.nameAr} (${p.code})`,
  }));

  const cityOptions = cities.map((c) => ({
    value: c.id,
    label: c.globalCityAr || c.code,
  }));

  const employeeOptions = employees.map((e) => ({
    value: e.riderProfileId || e.id,
    label: `${e.fullNameAr} - ${e.iqamaNo || e.primaryPhone || e.employeeNumber || ""}`,
  }));

  // Filter employees / riders for assignment: MUST send riderProfileId (not employeeId)
  const assignableEmployeeOptions = useMemo(() => {
    const riderActiveMap = new Map<string, { total: number; salary: number }>();

    accounts.forEach((acc) => {
      if (acc.status === "Assigned" && acc.currentAssignment) {
        const rId = acc.currentAssignment.actualRiderProfileId;
        const eId = acc.currentAssignment.actualEmployeeId;
        const isSalary = acc.paymentModel === "Salary" || acc.currentAssignment.paymentModel === "Salary";

        const trackRider = (id: string | null | undefined) => {
          if (!id) return;
          const curr = riderActiveMap.get(id) || { total: 0, salary: 0 };
          riderActiveMap.set(id, {
            total: curr.total + 1,
            salary: curr.salary + (isSalary ? 1 : 0),
          });
        };

        trackRider(rId);
        if (eId && eId !== rId) {
          trackRider(eId);
        }
      }
    });

    const targetIsSalary = assigningAccount?.paymentModel === "Salary";

    // Map employeeId -> riderProfileId from listRiders()
    const empToRiderProfileMap = new Map<string, string>();
    riders.forEach((r) => {
      if (r.employeeId && r.id) {
        empToRiderProfileMap.set(r.employeeId, r.id);
      }
    });

    const options: { value: string; label: string }[] = [];
    const usedRiderProfileIds = new Set<string>();

    // 1. Process Employees with valid riderProfileId
    employees.forEach((e) => {
      const rId = e.riderProfileId || e.rider?.id || empToRiderProfileMap.get(e.id);
      if (!rId) return; // Skip employees without a rider profile ID

      usedRiderProfileIds.add(rId);

      const infoR = riderActiveMap.get(rId);
      const infoE = e.id ? riderActiveMap.get(e.id) : undefined;
      const totalActive = Math.max(infoR?.total || 0, infoE?.total || 0);
      const salaryActive = Math.max(infoR?.salary || 0, infoE?.salary || 0);

      if (totalActive >= 2) return;
      if (targetIsSalary && salaryActive >= 1) return;

      let activeTag = "";
      if (totalActive > 0) {
        activeTag = locale === "en"
          ? ` (${totalActive} active account)`
          : ` (لديـه ${totalActive} حساب نشط)`;
      }

      options.push({
        value: rId, // Guaranteed riderProfileId
        label: `${e.fullNameAr} - ${e.iqamaNo || e.primaryPhone || e.employeeNumber || ""}${activeTag}`,
      });
    });

    // 2. Process Riders from listRiders() not in employees list
    riders.forEach((r) => {
      if (!r.id || usedRiderProfileIds.has(r.id)) return;

      const info = riderActiveMap.get(r.id);
      const totalActive = info?.total || 0;
      const salaryActive = info?.salary || 0;

      if (totalActive >= 2) return;
      if (targetIsSalary && salaryActive >= 1) return;

      let activeTag = "";
      if (totalActive > 0) {
        activeTag = locale === "en"
          ? ` (${totalActive} active account)`
          : ` (لديـه ${totalActive} حساب نشط)`;
      }

      options.push({
        value: r.id, // Guaranteed riderProfileId
        label: `${r.fullNameAr} - ${r.iqamaNo || ""}${activeTag}`,
      });
    });

    return options;
  }, [employees, riders, accounts, assigningAccount, locale]);

  const filteredAccounts = accounts.filter((acc) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      acc.code?.toLowerCase().includes(term) ||
      acc.externalAccountId?.toLowerCase().includes(term) ||
      acc.userName?.toLowerCase().includes(term) ||
      acc.ownerRiderNameAr?.toLowerCase().includes(term) ||
      acc.platformNameAr?.toLowerCase().includes(term)
    );
  });

  // Modal Open Handlers
  const handleOpenAdd = () => {
    setEditingAccount(null);
    const initialPlatId = platforms[0]?.id || "";
    const selectedPlat = platforms.find((p) => p.id === initialPlatId);
    const defaultPaymentModel = selectedPlat?.supportedPaymentModels?.[0] || "PayPerOrder";
    setAccountFormData({
      platformId: initialPlatId,
      operatingCityId: cities[0]?.id || "",
      ownerRiderProfileId: "",
      code: "",
      externalAccountId: "",
      userName: "",
      paymentModel: defaultPaymentModel as any,
      status: "Available",
      acquisitionDate: new Date().toISOString().split("T")[0],
      startDate: new Date().toISOString().split("T")[0],
      notes: "",
      archiveReason: null,
      rowVersion: null,
    });
    setIsUpsertOpen(true);
  };

  const handleOpenEdit = (acc: AccountResponse) => {
    setEditingAccount(acc);
    setAccountFormData({
      platformId: acc.platformId,
      operatingCityId: acc.operatingCityId,
      ownerRiderProfileId: acc.ownerRiderProfileId,
      code: acc.code,
      externalAccountId: acc.externalAccountId || "",
      userName: acc.userName || "",
      paymentModel: acc.paymentModel || "PayPerOrder",
      status: acc.status as AccountStatus,
      acquisitionDate: acc.acquisitionDate || "",
      startDate: acc.startDate || "",
      endDate: acc.endDate || null,
      notes: acc.notes || "",
      archiveReason: null,
      rowVersion: acc.rowVersion,
    });
    setIsUpsertOpen(true);
  };

  const handleOpenAssign = (acc: AccountResponse) => {
    setAssigningAccount(acc);
    setAssignFormData({
      actualRiderProfileId: "",
      effectiveFrom: new Date().toISOString().split("T")[0],
      paymentModel: acc.paymentModel || "PayPerOrder",
      reason: "",
      wasBackdated: false,
      backdatedReason: "",
    });
    setIsAssignOpen(true);
  };

  const handleOpenRelease = (acc: AccountResponse) => {
    setReleasingAccount(acc);
    setReleaseFormData({
      effectiveTo: new Date().toISOString().split("T")[0],
      status: "Ended",
      reason: "",
    });
    setIsReleaseOpen(true);
  };

  const handleSubmitRelease = (e: React.FormEvent) => {
    e.preventDefault();
    if (!releasingAccount || !releasingAccount.currentAssignment) {
      toast.error("خطأ", "لا يوجد تعيين نشط لإنهائه.");
      return;
    }

    if (!releaseFormData.reason || !releaseFormData.reason.trim()) {
      toast.error("خطأ", "سبب إنهاء التعيين مطلوب ولا يمكن أن يكون فارغاً.");
      return;
    }

    if (!releaseFormData.effectiveTo) {
      toast.error("خطأ", "تاريخ إنهاء التعيين مطلوب.");
      return;
    }

    const assignmentEffectiveFrom = releasingAccount.currentAssignment.effectiveFrom;
    if (assignmentEffectiveFrom && new Date(releaseFormData.effectiveTo) < new Date(assignmentEffectiveFrom.split("T")[0])) {
      toast.error("خطأ", `تاريخ نهاية التعيين (${releaseFormData.effectiveTo}) لا يمكن أن يكون قبل تاريخ بدء التعيين (${assignmentEffectiveFrom.split("T")[0]}).`);
      return;
    }

    startTransition(async () => {
      try {
        const payload: ReleaseRequest = {
          effectiveTo: releaseFormData.effectiveTo,
          status: releaseFormData.status || "Ended",
          reason: releaseFormData.reason.trim(),
          rowVersion: releasingAccount.currentAssignment!.rowVersion, // Send assignment rowVersion!
        };

        console.log("=== Sending Release Platform Account Payload ===");
        console.log("Account ID:", releasingAccount.id);
        console.log("Target Endpoint:", `/api/platform-accounts/${releasingAccount.id}/release`);
        console.log("JSON Body:", JSON.stringify(payload, null, 2));

        await releasePlatformAccount(releasingAccount.id, payload);
        setIsReleaseOpen(false);
        loadData();
      } catch (err: any) {
        console.error("Release error:", err);
        toast.error("فشل إنهاء التعيين", err?.message || "تعذر إنهاء التعيين للحساب.");
      }
    });
  };

  const handleOpenAssignmentHistory = async (acc: AccountResponse) => {
    setHistoryAccount(acc);
    setIsAssignmentHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await getAccountAssignmentHistory(acc.id);
      setAssignmentHistoryList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenCredentialModal = async (acc: AccountResponse) => {
    setCredentialAccount(acc);
    setIsCredentialOpen(true);
    setActiveCredTab(can("platform_credentials.read") ? "history" : "rotate");
    if (can("platform_credentials.read")) {
      setCredentialLoading(true);
      try {
        const data = await getAccountCredentialHistory(acc.id);
        setCredentialHistoryList(data);
      } catch (err) {
        console.error(err);
      } finally {
        setCredentialLoading(false);
      }
    }
  };

  // Submit Handlers
  const handleSubmitAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountFormData.platformId || !accountFormData.operatingCityId || !accountFormData.ownerRiderProfileId || !accountFormData.code || !accountFormData.paymentModel) {
      toast.error("خطأ في المدخلات", "يرجى تعبئة المنصة، المدينة، صاحب الحساب، نموذج الدفع، ورمز الحساب.");
      return;
    }

    startTransition(async () => {
      try {
        if (editingAccount) {
          await updatePlatformAccount(editingAccount.id, {
            ...accountFormData,
            rowVersion: editingAccount.rowVersion,
          });
        } else {
          await createPlatformAccount(accountFormData);
        }
        setIsUpsertOpen(false);
        loadData();
      } catch (err: any) {
        console.error("Account upsert error:", err);
        toast.error("فشل الحفظ", err?.message || "تعذر حفظ حساب المنصة.");
      }
    });
  };

  const handleSubmitAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningAccount) return;
    if (!assignFormData.actualRiderProfileId || !assignFormData.effectiveFrom) {
      toast.error("خطأ", "يرجى اختيار المندوب الفعلي وتاريخ البداية.");
      return;
    }
    if (assignFormData.wasBackdated && !assignFormData.backdatedReason?.trim()) {
      toast.error("خطأ", "عند استخدام تاريخ بأثر رجي، يلزم تعبئة سبب الأثر الرجي.");
      return;
    }

    const selRiderId = assignFormData.actualRiderProfileId;
    const riderActiveAccounts = accounts.filter(
      (a) => a.status === "Assigned" && (a.currentAssignment?.actualRiderProfileId === selRiderId || a.currentAssignment?.actualEmployeeId === selRiderId)
    );
    if (riderActiveAccounts.length >= 2) {
      toast.error("تنبيه القيود", "المندوب لديه حسابان نشطان بالفعل. (platform.rider_account_limit_reached)");
      return;
    }
    const targetIsSalary = assigningAccount.paymentModel === "Salary";
    const salaryActive = riderActiveAccounts.filter(
      (a) => a.paymentModel === "Salary" || a.currentAssignment?.paymentModel === "Salary"
    ).length;
    if (targetIsSalary && salaryActive >= 1) {
      toast.error("تنبيه القيود", "المندوب لديه حساب راتب نشط بالفعل. لا يُسمح بأكثر من حساب براتب واحد (platform.rider_salary_account_limit_reached)");
      return;
    }

    startTransition(async () => {
      try {
        const payload: AssignRequest = {
          actualRiderProfileId: assignFormData.actualRiderProfileId,
          effectiveFrom: assignFormData.effectiveFrom,
          ...(assignFormData.reason?.trim() ? { reason: assignFormData.reason.trim() } : {}),
          ...(assignFormData.wasBackdated
            ? { wasBackdated: true, backdatedReason: assignFormData.backdatedReason?.trim() }
            : {}),
        };
        console.log("=== Sending Assign Platform Account Payload ===");
        console.log("Account ID:", assigningAccount.id);
        console.log("Target Endpoint:", `/api/platform-accounts/${assigningAccount.id}/assign`);
        console.log("JSON Body:", JSON.stringify(payload, null, 2));

        await assignPlatformAccount(assigningAccount.id, payload);
        setIsAssignOpen(false);
        loadData();
      } catch (err: any) {
        console.error("Assign error:", err);
        toast.error("فشل التعيين", err?.message || "تعذر تعيين المندوب للحساب. يرجى مراجعة المدخلات.");
      }
    });
  };

  const handleSubmitRotateCredential = (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialAccount) return;
    if (!rotateFormData.secret) {
      toast.error("خطأ", "يرجى كِتابة السر/كلمة المرور الجديدة.");
      return;
    }

    startTransition(async () => {
      try {
        await rotateAccountCredential(credentialAccount.id, rotateFormData);
        setRotateFormData({ secret: "", reason: "" });
        // Refresh credential history
        if (can("platform_credentials.read")) {
          const data = await getAccountCredentialHistory(credentialAccount.id);
          setCredentialHistoryList(data);
        }
        setActiveCredTab("history");
      } catch (err) { }
    });
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Available":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
            متاح
          </Badge>
        );
      case "Assigned":
        return (
          <Badge className="bg-blue-50 text-[#1167c9] border-blue-200">
            معيّن
          </Badge>
        );
      case "Suspended":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200">
            موقوف
          </Badge>
        );
      case "Retired":
        return (
          <Badge className="bg-[#f28b35]/10 text-[#f28b35] border-[#f28b35]/30">
            مستبعد
          </Badge>
        );
      case "Archived":
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-300">
            مؤرشف
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Server className="h-7 w-7 text-[#1167c9]" />
            {t("platforms.platformAccounts")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            إدارة وتتبع حسابات المنصات، أصحاب الحسابات، التعيينات الفعلية، وبيانات الاعتماد
          </p>
        </div>

        {can("platform_accounts.manage") && (
          <Button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-[#1167c9] hover:bg-[#0e56a8]"
          >
            <Plus className="h-4 w-4" />
            {t("platforms.newAccount")}
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">المنصة</label>
            <SearchableSelect
              options={[{ value: "", label: "جميع المنصات" }, ...platformOptions]}
              value={filterPlatformId}
              onChange={setFilterPlatformId}
              placeholder="تصفية حسب المنصة..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">المدينة</label>
            <SearchableSelect
              options={[{ value: "", label: "جميع المدن" }, ...cityOptions]}
              value={filterCityId}
              onChange={setFilterCityId}
              placeholder="تصفية حسب المدينة..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">{t("platforms.paymentModel")}</label>
            <SearchableSelect
              options={[
                { value: "", label: "جميع النماذج" },
                { value: "PayPerOrder", label: t("platforms.payPerOrder") },
                { value: "Salary", label: t("platforms.salary") },
              ]}
              value={filterPaymentModel}
              onChange={setFilterPaymentModel}
              placeholder="تصفية حسب نموذج الدفع..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">حالة الحساب</label>
            <SearchableSelect
              options={[
                { value: "", label: "جميع الحالات" },
                { value: "Available", label: "متاح (Available)" },
                { value: "Assigned", label: "معيّن (Assigned)" },
                { value: "Suspended", label: "موقوف (Suspended)" },
                { value: "Retired", label: "مستبعد (Retired)" },
                { value: "Archived", label: "مؤرشف (Archived)" },
              ]}
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="تصفية حسب الحالة..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">صاحب الحساب</label>
            <SearchableSelect
              options={[{ value: "", label: "جميع أصحاب الحسابات" }, ...employeeOptions]}
              value={filterOwnerId}
              onChange={setFilterOwnerId}
              placeholder="تصفية حسب صاحب الحساب..."
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("platforms.searchPlaceholder")}
              className="pr-10"
            />
          </div>

          <div className="flex items-center gap-4 text-sm font-medium text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentOnly}
                onChange={(e) => setCurrentOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#1167c9]"
              />
              التعيينات الحالية فقط
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#1167c9]"
              />
              تضمين المؤرشفة
            </label>

            <Button variant="secondary" onClick={loadData} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-4 p-6">
            <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Server className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-semibold">لا توجد حسابات منصات مطابقة لخيارات البحث</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50/80 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4">{t("platforms.accountCode")}</th>
                  <th className="px-6 py-4">المنصة والمدينة</th>
                  <th className="px-6 py-4">{t("platforms.paymentModel")}</th>
                  <th className="px-6 py-4">{t("platforms.ownerRider")}</th>
                  <th className="px-6 py-4">{t("platforms.actualRider")} (التعيين الحالى)</th>
                  <th className="px-6 py-4">{t("platforms.status")}</th>
                  <th className="px-6 py-4 text-center">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/platforms/accounts/${acc.id}`}
                          className="font-mono font-bold text-[#1167c9] hover:underline flex items-center gap-1"
                        >
                          {acc.code}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        Ext: {acc.externalAccountId || "—"} | User: {acc.userName || "—"}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">
                        {acc.platformNameAr || acc.platformCode}
                      </div>
                      <div className="text-xs text-slate-500">
                        {acc.operatingCityNameAr || "—"}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Badge
                        className={
                          acc.paymentModel === "Salary"
                            ? "bg-purple-50 text-purple-700 border-purple-200 font-semibold"
                            : "bg-blue-50 text-blue-700 border-blue-200 font-semibold"
                        }
                      >
                        {acc.paymentModel === "PayPerOrder"
                          ? t("platforms.payPerOrder")
                          : acc.paymentModel === "Salary"
                            ? t("platforms.salary")
                            : acc.paymentModel || "—"}
                      </Badge>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">
                        {acc.ownerRiderNameAr || "—"}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {acc.currentAssignment ? (
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                            {acc.currentAssignment.actualRiderNameAr || "مندوب معين"}
                          </div>
                          <div className="text-xs text-slate-400">
                            منذ: {acc.currentAssignment.effectiveFrom}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">لا يوجد تعيين حالي</span>
                      )}
                    </td>

                    <td className="px-6 py-4">{renderStatusBadge(acc.status)}</td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Assign Button */}
                        {can("platform_assignments.manage") && acc.status === "Available" && (
                          <button
                            onClick={() => handleOpenAssign(acc)}
                            title={t("platforms.assignRider")}
                            className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
                          >
                            <UserPlus className="h-4 w-4" />
                          </button>
                        )}

                        {/* Release Button */}
                        {can("platform_assignments.manage") && acc.status === "Assigned" && (
                          <button
                            onClick={() => handleOpenRelease(acc)}
                            title={t("platforms.releaseRider")}
                            className="rounded-lg p-2 text-amber-600 hover:bg-amber-50"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        )}

                        {/* Credential Rotation Button */}
                        {(can("platform_credentials.read") || can("platform_credentials.rotate")) && (
                          <button
                            onClick={() => handleOpenCredentialModal(acc)}
                            title={t("platforms.rotateCredentials")}
                            className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                        )}

                        {/* Assignment History Button */}
                        {can("platform_assignments.read") && (
                          <button
                            onClick={() => handleOpenAssignmentHistory(acc)}
                            title={t("platforms.assignmentHistory")}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                          >
                            <History className="h-4 w-4" />
                          </button>
                        )}

                        {/* Edit Button */}
                        {can("platform_accounts.manage") && (
                          <button
                            onClick={() => handleOpenEdit(acc)}
                            title={t("common.edit")}
                            className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-[#1167c9]"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upsert Modal (Create/Edit Account) */}
      <Modal
        isOpen={isUpsertOpen}
        onClose={() => setIsUpsertOpen(false)}
        title={editingAccount ? t("platforms.editAccount") : t("platforms.newAccount")}
      >
        <form onSubmit={handleSubmitAccount} className="space-y-4 pt-2">
          {editingAccount && editingAccount.status === "Assigned" && (
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-600" />
              الحساب مخصص حالياً لمندوب. لا يمكن تغيير المنصة أو المالك أو المدينة أثـناء التعيين.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                المنصة <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={platformOptions}
                value={accountFormData.platformId}
                onChange={(val) => {
                  const selectedPlatObj = platforms.find((p) => p.id === val);
                  const supportedModels = selectedPlatObj?.supportedPaymentModels?.length
                    ? selectedPlatObj.supportedPaymentModels
                    : ["PayPerOrder", "Salary"];
                  const newModel = supportedModels.includes(accountFormData.paymentModel as any)
                    ? accountFormData.paymentModel
                    : (supportedModels[0] || "PayPerOrder");
                  setAccountFormData({ ...accountFormData, platformId: val, paymentModel: newModel as any });
                }}
                placeholder="اختر المنصة..."
                disabled={Boolean(editingAccount && editingAccount.status === "Assigned")}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                مدينة التشغيل <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={cityOptions}
                value={accountFormData.operatingCityId}
                onChange={(val) => setAccountFormData({ ...accountFormData, operatingCityId: val })}
                placeholder="اختر المدينة..."
                disabled={Boolean(editingAccount && editingAccount.status === "Assigned")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                {t("platforms.paymentModel")} <span className="text-red-500">*</span>
              </label>
              {(() => {
                const currentPlatObj = platforms.find((p) => p.id === accountFormData.platformId);
                const supportedModels = currentPlatObj?.supportedPaymentModels?.length
                  ? currentPlatObj.supportedPaymentModels
                  : ["PayPerOrder", "Salary"];
                const modelOpts = supportedModels.map((m) => ({
                  value: m,
                  label: m === "PayPerOrder" ? t("platforms.payPerOrder") : m === "Salary" ? t("platforms.salary") : m,
                }));
                return (
                  <SearchableSelect
                    options={modelOpts}
                    value={accountFormData.paymentModel}
                    onChange={(val) => setAccountFormData({ ...accountFormData, paymentModel: val as any })}
                    placeholder="اختر نموذج الدفع..."
                  />
                );
              })()}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                صاحب الحساب <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={employeeOptions}
                value={accountFormData.ownerRiderProfileId}
                onChange={(val) => setAccountFormData({ ...accountFormData, ownerRiderProfileId: val })}
                placeholder="اختر صاحب الحساب..."
                disabled={Boolean(editingAccount && editingAccount.status === "Assigned")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                {t("platforms.accountCode")} <span className="text-red-500">*</span>
              </label>
              <Input
                value={accountFormData.code}
                onChange={(e) => setAccountFormData({ ...accountFormData, code: e.target.value })}
                placeholder="KEETA-1001"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                {t("platforms.externalAccountId")}
              </label>
              <Input
                value={accountFormData.externalAccountId || ""}
                onChange={(e) => setAccountFormData({ ...accountFormData, externalAccountId: e.target.value })}
                placeholder="KT-98421"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                {t("platforms.userName")}
              </label>
              <Input
                value={accountFormData.userName || ""}
                onChange={(e) => setAccountFormData({ ...accountFormData, userName: e.target.value })}
                placeholder="rider.account"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                {t("platforms.status")} <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={
                  editingAccount
                    ? [
                      { value: "Available", label: "متاح (Available)" },
                      { value: "Assigned", label: "معيّن (Assigned)" },
                      { value: "Suspended", label: "موقوف (Suspended)" },
                      { value: "Retired", label: "مستبعد (Retired)" },
                      { value: "Archived", label: "مؤرشف (Archived)" },
                    ]
                    : [
                      { value: "Available", label: "متاح (Available)" },
                      { value: "Suspended", label: "موقوف (Suspended)" },
                      { value: "Retired", label: "مستبعد (Retired)" },
                    ]
                }
                value={accountFormData.status}
                onChange={(val) => setAccountFormData({ ...accountFormData, status: val as AccountStatus })}
                placeholder="اختر الحالة..."
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                {t("platforms.acquisitionDate")}
              </label>
              <Input
                type="date"
                value={accountFormData.acquisitionDate || ""}
                onChange={(e) => setAccountFormData({ ...accountFormData, acquisitionDate: e.target.value })}
              />
            </div>
          </div>

          {accountFormData.status === "Archived" && (
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                {t("platforms.archiveReason")} <span className="text-red-500">*</span>
              </label>
              <Input
                value={accountFormData.archiveReason || ""}
                onChange={(e) => setAccountFormData({ ...accountFormData, archiveReason: e.target.value })}
                placeholder="سبب أرشفة هذا الحساب..."
                required
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              {t("platforms.notes")}
            </label>
            <textarea
              value={accountFormData.notes || ""}
              onChange={(e) => setAccountFormData({ ...accountFormData, notes: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-[#1167c9] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsUpsertOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#1167c9] hover:bg-[#0e56a8]">
              {isPending ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Rider Dialog (Endpoint 8) */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title={t("platforms.assignRider")}
      >
        <form onSubmit={handleSubmitAssign} className="space-y-4 pt-2">
          <div className="rounded-xl bg-blue-50/80 p-3.5 border border-blue-200/60 text-xs text-[#1167c9] space-y-2">
            <div className="flex items-center justify-between font-bold">
              <span>تخصيص حساب المنصة ({assigningAccount?.code}) لمندوب فعلي.</span>
              {assigningAccount?.paymentModel && (
                <Badge
                  className={
                    assigningAccount.paymentModel === "Salary"
                      ? "bg-purple-100 text-purple-700 border-purple-300 font-semibold"
                      : "bg-blue-100 text-blue-700 border-blue-300 font-semibold"
                  }
                >
                  {t("platforms.paymentModel")}:{" "}
                  {assigningAccount.paymentModel === "PayPerOrder"
                    ? t("platforms.payPerOrder")
                    : assigningAccount.paymentModel === "Salary"
                      ? t("platforms.salary")
                      : assigningAccount.paymentModel}
                </Badge>
              )}
            </div>

            {assigningAccount?.paymentModel === "Salary" && (
              <div className="text-[11px] text-purple-800 bg-purple-50/90 p-2 rounded-lg border border-purple-200">
                ⚠️ تنبيه: هذا الحساب يعمل بنمط الدفع (راتب). يحظر النظام تعيين المندوب لأكثر من حساب براتب في نفس الوقت.
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              {t("platforms.actualRider")} <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={assignableEmployeeOptions}
              value={assignFormData.actualRiderProfileId}
              onChange={(val) => setAssignFormData({ ...assignFormData, actualRiderProfileId: val })}
              placeholder="اختر المندوب الفعلي..."
            />

            {(() => {
              if (!assignFormData.actualRiderProfileId) return null;
              const selRiderId = assignFormData.actualRiderProfileId;
              const riderActiveAccounts = accounts.filter(
                (a) => a.status === "Assigned" && (a.currentAssignment?.actualRiderProfileId === selRiderId || a.currentAssignment?.actualEmployeeId === selRiderId)
              );
              const totalActive = riderActiveAccounts.length;
              const salaryActive = riderActiveAccounts.filter(
                (a) => a.paymentModel === "Salary" || a.currentAssignment?.paymentModel === "Salary"
              ).length;

              const targetIsSalary = assigningAccount?.paymentModel === "Salary";
              const isLimitReached = totalActive >= 2;
              const isSalaryLimitReached = targetIsSalary && salaryActive >= 1;

              if (isLimitReached) {
                return (
                  <div className="mt-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-800 border border-red-200">
                    🛑 <strong>تنبيه:</strong> المندوب المختار يملك حالياً حسابين نشطين ({totalActive}/2). يتسبب هذا في خطأ النظام (<code>platform.rider_account_limit_reached</code>).
                  </div>
                );
              }

              if (isSalaryLimitReached) {
                return (
                  <div className="mt-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200">
                    ⚠️ <strong>تنبيه:</strong> المندوب المختار يملك بالفعل حساب براتب نشط ({salaryActive}/1). يتسبب هذا في خطأ النظام (<code>platform.rider_salary_account_limit_reached</code>).
                  </div>
                );
              }

              return (
                <div className="mt-2 rounded-xl bg-emerald-50 p-2 text-xs text-emerald-800 border border-emerald-200">
                  ✓ المندوب متاح للتعيين (الحسابات النشطة الحالية: {totalActive}/2 | حسابات الراتب: {salaryActive}/1)
                </div>
              );
            })()}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              {t("platforms.effectiveFrom")} <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={assignFormData.effectiveFrom}
              onChange={(e) => setAssignFormData({ ...assignFormData, effectiveFrom: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              {t("platforms.reason")}
            </label>
            <Input
              value={assignFormData.reason || ""}
              onChange={(e) => setAssignFormData({ ...assignFormData, reason: e.target.value })}
              placeholder="سبب التعيين..."
            />
          </div>

          <div className="rounded-xl border border-slate-200 p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={assignFormData.wasBackdated}
                onChange={(e) => setAssignFormData({ ...assignFormData, wasBackdated: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-[#1167c9]"
              />
              {t("platforms.wasBackdated")}
            </label>

            {assignFormData.wasBackdated && (
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {t("platforms.backdatedReason")} <span className="text-red-500">*</span>
                </label>
                <Input
                  value={assignFormData.backdatedReason || ""}
                  onChange={(e) => setAssignFormData({ ...assignFormData, backdatedReason: e.target.value })}
                  placeholder="اكتب سبب التعيين بأثر رجي..."
                  required
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsAssignOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {isPending ? t("common.loading") : t("platforms.assignRider")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Release Rider Dialog (Endpoint 9) */}
      <Modal
        isOpen={isReleaseOpen}
        onClose={() => setIsReleaseOpen(false)}
        title={t("platforms.releaseRider")}
      >
        <form onSubmit={handleSubmitRelease} className="space-y-4 pt-2">
          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            إنهاء تعيين المندوب الحالي ({releasingAccount?.currentAssignment?.actualRiderNameAr || "مندوب"}) للحساب ({releasingAccount?.code}).
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              {t("platforms.effectiveTo")} <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={releaseFormData.effectiveTo}
              onChange={(e) => setReleaseFormData({ ...releaseFormData, effectiveTo: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              {t("platforms.status")} <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={[
                { value: "Ended", label: "منتهي (Ended)" },
                { value: "Cancelled", label: "ملغى (Cancelled)" },
              ]}
              value={releaseFormData.status}
              onChange={(val) => setReleaseFormData({ ...releaseFormData, status: val })}
              placeholder="اختر الحالة النهائي للتعيين..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              {t("platforms.reason")} <span className="text-red-500">*</span>
            </label>
            <Input
              value={releaseFormData.reason}
              onChange={(e) => setReleaseFormData({ ...releaseFormData, reason: e.target.value })}
              placeholder="سبب الإنهاء (مطلوب)..."
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsReleaseOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending} className="bg-amber-600 text-white hover:bg-amber-700">
              {isPending ? t("common.loading") : t("platforms.releaseRider")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assignment History Dialog (Endpoint 10) */}
      <Modal
        isOpen={isAssignmentHistoryOpen}
        onClose={() => setIsAssignmentHistoryOpen(false)}
        title={`${t("platforms.assignmentHistory")} - ${historyAccount?.code || ""}`}
      >
        <div className="space-y-4 pt-2">
          {historyLoading ? (
            <div className="space-y-3">
              <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ) : assignmentHistoryList.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <History className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p>لا يوجد سجل تعيينات سابق لهذا الحساب</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
              {assignmentHistoryList.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-900">{item.actualRiderNameAr || "مندوب فعلي"}</span>
                    <div className="flex items-center gap-2">
                      {item.paymentModel && (
                        <Badge className={item.paymentModel === "Salary" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                          {item.paymentModel === "PayPerOrder" ? t("platforms.payPerOrder") : item.paymentModel === "Salary" ? t("platforms.salary") : item.paymentModel}
                        </Badge>
                      )}
                      <Badge className={item.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-slate-500">
                    الفترة: {item.effectiveFrom} — {item.effectiveTo || "حتى الآن"}
                  </div>
                  {item.startReason && <div className="text-slate-600">سبب البداية: {item.startReason}</div>}
                  {item.endReason && <div className="text-slate-600">سبب النهاية: {item.endReason}</div>}
                  {item.wasBackdated && (
                    <div className="text-amber-700 bg-amber-50 rounded p-1">
                      أثر رجي: {item.backdatedReason || "نعم"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsAssignmentHistoryOpen(false)}>
              {t("common.close")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Credential Rotation & History Dialog (Endpoints 11 & 12) */}
      <Modal
        isOpen={isCredentialOpen}
        onClose={() => setIsCredentialOpen(false)}
        title={`بيانات الاعتماد - ${credentialAccount?.code || ""}`}
      >
        <div className="space-y-4 pt-2">
          {/* Tabs header */}
          <div className="flex border-b border-slate-200">
            {can("platform_credentials.read") && (
              <button
                onClick={() => setActiveCredTab("history")}
                className={`py-2 px-4 text-xs font-bold border-b-2 ${activeCredTab === "history" ? "border-[#1167c9] text-[#1167c9]" : "border-transparent text-slate-500"}`}
              >
                {t("platforms.credentialHistory")}
              </button>
            )}
            {can("platform_credentials.rotate") && (
              <button
                onClick={() => setActiveCredTab("rotate")}
                className={`py-2 px-4 text-xs font-bold border-b-2 ${activeCredTab === "rotate" ? "border-[#1167c9] text-[#1167c9]" : "border-transparent text-slate-500"}`}
              >
                {t("platforms.rotateCredentials")}
              </button>
            )}
          </div>

          {activeCredTab === "history" && can("platform_credentials.read") && (
            <div>
              {credentialLoading ? (
                <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
              ) : credentialHistoryList.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <KeyRound className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  <p>لا يوجد سجل تدوير سابق لهذه البيانات</p>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {credentialHistoryList.map((c) => (
                    <div key={c.id} className="rounded-xl border border-slate-200 p-3 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-900">إصدار رقم #{c.version}</div>
                        <div className="text-slate-500">{new Date(c.rotatedAtUtc).toLocaleString("ar-SA")}</div>
                        {c.reason && <div className="text-slate-600 mt-1">السبب: {c.reason}</div>}
                      </div>
                      <Badge className="bg-indigo-50 text-indigo-700">تدوير معتمد</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeCredTab === "rotate" && can("platform_credentials.rotate") && (
            <form onSubmit={handleSubmitRotateCredential} className="space-y-4">
              <div className="rounded-xl bg-indigo-50 p-3 text-xs text-indigo-800">
                ملاحظة: يتم تشفير البيانات المشفرة ولا يتم إرجاع أسرار البيانات في الرد أبداً.
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {t("platforms.secret")} <span className="text-red-500">*</span>
                </label>
                <Input
                  type="password"
                  value={rotateFormData.secret}
                  onChange={(e) => setRotateFormData({ ...rotateFormData, secret: e.target.value })}
                  placeholder="كلمة المرور أو الـ API Key الجديد..."
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  {t("platforms.reason")}
                </label>
                <Input
                  value={rotateFormData.reason}
                  onChange={(e) => setRotateFormData({ ...rotateFormData, reason: e.target.value })}
                  placeholder="سبب تدوير المفتاح/كلمة المرور..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="submit" disabled={isPending} className="bg-indigo-600 text-white hover:bg-indigo-700">
                  {isPending ? t("common.loading") : t("platforms.rotateCredentials")}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
