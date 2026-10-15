// src/lib/jahez/constants.ts

export const OperationMode = {
  Settle: 1,
  SettleAndWithdraw: 2,
  Withdraw: 3,
} as const;
export type OperationMode = (typeof OperationMode)[keyof typeof OperationMode];

export const OperationStatus = {
  Ready: 1,
  UnderReview: 2,
  Executed: 3,
} as const;
export type OperationStatus = (typeof OperationStatus)[keyof typeof OperationStatus];

export const PaymentStatus = {
  None: 1,
  Paid: 2,
  Transferred: 3,
  Deferred: 4,
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const Direction = {
  None: 0,
  Receipt: 1,
  Disbursement: 2,
} as const;
export type Direction = (typeof Direction)[keyof typeof Direction];

export const Fund = {
  Cashbox: 1,
  PetroApp: 2,
  Bank: 3,
} as const;
export type Fund = (typeof Fund)[keyof typeof Fund];

export const Purpose = {
  Settlement: 1,
  Fuel: 2,
  AccountFee: 3,
  TransferredDebtRepayment: 4,
} as const;
export type Purpose = (typeof Purpose)[keyof typeof Purpose];

export const ApprovalKind = {
  FeeException: 1,
  AccountSwitch: 2,
  PercentageCommission: 3,
  SettlementTransfer: 4,
  Adjustment: 5,
} as const;
export type ApprovalKind = (typeof ApprovalKind)[keyof typeof ApprovalKind];

export const ApprovalStatus = {
  Pending: 1,
  Approved: 2,
  Rejected: 3,
  Cancelled: 4,
} as const;
export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus];

export const AdjustmentTarget = {
  Settlement: 1,
  AdministrativeDebt: 2,
} as const;
export type AdjustmentTarget = (typeof AdjustmentTarget)[keyof typeof AdjustmentTarget];

export const ImportKind = {
  Transactions: 1,
  DailyOrders: 2,
} as const;
export type ImportKind = (typeof ImportKind)[keyof typeof ImportKind];

// Aliases for legacy component compatibility during migration
export const JahezApprovalKind = ApprovalKind;
export type JahezApprovalKind = ApprovalKind;
export const JahezApprovalStatus = ApprovalStatus;
export type JahezApprovalStatus = ApprovalStatus;
export const JahezImportKind = ImportKind;
export type JahezImportKind = ImportKind;
