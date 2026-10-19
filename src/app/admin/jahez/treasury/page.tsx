// src/app/admin/jahez/treasury/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JahezTreasuryIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/jahez/treasury/balances");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center space-y-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-sm text-muted-foreground">جاري فتح لوحة الخزائن...</p>
      </div>
    </div>
  );
}
