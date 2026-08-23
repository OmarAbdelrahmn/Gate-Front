import labels from "../locales/permissions.ar.json";

export function permissionLabel(permissionKey: string) {
  return (labels as Record<string, string>)[permissionKey] ?? "صلاحية غير معرّفة";
}
