// src/lib/chefz/chefz-new-endpoints-contracts.ts
import type { Guid, DateOnly } from "./types";

export const chefzPaths = {
  orderSettlementPreview: "/api/chefz/settlements/orders/preview",
  orderSettlementImport: "/api/chefz/settlements/orders/import",
  orderSettlementGetImport: (importId: string) =>
    `/api/chefz/settlements/orders/imports/${encodeURIComponent(importId)}`,
  settlements: "/api/chefz/settlements",
} as const;

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
