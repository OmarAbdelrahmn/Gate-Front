// src/app/admin/jahez/treasury/petroapp/page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { TreasuryNavHeader } from "@/components/jahez/treasury/TreasuryNavHeader";
import {
  getPetroAppEvidence,
  createPetroAppEvidence,
  getTreasuryReport,
  generateTreasuryIdempotencyKey,
  type PetroEvidence,
  type PetroEvidenceCreate,
  type PetroReconciliationRow,
  type TreasuryFilter,
  PetroEvidenceKind,
} from "@/lib/jahez/treasury/api";
import {
  formatSAR,
  getRiyadhTodayDate,
  getRiyadhFirstDayOfMonth,
  getPetroEvidenceKindLabel,
  formatRiyadhDateTime,
  getSponsorDisplayName,
} from "@/lib/jahez/treasury/utils";
import { listSponsors, type Sponsor } from "@/lib/workforce/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Modal } from "@/components/jahez/treasury/TreasuryModal";
import { toast } from "@/components/ui/Toast";
import {
  Fuel,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2, 
  AlertCircle,
  FileText,
  RotateCcw,
  Scale,
  Calendar,
} from "lucide-react";

export default function TreasuryPetroAppPage() {
  const { can, user } = useAuth();

  const isAdmin =
    Boolean(user?.roles?.some((r) => r.toLowerCase() === "admin")) ||
    can("admin") ||
    can("*");

  const canRead = can("jahez.treasury.read") || isAdmin;
  const canCreateEvidence = can("jahez.treasury.petroapp-evidence.create") || isAdmin;

  // Active Tab: "reconciliation" | "evidence"
  const [activeTab, setActiveTab] = useState<"reconciliation" | "evidence">("reconciliation");

  // Filter dates
  const today = useMemo(() => getRiyadhTodayDate(), []);
  const firstOfMonth = useMemo(() => getRiyadhFirstDayOfMonth(), []);
  const [fromDate, setFromDate] = useState<string>(firstOfMonth);
  const [toDate, setToDate] = useState<string>(today);
  const [selectedSponsorId, setSelectedSponsorId] = useState<string>("");

  // Data states
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [evidenceList, setEvidenceList] = useState<PetroEvidence[]>([]);
  const [reconRows, setReconRows] = useState<PetroReconciliationRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Evidence Modal State
  const [isCreateEvidenceOpen, setIsCreateEvidenceOpen] = useState(false);
  const [submittingEvidence, setSubmittingEvidence] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState<PetroEvidenceCreate>({
    sponsorId: "",
    kind: PetroEvidenceKind.Funding,
    businessDate: today,
    amount: 0,
    allocatedCollections: 0,
    reference: "",
    reason: "",
    replacesId: null,
  });

  const loadSponsors = useCallback(async () => {
    try {
      const sps = await listSponsors();
      setSponsors(sps);
    } catch {
      // non-blocking
    }
  }, []);

  // Load Evidence list
  const loadEvidence = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const filter: TreasuryFilter = {
        fromDate,
        toDate,
        page: 1,
        pageSize: 100,
      };
      if (selectedSponsorId) filter.sponsorId = selectedSponsorId;

      const res = await getPetroAppEvidence(filter);
      setEvidenceList(res?.items || []);
    } catch (err: any) {
      toast.error(err.message || "تعذر جلب أدلة بترو آب");
    } finally {
      setLoading(false);
    }
  }, [canRead, fromDate, toDate, selectedSponsorId]);

  // Load Fuel Reconciliation Report
  const loadReconciliation = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const filter: TreasuryFilter = {
        fromDate,
        toDate,
      };
      if (selectedSponsorId) filter.sponsorId = selectedSponsorId;

      const report = await getTreasuryReport("petroapp", filter);
      setReconRows(report?.fuel || []);
    } catch (err: any) {
      toast.error(err.message || "تعذر جلب تقرير مطابقة بترو آب");
    } finally {
      setLoading(false);
    }
  }, [canRead, fromDate, toDate, selectedSponsorId]);

  useEffect(() => {
    loadSponsors();
  }, [loadSponsors]);

  useEffect(() => {
    if (activeTab === "reconciliation") {
      loadReconciliation();
    } else {
      loadEvidence();
    }
  }, [activeTab, loadReconciliation, loadEvidence]);

  // Sponsors Map
  const sponsorsMap = useMemo(() => {
    const map = new Map<string, string>();
    sponsors.forEach((s) => map.set(s.id, getSponsorDisplayName(s)));
    return map;
  }, [sponsors]);

  // Open Create Evidence Modal
  const openCreateModal = (replacesEvidence?: PetroEvidence) => {
    setEvidenceForm({
      sponsorId: replacesEvidence ? replacesEvidence.sponsorId : selectedSponsorId || "",
      kind: replacesEvidence ? replacesEvidence.kind : PetroEvidenceKind.Funding,
      businessDate: replacesEvidence ? replacesEvidence.businessDate : today,
      amount: replacesEvidence ? replacesEvidence.amount : 0,
      allocatedCollections: replacesEvidence ? replacesEvidence.allocatedCollections : 0,
      reference: "",
      reason: replacesEvidence ? `استبدال وتصحيح الدليل رقم ${replacesEvidence.reference}` : "",
      replacesId: replacesEvidence ? replacesEvidence.id : null,
    });
    setIsCreateEvidenceOpen(true);
  };

  // Handle Create / Replace Evidence Submit
  const handleEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceForm.sponsorId) {
      toast.error("يرجى اختيار الكفيل");
      return;
    }
    if (evidenceForm.amount < 0 || evidenceForm.allocatedCollections < 0) {
      toast.error("المبالغ يجب ألا تكون سالبة");
      return;
    }
    if (!evidenceForm.reference.trim() || !evidenceForm.reason.trim()) {
      toast.error("المرجع والسبب مطلوبان");
      return;
    }

    setSubmittingEvidence(true);
    try {
      const key = generateTreasuryIdempotencyKey("petro-ev");
      await createPetroAppEvidence(evidenceForm, key);
      toast.success(
        evidenceForm.replacesId ? "تم استبدال الدليل بنجاح" : "تم تسجيل دليل بترو آب بنجاح",
      );
      setIsCreateEvidenceOpen(false);
      loadEvidence();
      loadReconciliation();
    } catch (err: any) {
      toast.error(err.message || "فشل تسجيل دليل بترو آب (تأكد من عدم تكرار المرجع لنفس الكفيل)");
    } finally {
      setSubmittingEvidence(false);
    }
  };

  // Safe Null vs Zero display helper for reconciliation metrics
  const renderMetric = (val: number | null | undefined) => {
    if (val === null || val === undefined) {
      return (
        <span className="text-muted-foreground/60 italic text-[11px]" title="الدليل غير متاح">
          غير متوفر
        </span>
      );
    }
    return <span className="font-bold text-foreground font-mono">{formatSAR(val)}</span>;
  };

  return (
    <div className="space-y-6">
      <TreasuryNavHeader
        title="بترو آب"
        description="سجّل شحن المحفظة وكشف الرصيد، وقارنها بالمبالغ المحصلة واستهلاك الوقود."
        onRefresh={() => {
          if (activeTab === "reconciliation") loadReconciliation();
          else loadEvidence();
        }}
        isRefreshing={loading}
        extraActions={
          canCreateEvidence && (
            <Button
              size="sm"
              onClick={() => openCreateModal()}
              className="gap-2 shadow-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة شحن أو كشف رصيد</span>
            </Button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-border/80 gap-3 text-xs">
        <button
          onClick={() => setActiveTab("reconciliation")}
          className={`pb-2.5 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "reconciliation"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Scale className="h-3.5 w-3.5" />
          <span>التحصيل والشحن والاستهلاك</span>
        </button>

        <button
          onClick={() => setActiveTab("evidence")}
          className={`pb-2.5 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "evidence"
              ? "border-primary text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Fuel className="h-3.5 w-3.5" />
          <span>الشحن وكشوف الرصيد</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-xl border border-border bg-card p-3.5 text-xs">
        <div>
          <label className="block font-medium text-muted-foreground mb-1">من تاريخ</label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        <div>
          <label className="block font-medium text-muted-foreground mb-1">إلى تاريخ</label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        <div>
          <label className="block font-medium text-muted-foreground mb-1">الشركة (كفيل الحساب)</label>
          <SearchableSelect
            value={selectedSponsorId}
            onChange={setSelectedSponsorId}
            options={[
              { value: "", label: "جميع الكفلاء" },
              ...sponsors.map((s) => ({
                value: s.id,
                label: getSponsorDisplayName(s),
              })),
            ]}
            placeholder="تصفية حسب الكفيل"
          />
        </div>

        <div className="flex items-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (activeTab === "reconciliation") loadReconciliation();
              else loadEvidence();
            }}
            disabled={loading}
            className="w-full h-9 gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث النتائج</span>
          </Button>
        </div>
      </div>

      {/* Tab 1: Fuel Reconciliation Report */}
      {activeTab === "reconciliation" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-3 px-3">الكفيل</th>
                    <th className="py-3 px-3">تحصيل مقاصة بترو آب</th>
                    <th className="py-3 px-3">التمويل المثبت</th>
                    <th className="py-3 px-3">التحصيل المخصص</th>
                    <th className="py-3 px-3">غير المخصص</th>
                    <th className="py-3 px-3">فرق التخصيص</th>
                    <th className="py-3 px-3">بيان الافتتاح</th>
                    <th className="py-3 px-3">بيان الختام</th>
                    <th className="py-3 px-3">الاستهلاك الشهري</th>
                    <th className="py-3 px-3 text-center">حالة المطابقة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                          <span>جاري احتساب مطابقة بترو آب...</span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!loading && reconRows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-muted-foreground">
                        لا توجد بيانات مطابقة لهذا النطاق الزمني والكفلاء.
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    reconRows.map((row) => {
                      const isMatched = row.status === "Matched";
                      const isDiff = row.status === "Difference";

                      return (
                        <tr key={row.sponsorId} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3 px-3 font-bold text-foreground whitespace-nowrap">
                            {row.sponsorNameAr || sponsorsMap.get(row.sponsorId) || "كفيل"}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold whitespace-nowrap">
                            {formatSAR(row.collections)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {renderMetric(row.funding)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {renderMetric(row.allocatedCollections)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {renderMetric(row.unallocatedCollections)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {renderMetric(row.fundingDifference)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {renderMetric(row.openingStatement)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {renderMetric(row.closingStatement)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {renderMetric(row.importedConsumption)}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {isMatched ? (
                              <Badge tone="green" className="text-[10px]">
                                متطابق
                              </Badge>
                            ) : isDiff ? (
                              <Badge tone="red" className="text-[10px]">
                                يوجد فرق مالي
                              </Badge>
                            ) : (
                              <Badge tone="orange" className="text-[10px]">
                                غير مدقق
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Evidence List & Replacement */}
      {activeTab === "evidence" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              <Fuel className="h-4 w-4 text-primary" />
              <span>أدلة التمويل وبيانات رصيد المحفظة المسجلة</span>
            </h3>
            <span className="text-xs text-muted-foreground">{evidenceList.length} دليل مسجل</span>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="py-3 px-3">تاريخ العمل</th>
                    <th className="py-3 px-3">الكفيل</th>
                    <th className="py-3 px-3">نوع الدليل</th>
                    <th className="py-3 px-3">المبلغ</th>
                    <th className="py-3 px-3">التحصيل المخصص</th>
                    <th className="py-3 px-3">المرجع</th>
                    <th className="py-3 px-3">السبب / الملاحظات</th>
                    <th className="py-3 px-3">حالة الاستبدال</th>
                    <th className="py-3 px-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                          <span>جاري تحميل أدلة بترو آب...</span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!loading && evidenceList.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-muted-foreground">
                        لا توجد أدلة مسجلة في هذا النطاق الزمني.
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    evidenceList.map((ev) => (
                      <tr key={ev.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">
                          {ev.businessDate}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-foreground whitespace-nowrap">
                          {ev.sponsorNameAr || sponsorsMap.get(ev.sponsorId) || "كفيل"}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px]">
                            {getPetroEvidenceKindLabel(ev.kind)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold font-mono whitespace-nowrap">
                          {formatSAR(ev.amount)}
                        </td>
                        <td className="py-2.5 px-3 font-mono whitespace-nowrap text-muted-foreground">
                          {ev.kind === PetroEvidenceKind.Funding
                            ? formatSAR(ev.allocatedCollections)
                            : "—"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] max-w-[180px] truncate">
                          {ev.reference}
                        </td>
                        <td className="py-2.5 px-3 max-w-[200px] truncate" title={ev.reason}>
                          {ev.reason}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {ev.replacesId ? (
                            <span className="text-[11px] text-amber-600 font-medium">
                              بديل لدليل سابق
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">أصلي</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {canCreateEvidence && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                              onClick={() => openCreateModal(ev)}
                              title="استبدال وتصحيح هذا الدليل"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>تصحيح</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create / Replace Evidence Modal */}
      <Modal
        isOpen={isCreateEvidenceOpen}
        onClose={() => setIsCreateEvidenceOpen(false)}
        title={
          evidenceForm.replacesId ? "استبدال وتصحيح دليل بترو آب" : "تسجيل دليل بترو آب جديد"
        }
      >
        <form onSubmit={handleEvidenceSubmit} className="space-y-4 text-xs">
          {evidenceForm.replacesId && (
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
              تنبيه: سيتم حفظ الأصل في سجل الأدلة وسيحل الدليل الجديد محله في الحسابات المالية
              وتقرير المطابقة.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                الكفيل الخارجي *
              </label>
              <SearchableSelect
                value={evidenceForm.sponsorId}
                onChange={(val) => setEvidenceForm({ ...evidenceForm, sponsorId: val })}
                options={sponsors.map((s) => ({
                  value: s.id,
                  label: getSponsorDisplayName(s),
                }))}
                placeholder="اختر كفيل الدليل"
              />
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">نوع الدليل *</label>
              <SearchableSelect
                value={String(evidenceForm.kind)}
                onChange={(val) =>
                  setEvidenceForm({
                    ...evidenceForm,
                    kind: Number(val) as PetroEvidenceKind,
                    allocatedCollections: Number(val) === PetroEvidenceKind.Statement ? 0 : evidenceForm.allocatedCollections,
                  })
                }
                options={[
                  { value: "1", label: "دليل تمويل محفظة" },
                  { value: "2", label: "رصيد كشف المحفظة" },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-muted-foreground mb-1">تاريخ العمل *</label>
              <Input
                type="date"
                required
                max={today}
                value={evidenceForm.businessDate}
                onChange={(e) =>
                  setEvidenceForm({ ...evidenceForm, businessDate: e.target.value })
                }
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                المبلغ بالريال السعودي *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={evidenceForm.amount}
                onChange={(e) =>
                  setEvidenceForm({ ...evidenceForm, amount: parseFloat(e.target.value) || 0 })
                }
                className="h-9 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                التحصيل المخصص (لأدلة التمويل)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                disabled={evidenceForm.kind === PetroEvidenceKind.Statement}
                value={evidenceForm.allocatedCollections}
                onChange={(e) =>
                  setEvidenceForm({
                    ...evidenceForm,
                    allocatedCollections: parseFloat(e.target.value) || 0,
                  })
                }
                className="h-9 text-xs font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-muted-foreground mb-1">
              المرجع الخارجي الفريد *
            </label>
            <Input
              required
              placeholder="مثال: إشعار تمويل المحفظة / 1024"
              value={evidenceForm.reference}
              onChange={(e) => setEvidenceForm({ ...evidenceForm, reference: e.target.value })}
              className="h-9 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block font-medium text-muted-foreground mb-1">السبب والبيان *</label>
            <textarea
              required
              rows={2}
              placeholder="بيان تفاصيل الدليل..."
              value={evidenceForm.reason}
              onChange={(e) => setEvidenceForm({ ...evidenceForm, reason: e.target.value })}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateEvidenceOpen(false)}
              disabled={submittingEvidence}
            >
              إلغاء
            </Button>
            <Button type="submit" size="sm" disabled={submittingEvidence}>
              {submittingEvidence ? "جاري الحفظ..." : "حفظ الدليل"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
