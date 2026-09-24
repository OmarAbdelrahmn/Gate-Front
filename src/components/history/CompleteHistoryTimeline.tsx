"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  History,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Eye,
  FileText,
  FileSpreadsheet,
  FileCheck,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  ShieldCheck,
  Key,
  Wrench,
  Boxes,
  Droplet,
  Receipt,
  Activity,
  Gauge,
  Fingerprint,
  CreditCard,
  Paperclip,
  HardHat,
  PackagePlus,
  Car,
  User,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  RefreshCw,
  Info,
  CheckCircle2,
  XCircle,
  File,
  Lock,
  ArrowRight,
  Maximize2,
  X,
} from "lucide-react";
import { authDownload, authPreviewBlob } from "@/lib/auth/api";
import { toast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import type {
  CompleteHistoryResponse,
  CompleteHistoryEvent,
  CompleteHistoryEventFile,
} from "@/lib/fleet/types";
import { getVehicleDetail } from "@/lib/fleet/api";

// ============================================================================
// Category Configuration
// ============================================================================

export interface CategoryMeta {
  labelAr: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  dotColor: string;
  railColor: string;
}

export const CATEGORY_MAP: Record<string, CategoryMeta> = {
  assignment: {
    labelAr: "إسناد وعهد المركبة",
    labelEn: "Assignment",
    icon: Key,
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    dotColor: "bg-blue-600 text-white ring-blue-100 dark:ring-blue-900",
    railColor: "border-blue-200 dark:border-blue-800",
  },
  assignment_event: {
    labelAr: "حدث عهدة",
    labelEn: "Assignment Event",
    icon: Key,
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    dotColor: "bg-sky-600 text-white ring-sky-100 dark:ring-sky-900",
    railColor: "border-sky-200 dark:border-sky-800",
  },
  assignment_file: {
    labelAr: "مستندات العهدة",
    labelEn: "Assignment File",
    icon: Paperclip,
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    dotColor: "bg-indigo-600 text-white ring-indigo-100 dark:ring-indigo-900",
    railColor: "border-indigo-200 dark:border-indigo-800",
  },
  issue: {
    labelAr: "بلاغ عطل",
    labelEn: "Vehicle Issue",
    icon: AlertTriangle,
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    dotColor: "bg-amber-500 text-white ring-amber-100 dark:ring-amber-900",
    railColor: "border-amber-200 dark:border-amber-800",
  },
  issue_event: {
    labelAr: "تحديث عطل",
    labelEn: "Issue Event",
    icon: AlertTriangle,
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
    dotColor: "bg-orange-500 text-white ring-orange-100 dark:ring-orange-900",
    railColor: "border-orange-200 dark:border-orange-800",
  },
  accident: {
    labelAr: "حادث مروري",
    labelEn: "Accident",
    icon: ShieldAlert,
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    dotColor: "bg-rose-600 text-white ring-rose-100 dark:ring-rose-900",
    railColor: "border-rose-200 dark:border-rose-800",
  },
  accident_event: {
    labelAr: "إجراء حادث",
    labelEn: "Accident Event",
    icon: ShieldAlert,
    badgeClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    dotColor: "bg-red-600 text-white ring-red-100 dark:ring-red-900",
    railColor: "border-red-200 dark:border-red-800",
  },
  maintenance: {
    labelAr: "أمر صيانة",
    labelEn: "Maintenance",
    icon: Wrench,
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
    dotColor: "bg-purple-600 text-white ring-purple-100 dark:ring-purple-900",
    railColor: "border-purple-200 dark:border-purple-800",
  },
  material_usage: {
    labelAr: "استهلاك قطع ومواد",
    labelEn: "Material Usage",
    icon: Boxes,
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    dotColor: "bg-slate-600 text-white ring-slate-100 dark:ring-slate-800",
    railColor: "border-slate-200 dark:border-slate-700",
  },
  oil_change: {
    labelAr: "تغيير زيت",
    labelEn: "Oil Change",
    icon: Droplet,
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    dotColor: "bg-emerald-600 text-white ring-emerald-100 dark:ring-emerald-900",
    railColor: "border-emerald-200 dark:border-emerald-800",
  },
  vehicle_expense: {
    labelAr: "مصروف مركبة",
    labelEn: "Vehicle Expense",
    icon: Receipt,
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
    dotColor: "bg-teal-600 text-white ring-teal-100 dark:ring-teal-900",
    railColor: "border-teal-200 dark:border-teal-800",
  },
  compliance: {
    labelAr: "فحص وامتثال",
    labelEn: "Compliance",
    icon: ShieldCheck,
    badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
    dotColor: "bg-cyan-600 text-white ring-cyan-100 dark:ring-cyan-900",
    railColor: "border-cyan-200 dark:border-cyan-800",
  },
  vehicle_status: {
    labelAr: "حالة تشغيلية",
    labelEn: "Vehicle Status",
    icon: Activity,
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
    dotColor: "bg-violet-600 text-white ring-violet-100 dark:ring-violet-900",
    railColor: "border-violet-200 dark:border-violet-800",
  },
  odometer: {
    labelAr: "قراءة العداد",
    labelEn: "Odometer",
    icon: Gauge,
    badgeClass: "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-700",
    dotColor: "bg-blue-700 text-white ring-blue-200 dark:ring-blue-900",
    railColor: "border-blue-300 dark:border-blue-700",
  },
  vehicle_identity: {
    labelAr: "بيانات وهوية المركبة",
    labelEn: "Vehicle Identity",
    icon: Fingerprint,
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
    dotColor: "bg-slate-700 text-white ring-slate-200 dark:ring-slate-800",
    railColor: "border-slate-300 dark:border-slate-700",
  },
  registration: {
    labelAr: "رخصة السير والاستمارة",
    labelEn: "Registration",
    icon: CreditCard,
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-700",
    dotColor: "bg-indigo-700 text-white ring-indigo-200 dark:ring-indigo-900",
    railColor: "border-indigo-300 dark:border-indigo-700",
  },
  vehicle_file: {
    labelAr: "ملف ووثيقة",
    labelEn: "Vehicle File",
    icon: FileText,
    badgeClass: "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700",
    dotColor: "bg-zinc-600 text-white ring-zinc-200 dark:ring-zinc-800",
    railColor: "border-zinc-300 dark:border-zinc-700",
  },
  rider_equipment: {
    labelAr: "معدات وعهد المندوب",
    labelEn: "Rider Equipment",
    icon: HardHat,
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-700",
    dotColor: "bg-amber-600 text-white ring-amber-200 dark:ring-amber-900",
    railColor: "border-amber-300 dark:border-amber-700",
  },
  inventory_request: {
    labelAr: "طلب صرف مخزون",
    labelEn: "Inventory Request",
    icon: PackagePlus,
    badgeClass: "bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/50 dark:text-cyan-200 dark:border-cyan-700",
    dotColor: "bg-cyan-700 text-white ring-cyan-200 dark:ring-cyan-900",
    railColor: "border-cyan-300 dark:border-cyan-700",
  },
  operation_card: {
    labelAr: "بطاقة التشغيل",
    labelEn: "Operation Card",
    icon: CreditCard,
    badgeClass: "bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/50 dark:text-teal-200 dark:border-teal-700",
    dotColor: "bg-teal-600 text-white ring-teal-200 dark:ring-teal-900",
    railColor: "border-teal-300 dark:border-teal-700",
  },
  operationcard: {
    labelAr: "بطاقة التشغيل",
    labelEn: "Operation Card",
    icon: CreditCard,
    badgeClass: "bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/50 dark:text-teal-200 dark:border-teal-700",
    dotColor: "bg-teal-600 text-white ring-teal-200 dark:ring-teal-900",
    railColor: "border-teal-300 dark:border-teal-700",
  },
  operation: {
    labelAr: "بطاقة التشغيل",
    labelEn: "Operation Card",
    icon: CreditCard,
    badgeClass: "bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/50 dark:text-teal-200 dark:border-teal-700",
    dotColor: "bg-teal-600 text-white ring-teal-200 dark:ring-teal-900",
    railColor: "border-teal-300 dark:border-teal-700",
  },
  periodic_inspection: {
    labelAr: "الفحص الدوري",
    labelEn: "Periodic Inspection",
    icon: ShieldCheck,
    badgeClass: "bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950/50 dark:text-cyan-200 dark:border-cyan-700",
    dotColor: "bg-cyan-600 text-white ring-cyan-200 dark:ring-cyan-900",
    railColor: "border-cyan-300 dark:border-cyan-700",
  },
  inspection: {
    labelAr: "الفحص الدوري",
    labelEn: "Periodic Inspection",
    icon: ShieldCheck,
    badgeClass: "bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950/50 dark:text-cyan-200 dark:border-cyan-700",
    dotColor: "bg-cyan-600 text-white ring-cyan-200 dark:ring-cyan-900",
    railColor: "border-cyan-300 dark:border-cyan-700",
  },
  insurance: {
    labelAr: "وثيقة التأمين",
    labelEn: "Insurance",
    icon: ShieldAlert,
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-700",
    dotColor: "bg-emerald-600 text-white ring-emerald-200 dark:ring-emerald-900",
    railColor: "border-emerald-300 dark:border-emerald-700",
  },
  tamm: {
    labelAr: "تفويض تم",
    labelEn: "Tamm Authorization",
    icon: Key,
    badgeClass: "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-700",
    dotColor: "bg-blue-600 text-white ring-blue-200 dark:ring-blue-900",
    railColor: "border-blue-300 dark:border-blue-700",
  },
  traffic_fine: {
    labelAr: "مخالفة مرورية",
    labelEn: "Traffic Violation",
    icon: AlertOctagon,
    badgeClass: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-700",
    dotColor: "bg-amber-600 text-white ring-amber-200 dark:ring-amber-900",
    railColor: "border-amber-300 dark:border-amber-700",
  },
};

const DEFAULT_CATEGORY: CategoryMeta = {
  labelAr: "حدث عام",
  labelEn: "General Event",
  icon: History,
  badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  dotColor: "bg-slate-500 text-white ring-slate-100 dark:ring-slate-800",
  railColor: "border-slate-200 dark:border-slate-700",
};

// ============================================================================
// Action Helpers
// ============================================================================

// ============================================================================
// Action & Text Translation Helpers
// ============================================================================

export function formatAction(action: string, locale: "ar" | "en" = "ar"): { text: string; isNotable?: boolean } {
  const raw = (action || "").trim();
  const norm = raw.toLowerCase().replace(/[\s_-]+/g, "_");
  const isEn = locale === "en";

  const arMap: Record<string, string> = {
    // Handover & Taking
    handed_over: "تسليم عهدة",
    handover: "تسليم عهدة",
    handedover: "تسليم عهدة",
    handed: "تسليم عهدة",
    taken: "استلام عهدة",
    take: "استلام عهدة",
    took: "استلام عهدة",
    received: "استلام عهدة",

    // Returns
    return: "إرجاع عهدة",
    returned: "إرجاع عهدة",
    handback: "إرجاع عهدة",
    return_balance_recorded: "تسجيل رصيد الإرجاع",
    condition_report: "تقرير فحص الحالة",

    // Assignments
    assigned: "إسناد عهدة",
    assign: "إسناد عهدة",
    assignment: "إسناد عهدة",
    unassigned: "إلغاء الإسناد",
    unassign: "إلغاء الإسناد",
    swap: "تبديل عهدة",
    swapped: "تبديل عهدة",
    vehicle_swapped: "تبديل مركبة",
    renew: "تجديد تفويض",
    renewed: "تجديد تفويض",
    renew_permission: "تجديد تفويض",
    permission_renewed: "تجديد تفويض",
    attach_promissory: "إرفاق سند لأمر",
    promissory_attached: "إرفاق سند لأمر",

    // CRUD & Status
    created: "إنشاء جديد",
    create: "إنشاء جديد",
    updated: "تعديل بيانات",
    update: "تعديل بيانات",
    modified: "تعديل بيانات",
    resolved: "تم الحل والمعالجة",
    resolve: "تم الحل والمعالجة",
    closed: "إغلاق السجل",
    close: "إغلاق السجل",
    opened: "فتح السجل",
    status_changed: "تغيير الحالة",
    status_updated: "تحديث الحالة",

    // Operations & Maintenance
    odometer_recorded: "تسجيل عداد",
    record_odometer: "تسجيل عداد",
    odometer_update: "تحديث العداد",
    oil_changed: "تغيير زيت",
    oil_change: "تغيير زيت",
    expense_added: "تسجيل مصروف",
    expense_recorded: "تسجيل مصروف",
    inspection_passed: "اجتياز الفحص الدوري",
    inspection_failed: "رسوب في الفحص الدوري",
    policy_renewed: "تجديد وثيقة التأمين",
    insurance_renewed: "تجديد وثيقة التأمين",
    registration_renewed: "تجديد الاستمارة",
    file_uploaded: "رفع مستند",
    document_uploaded: "رفع مستند",
    file_deleted: "حذف مستند",
    equipment_issued: "صرف عهدة للمندوب",
    equipment_returned: "إرجاع عهدة المندوب",
    inventory_requested: "طلب صرف مخزون",
    hold_placed: "إيقاف المركبة",
    hold_released: "فك إيقاف المركبة",

    // Operation Card & Licensing
    operation_card: "بطاقة التشغيل",
    operationcard: "بطاقة التشغيل",
    operating_card: "بطاقة التشغيل",
    operatingcard: "بطاقة التشغيل",
    operation_card_renewed: "تجديد بطاقة التشغيل",
    operation_card_renew: "تجديد بطاقة التشغيل",
    renew_operation_card: "تجديد بطاقة التشغيل",
    operation_card_issued: "إصدار بطاقة التشغيل",
    operation_card_issue: "إصدار بطاقة التشغيل",
    operation_card_uploaded: "رفع بطاقة التشغيل",
    operation_card_upload: "رفع بطاقة التشغيل",
    operation_card_updated: "تحديث بطاقة التشغيل",
    operation_card_update: "تحديث بطاقة التشغيل",
    operation_card_expired: "انتهاء بطاقة التشغيل",
    card_renewed: "تجديد البطاقة",
    card_issued: "إصدار البطاقة",
    card_uploaded: "رفع البطاقة",
    periodic_inspection: "الفحص الدوري",
    inspection: "فحص فني",
    insurance: "وثيقة التأمين",
    insurance_policy: "وثيقة التأمين",
    tamm_authorization: "تفويض تم",
    authorization: "تفويض قيادة",
  };

  if (!isEn) {
    if (arMap[norm]) {
      return {
        text: arMap[norm],
        isNotable:
          norm.includes("return_balance") ||
          norm.includes("condition_report") ||
          norm.includes("handed") ||
          norm.includes("taken") ||
          norm.includes("operation"),
      };
    }

    // Smart fallback translation heuristics for Arabic
    if (
      norm.includes("operation_card") ||
      norm.includes("operationcard") ||
      norm.includes("operating_card") ||
      norm.includes("operatingcard") ||
      norm.includes("opcard")
    ) {
      if (norm.includes("renew")) return { text: "تجديد بطاقة التشغيل", isNotable: true };
      if (norm.includes("upload") || norm.includes("file") || norm.includes("doc"))
        return { text: "رفع بطاقة التشغيل", isNotable: false };
      if (norm.includes("issue")) return { text: "إصدار بطاقة التشغيل", isNotable: true };
      if (norm.includes("expire")) return { text: "انتهاء بطاقة التشغيل", isNotable: true };
      if (norm.includes("update") || norm.includes("edit") || norm.includes("change"))
        return { text: "تحديث بطاقة التشغيل", isNotable: false };
      return { text: "بطاقة التشغيل", isNotable: true };
    }

    if (norm.includes("registration") || norm.includes("istimara")) {
      if (norm.includes("renew")) return { text: "تجديد رخصة السير", isNotable: true };
      return { text: "رخصة السير (الاستمارة)", isNotable: false };
    }

    if (norm.includes("insurance") || norm.includes("policy")) {
      if (norm.includes("renew")) return { text: "تجديد وثيقة التأمين", isNotable: true };
      return { text: "وثيقة التأمين", isNotable: false };
    }

    if (norm.includes("inspection") || norm.includes("mvpi")) {
      if (norm.includes("pass")) return { text: "اجتياز الفحص الدوري", isNotable: true };
      if (norm.includes("fail")) return { text: "رسوب في الفحص الدوري", isNotable: true };
      return { text: "الفحص الدوري", isNotable: false };
    }

    if (norm.includes("odometer")) return { text: "قراءة العداد", isNotable: false };
    if (norm.includes("oil")) return { text: "تغيير زيت", isNotable: false };
    if (norm.includes("expense")) return { text: "تسجيل مصروف", isNotable: false };
    if (norm.includes("accident")) return { text: "حادث مروري", isNotable: true };
    if (norm.includes("issue")) return { text: "بلاغ عطل", isNotable: true };
    if (norm.includes("handover") || norm.includes("handed")) return { text: "تسليم عهدة", isNotable: true };
    if (norm.includes("return")) return { text: "إرجاع عهدة", isNotable: true };
    if (norm.includes("assign")) return { text: "إسناد عهدة", isNotable: true };
    if (norm.includes("swap")) return { text: "تبديل عهدة", isNotable: true };
    if (norm.includes("hold")) return { text: "إيقاف المركبة", isNotable: true };
    if (norm.includes("release")) return { text: "فك الإيقاف", isNotable: true };
    if (norm.includes("upload") || norm.includes("file") || norm.includes("doc"))
      return { text: "رفع مستند", isNotable: false };
    if (norm.includes("create") || norm.includes("add")) return { text: "إنشاء جديد", isNotable: false };
    if (norm.includes("update") || norm.includes("edit") || norm.includes("modify"))
      return { text: "تعديل بيانات", isNotable: false };
    if (norm.includes("delete") || norm.includes("remove")) return { text: "حذف", isNotable: true };
    if (norm.includes("close") || norm.includes("resolve")) return { text: "إغلاق / معالجة", isNotable: true };
  }

  // Format action text cleanly for English
  const words = norm.replace(/[_-]+/g, " ");
  return {
    text: words.charAt(0).toUpperCase() + words.slice(1),
    isNotable: norm.includes("return_balance") || norm.includes("condition_report"),
  };
}

export function translateSummary(
  summary: string | null | undefined,
  locale: "ar" | "en" = "ar",
  vehicleMeta?: { plate?: string | null; serial?: string | null }
): string {
  if (!summary) return "";

  // Helper to format vehicle label cleanly without VEH-* hash
  const formatVehLabel = (rawVehId?: string) => {
    const p = vehicleMeta?.plate;
    const sr = vehicleMeta?.serial;
    if (locale === "en") {
      if (p && sr) return `Vehicle (Plate: ${p} · Serial: ${sr})`;
      if (p) return `Vehicle (Plate: ${p})`;
      if (sr) return `Vehicle (Serial: ${sr})`;
      return "Vehicle";
    }
    if (p && sr) return `المركبة (لوحة: ${p} · تسلسلي: ${sr})`;
    if (p) return `المركبة (لوحة: ${p})`;
    if (sr) return `المركبة (تسلسلي: ${sr})`;
    return "المركبة";
  };

  if (locale === "en") {
    let eng = summary.trim();
    if (vehicleMeta?.plate || vehicleMeta?.serial) {
      eng = eng.replace(/Vehicle\s+VEH-[A-Z0-9_-]+/gi, formatVehLabel());
      eng = eng.replace(/VEH-[A-Z0-9_-]+/gi, () => {
        const p = vehicleMeta?.plate;
        const sr = vehicleMeta?.serial;
        if (p && sr) return `(Plate: ${p} · Serial: ${sr})`;
        if (p) return `(Plate: ${p})`;
        if (sr) return `(Serial: ${sr})`;
        return "";
      });
    } else {
      eng = eng.replace(/Vehicle\s+VEH-[A-Z0-9_-]+/gi, "Vehicle");
      eng = eng.replace(/VEH-[A-Z0-9_-]+/gi, "");
    }
    return eng;
  }

  let s = summary.trim().replace(/^[.\s]+|[.\s]+$/g, "");

  // 1. Vehicle {VEH} handed to {NAME}
  const handedToMatch = s.match(/^Vehicle\s+([\w\d-]+)\s+handed\s+(?:over\s+)?to\s+(.+)$/i);
  if (handedToMatch) {
    const veh = formatVehLabel(handedToMatch[1]);
    return `تم تسليم ${veh} إلى (${handedToMatch[2]})`;
  }

  // 2. Vehicle {VEH} taken by / to {NAME}
  const takenMatch = s.match(/^Vehicle\s+([\w\d-]+)\s+taken\s+(?:by|to)\s+(.+)$/i);
  if (takenMatch) {
    const veh = formatVehLabel(takenMatch[1]);
    return `تم استلام ${veh} بواسطة (${takenMatch[2]})`;
  }

  // 3. Vehicle {VEH} returned by / from {NAME}
  const returnedMatch = s.match(/^Vehicle\s+([\w\d-]+)\s+returned\s+(?:by|from)\s+(.+)$/i);
  if (returnedMatch) {
    const veh = formatVehLabel(returnedMatch[1]);
    return `تم إرجاع ${veh} من قِبل (${returnedMatch[2]})`;
  }

  // 4. Vehicle {VEH} assigned to {NAME}
  const assignedMatch = s.match(/^Vehicle\s+([\w\d-]+)\s+assigned\s+to\s+(.+)$/i);
  if (assignedMatch) {
    const veh = formatVehLabel(assignedMatch[1]);
    return `تم إسناد ${veh} إلى (${assignedMatch[2]})`;
  }

  // 5. Vehicle {VEH} swapped with / to {NAME}
  const swappedMatch = s.match(/^Vehicle\s+([\w\d-]+)\s+swapped\s+(?:with|to)\s+(.+)$/i);
  if (swappedMatch) {
    const veh = formatVehLabel(swappedMatch[1]);
    return `تم تبديل ${veh} مع (${swappedMatch[2]})`;
  }

  // 6. Vehicle/rider assignment imported from Tamm Excel file
  if (/(?:vehicle\/rider\s+)?assignment\s+imported\s+from\s+tamm\s+excel(?:\s+file)?/i.test(s)) {
    return "تم استيراد إسناد المركبة والمندوب من ملف إكسل تم";
  }

  // 7. Imported from Tamm authorization sheet / file
  if (/imported\s+from\s+tamm\s+authorization(?:\s+sheet)?/i.test(s)) {
    return "تم الاستيراد من كشف تفويضات تم";
  }
  if (/imported\s+from\s+tamm\s+excel(?:\s+file)?/i.test(s)) {
    return "تم الاستيراد من ملف إكسل تم";
  }
  if (/imported\s+from\s+tamm/i.test(s)) {
    return "تم الاستيراد من منصة تم";
  }

  // 8. Odometer reading ... recorded ...
  const odoMatch = s.match(/^Odometer\s+(?:reading\s+)?(\d+[\d,.]*)\s*(?:km)?\s*recorded(?:\s+for\s+vehicle\s+([\w\d-]+))?/i);
  if (odoMatch) {
    const veh = odoMatch[2] ? ` لـ ${formatVehLabel(odoMatch[2])}` : "";
    return `تم تسجيل قراءة العداد: ${odoMatch[1]} كم${veh}`;
  }

  // 9. Issue #{id} reported / resolved / closed
  const issueMatch = s.match(/^(?:Vehicle\s+)?Issue\s+(?:#?([\w\d-]+)\s+)?(reported|resolved|closed|created|updated)(?:\s*:\s*(.+))?/i);
  if (issueMatch) {
    const id = issueMatch[1] ? `#${issueMatch[1]} ` : "";
    const action = issueMatch[2].toLowerCase();
    const title = issueMatch[3] ? `: ${issueMatch[3]}` : "";
    if (action === "reported" || action === "created") return `تم الإبلاغ عن عطل ${id}${title}`;
    if (action === "resolved") return `تمت معالجة العطل ${id}${title}`;
    if (action === "closed") return `تم إغلاق بلاغ العطل ${id}${title}`;
    return `تحديث بلاغ العطل ${id}${title}`;
  }

  // 10. Accident reported / created
  const accidentMatch = s.match(/^(?:Vehicle\s+)?Accident\s+(?:#?([\w\d-]+)\s+)?(reported|created|updated|closed)(?:\s+(?:for\s+vehicle\s+|on\s+)([\w\d-]+))?/i);
  if (accidentMatch) {
    const id = accidentMatch[1] ? `رقم #${accidentMatch[1]} ` : "";
    const extra = accidentMatch[3] ? ` (${formatVehLabel(accidentMatch[3])})` : "";
    return `تم تسجيل حادث مروري ${id}${extra}`;
  }

  // 11. Maintenance work order ...
  const woMatch = s.match(/^(?:Maintenance\s+)?Work\s*Order\s+(?:#?([\w\d-]+)\s+)?(created|completed|started|updated|closed)/i);
  if (woMatch) {
    const id = woMatch[1] ? `#${woMatch[1]} ` : "";
    const action = woMatch[2].toLowerCase();
    if (action === "created") return `تم إنشاء أمر صيانة ${id}`;
    if (action === "completed") return `تم إنجاز أمر الصيانة ${id}`;
    if (action === "started") return `بدء تنفيذ أمر الصيانة ${id}`;
    return `تحديث أمر الصيانة ${id}`;
  }

  // 12. Oil change completed / recorded
  const oilMatch = s.match(/^Oil\s+change\s+(?:completed|recorded)(?:\s+at\s+(\d+[\d,.]*)\s*(?:km)?)?/i);
  if (oilMatch) {
    return oilMatch[1] ? `تم تغيير زيت المحرك عند العداد ${oilMatch[1]} كم` : "تم تغيير زيت المحرك";
  }

  // 13. Vehicle expense recorded
  const expenseMatch = s.match(/^(?:Vehicle\s+)?Expense\s+(?:of\s+([\d,.]+)\s*(?:sar)?)?\s*recorded(?:\s*:\s*(.+))?/i);
  if (expenseMatch) {
    const amount = expenseMatch[1] ? `بقيمة ${expenseMatch[1]} ر.س ` : "";
    const title = expenseMatch[2] ? `(${expenseMatch[2]})` : "";
    return `تم تسجيل مصروف للمركبة ${amount}${title}`;
  }

  // 14. Condition report generated / recorded
  if (/condition\s+report\s+(?:recorded|generated|created)/i.test(s)) {
    return "تم إصدار تقرير فحص حالة المركبة";
  }

  // 15. Return balance recorded
  if (/return\s+balance\s+recorded/i.test(s)) {
    return "تم تسجيل رصيد إرجاع العهد والمعدات";
  }

  // 16. Equipment ... issued / returned
  const equipMatch = s.match(/^Equipment\s+(.+?)\s+(issued\s+to|returned\s+by)\s+(.+)$/i);
  if (equipMatch) {
    const item = equipMatch[1];
    const isIssued = equipMatch[2].toLowerCase().includes("issued");
    const person = equipMatch[3];
    return isIssued
      ? `تم صرف عهدة (${item}) للمندوب (${person})`
      : `تم إرجاع عهدة (${item}) من المندوب (${person})`;
  }

  // 17. Status changed
  const statusMatch = s.match(/^Vehicle\s+status\s+changed\s+(?:from\s+([\w\d-]+)\s+)?to\s+([\w\d-]+)/i);
  if (statusMatch) {
    const toStatus = translateStatus(statusMatch[2], locale);
    return `تم تغيير حالة المركبة إلى "${toStatus}"`;
  }

  // 18. Registration renewed
  if (/registration\s+renewed/i.test(s)) {
    return "تم تجديد رخصة السير (الاستمارة)";
  }

  // 19. Insurance policy renewed
  if (/insurance\s+(?:policy\s+)?renewed/i.test(s)) {
    return "تم تجديد وثيقة التأمين";
  }

  // 20. Inspection passed / failed
  if (/inspection\s+passed/i.test(s)) {
    return "تم اجتياز الفحص الفني الدوري بنجاح";
  }
  if (/inspection\s+failed/i.test(s)) {
    return "لم تجتز المركبة الفحص الفني الدوري";
  }

  // 21. Promissory note file attached
  if (/promissory\s+note(?:\s+file)?\s+attached/i.test(s)) {
    return "تم إرفاق سند لأمر للمندوب";
  }

  // 22. Operation card events
  if (/^operation\s*card\s*(?:file\s+)?uploaded(?:\s*:\s*(.+))?$/i.test(s)) {
    const m = s.match(/^operation\s*card\s*(?:file\s+)?uploaded(?:\s*:\s*(.+))?$/i);
    const rest = m?.[1] ? m[1].replace(/\.(pdf|png|jpe?g)$/i, "").trim() : "";
    return rest ? `تم رفع بطاقة التشغيل (${rest})` : "تم رفع بطاقة التشغيل";
  }
  if (/^operation\s*card\s*renewed(?:\s*:\s*(.+))?$/i.test(s)) {
    const m = s.match(/^operation\s*card\s*renewed(?:\s*:\s*(.+))?$/i);
    const rest = m?.[1] ? m[1].replace(/\.(pdf|png|jpe?g)$/i, "").trim() : "";
    return rest ? `تم تجديد بطاقة التشغيل (${rest})` : "تم تجديد بطاقة التشغيل";
  }
  if (/^operation\s*card\s*updated(?:\s*:\s*(.+))?$/i.test(s)) {
    const m = s.match(/^operation\s*card\s*updated(?:\s*:\s*(.+))?$/i);
    const rest = m?.[1] ? m[1].replace(/\.(pdf|png|jpe?g)$/i, "").trim() : "";
    return rest ? `تم تحديث بيانات بطاقة التشغيل (${rest})` : "تم تحديث بطاقة التشغيل";
  }
  if (/^operation\s*card\s*issued(?:\s*:\s*(.+))?$/i.test(s)) {
    const m = s.match(/^operation\s*card\s*issued(?:\s*:\s*(.+))?$/i);
    const rest = m?.[1] ? m[1].replace(/\.(pdf|png|jpe?g)$/i, "").trim() : "";
    return rest ? `تم إصدار بطاقة التشغيل (${rest})` : "تم إصدار بطاقة التشغيل";
  }
  if (/^operation\s*card\s*(?:valid\s+until|expiry|expiring\s+on)?\s*(\d{1,2}[-./]\d{1,2}[-./]\d{2,4})/i.test(s)) {
    const m = s.match(/^operation\s*card\s*(?:valid\s+until|expiry|expiring\s+on)?\s*(\d{1,2}[-./]\d{1,2}[-./]\d{2,4})/i);
    return `بطاقة تشغيل سارية حتى ${m?.[1]}`;
  }
  if (/^operation\s*card$/i.test(s) || /^operationcard$/i.test(s)) {
    return "تحديث بطاقة التشغيل";
  }

  // Clean raw file names ending with .pdf/.png/.jpg from the summary title to prevent BiDi flip
  if (/\.(pdf|png|jpe?g)$/i.test(s)) {
    const cleaned = s.replace(/\.(pdf|png|jpe?g)$/i, "").trim();
    const dateMatch = cleaned.match(/(\d{1,2}[-./]\d{1,2}[-./]\d{2,4})/);
    if (dateMatch && !/[\u0600-\u06FF]/.test(cleaned)) {
      return `مستند بطاقة التشغيل بتاريخ ${dateMatch[1]}`;
    }
    s = cleaned;
  }

  // Strip or replace any remaining VEH-[A-Z0-9_-] occurrences in the text
  s = s.replace(/Vehicle\s+VEH-[A-Z0-9_-]+/gi, () => formatVehLabel());
  s = s.replace(/VEH-[A-Z0-9_-]+/gi, () => {
    const p = vehicleMeta?.plate;
    const sr = vehicleMeta?.serial;
    if (p && sr) return `(لوحة: ${p} · تسلسلي: ${sr})`;
    if (p) return `(لوحة: ${p})`;
    if (sr) return `(تسلسلي: ${sr})`;
    return "";
  });

  return s;
}

export function translateNotesOrReason(text: string | null | undefined, locale: "ar" | "en" = "ar"): string | null {
  if (!text) return null;
  if (locale === "en") return text;

  const cleaned = text.trim().replace(/^[.\s]+|[.\s]+$/g, "");

  if (/imported\s+from\s+tamm\s+authorization(?:\s+sheet)?/i.test(cleaned)) {
    return "تم الاستيراد من كشف تفويضات تم";
  }
  if (/imported\s+from\s+tamm\s+excel(?:\s+file)?/i.test(cleaned)) {
    return "تم الاستيراد من ملف إكسل تم";
  }
  if (/imported\s+from\s+tamm/i.test(cleaned)) {
    return "تم الاستيراد من منصة تم";
  }
  if (/vehicle\/rider\s+assignment\s+imported/i.test(cleaned)) {
    return "تم استيراد إسناد المركبة والمندوب من ملف إكسل تم";
  }
  if (/initial\s+(?:creation|assignment)/i.test(cleaned)) {
    return "إسناد / إنشاء أولي";
  }
  if (/routine\s+maintenance/i.test(cleaned)) {
    return "صيانة دورية مجدولة";
  }
  if (/scheduled\s+oil\s+change/i.test(cleaned)) {
    return "تغيير زيت مجدول";
  }
  if (/wear\s+and\s+tear/i.test(cleaned)) {
    return "استهلاك طبيعي للقطع";
  }
  if (/accident\s+damage/i.test(cleaned)) {
    return "أضرار ناتجة عن حادث مروري";
  }
  if (/rider\s+requested\s+return/i.test(cleaned)) {
    return "طلب المندوب إرجاع المركبة";
  }
  if (/good\s+condition/i.test(cleaned)) {
    return "تم الاستلام بحالة ممتازة وبدون ملاحظات";
  }
  if (/end\s+of\s+contract/i.test(cleaned)) {
    return "انتهاء فترة العقد / التكليف";
  }
  if (/driver\s+vacation/i.test(cleaned)) {
    return "إجازة السائق";
  }

  return cleaned;
}

export function translateStatus(status: string | null | undefined, locale: "ar" | "en" = "ar"): string {
  if (!status) return "—";
  if (locale === "en") return status;
  const s = String(status).trim().toLowerCase();
  const map: Record<string, string> = {
    available: "متاح",
    assigned: "معيّن (قيد العهدة)",
    problemhold: "إيقاف (عطل)",
    accidenthold: "إيقاف (حادث)",
    stolen: "مسروق / مفقود",
    outofservice: "خارج الخدمة",
    decommissioned: "مستبعد نهائياً",
    active: "نشط",
    inactive: "غير نشط",
    draft: "مسودة",
    onboarding: "قيد التهيئة",
    suspended: "موقوف",
    onleave: "في إجازة",
    terminated: "منتهي الخدمة",
    archived: "مؤرشف",
    fleeing: "هروب / انقطاع",
    pending: "قيد الانتظار",
    resolved: "تم الحل",
    closed: "مغلق",
    completed: "مكتمل",
    open: "مفتوح",
    in_progress: "قيد التنفيذ",
    passed: "اجتياز",
    failed: "رسوب",
    valid: "ساري",
    uptodate: "محدّث وساري",
    up_to_date: "محدّث وساري",
    expiring_soon: "ينتهي قريباً",
    due_soon: "يستحق قريباً",
    due: "مستحق",
    overdue: "متأخر",
    expired: "منتهي الصلاحية",
    renewed: "تم التجديد",
    compliant: "ممتثل",
    non_compliant: "غير ممتثل",
    uploaded: "تم الرفع",
    not_uploaded: "لم يُرفع",
    missing: "مفقود / غير متوفر",
  };
  return map[s] || status;
}

export function formatReferenceValue(val: unknown, locale: "ar" | "en" = "ar"): string {
  if (val === null || val === undefined) return "—";
  const str = String(val).trim();
  if (locale === "en") return str;

  const tammMatch = str.match(/^tamm(?:\s+authorization)?(?:\s*#?\s*:?\s*)(\d+)/i);
  if (tammMatch) {
    return `تفويض تم: ${tammMatch[1]}`;
  }
  const woMatch = str.match(/^(?:work\s*order|wo)(?:\s*#?\s*:?\s*)(.+)/i);
  if (woMatch) {
    return `أمر صيانة: ${woMatch[1]}`;
  }
  const najmMatch = str.match(/^(?:najm|accident)(?:\s*#?\s*:?\s*)(.+)/i);
  if (najmMatch) {
    return `تقرير نجم/المرور: ${najmMatch[1]}`;
  }
  const policyMatch = str.match(/^(?:policy|insurance)(?:\s*#?\s*:?\s*)(.+)/i);
  if (policyMatch) {
    return `رقم الوثيقة: ${policyMatch[1]}`;
  }
  return str;
}

export function translateAttributeKey(key: string, locale: "ar" | "en" = "ar"): string {
  if (locale === "en") return key;
  const k = key.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const map: Record<string, string> = {
    permissionreference: "رقم التفويض (تم)",
    startodometer: "عداد البداية (كم)",
    endodometer: "عداد النهاية (كم)",
    currentodometer: "العداد الحالي (كم)",
    odometer: "قراءة العداد (كم)",
    startreason: "سبب التسليم",
    endreason: "سبب الإرجاع",
    actualridername: "اسم السائق الفعلي",
    actualrideriqama: "إقامة السائق الفعلي",
    actualrideriqamano: "إقامة السائق الفعلي",
    isrealrider: "هل السائق الفعلي مطابق للمسجل؟",
    assetnumber: "الرقم التشغيلي",
    platenumber: "رقم اللوحة",
    platenumberar: "رقم اللوحة بالعربية",
    platenumberen: "رقم اللوحة بالإنجليزية",
    chassisnumber: "رقم الهيكل",
    vin: "رقم الشاسيه (VIN)",
    workordernumber: "رقم أمر الصيانة",
    sparepartname: "اسم قطعة الغيار",
    partname: "اسم القطعة",
    itemname: "اسم المادة / الصنف",
    equipmentname: "اسم المعدة / العهدة",
    quantity: "الكمية",
    quantityused: "الكمية المستهلكة",
    returnedquantity: "الكمية المرتجعة",
    balancequantity: "الرصيد المتبقي",
    amount: "المبلغ",
    cost: "التكلفة",
    totalamount: "المبلغ الإجمالي",
    totalcost: "التكلفة الإجمالية",
    vatamount: "ضريبة القيمة المضافة",
    unitprice: "سعر الوحدة",
    status: "الحالة",
    newstatus: "الحالة الجديدة",
    oldstatus: "الحالة السابقة",
    previousstatus: "الحالة السابقة",
    workshop: "الورشة / مركز الصيانة",
    supplier: "المورد",
    suppliername: "اسم المورد",
    stationname: "اسم المحطة / الورشة",
    technician: "الفني المختص",
    policereportnumber: "رقم تقرير المرور / نجم",
    claimnumber: "رقم المطالبة التأمينية",
    invoicenumber: "رقم الفاتورة",
    conditionreport: "تقرير فحص الحالة",
    damages: "الأضرار المسجلة",
    notes: "الملاحظات",
    reason: "السبب",
    description: "الوصف",
    failurenotes: "ملاحظات الفحص / العطل",
    narrative: "تفاصيل الحادث",
    comments: "التعليقات",
    oiltype: "نوع الزيت",
    filterreplaced: "هل تم استبدال الفلتر؟",
    nextoilchangeodometer: "العداد لتغيير الزيت القادم",
    operationcardnumber: "رقم بطاقة التشغيل",
    operationcardversionid: "معرف إصدار بطاقة التشغيل",
    operationcardexpirydate: "تاريخ انتهاء بطاقة التشغيل",
    operationcardissuedate: "تاريخ إصدار بطاقة التشغيل",
    operationcardstatus: "حالة بطاقة التشغيل",
    operationcardfileuploaded: "هل تم رفع ملف بطاقة التشغيل؟",
    operationcardfile: "ملف بطاقة التشغيل",
    operatingcardnumber: "رقم بطاقة التشغيل",
    operatingcardexpirydate: "تاريخ انتهاء بطاقة التشغيل",
    operatingcardexpiry: "تاريخ انتهاء بطاقة التشغيل",
    operatingcard: "بطاقة التشغيل",
    cardtype: "نوع البطاقة",
    cardnumber: "رقم البطاقة",
    expirydate: "تاريخ الانتهاء",
    issuedate: "تاريخ الإصدار",
    expirationdate: "تاريخ الانتهاء",
    effectivedate: "تاريخ السريان",
    filename: "اسم الملف",
    filetype: "نوع الملف",
    filesize: "حجم الملف",
    filesizebytes: "حجم الملف (بايت)",
    contenttype: "نوع المحتوى",
    downloadpath: "مسار التنزيل",
    createdat: "تاريخ الإنشاء",
    updatedat: "تاريخ التحديث",
    createdby: "أنشئ بواسطة",
    updatedby: "عُدّل بواسطة",
    createdbyname: "أنشئ بواسطة",
    updatedbyname: "عُدّل بواسطة",
    performedby: "تم الإجراء بواسطة",
    actionby: "المستخدم المنفذ",
    blocksoperation: "هل يوقف تشغيل المركبة؟",
    operationalstatus: "الحالة التشغيلية",
    previousoperationalstatus: "الحالة التشغيلية السابقة",
    insurancecompany: "شركة التأمين",
    insurancepolicynumber: "رقم وثيقة التأمين",
    insuranceexpirydate: "تاريخ انتهاء التأمين",
    periodicinspectionexpirydate: "تاريخ انتهاء الفحص الدوري",
    periodicinspectionstatus: "حالة الفحص الدوري",
    registrationexpirydate: "تاريخ انتهاء الاستمارة",
  };
  return map[k] || key.replace(/([A-Z])/g, " $1").trim();
}


// ============================================================================
// Date & Size Helpers
// ============================================================================

function formatDateFull(isoString: string, locale: "ar" | "en" = "ar"): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  } catch {
    return isoString;
  }
}

function formatRelativeTime(isoString: string, locale: "ar" | "en" = "ar"): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const diffMs = Date.now() - d.getTime();
    if (isNaN(diffMs)) return "";
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (locale === "en") {
      if (diffSec < 60) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 30) return `${diffDays}d ago`;
      return d.toLocaleDateString("en-US");
    }

    if (diffSec < 60) return "الآن";
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return "أمس";
    if (diffDays < 30) return `منذ ${diffDays} يوم`;
    return d.toLocaleDateString("ar-SA");
  } catch {
    return "";
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes || isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ============================================================================
// Smart Details Viewer Component
// ============================================================================

interface EventDetailsViewProps {
  details: Record<string, unknown>;
  action: string;
  category: string;
  locale: "ar" | "en";
  vehicleMeta?: { plate?: string | null; serial?: string | null };
}

function EventDetailsView({ details, action, category, locale, vehicleMeta }: EventDetailsViewProps) {
  const [showRaw, setShowRaw] = useState(false);
  const isEn = locale === "en";

  if (!details || Object.keys(details).length === 0) {
    return null;
  }

  // Extract key highlighted fields
  const odometerKeys = ["odometer", "currentOdometer", "startOdometer", "endOdometer", "odo", "km"];
  const costKeys = ["amount", "cost", "totalAmount", "totalCost", "vatAmount", "unitPrice", "price"];
  const statusKeys = ["status", "newStatus", "oldStatus", "previousStatus", "operationalStatus", "state"];
  const materialKeys = ["partName", "sparePartName", "itemName", "materialName", "itemCode", "quantity", "quantityUsed", "unit"];
  const workshopKeys = ["workshop", "supplierName", "supplier", "stationName", "vendor"];
  const notesKeys = ["notes", "reason", "description", "startReason", "endReason", "failureNotes", "narrative", "comments"];
  const refKeys = ["workOrderNumber", "policeReportNumber", "claimNumber", "invoiceNumber", "permissionReference", "documentNumber"];

  // Helper to extract first matching
  const findValue = (keys: string[]) => {
    for (const k of keys) {
      if (details[k] !== undefined && details[k] !== null && String(details[k]).trim() !== "") {
        return { key: k, value: details[k] };
      }
    }
    return null;
  };

  const odometer = findValue(odometerKeys);
  const cost = findValue(costKeys);
  const statusVal = findValue(statusKeys);
  const notes = findValue(notesKeys);
  const reference = findValue(refKeys);
  const workshop = findValue(workshopKeys);

  // Return balance equipment details
  const isEquipmentReturn = action === "return_balance_recorded" || category === "rider_equipment";
  const returnedQty = details.returnedQuantity ?? details.quantityReturned;
  const balanceQty = details.balanceQuantity ?? details.remainingQuantity ?? details.balance;

  const plateDisplay = details.plateNumber || details.plateNumberAr || vehicleMeta?.plate;
  const serialDisplay = details.serialNumber || vehicleMeta?.serial;

  return (
    <div className="mt-3 space-y-2.5 text-xs">
      {/* Prominent Quick Highlights Grid */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Plate badge if available */}
        {plateDisplay && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-900 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800 font-bold shadow-2xs">
            <CreditCard className="size-3.5 text-blue-600 dark:text-blue-400" />
            <span>{isEn ? "Plate:" : "اللوحة:"}</span>
            <span className="font-mono">{String(plateDisplay)}</span>
          </span>
        )}

        {/* Serial badge if available */}
        {serialDisplay && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 font-bold shadow-2xs">
            <Fingerprint className="size-3.5 text-slate-500" />
            <span>{isEn ? "Serial:" : "التسلسلي:"}</span>
            <span className="font-mono">{String(serialDisplay)}</span>
          </span>
        )}
        {/* Odometer Card */}
        {odometer && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50/80 text-blue-900 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800 font-mono font-bold shadow-2xs">
            <Gauge className="size-3.5 text-blue-600 dark:text-blue-400" />
            <span dir="ltr">
              {Number(odometer.value).toLocaleString()}{" "}
              <span className="text-[11px] font-normal">{isEn ? "km" : "كم"}</span>
            </span>
          </span>
        )}

        {/* Cost / Amount Card */}
        {cost && !isNaN(Number(cost.value)) && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50/80 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800 font-mono font-bold shadow-2xs">
            <Receipt className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span dir="ltr">
              {Number(cost.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
              <span className="text-[11px] font-normal">{isEn ? "SAR" : "ر.س"}</span>
            </span>
          </span>
        )}

        {/* Status Transition Card */}
        {statusVal && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-50/80 text-violet-900 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-800 font-medium shadow-2xs">
            <Activity className="size-3.5 text-violet-600 dark:text-violet-400" />
            <span>{translateStatus(String(statusVal.value), locale)}</span>
          </span>
        )}

        {/* Workshop / Station */}
        {workshop && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 shadow-2xs">
            <Wrench className="size-3.5 text-slate-500" />
            <span>{String(workshop.value)}</span>
          </span>
        )}

        {/* Document Reference / Order Number */}
        {reference && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 shadow-2xs">
            <FileText className="size-3.5 text-slate-500" />
            <span dir="auto">{formatReferenceValue(reference.value, locale)}</span>
          </span>
        )}

        {/* Equipment Return Balance Details */}
        {isEquipmentReturn && (returnedQty !== undefined || balanceQty !== undefined) && (
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800 font-semibold shadow-2xs">
            <HardHat className="size-3.5 text-amber-600" />
            {returnedQty !== undefined && <span>{isEn ? `Returned: ${returnedQty}` : `المرتجع: ${returnedQty}`}</span>}
            {balanceQty !== undefined && <span>({isEn ? `Balance: ${balanceQty}` : `الرصيد المتبقي: ${balanceQty}`})</span>}
          </span>
        )}
      </div>

      {/* Primary Reason / Notes */}
      {notes && (
        <div className="rounded-lg bg-[var(--subtle-bg)]/80 p-2.5 border border-[var(--border)] text-xs text-[var(--foreground)]">
          <span className="font-bold text-[var(--muted)] block mb-0.5">
            {isEn ? "Note / Description:" : "الملاحظات والسبب:"}
          </span>
          <p className="whitespace-pre-line leading-relaxed" dir="auto">
            {translateNotesOrReason(String(notes.value), locale)}
          </p>
        </div>
      )}

      {/* Raw / All fields expandable drawer */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowRaw(!showRaw)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1167c9] hover:underline"
        >
          {showRaw ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          <span>
            {showRaw
              ? isEn
                ? "Hide extra details"
                : "إخفاء التفاصيل الإضافية"
              : isEn
              ? `View all attributes (${Object.keys(details).length})`
              : `عرض كافة الخصائص والحقول (${Object.keys(details).length})`}
          </span>
        </button>

        {showRaw && (
          <div className="mt-2 rounded-lg border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/50 p-3 text-[11px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(details)
                .filter(([k, v]) => {
                  const valStr = String(v ?? "").trim();
                  if (valStr.startsWith("VEH-")) return false;
                  if (k.toLowerCase().includes("assetnumber")) return false;
                  return true;
                })
                .map(([k, v]) => {
                const isBool = typeof v === "boolean";
                const isObj = typeof v === "object" && v !== null;
                let displayVal = "—";
                if (isBool) {
                  displayVal = isEn ? (v ? "Yes" : "No") : (v ? "نعم" : "لا");
                } else if (isObj) {
                  displayVal = JSON.stringify(v);
                } else if (v !== undefined && v !== null) {
                  displayVal = translateNotesOrReason(String(v), locale) || String(v);
                }

                return (
                  <div key={k} className="flex flex-col rounded bg-white dark:bg-slate-800/80 p-2 border border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 truncate">
                        {translateAttributeKey(k, locale)}
                      </span>
                      <span className="font-mono text-[9px] text-[var(--muted)] opacity-60 truncate" title={k}>
                        {k}
                      </span>
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 break-words font-mono mt-1 text-xs" dir="auto">
                      {displayVal}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Single File Attachment Item
// ============================================================================

interface FileAttachmentItemProps {
  file: CompleteHistoryEventFile;
  locale: "ar" | "en";
}

function FileAttachmentItem({ file, locale }: FileAttachmentItemProps) {
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const isEn = locale === "en";

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await authDownload(file.downloadPath);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(res.blob);
      link.download = file.fileName || res.fileName || "downloaded-file";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success(
        isEn ? "File downloaded" : "تم تنزيل الملف",
        isEn ? file.fileName : `تم تنزيل ${file.fileName} بنجاح`
      );
    } catch (err: any) {
      console.error("Download failed:", err);
      toast.error(
        isEn ? "Download failed" : "فشل التنزيل",
        err?.message || (isEn ? "Could not download file" : "تعذر تنزيل الملف")
      );
    } finally {
      setDownloading(false);
    }
  };

  const isPdfOrImage =
    file.contentType?.includes("pdf") ||
    file.contentType?.includes("image") ||
    file.fileName.toLowerCase().endsWith(".pdf") ||
    file.fileName.toLowerCase().endsWith(".png") ||
    file.fileName.toLowerCase().endsWith(".jpg") ||
    file.fileName.toLowerCase().endsWith(".jpeg");

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const res = await authPreviewBlob(file.downloadPath);
      window.open(res.url, "_blank");
    } catch (err: any) {
      console.error("Preview failed:", err);
      toast.error(
        isEn ? "Preview failed" : "فشل العرض",
        err?.message || (isEn ? "Could not preview file" : "تعذر عرض الملف")
      );
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-[var(--border)] bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-2 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 shrink-0">
          <FileText className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={file.fileName}>
            {file.fileName}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-[var(--muted)] font-mono mt-0.5">
            <span>{formatFileSize(file.fileSizeBytes)}</span>
            {file.contentType && <span>· {file.contentType.split("/")[1] || file.contentType}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isPdfOrImage && (
          <Button
            variant="ghost"
            onClick={handlePreview}
            disabled={previewing}
            className="min-h-7 h-7 w-7 p-0 text-slate-600 hover:text-slate-900 dark:text-slate-400"
            title={isEn ? "Preview file" : "معاينة الملف"}
          >
            {previewing ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={handleDownload}
          disabled={downloading}
          className="min-h-7 h-7 px-2.5 text-xs gap-1 border-slate-200 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:border-slate-600"
          title={isEn ? "Download file" : "تنزيل الملف"}
        >
          {downloading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Download className="size-3 text-slate-700 dark:text-slate-200" />
          )}
          <span>{isEn ? "Download" : "تنزيل"}</span>
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Single Event Timeline Item Component
// ============================================================================

interface TimelineItemProps {
  event: CompleteHistoryEvent;
  subjectType: "vehicle" | "rider";
  locale: "ar" | "en";
  isFirst: boolean;
  isLast: boolean;
  index: number;
  vehicleMeta?: { plate?: string | null; serial?: string | null };
}

function TimelineItem({ event, subjectType, locale, isFirst, isLast, index, vehicleMeta }: TimelineItemProps) {
  const isEn = locale === "en";
  const normCategory = (event.category || "").toLowerCase().replace(/[\s_-]+/g, "_");
  const categoryMeta =
    CATEGORY_MAP[event.category] ||
    CATEGORY_MAP[normCategory] ||
    (normCategory.includes("operation") ? CATEGORY_MAP.operation_card : undefined) ||
    (normCategory.includes("inspect") ? CATEGORY_MAP.periodic_inspection : undefined) ||
    (normCategory.includes("insur") ? CATEGORY_MAP.insurance : undefined) ||
    DEFAULT_CATEGORY;
  const CategoryIcon = categoryMeta.icon;
  const actionInfo = formatAction(event.action, locale);

  // Check special cases
  const isConditionReportIssue =
    event.category.includes("issue") &&
    (event.action === "condition_report" || Boolean(event.details?.conditionReport));
  const isReturnBalanceRecorded = event.action === "return_balance_recorded";

  return (
    <li className="relative group">
      {/* Vertical Rail Line */}
      {!isLast && (
        <span
          className={`absolute top-6 bottom-0 start-4 w-0.5 -ms-px bg-slate-200 dark:bg-slate-800 group-hover:bg-blue-300 dark:group-hover:bg-blue-700 transition-colors`}
          aria-hidden="true"
        />
      )}

      <div className="flex items-start gap-4">
        {/* Timeline Node Dot */}
        <div
          className={`relative z-10 size-8 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white dark:ring-slate-900 shadow-sm ${categoryMeta.dotColor} transition-transform group-hover:scale-110`}
        >
          <CategoryIcon className="size-4" />
        </div>

        {/* Event Content Card */}
        <div className="flex-1 min-w-0 pb-8">
          <Card className="p-4 border-[var(--border)] hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs group-hover:shadow-sm">
            {/* Top row: Badges, Actions, and Timestamp */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {/* Category Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${categoryMeta.badgeClass}`}
                >
                  <CategoryIcon className="size-3" />
                  <span>{isEn ? categoryMeta.labelEn : categoryMeta.labelAr}</span>
                </span>

                {/* Action Badge */}
                <Badge
                  tone="gray"
                  className={`text-xs font-semibold ${
                    actionInfo.isNotable
                      ? "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300"
                      : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {actionInfo.text}
                </Badge>

                {/* Condition Report Callout if applicable */}
                {isConditionReportIssue && (
                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200">
                    {isEn ? "Return Condition Report" : "تقرير فحص استلام/إرجاع"}
                  </Badge>
                )}

                {/* Return Balance Record Callout */}
                {isReturnBalanceRecorded && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                    <Info className="size-3" />
                    <span>{isEn ? "Record update time" : "وقت تسجيل التحديث بالنظام"}</span>
                  </span>
                )}
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-2 text-xs text-[var(--muted)] font-mono shrink-0">
                <span className="hidden sm:inline" title={event.occurredAtUtc}>
                  {formatDateFull(event.occurredAtUtc, locale)}
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {formatRelativeTime(event.occurredAtUtc, locale)}
                </span>
              </div>
            </div>

            {/* Summary Short Description */}
            <div className="mt-2.5">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug" dir="auto">
                {translateSummary(event.summary, locale, vehicleMeta) || (isEn ? "No summary provided" : "لا يوجد وصف")}
              </h4>
            </div>

            {/* Cross-linking to related entities if applicable */}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
              {subjectType === "rider" && event.vehicleId && (
                <Link
                  href={`/admin/fleet/vehicles/${event.vehicleId}`}
                  className="inline-flex items-center gap-1.5 text-[#1167c9] hover:underline font-bold"
                >
                  <Car className="size-3.5" />
                  <span>
                    {isEn ? "Vehicle: " : "المركبة: "}
                    {vehicleMeta?.plate ? (isEn ? `Plate ${vehicleMeta.plate}` : `لوحة: ${vehicleMeta.plate}`) : ""}
                    {vehicleMeta?.serial ? (isEn ? ` · Serial: ${vehicleMeta.serial}` : ` · تسلسلي: ${vehicleMeta.serial}`) : ""}
                    {!vehicleMeta?.plate && !vehicleMeta?.serial ? (isEn ? "View Vehicle Details" : "عرض تفاصيل المركبة") : ""}
                  </span>
                </Link>
              )}
              {subjectType === "vehicle" && event.riderProfileId && (
                <Link
                  href={`/admin/employees?search=${encodeURIComponent(event.riderProfileId)}`}
                  className="inline-flex items-center gap-1 text-[#1167c9] hover:underline font-bold"
                >
                  <User className="size-3.5" />
                  <span>{isEn ? "View Rider Profile" : "عرض ملف المندوب"}</span>
                </Link>
              )}
              {event.assignmentId && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px]" dir="ltr">
                  <Key className="size-3 text-slate-400" />
                  <span className="text-[var(--muted)]">#{event.assignmentId.slice(0, 8)}</span>
                </span>
              )}
            </div>

            {/* Type-Specific Details Renderer */}
            <EventDetailsView
              details={event.details}
              action={event.action}
              category={event.category}
              locale={locale}
              vehicleMeta={vehicleMeta}
            />

            {/* Attached Files List */}
            {event.files && event.files.length > 0 && (
              <div className="mt-3.5 pt-3 border-t border-[var(--border)]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  <Paperclip className="size-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{isEn ? `Attachments (${event.files.length})` : `المرفقات والمستندات (${event.files.length})`}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {event.files.map((file) => (
                    <FileAttachmentItem key={file.id || file.downloadPath} file={file} locale={locale} />
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </li>
  );
}

// ============================================================================
// Main Complete History Timeline Component
// ============================================================================

export interface CompleteHistoryTimelineProps {
  data: CompleteHistoryResponse | null;
  loading: boolean;
  error?: string | null;
  errorStatus?: number | null;
  errorDetails?: any;
  onRefresh: () => void;
  subjectType: "vehicle" | "rider";
  subjectId: string;
  backHref: string;
  backLabel: string;
  vehicleInfo?: {
    plateNumber?: string | null;
    serialNumber?: string | null;
  };
  locale?: "ar" | "en";
}

export function CompleteHistoryTimeline({
  data,
  loading,
  error,
  errorStatus,
  errorDetails,
  onRefresh,
  subjectType,
  subjectId,
  backHref,
  backLabel,
  vehicleInfo,
  locale = "ar",
}: CompleteHistoryTimelineProps) {
  const isEn = locale === "en";

  // Auto-resolve vehicle plate and serial if subject is vehicle
  const [internalVeh, setInternalVeh] = useState<{ plate?: string; serial?: string }>({});
  useEffect(() => {
    if (subjectType === "vehicle" && subjectId && (!vehicleInfo?.plateNumber || !vehicleInfo?.serialNumber)) {
      getVehicleDetail(subjectId)
        .then((v) => {
          setInternalVeh({
            plate: v.summary.plateNumberAr || v.summary.plateNumberEn || undefined,
            serial: v.serialNumber || undefined,
          });
        })
        .catch(() => null);
    }
  }, [subjectType, subjectId, vehicleInfo]);

  const activePlate = vehicleInfo?.plateNumber || internalVeh.plate;
  const activeSerial = vehicleInfo?.serialNumber || internalVeh.serial;

  // Vehicles lookup cache for rider timeline events
  const [vehiclesLookup, setVehiclesLookup] = useState<Record<string, { plate?: string; serial?: string }>>({});
  useEffect(() => {
    if (!data?.events) return;
    const vIds = Array.from(new Set(data.events.map((e) => e.vehicleId).filter(Boolean))) as string[];
    vIds.forEach((vid) => {
      if (!vehiclesLookup[vid]) {
        getVehicleDetail(vid)
          .then((v) => {
            setVehiclesLookup((prev) => ({
              ...prev,
              [vid]: {
                plate: v.summary.plateNumberAr || v.summary.plateNumberEn || undefined,
                serial: v.serialNumber || undefined,
              },
            }));
          })
          .catch(() => null);
      }
    });
  }, [data?.events]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filesOnly, setFilesOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Virtualization / Windowing pagination state (progressive rendering)
  const [renderedCount, setRenderedCount] = useState<number>(35);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Reset pagination on filter change
  useEffect(() => {
    setRenderedCount(35);
  }, [searchTerm, selectedCategory, filesOnly, sortOrder, dateFilter]);

  // Infinite progressive scroll observer for virtualization
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setRenderedCount((prev) => prev + 25);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [data]);

  // Compute available categories with their counts
  const categoryCounts = useMemo(() => {
    if (!data?.events) return {};
    const counts: Record<string, number> = {};
    for (const ev of data.events) {
      counts[ev.category] = (counts[ev.category] || 0) + 1;
    }
    return counts;
  }, [data]);

  // Filter & Sort Events
  const filteredEvents = useMemo(() => {
    if (!data?.events) return [];

    let list = [...data.events];

    // 1. Search Filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((ev) => {
        if (ev.summary?.toLowerCase().includes(q)) return true;
        if (ev.action?.toLowerCase().includes(q)) return true;
        if (ev.category?.toLowerCase().includes(q)) return true;
        if (ev.entityId?.toLowerCase().includes(q)) return true;
        if (ev.assignmentId?.toLowerCase().includes(q)) return true;
        // Search inside details values
        if (ev.details) {
          const detailStr = JSON.stringify(ev.details).toLowerCase();
          if (detailStr.includes(q)) return true;
        }
        return false;
      });
    }

    // 2. Category Filter
    if (selectedCategory !== "all") {
      list = list.filter((ev) => ev.category === selectedCategory);
    }

    // 3. Files Only Filter
    if (filesOnly) {
      list = list.filter((ev) => ev.files && ev.files.length > 0);
    }

    // 4. Date Range Filter
    if (dateFilter !== "all") {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      let threshold = 0;
      if (dateFilter === "7d") threshold = now - 7 * dayMs;
      else if (dateFilter === "30d") threshold = now - 30 * dayMs;
      else if (dateFilter === "90d") threshold = now - 90 * dayMs;
      else if (dateFilter === "365d") threshold = now - 365 * dayMs;

      if (threshold > 0) {
        list = list.filter((ev) => {
          const t = new Date(ev.occurredAtUtc).getTime();
          return !isNaN(t) && t >= threshold;
        });
      }
    }

    // 5. Sort Order (data arrives newest first by default)
    if (sortOrder === "oldest") {
      list.reverse();
    }

    return list;
  }, [data, searchTerm, selectedCategory, filesOnly, dateFilter, sortOrder]);

  // Visible sliced list (Virtualization / Windowing)
  const visibleEvents = useMemo(() => {
    return filteredEvents.slice(0, renderedCount);
  }, [filteredEvents, renderedCount]);

  // ============================================================================
  // Error States (403 Forbidden / 404 Not Found / Generic)
  // ============================================================================

  if (errorStatus === 403) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-8">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-bold text-[#1167c9]">
          <ArrowRight className="size-4" />
          <span>{backLabel}</span>
        </Link>

        <Card className="p-8 text-center border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50">
          <div className="size-16 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center mb-4">
            <Lock className="size-8" />
          </div>
          <h2 className="text-xl font-bold text-amber-950 dark:text-amber-200">
            {isEn ? "Insufficient Permissions (403)" : "صلاحيات غير كافية (403)"}
          </h2>
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-300/90 max-w-lg mx-auto">
            {error ||
              (isEn
                ? "You do not have the required permissions to view this complete history timeline."
                : "لا تملك الصلاحيات الكافية لعرض سجل الأحداث الشامل.")}
          </p>

          <div className="mt-6 p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 text-start max-w-md mx-auto text-xs space-y-2">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              {isEn ? "Required system permissions:" : "الصلاحيات المطلوبة لهذه العملية:"}
            </span>
            <ul className="list-disc list-inside space-y-1 text-[var(--muted)] font-mono">
              {subjectType === "vehicle" && <li>fleet.vehicles.read (with vehicle scope)</li>}
              <li>fleet.assignments.read</li>
              <li>fleet.issues.read</li>
              <li>fleet.accidents.read</li>
              <li>maintenance.work_orders.read</li>
              <li>inventory.stock.read</li>
            </ul>
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={onRefresh}>
              <RefreshCw className="size-4" />
              <span>{isEn ? "Retry" : "إعادة المحاولة"}</span>
            </Button>
            <Link href={backHref}>
              <Button>{backLabel}</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (errorStatus === 404) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-8">
        <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-bold text-[#1167c9]">
          <ArrowRight className="size-4" />
          <span>{backLabel}</span>
        </Link>

        <Card className="p-8 text-center border-slate-200 dark:border-slate-800">
          <div className="size-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mb-4">
            {subjectType === "vehicle" ? <Car className="size-8" /> : <User className="size-8" />}
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {isEn ? "Subject Not Found (404)" : "السجل غير موجود (404)"}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)] max-w-md mx-auto">
            {error ||
              (isEn
                ? "The requested subject record could not be found or has been removed."
                : "لم يتم العثور على السجل المطلوب أو تم حذفه من النظام.")}
          </p>
          <div className="mt-6">
            <Link href={backHref}>
              <Button>{backLabel}</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#1167c9] hover:underline mb-2"
          >
            <ArrowRight className="size-4" />
            <span>{backLabel}</span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {isEn ? "Complete History Timeline" : "سجل الأحداث الشامل"}
            </h1>
            <Badge
              className={
                subjectType === "vehicle"
                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
              }
            >
              {subjectType === "vehicle"
                ? isEn
                  ? "Vehicle Timeline"
                  : "الجدول الزمني للمركبة"
                : isEn
                ? "Rider Timeline"
                : "الجدول الزمني للمندوب"}
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {subjectType === "vehicle" ? (
              <>
                {activePlate && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800 font-bold text-xs shadow-2xs">
                    <CreditCard className="size-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{isEn ? "Plate:" : "اللوحة:"}</span>
                    <span className="font-mono text-sm">{activePlate}</span>
                  </span>
                )}
                {activeSerial && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 font-bold text-xs shadow-2xs">
                    <Fingerprint className="size-3.5 text-slate-500" />
                    <span>{isEn ? "Serial Number:" : "الرقم التسلسلي:"}</span>
                    <span className="font-mono text-sm">{activeSerial}</span>
                  </span>
                )}
                {!activePlate && !activeSerial && (
                  <span className="text-xs text-[var(--muted)]">
                    {isEn ? "Loading vehicle details..." : "جارٍ تحميل بيانات اللوحة والتسلسلي..."}
                  </span>
                )}
              </>
            ) : data?.subjectName ? (
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {data.subjectName}
              </span>
            ) : null}

            {data?.generatedAtUtc && (
              <span className="text-xs text-[var(--muted)] ms-1">
                · {isEn ? "Generated at: " : "تم التوليد في: "}
                {formatDateFull(data.generatedAtUtc, locale)}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onRefresh} disabled={loading} className="gap-2">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            <span>{isEn ? "Refresh" : "تحديث"}</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col justify-between gap-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            {isEn ? "Total Events" : "إجمالي الأحداث"}
          </span>
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
            {data?.totalEvents ?? (loading ? "—" : 0)}
          </span>
        </Card>

        <Card className="p-4 flex flex-col justify-between gap-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            {isEn ? "Filtered Events" : "الأحداث المعروضة"}
          </span>
          <span className="text-2xl font-black text-[#1167c9] font-mono">
            {filteredEvents.length}
          </span>
        </Card>

        <Card className="p-4 flex flex-col justify-between gap-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            {isEn ? "Active Categories" : "الأقسام النشطة"}
          </span>
          <span className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
            {Object.keys(categoryCounts).length}
          </span>
        </Card>

        <Card className="p-4 flex flex-col justify-between gap-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            {isEn ? "Events with Files" : "أحداث بها مرفقات"}
          </span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {data?.events ? data.events.filter((e) => e.files && e.files.length > 0).length : 0}
          </span>
        </Card>
      </div>

      {/* Controls & Filter Bar */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted)] pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isEn
                  ? "Search by summary, action, ID, keyword..."
                  : "ابحث في الوصف، الإجراء، الرقم التعريفي، التفاصيل..."
              }
              className="w-full h-10 ps-9 pe-4 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date filter dropdown */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label={isEn ? "Filter by date" : "تصفية حسب التاريخ"}
              className="h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">{isEn ? "All Time" : "كل الأوقات"}</option>
              <option value="7d">{isEn ? "Last 7 Days" : "آخر 7 أيام"}</option>
              <option value="30d">{isEn ? "Last 30 Days" : "آخر 30 يوماً"}</option>
              <option value="90d">{isEn ? "Last 90 Days" : "آخر 3 أشهر"}</option>
              <option value="365d">{isEn ? "Last Year" : "آخر سنة"}</option>
            </select>

            {/* Sort order button */}
            <Button
              variant="secondary"
              onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
              className="min-h-10 h-10 gap-1.5 text-xs font-bold"
            >
              <ArrowUpDown className="size-3.5" />
              <span>{sortOrder === "newest" ? (isEn ? "Newest First" : "الأحدث أولاً") : (isEn ? "Oldest First" : "الأقدم أولاً")}</span>
            </Button>

            {/* Files only toggle */}
            <button
              type="button"
              onClick={() => setFilesOnly(!filesOnly)}
              className={`h-10 px-3 rounded-lg border text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                filesOnly
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-[var(--background)] text-slate-700 border-[var(--border)] hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <Paperclip className="size-3.5" />
              <span>{isEn ? "Files Only" : "ملفات فقط"}</span>
            </button>
          </div>
        </div>

        {/* Category Pills Slider */}
        <div className="pt-2 border-t border-[var(--border)] flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all ${
              selectedCategory === "all"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {isEn ? "All Categories" : "الكل"} ({data?.totalEvents ?? 0})
          </button>

          {Object.entries(categoryCounts).map(([cat, count]) => {
            const normCat = cat.toLowerCase().replace(/[\s_-]+/g, "_");
            const meta =
              CATEGORY_MAP[cat] ||
              CATEGORY_MAP[normCat] ||
              (normCat.includes("operation") ? CATEGORY_MAP.operation_card : undefined) ||
              (normCat.includes("inspect") ? CATEGORY_MAP.periodic_inspection : undefined) ||
              (normCat.includes("insur") ? CATEGORY_MAP.insurance : undefined) ||
              DEFAULT_CATEGORY;
            const Icon = meta.icon;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 inline-flex items-center gap-1.5 transition-all border ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
                }`}
              >
                <Icon className="size-3" />
                <span>{isEn ? meta.labelEn : meta.labelAr}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Main Timeline Content */}
      {loading ? (
        <div className="py-20 text-center space-y-4">
          <div className="size-10 mx-auto rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--muted)] font-medium">
            {isEn ? "Loading complete timeline events..." : "جارٍ تحميل سجل الأحداث الكامل..."}
          </p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <History className="size-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {searchTerm || selectedCategory !== "all" || filesOnly || dateFilter !== "all"
              ? isEn
                ? "No matching events found"
                : "لا توجد أحداث مطابقة لشروط البحث"
              : isEn
              ? "No events recorded yet"
              : "لا توجد أحداث مسجلة حتى الآن"}
          </h3>
          <p className="mt-1 text-xs text-[var(--muted)] max-w-sm mx-auto">
            {searchTerm || selectedCategory !== "all" || filesOnly || dateFilter !== "all"
              ? isEn
                ? "Try clearing filters or search terms to see all timeline items."
                : "جرّب إعادة تعيين فلاتر البحث لعرض الأحداث المتاحة."
              : isEn
              ? "Any actions, assignments, maintenance, or issues will be tracked here automatically."
              : "سيتم تسجيل أي تسليمات أو بلاغات أو صيانات أو حوادث في هذا الجدول الزمني تلقائياً."}
          </p>
          {(searchTerm || selectedCategory !== "all" || filesOnly || dateFilter !== "all") && (
            <Button
              variant="secondary"
              className="mt-4 min-h-9 h-9 text-xs"
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
                setFilesOnly(false);
                setDateFilter("all");
              }}
            >
              {isEn ? "Reset all filters" : "إعادة تعيين الفلاتر"}
            </Button>
          )}
        </Card>
      ) : (
        <div className="relative">
          {/* Virtualized / Progressive Timeline List */}
          <ol className="relative space-y-0">
            {visibleEvents.map((event, idx) => {
              // Composite key as instructed: do not use entityId alone since an assignment produces handover and return with same entityId
              const eventKey = `${event.entityId}_${event.action}_${event.occurredAtUtc}_${idx}`;
              const eventVehicleMeta =
                subjectType === "vehicle"
                  ? { plate: activePlate, serial: activeSerial }
                  : {
                      plate: (event.details?.plateNumberAr || event.details?.plateNumber || vehiclesLookup[event.vehicleId || ""]?.plate) as string | undefined,
                      serial: (event.details?.serialNumber || vehiclesLookup[event.vehicleId || ""]?.serial) as string | undefined,
                    };

              return (
                <TimelineItem
                  key={eventKey}
                  event={event}
                  subjectType={subjectType}
                  locale={locale}
                  isFirst={idx === 0}
                  isLast={idx === visibleEvents.length - 1 && visibleEvents.length === filteredEvents.length}
                  index={idx}
                  vehicleMeta={eventVehicleMeta}
                />
              );
            })}
          </ol>

          {/* Virtualization Sentinel for progressive rendering */}
          {visibleEvents.length < filteredEvents.length && (
            <div ref={loadMoreRef} className="py-6 text-center">
              <Button
                variant="secondary"
                onClick={() => setRenderedCount((prev) => prev + 35)}
                className="gap-2 shadow-xs"
              >
                <ChevronDown className="size-4" />
                <span>
                  {isEn
                    ? `Load more events (${visibleEvents.length} of ${filteredEvents.length})`
                    : `عرض المزيد من الأحداث (معروض ${visibleEvents.length} من أصل ${filteredEvents.length})`}
                </span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
