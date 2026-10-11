// src/lib/jahez/constants.ts

export const JahezDebtStatus = {
  Active: 1,
  Closed: 2,
  TransferredToRider: 3,
  Frozen: 4,
  AccountCleared: 5,
} as const;

export type JahezDebtStatus = (typeof JahezDebtStatus)[keyof typeof JahezDebtStatus];

export const JahezPaymentStatus = {
  Outstanding: 1,
  Paid: 2,
} as const;

export type JahezPaymentStatus = (typeof JahezPaymentStatus)[keyof typeof JahezPaymentStatus];

export const JahezLedgerKind = {
  Charge: 1,
  Payment: 2,
  Adjustment: 3,
  Transfer: 4,
  OpeningBalance: 5,
  StatusChange: 6,
} as const;

export type JahezLedgerKind = (typeof JahezLedgerKind)[keyof typeof JahezLedgerKind];

export const JahezLedgerBucket = {
  AccountFee: 1,
  PlatformDebt: 2,
  Commission: 3,
} as const;

export type JahezLedgerBucket = (typeof JahezLedgerBucket)[keyof typeof JahezLedgerBucket];

export const JahezApprovalKind = {
  FeeException: 1,
  FreeSwitch: 2,
  PercentageCommission: 3,
  AccountResetDebtTransfer: 4,
} as const;

export type JahezApprovalKind = (typeof JahezApprovalKind)[keyof typeof JahezApprovalKind];

export const JahezApprovalStatus = {
  Pending: 1,
  Approved: 2,
  Rejected: 3,
  Cancelled: 4,
} as const;

export type JahezApprovalStatus = (typeof JahezApprovalStatus)[keyof typeof JahezApprovalStatus];

export const JahezCashboxSection = {
  AccountFees: 1,
  Settlements: 2,
} as const;

export type JahezCashboxSection = (typeof JahezCashboxSection)[keyof typeof JahezCashboxSection];

export const JahezCashboxHandoffStatus = {
  Pending: 1,
  AccountantConfirmed: 2,
  Approved: 3,
  Rejected: 4,
} as const;

export type JahezCashboxHandoffStatus = (typeof JahezCashboxHandoffStatus)[keyof typeof JahezCashboxHandoffStatus];

export const JahezImportKind = {
  Transactions: 1,
  DailyDispatches: 2,
} as const;

export type JahezImportKind = (typeof JahezImportKind)[keyof typeof JahezImportKind];
