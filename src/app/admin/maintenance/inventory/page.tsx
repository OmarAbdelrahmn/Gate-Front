import { redirect } from "next/navigation";

export default function MaintenanceInventoryPage() {
  redirect("/admin/maintenance/inventory/receipts");
}
