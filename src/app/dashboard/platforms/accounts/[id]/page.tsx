"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
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
import {
  Server,
  ArrowRight,
  UserCheck,
  History,
  KeyRound,
  AlertTriangle,
  Building2,
  ShieldCheck,
} from "lucide-react";

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);

  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentResponse[]>([]);
  const [credentialHistory, setCredentialHistory] = useState<CredentialHistoryResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !can("platform_accounts.read")) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const acc = await getPlatformAccount(id);
        setAccount(acc);

        if (can("platform_assignments.read")) {
          const assignHist = await getAccountAssignmentHistory(id);
          setAssignmentHistory(assignHist);
        }

        if (can("platform_credentials.read")) {
          const credHist = await getAccountCredentialHistory(id);
          setCredentialHistory(credHist);
        }
      } catch (err) {
        console.error("Failed to load account details", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (!can("platform_accounts.read")) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800">{t("common.error")}</h2>
        <p className="text-slate-500">عفواً، لا تملك صلاحية الوصول لتفاصيل هذا الحساب.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-12 w-48 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="py-12 text-center text-slate-500">
        <Server className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="font-semibold">لم يتم العثور على حساب المنصة المطلوب</p>
        <Button onClick={() => router.back()} className="mt-4 gap-2" variant="secondary">
          <ArrowRight className="h-4 w-4" />
          رجوع
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => router.back()} className="p-2.5">
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--foreground)]">
              <Server className="h-6 w-6 text-[#1167c9] dark:text-blue-400" />
              حساب منصة: {account.code}
            </h1>
            <p className="text-xs text-[var(--muted)]">
              ID: {account.id} | RowVersion: {account.rowVersion}
            </p>
          </div>
        </div>

        <Link href="/dashboard/platforms/accounts">
          <Button variant="secondary">جميع الحسابات</Button>
        </Link>
      </div>

      {/* Main Details Card */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Account Info */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h2 className="font-bold text-[var(--foreground)] flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#1167c9] dark:text-blue-400" />
              البيانات الأساسية للحساب
            </h2>
            <div className="flex items-center gap-2">
              <Badge
                className={
                  account.paymentModel === "Salary"
                    ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50 font-semibold"
                    : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50 font-semibold"
                }
              >
                {account.paymentModel === "PayPerOrder"
                  ? t("platforms.payPerOrder")
                  : account.paymentModel === "Salary"
                  ? t("platforms.salary")
                  : account.paymentModel}
              </Badge>
              <Badge className="bg-blue-50 dark:bg-blue-950/60 text-[#1167c9] dark:text-blue-300 font-semibold">
                {account.status}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-xs font-bold text-[var(--muted)] block">المنصة:</span>
              <span className="font-bold text-[var(--foreground)]">
                {account.platformNameAr || account.platformCode} ({account.platformCode})
              </span>
            </div>

            <div>
              <span className="text-xs font-bold text-[var(--muted)] block">مدينة التشغيل:</span>
              <span className="font-bold text-[var(--foreground)]">
                {account.operatingCityNameAr || "—"}
              </span>
            </div>

            <div>
              <span className="text-xs font-bold text-[var(--muted)] block">{t("platforms.paymentModel")}:</span>
              <span className="font-bold text-[var(--foreground)]">
                {account.paymentModel === "PayPerOrder"
                  ? t("platforms.payPerOrder")
                  : account.paymentModel === "Salary"
                  ? t("platforms.salary")
                  : account.paymentModel}
              </span>
            </div>

            <div>
              <span className="text-xs font-bold text-[var(--muted)] block">صاحب الحساب (Owner):</span>
              <span className="font-bold text-[var(--foreground)]">
                {account.ownerRiderNameAr || "—"}
              </span>
            </div>

            <div>
              <span className="text-xs font-bold text-[var(--muted)] block">اسم المستخدم للحساب:</span>
              <span className="font-mono text-[var(--foreground)]">{account.userName || "—"}</span>
            </div>

            <div>
              <span className="text-xs font-bold text-[var(--muted)] block">معرف الحساب الخارجي:</span>
              <span className="font-mono text-[var(--foreground)]">{account.externalAccountId || "—"}</span>
            </div>

            <div>
              <span className="text-xs font-bold text-[var(--muted)] block">تاريخ الاستحواذ:</span>
              <span className="text-[var(--foreground)]">{account.acquisitionDate || "—"}</span>
            </div>

            <div>
              <span className="text-xs font-bold text-[var(--muted)] block">تاريخ البداية:</span>
              <span className="text-[var(--foreground)]">{account.startDate || "—"}</span>
            </div>

            <div>
              <span className="text-xs font-bold text-[var(--muted)] block">تاريخ النهاية:</span>
              <span className="text-[var(--foreground)]">{account.endDate || "—"}</span>
            </div>
          </div>

          {account.notes && (
            <div className="pt-2 border-t border-[var(--border)]">
              <span className="text-xs font-bold text-[var(--muted)] block mb-1">الملاحظات:</span>
              <p className="text-xs text-[var(--foreground)] bg-[var(--subtle-bg)] rounded-xl p-3">{account.notes}</p>
            </div>
          )}
        </div>

        {/* Current Assignment Card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-[var(--foreground)] flex items-center gap-2 border-b border-[var(--border)] pb-3">
            <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            التعيين الحالي للمندوب
          </h2>

          {account.currentAssignment ? (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs font-bold text-[var(--muted)] block">المندوب الفعلي:</span>
                <span className="font-bold text-[var(--foreground)] text-base">
                  {account.currentAssignment.actualRiderNameAr || "مندوب معين"}
                </span>
              </div>

              {account.currentAssignment.paymentModel && (
                <div>
                  <span className="text-xs font-bold text-[var(--muted)] block">نموذج الدفع للتعيين:</span>
                  <Badge className={account.currentAssignment.paymentModel === "Salary" ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50" : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50"}>
                    {account.currentAssignment.paymentModel === "PayPerOrder"
                      ? t("platforms.payPerOrder")
                      : account.currentAssignment.paymentModel === "Salary"
                      ? t("platforms.salary")
                      : account.currentAssignment.paymentModel}
                  </Badge>
                </div>
              )}

              <div>
                <span className="text-xs font-bold text-[var(--muted)] block">فعال من:</span>
                <span className="text-[var(--foreground)]">{account.currentAssignment.effectiveFrom}</span>
              </div>

              {account.currentAssignment.startReason && (
                <div>
                  <span className="text-xs font-bold text-[var(--muted)] block">سبب التعيين:</span>
                  <span className="text-xs text-[var(--muted)]">{account.currentAssignment.startReason}</span>
                </div>
              )}

              {account.currentAssignment.wasBackdated && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/60 p-2 text-xs text-amber-800 dark:text-amber-300">
                  أثر رجي: {account.currentAssignment.backdatedReason || "نعم"}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-[var(--muted)] text-xs">
              لا يوجد مندوب فعلي تعيينه حالياً لهذا الحساب. الحساب متاح لتخصيص مندوب.
            </div>
          )}
        </div>
      </div>

      {/* Histories Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Assignment History */}
        {can("platform_assignments.read") && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-[var(--foreground)] flex items-center gap-2 border-b border-[var(--border)] pb-3">
              <History className="h-5 w-5 text-[#1167c9] dark:text-blue-400" />
              سجل التعيينات التاريخية
            </h2>

            {assignmentHistory.length === 0 ? (
              <p className="text-xs text-[var(--muted)] text-center py-6">لا يوجد سجل تعيينات سابق</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {assignmentHistory.map((item) => (
                  <div key={item.id} className="rounded-xl border border-[var(--border)] p-3 text-xs space-y-1 bg-[var(--subtle-bg)]">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-[var(--foreground)]">{item.actualRiderNameAr || "مندوب فعلي"}</span>
                      <div className="flex items-center gap-2">
                        {item.paymentModel && (
                          <Badge className={item.paymentModel === "Salary" ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300" : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"}>
                            {item.paymentModel === "PayPerOrder" ? t("platforms.payPerOrder") : item.paymentModel === "Salary" ? t("platforms.salary") : item.paymentModel}
                          </Badge>
                        )}
                        <Badge className={item.status === "Active" ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-[var(--muted)]">
                      من: {item.effectiveFrom} {item.effectiveTo ? `إلى: ${item.effectiveTo}` : "(نشط حتى الآن)"}
                    </div>
                    {item.endReason && <div className="text-[var(--muted)]">سبب الإنهاء: {item.endReason}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Credential History */}
        {can("platform_credentials.read") && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-[var(--foreground)] flex items-center gap-2 border-b border-[var(--border)] pb-3">
              <KeyRound className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              سجل تدوير بيانات الاعتماد
            </h2>

            {credentialHistory.length === 0 ? (
              <p className="text-xs text-[var(--muted)] text-center py-6">لا يوجد سجل تدوير سابق</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {credentialHistory.map((c) => (
                  <div key={c.id} className="rounded-xl border border-[var(--border)] p-3 text-xs flex justify-between items-center bg-[var(--subtle-bg)]">
                    <div>
                      <div className="font-bold text-[var(--foreground)]">إصدار v{c.version}</div>
                      <div className="text-[var(--muted)]">{new Date(c.rotatedAtUtc).toLocaleString("ar-SA")}</div>
                      {c.reason && <div className="text-[var(--muted)] mt-1">السبب: {c.reason}</div>}
                    </div>
                    <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
