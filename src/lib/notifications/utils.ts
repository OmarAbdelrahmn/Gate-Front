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

export interface ResolvedNotificationContent {
  title: string;
  body: string;
  category: string;
  deepLink: string | null;
  secondaryTitle?: string;
  secondaryBody?: string;
}

export const EVENT_TYPE_METADATA: Record<
  string,
  {
    titleAr: string;
    titleEn: string;
    bodyAr: string;
    bodyEn: string;
    categoryAr: string;
    categoryEn: string;
    defaultRoute?: string;
  }
> = {
  // HR Leave Requests
  "hr.leave.created": {
    titleAr: "طلب إجازة جديد",
    titleEn: "New Leave Request",
    bodyAr: "تم إنشاء طلب إجازة جديد في النظام وبانتظار المراجعة والاعتماد.",
    bodyEn: "A new leave request was created and is pending review.",
    categoryAr: "إجازات",
    categoryEn: "Leave",
    defaultRoute: "/admin/hr/leave-requests",
  },
  "hr.leave.submitted": {
    titleAr: "إرسال طلب إجازة للاعتماد",
    titleEn: "Leave Request Submitted",
    bodyAr: "تم إرسال طلب إجازة رسمي للاعتماد والمراجعة.",
    bodyEn: "A leave request has been submitted for approval.",
    categoryAr: "إجازات",
    categoryEn: "Leave",
    defaultRoute: "/admin/hr/leave-requests",
  },
  "hr.leave.approved": {
    titleAr: "اعتماد طلب الإجازة",
    titleEn: "Leave Request Approved",
    bodyAr: "تمت الموافقة واعتماد طلب الإجازة بنجاح.",
    bodyEn: "The leave request has been approved successfully.",
    categoryAr: "إجازات",
    categoryEn: "Leave",
    defaultRoute: "/admin/hr/leave-requests",
  },
  "hr.leave.rejected": {
    titleAr: "رفض طلب الإجازة",
    titleEn: "Leave Request Rejected",
    bodyAr: "تم رفض طلب الإجازة من قبل إدارة الموارد البشرية.",
    bodyEn: "The leave request was rejected by HR.",
    categoryAr: "إجازات",
    categoryEn: "Leave",
    defaultRoute: "/admin/hr/leave-requests",
  },
  "hr.leave.returned": {
    titleAr: "إعادة طلب الإجازة للتعديل",
    titleEn: "Leave Returned For Changes",
    bodyAr: "تمت إعادة طلب الإجازة لاستكمال وتعديل البيانات.",
    bodyEn: "The leave request was returned for modifications.",
    categoryAr: "إجازات",
    categoryEn: "Leave",
    defaultRoute: "/admin/hr/leave-requests",
  },
  "hr.leave.activated": {
    titleAr: "بدء سريان الإجازة",
    titleEn: "Leave Activated",
    bodyAr: "بدأت فترة الإجازة للموظف ودخلت حيز السريان.",
    bodyEn: "The employee leave has now commenced.",
    categoryAr: "إجازات",
    categoryEn: "Leave",
    defaultRoute: "/admin/hr/leave-requests",
  },
  "hr.leave.completed": {
    titleAr: "إنهاء وإكمال الإجازة",
    titleEn: "Leave Completed",
    bodyAr: "اكتملت مدة الإجازة وعاد الموظف لمباشرة العمل.",
    bodyEn: "The leave has ended and the employee has resumed work.",
    categoryAr: "إجازات",
    categoryEn: "Leave",
    defaultRoute: "/admin/hr/leave-requests",
  },
  "hr.leave.cancelled": {
    titleAr: "إلغاء طلب الإجازة",
    titleEn: "Leave Request Cancelled",
    bodyAr: "تم إلغاء طلب الإجازة المسجل في النظام.",
    bodyEn: "The leave request has been cancelled.",
    categoryAr: "إجازات",
    categoryEn: "Leave",
    defaultRoute: "/admin/hr/leave-requests",
  },
  "hr.leave.date_change_requested": {
    titleAr: "طلب تعديل مواعيد الإجازة",
    titleEn: "Leave Date Change Request",
    bodyAr: "تم تقديم طلب لتغيير وتعديل مواعيد الإجازة المعتمدة.",
    bodyEn: "A request to change leave dates has been submitted.",
    categoryAr: "إجازات",
    categoryEn: "Leave",
    defaultRoute: "/admin/hr/leave-requests",
  },
  "hr.leave.date_changed": {
    titleAr: "تعديل مواعيد الإجازة",
    titleEn: "Leave Dates Changed",
    bodyAr: "تم تعديل مواعيد الإجازة بنجاح.",
    bodyEn: "Leave dates have been modified successfully.",
    categoryAr: "إجازات",
    categoryEn: "Leave",
    defaultRoute: "/admin/hr/leave-requests",
  },

  // HR Absence & Status
  "hr.absence.reported": {
    titleAr: "تسجيل حالة غياب",
    titleEn: "Absence Reported",
    bodyAr: "تم تسجيل حالة غياب لموظف أو مندوب في النظام.",
    bodyEn: "An employee absence has been logged in the system.",
    categoryAr: "الغياب والانقطاع",
    categoryEn: "Absence",
    defaultRoute: "/admin/hr/absences",
  },
  "hr.absence.created": {
    titleAr: "تسجيل حالة غياب",
    titleEn: "Absence Created",
    bodyAr: "تم تسجيل حالة غياب جديدة بانتظار المتابعة.",
    bodyEn: "A new absence case was created.",
    categoryAr: "الغياب والانقطاع",
    categoryEn: "Absence",
    defaultRoute: "/admin/hr/absences",
  },
  "hr.status_change.requested": {
    titleAr: "طلب تغيير حالة موظف",
    titleEn: "Status Change Request",
    bodyAr: "تم تقديم طلب تغيير حالة وظيفية لموظف.",
    bodyEn: "A status change request has been filed for an employee.",
    categoryAr: "شؤون الموظفين",
    categoryEn: "Staff",
    defaultRoute: "/admin/hr/status-changes",
  },

  // Fleet & Maintenance
  "fleet.accident.reported": {
    titleAr: "تسجيل حادث مركبة",
    titleEn: "Vehicle Accident Reported",
    bodyAr: "تم فتح ملف حادث مركبة جديد في أسطول المركبات.",
    bodyEn: "A new vehicle accident case has been opened.",
    categoryAr: "الأسطول",
    categoryEn: "Fleet",
    defaultRoute: "/admin/fleet/accidents",
  },
  "maintenance.work_order.created": {
    titleAr: "أمر صيانة جديد",
    titleEn: "New Work Order",
    bodyAr: "تم إنشاء أمر صيانة جديد بانتظار المتابعة والإنجاز.",
    bodyEn: "A new maintenance work order has been created.",
    categoryAr: "الصيانة",
    categoryEn: "Maintenance",
    defaultRoute: "/admin/maintenance",
  },
  "inventory.supply_request.submitted": {
    titleAr: "طلب توريد جديد",
    titleEn: "Supply Request Submitted",
    bodyAr: "تم تقديم طلب توريد مستودعي جديد للاعتماد.",
    bodyEn: "A supply inventory request has been submitted.",
    categoryAr: "المستودع",
    categoryEn: "Inventory",
    defaultRoute: "/admin/maintenance/setup",
  },
  "system.alert": {
    titleAr: "تنبيه نظام",
    titleEn: "System Alert",
    bodyAr: "إشعار وتنبيه إداري من النظام.",
    bodyEn: "Administrative system notification.",
    categoryAr: "النظام",
    categoryEn: "System",
  },
  "system.manual_alert": {
    titleAr: "إشعار إداري",
    titleEn: "Administrative Notice",
    bodyAr: "إشعار موجه من إدارة النظام.",
    bodyEn: "Direct notice from system administration.",
    categoryAr: "إداري",
    categoryEn: "Admin",
  },
};

