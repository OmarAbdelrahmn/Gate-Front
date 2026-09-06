"use client";

import { useAuth } from "../../lib/auth/AuthProvider";
import { translate } from "../../lib/i18n";
import { Card } from "../../components/ui/Card";
import { Briefcase } from "lucide-react";

export default function ManagerPage() {
  const { user, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const userName =
    locale === "en"
      ? (user?.displayNameEn ?? "Manager")
      : (user?.displayNameAr ?? "المدير");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          {t("dashboard.welcome")} {userName}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {locale === "en"
            ? "Manager Operations Portal"
            : "بوابة العمليات والإدارة"}
        </p>
      </div>
      <Card className="p-8 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-[#1167c9] dark:bg-blue-950/50">
          <Briefcase size={32} />
        </div>
        <h2 className="text-lg font-bold">
          {locale === "en" ? "Manager Portal" : "لوحة تحكم المدير"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
          {locale === "en"
            ? "Manager workspace is configured and ready for manager-specific dashboards and operational workflows."
            : "تم تجهيز مسار لوحة تحكم المدير وجاهز لإضافة المؤشرات والتقارير الخاصة بالإدارة."}
        </p>
      </Card>
    </div>
  );
}
