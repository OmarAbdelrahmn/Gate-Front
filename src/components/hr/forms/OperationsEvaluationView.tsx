import React from "react";
import {
  LetterheadHeader,
  LetterheadFooter,
  LetterheadWatermark,
  LETTERHEAD_TEMPLATES,
  type LetterheadId,
} from "./LetterheadHeader";

export interface OperationsEvaluationData {
  candidateName?: string;
  date?: string;
  knowledgeAppsMaps?: "excellent" | "good" | "weak" | "";
  previousExperience?: string;
  workUnderPressure?: "yes" | "no" | "";
  immediateReadiness?: "yes" | "no" | "";
  deliveryExperience?: "yes" | "no" | "";
  operationsRating?: "excellent" | "good" | "acceptable" | "weak" | "";
  recommendationByExp?: string;
  operationsNotes?: string;
  interviewResult?: "accepted" | "rejected" | "deferred" | "";
  operationsManagerName?: string;
  companyName?: string;
  letterheadId?: LetterheadId;
}

export function OperationsEvaluationView({ data }: { data: OperationsEvaluationData }) {
  const currentLetterhead = LETTERHEAD_TEMPLATES.find((t) => t.id === data.letterheadId);
  const companyName = data.companyName || currentLetterhead?.companyName || "شركة اكسبرس جايت";
  const isStandard = !data.letterheadId || data.letterheadId === "standard";

  return (
    <div className="relative overflow-hidden bg-white text-black p-4 md:p-8 font-sans leading-relaxed text-right dir-rtl shadow-sm page-break-inside-avoid print-container min-h-[960px] flex flex-col justify-between">
      {/* Background Watermark Image from Letterhead */}
      <LetterheadWatermark letterheadId={data.letterheadId} />

      <div className="relative z-10 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* If official letterhead is selected, show corporate header */}
          {!isStandard && (
            <div className="mb-3">
              <LetterheadHeader
                letterheadId={data.letterheadId}
                companyName={companyName}
                date={data.date}
              />
            </div>
          )}

          {/* Top Header Centered */}
          <div className="text-center mb-6">
            <h1 className="text-xl md:text-2xl font-black text-[#0f2d59] tracking-wide inline-block">
              خاص بإدارة التشغيل
            </h1>
          </div>

          {/* Table 1: Skill & Experience Evaluation */}
          <div className="border border-black overflow-hidden mb-6 bg-white/80 backdrop-blur-[0.5px]">
            <table className="w-full border-collapse text-xs md:text-sm font-bold text-black">
              <tbody>
                {/* Row 1: Delivery Apps & Maps */}
                <tr className="border-b border-black">
                  <td className="p-2.5 border-l border-black bg-gray-50/40 w-1/3 text-right font-black">
                    معرفة باستخدام تطبيقات التوصيل والخرائط:
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-6 justify-start">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] ${data.knowledgeAppsMaps === "excellent" ? "bg-black text-white font-bold" : "bg-white"}`}>
                          {data.knowledgeAppsMaps === "excellent" ? "✓" : ""}
                        </span>
                        <span>ممتاز</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] ${data.knowledgeAppsMaps === "good" ? "bg-black text-white font-bold" : "bg-white"}`}>
                          {data.knowledgeAppsMaps === "good" ? "✓" : ""}
                        </span>
                        <span>جيد</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] ${data.knowledgeAppsMaps === "weak" ? "bg-black text-white font-bold" : "bg-white"}`}>
                          {data.knowledgeAppsMaps === "weak" ? "✓" : ""}
                        </span>
                        <span>ضعيف</span>
                      </label>
                    </div>
                  </td>
                </tr>

                {/* Row 2: Previous Experience */}
                <tr className="border-b border-black">
                  <td className="p-2.5 border-l border-black bg-gray-50/40 text-right font-black">
                    الخبرات السابقة:
                  </td>
                  <td className="p-2.5 font-normal">
                    {data.previousExperience || "...................................................................................................."}
                  </td>
                </tr>

                {/* Row 3: Ability to Work Under Pressure */}
                <tr className="border-b border-black">
                  <td className="p-2.5 border-l border-black bg-gray-50/40 text-right font-black">
                    القدرة على العمل تحت الضغط:
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-6 justify-start">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] ${data.workUnderPressure === "yes" ? "bg-black text-white font-bold" : "bg-white"}`}>
                          {data.workUnderPressure === "yes" ? "✓" : ""}
                        </span>
                        <span>نعم</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] ${data.workUnderPressure === "no" ? "bg-black text-white font-bold" : "bg-white"}`}>
                          {data.workUnderPressure === "no" ? "✓" : ""}
                        </span>
                        <span>لا</span>
                      </label>
                    </div>
                  </td>
                </tr>

                {/* Row 4: Ready to Start Immediately */}
                <tr className="border-b border-black">
                  <td className="p-2.5 border-l border-black bg-gray-50/40 text-right font-black">
                    الجاهزية للعمل فوراً:
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-6 justify-start">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] ${data.immediateReadiness === "yes" ? "bg-black text-white font-bold" : "bg-white"}`}>
                          {data.immediateReadiness === "yes" ? "✓" : ""}
                        </span>
                        <span>نعم</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] ${data.immediateReadiness === "no" ? "bg-black text-white font-bold" : "bg-white"}`}>
                          {data.immediateReadiness === "no" ? "✓" : ""}
                        </span>
                        <span>لا</span>
                      </label>
                    </div>
                  </td>
                </tr>

                {/* Row 5: Delivery Experience */}
                <tr>
                  <td className="p-2.5 border-l border-black bg-gray-50/40 text-right font-black">
                    خبرة في التوصيل:
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-6 justify-start">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] ${data.deliveryExperience === "yes" ? "bg-black text-white font-bold" : "bg-white"}`}>
                          {data.deliveryExperience === "yes" ? "✓" : ""}
                        </span>
                        <span>نعم</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] ${data.deliveryExperience === "no" ? "bg-black text-white font-bold" : "bg-white"}`}>
                          {data.deliveryExperience === "no" ? "✓" : ""}
                        </span>
                        <span>لا</span>
                      </label>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Operations Rating */}
          <div className="space-y-3 mb-6 bg-white/80 backdrop-blur-[0.5px]">
            <h2 className="text-sm md:text-base font-black text-[#0f2d59] text-right">
              التقييم (إدارة التشغيل)
            </h2>

            <div className="border border-black overflow-hidden bg-white">
              <div className="grid grid-cols-4 divide-x divide-x-reverse divide-black text-center font-bold text-xs md:text-sm py-2">
                <label className="flex items-center justify-center gap-2 cursor-pointer select-none">
                  <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] ${data.operationsRating === "excellent" ? "bg-black text-white font-bold" : "bg-white"}`}>
                    {data.operationsRating === "excellent" ? "✓" : ""}
                  </span>
                  <span>ممتاز</span>
                </label>
                <label className="flex items-center justify-center gap-2 cursor-pointer select-none">
                  <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] ${data.operationsRating === "good" ? "bg-black text-white font-bold" : "bg-white"}`}>
                    {data.operationsRating === "good" ? "✓" : ""}
                  </span>
                  <span>جيد</span>
                </label>
                <label className="flex items-center justify-center gap-2 cursor-pointer select-none">
                  <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] ${data.operationsRating === "acceptable" ? "bg-black text-white font-bold" : "bg-white"}`}>
                    {data.operationsRating === "acceptable" ? "✓" : ""}
                  </span>
                  <span>مقبول</span>
                </label>
                <label className="flex items-center justify-center gap-2 cursor-pointer select-none">
                  <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] ${data.operationsRating === "weak" ? "bg-black text-white font-bold" : "bg-white"}`}>
                    {data.operationsRating === "weak" ? "✓" : ""}
                  </span>
                  <span>ضعيف</span>
                </label>
              </div>
            </div>

            <div className="space-y-2 text-xs md:text-sm font-bold pt-1">
              <div className="flex items-baseline gap-2">
                <span className="shrink-0">الترشيح حسب الخبرة:</span>
                <span className="flex-1 border-b border-dotted border-black pb-0.5 px-2 font-normal">
                  {data.recommendationByExp || "...................................................................................................."}
                </span>
              </div>

              <div className="space-y-1">
                <span>ملاحظات:</span>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="w-3.5 h-3.5 border border-black inline-block shrink-0" />
                  <div className="border-b border-dotted border-black pb-1 px-2 font-normal flex-1 min-h-[22px]">
                    {data.operationsNotes || "...................................................................................................................................................."}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Interview Result */}
          <div className="space-y-2 mb-6">
            <h2 className="text-sm md:text-base font-black text-[#0f2d59] text-right">
              نتيجة المقابلة
            </h2>

            <div className="flex items-center gap-8 text-xs md:text-sm font-black pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className={`w-4 h-4 border-2 border-black inline-flex items-center justify-center text-xs ${data.interviewResult === "accepted" ? "bg-black text-white font-bold" : "bg-white"}`}>
                  {data.interviewResult === "accepted" ? "✓" : ""}
                </span>
                <span>مقبول</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className={`w-4 h-4 border-2 border-black inline-flex items-center justify-center text-xs ${data.interviewResult === "rejected" ? "bg-black text-white font-bold" : "bg-white"}`}>
                  {data.interviewResult === "rejected" ? "✓" : ""}
                </span>
                <span>مرفوض</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className={`w-4 h-4 border-2 border-black inline-flex items-center justify-center text-xs ${data.interviewResult === "deferred" ? "bg-black text-white font-bold" : "bg-white"}`}>
                  {data.interviewResult === "deferred" ? "✓" : ""}
                </span>
                <span>مؤجل</span>
              </label>
            </div>
          </div>

          {/* Section 4: Declaration & Undertaking */}
          <div className="space-y-3 mb-8">
            <h2 className="text-sm md:text-base font-black text-[#0f2d59] text-right">
              إقرار وتعهد
            </h2>

            <p className="text-xs md:text-sm font-bold leading-relaxed text-justify">
              أقر أنا الموقع أدناه بموافقتي على العمل في أي تطبيق توصيل يتم تكليفي به حسب حاجة العمل، والالتزام بكافة أنظمة وتعليمات إدارة التشغيل، وأتحمل كامل المسؤولية عن أي مخالفات مرورية أو تشغيلية ناتجة عن تقصيري.
            </p>

            <div className="grid grid-cols-2 gap-8 pt-3 text-xs md:text-sm font-bold">
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="shrink-0">الاسم:</span>
                  <span className="flex-1 border-b border-dotted border-black pb-0.5 px-2 font-black">
                    {data.candidateName || "........................................................"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="shrink-0">التاريخ:</span>
                  <span className="flex-1 border-b border-dotted border-black pb-0.5 px-2">
                    {data.date || " / / 2026م"}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="shrink-0">التوقيع:</span>
                  <span className="flex-1 border-b border-dotted border-black pb-0.5 px-2 font-normal text-gray-400">
                    ........................................................
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Operations Approval */}
          <div className="border-t border-black pt-4">
            <h2 className="text-sm md:text-base font-black text-[#0f2d59] text-right mb-4">
              اعتماد إدارة التشغيل
            </h2>

            <div className="grid grid-cols-2 gap-8 text-xs md:text-sm font-bold">
              <div className="flex items-baseline gap-2">
                <span className="shrink-0">الاسم:</span>
                <span className="flex-1 border-b border-dotted border-black pb-0.5 px-2 font-black">
                  {data.operationsManagerName || "........................................................"}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="shrink-0">التوقيع:</span>
                <span className="flex-1 border-b border-dotted border-black pb-0.5 px-2 font-normal text-gray-400">
                  ........................................................
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* If official letterhead selected, show footer */}
        {!isStandard && (
          <div className="pt-2">
            <LetterheadFooter letterheadId={data.letterheadId} />
          </div>
        )}
      </div>
    </div>
  );
}
