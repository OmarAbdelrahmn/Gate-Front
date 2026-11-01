/**
 * ninja-api-contracts.ts
 * Complete Ninja Platform API Contracts and Framework-Neutral Client
 * Updated from official Ninja documentation (15 October 2026).
 * Covers all 19 endpoints: Accounts, Status, Compare, Assign, Return, Credentials,
 * Daily Performance/Deductions, Aggregate Reports, and Sheet-Checkup Reviews.
 */

export type Guid = string;
export type DateOnly = string; // Formatted YYYY-MM-DD
export type UtcTimestamp = string; // ISO 8601 UTC timestamp

export type NinjaRiderType =
  | "InternalCar"
  | "ExternalCar"
  | "InternalMotorcycle"
  | "ExternalMotorcycle";

export type NinjaPaymentModel = "PayPerOrder" | "Salary";

export interface NinjaRiderTypeOption {
  value: NinjaRiderType;
  labelEn: string;
  labelAr: string;
}

export const NINJA_RIDER_TYPES: readonly NinjaRiderTypeOption[] = [
  { value: "InternalCar", labelEn: "Internal car", labelAr: "سيارة داخلي" },
  { value: "ExternalCar", labelEn: "External car", labelAr: "سيارة خارجي" },
  { value: "InternalMotorcycle", labelEn: "Internal motorcycle", labelAr: "دراجة نارية داخلي" },
  { value: "ExternalMotorcycle", labelEn: "External motorcycle", labelAr: "دراجة نارية خارجي" },
] as const;

export interface NinjaPaymentModelOption {
  value: NinjaPaymentModel;
  labelEn: string;
  labelAr: string;
}

export const NINJA_PAYMENT_MODELS: readonly NinjaPaymentModelOption[] = [
  { value: "PayPerOrder", labelEn: "Commission", labelAr: "عمولة" },
  { value: "Salary", labelEn: "Salary", labelAr: "بالراتب" },
] as const;

export function getNinjaRiderTypeLabel(
  type?: string | null,
  isEn = false
): string {
  if (!type) return isEn ? "Unknown" : "غير محدد";
  switch (type) {
    case "InternalCar":
      return isEn ? "Internal car" : "سيارة داخلي";
    case "ExternalCar":
      return isEn ? "External car" : "سيارة خارجي";
    case "InternalMotorcycle":
      return isEn ? "Internal motorcycle" : "دراجة نارية داخلي";
    case "ExternalMotorcycle":
      return isEn ? "External motorcycle" : "دراجة نارية خارجي";
    default:
      return type;
  }
}

export function getNinjaPaymentModelLabel(
  model?: string | null,
  isEn = false
): string {
  if (!model) return "—";
  switch (model) {
    case "PayPerOrder":
      return isEn ? "Commission" : "عمولة";
    case "Salary":
      return isEn ? "Salary" : "بالراتب";
    default:
      return model;
  }
}

/**
 * Resolves whether a Ninja account is assigned based on response or status.
 */
export function isNinjaAccountAssigned(acc: Partial<NinjaAccountResponse>): boolean {
  if (typeof acc.isAssigned === "boolean") return acc.isAssigned;
  if (acc.assignmentStatus) return acc.assignmentStatus.toLowerCase() === "assigned";
  if (acc.assignmentStatusAr) return acc.assignmentStatusAr === "مسند";
  return (
    (acc.status || "").toLowerCase() === "assigned" ||
    Boolean(acc.actualRiderProfileId || acc.currentAssignmentId)
  );
}

/**
 * Resolves assignmentStatusAr: "مسند" | "غير مسند"
 */
export function getNinjaAssignmentStatusAr(acc: Partial<NinjaAccountResponse>): "مسند" | "غير مسند" {
  if (acc.assignmentStatusAr) return acc.assignmentStatusAr as "مسند" | "غير مسند";
  return isNinjaAccountAssigned(acc) ? "مسند" : "غير مسند";
}

/**
 * Formats a single attendance failure reason into localized Arabic or English.
 */
export function formatAttendanceReason(reason: string, isEn = false): string {
  switch (reason) {
    case "LeaveOnProtectedDay":
      return isEn ? "Leave/absence on a protected day" : "غياب في يوم محمي (محظور)";
    case "AttendanceRateBelowTarget":
      return isEn ? "Attendance rate below target" : "نسبة الحضور أقل من المستهدف";
    case "InsufficientQualifiedDays":
      return isEn ? "Insufficient qualified days" : "أيام العمل المؤهلة غير كافية";
    case "TooManyAbsentDays":
      return isEn ? "Excessive absent days" : "تجاوز أيام الغياب المسموحة";
    case "TooManyShortHoursDays":
      return isEn ? "Excessive short hours days" : "ساعات عمل يومية غير مكتملة";
    default:
      return reason;
  }
}

