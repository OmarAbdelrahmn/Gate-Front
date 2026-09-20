import React from "react";
import {
  FileText,
  Layers,
  Database,
  User,
  Car,
  CreditCard,
  ShieldCheck,
  Briefcase,
  Calendar,
  Wrench,
  Building,
  FileCheck,
  FileSpreadsheet,
  HelpCircle,
  LucideIcon,
  Tag,
  Scale,
  Users,
  Phone,
  Fuel,
  AlertTriangle,
  AlertOctagon,
  Package,
  Clock,
  Coins,
  FileSignature,
  Home,
  ShieldAlert,
  Receipt,
  Droplets,
  ArrowLeftRight,
  Workflow,
  MapPin,
  Bell,
  Eye,
  Activity,
  Edit3,
} from "lucide-react";
import type { AuditEntry } from "./types";

/**
 * Determines whether an audit entry should be ignored / hidden from the audit log.
 * Excludes DatasetVersion and generic unmapped employee document records ("سجل وثيقة موظف" / "EmployeeDocument").
 */
export function shouldIgnoreAuditEntry(
  entry?: AuditEntry | { entityType?: string; record?: { displayLabel?: string } | null } | null,
  resolvedTitle?: string
): boolean {
  if (!entry) return true;
  if (entry.entityType === "DatasetVersion") return true;
  if (
    resolvedTitle === "سجل وثيقة موظف" ||
    resolvedTitle === "Employee Document Record" ||
    resolvedTitle === "سجل فترة الحالة التشغيلية" ||
    resolvedTitle === "Vehicle Status Period" ||
    entry.record?.displayLabel === "سجل وثيقة موظف" ||
    entry.record?.displayLabel === "Employee Document Record" ||
    entry.record?.displayLabel === "سجل فترة الحالة التشغيلية" ||
    entry.record?.displayLabel === "Vehicle Status Period"
  ) {
    return true;
  }
  return false;
}

export interface EntityTypeMeta {
  ar: string;
  en: string;
  icon: LucideIcon;
  badgeCls: string;
  descriptionAr: string;
  descriptionEn: string;
}

