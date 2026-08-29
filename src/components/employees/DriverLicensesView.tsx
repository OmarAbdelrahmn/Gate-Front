"use client";

import { useEffect, useState } from "react";
import {
  Archive,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  FileCheck2,
  FileText,
  History,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { hrCatalogApi, type HrRow } from "../../lib/hr/api";
import {
  archiveDriverLicense,
  createDriverLicense,
  getDriverLicenses,
  updateDriverLicense,
  type DriverLicense,
  type DriverLicenseInput,
} from "../../lib/workforce/compliance-api";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { toast } from "../ui/Toast";

const BOOKING_STATUSES = [
  { value: "NotApplicable", labelAr: "غير منطبق (NotApplicable)", labelEn: "Not Applicable" },
  { value: "NotBooked", labelAr: "غير محجوز (NotBooked)", labelEn: "Not Booked" },
  { value: "WaitingForAppointment", labelAr: "في انتظار موعد (WaitingForAppointment)", labelEn: "Waiting For Appointment" },
  { value: "Booked", labelAr: "تم الحجز (Booked)", labelEn: "Booked" },
  { value: "Cancelled", labelAr: "ملغى (Cancelled)", labelEn: "Cancelled" },
  { value: "Unknown", labelAr: "غير معروف (Unknown)", labelEn: "Unknown" },
];

const ISSUANCE_STATUSES = [
  { value: "NotStarted", labelAr: "لم يبدأ (NotStarted)", labelEn: "Not Started" },
  { value: "InProgress", labelAr: "قيد الإجراء (InProgress)", labelEn: "In Progress" },
  { value: "Issued", labelAr: "تم الإصدار (Issued)", labelEn: "Issued" },
  { value: "Rejected", labelAr: "مرفوض (Rejected)", labelEn: "Rejected" },
  { value: "Cancelled", labelAr: "ملغى (Cancelled)", labelEn: "Cancelled" },
];

const LICENSE_STATUSES = [
  { value: "Active", labelAr: "نشطة (Active)", labelEn: "Active" },
  { value: "Application", labelAr: "تحت الطلب (Application)", labelEn: "Application" },
  { value: "Expired", labelAr: "منتهية (Expired)", labelEn: "Expired" },
  { value: "Suspended", labelAr: "موقوفة (Suspended)", labelEn: "Suspended" },
  { value: "Revoked", labelAr: "مسحوبة (Revoked)", labelEn: "Revoked" },
  { value: "Rejected", labelAr: "مرفوضة (Rejected)", labelEn: "Rejected" },
  { value: "Superseded", labelAr: "مستبدلة (Superseded)", labelEn: "Superseded" },
  { value: "Cancelled", labelAr: "ملغاة (Cancelled)", labelEn: "Cancelled" },
];

function getLicenseStatusBadge(status: string, locale: "ar" | "en") {
  switch (status) {
    case "Active":
      return {
        label: locale === "en" ? "Active" : "نشطة",
        className: "bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold",
      };
    case "Expired":
      return {
        label: locale === "en" ? "Expired" : "منتهية",
        className: "bg-red-100 text-red-800 border border-red-300 font-bold",
      };
    case "Application":
    case "InProgress":
      return {
        label: locale === "en" ? status : "تحت الطلب",
        className: "bg-blue-100 text-blue-800 border border-blue-300 font-bold",
      };
    case "Suspended":
    case "Revoked":
      return {
        label: locale === "en" ? status : "موقوفة / مسحوبة",
        className: "bg-amber-100 text-amber-900 border border-amber-300 font-bold",
      };
    default:
      return {
        label: status,
        className: "bg-slate-100 text-slate-700 border border-slate-300 font-bold",
      };
  }
}

function formatDate(value: string | null | undefined, locale: "ar" | "en" = "ar") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-arab" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatMaskedNumber(masked: string | null | undefined) {
  if (!masked) return "••••5312";
  // Replace * with bullet symbol • for premium presentation
  return masked.replace(/\*/g, "•");
}

