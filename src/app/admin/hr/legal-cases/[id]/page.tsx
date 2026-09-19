"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getLegalCase,
  archiveLegalCase,
  getLegalCaseHistory,
  archiveHearing,
  type LegalCaseDetail,
  type LegalCaseHearing,
  type LegalCaseHistoryItem,
} from "@/lib/hr/legal-cases-api";
import {
  CaseStatusBadge,
  HearingStatusBadge,
  PartyRoleBadge,
  PersonTypeBadge,
} from "@/components/hr/legal-cases/LegalCaseStatusBadge";
import { LegalCaseFormModal } from "@/components/hr/legal-cases/LegalCaseFormModal";
import { LegalCaseArchiveModal } from "@/components/hr/legal-cases/LegalCaseArchiveModal";
import { HearingFormModal } from "@/components/hr/legal-cases/HearingFormModal";
import { HearingFilesCard } from "@/components/hr/legal-cases/HearingFilesCard";
import { LegalCaseHistoryTab } from "@/components/hr/legal-cases/LegalCaseHistoryTab";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Scale,
  ArrowRight,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  User,
  Building2,
  MapPin,
  Plus,
  History,
  AlertCircle,
  FileText,
  Shield,
  Gavel,
  CheckCircle2,
} from "lucide-react";

export default function LegalCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { can } = useAuth();
  const canRead = can("legal_cases.read");
  const canManage = can("legal_cases.manage");

  const [legalCase, setLegalCase] = useState<LegalCaseDetail | null>(null);
  const [history, setHistory] = useState<LegalCaseHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<"hearings" | "history">("hearings");

  // Modals
  const [isEditCaseOpen, setIsEditCaseOpen] = useState(false);
  const [isArchiveCaseOpen, setIsArchiveCaseOpen] = useState(false);
  const [isAddHearingOpen, setIsAddHearingOpen] = useState(false);
  const [editingHearing, setEditingHearing] = useState<LegalCaseHearing | null>(null);
  const [archivingHearing, setArchivingHearing] = useState<LegalCaseHearing | null>(null);

  const fetchCaseDetails = useCallback(async () => {
    if (!id || !canRead) return;
    setLoading(true);
    try {
      const data = await getLegalCase(id);
      setLegalCase(data);
    } catch (err: any) {
      console.error("Failed to load legal case details:", err);
    } finally {
      setLoading(false);
    }
  }, [id, canRead]);

  const fetchHistory = useCallback(async () => {
    if (!id || !canRead) return;
    setLoadingHistory(true);
    try {
      const historyData = await getLegalCaseHistory(id);
      setHistory(historyData);
    } catch (err: any) {
      console.error("Failed to load legal case history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [id, canRead]);

  useEffect(() => {
    fetchCaseDetails();
  }, [fetchCaseDetails]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  const handleArchiveCaseConfirm = async (reason: string) => {
    if (!legalCase) return;
    await archiveLegalCase(legalCase.id, {
      rowVersion: legalCase.rowVersion,
      reason,
    });
    router.push("/admin/hr/legal-cases");
  };

  const handleArchiveHearingConfirm = async (reason: string) => {
    if (!archivingHearing || !legalCase) return;
    await archiveHearing(legalCase.id, archivingHearing.id, {
      rowVersion: archivingHearing.rowVersion,
      reason,
    });
    setArchivingHearing(null);
    fetchCaseDetails();
  };

  if (!canRead) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <div className="mx-auto size-14 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600 mb-4">
          <AlertCircle className="size-7" />
        </div>
        <h2 className="text-xl font-bold text-[var(--foreground)]">غير مصرح لك بالوصول</h2>
        <p className="text-sm text-[var(--muted)] mt-1">
          تحتاج إلى صلاحية قراءة القضايا القانونية (`legal_cases.read`) لعرض تفاصيل هذه القضية.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-sm text-[var(--muted)]" dir="rtl">
        <div className="size-8 mx-auto mb-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        جاري تحميل تفاصيل القضية والجلسات...
      </div>
    );
  }

  if (!legalCase) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <Scale className="size-12 text-[var(--muted)] mx-auto mb-3 opacity-60" />
        <h2 className="text-xl font-bold text-[var(--foreground)]">القضية غير موجودة</h2>
        <p className="text-sm text-[var(--muted)] mt-1">
          تعذر العثور على القضية القانونية المطلوبة أو ربما تمت أرشفتها.
        </p>
        <Link href="/admin/hr/legal-cases" className="mt-4 inline-block">
          <Button variant="primary" className="h-9 px-3 text-xs">
            العودة إلى قائمة القضايا
          </Button>
        </Link>
      </div>
    );
  }

  // Resolved parties
  const claimantName =
    legalCase.claimant?.name ||
    (legalCase.sponsorPartyRole === "Claimant"
      ? legalCase.sponsorNameAr || legalCase.sponsorNameEn || "الكفيل"
      : legalCase.personName || "الشخص");

  const claimantType =
    legalCase.claimant?.type ||
    (legalCase.sponsorPartyRole === "Claimant"
      ? "كفيل"
      : legalCase.personType === "Employee"
      ? "موظف"
      : legalCase.personType === "Rider"
      ? "سائق"
      : "طرف خارجي");

  const defendantName =
    legalCase.defendant?.name ||
    (legalCase.sponsorPartyRole === "Defendant"
      ? legalCase.sponsorNameAr || legalCase.sponsorNameEn || "الكفيل"
      : legalCase.personName || "الشخص");

  const defendantType =
    legalCase.defendant?.type ||
    (legalCase.sponsorPartyRole === "Defendant"
      ? "كفيل"
      : legalCase.personType === "Employee"
      ? "موظف"
      : legalCase.personType === "Rider"
      ? "سائق"
      : "طرف خارجي");

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Breadcrumbs & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <Link
            href="/admin/hr/legal-cases"
            className="hover:text-indigo-600 transition-colors flex items-center gap-1"
          >
            <ArrowRight className="size-3.5" />
            القضايا القانونية
          </Link>
          <span>/</span>
          <span className="text-[var(--foreground)] font-mono font-medium">
            {legalCase.caseNumber}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Button
                variant="ghost"
                onClick={() => setIsEditCaseOpen(true)}
                className="flex items-center gap-1.5 h-8 px-2.5 text-xs"
              >
                <Pencil className="size-3.5" />
                تعديل القضية
              </Button>

              <Button
                variant="ghost"
                onClick={() => setIsArchiveCaseOpen(true)}
                className="flex items-center gap-1.5 h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="size-3.5" />
                أرشفة القضية
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Case Header Card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[var(--border)] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black font-mono text-[var(--foreground)]">
                {legalCase.caseNumber}
              </span>
              <CaseStatusBadge status={legalCase.status} />
            </div>
            <p className="text-xs text-[var(--muted)]">
              المسؤول عن المتابعة: {legalCase.responsibleUserName || "مستخدم مسؤول"}
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-[var(--muted)]">
            <div className="flex items-center gap-1.5">
              <Calendar className="size-4 text-indigo-500" />
              <span>تاريخ القضية:</span>
              <span className="font-mono font-semibold text-[var(--foreground)]">
                {legalCase.caseDate}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="size-4 text-indigo-500" />
              <span>الوقت (الرياض):</span>
              <span className="font-mono font-semibold text-[var(--foreground)]">
                {legalCase.caseTime}
              </span>
            </div>
          </div>
        </div>

        {/* Parties Showcase Card: Claimant vs Defendant */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Claimant (المدعي) */}
          <div className="p-4 rounded-2xl border border-indigo-200/80 bg-indigo-50/40 dark:bg-indigo-950/20 dark:border-indigo-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-sm">
                <Scale className="size-3.5" />
                المدعي (Claimant)
              </span>
              <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                {claimantType}
              </span>
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">
              {claimantName}
            </p>
            {legalCase.sponsorPartyRole === "Claimant" ? (
              <p className="text-xs text-[var(--muted)]">
                تم رفع الدعوى بواسطة الكفيل ضد الطرف الآخر.
              </p>
            ) : (
              <p className="text-xs text-[var(--muted)]">
                تم رفع الدعوى بواسطة الشخص ضد الكفيل.
              </p>
            )}
          </div>

          {/* Defendant (المدعى عليه) */}
          <div className="p-4 rounded-2xl border border-purple-200/80 bg-purple-50/40 dark:bg-purple-950/20 dark:border-purple-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-600 text-white shadow-sm">
                <Shield className="size-3.5" />
                المدعى عليه (Defendant)
              </span>
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                {defendantType}
              </span>
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">
              {defendantName}
            </p>
            {legalCase.sponsorPartyRole === "Defendant" ? (
              <p className="text-xs text-[var(--muted)]">
                الكفيل هو الطرف المدعى عليه في هذه القضية.
              </p>
            ) : (
              <p className="text-xs text-[var(--muted)]">
                الطرف الآخر هو المدعى عليه في هذه القضية.
              </p>
            )}
          </div>
        </div>

        {/* Case Details & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="rounded-xl border border-[var(--border)] bg-slate-50/40 dark:bg-slate-900/20 p-3.5 space-y-1.5">
            <h4 className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1.5">
              <FileText className="size-3.5 text-indigo-500" />
              تفاصيل وموضوع القضية
            </h4>
            <p className="text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
              {legalCase.details || "—"}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-slate-50/40 dark:bg-slate-900/20 p-3.5 space-y-1.5">
            <h4 className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-1.5">
              <FileText className="size-3.5 text-[var(--muted)]" />
              ملاحظات وتوجيهات
            </h4>
            <p className="text-xs text-[var(--muted)] leading-relaxed whitespace-pre-wrap">
              {legalCase.notes || "لا توجد ملاحظات إضافية مسجلة."}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("hearings")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "hearings"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Gavel className="size-4" />
          الجلسات القضائية ({legalCase.hearings?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "history"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <History className="size-4" />
          سجل التغييرات والتدقيق
        </button>
      </div>

      {/* Tab 1: Hearings */}
      {activeTab === "hearings" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[var(--foreground)]">
                جدول الجلسات القضائية
              </h3>
              <span className="text-xs text-[var(--muted)]">
                (يتم ترقيم الجلسات تلقائياً وبالتسلسل)
              </span>
            </div>

            {canManage && (
              <Button
                variant="primary"
                onClick={() => setIsAddHearingOpen(true)}
                className="flex items-center gap-1.5 h-8 px-3 text-xs"
              >
                <Plus className="size-3.5" />
                إضافة جلسة جديدة
              </Button>
            )}
          </div>

          {legalCase.hearings?.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <Gavel className="size-10 text-[var(--muted)] mx-auto mb-3 opacity-60" />
              <h4 className="text-sm font-semibold text-[var(--foreground)]">
                لا توجد جلسات مسجلة لهذه القضية حتى الآن
              </h4>
              <p className="text-xs text-[var(--muted)] mt-1">
                يمكنك إضافة أول جلسة قضائية ومرفقاتها ومكان انعقادها من الزر أعلاه.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {legalCase.hearings.map((hearing) => (
                <div
                  key={hearing.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm space-y-4 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors"
                >
                  {/* Hearing Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center font-bold font-mono text-indigo-700 dark:text-indigo-300 text-xs">
                        #{hearing.hearingNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[var(--foreground)]">
                            الجلسة رقم {hearing.hearingNumber}
                          </h4>
                          <HearingStatusBadge status={hearing.status} />
                        </div>
                        {hearing.location && (
                          <div className="flex items-center gap-1 text-xs text-[var(--muted)] mt-0.5">
                            <MapPin className="size-3 text-rose-500" />
                            <span>{hearing.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Calendar className="size-3.5" />
                        <span>{hearing.hearingDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="size-3.5" />
                        <span>{hearing.hearingTime}</span>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1 border-r border-[var(--border)] pr-3 mr-1">
                          <button
                            type="button"
                            onClick={() => setEditingHearing(hearing)}
                            className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                            title="تعديل الجلسة"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setArchivingHearing(hearing)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title="أرشفة الجلسة"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hearing Content */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-semibold text-[var(--foreground)] ml-1">
                        تفاصيل ومجريات الجلسة:
                      </span>
                      <p className="text-[var(--foreground)] mt-1 whitespace-pre-wrap leading-relaxed">
                        {hearing.details}
                      </p>
                    </div>

                    {hearing.notes && (
                      <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 text-[var(--muted)]">
                        <span className="font-semibold ml-1">الملاحظات:</span>
                        <span>{hearing.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Hearing Files Component */}
                  <div className="pt-2 border-t border-[var(--border)]">
                    <HearingFilesCard
                      caseId={legalCase.id}
                      hearingId={hearing.id}
                      hearingNumber={hearing.hearingNumber}
                      files={hearing.files || []}
                      onFilesChanged={() => fetchCaseDetails()}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Audit History */}
      {activeTab === "history" && (
        <LegalCaseHistoryTab history={history} loading={loadingHistory} />
      )}

      {/* Edit Case Modal */}
      <LegalCaseFormModal
        isOpen={isEditCaseOpen}
        onClose={() => setIsEditCaseOpen(false)}
        onSuccess={() => {
          fetchCaseDetails();
        }}
        caseToEdit={legalCase}
      />

      {/* Archive Case Modal */}
      <LegalCaseArchiveModal
        isOpen={isArchiveCaseOpen}
        onClose={() => setIsArchiveCaseOpen(false)}
        onConfirm={handleArchiveCaseConfirm}
        title="أرشفة القضية القانونية"
        itemDescription={`هل أنت متأكد من رغبتك في أرشفة القضية رقم "${legalCase.caseNumber}"؟ سيتم نقلها للأرشيف وحفظ سجل التدقيق.`}
      />

      {/* Add / Edit Hearing Modal */}
      <HearingFormModal
        isOpen={isAddHearingOpen || !!editingHearing}
        onClose={() => {
          setIsAddHearingOpen(false);
          setEditingHearing(null);
        }}
        caseId={legalCase.id}
        onSuccess={() => {
          fetchCaseDetails();
        }}
        hearingToEdit={editingHearing}
      />

      {/* Archive Hearing Modal */}
      <LegalCaseArchiveModal
        isOpen={!!archivingHearing}
        onClose={() => setArchivingHearing(null)}
        onConfirm={handleArchiveHearingConfirm}
        title="أرشفة الجلسة القضائية"
        itemDescription={`هل أنت متأكد من رغبتك في أرشفة الجلسة رقم ${archivingHearing?.hearingNumber}؟`}
      />
    </div>
  );
}
