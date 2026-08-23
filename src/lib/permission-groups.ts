import type { PermissionCatalogItem } from "./users/types";
export const permissionGroups = [
  "Security",
  "Workforce",
  "Compliance",
  "Documents",
  "Operations",
  "Fleet",
  "Workflows",
] as const;
export type PermissionGroup = (typeof permissionGroups)[number];
const labels: Record<PermissionGroup, string> = {
  Security: "الأمن",
  Workforce: "القوى العاملة",
  Compliance: "الالتزام",
  Documents: "المستندات",
  Operations: "العمليات",
  Fleet: "الأسطول",
  Workflows: "مسارات العمل",
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
  if (key.startsWith("fleet.")) return "Fleet";
  if (/^(leave_requests|absence_cases|employee_status_changes)\./.test(key))
    return "Workflows";
  return "Operations";
}
export function permissionGroupLabel(group: PermissionGroup) {
  return labels[group];
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