/**
 * Resolve human-readable title, body, category and deep link for any notification item,
 * with fallbacks for alternative field names and known event types.
 */
export function resolveNotificationContent(
  item: any,
  locale: "ar" | "en" = "ar"
): ResolvedNotificationContent {
  const isAr = locale === "ar";
  if (!item) {
    return {
      title: isAr ? "إشعار" : "Notification",
      body: "",
      category: isAr ? "النظام" : "System",
      deepLink: null,
    };
  }

  // 1. Direct properties and aliases
  const rawTitleAr = typeof item.titleAr === "string" ? item.titleAr.trim() : typeof item.TitleAr === "string" ? item.TitleAr.trim() : "";
  const rawTitleEn = typeof item.titleEn === "string" ? item.titleEn.trim() : typeof item.TitleEn === "string" ? item.TitleEn.trim() : "";
  const fallbackRawTitle = typeof item.title === "string" ? item.title.trim() : typeof item.Title === "string" ? item.Title.trim() : typeof item.subject === "string" ? item.subject.trim() : typeof item.Subject === "string" ? item.Subject.trim() : "";

  const rawBodyAr = typeof item.bodyAr === "string" ? item.bodyAr.trim() : typeof item.BodyAr === "string" ? item.BodyAr.trim() : "";
  const rawBodyEn = typeof item.bodyEn === "string" ? item.bodyEn.trim() : typeof item.BodyEn === "string" ? item.BodyEn.trim() : "";
  const fallbackRawBody = typeof item.body === "string" ? item.body.trim() : typeof item.Body === "string" ? item.Body.trim() : typeof item.message === "string" ? item.message.trim() : typeof item.Message === "string" ? item.Message.trim() : typeof item.description === "string" ? item.description.trim() : "";

  // 2. Lookup event type catalog
  const eventKey = (typeof item.eventType === "string" ? item.eventType : "").toLowerCase().trim();
  const meta =
    EVENT_TYPE_METADATA[eventKey] ||
    Object.entries(EVENT_TYPE_METADATA).find(([k]) => eventKey.startsWith(k))?.[1];

  // 3. Resolve Title
  let title = "";
  if (isAr) {
    title = rawTitleAr || fallbackRawTitle || rawTitleEn;
  } else {
    title = rawTitleEn || fallbackRawTitle || rawTitleAr;
  }

  if (!title && meta) {
    title = isAr ? meta.titleAr : meta.titleEn;
  }

  if (!title && eventKey) {
    const parts: string[] = eventKey.split(/[._-]/).filter(Boolean);
    if (parts[0] === "hr") {
      title = isAr ? "إشعار الموارد البشرية" : "HR Notification";
    } else if (parts[0] === "fleet") {
      title = isAr ? "إشعار أسطول المركبات" : "Fleet Notification";
    } else if (parts[0] === "maintenance") {
      title = isAr ? "إشعار الصيانة" : "Maintenance Notification";
    } else {
      title = parts.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
    }
  }

  if (!title) {
    title = isAr ? "إشعار جديد" : "New Notification";
  }

  // 4. Resolve Body
  let body = "";
  if (isAr) {
    body = rawBodyAr || fallbackRawBody || rawBodyEn;
  } else {
    body = rawBodyEn || fallbackRawBody || rawBodyAr;
  }

  if (!body && meta) {
    body = isAr ? meta.bodyAr : meta.bodyEn;
  }

  if (!body) {
    body = isAr
      ? "انقر للاطلاع على تفاصيل الإشعار ومتابعة الإجراء."
      : "Click to view notification details and follow up.";
  }

  // 5. Category
  let category = isAr ? "عام" : "General";
  if (meta) {
    category = isAr ? meta.categoryAr : meta.categoryEn;
  } else if (eventKey) {
    const prefix = eventKey.split(".")[0]?.toLowerCase();
    if (prefix === "hr") category = isAr ? "الموارد البشرية" : "HR";
    else if (prefix === "fleet") category = isAr ? "الأسطول" : "Fleet";
    else if (prefix === "maintenance") category = isAr ? "الصيانة" : "Maintenance";
    else if (prefix === "inventory") category = isAr ? "المستودع" : "Inventory";
    else if (prefix === "system") category = isAr ? "النظام" : "System";
  }

  // 6. DeepLink & Target Normalization
  let deepLink = typeof item.deepLink === "string" && item.deepLink.trim() ? item.deepLink.trim() : null;
  if (!deepLink) {
    if (meta?.defaultRoute) {
      deepLink = meta.defaultRoute;
    } else if (eventKey.startsWith("hr.leave") || (item.sourceEntityType && String(item.sourceEntityType).toLowerCase().includes("leave"))) {
      deepLink = "/admin/hr/leave-requests";
    } else if (eventKey.startsWith("hr.absence") || (item.sourceEntityType && String(item.sourceEntityType).toLowerCase().includes("absence"))) {
      deepLink = "/admin/hr/absences";
    } else if (eventKey.startsWith("fleet.accident")) {
      deepLink = "/admin/fleet/accidents";
    } else if (eventKey.startsWith("maintenance")) {
      deepLink = "/admin/maintenance";
    }
  }

  // Normalize deepLink to make sure it matches actual Next.js admin routes
  deepLink = normalizeNotificationDeepLink(deepLink);

  // If item has sourceEntityId and target is leave requests without ?id=, append ?id=...
  if (deepLink && item.sourceEntityId && !deepLink.includes("?id=")) {
    if (deepLink.startsWith("/admin/hr/leave-requests")) {
      deepLink = `/admin/hr/leave-requests?id=${encodeURIComponent(item.sourceEntityId)}`;
    } else if (deepLink.startsWith("/admin/hr/absences")) {
      deepLink = `/admin/hr/absences?id=${encodeURIComponent(item.sourceEntityId)}`;
    }
  }

  return {
    title,
    body,
    category,
    deepLink,
    secondaryTitle: isAr ? rawTitleEn : rawTitleAr,
    secondaryBody: isAr ? rawBodyEn : rawBodyAr,
  };
}

