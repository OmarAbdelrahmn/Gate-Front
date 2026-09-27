import React from "react";

export interface DisciplinaryActionData {
  companyName?: string;
  date?: string;
  employeeName?: string;
  jobTitle?: string;
  iqamaNo?: string;
  department?: string;
  violation?: string;
  reasons?: string;
  actionTaken?: string;
  directManagerOpinion?: string;
  hrManagerName?: string;
  generalManagerName?: string;
}

export function DisciplinaryActionView({ data }: { data: DisciplinaryActionData }) {
  const compName = data.companyName || "شركة اكسبرس جابت";
  const formattedDate = data.date || "..... / ..... / 2026 م";

  return (
    <div className="bg-white text-black p-4 sm:p-5 md:p-6 print:p-3 print:py-2 rounded-xl border-2 border-black font-sans text-right dir-rtl shadow-xs flex flex-col justify-between my-1 print:my-0 min-h-[660px] md:min-h-[720px] print:min-h-0">
      <div className="space-y-3 sm:space-y-3.5 print:space-y-1.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Document Title */}
          <div className="text-center pt-0.5 pb-1 print:pb-0.5">
            <h2 className="text-2xl sm:text-3xl print:text-lg font-black tracking-wide text-black underline underline-offset-8 inline-block">
              نموذج إجراء جزائي (Disciplinary Action)
            </h2>
          </div>

          {/* Top Meta Strip */}
          <div className="flex justify-between items-center text-xs print:text-[11px] font-bold bg-gray-50/80 p-2 print:p-1 rounded-md border border-black/30 mb-2.5 print:mb-1.5">
            <div>
              <span className="text-gray-700">جهة العمل: </span>
              <span className="font-black text-black">{compName}</span>
            </div>
            <div>
              <span className="text-gray-700">تاريخ الإجراء: </span>
              <span className="font-extrabold text-black font-mono dir-ltr inline-block">{formattedDate}</span>
            </div>
            <div>
              <span className="text-gray-700">الرقم المرجعي: </span>
              <span className="font-extrabold text-black font-mono">
                DA-{data.iqamaNo ? data.iqamaNo.slice(-4) : "2026/01"}
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
                  <span className="font-bold text-gray-700 min-w-[85px]">المسمى الوظيفي:</span>
                  <span className="font-black text-black flex-1">
                    {data.jobTitle || "...................."}
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
                  <span className="font-bold text-gray-700 min-w-[75px]">الإدارة / القسم:</span>
                  <span className="font-black text-black flex-1">
                    {data.department || "إدارة العمليات والتشغيل"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Violation & Action Taken */}
          <div className="space-y-1.5 print:space-y-0.5 mb-2.5 print:mb-1.5">
            <h3 className="font-black text-xs sm:text-sm print:text-[11.5px] text-black border-r-3 border-black pr-1.5">
              ثانياً: تفاصيل المخالفة والقرار الجزائي
            </h3>
            <div className="border border-black rounded-lg p-2.5 print:p-2 bg-gray-50/60 text-xs sm:text-sm print:text-[11px] space-y-2 print:space-y-1">
              <div className="flex items-start gap-1.5">
                <span className="font-bold text-gray-800 min-w-[100px]">المخالفة المرتكبة:</span>
                <span className="font-black text-red-700 dark:text-red-900 flex-1">
                  {data.violation || "................................................................................"}
                </span>
              </div>

              {data.reasons && (
                <div className="flex items-start gap-1.5 bg-white p-1.5 rounded border border-black/20">
                  <span className="font-bold text-gray-700 min-w-[130px]">الأسباب / المبررات:</span>
                  <span className="text-gray-900 flex-1">
                    {data.reasons}
                  </span>
                </div>
              )}

              <div className="flex items-start gap-1.5 bg-red-50/60 p-2 print:p-1.5 rounded border border-red-300">
                <span className="font-black text-black min-w-[125px]">الإجراء الجزائي المتخذ:</span>
                <span className="font-black text-red-900 underline decoration-1 underline-offset-2 flex-1">
                  {data.actionTaken || "خصم أجر يوم من الراتب / لفت نظر كتابي"}
                </span>
              </div>

              <div className="flex items-start gap-1.5 pt-0.5">
                <span className="font-bold text-gray-700 min-w-[110px]">رأي المدير المباشر:</span>
                <span className="font-semibold text-gray-900 flex-1">
                  {data.directManagerOpinion || "اعتماد تطبيق الإجراء الجزائي وفق اللائحة."}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Employee Undertaking */}
          <div className="space-y-1.5 print:space-y-0.5 mb-2.5 print:mb-1.5">
            <h3 className="font-black text-xs sm:text-sm print:text-[11.5px] text-black border-r-3 border-black pr-1.5">
              ثالثاً: إقرار وتعهد الموظف
            </h3>
            <div className="border border-black rounded-lg p-2.5 print:p-2 bg-gray-50/50 space-y-2 print:space-y-1">
              <p className="text-xs sm:text-sm print:text-[10.5px] font-semibold text-gray-900 leading-relaxed text-justify">
                أقر أنا الموظف المذكور أعلاه بأنني اطلعت على سبب الجزاء الموقع بحقي، وأتعهد بعدم تكرار المخالفة مستقبلاً والالتزام التام بالتعليمات وأنظمة العمل، وفي حال تكرار المخالفة أتحمل ما يترتب عليها من إجراءات وعقوبات تأديبية وفق نظام العمل ولوائح الشركة الداخلية.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-1 border-t border-black/20 text-xs sm:text-sm print:text-[11px] font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="min-w-[120px]">توقيع الموظف بالعلم:</span>
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
              رابعاً: الاعتمادات الرسمية
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
                  <span className="font-bold text-gray-800 block text-[11px]">اعتماد المدير العام:</span>
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
          * يُحفظ هذا النموذج في الملف الوظيفي للموظف لدى إدارة الموارد البشرية بعد استيفاء التوقيعات.
        </div>
      </div>
    </div>
  );
}
