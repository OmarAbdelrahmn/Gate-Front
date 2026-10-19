// src/lib/jahez/treasury/utils.ts
// Formatters, localization, and tree building helpers for Treasury V3

import {
  TreasuryLocation,
  TreasuryPurpose,
  TreasuryDirections,
  TreasuryEntryKind,
  PetroEvidenceKind,
  TreasuryHandoverStatus,
  type TreasuryAccount,
} from "./types";

/**
 * Formats a number as Saudi Riyals with 2 decimal places.
 */
export function formatSAR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "0.00 ر.س";
  }
  return (
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + " ر.س"
  );
}

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Riyadh time.
 */
export function getRiyadhTodayDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Returns the first day of current month formatted as YYYY-MM-01 in Asia/Riyadh time.
 */
export function getRiyadhFirstDayOfMonth(): string {
  const today = getRiyadhTodayDate();
  const [year, month] = today.split("-");
  return `${year}-${month}-01`;
}

/**
 * Formats an ISO UTC date string into Asia/Riyadh localized date-time.
 */
export function formatRiyadhDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("ar-SA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Checks whether a string resembles an internal GUID/UUID (to avoid displaying raw UUIDs).
 */
export function isGuidLike(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed) ||
    /^[0-9a-f]{32}$/i.test(trimmed)
  );
}

/**
 * Displays person name or safe fallback without leaking internal GUIDs.
 */
export function displayPersonName(
  name: string | null | undefined,
  kind: "user" | "driver" | "general" = "general",
): string {
  if (!name || name.trim() === "" || isGuidLike(name)) {
    if (kind === "user") return "اسم المستخدم غير متاح";
    if (kind === "driver") return "اسم المندوب غير متاح";
    return "—";
  }
  return name.trim();
}

/**
 * Safely extracts human-readable sponsor name across backend response schemas
 * (nameAr, registryNameAr, sponsorNameAr, name, registryNameEn, nameEn, etc.)
 */
export function getSponsorDisplayName(sponsor: any): string {
  if (!sponsor) return "كفيل غير محدد";
  if (typeof sponsor === "string") return sponsor;
  const name =
    sponsor.nameAr ||
    sponsor.registryNameAr ||
    sponsor.sponsorNameAr ||
    sponsor.name ||
    sponsor.title ||
    sponsor.companyName ||
    sponsor.registryNameEn ||
    sponsor.nameEn ||
    sponsor.sponsorNameEn ||
    sponsor.employerIdentityNumber ||
    sponsor.commercialRegistrationNumber;
  return name && typeof name === "string" && name.trim() ? name.trim() : "كفيل غير محدد";
}

// ----------------------------------------------------------------------
// Arabic Labels & Badges
// ----------------------------------------------------------------------

export function getTreasuryLocationLabel(loc: TreasuryLocation): string {
  switch (loc) {
    case TreasuryLocation.Supervisor:
      return "عهدة المشرف";
    case TreasuryLocation.Central:
      return "المركز الرئيسي";
    case TreasuryLocation.Bank:
      return "البنك";
    case TreasuryLocation.PetroApp:
      return "مقاصة بترو آب";
    default:
      return "غير محدد";
  }
}

export function getTreasuryPurposeLabel(purpose: TreasuryPurpose): string {
  switch (purpose) {
    case TreasuryPurpose.Settlement:
      return "تصفيات";
    case TreasuryPurpose.AccountFee:
      return "رسوم الحساب";
    case TreasuryPurpose.Combined:
      return "مشترك / عام";
    default:
      return "غير محدد";
  }
}

export function getTreasuryDirectionsLabel(dir: TreasuryDirections): string {
  switch (dir) {
    case TreasuryDirections.InOnly:
      return "وارد فقط";
    case TreasuryDirections.OutOnly:
      return "صادر فقط";
    case TreasuryDirections.Dual:
      return "وارد وصادر";
    default:
      return "غير محدد";
  }
}

export function getTreasuryEntryKindLabel(kind: TreasuryEntryKind): string {
  switch (kind) {
    case TreasuryEntryKind.Business:
      return "حركة تشغيلية";
    case TreasuryEntryKind.Transfer:
      return "تحويل داخلي";
    case TreasuryEntryKind.Opening:
      return "رصيد افتتاحي";
    case TreasuryEntryKind.Adjustment:
      return "تسوية مالية";
    case TreasuryEntryKind.Reversal:
      return "عكس قيد";
    default:
      return "غير محدد";
  }
}

export function getPetroEvidenceKindLabel(kind: PetroEvidenceKind): string {
  switch (kind) {
    case PetroEvidenceKind.Funding:
      return "دليل تمويل";
    case PetroEvidenceKind.Statement:
      return "رصيد بيان / كشف";
    default:
      return "غير محدد";
  }
}

export function getHandoverStatusLabel(status: TreasuryHandoverStatus): {
  label: string;
  tone: "blue" | "green" | "orange" | "red" | "gray";
} {
  switch (status) {
    case TreasuryHandoverStatus.Pending:
      return { label: "قيد المطابقة والاعتماد", tone: "orange" };
    case TreasuryHandoverStatus.Confirmed:
      return { label: "معتمد ومطابق", tone: "green" };
    case TreasuryHandoverStatus.Cancelled:
      return { label: "ملغى", tone: "red" };
    default:
      return { label: "غير معروف", tone: "gray" };
  }
}

// ----------------------------------------------------------------------
// Account Tree Helpers
// ----------------------------------------------------------------------

export interface AccountTreeNode extends TreasuryAccount {
  children: AccountTreeNode[];
  depth: number;
}

/**
 * Builds a hierarchical tree of accounts from a flat array using `parentId`.
 */
export function buildAccountTree(accounts: TreasuryAccount[]): AccountTreeNode[] {
  const nodeMap = new Map<string, AccountTreeNode>();
  accounts.forEach((acc) => {
    nodeMap.set(acc.id, { ...acc, children: [], depth: 0 });
  });

  const roots: AccountTreeNode[] = [];

  nodeMap.forEach((node) => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

/**
 * Flattens the tree with indentation depth indicator for select menus or trees.
 */
export function flattenAccountTree(nodes: AccountTreeNode[]): AccountTreeNode[] {
  const result: AccountTreeNode[] = [];
  function traverse(list: AccountTreeNode[], currentDepth: number) {
    for (const item of list) {
      result.push({ ...item, depth: currentDepth });
      if (item.children.length > 0) {
        traverse(item.children, currentDepth + 1);
      }
    }
  }
  traverse(nodes, 0);
  return result;
}
