"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Printer,
  RotateCcw,
  Search,
  User,
  CheckCircle2,
  Sparkles,
  Layers,
} from "lucide-react";

import { listEmployees } from "@/lib/workforce/api";
import { listExternalRiders } from "@/lib/workforce/external-riders-api";
import { SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";
import { tafreetArabicNumber } from "@/lib/utils/numberToArabicWords";
import {
  FORM_TEMPLATES,
  FORM_CATEGORIES,
  type FormCategory,
} from "@/components/hr/forms/FormTemplateRegistry";
import { CashDisbursementView } from "@/components/hr/forms/CashDisbursementView";
import { PromissoryNoteView } from "@/components/hr/forms/PromissoryNoteView";
import { CashAdvanceView } from "@/components/hr/forms/CashAdvanceView";
import { CashCustodyPromissoryView } from "@/components/hr/forms/CashCustodyPromissoryView";
import { GenericDocumentView } from "@/components/hr/forms/GenericDocumentView";
import { VacationFormView } from "@/components/hr/forms/VacationFormView";
import { SalaryCertificateView } from "@/components/hr/forms/SalaryCertificateView";
import { ClearanceFormView } from "@/components/hr/forms/ClearanceFormView";
import { ResignationFormView } from "@/components/hr/forms/ResignationFormView";
import { FinalSettlementView } from "@/components/hr/forms/FinalSettlementView";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface PersonItem {
  id: string;
  fullNameAr: string;
  iqamaNo: string;
  nationality: string;
  phone?: string;
  source: "employee" | "externalRider";
}

export default function HrFormsPage() {
  // People registry state
  const [people, setPeople] = useState<PersonItem[]>([]);
  const [loadingPeople, setLoadingPeople] = useState<boolean>(true);
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");

  // Template Selection State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("cash_disbursement");
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<FormCategory | "all">("all");

  // Form Fields State
  const [riderName, setRiderName] = useState<string>("");
  const [iqamaNo, setIqamaNo] = useState<string>("");
  const [nationality, setNationality] = useState<string>("");
  const [amount, setAmount] = useState<string>("15000");
  const [amountInWords, setAmountInWords] = useState<string>("");
  const [reason, setReason] = useState<string>("سلفة مالية على الحساب");
  const [date, setDate] = useState<string>("");
  const [issueCity, setIssueCity] = useState<string>("مدينة جده");
  const [paymentCity, setPaymentCity] = useState<string>("مدينة جده");
  const [companyName, setCompanyName] = useState<string>("شركة اكسبرس جابت");
  const [companyCr, setCompanyCr] = useState<string>("4030362130");
  const [dueDate, setDueDate] = useState<string>("عند الطلب");
  const [showDoubleVoucher, setShowDoubleVoucher] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>("");

  // Leave Request & Salary Certificate & Clearance State
  const [jobTitle, setJobTitle] = useState<string>("سائق مندوب توصيل");
  const [department, setDepartment] = useState<string>("إدارة العمليات والتشغيل");
  const [vacationStartDate, setVacationStartDate] = useState<string>("2026/09/01");
  const [vacationEndDate, setVacationEndDate] = useState<string>("2026/09/15");
  const [vacationDays, setVacationDays] = useState<string>("15");
  const [vacationType, setVacationType] = useState<"annual" | "emergency" | "sick" | "unpaid" | "other">("annual");
  const [otherReasonText, setOtherReasonText] = useState<string>("");
  const [telExt, setTelExt] = useState<string>("");
  const [joiningDate, setJoiningDate] = useState<string>("");
  const [allowancesDetail, setAllowancesDetail] = useState<string>("شامل جميع البدلات");
  const [decisionNo, setDecisionNo] = useState<string>("");
  const [decisionDate, setDecisionDate] = useState<string>("");
  const [clearanceReason, setClearanceReason] = useState<"leave" | "transfer" | "resignation" | "death" | "other">("resignation");
  const [mobile, setMobile] = useState<string>("");
  const [effectiveDay, setEffectiveDay] = useState<string>("الأحد");
  const [effectiveDate, setEffectiveDate] = useState<string>("2026/09/01");

  // Cash Custody Promissory State
  const [custodyType, setCustodyType] = useState<string>("عهدة نقدية للأعمال التشغيلية");
  const [promissoryNo, setPromissoryNo] = useState<string>("SN-2026/001");
  const [deliveryMethod, setDeliveryMethod] = useState<"cash" | "bank">("cash");
  const [bankAccountNo, setBankAccountNo] = useState<string>("");

  // Initialize today's date and default Tafreet
  useEffect(() => {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(
      2,
      "0"
    )}/${String(today.getDate()).padStart(2, "0")}`;
    setDate(formattedDate);
    setAmountInWords(tafreetArabicNumber(15000, false));
  }, []);

  // Update amount in words when template changes
  useEffect(() => {
    const num = parseFloat(amount);
    if (!isNaN(num) && num >= 0) {
      setAmountInWords(tafreetArabicNumber(num, selectedTemplateId !== "cash_disbursement"));
    }
  }, [selectedTemplateId, amount]);

  // Fetch employees and external riders
  useEffect(() => {
    let isMounted = true;
    async function loadPeopleData() {
      try {
        setLoadingPeople(true);
        const [employeesRes, externalRidersRes] = await Promise.allSettled([
          listEmployees(),
          listExternalRiders(),
        ]);

        const combined: PersonItem[] = [];
        const seenIqamas = new Set<string>();

        if (employeesRes.status === "fulfilled" && Array.isArray(employeesRes.value)) {
          employeesRes.value.forEach((emp) => {
            if (emp.fullNameAr) {
              const iq = emp.iqamaNo || "";
              if (iq) seenIqamas.add(iq);
              combined.push({
                id: emp.id || `emp-${Math.random()}`,
                fullNameAr: emp.fullNameAr,
                iqamaNo: iq,
                nationality: emp.nationality || "غير محدد",
                phone: emp.primaryPhone || undefined,
                source: "employee",
              });
            }
          });
        }

        if (externalRidersRes.status === "fulfilled" && Array.isArray(externalRidersRes.value)) {
          externalRidersRes.value.forEach((rider) => {
            if (rider.fullNameAr) {
              const iq = rider.iqamaNo || "";
              if (!iq || !seenIqamas.has(iq)) {
                combined.push({
                  id: rider.employeeId || rider.riderProfileId || `rider-${Math.random()}`,
                  fullNameAr: rider.fullNameAr,
                  iqamaNo: iq,
                  nationality: rider.nationality || "غير محدد",
                  phone: rider.primaryPhone || undefined,
                  source: "externalRider",
                });
              }
            }
          });
        }

        if (isMounted) {
          setPeople(combined);
        }
      } catch (err) {
        console.error("Failed to fetch people for HR forms:", err);
      } finally {
        if (isMounted) setLoadingPeople(false);
      }
    }

    loadPeopleData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Format options for SearchableSelect
  const personOptions: SelectOption[] = useMemo(() => {
    return people.map((p) => ({
      value: p.id,
      label: `${p.fullNameAr} - (إقامة: ${p.iqamaNo || "غير مسجلة"}) ${
        p.source === "externalRider" ? "[مندوب خارجي]" : ""
      }`,
    }));
  }, [people]);

  // Handle person selection
  const handleSelectPerson = (id: string) => {
    setSelectedPersonId(id);
    const found = people.find((p) => p.id === id);
    if (found) {
      setRiderName(found.fullNameAr);
      setIqamaNo(found.iqamaNo);
      setNationality(found.nationality);
    }
  };

  // Handle amount change & auto Tafreet
  const handleAmountChange = (val: string) => {
    setAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setAmountInWords(tafreetArabicNumber(num, selectedTemplateId !== "cash_disbursement"));
    } else if (val === "") {
      setAmountInWords("");
    }
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return FORM_TEMPLATES.filter((tpl) => {
      const matchesCategory = selectedCategory === "all" || tpl.category === selectedCategory;
      const matchesSearch =
        templateSearchQuery.trim() === "" ||
        tpl.titleAr.includes(templateSearchQuery) ||
        tpl.titleEn.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
        tpl.descriptionAr.includes(templateSearchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, templateSearchQuery]);

  const activeTemplate = useMemo(
    () => FORM_TEMPLATES.find((t) => t.id === selectedTemplateId) || FORM_TEMPLATES[0],
    [selectedTemplateId]
  );

  // Print document
  const handlePrint = () => {
    window.print();
  };

  // Reset form
  const handleReset = () => {
    setSelectedPersonId("");
    setRiderName("");
    setIqamaNo("");
    setNationality("");
    setAmount("15000");
    setAmountInWords(tafreetArabicNumber(15000, selectedTemplateId !== "cash_disbursement"));
    setReason("سلفة مالية على الحساب");
    setNotes("");
  };

  return (
    <div className="space-y-6 dir-rtl text-right min-h-screen pb-16">
      {/* Header Bar */}
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <p className="text-sm font-bold text-[#1167c9]">الموارد البشرية</p>
          <h1 className="mt-1 text-3xl font-black">نماذج الموارد البشرية (HR Forms)</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            اختر النموذج المطلوب، ثم ابحث عن المندوب لتعبئة البيانات وطباعتها فوراً.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleReset}>
            <RotateCcw size={17} />
            إعادة ضبط
          </Button>
          <Button onClick={handlePrint}>
            <Printer size={17} />
            طباعة النموذج (Print / PDF)
          </Button>
        </div>
      </div>

      {/* 1. Template Buttons Selection Grid */}
      <Card className="p-5 space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-[#1167c9]">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="font-black text-lg">اختر النموذج</h2>
              <p className="text-xs text-[var(--muted)]">اضغط على زر النموذج لتحديده وتعبئة بياناته الخاصة</p>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-[var(--muted)] absolute right-3 top-3.5" />
            <input
              type="text"
              value={templateSearchQuery}
              onChange={(e) => setTemplateSearchQuery(e.target.value)}
              placeholder="ابحث باسم النموذج..."
              className="w-full pl-3 pr-9 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none focus:border-[#1167c9]"
            />
          </div>
        </div>

        {/* Category Filter Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedCategory === "all"
                ? "bg-[#1167c9] text-white shadow-xs"
                : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            الكل ({FORM_TEMPLATES.length})
          </button>
          {FORM_CATEGORIES.map((cat) => {
            const count = FORM_TEMPLATES.filter((t) => t.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedCategory === cat.id
                    ? "bg-[#1167c9] text-white shadow-xs"
                    : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {cat.labelAr} ({count})
              </button>
            );
          })}
        </div>

        {/* Template Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1">
          {filteredTemplates.map((tpl) => {
            const IconComponent = tpl.icon;
            const isSelected = selectedTemplateId === tpl.id;
            return (
              <button
                key={tpl.id}
                onClick={() => setSelectedTemplateId(tpl.id)}
                className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all text-xs font-bold gap-2 ${
                  isSelected
                    ? "border-[#1167c9] bg-blue-500/10 text-[#1167c9] shadow-xs ring-2 ring-[#1167c9]/20"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[#1167c9]/50 hover:bg-blue-500/5"
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    isSelected ? "bg-[#1167c9] text-white" : "bg-[var(--background)] text-[var(--muted)]"
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <span className="line-clamp-2 leading-tight">{tpl.titleAr}</span>
                {tpl.badge && (
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                    {tpl.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Active Selected Template Indicator */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 text-[var(--foreground)] print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#1167c9] text-white">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-xs text-[var(--muted)] font-bold block">النموذج المحدد حالياً:</span>
            <h2 className="text-lg font-black">{activeTemplate.titleAr}</h2>
          </div>
        </div>
        <Badge tone="blue">{activeTemplate.categoryNameAr}</Badge>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Necessary Input Fields Column */}
        <div className="lg:col-span-5 space-y-6 print:hidden">
          {/* STEP 1: Search & Person Details */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h2 className="font-black text-base flex items-center gap-2">
                <User size={18} className="text-[#1167c9]" />
                بيانات المندوب / الموظف
              </h2>
              <Badge tone="blue">تعبئة تلقائية</Badge>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                ابحث عن موظف أو مندوب
              </label>
              <SearchableSelect
                options={personOptions}
                value={selectedPersonId}
                onChange={handleSelectPerson}
                placeholder={loadingPeople ? "جارٍ التحميل..." : "ابحث بالاسم أو رقم الإقامة..."}
                disabled={loadingPeople}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Input
                label="الاسم الكامل"
                value={riderName}
                onChange={(e) => setRiderName(e.target.value)}
                placeholder="أدخل الاسم..."
              />
              <Input
                label="رقم الإقامة / الهوية"
                value={iqamaNo}
                onChange={(e) => setIqamaNo(e.target.value)}
                placeholder="أدخل رقم الإقامة..."
              />
            </div>

            <div>
              <Input
                label="الجنسية"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="أدخل الجنسية..."
              />
            </div>
          </Card>

          {/* STEP 2: Template Specific Fields */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
              <Sparkles size={18} className="text-[#1167c9]" />
              <h2 className="font-black text-base">تفاصيل النموذج ({activeTemplate.titleAr})</h2>
            </div>

            <div className="space-y-4 text-sm">
              {/* Universal Company Name Input */}
              <Input
                label="اسم الشركة في الورقة الرسمية"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="شركة اكسبرس جابت"
              />

              {/* Render Date if required */}
              {activeTemplate.requiresDate && (
                <Input
                  label="تاريخ النموذج / التحرير"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="YYYY/MM/DD"
                />
              )}

              {/* Render Amount & Tafreet if required */}
              {activeTemplate.requiresAmount && (
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)] space-y-3">
                  <Input
                    label="قيمة المبلغ (بالأرقام SAR)"
                    type="number"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="أدخل المبلغ الرقمي..."
                  />

                  <Input
                    label="تفقيط المبلغ بالعربية"
                    value={amountInWords}
                    onChange={(e) => setAmountInWords(e.target.value)}
                    placeholder="خمسة عشر ألف ريال لا غير..."
                  />
                </div>
              )}

              {/* Render Reason if required */}
              {activeTemplate.requiresReason && (
                <Input
                  label="وذلك قيمة / السبب والبيان"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="أدخل سبب أو بيان النموذج..."
                />
              )}

              {/* Promissory Note specific fields */}
              {selectedTemplateId === "promissory_note" && (
                <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="مكان التحرير"
                      value={issueCity}
                      onChange={(e) => setIssueCity(e.target.value)}
                    />
                    <Input
                      label="مكان الوفاء"
                      value={paymentCity}
                      onChange={(e) => setPaymentCity(e.target.value)}
                    />
                  </div>
                  <Input
                    label="اسم الدائن / الشركة"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="رقم السجل التجاري"
                      value={companyCr}
                      onChange={(e) => setCompanyCr(e.target.value)}
                    />
                    <Input
                      label="تاريخ الاستحقاق"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* City for templates requiring city (other than promissory note) */}
              {activeTemplate.requiresCity && selectedTemplateId !== "promissory_note" && (
                <Input
                  label="المدينة / الفرع"
                  value={issueCity}
                  onChange={(e) => setIssueCity(e.target.value)}
                />
              )}

              {/* Leave Request specific fields */}
              {selectedTemplateId === "leave_request" && (
                <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="المسمى الوظيفي"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                    <Input
                      label="الإدارة / القسم"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="تاريخ الالتحاق"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      placeholder="YYYY/MM/DD"
                    />
                    <Input
                      label="رقم الهاتف / التحويلة"
                      value={telExt}
                      onChange={(e) => setTelExt(e.target.value)}
                      placeholder="Ext 102 / 05xxxx"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      label="تاريخ بدء الإجازة"
                      value={vacationStartDate}
                      onChange={(e) => setVacationStartDate(e.target.value)}
                    />
                    <Input
                      label="تاريخ انتهاء الإجازة"
                      value={vacationEndDate}
                      onChange={(e) => setVacationEndDate(e.target.value)}
                    />
                    <Input
                      label="عدد أيام الإجازة"
                      type="number"
                      value={vacationDays}
                      onChange={(e) => setVacationDays(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                      نوع الإجازة / Vacation Type
                    </label>
                    <select
                      value={vacationType}
                      onChange={(e) => setVacationType(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-bold text-[var(--foreground)] outline-none focus:border-[#1167c9]"
                    >
                      <option value="annual">سنوية (Annual leave)</option>
                      <option value="emergency">طارئة (Emergency)</option>
                      <option value="sick">مرضية (Sick leave)</option>
                      <option value="unpaid">بدون راتب (Without pay)</option>
                      <option value="other">لأسباب أخرى (Define it)</option>
                    </select>
                  </div>

                  {vacationType === "other" && (
                    <Input
                      label="اذكر الأسباب الأخرى"
                      value={otherReasonText}
                      onChange={(e) => setOtherReasonText(e.target.value)}
                      placeholder="سبب الإجازة التفصيلي..."
                    />
                  )}
                </div>
              )}

              {/* Salary Certificate specific fields */}
              {selectedTemplateId === "salary_certificate" && (
                <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                  <Input
                    label="اسم الشركة"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="شركة اكسبرس جابت"
                  />
                  <Input
                    label="المسمى الوظيفي للموظف"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                  <Input
                    label="تفاصيل البدلات / الإفادة"
                    value={allowancesDetail}
                    onChange={(e) => setAllowancesDetail(e.target.value)}
                    placeholder="مثال: شامل"
                  />
                </div>
              )}

              {/* City for templates requiring city (other than promissory note & leave request) */}
              {activeTemplate.requiresCity && selectedTemplateId !== "promissory_note" && selectedTemplateId !== "leave_request" && (
                <Input
                  label="المدينة / الفرع"
                  value={issueCity}
                  onChange={(e) => setIssueCity(e.target.value)}
                />
              )}

              {/* Cash Disbursement double voucher option */}
              {selectedTemplateId === "cash_disbursement" && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={showDoubleVoucher}
                      onChange={(e) => setShowDoubleVoucher(e.target.checked)}
                      className="w-4 h-4 rounded text-[#1167c9] focus:ring-[#1167c9]"
                    />
                    <span>عرض نسختين في نفس الصفحة (نسخة الإدارة + نسخة المدير العام)</span>
                  </label>
                </div>
              )}

              {/* Clearance Form specific fields */}
              {selectedTemplateId === "clearance_form" && (
                <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="المسمى الوظيفي"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                    <Input
                      label="الإدارة / القسم"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="رقم قرار طي القيد"
                      value={decisionNo}
                      onChange={(e) => setDecisionNo(e.target.value)}
                      placeholder="مثال: 402/2026"
                    />
                    <Input
                      label="تاريخ قرار طي القيد"
                      value={decisionDate}
                      onChange={(e) => setDecisionDate(e.target.value)}
                      placeholder="YYYY/MM/DD"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                      سبب إخلاء الطرف
                    </label>
                    <select
                      value={clearanceReason}
                      onChange={(e) => setClearanceReason(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-bold text-[var(--foreground)] outline-none focus:border-[#1167c9]"
                    >
                      <option value="resignation">لاستقالته</option>
                      <option value="leave">إجازة</option>
                      <option value="transfer">للنقل</option>
                      <option value="death">للوفاة</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>

                  {clearanceReason === "other" && (
                    <Input
                      label="سبب إخلاء الطرف الآخر"
                      value={otherReasonText}
                      onChange={(e) => setOtherReasonText(e.target.value)}
                      placeholder="اذكر السبب..."
                    />
                  )}
                </div>
              )}

              {/* Resignation Form specific fields */}
              {selectedTemplateId === "resignation_form" && (
                <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="الجنسية"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                    />
                    <Input
                      label="رقم الجوال"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="05XXXXXXXX"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="اعتباراً من يوم"
                      value={effectiveDay}
                      onChange={(e) => setEffectiveDay(e.target.value)}
                      placeholder="مثال: الأحد"
                    />
                    <Input
                      label="التاريخ الموافق"
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                      placeholder="YYYY/MM/DD"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                      سبب الاستقالة التفصيلي
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="اذكر أسباب الاستقالة..."
                      className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none focus:border-[#1167c9] min-h-[70px]"
                    />
                  </div>
                </div>
              )}

              {/* Final Settlement specific fields */}
              {selectedTemplateId === "final_settlement" && (
                <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                  <Input
                    label="اسم الشركة"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="شركة اكسبرس جابت"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="الجنسية"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                    />
                    <Input
                      label="المسمى الوظيفي"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </div>
                  <Input
                    label="تاريخ انتهاء رابطة العمل"
                    value={vacationEndDate}
                    onChange={(e) => setVacationEndDate(e.target.value)}
                    placeholder="YYYY/MM/DD"
                  />
                </div>
              )}

              {/* Cash Custody Promissory specific fields */}
              {selectedTemplateId === "cash_custody_promissory" && (
                <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="المسمى الوظيفي"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                    <Input
                      label="القسم / الإدارة"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                  </div>
                  <Input
                    label="بيان / نوع العهدة النقدية"
                    value={custodyType}
                    onChange={(e) => setCustodyType(e.target.value)}
                    placeholder="عهدة نقدية للأعمال التشغيلية..."
                  />
                  <Input
                    label="رقم السند لأمر"
                    value={promissoryNo}
                    onChange={(e) => setPromissoryNo(e.target.value)}
                    placeholder="SN-2026/001"
                  />
                  <div>
                    <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                      طريقة تسليم العهدة
                    </label>
                    <select
                      value={deliveryMethod}
                      onChange={(e) => setDeliveryMethod(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-bold text-[var(--foreground)] outline-none focus:border-[#1167c9]"
                    >
                      <option value="cash">نقداً</option>
                      <option value="bank">تحويل بنكي</option>
                    </select>
                  </div>
                  {deliveryMethod === "bank" && (
                    <Input
                      label="رقم الحساب البنكي"
                      value={bankAccountNo}
                      onChange={(e) => setBankAccountNo(e.target.value)}
                      placeholder="SA00 0000 0000 0000 0000 0000"
                    />
                  )}
                </div>
              )}

              {/* City for templates requiring city (other than promissory note & leave request & clearance & resignation & final settlement) */}
              {activeTemplate.requiresCity && selectedTemplateId !== "promissory_note" && selectedTemplateId !== "leave_request" && selectedTemplateId !== "clearance_form" && selectedTemplateId !== "resignation_form" && selectedTemplateId !== "final_settlement" && (
                <Input
                  label="المدينة / الفرع"
                  value={issueCity}
                  onChange={(e) => setIssueCity(e.target.value)}
                />
              )}

              {/* Cash Disbursement double voucher option */}
              {selectedTemplateId === "cash_disbursement" && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={showDoubleVoucher}
                      onChange={(e) => setShowDoubleVoucher(e.target.checked)}
                      className="w-4 h-4 rounded text-[#1167c9] focus:ring-[#1167c9]"
                    />
                    <span>عرض نسختين في نفس الصفحة (نسخة الإدارة + نسخة المدير العام)</span>
                  </label>
                </div>
              )}

              {/* Generic Document notes */}
              {selectedTemplateId !== "cash_disbursement" && selectedTemplateId !== "promissory_note" && selectedTemplateId !== "leave_request" && selectedTemplateId !== "salary_certificate" && selectedTemplateId !== "clearance_form" && selectedTemplateId !== "resignation_form" && selectedTemplateId !== "final_settlement" && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                    ملاحظات إضافية (اختياري)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أي ملاحظات أو بنود إضافية..."
                    className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none focus:border-[#1167c9] min-h-[70px]"
                  />
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Live Document Preview Column */}
        <div className="lg:col-span-7 print:col-span-12 space-y-3">
          <div className="flex items-center justify-between px-4 py-2.5 rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] print:hidden">
            <span className="text-xs font-black flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#1167c9]" />
              معاينة الورقة الرسمية: <strong className="text-[#1167c9]">{activeTemplate.titleAr}</strong>
            </span>
            <Badge tone="blue">قياس A4</Badge>
          </div>

          <div className="p-4 md:p-6 rounded-b-2xl border border-[var(--border)] bg-slate-100 dark:bg-slate-900/60 shadow-inner print:p-0 print:border-none print:bg-white">
            {selectedTemplateId === "cash_disbursement" && (
              <CashDisbursementView
                data={{
                  riderName,
                  iqamaNo,
                  amount,
                  amountInWords,
                  reason,
                  date,
                  showDoubleVoucher,
                  companyName,
                }}
              />
            )}

            {selectedTemplateId === "promissory_note" && (
              <PromissoryNoteView
                data={{
                  riderName,
                  iqamaNo,
                  nationality,
                  amount,
                  amountInWords,
                  issueDate: date,
                  issueCity,
                  paymentCity,
                  companyName,
                  companyCr,
                  dueDate,
                }}
              />
            )}

            {selectedTemplateId === "leave_request" && (
              <VacationFormView
                data={{
                  applicantName: riderName,
                  employeeNo: iqamaNo,
                  date,
                  jobTitle,
                  department,
                  startDate: vacationStartDate,
                  endDate: vacationEndDate,
                  vacationDays,
                  vacationType,
                  otherReasonText,
                  joiningDate,
                  telExt,
                  companyName,
                }}
              />
            )}

            {selectedTemplateId === "salary_certificate" && (
              <SalaryCertificateView
                data={{
                  employeeName: riderName,
                  iqamaNo,
                  jobTitle,
                  salaryAmount: amount,
                  salaryInWords: amountInWords,
                  companyName,
                  date,
                  allowancesDetail,
                }}
              />
            )}

            {selectedTemplateId === "clearance_form" && (
              <ClearanceFormView
                data={{
                  employeeName: riderName,
                  iqamaNo,
                  jobTitle,
                  department,
                  decisionNo,
                  decisionDate,
                  reason: clearanceReason,
                  otherReason: otherReasonText,
                  companyName,
                }}
              />
            )}

            {selectedTemplateId === "resignation_form" && (
              <ResignationFormView
                data={{
                  employeeName: riderName,
                  iqamaNo,
                  nationality,
                  mobile,
                  employeeNo: iqamaNo ? iqamaNo.slice(-5) : "",
                  city: issueCity,
                  effectiveDay,
                  effectiveDate,
                  reasonText: reason,
                  companyName,
                }}
              />
            )}

            {selectedTemplateId === "final_settlement" && (
              <FinalSettlementView
                data={{
                  employeeName: riderName,
                  iqamaNo,
                  nationality,
                  jobTitle,
                  companyName,
                  endDate: vacationEndDate,
                  date,
                }}
              />
            )}

            {selectedTemplateId === "financial_advance" && (
              <CashAdvanceView
                data={{
                  riderName,
                  iqamaNo,
                  nationality,
                  amount,
                  amountInWords,
                  date,
                  companyName,
                }}
              />
            )}

            {selectedTemplateId === "cash_custody_promissory" && (
              <CashCustodyPromissoryView
                data={{
                  riderName,
                  iqamaNo,
                  jobTitle,
                  department,
                  companyName,
                  date,
                  custodyType,
                  amount,
                  amountInWords,
                  promissoryDate: date,
                  promissoryNo,
                  deliveryMethod,
                  bankAccountNo,
                }}
              />
            )}

            {selectedTemplateId !== "cash_disbursement" && selectedTemplateId !== "promissory_note" && selectedTemplateId !== "financial_advance" && selectedTemplateId !== "cash_custody_promissory" && selectedTemplateId !== "leave_request" && selectedTemplateId !== "salary_certificate" && selectedTemplateId !== "clearance_form" && selectedTemplateId !== "resignation_form" && selectedTemplateId !== "final_settlement" && (
              <GenericDocumentView
                template={activeTemplate}
                data={{
                  riderName,
                  iqamaNo,
                  nationality,
                  amount,
                  amountInWords,
                  reason,
                  date,
                  city: issueCity,
                  notes,
                  companyName,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

