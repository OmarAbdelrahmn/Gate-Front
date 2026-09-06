"use client";
import { useEffect, useState } from "react";
import { MonitorSmartphone, Trash2 } from "lucide-react";
import { listSessions, revokeSession } from "../../../../lib/auth/api";
import type { AuthSession } from "../../../../lib/auth/types";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { systemConfirm } from "../../../../components/ui/SystemDialog";
export default function SessionsPage() {
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true);
    try {
      setSessions(await listSessions());
    } catch {
      setError("تعذر تحميل الجلسات النشطة.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function revoke(session: AuthSession) {
    if (!(await systemConfirm(`هل تريد إنهاء جلسة ${session.deviceLabel}؟`, "إنهاء الجلسة", true))) return;
    setBusy(session.id);
    try {
      await revokeSession(session.id);
      setSessions((current) =>
        current.filter((item) => item.id !== session.id),
      );
    } catch {
      setError("تعذر إنهاء الجلسة.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-[#1167c9]">حسابي</p>
        <h1 className="mt-1 text-3xl font-black">الجلسات النشطة</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          راجع الأجهزة المسجلة بحسابك وأنهِ أي جلسة غير معروفة.
        </p>
      </div>
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-xs leading-5 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
        <p className="font-bold text-blue-950 dark:text-blue-100">سياسة أمان الجلسات (جلسة واحدة فقط):</p>
        <p className="mt-1">
          يسمح النظام بجلسة نشطة واحدة فقط لكل حساب. عند تسجيل الدخول من جهاز جديد يتم إلغاء الجلسة السابقة وزيادة إصدار التفويض تلقائياً.
        </p>
      </div>
      {error && (
        <Card className="p-5">
          <p role="alert" className="text-red-700">
            {error}
          </p>
        </Card>
      )}
      {loading ? (
        <p className="py-12 text-center text-sm text-[var(--muted)]">
          جارٍ تحميل الجلسات…
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sessions.map((session) => (
            <Card key={session.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500/10 text-[#1167c9]">
                    <MonitorSmartphone size={20} />
                  </div>
                  <div>
                    <h2 className="font-black">{session.deviceLabel}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]" dir="ltr">
                      {session.lastIpAddress || "IP غير متاح"}
                    </p>
                  </div>
                </div>
                {session.isCurrent && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-700">
                    هذه الجلسة
                  </span>
                )}
              </div>
              <dl className="mt-5 grid gap-3 border-t border-[var(--border)] pt-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-[var(--muted)]">آخر استخدام</dt>
                  <dd className="mt-1 font-bold">
                    {new Intl.DateTimeFormat("ar-SA", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(session.lastUsedAtUtc))}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">ينتهي في</dt>
                  <dd className="mt-1 font-bold">
                    {new Intl.DateTimeFormat("ar-SA", {
                      dateStyle: "medium",
                    }).format(new Date(session.idleExpiresAtUtc))}
                  </dd>
                </div>
              </dl>
              {!session.isCurrent && (
                <Button
                  variant="secondary"
                  loading={busy === session.id}
                  onClick={() => void revoke(session)}
                  className="mt-4"
                >
                  <Trash2 size={16} />
                  إنهاء الجلسة
                </Button>
              )}
            </Card>
          ))}
          {!sessions.length && (
            <Card className="p-6 text-sm text-[var(--muted)]">
              لا توجد جلسات نشطة.
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
