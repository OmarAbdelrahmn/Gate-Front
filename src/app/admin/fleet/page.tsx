import { redirect } from "next/navigation";

export default function FleetPageRedirect() {
  redirect("/admin/fleet/dashboard");
}
