// src/app/admin/chefz/accounts/[accountId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getChefzAccount,
  updateChefzAccountDetails,
  updateChefzAccountStatus,
  updateChefzAssignmentStartDate,
  setChefzPassword,
  getChefzPassword,
  getChefzSettlements,
  getChefzPerformance,
  getRiyadhTodayDate,
} from "@/lib/chefz/api";
import type {
  ChefzAccount,
  ChefzAccountType,
  ChefzAccountStatus,
  ChefzSettlement,
  ChefzPerformance,
} from "@/lib/chefz/types";
import {
  getPlatformAccount,
  getAccountAssignmentHistory,
  getAccountCredentialHistory,
  type AccountResponse,
  type AssignmentResponse,
  type CredentialHistoryResponse,
} from "@/lib/platforms/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import {
  ArrowRight,
  Server,
  KeyRound,
  ShieldCheck,
  CreditCard,
  TrendingUp,
  History,
  User,
  Building2,
  Calendar,
  AlertTriangle,
  Eye,
  Copy,
  Check,
  Save,
  Info,
  RefreshCw,
  Plus,
  Activity,
} from "lucide-react";

function translateStatusReason(reason?: string | null): string {
  if (!reason) return "";
  const trimmed = reason.trim();
  const lower = trimmed.toLowerCase();
  if (lower.includes("block by chefz")) {
    return "حظر من منصة شيفز (Block By CHEFZ)";
  }
  if (lower.includes("supervisor")) {
    return "إيقاف من قِبل المشرف (The supervisor suspended)";
  }
  if (lower === "active") {
    return "نشط";
  }
  return trimmed;
}

