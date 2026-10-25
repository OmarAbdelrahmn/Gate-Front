// src/lib/chefz/chefz-new-endpoints-contracts.ts
import type { Guid, DateOnly } from "./types";

export const CHEFZ_BASE_PATH = "/api/chefz";

export const chefzPaths = {
  orderSettlementPreview: `${CHEFZ_BASE_PATH}/settlements/orders/preview`,
  orderSettlementImport: `${CHEFZ_BASE_PATH}/settlements/orders/import`,
  orderSettlementGetImport: (importId: string) =>
    `${CHEFZ_BASE_PATH}/settlements/orders/imports/${encodeURIComponent(importId)}`,
  orderSettlementImportById: (importId: string) =>
    `${CHEFZ_BASE_PATH}/settlements/orders/imports/${encodeURIComponent(importId)}`,
  settlements: `${CHEFZ_BASE_PATH}/settlements`,
  accounts: (page = 1, pageSize = 50) =>
    `${CHEFZ_BASE_PATH}/accounts?${new URLSearchParams({ page: String(page), pageSize: String(pageSize) })}`,
  account: (accountId: string) => `${CHEFZ_BASE_PATH}/accounts/${encodeURIComponent(accountId)}`,
  accountStatus: (accountId: string) => `${CHEFZ_BASE_PATH}/accounts/${encodeURIComponent(accountId)}/status`,
  assignmentStartDate: (assignmentId: string) =>
    `${CHEFZ_BASE_PATH}/assignments/${encodeURIComponent(assignmentId)}/start-date`,
  performanceImport: `${CHEFZ_BASE_PATH}/performance/import`,
  settings: `${CHEFZ_BASE_PATH}/settings/performance`,
  reminders: (page = 1, pageSize = 50) =>
    `${CHEFZ_BASE_PATH}/reminders?${new URLSearchParams({ page: String(page), pageSize: String(pageSize) })}`,
  riderReport: (query: { accountId?: string; riderId?: string; year: number; month: number; half: number; halves: number }) => {
    const params = new URLSearchParams({
      year: String(query.year),
      month: String(query.month),
      half: String(query.half),
      halves: String(query.halves),
    });
    if (query.accountId) params.set("accountId", query.accountId);
    if (query.riderId) params.set("riderId", query.riderId);
    return `${CHEFZ_BASE_PATH}/reports/riders?${params}`;
  },
  allRidersReport: (query: { year: number; month: number; half: 1 | 2; halves?: number }) => {
    const params = new URLSearchParams({
      year: String(query.year),
      month: String(query.month),
      half: String(query.half),
      halves: String(query.halves ?? 1),
    });
    return `${CHEFZ_BASE_PATH}/reports/riders/all?${params}`;
  },
  walletPreview: `${CHEFZ_BASE_PATH}/settlements/preview`,
  walletSave: `${CHEFZ_BASE_PATH}/settlements`,
} as const;

export type {
  ChefzAllRidersReportQuery,
  ChefzRatingCounts,
  ChefzRiderAccountSummary,
  ChefzAllRidersItem,
  ChefzAllRidersReport,
} from "./types";

export interface ChefzProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errorCode?: string;
  correlationId?: string;
  field?: string;
  errors?: Record<string, string[]>;
}

export interface ChefzImportIssue {
  rowNumber: number; // Excel row, including row 1 for headers; 0 = file-level problem
  idNumber: string | null; // uploaded Driver ID
  message: string;
}

export interface ChefzOrderSettlementResponse {
  id: Guid; // Empty GUID during preview, real GUID when saved
  accountId: Guid;
  driverId: string; // Report Driver ID / reportIdNumber
  assignmentId: Guid;
  riderProfileId: Guid;
  riderName: string;
  riderIqamaNo?: string | null;
  riderIban?: string | null;
  accountType: "Freelancer" | "FullTime";
  periodFrom: DateOnly;
  periodTo: DateOnly;
  chargedFrom: DateOnly;
  chargedTo: DateOnly;
  assignedDays: number;
  sourceRows: number;
  deliveryFees: number;
  vatAmount: number;
  deliveryFeesAfterVat: number;
  tips: number;
  compensation: number;
  bonuses: number;
  deductions: number;
  netEarnings: number;
  companyAmount: number;
  riderAmount: number;
}

export interface ChefzRiderCycleSettlement {
  riderProfileId: Guid;
  riderName: string;
  riderIqamaNo?: string | null;
  riderIban?: string | null;
  periodFrom: DateOnly;
  periodTo: DateOnly;
  sourceRows: number;
  deliveryFees: number;
  vatAmount: number;
  deliveryFeesAfterVat: number;
  tips: number;
  compensation: number;
  bonuses: number;
  deductions: number;
  netEarnings: number;
  companyAmount: number;
  riderAmount: number;
  accounts: ChefzOrderSettlementResponse[];
}

export interface ChefzOrderSettlementImportResponse {
  importId: Guid | null;
  isPreview: boolean;
  alreadyImported: boolean;
  canSave: boolean;
  sourceRows: number;
  riders: ChefzRiderCycleSettlement[];
  netEarnings: number;
  companyAmount: number;
  riderAmount: number;
  issues: ChefzImportIssue[];
}

export type AuthenticatedFetch = (path: string, init: RequestInit) => Promise<Response>;

/**
 * Upload helper matching handoff specification.
 */
export async function uploadOrderSettlements(
  send: AuthenticatedFetch,
  file: File,
  mode: "preview" | "save",
  signal?: AbortSignal,
): Promise<ChefzOrderSettlementImportResponse> {
  const body = new FormData();
  body.append("file", file, file.name);
  const path =
    mode === "preview"
      ? chefzPaths.orderSettlementPreview
      : chefzPaths.orderSettlementImport;
  const response = await send(path, { method: "POST", body, signal });
  const payload = await response.json();
  if (!response.ok) {
    const problem = payload as ChefzProblemDetails;
    throw Object.assign(
      new Error(problem.detail ?? problem.title ?? "تعذر معالجة الملف."),
      {
        status: response.status,
        problem,
      }
    );
  }
  return payload as ChefzOrderSettlementImportResponse;
}
