import React from "react";

export interface WorkCommencementData {
  companyName?: string;
  date?: string;
  employeeName?: string;
  nationality?: string;
  iqamaNo?: string;
  jobTitle?: string;
  department?: string;
  workplace?: string;
  contractStartDate?: string;
  actualStartDate?: string;
  hrManagerName?: string;
}

export function WorkCommencementView({ data }: { data: WorkCommencementData }) {
  const compName = data.companyName || "شركة اكسبرس جابت";
  const formattedDate = data.date || "..... / ..... / 2026 م";

  return (
    <div className="bg-white text-black p-4 sm:p-5 md:p-6 print:p-3 print:py-2 rounded-xl border-2 border-black font-sans text-right dir-rtl shadow-xs flex flex-col justify-between my-1 print:my-0 min-h-[660px] md:min-h-[720px] print:min-h-0">
      <div className="space-y-3 sm:space-y-3.5 print:space-y-1.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Document Title */}
          <div className="text-center pt-0.5 pb-1 print:pb-0.5">
            <h2 className="text-2xl sm:text-3xl print:text-lg font-black tracking-wide text-black underline underline-offset-8 inline-block">
              نموذج مباشرة عمل
            </h2>
          </div>

          {/* Top Meta Strip */}
          <div className="flex justify-between items-center text-xs print:text-[11px] font-bold bg-gray-50/80 p-2 print:p-1 rounded-md border border-black/30 mb-2.5 print:mb-1.5">
            <div>
              <span className="text-gray-700">الشركة: </span>
              <span className="font-black text-black">{compName}</span>
            </div>
            <div>
              <span className="text-gray-700">تاريخ المباشرة الفعلي: </span>
              <span className="font-extrabold text-black font-mono dir-ltr inline-block">
                {data.actualStartDate || formattedDate}
              </span>
            </div>
            <div>
              <span className="text-gray-700">تاريخ التحرير: </span>
              <span className="font-extrabold text-black font-mono dir-ltr inline-block">
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Section 1: Employee Details (بيانات الموظف) */}
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
                  <span className="font-bold text-gray-700 min-w-[105px]">رقم الهوية / الإقامة:</span>
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

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-700 min-w-[75px]">الإدارة / القسم:</span>
                  <span className="font-black text-black flex-1">
                    {data.department || "إدارة العمليات والتشغيل"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-700 min-w-[65px]">مكان العمل:</span>
                  <span className="font-black text-black flex-1">
                    {data.workplace || "جده - المركز الرئيسي"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-700 min-w-[135px]">تاريخ البدء حسب العقد:</span>
                  <span className="font-black text-black font-mono dir-ltr">
                    {data.contractStartDate || formattedDate}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-700 min-w-[125px]">تاريخ المباشرة الفعلي:</span>
                  <span className="font-black text-black font-mono dir-ltr">
                    {data.actualStartDate || formattedDate}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Declaration & Undertaking (الإقرار والتعهد) */}
          <div className="space-y-1.5 print:space-y-0.5 mb-2.5 print:mb-1.5">
            <h3 className="font-black text-xs sm:text-sm print:text-[11.5px] text-black border-r-3 border-black pr-1.5">
              ثانياً: إقرار وتعهد الموظف بالمباشرة
            </h3>
            <div className="border border-black rounded-lg p-2.5 print:p-2 bg-gray-50/50 space-y-2 print:space-y-1">
              <p className="text-xs sm:text-sm print:text-[11px] font-semibold text-gray-900 leading-relaxed text-justify">
                أقر أنا الموظف الموضح بياناتي أعلاه بأنني باشرت عملي الفعلي لدى الشركة اعتباراً من تاريخ المباشرة الموضح أعلاه، وأتعهد بالالتزام بأداء كافة المهام والواجبات الوظيفية الموكلة إليّ بإخلاص وأمانة، والتقيد التام بكافة لوائح وتنظيمات وسياسات العمل المعتمدة بالشركة.
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

          {/* Section 3: HR Approval (اعتماد إدارة الموارد البشرية) */}
          <div className="space-y-1.5 print:space-y-0.5">
            <h3 className="font-black text-xs sm:text-sm print:text-[11.5px] text-black border-r-3 border-black pr-1.5">
              ثالثاً: اعتماد إدارة الموارد البشرية
            </h3>
            <div className="border border-black rounded-lg p-2.5 print:p-2 bg-gray-50/50 space-y-2 print:space-y-1">
              <p className="text-xs sm:text-sm print:text-[11px] font-bold text-gray-900">
                تمت مراجعة بيانات الموظف المذكور أعلاه، وتم التأكد من مباشرة العمل في الموعد المحدد واعتماده رسمياً.
              </p>

              <div className="grid grid-cols-3 gap-3 pt-1 border-t border-black/20 text-xs sm:text-sm print:text-[11px] font-semibold">
                <div className="space-y-1">
                  <div>
                    <span className="text-gray-700 font-bold block text-[10.5px]">مسؤول الموارد البشرية:</span>
                    <span className="font-black text-black block truncate">
                      {data.hrManagerName || "مسؤول الموارد البشرية"}
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="text-gray-700 font-bold block text-[10.5px]">التوقيع:</span>
                    <span className="border-b border-dotted border-black block w-32">&nbsp;</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div>
                    <span className="text-gray-700 font-bold block text-[10.5px]">تاريخ الاعتماد:</span>
                    <span className="font-mono dir-ltr font-bold block">
                      {formattedDate}
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="text-gray-700 font-bold block text-[10.5px]">حالة الاعتماد:</span>
                    <span className="font-black text-emerald-800 block">معتمد ومباشر</span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <span className="text-[10px] text-gray-600 font-bold mb-1">الختم الرسمي</span>
                  <div className="w-24 h-12 rounded border border-dashed border-black/50 flex items-center justify-center text-[10px] text-gray-400 font-normal">
                    ختم الشركة
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="text-[10px] print:text-[9.5px] text-gray-500 font-medium text-center border-t border-black/20 pt-1">
          * يُحفظ هذا النموذج في الملف الوظيفي للموظف لدى إدارة الموارد البشرية.
        </div>
      </div>
    </div>
  );
}