export function DriverLicensesView({
  employeeId,
  compact = false,
  onPreviewDocument,
  onOpenRiderHistory,
}: {
  employeeId: string;
  compact?: boolean;
  onPreviewDocument?: (documentId: string, title: string) => void;
  onOpenRiderHistory?: () => void;
}) {
  const { locale } = useAuth();
  const isEn = locale === "en";

  const [licenses, setLicenses] = useState<DriverLicense[]>([]);
  const [categories, setCategories] = useState<HrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<DriverLicense | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [driverLicenseCategoryId, setDriverLicenseCategoryId] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [bookingStatus, setBookingStatus] = useState("NotApplicable");
  const [issuanceStatus, setIssuanceStatus] = useState("Issued");
  const [licenseStatus, setLicenseStatus] = useState("Active");
  const [isCurrent, setIsCurrent] = useState(true);
  const [notes, setNotes] = useState("");

  // Archive Modal State
  const [archivingLicense, setArchivingLicense] = useState<DriverLicense | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveBusy, setArchiveBusy] = useState(false);

  // View Details Modal State
  const [viewingLicense, setViewingLicense] = useState<DriverLicense | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [licensesData, catData] = await Promise.all([
        getDriverLicenses(employeeId),
        hrCatalogApi.list("driver-license-categories").catch(() => []),
      ]);
      setLicenses(licensesData || []);
      setCategories(catData || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEn
          ? "Unable to fetch driver licenses."
          : "تعذر تحميل بيانات رخص القيادة.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      void loadData();
    }
  }, [employeeId]);

  const openAddModal = () => {
    setEditingLicense(null);
    setDriverLicenseCategoryId(categories[0]?.id || "");
    setLicenseNumber("");
    setIssueDate("");
    setExpiryDate("");
    setBookingStatus("NotApplicable");
    setIssuanceStatus("Issued");
    setLicenseStatus("Active");
    setIsCurrent(true);
    setNotes("");
    setIsModalOpen(true);
  };

  const openEditModal = (license: DriverLicense) => {
    setEditingLicense(license);
    setDriverLicenseCategoryId(license.driverLicenseCategoryId || categories[0]?.id || "");
    setLicenseNumber(license.licenseNumberMasked || "");
    setIssueDate(license.issueDate ? license.issueDate.split("T")[0] : "");
    setExpiryDate(license.expiryDate ? license.expiryDate.split("T")[0] : "");
    setBookingStatus(license.bookingStatus || "NotApplicable");
    setIssuanceStatus(license.issuanceStatus || "Issued");
    setLicenseStatus(license.licenseStatus || "Active");
    setIsCurrent(Boolean(license.isCurrent));
    setNotes(license.notes || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverLicenseCategoryId) {
      toast.error(isEn ? "Category selection is required" : "فئة الرخصة مطلوبة");
      return;
    }
    if (!licenseNumber.trim()) {
      toast.error(isEn ? "License number is required" : "رقم الرخصة مطلوب");
      return;
    }

    setSubmitting(true);
    try {
      const payload: DriverLicenseInput = {
        driverLicenseCategoryId,
        licenseNumber: licenseNumber.trim(),
        issueDate: issueDate || null,
        expiryDate: expiryDate || null,
        bookingStatus,
        issuanceStatus,
        licenseStatus,
        isCurrent,
        notes: notes.trim() || null,
        rowVersion: editingLicense ? editingLicense.rowVersion : null,
      };

      if (editingLicense) {
        await updateDriverLicense(employeeId, editingLicense.id, payload);
        toast.success(
          isEn ? "License Updated" : "تم تحديث الرخصة",
          isEn ? "Driver license details updated successfully." : "تم تحديث بيانات رخصة القيادة بنجاح.",
        );
      } else {
        await createDriverLicense(employeeId, payload);
        toast.success(
          isEn ? "License Added" : "تمت إضافة الرخصة",
          isEn ? "New driver license added successfully." : "تمت إضافة رخصة قيادة جديدة بنجاح.",
        );
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isEn
          ? "Failed to save driver license."
          : "تعذر حفظ بيانات رخصة القيادة.";
      toast.error(isEn ? "Save Failed" : "فشل الحفظ", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivingLicense) return;
    if (!archiveReason.trim()) {
      toast.error(isEn ? "Reason is required to archive" : "سبب الأرشفة مطلوب");
      return;
    }

    setArchiveBusy(true);
    try {
      await archiveDriverLicense(
        archivingLicense.id,
        archiveReason.trim(),
        archivingLicense.rowVersion,
      );
      toast.success(
        isEn ? "License Archived" : "تمت أرشفة الرخصة",
        isEn ? "Driver license archived successfully." : "تمت أرشفة رخصة القيادة بنجاح.",
      );
      setArchivingLicense(null);
      setArchiveReason("");
      await loadData();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isEn
          ? "Failed to archive driver license."
          : "تعذر أرشفة رخصة القيادة.";
      toast.error(isEn ? "Archive Failed" : "فشلت الأرشفة", msg);
    } finally {
      setArchiveBusy(false);
    }
  };

  // Compact Mode Render (for the upper profile card slot)
  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <h2 className="flex items-center gap-2 font-black text-sm text-[var(--foreground)]">
            <FileCheck2 size={18} className="text-[#1167c9]" />
            {isEn ? "Driver Licenses" : "رخص القيادة"}
          </h2>
          <Button onClick={openAddModal} className="h-7 px-2.5 text-xs font-bold gap-1">
            <Plus size={13} />
            {isEn ? "Add" : "إضافة"}
          </Button>
        </div>

        {loading ? (
          <div className="py-4 text-center text-xs text-[var(--muted)] animate-pulse">
            {isEn ? "Loading..." : "جارٍ التحميل..."}
          </div>
        ) : licenses.length > 0 ? (
          <div className="space-y-2">
            {licenses.map((lic) => {
              const catItem = categories.find((c) => c.id === lic.driverLicenseCategoryId);
              const catTitle: string =
                typeof catItem?.nameAr === "string"
                  ? catItem.nameAr
                  : typeof catItem?.nameEn === "string"
                  ? catItem.nameEn
                  : lic.categoryAr || (isEn ? "Light Transport" : "نقل خفيف");
              const badge = getLicenseStatusBadge(lic.licenseStatus, locale);

              return (
                <div
                  key={lic.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5 border border-slate-100 transition-all hover:bg-slate-100/80"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-xs text-slate-900">{catTitle}</span>
                    {lic.isCurrent && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 text-[#1167c9] border border-blue-200 px-2 py-0.5 text-[10px] font-black">
                        <Sparkles size={10} />
                        {isEn ? "Current" : "السارية حالياً"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-black text-[#1167c9] tracking-wider" dir="ltr">
                      {formatMaskedNumber(lic.licenseNumberMasked)}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${badge.className}`}>
                      {badge.label}
                    </span>

                    <div className="flex items-center gap-1 ms-1">
                      <button
                        type="button"
                        onClick={() => setViewingLicense(lic)}
                        className="text-slate-500 hover:text-[#1167c9] p-0.5"
                        title={isEn ? "View Details" : "عرض التفاصيل"}
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(lic)}
                        className="text-slate-500 hover:text-[#1167c9] p-0.5"
                        title={isEn ? "Edit" : "تعديل"}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setArchivingLicense(lic);
                          setArchiveReason("");
                        }}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                        title={isEn ? "Archive" : "أرشفة"}
                      >
                        <Archive size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-xs font-bold text-[var(--muted)]">
              {isEn ? "No driver license record found" : "لا توجد رخصة قيادة مسجلة حالياً"}
            </p>
          </div>
        )}

        {/* Modal overlays */}
        {viewingLicense && renderDetailsModalForm()}
        {isModalOpen && renderModalForm()}
        {archivingLicense && renderArchiveModalForm()}
      </div>
    );
  }

  // Helper functions for rendering modals to share between compact and full mode
  function renderDetailsModalForm() {
    if (!viewingLicense) return null;
    const catItem = categories.find((c) => c.id === viewingLicense.driverLicenseCategoryId);
    const categoryTitle: string =
      typeof catItem?.nameAr === "string"
        ? catItem.nameAr
        : typeof catItem?.nameEn === "string"
        ? catItem.nameEn
        : viewingLicense.categoryAr || (isEn ? "Driver License" : "رخصة قيادة");
    const badge = getLicenseStatusBadge(viewingLicense.licenseStatus, locale);

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={() => setViewingLicense(null)}
      >
        <div
          className="relative w-full max-w-md rounded-2xl bg-[var(--surface)] p-6 shadow-2xl border border-[var(--border)] space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#1167c9]">
                <FileCheck2 size={20} />
              </span>
              <div>
                <h3 className="font-extrabold text-base">{categoryTitle}</h3>
                <p className="font-mono text-xs font-black text-[#1167c9]" dir="ltr">
                  {formatMaskedNumber(viewingLicense.licenseNumberMasked)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewingLicense(null)}
              className="grid h-8 w-8 place-items-center rounded-lg border text-[var(--muted)] hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted)] font-medium">{isEn ? "License Status" : "حالة الرخصة"}</span>
              <span className={`rounded-full px-2.5 py-0.5 font-bold ${badge.className}`}>{badge.label}</span>
            </div>

            {viewingLicense.isCurrent && (
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)] font-medium">{isEn ? "Current Active" : "السارية حالياً"}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-[#1167c9] border border-blue-200 px-2 py-0.5 text-[10px] font-black">
                  <Sparkles size={10} />
                  {isEn ? "Yes" : "نعم"}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
              <div>
                <span className="text-[var(--muted)] block font-medium">{isEn ? "Issue Date" : "تاريخ الإصدار"}</span>
                <span className="font-bold">{formatDate(viewingLicense.issueDate, locale)}</span>
              </div>
              <div>
                <span className="text-[var(--muted)] block font-medium">{isEn ? "Expiry Date" : "تاريخ الانتهاء"}</span>
                <span className="font-bold">{formatDate(viewingLicense.expiryDate, locale)}</span>
              </div>
              <div>
                <span className="text-[var(--muted)] block font-medium">{isEn ? "Issuance Status" : "حالة الإصدار"}</span>
                <span className="font-bold text-slate-700">{viewingLicense.issuanceStatus || "Issued"}</span>
              </div>
              <div>
                <span className="text-[var(--muted)] block font-medium">{isEn ? "Booking Status" : "حالة الحجز"}</span>
                <span className="font-bold text-slate-700">{viewingLicense.bookingStatus || "NotApplicable"}</span>
              </div>
            </div>

            {viewingLicense.notes && (
              <div className="pt-2 border-t border-[var(--border)]">
                <span className="text-[var(--muted)] block font-medium mb-1">{isEn ? "Notes" : "ملاحظات"}</span>
                <p className="rounded-xl bg-slate-50 p-2.5 text-slate-700 border border-slate-100 font-medium">
                  {viewingLicense.notes}
                </p>
              </div>
            )}

            {viewingLicense.employeeDocumentId && onPreviewDocument && (
              <div className="pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => {
                    setViewingLicense(null);
                    onPreviewDocument(viewingLicense.employeeDocumentId!, categoryTitle);
                  }}
                  className="inline-flex items-center gap-1.5 font-bold text-[#1167c9] hover:underline"
                >
                  <Eye size={15} />
                  {isEn ? "View Official Document" : "معاينة الوثيقة الرسمية"}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setViewingLicense(null)}
            >
              {isEn ? "Close" : "إغلاق"}
            </Button>
            <Button
              type="button"
              onClick={() => {
                const lic = viewingLicense;
                setViewingLicense(null);
                openEditModal(lic);
              }}
            >
              <Edit3 size={14} className="me-1" />
              {isEn ? "Edit License" : "تعديل الرخصة"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  function renderModalForm() {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={() => setIsModalOpen(false)}
      >
        <div
          className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl border border-[var(--border)] space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#1167c9]">
                <FileCheck2 size={20} />
              </span>
              <div>
                <h3 className="font-extrabold text-lg">
                  {editingLicense
                    ? isEn
                      ? "Edit Driver License"
                      : "تعديل رخصة القيادة"
                    : isEn
                    ? "Add Driver License"
                    : "إضافة رخصة قيادة جديدة"}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {isEn ? "All license endpoints use employeeId" : "تستخدم جميع العمليات المعرف الوظيفي للمندوب"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-lg border text-[var(--muted)] hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1">
                {isEn ? "License Category" : "فئة الرخصة"} <span className="text-rose-500">*</span>
              </label>
              <select
                value={driverLicenseCategoryId}
                onChange={(e) => setDriverLicenseCategoryId(e.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-bold focus:border-[#1167c9] outline-none"
                required
              >
                <option value="">{isEn ? "Select Category..." : "اختر الفئة..."}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {isEn ? (cat.nameEn as string) || (cat.nameAr as string) : (cat.nameAr as string)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">
                {isEn ? "License Number" : "رقم الرخصة"} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder={isEn ? "e.g. 1234567890" : "مثال: 1234567890"}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-mono font-bold focus:border-[#1167c9] outline-none"
                dir="ltr"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">
                  {isEn ? "Issue Date" : "تاريخ الإصدار"}
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium focus:border-[#1167c9] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">
                  {isEn ? "Expiry Date" : "تاريخ الانتهاء"}
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium focus:border-[#1167c9] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">
                  {isEn ? "License Status" : "حالة الرخصة"}
                </label>
                <select
                  value={licenseStatus}
                  onChange={(e) => setLicenseStatus(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 text-xs font-bold focus:border-[#1167c9] outline-none"
                >
                  {LICENSE_STATUSES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {isEn ? st.labelEn : st.labelAr}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">
                  {isEn ? "Issuance Status" : "حالة الإصدار"}
                </label>
                <select
                  value={issuanceStatus}
                  onChange={(e) => setIssuanceStatus(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 text-xs font-bold focus:border-[#1167c9] outline-none"
                >
                  {ISSUANCE_STATUSES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {isEn ? st.labelEn : st.labelAr}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">
                  {isEn ? "Booking Status" : "حالة الحجز"}
                </label>
                <select
                  value={bookingStatus}
                  onChange={(e) => setBookingStatus(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 text-xs font-bold focus:border-[#1167c9] outline-none"
                >
                  {BOOKING_STATUSES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {isEn ? st.labelEn : st.labelAr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-slate-50 p-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold select-none">
                <input
                  type="checkbox"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#1167c9] focus:ring-[#1167c9]"
                />
                <span>{isEn ? "Current Active License (isCurrent)" : "الرخصة الحالية السارية للمندوب (isCurrent)"}</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">
                {isEn ? "Notes" : "ملاحظات"}
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isEn ? "Optional notes or verification remarks..." : "ملاحظات اختياريّة أو بيانات التحقق من الرخصة..."}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs font-medium focus:border-[#1167c9] outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
              >
                {isEn ? "Cancel" : "إلغاء"}
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting
                  ? isEn
                    ? "Saving..."
                    : "جاري الحفظ..."
                  : editingLicense
                  ? isEn
                    ? "Update License"
                    : "تحديث الرخصة"
                  : isEn
                  ? "Add License"
                  : "إضافة الرخصة"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderArchiveModalForm() {
    if (!archivingLicense) return null;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={() => setArchivingLicense(null)}
      >
        <div
          className="relative w-full max-w-md rounded-2xl bg-[var(--surface)] p-6 shadow-2xl border border-[var(--border)] space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 text-rose-600">
            <ShieldAlert size={24} />
            <h3 className="font-extrabold text-lg">
              {isEn ? "Archive Driver License" : "أرشفة رخصة القيادة"}
            </h3>
          </div>

          <p className="text-xs text-[var(--muted)]">
            {isEn
              ? `Are you sure you want to archive license (${archivingLicense.licenseNumberMasked || archivingLicense.id})?`
              : `هل أنت تأكد من رغبتك في أرشفة الرخصة (${archivingLicense.licenseNumberMasked || archivingLicense.id})؟`}
          </p>

          <form onSubmit={handleConfirmArchive} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                {isEn ? "Archive Reason" : "سبب الأرشفة"} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder={isEn ? "e.g. License replaced by renewed record" : "مثال: تم استبدال الرخصة بسجل مجدد"}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium focus:border-rose-500 outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setArchivingLicense(null)}
                disabled={archiveBusy}
              >
                {isEn ? "Cancel" : "إلغاء"}
              </Button>
              <Button
                type="submit"
                loading={archiveBusy}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {archiveBusy
                  ? isEn
                    ? "Archiving..."
                    : "جاري الأرشفة..."
                  : isEn
                  ? "Confirm Archive"
                  : "تأكيد الأرشفة"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Standard Detailed Mode Render (for the Compliance Tabs)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div>
          <h3 className="text-base font-black flex items-center gap-2">
            <FileCheck2 size={18} className="text-[#1167c9]" />
            {isEn ? "Driver Licenses" : "رخص القيادة للمندوب"}
          </h3>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {isEn
              ? "View, add, update, and archive official driver licenses associated with this employee."
              : "عرض وإضافة وتحديث وأرشفة رخص القيادة الرسمية المسجلة للمندوب."}
          </p>
        </div>
        <Button onClick={openAddModal} className="h-9 px-3 text-xs gap-1.5 font-bold">
          <Plus size={15} />
          {isEn ? "Add License" : "إضافة رخصة قيادة"}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 font-bold">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="py-8 text-center text-xs text-[var(--muted)] animate-pulse">
          {isEn ? "Loading driver licenses..." : "جارٍ تحميل رخص القيادة..."}
        </div>
      ) : licenses.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {licenses.map((lic) => {
            const badge = getLicenseStatusBadge(lic.licenseStatus, locale);
            const catItem = categories.find((c) => c.id === lic.driverLicenseCategoryId);
            const categoryName: string =
              typeof catItem?.nameAr === "string"
                ? catItem.nameAr
                : typeof catItem?.nameEn === "string"
                ? catItem.nameEn
                : lic.categoryAr || (isEn ? "Driver License" : "رخصة قيادة");

            return (
              <div
                key={lic.id}
                className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition-all hover:shadow-md space-y-3"
              >
                <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-[var(--foreground)]">
                        {categoryName}
                      </h4>
                      {lic.isCurrent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-[#1167c9] border border-blue-200 px-2 py-0.5 text-[10px] font-black">
                          <Sparkles size={11} />
                          {isEn ? "Current" : "السارية حالياً"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-sm font-black text-[#1167c9]" dir="ltr">
                      {formatMaskedNumber(lic.licenseNumberMasked)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[var(--muted)] text-[11px] block">{isEn ? "Issue Date" : "تاريخ الإصدار"}</span>
                    <span className="font-bold">{formatDate(lic.issueDate, locale)}</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] text-[11px] block">{isEn ? "Expiry Date" : "تاريخ الانتهاء"}</span>
                    <span className="font-bold">{formatDate(lic.expiryDate, locale)}</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] text-[11px] block">{isEn ? "Issuance Status" : "حالة الإصدار"}</span>
                    <span className="font-semibold text-slate-700">{lic.issuanceStatus}</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)] text-[11px] block">{isEn ? "Booking Status" : "حالة الحجز"}</span>
                    <span className="font-semibold text-slate-700">{lic.bookingStatus}</span>
                  </div>
                </div>

                {lic.notes && (
                  <p className="rounded-xl bg-slate-50 p-2 text-xs text-slate-700 border border-slate-100" dir="auto">
                    <span className="font-bold text-slate-900">{isEn ? "Notes: " : "ملاحظات: "}</span>
                    {lic.notes}
                  </p>
                )}

                <div className="flex items-center justify-between border-t border-[var(--border)] pt-2.5 text-xs">
                  <div>
                    {lic.employeeDocumentId && onPreviewDocument && (
                      <button
                        type="button"
                        onClick={() => onPreviewDocument(lic.employeeDocumentId!, categoryName)}
                        className="inline-flex items-center gap-1 font-bold text-[#1167c9] hover:underline"
                      >
                        <Eye size={14} />
                        {isEn ? "View Document" : "معاينة الوثيقة"}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(lic)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-slate-50 px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <Edit3 size={13} />
                      {isEn ? "Edit" : "تعديل"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setArchivingLicense(lic);
                        setArchiveReason("");
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 font-bold text-rose-700 hover:bg-rose-100"
                    >
                      <Archive size={13} />
                      {isEn ? "Archive" : "أرشفة"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
          <FileCheck2 size={32} className="mx-auto text-[var(--muted)] mb-2" />
          <p className="font-bold text-sm">
            {isEn ? "No driver licenses registered for this rider." : "لا توجد رخص قيادة مسجلة لهذا المندوب."}
          </p>
          <p className="text-xs text-[var(--muted)] mt-1">
            {isEn ? "Click 'Add License' to register a driver license record." : "انقر على 'إضافة رخصة قيادة' لتسجيل رخصة جديدة."}
          </p>
        </div>
      )}

      {/* Add / Edit License Modal */}
      {isModalOpen && renderModalForm()}

      {/* Archive Confirmation Modal */}
      {archivingLicense && renderArchiveModalForm()}
    </div>
  );
}
