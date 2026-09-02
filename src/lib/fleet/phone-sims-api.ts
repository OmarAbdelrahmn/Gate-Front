import { authFetch, authDownload, authPreviewBlob } from "../auth/api";

export type PhoneSimStatus =
  | "Available"
  | "Assigned"
  | "Suspended"
  | "Lost"
  | "Deactivated";

export const KNOWN_CARRIERS = [
  { value: "STC", label: "STC (إس تي سي)" },
  { value: "Mobily", label: "Mobily (موبايلي)" },
  { value: "Zain", label: "Zain (زين)" },
  { value: "Salam", label: "Salam (سلام)" },
  { value: "Virgin Mobile", label: "Virgin Mobile (فيرجن)" },
  { value: "Lebara", label: "Lebara (ليبارا)" },
  { value: "Red Bull Mobile", label: "Red Bull Mobile (ريد بول)" },
];

export type PhoneSimCurrentRider = {
  assignmentId: string;
  riderProfileId: string;
  employeeId: string;
  fullNameAr: string;
  fullNameEn: string | null;
  effectiveFrom: string; // YYYY-MM-DD
  rowVersion: string;
};

export type ReceiptFormMetaData = {
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  sha256Checksum: string;
};

export type PhoneSim = {
  id: string;
  phoneNumber: string; // canonical E.164, e.g. +966555123456
  iccid: string | null;
  carrierName: string | null;
  status: PhoneSimStatus;
  statusReason: string | null;
  responsibleEmployeeId: string;
  responsibleEmployeeNameAr: string;
  responsibleEmployeeNameEn: string | null;
  currentRider: PhoneSimCurrentRider | null;
  receiptForm?: ReceiptFormMetaData | null;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
};

