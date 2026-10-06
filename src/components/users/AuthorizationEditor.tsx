"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Search, ShieldCheck, X, House, Layers, CheckCircle2, Sparkles, AlertTriangle } from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import {
  getFamilyForPermissionKey,
  MANAGEMENT_PERMISSION_FAMILIES,
  PermissionFamily,
} from "../../lib/auth/management-permissions";
import { getUserAuthorization } from "../../lib/auth/authorization-api";
import { permissionLabel } from "../../lib/permission-labels";
import {
  groupPermissions,
  permissionGroup,
  permissionGroupLabel,
} from "../../lib/permission-groups";
import { translate } from "../../lib/i18n";
import {
  getPermissionCatalogue,
  listRoles,
  replaceUserPermissions,
  replaceUserRoles,
  getRolePermissionKeys,
} from "../../lib/users/api";
import type {
  AuthorizationScopeRequest,
  ManagedDirectPermissionAssignmentRequest,
  ManagedRoleAssignmentRequest,
  PermissionCatalogItem,
  Role,
} from "../../lib/users/types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { toast } from "../ui/Toast";

type ExistingRole = ManagedRoleAssignmentRequest & { roleId: string; roleCode?: string };
type ExistingPermission = ManagedDirectPermissionAssignmentRequest;

export interface PermissionConflict {
  permissionKey: string;
  reason: string;
}

export interface PermissionValidationError {
  permissionKey: string;
  field: "permissionKey" | "effect" | "reason" | "startsAtUtc" | "expiresAtUtc" | "scopes";
  message: string;
}

const legacyFamilyByPreviousKey = new Map<string, PermissionFamily>();
for (const fam of MANAGEMENT_PERMISSION_FAMILIES) {
  if (fam.previousKey) {
    legacyFamilyByPreviousKey.set(fam.previousKey.toLowerCase(), fam);
  }
  legacyFamilyByPreviousKey.set(`${fam.family.toLowerCase()}.manage`, fam);
}

function areScopesEqual(
  s1: AuthorizationScopeRequest[] | null | undefined,
  s2: AuthorizationScopeRequest[] | null | undefined,
): boolean {
  const arr1 = s1 ?? [];
  const arr2 = s2 ?? [];
  if (arr1.length !== arr2.length) return false;
  const sig1 = arr1.map((x) => `${x.type}:${x.targetId}`).sort().join("|");
  const sig2 = arr2.map((x) => `${x.type}:${x.targetId}`).sort().join("|");
  return sig1 === sig2;
}

export function normalizeDirectPermissions(
  rawList: (ExistingPermission | any)[],
  catalog: PermissionCatalogItem[],
  fallbackScopes: {
    isAllHousingScope: boolean;
    isAllClientScope: boolean;
    includesFuturePlatformContracts: boolean;
  },
): {
  normalized: ManagedDirectPermissionAssignmentRequest[];
  conflicts: PermissionConflict[];
  unknownKeys: string[];
} {
  const expanded: ManagedDirectPermissionAssignmentRequest[] = [];
  const unknownKeySet = new Set<string>();
  const catalogKeys = new Set(catalog.map((c) => c.key));

  for (const raw of rawList) {
    const rawKey = String(raw?.permissionKey ?? "").trim();
    if (!rawKey) continue;

    // Convert "Allow" -> "Grant", "Grant" -> "Grant", "Deny" -> "Deny", reject others
    let effect: "Grant" | "Deny";
    const rawEff = String(raw.effect ?? "Grant").trim();
    if (rawEff.toLowerCase() === "allow" || rawEff.toLowerCase() === "grant") {
      effect = "Grant";
    } else if (rawEff.toLowerCase() === "deny") {
      effect = "Deny";
    } else {
      throw {
        permissionKey: rawKey,
        field: "effect",
        message: `Invalid effect "${rawEff}". Expected "Grant" or "Deny".`,
      } as PermissionValidationError;
    }

    const baseItem: ManagedDirectPermissionAssignmentRequest = {
      permissionKey: rawKey,
      effect,
      startsAtUtc: raw.startsAtUtc ?? null,
      expiresAtUtc: raw.expiresAtUtc ?? null,
      reason: raw.reason ?? null,
      isAllHousingScope: raw.isAllHousingScope ?? fallbackScopes.isAllHousingScope,
      isAllClientScope: raw.isAllClientScope ?? fallbackScopes.isAllClientScope,
      includesFuturePlatformContracts:
        raw.includesFuturePlatformContracts ?? fallbackScopes.includesFuturePlatformContracts,
      scopes: Array.isArray(raw.scopes) ? [...raw.scopes] : [],
    };

    // Check if known legacy .manage key
    const legacyFam = legacyFamilyByPreviousKey.get(rawKey.toLowerCase());
    if (legacyFam) {
      // Replace with read, create, update, delete
      const actionKeys = [legacyFam.read, legacyFam.create, legacyFam.update, legacyFam.delete];
      for (const aKey of actionKeys) {
        expanded.push({
          ...baseItem,
          permissionKey: aKey,
          scopes: [...baseItem.scopes],
        });
      }
    } else {
      if (catalog.length > 0 && !catalogKeys.has(rawKey)) {
        unknownKeySet.add(rawKey);
      }
      expanded.push(baseItem);
    }
  }

  // Deduplicate and collapse equivalent assignments
  const grouped = new Map<string, ManagedDirectPermissionAssignmentRequest[]>();
  for (const item of expanded) {
    const list = grouped.get(item.permissionKey);
    if (list) {
      list.push(item);
    } else {
      grouped.set(item.permissionKey, [item]);
    }
  }

  const collapsed: ManagedDirectPermissionAssignmentRequest[] = [];
  const conflicts: PermissionConflict[] = [];

  for (const [key, items] of grouped.entries()) {
    if (items.length === 1) {
      collapsed.push(items[0]);
      continue;
    }

    const first = items[0];
    let hasConflict = false;
    let conflictReason = "";

    for (let i = 1; i < items.length; i++) {
      const curr = items[i];
      if (curr.effect !== first.effect) {
        hasConflict = true;
        conflictReason = `Conflicting effects (${first.effect} vs ${curr.effect})`;
        break;
      }
      const sameHousing = Boolean(curr.isAllHousingScope) === Boolean(first.isAllHousingScope);
      const sameClient = Boolean(curr.isAllClientScope) === Boolean(first.isAllClientScope);
      const sameFuture =
        Boolean(curr.includesFuturePlatformContracts) === Boolean(first.includesFuturePlatformContracts);
      const sameScopes = areScopesEqual(curr.scopes, first.scopes);

      if (!sameHousing || !sameClient || !sameFuture || !sameScopes) {
        hasConflict = true;
        conflictReason = `Conflicting access scopes or boundaries`;
        break;
      }
    }

    if (hasConflict) {
      conflicts.push({
        permissionKey: key,
        reason: conflictReason,
      });
      collapsed.push(first);
    } else {
      // Equivalent assignments collapsed into one single entry, preferring non-empty dates/reason
      const itemWithDates = items.find((x) => x.startsAtUtc || x.expiresAtUtc) || first;
      collapsed.push({
        ...first,
        startsAtUtc: itemWithDates.startsAtUtc,
        expiresAtUtc: itemWithDates.expiresAtUtc,
        reason: itemWithDates.reason || first.reason,
      });
    }
  }

  return {
    normalized: collapsed,
    conflicts,
    unknownKeys: Array.from(unknownKeySet),
  };
}