export const ENTITY_TYPE_CONFIG: Record<string, EntityTypeMeta> = {
  // --- Platform & Reference Data ---
  CompanyProfile: {
    ar: "ملف الشركة",
    en: "Company Profile",
    icon: Building,
    badgeCls: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
    descriptionAr: "بيانات ملف الشركة والمنشأة",
    descriptionEn: "Company profile and organizational settings",
  },
  GlobalCity: {
    ar: "مدينة عالمية",
    en: "Global City",
    icon: MapPin,
    badgeCls: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    descriptionAr: "دليل المدن الجغرافية",
    descriptionEn: "Global city catalog",
  },
  OperatingCity: {
    ar: "مدينة تشغيل",
    en: "Operating City",
    icon: MapPin,
    badgeCls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    descriptionAr: "مدينة تشغيل معتمدة في النظام",
    descriptionEn: "Approved operating city",
  },
  ClientPlatform: {
    ar: "منصة عميل",
    en: "Client Platform",
    icon: Building,
    badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    descriptionAr: "منصة أو جهة عميل مرتبطة",
    descriptionEn: "Client or delivery partner platform",
  },
  PermissionDefinition: {
    ar: "تعريف الصلاحية",
    en: "Permission Definition",
    icon: ShieldCheck,
    badgeCls: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
    descriptionAr: "تعريف صلاحية في دليل الصلاحيات",
    descriptionEn: "Permission catalog definition",
  },

  // --- Workforce, HR, Legal, Leave, and Compliance ---
  Employee: {
    ar: "موظف",
    en: "Employee",
    icon: User,
    badgeCls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    descriptionAr: "ملف وبيانات موظف في النظام",
    descriptionEn: "Employee profile and record",
  },
  PayrollEmployee: {
    ar: "موظف مسير رواتب",
    en: "Payroll Employee",
    icon: Coins,
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    descriptionAr: "سجل موظف في مسيرات الرواتب",
    descriptionEn: "Payroll employee record",
  },
  RiderProfile: {
    ar: "ملف سائق",
    en: "Rider Profile",
    icon: User,
    badgeCls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    descriptionAr: "بيانات وملف السائق التشغيلي",
    descriptionEn: "Operational rider profile",
  },
  RealRider: {
    ar: "سائق فعلي",
    en: "Real Rider",
    icon: User,
    badgeCls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    descriptionAr: "بيانات السائق الفعلي للمركبة",
    descriptionEn: "Actual rider record",
  },
  EmployeeWorkHistory: {
    ar: "سجل عمل موظف",
    en: "Employee Work History",
    icon: Briefcase,
    badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    descriptionAr: "التاريخ المهني والوظيفي للموظف",
    descriptionEn: "Employee employment and work history",
  },
  JobTitle: {
    ar: "مسمى وظيفي",
    en: "Job Title",
    icon: Briefcase,
    badgeCls: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
    descriptionAr: "تعريف مسمى وظيفي في الدليل",
    descriptionEn: "Job title definition",
  },
  Sponsor: {
    ar: "كفيل",
    en: "Sponsor",
    icon: Building,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "بيانات الكفيل / المنشأة الكافلة",
    descriptionEn: "Sponsor entity record",
  },
  ResidencyProfession: {
    ar: "مهنة إقامة",
    en: "Residency Profession",
    icon: FileCheck,
    badgeCls: "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700",
    descriptionAr: "المهنة المسجلة في رخصة الإقامة",
    descriptionEn: "Residency permit profession",
  },
  OperationalWorkType: {
    ar: "نوع عمل تشغيلي",
    en: "Operational Work Type",
    icon: Briefcase,
    badgeCls: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
    descriptionAr: "نوع العمل التشغيلي في الأسطول",
    descriptionEn: "Operational work type",
  },
  JobTitleOperationalWorkType: {
    ar: "ربط المسمى بنوع العمل",
    en: "Job Title Work Type",
    icon: Layers,
    badgeCls: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    descriptionAr: "مطابقة المسمى الوظيفي بنوع العمل التشغيلي",
    descriptionEn: "Job title to work type mapping",
  },
  DriverLicenseCategory: {
    ar: "فئة رخصة قيادة",
    en: "Driver License Category",
    icon: FileCheck,
    badgeCls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    descriptionAr: "فئة رخصة القيادة المعتمدة",
    descriptionEn: "Driver license classification",
  },
  EmployeeDriverLicense: {
    ar: "رخصة قيادة موظف",
    en: "Employee Driver License",
    icon: FileCheck,
    badgeCls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    descriptionAr: "رخصة القيادة التابعة للموظف",
    descriptionEn: "Employee driver license record",
  },
  DriverLicense: {
    ar: "رخصة قيادة",
    en: "Driver License",
    icon: FileCheck,
    badgeCls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    descriptionAr: "رخصة قيادة خاصة بموظف أو سائق",
    descriptionEn: "Driver license record",
  },
  RiderCard: {
    ar: "بطاقة سائق",
    en: "Rider Card",
    icon: CreditCard,
    badgeCls: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
    descriptionAr: "بطاقة تشغيل أو تصريح السائق",
    descriptionEn: "Rider operational permit/card",
  },
  RiderHealthCard: {
    ar: "شهادة صحية لسائق",
    en: "Rider Health Card",
    icon: ShieldCheck,
    badgeCls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    descriptionAr: "الشهادة الصحية أو الكشف الطبي للسائق",
    descriptionEn: "Rider health inspection certificate",
  },
  HealthCard: {
    ar: "شهادة صحية",
    en: "Health Card",
    icon: ShieldCheck,
    badgeCls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    descriptionAr: "شهادة صحية أو كشف طبي لسائق / موظف",
    descriptionEn: "Health card or medical exam record",
  },
  ResidencyPermit: {
    ar: "تصريح إقامة (إقامة)",
    en: "Residency Permit (Iqama)",
    icon: FileCheck,
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    descriptionAr: "سجل تصريح الإقامة للموظف في المملكة",
    descriptionEn: "Residency permit (Iqama) record",
  },
  EmployeePromissoryNote: {
    ar: "سند لأمر موظف",
    en: "Promissory Note",
    icon: FileSignature,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "سند لأمر موقع من الموظف",
    descriptionEn: "Employee signed promissory note",
  },
  HrFormTemplate: {
    ar: "نموذج شؤون موظفين",
    en: "HR Form Template",
    icon: FileText,
    badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    descriptionAr: "قالب نموذج إداري في الموارد البشرية",
    descriptionEn: "HR form template definition",
  },
  HrFormTemplateVersion: {
    ar: "نسخة نموذج إداري",
    en: "HR Form Template Version",
    icon: Layers,
    badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    descriptionAr: "إصدار أو نسخة قالب نموذج إداري",
    descriptionEn: "HR form template version",
  },
  InsuranceCompany: {
    ar: "شركة تأمين",
    en: "Insurance Company",
    icon: ShieldCheck,
    badgeCls: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
    descriptionAr: "شركة التأمين الطبي المعتمدة",
    descriptionEn: "Medical insurance company",
  },
  InsurancePlanLevel: {
    ar: "فئة تأمين طبي",
    en: "Insurance Plan Level",
    icon: ShieldCheck,
    badgeCls: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
    descriptionAr: "مستوى أو فئة وثيقة التأمين الطبي",
    descriptionEn: "Medical insurance plan category",
  },
  EmployeeMedicalInsurancePolicy: {
    ar: "تأمين طبي لموظف",
    en: "Medical Insurance Policy",
    icon: ShieldCheck,
    badgeCls: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
    descriptionAr: "وثيقة التأمين الطبي الخاصة بالموظف",
    descriptionEn: "Employee medical insurance record",
  },
  MedicalInsurance: {
    ar: "تأمين طبي",
    en: "Medical Insurance",
    icon: ShieldCheck,
    badgeCls: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
    descriptionAr: "وثيقة التأمين الطبي للموظف",
    descriptionEn: "Medical insurance policy record",
  },
  LeaveType: {
    ar: "نوع إجازة",
    en: "Leave Type",
    icon: Calendar,
    badgeCls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
    descriptionAr: "تعريف نوع الإجازة في النظام",
    descriptionEn: "Leave category definition",
  },
  LeaveRequest: {
    ar: "طلب إجازة",
    en: "Leave Request",
    icon: Calendar,
    badgeCls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
    descriptionAr: "طلب إجازة مقدم من موظف",
    descriptionEn: "Employee leave request",
  },
  LeaveApprovalWorkflow: {
    ar: "مسار اعتماد إجازة",
    en: "Leave Approval Workflow",
    icon: Workflow,
    badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    descriptionAr: "مسار وسلسلة الموافقات للإجازات",
    descriptionEn: "Leave approval workflow",
  },
  LeaveApprovalWorkflowStep: {
    ar: "خطوة اعتماد إجازة",
    en: "Leave Workflow Step",
    icon: Workflow,
    badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    descriptionAr: "مرحلة أو خطوة في مسار اعتماد الإجازة",
    descriptionEn: "Leave workflow stage/step",
  },
  LeaveApprovalDecision: {
    ar: "قرار اعتماد إجازة",
    en: "Leave Approval Decision",
    icon: FileCheck,
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    descriptionAr: "قرار بالموافقة أو الرفض على طلب إجازة",
    descriptionEn: "Leave approval decision record",
  },
  LeaveDateChangeRequest: {
    ar: "طلب تعديل موعد إجازة",
    en: "Leave Date Change Request",
    icon: Calendar,
    badgeCls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
    descriptionAr: "طلب تعديل تواريخ إجازة معتمدة",
    descriptionEn: "Leave schedule change request",
  },
  LeaveCancellationRequest: {
    ar: "طلب إلغاء إجازة",
    en: "Leave Cancellation Request",
    icon: AlertTriangle,
    badgeCls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    descriptionAr: "طلب إلغاء إجازة مسجلة",
    descriptionEn: "Leave cancellation request",
  },
  LeaveRequestDocument: {
    ar: "مستند طلب إجازة",
    en: "Leave Request Document",
    icon: FileText,
    badgeCls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
    descriptionAr: "مرفق أو تقرير طبي لطلب إجازة",
    descriptionEn: "Document attached to leave request",
  },
  LeaveRequestDocumentVersion: {
    ar: "نسخة مستند إجازة",
    en: "Leave Document Version",
    icon: Layers,
    badgeCls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
    descriptionAr: "إصدار أو نسخة مرفق طلب إجازة",
    descriptionEn: "Version of leave attachment",
  },
  EmployeeAbsenceComplianceCase: {
    ar: "حالة امتثال غياب",
    en: "Absence Compliance Case",
    icon: ShieldAlert,
    badgeCls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    descriptionAr: "ملف تدقيق وامتثال لغياب الموظف",
    descriptionEn: "Employee absence compliance file",
  },
  EmployeeAbsenceComplianceCaseEvent: {
    ar: "حدث امتثال غياب",
    en: "Absence Case Event",
    icon: Activity,
    badgeCls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    descriptionAr: "إجراء أو تحديث في ملف امتثال الغياب",
    descriptionEn: "Absence compliance log event",
  },
  EmployeeStatusChangeRequest: {
    ar: "طلب تغيير حالة موظف",
    en: "Status Change Request",
    icon: User,
    badgeCls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    descriptionAr: "طلب تعديل الحالة الوظيفية للموظف",
    descriptionEn: "Employee status update request",
  },
  HrLegalCase: {
    ar: "قضية قانونية",
    en: "Legal Case",
    icon: Scale,
    badgeCls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    descriptionAr: "ملف قضية قانونية أو عمالية",
    descriptionEn: "HR legal or labor dispute case",
  },
  LegalCase: {
    ar: "قضية قانونية",
    en: "Legal Case",
    icon: Scale,
    badgeCls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    descriptionAr: "ملف قضية قانونية أو جلسة قضائية",
    descriptionEn: "Legal case or hearing record",
  },
  HrLegalCaseHearing: {
    ar: "جلسة قضائية",
    en: "Legal Case Hearing",
    icon: Scale,
    badgeCls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    descriptionAr: "جلسة محكمة أو موعد قضائي",
    descriptionEn: "Court hearing or legal session",
  },
  HrLegalCaseHearingFile: {
    ar: "مستند جلسة قضائية",
    en: "Hearing File",
    icon: FileText,
    badgeCls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    descriptionAr: "مستند أو مذكرة مقدمة في جلسة قضائية",
    descriptionEn: "Legal hearing attachment or file",
  },
  HrLegalCaseHistory: {
    ar: "سجل القضية القانونية",
    en: "Legal Case History",
    icon: Clock,
    badgeCls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    descriptionAr: "التسلسل الزمني لأحداث القضية",
    descriptionEn: "Legal case event history",
  },

  // --- Housing ---
  Housing: {
    ar: "سكن",
    en: "Housing",
    icon: Home,
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    descriptionAr: "مبنى أو وحدة سكنية للموظفين",
    descriptionEn: "Employee housing facility",
  },
  HousingRoom: {
    ar: "غرفة سكن",
    en: "Housing Room",
    icon: Home,
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    descriptionAr: "غرفة ضمن وحدة سكنية",
    descriptionEn: "Room in housing facility",
  },
  HousingSupervisorPeriod: {
    ar: "فترة إشراف سكن",
    en: "Housing Supervisor Period",
    icon: User,
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    descriptionAr: "فترة تولي مشرف مسؤولية السكن",
    descriptionEn: "Housing supervisor assignment period",
  },
  HousingResidencePeriod: {
    ar: "فترة إقامة سكن",
    en: "Housing Residence Period",
    icon: Clock,
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    descriptionAr: "فترة إقامة وتسكين موظف",
    descriptionEn: "Employee residence stay period",
  },

  // --- Client Platforms, Contracts, and Rider Accounts ---
  ClientContract: {
    ar: "عقد عميل",
    en: "Client Contract",
    icon: FileSignature,
    badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    descriptionAr: "عقد تشغيل مع منصة أو عميل",
    descriptionEn: "Client operational contract",
  },
  PlatformRiderAccount: {
    ar: "حساب منصة لسائق",
    en: "Platform Rider Account",
    icon: User,
    badgeCls: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
    descriptionAr: "حساب السائق لدى منصة التوصيل",
    descriptionEn: "Rider platform account",
  },
  PlatformAccountCredentialVersion: {
    ar: "بيانات اعتماد منصة",
    en: "Credential Version",
    icon: Layers,
    badgeCls: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
    descriptionAr: "إصدار بيانات اعتماد حساب المنصة",
    descriptionEn: "Platform account credential version",
  },
  RiderClientAssignment: {
    ar: "تعيين سائق لعميل",
    en: "Rider Client Assignment",
    icon: ArrowLeftRight,
    badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    descriptionAr: "تعيين أو نقل سائق على منصة عميل",
    descriptionEn: "Rider assignment to client platform",
  },
  RiderAssignmentEvent: {
    ar: "حدث تعيين سائق",
    en: "Rider Assignment Event",
    icon: Activity,
    badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    descriptionAr: "إجراء أو تحديث في تعيين السائق",
    descriptionEn: "Rider assignment log event",
  },
  PlatformAccountRegistration: {
    ar: "تسجيل حساب منصة",
    en: "Platform Account Registration",
    icon: FileCheck,
    badgeCls: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
    descriptionAr: "طلب تسجيل حساب على منصة تشغيل",
    descriptionEn: "Platform account registration request",
  },

  // --- Documents and Tags ---
  DocumentType: {
    ar: "نوع وثيقة",
    en: "Document Type",
    icon: Tag,
    badgeCls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    descriptionAr: "تعريف نوع وثيقة في دليل الوثائق",
    descriptionEn: "Document type definition in catalog",
  },
  DocumentRequirement: {
    ar: "متطلب وثيقة",
    en: "Document Requirement",
    icon: FileSpreadsheet,
    badgeCls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    descriptionAr: "شروط ومتطلبات الوثائق للموظفين والسائقين",
    descriptionEn: "Document requirement rule in catalog",
  },
  EmployeeDocument: {
    ar: "وثيقة موظف",
    en: "Employee Document",
    icon: FileText,
    badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    descriptionAr: "وثيقة أو مستند ثبوتي تابع للموظف (مثل إقامة، رخصة، عقد، جواز)",
    descriptionEn: "Employee document record (e.g. Iqama, license, contract, passport)",
  },
  EmployeeDocumentVersion: {
    ar: "نسخة وثيقة موظف",
    en: "Document Version",
    icon: Layers,
    badgeCls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
    descriptionAr: "ملف مرفوع أو إصدار جديد لوثيقة موظف",
    descriptionEn: "Uploaded file attachment or new version for an employee document",
  },
  Tag: {
    ar: "وسم",
    en: "Tag",
    icon: Tag,
    badgeCls: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    descriptionAr: "وسم أو تصنيف مخصص",
    descriptionEn: "Custom tag",
  },
  EmployeeTag: {
    ar: "وسم موظف",
    en: "Employee Tag",
    icon: Tag,
    badgeCls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    descriptionAr: "وسم مرتبط بملف موظف",
    descriptionEn: "Tag attached to employee",
  },
  HousingTag: {
    ar: "وسم سكن",
    en: "Housing Tag",
    icon: Tag,
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    descriptionAr: "وسم مرتبط بوحدة سكنية",
    descriptionEn: "Tag attached to housing",
  },
  ClientContractTag: {
    ar: "وسم عقد عميل",
    en: "Contract Tag",
    icon: Tag,
    badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    descriptionAr: "وسم مرتبط بعقد عميل",
    descriptionEn: "Tag attached to client contract",
  },
  PlatformRiderAccountTag: {
    ar: "وسم حساب منصة",
    en: "Platform Account Tag",
    icon: Tag,
    badgeCls: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
    descriptionAr: "وسم مرتبط بحساب منصة لسائق",
    descriptionEn: "Tag attached to platform rider account",
  },

  // --- System Operations ---
  Notification: {
    ar: "إشعار نظام",
    en: "Notification",
    icon: Bell,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "إشعار أو تنبيه مرسل في النظام",
    descriptionEn: "System notification record",
  },
  ExportJob: {
    ar: "مهمة تصدير",
    en: "Export Job",
    icon: FileSpreadsheet,
    badgeCls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    descriptionAr: "مهمة تصدير بيانات أو تقارير",
    descriptionEn: "Data export background task",
  },
  SavedView: {
    ar: "طريقة عرض محفوظة",
    en: "Saved View",
    icon: Eye,
    badgeCls: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    descriptionAr: "طريقة عرض مخصصة ومحفوظة للمستخدم",
    descriptionEn: "Saved custom filter view",
  },

  // --- Fleet, Vehicle Records, Compliance, and Incidents ---
  VehicleManufacturer: {
    ar: "صانع مركبة",
    en: "Vehicle Manufacturer",
    icon: Building,
    badgeCls: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    descriptionAr: "الشركة المصنعة للمركبات",
    descriptionEn: "Vehicle make/manufacturer",
  },
  VehicleModel: {
    ar: "موديل مركبة",
    en: "Vehicle Model",
    icon: Car,
    badgeCls: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    descriptionAr: "طراز أو موديل المركبة",
    descriptionEn: "Vehicle model",
  },
  VehicleSupplier: {
    ar: "مورد مركبات",
    en: "Vehicle Supplier",
    icon: Building,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "مورد أو معرض توريد المركبات",
    descriptionEn: "Vehicle supplier/dealership",
  },
  Vehicle: {
    ar: "مركبة",
    en: "Vehicle",
    icon: Car,
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    descriptionAr: "مركبة أو سيارة مسجلة في الأسطول",
    descriptionEn: "Fleet vehicle record",
  },
  VehicleIdentityCorrection: {
    ar: "تصحيح بيانات مركبة",
    en: "Vehicle Identity Correction",
    icon: Edit3,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "تصحيح أو تعديل بيانات الهيكل واللوحة",
    descriptionEn: "Vehicle VIN/plate correction",
  },
  VehicleRegistrationTransition: {
    ar: "تحويل تسجيل مركبة",
    en: "Registration Transition",
    icon: ArrowLeftRight,
    badgeCls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    descriptionAr: "تحويل أو نقل ملكية تسجيل المركبة",
    descriptionEn: "Vehicle registration transfer",
  },
  VehicleRegistrationTransitionSnapshot: {
    ar: "لقطة تحويل التسجيل",
    en: "Transition Snapshot",
    icon: Layers,
    badgeCls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    descriptionAr: "لقطة بيانات تسجيل المركبة أثناء النقل",
    descriptionEn: "Snapshot during registration transfer",
  },
  VehicleOperationalStatusPeriod: {
    ar: "فترة الحالة التشغيلية",
    en: "Operational Status Period",
    icon: Clock,
    badgeCls: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
    descriptionAr: "فترة تشغيل أو إيقاف المركبة",
    descriptionEn: "Vehicle status period (active/inactive)",
  },
  VehicleOdometerReading: {
    ar: "قراءة عداد مسافات",
    en: "Odometer Reading",
    icon: Activity,
    badgeCls: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
    descriptionAr: "تسجيل قراءة عداد الكيلومترات للمركبة",
    descriptionEn: "Vehicle odometer km reading",
  },
  VehicleDailyDistance: {
    ar: "مسافة يومية لمركبة",
    en: "Daily Distance",
    icon: Activity,
    badgeCls: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
    descriptionAr: "المسافة المقطوعة اليومية للمركبة",
    descriptionEn: "Vehicle daily distance record",
  },
  VehicleDailyDistanceImport: {
    ar: "استيراد مسافات يومية",
    en: "Daily Distance Import",
    icon: FileSpreadsheet,
    badgeCls: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
    descriptionAr: "دفعة استيراد مسافات المركبات اليومية",
    descriptionEn: "Daily distance batch import",
  },
  RiderVehicleAssignment: {
    ar: "تعيين مركبة لسائق",
    en: "Rider Vehicle Assignment",
    icon: ArrowLeftRight,
    badgeCls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    descriptionAr: "تسليم أو تخصيص مركبة لسائق",
    descriptionEn: "Vehicle assignment to rider",
  },
  SponsorVehicleLeaseAgreement: {
    ar: "عقد إيجار مركبة كفيل",
    en: "Sponsor Lease Agreement",
    icon: FileSignature,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "عقد تأجير المركبة مع الكفيل",
    descriptionEn: "Sponsor vehicle lease agreement",
  },
  SponsorVehicleLeaseAgreementVehicle: {
    ar: "مركبة عقد إيجار",
    en: "Lease Agreement Vehicle",
    icon: Car,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "مركبة محددة ضمن عقد إيجار الكفيل",
    descriptionEn: "Vehicle under lease agreement",
  },
  VehiclePlatformAccountAssignment: {
    ar: "ربط مركبة بحساب منصة",
    en: "Vehicle Platform Assignment",
    icon: ArrowLeftRight,
    badgeCls: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
    descriptionAr: "تخصيص المركبة لحساب منصة محدد",
    descriptionEn: "Assigning vehicle to platform account",
  },
  VehiclePlatformAccountSwitch: {
    ar: "تحويل منصة مركبة",
    en: "Vehicle Platform Switch",
    icon: ArrowLeftRight,
    badgeCls: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
    descriptionAr: "نقل أو تحويل المركبة بين حسابات المنصات",
    descriptionEn: "Switching vehicle platform accounts",
  },
  RiderVehicleAssignmentEvent: {
    ar: "حدث تعيين مركبة",
    en: "Vehicle Assignment Event",
    icon: Activity,
    badgeCls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    descriptionAr: "إجراء أو سجل تعيين أو استرجاع المركبة",
    descriptionEn: "Vehicle assignment log event",
  },
  RiderVehicleAssignmentPromissoryFile: {
    ar: "سند تعيين مركبة",
    en: "Assignment Promissory File",
    icon: FileSignature,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "ملف سند الأمر لتسليم المركبة",
    descriptionEn: "Vehicle assignment promissory document",
  },
  FleetCommandReceipt: {
    ar: "إيصال أمر أسطول",
    en: "Fleet Command Receipt",
    icon: Receipt,
    badgeCls: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    descriptionAr: "إيصال تنفيذ أمر في إدارة الأسطول",
    descriptionEn: "Fleet management command receipt",
  },
  VehicleRegistration: {
    ar: "رخصة سير (استمارة)",
    en: "Vehicle Registration",
    icon: FileCheck,
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    descriptionAr: "رخصة سير المركبة (الاستمارة)",
    descriptionEn: "Vehicle registration card (Istimara)",
  },
  VehicleInsurancePolicy: {
    ar: "وثيقة تأمين مركبة",
    en: "Vehicle Insurance Policy",
    icon: ShieldCheck,
    badgeCls: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
    descriptionAr: "وثيقة التأمين الشامل أو ضد الغير للمركبة",
    descriptionEn: "Vehicle insurance policy",
  },
  VehiclePeriodicInspection: {
    ar: "فحص دوري للمركبة",
    en: "Periodic Inspection",
    icon: ShieldCheck,
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    descriptionAr: "شهادة الفحص الدوري الفني للمركبة (MVPI)",
    descriptionEn: "Periodic motor vehicle inspection",
  },
  VehicleOperationCard: {
    ar: "كرت تشغيل مركبة",
    en: "Vehicle Operation Card",
    icon: CreditCard,
    badgeCls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    descriptionAr: "بطاقة تشغيل المركبة الصادرة من هيئة النقل",
    descriptionEn: "Vehicle transport operation card",
  },
  VehicleAttachment: {
    ar: "مرفق مركبة",
    en: "Vehicle Attachment",
    icon: FileText,
    badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    descriptionAr: "مستند أو صورة تابعة لملف المركبة",
    descriptionEn: "Document attached to vehicle",
  },
  VehicleAttachmentVersion: {
    ar: "نسخة مرفق مركبة",
    en: "Vehicle Attachment Version",
    icon: Layers,
    badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    descriptionAr: "إصدار أو نسخة جديدة لمرفق المركبة",
    descriptionEn: "Version of vehicle attachment",
  },
  RiderPromissoryFile: {
    ar: "سند لأمر سائق",
    en: "Rider Promissory File",
    icon: FileSignature,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "سند لأمر موقع من السائق",
    descriptionEn: "Rider signed promissory file",
  },
  RiderPromissoryFileVersion: {
    ar: "نسخة سند سائق",
    en: "Promissory File Version",
    icon: Layers,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "إصدار سند لأمر سائق",
    descriptionEn: "Version of promissory document",
  },
  VehicleIssue: {
    ar: "بلاغ / مشكلة مركبة",
    en: "Vehicle Issue",
    icon: AlertTriangle,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "بلاغ عطل أو مشكلة فنية في مركبة",
    descriptionEn: "Reported vehicle defect or issue",
  },
  VehicleIssueEvidence: {
    ar: "دليل مشكلة مركبة",
    en: "Issue Evidence",
    icon: FileText,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "صورة أو مستند يثبت المشكلة الفنية",
    descriptionEn: "Evidence file for vehicle issue",
  },
  VehicleIssueEvent: {
    ar: "حدث مشكلة مركبة",
    en: "Vehicle Issue Event",
    icon: Activity,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "إجراء أو تحديث على بلاغ المشكلة",
    descriptionEn: "Log event for vehicle issue",
  },
  VehicleAccident: {
    ar: "حادث مركبة",
    en: "Vehicle Accident",
    icon: AlertOctagon,
    badgeCls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    descriptionAr: "سجل حادث مروري لمركبة في الأسطول",
    descriptionEn: "Fleet vehicle traffic accident",
  },
  Accident: {
    ar: "حادث مركبة",
    en: "Vehicle Accident",
    icon: AlertOctagon,
    badgeCls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    descriptionAr: "سجل حادث مروري لمركبة في الأسطول",
    descriptionEn: "Fleet vehicle traffic accident",
  },
  VehicleAccidentCase: {
    ar: "ملف قضية حادث",
    en: "Accident Case",
    icon: Scale,
    badgeCls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    descriptionAr: "ملف وإجراءات متابعة الحادث والتأمين",
    descriptionEn: "Accident insurance/claim case",
  },
  VehicleAccidentInstallment: {
    ar: "قسط تعويض حادث",
    en: "Accident Installment",
    icon: Coins,
    badgeCls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    descriptionAr: "قسط مالي مستحق عن الحادث",
    descriptionEn: "Accident settlement installment",
  },
  VehicleAccidentEvent: {
    ar: "حدث حادث مركبة",
    en: "Accident Event",
    icon: Activity,
    badgeCls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    descriptionAr: "تحديث أو إجراء في ملف الحادث",
    descriptionEn: "Accident progress log event",
  },
  VehicleAccidentAttachment: {
    ar: "مرفق حادث مركبة",
    en: "Accident Attachment",
    icon: FileText,
    badgeCls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    descriptionAr: "تقرير نجم أو تقدير أو صور الحادث",
    descriptionEn: "Accident report or photos attachment",
  },
  VehicleAccidentReportVersion: {
    ar: "نسخة تقرير حادث",
    en: "Accident Report Version",
    icon: Layers,
    badgeCls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    descriptionAr: "إصدار تقرير الحادث المحدث",
    descriptionEn: "Accident report document version",
  },

  // --- Fuel ---
  FuelCard: {
    ar: "بطاقة وقود",
    en: "Fuel Card",
    icon: CreditCard,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "بطاقة وقود مخصصة لمركبة أو سائق",
    descriptionEn: "Fuel card assigned to a vehicle or driver",
  },
  FuelCardRiderAssignment: {
    ar: "تعيين بطاقة وقود",
    en: "Fuel Card Assignment",
    icon: ArrowLeftRight,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "تسليم أو ربط بطاقة الوقود بسائق",
    descriptionEn: "Fuel card assignment to rider",
  },
  FuelCardMonthlyUsage: {
    ar: "استهلاك شهري للوقود",
    en: "Monthly Fuel Usage",
    icon: Fuel,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "بيانات الاستهلاك الشهري لبطاقة الوقود",
    descriptionEn: "Monthly fuel consumption record",
  },
  FuelCardImport: {
    ar: "استيراد بيانات وقود",
    en: "Fuel Card Import",
    icon: FileSpreadsheet,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "دفعة استيراد فواتير أو حركات الوقود",
    descriptionEn: "Fuel consumption batch import",
  },

  // --- Maintenance, Inventory, Oil, and Workshop Finance ---
  MaintenanceLocation: {
    ar: "موقع صيانة",
    en: "Maintenance Location",
    icon: MapPin,
    badgeCls: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700",
    descriptionAr: "ورشة أو موقع تنفيذ الصيانة",
    descriptionEn: "Maintenance facility or workshop",
  },
  InventoryLocation: {
    ar: "موقع مستودع",
    en: "Inventory Location",
    icon: Package,
    badgeCls: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700",
    descriptionAr: "موقع أو مستودع تخزين قطع الغيار",
    descriptionEn: "Inventory warehouse or location",
  },
  InventoryItem: {
    ar: "صنف مستودع",
    en: "Inventory Item",
    icon: Package,
    badgeCls: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700",
    descriptionAr: "صنف أو قطعة غيار مسجلة في المستودع",
    descriptionEn: "Inventory item / spare part",
  },
  MaintenanceSupplier: {
    ar: "مورد صيانة",
    en: "Maintenance Supplier",
    icon: Building,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "مورد قطع غيار أو خدمات صيانة",
    descriptionEn: "Maintenance supplier or vendor",
  },
  StockBalance: {
    ar: "رصيد مخزون",
    en: "Stock Balance",
    icon: Package,
    badgeCls: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700",
    descriptionAr: "الرصيد المتبقي لصنف في المخزن",
    descriptionEn: "Item stock balance",
  },
  StockCostLayer: {
    ar: "طبقة تكلفة المخزون",
    en: "Stock Cost Layer",
    icon: Coins,
    badgeCls: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700",
    descriptionAr: "طبقة تقييم تكلفة الوارد للمخزون",
    descriptionEn: "Stock valuation cost layer",
  },
  StockMovement: {
    ar: "حركة مخزون",
    en: "Stock Movement",
    icon: ArrowLeftRight,
    badgeCls: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700",
    descriptionAr: "حركة إدخال أو إخراج أصناف من المستودع",
    descriptionEn: "Inventory stock movement",
  },
  StockMovementLine: {
    ar: "بند حركة مخزون",
    en: "Stock Movement Line",
    icon: Package,
    badgeCls: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700",
    descriptionAr: "بند صنف محدد في حركة المخزون",
    descriptionEn: "Line item in stock movement",
  },
  StockCostAllocation: {
    ar: "توزيع تكلفة مخزون",
    en: "Stock Cost Allocation",
    icon: Coins,
    badgeCls: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700",
    descriptionAr: "توزيع تكلفة الصنف على أمر العمل",
    descriptionEn: "Cost allocation for stock",
  },
  PurchaseReceipt: {
    ar: "إيصال استلام مشتريات",
    en: "Purchase Receipt",
    icon: Receipt,
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    descriptionAr: "سند استلام بضاعة أو قطع غيار من مورد",
    descriptionEn: "Purchase goods receipt",
  },
  PurchaseReceiptLine: {
    ar: "بند إيصال مشتريات",
    en: "Purchase Receipt Line",
    icon: Package,
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    descriptionAr: "بند صنف مستلم في سند الشراء",
    descriptionEn: "Item line in purchase receipt",
  },
  PurchaseReceiptAttachment: {
    ar: "مرفق إيصال مشتريات",
    en: "Purchase Receipt Attachment",
    icon: FileText,
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    descriptionAr: "فاتورة المورد أو مستند الاستلام",
    descriptionEn: "Attachment for purchase receipt",
  },
  OilBarrel: {
    ar: "برميل زيت",
    en: "Oil Barrel",
    icon: Droplets,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "سجل برميل زيت في المستودع",
    descriptionEn: "Oil barrel in inventory",
  },
  OilBarrelUsageAllocation: {
    ar: "توزيع استهلاك زيت",
    en: "Oil Usage Allocation",
    icon: Droplets,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "صرف لترات زيت لمركبة أو أمر صيانة",
    descriptionEn: "Oil liters usage allocation",
  },
  OilBarrelLoss: {
    ar: "فاقد / هدر زيت",
    en: "Oil Barrel Loss",
    icon: AlertTriangle,
    badgeCls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    descriptionAr: "تسجيل فاقد أو تالف في برميل الزيت",
    descriptionEn: "Recorded oil loss/spill",
  },
  StockTransfer: {
    ar: "تحويل مخزون",
    en: "Stock Transfer",
    icon: ArrowLeftRight,
    badgeCls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    descriptionAr: "نقل أصناف بين مستودعات ومواقع مختلفة",
    descriptionEn: "Inter-warehouse stock transfer",
  },
  StockTransferLine: {
    ar: "بند تحويل مخزون",
    en: "Stock Transfer Line",
    icon: Package,
    badgeCls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    descriptionAr: "بند صنف محدد في عملية التحويل",
    descriptionEn: "Item line in stock transfer",
  },
  SupplierReturn: {
    ar: "مرتجع لمورد",
    en: "Supplier Return",
    icon: ArrowLeftRight,
    badgeCls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    descriptionAr: "إرجاع قطع غيار أو أصناف للمورد",
    descriptionEn: "Return of goods to supplier",
  },
  SupplierReturnLine: {
    ar: "بند مرتجع لمورد",
    en: "Supplier Return Line",
    icon: Package,
    badgeCls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    descriptionAr: "بند صنف مرجع في إذن الإرجاع",
    descriptionEn: "Line item in supplier return",
  },
  RiderInventoryIssue: {
    ar: "صرف مستودع لسائق",
    en: "Rider Inventory Issue",
    icon: Package,
    badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    descriptionAr: "تسليم خوذة أو حقيبة أو معدات لسائق",
    descriptionEn: "Issuing equipment/gear to rider",
  },
  RiderInventoryIssueLine: {
    ar: "بند صرف لسائق",
    en: "Rider Issue Line",
    icon: Package,
    badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    descriptionAr: "بند قطعة أو عهدة مسلمة للسائق",
    descriptionEn: "Gear line in rider issue",
  },
  InventorySupplyRequest: {
    ar: "طلب توريد مستودع",
    en: "Inventory Supply Request",
    icon: Package,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "طلب شراء أو توريد أصناف ناقصة",
    descriptionEn: "Procurement / stock replenishment request",
  },
  InventorySupplyRequestLine: {
    ar: "بند طلب توريد",
    en: "Supply Request Line",
    icon: Package,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "بند صنف في طلب التوريد",
    descriptionEn: "Item line in supply request",
  },
  MaintenanceWorkOrder: {
    ar: "أمر عمل صيانة",
    en: "Maintenance Work Order",
    icon: Wrench,
    badgeCls: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700",
    descriptionAr: "أمر صيانة وإصلاح لمركبة",
    descriptionEn: "Vehicle maintenance work order",
  },
  Maintenance: {
    ar: "طلب صيانة",
    en: "Maintenance Request",
    icon: Wrench,
    badgeCls: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700",
    descriptionAr: "طلب أو سجل صيانة مركبة",
    descriptionEn: "Vehicle maintenance request or record",
  },
  WorkOrder: {
    ar: "أمر صيانة",
    en: "Work Order",
    icon: Wrench,
    badgeCls: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700",
    descriptionAr: "أمر صيانة وإصلاح لمركبة",
    descriptionEn: "Vehicle maintenance work order",
  },
  ExternalVehicleSnapshot: {
    ar: "لقطة مركبة خارجية",
    en: "External Vehicle Snapshot",
    icon: Car,
    badgeCls: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    descriptionAr: "بيانات مركبة خارجية يتم صيانتها بالورشة",
    descriptionEn: "Snapshot of external customer vehicle",
  },
  MaintenanceMaterialUsage: {
    ar: "مواد صيانة مستخدمة",
    en: "Material Usage",
    icon: Package,
    badgeCls: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700",
    descriptionAr: "قطع الغيار والمواد المستهلكة في الصيانة",
    descriptionEn: "Parts/materials consumed in repair",
  },
  MaintenanceLaborEntry: {
    ar: "أجور عمالة صيانة",
    en: "Labor Entry",
    icon: Wrench,
    badgeCls: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700",
    descriptionAr: "أجور الفنيين والعمالة على أمر الصيانة",
    descriptionEn: "Labor costs for work order",
  },
  MaintenancePlan: {
    ar: "خطة صيانة",
    en: "Maintenance Plan",
    icon: FileText,
    badgeCls: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700",
    descriptionAr: "خطة الصيانة الوقائية المجدولة",
    descriptionEn: "Preventive maintenance plan",
  },
  VehicleMaintenanceSchedule: {
    ar: "جدول صيانة مركبة",
    en: "Maintenance Schedule",
    icon: Calendar,
    badgeCls: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700",
    descriptionAr: "مواعيد الصيانة الدورية المجدولة للمركبة",
    descriptionEn: "Scheduled maintenance intervals",
  },
  OilChangeOperation: {
    ar: "عملية غيار زيت",
    en: "Oil Change Operation",
    icon: Droplets,
    badgeCls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    descriptionAr: "عملية تبديل زيت وفلتر لمركبة",
    descriptionEn: "Vehicle oil change execution",
  },
  VehicleExpense: {
    ar: "مصروف مركبة",
    en: "Vehicle Expense",
    icon: Coins,
    badgeCls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    descriptionAr: "مصاريف ونفقات تشغيلية للمركبة",
    descriptionEn: "Vehicle operational expense",
  },
  ExternalPartSaleLine: {
    ar: "بيع قطع غيار خارجي",
    en: "External Part Sale",
    icon: Coins,
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    descriptionAr: "بند بيع قطع غيار لعميل خارجي",
    descriptionEn: "External customer parts sale",
  },
  ExternalMaintenanceFinancialEntry: {
    ar: "قيد مالي صيانة خارجية",
    en: "External Financial Entry",
    icon: Coins,
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    descriptionAr: "قيد الإيرادات والأرباح للورشة الخارجية",
    descriptionEn: "External workshop revenue record",
  },
  ExternalCustomerPayment: {
    ar: "دفعة عميل خارجي",
    en: "Customer Payment",
    icon: Receipt,
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    descriptionAr: "دفعة مسددة من عميل صيانة خارجي",
    descriptionEn: "Payment received from external client",
  },

  // --- Telecom ---
  PhoneSimCard: {
    ar: "شريحة اتصال",
    en: "Phone SIM Card",
    icon: Phone,
    badgeCls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    descriptionAr: "شريحة اتصال وبيانات تابعة للأسطول",
    descriptionEn: "Fleet phone/data SIM card",
  },
  RiderPhoneSimAssignment: {
    ar: "تسليم شريحة لسائق",
    en: "SIM Assignment",
    icon: ArrowLeftRight,
    badgeCls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    descriptionAr: "تسليم وربط شريحة الاتصال بسائق",
    descriptionEn: "SIM card assignment to rider",
  },
  PhoneSimResponsibilityChange: {
    ar: "تغيير مسؤولية شريحة",
    en: "SIM Responsibility Change",
    icon: ArrowLeftRight,
    badgeCls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    descriptionAr: "نقل عهدة أو مسؤولية شريحة الاتصال",
    descriptionEn: "SIM card responsibility transfer",
  },

  // --- System User Context (Identity) ---
  User: {
    ar: "مستخدم نظام",
    en: "System User",
    icon: User,
    badgeCls: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
    descriptionAr: "حساب مستخدم في النظام",
    descriptionEn: "System user account",
  },
  Role: {
    ar: "دور / صلاحية",
    en: "Role / Permission",
    icon: Users,
    badgeCls: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
    descriptionAr: "دور وصلاحيات مستخدمين في النظام",
    descriptionEn: "User role or permission definition",
  },
};