export default function ChefzAccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params?.accountId as string;
  const { can } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [baseAccount, setBaseAccount] = useState<AccountResponse | null>(null);
  const [chefzDetail, setChefzDetail] = useState<ChefzAccount | null>(null);
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [credentials, setCredentials] = useState<CredentialHistoryResponse[]>([]);
  const [settlements, setSettlements] = useState<ChefzSettlement[]>([]);
  const [performance, setPerformance] = useState<ChefzPerformance[]>([]);

  const [accountType, setAccountType] = useState<"Freelancer" | "FullTime">("Freelancer");
  const [reportIdNumber, setReportIdNumber] = useState("");
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsConflict, setDetailsConflict] = useState<string | null>(null);

  // Status Modal / State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<"Active" | "Suspended" | "Retired" | "Archived">("Suspended");
  const [statusReason, setStatusReason] = useState("");
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Password Modal / State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordReason, setPasswordReason] = useState("تحديث كلمة مرور الحساب");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Edit Assignment Start Date Modal / State
  const [editingAssignment, setEditingAssignment] = useState<AssignmentResponse | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [isSavingStartDate, setIsSavingStartDate] = useState(false);
  const [startDateError, setStartDateError] = useState<string | null>(null);

  // Load account data
  const loadAccountData = async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const [base, chefz, asgns, creds] = await Promise.all([
        getPlatformAccount(accountId),
        getChefzAccount(accountId),
        getAccountAssignmentHistory(accountId).catch(() => []),
        getAccountCredentialHistory(accountId).catch(() => []),
      ]);

      setBaseAccount(base);
      setChefzDetail(chefz);
      setAssignments(asgns || []);
      setCredentials(creds || []);

      if (chefz && chefz.accountType !== "Unconfigured") {
        setAccountType(chefz.accountType as "Freelancer" | "FullTime");
        setReportIdNumber(chefz.reportIdNumber || "");
      } else {
        setAccountType("Freelancer");
        setReportIdNumber(chefz?.reportIdNumber || "");
      }

      // Load related settlements & recent performance
      if (can("chefz.read")) {
        const today = getRiyadhTodayDate();
        const startOfMonth = today.slice(0, 8) + "01";
        const [settleRes, perfRes] = await Promise.all([
          getChefzSettlements({ accountId, pageSize: 20 }).catch(() => ({ items: [] })),
          getChefzPerformance({ accountId, from: startOfMonth, to: today, pageSize: 20 }).catch(() => ({ items: [] })),
        ]);
        setSettlements(settleRes.items || []);
        setPerformance(perfRes.items || []);
      }
    } catch (err: unknown) {
      toast.error("خطأ", "تعذر تحميل تفاصيل الحساب.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccountData();
  }, [accountId]);

  // Handle Save Chefz Details
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;

    setIsSavingDetails(true);
    setDetailsConflict(null);

    try {
      const updated = await updateChefzAccountDetails(accountId, {
        accountType,
        reportIdNumber: reportIdNumber.trim() || null,
        rowVersion: chefzDetail?.accountType === "Unconfigured" ? null : chefzDetail?.rowVersion || null,
      });

      setChefzDetail(updated);
      if (updated.accountType !== "Unconfigured") {
        setAccountType(updated.accountType);
      }
      setReportIdNumber(updated.reportIdNumber || "");
    } catch (err: unknown) {
      const e = err as { status?: number; details?: { detail?: string; message?: string } };
      if (e?.status === 409) {
        const msg =
          e.details?.detail || e.details?.message || "تعارض في التحديث بالتزامن أو رقم هوية مكرر. تم تحديث البيانات، يرجى المراجعة.";
        setDetailsConflict(msg);
        const fresh = await getChefzAccount(accountId);
        if (fresh) {
          setChefzDetail(fresh);
          if (fresh.accountType !== "Unconfigured") {
            setAccountType(fresh.accountType);
          }
          setReportIdNumber(fresh.reportIdNumber || "");
        }
      }
    } finally {
      setIsSavingDetails(false);
    }
  };

  // Handle Save Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !newPassword.trim()) return;

    setIsSavingPassword(true);
    try {
      await setChefzPassword(accountId, {
        password: newPassword,
        reason: passwordReason.trim() || "تحديث كلمة المرور",
      });

      // Refetch chefz detail to update hasPassword
      const updated = await getChefzAccount(accountId);
      if (updated) setChefzDetail(updated);

      // Refetch credential history
      const creds = await getAccountCredentialHistory(accountId);
      setCredentials(creds || []);

      setIsPasswordModalOpen(false);
      setNewPassword("");
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Handle Reveal Password
  const handleRevealPassword = async () => {
    setIsRevealing(true);
    setCopied(false);
    try {
      const pass = await getChefzPassword(accountId);
      setRevealedPassword(pass);
    } catch {
      toast.error("خطأ", "تعذر كشف كلمة المرور أو لا توجد كلمة مرور محفوظة.");
    } finally {
      setIsRevealing(false);
    }
  };

  const handleCopy = () => {
    if (!revealedPassword) return;
    navigator.clipboard.writeText(revealedPassword);
    setCopied(true);
    toast.success("تم النسخ", "تم نسخ كلمة المرور إلى الحافظة.");
    setTimeout(() => setCopied(false), 2500);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "Available":
        return <Badge tone="green">متاح (Available)</Badge>;
      case "Assigned":
        return <Badge tone="blue">معيّن (Assigned)</Badge>;
      case "Suspended":
        return <Badge tone="orange">موقوف (Suspended)</Badge>;
      case "Retired":
        return <Badge tone="red">مستبعد (Retired)</Badge>;
      case "Archived":
        return <Badge tone="gray">مؤرشف (Archived)</Badge>;
      default:
        return <Badge tone="gray">{status || "—"}</Badge>;
    }
  };

  const openStatusModal = () => {
    const current = chefzDetail?.status || baseAccount?.status;
    if (current === "Suspended" || current === "Retired" || current === "Archived") {
      setStatusTarget("Active");
    } else {
      setStatusTarget("Suspended");
    }
    setStatusReason("");
    setStatusError(null);
    setIsStatusModalOpen(true);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !statusReason.trim()) return;

    setIsSavingStatus(true);
    setStatusError(null);

    try {
      const token = chefzDetail?.accountRowVersion || baseAccount?.rowVersion || "";
      await updateChefzAccountStatus(accountId, {
        status: statusTarget,
        reason: statusReason.trim(),
        rowVersion: token,
      });

      toast.success("تم تحديث الحالة", "تم تحديث حالة دورة حياة الحساب بنجاح.");
      setIsStatusModalOpen(false);
      await loadAccountData();
    } catch (err: unknown) {
      const e = err as { status?: number; details?: { detail?: string; message?: string } };
      if (e?.status === 409) {
        setStatusError(
          "تعارض في التحديث بالتزامن: تم تعديل الحساب في الخلفية أو تغيرت نسخته. تم تحديث البيانات، يرجى إعادة المحاولة."
        );
        await loadAccountData();
      } else {
        setStatusError(e?.details?.detail || e?.details?.message || "فشل تحديث حالة الحساب.");
      }
    } finally {
      setIsSavingStatus(false);
    }
  };

  const canEditAssignmentDate =
    can("chefz.accounts.update") ||
    can("platform_assignments.update") ||
    can("platform_accounts.update");

  const openEditStartDateModal = (asgn: AssignmentResponse) => {
    setEditingAssignment(asgn);
    setEditStartDate(asgn.effectiveFrom ? asgn.effectiveFrom.slice(0, 10) : "");
    setStartDateError(null);
  };

  const handleSaveStartDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment || !editStartDate.trim()) return;

    if (!editingAssignment.rowVersion) {
      setStartDateError("رمز التزامن (rowVersion) الخاص بالتكليف غير متوفر.");
      return;
    }

    setIsSavingStartDate(true);
    setStartDateError(null);

    try {
      const res = await updateChefzAssignmentStartDate(editingAssignment.id, {
        effectiveFrom: editStartDate.trim(),
        rowVersion: editingAssignment.rowVersion,
      });

      const updatedEffectiveFrom = res?.effectiveFrom || editStartDate.trim();
      const updatedRowVersion = res?.rowVersion || editingAssignment.rowVersion;

      // Update in local state immediately
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === editingAssignment.id
            ? { ...a, effectiveFrom: updatedEffectiveFrom, rowVersion: updatedRowVersion }
            : a
        )
      );

      toast.success("تم بنجاح", `تم تعديل تاريخ بدء التكليف إلى ${updatedEffectiveFrom}`);
      setEditingAssignment(null);

      // Reload account data in background to refresh base account context
      loadAccountData();
    } catch (err: unknown) {
      const e = err as {
        status?: number;
        details?: { detail?: string; message?: string; errors?: Record<string, string[]> };
        message?: string;
      };

      if (e?.status === 409) {
        setStartDateError(
          "تعارض في التحديث بالتزامن (Concurrency Conflict): تم تعديل هذا التكليف أو تغير رمز التزامن. تم تحديث سجل التكليفات تلقائياً، يرجى المحاولة مرة أخرى."
        );
        if (accountId) {
          getAccountAssignmentHistory(accountId)
            .then((fresh) => {
              if (fresh) {
                setAssignments(fresh);
                const freshItem = fresh.find((a) => a.id === editingAssignment.id);
                if (freshItem) {
                  setEditingAssignment(freshItem);
                }
              }
            })
            .catch(() => {});
        }
      } else {
        const errorDetail =
          e?.details?.detail ||
          e?.details?.message ||
          (e?.details?.errors ? Object.values(e.details.errors).flat().join(", ") : null) ||
          e?.message ||
          "فشل تعديل تاريخ بدء التكليف.";
        setStartDateError(errorDetail);
      }
    } finally {
      setIsSavingStartDate(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3" dir="rtl">
        <RefreshCw className="h-8 w-8 animate-spin text-[var(--brand)]" />
        <p className="text-sm font-semibold text-[var(--muted)]">جارٍ تحميل تفاصيل حساب شيفز...</p>
      </div>
    );
  }

  if (!baseAccount) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800" dir="rtl">
        <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-500" />
        <h2 className="text-lg font-bold">الحساب غير موجود</h2>
        <p className="mt-1 text-sm">لم يتم العثور على الحساب المطلوب في قاعدة البيانات.</p>
        <Link href="/admin/chefz/accounts" className="mt-4 inline-block">
          <Button variant="secondary">
            العودة لقائمة الحسابات
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
        <Link href="/admin/chefz/accounts" className="hover:text-[var(--foreground)]">
          حسابات شيفز
        </Link>
        <span>/</span>
        <span className="font-bold text-[var(--foreground)]">{baseAccount.code}</span>
      </div>

      {/* Top Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold text-[var(--foreground)]">
              {baseAccount.code}
            </h1>
            {getStatusBadge(chefzDetail?.status || baseAccount.status)}
            {chefzDetail?.isOperationallyBlocked && (
              <Badge tone="red">حظر تشغيلي</Badge>
            )}
            {chefzDetail && chefzDetail.accountType !== "Unconfigured" ? (
              <Badge tone="green">معد لشيفز</Badge>
            ) : (
              <Badge tone="orange">إعداد الحساب مطلوب</Badge>
            )}
            {chefzDetail && chefzDetail.accountType !== "Unconfigured" && (
              <Badge tone={chefzDetail.accountType === "Freelancer" ? "blue" : "orange"}>
                {chefzDetail.accountType === "Freelancer" ? "فريلانسر (15%)" : "دوام كامل (25 ر.س/يوم)"}
              </Badge>
            )}
            {chefzDetail && (
              <Badge tone={chefzDetail.hasPassword ? "green" : "gray"}>
                {chefzDetail.hasPassword ? "كلمة المرور محفوظة" : "بدون كلمة مرور"}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            المعرف الخارجي: <span className="font-mono" dir="ltr">{baseAccount.externalAccountId || "—"}</span> • المنصة: {baseAccount.platformNameAr || "شيفز"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {can("chefz.accounts.update") && (
            <Button
              variant="secondary"
              onClick={openStatusModal}
              className="gap-2"
            >
              <Activity className="h-4 w-4 text-[var(--brand)]" />
              تغيير حالة الحساب
            </Button>
          )}

          {can("platform_credentials.rotate") && (
            <Button
              variant="secondary"
              onClick={() => {
                setIsPasswordModalOpen(true);
                setRevealedPassword(null);
              }}
              className="gap-2"
            >
              <KeyRound className="h-4 w-4 text-amber-600" />
              إدارة كلمة المرور
            </Button>
          )}

          {can("chefz.settlements.create") && (
            chefzDetail && chefzDetail.accountType !== "Unconfigured" ? (
              <Link href={`/admin/chefz/settlements?accountId=${baseAccount.id}`}>
                <Button className="gap-2 bg-[var(--brand)] text-white hover:opacity-90">
                  <CreditCard className="h-4 w-4" />
                  تصفية جديدة للحساب
                </Button>
              </Link>
            ) : (
              <Button
                disabled
                title="يلزم ضبط إعدادات الحساب ونوع التكليف أولاً قبل إنشاء تصفية مالية"
                className="gap-2 opacity-60 cursor-not-allowed"
              >
                <CreditCard className="h-4 w-4" />
                تصفية جديدة (يتطلب إعداد الحساب)
              </Button>
            )
          )}
        </div>
      </div>

      {/* Operational Block Banner */}
      {chefzDetail?.isOperationallyBlocked && (
        <div className="rounded-2xl border border-red-300 bg-red-50/80 p-4 text-red-950 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm">الحساب محظور تشغيلياً (Operational Block)</h4>
              <p className="text-xs text-red-800 dark:text-red-300">
                {chefzDetail.operationalBlockReason || "الحساب موقوف أو مستبعد أو مؤرشف ولا يمكن إسناد أي طلبات أو تشغيله حالياً."}
              </p>
              {chefzDetail.statusReason && (
                <p className="text-xs text-red-700 dark:text-red-300">
                  سبب الحالة: <span className="font-semibold">{translateStatusReason(chefzDetail.statusReason)}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols): Details & Configuration */}
        <div className="space-y-6 lg:col-span-2">
          {/* Chefz Configuration Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[var(--brand)]" />
                <h2 className="text-lg font-bold text-[var(--foreground)]">إعدادات شيفز وقاعدة الاحتساب</h2>
              </div>
              {chefzDetail?.rowVersion && (
                <span className="text-xs text-[var(--muted)] font-mono" dir="ltr">
                  v: {chefzDetail.rowVersion.slice(0, 8)}...
                </span>
              )}
            </div>

            {detailsConflict && (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{detailsConflict}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveDetails} className="mt-5 space-y-5">
              {/* Account Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--foreground)]">
                  نوع الحساب في شيفز <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label
                    className={`flex cursor-pointer flex-col rounded-xl border p-4 transition-all ${
                      accountType === "Freelancer"
                        ? "border-[var(--brand)] bg-blue-50/50 dark:bg-blue-950/30"
                        : "border-[var(--border)] hover:bg-[var(--subtle-bg)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="detailAccountType"
                        value="Freelancer"
                        checked={accountType === "Freelancer"}
                        onChange={() => setAccountType("Freelancer")}
                        className="accent-[var(--brand)]"
                      />
                      <span className="font-bold text-sm text-[var(--foreground)]">فريلانسر (Freelancer)</span>
                    </div>
                    <span className="mt-1 text-xs text-[var(--muted)]">
                      عمولة الشركة 15% من صافي أرباح المحفظة
                    </span>
                  </label>

                  <label
                    className={`flex cursor-pointer flex-col rounded-xl border p-4 transition-all ${
                      accountType === "FullTime"
                        ? "border-[var(--brand)] bg-blue-50/50 dark:bg-blue-950/30"
                        : "border-[var(--border)] hover:bg-[var(--subtle-bg)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="detailAccountType"
                        value="FullTime"
                        checked={accountType === "FullTime"}
                        onChange={() => setAccountType("FullTime")}
                        className="accent-[var(--brand)]"
                      />
                      <span className="font-bold text-sm text-[var(--foreground)]">دوام كامل (FullTime)</span>
                    </div>
                    <span className="mt-1 text-xs text-[var(--muted)]">
                      عمولة الشركة 25 ر.س لكل يوم تكليف للمندوب
                    </span>
                  </label>
                </div>
              </div>

              {/* Report Id Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--foreground)]">
                  رقم الهوية في تقرير شيفز (Report Id Number)
                </label>
                <input
                  type="text"
                  value={reportIdNumber}
                  onChange={(e) => setReportIdNumber(e.target.value)}
                  placeholder="اتركه فارغاً للاعتماد على إقامة المالك المسجل أو المعرف الخارجي"
                  maxLength={100}
                  dir="ltr"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2.5 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)] font-mono"
                />
                <p className="text-xs text-[var(--muted)]">
                  المفتاح الدقيق لمطابقة التقرير اليومي بملف الإكسل. القيمة الافتراضية عند الحفظ لأول مرة هي إقامة المالك المسجل.
                </p>
              </div>

              {/* Commission Rule Preview */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--foreground)]">قاعدة عمولة الشركة المطبقة:</span>
                  <span className="font-extrabold text-[var(--brand)]">
                    {accountType === "Freelancer" ? "15% من صافي أرباح المحفظة" : "25 ر.س / يوم تكليف"}
                  </span>
                </div>
                <p className="text-[var(--muted)] text-[11px]">
                  تطبق هذه القاعدة على كافة التصفيات نصف الشهرية الجديدة التي سيتم إنشاؤها لاحقاً.
                </p>
              </div>

              {can("chefz.accounts.update") && (
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isSavingDetails}
                    className="gap-2 bg-[var(--brand)] text-white hover:opacity-90 min-w-[140px]"
                  >
                    <Save className="h-4 w-4" />
                    {isSavingDetails ? "جارٍ الحفظ..." : "حفظ بيانات شيفز"}
                  </Button>
                </div>
              )}
            </form>
          </div>

          {/* Assignments History Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-[var(--brand)]" />
                <h2 className="text-lg font-bold text-[var(--foreground)]">سجل تكليفات المناديب الفعليين</h2>
              </div>
              <span className="text-xs text-[var(--muted)]">
                {assignments.length} تكليف مسجل
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              {assignments.length === 0 ? (
                <p className="py-6 text-center text-xs text-[var(--muted)]">
                  لا توجد تكليفات سابقة لهذا الحساب.
                </p>
              ) : (
                <table className="w-full text-right text-xs">
                  <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border)] font-bold text-[var(--muted)]">
                    <tr>
                      <th className="px-3 py-2.5">المندوب الفعلي</th>
                      <th className="px-3 py-2.5">من تاريخ</th>
                      <th className="px-3 py-2.5">إلى تاريخ</th>
                      <th className="px-3 py-2.5">الحالة</th>
                      <th className="px-3 py-2.5">السبب</th>
                      {canEditAssignmentDate && (
                        <th className="px-3 py-2.5 text-center">الإجراءات</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {assignments.map((asgn) => (
                      <tr key={asgn.id} className="hover:bg-[var(--subtle-bg)]">
                        <td className="px-3 py-2.5 font-semibold text-[var(--foreground)]">
                          {asgn.actualRiderNameAr || "مندوب سابق"}
                        </td>
                        <td className="px-3 py-2.5 font-mono" dir="ltr">
                          {asgn.effectiveFrom}
                        </td>
                        <td className="px-3 py-2.5 font-mono" dir="ltr">
                          {asgn.effectiveTo || "مستمر حتى الآن"}
                        </td>
                        <td className="px-3 py-2.5">
                          {asgn.status === "Active" ? (
                            <Badge tone="green">نشط</Badge>
                          ) : asgn.status === "Ended" ? (
                            <Badge tone="gray">منتهي</Badge>
                          ) : (
                            <Badge tone="red">ملغي</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-[var(--muted)]">
                          {asgn.startReason || asgn.endReason || "—"}
                        </td>
                        {canEditAssignmentDate && (
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => openEditStartDateModal(asgn)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand)]/10 transition-colors"
                              title="تعديل تاريخ البدء"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                              <span>تعديل تاريخ البدء</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Settlements for this account */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-[var(--foreground)]">تصفيات الحساب المحفوظة</h2>
              </div>
              <Link href={`/admin/chefz/settlements?accountId=${baseAccount.id}`}>
                <span className="text-xs text-[var(--brand)] hover:underline font-semibold">
                  عرض الكل بالتصفيات
                </span>
              </Link>
            </div>

            <div className="mt-4 overflow-x-auto">
              {settlements.length === 0 ? (
                <p className="py-6 text-center text-xs text-[var(--muted)]">
                  لا توجد تصفيات محفوظة لهذا الحساب بعد.
                </p>
              ) : (
                <table className="w-full text-right text-xs">
                  <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border)] font-bold text-[var(--muted)]">
                    <tr>
                      <th className="px-3 py-2.5">الفترة</th>
                      <th className="px-3 py-2.5">المندوب الفعلي</th>
                      <th className="px-3 py-2.5">رقم الإقامة</th>
                      <th className="px-3 py-2.5">النوع</th>
                      <th className="px-3 py-2.5">أيام التكليف</th>
                      <th className="px-3 py-2.5">أرباح المحفظة</th>
                      <th className="px-3 py-2.5">مستحق الشركة</th>
                      <th className="px-3 py-2.5">مستحق المندوب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {settlements.map((s) => (
                      <tr key={s.id} className="hover:bg-[var(--subtle-bg)]">
                        <td className="px-3 py-2 font-mono" dir="ltr">
                          {s.periodFrom} → {s.periodTo}
                        </td>
                        <td className="px-3 py-2 font-semibold">
                          {s.riderName || "—"}
                        </td>
                        <td className="px-3 py-2 font-mono" dir="ltr">
                          {s.riderIqamaNo ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone={s.accountType === "Freelancer" ? "blue" : "orange"}>
                            {s.accountType === "Freelancer" ? "فريلانسر" : "دوام كامل"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2" dir="ltr">
                          {s.assignedDays} يوم
                        </td>
                        <td className="px-3 py-2 font-semibold" dir="ltr">
                          {s.grossEarnings.toLocaleString()} ر.س
                        </td>
                        <td className="px-3 py-2 font-semibold text-blue-600" dir="ltr">
                          {s.companyAmount.toLocaleString()} ر.س
                        </td>
                        <td className="px-3 py-2 font-bold" dir="ltr">
                          {s.riderAmount >= 0 ? (
                            <span className="text-emerald-600">
                              +{s.riderAmount.toLocaleString()} ر.س
                            </span>
                          ) : (
                            <span className="text-red-600">
                              {s.riderAmount.toLocaleString()} ر.س
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Platform Context & Credentials */}
        <div className="space-y-6">
          {/* Base Platform Context Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
              <Server className="h-5 w-5 text-[var(--muted)]" />
              <h3 className="font-bold text-sm text-[var(--foreground)]">سياق حساب المنصة</h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[var(--muted)] block">المالك المسجل (المسجل باسمه):</span>
                <span className="font-bold text-[var(--foreground)]">
                  {baseAccount.ownerRiderNameAr || "—"}
                </span>
              </div>

              <div>
                <span className="text-[var(--muted)] block">المندوب الفعلي الحالي:</span>
                {baseAccount.currentAssignment ? (
                  <span className="font-bold text-emerald-600">
                    {baseAccount.currentAssignment.actualRiderNameAr}
                  </span>
                ) : (
                  <span className="text-[var(--muted)] font-semibold">لا يوجد تكليف نشط</span>
                )}
              </div>

              <div>
                <span className="text-[var(--muted)] block">المدينة التشغيلية:</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {baseAccount.operatingCityNameAr || "—"}
                </span>
              </div>

              <div>
                <span className="text-[var(--muted)] block">الكفيل:</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {baseAccount.sponsorNameAr || "—"}
                </span>
              </div>

              <div>
                <span className="text-[var(--muted)] block">نموذج الدفع الأساسي:</span>
                <span className="font-mono text-[var(--foreground)]">
                  {baseAccount.paymentModel}
                </span>
              </div>

              <div>
                <span className="text-[var(--muted)] block">حالة دورة الحياة:</span>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  {getStatusBadge(chefzDetail?.status || baseAccount.status)}
                  {chefzDetail?.isOperationallyBlocked && (
                    <Badge tone="red">حظر تشغيلي</Badge>
                  )}
                </div>
                {chefzDetail?.statusReason && (
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    السبب: <span className="font-semibold text-[var(--foreground)]">{translateStatusReason(chefzDetail.statusReason)}</span>
                  </p>
                )}
                {chefzDetail?.accountRowVersion && (
                  <p className="mt-1 text-[10px] text-[var(--muted)] font-mono" dir="ltr">
                    RowVersion: {chefzDetail.accountRowVersion.slice(0, 10)}...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Credentials Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-600" />
                <h3 className="font-bold text-sm text-[var(--foreground)]">كلمة المرور والاعتماد</h3>
              </div>
              <Badge tone={chefzDetail?.hasPassword ? "green" : "gray"}>
                {chefzDetail?.hasPassword ? "محفوظة" : "غير متوفرة"}
              </Badge>
            </div>

            {/* Reveal action */}
            {can("platform_credentials.read") && chefzDetail?.hasPassword && (
              <div className="space-y-3">
                {revealedPassword ? (
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/40">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-emerald-800 dark:text-emerald-200 select-all" dir="ltr">
                        {revealedPassword}
                      </span>
                      <button
                        onClick={handleCopy}
                        className="rounded p-1 text-emerald-700 hover:bg-emerald-200 dark:text-emerald-300"
                        title="نسخ"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleRevealPassword}
                    disabled={isRevealing}
                    className="w-full gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300"
                  >
                    <Eye className="h-4 w-4" />
                    {isRevealing ? "جارٍ الكشف..." : "كشف كلمة المرور الحالية"}
                  </Button>
                )}
              </div>
            )}

            {/* Quick Rotate Button */}
            {can("platform_credentials.rotate") && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsPasswordModalOpen(true);
                  setRevealedPassword(null);
                }}
                className="w-full gap-2 text-xs"
              >
                <KeyRound className="h-4 w-4" />
                تعيين أو تدوير كلمة المرور
              </Button>
            )}

            {/* Credential rotation history snippet */}
            <div className="border-t border-[var(--border)] pt-3">
              <span className="text-[11px] font-bold text-[var(--muted)] block mb-2">
                سجل تدوير الاعتماد ({credentials.length})
              </span>
              {credentials.length === 0 ? (
                <p className="text-[11px] text-[var(--muted)]">لا يوجد سجل تدوير سابق.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {credentials.slice(0, 5).map((c) => (
                    <div key={c.id} className="text-[11px] border-b border-[var(--border)] pb-1.5 last:border-none">
                      <div className="flex justify-between font-semibold text-[var(--foreground)]">
                        <span>إصدار {c.version}</span>
                        <span className="text-[var(--muted)]" dir="ltr">
                          {new Date(c.rotatedAtUtc).toLocaleDateString("ar-SA")}
                        </span>
                      </div>
                      <p className="text-[var(--muted)] truncate">{c.reason || "—"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title={`تعيين كلمة مرور الحساب — ${baseAccount.code}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSavePassword} className="space-y-4" dir="rtl">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">
              كلمة المرور الجديدة <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              maxLength={4096}
              dir="ltr"
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)] font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">
              سبب التعيين / التدوير <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={passwordReason}
              onChange={(e) => setPasswordReason(e.target.value)}
              required
              maxLength={1000}
              placeholder="مثال: إعداد كلمة المرور لأول مرة"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPasswordModalOpen(false)}
              disabled={isSavingPassword}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSavingPassword || !newPassword.trim()}
              className="bg-[var(--brand)] text-white hover:opacity-90"
            >
              {isSavingPassword ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Lifecycle Status Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={`تغيير حالة دورة حياة الحساب — ${baseAccount.code}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveStatus} className="space-y-4" dir="rtl">
          {statusError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p className="font-semibold">{statusError}</p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200 space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <Info className="h-4 w-4 shrink-0" />
              <span>ملاحظة حول دورة حياة حسابات شيفز</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              تغيير حالة الحساب (الموقوف، المستبعد، المؤرشف) يتحكم بالحظر التشغيلي دون فك ربط المندوب الحالي.
              اختيار &quot;Active&quot; يحسب تلقائياً &quot;Assigned&quot; إذا كان هناك مندوب معين، أو &quot;Available&quot; إذا كان شاغراً.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--foreground)]">
              الحالة التشغيلية المستهدفة <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                  statusTarget === "Active"
                    ? "border-[var(--brand)] bg-[var(--brand)]/10 ring-1 ring-[var(--brand)]"
                    : "border-[var(--border)] hover:bg-[var(--subtle-bg)]"
                }`}
              >
                <input
                  type="radio"
                  name="detailAccountStatus"
                  value="Active"
                  checked={statusTarget === "Active"}
                  onChange={() => setStatusTarget("Active")}
                  className="mt-1 accent-[var(--brand)]"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[var(--foreground)]">نشط تشغيلياً (Active)</span>
                    <Badge tone="green">تفعيل</Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    إعادة التفعيل؛ يصبح معیّن (Assigned) إذا كان هناك مندوب مرتبط، أو متاح (Available) للشواغر.
                  </p>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                  statusTarget === "Suspended"
                    ? "border-amber-500 bg-amber-50/60 dark:bg-amber-950/20 ring-1 ring-amber-500"
                    : "border-[var(--border)] hover:bg-[var(--subtle-bg)]"
                }`}
              >
                <input
                  type="radio"
                  name="detailAccountStatus"
                  value="Suspended"
                  checked={statusTarget === "Suspended"}
                  onChange={() => setStatusTarget("Suspended")}
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-amber-700 dark:text-amber-400">موقوف مؤقتاً (Suspended)</span>
                    <Badge tone="orange">حظر تشغيلي</Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    إيقاف إداري يدوي مؤقت مع الحفاظ على سجل المندوب المعين لمنع إسناد طلبات جديدة.
                  </p>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                  statusTarget === "Retired"
                    ? "border-rose-500 bg-rose-50/60 dark:bg-rose-950/20 ring-1 ring-rose-500"
                    : "border-[var(--border)] hover:bg-[var(--subtle-bg)]"
                }`}
              >
                <input
                  type="radio"
                  name="detailAccountStatus"
                  value="Retired"
                  checked={statusTarget === "Retired"}
                  onChange={() => setStatusTarget("Retired")}
                  className="mt-1 accent-rose-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-rose-700 dark:text-rose-400">مستبعد من التشغيل (Retired)</span>
                    <Badge tone="red">استبعاد</Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    استبعاد دائم أو طويل الأمد للحساب من العمليات التشغيلية للمنصة.
                  </p>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                  statusTarget === "Archived"
                    ? "border-slate-500 bg-slate-500/10 ring-1 ring-slate-500"
                    : "border-[var(--border)] hover:bg-[var(--subtle-bg)]"
                }`}
              >
                <input
                  type="radio"
                  name="detailAccountStatus"
                  value="Archived"
                  checked={statusTarget === "Archived"}
                  onChange={() => setStatusTarget("Archived")}
                  className="mt-1 accent-slate-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300">أرشفة الحساب (Archived)</span>
                    <Badge tone="gray">أرشفة</Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    نقل الحساب إلى الأرشيف؛ لا يمكن تشغيله إلا بعد استعادته لاحقاً.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">
              سبب تغيير الحالة <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              required
              maxLength={1000}
              placeholder="مثال: إيقاف بناء على طلب الإدارة / استبعاد الحساب القديم"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--brand)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsStatusModalOpen(false)}
              disabled={isSavingStatus}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSavingStatus || !statusReason.trim()}
              className="bg-[var(--brand)] text-white hover:opacity-90"
            >
              {isSavingStatus ? "جارٍ التحديث..." : "حفظ الحالة الجديدة"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Assignment Start Date Modal */}
      <Modal
        isOpen={Boolean(editingAssignment)}
        onClose={() => setEditingAssignment(null)}
        title="تعديل تاريخ بدء التكليف (Start Date)"
        maxWidth="max-w-md"
      >
        {editingAssignment && (
          <form onSubmit={handleSaveStartDate} className="space-y-4" dir="rtl">
            {startDateError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p className="font-semibold">{startDateError}</p>
                </div>
              </div>
            )}

            {/* Context Info Box */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">المندوب الفعلي:</span>
                <span className="font-bold text-[var(--foreground)]">
                  {editingAssignment.actualRiderNameAr || "مندوب سابق"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">تاريخ البدء الحالي:</span>
                <span className="font-mono font-bold text-[var(--foreground)]" dir="ltr">
                  {editingAssignment.effectiveFrom}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">تاريخ الانتهاء:</span>
                <span className="font-mono text-[var(--muted)]" dir="ltr">
                  {editingAssignment.effectiveTo || "مستمر حتى الآن"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">الحالة:</span>
                <span>
                  {editingAssignment.status === "Active" ? (
                    <Badge tone="green">نشط</Badge>
                  ) : editingAssignment.status === "Ended" ? (
                    <Badge tone="gray">منتهي</Badge>
                  ) : (
                    <Badge tone="red">ملغي</Badge>
                  )}
                </span>
              </div>
              {editingAssignment.rowVersion && (
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--border)]">
                  <span className="text-[var(--muted)]">رمز التزامن (rowVersion):</span>
                  <span
                    className="font-mono text-[var(--muted)] truncate max-w-[180px]"
                    dir="ltr"
                    title={editingAssignment.rowVersion}
                  >
                    {editingAssignment.rowVersion.slice(0, 16)}...
                  </span>
                </div>
              )}
            </div>

            {/* Date Input */}
            <div className="space-y-1.5">
              <DateInput
                label="تاريخ البدء الجديد (Effective From)"
                value={editStartDate}
                onChange={(val) => {
                  setEditStartDate(val);
                  setStartDateError(null);
                }}
                required
              />
              <p className="text-[11px] text-[var(--muted)]">
                سيتم إرسال رمز التزامن الحالي (rowVersion) من سجل التكليفات مع الطلب لضمان تكامل البيانات.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingAssignment(null)}
                disabled={isSavingStartDate}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={
                  isSavingStartDate ||
                  !editStartDate.trim() ||
                  editStartDate === editingAssignment.effectiveFrom
                }
                className="gap-2 bg-[var(--brand)] text-white hover:opacity-90 min-w-[130px]"
              >
                <Save className="h-4 w-4" />
                {isSavingStartDate ? "جارٍ التحديث..." : "حفظ تاريخ البدء"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
