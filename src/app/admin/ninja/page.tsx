import { redirect } from "next/navigation";

export default function NinjaIndexPage() {
  redirect("/admin/ninja/accounts");
}
