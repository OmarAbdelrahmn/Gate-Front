// src/app/admin/hunger/components/DeferredRemindersPanel.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import {
  getHungerDeferredReminders,
  getRiyadhTodayIso,
  getHungerErrorMessage,
  type HungerDeferredReminderItem,
} from "@/lib/hunger/api";
import { toast } from "@/components/ui/Toast";
import {
  BellRing,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

interface DeferredRemindersPanelProps {
  canRead: boolean;
  onSelectAccount: (externalAccountId: string, accountId: string) => void;
}

export function DeferredRemindersPanel({
  canRead,
  onSelectAccount,
}: DeferredRemindersPanelProps) {
  const todayIso = getRiyadhTodayIso();
  const [dueThrough, setDueThrough] = useState(todayIso);
  const [items, setItems] = useState<HungerDeferredReminderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchReminders = useCallback(
    async (targetDate: string) => {
      if (!canRead) return;
      if (targetDate > todayIso) {
        toast.error(
          "تاريخ الاستحقاق (dueThrough) لا يمكن أن يكون في المستقبل",
        );
        return;
      }
      setLoading(true);
      try {
        const list = await getHungerDeferredReminders(targetDate);
        setItems(list);
      } catch (err) {
        toast.error(
          getHungerErrorMessage(err, "تعذر جلب تذكيرات الحسابات المؤجلة"),
        );
      } finally {
        setLoading(false);
      }
    },
    [canRead, todayIso],
  );

  useEffect(() => {
    if (!canRead) return;
    let active = true;
    void (async () => {
      try {
        const list = await getHungerDeferredReminders(dueThrough);
        if (active) {
          setItems(list);
        }
      } catch {
        // Silent initial load
      }
    })();
    return () => {
      active = false;
    };
  }, [canRead, dueThrough]);

  if (!canRead) return null;

  return (
    <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-3.5 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <BellRing className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--foreground)]">
                حسابات مؤجلة مستحقة (DeferredNextMonth)
              </span>
              <Badge tone={items.length > 0 ? "orange" : "gray"}>
                {items.length} حساب
              </Badge>
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              تنبيه للقراءة فقط للحسابات المؤجلة للشهر القادم التي حل أو تجاوز
              تاريخ استحقاقها — لا يتم تغيير حالة الحساب تلقائيًا.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-40">
            <DateInput
              value={dueThrough}
              onChange={(val) => {
                if (val && val <= todayIso) {
                  setDueThrough(val);
                } else if (val > todayIso) {
                  toast.error(
                    "تاريخ الاستحقاق (dueThrough) لا يمكن أن يتجاوز تاريخ اليوم",
                  );
                }
              }}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void fetchReminders(dueThrough)}
            loading={loading}
          >
            <RefreshCw className="ml-1 h-3.5 w-3.5" />
            تحديث
          </Button>
          <Button
            variant={expanded ? "primary" : "secondary"}
            size="sm"
            onClick={() => setExpanded((prev) => !prev)}
          >
            <span>{expanded ? "إخفاء القائمة" : "عرض الحسابات المستحقة"}</span>
            {expanded ? (
              <ChevronUp className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {items.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--muted-foreground)]">
              لا توجد حسابات مؤجلة مستحقة حتى تاريخ {dueThrough}.
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="border-b border-[var(--border)] bg-[var(--subtle-bg)] font-bold text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-3 py-2">المعرف الخارجي للحساب</th>
                  <th className="px-3 py-2">تاريخ الاستحقاق (dueDate)</th>
                  <th className="px-3 py-2">أيام التأخير (overdueDays)</th>
                  <th className="px-3 py-2">إجراء سريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {items.map((item) => {
                  const extId =
                    item.externalAccountId ||
                    item.accountCode ||
                    item.accountId;
                  const due = item.dueDate || item.deferredUntil || "—";
                  const overdue =
                    typeof item.overdueDays === "number" ? item.overdueDays : 0;
                  return (
                    <tr
                      key={item.accountId}
                      className="hover:bg-[var(--subtle-bg)]/50"
                    >
                      <td className="px-3 py-2 font-mono font-bold text-[var(--foreground)]">
                        {extId}
                      </td>
                      <td className="px-3 py-2 font-mono">{due}</td>
                      <td className="px-3 py-2">
                        <Badge tone={overdue > 0 ? "red" : "orange"}>
                          {overdue > 0
                            ? `متأخر ${overdue} يوم`
                            : "مستحق اليوم (0 يوم)"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            onSelectAccount(extId, item.accountId)
                          }
                        >
                          <ExternalLink className="ml-1 h-3.5 w-3.5" />
                          فتح في جدول الحسابات
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
