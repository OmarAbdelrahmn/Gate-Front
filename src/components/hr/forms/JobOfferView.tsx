import React from "react";

export interface JobOfferData {
  companyName?: string;
  date?: string;
  candidateName?: string;
  iqamaNo?: string;
  nationality?: string;
  jobTitle?: string;
  department?: string;
  city?: string;
  totalSalary?: number | string;
  salaryInWords?: string;
  joiningDate?: string;
  hrManagerName?: string;
  generalManagerName?: string;
  notes?: string;
}

export function JobOfferView({ data }: { data: JobOfferData }) {
  const compName = data.companyName || "شركة اكسبرس جابت";
  const formattedDate = data.date || "____ / ____ / ________ م";
  const formattedSalary = data.totalSalary
    ? Number(data.totalSalary).toLocaleString("en-US", { minimumFractionDigits: 0 })
    : "15,000";

  return (
    <div className="bg-white text-black p-4 sm:p-5 md:p-6 print:p-3 print:py-2.5 rounded-xl border-2 border-black font-sans text-right dir-rtl shadow-xs flex flex-col justify-between my-1 print:my-0 min-h-[660px] md:min-h-[720px] print:min-h-0">
      <div className="space-y-3 sm:space-y-3.5 print:space-y-2 flex-1 flex flex-col justify-between">
        <div>
          {/* Document Title */}
          <div className="text-center pt-0.5 pb-1 print:pb-0.5">
            <h2 className="text-2xl sm:text-3xl print:text-xl font-black tracking-wide text-black underline underline-offset-8 inline-block">
              عرض عمل وتوظيف (Job Offer)
            </h2>
          </div>

          {/* Top Meta Strip */}
          <div className="flex justify-between items-center text-xs print:text-[11px] font-bold bg-gray-50/80 p-2 print:p-1 rounded-md border border-black/30 mb-2.5 print:mb-1.5">
            <div>
              <span className="text-gray-700">جهة العمل: </span>
              <span className="font-black text-black">{compName}</span>
            </div>
            <div>
              <span className="text-gray-700">تاريخ العرض: </span>
              <span className="font-extrabold text-black font-mono dir-ltr inline-block">{formattedDate}</span>
            </div>
            <div>
              <span className="text-gray-700">الرقم المرجعي: </span>
              <span className="font-extrabold text-black font-mono">
                JO-{data.iqamaNo ? data.iqamaNo.slice(-4) : "2026/01"}
              </span>
            </div>
          </div>

          {/* Welcome Text */}
          <p className="text-xs sm:text-sm print:text-[11px] font-semibold text-gray-800 leading-relaxed mb-2 print:mb-1 px-1">
            يسر إدارة الشركة أن تتقدم لكم بهذا العرض الوظيفي للانضمام إلى فريق عملنا، متمنين لكم دوام التوفيق والنجاح. وتفاصيل العرض والبنود التعاقدية موضحة أدناه:
          </p>

          {/* Section 1: Candidate & Job Details */}
          <div className="space-y-1.5 print:space-y-0.5 mb-2.5 print:mb-1.5">
            <h3 className="font-black text-xs sm:text-sm print:text-[11.5px] text-black border-r-3 border-black pr-1.5">
              أولاً: بيانات المرشح والوظيفة المعروضة
            </h3>
            <div className="border border-black rounded-lg p-2.5 print:p-1.5 bg-gray-50/60 font-semibold text-xs sm:text-sm print:text-[11px] space-y-1.5 print:space-y-0.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-700 min-w-[70px]">اسم المرشح:</span>
                  <span className="font-black text-black underline decoration-1 underline-offset-2 flex-1 truncate">
                    {data.candidateName || "........................................................"}
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
                  <span className="font-bold text-gray-700 min-w-[75px]">القسم / الإدارة:</span>
                  <span className="font-black text-black flex-1">
                    {data.department || "إدارة العمليات والتشغيل"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-700 min-w-[65px]">مقر العمل:</span>
                  <span className="font-black text-black flex-1">
                    {data.city || "مدينة جده - المركز الرئيسي"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Compensation Package */}
          <div className="space-y-1.5 print:space-y-0.5 mb-2.5 print:mb-1.5">
            <h3 className="font-black text-xs sm:text-sm print:text-[11.5px] text-black border-r-3 border-black pr-1.5">
              ثانياً: الحزمة المالية والمزايا الشهرية
            </h3>
            <div className="border border-black rounded-lg p-2.5 print:p-2 bg-gray-50/60 text-xs sm:text-sm print:text-[11px] font-semibold space-y-1.5 print:space-y-1">
              <div className="flex items-center justify-between bg-white p-2 print:p-1.5 rounded border border-black/30">
                <span className="font-extrabold text-gray-800">إجمالي الأجر الشهري الشامل (Gross Monthly Salary):</span>
                <span className="font-black text-black text-sm sm:text-base print:text-xs dir-ltr font-mono">
                  {formattedSalary} ريال سعودي
                </span>
              </div>
              <div className="flex items-baseline gap-2 pt-0.5">
                <span className="font-bold text-gray-700 min-w-[100px]">المبلغ تفقيطاً بالعربية:</span>
                <span className="font-black text-black underline decoration-1 underline-offset-2 flex-1">
                  {data.salaryInWords || "خمسة عشر ألف ريال سعودي لا غير"}
                </span>
              </div>
              <p className="text-[10.5px] print:text-[10px] text-gray-600 font-medium">
                * يشمل هذا الأجر الراتب الأساسي، بدل السكن، بدل النقل والمواصلات، وكافة البدلات المقررة وفق لائحة الشركة.
              </p>
            </div>
          </div>

          {/* Section 3: Terms & Conditions */}
          <div className="space-y-1.5 print:space-y-0.5 mb-2.5 print:mb-1.5">
            <h3 className="font-black text-xs sm:text-sm print:text-[11.5px] text-black border-r-3 border-black pr-1.5">
              ثالثاً: ضوابط وشروط العمل الرئيسية
            </h3>
            <div className="border border-black rounded-lg p-2.5 print:p-1.5 bg-gray-50/40 text-xs sm:text-sm print:text-[10.5px] font-medium space-y-1 print:space-y-0.5 text-gray-900">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-start gap-1">
                  <span className="font-bold text-black">• فترة التجربة:</span>
                  <span>(90) يوماً طبقاً للمادة (53) من نظام العمل.</span>
                </div>
                <div className="flex items-start gap-1">
                  <span className="font-bold text-black">• ساعات العمل:</span>
                  <span>(8) ساعات يومياً طبقاً للائحة تنظيم العمل.</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-start gap-1">
                  <span className="font-bold text-black">• الإجازة السنوية:</span>
                  <span>إجازة سنوية مدفوعة الأجر وفقاً للائحة.</span>
                </div>
                <div className="flex items-start gap-1">
                  <span className="font-bold text-black">• التأمين الطبي:</span>
                  <span>تأمين طبي تعاوني معتمد للموظف.</span>
                </div>
              </div>
              <div className="flex items-start gap-1 text-[10px] print:text-[9.5px] text-gray-600 pt-0.5">
                <span className="font-bold">• سريان العرض:</span>
                <span>يعتبر هذا العرض سارياً لمدة (7) أيام عمل من تاريخ صدوره، ويعد لاغياً في حال عدم توقيعه وإعادته.</span>
              </div>
            </div>
          </div>

          {/* Section 4: Candidate Acceptance */}
          <div className="space-y-1 print:space-y-0.5 mb-2.5 print:mb-1.5">
            <h3 className="font-black text-xs sm:text-sm print:text-[11.5px] text-black border-r-3 border-black pr-1.5">
              رابعاً: إقرار وقبول المرشح بالعرض الوظيفي
            </h3>
            <div className="border border-black rounded-lg p-2 print:p-1.5 bg-gray-50/60">
              <p className="text-[11px] sm:text-xs print:text-[10.5px] font-semibold text-gray-900 leading-relaxed text-justify">
                أقر أنا المرشح الموضحة بياناتي أعلاه بأنني اطلعت على كافة بنود ومزايا عرض العمل هذا، وأعلن قبولي التام به دون أي تحفظ، وأتعهد باستكمال مسوغات التعيين وتوقيع عقد العمل الرسمي ومباشرة العمل فور إخطاري.
              </p>
            </div>
          </div>

          {/* Section 5: Signatures and Approvals */}
          <div className="space-y-1 print:space-y-0.5">
            <h3 className="font-black text-xs sm:text-sm print:text-[11.5px] text-black border-r-3 border-black pr-1.5">
              خامساً: التوقيعات والاعتمادات الرسمية
            </h3>
            <div className="border border-black rounded-lg p-2.5 print:p-2 bg-gray-50/50">
              <div className="grid grid-cols-3 gap-3 text-xs sm:text-sm print:text-[10.5px] font-semibold text-center">
                {/* Candidate Signature */}
                <div className="space-y-1 border-l border-black/20 pl-2">
                  <span className="font-bold text-gray-800 block text-[11px]">توقيع وقبول المرشح:</span>
                  <div className="h-7 border-b border-dotted border-black flex items-end justify-center pb-0.5">
                    <span className="text-[10px] text-gray-400 font-normal">توقيع المرشح</span>
                  </div>
                  <span className="text-[10px] text-gray-600 block pt-0.5">التاريخ: {formattedDate}</span>
                </div>

                {/* HR Manager Signature */}
                <div className="space-y-1 border-l border-black/20 pl-2">
                  <span className="font-bold text-gray-800 block text-[11px]">مسؤول الموارد البشرية:</span>
                  <span className="font-black text-black block text-[11px] truncate">
                    {data.hrManagerName || "مسؤول الموارد البشرية"}
                  </span>
                  <div className="h-6 border-b border-dotted border-black"></div>
                  <span className="text-[10px] text-gray-600 block pt-0.5">التاريخ: {formattedDate}</span>
                </div>

                {/* Executive Approval & Stamp */}
                <div className="flex flex-col items-center justify-center">
                  <span className="font-bold text-gray-800 text-[11px] mb-1">الختم الرسمي واعتماد الإدارة</span>
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
          * يُعد هذا العرض وثيقة مبدئية غير ملزمة للطرفين إلا بعد توقيع عقد العمل الموحد ومباشرة العمل رسمياً.
        </div>
      </div>
    </div>
  );
}