/**
 * Returns a human-readable explanation of why an account failed attendance or operational validity.
 */
export function getAttendanceFailureExplanation(
  attendance?: NinjaAccountAttendanceEvaluation | null,
  isEn = false
): string | null {
  if (!attendance) return null;
  const parts: string[] = [];
  const protectedDays = attendance.protectedDayAbsences || [];
  if (protectedDays.length > 0) {
    parts.push(
      isEn
        ? `Absence on protected day(s): ${protectedDays.join(", ")}`
        : `غياب في أيام محمية: ${protectedDays.join("، ")}`
    );
  }
  const formattedReasons = (attendance.reasons || [])
    .filter((r) => r !== "LeaveOnProtectedDay" || protectedDays.length === 0)
    .map((r) => formatAttendanceReason(r, isEn));
  if (formattedReasons.length > 0) {
    parts.push(formattedReasons.join(isEn ? ", " : "، "));
  }
  return parts.length > 0 ? parts.join(isEn ? " — " : " — ") : null;
}

/**
 * Resolves whether a Ninja account is valid for operation.
 * Operational validity is independent of assignment status.
 */
export function isNinjaAccountValid(acc: Partial<NinjaAccountResponse>): boolean {
  if (acc.attendance?.status) {
    if (acc.attendance.status.toLowerCase() === "invalid") return false;
    if (acc.attendance.status.toLowerCase() === "valid") return true;
  }
  if (acc.attendance?.protectedDayAbsences && acc.attendance.protectedDayAbsences.length > 0) {
    return false;
  }
  if (typeof acc.isValidForOperation === "boolean") return acc.isValidForOperation;
  if (acc.operationalValidity) return acc.operationalValidity.toLowerCase() === "valid";
  if (acc.operationalValidityAr) return acc.operationalValidityAr === "صالح";
  if (acc.isOperationallyBlocked) return false;
  const s = (acc.status || "").toLowerCase();
  if (s === "suspended" || s === "retired" || s === "archived") return false;
  return true;
}

/**
 * Resolves operationalValidityAr: "صالح" | "غير صالح"
 */
export function getNinjaOperationalValidityAr(acc: Partial<NinjaAccountResponse>): "صالح" | "غير صالح" {
  if (acc.operationalValidityAr) return acc.operationalValidityAr as "صالح" | "غير صالح";
  return isNinjaAccountValid(acc) ? "صالح" : "غير صالح";
}

/**
 * Resolves vehicle ownership in Arabic: "مركبة شركة" | "مركبة خاصة" | null
 */
export function getNinjaVehicleOwnershipAr(acc: Partial<NinjaAccountResponse>): string | null {
  if (acc.vehicleOwnershipAr) return acc.vehicleOwnershipAr;
  if (acc.vehicleOwnership === "Company") return "مركبة شركة";
  if (acc.vehicleOwnership === "Private") return "مركبة خاصة";
  if (acc.riderType === "InternalCar" || acc.riderType === "InternalMotorcycle") return "مركبة شركة";
  if (acc.riderType === "ExternalCar" || acc.riderType === "ExternalMotorcycle") return "مركبة خاصة";
  return null;
}

/**
 * Resolves vehicle type in Arabic: "سيارة" | "دباب" | null
 */
export function getNinjaVehicleTypeAr(acc: Partial<NinjaAccountResponse>): string | null {
  if (acc.vehicleTypeAr) return acc.vehicleTypeAr;
  if (acc.vehicleType === "Car") return "سيارة";
  if (acc.vehicleType === "Motorcycle") return "دباب";
  if (acc.riderType === "InternalCar" || acc.riderType === "ExternalCar") return "سيارة";
  if (acc.riderType === "InternalMotorcycle" || acc.riderType === "ExternalMotorcycle") return "دباب";
  return null;
}