export interface ResolvedAuditRecord {
  entityType: string;
  entityLabel: string;
  entityIcon: LucideIcon;
  badgeCls: string;
  primaryTitle: string;
  secondaryTitle?: string;
  code?: string;
  rawId: string;
  shortId: string;
  referenceExplanation: string;
  extractedFields: Record<string, any>;
}

/**
 * Safely parses a JSON string or returns null
 */
function safeJsonParse(str?: string | null): Record<string, any> | null {
  if (!str || typeof str !== "string") return null;
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Case-insensitive lookup in an object for specified keys
 */
function getFieldCaseInsensitive(obj: Record<string, any> | null | undefined, ...keys: string[]): any {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    const lowerKey = key.toLowerCase();
    for (const [k, v] of Object.entries(obj)) {
      if (k.toLowerCase() === lowerKey && v !== null && v !== undefined && v !== "") {
        return v;
      }
    }
  }
  return undefined;
}

/**
 * Resolves comprehensive human-readable information about an audit record,
 * ensuring that cryptic UUIDs are never the sole or primary label shown to the user.
 */
export function resolveAuditRecordInfo(
  entry: AuditEntry,
  isEn: boolean = false,
  documentTypesMap?: Record<string, { nameAr?: string; nameEn?: string; code?: string }>,
  documentsMap?: Record<string, { employeeId: string; docName?: string; fileName?: string }>,
  employeesList?: any[],
  vehiclePeriodsMap?: Record<string, { vehicleId: string; plateNumber?: string }>
): ResolvedAuditRecord {
  const entityType = entry.entityType || "Unknown";
  const entityMeta = ENTITY_TYPE_CONFIG[entityType] || {
    ar: entityType,
    en: entityType,
    icon: HelpCircle,
    badgeCls: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    descriptionAr: `سجل من نوع ${entityType}`,
    descriptionEn: `${entityType} record`,
  };

  const entityLabel = isEn ? entityMeta.en : entityMeta.ar;
  const rawId = entry.entityId || "";
  const shortId = rawId.length > 8 ? `...${rawId.slice(-8)}` : rawId;

  // 1. Try to extract data from afterJson and beforeJson
  const afterData = safeJsonParse(entry.afterJson);
  const beforeData = safeJsonParse(entry.beforeJson);
  const combined = { ...(beforeData || {}), ...(afterData || {}) };

  // 2. Also check changes array for field values
  const changesMap: Record<string, any> = {};
  if (Array.isArray(entry.changes)) {
    for (const c of entry.changes) {
      if (c && c.field) {
        changesMap[c.field] = c.after !== null && c.after !== undefined ? c.after : c.before;
      }
    }
  }
  const allData = { ...combined, ...changesMap };

  // 3. Extract common identifying fields across all business modules
  let docTypeNameAr = getFieldCaseInsensitive(allData, "documentTypeNameAr", "documentTypeName", "nameAr");
  let docTypeNameEn = getFieldCaseInsensitive(allData, "documentTypeNameEn", "nameEn");
  const docTypeCode = getFieldCaseInsensitive(allData, "documentTypeCode", "code");
  const docNumber = getFieldCaseInsensitive(allData, "documentNumber", "number", "permitNumber", "licenseNumber");
  const fileName = getFieldCaseInsensitive(allData, "currentFileName", "originalFileName", "fileName");
  let employeeName = getFieldCaseInsensitive(allData, "employeeName", "employeeDisplayName", "fullName", "name");
  const employeeCode = getFieldCaseInsensitive(allData, "employeeCode", "employeeNumber");
  const employeeId = getFieldCaseInsensitive(allData, "employeeId");
  const docTypeId = getFieldCaseInsensitive(allData, "documentTypeId");
  const versionNum = getFieldCaseInsensitive(allData, "currentVersionNumber", "versionNumber", "version");
  const datasetName = getFieldCaseInsensitive(allData, "datasetName", "datasetTitle", "title", "name");
  const plateNumber = getFieldCaseInsensitive(allData, "plateNumber", "plateNumberAr", "plateNumberEn", "licensePlate");
  const cardNumber = getFieldCaseInsensitive(allData, "cardNumber", "fuelCardNumber");
  const userName = getFieldCaseInsensitive(allData, "userName", "username", "email");
  const roleName = getFieldCaseInsensitive(allData, "roleName", "name");

  // Check documentsMap for additional context if document info is missing
  let mappedDoc = documentsMap
    ? documentsMap[rawId] ||
    (afterData?.employeeDocumentId && documentsMap[afterData.employeeDocumentId]) ||
    (fileName && documentsMap[String(fileName).toLowerCase().trim()]) ||
    (docNumber && documentsMap[String(docNumber).toLowerCase().trim()])
    : undefined;

  if (mappedDoc) {
    if (!docTypeNameAr && mappedDoc.docName) {
      docTypeNameAr = mappedDoc.docName;
    }
    if (!employeeName && mappedDoc.employeeId && employeesList && Array.isArray(employeesList)) {
      const matchEmp = employeesList.find((e: any) => e.id === mappedDoc!.employeeId);
      if (matchEmp) {
        employeeName = isEn
          ? matchEmp.fullNameEn || matchEmp.fullNameAr || matchEmp.name
          : matchEmp.fullNameAr || matchEmp.fullNameEn || matchEmp.name;
      }
    }
  }

  // Additional entity-specific fields
  const contractNumber = getFieldCaseInsensitive(allData, "contractNumber", "contractCode");
  const contractName = getFieldCaseInsensitive(allData, "contractName", "clientName", "title");
  const simNumber = getFieldCaseInsensitive(allData, "simNumber", "phoneNumber", "mobileNumber", "serialNumber");
  const workOrderNumber = getFieldCaseInsensitive(allData, "workOrderNumber", "orderNumber", "code");
  const itemName = getFieldCaseInsensitive(allData, "itemName", "partName", "nameAr", "nameEn", "name");
  const itemCode = getFieldCaseInsensitive(allData, "itemCode", "partNumber", "barcode", "code");
  const caseNumber = getFieldCaseInsensitive(allData, "caseNumber", "lawsuitNumber", "code");
  const accidentNumber = getFieldCaseInsensitive(allData, "accidentNumber", "caseNumber", "reportNumber", "najmNumber");
  const housingName = getFieldCaseInsensitive(allData, "housingName", "buildingName", "name");
  const roomNumber = getFieldCaseInsensitive(allData, "roomNumber", "roomCode");
  const receiptNumber = getFieldCaseInsensitive(allData, "receiptNumber", "purchaseReceiptNumber", "code");
  const transferNumber = getFieldCaseInsensitive(allData, "transferNumber", "code");
  const barrelNumber = getFieldCaseInsensitive(allData, "barrelNumber", "serialNumber", "code");
  const oilType = getFieldCaseInsensitive(allData, "oilType", "brand");
  const leaveTypeName = getFieldCaseInsensitive(allData, "leaveTypeName", "leaveType");
  const issueTitle = getFieldCaseInsensitive(allData, "issueTitle", "defectTitle", "title", "description");
  const supplierName = getFieldCaseInsensitive(allData, "supplierName", "vendorName", "name");
  const platformName = getFieldCaseInsensitive(allData, "platformName", "clientPlatformName");
  const tagName = getFieldCaseInsensitive(allData, "tagName", "name");
  const locationName = getFieldCaseInsensitive(allData, "locationName", "warehouseName", "name");
  const cityName = getFieldCaseInsensitive(allData, "cityName", "nameAr", "nameEn");
  const jobTitleName = getFieldCaseInsensitive(allData, "jobTitle", "title", "nameAr", "nameEn");
  const sponsorName = getFieldCaseInsensitive(allData, "sponsorName", "nameAr", "nameEn");
  const professionName = getFieldCaseInsensitive(allData, "profession", "nameAr", "nameEn");

  // Check documentTypesMap if docTypeId is known
  let catalogDocName: string | undefined;
  if (docTypeId && documentTypesMap && documentTypesMap[docTypeId]) {
    catalogDocName = isEn
      ? documentTypesMap[docTypeId].nameEn || documentTypesMap[docTypeId].nameAr
      : documentTypesMap[docTypeId].nameAr || documentTypesMap[docTypeId].nameEn;
  }
  if (!catalogDocName && mappedDoc?.docName) {
    catalogDocName = mappedDoc.docName;
  }

  // 4. Determine Primary & Secondary Titles
  let primaryTitle = "";
  let secondaryTitle: string | undefined;
  let code = entry.record?.displayCode || docTypeCode || employeeCode || itemCode || contractNumber || workOrderNumber || caseNumber || undefined;

  // If server provided explicit displayLabel, prioritize it
  if (entry.record?.displayLabel && entry.record.displayLabel.trim()) {
    primaryTitle = entry.record.displayLabel.trim();
  }

  // Otherwise, construct a rich contextual title based on the entity type
  if (!primaryTitle) {
    switch (entityType) {
      case "EmployeeDocument": {
        const resolvedName = catalogDocName || (isEn ? docTypeNameEn || docTypeNameAr : docTypeNameAr || docTypeNameEn) || docTypeCode;
        if (resolvedName) {
          primaryTitle = isEn ? `Document: ${resolvedName}` : `وثيقة: ${resolvedName}`;
        } else if (fileName) {
          primaryTitle = isEn ? `File: ${fileName}` : `ملف: ${fileName}`;
        } else if (docNumber) {
          primaryTitle = isEn ? `Document #${docNumber}` : `وثيقة رقم ${docNumber}`;
        } else {
          primaryTitle = isEn ? "Employee Document Record" : "سجل وثيقة موظف";
        }

        const parts: string[] = [];
        if (docNumber && primaryTitle !== (isEn ? `Document #${docNumber}` : `وثيقة رقم ${docNumber}`)) {
          parts.push(isEn ? `No: ${docNumber}` : `رقم: ${docNumber}`);
        }
        if (fileName && !primaryTitle.includes(fileName)) {
          parts.push(fileName);
        }
        if (employeeName) {
          parts.push(isEn ? `Employee: ${employeeName}` : `للموظف: ${employeeName}`);
        } else if (employeeCode) {
          parts.push(employeeCode);
        }
        if (parts.length > 0) {
          secondaryTitle = parts.join(" • ");
        }
        break;
      }

      case "EmployeeDocumentVersion": {
        if (fileName) {
          primaryTitle = isEn ? `File: ${fileName}` : `ملف: ${fileName}`;
        } else {
          primaryTitle = isEn ? "Employee Document File Version" : "إصدار / ملف وثيقة موظف";
        }

        const parts: string[] = [];
        if (versionNum !== undefined) {
          parts.push(isEn ? `Version #${versionNum}` : `الإصدار رقم #${versionNum}`);
        }
        if (mappedDoc?.docName) {
          parts.push(mappedDoc.docName);
        }
        if (employeeName) {
          parts.push(employeeName);
        }
        if (parts.length > 0) {
          secondaryTitle = parts.join(" • ");
        }
        break;
      }

      case "Employee":
      case "PayrollEmployee":
      case "RiderProfile":
      case "RealRider": {
        if (employeeName) {
          primaryTitle = employeeName;
        } else if (employeeCode) {
          primaryTitle = isEn ? `Employee ${employeeCode}` : `الموظف ${employeeCode}`;
        } else {
          primaryTitle = isEn ? `${entityMeta.en} Record` : `سجل ${entityMeta.ar}`;
        }
        if (employeeCode && primaryTitle !== employeeCode) {
          secondaryTitle = employeeCode;
        }
        break;
      }

      case "Vehicle":
      case "VehicleRegistration":
      case "VehicleInsurancePolicy":
      case "VehiclePeriodicInspection":
      case "VehicleOperationCard":
      case "VehicleIdentityCorrection":
      case "VehicleRegistrationTransition": {
        if (plateNumber) {
          primaryTitle = isEn ? `Plate: ${plateNumber}` : `لوحة: ${plateNumber}`;
        } else {
          primaryTitle = isEn ? `${entityMeta.en} Record` : `سجل ${entityMeta.ar}`;
        }
        break;
      }

      case "VehicleOperationalStatusPeriod": {
        const periodPlate =
          plateNumber ||
          (vehiclePeriodsMap && vehiclePeriodsMap[rawId]?.plateNumber);
        const periodStatus =
          getFieldCaseInsensitive(allData, "status", "operationalStatus") ||
          getFieldCaseInsensitive(allData, "newStatus");

        if (periodPlate) {
          primaryTitle = isEn
            ? `Status Period: ${periodPlate}`
            : `فترة تشغيلية للمركبة: ${periodPlate}`;
        } else if (periodStatus) {
          primaryTitle = isEn
            ? `Status Period: ${periodStatus}`
            : `فترة حالة تشغيلية: ${periodStatus}`;
        } else {
          primaryTitle = isEn ? "Vehicle Status Period" : "سجل فترة الحالة التشغيلية";
        }

        const parts: string[] = [];
        if (periodStatus && periodPlate) {
          parts.push(String(periodStatus));
        }
        const effectiveFrom = getFieldCaseInsensitive(allData, "effectiveFrom", "from");
        if (effectiveFrom) {
          parts.push(String(effectiveFrom).slice(0, 10));
        }
        if (parts.length > 0) {
          secondaryTitle = parts.join(" • ");
        }
        break;
      }

      case "VehicleAccident":
      case "VehicleAccidentCase": {
        if (accidentNumber) {
          primaryTitle = isEn ? `Accident #${accidentNumber}` : `حادث رقم ${accidentNumber}`;
        } else if (plateNumber) {
          primaryTitle = isEn ? `Accident for Vehicle: ${plateNumber}` : `حادث للمركبة: ${plateNumber}`;
        } else {
          primaryTitle = isEn ? "Vehicle Accident Record" : "سجل حادث مروري";
        }
        if (plateNumber && !primaryTitle.includes(plateNumber)) {
          secondaryTitle = isEn ? `Vehicle: ${plateNumber}` : `المركبة: ${plateNumber}`;
        }
        break;
      }

      case "VehicleIssue": {
        if (issueTitle) {
          primaryTitle = issueTitle;
        } else if (plateNumber) {
          primaryTitle = isEn ? `Issue on Vehicle ${plateNumber}` : `بلاغ عطل للمركبة ${plateNumber}`;
        } else {
          primaryTitle = isEn ? "Vehicle Issue Record" : "سجل بلاغ مركبة";
        }
        break;
      }

      case "FuelCard":
      case "FuelCardRiderAssignment":
      case "FuelCardMonthlyUsage": {
        if (cardNumber) {
          primaryTitle = isEn ? `Fuel Card: ${cardNumber}` : `بطاقة وقود: ${cardNumber}`;
        } else {
          primaryTitle = isEn ? "Fuel Card Record" : "سجل بطاقة وقود";
        }
        if (plateNumber) {
          secondaryTitle = isEn ? `Vehicle: ${plateNumber}` : `المركبة: ${plateNumber}`;
        }
        break;
      }

      case "ClientContract": {
        if (contractNumber) {
          primaryTitle = isEn ? `Contract #${contractNumber}` : `عقد رقم ${contractNumber}`;
        } else if (contractName) {
          primaryTitle = contractName;
        } else {
          primaryTitle = isEn ? "Client Contract Record" : "سجل عقد عميل";
        }
        if (contractName && !primaryTitle.includes(contractName)) {
          secondaryTitle = contractName;
        }
        break;
      }

      case "PlatformRiderAccount":
      case "PlatformAccountRegistration": {
        if (userName || employeeName) {
          primaryTitle = (userName ? `@${userName}` : employeeName) || "";
        } else {
          primaryTitle = isEn ? "Platform Account" : "حساب منصة";
        }
        if (platformName) {
          secondaryTitle = platformName;
        }
        break;
      }

      case "RiderClientAssignment": {
        if (employeeName || platformName) {
          primaryTitle = `${employeeName || (isEn ? "Rider" : "سائق")} ➔ ${platformName || (isEn ? "Platform" : "منصة")}`;
        } else {
          primaryTitle = isEn ? "Rider Assignment" : "تعيين سائق لعميل";
        }
        break;
      }

      case "PhoneSimCard":
      case "RiderPhoneSimAssignment":
      case "PhoneSimResponsibilityChange": {
        if (simNumber) {
          primaryTitle = isEn ? `SIM / Phone: ${simNumber}` : `شريحة / هاتف: ${simNumber}`;
        } else {
          primaryTitle = isEn ? "SIM Card Record" : "سجل شريحة اتصال";
        }
        break;
      }

      case "Housing":
      case "HousingSupervisorPeriod":
      case "HousingResidencePeriod": {
        if (housingName) {
          primaryTitle = housingName;
        } else {
          primaryTitle = isEn ? "Housing Facility" : "سكن موظفين";
        }
        break;
      }

      case "HousingRoom": {
        if (roomNumber) {
          primaryTitle = isEn ? `Room #${roomNumber}` : `غرفة رقم ${roomNumber}`;
        } else {
          primaryTitle = isEn ? "Housing Room" : "غرفة سكن";
        }
        if (housingName) {
          secondaryTitle = housingName;
        }
        break;
      }

      case "MaintenanceWorkOrder":
      case "WorkOrder":
      case "Maintenance": {
        if (workOrderNumber) {
          primaryTitle = isEn ? `Work Order #${workOrderNumber}` : `أمر صيانة #${workOrderNumber}`;
        } else if (plateNumber) {
          primaryTitle = isEn ? `Work Order for Vehicle: ${plateNumber}` : `أمر صيانة للمركبة: ${plateNumber}`;
        } else {
          primaryTitle = isEn ? "Work Order Record" : "سجل أمر صيانة";
        }
        break;
      }

      case "InventoryItem": {
        if (itemName) {
          primaryTitle = itemName;
        } else if (itemCode) {
          primaryTitle = isEn ? `Item: ${itemCode}` : `صنف: ${itemCode}`;
        } else {
          primaryTitle = isEn ? "Inventory Item" : "صنف مستودع";
        }
        if (itemCode && primaryTitle !== itemCode) {
          secondaryTitle = itemCode;
        }
        break;
      }

      case "PurchaseReceipt": {
        if (receiptNumber) {
          primaryTitle = isEn ? `Purchase Receipt #${receiptNumber}` : `إيصال مشتريات #${receiptNumber}`;
        } else {
          primaryTitle = isEn ? "Purchase Receipt" : "إيصال استلام مشتريات";
        }
        if (supplierName) {
          secondaryTitle = supplierName;
        }
        break;
      }

      case "StockTransfer": {
        if (transferNumber) {
          primaryTitle = isEn ? `Transfer #${transferNumber}` : `تحويل مخزون #${transferNumber}`;
        } else {
          primaryTitle = isEn ? "Stock Transfer" : "تحويل مخزون";
        }
        break;
      }

      case "OilBarrel": {
        if (barrelNumber) {
          primaryTitle = isEn ? `Oil Barrel #${barrelNumber}` : `برميل زيت #${barrelNumber}`;
        } else {
          primaryTitle = isEn ? "Oil Barrel" : "برميل زيت";
        }
        if (oilType) {
          secondaryTitle = oilType;
        }
        break;
      }

      case "LeaveRequest": {
        if (leaveTypeName || employeeName) {
          primaryTitle = `${leaveTypeName || (isEn ? "Leave" : "إجازة")}${employeeName ? ` - ${employeeName}` : ""}`;
        } else {
          primaryTitle = isEn ? "Leave Request" : "طلب إجازة";
        }
        break;
      }

      case "HrLegalCase":
      case "LegalCase":
      case "HrLegalCaseHearing": {
        if (caseNumber) {
          primaryTitle = isEn ? `Legal Case #${caseNumber}` : `قضية قانونية #${caseNumber}`;
        } else {
          primaryTitle = isEn ? "Legal Case" : "قضية قانونية";
        }
        break;
      }

      case "JobTitle": {
        if (jobTitleName) {
          primaryTitle = jobTitleName;
        } else {
          primaryTitle = isEn ? "Job Title" : "مسمى وظيفي";
        }
        break;
      }

      case "Sponsor": {
        if (sponsorName) {
          primaryTitle = sponsorName;
        } else {
          primaryTitle = isEn ? "Sponsor Entity" : "كفيل / منشأة كافلة";
        }
        break;
      }

      case "ResidencyProfession": {
        if (professionName) {
          primaryTitle = professionName;
        } else {
          primaryTitle = isEn ? "Residency Profession" : "مهنة إقامة";
        }
        break;
      }

      case "OperationalWorkType": {
        if (jobTitleName) {
          primaryTitle = jobTitleName;
        } else {
          primaryTitle = isEn ? "Operational Work Type" : "نوع عمل تشغيلي";
        }
        break;
      }

      case "CompanyProfile": {
        primaryTitle = isEn ? "Company Profile Settings" : "بيانات ملف الشركة";
        break;
      }

      case "GlobalCity":
      case "OperatingCity": {
        if (cityName) {
          primaryTitle = cityName;
        } else {
          primaryTitle = isEn ? "Operating City" : "مدينة تشغيل";
        }
        break;
      }

      case "User": {
        if (userName) {
          primaryTitle = `@${userName}`;
        } else {
          primaryTitle = isEn ? "System User Account" : "حساب مستخدم في النظام";
        }
        break;
      }

      case "Role": {
        if (roleName) {
          primaryTitle = roleName;
        } else {
          primaryTitle = isEn ? "User Role / Permission" : "دور وصلاحيات في النظام";
        }
        break;
      }

      case "Tag":
      case "EmployeeTag":
      case "HousingTag":
      case "ClientContractTag":
      case "PlatformRiderAccountTag": {
        if (tagName) {
          primaryTitle = tagName;
        } else {
          primaryTitle = isEn ? `${entityMeta.en} Record` : `سجل ${entityMeta.ar}`;
        }
        break;
      }

      default: {
        // Fallback for any unknown entity
        primaryTitle = isEn ? `${entityType} Record` : `سجل ${entityMeta.ar}`;
        break;
      }
    }
  }

  // Explanation of what this ID refers to
  const referenceExplanation = isEn
    ? `${entityMeta.en} in the system (Database Record ID: ${rawId})`
    : `${entityMeta.descriptionAr} (معرف السجل في قاعدة البيانات: ${rawId})`;

  // Also add normalized lowercased keys so that lookup by any case always works
  const normalizedData: Record<string, any> = { ...allData };
  for (const [k, v] of Object.entries(allData)) {
    const lowerKey = k.toLowerCase();
    if (!(lowerKey in normalizedData)) {
      normalizedData[lowerKey] = v;
    }
  }

  return {
    entityType,
    entityLabel,
    entityIcon: entityMeta.icon,
    badgeCls: entityMeta.badgeCls,
    primaryTitle,
    secondaryTitle,
    code,
    rawId,
    shortId,
    referenceExplanation,
    extractedFields: normalizedData,
  };
}

