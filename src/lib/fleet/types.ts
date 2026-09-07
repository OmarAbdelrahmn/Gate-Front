export enum VehicleCatalogStatus {
  Active = 1,
  Disabled = 2,
  Archived = 3,
}

export enum VehicleType {
  Motorcycle = 1,
  Car = 2,
  Van = 3,
  Truck = 4,
  Other = 5,
}

export enum VehicleFuelType {
  Petrol = 1,
  Diesel = 2,
  Electric = 3,
  Hybrid = 4,
  Other = 5,
}

export enum VehicleTransmissionType {
  Manual = 1,
  Automatic = 2,
  Other = 3,
}

export enum VehicleOwnershipType {
  Owned = 1,
  Leased = 2,
  ThirdParty = 3,
}

export enum VehicleRegistrationType {
  Private = 1,
  PrivateTransport = 2,
  SmallBus = 3,
  Taxi = 4,
  PublicTransport = 5,
  PublicBus = 6,
  Motorcycle = 7,
  PublicWorks = 8,
}

export enum VehicleOperationalStatus {
  Available = 1,
  Assigned = 2,
  ProblemHold = 3,
  AccidentHold = 4,
  Stolen = 5,
  OutOfService = 6,
  Decommissioned = 7,
}

export enum VehicleCondition {
  Unknown = 1,
  Good = 2,
  Fair = 3,
  Damaged = 4,
  Unsafe = 5,
}

export enum VehicleInspectionResult {
  Passed = 1,
  Conditional = 2,
  Failed = 3,
}

export enum VehicleComplianceDueStatus {
  Valid = 1,
  Upcoming = 2,
  DueToday = 3,
  Expired = 4,
  Missing = 5,
}

export enum VehicleFileKind {
  Istimara = 1,
  OperationCard = 2,
  FrontImage = 3,
  RearImage = 4,
  LeftImage = 5,
  RightImage = 6,
  Legacy = 99,
}

export enum RiderVehicleAssignmentStatus {
  Active = 1,
  Completed = 2,
  Cancelled = 3,
  Corrected = 4,
}

export enum VehicleIssueCategory {
  Problem = 1,
  Accident = 2,
  Theft = 3,
  Damage = 4,
  Administrative = 5,
}

export enum VehicleIssueSeverity {
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4,
}

export enum VehicleIssueStatus {
  Open = 1,
  UnderReview = 2,
  Resolved = 3,
  Closed = 4,
  Rejected = 5,
}

export enum VehicleAccidentStatus {
  Reported = 1,
  Finalized = 2,
  Closed = 3,
}

export enum VehicleAccidentSeverity {
  Minor = 1,
  Moderate = 2,
  Serious = 3,
  Critical = 4,
}

export enum VehicleAccidentEvidenceType {
  Image = 1,
  UploadedReport = 2,
  Other = 3,
  NajmReport = 4,
  DamagePhoto = 5,
  DamagePromissoryNote = 6,
  ClaimOpeningFeeReceipt = 7,
  ClaimSubmissionReport = 8,
  AssessmentReceipt = 9,
  InsuranceDecision = 10,
  PaymentReceipt = 11,
  TransferReceipt = 12,
  RepairDirection = 13,
  RepairCompletion = 14,
  ReinspectionReport = 15,
  TotalLossConfirmation = 16,
  VehicleCollectionReceipt = 17,
  ValuationReceipt = 18,
  TowingReceipt = 19,
  InstallmentReceipt = 20,
  InstallmentRefundRequest = 21,
  InstallmentRefundReceipt = 22,
}

export enum VehicleAccidentWorkflowStage {
  AwaitingNajm = 1,
  Assessed = 2,
  LocalRepair = 3,
  ClaimDraft = 4,
  AwaitingAssessment = 5,
  CompensationOffered = 6,
  AwaitingInsurance = 7,
  InsuranceRejected = 8,
  InsuranceApproved = 9,
  AwaitingSupplierTransfer = 10,
  RepairDirected = 11,
  Repairing = 12,
  TotalLossProposed = 13,
  AwaitingReinspection = 14,
  TotalLossConfirmed = 15,
  AwaitingValuation = 16,
  TotalLossValued = 17,
  Completed = 18,
}

