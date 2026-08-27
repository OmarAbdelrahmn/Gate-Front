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
    <div className="bg-white text-black p-8 md:p-12 rounded-xl border-2 border-black font-sans leading-relaxed text-right dir-rtl shadow-xs page-break-inside-avoid print-container min-h-[750px] flex flex-col justify-between">
      <div className="space-y-6">
        {/* Title Top Center */}
        <div className="text-center pt-2 pb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-black tracking-wide inline-block">
            نموذج مباشرة عمل
          </h1>
        </div>

        {/* Company and Commencement Date */}
        <div className="space-y-2 text-base md:text-lg font-bold pr-2">
          <div className="flex items-center gap-2">
            <span>شركة:</span>
            <span className="font-extrabold text-black underline px-2">
              {compName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>تاريخ المباشرة:</span>
            <span className="font-extrabold text-black px-2 dir-ltr inline-block">
              {data.actualStartDate || formattedDate}
            </span>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-t-2 border-black my-4" />

        {/* Section 1: Employee Information */}
        <div className="space-y-3">
          <h2 className="text-lg md:text-xl font-black text-black">بيانات الموظف</h2>

          <ul className="space-y-2.5 text-base md:text-lg font-bold pr-2">
            <li className="flex items-start gap-2">
              <span className="font-black text-xl leading-none mt-1">•</span>
              <span className="whitespace-nowrap">اسم الموظف:</span>
              <span className="font-extrabold text-black underline px-2 break-all">
                {data.employeeName || "................................................................................"}
              </span>
            </li>

            <li className="flex items-start gap-2">
              <span className="font-black text-xl leading-none mt-1">•</span>
              <span className="whitespace-nowrap">الجنسية:</span>
              <span className="font-extrabold text-black underline px-2">
                {data.nationality || "................................................................................"}
              </span>
            </li>

            <li className="flex items-start gap-2">
              <span className="font-black text-xl leading-none mt-1">•</span>
              <span className="whitespace-nowrap">رقم الهوية / الإقامة:</span>
              <span className="font-extrabold text-black underline px-2 dir-ltr inline-block">
                {data.iqamaNo || "................................................................................"}
              </span>
            </li>

            <li className="flex items-start gap-2">
              <span className="font-black text-xl leading-none mt-1">•</span>
              <span className="whitespace-nowrap">المسمى الوظيفي:</span>
              <span className="font-extrabold text-black underline px-2">
                {data.jobTitle || "................................................................................"}
              </span>
            </li>

            <li className="flex items-start gap-2">
              <span className="font-black text-xl leading-none mt-1">•</span>
              <span className="whitespace-nowrap">الإدارة / القسم:</span>
              <span className="font-extrabold text-black underline px-2">
                {data.department || "................................................................................"}
              </span>
            </li>

            <li className="flex items-start gap-2">
              <span className="font-black text-xl leading-none mt-1">•</span>
              <span className="whitespace-nowrap">مكان العمل:</span>
              <span className="font-extrabold text-black underline px-2">
                {data.workplace || "................................................................................"}
              </span>
            </li>

            <li className="flex items-start gap-2">
              <span className="font-black text-xl leading-none mt-1">•</span>
              <span className="whitespace-nowrap">تاريخ بدء العمل حسب العقد:</span>
              <span className="font-extrabold text-black px-2 dir-ltr inline-block">
                {data.contractStartDate || formattedDate}
              </span>
            </li>

            <li className="flex items-start gap-2">
              <span className="font-black text-xl leading-none mt-1">•</span>
              <span className="whitespace-nowrap">تاريخ المباشرة الفعلي:</span>
              <span className="font-extrabold text-black px-2 dir-ltr inline-block">
                {data.actualStartDate || formattedDate}
              </span>
            </li>
          </ul>
        </div>

        {/* Divider */}
        <hr className="border-t-2 border-black my-4" />

        {/* Section 2: Declaration and Undertaking */}
        <div className="space-y-3">
          <h2 className="text-lg md:text-xl font-black text-black">الإقرار والتعهد</h2>

          <p className="text-base md:text-lg font-semibold text-gray-900 leading-loose">
            أقر أنا الموظف الموضح بياناتي أعلاه بأنني باشرت عملي لدى الشركة اعتباراً من التاريخ المذكور أعلاه، والتزمت بأداء المهام الوظيفية الموكلة إليّ وفقاً للأنظمة والتعليمات وسياسات العمل المعتمدة لدى الشركة.
          </p>

          <ul className="space-y-2.5 text-base md:text-lg font-bold pr-2 pt-2">
            <li className="flex items-center gap-2">
              <span className="font-black text-xl">•</span>
              <span>توقيع الموظف: ................................................................................</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="font-black text-xl">•</span>
              <span>التاريخ: {formattedDate}</span>
            </li>
          </ul>
        </div>

        {/* Divider */}
        <hr className="border-t-2 border-black my-4" />

        {/* Section 3: HR Approval */}
        <div className="space-y-3">
          <h2 className="text-lg md:text-xl font-black text-black">اعتماد إدارة الموارد البشرية</h2>

          <p className="text-base md:text-lg font-semibold text-gray-900">
            تمت مراجعة بيانات الموظف واعتماد مباشرة العمل.
          </p>

          <ul className="space-y-2.5 text-base md:text-lg font-bold pr-2 pt-2">
            <li className="flex items-start gap-2">
              <span className="font-black text-xl leading-none mt-1">•</span>
              <span className="whitespace-nowrap">اسم مسؤول الموارد البشرية:</span>
              <span className="font-extrabold text-black underline px-2">
                {data.hrManagerName || "................................................................................"}
              </span>
            </li>

            <li className="flex items-center gap-2">
              <span className="font-black text-xl">•</span>
              <span>التوقيع: ................................................................................</span>
            </li>

            <li className="flex items-center gap-2">
              <span className="font-black text-xl">•</span>
              <span>الختم: ................................................................................</span>
            </li>

            <li className="flex items-center gap-2">
              <span className="font-black text-xl">•</span>
              <span>التاريخ: {formattedDate}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Horizontal Line */}
      <div className="mt-8 pt-4 border-t-2 border-black"></div>
    </div>
  );
}
