import { notFound, redirect } from "next/navigation";
import { HrSectionManager } from "../../../../components/hr/HrSectionManager";
import { hrSections } from "../../../../lib/hr/config";

export default async function HrSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (["job-titles","operational-work-types","residency-professions","driver-license-categories"].includes(section)) redirect(`/dashboard/hr/catalogs?tab=${section}`);
  if (!hrSections[section]) notFound();
  return <HrSectionManager sectionKey={section} />;
}
