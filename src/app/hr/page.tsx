import { redirect } from "next/navigation";

export default function HrIndexPage() {
  redirect("/admin/hr/leave-requests");
}
