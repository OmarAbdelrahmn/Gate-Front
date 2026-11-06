// src/app/admin/hunger/page.tsx
import { redirect } from "next/navigation";

export default function HungerIndexPage() {
  redirect("/admin/hunger/accounts");
}
