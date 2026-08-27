import { authFetch, authDownload, CustomRequestInit } from "../auth/api";
import * as T from "./types";

// ---------------------------
// Helpers
// ---------------------------
function withIdempotency(init: CustomRequestInit = {}): CustomRequestInit {
  const headers = new Headers(init.headers);
  if (!headers.has("Idempotency-Key")) {
    headers.set("Idempotency-Key", crypto.randomUUID());
  }
  return { ...init, headers };
}

// ---------------------------
// Catalogs
// ---------------------------
export const getVehicleManufacturers = () =>
  authFetch<T.VehicleManufacturerResponse[]>("/api/vehicle-catalogs/manufacturers");

export const createVehicleManufacturer = (payload: T.VehicleManufacturerRequest) =>
  authFetch<T.VehicleManufacturerResponse>("/api/vehicle-catalogs/manufacturers", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إنشاء صانع المركبة بنجاح",
  });

export const updateVehicleManufacturer = (id: string, payload: T.VehicleManufacturerRequest) =>
  authFetch<T.VehicleManufacturerResponse>(`/api/vehicle-catalogs/manufacturers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    notifySuccess: "تم تحديث صانع المركبة بنجاح",
  });

export const getVehicleModels = (manufacturerId?: string) => {
  const query = manufacturerId ? `?manufacturerId=${manufacturerId}` : "";
  return authFetch<T.VehicleModelResponse[]>(`/api/vehicle-catalogs/models${query}`);
};

export const createVehicleModel = (payload: T.VehicleModelRequest) =>
  authFetch<T.VehicleModelResponse>("/api/vehicle-catalogs/models", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إنشاء موديل المركبة بنجاح",
  });

export const updateVehicleModel = (id: string, payload: T.VehicleModelRequest) =>
  authFetch<T.VehicleModelResponse>(`/api/vehicle-catalogs/models/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    notifySuccess: "تم تحديث موديل المركبة بنجاح",
  });

// ---------------------------
// Suppliers
// ---------------------------
export const getVehicleSuppliers = () =>
  authFetch<T.VehicleSupplierResponse[]>("/api/vehicle-suppliers");

export const getVehicleSupplier = (id: string) =>
  authFetch<T.VehicleSupplierResponse>(`/api/vehicle-suppliers/${id}`);

export const createVehicleSupplier = (payload: T.VehicleSupplierRequest) =>
  authFetch<T.VehicleSupplierResponse>("/api/vehicle-suppliers", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إنشاء المورد بنجاح",
  });

export const updateVehicleSupplier = (id: string, payload: T.VehicleSupplierRequest) =>
  authFetch<T.VehicleSupplierResponse>(`/api/vehicle-suppliers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    notifySuccess: "تم تحديث بيانات المورد بنجاح",
  });

export const archiveVehicleSupplier = (id: string, payload: T.ArchiveSupplierRequest) =>
  authFetch<void>(`/api/vehicle-suppliers/${id}/archive`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    notifySuccess: "تمت أرشفة المورد بنجاح",
  });

// ---------------------------
// Vehicles
// ---------------------------
export const getVehicles = (params: {
  search?: string;
  status?: string;
  operatingCityId?: string;
  page?: number;
  pageSize?: number;
}) => {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.operatingCityId) query.set("operatingCityId", params.operatingCityId);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  const qs = query.toString();
  return authFetch<T.PagedResponse<T.VehicleSummaryResponse>>(`/api/vehicles${qs ? `?${qs}` : ""}`);
};

export const getVehiclesLookup = (search: string) =>
  authFetch<T.VehicleLookupResponse[]>(`/api/vehicles/lookup?search=${encodeURIComponent(search)}`);

export const getVehicleDetail = (id: string) =>
  authFetch<T.VehicleDetailResponse>(`/api/vehicles/${id}`);

export const createVehicle = (payload: T.VehicleUpsertRequest) =>
  authFetch<T.VehicleDetailResponse>("/api/vehicles", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إضافة المركبة بنجاح",
  });

export const updateVehicle = (id: string, payload: T.VehicleUpsertRequest) =>
  authFetch<T.VehicleDetailResponse>(`/api/vehicles/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    notifySuccess: "تم تحديث بيانات المركبة بنجاح",
  });

export const archiveVehicle = (id: string, payload: T.ArchiveVehicleRequest) =>
  authFetch<void>(`/api/vehicles/${id}/archive`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    notifySuccess: "تمت أرشفة المركبة بنجاح",
  });

export const restoreVehicle = (id: string, payload: T.RowVersionRequest) =>
  authFetch<T.VehicleDetailResponse>(`/api/vehicles/${id}/restore`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    notifySuccess: "تم استعادة المركبة بنجاح",
  });

export const changeVehicleStatus = (id: string, action: string, payload: T.VehicleStatusCommandRequest) =>
  authFetch<T.VehicleDetailResponse>(`/api/vehicles/${id}/${action}`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم تغيير حالة المركبة بنجاح",
  });

export const getVehicleStatusHistory = (id: string) =>
  authFetch<T.VehicleStatusPeriodResponse[]>(`/api/vehicles/${id}/status-history`);

