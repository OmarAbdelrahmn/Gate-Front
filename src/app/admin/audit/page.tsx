"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Server,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  PlusCircle,
  Edit3,
  Trash2,
  CheckCircle,
  Activity,
  X,
  Calendar,
  SlidersHorizontal,
  FileSpreadsheet,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { getAuditEntries } from "@/lib/audit/api";
import type { AuditEntry, AuditEntriesParams } from "@/lib/audit/types";
import { AuditEntryDetailModal } from "@/components/audit/AuditEntryDetailModal";
import { resolveAuditRecordInfo, getAuditRecordNavigation, shouldIgnoreAuditEntry } from "@/lib/audit/audit-resolver";
import { getDocumentTypes, getEmployeeActualDocuments } from "@/lib/workforce/documents-api";
import { listUsers } from "@/lib/users/api";
import type { ManagedUser } from "@/lib/users/types";
import { listEmployees } from "@/lib/workforce/api";
import { getVehicles, getVehicleStatusHistory } from "@/lib/fleet/api";
import type { SelectOption } from "@/components/ui/SearchableSelect";
import { TableHeaderColumnFilter, type FilterOption } from "@/app/admin/fleet/vehicles/components/TableHeaderFilter";
import { exportToExcel } from "@/lib/export-excel";

const COMMON_ENTITY_TYPES = [
  { value: "ALL", label: "كافة الكيانات", labelEn: "All Entity Types" },

  // --- Platform and Reference Data ---
  { value: "CompanyProfile", label: "ملف الشركة (CompanyProfile)", labelEn: "Company Profile" },
  { value: "GlobalCity", label: "مدينة عالمية (GlobalCity)", labelEn: "Global City" },
  { value: "OperatingCity", label: "مدينة تشغيل (OperatingCity)", labelEn: "Operating City" },
  { value: "ClientPlatform", label: "منصة عميل (ClientPlatform)", labelEn: "Client Platform" },
  { value: "PermissionDefinition", label: "تعريف الصلاحية (PermissionDefinition)", labelEn: "Permission Definition" },

  // --- Workforce, HR, Legal, Leave, and Compliance ---
  { value: "Employee", label: "موظف (Employee)", labelEn: "Employee" },
  { value: "PayrollEmployee", label: "موظف مسير رواتب (PayrollEmployee)", labelEn: "Payroll Employee" },
  { value: "RiderProfile", label: "ملف سائق (RiderProfile)", labelEn: "Rider Profile" },
  { value: "RealRider", label: "سائق فعلي (RealRider)", labelEn: "Real Rider" },
  { value: "EmployeeWorkHistory", label: "سجل عمل موظف (EmployeeWorkHistory)", labelEn: "Employee Work History" },
  { value: "JobTitle", label: "مسمى وظيفي (JobTitle)", labelEn: "Job Title" },
  { value: "Sponsor", label: "كفيل (Sponsor)", labelEn: "Sponsor" },
  { value: "ResidencyProfession", label: "مهنة إقامة (ResidencyProfession)", labelEn: "Residency Profession" },
  { value: "OperationalWorkType", label: "نوع عمل تشغيلي (OperationalWorkType)", labelEn: "Operational Work Type" },
  { value: "JobTitleOperationalWorkType", label: "ربط المسمى بنوع العمل (JobTitleOperationalWorkType)", labelEn: "Job Title Work Type" },
  { value: "DriverLicenseCategory", label: "فئة رخصة قيادة (DriverLicenseCategory)", labelEn: "Driver License Category" },
  { value: "EmployeeDriverLicense", label: "رخصة قيادة موظف (EmployeeDriverLicense)", labelEn: "Employee Driver License" },
  { value: "RiderCard", label: "بطاقة سائق (RiderCard)", labelEn: "Rider Card" },
  { value: "RiderHealthCard", label: "شهادة صحية لسائق (RiderHealthCard)", labelEn: "Rider Health Card" },
  { value: "EmployeePromissoryNote", label: "سند لأمر موظف (EmployeePromissoryNote)", labelEn: "Promissory Note" },
  { value: "HrFormTemplate", label: "نموذج شؤون موظفين (HrFormTemplate)", labelEn: "HR Form Template" },
  { value: "HrFormTemplateVersion", label: "نسخة نموذج إداري (HrFormTemplateVersion)", labelEn: "HR Form Template Version" },
  { value: "InsuranceCompany", label: "شركة تأمين (InsuranceCompany)", labelEn: "Insurance Company" },
  { value: "InsurancePlanLevel", label: "فئة تأمين طبي (InsurancePlanLevel)", labelEn: "Insurance Plan Level" },
  { value: "EmployeeMedicalInsurancePolicy", label: "تأمين طبي لموظف (EmployeeMedicalInsurancePolicy)", labelEn: "Medical Insurance Policy" },
  { value: "LeaveType", label: "نوع إجازة (LeaveType)", labelEn: "Leave Type" },
  { value: "LeaveRequest", label: "طلب إجازة (LeaveRequest)", labelEn: "Leave Request" },
  { value: "LeaveApprovalWorkflow", label: "مسار اعتماد إجازة (LeaveApprovalWorkflow)", labelEn: "Leave Approval Workflow" },
  { value: "LeaveApprovalWorkflowStep", label: "خطوة اعتماد إجازة (LeaveApprovalWorkflowStep)", labelEn: "Leave Workflow Step" },
  { value: "LeaveApprovalDecision", label: "قرار اعتماد إجازة (LeaveApprovalDecision)", labelEn: "Leave Approval Decision" },
  { value: "LeaveDateChangeRequest", label: "طلب تعديل موعد إجازة (LeaveDateChangeRequest)", labelEn: "Leave Date Change Request" },
  { value: "LeaveCancellationRequest", label: "طلب إلغاء إجازة (LeaveCancellationRequest)", labelEn: "Leave Cancellation Request" },
  { value: "LeaveRequestDocument", label: "مستند طلب إجازة (LeaveRequestDocument)", labelEn: "Leave Request Document" },
  { value: "LeaveRequestDocumentVersion", label: "نسخة مستند إجازة (LeaveRequestDocumentVersion)", labelEn: "Leave Document Version" },
  { value: "EmployeeAbsenceComplianceCase", label: "حالة امتثال غياب (EmployeeAbsenceComplianceCase)", labelEn: "Absence Compliance Case" },
  { value: "EmployeeAbsenceComplianceCaseEvent", label: "حدث امتثال غياب (EmployeeAbsenceComplianceCaseEvent)", labelEn: "Absence Case Event" },
  { value: "EmployeeStatusChangeRequest", label: "طلب تغيير حالة موظف (EmployeeStatusChangeRequest)", labelEn: "Status Change Request" },
  { value: "HrLegalCase", label: "قضية قانونية (HrLegalCase)", labelEn: "Legal Case" },
  { value: "HrLegalCaseHearing", label: "جلسة قضائية (HrLegalCaseHearing)", labelEn: "Legal Case Hearing" },
  { value: "HrLegalCaseHearingFile", label: "مستند جلسة قضائية (HrLegalCaseHearingFile)", labelEn: "Hearing File" },
  { value: "HrLegalCaseHistory", label: "سجل القضية القانونية (HrLegalCaseHistory)", labelEn: "Legal Case History" },

  // --- Housing ---
  { value: "Housing", label: "سكن (Housing)", labelEn: "Housing" },
  { value: "HousingRoom", label: "غرفة سكن (HousingRoom)", labelEn: "Housing Room" },
  { value: "HousingSupervisorPeriod", label: "فترة إشراف سكن (HousingSupervisorPeriod)", labelEn: "Housing Supervisor Period" },
  { value: "HousingResidencePeriod", label: "فترة إقامة سكن (HousingResidencePeriod)", labelEn: "Residence Period" },

  // --- Client Platforms, Contracts, and Rider Accounts ---
  { value: "ClientContract", label: "عقد عميل (ClientContract)", labelEn: "Client Contract" },
  { value: "PlatformRiderAccount", label: "حساب منصة لسائق (PlatformRiderAccount)", labelEn: "Platform Rider Account" },
  { value: "PlatformAccountCredentialVersion", label: "بيانات اعتماد منصة (PlatformAccountCredentialVersion)", labelEn: "Credential Version" },
  { value: "RiderClientAssignment", label: "تعيين سائق لعميل (RiderClientAssignment)", labelEn: "Rider Client Assignment" },
  { value: "RiderAssignmentEvent", label: "حدث تعيين سائق (RiderAssignmentEvent)", labelEn: "Rider Assignment Event" },
  { value: "PlatformAccountRegistration", label: "تسجيل حساب منصة (PlatformAccountRegistration)", labelEn: "Platform Account Registration" },

  // --- Documents and Tags ---
  { value: "DocumentType", label: "نوع وثيقة (DocumentType)", labelEn: "Document Type" },
  { value: "DocumentRequirement", label: "متطلب وثيقة (DocumentRequirement)", labelEn: "Document Requirement" },
  { value: "EmployeeDocument", label: "وثيقة موظف (EmployeeDocument)", labelEn: "Employee Document" },
  { value: "EmployeeDocumentVersion", label: "نسخة وثيقة موظف (EmployeeDocumentVersion)", labelEn: "Document Version" },
  { value: "Tag", label: "وسم (Tag)", labelEn: "Tag" },
  { value: "EmployeeTag", label: "وسم موظف (EmployeeTag)", labelEn: "Employee Tag" },
  { value: "HousingTag", label: "وسم سكن (HousingTag)", labelEn: "Housing Tag" },
  { value: "ClientContractTag", label: "وسم عقد عميل (ClientContractTag)", labelEn: "Contract Tag" },
  { value: "PlatformRiderAccountTag", label: "وسم حساب منصة (PlatformRiderAccountTag)", labelEn: "Platform Account Tag" },

  // --- System Operations ---
  { value: "Notification", label: "إشعار نظام (Notification)", labelEn: "Notification" },
  { value: "ExportJob", label: "مهمة تصدير (ExportJob)", labelEn: "Export Job" },
  { value: "SavedView", label: "طريقة عرض محفوظة (SavedView)", labelEn: "Saved View" },

  // --- Fleet, Vehicle Records, Compliance, and Incidents ---
  { value: "VehicleManufacturer", label: "صانع مركبة (VehicleManufacturer)", labelEn: "Vehicle Manufacturer" },
  { value: "VehicleModel", label: "موديل مركبة (VehicleModel)", labelEn: "Vehicle Model" },
  { value: "VehicleSupplier", label: "مورد مركبات (VehicleSupplier)", labelEn: "Vehicle Supplier" },
  { value: "Vehicle", label: "مركبة (Vehicle)", labelEn: "Vehicle" },
  { value: "VehicleIdentityCorrection", label: "تصحيح بيانات مركبة (VehicleIdentityCorrection)", labelEn: "Identity Correction" },
  { value: "VehicleRegistrationTransition", label: "تحويل تسجيل مركبة (VehicleRegistrationTransition)", labelEn: "Registration Transition" },
  { value: "VehicleRegistrationTransitionSnapshot", label: "لقطة تحويل التسجيل (VehicleRegistrationTransitionSnapshot)", labelEn: "Transition Snapshot" },
  { value: "VehicleOperationalStatusPeriod", label: "فترة الحالة التشغيلية (VehicleOperationalStatusPeriod)", labelEn: "Status Period" },
  { value: "VehicleOdometerReading", label: "قراءة عداد مسافات (VehicleOdometerReading)", labelEn: "Odometer Reading" },
  { value: "VehicleDailyDistance", label: "مسافة يومية لمركبة (VehicleDailyDistance)", labelEn: "Daily Distance" },
  { value: "VehicleDailyDistanceImport", label: "استيراد مسافات يومية (VehicleDailyDistanceImport)", labelEn: "Daily Distance Import" },
  { value: "RiderVehicleAssignment", label: "تعيين مركبة لسائق (RiderVehicleAssignment)", labelEn: "Rider Vehicle Assignment" },
  { value: "SponsorVehicleLeaseAgreement", label: "عقد إيجار مركبة كفيل (SponsorVehicleLeaseAgreement)", labelEn: "Sponsor Lease Agreement" },
  { value: "SponsorVehicleLeaseAgreementVehicle", label: "مركبة عقد إيجار (SponsorVehicleLeaseAgreementVehicle)", labelEn: "Lease Agreement Vehicle" },
  { value: "VehiclePlatformAccountAssignment", label: "ربط مركبة بمنصة (VehiclePlatformAccountAssignment)", labelEn: "Platform Assignment" },
  { value: "VehiclePlatformAccountSwitch", label: "تحويل منصة مركبة (VehiclePlatformAccountSwitch)", labelEn: "Platform Switch" },
  { value: "RiderVehicleAssignmentEvent", label: "حدث تعيين مركبة (RiderVehicleAssignmentEvent)", labelEn: "Vehicle Assignment Event" },
  { value: "RiderVehicleAssignmentPromissoryFile", label: "سند تعيين مركبة (RiderVehicleAssignmentPromissoryFile)", labelEn: "Assignment Promissory File" },
  { value: "FleetCommandReceipt", label: "إيصال أمر أسطول (FleetCommandReceipt)", labelEn: "Fleet Command Receipt" },
  { value: "VehicleRegistration", label: "رخصة سير / استمارة (VehicleRegistration)", labelEn: "Vehicle Registration" },
  { value: "VehicleInsurancePolicy", label: "وثيقة تأمين مركبة (VehicleInsurancePolicy)", labelEn: "Vehicle Insurance Policy" },
  { value: "VehiclePeriodicInspection", label: "فحص دوري للمركبة (VehiclePeriodicInspection)", labelEn: "Periodic Inspection" },
  { value: "VehicleOperationCard", label: "كرت تشغيل مركبة (VehicleOperationCard)", labelEn: "Vehicle Operation Card" },
  { value: "VehicleAttachment", label: "مرفق مركبة (VehicleAttachment)", labelEn: "Vehicle Attachment" },
  { value: "VehicleAttachmentVersion", label: "نسخة مرفق مركبة (VehicleAttachmentVersion)", labelEn: "Attachment Version" },
  { value: "RiderPromissoryFile", label: "سند لأمر سائق (RiderPromissoryFile)", labelEn: "Rider Promissory File" },
  { value: "RiderPromissoryFileVersion", label: "نسخة سند سائق (RiderPromissoryFileVersion)", labelEn: "Promissory Version" },
  { value: "VehicleIssue", label: "بلاغ / مشكلة مركبة (VehicleIssue)", labelEn: "Vehicle Issue" },
  { value: "VehicleIssueEvidence", label: "دليل مشكلة مركبة (VehicleIssueEvidence)", labelEn: "Issue Evidence" },
  { value: "VehicleIssueEvent", label: "حدث مشكلة مركبة (VehicleIssueEvent)", labelEn: "Issue Event" },
  { value: "VehicleAccident", label: "حادث مركبة (VehicleAccident)", labelEn: "Vehicle Accident" },
  { value: "VehicleAccidentCase", label: "ملف قضية حادث (VehicleAccidentCase)", labelEn: "Accident Case" },
  { value: "VehicleAccidentInstallment", label: "قسط تعويض حادث (VehicleAccidentInstallment)", labelEn: "Accident Installment" },
  { value: "VehicleAccidentEvent", label: "حدث حادث مركبة (VehicleAccidentEvent)", labelEn: "Accident Event" },
  { value: "VehicleAccidentAttachment", label: "مرفق حادث مركبة (VehicleAccidentAttachment)", labelEn: "Accident Attachment" },
  { value: "VehicleAccidentReportVersion", label: "نسخة تقرير حادث (VehicleAccidentReportVersion)", labelEn: "Report Version" },

  // --- Fuel ---
  { value: "FuelCard", label: "بطاقة وقود (FuelCard)", labelEn: "Fuel Card" },
  { value: "FuelCardRiderAssignment", label: "تعيين بطاقة وقود (FuelCardRiderAssignment)", labelEn: "Fuel Card Assignment" },
  { value: "FuelCardMonthlyUsage", label: "استهلاك شهري للوقود (FuelCardMonthlyUsage)", labelEn: "Monthly Fuel Usage" },
  { value: "FuelCardImport", label: "استيراد بيانات وقود (FuelCardImport)", labelEn: "Fuel Card Import" },

  // --- Maintenance, Inventory, Oil, and Workshop Finance ---
  { value: "MaintenanceLocation", label: "موقع صيانة (MaintenanceLocation)", labelEn: "Maintenance Location" },
  { value: "InventoryLocation", label: "موقع مستودع (InventoryLocation)", labelEn: "Inventory Location" },
  { value: "InventoryItem", label: "صنف مستودع (InventoryItem)", labelEn: "Inventory Item" },
  { value: "MaintenanceSupplier", label: "مورد صيانة (MaintenanceSupplier)", labelEn: "Maintenance Supplier" },
  { value: "StockBalance", label: "رصيد مخزون (StockBalance)", labelEn: "Stock Balance" },
  { value: "StockCostLayer", label: "طبقة تكلفة المخزون (StockCostLayer)", labelEn: "Stock Cost Layer" },
  { value: "StockMovement", label: "حركة مخزون (StockMovement)", labelEn: "Stock Movement" },
  { value: "StockMovementLine", label: "بند حركة مخزون (StockMovementLine)", labelEn: "Stock Movement Line" },
  { value: "StockCostAllocation", label: "توزيع تكلفة مخزون (StockCostAllocation)", labelEn: "Stock Cost Allocation" },
  { value: "PurchaseReceipt", label: "إيصال استلام مشتريات (PurchaseReceipt)", labelEn: "Purchase Receipt" },
  { value: "PurchaseReceiptLine", label: "بند إيصال مشتريات (PurchaseReceiptLine)", labelEn: "Purchase Receipt Line" },
  { value: "PurchaseReceiptAttachment", label: "مرفق إيصال مشتريات (PurchaseReceiptAttachment)", labelEn: "Receipt Attachment" },
  { value: "OilBarrel", label: "برميل زيت (OilBarrel)", labelEn: "Oil Barrel" },
  { value: "OilBarrelUsageAllocation", label: "توزيع استهلاك زيت (OilBarrelUsageAllocation)", labelEn: "Oil Usage Allocation" },
  { value: "OilBarrelLoss", label: "فاقد / هدر زيت (OilBarrelLoss)", labelEn: "Oil Barrel Loss" },
  { value: "StockTransfer", label: "تحويل مخزون (StockTransfer)", labelEn: "Stock Transfer" },
  { value: "StockTransferLine", label: "بند تحويل مخزون (StockTransferLine)", labelEn: "Stock Transfer Line" },
  { value: "SupplierReturn", label: "مرتجع لمورد (SupplierReturn)", labelEn: "Supplier Return" },
  { value: "SupplierReturnLine", label: "بند مرتجع لمورد (SupplierReturnLine)", labelEn: "Supplier Return Line" },
  { value: "RiderInventoryIssue", label: "صرف مستودع لسائق (RiderInventoryIssue)", labelEn: "Rider Inventory Issue" },
  { value: "RiderInventoryIssueLine", label: "بند صرف لسائق (RiderInventoryIssueLine)", labelEn: "Rider Issue Line" },
  { value: "InventorySupplyRequest", label: "طلب توريد مستودع (InventorySupplyRequest)", labelEn: "Supply Request" },
  { value: "InventorySupplyRequestLine", label: "بند طلب توريد (InventorySupplyRequestLine)", labelEn: "Supply Request Line" },
  { value: "MaintenanceWorkOrder", label: "أمر عمل صيانة (MaintenanceWorkOrder)", labelEn: "Maintenance Work Order" },
  { value: "ExternalVehicleSnapshot", label: "مركبة صيانة خارجية (ExternalVehicleSnapshot)", labelEn: "External Vehicle Snapshot" },
  { value: "MaintenanceMaterialUsage", label: "مواد صيانة مستخدمة (MaintenanceMaterialUsage)", labelEn: "Material Usage" },
  { value: "MaintenanceLaborEntry", label: "أجور عمالة صيانة (MaintenanceLaborEntry)", labelEn: "Labor Entry" },
  { value: "MaintenancePlan", label: "خطة صيانة (MaintenancePlan)", labelEn: "Maintenance Plan" },
  { value: "VehicleMaintenanceSchedule", label: "جدول صيانة مركبة (VehicleMaintenanceSchedule)", labelEn: "Maintenance Schedule" },
  { value: "OilChangeOperation", label: "عملية غيار زيت (OilChangeOperation)", labelEn: "Oil Change Operation" },
  { value: "VehicleExpense", label: "مصروف مركبة (VehicleExpense)", labelEn: "Vehicle Expense" },
  { value: "ExternalPartSaleLine", label: "بيع قطع غيار خارجي (ExternalPartSaleLine)", labelEn: "External Part Sale" },
  { value: "ExternalMaintenanceFinancialEntry", label: "قيد مالي ورشة خارجية (ExternalMaintenanceFinancialEntry)", labelEn: "Workshop Financial Entry" },
  { value: "ExternalCustomerPayment", label: "دفعة عميل خارجي (ExternalCustomerPayment)", labelEn: "Customer Payment" },

  // --- Telecom ---
  { value: "PhoneSimCard", label: "شريحة اتصال (PhoneSimCard)", labelEn: "Phone SIM Card" },
  { value: "RiderPhoneSimAssignment", label: "تسليم شريحة لسائق (RiderPhoneSimAssignment)", labelEn: "SIM Assignment" },
  { value: "PhoneSimResponsibilityChange", label: "تغيير مسؤولية شريحة (PhoneSimResponsibilityChange)", labelEn: "SIM Responsibility Change" },
];

