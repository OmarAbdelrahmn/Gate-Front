// src/lib/jahez/types.ts
// Jahez V2 contracts. JSON enum values are numeric; dates are ISO strings; rowversions are Base64.

import {
  OperationMode,
  OperationStatus,
  PaymentStatus,
  Direction,
  Fund,
  Purpose,
  ApprovalKind,
  ApprovalStatus,
  AdjustmentTarget,
  ImportKind,
  CashboxHandoverStatus,
} from "./constants";

export * from "./constants";

export type Id = string;
export type DateOnly = string; // YYYY-MM-DD
export type Instant = string;  // ISO 8601 with offset/UTC

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount?: number;
}

export interface Audit {
  id: Id;
  createdAtUtc: Instant;
  createdByUserId: Id | null;
  updatedAtUtc: Instant | null;
  updatedByUserId: Id | null;
  rowVersion: string;
  isDeleted: boolean;
  deletedAtUtc: Instant | null;
  deletedByUserId: Id | null;
  deletionReason: string | null;
}

export interface Person {
  employeeId: Id;
  riderProfileId: Id | null;
  nameAr: string;
  nameEn: string | null;
  iqamaNo: string | null;
  mobile: string | null;
  sponsorId: Id | null;
}

export interface Account {
  accountId: Id;
  code: string;
  externalAccountId: string;
  userName: string | null;
  operatingCityId: Id;
  cityNameAr: string;
  sponsorId: Id | null;
  sponsorNameAr: string | null;
  status: "Available" | "Assigned" | "Suspended" | "Retired" | "Archived";
  statusReason: string | null;
  isAssigned: boolean;
  hasPassword: boolean;
  owner: Person | null;
  actualRider: Person | null;
  currentAssignmentId: Id | null;
  currentHandoverId: Id | null;
  acquisitionDate: DateOnly | null;
  startDate: DateOnly | null;
  endDate: DateOnly | null;
  ownershipNotes: string | null;
  operationalNotes: string | null;
  yesterdayOrders: number | null;
  lastOrderDate: DateOnly | null;
  lastOrderCount: number | null;
  rowVersion: string;
}

export interface AccountsPage extends Page<Account> {
  totalCount: number;
}

export interface SponsorStatistics {
  sponsorId: Id;
  nameAr: string;
  accounts: number;
  assignedAccounts: number;
  actualRiders: number;
  sponsoredRiders: number;
  sponsoredRidersUsingOtherSponsorsAccounts: number;
}

export interface Statistics {
  yesterday: DateOnly;
  totalAccounts: number;
  activeAccounts: number;
  unassignedAccounts: number;
  blockedAccounts: number;
  missingPasswordAccounts: number;
  yesterdayOrders: number | null;
  accountsWithYesterdayData: number;
  sponsors: SponsorStatistics[];
}

export interface DayUsage {
  ordersCount?: number | null;
  workingHours?: number | null;
  collectedAmount?: number | null;
  deductionsAmount?: number | null;
  totalValidOffers?: number | null;
  declinedOffers?: number | null;
  missedOffers?: number | null;
}

export interface OperationCreate {
  handoverId: Id;
  mode: OperationMode;
  throughDate: DateOnly;
  effectiveAtUtc: Instant;
  net: number;
  reason: string;
  fund?: Fund | null;
  purpose?: Purpose;
  transferToRider?: boolean;
  paymentReference?: string | null;
  dayUsage?: DayUsage | null;
}

export interface Preview {
  net: number;
  commission: number;
  remaining: number;
  direction: Direction;
  allowedFunds: Fund[];
  withdrawsAccount: boolean;
  commissionComplete: boolean;
  problems: string[];
  calculationJson: string;
}

export interface Operation extends Audit {
  handoverId: Id;
  mode: OperationMode;
  status: OperationStatus;
  paymentStatus: PaymentStatus;
  throughDate: DateOnly;
  effectiveAtUtc: Instant;
  net: number;
  commission: number;
  calculatedCommission: number;
  remaining: number;
  calculationJson: string;
  fund: Fund | null;
  purpose: Purpose;
  transferToRider: boolean;
  paymentReference: string | null;
  reason: string;
  approvedRequestId: Id | null;
  executedAtUtc: Instant | null;
  executedByUserId: Id | null;
  commissionStartDate?: DateOnly | null;
  dayUsageJson?: string | null;
}

export interface OperationUpdate {
  values: OperationCreate;
  rowVersion: string;
}

export interface OperationPaymentMethodUpdate {
  fund: Fund;
  paymentReference: string;
  reason: string;
  rowVersion: string;
}

