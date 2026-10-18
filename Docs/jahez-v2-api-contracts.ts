// Jahez V2. JSON enum values are numeric; dates are ISO strings; rowversions are Base64.
export type Id = string;
export type DateOnly = string;
export type Instant = string;
export enum OperationMode { Settle = 1, SettleAndWithdraw = 2, Withdraw = 3 }
export enum OperationStatus { Ready = 1, UnderReview = 2, Executed = 3 }
export enum PaymentStatus { None = 1, Paid = 2, Transferred = 3, Deferred = 4 }
export enum Direction { None = 0, Receipt = 1, Disbursement = 2 }
export enum Fund { Cashbox = 1, PetroApp = 2, Bank = 3 }
export enum Purpose { Settlement = 1, Fuel = 2, AccountFee = 3, TransferredDebtRepayment = 4 }
export enum ApprovalKind { FeeException = 1, AccountSwitch = 2, PercentageCommission = 3, SettlementTransfer = 4, Adjustment = 5 }
export enum ApprovalStatus { Pending = 1, Approved = 2, Rejected = 3, Cancelled = 4 }
export enum AdjustmentTarget { Settlement = 1, AdministrativeDebt = 2 }
export interface Page<T> { items: T[]; page: number; pageSize: number }
export interface Audit { id: Id; createdAtUtc: Instant; createdByUserId: Id | null; updatedAtUtc: Instant | null;
  updatedByUserId: Id | null; rowVersion: string; isDeleted: boolean; deletedAtUtc: Instant | null;
  deletedByUserId: Id | null; deletionReason: string | null }
export interface Person { employeeId: Id; riderProfileId: Id | null; nameAr: string; nameEn: string | null;
  iqamaNo: string | null; mobile: string | null; sponsorId: Id | null }
export interface Account { accountId: Id; code: string; externalAccountId: string; userName: string | null;
  operatingCityId: Id; cityNameAr: string; sponsorId: Id | null; sponsorNameAr: string | null;
  status: 'Available' | 'Assigned' | 'Suspended' | 'Retired' | 'Archived'; statusReason: string | null;
  isAssigned: boolean; hasPassword: boolean; owner: Person | null; actualRider: Person | null;
  currentAssignmentId: Id | null; currentHandoverId: Id | null; acquisitionDate: DateOnly | null;
  startDate: DateOnly | null; endDate: DateOnly | null; ownershipNotes: string | null; operationalNotes: string | null;
  yesterdayOrders: number | null; lastOrderDate: DateOnly | null; lastOrderCount: number | null; rowVersion: string }
export interface AccountsPage extends Page<Account> { totalCount: number }
export interface SponsorStatistics { sponsorId: Id; nameAr: string; accounts: number; assignedAccounts: number;
  actualRiders: number; sponsoredRiders: number; sponsoredRidersUsingOtherSponsorsAccounts: number }
export interface Statistics { yesterday: DateOnly; totalAccounts: number; activeAccounts: number;
  unassignedAccounts: number; blockedAccounts: number; missingPasswordAccounts: number; yesterdayOrders: number | null;
  accountsWithYesterdayData: number; sponsors: SponsorStatistics[] }
export interface OperationCreate { handoverId: Id; mode: OperationMode; throughDate: DateOnly; effectiveAtUtc: Instant;
  net: number; reason: string; fund?: Fund | null; purpose?: Purpose; transferToRider?: boolean; paymentReference?: string | null }
export interface Preview { net: number; commission: number; remaining: number; direction: Direction;
  allowedFunds: Fund[]; withdrawsAccount: boolean; commissionComplete: boolean; problems: string[]; calculationJson: string }
export interface Operation extends Audit { handoverId: Id; mode: OperationMode; status: OperationStatus;
  paymentStatus: PaymentStatus; throughDate: DateOnly; effectiveAtUtc: Instant; net: number; commission: number;
  calculatedCommission: number; remaining: number; calculationJson: string; fund: Fund | null; purpose: Purpose;
  transferToRider: boolean; paymentReference: string | null; reason: string; approvedRequestId: Id | null;
  executedAtUtc: Instant | null; executedByUserId: Id | null; commissionStartDate?: DateOnly | null }
export interface OperationUpdate { values: OperationCreate; rowVersion: string }
export interface OperationCommissionStartUpdate { startDate: DateOnly; reason: string; rowVersion: string; fund?: Fund | null; paymentReference?: string | null }
export interface RequestCreate { handoverId: Id; kind: ApprovalKind; reason: string; operationId?: Id | null;
  targetAccountId?: Id | null; waiverAmount?: number; fromDate?: DateOnly | null; toDate?: DateOnly | null;
  effectiveAtUtc?: Instant | null; adjustmentTarget?: AdjustmentTarget | null; proposedNet?: number | null;
  proposedCommission?: number | null; debtAdjustment?: number | null }
export interface ApprovalRequest extends Audit { handoverId: Id; kind: ApprovalKind; status: ApprovalStatus;
  requestedByUserId: Id; operationId: Id | null; targetAccountId: Id | null; waiverAmount: number;
  fromDate: DateOnly | null; toDate: DateOnly | null; effectiveAtUtc: Instant | null; reason: string;
  adjustmentTarget: AdjustmentTarget | null; proposedNet: number | null; proposedCommission: number | null;
  debtAdjustment: number | null }
export interface DecisionRequest { approve: boolean; reason: string; approvedNet?: number | null;
  approvedCommission?: number | null; approvedDebtAdjustment?: number | null; useOriginalValues?: boolean }
