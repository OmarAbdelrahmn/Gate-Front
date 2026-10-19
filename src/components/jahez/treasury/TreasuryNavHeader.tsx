// src/components/jahez/treasury/TreasuryNavHeader.tsx
"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
  return (
    <div className="space-y-3 mb-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground sm:text-xl tracking-tight">{title}</h1>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-8 px-2.5 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>تحديث</span>
            </Button>
          )}

          {extraActions}
        </div>
      </div>
    </div>
  );
}
