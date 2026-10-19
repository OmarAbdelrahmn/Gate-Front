// src/components/jahez/treasury/TreasuryNavHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, ClipboardCheck, FileText, Fuel, Landmark, RefreshCw, Settings2, Wallet, ListTree } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";

const destinations = [
  { path: "balances", label: "الأرصدة والحركات", icon: Wallet, permissions: ["jahez.treasury.read"] },
  { path: "transfers", label: "تحويل وقبض وصرف", icon: ArrowLeftRight, permissions: ["jahez.treasury.transfers.create", "jahez.treasury.entries.create", "jahez.treasury.adjust"] },
  { path: "handovers", label: "تسليم النقدية", icon: ClipboardCheck, permissions: ["jahez.cashbox.read", "jahez.cashbox.submit", "jahez.cashbox.confirm"] },
  { path: "petroapp", label: "بترو آب", icon: Fuel, permissions: ["jahez.treasury.read", "jahez.treasury.petroapp-evidence.create"] },
  { path: "reports", label: "التقارير", icon: FileText, permissions: ["jahez.financial-reports.read"] },
  { path: "accounts", label: "حسابات الخزينة", icon: ListTree, permissions: ["jahez.treasury.read"] },
  { path: "migration", label: "إعداد الخزينة", icon: Settings2, permissions: ["jahez.treasury.adjust"] },
];

interface TreasuryNavHeaderProps {
  title: string;
  description?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  extraActions?: React.ReactNode;
}

export function TreasuryNavHeader({
  title,
  description,
  onRefresh,
  isRefreshing,
  extraActions,
}: TreasuryNavHeaderProps) {
  const pathname = usePathname();
  const { can, user } = useAuth();
  const isAdmin = Boolean(user?.roles?.some(role => role.toLowerCase() === "admin")) || can("admin") || can("*");
  return (
    <header className="treasury-header">
      <div className="treasury-heading-row">
        <div className="treasury-heading">
          <span className="treasury-brand-icon"><Landmark size={25} aria-hidden="true" /></span>
          <div>
            <p className="treasury-eyebrow">جاهز <span aria-hidden="true">/</span> الخزينة</p>
            <h1>{title}</h1>
            {description && <p className="treasury-description">{description}</p>}
          </div>
        </div>
        <div className="treasury-header-actions">
          {onRefresh && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="تحديث بيانات الخزينة"
              aria-busy={isRefreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "جارٍ التحديث" : "تحديث"}</span>
            </Button>
          )}

          {extraActions}
        </div>
      </div>
      <nav className="treasury-navigation" aria-label="صفحات الخزينة">
        {destinations.filter(item => isAdmin || item.permissions.some(permission => can(permission))).map(item => {
          const href = `/admin/jahez/treasury/${item.path}`;
          return <Link key={item.path} href={href} aria-current={pathname === href ? "page" : undefined}>
            <item.icon size={17} aria-hidden="true" /><span>{item.label}</span>
          </Link>;
        })}
      </nav>
    </header>
  );
}
