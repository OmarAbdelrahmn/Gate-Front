/** Ninja HTTP contracts. Dates are YYYY-MM-DD; timestamps are ISO UTC strings. */
export type Guid = string;
export type DateOnly = string;
export type UtcTimestamp = string;

export interface NinjaAssignRequest {
  actualRiderProfileId: Guid;
  effectiveFrom: DateOnly;
  phoneNumber: string;
  newPassword?: string | null;
  reason?: string | null;
  wasBackdated?: boolean;
  backdatedReason?: string | null;
}

export interface NinjaReturnRequest {
  effectiveTo: DateOnly;
  phoneNumber: string;
  newPassword: string | null;
  reason: string;
  /** Assignment token: account.assignmentRowVersion or lifecycle.assignment.rowVersion. */
  rowVersion: string;
  status?: "Ended" | "Cancelled";
}

export interface NinjaCredentialRequest {
  newPassword: string | null;
  phoneNumber: string | null;
  reason: string;
  /** Account token: account.rowVersion or credentials.rowVersion. */
  rowVersion: string;
}

export interface NinjaPasswordNotification {
  code: "ninja.password_cooldown";
  messageAr: string;
  messageEn: string;
  changeAllowedAtUtc: UtcTimestamp;
}

export interface NinjaCredentialResponse {
  accountId: Guid;
  phoneNumber: string | null;
  hasPassword: boolean;
  passwordChanged: boolean;
  passwordChangeAllowedAtUtc: UtcTimestamp | null;
  notification: NinjaPasswordNotification | null;
  rowVersion: string;
}

export interface NinjaAssignmentResponse {
  id: Guid;
  accountId: Guid;
  paymentModel: string;
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

export interface NinjaLifecycleResponse {
  assignment: NinjaAssignmentResponse;
  credentials: NinjaCredentialResponse;
}

export interface NinjaAccountResponse {
  accountId: Guid;
  /** External Captain ID. Keep it as text, including leading zeroes. */
  captainId: string;
  status: string;
  ownerEmployeeId: Guid | null;
  actualRiderProfileId: Guid | null;
  phoneNumber: string | null;
  hasPassword: boolean;
  passwordChangeAllowedAtUtc: UtcTimestamp | null;
  rowVersion: string;
  currentAssignmentId: Guid | null;
  assignmentRowVersion: string | null;
  owner: NinjaPersonResponse | null;
  actualRider: NinjaPersonResponse | null;
  statusReason: string | null;
  code: string;
  operatingCityId: Guid;
  sponsorId: Guid | null;
  isOperationallyBlocked: boolean;
  operationalBlockReason: string | null;
  latestSheetStatus: string | null;
  latestSheetSuspended: boolean | null;
  latestSheetUploadId: Guid | null;
  sheetUpdatedAtUtc: UtcTimestamp | null;
}

export interface NinjaAccountUpdatePage<T> extends NinjaPage<T> { totalCount: number; }
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
  rowVersion: string;
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
  problems: { code: string; messageAr: string; messageEn: string }[];
}
export interface NinjaAccountUpdateRowQuery {
  matchStatus?: "Found" | "NotFound" | "Ambiguous";
  sheetStatus?: string;
  problemsOnly?: boolean;
  page?: number;
  pageSize?: number;
}
export interface NinjaAccountUpdateNoteRequest { note: string | null; rowVersion: string; }

export interface NinjaPersonResponse {
  employeeId: Guid;
  nameAr: string;
  nameEn: string | null;
  /** Employee primary phone; independent of the Ninja account login phone. */
  phoneNumber: string | null;
  iqamaNo: string | null;
}

export interface NinjaAccountStatusRequest {
  status: "Active" | "Suspended" | "Retired" | "Archived";
  rowVersion: string;
  reason?: string | null;
}

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

export interface NinjaDailyReport { date: DateOnly; metrics: NinjaReportMetrics; }
export interface NinjaRiderReport {
  riderProfileId: Guid;
  rider: NinjaPersonResponse | null;
  accountsWithData: number;
  daysWithPerformance: number;
  daysWithDeductions: number;
  metrics: NinjaReportMetrics;
}

export interface NinjaPage<T> {
  items: T[];
  page: number;
  pageSize: number;
}

export interface NinjaImportIssue {
  rowNumber: number;
  captainId: string | null;
  message: string;
}

