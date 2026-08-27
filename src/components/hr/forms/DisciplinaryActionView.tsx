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
  const formattedDate = data.date || "..... / ..... / 2026 م";

  return (
    <div className="bg-white text-black p-8 md:p-12 rounded-xl border-2 border-black font-sans leading-relaxed text-right dir-rtl shadow-xs page-break-inside-avoid print-container min-h-[750px] flex flex-col justify-between">
      <div className="space-y-6">
        {/* Title Top Center */}
        <div className="text-center pt-2 pb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-black tracking-wide inline-block">
            إجراء جزائي
          </h1>
        </div>

        {/* Section 1: Basic Info */}
        <div className="space-y-3 font-bold text-base md:text-lg pr-2">
          <div className="flex items-start gap-2">
            <span className="whitespace-nowrap font-black">الاسم :</span>
            <span className="font-extrabold text-black underline px-2 break-all">
              {data.employeeName || "................................................................................"}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <span className="whitespace-nowrap font-black">الوظيفة:</span>
            <span className="font-extrabold text-black underline px-2">
              {data.jobTitle || "................................................................................"}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <span className="whitespace-nowrap font-black">رقم الاقامة :</span>
            <span className="font-extrabold text-black underline px-2 dir-ltr inline-block">
              {data.iqamaNo || "................................................................................"}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <span className="whitespace-nowrap font-black">الادارة :</span>
            <span className="font-extrabold text-black underline px-2">
              {data.department || "................................................................................"}
            </span>
          </div>
        </div>

        {/* Section 2: Violation Details */}
        <div className="space-y-4 pt-2 font-bold text-base md:text-lg pr-2">
          <div className="flex items-start gap-2">
            <span className="whitespace-nowrap font-black">المخالفة :</span>
            <span className="font-extrabold text-black underline px-2">
              {data.violation || "................................................................................"}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="font-black">الاسباب ( المبررات ان وجدت )</div>
            <div className="flex items-start gap-2 pr-2">
              <span className="font-black text-xl leading-none mt-1">•</span>
              <span className="font-extrabold text-black underline px-2 w-full">
                {data.reasons || "...................................................................................................."}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="whitespace-nowrap font-black">الاجراء الجزائي :</span>
              <span className="font-extrabold text-black underline px-2">
                {data.actionTaken || "................................................................................"}
              </span>
            </div>
            <div className="flex items-start gap-2 pr-2">
              <span className="font-black text-xl leading-none mt-1">•</span>
              <span className="font-extrabold text-black underline px-2 w-full">
                ....................................................................................................
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-1">
            <span className="whitespace-nowrap font-black">راي المدير المباشر :</span>
            <span className="font-extrabold text-black underline px-2">
              {data.directManagerOpinion || "................................................................................"}
            </span>
          </div>
        </div>

        {/* Dashed Divider Line */}
        <div className="border-b-2 border-dashed border-black my-6"></div>

        {/* Section 3: Employee Undertaking */}
        <div className="space-y-4">
          <h2 className="text-lg md:text-xl font-black text-black">تعهد الموظف</h2>

          <p className="text-base md:text-lg font-semibold text-gray-900 leading-loose">
            أقر أنا الموظف المذكور أعلاه بأنني اطلعت على سبب الجزاء الموقع بحقي، وعدم تكرار مخالفة التأخير مستقبلاً بالعمل المكلف لي وأتعهد بالالتزام، وفي حال تكرار المخالفة أتحمل ما يترتب عليها من إجراءات تأديبية وفق نظام العمل ولوائح الشركة الداخلية.
          </p>

          <div className="space-y-3 font-bold text-base md:text-lg pr-2 pt-2">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap font-black">توقيع الموظف :</span>
              <span className="font-extrabold text-black">................................................................................</span>
            </div>

            <div className="flex items-start gap-2">
              <span className="whitespace-nowrap font-black">الموارد البشرية :</span>
              <span className="font-extrabold text-black underline px-2">
                {data.hrManagerName || "................................................................................"}
              </span>
            </div>
          </div>
        </div>

        {/* General Manager Approval */}
        <div className="pt-6 font-bold text-base md:text-lg pr-2">
          <div className="flex items-start gap-2">
            <span className="whitespace-nowrap font-black">المدير العام :</span>
            <span className="font-extrabold text-black underline px-2">
              {data.generalManagerName || "................................................................................"}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Horizontal Line */}
      <div className="mt-8 pt-4 border-t-2 border-black"></div>
    </div>
  );
}