export const recordOdometer = (id: string, payload: T.OdometerReadingRequest) =>
  authFetch<T.VehicleOdometerReadingResponse>(`/api/vehicles/${id}/odometer`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم تسجيل قراءة العداد بنجاح",
  });

export const getOdometerHistory = (id: string) =>
  authFetch<T.VehicleOdometerReadingResponse[]>(`/api/vehicles/${id}/odometer`);

export const getVehicleRiderTimeline = (id: string) =>
  authFetch<T.RiderVehicleTimelineResponse[]>(`/api/vehicles/${id}/rider-timeline`);

export const getVehicleReadiness = (id: string) =>
  authFetch<T.VehicleReadinessResponse>(`/api/vehicles/${id}/readiness`);

export const correctVehicleIdentity = (id: string, payload: T.VehicleIdentityCorrectionRequest) =>
  authFetch<T.VehicleDetailResponse>(`/api/vehicles/${id}/identity-corrections`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم تصحيح هوية المركبة بنجاح",
  });

export const getVehicleIdentityCorrections = (id: string) =>
  authFetch<T.VehicleIdentityCorrectionResponse[]>(`/api/vehicles/${id}/identity-corrections`);

export const transitionVehicleRegistration = (id: string, formData: FormData) =>
  authFetch<T.VehicleRegistrationTransitionResponse>(`/api/vehicles/${id}/registration-transitions/private-to-public`, {
    method: "POST",
    body: formData,
    notifySuccess: "تم تحويل نوع تسجيل المركبة بنجاح",
  });

export const getVehicleRegistrationTransitions = (id: string) =>
  authFetch<T.VehicleRegistrationTransitionResponse[]>(`/api/vehicles/${id}/registration-transitions`);

// ---------------------------
// Files
// ---------------------------
export const getVehicleFiles = (vehicleId: string) =>
  authFetch<T.VehicleAttachmentResponse[]>(`/api/vehicles/${vehicleId}/files`);

export const uploadVehicleFile = (vehicleId: string, kind: T.VehicleFileKind | string, formData: FormData) =>
  authFetch<T.VehicleAttachmentResponse>(`/api/vehicles/${vehicleId}/files/${kind}`, {
    method: "PUT",
    body: formData,
    notifySuccess: "تم رفع الملف بنجاح",
  });

export const getVehicleFileVersions = (vehicleId: string, attachmentId: string) =>
  authFetch<T.VehicleAttachmentVersionResponse[]>(`/api/vehicles/${vehicleId}/files/${attachmentId}/versions`);

export const downloadVehicleFile = (vehicleId: string, attachmentId: string, versionId?: string) => {
  const query = versionId ? `?versionId=${versionId}` : "";
  return authDownload(`/api/vehicles/${vehicleId}/files/${attachmentId}/download${query}`);
};

// ---------------------------
// Assignments
// ---------------------------
export const takeVehicle = (formData: FormData) =>
  authFetch<T.RiderVehicleAssignmentResponse>(
    "/api/vehicle-assignments/take",
    withIdempotency({
      method: "POST",
      body: formData,
      notifySuccess: "تم تسليم المركبة بنجاح",
    })
  );

export const returnVehicle = (payload: T.ReturnVehicleRequest) =>
  authFetch<T.RiderVehicleAssignmentResponse>(
    "/api/vehicle-assignments/return",
    withIdempotency({
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess: "تم إرجاع المركبة بنجاح",
    })
  );

export const switchVehicle = (formData: FormData) =>
  authFetch<T.RiderVehicleAssignmentResponse>(
    "/api/vehicle-assignments/switch",
    withIdempotency({
      method: "POST",
      body: formData,
      notifySuccess: "تم تبديل المركبة بنجاح",
    })
  );

export const getVehicleAssignment = (assignmentId: string) =>
  authFetch<T.RiderVehicleAssignmentResponse>(`/api/vehicle-assignments/${assignmentId}`);

export const renewVehiclePermission = (assignmentId: string, payload: T.RenewPermissionRequest) =>
  authFetch<T.RiderVehicleAssignmentResponse>(
    `/api/vehicle-assignments/${assignmentId}/renew-permission`,
    withIdempotency({
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess: "تم تجديد التفويض بنجاح",
    })
  );

// ---------------------------
// Timeline & Promissory Files
// ---------------------------
export const getRiderVehicleTimeline = (riderProfileId: string) =>
  authFetch<T.RiderVehicleTimelineResponse[]>(`/api/riders/${riderProfileId}/vehicle-timeline`);

export const getRiderPromissoryFiles = (riderProfileId: string) =>
  authFetch<T.RiderPromissoryFileResponse[]>(`/api/riders/${riderProfileId}/promissory-files`);

export const downloadPromissoryFile = (riderProfileId: string, fileId: string, versionId?: string) => {
  const query = versionId ? `?versionId=${versionId}` : "";
  return authDownload(`/api/riders/${riderProfileId}/promissory-files/${fileId}/download${query}`);
};

