import React from "react";

export interface CashAdvanceData {
  riderName: string;
  iqamaNo: string;
  nationality: string;
  amount: number | string;
  amountInWords: string;
  date: string;
  companyName?: string;
}

export function CashAdvanceView({ data }: { data: CashAdvanceData }) {
  const formattedAmount = data.amount
    ? Number(data.amount).toLocaleString("en-US", { minimumFractionDigits: 0 })
    : "";

  // Prevent duplicate "لا غير" if data.amountInWords already includes it
  const cleanAmountInWords = data.amountInWords
    ? data.amountInWords.replace(/لا غير\s*$/, "").trim()
    : "";

  return (
    <div className="bg-white text-black p-5 sm:p-6 md:p-7 print:p-3.5 print:py-3 rounded-xl border-2 border-black font-sans text-right dir-rtl shadow-xs flex flex-col justify-between my-1 sm:my-2 min-h-[660px] md:min-h-[720px] print:min-h-0">
      {/* Top Section: Title, Date, Legal Clauses */}
      <div className="space-y-4 sm:space-y-5 print:space-y-2">
        {/* Document Title */}
        <div className="text-center pt-1 pb-1.5 print:pb-0.5">
          <h2 className="text-2xl sm:text-3xl print:text-xl font-black tracking-wide text-black underline underline-offset-8 inline-block">
            إقرار سلفة نقدية
          </h2>
        </div>

        {/* Date Line Top Right */}
        <div className="flex justify-start font-bold text-sm print:text-xs text-gray-800 pb-0.5">
          <span>التاريخ: {data.date || "   /   /      م"}</span>
        </div>

        {/* Main Body Text */}
        <div className="space-y-3.5 sm:space-y-4 print:space-y-2 text-sm sm:text-base print:text-[13px] leading-loose print:leading-relaxed font-semibold text-gray-900 px-1 sm:px-2">
          <div className="flex flex-wrap items-baseline gap-1">
            <span>أقر أنا /</span>
            <span className="font-extrabold underline underline-offset-4 text-black px-1">
              {data.riderName || "........................................................"}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-1">
            <span>الجنسية:</span>
            <span className="font-extrabold underline underline-offset-4 text-black px-1">
              {data.nationality || "........................................................"}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-1">
            <span>حامل إقامة رقم:</span>
            <span>(</span>
            <span dir="rtl" className="font-extrabold underline underline-offset-4 text-black px-1 dir-rtl inline-block">
              {data.iqamaNo || "...................................."}
            </span>
            <span>)،</span>
          </div>

          <div className="flex flex-wrap items-baseline gap-1">
            <span>بأنني استلمت مبلغ وقدره :</span>
            <span className="font-extrabold underline underline-offset-4 text-black px-2 dir-ltr inline-block">
              {formattedAmount ? `${formattedAmount}` : ".........."}
            </span>
            <span>ريال سعودي:</span>
          </div>

          <div>
            {cleanAmountInWords ? (
              <span className="font-extrabold underline underline-offset-4 text-black px-1">
                {cleanAmountInWords}{" "}
              </span>
            ) : null}
            لا غير نقداً عن سلفة نقدية من الشركة تُقسط بقسط شهري
          </div>

          <div>
            واستلم سند استلام عند سداد أي قسط وهو دين حال في ذمتي
          </div>

          <div>
            وأتعهد بوفاء الدين وليس لي الحق في فتح أي منازعة تنفيذية بشأنه أمام أي جهة حكومية.
          </div>

          <div className="pt-2 print:pt-1 font-black text-base sm:text-lg print:text-[14px] text-black">
            وهذا إقرار مني وتعهد ملزم التزاماً قانونياً، والله على ما أقول شهيد.
          </div>
        </div>
      </div>

      {/* Bottom Section: Signature & Fingerprint Block */}
      <div className="space-y-3 print:space-y-1.5 pt-4 print:pt-2">
        <div className="space-y-2.5 print:space-y-1 text-sm sm:text-base print:text-[13px] font-bold pr-1 sm:pr-2">
          <div className="flex items-center gap-2">
            <span className="font-black text-lg">•</span>
            <span className="min-w-[80px]">اسم المقر:</span>
            <span className="font-extrabold text-black underline underline-offset-4 px-2">
              {data.riderName || "........................................................"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-black text-lg">•</span>
            <span className="min-w-[80px]">التوقيع:</span>
            <span className="font-medium text-gray-700 px-2 tracking-widest">
              ........................................................
            </span>
          </div>

          <div className="flex items-center gap-3 pt-0.5">
            <span className="font-black text-lg">•</span>
            <span className="min-w-[80px]">البصمة:</span>
            <span className="inline-flex items-center justify-center w-24 h-16 print:w-20 print:h-14 border-2 border-dashed border-gray-400 rounded-lg mr-4 text-xs text-gray-400 font-normal">
              بصمة الإبهام
            </span>
          </div>
        </div>

        {/* Bottom Horizontal Line */}
        <div className="pt-1.5 border-t border-black/60"></div>
      </div>
    </div>
  );
}