export enum VehicleAccidentWorkflowAction {
  AssessFault = 1,
  StartLocalRepair = 2,
  CompleteLocalRepair = 3,
  OpenClaim = 4,
  SubmitClaim = 5,
  ReceiveCompensationOffer = 6,
  SubmitToInsurance = 7,
  ApproveInsurance = 8,
  RejectInsurance = 9,
  SubmitToSupplier = 10,
  ConfirmTransfer = 11,
  ReceiveRepairDirection = 12,
  StartRepair = 13,
  RepairProgress = 14,
  CompleteRepair = 15,
  ProposeTotalLoss = 16,
  RequestReinspection = 17,
  ConfirmTotalLoss = 18,
  RecordVehicleCollection = 19,
  RecordValuation = 20,
  FollowUp = 21,
  SubmitInstallmentRefund = 22,
  ReceiveInstallmentRefund = 23,
  RejectInstallmentRefund = 24,
  MarkNoInstallments = 25,
}

export enum VehicleAccidentClaimType {
  Repair = 1,
  Compensation = 2,
}

export enum VehicleAccidentClaimResponseType {
  Repair = 1,
  Compensation = 2,
  TotalLoss = 3,
}

export enum VehicleAccidentRefundStatus {
  NotSubmitted = 1,
  Submitted = 2,
  Received = 3,
  Rejected = 4,
  NotApplicable = 5,
}


// ---------------------------
// Common Types
// ---------------------------
export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface RowVersionRequest {
  rowVersion: string;
}

// ---------------------------
// Catalogs
// ---------------------------
export interface VehicleManufacturerResponse {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  status: VehicleCatalogStatus;
  displayOrder: number;
  rowVersion: string;
}

export interface VehicleManufacturerRequest {
  code: string;
  nameAr: string;
  nameEn: string;
  status: VehicleCatalogStatus;
  displayOrder: number;
  rowVersion?: string | null;
}

export interface VehicleModelResponse {
  id: string;
  vehicleManufacturerId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  vehicleType: VehicleType;
  defaultFuelType: VehicleFuelType;
  status: VehicleCatalogStatus;
  rowVersion: string;
}

export interface VehicleModelRequest {
  vehicleManufacturerId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  vehicleType: VehicleType;
  defaultFuelType: VehicleFuelType;
  status: VehicleCatalogStatus;
  rowVersion?: string | null;
}

// ---------------------------
// Suppliers
// ---------------------------
export interface Address {
  buildingNumber?: string | null;
  street?: string | null;
  district?: string | null;
  city?: string | null;
  postalCode?: string | null;
  additionalNumber?: string | null;
}

export interface VehicleSupplierResponse {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  commercialRegistrationNumber?: string | null;
  taxNumber?: string | null;
  phone?: string | null;
  address?: Address | null;
  status: VehicleCatalogStatus;
  notes?: string | null;
  rowVersion: string;
}

export interface VehicleSupplierRequest {
  code: string;
  nameAr: string;
  nameEn: string;
  commercialRegistrationNumber?: string | null;
  taxNumber?: string | null;
  phone?: string | null;
  address?: Address | null;
  status: VehicleCatalogStatus;
  notes?: string | null;
  rowVersion?: string | null;
}

export interface ArchiveSupplierRequest {
  reason: string;
  rowVersion: string;
}

// ---------------------------
// Vehicles
// ---------------------------
export interface ActualRiderDetail {
  selectedRiderProfileId?: string | null;
  selectedRiderEmployeeId?: string | null;
  selectedRiderNameAr?: string | null;
  isSelectedRiderTheActualRider?: boolean | null;
  actualRiderName?: string | null;
  actualRiderIqamaNo?: string | null;
  relationshipToSelectedRider?: string | null;
}

