"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  importFuelSpreadsheet,
  FuelImportResult,
} from "@/lib/fleet/fuel-cards-api";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileCheck,
  CreditCard,
  UserPlus,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

interface FuelImportViewProps {
  onNavigateToCard: (cardNumber: string) => void;
}

export function FuelImportView({ onNavigateToCard }: FuelImportViewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [expectedMonth, setExpectedMonth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FuelImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      // Max 25 MiB
      if (selected.size > 25 * 1024 * 1024) {
        setError("حجم الملف يتجاوز الحد الأقصى المسموح (25 ميجابايت)");
        setFile(null);
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("يرجى اختيار ملف اكسل (.xls أو .xlsx)");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await importFuelSpreadsheet(file, expectedMonth || undefined);
      setResult(res);
    } catch (err: any) {
      console.error("Failed to import fuel spreadsheet:", err);
      setError(err?.message || "حدث خطأ أثناء معالجة ملف استيراد الوقود");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Upload Form Box */}
      <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
          <div className="size-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#1167c9] flex items-center justify-center">
            <Upload size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[var(--foreground)]">
              رفع ملف استيراد الوقود (PetroApp / SayaraApp)
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              يدعم رفع ملفات صيغة Excel (.xls أو .xlsx). يتم التعرف التلقائي على المزود والأعمدة وإنشاء البطاقات غير الموجودة.
            </p>
          </div>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Input */}
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5">
                اختر ملف الإكسل <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileChange}
                className="w-full text-xs text-[var(--muted)] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#1167c9] hover:file:bg-blue-100 dark:file:bg-blue-950 dark:file:text-blue-400 cursor-pointer"
                required
              />
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                الحد الأقصى لحجم الملف: 25 ميجابايت.
              </p>
            </div>

            {/* Expected Month */}
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5">
                الشهر المتوقع للملف (اختياري)
              </label>
              <input
                type="date"
                value={expectedMonth}
                onChange={(e) => setExpectedMonth(e.target.value)}
                placeholder="YYYY-MM-01"
                className="w-full h-10 px-3 text-xs font-bold font-mono rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
              />
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                إذا تم تحديده، سيتم التحقق من مطابقة الشهر المكتشف بالملف مع الشهر المحدد وتجنب الخلط.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-[var(--border)]">
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !file}
              className="flex items-center gap-2 h-11 px-8 rounded-xl font-bold text-xs shadow-md shadow-blue-500/20"
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  جاري معالجة الملف واستيراده...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  رفع وتوليد السجلات
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Import Result Dashboard */}
      {result && (
        <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                  نتيجة معالجة الاستيراد
                  <Badge tone="green">{result.providerNameAr}</Badge>
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  الملف: <span className="font-mono font-semibold text-[var(--foreground)]">{result.originalFileName}</span> | شهر التقرير: <span className="font-mono font-bold text-[#1167c9]">{result.reportMonth}</span>
                </p>
              </div>
            </div>

            <div className="text-xs text-end text-[var(--muted)] font-mono">
              تاريخ الاستيراد: {new Date(result.importedAtUtc).toLocaleString("ar-SA")}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-800/40">
              <span className="text-[var(--muted)] block text-[11px]">صفوف الملف المصدر</span>
              <span className="font-black text-base text-[var(--foreground)] font-mono">{result.sourceRows}</span>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-800/40">
              <span className="text-[var(--muted)] block text-[11px]">أسطر البطاقات المعالجة</span>
              <span className="font-black text-base text-[var(--foreground)] font-mono">{result.cardRows}</span>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <span className="text-blue-700 dark:text-blue-400 block text-[11px]">بطاقات جديدة تم إنشاؤها</span>
              <span className="font-black text-base text-blue-700 dark:text-blue-400 font-mono">{result.createdCards}</span>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
              <span className="text-emerald-700 dark:text-emerald-400 block text-[11px]">سجلات شهرية تم إنشاؤها</span>
              <span className="font-black text-base text-emerald-700 dark:text-emerald-400 font-mono">{result.createdMonthlyRecords}</span>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800">
              <span className="text-indigo-700 dark:text-indigo-400 block text-[11px]">سجلات شهرية تم تحديثها</span>
              <span className="font-black text-base text-indigo-700 dark:text-indigo-400 font-mono">{result.updatedMonthlyRecords}</span>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20">
              <span className="text-amber-700 dark:text-amber-400 block text-[11px]">بطاقات بدون إسناد (شاغرة)</span>
              <span className="font-black text-base text-amber-700 dark:text-amber-400 font-mono">{result.unassignedCards}</span>
            </div>

            <div className="p-3.5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-950/20 col-span-2">
              <span className="text-red-700 dark:text-red-400 block text-[11px]">أخطاء الصفوف والتنبيهات</span>
              <span className="font-black text-base text-red-700 dark:text-red-400 font-mono">{result.invalidRows} خطأ</span>
            </div>
          </div>

          {/* Row-Level Errors Table */}
          {result.errors && result.errors.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400">
                <ShieldAlert size={18} />
                <span>تفاصيل أخطاء الاستيراد للصفوف ({result.errors.length}):</span>
              </div>

              <div className="rounded-xl border border-red-200 dark:border-red-900/50 overflow-hidden text-xs">
                <table className="w-full text-start">
                  <thead className="bg-red-50 dark:bg-red-950/60 font-bold text-red-900 dark:text-red-200 border-b border-red-200 dark:border-red-900">
                    <tr>
                      <th className="px-4 py-2.5 text-start">رقم الصف</th>
                      <th className="px-4 py-2.5 text-start">رقم البطاقة</th>
                      <th className="px-4 py-2.5 text-start">رمز الخطأ</th>
                      <th className="px-4 py-2.5 text-start">تفاصيل رسالة الخطأ</th>
                      <th className="px-4 py-2.5 text-center">الإجراء السريع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 dark:divide-red-950/40 font-medium">
                    {result.errors.map((err, idx) => (
                      <tr key={idx} className="hover:bg-red-50/40 dark:hover:bg-red-950/20">
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {err.rowNumber}
                        </td>
                        <td className="px-4 py-2.5 font-bold">
                          {err.cardNumber ? (
                            <span dir="auto" className="fuel-plate text-blue-600 dark:text-blue-400">
                              {err.cardNumber}
                            </span>
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-red-600 dark:text-red-400">
                          {err.code}
                        </td>
                        <td className="px-4 py-2.5 text-red-700 dark:text-red-300">
                          {err.message}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {err.cardNumber ? (
                            <Button
                              variant="secondary"
                              onClick={() => onNavigateToCard(err.cardNumber!)}
                              className="h-8 px-3 text-[11px] font-bold rounded-lg border-blue-200 text-[#1167c9] dark:text-blue-400 hover:bg-blue-50"
                            >
                              <UserPlus size={13} className="ml-1" />
                              إسناد البطاقة
                            </Button>
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
