import {
  LocationType,
  ServiceSubjectType,
  MaintenanceType,
  WorkOrderStatus,
  ItemType,
  UnitOfMeasure,
  MaterialUsageType,
  PaymentMethod,
  OilBarrelStatus,
  OilReminderStatus,
  ExternalPaymentStatus,
} from "./types";

export const locationTypeLabels: Record<LocationType, string> = {
  [LocationType.Warehouse]: "مستودع",
  [LocationType.Workshop]: "ورشة صيانة",
  [LocationType.WarehouseAndWorkshop]: "مستودع وورشة",
};

export const serviceSubjectTypeLabels: Record<ServiceSubjectType, string> = {
  [ServiceSubjectType.CompanyVehicle]: "مركبة شركة",
  [ServiceSubjectType.ExternalVehicle]: "مركبة عميل خارجي",
};

export const maintenanceTypeLabels: Record<MaintenanceType, string> = {
  [MaintenanceType.Preventive]: "صيانة دورية وقائية",
  [MaintenanceType.Corrective]: "إصلاح عطل (تصحيحية)",
  [MaintenanceType.Inspection]: "فحص ومعاينة",
  [MaintenanceType.AccidentRepair]: "إصلاح حادث",
  [MaintenanceType.OilChange]: "تغيير زيت",
  [MaintenanceType.PartSaleOnly]: "بيع قطع غيار فقط",
};

export const workOrderStatusConfig: Record<
  WorkOrderStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  [WorkOrderStatus.Open]: {
    label: "مفتوح (جديد)",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  [WorkOrderStatus.InProgress]: {
    label: "قيد التنفيذ",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  [WorkOrderStatus.Completed]: {
    label: "مكتمل",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  [WorkOrderStatus.Closed]: {
    label: "مقفل ومغلق",
    bg: "bg-slate-100 dark:bg-slate-800/60",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
  },
  [WorkOrderStatus.Cancelled]: {
    label: "ملغي",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
  },
};

export const itemTypeLabels: Record<ItemType, string> = {
  [ItemType.SparePart]: "قطعة غيار",
  [ItemType.RiderAccessory]: "مستلزمات ومعدات المندوب",
  [ItemType.Oil]: "زيت ومواد تشحيم",
  [ItemType.Consumable]: "مستهلكات وورشة",
};

export const itemTypeBadgeStyles: Record<
  ItemType,
  { label: string; bg: string; text: string; border: string }
> = {
  [ItemType.SparePart]: {
    label: "قطعة غيار",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  [ItemType.RiderAccessory]: {
    label: "مستلزمات ومعدات المندوب",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
  },
  [ItemType.Oil]: {
    label: "زيت ومواد تشحيم",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-800 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  [ItemType.Consumable]: {
    label: "مستهلكات وورشة",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
};

export const RIDER_ASSIGNABLE_ITEM_TYPES = [ItemType.RiderAccessory];


export const unitOfMeasureLabels: Record<UnitOfMeasure, string> = {
  [UnitOfMeasure.Piece]: "حبة / قطعة",
  [UnitOfMeasure.Liter]: "لتر",
  [UnitOfMeasure.Barrel]: "برميل",
  [UnitOfMeasure.Box]: "كرتون / علبة",
  [UnitOfMeasure.Set]: "طقم",
};

export const materialUsageTypeLabels: Record<MaterialUsageType, string> = {
  [MaterialUsageType.SparePart]: "قطعة غيار",
  [MaterialUsageType.Oil]: "زيت",
  [MaterialUsageType.OilFilter]: "فلتر زيت",
  [MaterialUsageType.Consumable]: "مستهلكات",
  [MaterialUsageType.ExternalPartSale]: "مبيع خارجي",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: "نقداً (كاش)",
  [PaymentMethod.Card]: "بطاقة بنكية (مدى/فيزا)",
  [PaymentMethod.BankTransfer]: "تحويل بنكي",
  [PaymentMethod.Other]: "أخرى",
};

export const oilBarrelStatusConfig: Record<
  OilBarrelStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  [OilBarrelStatus.Sealed]: {
    label: "مختوم (جديد)",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
  },
  [OilBarrelStatus.Open]: {
    label: "مفتوح (نشط)",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-300 dark:border-emerald-700",
  },
  [OilBarrelStatus.Depleted]: {
    label: "فارغ ومستهلك",
    bg: "bg-zinc-100 dark:bg-zinc-900",
    text: "text-zinc-500 dark:text-zinc-400",
    border: "border-zinc-300 dark:border-zinc-800",
  },
  [OilBarrelStatus.Returned]: {
    label: "مرتجع للمورد",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
  },
};

export const oilReminderStatusConfig: Record<
  OilReminderStatus,
  { label: string; bg: string; text: string; border: string; level: number }
> = {
  [OilReminderStatus.OK]: {
    label: "سليم وطبيعي",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    level: 1,
  },
  [OilReminderStatus.Due]: {
    label: "مستحق الآن",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    level: 2,
  },
  [OilReminderStatus.Overdue]: {
    label: "متأخر وتجاوز الحد!",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    level: 3,
  },
  [OilReminderStatus.NeverDone]: {
    label: "لم يتم تغييره مسبقاً",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    level: 2,
  },
  [OilReminderStatus.OdometerMissing]: {
    label: "بيانات العداد مفقودة",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
    level: 0,
  },
};

export const externalPaymentStatusConfig: Record<
  ExternalPaymentStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  [ExternalPaymentStatus.Unpaid]: {
    label: "غير مسدد",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
  },
  [ExternalPaymentStatus.PartiallyPaid]: {
    label: "مسدد جزئياً",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  [ExternalPaymentStatus.Paid]: {
    label: "مسدد بالكامل",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  [ExternalPaymentStatus.Refunded]: {
    label: "مسترد",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
  },
};

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "0.00 ر.س";
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}
