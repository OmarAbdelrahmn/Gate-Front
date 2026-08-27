"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getVehicleIssues } from "@/lib/fleet/api";
import { VehicleIssueStatus, VehicleIssueCategory, VehicleIssueSeverity, type VehicleIssueSummaryResponse } from "@/lib/fleet/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Input } from "@/components/ui/Input";
import { Wrench, RefreshCw, AlertTriangle, Filter, Plus, Search } from "lucide-react";
import { CreateIssueModal } from "./components/CreateIssueModal";
import Link from "next/link";

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

export default function IssuesPage() {
  const { can } = useAuth();
  const [data, setData] = useState<VehicleIssueSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getVehicleIssues({
        status: statusFilter || undefined,
        page,
        pageSize: 50,
      });
      setData(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, statusFilter]);

  const filteredData = data.filter(item => 
    !search || 
    String(item.issueNumber).includes(search) || 
    item.description.toLowerCase().includes(search.toLowerCase()) || 
    (item.category !== undefined && item.category !== null && String(item.category).toLowerCase().includes(search.toLowerCase()))
  );

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
      case VehicleIssueStatus.Open: return <Badge className="bg-blue-50 text-blue-700 border-blue-200">مفتوح</Badge>;
      case VehicleIssueStatus.UnderReview: return <Badge className="bg-orange-50 text-orange-700 border-orange-200">قيد المراجعة</Badge>;
      case VehicleIssueStatus.Resolved: return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">تم الحل</Badge>;
      case VehicleIssueStatus.Closed: return <Badge className="bg-slate-100 text-slate-700 border-slate-300">مغلق</Badge>;
      case VehicleIssueStatus.Rejected: return <Badge className="bg-red-50 text-red-700 border-red-200">مرفوض</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const renderSeverity = (severity: VehicleIssueSeverity) => {
    switch (severity) {
      case VehicleIssueSeverity.Low: return <span className="text-slate-500 text-xs">منخفض</span>;
      case VehicleIssueSeverity.Medium: return <span className="text-blue-600 text-xs font-bold">متوسط</span>;
      case VehicleIssueSeverity.High: return <span className="text-orange-600 text-xs font-bold">عالي</span>;
      case VehicleIssueSeverity.Critical: return <span className="text-red-600 text-xs font-bold">حرج</span>;
      default: return <span>{severity}</span>;
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
          <p className="mt-1 text-sm text-slate-500">
            إدارة أعطال المركبات والصيانة
          </p>
        </div>
        {can("fleet.issues.manage") && (
          <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 bg-[#1167c9] hover:bg-[#0e56a8]">
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
              placeholder="بحث برقم البلاغ أو الوصف..."
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
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
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
                  <th className="px-6 py-4">المركبة</th>
                  <th className="px-6 py-4">تاريخ البلاغ</th>
                  <th className="px-6 py-4">التصنيف / الأهمية</th>
                  <th className="px-6 py-4">الوصف</th>
                  <th className="px-6 py-4">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredData.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-mono font-bold text-[#1167c9]">
                      #{item.issueNumber}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold">
                      <Link href={`/dashboard/fleet/vehicles/${item.vehicleId}`} className="hover:underline hover:text-[#1167c9]">
                        المركبة المعنية
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {formatDateTime(item.reportedAtUtc)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold">{item.category}</div>
                      <div className="mt-1">{renderSeverity(item.severity)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="line-clamp-2 max-w-xs">{item.description}</div>
                      {item.blocksOperation && <Badge className="mt-1 bg-red-50 text-red-700 border-red-200 text-[10px] px-1">يعيق التشغيل</Badge>}
                    </td>
                    <td className="px-6 py-4">
                      {renderStatus(item.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateIssueModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={() => { setIsCreateOpen(false); loadData(); }} />
    </div>
  );
}
