import {
  VehicleType,
  VehicleFuelType,
  VehicleTransmissionType,
  VehicleOwnershipType,
  VehicleRegistrationType,
  VehicleOperationalStatus,
  VehicleCondition,
  VehicleIssueCategory,
  VehicleIssueSeverity,
  VehicleIssueStatus,
  VehicleComplianceDueStatus,
  VehicleAccidentSeverity,
  VehicleAccidentStatus,
  VehicleFileKind,
  VehicleAccidentWorkflowStage,
  VehicleAccidentWorkflowAction,
  VehicleAccidentEvidenceType,
  VehicleAccidentClaimType,
  VehicleAccidentRefundStatus,
} from "./types";
import { AppLocale, translate } from "../i18n";

export function formatVehicleFileKind(kind?: VehicleFileKind | number | string | null, locale: AppLocale = "ar"): string {
  if (kind === null || kind === undefined) return "—";
  if (typeof kind === "string") {
    switch (kind) {
      case "Istimara": return translate(locale, "fleet.fileKinds.istimara");
      case "OperationCard": return translate(locale, "fleet.fileKinds.operationCard");
      case "FrontImage": return translate(locale, "fleet.fileKinds.frontImage");
      case "RearImage": return translate(locale, "fleet.fileKinds.rearImage");
      case "LeftImage": return translate(locale, "fleet.fileKinds.leftImage");
      case "RightImage": return translate(locale, "fleet.fileKinds.rightImage");
      default: break;
    }
  }
  switch (Number(kind)) {
    case VehicleFileKind.Istimara:
      return translate(locale, "fleet.fileKinds.istimara");
    case VehicleFileKind.OperationCard:
      return translate(locale, "fleet.fileKinds.operationCard");
    case VehicleFileKind.FrontImage:
      return translate(locale, "fleet.fileKinds.frontImage");
    case VehicleFileKind.RearImage:
      return translate(locale, "fleet.fileKinds.rearImage");
    case VehicleFileKind.LeftImage:
      return translate(locale, "fleet.fileKinds.leftImage");
    case VehicleFileKind.RightImage:
      return translate(locale, "fleet.fileKinds.rightImage");
    case VehicleFileKind.Legacy:
      return translate(locale, "fleet.fileKinds.legacy");
    default:
      return String(kind);
  }
}

export function formatVehicleType(type?: VehicleType | number | null, locale: AppLocale = "ar"): string {
  if (type === null || type === undefined) return "—";
  switch (Number(type)) {
    case VehicleType.Motorcycle:
      return translate(locale, "fleet.types.motorcycle");
    case VehicleType.Car:
      return translate(locale, "fleet.types.car");
    case VehicleType.Van:
      return translate(locale, "fleet.types.van");
    case VehicleType.Truck:
      return translate(locale, "fleet.types.truck");
    case VehicleType.Other:
      return translate(locale, "fleet.types.other");
    default:
      return String(type);
  }
}

export function formatVehicleFuelType(fuel?: VehicleFuelType | number | null, locale: AppLocale = "ar"): string {
  if (fuel === null || fuel === undefined) return "—";
  switch (Number(fuel)) {
    case VehicleFuelType.Petrol:
      return translate(locale, "fleet.fuelTypes.petrol");
    case VehicleFuelType.Diesel:
      return translate(locale, "fleet.fuelTypes.diesel");
    case VehicleFuelType.Electric:
      return translate(locale, "fleet.fuelTypes.electric");
    case VehicleFuelType.Hybrid:
      return translate(locale, "fleet.fuelTypes.hybrid");
    case VehicleFuelType.Other:
      return translate(locale, "fleet.fuelTypes.other");
    default:
      return String(fuel);
  }
}

export function formatVehicleTransmissionType(trans?: VehicleTransmissionType | number | null, locale: AppLocale = "ar"): string {
  if (trans === null || trans === undefined) return "—";
  switch (Number(trans)) {
    case VehicleTransmissionType.Manual:
      return translate(locale, "fleet.transmissionTypes.manual");
    case VehicleTransmissionType.Automatic:
      return translate(locale, "fleet.transmissionTypes.automatic");
    case VehicleTransmissionType.Other:
      return translate(locale, "fleet.transmissionTypes.other");
    default:
      return String(trans);
  }
}

