import type { PermissionCatalogItem } from "./users/types";
export const permissionGroups = [
  "Security",
  "Workforce",
  "Compliance",
  "Documents",
  "Operations",
  "Fleet",
  "Maintenance",
  "Workflows",
] as const;
export type PermissionGroup = (typeof permissionGroups)[number];
const labels: Record<PermissionGroup, { ar: string; en: string }> = {
  Security: { ar: "الأمن", en: "Security" },
  Workforce: { ar: "القوى العاملة", en: "Workforce" },
  Compliance: { ar: "الالتزام", en: "Compliance" },
  Documents: { ar: "المستندات", en: "Documents" },
  Operations: { ar: "العمليات", en: "Operations" },
  Fleet: { ar: "الأسطول", en: "Fleet" },
  Maintenance: { ar: "الصيانة والمخزون والورش", en: "Maintenance, Inventory & Workshops" },
  Workflows: { ar: "مسارات العمل", en: "Workflows" },
};
export function permissionGroup(key: string): PermissionGroup {
  if (/^(users|roles|permissions|audit|support_access)\./.test(key))
    return "Security";
  if (/^(employees|riders|sponsors)\./.test(key)) return "Workforce";
  if (
    /^(residency|licenses|rider_cards|health_cards|insurance|promissory_notes)\./.test(
      key,
    )
  )
    return "Compliance";
  if (key.startsWith("documents.")) return "Documents";
  if (key.startsWith("fleet.") || key.startsWith("phone_sims.") || key.startsWith("fuel.")) return "Fleet";
  if (key.startsWith("maintenance.") || key.startsWith("inventory.")) return "Maintenance";
  if (/^(leave_requests|absence_cases|employee_status_changes|hr_forms)\./.test(key))
    return "Workflows";
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
