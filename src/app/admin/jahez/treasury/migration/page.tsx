// src/app/admin/jahez/treasury/migration/page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { TreasuryNavHeader } from "@/components/jahez/treasury/TreasuryNavHeader";
import {
  getTreasuryReadiness,
  getTreasuryAttributionReviews,
  submitTreasuryAttribution,
  runTreasuryBackfill,
  verifyTreasuryAccountBalance,
  activateTreasury,
  getTreasuryAccounts,
  getTreasuryBalances,
  generateTreasuryIdempotencyKey,
  type TreasuryReadiness,
  type TreasuryAttributionReview,
  type TreasuryAccount,
  type TreasuryBalance,
  TreasurySource,
} from "@/lib/jahez/treasury/api";
import { formatSAR, getTreasuryLocationLabel, getSponsorDisplayName } from "@/lib/jahez/treasury/utils";
import { listSponsors, type Sponsor } from "@/lib/workforce/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Modal } from "@/components/jahez/treasury/TreasuryModal";
import { toast } from "@/components/ui/Toast";
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Award,
  Layers,
  ArrowRight,
  Database,
  Building2,
  FileCheck,
} from "lucide-react";

export default function TreasuryMigrationPage() {
  const { can, user } = useAuth();

  const isAdmin =
    Boolean(user?.roles?.some((r) => r.toLowerCase() === "admin")) ||
    can("admin") ||
    can("*");

  const canAdjust = can("jahez.treasury.adjust") || isAdmin;

  // Data states
  const [readiness, setReadiness] = useState<TreasuryReadiness | null>(null);
  const [attributions, setAttributions] = useState<TreasuryAttributionReview[]>([]);
  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [balances, setBalances] = useState<TreasuryBalance[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  // Backfill State
  const [isBackfillOpen, setIsBackfillOpen] = useState(false);
  const [backfillReason, setBackfillReason] = useState("ترحيل دفعة حركات جاهز التاريخية");
  const [runningBackfill, setRunningBackfill] = useState(false);
  const [lastBackfillCount, setLastBackfillCount] = useState<number | null>(null);

  // Attribution Decision State
  const [selectedAttribution, setSelectedAttribution] = useState<TreasuryAttributionReview | null>(
    null,
  );
  const [decisionSponsorId, setDecisionSponsorId] = useState("");
  const [decisionEvidence, setDecisionEvidence] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Balance Verification State
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [verifyAccountId, setVerifyAccountId] = useState("");
  const [verifyAmount, setVerifyAmount] = useState("");
  const [verifyReference, setVerifyReference] = useState("");
  const [verifyReason, setVerifyReason] = useState("");
  const [submittingVerify, setSubmittingVerify] = useState(false);

  // Activation State
  const [isActivateOpen, setIsActivateOpen] = useState(false);
  const [activateReason, setActivateReason] = useState("اعتماد واكتمال مراجعة المالية لخزائن جاهز V3");
  const [activating, setActivating] = useState(false);

  const loadData = useCallback(async () => {
    if (!canAdjust) return;
    setLoading(true);
    try {
      const [readinessRes, attribsRes, accsRes, balsRes, spsRes] = await Promise.all([
        getTreasuryReadiness().catch(() => null),
        getTreasuryAttributionReviews(1, 100).catch(() => ({ items: [] })),
        getTreasuryAccounts().catch(() => [] as TreasuryAccount[]),
        getTreasuryBalances().catch(() => [] as TreasuryBalance[]),
        listSponsors().catch(() => [] as Sponsor[]),
      ]);

      setReadiness(readinessRes);
      setAttributions(attribsRes?.items || []);
      setAccounts(accsRes);
      setBalances(balsRes);
      setSponsors(spsRes);
    } catch (err: any) {
      toast.error(err.message || "تعذر جلب بيانات الجاهزية والترحيل");
    } finally {
      setLoading(false);
    }
  }, [canAdjust]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sponsors Map
  const sponsorsMap = useMemo(() => {
    const map = new Map<string, string>();
    sponsors.forEach((s) => map.set(s.id, getSponsorDisplayName(s)));
    return map;
  }, [sponsors]);

  // Handle Attribution Submit
  const handleAttributionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttribution || !decisionSponsorId) {
      toast.error("يرجى اختيار الكفيل المعتمد بناءً على الدليل التاريخي");
      return;
    }
    if (!decisionEvidence.trim()) {
      toast.error("يرجى تدوين دليل ومصدر قرار المالية");
      return;
    }

    setSubmittingDecision(true);
    try {
      const key = generateTreasuryIdempotencyKey("mig-decision");
      await submitTreasuryAttribution(
        {
          source: selectedAttribution.source,
          sourceId: selectedAttribution.sourceId,
          sponsorId: decisionSponsorId,
          evidence: decisionEvidence.trim(),
        },
        key,
      );

      toast.success("تم اعتماد قرار ملكية الحركة بنجاح");
      setSelectedAttribution(null);
      setDecisionSponsorId("");
      setDecisionEvidence("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "فشل تسجيل قرار الملكية");
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Handle Backfill Batch Submit
  const handleBackfillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backfillReason.trim()) {
      toast.error("سبب الترحيل مطلوب");
      return;
    }

    setRunningBackfill(true);
    try {
      const key = generateTreasuryIdempotencyKey("backfill-batch");
      const count = await runTreasuryBackfill(backfillReason.trim(), key);
      setLastBackfillCount(count);
      toast.success(`تم ترحيل ${count} حركة بنجاح في هذه الدفعة`);
      setIsBackfillOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "تعذر ترحيل دفعة الحركات (قد يوجد عجز تمويل غير مفسر)");
    } finally {
      setRunningBackfill(false);
    }
  };

  // Handle Balance Verification Submit
  const handleVerifyBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(verifyAmount);
    if (isNaN(num) || num < 0) {
      toast.error("المبلغ يجب أن يكون صفراً أو موجباً ومطابقاً للدفتر الفعلي");
      return;
    }
    if (!verifyAccountId) {
      toast.error("يرجى اختيار الحساب");
      return;
    }
    if (!verifyReference.trim() || !verifyReason.trim()) {
      toast.error("المرجع والسبب مطلوبان");
      return;
    }

    setSubmittingVerify(true);
    try {
      const key = generateTreasuryIdempotencyKey("verify-bal");
      await verifyTreasuryAccountBalance(
        {
          subAccountId: verifyAccountId,
          balance: num,
          reference: verifyReference.trim(),
          reason: verifyReason.trim(),
        },
        key,
      );

      toast.success("تم إثبات الرصيد الفعلي للحساب بنجاح");
      setIsVerifyOpen(false);
      setVerifyAccountId("");
      setVerifyAmount("");
      setVerifyReference("");
      setVerifyReason("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "فشل إثبات الرصيد (يجب أن يساوي رصيد الدفتر بالضبط)");
    } finally {
      setSubmittingVerify(false);
    }
  };

  // Handle Treasury Activation
  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!readiness?.rowVersion) {
      toast.error("بيانات الجاهزية غير متوفرة للتفعيل");
      return;
    }
    if (!activateReason.trim()) {
      toast.error("سبب التفعيل مطلوب");
      return;
    }

    setActivating(true);
    try {
      const key = generateTreasuryIdempotencyKey("activate-v3");
      await activateTreasury(
        {
          rowVersion: readiness.rowVersion,
          reason: activateReason.trim(),
        },
        key,
      );

      toast.success("🎉 تهانينا! تم تفعيل خزائن جاهز V3 بنجاح!");
      setIsActivateOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "تعذر تفعيل الخزينة (تأكد من استيفاء جميع شروط الجاهزية)");
    } finally {
      setActivating(false);
    }
  };

  if (!canAdjust) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-12 text-center text-destructive">
        <ShieldAlert className="h-10 w-10 mx-auto mb-3" />
        <h2 className="text-lg font-bold">غير مصرح لك بالوصول</h2>
        <p className="text-xs text-muted-foreground mt-1">
          هذه الصفحة مخصصة للمالية المخولة فقط وتحتاج صلاحية `jahez.treasury.adjust`.
        </p>
      </div>
    );
  }

  const isReadyToActivate =
    readiness &&
    !readiness.isActive &&
    readiness.unresolvedMovements === 0 &&
    readiness.unresolvedFees === 0 &&
    readiness.unresolvedExecutedOperations === 0 &&
    readiness.pendingLegacyHandovers === 0 &&
    readiness.unverifiedAccounts.length === 0;

  return (
    <div className="space-y-6">
      <TreasuryNavHeader
        title="إعداد الخزينة"
        description="راجع البيانات السابقة وحدد أصحاب المبالغ، ثم طابق الأرصدة قبل تفعيل الخزينة."
        onRefresh={loadData}
        isRefreshing={loading}
        extraActions={
          !readiness?.isActive && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsBackfillOpen(true)}
                className="gap-1.5 text-xs font-semibold"
              >
                <PlayCircle className="h-4 w-4" />
                <span>تشغيل ترحيل دفعة</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsVerifyOpen(true)}
                className="gap-1.5 text-xs font-semibold"
              >
                <FileCheck className="h-4 w-4" />
                <span>إثبات رصيد حساب</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setIsActivateOpen(true)}
                disabled={!isReadyToActivate}
                className="gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700"
              >
                <Award className="h-4 w-4" />
                <span>تفعيل منظومة الخزائن</span>
              </Button>
            </div>
          )
        }
      />

      {/* Readiness Status Card */}
      {readiness && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  readiness.isActive
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                }`}
              >
                {readiness.isActive ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">
                  حالة تفعيل منظومة الخزائن المالية
                </h3>
                <p className="text-xs text-muted-foreground">
                  {readiness.isActive
                    ? "الخزائن مفعلة ونشطة في الإنتاج (القيود محمية ولا يمكن إلغاء التفعيل)"
                    : "الخزائن غير مفعلة حالياً؛ يجب استيفاء موانع التفعيل أدناه"}
                </p>
              </div>
            </div>

            <Badge tone={readiness.isActive ? "green" : "orange"} className="text-xs px-3 py-1">
              {readiness.isActive ? "مفعلة" : "غير مفعلة"}
            </Badge>
          </div>

          {!readiness.isActive && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div className="rounded-xl border border-border p-3 bg-muted/20">
                <span className="text-muted-foreground block text-[11px]">حركات غير محسومة:</span>
                <span className="text-lg font-bold font-mono text-foreground">
                  {readiness.unresolvedMovements}
                </span>
              </div>

              <div className="rounded-xl border border-border p-3 bg-muted/20">
                <span className="text-muted-foreground block text-[11px]">رسوم غير محسومة:</span>
                <span className="text-lg font-bold font-mono text-foreground">
                  {readiness.unresolvedFees}
                </span>
              </div>

              <div className="rounded-xl border border-border p-3 bg-muted/20">
                <span className="text-muted-foreground block text-[11px]">تصفيات غير محسومة:</span>
                <span className="text-lg font-bold font-mono text-foreground">
                  {readiness.unresolvedExecutedOperations}
                </span>
              </div>

              <div className="rounded-xl border border-border p-3 bg-muted/20">
                <span className="text-muted-foreground block text-[11px]">محاضر قديمة معلقة:</span>
                <span className="text-lg font-bold font-mono text-foreground">
                  {readiness.pendingLegacyHandovers}
                </span>
              </div>

              <div className="rounded-xl border border-border p-3 bg-muted/20">
                <span className="text-muted-foreground block text-[11px]">حسابات غير مثبتة:</span>
                <span className="text-lg font-bold font-mono text-foreground">
                  {readiness.unverifiedAccounts.length}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attribution Review Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <span>مراجعة ملكية الحركات والرسوم مجهولة الكفيل التاريخي</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              يجب حسم الملكية بناءً على أدلة العقود والتاريخ.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">{attributions.length} سجل للمراجعة</span>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">نوع المصدر</th>
                  <th className="py-3 px-4">حالة التدقيق</th>
                  <th className="py-3 px-4 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-muted-foreground">
                      جاري فحص سجلات التدقيق...
                    </td>
                  </tr>
                )}

                {!loading && attributions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-emerald-600 font-semibold">
                      ✓ جميع الحركات والرسوم التاريخية محسومة الملكية ولا توجد موانع ملكية معلقة!
                    </td>
                  </tr>
                )}

                {!loading &&
                  attributions.map((att, idx) => (
                    <tr key={idx} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-muted-foreground text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                          {att.source === TreasurySource.Fee
                            ? "رسوم حساب"
                            : att.source === TreasurySource.Operation
                              ? "عملية تصفية"
                              : att.source === TreasurySource.Debt
                                ? "دين مرحل"
                                : "حركة نقدية"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        {att.requiresFinanceDecision ? (
                          <Badge tone="orange" className="text-[10px]">
                            مطلوب قرار مالي
                          </Badge>
                        ) : (
                          <Badge tone="gray" className="text-[10px]">
                            تلقائي
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 text-xs font-semibold"
                          onClick={() => {
                            setSelectedAttribution(att);
                            setDecisionSponsorId(att.currentSponsorId || "");
                            setDecisionEvidence("");
                          }}
                        >
                          حسم الملكية
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Attribution Decision Modal */}
      {selectedAttribution && (
        <Modal
          isOpen={Boolean(selectedAttribution)}
          onClose={() => setSelectedAttribution(null)}
          title="قرار حسم ملكية الحركة التاريخية"
        >
          <form onSubmit={handleAttributionSubmit} className="space-y-4 text-xs">
            <div className="rounded-xl bg-muted/30 p-3 space-y-1">
              <div>
                <span className="text-muted-foreground">نوع السجل: </span>
                <span className="font-bold text-foreground">
                  {selectedAttribution.source === TreasurySource.Fee ? "رسوم حساب" : "عملية تصفية"}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                الكفيل المعتمد بالقرار المالي *
              </label>
              <SearchableSelect
                value={decisionSponsorId}
                onChange={setDecisionSponsorId}
                options={sponsors.map((s) => ({
                  value: s.id,
                  label: getSponsorDisplayName(s),
                }))}
                placeholder="اختر الكفيل المستحق"
              />
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                الدليل ومصدر القرار المالي *
              </label>
              <textarea
                required
                rows={3}
                placeholder="اكتب مستند التدقيق، رقم العقد التاريخي، أو الإثبات المالي المعتمد..."
                value={decisionEvidence}
                onChange={(e) => setDecisionEvidence(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                maxLength={2000}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelectedAttribution(null)}
                disabled={submittingDecision}
              >
                إلغاء
              </Button>
              <Button type="submit" size="sm" disabled={submittingDecision}>
                {submittingDecision ? "جاري الاعتماد..." : "تثبيت قرار الملكية"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Backfill Batch Modal */}
      <Modal
        isOpen={isBackfillOpen}
        onClose={() => setIsBackfillOpen(false)}
        title="تشغيل ترحيل دفعة من القيود السابقة"
      >
        <form onSubmit={handleBackfillSubmit} className="space-y-4 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            يقوم أمر ترحيل القيود التاريخية بإنشاء قيود الخزينة بدفعات (حتى 500 حركة و 100 محضر لكل
            دفعة) بمفتاح تكرار فريد لكل دفعة جديدة.
          </p>

          <div>
            <label className="block font-medium text-muted-foreground mb-1">
              بيان ومرجع دفعة الترحيل *
            </label>
            <Input
              required
              value={backfillReason}
              onChange={(e) => setBackfillReason(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsBackfillOpen(false)}
              disabled={runningBackfill}
            >
              إلغاء
            </Button>
            <Button type="submit" size="sm" disabled={runningBackfill} className="gap-2">
              <PlayCircle className="h-4 w-4" />
              <span>{runningBackfill ? "جاري الترحيل..." : "بدء ترحيل الدفعة"}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Balance Verification Modal */}
      <Modal
        isOpen={isVerifyOpen}
        onClose={() => setIsVerifyOpen(false)}
        title="إثبات الرصيد الفعلي لحساب نشط ومطابقته"
      >
        <form onSubmit={handleVerifyBalanceSubmit} className="space-y-4 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            يجب مطابقة وإثبات الرصيد الفعلي لكل حساب فرعي نشط (حتى الأرصدة الصفرية). إثبات الرصيد لا
            يغير الدفتر ويجب أن يطابق تماماً رصيد الدفتر المحسوب.
          </p>

          <div>
            <label className="block font-medium text-muted-foreground mb-1">الحساب النشط *</label>
            <SearchableSelect
              value={verifyAccountId}
              onChange={(val) => {
                setVerifyAccountId(val);
                const b = balances.find((x) => x.subAccountId === val);
                if (b) setVerifyAmount(String(b.balance));
              }}
              options={accounts
                .filter((a) => a.isPosting && a.isActive)
                .map((a) => {
                  const bal = balances.find((b) => b.subAccountId === a.id)?.balance ?? 0;
                  return {
                    value: a.id,
                    label: `${a.code} - ${a.nameAr} [رصيد الدفتر: ${formatSAR(bal)}]`,
                  };
                })}
              placeholder="اختر الحساب للتحقق وإثبات الرصيد"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                الرصيد الفعلي المطابق *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={verifyAmount}
                onChange={(e) => setVerifyAmount(e.target.value)}
                className="h-9 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">مرجع المطابقة *</label>
              <Input
                required
                placeholder="مثال: مطابقة كشف الحساب البنكي / صندوق المركز"
                value={verifyReference}
                onChange={(e) => setVerifyReference(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-muted-foreground mb-1">السبب والبيان *</label>
            <textarea
              required
              rows={2}
              placeholder="بيان إثبات الرصيد..."
              value={verifyReason}
              onChange={(e) => setVerifyReason(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsVerifyOpen(false)}
              disabled={submittingVerify}
            >
              إلغاء
            </Button>
            <Button type="submit" size="sm" disabled={submittingVerify}>
              {submittingVerify ? "جاري الإثبات..." : "تأكيد إثبات الرصيد"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Activation Confirmation Modal */}
      <Modal
        isOpen={isActivateOpen}
        onClose={() => setIsActivateOpen(false)}
        title="تفعيل منظومة خزائن جاهز V3 النهائية"
      >
        <form onSubmit={handleActivateSubmit} className="space-y-4 text-xs">
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-amber-800 dark:text-amber-300 leading-relaxed">
            <strong>تحذير مالي هام:</strong> عملية التفعيل نهائية وتلزم جميع العمليات اللاحقة بالتقيد
            بقواعد الخزينة V3 ورفض كتابات تسليم V2 السابقة. لا يمكن إلغاء التفعيل أو حذف الدفتر
            بعد هذه الخطوة.
          </div>

          <div>
            <label className="block font-medium text-muted-foreground mb-1">
              بيان ومبرر التفعيل النهائي للمالية *
            </label>
            <textarea
              required
              rows={2}
              value={activateReason}
              onChange={(e) => setActivateReason(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsActivateOpen(false)}
              disabled={activating}
            >
              تراجع
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={activating}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold"
            >
              {activating ? "جاري التفعيل..." : "تفعيل الخزائن الآن"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