export const FIELD_NAME_MAP: Record<string, { ar: string; en: string }> = {
  // Document fields
  CurrentVersionId: { ar: "معرف نسخة / ملف الوثيقة", en: "Current Version ID" },
  DocumentTypeId: { ar: "معرف نوع الوثيقة", en: "Document Type ID" },
  DocumentTypeCode: { ar: "رمز نوع الوثيقة", en: "Document Type Code" },
  DocumentTypeNameAr: { ar: "اسم نوع الوثيقة (عربي)", en: "Document Type Name (Ar)" },
  DocumentTypeNameEn: { ar: "اسم نوع الوثيقة (إنجليزي)", en: "Document Type Name (En)" },
  DocumentNumber: { ar: "رقم الوثيقة", en: "Document Number" },
  CurrentFileName: { ar: "اسم الملف الحالي", en: "Current File Name" },
  OriginalFileName: { ar: "اسم الملف الأصلي", en: "Original File Name" },
  CurrentContentType: { ar: "نوع محتوى الملف", en: "Current Content Type" },
  CurrentFileSizeBytes: { ar: "حجم الملف", en: "File Size" },
  CurrentVersionNumber: { ar: "رقم الإصدار الحالي", en: "Current Version Number" },
  VersionNumber: { ar: "رقم الإصدار", en: "Version Number" },
  Version: { ar: "الإصدار", en: "Version" },

  // Employee / HR fields
  EmployeeId: { ar: "معرف الموظف", en: "Employee ID" },
  EmployeeNumber: { ar: "الرقم الوظيفي", en: "Employee Number" },
  EmployeeName: { ar: "اسم الموظف", en: "Employee Name" },
  FirstName: { ar: "الاسم الأول", en: "First Name" },
  LastName: { ar: "اسم العائلة", en: "Last Name" },
  DisplayNameAr: { ar: "الاسم الظاهر (عربي)", en: "Display Name (Ar)" },
  DisplayNameEn: { ar: "الاسم الظاهر (إنجليزي)", en: "Display Name (En)" },
  NationalId: { ar: "رقم الهوية / الإقامة", en: "National ID / Iqama" },
  IssueDate: { ar: "تاريخ الإصدار", en: "Issue Date" },
  ExpiryDate: { ar: "تاريخ الانتهاء", en: "Expiry Date" },
  BirthDate: { ar: "تاريخ الميلاد", en: "Date of Birth" },
  HireDate: { ar: "تاريخ التعيين", en: "Hire Date" },
  TerminationDate: { ar: "تاريخ إنهاء الخدمة", en: "Termination Date" },
  JobTitleId: { ar: "معرف المسمى الوظيفي", en: "Job Title ID" },
  SponsorId: { ar: "معرف الكفيل", en: "Sponsor ID" },
  DepartmentId: { ar: "معرف القسم", en: "Department ID" },
  Status: { ar: "الحالة", en: "Status" },
  Notes: { ar: "الملاحظات", en: "Notes" },

  // User & Identity fields
  UserId: { ar: "معرف المستخدم", en: "User ID" },
  ActorUserId: { ar: "معرف القائم بالعملية", en: "Actor User ID" },
  UserName: { ar: "اسم المستخدم", en: "Username" },
  Email: { ar: "البريد الإلكتروني", en: "Email" },
  PhoneNumber: { ar: "رقم الهاتف", en: "Phone Number" },
  RoleId: { ar: "معرف الدور / الصلاحية", en: "Role ID" },
  RoleName: { ar: "اسم الدور", en: "Role Name" },

  // Fleet & Vehicle fields
  VehicleId: { ar: "معرف المركبة", en: "Vehicle ID" },
  PlateNumber: { ar: "رقم اللوحة", en: "Plate Number" },
  PlateNumberAr: { ar: "رقم اللوحة (عربي)", en: "Plate Number (Ar)" },
  PlateNumberEn: { ar: "رقم اللوحة (إنجليزي)", en: "Plate Number (En)" },
  ChassisNumber: { ar: "رقم الهيكل (الشاسيه)", en: "Chassis Number" },
  Vin: { ar: "رقم الهيكل (VIN)", en: "VIN" },
  SequenceNumber: { ar: "الرقم التسلسلي للاستمارة", en: "Registration Sequence No" },
  ManufacturerId: { ar: "معرف الشركة المصنعة", en: "Manufacturer ID" },
  ModelId: { ar: "معرف الطراز", en: "Model ID" },
  ModelYear: { ar: "سنة الصنع", en: "Model Year" },
  Color: { ar: "اللون", en: "Color" },
  Odometer: { ar: "قراءة العداد", en: "Odometer Reading" },
  DailyDistanceKm: { ar: "المسافة اليومية (كم)", en: "Daily Distance (km)" },
  RegistrationExpiryDate: { ar: "تاريخ انتهاء الاستمارة", en: "Registration Expiry Date" },
  InsuranceExpiryDate: { ar: "تاريخ انتهاء التأمين", en: "Insurance Expiry Date" },
  PeriodicInspectionExpiryDate: { ar: "تاريخ انتهاء الفحص الدوري", en: "Inspection Expiry Date" },
  OperationCardExpiryDate: { ar: "تاريخ انتهاء كرت التشغيل", en: "Operation Card Expiry Date" },

  // Fuel & SIM fields
  FuelCardId: { ar: "معرف بطاقة الوقود", en: "Fuel Card ID" },
  CardNumber: { ar: "رقم البطاقة", en: "Card Number" },
  MonthlyLimit: { ar: "الحد الشهري", en: "Monthly Limit" },
  SimNumber: { ar: "رقم الشريحة", en: "SIM Number" },
  Imsi: { ar: "رمز IMSI", en: "IMSI" },
  Operator: { ar: "مشغل الاتصالات", en: "Telecom Operator" },

  // Platforms & Contracts fields
  ContractNumber: { ar: "رقم العقد", en: "Contract Number" },
  ContractName: { ar: "اسم العقد", en: "Contract Name" },
  ClientPlatformId: { ar: "معرف منصة العميل", en: "Client Platform ID" },
  PlatformName: { ar: "اسم المنصة", en: "Platform Name" },
  StartDate: { ar: "تاريخ البدء", en: "Start Date" },
  EndDate: { ar: "تاريخ الانتهاء", en: "End Date" },

  // Maintenance & Inventory fields
  WorkOrderId: { ar: "معرف أمر الصيانة", en: "Work Order ID" },
  WorkOrderNumber: { ar: "رقم أمر الصيانة", en: "Work Order Number" },
  OrderNumber: { ar: "رقم الطلب", en: "Order Number" },
  MaintenancePlanId: { ar: "معرف خطة الصيانة", en: "Maintenance Plan ID" },
  MaintenanceLocationId: { ar: "معرف موقع الصيانة", en: "Maintenance Location ID" },
  InventoryItemId: { ar: "معرف الصنف", en: "Inventory Item ID" },
  ItemName: { ar: "اسم الصنف", en: "Item Name" },
  ItemCode: { ar: "رمز الصنف", en: "Item Code" },
  Barcode: { ar: "الباركود", en: "Barcode" },
  Quantity: { ar: "الكمية", en: "Quantity" },
  UnitPrice: { ar: "سعر الوحدة", en: "Unit Price" },
  TotalCost: { ar: "التكلفة الإجمالية", en: "Total Cost" },
  ReceiptNumber: { ar: "رقم إيصال الاستلام", en: "Receipt Number" },
  TransferNumber: { ar: "رقم تحويل المخزون", en: "Transfer Number" },
  BarrelNumber: { ar: "رقم البرميل", en: "Barrel Number" },
  OilType: { ar: "نوع الزيت", en: "Oil Type" },

  // Legal & Compliance fields
  LegalCaseId: { ar: "معرف القضية القانونية", en: "Legal Case ID" },
  CaseNumber: { ar: "رقم القضية", en: "Case Number" },
  CourtName: { ar: "اسم المحكمة", en: "Court Name" },
  ClaimantName: { ar: "اسم المدعي", en: "Claimant Name" },
  DefendantName: { ar: "اسم المدعى عليه", en: "Defendant Name" },
  HearingDate: { ar: "تاريخ الجلسة", en: "Hearing Date" },
  AccidentNumber: { ar: "رقم الحادث", en: "Accident Number" },

  // Housing fields
  HousingId: { ar: "معرف السكن", en: "Housing ID" },
  HousingName: { ar: "اسم السكن", en: "Housing Name" },
  RoomNumber: { ar: "رقم الغرفة", en: "Room Number" },
  Capacity: { ar: "السعة الاستيعابية", en: "Capacity" },

  // Technical & System fields
  CorrelationId: { ar: "معرف الارتباط", en: "Correlation ID" },
  SessionId: { ar: "معرف الجلسة", en: "Session ID" },
  RowVersion: { ar: "إصدار السجل", en: "Row Version" },
  IsDeleted: { ar: "حالة الحذف", en: "Is Deleted" },
  IsActive: { ar: "حالة التفعيل", en: "Is Active" },
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ResolvedChangeValue {
  fieldLabel: string;
  fieldCode: string;
  primaryText: string;
  secondaryText?: string;
  badgeText?: string;
  isId: boolean;
  rawId?: string;
  shortId?: string;
}

export function resolveChangeValue(
  field: string,
  val: unknown,
  entry: AuditEntry,
  isEn: boolean,
  documentTypesMap?: Record<string, { nameAr?: string; nameEn?: string; code?: string }>
): ResolvedChangeValue {
  const fieldMeta = FIELD_NAME_MAP[field];
  const fieldLabel = isEn ? fieldMeta?.en || field : fieldMeta?.ar || field;
  const fieldCode = field;

  if (val === null || val === undefined || val === "") {
    return {
      fieldLabel,
      fieldCode,
      primaryText: "—",
      isId: false,
    };
  }

  const strVal = String(val).trim();
  const isUuid = UUID_REGEX.test(strVal);

  // If it is a UUID or ends with 'Id'
  if (isUuid || field.endsWith("Id")) {
    const rawId = strVal;
    const shortId = strVal.length > 8 ? `...${strVal.slice(-8)}` : strVal;

    // Check specific fields
    if (field === "CurrentVersionId" || field === "VersionId") {
      const afterObj = safeJsonParse(entry.afterJson);
      const beforeObj = safeJsonParse(entry.beforeJson);
      const combined = { ...(beforeObj || {}), ...(afterObj || {}) };

      const fileName = getFieldCaseInsensitive(combined, "currentFileName", "originalFileName", "fileName");
      const versionNum = getFieldCaseInsensitive(combined, "currentVersionNumber", "versionNumber", "version");

      let fileDetails = "";
      if (fileName) {
        fileDetails = isEn ? `File: ${fileName}` : `الملف: ${fileName}`;
      }
      if (versionNum !== undefined) {
        fileDetails += (fileDetails ? " • " : "") + (isEn ? `Version #${versionNum}` : `الإصدار #${versionNum}`);
      }

      return {
        fieldLabel,
        fieldCode,
        primaryText: fileDetails || (isEn ? "Uploaded File Version" : "نسخة / ملف وثيقة مرفوع"),
        secondaryText: isEn
          ? `File attachment record in database (ID: ${shortId})`
          : `سجل ملف الوثيقة المرفوع في قاعدة البيانات (${shortId})`,
        badgeText: isEn ? "File Version" : "نسخة / ملف وثيقة",
        isId: true,
        rawId,
        shortId,
      };
    }

    if (field === "DocumentTypeId") {
      let docName: string | undefined;
      if (documentTypesMap && documentTypesMap[strVal]) {
        docName = isEn
          ? documentTypesMap[strVal].nameEn || documentTypesMap[strVal].nameAr
          : documentTypesMap[strVal].nameAr || documentTypesMap[strVal].nameEn;
      }

      return {
        fieldLabel,
        fieldCode,
        primaryText: docName || (isEn ? "Document Type Record" : "نوع وثيقة في النظام"),
        secondaryText: isEn ? "Document type in catalog" : "نوع الوثيقة في دليل الوثائق",
        badgeText: isEn ? "Document Type" : "نوع وثيقة",
        isId: true,
        rawId,
        shortId,
      };
    }

    if (field === "EmployeeId") {
      const afterObj = safeJsonParse(entry.afterJson);
      const beforeObj = safeJsonParse(entry.beforeJson);
      const combined = { ...(beforeObj || {}), ...(afterObj || {}) };
      const empName = getFieldCaseInsensitive(combined, "employeeName", "employeeDisplayName", "fullName");
      const empCode = getFieldCaseInsensitive(combined, "employeeCode", "employeeNumber");

      return {
        fieldLabel,
        fieldCode,
        primaryText: empName || (isEn ? "Employee Record" : "سجل موظف في النظام"),
        secondaryText: empCode
          ? isEn
            ? `Employee Code: ${empCode}`
            : `الرقم الوظيفي: ${empCode}`
          : isEn
            ? "Employee profile in system"
            : "ملف موظف مسجل في النظام",
        badgeText: isEn ? "Employee" : "موظف",
        isId: true,
        rawId,
        shortId,
      };
    }

    if (field === "UserId" || field === "ActorUserId") {
      return {
        fieldLabel,
        fieldCode,
        primaryText: isEn ? "System User Account" : "حساب مستخدم في النظام",
        secondaryText: isEn ? "User account record" : "سجل حساب مستخدم في قاعدة البيانات",
        badgeText: isEn ? "User" : "مستخدم",
        isId: true,
        rawId,
        shortId,
      };
    }

    if (field === "RoleId") {
      return {
        fieldLabel,
        fieldCode,
        primaryText: isEn ? "User Role / Permission" : "دور / صلاحية في النظام",
        secondaryText: isEn ? "Role record" : "سجل الدور والصلاحية",
        badgeText: isEn ? "Role" : "دور / صلاحية",
        isId: true,
        rawId,
        shortId,
      };
    }

    if (field === "VehicleId") {
      return {
        fieldLabel,
        fieldCode,
        primaryText: isEn ? "Fleet Vehicle" : "مركبة في الأسطول",
        secondaryText: isEn ? "Vehicle record" : "سجل المركبة في قاعدة البيانات",
        badgeText: isEn ? "Vehicle" : "مركبة",
        isId: true,
        rawId,
        shortId,
      };
    }

    if (field === "FuelCardId") {
      return {
        fieldLabel,
        fieldCode,
        primaryText: isEn ? "Fuel Card" : "بطاقة وقود",
        secondaryText: isEn ? "Fuel card record" : "سجل بطاقة الوقود",
        badgeText: isEn ? "Fuel Card" : "بطاقة وقود",
        isId: true,
        rawId,
        shortId,
      };
    }

    // Generic ID
    const entityName = field.replace(/Id$/, "");
    return {
      fieldLabel,
      fieldCode,
      primaryText: isEn ? `${entityName} Record` : `سجل ${entityName} في النظام`,
      secondaryText: isEn ? "Database Record ID" : "معرف السجل في قاعدة البيانات",
      badgeText: isEn ? "Record ID" : "معرف سجل",
      isId: true,
      rawId,
      shortId,
    };
  }

  // Handle boolean
  if (typeof val === "boolean" || strVal === "true" || strVal === "false") {
    const isTrue = val === true || strVal === "true";
    return {
      fieldLabel,
      fieldCode,
      primaryText: isTrue ? (isEn ? "True / Yes" : "نعم / مفعل") : (isEn ? "False / No" : "لا / معطل"),
      isId: false,
    };
  }

  // Handle ISO date
  if (strVal.length >= 10 && !isNaN(Date.parse(strVal)) && /^\d{4}-\d{2}-\d{2}/.test(strVal)) {
    try {
      const d = new Date(strVal);
      const formatted = new Intl.DateTimeFormat(isEn ? "en-US" : "ar-SA-u-nu-latn", {
        dateStyle: "medium",
        timeStyle: strVal.includes("T") ? "short" : undefined,
      }).format(d);
      return {
        fieldLabel,
        fieldCode,
        primaryText: formatted,
        secondaryText: strVal,
        isId: false,
      };
    } catch {
      // fallback
    }
  }

  return {
    fieldLabel,
    fieldCode,
    primaryText: strVal,
    isId: false,
  };
}

export interface RecordNavigationInfo {
  url: string;
  labelAr: string;
  labelEn: string;
}

/**
 * Deep search for key in object or its 1st-level nested objects (case-insensitive)
 */
function findDeepId(obj: any, targetKeys: string[]): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;

  // 1. Direct case-insensitive key search
  for (const key of targetKeys) {
    const lower = key.toLowerCase();
    for (const [k, v] of Object.entries(obj)) {
      if (k.toLowerCase() === lower && v !== null && v !== undefined && v !== "") {
        if (typeof v === "string" || typeof v === "number") {
          return String(v);
        }
      }
    }
  }

  // 2. Check nested objects like obj.employee?.id or obj.vehicle?.id
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const lower = k.toLowerCase();
      const isEmpGroup = targetKeys.some((tk) => tk.toLowerCase().includes("employee") || tk.toLowerCase().includes("rider"));
      const isVehGroup = targetKeys.some((tk) => tk.toLowerCase().includes("vehicle"));

      if (isEmpGroup && (lower === "employee" || lower === "rider" || lower === "profile" || lower === "user")) {
        const nestedId = (v as any).id || (v as any).Id || (v as any).employeeId || (v as any).EmployeeId;
        if (nestedId) return String(nestedId);
      }
      if (isVehGroup && (lower === "vehicle" || lower === "targetvehicle")) {
        const nestedId = (v as any).id || (v as any).Id || (v as any).vehicleId || (v as any).VehicleId;
        if (nestedId) return String(nestedId);
      }
    }
  }

  return undefined;
}

