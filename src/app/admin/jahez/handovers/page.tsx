// src/app/admin/jahez/handovers/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JahezHandoversRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/jahez/accounts");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center p-8 text-center" dir="rtl">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
          جارٍ التحويل إلى شاشة حسابات وتسليم جاهز المحدثة V2...
        </div>
        <p className="mt-1 text-xs text-gray-400">
          تم دمج التسليم والعمليات في واجهة واحدة وفق مواصفات V2
        </p>
      </div>
    </div>
  );
}
