"use client";

import { useAuth } from "../../lib/auth/AuthProvider";
import { translate } from "../../lib/i18n";
import { Card } from "../../components/ui/Card";
import { UserCheck } from "lucide-react";

export default function MemberPage() {
  const { user, locale } = useAuth();
  const t = (key: string) => translate(locale, key);
  const userName =
    locale === "en"
      ? (user?.displayNameEn ?? "Team Member")
      : (user?.displayNameAr ?? "عضو الفريق");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
          {t("dashboard.welcome")} {userName}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {locale === "en" ? "Member Workspace" : "مساحة عمل عضو الفريق"}
        </p>
      </div>
      <Card className="p-8 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/50">
          <UserCheck size={32} />
        </div>
        <h2 className="text-lg font-bold">
          {locale === "en" ? "Member Portal" : "لوحة تحكم عضو الفريق"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
          {locale === "en"
            ? "Member workspace is active and customized based on your assigned operational permissions."
            : "مساحة عمل العضو مفعلة ومخصصة وفق الصلاحيات والمهام المسندة لحسابك."}
        </p>
      </Card>
    </div>
  );
}
