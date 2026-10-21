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
}

export interface PlatformAccountDayUpdateRequest {
  // Array order specifies handover order. Include every eligible assignment once.
  assignments: Array<{
    assignmentId: string;
    figures?: PlatformAccountDayUsageInput | null;
    rowVersion?: string | null;
  }>;
  reason: string;
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
