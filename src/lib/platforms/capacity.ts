// src/lib/platforms/capacity.ts
/**
 * Shared platform assignment capacity and validation rules
 * Reference: Frontend handoff — Jahez settlement dates and Chefz/Jahez assignments (18 Oct 2026)
 *
 * Rules summary:
 * - Chefz only: max 2 accounts (CHEFZ, THECHEFZ, CHEFSZ, SHIFTZ share one combined 2-account cap)
 * - Jahez only: max 1 account (PayPerOrder only)
 * - Chefz + Jahez: max 3 accounts (up to 2 Chefz + 1 Jahez)
 * - Other platforms: max 1 account (cannot combine with Chefz or Jahez)
 * - Max 1 Salary account per rider across all platforms
 * - Open assignments are defined by effectiveTo === null
 */

export interface AssignmentForCapacity {
  assignmentId: string;
  accountId?: string;
  platformCode: string;
  paymentModel: string;
  effectiveTo: string | null;
  platformNameAr?: string | null;
  platformNameEn?: string | null;
  externalAccountId?: string | null;
  accountCode?: string | null;
  status?: string | null;
}

export interface ActiveAccountInfo {
  assignmentId: string;
  accountId: string;
  platformId?: string;
  platformCode?: string;
  platformNameAr?: string;
  platformNameEn?: string;
  externalAccountId?: string;
  paymentModel?: string;
}

export interface PlatformAssignmentLimit {
  riderProfileId?: string;
  requestedAccountId?: string;
  requestedPaymentModel?: string;
  maximumActiveAccounts: number;
  maximumSalaryAccounts: number;
  activeAccounts: ActiveAccountInfo[];
  allowedPaymentModels?: string[];
}

export const CHEFZ_PLATFORM_CODES = new Set(["CHEFZ", "THECHEFZ", "CHEFSZ", "SHIFTZ"]);

export function isChefzPlatform(platformCode?: string | null): boolean {
  if (!platformCode) return false;
  return CHEFZ_PLATFORM_CODES.has(platformCode.trim().toUpperCase());
}

export function isJahezPlatform(platformCode?: string | null): boolean {
  if (!platformCode) return false;
  return platformCode.trim().toUpperCase() === "JAHEZ";
}

/**
 * Capacity validation helper matching backend rules
 * Evaluates whether a requested platform assignment is permissible given the rider's current assignments.
 */
export function capacityAllows(
  requestedPlatform: string,
  requestedPaymentModel: string,
  assignments: AssignmentForCapacity[],
  editedAssignmentId?: string
): boolean {
  // For a payment-model edit, evaluate the replacement once rather than counting
  // the existing assignment plus its edited version as two accounts.
  const open = assignments.filter(
    (a) => a.effectiveTo === null && a.assignmentId !== editedAssignmentId
  );

  // Retain one-Salary-account validation across all platforms
  if (requestedPaymentModel === "Salary" && open.some((a) => a.paymentModel === "Salary")) {
    return false;
  }

  const normReqPlatform = requestedPlatform.trim().toUpperCase();
  const requestedChefz = isChefzPlatform(normReqPlatform);
  const requestedJahez = isJahezPlatform(normReqPlatform);

  // Jahez continues to support PayPerOrder accounts only
  if (requestedJahez && requestedPaymentModel !== "PayPerOrder") {
    return false;
  }

  // Other platforms cannot combine with anything else; must have 0 open accounts
  if (!requestedChefz && !requestedJahez) {
    return open.length === 0;
  }

  // Cannot combine Chefz or Jahez with an unrelated platform
  if (
    open.some(
      (a) => !isChefzPlatform(a.platformCode) && !isJahezPlatform(a.platformCode)
    )
  ) {
    return false;
  }

  const chefz = open.filter((a) => isChefzPlatform(a.platformCode)).length;
  const jahez = open.filter((a) => isJahezPlatform(a.platformCode)).length;

  return chefz + Number(requestedChefz) <= 2 && jahez + Number(requestedJahez) <= 1;
}

export interface PlatformCapacitySummary {
  chefzCount: number;
  chefzCap: number;
  jahezCount: number;
  jahezCap: number;
  totalOpen: number;
  totalCap: number;
  salaryCount: number;
  otherPlatformCount: number;
  hasExcessJahez: boolean;
  hasExcessChefz: boolean;
  hasIncompatibleMix: boolean;
  openAssignments: AssignmentForCapacity[];
  formattedLabelAr: string;
  formattedLabelEn: string;
  canTakeChefz: boolean;
  canTakeJahez: boolean;
  canTakeSalary: boolean;
}

/**
 * Generates a comprehensive capacity breakdown for display on rider cards, history, and pickers.
 */
export function getRiderPlatformCapacitySummary(
  assignments: AssignmentForCapacity[]
): PlatformCapacitySummary {
  const open = assignments.filter((a) => a.effectiveTo === null);
  const chefz = open.filter((a) => isChefzPlatform(a.platformCode)).length;
  const jahez = open.filter((a) => isJahezPlatform(a.platformCode)).length;
  const other = open.filter(
    (a) => !isChefzPlatform(a.platformCode) && !isJahezPlatform(a.platformCode)
  ).length;
  const salary = open.filter((a) => a.paymentModel === "Salary").length;

  // Existing-data review: flag excess accounts (e.g. >1 Jahez or >2 Chefz or mixed unrelated)
  const hasExcessJahez = jahez > 1;
  const hasExcessChefz = chefz > 2;
  const hasIncompatibleMix = other > 0 && (chefz > 0 || jahez > 0 || other > 1);

  // Maximum allowed total capacity
  const isCombinedEligible = other === 0;
  const totalCap = isCombinedEligible ? 3 : 1;

  // Future eligibility checks
  const canTakeChefz = other === 0 && chefz < 2;
  const canTakeJahez = other === 0 && jahez < 1;
  const canTakeSalary = salary === 0;

  const partsAr: string[] = [];
  const partsEn: string[] = [];

  if (chefz > 0 || jahez > 0) {
    partsAr.push(`شيفز ${chefz}/2`);
    partsEn.push(`Chefz ${chefz}/2`);
    partsAr.push(`جاهز ${jahez}/1`);
    partsEn.push(`Jahez ${jahez}/1`);
    partsAr.push(`الإجمالي ${open.length}/3`);
    partsEn.push(`Total ${open.length}/3`);
  } else if (other > 0) {
    partsAr.push(`منصات أخرى ${other}/1`);
    partsEn.push(`Other platforms ${other}/1`);
  } else {
    partsAr.push(`شيفز 0/2 · جاهز 0/1 · الإجمالي 0/3`);
    partsEn.push(`Chefz 0/2 · Jahez 0/1 · Total 0/3`);
  }

  return {
    chefzCount: chefz,
    chefzCap: 2,
    jahezCount: jahez,
    jahezCap: 1,
    totalOpen: open.length,
    totalCap,
    salaryCount: salary,
    otherPlatformCount: other,
    hasExcessJahez,
    hasExcessChefz,
    hasIncompatibleMix,
    openAssignments: open,
    formattedLabelAr: partsAr.join(" · "),
    formattedLabelEn: partsEn.join(" · "),
    canTakeChefz,
    canTakeJahez,
    canTakeSalary,
  };
}
