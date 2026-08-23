"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../../lib/auth/AuthProvider";
import type { Role } from "../../lib/config/navigation";
export function DashboardShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: Role;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { isLoading, isAuthenticated, user } = useAuth();
  const mustChange = Boolean(user?.requiresPasswordChange);
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace("/login");
    else if (mustChange) router.replace("/change-password");
  }, [isAuthenticated, isLoading, mustChange, router]);
  if (isLoading || !isAuthenticated || mustChange)
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--background)]">
        <p className="text-sm font-bold text-[var(--muted)]">
          جارٍ التحقق من الجلسة…
        </p>
      </main>
    );
  return (
    <div className="min-h-screen">
      <Header onMenu={() => setOpen(true)} />
      <div className="flex">
        <Sidebar role={role} open={open} onClose={() => setOpen(false)} />
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <a href="#main-content" className="sr-only focus:not-sr-only">
            تخطي إلى المحتوى
          </a>
          <div id="main-content" className="mx-auto w-full max-w-[1500px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
