import { redirect } from "next/navigation";

export default function MaintenanceInventoryPage() {
  redirect("/dashboard/maintenance/inventory/receipts");
}
