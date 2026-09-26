import { authFetch } from "@/lib/auth/api";
import type {
  SystemDashboardReport,
  HrDashboardReport,
  PeopleComplianceDashboardReport,
  FleetDashboardReport,
  OperationsDashboardReport,
  MaintenanceInventoryDashboardReport,
} from "@/lib/reports/types";

/**
 * System Overview Dashboard Report
 * GET /api/reports/dashboard
 * Aggregates summary cards from every operational module.
 */
export async function getSystemDashboardReport(): Promise<SystemDashboardReport> {
  return authFetch<SystemDashboardReport>("/api/reports/dashboard");
}

/**
 * HR Dashboard Report
 * GET /api/reports/hr/dashboard
 * Headcount summary, sponsor breakdowns, and platform rider coverage.
 */
export async function getHrDashboardReport(): Promise<HrDashboardReport> {
  return authFetch<HrDashboardReport>("/api/reports/hr/dashboard");
}

/**
 * People & Compliance Dashboard Report
 * GET /api/reports/people-compliance/dashboard
 * Compliance and HR workflow counters.
 */
export async function getPeopleComplianceDashboardReport(): Promise<PeopleComplianceDashboardReport> {
  return authFetch<PeopleComplianceDashboardReport>("/api/reports/people-compliance/dashboard");
}

/**
 * Fleet Dashboard Report
 * GET /api/reports/fleet/dashboard
 * Fleet operations, vehicle states, issues, and accidents.
 */
export async function getFleetDashboardReport(): Promise<FleetDashboardReport> {
  return authFetch<FleetDashboardReport>("/api/reports/fleet/dashboard");
}

/**
 * Operations Dashboard Report
 * GET /api/reports/operations/dashboard
 * Platform accounts, housing capacity/occupancy, phone SIMs, and fuel cards.
 */
export async function getOperationsDashboardReport(): Promise<OperationsDashboardReport> {
  return authFetch<OperationsDashboardReport>("/api/reports/operations/dashboard");
}

/**
 * Maintenance & Inventory Dashboard Report
 * GET /api/reports/maintenance-inventory/dashboard
 * Workshop orders, parts inventory value, stock balances, and supply requests.
 */
export async function getMaintenanceInventoryDashboardReport(): Promise<MaintenanceInventoryDashboardReport> {
  return authFetch<MaintenanceInventoryDashboardReport>("/api/reports/maintenance-inventory/dashboard");
}

/**
 * Vehicle Assignments Period Report
 * GET /api/reports/fleet/vehicle-assignments?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
 * Inclusive Riyadh calendar dates (UTC+03:00).
 */
export async function getVehicleAssignmentsPeriodReport(
  fromDate: string,
  toDate: string
): Promise<import("./types").VehicleAssignmentsPeriodReport> {
  const query = new URLSearchParams({ fromDate, toDate });
  return authFetch<import("./types").VehicleAssignmentsPeriodReport>(
    `/api/reports/fleet/vehicle-assignments?${query.toString()}`
  );
}

/**
 * Rider Assignments Period Report
 * GET /api/reports/fleet/rider-assignments?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
 * Inclusive Riyadh calendar dates (UTC+03:00).
 */
export async function getRiderAssignmentsPeriodReport(
  fromDate: string,
  toDate: string
): Promise<import("./types").RiderAssignmentsPeriodReport> {
  const query = new URLSearchParams({ fromDate, toDate });
  return authFetch<import("./types").RiderAssignmentsPeriodReport>(
    `/api/reports/fleet/rider-assignments?${query.toString()}`
  );
}
