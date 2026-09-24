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

  return (
    <div className="bg-white text-black p-4 sm:p-5 md:p-6 print:p-4 rounded-xl border-2 border-black font-sans leading-normal text-right dir-rtl shadow-xs flex flex-col justify-between my-1 sm:my-2">
      <div>
        {/* Document Title */}
        <div className="text-center my-1.5 sm:my-2 print:my-1">
          <h2 className="text-xl sm:text-2xl font-black tracking-wide text-black underline underline-offset-4">
            إقرار سلفة نقدية
          </h2>
        </div>

        {/* Date Line Top Right */}
        <div className="flex justify-start font-bold text-xs sm:text-sm mb-3 print:mb-2 text-gray-800">
          <span>التاريخ: {data.date || "   /   /      م"}</span>
        </div>

        {/* Main Body Text */}
        <div className="space-y-2 sm:space-y-2.5 print:space-y-1.5 text-xs sm:text-sm md:text-base leading-relaxed font-semibold text-gray-900 px-1 sm:px-2">
          <div>
            أقر أنا /{" "}
            <span className="font-extrabold underline text-black px-1">
              {data.riderName || "........................................................"}
            </span>
          </div>

          <div>
            الجنسية:{" "}
            <span className="font-extrabold underline text-black px-1">
              {data.nationality || "........................................................"}
            </span>
          </div>

          <div>
            حامل إقامة رقم: ({" "}
            <span dir="rtl" className="font-extrabold text-black px-1 dir-rtl inline-block">
              {data.iqamaNo || "...................................."}
            </span>{" "}
            )،
          </div>

          <div>
            بأنني استلمت مبلغ وقدره :{" "}
            <span className="font-extrabold underline text-black px-1 dir-ltr inline-block">
              {formattedAmount ? `${formattedAmount}` : ".........."}
            </span>{" "}
            ريال سعودي:
          </div>

          <div>
            {data.amountInWords ? (
              <span className="font-extrabold underline text-black px-1">
                {data.amountInWords}{" "}
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

          <div className="pt-2 print:pt-1 font-bold text-sm sm:text-base md:text-lg text-black">
            وهذا إقرار مني وتعهد ملزم التزاماً قانونياً، والله على ما أقول شهيد.
          </div>
        </div>

        {/* Signature & Fingerprint Block */}
        <div className="mt-4 sm:mt-5 print:mt-3 space-y-2 text-xs sm:text-sm md:text-base font-bold pr-1 sm:pr-2">
          <div className="flex items-center gap-2">
            <span className="font-black text-lg">•</span>
            <span>اسم المقر:</span>
            <span className="font-extrabold text-black underline px-2">
              {data.riderName || "........................................................"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-black text-lg">•</span>
            <span>التوقيع: ................................................</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-black text-lg">•</span>
            <span>البصمة:</span>
            <span className="inline-block w-20 h-12 sm:w-24 sm:h-14 border-2 border-dashed border-gray-400 rounded-md mr-4 align-middle"></span>
          </div>
        </div>
      </div>

      {/* Bottom Horizontal Line */}
      <div className="mt-3 sm:mt-4 print:mt-2 pt-2 border-t border-black/60"></div>
    </div>
  );
}
