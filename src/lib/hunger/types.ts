// src/lib/hunger/types.ts
// TypeScript interfaces & contracts for Hungerstation (/api/hunger/* & shared /api/platform-accounts/*)

import type {
  PlatformAccountDayUsageInput,
  PreviousDayUsageInput,
} from "../platforms/day-usage-types";

export type HungerOperationalDisposition =
  | "Normal"
  | "Problem"
  | "AdministrativeStop"
  | "Blocked"
  | "DeferredNextMonth";

export type HungerCompensationModel = "Commission" | "Target" | "Unknown";

export type HungerSimOwnership =
  | "Company"
  | "Personal"
  | "Private"
  | "Rider"
  | "External"
  | "Mixed"
  | "Unknown";

export type HungerActualVehicleCustodyStatus =
  | "None"
  | "Assigned"
  | "Mixed"
  | "Unknown";

export type HungerActualVehicleOwnership =
  | "Company"
  | "Private"
  | "Mixed"
  | "Unknown";

export type HungerWithdrawalStatus =
  | "PendingArrival"
  | "Arrived"
  | "Cancelled";

export type HungerRemittanceStatus =
  | "Draft"
  | "Submitted"
  | "PartiallyConfirmed"
  | "Confirmed"
  | "Cancelled";

export type HungerAlertRuleCode =
  | "HoursCritical"
  | "HoursFollowUp"
  | "NoShowPositive";

export type HungerAlertSeverity = "High" | "Critical" | "Warning" | "Info";

export type HungerAlertMetric =
  | "WorkingHours"
  | "CompletedOrders"
  | "WorkedDays"
  | "QualifiedDays"
  | "NoShowCount"
  | "RejectedOrders"
  | "CancelledOrders"
  | "AcceptedOrders"
  | "StackedOrders";

export type HungerAlertOperator =
  | "LessThan"
  | "LessThanOrEqual"
  | "GreaterThan"
  | "GreaterThanOrEqual"
  | "Equal";

export type HungerAlertKind = "Alert" | "Target";

export type HungerAlertPeriod = "Day" | "Month";

export type HungerHoursUnit = "DecimalHours" | "Duration" | "FractionOfDay";

export type HungerSeedRowStatus =
  | "New"
  | "Unchanged"
  | "ChangedField"
  | "ConflictingOwner"
  | "MissingAccount";

export type HungerSeedResolutionAction =
  | "Create"
  | "Update"
  | "ReplaceOwner"
  | "Keep"
  | "Skip";

export type HungerPotentialFineStatus = "Potential" | "Invoiced" | "Waived";

export type HungerWalletReceiptState =
  | "None"
  | "Pending"
  | "PartiallyConfirmed"
  | "Confirmed";

export type HungerPerformanceGroupBy = "account" | "rider";
export type HungerPerformancePeriod = "day" | "month";
export type HungerPerformanceLayout = "vertical" | "horizontal";

export type HungerFinancialEventKind =
  | "Funding"
  | "TopUpAdvance"
  | "TopUpCollected"
  | "Collection"
  | "WithdrawalCompany"
  | "WithdrawalSupervisor"
  | "RiderPayment";

export type HungerSettlementDocumentKind =
  | "Invoice"
  | "MonthClose"
  | "Adjustment";

export interface HungerPagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages?: number;
}

// ---------------------------------------------------------------------------
// 1. Accounts & Seed Imports
// ---------------------------------------------------------------------------

export interface HungerPersonSummary {
  employeeId?: string | null;
  riderProfileId?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  iqamaNo?: string | null;
  phoneNumber?: string | null;
  nationality?: string | null;
  employeeStatus?: string | null;
  relationshipType?: string | null;
}

export interface HungerActualVehiclePeriod {
  fromUtc?: string | null;
  throughUtc?: string | null;
  from?: string | null;
  through?: string | null;
  custodyStatus?: HungerActualVehicleCustodyStatus | string | null;
  ownership?: HungerActualVehicleOwnership | string | null;
  vehicleOwnership?: HungerActualVehicleOwnership | string | null;
  vehicleId?: string | null;
  vehicleType?: string | null;
  type?: string | null;
  vehiclePlate?: string | null;
  plate?: string | null;
  plateNumber?: string | null;
  vehicleSerial?: string | null;
  serialNumber?: string | null;
  holderEmployeeId?: string | null;
  holderRiderProfileId?: string | null;
  holderNameAr?: string | null;
  holderNameEn?: string | null;
  holderIqamaNo?: string | null;
  reason?: string | null;
}

export interface HungerSimOwnershipPeriod {
  from?: string | null;
  through?: string | null;
  fromUtc?: string | null;
  throughUtc?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  ownership?: HungerSimOwnership | string | null;
  responsibleEmployeeId?: string | null;
  responsibleEmployeeNameAr?: string | null;
  holderRiderProfileId?: string | null;
  holderRiderNameAr?: string | null;
  carrier?: string | null;
  evidenceReference?: string | null;
  evidence?: string | null;
  reason?: string | null;
}

export interface HungerSimContext {
  simId?: string | null;
  phoneNumber?: string | null;
  ownership?: HungerSimOwnership | string | null;
  responsibleEmployeeId?: string | null;
  holderRiderProfileId?: string | null;
  holder?: HungerPersonSummary | null;
  carrier?: string | null;
  reason?: string | null;
  rowVersion?: string | null;
  ownershipPeriods?: HungerSimOwnershipPeriod[];
}

