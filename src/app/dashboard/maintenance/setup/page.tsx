import { redirect } from "next/navigation";

export default function MaintenanceSetupPage() {
  redirect("/dashboard/maintenance/setup/locations");
}
