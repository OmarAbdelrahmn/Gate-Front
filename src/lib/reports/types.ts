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