export interface HungerAccountsFilterParams {
  from?: string;
  through?: string;
  disposition?: string;
  // Account
  externalAccountId?: string;
  accountCode?: string;
  // Owner
  ownerEmployeeId?: string;
  ownerName?: string;
  ownerNameEn?: string;
  ownerIqama?: string;
  ownerPhone?: string;
  ownerNationality?: string;
  ownerEmployeeStatus?: string;
  ownerRelationshipType?: string;
  // Registration
  phoneNumber?: string;
  operatingCityId?: string;
  operatingCityNameAr?: string;
  registryIdentifier?: string;
  settlementModel?: string;
  // Registered vehicle
  registeredVehicleType?: string;
  registeredVehiclePlate?: string;
  registeredVehicleSerial?: string;
  // Actual vehicle
  actualVehicleType?: string;
  actualVehiclePlate?: string;
  actualVehicleOwnership?: string;
  actualVehicleCustodyStatus?: string;
  // SIM
  simOwnership?: string;
  sourceSimOwnership?: string;
  simResponsibleEmployeeId?: string;
  simHolderRiderProfileId?: string;
  simResponsibleName?: string;
  simResponsibleIqama?: string;
  simResponsiblePhone?: string;
  simHolderName?: string;
  simHolderIqama?: string;
  simHolderPhone?: string;
  // Account state
  operationalDisposition?: string;
  assignmentStatus?: string;
  // Actual rider (Section 7)
  actualRiderId?: string;
  actualRiderProfileId?: string;
  actualRiderName?: string;
  actualRiderIqama?: string;
  actualRiderPhone?: string;
  // Source rider (Section 7)
  sourceRiderName?: string;
  sourceRiderIqama?: string;
  // Sponsor (Section 7)
  sponsorId?: string;
  sponsorName?: string;
  // Models & statuses (Section 7)
  paymentModel?: string;
  compensationModel?: string;
  sourceStatus?: string;
  usageStatus?: string;
  monthlyUsageStatus?: string;
  // Quality (Section 7)
  latestQualitySegment?: string;
  qualityRankFrom?: string;
  qualityRankThrough?: string;
  qualityScoreFrom?: string;
  qualityScoreThrough?: string;
  qualityScoreEqual?: string;
  // Deferred dates (Section 7)
  deferredFrom?: string;
  deferredThrough?: string;
  // Pagination
  page?: number;
  pageSize?: number;
}

export interface HungerAccountItem {
  id?: string;
  accountId: string;
  platformId?: string;
  externalAccountId?: string | null;
  accountCode?: string | null;
  accountName?: string | null;
  status?: string | null;
  disposition?: HungerOperationalDisposition | "Unknown" | string | null;
  operationalDisposition?:
    | HungerOperationalDisposition
    | "Unknown"
    | string
    | null;
  dispositionReason?: string | null;
  deferredUntil?: string | null;
  assignmentStatus?: "Assigned" | "Unassigned" | string | null;
  reportedAssignmentStatus?: "Assigned" | "Unassigned" | string | null;

  // Nested Person Objects returned by GET /api/hunger/accounts
  owner?: HungerPersonSummary | null;
  actualRider?: HungerPersonSummary | null;
  sourceActualRider?: HungerPersonSummary | null;
  reportedCurrentRider?: HungerPersonSummary | null;
  currentRiderSource?: "Assignment" | "None" | string | null;

  // Normalized Owner convenience fields (صاحب الحساب)
  ownerEmployeeId?: string | null;
  ownerRiderProfileId?: string | null;
  ownerNameAr?: string | null;
  ownerNameEn?: string | null;
  ownerNationalId?: string | null;
  ownerPhoneNumber?: string | null;
  ownerNationality?: string | null;
  ownerEmployeeStatus?: string | null;
  ownerRelationshipType?: string | null;

  // Normalized Source User convenience fields (المستخدم الوارد في المصدر)
  sourceEmployeeId?: string | null;
  sourceRiderProfileId?: string | null;
  sourceUserNameAr?: string | null;
  sourceUserNameEn?: string | null;
  sourceNationalId?: string | null;
  sourcePhone?: string | null;
  sourceAssignmentFrom?: string | null;
  sourceVehicleDescription?: string | null;

  // Normalized Actual Assigned User convenience fields (المستخدم المكلف فعليًا)
  assignedRiderProfileId?: string | null;
  assignedEmployeeId?: string | null;
  assignedRiderNameAr?: string | null;
  assignedRiderNameEn?: string | null;
  assignedNationalId?: string | null;
  assignedPhoneNumber?: string | null;
  currentAssignmentId?: string | null;
  activeAssignmentId?: string | null;
  assignmentFrom?: string | null;
  assignmentEffectiveFrom?: string | null;
  assignmentRowVersion?: string | null;
  activeAssignmentRowVersion?: string | null;
  lastAssignmentEvent?: string | null;
  lastAssignmentEventAtUtc?: string | null;
  compensationModel?: HungerCompensationModel | string | null;
  paymentModel?: string | null;