export function preparePermissionAssignments(
  assignPermissions: ExistingPermission[],
  catalog: PermissionCatalogItem[],
): ManagedDirectPermissionAssignmentRequest[] {
  // 1. Expand legacy keys, convert "Allow" to "Grant", collapse equivalents, check conflicts
  const { normalized, conflicts, unknownKeys } = normalizeDirectPermissions(
    assignPermissions,
    catalog,
    { isAllHousingScope: true, isAllClientScope: true, includesFuturePlatformContracts: true },
  );

  // 2. Block unknown keys with a clear message instead of silently dropping them
  if (unknownKeys.length > 0) {
    const firstUnknown = unknownKeys[0];
    throw {
      permissionKey: firstUnknown,
      field: "permissionKey",
      message: `Unknown permission key "${firstUnknown}". It is not supported by the permission catalog.`,
    } as PermissionValidationError;
  }

  // 3. Block conflicting assignments
  if (conflicts.length > 0) {
    const firstConf = conflicts[0];
    throw {
      permissionKey: firstConf.permissionKey,
      field: "permissionKey",
      message: `Conflict detected for "${firstConf.permissionKey}": ${firstConf.reason}. Please resolve this conflict before saving.`,
    } as PermissionValidationError;
  }

  const catalogKeys = new Set(catalog.map((c) => c.key));
  const seenKeys = new Set<string>();
  const sanitizedOutput: ManagedDirectPermissionAssignmentRequest[] = [];

  for (const item of normalized) {
    // Validate supported key
    if (catalog.length > 0 && !catalogKeys.has(item.permissionKey)) {
      throw {
        permissionKey: item.permissionKey,
        field: "permissionKey",
        message: `Permission "${item.permissionKey}" is not supported by the permission catalog.`,
      } as PermissionValidationError;
    }

    // Validate unique key
    if (seenKeys.has(item.permissionKey)) {
      throw {
        permissionKey: item.permissionKey,
        field: "permissionKey",
        message: `Duplicate permission key "${item.permissionKey}".`,
      } as PermissionValidationError;
    }
    seenKeys.add(item.permissionKey);

    // Validate effect
    if (item.effect !== "Grant" && item.effect !== "Deny") {
      throw {
        permissionKey: item.permissionKey,
        field: "effect",
        message: `Invalid effect "${item.effect}". Must be "Grant" or "Deny".`,
      } as PermissionValidationError;
    }

    // Validate reason <= 1000 characters
    if (item.reason && item.reason.length > 1000) {
      throw {
        permissionKey: item.permissionKey,
        field: "reason",
        message: `Reason length (${item.reason.length}) exceeds 1,000 characters.`,
      } as PermissionValidationError;
    }

    // Validate expiry later than supplied start
    if (item.expiresAtUtc) {
      if (!item.startsAtUtc) {
        throw {
          permissionKey: item.permissionKey,
          field: "startsAtUtc",
          message: `Expiry date is specified without a start date.`,
        } as PermissionValidationError;
      }
      const startTime = new Date(item.startsAtUtc).getTime();
      const expiryTime = new Date(item.expiresAtUtc).getTime();
      if (isNaN(startTime) || isNaN(expiryTime)) {
        throw {
          permissionKey: item.permissionKey,
          field: "expiresAtUtc",
          message: `Invalid date format for start or expiry timestamp.`,
        } as PermissionValidationError;
      }
      if (expiryTime <= startTime) {
        throw {
          permissionKey: item.permissionKey,
          field: "expiresAtUtc",
          message: `Expiry date must be later than the start date.`,
        } as PermissionValidationError;
      }
    }

    // Scope sanitization: preserve scope flags, remove individual scopes only when All is selected
    let cleanScopes = Array.isArray(item.scopes) ? [...item.scopes] : [];
    if (item.isAllHousingScope) {
      cleanScopes = cleanScopes.filter((s) => s.type !== "Housing");
    }
    if (item.isAllClientScope) {
      cleanScopes = cleanScopes.filter(
        (s) => s.type !== "ClientPlatform" && s.type !== "ClientContract",
      );
    }
    const seenScopeSigs = new Set<string>();
    cleanScopes = cleanScopes.filter((s) => {
      const sig = `${s.type}:${s.targetId}`;
      if (seenScopeSigs.has(sig)) return false;
      seenScopeSigs.add(sig);
      return true;
    });

    sanitizedOutput.push({
      permissionKey: item.permissionKey,
      effect: item.effect,
      startsAtUtc: item.startsAtUtc ?? null,
      expiresAtUtc: item.expiresAtUtc ?? null,
      reason: item.reason ?? null,
      isAllHousingScope: item.isAllHousingScope,
      isAllClientScope: item.isAllClientScope,
      includesFuturePlatformContracts: item.includesFuturePlatformContracts,
      scopes: cleanScopes,
    });
  }

  return sanitizedOutput;
}

const roleRequest = (
  roleId: string,
  isAllHousingScope = true,
  isAllClientScope = true,
  includesFuturePlatformContracts = true,
): ManagedRoleAssignmentRequest => ({
  roleId,
  startsAtUtc: null,
  expiresAtUtc: null,
  reason: null,
  isAllHousingScope,
  isAllClientScope,
  includesFuturePlatformContracts,
  scopes: [],
});

const permissionRequest = (
  permissionKey: string,
  isAllHousingScope = true,
  isAllClientScope = true,
  includesFuturePlatformContracts = true,
): ManagedDirectPermissionAssignmentRequest => ({
  permissionKey,
  effect: "Grant",
  startsAtUtc: null,
  expiresAtUtc: null,
  reason: null,
  isAllHousingScope,
  isAllClientScope,
  includesFuturePlatformContracts,
  scopes: [],
});

