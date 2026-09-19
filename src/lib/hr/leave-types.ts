export type LeaveTypeStatus = "Active" | "Disabled" | "Archived";

export interface LeaveTypeResponse {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  requiresBalance: boolean;
  requiresHrDocuments: boolean;
  requiresExitReentryVisa: boolean;
  maximumCalendarDays: number | null;
  status: LeaveTypeStatus;
  rowVersion: string;
}

export interface LeaveTypeUpsertRequest {
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  requiresBalance: boolean;
  requiresHrDocuments: boolean;
  requiresExitReentryVisa: boolean;
  maximumCalendarDays?: number | null;
  status: LeaveTypeStatus;
  rowVersion?: string | null;
}

export interface LeaveWorkflowStep {
  id: string;
  stepKey: string;
  sequence: number;
  nameAr: string;
  nameEn: string;
  requiredPermissionKey: string;
  scopeSource:
    | "CompanyWide"
    | "EmployeeHousing"
    | "ActiveClientPlatform"
    | "ActiveClientContract";
  allowsReturnForChanges: boolean;
  requiresCommentOnApproval: boolean;
  targetResponseHours: number | null;
}

export interface LeaveWorkflow {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  version: number;
  leaveTypeId: string | null;
  relationshipType: "SponsoredInternal" | "OutsideRider" | null;
  appliesToRider: boolean | null;
  clientPlatformId: string | null;
  priority: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: "Active" | "Disabled" | "Archived";
  steps: LeaveWorkflowStep[];
  rowVersion: string;
}

export type LeaveWorkflowStatus =
  | "Draft"
  | "PendingApproval"
  | "ReturnedForChanges"
  | "Approved"
  | "Active"
  | "Completed"
  | "Rejected"
  | "CancellationPending"
  | "Cancelled"
  | "Expired";

export type LeaveHrStatus =
  | "NotRequired"
  | "PendingDocuments"
  | "InProgress"
  | "Ready"
  | "Completed";

export type DateChangeOrCancellationStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Cancelled";

export interface LeaveRequestResponse {
  id: string;
  requestNumber: string;
  employeeId: string;
  employeeNameAr: string;
  leaveTypeId: string;
  leaveTypeNameAr: string;
  leaveTypeNameEn?: string | null;
  startDate: string;
  endDate: string;
  expectedReturnDate: string;
  calendarDays: number;
  reason: string;
  status: LeaveWorkflowStatus;
  hrStatus: LeaveHrStatus;
  approvalWorkflowId: string | null;
  currentApprovalStepKey: string | null;
  currentApprovalStepSequence: number | null;
  submittedAtUtc: string | null;
  approvedAtUtc: string | null;
  activatedAtUtc: string | null;
  completedAtUtc: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  relatedClientContractId: string | null;
  notes: string | null;
  rowVersion: string;
  destinationCountryCode?: string | null;
  contactPhoneDuringLeave?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}

export interface LeaveRequestUpsertRequest {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  expectedReturnDate: string;
  reason: string;
  destinationCountryCode?: string | null;
  contactPhoneDuringLeave?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  relatedClientContractId?: string | null;
  notes?: string | null;
  rowVersion?: string | null;
}

export interface LeaveTransitionRequest {
  action: string;
  comment: string;
  rowVersion?: string | null;
}

export interface LeaveApprovalDecisionRequest {
  action: "approve" | "reject" | "return";
  comment: string;
  rowVersion?: string | null;
}

export interface LeaveDateChangeRequest {
  id: string;
  leaveRequestId: string;
  requestedStartDate: string;
  requestedEndDate: string;
  reason: string;
  status: DateChangeOrCancellationStatus;
  resolutionReason?: string | null;
  createdAtUtc?: string | null;
  resolvedAtUtc?: string | null;
  rowVersion: string;
}

export interface LeaveDateChangeCreateRequest {
  requestedStartDate: string;
  requestedEndDate: string;
  reason: string;
}

export interface LeaveDateChangeResolveRequest {
  approve: boolean;
  resolutionReason: string;
  rowVersion: string;
}

export interface LeaveCancellationRequest {
  id: string;
  leaveRequestId: string;
  reason: string;
  status: DateChangeOrCancellationStatus;
  resolutionReason?: string | null;
  createdAtUtc?: string | null;
  resolvedAtUtc?: string | null;
  rowVersion: string;
}

export interface LeaveCancellationCreateRequest {
  reason: string;
}

export interface LeaveCancellationResolveRequest {
  approve: boolean;
  resolutionReason: string;
  rowVersion: string;
}

export type LeaveDocumentKind =
  | "Ticket"
  | "ExitReentryVisa"
  | "ApprovalLetter"
  | "Other";

export interface LeaveDocumentResponse {
  id: string;
  leaveRequestId: string;
  kind: LeaveDocumentKind;
  referenceNumber: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  notes: string | null;
  currentVersionId: string | null;
  currentVersionNumber: number | null;
  currentFileName: string | null;
  currentContentType: string | null;
  currentFileSizeBytes: number | null;
  rowVersion: string;
}

export interface LeaveDocumentVersionResponse {
  id: string;
  documentId: string;
  versionNumber: number;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedAtUtc: string;
  uploadedBy?: string | null;
}

export interface LeaveDocumentMetadataUpdateRequest {
  metadata: {
    kind: LeaveDocumentKind;
    referenceNumber?: string | null;
    issuedOn?: string | null;
    expiresOn?: string | null;
    notes?: string | null;
  };
  rowVersion: string;
}
