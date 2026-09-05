import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MaintenanceWorkOrdersPage({ searchParams }: PageProps) {
  const params = (await searchParams) || {};
  const tab = typeof params.tab === "string" ? params.tab : undefined;
  const openOilChangeFor = typeof params.openOilChangeFor === "string" ? params.openOilChangeFor : undefined;

  if (tab === "reminders" || openOilChangeFor) {
    const query = openOilChangeFor ? `?openOilChangeFor=${encodeURIComponent(openOilChangeFor)}` : "";
    redirect(`/dashboard/maintenance/work-orders/reminders${query}`);
  }
  redirect("/dashboard/maintenance/work-orders/orders");
}
