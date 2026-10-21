// src/app/admin/jahez/debts/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JahezDebtsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/jahez/cashbox");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center p-8 text-center" dir="rtl">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
          جارٍ التحويل إلى شاشة مديونيات المناديب المرحلة والخزنة...
        </div>
        <p className="mt-1 text-xs text-gray-400">
          إدارة وتحصيل مديونيات المناديب المرحلة ضمن شاشة الخزنة والمديونيات المرحلة
        </p>
      </div>
    </div>
  );
}
