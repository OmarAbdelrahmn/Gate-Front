import { authFetch } from "../auth/api";

export type FuelProvider = "PetroApp" | "SayaraApp";
export type FuelCardIdentifierType = "InternalNumber" | "PlateNumber";

export const fuelProviderLabels: Record<FuelProvider, string> = {
  PetroApp: "شركة بترو اب",
  SayaraApp: "شركة سيارة اب",
};

export const JEDDAH_OPERATING_CITY_ID = "019c18d5-62e1-7000-8000-000000000003";

export interface FuelCardCityFields {
  operatingCityId: string;
  operatingCityNameAr: string | null;
  operatingCityNameEn: string | null;
}

export interface OperatingCityOption {
  id: string;
  globalCityId?: string;
  code?: string;
  nameAr: string;
  nameEn?: string | null;
  status?: string;
  enabledFrom?: string | null;
  disabledAt?: string | null;
  rowVersion?: string;
}

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
  sponsorId: string;
  operatingCityId: string;
  operatingCityNameAr: string | null;
  operatingCityNameEn: string | null;
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
  riderProfileId: string | null;
  employeeId: string | null;
  riderNameAr: string | null;
  riderNameEn: string | null;
  needsReview: boolean;
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
  unassignedCount?: number;
  unassignedTotalLiters?: number;
  unassignedTotalAmount?: number;
}

export interface FuelUnassignedUsage {
  usageId: string;
  fuelCardId: string;
  provider: FuelProvider;
  cardNumber: string;
  plateNumberText: string | null;
  cardNotes: string | null;
  reportMonth: string;
  totalLiters: number;
  totalAmount: number;
  transactionCount: number | null;
  firstTransactionAtUtc: string | null;
  lastTransactionAtUtc: string | null;
  lastImportId: string;
  originalFileName: string;
  importedAtUtc: string;
  reviewReason: "card_not_assigned";
}

export interface FuelUnassignedUsagePage {
  items: FuelUnassignedUsage[];
  from: string;
  to: string;
  page: number;
  pageSize: number;
  totalCount: number;
  totalLiters: number;
  totalAmount: number;
}

export interface FuelCardPeriodMonth {
  reportMonth: string;
  totalLiters: number;
  totalAmount: number;
}

export interface FuelCardPeriodAssignment {
  assignmentId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  from: string;
  to: string;
}

export interface FuelCardPeriodRider {
  riderProfileId: string;
  employeeId: string;
  riderNameAr: string | null;
  riderNameEn: string | null;
  totalLiters: number;
  totalAmount: number;
  assignments: FuelCardPeriodAssignment[];
  usageMonths: FuelCardPeriodMonth[];
}

export interface FuelCardPeriodUsage {
  fuelCardId: string;
  provider: FuelProvider;
  providerNameAr: string;
  cardNumber: string;
  plateNumberText: string | null;
  totalLiters: number;
  totalAmount: number;
  riders: FuelCardPeriodRider[];
}

export interface FuelCardPeriodUsagePage {
  items: FuelCardPeriodUsage[];
  from: string;
  to: string;
  usageMonthFrom: string;
  usageMonthTo: string;
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
  operatingCityId?: string;
  page?: number;
  pageSize?: number;
}): Promise<FuelCardPage> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.provider) query.set("provider", params.provider);
  if (params?.riderProfileId) query.set("riderProfileId", params.riderProfileId);
  if (params?.operatingCityId) query.set("operatingCityId", params.operatingCityId);
  if (params?.page) query.set("page", params.page.toString());
  if (params?.pageSize) query.set("pageSize", params.pageSize.toString());
  const str = query.toString();
  return authFetch<FuelCardPage>(`/api/fuel-cards${str ? `?${str}` : ""}`);
}

export async function getAllFuelCards(params?: {
  search?: string;
  provider?: FuelProvider;
  riderProfileId?: string;
  operatingCityId?: string;
}): Promise<FuelCard[]> {
  const pageSize = 300;
  const firstRes = await getFuelCards({ ...params, page: 1, pageSize });
  let allItems = firstRes?.items || [];
  const totalCount = firstRes?.totalCount ?? allItems.length;

  if (totalCount > allItems.length) {
    const actualPageSize = firstRes?.pageSize || pageSize;
    const totalPages = Math.ceil(totalCount / actualPageSize);
    const pagePromises = [];
    for (let p = 2; p <= totalPages; p++) {
      pagePromises.push(
        getFuelCards({ ...params, page: p, pageSize: actualPageSize }).catch((err) => {
          console.warn(`Failed to fetch fuel cards page ${p}:`, err);
          return null;
        })
      );
    }
    const remainingResults = await Promise.all(pagePromises);
    for (const res of remainingResults) {
      if (res?.items) {
        allItems = allItems.concat(res.items);
      }
    }
  }

  return allItems;
}

