"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  X,
  CreditCard,
  RefreshCw,
  ExternalLink,
  UserPlus,
  UserMinus,
  History,
  Calendar,
  Building,
  Building2,
  Tag,
  FileText,
  MapPin,
} from "lucide-react";
import {
  getFuelCard,
  FuelCard,
} from "@/lib/fleet/fuel-cards-api";
import { listSponsors, Sponsor } from "@/lib/workforce/api";

interface FuelCardDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string | null;
  canManage: boolean;
  onOpenAssign: (card: FuelCard) => void;
  onOpenStop: (card: FuelCard) => void;
  onOpenHistory: (card: FuelCard) => void;
  onOpenChangeSponsor?: (card: FuelCard) => void;
  onOpenChangeCity?: (card: FuelCard) => void;
}

export function FuelCardDetailsModal({
  isOpen,
  onClose,
  cardId,
  canManage,
  onOpenAssign,
  onOpenStop,
  onOpenHistory,
  onOpenChangeSponsor,
  onOpenChangeCity,
}: FuelCardDetailsModalProps) {
  const [card, setCard] = useState<FuelCard | null>(null);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && cardId) {
      setLoading(true);
      setError(null);
      Promise.all([
        getFuelCard(cardId),
        listSponsors().catch(() => [] as Sponsor[]),
      ])
        .then(([cardData, sponsorsList]) => {
          setCard(cardData);
          setSponsors(sponsorsList || []);
        })
        .catch((err) => {
          console.error("Failed to load fuel card details:", err);
          setError(err?.message || "بطاقة الوقود غير موجودة");
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, cardId]);

  if (!isOpen || !cardId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" dir="rtl">
      <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#1167c9] flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                تفاصيل بطاقة الوقود
              </h3>
              <p className="text-xs text-[var(--muted)]">
                معلومات البطاقة والتعيين الحالي
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

        {/* Content */}
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-[var(--muted)] text-xs">
              <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-[#1167c9]" />
              جاري تحميل تفاصيل البطاقة...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 text-red-600 text-xs text-center font-semibold">
              {error}
            </div>
          ) : card ? (
            <div className="space-y-4 text-xs">
              {/* Top Banner */}
              <div className="p-4 rounded-xl border border-[var(--border)] bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[var(--muted)] block">رقم البطاقة / المعرف:</span>
                  <span dir="auto" className="fuel-plate font-black text-lg text-[#1167c9] dark:text-blue-400">
                    {card.cardNumber}
                  </span>
                </div>
                <div className="text-end">
                  <Badge tone={card.provider === "PetroApp" ? "blue" : "green"}>
                    {card.providerNameAr}
                  </Badge>
                </div>
              </div>

              {/* Grid details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                  <div className="flex items-center gap-1.5 text-[var(--muted)] mb-1">
                    <Tag size={14} />
                    <span>تصنيف المعرف:</span>
                  </div>
                  <span className="font-bold text-[var(--foreground)]">
                    {card.identifierType === "InternalNumber" ? "نمرة داخلية (InternalNumber)" : "نمرة لوحة (PlateNumber)"}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                  <div className="flex items-center gap-1.5 text-[var(--muted)] mb-1">
                    <Building size={14} />
                    <span>نص اللوحة:</span>
                  </div>
                  <span dir="auto" className="fuel-plate font-bold text-[var(--foreground)]">
                    {card.plateNumberText || "—"}
                  </span>
                </div>
              </div>

              {/* Sponsor Box */}
              {(() => {
                const currentSponsor = sponsors.find((s) => s.id === card.sponsorId);
                const sponsorName = currentSponsor?.registryNameAr || currentSponsor?.registryNameEn || card.sponsorId;

                return (
                  <div className="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-[var(--muted)] font-medium">
                        <Building2 size={15} className="text-indigo-600 dark:text-indigo-400" />
                        <span>الكفيل المرتبط:</span>
                      </div>
                      {canManage && onOpenChangeSponsor && (
                        <button
                          type="button"
                          onClick={() => onOpenChangeSponsor(card)}
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          تغيير الكفيل
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-black text-sm text-[var(--foreground)]">
                        {sponsorName}
                      </div>
                      {currentSponsor && (
                        <div className="flex items-center gap-2 text-[11px]">
                          {currentSponsor.employerIdentityNumber && (
                            <span className="font-mono text-[var(--muted)]">
                              هوية المنشأة: {currentSponsor.employerIdentityNumber}
                            </span>
                          )}
                          <Badge tone={currentSponsor.status === "Active" ? "green" : "gray"}>
                            {currentSponsor.status === "Active" ? "نشط" : currentSponsor.status || "كفيل"}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Operating City Box */}
              <div className="p-3.5 rounded-xl border border-teal-100 dark:border-teal-900/40 bg-teal-50/30 dark:bg-teal-950/20">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-[var(--muted)] font-medium">
                    <MapPin size={15} className="text-teal-600 dark:text-teal-400" />
                    <span>مدينة التشغيل:</span>
                  </div>
                  {canManage && onOpenChangeCity && (
                    <button
                      type="button"
                      onClick={() => onOpenChangeCity(card)}
                      className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      تغيير المدينة
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-black text-sm text-[var(--foreground)]">
                    {card.operatingCityNameAr || card.operatingCityNameEn || card.operatingCityId || "غير محدد"}
                  </div>
                  {card.operatingCityNameEn && card.operatingCityNameEn !== card.operatingCityNameAr && (
                    <Badge tone="gray">{card.operatingCityNameEn}</Badge>
                  )}
                </div>
              </div>

              {/* Current Rider Box */}
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20">
                <span className="text-[var(--muted)] font-medium block mb-2">المندوب المعين حالياً:</span>
                {card.currentRider ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/admin/employees/${card.currentRider.employeeId}`}
                        className="font-bold text-sm text-[#1167c9] dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        {card.currentRider.riderNameAr || card.currentRider.riderNameEn}
                        <ExternalLink size={12} className="opacity-60" />
                      </Link>
                      <Badge tone="green">تعيين نشط</Badge>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                      <span>تاريخ بدء التعيين:</span>
                      <span className="font-mono font-bold text-[var(--foreground)] dir-ltr">
                        {card.currentRider.effectiveFrom}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[var(--muted)] font-medium italic">
                    لا يوجد مندوب معين لهذه البطاقة حالياً (البطاقة شاعرة ومتاحة للإسناد).
                  </div>
                )}
              </div>

              {/* Diagnostic data */}
              <div className="p-3 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-800/30 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">المعرف المعياري (Normalized):</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">{card.normalizedCardNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">تاريخ الإضافة:</span>
                  <span className="font-mono">{new Date(card.createdAtUtc).toLocaleString("ar-SA")}</span>
                </div>
                {card.notes && (
                  <div className="pt-2 border-t border-[var(--border)]">
                    <span className="font-bold text-[var(--foreground)] block">ملاحظات:</span>
                    <p className="text-[var(--muted)] mt-0.5">{card.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        {card && (
          <div className="p-4 border-t border-[var(--border)] bg-slate-50/50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => onOpenHistory(card)}
                className="h-10 px-4 text-xs rounded-xl flex items-center gap-2"
              >
                <History size={16} />
                سجل التعيينات
              </Button>

              {canManage && onOpenChangeSponsor && (
                <Button
                  variant="secondary"
                  onClick={() => onOpenChangeSponsor(card)}
                  className="h-10 px-3 text-xs rounded-xl flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-bold"
                >
                  <Building2 size={15} />
                  تغيير الكفيل
                </Button>
              )}

              {canManage && onOpenChangeCity && (
                <Button
                  variant="secondary"
                  onClick={() => onOpenChangeCity(card)}
                  className="h-10 px-3 text-xs rounded-xl flex items-center gap-1.5 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 font-bold"
                >
                  <MapPin size={15} />
                  تغيير المدينة
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {canManage && (
                <>
                  {!card.currentRider ? (
                    <Button
                      variant="primary"
                      onClick={() => onOpenAssign(card)}
                      className="h-10 px-4 text-xs rounded-xl flex items-center gap-2 font-bold"
                    >
                      <UserPlus size={16} />
                      إسناد لمندوب
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => onOpenStop(card)}
                      className="h-10 px-4 text-xs rounded-xl flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                    >
                      <UserMinus size={16} />
                      إيقاف المندوب
                    </Button>
                  )}
                </>
              )}
              <Button variant="secondary" onClick={onClose} className="h-10 px-4 text-xs rounded-xl">
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
