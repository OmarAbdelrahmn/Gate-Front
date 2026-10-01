"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { SearchableSelect, SelectOption } from "@/components/ui/SearchableSelect";
import { X, MapPin, AlertTriangle, RefreshCw } from "lucide-react";
import {
  updateFuelCardCity,
  getOperatingCitiesCatalog,
  FuelCard,
  OperatingCityOption,
} from "@/lib/fleet/fuel-cards-api";

interface ChangeFuelCardCityModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: FuelCard | null;
  currentSponsorName?: string;
  onSuccess: (updatedCard: FuelCard) => void;
}

export function ChangeFuelCardCityModal({
  isOpen,
  onClose,
  card,
  currentSponsorName,
  onSuccess,
}: ChangeFuelCardCityModalProps) {
  const [selectedCityId, setSelectedCityId] = useState("");
  const [citiesOptions, setCitiesOptions] = useState<SelectOption[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCities = () => {
    setLoadingCities(true);
    getOperatingCitiesCatalog()
      .then((citiesList) => {
        const options: SelectOption[] = (citiesList || []).map((c: OperatingCityOption) => {
          const statusText = c.status && c.status !== "Active" ? ` (${c.status})` : "";
          return {
            value: c.id,
            label: `${c.nameAr || c.nameEn || c.code || c.id}${statusText}`,
            sublabel: c.code ? `رمز المدينة: ${c.code}` : undefined,
          };
        });
        setCitiesOptions(options);
      })
      .catch((err) => {
        console.error("Failed to load operating cities list:", err);
      })
      .finally(() => {
        setLoadingCities(false);
      });
  };

  useEffect(() => {
    if (isOpen && card) {
      setSelectedCityId("");
      setError(null);
      fetchCities();
    }
  }, [isOpen, card?.id]);

  if (!isOpen || !card) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!card) return;

    if (!selectedCityId) {
      setError("يرجى اختيار مدينة التشغيل الجديدة");
      return;
    }

    if (selectedCityId === card.operatingCityId) {
      setError("المدينة المختارة هي بالفعل مدينة التشغيل الحالية لهذه البطاقة");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updated = await updateFuelCardCity(card.id, {
        operatingCityId: selectedCityId,
        rowVersion: card.rowVersion,
      });

      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error("Failed to change fuel card city:", err);
      const code = err?.errorCode || err?.title || err?.code;
      if (err?.status === 409 || code === "fuel.concurrency_conflict") {
        setError(
          err?.detail ||
            "تعارض في التحديث: تم تعديل بيانات البطاقة من قبل مستخدم آخر، يرجى تحديث الصفحة والمحاولة مجدداً."
        );
      } else if (err?.status === 404 && code === "fuel.operating_city_not_found") {
        setError(err?.detail || "مدينة التشغيل المحددة غير موجودة، يرجى إعادة تحديث قائمة المدن.");
        fetchCities();
      } else if (err?.status === 404 && code === "fuel.card_not_found") {
        setError(err?.detail || "بطاقة الوقود لم تعد موجودة في النظام.");
      } else if (err?.status === 403 || code === "fuel.forbidden") {
        setError(err?.detail || "عفواً، لا تملك صلاحية تعديل بطاقة الوقود (fuel.manage).");
      } else {
        setError(err?.detail || err?.message || "تعذر تغيير مدينة تشغيل بطاقة الوقود");
      }
    } finally {
      setLoading(false);
    }
  }

  const currentCityDisplay =
    card.operatingCityNameAr || card.operatingCityNameEn || card.operatingCityId || "غير محدد";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      dir="rtl"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                تغيير مدينة تشغيل بطاقة الوقود
              </h3>
              <p className="text-xs text-[var(--muted)]">
                تحديث مدينة التشغيل المرتبطة بهذه البطاقة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--muted)] hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Card Summary */}
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[var(--muted)] font-medium">رقم البطاقة:</span>
              <span dir="auto" className="fuel-plate font-black text-sm text-[var(--foreground)]">
                {card.cardNumber}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--muted)] font-medium">المزود:</span>
              <span className="font-bold text-[var(--foreground)]">{card.providerNameAr}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--muted)] font-medium">مدينة التشغيل الحالية:</span>
              <span className="font-bold text-teal-600 dark:text-teal-400">
                {currentCityDisplay}
              </span>
            </div>
            {currentSponsorName && (
              <div className="flex justify-between items-center">
                <span className="text-[var(--muted)] font-medium">الكفيل المرتبط:</span>
                <span className="font-medium text-[var(--foreground)]">{currentSponsorName}</span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-700 dark:text-blue-300">
            تغيير مدينة التشغيل يخص البطاقة فقط؛ ولا يغيّر الكفيل، أو إسناد المندوب، أو سجل الاستهلاك الشهري.
          </div>

          {/* New City Selector */}
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              اختر مدينة التشغيل الجديدة <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              value={selectedCityId}
              onChange={(val) => {
                setSelectedCityId(val);
                setError(null);
              }}
              options={citiesOptions}
              placeholder={loadingCities ? "جاري تحميل قائمة المدن..." : "اختر المدينة..."}
              searchPlaceholder="بحث في أسماء أو رموز المدن..."
              disabled={loadingCities || loading}
            />
            <p className="mt-1.5 text-[11px] text-[var(--muted)]">
              اختر المدينة التشغيلية الجديدة للبطاقة من دليل مدن التشغيل المعتمدة.
            </p>
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
              disabled={loading || loadingCities || !selectedCityId}
              className="h-10 px-6 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin ml-1.5" />
                  جاري التحديث...
                </>
              ) : (
                "حفظ وتغيير المدينة"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
