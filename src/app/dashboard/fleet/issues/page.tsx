"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getVehicleIssues, getVehicles, getVehicleAssignment } from "@/lib/fleet/api";
import { listRiders } from "@/lib/workforce/api";
import { formatVehicleIssueCategory } from "@/lib/fleet/formatters";
import {
  VehicleIssueStatus,
  VehicleIssueCategory,
  VehicleIssueSeverity,
  type VehicleIssueSummaryResponse,
  type VehicleSummaryResponse,
} from "@/lib/fleet/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Input } from "@/components/ui/Input";
import { Wrench, RefreshCw, AlertTriangle, Filter, Plus, Search, Eye, Car, CheckCircle2 } from "lucide-react";
import { CreateIssueModal } from "./components/CreateIssueModal";
import { IssueDetailsModal } from "./components/IssueDetailsModal";
import { ResolveIssueModal } from "./components/ResolveIssueModal";
import Link from "next/link";

import { useSearchParams } from "next/navigation";

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().replace("T", " ").substring(0, 16);
  } catch {
    return dateStr;
  }
}

function IssuesPageContent() {
  const { can } = useAuth();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search");

  const [data, setData] = useState<VehicleIssueSummaryResponse[]>([]);
  const [vehiclesMap, setVehiclesMap] = useState<Record<string, VehicleSummaryResponse>>({});
  const [assignmentsRiderMap, setAssignmentsRiderMap] = useState<Record<string, string>>({});
  const [ridersMap, setRidersMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(urlSearch || "");

  useEffect(() => {
    if (urlSearch) {
      setSearch(urlSearch);
    }
  }, [urlSearch]);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIssue, setSelectedIssue] = useState<VehicleIssueSummaryResponse | null>(null);
  const [resolveTargetIssue, setResolveTargetIssue] = useState<VehicleIssueSummaryResponse | null>(null);
  const [resolveModalMode, setResolveModalMode] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [issuesRes, vehiclesRes, ridersRes] = await Promise.allSettled([
        getVehicleIssues({
          status: statusFilter || undefined,
          page,
          pageSize: 50,
        }),
        getVehicles({ pageSize: 200 }),
        listRiders().catch(() => []),
      ]);

      let loadedIssues: VehicleIssueSummaryResponse[] = [];
      if (issuesRes.status === "fulfilled") {
        loadedIssues = issuesRes.value.items || [];
        console.log("Loaded Issues:", loadedIssues);
        setData(loadedIssues);
      }
      if (vehiclesRes.status === "fulfilled") {
        const vMap: Record<string, VehicleSummaryResponse> = {};
        (vehiclesRes.value.items || []).forEach((v) => {
          vMap[v.id] = v;
        });
        setVehiclesMap(vMap);
      }
      if (ridersRes.status === "fulfilled" && Array.isArray(ridersRes.value)) {
        const rMap: Record<string, string> = {};
        ridersRes.value.forEach((r) => {
          if (r.id) rMap[r.id] = r.fullNameAr || r.fullNameEn || "";
          if (r.employeeId) rMap[r.employeeId] = r.fullNameAr || r.fullNameEn || "";
        });
        setRidersMap(rMap);
      }

      // Fetch assignment rider names specifically for related assignments linked to the issue
      const relAssignmentIds = Array.from(
        new Set(loadedIssues.map((i) => i.relatedAssignmentId).filter(Boolean))
      ) as string[];

      if (relAssignmentIds.length > 0) {
        const assignmentPromises = relAssignmentIds.map((id) =>
          getVehicleAssignment(id)
            .then((a) => ({
              id,
              name:
                a?.riderName ||
                (a as any)?.actualRiderName ||
                (a as any)?.employeeName ||
                (a as any)?.selectedRiderNameAr ||
                a?.realRider?.name ||
                (a?.riderProfileId ? ridersMap[a.riderProfileId] : null) ||
                null,
            }))
            .catch(() => ({ id, name: null }))
        );
        const results = await Promise.all(assignmentPromises);
        const aMap: Record<string, string> = {};
        results.forEach((r) => {
          if (r.name) {
            aMap[r.id] = r.name;
          }
        });
        setAssignmentsRiderMap(aMap);
      }
    } catch (e) {
      console.error("Failed to load issues or vehicles:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, statusFilter]);

  const filteredData = data.filter((item) => {
    if (!search) return true;
    const v = vehiclesMap[item.vehicleId];
    const q = search.toLowerCase();
    const riderName =
      item.rider?.realRider?.name ||
      item.rider?.riderName ||
      (item as any).riderNameAr ||
      (item as any).riderName ||
      (item as any).riderFullName ||
      ((item as any).riderId ? ridersMap[(item as any).riderId] : null) ||
      (item.rider?.riderProfileId ? ridersMap[item.rider.riderProfileId] : null) ||
      (item.rider?.employeeId ? ridersMap[item.rider.employeeId] : null) ||
      (item.relatedAssignmentId ? assignmentsRiderMap[item.relatedAssignmentId] : null);

    return (
      String(item.issueNumber).toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      (v?.plateNumberAr && v.plateNumberAr.toLowerCase().includes(q)) ||
      (v?.plateNumberEn && v.plateNumberEn.toLowerCase().includes(q)) ||
      (v?.serialNumber && v.serialNumber.toLowerCase().includes(q)) ||
      (v?.assetNumber && v.assetNumber.toLowerCase().includes(q)) ||
      (riderName && riderName.toLowerCase().includes(q)) ||
      (item.category !== undefined &&
        item.category !== null &&
        formatVehicleIssueCategory(item.category).toLowerCase().includes(q))
    );
  });

  if (!can("fleet.issues.read")) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800">صلاحية غير كافية</h2>
      </div>
    );
  }

  const renderStatus = (status: VehicleIssueStatus) => {
    switch (status) {
      case VehicleIssueStatus.Open:
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">مفتوح</Badge>;
      case VehicleIssueStatus.UnderReview:
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200">قيد المراجعة</Badge>;
      case VehicleIssueStatus.Resolved:
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">تم الحل</Badge>;
      case VehicleIssueStatus.Closed:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-300">مغلق</Badge>;
      case VehicleIssueStatus.Rejected:
        return <Badge className="bg-red-50 text-red-700 border-red-200">مرفوض</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const renderSeverity = (severity: VehicleIssueSeverity) => {
    switch (severity) {
      case VehicleIssueSeverity.Low:
        return <span className="text-slate-500 text-xs">منخفض</span>;
      case VehicleIssueSeverity.Medium:
        return <span className="text-blue-600 text-xs font-bold">متوسط</span>;
      case VehicleIssueSeverity.High:
        return <span className="text-orange-600 text-xs font-bold">عالي</span>;
      case VehicleIssueSeverity.Critical:
        return <span className="text-red-600 text-xs font-bold">حرج</span>;
      default:
        return <span>{severity}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Wrench className="h-7 w-7 text-[#1167c9]" />
            سجل الأعطال والمشاكل
          </h1>
          <p className="mt-1 text-sm text-slate-500">إدارة أعطال المركبات والصيانة وأدلة المشاكل</p>
        </div>
        {can("fleet.issues.manage") && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 bg-[#1167c9] hover:bg-[#0e56a8]"
          >
            <Plus className="h-4 w-4" /> تسجيل عطل جديد
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-4 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث برقم البلاغ، اسم السائق، اللوحة، الرقم التسلسلي، أو الوصف..."
              className="pr-10"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <Filter className="h-4 w-4" /> الحالة:
          </div>
          <div className="w-48">
            <SearchableSelect
              options={[
                { value: "", label: "الكل" },
                { value: VehicleIssueStatus.Open.toString(), label: "مفتوح" },
                { value: VehicleIssueStatus.UnderReview.toString(), label: "قيد المراجعة" },
                { value: VehicleIssueStatus.Resolved.toString(), label: "تم الحل" },
                { value: VehicleIssueStatus.Closed.toString(), label: "مغلق" },
                { value: VehicleIssueStatus.Rejected.toString(), label: "مرفوض" },
              ]}
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            />
          </div>
        </div>
        <Button variant="secondary" onClick={loadData} disabled={loading} className="px-3">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-[var(--muted)]">جارٍ التحميل...</div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted)]">
            <Wrench className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="text-lg font-bold">لا توجد بلاغات أعطال مطابقة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-4">رقم البلاغ</th>
                  <th className="px-6 py-4">المركبة (اللوحة / الرقم التسلسلي)</th>
                  <th className="px-6 py-4">تاريخ البلاغ</th>
                  <th className="px-6 py-4">التصنيف / الأهمية</th>
                  <th className="px-6 py-4">مسؤولية السائق</th>
                  <th className="px-6 py-4">التكلفة التقديرية</th>
                  <th className="px-6 py-4">الوصف</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4 text-center">التفاصيل والأدلة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredData.map((item) => {
                  const v = vehiclesMap[item.vehicleId];
                  const plateDisplay =
                    (item as any).plateNumberAr ||
                    (item as any).plateNumber ||
                    v?.plateNumberAr ||
                    v?.plateNumberEn ||
                    (v?.plateLettersAr && v?.plateDigits ? `${v.plateLettersAr} ${v.plateDigits}` : null) ||
                    v?.assetNumber ||
                    `مركبة #${item.vehicleId.slice(0, 8)}`;
                  const serialDisplay =
                    (item as any).serialNumber ||
                    v?.serialNumber ||
                    v?.chassisNumber ||
                    v?.assetNumber;
                  const riderNameDisplay =
                    item.rider?.realRider?.name ||
                    item.rider?.riderName ||
                    (item as any).riderNameAr ||
                    (item as any).riderName ||
                    (item as any).riderFullName ||
                    ((item as any).riderId ? ridersMap[(item as any).riderId] : null) ||
                    (item.rider?.riderProfileId ? ridersMap[item.rider.riderProfileId] : null) ||
                    (item.rider?.employeeId ? ridersMap[item.rider.employeeId] : null) ||
                    (item.relatedAssignmentId ? assignmentsRiderMap[item.relatedAssignmentId] : null);

                  return (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-[#1167c9]">
                        #{item.issueNumber}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/fleet/vehicles/${item.vehicleId}`}
                          className="hover:underline text-[#1167c9] group"
                        >
                          <div className="font-mono font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#1167c9] flex items-center gap-1.5">
                            <Car className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{plateDisplay}</span>
                          </div>
                          {serialDisplay && (
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5" dir="ltr">
                              S/N: {serialDisplay}
                            </div>
                          )}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-mono">{formatDateTime(item.reportedAtUtc)}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {formatVehicleIssueCategory(item.category)}
                        </div>
                        <div className="mt-1">{renderSeverity(item.severity)}</div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {item.isRiderResponsible !== undefined && item.isRiderResponsible !== null ? (
                          <div className="space-y-1">
                            <span
                              className={`inline-block font-bold rounded-md px-2 py-0.5 text-[11px] ${
                                item.isRiderResponsible
                                  ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900"
                                  : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900"
                              }`}
                            >
                              {item.isRiderResponsible ? "السائق مسؤول" : "عطل طبيعي / ميكانيكي"}
                            </span>
                            <div className="text-slate-900 dark:text-slate-100 font-bold text-xs pt-0.5">
                              {riderNameDisplay || <span className="text-slate-500 font-normal italic">السائق غير محدد</span>}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-slate-400 font-medium">—</span>
                            {riderNameDisplay && (
                              <div className="text-slate-900 dark:text-slate-100 font-bold text-xs pt-0.5">
                                {riderNameDisplay}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                        {item.estimatedRepairCost !== undefined && item.estimatedRepairCost !== null
                          ? `${Number(item.estimatedRepairCost).toFixed(2)} SAR`
                          : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="line-clamp-2 max-w-xs text-slate-700 dark:text-slate-300">{item.description}</div>
                        {item.blocksOperation && (
                          <Badge className="mt-1 bg-red-50 text-red-700 border-red-200 text-[10px] px-1">
                            يعيق التشغيل
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">{renderStatus(item.status)}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {(item.status === VehicleIssueStatus.Open || item.status === VehicleIssueStatus.UnderReview) && (
                            <Button
                              onClick={() => {
                                setResolveTargetIssue(item);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 px-2.5 py-1 h-auto"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>حل البلاغ</span>
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSelectedIssue(item);
                              setResolveModalMode(false);
                            }}
                            className="text-xs text-[#1167c9] hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1.5 px-2.5 py-1 h-auto border border-blue-200 dark:border-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                            <span>التفاصيل والأدلة</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateIssueModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          setIsCreateOpen(false);
          loadData();
        }}
      />

      <IssueDetailsModal
        isOpen={!!selectedIssue}
        onClose={() => {
          setSelectedIssue(null);
          setResolveModalMode(false);
        }}
        issue={selectedIssue}
        initialResolveMode={resolveModalMode}
        onSuccess={loadData}
      />

      <ResolveIssueModal
        isOpen={!!resolveTargetIssue}
        onClose={() => setResolveTargetIssue(null)}
        issue={resolveTargetIssue}
        vehicleDisplayInfo={
          resolveTargetIssue
            ? {
                plateDisplay:
                  (resolveTargetIssue as any).plateNumberAr ||
                  (resolveTargetIssue as any).plateNumber ||
                  vehiclesMap[resolveTargetIssue.vehicleId]?.plateNumberAr ||
                  vehiclesMap[resolveTargetIssue.vehicleId]?.plateNumberEn ||
                  vehiclesMap[resolveTargetIssue.vehicleId]?.assetNumber,
                serialDisplay:
                  (resolveTargetIssue as any).serialNumber ||
                  vehiclesMap[resolveTargetIssue.vehicleId]?.serialNumber,
              }
            : undefined
        }
        riderNameDisplay={
          resolveTargetIssue
            ? resolveTargetIssue.rider?.realRider?.name ||
              resolveTargetIssue.rider?.riderName ||
              (resolveTargetIssue as any).riderNameAr ||
              (resolveTargetIssue as any).riderName ||
              (resolveTargetIssue as any).riderFullName ||
              ((resolveTargetIssue as any).riderId ? ridersMap[(resolveTargetIssue as any).riderId] : null) ||
              (resolveTargetIssue.rider?.riderProfileId ? ridersMap[resolveTargetIssue.rider.riderProfileId] : null) ||
              (resolveTargetIssue.rider?.employeeId ? ridersMap[resolveTargetIssue.rider.employeeId] : null) ||
              (resolveTargetIssue.relatedAssignmentId ? assignmentsRiderMap[resolveTargetIssue.relatedAssignmentId] : undefined)
            : undefined
        }
        riderEmpIdDisplay={
          resolveTargetIssue
            ? resolveTargetIssue.rider?.realRider?.id ||
              resolveTargetIssue.rider?.employeeId ||
              (resolveTargetIssue as any).employeeId ||
              (resolveTargetIssue as any).riderId ||
              resolveTargetIssue.rider?.riderProfileId
            : undefined
        }
        onSuccess={loadData}
      />
    </div>
  );
}

export default function IssuesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-bold text-slate-500">جاري التحميل...</div>}>
      <IssuesPageContent />
    </Suspense>
  );
}
