"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeAlert,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  Info,
  Key,
  Link2,
  Plus,
  Printer,
  RefreshCw,
  Repeat,
  Search,
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
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import { listSponsors } from "@/lib/workforce/api";
import {
  getSponsorVehicleLeaseAgreements,
  getSponsorVehicleLeaseEligibleVehicles,
  createSponsorVehicleLeaseAgreement,
  closeSponsorVehicleLeaseAgreement,
  type SponsorVehicleLeaseAgreement,
  type SponsorVehicleLeaseEligibleVehicle,
  type CreateSponsorVehicleLeaseAgreementRequest,
  type CloseSponsorVehicleLeaseAgreementRequest,
  type SponsorVehicleLeaseFilters,
} from "@/lib/fleet/vehicle-account-assignments-api";

function getTodayRiyadhDate(): string {
  // Current date formatted as YYYY-MM-DD
  const now = new Date();
  // Adjust for Riyadh UTC+3
  const riyadhOffsetMs = 3 * 60 * 60 * 1000;
  const riyadhDate = new Date(now.getTime() + riyadhOffsetMs);
  return riyadhDate.toISOString().slice(0, 10);
}

export default function SponsorVehicleLeasesPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const pathname = usePathname();
  const router = useRouter();

  // Main State
  const [agreements, setAgreements] = useState<SponsorVehicleLeaseAgreement[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [filterLessorId, setFilterLessorId] = useState("");
  const [filterLesseeId, setFilterLesseeId] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [search, setSearch] = useState("");

  // Detail Modal / View
  const [viewAgreement, setViewAgreement] = useState<SponsorVehicleLeaseAgreement | null>(null);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [lessorSponsorId, setLessorSponsorId] = useState("");
  const [lesseeSponsorId, setLesseeSponsorId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(getTodayRiyadhDate());
  const [effectiveTo, setEffectiveTo] = useState("");
  const [agreementDate, setAgreementDate] = useState(getTodayRiyadhDate());
  const [agreementReference, setAgreementReference] = useState("");
  const [notes, setNotes] = useState("");

  // Eligible Vehicles State for Creation Flow
  const [eligibleVehicles, setEligibleVehicles] = useState<SponsorVehicleLeaseEligibleVehicle[]>([]);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState("");
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [eligibleError, setEligibleError] = useState<string | null>(null);

  // Close Modal State
  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const [closeTargetAgreement, setCloseTargetAgreement] = useState<SponsorVehicleLeaseAgreement | null>(null);
  const [closeEffectiveTo, setCloseEffectiveTo] = useState(getTodayRiyadhDate());
  const [closeReason, setCloseReason] = useState("");

  // Data Loading
  const loadData = async () => {
    setLoading(true);
    try {
      const [sponRes, agreeRes] = await Promise.allSettled([
        listSponsors(),
        getSponsorVehicleLeaseAgreements({
          lessorSponsorId: filterLessorId || undefined,
          lesseeSponsorId: filterLesseeId || undefined,
          activeOnly,
        }),
      ]);

      if (sponRes.status === "fulfilled") setSponsors(sponRes.value);
      if (agreeRes.status === "fulfilled") setAgreements(agreeRes.value);
    } catch (err) {
      console.error("Failed to load sponsor vehicle leases", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (can("fleet.assignments.read") || can("fleet.vehicles.read")) {
      loadData();
    }
  }, [filterLessorId, filterLesseeId, activeOnly]);

  // Options Mapping
  const sponsorOptions = useMemo(() => {
    return sponsors.map((s) => ({
      value: s.id,
      label: locale === "en" ? (s.registryNameEn || s.registryNameAr) : s.registryNameAr,
    }));
  }, [sponsors, locale]);

  // Filtered Agreements
  const filteredAgreements = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return agreements;
    return agreements.filter((item) => {
      return (
        item.agreementReference?.toLowerCase().includes(term) ||
        item.lessorSponsorNameAr?.toLowerCase().includes(term) ||
        item.lesseeSponsorNameAr?.toLowerCase().includes(term) ||
        item.notes?.toLowerCase().includes(term) ||
        item.vehicles.some(
          (v) =>
            v.assetNumber?.toLowerCase().includes(term) ||
            v.plateNumberAr?.toLowerCase().includes(term) ||
            v.plateNumberEn?.toLowerCase().includes(term) ||
            v.registrationNumber?.toLowerCase().includes(term)
        )
      );
    });
  }, [agreements, search]);

  // Filtered Eligible Vehicles for Modal Search
  const filteredEligibleVehicles = useMemo(() => {
    const term = vehicleSearchQuery.toLowerCase().trim();
    if (!term) return eligibleVehicles;
    return eligibleVehicles.filter((v) => {
      return (
        v.assetNumber?.toLowerCase().includes(term) ||
        v.registrationNumber?.toLowerCase().includes(term) ||
        v.plateNumberAr?.toLowerCase().includes(term) ||
        v.plateNumberEn?.toLowerCase().includes(term) ||
        v.vehicleType?.toLowerCase().includes(term) ||
        v.operationalStatus?.toLowerCase().includes(term)
      );
    });
  }, [eligibleVehicles, vehicleSearchQuery]);

  // Fetch eligible vehicles when Lessor Sponsor or Date Range changes in Create Flow
  const fetchEligibleVehicles = async (lessorId: string, fromDate: string, toDate: string) => {
    if (!lessorId) {
      setEligibleVehicles([]);
      setSelectedVehicleIds([]);
      setEligibleError(null);
      return;
    }
    setLoadingEligible(true);
    setEligibleError(null);
    try {
      const res = await getSponsorVehicleLeaseEligibleVehicles(
        lessorId,
        fromDate || undefined,
        toDate || undefined
      );
      setEligibleVehicles(res);
      // Auto deselect any vehicles no longer in eligible list
      setSelectedVehicleIds((prev) => prev.filter((id) => res.some((v) => v.vehicleId === id)));
    } catch (err: any) {
      console.error("Failed to load eligible vehicles:", err);
      setEligibleError(err?.message || "تعذر جلب المركبات المؤهلة لـ هذا الكفيل.");
      setEligibleVehicles([]);
      setSelectedVehicleIds([]);
    } finally {
      setLoadingEligible(false);
    }
  };

  const handleOpenCreate = () => {
    const today = getTodayRiyadhDate();
    setLessorSponsorId(sponsors[0]?.id || "");
    setLesseeSponsorId(sponsors[1]?.id || "");
    setEffectiveFrom(today);
    setEffectiveTo("");
    setAgreementDate(today);
    setAgreementReference("");
    setNotes("");
    setSelectedVehicleIds([]);
    setVehicleSearchQuery("");
    setEligibleVehicles([]);
    setEligibleError(null);
    setIsCreateOpen(true);

    if (sponsors[0]?.id) {
      fetchEligibleVehicles(sponsors[0].id, today, "");
    }
  };

  const handleLessorChange = (val: string) => {
    setLessorSponsorId(val);
    setVehicleSearchQuery("");
    if (val === lesseeSponsorId) {
      // Auto select a different sponsor for lessee if available
      const alt = sponsors.find((s) => s.id !== val);
      if (alt) setLesseeSponsorId(alt.id);
    }
    fetchEligibleVehicles(val, effectiveFrom, effectiveTo);
  };

  const handleEffectiveFromChange = (val: string) => {
    setEffectiveFrom(val);
    if (lessorSponsorId) {
      fetchEligibleVehicles(lessorSponsorId, val, effectiveTo);
    }
  };

  const handleEffectiveToChange = (val: string) => {
    setEffectiveTo(val);
    if (lessorSponsorId) {
      fetchEligibleVehicles(lessorSponsorId, effectiveFrom, val);
    }
  };

  const handleToggleSelectVehicle = (vId: string) => {
    setSelectedVehicleIds((prev) =>
      prev.includes(vId) ? prev.filter((id) => id !== vId) : [...prev, vId]
    );
  };

  const handleSelectAllVehicles = () => {
    const targetList = filteredEligibleVehicles;
    const allFilteredSelected = targetList.every((v) => selectedVehicleIds.includes(v.vehicleId));
    if (allFilteredSelected) {
      const targetIds = new Set(targetList.map((v) => v.vehicleId));
      setSelectedVehicleIds((prev) => prev.filter((id) => !targetIds.has(id)));
    } else {
      const targetIds = targetList.map((v) => v.vehicleId);
      setSelectedVehicleIds((prev) => Array.from(new Set([...prev, ...targetIds])));
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessorSponsorId || !lesseeSponsorId || !effectiveFrom) {
      toast.error("خطأ في البيانات", "يرجى تحديد الكفيل المؤجر، الكفيل المستأجر، وتاريخ بداية الاتفاقية.");
      return;
    }

    if (lessorSponsorId === lesseeSponsorId) {
      toast.error("خطأ في التحديد", "يجب أن يكون الكفيل المستأجر مختلفاً عن الكفيل المؤجّر.");
      return;
    }

    if (selectedVehicleIds.length === 0) {
      toast.error("خطأ في التحديد", "يرجى اختيار مركبة واحدة على الأقل لإنشاء عقد التأجير.");
      return;
    }

    if (agreementReference && agreementReference.length > 200) {
      toast.error("خطأ في البيانات", "مرجع الاتفاقية لا يمكن أن يتجاوز 200 حرف.");
      return;
    }

    if (notes && notes.length > 4000) {
      toast.error("خطأ في البيانات", "الملاحظات لا يمكن أن تتجاوز 4000 حرف.");
      return;
    }

    startTransition(async () => {
      try {
        const payload: CreateSponsorVehicleLeaseAgreementRequest = {
          lessorSponsorId,
          lesseeSponsorId,
          vehicleIds: selectedVehicleIds,
          agreementDate: agreementDate || null,
          agreementReference: agreementReference.trim() || null,
          effectiveFrom,
          effectiveTo: effectiveTo || null,
          notes: notes.trim() || null,
        };

        const res = await createSponsorVehicleLeaseAgreement(payload);
        setIsCreateOpen(false);
        toast.success(
          "تم إنشاء عقد التأجير بنجاح",
          `تم إنشاء عقد التأجير بين الكفلاء للمركبات المحددة (${res.vehicles.length} مركبة).`
        );
        loadData();
      } catch (err: any) {
        console.error("Create sponsor vehicle lease error:", err);
        toast.error("فشل إنشاء عقد التأجير", err?.message || "تعذر إنشاء اتفاقية تأجير الكفيل.");
      }
    });
  };

  const handleOpenClose = (item: SponsorVehicleLeaseAgreement) => {
    setCloseTargetAgreement(item);
    setCloseEffectiveTo(getTodayRiyadhDate());
    setCloseReason("");
    setIsCloseOpen(true);
  };

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeTargetAgreement) return;

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
          rowVersion: closeTargetAgreement.rowVersion,
        };

        const updated = await closeSponsorVehicleLeaseAgreement(closeTargetAgreement.id, payload);
        setIsCloseOpen(false);
        toast.success("تم إنهاء عقد التأجير", "تم إنهاء اتفاقية تأجير الكفلاء بنجاح.");
        loadData();
      } catch (err: any) {
        console.error("Close sponsor vehicle lease error:", err);
        if (err?.status === 409) {
          toast.error(
            "تعارض في البيانات",
            "تم تعديل الاتفاقية بواسطة مستخدم آخر أو تغيرت حالتها. تم تحديث البيانات."
          );
          loadData();
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
      {/* Header */}
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
            <span className="text-[#1167c9] dark:text-blue-400">عقود تأجير الكفلاء (كيتا)</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-[var(--foreground)] flex items-center gap-2">
            <FileText className="h-7 w-7 text-[#1167c9] dark:text-blue-400" />
            عقود تأجير المركبات بين الكفلاء (منصة كيتا)
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            إدارة اتفاقيات التأجير بين الكفلاء لمنصة كيتا فقط، لمنح صلاحت التعيين المؤقتة لحسابات المستأجر.
          </p>
        </div>

        {can("fleet.assignments.manage") && (
          <Button onClick={handleOpenCreate} className="gap-2 shadow-lg shadow-blue-500/20">
            <Plus className="h-4 w-4" />
            إنشاء عقد تأجير كفيل جديد
          </Button>
        )}
      </div>

      {/* Top Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3 overflow-x-auto no-scrollbar">
        <Link
          href="/dashboard/fleet/vehicle-account-assignments"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--subtle-bg)] hover:text-[var(--foreground)] border border-[var(--border)]"
        >
          <Server className="h-4 w-4" />
          <span>جميع الربطات النشطة</span>
        </Link>

        <Link
          href="/dashboard/fleet/vehicle-account-assignments/switches"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--subtle-bg)] hover:text-[var(--foreground)] border border-[var(--border)]"
        >
          <Repeat className="h-4 w-4" />
          <span>طلبات التبديل المعلقة</span>
        </Link>

        <Link
          href="/dashboard/fleet/vehicle-account-assignments/problems"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--subtle-bg)] hover:text-[var(--foreground)] border border-[var(--border)]"
        >
          <AlertTriangle className="h-4 w-4" />
          <span>التحذيرات التشغيلية</span>
        </Link>

        <Link
          href="/dashboard/fleet/vehicle-account-assignments/leases"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap bg-[#1167c9] text-white shadow-md shadow-blue-500/20"
        >
          <FileText className="h-4 w-4" />
          <span>عقود تأجير الكفلاء (كيتا)</span>
          <span className="rounded-full bg-white/20 text-white px-2 py-0.5 text-[10px] font-mono">
            {agreements.length}
          </span>
        </Link>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50/70 dark:border-blue-900/60 dark:bg-blue-950/30 p-4 rounded-2xl flex items-start gap-3">
        <Info className="h-5 w-5 text-[#1167c9] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1 text-slate-800 dark:text-slate-200">
          <p className="font-bold">آلية عمل تأجير المركبات بين الكفلاء (خاص بمشغلي كيتا):</p>
          <p className="text-slate-600 dark:text-slate-400">
            تتيح اتفاقية التأجير ربط مركبة تابعة لـ <strong>الكفيل المؤجّر (الأصلي)</strong> بحسابات منصة كيتا التابعة لـ <strong>الكفيل المستأجر</strong> طوال فترة سريان العقد دون تغيير كفيل المركبة الأساسي، مع إلغاء تحذير عدم تطابق الكفيل لحسابات كيتا فقط.
          </p>
        </div>
      </Card>

      {/* Filters Bar */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--muted)]">الكفيل المؤجّر (الأصلي)</label>
            <SearchableSelect
              options={[{ value: "", label: "جميع الكفلاء المؤجرين" }, ...sponsorOptions]}
              value={filterLessorId}
              onChange={setFilterLessorId}
              placeholder="اختر الكفيل المؤجّر..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--muted)]">الكفيل المستأجر (المؤقت)</label>
            <SearchableSelect
              options={[{ value: "", label: "جميع الكفلاء المستأجرين" }, ...sponsorOptions]}
              value={filterLesseeId}
              onChange={setFilterLesseeId}
              placeholder="اختر الكفيل المستأجر..."
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer py-2.5 px-3 rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] w-full text-xs font-bold text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#1167c9] focus:ring-[#1167c9]"
              />
              <span>إظهار العقود النشطة فقط (السارية حالياً)</span>
            </label>
          </div>

          <div className="flex items-end">
            <Button variant="secondary" onClick={loadData} disabled={loading} className="w-full gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              تحديث العقود
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بمرجع العقد، اسم الكفيل، رقم اللوحة، رقم أصل المركبة..."
              className="pr-10"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="space-y-4 p-6">
            <div className="h-8 animate-pulse rounded-lg bg-[var(--subtle-bg)]" />
            <div className="h-12 animate-pulse rounded-lg bg-[var(--subtle-bg)]" />
            <div className="h-12 animate-pulse rounded-lg bg-[var(--subtle-bg)]" />
          </div>
        ) : filteredAgreements.length === 0 ? (
          <div className="py-16 text-center text-[var(--muted)]">
            <FileText className="mx-auto mb-3 h-12 w-12 opacity-30 text-[#1167c9]" />
            <p className="font-bold text-base text-[var(--foreground)]">لا توجد عقود تأجير كفلاء مطابقة</p>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-md mx-auto">
              لم يتم العثور على أي اتفاقيات تأجير مركبات بين الكفلاء لمنصة كيتا بحسب الفلاتر المحددة.
            </p>
            {can("fleet.assignments.manage") && (
              <Button onClick={handleOpenCreate} variant="secondary" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                إنشاء أول عقد تأجير
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[#1167c9]/10 text-xs font-bold uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-4">مرجع العقد والمنصة</th>
                  <th className="px-6 py-4">الكفيل المؤجّر (الأصلي)</th>
                  <th className="px-6 py-4">الكفيل المستأجر (المشغّل)</th>
                  <th className="px-6 py-4">فترة السريان والحالة</th>
                  <th className="px-6 py-4">المركبات المشمولة</th>
                  <th className="px-6 py-4 text-center">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredAgreements.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-blue-500/5">
                    {/* Agreement Reference */}
                    <td className="px-6 py-4">
                      <div className="font-bold font-mono text-[#1167c9] dark:text-blue-400 flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-[#1167c9] shrink-0" />
                        <span>{item.agreementReference || `عقد #${item.id.slice(0, 8)}`}</span>
                      </div>
                      <div className="text-xs text-[var(--muted)] mt-0.5 flex items-center gap-2">
                        <span className="font-extrabold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded-full text-[10px]">
                          {item.platformCode} ({item.platformNameAr})
                        </span>
                        {item.agreementDate && (
                          <span className="font-mono">التاريخ: {item.agreementDate}</span>
                        )}
                      </div>
                      {item.notes && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs mt-1 italic">
                          "{item.notes}"
                        </div>
                      )}
                    </td>

                    {/* Lessor Sponsor */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-[var(--foreground)]">
                        {item.lessorSponsorNameAr || "—"}
                      </div>
                      <div className="text-[11px] text-[var(--muted)]">المالك الأصلي للمركبات</div>
                    </td>

                    {/* Lessee Sponsor */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-[var(--foreground)]">
                        {item.lesseeSponsorNameAr || "—"}
                      </div>
                      <div className="text-[11px] text-[#1167c9] font-medium">المشغّل المؤقت على كيتا</div>
                    </td>

                    {/* Status & Validity */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div>{renderStatusBadge(item.status)}</div>
                        <div className="text-xs font-mono text-[var(--foreground)]">
                          من: {item.effectiveFrom}
                        </div>
                        <div className="text-xs font-mono text-[var(--muted)]">
                          إلى: {item.effectiveTo || "مفتوح (غير محدد)"}
                        </div>
                      </div>
                    </td>

                    {/* Vehicles Count & List */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                          <Truck className="h-3.5 w-3.5 text-[#1167c9]" />
                          <span>{item.vehicles.length} مركبة</span>
                        </span>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {item.vehicles.slice(0, 3).map((v) => (
                            <span
                              key={v.id}
                              className="text-[11px] font-mono bg-slate-200/70 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded"
                            >
                              {v.assetNumber || v.plateNumberAr || v.registrationNumber}
                            </span>
                          ))}
                          {item.vehicles.length > 3 && (
                            <span className="text-[10px] font-mono text-[var(--muted)] self-center">
                              +{item.vehicles.length - 3} أخرى
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/dashboard/fleet/vehicle-account-assignments/leases/${item.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-[#1167c9]/10 text-[#1167c9] hover:bg-[#1167c9] hover:text-white transition-colors"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>العقد (PDF)</span>
                        </Link>
                        <Button
                          variant="secondary"
                          onClick={() => setViewAgreement(item)}
                          className="text-xs py-1 px-2.5 gap-1"
                        >
                          <EyeIcon className="h-3.5 w-3.5 text-[#1167c9]" />
                          التفاصيل
                        </Button>
                        {can("fleet.assignments.manage") && item.status !== "Ended" && (
                          <Button
                            variant="danger"
                            onClick={() => handleOpenClose(item)}
                            className="text-xs py-1 px-2.5"
                          >
                            إنهاء العقد
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Agreement */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="إنهاء اتفاقية تأجير مركبات بين كفيلين (منصة كيتا)"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
          <Card className="p-3 bg-blue-50/60 dark:bg-blue-950/40 border-blue-200 text-xs text-blue-900 dark:text-blue-200 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#1167c9]" />
              خطوات إنشاء اتفاقية التأجير:
            </p>
            <p>1. حدد الكفيل المؤجّر والكفيل المستأجر (يجب أن يختلفا).</p>
            <p>2. حدد تواريخ السريان لفلترة وجلب المركبات المملوكة للكفيل المؤجّر المتاحة.</p>
            <p>3. حدد المركبات المطلوبة وتأكيد الإنشاء.</p>
          </Card>

          {/* Sponsors Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                الكفيل المؤجّر (الكفيل الأصلي للمركبات) <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={sponsorOptions}
                value={lessorSponsorId}
                onChange={handleLessorChange}
                placeholder="اختر الكفيل المؤجّر..."
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                الكفيل المستأجر (الكفيل المشغّل المؤقت) <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={sponsorOptions}
                value={lesseeSponsorId}
                onChange={setLesseeSponsorId}
                placeholder="اختر الكفيل المستأجر..."
              />
              {lessorSponsorId && lesseeSponsorId && lessorSponsorId === lesseeSponsorId && (
                <p className="text-[11px] font-bold text-red-600 mt-1">
                  * يجب أن يكون الكفيل المستأجر مختلفاً عن الكفيل المؤجّر.
                </p>
              )}
            </div>
          </div>

          {/* Validity Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                تاريخ بدء السريان <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={effectiveFrom}
                onChange={(e) => handleEffectiveFromChange(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                تاريخ انتهاء السريان (اختياري)
              </label>
              <Input
                type="date"
                value={effectiveTo}
                onChange={(e) => handleEffectiveToChange(e.target.value)}
                placeholder="اتركه فارغاً لاتفاقية مفتوحة"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
                تاريخ توقيع العقد (اختياري)
              </label>
              <Input
                type="date"
                value={agreementDate}
                onChange={(e) => setAgreementDate(e.target.value)}
              />
            </div>
          </div>

          {/* Eligible Vehicles Selection Section */}
          <div className="border border-[var(--border)] rounded-2xl p-4 space-y-3 bg-[var(--subtle-bg)]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-[var(--foreground)] flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-[#1167c9]" />
                المركبات المؤهلة للتأجير ({eligibleVehicles.length})
                <span className="text-red-500">*</span>
              </label>

              {eligibleVehicles.length > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSelectAllVehicles}
                  className="text-[11px] py-0.5 px-2 h-auto"
                >
                  {filteredEligibleVehicles.length > 0 &&
                  filteredEligibleVehicles.every((v) => selectedVehicleIds.includes(v.vehicleId))
                    ? "إلغاء تحديد الكل"
                    : "تحديد الكل"}
                </Button>
              )}
            </div>

            {/* Search Input for Eligible Vehicles */}
            {eligibleVehicles.length > 0 && (
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)]" />
                <Input
                  value={vehicleSearchQuery}
                  onChange={(e) => setVehicleSearchQuery(e.target.value)}
                  placeholder="ابحث في المركبات المؤهلة (برقم الأصل، اللوحة، التسجيل...)"
                  className="pr-9 text-xs h-8 rounded-xl bg-[var(--surface)]"
                />
              </div>
            )}

            {loadingEligible ? (
              <div className="py-6 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-[#1167c9]" />
                <span>جاري تحميل المركبات المملوكة للكفيل المؤجّر والمؤهلة للتأجير...</span>
              </div>
            ) : eligibleError ? (
              <div className="py-4 text-center text-xs text-red-600 font-semibold">
                {eligibleError}
              </div>
            ) : eligibleVehicles.length === 0 ? (
              <div className="py-6 text-center text-xs text-[var(--muted)]">
                {lessorSponsorId
                  ? "لا توجد مركبات مملوكة للكفيل المؤجّر ومتاحة للتأجير (غير مربوطة باتفاقيات كيتا متداخلة في هذا التاريخ)."
                  : "يرجى اختيار الكفيل المؤجّر أولاً لعرض المركبات المؤهلة."}
              </div>
            ) : filteredEligibleVehicles.length === 0 ? (
              <div className="py-6 text-center text-xs text-[var(--muted)]">
                لا توجد مركبات مؤهلة تطابق كلمة البحث "{vehicleSearchQuery}".
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {filteredEligibleVehicles.map((v) => {
                  const isSelected = selectedVehicleIds.includes(v.vehicleId);
                  return (
                    <div
                      key={v.vehicleId}
                      onClick={() => handleToggleSelectVehicle(v.vehicleId)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? "border-[#1167c9] bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 font-bold"
                          : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--subtle-bg)] text-[var(--foreground)]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // handled by parent div onClick
                          className="h-4 w-4 rounded border-gray-300 text-[#1167c9] focus:ring-[#1167c9]"
                        />
                        <div>
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            أصل: {v.assetNumber} {v.registrationNumber ? `| تسجيل: ${v.registrationNumber}` : ""}
                          </div>
                          <div className="text-[11px] text-[var(--muted)]">
                            اللوحة: {v.plateNumberAr || v.plateNumberEn || "—"} | النوع: {v.vehicleType}
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                        {v.operationalStatus}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-[11px] text-[var(--muted)] font-semibold flex items-center justify-between">
              <span>
                تم تحديد <strong className="text-[#1167c9] font-mono">{selectedVehicleIds.length}</strong> من أصل {eligibleVehicles.length} مركبة.
              </span>
              {vehicleSearchQuery && (
                <span className="text-[10px] text-slate-500">
                  (معروض: {filteredEligibleVehicles.length})
                </span>
              )}
            </div>
          </div>

          {/* Reference & Notes */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              مرجع الاتفاقية (اختياري - أقصى 200 حرف)
            </label>
            <Input
              value={agreementReference}
              onChange={(e) => setAgreementReference(e.target.value)}
              placeholder="مثال: عقد تأجير مركبات كيتا دفعة سبتمبر 2026"
              maxLength={200}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              ملاحظات إضافية (اختياري - أقصى 4000 حرف)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="أدخل أي ملاحظات تشغيلية حول هذا العقد..."
              maxLength={4000}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs text-[var(--foreground)] focus:border-[#1167c9] focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
              disabled={isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                isPending ||
                !lessorSponsorId ||
                !lesseeSponsorId ||
                lessorSponsorId === lesseeSponsorId ||
                !effectiveFrom ||
                selectedVehicleIds.length === 0
              }
              className="gap-2"
            >
              {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              حفظ وإنشاء العقد
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Close Agreement */}
      <Modal
        isOpen={isCloseOpen}
        onClose={() => setIsCloseOpen(false)}
        title="إنهاء عقد تأجير الكفلاء"
      >
        {closeTargetAgreement && (
          <form onSubmit={handleCloseSubmit} className="space-y-4 pt-2">
            <Card className="p-3 bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                تأكيد إنهاء الاتفاقية:
              </p>
              <p>
                العقد: <strong>{closeTargetAgreement.agreementReference || closeTargetAgreement.id}</strong>
              </p>
              <p>
                الكفيل المؤجّر: <strong>{closeTargetAgreement.lessorSponsorNameAr}</strong> | الكفيل المستأجر: <strong>{closeTargetAgreement.lesseeSponsorNameAr}</strong>
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1">
                * ملاحظة: إنهاء الاتفاقية اليوم يجعلها سارية اليوم، ويتوقف منح الصلاحيات للمستأجر اعتباراً من الغد.
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
                placeholder="أدخل سبب إنهاء العقد (مثال: انتهاء فترة التأجير المحددة واستعادة المركبات)..."
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

      {/* Modal: View Agreement Details */}
      <Modal
        isOpen={Boolean(viewAgreement)}
        onClose={() => setViewAgreement(null)}
        title="تفاصيل عقد تأجير الكفلاء"
      >
        {viewAgreement && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-[var(--subtle-bg)] rounded-xl border border-[var(--border)]">
              <div>
                <span className="text-[var(--muted)] font-semibold">مرجع العقد:</span>
                <div className="font-bold font-mono text-[#1167c9]">
                  {viewAgreement.agreementReference || viewAgreement.id}
                </div>
              </div>

              <div>
                <span className="text-[var(--muted)] font-semibold">المنصة:</span>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {viewAgreement.platformCode} ({viewAgreement.platformNameAr})
                </div>
              </div>

              <div>
                <span className="text-[var(--muted)] font-semibold">الكفيل المؤجّر (الأصلي):</span>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {viewAgreement.lessorSponsorNameAr}
                </div>
              </div>

              <div>
                <span className="text-[var(--muted)] font-semibold">الكفيل المستأجر (المشغّل):</span>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {viewAgreement.lesseeSponsorNameAr}
                </div>
              </div>

              <div>
                <span className="text-[var(--muted)] font-semibold">تاريخ البداية:</span>
                <div className="font-bold font-mono">{viewAgreement.effectiveFrom}</div>
              </div>

              <div>
                <span className="text-[var(--muted)] font-semibold">تاريخ النهاية:</span>
                <div className="font-bold font-mono">{viewAgreement.effectiveTo || "مفتوح"}</div>
              </div>

              <div>
                <span className="text-[var(--muted)] font-semibold">الحالة:</span>
                <div className="mt-0.5">{renderStatusBadge(viewAgreement.status)}</div>
              </div>

              {viewAgreement.endReason && (
                <div className="col-span-2">
                  <span className="text-[var(--muted)] font-semibold">سبب الإنهاء:</span>
                  <div className="font-semibold text-red-600 dark:text-red-400 mt-0.5">
                    {viewAgreement.endReason}
                  </div>
                </div>
              )}

              {viewAgreement.notes && (
                <div className="col-span-2">
                  <span className="text-[var(--muted)] font-semibold">ملاحظات:</span>
                  <div className="text-slate-700 dark:text-slate-300 mt-0.5 bg-white dark:bg-slate-900 p-2 rounded-lg border">
                    {viewAgreement.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Vehicles Table */}
            <div>
              <h4 className="font-bold text-xs text-[var(--foreground)] mb-2 flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-[#1167c9]" />
                المركبات المشمولة بالعقد ({viewAgreement.vehicles.length})
              </h4>
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[var(--subtle-bg)] font-bold text-[var(--muted)]">
                    <tr>
                      <th className="p-2.5">رقم الأصل</th>
                      <th className="p-2.5">رقم التسجيل</th>
                      <th className="p-2.5">رقم اللوحة</th>
                      <th className="p-2.5 text-center">الرابط</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {viewAgreement.vehicles.map((v) => (
                      <tr key={v.id} className="hover:bg-[var(--subtle-bg)]">
                        <td className="p-2.5 font-mono font-bold text-[#1167c9]">{v.assetNumber}</td>
                        <td className="p-2.5 font-mono">{v.registrationNumber || "—"}</td>
                        <td className="p-2.5 font-mono">{v.plateNumberAr || v.plateNumberEn || "—"}</td>
                        <td className="p-2.5 text-center">
                          <Link
                            href={`/dashboard/fleet/vehicles/${v.vehicleId}`}
                            className="inline-flex items-center gap-1 text-[#1167c9] hover:underline font-bold"
                          >
                            <span>المركبة</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              <Link
                href={`/dashboard/fleet/vehicle-account-assignments/leases/${viewAgreement.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1167c9] text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Printer className="h-4 w-4" />
                <span>معاينة وتصدير العقد (PDF)</span>
              </Link>
              <Button variant="secondary" onClick={() => setViewAgreement(null)}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function EyeIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
