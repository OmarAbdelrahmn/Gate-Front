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
  assignmentId?: string | null;
  issueId?: string | null;
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
  evidenceAttachments: VehicleAccidentAttachmentResponse[];
  reportVersions: VehicleAccidentReportVersionResponse[];
}

export interface CreateVehicleAccidentRequest {
  vehicleId: string;
  riderProfileId: string;
  occurredAtUtc: string;
  locationDescription?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  policeReportNumber?: string | null;
  insuranceClaimNumber?: string | null;
  severity: VehicleAccidentSeverity;
  isDrivable: boolean;
  hasInjuries: boolean;
  injuryDetails?: string | null;
  thirdPartyDetails?: string | null;
  damageDescription?: string | null;
  faultAssessment?: string | null;
  narrative: string;
}

export interface VehicleAccidentAttachmentResponse {
  id: string;
  accidentId: string;
  evidenceType: VehicleAccidentEvidenceType;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAtUtc: string;
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
  accidentId: string;
  versionNumber: number;
  generatedAtUtc: string;
  generatedByUserId?: string | null;
  reason?: string | null;
}

export interface VehicleReadinessResponse {
  vehicleId: string;
  isEligibleForAssignment: boolean;
  blockingReasons?: string[] | null;
  notes?: string | null;
}
