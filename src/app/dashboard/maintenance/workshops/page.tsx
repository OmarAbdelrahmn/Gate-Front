import { redirect } from "next/navigation";

export default function MaintenanceWorkshopsPage() {
  redirect("/dashboard/maintenance/workshops/orders");
}
