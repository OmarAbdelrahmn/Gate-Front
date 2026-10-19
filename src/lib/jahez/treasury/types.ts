// src/lib/jahez/treasury/types.ts
// Treasury V3 API Contracts and Enums for Jahez Platform

export type Id = string;
export type DateOnly = string; // YYYY-MM-DD (Asia/Riyadh)
export type Instant = string;  // ISO 8601 UTC

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount?: number;
}

// ----------------------------------------------------------------------
// Enums
// ----------------------------------------------------------------------

export enum TreasuryLocation {
  Supervisor = 1, // عهدة المشرف (تشغيلية مشتركة)
  Central = 2,    // المركز / الصندوق الرئيسي
  Bank = 3,       // البنك
  PetroApp = 4,   // مقاصة بترو آب
}

export enum TreasuryPurpose {
  Settlement = 1, // تصفيات
  AccountFee = 2, // رسوم الحساب
  Combined = 3,   // مشترك / عام
}

export enum TreasuryDirections {
  InOnly = 1,  // وارد فقط
  OutOnly = 2, // صادر فقط
  Dual = 3,    // مزدوج (وارد وصادر)
}

export enum TreasuryEntryKind {
  Business = 1,   // حركة تشغيلية / تجارية
  Transfer = 2,   // تحويل داخلي
  Opening = 3,    // رصيد افتتاحي
  Adjustment = 4, // تسوية مالية
  Reversal = 5,   // عكس قيد
}

export enum TreasurySource {
  Fee = 1,       // رسوم حساب
  Operation = 2, // عملية تصفية
  Debt = 3,      // دين مرحل
  Movement = 4,  // حركة نقدية عادية
}

export enum PetroEvidenceKind {
  Funding = 1,   // دليل تمويل محفظة
  Statement = 2, // كشف حساب / بيان رصيد
}

export enum TreasuryHandoverStatus {
  Pending = 1,   // قيد المطابقة والاعتماد
  Confirmed = 2, // معتمد ومؤكد
  Cancelled = 3, // ملغى
}

export type PetroReconciliationStatus = "Matched" | "Difference" | "Unverified";

// ----------------------------------------------------------------------
// Accounts & Balances
// ----------------------------------------------------------------------

export interface TreasuryAccount {
  id: Id;
  code: string;
  nameAr: string;
  nameEn: string;
  parentId: Id | null;
  sponsorId: Id | null;
  location: TreasuryLocation;
  purpose: TreasuryPurpose;
  allowedDirections: TreasuryDirections;
  isPosting: boolean; // Leaf accounts vs aggregate
  isDefault: boolean;
  isActive: boolean;
  rowVersion: string;
  createdAtUtc: Instant;
  createdByUserId: Id | null;
  updatedAtUtc: Instant | null;
  updatedByUserId: Id | null;
}

export interface TreasuryAccountCreate {
  code: string;
  nameAr: string;
  nameEn: string;
  parentId: Id | null;
  sponsorId: Id | null;
  location: TreasuryLocation;
  purpose: TreasuryPurpose;
  allowedDirections: TreasuryDirections;
  isDefault?: boolean;
}

export interface TreasuryAccountUpdate {
  nameAr: string;
  nameEn: string;
  isActive: boolean;
  rowVersion: string;
}

export interface TreasuryBalance {
  subAccountId: Id;
  code: string;
  nameAr: string;
  parentId: Id | null;
  sponsorId: Id | null;
  location: TreasuryLocation;
  isPosting: boolean;
  balance: number;
}

// ----------------------------------------------------------------------
// Postings & Journal
// ----------------------------------------------------------------------

export interface TreasuryPosting {
  id: Id;
  subAccountId: Id;
  sponsorId: Id | null;
  moneyMovementId: Id | null;
  cashboxHandoverId: Id | null;
  batchId: string;
  revision: number;
  reversesPostingId: Id | null;
  kind: TreasuryEntryKind;
  amount: number; // positive = incoming (وارد), negative = outgoing (صادر)
  occurredAtUtc: Instant;
  actorUserId: Id | null;
  actorNameAr: string | null;
  reference: string;
  reason: string;
  createdAtUtc: Instant;
  createdByUserId: Id | null;
}

export interface TreasuryJournalRow {
  posting: TreasuryPosting;
  accountCode: string;
  accountNameAr: string;
  sponsorNameAr: string | null;
  driverId: string | null;
  driverNameAr: string | null;
  iqamaNo: string | null;
  platformAccountId: string | null;
  operationId: string | null;
  transferredDebtId: string | null;
  businessPurpose: number | null;
  isReconciled: boolean;
}

export interface TreasuryFilter {
  fromDate: DateOnly;
  toDate: DateOnly;
  subAccountId?: Id;
  sponsorId?: Id;
  purpose?: TreasuryPurpose;
  page?: number;
  pageSize?: number;
}

// ----------------------------------------------------------------------
// Transfers, Cash Entries & Reversals
// ----------------------------------------------------------------------

export interface TreasuryTransferCreate {
  fromAccountId: Id;
  toAccountId: Id;
  amount: number;
  reference: string;
  reason: string;
  occurredAtUtc?: Instant; // Allowed only pre-activation
}

export interface TreasuryCashEntryCreate {
  subAccountId: Id;
  amount: number; // positive for receipt, negative for disbursement
  kind: TreasuryEntryKind.Business | TreasuryEntryKind.Opening | TreasuryEntryKind.Adjustment;
  reference: string;
  reason: string;
  occurredAtUtc?: Instant;
}

export interface TreasuryReversalCreate {
  postingId: Id;
  reference: string;
  reason: string;
}

