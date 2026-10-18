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
  SupplyRequestStatus,
  SupplyRequestSubjectType,
  MaintenanceLocation,
  VehicleType,
} from "./types";

export const locationTypeLabels: Record<LocationType, string> = {
  [LocationType.Warehouse]: "مستودع",
  [LocationType.Workshop]: "ورشة صيانة",
  [LocationType.WarehouseAndWorkshop]: "مستودع وورشة",
};

export const locationTypeLabelsEn: Record<LocationType, string> = {
  [LocationType.Warehouse]: "Warehouse",
  [LocationType.Workshop]: "Workshop",
  [LocationType.WarehouseAndWorkshop]: "Warehouse & Workshop",
};

export function getLocationTypeLabel(type: LocationType, isEn = false): string {
  return (isEn ? locationTypeLabelsEn[type] : locationTypeLabels[type]) || String(type);
}

export const serviceSubjectTypeLabels: Record<ServiceSubjectType, string> = {
  [ServiceSubjectType.CompanyVehicle]: "مركبة شركة",
  [ServiceSubjectType.ExternalVehicle]: "مركبة عميل خارجي",
};

export const serviceSubjectTypeLabelsEn: Record<ServiceSubjectType, string> = {
  [ServiceSubjectType.CompanyVehicle]: "Company Vehicle",
  [ServiceSubjectType.ExternalVehicle]: "External Vehicle",
};

export function getServiceSubjectTypeLabel(type: ServiceSubjectType, isEn = false): string {
  return (isEn ? serviceSubjectTypeLabelsEn[type] : serviceSubjectTypeLabels[type]) || String(type);
}

export const maintenanceTypeLabels: Record<MaintenanceType, string> = {
  [MaintenanceType.Preventive]: "صيانة دورية وقائية",
  [MaintenanceType.Corrective]: "إصلاح عطل (تصحيحية)",
  [MaintenanceType.Inspection]: "فحص ومعاينة",
  [MaintenanceType.AccidentRepair]: "إصلاح حادث",
  [MaintenanceType.OilChange]: "تغيير زيت",
  [MaintenanceType.PartSaleOnly]: "بيع قطع غيار فقط",
};

export const maintenanceTypeLabelsEn: Record<MaintenanceType, string> = {
  [MaintenanceType.Preventive]: "Preventive Maintenance",
  [MaintenanceType.Corrective]: "Corrective Repair",
  [MaintenanceType.Inspection]: "Inspection",
  [MaintenanceType.AccidentRepair]: "Accident Repair",
  [MaintenanceType.OilChange]: "Oil Change",
  [MaintenanceType.PartSaleOnly]: "Spare Part Sale Only",
};

export function getMaintenanceTypeLabel(type: MaintenanceType, isEn = false): string {
  return (isEn ? maintenanceTypeLabelsEn[type] : maintenanceTypeLabels[type]) || String(type);
}

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

