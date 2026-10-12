// src/app/admin/jahez/settlements/page.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getJahezHandovers,
  getAllJahezHandovers,
  getJahezHandoverSettlements,
} from "@/lib/jahez/api";
import type {
  JahezBalance,
  JahezHandover,
  JahezSettlement,
} from "@/lib/jahez/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { exportToExcel } from "@/lib/export-excel";
import { JahezRiderCollectionModal } from "@/components/jahez/dialogs/JahezRiderCollectionModal";
import {
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  AlertTriangle,
} from "lucide-react";

export default function JahezSettlementsPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";

  const [settlements, setSettlements] = useState<JahezSettlement[]>([]);
  const [handovers, setHandovers] = useState<JahezHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [selectedHandoverId, setSelectedHandoverId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // New Settlement Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalHandoverId, setModalHandoverId] = useState("");

  // Load handovers
  const loadHandovers = async () => {
    try {
      const all = await getAllJahezHandovers();
      setHandovers(all);
    } catch {
      // Handled silently
    }
  };

  // Load settlements
  const loadSettlements = async () => {
    setLoading(true);
    try {
      if (selectedHandoverId) {
        const res = await getJahezHandoverSettlements(selectedHandoverId, { page, pageSize });
        setSettlements(res.items || []);
      } else {
        const currentHandovers = handovers.length > 0 ? handovers : await getAllJahezHandovers().catch(() => []);
        if (handovers.length === 0 && currentHandovers.length > 0) {
          setHandovers(currentHandovers);
        }
        const allSettlements: JahezSettlement[] = [];
        for (const h of currentHandovers.slice(0, 5)) {
          const sRes = await getJahezHandoverSettlements(h.id, { pageSize: 20 });
          allSettlements.push(...(sRes.items || []));
        }
        setSettlements(allSettlements);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذر تحميل التحصيلات";
      toast.error("خطأ", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHandovers();
  }, []);

  useEffect(() => {
    startTransition(() => {
      loadSettlements();
    });
  }, [selectedHandoverId, page]);

  const handleOpenModal = (handoverId?: string) => {
    const targetHandoverId = handoverId || selectedHandoverId || (handovers[0]?.id ?? "");
    setModalHandoverId(targetHandoverId);
    setIsModalOpen(true);
  };

  const getHandoverInfo = (s: JahezSettlement) => {
    const h = handovers.find((item) => item.id === s.handoverId);
    const extId = s.account?.externalAccountId || s.externalAccountId || h?.account?.externalAccountId || h?.externalAccountId;
    const code = s.account?.code || h?.account?.code;
    const ownerName = isEn
      ? (s.ownerRiderNameEn || s.ownerRiderNameAr || h?.ownerRiderNameEn || h?.ownerRiderNameAr)
      : (s.ownerRiderNameAr || s.ownerRiderNameEn || h?.ownerRiderNameAr || h?.ownerRiderNameEn);
    const riderName = isEn
      ? (s.actualRiderNameEn || s.actualRiderNameAr || h?.actualRiderNameEn || h?.actualRiderNameAr)
      : (s.actualRiderNameAr || s.actualRiderNameEn || h?.actualRiderNameAr || h?.actualRiderNameEn);
    return { h, extId, code, ownerName, riderName };
  };

  const handleExportExcel = () => {
    exportToExcel({
      filename: `jahez_settlements_${new Date().toISOString().slice(0, 10)}.xlsx`,
      data: settlements,
      columns: [
        { header: isEn ? "Recorded At" : "تاريخ التسجيل", accessor: "recordedAtUtc" },
        {
          header: isEn ? "Driver ID" : "رقم الحساب الخارجي",
          accessor: (s) => getHandoverInfo(s).extId || "-",
        },
        {
          header: isEn ? "Account Code" : "رمز الحساب",
          accessor: (s) => getHandoverInfo(s).code || "-",
        },
        {
          header: isEn ? "Owner Name" : "صاحب الحساب",
          accessor: (s) => getHandoverInfo(s).ownerName || "-",
        },
        {
          header: isEn ? "Actual Rider" : "المندوب الفعلي",
          accessor: (s) => getHandoverInfo(s).riderName || "-",
        },
        { header: isEn ? "Cutoff Date" : "تاريخ الاستحقاق", accessor: "throughDate" },
        { header: isEn ? "Fee Payment" : "رسوم الحساب", accessor: "feePayment" },
        { header: isEn ? "Debt Payment" : "مديونية جاهز", accessor: "debtPayment" },
        { header: isEn ? "Commission Payment" : "عمولة التشغيل", accessor: "commissionPayment" },
        { header: isEn ? "Reason" : "السبب", accessor: "reason" },
      ],
    });
  };

  const filteredSettlements = settlements.filter((s) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const info = getHandoverInfo(s);
    const extId = (info.extId || "").toLowerCase();
    const code = (info.code || "").toLowerCase();
    const owner = (info.ownerName || "").toLowerCase();
    const rider = (info.riderName || "").toLowerCase();
    return (
      extId.includes(term) ||
      code.includes(term) ||
      owner.includes(term) ||
      rider.includes(term) ||
      s.reason.toLowerCase().includes(term) ||
      s.throughDate.includes(term)
    );
  });

  const totalFeeCollected = settlements.reduce((sum, s) => sum + s.feePayment, 0);
  const totalDebtCollected = settlements.reduce((sum, s) => sum + s.debtPayment, 0);
  const totalCommissionCollected = settlements.reduce((sum, s) => sum + s.commissionPayment, 0);
  const grandTotal = totalFeeCollected + totalDebtCollected + totalCommissionCollected;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            {isEn ? "Jahez Settlements & Rider Collections" : "تحصيلات وتسويات مناديب جاهز"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isEn
              ? "Record rider collections across 3 buckets: Account Fees, Platform Debt, and Commission. Updates cashbox sections automatically."
              : "تسجيل تحصيلات المناديب على السلات الثلاث: رسوم الحساب، مديونية جاهز، والعمولة، وتوجيهها آلياً لصندوق النقد."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={loadSettlements}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {isEn ? "Refresh" : "تحديث"}
          </Button>

          <Button
            variant="secondary"
            onClick={handleExportExcel}
            disabled={settlements.length === 0}
            className="flex items-center gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isEn ? "Export Excel" : "تصدير إكسل"}
          </Button>

          {can("jahez.collections.create") && (
            <Button
              variant="primary"
              onClick={() => handleOpenModal()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              {isEn ? "New Collection" : "تسجيل تحصيل جديد"}
            </Button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {isEn ? "Total Collected (SAR)" : "إجمالي التحصيلات (ر.س)"}
          </span>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {grandTotal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-gray-400 mt-1 block">
            {settlements.length} {isEn ? "operations" : "عملية مسجلة"}
          </span>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
            {isEn ? "Account Fees Collected" : "تحصيلات رسوم الحساب"}
          </span>
          <p className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-300">
            {totalFeeCollected.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-blue-500 mt-1 block">
            {isEn ? "→ Directed to Fees Cashbox" : "← يوجّه لصندوق رسوم الحساب"}
          </span>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            {isEn ? "Platform Debt Collected" : "تحصيلات مديونية جاهز"}
          </span>
          <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">
            {totalDebtCollected.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-amber-500 mt-1 block">
            {isEn ? "→ Directed to Settlements Cashbox" : "← يوجّه لصندوق التسويات"}
          </span>
        </div>

        <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/20">
          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
            {isEn ? "Commission Collected" : "تحصيلات عمولة التشغيل"}
          </span>
          <p className="mt-2 text-2xl font-bold text-purple-700 dark:text-purple-300">
            {totalCommissionCollected.toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-purple-500 mt-1 block">
            {isEn ? "→ Directed to Settlements Cashbox" : "← يوجّه لصندوق التسويات"}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 min-w-[240px]">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
            {isEn ? "Filter by Handover" : "تصفية بحساب التسليم"}
          </label>
          <SearchableSelect
            value={selectedHandoverId}
            onChange={(val) => {
              setSelectedHandoverId(val);
              setPage(1);
            }}
            options={[
              { value: "", label: isEn ? "All Accounts" : "جميع حسابات التسليم" },
              ...handovers.map((h) => {
                const accDisplay = h.account?.externalAccountId || h.externalAccountId || h.account?.code || "-";
                const rider = isEn
                  ? (h.actualRiderNameEn || h.actualRiderNameAr || h.ownerRiderNameEn || h.ownerRiderNameAr)
                  : (h.actualRiderNameAr || h.actualRiderNameEn || h.ownerRiderNameAr || h.ownerRiderNameEn);
                return {
                  value: h.id,
                  label: `[${accDisplay}]${rider ? ` - ${rider}` : ""} (${h.commissionStartsOn})`,
                  sublabel: rider ? `${isEn ? "Rider:" : "المندوب:"} ${rider}` : undefined,
                  keywords: `${accDisplay} ${h.account?.code || ""} ${h.externalAccountId || ""} ${h.account?.externalAccountId || ""} ${h.actualRiderNameAr || ""} ${h.actualRiderNameEn || ""} ${h.ownerRiderNameAr || ""} ${h.ownerRiderNameEn || ""} ${h.commissionStartsOn || ""}`,
                };
              }),
            ]}
          />
        </div>

        <div className="flex-1 relative">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">
            {isEn ? "Quick Search" : "بحث سريع"}
          </label>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={isEn ? "Search by ID, reason, or date..." : "ابحث برقم المعرف، السبب، أو التاريخ..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800/60 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3">{isEn ? "Recorded At" : "تاريخ التسجيل"}</th>
                <th className="px-4 py-3">{isEn ? "Account (Driver ID)" : "الحساب (Driver ID)"}</th>
                <th className="px-4 py-3">{isEn ? "Cutoff Date" : "تاريخ الاستحقاق"}</th>
                <th className="px-4 py-3">{isEn ? "Fee Payment" : "رسوم الحساب"}</th>
                <th className="px-4 py-3">{isEn ? "Platform Debt" : "مديونية جاهز"}</th>
                <th className="px-4 py-3">{isEn ? "Commission" : "عمولة التشغيل"}</th>
                <th className="px-4 py-3">{isEn ? "Total Paid" : "المبلغ الإجمالي"}</th>
                <th className="px-4 py-3">{isEn ? "Settlement Type" : "نوع السداد"}</th>
                <th className="px-4 py-3">{isEn ? "Reason" : "السبب والملاحظة"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    {isEn ? "Loading settlements..." : "جارٍ تحميل التحصيلات..."}
                  </td>
                </tr>
              ) : filteredSettlements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    <CreditCard className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-medium text-gray-600 dark:text-gray-300">
                      {isEn ? "No settlements found" : "لا توجد تحصيلات مسجلة"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSettlements.map((s) => {
                  const itemTotal = s.feePayment + s.debtPayment + s.commissionPayment;
                  const info = getHandoverInfo(s);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {new Date(s.recordedAtUtc).toLocaleDateString("ar-SA", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-gray-900 dark:text-white block font-mono">
                          {info.extId ? `[${info.extId}]` : info.code || "-"}
                        </span>
                        {info.code && info.code !== info.extId && (
                          <span className="text-xs text-emerald-600 block">
                            {info.code}
                          </span>
                        )}
                        {info.ownerName && (
                          <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal mt-0.5" title={isEn ? "Account Owner" : "صاحب الحساب"}>
                            {info.ownerName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                        {s.throughDate}
                      </td>
                      <td className="px-4 py-3 text-blue-600 font-semibold">
                        {s.feePayment > 0 ? `${s.feePayment.toLocaleString("ar-SA")} ر.س` : "-"}
                      </td>
                      <td className="px-4 py-3 text-amber-600 font-semibold">
                        {s.debtPayment > 0 ? `${s.debtPayment.toLocaleString("ar-SA")} ر.س` : "-"}
                      </td>
                      <td className="px-4 py-3 text-purple-600 font-semibold">
                        {s.commissionPayment > 0
                          ? `${s.commissionPayment.toLocaleString("ar-SA")} ر.س`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {itemTotal.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                      </td>
                      <td className="px-4 py-3">
                        {s.countsAsSettlement ? (
                          <Badge tone="green">
                            <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                            {isEn ? "Settlement (Resets timer)" : "تسوية (تجدد عداد الـ 10 أيام)"}
                          </Badge>
                        ) : (
                          <Badge tone="gray">
                            {isEn ? "Fee Only" : "رسوم فقط"}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 max-w-xs truncate" title={s.reason}>
                        {s.reason}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Collection Modal (Multi & Single Period Collection matching backend rules) */}
      <JahezRiderCollectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialHandoverId={modalHandoverId}
        handoversList={handovers}
        onSuccess={() => {
          loadSettlements();
        }}
      />

    </div>
  );
}
