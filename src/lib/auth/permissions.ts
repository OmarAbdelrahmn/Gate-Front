export const PERMISSIONS = [
  // Security
  "users.read",
  "users.create",
  "users.update",
  "users.archive",
  "roles.read",
  "roles.manage",
  "permissions.read",
  "permissions.manage",
  "audit.read",
  "support_access.manage",

  // Catalog
  "company_profile.read",
  "company_profile.manage",
  "operating_cities.read",
  "operating_cities.manage",
  "tags.read",
  "tags.manage",

  // Workforce
  "employees.read",
  "employees.create",
  "employees.update",
  "employees.archive",
  "employees.sensitive.read",
  "riders.read",
  "riders.manage",
  "sponsors.read",
  "sponsors.manage",

  // Compliance
  "residency.read",
  "residency.manage",
  "licenses.read",
  "licenses.manage",
  "rider_cards.read",
  "rider_cards.manage",
  "health_cards.read",
  "health_cards.manage",
  "insurance.read",
  "insurance.manage",
  "promissory_notes.read",
  "promissory_notes.manage",

  // Documents
  "documents.read",
  "documents.upload",
  "documents.download",
  "documents.download_sensitive",
  "documents.catalog.manage",

  // Operations
  "platform_accounts.read",
  "platform_accounts.manage",
  "platform_credentials.read",
  "platform_credentials.rotate",
  "platform_assignments.read",
  "platform_assignments.manage",
  "housing.read",
  "housing.manage",
  "phone_sims.read",
  "phone_sims.manage",

  // Reporting
  "reports.read",
  "exports.create",
  "notifications.read",
  "notifications.manage",

  // Fleet
  "fleet.vehicles.read",
  "fleet.vehicles.manage",
  "fleet.vehicles.archive",
  "fleet.vehicles.decommission",
  "fleet.assignments.read",
  "fleet.assignments.manage",
  "fleet.assignments.correct",
  "fleet.issues.read",
  "fleet.issues.manage",
  "fleet.compliance.read",
  "fleet.compliance.manage",
  "fleet.files.read",
  "fleet.files.upload",
  "fleet.files.download",
  "fleet.accidents.read",
  "fleet.accidents.report",
  "fleet.accidents.finalize",
  "fleet.accidents.download",
  "fleet.corrections.manage",
  "fleet.registration_transitions.manage",
  "fleet.daily_distances.read",
  "fleet.daily_distances.manage",
  "fleet.daily_distances.import",

  // Fuel
  "fuel.read",
  "fuel.manage",
  "fuel.import",

  // Maintenance
  "maintenance.locations.read",
  "maintenance.locations.manage",
  "maintenance.work_orders.read",
  "maintenance.work_orders.manage",
  "maintenance.oil.read",
  "maintenance.oil.complete",
  "maintenance.external_jobs.read",
  "maintenance.external_jobs.manage",
  "maintenance.part_sales.manage",
  "maintenance.customer_labor_charges.manage",
  "maintenance.mechanic_labor_payments.manage",
  "maintenance.profit_reports.read",
  "maintenance.profit_reports.export",

  // Inventory
  "inventory.items.read",
  "inventory.items.manage",
  "inventory.stock.read",
  "inventory.stock.move",
  "inventory.stock.adjust",
  "inventory.cost_layers.read",
  "inventory.receipts.manage",
  "inventory.returns.manage",
  "inventory.supply_requests.submit",
  "inventory.supply_requests.read",
  "inventory.supply_requests.approve",

  // Workflows
  "leave_requests.read",
  "leave_requests.manage",
  "leave_requests.approve",
  "absence_cases.read",
  "absence_cases.manage",
  "employee_status_changes.read",
  "employee_status_changes.manage",
  "employee_status_changes.approve",

  // HR forms
  "hr_forms.templates.read",
  "hr_forms.templates.manage",
] as const;
export type Permission=typeof PERMISSIONS[number]; export type UserStatus="PendingTemporaryPassword"|"Active"|"Locked"|"Suspended"|"Archived";
export type AuthorizationSnapshot={userId?:string;status?:UserStatus;requiresPasswordChange?:boolean;authorizationVersion:number;permissions?:string[];effectivePermissions?:string[];effectivePermissionKeys?:string[];roles?:string[];directGrants?:string[];directPermissions?:string[];directDenies?:string[];deniedPermissionKeys?:string[]};
export function hasPermission(snapshot:AuthorizationSnapshot|null,permission:string){if(!snapshot)return false;if(snapshot.status&&snapshot.status!=="Active")return false;if(snapshot.requiresPasswordChange)return false;const denied=new Set(snapshot.deniedPermissionKeys??snapshot.directDenies??[]);return !denied.has(permission)&&(snapshot.effectivePermissionKeys??snapshot.effectivePermissions??snapshot.permissions??[]).includes(permission);}
