"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarCheck,
  Check,
  Clock,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Filter,
  History,
  Info,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  User,
  X,
  AlertTriangle,
  ChevronRight,
  Send,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Ban,
  Calendar,
  Settings2,
  Tag,
  ShieldCheck,
  FileCheck,
  Plane,
} from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { authFetch } from "../../lib/auth/api";
import { hrWorkflowApi } from "../../lib/hr/api";
import type {
  LeaveTypeResponse,
  LeaveTypeUpsertRequest,
  LeaveTypeStatus,
  LeaveRequestResponse,
  LeaveRequestUpsertRequest,
  LeaveDateChangeRequest,
  LeaveCancellationRequest,
  LeaveDocumentResponse,
  LeaveDocumentKind,
  LeaveWorkflowStatus,
  LeaveHrStatus,
} from "../../lib/hr/leave-types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { SearchableSelect } from "../ui/SearchableSelect";
import { toast } from "../ui/Toast";
import { systemPrompt } from "../ui/SystemDialog";
import { translate } from "../../lib/i18n";

// Helper to format file sizes
function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Helper to calculate days between two dates inclusive
function calculateCalendarDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 0;
}

// Status Badges
const STATUS_STYLES: Record<
  LeaveWorkflowStatus,
  { labelAr: string; labelEn: string; bg: string; text: string; border: string }
