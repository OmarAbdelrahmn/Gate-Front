// ninja-api-contracts.ts
// Ninja Platform API Contracts and Framework-Neutral Client
// Reference date: 12 October 2026

export type Guid = string;
export type DateOnly = string; // Formatted YYYY-MM-DD

export const ninjaPaths = {
  accounts: "/api/ninja/accounts",
  account: (accountId: string) => `/api/ninja/accounts/${encodeURIComponent(accountId)}`,
  assign: (accountId: string) => `/api/ninja/accounts/${encodeURIComponent(accountId)}/assign`,
  return: (accountId: string) => `/api/ninja/accounts/${encodeURIComponent(accountId)}/return`,
  credentials: (accountId: string) => `/api/ninja/accounts/${encodeURIComponent(accountId)}/credentials`,
  importPerformance: "/api/ninja/performance/import",
  importDeductions: "/api/ninja/deductions/import",
  performance: "/api/ninja/performance",
  deductions: "/api/ninja/deductions",
} as const;

export interface NinjaProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  code?: string;
  errorCode?: string;
  correlationId?: string;
  field?: string;
  details?: string;
  errors?: Record<string, string[]>;
}

export interface NinjaNotification {
  code: string; // e.g. "ninja.password_cooldown"
  messageAr: string;
  messageEn: string;
  changeAllowedAtUtc: string; // UTC ISO string
}

export interface NinjaCredentialResponse {
  passwordChanged: boolean;
  phoneChanged: boolean;
  rowVersion: string; // Base64 token
  notification?: NinjaNotification | null;
}

export interface NinjaAssignmentSnapshot {
  id: Guid;
  rowVersion: string; // Base64 token
  actualRiderProfileId: Guid;
  actualEmployeeId?: string | null;
  actualRiderNameAr?: string | null;
  actualRiderNameEn?: string | null;
  effectiveFrom: DateOnly;
  effectiveTo?: DateOnly | null;
  status: string;
}

export interface NinjaAccountResponse {
  id: Guid;
  captainId: string; // Text, preserve leading zeroes
  code?: string;
  externalAccountId?: string | null;
  status: string; // Available, Assigned, Suspended, etc.
  ownerEmployeeId: string | null;
  ownerRiderProfileId: Guid;
  ownerRiderNameAr?: string | null;
  ownerRiderNameEn?: string | null;
  currentAssignmentId: Guid | null;
  actualRiderProfileId: Guid | null;
  actualEmployeeId?: string | null;
  actualRiderNameAr?: string | null;
  actualRiderNameEn?: string | null;
  phoneNumber: string | null;
  hasPassword: boolean;
  passwordChangeAllowedAtUtc: string | null; // UTC ISO string
  rowVersion: string; // Base64 account token
  assignmentRowVersion: string | null; // Base64 assignment token
  operatingCityId?: Guid | null;
  operatingCityNameAr?: string | null;
  operatingCityNameEn?: string | null;
  sponsorId?: Guid | null;
  sponsorNameAr?: string | null;
  sponsorNameEn?: string | null;
  paymentModel?: string | null;
  assignmentEffectiveFrom?: DateOnly | null;
}

export interface NinjaLifecycleResponse {
  account: NinjaAccountResponse;
  assignment: NinjaAssignmentSnapshot;
  credentials: NinjaCredentialResponse;
}

export interface NinjaAssignRequest {
  actualRiderProfileId: Guid;
  effectiveFrom: DateOnly; // YYYY-MM-DD
  phoneNumber: string;
  newPassword: string | null;
  reason?: string | null;
  wasBackdated: boolean;
  backdatedReason: string | null;
}

export interface NinjaReturnRequest {
  effectiveTo: DateOnly; // YYYY-MM-DD
  phoneNumber: string;
  newPassword: string | null;
  reason: string;
  rowVersion: string; // Assignment rowVersion!
  status: "Ended" | string;
}

export interface NinjaCredentialRequest {
  newPassword: string | null;
  phoneNumber: string | null;
  reason: string;
  rowVersion: string; // Account rowVersion!
}

export interface NinjaImportIssue {
  rowNumber: number; // 1-indexed Excel row; 0 = file-level problem
  captainId?: string | null;
  message: string;
}

export interface NinjaImportResponse {
  importId: Guid | null;
  importedRows: number;
  skippedRows: number;
  issues: NinjaImportIssue[];
}