export function formatVehicleOwnershipType(ownership?: VehicleOwnershipType | number | null, locale: AppLocale = "ar"): string {
  if (ownership === null || ownership === undefined) return "—";
  switch (Number(ownership)) {
    case VehicleOwnershipType.Owned:
      return translate(locale, "fleet.ownershipTypes.owned");
    case VehicleOwnershipType.Leased:
      return translate(locale, "fleet.ownershipTypes.leased");
    case VehicleOwnershipType.ThirdParty:
      return translate(locale, "fleet.ownershipTypes.thirdParty");
    default:
      return String(ownership);
  }
}

export function formatVehicleRegistrationType(reg?: VehicleRegistrationType | number | null, locale: AppLocale = "ar"): string {
  if (reg === null || reg === undefined) return "—";
  switch (Number(reg)) {
    case VehicleRegistrationType.Private:
      return translate(locale, "fleet.registrationTypes.private");
    case VehicleRegistrationType.PrivateTransport:
      return translate(locale, "fleet.registrationTypes.privateTransport");
    case VehicleRegistrationType.SmallBus:
      return translate(locale, "fleet.registrationTypes.smallBus");
    case VehicleRegistrationType.Taxi:
      return translate(locale, "fleet.registrationTypes.taxi");
    case VehicleRegistrationType.PublicTransport:
      return translate(locale, "fleet.registrationTypes.publicTransport");
    case VehicleRegistrationType.PublicBus:
      return translate(locale, "fleet.registrationTypes.publicBus");
    case VehicleRegistrationType.Motorcycle:
      return translate(locale, "fleet.registrationTypes.motorcycle");
    case VehicleRegistrationType.PublicWorks:
      return translate(locale, "fleet.registrationTypes.publicWorks");
    default:
      return String(reg);
  }
}

export function formatVehicleCondition(cond?: VehicleCondition | number | null, locale: AppLocale = "ar"): string {
  if (cond === null || cond === undefined) return "—";
  switch (Number(cond)) {
    case VehicleCondition.Unknown:
      return translate(locale, "fleet.conditions.unknown");
    case VehicleCondition.Good:
      return translate(locale, "fleet.conditions.good");
    case VehicleCondition.Fair:
      return translate(locale, "fleet.conditions.fair");
    case VehicleCondition.Damaged:
      return translate(locale, "fleet.conditions.damaged");
    case VehicleCondition.Unsafe:
      return translate(locale, "fleet.conditions.unsafe");
    default:
      return String(cond);
  }
}

export function formatVehicleOperationalStatus(status?: VehicleOperationalStatus | number | null, locale: AppLocale = "ar"): string {
  if (status === null || status === undefined) return "—";
  switch (Number(status)) {
    case VehicleOperationalStatus.Available:
      return translate(locale, "fleet.operationalStatuses.available");
    case VehicleOperationalStatus.Assigned:
      return translate(locale, "fleet.operationalStatuses.assigned");
    case VehicleOperationalStatus.ProblemHold:
      return translate(locale, "fleet.operationalStatuses.problemHold");
    case VehicleOperationalStatus.AccidentHold:
      return translate(locale, "fleet.operationalStatuses.accidentHold");
    case VehicleOperationalStatus.Stolen:
      return translate(locale, "fleet.operationalStatuses.stolen");
    case VehicleOperationalStatus.OutOfService:
      return translate(locale, "fleet.operationalStatuses.outOfService");
    case VehicleOperationalStatus.Decommissioned:
      return translate(locale, "fleet.operationalStatuses.decommissioned");
    default:
      return String(status);
  }
}