export const ninjaPaths = {
  // Accounts & Lifecycle
  accounts: "/api/ninja/accounts",
  account: (accountId: string) => `/api/ninja/accounts/${encodeURIComponent(accountId)}`,
  status: (accountId: string) => `/api/ninja/accounts/${encodeURIComponent(accountId)}/status`,
  compare: "/api/ninja/accounts/compare",
  assign: (accountId: string) => `/api/ninja/accounts/${encodeURIComponent(accountId)}/assign`,
  return: (accountId: string) => `/api/ninja/accounts/${encodeURIComponent(accountId)}/return`,
  credentials: (accountId: string) => `/api/ninja/accounts/${encodeURIComponent(accountId)}/credentials`,
  assignmentDates: (accountId: string, assignmentId: string) =>
    `/api/ninja/accounts/${encodeURIComponent(accountId)}/assignments/${encodeURIComponent(assignmentId)}/dates`,

  // Daily Imports (raw .xlsx)
  importPerformance: "/api/ninja/performance/import",
  importDeductions: "/api/ninja/deductions/import",

  // Raw Daily Records
  performance: "/api/ninja/performance",
  deductions: "/api/ninja/deductions",

  // Aggregate Reports
  performanceReport: "/api/ninja/reports/performance",
  dailyReport: "/api/ninja/reports/daily",
  riderReport: "/api/ninja/reports/riders",

  // Sheet Checkup Services (saved uploads & review)
  sheetUpdates: "/api/ninja/accounts/sheet-updates",
  sheetUpdate: (uploadId: string) => `/api/ninja/accounts/sheet-updates/${encodeURIComponent(uploadId)}`,
  sheetUpdateRows: (uploadId: string) => `/api/ninja/accounts/sheet-updates/${encodeURIComponent(uploadId)}/rows`,
  sheetUpdateNote: (uploadId: string) => `/api/ninja/accounts/sheet-updates/${encodeURIComponent(uploadId)}/note`,
} as const;

// -------------------------------------------------------------
// Core Problem Details & Errors
// -------------------------------------------------------------

export interface ApiProblem {
  title?: string;
  detail?: string;
  status?: number;
  type?: string;
  instance?: string;
  errorCode?: string;
  code?: string;
  correlationId?: string;
  field?: string;
  details?: unknown;
  errors?: Record<string, string[]>;
  issues?: NinjaImportIssue[];
  [key: string]: unknown;
}

export type NinjaProblemDetails = ApiProblem;

export class NinjaApiError extends Error {
  status: number;
  problem: ApiProblem;
  correlationId?: string;
  code?: string;

  constructor(status: number, problem: ApiProblem) {
    const message = problem.detail || problem.title || `Ninja API request failed with status ${status}`;
    super(message);
    this.name = "NinjaApiError";
    this.status = status;
    this.problem = problem;
    this.correlationId = problem.correlationId;
    this.code = (problem.errorCode || problem.code) as string | undefined;
  }
}

// -------------------------------------------------------------
// Person & Account Types
// -------------------------------------------------------------

export interface NinjaPersonResponse {
  employeeId: Guid;
  nameAr: string;
  nameEn: string | null;
  /** Employee primary phone; independent of the Ninja account login phone. */
  phoneNumber: string | null;
  iqamaNo: string | null;
}

export interface NinjaAccountResponse {
  accountId: Guid;
  /** Backward-compatible alias for accountId */
  id?: Guid;
  /** External Captain ID. Keep it as text, including leading zeroes. */
  captainId: string;
  status: string; // Available, Assigned, Suspended, Retired, Archived
  ownerEmployeeId: Guid | null;
  actualRiderProfileId: Guid | null;
  phoneNumber: string | null;
  hasPassword: boolean;
  password?: string | null;
  currentPassword?: string | null;
  passwordChangeAllowedAtUtc: UtcTimestamp | null;
  rowVersion: string; // Account concurrency token (Base64)
  currentAssignmentId: Guid | null;
  assignmentRowVersion: string | null; // Assignment concurrency token (Base64)
  owner: NinjaPersonResponse | null;
  actualRider: NinjaPersonResponse | null;
  statusReason: string | null;
  code: string;
  operatingCityId: Guid;
  sponsorId: Guid | null;
  isOperationallyBlocked: boolean;
  operationalBlockReason: string | null;

  // Enriched observations from the latest saved sheet checkup (Found row)
  latestSheetStatus: string | null;
  latestSheetSuspended: boolean | null;
  latestSheetUploadId: Guid | null;
  sheetUpdatedAtUtc: UtcTimestamp | null;

  // Optional legacy fields for backward compatibility
  externalAccountId?: string | null;
  ownerRiderProfileId?: Guid | null;
  ownerRiderNameAr?: string | null;
  ownerRiderNameEn?: string | null;
  actualEmployeeId?: string | null;
  actualRiderNameAr?: string | null;
  actualRiderNameEn?: string | null;
  operatingCityNameAr?: string | null;
  operatingCityNameEn?: string | null;
  sponsorNameAr?: string | null;
  sponsorNameEn?: string | null;
  paymentModel?: string | null;
  riderType?: NinjaRiderType | string | null;
  assignmentEffectiveFrom?: DateOnly | null;