export interface VehicleSummaryResponse {
  id: string;
  serialNumber?: string | null;
  assetNumber?: string | null;
  chassisNumber?: string | null;
  plateNumberAr?: string | null;
  plateNumberEn?: string | null;
  plateLettersAr?: string | null;
  plateLettersEn?: string | null;
  plateDigits?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  vehicleType: VehicleType;
  registrationType: VehicleRegistrationType;
  status: VehicleOperationalStatus;
  sponsorId?: string | null;
  sponsorName?: string | null;
  operatingCityId?: string | null;
  operatingCity?: string | null;
  currentOdometer: number;
  currentAssignmentId?: string | null;
  currentRiderProfileId?: string | null;
  currentRiderName?: string | null;
  isRealRider?: boolean;
  realRider?: RealRiderInfo | null;
  actualRider?: ActualRiderDetail | null;
  registrationExpiryDate?: string | null;
  registrationStatus?: VehicleComplianceDueStatus | null;
  insuranceExpiryDate?: string | null;
  insuranceStatus?: VehicleComplianceDueStatus | null;
  inspectionExpiryDate?: string | null;
  inspectionStatus?: VehicleComplianceDueStatus | null;
  operationCardExpiryDate?: string | null;
  operationCardStatus?: VehicleComplianceDueStatus | null;
  permitEndDate?: string | null;
  permitStatus?: VehicleComplianceDueStatus | null;
  isReadyForAssignment: boolean;
  rowVersion: string;
}

export interface VehicleDetailResponse {
  summary: VehicleSummaryResponse;
  serialNumber?: string | null;
  plateLettersAr?: string | null;
  plateLettersEn?: string | null;
  plateDigits?: string | null;
  vin?: string | null;
  chassisNumber?: string | null;
  engineNumber?: string | null;
  purchasedFromSupplierId?: string | null;
  supplierName?: string | null;
  registrationType: VehicleRegistrationType;
  vehicleManufacturerId: string;
  vehicleModelId: string;
  modelYear?: number | null;
  fuelType: VehicleFuelType;
  transmissionType: VehicleTransmissionType;
  colorAr?: string | null;
  colorEn?: string | null;
  ownershipType: VehicleOwnershipType;
  ownerName?: string | null;
  acquisitionDate?: string | null;
  leaseReference?: string | null;
  notes?: string | null;
  decommissionedAtUtc?: string | null;
  decommissionReason?: string | null;
}

export interface VehicleLookupResponse {
  id: string;
  assetNumber: string;
  plateNumberAr?: string | null;
  plateNumberEn?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  status: VehicleOperationalStatus;
}

export interface VehicleUpsertRequest {
  assetNumber?: string | null;
  serialNumber?: string | null;
  plateNumberAr?: string | null;
  plateNumberEn?: string | null;
  plateLettersAr?: string | null;
  plateLettersEn?: string | null;
  plateDigits?: string | null;
  vin?: string | null;
  chassisNumber?: string | null;
  engineNumber?: string | null;
  sponsorId?: string | null;
  operatingCityId?: string | null;
  purchasedFromSupplierId?: string | null;
  registrationType: VehicleRegistrationType;
  vehicleManufacturerId: string;
  vehicleModelId: string;
  modelYear?: number | null;
  vehicleType: VehicleType;
  fuelType: VehicleFuelType;
  transmissionType: VehicleTransmissionType;
  colorAr?: string | null;
  colorEn?: string | null;
  ownershipType: VehicleOwnershipType;
  ownerName?: string | null;
  acquisitionDate?: string | null;
  leaseReference?: string | null;
  currentOdometer: number;
  notes?: string | null;
  rowVersion?: string | null;
}

export interface ArchiveVehicleRequest {
  reason: string;
  rowVersion: string;
}

export interface VehicleStatusCommandRequest {
  effectiveAtUtc: string;
  reason: string;
  rowVersion: string;
}

export interface VehicleStatusPeriodResponse {
  id: string;
  vehicleId: string;
  status: VehicleOperationalStatus;
  effectiveFromUtc: string;
  effectiveToUtc?: string | null;
  sourceType?: string | null;
  sourceEntityId?: string | null;
  reason?: string | null;
}

export interface OdometerReadingRequest {
  reading: number;
  recordedAtUtc: string;
  notes?: string | null;
  isCorrection: boolean;
  correctionReason?: string | null;
  rowVersion: string;
}

