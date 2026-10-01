"use client";

import { useEffect, useState } from "react";
import { getVehicleOperationCards } from "@/lib/fleet/api";
import { formatVehicleComplianceDueStatus, formatDate } from "@/lib/fleet/formatters";
import type { VehicleOperationCardResponse } from "@/lib/fleet/types";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CreditCard, History, RefreshCw, Calendar, ShieldCheck, CheckCircle2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  hasUploadedFile?: boolean;
}

const getStatusBadgeVariant = (st?: number | null) => {
  switch (Number(st)) {
    case 1:
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300";
    case 2:
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300";
    case 3:
      return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300";
    case 4:
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
  }
};

export function OperationCardHistoryModal({ isOpen, onClose, vehicleId, hasUploadedFile }: Props) {
  const [cards, setCards] = useState<VehicleOperationCardResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCards = async () => {
    if (!vehicleId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getVehicleOperationCards(vehicleId);
      setCards(res || []);
    } catch (e: any) {
      console.error("Failed to load operation cards history:", e);
      setError(e?.message || "تعذر تحميل سجل كروت التشغيل.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCards();
    }
  }, [isOpen, vehicleId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="سجل كروت التشغيل (النقل العام)"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <History className="h-4 w-4" />
            <span>سجل تجديدات وتحديثات كرت التشغيل للمركبة</span>
          </div>
          <Button variant="ghost" onClick={loadCards} disabled={loading} className="px-2 py-1 h-auto text-xs gap-1">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> تحديث
          </Button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">جارٍ تحميل سجل كروت التشغيل...</div>
        ) : error ? (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm text-center">
            {error}
          </div>
        ) : cards.length === 0 ? (
          hasUploadedFile ? (
            <div className="p-12 text-center text-slate-400">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-40 text-amber-500" />
              <p className="text-base font-bold text-amber-800 dark:text-amber-300">
                ملف كرت التشغيل مرفوع، ولم تُحفظ بيانات الكرت بعد
              </p>
              <p className="text-xs mt-1 text-slate-500">
                تم رفع مستند PDF الخاص بكرت التشغيل، ولكن لم تُسجل بيانات الكرت بعد في النظام (الرقم والتواريخ).
              </p>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30 text-indigo-500" />
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">لا يوجد سجل سابق لكروت التشغيل</p>
              <p className="text-xs mt-1 text-slate-500">لم يتم إدخال أو تجديد كرت تشغيل لهذه المركبة بعد.</p>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {cards.map((card) => {
              const cardNum =
                card.cardNumber ||
                card.number ||
                (card as any).operationCardNumber ||
                (card as any).card_number ||
                (card as any).CardNumber;
              const issueD =
                card.issueDate ||
                card.effectiveFrom ||
                (card as any).cardIssueDate ||
                (card as any).operationCardIssueDate ||
                (card as any).IssueDate;
              const expiryD =
                card.expiryDate ||
                (card as any).cardExpiryDate ||
                (card as any).operationCardExpiryDate ||
                (card as any).ExpiryDate;
              const auth =
                card.issuingAuthority ||
                card.issuer ||
                (card as any).issuing_authority ||
                (card as any).IssuingAuthority;
              const statusVal = card.status ?? card.dueStatus;

              return (
                <div
                  key={card.id}
                  className={`relative rounded-xl border p-4 transition-all ${
                    card.isCurrent
                      ? "border-indigo-300 bg-indigo-50/40 dark:border-indigo-900/50 dark:bg-indigo-950/20 shadow-sm"
                      : "border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 opacity-80 hover:opacity-100"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
                            {cardNum || <span className="text-amber-600 text-sm font-sans font-normal">لم يُسجل</span>}
                          </span>
                          {card.isCurrent && (
                            <Badge className="bg-indigo-600 text-white gap-1 text-[11px] px-2 py-0.5">
                              <CheckCircle2 className="h-3 w-3" /> الكرت الحالي
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          جهة الإصدار: {auth || "الهيئة العامة للنقل"}
                        </div>
                      </div>
                    </div>

                    {statusVal !== undefined && statusVal !== null && (
                      <div>
                        <Badge className={getStatusBadgeVariant(statusVal)}>
                          {formatVehicleComplianceDueStatus(statusVal)}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">تاريخ الإصدار</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span dir="ltr">{issueD ? formatDate(issueD) : "-"}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">تاريخ الانتهاء</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                        <span dir="ltr">{expiryD ? formatDate(expiryD) : "-"}</span>
                      </span>
                    </div>
                    {card.notes && (
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-400 block mb-0.5">ملاحظات</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate block" title={card.notes}>
                          {card.notes}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
}
