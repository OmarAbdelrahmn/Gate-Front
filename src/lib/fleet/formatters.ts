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