export interface VehicleOdometerReadingResponse {
  id: string;
  vehicleId: string;
  reading: number;
  recordedAtUtc: string;
  sourceType?: string | null;
  isCorrection: boolean;
  correctionReason?: string | null;
  notes?: string | null;
}

export interface VehicleReadinessResponse {
  vehicleId: string;
  isEligibleForAssignment: boolean;
  missingIdentityFields: string[];
  missingPhotoKinds: VehicleFileKind[];
  missingDocuments: string[];
  warnings: string[];
}

export interface VehicleIdentityCorrectionRequest {
  assetNumber: string;
  serialNumber?: string | null;
  plateNumberAr?: string | null;
  plateNumberEn?: string | null;
  plateLettersAr?: string | null;
  plateLettersEn?: string | null;
  plateDigits?: string | null;
  vin?: string | null;
  chassisNumber?: string | null;
  engineNumber?: string | null;
  sponsorId?: string | null;
  operatingCityId?: string | null;
  registrationType: VehicleRegistrationType;
  documentVersionIds?: string[];
  reason: string;
  effectiveAtUtc: string;
  rowVersion: string;
}

export interface VehicleIdentityCorrectionResponse {
  id: string;
  vehicleId: string;
  beforeJson: string;
  afterJson: string;
  documentVersionIds: string[];
  reason: string;
  effectiveAtUtc: string;
  actorId?: string | null;
  createdAtUtc: string;
}

export interface VehicleRegistrationTransitionResponse {
  id: string;
  vehicleId: string;
  oldRegistrationType: VehicleRegistrationType;
  newRegistrationType: VehicleRegistrationType;
  oldPlateNumberAr?: string | null;
  oldPlateNumberEn?: string | null;
  newPlateNumberAr?: string | null;
  newPlateNumberEn?: string | null;
  effectiveAtUtc: string;
  reason: string;
  istimaraVersionId: string;
  operationCardVersionId: string;
  actorId?: string | null;
  createdAtUtc: string;
}

// ---------------------------
// Files
// ---------------------------
export interface VehicleAttachmentResponse {
  id: string;
  vehicleId: string;
  kind: VehicleFileKind;
  displayName?: string | null;
  currentVersionId?: string | null;
  currentVersionNumber?: number | null;
  originalFileName?: string | null;
  contentType?: string | null;
  fileSizeBytes?: number | null;
  currentFileName?: string | null;
  currentUploadAtUtc?: string | null;
  isLegacy?: boolean;
  rowVersion?: string;
}

export interface VehicleAttachmentVersionResponse {
  id: string;
  attachmentId: string;
  versionNumber: number;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  checksum: string;
  uploadedAtUtc: string;
  uploadedByUserId?: string | null;
}

// ---------------------------
// Assignments
// ---------------------------
export interface RealRiderInfo {
  id?: string | null;
  name: string;
  iqamaNo: string;
  relationshipToAssignedRider: string;
}

export interface RiderVehicleAssignmentResponse {
  id: string;
  riderProfileId: string;
  employeeId?: string | null;
  riderName?: string | null;
  isRealRider?: boolean;
  realRider?: RealRiderInfo | null;
  actualRider?: ActualRiderDetail | null;
  vehicleId: string;
  assetNumber: string;
  startedAtUtc: string;
  endedAtUtc?: string | null;
  startLocationSnapshot?: string | null;
  endLocationSnapshot?: string | null;
  startOdometer: number;
  endOdometer?: number | null;
  permissionReference?: string | null;
  permissionStartsOn?: string | null;
  permissionEndsOn?: string | null;
  permitEndDate?: string | null;
  permitStatus?: VehicleComplianceDueStatus | null;
  status: RiderVehicleAssignmentStatus | number;
  assignmentReason?: string | null;
  startReason?: string | null;
  completionReason?: string | null;
  endReason?: string | null;
  operationId?: string | null;
  promissoryFileVersionIds: string[];
  rowVersion: string;
}