  // Context & Metadata
  operatingCityId?: string | null;
  operatingCityNameAr?: string | null;
  operatingCityNameEn?: string | null;
  sponsorId?: string | null;
  sponsorNameAr?: string | null;
  sponsorNameEn?: string | null;
  commercialRegistrationName?: string | null;
  commercialRegistrationNumber?: string | null;
  registryIdentifier?: string | null;
  settlementSystem?: string | null;
  settlementModel?: string | null;
  accountPhoneNumber?: string | null;
  phoneNumber?: string | null;
  phoneSimCardId?: string | null;
  simPhoneNumber?: string | null;
  simOwnership?: HungerSimOwnership | string | null;
  sourceSimOwnership?: string | null;
  sim?: HungerSimContext | null;
  simHolder?: HungerPersonSummary | null;
  simResponsibleEmployee?: HungerPersonSummary | null;
  registeredVehicleId?: string | null;
  registeredVehicleType?: string | null;
  registeredVehiclePlate?: string | null;
  registeredVehicleSerial?: string | null;
  registeredVehicleLabel?: string | null;
  actualVehicleType?: string | null;
  actualVehiclePlate?: string | null;
  actualVehicleOwnership?: HungerActualVehicleOwnership | string | null;
  actualVehicleCustodyStatus?:
    | HungerActualVehicleCustodyStatus
    | string
    | null;
  actualVehiclePeriods?: HungerActualVehiclePeriod[];
  contextVerifiedAtUtc?: string | null;

  // Usage, Credentials & Quality Snapshot
  monthlyUsageStatus?: "Used" | "Unknown" | string | null;
  monthlyUsageSource?: "ObservedWorkingHours" | "None" | string | null;
  usageMonth?: string | null;
  latestQualitySegment?: string | null;
  latestQualityRank?: number | null;
  latestQualityScore?: number | null;
  latestQualityReportDate?: string | null;
  hasPassword?: boolean | null;

  // Wallet snapshot if provided
  lastWalletBalance?: number | string | null;
  lastClosingBalance?: number | string | null;
  currentPeriodBalance?: number | string | null;

  rowVersion?: string | null;
  updatedAtUtc?: string | null;
}

export interface HungerSeedFieldChange {
  field: string;
  existing?: string | null;
  incoming?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
}

export interface HungerSeedPreviewRow {
  rowNumber?: number;
  externalAccountId?: string | null;
  accountCode?: string | null;
  accountName?: string | null;
  platformId?: string | null;
  matchedAccountId?: string | null;
  ownerEmployeeId?: string | null;
  ownerNationalId?: string | null;
  ownerIqama?: string | null;
  ownerNameAr?: string | null;
  sourceNationalId?: string | null;
  sourceUserNameAr?: string | null;
  cityName?: string | null;
  commercialRegistry?: string | null;
  settlementSystem?: string | null;
  phoneNumber?: string | null;
  vehiclePlate?: string | null;
  status?: HungerSeedRowStatus | string | null;
  matchStatus?: string | null;
  changes?: HungerSeedFieldChange[];
  error?: string | null;
  assignmentIssue?: string | null;
  warnings?: string[];
  errors?: string[];
}

export interface HungerSeedRowResolution {
  rowNumber: number;
  action: HungerSeedResolutionAction;
  platformId?: string | null;
}

export interface HungerSeedImportConfirmRequest {
  resolutions: HungerSeedRowResolution[];
}

export interface HungerSeedImportPreviewResponse {
  previewId: string;
  expiresAtUtc?: string | null;
  totalRows?: number;
  validRows?: number;
  invalidRows?: number;
  matchedOwnersCount?: number;
  unmatchedOwnersCount?: number;
  rows?: HungerSeedPreviewRow[];
  warnings?: string[];
  errors?: string[];
}

export interface HungerSeedImportConfirmResponse {
  importId?: string;
  previewId?: string;
  createdCount?: number;
  updatedCount?: number;
  replacedOwnersCount?: number;
  keptCount?: number;
  skippedCount?: number;
  message?: string | null;
}

export interface HungerDeferredReminderItem {
  accountId: string;
  platformId?: string | null;
  externalAccountId: string;
  accountCode?: string | null;
  accountName?: string | null;
  ownerNameAr?: string | null;
  dueDate: string;
  deferredUntil?: string | null;
  overdueDays: number;
  dispositionReason?: string | null;
  reason?: string | null;
}

export interface HungerDispositionUpdateRequest {
  disposition: HungerOperationalDisposition;
  reason: string;
  deferredUntil?: string | null;
  rowVersion: string;
}

// ---------------------------------------------------------------------------
// 2. Cumulative Quality
// ---------------------------------------------------------------------------

export interface HungerQualityPreviewRow {
  rowNumber?: number;
  externalAccountId?: string | null;
  accountName?: string | null;
  riderNameAr?: string | null;
  segmentCode?: string | null;
  segmentRank?: number | null;
  grossOrders?: number | null;
  completedOrders?: number | null;
  completedOrdersInTime?: number | null;
  totalVerificationRequests?: number | null;
  successfulVerificationRequests?: number | null;
  failedOrdersByRider?: number | null;
  status?: string | null;
  errorMessage?: string | null;
}

