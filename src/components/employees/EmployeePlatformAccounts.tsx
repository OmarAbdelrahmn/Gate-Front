"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, Server, ExternalLink, RefreshCw, History } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getRiderPlatformHistory,
  getPlatformAccounts,
  sortAssignmentsNewestFirst,
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
  paymentModel?: string | null;
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
  onOpenHistoryModal,
}: {
  employeeId: string;
  riderProfileId: string | null;
  onOpenHistoryModal?: () => void;
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
            paymentModel: acc.paymentModel || acc.currentAssignment?.paymentModel,
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
              paymentModel: acc.paymentModel,
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
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-blue-50 text-[#1167c9]">
            <Server size={18} />
          </span>
          <div>
            <h2 className="text-base font-black text-slate-900">
              {locale === "en" ? "Platform Accounts & Working IDs" : "حسابات المنصات وأرقام العمل"}
            </h2>
            <p className="text-[11px] text-[var(--muted)]">
              {locale === "en"
                ? "Platform accounts registered or assigned to this employee"
                : "حسابات المنصات المشترك بها أو المعينة للموظف (مثل هنجرستيشن، جاهز، إلخ)"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {can("platform_assignments.read") && (
            onOpenHistoryModal ? (
              <button
                type="button"
                onClick={onOpenHistoryModal}
                className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-xs font-bold text-[#1167c9] hover:bg-blue-100 transition-colors"
              >
                <History size={13} />
                {locale === "en" ? "Full Platform History" : "سجل تشغيل المنصات"}
              </button>
            ) : (
              <Link
                href={`/dashboard/platforms/rider-history?riderId=${targetRiderId}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-xs font-bold text-[#1167c9] hover:bg-blue-100 transition-colors"
              >
                <History size={13} />
                {locale === "en" ? "Full Platform History" : "سجل تشغيل المنصات"}
              </Link>
            )
          )}
          <button
            onClick={loadPlatformAccounts}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {locale === "en" ? "Refresh" : "تحديث"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-4 text-center text-xs text-[var(--muted)]">
          {locale === "en" ? "Loading platform accounts..." : "جارٍ تحميل حسابات المنصات..."}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--muted)]">
          <Layers className="mx-auto mb-1 h-6 w-6 text-slate-300" />
          <p className="font-bold">
            {locale === "en"
              ? "No platform accounts linked to this employee."
              : "لا توجد حسابات منصات مرتبطة بهذا الموظف."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <div
              key={`${item.id}-${item.platformId}`}
              className="flex flex-col justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-2xs hover:border-[#1167c9]/40 transition-all text-xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-blue-100/60 font-black text-[#1167c9] text-[10px]">
                      {item.platformCode ? item.platformCode.slice(0, 3).toUpperCase() : "PF"}
                    </span>
                    <div className="truncate">
                      <h3 className="font-black text-slate-900 text-xs truncate">{item.platformName}</h3>
                      <p className="text-[10px] font-mono text-slate-400 truncate">{item.accountCode}</p>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    {item.paymentModel && (
                      <Badge className={`text-[10px] px-1.5 py-0.5 ${item.paymentModel === "Salary" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                        {item.paymentModel === "PayPerOrder"
                          ? (locale === "en" ? "Pay Per Order" : "بالطلب")
                          : item.paymentModel === "Salary"
                          ? (locale === "en" ? "Salary" : "راتب")
                          : item.paymentModel}
                      </Badge>
                    )}
                    {renderStatusBadge(item.status)}
                  </div>
                </div>

                {/* Compact Working ID Banner */}
                <div className="flex items-center justify-between rounded-md bg-blue-50/60 px-2.5 py-1.5 border border-blue-100/80">
                  <span className="text-[10px] font-bold text-[#1167c9]">
                    {locale === "en" ? "Working ID:" : "رقم العمل / المعرف:"}
                  </span>
                  <span className="font-mono text-xs font-black text-slate-900">
                    {item.workingId}
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-600">
                  {item.userName && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{locale === "en" ? "User:" : "المستخدم:"}</span>
                      <span className="font-mono font-medium truncate max-w-[120px]">{item.userName}</span>
                    </div>
                  )}

                  {item.ownerName && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{locale === "en" ? "Owner:" : "صاحب الحساب:"}</span>
                      <span className="font-medium truncate max-w-[120px]">{item.ownerName}</span>
                    </div>
                  )}

                  {item.operatingCity && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{locale === "en" ? "City:" : "المدينة:"}</span>
                      <span className="font-medium">{item.operatingCity}</span>
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
                <div className="mt-2 border-t border-slate-100 pt-1.5 text-end">
                  <Link
                    href={`/dashboard/platforms/accounts/${item.id}`}
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
    </Card>
  );
}
