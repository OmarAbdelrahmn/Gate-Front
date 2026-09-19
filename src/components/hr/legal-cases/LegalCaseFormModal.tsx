"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DualCalendarDateInput } from "@/components/ui/DualCalendarDateInput";
import { SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import type {
  CaseStatus,
  CreateLegalCaseRequest,
  LegalCaseDetail,
  LegalCaseSummary,
  PersonType,
  SponsorPartyRole,
  UpdateLegalCaseRequest,
} from "@/lib/hr/legal-cases-api";
import { createLegalCase, updateLegalCase } from "@/lib/hr/legal-cases-api";
import { listSponsors, listEmployees, listRiders } from "@/lib/workforce/api";
import { listUsers } from "@/lib/users/api";
import {
  Scale,
  Shield,
  User,
  Bike,
  Globe,
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  FileText,
  UserCheck,
} from "lucide-react";

interface LegalCaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedCase: LegalCaseDetail | LegalCaseSummary) => void;
  caseToEdit?: LegalCaseDetail | LegalCaseSummary | null;
}

export function LegalCaseFormModal({
  isOpen,
  onClose,
  onSuccess,
  caseToEdit,
}: LegalCaseFormModalProps) {
  const isEdit = !!caseToEdit;

  // Form states
  const [caseNumber, setCaseNumber] = useState("");
  const [sponsorId, setSponsorId] = useState("");
  const [sponsorPartyRole, setSponsorPartyRole] = useState<SponsorPartyRole>("Claimant");
  const [personType, setPersonType] = useState<PersonType>("Employee");
  const [personName, setPersonName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [riderProfileId, setRiderProfileId] = useState("");
  const [caseDate, setCaseDate] = useState("");
  const [caseTime, setCaseTime] = useState("09:00:00");
  const [status, setStatus] = useState<CaseStatus>("Open");
  const [responsibleUserId, setResponsibleUserId] = useState("");
  const [details, setDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [changeReason, setChangeReason] = useState("");

  // Options catalogs
  const [sponsors, setSponsors] = useState<SelectOption[]>([]);
  const [employees, setEmployees] = useState<SelectOption[]>([]);
  const [riders, setRiders] = useState<SelectOption[]>([]);
  const [users, setUsers] = useState<SelectOption[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate catalogs on mount or open
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoadingCatalogs(true);

    Promise.all([
      listSponsors().catch(() => []),
      listEmployees().catch(() => []),
      listRiders().catch(() => []),
      listUsers().catch(() => []),
    ]).then(([sponsorsRes, employeesRes, ridersRes, usersRes]) => {
      if (!mounted) return;

      setSponsors(
        sponsorsRes.map((s) => ({
          value: s.id,
          label: s.registryNameAr || s.registryNameEn || s.id,
          sublabel: s.commercialRegistrationNumber || s.unifiedNationalNumber || undefined,
        }))
      );

      setEmployees(
        employeesRes.map((e) => ({
          value: e.id,
          label: e.fullNameAr || e.fullNameEn || e.id,
          sublabel: e.iqamaNo ? `هوية/إقامة: ${e.iqamaNo}` : undefined,
          keywords: `${e.fullNameEn || ""} ${e.iqamaNo || ""}`,
        }))
      );

      setRiders(
        ridersRes.map((r) => ({
          value: r.id, // riderProfileId
          label: r.fullNameAr || r.fullNameEn || r.id,
          sublabel: r.iqamaNo ? `هوية/إقامة: ${r.iqamaNo}` : undefined,
          keywords: `${r.fullNameEn || ""} ${r.iqamaNo || ""}`,
        }))
      );

      setUsers(
        usersRes.map((u) => ({
          value: u.id,
          label: u.displayNameAr || u.displayNameEn || u.userName,
          sublabel: u.email || u.userName,
          keywords: `${u.userName} ${u.displayNameEn || ""}`,
        }))
      );

      setLoadingCatalogs(false);
    });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Populate form fields on open/edit
  useEffect(() => {
    if (!isOpen) return;

    if (caseToEdit) {
      setCaseNumber(caseToEdit.caseNumber || "");
      setSponsorId(caseToEdit.sponsorId || "");
      setSponsorPartyRole(caseToEdit.sponsorPartyRole || "Claimant");
      setPersonType(caseToEdit.personType || "Employee");
      setPersonName(caseToEdit.personName || "");
      setEmployeeId(caseToEdit.employeeId || "");
      setRiderProfileId(caseToEdit.riderProfileId || "");
      setCaseDate(caseToEdit.caseDate || "");
      // Format time to HH:mm:ss if shorter
      const rawTime = caseToEdit.caseTime || "09:00:00";
      setCaseTime(rawTime.length === 5 ? `${rawTime}:00` : rawTime);
      setStatus(caseToEdit.status || "Open");
      setResponsibleUserId(caseToEdit.responsibleUserId || "");
      setDetails(caseToEdit.details || "");
      setNotes(caseToEdit.notes || "");
      setChangeReason("");
    } else {
      // Default initial state
      setCaseNumber("");
      setSponsorId("");
      setSponsorPartyRole("Claimant");
      setPersonType("Employee");
      setPersonName("");
      setEmployeeId("");
      setRiderProfileId("");
      // Default to today in Riyadh local time
      const todayStr = new Date().toLocaleDateString("en-CA");
      setCaseDate(todayStr);
      setCaseTime("09:00:00");
      setStatus("Open");
      setResponsibleUserId("");
      setDetails("");
      setNotes("");
      setChangeReason("");
    }
    setErrors({});
  }, [isOpen, caseToEdit]);

  // Calculate resolved claimant and defendant descriptions for preview
  const partyRolePreview = useMemo(() => {
    const selectedSponsor = sponsors.find((s) => s.value === sponsorId)?.label || "الكفيل المحدد";
    let personLabel = "الطرف الآخر";
    if (personType === "Employee") {
      personLabel = employees.find((e) => e.value === employeeId)?.label || "الموظف المحدد";
    } else if (personType === "Rider") {
      personLabel = riders.find((r) => r.value === riderProfileId)?.label || "السائق المحدد";
    } else if (personType === "External") {
      personLabel = personName.trim() || "الطرف الخارجي";
    }

    if (sponsorPartyRole === "Claimant") {
      return {
        claimant: { role: "المدعي", entity: selectedSponsor, type: "الكفيل" },
        defendant: { role: "المدعى عليه", entity: personLabel, type: personType === "Employee" ? "موظف" : personType === "Rider" ? "سائق" : "خارجي" },
      };
    }
    return {
      claimant: { role: "المدعي", entity: personLabel, type: personType === "Employee" ? "موظف" : personType === "Rider" ? "سائق" : "خارجي" },
      defendant: { role: "المدعى عليه", entity: selectedSponsor, type: "الكفيل" },
    };
  }, [sponsorPartyRole, sponsorId, personType, employeeId, riderProfileId, personName, sponsors, employees, riders]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!caseNumber.trim()) newErrors.caseNumber = "رقم القضية مطلوب";
    if (!sponsorId) newErrors.sponsorId = "يرجى اختيار الكفيل";
    if (!responsibleUserId) newErrors.responsibleUserId = "يرجى تحديد المستخدم المسؤول";
    if (!caseDate) newErrors.caseDate = "تاريخ القضية مطلوب";
    if (!caseTime) newErrors.caseTime = "وقت القضية مطلوب";
    if (!details.trim()) newErrors.details = "تفاصيل القضية مطلوبة";

    if (personType === "Employee" && !employeeId) {
      newErrors.employeeId = "يرجى اختيار الموظف";
    } else if (personType === "Rider" && !riderProfileId) {
      newErrors.riderProfileId = "يرجى اختيار السائق / المندوب";
    } else if (personType === "External" && !personName.trim()) {
      newErrors.personName = "يرجى إدخال اسم الطرف الخارجي";
    }

    if (isEdit && !changeReason.trim()) {
      newErrors.changeReason = "سبب التعديل مطلوب";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Ensure time format HH:mm:ss
      let formattedTime = caseTime.trim();
      if (formattedTime.length === 5) formattedTime = `${formattedTime}:00`;

      if (isEdit && caseToEdit) {
        const updatePayload: UpdateLegalCaseRequest = {
          caseNumber: caseNumber.trim(),
          personType,
          personName: personType === "External" ? personName.trim() : null,
          employeeId: personType === "Employee" ? employeeId : null,
          riderProfileId: personType === "Rider" ? riderProfileId : null,
          sponsorId,
          sponsorPartyRole,
          caseDate,
          caseTime: formattedTime,
          status,
          details: details.trim(),
          notes: notes.trim() || null,
          responsibleUserId,
          rowVersion: caseToEdit.rowVersion,
          changeReason: changeReason.trim(),
        };

        const res = await updateLegalCase(caseToEdit.id, updatePayload);
        onSuccess(res);
        onClose();
      } else {
        const createPayload: CreateLegalCaseRequest = {
          caseNumber: caseNumber.trim(),
          personType,
          personName: personType === "External" ? personName.trim() : null,
          employeeId: personType === "Employee" ? employeeId : null,
          riderProfileId: personType === "Rider" ? riderProfileId : null,
          sponsorId,
          sponsorPartyRole,
          caseDate,
          caseTime: formattedTime,
          status,
          details: details.trim(),
          notes: notes.trim() || null,
          responsibleUserId,
          rowVersion: null,
          changeReason: null,
        };

        const res = await createLegalCase(createPayload);
        onSuccess(res);
        onClose();
      }
    } catch (err: any) {
      console.error("Failed to save legal case:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `تعديل القضية: ${caseToEdit?.caseNumber}` : "إنشاء قضية قانونية جديدة"}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Identifiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              رقم القضية <span className="text-rose-500">*</span>
            </label>
            <Input
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="مثال: CASE-2026-001"
              disabled={submitting}
            />
            {errors.caseNumber && (
              <p className="mt-1 text-xs text-rose-500">{errors.caseNumber}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              حالة القضية <span className="text-rose-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CaseStatus)}
              disabled={submitting}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--foreground)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Open">مفتوحة (Open)</option>
              <option value="InProgress">قيد النظر (InProgress)</option>
              <option value="Suspended">معلقة (Suspended)</option>
              <option value="Closed">مغلقة (Closed)</option>
            </select>
          </div>
        </div>

        {/* Section 2: Sponsor & Party Role Selection */}
        <div className="rounded-2xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
            <Building2 className="size-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              بيانات الكفيل وصفة الخصومة
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                الكفيل <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                value={sponsorId}
                onChange={setSponsorId}
                options={sponsors}
                placeholder={loadingCatalogs ? "جاري التحميل..." : "اختر الكفيل..."}
                searchPlaceholder="بحث عن كفيل..."
                disabled={submitting || loadingCatalogs}
              />
              {errors.sponsorId && (
                <p className="mt-1 text-xs text-rose-500">{errors.sponsorId}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                صفة الكفيل في القضية <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSponsorPartyRole("Claimant")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                    sponsorPartyRole === "Claimant"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-500 shadow-sm"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Scale className="size-3.5" />
                  الكفيل هو المدعي
                </button>
                <button
                  type="button"
                  onClick={() => setSponsorPartyRole("Defendant")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                    sponsorPartyRole === "Defendant"
                      ? "border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-500 shadow-sm"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Shield className="size-3.5" />
                  الكفيل هو المدعى عليه
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Banner Clarifying Roles */}
          <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/70 dark:bg-indigo-950/30 dark:border-indigo-900/50 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-indigo-800 dark:text-indigo-300">
                المدعي:
              </span>
              <span className="text-slate-800 dark:text-slate-200 font-medium">
                {partyRolePreview.claimant.entity} ({partyRolePreview.claimant.type})
              </span>
            </div>
            <div className="text-slate-400 dark:text-slate-600">ضد</div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-purple-800 dark:text-purple-300">
                المدعى عليه:
              </span>
              <span className="text-slate-800 dark:text-slate-200 font-medium">
                {partyRolePreview.defendant.entity} ({partyRolePreview.defendant.type})
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Person Selection */}
        <div className="rounded-2xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <div className="flex items-center gap-2">
              <User className="size-4 text-teal-600 dark:text-teal-400" />
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                الطرف الآخر (الشخص)
              </h3>
            </div>
            {/* Person Type Selector */}
            <div className="flex items-center gap-1 bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)]">
              <button
                type="button"
                onClick={() => {
                  setPersonType("Employee");
                  setRiderProfileId("");
                  setPersonName("");
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  personType === "Employee"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <User className="size-3" />
                موظف
              </button>
              <button
                type="button"
                onClick={() => {
                  setPersonType("Rider");
                  setEmployeeId("");
                  setPersonName("");
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  personType === "Rider"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Bike className="size-3" />
                سائق / رايدر
              </button>
              <button
                type="button"
                onClick={() => {
                  setPersonType("External");
                  setEmployeeId("");
                  setRiderProfileId("");
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  personType === "External"
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Globe className="size-3" />
                طرف خارجي
              </button>
            </div>
          </div>

          <div>
            {personType === "Employee" && (
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  اختر الموظف <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={employeeId}
                  onChange={setEmployeeId}
                  options={employees}
                  placeholder={loadingCatalogs ? "جاري التحميل..." : "ابحث واختر موظفاً..."}
                  searchPlaceholder="بحث بالاسم أو رقم الإقامة..."
                  disabled={submitting || loadingCatalogs}
                />
                {errors.employeeId && (
                  <p className="mt-1 text-xs text-rose-500">{errors.employeeId}</p>
                )}
                <p className="mt-1 text-xs text-[var(--muted)]">
                  يتم التقاط اسم الموظف تلقائياً من سجله الداخلي.
                </p>
              </div>
            )}

            {personType === "Rider" && (
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  اختر السائق / الرايدر <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  value={riderProfileId}
                  onChange={setRiderProfileId}
                  options={riders}
                  placeholder={loadingCatalogs ? "جاري التحميل..." : "ابحث واختر سائقاً..."}
                  searchPlaceholder="بحث بالاسم أو رقم الإقامة..."
                  disabled={submitting || loadingCatalogs}
                />
                {errors.riderProfileId && (
                  <p className="mt-1 text-xs text-rose-500">{errors.riderProfileId}</p>
                )}
                <p className="mt-1 text-xs text-[var(--muted)]">
                  يتم التقاط اسم السائق تلقائياً من سجل ملف المندوب.
                </p>
              </div>
            )}

            {personType === "External" && (
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  اسم الشخص / الطرف الخارجي <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="أدخل الاسم الثلاثي أو الرباعي للطرف الخارجي..."
                  disabled={submitting}
                />
                {errors.personName && (
                  <p className="mt-1 text-xs text-rose-500">{errors.personName}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Date, Time & Responsible User */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              تاريخ القضية <span className="text-rose-500">*</span>
            </label>
            <DualCalendarDateInput
              name="caseDate"
              value={caseDate}
              onChange={setCaseDate}
              required
              disabled={submitting}
            />
            {errors.caseDate && (
              <p className="mt-1 text-xs text-rose-500">{errors.caseDate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              وقت القضية (بتوقيت الرياض) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted)] pointer-events-none" />
              <input
                type="time"
                step="1"
                value={caseTime}
                onChange={(e) => setCaseTime(e.target.value)}
                disabled={submitting}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pr-9 pl-3 py-2.5 text-sm text-[var(--foreground)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            {errors.caseTime && (
              <p className="mt-1 text-xs text-rose-500">{errors.caseTime}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              المستخدم المسؤول <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              value={responsibleUserId}
              onChange={setResponsibleUserId}
              options={users}
              placeholder={loadingCatalogs ? "جاري التحميل..." : "اختر المستخدم..."}
              searchPlaceholder="بحث باسم المستخدم..."
              disabled={submitting || loadingCatalogs}
            />
            {errors.responsibleUserId && (
              <p className="mt-1 text-xs text-rose-500">{errors.responsibleUserId}</p>
            )}
          </div>
        </div>

        {/* Section 5: Details & Notes */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              تفاصيل وموضوع القضية <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="اكتب وصفاً مفصلاً للقضية وموضوع النزاع..."
              disabled={submitting}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.details && (
              <p className="mt-1 text-xs text-rose-500">{errors.details}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              ملاحظات إضافية (اختياري)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات أو توجيهات أخرى..."
              disabled={submitting}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Section 6: Change Reason (Required on Edit) */}
        {isEdit && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/30 dark:border-amber-900/50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
              <label className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                سبب التعديل <span className="text-rose-500">*</span>
              </label>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              تسجل جميع التعديلات في سجل تاريخي غير قابل للتعديل يتضمن سبب التغيير.
            </p>
            <Input
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="مثال: تحديث الطرف المدعي، أو تعديل تاريخ القضية..."
              disabled={submitting}
            />
            {errors.changeReason && (
              <p className="mt-1 text-xs text-rose-500">{errors.changeReason}</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
          >
            {isEdit ? "حفظ التعديلات" : "إنشاء القضية"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