export interface HungerQualityImportPreviewResponse {
  previewId: string;
  reportDate: string;
  month?: string | null;
  expiresAtUtc?: string | null;
  totalRows?: number;
  validRows?: number;
  failedRows?: number;
  rows?: HungerQualityPreviewRow[];
  warnings?: string[];
  errors?: string[];
}

export interface HungerQualityImportResultResponse {
  importId: string;
  reportDate?: string | null;
  month?: string | null;
  status?: string | null;
  totalRows?: number;
  succeededRows?: number;
  failedRows?: number;
  createdAtUtc?: string | null;
  rows?: HungerQualityPreviewRow[];
  errors?: string[];
}

export interface HungerQualityReallocateRequest {
  rowVersion: string;
  reason: string;
}

export interface HungerQualityReportItem {
  id?: string;
  sourceId?: string;
  accountId: string;
  externalAccountId?: string | null;
  accountName?: string | null;
  ownerNameAr?: string | null;
  assignedRiderProfileId?: string | null;
  assignedRiderNameAr?: string | null;
  assignedRiderNameEn?: string | null;
  month: string;
  reportDate?: string | null;
  segmentCode?: string | null;
  segmentRank?: number | null;
  grossOrders: number;
  completedOrders: number;
  completedOrdersInTime: number;
  totalVerificationRequests: number;
  successfulVerificationRequests: number;
  failedOrdersByRider: number;
  completionRate?: number | null;
  inTimeRate?: number | null;
  verificationSuccessRate?: number | null;
  rowVersion?: string | null;
  updatedAtUtc?: string | null;
}

// ---------------------------------------------------------------------------
// 3. Daily Operations, Monthly Summary & Alert Rules
// ---------------------------------------------------------------------------

export interface HungerDailyCounters {
  orders?: number | null;
  completedOrders?: number | null;
  acceptedOrders?: number | null;
  stackedOrders?: number | null;
  rejectedOrders?: number | null;
  cancelledOrders?: number | null;
  workingHours?: number | null;
  hours?: number | null;
  hoursUnit?: HungerHoursUnit | string | null;
  captainClassification?: string | null;
  noShowCount?: number | null;
  noShow?: number | null;
  lateLoginMinutes?: number | null;
  acceptanceRate?: number | null;
}

export interface HungerOperationsPreviewRow {
  rowNumber?: number;
  accountId?: string | null;
  status?: "New" | "Rejected" | "Updated" | string | null;
  error?: string | null;
  errorMessage?: string | null;
  dailyCounters?: HungerDailyCounters | null;
  adjustsNextRecord?: boolean;
  allocationStatus?: "Resolved" | "UnresolvedAllocation" | string | null;
  externalAccountId?: string | null;
  accountName?: string | null;
  riderNameAr?: string | null;
  reportDate?: string | null;
  orders?: number | null;
  completedOrders?: number | null;
  acceptedOrders?: number | null;
  stackedOrders?: number | null;
  rejectedOrders?: number | null;
  cancelledOrders?: number | null;
  workingHours?: number | null;
  hours?: number | null;
  hoursUnit?: HungerHoursUnit | string | null;
  captainClassification?: string | null;
  noShowCount?: number | null;
  noShow?: number | null;
  lateLoginMinutes?: number | null;
  acceptanceRate?: number | null;
}

export interface HungerOperationsImportPreviewResponse {
  previewId: string;
  reportDate: string;
  expiresAtUtc?: string | null;
  canConfirm?: boolean;
  rows?: HungerOperationsPreviewRow[];
  totalRows?: number;
  validRows?: number;
  invalidRows?: number;
  hoursUnit?: HungerHoursUnit | string | null;
  warnings?: string[];
  errors?: string[];
}

export interface HungerOperationsImportConfirmResponse {
  importId?: string;
  reportDate?: string | null;
  importedRows?: number;
  alertsTriggered?: number;
  message?: string | null;
}

export interface HungerOperationsReportItem {
  id?: string;
  sourceId: string;
  accountId: string;
  externalAccountId?: string | null;
  accountName?: string | null;
  ownerNameAr?: string | null;
  assignedRiderProfileId?: string | null;
  assignedRiderNameAr?: string | null;
  assignedRiderNameEn?: string | null;
  operatingCityNameAr?: string | null;
  sponsorNameAr?: string | null;
  reportDate: string;
  orders: number;
  acceptedOrders?: number | null;
  stackedOrders?: number | null;
  rejectedOrders?: number | null;
  cancelledOrders?: number | null;
  hours: number;
  hoursUnit?: HungerHoursUnit | string | null;
  captainClassification?: string | null;
  manualOrders?: number | null;
  manualHours?: number | null;
  manualComparisonReason?: string | null;
  noShowCount?: number | null;
  alerts?: Array<{
    code: HungerAlertRuleCode | string;
    severity: HungerAlertSeverity | string;
    message?: string | null;
  }>;
  rowVersion?: string | null;
}

export interface HungerManualComparisonRequest {
  orders?: number | null;
  hours?: number | null;
  reason: string;
  rowVersion: string;
}

