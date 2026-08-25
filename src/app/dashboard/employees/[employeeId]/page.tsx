"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building,
  CalendarDays,
  ContactRound,
  FileText,
  History,
  Pencil,
  Plus,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { translate } from "../../../../lib/i18n";
import { hrCatalogApi, type HrRow } from "../../../../lib/hr/api";
import { getEmployee } from "../../../../lib/workforce/api";
import {
  listHousing,
  assignResident,
  type Housing,
  type AssignResidentPayload,
} from "../../../../lib/housing/api";
import type {
  EmployeeDetails,
  OperationalAssignment,
  Period,
} from "../../../../lib/workforce/types";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { SearchableSelect, type SelectOption } from "../../../../components/ui/SearchableSelect";
import { toast } from "../../../../components/ui/Toast";
import { EmployeeComplianceTabs } from "../../../../components/employees/EmployeeComplianceTabs";
import { EmployeeDocumentsInsurance } from "../../../../components/employees/EmployeeDocumentsInsurance";
import { EmployeePlatformAccounts } from "../../../../components/employees/EmployeePlatformAccounts";
import { EmployeeRiderHistoryModal } from "../../../../components/employees/EmployeeRiderHistoryModal";

const relationshipLabels: Record<string, { ar: string; en: string }> = {
  SponsoredInternal: { ar: "على الكفالة", en: "Internal Sponsored Employee" },
  OutsideRider: { ar: "مندوب خارجي", en: "External Delegate" },
};

const roleLabels: Record<string, { ar: string; en: string }> = {
  Rider: { ar: "مندوب", en: "Rider" },
  Delegate: { ar: "مندوب", en: "Delegate" },
  Employee: { ar: "موظف إداري", en: "Administrative Staff" },
  Administrative: { ar: "موظف إداري", en: "Administrative Staff" },
  OutsideRider: { ar: "مندوب خارجي", en: "External Delegate" },
  SponsoredInternal: { ar: "على الكفالة", en: "Internal Sponsored Employee" },
};

function formatReason(reason: string | null | undefined, locale: "ar" | "en") {
  if (!reason) return null;
  const cleaned = reason.trim().replace(/^[.\s]+|[.\s]+$/g, "");
  const reasonMap: Record<string, { ar: string; en: string }> = {
    "Employee record created": { ar: "تم إنشاء سجل الموظف", en: "Employee record created" },
    "Employee status updated": { ar: "تم تحديث حالة الموظف", en: "Employee status updated" },
    "Employee role updated": { ar: "تم تحديث دور الموظف", en: "Employee role updated" },
    "Employee relationship updated": { ar: "تم تحديث علاقة الموظف", en: "Employee relationship updated" },
    "Employee updated": { ar: "تم تحديث بيانات الموظف", en: "Employee updated" },
    "Initial creation": { ar: "إنشاء أولي", en: "Initial creation" },
    "Archived via edit form": { ar: "أرشفة عبر نموذج التعديل", en: "Archived via edit form" },
  };
  if (reasonMap[cleaned]) {
    return locale === "en" ? reasonMap[cleaned].en : reasonMap[cleaned].ar;
  }
  return reason;
}

const statusLabels: Record<string, { ar: string; en: string }> = {
  Draft: { ar: "مسودة", en: "Draft" },
  Onboarding: { ar: "قيد التهيئة", en: "Onboarding" },
  Active: { ar: "نشط", en: "Active" },
  Suspended: { ar: "موقوف", en: "Suspended" },
  OnLeave: { ar: "في إجازة", en: "On Leave" },
  Terminated: { ar: "منتهي الخدمة", en: "Terminated" },
  Archived: { ar: "مؤرشف", en: "Archived" },
  Fleeing: { ar: "هروب / انقطاع", en: "Fleeing" },
  Accident: { ar: "حادث", en: "Accident" },
  Sick: { ar: "إجازة مرضية", en: "Sick" },
  Inactive: { ar: "غير نشط", en: "Inactive" },
};

type StatusTheme = {
  headerBg: string;
  badgeClass: string;
};