export const workOrderStatusConfigEn: Record<
  WorkOrderStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  [WorkOrderStatus.Open]: {
    label: "Open (New)",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  [WorkOrderStatus.InProgress]: {
    label: "In Progress",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  [WorkOrderStatus.Completed]: {
    label: "Completed",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  [WorkOrderStatus.Closed]: {
    label: "Closed",
    bg: "bg-slate-100 dark:bg-slate-800/60",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
  },
  [WorkOrderStatus.Cancelled]: {
    label: "Cancelled",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
  },
};

export function getWorkOrderEffectiveStatus(
  status: WorkOrderStatus,
  supplyRequest?: { status: SupplyRequestStatus } | null,
  isEn = false,
): { label: string; bg: string; text: string; border: string } {
  const config = isEn ? workOrderStatusConfigEn : workOrderStatusConfig;
  if (status === WorkOrderStatus.Cancelled) {
    return config[WorkOrderStatus.Cancelled];
  }
  if (status === WorkOrderStatus.Completed) {
    return config[WorkOrderStatus.Completed];
  }
  if (status === WorkOrderStatus.Closed) {
    return config[WorkOrderStatus.Closed];
  }
  if (status === WorkOrderStatus.InProgress) {
    return config[WorkOrderStatus.InProgress];
  }

  if (supplyRequest) {
    if (supplyRequest.status === SupplyRequestStatus.Rejected) {
      return {
        label: isEn ? "Rejected" : "مرفوض",
        bg: "bg-red-50 dark:bg-red-950/40",
        text: "text-red-700 dark:text-red-300",
        border: "border-red-200 dark:border-red-800",
      };
    }
    if (supplyRequest.status === SupplyRequestStatus.PendingWarehouseApproval) {
      return {
        label: isEn ? "Awaiting Warehouse Approval" : "بانتظار موافقة المستودع",
        bg: "bg-amber-50 dark:bg-amber-950/40",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-200 dark:border-amber-800",
      };
    }
    if (supplyRequest.status === SupplyRequestStatus.Cancelled) {
      return {
        label: isEn ? "Cancelled (Material Request)" : "ملغي (طلب مواد)",
        bg: "bg-slate-100 dark:bg-slate-800/60",
        text: "text-slate-700 dark:text-slate-300",
        border: "border-slate-200 dark:border-slate-700",
      };
    }
  }

  return config[status] || config[WorkOrderStatus.Open];
}

export const itemTypeLabels: Record<ItemType, string> = {
  [ItemType.SparePart]: "قطعة غيار",
  [ItemType.RiderAccessory]: "مستلزمات ومعدات المندوب",
  [ItemType.Oil]: "زيت ومواد تشحيم",
  [ItemType.Consumable]: "مستهلكات وورشة",
};

export const itemTypeLabelsEn: Record<ItemType, string> = {
  [ItemType.SparePart]: "Spare Part",
  [ItemType.RiderAccessory]: "Rider Equipment & Items",
  [ItemType.Oil]: "Oil & Lubricants",
  [ItemType.Consumable]: "Workshop Consumables",
};

export function getItemTypeLabel(type: ItemType, isEn = false): string {
  return (isEn ? itemTypeLabelsEn[type] : itemTypeLabels[type]) || String(type);
}

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

export function getItemTypeBadgeStyle(type: ItemType, isEn = false) {
  const base = itemTypeBadgeStyles[type] || itemTypeBadgeStyles[ItemType.SparePart];
  return {
    ...base,
    label: isEn ? (itemTypeLabelsEn[type] || base.label) : base.label,
  };
}

export const RIDER_ASSIGNABLE_ITEM_TYPES = [ItemType.RiderAccessory];

export const vehicleTypeLabels: Record<VehicleType, string> = {
  [VehicleType.Motorcycle]: "دراجة نارية",
  [VehicleType.Car]: "سيارة",
  [VehicleType.Van]: "فان",
  [VehicleType.Truck]: "شاحنة",
  [VehicleType.Other]: "أخرى",
};

export const vehicleTypeLabelsEn: Record<VehicleType, string> = {
  [VehicleType.Motorcycle]: "Motorcycle",
  [VehicleType.Car]: "Car",
  [VehicleType.Van]: "Van",
  [VehicleType.Truck]: "Truck",
  [VehicleType.Other]: "Other",
};

export const vehicleTypeBadgeStyles: Record<
  VehicleType,
  { label: string; bg: string; text: string; border: string }
> = {
  [VehicleType.Motorcycle]: {
    label: "دراجة نارية",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
  },
  [VehicleType.Car]: {
    label: "سيارة",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  [VehicleType.Van]: {
    label: "فان",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  [VehicleType.Truck]: {
    label: "شاحنة",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  [VehicleType.Other]: {
    label: "أخرى",
    bg: "bg-slate-100 dark:bg-slate-800/60",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
  },
};

export const ALL_VEHICLE_TYPES: VehicleType[] = [
  VehicleType.Motorcycle,
  VehicleType.Car,
  VehicleType.Van,
  VehicleType.Truck,
  VehicleType.Other,
];

export function canUseItem(
  compatibleVehicleTypes?: VehicleType[] | null,
  vehicleType?: VehicleType | number | null,
): boolean {
  if (!compatibleVehicleTypes || compatibleVehicleTypes.length === 0) {
    return true;
  }
  return vehicleType === null || vehicleType === undefined
    ? compatibleVehicleTypes.length === 5
    : compatibleVehicleTypes.includes(vehicleType as VehicleType);
}

export function getVehicleTypeLabel(type: VehicleType | number, isEn = false): string {
  const vt = type as VehicleType;
  return (isEn ? vehicleTypeLabelsEn[vt] : vehicleTypeLabels[vt]) || String(type);
}

export function getVehicleTypeBadgeStyle(type: VehicleType | number, isEn = false) {
  const vt = type as VehicleType;
  const base = vehicleTypeBadgeStyles[vt] || vehicleTypeBadgeStyles[VehicleType.Other];
  return {
    ...base,
    label: isEn ? (vehicleTypeLabelsEn[vt] || base.label) : base.label,
  };
}

export function formatCompatibleVehicleTypes(
  types?: VehicleType[] | null,
  localeOrIsEn: "ar" | "en" | boolean = "ar",
): string {
  const isEn = typeof localeOrIsEn === "boolean" ? localeOrIsEn : localeOrIsEn === "en";
  if (!types || types.length === 0 || types.length === 5) {
    return isEn ? "All vehicle types" : "كافة أنواع المركبات";
  }
  const labels = isEn ? vehicleTypeLabelsEn : vehicleTypeLabels;
  const separator = isEn ? ", " : "، ";
  return types.map((t) => labels[t] || String(t)).join(separator);
}


export const unitOfMeasureLabels: Record<UnitOfMeasure, string> = {
  [UnitOfMeasure.Piece]: "حبة / قطعة",
  [UnitOfMeasure.Liter]: "لتر",
  [UnitOfMeasure.Barrel]: "برميل",
  [UnitOfMeasure.Box]: "كرتون / علبة",
  [UnitOfMeasure.Set]: "طقم",
};

export const unitOfMeasureLabelsEn: Record<UnitOfMeasure, string> = {
  [UnitOfMeasure.Piece]: "Piece",
  [UnitOfMeasure.Liter]: "Liter",
  [UnitOfMeasure.Barrel]: "Barrel",
  [UnitOfMeasure.Box]: "Box / Pack",
  [UnitOfMeasure.Set]: "Set",
};

export function getUnitOfMeasureLabel(unit: UnitOfMeasure, isEn = false): string {
  return (isEn ? unitOfMeasureLabelsEn[unit] : unitOfMeasureLabels[unit]) || String(unit);
}

export const materialUsageTypeLabels: Record<MaterialUsageType, string> = {
  [MaterialUsageType.SparePart]: "قطعة غيار",
  [MaterialUsageType.Oil]: "زيت",
  [MaterialUsageType.OilFilter]: "فلتر زيت",
  [MaterialUsageType.Consumable]: "مستهلكات",
  [MaterialUsageType.ExternalPartSale]: "مبيع خارجي",
};

export const materialUsageTypeLabelsEn: Record<MaterialUsageType, string> = {
  [MaterialUsageType.SparePart]: "Spare Part",
  [MaterialUsageType.Oil]: "Oil",
  [MaterialUsageType.OilFilter]: "Oil Filter",
  [MaterialUsageType.Consumable]: "Consumable",
  [MaterialUsageType.ExternalPartSale]: "External Part Sale",
};

export function getMaterialUsageTypeLabel(type: MaterialUsageType, isEn = false): string {
  return (isEn ? materialUsageTypeLabelsEn[type] : materialUsageTypeLabels[type]) || String(type);
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: "نقداً (كاش)",
  [PaymentMethod.Card]: "بطاقة بنكية (مدى/فيزا)",
  [PaymentMethod.BankTransfer]: "تحويل بنكي",
  [PaymentMethod.Other]: "أخرى",
};

export const paymentMethodLabelsEn: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: "Cash",
  [PaymentMethod.Card]: "Bank Card (Mada/Visa)",
  [PaymentMethod.BankTransfer]: "Bank Transfer",
  [PaymentMethod.Other]: "Other",
};

export function getPaymentMethodLabel(method: PaymentMethod, isEn = false): string {
  return (isEn ? paymentMethodLabelsEn[method] : paymentMethodLabels[method]) || String(method);
}

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

export const oilBarrelStatusConfigEn: Record<
  OilBarrelStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  [OilBarrelStatus.Sealed]: {
    label: "Sealed (New)",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
  },
  [OilBarrelStatus.Open]: {
    label: "Open (Active)",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-300 dark:border-emerald-700",
  },
  [OilBarrelStatus.Depleted]: {
    label: "Depleted",
    bg: "bg-zinc-100 dark:bg-zinc-900",
    text: "text-zinc-500 dark:text-zinc-400",
    border: "border-zinc-300 dark:border-zinc-800",
  },
  [OilBarrelStatus.Returned]: {
    label: "Returned to Supplier",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
  },
};

export function getOilBarrelStatusLabel(status: OilBarrelStatus, isEn = false): string {
  const config = isEn ? oilBarrelStatusConfigEn : oilBarrelStatusConfig;
  return config[status]?.label || String(status);
}

export const oilBarrelVehicleTypeConfig: Record<
  number,
  {
    labelAr: string;
    labelEn: string;
    badgeAr: string;
    badgeEn: string;
    bg: string;
    text: string;
    border: string;
  }
> = {
  1: {
    labelAr: "دراجات نارية",
    labelEn: "Motorcycles",
    badgeAr: "دراجات نارية فقط",
    badgeEn: "Motorcycles only",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-300 dark:border-amber-800",
  },
  2: {
    labelAr: "سيارات",
    labelEn: "Cars",
    badgeAr: "سيارات فقط",
    badgeEn: "Cars only",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-300 dark:border-blue-800",
  },
};

export const sharedOilBarrelVehicleTypeConfig = {
  labelAr: "سيارات ودراجات نارية",
  labelEn: "Cars & Motorcycles",
  badgeAr: "سيارات ودراجات نارية (مشترك)",
  badgeEn: "Cars & Motorcycles (Shared)",
  bg: "bg-purple-50 dark:bg-purple-950/40",
  text: "text-purple-700 dark:text-purple-300",
  border: "border-purple-300 dark:border-purple-800",
};

export const oilBarrelMissingReasonConfig: Record<
  number,
  {
    labelAr: string;
    labelEn: string;
    bg: string;
    text: string;
    border: string;
  }
> = {
  1: {
    labelAr: "مفقود",
    labelEn: "Missing",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-300 dark:border-amber-800",
  },
  2: {
    labelAr: "تالف أو مسكوب",
    labelEn: "Wasted or spilled",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-300 dark:border-rose-800",
  },
  3: {
    labelAr: "مسروق",
    labelEn: "Theft",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-300 dark:border-red-800",
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

export const oilReminderStatusConfigEn: Record<
  OilReminderStatus,
  { label: string; bg: string; text: string; border: string; level: number }
> = {
  [OilReminderStatus.OK]: {
    label: "OK / Normal",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    level: 1,
  },
  [OilReminderStatus.Due]: {
    label: "Due Now",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    level: 2,
  },
  [OilReminderStatus.Overdue]: {
    label: "Overdue!",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    level: 3,
  },
  [OilReminderStatus.NeverDone]: {
    label: "Never Changed",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    level: 2,
  },
  [OilReminderStatus.OdometerMissing]: {
    label: "Odometer Missing",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
    level: 0,
  },
};

export function getOilReminderStatusLabel(status: OilReminderStatus, isEn = false): string {
  const config = isEn ? oilReminderStatusConfigEn : oilReminderStatusConfig;
  return config[status]?.label || String(status);
}

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

export const externalPaymentStatusConfigEn: Record<
  ExternalPaymentStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  [ExternalPaymentStatus.Unpaid]: {
    label: "Unpaid",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
  },
  [ExternalPaymentStatus.PartiallyPaid]: {
    label: "Partially Paid",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  [ExternalPaymentStatus.Paid]: {
    label: "Paid",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  [ExternalPaymentStatus.Refunded]: {
    label: "Refunded",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
  },
};

export function getExternalPaymentStatusLabel(status: ExternalPaymentStatus, isEn = false): string {
  const config = isEn ? externalPaymentStatusConfigEn : externalPaymentStatusConfig;
  return config[status]?.label || String(status);
}

export function formatCurrency(amount: number | null | undefined, isEn = false): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return isEn ? "0.00 SAR" : "0.00 ر.س";
  }
  const formatted = amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return isEn ? `${formatted} SAR` : `${formatted} ر.س`;
}

export function formatDateTime(isoString: string | null | undefined, isEn = false): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString(isEn ? "en-US" : "ar-SA", {
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

export function formatDate(dateString: string | null | undefined, isEn = false): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString(isEn ? "en-US" : "ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export const supplyRequestStatusConfig: Record<
  SupplyRequestStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  [SupplyRequestStatus.PendingWarehouseApproval]: {
    label: "بانتظار موافقة المستودع",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  [SupplyRequestStatus.ApprovedAndIssued]: {
    label: "معتمد ومصروف",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  [SupplyRequestStatus.Rejected]: {
    label: "مرفوض",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    dot: "bg-red-500",
  },
  [SupplyRequestStatus.Cancelled]: {
    label: "ملغي",
    bg: "bg-slate-100 dark:bg-slate-800/60",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
    dot: "bg-slate-400",
  },
};

export const supplyRequestStatusConfigEn: Record<
  SupplyRequestStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  [SupplyRequestStatus.PendingWarehouseApproval]: {
    label: "Awaiting Warehouse Approval",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  [SupplyRequestStatus.ApprovedAndIssued]: {
    label: "Approved & Issued",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  [SupplyRequestStatus.Rejected]: {
    label: "Rejected",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    dot: "bg-red-500",
  },
  [SupplyRequestStatus.Cancelled]: {
    label: "Cancelled",
    bg: "bg-slate-100 dark:bg-slate-800/60",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
    dot: "bg-slate-400",
  },
};

export function getSupplyRequestStatusLabel(status: SupplyRequestStatus, isEn = false): string {
  const config = isEn ? supplyRequestStatusConfigEn : supplyRequestStatusConfig;
  return config[status]?.label || String(status);
}

export const supplyRequestSubjectLabels: Record<SupplyRequestSubjectType, string> = {
  [SupplyRequestSubjectType.VehicleMaintenance]: "صيانة مركبة",
  [SupplyRequestSubjectType.Rider]: "مستلزمات مندوب",
};

export const supplyRequestSubjectLabelsEn: Record<SupplyRequestSubjectType, string> = {
  [SupplyRequestSubjectType.VehicleMaintenance]: "Vehicle Maintenance",
  [SupplyRequestSubjectType.Rider]: "Rider Items",
};

export function getSupplyRequestSubjectLabel(subject: SupplyRequestSubjectType, isEn = false): string {
  return (isEn ? supplyRequestSubjectLabelsEn[subject] : supplyRequestSubjectLabels[subject]) || String(subject);
}

// ==========================================
// Maintenance Work Site & Stock Location Mapping
// ==========================================

export const WORK_SITE_TO_INVENTORY_LOCATION_MAP: Record<string, string> = {
  // Jeddah work site -> Jeddah warehouse stock location
  "019d77f0-0000-7000-8000-000000000001": "019d77f0-0000-7000-8000-000000000003",
  // Riyadh work site -> Riyadh warehouse stock location
  "019d77f0-0000-7000-8000-000000000002": "019d77f0-0000-7000-8000-000000000004",
};

export const INVENTORY_TO_WORK_SITE_LOCATION_MAP: Record<string, string> = {
  "019d77f0-0000-7000-8000-000000000003": "019d77f0-0000-7000-8000-000000000001",
  "019d77f0-0000-7000-8000-000000000004": "019d77f0-0000-7000-8000-000000000002",
};

/**
 * Resolves the valid linked inventory stock location ID for a given maintenance work site ID.
 */
export function getLinkedInventoryLocationId(
  maintenanceLocationId: string | undefined | null,
  locations: MaintenanceLocation[] = [],
): string {
  if (!maintenanceLocationId) return "";

  // 1. Direct explicit mapping for known work sites
  if (WORK_SITE_TO_INVENTORY_LOCATION_MAP[maintenanceLocationId]) {
    return WORK_SITE_TO_INVENTORY_LOCATION_MAP[maintenanceLocationId];
  }

  // 2. If the ID is already an inventory stock location
  if (INVENTORY_TO_WORK_SITE_LOCATION_MAP[maintenanceLocationId]) {
    return maintenanceLocationId;
  }

  // 3. Match from locations list
  const currentLoc = locations.find((l) => l.id === maintenanceLocationId);
  if (
    currentLoc &&
    currentLoc.locationType === LocationType.Warehouse &&
    currentLoc.inventoryEnabled
  ) {
    return currentLoc.id;
  }

  if (currentLoc?.operatingCityId) {
    // Find warehouse in the same city
    const warehouseInCity = locations.find(
      (l) =>
        l.operatingCityId === currentLoc.operatingCityId &&
        l.inventoryEnabled &&
        (l.locationType === LocationType.Warehouse || (l.locationType as number) === 1),
    );
    if (warehouseInCity) return warehouseInCity.id;

    const anyStockInCity = locations.find(
      (l) =>
        l.operatingCityId === currentLoc.operatingCityId &&
        l.inventoryEnabled &&
        l.id !== currentLoc.id,
    );
    if (anyStockInCity) return anyStockInCity.id;
  }

  // 4. Any warehouse with inventoryEnabled
  const generalWarehouse = locations.find(
    (l) =>
      l.inventoryEnabled &&
      (l.locationType === LocationType.Warehouse || (l.locationType as number) === 1),
  );
  if (generalWarehouse) return generalWarehouse.id;

  const anyInventory = locations.find((l) => l.inventoryEnabled);
  return anyInventory?.id || maintenanceLocationId;
}

/**
 * Returns available inventory/stock locations suitable for parts/materials requests for a given maintenance site.
 */
export function getInventoryLocationsForSite(
  maintenanceLocationId: string | undefined | null,
  locations: MaintenanceLocation[] = [],
): MaintenanceLocation[] {
  const workSiteIds = new Set(Object.keys(WORK_SITE_TO_INVENTORY_LOCATION_MAP));
  const inventoryCandidates = locations.filter((l) => {
    // Exclude known work sites from being selectable as warehouse stock locations
    if (workSiteIds.has(l.id)) return false;
    return (
      l.inventoryEnabled ||
      l.locationType === LocationType.Warehouse ||
      (l.locationType as number) === 1
    );
  });

  if (!maintenanceLocationId) {
    return inventoryCandidates.length > 0 ? inventoryCandidates : locations;
  }

  const linkedId = WORK_SITE_TO_INVENTORY_LOCATION_MAP[maintenanceLocationId];
  const chosenSite = locations.find((l) => l.id === maintenanceLocationId);

  const filtered = inventoryCandidates.filter((l) => {
    if (linkedId && l.id === linkedId) return true;
    if (chosenSite?.operatingCityId && l.operatingCityId === chosenSite.operatingCityId) {
      return true;
    }
    return false;
  });

  if (filtered.length > 0) return filtered;

  if (linkedId) {
    const fromAll = locations.find((l) => l.id === linkedId);
    if (fromAll) return [fromAll];
  }

  return inventoryCandidates.length > 0 ? inventoryCandidates : locations;
}