export interface HungerMonthlySummaryResponse {
  month: string;
  inventory?: {
    totalAccounts?: number;
    activeAccounts?: number;
    suspendedAccounts?: number;
    blockedAccounts?: number;
  };
  assignments?: {
    assignedAccounts?: number;
    unassignedAccounts?: number;
    commissionCount?: number;
    targetCount?: number;
    unknownCompensationCount?: number;
  };
  dispositions?: {
    normalCount?: number;
    problemCount?: number;
    administrativeStopCount?: number;
    blockedCount?: number;
    deferredNextMonthCount?: number;
  };
  people?: {
    distinctOwnersCount?: number;
    distinctSourceUsersCount?: number;
    distinctAssignedRidersCount?: number;
    ownerMatchesAssignedCount?: number;
    sharedAccountsCount?: number;
  };
  operationsTotals?: {
    totalOrders?: number;
    totalHours?: number;
    criticalAlertsCount?: number;
    followUpAlertsCount?: number;
    noShowAlertsCount?: number;
  };
  [key: string]: unknown;
}

export interface HungerAlertRuleItem {
  id?: string;
  ruleId?: string;
  platformId?: string;
  code: HungerAlertRuleCode | string;
  metric?: HungerAlertMetric | string | null;
  operator?: HungerAlertOperator | string | null;
  kind?: HungerAlertKind | string | null;
  period?: HungerAlertPeriod | string | null;
  threshold: number;
  severity: HungerAlertSeverity | string;
  operatingCityId?: string | null;
  operatingCityNameAr?: string | null;
  effectiveFrom: string;
  effectiveThrough?: string | null;
  effectiveTo?: string | null;
  enabled: boolean;
  isCurrentlyEffective?: boolean;
  versionNumber?: number;
  evidenceReference?: string | null;
  createdByName?: string | null;
  createdAtUtc?: string | null;
}

export interface HungerAlertRuleCreateRequest {
  platformId: string;
  code: HungerAlertRuleCode | string;
  metric?: HungerAlertMetric | string | null;
  operator?: HungerAlertOperator | string | null;
  kind?: HungerAlertKind | string | null;
  period?: HungerAlertPeriod | string | null;
  threshold: number;
  severity: HungerAlertSeverity | string;
  operatingCityId?: string | null;
  effectiveFrom: string;
  effectiveThrough?: string | null;
  enabled: boolean;
  evidenceReference: string;
}

// ---------------------------------------------------------------------------
// 3B. Performance Report & Potential Fines
// ---------------------------------------------------------------------------

export interface HungerPerformanceQuery {
  from: string;
  through: string;
  groupBy: HungerPerformanceGroupBy;
  period: HungerPerformancePeriod;
  layout: HungerPerformanceLayout;
  accountId?: string;
  riderId?: string;
  cityId?: string;
  sponsorId?: string;
  actualVehicle?: string;
  actualVehicleType?: string;
  targetAchieved?: string;
  page?: number;
  pageSize?: number;
  accountFilters?: HungerAccountsFilterParams;
}

export interface HungerPerformanceCatalogEvaluation {
  ruleId?: string | null;
  code: string;
  kind?: string | null;
  metric?: string | null;
  period?: string | null;
  actual: number | null;
  threshold?: number | null;
  matches: boolean;
  severity?: string | null;
  evidence?: string | null;
}

export interface HungerPerformanceRowItem {
  entityId: string;
  period: string;
  completedOrders: number;
  workingHours: number;
  workedDays: number;
  qualifiedDays: number;
  unknownDays: number;
  scheduledDays: number;
  elapsedDays: number;
  remainingDays: number;
  acceptedOrders: number | null;
  stackedOrders: number | null;
  rejectedOrders: number | null;
  cancelledOrders: number | null;
  noShowCount: number | null;
  sponsorship: string;
  actualVehicle: string;
  actualVehicleType: string;
  target: number | null;
  deficit: number | null;
  targetAchieved: boolean | null;
  forecast: number | null;
  requiredPace: number | null;
  forecastObservedOrders: number;
  coverageThrough: string;
  alerts: string[];
  catalog: HungerPerformanceCatalogEvaluation[];
}

export type HungerPerformanceRow = HungerPerformanceRowItem;

export interface HungerPerformanceReportTotals {
  completedOrders: number;
  workingHours: number;
}

export interface HungerPerformanceReportResponse {
  items: HungerPerformanceRowItem[];
  page: number;
  pageSize: number;
  totalRecords: number;
  completedOrders: number;
  workingHours: number;
  distinctAccounts: number;
  distinctRiders: number;
  groupBy: "account" | "rider" | string;
  period: "day" | "month" | string;
  layout: "vertical" | "horizontal" | string;
  totals?: HungerPerformanceReportTotals | null;
}

export interface HungerDeletePerformanceResponse {
  reportDate: string;
  sponsorId: string | null;
  performanceRowsDeleted: number;
  potentialFinesDeleted: number;
}

export interface HungerPotentialFineItem {
  id: string;
  fineId?: string;
  accountId: string;
  externalAccountId?: string | null;
  accountCode?: string | null;
  accountName?: string | null;
  ownerNameAr?: string | null;
  riderProfileId?: string | null;
  riderNameAr?: string | null;
  riderNameEn?: string | null;
  riderIqamaNo?: string | null;
  sourceDay: string;
  reportDate?: string | null;
  noShowCount: number;
  noShowShiftsCount?: number | null;
  status: HungerPotentialFineStatus | string;
  invoiceDocumentId?: string | null;
  invoiceDocumentReference?: string | null;
  invoiceSourceKey?: string | null;
  evidence?: string | null;
  evidenceReference?: string | null;
  resolvedAtUtc?: string | null;
  resolvedByName?: string | null;
  rowVersion: string;
}

