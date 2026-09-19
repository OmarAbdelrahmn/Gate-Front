import { notFound, redirect } from "next/navigation";
import { HrSectionManager } from "../../../../components/hr/HrSectionManager";
import { LeaveRequestsView } from "../../../../components/hr/LeaveRequestsView";
import { hrSections } from "../../../../lib/hr/config";

export default async function HrSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (["job-titles","operational-work-types","residency-professions","driver-license-categories"].includes(section)) redirect(`/admin/hr/catalogs?tab=${section}`);
  if (!hrSections[section]) notFound();
  if (section === "leave-requests") return <LeaveRequestsView />;
  return <HrSectionManager sectionKey={section} />;
}