export interface TakeVehicleRequest {
  riderProfileId: string;
  isRealRider: boolean;
  realRider?: {
    name: string;
    iqamaNo: string;
    relationshipToAssignedRider: string;
  } | null;
  vehicleId: string;
  startedAtUtc: string;
  startOdometer: number;
  startCondition: VehicleCondition;
  startFuelLevelPercentage?: number | null;
  permissionReference: string;
  reason: string;
  notes?: string | null;
}

export interface ReturnVehicleRequest {
  assignmentId: string;
  endedAtUtc: string;
  endOdometer: number;
  endCondition: VehicleCondition;
  endFuelLevelPercentage: number;
  reason: string;
  rowVersion: string;
}

export interface VehicleConditionReport {
  category: VehicleIssueCategory;
  severity: VehicleIssueSeverity;
  problemDescription: string;
  isRiderResponsible: boolean;
  estimatedRepairCost: number;
}

export interface ReturnVehicleWithConditionReportRequest extends ReturnVehicleRequest {
  conditionReport: VehicleConditionReport;
}

export interface SwitchVehicleRequest {
  currentAssignmentId: string;
  newVehicleId: string;
  switchedAtUtc: string;
  oldVehicleOdometer: number;
  newVehicleOdometer: number;
  oldVehicleCondition: VehicleCondition;
  newVehicleCondition: VehicleCondition;
  oldFuelLevelPercentage: number;
  newFuelLevelPercentage: number;
  permissionReference?: string | null;
  reason: string;
  rowVersion: string;
  conditionReport?: VehicleConditionReport | null;
}

export interface RenewPermissionRequest {
  permissionStartsOn?: string | null;
  permissionReference?: string | null;
  reason: string;
  rowVersion: string;
}

export interface RiderVehicleTimelineResponse {
  assignment: RiderVehicleAssignmentResponse;
  issues: VehicleIssueSummaryResponse[];
  accidents: VehicleAccidentSummaryResponse[];
}

export interface RiderPromissoryFileResponse {
  id: string;
  riderProfileId: string;
  assignmentId?: string | null;
  currentVersionId?: string | null;
  versionNumber?: number | null;
  originalFileName?: string | null;
  contentType?: string | null;
  fileSizeBytes?: number | null;
  sha256Checksum?: string | null;
  currentFileName?: string | null;
  uploadedAtUtc?: string | null;
  rowVersion?: string | null;
}

// ---------------------------
// Compliance
// ---------------------------
export interface VehicleComplianceResponse {
  id: string;
  vehicleId: string;
  type: string; // 'Registration', 'InsurancePolicy', 'Inspection'
  number?: string | null;
  issuer?: string | null;
  referenceNumber?: string | null;
  providerName?: string | null;
  issueDate?: string | null;
  effectiveFrom?: string | null;
  expiryDate: string;
  dueStatus?: VehicleComplianceDueStatus;
  status?: VehicleComplianceDueStatus;
  isCurrent: boolean;
  previousRecordId?: string | null;
  rowVersion?: string;
  notes?: string | null;
}

export interface VehicleRegistrationRequest {
  registrationNumber: string;
  issuingAuthority?: string | null;
  issueDate: string;
  expiryDate: string;
  notes?: string | null;
}

export interface VehicleInsuranceRequest {
  providerName: string;
  policyNumber: string;
  coverageType?: string | null;
  effectiveFrom: string;
  expiryDate: string;
  claimReference?: string | null;
  claimContact?: string | null;
  notes?: string | null;
}

export interface VehicleInspectionRequest {
  inspectionNumber: string;
  stationName?: string | null;
  inspectionDate: string;
  expiryDate: string;
  result: VehicleInspectionResult;
  odometer: number;
  failureNotes?: string | null;
  notes?: string | null;
}

export interface VehicleOperationCardResponse {
  id: string;
  vehicleId: string;
  cardNumber: string;
  issuingAuthority?: string | null;
  issueDate: string;
  expiryDate: string;
  status?: VehicleComplianceDueStatus;
  isCurrent: boolean;
  notes?: string | null;
  rowVersion?: string;
  createdAtUtc?: string;
}