export function formatVehicleIssueCategory(cat?: VehicleIssueCategory | number | string | null, locale: AppLocale = "ar"): string {
  if (cat === null || cat === undefined) return "—";
  if (typeof cat === "string" && isNaN(Number(cat))) {
    switch (cat.trim()) {
      case "Problem": return translate(locale, "fleet.issueCategories.problem");
      case "Accident": return translate(locale, "fleet.issueCategories.accident");
      case "Theft": return translate(locale, "fleet.issueCategories.theft");
      case "Damage": return translate(locale, "fleet.issueCategories.damage");
      case "Administrative": return translate(locale, "fleet.issueCategories.administrative");
      default: break;
    }
  }
  switch (Number(cat)) {
    case VehicleIssueCategory.Problem:
      return translate(locale, "fleet.issueCategories.problem");
    case VehicleIssueCategory.Accident:
      return translate(locale, "fleet.issueCategories.accident");
    case VehicleIssueCategory.Theft:
      return translate(locale, "fleet.issueCategories.theft");
    case VehicleIssueCategory.Damage:
      return translate(locale, "fleet.issueCategories.damage");
    case VehicleIssueCategory.Administrative:
      return translate(locale, "fleet.issueCategories.administrative");
    default:
      return String(cat);
  }
}

export function formatVehicleIssueStatus(st?: VehicleIssueStatus | number | null, locale: AppLocale = "ar"): string {
  if (st === null || st === undefined) return "—";
  switch (Number(st)) {
    case VehicleIssueStatus.Open:
      return translate(locale, "fleet.issueStatuses.open");
    case VehicleIssueStatus.UnderReview:
      return translate(locale, "fleet.issueStatuses.underReview");
    case VehicleIssueStatus.Resolved:
      return translate(locale, "fleet.issueStatuses.resolved");
    case VehicleIssueStatus.Closed:
      return translate(locale, "fleet.issueStatuses.closed");
    case VehicleIssueStatus.Rejected:
      return translate(locale, "fleet.issueStatuses.rejected");
    default:
      return String(st);
  }
}

export function formatVehicleComplianceDueStatus(st?: VehicleComplianceDueStatus | number | null, locale: AppLocale = "ar"): string {
  if (st === null || st === undefined) return "—";
  switch (Number(st)) {
    case VehicleComplianceDueStatus.Valid:
      return translate(locale, "fleet.complianceStatuses.valid");
    case VehicleComplianceDueStatus.Upcoming:
      return translate(locale, "fleet.complianceStatuses.upcoming");
    case VehicleComplianceDueStatus.DueToday:
      return translate(locale, "fleet.complianceStatuses.dueToday");
    case VehicleComplianceDueStatus.Expired:
      return translate(locale, "fleet.complianceStatuses.expired");
    case VehicleComplianceDueStatus.Missing:
      return translate(locale, "fleet.complianceStatuses.missing");
    default:
      return String(st);
  }
}

export function formatVehicleAccidentSeverity(sev?: VehicleAccidentSeverity | number | null, locale: AppLocale = "ar"): string {
  if (sev === null || sev === undefined) return "—";
  switch (Number(sev)) {
    case VehicleAccidentSeverity.Minor:
      return translate(locale, "fleet.accidentSeverities.minor");
    case VehicleAccidentSeverity.Moderate:
      return translate(locale, "fleet.accidentSeverities.moderate");
    case VehicleAccidentSeverity.Serious:
      return translate(locale, "fleet.accidentSeverities.serious");
    case VehicleAccidentSeverity.Critical:
      return translate(locale, "fleet.accidentSeverities.critical");
    default:
      return String(sev);
  }
}

export function formatVehicleAccidentStatus(st?: VehicleAccidentStatus | number | null, locale: AppLocale = "ar"): string {
  if (st === null || st === undefined) return "—";
  switch (Number(st)) {
    case VehicleAccidentStatus.Reported:
      return translate(locale, "fleet.accidentStatuses.reported");
    case VehicleAccidentStatus.Finalized:
      return translate(locale, "fleet.accidentStatuses.finalized");
    case VehicleAccidentStatus.Closed:
      return translate(locale, "fleet.accidentStatuses.closed");
    default:
      return String(st);
  }
}