/**
 * Normalizes backend deep links (e.g. /hr/leave-requests/:id -> /admin/hr/leave-requests?id=:id)
 */
export function normalizeNotificationDeepLink(
  rawLink: string | null | undefined
): string | null {
  if (!rawLink || typeof rawLink !== "string") return null;
  let link = rawLink.trim();
  if (!link) return null;

  // Match /hr/leave-requests/:id or /admin/hr/leave-requests/:id
  const leaveMatch = link.match(
    /^(?:\/admin)?\/hr\/leave-requests(?:\/([a-zA-Z0-9_-]+))?/i
  );
  if (leaveMatch) {
    const id = leaveMatch[1];
    return id
      ? `/admin/hr/leave-requests?id=${encodeURIComponent(id)}`
      : `/admin/hr/leave-requests`;
  }

  // Match /hr/absences/:id or /admin/hr/absences/:id
  const absenceMatch = link.match(
    /^(?:\/admin)?\/hr\/absences(?:\/([a-zA-Z0-9_-]+))?/i
  );
  if (absenceMatch) {
    const id = absenceMatch[1];
    return id
      ? `/admin/hr/absences?id=${encodeURIComponent(id)}`
      : `/admin/hr/absences`;
  }

  // Generic prefix normalization:
  // /hr/... -> /admin/hr/...
  if (link.startsWith("/hr/")) {
    return `/admin${link}`;
  }
  // /fleet/... -> /admin/fleet/...
  if (link.startsWith("/fleet/")) {
    return `/admin${link}`;
  }
  // /maintenance/... -> /admin/maintenance/...
  if (link.startsWith("/maintenance/")) {
    return `/admin${link}`;
  }
  // /inventory/... -> /admin/maintenance/setup
  if (link.startsWith("/inventory")) {
    return "/admin/maintenance/setup";
  }

  return link;
}
