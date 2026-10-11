// src/components/chefz/ChefzPerformanceSettingsModal.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getChefzPerformanceSettings,
  updateChefzPerformanceSettings,
} from "@/lib/chefz/api";
import type { ChefzSettings, ChefzSettingsRequest } from "@/lib/chefz/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import {
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  TrendingUp,
  Clock,
  HelpCircle,
  Save,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: () => void;
}

export function ChefzPerformanceSettingsForm({
  onSuccess,
  isModal = false,
}: {
  onSuccess?: () => void;
  isModal?: boolean;
}) {
  const { can } = useAuth();
  const canUpdate = can("chefz.accounts.update");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [overallA, setOverallA] = useState<number>(80);
  const [overallB, setOverallB] = useState<number>(60);
  const [overallC, setOverallC] = useState<number>(40);

  const [dailyA, setDailyA] = useState<number>(7);
  const [dailyB, setDailyB] = useState<number>(5);
  const [dailyC, setDailyC] = useState<number>(3);

  const [rateA, setRateA] = useState<number>(80);
  const [rateB, setRateB] = useState<number>(70);
  const [rateC, setRateC] = useState<number>(60);

  const [changeDays, setChangeDays] = useState<number>(2);
  const [followUpZero, setFollowUpZero] = useState<boolean>(true);
  const [rowVersion, setRowVersion] = useState<string>("");

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getChefzPerformanceSettings();
      const s = res?.settings;
      if (s) {
        setOverallA(s.overallAOrders);
        setOverallB(s.overallBOrders);
        setOverallC(s.overallCOrders);

        setDailyA(s.dailyAOrders);
        setDailyB(s.dailyBOrders);
        setDailyC(s.dailyCOrders);

        setRateA(s.aAcceptanceRate);
        setRateB(s.bAcceptanceRate);
        setRateC(s.cAcceptanceRate);

        setChangeDays(s.changeAfterNoOrderDays);
        setFollowUpZero(s.followUpOnZeroOrdersWithMissedOffers);
        setRowVersion(res.rowVersion || s.rowVersion || "");
      }
    } catch (err: unknown) {
      const e = err as { details?: { detail?: string }; message?: string };
      setError(e?.details?.detail || e?.message || "تعذر تحميل إعدادات تصنيف الأداء.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const validate = (): string | null => {
    // 1. Overall orders: A > B > C > 0
    if (
      !Number.isInteger(overallA) ||
      !Number.isInteger(overallB) ||
      !Number.isInteger(overallC) ||
      overallC <= 0 ||
      overallB <= overallC ||
      overallA <= overallB
    ) {
      return "حدود الطلبات الإجمالية غير صالحة: يجب أن تكون أعداداً صحيحة موجبة مع تحقيق (A > B > C > 0).";
    }

    // 2. Daily orders: A > B > C > 0
    if (
      !Number.isInteger(dailyA) ||
      !Number.isInteger(dailyB) ||
      !Number.isInteger(dailyC) ||
      dailyC <= 0 ||
      dailyB <= dailyC ||
      dailyA <= dailyB
    ) {
      return "حدود الطلبات اليومية غير صالحة: يجب أن تكون أعداداً صحيحة موجبة مع تحقيق (A > B > C > 0).";
    }

    // 3. Acceptance rates: 100 >= A >= B >= C >= 0, max 2 decimals
    if (rateC < 0 || rateB < rateC || rateA < rateB || rateA > 100) {
      return "نسب القبول غير صالحة: يجب أن تحقق (100 ≥ A ≥ B ≥ C ≥ 0).";
    }

    const hasTooManyDecimals = (val: number) => {
      const str = String(val);
      const parts = str.split(".");
      return parts.length > 1 && parts[1].length > 2;
    };

    if (
      hasTooManyDecimals(rateA) ||
      hasTooManyDecimals(rateB) ||
      hasTooManyDecimals(rateC)
    ) {
      return "نسب القبول يجب ألا تحتوي على أكثر من خانتين عشريتين.";
    }

    // 4. Change days: integer 1..365
    if (!Number.isInteger(changeDays) || changeDays < 1 || changeDays > 365) {
      return "عدد أيام الانقطاع (بدون طلبات) يجب أن يكون عدداً صحيحاً بين 1 و 365 يوماً.";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUpdate) {
      toast.error("غير مصرح", "ليس لديك صلاحية لتعديل إعدادات أداء شيفز (chefz.accounts.update).");
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    const payload: ChefzSettingsRequest = {
      overallAOrders: Number(overallA),
      overallBOrders: Number(overallB),
      overallCOrders: Number(overallC),
      dailyAOrders: Number(dailyA),
      dailyBOrders: Number(dailyB),
      dailyCOrders: Number(dailyC),
      aAcceptanceRate: Number(rateA),
      bAcceptanceRate: Number(rateB),
      cAcceptanceRate: Number(rateC),
      changeAfterNoOrderDays: Number(changeDays),
      followUpOnZeroOrdersWithMissedOffers: Boolean(followUpZero),
      rowVersion,
    };

    try {
      const res = await updateChefzPerformanceSettings(payload);
      const newVersion = res?.rowVersion || res?.settings?.rowVersion || "";
      if (newVersion) setRowVersion(newVersion);
      toast.success("تم بنجاح", "تم حفظ إعدادات معايير الأداء والتقارير بنجاح.");
      onSuccess?.();
    } catch (err: unknown) {
      const e = err as { details?: { detail?: string }; message?: string };
      setError(e?.details?.detail || e?.message || "تعذر حفظ إعدادات الأداء.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-[var(--muted)]">
        <RefreshCw className="h-8 w-8 animate-spin text-[var(--brand)] mb-3" />
        <p className="text-sm font-semibold">جارٍ تحميل إعدادات معايير الأداء...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-right" dir="rtl">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
            <span className="font-semibold">{error}</span>
          </div>
        </div>
      )}

      {/* Info notice about thresholds application */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200 space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-sm">
          <HelpCircle className="h-4 w-4 shrink-0 text-blue-600" />
          <span>آلية تصنيف الأداء في التقارير</span>
        </div>
        <p className="leading-relaxed">
          يتم تقييم الفئات بالترتيب: <strong>A ثم B ثم C ثم D</strong>. يشترط لاكتساب الفئة استيفاء كل من <strong>حد الطلبات</strong> و<strong>نسبة القبول</strong> معاً. الفئة <strong>A</strong> تشمل الطلبات التي تتجاوز الحد الأعلى. في حال تدني نسبة القبول، يتم خفض تصنيف المندوب حتى وإن تجاوز حد الطلبات. حفظ الإعدادات يغير تصنيف كافة طلبات التقارير القادمة.
        </p>
      </div>

      {/* Group 1: Overall Order Thresholds */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-[var(--foreground)]">
              حدود الطلبات الإجمالية (نصف شهرية)
            </h3>
          </div>
          <span className="text-xs text-[var(--muted)] font-mono">A &gt; B &gt; C &gt; 0</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
              الحد الأدنى للفئة A (طلب) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={overallA}
              onChange={(e) => setOverallA(parseInt(e.target.value) || 0)}
              disabled={!canUpdate || saving}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] font-mono outline-none focus:border-[var(--brand)]"
            />
            <p className="text-[11px] text-[var(--muted)] mt-1">افتراضي: 80 طلب</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
              الحد الأدنى للفئة B (طلب) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={overallB}
              onChange={(e) => setOverallB(parseInt(e.target.value) || 0)}
              disabled={!canUpdate || saving}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] font-mono outline-none focus:border-[var(--brand)]"
            />
            <p className="text-[11px] text-[var(--muted)] mt-1">افتراضي: 60 طلب</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
              الحد الأدنى للفئة C (طلب) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={overallC}
              onChange={(e) => setOverallC(parseInt(e.target.value) || 0)}
              disabled={!canUpdate || saving}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] font-mono outline-none focus:border-[var(--brand)]"
            />
            <p className="text-[11px] text-[var(--muted)] mt-1">افتراضي: 40 طلب</p>
          </div>
        </div>
      </div>

      {/* Group 2: Daily Order Thresholds */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-sm text-[var(--foreground)]">
              حدود الطلبات اليومية
            </h3>
          </div>
          <span className="text-xs text-[var(--muted)] font-mono">A &gt; B &gt; C &gt; 0</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
              الحد اليومي للفئة A (طلب) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={dailyA}
              onChange={(e) => setDailyA(parseInt(e.target.value) || 0)}
              disabled={!canUpdate || saving}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] font-mono outline-none focus:border-[var(--brand)]"
            />
            <p className="text-[11px] text-[var(--muted)] mt-1">افتراضي: 7 طلبات</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
              الحد اليومي للفئة B (طلب) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={dailyB}
              onChange={(e) => setDailyB(parseInt(e.target.value) || 0)}
              disabled={!canUpdate || saving}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] font-mono outline-none focus:border-[var(--brand)]"
            />
            <p className="text-[11px] text-[var(--muted)] mt-1">افتراضي: 5 طلبات</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
              الحد اليومي للفئة C (طلب) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={dailyC}
              onChange={(e) => setDailyC(parseInt(e.target.value) || 0)}
              disabled={!canUpdate || saving}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] font-mono outline-none focus:border-[var(--brand)]"
            />
            <p className="text-[11px] text-[var(--muted)] mt-1">افتراضي: 3 طلبات</p>
          </div>
        </div>
      </div>

      {/* Group 3: Acceptance Rate Thresholds */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold text-sm text-[var(--foreground)]">
              حدود نسب القبول (%)
            </h3>
          </div>
          <span className="text-xs text-[var(--muted)] font-mono">100 ≥ A ≥ B ≥ C ≥ 0</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
              نسبة القبول للفئة A (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={rateA}
              onChange={(e) => setRateA(parseFloat(e.target.value) || 0)}
              disabled={!canUpdate || saving}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] font-mono outline-none focus:border-[var(--brand)]"
            />
            <p className="text-[11px] text-[var(--muted)] mt-1">افتراضي: 80%</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
              نسبة القبول للفئة B (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={rateB}
              onChange={(e) => setRateB(parseFloat(e.target.value) || 0)}
              disabled={!canUpdate || saving}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] font-mono outline-none focus:border-[var(--brand)]"
            />
            <p className="text-[11px] text-[var(--muted)] mt-1">افتراضي: 70%</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
              نسبة القبول للفئة C (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={rateC}
              onChange={(e) => setRateC(parseFloat(e.target.value) || 0)}
              disabled={!canUpdate || saving}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] font-mono outline-none focus:border-[var(--brand)]"
            />
            <p className="text-[11px] text-[var(--muted)] mt-1">افتراضي: 60%</p>
          </div>
        </div>
      </div>

      {/* Group 4: Operational Triggers & Sequences */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
          <Sliders className="h-5 w-5 text-amber-600" />
          <h3 className="font-bold text-sm text-[var(--foreground)]">
            محددات الانقطاع والتحويل والمتابعة الشديدة
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          {/* changeAfterNoOrderDays */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
              أيام متتالية بدون طلبات لتفعيل التحويل (CHANGE) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={changeDays}
              onChange={(e) => setChangeDays(parseInt(e.target.value) || 1)}
              disabled={!canUpdate || saving}
              required
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] py-2 px-3 text-sm text-[var(--foreground)] font-mono outline-none focus:border-[var(--brand)]"
            />
            <p className="text-[11px] text-[var(--muted)] mt-1">
              إذا كانت القيمة 2، يتحول التقييم إلى <strong>CHANGE</strong> عند الوصول إلى 3 أيام متتالية بدون طلبات في نهاية السلسلة.
            </p>
          </div>

          {/* followUpOnZeroOrdersWithMissedOffers */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)] p-3.5 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={followUpZero}
                onChange={(e) => setFollowUpZero(e.target.checked)}
                disabled={!canUpdate || saving}
                className="mt-1 h-4 w-4 rounded border-[var(--border)] text-[var(--brand)] focus:ring-[var(--brand)]"
              />
              <div className="text-xs">
                <span className="font-bold text-[var(--foreground)] block">
                  تفعيل وسم &quot;متابعه شديدة&quot;
                </span>
                <span className="text-[var(--muted)] block mt-0.5 leading-relaxed">
                  عند تسجيل صفر طلبات يومياً مع وجود عروض فائتة (Missed Offers &gt; 0)، يمنح المندوب تقييم &quot;متابعه شديدة&quot;.
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* RowVersion Token note */}
      {rowVersion && (
        <div className="flex items-center justify-between text-[11px] text-[var(--muted)] px-1">
          <span>رمز التزامن (Row Version):</span>
          <span className="font-mono text-[10px] truncate max-w-[200px]" dir="ltr">
            {rowVersion}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={loadSettings}
          disabled={saving}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          إعادة تحميل
        </Button>

        {canUpdate ? (
          <Button
            type="submit"
            disabled={saving}
            className="gap-2 bg-[var(--brand)] text-white hover:opacity-90 min-w-[140px]"
          >
            <Save className="h-4 w-4" />
            {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
          </Button>
        ) : (
          <div className="text-xs text-[var(--muted)] flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-amber-500" />
            <span>عرض فقط (يلزم صلاحية chefz.accounts.update للتعديل)</span>
          </div>
        )}
      </div>
    </form>
  );
}

export function ChefzPerformanceSettingsModal({
  isOpen,
  onClose,
  onSettingsSaved,
}: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إعدادات ومعايير تقارير الأداء — شيفز"
      maxWidth="max-w-2xl"
    >
      <div className="py-2">
        <ChefzPerformanceSettingsForm
          isModal={true}
          onSuccess={() => {
            onSettingsSaved?.();
            onClose();
          }}
        />
      </div>
    </Modal>
  );
}