export interface HungerPotentialFineResolveRequest {
  status: "Invoiced" | "Waived";
  invoiceDocumentId?: string | null;
  invoiceSourceKey?: string | null;
  evidence: string;
  rowVersion: string;
}

// ---------------------------------------------------------------------------
// 4. Wallets, Remittances & Settlement Documents
// ---------------------------------------------------------------------------

export interface HungerFinanceConfigurationRequest {
  platformId: string;
  supervisorEmployeeId: string;
  sponsorId: string;
  custodySubAccountId: string;
  collectionsSubAccountId: string;
  walletSubAccountId: string;
  riderClearingSubAccountId: string;
  evidenceReference: string;
  isActive: boolean;
  rowVersion?: string | null;
}

export interface HungerFinanceConfigurationResponse
  extends HungerFinanceConfigurationRequest {
  id?: string;
  supervisorNameAr?: string | null;
  sponsorNameAr?: string | null;
  custodySubAccountName?: string | null;
  collectionsSubAccountName?: string | null;
  walletSubAccountName?: string | null;
  riderClearingSubAccountName?: string | null;
  updatedAtUtc?: string | null;
}

export interface HungerFinanceEventCreateRequest {
  platformId: string;
  supervisorEmployeeId: string;
  kind: HungerFinancialEventKind;
  amount: number;
  accountId?: string | null;
  riderProfileId?: string | null;
  counterSubAccountId?: string | null;
  relatedEventId?: string | null;
  businessDate: string;
  idempotencyKey: string;
  evidenceReference: string;
  // Withdrawal extra fields (v2.1)
  sourceWalletBalance?: number | null;
  destinationType?: "Company" | "Supervisor" | string | null;
  destinationOwnerId?: string | null;
  transferReference?: string | null;
  transferDate?: string | null;
  againstReservedRights?: boolean | null;
}

export interface HungerWithdrawalActionRequest {
  idempotencyKey: string;
  businessDate: string;
  evidenceReference: string;
}

export interface HungerFinanceEventItem {
  id: string;
  eventId?: string;
  requestId?: string;
  platformId?: string;
  supervisorEmployeeId: string;
  supervisorNameAr?: string | null;
  kind: HungerFinancialEventKind | string;
  amount: number;
  confirmedAmount?: number | null;
  remainingAmount?: number | null;
  remainingRemittableAmount?: number | null;
  accountId?: string | null;
  externalAccountId?: string | null;
  accountName?: string | null;
  riderProfileId?: string | null;
  riderNameAr?: string | null;
  counterSubAccountId?: string | null;
  counterSubAccountName?: string | null;
  relatedEventId?: string | null;
  businessDate: string;
  evidenceReference?: string | null;
  status?: string | null;
  withdrawalStatus?: HungerWithdrawalStatus | string | null;
  arrivalStatus?: HungerWithdrawalStatus | string | null;
  requestStatus?: string | null;
  sourceWalletBalance?: number | null;
  destinationType?: "Company" | "Supervisor" | string | null;
  destinationOwnerId?: string | null;
  destinationOwnerNameAr?: string | null;
  transferReference?: string | null;
  transferDate?: string | null;
  againstReservedRights?: boolean | null;
  remittanceStatus?: string | null;
  remittanceId?: string | null;
  createdAtUtc?: string | null;
}

export interface HungerFinanceEventsListResponse {
  custodyBalance?: number;
  pendingBalance?: number;
  pendingRemittanceBalance?: number;
  totalCollections?: number;
  items: HungerFinanceEventItem[];
  requests?: HungerFinanceEventItem[];
  page?: number;
  pageSize?: number;
  totalCount?: number;
}

export interface HungerRemittanceSourceInput {
  sourceEventId: string;
  amount: number;
}

export interface HungerRemittanceCreateRequest {
  platformId: string;
  supervisorEmployeeId: string;
  sources: HungerRemittanceSourceInput[];
  idempotencyKey: string;
  businessDate: string;
  evidenceReference: string;
}

export interface HungerRemittanceActionRequest {
  idempotencyKey: string;
  businessDate: string;
  evidenceReference: string;
  reason?: string | null;
}

export interface HungerRemittanceConfirmRequest {
  destinationSubAccountId?: string | null;
  destinationType?: "Company" | "Supervisor" | string | null;
  destinationOwnerId?: string | null;
  sources?: HungerRemittanceSourceInput[];
  selectedSourceIds?: string[];
  idempotencyKey: string;
  businessDate: string;
  evidenceReference: string;
}

export interface HungerReceiptConfirmationItem {
  id?: string;
  confirmationId: string;
  remittanceId?: string;
  amount?: number;
  businessDate?: string | null;
  evidenceReference?: string | null;
  destinationSubAccountId?: string | null;
  destinationSubAccountName?: string | null;
  destinationType?: string | null;
  destinationOwnerId?: string | null;
  isReversed?: boolean;
  reversedAtUtc?: string | null;
  status?: string | null;
  createdAtUtc?: string | null;
}

