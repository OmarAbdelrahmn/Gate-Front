import { redirect } from "next/navigation";

export default function MaintenancePageRedirect() {
  redirect("/admin/maintenance/dashboard");
}
