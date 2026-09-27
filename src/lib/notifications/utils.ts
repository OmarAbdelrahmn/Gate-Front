import type { NotificationSeverity } from "./types";

/**
 * Format relative time in Arabic or English
 */
export function formatRelativeTime(
  utcDateString: string | null | undefined,
  locale: "ar" | "en" = "ar"
): string {
  if (!utcDateString) return "";
  const date = new Date(utcDateString);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 30) {
    return locale === "ar" ? "الآن" : "Just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    if (locale === "ar") {
      if (diffInMinutes === 1) return "منذ دقيقة";
      if (diffInMinutes === 2) return "منذ دقيقتين";
      if (diffInMinutes <= 10) return `منذ ${diffInMinutes} دقائق`;
      return `منذ ${diffInMinutes} دقيقة`;
    }
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    if (locale === "ar") {
      if (diffInHours === 1) return "منذ ساعة";
      if (diffInHours === 2) return "منذ ساعتين";
      if (diffInHours <= 10) return `منذ ${diffInHours} ساعات`;
      return `منذ ${diffInHours} ساعة`;
    }
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    if (locale === "ar") {
      if (diffInDays === 1) return "أمس";
      if (diffInDays === 2) return "منذ يومين";
      if (diffInDays <= 10) return `منذ ${diffInDays} أيام`;
      return `منذ ${diffInDays} يوماً`;
    }
    return `${diffInDays}d ago`;
  }

  // Fallback to formatted date
  return date.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Format full date and time for tooltip or detail modal
 */
export function formatFullDateTime(
  utcDateString: string | null | undefined,
  locale: "ar" | "en" = "ar"
): string {
  if (!utcDateString) return "—";
  const date = new Date(utcDateString);
  if (isNaN(date.getTime())) return "—";

  return date.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface SeverityConfig {
  labelAr: string;
  labelEn: string;
  badgeClass: string;
  dotClass: string;
  borderClass: string;
  bgLightClass: string;
  textColorClass: string;
}

export const SEVERITY_CONFIG: Record<NotificationSeverity, SeverityConfig> = {
  Information: {
    labelAr: "معلومات",
    labelEn: "Information",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/50",
    dotClass: "bg-blue-500",
    borderClass: "border-blue-500",
    bgLightClass: "bg-blue-50/40 dark:bg-blue-950/20",
    textColorClass: "text-blue-600 dark:text-blue-400",
  },
  Success: {
    labelAr: "نجاح",
    labelEn: "Success",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/50",
    dotClass: "bg-emerald-500",
    borderClass: "border-emerald-500",
    bgLightClass: "bg-emerald-50/40 dark:bg-emerald-950/20",
    textColorClass: "text-emerald-600 dark:text-emerald-400",
  },
  Warning: {
    labelAr: "تحذير",
    labelEn: "Warning",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/50",
    dotClass: "bg-amber-500",
    borderClass: "border-amber-500",
    bgLightClass: "bg-amber-50/40 dark:bg-amber-950/20",
    textColorClass: "text-amber-600 dark:text-amber-400",
  },
  Error: {
    labelAr: "خطأ",
    labelEn: "Error",
    badgeClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900/50",
    dotClass: "bg-red-500",
    borderClass: "border-red-500",
    bgLightClass: "bg-red-50/40 dark:bg-red-950/20",
    textColorClass: "text-red-600 dark:text-red-400",
  },
  Critical: {
    labelAr: "حرج للغاية",
    labelEn: "Critical",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800",
    dotClass: "bg-rose-600 animate-ping",
    borderClass: "border-rose-600",
    bgLightClass: "bg-rose-50/50 dark:bg-rose-950/30",
    textColorClass: "text-rose-600 dark:text-rose-400",
  },
};
