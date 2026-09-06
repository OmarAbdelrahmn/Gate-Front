import { redirect } from "next/navigation";

export default function MaintenanceSetupPage() {
  redirect("/admin/maintenance/setup/locations");
}