const statusThemes: Record<string, StatusTheme> = {
  Active: {
    headerBg: "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700",
    badgeClass: "bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-sm font-black",
  },
  Fleeing: {
    headerBg: "bg-gradient-to-r from-rose-800 via-red-700 to-rose-900",
    badgeClass: "bg-rose-100 text-rose-950 border border-rose-300 shadow-sm font-black animate-pulse",
  },
  Suspended: {
    headerBg: "bg-gradient-to-r from-amber-700 via-orange-600 to-amber-800",
    badgeClass: "bg-amber-100 text-amber-950 border border-amber-300 shadow-sm font-black",
  },
  Accident: {
    headerBg: "bg-gradient-to-r from-red-700 via-rose-700 to-orange-800",
    badgeClass: "bg-red-100 text-red-950 border border-red-300 shadow-sm font-black",
  },
  Sick: {
    headerBg: "bg-gradient-to-r from-yellow-600 via-amber-600 to-yellow-700",
    badgeClass: "bg-yellow-100 text-yellow-950 border border-yellow-300 shadow-sm font-black",
  },
  OnLeave: {
    headerBg: "bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800",
    badgeClass: "bg-indigo-100 text-indigo-950 border border-indigo-300 shadow-sm font-black",
  },
  Onboarding: {
    headerBg: "bg-gradient-to-r from-cyan-700 via-blue-600 to-cyan-800",
    badgeClass: "bg-cyan-100 text-cyan-950 border border-cyan-300 shadow-sm font-black",
  },
  Draft: {
    headerBg: "bg-gradient-to-r from-blue-700 via-slate-600 to-blue-800",
    badgeClass: "bg-blue-100 text-blue-950 border border-blue-300 shadow-sm font-black",
  },
  Terminated: {
    headerBg: "bg-gradient-to-r from-slate-700 via-gray-800 to-slate-900",
    badgeClass: "bg-slate-200 text-slate-950 border border-slate-400 shadow-sm font-black",
  },
  Archived: {
    headerBg: "bg-gradient-to-r from-zinc-700 via-neutral-800 to-zinc-900",
    badgeClass: "bg-gray-200 text-gray-950 border border-gray-400 shadow-sm font-black",
  },
};

const defaultStatusTheme: StatusTheme = {
  headerBg: "bg-gradient-to-r from-[#1167c9] to-blue-800",
  badgeClass: "bg-white/20 text-white border border-white/30 font-bold",
};

