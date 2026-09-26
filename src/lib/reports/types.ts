export type HrHeadcountSummary = {
  totalPeople: number;
  totalEmployees: number;
  totalRiders: number;
  activePeople: number;
  activeEmployees: number;
  activeRiders: number;
  peopleWithoutSponsor: number;
  activeRidersWithoutAnyPlatformAccount: number;
  activeRiderPlatformCoverageGaps: number;
};

export type SponsorHeadcount = {
  sponsorId: string;
  sponsorNameAr: string;
  sponsorNameEn: string | null;
  status: "Active" | "Disabled" | "Archived";
  totalPeople: number;
  employees: number;
  riders: number;
  activePeople: number;
  activeEmployees: number;
  activeRiders: number;
};

export type PlatformCoverage = {
  platformId: string;
  platformCode: string;
  platformNameAr: string;
  platformNameEn: string;
  operationalAccountCount: number;
  assignedAccountCount: number;
  activeRidersWithAccount: number;
  activeRidersWithoutAccount: number;
};

export type HrDashboardReport = {
  generatedAtUtc: string;
  headcount: HrHeadcountSummary;
  sponsors: SponsorHeadcount[];
  activePlatforms: PlatformCoverage[];
};

export type PeopleComplianceDashboard = {
  payrollEmployees: number;
  activeEmployeeDocuments: number;
  expiredEmployeeDocuments: number;
  activeDriverLicenses: number;
  expiredDriverLicenses: number;
  activeMedicalInsurancePolicies: number;
  pendingLeaveRequests: number;
  activeLeaveRequests: number;
  openAbsenceComplianceCases: number;
};

export type PeopleComplianceDashboardReport = {
  generatedAtUtc?: string;
} & PeopleComplianceDashboard;

export type FleetDashboard = {
  totalVehicles: number;
  availableVehicles: number;
  assignedVehicles: number;
  heldVehicles: number;
  decommissionedVehicles: number;
  activeRiderVehicleAssignments: number;
  openVehicleIssues: number;
  unclosedAccidents: number;
};

export type FleetDashboardReport = {
  generatedAtUtc?: string;
} & FleetDashboard;

export type OperationsDashboard = {
  activePlatforms: number;
  operationalPlatformAccounts: number;
  assignedPlatformAccounts: number;
  activeHousingLocations: number;
  totalActiveHousingCapacity: number;
  currentHousingResidents: number;
  totalPhoneSims: number;
  availablePhoneSims: number;
  assignedPhoneSims: number;
  phoneSimsNeedingAttention: number;
  totalFuelCards: number;
  assignedFuelCards: number;
};

export type OperationsDashboardReport = {
  generatedAtUtc?: string;
} & OperationsDashboard;

export type MaintenanceInventoryDashboard = {
  activeMaintenanceLocations: number;
  activeInventoryItems: number;
  stockBalanceRecords: number;
  lowStockItems: number;
  inventoryValue: number;
  openWorkOrders: number;
  inProgressWorkOrders: number;
  pendingSupplyRequests: number;
};

export type MaintenanceInventoryDashboardReport = {
  generatedAtUtc?: string;
} & MaintenanceInventoryDashboard;

export type SystemDashboardReport = {
  generatedAtUtc: string;
  hr: HrHeadcountSummary;
  peopleCompliance: PeopleComplianceDashboard;
  fleet: FleetDashboard;
  operations: OperationsDashboard;
  maintenanceInventory: MaintenanceInventoryDashboard;
};

// ==========================================
// Vehicle & Rider Assignment Period Reports
// ==========================================

export type Guid = string;
export type CalendarDate = string; // YYYY-MM-DD
export type IsoTimestamp = string; // ISO 8601 with an explicit offset

export interface VehicleAssignmentsPeriodReport {
  fromDate: CalendarDate;
  toDate: CalendarDate;
  asOfUtc: IsoTimestamp;
  vehicles: VehicleAssignmentsPeriodRow[];
}

export interface VehicleAssignmentsPeriodRow {
  vehicleId: Guid;
  assetNumber: string;
  serialNumber: string | null;
  plateNumberAr: string | null;
  totalDaysAssignedInPeriod: number;
  assignments: VehicleRiderPeriodAssignment[];
}

export interface RiderAssignmentsPeriodReport {
  fromDate: CalendarDate;
  toDate: CalendarDate;
  asOfUtc: IsoTimestamp;
  riders: RiderAssignmentsPeriodRow[];
}

export interface RiderAssignmentsPeriodRow {
  riderKey: string;
  riderProfileId: Guid | null;
  riderName: string | null;
  riderIqamaNo: string | null;
  totalDaysWithVehiclesInPeriod: number;
  assignments: VehicleRiderPeriodAssignment[];
}

export interface VehicleRiderPeriodAssignment {
  assignmentId: Guid;
  vehicleId: Guid;
  assetNumber: string;
  serialNumber: string | null;
  plateNumberAr: string | null;
  assignedRiderProfileId: Guid;
  assignedEmployeeId: Guid | null;
  assignedRiderName: string | null;
  assignedRiderIqamaNo: string | null;
  isRealRider: boolean;
  actualRiderId: Guid | null;
  actualRiderName: string | null;
  actualRiderIqamaNo: string | null;
  relationshipToAssignedRider: string | null;
  startedAtUtc: IsoTimestamp;
  endedAtUtc: IsoTimestamp | null;
  periodStartedAtUtc: IsoTimestamp;
  periodEndedAtUtc: IsoTimestamp;
  daysInPeriod: number;
  totalAssignmentDays: number;
}
