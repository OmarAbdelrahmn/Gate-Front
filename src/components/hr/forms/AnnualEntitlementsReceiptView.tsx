import React from "react";

export interface AnnualEntitlementsData {
  companyName?: string;
  date?: string;
  employeeName?: string;
  nationality?: string;
  iqamaNo?: string;
  jobTitle?: string;
  periodFrom?: string;
  periodTo?: string;
  amountReceived?: number | string;
  amountInWords?: string;
  hrManagerName?: string;
  generalManagerName?: string;
}

export function AnnualEntitlementsReceiptView({ data }: { data: AnnualEntitlementsData }) {
  const compName = data.companyName || "شركة اكسبرس جابت";
  const formattedDate = data.date || "..... / ..... / 2026 م";
  const formattedAmount = data.amountReceived
    ? Number(data.amountReceived).toLocaleString("en-US", { minimumFractionDigits: 0 })
    : "";

  return (
    <div className="bg-white text-black p-8 md:p-12 rounded-xl border-2 border-black font-sans leading-relaxed text-right dir-rtl shadow-xs page-break-inside-avoid print-container min-h-[750px] flex flex-col justify-between">
      <div className="space-y-6">
        {/* Title & Company Header */}
        <div className="space-y-2 pt-2 pb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-black tracking-wide">
            إقرار استلام كافة المستحقات السنوية
          </h1>
          <div className="text-lg font-bold text-black flex items-center gap-2">
            <span>شركة :</span>
            <span className="font-extrabold underline px-2">{compName}</span>
          </div>
        </div>

        {/* Date Top Right */}
        <div className="font-bold text-base md:text-lg pr-2">
          <span>التاريخ:</span>
          <span className="font-extrabold px-2 dir-ltr inline-block">{formattedDate}</span>
        </div>

        {/* Section 1: Employee Information */}
        <div className="space-y-3 font-bold text-base md:text-lg pr-2 pt-2">
          <div className="flex items-start gap-2">
            <span className="whitespace-nowrap font-black">اسم الموظف :</span>
            <span className="font-extrabold text-black underline px-2 break-all">
              {data.employeeName || "................................................................................"}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <span className="whitespace-nowrap font-black">الجنسية :</span>
            <span className="font-extrabold text-black underline px-2">
              {data.nationality || "................................................................................"}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <span className="whitespace-nowrap font-black">رقم الاقامة :</span>
            <span className="font-extrabold text-black underline px-2 dir-ltr inline-block">
              {data.iqamaNo || "................................................................................"}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <span className="whitespace-nowrap font-black">الوظيفة :</span>
            <span className="font-extrabold text-black underline px-2">
              {data.jobTitle || "................................................................................"}
            </span>
          </div>
        </div>

        {/* Section 2: Statement of Period & Amount */}
        <div className="space-y-4 pt-4 font-semibold text-base md:text-lg text-gray-900 leading-loose pr-2">
          <div>
            اقر انا المذكور اعلاه انني استلمت كافة مستحقاتي السنوية عن الفتره من تاريخ:{" "}
            <span className="font-extrabold text-black underline px-2 dir-ltr inline-block">
              {data.periodFrom || "..... / ..... / ....."}
            </span>{" "}
            الي تاريخ:{" "}
            <span className="font-extrabold text-black underline px-2 dir-ltr inline-block">
              {data.periodTo || "..... / ..... / ....."}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span>قيمة المبلغ المستلم /</span>
            <span className="font-extrabold text-black underline px-2 text-xl dir-ltr inline-block">
              {formattedAmount || "...................................."}
            </span>
            <span>ريال سعودي</span>
            {data.amountInWords && (
              <span className="font-extrabold text-black pr-2">({data.amountInWords})</span>
            )}
          </div>

          <p className="font-bold text-black text-base md:text-lg pt-2">
            أقر بأنني استلمت جميع مستحقاتي استلاماً كاملاً ونهائياً وليس لي أي مطالبات مالية تخص الإجازة السنوية عن الفترة المذكورة.
          </p>
        </div>

        {/* Section 3: Employee Signature */}
        <div className="space-y-3 font-bold text-base md:text-lg pr-2 pt-4 border-t border-black">
          <div className="flex items-start gap-2">
            <span className="whitespace-nowrap font-black">اسم الموظف :</span>
            <span className="font-extrabold text-black underline px-2">
              {data.employeeName || "................................................................................"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap font-black">التوقيع :</span>
            <span className="font-extrabold text-black">................................................................................</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap font-black">التاريخ:</span>
            <span className="font-extrabold text-black px-2 dir-ltr inline-block">{formattedDate}</span>
          </div>
        </div>

        {/* Section 4: Company Approvals */}
        <div className="space-y-3 font-bold text-base md:text-lg pr-2 pt-4 border-t border-black">
          <div className="font-extrabold text-black text-lg underline mb-2">اعتماد الشركة</div>

          <div className="flex items-start gap-2">
            <span className="whitespace-nowrap font-black">الموارد البشرية :</span>
            <span className="font-extrabold text-black underline px-2">
              {data.hrManagerName || "................................................................................"}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <span className="whitespace-nowrap font-black">المدير العام :</span>
            <span className="font-extrabold text-black underline px-2">
              {data.generalManagerName || "................................................................................"}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <span className="whitespace-nowrap font-black">التوقيع والختم :</span>
            <span className="font-extrabold text-black">................................................................................</span>
          </div>
        </div>
      </div>

      {/* Bottom Horizontal Line */}
      <div className="mt-8 pt-4 border-t-2 border-black"></div>
    </div>
  );
}
