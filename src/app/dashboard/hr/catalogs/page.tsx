import {
  HrCatalogTabs,
  type EmployeeCatalogTab,
} from "../../../../components/hr/HrCatalogTabs";
const allowed = new Set<EmployeeCatalogTab>([
  "job-titles",
  "operational-work-types",
  "residency-professions",
  "driver-license-categories",
]);
export default async function EmployeeCatalogsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initial = allowed.has(tab as EmployeeCatalogTab)
    ? (tab as EmployeeCatalogTab)
    : "job-titles";
  return <HrCatalogTabs initialTab={initial} />;
}