export interface HungerRemittanceSourceLineItem {
  sourceEventId: string;
  eventId?: string;
  id?: string;
  kind?: string | null;
  businessDate?: string | null;
  accountId?: string | null;
  externalAccountId?: string | null;
  accountName?: string | null;
  riderProfileId?: string | null;
  riderNameAr?: string | null;
  amount: number;
  totalAmount?: number;
  confirmedAmount?: number;
  remainingAmount?: number;
  remainingRemittableAmount?: number;
  reservedAmount?: number;
  evidenceReference?: string | null;
  status?: string | null;
}

export interface HungerRemittanceResponse {
  id?: string;
  remittanceId: string;
  supervisorEmployeeId?: string;
  supervisorNameAr?: string | null;
  totalAmount?: number;
  amount?: number;
  confirmedAmount?: number;
  remainingAmount?: number;
  status?: HungerRemittanceStatus | string | null;
  businessDate?: string | null;
  evidenceReference?: string | null;
  destinationSubAccountId?: string | null;
  destinationSubAccountName?: string | null;
  sources?: HungerRemittanceSourceLineItem[];
  confirmations?: HungerReceiptConfirmationItem[];
  hasHistoricalConfirmations?: boolean;
  confirmedAtUtc?: string | null;
  createdAtUtc?: string | null;
}

export interface HungerPendingCollectionsResponse {
  batches: HungerPagedResponse<HungerRemittanceResponse>;
  sources: HungerPagedResponse<HungerRemittanceSourceLineItem>;
}

export interface HungerWalletReviewRequest {
  action: "Deliver" | "Return";
  riderProfileId: string;
  supervisorEmployeeId: string;
  businessDate: string;
  mobileBalance: string | number;
  closingBalance?: number | null;
  provenAdjustments: number;
  walletEvidence?: File | null;
  closingEvidence?: string | null;
  adjustmentEvidence?: string | null;
  assignment?: {
    actualRiderProfileId: string;
    riderProfileId?: string;
    effectiveFrom: string;
    reason: string;
    wasBackdated?: boolean;
    backdatedReason?: string | null;
    compensationModel: HungerCompensationModel;
    paymentModel?: string;
    previousDayUsages?: PreviousDayUsageInput[];
  } | null;
  return?: {
    effectiveTo: string;
    status: "Ended";
    reason: string;
    rowVersion: string;
    dayUsage?: PlatformAccountDayUsageInput;
  } | null;
}

export interface HungerWalletReviewResponse {
  reviewId: string;
  accountId: string;
  action: "Deliver" | "Return";
  mobileBalance: number;
  closingBalance: number | null;
  provenAdjustments: number;
  currentPeriodBalance: number | null;
  attributedBalance?: number | null;
  riderBalanceChange?: number | null;
  canConfirm?: boolean;
  expiresAtUtc?: string | null;
  warnings?: string[];
  summary?: string | null;
  walletEvidence?: string | null;
}

export interface HungerRiderSwapReviewRequest {
  return: {
    action: "Return";
    riderProfileId: string;
    supervisorEmployeeId: string;
    businessDate: string;
    mobileBalance: string | number;
    closingBalance?: number | null;
    provenAdjustments: number;
    walletEvidence: string;
    closingEvidence?: string | null;
    adjustmentEvidence?: string | null;
    return: {
      effectiveTo: string;
      status: "Ended";
      reason: string;
      rowVersion: string;
      dayUsage?: PlatformAccountDayUsageInput;
    };
  };
  handover: {
    actualRiderProfileId: string;
    riderProfileId?: string;
    effectiveFrom: string;
    reason: string;
    wasBackdated?: boolean;
    backdatedReason?: string | null;
    compensationModel?: HungerCompensationModel;
    paymentModel?: string;
    previousDayUsages?: PreviousDayUsageInput[];
  };
}

export interface HungerRiderSwapReviewResponse {
  swapId: string;
  return: HungerWalletReviewResponse;
  handover: HungerWalletReviewResponse;
}

export interface HungerRiderSwapConfirmResponse {
  swapId: string;
  return: unknown;
  handover: unknown;
}

export interface HungerSettlementDocumentCreateRequest {
  platformId: string;
  accountId?: string | null;
  month: string;
  invoicePeriod?: string | null;
  kind: HungerSettlementDocumentKind;
  documentReference: string;
  amount: number;
  evidenceReference: string;
  notes?: string | null;
  businessDate: string;
  // Adjustment required fields (v2.1)
  sourceDocumentType?: string | null;
  sourceReference?: string | null;
  closingSnapshotId?: string | null;
}

export interface HungerSettlementReconcileRequest {
  closingSnapshotId: string;
  evidenceReference: string;
}

export interface HungerSettlementDocumentItem {
  id: string;
  documentId?: string;
  platformId?: string;
  accountId?: string | null;
  externalAccountId?: string | null;
  accountName?: string | null;
  ownerNameAr?: string | null;
  month: string;
  chargeFrom?: string | null;
  invoicePeriod?: string | null;
  kind: HungerSettlementDocumentKind | string;
  documentReference: string;
  amount: number;
  reconciledAmount?: number | null;
  varianceAmount?: number | null;
  reconciliationStatus?: string | null;
  status?: string | null;
  sourceDocumentType?: string | null;
  sourceReference?: string | null;
  closingSnapshotId?: string | null;
  evidenceReference: string;
  notes?: string | null;
  businessDate?: string | null;
  createdAtUtc?: string | null;
}

