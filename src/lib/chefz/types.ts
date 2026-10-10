// src/lib/chefz/types.ts

export type Guid = string;
export type DateOnly = string; // YYYY-MM-DD
export type ChefzAccountType = "Freelancer" | "FullTime";

export interface ChefzPage<T> {
  items: T[];
  page: number;
  pageSize: number;
}

export interface ChefzAccountDetailsRequest {
  accountType: ChefzAccountType;
  reportIdNumber?: string | null;
  rowVersion?: string | null;
}

export interface ChefzAccount {
  accountId: Guid;
  externalAccountId: string;
  reportIdNumber: string;
  accountType: ChefzAccountType;
  commissionRate: number;
  dailyFee: number;
  hasPassword: boolean;
  rowVersion: string;
}

export interface ChefzPasswordRequest {
  password: string;
  reason: string;
}

export interface ChefzSettlementRequest {
  assignmentId: Guid;
  year: number;
  month: number;
  half: 1 | 2;
  startWalletAmount: number;
  endWalletAmount: number;
}

export interface ChefzSettlement {
  id: Guid;
  accountId: Guid;
  assignmentId: Guid;
  riderProfileId: Guid;
  accountType: ChefzAccountType;
  periodFrom: DateOnly;
  periodTo: DateOnly;
  chargedFrom: DateOnly;
  chargedTo: DateOnly;
  assignedDays: number;
  startWalletAmount: number;
  endWalletAmount: number;
  grossEarnings: number;
  commissionRate: number;
  dailyFee: number;
  companyAmount: number;
  riderAmount: number;
}

export interface ChefzPerformance {
  id: Guid;
  accountId: Guid;
  assignmentId: Guid;
  riderProfileId: Guid;
  reportDate: DateOnly;
  reportIdNumber: string;
  totalValidOffers: number;
  acceptedOffers: number;
  declinedOffers: number;
  missedOffers: number;
  acceptanceRate: number;
}

export interface ChefzImportIssue {
  rowNumber: number; // Excel row, including header; 0 = file-level problem
  idNumber: string | null;
  message: string;
}

export interface ChefzImportResult {
  importId: Guid | null;
  reportDate: DateOnly;
  importedRows: number;
  skippedRows: number;
  issues: ChefzImportIssue[];
}

export interface ApiProblem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errorCode?: string;
  correlationId?: string;
  field?: string;
  errors?: Record<string, string[]>;
}