export interface NinjaPerformanceResponse {
  id: Guid;
  accountId: Guid;
  captainId: string;
  reportDate: DateOnly; // YYYY-MM-DD
  riderProfileId: Guid;
  assignmentId?: Guid | null;
  totalOrders: number;
  totalWorkingHours: number;
}

export interface NinjaDeductionResponse {
  id: Guid;
  accountId: Guid;
  captainId: string;
  reportDate: DateOnly; // YYYY-MM-DD
  riderProfileId: Guid;
  assignmentId?: Guid | null;
  totalCollectedAmount: number;
  totalDeductions: number; // Signed, can be negative
}

export interface NinjaPage<T> {
  items: T[];
  page: number;
  pageSize: number;
}

export interface NinjaReportFilterParams {
  from: DateOnly; // YYYY-MM-DD inclusive
  to: DateOnly; // YYYY-MM-DD inclusive
  accountId?: Guid;
  riderId?: Guid; // Actual rider profile ID on that day
  page?: number;
  pageSize?: number;
}

export type AuthenticatedFetch = (path: string, init?: RequestInit) => Promise<Response>;

export class NinjaApiError extends Error {
  status: number;
  problem?: NinjaProblemDetails;
  correlationId?: string;
  code?: string;

  constructor(message: string, status: number, problem?: NinjaProblemDetails) {
    super(message);
    this.name = "NinjaApiError";
    this.status = status;
    this.problem = problem;
    this.correlationId = problem?.correlationId;
    this.code = problem?.code || problem?.errorCode;
  }
}

/**
 * Creates a framework-neutral client for Ninja endpoints.
 */
export function createNinjaClient(send: AuthenticatedFetch) {
  async function handleResponse<T>(res: Response): Promise<T> {
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json().catch(() => null) : null;

    if (!res.ok) {
      const problem = (data as NinjaProblemDetails) || {};
      const message =
        problem.detail ||
        problem.title ||
        `Ninja request failed with HTTP ${res.status}`;
      throw new NinjaApiError(message, res.status, problem);
    }

    return data as T;
  }

  return {
    async getAccounts(params?: { page?: number; pageSize?: number }): Promise<NinjaPage<NinjaAccountResponse>> {
      const q = new URLSearchParams();
      if (params?.page) q.set("page", String(params.page));
      if (params?.pageSize) q.set("pageSize", String(params.pageSize));
      const qs = q.toString();
      const res = await send(`${ninjaPaths.accounts}${qs ? `?${qs}` : ""}`, {
        method: "GET",
      });
      return handleResponse<NinjaPage<NinjaAccountResponse>>(res);
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

      const res = await send(ninjaPaths.importPerformance, {
        method: "POST",
        body: form,
        signal,
      });
      return handleResponse<NinjaImportResponse>(res);
    },

    async importDeductions(reportDate: string, file: File, signal?: AbortSignal): Promise<NinjaImportResponse> {
      const form = new FormData();
      form.append("reportDate", reportDate);
      form.append("file", file, file.name);

      const res = await send(ninjaPaths.importDeductions, {
        method: "POST",
        body: form,
        signal,
      });
      return handleResponse<NinjaImportResponse>(res);
    },

    async getPerformance(params: NinjaReportFilterParams): Promise<NinjaPage<NinjaPerformanceResponse>> {
      const q = new URLSearchParams();
      q.set("from", params.from);
      q.set("to", params.to);
      if (params.accountId) q.set("accountId", params.accountId);
      if (params.riderId) q.set("riderId", params.riderId);
      if (params.page) q.set("page", String(params.page));
      if (params.pageSize) q.set("pageSize", String(params.pageSize));

      const res = await send(`${ninjaPaths.performance}?${q.toString()}`, {
        method: "GET",
      });
      return handleResponse<NinjaPage<NinjaPerformanceResponse>>(res);
    },

    async getDeductions(params: NinjaReportFilterParams): Promise<NinjaPage<NinjaDeductionResponse>> {
      const q = new URLSearchParams();
      q.set("from", params.from);
      q.set("to", params.to);
      if (params.accountId) q.set("accountId", params.accountId);
      if (params.riderId) q.set("riderId", params.riderId);
      if (params.page) q.set("page", String(params.page));
      if (params.pageSize) q.set("pageSize", String(params.pageSize));

      const res = await send(`${ninjaPaths.deductions}?${q.toString()}`, {
        method: "GET",
      });
      return handleResponse<NinjaPage<NinjaDeductionResponse>>(res);
    },
  };
}
