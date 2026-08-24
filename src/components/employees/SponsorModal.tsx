"use client";

import { useState, useEffect, type FormEvent } from "react";
import { X, Building2, MapPin, User, FileText } from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { createSponsor, updateSponsor, type Sponsor } from "../../lib/workforce/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { toast } from "../ui/Toast";
import { SearchableSelect } from "../ui/SearchableSelect";

type SponsorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sponsor?: Sponsor | null;
};

export function SponsorModal({
  isOpen,
  onClose,
  onSuccess,
  sponsor,
}: SponsorModalProps) {
  const { locale } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = Boolean(sponsor);

  // Form states
  const [employerIdentityNumber, setEmployerIdentityNumber] = useState("");
  const [registryNameAr, setRegistryNameAr] = useState("");
  const [registryNameEn, setRegistryNameEn] = useState("");
  const [commercialRegistrationNumber, setCommercialRegistrationNumber] = useState("");
  const [unifiedNationalNumber, setUnifiedNationalNumber] = useState("");
  const [sponsorType, setSponsorType] = useState("Establishment");
  const [status, setStatus] = useState("Active");
  const [activeFrom, setActiveFrom] = useState("");
  const [activeTo, setActiveTo] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  
  // Address states
  const [buildingNumber, setBuildingNumber] = useState("");
  const [street, setStreet] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [additionalNumber, setAdditionalNumber] = useState("");
  
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (sponsor) {
      setEmployerIdentityNumber(sponsor.employerIdentityNumber ?? "");
      setRegistryNameAr(sponsor.registryNameAr ?? "");
      setRegistryNameEn(sponsor.registryNameEn ?? "");
      setCommercialRegistrationNumber(sponsor.commercialRegistrationNumber ?? "");
      setUnifiedNationalNumber(sponsor.unifiedNationalNumber ?? "");
      setSponsorType(sponsor.sponsorType ?? "Establishment");
      setStatus(sponsor.status ?? "Active");
      setActiveFrom(sponsor.activeFrom ?? "");
      setActiveTo(sponsor.activeTo ?? "");
      setContactName(sponsor.contactName ?? "");
      setContactPhone(sponsor.contactPhone ?? "");
      setContactEmail(sponsor.contactEmail ?? "");
      setNotes(sponsor.notes ?? "");

      const addr = sponsor.address;
      setBuildingNumber(addr?.buildingNumber ?? "");
      setStreet(addr?.street ?? "");
      setDistrict(addr?.district ?? "");
      setCity(addr?.city ?? "");
      setPostalCode(addr?.postalCode ?? "");
      setAdditionalNumber(addr?.additionalNumber ?? "");
    } else {
      setEmployerIdentityNumber("");
      setRegistryNameAr("");
      setRegistryNameEn("");
      setCommercialRegistrationNumber("");
      setUnifiedNationalNumber("");
      setSponsorType("Establishment");
      setStatus("Active");
      setActiveFrom("");
      setActiveTo("");
      setContactName("");
      setContactPhone("");
      setContactEmail("");
      setBuildingNumber("");
      setStreet("");
      setDistrict("");
      setCity("");
      setPostalCode("");
      setAdditionalNumber("");
      setNotes("");
    }
    setError("");
  }, [sponsor, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

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
      employerIdentityNumber: employerIdentityNumber.trim(),
      registryNameAr: registryNameAr.trim(),
      registryNameEn: registryNameEn.trim() || null,
      commercialRegistrationNumber: commercialRegistrationNumber.trim() || null,
      unifiedNationalNumber: unifiedNationalNumber.trim() || null,
      sponsorType,
      status,
      activeFrom: activeFrom || null,
      activeTo: activeTo || null,
      contactName: contactName.trim() || null,
      contactPhone: contactPhone.trim() || null,
      contactEmail: contactEmail.trim() || null,
      address: addressPayload,
      notes: notes.trim() || null,
      rowVersion: isEdit && sponsor ? sponsor.rowVersion : null,
    };

    try {
      if (isEdit && sponsor) {
        await updateSponsor(sponsor.id, payload);
        toast.success(
          locale === "en" ? "Sponsor Updated" : "تم تحديث الكفيل",
          locale === "en" ? "Sponsor details saved successfully." : "تم حفظ بيانات الكفيل بنجاح"
        );
      } else {
        await createSponsor(payload);
        toast.success(
          locale === "en" ? "Sponsor Created" : "تمت إضافة الكفيل",
          locale === "en" ? "New sponsor registered successfully." : "تم تسجيل الكفيل الجديد بنجاح"
        );
      }
      onSuccess();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : locale === "en"
            ? "Failed to save sponsor details."
            : "تعذر حفظ بيانات الكفيل.";
      setError(msg);
      toast.error(
        locale === "en" ? "Save Failed" : "فشل الحفظ",
        msg
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl transition-all my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-[#1167c9]">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black">
                {isEdit
                  ? locale === "en"
                    ? "Edit Sponsor Information"
                    : "تعديل بيانات الكفيل"
                  : locale === "en"
                    ? "Add New Sponsor"
                    : "إضافة كفيل جديد"}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {locale === "en"
                  ? "Enter corporate identity, registration details, and contact info."
                  : "أدخل معلومات الهوية والتعريف بجهة الكفالة ورقم المنشأة والمعلومات المرتبطة بها."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)] hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Main Information Section */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-black text-[#1167c9]">
              <Building2 size={16} />
              {locale === "en" ? "Basic Information" : "البيانات الأساسية"}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={locale === "en" ? "Employer Identity Number (700)" : "رقم هوية المنشأة (700)"}
                value={employerIdentityNumber}
                onChange={(e) => setEmployerIdentityNumber(e.target.value)}
                placeholder="7001234567"
                required
                dir="ltr"
              />
              <label className="grid gap-2 text-sm font-bold">
                <span className="flex justify-between">
                  <span>{locale === "en" ? "Sponsor Type" : "نوع الكفيل"}</span>
                  <span className="field-required">{locale === "en" ? "Required" : "مطلوب"}</span>
                </span>
                <SearchableSelect
                  value={sponsorType}
                  onChange={setSponsorType}
                  required
                  options={[
                    { value: "Establishment", label: locale === "en" ? "Establishment" : "مؤسسة" },
                    { value: "Company", label: locale === "en" ? "Company" : "شركة" },
                    { value: "Individual", label: locale === "en" ? "Individual" : "فرد" },
                    { value: "Government", label: locale === "en" ? "Government" : "جهة حكومية" },
                  ]}
                  placeholder={locale === "en" ? "Select Sponsor Type" : "اختر نوع الكفيل"}
                />
              </label>

              <Input
                label={locale === "en" ? "Arabic Registry Name" : "اسم السجل بالعربية"}
                value={registryNameAr}
                onChange={(e) => setRegistryNameAr(e.target.value)}
                placeholder="شركة البوابة"
                required
              />
              <Input
                label={locale === "en" ? "English Registry Name" : "الاسم بالإنجليزية"}
                value={registryNameEn}
                onChange={(e) => setRegistryNameEn(e.target.value)}
                placeholder="Al Bawaba Company"
                dir="ltr"
              />

              <Input
                label={locale === "en" ? "Commercial Registration (CR) No." : "رقم السجل التجاري"}
                value={commercialRegistrationNumber}
                onChange={(e) => setCommercialRegistrationNumber(e.target.value)}
                placeholder="1010123456"
                dir="ltr"
              />
              <Input
                label={locale === "en" ? "Unified National Number" : "الرقم الوطني الموحد"}
                value={unifiedNationalNumber}
                onChange={(e) => setUnifiedNationalNumber(e.target.value)}
                placeholder="700123456700003"
                dir="ltr"
              />

              <label className="grid gap-2 text-sm font-bold">
                <span className="flex justify-between">
                  <span>{locale === "en" ? "Status" : "الحالة"}</span>
                  <span className="field-required">{locale === "en" ? "Required" : "مطلوب"}</span>
                </span>
                <SearchableSelect
                  value={status}
                  onChange={setStatus}
                  required
                  options={[
                    { value: "Active", label: locale === "en" ? "Active" : "نشط" },
                    { value: "Inactive", label: locale === "en" ? "Inactive" : "غير نشط" },
                  ]}
                  placeholder={locale === "en" ? "Select Status" : "اختر الحالة"}
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  label={locale === "en" ? "Active From" : "تاريخ البداية"}
                  value={activeFrom}
                  onChange={(e) => setActiveFrom(e.target.value)}
                />
                <Input
                  type="date"
                  label={locale === "en" ? "Active To" : "تاريخ النهاية"}
                  value={activeTo}
                  onChange={(e) => setActiveTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Contact Details Section */}
          <div className="space-y-4 border-t border-[var(--border)] pt-4">
            <h3 className="flex items-center gap-2 text-sm font-black text-[#1167c9]">
              <User size={16} />
              {locale === "en" ? "Contact Information" : "معلومات التواصل"}
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label={locale === "en" ? "Contact Person Name" : "اسم المسؤول"}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="أحمد علي"
              />
              <Input
                label={locale === "en" ? "Contact Phone" : "رقم التواصل"}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="0500000000"
                dir="ltr"
              />
              <Input
                type="email"
                label={locale === "en" ? "Contact Email" : "البريد الإلكتروني"}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="admin@example.com"
                dir="ltr"
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-4 border-t border-[var(--border)] pt-4">
            <h3 className="flex items-center gap-2 text-sm font-black text-[#1167c9]">
              <MapPin size={16} />
              {locale === "en" ? "National Address" : "العنوان الوطني"}
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label={locale === "en" ? "City" : "المدينة"}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="الرياض / Riyadh"
              />
              <Input
                label={locale === "en" ? "District" : "الحي"}
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="العليا / Al Olaya"
              />
              <Input
                label={locale === "en" ? "Street" : "الشارع"}
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="طريق الملك فهد"
              />
              <Input
                label={locale === "en" ? "Building No." : "رقم المبنى"}
                value={buildingNumber}
                onChange={(e) => setBuildingNumber(e.target.value)}
                placeholder="1234"
                dir="ltr"
              />
              <Input
                label={locale === "en" ? "Postal Code" : "الرمز البريدي"}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="12345"
                dir="ltr"
              />
              <Input
                label={locale === "en" ? "Additional No." : "الرقم الإضافي"}
                value={additionalNumber}
                onChange={(e) => setAdditionalNumber(e.target.value)}
                placeholder="5678"
                dir="ltr"
              />
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-2 border-t border-[var(--border)] pt-4">
            <h3 className="flex items-center gap-2 text-sm font-black text-[#1167c9]">
              <FileText size={16} />
              {locale === "en" ? "Notes" : "ملاحظات"}
            </h3>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={locale === "en" ? "Additional details..." : "ملاحظات إضافية..."}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm outline-none focus:border-[#1167c9]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              {locale === "en" ? "Cancel" : "إلغاء"}
            </Button>
            <Button type="submit" loading={loading}>
              {isEdit
                ? locale === "en"
                  ? "Save Changes"
                  : "حفظ التعديلات"
                : locale === "en"
                  ? "Create Sponsor"
                  : "إضافة الكفيل"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