  // Monthly Usage
  monthlyUsageStatus?: "Used" | "Unused";
  usageMonth?: string;

  // Assignment & Operational Validity
  isAssigned?: boolean;
  assignmentStatus?: "Assigned" | "Unassigned" | string;
  assignmentStatusAr?: "مسند" | "غير مسند" | string;

  isValidForOperation?: boolean;
  operationalValidity?: "Valid" | "Invalid" | string;
  operationalValidityAr?: "صالح" | "غير صالح" | string;

  vehicleOwnership?: "Company" | "Private" | string | null;
  vehicleOwnershipAr?: "مركبة شركة" | "مركبة خاصة" | string | null;
  vehicleType?: "Car" | "Motorcycle" | string | null;
  vehicleTypeAr?: "سيارة" | "دباب" | string | null;

  // Monthly Attendance & Operational Qualification
  attendance?: NinjaAccountAttendanceEvaluation | null;
}

export interface NinjaAccountAttendanceEvaluation {
  month?: string | null;
  firstDeliveryDate?: string | null;
  evaluatedFrom?: string | null;
  evaluatedThrough?: string | null;
  evaluatedDays?: number;
  qualifiedDays?: number;
  requiredQualifiedDays?: number;
  absentDays?: number;
  shortHoursDays?: number;
  attendanceRate?: number; // e.g. 0.95 means 95%
  protectedDayAbsences?: string[]; // array of dates YYYY-MM-DD
  reasons?: string[]; // e.g. ["LeaveOnProtectedDay"]
  status?: "Valid" | "Invalid" | string;
}

export interface NinjaAccountStatusRequest {
  status: "Active" | "Suspended" | "Retired" | "Archived";
  rowVersion: string; // Account rowVersion
  reason?: string | null;
}

// -------------------------------------------------------------
// Lifecycle: Assign, Return, Credentials
// -------------------------------------------------------------

export interface PreviousDayUsageInput {
  assignmentIds: string[];
  figures: PlatformAccountDayUsageInput;
  rowVersion: string | null;
  usageRowVersions: Record<string, string | null>;
}

export interface NinjaAssignRequest {
  actualRiderProfileId: Guid;
  effectiveFrom: DateOnly;
  phoneNumber: string;
  riderType: NinjaRiderType | string;
  paymentModel: NinjaPaymentModel | string;
  newPassword?: string | null;
  reason?: string | null;
  wasBackdated?: boolean;
  backdatedReason?: string | null;
  previousDayUsages?: PreviousDayUsageInput[] | null;
}

export interface PlatformAccountDayUsageInput {
  ordersCount?: number | null;
  workingHours?: number | null;
  collectedAmount?: number | null;
  deductionsAmount?: number | null;
  totalValidOffers?: number | null;
  declinedOffers?: number | null;
  missedOffers?: number | null;
}

export interface NinjaReturnRequest {
  effectiveTo: DateOnly;
  phoneNumber: string;
  newPassword: string | null;
  reason: string;
  /** Assignment token: account.assignmentRowVersion or lifecycle.assignment.rowVersion */
  rowVersion: string;
  status?: "Ended" | "Cancelled" | string;
  dayUsage?: PlatformAccountDayUsageInput | null;
}

export interface NinjaCredentialRequest {
  newPassword: string | null;
  phoneNumber: string | null;
  reason: string;
  /** Account token: account.rowVersion or credentials.rowVersion */
  rowVersion: string;
}

export interface NinjaPasswordNotification {
  code: "ninja.password_cooldown" | string;
  messageAr: string;
  messageEn: string;
  changeAllowedAtUtc: UtcTimestamp;
}

export interface NinjaCredentialResponse {
  accountId: Guid;
  phoneNumber: string | null;
  hasPassword: boolean;
  password?: string | null;
  currentPassword?: string | null;
  passwordChanged: boolean;
  phoneChanged?: boolean;
  passwordChangeAllowedAtUtc: UtcTimestamp | null;
  notification: NinjaPasswordNotification | null;
  rowVersion: string; // Concurrency token
}

export interface NinjaAssignmentResponse {
  id: Guid;
  accountId: Guid;
  paymentModel: string;
  riderType?: NinjaRiderType | string | null;
  actualRiderProfileId: Guid;
  actualEmployeeId: Guid;
  actualRiderNameAr: string;
  actualRiderNameEn: string | null;
  effectiveFrom: DateOnly;
  effectiveTo: DateOnly | null;
  status: string;
  startReason: string | null;
  endReason: string | null;
  wasBackdated: boolean;
  backdatedReason: string | null;
  assignedByUserId: Guid;
  endedByUserId: Guid | null;
  rowVersion: string;
}