const COMMON_ACTIONS = [
  { value: "ALL", label: "كافة العمليات", labelEn: "All Actions" },
  { value: "Created", label: "إنشاء جديد (Created)", labelEn: "Created" },
  { value: "Updated", label: "تعديل بيانات (Updated)", labelEn: "Updated" },
  { value: "SoftDeleted", label: "حذف مؤقت (SoftDeleted)", labelEn: "SoftDeleted" },
  { value: "Closed", label: "إغلاق (Closed)", labelEn: "Closed" },
];

const getStartOfMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
};

const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function AuditLogsPage() {
  const { can, locale } = useAuth();
  const isEn = locale === "en";
  const t = (k: string) => translate(locale, k);

  const hasPermission = can("audit.read");

  // Filter States
  const [entityType, setEntityType] = useState("ALL");
  const [action, setAction] = useState("ALL");
  const [actorUserId, setActorUserId] = useState("");
  const [entityId, setEntityId] = useState("");
  const [fromUtc, setFromUtc] = useState(getStartOfMonth);
  const [toUtc, setToUtc] = useState(getTodayDate);
  const [pageSize, setPageSize] = useState(50);

  // Pagination cursor stack: tracks beforeSequence for navigation
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);

  // Data States
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  // Document types catalog map for resolving documentTypeId to human names
  const [docTypesMap, setDocTypesMap] = useState<Record<string, { nameAr?: string; nameEn?: string; code?: string }>>({});
  const [usersList, setUsersList] = useState<ManagedUser[]>([]);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [vehiclesList, setVehiclesList] = useState<any[]>([]);
  const [documentsMap, setDocumentsMap] = useState<Record<string, { employeeId: string; docName?: string; fileName?: string }>>({});
  const [vehiclePeriodsMap, setVehiclePeriodsMap] = useState<Record<string, { vehicleId: string; plateNumber?: string }>>({});

  useEffect(() => {
    if (hasPermission) {
      getDocumentTypes()
        .then((docs) => {
          if (Array.isArray(docs)) {
            const map: Record<string, { nameAr?: string; nameEn?: string; code?: string }> = {};
            for (const d of docs) {
              if (d && d.id) {
                map[d.id] = { nameAr: d.nameAr, nameEn: d.nameEn, code: d.code };
              }
            }
            setDocTypesMap(map);
          }
        })
        .catch(() => { });

      listUsers()
        .then((res: any) => {
          const list = Array.isArray(res)
            ? res
            : (res?.items || res?.users || res?.data || []);
          if (Array.isArray(list)) {
            setUsersList(list);
          }
        })
        .catch((err) => {
          console.error("Failed to load users from GET /api/users:", err);
        });

      listEmployees()
        .then((res) => {
          if (Array.isArray(res)) {
            setEmployeesList(res);
            Promise.all(
              res.map((emp: any) =>
                getEmployeeActualDocuments(emp.id)
                  .then((docs) => docs || [])
                  .catch(() => [])
              )
            ).then((docArrays) => {
              const map: Record<string, { employeeId: string; docName?: string; fileName?: string }> = {};
              docArrays.flat().forEach((doc: any) => {
                if (!doc) return;
                const val = {
                  employeeId: doc.employeeId,
                  docName: doc.documentTypeNameAr || doc.documentTypeCode,
                  fileName: doc.currentFileName || undefined,
                };
                if (doc.id) map[doc.id] = val;
                if (doc.currentVersionId) map[doc.currentVersionId] = val;
                if (doc.currentFileName) map[String(doc.currentFileName).toLowerCase().trim()] = val;
                if (doc.documentNumber) map[String(doc.documentNumber).toLowerCase().trim()] = val;
              });
              setDocumentsMap(map);
            });
          }
        })
        .catch(() => { });

      getVehicles({ page: 1, pageSize: 200 })
        .then((res: any) => {
          const list = Array.isArray(res) ? res : (res?.items || res?.data || []);
          if (Array.isArray(list)) {
            setVehiclesList(list);
            Promise.all(
              list.map((v: any) =>
                getVehicleStatusHistory(v.id)
                  .then((periods) =>
                    (periods || []).map((p: any) => ({
                      periodId: p.id,
                      vehicleId: v.id,
                      plateNumber: v.plateNumberAr || v.plateNumberEn || v.plateNumber,
                    }))
                  )
                  .catch(() => [])
              )
            ).then((results) => {
              const map: Record<string, { vehicleId: string; plateNumber?: string }> = {};
              results.flat().forEach((item) => {
                if (item?.periodId) {
                  map[item.periodId] = { vehicleId: item.vehicleId, plateNumber: item.plateNumber };
                }
              });
              setVehiclePeriodsMap(map);
            });
          }
        })
        .catch(() => { });
    }
  }, [hasPermission]);

  const userOptions: SelectOption[] = useMemo(() => {
    return [
      { value: "", label: isEn ? "All Users" : "كافة المستخدمين" },
      ...usersList.map((u) => {
        const name = u.displayNameAr || u.displayNameEn || u.userName || u.email || u.id;
        const sub = u.userName ? `@${u.userName}${u.email ? ` • ${u.email}` : ""}` : (u.email || "");
        return {
          value: u.id,
          label: name,
          sublabel: sub,
          keywords: `${u.userName || ""} ${u.displayNameAr || ""} ${u.displayNameEn || ""} ${u.email || ""}`,
        };
      }),
    ];
  }, [usersList, isEn]);

  const actionFilterOptions: FilterOption[] = useMemo(() => {
    return [
      { value: "", label: isEn ? "All Actions" : "كافة العمليات" },
      { value: "Created", label: isEn ? "Created (إنشاء)" : "إنشاء جديد (Created)" },
      { value: "Updated", label: isEn ? "Updated (تعديل)" : "تعديل بيانات (Updated)" },
      { value: "SoftDeleted", label: isEn ? "Soft Deleted (حذف مؤقت)" : "حذف مؤقت (SoftDeleted)" },
      { value: "Closed", label: isEn ? "Closed (إغلاق)" : "إغلاق (Closed)" },
    ];
  }, [isEn]);

  const entityTypeFilterOptions: FilterOption[] = useMemo(() => {
    return COMMON_ENTITY_TYPES.map((t) => ({
      value: t.value === "ALL" ? "" : t.value,
      label: isEn ? t.labelEn : t.label,
    }));
  }, [isEn]);

  const recordOptions: SelectOption[] = useMemo(() => {
    if (entityType === "DocumentType") {
      return [
        { value: "", label: isEn ? "All Document Types" : "كافة أنواع الوثائق" },
        ...Object.entries(docTypesMap).map(([id, dt]) => ({
          value: id,
          label: isEn ? dt.nameEn || dt.nameAr || dt.code || id : dt.nameAr || dt.nameEn || dt.code || id,
          sublabel: dt.code,
          keywords: `${dt.nameAr || ""} ${dt.nameEn || ""} ${dt.code || ""}`,
        })),
      ];
    }

    if (entityType === "Employee") {
      return [
        { value: "", label: isEn ? "All Employees" : "كافة الموظفين" },
        ...employeesList.map((emp) => {
          const name = emp.name || emp.displayName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.id;
          const code = emp.code || emp.employeeNumber;
          return {
            value: emp.id,
            label: name,
            sublabel: code,
            keywords: `${name} ${code || ""}`,
          };
        }),
      ];
    }

    // Records extracted from loaded items
    const seen = new Set<string>();
    const opts: SelectOption[] = [
      { value: "", label: isEn ? "All Records" : "كافة السجلات" },
    ];
    for (const item of items) {
      if (shouldIgnoreAuditEntry(item)) continue;
      if (item.entityId && !seen.has(item.entityId)) {
        if (entityType === "ALL" || item.entityType === entityType) {
          seen.add(item.entityId);
          const resolved = resolveAuditRecordInfo(item, isEn, docTypesMap, documentsMap, employeesList, vehiclePeriodsMap);
          if (shouldIgnoreAuditEntry(item, resolved.primaryTitle)) continue;
          opts.push({
            value: item.entityId,
            label: resolved.primaryTitle,
            sublabel: resolved.secondaryTitle || resolved.shortId,
            keywords: `${resolved.primaryTitle} ${resolved.secondaryTitle || ""} ${resolved.shortId}`,
          });
        }
      }
    }
    return opts;
  }, [entityType, docTypesMap, employeesList, items, isEn]);

  const loadData = useCallback(
    async (cursorToUse?: string | null) => {
      if (!hasPermission) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        let accumulated: AuditEntry[] = [];
        let cursor: string | undefined = cursorToUse || undefined;
        let hasMore = true;
        let nextCursorToSave: string | null = null;
        let rounds = 0;
        const MAX_ROUNDS = 8;

        while (accumulated.length < pageSize && hasMore && rounds < MAX_ROUNDS) {
          rounds++;
          // Fetch up to 100 or double pageSize to minimize roundtrips while respecting backend limits
          const batchSize = Math.max(pageSize, 100);
          const params: AuditEntriesParams = {
            pageSize: batchSize,
            entityType: entityType !== "ALL" ? entityType.trim() : undefined,
            action: action !== "ALL" ? action.trim() : undefined,
            actorUserId: actorUserId.trim() || undefined,
            entityId: entityId.trim() || undefined,
            fromUtc: fromUtc
              ? fromUtc.includes("T")
                ? new Date(fromUtc).toISOString()
                : new Date(`${fromUtc}T00:00:00.000Z`).toISOString()
              : undefined,
            toUtc: toUtc
              ? toUtc.includes("T")
                ? new Date(toUtc).toISOString()
                : new Date(`${toUtc}T23:59:59.999Z`).toISOString()
              : undefined,
            beforeSequence: cursor,
          };

          const res = await getAuditEntries(params);
          const rawItems = res.items || [];

          for (const item of rawItems) {
            if (shouldIgnoreAuditEntry(item)) continue;
            const resolved = resolveAuditRecordInfo(item, isEn, docTypesMap, documentsMap, employeesList, vehiclePeriodsMap);
            if (shouldIgnoreAuditEntry(item, resolved.primaryTitle)) continue;

            accumulated.push(item);
            if (accumulated.length === pageSize) {
              break;
            }
          }

          if (res.nextCursor != null && rawItems.length > 0) {
            cursor = String(res.nextCursor);
            hasMore = true;
          } else {
            hasMore = false;
          }

          if (accumulated.length >= pageSize) {
            const lastItem = accumulated[accumulated.length - 1];
            // If the server still had more items or there were more rawItems past lastItem
            const hasMoreRaw = rawItems.some((r) => r.sequence < lastItem.sequence);
            nextCursorToSave = (hasMore || hasMoreRaw) ? String(lastItem.sequence) : null;
            break;
          }
        }

        if (accumulated.length < pageSize && !hasMore) {
          nextCursorToSave = null;
        }

        setItems(accumulated);
        setNextCursor(nextCursorToSave);
      } catch (err: any) {
        setError(
          err?.message ||
          (isEn
            ? "Failed to load audit logs from server."
            : "تعذر تحميل سجل العمليات والتدقيق من الخادم.")
        );
      } finally {
        setLoading(false);
      }
    },
    [
      hasPermission,
      pageSize,
      entityType,
      action,
      actorUserId,
      entityId,
      fromUtc,
      toUtc,
      isEn,
    ]
  );

  // Trigger search only on actual filter changes or initial mount (resets cursor)
  useEffect(() => {
    setCurrentCursor(null);
    setCursorHistory([]);
    loadData(null);
  }, [
    hasPermission,
    pageSize,
    entityType,
    action,
    actorUserId,
    entityId,
    fromUtc,
    toUtc,
  ]);

  // Navigate to Older entries (Next Page)
  const handleNextPage = () => {
    if (!nextCursor) return;
    setCursorHistory((prev) => [...prev, currentCursor || ""]);
    setCurrentCursor(nextCursor);
    loadData(nextCursor);
  };

  // Navigate to Newer entries (Previous Page)
  const handlePreviousPage = () => {
    if (cursorHistory.length === 0) return;
    const prevHistory = [...cursorHistory];
    const prevCursor = prevHistory.pop() || null;
    setCursorHistory(prevHistory);
    setCurrentCursor(prevCursor);
    loadData(prevCursor);
  };

  const resetFilters = () => {
    setEntityType("ALL");
    setAction("ALL");
    setActorUserId("");
    setEntityId("");
    setFromUtc(getStartOfMonth());
    setToUtc(getTodayDate());
    setPageSize(50);
    setCurrentCursor(null);
    setCursorHistory([]);
  };

  const hasActiveFilters = Boolean(
    entityType !== "ALL" ||
    action !== "ALL" ||
    actorUserId.trim() ||
    entityId.trim() ||
    fromUtc !== getStartOfMonth() ||
    toUtc !== getTodayDate()
  );

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat(isEn ? "en-US" : "ar-SA-u-nu-latn", {
        dateStyle: "medium",
        timeStyle: "medium",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const getActionBadge = (act: string) => {
    switch (act) {
      case "Created":
        return {
          icon: PlusCircle,
          label: isEn ? "Created" : "إنشاء",
          cls: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
        };
      case "Updated":
        return {
          icon: Edit3,
          label: isEn ? "Updated" : "تعديل",
          cls: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
        };
      case "SoftDeleted":
        return {
          icon: Trash2,
          label: isEn ? "Soft Deleted" : "حذف مؤقت",
          cls: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
        };
      case "Closed":
        return {
          icon: CheckCircle,
          label: isEn ? "Closed" : "إغلاق",
          cls: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
        };
      default:
        return {
          icon: Activity,
          label: act,
          cls: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
        };
    }
  };

  const processedEntries = useMemo(() => {
    return items.filter((entry) => {
      if (shouldIgnoreAuditEntry(entry)) return false;
      const resolved = resolveAuditRecordInfo(
        entry,
        isEn,
        docTypesMap,
        documentsMap,
        employeesList,
        vehiclePeriodsMap
      );
      if (shouldIgnoreAuditEntry(entry, resolved?.primaryTitle)) return false;
      return true;
    });
  }, [items, isEn, docTypesMap, documentsMap, employeesList, vehiclePeriodsMap]);

  const handleExportExcel = async () => {
    if (processedEntries.length === 0) {
      alert(isEn ? "No audit records to export." : "لا توجد سجلات تدقيق للتصدير.");
      return;
    }

    await exportToExcel({
      filename: `audit-logs-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: isEn ? "Audit Logs" : "سجل العمليات",
      columns: [
        {
          header: isEn ? "Timestamp (UTC)" : "التاريخ والوقت",
          accessor: (entry) => formatDateTime(entry.occurredAtUtc),
          width: 22,
        },
        {
          header: isEn ? "Action" : "الإجراء",
          accessor: (entry) => {
            const meta = getActionBadge(entry.action);
            return meta.label;
          },
          width: 15,
        },
        {
          header: isEn ? "Entity Type" : "نوع الكيان",
          accessor: (entry) => {
            const resolved = resolveAuditRecordInfo(
              entry,
              isEn,
              docTypesMap,
              documentsMap,
              employeesList,
              vehiclePeriodsMap
            );
            return resolved.entityLabel;
          },
          width: 22,
        },
        {
          header: isEn ? "Target Record" : "السجل المستهدف",
          accessor: (entry) => {
            const resolved = resolveAuditRecordInfo(
              entry,
              isEn,
              docTypesMap,
              documentsMap,
              employeesList,
              vehiclePeriodsMap
            );
            const extra = resolved.secondaryTitle ? ` - ${resolved.secondaryTitle}` : "";
            return `${resolved.primaryTitle}${extra}`;
          },
          isText: true,
          width: 32,
        },
        {
          header: isEn ? "Record Code / ID" : "معرف / رمز السجل",
          accessor: (entry) => {
            const resolved = resolveAuditRecordInfo(
              entry,
              isEn,
              docTypesMap,
              documentsMap,
              employeesList,
              vehiclePeriodsMap
            );
            return resolved.code || entry.entityId;
          },
          isText: true,
          width: 20,
        },
        {
          header: isEn ? "Actor / User" : "القائم بالعملية",
          accessor: (entry) =>
            entry.actor?.displayNameAr ||
            entry.actor?.displayNameEn ||
            entry.actor?.userName ||
            entry.actorType ||
            (isEn ? "System" : "النظام"),
          width: 22,
        },
        {
          header: isEn ? "Actor Username" : "اسم المستخدم",
          accessor: (entry) => entry.actor?.userName || "-",
          isText: true,
          width: 18,
        },
        {
          header: isEn ? "Changes Count" : "عدد التعديلات",
          accessor: (entry) => entry.changes?.length ?? 0,
          width: 14,
        },
        {
          header: isEn ? "Changed Fields" : "الحقول المعدلة",
          accessor: (entry) => entry.changes?.map((c) => c.field).join(", ") || "-",
          width: 35,
        },
      ],
      data: processedEntries,
    });
  };

  const openDetail = (entry: AuditEntry) => {
    setSelectedEventId(entry.eventId);
    setSelectedEntry(entry);
  };

  if (!hasPermission) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1167c9]">{t("nav.systemManagement")}</p>
            <h1 className="text-3xl font-black">{t("nav.auditLogs")}</h1>
          </div>
        </div>

        <Card className="p-8 text-center space-y-3">
          <div className="size-12 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {isEn ? "Access Denied" : "غير مصرح بالوصول"}
          </h3>
          <p className="text-xs text-[var(--muted)] max-w-md mx-auto leading-relaxed">
            {isEn
              ? "You do not have the required 'audit.read' permission to view system audit entries and logs."
              : "عفواً، يتطلب عرض سجل العمليات والتدقيق توفر صلاحية (audit.read) في حسابك."}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-950/50 text-[#1167c9]">
            <History size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-[#1167c9]">{t("nav.systemManagement")}</p>
            <h1 className="text-3xl font-black">{t("nav.auditLogs")}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {isEn
                ? "Immutable audit trail of record creations, modifications, and administrative operations."
                : "سجل تدقيق زمني غير قابل للتعديل لكافة عمليات الإنشاء والتعديل والحذف والأنشطة الإدارية."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-bold"
          >
            <FileSpreadsheet size={14} />
            <span>{isEn ? "Export Excel" : "تصدير إكسل"}</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => loadData(currentCursor)}
            disabled={loading}
            className="inline-flex items-center gap-2 text-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-[#1167c9]" : ""} />
            <span>{t("common.refresh")}</span>
          </Button>
        </div>
      </div>

      {/* Main Card */}
      <Card className="overflow-hidden">
        {/* Filters Panel */}
        <div className="p-4 border-b border-[var(--border)] space-y-3 bg-slate-50/40 dark:bg-slate-900/20">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Entity Type Filter */}
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--muted)]">
                {isEn ? "Entity Type" : "نوع السجل / الكيان"}
              </label>
              <SearchableSelect
                value={entityType}
                onChange={(v) => setEntityType(v)}
                options={COMMON_ENTITY_TYPES.map((et) => ({
                  value: et.value,
                  label: isEn ? et.labelEn : et.label,
                }))}
                placeholder={isEn ? "All Entities" : "كافة الكيانات"}
              />
            </div>

            {/* Action Filter */}
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--muted)]">
                {isEn ? "Operation / Action" : "نوع العملية"}
              </label>
              <SearchableSelect
                value={action}
                onChange={(v) => setAction(v)}
                options={COMMON_ACTIONS.map((a) => ({
                  value: a.value,
                  label: isEn ? a.labelEn : a.label,
                }))}
                placeholder={isEn ? "All Actions" : "كافة العمليات"}
              />
            </div>

            {/* Date Range: From */}
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--muted)]">
                {isEn ? "From Date (UTC)" : "من تاريخ"}
              </label>
              <input
                type="date"
                value={fromUtc}
                onChange={(e) => setFromUtc(e.target.value)}
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold outline-none"
              />
            </div>

            {/* Date Range: To */}
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--muted)]">
                {isEn ? "To Date (UTC)" : "إلى تاريخ"}
              </label>
              <input
                type="date"
                value={toUtc}
                onChange={(e) => setToUtc(e.target.value)}
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold outline-none"
              />
            </div>
          </div>

          {/* Secondary Filter Row */}
          <div className="grid gap-3 sm:grid-cols-2 pt-1">
            {/* Actor User Filter */}
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--muted)]">
                {isEn ? "Actor User" : "المستخدم القائم بالعملية"}
              </label>
              <SearchableSelect
                value={actorUserId}
                onChange={(v) => setActorUserId(v)}
                options={userOptions}
                placeholder={isEn ? "All Users" : "كافة المستخدمين"}
                searchPlaceholder={isEn ? "Search users by name..." : "بحث عن مستخدم بالاسم أو المعرف..."}
              />
            </div>

            {/* Entity / Record Filter */}
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--muted)]">
                {isEn ? "Target Record" : "السجل المستهدف"}
              </label>
              <SearchableSelect
                value={entityId}
                onChange={(v) => setEntityId(v)}
                options={recordOptions}
                placeholder={isEn ? "All Records" : "كافة السجلات"}
                searchPlaceholder={isEn ? "Search records..." : "بحث عن السجل بالاسم أو الرمز..."}
              />
            </div>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <div className="flex justify-end pt-1">
              <Button
                variant="secondary"
                onClick={resetFilters}
                className="h-8 px-2.5 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <X size={14} />
                <span>{isEn ? "Reset Filters" : "إعادة ضبط الفلاتر"}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Error Notice */}
        {error && (
          <div className="p-4 m-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="ghost"
              onClick={() => loadData(currentCursor)}
              className="text-xs text-rose-700 dark:text-rose-300 hover:underline"
            >
              {isEn ? "Retry" : "إعادة المحاولة"}
            </Button>
          </div>
        )}

        {/* Audit Timeline Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs text-start">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 font-bold text-[var(--muted)] border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-3.5 text-start w-[180px]">
                  {isEn ? "Timestamp" : "التاريخ والوقت"}
                </th>
                <th className="px-4 py-3.5 text-start w-[140px]">
                  <div className="inline-flex items-center gap-1.5">
                    <span>{isEn ? "Action" : "الإجراء"}</span>
                    <TableHeaderColumnFilter
                      label={isEn ? "Action" : "الإجراء"}
                      value={action === "ALL" ? "" : action}
                      onChange={(val) => setAction(val || "ALL")}
                      options={actionFilterOptions}
                      placeholder={isEn ? "Filter by action..." : "تصفية بالإجراء..."}
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-start w-[240px]">
                  <div className="inline-flex items-center gap-1.5">
                    <span>{isEn ? "Entity / Record" : "الكيان والسجل"}</span>
                    <TableHeaderColumnFilter
                      label={isEn ? "Entity Type" : "نوع الكيان"}
                      value={entityType === "ALL" ? "" : entityType}
                      onChange={(val) => setEntityType(val || "ALL")}
                      options={entityTypeFilterOptions}
                      placeholder={isEn ? "Filter by entity..." : "تصفية بالكيان..."}
                    />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-start w-[180px]">
                  {isEn ? "Actor / User" : "القائم بالعملية"}
                </th>
                <th className="px-4 py-3.5 text-start w-[160px]">
                  {isEn ? "Changes" : "ملخص التغييرات"}
                </th>
                <th className="px-4 py-3.5 text-center w-[110px]">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={6} className="p-4">
                      <div className="h-8 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : processedEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <History size={32} className="text-slate-300 dark:text-slate-700" />
                      <p className="font-bold text-slate-700 dark:text-slate-300">
                        {isEn ? "No audit entries found" : "لا توجد سجلات تدقيق مطابقة للشروط"}
                      </p>
                      <p className="text-[11px] text-[var(--muted)]">
                        {isEn
                          ? "Try adjusting your filters or date range."
                          : "يرجى تعديل الفلاتر المحددة أو النطاق الزمني."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                processedEntries.map((entry) => {
                  const actionMeta = getActionBadge(entry.action);
                  const ActionIcon = actionMeta.icon;
                  const actorName =
                    entry.actor?.displayNameAr ||
                    entry.actor?.displayNameEn ||
                    entry.actor?.userName ||
                    entry.actorType ||
                    (isEn ? "System" : "النظام");

                  const resolvedRecord = resolveAuditRecordInfo(entry, isEn, docTypesMap, documentsMap, employeesList, vehiclePeriodsMap);
                  const recordNav = getAuditRecordNavigation(entry, resolvedRecord, employeesList, vehiclesList, items, documentsMap, vehiclePeriodsMap);
                  const RecordEntityIcon = resolvedRecord.entityIcon;

                  const changeCount = entry.changes?.length ?? 0;

                  return (
                    <tr
                      key={entry.eventId}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => openDetail(entry)}
                    >
                      {/* Timestamp */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-400 shrink-0" />
                          <span>{formatDateTime(entry.occurredAtUtc)}</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${actionMeta.cls}`}
                        >
                          <ActionIcon size={11} />
                          {actionMeta.label}
                        </span>
                      </td>

                      {/* Entity / Record */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          {/* Entity Badge & Code */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${resolvedRecord.badgeCls}`}
                              title={resolvedRecord.referenceExplanation}
                            >
                              <RecordEntityIcon size={12} />
                              <span>{resolvedRecord.entityLabel}</span>
                            </span>
                            {resolvedRecord.code && (
                              <span className="font-mono font-bold text-[#1167c9] text-[11px]">
                                {resolvedRecord.code}
                              </span>
                            )}
                          </div>

                          {/* Primary Meaning / What it refers to */}
                          <div>
                            {recordNav ? (
                              <Link
                                href={recordNav.url}
                                onClick={(e) => e.stopPropagation()}
                                className="font-bold text-slate-900 dark:text-white hover:text-[#1167c9] dark:hover:text-blue-400 inline-flex items-center gap-1 group/link text-xs transition-colors"
                                title={isEn ? recordNav.labelEn : recordNav.labelAr}
                              >
                                <span className="group-hover/link:underline">{resolvedRecord.primaryTitle}</span>
                                <ExternalLink size={11} className="text-[#1167c9] opacity-70 group-hover/link:opacity-100 transition-opacity shrink-0" />
                              </Link>
                            ) : (
                              <span
                                className="font-bold text-slate-900 dark:text-white block text-xs"
                                title={resolvedRecord.referenceExplanation}
                              >
                                {resolvedRecord.primaryTitle}
                              </span>
                            )}
                            {resolvedRecord.secondaryTitle && (
                              <span className="text-[11px] text-[var(--muted)] block font-medium">
                                {resolvedRecord.secondaryTitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {entry.actorType === "System" ? <Server size={13} /> : <User size={13} />}
                          </div>
                          <div>
                            {entry.actor?.userId ? (
                              <Link
                                href={`/admin/users/${entry.actor.userId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-bold text-slate-900 dark:text-white hover:text-[#1167c9] dark:hover:text-blue-400 inline-flex items-center gap-1 truncate max-w-[130px] group/user text-xs transition-colors"
                                title={isEn ? "View user profile" : "عرض حساب المستخدم"}
                              >
                                <span className="group-hover/user:underline truncate">{actorName}</span>
                                <ExternalLink size={10} className="text-[#1167c9] opacity-0 group-hover/user:opacity-100 shrink-0 transition-opacity" />
                              </Link>
                            ) : (
                              <span className="block font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                                {actorName}
                              </span>
                            )}
                            {entry.actor?.userName && (
                              <span className="block font-mono text-[10px] text-slate-400">
                                @{entry.actor.userName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Changes Summary */}
                      <td className="px-4 py-3.5 font-mono text-[11px]">
                        {changeCount > 0 ? (
                          <span
                            className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-[#1167c9] dark:text-blue-400 font-bold text-xs"
                            title={entry.changes && entry.changes.length > 0 ? `${changeCount} ${isEn ? "fields" : "حقول"}: ${entry.changes.map((c) => c.field).join(", ")}` : undefined}
                          >
                            {changeCount}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openDetail(entry)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-[#1167c9] hover:bg-[#1167c9] hover:text-white border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-[#1167c9] dark:hover:text-white transition-all shadow-xs"
                          title={isEn ? "View Details" : "عرض التفاصيل الكاملة"}
                        >
                          <Eye size={13} />
                          <span>{isEn ? "Details" : "التفاصيل"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Cursor Pagination Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-t border-[var(--border)] bg-slate-50/40 dark:bg-slate-900/20 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[var(--muted)]">
              {isEn ? "Rows per request:" : "عدد السجلات:"}
            </span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs font-bold"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={cursorHistory.length === 0 || loading}
              onClick={handlePreviousPage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--border)] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
            >
              {isEn ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
              <span>{isEn ? "Previous (Newer)" : "السابق (الأحدث)"}</span>
            </button>

            <button
              type="button"
              disabled={!nextCursor || loading}
              onClick={handleNextPage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--border)] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
            >
              <span>{isEn ? "Next (Older)" : "التالي (الأقدم)"}</span>
              {isEn ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>
        </div>
      </Card>

      {/* Detail Modal */}
      <AuditEntryDetailModal
        isOpen={Boolean(selectedEventId)}
        onClose={() => {
          setSelectedEventId(null);
          setSelectedEntry(null);
        }}
        eventId={selectedEventId}
        initialEntry={selectedEntry}
        documentTypesMap={docTypesMap}
        employeesList={employeesList}
        vehiclesList={vehiclesList}
        auditItems={items}
        documentsMap={documentsMap}
        vehiclePeriodsMap={vehiclePeriodsMap}
      />
    </div>
  );
}