// ----------------------------------------------------------------------
// Handovers (تسليم العهدة)
// ----------------------------------------------------------------------

export interface TreasuryHandoverLine {
  id: Id;
  handoverId: Id;
  subAccountId: Id;
  accountCode: string;
  accountNameAr: string;
  sponsorId: Id | null;
  sponsorNameAr: string | null;
  sponsorIdentifier: string | null;
  amount: number;
  movementCount: number;
  createdAtUtc: Instant;
  createdByUserId: Id | null;
}

export interface TreasuryHandoverPreview {
  businessDate: DateOnly;
  lines: TreasuryHandoverLine[];
  physicalCash: number;
  bankActivity: number;
  petroAppActivity: number;
  movementCount: number;
}

export interface TreasuryHandover {
  id: Id;
  treasuryVersion: number;
  documentNumber: string;
  businessDate: DateOnly;
  status: TreasuryHandoverStatus;
  requestedByUserId: Id;
  requestedByNameAr: string | null;
  cashboxAmount: number;
  petroAppAmount: number;
  bankAmount: number;
  movementCount: number;
  reason: string;
  accountantUserId: Id | null;
  accountantNameAr: string | null;
  confirmedAtUtc: Instant | null;
  confirmationReason: string | null;
  cancelledAtUtc: Instant | null;
  cancellationReason: string | null;
  rowVersion: string;
  createdAtUtc: Instant;
  createdByUserId: Id | null;
}

export interface TreasuryHandoverDetail {
  handover: TreasuryHandover;
  lines: TreasuryHandoverLine[];
}

export interface TreasuryHandoverCreate {
  businessDate: DateOnly;
  reason: string;
}

export interface TreasuryHandoverCashCount {
  subAccountId: Id;
  amount: number;
}

export interface TreasuryHandoverConfirm {
  cashCounts: TreasuryHandoverCashCount[];
  reason: string;
  rowVersion: string;
}

export interface TreasuryHandoverCancel {
  reason: string;
  rowVersion: string;
}

// ----------------------------------------------------------------------
// PetroApp Evidence & Reconciliation
// ----------------------------------------------------------------------

export interface PetroEvidence {
  id: Id;
  sponsorId: Id;
  sponsorNameAr?: string | null;
  kind: PetroEvidenceKind;
  businessDate: DateOnly;
  amount: number;
  allocatedCollections: number;
  reference: string;
  reason: string;
  replacesId: Id | null;
  createdAtUtc: Instant;
  createdByUserId: Id | null;
}

export interface PetroEvidenceCreate {
  sponsorId: Id;
  kind: PetroEvidenceKind;
  businessDate: DateOnly;
  amount: number;
  allocatedCollections: number;
  reference: string;
  reason: string;
  replacesId?: Id | null;
}

// ----------------------------------------------------------------------
// Reports
// ----------------------------------------------------------------------

export type TreasuryReportType = "movements" | "subaccounts" | "trading" | "petroapp" | "handover";

export interface TreasuryReportAccountRow {
  subAccountId: Id;
  code: string;
  nameAr: string;
  parentId: Id | null;
  sponsorId: Id | null;
  location: TreasuryLocation;
  isPosting: boolean;
  openingBalance: number;
  receipts: number;
  disbursements: number;
  transfersIn: number;
  transfersOut: number;
  closingBalance: number;
}

export interface PetroReconciliationRow {
  sponsorId: Id;
  sponsorNameAr: string;
  collections: number;
  funding: number | null;
  allocatedCollections: number | null;
  unallocatedCollections: number | null;
  fundingDifference: number | null;
  openingStatement: number | null;
  closingStatement: number | null;
  importedConsumption: number | null;
  status: PetroReconciliationStatus;
}

export interface TreasuryReport {
  reportType: TreasuryReportType;
  filter: TreasuryFilter;
  accounts: TreasuryReportAccountRow[];
  movements: TreasuryJournalRow[];
  fuel: PetroReconciliationRow[];
  handover: TreasuryHandoverDetail | null;
  totalMovements: number;
}

// ----------------------------------------------------------------------
// Migration & Readiness
// ----------------------------------------------------------------------

export interface TreasuryReadiness {
  isActive: boolean;
  rowVersion: string;
  unresolvedMovements: number;
  unresolvedFees: number;
  unresolvedExecutedOperations: number;
  pendingLegacyHandovers: number;
  unverifiedAccounts: Id[];
}

export interface TreasuryAttributionReview {
  source: TreasurySource;
  sourceId: Id;
  platformAccountId: Id;
  currentSponsorId: Id | null;
  requiresFinanceDecision: boolean;
  evidenceJson: string;
}

export interface TreasuryOwnershipDecision {
  source: TreasurySource;
  sourceId: Id;
  sponsorId: Id;
  evidence: string;
}

export interface TreasuryVerificationCreate {
  subAccountId: Id;
  balance: number;
  reference: string;
  reason: string;
}

export interface TreasuryVerification {
  id: Id;
  subAccountId: Id;
  balance: number;
  reference: string;
  reason: string;
  verifiedAtUtc: Instant;
  verifiedByUserId: Id | null;
}

export interface TreasuryActivateRequest {
  rowVersion: string;
  reason: string;
}

export interface TreasuryState {
  isActive: boolean;
  activatedAtUtc: Instant | null;
  activatedByUserId: Id | null;
}

// ----------------------------------------------------------------------
// Problem Details (RFC 7807)
// ----------------------------------------------------------------------

export interface TreasuryProblemDetails {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  instance?: string;
  errorCode?: string;
  correlationId?: string;
  errors?: Record<string, string[]>;
}