export type NinjaAssignmentSnapshot = NinjaAssignmentResponse;

export interface NinjaLifecycleResponse {
  account?: NinjaAccountResponse;
  assignment: NinjaAssignmentResponse;
  credentials: NinjaCredentialResponse;
}

export interface NinjaUpdateAssignmentDatesRequest {
  effectiveFrom: DateOnly;
  effectiveTo: DateOnly | null;
  reason: string;
  rowVersion: string;
}

export interface NinjaUpdateAssignmentDatesResponse {
  accountId: Guid;
  assignmentId: Guid;
  effectiveFrom: DateOnly;
  effectiveTo: DateOnly | null;
  status: string;
  rowVersion: string;
}

// -------------------------------------------------------------
// Daily Performance & Deductions Imports (raw .xlsx)
// -------------------------------------------------------------

export interface NinjaImportIssue {
  rowNumber: number; // 1-indexed Excel row; 0 = file-level problem
  captainId: string | null;
  message: string;
}

export interface NinjaImportResponse {
  importId: Guid | null;
  reportDate: DateOnly;
  importedRows: number;
  skippedRows: number;
  /** Nonempty issues array means the file was rejected and no rows were saved */
  issues: NinjaImportIssue[];
}

// -------------------------------------------------------------
// Raw Daily Records
// -------------------------------------------------------------

export interface NinjaPerformanceResponse {
  id: Guid;
  accountId: Guid;
  assignmentId?: Guid | null;
  riderProfileId: Guid;
  reportDate: DateOnly;
  captainId: string;
  totalOrders: number;
  totalWorkingHours: number;
}

export interface NinjaDeductionResponse {
  id: Guid;
  accountId: Guid;
  assignmentId?: Guid | null;
  riderProfileId: Guid;
  reportDate: DateOnly;
  captainId: string;
  totalCollectedAmountAtDelivery: number;
  totalCollectedAmount?: number; // legacy alias
  /** Signed value; negative deductions remain negative */
  totalDeductions: number;
}

// -------------------------------------------------------------
// Pagination & Common Queries
// -------------------------------------------------------------

export interface NinjaPage<T> {
  items: T[];
  page: number;
  pageSize: number;
}

export interface NinjaReportQuery {
  from: DateOnly; // YYYY-MM-DD
  to: DateOnly; // YYYY-MM-DD
  accountId?: Guid;
  riderId?: Guid;
  page?: number;
  pageSize?: number;
}

export type NinjaReportFilterParams = NinjaReportQuery;

// -------------------------------------------------------------
// Aggregate Performance Reports
// -------------------------------------------------------------

export interface NinjaReportMetrics {
  performanceRecords: number;
  deductionRecords: number;
  totalOrders: number;
  totalWorkingHours: number;
  ordersPerWorkingHour: number | null;
  totalCollectedAmountAtDelivery: number;
  totalDeductions: number;
}

export interface NinjaPerformanceReport {
  from: DateOnly;
  to: DateOnly;
  accountId: Guid | null;
  riderId: Guid | null;
  daysWithPerformance: number;
  daysWithDeductions: number;
  accountsWithData: number;
  ridersWithData: number;
  metrics: NinjaReportMetrics;
}

export interface NinjaDailySponsorReport {
  sponsorId?: Guid | string | null;
  sponsorNameAr?: string | null;
  sponsorNameEn?: string | null;
  metrics?: NinjaReportMetrics | null;
}

export interface NinjaDailyReport {
  date: DateOnly;
  metrics: NinjaReportMetrics;
  sponsors?: NinjaDailySponsorReport[];
}

export interface NinjaRiderReport {
  riderProfileId: Guid;
  rider: NinjaPersonResponse | null;
  accountsWithData: number;
  daysWithPerformance: number;
  daysWithDeductions: number;
  metrics: NinjaReportMetrics;
}

// -------------------------------------------------------------
// Account Comparison Workbook Upload (POST /api/ninja/accounts/compare)
// -------------------------------------------------------------

export interface NinjaAccountSheetRow {
  rowNumber: number;
  captainId: string;
  ownerName: string;
  city: string;
  ownerNationalId: string;
}

export interface NinjaComparisonSystemAccount {
  accountId: Guid;
  captainId: string;
  accountCode: string;
  status: string;
  ownerEmployeeId: Guid | null;
  ownerNationalId: string | null;
  ownerNameAr: string | null;
  ownerNameEn: string | null;
  operatingCityId: Guid;
  cityCode: string | null;
  cityNameAr: string | null;
  cityNameEn: string | null;
}

