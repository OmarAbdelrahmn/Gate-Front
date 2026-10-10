// src/app/admin/chefz/accounts/[accountId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getChefzAccount,
  updateChefzAccountDetails,
  setChefzPassword,
  getChefzPassword,
  getChefzSettlements,
  getChefzPerformance,
  getRiyadhTodayDate,
} from "@/lib/chefz/api";
import type {
  ChefzAccount,
  ChefzAccountType,
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
} from "lucide-react";

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

  // Configuration Form State
  const [accountType, setAccountType] = useState<ChefzAccountType>("Freelancer");
  const [reportIdNumber, setReportIdNumber] = useState("");
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsConflict, setDetailsConflict] = useState<string | null>(null);

  // Password Modal / State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordReason, setPasswordReason] = useState("تحديث كلمة مرور الحساب");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [copied, setCopied] = useState(false);

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

      if (chefz) {
        setAccountType(chefz.accountType);
        setReportIdNumber(chefz.reportIdNumber || "");
      } else {
        setAccountType("Freelancer");
        setReportIdNumber("");
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
        rowVersion: chefzDetail?.rowVersion || null,
      });

      setChefzDetail(updated);
      setAccountType(updated.accountType);
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
          setAccountType(fresh.accountType);
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
            {chefzDetail ? (
              <Badge tone="green">معد لشيفز</Badge>
            ) : (
              <Badge tone="orange">بانتظار الإعداد</Badge>
            )}
            {chefzDetail && (
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
            <Link href={`/admin/chefz/settlements?accountId=${baseAccount.id}`}>
              <Button className="gap-2 bg-[var(--brand)] text-white hover:opacity-90">
                <CreditCard className="h-4 w-4" />
                تصفية جديدة للحساب
              </Button>
            </Link>
          )}
        </div>
      </div>

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
                <span className="text-[var(--muted)] block">الحالة العامة:</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {baseAccount.status}
                </span>
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
    </div>
  );
}
