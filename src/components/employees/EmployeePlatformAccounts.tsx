"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, Server, ExternalLink, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getRiderPlatformHistory,
  getPlatformAccounts,
  type RiderPlatformHistoryItem,
} from "@/lib/platforms/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface PlatformAccountDisplayItem {
  id: string;
  platformId: string;
  platformName: string;
  platformCode: string;
  accountCode: string;
  workingId: string;
  userName?: string | null;
  status: string;
  roleType: "owner" | "assigned" | "history";
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  operatingCity?: string | null;
  ownerName?: string | null;
}

export function EmployeePlatformAccounts({
  employeeId,
  riderProfileId,
}: {
  employeeId: string;
  riderProfileId: string | null;
}) {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);

  const [items, setItems] = useState<PlatformAccountDisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const targetRiderId = riderProfileId || employeeId;

  const loadPlatformAccounts = async () => {
    if (!can("platform_accounts.read") && !can("platform_assignments.read")) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [historyRes, assignedAccs, ownedAccs] = await Promise.allSettled([
        getRiderPlatformHistory(targetRiderId),
        getPlatformAccounts({ actualRiderProfileId: targetRiderId }),
        getPlatformAccounts({ ownerRiderProfileId: targetRiderId }),
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
            status: acc.status,
            roleType: "assigned",
            operatingCity:
              locale === "en"
                ? acc.operatingCityNameEn || acc.operatingCityNameAr
                : acc.operatingCityNameAr || acc.operatingCityNameEn,
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
              status: acc.status,
              roleType: "owner",
              operatingCity:
                locale === "en"
                  ? acc.operatingCityNameEn || acc.operatingCityNameAr
                  : acc.operatingCityNameAr || acc.operatingCityNameEn,
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

      setItems(Array.from(displayMap.values()));
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

  useEffect(() => {
    loadPlatformAccounts();
  }, [targetRiderId, locale]);

  if (!can("platform_accounts.read") && !can("platform_assignments.read")) {
    return null;
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
      case "Assigned":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
            {locale === "en" ? "Active" : "نشط"}
          </Badge>
        );
      case "Available":
        return (
          <Badge className="bg-blue-50 text-[#1167c9] border-blue-200">
            {locale === "en" ? "Available" : "متاح"}
          </Badge>
        );
      case "Suspended":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200">
            {locale === "en" ? "Suspended" : "موقوف"}
          </Badge>
        );
      case "Ended":
      case "Retired":
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-300">
            {locale === "en" ? "Ended" : "منتهي"}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card className="p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#1167c9]">
            <Server size={20} />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {locale === "en" ? "Platform Accounts & Working IDs" : "حسابات المنصات وأرقام العمل"}
            </h2>
            <p className="text-xs text-[var(--muted)]">
              {locale === "en"
                ? "Platform accounts registered or assigned to this employee (e.g. HungerStation, Jahez)"
                : "حسابات المنصات المشترك بها أو المعينة للموظف (مثل هنجرستيشن، جاهز، إلخ)"}
            </p>
          </div>
        </div>

        <button
          onClick={loadPlatformAccounts}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {locale === "en" ? "Refresh" : "تحديث"}
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-[var(--muted)]">
          {locale === "en" ? "Loading platform accounts..." : "جارٍ تحميل حسابات المنصات..."}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
          <Layers className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="font-bold">
            {locale === "en"
              ? "No platform accounts linked to this employee."
              : "لا توجد حسابات منصات مرتبطة بهذا الموظف."}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {locale === "en"
              ? "Accounts created or assigned in Platform Management will appear here."
              : "ستظهر الحسابات المنشأة أو المعينة في إدارة المنصات هنا تلقائياً."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={`${item.id}-${item.platformId}`}
              className="relative flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm hover:border-[#1167c9]/40 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-lg bg-blue-100/60 font-bold text-[#1167c9] text-xs">
                      {item.platformCode ? item.platformCode.slice(0, 3).toUpperCase() : "PF"}
                    </span>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm">{item.platformName}</h3>
                      <p className="text-[11px] font-mono text-slate-400">{item.accountCode}</p>
                    </div>
                  </div>
                  {renderStatusBadge(item.status)}
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  {/* Working ID / External ID */}
                  <div className="rounded-lg bg-blue-50/60 p-2.5 border border-blue-100">
                    <span className="block text-[10px] font-bold text-[#1167c9] uppercase tracking-wider">
                      {locale === "en" ? "Working ID / Account ID:" : "رقم العمل / المعرف الخارجي:"}
                    </span>
                    <span className="font-mono text-sm font-black text-slate-900 block mt-0.5">
                      {item.workingId}
                    </span>
                  </div>

                  {item.userName && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-slate-400">{locale === "en" ? "Username:" : "اسم المستخدم:"}</span>
                      <span className="font-mono font-medium">{item.userName}</span>
                    </div>
                  )}

                  {item.ownerName && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-slate-400">{locale === "en" ? "Account Owner:" : "صاحب الحساب:"}</span>
                      <span className="font-medium">{item.ownerName}</span>
                    </div>
                  )}

                  {item.operatingCity && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-slate-400">{locale === "en" ? "Operating City:" : "مدينة التشغيل:"}</span>
                      <span className="font-medium">{item.operatingCity}</span>
                    </div>
                  )}

                  {item.effectiveFrom && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-slate-400">{locale === "en" ? "Assigned From:" : "معين من:"}</span>
                      <span className="font-medium">{item.effectiveFrom}</span>
                    </div>
                  )}
                </div>
              </div>

              {can("platform_accounts.read") && (
                <div className="mt-4 border-t border-slate-100 pt-2.5 text-end">
                  <Link
                    href={`/dashboard/platforms/accounts/${item.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#1167c9] hover:underline"
                  >
                    {locale === "en" ? "View Account Details" : "عرض تفاصيل الحساب"}
                    <ExternalLink size={13} />
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
