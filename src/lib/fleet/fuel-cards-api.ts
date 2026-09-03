import { authFetch } from "../auth/api";

export type FuelProvider = "PetroApp" | "SayaraApp";
export type FuelCardIdentifierType = "InternalNumber" | "PlateNumber";

export const fuelProviderLabels: Record<FuelProvider, string> = {
  PetroApp: "شركة بترو اب",
  SayaraApp: "شركة سيارة اب",
};

export interface FuelCardCurrentRider {
  assignmentId: string;
  riderProfileId: string;
  employeeId: string;
  riderNameAr: string;
  riderNameEn: string | null;
  effectiveFrom: string;
  rowVersion: string;
}

export interface FuelCard {
  id: string;
  provider: FuelProvider;
  providerNameAr: string;
  identifierType: FuelCardIdentifierType;
  cardNumber: string;
  normalizedCardNumber: string;
  plateNumberText: string | null;
  currentRider: FuelCardCurrentRider | null;
  notes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface FuelCardAssignment {
  id: string;
  fuelCardId: string;
  cardNumber: string;
  riderProfileId: string;
  employeeId: string;
  riderNameAr: string;
  riderNameEn: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  assignmentReason: string;
  endReason: string | null;
  notes: string | null;
  assignedByUserId: string;
  closedByUserId: string | null;
  rowVersion: string;
}

export interface FuelCardPage {
  items: FuelCard[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface FuelMonthlyUsage {
  id: string;
  fuelCardId: string;
  provider: FuelProvider;
  providerNameAr: string;
  cardNumber: string;
  plateNumberText: string | null;
  reportMonth: string;
  riderProfileId: string;
  employeeId: string;
  riderNameAr: string;
  riderNameEn: string | null;
  totalLiters: number;
  totalAmount: number;
  amountBeforeTax: number | null;
  vatAmount: number | null;
  transactionCount: number | null;
  fuelType: string | null;
  firstTransactionAtUtc: string | null;
  lastTransactionAtUtc: string | null;
  reportThroughAtUtc: string | null;
  lastImportId: string;
  updatedAtUtc: string | null;
  rowVersion: string;
}

export interface FuelMonthlyUsagePage {
  items: FuelMonthlyUsage[];
  month: string;
  page: number;
  pageSize: number;
  totalCount: number;
  totalLiters: number;
  totalAmount: number;
}

export interface FuelImportRowError {
  rowNumber: number;
  cardNumber: string | null;
  code: string;
  message: string;
}

export interface FuelImportResult {
  importId: string;
  provider: FuelProvider;
  providerNameAr: string;
  reportMonth: string;
  reportThroughAtUtc: string | null;
  originalFileName: string;
  sha256Checksum: string;
  sourceRows: number;
  cardRows: number;
  createdCards: number;
  createdMonthlyRecords: number;
  updatedMonthlyRecords: number;
  unassignedCards: number;
  invalidRows: number;
  errors: FuelImportRowError[];
  importedAtUtc: string;
}

export interface FuelImportHistoryItem {
  id: string;
  importId: string;
  provider: FuelProvider;
  providerNameAr: string;
  reportMonth: string;
  reportThroughAtUtc: string | null;
  originalFileName: string;
  sha256Checksum: string;
  sourceRows: number;
  cardRows: number;
  createdCards: number;
  createdMonthlyRecords: number;
  updatedMonthlyRecords: number;
  unassignedCards: number;
  invalidRows: number;
  importedAtUtc: string;
  importedByUserId: string;
}

export async function getFuelCards(params?: {
  search?: string;
  provider?: FuelProvider;
  riderProfileId?: string;
  page?: number;
  pageSize?: number;
}): Promise<FuelCardPage> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.provider) query.set("provider", params.provider);
  if (params?.riderProfileId) query.set("riderProfileId", params.riderProfileId);
  if (params?.page) query.set("page", params.page.toString());
  if (params?.pageSize) query.set("pageSize", params.pageSize.toString());
  const str = query.toString();
  return authFetch<FuelCardPage>(`/api/fuel-cards${str ? `?${str}` : ""}`);
}

export async function getFuelCard(id: string): Promise<FuelCard> {
  return authFetch<FuelCard>(`/api/fuel-cards/${encodeURIComponent(id)}`);
}

export async function createFuelCard(payload: {
  provider: FuelProvider;
  cardNumber: string;
  plateNumberText?: string | null;
  notes?: string | null;
}): Promise<FuelCard> {
  return authFetch<FuelCard>("/api/fuel-cards", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إضافة بطاقة الوقود بنجاح",
  });
}

export async function getFuelCardAssignments(id: string): Promise<FuelCardAssignment[]> {
  return authFetch<FuelCardAssignment[]>(`/api/fuel-cards/${encodeURIComponent(id)}/assignments`);
}

export async function assignFuelCardRider(
  id: string,
  payload: {
    riderProfileId: string;
    effectiveFrom: string;
    reason: string;
    notes?: string | null;
  }
): Promise<FuelCardAssignment> {
  return authFetch<FuelCardAssignment>(`/api/fuel-cards/${encodeURIComponent(id)}/assignments`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إسناد بطاقة الوقود بنجاح",
  });
}

export async function stopFuelCardRider(
  id: string,
  payload: {
    effectiveTo: string;
    reason: string;
    rowVersion: string;
  }
): Promise<FuelCardAssignment> {
  return authFetch<FuelCardAssignment>(`/api/fuel-cards/${encodeURIComponent(id)}/stop-rider`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إنهاء إسناد البطاقة بنجاح",
  });
}

export async function getFuelMonthlyUsage(params: {
  month: string;
  search?: string;
  provider?: FuelProvider;
  riderProfileId?: string;
  page?: number;
  pageSize?: number;
}): Promise<FuelMonthlyUsagePage> {
  const query = new URLSearchParams();
  query.set("month", params.month);
  if (params.search) query.set("search", params.search);
  if (params.provider) query.set("provider", params.provider);
  if (params.riderProfileId) query.set("riderProfileId", params.riderProfileId);
  if (params.page) query.set("page", params.page.toString());
  if (params.pageSize) query.set("pageSize", params.pageSize.toString());
  return authFetch<FuelMonthlyUsagePage>(`/api/fuel-cards/monthly-usage?${query.toString()}`);
}

export async function importFuelSpreadsheet(
  file: File,
  expectedMonth?: string
): Promise<FuelImportResult> {
  const data = new FormData();
  data.append("File", file);
  if (expectedMonth) {
    data.append("ExpectedMonth", expectedMonth);
  }
  return authFetch<FuelImportResult>("/api/fuel-cards/imports", {
    method: "POST",
    body: data,
    notifySuccess: "تمت معالجة استيراد الملف بنجاح",
  });
}

export async function getFuelImportHistory(params?: {
  month?: string;
  provider?: FuelProvider;
}): Promise<FuelImportHistoryItem[]> {
  const query = new URLSearchParams();
  if (params?.month) query.set("month", params.month);
  if (params?.provider) query.set("provider", params.provider);
  const str = query.toString();
  return authFetch<FuelImportHistoryItem[]>(`/api/fuel-cards/imports${str ? `?${str}` : ""}`);
}

export function getRiyadhTodayDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
}
