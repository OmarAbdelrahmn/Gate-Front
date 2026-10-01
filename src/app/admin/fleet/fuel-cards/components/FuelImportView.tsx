"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchableSelect, SelectOption } from "@/components/ui/SearchableSelect";
import { listSponsors, Sponsor } from "@/lib/workforce/api";
import {
  importFuelSpreadsheet,
  validateFuelCardNumberImport,
  importFuelCardNumbers,
  validateBatchFuelCardsImport,
  executeBatchFuelCardsImport,
  getOperatingCitiesCatalog,
  JEDDAH_OPERATING_CITY_ID,
  FuelImportResult,
  FuelCardNumberImportResult,
  BatchFuelCardImportResult,
  OperatingCityOption,
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
  ShieldAlert,
  MapPin,
  Layers,
  FileText,
} from "lucide-react";

interface FuelImportViewProps {
  onNavigateToCard: (cardNumber: string) => void;
}

type ImportTab = "detailed" | "cardNumber" | "batchCards";

export function FuelImportView({ onNavigateToCard }: FuelImportViewProps) {
  const [activeImportTab, setActiveImportTab] = useState<ImportTab>("detailed");

  // Common State
  const [file, setFile] = useState<File | null>(null);
  const [operatingCityId, setOperatingCityId] = useState<string>(JEDDAH_OPERATING_CITY_ID);
  const [citiesOptions, setCitiesOptions] = useState<SelectOption[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab 1: Detailed Report State
  const [expectedMonth, setExpectedMonth] = useState("");
  const [sponsorId, setSponsorId] = useState("");
  const [sponsorsOptions, setSponsorsOptions] = useState<SelectOption[]>([]);
  const [loadingSponsors, setLoadingSponsors] = useState(false);
  const [detailedResult, setDetailedResult] = useState<FuelImportResult | null>(null);

  // Tab 2: Single Column Card Number Import State
  const [cardNumberResult, setCardNumberResult] = useState<FuelCardNumberImportResult | null>(null);
  const [cardNumberValidated, setCardNumberValidated] = useState(false);

  // Tab 3: Three Column Batch Cards Import State
  const [batchResult, setBatchResult] = useState<BatchFuelCardImportResult | null>(null);
  const [batchValidated, setBatchValidated] = useState(false);

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
    fetchCities();

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
        console.error("Failed to load sponsors list for import:", err);
      })
      .finally(() => {
        setLoadingSponsors(false);
      });
  }, []);

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
      setCardNumberValidated(false);
      setBatchValidated(false);
    }
  };

  const resetResults = () => {
    setError(null);
    setDetailedResult(null);
    setCardNumberResult(null);
    setBatchResult(null);
    setCardNumberValidated(false);
    setBatchValidated(false);
  };

  const handleTabChange = (tab: ImportTab) => {
    setActiveImportTab(tab);
    resetResults();
  };

  const handleDetailedUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("يرجى اختيار ملف اكسل (.xls أو .xlsx)");
      return;
    }
    if (!sponsorId) {
      setError("يرجى تحديد الكفيل المخصص للبطاقات الجديدة التي قد يتم إنشاؤها عبر هذا الاستيراد");
      return;
    }

    setLoading(true);
    setError(null);
    setDetailedResult(null);

    try {
      const res = await importFuelSpreadsheet(
        file,
        sponsorId,
        expectedMonth || undefined,
        operatingCityId || undefined
      );
      setDetailedResult(res);
    } catch (err: any) {
      console.error("Failed to import fuel spreadsheet:", err);
      const code = err?.errorCode || err?.title || err?.code;
      if (err?.status === 404 && code === "fuel.operating_city_not_found") {
        setError(err?.detail || "مدينة التشغيل المحددة غير موجودة، يرجى تحديث قائمة المدن والمحاولة مجدداً.");
        fetchCities();
      } else {
        setError(err?.detail || err?.message || "حدث خطأ أثناء معالجة ملف استيراد الوقود");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCardNumberValidate = async () => {
    if (!file || !sponsorId) {
      setError("يرجى اختيار الملف وتحديد الكفيل");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await validateFuelCardNumberImport(file, sponsorId, operatingCityId || undefined);
      setCardNumberResult(res);
      setCardNumberValidated(true);
    } catch (err: any) {
      const code = err?.errorCode || err?.title || err?.code;
      if (err?.status === 404 && code === "fuel.operating_city_not_found") {
        setError(err?.detail || "مدينة التشغيل المحددة غير موجودة، يرجى تحديث قائمة المدن.");
        fetchCities();
      } else {
        setError(err?.detail || err?.message || "فشل التحقق من ملف أرقام البطاقات");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCardNumberExecute = async () => {
    if (!file || !sponsorId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await importFuelCardNumbers(file, sponsorId, operatingCityId || undefined);
      setCardNumberResult(res);
      setCardNumberValidated(false);
    } catch (err: any) {
      const code = err?.errorCode || err?.title || err?.code;
      if (err?.status === 404 && code === "fuel.operating_city_not_found") {
        setError(err?.detail || "مدينة التشغيل المحددة غير موجودة.");
        fetchCities();
      } else {
        setError(err?.detail || err?.message || "فشل استيراد أرقام البطاقات");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBatchValidate = async () => {
    if (!file) {
      setError("يرجى اختيار ملف الإكسل");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await validateBatchFuelCardsImport(file, operatingCityId || undefined);
      setBatchResult(res);
      setBatchValidated(true);
    } catch (err: any) {
      const code = err?.errorCode || err?.title || err?.code;
      if (err?.status === 404 && code === "fuel.operating_city_not_found") {
        setError(err?.detail || "مدينة التشغيل المحددة غير موجودة.");
        fetchCities();
      } else {
        setError(err?.detail || err?.message || "فشل التحقق من ملف استيراد البطاقات");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBatchExecute = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await executeBatchFuelCardsImport(file, operatingCityId || undefined);
      setBatchResult(res);
      setBatchValidated(false);
    } catch (err: any) {
      const code = err?.errorCode || err?.title || err?.code;
      if (err?.status === 404 && code === "fuel.operating_city_not_found") {
        setError(err?.detail || "مدينة التشغيل المحددة غير موجودة.");
        fetchCities();
      } else {
        setError(err?.detail || err?.message || "فشل استيراد البطاقات المجمعة");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Import Methods Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
        <button
          type="button"
          onClick={() => handleTabChange("detailed")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeImportTab === "detailed"
              ? "bg-[#1167c9] text-white shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <FileSpreadsheet size={16} />
          <span>كشف حركات الوقود الشهري (PetroApp / SayaraApp)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("cardNumber")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeImportTab === "cardNumber"
              ? "bg-[#1167c9] text-white shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <CreditCard size={16} />
          <span>استيراد أرقام بطاقات بترو اب (عمود واحد: number)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("batchCards")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeImportTab === "batchCards"
              ? "bg-[#1167c9] text-white shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Layers size={16} />
          <span>استيراد عام للبطاقات مع الكفلاء (3 أعمدة)</span>
        </button>
      </div>

      {/* Main Upload Form Box */}
      <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
          <div className="size-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#1167c9] flex items-center justify-center">
            <Upload size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[var(--foreground)]">
              {activeImportTab === "detailed" && "رفع كشف حساب الوقود الشهري (PetroApp / SayaraApp)"}
              {activeImportTab === "cardNumber" && "استيراد أرقام بطاقات بترو اب (عمود واحد)"}
              {activeImportTab === "batchCards" && "استيراد عام لبطاقات الوقود (3 أعمدة: الرقم، رقم 70 للكفيل، اسم الشركة)"}
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {activeImportTab === "detailed" &&
                "يدعم رفع ملفات صيغة Excel (.xls أو .xlsx). يتم التعرف التلقائي على المزود والأعمدة وإنشاء البطاقات غير الموجودة مع تعيين مدينة التشغيل المحددة."}
              {activeImportTab === "cardNumber" &&
                "استيراد قائمة بأرقام بطاقات بترو اب من ملف إكسل بعمود واحد يحمل ترويسة number. البطاقات الجديدة ستُربط بالكفيل والمدينة المحددة."}
              {activeImportTab === "batchCards" &&
                "استيراد بطاقات من ملف إكسل يحوي 3 أعمدة (number و sponsor 70 number و company name). تكتسب البطاقات الجديدة مدينة التشغيل المختارة."}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: Detailed Report Form */}
        {activeImportTab === "detailed" && (
          <form onSubmit={handleDetailedUpload} className="space-y-4">
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
                  الحد الأقصى لحجم الملف: 25 ميجابايت (.xls أو .xlsx).
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

            {/* Operating City Selector */}
            <div className="p-4 rounded-xl border border-teal-100 dark:border-teal-900/40 bg-teal-50/20 dark:bg-teal-950/20">
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5 flex items-center gap-1.5">
                <MapPin size={15} className="text-teal-600 dark:text-teal-400" />
                <span>مدينة التشغيل للبطاقات الجديدة (اختياري - الافتراضي: جدة)</span>
              </label>
              <SearchableSelect
                value={operatingCityId}
                onChange={(val) => {
                  setOperatingCityId(val);
                  setError(null);
                }}
                options={citiesOptions}
                placeholder={loadingCities ? "جاري تحميل قائمة المدن..." : "الافتراضي: جدة / Jeddah..."}
                searchPlaceholder="بحث في أسماء أو رموز المدن..."
                disabled={loadingCities || loading}
              />
              <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                سيتم تعيين هذه المدينة للبطاقات <strong>الجديدة</strong> التي ينشئها الاستيراد. البطاقات الموجودة مسبقاً ستحتفظ بمدينتها الحالية دون تعديل.
              </p>
            </div>

            {/* Sponsor Selector (Required for new cards created by upload) */}
            <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20">
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5">
                الكفيل المخصص للبطاقات الجديدة التي تُنشأ بواسطة هذا الملف <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={sponsorId}
                onChange={(val) => {
                  setSponsorId(val);
                  setError(null);
                }}
                options={sponsorsOptions}
                placeholder={loadingSponsors ? "جاري تحميل قائمة الكفلاء..." : "اختر الكفيل للبطاقات الجديدة..."}
                searchPlaceholder="بحث في أسماء أو أرقام الكفلاء..."
                disabled={loadingSponsors || loading}
              />
              <p className="mt-1.5 text-[11px] text-[var(--muted)]">
                سيتم تعيين هذا الكفيل فقط للبطاقات <strong>الجديدة</strong> التي ينشئها الاستيراد. البطاقات الموجودة مسبقاً ستحتفظ بكفيلها الحالي دون تعديل.
              </p>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[var(--border)]">
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !file || !sponsorId}
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
        )}

        {/* Tab 2: Single Column Card Number Import Form */}
        {activeImportTab === "cardNumber" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* File Input */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5">
                  ملف الإكسل (عمود واحد بترويسة: number) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={handleFileChange}
                  className="w-full text-xs text-[var(--muted)] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#1167c9] hover:file:bg-blue-100 dark:file:bg-blue-950 dark:file:text-blue-400 cursor-pointer"
                  required
                />
              </div>

              {/* Operating City */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5 flex items-center gap-1.5">
                  <MapPin size={15} className="text-teal-600 dark:text-teal-400" />
                  <span>مدينة التشغيل للبطاقات الجديدة (الافتراضي: جدة)</span>
                </label>
                <SearchableSelect
                  value={operatingCityId}
                  onChange={(val) => {
                    setOperatingCityId(val);
                    setError(null);
                  }}
                  options={citiesOptions}
                  placeholder={loadingCities ? "جاري تحميل قائمة المدن..." : "الافتراضي: جدة / Jeddah..."}
                  searchPlaceholder="بحث في أسماء أو رموز المدن..."
                  disabled={loadingCities || loading}
                />
              </div>
            </div>

            {/* Sponsor Selector */}
            <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20">
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5">
                الكفيل المخصص للبطاقات الجديدة <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={sponsorId}
                onChange={(val) => {
                  setSponsorId(val);
                  setError(null);
                }}
                options={sponsorsOptions}
                placeholder={loadingSponsors ? "جاري تحميل قائمة الكفلاء..." : "اختر الكفيل للبطاقات..."}
                searchPlaceholder="بحث في أسماء أو أرقام الكفلاء..."
                disabled={loadingSponsors || loading}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCardNumberValidate}
                disabled={loading || !file || !sponsorId}
                className="flex items-center gap-2 h-10 px-5 rounded-xl font-bold text-xs"
              >
                <FileCheck size={16} />
                التحقق المسبق من الملف
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleCardNumberExecute}
                disabled={loading || !file || !sponsorId}
                className="flex items-center gap-2 h-10 px-6 rounded-xl font-bold text-xs shadow-md shadow-blue-500/20"
              >
                <Upload size={16} />
                {cardNumberValidated ? "تأكيد واستيراد البطاقات" : "استيراد مباشر"}
              </Button>
            </div>
          </div>
        )}

        {/* Tab 3: Three Column Batch Cards Import Form */}
        {activeImportTab === "batchCards" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* File Input */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5">
                  ملف الإكسل (الأعمدة: number, sponsor 70 number, company name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={handleFileChange}
                  className="w-full text-xs text-[var(--muted)] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#1167c9] hover:file:bg-blue-100 dark:file:bg-blue-950 dark:file:text-blue-400 cursor-pointer"
                  required
                />
              </div>

              {/* Operating City */}
              <div>
                <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5 flex items-center gap-1.5">
                  <MapPin size={15} className="text-teal-600 dark:text-teal-400" />
                  <span>مدينة التشغيل للبطاقات الجديدة (الافتراضي: جدة)</span>
                </label>
                <SearchableSelect
                  value={operatingCityId}
                  onChange={(val) => {
                    setOperatingCityId(val);
                    setError(null);
                  }}
                  options={citiesOptions}
                  placeholder={loadingCities ? "جاري تحميل قائمة المدن..." : "الافتراضي: جدة / Jeddah..."}
                  searchPlaceholder="بحث في أسماء أو رموز المدن..."
                  disabled={loadingCities || loading}
                />
                <p className="mt-1 text-[11px] text-[var(--muted)]">
                  تُسند المدينة المختارة إلى كل بطاقة جديدة في الملف. البطاقات الموجودة مسبقاً تحتفظ بمدينتها المسجلة.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
              <Button
                type="button"
                variant="secondary"
                onClick={handleBatchValidate}
                disabled={loading || !file}
                className="flex items-center gap-2 h-10 px-5 rounded-xl font-bold text-xs"
              >
                <FileCheck size={16} />
                معاينة وتحقق من الملف
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleBatchExecute}
                disabled={loading || !file}
                className="flex items-center gap-2 h-10 px-6 rounded-xl font-bold text-xs shadow-md shadow-blue-500/20"
              >
                <Upload size={16} />
                {batchValidated ? "تأكيد واستيراد الملف" : "استيراد مباشر"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tab 1 Result Dashboard */}
      {detailedResult && (
        <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                  نتيجة معالجة كشف الوقود
                  <Badge tone="green">{detailedResult.providerNameAr}</Badge>
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  الملف: <span className="font-mono font-semibold text-[var(--foreground)]">{detailedResult.originalFileName}</span> | شهر التقرير: <span className="font-mono font-bold text-[#1167c9]">{detailedResult.reportMonth}</span>
                </p>
              </div>
            </div>

            <div className="text-xs text-end text-[var(--muted)] font-mono">
              تاريخ الاستيراد: {new Date(detailedResult.importedAtUtc).toLocaleString("ar-SA")}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-800/40">
              <span className="text-[var(--muted)] block text-[11px]">صفوف الملف المصدر</span>
              <span className="font-black text-base text-[var(--foreground)] font-mono">{detailedResult.sourceRows}</span>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-800/40">
              <span className="text-[var(--muted)] block text-[11px]">أسطر البطاقات المعالجة</span>
              <span className="font-black text-base text-[var(--foreground)] font-mono">{detailedResult.cardRows}</span>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <span className="text-blue-700 dark:text-blue-400 block text-[11px]">بطاقات جديدة تم إنشاؤها</span>
              <span className="font-black text-base text-blue-700 dark:text-blue-400 font-mono">{detailedResult.createdCards}</span>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
              <span className="text-emerald-700 dark:text-emerald-400 block text-[11px]">سجلات شهرية تم إنشاؤها</span>
              <span className="font-black text-base text-emerald-700 dark:text-emerald-400 font-mono">{detailedResult.createdMonthlyRecords}</span>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800">
              <span className="text-indigo-700 dark:text-indigo-400 block text-[11px]">سجلات شهرية تم تحديثها</span>
              <span className="font-black text-base text-indigo-700 dark:text-indigo-400 font-mono">{detailedResult.updatedMonthlyRecords}</span>
            </div>

            <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20">
              <span className="text-amber-700 dark:text-amber-400 block text-[11px]">بطاقات بدون إسناد (شاغرة)</span>
              <span className="font-black text-base text-amber-700 dark:text-amber-400 font-mono">{detailedResult.unassignedCards}</span>
            </div>

            <div className="p-3.5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-950/20 col-span-2">
              <span className="text-red-700 dark:text-red-400 block text-[11px]">أخطاء الصفوف والتنبيهات</span>
              <span className="font-black text-base text-red-700 dark:text-red-400 font-mono">{detailedResult.invalidRows} خطأ</span>
            </div>
          </div>

          {/* Row-Level Errors Table */}
          {detailedResult.errors && detailedResult.errors.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400">
                <ShieldAlert size={18} />
                <span>تفاصيل أخطاء الاستيراد للصفوف ({detailedResult.errors.length}):</span>
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
                    {detailedResult.errors.map((err, idx) => (
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

      {/* Tab 2 Result Dashboard */}
      {cardNumberResult && (
        <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3 pb-3 border-b border-[var(--border)]">
            <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#1167c9] flex items-center justify-center">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                {cardNumberValidated ? "نتيجة التحقق من أرقام البطاقات" : "نتيجة استيراد أرقام البطاقات"}
              </h3>
              <p className="text-xs text-[var(--muted)]">
                إجمالي الصفوف: {cardNumberResult.sourceRows} صف | البطاقات المنشأة: {cardNumberResult.createdCards}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-[var(--border)] bg-slate-50 dark:bg-slate-800/40">
              <span className="text-[var(--muted)] block text-[11px]">الصفوف المقروءة:</span>
              <span className="font-bold text-base">{cardNumberResult.sourceRows}</span>
            </div>
            <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
              <span className="text-blue-700 dark:text-blue-400 block text-[11px]">بطاقات جديدة:</span>
              <span className="font-bold text-base text-blue-700 dark:text-blue-400">{cardNumberResult.createdCards}</span>
            </div>
            <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
              <span className="text-amber-700 dark:text-amber-400 block text-[11px]">بطاقات متخطاة / مكررة:</span>
              <span className="font-bold text-base text-amber-700 dark:text-amber-400">{cardNumberResult.skippedCards ?? 0}</span>
            </div>
          </div>

          {cardNumberValidated && (
            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={handleCardNumberExecute}
                disabled={loading}
                className="h-10 px-6 rounded-xl font-bold text-xs shadow-md shadow-blue-500/20"
              >
                تأكيد واستيراد البطاقات الآن
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3 Result Dashboard (with preview rows showing operatingCityId) */}
      {batchResult && (
        <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3 pb-3 border-b border-[var(--border)]">
            <div className="size-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
              <Layers size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                {batchValidated ? "معاينة استيراد البطاقات المجمعة" : "نتيجة استيراد البطاقات"}
              </h3>
              <p className="text-xs text-[var(--muted)]">
                الصفوف المقروءة: {batchResult.sourceRows} | بطاقات جديدة: {batchResult.createdCards} | بطاقات متخطاة: {batchResult.skippedCards ?? 0}
              </p>
            </div>
          </div>

          {/* Preview Rows Table */}
          {batchResult.previewRows && batchResult.previewRows.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[var(--foreground)]">
                معاينة الصفوف ومدينة التشغيل المقترنة:
              </h4>
              <div className="rounded-xl border border-[var(--border)] overflow-x-auto text-xs max-h-80 overflow-y-auto">
                <table className="w-full text-start">
                  <thead className="bg-slate-50 dark:bg-slate-800 font-bold border-b border-[var(--border)]">
                    <tr>
                      <th className="px-3 py-2 text-start">رقم البطاقة</th>
                      <th className="px-3 py-2 text-start">رقم 70 للكفيل</th>
                      <th className="px-3 py-2 text-start">اسم الشركة</th>
                      <th className="px-3 py-2 text-start">مدينة التشغيل الناتجة</th>
                      <th className="px-3 py-2 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] font-medium">
                    {batchResult.previewRows.map((pRow, idx) => {
                      const cityName =
                        citiesOptions.find((c) => c.value === pRow.operatingCityId)?.label ||
                        pRow.operatingCityId;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-3 py-2 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {pRow.cardNumber}
                          </td>
                          <td className="px-3 py-2 font-mono">{pRow.sponsorNumber || "—"}</td>
                          <td className="px-3 py-2">{pRow.companyName || "—"}</td>
                          <td className="px-3 py-2 font-bold text-teal-600 dark:text-teal-400">
                            {cityName}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {pRow.isExisting ? (
                              <Badge tone="orange">موجودة مسبقاً (تحتفظ بمدينتها)</Badge>
                            ) : pRow.isValid === false ? (
                              <Badge tone="red">{pRow.error || "غير صالحة"}</Badge>
                            ) : (
                              <Badge tone="green">جديدة (بالمدينة المختارة)</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {batchValidated && (
            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={handleBatchExecute}
                disabled={loading}
                className="h-10 px-6 rounded-xl font-bold text-xs shadow-md shadow-blue-500/20"
              >
                تأكيد واستيراد كل البطاقات الآن
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
