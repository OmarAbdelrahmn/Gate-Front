import { redirect } from "next/navigation";

export default function MaintenanceWorkshopsPage() {
  redirect("/admin/maintenance/workshops/orders");
}