export interface NinjaAccountDifference {
  field: "ownerNationalId" | "ownerName" | "city";
  sheetValue: string | null;
  systemValue: string | null;
}

export interface NinjaComparedAccount {
  sheet: NinjaAccountSheetRow;
  system: NinjaComparisonSystemAccount;
  differences: NinjaAccountDifference[];
}

export interface NinjaSheetOnlyAccount {
  sheet: NinjaAccountSheetRow;
  possibleSystemAccounts: NinjaComparisonSystemAccount[];
  possibleSystemAccountCount: number;
}

export interface NinjaAccountComparisonSummary {
  sheetAccounts: number;
  systemAccounts: number;
  matchingAccounts: number;
  differentAccounts: number;
  sheetOnlyAccounts: number;
  systemOnlyAccounts: number;
}

export interface NinjaAccountComparisonResponse {
  fileName: string;
  comparedAtUtc: UtcTimestamp;
  comparisonCompleted: boolean;
  ignoredFooterRows: number;
  summary: NinjaAccountComparisonSummary;
  matchingAccounts: NinjaComparedAccount[];
  differentAccounts: NinjaComparedAccount[];
  sheetOnlyAccounts: NinjaSheetOnlyAccount[];
  systemOnlyAccounts: NinjaComparisonSystemAccount[];
  issues: NinjaImportIssue[];
}

// -------------------------------------------------------------
// Sheet Checkup Services (ninja.NinjaAccountUpdateUploads / Rows)
// -------------------------------------------------------------

export interface NinjaAccountUpdatePage<T> extends NinjaPage<T> {
  totalCount: number;
}

export interface NinjaAccountUpdateSummary {
  totalRows: number;
  foundRows: number;
  notFoundRows: number;
  ambiguousRows: number;
  rowsWithProblems: number;
  cityMismatchRows: number;
  iqamaProblemRows: number;
  naqlBlockedRows: number;
  suspendedRows: number;
}

export interface NinjaAccountUpdateUploadResponse {
  id: Guid;
  fileName: string;
  sheetName: string;
  contentHash: string;
  note: string | null;
  createdAtUtc: UtcTimestamp;
  createdByUserId: Guid | null;
  updatedAtUtc: UtcTimestamp | null;
  rowVersion: string; // Upload rowVersion for editing note
  ignoredFooterRows: number;
  summary: NinjaAccountUpdateSummary;
  sheetStatuses: { sheetStatus: string; count: number }[];
}

export interface NinjaAccountUpdateSystemAccount {
  accountId: Guid;
  captainId: string;
  accountCode: string;
  status: string;
  ownerEmployeeId: Guid | null;
  ownerNameAr: string | null;
  ownerNameEn: string | null;
  ownerIqamaNo: string | null;
  ownerStatus: string | null;
  operatingCityId: Guid;
  cityCode: string | null;
  cityNameAr: string | null;
  cityNameEn: string | null;
}

export interface NinjaAccountProblem {
  code: string;
  messageAr: string;
  messageEn: string;
}

export interface NinjaAccountUpdateRowResponse {
  id: Guid;
  sourceRowNumber: number;
  captainId: string;
  sheetOwnerName: string;
  sheetCity: string;
  sheetIqamaNo: string;
  sheetStatus: string;
  sheetSuspended: boolean | null;
  matchStatus: "Found" | "NotFound" | "Ambiguous";
  system: NinjaAccountUpdateSystemAccount | null;
  problems: NinjaAccountProblem[];
}