export interface VehicleOperationCardRequest {
  cardNumber: string;
  issuingAuthority?: string | null;
  issueDate: string;
  expiryDate: string;
  notes?: string | null;
}

export interface VehicleComplianceDueResponse {
  vehicleId: string;
  assetNumber: string;
  plateNumber?: string | null;
  plateNumberAr?: string | null;
  plateNumberEn?: string | null;
  type: string;
  expiryDate: string;
  status: VehicleComplianceDueStatus;
  permitEndDate?: string | null;
  permitStatus?: VehicleComplianceDueStatus | null;
}

// ---------------------------
// Issues
// ---------------------------
export interface VehicleIssueRiderInfo {
  riderProfileId?: string | null;
  employeeId?: string | null;
  riderName?: string | null;
  isRealRider?: boolean;
  realRider?: {
    id?: string | null;
    name?: string | null;
    iqamaNo?: string | null;
    relationshipToAssignedRider?: string | null;
  } | null;
}

export interface VehicleIssueSummaryResponse {
  id: string;
  issueNumber: string;
  vehicleId: string;
  relatedAssignmentId?: string | null;
  rider?: VehicleIssueRiderInfo | null;
  isRiderResponsible?: boolean | null;
  estimatedRepairCost?: number | null;
  category: VehicleIssueCategory;
  severity: VehicleIssueSeverity;
  blocksOperation: boolean;
  status: VehicleIssueStatus;
  reportedAtUtc: string;
  description: string;
  locationDescription?: string | null;
  resolutionSummary?: string | null;
  rowVersion: string;
}

export interface VehicleIssueEvidenceResponse {
  id: string;
  vehicleIssueId: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  sha256Checksum: string;
  uploadedAtUtc: string;
  rowVersion: string;
}

export interface CreateVehicleIssueRequest {
  vehicleId: string;
  category: VehicleIssueCategory;
  severity: VehicleIssueSeverity;
  description: string;
  reportedAtUtc: string;
  locationDescription?: string | null;
  odometerAtReport: number;
  blocksOperation: boolean;
}

export interface IssueTransitionRequest {
  reason: string;
  rowVersion: string;
}

export interface IssueResolveRequest {
  resolutionSummary: string;
  rowVersion: string;
}

// ---------------------------
// Accidents
// ---------------------------
export interface VehicleAccidentSummaryResponse {
  id: string;
  accidentNumber: string;
  vehicleId: string;
  riderProfileId: string;
  riderVehicleAssignmentId?: string | null;
  vehicleIssueId?: string | null;
  occurredAtUtc: string;
  severity: VehicleAccidentSeverity;
  isDrivable: boolean;
  status: VehicleAccidentStatus;
  locationDescription?: string | null;
  rowVersion: string;
}

export interface VehicleAccidentDetailResponse {
  summary: VehicleAccidentSummaryResponse;
  policeReportNumber?: string | null;
  insuranceClaimNumber?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  hasInjuries: boolean;
  injuryDetails?: string | null;
  thirdPartyDetails?: string | null;
  damageDescription?: string | null;
  faultAssessment?: string | null;
  narrative: string;
  attachments: VehicleAccidentAttachmentResponse[];
  reports: VehicleAccidentReportVersionResponse[];
}

export interface CreateVehicleAccidentRequest {
  vehicleId: string;
  riderProfileId: string;
  occurredAtUtc: string;
  locationDescription: string;
  latitude?: number | null;
  longitude?: number | null;
  policeReportNumber: string;
  insuranceClaimNumber?: string | null;
  severity: VehicleAccidentSeverity;
  isDrivable: boolean;
  hasInjuries: boolean;
  injuryDetails?: string | null;
  thirdPartyDetails?: string | null;
  damageDescription: string;
  faultAssessment?: string | null;
  narrative: string;
}

export interface VehicleAccidentAttachmentResponse {
  id: string;
  accidentId: string;
  evidenceType: VehicleAccidentEvidenceType;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  sha256Checksum?: string | null;
  uploadedAtUtc: string;
  description?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  transportedAtUtc?: string | null;
  amount?: number | null;
  downloadUrl?: string | null;
}