export interface OperationCommissionStartUpdate {
  startDate: DateOnly;
  reason: string;
  rowVersion: string;
  fund?: Fund | null;
  paymentReference?: string | null;
}

export function canCorrectCommissionStart(
  operation: Operation | null | undefined,
  canSettle: boolean,
  canApproveAdjustment: boolean,
  canReceive: boolean,
  canDisburse: boolean,
): boolean {
  if (!canSettle || !canApproveAdjustment || !canReceive || !canDisburse) {
    return false;
  }
  if (!operation) return true;
  return (
    (operation.status === OperationStatus.Ready ||
      operation.status === OperationStatus.Executed) &&
    operation.purpose === Purpose.Settlement &&
    (operation.mode === OperationMode.Settle ||
      operation.mode === OperationMode.SettleAndWithdraw) &&
    operation.transferToRider === false
  );
}

export function canEditPaymentMethod(
  operation: Operation,
  canSettle: boolean,
  canDisburse: boolean,
): boolean {
  return (
    canSettle &&
    canDisburse &&
    operation.status === OperationStatus.Executed && // 3
    operation.paymentStatus === PaymentStatus.Paid && // 2
    operation.remaining < 0 && // Money paid to rider
    operation.transferToRider === false &&
    (operation.fund === Fund.Cashbox || operation.fund === Fund.Bank)
  );
}

export interface RequestCreate {
  handoverId: Id;
  kind: ApprovalKind;
  reason: string;
  operationId?: Id | null;
  targetAccountId?: Id | null;
  waiverAmount?: number;
  fromDate?: DateOnly | null;
  toDate?: DateOnly | null;
  effectiveAtUtc?: Instant | null;
  adjustmentTarget?: AdjustmentTarget | null;
  proposedNet?: number | null;
  proposedCommission?: number | null;
  debtAdjustment?: number | null;
}

export interface ApprovalRequestAssignment {
  assignmentId?: Id | null;
  handoverId?: Id | null;
  accountId?: Id | null;
  externalAccountId?: string | null;
  riderProfileId?: Id | null;
  startedAtUtc?: Instant | null;
  endedAtUtc?: Instant | null;
  effectiveFrom?: DateOnly | null;
  effectiveTo?: DateOnly | null;
  status?: string | null;
  startReason?: string | null;
  endReason?: string | null;
  commissionStartsOn?: DateOnly | null;
  commissionPostedThrough?: DateOnly | null;
  lastSettlementPaymentAtUtc?: Instant | null;
}

export interface ApprovalRequestAccount {
  accountId?: Id | null;
  code?: string | null;
  externalAccountId?: string | null;
  userName?: string | null;
  status?: string | null;
  statusReason?: string | null;
  operatingCityId?: Id | null;
  cityNameAr?: string | null;
  sponsorId?: Id | null;
  sponsorNameAr?: string | null;
}

export interface TransferAmounts {
  dashboardDebt: number;
  commission: number;
  total: number;
  DashboardDebt?: number;
  Commission?: number;
  Total?: number;
}

export interface ApprovalRequest extends Audit {
  handoverId: Id;
  kind: ApprovalKind;
  status: ApprovalStatus;
  requestedByUserId: Id;
  operationId: Id | null;
  targetAccountId: Id | null;
  waiverAmount: number;
  fromDate: DateOnly | null;
  toDate: DateOnly | null;
  effectiveAtUtc: Instant | null;
  reason: string;
  adjustmentTarget: AdjustmentTarget | null;
  proposedNet: number | null;
  proposedCommission: number | null;
  debtAdjustment: number | null;
  // Enriched fields from backend:
  userRider?: RiderPerson | null;
  assignment?: ApprovalRequestAssignment | null;
  account?: ApprovalRequestAccount | null;
  targetAccount?: ApprovalRequestAccount | null;
  operation?: (Partial<Operation> & { net?: number; commission?: number; remaining?: number }) | null;
  Operation?: (Partial<Operation> & { net?: number; commission?: number; remaining?: number }) | null;
  amounts?: TransferAmounts | null;
  Amounts?: TransferAmounts | null;
}

export interface DecisionRequest {
  approve: boolean;
  reason: string;
  approvedNet?: number | null;
  approvedCommission?: number | null;
  approvedDebtAdjustment?: number | null;
  useOriginalValues?: boolean;
}

export interface Decision {
  id: Id;
  requestId: Id;
  actorUserId: Id;
  status: ApprovalStatus;
  decidedAtUtc: Instant;
  reason: string;
  decisionJson: string | null;
  createdAtUtc: Instant;
  createdByUserId: Id | null;
}