/**
 * Robustly extracts the target employeeId and/or vehicleId associated with an audit entry
 * by inspecting extractedFields, afterJson, beforeJson, changes, record, lists, auditItems, and documentsMap.
 */
export function extractTargetEntityIds(
  entry: AuditEntry,
  resolved?: ResolvedAuditRecord,
  employeesList?: any[],
  vehiclesList?: any[],
  auditItems?: AuditEntry[],
  documentsMap?: Record<string, { employeeId: string; docName?: string; fileName?: string }>,
  vehiclePeriodsMap?: Record<string, { vehicleId: string; plateNumber?: string }>
): { employeeId?: string; vehicleId?: string } {
  const afterData = safeJsonParse(entry.afterJson);
  const beforeData = safeJsonParse(entry.beforeJson);
  const extracted = resolved?.extractedFields || {};

  const empKeys = [
    "employeeId",
    "riderProfileId",
    "riderId",
    "payrollEmployeeId",
    "realRiderId",
    "assignedEmployeeId",
    "targetEmployeeId",
  ];
  const vehKeys = [
    "vehicleId",
    "targetVehicleId",
    "assignedVehicleId",
    "currentVehicleId",
    "fleetVehicleId",
    "vehicle_id",
  ];

  // 1. Employee ID resolution
  let employeeId: string | undefined = undefined;

  if (entry.entityType === "Employee" && entry.entityId) {
    employeeId = entry.entityId;
  } else {
    employeeId =
      findDeepId(extracted, empKeys) ||
      findDeepId(afterData, empKeys) ||
      findDeepId(beforeData, empKeys);

    if (!employeeId && Array.isArray(entry.changes)) {
      for (const c of entry.changes) {
        if (!c?.field) continue;
        const lower = c.field.toLowerCase();
        if (empKeys.some((k) => k.toLowerCase() === lower)) {
          const val = c.after !== null && c.after !== undefined ? c.after : c.before;
          if (val) {
            employeeId = String(val);
            break;
          }
        }
      }
    }

    if (!employeeId && entry.record?.entityType === "Employee" && entry.record.entityId) {
      employeeId = entry.record.entityId;
    }

    // Check documentsMap for document / version / file associations
    if (!employeeId && documentsMap) {
      const docId =
        entry.entityId ||
        afterData?.employeeDocumentId ||
        beforeData?.employeeDocumentId ||
        extracted?.employeeDocumentId;
      if (docId && documentsMap[docId]?.employeeId) {
        employeeId = documentsMap[docId].employeeId;
      }

      if (!employeeId && afterData?.employeeDocumentId && documentsMap[afterData.employeeDocumentId]?.employeeId) {
        employeeId = documentsMap[afterData.employeeDocumentId].employeeId;
      }

      if (!employeeId) {
        const fn =
          getFieldCaseInsensitive(extracted, "fileName", "originalFileName", "currentFileName") ||
          getFieldCaseInsensitive(afterData, "fileName", "originalFileName", "currentFileName") ||
          getFieldCaseInsensitive(beforeData, "fileName", "originalFileName", "currentFileName");
        if (fn && documentsMap[String(fn).toLowerCase().trim()]?.employeeId) {
          employeeId = documentsMap[String(fn).toLowerCase().trim()].employeeId;
        }
      }

      if (!employeeId) {
        const dn =
          getFieldCaseInsensitive(extracted, "documentNumber", "number") ||
          getFieldCaseInsensitive(afterData, "documentNumber", "number");
        if (dn && documentsMap[String(dn).toLowerCase().trim()]?.employeeId) {
          employeeId = documentsMap[String(dn).toLowerCase().trim()].employeeId;
        }
      }
    }

    // Cross-reference with other auditItems on the current page / batch
    if (!employeeId && auditItems && Array.isArray(auditItems)) {
      // If this is EmployeeDocumentVersion, look for the parent EmployeeDocument entry
      if (entry.entityType === "EmployeeDocumentVersion") {
        const parentDocId =
          afterData?.employeeDocumentId ||
          beforeData?.employeeDocumentId ||
          extracted?.employeeDocumentId;
        if (parentDocId) {
          const parentItem = auditItems.find(
            (it) => it.entityType === "EmployeeDocument" && it.entityId === parentDocId
          );
          if (parentItem) {
            const pAfter = safeJsonParse(parentItem.afterJson);
            const pBefore = safeJsonParse(parentItem.beforeJson);
            employeeId =
              findDeepId(pAfter, empKeys) ||
              findDeepId(pBefore, empKeys) ||
              (parentItem.record?.entityType === "Employee" ? parentItem.record.entityId : undefined);
          }
        }
      }

      // Also check correlationId across entries
      if (!employeeId && entry.correlationId) {
        const corrItems = auditItems.filter(
          (it) => it.correlationId && it.correlationId === entry.correlationId && it.eventId !== entry.eventId
        );
        for (const it of corrItems) {
          if (it.entityType === "Employee" && it.entityId) {
            employeeId = it.entityId;
            break;
          }
          const itAfter = safeJsonParse(it.afterJson);
          const itBefore = safeJsonParse(it.beforeJson);
          const found = findDeepId(itAfter, empKeys) || findDeepId(itBefore, empKeys);
          if (found) {
            employeeId = found;
            break;
          }
        }
      }
    }

    if (!employeeId && employeesList && Array.isArray(employeesList)) {
      const code = getFieldCaseInsensitive(extracted, "employeeCode", "employeeNumber") || resolved?.code;
      const name = getFieldCaseInsensitive(extracted, "employeeName", "employeeDisplayName", "fullName", "name");
      if (code) {
        const match = employeesList.find(
          (e: any) =>
            String(e.employeeNumber || e.employeeCode || e.code || "").toLowerCase() === String(code).toLowerCase()
        );
        if (match?.id) employeeId = match.id;
      }
      if (!employeeId && name) {
        const match = employeesList.find(
          (e: any) =>
            (e.name && e.name.trim().toLowerCase() === String(name).trim().toLowerCase()) ||
            (e.displayNameAr && e.displayNameAr.trim() === String(name).trim()) ||
            (e.displayNameEn && e.displayNameEn.trim().toLowerCase() === String(name).trim().toLowerCase()) ||
            (e.fullNameAr && e.fullNameAr.trim() === String(name).trim()) ||
            (e.fullNameEn && e.fullNameEn.trim().toLowerCase() === String(name).trim().toLowerCase())
        );
        if (match?.id) employeeId = match.id;
      }
    }
  }

  // 2. Vehicle ID resolution
  let vehicleId: string | undefined = undefined;

  if (entry.entityType === "Vehicle" && entry.entityId) {
    vehicleId = entry.entityId;
  } else {
    vehicleId =
      findDeepId(extracted, vehKeys) ||
      findDeepId(afterData, vehKeys) ||
      findDeepId(beforeData, vehKeys);

    if (!vehicleId && Array.isArray(entry.changes)) {
      for (const c of entry.changes) {
        if (!c?.field) continue;
        const lower = c.field.toLowerCase();
        if (vehKeys.some((k) => k.toLowerCase() === lower)) {
          const val = c.after !== null && c.after !== undefined ? c.after : c.before;
          if (val) {
            vehicleId = String(val);
            break;
          }
        }
      }
    }

    if (!vehicleId && entry.record?.entityType === "Vehicle" && entry.record.entityId) {
      vehicleId = entry.record.entityId;
    }

    // Check vehiclePeriodsMap for status period / sub-entity associations
    if (!vehicleId && vehiclePeriodsMap) {
      if (entry.entityId && vehiclePeriodsMap[entry.entityId]) {
        vehicleId = vehiclePeriodsMap[entry.entityId].vehicleId;
      } else if (afterData?.id && vehiclePeriodsMap[afterData.id]) {
        vehicleId = vehiclePeriodsMap[afterData.id].vehicleId;
      } else if (beforeData?.id && vehiclePeriodsMap[beforeData.id]) {
        vehicleId = vehiclePeriodsMap[beforeData.id].vehicleId;
      }
    }

    // Cross-reference correlationId in auditItems
    if (!vehicleId && auditItems && Array.isArray(auditItems) && entry.correlationId) {
      const corrItems = auditItems.filter(
        (it) => it.correlationId && it.correlationId === entry.correlationId && it.eventId !== entry.eventId
      );
      for (const it of corrItems) {
        if (it.entityType === "Vehicle" && it.entityId) {
          vehicleId = it.entityId;
          break;
        }
        const itAfter = safeJsonParse(it.afterJson);
        const itBefore = safeJsonParse(it.beforeJson);
        const found = findDeepId(itAfter, vehKeys) || findDeepId(itBefore, vehKeys);
        if (found) {
          vehicleId = found;
          break;
        }
      }
    }

    if (!vehicleId && vehiclesList && Array.isArray(vehiclesList)) {
      const plate =
        getFieldCaseInsensitive(extracted, "plateNumber", "plateNumberAr", "plateNumberEn", "licensePlate") ||
        resolved?.code;
      const chassis = getFieldCaseInsensitive(extracted, "chassisNumber", "vin");
      const seq = getFieldCaseInsensitive(extracted, "sequenceNumber");
      if (plate) {
        const cleanPlate = String(plate).replace(/\s+/g, "").toLowerCase();
        const match = vehiclesList.find((v: any) => {
          const vPlateAr = String(v.plateNumberAr || "").replace(/\s+/g, "").toLowerCase();
          const vPlateEn = String(v.plateNumberEn || "").replace(/\s+/g, "").toLowerCase();
          const vPlate = String(v.plateNumber || "").replace(/\s+/g, "").toLowerCase();
          return vPlateAr === cleanPlate || vPlateEn === cleanPlate || vPlate === cleanPlate;
        });
        if (match?.id) vehicleId = match.id;
      }
      if (!vehicleId && chassis) {
        const match = vehiclesList.find(
          (v: any) => String(v.chassisNumber || v.vin || "").toLowerCase() === String(chassis).toLowerCase()
        );
        if (match?.id) vehicleId = match.id;
      }
      if (!vehicleId && seq) {
        const match = vehiclesList.find(
          (v: any) => String(v.sequenceNumber || "").toLowerCase() === String(seq).toLowerCase()
        );
        if (match?.id) vehicleId = match.id;
      }
    }
  }

  return { employeeId, vehicleId };
}

