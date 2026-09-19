"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getVehicleComplianceDue, getVehicles } from "@/lib/fleet/api";
import {
  VehicleComplianceDueStatus,
  VehicleRegistrationType,
  type VehicleComplianceDueResponse,
  type VehicleSummaryResponse,
} from "@/lib/fleet/types";
import { formatVehicleRegistrationType } from "@/lib/fleet/formatters";
import { TableHeaderColumnFilter, type FilterOption } from "@/app/admin/fleet/vehicles/components/TableHeaderFilter";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { ShieldCheck, RefreshCw, AlertTriangle, Filter, Search, X } from "lucide-react";
import Link from "next/link";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().split("T")[0];
  } catch {
    return dateStr;
  }
}

export default function CompliancePage() {
  const { can } = useAuth();
  const [data, setData] = useState<VehicleComplianceDueResponse[]>([]);
  const [vehiclesMap, setVehiclesMap] = useState<Record<string, VehicleSummaryResponse>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkDate, setCheckDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [registrationFilter, setRegistrationFilter] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("");

  const COMPLIANCE_FILTERS_SESSION_KEY = "admin_fleet_compliance_filters_session";
  const [isRestored, setIsRestored] = useState(false);

  // Restore filters on mount for the current session (like vehicles/employees table)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(COMPLIANCE_FILTERS_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.search === "string" && parsed.search) setSearch(parsed.search);
        if (typeof parsed.modelFilter === "string" && parsed.modelFilter) setModelFilter(parsed.modelFilter);
        if (typeof parsed.registrationFilter === "string" && parsed.registrationFilter) setRegistrationFilter(parsed.registrationFilter);
        if (typeof parsed.docTypeFilter === "string" && parsed.docTypeFilter) setDocTypeFilter(parsed.docTypeFilter);
      }
    } catch {
      // ignore JSON parse or sessionStorage errors
    } finally {
      setIsRestored(true);
    }
  }, []);

  // Save filters to sessionStorage whenever filters change (only after initial restoration)
  useEffect(() => {
    if (!isRestored) return;
    try {
      if (search || modelFilter || registrationFilter || docTypeFilter) {
        sessionStorage.setItem(
          COMPLIANCE_FILTERS_SESSION_KEY,
          JSON.stringify({
            search,
            modelFilter,
            registrationFilter,
            docTypeFilter,
          })
        );
      } else {
        sessionStorage.removeItem(COMPLIANCE_FILTERS_SESSION_KEY);
      }
    } catch {
      // ignore sessionStorage errors
    }
  }, [isRestored, search, modelFilter, registrationFilter, docTypeFilter]);

  const clearAllFilters = () => {
    setSearch("");
    setModelFilter("");
    setRegistrationFilter("");
    setDocTypeFilter("");
    try {
      sessionStorage.removeItem(COMPLIANCE_FILTERS_SESSION_KEY);
    } catch {
      // ignore
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dueData, firstVehiclesRes] = await Promise.all([
        getVehicleComplianceDue(checkDate || undefined),
        getVehicles({ pageSize: 200 }).catch((err) => {
          console.warn("Failed to load vehicles list:", err);
          return null;
        }),
      ]);

      if (firstVehiclesRes?.items) {
        let allVehicles: VehicleSummaryResponse[] = [...firstVehiclesRes.items];
        const totalCount = firstVehiclesRes.totalCount ?? allVehicles.length;
        const pageSize = firstVehiclesRes.pageSize || 200;

        if (totalCount > allVehicles.length) {
          const totalPages = Math.ceil(totalCount / pageSize);
          const pagePromises: Promise<any>[] = [];
          for (let p = 2; p <= totalPages; p++) {
            pagePromises.push(
              getVehicles({ page: p, pageSize }).catch((err) => {
                console.warn(`Failed to load vehicles page ${p}:`, err);
                return null;
              })
            );
          }
          const remaining = await Promise.all(pagePromises);
          for (const r of remaining) {
            if (r?.items) {
              allVehicles = allVehicles.concat(r.items);
            }
          }
        }

        const vMap: Record<string, VehicleSummaryResponse> = {};
        allVehicles.forEach((v) => {
          if (v.id) vMap[v.id] = v;
        });
        setVehiclesMap(vMap);
      }

      console.log("Compliance Due API Response:", dueData);
      setData(dueData || []);
    } catch (e: any) {
      console.error("Failed to load compliance data:", e);
      setError(e?.message || "تعذر جلب بيانات متابعة تجديد التراخيص.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [checkDate]);

  const displayItems = useMemo(() => {
    const list: VehicleComplianceDueResponse[] = [];
    const seenPermitVehicles = new Set<string>();

    for (const item of data) {
      list.push(item);
      if (
        item.type === "Permit" ||
        item.type === "Permission" ||
        item.type === "VehiclePermit" ||
        item.type === "RiderPermit"
      ) {
        seenPermitVehicles.add(item.vehicleId);
      }
    }

    for (const item of data) {
      if (
        (item.permitEndDate || (item.permitStatus !== undefined && item.permitStatus !== null)) &&
        !seenPermitVehicles.has(item.vehicleId)
      ) {
        seenPermitVehicles.add(item.vehicleId);
        list.push({
          vehicleId: item.vehicleId,
          assetNumber: item.assetNumber,
          serialNumber: item.serialNumber,
          plateNumber: item.plateNumber,
          plateNumberAr: item.plateNumberAr,
          plateNumberEn: item.plateNumberEn,
          type: "Permit",
          expiryDate: item.permitEndDate || "",
          status: item.permitStatus ?? VehicleComplianceDueStatus.Missing,
          permitEndDate: item.permitEndDate,
          permitStatus: item.permitStatus,
        });
      }
    }

    return list;
  }, [data]);

  const modelOptions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number; vehicleIds: Set<string> }>();

    for (const item of displayItems) {
      const v = vehiclesMap[item.vehicleId];
      if (!v) continue;
      const mfg = (v.manufacturer || "").trim();
      const mdl = (v.model || "").trim();
      const label = [mfg, mdl].filter(Boolean).join(" ").trim();
      if (!label) continue;

      const existing = counts.get(label);
      if (existing) {
        existing.count += 1;
        existing.vehicleIds.add(item.vehicleId);
      } else {
        counts.set(label, { label, count: 1, vehicleIds: new Set([item.vehicleId]) });
      }
    }

    const opts: FilterOption[] = [{ value: "", label: "الكل" }];
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1].count - a[1].count);

    for (const [key, item] of sorted) {
      opts.push({
        value: key,
        label: item.label,
        sublabel: `${item.vehicleIds.size} مركبة (${item.count} تنبيه)`,
        count: item.count,
      });
    }

    if (modelFilter && !opts.some((o) => o.value === modelFilter)) {
      opts.push({
        value: modelFilter,
        label: modelFilter,
      });
    }

    return opts;
  }, [displayItems, vehiclesMap, modelFilter]);

  const registrationTypeOptions = useMemo(() => {
    const counts = new Map<string, { count: number; vehicleIds: Set<string> }>();

    for (const item of displayItems) {
      const v = vehiclesMap[item.vehicleId];
      if (!v || v.registrationType === undefined || v.registrationType === null) continue;
      const key = String(v.registrationType);
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
        existing.vehicleIds.add(item.vehicleId);
      } else {
        counts.set(key, { count: 1, vehicleIds: new Set([item.vehicleId]) });
      }
    }

    const opts: FilterOption[] = [{ value: "", label: "الكل" }];
    const sortedTypes = Array.from(counts.entries()).sort((a, b) => b[1].count - a[1].count);

    for (const [typeKey, d] of sortedTypes) {
      const num = Number(typeKey);
      const label = formatVehicleRegistrationType(num as VehicleRegistrationType);
      opts.push({
        value: typeKey,
        label,
        sublabel: `${d.vehicleIds.size} مركبة (${d.count} تنبيه)`,
      });
    }

    if (registrationFilter && !opts.some((o) => o.value === registrationFilter)) {
      const num = Number(registrationFilter);
      const label = formatVehicleRegistrationType(num as VehicleRegistrationType);
      opts.push({
        value: registrationFilter,
        label,
      });
    }

    return opts;
  }, [displayItems, vehiclesMap, registrationFilter]);

  const getDocTypeInfo = (type: string): { key: string; label: string } => {
    switch (type) {
      case "Registration":
      case "Istimara":
        return { key: "Istimara", label: "استمارة سير" };
      case "InsurancePolicy":
      case "Insurance":
        return { key: "Insurance", label: "بوليصة تأمين" };
      case "Inspection":
      case "Fahs":
        return { key: "Inspection", label: "فحص دوري" };
      case "OperationCard":
        return { key: "OperationCard", label: "كرت تشغيل" };
      case "Permit":
      case "Permission":
      case "VehiclePermit":
      case "RiderPermit":
        return { key: "Permit", label: "تصريح / تفويض" };
      default:
        return { key: type, label: type };
    }
  };

  const docTypeOptions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();

    for (const item of displayItems) {
      const { key, label } = getDocTypeInfo(item.type);
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { label, count: 1 });
      }
    }

    const opts: FilterOption[] = [{ value: "", label: "الكل" }];
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1].count - a[1].count);

    for (const [key, d] of sorted) {
      opts.push({
        value: key,
        label: d.label,
        sublabel: `${d.count} تنبيه`,
        count: d.count,
      });
    }

    if (docTypeFilter && !opts.some((o) => o.value === docTypeFilter)) {
      const { label } = getDocTypeInfo(docTypeFilter);
      opts.push({
        value: docTypeFilter,
        label,
      });
    }

    return opts;
  }, [displayItems, docTypeFilter]);

  const filtered = useMemo(() => {
    return displayItems.filter((item) => {
      const v = vehiclesMap[item.vehicleId];

      if (modelFilter) {
        const mfg = (v?.manufacturer || "").trim();
        const mdl = (v?.model || "").trim();
        const label = [mfg, mdl].filter(Boolean).join(" ").trim();
        if (label !== modelFilter) return false;
      }

      if (registrationFilter) {
        if (v?.registrationType === undefined || v?.registrationType === null) return false;
        if (String(v.registrationType) !== registrationFilter) return false;
      }

      if (docTypeFilter) {
        const { key } = getDocTypeInfo(item.type);
        if (key !== docTypeFilter) return false;
      }

      if (!search) return true;
      const searchLower = search.trim().toLowerCase();
      const plateAr = item.plateNumberAr || item.plateNumber || v?.plateNumberAr || "";
      const plateEn = item.plateNumberEn || v?.plateNumberEn || "";
      const plateCombined = v?.plateLettersAr && v?.plateDigits ? `${v.plateLettersAr} ${v.plateDigits}` : "";
      const serial = item.serialNumber || v?.serialNumber || v?.chassisNumber || "";
      const asset = item.assetNumber || "";
      const mfg = v?.manufacturer || "";
      const mdl = v?.model || "";

      return (
        plateAr.toLowerCase().includes(searchLower) ||
        plateEn.toLowerCase().includes(searchLower) ||
        plateCombined.toLowerCase().includes(searchLower) ||
        serial.toLowerCase().includes(searchLower) ||
        asset.toLowerCase().includes(searchLower) ||
        mfg.toLowerCase().includes(searchLower) ||
        mdl.toLowerCase().includes(searchLower)
      );
    });
  }, [displayItems, search, vehiclesMap, modelFilter, registrationFilter, docTypeFilter]);

  const expiredOrMissingCount = useMemo(() => {
    return filtered.filter(
      (i) =>
        (i.status ?? i.permitStatus) === VehicleComplianceDueStatus.Expired ||
        (i.status ?? i.permitStatus) === VehicleComplianceDueStatus.Missing
    ).length;
  }, [filtered]);

  const dueTodayCount = useMemo(() => {
    return filtered.filter(
      (i) => (i.status ?? i.permitStatus) === VehicleComplianceDueStatus.DueToday
    ).length;
  }, [filtered]);

  const upcomingCount = useMemo(() => {
    return filtered.filter(
      (i) => (i.status ?? i.permitStatus) === VehicleComplianceDueStatus.Upcoming
    ).length;
  }, [filtered]);

  if (!can("fleet.compliance.read")) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800">صلاحية غير كافية</h2>
      </div>
    );
  }

  const renderStatus = (status: VehicleComplianceDueStatus) => {
    switch (status) {
      case VehicleComplianceDueStatus.Valid:
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">ساري</Badge>;
      case VehicleComplianceDueStatus.Upcoming:
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">قريب الانتهاء</Badge>;
      case VehicleComplianceDueStatus.DueToday:
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200">ينتهي اليوم</Badge>;
      case VehicleComplianceDueStatus.Expired:
        return <Badge className="bg-red-50 text-red-700 border-red-200">منتهي</Badge>;
      case VehicleComplianceDueStatus.Missing:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-300">مفقود (غير مسجل)</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getDocTypeName = (type: string) => {
    return getDocTypeInfo(type).label;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <ShieldCheck className="h-7 w-7 text-emerald-600" />
            ملاحظات التراخيص
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            متابعة تجديد الاستمارات، الفحص الدوري والتأمين للمركبات
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <Filter className="h-4 w-4" /> فحص الرصيد لتاريخ:
            </div>
            <div>
              <Input type="date" value={checkDate} onChange={(e) => setCheckDate(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-1 min-w-[280px] gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث برقم اللوحة أو الموديل أو الصانع أو الرقم التسلسلي..."
                className="pr-10"
              />
            </div>
            <Button variant="secondary" onClick={loadData} disabled={loading} className="px-3">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
            </Button>
          </div>
        </div>

        {/* Active Filters Bar */}
        {(modelFilter || registrationFilter || docTypeFilter) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--border)] text-xs">
            <span className="text-[var(--muted)] text-[11px] font-semibold ml-1">الفلاتر النشطة:</span>
            {modelFilter && (
              <Badge className="bg-blue-50 text-[#1167c9] border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 gap-1 pl-1.5 font-medium">
                الموديل: {modelFilter}
                <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setModelFilter("")} />
              </Badge>
            )}
            {registrationFilter && (
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 gap-1 pl-1.5 font-medium">
                نوع التسجيل: {formatVehicleRegistrationType(Number(registrationFilter) as VehicleRegistrationType)}
                <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setRegistrationFilter("")} />
              </Badge>
            )}
            {docTypeFilter && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 gap-1 pl-1.5 font-medium">
                نوع الوثيقة: {docTypeOptions.find((o) => o.value === docTypeFilter)?.label || docTypeFilter}
                <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => setDocTypeFilter("")} />
              </Badge>
            )}
            <Button
              variant="secondary"
              onClick={clearAllFilters}
              className="gap-1.5 text-xs h-7 min-h-0 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900/50 dark:hover:bg-rose-950/30 mr-auto"
            >
              <RefreshCw className="h-3 w-3" /> مسح الفلاتر
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <span>{error}</span>
          </div>
          <Button variant="secondary" onClick={loadData} className="gap-1 text-xs px-3">
            <RefreshCw className="h-3.5 w-3.5" /> إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-sm">
          <div className="text-sm font-bold text-red-800">منتهي أو مفقود</div>
          <div className="text-3xl font-bold text-red-600 mt-2">{expiredOrMissingCount}</div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 shadow-sm">
          <div className="text-sm font-bold text-orange-800">ينتهي اليوم</div>
          <div className="text-3xl font-bold text-orange-600 mt-2">{dueTodayCount}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
          <div className="text-sm font-bold text-blue-800">قريب الانتهاء (30 يوم)</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">{upcomingCount}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-[var(--muted)]">جارٍ التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)]">
            <ShieldCheck className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-lg font-bold">
              {search || modelFilter || registrationFilter || docTypeFilter
                ? "لا توجد تنبيهات مطابقة لمعايير البحث والتصفية"
                : "جميع التراخيص سارية أو لا توجد تنبيهات"}
            </p>
            {(search || modelFilter || registrationFilter || docTypeFilter) && (
              <Button
                variant="secondary"
                className="mt-4 gap-1 text-xs px-3 py-1.5 mx-auto"
                onClick={clearAllFilters}
              >
                <RefreshCw className="h-3.5 w-3.5" /> مسح التصفية والبحث
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">اللوحة / الرقم التسلسلي</th>
                  <th className="px-6 py-4 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <span>الموديل / الصانع</span>
                      <TableHeaderColumnFilter
                        label="الموديل"
                        value={modelFilter}
                        onChange={setModelFilter}
                        options={modelOptions}
                        placeholder="تصفية بالموديل..."
                      />
                    </div>
                  </th>
                  <th className="px-6 py-4 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <span>نوع التسجيل</span>
                      <TableHeaderColumnFilter
                        label="نوع التسجيل"
                        value={registrationFilter}
                        onChange={setRegistrationFilter}
                        options={registrationTypeOptions}
                        placeholder="تصفية بنوع التسجيل..."
                      />
                    </div>
                  </th>
                  <th className="px-6 py-4 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <span>نوع الوثيقة</span>
                      <TableHeaderColumnFilter
                        label="نوع الوثيقة"
                        value={docTypeFilter}
                        onChange={setDocTypeFilter}
                        options={docTypeOptions}
                        placeholder="تصفية بنوع الوثيقة..."
                      />
                    </div>
                  </th>
                  <th className="px-6 py-4 whitespace-nowrap">تاريخ الانتهاء</th>
                  <th className="px-6 py-4 whitespace-nowrap">الحالة</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((item, idx) => (
                  <tr
                    key={`${item.vehicleId}-${item.type}-${idx}`}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-6 py-4">
                      {(() => {
                        const v = vehiclesMap[item.vehicleId];
                        const plateAr = item.plateNumberAr || item.plateNumber || v?.plateNumberAr;
                        const plateLettersDigits = v?.plateLettersAr && v?.plateDigits ? `${v.plateLettersAr} ${v.plateDigits}` : null;
                        const plateDisplay = plateAr || plateLettersDigits || item.plateNumberEn || v?.plateNumberEn;
                        const plateEn = item.plateNumberEn || v?.plateNumberEn;
                        const serialDisplay = item.serialNumber || v?.serialNumber || v?.chassisNumber;

                        return (
                          <Link
                            href={`/admin/fleet/vehicles/${item.vehicleId}`}
                            className="group block space-y-1 hover:opacity-90"
                          >
                            <div>
                              {plateDisplay ? (
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="font-bold border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 text-xs shadow-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 group-hover:border-[#1167c9] group-hover:text-[#1167c9] transition-colors">
                                    {plateDisplay}
                                  </span>
                                  {plateEn && plateEn !== plateDisplay && (
                                    <span className="text-[11px] text-[var(--muted)] font-mono">{plateEn}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-[var(--muted)]">بدون لوحة</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-[11px] text-[var(--muted)]">الرقم التسلسلي:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#1167c9]">
                                {serialDisplay || "—"}
                              </span>
                            </div>
                          </Link>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const v = vehiclesMap[item.vehicleId];
                        const mfg = v?.manufacturer?.trim() || "";
                        const mdl = v?.model?.trim() || "";
                        const fullModel = [mfg, mdl].filter(Boolean).join(" ");
                        return fullModel ? (
                          <span className="font-bold text-slate-800 dark:text-slate-100">{fullModel}</span>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">—</span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const v = vehiclesMap[item.vehicleId];
                        if (v?.registrationType === undefined || v?.registrationType === null) {
                          return <span className="text-xs text-[var(--muted)]">—</span>;
                        }
                        return (
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              v.registrationType === VehicleRegistrationType.PublicTransport ||
                              Number(v.registrationType) === VehicleRegistrationType.PublicTransport
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                                : v.registrationType === VehicleRegistrationType.PrivateTransport ||
                                  Number(v.registrationType) === VehicleRegistrationType.PrivateTransport
                                ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
                                : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                            }`}
                          >
                            {formatVehicleRegistrationType(v.registrationType)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                      {getDocTypeName(item.type)}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {formatDate(item.expiryDate || item.permitEndDate)}
                    </td>
                    <td className="px-6 py-4">
                      {renderStatus(item.status ?? item.permitStatus!)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/admin/fleet/vehicles/${item.vehicleId}`}
                        className="text-sm font-bold text-[#1167c9] hover:underline"
                      >
                        تحديث البيانات
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
