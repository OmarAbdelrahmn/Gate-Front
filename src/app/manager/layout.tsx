import { DashboardShell } from "../../components/layout/DashboardShell";

export default function ManagerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <DashboardShell role="manager">{children}</DashboardShell>;
}