export function formatVehicleIssueSeverity(sev?: VehicleIssueSeverity | number | string | null, locale: AppLocale = "ar"): string {
  if (sev === null || sev === undefined) return "—";
  if (typeof sev === "string" && isNaN(Number(sev))) {
    switch (sev.trim()) {
      case "Low": return "منخفضة";
      case "Medium": return "متوسطة";
      case "High": return "عالية";
      case "Critical": return "حرجة جداً";
      default: break;
    }
  }
  switch (Number(sev)) {
    case VehicleIssueSeverity.Low:
      return "منخفضة";
    case VehicleIssueSeverity.Medium:
      return "متوسطة";
    case VehicleIssueSeverity.High:
      return "عالية";
    case VehicleIssueSeverity.Critical:
      return "حرجة جداً";
    default:
      return String(sev);
  }
}

// ---------------------------
// Accident Workflow Formatters
// ---------------------------

export function formatWorkflowStage(stage?: VehicleAccidentWorkflowStage | number | null): string {
  if (stage === null || stage === undefined) return "—";
  switch (Number(stage)) {
    case VehicleAccidentWorkflowStage.AwaitingNajm:
      return "انتظار تقرير نجم والنسب";
    case VehicleAccidentWorkflowStage.Assessed:
      return "تم تحديد المسؤولية";
    case VehicleAccidentWorkflowStage.LocalRepair:
      return "إصلاح بسيط على المندوب";
    case VehicleAccidentWorkflowStage.ClaimDraft:
      return "إعداد المطالبة";
    case VehicleAccidentWorkflowStage.AwaitingAssessment:
      return "تم التقديم وانتظار التقييم";
    case VehicleAccidentWorkflowStage.CompensationOffered:
      return "وصل عرض التعويض";
    case VehicleAccidentWorkflowStage.AwaitingInsurance:
      return "انتظار رد التأمين (مهلة 15 يوماً)";
    case VehicleAccidentWorkflowStage.InsuranceRejected:
      return "رفض التأمين (متاح إعادة التقديم)";
    case VehicleAccidentWorkflowStage.InsuranceApproved:
      return "قبول التأمين";
    case VehicleAccidentWorkflowStage.AwaitingSupplierTransfer:
      return "انتظار تحويل شركة الشراء (مهلة 10 أيام)";
    case VehicleAccidentWorkflowStage.RepairDirected:
      return "تحددت جهة الإصلاح";
    case VehicleAccidentWorkflowStage.Repairing:
      return "الإصلاح جارٍ";
    case VehicleAccidentWorkflowStage.TotalLossProposed:
      return "اقتراح الإتلاف";
    case VehicleAccidentWorkflowStage.AwaitingReinspection:
      return "انتظار إعادة الفحص";
    case VehicleAccidentWorkflowStage.TotalLossConfirmed:
      return "تأكد الإتلاف";
    case VehicleAccidentWorkflowStage.AwaitingValuation:
      return "تم استلام المركبة وانتظار التقدير المالي";
    case VehicleAccidentWorkflowStage.TotalLossValued:
      return "تم تسجيل التقدير المالي";
    case VehicleAccidentWorkflowStage.Completed:
      return "اكتمل المسار الأساسي";
    default:
      return `مرحلة ${stage}`;
  }
}

