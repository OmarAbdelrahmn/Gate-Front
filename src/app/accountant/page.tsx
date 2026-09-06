"use client";

import { useAuth } from "../../lib/auth/AuthProvider";
import { translate } from "../../lib/i18n";
import { Card } from "../../components/ui/Card";
import { Calculator } from "lucide-react";

export default function AccountantPage() {
  const { user, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const userName =
    locale === "en"
      ? (user?.displayNameEn ?? "Accountant")
      : (user?.displayNameAr ?? "المحاسب");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          {t("dashboard.welcome")} {userName}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {locale === "en"
            ? "Financial & Accounting Portal"
            : "البوابة المالية والمحاسبية"}
        </p>
      </div>
      <Card className="p-8 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50">
          <Calculator size={32} />
        </div>
        <h2 className="text-lg font-bold">
          {locale === "en" ? "Accountant Portal" : "لوحة تحكم المحاسب"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
          {locale === "en"
            ? "Accountant workspace is configured and ready for financial dashboards, ledger accounts, and reports."
            : "تم تجهيز مسار لوحة تحكم المحاسب وجاهز لربط القيود المحاسبية والتقارير المالية."}
        </p>
      </Card>
    </div>
  );
}
