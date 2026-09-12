import type { PermissionCatalogItem } from "./users/types";
export const permissionGroups = [
  "Security",
  "Catalog",
  "Workforce",
  "Compliance",
  "Documents",
  "Operations",
  "Reporting",
  "Fleet",
  "Fuel",
  "Maintenance",
  "Inventory",
  "Workflows",
  "HR forms",
] as const;
export type PermissionGroup = (typeof permissionGroups)[number];
const labels: Record<PermissionGroup, { ar: string; en: string }> = {
  Security: { ar: "الأمن والنظام", en: "Security" },
  Catalog: { ar: "دليل وبيانات الشركة", en: "Catalog" },
  Workforce: { ar: "القوى العاملة", en: "Workforce" },
  Compliance: { ar: "الالتزام والوثائق", en: "Compliance" },
  Documents: { ar: "المستندات", en: "Documents" },
  Operations: { ar: "العمليات والتشغيل", en: "Operations" },
  Reporting: { ar: "التقارير والإشعارات", en: "Reporting" },
  Fleet: { ar: "الأسطول", en: "Fleet" },
  Fuel: { ar: "الوقود", en: "Fuel" },
  Maintenance: { ar: "الصيانة والورش", en: "Maintenance" },
  Inventory: { ar: "المخزون وقطع الغيار", en: "Inventory" },
  Workflows: { ar: "مسارات العمل", en: "Workflows" },
  "HR forms": { ar: "نماذج الموارد البشرية", en: "HR Forms" },
};
export function permissionGroup(key: string): PermissionGroup {
  if (/^(users|roles|permissions|audit|support_access)\./.test(key)) return "Security";
  if (/^(company_profile|operating_cities|tags)\./.test(key)) return "Catalog";
  if (/^(employees|riders|sponsors)\./.test(key)) return "Workforce";
  if (/^(residency|licenses|rider_cards|health_cards|insurance|promissory_notes)\./.test(key)) return "Compliance";
  if (key.startsWith("documents.")) return "Documents";
  if (/^(platform_accounts|platform_credentials|platform_assignments|housing|phone_sims)\./.test(key)) return "Operations";
  if (/^(reports|exports|notifications)\./.test(key)) return "Reporting";
  if (key.startsWith("fleet.")) return "Fleet";
  if (key.startsWith("fuel.")) return "Fuel";
  if (key.startsWith("maintenance.")) return "Maintenance";
  if (key.startsWith("inventory.")) return "Inventory";
  if (/^(leave_requests|absence_cases|employee_status_changes)\./.test(key)) return "Workflows";
  if (key.startsWith("hr_forms.")) return "HR forms";
  return "Operations";
}
export function permissionGroupLabel(group: PermissionGroup, locale: "ar" | "en" = "ar") {
  return labels[group]?.[locale] ?? group;
}
export function groupPermissions<T extends Pick<PermissionCatalogItem, "key">>(
  items: T[],
) {
  return permissionGroups
    .map(
      (group) =>
        [
          group,
          items.filter((item) => permissionGroup(item.key) === group),
        ] as const,
    )
    .filter(([, items]) => items.length > 0);
}