export interface OtherPartyFault {
  name: string;
  faultPercentage: number;
  vehiclePlate?: string | null;
  insuranceCompany?: string | null;
}

export interface SourceDocumentInfo {
  versionId?: string | null;
  originalFileName?: string | null;
  contentType?: string | null;
  downloadUrl?: string | null;
}

export interface WorkflowTimelineEntry {
  id?: string;
  /** Action enum value (same as VehicleAccidentWorkflowAction) */
  eventType?: VehicleAccidentWorkflowAction | null;
  /** Kept for backward compatibility */
  action?: VehicleAccidentWorkflowAction | null;
  actionName?: string;
  occurredAtUtc: string;
  actorUserId?: string | null;
  /** Kept for backward compatibility */
  performedByUserId?: string | null;
  performedByUserName?: string | null;
  /** Reason / notes for this timeline entry */
  reason?: string | null;
  /** Kept for backward compatibility */
  notes?: string | null;
  stageBefore?: VehicleAccidentWorkflowStage | null;
  stageAfter?: VehicleAccidentWorkflowStage | null;
  attachmentId?: string | null;
  amount?: number | null;
  reference?: string | null;
  snapshotJson?: string | null;
  /** Kept for backward compatibility */
  dataSnapshotJson?: string | null;
}

export interface VehicleAccidentInstallment {
  id: string;
  accidentId: string;
  periodFrom: string;
  periodTo: string;
  paidOn: string;
  amount: number;
  refundEligibleAmount: number;
  receiptAttachmentId: string;
  notes?: string | null;
  createdAtUtc?: string;
}

export interface VehicleAccidentWorkflowSummary {
  id?: string;
  accidentId: string;
  accidentNumber: string;
  trafficReportNumber?: string | null;
  vehicleId: string;
  vehiclePlate?: string | null;
  vehicleAssetNumber?: string | null;
  riderProfileId: string;
  riderName?: string | null;
  stage: VehicleAccidentWorkflowStage;
  requestedClaimType?: VehicleAccidentClaimType | null;
  outcome?: VehicleAccidentClaimResponseType | null;
  claimNumber?: string | null;
  externalReference?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  occurredAtUtc: string;
  incidentEndedAtUtc?: string | null;
  deadlineAtUtc?: string | null;
  remainingSeconds?: number | null;
  isOverdue: boolean;
  refundStatus: VehicleAccidentRefundStatus;
  rowVersion: string;
}