export interface Decision { id: Id; requestId: Id; actorUserId: Id; status: ApprovalStatus; decidedAtUtc: Instant;
  reason: string; decisionJson: string | null; createdAtUtc: Instant; createdByUserId: Id | null }
export interface Approval { request: ApprovalRequest; decisions: Decision[] }
export interface MoneyRecord { fund: Fund; reference: string; reason: string; purpose?: Purpose }
export interface FeeReceipt { handoverId: Id; amount: number; fund: Fund; reference: string; reason: string }
export interface TransferredDebt extends Audit { operationId: Id; riderProfileId: Id; amount: number;
  paidAtUtc: Instant | null; paidByUserId: Id | null }
export interface Movement { id: Id; handoverId: Id; riderProfileId: Id; operationId: Id | null;
  transferredDebtId: Id | null; fund: Fund; direction: Direction; purpose: Purpose;
  amount: number; actorUserId: Id; occurredAtUtc: Instant; reference: string; reason: string;
  createdAtUtc: Instant; createdByUserId: Id | null; operationRowVersion?: string | null }
export interface FundBalance { fund: Fund; receipts: number; disbursements: number; balance: number }
export interface AccountStatusUpdate { status: Account['status']; reason: string; rowVersion: string }
export interface AccountFee extends Audit { handoverId: Id; amount: number; waivedAmount: number; approvalRequestId: Id | null }
export interface HandoverCreate { accountId: Id; riderProfileId: Id; effectiveAtUtc: Instant; reason: string;
  initialFeePayment?: number; paymentReference?: string | null }
export interface Handover { id: Id; accountId: Id; externalAccountId: string; riderProfileId: Id; assignmentId: Id;
  startedAtUtc: Instant; endedAtUtc: Instant | null; commissionStartsOn: DateOnly; commissionPostedThrough: DateOnly | null;
  lastSettlementPaymentAtUtc: Instant | null }
export interface EarningsRequest { handoverId: Id; fromDate: DateOnly; toDate: DateOnly; totalDeliveryPrice: number;
  totalPenalties: number; totalCashAmount: number; totalDriverDebit: number; totalServiceDeduction: number;
  totalDriverCredit: number; totalBonuses: number; totalTips: number; totalFreeOrders: number; reason: string; supersedesId?: Id | null }
export interface EarningsStatement extends EarningsRequest { id: Id; createdAtUtc: Instant; createdByUserId: Id | null }
export interface AdministrativeDebt { handoverId: Id; accountId: Id; externalAccountId: string; riderProfileId: Id;
  riderNameAr: string; platformDebt: number }
export enum ImportKind { Transactions = 1, DailyOrders = 2 }
export interface ImportBatch extends Audit { kind: ImportKind; contentHash: string; uploadedByUserId: Id;
  committedAtUtc: Instant | null; replacesBatchId: Id | null; correctionReason: string | null }
export interface ImportIssue { rowId: Id; fileName: string; rowNumber: number; code: string; description: string }
export interface ImportRow { rowId: Id; fileName: string; rowNumber: number; driverId: string; occurredAtUtc: Instant;
  accountId: Id | null; handoverId: Id | null; riderProfileId: Id | null; netAmount: number; dispatches: number | null }
export interface ImportAccountSummary { accountId: Id | null; driverId: string; fromDate: DateOnly; toDate: DateOnly;
  validRowCount: number; netAmount: number; platformDebtChange: number; dispatches: number | null; hasIssues: boolean }
export interface ImportPreview { batchId: Id; kind: ImportKind; committed: boolean; rows: ImportRow[]; issues: ImportIssue[];
  files: { id: Id; fileName: string }[] | null; accounts: ImportAccountSummary[] | null }
export interface ImportCommit { allocations?: { rowId: Id; handoverId: Id; count: number; reason: string }[] | null }
export interface OrderRow { accountId: Id; externalAccountId: string; riderProfileId: Id; handoverId: Id; date: DateOnly; count: number }
export interface LedgerEntry { id: Id; handoverId: Id; bucket: number; kind: number; amount: number; sourceId: Id;
  reversesEntryId: Id | null; occurredAtUtc: Instant; reason: string; fromDate: DateOnly | null; throughDate: DateOnly | null;
  calculationJson: string | null; createdAtUtc: Instant; createdByUserId: Id | null }
export interface AccountDetails { account: Account; handovers: Page<Handover>; operations: Page<Operation>;
  requests: Page<ApprovalRequest>; fees: Page<AccountFee>; orders: Page<OrderRow>; ledger: Page<LedgerEntry> }
export interface Problem { type?: string; title?: string; status: number; detail?: string; errorCode?: string; correlationId?: string }
// All mutations require Idempotency-Key. No new account filter parameters exist.
export const routes = {
  accounts: '/api/jahez/v2/accounts', statistics: '/api/jahez/v2/statistics', operations: '/api/jahez/v2/operations',
  preview: '/api/jahez/v2/operations/preview', requests: '/api/jahez/v2/requests',
  transferredDebts: '/api/jahez/v2/transferred-debts', feeReceipts: '/api/jahez/v2/fees/receipts',
  moneyMovements: '/api/jahez/v2/money-movements', funds: '/api/jahez/v2/funds', handovers: '/api/jahez/v2/handovers', earnings: '/api/jahez/v2/earnings', imports: '/api/jahez/v2/imports', administrativeDebts: '/api/jahez/v2/administrative-debts',
  commissionStart: (opId: string) => `/api/jahez/v2/operations/${encodeURIComponent(opId)}/commission-start`
} as const;