export function AuthorizationEditor({ userId }: { userId: string }) {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const [roles, setRoles] = useState<Role[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalogItem[]>([]);
  const [assignRoles, setAssignRoles] = useState<ExistingRole[]>([]);
  const [assignPermissions, setAssignPermissions] = useState<
    ExistingPermission[]
  >([]);
  const [detectedConflicts, setDetectedConflicts] = useState<PermissionConflict[]>([]);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [selectedPermissionGroup, setSelectedPermissionGroup] =
    useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [syncingRoleId, setSyncingRoleId] = useState<string | null>(null);
  const [syncingAllRoles, setSyncingAllRoles] = useState(false);

  // Data Scopes states (required by backend RBAC for housing.read, platform_accounts.read, etc.)
  const [isAllHousingScope, setIsAllHousingScope] = useState(true);
  const [isAllClientScope, setIsAllClientScope] = useState(true);
  const [includesFuturePlatformContracts, setIncludesFuturePlatformContracts] = useState(true);

  const canReadRoles = can("roles.read");
  const canReadPermissions = can("permissions.read");
  const canSaveRoles = can("roles.create", "roles.update", "roles.delete");
  const canSavePermissions = can("permissions.create", "permissions.update", "permissions.delete");

  // Handlers for explicit scope changes by the user
  const handleClientScopeChange = (checked: boolean) => {
    setIsAllClientScope(checked);
    // Explicitly update each assignment's scope flags
    setAssignPermissions((prev) =>
      prev.map((p) => {
        let updatedScopes = Array.isArray(p.scopes) ? [...p.scopes] : [];
        if (checked) {
          // Remove corresponding individual scopes only when user deliberately selects "All"
          updatedScopes = updatedScopes.filter(
            (s) => s.type !== "ClientPlatform" && s.type !== "ClientContract",
          );
        }
        return {
          ...p,
          isAllClientScope: checked,
          scopes: updatedScopes,
        };
      }),
    );
    setAssignRoles((prev) =>
      prev.map((r) => {
        let updatedScopes = Array.isArray(r.scopes) ? [...r.scopes] : [];
        if (checked) {
          updatedScopes = updatedScopes.filter(
            (s) => s.type !== "ClientPlatform" && s.type !== "ClientContract",
          );
        }
        return {
          ...r,
          isAllClientScope: checked,
          scopes: updatedScopes,
        };
      }),
    );
  };

  const handleFutureContractsChange = (checked: boolean) => {
    setIncludesFuturePlatformContracts(checked);
    setAssignPermissions((prev) =>
      prev.map((p) => ({
        ...p,
        includesFuturePlatformContracts: checked,
      })),
    );
    setAssignRoles((prev) =>
      prev.map((r) => ({
        ...r,
        includesFuturePlatformContracts: checked,
      })),
    );
  };

  const resolveConflict = (key: string, chosenEffect: "Grant" | "Deny") => {
    setAssignPermissions((prev) =>
      prev.map((item) =>
        item.permissionKey === key
          ? {
              ...item,
              effect: chosenEffect,
              isAllClientScope,
              isAllHousingScope,
              scopes: (isAllClientScope && isAllHousingScope) ? [] : item.scopes,
            }
          : item,
      ),
    );
    setDetectedConflicts((prev) => prev.filter((c) => c.permissionKey !== key));
  };

  useEffect(() => {
    if (!canReadRoles && !canReadPermissions && !canSaveRoles && !canSavePermissions) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const [auth, allRoles, allPermissions] = await Promise.all([
          getUserAuthorization(userId),
          listRoles(),
          getPermissionCatalogue(),
        ]);
        const raw = auth as {
          roles?: (ExistingRole & { roleCode?: string })[];
          directPermissions?: (ExistingPermission | any)[];
        };
        const loadedRoles = raw.roles ?? [];
        const loadedPermissions = raw.directPermissions ?? [];

        // Detect initial scope state from existing assignments if present
        const firstRole = loadedRoles[0];
        const firstPerm = loadedPermissions[0];
        let initialHousing = true;
        let initialClient = true;
        let initialFuture = true;
        if (firstRole) {
          initialHousing = firstRole.isAllHousingScope ?? true;
          initialClient = firstRole.isAllClientScope ?? true;
          initialFuture = firstRole.includesFuturePlatformContracts ?? true;
        } else if (firstPerm) {
          initialHousing = firstPerm.isAllHousingScope ?? true;
          initialClient = firstPerm.isAllClientScope ?? true;
          initialFuture = firstPerm.includesFuturePlatformContracts ?? true;
        }
        setIsAllHousingScope(initialHousing);
        setIsAllClientScope(initialClient);
        setIncludesFuturePlatformContracts(initialFuture);

        // Normalize and expand legacy keys on load so duplicates/legacy keys don't appear in the editor
        const { normalized, conflicts, unknownKeys } = normalizeDirectPermissions(
          loadedPermissions,
          allPermissions,
          {
            isAllHousingScope: initialHousing,
            isAllClientScope: initialClient,
            includesFuturePlatformContracts: initialFuture,
          },
        );

        setAssignRoles(loadedRoles);
        setAssignPermissions(normalized);
        setRoles(allRoles);
        setCatalog(allPermissions);
        setDetectedConflicts(conflicts);

        if (conflicts.length > 0) {
          const conflictNames = conflicts.map((c) => c.permissionKey).join(", ");
          const warningMsg =
            locale === "en"
              ? `Warning: Conflicting assignments detected for: ${conflictNames}. Please resolve before saving.`
              : `تنبيه: تم رصد تعارض في صلاحيات: ${conflictNames}. يرجى حل التعارض قبل الحفظ.`;
          setMessage(warningMsg);
          toast.warning(locale === "en" ? "Permission Conflict" : "تعارض في الصلاحيات", warningMsg);
        }

        if (unknownKeys.length > 0) {
          const unknownMsg =
            locale === "en"
              ? `Unknown or unmapped permission keys found: ${unknownKeys.join(", ")}. These must be resolved or removed.`
              : `تم العثور على صلاحيات غير معروفة أو غير مدعومة: ${unknownKeys.join(", ")}. يجب معالجتها أو إزالتها.`;
          setMessage(unknownMsg);
          toast.error(locale === "en" ? "Unknown Permissions" : "صلاحيات غير معروفة", unknownMsg);
        }

        // Pre-fetch permission keys for assigned roles in background so badges and unassign know their permissions
        if (loadedRoles.length > 0) {
          void (async () => {
            try {
              const updated = [...allRoles];
              let hasChanges = false;
              for (const assigned of loadedRoles) {
                const r = updated.find((x) => x.id === assigned.roleId || x.code === assigned.roleCode);
                if (r && (!r.permissionKeys || r.permissionKeys.length === 0)) {
                  const perms = await getRolePermissionKeys(r);
                  if (perms.length > 0) {
                    const idx = updated.findIndex((x) => x.id === r.id);
                    if (idx !== -1) {
                      updated[idx] = { ...r, permissionKeys: perms };
                      hasChanges = true;
                    }
                  }
                }
              }
              if (hasChanges) {
                setRoles(updated);
              }
            } catch {
              // ignore
            }
          })();
        }
      } catch {
        setMessage(
          locale === "en"
            ? "Failed to load permission editor."
            : "تعذر تحميل محرر الصلاحيات.",
        );
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [canReadPermissions, canReadRoles, canSavePermissions, canSaveRoles, userId, locale]);

  const groupedPermissionsCatalog = useMemo(() => {
    const searchLower = permissionSearch.toLowerCase().trim();
    const items = catalog.filter((item) => {
      const matchesSearch =
        !searchLower ||
        `${item.nameAr} ${item.nameEn} ${item.key} ${item.module}`
          .toLowerCase()
          .includes(searchLower);
      const matchesGroup =
        selectedPermissionGroup === "all" ||
        permissionGroup(item.key) === selectedPermissionGroup;
      return matchesSearch && matchesGroup;
    });
    return groupPermissions(items);
  }, [catalog, permissionSearch, selectedPermissionGroup]);

  const togglePermissionKey = (key: string) => {
    setAssignPermissions((prev) => {
      const exists = prev.some((item) => item.permissionKey === key);
      if (exists) {
        return prev.filter((item) => item.permissionKey !== key);
      } else {
        return [
          ...prev,
          permissionRequest(
            key,
            isAllHousingScope,
            isAllClientScope,
            includesFuturePlatformContracts,
          ),
        ];
      }
    });
    setDetectedConflicts((prev) => prev.filter((c) => c.permissionKey !== key));
  };

  const togglePermissionGroupKeys = (groupItems: PermissionCatalogItem[]) => {
    const groupKeys = groupItems.map((item) => item.key);
    const allSelected = groupKeys.every((key) =>
      assignPermissions.some((item) => item.permissionKey === key),
    );
    if (allSelected) {
      setAssignPermissions((prev) =>
        prev.filter((item) => !groupKeys.includes(item.permissionKey)),
      );
    } else {
      setAssignPermissions((prev) => {
        const existingKeys = new Set(prev.map((item) => item.permissionKey));
        const newItems = groupKeys
          .filter((key) => !existingKeys.has(key))
          .map((key) =>
            permissionRequest(
              key,
              isAllHousingScope,
              isAllClientScope,
              includesFuturePlatformContracts,
            ),
          );
        return [...prev, ...newItems];
      });
    }
  };

  const clearAllPermissions = () => {
    setAssignPermissions([]);
    setDetectedConflicts([]);
  };

  const toggleEffect = (key: string) => {
    setAssignPermissions((prev) =>
      prev.map((item) =>
        item.permissionKey === key
          ? { ...item, effect: item.effect === "Grant" ? "Deny" : "Grant" }
          : item,
      ),
    );
    setDetectedConflicts((prev) => prev.filter((c) => c.permissionKey !== key));
  };

  // Role toggle with automatic permission population
  const toggleRoleSelection = async (role: Role) => {
    const isSelected = assignRoles.some(
      (item) => item.roleId === role.id || item.roleCode === role.code || item.roleId === role.code,
    );

    if (isSelected) {
      // Uncheck role
      const remainingRoles = assignRoles.filter(
        (item) => item.roleId !== role.id && item.roleCode !== role.code && item.roleId !== role.code,
      );
      setAssignRoles(remainingRoles);

      // Collect permissions belonging to remaining active roles
      const remainingRoleKeys = new Set<string>();
      for (const rem of remainingRoles) {
        const matched = roles.find((rc) => rc.id === rem.roleId || rc.code === rem.roleCode);
        if (matched) {
          if (matched.permissionKeys && matched.permissionKeys.length > 0) {
            matched.permissionKeys.forEach((k) => remainingRoleKeys.add(k));
          } else {
            try {
              const perms = await getRolePermissionKeys(matched);
              perms.forEach((k) => remainingRoleKeys.add(k));
            } catch {
              // ignore
            }
          }
        }
      }

      let thisRolePerms = role.permissionKeys ?? [];
      if (thisRolePerms.length === 0) {
        try {
          thisRolePerms = await getRolePermissionKeys(role);
        } catch {
          thisRolePerms = [];
        }
      }

      // Remove permissions of this role UNLESS they are still granted by another remaining role
      if (thisRolePerms.length > 0) {
        setAssignPermissions((prev) =>
          prev.filter(
            (p) => remainingRoleKeys.has(p.permissionKey) || !thisRolePerms.includes(p.permissionKey),
          ),
        );
      }

      toast.info(
        locale === "en" ? "Role Removed" : "تمت إزالة الدور",
        locale === "en"
          ? `Removed role "${role.nameEn || role.nameAr}".`
          : `تمت إزالة دور "${role.nameAr}".`,
      );
    } else {
      // Check role
      setSyncingRoleId(role.id);

      // Add to assigned roles
      const newRoleItem = roleRequest(
        role.id,
        isAllHousingScope,
        isAllClientScope,
        includesFuturePlatformContracts,
      );
      setAssignRoles((prev) => [...prev, newRoleItem]);

      // Fetch role permissions
      let rolePerms: string[] = [];
      try {
        rolePerms = await getRolePermissionKeys(role);
        if (rolePerms.length > 0 && (!role.permissionKeys || role.permissionKeys.length === 0)) {
          setRoles((prev) =>
            prev.map((r) => (r.id === role.id ? { ...r, permissionKeys: rolePerms } : r)),
          );
        }
      } catch (err) {
        console.error("Failed to load role permissions:", err);
      } finally {
        setSyncingRoleId(null);
      }

      // Auto-assign permissions of this role to user's direct permissions
      if (rolePerms.length > 0) {
        setAssignPermissions((prev) => {
          const existingKeys = new Set(prev.map((p) => p.permissionKey));
          const newItems = rolePerms
            .filter((k) => !existingKeys.has(k))
            .map((k) =>
              permissionRequest(
                k,
                isAllHousingScope,
                isAllClientScope,
                includesFuturePlatformContracts,
              ),
            );
          return [...prev, ...newItems];
        });

        toast.success(
          locale === "en" ? "Permissions Assigned" : "تم تعيين صلاحيات الدور",
          locale === "en"
            ? `Assigned ${rolePerms.length} permissions from role "${role.nameEn || role.nameAr}" to this user.`
            : `تم تعيين ${rolePerms.length} صلاحية تلقائياً للمستخدم من دور "${role.nameAr}".`,
        );
      } else {
        toast.success(
          locale === "en" ? "Role Assigned" : "تم تعيين الدور",
          locale === "en"
            ? `Assigned role "${role.nameEn || role.nameAr}".`
            : `تم تعيين دور "${role.nameAr}".`,
        );
      }
    }
  };

  // Sync permissions from all currently assigned roles
  const syncAllSelectedRolesPermissions = async () => {
    if (assignRoles.length === 0) {
      toast.info(
        locale === "en" ? "No Roles Assigned" : "لا توجد أدوار معيّنة",
        locale === "en"
          ? "Please select at least one role to sync permissions."
          : "يرجى تحديد دور واحد على الأقل لمزامنة الصلاحيات.",
      );
      return;
    }
    setSyncingAllRoles(true);
    try {
      const allRolePerms: string[] = [];
      const updatedRoles = [...roles];

      for (const assigned of assignRoles) {
        const matched = updatedRoles.find(
          (r) => r.id === assigned.roleId || r.code === assigned.roleCode,
        );
        if (matched) {
          const perms = await getRolePermissionKeys(matched);
          if (perms.length > 0 && (!matched.permissionKeys || matched.permissionKeys.length === 0)) {
            const idx = updatedRoles.findIndex((r) => r.id === matched.id);
            if (idx !== -1) {
              updatedRoles[idx] = { ...matched, permissionKeys: perms };
            }
          }
          allRolePerms.push(...perms);
        }
      }

      setRoles(updatedRoles);
      const uniquePerms = Array.from(new Set(allRolePerms));

      let addedCount = 0;
      setAssignPermissions((prev) => {
        const existingKeys = new Set(prev.map((p) => p.permissionKey));
        const newItems = uniquePerms
          .filter((k) => !existingKeys.has(k))
          .map((k) =>
            permissionRequest(
              k,
              isAllHousingScope,
              isAllClientScope,
              includesFuturePlatformContracts,
            ),
          );
        addedCount = newItems.length;
        return [...prev, ...newItems];
      });

      toast.success(
        locale === "en" ? "Permissions Synced" : "تمت مزامنة الصلاحيات",
        locale === "en"
          ? `Added ${addedCount} new permissions from ${assignRoles.length} assigned roles.`
          : `تمت إضافة ${addedCount} صلاحية جديدة من ${assignRoles.length} أدوار معيّنة بنجاح.`,
      );
    } catch (err: any) {
      toast.error(
        locale === "en" ? "Sync Failed" : "فشل المزامنة",
        err?.message ||
          (locale === "en"
            ? "Failed to sync role permissions."
            : "تعذر مزامنة صلاحيات الأدوار."),
      );
    } finally {
      setSyncingAllRoles(false);
    }
  };

  async function saveAll() {
    setSaving(true);
    setMessage("");
    try {
      const promises: Promise<any>[] = [];
      if (canSaveRoles) {
        const rolePayload = assignRoles.map((r) => ({
          roleId: r.roleId,
          startsAtUtc: r.startsAtUtc ?? null,
          expiresAtUtc: r.expiresAtUtc ?? null,
          reason: r.reason ?? null,
          isAllHousingScope: r.isAllHousingScope ?? isAllHousingScope,
          isAllClientScope: r.isAllClientScope ?? isAllClientScope,
          includesFuturePlatformContracts:
            r.includesFuturePlatformContracts ?? includesFuturePlatformContracts,
          scopes: (r.isAllHousingScope && r.isAllClientScope) ? [] : (r.scopes ?? []),
        }));
        promises.push(replaceUserRoles(userId, rolePayload));
      }

      let preparedAssignments: ManagedDirectPermissionAssignmentRequest[] | null = null;
      if (canSavePermissions) {
        preparedAssignments = preparePermissionAssignments(assignPermissions, catalog);
        promises.push(replaceUserPermissions(userId, preparedAssignments));
      }

      await Promise.all(promises);
      if (preparedAssignments) {
        setAssignPermissions(preparedAssignments);
        setDetectedConflicts([]);
      }

      const msg =
        locale === "en"
          ? "All roles and permissions saved successfully."
          : "تم حفظ جميع الأدوار والصلاحيات المباشرة ونطاقات المستخدم بنجاح.";
      setMessage(msg);
      toast.success(
        locale === "en" ? "Authorization Saved" : "تم حفظ الصلاحيات والأدوار",
        msg,
      );
    } catch (err: any) {
      if (err && err.permissionKey && err.field) {
        const errorDetails = `[${err.permissionKey}] (${err.field}): ${err.message}`;
        setMessage(errorDetails);
        toast.error(
          locale === "en" ? "Validation Failed" : "فشل التحقق من الصلاحيات",
          errorDetails,
        );
      } else {
        const msg =
          err?.message ||
          (locale === "en"
            ? "Failed to save authorization changes."
            : "تعذر حفظ تغييرات الأدوار والصلاحيات.");
        setMessage(msg);
        toast.error(locale === "en" ? "Save Failed" : "فشل الحفظ", msg);
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveRoles() {
    setSaving(true);
    setMessage("");
    try {
      const rolePayload = assignRoles.map((r) => ({
        roleId: r.roleId,
        startsAtUtc: r.startsAtUtc ?? null,
        expiresAtUtc: r.expiresAtUtc ?? null,
        reason: r.reason ?? null,
        isAllHousingScope: r.isAllHousingScope ?? isAllHousingScope,
        isAllClientScope: r.isAllClientScope ?? isAllClientScope,
        includesFuturePlatformContracts:
          r.includesFuturePlatformContracts ?? includesFuturePlatformContracts,
        scopes: (r.isAllHousingScope && r.isAllClientScope) ? [] : (r.scopes ?? []),
      }));
      await replaceUserRoles(userId, rolePayload);
      const msg =
        locale === "en"
          ? "User roles saved successfully."
          : "تم حفظ أدوار المستخدم بنجاح.";
      setMessage(msg);
      toast.success(locale === "en" ? "Roles Saved" : "تم حفظ الأدوار", msg);
    } catch (err: any) {
      const msg =
        err?.message ||
        (locale === "en"
          ? "Failed to save user roles."
          : "تعذر حفظ أدوار المستخدم.");
      setMessage(msg);
      toast.error(locale === "en" ? "Save Failed" : "فشل الحفظ", msg);
    } finally {
      setSaving(false);
    }
  }

  async function savePermissions() {
    setSaving(true);
    setMessage("");
    try {
      const assignments = preparePermissionAssignments(assignPermissions, catalog);
      await replaceUserPermissions(userId, assignments);
      setAssignPermissions(assignments);
      setDetectedConflicts([]);
      const msg =
        locale === "en"
          ? "Direct permissions saved successfully."
          : "تم حفظ الصلاحيات المباشرة بنجاح.";
      setMessage(msg);
      toast.success(locale === "en" ? "Permissions Saved" : "تم حفظ الصلاحيات", msg);
    } catch (err: any) {
      if (err && err.permissionKey && err.field) {
        const errorDetails = `[${err.permissionKey}] (${err.field}): ${err.message}`;
        setMessage(errorDetails);
        toast.error(
          locale === "en" ? "Validation Failed" : "فشل التحقق من الصلاحيات",
          errorDetails,
        );
      } else {
        const msg =
          err?.message ||
          (locale === "en"
            ? "Failed to save permissions."
            : "تعذر حفظ الصلاحيات.");
        setMessage(msg);
        toast.error(locale === "en" ? "Save Failed" : "فشل الحفظ", msg);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!canReadRoles && !canReadPermissions && !canSaveRoles && !canSavePermissions) return null;
  return (
    <Card className="p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={24} className="text-[#1167c9]" />
          <div>
            <h2 className="text-lg font-black">
              {locale === "en"
                ? "Edit Roles & Permissions"
                : "تعديل الأدوار والصلاحيات"}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {locale === "en"
                ? "Choosing a role automatically assigns its permissions to this user."
                : "اختيار أي دور يعيّن صلاحيات هذا الدور للمستخدم تلقائياً."}
            </p>
          </div>
        </div>
        {(canSaveRoles || canSavePermissions) && (
          <Button loading={saving} onClick={() => void saveAll()} className="shadow-sm">
            <Save size={16} />
            {locale === "en" ? "Save All Changes" : "حفظ جميع التغييرات"}
          </Button>
        )}
      </div>
      {message && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-blue-500/10 p-3 text-sm font-bold text-[#1167c9]"
        >
          {message}
        </p>
      )}
      {loading ? (
        <p className="mt-5 text-sm text-[var(--muted)]">
          {locale === "en"
            ? "Loading permission options..."
            : "جارٍ تحميل خيارات الصلاحيات…"}
        </p>
      ) : (
        <div className="mt-5 space-y-6">
          {/* Data Scopes Section */}
          <section className="rounded-xl border border-blue-500/30 bg-blue-50/40 dark:bg-blue-950/20 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-[#1167c9]" />
              <h3 className="font-black text-base">
                {locale === "en" ? "Data Scopes & Access Boundaries" : "نطاقات البيانات والصلاحيات الجغرافية والمنصات"}
              </h3>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              {locale === "en"
                ? "Crucial: Backend RBAC requires active data scopes for platforms and clients. If these scopes are disabled, users with permissions like 'platform_accounts.read' will receive 403 Forbidden errors (Housing permissions are module-level and do not require data scopes)."
                : "تنبيه هام: يتطلب نظام التحقق في الخادم (Backend RBAC) تحديد نطاقات البيانات للمنصات والعملاء. إذا كانت هذه النطاقات معطلة، سيواجه المستخدم خطأ (403 Forbidden) عند محاولة جلب بيانات المنصات حتى وإن كان يمتلك الصلاحية (صلاحيات السكن عامة على مستوى النظام ولا تتطلب نطاقاً)."}
            </p>
            <div className="grid gap-3 pt-1 sm:grid-cols-2">

              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                isAllClientScope
                  ? "border-[#1167c9] bg-white dark:bg-slate-900 shadow-sm font-bold"
                  : "border-[var(--border)] bg-transparent opacity-80"
              }`}>
                <input
                  type="checkbox"
                  checked={isAllClientScope}
                  onChange={(e) => handleClientScopeChange(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1167c9]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-bold">
                    <Layers size={15} className="text-[#1167c9] shrink-0" />
                    <span>{locale === "en" ? "All Platforms & Clients" : "شامل لجميع المنصات والعملاء"}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)] font-normal">
                    {locale === "en" ? "Access all platforms and accounts" : "صلاحية كاملة لجميع المنصات والحسابات"}
                  </p>
                </div>
              </label>

              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                includesFuturePlatformContracts
                  ? "border-[#1167c9] bg-white dark:bg-slate-900 shadow-sm font-bold"
                  : "border-[var(--border)] bg-transparent opacity-80"
              }`}>
                <input
                  type="checkbox"
                  checked={includesFuturePlatformContracts}
                  onChange={(e) => handleFutureContractsChange(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1167c9]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-bold">
                    <CheckCircle2 size={15} className="text-[#1167c9] shrink-0" />
                    <span>{locale === "en" ? "Future Contracts" : "شمول العقود المستقبلية"}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)] font-normal">
                    {locale === "en" ? "Auto-include newly created contracts" : "تطبيق الصلاحية تلقائياً على العقود الجديدة"}
                  </p>
                </div>
              </label>
            </div>
          </section>

          {/* Conflict Resolution Banner */}
          {detectedConflicts.length > 0 && (
            <section className="rounded-xl border border-red-300 bg-red-50/90 p-4 dark:border-red-900 dark:bg-red-950/40 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold text-sm">
                <AlertTriangle size={18} className="shrink-0 text-red-600" />
                <span>
                  {locale === "en"
                    ? "Conflicting Permissions Detected"
                    : "تم رصد تعارض في تعيينات الصلاحيات"}
                </span>
              </div>
              <p className="text-xs text-red-600 dark:text-red-300 leading-relaxed">
                {locale === "en"
                  ? "Multiple duplicate assignments for the following permissions have conflicting effects or scopes. Please resolve each conflict before saving:"
                  : "توجد تعيينات مكررة للصلاحيات التالية بقواعد أو نطاقات متعارضة. يرجى اختيار القاعدة المناسبة لكل صلاحية قبل الحفظ:"}
              </p>
              <div className="space-y-2">
                {detectedConflicts.map((c) => (
                  <div
                    key={c.permissionKey}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-white p-3 dark:border-red-800/60 dark:bg-slate-900 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-red-700 dark:text-red-300">
                        {c.permissionKey}
                      </span>
                      <span className="text-[var(--muted)] ml-2">
                        — {c.reason}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        onClick={() => resolveConflict(c.permissionKey, "Grant")}
                        className="text-[11px] min-h-7 h-7 px-2.5 font-bold"
                      >
                        {locale === "en" ? "Set Grant" : "تعيين مسموح"}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => resolveConflict(c.permissionKey, "Deny")}
                        className="text-[11px] min-h-7 h-7 px-2.5 font-bold text-red-600 hover:text-red-700"
                      >
                        {locale === "en" ? "Set Deny" : "تعيين منع"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => togglePermissionKey(c.permissionKey)}
                        className="rounded p-1 text-slate-400 hover:text-red-600"
                        title={locale === "en" ? "Remove" : "إزالة"}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {(canReadRoles || canSaveRoles) && (
            <section className="rounded-xl border border-[var(--border)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-black text-base">
                    {locale === "en" ? "Assigned Roles" : "الأدوار المعيّنة"}
                  </h3>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {locale === "en"
                      ? "Select roles to assign. Choosing a role automatically assigns its permissions to this user."
                      : "حدد الأدوار المراد تعيينها. اختيار أي دور يعيّن صلاحياته للمستخدم تلقائياً."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    loading={syncingAllRoles}
                    onClick={() => void syncAllSelectedRolesPermissions()}
                    title={
                      locale === "en"
                        ? "Sync all permissions from assigned roles to direct permissions"
                        : "مزامنة جميع صلاحيات الأدوار المحددة إلى الصلاحيات المباشرة"
                    }
                  >
                    <Sparkles size={14} className="text-amber-500" />
                    {locale === "en" ? "Sync Role Permissions" : "مزامنة صلاحيات الأدوار"}
                  </Button>
                  <Button
                    loading={saving}
                    onClick={() => void saveRoles()}
                  >
                    <Save size={16} />
                    {locale === "en" ? "Save Roles" : "حفظ الأدوار"}
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {roles
                  .filter((role) => role.status === "Active")
                  .map((role) => {
                    const selected = assignRoles.some(
                      (item) => item.roleId === role.id || item.roleCode === role.code || item.roleCode === role.id,
                    );
                    const roleName =
                      locale === "en"
                        ? role.nameEn || role.nameAr
                        : role.nameAr;
                    const roleDesc =
                      locale === "en"
                        ? role.descriptionEn || role.descriptionAr
                        : role.descriptionAr;
                    const isSyncingThis = syncingRoleId === role.id;
                    return (
                      <label
                        key={role.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                          selected
                            ? "border-[#1167c9] bg-blue-50/60 dark:bg-blue-950/30 font-bold"
                            : "border-[var(--border)] hover:bg-slate-500/5"
                        } ${isSyncingThis ? "opacity-70 pointer-events-none" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={isSyncingThis}
                          onChange={() => void toggleRoleSelection(role)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1167c9]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <b className="text-sm truncate">{roleName}</b>
                              {isSyncingThis && (
                                <span className="text-[10px] text-[#1167c9] font-bold animate-pulse">
                                  {locale === "en" ? "Assigning..." : "جارٍ التعيين..."}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {role.permissionKeys && role.permissionKeys.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-[#1167c9]">
                                  <Sparkles size={10} />
                                  {role.permissionKeys.length}
                                </span>
                              )}
                              <span
                                className="font-mono text-xs text-[var(--muted)]"
                                dir="ltr"
                              >
                                {role.code}
                              </span>
                            </div>
                          </div>
                          {roleDesc && (
                            <p className="mt-1 text-xs text-[var(--muted)] font-normal line-clamp-2">
                              {roleDesc}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
              </div>
            </section>
          )}

          {(canReadPermissions || canSavePermissions) && (
            <section className="rounded-xl border border-[var(--border)] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                <div>
                  <h3 className="font-black text-base">
                    {locale === "en"
                      ? "Direct Permissions"
                      : "الصلاحيات المباشرة"}
                  </h3>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {locale === "en"
                      ? "Check the permissions you wish to grant directly to this user."
                      : "حدد الصلاحيات التي ترغب بمنحها مباشرة لهذا المستخدم."}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-[#1167c9]">
                    {assignPermissions.length}{" "}
                    {locale === "en" ? "selected" : "محددة"}
                  </span>
                  {canSavePermissions && (
                    <Button loading={saving} onClick={() => void savePermissions()}>
                      <Save size={16} />
                      {locale === "en" ? "Save Permissions" : "حفظ الصلاحيات"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Selected Permissions Summary Badges */}
              {assignPermissions.length > 0 && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#1167c9]">
                      {locale === "en"
                        ? "Selected Direct Permissions"
                        : "الصلاحيات المباشرة المحددة"}{" "}
                      ({assignPermissions.length}):
                    </span>
                    <button
                      type="button"
                      onClick={clearAllPermissions}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      {locale === "en" ? "Clear all selected" : "إلغاء تحديد الكل"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {assignPermissions.map((assigned) => {
                      const key = assigned.permissionKey;
                      const item = catalog.find((p) => p.key === key);
                      const label = item
                        ? locale === "en"
                          ? item.nameEn || item.nameAr
                          : item.nameAr
                        : permissionLabel(key, locale);
                      const isDeny = assigned.effect === "Deny";
                      return (
                        <span
                          key={key}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold shadow-sm ${
                            isDeny
                              ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300"
                              : "border-blue-200 bg-white text-[#1167c9] dark:bg-slate-900 dark:border-blue-800"
                          }`}
                        >
                          <span>{label}</span>
                          <button
                            type="button"
                            onClick={() => toggleEffect(key)}
                            title={
                              locale === "en"
                                ? "Toggle Effect (Grant/Deny)"
                                : "تبديل القاعدة (مسموح/منع)"
                            }
                            className={`rounded px-1 text-[10px] uppercase font-mono ${
                              isDeny
                                ? "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            }`}
                          >
                            {assigned.effect === "Deny"
                              ? locale === "en"
                                ? "Deny"
                                : "منع"
                              : locale === "en"
                                ? "Grant"
                                : "مسموح"}
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePermissionKey(key)}
                            className="rounded p-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50"
                          >
                            <X size={13} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Search & Category Filter Bar */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search
                    size={16}
                    className="absolute right-3 top-3 text-[var(--muted)]"
                  />
                  <input
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    placeholder={
                      locale === "en"
                        ? "Search permissions by name or key..."
                        : "ابحث عن صلاحية باسمها أو الرمز…"
                    }
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-3 pr-9 text-xs"
                  />
                </div>

                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedPermissionGroup("all")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      selectedPermissionGroup === "all"
                        ? "bg-[#1167c9] text-white"
                        : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:bg-blue-500/10"
                    }`}
                  >
                    {locale === "en" ? "All" : "الكل"}
                  </button>
                  {[
                    "Security",
                    "Workforce",
                    "Compliance",
                    "Fleet",
                    "Workflows",
                    "Operations",
                  ].map((grp) => (
                    <button
                      type="button"
                      key={grp}
                      onClick={() => setSelectedPermissionGroup(grp)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                        selectedPermissionGroup === grp
                          ? "bg-[#1167c9] text-white"
                          : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)] hover:bg-blue-500/10"
                      }`}
                    >
                      {permissionGroupLabel(grp as any, locale)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grouped Catalog Grid with Checkboxes */}
              <div className="max-h-[500px] overflow-y-auto space-y-5 pr-1">
                {groupedPermissionsCatalog.map(([group, items]) => {
                  const isAllGroupSelected =
                    items.length > 0 &&
                    items.every((item) =>
                      assignPermissions.some(
                        (p) => p.permissionKey === item.key,
                      ),
                    );

                  const familyMap = new Map<string, PermissionFamily>();
                  const standaloneItems: PermissionCatalogItem[] = [];

                  for (const item of items) {
                    const famMatch = getFamilyForPermissionKey(item.key);
                    if (famMatch) {
                      if (!familyMap.has(famMatch.family.family)) {
                        familyMap.set(famMatch.family.family, famMatch.family);
                      }
                    } else {
                      standaloneItems.push(item);
                    }
                  }
                  const families = Array.from(familyMap.values());

                  return (
                    <div key={group} className="space-y-3">
                      <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
                        <h4 className="border-r-2 border-[#1167c9] pr-2 text-xs font-black text-[#1167c9]">
                          {permissionGroupLabel(group, locale)} ({items.length})
                        </h4>
                        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-50/80 px-2.5 py-1 text-xs font-bold text-[#1167c9] hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 transition-colors">
                          <input
                            type="checkbox"
                            checked={isAllGroupSelected}
                            onChange={() =>
                              togglePermissionGroupKeys(
                                items as PermissionCatalogItem[],
                              )
                            }
                            className="h-3.5 w-3.5 rounded border-blue-400 text-[#1167c9] focus:ring-[#1167c9]"
                          />
                          <span>
                            {isAllGroupSelected
                              ? locale === "en"
                                ? "Deselect All"
                                : "إلغاء تحديد الكل"
                              : locale === "en"
                                ? "Select All"
                                : "تحديد الكل"}
                          </span>
                        </label>
                      </div>

                      {/* Render Families with 4 separate controls: Read, Create, Edit, Delete */}
                      {families.length > 0 && (
                        <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                          {families.map((fam) => {
                            const actionControls: { action: "read" | "create" | "update" | "delete"; key: string; labelEn: string; labelAr: string }[] = [
                              { action: "read", key: fam.read, labelEn: "Read (.read)", labelAr: "قراءة (.read)" },
                              { action: "create", key: fam.create, labelEn: "Create (.create)", labelAr: "إنشاء (.create)" },
                              { action: "update", key: fam.update, labelEn: "Edit (.update)", labelAr: "تعديل (.update)" },
                              { action: "delete", key: fam.delete, labelEn: "Delete (.delete)", labelAr: "حذف (.delete)" },
                            ];

                            return (
                              <div
                                key={fam.family}
                                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 space-y-2.5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                              >
                                <div className="flex items-center justify-between gap-2 border-b border-[var(--border)]/60 pb-2">
                                  <div className="min-w-0">
                                    <span className="font-bold text-xs text-[var(--foreground)] block truncate">
                                      {locale === "en" ? fam.nameEn : fam.nameAr}
                                    </span>
                                    <span className="font-mono text-[10px] text-[var(--muted)] block truncate" dir="ltr">
                                      {fam.family}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {fam.highTrust && (
                                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                                        {locale === "en" ? "High Trust" : "ثقة عالية"}
                                      </span>
                                    )}
                                    {fam.clientScope && (
                                      <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                                        {locale === "en" ? "Client Scope" : "نطاق عميل"}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* 4 Separate Permission Controls */}
                                <div className="grid grid-cols-2 gap-2">
                                  {actionControls.map((ctrl) => {
                                    const assigned = assignPermissions.find((p) => p.permissionKey === ctrl.key);
                                    const isSelected = Boolean(assigned);
                                    const isDeny = assigned?.effect === "Deny";

                                    return (
                                      <div
                                        key={ctrl.key}
                                        className={`flex flex-col justify-between p-2 rounded-lg border text-xs transition-all ${
                                          isSelected
                                            ? isDeny
                                              ? "border-red-300 bg-red-50/70 dark:bg-red-950/40"
                                              : "border-[#1167c9] bg-blue-50/70 dark:bg-blue-950/40"
                                            : "border-[var(--border)] hover:bg-slate-500/5"
                                        }`}
                                      >
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => togglePermissionKey(ctrl.key)}
                                            className="h-3.5 w-3.5 rounded border-slate-300 text-[#1167c9]"
                                          />
                                          <span className="font-semibold text-[11px] truncate">
                                            {locale === "en" ? ctrl.labelEn : ctrl.labelAr}
                                          </span>
                                        </label>
                                        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-[var(--border)]/40">
                                          <span className="font-mono text-[9px] text-[var(--muted)]">
                                            .{ctrl.action === "update" ? "update" : ctrl.action}
                                          </span>
                                          {isSelected && (
                                            <button
                                              type="button"
                                              onClick={() => toggleEffect(ctrl.key)}
                                              title={locale === "en" ? "Toggle Effect" : "تبديل القاعدة"}
                                              className={`rounded px-1 py-0.2 text-[9px] font-bold ${
                                                isDeny
                                                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                              }`}
                                            >
                                              {isDeny ? (locale === "en" ? "Deny" : "منع") : (locale === "en" ? "Grant" : "مسموح")}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Render Standalone Permissions */}
                      {standaloneItems.length > 0 && (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {standaloneItems.map((item) => {
                            const assigned = assignPermissions.find(
                              (p) => p.permissionKey === item.key,
                            );
                            const isSelected = Boolean(assigned);
                            const isDeny = assigned?.effect === "Deny";
                            return (
                              <div
                                key={item.key}
                                className={`flex items-start gap-3 rounded-xl border p-3 transition-all ${
                                  isSelected
                                    ? isDeny
                                      ? "border-red-300 bg-red-50/60 dark:bg-red-950/30 font-bold"
                                      : "border-[#1167c9] bg-blue-50/60 dark:bg-blue-950/30 font-bold"
                                    : "border-[var(--border)] hover:bg-slate-500/5"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => togglePermissionKey(item.key)}
                                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1167c9]"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span
                                      onClick={() => togglePermissionKey(item.key)}
                                      className="cursor-pointer text-xs leading-5"
                                    >
                                      {locale === "en"
                                        ? item.nameEn || item.nameAr
                                        : item.nameAr}
                                    </span>
                                    {isSelected && (
                                      <button
                                        type="button"
                                        onClick={() => toggleEffect(item.key)}
                                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                          isDeny
                                            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                        }`}
                                      >
                                        {isDeny
                                          ? locale === "en"
                                            ? "Deny"
                                            : "منع"
                                          : locale === "en"
                                            ? "Grant"
                                            : "مسموح"}
                                      </button>
                                    )}
                                  </div>
                                  <span
                                    onClick={() => togglePermissionKey(item.key)}
                                    className="block cursor-pointer font-mono text-[10px] text-[var(--muted)] truncate"
                                    dir="ltr"
                                  >
                                    {item.key}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {groupedPermissionsCatalog.length === 0 && (
                  <p className="py-8 text-center text-xs text-[var(--muted)] border border-dashed border-[var(--border)] rounded-xl">
                    {locale === "en"
                      ? "No matching permissions found."
                      : "لا توجد صلاحيات مطابقة."}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </Card>
  );
}