export type PhoneSimPage = {
  items: PhoneSim[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type PhoneSimAssignment = {
  id: string;
  phoneSimCardId: string;
  phoneNumber: string;
  riderProfileId: string;
  employeeId: string;
  riderNameAr: string;
  riderNameEn: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  assignmentReason: string | null;
  endReason: string | null;
  notes: string | null;
  assignedByUserId: string;
  closedByUserId: string | null;
  rowVersion: string;
};

export type PhoneSimResponsibilityChange = {
  id: string;
  phoneSimCardId: string;
  previousResponsibleEmployeeId: string | null;
  previousResponsibleEmployeeNameAr: string | null;
  previousResponsibleEmployeeNameEn: string | null;
  responsibleEmployeeId: string;
  responsibleEmployeeNameAr: string;
  responsibleEmployeeNameEn: string | null;
  changedAtUtc: string;
  changedByUserId: string;
  reason: string;
};

export type CreatePhoneSimRequest = {
  phoneNumber: string;
  responsibleEmployeeId: string;
  iccid?: string | null;
  carrierName?: string | null;
  notes?: string | null;
  receiptForm: File;
};

export type UpdatePhoneSimRequest = {
  phoneNumber: string;
  iccid: string | null;
  carrierName: string | null;
  notes: string | null;
  rowVersion: string;
};

export type TransferResponsibilityRequest = {
  responsibleEmployeeId: string;
  reason: string;
  rowVersion: string;
};

export type AssignSimRiderRequest = {
  riderProfileId: string;
  effectiveFrom: string;
  reason: string;
  notes: string | null;
  rowVersion: string;
};

export type CloseSimAssignmentRequest = {
  effectiveTo: string;
  reason: string;
  rowVersion: string;
};

export type ChangeSimStatusRequest = {
  status: "Available" | "Suspended" | "Lost" | "Deactivated";
  reason: string;
  rowVersion: string;
};

export type ArchiveSimRequest = {
  reason: string;
  rowVersion: string;
};

export type PhoneSimQueryFilters = {
  search?: string;
  status?: PhoneSimStatus;
  responsibleEmployeeId?: string;
  riderProfileId?: string;
  page?: number;
  pageSize?: number;
};

// 1. GET /api/phone-sims
export async function getPhoneSims(
  filters?: PhoneSimQueryFilters
): Promise<PhoneSimPage> {
  const query = new URLSearchParams();
  if (filters?.search?.trim()) query.set("search", filters.search.trim());
  if (filters?.status) query.set("status", filters.status);
  if (filters?.responsibleEmployeeId) query.set("responsibleEmployeeId", filters.responsibleEmployeeId);
  if (filters?.riderProfileId) query.set("riderProfileId", filters.riderProfileId);
  if (filters?.page) query.set("page", String(filters.page));
  if (filters?.pageSize) query.set("pageSize", String(filters.pageSize));

  const queryString = query.toString();
  const path = `/api/phone-sims${queryString ? `?${queryString}` : ""}`;
  return authFetch<PhoneSimPage>(path);
}

// 2. GET /api/phone-sims/{id}
export function getPhoneSim(id: string): Promise<PhoneSim> {
  return authFetch<PhoneSim>(`/api/phone-sims/${encodeURIComponent(id)}`);
}

// 3. POST /api/phone-sims
export function createPhoneSim(
  payload: CreatePhoneSimRequest | FormData
): Promise<PhoneSim> {
  let body: FormData;
  if (payload instanceof FormData) {
    body = payload;
  } else {
    body = new FormData();
    body.append("phoneNumber", payload.phoneNumber);
    body.append("responsibleEmployeeId", payload.responsibleEmployeeId);
    if (payload.iccid) body.append("iccid", payload.iccid);
    if (payload.carrierName) body.append("carrierName", payload.carrierName);
    if (payload.notes) body.append("notes", payload.notes);
    if (payload.receiptForm) body.append("receiptForm", payload.receiptForm);
  }

  return authFetch<PhoneSim>("/api/phone-sims", {
    method: "POST",
    body,
    notifySuccess: "تم إنشاء شريحة الاتصال بنجاح",
  });
}

// 4. PUT /api/phone-sims/{id}
export function updatePhoneSim(
  id: string,
  payload: UpdatePhoneSimRequest
): Promise<PhoneSim> {
  return authFetch<PhoneSim>(`/api/phone-sims/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    notifySuccess: "تم تحديث بيانات شريحة الاتصال بنجاح",
  });
}

// 5. PATCH /api/phone-sims/{id}/responsible-employee
export function transferPhoneSimResponsibility(
  id: string,
  payload: TransferResponsibilityRequest
): Promise<PhoneSim> {
  return authFetch<PhoneSim>(
    `/api/phone-sims/${encodeURIComponent(id)}/responsible-employee`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      notifySuccess: "تم نقل مسؤولية العهدة بنجاح",
    }
  );
}

// 6. GET /api/phone-sims/{id}/responsibility-history
export function getPhoneSimResponsibilityHistory(
  id: string
): Promise<PhoneSimResponsibilityChange[]> {
  return authFetch<PhoneSimResponsibilityChange[]>(
    `/api/phone-sims/${encodeURIComponent(id)}/responsibility-history`
  );
}

// 7. POST /api/phone-sims/{id}/assignments
export function assignPhoneSimToRider(
  id: string,
  payload: AssignSimRiderRequest
): Promise<PhoneSimAssignment> {
  return authFetch<PhoneSimAssignment>(
    `/api/phone-sims/${encodeURIComponent(id)}/assignments`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess: "تم تسليم الشريحة للمندوب بنجاح",
    }
  );
}

// 8. POST /api/phone-sims/{id}/assignments/{assignmentId}/close
export function closePhoneSimAssignment(
  id: string,
  assignmentId: string,
  payload: CloseSimAssignmentRequest
): Promise<PhoneSimAssignment | void> {
  return authFetch<PhoneSimAssignment | void>(
    `/api/phone-sims/${encodeURIComponent(id)}/assignments/${encodeURIComponent(assignmentId)}/close`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess: "تم استلام الشريحة وإغلاق التعيين بنجاح",
    }
  );
}

// 9. GET /api/phone-sims/{id}/assignments
export function getPhoneSimAssignmentsHistory(
  id: string
): Promise<PhoneSimAssignment[]> {
  return authFetch<PhoneSimAssignment[]>(
    `/api/phone-sims/${encodeURIComponent(id)}/assignments`
  );
}

// 10. PATCH /api/phone-sims/{id}/status
export function changePhoneSimStatus(
  id: string,
  payload: ChangeSimStatusRequest
): Promise<PhoneSim> {
  return authFetch<PhoneSim>(
    `/api/phone-sims/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      notifySuccess: "تم تغيير حالة الشريحة بنجاح",
    }
  );
}

// 11. PATCH /api/phone-sims/{id}/archive
export function archivePhoneSim(
  id: string,
  payload: ArchiveSimRequest
): Promise<void> {
  return authFetch<void>(
    `/api/phone-sims/${encodeURIComponent(id)}/archive`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      notifySuccess: "تمت أرشفة الشريحة بنجاح",
    }
  );
}

// 12. GET /api/phone-sims/{id}/receipt-form (Download)
export function downloadPhoneSimReceiptForm(id: string) {
  return authDownload(`/api/phone-sims/${encodeURIComponent(id)}/receipt-form`);
}

// 13. GET /api/phone-sims/{id}/receipt-form (Preview)
export function previewPhoneSimReceiptForm(id: string) {
  return authPreviewBlob(`/api/phone-sims/${encodeURIComponent(id)}/receipt-form`);
}
