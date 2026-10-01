"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SearchableSelect, SelectOption } from "@/components/ui/SearchableSelect";
import { listEmployees } from "@/lib/workforce/api";
import { createPhoneSim, getPlaces, PhoneSim, Place, KNOWN_CARRIERS } from "@/lib/fleet/phone-sims-api";
import { ManagePlacesModal } from "./ManagePlacesModal";
import { toast } from "@/components/ui/Toast";

interface CreateSimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (sim: PhoneSim) => void;
}

export function CreateSimModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateSimModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [iccid, setIccid] = useState("");
  const [selectedCarrier, setSelectedCarrier] = useState("");
  const [customCarrier, setCustomCarrier] = useState("");
  const [responsibleEmployeeId, setResponsibleEmployeeId] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptFormFile, setReceiptFormFile] = useState<File | null>(null);

  const [employees, setEmployees] = useState<SelectOption[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [isPlacesModalOpen, setIsPlacesModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setPhoneNumber("");
      setIccid("");
      setSelectedCarrier("");
      setCustomCarrier("");
      setResponsibleEmployeeId("");
      setPlaceId("");
      setNotes("");
      setReceiptFormFile(null);
      setErrors({});
      loadEmployees();
      loadPlaces();
    }
  }, [isOpen]);

  async function loadPlaces() {
    setLoadingPlaces(true);
    try {
      const data = await getPlaces();
      setPlaces(data || []);
    } catch (err) {
      console.error("Failed to load places for SIM creation", err);
    } finally {
      setLoadingPlaces(false);
    }
  }

  async function loadEmployees() {
    setLoadingEmployees(true);
    try {
      const data = await listEmployees();
      const allEmps = data || [];
      // Allow records with isEmployee: true and status Active or OnLeave
      const listToMap = allEmps.filter(
        (emp) =>
          emp.isEmployee === true &&
          (emp.status === "Active" || emp.status === "OnLeave" || !emp.status)
      );
      
      const activeEmployees = listToMap.map((emp) => ({
        value: emp.id,
        label: emp.fullNameAr || emp.fullNameEn || "موظف بدون اسم",
        sublabel: `هوية: ${emp.iqamaNo || emp.employeeNumber || "غير محدد"}${
          emp.jobTitleAr ? ` - ${emp.jobTitleAr}` : ""
        }`,
      }));
      setEmployees(activeEmployees);
    } catch (err) {
      console.error("Failed to load employees for SIM responsibility selector", err);
    } finally {
      setLoadingEmployees(false);
    }
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!phoneNumber.trim()) {
      errs.phoneNumber = "رقم الهاتف مطلوب";
    }
    if (iccid.trim()) {
      const cleanIccid = iccid.trim();
      if (!/^\d{18,22}$/.test(cleanIccid) || !cleanIccid.startsWith("89")) {
        errs.iccid = "رمز ICCID يجب أن يتكون من 18 إلى 22 رقماً ويبدأ بـ 89";
      }
    }
    if (!responsibleEmployeeId) {
      errs.responsibleEmployeeId = "الموظف المسؤول عن العهدة مطلوب";
    }
    if (!placeId) {
      errs.placeId = "يرجى تحديد موقع/مقر الشريحة";
    }
    if (!receiptFormFile) {
      errs.receiptForm = "نموذج استلام الشريحة مطلوب";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const carrierValue = selectedCarrier === "Other" ? customCarrier.trim() : selectedCarrier.trim();
      const newSim = await createPhoneSim({
        phoneNumber: phoneNumber.trim(),
        iccid: iccid.trim() || null,
        carrierName: carrierValue || null,
        responsibleEmployeeId,
        placeId,
        notes: notes.trim() || null,
        receiptForm: receiptFormFile!,
      });
      onSuccess(newSim);
      onClose();
    } catch (err: any) {
      console.error("Error creating SIM:", err);
      const code = err?.details?.errorCode;
      if (code === "phone_sim.duplicate_phone_number") {
        setErrors((prev) => ({ ...prev, phoneNumber: "رقم الهاتف مسجل بالفعل" }));
      } else if (code === "phone_sim.duplicate_iccid") {
        setErrors((prev) => ({ ...prev, iccid: "رمز ICCID مسجل بالفعل" }));
      } else if (code === "phone_sim.invalid_iccid") {
        setErrors((prev) => ({ ...prev, iccid: "رمز ICCID غير صالح" }));
      } else if (code === "phone_sim.invalid_phone_number") {
        setErrors((prev) => ({ ...prev, phoneNumber: "رقم الهاتف غير صالح" }));
      } else if (code === "phone_sim.place_not_found") {
        setErrors((prev) => ({ ...prev, placeId: "الموقع المحدد غير موجود. يرجى اختيار موقع صالح." }));
        loadPlaces();
      } else if (code === "phone_sim.responsible_employee_unavailable") {
        setErrors((prev) => ({
          ...prev,
          responsibleEmployeeId: "الموظف المختار غير متاح كمسؤول عهدة. اختر موظفاً نشطاً.",
        }));
      } else if (code === "phone_sim.responsible_employee_not_found") {
        setErrors((prev) => ({
          ...prev,
          responsibleEmployeeId: "الموظف المحدد غير موجود في سجلات الموظفين.",
        }));
        loadEmployees();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة شريحة اتصال جديدة">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
            رقم الهاتف <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="مثال: +966555123456 أو 0555123456"
            className="w-full h-10 px-3 text-sm font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
            dir="ltr"
          />
          {errors.phoneNumber && (
            <p className="text-xs text-red-500 font-semibold mt-1">{errors.phoneNumber}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              شركة الاتصالات / المشغل
            </label>
            <select
              value={selectedCarrier}
              onChange={(e) => setSelectedCarrier(e.target.value)}
              className="w-full h-10 px-3 text-sm font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none cursor-pointer"
            >
              <option value="">-- اختر شركة الاتصالات --</option>
              {KNOWN_CARRIERS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
              <option value="Other">أخرى (إدخال مشغل آخر)</option>
            </select>
            {selectedCarrier === "Other" && (
              <input
                type="text"
                value={customCarrier}
                onChange={(e) => setCustomCarrier(e.target.value)}
                placeholder="أدخل اسم شركة الاتصالات..."
                className="w-full h-10 px-3 mt-2 text-sm font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              رمز ICCID (اختياري)
            </label>
            <input
              type="text"
              value={iccid}
              onChange={(e) => setIccid(e.target.value)}
              placeholder="يبدأ بـ 89 ويتكون من 18-22 رقماً"
              className="w-full h-10 px-3 text-sm font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
              dir="ltr"
            />
            {errors.iccid && (
              <p className="text-xs text-red-500 font-semibold mt-1">{errors.iccid}</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-[var(--foreground)]">
              الموظف المسؤول عن العهدة <span className="text-red-500">*</span>
            </label>
            <a
              href="/admin/employees/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-[#1167c9] dark:text-blue-400 hover:underline"
            >
              + إضافة موظف جديد
            </a>
          </div>
          <SearchableSelect
            value={responsibleEmployeeId}
            onChange={(val) => setResponsibleEmployeeId(val)}
            options={employees}
            placeholder={loadingEmployees ? "جاري تحميل الموظفين..." : "اختر الموظف المسؤول..."}
            disabled={loadingEmployees}
          />
          {errors.responsibleEmployeeId && (
            <p className="text-xs text-red-500 font-semibold mt-1">
              {errors.responsibleEmployeeId}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
            نموذج استلام الشريحة <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,image/*,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (file) {
                const allowedExtensions = ["pdf", "jpg", "jpeg", "png", "webp", "gif", "bmp"];
                const ext = file.name.split(".").pop()?.toLowerCase() || "";
                if (!allowedExtensions.includes(ext)) {
                  setErrors((prev) => ({
                    ...prev,
                    receiptForm: "نوع الملف غير مدعوم. المسموح: PDF, JPG, PNG, WebP, GIF, BMP",
                  }));
                  setReceiptFormFile(null);
                  return;
                }
                if (file.size > 10 * 1024 * 1024) {
                  setErrors((prev) => ({
                    ...prev,
                    receiptForm: "حجم الملف تجاوز 10 ميجابايت",
                  }));
                  setReceiptFormFile(null);
                  return;
                }
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.receiptForm;
                  return next;
                });
                setReceiptFormFile(file);
              } else {
                setReceiptFormFile(null);
              }
            }}
            className="w-full text-xs font-semibold file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#1167c9] hover:file:bg-blue-100 border border-[var(--border)] rounded-xl p-1 bg-[var(--surface)] cursor-pointer"
          />
          <p className="text-[11px] text-[var(--muted)] mt-1">
            الملفات المسموحة: PDF, JPG/JPEG, PNG, WebP, GIF, BMP (الحد الأقصى: 10 ميجابايت)
          </p>
          {errors.receiptForm && (
            <p className="text-xs text-red-500 font-semibold mt-1">{errors.receiptForm}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-[var(--foreground)]">
              الموقع / المقر (Place) <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setIsPlacesModalOpen(true)}
              className="text-[11px] font-bold text-[#1167c9] dark:text-blue-400 hover:underline"
            >
              + إضافة موقع جديد / إدارة المواقع
            </button>
          </div>
          <select
            value={placeId}
            onChange={(e) => {
              setPlaceId(e.target.value);
              setErrors((prev) => {
                const next = { ...prev };
                delete next.placeId;
                return next;
              });
            }}
            disabled={loadingPlaces}
            className="w-full h-10 px-3 text-sm font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none cursor-pointer"
          >
            <option value="">{loadingPlaces ? "-- جاري تحميل المواقع --" : "-- اختر الموقع أو المقر --"}</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.placeId && (
            <p className="text-xs text-red-500 font-semibold mt-1">{errors.placeId}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
            ملاحظات إضافية
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="أدخل أي ملاحظات حول الشريحة أو باقة البيانات..."
            className="w-full p-3 text-sm font-medium rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "جاري الحفظ..." : "حفظ الشريحة"}
          </Button>
        </div>
      </form>

      <ManagePlacesModal
        isOpen={isPlacesModalOpen}
        onClose={() => setIsPlacesModalOpen(false)}
        onPlacesChanged={loadPlaces}
        onSelectPlace={(createdPlace) => {
          loadPlaces();
          setPlaceId(createdPlace.id);
        }}
      />
    </Modal>
  );
}
