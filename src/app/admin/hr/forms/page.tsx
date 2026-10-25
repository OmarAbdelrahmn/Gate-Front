"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Printer,
  RotateCcw,
  Search,
  User,
  CheckCircle2,
  Sparkles,
  Layers,
  Palette,
  FileDown,
  FileCheck,
  Car,
  Shield,
} from "lucide-react";
import {
  LetterheadHeader,
  LetterheadFooter,
  LetterheadFrame,
  LETTERHEAD_TEMPLATES,
  type LetterheadId,
} from "@/components/hr/forms/LetterheadHeader";

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
import { CustodyReceiptView } from "@/components/hr/forms/CustodyReceiptView";
import { GenericDocumentView } from "@/components/hr/forms/GenericDocumentView";
import { VacationFormView } from "@/components/hr/forms/VacationFormView";
import { SalaryCertificateView } from "@/components/hr/forms/SalaryCertificateView";
import { ClearanceFormView } from "@/components/hr/forms/ClearanceFormView";
import { ResignationFormView } from "@/components/hr/forms/ResignationFormView";
import { FinalSettlementView } from "@/components/hr/forms/FinalSettlementView";
import { WorkCommencementView } from "@/components/hr/forms/WorkCommencementView";
import { DisciplinaryActionView } from "@/components/hr/forms/DisciplinaryActionView";
import { AnnualEntitlementsReceiptView } from "@/components/hr/forms/AnnualEntitlementsReceiptView";
import { SimHandoverReceiptView } from "@/components/hr/forms/SimHandoverReceiptView";
import { InterviewFormView } from "@/components/hr/forms/InterviewFormView";
import { OperationsEvaluationView } from "@/components/hr/forms/OperationsEvaluationView";
import { AbsenceWarningView } from "@/components/hr/forms/AbsenceWarningView";
import { JobOfferView } from "@/components/hr/forms/JobOfferView";
import {
  FullCustodyFormView,
  CustodyItemHandover,
  CustodyItemReturn,
  VehicleInspectionPart,
  PolicyTermItem,
  INITIAL_CUSTODY_ITEMS,
  INITIAL_VEHICLE_PARTS,
  INITIAL_POLICY_TERMS,
} from "@/components/hr/forms/FullCustodyFormView";
import { getVehiclesLookup } from "@/lib/fleet/api";
import type { VehicleLookupResponse } from "@/lib/fleet/types";
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
  jobTitle?: string;
  birthDate?: string;
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

  // Letterhead Selection State
  const [selectedLetterhead, setSelectedLetterhead] = useState<LetterheadId>("express");

  const handleSelectLetterhead = (lhId: LetterheadId) => {
    setSelectedLetterhead(lhId);
    const found = LETTERHEAD_TEMPLATES.find((t) => t.id === lhId);
    if (found) {
      setCompanyName(found.companyName);
    }
  };

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
  const [companyName, setCompanyName] = useState<string>("شركة اكسبرس جايت");
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

  // Work Commencement State
  const [workplace, setWorkplace] = useState<string>("جده - المركز الرئيسي");
  const [contractStartDate, setContractStartDate] = useState<string>("");
  const [actualStartDate, setActualStartDate] = useState<string>("");
  const [hrManagerName, setHrManagerName] = useState<string>("مسؤول الموارد البشرية");

  // Disciplinary Action State
  const [violation, setViolation] = useState<string>("التأخير عن مواعيد العمل الرسمية");
  const [violationReasons, setViolationReasons] = useState<string>("");
  const [actionTaken, setActionTaken] = useState<string>("خصم أجر يوم من الراتب / لفت نظر");
  const [directManagerOpinion, setDirectManagerOpinion] = useState<string>("اعتماد تطبيق الإجراء الجزائي");
  const [generalManagerName, setGeneralManagerName] = useState<string>("المدير العام");

  // Annual Entitlements State
  const [periodFrom, setPeriodFrom] = useState<string>("2025/09/01");
  const [periodTo, setPeriodTo] = useState<string>("2026/09/01");

  // Absence Warning State
  const [absenceLanguage, setAbsenceLanguage] = useState<"ar" | "en" | "both">("both");
  const [warningNumber, setWarningNumber] = useState<string>("1");
  const [warningDegree, setWarningDegree] = useState<"first" | "second" | "final">("first");
  const [absenceStartDay, setAbsenceStartDay] = useState<string>("السبت");
  const [absenceStartDate, setAbsenceStartDate] = useState<string>("2026/09/01");
  const [absenceEndDate, setAbsenceEndDate] = useState<string>("2026/09/05");
  const [executiveDirector, setExecutiveDirector] = useState<string>("المدير التنفيذي");

  // Interview Form Specific States
  const [relativePhoneInside, setRelativePhoneInside] = useState<string>("");
  const [phoneOutside, setPhoneOutside] = useState<string>("");
  const [birthDate, setBirthDate] = useState<string>("");
  const [transferCount, setTransferCount] = useState<string>("1");
  const [transferCost, setTransferCost] = useState<string>("2000");
  const [riderCost, setRiderCost] = useState<string>("2000");
  const [iqamaExpiryDate, setIqamaExpiryDate] = useState<string>("");
  const [iqamaRenewalCost, setIqamaRenewalCost] = useState<string>("650");
  const [licenseCost, setLicenseCost] = useState<string>("500");
  const [professionChangeCost, setProfessionChangeCost] = useState<string>("1000");
  const [totalCostOnRider, setTotalCostOnRider] = useState<string>("2000");
  const [totalExpenses, setTotalExpenses] = useState<string>("4150");
  const [vehicleType, setVehicleType] = useState<"motorcycle" | "car" | "">("motorcycle");
  const [licenseStatus, setLicenseStatus] = useState<"valid" | "expired" | "">("valid");
  const [licenseType, setLicenseType] = useState<string>("دراجة نارية");

  // Operations Evaluation State
  const [knowledgeAppsMaps, setKnowledgeAppsMaps] = useState<"excellent" | "good" | "weak" | "">("good");
  const [previousExperience, setPreviousExperience] = useState<string>("");
  const [workUnderPressure, setWorkUnderPressure] = useState<"yes" | "no" | "">("yes");
  const [immediateReadiness, setImmediateReadiness] = useState<"yes" | "no" | "">("yes");
  const [deliveryExperience, setDeliveryExperience] = useState<"yes" | "no" | "">("yes");
  const [operationsRating, setOperationsRating] = useState<"excellent" | "good" | "acceptable" | "weak" | "">("good");
  const [recommendationByExp, setRecommendationByExp] = useState<string>("تطبيقات التوصيل السريع");
  const [operationsNotes, setOperationsNotes] = useState<string>("");
  const [interviewResult, setInterviewResult] = useState<"accepted" | "rejected" | "deferred" | "">("accepted");
  const [operationsManagerName, setOperationsManagerName] = useState<string>("مشرف إدارة التشغيل");
  const [interviewPageView, setInterviewPageView] = useState<"both" | "hr" | "operations">("both");

  // SIM Handover State (Standalone, decoupled from user personal info)
  const [simPhoneNumber, setSimPhoneNumber] = useState<string>("");
  const [simCarrier, setSimCarrier] = useState<string>("STC");
  const [simCarrierCustom, setSimCarrierCustom] = useState<string>("");
  const [simIccid, setSimIccid] = useState<string>("");
  const [simFormNo, setSimFormNo] = useState<string>("SIM-2026/001");
  const [simEmployeeCode, setSimEmployeeCode] = useState<string>("");

  // 04 - Full Custody & Fleet Policy Template State
  const [fcModels, setFcModels] = useState<{ handover: boolean; returnCustody: boolean; fleetPolicy: boolean }>({
    handover: true,
    returnCustody: false,
    fleetPolicy: true,
  });
  const [fcLanguage, setFcLanguage] = useState<"ar" | "en" | "both">("both");
  const [fcRecordNo, setFcRecordNo] = useState<string>("REC-2026/001");
  const [fcTime, setFcTime] = useState<string>("10:00 ص");
  const [fcBranch, setFcBranch] = useState<string>("الفرع الرئيسي - جدة");
  const [fcPrevDeliveryRef, setFcPrevDeliveryRef] = useState<string>("REC-2026/HANDOVER-001");
  const [fcRiderCode, setFcRiderCode] = useState<string>("");

  // Full Custody: Vehicle details
  const [fleetVehicles, setFleetVehicles] = useState<VehicleLookupResponse[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [fcVehicleType, setFcVehicleType] = useState<string>("سيارة");
  const [fcMakeModel, setFcMakeModel] = useState<string>("تويوتا يارس 2024");
  const [fcColor, setFcColor] = useState<string>("أبيض");
  const [fcPlateNumber, setFcPlateNumber] = useState<string>("أ ب ج 1234");
  const [fcChassisNumber, setFcChassisNumber] = useState<string>("JT1234567890ABCD");
  const [fcSerialNumber, setFcSerialNumber] = useState<string>("SN-987654");
  const [fcOdometer, setFcOdometer] = useState<string>("45,200");
  const [fcFuelLevel, setFcFuelLevel] = useState<string>("ممتلئ (Full)");
  const [fcKeysCount, setFcKeysCount] = useState<string>("2");
  const [fcRegistrationStatus, setFcRegistrationStatus] = useState<string>("سارية ومجددة");

  // Model 1: Handover items & inspection
  const [fcHandoverItems, setFcHandoverItems] = useState<CustodyItemHandover[]>(() =>
    INITIAL_CUSTODY_ITEMS.map((item) => ({
      id: item.id,
      selected: item.defaultSelected,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      quantity: item.defaultQty,
      unitPrice: item.unitPrice,
      condition: item.defaultCondition,
    }))
  );
  const [fcHandoverCustodyNotes, setFcHandoverCustodyNotes] = useState<string>("");
  const [fcHandoverExteriorCondition, setFcHandoverExteriorCondition] = useState<"excellent" | "good" | "remarks">("excellent");
  const [fcHandoverParts, setFcHandoverParts] = useState<VehicleInspectionPart[]>(() =>
    INITIAL_VEHICLE_PARTS.map((p) => ({
      id: p.id,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      condition: p.defaultCondition,
    }))
  );
  const [fcHandoverSpareTire, setFcHandoverSpareTire] = useState<"present" | "not_present" | "remarks">("present");
  const [fcHandoverFaults, setFcHandoverFaults] = useState<{ id: number; checked: boolean; text: string }[]>([
    { id: 1, checked: false, text: "صدمة أو خدش عميق بالصدام" },
    { id: 2, checked: false, text: "صوت بالمكينة أو العكوس" },
    { id: 3, checked: false, text: "اهتزاز بالفرامل أو رجة" },
    { id: 4, checked: false, text: "كسر في الزجاج أو المرايا" },
    { id: 5, checked: false, text: "لمبة المكينة أو فحص المحرك تعمل" },
  ]);
  const [fcHandoverVisibleScratches, setFcHandoverVisibleScratches] = useState<string>("");
  const [fcHandoverAttachments, setFcHandoverAttachments] = useState<{
    front: boolean;
    rear: boolean;
    sides: boolean;
    interior: boolean;
    odometer: boolean;
    damages: boolean;
  }>({
    front: true,
    rear: true,
    sides: true,
    interior: true,
    odometer: true,
    damages: false,
  });

  // Model 2: Return items & inspection
  const [fcReturnItems, setFcReturnItems] = useState<CustodyItemReturn[]>(() =>
    INITIAL_CUSTODY_ITEMS.map((item) => ({
      id: item.id,
      selected: item.defaultSelected,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      unitPrice: item.unitPrice,
      originalQty: item.defaultQty,
      returnedQty: item.defaultQty,
      missingQty: 0,
    }))
  );
  const [fcReturnCustodyNotes, setFcReturnCustodyNotes] = useState<string>("");
  const [fcReturnExteriorCondition, setFcReturnExteriorCondition] = useState<"excellent" | "good" | "remarks">("good");
  const [fcReturnParts, setFcReturnParts] = useState<VehicleInspectionPart[]>(() =>
    INITIAL_VEHICLE_PARTS.map((p) => ({
      id: p.id,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      condition: p.defaultCondition,
    }))
  );
  const [fcReturnSpareTire, setFcReturnSpareTire] = useState<"present" | "not_present" | "remarks">("present");
  const [fcReturnFaults, setFcReturnFaults] = useState<{ id: number; checked: boolean; text: string }[]>([
    { id: 1, checked: false, text: "صدمة أو خدش عميق بالصدام" },
    { id: 2, checked: false, text: "صوت بالمكينة أو العكوس" },
    { id: 3, checked: false, text: "اهتزاز بالفرامل أو رجة" },
    { id: 4, checked: false, text: "كسر في الزجاج أو المرايا" },
    { id: 5, checked: false, text: "لمبة المكينة أو فحص المحرك تعمل" },
  ]);
  const [fcReturnVisibleScratches, setFcReturnVisibleScratches] = useState<string>("");
  const [fcReturnAttachments, setFcReturnAttachments] = useState<{
    front: boolean;
    rear: boolean;
    sides: boolean;
    interior: boolean;
    odometer: boolean;
    damages: boolean;
  }>({
    front: true,
    rear: true,
    sides: true,
    interior: true,
    odometer: true,
    damages: false,
  });

  // Model 3: Policy terms (14 items)
  const [fcPolicyTerms, setFcPolicyTerms] = useState<PolicyTermItem[]>(() =>
    INITIAL_POLICY_TERMS.map((t) => ({ ...t, selected: true }))
  );

  // Administrative
  const [fcCompanyRepName, setFcCompanyRepName] = useState<string>("مسؤول قسم الأسطول والتشغيل");
  const [fcCompanyRepTitle, setFcCompanyRepTitle] = useState<string>("مشرف الأسطول والعهد");

  // Load fleet vehicles lookup
  useEffect(() => {
    getVehiclesLookup("")
      .then((data) => {
        if (Array.isArray(data)) setFleetVehicles(data);
      })
      .catch((err) => console.error("Error loading vehicles lookup in HR forms:", err));
  }, []);

  // Format vehicle options for SearchableSelect
  const vehicleOptions: SelectOption[] = useMemo(() => {
    return fleetVehicles.map((v) => ({
      value: v.id,
      label: `${v.plateNumberAr || v.plateNumberEn || "بدون لوحة"} (${v.manufacturer || ""} ${v.model || ""})`.trim(),
      sublabel: `رقم الأصل: ${v.assetNumber}`,
      keywords: `${v.plateNumberAr || ""} ${v.plateNumberEn || ""} ${v.assetNumber || ""} ${v.manufacturer || ""} ${v.model || ""}`,
    }));
  }, [fleetVehicles]);

  // Sync vehicle fields when selectedVehicleId changes
  useEffect(() => {
    if (!selectedVehicleId || !fleetVehicles.length) return;
    const v = fleetVehicles.find((x) => x.id === selectedVehicleId);
    if (v) {
      if (v.manufacturer || v.model) {
        setFcMakeModel(`${v.manufacturer || ""} ${v.model || ""}`.trim());
      }
      if (v.plateNumberAr || v.plateNumberEn) {
        setFcPlateNumber(v.plateNumberAr || v.plateNumberEn || "");
      }
      if (v.assetNumber) {
        setFcSerialNumber(v.assetNumber);
      }
    }
  }, [selectedVehicleId, fleetVehicles]);

  // Initialize today's date and default Tafreet
  useEffect(() => {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(
      2,
      "0"
    )}/${String(today.getDate()).padStart(2, "0")}`;
    setDate(formattedDate);
    setContractStartDate(formattedDate);
    setActualStartDate(formattedDate);
    setAmountInWords(tafreetArabicNumber(15000, false));

    // Support URL search params e.g. /admin/hr/forms?template=full_custody_form&personId=...
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tplParam = params.get("template");
      if (tplParam && FORM_TEMPLATES.some((t) => t.id === tplParam)) {
        setSelectedTemplateId(tplParam);
      }
      const personParam = params.get("personId");
      if (personParam) {
        setSelectedPersonId(personParam);
      }
      const vehicleIdParam = params.get("vehicleId");
      if (vehicleIdParam) {
        setSelectedVehicleId(vehicleIdParam);
      }
      const modeParam = params.get("mode");
      if (modeParam === "handover_policy") {
        setFcModels({ handover: true, returnCustody: false, fleetPolicy: true });
      } else if (modeParam === "return_policy") {
        setFcModels({ handover: false, returnCustody: true, fleetPolicy: true });
      } else if (modeParam === "handover") {
        setFcModels({ handover: true, returnCustody: false, fleetPolicy: false });
      } else if (modeParam === "return") {
        setFcModels({ handover: false, returnCustody: true, fleetPolicy: false });
      } else if (modeParam === "policy") {
        setFcModels({ handover: false, returnCustody: false, fleetPolicy: true });
      } else if (modeParam === "all") {
        setFcModels({ handover: true, returnCustody: true, fleetPolicy: true });
      }
    }
  }, []);

  // Update amount in words when template changes
  useEffect(() => {
    const num = parseFloat(amount);
    if (!isNaN(num) && num >= 0) {
      setAmountInWords(tafreetArabicNumber(num, selectedTemplateId !== "cash_disbursement"));
    }
  }, [selectedTemplateId, amount]);

  // Auto-calculate interview expenses when sub-costs change
  useEffect(() => {
    if (selectedTemplateId !== "hr_interview") return;
    const tCost = parseFloat(transferCost) || 0;
    const iCost = parseFloat(iqamaRenewalCost) || 0;
    const lCost = parseFloat(licenseCost) || 0;
    const pCost = parseFloat(professionChangeCost) || 0;
    const sum = tCost + iCost + lCost + pCost;
    if (sum > 0) {
      setTotalExpenses(sum.toString());
    }
  }, [transferCost, iqamaRenewalCost, licenseCost, professionChangeCost, selectedTemplateId]);

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
              const empJob = emp.workingForMeAs || emp.residencyProfession || (emp.isEmployee ? "موظف إداري" : "مندوب توصيل");
              const bDate = (emp as Record<string, unknown>).birthDate as string || "";
              combined.push({
                id: emp.id || `emp-${Math.random()}`,
                fullNameAr: emp.fullNameAr,
                iqamaNo: iq,
                nationality: emp.nationality || "غير محدد",
                phone: emp.primaryPhone || undefined,
                source: "employee",
                jobTitle: empJob,
                birthDate: bDate,
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
                  jobTitle: "سائق مندوب توصيل",
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
      label: p.fullNameAr,
      sublabel: `إقامة: ${p.iqamaNo || "غير مسجلة"}${
        p.source === "externalRider" ? " • مندوب خارجي" : " • موظف"
      }`,
      keywords: `${p.iqamaNo || ""} ${p.fullNameAr} ${p.phone || ""}`.trim(),
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
      if (found.jobTitle) {
        setJobTitle(found.jobTitle);
      } else {
        setJobTitle(found.source === "employee" ? "موظف إداري" : "مندوب توصيل");
      }
      if (found.phone) {
        setMobile(found.phone);
      }
      if (found.birthDate) {
        setBirthDate(found.birthDate);
      }
    }
  };

  // Sync person details if selectedPersonId was initialized before people loaded
  useEffect(() => {
    if (!selectedPersonId || !people.length) return;
    const found = people.find((p) => p.id === selectedPersonId);
    if (found) {
      setRiderName(found.fullNameAr);
      setIqamaNo(found.iqamaNo);
      setNationality(found.nationality);
      if (found.jobTitle) {
        setJobTitle(found.jobTitle);
      }
      if (found.phone) {
        setMobile(found.phone);
      }
      if (found.birthDate) {
        setBirthDate(found.birthDate);
      }
    }
  }, [selectedPersonId, people]);

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
    setSimPhoneNumber("");
    setSimCarrier("STC");
    setSimCarrierCustom("");
    setSimIccid("");
    setSimFormNo("SIM-2026/001");
    setSimEmployeeCode("");
  };

  return (
    <div className="space-y-6 dir-rtl text-right min-h-screen pb-16 print:p-0 print:m-0 print:space-y-0 print:min-h-0 print:pb-0">
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
          <Link href="/admin/hr/template-designer">
            <Button variant="secondary">
              <Palette size={17} />
              مصمم النماذج (Designer)
            </Button>
          </Link>
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${selectedCategory === "all"
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${selectedCategory === cat.id
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
                className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all text-xs font-bold gap-2 ${isSelected
                    ? "border-[#1167c9] bg-blue-500/10 text-[#1167c9] shadow-xs ring-2 ring-[#1167c9]/20"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[#1167c9]/50 hover:bg-blue-500/5"
                  }`}
              >
                <div
                  className={`p-2 rounded-lg ${isSelected ? "bg-[#1167c9] text-white" : "bg-[var(--background)] text-[var(--muted)]"
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

      {/* 2. Official Letterhead Background Selection Card */}
      <Card className="p-3.5 space-y-2.5 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck size={16} className="text-[#1167c9]" />
            <h2 className="font-bold text-xs text-[var(--foreground)]">خلفية ورقة المروس (Letterhead Background)</h2>
          </div>
          <span className="text-[11px] text-[var(--muted)] font-medium">اختر قالب المروس للطباعة أو تحميل Word</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {LETTERHEAD_TEMPLATES.map((lh) => {
            const isSelected = selectedLetterhead === lh.id;
            return (
              <div
                key={lh.id}
                onClick={() => handleSelectLetterhead(lh.id)}
                className={`cursor-pointer p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 text-right ${isSelected
                    ? "border-[#1167c9] bg-blue-500/10 text-[var(--foreground)] ring-1 ring-[#1167c9]/40"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[#1167c9]/40"
                  }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-r ${lh.colorGradient}`} />
                  <div className="min-w-0">
                    <p className="font-bold text-xs truncate leading-tight">{lh.titleAr}</p>
                    <p className="text-[10px] text-[var(--muted)] truncate">{lh.companyName}</p>
                  </div>
                </div>

                {lh.fileName && (
                  <a
                    href={encodeURI(`/${lh.fileName}`)}
                    download
                    onClick={(e) => e.stopPropagation()}
                    title="تحميل ملف Word (.docx)"
                    className="p-1 rounded-lg hover:bg-blue-500/10 text-[#1167c9] transition shrink-0"
                  >
                    <FileDown size={14} />
                  </a>
                )}
              </div>
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
                searchPlaceholder="ابحث بالاسم أو رقم الإقامة..."
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
                dir="rtl"
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
                    placeholder="شركة اكسبرس جايت"
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

              {/* HR Interview specific fields */}
              {selectedTemplateId === "hr_interview" && (
                <div className="space-y-4 pt-2 border-t border-[var(--border)]">
                  {/* Page view switch */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--muted)] mb-1.5">
                      عرض وطباعة النموذج
                    </label>
                    <div className="flex items-center gap-1.5 p-1 bg-[var(--background)] rounded-xl border border-[var(--border)]">
                      <button
                        type="button"
                        onClick={() => setInterviewPageView("both")}
                        className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition ${interviewPageView === "both" ? "bg-[#1167c9] text-white shadow-xs" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                      >
                        الكل (صفحتين)
                      </button>
                      <button
                        type="button"
                        onClick={() => setInterviewPageView("hr")}
                        className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition ${interviewPageView === "hr" ? "bg-[#1167c9] text-white shadow-xs" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                      >
                        1. الموارد البشرية
                      </button>
                      <button
                        type="button"
                        onClick={() => setInterviewPageView("operations")}
                        className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition ${interviewPageView === "operations" ? "bg-[#1167c9] text-white shadow-xs" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                      >
                        2. إدارة التشغيل
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="رقم الجوال الشخصي"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="05XXXXXXXX"
                    />
                    <Input
                      label="تاريخ الميلاد"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      placeholder="YYYY/MM/DD"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="جوال أحد الأقارب داخل المملكة"
                      value={relativePhoneInside}
                      onChange={(e) => setRelativePhoneInside(e.target.value)}
                      placeholder="05XXXXXXXX"
                    />
                    <Input
                      label="رقم الجوال خارج المملكة"
                      value={phoneOutside}
                      onChange={(e) => setPhoneOutside(e.target.value)}
                      placeholder="+XXXXXXXXXXX"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="المهنة في الإقامة"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="سائق مندوب توصيل"
                    />
                    <Input
                      label="عدد مرات نقل الخدمات"
                      value={transferCount}
                      onChange={(e) => setTransferCount(e.target.value)}
                      placeholder="مثال: 1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="تكلفة نقل الخدمات (ريال)"
                      value={transferCost}
                      onChange={(e) => setTransferCost(e.target.value)}
                      placeholder="2000"
                    />
                    <Input
                      label="التكلفة على المندوب (ريال)"
                      value={riderCost}
                      onChange={(e) => setRiderCost(e.target.value)}
                      placeholder="2000"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="تاريخ انتهاء الإقامة"
                      value={iqamaExpiryDate}
                      onChange={(e) => setIqamaExpiryDate(e.target.value)}
                      placeholder="YYYY/MM/DD"
                    />
                    <Input
                      label="تكلفة تجديد الإقامة (ريال)"
                      value={iqamaRenewalCost}
                      onChange={(e) => setIqamaRenewalCost(e.target.value)}
                      placeholder="650"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="تكاليف إصدار الرخصة (ريال)"
                      value={licenseCost}
                      onChange={(e) => setLicenseCost(e.target.value)}
                      placeholder="500"
                    />
                    <Input
                      label="تكاليف تغيير المهنة (ريال)"
                      value={professionChangeCost}
                      onChange={(e) => setProfessionChangeCost(e.target.value)}
                      placeholder="1000"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="إجمالي التكلفة المحملة على المندوب"
                      value={totalCostOnRider}
                      onChange={(e) => setTotalCostOnRider(e.target.value)}
                      placeholder="2000"
                    />
                    <Input
                      label="إجمالي المصاريف"
                      value={totalExpenses}
                      onChange={(e) => setTotalExpenses(e.target.value)}
                      placeholder="4150"
                    />
                  </div>

                  {/* Vehicle Type selection */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--muted)] mb-1.5">
                      نوع المركبة
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                        <input
                          type="radio"
                          name="vehicleType"
                          checked={vehicleType === "motorcycle"}
                          onChange={() => {
                            setVehicleType("motorcycle");
                            setLicenseType("دراجة نارية");
                          }}
                          className="text-[#1167c9]"
                        />
                        <span>دباب (دراجة نارية)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                        <input
                          type="radio"
                          name="vehicleType"
                          checked={vehicleType === "car"}
                          onChange={() => {
                            setVehicleType("car");
                            setLicenseType("خصوصي");
                          }}
                          className="text-[#1167c9]"
                        />
                        <span>سيارة</span>
                      </label>
                    </div>
                  </div>

                  {/* License Status selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--muted)] mb-1.5">
                        حالة رخصة القيادة
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                          <input
                            type="radio"
                            name="licenseStatus"
                            checked={licenseStatus === "valid"}
                            onChange={() => setLicenseStatus("valid")}
                            className="text-[#1167c9]"
                          />
                          <span>سارية</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                          <input
                            type="radio"
                            name="licenseStatus"
                            checked={licenseStatus === "expired"}
                            onChange={() => setLicenseStatus("expired")}
                            className="text-[#1167c9]"
                          />
                          <span>غير سارية</span>
                        </label>
                      </div>
                    </div>

                    <Input
                      label="نوع رخصة القيادة"
                      value={licenseType}
                      onChange={(e) => setLicenseType(e.target.value)}
                      placeholder="دراجة نارية / خصوصي / نقل خفيف"
                    />
                  </div>

                  {/* Operations Evaluation embedded when viewing both or operations */}
                  {(interviewPageView === "both" || interviewPageView === "operations") && (
                    <div className="space-y-4 pt-3 border-t-2 border-dashed border-[var(--border)]">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#1167c9]" />
                        <h3 className="text-xs font-black text-[#1167c9]">بيانات تقييم وإقرار إدارة التشغيل</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                            تطبيقات التوصيل والخرائط
                          </label>
                          <select
                            value={knowledgeAppsMaps}
                            onChange={(e) => setKnowledgeAppsMaps(e.target.value as any)}
                            className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--foreground)] outline-none focus:border-[#1167c9]"
                          >
                            <option value="excellent">ممتاز</option>
                            <option value="good">جيد</option>
                            <option value="weak">ضعيف</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                            القدرة على العمل تحت الضغط
                          </label>
                          <select
                            value={workUnderPressure}
                            onChange={(e) => setWorkUnderPressure(e.target.value as any)}
                            className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--foreground)] outline-none focus:border-[#1167c9]"
                          >
                            <option value="yes">نعم</option>
                            <option value="no">لا</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                            الجاهزية للعمل فوراً
                          </label>
                          <select
                            value={immediateReadiness}
                            onChange={(e) => setImmediateReadiness(e.target.value as any)}
                            className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--foreground)] outline-none focus:border-[#1167c9]"
                          >
                            <option value="yes">نعم</option>
                            <option value="no">لا</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                            خبرة سابقة في التوصيل
                          </label>
                          <select
                            value={deliveryExperience}
                            onChange={(e) => setDeliveryExperience(e.target.value as any)}
                            className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--foreground)] outline-none focus:border-[#1167c9]"
                          >
                            <option value="yes">نعم</option>
                            <option value="no">لا</option>
                          </select>
                        </div>
                      </div>

                      <Input
                        label="تفاصيل الخبرات السابقة"
                        value={previousExperience}
                        onChange={(e) => setPreviousExperience(e.target.value)}
                        placeholder="عمل سابقاً مع تطبيقات هنقرستيشن / جاهز سنتين..."
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                            التقييم (إدارة التشغيل)
                          </label>
                          <select
                            value={operationsRating}
                            onChange={(e) => setOperationsRating(e.target.value as any)}
                            className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--foreground)] outline-none focus:border-[#1167c9]"
                          >
                            <option value="excellent">ممتاز</option>
                            <option value="good">جيد</option>
                            <option value="acceptable">مقبول</option>
                            <option value="weak">ضعيف</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                            نتيجة المقابلة
                          </label>
                          <select
                            value={interviewResult}
                            onChange={(e) => setInterviewResult(e.target.value as any)}
                            className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--foreground)] outline-none focus:border-[#1167c9]"
                          >
                            <option value="accepted">مقبول</option>
                            <option value="rejected">مرفوض</option>
                            <option value="deferred">مؤجل</option>
                          </select>
                        </div>
                      </div>

                      <Input
                        label="الترشيح حسب الخبرة"
                        value={recommendationByExp}
                        onChange={(e) => setRecommendationByExp(e.target.value)}
                        placeholder="ترشيح لمنصة هنقرستيشن / جاهز..."
                      />

                      <Input
                        label="ملاحظات إدارة التشغيل"
                        value={operationsNotes}
                        onChange={(e) => setOperationsNotes(e.target.value)}
                        placeholder="أي ملاحظات فنية أو تشغيلية..."
                      />

                      <Input
                        label="مسؤول اعتماد إدارة التشغيل"
                        value={operationsManagerName}
                        onChange={(e) => setOperationsManagerName(e.target.value)}
                        placeholder="مشرف إدارة التشغيل"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Standalone Operations Evaluation specific fields */}
              {selectedTemplateId === "operations_evaluation" && (
                <div className="space-y-4 pt-2 border-t border-[var(--border)]">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                        تطبيقات التوصيل والخرائط
                      </label>
                      <select
                        value={knowledgeAppsMaps}
                        onChange={(e) => setKnowledgeAppsMaps(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--foreground)] outline-none focus:border-[#1167c9]"
                      >
                        <option value="excellent">ممتاز</option>
                        <option value="good">جيد</option>
                        <option value="weak">ضعيف</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                        القدرة على العمل تحت الضغط
                      </label>
                      <select
                        value={workUnderPressure}
                        onChange={(e) => setWorkUnderPressure(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--foreground)] outline-none focus:border-[#1167c9]"
                      >
                        <option value="yes">نعم</option>
                        <option value="no">لا</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                        الجاهزية للعمل فوراً
                      </label>
                      <select
                        value={immediateReadiness}
                        onChange={(e) => setImmediateReadiness(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--foreground)] outline-none focus:border-[#1167c9]"
                      >
                        <option value="yes">نعم</option>
                        <option value="no">لا</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                        خبرة سابقة في التوصيل
                      </label>
                      <select
                        value={deliveryExperience}
                        onChange={(e) => setDeliveryExperience(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--foreground)] outline-none focus:border-[#1167c9]"
                      >
                        <option value="yes">نعم</option>
                        <option value="no">لا</option>
                      </select>
                    </div>
                  </div>

                  <Input
                    label="تفاصيل الخبرات السابقة"
                    value={previousExperience}
                    onChange={(e) => setPreviousExperience(e.target.value)}
                    placeholder="عمل سابقاً مع تطبيقات هنقرستيشن / جاهز..."
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                        التقييم (إدارة التشغيل)
                      </label>
                      <select
                        value={operationsRating}
                        onChange={(e) => setOperationsRating(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--foreground)] outline-none focus:border-[#1167c9]"
                      >
                        <option value="excellent">ممتاز</option>
                        <option value="good">جيد</option>
                        <option value="acceptable">مقبول</option>
                        <option value="weak">ضعيف</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                        نتيجة المقابلة
                      </label>
                      <select
                        value={interviewResult}
                        onChange={(e) => setInterviewResult(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--foreground)] outline-none focus:border-[#1167c9]"
                      >
                        <option value="accepted">مقبول</option>
                        <option value="rejected">مرفوض</option>
                        <option value="deferred">مؤجل</option>
                      </select>
                    </div>
                  </div>

                  <Input
                    label="الترشيح حسب الخبرة"
                    value={recommendationByExp}
                    onChange={(e) => setRecommendationByExp(e.target.value)}
                    placeholder="ترشيح لمنصة هنقرستيشن / جاهز..."
                  />

                  <Input
                    label="ملاحظات إدارة التشغيل"
                    value={operationsNotes}
                    onChange={(e) => setOperationsNotes(e.target.value)}
                    placeholder="أي ملاحظات فنية أو تشغيلية..."
                  />

                  <Input
                    label="مسؤول اعتماد إدارة التشغيل"
                    value={operationsManagerName}
                    onChange={(e) => setOperationsManagerName(e.target.value)}
                    placeholder="مشرف إدارة التشغيل"
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

              {/* Work Commencement specific fields */}
              {selectedTemplateId === "work_commencement" && (
                <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="المسمى الوظيفي"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="سائق مندوب توصيل"
                    />
                    <Input
                      label="الإدارة / القسم"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="إدارة العمليات والتشغيل"
                    />
                  </div>
                  <Input
                    label="مكان العمل"
                    value={workplace}
                    onChange={(e) => setWorkplace(e.target.value)}
                    placeholder="جده - المركز الرئيسي"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="تاريخ بدء العمل حسب العقد"
                      value={contractStartDate}
                      onChange={(e) => setContractStartDate(e.target.value)}
                      placeholder="YYYY/MM/DD"
                    />
                    <Input
                      label="تاريخ المباشرة الفعلي"
                      value={actualStartDate}
                      onChange={(e) => setActualStartDate(e.target.value)}
                      placeholder="YYYY/MM/DD"
                    />
                  </div>
                  <Input
                    label="اسم مسؤول الموارد البشرية"
                    value={hrManagerName}
                    onChange={(e) => setHrManagerName(e.target.value)}
                    placeholder="مسؤول الموارد البشرية"
                  />
                </div>
              )}

              {/* Disciplinary Action specific fields */}
              {selectedTemplateId === "disciplinary_action" && (
                <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="المسمى الوظيفي"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="الوظيفة..."
                    />
                    <Input
                      label="الإدارة / القسم"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="الإدارة..."
                    />
                  </div>
                  <Input
                    label="المخالفة المرتكبة"
                    value={violation}
                    onChange={(e) => setViolation(e.target.value)}
                    placeholder="أدخل نص المخالفة..."
                  />
                  <div>
                    <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                      الأسباب (المبررات إن وجدت)
                    </label>
                    <textarea
                      value={violationReasons}
                      onChange={(e) => setViolationReasons(e.target.value)}
                      placeholder="أدخل الأسباب أو المبررات..."
                      className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none focus:border-[#1167c9] min-h-[60px]"
                    />
                  </div>
                  <Input
                    label="الإجراء الجزائي المتخذ"
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    placeholder="خصم أجر يوم / لفت نظر..."
                  />
                  <Input
                    label="رأي المدير المباشر"
                    value={directManagerOpinion}
                    onChange={(e) => setDirectManagerOpinion(e.target.value)}
                    placeholder="رأي المدير المباشر..."
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="مسؤول الموارد البشرية"
                      value={hrManagerName}
                      onChange={(e) => setHrManagerName(e.target.value)}
                    />
                    <Input
                      label="المدير العام"
                      value={generalManagerName}
                      onChange={(e) => setGeneralManagerName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Annual Entitlements Receipt specific fields */}
              {selectedTemplateId === "annual_entitlements_receipt" && (
                <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                  <Input
                    label="المسمى الوظيفي"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="سائق مندوب توصيل"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="عن الفترة من تاريخ"
                      value={periodFrom}
                      onChange={(e) => setPeriodFrom(e.target.value)}
                      placeholder="YYYY/MM/DD"
                    />
                    <Input
                      label="إلى تاريخ"
                      value={periodTo}
                      onChange={(e) => setPeriodTo(e.target.value)}
                      placeholder="YYYY/MM/DD"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="مسؤول الموارد البشرية"
                      value={hrManagerName}
                      onChange={(e) => setHrManagerName(e.target.value)}
                    />
                    <Input
                      label="المدير العام"
                      value={generalManagerName}
                      onChange={(e) => setGeneralManagerName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Absence Warning specific fields */}
              {selectedTemplateId === "absence_warning" && (
                <div className="space-y-4 pt-2 border-t border-[var(--border)]">
                  <div>
                    <label className="block text-xs font-bold text-[var(--muted)] mb-2">
                      لغة النموذج (Template Language)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAbsenceLanguage("ar")}
                        className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${absenceLanguage === "ar"
                            ? "bg-[#1167c9] text-white border-[#1167c9] shadow-sm"
                            : "border-[var(--border)] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                      >
                        🇸🇦 بالعربية فقط
                      </button>
                      <button
                        type="button"
                        onClick={() => setAbsenceLanguage("en")}
                        className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${absenceLanguage === "en"
                            ? "bg-[#1167c9] text-white border-[#1167c9] shadow-sm"
                            : "border-[var(--border)] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                      >
                        🇬🇧 English Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setAbsenceLanguage("both")}
                        className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${absenceLanguage === "both"
                            ? "bg-[#1167c9] text-white border-[#1167c9] shadow-sm"
                            : "border-[var(--border)] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                      >
                        🌐 اللغتان معاً
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="الإنذار رقم (Notice No.)"
                      value={warningNumber}
                      onChange={(e) => setWarningNumber(e.target.value)}
                      placeholder="1"
                    />
                    <div>
                      <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                        درجة الإنذار
                      </label>
                      <select
                        value={warningDegree}
                        onChange={(e) => setWarningDegree(e.target.value as "first" | "second" | "final")}
                        className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-bold text-[var(--foreground)] outline-none focus:border-[#1167c9]"
                      >
                        <option value="first">الإنذار الأول (First Warning)</option>
                        <option value="second">الإنذار الثاني (Second Warning)</option>
                        <option value="final">الإنذار النهائي (Final Warning)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                        يوم بدء الانقطاع
                      </label>
                      <select
                        value={absenceStartDay}
                        onChange={(e) => setAbsenceStartDay(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-bold text-[var(--foreground)] outline-none focus:border-[#1167c9]"
                      >
                        <option value="السبت">السبت (Saturday)</option>
                        <option value="الأحد">الأحد (Sunday)</option>
                        <option value="الاثنين">الاثنين (Monday)</option>
                        <option value="الثلاثاء">الثلاثاء (Tuesday)</option>
                        <option value="الأربعاء">الأربعاء (Wednesday)</option>
                        <option value="الخميس">الخميس (Thursday)</option>
                        <option value="الجمعة">الجمعة (Friday)</option>
                      </select>
                    </div>
                    <Input
                      label="من تاريخ (Start Date)"
                      value={absenceStartDate}
                      onChange={(e) => setAbsenceStartDate(e.target.value)}
                      placeholder="YYYY/MM/DD"
                    />
                    <Input
                      label="وحتى تاريخ (End Date)"
                      value={absenceEndDate}
                      onChange={(e) => setAbsenceEndDate(e.target.value)}
                      placeholder="YYYY/MM/DD"
                    />
                  </div>

                  <Input
                    label="المدير التنفيذي (Executive Director)"
                    value={executiveDirector}
                    onChange={(e) => setExecutiveDirector(e.target.value)}
                    placeholder="المدير التنفيذي"
                  />
                </div>
              )}

              {/* SIM Handover specific fields */}
              {selectedTemplateId === "sim_handover_receipt" && (
                <div className="space-y-4 pt-2 border-t border-[var(--border)]">
                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-black text-blue-700 dark:text-blue-400">
                      <span>📱</span>
                      <span>بيانات شريحة الجوال المستلمة (مستقلة عن بيانات الموظف)</span>
                    </div>
                    <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                      يتم إدخال رقم الشريحة واسم المشغل للشريحة المسلّمة للموظف كعهدة عمل بشكل منفصل ومستقل تماماً عن رقم جواله الشخصي.
                    </p>
                  </div>

                  {/* اسم المشغل (Carrier) */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--muted)] mb-1.5">
                      اسم المشغل (شبكة الاتصالات)
                    </label>
                    <div className="grid grid-cols-5 gap-1.5 mb-2">
                      {["STC", "موبايلي", "زين", "سلام", "أخرى"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSimCarrier(c)}
                          className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center ${
                            simCarrier === c
                              ? "bg-[#1167c9] text-white border-[#1167c9] shadow-xs"
                              : "border-[var(--border)] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    {simCarrier === "أخرى" && (
                      <Input
                        label="اكتب اسم المشغل"
                        value={simCarrierCustom}
                        onChange={(e) => setSimCarrierCustom(e.target.value)}
                        placeholder="مثال: سلام، جوي، ريد بول..."
                      />
                    )}
                  </div>

                  {/* رقم شريحة الجوال (منفصل وحده) */}
                  <Input
                    label="رقم شريحة الجوال للعمل (SIM Mobile Number)"
                    value={simPhoneNumber}
                    onChange={(e) => setSimPhoneNumber(e.target.value)}
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                    className="text-left font-mono font-bold"
                  />

                  {/* الرقم التسلسلي للشريحة ICCID */}
                  <Input
                    label="الرقم التسلسلي للشريحة (ICCID / Serial No.)"
                    value={simIccid}
                    onChange={(e) => setSimIccid(e.target.value)}
                    placeholder="89966..."
                    dir="ltr"
                    className="text-left font-mono"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="رقم النموذج (Ref No.)"
                      value={simFormNo}
                      onChange={(e) => setSimFormNo(e.target.value)}
                      placeholder="SIM-2026/001"
                      dir="ltr"
                    />
                    <Input
                      label="الرقم الوظيفي للمستلم"
                      value={simEmployeeCode}
                      onChange={(e) => setSimEmployeeCode(e.target.value)}
                      placeholder="EMP-102"
                      dir="ltr"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="المسمى الوظيفي"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="سائق مندوب توصيل"
                    />
                    <Input
                      label="مسؤول التسليم (الموارد البشرية)"
                      value={hrManagerName}
                      onChange={(e) => setHrManagerName(e.target.value)}
                      placeholder="مسؤول الموارد البشرية"
                    />
                  </div>
                </div>
              )}

              {/* 04 - Full Custody & Fleet Policy Controls */}
              {selectedTemplateId === "full_custody_form" && (
                <div className="space-y-4 pt-3 border-t border-[var(--border)]">
                  {/* Model Selection Checkboxes */}
                  <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-950 dark:text-blue-100 flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-[#1167c9]" />
                        اختيار النماذج المطلوب طباعتها (من النماذج الثلاثة):
                      </span>
                      <span className="text-[10.5px] font-bold text-blue-800 dark:text-blue-300">
                        {Object.values(fcModels).filter(Boolean).length} محددة
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2.5 p-2 bg-white dark:bg-[var(--surface)] border border-[var(--border)] rounded-lg cursor-pointer hover:border-[#1167c9] transition-colors">
                        <input
                          type="checkbox"
                          checked={fcModels.handover}
                          onChange={(e) => setFcModels({ ...fcModels, handover: e.target.checked })}
                          className="w-4 h-4 rounded text-[#1167c9] focus:ring-[#1167c9]"
                        />
                        <div className="flex-1">
                          <span className="text-xs font-black block">1. نموذج تسليم مركبة وعهدة للمندوب (Handover)</span>
                          <span className="text-[10px] text-[var(--muted)]">محضر استلام العهدة، فحص المركبة، المرفقات، والإقرار والتعهد</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-2 bg-white dark:bg-[var(--surface)] border border-[var(--border)] rounded-lg cursor-pointer hover:border-[#1167c9] transition-colors">
                        <input
                          type="checkbox"
                          checked={fcModels.returnCustody}
                          onChange={(e) => setFcModels({ ...fcModels, returnCustody: e.target.checked })}
                          className="w-4 h-4 rounded text-[#1167c9] focus:ring-[#1167c9]"
                        />
                        <div className="flex-1">
                          <span className="text-xs font-black block">2. نموذج استرداد مركبة وعهدة من المندوب (Return)</span>
                          <span className="text-[10px] text-[var(--muted)]">محضر استرجاع العهدة، النواقص، فحص الاسترداد، وإقرار المنشأة</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 p-2 bg-white dark:bg-[var(--surface)] border border-[var(--border)] rounded-lg cursor-pointer hover:border-[#1167c9] transition-colors">
                        <input
                          type="checkbox"
                          checked={fcModels.fleetPolicy}
                          onChange={(e) => setFcModels({ ...fcModels, fleetPolicy: e.target.checked })}
                          className="w-4 h-4 rounded text-[#1167c9] focus:ring-[#1167c9]"
                        />
                        <div className="flex-1">
                          <span className="text-xs font-black block">3. بنود سياسة قسم الأسطول (Fleet Policy)</span>
                          <span className="text-[10px] text-[var(--muted)]">الـ 14 بنداً الرسمية لسياسة الأسطول وإقرار الاطلاع والالتزام</span>
                        </div>
                      </label>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setFcModels({ handover: true, returnCustody: false, fleetPolicy: true })}
                        className="text-[10.5px] px-2 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold transition-colors"
                      >
                        تسليم + سياسة الأسطول
                      </button>
                      <button
                        type="button"
                        onClick={() => setFcModels({ handover: false, returnCustody: true, fleetPolicy: true })}
                        className="text-[10.5px] px-2 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold transition-colors"
                      >
                        استرداد + سياسة الأسطول
                      </button>
                      <button
                        type="button"
                        onClick={() => setFcModels({ handover: true, returnCustody: true, fleetPolicy: true })}
                        className="text-[10.5px] px-2 py-1 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold transition-colors"
                      >
                        النماذج الثلاثة كاملة
                      </button>
                      <button
                        type="button"
                        onClick={() => setFcModels({ handover: true, returnCustody: false, fleetPolicy: false })}
                        className="text-[10.5px] px-2 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition-colors"
                      >
                        تسليم فقط
                      </button>
                      <button
                        type="button"
                        onClick={() => setFcModels({ handover: false, returnCustody: false, fleetPolicy: true })}
                        className="text-[10.5px] px-2 py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition-colors"
                      >
                        سياسة الأسطول فقط
                      </button>
                    </div>
                  </div>

                  {/* Language Selection: Arabic / English / Both */}
                  <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-2">
                    <label className="block text-xs font-black text-[var(--foreground)]">
                      لغة النموذج (Language):
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFcLanguage("ar")}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                          fcLanguage === "ar"
                            ? "bg-[#1167c9] text-white border-[#1167c9] shadow-xs"
                            : "bg-white dark:bg-slate-800 text-[var(--foreground)] border-[var(--border)] hover:bg-slate-50"
                        }`}
                      >
                        عربي فقط
                      </button>
                      <button
                        type="button"
                        onClick={() => setFcLanguage("en")}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                          fcLanguage === "en"
                            ? "bg-[#1167c9] text-white border-[#1167c9] shadow-xs"
                            : "bg-white dark:bg-slate-800 text-[var(--foreground)] border-[var(--border)] hover:bg-slate-50"
                        }`}
                      >
                        English Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setFcLanguage("both")}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                          fcLanguage === "both"
                            ? "bg-[#1167c9] text-white border-[#1167c9] shadow-xs"
                            : "bg-white dark:bg-slate-800 text-[var(--foreground)] border-[var(--border)] hover:bg-slate-50"
                        }`}
                      >
                        ثنائي اللغة (Both)
                      </button>
                    </div>
                  </div>

                  {/* Vehicle Information & Selection */}
                  <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black flex items-center gap-1.5 text-[var(--foreground)]">
                        <Car size={15} className="text-[#1167c9]" />
                        بيانات المركبة التابعة للعهدة:
                      </span>
                    </div>

                    {/* Quick Select from Fleet Vehicles */}
                    {fleetVehicles.length > 0 && (
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
                          اختيار سريع لمركبة من أسطول المنشأة (اختياري لتعبئة البيانات تلقائياً):
                        </label>
                        <SearchableSelect
                          options={vehicleOptions}
                          value={selectedVehicleId}
                          onChange={(val) => {
                            setSelectedVehicleId(val);
                            const v = fleetVehicles.find((x) => x.id === val);
                            if (v) {
                              if (v.manufacturer || v.model) {
                                setFcMakeModel(`${v.manufacturer || ""} ${v.model || ""}`.trim());
                              }
                              if (v.plateNumberAr || v.plateNumberEn) {
                                setFcPlateNumber(v.plateNumberAr || v.plateNumberEn || "");
                              }
                              if (v.assetNumber) {
                                setFcSerialNumber(v.assetNumber);
                              }
                            }
                          }}
                          placeholder="ابحث برقم اللوحة أو الموديل أو رقم الأصل..."
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="نوع المركبة"
                        value={fcVehicleType}
                        onChange={(e) => setFcVehicleType(e.target.value)}
                        placeholder="سيارة / دراجة نارية"
                      />
                      <Input
                        label="الماركة والموديل"
                        value={fcMakeModel}
                        onChange={(e) => setFcMakeModel(e.target.value)}
                        placeholder="تويوتا يارس 2024"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="رقم اللوحة"
                        value={fcPlateNumber}
                        onChange={(e) => setFcPlateNumber(e.target.value)}
                        placeholder="أ ب ج 1234"
                      />
                      <Input
                        label="اللون"
                        value={fcColor}
                        onChange={(e) => setFcColor(e.target.value)}
                        placeholder="أبيض"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="العداد (كم)"
                        value={fcOdometer}
                        onChange={(e) => setFcOdometer(e.target.value)}
                        placeholder="45,200"
                        dir="ltr"
                      />
                      <Input
                        label="مستوى الوقود"
                        value={fcFuelLevel}
                        onChange={(e) => setFcFuelLevel(e.target.value)}
                        placeholder="ممتلئ / نصف / ربع"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="رقم الهيكل (VIN)"
                        value={fcChassisNumber}
                        onChange={(e) => setFcChassisNumber(e.target.value)}
                        placeholder="JT1234567890ABCD"
                        dir="ltr"
                      />
                      <Input
                        label="الرقم التسلسلي"
                        value={fcSerialNumber}
                        onChange={(e) => setFcSerialNumber(e.target.value)}
                        placeholder="SN-987654"
                        dir="ltr"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="عدد المفاتيح"
                        value={fcKeysCount}
                        onChange={(e) => setFcKeysCount(e.target.value)}
                        placeholder="2"
                        dir="ltr"
                      />
                      <Input
                        label="رخصة السير (الاستمارة)"
                        value={fcRegistrationStatus}
                        onChange={(e) => setFcRegistrationStatus(e.target.value)}
                        placeholder="سارية ومجددة"
                      />
                    </div>
                  </div>

                  {/* Handover Custody Items Checklist */}
                  {fcModels.handover && (
                    <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[var(--foreground)]">
                          أصناف العهدة المسلّمة (حدد ما يستلمه المندوب فعلياً):
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setFcHandoverItems((prev) => prev.map((i) => ({ ...i, selected: true })))}
                            className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold"
                          >
                            تحديد الكل
                          </button>
                          <button
                            type="button"
                            onClick={() => setFcHandoverItems((prev) => prev.map((i) => ({ ...i, selected: false })))}
                            className="text-[10px] px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold"
                          >
                            إلغاء الكل
                          </button>
                        </div>
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-1 pr-1 text-xs">
                        {fcHandoverItems.map((item) => (
                          <label
                            key={item.id}
                            className={`flex items-center justify-between p-1.5 rounded-lg border cursor-pointer transition-colors ${
                              item.selected
                                ? "bg-blue-50/60 dark:bg-blue-950/20 border-[#1167c9]"
                                : "bg-white dark:bg-slate-800/40 border-[var(--border)] opacity-60"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() =>
                                  setFcHandoverItems((prev) =>
                                    prev.map((i) => (i.id === item.id ? { ...i, selected: !i.selected } : i))
                                  )
                                }
                                className="w-4 h-4 rounded text-[#1167c9] focus:ring-[#1167c9]"
                              />
                              <span className="font-bold text-gray-900 dark:text-gray-100">
                                {item.nameAr} <span className="text-[10px] text-gray-500 font-normal dir-ltr">({item.nameEn})</span>
                              </span>
                            </div>
                            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                              {item.unitPrice} ريال
                            </span>
                          </label>
                        ))}
                      </div>

                      <Input
                        label="ملاحظات العهدة وحالتها"
                        value={fcHandoverCustodyNotes}
                        onChange={(e) => setFcHandoverCustodyNotes(e.target.value)}
                        placeholder="أي ملاحظات عامة حول العهدة المسلّمة..."
                      />
                    </div>
                  )}

                  {/* Return Custody Items Checklist */}
                  {fcModels.returnCustody && (
                    <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[var(--foreground)]">
                          أصناف العهدة المستردة ونواقصها:
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setFcReturnItems((prev) => prev.map((i) => ({ ...i, selected: true })))}
                            className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold"
                          >
                            تحديد الكل
                          </button>
                          <button
                            type="button"
                            onClick={() => setFcReturnItems((prev) => prev.map((i) => ({ ...i, selected: false })))}
                            className="text-[10px] px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold"
                          >
                            إلغاء الكل
                          </button>
                        </div>
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
                        {fcReturnItems.map((item) => (
                          <div
                            key={item.id}
                            className={`p-2 rounded-lg border space-y-1.5 ${
                              item.selected
                                ? "bg-blue-50/60 dark:bg-blue-950/20 border-[#1167c9]"
                                : "bg-white dark:bg-slate-800/40 border-[var(--border)] opacity-60"
                            }`}
                          >
                            <label className="flex items-center justify-between cursor-pointer">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() =>
                                    setFcReturnItems((prev) =>
                                      prev.map((i) => (i.id === item.id ? { ...i, selected: !i.selected } : i))
                                    )
                                  }
                                  className="w-4 h-4 rounded text-[#1167c9] focus:ring-[#1167c9]"
                                />
                                <span className="font-bold text-gray-900 dark:text-gray-100">
                                  {item.nameAr}
                                </span>
                              </div>
                              <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                                {item.unitPrice} ريال
                              </span>
                            </label>

                            {item.selected && (
                              <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-gray-200 dark:border-gray-700 text-[11px]">
                                <div>
                                  <span className="text-gray-500 block text-[10px]">الكمية الأصلية</span>
                                  <input
                                    type="text"
                                    value={item.originalQty}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFcReturnItems((prev) =>
                                        prev.map((i) => (i.id === item.id ? { ...i, originalQty: val } : i))
                                      );
                                    }}
                                    className="w-full p-1 border rounded text-center text-xs"
                                  />
                                </div>
                                <div>
                                  <span className="text-emerald-600 font-bold block text-[10px]">المعاد</span>
                                  <input
                                    type="text"
                                    value={item.returnedQty}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFcReturnItems((prev) =>
                                        prev.map((i) => {
                                          if (i.id !== item.id) return i;
                                          const orig = Number(i.originalQty) || 0;
                                          const ret = Number(val) || 0;
                                          return { ...i, returnedQty: val, missingQty: Math.max(0, orig - ret) };
                                        })
                                      );
                                    }}
                                    className="w-full p-1 border rounded text-center text-xs font-bold text-emerald-700"
                                  />
                                </div>
                                <div>
                                  <span className="text-red-600 font-bold block text-[10px]">الناقص</span>
                                  <input
                                    type="text"
                                    value={item.missingQty}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFcReturnItems((prev) =>
                                        prev.map((i) => (i.id === item.id ? { ...i, missingQty: val } : i))
                                      );
                                    }}
                                    className="w-full p-1 border rounded text-center text-xs font-bold text-red-700"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <Input
                        label="ملاحظات الاسترداد"
                        value={fcReturnCustodyNotes}
                        onChange={(e) => setFcReturnCustodyNotes(e.target.value)}
                        placeholder="أي ملاحظات حول العهدة المستردة..."
                      />
                    </div>
                  )}

                  {/* Fleet Policy 14 Terms Checklist */}
                  {fcModels.fleetPolicy && (
                    <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[var(--foreground)]">
                          بنود سياسة قسم الأسطول (14 بنداً):
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setFcPolicyTerms((prev) => prev.map((t) => ({ ...t, selected: true })))}
                            className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold"
                          >
                            تحديد الكل
                          </button>
                          <button
                            type="button"
                            onClick={() => setFcPolicyTerms((prev) => prev.map((t) => ({ ...t, selected: false })))}
                            className="text-[10px] px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold"
                          >
                            إلغاء الكل
                          </button>
                        </div>
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
                        {fcPolicyTerms.map((term, index) => (
                          <label
                            key={term.id}
                            className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                              term.selected
                                ? "bg-blue-50/60 dark:bg-blue-950/20 border-[#1167c9]"
                                : "bg-white dark:bg-slate-800/40 border-[var(--border)] opacity-60"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={term.selected}
                              onChange={() =>
                                setFcPolicyTerms((prev) =>
                                  prev.map((t) => (t.id === term.id ? { ...t, selected: !t.selected } : t))
                                )
                              }
                              className="w-4 h-4 mt-0.5 rounded text-[#1167c9] focus:ring-[#1167c9]"
                            />
                            <div className="flex-1 leading-snug">
                              <span className="font-black text-black dark:text-white ml-1">({index + 1})</span>
                              <span className="font-semibold text-gray-800 dark:text-gray-200">{term.textAr}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Administrative & Record Details */}
                  <div className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl space-y-2.5">
                    <span className="text-xs font-black text-[var(--foreground)] block">
                      بيانات المحضر والإدارة والاعتماد:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="رقم المحضر (Record No)"
                        value={fcRecordNo}
                        onChange={(e) => setFcRecordNo(e.target.value)}
                        placeholder="REC-2026/001"
                        dir="ltr"
                      />
                      <Input
                        label="الوقت"
                        value={fcTime}
                        onChange={(e) => setFcTime(e.target.value)}
                        placeholder="10:00 ص"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="الفرع"
                        value={fcBranch}
                        onChange={(e) => setFcBranch(e.target.value)}
                        placeholder="الفرع الرئيسي - جدة"
                      />
                      <Input
                        label="مرجع التسليم السابق (للاسترداد)"
                        value={fcPrevDeliveryRef}
                        onChange={(e) => setFcPrevDeliveryRef(e.target.value)}
                        placeholder="REC-2026/HANDOVER-001"
                        dir="ltr"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="اسم ممثل الشركة المستلم/المسلّم"
                        value={fcCompanyRepName}
                        onChange={(e) => setFcCompanyRepName(e.target.value)}
                        placeholder="مسؤول قسم الأسطول والتشغيل"
                      />
                      <Input
                        label="صفة ممثل الشركة"
                        value={fcCompanyRepTitle}
                        onChange={(e) => setFcCompanyRepTitle(e.target.value)}
                        placeholder="مشرف الأسطول والعهد"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* City for templates requiring city */}
              {activeTemplate.requiresCity && selectedTemplateId !== "promissory_note" && selectedTemplateId !== "leave_request" && selectedTemplateId !== "clearance_form" && selectedTemplateId !== "resignation_form" && selectedTemplateId !== "final_settlement" && selectedTemplateId !== "hr_interview" && selectedTemplateId !== "operations_evaluation" && selectedTemplateId !== "work_commencement" && selectedTemplateId !== "disciplinary_action" && selectedTemplateId !== "annual_entitlements_receipt" && selectedTemplateId !== "absence_warning" && selectedTemplateId !== "sim_handover_receipt" && selectedTemplateId !== "custody_receipt" && selectedTemplateId !== "full_custody_form" && (
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
              {selectedTemplateId !== "cash_disbursement" && selectedTemplateId !== "promissory_note" && selectedTemplateId !== "leave_request" && selectedTemplateId !== "salary_certificate" && selectedTemplateId !== "clearance_form" && selectedTemplateId !== "resignation_form" && selectedTemplateId !== "final_settlement" && selectedTemplateId !== "hr_interview" && selectedTemplateId !== "operations_evaluation" && selectedTemplateId !== "work_commencement" && selectedTemplateId !== "disciplinary_action" && selectedTemplateId !== "annual_entitlements_receipt" && selectedTemplateId !== "absence_warning" && selectedTemplateId !== "sim_handover_receipt" && selectedTemplateId !== "custody_receipt" && selectedTemplateId !== "full_custody_form" && (
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
        <div className="lg:col-span-7 print:col-span-12 space-y-3 print:space-y-0 print:p-0 print:m-0">
          <div className="flex items-center justify-between px-4 py-2.5 rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] print:hidden">
            <span className="text-xs font-black flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#1167c9]" />
              معاينة الورقة الرسمية: <strong className="text-[#1167c9]">{activeTemplate.titleAr}</strong>
            </span>
            <Badge tone="blue">قياس A4</Badge>
          </div>

          <div className="p-4 md:p-6 rounded-b-2xl border border-[var(--border)] bg-slate-100 dark:bg-slate-900/60 shadow-inner print:p-0 print:m-0 print:border-none print:bg-white">
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
                  letterheadId: selectedLetterhead,
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
                  letterheadId: selectedLetterhead,
                }}
              />
            )}

            {selectedTemplateId === "leave_request" && (
              <LetterheadFrame letterheadId={selectedLetterhead} companyName={companyName} date={date}>
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
              </LetterheadFrame>
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
                  letterheadId: selectedLetterhead,
                }}
              />
            )}

            {selectedTemplateId === "clearance_form" && (
              <LetterheadFrame letterheadId={selectedLetterhead} companyName={companyName} date={date}>
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
              </LetterheadFrame>
            )}

            {selectedTemplateId === "resignation_form" && (
              <LetterheadFrame letterheadId={selectedLetterhead} companyName={companyName} date={date}>
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
              </LetterheadFrame>
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
                  letterheadId: selectedLetterhead,
                }}
              />
            )}

            {selectedTemplateId === "hr_interview" && (
              <InterviewFormView
                data={{
                  candidateName: riderName,
                  personalPhone: mobile,
                  iqamaNo,
                  relativePhoneInside,
                  phoneOutside,
                  profession: jobTitle,
                  birthDate,
                  transferCount,
                  transferCost,
                  riderCost,
                  iqamaExpiryDate,
                  iqamaRenewalCost,
                  licenseCost,
                  professionChangeCost,
                  totalCostOnRider,
                  totalExpenses,
                  vehicleType,
                  licenseStatus,
                  licenseType,
                  interviewDate: date,
                  date,
                  knowledgeAppsMaps,
                  previousExperience,
                  workUnderPressure,
                  immediateReadiness,
                  deliveryExperience,
                  operationsRating,
                  recommendationByExp,
                  operationsNotes,
                  interviewResult,
                  operationsManagerName,
                  pageView: interviewPageView,
                  companyName,
                  letterheadId: selectedLetterhead,
                }}
              />
            )}

            {selectedTemplateId === "operations_evaluation" && (
              <OperationsEvaluationView
                data={{
                  candidateName: riderName,
                  date,
                  knowledgeAppsMaps,
                  previousExperience,
                  workUnderPressure,
                  immediateReadiness,
                  deliveryExperience,
                  operationsRating,
                  recommendationByExp,
                  operationsNotes,
                  interviewResult,
                  operationsManagerName,
                  companyName,
                  letterheadId: selectedLetterhead,
                }}
              />
            )}

            {selectedTemplateId === "financial_advance" && (
              <LetterheadFrame letterheadId={selectedLetterhead} companyName={companyName} date={date}>
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
              </LetterheadFrame>
            )}

            {selectedTemplateId === "cash_custody_promissory" && (
              <LetterheadFrame letterheadId={selectedLetterhead} companyName={companyName} date={date}>
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
              </LetterheadFrame>
            )}

            {selectedTemplateId === "work_commencement" && (
              <LetterheadFrame letterheadId={selectedLetterhead} companyName={companyName} date={date}>
                <WorkCommencementView
                  data={{
                    companyName,
                    date,
                    employeeName: riderName,
                    nationality,
                    iqamaNo,
                    jobTitle,
                    department,
                    workplace,
                    contractStartDate,
                    actualStartDate,
                    hrManagerName,
                  }}
                />
              </LetterheadFrame>
            )}

            {selectedTemplateId === "disciplinary_action" && (
              <LetterheadFrame letterheadId={selectedLetterhead} companyName={companyName} date={date}>
                <DisciplinaryActionView
                  data={{
                    companyName,
                    date,
                    employeeName: riderName,
                    jobTitle,
                    iqamaNo,
                    department,
                    violation,
                    reasons: violationReasons,
                    actionTaken,
                    directManagerOpinion,
                    hrManagerName,
                    generalManagerName,
                  }}
                />
              </LetterheadFrame>
            )}

            {selectedTemplateId === "annual_entitlements_receipt" && (
              <LetterheadFrame letterheadId={selectedLetterhead} companyName={companyName} date={date}>
                <AnnualEntitlementsReceiptView
                  data={{
                    companyName,
                    date,
                    employeeName: riderName,
                    nationality,
                    iqamaNo,
                    jobTitle,
                    periodFrom,
                    periodTo,
                    amountReceived: amount,
                    amountInWords,
                    hrManagerName,
                    generalManagerName,
                  }}
                />
              </LetterheadFrame>
            )}

            {selectedTemplateId === "sim_handover_receipt" && (
              <SimHandoverReceiptView
                data={{
                  companyName,
                  date,
                  formNumber: simFormNo,
                  riderName,
                  iqamaNo,
                  jobTitle,
                  employeeCode: simEmployeeCode,
                  carrierName: simCarrier === "أخرى" ? (simCarrierCustom || "أخرى") : simCarrier,
                  phoneNumber: simPhoneNumber,
                  iccid: simIccid,
                  responsibleEmployeeName: hrManagerName,
                  letterheadId: selectedLetterhead,
                }}
              />
            )}

            {selectedTemplateId === "absence_warning" && (
              <LetterheadFrame letterheadId={selectedLetterhead} companyName={companyName} date={date}>
                <AbsenceWarningView
                  data={{
                    language: absenceLanguage,
                    companyName,
                    date,
                    warningNumber,
                    warningDegree,
                    employeeName: riderName,
                    iqamaNo,
                    startDate: absenceStartDate,
                    startDay: absenceStartDay,
                    endDate: absenceEndDate,
                    executiveDirector,
                    notes,
                  }}
                />
              </LetterheadFrame>
            )}

            {selectedTemplateId === "custody_receipt" && (
              <LetterheadFrame letterheadId={selectedLetterhead} companyName={companyName} date={date}>
                <CustodyReceiptView
                  data={{
                    riderName,
                    iqamaNo,
                    nationality,
                    jobTitle,
                    date,
                    companyName,
                  }}
                />
              </LetterheadFrame>
            )}

            {selectedTemplateId === "job_offer" && (
              <LetterheadFrame letterheadId={selectedLetterhead} companyName={companyName} date={date}>
                <JobOfferView
                  data={{
                    candidateName: riderName,
                    iqamaNo,
                    nationality,
                    jobTitle,
                    department,
                    city: issueCity,
                    totalSalary: amount,
                    salaryInWords: amountInWords,
                    date,
                    companyName,
                    hrManagerName,
                    generalManagerName,
                    notes,
                  }}
                />
              </LetterheadFrame>
            )}

            {selectedTemplateId === "full_custody_form" && (
              <FullCustodyFormView
                data={{
                  selectedModels: fcModels,
                  language: fcLanguage,
                  letterheadId: selectedLetterhead,
                  companyName,
                  recordNumber: fcRecordNo,
                  date,
                  time: fcTime,
                  branch: fcBranch,
                  prevDeliveryRef: fcPrevDeliveryRef,
                  riderName,
                  iqamaNo,
                  nationality,
                  mobile,
                  jobTitle,
                  riderCode: fcRiderCode || (selectedPersonId ? selectedPersonId.slice(0, 8) : ""),
                  vehicleType: fcVehicleType,
                  makeModel: fcMakeModel,
                  color: fcColor,
                  plateNumber: fcPlateNumber,
                  chassisNumber: fcChassisNumber,
                  serialNumber: fcSerialNumber,
                  odometer: fcOdometer,
                  fuelLevel: fcFuelLevel,
                  keysCount: fcKeysCount,
                  registrationStatus: fcRegistrationStatus,
                  handoverItems: fcHandoverItems,
                  handoverCustodyNotes: fcHandoverCustodyNotes,
                  handoverExteriorCondition: fcHandoverExteriorCondition,
                  handoverParts: fcHandoverParts,
                  handoverSpareTire: fcHandoverSpareTire,
                  handoverFaults: fcHandoverFaults,
                  handoverVisibleScratches: fcHandoverVisibleScratches,
                  handoverAttachments: fcHandoverAttachments,
                  returnItems: fcReturnItems,
                  returnCustodyNotes: fcReturnCustodyNotes,
                  returnExteriorCondition: fcReturnExteriorCondition,
                  returnParts: fcReturnParts,
                  returnSpareTire: fcReturnSpareTire,
                  returnFaults: fcReturnFaults,
                  returnVisibleScratches: fcReturnVisibleScratches,
                  returnAttachments: fcReturnAttachments,
                  policyTerms: fcPolicyTerms,
                  companyRepName: fcCompanyRepName,
                  companyRepTitle: fcCompanyRepTitle,
                  onToggleModel: (model) => setFcModels((prev) => ({ ...prev, [model]: !prev[model] })),
                  onToggleHandoverItem: (id) =>
                    setFcHandoverItems((prev) =>
                      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
                    ),
                  onToggleReturnItem: (id) =>
                    setFcReturnItems((prev) =>
                      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
                    ),
                  onTogglePolicyTerm: (id) =>
                    setFcPolicyTerms((prev) =>
                      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
                    ),
                  onToggleAttachment: (type, key) => {
                    if (type === "handover") {
                      setFcHandoverAttachments((prev: any) => ({ ...prev, [key]: !prev[key] }));
                    } else {
                      setFcReturnAttachments((prev: any) => ({ ...prev, [key]: !prev[key] }));
                    }
                  },
                  onToggleFault: (type, id) => {
                    if (type === "handover") {
                      setFcHandoverFaults((prev) =>
                        prev.map((f) => (f.id === id ? { ...f, checked: !f.checked } : f))
                      );
                    } else {
                      setFcReturnFaults((prev) =>
                        prev.map((f) => (f.id === id ? { ...f, checked: !f.checked } : f))
                      );
                    }
                  },
                  onSelectExteriorCondition: (type, val) => {
                    if (type === "handover") setFcHandoverExteriorCondition(val);
                    else setFcReturnExteriorCondition(val);
                  },
                  onSelectSpareTire: (type, val) => {
                    if (type === "handover") setFcHandoverSpareTire(val);
                    else setFcReturnSpareTire(val);
                  },
                }}
              />
            )}

            {selectedTemplateId !== "cash_disbursement" && selectedTemplateId !== "promissory_note" && selectedTemplateId !== "financial_advance" && selectedTemplateId !== "cash_custody_promissory" && selectedTemplateId !== "custody_receipt" && selectedTemplateId !== "leave_request" && selectedTemplateId !== "salary_certificate" && selectedTemplateId !== "clearance_form" && selectedTemplateId !== "resignation_form" && selectedTemplateId !== "final_settlement" && selectedTemplateId !== "hr_interview" && selectedTemplateId !== "operations_evaluation" && selectedTemplateId !== "work_commencement" && selectedTemplateId !== "disciplinary_action" && selectedTemplateId !== "annual_entitlements_receipt" && selectedTemplateId !== "sim_handover_receipt" && selectedTemplateId !== "absence_warning" && selectedTemplateId !== "job_offer" && selectedTemplateId !== "full_custody_form" && (
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
                  letterheadId: selectedLetterhead,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

