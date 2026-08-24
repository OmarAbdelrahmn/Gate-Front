"use client";

import { useEffect, useState, useTransition } from "react";
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
  type AssignmentResponse,
  type CredentialHistoryResponse,
  type PlatformResponse,
  type AccountStatus,
} from "@/lib/platforms/api";
import { listEmployees, listOperatingCities, type OperatingCity } from "@/lib/workforce/api";
import type { Employee } from "@/lib/workforce/types";
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

  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [filterPlatformId, setFilterPlatformId] = useState("");
  const [filterCityId, setFilterCityId] = useState("");
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
    status: "Available",
    acquisitionDate: new Date().toISOString().split("T")[0],
    startDate: new Date().toISOString().split("T")[0],
    endDate: null,
    notes: "",
    archiveReason: null,
    rowVersion: null,
  });

  const [assignFormData, setAssignFormData] = useState({
    actualRiderProfileId: "",
    effectiveFrom: new Date().toISOString().split("T")[0],
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
      const [accRes, platRes, cityRes, empRes] = await Promise.allSettled([
        getPlatformAccounts({
          platformId: filterPlatformId || undefined,
          operatingCityId: filterCityId || undefined,
          status: filterStatus || undefined,
          ownerRiderProfileId: filterOwnerId || undefined,
          currentOnly,
          includeArchived,
        }),
        getPlatforms(true),
        listOperatingCities(),
        listEmployees(),
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
  }, [filterPlatformId, filterCityId, filterStatus, filterOwnerId, currentOnly, includeArchived]);

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
    setAccountFormData({
      platformId: platforms[0]?.id || "",
      operatingCityId: cities[0]?.id || "",
      ownerRiderProfileId: "",
      code: "",
      externalAccountId: "",
      userName: "",
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
    if (!accountFormData.platformId || !accountFormData.operatingCityId || !accountFormData.ownerRiderProfileId || !accountFormData.code) {
      toast.error("خطأ في المدخلات", "يرجى تعبئة المنصة، المدينة، صاحب الحساب، ورمز الحساب.");
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
      } catch (err) {}
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

    startTransition(async () => {
      try {
        await assignPlatformAccount(assigningAccount.id, assignFormData);
        setIsAssignOpen(false);
        loadData();
      } catch (err) {}
    });
  };

  const handleSubmitRelease = (e: React.FormEvent) => {
    e.preventDefault();
    if (!releasingAccount || !releasingAccount.currentAssignment) {
      toast.error("خطأ", "لا يوجد تعيين نشط لإنهائه.");
      return;
    }

    startTransition(async () => {
      try {
        await releasePlatformAccount(releasingAccount.id, {
          effectiveTo: releaseFormData.effectiveTo,
          status: releaseFormData.status,
          reason: releaseFormData.reason,
          rowVersion: releasingAccount.currentAssignment!.rowVersion, // Send assignment rowVersion!
        });
        setIsReleaseOpen(false);
        loadData();
      } catch (err) {}
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
      } catch (err) {}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                onChange={(val) => setAccountFormData({ ...accountFormData, platformId: val })}
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
          <div className="rounded-xl bg-blue-50 p-3 text-xs text-[#1167c9]">
            تخصيص حساب المنصة ({assigningAccount?.code}) لمندوب فعلي.
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              {t("platforms.actualRider")} <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={employeeOptions}
              value={assignFormData.actualRiderProfileId}
              onChange={(val) => setAssignFormData({ ...assignFormData, actualRiderProfileId: val })}
              placeholder="اختر المندوب الفعلي..."
            />
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
              value={assignFormData.reason}
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
                  value={assignFormData.backdatedReason}
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
              {t("platforms.reason")}
            </label>
            <Input
              value={releaseFormData.reason}
              onChange={(e) => setReleaseFormData({ ...releaseFormData, reason: e.target.value })}
              placeholder="سبب الإنهاء..."
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
                    <Badge className={item.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                      {item.status}
                    </Badge>
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
