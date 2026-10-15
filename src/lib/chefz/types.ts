// src/lib/chefz/types.ts

export type Guid = string;
export type DateOnly = string; // YYYY-MM-DD
export type RowVersion = string;
export type ChefzAccountType = "Freelancer" | "FullTime" | "Unconfigured";
export type ChefzVehicleType = "Car" | "Motorcycle" | "Unknown";
export type ChefzAccountStatus = "Available" | "Assigned" | "Suspended" | "Retired" | "Archived";
export type PlatformPaymentModel = "PayPerOrder" | "Salary";

export interface ChefzPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount?: number;
}

export interface ChefzAccountCounts {
  total: number;
  /** Accounts with an open rider link, including those in a manual lifecycle status. */
  taken: number;
  notTaken: number;
  available: number;
  assigned: number;
  suspended: number;
  retired: number;
  archived: number;
}

export interface ChefzSponsorAccountCounts {
  sponsorId: Guid | null;
  sponsorNameAr: string;
  sponsorNameEn: string | null;
  counts: ChefzAccountCounts;
}

export interface ChefzAccountsResponse extends ChefzPage<ChefzAccount> {
  totalCount: number;
  summary: ChefzAccountCounts;
  sponsors: ChefzSponsorAccountCounts[];
}

export interface ChefzAccountDetailsRequest {
  accountType: "Freelancer" | "FullTime";
  reportIdNumber?: string | null;
  rowVersion?: string | null;
  vehicleType?: "Car" | "Motorcycle";
  dashboardStatus?: string | null;
}

export interface ChefzAccountStatusRequest {
  status: "Active" | "Suspended" | "Retired" | "Archived";
  /** The accountRowVersion from ChefzAccountResponse; not its details rowVersion. */
  rowVersion: RowVersion;
  reason?: string | null;
}

export interface ChefzAccount {
  accountId: Guid;
  externalAccountId: string;
  reportIdNumber: string;
  accountType: ChefzAccountType;
  commissionRate: number;
  dailyFee: number;
  hasPassword: boolean;
  rowVersion: string; // details rowVersion
  sponsorId?: Guid | null;
  operatingCityId?: Guid | null;
  vehicleType?: ChefzVehicleType;
  dashboardStatus?: string | null;
  status: ChefzAccountStatus;
  statusReason: string | null;
  accountRowVersion: RowVersion;
  isOperationallyBlocked: boolean;
  operationalBlockReason: string | null;
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
  // Order settlement source & financial breakdown fields
  source?: "Wallet" | "Orders";
  importId?: Guid | null;
  sourceRows?: number;
  deliveryFees?: number;
  vatAmount?: number;
  deliveryFeesAfterVat?: number;
  tips?: number;
  compensation?: number;
  bonuses?: number;
  deductions?: number;
}

export type {
  ChefzProblemDetails,
  ChefzOrderSettlementResponse,
  ChefzRiderCycleSettlement,
  ChefzOrderSettlementImportResponse,
} from "./chefz-new-endpoints-contracts";

export interface ChefzPerformance {
  id: Guid;
  accountId: Guid;
  externalAccountId?: string;
  assignmentId: Guid;
  riderProfileId: Guid;
  riderName?: string;
  reportDate: DateOnly;
  reportIdNumber: string;
  totalValidOffers: number;
  acceptedOffers: number;
  declinedOffers: number;
  missedOffers: number;
  acceptanceRate: number;
}

export interface ChefzPerformanceResponse extends ChefzPerformance {
  externalAccountId: string;
  riderName: string;
}

export interface ChefzPerformanceRider {
  riderProfileId: Guid;
  riderName: string;
  accounts: ChefzPerformance[];
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
  riders: ChefzPerformanceRider[];
}

export type ChefzImportResponse = ChefzImportResult;

