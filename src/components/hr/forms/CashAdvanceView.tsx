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
    <div className="bg-white text-black p-8 md:p-12 rounded-xl border-2 border-black font-sans leading-relaxed text-right dir-rtl shadow-xs page-break-inside-avoid print-container min-h-[650px] flex flex-col justify-between">
      <div>
        {/* Document Title */}
        <div className="text-center mt-2 mb-8">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-wide text-black">
            إقرار سلفة نقدية
          </h2>
        </div>

        {/* Date Line Top Right */}
        <div className="flex justify-start font-bold text-base md:text-lg mb-8">
          <span>التاريخ: {data.date || "   /   /      م"}</span>
        </div>

        {/* Main Body Text */}
        <div className="space-y-5 text-base md:text-lg leading-loose font-semibold text-gray-900 px-2">
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
            <span className="font-extrabold text-black px-1">
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

          <div className="pt-4 font-bold text-lg md:text-xl">
            وهذا إقرار مني وتعهد ملزم التزاماً قانونياً، والله على ما أقول شهيد.
          </div>
        </div>

        {/* Signature & Fingerprint Block */}
        <div className="mt-12 space-y-4 text-base md:text-lg font-bold pr-2">
          <div className="flex items-center gap-2">
            <span className="font-black text-xl">•</span>
            <span>اسم المقر:</span>
            <span className="font-extrabold text-black underline px-2">
              {data.riderName || "........................................................"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-black text-xl">•</span>
            <span>التوقيع: ................................................</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-black text-xl">•</span>
            <span>البصمة:</span>
            <span className="inline-block w-24 h-16 border-2 border-dashed border-gray-400 rounded-md mr-4 align-middle"></span>
          </div>
        </div>
      </div>

      {/* Bottom Horizontal Line */}
      <div className="mt-12 pt-4 border-t-2 border-black"></div>
    </div>
  );
}