export interface NinjaImportResponse {
  importId: Guid | null;
  reportDate: DateOnly;
  importedRows: number;
  skippedRows: number;
  /** HTTP 200 with issues means the file was rejected and nothing was saved. */
  issues: NinjaImportIssue[];
}

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
  /** Missing system accounts with the same registered owner. Review hints, never automatic matches. */
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
  /** Check this even on HTTP 200. False means invalid input / ambiguous system identifiers. */
  comparisonCompleted: boolean;
  ignoredFooterRows: number;
  summary: NinjaAccountComparisonSummary;
  matchingAccounts: NinjaComparedAccount[];
  differentAccounts: NinjaComparedAccount[];
  sheetOnlyAccounts: NinjaSheetOnlyAccount[];
  systemOnlyAccounts: NinjaComparisonSystemAccount[];
  issues: NinjaImportIssue[];
}

export interface NinjaPerformanceResponse {
  id: Guid;
  accountId: Guid;
  assignmentId: Guid;
  /** Actual rider on reportDate, independent of registered owner. */
  riderProfileId: Guid;
  reportDate: DateOnly;
  captainId: string;
  totalOrders: number;
  totalWorkingHours: number;
}

export interface NinjaDeductionResponse {
  id: Guid;
  accountId: Guid;
  assignmentId: Guid;
  riderProfileId: Guid;
  reportDate: DateOnly;
  captainId: string;
  totalCollectedAmountAtDelivery: number;
  /** Signed value; negative deductions must remain negative. */
  totalDeductions: number;
}

export interface NinjaReportQuery {
  from: DateOnly;
  to: DateOnly;
  accountId?: Guid;
  riderId?: Guid;
  page?: number;
  pageSize?: number;
}

export interface ApiProblem {
  /** Shared platform errors may expose additional detail keys at the top level. */
  [key: string]: unknown;
  title?: string;
  detail?: string;
  status?: number;
  type?: string;
  instance?: string;
  errorCode?: string;
  correlationId?: string;
  field?: string;
  details?: unknown;
  /** ASP.NET model-binding validation can use this instead of errorCode. */
  errors?: Record<string, string[]>;
}

export class NinjaApiError extends Error {
  constructor(public readonly status: number, public readonly problem: ApiProblem) {
    super(problem.detail ?? problem.title ?? `Request failed (${status})`);
    this.name = "NinjaApiError";
  }
}

/** Framework-neutral fetch adapter. baseUrl is the origin, without /api. */
export class NinjaApiClient {
  private readonly root: string;
  constructor(baseUrl: string, private readonly getAccessToken: () => string) {
    this.root = baseUrl.replace(/\/+$/, "");
  }

