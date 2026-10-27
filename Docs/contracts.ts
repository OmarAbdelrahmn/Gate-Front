export type Guid = string;
export type BusinessDate = string; // yyyy-MM-dd, Riyadh business date
export type EligibilityStatus = "Pass" | "Fail" | "Unknown";
export type PricingType = "BIKE" | "CAR";
export interface NinjaEvaluationQuery {
  year: number; month: number; asOf?: BusinessDate; view?: "riders" | "accounts";
  accountId?: Guid; riderId?: Guid; cityId?: Guid; sponsorId?: Guid;
  pricingType?: PricingType; status?: "TargetAchieved" | "BelowTarget" | "Unknown";
  search?: string; page?: number; pageSize?: number;
}
export interface NinjaPricingPeriod { from: BusinessDate; to: BusinessDate; pricingType: PricingType; }
export interface NinjaEvaluationContextRequest {
  expectedRevisionId: Guid | null; confirmedFirstDeliveryDate: BusinessDate | null;
  pricingPeriods: NinjaPricingPeriod[]; reason: string; reviewedSnapshotId?: Guid | null;
}
export interface NinjaEvaluationContextResponse {
  accountId: Guid; revisionId: Guid | null; revision: number;
  confirmedFirstDeliveryDate: BusinessDate | null; pricingPeriods: NinjaPricingPeriod[];
}
export interface NinjaResponsibilityInput { assignmentId: Guid; date: BusinessDate; weight: number; }
export interface NinjaResponsibilityRequest {
  year: number; month: number; expectedRevisionId: Guid | null; lines: NinjaResponsibilityInput[];
  reason: string; reviewedSnapshotId?: Guid | null;
}
export interface NinjaResponsibilityResponse {
  accountId: Guid; year: number; month: number; revisionId: Guid | null; revision: number;
  lines: NinjaResponsibilityInput[];
}
export interface NinjaEvaluationDay {
  date: BusinessDate; accountId: Guid; captainId: string; assignmentId: Guid | null;
  riderProfileId: Guid | null; pricingType: PricingType | null; responsibility: number | null;
  orders: number | null; hours: number | null; target: number | null; gap: number | null;
  hoursStatus: "Qualified" | "ShortHours" | "PartialShiftUnknown" | "Unknown" | "NotScheduled";
  coverage: "Complete" | "Missing" | "AllocationMismatch";
  sourceId: Guid | null; importId: Guid | null; sourceRowNumber: number | null;
  allocationOrigin: "Reported" | "Declared" | "Remainder" | "LegacyUnknown";
  importedAtUtc: string | null;
}
export interface NinjaEvaluationTotals {
  orders: number; hours: number; responsibility: number; target: number | null;
  gap: number | null; completionRate: number | null; ordersPerHour: number | null;
}
export interface NinjaAttendanceEvaluation {
  scheduled: number; qualified: number; unknown: number; shortHoursDays: number;
  requiredQualifyingUnits: number; requiredQualifyingDays: number | null; status: EligibilityStatus;
}
export interface NinjaOrderSuggestion {
  target: number; base: number; orders: number; shortage: number; extra: number;
  band: "AboveTarget" | "TargetAchieved" | "Shortage10" | "Shortage20" | "Shortage30" | "PerOrderFallback";
  rate: number; amount: number;
}
export interface NinjaMoneySegment { pricingType: PricingType; responsibility: number; calculation: NinjaOrderSuggestion; }
export interface NinjaSuggestedMoney {
  orderAmount: number; suggestedAmount: number; attendanceReduction: boolean;
  attendanceBasis: "AttendanceToCutoffPace" | "ProjectedAttendance"; segments: NinjaMoneySegment[];
  provisional: true; basis: "CompletedOrdersAndWorkingHoursOnly";
  invoiceStatus: "PendingExternalInvoice"; actualInvoiceAmount: null;
}
export interface NinjaEvaluationForecast {
  projectedOrders: number; projectedGap: number; dailyRunRate: number; remainingResponsibility: number;
  remainingOrders: number; requiredDailyRate: number | null; projectedQualifiedUnits: number;
  projectedAttendanceStatus: EligibilityStatus; attendanceRecoverable: boolean;
  suggestedMoney: NinjaSuggestedMoney | null; reliable: boolean;
  assumption: "PeriodEnded" | "ContinueCurrentAssignment" | "ThroughKnownAssignmentEnd";
}
export interface NinjaEvaluationRow {
  key: string; accountId: Guid | null; riderProfileId: Guid | null; riderName: string | null;
  accountIds: Guid[]; captainIds: string[]; assignmentIds: Guid[];
  cityId: Guid | null; cityName: string | null; sponsorId: Guid | null; establishmentName: string | null;
  latestImportedDate: BusinessDate | null; latestCompleteDate: BusinessDate | null;
  requestedAsOf: BusinessDate; dataDelayDays: number | null;
  observed: NinjaEvaluationTotals; evaluated: NinjaEvaluationTotals; periodTarget: number | null;
  targetDueToday: number | null; attendance: NinjaAttendanceEvaluation;
  targetStatus: "TargetAchieved" | "BelowTarget" | "Unknown";
  suggestedMoney: NinjaSuggestedMoney | null; forecast: NinjaEvaluationForecast | null;
  continuationScenario: NinjaEvaluationForecast | null; days: NinjaEvaluationDay[]; reasons: string[];
  otherEligibility: Record<"Acceptance" | "Timing" | "Uniform" | "LeaveCompliance", "Unknown">;
}
export interface NinjaAccountSuggestionComparison {
  accountId: Guid; accountSuggestedAmount: number | null; riderSuggestedAmounts: number | null;
  difference: number | null; accountCutoff: BusinessDate | null; riderContextComplete: boolean;
}
export interface NinjaEvaluationSummary {
  totalRows: number; accounts: number; riders: number; observedOrders: number; observedHours: number;
  suggestedAmount: number | null; mixedCutoffs: boolean; rowsMissingSuggestion: number;
  accountComparisons: NinjaAccountSuggestionComparison[];
}
export interface NinjaEvaluationReport {
  year: number; month: number; today: BusinessDate; requestedAsOf: BusinessDate;
  view: "riders" | "accounts"; policyVersion: string; inputRevision: string; computedAtUtc: string;
  summary: NinjaEvaluationSummary; items: NinjaEvaluationRow[]; page: number; pageSize: number;
}
export interface NinjaEvaluationDayDetail { source: NinjaEvaluationDay | null; riders: NinjaEvaluationDay[]; }
export interface NinjaSnapshotRequest {
  query: NinjaEvaluationQuery; reason: string; freeze?: boolean;
  supersedesId?: Guid | null; expectedInputRevision?: string | null;
}
export interface NinjaSnapshotResponse {
  id: Guid; frozen: boolean; supersedesId: Guid | null; createdAtUtc: string; reason: string;
  report: NinjaEvaluationReport;
}
export interface NinjaSuggestionRates { target: number; base: number; bonus: number; rate1: number; rate2: number; rate3: number; fallback: number; }
export interface NinjaEvaluationPolicyResponse {
  version: string; monthBasis: "CalendarDays"; attendanceThreshold: number; hoursPerFullDay: number;
  attendanceReduction: number; rounding: string; bike: NinjaSuggestionRates; car: NinjaSuggestionRates;
  unavailableConditions: string[];
}
export interface NinjaPerformanceImportOptions {
  mode?: "Daily" | "MultiDay"; reportDate?: BusinessDate;
  encoding?: "utf-8" | "windows-1256"; delimiter?: "," | ";" | "\t";
  hoursUnit?: "DecimalHours" | "Duration" | "ExcelDays";
  dateFormat?: "yyyy-MM-dd" | "dd/MM/yyyy" | "MM/dd/yyyy";
}
export interface NinjaPerformancePreviewRow {
  rowNumber: number; captainId: string; date: BusinessDate; accountId: Guid | null; orders: number;
  hours: number; status: "New" | "Identical" | "Conflict" | "UnknownAccount" | "UnresolvedAllocation" | "Invalid";
  issues: string[];
}
export interface NinjaPerformancePreviewResponse {
  previewId: Guid; expiresAtUtc: string; contentHash: string; inputRevision: string;
  canConfirm: boolean; rows: NinjaPerformancePreviewRow[];
}
export interface NinjaImportIssue { rowNumber: number; captainId: string | null; message: string; }
export interface NinjaImportResponse { importId: Guid | null; reportDate: BusinessDate; importedRows: number; skippedRows: number; issues: NinjaImportIssue[]; }
export interface NinjaPerformanceConfirmation { artifactId: Guid | null; importedRows: number; skippedRows: number; days: NinjaImportResponse[]; }
