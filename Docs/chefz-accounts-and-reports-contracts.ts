/** Chefz accounts/report handoff, 15 October 2026. These are transport contracts, not frontend implementation. */
export * from './chefz-new-endpoints-contracts';
import type { Guid, DateOnly, RowVersion, ChefzAccountStatus, ChefzProblemDetails } from './chefz-new-endpoints-contracts';

export type PlatformPaymentModel = 'PayPerOrder' | 'Salary';
export interface AssignChefzAccountRequest {
  actualRiderProfileId: Guid;
  effectiveFrom: DateOnly;
  reason: string | null;
  wasBackdated: boolean;
  backdatedReason: string | null;
}
export interface ReleaseChefzAccountRequest {
  effectiveTo: DateOnly;
  status: 'Ended' | 'Cancelled';
  reason: string;
  /** Latest current assignment rowVersion, not either account token. */
  rowVersion: RowVersion;
}
export interface PlatformAssignment {
  id: Guid;
  accountId: Guid;
  paymentModel: PlatformPaymentModel;
  actualRiderProfileId: Guid;
  actualEmployeeId: Guid;
  actualRiderNameAr: string;
  actualRiderNameEn: string | null;
  effectiveFrom: DateOnly;
  effectiveTo: DateOnly | null;
  status: string;
  startReason: string | null;
  endReason: string | null;
  wasBackdated: boolean;
  backdatedReason: string | null;
  assignedByUserId: Guid;
  endedByUserId: Guid | null;
  rowVersion: RowVersion;
  isOperationallyBlocked: boolean;
  operationalBlockReason: string | null;
}
export interface BasePlatformAccount {
  id: Guid;
  platformId: Guid;
  platformCode: string;
  platformNameAr: string;
  platformNameEn: string;
  operatingCityId: Guid;
  operatingCityNameAr: string;
  operatingCityNameEn: string;
  sponsorId: Guid | null;
  sponsorNameAr: string | null;
  sponsorNameEn: string | null;
  ownerRiderProfileId: Guid | null;
  ownerEmployeeId: Guid | null;
  ownerRiderNameAr: string | null;
  ownerRiderNameEn: string | null;
  code: string;
  externalAccountId: string;
  userName: string | null;
  paymentModel: PlatformPaymentModel;
  status: ChefzAccountStatus;
  statusReason: string | null;
  acquisitionDate: DateOnly | null;
  startDate: DateOnly | null;
  endDate: DateOnly | null;
  notes: string | null;
  currentAssignment: PlatformAssignment | null;
  rowVersion: RowVersion;
}
export interface BasePlatformAccountRequest {
  platformId: Guid;
  operatingCityId: Guid;
  sponsorId: Guid;
  ownerRiderProfileId: Guid;
  code: string;
  externalAccountId: string;
  userName: string | null;
  paymentModel: PlatformPaymentModel;
  status: ChefzAccountStatus;
  statusReason: string | null;
  acquisitionDate: DateOnly | null;
  startDate: DateOnly | null;
  endDate: DateOnly | null;
  notes: string | null;
  archiveReason: string | null;
  rowVersion: RowVersion | null;
}
export interface ChefzSettlementRequest {
  assignmentId: Guid;
  year: number;
  month: number;
  half: 1 | 2;
  startWalletAmount: number;
  endWalletAmount: number;
}
export interface ChefzPasswordRequest { password: string; reason: string }
export interface ActivePlatformAccountErrorDetail {
  assignmentId: Guid;
  accountId: Guid;
  platformId: Guid;
  platformCode: string;
  platformNameAr: string;
  platformNameEn: string;
  externalAccountId: string;
  paymentModel: PlatformPaymentModel;
}
export interface PlatformAssignmentLimit {
  riderProfileId: Guid;
  requestedAccountId: Guid;
  requestedPaymentModel: PlatformPaymentModel;
  maximumActiveAccounts: number;
  maximumSalaryAccounts: number;
  activeAccounts: ActivePlatformAccountErrorDetail[];
  allowedPaymentModels: PlatformPaymentModel[];
}
export interface ChefzOperationProblem extends ChefzProblemDetails {
  field?: string;
  assignmentLimit?: PlatformAssignmentLimit;
}
export interface BaseAccountQuery {
  accountId?: Guid;
  platformId?: Guid;
  operatingCityId?: Guid;
  sponsorId?: Guid;
  ownerRiderProfileId?: Guid;
  actualRiderProfileId?: Guid;
  status?: ChefzAccountStatus;
  paymentModel?: PlatformPaymentModel;
  currentOnly?: boolean;
  includeArchived?: boolean;
}
export const platformAccountPaths = {
  platforms: '/api/platforms',
  accounts: (query: BaseAccountQuery = {}) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value !== undefined) params.set(key, String(value));
    const suffix = params.toString();
    return `/api/platform-accounts${suffix ? `?${suffix}` : ''}`;
  },
  account: (id: Guid) => `/api/platform-accounts/${encodeURIComponent(id)}`,
  assign: (id: Guid) => `/api/platform-accounts/${encodeURIComponent(id)}/assign`,
  release: (id: Guid) => `/api/platform-accounts/${encodeURIComponent(id)}/release`,
  history: (id: Guid) => `/api/platform-accounts/${encodeURIComponent(id)}/assignment-history`,
};
