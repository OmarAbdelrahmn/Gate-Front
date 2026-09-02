"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Key,
  Plus,
  Printer,
  RefreshCw,
  Server,
  ShieldAlert,
  Truck,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import {
  getSponsorVehicleLeaseAgreement,
  closeSponsorVehicleLeaseAgreement,
  type SponsorVehicleLeaseAgreement,
  type CloseSponsorVehicleLeaseAgreementRequest,
} from "@/lib/fleet/vehicle-account-assignments-api";
import { SponsorVehicleLeaseContractView } from "@/components/fleet/SponsorVehicleLeaseContractView";

function getTodayRiyadhDate(): string {
  const now = new Date();
  const riyadhOffsetMs = 3 * 60 * 60 * 1000;
  const riyadhDate = new Date(now.getTime() + riyadhOffsetMs);
  return riyadhDate.toISOString().slice(0, 10);
}

export default function SponsorVehicleLeaseDetailPage() {
  const { id } = useParams() as { id: string };
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const router = useRouter();

  const [agreement, setAgreement] = useState<SponsorVehicleLeaseAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Close Modal State
  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const [closeEffectiveTo, setCloseEffectiveTo] = useState(getTodayRiyadhDate());
  const [closeReason, setCloseReason] = useState("");

  const fetchAgreement = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSponsorVehicleLeaseAgreement(id);
      setAgreement(data);
    } catch (err: any) {
      console.error("Failed to load agreement detail", err);
      setError(err?.message || "تعذر تحميل تفاصيل عقد تأجير الكفيل.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (can("fleet.assignments.read") || can("fleet.vehicles.read")) {
      fetchAgreement();
    }
  }, [id]);

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreement) return;

    const trimmedReason = closeReason.trim();
    if (!trimmedReason) {
      toast.error("بيانات مفقودة", "سبب إنهاء الاتفاقية مطلوب ولا يمكن تركه فارغاً.");
      return;
    }

    if (trimmedReason.length > 1000) {
      toast.error("خطأ في البيانات", "سبب الإنهاء يجب ألا يتجاوز 1000 حرف.");
      return;
    }

    startTransition(async () => {
      try {
        const payload: CloseSponsorVehicleLeaseAgreementRequest = {
          effectiveTo: closeEffectiveTo || getTodayRiyadhDate(),
          reason: trimmedReason,
          rowVersion: agreement.rowVersion,
        };

        const updated = await closeSponsorVehicleLeaseAgreement(agreement.id, payload);
        setAgreement(updated);
        setIsCloseOpen(false);
        toast.success("تم إنهاء عقد التأجير", "تم إنهاء اتفاقية تأجير الكفلاء بنجاح.");
      } catch (err: any) {
        console.error("Close agreement error:", err);
        if (err?.status === 409) {
          toast.error(
            "تعارض في التحديث",
            "تم تعديل الاتفاقية بواسطة مستخدم آخر. تم إعادة تحميل البيانات."
          );
          fetchAgreement();
        } else {
          toast.error("فشل إنهاء العقد", err?.message || "تعذر إنهاء اتفاقية التأجير.");
        }
      }
    });
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200 border-emerald-300">
            نشطة (Active)
          </Badge>
        );
      case "Scheduled":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-200 border-blue-300">
            مجدولة (Scheduled)
          </Badge>
        );
      case "Ended":
        return (
          <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300">
            منتهية (Ended)
          </Badge>
        );
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-300">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Navigation Breadcrumb & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
            <span>إدارة الأسطول والتشغيل</span>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <Link
              href="/dashboard/fleet/vehicle-account-assignments"
              className="hover:underline text-[var(--muted)]"
            >
              ربط المركبات بالمنصات
            </Link>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <Link
              href="/dashboard/fleet/vehicle-account-assignments/leases"
              className="hover:underline text-[var(--muted)]"
            >
              عقود تأجير الكفلاء
            </Link>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <span className="text-[#1167c9] dark:text-blue-400">تفاصيل العقد</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] flex items-center gap-2">
            <FileText className="h-7 w-7 text-[#1167c9] dark:text-blue-400" />
            {agreement
              ? agreement.agreementReference || `عقد تأجير #${agreement.id.slice(0, 8)}`
              : "عقد تأجير الكفيل"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {agreement && (
            <Button
              onClick={() => setIsPrintModalOpen(true)}
              className="gap-2 bg-[#1167c9] hover:bg-blue-700 text-white font-bold"
            >
              <Printer className="h-4 w-4" />
              طباعة الاتفاقية (PDF)
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => router.push("/dashboard/fleet/vehicle-account-assignments/leases")}
            className="gap-2"
          >
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            العودة إلى قائمة العقود
          </Button>
          {agreement && agreement.status !== "Ended" && can("fleet.assignments.manage") && (
            <Button variant="danger" onClick={() => setIsCloseOpen(true)} className="gap-2">
              <XCircle className="h-4 w-4" />
              إنهاء العقد
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <Card className="p-8 text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-[#1167c9]" />
          <p className="text-xs text-[var(--muted)]">جاري تحميل تفاصيل عقد التأجير...</p>
        </Card>
      ) : error || !agreement ? (
        <Card className="p-8 text-center space-y-4 border-red-200 bg-red-50/50">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
          <h3 className="font-bold text-red-900">{error || "لم يتم العثور على العقد المطلوبة."}</h3>
          <Button onClick={fetchAgreement} variant="secondary" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Agreement Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Lessor Sponsor */}
            <Card className="p-4 space-y-2 border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20">
              <span className="text-xs font-bold text-[var(--muted)]">الكفيل المؤجّر (الأصلي):</span>
              <h3 className="font-extrabold text-base text-[var(--foreground)]">
                {agreement.lessorSponsorNameAr}
              </h3>
              <p className="text-[11px] text-slate-500">
                المالك الأصلي للمركبات المحددة في هذا العقد.
              </p>
            </Card>

            {/* Lessee Sponsor */}
            <Card className="p-4 space-y-2 border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/20">
              <span className="text-xs font-bold text-[var(--muted)]">الكفيل المستأجر (المشغّل):</span>
              <h3 className="font-extrabold text-base text-[var(--foreground)]">
                {agreement.lesseeSponsorNameAr}
              </h3>
              <p className="text-[11px] text-slate-500">
                الكفيل المستفيد والمسموح لـ حسابات كيتا التابعة له بالتعيين.
              </p>
            </Card>

            {/* Status & Validity */}
            <Card className="p-4 space-y-2">
              <span className="text-xs font-bold text-[var(--muted)]">الحالة وسريان العقد:</span>
              <div className="flex items-center gap-2">{renderStatusBadge(agreement.status)}</div>
              <div className="text-xs font-mono text-slate-700 dark:text-slate-300">
                فترة السريان: {agreement.effectiveFrom} ← {agreement.effectiveTo || "مفتوح"}
              </div>
            </Card>
          </div>

          {/* Details Card */}
          <Card className="p-6 space-y-4">
            <h3 className="font-bold text-sm text-[var(--foreground)] border-b pb-2 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#1167c9]" />
              بيانات وملاحظات الاتفاقية
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[var(--muted)] font-semibold block">معرّف المنصة:</span>
                <span className="font-bold font-mono text-slate-900 dark:text-white">
                  {agreement.platformCode} ({agreement.platformNameAr})
                </span>
              </div>

              <div>
                <span className="text-[var(--muted)] font-semibold block">تاريخ الاتفاقية:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {agreement.agreementDate || "غير محدد"}
                </span>
              </div>

              <div>
                <span className="text-[var(--muted)] font-semibold block">مرجع الاتفاقية:</span>
                <span className="font-mono font-bold text-[#1167c9]">
                  {agreement.agreementReference || "بدون مرجع"}
                </span>
              </div>

              <div>
                <span className="text-[var(--muted)] font-semibold block">رمز Concurrency Token:</span>
                <span className="font-mono text-[10px] text-slate-500 truncate block">
                  {agreement.rowVersion}
                </span>
              </div>
            </div>

            {agreement.notes && (
              <div className="pt-2">
                <span className="text-xs font-bold text-[var(--muted)] block mb-1">الملاحظات:</span>
                <div className="bg-[var(--subtle-bg)] p-3 rounded-xl border text-xs text-slate-800 dark:text-slate-200">
                  {agreement.notes}
                </div>
              </div>
            )}

            {agreement.endReason && (
              <div className="pt-2">
                <span className="text-xs font-bold text-red-600 dark:text-red-400 block mb-1">
                  سبب إنهاء العقد:
                </span>
                <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-200 text-xs text-red-900 dark:text-red-200">
                  {agreement.endReason}
                </div>
              </div>
            )}
          </Card>

          {/* Vehicles List */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-[var(--foreground)] flex items-center gap-2">
                <Truck className="h-5 w-5 text-[#1167c9]" />
                المركبات المشمولة بالعقد ({agreement.vehicles.length})
              </h3>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#1167c9]/10 font-bold text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3">رقم الأصل</th>
                    <th className="px-4 py-3">رقم التسجيل (الإستمارة)</th>
                    <th className="px-4 py-3">رقم اللوحة</th>
                    <th className="px-4 py-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {agreement.vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-[var(--subtle-bg)] transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#1167c9]">{v.assetNumber}</td>
                      <td className="px-4 py-3 font-mono">{v.registrationNumber || "—"}</td>
                      <td className="px-4 py-3 font-mono">{v.plateNumberAr || v.plateNumberEn || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/dashboard/fleet/vehicles/${v.vehicleId}`}
                          className="inline-flex items-center gap-1 text-[#1167c9] hover:underline font-bold"
                        >
                          <span>عرض ملف المركبة</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Close Agreement */}
      <Modal
        isOpen={isCloseOpen}
        onClose={() => setIsCloseOpen(false)}
        title="إنهاء عقد تأجير الكفلاء"
      >
        {agreement && (
          <form onSubmit={handleCloseSubmit} className="space-y-4 pt-2">
            <Card className="p-3 bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                تأكيد إنهاء الاتفاقية:
              </p>
              <p>
                الكفيل المؤجّر: <strong>{agreement.lessorSponsorNameAr}</strong> | الكفيل المستأجر: <strong>{agreement.lesseeSponsorNameAr}</strong>
              </p>
            </Card>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                تاريخ انتهاء السريان <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={closeEffectiveTo}
                onChange={(e) => setCloseEffectiveTo(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                سبب إنهاء الاتفاقية <span className="text-red-500">*</span> (أقصى 1000 حرف)
              </label>
              <textarea
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                rows={3}
                required
                placeholder="أدخل سبب إنهاء العقد..."
                maxLength={1000}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs text-[var(--foreground)] focus:border-[#1167c9] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsCloseOpen(false)}
                disabled={isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                variant="danger"
                disabled={isPending || !closeReason.trim()}
                className="gap-2"
              >
                {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                تأكيد إنهاء العقد
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Full Contract PDF Preview */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="معاينة وثيقة عقد تأجير المركبات (اتفاقية رسمية)"
      >
        {agreement && (
          <div className="max-h-[80vh] overflow-y-auto p-2 bg-slate-100 rounded-xl">
            <SponsorVehicleLeaseContractView agreement={agreement} />
          </div>
        )}
      </Modal>

      {/* Hidden Print Container for native Ctrl+P / window.print() */}
      {agreement && (
        <div className="hidden print:block">
          <SponsorVehicleLeaseContractView agreement={agreement} />
        </div>
      )}
    </div>
  );
}