export interface Approval {
  request: ApprovalRequest;
  decisions: Decision[];
  amounts?: TransferAmounts | null;
  Amounts?: TransferAmounts | null;
}

export interface MoneyRecord {
  fund: Fund;
  reference: string;
  reason: string;
  purpose?: Purpose;
}

export interface FeeReceipt {
  handoverId: Id;
  amount: number;
  fund: Fund;
  reference: string;
  reason: string;
}

export interface TransferredDebtAssignment {
  assignmentId?: Id | null;
  handoverId?: Id | null;
  accountId?: Id | null;
  externalAccountId?: string | null;
  riderProfileId?: Id | null;
  startedAtUtc?: Instant | null;
  endedAtUtc?: Instant | null;
  effectiveFrom?: DateOnly | null;
  effectiveTo?: DateOnly | null;
  status?: string | null;
  startReason?: string | null;
  endReason?: string | null;
}

export interface TransferredDebtSourceOperation {
  id?: Id | null;
  mode?: number | null;
  throughDate?: DateOnly | null;
  effectiveAtUtc?: Instant | null;
  net?: number | null;
  commission?: number | null;
  remaining?: number | null;
  reason?: string | null;
  approvedRequestId?: Id | null;
  executedAtUtc?: Instant | null;
}

export interface TransferredDebt extends Audit {
  operationId: Id;
  riderProfileId: Id;
  amount: number;
  paidAtUtc: Instant | null;
  paidByUserId: Id | null;
  approvedRequestId?: Id | null;
  // Enriched fields from backend:
  userRider?: RiderPerson | null;
  assignment?: TransferredDebtAssignment | null;
  sourceOperation?: TransferredDebtSourceOperation | null;
}

export interface RiderTransferredDebtSummary {
  riderProfileId: Id;
  userRider: RiderPerson | null;
  unpaidDebtCount: number;
  outstandingAmount: number;
  amounts: TransferAmounts | null;
}

export interface RiderDebtRepaymentRequest {
  expectedAmount: number;
  fund: Fund;
  reference: string;
  reason: string;
}

export interface RiderDebtRepaymentResponse {
  riderProfileId: Id;
  paidAmount: number;
  paidDebtIds: Id[];
  remainingAmount: number;
}

export interface RiderPerson {
  employeeId: string;
  riderProfileId: string | null;
  nameAr: string;
  nameEn: string | null;
  iqamaNo: string | null;
  mobile: string | null;
  sponsorId: string | null;
  sponsorNameAr?: string | null;
}

export interface MoneyMovement {
  id: string;
  handoverId: string;
  riderProfileId: string;
  operationId: string | null;
  transferredDebtId: string | null;
  fund: Fund;
  direction: Direction;
  purpose: Purpose;
  amount: number;
  actorUserId: string;
  occurredAtUtc: string;
  reference: string;
  reason: string;
  createdAtUtc: string;
  createdByUserId: string | null;
  sponsorId?: string | null;
  sponsorNameAr: string | null;
  cashboxHandoverId: string | null;
  isHandedToAccountant: boolean;
  userRider: RiderPerson | null;
  ownerRider: RiderPerson | null;
  platformAccountId?: string | null;
  net?: number | null;
  commission?: number | null;
  calculatedCommission?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  operationRowVersion?: string | null;
}

export type Movement = MoneyMovement;

export interface MoneyMovementsResponse {
  items: MoneyMovement[];
  page: number;
  pageSize: number;
}

export interface CashboxHandover {
  id: string;
  businessDate: string;
  status: CashboxHandoverStatus;
  requestedByUserId: string;
  cashboxAmount: number;
  petroAppAmount: number;
  bankAmount: number;
  movementCount: number;
  reason: string;
  accountantUserId: string | null;
  confirmedAtUtc: string | null;
  confirmationReason: string | null;
  cancelledAtUtc: string | null;
  cancellationReason: string | null;
  createdAtUtc: string;
  createdByUserId: string | null;
  updatedAtUtc: string | null;
  updatedByUserId: string | null;
  rowVersion: string;
  isDeleted: boolean;
  deletedAtUtc: string | null;
  deletedByUserId: string | null;
  deletionReason: string | null;
}

export interface CashboxHandoverCreate {
  businessDate: string;
  reason: string;
}

export interface CashboxHandoverConfirm {
  cashboxAmount: number;
  petroAppAmount: number;
  bankAmount: number;
  reason: string;
  rowVersion: string;
}

