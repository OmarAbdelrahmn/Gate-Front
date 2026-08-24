"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, MapPin, User, FileText } from "lucide-react";
import { createSponsor } from "../../../../../lib/workforce/api";
import { Button } from "../../../../../components/ui/Button";
import { Input } from "../../../../../components/ui/Input";
import { Card } from "../../../../../components/ui/Card";
import { useAuth } from "../../../../../lib/auth/AuthProvider";
import { SearchableSelect } from "../../../../../components/ui/SearchableSelect";

export default function NewSponsorPage() {
  const router = useRouter();
  const { locale } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const BackIcon = locale === "en" ? ArrowLeft : ArrowRight;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const f = new FormData(e.currentTarget);

    const buildingNumber = String(f.get("buildingNumber") || "").trim();
    const street = String(f.get("street") || "").trim();
    const district = String(f.get("district") || "").trim();
    const city = String(f.get("city") || "").trim();
    const postalCode = String(f.get("postalCode") || "").trim();
    const additionalNumber = String(f.get("additionalNumber") || "").trim();

    const addressPayload =
      buildingNumber || street || district || city || postalCode || additionalNumber
        ? {
            buildingNumber: buildingNumber || null,
            street: street || null,
            district: district || null,
            city: city || null,
            postalCode: postalCode || null,
            additionalNumber: additionalNumber || null,
          }
        : null;

    const payload = {
      employerIdentityNumber: String(f.get("employerIdentityNumber") || "").trim(),
      registryNameAr: String(f.get("registryNameAr") || "").trim(),
      registryNameEn: String(f.get("registryNameEn") || "").trim() || null,
      commercialRegistrationNumber: String(f.get("commercialRegistrationNumber") || "").trim() || null,
      unifiedNationalNumber: String(f.get("unifiedNationalNumber") || "").trim() || null,
      sponsorType: String(f.get("sponsorType") || "Establishment"),
      status: String(f.get("status") || "Active"),
      activeFrom: String(f.get("activeFrom") || "") || null,
      activeTo: String(f.get("activeTo") || "") || null,
      contactName: String(f.get("contactName") || "").trim() || null,
      contactPhone: String(f.get("contactPhone") || "").trim() || null,
      contactEmail: String(f.get("contactEmail") || "").trim() || null,
      address: addressPayload,
      notes: String(f.get("notes") || "").trim() || null,
      rowVersion: null,
    };

    try {
      await createSponsor(payload);
      router.replace("/dashboard/employees/sponsors");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : locale === "en"
            ? "Failed to create sponsor."
            : "تعذر إنشاء الكفيل.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-2 inline-flex items-center gap-2 text-sm font-bold text-[#1167c9]"
          >
            <BackIcon size={16} />
            {locale === "en" ? "Back to Sponsors" : "العودة إلى الكفلاء"}
          </button>
          <h1 className="text-3xl font-black">
            {locale === "en" ? "Add New Sponsor" : "إضافة كفيل جديد"}
          </h1>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={submit}>
        <Card className="space-y-6 p-6">
          {/* Main Info */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-black text-[#1167c9]">
              <Building2 size={16} />
              {locale === "en" ? "Basic Information" : "البيانات الأساسية"}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                name="employerIdentityNumber"
                label={locale === "en" ? "Employer Identity Number (700)" : "رقم هوية المنشأة (700)"}
                required
                dir="ltr"
                placeholder="7001234567"
              />
              <label className="grid gap-2 text-sm font-bold">
                <span className="flex justify-between">
                  <span>{locale === "en" ? "Sponsor Type" : "نوع الكفيل"}</span>
                  <span className="field-required">{locale === "en" ? "Required" : "مطلوب"}</span>
                </span>
                <select
                  name="sponsorType"
                  required
                  defaultValue="Establishment"
                  className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal focus:border-[#1167c9] focus:outline-none"
                >
                  <option value="Establishment">{locale === "en" ? "Establishment" : "مؤسسة"}</option>
                  <option value="Company">{locale === "en" ? "Company" : "شركة"}</option>
                  <option value="Individual">{locale === "en" ? "Individual" : "فرد"}</option>
                  <option value="Government">{locale === "en" ? "Government" : "جهة حكومية"}</option>
                </select>
              </label>

              <Input
                name="registryNameAr"
                label={locale === "en" ? "Arabic Registry Name" : "اسم السجل بالعربية"}
                required
                placeholder="شركة البوابة"
              />
              <Input
                name="registryNameEn"
                label={locale === "en" ? "English Registry Name" : "الاسم بالإنجليزية"}
                dir="ltr"
                placeholder="Al Bawaba Company"
              />

              <Input
                name="commercialRegistrationNumber"
                label={locale === "en" ? "Commercial Registration (CR) No." : "رقم السجل التجاري"}
                dir="ltr"
                placeholder="1010123456"
              />
              <Input
                name="unifiedNationalNumber"
                label={locale === "en" ? "Unified National Number" : "الرقم الوطني الموحد"}
                dir="ltr"
                placeholder="700123456700003"
              />

              <label className="grid gap-2 text-sm font-bold">
                <span className="flex justify-between">
                  <span>{locale === "en" ? "Status" : "الحالة"}</span>
                  <span className="field-required">{locale === "en" ? "Required" : "مطلوب"}</span>
                </span>
                <select
                  name="status"
                  required
                  defaultValue="Active"
                  className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal focus:border-[#1167c9] focus:outline-none"
                >
                  <option value="Active">{locale === "en" ? "Active" : "نشط"}</option>
                  <option value="Inactive">{locale === "en" ? "Inactive" : "غير نشط"}</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  name="activeFrom"
                  label={locale === "en" ? "Active From" : "تاريخ البداية"}
                />
                <Input
                  type="date"
                  name="activeTo"
                  label={locale === "en" ? "Active To" : "تاريخ النهاية"}
                />
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-4 border-t border-[var(--border)] pt-4">
            <h3 className="flex items-center gap-2 text-sm font-black text-[#1167c9]">
              <User size={16} />
              {locale === "en" ? "Contact Information" : "معلومات التواصل"}
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                name="contactName"
                label={locale === "en" ? "Contact Person Name" : "اسم المسؤول"}
                placeholder="أحمد علي"
              />
              <Input
                name="contactPhone"
                label={locale === "en" ? "Contact Phone" : "رقم التواصل"}
                dir="ltr"
                placeholder="0500000000"
              />
              <Input
                type="email"
                name="contactEmail"
                label={locale === "en" ? "Contact Email" : "البريد الإلكتروني"}
                dir="ltr"
                placeholder="admin@example.com"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4 border-t border-[var(--border)] pt-4">
            <h3 className="flex items-center gap-2 text-sm font-black text-[#1167c9]">
              <MapPin size={16} />
              {locale === "en" ? "National Address" : "العنوان الوطني"}
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                name="city"
                label={locale === "en" ? "City" : "المدينة"}
                placeholder="الرياض"
              />
              <Input
                name="district"
                label={locale === "en" ? "District" : "الحي"}
                placeholder="العليا"
              />
              <Input
                name="street"
                label={locale === "en" ? "Street" : "الشارع"}
                placeholder="طريق الملك فهد"
              />
              <Input
                name="buildingNumber"
                label={locale === "en" ? "Building No." : "رقم المبنى"}
                dir="ltr"
                placeholder="1234"
              />
              <Input
                name="postalCode"
                label={locale === "en" ? "Postal Code" : "الرمز البريدي"}
                dir="ltr"
                placeholder="12345"
              />
              <Input
                name="additionalNumber"
                label={locale === "en" ? "Additional No." : "الرقم الإضافي"}
                dir="ltr"
                placeholder="5678"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2 border-t border-[var(--border)] pt-4">
            <h3 className="flex items-center gap-2 text-sm font-black text-[#1167c9]">
              <FileText size={16} />
              {locale === "en" ? "Notes" : "ملاحظات"}
            </h3>
            <textarea
              name="notes"
              rows={3}
              placeholder={locale === "en" ? "Additional details..." : "ملاحظات إضافية..."}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm outline-none focus:border-[#1167c9]"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={loading}
            >
              {locale === "en" ? "Cancel" : "إلغاء"}
            </Button>
            <Button type="submit" loading={loading}>
              {locale === "en" ? "Save Sponsor" : "حفظ الكفيل"}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