export interface VehicleAccidentWorkflowDetailResponse {
  accidentId: string;
  stage: VehicleAccidentWorkflowStage;
  incidentStartedAtUtc: string;
  incidentEndedAtUtc?: string | null;
  incidentCalendarDays: number;
  deadlineAtUtc?: string | null;
  remainingSeconds?: number | null;
  isOverdue: boolean;
  rowVersion: string;
  fault?: {
    riderFaultPercentage?: number | null;
    otherParties: OtherPartyFault[];
    najmAttachmentId?: string | null;
    assessedAtUtc?: string | null;
    notes?: string | null;
    damageAssessment?: string | null;
    estimatedRepairCost?: number | null;
    damagePromissoryNoteAttachmentId?: string | null;
    openingFeeAmount?: number | null;
    openingFeeAttachmentId?: string | null;
    openingFeePaidAtUtc?: string | null;
  } | null;
  claim?: {
    /** Requested claim type (Repair=1, Compensation=2) */
    requestedType?: VehicleAccidentClaimType | null;
    /** Actual response type from insurer (Repair=1, Compensation=2, TotalLoss=3) */
    outcome?: VehicleAccidentClaimResponseType | null;
    /** Claim reference/number from insurer */
    number?: string | null;
    supplierId?: string | null;
    supplierName?: string | null;
    submissionAttachmentId?: string | null;
    submittedAtUtc?: string | null;
    notes?: string | null;
  } | null;
  settlement?: {
    /** Compensation offer / assessment amount */
    amount?: number | null;
    assessmentReceiptAttachmentId?: string | null;
    insuranceSubmittedAtUtc?: string | null;
    insuranceDueAtUtc?: string | null;
    insuranceRespondedAtUtc?: string | null;
    insuranceDecision?: "Approved" | "Rejected" | string | null;
    insuranceRejectionReason?: string | null;
    insuranceDecisionAttachmentId?: string | null;
    paymentReceiptAttachmentId?: string | null;
    supplierSubmittedAtUtc?: string | null;
    supplierTransferDueAtUtc?: string | null;
    supplierSubmissionAttachmentId?: string | null;
    transferReceiptAttachmentId?: string | null;
    transferReceivedAtUtc?: string | null;
    transferReceivedAmount?: number | null;
  } | null;
  repair?: {
    repairDirectionAttachmentId?: string | null;
    location?: string | null;
    contact?: string | null;
    startedAtUtc?: string | null;
    repairCompletionAttachmentId?: string | null;
    completedAtUtc?: string | null;
    progressUpdates?: Array<{
      notes: string;
      occurredAtUtc: string;
      attachmentId?: string | null;
    }> | null;
    reinspectionLocation?: string | null;
    reinspectionAppointmentAtUtc?: string | null;
    totalLossConfirmedAtUtc?: string | null;
    vehicleCollectedAtUtc?: string | null;
  } | null;
  refund?: {
    installments: VehicleAccidentInstallment[];
    /** Total eligible refund amount across all recorded installments */
    recordedEligibleAmount: number;
    recordedPaidAmount: number;
    status: VehicleAccidentRefundStatus;
    reference?: string | null;
    requestedAmount?: number | null;
    receivedAmount?: number | null;
    submittedAtUtc?: string | null;
    receivedAtUtc?: string | null;
    refundRequestAttachmentId?: string | null;
    refundReceiptAttachmentId?: string | null;
    refundDecisionAttachmentId?: string | null;
    notes?: string | null;
  } | null;
  sourceDocuments?: {
    iqama?: SourceDocumentInfo | null;
    license?: SourceDocumentInfo | null;
    registration?: SourceDocumentInfo | null;
  } | null;
  attachments: VehicleAccidentAttachmentResponse[];
  timeline: WorkflowTimelineEntry[];
}

export interface WorkflowActionRequest {
  action: VehicleAccidentWorkflowAction;
  rowVersion: string;
  notes: string;
  occurredAtUtc: string;
  attachmentId?: string | null;
  riderFaultPercentage?: number | null;
  otherParties?: OtherPartyFault[] | null;
  amount?: number | null;
  claimType?: VehicleAccidentClaimType | null;
  supplierId?: string | null;
  reference?: string | null;
  location?: string | null;
  contact?: string | null;
  appointmentAtUtc?: string | null;
}


export interface CreateWorkflowInstallmentRequest {
  rowVersion: string;
  periodFrom: string;
  periodTo: string;
  paidOn: string;
  amount: number;
  refundEligibleAmount: number;
  receiptAttachmentId: string;
  notes?: string | null;
}

export interface AccidentActionRequest {
  reason: string;
  rowVersion: string;
}

export interface CorrectVehicleAccidentRequest {
  policeReportNumber?: string | null;
  insuranceClaimNumber?: string | null;
  locationDescription?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  severity: VehicleAccidentSeverity;
  isDrivable: boolean;
  hasInjuries: boolean;
  injuryDetails?: string | null;
  thirdPartyDetails?: string | null;
  damageDescription?: string | null;
  faultAssessment?: string | null;
  narrative: string;
  correctionReason: string;
  rowVersion: string;
}

export interface VehicleAccidentReportVersionResponse {
  id: string;
  accidentId?: string | null;
  versionNumber: number;
  reportNumber?: string | null;
  fileSizeBytes?: number | null;
  sha256Checksum?: string | null;
  generatedAtUtc: string;
  generatedByUserId?: string | null;
  supersedesReportVersionId?: string | null;
  correctionReason?: string | null;
}

export interface VehicleReadinessResponse {
  vehicleId: string;
  isEligibleForAssignment: boolean;
  blockingReasons?: string[] | null;
  notes?: string | null;
}