export interface HungerWalletsQuery {
  page?: number;
  pageSize?: number;
  balanceFrom?: string;
  balanceThrough?: string;
  balanceEqual?: string;
  receiptState?: HungerWalletReceiptState | string;
  accountFilters?: HungerAccountsFilterParams;
}

export interface HungerWalletListItem {
  accountId: string;
  externalAccountId?: string | null;
  accountCode?: string | null;
  accountName?: string | null;
  ownerNameAr?: string | null;
  assignedRiderNameAr?: string | null;
  assignedRiderProfileId?: string | null;
  mobileBalance: number | null;
  observedOn?: string | null;
  observedAtUtc?: string | null;
  evidence?: string | null;
  walletEvidence?: string | null;
  periodBalance: number | null;
  currentPeriodBalance?: number | null;
  attributedBalance: number | null;
  restrictedRights: number | null;
  reservedRights?: number | null;
  pendingArrival: number | null;
  pendingReceipts: number | null;
  confirmedReceipts: number | null;
  receiptState?: HungerWalletReceiptState | string | null;
}

export interface HungerWalletObservationItem {
  id?: string;
  reviewId?: string;
  observedOn: string;
  observedAtUtc?: string | null;
  action?: string | null;
  mobileBalance: number | null;
  closingBalance?: number | null;
  provenAdjustments?: number | null;
  periodBalance?: number | null;
  currentPeriodBalance?: number | null;
  attributedBalance?: number | null;
  riderProfileId?: string | null;
  riderNameAr?: string | null;
  supervisorNameAr?: string | null;
  evidence?: string | null;
  walletEvidence?: string | null;
  status?: string | null;
}

export interface HungerWalletHistoryEventItem {
  id: string;
  eventId?: string;
  kind: string;
  businessDate: string;
  amount: number;
  evidenceReference?: string | null;
  status?: string | null;
  withdrawalStatus?: string | null;
  remittanceId?: string | null;
  remittanceStatus?: string | null;
  remittanceBatchAmount?: number | null;
  remittanceTotalAmount?: number | null;
  confirmedAmount?: number | null;
  remainingAmount?: number | null;
  reversedAmount?: number | null;
  isReversed?: boolean | null;
  confirmationId?: string | null;
  supervisorNameAr?: string | null;
  riderNameAr?: string | null;
  notes?: string | null;
  createdAtUtc?: string | null;
}

export interface HungerWalletHistoryResponse {
  events: HungerWalletHistoryEventItem[];
  observations: HungerWalletObservationItem[];
  totalEvents: number;
  totalObservations: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// 5. Shared Platform Account Business Context & Credentials
// ---------------------------------------------------------------------------

export interface PlatformAccountBusinessContextResponse {
  accountId: string;
  externalAccountId?: string | null;
  accountName?: string | null;
  platformNameAr?: string | null;
  ownerEmployeeId?: string | null;
  ownerNameAr?: string | null;
  operatingCityId?: string | null;
  operatingCityNameAr?: string | null;
  commercialRegistrationName?: string | null;
  commercialRegistrationNumber?: string | null;
  settlementSystem?: string | null;
  accountPhoneNumber?: string | null;
  phoneSimCardId?: string | null;
  simPhoneNumber?: string | null;
  simOwnership?: HungerSimOwnership | string | null;
  sourceSimOwnership?: string | null;
  simRowVersion?: string | null;
  sim?: HungerSimContext | null;
  simHolder?: HungerPersonSummary | null;
  simResponsibleEmployee?: HungerPersonSummary | null;
  registeredVehicleId?: string | null;
  registeredVehicleType?: string | null;
  registeredVehiclePlate?: string | null;
  registeredVehicleSerial?: string | null;
  registeredVehicleLabel?: string | null;
  fleetAssignedVehiclePlate?: string | null;
  actualVehicleType?: string | null;
  actualVehiclePlate?: string | null;
  actualVehicleOwnership?: HungerActualVehicleOwnership | string | null;
  actualVehicleCustodyStatus?:
    | HungerActualVehicleCustodyStatus
    | string
    | null;
  actualVehiclePeriods?: HungerActualVehiclePeriod[];
  contextVerifiedAtUtc?: string | null;
  rowVersion?: string | null;
  history?: Array<{
    effectiveFrom: string;
    effectiveTo?: string | null;
    summary?: string | null;
    changedByName?: string | null;
  }>;
}

export interface PlatformAccountBusinessUpdateRequest {
  ownerEmployeeId?: string | null;
  operatingCityId?: string | null;
  commercialRegistrationName?: string | null;
  commercialRegistrationNumber?: string | null;
  settlementSystem?: string | null;
  accountPhoneNumber?: string | null;
  phoneSimCardId?: string | null;
  registeredVehicleId?: string | null;
  effectiveFrom: string;
  reason: string;
  rowVersion: string;
}

export interface PlatformAccountCredentialRevealResponse {
  accountId: string;
  username?: string | null;
  password?: string | null;
  secret?: string | null;
  revealedAtUtc?: string | null;
}

export interface SimOwnershipUpdateRequest {
  ownership: HungerSimOwnership;
  evidenceReference: string;
  effectiveFrom: string;
  rowVersion: string;
}
