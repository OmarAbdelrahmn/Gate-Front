"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { SearchableSelect, SelectOption } from "@/components/ui/SearchableSelect";
import { X, Building2, AlertTriangle, RefreshCw } from "lucide-react";
import { listSponsors, Sponsor } from "@/lib/workforce/api";
import {
  updateFuelCardSponsor,
  FuelCard,
} from "@/lib/fleet/fuel-cards-api";

interface ChangeFuelCardSponsorModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: FuelCard | null;
  currentSponsorName?: string;
  onSuccess: (updatedCard: FuelCard) => void;
}

export function ChangeFuelCardSponsorModal({
  isOpen,
  onClose,
  card,
  currentSponsorName,
  onSuccess,
}: ChangeFuelCardSponsorModalProps) {
  const [selectedSponsorId, setSelectedSponsorId] = useState("");
  const [sponsorsOptions, setSponsorsOptions] = useState<SelectOption[]>([]);
  const [loadingSponsors, setLoadingSponsors] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSponsors = () => {
    setLoadingSponsors(true);
    listSponsors()
      .then((sponsorsList) => {
        const options: SelectOption[] = (sponsorsList || []).map((s: Sponsor) => {
          const statusText = s.status && s.status !== "Active" ? ` (${s.status})` : "";
          return {
            value: s.id,
            label: `${s.registryNameAr || s.registryNameEn || s.id}${statusText}`,
            sublabel: s.employerIdentityNumber ? `رقم المنشأة: ${s.employerIdentityNumber}` : undefined,
          };
        });
        setSponsorsOptions(options);
      })
      .catch((err) => {
        console.error("Failed to load sponsors list:", err);
      })
      .finally(() => {
        setLoadingSponsors(false);
      });
  };

  useEffect(() => {
    if (isOpen && card) {
      setSelectedSponsorId("");
      setError(null);
      fetchSponsors();
    }
  }, [isOpen, card?.id]);

  if (!isOpen || !card) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!card) return;

    if (!selectedSponsorId) {
      setError("يرجى اختيار الكفيل الجديد");
      return;
    }

    if (selectedSponsorId === card.sponsorId) {
      setError("الكفيل المختار هو بالفعل الكفيل الحالي لهذه البطاقة");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updated = await updateFuelCardSponsor(card.id, {
        sponsorId: selectedSponsorId,
        rowVersion: card.rowVersion,
      });

      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error("Failed to change fuel card sponsor:", err);
      const code = err?.errorCode || err?.title || err?.code;
      if (err?.status === 409 || code === "fuel.concurrency_conflict") {
        setError(err?.detail || "تعارض في التحديث: تم تعديل بيانات البطاقة من قبل مستخدم آخر، يرجى تحديث الصفحة والمحاولة مجدداً.");
      } else if (err?.status === 404 && code === "fuel.sponsor_not_found") {
        setError(err?.detail || "الكفيل المحدد غير موجود، يرجى إعادة تحديث قائمة الكفلاء.");
        fetchSponsors();
      } else if (err?.status === 404 && code === "fuel.card_not_found") {
        setError(err?.detail || "بطاقة الوقود لم تعد موجودة في النظام.");
      } else {
        setError(err?.detail || err?.message || "تعذر تغيير كفيل بطاقة الوقود");
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
            <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                تغيير كفيل بطاقة الوقود
              </h3>
              <p className="text-xs text-[var(--muted)]">
                تحديث الكفيل المرتبط بهذه البطاقة
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
              <span className="text-[var(--muted)] font-medium">الكفيل الحالي:</span>
              <span className="font-bold text-[#1167c9] dark:text-blue-400">
                {currentSponsorName || card.sponsorId || "غير محدد"}
              </span>
            </div>
          </div>

          {/* New Sponsor Selector */}
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
              اختر الكفيل الجديد <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              value={selectedSponsorId}
              onChange={(val) => {
                setSelectedSponsorId(val);
                setError(null);
              }}
              options={sponsorsOptions}
              placeholder={loadingSponsors ? "جاري تحميل قائمة الكفلاء..." : "اختر الكفيل..."}
              searchPlaceholder="بحث في أسماء أو أرقام الكفلاء..."
              disabled={loadingSponsors || loading}
            />
            <p className="mt-1.5 text-[11px] text-[var(--muted)]">
              لكل بطاقة وقود كفيل واحد محدد، ويمكن للكفيل أن يمتلك أي عدد من بطاقات الوقود.
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
              disabled={loading || loadingSponsors || !selectedSponsorId}
              className="h-10 px-6 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin ml-1.5" />
                  جاري التحديث...
                </>
              ) : (
                "حفظ وتغيير الكفيل"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