> = {
  Draft: { labelAr: "مسودة", labelEn: "Draft", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  PendingApproval: { labelAr: "قيد الاعتماد", labelEn: "Pending Approval", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  ReturnedForChanges: { labelAr: "معاد للتعديل", labelEn: "Returned for Changes", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  Approved: { labelAr: "معتمد", labelEn: "Approved", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Active: { labelAr: "ساري", labelEn: "Active", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Completed: { labelAr: "مكتمل", labelEn: "Completed", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  Rejected: { labelAr: "مرفوض", labelEn: "Rejected", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  CancellationPending: { labelAr: "طلب إلغاء معلق", labelEn: "Cancellation Pending", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  Cancelled: { labelAr: "ملغي", labelEn: "Cancelled", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  Expired: { labelAr: "منتهي", labelEn: "Expired", bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" },
};

const HR_STATUS_STYLES: Record<
  LeaveHrStatus,
  { labelAr: string; labelEn: string; bg: string; text: string; border: string }
> = {
  NotRequired: { labelAr: "غير مطلوب", labelEn: "Not Required", bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
  PendingDocuments: { labelAr: "بانتظار الوثائق", labelEn: "Pending Documents", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  InProgress: { labelAr: "قيد المعالجة", labelEn: "In Progress", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Ready: { labelAr: "جاهز", labelEn: "Ready", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Completed: { labelAr: "مكتمل", labelEn: "Completed", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
};

const LEAVE_TYPE_STATUS_STYLES: Record<
  LeaveTypeStatus,
  { labelAr: string; labelEn: string; bg: string; text: string; border: string }
> = {
  Active: { labelAr: "نشط", labelEn: "Active", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Disabled: { labelAr: "معطّل", labelEn: "Disabled", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  Archived: { labelAr: "مؤرشف", labelEn: "Archived", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

const DOC_KIND_LABELS: Record<LeaveDocumentKind, { labelAr: string; labelEn: string }> = {
  Ticket: { labelAr: "تذكرة سفر", labelEn: "Ticket" },
  ExitReentryVisa: { labelAr: "تأشيرة خروج وعودة", labelEn: "Exit / Re-entry Visa" },
  ApprovalLetter: { labelAr: "خطاب موافقة", labelEn: "Approval Letter" },
  Other: { labelAr: "وثيقة أخرى", labelEn: "Other Document" },
};

export function LeaveRequestsView({ embedded = false }: { embedded?: boolean }) {
  const { can, locale } = useAuth();
  const isEn = locale === "en";
  const t = (key: string) => translate(locale, key);

  // Top Tabs: "requests" (طلبات الإجازات) vs "types" (أنواع الإجازات)
  const [activeTopTab, setActiveTopTab] = useState<"requests" | "types">("requests");

  // Permissions
  const canManage = can("leave_requests.manage");
  const canApprove = can("leave_requests.approve");
  const canUploadDoc = can("documents.upload");
  const canDownloadDoc = can("documents.download_sensitive");

  // Data States
  const [requests, setRequests] = useState<LeaveRequestResponse[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeResponse[]>([]);
  const [employees, setEmployees] = useState<{ value: string; label: string; labelEn?: string }[]>([]);
  const [contracts, setContracts] = useState<{ value: string; label: string; labelEn?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [employeeFilter, setEmployeeFilter] = useState<string>("");

  // Drawer / Modals State for Requests
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestResponse | null>(null);
  const [drawerTab, setDrawerTab] = useState<"overview" | "dateChanges" | "cancellations" | "documents">("overview");

  // Create / Edit Leave Request Modal State
  const [formOpen, setFormOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequestResponse | null>(null);
  const [formData, setFormData] = useState<LeaveRequestUpsertRequest>({
    employeeId: "",
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    expectedReturnDate: "",
    reason: "",
    destinationCountryCode: "",
    contactPhoneDuringLeave: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    relatedClientContractId: "",
    notes: "",
  });
  const [formError, setFormError] = useState("");

  // Sub-resource States for Drawer
  const [dateChanges, setDateChanges] = useState<LeaveDateChangeRequest[]>([]);
  const [loadingDateChanges, setLoadingDateChanges] = useState(false);
  const [cancellations, setCancellations] = useState<LeaveCancellationRequest[]>([]);
  const [loadingCancellations, setLoadingCancellations] = useState(false);
  const [documents, setDocuments] = useState<LeaveDocumentResponse[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // Sub-resource Action Modals
  const [dateChangeModalOpen, setDateChangeModalOpen] = useState(false);
  const [dateChangeForm, setDateChangeForm] = useState({ requestedStartDate: "", requestedEndDate: "", reason: "" });

  const [cancellationModalOpen, setCancellationModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");

  const [docUploadModalOpen, setDocUploadModalOpen] = useState(false);
  const [docUploadVersionDocId, setDocUploadVersionDocId] = useState<string | null>(null);
  const [docForm, setDocForm] = useState({
    kind: "Ticket" as LeaveDocumentKind,
    referenceNumber: "",
    issuedOn: "",
    expiresOn: "",
    notes: "",
  });
  const [docFile, setDocFile] = useState<File | null>(null);

  const [docEditMetaModalOpen, setDocEditMetaModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<LeaveDocumentResponse | null>(null);

  // Leave Type Create / Edit Modal State
  const [leaveTypeModalOpen, setLeaveTypeModalOpen] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveTypeResponse | null>(null);
  const [leaveTypeForm, setLeaveTypeForm] = useState<LeaveTypeUpsertRequest>({
    code: "",
    nameAr: "",
    nameEn: "",
    descriptionAr: "",
    descriptionEn: "",
    requiresBalance: true,
    requiresHrDocuments: false,
    requiresExitReentryVisa: false,
    maximumCalendarDays: null,
    status: "Active",
    rowVersion: null,
  });
  const [leaveTypeError, setLeaveTypeError] = useState("");

  // Load Leave Types & Lookup catalogs
  const loadCatalogs = useCallback(async () => {
    try {
      const [typesData, empData, contractsData] = await Promise.all([
        hrWorkflowApi.getLeaveTypes().catch(() => []),
        authFetch<any[]>("/api/employees").catch(() => []),
        authFetch<any[]>("/api/platform-operations/contracts").catch(() => []),
      ]);

      setLeaveTypes(typesData);
      setEmployees(
        empData.map((e) => ({
          value: e.id,
          label: String(e.fullNameAr || e.nameAr || e.code || e.id),
          labelEn: String(e.fullNameEn || e.nameEn || e.code || e.id),
        })),
      );
      setContracts(
        contractsData.map((c) => ({
          value: c.id,
          label: String(c.contractNameAr || c.code || c.id),
          labelEn: String(c.contractNameEn || c.code || c.id),
        })),
      );
    } catch (err) {
      console.error("Error loading leave catalogs", err);
    }
  }, []);

  // Load Leave Requests
  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hrWorkflowApi.getLeaveRequests(employeeFilter || undefined);
      setRequests(data);
      if (selectedRequest) {
        const updated = data.find((r) => r.id === selectedRequest.id);
        if (updated) setSelectedRequest(updated);
      }
    } catch (err: any) {
      toast.error(isEn ? "Error" : "خطأ", err.message || (isEn ? "Failed to load leave requests" : "تعذر تحميل طلبات الإجازات"));
    } finally {
      setLoading(false);
    }
  }, [employeeFilter, selectedRequest, isEn]);

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  // Load drawer sub-resources
  const loadSubResources = useCallback(
    async (requestId: string) => {
      if (drawerTab === "dateChanges") {
        setLoadingDateChanges(true);
        try {
          const res = await hrWorkflowApi.listDateChanges(requestId);
          setDateChanges(res);
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingDateChanges(false);
        }
      } else if (drawerTab === "cancellations") {
        setLoadingCancellations(true);
        try {
          const res = await hrWorkflowApi.listCancellations(requestId);
          setCancellations(res);
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingCancellations(false);
        }
      } else if (drawerTab === "documents") {
        setLoadingDocuments(true);
        try {
          const res = await hrWorkflowApi.listDocuments(requestId);
          setDocuments(res);
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingDocuments(false);
        }
      }
    },
    [drawerTab],
  );

  useEffect(() => {
    if (selectedRequest) {
      void loadSubResources(selectedRequest.id);
    }
  }, [selectedRequest, drawerTab, loadSubResources]);

  // English Leave Type Join map
  const leaveTypeMap = useMemo(() => {
    const map = new Map<string, LeaveTypeResponse>();
    for (const lt of leaveTypes) {
      map.set(lt.id, lt);
    }
    return map;
  }, [leaveTypes]);

  // Only ACTIVE leave types for creation dropdown
  const activeLeaveTypesOptions = useMemo(() => {
    return leaveTypes
      .filter((lt) => lt.status === "Active")
      .map((lt) => ({
        value: lt.id,
        label: `${lt.nameAr} (${lt.code})`,
        labelEn: `${lt.nameEn} (${lt.code})`,
      }));
  }, [leaveTypes]);

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (statusFilter !== "ALL" && req.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const empName = req.employeeNameAr?.toLowerCase() || "";
        const reqNum = req.requestNumber?.toLowerCase() || "";
        const reason = req.reason?.toLowerCase() || "";
        const typeAr = req.leaveTypeNameAr?.toLowerCase() || "";
        const typeEn = leaveTypeMap.get(req.leaveTypeId)?.nameEn?.toLowerCase() || "";
        if (
          !empName.includes(q) &&
          !reqNum.includes(q) &&
          !reason.includes(q) &&
          !typeAr.includes(q) &&
          !typeEn.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [requests, statusFilter, search, leaveTypeMap]);

  // Stats for Requests
  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === "PendingApproval").length,
      active: requests.filter((r) => r.status === "Active").length,
      approved: requests.filter((r) => r.status === "Approved").length,
      returned: requests.filter((r) => r.status === "ReturnedForChanges").length,
    };
  }, [requests]);

  // Stats for Leave Types
  const leaveTypeStats = useMemo(() => {
    return {
      total: leaveTypes.length,
      active: leaveTypes.filter((t) => t.status === "Active").length,
      disabled: leaveTypes.filter((t) => t.status === "Disabled").length,
      archived: leaveTypes.filter((t) => t.status === "Archived").length,
    };
  }, [leaveTypes]);

  // Handle Open Create / Edit Modal for Leave Requests
  const openCreateModal = () => {
    setEditingRequest(null);
    setFormData({
      employeeId: "",
      leaveTypeId: activeLeaveTypesOptions[0]?.value || "",
      startDate: "",
      endDate: "",
      expectedReturnDate: "",
      reason: "",
      destinationCountryCode: "",
      contactPhoneDuringLeave: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      relatedClientContractId: "",
      notes: "",
    });
    setFormError("");
    setFormOpen(true);
  };

  const openEditModal = (req: LeaveRequestResponse) => {
    if (req.status !== "Draft" && req.status !== "ReturnedForChanges") {
      toast.error(
        isEn ? "Action not allowed" : "غير مسموح",
        isEn ? "A request can be edited only in Draft or ReturnedForChanges status." : "يمكن تعديل الطلب فقط في حالة مسودة أو معاد للتعديل.",
      );
      return;
    }
    setEditingRequest(req);
    setFormData({
      employeeId: req.employeeId,
      leaveTypeId: req.leaveTypeId,
      startDate: req.startDate ? req.startDate.slice(0, 10) : "",
      endDate: req.endDate ? req.endDate.slice(0, 10) : "",
      expectedReturnDate: req.expectedReturnDate ? req.expectedReturnDate.slice(0, 10) : "",
      reason: req.reason || "",
      destinationCountryCode: req.destinationCountryCode || "",
      contactPhoneDuringLeave: req.contactPhoneDuringLeave || "",
      emergencyContactName: req.emergencyContactName || "",
      emergencyContactPhone: req.emergencyContactPhone || "",
      relatedClientContractId: req.relatedClientContractId || "",
      notes: req.notes || "",
      rowVersion: req.rowVersion,
    });
    setFormError("");
    setFormOpen(true);
  };

  // Leave Type Modals
  const openCreateLeaveTypeModal = () => {
    setEditingLeaveType(null);
    setLeaveTypeForm({
      code: "",
      nameAr: "",
      nameEn: "",
      descriptionAr: "",
      descriptionEn: "",
      requiresBalance: true,
      requiresHrDocuments: false,
      requiresExitReentryVisa: false,
      maximumCalendarDays: null,
      status: "Active",
      rowVersion: null,
    });
    setLeaveTypeError("");
    setLeaveTypeModalOpen(true);
  };

  const openEditLeaveTypeModal = (lt: LeaveTypeResponse) => {
    setEditingLeaveType(lt);
    setLeaveTypeForm({
      code: lt.code,
      nameAr: lt.nameAr,
      nameEn: lt.nameEn,
      descriptionAr: lt.descriptionAr || "",
      descriptionEn: lt.descriptionEn || "",
      requiresBalance: lt.requiresBalance,
      requiresHrDocuments: lt.requiresHrDocuments,
      requiresExitReentryVisa: lt.requiresExitReentryVisa,
      maximumCalendarDays: lt.maximumCalendarDays,
      status: lt.status,
      rowVersion: lt.rowVersion,
    });
    setLeaveTypeError("");
    setLeaveTypeModalOpen(true);
  };

  const handleSaveLeaveType = async (e: FormEvent) => {
    e.preventDefault();
    setLeaveTypeError("");

    if (!leaveTypeForm.code.trim()) {
      setLeaveTypeError(isEn ? "Code is required" : "رمز نوع الإجازة مطلوب");
      return;
    }
    if (!leaveTypeForm.nameAr.trim()) {
      setLeaveTypeError(isEn ? "Arabic Name is required" : "الاسم العربي مطلوب");
      return;
    }
    if (!leaveTypeForm.nameEn.trim()) {
      setLeaveTypeError(isEn ? "English Name is required" : "الاسم الإنجليزي مطلوب");
      return;
    }
    if (leaveTypeForm.maximumCalendarDays != null && Number(leaveTypeForm.maximumCalendarDays) <= 0) {
      setLeaveTypeError(isEn ? "Maximum calendar days must be greater than zero" : "الحد الأقصى للأيام يجب أن يكون أكبر من الصفر");
      return;
    }

    setBusy(true);
    try {
      const payload: LeaveTypeUpsertRequest = {
        code: leaveTypeForm.code.trim().toUpperCase(),
        nameAr: leaveTypeForm.nameAr.trim(),
        nameEn: leaveTypeForm.nameEn.trim(),
        descriptionAr: leaveTypeForm.descriptionAr?.trim() || null,
        descriptionEn: leaveTypeForm.descriptionEn?.trim() || null,
        requiresBalance: Boolean(leaveTypeForm.requiresBalance),
        requiresHrDocuments: Boolean(leaveTypeForm.requiresHrDocuments),
        requiresExitReentryVisa: Boolean(leaveTypeForm.requiresExitReentryVisa),
        maximumCalendarDays: leaveTypeForm.maximumCalendarDays ? Number(leaveTypeForm.maximumCalendarDays) : null,
        status: leaveTypeForm.status,
        rowVersion: editingLeaveType ? editingLeaveType.rowVersion : null,
      };

      if (editingLeaveType) {
        await hrWorkflowApi.updateLeaveType(editingLeaveType.id, payload);
        toast.success(isEn ? "Updated" : "تم التحديث", isEn ? "Leave type updated successfully." : "تم تحديث نوع الإجازة بنجاح.");
      } else {
        await hrWorkflowApi.createLeaveType(payload);
        toast.success(isEn ? "Created" : "تم الإنشاء", isEn ? "Leave type created successfully." : "تم إنشاء نوع الإجازة بنجاح.");
      }

      setLeaveTypeModalOpen(false);
      await loadCatalogs();
    } catch (err: any) {
      setLeaveTypeError(err.message || (isEn ? "Failed to save leave type" : "فشل حفظ نوع الإجازة"));
    } finally {
      setBusy(false);
    }
  };

  // Form Date Changes & Auto Days Calculation
  const formDays = useMemo(() => {
    return calculateCalendarDays(formData.startDate, formData.endDate);
  }, [formData.startDate, formData.endDate]);

  const selectedLeaveType = useMemo(() => {
    return leaveTypeMap.get(formData.leaveTypeId);
  }, [leaveTypeMap, formData.leaveTypeId]);

  const handleStartDateChange = (val: string) => {
    setFormData((prev) => {
      const next = { ...prev, startDate: val };
      if (next.endDate && next.endDate < val) {
        next.endDate = val;
      }
      if (next.endDate) {
        const d = new Date(next.endDate);
        d.setDate(d.getDate() + 1);
        next.expectedReturnDate = d.toISOString().slice(0, 10);
      }
      return next;
    });
  };

  const handleEndDateChange = (val: string) => {
    setFormData((prev) => {
      const next = { ...prev, endDate: val };
      if (val) {
        const d = new Date(val);
        d.setDate(d.getDate() + 1);
        next.expectedReturnDate = d.toISOString().slice(0, 10);
      }
      return next;
    });
  };

  // Save Leave Request
  const handleSaveRequest = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.employeeId) {
      setFormError(isEn ? "Employee is required" : "الموظف مطلوب");
      return;
    }
    if (!formData.leaveTypeId) {
      setFormError(isEn ? "Leave Type is required" : "نوع الإجازة مطلوب");
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setFormError(isEn ? "Start and End dates are required" : "تاريخ البداية والنهاية مطلوبان");
      return;
    }
    if (formData.endDate < formData.startDate) {
      setFormError(isEn ? "End date must be on or after start date" : "تاريخ النهاية يجب أن يكون في أو بعد تاريخ البداية");
      return;
    }
    if (formData.expectedReturnDate && formData.expectedReturnDate < formData.endDate) {
      setFormError(isEn ? "Expected return date must be on or after end date" : "تاريخ العودة المتوقع يجب أن يكون في أو بعد تاريخ النهاية");
      return;
    }
    if (!formData.reason.trim()) {
      setFormError(isEn ? "Reason is required" : "السبب مطلوب");
      return;
    }
    if (formData.destinationCountryCode && formData.destinationCountryCode.length > 2) {
      setFormError(isEn ? "Destination country code must be at most 2 characters" : "رمز دولة الوجهة يجب ألا يتجاوز حرفين");
      return;
    }
    if (selectedLeaveType?.maximumCalendarDays && formDays > selectedLeaveType.maximumCalendarDays) {
      setFormError(
        isEn
          ? `Requested duration (${formDays} days) exceeds maximum allowed for this leave type (${selectedLeaveType.maximumCalendarDays} days).`
          : `مدة الإجازة المطلوبة (${formDays} يوم) تتجاوز الحد الأقصى المسموح لهذا النوع (${selectedLeaveType.maximumCalendarDays} يوم).`,
      );
      return;
    }

    setBusy(true);
    try {
      const payload: LeaveRequestUpsertRequest = {
        employeeId: formData.employeeId,
        leaveTypeId: formData.leaveTypeId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        expectedReturnDate: formData.expectedReturnDate || formData.endDate,
        reason: formData.reason.trim(),
        destinationCountryCode: formData.destinationCountryCode?.trim().toUpperCase() || null,
        contactPhoneDuringLeave: formData.contactPhoneDuringLeave?.trim() || null,
        emergencyContactName: formData.emergencyContactName?.trim() || null,
        emergencyContactPhone: formData.emergencyContactPhone?.trim() || null,
        relatedClientContractId: formData.relatedClientContractId || null,
        notes: formData.notes?.trim() || null,
        rowVersion: editingRequest ? editingRequest.rowVersion : null,
      };

      if (editingRequest) {
        await hrWorkflowApi.updateLeaveRequest(editingRequest.id, payload);
        toast.success(isEn ? "Updated" : "تم التحديث", isEn ? "Leave request updated successfully." : "تم تحديث طلب الإجازة بنجاح.");
      } else {
        await hrWorkflowApi.createLeaveRequest(payload);
        toast.success(isEn ? "Created" : "تم الإنشاء", isEn ? "Leave request created successfully." : "تم إنشاء طلب الإجازة بنجاح.");
      }

      setFormOpen(false);
      await loadRequests();
    } catch (err: any) {
      setFormError(err.message || (isEn ? "Failed to save request" : "فشل حفظ الطلب"));
    } finally {
      setBusy(false);
    }
  };

  // Transitions & Decisions
  const handleTransition = async (action: "submit" | "activate" | "complete") => {
    if (!selectedRequest) return;
    const comment = (
      await systemPrompt(
        isEn ? `Enter comment for action (${action})` : `أدخل تعليقًا للإجراء (${action})`,
        "",
      )
    )?.trim();
    if (comment === undefined) return;

    setBusy(true);
    try {
      await hrWorkflowApi.leaveTransition(selectedRequest.id, action, comment, selectedRequest.rowVersion);
      toast.success(isEn ? "Action Executed" : "تم تنفيذ الإجراء", isEn ? `Request marked as ${action}.` : "تم تحديث حالة الطلب بنجاح.");
      await loadRequests();
      if (selectedRequest) {
        const updated = await hrWorkflowApi.getLeaveRequests();
        const found = updated.find((r) => r.id === selectedRequest.id);
        if (found) setSelectedRequest(found);
      }
    } catch (err: any) {
      toast.error(isEn ? "Failed" : "فشلت العملية", err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleApprovalDecision = async (action: "approve" | "reject" | "return") => {
    if (!selectedRequest) return;
    const isCommentRequired = action === "reject" || action === "return";
    const comment = (
      await systemPrompt(
        isCommentRequired
          ? isEn
            ? `Enter required reason for ${action}:`
            : `يرجى إدخال سبب ${action === "reject" ? "الرفض" : "الإعادة للتعديل"} (إلزامي):`
          : isEn
            ? "Enter optional approval comment:"
            : "تعليق الاعتماد (اختياري):",
        "",
      )
    )?.trim();

    if (comment === undefined) return;
    if (isCommentRequired && !comment) {
      toast.error(isEn ? "Required" : "مطلوب", isEn ? "Comment is required for this action." : "التعليق إلزامي لهذا الإجراء.");
      return;
    }

    setBusy(true);
    try {
      await hrWorkflowApi.decideLeave(selectedRequest.id, action, comment || "", selectedRequest.rowVersion);
      toast.success(isEn ? "Decision Recorded" : "تم تسجيل القرار", isEn ? `Leave request ${action}ed.` : "تم تحديث قرار الاعتماد بنجاح.");
      await loadRequests();
      const updated = await hrWorkflowApi.getLeaveRequests();
      const found = updated.find((r) => r.id === selectedRequest.id);
      if (found) setSelectedRequest(found);
    } catch (err: any) {
      toast.error(isEn ? "Failed" : "فشلت العملية", err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleForceCancel = async () => {
    if (!selectedRequest) return;
    const comment = (
      await systemPrompt(
        isEn ? "Enter mandatory cancellation reason for Force Cancel:" : "أدخل سبب الإلغاء الإجباري (إلزامي):",
        "",
      )
    )?.trim();
    if (!comment) {
      if (comment !== undefined) toast.error(isEn ? "Required" : "مطلوب", isEn ? "Reason is required." : "السبب مطلوب.");
      return;
    }

    setBusy(true);
    try {
      await hrWorkflowApi.forceCancelLeave(selectedRequest.id, comment, selectedRequest.rowVersion);
      toast.success(isEn ? "Cancelled" : "تم الإلغاء", isEn ? "Leave request force cancelled." : "تم إلغاء الإجازة إجباريًا.");
      await loadRequests();
      const updated = await hrWorkflowApi.getLeaveRequests();
      const found = updated.find((r) => r.id === selectedRequest.id);
      if (found) setSelectedRequest(found);
    } catch (err: any) {
      toast.error(isEn ? "Failed" : "فشلت العملية", err.message);
    } finally {
      setBusy(false);
    }
  };

  // Date Change Handlers
  const handleCreateDateChange = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    if (!dateChangeForm.requestedStartDate || !dateChangeForm.requestedEndDate || !dateChangeForm.reason.trim()) {
      toast.error(isEn ? "Required" : "مطلوب", isEn ? "Please fill in all date change fields." : "يرجى تعبئة جميع الحقول المطلوبة.");
      return;
    }
    if (dateChangeForm.requestedEndDate < dateChangeForm.requestedStartDate) {
      toast.error(isEn ? "Invalid Dates" : "تواريخ غير صالحة", isEn ? "End date cannot be before start date." : "تاريخ النهاية لا يمكن أن يسبق تاريخ البداية.");
      return;
    }

    setBusy(true);
    try {
      await hrWorkflowApi.createDateChange(selectedRequest.id, {
        requestedStartDate: dateChangeForm.requestedStartDate,
        requestedEndDate: dateChangeForm.requestedEndDate,
        reason: dateChangeForm.reason.trim(),
      });
      toast.success(isEn ? "Submitted" : "تم الإرسال", isEn ? "Date change request submitted." : "تم تقديم طلب تغيير الموعد بنجاح.");
      setDateChangeModalOpen(false);
      setDateChangeForm({ requestedStartDate: "", requestedEndDate: "", reason: "" });
      await loadSubResources(selectedRequest.id);
      await loadRequests();
    } catch (err: any) {
      toast.error(isEn ? "Failed" : "فشل الطلب", err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleResolveDateChange = async (change: LeaveDateChangeRequest, approve: boolean) => {
    if (!selectedRequest) return;
    const reason = (
      await systemPrompt(
        isEn ? `Enter resolution reason to ${approve ? "Approve" : "Reject"} date change:` : `أدخل سبب ${approve ? "قبول" : "رفض"} تغيير الموعد:`,
        "",
      )
    )?.trim();
    if (!reason) {
      if (reason !== undefined) toast.error(isEn ? "Required" : "مطلوب", isEn ? "Reason is required." : "السبب مطلوب.");
      return;
    }

    setBusy(true);
    try {
      await hrWorkflowApi.resolveDateChange(selectedRequest.id, change.id, {
        approve,
        resolutionReason: reason,
        rowVersion: change.rowVersion,
      });
      toast.success(isEn ? "Resolved" : "تم البت في الطلب", isEn ? "Date change resolution saved." : "تم تسجيل قرار تغيير الموعد.");
      await loadSubResources(selectedRequest.id);
      await loadRequests();
    } catch (err: any) {
      toast.error(isEn ? "Failed" : "فشلت العملية", err.message);
    } finally {
      setBusy(false);
    }
  };

  // Cancellation Handlers
  const handleCreateCancellation = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    if (!cancellationReason.trim()) {
      toast.error(isEn ? "Required" : "مطلوب", isEn ? "Reason is required." : "يرجى كتابة سبب الإلغاء.");
      return;
    }

    setBusy(true);
    try {
      await hrWorkflowApi.createCancellation(selectedRequest.id, cancellationReason.trim());
      toast.success(isEn ? "Submitted" : "تم الإرسال", isEn ? "Cancellation request submitted." : "تم تقديم طلب إلغاء الإجازة بنجاح.");
      setCancellationModalOpen(false);
      setCancellationReason("");
      await loadSubResources(selectedRequest.id);
      await loadRequests();
    } catch (err: any) {
      toast.error(isEn ? "Failed" : "فشل الطلب", err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleResolveCancellation = async (canc: LeaveCancellationRequest, approve: boolean) => {
    if (!selectedRequest) return;
    const reason = (
      await systemPrompt(
        isEn ? `Enter resolution reason to ${approve ? "Approve" : "Reject"} cancellation:` : `أدخل سبب ${approve ? "قبول" : "رفض"} طلب الإلغاء:`,
        "",
      )
    )?.trim();
    if (!reason) {
      if (reason !== undefined) toast.error(isEn ? "Required" : "مطلوب", isEn ? "Reason is required." : "السبب مطلوب.");
      return;
    }

    setBusy(true);
    try {
      await hrWorkflowApi.resolveCancellation(selectedRequest.id, canc.id, {
        approve,
        resolutionReason: reason,
        rowVersion: canc.rowVersion,
      });
      toast.success(isEn ? "Resolved" : "تم البت في الإلغاء", isEn ? "Cancellation resolution saved." : "تم تسجيل قرار طلب الإلغاء.");
      await loadSubResources(selectedRequest.id);
      await loadRequests();
    } catch (err: any) {
      toast.error(isEn ? "Failed" : "فشلت العملية", err.message);
    } finally {
      setBusy(false);
    }
  };

  // Document Handlers
  const handleUploadDocument = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    if (!docFile) {
      toast.error(isEn ? "File Required" : "الملف مطلوب", isEn ? "Please select a file to upload." : "يرجى تحديد ملف للرفع.");
      return;
    }
    if (docFile.size > 10 * 1024 * 1024) {
      toast.error(isEn ? "File too large" : "حجم الملف كبير جداً", isEn ? "Maximum allowed file size is 10 MB." : "أقصى حجم مسموح للملف هو 10 ميجابايت.");
      return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", docFile);

      if (docUploadVersionDocId) {
        await hrWorkflowApi.uploadDocumentVersion(selectedRequest.id, docUploadVersionDocId, fd);
        toast.success(isEn ? "New Version Uploaded" : "تم رفع إصدار جديد", isEn ? "Document version uploaded successfully." : "تم رفع الإصدار الجديد من الوثيقة بنجاح.");
      } else {
        fd.append("kind", docForm.kind);
        if (docForm.referenceNumber) fd.append("referenceNumber", docForm.referenceNumber.trim());
        if (docForm.issuedOn) fd.append("issuedOn", docForm.issuedOn);
        if (docForm.expiresOn) fd.append("expiresOn", docForm.expiresOn);
        if (docForm.notes) fd.append("notes", docForm.notes.trim());

        await hrWorkflowApi.uploadDocument(selectedRequest.id, fd);
        toast.success(isEn ? "Uploaded" : "تم الرفع", isEn ? "Leave document uploaded successfully." : "تم رفع وثيقة الإجازة بنجاح.");
      }

      setDocUploadModalOpen(false);
      setDocUploadVersionDocId(null);
      setDocFile(null);
      setDocForm({ kind: "Ticket", referenceNumber: "", issuedOn: "", expiresOn: "", notes: "" });
      await loadSubResources(selectedRequest.id);
    } catch (err: any) {
      toast.error(isEn ? "Failed" : "فشل الرفع", err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateDocMetadata = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !editingDoc) return;

    setBusy(true);
    try {
      await hrWorkflowApi.updateDocumentMetadata(
        selectedRequest.id,
        editingDoc.id,
        {
          metadata: {
            kind: editingDoc.kind,
            referenceNumber: editingDoc.referenceNumber?.trim() || null,
            issuedOn: editingDoc.issuedOn || null,
            expiresOn: editingDoc.expiresOn || null,
            notes: editingDoc.notes?.trim() || null,
          },
          rowVersion: editingDoc.rowVersion,
        },
      );
      toast.success(isEn ? "Updated" : "تم التحديث", isEn ? "Document metadata updated." : "تم تحديث بيانات الوثيقة بنجاح.");
      setDocEditMetaModalOpen(false);
      setEditingDoc(null);
      await loadSubResources(selectedRequest.id);
    } catch (err: any) {
      toast.error(isEn ? "Failed" : "فشل التحديث", err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadDoc = async (doc: LeaveDocumentResponse) => {
    if (!selectedRequest) return;
    try {
      const { blob, fileName } = await hrWorkflowApi.downloadDocument(selectedRequest.id, doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || doc.currentFileName || "leave-document";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(isEn ? "Download Failed" : "فشل التنزيل", err.message);
    }
  };

  const handleArchiveDoc = async (doc: LeaveDocumentResponse) => {
    if (!selectedRequest) return;
    const reason = (
      await systemPrompt(
        isEn ? "Enter mandatory archive reason:" : "أدخل سبب الأرشفة (إلزامي):",
        "",
      )
    )?.trim();
    if (!reason) {
      if (reason !== undefined) toast.error(isEn ? "Required" : "مطلوب", isEn ? "Reason is required." : "السبب مطلوب.");
      return;
    }

    setBusy(true);
    try {
      await hrWorkflowApi.archiveDocument(selectedRequest.id, doc.id, reason, doc.rowVersion);
      toast.success(isEn ? "Archived" : "تمت الأرشفة", isEn ? "Document archived successfully." : "تم أرشفة الوثيقة بنجاح.");
      await loadSubResources(selectedRequest.id);
    } catch (err: any) {
      toast.error(isEn ? "Failed" : "فشلت الأرشفة", err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className={`flex flex-wrap items-end justify-between gap-4 ${embedded ? "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4" : ""}`}>
        <div>
          {!embedded && <p className="text-sm font-bold text-[#1167c9]">{t("nav.hrManagement")}</p>}
          <h1 className="mt-1 text-3xl font-black">{isEn ? "Vacation & Leave Management" : "إدارة الإجازات ومسارات العمل"}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {isEn
              ? "Manage employee leave requests, configure leave types, track approvals, and handle documents."
              : "إدارة طلبات الإجازات، تهيئة وضبط أنواع الإجازات، متابعة مسارات الاعتماد، وإدارة الوثائق."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => { void loadCatalogs(); void loadRequests(); }} loading={loading}>
            <RefreshCw size={17} />
            {isEn ? "Refresh" : "تحديث"}
          </Button>
          {canManage && activeTopTab === "requests" && (
            <Button onClick={openCreateModal}>
              <Plus size={18} />
              {isEn ? "New Leave Request" : "طلب إجازة جديد"}
            </Button>
          )}
          {canManage && activeTopTab === "types" && (
            <Button onClick={openCreateLeaveTypeModal}>
              <Plus size={18} />
              {isEn ? "New Leave Type" : "إضافة نوع إجازة"}
            </Button>
          )}
        </div>
      </header>

      {/* Top Module Tabs Switcher: Requests vs Leave Types */}
      <div className="flex gap-2 border-b border-[var(--border)] pb-2">
        <button
          type="button"
          onClick={() => setActiveTopTab("requests")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            activeTopTab === "requests"
              ? "bg-[#1167c9] text-white shadow-xs"
              : "text-[var(--muted)] hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800"
          }`}
        >
          <CalendarCheck size={16} />
          {isEn ? "Leave Requests" : "طلبات الإجازات"}
          <span className={`rounded-full px-2 py-0.5 text-xs ${activeTopTab === "requests" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"}`}>
            {requests.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTopTab("types")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
            activeTopTab === "types"
              ? "bg-[#1167c9] text-white shadow-xs"
              : "text-[var(--muted)] hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800"
          }`}
        >
          <Settings2 size={16} />
          {isEn ? "Leave Types (نوع الإجازة)" : "أنواع الإجازات (إعدادات الكتالوج)"}
          <span className={`rounded-full px-2 py-0.5 text-xs ${activeTopTab === "types" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"}`}>
            {leaveTypes.length}
          </span>
        </button>
      </div>

      {/* ==================== TAB 1: LEAVE REQUESTS ==================== */}
      {activeTopTab === "requests" && (
        <div className="space-y-6">
          {/* KPI Stats Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
              <span className="text-xs font-semibold text-[var(--muted)] block">{isEn ? "Total Requests" : "إجمالي الطلبات"}</span>
              <span className="mt-1 text-2xl font-black text-slate-900 dark:text-white font-mono block">{stats.total}</span>
            </div>
            <div className={`rounded-2xl border p-4 shadow-xs ${stats.pending > 0 ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20" : "border-[var(--border)] bg-[var(--surface)]"}`}>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 block">{isEn ? "Pending Approval" : "قيد الاعتماد"}</span>
              <span className="mt-1 text-2xl font-black text-amber-900 dark:text-amber-200 font-mono block">{stats.pending}</span>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 block">{isEn ? "Active Leaves" : "إجازات سارية"}</span>
              <span className="mt-1 text-2xl font-black text-blue-900 dark:text-blue-200 font-mono block">{stats.active}</span>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 block">{isEn ? "Approved" : "معتمدة"}</span>
              <span className="mt-1 text-2xl font-black text-emerald-900 dark:text-emerald-200 font-mono block">{stats.approved}</span>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
              <span className="text-xs font-semibold text-orange-700 dark:text-orange-400 block">{isEn ? "Returned for Changes" : "معاد للتعديل"}</span>
              <span className="mt-1 text-2xl font-black text-orange-900 dark:text-orange-200 font-mono block">{stats.returned}</span>
            </div>
          </div>

          {/* Main Table Card */}
          <Card className="overflow-hidden">
            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] p-4">
              <label className="relative min-w-[260px] flex-1">
                <Search className={`absolute top-3 text-[var(--muted)] ${isEn ? "left-3" : "right-3"}`} size={18} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isEn ? "Search by request #, employee, reason..." : "ابحث برقم الطلب، اسم الموظف، السبب..."}
                  className={`h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] ${isEn ? "pl-10 pr-3" : "pr-10 pl-3"}`}
                />
              </label>
              <div className="w-64">
                <SearchableSelect
                  value={employeeFilter}
                  onChange={(val) => setEmployeeFilter(val)}
                  options={[{ value: "", label: isEn ? "All Employees" : "جميع الموظفين" }, ...employees]}
                  placeholder={isEn ? "Filter Employee..." : "فلترة حسب الموظف..."}
                />
              </div>
            </div>

            {/* Status Pills Tab Filter */}
            <div className="flex gap-1.5 overflow-x-auto border-b border-[var(--border)] bg-slate-50/50 p-2 text-xs">
              {[
                { key: "ALL", labelAr: "الكل", labelEn: "All" },
                { key: "PendingApproval", labelAr: "قيد الاعتماد", labelEn: "Pending Approval" },
                { key: "Approved", labelAr: "معتمد", labelEn: "Approved" },
                { key: "Active", labelAr: "ساري", labelEn: "Active" },
                { key: "ReturnedForChanges", labelAr: "معاد للتعديل", labelEn: "Returned" },
                { key: "Draft", labelAr: "مسودة", labelEn: "Draft" },
                { key: "Completed", labelAr: "مكتمل", labelEn: "Completed" },
                { key: "CancellationPending", labelAr: "طلب إلغاء", labelEn: "Cancellation Pending" },
                { key: "Cancelled", labelAr: "ملغي", labelEn: "Cancelled" },
                { key: "Rejected", labelAr: "مرفوض", labelEn: "Rejected" },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setStatusFilter(pill.key)}
                  className={`rounded-lg px-3 py-1.5 font-bold transition-colors whitespace-nowrap ${
                    statusFilter === pill.key
                      ? "bg-[#1167c9] text-white shadow-xs"
                      : "text-[var(--muted)] hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  }`}
                >
                  {isEn ? pill.labelEn : pill.labelAr}
                </button>
              ))}
            </div>

            {/* Table */}
            {loading ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[840px] text-sm text-start">
                  <thead className="bg-slate-50 text-[var(--muted)] dark:bg-slate-900/50">
                    <tr>
                      <th className="px-4 py-3 text-start">{isEn ? "Request #" : "رقم الطلب"}</th>
                      <th className="px-4 py-3 text-start">{isEn ? "Employee" : "الموظف"}</th>
                      <th className="px-4 py-3 text-start">{isEn ? "Leave Type" : "نوع الإجازة"}</th>
                      <th className="px-4 py-3 text-start">{isEn ? "Period & Days" : "الفترة والأيام"}</th>
                      <th className="px-4 py-3 text-start">{isEn ? "Expected Return" : "العودة المتوقعة"}</th>
                      <th className="px-4 py-3 text-start">{isEn ? "Status" : "الحالة"}</th>
                      <th className="px-4 py-3 text-start">{isEn ? "HR Status" : "حالة HR"}</th>
                      <th className="px-4 py-3 text-start">{isEn ? "Actions" : "الإجراءات"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((row) => {
                      const statusInfo = STATUS_STYLES[row.status] || {
                        labelAr: row.status,
                        labelEn: row.status,
                        bg: "bg-slate-100",
                        text: "text-slate-700",
                        border: "border-slate-200",
                      };
                      const hrStatusInfo = HR_STATUS_STYLES[row.hrStatus] || {
                        labelAr: row.hrStatus,
                        labelEn: row.hrStatus,
                        bg: "bg-slate-100",
                        text: "text-slate-700",
                        border: "border-slate-200",
                      };
                      const resolvedType = leaveTypeMap.get(row.leaveTypeId);
                      const typeLabel = isEn ? resolvedType?.nameEn || row.leaveTypeNameAr : row.leaveTypeNameAr;

                      return (
                        <tr
                          key={row.id}
                          className="border-t border-[var(--border)] transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/20"
                        >
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {row.requestNumber}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            <div className="flex items-center gap-2">
                              <div className="grid size-7 place-items-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                <User size={14} />
                              </div>
                              <span>{row.employeeNameAr}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#1167c9]">
                            {typeLabel}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-mono">
                                {row.startDate ? row.startDate.slice(0, 10) : "—"} → {row.endDate ? row.endDate.slice(0, 10) : "—"}
                              </span>
                              <span className="inline-flex w-fit items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {row.calendarDays} {isEn ? "days" : "أيام"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-[var(--muted)]">
                            {row.expectedReturnDate ? row.expectedReturnDate.slice(0, 10) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                              {isEn ? statusInfo.labelEn : statusInfo.labelAr}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${hrStatusInfo.bg} ${hrStatusInfo.text} ${hrStatusInfo.border}`}>
                              {isEn ? hrStatusInfo.labelEn : hrStatusInfo.labelAr}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRequest(row);
                                  setDrawerTab("overview");
                                }}
                                className="inline-flex h-9 items-center gap-1 rounded-lg border border-[var(--border)] px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <Info size={14} />
                                {isEn ? "Details" : "التفاصيل"}
                              </button>
                              {canManage && (row.status === "Draft" || row.status === "ReturnedForChanges") && (
                                <button
                                  type="button"
                                  onClick={() => openEditModal(row)}
                                  className="grid size-9 place-items-center rounded-lg border border-[var(--border)] text-[#1167c9] hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                  title={isEn ? "Edit Request" : "تعديل الطلب"}
                                >
                                  <Edit3 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!filteredRequests.length && (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-sm text-[var(--muted)]">
                          {isEn ? "No matching leave requests found." : "لا توجد طلبات إجازة مطابقة."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ==================== TAB 2: LEAVE TYPES MANAGEMENT ==================== */}
      {activeTopTab === "types" && (
        <div className="space-y-6">
          {/* Leave Types KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs">
              <span className="text-xs font-semibold text-[var(--muted)] block">{isEn ? "Total Leave Types" : "إجمالي أنواع الإجازات"}</span>
              <span className="mt-1 text-2xl font-black text-slate-900 dark:text-white font-mono block">{leaveTypeStats.total}</span>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs dark:bg-emerald-950/20">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 block">{isEn ? "Active Types (Available in dropdown)" : "أنواع نشطة (تظهر في القائمة)"}</span>
              <span className="mt-1 text-2xl font-black text-emerald-900 dark:text-emerald-200 font-mono block">{leaveTypeStats.active}</span>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-xs dark:bg-slate-900/30">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">{isEn ? "Disabled Types" : "أنواع معطّلة"}</span>
              <span className="mt-1 text-2xl font-black text-slate-800 dark:text-slate-200 font-mono block">{leaveTypeStats.disabled}</span>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs dark:bg-rose-950/20">
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 block">{isEn ? "Archived Types" : "أنواع مؤرشفة"}</span>
              <span className="mt-1 text-2xl font-black text-rose-900 dark:text-rose-200 font-mono block">{leaveTypeStats.archived}</span>
            </div>
          </div>

          {/* Leave Types Table Card */}
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4">
              <div>
                <h3 className="text-base font-black">{isEn ? "Configured Leave Types" : "أنواع الإجازات المعرفة"}</h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {isEn
                    ? "Control which leave types are Active for employee requests, configure balances, and set maximum calendar days."
                    : "التحكم في أنواع الإجازات المتاحة للموظفين، شروط الرصيد والوثائق، والحد الأقصى للأيام."}
                </p>
              </div>
              {canManage && (
                <Button onClick={openCreateLeaveTypeModal}>
                  <Plus size={16} />
                  {isEn ? "Add Leave Type" : "إضافة نوع جديد"}
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm text-start">
                <thead className="bg-slate-50 text-[var(--muted)] dark:bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 text-start">{isEn ? "Code" : "الرمز"}</th>
                    <th className="px-4 py-3 text-start">{isEn ? "Arabic Name" : "الاسم العربي"}</th>
                    <th className="px-4 py-3 text-start">{isEn ? "English Name" : "الاسم الإنجليزي"}</th>
                    <th className="px-4 py-3 text-start">{isEn ? "Max Days" : "الحد الأقصى"}</th>
                    <th className="px-4 py-3 text-start">{isEn ? "Rules & Flags" : "الشروط والمتطلبات"}</th>
                    <th className="px-4 py-3 text-start">{isEn ? "Status" : "الحالة"}</th>
                    <th className="px-4 py-3 text-start">{isEn ? "Actions" : "الإجراءات"}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveTypes.map((lt) => {
                    const stInfo = LEAVE_TYPE_STATUS_STYLES[lt.status] || {
                      labelAr: lt.status,
                      labelEn: lt.status,
                      bg: "bg-slate-100",
                      text: "text-slate-700",
                      border: "border-slate-200",
                    };
                    return (
                      <tr key={lt.id} className="border-t border-[var(--border)] hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                        <td className="px-4 py-3 font-mono font-bold text-[#1167c9]">
                          {lt.code}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {lt.nameAr}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                          {lt.nameEn}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {lt.maximumCalendarDays ? `${lt.maximumCalendarDays} ${isEn ? "days" : "يوم"}` : <span className="text-[var(--muted)]">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {lt.requiresBalance && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200/50">
                                <ShieldCheck size={11} /> {isEn ? "Balance" : "رصيد"}
                              </span>
                            )}
                            {lt.requiresHrDocuments && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200/50">
                                <FileCheck size={11} /> {isEn ? "HR Docs" : "وثائق"}
                              </span>
                            )}
                            {lt.requiresExitReentryVisa && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200/50">
                                <Plane size={11} /> {isEn ? "Visa" : "تأشيرة"}
                              </span>
                            )}
                            {!lt.requiresBalance && !lt.requiresHrDocuments && !lt.requiresExitReentryVisa && (
                              <span className="text-xs text-[var(--muted)]">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${stInfo.bg} ${stInfo.text} ${stInfo.border}`}>
                            {isEn ? stInfo.labelEn : stInfo.labelAr}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => openEditLeaveTypeModal(lt)}
                              className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 text-xs font-bold text-[#1167c9] hover:bg-blue-50"
                            >
                              <Edit3 size={13} />
                              {isEn ? "Edit" : "تعديل"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!leaveTypes.length && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-sm text-[var(--muted)]">
                        {isEn ? "No leave types configured." : "لا توجد أنواع إجازات مضافة."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ==================== CREATE / EDIT LEAVE TYPE MODAL ==================== */}
      {leaveTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h2 className="text-xl font-black">
                {editingLeaveType
                  ? isEn
                    ? "Edit Leave Type"
                    : "تعديل نوع الإجازة"
                  : isEn
                    ? "New Leave Type"
                    : "إضافة نوع إجازة جديد"}
              </h2>
              <button
                type="button"
                onClick={() => setLeaveTypeModalOpen(false)}
                className="grid size-9 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {leaveTypeError && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                {leaveTypeError}
              </p>
            )}

            <form onSubmit={handleSaveLeaveType} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">{isEn ? "Code (e.g. ANNUAL) *" : "الرمز (مثل ANNUAL) *"}</label>
                  <input
                    type="text"
                    required
                    value={leaveTypeForm.code}
                    onChange={(e) => setLeaveTypeForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="ANNUAL"
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-mono uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">{isEn ? "Arabic Name *" : "الاسم العربي *"}</label>
                  <input
                    type="text"
                    required
                    value={leaveTypeForm.nameAr}
                    onChange={(e) => setLeaveTypeForm((prev) => ({ ...prev, nameAr: e.target.value }))}
                    placeholder="إجازة سنوية"
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">{isEn ? "English Name *" : "الاسم الإنجليزي *"}</label>
                  <input
                    type="text"
                    required
                    value={leaveTypeForm.nameEn}
                    onChange={(e) => setLeaveTypeForm((prev) => ({ ...prev, nameEn: e.target.value }))}
                    placeholder="Annual Leave"
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">{isEn ? "Status *" : "الحالة *"}</label>
                  <select
                    value={leaveTypeForm.status}
                    onChange={(e) => setLeaveTypeForm((prev) => ({ ...prev, status: e.target.value as LeaveTypeStatus }))}
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-bold"
                  >
                    <option value="Active">{isEn ? "Active (Available for requests)" : "نشط (متاح لطلبات الموظفين)"}</option>
                    <option value="Disabled">{isEn ? "Disabled (Temporarily unavailable)" : "معطّل (غير متاح مؤقتاً)"}</option>
                    <option value="Archived">{isEn ? "Archived (Discontinued)" : "مؤرشف (ملغي)"}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">{isEn ? "Maximum Calendar Days (Optional)" : "الحد الأقصى للأيام (اختياري)"}</label>
                  <input
                    type="number"
                    min="1"
                    value={leaveTypeForm.maximumCalendarDays ?? ""}
                    onChange={(e) => setLeaveTypeForm((prev) => ({ ...prev, maximumCalendarDays: e.target.value ? Number(e.target.value) : null }))}
                    placeholder="e.g. 30"
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                  />
                </div>
              </div>

              {/* Requirement Checkboxes */}
              <div className="rounded-xl border border-[var(--border)] p-3 space-y-2">
                <span className="text-xs font-bold text-[var(--muted)] block">{isEn ? "Requirements & Rules" : "الاشتراطات والمتطلبات"}</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="flex items-center gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={leaveTypeForm.requiresBalance}
                      onChange={(e) => setLeaveTypeForm((prev) => ({ ...prev, requiresBalance: e.target.checked }))}
                      className="size-4 rounded accent-[#1167c9]"
                    />
                    {isEn ? "Requires Balance" : "يتطلب رصيداً"}
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={leaveTypeForm.requiresHrDocuments}
                      onChange={(e) => setLeaveTypeForm((prev) => ({ ...prev, requiresHrDocuments: e.target.checked }))}
                      className="size-4 rounded accent-[#1167c9]"
                    />
                    {isEn ? "Requires HR Documents" : "يتطلب وثائق موارد بشرية"}
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={leaveTypeForm.requiresExitReentryVisa}
                      onChange={(e) => setLeaveTypeForm((prev) => ({ ...prev, requiresExitReentryVisa: e.target.checked }))}
                      className="size-4 rounded accent-[#1167c9]"
                    />
                    {isEn ? "Requires Exit/Reentry Visa" : "يتطلب تأشيرة خروج وعودة"}
                  </label>
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">{isEn ? "Arabic Description" : "الوصف العربي"}</label>
                  <textarea
                    rows={2}
                    value={leaveTypeForm.descriptionAr || ""}
                    onChange={(e) => setLeaveTypeForm((prev) => ({ ...prev, descriptionAr: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">{isEn ? "English Description" : "الوصف الإنجليزي"}</label>
                  <textarea
                    rows={2}
                    value={leaveTypeForm.descriptionEn || ""}
                    onChange={(e) => setLeaveTypeForm((prev) => ({ ...prev, descriptionEn: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
                <Button type="button" variant="secondary" onClick={() => setLeaveTypeModalOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" loading={busy}>
                  <Check size={18} />
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ==================== CREATE / EDIT LEAVE REQUEST MODAL ==================== */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h2 className="text-xl font-black">
                {editingRequest
                  ? isEn
                    ? "Edit Leave Request"
                    : "تعديل طلب الإجازة"
                  : isEn
                    ? "New Leave Request"
                    : "إنشاء طلب إجازة جديد"}
              </h2>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="grid size-9 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                {formError}
              </p>
            )}

            <form onSubmit={handleSaveRequest} className="grid gap-4 md:grid-cols-2">
              {/* Employee */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold">{isEn ? "Employee *" : "الموظف *"}</label>
                <SearchableSelect
                  value={formData.employeeId}
                  onChange={(val) => setFormData((prev) => ({ ...prev, employeeId: val }))}
                  options={employees}
                  placeholder={isEn ? "Select employee..." : "اختر الموظف..."}
                  required
                />
              </div>

              {/* Leave Type (Active Only) with quick create/manage button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold">{isEn ? "Leave Type (Active only) *" : "نوع الإجازة (النشطة فقط) *"}</label>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => openCreateLeaveTypeModal()}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1167c9] hover:underline"
                    >
                      <Plus size={12} />
                      {isEn ? "Add Leave Type" : "إضافة نوع إجازة"}
                    </button>
                  )}
                </div>
                <SearchableSelect
                  value={formData.leaveTypeId}
                  onChange={(val) => setFormData((prev) => ({ ...prev, leaveTypeId: val }))}
                  options={activeLeaveTypesOptions}
                  placeholder={isEn ? "Select leave type..." : "اختر نوع الإجازة..."}
                  required
                />
                {selectedLeaveType?.maximumCalendarDays && (
                  <span className="text-[11px] text-[var(--muted)] block">
                    {isEn
                      ? `Max allowed duration: ${selectedLeaveType.maximumCalendarDays} calendar days`
                      : `الحد الأقصى المسموح: ${selectedLeaveType.maximumCalendarDays} يوم`}
                  </span>
                )}
              </div>

              {/* Start Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold">{isEn ? "Start Date *" : "تاريخ البداية *"}</label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold">{isEn ? "End Date *" : "تاريخ النهاية *"}</label>
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                />
              </div>

              {/* Duration Preview Banner */}
              <div className="col-span-full rounded-xl border border-blue-100 bg-blue-50/50 p-3 flex items-center justify-between text-xs font-bold text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200">
                <span className="flex items-center gap-2">
                  <Calendar size={15} />
                  {isEn ? "Calculated Duration:" : "المدة المحتسبة تلقائياً:"}
                </span>
                <span className="text-sm font-black font-mono">
                  {formDays} {isEn ? "Calendar Days (inclusive)" : "يوم تقويمي (شامل البداية والنهاية)"}
                </span>
              </div>

              {/* Expected Return Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold">{isEn ? "Expected Return Date *" : "تاريخ العودة المتوقع *"}</label>
                <input
                  type="date"
                  required
                  value={formData.expectedReturnDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, expectedReturnDate: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                />
              </div>

              {/* Destination Country Code (max 2 chars) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold">{isEn ? "Destination Country (2-letter ISO, e.g. SA)" : "رمز دولة الوجهة (حرفين، مثل SA)"}</label>
                <input
                  type="text"
                  maxLength={2}
                  value={formData.destinationCountryCode || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, destinationCountryCode: e.target.value.toUpperCase() }))}
                  placeholder="SA"
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm uppercase font-mono"
                />
              </div>

              {/* Contact Phone During Leave */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold">{isEn ? "Contact Phone During Leave" : "هاتف التواصل أثناء الإجازة"}</label>
                <input
                  type="tel"
                  value={formData.contactPhoneDuringLeave || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contactPhoneDuringLeave: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                />
              </div>

              {/* Emergency Contact Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold">{isEn ? "Emergency Contact Name" : "اسم شخص للطوارئ"}</label>
                <input
                  type="text"
                  value={formData.emergencyContactName || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, emergencyContactName: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                />
              </div>

              {/* Emergency Contact Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold">{isEn ? "Emergency Contact Phone" : "هاتف الطوارئ"}</label>
                <input
                  type="tel"
                  value={formData.emergencyContactPhone || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                />
              </div>

              {/* Related Client Contract */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold">{isEn ? "Related Client Contract" : "عقد العميل المرتبط"}</label>
                <SearchableSelect
                  value={formData.relatedClientContractId || ""}
                  onChange={(val) => setFormData((prev) => ({ ...prev, relatedClientContractId: val }))}
                  options={[{ value: "", label: isEn ? "None" : "لا يوجد" }, ...contracts]}
                  placeholder={isEn ? "Select contract..." : "اختر العقد..."}
                />
              </div>

              {/* Reason (Required) */}
              <div className="col-span-full space-y-1.5">
                <label className="text-xs font-bold">{isEn ? "Reason *" : "سبب الإجازة *"}</label>
                <textarea
                  rows={2}
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
                  placeholder={isEn ? "State the reason for leave..." : "وضح سبب طلب الإجازة..."}
                />
              </div>

              {/* Notes */}
              <div className="col-span-full space-y-1.5">
                <label className="text-xs font-bold">{isEn ? "Administrative Notes" : "ملاحظات إدارية"}</label>
                <textarea
                  rows={2}
                  value={formData.notes || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
                />
              </div>

              {/* Footer */}
              <div className="col-span-full flex justify-end gap-2 border-t border-[var(--border)] pt-4">
                <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" loading={busy}>
                  <Check size={18} />
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ==================== DETAILS DRAWER / MODAL FOR LEAVE REQUEST ==================== */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-2xl flex-col bg-[var(--surface)] shadow-2xl transition-all">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] p-4 sm:p-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black text-[#1167c9]">
                    {selectedRequest.requestNumber}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${
                      STATUS_STYLES[selectedRequest.status]?.bg
                    } ${STATUS_STYLES[selectedRequest.status]?.text} ${
                      STATUS_STYLES[selectedRequest.status]?.border
                    }`}
                  >
                    {isEn
                      ? STATUS_STYLES[selectedRequest.status]?.labelEn
                      : STATUS_STYLES[selectedRequest.status]?.labelAr}
                  </span>
                </div>
                <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                  {selectedRequest.employeeNameAr} — {isEn ? leaveTypeMap.get(selectedRequest.leaveTypeId)?.nameEn || selectedRequest.leaveTypeNameAr : selectedRequest.leaveTypeNameAr}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="grid size-9 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-slate-50/70 p-3 dark:bg-slate-900/40">
              {/* Transitions */}
              {canManage && (selectedRequest.status === "Draft" || selectedRequest.status === "ReturnedForChanges") && (
                <Button className="min-h-9 px-3 text-xs" onClick={() => handleTransition("submit")} loading={busy}>
                  <Send size={14} />
                  {isEn ? "Submit Request" : "إرسال الطلب للاعتماد"}
                </Button>
              )}
              {canManage && selectedRequest.status === "Approved" && (
                <Button className="min-h-9 px-3 text-xs" onClick={() => handleTransition("activate")} loading={busy}>
                  <CheckCircle2 size={14} />
                  {isEn ? "Activate Leave" : "بدء سريان الإجازة"}
                </Button>
              )}
              {canManage && selectedRequest.status === "Active" && (
                <Button className="min-h-9 px-3 text-xs" onClick={() => handleTransition("complete")} loading={busy}>
                  <CheckCircle2 size={14} />
                  {isEn ? "Complete Leave" : "إكمال وإنهاء الإجازة"}
                </Button>
              )}

              {/* Approval Decisions */}
              {canApprove && selectedRequest.status === "PendingApproval" && (
                <>
                  <Button className="min-h-9 px-3 text-xs" onClick={() => handleApprovalDecision("approve")} loading={busy}>
                    <CheckCircle2 size={14} />
                    {isEn ? "Approve" : "اعتماد"}
                  </Button>
                  <Button className="min-h-9 px-3 text-xs" variant="danger" onClick={() => handleApprovalDecision("reject")} loading={busy}>
                    <XCircle size={14} />
                    {isEn ? "Reject" : "رفض"}
                  </Button>
                  <Button className="min-h-9 px-3 text-xs" variant="secondary" onClick={() => handleApprovalDecision("return")} loading={busy}>
                    <RotateCcw size={14} />
                    {isEn ? "Return" : "إعادة للتعديل"}
                  </Button>
                </>
              )}

              {/* Force Cancel */}
              {canApprove && selectedRequest.status !== "Completed" && selectedRequest.status !== "Cancelled" && (
                <Button className="min-h-9 px-3 text-xs text-rose-600 hover:text-rose-700" variant="secondary" onClick={handleForceCancel} loading={busy}>
                  <Ban size={14} />
                  {isEn ? "Force Cancel" : "إلغاء إجباري"}
                </Button>
              )}

              {/* Date Change trigger */}
              {canManage && (selectedRequest.status === "Approved" || selectedRequest.status === "Active") && (
                <Button className="min-h-9 px-3 text-xs" variant="secondary" onClick={() => setDateChangeModalOpen(true)}>
                  <Calendar size={14} />
                  {isEn ? "Request Date Change" : "طلب تغيير الموعد"}
                </Button>
              )}

              {/* Cancellation trigger */}
              {canManage && (selectedRequest.status === "PendingApproval" || selectedRequest.status === "Approved" || selectedRequest.status === "Active") && (
                <Button className="min-h-9 px-3 text-xs" variant="secondary" onClick={() => setCancellationModalOpen(true)}>
                  <Ban size={14} />
                  {isEn ? "Request Cancellation" : "طلب إلغاء"}
                </Button>
              )}
            </div>

            {/* Sub-Tabs Nav */}
            <div className="flex border-b border-[var(--border)] px-4">
              {[
                { key: "overview", labelAr: "نظرة عامة", labelEn: "Overview", icon: Info },
                { key: "dateChanges", labelAr: "تغيير التواريخ", labelEn: "Date Changes", icon: Calendar },
                { key: "cancellations", labelAr: "طلبات الإلغاء", labelEn: "Cancellations", icon: Ban },
                { key: "documents", labelAr: "الوثائق والمرفقات", labelEn: "Documents", icon: Paperclip },
              ].map((tItem) => {
                const TIcon = tItem.icon;
                const active = drawerTab === tItem.key;
                return (
                  <button
                    key={tItem.key}
                    type="button"
                    onClick={() => setDrawerTab(tItem.key as any)}
                    className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-bold transition-all ${
                      active
                        ? "border-[#1167c9] text-[#1167c9]"
                        : "border-transparent text-[var(--muted)] hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <TIcon size={14} />
                    {isEn ? tItem.labelEn : tItem.labelAr}
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* 1. Overview Tab */}
              {drawerTab === "overview" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <span className="text-[var(--muted)] block">{isEn ? "Leave Type" : "نوع الإجازة"}</span>
                      <span className="mt-1 text-sm font-bold text-[#1167c9] block">
                        {isEn ? leaveTypeMap.get(selectedRequest.leaveTypeId)?.nameEn || selectedRequest.leaveTypeNameAr : selectedRequest.leaveTypeNameAr}
                      </span>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <span className="text-[var(--muted)] block">{isEn ? "Duration" : "المدة"}</span>
                      <span className="mt-1 text-sm font-bold block font-mono">
                        {selectedRequest.calendarDays} {isEn ? "days" : "يوم"} ({selectedRequest.startDate ? selectedRequest.startDate.slice(0, 10) : "—"} → {selectedRequest.endDate ? selectedRequest.endDate.slice(0, 10) : "—"})
                      </span>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <span className="text-[var(--muted)] block">{isEn ? "Expected Return" : "العودة المتوقعة"}</span>
                      <span className="mt-1 text-sm font-bold block font-mono">
                        {selectedRequest.expectedReturnDate ? selectedRequest.expectedReturnDate.slice(0, 10) : "—"}
                      </span>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <span className="text-[var(--muted)] block">{isEn ? "Destination Country" : "دولة الوجهة"}</span>
                      <span className="mt-1 text-sm font-bold block font-mono">
                        {selectedRequest.destinationCountryCode || "—"}
                      </span>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <span className="text-[var(--muted)] block">{isEn ? "Contact Phone" : "هاتف التواصل أثناء الإجازة"}</span>
                      <span className="mt-1 text-sm font-bold block font-mono">
                        {selectedRequest.contactPhoneDuringLeave || "—"}
                      </span>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <span className="text-[var(--muted)] block">{isEn ? "Emergency Contact" : "شخص الطوارئ"}</span>
                      <span className="mt-1 text-sm font-bold block">
                        {selectedRequest.emergencyContactName || "—"}{" "}
                        {selectedRequest.emergencyContactPhone ? `(${selectedRequest.emergencyContactPhone})` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Reason & Notes */}
                  <div className="rounded-xl border border-[var(--border)] p-4 space-y-2">
                    <span className="text-xs font-bold text-[var(--muted)] block">{isEn ? "Reason" : "السبب"}</span>
                    <p className="text-sm font-medium leading-relaxed">{selectedRequest.reason || "—"}</p>
                    {selectedRequest.notes && (
                      <div className="mt-3 border-t border-[var(--border)] pt-2">
                        <span className="text-xs font-bold text-[var(--muted)] block">{isEn ? "Notes" : "ملاحظات"}</span>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{selectedRequest.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Reasons for Rejection or Cancellation if any */}
                  {selectedRequest.rejectionReason && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs">
                      <span className="font-bold text-red-800 block">{isEn ? "Rejection Reason:" : "سبب الرفض:"}</span>
                      <p className="mt-1 text-red-700">{selectedRequest.rejectionReason}</p>
                    </div>
                  )}
                  {selectedRequest.cancellationReason && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs">
                      <span className="font-bold text-rose-800 block">{isEn ? "Cancellation Reason:" : "سبب الإلغاء:"}</span>
                      <p className="mt-1 text-rose-700">{selectedRequest.cancellationReason}</p>
                    </div>
                  )}

                  {/* Audit Trail & Timestamps */}
                  <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                      {isEn ? "Workflow Lifecycle" : "سجل دورة الاعتماد"}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-[var(--muted)]">{isEn ? "Submitted:" : "تاريخ الإرسال:"} </span>
                        <span>{selectedRequest.submittedAtUtc ? new Date(selectedRequest.submittedAtUtc).toLocaleString(locale) : "—"}</span>
                      </div>
                      <div>
                        <span className="text-[var(--muted)]">{isEn ? "Approved:" : "تاريخ الاعتماد:"} </span>
                        <span>{selectedRequest.approvedAtUtc ? new Date(selectedRequest.approvedAtUtc).toLocaleString(locale) : "—"}</span>
                      </div>
                      <div>
                        <span className="text-[var(--muted)]">{isEn ? "Activated:" : "تاريخ التفعيل:"} </span>
                        <span>{selectedRequest.activatedAtUtc ? new Date(selectedRequest.activatedAtUtc).toLocaleString(locale) : "—"}</span>
                      </div>
                      <div>
                        <span className="text-[var(--muted)]">{isEn ? "Completed:" : "تاريخ الإكمال:"} </span>
                        <span>{selectedRequest.completedAtUtc ? new Date(selectedRequest.completedAtUtc).toLocaleString(locale) : "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Date Changes Tab */}
              {drawerTab === "dateChanges" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black">{isEn ? "Date Change Requests" : "سجل طلبات تغيير المواعيد"}</h4>
                    {canManage && (selectedRequest.status === "Approved" || selectedRequest.status === "Active") && (
                      <Button className="min-h-9 px-3 text-xs" onClick={() => setDateChangeModalOpen(true)}>
                        <Plus size={14} />
                        {isEn ? "Request Date Change" : "طلب تغيير موعد"}
                      </Button>
                    )}
                  </div>

                  {loadingDateChanges ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                      ))}
                    </div>
                  ) : dateChanges.length === 0 ? (
                    <p className="p-8 text-center text-xs text-[var(--muted)]">
                      {isEn ? "No date change requests found." : "لا توجد طلبات تغيير مواعيد مسجلة."}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {dateChanges.map((dc) => (
                        <div key={dc.id} className="rounded-xl border border-[var(--border)] p-4 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold">
                              {dc.requestedStartDate.slice(0, 10)} → {dc.requestedEndDate.slice(0, 10)}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              dc.status === "Approved" ? "bg-emerald-100 text-emerald-800" :
                              dc.status === "Rejected" ? "bg-red-100 text-red-800" :
                              dc.status === "Pending" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-800"
                            }`}>
                              {dc.status}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300">{dc.reason}</p>
                          {dc.resolutionReason && (
                            <p className="text-[11px] text-[var(--muted)] italic">
                              {isEn ? "Resolution:" : "قرار المعالجة:"} {dc.resolutionReason}
                            </p>
                          )}
                          {canApprove && dc.status === "Pending" && (
                            <div className="mt-2 flex gap-2 border-t border-[var(--border)] pt-2">
                              <Button className="min-h-9 px-3 text-xs" onClick={() => handleResolveDateChange(dc, true)} loading={busy}>
                                <Check size={14} />
                                {isEn ? "Approve" : "موافقة"}
                              </Button>
                              <Button className="min-h-9 px-3 text-xs" variant="danger" onClick={() => handleResolveDateChange(dc, false)} loading={busy}>
                                <X size={14} />
                                {isEn ? "Reject" : "رفض"}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. Cancellations Tab */}
              {drawerTab === "cancellations" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black">{isEn ? "Cancellation Requests" : "طلبات إلغاء الإجازة"}</h4>
                    {canManage && (selectedRequest.status === "PendingApproval" || selectedRequest.status === "Approved" || selectedRequest.status === "Active") && (
                      <Button className="min-h-9 px-3 text-xs" variant="secondary" onClick={() => setCancellationModalOpen(true)}>
                        <Plus size={14} />
                        {isEn ? "Request Cancellation" : "طلب إلغاء"}
                      </Button>
                    )}
                  </div>

                  {loadingCancellations ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                      ))}
                    </div>
                  ) : cancellations.length === 0 ? (
                    <p className="p-8 text-center text-xs text-[var(--muted)]">
                      {isEn ? "No cancellation requests found." : "لا توجد طلبات إلغاء مسجلة."}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {cancellations.map((canc) => (
                        <div key={canc.id} className="rounded-xl border border-[var(--border)] p-4 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold">{isEn ? "Cancellation Request" : "طلب إلغاء"}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              canc.status === "Approved" ? "bg-rose-100 text-rose-800" :
                              canc.status === "Rejected" ? "bg-slate-100 text-slate-800" :
                              canc.status === "Pending" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-800"
                            }`}>
                              {canc.status}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300">{canc.reason}</p>
                          {canc.resolutionReason && (
                            <p className="text-[11px] text-[var(--muted)] italic">
                              {isEn ? "Resolution:" : "قرار المعالجة:"} {canc.resolutionReason}
                            </p>
                          )}
                          {canApprove && canc.status === "Pending" && (
                            <div className="mt-2 flex gap-2 border-t border-[var(--border)] pt-2">
                              <Button className="min-h-9 px-3 text-xs" onClick={() => handleResolveCancellation(canc, true)} loading={busy}>
                                <Check size={14} />
                                {isEn ? "Approve Cancellation" : "اعتماد الإلغاء"}
                              </Button>
                              <Button className="min-h-9 px-3 text-xs" variant="danger" onClick={() => handleResolveCancellation(canc, false)} loading={busy}>
                                <X size={14} />
                                {isEn ? "Reject Cancellation" : "رفض الإلغاء"}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 4. Documents Tab */}
              {drawerTab === "documents" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black">{isEn ? "Attached Documents" : "الوثائق والمرفقات"}</h4>
                    {canUploadDoc && (
                      <Button
                        className="min-h-9 px-3 text-xs"
                        onClick={() => {
                          setDocUploadVersionDocId(null);
                          setDocFile(null);
                          setDocForm({ kind: "Ticket", referenceNumber: "", issuedOn: "", expiresOn: "", notes: "" });
                          setDocUploadModalOpen(true);
                        }}
                      >
                        <Upload size={14} />
                        {isEn ? "Upload Document" : "إرفاق وثيقة"}
                      </Button>
                    )}
                  </div>

                  {loadingDocuments ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                      ))}
                    </div>
                  ) : documents.length === 0 ? (
                    <p className="p-8 text-center text-xs text-[var(--muted)]">
                      {isEn ? "No documents attached to this leave request." : "لا توجد وثائق مرفقة بهذا الطلب."}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => {
                        const kindInfo = DOC_KIND_LABELS[doc.kind] || { labelAr: doc.kind, labelEn: doc.kind };
                        return (
                          <div key={doc.id} className="rounded-xl border border-[var(--border)] p-4 space-y-3 text-xs">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                  {isEn ? kindInfo.labelEn : kindInfo.labelAr}
                                </span>
                                {doc.referenceNumber && (
                                  <span className="ml-2 font-mono text-slate-600 dark:text-slate-400">
                                    #{doc.referenceNumber}
                                  </span>
                                )}
                                <h5 className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                                  {doc.currentFileName || (isEn ? "Unnamed File" : "ملف بدون اسم")}
                                </h5>
                                <span className="text-[11px] text-[var(--muted)] block mt-0.5">
                                  {formatFileSize(doc.currentFileSizeBytes)} · {isEn ? "v" : "إصدار "}{doc.currentVersionNumber || 1}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {canDownloadDoc && (
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadDoc(doc)}
                                    className="grid size-8 place-items-center rounded-lg border border-[var(--border)] text-slate-700 hover:bg-slate-100 dark:text-slate-300"
                                    title={isEn ? "Download" : "تنزيل"}
                                  >
                                    <Download size={14} />
                                  </button>
                                )}
                                {canUploadDoc && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDocUploadVersionDocId(doc.id);
                                      setDocFile(null);
                                      setDocUploadModalOpen(true);
                                    }}
                                    className="grid size-8 place-items-center rounded-lg border border-[var(--border)] text-[#1167c9] hover:bg-blue-50"
                                    title={isEn ? "Upload new version" : "رفع إصدار جديد"}
                                  >
                                    <Upload size={14} />
                                  </button>
                                )}
                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingDoc(doc);
                                      setDocEditMetaModalOpen(true);
                                    }}
                                    className="grid size-8 place-items-center rounded-lg border border-[var(--border)] text-slate-700 hover:bg-slate-100 dark:text-slate-300"
                                    title={isEn ? "Edit Metadata" : "تعديل البيانات"}
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                )}
                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={() => handleArchiveDoc(doc)}
                                    className="grid size-8 place-items-center rounded-lg border border-[var(--border)] text-rose-600 hover:bg-rose-50"
                                    title={isEn ? "Archive" : "أرشفة"}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                            {(doc.issuedOn || doc.expiresOn || doc.notes) && (
                              <div className="border-t border-[var(--border)] pt-2 text-[11px] text-[var(--muted)] flex flex-wrap gap-x-4 gap-y-1">
                                {doc.issuedOn && <span>{isEn ? "Issued:" : "تاريخ الإصدار:"} {doc.issuedOn.slice(0, 10)}</span>}
                                {doc.expiresOn && <span>{isEn ? "Expires:" : "تاريخ الانتهاء:"} {doc.expiresOn.slice(0, 10)}</span>}
                                {doc.notes && <span className="w-full text-slate-600 dark:text-slate-400">{doc.notes}</span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Date Change Request Modal */}
      {dateChangeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="text-base font-black">{isEn ? "Request Date Change" : "طلب تغيير موعد الإجازة"}</h3>
              <button type="button" onClick={() => setDateChangeModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateDateChange} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold">{isEn ? "New Start Date *" : "تاريخ البداية الجديد *"}</label>
                <input
                  type="date"
                  required
                  value={dateChangeForm.requestedStartDate}
                  onChange={(e) => setDateChangeForm((prev) => ({ ...prev, requestedStartDate: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold">{isEn ? "New End Date *" : "تاريخ النهاية الجديد *"}</label>
                <input
                  type="date"
                  required
                  value={dateChangeForm.requestedEndDate}
                  onChange={(e) => setDateChangeForm((prev) => ({ ...prev, requestedEndDate: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold">{isEn ? "Reason for Change *" : "سبب التغيير *"}</label>
                <textarea
                  rows={3}
                  required
                  value={dateChangeForm.reason}
                  onChange={(e) => setDateChangeForm((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--border)] p-2 text-xs"
                  placeholder={isEn ? "Explain why dates need changing..." : "وضح سبب تغيير التواريخ..."}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" className="min-h-9 px-3 text-xs" onClick={() => setDateChangeModalOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" className="min-h-9 px-3 text-xs" loading={busy}>
                  {isEn ? "Submit Request" : "إرسال الطلب"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Cancellation Request Modal */}
      {cancellationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="text-base font-black">{isEn ? "Request Cancellation" : "طلب إلغاء الإجازة"}</h3>
              <button type="button" onClick={() => setCancellationModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCancellation} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold">{isEn ? "Cancellation Reason *" : "سبب الإلغاء *"}</label>
                <textarea
                  rows={3}
                  required
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] p-2 text-xs"
                  placeholder={isEn ? "Reason for cancelling leave..." : "وضح سبب طلب إلغاء الإجازة..."}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" className="min-h-9 px-3 text-xs" onClick={() => setCancellationModalOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" className="min-h-9 px-3 text-xs" variant="danger" loading={busy}>
                  {isEn ? "Submit Cancellation" : "تأكيد طلب الإلغاء"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Document Upload Modal */}
      {docUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="text-base font-black">
                {docUploadVersionDocId
                  ? isEn
                    ? "Upload New Version"
                    : "رفع إصدار جديد من الوثيقة"
                  : isEn
                    ? "Upload Leave Document"
                    : "إرفاق وثيقة إجازة"}
              </h3>
              <button type="button" onClick={() => setDocUploadModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUploadDocument} className="space-y-3 text-xs">
              {!docUploadVersionDocId && (
                <>
                  <div className="space-y-1">
                    <label className="font-bold">{isEn ? "Document Kind *" : "نوع الوثيقة *"}</label>
                    <select
                      value={docForm.kind}
                      onChange={(e) => setDocForm((prev) => ({ ...prev, kind: e.target.value as LeaveDocumentKind }))}
                      className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-xs"
                    >
                      <option value="Ticket">{isEn ? "Ticket" : "تذكرة سفر"}</option>
                      <option value="ExitReentryVisa">{isEn ? "Exit / Re-entry Visa" : "تأشيرة خروج وعودة"}</option>
                      <option value="ApprovalLetter">{isEn ? "Approval Letter" : "خطاب موافقة"}</option>
                      <option value="Other">{isEn ? "Other" : "أخرى"}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold">{isEn ? "Reference Number" : "رقم المرجع / التذكرة"}</label>
                    <input
                      type="text"
                      value={docForm.referenceNumber}
                      onChange={(e) => setDocForm((prev) => ({ ...prev, referenceNumber: e.target.value }))}
                      className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-bold">{isEn ? "Issued On" : "تاريخ الإصدار"}</label>
                      <input
                        type="date"
                        value={docForm.issuedOn}
                        onChange={(e) => setDocForm((prev) => ({ ...prev, issuedOn: e.target.value }))}
                        className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold">{isEn ? "Expires On" : "تاريخ الانتهاء"}</label>
                      <input
                        type="date"
                        value={docForm.expiresOn}
                        onChange={(e) => setDocForm((prev) => ({ ...prev, expiresOn: e.target.value }))}
                        className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold">{isEn ? "Notes" : "ملاحظات"}</label>
                    <input
                      type="text"
                      value={docForm.notes}
                      onChange={(e) => setDocForm((prev) => ({ ...prev, notes: e.target.value }))}
                      className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-xs"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="font-bold">{isEn ? "Select File (PDF, Image, max 10MB) *" : "اختر الملف (PDF أو صورة، أقصى حجم 10 ميجابايت) *"}</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-[var(--border)] p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" className="min-h-9 px-3 text-xs" onClick={() => setDocUploadModalOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" className="min-h-9 px-3 text-xs" loading={busy}>
                  <Upload size={14} />
                  {isEn ? "Upload" : "رفع الملف"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Document Metadata Edit Modal */}
      {docEditMetaModalOpen && editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="text-base font-black">{isEn ? "Edit Document Metadata" : "تعديل بيانات الوثيقة"}</h3>
              <button type="button" onClick={() => setDocEditMetaModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateDocMetadata} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold">{isEn ? "Kind" : "النوع"}</label>
                <select
                  value={editingDoc.kind}
                  onChange={(e) => setEditingDoc({ ...editingDoc, kind: e.target.value as LeaveDocumentKind })}
                  className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-xs"
                >
                  <option value="Ticket">{isEn ? "Ticket" : "تذكرة سفر"}</option>
                  <option value="ExitReentryVisa">{isEn ? "Exit / Re-entry Visa" : "تأشيرة خروج وعودة"}</option>
                  <option value="ApprovalLetter">{isEn ? "Approval Letter" : "خطاب موافقة"}</option>
                  <option value="Other">{isEn ? "Other" : "أخرى"}</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold">{isEn ? "Reference Number" : "رقم المرجع"}</label>
                <input
                  type="text"
                  value={editingDoc.referenceNumber || ""}
                  onChange={(e) => setEditingDoc({ ...editingDoc, referenceNumber: e.target.value })}
                  className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold">{isEn ? "Issued On" : "تاريخ الإصدار"}</label>
                  <input
                    type="date"
                    value={editingDoc.issuedOn ? editingDoc.issuedOn.slice(0, 10) : ""}
                    onChange={(e) => setEditingDoc({ ...editingDoc, issuedOn: e.target.value })}
                    className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold">{isEn ? "Expires On" : "تاريخ الانتهاء"}</label>
                  <input
                    type="date"
                    value={editingDoc.expiresOn ? editingDoc.expiresOn.slice(0, 10) : ""}
                    onChange={(e) => setEditingDoc({ ...editingDoc, expiresOn: e.target.value })}
                    className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold">{isEn ? "Notes" : "ملاحظات"}</label>
                <input
                  type="text"
                  value={editingDoc.notes || ""}
                  onChange={(e) => setEditingDoc({ ...editingDoc, notes: e.target.value })}
                  className="h-10 w-full rounded-xl border border-[var(--border)] px-3 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" className="min-h-9 px-3 text-xs" onClick={() => setDocEditMetaModalOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" className="min-h-9 px-3 text-xs" loading={busy}>
                  <Check size={14} />
                  {t("common.save")}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
