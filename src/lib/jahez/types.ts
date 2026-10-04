// src/lib/jahez/types.ts

// --- Enums ---
export enum JahezApprovalKind {
  FeeException = 1,
  FreeSwitch = 2,
  PercentageCommission = 3,
  AccountResetDebtTransfer = 4,
}

export enum JahezApprovalStatus {
  Pending = 1,
  Approved = 2,
  Rejected = 3,
  Cancelled = 4,
}

export enum JahezLedgerBucket {
  AccountFee = 1,
  PlatformDebt = 2,
  Commission = 3,
}

export enum JahezLedgerKind {
  Charge = 1,
  Payment = 2,
  Adjustment = 3,
  Transfer = 4,
  OpeningBalance = 5,
}

export enum JahezCashboxSection {
  AccountFees = 1,
  Settlements = 2,
}

export enum JahezCashboxHandoffStatus {
  Pending = 1,
  AccountantConfirmed = 2,
  Approved = 3,
  Rejected = 4,
}

export enum JahezImportKind {
  Transactions = 1,
  DailyDispatches = 2,
}

// --- Base metadata shapes ---
export interface JahezHistoryMetadata {
  id: string;
  createdAtUtc: string;
  createdByUserId: string;
}

export interface JahezAuditableMetadata extends JahezHistoryMetadata {
  updatedAtUtc?: string | null;
  updatedByUserId?: string | null;
  rowVersion: string;
  isDeleted: boolean;
  deletedAtUtc?: string | null;
  deletedByUserId?: string | null;
  deletionReason?: string | null;
}

// --- Domain Models ---
export interface JahezHandover {
  id: string;
  accountId: string;
  externalAccountId: string | null;
  riderProfileId: string;
  assignmentId: string;
  startedAtUtc: string;
  endedAtUtc: string | null;
  commissionStartsOn: string;
  commissionPostedThrough: string | null;
  lastSettlementPaymentAtUtc: string | null;
  isLegacy: boolean;
  debtTransferred: boolean;
}

export interface JahezBalance {
  handoverId: string;
  accountId: string;
  externalAccountId: string | null;
  riderProfileId: string;
  throughDate: string;
  fees: number;
  platformDebt: number; // positive = receivable, negative = rider credit
  postedCommission: number;
  unpostedCommission: number;
  totalReceivable: number;
  commissionComplete: boolean;
  problems: string[];
  reminderAnchorAtUtc: string;
  daysSinceSettlementPayment: number;
  isOverdue: boolean;
  debtTransferred: boolean;
  latestTransactionAtUtc: string | null;
}

export interface JahezFee extends JahezAuditableMetadata {
  handoverId: string;
  amount: number;
  waivedAmount: number;
  approvalRequestId: string | null;
}

export interface JahezApprovalRequest extends JahezAuditableMetadata {
  handoverId: string;
  kind: JahezApprovalKind;
  status: JahezApprovalStatus;
  requestedByUserId: string;
  targetAccountId: string | null;
  waiverAmount: number | null;
  fromDate: string | null;
  toDate: string | null;
  effectiveAtUtc: string | null;
  reason: string;
  externalResetReference: string | null;
}

export interface JahezDecision extends JahezHistoryMetadata {
  requestId: string;
  actorUserId: string;
  status: JahezApprovalStatus;
  decidedAtUtc: string;
  reason: string;
}

export interface JahezApprovalResponse {
  request: JahezApprovalRequest;
  decisions: JahezDecision[];
}

export interface JahezCommissionPolicy extends JahezHistoryMetadata {
  handoverId: string;
  approvalRequestId: string;
  fromDate: string;
  toDate: string;
  rate: number; // 0.15
}

export interface JahezEarnings extends JahezHistoryMetadata {
  handoverId: string;
  fromDate: string;
  toDate: string;
  totalDeliveryPrice: number;
  totalPenalties: number;
  totalCashAmount: number;
  totalDriverDebit: number;
  totalServiceDeduction: number;
  totalDriverCredit: number;
  totalBonuses: number;
  totalTips: number;
  totalFreeOrders: number;
  supersedesId: string | null;
  reason: string;
}

export interface JahezSettlement extends JahezHistoryMetadata {
  handoverId: string;
  throughDate: string;
  recordedAtUtc: string;
  collectedByUserId: string;
  feePayment: number;
  debtPayment: number;
  commissionPayment: number;
  countsAsSettlement: boolean;
  reason: string;
}

export interface JahezLedgerEntry extends JahezHistoryMetadata {
  handoverId: string;
  bucket: JahezLedgerBucket;
  kind: JahezLedgerKind;
  amount: number;
  sourceId: string | null;
  reversesEntryId: string | null;
  occurredAtUtc: string;
  reason: string;
  fromDate: string | null;
  throughDate: string | null;
  calculationJson: string | null;
}