export function getWorkflowStageColor(stage?: VehicleAccidentWorkflowStage | number | null): {
  bg: string;
  text: string;
  border: string;
} {
  const num = Number(stage);
  if (num === VehicleAccidentWorkflowStage.Completed) {
    return { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" };
  }
  if (num === VehicleAccidentWorkflowStage.InsuranceRejected) {
    return { bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800" };
  }
  if (num === VehicleAccidentWorkflowStage.AwaitingInsurance || num === VehicleAccidentWorkflowStage.AwaitingSupplierTransfer) {
    return { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" };
  }
  if (num === VehicleAccidentWorkflowStage.Repairing || num === VehicleAccidentWorkflowStage.LocalRepair) {
    return { bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800" };
  }
  if (num >= VehicleAccidentWorkflowStage.TotalLossProposed && num <= VehicleAccidentWorkflowStage.TotalLossValued) {
    return { bg: "bg-red-50 dark:bg-red-950/40", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" };
  }
  return { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" };
}

export function formatEvidenceType(type?: VehicleAccidentEvidenceType | number | null): string {
  if (type === null || type === undefined) return "—";
  switch (Number(type)) {
    case VehicleAccidentEvidenceType.Image: return "صورة عامة";
    case VehicleAccidentEvidenceType.UploadedReport: return "تقرير مرفوع";
    case VehicleAccidentEvidenceType.Other: return "ملف آخر";
    case VehicleAccidentEvidenceType.NajmReport: return "تقرير نجم PDF";
    case VehicleAccidentEvidenceType.DamagePhoto: return "صورة الضرر";
    case VehicleAccidentEvidenceType.DamagePromissoryNote: return "سند لأمر بتكلفة الضرر";
    case VehicleAccidentEvidenceType.ClaimOpeningFeeReceipt: return "سند دفع فتح المطالبة (2500 ريال)";
    case VehicleAccidentEvidenceType.ClaimSubmissionReport: return "تقرير تقديم/تسليم المطالبة";
    case VehicleAccidentEvidenceType.AssessmentReceipt: return "إيصال التقييم / عرض التعويض";
    case VehicleAccidentEvidenceType.InsuranceDecision: return "قرار التأمين (قبول/رفض)";
    case VehicleAccidentEvidenceType.PaymentReceipt: return "إيصال سداد التأمين";
    case VehicleAccidentEvidenceType.TransferReceipt: return "إثبات وصول التحويل لشركتنا";
    case VehicleAccidentEvidenceType.RepairDirection: return "خطاب جهة الإصلاح";
    case VehicleAccidentEvidenceType.RepairCompletion: return "إثبات انتهاء الإصلاح";
    case VehicleAccidentEvidenceType.ReinspectionReport: return "تقرير إعادة الفحص";
    case VehicleAccidentEvidenceType.TotalLossConfirmation: return "تأكيد الإتلاف";
    case VehicleAccidentEvidenceType.VehicleCollectionReceipt: return "محضر استلام المركبة";
    case VehicleAccidentEvidenceType.ValuationReceipt: return "إيصال التقدير المالي للإتلاف";
    case VehicleAccidentEvidenceType.TowingReceipt: return "إيصال السطحة والنقل";
    case VehicleAccidentEvidenceType.InstallmentReceipt: return "إثبات دفع القسط";
    case VehicleAccidentEvidenceType.InstallmentRefundRequest: return "طلب استرداد الأقساط PDF";
    case VehicleAccidentEvidenceType.InstallmentRefundReceipt: return "إيصال استلام استرداد الأقساط";
    default: return `مستند نوع ${type}`;
  }
}

export function formatRefundStatus(st?: VehicleAccidentRefundStatus | number | null): { text: string; bg: string; color: string } {
  switch (Number(st)) {
    case VehicleAccidentRefundStatus.NotSubmitted:
      return { text: "لم يُقدّم طلب الأقساط", bg: "bg-slate-100 dark:bg-slate-800", color: "text-slate-600 dark:text-slate-400" };
    case VehicleAccidentRefundStatus.Submitted:
      return { text: "تم تقديم الطلب (بانتظار الرد)", bg: "bg-blue-50 dark:bg-blue-950/40", color: "text-blue-700 dark:text-blue-300" };
    case VehicleAccidentRefundStatus.Received:
      return { text: "تم استلام الاسترداد بنجاح", bg: "bg-emerald-50 dark:bg-emerald-950/40", color: "text-emerald-700 dark:text-emerald-300" };
    case VehicleAccidentRefundStatus.Rejected:
      return { text: "تم رفض استرداد الأقساط", bg: "bg-rose-50 dark:bg-rose-950/40", color: "text-rose-700 dark:text-rose-300" };
    case VehicleAccidentRefundStatus.NotApplicable:
      return { text: "غير منطبق (لا توجد أقساط)", bg: "bg-gray-100 dark:bg-gray-800", color: "text-gray-500 dark:text-gray-400" };
    default:
      return { text: "غير محدد", bg: "bg-slate-50", color: "text-slate-500" };
  }
}

export function formatWorkflowActionName(action?: VehicleAccidentWorkflowAction | number | null): string {
  switch (Number(action)) {
    case VehicleAccidentWorkflowAction.AssessFault: return "مراجعة تقرير نجم وتسجيل المسؤولية";
    case VehicleAccidentWorkflowAction.StartLocalRepair: return "بدء إصلاح بسيط على المندوب";
    case VehicleAccidentWorkflowAction.CompleteLocalRepair: return "إثبات انتهاء الإصلاح البسيط";
    case VehicleAccidentWorkflowAction.OpenClaim: return "فتح ملف المطالبة";
    case VehicleAccidentWorkflowAction.SubmitClaim: return "تسجيل تقديم المطالبة";
    case VehicleAccidentWorkflowAction.ReceiveCompensationOffer: return "تسجيل رد عرض التعويض";
    case VehicleAccidentWorkflowAction.SubmitToInsurance: return "تسليم المطالبة للتأمين";
    case VehicleAccidentWorkflowAction.ApproveInsurance: return "تسجيل قبول التأمين وسداده";
    case VehicleAccidentWorkflowAction.RejectInsurance: return "تسجيل رفض التأمين";
    case VehicleAccidentWorkflowAction.SubmitToSupplier: return "تسليم لشركة شراء المركبة";
    case VehicleAccidentWorkflowAction.ConfirmTransfer: return "تأكيد وصول التحويل لشركتنا";
    case VehicleAccidentWorkflowAction.ReceiveRepairDirection: return "استلام توجيه الإصلاح والورشة";
    case VehicleAccidentWorkflowAction.StartRepair: return "بدء عملية الإصلاح";
    case VehicleAccidentWorkflowAction.RepairProgress: return "تحديث متابعة الإصلاح";
    case VehicleAccidentWorkflowAction.CompleteRepair: return "إتمام الإصلاح وإثبات الجاهزية";
    case VehicleAccidentWorkflowAction.ProposeTotalLoss: return "استلام مقترح الإتلاف الكلي";
    case VehicleAccidentWorkflowAction.RequestReinspection: return "طلب إعادة الفحص";
    case VehicleAccidentWorkflowAction.ConfirmTotalLoss: return "تأكيد الإتلاف النهائي";
    case VehicleAccidentWorkflowAction.RecordVehicleCollection: return "تسجيل استلام الجهة للمركبة";
    case VehicleAccidentWorkflowAction.RecordValuation: return "تسجيل التقدير المالي للإتلاف";
    case VehicleAccidentWorkflowAction.FollowUp: return "تسجيل متابعة عامة";
    case VehicleAccidentWorkflowAction.SubmitInstallmentRefund: return "تقديم طلب استرداد الأقساط";
    case VehicleAccidentWorkflowAction.ReceiveInstallmentRefund: return "تسجيل استلام استرداد الأقساط";
    case VehicleAccidentWorkflowAction.RejectInstallmentRefund: return "تسجيل رفض استرداد الأقساط";
    case VehicleAccidentWorkflowAction.MarkNoInstallments: return "تأكيد عدم وجود أقساط للمطالبة";
    default: return `إجراء ${action}`;
  }
}

export function formatCountdownTimer(remainingSeconds?: number | null): {
  formatted: string;
  isOverdue: boolean;
  days: number;
  hours: number;
  minutes: number;
} {
  if (remainingSeconds === null || remainingSeconds === undefined) {
    return { formatted: "—", isOverdue: false, days: 0, hours: 0, minutes: 0 };
  }
  const isOverdue = remainingSeconds < 0;
  const absSecs = Math.abs(remainingSeconds);
  const days = Math.floor(absSecs / 86400);
  const hours = Math.floor((absSecs % 86400) / 3600);
  const minutes = Math.floor((absSecs % 3600) / 60);

  let formatted = "";
  if (days > 0) {
    formatted = `${days} يوم ${hours} ساعة`;
  } else if (hours > 0) {
    formatted = `${hours} ساعة ${minutes} دقيقة`;
  } else {
    formatted = `${minutes} دقيقة`;
  }

  if (isOverdue) {
    formatted = `متأخر بـ ${formatted}`;
  } else {
    formatted = `متبقي ${formatted}`;
  }

  return { formatted, isOverdue, days, hours, minutes };
}