/**
 * Resolves the destination route and action label for navigating directly to the business record
 * associated with an audit entry. Never provides fallback routes to generic pages when entity ID is unknown.
 */
export function getAuditRecordNavigation(
  entry: AuditEntry,
  resolved?: ResolvedAuditRecord,
  employeesList?: any[],
  vehiclesList?: any[],
  auditItems?: AuditEntry[],
  documentsMap?: Record<string, { employeeId: string; docName?: string; fileName?: string }>,
  vehiclePeriodsMap?: Record<string, { vehicleId: string; plateNumber?: string }>
): RecordNavigationInfo | null {
  const entityType = entry.entityType || "";
  const entityId = entry.entityId || "";
  const { employeeId, vehicleId } = extractTargetEntityIds(
    entry,
    resolved,
    employeesList,
    vehiclesList,
    auditItems,
    documentsMap,
    vehiclePeriodsMap
  );

  switch (entityType) {
    // --- Workforce & HR (Always route directly to employee profile!) ---
    case "Employee":
      return (employeeId || entityId)
        ? { url: `/admin/employees/${employeeId || entityId}`, labelAr: "الانتقال لملف الموظف", labelEn: "Go to Employee Profile" }
        : null;

    case "PayrollEmployee":
      return employeeId
        ? { url: `/admin/employees/${employeeId}`, labelAr: "الانتقال لملف الموظف", labelEn: "Go to Employee Profile" }
        : null;

    case "RiderProfile":
    case "RealRider":
      return employeeId
        ? { url: `/admin/employees/${employeeId}`, labelAr: "الانتقال لملف الموظف", labelEn: "Go to Employee Profile" }
        : null;

    case "EmployeeWorkHistory":
    case "EmployeeStatusChangeRequest":
    case "EmployeeTag":
      return employeeId
        ? { url: `/admin/employees/${employeeId}`, labelAr: "الانتقال لملف الموظف", labelEn: "Go to Employee Profile" }
        : null;

    case "JobTitle":
    case "ResidencyProfession":
    case "OperationalWorkType":
    case "JobTitleOperationalWorkType":
      return { url: "/admin/employees/work-types", labelAr: "الانتقال للمسميات والمهن", labelEn: "Go to Work Types" };

    case "Sponsor":
      return { url: "/admin/employees/sponsors", labelAr: "الانتقال للكفلاء", labelEn: "Go to Sponsors" };

    case "DriverLicenseCategory":
      return { url: "/admin/hr/compliance-expiries", labelAr: "الانتقال لانتهاء الصلاحيات والامتثال", labelEn: "Go to Compliance Expiries" };

    case "EmployeeDriverLicense":
    case "DriverLicense":
    case "RiderCard":
    case "RiderHealthCard":
    case "HealthCard":
    case "ResidencyPermit":
      return employeeId
        ? { url: `/admin/employees/${employeeId}`, labelAr: "الانتقال لملف الموظف", labelEn: "Go to Employee Profile" }
        : null;

    case "EmployeePromissoryNote":
    case "EmployeeDocument":
    case "EmployeeDocumentVersion":
      return employeeId
        ? { url: `/admin/employees/${employeeId}`, labelAr: "الانتقال لملف الموظف", labelEn: "Go to Employee Profile" }
        : null;

    case "HrFormTemplate":
    case "HrFormTemplateVersion":
      return { url: "/admin/hr/forms", labelAr: "الانتقال للنماذج الإدارية", labelEn: "Go to HR Forms" };

    case "InsuranceCompany":
    case "InsurancePlanLevel":
      return { url: "/admin/hr/insurance", labelAr: "الانتقال للتأمين الطبي", labelEn: "Go to Medical Insurance" };

    case "EmployeeMedicalInsurancePolicy":
    case "MedicalInsurance":
      return employeeId
        ? { url: `/admin/employees/${employeeId}`, labelAr: "الانتقال لملف الموظف", labelEn: "Go to Employee Profile" }
        : null;

    case "LeaveType":
    case "LeaveApprovalWorkflow":
    case "LeaveApprovalWorkflowStep":
    case "LeaveApprovalDecision":
      return { url: "/admin/hr/leave-requests", labelAr: "الانتقال لطلبات الإجازات", labelEn: "Go to Leave Requests" };

    case "LeaveRequest":
    case "LeaveDateChangeRequest":
    case "LeaveCancellationRequest":
    case "LeaveRequestDocument":
    case "LeaveRequestDocumentVersion":
      return employeeId
        ? { url: `/admin/employees/${employeeId}`, labelAr: "الانتقال لملف الموظف", labelEn: "Go to Employee Profile" }
        : null;

    case "EmployeeAbsenceComplianceCase":
    case "EmployeeAbsenceComplianceCaseEvent":
      return employeeId
        ? { url: `/admin/employees/${employeeId}`, labelAr: "الانتقال لملف الموظف", labelEn: "Go to Employee Profile" }
        : null;

    case "HrLegalCase":
    case "LegalCase":
      return entityId
        ? { url: `/admin/hr/legal-cases/${entityId}`, labelAr: "الانتقال لملف القضية", labelEn: "Go to Legal Case" }
        : { url: "/admin/hr/legal-cases", labelAr: "الانتقال إلى القضايا القانونية", labelEn: "Go to Legal Cases" };

    case "HrLegalCaseHearing":
    case "HrLegalCaseHearingFile":
    case "HrLegalCaseHistory":
      return { url: "/admin/hr/legal-cases", labelAr: "الانتقال إلى القضايا القانونية", labelEn: "Go to Legal Cases" };

    // --- Housing ---
    case "Housing":
    case "HousingRoom":
    case "HousingSupervisorPeriod":
    case "HousingTag":
      return { url: "/admin/housing", labelAr: "الانتقال لإدارة السكن", labelEn: "Go to Housing" };

    case "HousingResidencePeriod":
      return employeeId
        ? { url: `/admin/employees/${employeeId}`, labelAr: "الانتقال لملف الموظف", labelEn: "Go to Employee Profile" }
        : null;

    // --- Client Platforms, Contracts, and Rider Accounts ---
    case "ClientContract":
    case "ClientContractTag":
    case "ClientPlatform":
      return { url: "/admin/platforms", labelAr: "الانتقال لمنصات العملاء", labelEn: "Go to Client Platforms" };

    case "PlatformRiderAccount":
    case "PlatformAccountCredentialVersion":
    case "PlatformAccountRegistration":
    case "PlatformRiderAccountTag":
    case "PlatformAccount":
      return employeeId
        ? { url: `/admin/employees/${employeeId}`, labelAr: "الانتقال لملف الموظف", labelEn: "Go to Employee Profile" }
        : null;

    case "RiderClientAssignment":
    case "RiderAssignmentEvent":
      return employeeId
        ? { url: `/admin/employees/${employeeId}`, labelAr: "الانتقال لملف الموظف", labelEn: "Go to Employee Profile" }
        : null;

    // --- Documents and Tags ---
    case "DocumentType":
    case "DocumentRequirement":
    case "Tag":
      return { url: "/admin/hr/catalogs", labelAr: "الانتقال لدليل الوثائق والتصنيفات", labelEn: "Go to Document Catalogs" };

    // --- System & Reference ---
    case "CompanyProfile":
      return { url: "/admin", labelAr: "الانتقال لملف المنشأة", labelEn: "Go to Company Profile" };

    case "GlobalCity":
    case "OperatingCity":
      return { url: "/admin/employees/cities", labelAr: "الانتقال لدليل المدن", labelEn: "Go to Cities" };

    case "PermissionDefinition":
    case "Permission":
      return { url: "/admin/users/permissions", labelAr: "الانتقال للصلاحيات", labelEn: "Go to Permissions" };

    case "Notification":
    case "ExportJob":
    case "SavedView":
      return { url: "/admin", labelAr: "الانتقال للنظام", labelEn: "Go to System" };

    // --- Fleet, Vehicle Records, Compliance, and Incidents ---
    case "VehicleManufacturer":
    case "VehicleModel":
    case "VehicleSupplier":
      return { url: "/admin/fleet/catalogs", labelAr: "الانتقال لدليل الأسطول", labelEn: "Go to Fleet Catalogs" };

    case "Vehicle":
      return (vehicleId || entityId)
        ? { url: `/admin/fleet/vehicles/${vehicleId || entityId}`, labelAr: "الانتقال لملف المركبة", labelEn: "Go to Vehicle Details" }
        : null;

    case "VehicleIdentityCorrection":
    case "VehicleRegistrationTransition":
    case "VehicleRegistrationTransitionSnapshot":
    case "VehicleOperationalStatusPeriod":
    case "VehicleOdometerReading":
    case "VehicleAttachment":
    case "VehicleAttachmentVersion":
      return vehicleId
        ? { url: `/admin/fleet/vehicles/${vehicleId}`, labelAr: "الانتقال لملف المركبة", labelEn: "Go to Vehicle Details" }
        : null;

    case "VehicleRegistration":
    case "VehicleInsurancePolicy":
    case "VehiclePeriodicInspection":
    case "VehicleOperationCard":
      return vehicleId
        ? { url: `/admin/fleet/vehicles/${vehicleId}`, labelAr: "الانتقال لملف المركبة", labelEn: "Go to Vehicle Details" }
        : null;

    case "VehicleDailyDistance":
    case "VehicleDailyDistanceImport":
      return vehicleId
        ? { url: `/admin/fleet/vehicles/${vehicleId}`, labelAr: "الانتقال لملف المركبة", labelEn: "Go to Vehicle Details" }
        : null;

    case "RiderVehicleAssignment":
    case "RiderVehicleAssignmentEvent":
    case "RiderVehicleAssignmentPromissoryFile":
    case "RiderPromissoryFile":
    case "RiderPromissoryFileVersion":
      if (vehicleId) {
        return { url: `/admin/fleet/vehicles/${vehicleId}`, labelAr: "الانتقال لملف المركبة", labelEn: "Go to Vehicle Details" };
      }
      if (employeeId) {
        return { url: `/admin/employees/${employeeId}`, labelAr: "الانتقال لملف الموظف", labelEn: "Go to Employee Profile" };
      }
      return null;

    case "SponsorVehicleLeaseAgreement":
    case "SponsorVehicleLeaseAgreementVehicle":
    case "FleetCommandReceipt":
      return vehicleId
        ? { url: `/admin/fleet/vehicles/${vehicleId}`, labelAr: "الانتقال لملف المركبة", labelEn: "Go to Vehicle Details" }
        : null;

    case "VehiclePlatformAccountAssignment":
    case "VehiclePlatformAccountSwitch":
      return vehicleId
        ? { url: `/admin/fleet/vehicles/${vehicleId}`, labelAr: "الانتقال لملف المركبة", labelEn: "Go to Vehicle Details" }
        : null;

    case "VehicleIssue":
    case "VehicleIssueEvidence":
    case "VehicleIssueEvent":
      return vehicleId
        ? { url: `/admin/fleet/vehicles/${vehicleId}`, labelAr: "الانتقال لملف المركبة", labelEn: "Go to Vehicle Details" }
        : null;

    case "VehicleAccident":
    case "VehicleAccidentCase":
    case "VehicleAccidentInstallment":
    case "VehicleAccidentEvent":
    case "VehicleAccidentAttachment":
    case "VehicleAccidentReportVersion":
    case "Accident":
      return vehicleId
        ? { url: `/admin/fleet/vehicles/${vehicleId}`, labelAr: "الانتقال لملف المركبة", labelEn: "Go to Vehicle Details" }
        : null;

    // --- Fuel ---
    case "FuelCard":
    case "FuelCardImport":
      return { url: "/admin/fleet/fuel-cards", labelAr: "الانتقال لبطاقات الوقود", labelEn: "Go to Fuel Cards" };

    case "FuelCardRiderAssignment":
    case "FuelCardMonthlyUsage":
      if (vehicleId) {
        return { url: `/admin/fleet/vehicles/${vehicleId}`, labelAr: "الانتقال لملف المركبة", labelEn: "Go to Vehicle Details" };
      }
      if (employeeId) {
        return { url: `/admin/employees/${employeeId}`, labelAr: "الانتقال لملف الموظف", labelEn: "Go to Employee Profile" };
      }
      return null;

    // --- Maintenance, Inventory, Oil, and Workshop Finance ---
    case "MaintenanceLocation":
    case "InventoryLocation":
      return { url: "/admin/maintenance/setup/locations", labelAr: "الانتقال للمواقع والمستودعات", labelEn: "Go to Locations" };

    case "InventoryItem":
      return { url: "/admin/maintenance/setup/items", labelAr: "الانتقال لأصناف المستودع", labelEn: "Go to Inventory Items" };

    case "MaintenanceSupplier":
    case "PurchaseReceipt":
    case "PurchaseReceiptLine":
    case "PurchaseReceiptAttachment":
    case "SupplierReturn":
    case "SupplierReturnLine":
    case "InventorySupplyRequest":
    case "InventorySupplyRequestLine":
      return { url: "/admin/maintenance/setup/suppliers", labelAr: "الانتقال للموردين والمشتريات", labelEn: "Go to Suppliers" };

    case "MaintenancePlan":
      return { url: "/admin/maintenance/setup/plans", labelAr: "الانتقال لخطط الصيانة", labelEn: "Go to Maintenance Plans" };

    case "StockBalance":
    case "StockCostLayer":
    case "StockMovement":
    case "StockMovementLine":
    case "StockCostAllocation":
    case "OilBarrel":
    case "OilBarrelUsageAllocation":
    case "OilBarrelLoss":
      return { url: "/admin/maintenance/inventory/barrels", labelAr: "الانتقال لمخزون الزيوت والمستودع", labelEn: "Go to Oil & Inventory" };

    case "RiderInventoryIssue":
    case "RiderInventoryIssueLine":
      return employeeId
        ? { url: `/admin/employees/${employeeId}`, labelAr: "الانتقال لملف الموظف", labelEn: "Go to Employee Profile" }
        : null;

    case "StockTransfer":
    case "StockTransferLine":
      return { url: "/admin/maintenance/inventory/transfers", labelAr: "الانتقال لتحويلات المخزون", labelEn: "Go to Stock Transfers" };

    case "MaintenanceWorkOrder":
    case "MaintenanceMaterialUsage":
    case "MaintenanceLaborEntry":
    case "VehicleMaintenanceSchedule":
    case "OilChangeOperation":
    case "VehicleExpense":
    case "Maintenance":
    case "WorkOrder":
      return vehicleId
        ? { url: `/admin/fleet/vehicles/${vehicleId}`, labelAr: "الانتقال لملف المركبة", labelEn: "Go to Vehicle Details" }
        : null;

    case "ExternalVehicleSnapshot":
    case "ExternalPartSaleLine":
      return vehicleId
        ? { url: `/admin/fleet/vehicles/${vehicleId}`, labelAr: "الانتقال لملف المركبة", labelEn: "Go to Vehicle Details" }
        : null;

    case "ExternalMaintenanceFinancialEntry":
    case "ExternalCustomerPayment":
      return { url: "/admin/maintenance/workshops/profit", labelAr: "الانتقال للتقرير المالي للورشة", labelEn: "Go to Workshop Finance" };

    // --- Telecom ---
    case "PhoneSimCard":
      return { url: "/admin/fleet/phone-sims", labelAr: "الانتقال لشرائح الاتصال", labelEn: "Go to Phone SIMs" };

    case "RiderPhoneSimAssignment":
    case "PhoneSimResponsibilityChange":
      return employeeId
        ? { url: `/admin/employees/${employeeId}`, labelAr: "الانتقال لملف الموظف", labelEn: "Go to Employee Profile" }
        : null;

    // --- Identity ---
    case "User":
      return entityId
        ? { url: `/admin/users/${entityId}`, labelAr: "الانتقال لحساب المستخدم", labelEn: "Go to User Profile" }
        : { url: "/admin/users", labelAr: "الانتقال إلى المستخدمين", labelEn: "Go to Users" };

    case "Role":
      return { url: "/admin/users/roles", labelAr: "الانتقال للأدوار والصلاحيات", labelEn: "Go to Roles & Permissions" };

    default:
      return null;
  }
}