function formatDate(value: string | null | undefined, locale: "ar" | "en" = "ar") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-arab" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function Timeline({
  title,
  entries,
  locale = "ar",
}: {
  title: string;
  entries: Period[] | OperationalAssignment[];
  locale?: "ar" | "en";
}) {
  return (
    <Card className="p-5">
      <h2 className="font-black">{title}</h2>
      {entries.length ? (
        <ol className={`mt-4 space-y-3 border-s border-[var(--border)] ${locale === "en" ? "ps-4" : "ps-4"}`}>
          {entries.map((entry) => {
            const entryRec = entry as Record<string, unknown>;
            const detail =
              "value" in entry
                ? entry.value
                : locale === "en"
                  ? (entryRec.operationalWorkTypeEn as string | undefined) || entry.operationalWorkTypeAr
                  : entry.operationalWorkTypeAr;
            return (
              <li key={entry.id} className="relative text-sm">
                <span className={`absolute top-1.5 size-2 rounded-full bg-[#1167c9] ${locale === "en" ? "-left-[1.05rem]" : "-right-[1.05rem]"}`} />
                <p className="font-bold">{detail || (locale === "en" ? "Operational Assignment" : "تكليف تشغيلي")}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {locale === "en"
                    ? `From ${formatDate(entry.effectiveFrom, locale)}${entry.effectiveTo ? ` to ${formatDate(entry.effectiveTo, locale)}` : " — Ongoing"}`
                    : `من ${formatDate(entry.effectiveFrom, locale)}${entry.effectiveTo ? ` إلى ${formatDate(entry.effectiveTo, locale)}` : " — مستمر"}`}
                </p>
                {entry.reason ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {formatReason(entry.reason, locale)}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-[var(--muted)]">
          {locale === "en" ? "No history entries yet." : "لا توجد سجلات حتى الآن."}
        </p>
      )}
    </Card>
  );
}

export default function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const isEn = locale === "en";
  const canManageHousing = can("housing.manage");

  const [employeeId, setEmployeeId] = useState<string>();
  const [details, setDetails] = useState<EmployeeDetails>();
  const [cities, setCities] = useState<HrRow[]>([]);
  const [error, setError] = useState("");
  const [activeModalTab, setActiveModalTab] = useState<"docs" | "insurance" | null>(null);
  const [openRiderHistoryModal, setOpenRiderHistoryModal] = useState(false);

  // Housing Assignment Modal State
  const [openHousingModal, setOpenHousingModal] = useState(false);
  const [housings, setHousings] = useState<Housing[]>([]);
  const [loadingHousings, setLoadingHousings] = useState(false);
  const [selectedHousingId, setSelectedHousingId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);
  const [moveInReason, setMoveInReason] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [capacityOverrideUsed, setCapacityOverrideUsed] = useState(false);
  const [capacityOverrideReason, setCapacityOverrideReason] = useState("");
  const [housingBusy, setHousingBusy] = useState(false);
  const [housingError, setHousingError] = useState("");

  const handleOpenHousingModal = async () => {
    setHousingError("");
    setOpenHousingModal(true);
    setSelectedHousingId(details?.housing?.id || "");
    setEffectiveFrom(new Date().toISOString().split("T")[0]);
    setMoveInReason("");
    setSourceReference("");
    setCapacityOverrideUsed(false);
    setCapacityOverrideReason("");
    setLoadingHousings(true);
    try {
      const data = await listHousing();
      setHousings(data || []);
    } catch {
      toast.error(isEn ? "Failed to load housing list" : "تعذر تحميل قائمة السكنات");
    } finally {
      setLoadingHousings(false);
    }
  };

  const handleAssignHousing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details?.employee) return;
    if (!selectedHousingId) {
      setHousingError(isEn ? "Please select a housing unit" : "يرجى اختيار وحدة السكن");
      return;
    }
    if (!effectiveFrom) {
      setHousingError(isEn ? "Effective date is required" : "تاريخ البداية مطلوب");
      return;
    }
    if (capacityOverrideUsed && !capacityOverrideReason.trim()) {
      setHousingError(
        isEn
          ? "Override reason is required when capacity override is used"
          : "سبب التجاوز مطلوب عند استخدام تجاوز السعة",
      );
      return;
    }

    setHousingError("");
    setHousingBusy(true);

    try {
      const payload: AssignResidentPayload = {
        employeeId: details.employee.id,
        effectiveFrom,
        moveInReason: moveInReason.trim() || null,
        sourceReference: sourceReference.trim() || null,
        capacityOverrideUsed,
        capacityOverrideReason: capacityOverrideUsed ? capacityOverrideReason.trim() : null,
      };

      await assignResident(selectedHousingId, payload);
      toast.success(
        isEn ? "Housing Assigned" : "تم تسكين الموظف",
        isEn
          ? "Employee assigned to housing unit successfully."
          : "تم تسكين الموظف في وحدة السكن بنجاح.",
      );
      setOpenHousingModal(false);
      setSelectedHousingId("");
      setMoveInReason("");
      setSourceReference("");
      setCapacityOverrideUsed(false);
      setCapacityOverrideReason("");

      if (employeeId) {
        const updated = await getEmployee(employeeId);
        setDetails(updated);
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isEn
          ? "Failed to assign resident"
          : "تعذر إسناد الساكن";
      if (msg.includes("capacity_exceeded") || msg.toLowerCase().includes("capacity")) {
        setCapacityOverrideUsed(true);
      }
      setHousingError(msg);
    } finally {
      setHousingBusy(false);
    }
  };

  const housingOptions: SelectOption[] = useMemo(
    () =>
      housings
        .filter((h) => h.status !== "Archived" && !h.isDeleted)
        .map((h) => {
          const isCurrent = details?.housing?.id === h.id;
          const capInfo = `${isEn ? "Available" : "الشاغر"}: ${h.availableCapacity} / ${h.totalCapacity}`;
          return {
            value: h.id,
            label: `${isEn ? h.nameEn || h.nameAr : h.nameAr} (${h.code})`,
            sublabel: `${h.cityAr || ""} · ${capInfo}${isCurrent ? (isEn ? " (Current)" : " (السكن الحالي)") : ""}`,
            keywords: `${h.nameAr} ${h.nameEn || ""} ${h.code} ${h.cityAr || ""}`,
          };
        }),
    [housings, details?.housing?.id, isEn],
  );

  useEffect(() => {
    void params.then(({ employeeId: id }) => setEmployeeId(id));
  }, [params]);

  useEffect(() => {
    hrCatalogApi
      .list("operating-cities")
      .then(setCities)
      .catch(() => []);
  }, []);

  useEffect(() => {
    if (!employeeId) return;
    setError("");
    void getEmployee(employeeId)
      .then(setDetails)
      .catch(() =>
        setError(
          locale === "en"
            ? "Unable to load employee profile or insufficient permissions."
            : "تعذر تحميل ملف الموظف أو لا تملك صلاحيةعرضه.",
        ),
      );
  }, [employeeId, locale]);

  const statusEntries = useMemo(() => {
    if (!details) return [];
    if (details.statusHistory && details.statusHistory.length > 0) {
      return [...details.statusHistory].sort(
        (a, b) =>
          new Date(b.effectiveFrom || (b as any).effectiveDate || (b as any).createdAtUtc || 0).getTime() -
          new Date(a.effectiveFrom || (a as any).effectiveDate || (a as any).createdAtUtc || 0).getTime() ||
          new Date((b as any).createdAtUtc || 0).getTime() -
          new Date((a as any).createdAtUtc || 0).getTime(),
      );
    }
    const filtered = (details.workHistory ?? []).filter(
      (w) => w.changeType === "Status",
    );
    const sorted = [...filtered].sort(
      (a, b) =>
        new Date(a.effectiveDate || a.createdAtUtc).getTime() -
        new Date(b.effectiveDate || b.createdAtUtc).getTime() ||
        new Date(a.createdAtUtc).getTime() -
        new Date(b.createdAtUtc).getTime(),
    );
    const mapped = sorted.map((w, idx) => {
      const valText =
        w.newValue && statusLabels[w.newValue]
          ? locale === "en"
            ? statusLabels[w.newValue].en
            : statusLabels[w.newValue].ar
          : w.newValue || "";
      const effectiveFrom = w.effectiveDate || w.createdAtUtc;
      const nextEntry = sorted[idx + 1];
      const effectiveTo = nextEntry
        ? nextEntry.effectiveDate || nextEntry.createdAtUtc
        : null;
      return {
        id: w.id,
        value: valText,
        effectiveFrom,
        effectiveTo,
        reason: w.reason,
        changedByUserId: w.changedByUserId,
      };
    });
    return mapped.reverse();
  }, [details, locale]);

  const roleEntries = useMemo(() => {
    if (!details) return [];
    const filtered = (details.workHistory ?? []).filter(
      (w) => w.changeType === "Role",
    );
    const sorted = [...filtered].sort(
      (a, b) =>
        new Date(a.effectiveDate || a.createdAtUtc).getTime() -
        new Date(b.effectiveDate || b.createdAtUtc).getTime() ||
        new Date(a.createdAtUtc).getTime() -
        new Date(b.createdAtUtc).getTime(),
    );
    const mapped = sorted.map((w, idx) => {
      const valStr = w.newValue ?? "";
      const roleObj = roleLabels[valStr];
      const valText = roleObj
        ? locale === "en"
          ? roleObj.en
          : roleObj.ar
        : valStr === "Rider"
        ? locale === "en"
          ? "Rider"
          : "مندوب"
        : valStr;
      const effectiveFrom = w.effectiveDate || w.createdAtUtc;
      const nextEntry = sorted[idx + 1];
      const effectiveTo = nextEntry
        ? nextEntry.effectiveDate || nextEntry.createdAtUtc
        : null;
      return {
        id: w.id,
        value: valText,
        effectiveFrom,
        effectiveTo,
        reason: w.reason,
        changedByUserId: w.changedByUserId,
      };
    });
    return mapped.reverse();
  }, [details, locale]);

  const relationshipEntries = useMemo(() => {
    if (!details) return [];
    if (details.relationshipHistory && details.relationshipHistory.length > 0) {
      return [...details.relationshipHistory].sort(
        (a, b) =>
          new Date(b.effectiveFrom || (b as any).effectiveDate || (b as any).createdAtUtc || 0).getTime() -
          new Date(a.effectiveFrom || (a as any).effectiveDate || (a as any).createdAtUtc || 0).getTime() ||
          new Date((b as any).createdAtUtc || 0).getTime() -
          new Date((a as any).createdAtUtc || 0).getTime(),
      );
    }
    const filtered = (details.workHistory ?? []).filter(
      (w) => w.changeType === "Engagement" || w.changeType === "Relationship",
    );
    const sorted = [...filtered].sort(
      (a, b) =>
        new Date(a.effectiveDate || a.createdAtUtc).getTime() -
        new Date(b.effectiveDate || b.createdAtUtc).getTime() ||
        new Date(a.createdAtUtc).getTime() -
        new Date(b.createdAtUtc).getTime(),
    );
    const mapped = sorted.map((w, idx) => {
      const valText =
        w.newValue && relationshipLabels[w.newValue]
          ? locale === "en"
            ? relationshipLabels[w.newValue].en
            : relationshipLabels[w.newValue].ar
          : w.newValue || "—";
      const effectiveFrom = w.effectiveDate || w.createdAtUtc;
      const nextEntry = sorted[idx + 1];
      const effectiveTo = nextEntry
        ? nextEntry.effectiveDate || nextEntry.createdAtUtc
        : null;
      return {
        id: w.id,
        value: valText,
        effectiveFrom,
        effectiveTo,
        reason: w.reason,
        changedByUserId: w.changedByUserId || "",
      };
    });
    return mapped.reverse();
  }, [details, locale]);

  const assignmentEntries = useMemo(() => {
    if (!details) return [];
    if (
      details.operationalAssignmentHistory &&
      details.operationalAssignmentHistory.length > 0
    ) {
      return details.operationalAssignmentHistory;
    }
    const filtered = (details.workHistory ?? []).filter(
      (w) =>
        w.changeType === "OperationalAssignment" ||
        w.changeType === "WorkType" ||
        w.changeType === "Assignment",
    );
    return filtered.map((w) => ({
      id: w.id,
      jobTitleId: "",
      jobTitleAr: w.newValue || "",
      operationalWorkTypeId: "",
      operationalWorkTypeAr: w.newValue || "",
      operatingCityId: "",
      operatingCityAr: "",
      effectiveFrom: w.effectiveDate || w.createdAtUtc,
      effectiveTo: null,
      reason: w.reason,
    }));
  }, [details]);

  const BackIcon = locale === "en" ? ArrowLeft : ArrowRight;

  if (error) {
    return (
      <div className="p-6">
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      </div>
    );
  }

  if (!details) {
    return (
      <p className="py-12 text-center text-sm text-[var(--muted)]">
        {t("common.loading")}
      </p>
    );
  }

  const { employee, rider } = details;

  const isActive = employee.status === "Active";
  const displayName =
    locale === "en"
      ? employee.fullNameEn || employee.fullNameAr
      : employee.fullNameAr || employee.fullNameEn;
  const secondaryName =
    locale === "en"
      ? employee.fullNameEn ? employee.fullNameAr : null
      : employee.fullNameAr ? employee.fullNameEn : null;

  const relKey = employee.engagementType || employee.relationshipType;
  const relObj = relationshipLabels[relKey ?? ""];
  const relText = relObj ? (locale === "en" ? relObj.en : relObj.ar) : (relKey ?? "—");

  const stObj = statusLabels[employee.status];
  const stText = stObj ? (locale === "en" ? stObj.en : stObj.ar) : employee.status;

  const riderStObj = rider ? statusLabels[rider.status] : null;
  const riderStText = riderStObj ? (locale === "en" ? riderStObj.en : riderStObj.ar) : rider?.status;

  const empRec = employee as Record<string, unknown>;
  const riderRec = rider as Record<string, unknown> | null;

  const cityFromCatalog = cities.find(
    (c) =>
      c.id === empRec.operatingCityId ||
      c.id === empRec.cityId ||
      c.globalCityId === empRec.operatingCityId,
  );

  const operatingCity =
    locale === "en"
      ? (empRec.operatingCityEn as string | undefined) ??
      (cityFromCatalog?.globalCityEn as string | undefined) ??
      (cityFromCatalog?.cityNameEn as string | undefined) ??
      cityFromCatalog?.nameEn ??
      employee.operatingCityAr ??
      (cityFromCatalog?.globalCityAr as string | undefined) ??
      "Unspecified"
      : employee.operatingCityAr ??
      (cityFromCatalog?.globalCityAr as string | undefined) ??
      (cityFromCatalog?.cityNameAr as string | undefined) ??
      cityFromCatalog?.nameAr ??
      (empRec.operatingCityEn as string | undefined) ??
      "غير محددة";

  const preferredCity = rider
    ? locale === "en"
      ? (riderRec?.preferredCityEn as string | undefined) ?? rider.preferredCityAr ?? "Unspecified"
      : rider.preferredCityAr ?? "غير محددة"
    : null;

  const phoneNumber =
    employee.primaryPhone ??
    (empRec.secondaryPhone as string) ??
    (empRec.emergencyContactPhone as string) ??
    (empRec.phone as string) ??
    "—";

  const nationality =
    (empRec.nationalityAr as string) ??
    employee.nationality ??
    employee.nationalityCountryCode ??
    "—";

  const rawHireDate =
    employee.hireDate ??
    (empRec.contractStartDate as string) ??
    (empRec.createdAt as string) ??
    rider?.riderStartDate;

  const empNumDisplay =
    employee.employeeNumber ||
    (employee.iqamaNo
      ? `${locale === "en" ? "Iqama" : "رقم الهوية/الإقامة"}: ${employee.iqamaNo}`
      : `${locale === "en" ? "ID" : "المعرف"}: ${employee.id.slice(0, 8)}`);

  const workAssignment =
    locale === "en"
      ? (empRec.operationalWorkTypeEn as string | undefined) ??
      (empRec.jobTitleEn as string | undefined) ??
      employee.operationalWorkTypeAr ??
      employee.jobTitleAr ??
      "No current assignment"
      : employee.operationalWorkTypeAr ??
      employee.jobTitleAr ??
      "لا يوجد تكليف حالي";

  const housing = details.housing;
  const housingName = housing
    ? (locale === "en" ? housing.nameEn || housing.nameAr : housing.nameAr || housing.nameEn)
    : (locale === "en" ? "Not Housed" : "غير مسكن");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/dashboard/employees"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-[#1167c9]"
          >
            <BackIcon size={17} />
            {locale === "en" ? "Back to Employees" : "العودة إلى الموظفين"}
          </Link>
          <p className="mt-3 text-sm font-bold text-[#1167c9]">
            {t("employees.employeeDetails")}
          </p>
          <h1 className="mt-1 text-3xl font-black">{displayName}</h1>
          {secondaryName ? (
            <p className="mt-1 text-sm text-[var(--muted)]" dir="auto">
              {secondaryName}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/employees/${employee.id}/edit`}>
            <Button variant="secondary">
              <Pencil size={17} />
              {locale === "en" ? "Edit Data" : "تعديل البيانات"}
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => setActiveModalTab("docs")}>
            <FileText size={17} />
            {locale === "en" ? "Documents" : "الوثائق"}
          </Button>
          <Button variant="secondary" onClick={() => setActiveModalTab("insurance")}>
            <ShieldCheck size={17} />
            {locale === "en" ? "Medical Insurance" : "التأمين الطبي"}
          </Button>
          {canManageHousing && (
            <Button variant="secondary" onClick={handleOpenHousingModal}>
              <Building size={17} />
              {housing
                ? locale === "en"
                  ? "Change Housing"
                  : "تغيير السكن"
                : locale === "en"
                ? "Assign Housing"
                : "تسكين بالسكن"}
            </Button>
          )}
          {can("platform_assignments.read") && (
            <Button variant="secondary" onClick={() => setOpenRiderHistoryModal(true)}>
              <History size={17} />
              {locale === "en" ? "Rider Platform History" : "سجل تشغيل المنصات"}
            </Button>
          )}
          <Link href={`/dashboard/employees/${employee.id}/actions`}>
            <Button>{locale === "en" ? "Employee Actions" : "إجراءات الموظف"}</Button>
          </Link>
        </div>
      </div>

      {(() => {
        const currentTheme = statusThemes[employee.status] || defaultStatusTheme;
        return (
          <Card className="overflow-hidden">
            <div className={`flex flex-wrap items-center justify-between gap-4 p-5 text-white sm:p-7 transition-colors duration-300 ${currentTheme.headerBg}`}>
              <div className="flex items-center gap-4">
                <span className="grid size-14 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm shadow-inner">
                  <UserRound size={28} />
                </span>
                <div>
                  <p className="text-lg font-black">{empNumDisplay}</p>
                  <p className="mt-1 text-sm text-white/80">{relText}</p>
                </div>
              </div>
              <span
                className={`rounded-full px-4 py-1.5 text-sm font-extrabold shadow-sm ${currentTheme.badgeClass}`}
              >
                {stText}
              </span>
            </div>
            <dl className="grid gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-6">
              {([
                { label: locale === "en" ? "Phone Number" : "رقم الجوال", value: String(phoneNumber ?? "—"), dir: undefined },
                { label: locale === "en" ? "Nationality" : "الجنسية", value: String(nationality ?? "—"), dir: undefined },
                { label: locale === "en" ? "IBAN" : "رقم الآيبان", value: String(employee.iban || "—"), dir: "ltr" as const },
                { label: locale === "en" ? "Hire Date" : "تاريخ التعيين", value: formatDate(rawHireDate, locale), dir: undefined },
                { label: locale === "en" ? "Operating City" : "المدينة", value: String(operatingCity ?? "—"), dir: undefined },
                { label: locale === "en" ? "Housing" : "السكن", value: String(housingName), dir: undefined },
              ]).map(({ label, value, dir }) => (
                <div key={label} className="bg-[var(--surface)] p-4">
                  <dt className="text-xs font-bold text-[var(--muted)]">{label}</dt>
                  <dd className={`mt-1 text-sm font-bold ${dir === "ltr" ? "font-mono" : ""}`} dir={dir}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        );
      })()}

      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2 border-b pb-3 mb-3">
            <h2 className="flex items-center gap-2 font-black">
              <Building size={18} className="text-[#1167c9]" />
              {locale === "en" ? "Housing Residence" : "السكن الحالي"}
            </h2>
            {canManageHousing && (
              <Button
                variant="secondary"
                onClick={handleOpenHousingModal}
                className="h-8 min-h-0 px-2.5 text-xs gap-1.5"
              >
                {housing ? (
                  <>
                    <Pencil size={13} />
                    {locale === "en" ? "Change Housing" : "تغيير السكن"}
                  </>
                ) : (
                  <>
                    <Plus size={13} />
                    {locale === "en" ? "Assign Housing" : "تسكين الموظف"}
                  </>
                )}
              </Button>
            )}
          </div>
          {housing ? (
            <div className="space-y-1.5">
              <Link
                href={`/dashboard/housing/${housing.id}`}
                className="block text-sm font-extrabold text-[#1167c9] hover:underline"
              >
                {locale === "en" ? housing.nameEn || housing.nameAr : housing.nameAr || housing.nameEn}
              </Link>
              {(housing.code || housing.cityAr) && (
                <p className="text-xs font-mono font-medium text-[var(--muted)]">
                  {[housing.code, housing.cityAr].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[var(--muted)] font-medium">
                {locale === "en"
                  ? "Not currently housed in any housing unit."
                  : "غير مسكن حالياً في أي وحدة سكنية."}
              </p>
              {canManageHousing && (
                <Button
                  onClick={handleOpenHousingModal}
                  className="w-full h-9 text-xs gap-1.5 bg-[#1167c9] hover:bg-blue-700 text-white font-bold"
                >
                  <Plus size={15} />
                  {locale === "en" ? "Assign to Housing Unit" : "تسكين الموظف في وحدة سكنية"}
                </Button>
              )}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-black">
            <ContactRound size={18} />
            {locale === "en" ? "Rider Profile" : "ملف المندوب"}
          </h2>
          {rider ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-xs text-[var(--muted)]">{t("common.status")}</dt>
                <dd className="font-bold">{riderStText}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-xs text-[var(--muted)]">
                  {locale === "en" ? "Preferred City" : "مدينة التفضيل"}
                </dt>
                <dd className="font-bold">{preferredCity}</dd>
              </div>
              {rider.nationality && (
                <div className="flex justify-between">
                  <dt className="text-xs text-[var(--muted)]">
                    {locale === "en" ? "Nationality" : "الجنسية"}
                  </dt>
                  <dd className="font-bold">{rider.nationality}</dd>
                </div>
              )}
              {rider.iban && (
                <div className="flex justify-between">
                  <dt className="text-xs text-[var(--muted)]">
                    {locale === "en" ? "IBAN" : "الآيبان"}
                  </dt>
                  <dd className="font-bold font-mono text-xs" dir="ltr">{rider.iban}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-xs text-[var(--muted)]">
                  {locale === "en" ? "Start Date" : "بداية الملف"}
                </dt>
                <dd className="font-bold">
                  {formatDate(rider.riderStartDate, locale)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">
              {locale === "en"
                ? "No rider profile associated with this employee."
                : "لا يوجد ملف رايدر مرتبط بهذا الموظف."}
            </p>
          )}
          {can("platform_assignments.read") && (
            <div className="mt-4 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setOpenRiderHistoryModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1167c9] hover:underline"
              >
                <History size={14} />
                {locale === "en" ? "View Full Platform History" : "عرض سجل تشغيل المنصات"}
              </button>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-black">
            <BriefcaseBusiness size={18} />
            {locale === "en" ? "Operational Work" : "العمل التشغيلي"}
          </h2>
          <p className="mt-4 text-sm font-bold">{workAssignment}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{String(operatingCity ?? "")}</p>
        </Card>
      </div>

      <EmployeePlatformAccounts
        employeeId={employee.id}
        riderProfileId={rider?.id ?? null}
        onOpenHistoryModal={() => setOpenRiderHistoryModal(true)}
      />

      <EmployeeComplianceTabs
        employeeId={employee.id}
        riderProfileId={rider?.id ?? null}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Timeline
          title={locale === "en" ? "Status History" : "سجل الحالة"}
          entries={statusEntries}
          locale={locale}
        />
        <Timeline
          title={locale === "en" ? "Role History" : "سجل الأدوار الوظيفية"}
          entries={roleEntries}
          locale={locale}
        />
        <Timeline
          title={locale === "en" ? "Operational Assignment History" : "سجل التكليفات التشغيلية"}
          entries={assignmentEntries}
          locale={locale}
        />
        <Timeline
          title={locale === "en" ? "Relationship History" : "سجل العلاقة"}
          entries={relationshipEntries}
          locale={locale}
        />
      </div>

      {activeModalTab && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setActiveModalTab(null)}
        >
          <div
            className="relative flex flex-col max-h-[90vh] w-full max-w-5xl rounded-2xl bg-[var(--surface)] p-6 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between border-b pb-3 gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModalTab("docs")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    activeModalTab === "docs"
                      ? "bg-[#1167c9] text-white shadow-md"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <FileText size={18} />
                  {locale === "en" ? "Documents" : "الوثائق"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab("insurance")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    activeModalTab === "insurance"
                      ? "bg-[#1167c9] text-white shadow-md"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <ShieldCheck size={18} />
                  {locale === "en" ? "Medical Insurance" : "التأمين الطبي"}
                </button>
              </div>
              <button
                onClick={() => setActiveModalTab(null)}
                className="grid h-8 w-8 place-items-center rounded-lg border hover:bg-slate-100 transition-colors"
                aria-label={locale === "en" ? "Close" : "إغلاق"}
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1">
              <EmployeeDocumentsInsurance
                employeeId={employee.id}
                riderProfileId={rider?.id ?? null}
                activeTab={activeModalTab}
              />
            </div>
          </div>
        </div>
      )}

      {openHousingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={() => setOpenHousingModal(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-[var(--surface)] p-6 shadow-2xl border border-[var(--border)] space-y-5 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#1167c9]">
                  <Building size={20} />
                </span>
                <div>
                  <h3 className="font-extrabold text-lg">
                    {housing
                      ? isEn
                        ? "Change Housing Assignment"
                        : "تغيير وحدة السكن"
                      : isEn
                      ? "Assign Employee to Housing"
                      : "تسكين الموظف في وحدة سكنية"}
                  </h3>
                  <p className="text-xs text-[var(--muted)] font-medium">{displayName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenHousingModal(false)}
                className="grid h-8 w-8 place-items-center rounded-lg border text-[var(--muted)] hover:bg-slate-100 transition-colors"
                aria-label={isEn ? "Close" : "إغلاق"}
              >
                <X size={18} />
              </button>
            </div>

            {housingError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-200">
                <AlertCircle size={16} className="shrink-0" />
                <span>{housingError}</span>
              </div>
            )}

            <form onSubmit={handleAssignHousing} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[var(--foreground)]">
                  {isEn ? "Select Housing Unit" : "اختر وحدة السكن"} <span className="text-rose-500">*</span>
                </label>
                {loadingHousings ? (
                  <div className="h-11 rounded-xl border bg-slate-50 flex items-center justify-center text-xs text-[var(--muted)] animate-pulse">
                    {isEn ? "Loading housing units..." : "جاري تحميل وحدات السكن..."}
                  </div>
                ) : (
                  <SearchableSelect
                    options={housingOptions}
                    value={selectedHousingId}
                    onChange={(val) => {
                      setSelectedHousingId(val);
                      const target = housings.find((h) => h.id === val);
                      if (target && target.availableCapacity <= 0) {
                        setCapacityOverrideUsed(true);
                      }
                    }}
                    placeholder={isEn ? "Choose housing..." : "اختر وحدة السكن..."}
                    searchPlaceholder={isEn ? "Search housing units..." : "ابحث في وحدات السكن..."}
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-[var(--foreground)]">
                  {isEn ? "Effective Start Date" : "تاريخ بداية التسكين"} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium transition-all focus:border-[#1167c9] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-[var(--foreground)]">
                  {isEn ? "Reason / Notes" : "سبب التسكين / ملاحظات"}
                </label>
                <input
                  type="text"
                  value={moveInReason}
                  onChange={(e) => setMoveInReason(e.target.value)}
                  placeholder={isEn ? "Optional move-in reason" : "سبب اختياري لنقل أو تسكين الموظف"}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium transition-all focus:border-[#1167c9] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-[var(--foreground)]">
                  {isEn ? "Source Reference" : "المرجع / المصدر"}
                </label>
                <input
                  type="text"
                  value={sourceReference}
                  onChange={(e) => setSourceReference(e.target.value)}
                  placeholder={isEn ? "Optional reference ID or document no." : "رقم مرجعي اختياري أو رقم العقد"}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium transition-all focus:border-[#1167c9] outline-none"
                />
              </div>

              {/* Capacity Override Section */}
              <div className="rounded-xl border p-3 bg-slate-50/50 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold select-none">
                  <input
                    type="checkbox"
                    checked={capacityOverrideUsed}
                    onChange={(e) => setCapacityOverrideUsed(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#1167c9] focus:ring-[#1167c9]"
                  />
                  <span>{isEn ? "Override Housing Capacity" : "تجاوز السعة الاستيعابية للسكن"}</span>
                </label>

                {capacityOverrideUsed && (
                  <div>
                    <label className="block text-[11px] font-bold mb-1 text-slate-600">
                      {isEn ? "Override Reason" : "سبب تجاوز السعة"} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={capacityOverrideReason}
                      onChange={(e) => setCapacityOverrideReason(e.target.value)}
                      placeholder={isEn ? "Reason for exceeding housing capacity..." : "سبب السماح بتجاوز سعة السكن..."}
                      className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium focus:border-[#1167c9] outline-none"
                      required={capacityOverrideUsed}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpenHousingModal(false)}
                  disabled={housingBusy}
                >
                  {isEn ? "Cancel" : "إلغاء"}
                </Button>
                <Button type="submit" disabled={housingBusy || loadingHousings}>
                  {housingBusy
                    ? isEn
                      ? "Saving..."
                      : "جاري التسكين..."
                    : isEn
                    ? "Confirm Assignment"
                    : "تأكيد التسكين"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rider Platform History Modal Popup */}
      <EmployeeRiderHistoryModal
        isOpen={openRiderHistoryModal}
        onClose={() => setOpenRiderHistoryModal(false)}
        employeeId={employee.id}
        riderProfileId={rider?.id ?? employee.riderProfileId ?? null}
        riderName={displayName || undefined}
      />
    </div>
  );
}