export interface CashboxHandoverCancel {
  reason: string;
  rowVersion: string;
}

export interface MoneyMovementDateRange {
  fromDate?: string | null;
  toDate?: string | null;
}


export interface FundBalance {
  fund: Fund;
  receipts: number;
  disbursements: number;
  balance: number;
}

export interface AccountStatusUpdate {
  status: Account["status"];
  reason: string;
  rowVersion: string;
}

export interface AccountFee extends Audit {
  handoverId: Id;
  amount: number;
  waivedAmount: number;
  approvalRequestId: Id | null;
}

export interface HandoverCreate {
  accountId: Id;
  riderProfileId: Id;
  effectiveAtUtc: Instant;
  reason: string;
  initialFeePayment?: number;
  paymentReference?: string | null;
}

export interface Handover {
  id: Id;
  accountId: Id;
  externalAccountId: string;
  riderProfileId: Id;
  assignmentId: Id;
  startedAtUtc: Instant;
  endedAtUtc: Instant | null;
  commissionStartsOn: DateOnly;
  commissionPostedThrough: DateOnly | null;
  lastSettlementPaymentAtUtc: Instant | null;
}

export interface EarningsRequest {
  handoverId: Id;
  fromDate: DateOnly;
  toDate: DateOnly;
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
  supersedesId?: Id | null;
}

export interface EarningsStatement extends EarningsRequest {
  id: Id;
  createdAtUtc: Instant;
  createdByUserId: Id | null;
}

export interface AdministrativeDebt {
  handoverId: Id;
  accountId: Id;
  externalAccountId: string;
  riderProfileId: Id;
  riderNameAr: string;
  platformDebt: number;
}

export interface ImportIssue {
  rowId: Id;
  fileName: string;
  rowNumber: number;
  code: string;
  description: string;
}

export interface ImportRow {
  rowId: Id;
  fileName: string;
  rowNumber: number;
  driverId: string;
  occurredAtUtc: Instant;
  accountId: Id | null;
  handoverId: Id | null;
  riderProfileId: Id | null;
  netAmount: number;
  dispatches: number | null;
}

export interface ImportAccountSummary {
  accountId: Id | null;
  driverId: string;
  fromDate: DateOnly;
  toDate: DateOnly;
  validRowCount: number;
  netAmount: number;
  platformDebtChange: number;
  dispatches: number | null;
  hasIssues: boolean;
}

export interface ImportBatch extends Audit {
  kind: ImportKind;
  contentHash: string;
  uploadedByUserId: Id;
  committedAtUtc: Instant | null;
  replacesBatchId: Id | null;
  correctionReason: string | null;
}

export interface JahezResolvedDispatchAllocation {
  rowId: string;
  handoverId: string;
  count: number;
  reason: string;
}

export interface ImportPreview {
  batchId: Id;
  kind: ImportKind;
  committed: boolean;
  rows: ImportRow[];
  issues: ImportIssue[];
  files: { id: Id; fileName: string }[] | null;
  accounts: ImportAccountSummary[] | null;
  resolvedAllocations?: JahezResolvedDispatchAllocation[];
}

export interface ImportCommit {
  allocations?: { rowId: Id; handoverId: Id; count: number; reason: string }[] | null;
}

export interface OrderRow {
  accountId: Id;
  externalAccountId: string;
  riderProfileId: Id;
  handoverId: Id;
  date: DateOnly;
  count: number;
}

export interface LedgerEntry {
  id: Id;
  handoverId: Id;
  bucket: number;
  kind: number;
  amount: number;
  sourceId: Id;
  reversesEntryId: Id | null;
  occurredAtUtc: Instant;
  reason: string;
  fromDate: DateOnly | null;
  throughDate: DateOnly | null;
  calculationJson: string | null;
  createdAtUtc: Instant;
  createdByUserId: Id | null;
}

export interface AccountDetails {
  account: Account;
  handovers: Page<Handover>;
  operations: Page<Operation>;
  requests: Page<ApprovalRequest>;
  fees: Page<AccountFee>;
  orders: Page<OrderRow>;
  ledger: Page<LedgerEntry>;
}

export interface Problem {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  errorCode?: string;
  correlationId?: string;
}

// Backward compatibility types for any legacy UI components during migration
export type JahezAccount = Account;
export type JahezHandover = Handover;
export type JahezApprovalRequest = ApprovalRequest;
export type JahezOperation = Operation;
export type JahezImportBatch = ImportBatch;
export type JahezImportPreview = ImportPreview;
export type JahezLedgerEntry = LedgerEntry;