/**
 * Resolves destination navigation for any ID field in the changes table (e.g. EmployeeId, Id, VehicleId, UserId, etc.)
 */
export function getChangeValueNavigation(
  field: string,
  rawId: string | undefined,
  entry: AuditEntry,
  employeesList?: any[],
  vehiclesList?: any[],
  auditItems?: AuditEntry[],
  documentsMap?: Record<string, { employeeId: string; docName?: string; fileName?: string }>,
  vehiclePeriodsMap?: Record<string, { vehicleId: string; plateNumber?: string }>
): RecordNavigationInfo | null {
  if (!rawId) return null;

  // 1. If field is "Id" or "EntityId", it refers to the entry's main record
  if (field === "Id" || field === "EntityId") {
    const nav = getAuditRecordNavigation(
      {
        ...entry,
        entityId: rawId,
      },
      undefined,
      employeesList,
      vehiclesList,
      auditItems,
      documentsMap,
      vehiclePeriodsMap
    );
    if (nav) return nav;
  }

  // 2. Employee references
  if (
    field === "EmployeeId" ||
    field === "PayrollEmployeeId" ||
    field === "RiderProfileId" ||
    field === "RiderId" ||
    field === "AssignedEmployeeId" ||
    field === "RealRiderId"
  ) {
    return {
      url: `/admin/employees/${rawId}`,
      labelAr: "الانتقال لملف الموظف",
      labelEn: "Go to Employee Profile",
    };
  }

  // 3. User references
  if (field === "UserId" || field === "ActorUserId") {
    return {
      url: `/admin/users/${rawId}`,
      labelAr: "الانتقال لحساب المستخدم",
      labelEn: "Go to User Profile",
    };
  }

  // 4. Vehicle references
  if (
    field === "VehicleId" ||
    field === "TargetVehicleId" ||
    field === "AssignedVehicleId"
  ) {
    return {
      url: `/admin/fleet/vehicles/${rawId}`,
      labelAr: "الانتقال لملف المركبة",
      labelEn: "Go to Vehicle Profile",
    };
  }

  // 5. Fuel Card references
  if (field === "FuelCardId") {
    return {
      url: "/admin/fleet/fuel-cards",
      labelAr: "الانتقال لبطاقات الوقود",
      labelEn: "Go to Fuel Cards",
    };
  }

  // 6. Work Order references
  if (field === "WorkOrderId") {
    return {
      url: "/admin/maintenance/work-orders/orders",
      labelAr: "الانتقال لأمر الصيانة",
      labelEn: "Go to Work Order",
    };
  }

  // 7. Legal Case references
  if (field === "LegalCaseId" || field === "HrLegalCaseId") {
    return {
      url: `/admin/hr/legal-cases/${rawId}`,
      labelAr: "الانتقال للقضية القانونية",
      labelEn: "Go to Legal Case",
    };
  }

  // 8. Document Type / Requirement
  if (field === "DocumentTypeId" || field === "DocumentRequirementId") {
    return {
      url: "/admin/hr/catalogs",
      labelAr: "الانتقال لدليل الوثائق",
      labelEn: "Go to Document Catalogs",
    };
  }

  // 9. Document Version
  if (field === "CurrentVersionId" || field === "VersionId") {
    const { employeeId } = extractTargetEntityIds(
      entry,
      undefined,
      employeesList,
      vehiclesList,
      auditItems,
      documentsMap
    );
    if (employeeId) {
      return {
        url: `/admin/employees/${employeeId}`,
        labelAr: "الانتقال لملف الموظف",
        labelEn: "Go to Employee Profile",
      };
    }
    return null;
  }

  // 10. Role
  if (field === "RoleId") {
    return {
      url: "/admin/users/roles",
      labelAr: "الانتقال للأدوار والصلاحيات",
      labelEn: "Go to Roles & Permissions",
    };
  }

  // 11. Housing
  if (field === "HousingId" || field === "HousingRoomId") {
    return {
      url: "/admin/housing",
      labelAr: "الانتقال لإدارة السكن",
      labelEn: "Go to Housing",
    };
  }

  // 12. Sponsor
  if (field === "SponsorId") {
    return {
      url: "/admin/employees/sponsors",
      labelAr: "الانتقال للكفلاء",
      labelEn: "Go to Sponsors",
    };
  }

  // 13. Job Title
  if (field === "JobTitleId") {
    return {
      url: "/admin/employees/work-types",
      labelAr: "الانتقال للمسميات والوظائف",
      labelEn: "Go to Job Titles",
    };
  }

  // 14. Contract
  if (field === "ContractId" || field === "ClientContractId") {
    return {
      url: "/admin/platforms",
      labelAr: "الانتقال لعقود العملاء",
      labelEn: "Go to Client Contracts",
    };
  }

  // 15. SIM
  if (field === "PhoneSimCardId" || field === "SimCardId") {
    return {
      url: "/admin/fleet/phone-sims",
      labelAr: "الانتقال لشرائح الاتصال",
      labelEn: "Go to Phone SIMs",
    };
  }

  // 16. Inventory Item
  if (field === "InventoryItemId") {
    return {
      url: "/admin/maintenance/setup/items",
      labelAr: "الانتقال لأصناف المستودع",
      labelEn: "Go to Inventory Items",
    };
  }

  // 17. Generic fallback: if field ends with Id, check if entity name is in config
  const possibleEntity = field.replace(/Id$/, "");
  const genericNav = getAuditRecordNavigation(
    {
      ...entry,
      entityType: possibleEntity,
      entityId: rawId,
    },
    undefined,
    employeesList,
    vehiclesList,
    auditItems,
    documentsMap
  );
  if (genericNav) {
    return genericNav;
  }

  return null;
}

