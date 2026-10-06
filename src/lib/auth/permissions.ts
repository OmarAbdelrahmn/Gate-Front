export const PERMISSIONS = [
  // Security
  "users.read",
  "users.create",
  "users.update",
  "users.archive",
  "roles.read",
  "roles.create",
  "roles.update",
  "roles.delete",
  "permissions.read",
  "permissions.create",
  "permissions.update",
  "permissions.delete",
  "audit.read",
  "support_access.read",
  "support_access.create",
  "support_access.update",
  "support_access.delete",

  // Catalog
  "company_profile.read",
  "company_profile.create",
  "company_profile.update",
  "company_profile.delete",
  "operating_cities.read",
  "operating_cities.create",
  "operating_cities.update",
  "operating_cities.delete",
  "tags.read",
  "tags.create",
  "tags.update",
  "tags.delete",

  // Workforce
  "employees.read",
  "employees.create",
  "employees.update",
  "employees.archive",
  "employees.sensitive.read",
  "riders.read",
  "riders.create",
  "riders.update",
  "riders.delete",
  "external_riders.read",
  "external_riders.create",
  "external_riders.update",
  "external_riders.delete",
  "sponsors.read",
  "sponsors.create",
  "sponsors.update",
  "sponsors.delete",

  // Compliance
  "residency.read",
  "residency.create",
  "residency.update",
  "residency.delete",
  "licenses.read",
  "licenses.create",
  "licenses.update",
  "licenses.delete",
  "rider_cards.read",
  "rider_cards.create",
  "rider_cards.update",
  "rider_cards.delete",
  "health_cards.read",
  "health_cards.create",
  "health_cards.update",
  "health_cards.delete",
  "insurance.read",
  "insurance.create",
  "insurance.update",
  "insurance.delete",
  "promissory_notes.read",
  "promissory_notes.create",
  "promissory_notes.update",
  "promissory_notes.delete",

  // Documents
  "documents.read",
  "documents.upload",
  "documents.download",
  "documents.download_sensitive",
  "documents.catalog.read",
  "documents.catalog.create",
  "documents.catalog.update",
  "documents.catalog.delete",

  // Operations
  "platform_accounts.read",
  "platform_accounts.create",
  "platform_accounts.update",
  "platform_accounts.delete",
  "platform_credentials.read",
  "platform_credentials.rotate",
  "platform_assignments.read",
  "platform_assignments.create",
  "platform_assignments.update",
  "platform_assignments.delete",
  "housing.read",
  "housing.create",
  "housing.update",
  "housing.delete",
  "phone_sims.read",
  "phone_sims.create",
  "phone_sims.update",
  "phone_sims.delete",

  // Jahez Platform
  "jahez.read",
  "jahez.handovers.read",
  "jahez.handovers.create",
  "jahez.handovers.update",
  "jahez.handovers.delete",
  "jahez.collections.read",
  "jahez.collections.create",
  "jahez.collections.update",
  "jahez.collections.delete",
  "jahez.requests.create",
  "jahez.requests.approve",
  "jahez.resets.approve",
  "jahez.earnings.read",
  "jahez.earnings.create",
  "jahez.earnings.update",
  "jahez.earnings.delete",
  "jahez.imports.read",
  "jahez.imports.create",
  "jahez.imports.update",
  "jahez.imports.delete",
  "jahez.adjustments.read",
  "jahez.adjustments.create",
  "jahez.adjustments.update",
  "jahez.adjustments.delete",
  "jahez.cashbox.read",
  "jahez.cashbox.submit",
  "jahez.cashbox.confirm",
  "jahez.cashbox.approve",

  // Reporting
  "reports.read",
  "exports.create",
  "notifications.read",
  "notifications.create",
  "notifications.update",
  "notifications.delete",

  // Fleet
  "fleet.vehicles.read",
  "fleet.vehicles.create",
  "fleet.vehicles.update",
  "fleet.vehicles.delete",
  "fleet.vehicles.archive",
  "fleet.vehicles.decommission",
  "fleet.assignments.read",
  "fleet.assignments.create",
  "fleet.assignments.update",
  "fleet.assignments.delete",
  "fleet.assignments.correct",
  "fleet.issues.read",
  "fleet.issues.create",
  "fleet.issues.update",
  "fleet.issues.delete",
  "fleet.compliance.read",
  "fleet.compliance.create",
  "fleet.compliance.update",
  "fleet.compliance.delete",
  "fleet.files.read",
  "fleet.files.upload",
  "fleet.files.download",
  "fleet.accidents.read",
  "fleet.accidents.report",
  "fleet.accidents.finalize",
  "fleet.accidents.download",
  "fleet.corrections.read",
  "fleet.corrections.create",
  "fleet.corrections.update",
  "fleet.corrections.delete",
  "fleet.registration_transitions.read",
  "fleet.registration_transitions.create",
  "fleet.registration_transitions.update",
  "fleet.registration_transitions.delete",
  "fleet.daily_distances.read",
  "fleet.daily_distances.create",
  "fleet.daily_distances.update",
  "fleet.daily_distances.delete",
  "fleet.daily_distances.import",

  // Fuel
  "fuel.read",
  "fuel.create",
  "fuel.update",
  "fuel.delete",
  "fuel.import",

  // Maintenance
  "maintenance.locations.read",
  "maintenance.locations.create",
  "maintenance.locations.update",
  "maintenance.locations.delete",
  "maintenance.work_orders.read",
  "maintenance.work_orders.create",
  "maintenance.work_orders.update",
  "maintenance.work_orders.delete",
  "maintenance.oil.read",
  "maintenance.oil.complete",
  "maintenance.external_jobs.read",
  "maintenance.external_jobs.create",
  "maintenance.external_jobs.update",
  "maintenance.external_jobs.delete",
  "maintenance.part_sales.read",
  "maintenance.part_sales.create",
  "maintenance.part_sales.update",
  "maintenance.part_sales.delete",
  "maintenance.customer_labor_charges.read",
  "maintenance.customer_labor_charges.create",
  "maintenance.customer_labor_charges.update",
  "maintenance.customer_labor_charges.delete",
  "maintenance.mechanic_labor_payments.read",
  "maintenance.mechanic_labor_payments.create",
  "maintenance.mechanic_labor_payments.update",
  "maintenance.mechanic_labor_payments.delete",
  "maintenance.profit_reports.read",
  "maintenance.profit_reports.export",

  // Inventory
  "inventory.items.read",
  "inventory.items.create",
  "inventory.items.update",
  "inventory.items.delete",
  "inventory.stock.read",
  "inventory.stock.move",
  "inventory.stock.adjust",
  "inventory.cost_layers.read",
  "inventory.receipts.read",
  "inventory.receipts.create",
  "inventory.receipts.update",
  "inventory.receipts.delete",
  "inventory.returns.read",
  "inventory.returns.create",
  "inventory.returns.update",
  "inventory.returns.delete",
  "inventory.supply_requests.submit",
  "inventory.supply_requests.read",
  "inventory.supply_requests.approve",

  // Workflows
  "leave_requests.read",
  "leave_requests.create",
  "leave_requests.update",
  "leave_requests.delete",
  "leave_requests.approve",
  "absence_cases.read",
  "absence_cases.create",
  "absence_cases.update",
  "absence_cases.delete",
  "employee_status_changes.read",
  "employee_status_changes.create",
  "employee_status_changes.update",
  "employee_status_changes.delete",
  "employee_status_changes.approve",

  // HR forms
  "hr_forms.templates.read",
  "hr_forms.templates.create",
  "hr_forms.templates.update",
  "hr_forms.templates.delete",

  // Legal cases
  "legal_cases.read",
  "legal_cases.create",
  "legal_cases.update",
  "legal_cases.delete",
  "legal_cases.files.download",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type UserStatus =
  | "PendingTemporaryPassword"
  | "Active"
  | "Locked"
  | "Suspended"
  | "Archived";

export type AuthorizationSnapshot = {
  userId?: string;
  status?: UserStatus;
  requiresPasswordChange?: boolean;
  authorizationVersion: number;
  permissions?: string[];
  effectivePermissions?: string[];
  effectivePermissionKeys?: string[];
  roles?: string[];
  directGrants?: string[];
  directPermissions?: any[];
  directDenies?: string[];
  deniedPermissionKeys?: string[];
  isAllHousingScope?: boolean;
  isAllClientScope?: boolean;
  includesFuturePlatformContracts?: boolean;
  scopes?: any[];
};

export function hasPermission(
  snapshot: AuthorizationSnapshot | null,
  permission: string,
): boolean {
  if (!snapshot || typeof permission !== "string" || !permission.trim()) return false;
  if (snapshot.status && snapshot.status !== "Active") return false;
  if (snapshot.requiresPasswordChange) return false;
  const denied = new Set(
    snapshot.deniedPermissionKeys ?? snapshot.directDenies ?? [],
  );
  if (denied.has(permission)) return false;
  const perms =
    snapshot.effectivePermissionKeys ??
    snapshot.effectivePermissions ??
    snapshot.permissions ??
    [];
  return perms.includes(permission);
}

export function hasAllPermissions(
  snapshot: AuthorizationSnapshot | null,
  ...permissions: string[]
): boolean {
  return permissions.every((p) => hasPermission(snapshot, p));
}

export function hasAnyPermission(
  snapshot: AuthorizationSnapshot | null,
  ...permissions: string[]
): boolean {
  return permissions.some((p) => hasPermission(snapshot, p));
}