export async function getFuelCard(id: string): Promise<FuelCard> {
  return authFetch<FuelCard>(`/api/fuel-cards/${encodeURIComponent(id)}`);
}

export async function createFuelCard(payload: {
  provider: FuelProvider;
  cardNumber: string;
  plateNumberText?: string | null;
  notes?: string | null;
  sponsorId: string;
  operatingCityId: string;
}): Promise<FuelCard> {
  return authFetch<FuelCard>("/api/fuel-cards", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إضافة بطاقة الوقود بنجاح",
  });
}

export async function updateFuelCardCity(
  id: string,
  payload: {
    operatingCityId: string;
    rowVersion: string;
  }
): Promise<FuelCard> {
  return authFetch<FuelCard>(`/api/fuel-cards/${encodeURIComponent(id)}/city`, {
    method: "PUT",
    body: JSON.stringify(payload),
    notifySuccess: "تم تحديث مدينة التشغيل للبطاقة بنجاح",
  });
}

export async function getOperatingCitiesCatalog(): Promise<OperatingCityOption[]> {
  return authFetch<OperatingCityOption[]>("/api/hr-catalogs/operating-cities");
}

export async function updateFuelCardSponsor(
  id: string,
  payload: {
    sponsorId: string;
    rowVersion: string;
  }
): Promise<FuelCard> {
  return authFetch<FuelCard>(`/api/fuel-cards/${encodeURIComponent(id)}/sponsor`, {
    method: "PUT",
    body: JSON.stringify(payload),
    notifySuccess: "تم تحديث كفيل بطاقة الوقود بنجاح",
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

export async function getAllFuelMonthlyUsage(params: {
  month: string;
  search?: string;
  provider?: FuelProvider;
  riderProfileId?: string;
}): Promise<FuelMonthlyUsage[]> {
  const pageSize = 300;
  const firstRes = await getFuelMonthlyUsage({ ...params, page: 1, pageSize });
  let allItems = firstRes?.items || [];
  const totalCount = firstRes?.totalCount ?? allItems.length;

  if (totalCount > allItems.length) {
    const actualPageSize = firstRes?.pageSize || pageSize;
    const totalPages = Math.ceil(totalCount / actualPageSize);
    const pagePromises = [];
    for (let p = 2; p <= totalPages; p++) {
      pagePromises.push(
        getFuelMonthlyUsage({ ...params, page: p, pageSize: actualPageSize }).catch((err) => {
          console.warn(`Failed to fetch fuel monthly usage page ${p}:`, err);
          return null;
        })
      );
    }
    const remainingResults = await Promise.all(pagePromises);
    for (const res of remainingResults) {
      if (res?.items) {
        allItems = allItems.concat(res.items);
      }
    }
  }

  return allItems;
}

export async function getFuelUnassignedUsage(params: {
  from: string;
  to: string;
  provider?: FuelProvider;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<FuelUnassignedUsagePage> {
  const query = new URLSearchParams();
  query.set("from", params.from);
  query.set("to", params.to);
  if (params.provider) query.set("provider", params.provider);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", params.page.toString());
  if (params.pageSize) query.set("pageSize", params.pageSize.toString());
  return authFetch<FuelUnassignedUsagePage>(`/api/fuel-cards/unassigned-usage?${query.toString()}`);
}

export async function getAllFuelUnassignedUsage(params: {
  from: string;
  to: string;
  provider?: FuelProvider;
  search?: string;
}): Promise<FuelUnassignedUsage[]> {
  const pageSize = 100;
  const firstRes = await getFuelUnassignedUsage({ ...params, page: 1, pageSize });
  let allItems = firstRes?.items || [];
  const totalCount = firstRes?.totalCount ?? allItems.length;

  if (totalCount > allItems.length) {
    const actualPageSize = firstRes?.pageSize || pageSize;
    const totalPages = Math.ceil(totalCount / actualPageSize);
    const pagePromises = [];
    for (let p = 2; p <= totalPages; p++) {
      pagePromises.push(
        getFuelUnassignedUsage({ ...params, page: p, pageSize: actualPageSize }).catch((err) => {
          console.warn(`Failed to fetch unassigned fuel usage page ${p}:`, err);
          return null;
        })
      );
    }
    const remainingResults = await Promise.all(pagePromises);
    for (const res of remainingResults) {
      if (res?.items) {
        allItems = allItems.concat(res.items);
      }
    }
  }

  return allItems;
}

export async function getFuelCardPeriodUsage(params: {
  from: string;
  to: string;
  provider?: FuelProvider;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<FuelCardPeriodUsagePage> {
  const query = new URLSearchParams();
  query.set("from", params.from);
  query.set("to", params.to);
  if (params.provider) query.set("provider", params.provider);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", params.page.toString());
  if (params.pageSize) query.set("pageSize", params.pageSize.toString());
  return authFetch<FuelCardPeriodUsagePage>(`/api/fuel-cards/period-usage?${query.toString()}`);
}

export async function getAllFuelCardPeriodUsage(params: {
  from: string;
  to: string;
  provider?: FuelProvider;
  search?: string;
}): Promise<FuelCardPeriodUsage[]> {
  const pageSize = 100;
  const firstRes = await getFuelCardPeriodUsage({ ...params, page: 1, pageSize });
  let allItems = firstRes?.items || [];
  const totalCount = firstRes?.totalCount ?? allItems.length;

  if (totalCount > allItems.length) {
    const actualPageSize = firstRes?.pageSize || pageSize;
    const totalPages = Math.ceil(totalCount / actualPageSize);
    const pagePromises = [];
    for (let p = 2; p <= totalPages; p++) {
      pagePromises.push(
        getFuelCardPeriodUsage({ ...params, page: p, pageSize: actualPageSize }).catch((err) => {
          console.warn(`Failed to fetch fuel card period usage page ${p}:`, err);
          return null;
        })
      );
    }
    const remainingResults = await Promise.all(pagePromises);
    for (const res of remainingResults) {
      if (res?.items) {
        allItems = allItems.concat(res.items);
      }
    }
  }

  return allItems;
}

export async function importFuelSpreadsheet(
  file: File,
  sponsorId: string,
  expectedMonth?: string,
  operatingCityId?: string
): Promise<FuelImportResult> {
  const data = new FormData();
  data.append("File", file);
  data.append("SponsorId", sponsorId);
  if (expectedMonth) {
    data.append("ExpectedMonth", expectedMonth);
  }
  if (operatingCityId) {
    data.append("operatingCityId", operatingCityId);
  }
  return authFetch<FuelImportResult>("/api/fuel-cards/imports", {
    method: "POST",
    body: data,
    notifySuccess: "تمت معالجة استيراد الملف بنجاح",
  });
}

export interface FuelCardNumberImportResult {
  importId?: string;
  sourceRows: number;
  createdCards: number;
  skippedCards?: number;
  invalidRows?: number;
  errors?: FuelImportRowError[];
  importedAtUtc?: string;
}

export async function validateFuelCardNumberImport(
  file: File,
  sponsorId: string,
  operatingCityId?: string
): Promise<FuelCardNumberImportResult> {
  const data = new FormData();
  data.append("file", file);
  data.append("sponsorId", sponsorId);
  if (operatingCityId) {
    data.append("operatingCityId", operatingCityId);
  }
  return authFetch<FuelCardNumberImportResult>("/api/fuel-cards/card-number-imports/validate", {
    method: "POST",
    body: data,
  });
}

export async function importFuelCardNumbers(
  file: File,
  sponsorId: string,
  operatingCityId?: string
): Promise<FuelCardNumberImportResult> {
  const data = new FormData();
  data.append("file", file);
  data.append("sponsorId", sponsorId);
  if (operatingCityId) {
    data.append("operatingCityId", operatingCityId);
  }
  return authFetch<FuelCardNumberImportResult>("/api/fuel-cards/card-number-imports", {
    method: "POST",
    body: data,
    notifySuccess: "تم استيراد أرقام البطاقات بنجاح",
  });
}

export interface BatchFuelCardPreviewRow {
  cardNumber: string;
  sponsorNumber?: string | null;
  companyName?: string | null;
  operatingCityId: string;
  isExisting?: boolean;
  isValid?: boolean;
  error?: string | null;
}

export interface BatchFuelCardImportResult {
  sourceRows: number;
  createdCards: number;
  skippedCards?: number;
  invalidRows?: number;
  previewRows?: BatchFuelCardPreviewRow[];
  errors?: FuelImportRowError[];
}

export async function validateBatchFuelCardsImport(
  file: File,
  operatingCityId?: string
): Promise<BatchFuelCardImportResult> {
  const data = new FormData();
  data.append("file", file);
  if (operatingCityId) {
    data.append("operatingCityId", operatingCityId);
  }
  return authFetch<BatchFuelCardImportResult>("/api/import/fuel-cards/validate", {
    method: "POST",
    body: data,
  });
}

export async function executeBatchFuelCardsImport(
  file: File,
  operatingCityId?: string
): Promise<BatchFuelCardImportResult> {
  const data = new FormData();
  data.append("file", file);
  if (operatingCityId) {
    data.append("operatingCityId", operatingCityId);
  }
  return authFetch<BatchFuelCardImportResult>("/api/import/fuel-cards", {
    method: "POST",
    body: data,
    notifySuccess: "تم استيراد بطاقات الوقود بنجاح",
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
