"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Layers,
  Server,
  ExternalLink,
  RefreshCw,
  History,
  AlertTriangle,
  UserPlus,
  CheckCircle2,
  Copy,
  Check,
  Settings2,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getRiderPlatformHistory,
  getPlatformAccounts,
  sortAssignmentsNewestFirst,
  type RiderPlatformHistoryItem,
} from "@/lib/platforms/api";
import {
  createEmployeeRiderProfile,
  updateRiderProfile,
} from "@/lib/workforce/api";
import type { Rider } from "@/lib/workforce/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { JahezRiderDebtSummaryCard } from "@/components/jahez/JahezRiderDebtSummaryCard";
import {
  getRiderPlatformCapacitySummary,
  isJahezPlatform,
  type AssignmentForCapacity,
} from "@/lib/platforms/capacity";

interface PlatformAccountDisplayItem {
  id: string;
  platformId: string;
  platformName: string;
  platformCode: string;
  accountCode: string;
  workingId: string;
  userName?: string | null;
  paymentModel?: string | null;
  status: string;
  roleType: "owner" | "assigned" | "history";
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  operatingCity?: string | null;
  sponsorName?: string | null;
  ownerName?: string | null;
}

export function EmployeePlatformAccounts({
  employeeId,
  riderProfileId: initialRiderProfileId,
  isEmployee = true,
  riderData,
  onOpenHistoryModal,
  onRiderProfileCreated,
  onRiderProfileUpdated,
}: {
  employeeId: string;
  riderProfileId: string | null;
  isEmployee?: boolean;
  riderData?: Rider | null;
  onOpenHistoryModal?: () => void;
  onRiderProfileCreated?: (newRiderProfileId: string) => void;
  onRiderProfileUpdated?: (updatedRider: Rider) => void;
}) {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);

  const [currentRiderProfileId, setCurrentRiderProfileId] = useState<string | null>(
    initialRiderProfileId
  );
  const [currentRiderData, setCurrentRiderData] = useState<Rider | null | undefined>(riderData);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [copied, setCopied] = useState(false);

  // Manage Rider Profile Modal state
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageTShirtSize, setManageTShirtSize] = useState("");
  const [manageOperationalNotes, setManageOperationalNotes] = useState("");
  const [savingRiderData, setSavingRiderData] = useState(false);

  const [items, setItems] = useState<PlatformAccountDisplayItem[]>([]);
  const [historyAssignments, setHistoryAssignments] = useState<RiderPlatformHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setCurrentRiderProfileId(initialRiderProfileId);
  }, [initialRiderProfileId]);

  useEffect(() => {
    setCurrentRiderData(riderData);
  }, [riderData]);

  const loadPlatformAccounts = async (overrideRiderId?: string) => {
    const activeRiderId = overrideRiderId || currentRiderProfileId;

    if (!can("platform_accounts.read") && !can("platform_assignments.read")) {
      setLoading(false);
      return;
    }

    if (!activeRiderId) {
      setItems([]);
      setHistoryAssignments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [historyRes, assignedAccs, ownedAccs] = await Promise.allSettled([
        getRiderPlatformHistory(activeRiderId),
        getPlatformAccounts({ actualRiderProfileId: activeRiderId }),
        getPlatformAccounts({ ownerRiderProfileId: activeRiderId }),
      ]);

      const displayMap = new Map<string, PlatformAccountDisplayItem>();

      // 1. Process active/assigned accounts
      if (assignedAccs.status === "fulfilled" && Array.isArray(assignedAccs.value)) {
        assignedAccs.value.forEach((acc) => {
          const key = `acc-${acc.id}`;
          displayMap.set(key, {
            id: acc.id,
            platformId: acc.platformId,
            platformName:
              locale === "en"
                ? acc.platformNameEn || acc.platformNameAr || acc.platformCode || ""
                : acc.platformNameAr || acc.platformNameEn || acc.platformCode || "",
            platformCode: acc.platformCode || "",
            accountCode: acc.code,
            workingId: acc.externalAccountId || acc.code,
            userName: acc.userName,
            paymentModel: acc.paymentModel || acc.currentAssignment?.paymentModel,
            status: acc.status,
            roleType: "assigned",
            operatingCity:
              locale === "en"
                ? acc.operatingCityNameEn || acc.operatingCityNameAr
                : acc.operatingCityNameAr || acc.operatingCityNameEn,
            sponsorName:
              locale === "en"
                ? acc.sponsorNameEn || acc.sponsorNameAr
                : acc.sponsorNameAr || acc.sponsorNameEn,
            ownerName:
              locale === "en"
                ? acc.ownerRiderNameEn || acc.ownerRiderNameAr
                : acc.ownerRiderNameAr || acc.ownerRiderNameEn,
            effectiveFrom: acc.currentAssignment?.effectiveFrom,
          });
        });
      }

      // 2. Process owned accounts
      if (ownedAccs.status === "fulfilled" && Array.isArray(ownedAccs.value)) {
        ownedAccs.value.forEach((acc) => {
          const key = `acc-${acc.id}`;
          if (!displayMap.has(key)) {
            displayMap.set(key, {
              id: acc.id,
              platformId: acc.platformId,
              platformName:
                locale === "en"
                  ? acc.platformNameEn || acc.platformNameAr || acc.platformCode || ""
                  : acc.platformNameAr || acc.platformNameEn || acc.platformCode || "",
              platformCode: acc.platformCode || "",
              accountCode: acc.code,
              workingId: acc.externalAccountId || acc.code,
              userName: acc.userName,
              paymentModel: acc.paymentModel,
              status: acc.status,
              roleType: "owner",
              operatingCity:
                locale === "en"
                  ? acc.operatingCityNameEn || acc.operatingCityNameAr
                  : acc.operatingCityNameAr || acc.operatingCityNameEn,
              sponsorName:
                locale === "en"
                  ? acc.sponsorNameEn || acc.sponsorNameAr
                  : acc.sponsorNameAr || acc.sponsorNameEn,
              ownerName:
                locale === "en"
                  ? acc.ownerRiderNameEn || acc.ownerRiderNameAr
                  : acc.ownerRiderNameAr || acc.ownerRiderNameEn,
            });
          }
        });
      }

      // 3. Process platform history items
      if (historyRes.status === "fulfilled" && historyRes.value?.assignments) {
        setHistoryAssignments(historyRes.value.assignments);
        historyRes.value.assignments.forEach((item: RiderPlatformHistoryItem) => {
          const key = `acc-${item.accountId}`;
          if (!displayMap.has(key)) {
            displayMap.set(key, {
              id: item.accountId,
              platformId: item.platformId,
              platformName:
                locale === "en"
                  ? item.platformNameEn || item.platformNameAr || item.platformCode || ""
                  : item.platformNameAr || item.platformNameEn || item.platformCode || "",
              platformCode: item.platformCode || "",
              accountCode: item.accountCode || "",
              workingId: item.externalAccountId || item.accountCode || "",
              paymentModel: item.paymentModel,
              status: item.status,
              roleType: item.status === "Active" ? "assigned" : "history",
              effectiveFrom: item.effectiveFrom,
              effectiveTo: item.effectiveTo,
              ownerName:
                locale === "en"
                  ? item.ownerRiderNameEn || item.ownerRiderNameAr
                  : item.ownerRiderNameAr || item.ownerRiderNameEn,
            });
          }
        });
      }

      setItems(sortAssignmentsNewestFirst(Array.from(displayMap.values())));
    } catch (err) {
      console.error("Error loading employee platform accounts", err);
      setError(
        locale === "en"
          ? "Failed to load platform accounts"
          : "تعذر تحميل حسابات المنصات للموظف",
      );
    } finally {
      setLoading(false);
    }
  };

  const capacitySummary = useMemo(() => {
    if (!historyAssignments || historyAssignments.length === 0) return null;
    const assignmentsForCap: AssignmentForCapacity[] = historyAssignments.map((h) => ({
      assignmentId: h.assignmentId,
      accountId: h.accountId,
      platformCode: h.platformCode || "",
      paymentModel: String(h.paymentModel || "PayPerOrder"),
      effectiveTo: h.effectiveTo || null,
      status: String(h.status || ""),
    }));
    return getRiderPlatformCapacitySummary(assignmentsForCap);
  }, [historyAssignments]);

  useEffect(() => {
    loadPlatformAccounts();
  }, [currentRiderProfileId, locale]);

  const handleCreateProfile = async () => {
    if (!can("employees.update")) {
      toast.error(
        locale === "en" ? "Permission Denied" : "صلاحية غير متوفرة",
        locale === "en"
          ? "You require 'employees.update' permission to open a rider profile for this employee."
          : "يلزم توفر صلاحية 'تعديل الموظفين' (employees.update) لفتح ملف المندوب."
      );
      return;
    }

    setCreatingProfile(true);
    try {
      const res = await createEmployeeRiderProfile(employeeId);
      const newId = res?.rider?.id || res?.riderProfileId || res?.id;
      if (newId) {
        setCurrentRiderProfileId(newId);
        if (res?.rider) {
          setCurrentRiderData(res.rider as Rider);
        }
        toast.success(
          locale === "en" ? "Rider Profile Created" : "تم فتح ملف المندوب بنجاح",
          locale === "en"
            ? "Rider profile opened. The employee can now own and be assigned platform accounts."
            : "تم فتح ملف المندوب بنجاح؛ ويمكن للموظف الآن امتلاك حسابات المنصات وإسنادها مع الاحتفاظ بصفته كموظف."
        );
        onRiderProfileCreated?.(newId);
        await loadPlatformAccounts(newId);
      } else {
        toast.error(
          locale === "en" ? "Failed" : "تعذر استلام المعرّف",
          locale === "en"
            ? "No rider profile ID returned by the server."
            : "لم يُرجع النظام معرّف ملف المندوب."
        );
      }
    } catch (err: unknown) {
      console.error("Error creating rider profile:", err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(
        locale === "en" ? "Failed to Open Rider Profile" : "تعذر فتح ملف المندوب",
        msg ||
          (locale === "en"
            ? "An error occurred while creating rider profile."
            : "حدث خطأ أثناء فتح ملف المندوب.")
      );
    } finally {
      setCreatingProfile(false);
    }
  };

  const handleCopyRiderId = () => {
    if (!currentRiderProfileId) return;
    navigator.clipboard.writeText(currentRiderProfileId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(
      locale === "en" ? "Copied" : "تم النسخ",
      locale === "en"
        ? "Rider profile ID copied to clipboard."
        : "تم نسخ معرّف ملف المندوب إلى الحافظة."
    );
  };

  const handleOpenManageModal = () => {
    setManageTShirtSize(currentRiderData?.tShirtSize || "");
    setManageOperationalNotes(currentRiderData?.operationalNotes || "");
    setIsManageModalOpen(true);
  };

  const handleSaveRiderProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRiderProfileId) return;

    setSavingRiderData(true);
    try {
      const res = await updateRiderProfile(currentRiderProfileId, {
        tShirtSize: manageTShirtSize || null,
        operationalNotes: manageOperationalNotes.trim() || null,
        rowVersion: currentRiderData?.rowVersion || "",
      });

      const updated = {
        ...(currentRiderData || {}),
        ...(res || {}),
        id: currentRiderProfileId,
        tShirtSize: manageTShirtSize || null,
        operationalNotes: manageOperationalNotes.trim() || null,
      } as Rider;

      setCurrentRiderData(updated);
      onRiderProfileUpdated?.(updated);

      toast.success(
        locale === "en" ? "Rider Profile Updated" : "تم حفظ التعديلات",
        locale === "en"
          ? "Rider operational profile data updated successfully."
          : "تم تحديث بيانات ملف المندوب بنجاح."
      );
      setIsManageModalOpen(false);
    } catch (err: unknown) {
      console.error("Error updating rider profile:", err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(
        locale === "en" ? "Failed to Update" : "تعذر حفظ التعديلات",
        msg ||
          (locale === "en"
            ? "An error occurred while updating profile data."
            : "حدث خطأ أثناء تحديث بيانات ملف المندوب.")
      );
    } finally {
      setSavingRiderData(false);
    }
  };

  if (!can("platform_accounts.read") && !can("platform_assignments.read")) {
    return null;
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
      case "Assigned":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0.5">
            {locale === "en" ? "Active" : "نشط"}
          </Badge>
        );
      case "Available":
        return (
          <Badge className="bg-blue-50 text-[#1167c9] border-blue-200 text-[10px] px-1.5 py-0.5">
            {locale === "en" ? "Available" : "متاح"}
          </Badge>
        );
      case "Suspended":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0.5">
            {locale === "en" ? "Suspended" : "موقوف"}
          </Badge>
        );
      case "Ended":
      case "Retired":
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-300 text-[10px] px-1.5 py-0.5">
            {locale === "en" ? "Ended" : "منتهي"}
          </Badge>
        );
      default:
        return <Badge className="text-[10px] px-1.5 py-0.5">{status}</Badge>;
    }
  };

  return (
    <Card className="p-4 space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-blue-50 text-[#1167c9] dark:bg-blue-950/60 dark:text-blue-400">
            <Server size={18} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                {locale === "en" ? "Platform Accounts & Working IDs" : "حسابات المنصات وأرقام العمل"}
              </h2>
              {!currentRiderProfileId && (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0.5">
                  {locale === "en" ? "No Rider Profile" : "لا يوجد ملف مندوب"}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              {locale === "en"
                ? "Platform accounts registered or assigned to this employee"
                : "حسابات المنصات المشترك بها أو المعينة للموظف (مثل هنجرستيشن، جاهز، إلخ)"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!currentRiderProfileId && can("employees.update") && (
            <Button
              type="button"
              onClick={handleCreateProfile}
              loading={creatingProfile}
              className="h-8 px-2.5 text-xs font-bold gap-1.5 bg-[#1167c9] hover:bg-blue-700 text-white shadow-2xs"
            >
              <UserPlus size={13} />
              <span>
                {creatingProfile
                  ? locale === "en"
                    ? "Opening Profile..."
                    : "جارٍ فتح الملف..."
                  : locale === "en"
                  ? "Open Rider Profile"
                  : "فتح ملف مندوب للمنصات"}
              </span>
            </Button>
          )}

          {currentRiderProfileId && can("employees.update") && (
            <button
              type="button"
              onClick={handleOpenManageModal}
              className="inline-flex items-center gap-1.5 rounded-md border border-purple-200 bg-purple-50/80 px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 transition-colors"
            >
              <Settings2 size={13} />
              {locale === "en" ? "Manage Profile Data" : "بيانات ملف المندوب"}
            </button>
          )}

          {can("platform_assignments.read") && currentRiderProfileId && (
            onOpenHistoryModal ? (
              <button
                type="button"
                onClick={onOpenHistoryModal}
                className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-xs font-bold text-[#1167c9] hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 transition-colors"
              >
                <History size={13} />
                {locale === "en" ? "Full Platform History" : "سجل تشغيل المنصات"}
              </button>
            ) : (
              <Link
                href={`/admin/platforms/rider-history?riderId=${currentRiderProfileId}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-xs font-bold text-[#1167c9] hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 transition-colors"
              >
                <History size={13} />
                {locale === "en" ? "Full Platform History" : "سجل تشغيل المنصات"}
              </Link>
            )
          )}

          <button
            onClick={() => loadPlatformAccounts()}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {locale === "en" ? "Refresh" : "تحديث"}
          </button>
        </div>
      </div>

      {/* Linked Rider Profile Info Card */}
      {currentRiderProfileId && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-2.5 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-600 dark:text-slate-400">
              {locale === "en" ? "Linked Rider Profile ID:" : "معرف ملف المندوب المرتبط:"}
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 select-all">
              {currentRiderProfileId}
            </span>
            <button
              type="button"
              onClick={handleCopyRiderId}
              className="text-slate-500 hover:text-[#1167c9] p-0.5 transition-colors"
              title={locale === "en" ? "Copy ID" : "نسخ المعرف"}
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
              {locale === "en" ? "Preserved as Employee" : "محتفظ بصفة الموظف"}
            </Badge>
            <Badge className="bg-blue-50 text-[#1167c9] border-blue-200 text-[10px]">
              {locale === "en" ? "Platform Ownership Enabled" : "مؤهل لامتلاك حسابات المنصات"}
            </Badge>
            {can("employees.update") && (
              <button
                type="button"
                onClick={handleOpenManageModal}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1167c9] hover:underline"
              >
                <Settings2 size={12} />
                {locale === "en" ? "Edit Data" : "تعديل البيانات"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Notice Banner when Employee has NO Rider Profile */}
      {!currentRiderProfileId && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-[#1167c9] dark:bg-blue-900/60 dark:text-blue-300">
                <UserPlus size={20} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    {locale === "en"
                      ? "Rider Profile Required for Platform Accounts"
                      : "يلزم فتح ملف تشغيلي (مندوب) لربط حسابات المنصات"}
                  </h3>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                    {locale === "en" ? "Not Open Yet" : "غير مفعل"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                  {locale === "en"
                    ? "This employee is registered as administrative staff and does not have an active rider profile. Opening a rider profile preserves employee data and keeps isEmployee: true while allowing that profile to own or be assigned platform accounts and keeping the employee out of the dedicated rider list."
                    : "هذا الحساب يخص موظفاً إدارياً وليس لديه ملف مندوب تشغيلي حالياً. فتح ملف المندوب يتيح له امتلاك حسابات المنصات (مثل جاهز، هنجرستيشن) وربطها به مع الاحتفاظ بكافة بياناته ووظيفته كموظف ودون إدراجه في قوائم المناديب العامة."}
                </p>
              </div>
            </div>
            {can("employees.update") ? (
              <Button
                onClick={handleCreateProfile}
                loading={creatingProfile}
                className="shrink-0 gap-1.5 bg-[#1167c9] hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 shadow-sm"
              >
                <UserPlus size={15} />
                <span>
                  {creatingProfile
                    ? locale === "en"
                      ? "Opening Profile..."
                      : "جارٍ فتح ملف المندوب..."
                    : locale === "en"
                    ? "Open Rider Profile"
                    : "فتح ملف مندوب للمنصات"}
                </span>
              </Button>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                {locale === "en"
                  ? "Requires employees.update permission."
                  : "يلزم توفر صلاحية تعديل الموظفين (employees.update)."}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Jahez Debt Summary Card if authorized */}
      {can("jahez.read") && currentRiderProfileId && (
        <JahezRiderDebtSummaryCard riderId={currentRiderProfileId} locale={locale} />
      )}

      {/* Capacity & Limits Breakdown Banner */}
      {capacitySummary && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-2.5 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {locale === "en" ? "Rider Account Capacity:" : "سعة حسابات المندوب:"}
            </span>
            <span className="font-bold font-mono text-[#1167c9] dark:text-blue-400">
              {locale === "en" ? capacitySummary.formattedLabelEn : capacitySummary.formattedLabelAr}
            </span>
          </div>
          {capacitySummary.salaryCount > 0 && (
            <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
              {locale === "en" ? "Salary Account (1/1)" : "حساب راتب (1/1)"}
            </Badge>
          )}
        </div>
      )}

      {/* Excess Accounts Alert */}
      {capacitySummary?.hasExcessJahez && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-bold">
              {locale === "en"
                ? "Notice: This rider holds multiple open Jahez accounts."
                : "تنبيه: المندوب لديه أكثر من حساب جاهز نشط في نفس الوقت."}
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
              {locale === "en"
                ? "All accounts remain preserved and visible. Route any correction through the normal authorized Jahez withdrawal/settlement workflow."
                : "تم الإبقاء على كافة الحسابات وعرضها بالكامل؛ ويُرجى معالجة الحساب الزائد عبر مسار التصفية والسحب المعتمد في شاشة عمليات جاهز."}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-4 text-center text-xs text-[var(--muted)]">
          {locale === "en" ? "Loading platform accounts..." : "جارٍ تحميل حسابات المنصات..."}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      ) : items.length === 0 ? (
        currentRiderProfileId ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--muted)]">
            <Layers className="mx-auto mb-1 h-6 w-6 text-slate-300" />
            <p className="font-bold">
              {locale === "en"
                ? "No platform accounts currently linked to this employee."
                : "لا توجد حسابات منصات مرتبطة بهذا الموظف حالياً."}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {locale === "en"
                ? "The rider profile is active. You can now assign or link platform accounts to this employee."
                : "ملف المندوب نشط وجاهز؛ ويمكنك الآن تخصيص أو نقل حسابات المنصات لهذا الموظف عبر شاشات المنصات."}
            </p>
          </div>
        ) : null
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <div
              key={`${item.id}-${item.platformId}`}
              className="flex flex-col justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-2xs hover:border-[#1167c9]/40 transition-all text-xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-blue-100/60 font-black text-[#1167c9] text-[10px]">
                      {item.platformCode ? item.platformCode.slice(0, 3).toUpperCase() : "PF"}
                    </span>
                    <div className="truncate">
                      <h3 className="font-black text-slate-900 dark:text-slate-100 text-xs truncate">
                        {item.platformName}
                      </h3>
                      <p className="text-[10px] font-mono text-slate-400 truncate">
                        {item.accountCode}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    {item.paymentModel && (
                      <Badge
                        className={`text-[10px] px-1.5 py-0.5 ${
                          item.paymentModel === "Salary"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {item.paymentModel === "PayPerOrder"
                          ? locale === "en"
                            ? "Pay Per Order"
                            : "بالطلب"
                          : item.paymentModel === "Salary"
                          ? locale === "en"
                            ? "Salary"
                            : "راتب"
                          : item.paymentModel}
                      </Badge>
                    )}
                    {renderStatusBadge(item.status)}
                    {capacitySummary?.hasExcessJahez &&
                      isJahezPlatform(item.platformCode) &&
                      item.roleType === "assigned" && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] px-1 py-0.5">
                          {locale === "en" ? "Excess Jahez" : "جاهز مكرر"}
                        </Badge>
                      )}
                  </div>
                </div>

                {/* Compact Working ID Banner */}
                <div className="flex items-center justify-between rounded-md bg-blue-50/60 px-2.5 py-1.5 border border-blue-100/80 dark:bg-blue-950/40 dark:border-blue-900/60">
                  <span className="text-[10px] font-bold text-[#1167c9] dark:text-blue-400">
                    {locale === "en" ? "Working ID:" : "رقم العمل / المعرف:"}
                  </span>
                  <span className="font-mono text-xs font-black text-slate-900 dark:text-slate-100">
                    {item.workingId}
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                  {item.userName && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{locale === "en" ? "User:" : "المستخدم:"}</span>
                      <span className="font-mono font-medium truncate max-w-[120px]">
                        {item.userName}
                      </span>
                    </div>
                  )}

                  {item.ownerName && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">
                        {locale === "en" ? "Owner:" : "صاحب الحساب:"}
                      </span>
                      <span className="font-medium truncate max-w-[120px]">{item.ownerName}</span>
                    </div>
                  )}

                  {item.operatingCity && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{locale === "en" ? "City:" : "المدينة:"}</span>
                      <span className="font-medium">{item.operatingCity}</span>
                    </div>
                  )}

                  {item.sponsorName && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{locale === "en" ? "Sponsor:" : "الكفيل:"}</span>
                      <span className="font-medium truncate max-w-[120px]">{item.sponsorName}</span>
                    </div>
                  )}

                  {item.effectiveFrom && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{locale === "en" ? "Assigned:" : "معين من:"}</span>
                      <span className="font-medium">{item.effectiveFrom}</span>
                    </div>
                  )}
                </div>
              </div>

              {can("platform_accounts.read") && (
                <div className="mt-2 border-t border-slate-100 dark:border-slate-800 pt-1.5 text-end">
                  <Link
                    href={`/admin/platforms/accounts/${item.id}`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1167c9] hover:underline"
                  >
                    {locale === "en" ? "View Details" : "عرض تفاصيل الحساب"}
                    <ExternalLink size={11} />
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Manage Rider Profile Modal (PUT /api/riders/{riderProfileId}) */}
      {isManageModalOpen && currentRiderProfileId && (
        <Modal
          isOpen={isManageModalOpen}
          onClose={() => setIsManageModalOpen(false)}
          title={locale === "en" ? "Manage Rider Profile Data" : "إدارة بيانات ملف المندوب"}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleSaveRiderProfile} className="space-y-4">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600 dark:text-slate-400">
                  {locale === "en" ? "Rider Profile ID:" : "معرف ملف المندوب:"}
                </span>
                <span className="font-mono font-bold text-[#1167c9] select-all">
                  {currentRiderProfileId}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {locale === "en"
                  ? "Uses PUT /api/riders/{riderProfileId} to manage operational attributes for this employee's rider profile."
                  : "تُحدّث البيانات عبر PUT /api/riders/{riderProfileId} لتعديل الخصائص التشغيلية لملف المندوب الخاص بهذا الموظف."}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {locale === "en" ? "T-Shirt Size" : "مقاس التي شيرت (T-Shirt Size)"}
              </label>
              <select
                value={manageTShirtSize}
                onChange={(e) => setManageTShirtSize(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs font-medium focus:border-[#1167c9] focus:outline-none"
              >
                <option value="">{locale === "en" ? "Unspecified" : "غير محدد"}</option>
                <option value="ExtraSmall">Extra Small (XS)</option>
                <option value="Small">Small (S)</option>
                <option value="Medium">Medium (M)</option>
                <option value="Large">Large (L)</option>
                <option value="ExtraLarge">Extra Large (XL)</option>
                <option value="DoubleExtraLarge">Double Extra Large (XXL)</option>
                <option value="TripleExtraLarge">Triple Extra Large (3XL)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {locale === "en" ? "Operational Notes" : "الملاحظات التشغيلية"}
              </label>
              <textarea
                value={manageOperationalNotes}
                onChange={(e) => setManageOperationalNotes(e.target.value)}
                placeholder={
                  locale === "en"
                    ? "Operational notes for platform assignments or vehicles..."
                    : "ملاحظات تشغيلية لتعيينات المنصات أو المركبات..."
                }
                rows={3}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs font-medium focus:border-[#1167c9] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsManageModalOpen(false)}
                disabled={savingRiderData}
                className="text-xs"
              >
                {locale === "en" ? "Cancel" : "إلغاء"}
              </Button>
              <Button
                type="submit"
                loading={savingRiderData}
                className="text-xs bg-[#1167c9] hover:bg-blue-700 text-white font-bold"
              >
                {locale === "en" ? "Save Changes" : "حفظ التعديلات"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}