export interface NinjaAccountUpdateRowQuery {
  matchStatus?: "Found" | "NotFound" | "Ambiguous";
  sheetStatus?: string;
  problemsOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface NinjaAccountUpdateNoteRequest {
  note: string | null;
  rowVersion: string;
}

// -------------------------------------------------------------
// Framework-Neutral Client (Optional Helper)
// -------------------------------------------------------------

export type AuthenticatedFetch = (path: string, init?: RequestInit) => Promise<Response>;

export function createNinjaClient(send: AuthenticatedFetch) {
  async function handleResponse<T>(res: Response): Promise<T> {
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json().catch(() => null) : null;

    if (!res.ok) {
      const problem = (data as ApiProblem) || {};
      throw new NinjaApiError(res.status, problem);
    }

    return data as T;
  }

  return {
    async getAccounts(params?: { page?: number; pageSize?: number }): Promise<NinjaPage<NinjaAccountResponse>> {
      const q = new URLSearchParams();
      if (params?.page) q.set("page", String(params.page));
      if (params?.pageSize) q.set("pageSize", String(params.pageSize));
      const qs = q.toString();
      const res = await send(`${ninjaPaths.accounts}${qs ? `?${qs}` : ""}`, { method: "GET" });
      return handleResponse<NinjaPage<NinjaAccountResponse>>(res);
    },

    async getAccount(accountId: string): Promise<NinjaAccountResponse> {
      const res = await send(ninjaPaths.account(accountId), { method: "GET" });
      return handleResponse<NinjaAccountResponse>(res);
    },

    async setAccountStatus(accountId: string, request: NinjaAccountStatusRequest): Promise<NinjaAccountResponse> {
      const res = await send(ninjaPaths.status(accountId), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      return handleResponse<NinjaAccountResponse>(res);
    },

    async compareAccounts(file: File): Promise<NinjaAccountComparisonResponse> {
      const body = new FormData();
      body.append("file", file, file.name);
      const res = await send(ninjaPaths.compare, { method: "POST", body });
      return handleResponse<NinjaAccountComparisonResponse>(res);
    },

    async assignAccount(accountId: string, request: NinjaAssignRequest): Promise<NinjaLifecycleResponse> {
      const res = await send(ninjaPaths.assign(accountId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      return handleResponse<NinjaLifecycleResponse>(res);
    },

    async returnAccount(accountId: string, request: NinjaReturnRequest): Promise<NinjaLifecycleResponse> {
      const res = await send(ninjaPaths.return(accountId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      return handleResponse<NinjaLifecycleResponse>(res);
    },

    async updateCredentials(accountId: string, request: NinjaCredentialRequest): Promise<NinjaCredentialResponse> {
      const res = await send(ninjaPaths.credentials(accountId), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      return handleResponse<NinjaCredentialResponse>(res);
    },

    async importPerformance(reportDate: string, file: File, signal?: AbortSignal): Promise<NinjaImportResponse> {
      const form = new FormData();
      form.append("reportDate", reportDate);
      form.append("file", file, file.name);
      const res = await send(ninjaPaths.importPerformance, { method: "POST", body: form, signal });
      return handleResponse<NinjaImportResponse>(res);
    },

    async importDeductions(reportDate: string, file: File, signal?: AbortSignal): Promise<NinjaImportResponse> {
      const form = new FormData();
      form.append("reportDate", reportDate);
      form.append("file", file, file.name);
      const res = await send(ninjaPaths.importDeductions, { method: "POST", body: form, signal });
      return handleResponse<NinjaImportResponse>(res);
    },

    async getPerformance(params: NinjaReportQuery): Promise<NinjaPage<NinjaPerformanceResponse>> {
      const q = new URLSearchParams();
      q.set("from", params.from);
      q.set("to", params.to);
      if (params.accountId) q.set("accountId", params.accountId);
      if (params.riderId) q.set("riderId", params.riderId);
      if (params.page) q.set("page", String(params.page));
      if (params.pageSize) q.set("pageSize", String(params.pageSize));
      const res = await send(`${ninjaPaths.performance}?${q.toString()}`, { method: "GET" });
      return handleResponse<NinjaPage<NinjaPerformanceResponse>>(res);
    },

    async getDeductions(params: NinjaReportQuery): Promise<NinjaPage<NinjaDeductionResponse>> {
      const q = new URLSearchParams();
      q.set("from", params.from);
      q.set("to", params.to);
      if (params.accountId) q.set("accountId", params.accountId);
      if (params.riderId) q.set("riderId", params.riderId);
      if (params.page) q.set("page", String(params.page));
      if (params.pageSize) q.set("pageSize", String(params.pageSize));
      const res = await send(`${ninjaPaths.deductions}?${q.toString()}`, { method: "GET" });
      return handleResponse<NinjaPage<NinjaDeductionResponse>>(res);
    },

    async getPerformanceReport(params: NinjaReportQuery): Promise<NinjaPerformanceReport> {
      const q = new URLSearchParams();
      q.set("from", params.from);
      q.set("to", params.to);
      if (params.accountId) q.set("accountId", params.accountId);
      if (params.riderId) q.set("riderId", params.riderId);
      const res = await send(`${ninjaPaths.performanceReport}?${q.toString()}`, { method: "GET" });
      return handleResponse<NinjaPerformanceReport>(res);
    },

    async getDailyReport(params: NinjaReportQuery): Promise<NinjaPage<NinjaDailyReport>> {
      const q = new URLSearchParams();
      q.set("from", params.from);
      q.set("to", params.to);
      if (params.accountId) q.set("accountId", params.accountId);
      if (params.riderId) q.set("riderId", params.riderId);
      if (params.page) q.set("page", String(params.page));
      if (params.pageSize) q.set("pageSize", String(params.pageSize));
      const res = await send(`${ninjaPaths.dailyReport}?${q.toString()}`, { method: "GET" });
      return handleResponse<NinjaPage<NinjaDailyReport>>(res);
    },

    async getRiderReport(params: NinjaReportQuery): Promise<NinjaPage<NinjaRiderReport>> {
      const q = new URLSearchParams();
      q.set("from", params.from);
      q.set("to", params.to);
      if (params.accountId) q.set("accountId", params.accountId);
      if (params.riderId) q.set("riderId", params.riderId);
      if (params.page) q.set("page", String(params.page));
      if (params.pageSize) q.set("pageSize", String(params.pageSize));
      const res = await send(`${ninjaPaths.riderReport}?${q.toString()}`, { method: "GET" });
      return handleResponse<NinjaPage<NinjaRiderReport>>(res);
    },

    async uploadSheetUpdate(file: File, note?: string): Promise<NinjaAccountUpdateUploadResponse> {
      const body = new FormData();
      body.append("file", file, file.name);
      if (note !== undefined && note !== null) body.append("note", note);
      const res = await send(ninjaPaths.sheetUpdates, { method: "POST", body });
      return handleResponse<NinjaAccountUpdateUploadResponse>(res);
    },

    async getSheetUploads(page = 1, pageSize = 50): Promise<NinjaAccountUpdatePage<NinjaAccountUpdateUploadResponse>> {
      const res = await send(`${ninjaPaths.sheetUpdates}?page=${page}&pageSize=${pageSize}`, { method: "GET" });
      return handleResponse<NinjaAccountUpdatePage<NinjaAccountUpdateUploadResponse>>(res);
    },

    async getSheetUpload(uploadId: string): Promise<NinjaAccountUpdateUploadResponse> {
      const res = await send(ninjaPaths.sheetUpdate(uploadId), { method: "GET" });
      return handleResponse<NinjaAccountUpdateUploadResponse>(res);
    },

    async getSheetRows(uploadId: string, query: NinjaAccountUpdateRowQuery = {}): Promise<NinjaAccountUpdatePage<NinjaAccountUpdateRowResponse>> {
      const q = new URLSearchParams();
      if (query.matchStatus) q.set("matchStatus", query.matchStatus);
      if (query.sheetStatus) q.set("sheetStatus", query.sheetStatus);
      if (query.problemsOnly !== undefined) q.set("problemsOnly", String(query.problemsOnly));
      if (query.page) q.set("page", String(query.page));
      if (query.pageSize) q.set("pageSize", String(query.pageSize));
      const qs = q.toString();
      const res = await send(`${ninjaPaths.sheetUpdateRows(uploadId)}${qs ? `?${qs}` : ""}`, { method: "GET" });
      return handleResponse<NinjaAccountUpdatePage<NinjaAccountUpdateRowResponse>>(res);
    },

    async updateSheetNote(uploadId: string, request: NinjaAccountUpdateNoteRequest): Promise<NinjaAccountUpdateUploadResponse> {
      const res = await send(ninjaPaths.sheetUpdateNote(uploadId), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      return handleResponse<NinjaAccountUpdateUploadResponse>(res);
    },

    async updateAssignmentDates(
      accountId: string,
      assignmentId: string,
      request: NinjaUpdateAssignmentDatesRequest
    ): Promise<NinjaUpdateAssignmentDatesResponse> {
      const res = await send(ninjaPaths.assignmentDates(accountId, assignmentId), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      return handleResponse<NinjaUpdateAssignmentDatesResponse>(res);
    },
  };
}

export class NinjaApiClient {
  private origin: string;
  private getToken: () => string | Promise<string>;

  constructor(origin: string = "", getToken: () => string | Promise<string> = () => "") {
    this.origin = origin.replace(/\/$/, "");
    this.getToken = getToken;
  }

  private async fetch(path: string, init?: RequestInit): Promise<Response> {
    const token = await this.getToken();
    const headers = new Headers(init?.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", "application/json");
    return fetch(`${this.origin}${path}`, { ...init, headers });
  }

  get client() {
    return createNinjaClient(this.fetch.bind(this));
  }

  updateAssignmentDates(accountId: string, assignmentId: string, req: NinjaUpdateAssignmentDatesRequest) {
    return this.client.updateAssignmentDates(accountId, assignmentId, req);
  }
}