  private async request<T>(path: string, method = "GET", body?: object | FormData,
    signal?: AbortSignal): Promise<T> {
    const form = body instanceof FormData;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.getAccessToken()}`,
      Accept: "application/json",
    };
    if (body !== undefined && !form) headers["Content-Type"] = "application/json";
    const response = await fetch(`${this.root}/api/ninja/${path}`, {
      method, headers, signal,
      body: body === undefined ? undefined : form ? body as FormData : JSON.stringify(body),
    });
    const content = await response.text();
    let parsed: unknown;
    try { parsed = content ? JSON.parse(content) : undefined; }
    catch { parsed = undefined; }
    if (!response.ok) {
      const problem = parsed && typeof parsed === "object" ? parsed as ApiProblem : {};
      throw new NinjaApiError(response.status, problem);
    }
    if (parsed === undefined) throw new Error("API returned an empty or invalid JSON response");
    return parsed as T;
  }

  accounts(page = 1, pageSize = 50, signal?: AbortSignal): Promise<NinjaPage<NinjaAccountResponse>> {
    return this.request(`accounts?page=${page}&pageSize=${pageSize}`, "GET", undefined, signal);
  }
  uploadAccountSheet(file: File, note?: string, signal?: AbortSignal): Promise<NinjaAccountUpdateUploadResponse> {
    const body = new FormData();
    body.append("file", file, file.name);
    if (note !== undefined) body.append("note", note);
    return this.request("accounts/sheet-updates", "POST", body, signal);
  }
  accountSheetUploads(page = 1, pageSize = 50, signal?: AbortSignal): Promise<NinjaAccountUpdatePage<NinjaAccountUpdateUploadResponse>> {
    return this.request(`accounts/sheet-updates?page=${page}&pageSize=${pageSize}`, "GET", undefined, signal);
  }
  accountSheetUpload(uploadId: Guid, signal?: AbortSignal): Promise<NinjaAccountUpdateUploadResponse> {
    return this.request(`accounts/sheet-updates/${encodeURIComponent(uploadId)}`, "GET", undefined, signal);
  }
  accountSheetRows(uploadId: Guid, query: NinjaAccountUpdateRowQuery = {}, signal?: AbortSignal): Promise<NinjaAccountUpdatePage<NinjaAccountUpdateRowResponse>> {
    return this.request(`accounts/sheet-updates/${encodeURIComponent(uploadId)}/rows?${this.query(query)}`, "GET", undefined, signal);
  }
  updateAccountSheetNote(uploadId: Guid, body: NinjaAccountUpdateNoteRequest, signal?: AbortSignal): Promise<NinjaAccountUpdateUploadResponse> {
    return this.request(`accounts/sheet-updates/${encodeURIComponent(uploadId)}/note`, "PUT", body, signal);
  }
  account(accountId: Guid, signal?: AbortSignal): Promise<NinjaAccountResponse> {
    return this.request(`accounts/${encodeURIComponent(accountId)}`, "GET", undefined, signal);
  }
  setAccountStatus(accountId: Guid, body: NinjaAccountStatusRequest, signal?: AbortSignal): Promise<NinjaAccountResponse> {
    return this.request(`accounts/${encodeURIComponent(accountId)}/status`, "PUT", body, signal);
  }
  performanceReport(query: NinjaReportQuery, signal?: AbortSignal): Promise<NinjaPerformanceReport> {
    return this.request(`reports/performance?${this.query(query)}`, "GET", undefined, signal);
  }
  dailyReport(query: NinjaReportQuery, signal?: AbortSignal): Promise<NinjaPage<NinjaDailyReport>> {
    return this.request(`reports/daily?${this.query(query)}`, "GET", undefined, signal);
  }
  riderReport(query: NinjaReportQuery, signal?: AbortSignal): Promise<NinjaPage<NinjaRiderReport>> {
    return this.request(`reports/riders?${this.query(query)}`, "GET", undefined, signal);
  }
  compareAccounts(file: File, signal?: AbortSignal): Promise<NinjaAccountComparisonResponse> {
    const body = new FormData();
    body.append("file", file, file.name);
    return this.request("accounts/compare", "POST", body, signal);
  }
  assign(accountId: Guid, body: NinjaAssignRequest, signal?: AbortSignal): Promise<NinjaLifecycleResponse> {
    return this.request(`accounts/${encodeURIComponent(accountId)}/assign`, "POST", body, signal);
  }
  returnAccount(accountId: Guid, body: NinjaReturnRequest, signal?: AbortSignal): Promise<NinjaLifecycleResponse> {
    return this.request(`accounts/${encodeURIComponent(accountId)}/return`, "POST", body, signal);
  }
  credentials(accountId: Guid, body: NinjaCredentialRequest, signal?: AbortSignal): Promise<NinjaCredentialResponse> {
    return this.request(`accounts/${encodeURIComponent(accountId)}/credentials`, "PUT", body, signal);
  }
  private importFile(kind: "performance" | "deductions", reportDate: DateOnly, file: File,
    signal?: AbortSignal): Promise<NinjaImportResponse> {
    const body = new FormData();
    body.append("reportDate", reportDate);
    body.append("file", file, file.name);
    return this.request(`${kind}/import`, "POST", body, signal);
  }
  importPerformance(reportDate: DateOnly, file: File, signal?: AbortSignal): Promise<NinjaImportResponse> {
    return this.importFile("performance", reportDate, file, signal);
  }
  importDeductions(reportDate: DateOnly, file: File, signal?: AbortSignal): Promise<NinjaImportResponse> {
    return this.importFile("deductions", reportDate, file, signal);
  }
  private query(query: object): string {
    const values = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) values.set(key, String(value));
    }
    return values.toString();
  }
  performance(query: NinjaReportQuery, signal?: AbortSignal): Promise<NinjaPage<NinjaPerformanceResponse>> {
    return this.request(`performance?${this.query(query)}`, "GET", undefined, signal);
  }
  deductions(query: NinjaReportQuery, signal?: AbortSignal): Promise<NinjaPage<NinjaDeductionResponse>> {
    return this.request(`deductions?${this.query(query)}`, "GET", undefined, signal);
  }
}
