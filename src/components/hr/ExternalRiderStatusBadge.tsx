"use client";

import React from "react";

export type ExternalRiderStatusConfig = {
  labelAr: string;
  labelEn: string;
  badgeClass: string;
  dotClass: string;
  descriptionAr: string;
  descriptionEn: string;
};

export const EXTERNAL_RIDER_STATUS_MAP: Record<string, ExternalRiderStatusConfig> = {
  Active: {
    labelAr: "نشط",
    labelEn: "Active",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    dotClass: "bg-emerald-500",
    descriptionAr: "المندوب نشط حالياً ومتاح للعمليات الميدانية",
    descriptionEn: "Rider is currently active and available for field operations",
  },
  Terminated: {
    labelAr: "منتهي الخدمة",
    labelEn: "Terminated",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    dotClass: "bg-rose-500",
    descriptionAr: "تم إنهاء خدمة المندوب الخارجي وإيقاف الحساب",
    descriptionEn: "External rider service has been terminated",
  },
  Archived: {
    labelAr: "مؤرشف",
    labelEn: "Archived",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    dotClass: "bg-slate-400",
    descriptionAr: "سجل المندوب الخارجي محفوظ في الأرشيف",
    descriptionEn: "Rider record is archived",
  },
  Suspended: {
    labelAr: "موقوف",
    labelEn: "Suspended",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    dotClass: "bg-amber-500",
    descriptionAr: "المندوب موقوف مؤقتاً عن استلام طلبات أو مركبات",
    descriptionEn: "Rider is temporarily suspended",
  },
  Onboarding: {
    labelAr: "قيد التهيئة",
    labelEn: "Onboarding",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    dotClass: "bg-sky-500",
    descriptionAr: "جاري استكمال إجراءات تهيئة وتسجيل المندوب",
    descriptionEn: "Rider is undergoing onboarding process",
  },
  Draft: {
    labelAr: "مسودة",
    labelEn: "Draft",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    dotClass: "bg-blue-500",
    descriptionAr: "سجل مسودة غير مكتمل",
    descriptionEn: "Draft record in preparation",
  },
  OnLeave: {
    labelAr: "في إجازة",
    labelEn: "On Leave",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    dotClass: "bg-indigo-500",
    descriptionAr: "المندوب في فترة إجازة مصرحة",
    descriptionEn: "Rider is currently on approved leave",
  },
  Fleeing: {
    labelAr: "هروب / انقطاع",
    labelEn: "Fleeing",
    badgeClass: "bg-red-50 text-red-700 border-red-300 animate-pulse dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
    dotClass: "bg-red-600",
    descriptionAr: "سجل بلاغ انقطاع أو هروب عن العمل",
    descriptionEn: "Reported fleeing or work absence",
  },
  Accident: {
    labelAr: "حادث",
    labelEn: "Accident",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
    dotClass: "bg-orange-500",
    descriptionAr: "المندوب طرف في حادث مروري قيد المتابعة",
    descriptionEn: "Rider involved in an accident under investigation",
  },
  Sick: {
    labelAr: "إجازة مرضية",
    labelEn: "Sick",
    badgeClass: "bg-yellow-50 text-yellow-800 border-yellow-200/80 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800",
    dotClass: "bg-yellow-500",
    descriptionAr: "المندوب في إجازة مرضية معتمدة",
    descriptionEn: "Rider is on approved sick leave",
  },
  Inactive: {
    labelAr: "غير نشط",
    labelEn: "Inactive",
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200/80 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    dotClass: "bg-gray-400",
    descriptionAr: "الحساب غير نشط حالياً",
    descriptionEn: "Account is currently inactive",
  },
};

export function getExternalRiderStatusInfo(
  status: string | null | undefined,
  locale: string = "ar"
) {
  const normalized = status?.trim() || "";
  const config = EXTERNAL_RIDER_STATUS_MAP[normalized] || {
    labelAr: normalized || "غير محدد",
    labelEn: normalized || "Unspecified",
    badgeClass:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    dotClass: "bg-slate-400",
    descriptionAr: "حالة غير محددة",
    descriptionEn: "Unspecified status",
  };
  return {
    ...config,
    label: locale === "en" ? config.labelEn : config.labelAr,
    description: locale === "en" ? config.descriptionEn : config.descriptionAr,
  };
}

export function ExternalRiderStatusBadge({
  status,
  locale = "ar",
  className = "",
}: {
  status: string | null | undefined;
  locale?: string;
  className?: string;
}) {
  const info = getExternalRiderStatusInfo(status, locale);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black shadow-xs transition-colors ${info.badgeClass} ${className}`}
    >
      <span className={`size-1.5 rounded-full shrink-0 ${info.dotClass}`} />
      <span>{info.label}</span>
    </span>
  );
}
