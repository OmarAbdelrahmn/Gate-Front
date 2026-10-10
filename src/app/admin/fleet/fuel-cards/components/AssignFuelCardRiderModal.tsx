"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { SearchableSelect, SelectOption } from "@/components/ui/SearchableSelect";
import { X, UserPlus, AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";
import {
  listRiders,
  listEmployees,
  getEmployeeVehicleProfile,
  ensureEmployeeVehicleProfile,
} from "@/lib/workforce/api";
import { listExternalRiders } from "@/lib/workforce/external-riders-api";
import {
  assignFuelCardRider,
  FuelCard,
  getRiyadhTodayDateString,
} from "@/lib/fleet/fuel-cards-api";

interface AssignFuelCardRiderModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: FuelCard | null;
  onSuccess: () => void;
}

interface SelectablePerson {
  key: string;
  riderProfileId: string | null;
  employeeId: string | null;
  name: string;
  iqamaNo?: string | null;
  isEmployee: boolean;
  typeLabel: string;
}

export function AssignFuelCardRiderModal({
  isOpen,
  onClose,
  card,
  onSuccess,
}: AssignFuelCardRiderModalProps) {
  const [selectedPersonKey, setSelectedPersonKey] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(getRiyadhTodayDateString());
  const [reason, setReason] = useState("إسناد بطاقة وقود شهرية");
  const [notes, setNotes] = useState("");
  const [personsOptions, setPersonsOptions] = useState<SelectOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingPersons, setLoadingPersons] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const personMetaMapRef = useRef<Map<string, SelectablePerson>>(new Map());
  const backgroundProfilePromiseRef = useRef<Promise<string | null> | null>(null);
  const [isEnsuringProfileInBackground, setIsEnsuringProfileInBackground] = useState(false);
  const [profileReadyNotice, setProfileReadyNotice] = useState<string | null>(null);

  const todayRiyadh = getRiyadhTodayDateString();

  useEffect(() => {
    if (isOpen) {
      setEffectiveFrom(getRiyadhTodayDateString());
      setReason("إسناد بطاقة وقود شهرية");
      setNotes("");
      setSelectedPersonKey("");
      setError(null);
      setProfileReadyNotice(null);
      setIsEnsuringProfileInBackground(false);
      backgroundProfilePromiseRef.current = null;
      personMetaMapRef.current.clear();

      setLoadingPersons(true);
      Promise.all([
        listRiders().catch(() => []),
        listEmployees().catch(() => []),
        listExternalRiders().catch(() => []),
      ])
        .then(([ridersRes, employeesRes, externalRes]) => {
          const options: SelectOption[] = [];
          const metaMap = new Map<string, SelectablePerson>();
          const seenEmployeeIds = new Set<string>();
          const seenRiderProfileIds = new Set<string>();
          const seenIqamaNos = new Set<string>();

          const isPersonSeen = (riderId?: string | null, empId?: string | null, iqama?: string | null) => {
            if (riderId && seenRiderProfileIds.has(riderId)) return true;
            if (empId && seenEmployeeIds.has(empId)) return true;
            const cleanIqama = iqama?.trim();
            if (cleanIqama && seenIqamaNos.has(cleanIqama)) return true;
            return false;
          };

          const markPersonSeen = (riderId?: string | null, empId?: string | null, iqama?: string | null) => {
            if (riderId) seenRiderProfileIds.add(riderId);
            if (empId) seenEmployeeIds.add(empId);
            const cleanIqama = iqama?.trim();
            if (cleanIqama) seenIqamaNos.add(cleanIqama);
          };

          // 1. Operational Riders (from /api/riders)
          (ridersRes || []).forEach((r) => {
            if (!r.id) return;
            if (isPersonSeen(r.id, r.employeeId, r.iqamaNo)) return;

            const key = `rider_${r.id}`;
            const name = r.fullNameAr || r.fullNameEn || "مندوب بدون اسم";
            const iqamaStr = r.iqamaNo ? ` (${r.iqamaNo})` : "";

            options.push({
              value: key,
              label: `${name}${iqamaStr} — مندوب`,
              sublabel: `مندوب • هوية: ${r.iqamaNo || "—"}`,
              keywords: `${name} ${r.iqamaNo || ""} مندوب`,
            });

            metaMap.set(key, {
              key,
              riderProfileId: r.id,
              employeeId: r.employeeId || null,
              name,
              iqamaNo: r.iqamaNo,
              isEmployee: false,
              typeLabel: "مندوب",
            });

            markPersonSeen(r.id, r.employeeId, r.iqamaNo);
          });

          // 2. Employees (administrative and operational employees from /api/employees)
          (employeesRes || []).forEach((e) => {
            if (!e.id) return;
            const statusStr = String(e.status || "").toLowerCase();
            if (statusStr !== "active") return;

            const existingRiderId = (e as any).riderProfileId || e.rider?.id;
            if (isPersonSeen(existingRiderId, e.id, e.iqamaNo)) return;

            const key = `emp_${e.id}`;
            const name = e.fullNameAr || e.fullNameEn || "موظف بدون اسم";
            const iqamaStr = e.iqamaNo ? ` (${e.iqamaNo})` : "";
            const isAdministrative = e.isEmployee !== false;
            const typeTag = isAdministrative ? "موظف إداري" : "موظف";

            options.push({
              value: key,
              label: `${name}${iqamaStr} — ${typeTag}`,
              sublabel: `${typeTag} • هوية: ${e.iqamaNo || "—"}`,
              keywords: `${name} ${e.iqamaNo || ""} ${typeTag} موظف`,
            });

            metaMap.set(key, {
              key,
              riderProfileId: existingRiderId || null,
              employeeId: e.id,
              name,
              iqamaNo: e.iqamaNo,
              isEmployee: isAdministrative,
              typeLabel: typeTag,
            });

            markPersonSeen(existingRiderId, e.id, e.iqamaNo);
          });

          // 3. External Riders (from /api/external-riders)
          (externalRes || []).forEach((r) => {
            if (!r.riderProfileId) return;
            if (isPersonSeen(r.riderProfileId, r.employeeId, r.iqamaNo)) return;

            const key = `external_${r.riderProfileId}`;
            const name = r.fullNameAr || "مندوب خارجي";
            const iqamaStr = r.iqamaNo ? ` (${r.iqamaNo})` : "";

            options.push({
              value: key,
              label: `${name}${iqamaStr} — مندوب خارجي`,
              sublabel: `مندوب خارجي • هوية: ${r.iqamaNo || "—"}`,
              keywords: `${name} ${r.iqamaNo || ""} مندوب خارجي`,
            });

            metaMap.set(key, {
              key,
              riderProfileId: r.riderProfileId,
              employeeId: r.employeeId || null,
              name,
              iqamaNo: r.iqamaNo,
              isEmployee: false,
              typeLabel: "مندوب خارجي",
            });

            markPersonSeen(r.riderProfileId, r.employeeId, r.iqamaNo);
          });

          personMetaMapRef.current = metaMap;
          setPersonsOptions(options);
        })
        .catch((err) => {
          console.error("Failed to load persons list:", err);
          setError("تعذر تحميل قائمة المناديب والموظفين");
        })
        .finally(() => {
          setLoadingPersons(false);
        });
    }
  }, [isOpen]);

  const handlePersonChange = (val: string) => {
    setSelectedPersonKey(val);
    setProfileReadyNotice(null);
    setError(null);

    const person = personMetaMapRef.current.get(val);
    if (!person) {
      backgroundProfilePromiseRef.current = null;
      setIsEnsuringProfileInBackground(false);
      return;
    }

    // If person already has a riderProfileId (operational rider or external rider or already resolved)
    if (person.riderProfileId) {
      backgroundProfilePromiseRef.current = Promise.resolve(person.riderProfileId);
      setIsEnsuringProfileInBackground(false);
      return;
    }

    // If person is an employee without a riderProfileId, ensure it immediately in the background!
    if (person.employeeId) {
      setIsEnsuringProfileInBackground(true);
      const bgPromise = (async () => {
        try {
          let profile = await getEmployeeVehicleProfile(person.employeeId!).catch(() => null);
          if (!profile?.exists || !profile?.riderProfileId) {
            profile = await ensureEmployeeVehicleProfile(person.employeeId!).catch((err) => {
              console.warn("Background vehicle/rider profile creation failed:", err);
              return null;
            });
          }
          if (profile?.riderProfileId) {
            person.riderProfileId = profile.riderProfileId;
            setProfileReadyNotice("تم تجهيز ملف المستلم للموظف في الخلفية بنجاح");
            return profile.riderProfileId;
          }
        } catch (err) {
          console.warn("Background ensureEmployeeVehicleProfile error:", err);
        } finally {
          setIsEnsuringProfileInBackground(false);
        }
        return null;
      })();

      backgroundProfilePromiseRef.current = bgPromise;
    } else {
      backgroundProfilePromiseRef.current = null;
      setIsEnsuringProfileInBackground(false);
    }
  };

  if (!isOpen || !card) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!card) return;
    if (!selectedPersonKey) {
      setError("يرجى اختيار المندوب أو الموظف من القائمة");
      return;
    }
    if (!effectiveFrom) {
      setError("يرجى اختيار تاريخ بداية الإسناد");
      return;
    }
    if (effectiveFrom > todayRiyadh) {
      setError("تاريخ بداية الإسناد لا يمكن أن يكون بعد تاريخ اليوم في الرياض");
      return;
    }

    const person = personMetaMapRef.current.get(selectedPersonKey);
    if (!person) {
      setError("يرجى اختيار المندوب أو الموظف المستلم");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let resolvedRiderId = person.riderProfileId;

      // If background creation was initiated, await it!
      if (!resolvedRiderId && backgroundProfilePromiseRef.current) {
        resolvedRiderId = await backgroundProfilePromiseRef.current;
      }

      // Safety fallback if still null and it is an employee:
      if (!resolvedRiderId && person.employeeId) {
        const profileRes = await ensureEmployeeVehicleProfile(person.employeeId);
        resolvedRiderId = profileRes?.riderProfileId || null;
        if (resolvedRiderId) {
          person.riderProfileId = resolvedRiderId;
        }
      }

      if (!resolvedRiderId) {
        setError("تعذر إنشاء أو جلب ملف الإسناد للموظف، يرجى المحاولة مرة أخرى.");
        setLoading(false);
        return;
      }

      await assignFuelCardRider(card.id, {
        riderProfileId: resolvedRiderId,
        effectiveFrom,
        reason: reason.trim() || "Monthly fuel-card assignment",
        notes: notes.trim() || null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      const code = err?.errorCode || err?.title || err?.code;
      if (code === "fuel.active_assignment_conflict") {
        setError(err?.detail || "لا يمكن إسناد البطاقة لأنها مسندة بالفعل لمندوب آخر حالياً.");
      } else if (code === "fuel.monthly_rider_conflict") {
        setError(err?.detail || "لا يمكن إسناد بطاقة الوقود إلى مستلمين مختلفين في الشهر نفسه.");
      } else if (code === "fuel.rider_unavailable") {
        setError(err?.detail || "المستلم المحدد غير متاح أو ليس نشطاً.");
      } else {
        setError(err?.detail || err?.message || "تعذر إسناد البطاقة للمستلم");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" dir="rtl">
      <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#1167c9] flex items-center justify-center">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                إسناد بطاقة وقود لمندوب أو موظف
              </h3>
              <p className="text-xs text-[var(--muted)]">
                البطاقة: <span dir="auto" className="fuel-plate font-bold text-[#1167c9]">{card.cardNumber}</span> ({card.providerNameAr})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--muted)] hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Rider / Employee Selection */}
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              المندوب أو الموظف المستلم <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              value={selectedPersonKey}
              onChange={handlePersonChange}
              options={personsOptions}
              placeholder={loadingPersons ? "جاري تحميل قائمة المناديب والموظفين..." : "اختر المندوب أو الموظف..."}
              searchPlaceholder="بحث باسم المندوب/الموظف، رقم الهوية أو الدور..."
            />
            {isEnsuringProfileInBackground && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40 p-2 rounded-lg border border-blue-200/70 dark:border-blue-900/50 animate-pulse">
                <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
                <span>جاري تجهيز ملف البطاقة للموظف في الخلفية تلقائياً...</span>
              </div>
            )}
            {profileReadyNotice && !isEnsuringProfileInBackground && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{profileReadyNotice}</span>
              </div>
            )}
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              شروط الإسناد: يجب أن يكون المستلم نشطاً، ولا يمكن إسناد البطاقة لمستلمين مختلفين في نفس الشهر.
            </p>
          </div>

          {/* Effective From */}
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              تاريخ بداية الإسناد <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={effectiveFrom}
              max={todayRiyadh}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full h-11 px-3 text-xs font-bold font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
              required
            />
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              التاريخ بصيغة YYYY-MM-DD ويجب ألا يتجاوز تاريخ اليوم بتوقيت الرياض ({todayRiyadh}).
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              سبب الإسناد <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="سبب إسناد بطاقة الوقود..."
              className="w-full h-11 px-3 text-xs font-medium rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              ملاحظات (اختياري)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات إضافية..."
              className="w-full p-3 text-xs font-medium rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="h-10 px-5 rounded-xl text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="h-10 px-6 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
            >
              {loading ? "جاري الإسناد..." : "تأكيد الإسناد"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
