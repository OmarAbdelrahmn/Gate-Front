import { redirect } from "next/navigation";

export default async function HrCatchAllPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug = [] } = await params;
  const sParams = await searchParams;

  // Convert /hr/leave-requests/:id -> /admin/hr/leave-requests?id=:id
  if (slug[0] === "leave-requests") {
    if (slug[1]) {
      redirect(`/admin/hr/leave-requests?id=${encodeURIComponent(slug[1])}`);
    }
    redirect(`/admin/hr/leave-requests`);
  }

  // Convert /hr/absences/:id -> /admin/hr/absences?id=:id
  if (slug[0] === "absences") {
    if (slug[1]) {
      redirect(`/admin/hr/absences?id=${encodeURIComponent(slug[1])}`);
    }
    redirect(`/admin/hr/absences`);
  }

  // General fallback: redirect to /admin/hr/...
  const queryString = new URLSearchParams(sParams as Record<string, string>).toString();
  const targetPath = `/admin/hr/${slug.join("/")}${queryString ? `?${queryString}` : ""}`;
  redirect(targetPath);
}