export interface JahezImportBatch extends JahezAuditableMetadata {
  kind: JahezImportKind;
  contentHash: string;
  uploadedByUserId: string;
  committedAtUtc: string | null;
  replacesBatchId: string | null;
  correctionReason: string | null;
}

export interface JahezImportFile {
  id: string;
  fileName: string;
}

export interface JahezImportRow {
  rowId: string;
  fileName: string;
  rowNumber: number;
  driverId: string;
  occurredAtUtc: string;
  accountId: string | null;
  handoverId: string | null;
  riderProfileId: string | null;
  netAmount: number | null;
  dispatches: number | null;
}

export interface JahezImportIssue {
  rowId: string | null;
  fileName: string;
  rowNumber: number | null;
  code: string;
  description: string;
}

export interface JahezImportAccountSummary {
  accountId: string | null;
  driverId: string;
  fromDate: string;
  toDate: string;
  validRowCount: number;
  netAmount: number | null;
  platformDebtChange: number | null;
  dispatches: number | null;
  hasIssues: boolean;
}

export interface JahezImportPreview {
  batchId: string;
  kind: JahezImportKind;
  committed: boolean;
  rows: JahezImportRow[];
  issues: JahezImportIssue[];
  files: JahezImportFile[];
  accounts: JahezImportAccountSummary[];
}

export interface JahezDispatch {
  accountId: string;
  externalAccountId: string | null;
  riderProfileId: string;
  handoverId: string;
  date: string;
  count: number;
}

export interface JahezCashboxBalance {
  fees: number;
  settlements: number;
  reservedFees: number;
  reservedSettlements: number;
  availableFees: number;
  availableSettlements: number;
}

export interface JahezCashboxEntry extends JahezAuditableMetadata {
  settlementId: string;
  handoverId: string;
  section: JahezCashboxSection;
  amount: number;
  collectedByUserId: string;
  receivedAtUtc: string;
  cashboxHandoverId: string | null;
}

export interface JahezCashboxHandover extends JahezAuditableMetadata {
  businessDate: string;
  status: JahezCashboxHandoffStatus;
  feeAmount: number;
  settlementAmount: number;
  accountantFeeAmount: number | null;
  accountantSettlementAmount: number | null;
  requestedByUserId: string;
  accountantUserId: string | null;
  approvedByUserId: string | null;
  confirmedAtUtc: string | null;
  decidedAtUtc: string | null;
  reason: string;
  confirmationReason: string | null;
  decisionReason: string | null;
}

// --- Paginated Wrapper ---
export interface JahezPage<T> {
  items: T[];
  page: number;
  pageSize: number;
}

// --- Request DTOs ---
export interface CreateJahezHandoverRequest {
  accountId: string;
  riderProfileId: string;
  effectiveAtUtc: string;
  reason: string;
  initialFeePayment: number;
  feeApprovalRequestId: null;
}

export interface LegacyAdoptionRequest {
  assignmentId: string;
  financialStartOn: string;
  openingDebt: number;
  openingFees: number;
  openingCommission: number;
  reason: string;
}

export interface CloseJahezHandoverRequest {
  effectiveAtUtc: string;
  reason: string;
}

export interface ApprovalCreateRequest {
  handoverId: string;
  kind: JahezApprovalKind;
  reason: string;
  waiverAmount?: number | null;
  targetAccountId?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  effectiveAtUtc?: string | null;
  externalResetReference?: string | null;
}

export interface ApprovalDecisionRequest {
  approve: boolean;
  reason: string;
}

export interface ApprovalCancelRequest {
  reason: string;
}

export interface EarningsRequest {
  handoverId: string;
  fromDate: string;
  toDate: string;
  totalDeliveryPrice: number;
  totalPenalties: number;
  totalCashAmount: number;
  totalDriverDebit: number;
  totalServiceDeduction: number;
  totalDriverCredit: number;
  totalBonuses: number;
  totalTips: number;
  totalFreeOrders: number;
  reason: string;
  supersedesId?: string | null;
}

export interface PaymentRequest {
  handoverId: string;
  throughDate: string;
  feePayment: number;
  debtPayment: number;
  commissionPayment: number;
  countsAsSettlement: boolean;
  reason: string;
}

export interface LedgerAdjustmentRequest {
  handoverId: string;
  bucket: JahezLedgerBucket;
  amount: number;
  reason: string;
  reversesEntryId?: string | null;
}

export interface DispatchAllocationItem {
  rowId: string;
  handoverId: string;
  count: number;
  reason: string;
}

export interface ImportCommitRequest {
  allocations?: DispatchAllocationItem[];
}

export interface CashboxCreateRequest {
  businessDate: string;
  reason: string;
}

export interface AccountantConfirmRequest {
  feeAmount: number;
  settlementAmount: number;
  reason: string;
}

export interface CashboxDecisionRequest {
  approve: boolean;
  reason: string;
}