// ---------------------------
// Compliance
// ---------------------------
export const getVehicleCompliance = (vehicleId: string, type: string) =>
  authFetch<T.VehicleComplianceResponse[]>(`/api/vehicles/${vehicleId}/${type}`);

export const addVehicleRegistration = (vehicleId: string, payload: T.VehicleRegistrationRequest) =>
  authFetch<T.VehicleComplianceResponse>(`/api/vehicles/${vehicleId}/registrations`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تمت إضافة الاستمارة بنجاح",
  });

export const addVehicleInsurance = (vehicleId: string, payload: T.VehicleInsuranceRequest) =>
  authFetch<T.VehicleComplianceResponse>(`/api/vehicles/${vehicleId}/insurance-policies`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تمت إضافة بوليصة التأمين بنجاح",
  });

export const addVehicleInspection = (vehicleId: string, payload: T.VehicleInspectionRequest) =>
  authFetch<T.VehicleComplianceResponse>(`/api/vehicles/${vehicleId}/inspections`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تمت إضافة الفحص الدوري بنجاح",
  });

export const getVehicleComplianceDue = (checkDate?: string) => {
  const query = checkDate ? `?checkDate=${checkDate}` : "";
  return authFetch<T.VehicleComplianceDueResponse[]>(`/api/vehicle-compliance/due${query}`);
};

// ---------------------------
// Issues
// ---------------------------
export const getVehicleIssues = (params: { vehicleId?: string; status?: string; page?: number; pageSize?: number }) => {
  const query = new URLSearchParams();
  if (params.vehicleId) query.set("vehicleId", params.vehicleId);
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  const qs = query.toString();
  return authFetch<T.PagedResponse<T.VehicleIssueSummaryResponse>>(`/api/vehicle-issues${qs ? `?${qs}` : ""}`);
};

export const createVehicleIssue = (payload: T.CreateVehicleIssueRequest) =>
  authFetch<T.VehicleIssueSummaryResponse>(
    "/api/vehicle-issues",
    withIdempotency({
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess: "تم تسجيل العطل/المشكلة بنجاح",
    })
  );

export const transitionVehicleIssue = (id: string, operation: "review" | "close" | "reject", payload: T.IssueTransitionRequest) =>
  authFetch<T.VehicleIssueSummaryResponse>(`/api/vehicle-issues/${id}/${operation}`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم تغيير حالة العطل بنجاح",
  });

export const resolveVehicleIssue = (id: string, payload: T.IssueResolveRequest) =>
  authFetch<T.VehicleIssueSummaryResponse>(`/api/vehicle-issues/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم حل المشكلة بنجاح",
  });

// ---------------------------
// Accidents
// ---------------------------
export const getVehicleAccidents = (params: { vehicleId?: string; riderProfileId?: string; page?: number; pageSize?: number }) => {
  const query = new URLSearchParams();
  if (params.vehicleId) query.set("vehicleId", params.vehicleId);
  if (params.riderProfileId) query.set("riderProfileId", params.riderProfileId);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));

  const qs = query.toString();
  return authFetch<T.PagedResponse<T.VehicleAccidentSummaryResponse>>(`/api/vehicle-accidents${qs ? `?${qs}` : ""}`);
};

export const getVehicleAccident = (id: string) =>
  authFetch<T.VehicleAccidentDetailResponse>(`/api/vehicle-accidents/${id}`);

export const createVehicleAccident = (payload: T.CreateVehicleAccidentRequest) =>
  authFetch<T.VehicleAccidentDetailResponse>(
    "/api/vehicle-accidents",
    withIdempotency({
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess: "تم تسجيل الحادث بنجاح",
    })
  );

export const uploadAccidentEvidence = (id: string, formData: FormData) =>
  authFetch<T.VehicleAccidentAttachmentResponse>(`/api/vehicle-accidents/${id}/evidence`, {
    method: "POST",
    body: formData,
    notifySuccess: "تم رفع الملف بنجاح",
  });

export const downloadAccidentEvidence = (id: string, attachmentId: string) =>
  authDownload(`/api/vehicle-accidents/${id}/evidence/${attachmentId}/download`);

export const finalizeAccidentReport = (id: string, payload: T.AccidentActionRequest) =>
  authFetch<T.VehicleAccidentReportVersionResponse>(`/api/vehicle-accidents/${id}/finalize`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إقفال تقرير الحادث بنجاح",
  });

export const correctAccidentReport = (id: string, payload: T.CorrectVehicleAccidentRequest) =>
  authFetch<T.VehicleAccidentReportVersionResponse>(`/api/vehicle-accidents/${id}/correct`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم تصحيح تقرير الحادث بنجاح",
  });

export const closeAccident = (id: string, payload: T.AccidentActionRequest) =>
  authFetch<T.VehicleAccidentDetailResponse>(`/api/vehicle-accidents/${id}/close`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إنهاء معاملة الحادث بنجاح",
  });

export const downloadAccidentPdf = (id: string, reportVersionId?: string) => {
  const query = reportVersionId ? `?reportVersionId=${reportVersionId}` : "";
  return authDownload(`/api/vehicle-accidents/${id}/pdf${query}`);
};
