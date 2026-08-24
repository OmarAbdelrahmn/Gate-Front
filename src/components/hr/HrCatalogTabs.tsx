"use client";
import { useState } from "react";
import {
  BriefcaseBusiness,
  ClipboardList,
  ContactRound,
  IdCard,
} from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { translate } from "../../lib/i18n";
import { HrSectionManager } from "./HrSectionManager";

const tabs = [
  {
    key: "job-titles",
    labelAr: "المسميات الوظيفية",
    labelEn: "Job Titles",
    permission: "employees.read",
    icon: BriefcaseBusiness,
  },
  {
    key: "operational-work-types",
    labelAr: "أنواع الأعمال التشغيلية",
    labelEn: "Operational Work Types",
    permission: "employees.read",
    icon: ContactRound,
  },
  {
    key: "residency-professions",
    labelAr: "مهن الإقامة",
    labelEn: "Residency Professions",
    permission: "residency.read",
    icon: ClipboardList,
  },
  {
    key: "driver-license-categories",
    labelAr: "فئات رخص القيادة",
    labelEn: "Driver License Categories",
    permission: "licenses.read",
    icon: IdCard,
  },
] as const;
export type EmployeeCatalogTab = (typeof tabs)[number]["key"];

export function HrCatalogTabs({
  initialTab = "job-titles",
}: {
  initialTab?: EmployeeCatalogTab;
}) {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const available = tabs.filter((tab) => can(tab.permission));
  const fallback = available.some((tab) => tab.key === initialTab)
    ? initialTab
    : available[0]?.key;
  const [active, setActive] = useState<EmployeeCatalogTab | undefined>(
    fallback,
  );

  if (!active)
    return (
      <p
        role="alert"
        className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 font-medium"
      >
        {locale === "en"
          ? "You do not have permission to view employee catalogs."
          : "لا تملك صلاحية عرض كتالوجات الموظفين."}
      </p>
    );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold text-[#1167c9]">{t("nav.hrManagement")}</p>
        <h1 className="mt-1 text-3xl font-black">
          {locale === "en" ? "Employee Catalogs" : "كتالوجات الموظفين"}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {locale === "en"
            ? "Manage professions, job titles, work types, and license categories from one place."
            : "إدارة المهن والمسميات وأنواع العمل وفئات الرخص من مكان واحد."}
        </p>
      </header>
      <div
        role="tablist"
        aria-label={locale === "en" ? "Employee Catalogs" : "كتالوجات الموظفين"}
        className="flex gap-2 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2"
      >
        {available.map((tab) => {
          const Icon = tab.icon,
            selected = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(tab.key)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold ${selected ? "bg-[#1167c9] text-white shadow-sm" : "text-[var(--muted)] hover:bg-blue-50 hover:text-[#1167c9]"}`}
            >
              <Icon size={17} />
              {locale === "en" ? tab.labelEn : tab.labelAr}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">
        <HrSectionManager key={active} sectionKey={active} embedded />
      </div>
    </div>
  );
}
