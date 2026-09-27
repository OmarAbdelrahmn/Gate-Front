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
    <div className="bg-white text-black p-4 sm:p-5 md:p-6 print:p-3 print:py-2 rounded-xl border-2 border-black font-sans text-right dir-rtl shadow-xs flex flex-col justify-between my-1 print:my-0 min-h-[660px] md:min-h-[720px] print:min-h-0">
      <div className="space-y-3 sm:space-y-3.5 print:space-y-1.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Document Title */}
          <div className="text-center pt-0.5 pb-1 print:pb-0.5">
            <h2 className="text-2xl sm:text-3xl print:text-lg font-black tracking-wide text-black underline underline-offset-8 inline-block">
              إقرار استلام كافة المستحقات السنوية
            </h2>
          </div>

          {/* Top Meta Strip */}
          <div className="flex justify-between items-center text-xs print:text-[11px] font-bold bg-gray-50/80 p-2 print:p-1 rounded-md border border-black/30 mb-2.5 print:mb-1.5">
            <div>
              <span className="text-gray-700">جهة العمل: </span>
              <span className="font-black text-black">{compName}</span>
            </div>
            <div>
              <span className="text-gray-700">تاريخ الإقرار: </span>
              <span className="font-extrabold text-black font-mono dir-ltr inline-block">{formattedDate}</span>
            </div>
            <div>
              <span className="text-gray-700">الرقم المرجعي: </span>
              <span className="font-extrabold text-black font-mono">
                AR-{data.iqamaNo ? data.iqamaNo.slice(-4) : "2026/01"}
              </span>
            </div>
          </div>

          {/* Section 1: Employee Basic Info */}
          <div className="space-y-1.5 print:space-y-0.5 mb-2.5 print:mb-1.5">
            <h3 className="font-black text-xs sm:text-sm print:text-[11.5px] text-black border-r-3 border-black pr-1.5">
              أولاً: بيانات الموظف
            </h3>
            <div className="border border-black rounded-lg p-2.5 print:p-1.5 bg-gray-50/60 font-semibold text-xs sm:text-sm print:text-[11px] space-y-1.5 print:space-y-0.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-700 min-w-[70px]">اسم الموظف:</span>
                  <span className="font-black text-black underline decoration-1 underline-offset-2 flex-1 truncate">
                    {data.employeeName || "........................................................"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-700 min-w-[50px]">الجنسية:</span>
                  <span className="font-black text-black flex-1">
                    {data.nationality || "...................."}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-700 min-w-[105px]">رقم الإقامة / الهوية:</span>
                  <span dir="rtl" className="font-black text-black font-mono dir-rtl flex-1">
                    {data.iqamaNo || "...................................."}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-700 min-w-[85px]">المسمى الوظيفي:</span>
                  <span className="font-black text-black flex-1">
                    {data.jobTitle || "سائق مندوب توصيل"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Statement of Period & Amount */}
          <div className="space-y-1.5 print:space-y-0.5 mb-2.5 print:mb-1.5">
            <h3 className="font-black text-xs sm:text-sm print:text-[11.5px] text-black border-r-3 border-black pr-1.5">
              ثانياً: تفاصيل الفترة المالية والمستحقات المستلمة
            </h3>
            <div className="border border-black rounded-lg p-2.5 print:p-2 bg-gray-50/60 text-xs sm:text-sm print:text-[11px] space-y-2 print:space-y-1">
              <div className="flex items-center justify-between bg-white p-2 print:p-1.5 rounded border border-black/30">
                <span className="font-extrabold text-gray-800">قيمة المبلغ المالي المستلم:</span>
                <span className="font-black text-black text-sm sm:text-base print:text-xs dir-ltr font-mono">
                  {formattedAmount || "...................."} ريال سعودي
                </span>
              </div>

              {data.amountInWords && (
                <div className="flex items-baseline gap-2 pt-0.5">
                  <span className="font-bold text-gray-700 min-w-[100px]">المبلغ تفقيطاً بالعربية:</span>
                  <span className="font-black text-black underline decoration-1 underline-offset-2 flex-1">
                    {data.amountInWords}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-black/20 text-xs font-semibold">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-gray-700">عن الفترة من تاريخ:</span>
                  <span className="font-mono dir-ltr font-bold text-black">{data.periodFrom || "..... / ..... / ....."}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-gray-700">إلى غاية تاريخ:</span>
                  <span className="font-mono dir-ltr font-bold text-black">{data.periodTo || "..... / ..... / ....."}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Final Discharge & Undertaking */}
          <div className="space-y-1.5 print:space-y-0.5 mb-2.5 print:mb-1.5">
            <h3 className="font-black text-xs sm:text-sm print:text-[11.5px] text-black border-r-3 border-black pr-1.5">
              ثالثاً: المخالصة والإقرار النهائي
            </h3>
            <div className="border border-black rounded-lg p-2.5 print:p-2 bg-gray-50/50 space-y-2 print:space-y-1">
              <p className="text-xs sm:text-sm print:text-[10.5px] font-semibold text-gray-900 leading-relaxed text-justify">
                أقر أنا الموظف الموضح اسمي وبياناتي أعلاه بأنني استلمت كافة مستحقاتي السنوية عن الفترة الموضحة بعاليه استلاماً كاملاً وتاماً ونهائياً، وأبرئ ذمة الشركة من أي مستحقات أو مطالبات مالية تخص الإجازة السنوية عن تلك الفترة، ويُعد هذا إقراراً ملزماً ونهائياً ومسقطاً لأي حق في المطالبة.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-1 border-t border-black/20 text-xs sm:text-sm print:text-[11px] font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="min-w-[70px]">توقيع الموظف:</span>
                  <span className="border-b border-dotted border-black flex-1 text-transparent select-none">........................</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="min-w-[45px]">التاريخ:</span>
                  <span className="font-mono dir-ltr">{formattedDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Official Approvals */}
          <div className="space-y-1.5 print:space-y-0.5">
            <h3 className="font-black text-xs sm:text-sm print:text-[11.5px] text-black border-r-3 border-black pr-1.5">
              رابعاً: اعتماد إدارة الشركة
            </h3>
            <div className="border border-black rounded-lg p-2.5 print:p-2 bg-gray-50/50">
              <div className="grid grid-cols-3 gap-3 text-xs sm:text-sm print:text-[10.5px] font-semibold text-center">
                {/* HR Manager */}
                <div className="space-y-1 border-l border-black/20 pl-2">
                  <span className="font-bold text-gray-800 block text-[11px]">مسؤول الموارد البشرية:</span>
                  <span className="font-black text-black block text-[11px] truncate">
                    {data.hrManagerName || "مسؤول الموارد البشرية"}
                  </span>
                  <div className="h-6 border-b border-dotted border-black"></div>
                  <span className="text-[10px] text-gray-600 block pt-0.5">التاريخ: {formattedDate}</span>
                </div>

                {/* General Manager */}
                <div className="space-y-1 border-l border-black/20 pl-2">
                  <span className="font-bold text-gray-800 block text-[11px]">المدير العام:</span>
                  <span className="font-black text-black block text-[11px] truncate">
                    {data.generalManagerName || "المدير العام"}
                  </span>
                  <div className="h-6 border-b border-dotted border-black"></div>
                  <span className="text-[10px] text-gray-600 block pt-0.5">التاريخ: {formattedDate}</span>
                </div>

                {/* Official Stamp */}
                <div className="flex flex-col items-center justify-center">
                  <span className="font-bold text-gray-800 text-[11px] mb-1">الختم الرسمي</span>
                  <div className="w-24 h-11 print:w-20 print:h-9 rounded border border-dashed border-black/50 flex items-center justify-center text-[9px] text-gray-400 font-normal">
                    ختم الشركة
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="text-[9.5px] print:text-[9px] text-gray-500 font-medium text-center border-t border-black/20 pt-1">
          * يُحفظ أصل هذا الإقرار في ملف الموظف لدى الإدارة المالية وإدارة الموارد البشرية.
        </div>
      </div>
    </div>
  );
}
