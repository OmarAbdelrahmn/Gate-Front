"use client";

import { ArrowUpLeft, Package, Truck, Wallet, Users } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Table } from "../../components/ui/Table";
import { useAuth } from "../../lib/auth/AuthProvider";
import { translate } from "../../lib/i18n";

export default function DashboardPage() {
  const { user, locale } = useAuth();
  const t = (key: string) => translate(locale, key);

  const userName = locale === "en" ? (user?.displayNameEn ?? "Manager") : (user?.displayNameAr ?? "محمد");

  const stats = [
    {
      labelKey: "dashboard.activeShipments",
      value: "128",
      change: "%12.5",
      icon: Package,
      color: "bg-blue-50 text-blue-600",
    },
    {
      labelKey: "dashboard.activeVehicles",
      value: "42",
      change: "%8.2",
      icon: Truck,
      color: "bg-orange-50 text-orange-600",
    },
    {
      labelKey: "dashboard.totalCustomers",
      value: "356",
      change: "%6.4",
      icon: Users,
      color: "bg-purple-50 text-purple-600",
    },
    {
      labelKey: "dashboard.monthlyRevenue",
      value: locale === "en" ? "SAR 184,500" : "184,500 ر.س",
      change: "%14.8",
      icon: Wallet,
      color: "bg-emerald-50 text-emerald-600",
    },
  ];

  const shipments = [
    {
      id: "#SH-24891",
      customer: locale === "en" ? "Aramex Corp" : "شركة أرامكس",
      route: locale === "en" ? "Riyadh → Jeddah" : "الرياض ← جدة",
      statusKey: "dashboard.inTransit",
      statusTone: "orange",
      date: locale === "en" ? "Aug 23" : "23 أغسطس",
    },
    {
      id: "#SH-24890",
      customer: locale === "en" ? "Al-Mada Establishment" : "مؤسسة المدى",
      route: locale === "en" ? "Dammam → Riyadh" : "الدمام ← الرياض",
      statusKey: "dashboard.delivered",
      statusTone: "green",
      date: locale === "en" ? "Aug 23" : "23 أغسطس",
    },
    {
      id: "#SH-24889",
      customer: locale === "en" ? "Modern Build Co." : "شركة البناء الحديث",
      route: locale === "en" ? "Jeddah → Makkah" : "جدة ← مكة",
      statusKey: "dashboard.scheduled",
      statusTone: "blue",
      date: locale === "en" ? "Aug 22" : "22 أغسطس",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-bold text-[#1167c9]">
            {t("dashboard.dateText")}
          </p>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            {t("dashboard.welcome")} {userName}،{" "}
            <span className="text-[#1167c9]">{t("dashboard.goodMorning")}</span>
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <Button>
          {t("dashboard.newShipment")} <ArrowUpLeft size={17} className={locale === "en" ? "rotate-90" : ""} />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.labelKey} className="p-5">
              <div className="flex items-start justify-between">
                <div
                  className={`grid h-11 w-11 place-items-center rounded-xl ${s.color}`}
                >
                  <Icon size={21} />
                </div>
                <span className="text-xs font-bold text-emerald-600">
                  ↑ {s.change}
                </span>
              </div>
              <p className="mt-5 text-sm text-[var(--muted)]">{t(s.labelKey)}</p>
              <strong className="mt-1 block text-2xl font-black">
                {s.value}
              </strong>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
          <div>
            <h2 className="font-black">{t("dashboard.recentShipments")}</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {t("dashboard.trackShipments")}
            </p>
          </div>
          <Button variant="ghost">{t("dashboard.viewAll")}</Button>
        </div>
        <Table>
          <thead className="border-b border-[var(--border)] bg-[var(--subtle-bg)] text-xs text-[var(--muted)]">
            <tr>
              <th className="px-5 py-4">{t("dashboard.shipmentNo")}</th>
              <th className="px-5 py-4">{t("dashboard.customer")}</th>
              <th className="px-5 py-4">{t("dashboard.route")}</th>
              <th className="px-5 py-4">{t("dashboard.status")}</th>
              <th className="px-5 py-4">{t("dashboard.date")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {shipments.map((r) => (
              <tr key={r.id} className="hover:bg-blue-500/5 transition-colors">
                <td className="px-5 py-4 font-bold text-[#1167c9]">{r.id}</td>
                <td className="px-5 py-4">{r.customer}</td>
                <td className="px-5 py-4">{r.route}</td>
                <td className="px-5 py-4">
                  <Badge tone={r.statusTone as "green" | "orange" | "blue"}>
                    {t(r.statusKey)}
                  </Badge>
                </td>
                <td className="px-5 py-4">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
