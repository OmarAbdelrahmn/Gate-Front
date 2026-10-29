export interface PlatformAccountDayUsageInput {
  ordersCount?: number | null;
  workingHours?: number | null;
  collectedAmount?: number | null;
  deductionsAmount?: number | null;
  totalValidOffers?: number | null;
  declinedOffers?: number | null;
  missedOffers?: number | null;
}

// Add this optional property to generic release/close, Ninja return, and
// Jahez withdrawal/settle-and-withdraw create/update inputs.
export interface WithDayUsage {
  dayUsage?: PlatformAccountDayUsageInput | null;
}

export interface PlatformAccountDayParticipant {
  assignmentId: string;
  riderProfileId: string;
  sequence: number | null;
  figures: PlatformAccountDayUsageInput;
  rowVersion: string | null;
  missingFields: string[];
}

export interface PlatformAccountDayResponse {
  accountId: string;
  businessDate: string; // Riyadh YYYY-MM-DD
  assignments: PlatformAccountDayParticipant[];
  contributions?: PlatformDayContribution[];
}

export interface PlatformAccountDayUpdateRequest {
  // Array order specifies handover order. Include every eligible assignment once.
  assignments: Array<{
    assignmentId: string;
    figures?: PlatformAccountDayUsageInput | null;
    rowVersion?: string | null;
  }>;
  reason: string;
  contributions?: PreviousDayUsageInput[] | null;
}

export interface JahezResolvedDispatchAllocation {
  rowId: string;
  handoverId: string;
  count: number;
  reason: string;
}

// Jahez import previews now also expose resolvedAllocations, including automatic splits.
export interface WithResolvedDispatchAllocations {
  resolvedAllocations: JahezResolvedDispatchAllocation[];
}

// Send with generic assign, legacy assignment create, Ninja assign, and Jahez handover.
// FreeSwitch approval accepts this on the approval decision body.
export interface WithPreviousDayUsages {
  previousDayUsages?: PreviousDayUsageInput[] | null;
}

export interface PreviousDayUsageInput {
  assignmentIds: string[]; // exact ordered membership from assignment-context
  figures: PlatformAccountDayUsageInput; // send complete object; ordersCount required for prior riders
  rowVersion: string | null;
  usageRowVersions: Record<string, string | null>;
}

export interface PlatformDayContribution {
  assignmentIds: string[];
  riderProfileId: string;
  riderNameAr: string;
  figures: PlatformAccountDayUsageInput;
  rowVersion: string | null;
  usageRowVersions: Record<string, string | null>;
  missingRequiredFields: string[];
  missingOptionalFields: string[];
}

export interface PlatformAssignmentContext {
  accountId: string;
  businessDate: string;
  riderProfileId: string;
  requiresPreviousUsage: boolean;
  contributions: PlatformDayContribution[];
}

export interface MonthlyAccountUsage {
  monthlyUsageStatus: 'Used' | 'Unused';
  usageMonth: string; // current Riyadh Gregorian month, YYYY-MM
}