// -------------------------------------------------------------
// 1. Performance Settings
// -------------------------------------------------------------
export interface ChefzSettings {
  overallAOrders: number;
  overallBOrders: number;
  overallCOrders: number;
  dailyAOrders: number;
  dailyBOrders: number;
  dailyCOrders: number;
  aAcceptanceRate: number;
  bAcceptanceRate: number;
  cAcceptanceRate: number;
  changeAfterNoOrderDays: number;
  followUpOnZeroOrdersWithMissedOffers: boolean;
  rowVersion: string;
}

export interface ChefzSettingsResponse {
  settings: ChefzSettings;
  rowVersion: string;
}

export type ChefzSettingsRequest = ChefzSettings;

// -------------------------------------------------------------
// 2. Rider / Account Performance Report
// -------------------------------------------------------------
export interface ChefzReportHalf {
  from: DateOnly;
  to: DateOnly;
  daysWithData: number;
  orders: number;
  acceptanceRate: number | null;
  rating: string | null;
  message: string | null;
}

export interface ChefzReportSummary {
  halvesWithData: number;
  daysWithData: number;
  orders: number;
  averageOrdersPerHalf: number | null;
  acceptanceRate: number | null;
  rating: string | null;
}

export interface ChefzReportDaily {
  date: DateOnly;
  orders: number;
  validOffers: number;
  missedOffers: number;
  acceptanceRate: number | null;
  rating: string | null;
}

export interface ChefzAccountPerformanceReport {
  accountId: Guid;
  externalAccountId: string;
  riderProfileId: Guid;
  riderName: string;
  /** Summary for this account/rider in the requested period. */
  summary: ChefzReportSummary;
  daily: ChefzPerformance[];
}

export interface ChefzRiderReport {
  accountId: Guid | null;
  riderId: Guid | null;
  requestedHalves: number;
  halves: ChefzReportHalf[];
  selectedSummary: ChefzReportSummary;
  allTimeSummary: ChefzReportSummary;
  daily: ChefzReportDaily[];
  messages: string[];
  accounts?: ChefzAccountPerformanceReport[];
}

// -------------------------------------------------------------
// 3. Sponsor Statistics
// -------------------------------------------------------------
export interface ChefzStatisticsValues {
  sponsorshipCount: number;
  working: number;
  notWorking: number;
  blocked: number;
  permanentlyBlocked: number;
  updateBlocked: number;
  uploaded: number;
  privateLicense: number;
  pendingUpload: number;
  noLicense: number;
  managementSuspended: number;
  motorcycle: number;
  workingOutsideSponsorship: number;
  workingWithoutPerformance: number | null;
  rowVersion?: string;
}

export interface ChefzStatisticsResponse {
  id: Guid;
  sponsorId: Guid;
  sponsorNameAr: string;
  values: ChefzStatisticsValues;
  rowVersion: string;
}

export type ChefzStatisticsRequest = ChefzStatisticsValues;

// -------------------------------------------------------------
// 4. Management Report
// -------------------------------------------------------------
export interface ChefzManagementReport {
  sponsorId: Guid;
  sponsorNameAr: string;
  application: string;
  reportDate: DateOnly;
  performanceDate: DateOnly;
  cycleFrom: DateOnly;
  cycleOrders: number;
  accountsBelowThreeOrdersInCycle: number;
  ridersWithOrdersYesterday: number;
  ridersWithThreeOrFewerOrdersYesterday: number;
  ridersWithMoreThanThreeOrdersYesterday: number;
}

// -------------------------------------------------------------
// 5. Account Reminders
// -------------------------------------------------------------
export interface ChefzAccountReminder {
  accountId: Guid;
  ownerEmployeeId: string;
  ownerName: string;
  ownerStatus: string;
  condition: "OutsideSponsorship" | "FinalExit";
  message: string;
}

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

export interface ApiProblem {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errorCode?: string;
  correlationId?: string;
  field?: string;
  errors?: Record<string, string[]>;
  assignmentLimit?: PlatformAssignmentLimit;
}

export type ChefzOperationProblem = ApiProblem;
