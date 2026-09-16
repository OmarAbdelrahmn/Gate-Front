import React from "react";
import { OperationsEvaluationView, OperationsEvaluationData } from "./OperationsEvaluationView";
import {
  LetterheadHeader,
  LetterheadFooter,
  LetterheadWatermark,
  LETTERHEAD_TEMPLATES,
  type LetterheadId,
} from "./LetterheadHeader";

export interface InterviewFormData extends OperationsEvaluationData {
  candidateName?: string;
  personalPhone?: string;
  iqamaNo?: string;
  relativePhoneInside?: string;
  phoneOutside?: string;
  profession?: string;
  birthDate?: string;
  transferCount?: string;
  transferCost?: string;
  riderCost?: string;
  iqamaExpiryDate?: string;
  iqamaRenewalCost?: string;
  licenseCost?: string;
  professionChangeCost?: string;
  totalCostOnRider?: string;
  totalExpenses?: string;
  vehicleType?: "motorcycle" | "car" | "";
  licenseStatus?: "valid" | "expired" | "";
  licenseType?: string;
  interviewDate?: string;
  pageView?: "both" | "hr" | "operations";
  companyName?: string;
  letterheadId?: LetterheadId;
}

export function InterviewFormView({ data }: { data: InterviewFormData }) {
  const currentLetterhead = LETTERHEAD_TEMPLATES.find((t) => t.id === data.letterheadId);
  const companyName = data.companyName || currentLetterhead?.companyName || "شركة اكسبرس جايت";
  const isStandard = !data.letterheadId || data.letterheadId === "standard";

  const showHr = !data.pageView || data.pageView === "both" || data.pageView === "hr";
  const showOperations = !data.pageView || data.pageView === "both" || data.pageView === "operations";

  return (
    <div className="space-y-6">
      {/* Page 1: خاص بالموارد البشرية */}
      {showHr && (
        <div className="relative overflow-hidden bg-white text-black p-4 md:p-8 font-sans leading-relaxed text-right dir-rtl shadow-sm page-break-inside-avoid print-container min-h-[960px] flex flex-col justify-between">
          {/* Background Watermark Image from Letterhead */}
          <LetterheadWatermark letterheadId={data.letterheadId} />

          <div className="relative z-10 flex-1 flex flex-col justify-between space-y-3">
            <div>
              {/* If official letterhead is selected, show corporate header */}
              {!isStandard && (
                <div className="mb-3">
                  <LetterheadHeader
                    letterheadId={data.letterheadId}
                    companyName={companyName}
                    date={data.date || data.interviewDate}
                    refNo={data.iqamaNo ? data.iqamaNo.slice(-4) : undefined}
                  />
                </div>
              )}

              {/* Title Centered */}
              <div className="text-center mb-1">
                <h1 className="text-xl md:text-2xl font-black text-black underline tracking-wide inline-block">
                  نموذج مقابلة
                </h1>
              </div>

              {/* Confidential Subheader on the Right */}
              <div className="text-right mb-2">
                <span className="text-xs md:text-sm font-black text-black underline">
                  خاص بالموارد البشرية
                </span>
              </div>

              {/* Outer Border Box enclosing table and bottom questions */}
              <div className="border-2 border-black p-3 md:p-5 bg-white/80 backdrop-blur-[0.5px] space-y-6">
                {/* Main Table */}
                <table className="w-full border-collapse border-2 border-black text-xs md:text-sm font-bold text-black bg-white">
                  <tbody>
                    {/* Row 1: Candidate Name */}
                    <tr className="border-b border-black">
                      <td className="p-2 border-l border-black bg-gray-50/50 w-[38%] text-right font-black">
                        الاسم:
                      </td>
                      <td colSpan={2} className="p-2 text-right font-black text-sm md:text-base">
                        {data.candidateName || ""}
                      </td>
                    </tr>

                    {/* Row 2: Personal Phone & Iqama No */}
                    <tr className="border-b border-black">
                      <td className="p-2 border-l border-black bg-gray-50/50 text-right">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold">رقم الجوال الشخصي:</span>
                          <span className="font-bold font-mono dir-ltr">{data.personalPhone || ""}</span>
                        </div>
                      </td>
                      <td className="p-2 border-l border-black bg-gray-50/50 text-center font-bold w-[24%]">
                        رقم الإقامة:
                      </td>
                      <td className="p-2 text-center font-bold font-mono dir-ltr">
                        {data.iqamaNo || ""}
                      </td>
                    </tr>

                    {/* Row 3: Relative's Phone Inside KSA */}
                    <tr className="border-b border-black">
                      <td className="p-2 border-l border-black bg-gray-50/50 text-right font-bold">
                        رقم جوال أحد الأقارب داخل المملكة:
                      </td>
                      <td colSpan={2} className="p-2 text-right font-bold font-mono dir-ltr">
                        {data.relativePhoneInside || ""}
                      </td>
                    </tr>

                    {/* Row 4: Phone Outside KSA */}
                    <tr className="border-b border-black">
                      <td className="p-2 border-l border-black bg-gray-50/50 text-right font-bold">
                        رقم الجوال خارج المملكة:
                      </td>
                      <td colSpan={2} className="p-2 text-right font-bold font-mono dir-ltr">
                        {data.phoneOutside || ""}
                      </td>
                    </tr>

                    {/* Row 5: Profession & Date of Birth */}
                    <tr className="border-b border-black">
                      <td className="p-2 border-l border-black bg-gray-50/50 text-right">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold">المهنة:</span>
                          <span className="font-bold">{data.profession || ""}</span>
                        </div>
                      </td>
                      <td className="p-2 border-l border-black bg-gray-50/50 text-center font-bold">
                        تاريخ الميلاد:
                      </td>
                      <td className="p-2 text-center font-bold font-mono">
                        {data.birthDate || ""}
                      </td>
                    </tr>

                    {/* Row 6: Transfer Count & Transfer Cost */}
                    <tr className="border-b border-black">
                      <td className="p-2 border-l border-black bg-gray-50/50 text-right">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold">عدد مرات نقل الخدمات:</span>
                          <span className="font-bold font-mono">{data.transferCount || ""}</span>
                        </div>
                      </td>
                      <td className="p-2 border-l border-black bg-gray-50/50 text-center font-bold">
                        التكلفة:
                      </td>
                      <td className="p-2 text-center font-bold font-mono">
                        {data.transferCost ? `${data.transferCost} ريال` : ""}
                      </td>
                    </tr>

                    {/* Row 7: Cost Borne by Rider */}
                    <tr className="border-b border-black">
                      <td className="p-2 border-l border-black bg-gray-50/50 text-right font-bold">
                        التكلفة على المندوب:
                      </td>
                      <td className="p-2 border-l border-black bg-gray-50/50 text-center font-bold">
                        التكلفة:
                      </td>
                      <td className="p-2 text-center font-bold font-mono">
                        {data.riderCost ? `${data.riderCost} ريال` : ""}
                      </td>
                    </tr>

                    {/* Row 8: Iqama Expiry Date & Renewal Cost */}
                    <tr className="border-b border-black">
                      <td className="p-2 border-l border-black bg-gray-50/50 text-right">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold">تاريخ انتهاء الإقامة:</span>
                          <span className="font-bold font-mono">{data.iqamaExpiryDate || ""}</span>
                        </div>
                      </td>
                      <td className="p-2 border-l border-black bg-gray-50/50 text-center font-bold">
                        التكلفة:
                      </td>
                      <td className="p-2 text-center font-bold font-mono">
                        {data.iqamaRenewalCost ? `${data.iqamaRenewalCost} ريال` : ""}
                      </td>
                    </tr>

                    {/* Row 9: License Issuance Costs */}
                    <tr className="border-b border-black">
                      <td className="p-2 border-l border-black bg-gray-50/50 text-right font-bold">
                        تكاليف إصدار الرخصة:
                      </td>
                      <td className="p-2 border-l border-black bg-gray-50/50 text-center font-bold">
                        التكلفة:
                      </td>
                      <td className="p-2 text-center font-bold font-mono">
                        {data.licenseCost ? `${data.licenseCost} ريال` : ""}
                      </td>
                    </tr>

                    {/* Row 10: Profession Change Cost */}
                    <tr className="border-b border-black">
                      <td className="p-2 border-l border-black bg-gray-50/50 text-right font-bold">
                        تكاليف تغيير المهنة:
                      </td>
                      <td colSpan={2} className="p-2 text-center font-bold font-mono">
                        {data.professionChangeCost ? `${data.professionChangeCost} ريال` : ""}
                      </td>
                    </tr>

                    {/* Row 11: Total Cost Charged to Rider */}
                    <tr className="border-b border-black">
                      <td className="p-2 border-l border-black bg-gray-50/50 text-right font-bold">
                        إجمالي التكلفة المحملة على المندوب:
                      </td>
                      <td colSpan={2} className="p-2 text-center font-black font-mono text-sm md:text-base">
                        {data.totalCostOnRider ? `${data.totalCostOnRider} ريال` : ""}
                      </td>
                    </tr>

                    {/* Row 12: Total Expenses (Highlighted) */}
                    <tr className="bg-blue-50/60">
                      <td className="p-2.5 border-l border-black bg-blue-100/50 text-right font-black text-sm">
                        إجمالي المصاريف:
                      </td>
                      <td colSpan={2} className="p-2.5 text-center font-black text-sm md:text-base font-mono">
                        {data.totalExpenses ? `${data.totalExpenses} ريال` : "------------------------------------------------"}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Bottom Vehicle and License Section */}
                <div className="space-y-4 pt-1 text-xs md:text-sm font-black text-right text-black">
                  {/* Row 1: Vehicle Type */}
                  <div className="flex items-center gap-6 justify-start">
                    <span className="min-w-[120px]">نوع المركبة:</span>
                    <div className="flex items-center gap-6">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <span className={`w-4 h-4 border-2 border-black inline-flex items-center justify-center text-xs ${data.vehicleType === "motorcycle" ? "bg-black text-white font-bold" : "bg-white"}`}>
                          {data.vehicleType === "motorcycle" ? "✓" : ""}
                        </span>
                        <span>دباب</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <span className={`w-4 h-4 border-2 border-black inline-flex items-center justify-center text-xs ${data.vehicleType === "car" ? "bg-black text-white font-bold" : "bg-white"}`}>
                          {data.vehicleType === "car" ? "✓" : ""}
                        </span>
                        <span>سيارة</span>
                      </label>
                    </div>
                  </div>

                  {/* Row 2: Driving License Status */}
                  <div className="flex items-center gap-6 justify-start">
                    <span className="min-w-[120px]">رخصة قيادة:</span>
                    <div className="flex items-center gap-6">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <span className={`w-4 h-4 border-2 border-black inline-flex items-center justify-center text-xs ${data.licenseStatus === "valid" ? "bg-black text-white font-bold" : "bg-white"}`}>
                          {data.licenseStatus === "valid" ? "✓" : ""}
                        </span>
                        <span>سارية</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <span className={`w-4 h-4 border-2 border-black inline-flex items-center justify-center text-xs ${data.licenseStatus === "expired" ? "bg-black text-white font-bold" : "bg-white"}`}>
                          {data.licenseStatus === "expired" ? "✓" : ""}
                        </span>
                        <span>غير سارية</span>
                      </label>
                    </div>
                  </div>

                  {/* Row 3: License Type */}
                  <div className="flex items-baseline gap-2">
                    <span className="shrink-0">نوع رخصة القيادة:</span>
                    <span className="flex-1 border-b border-dotted border-black pb-0.5 px-2 font-bold">
                      {data.licenseType || "...................................................................................................."}
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
      )}

      {/* Page Separator for screen view & Page Break for Print */}
      {showHr && showOperations && (
        <div className="print:hidden border-t-2 border-dashed border-gray-300 my-8 py-2 text-center">
          <span className="bg-gray-100 px-4 py-1.5 rounded-full text-xs font-bold text-gray-600">
            الصفحة التالية: نموذج تقييم وإقرار - إدارة التشغيل
          </span>
        </div>
      )}

      {/* Page 2: خاص بإدارة التشغيل (تقييم وإقرار) */}
      {showOperations && (
        <div className={showHr ? "print:break-before-page" : ""}>
          <OperationsEvaluationView
            data={{
              candidateName: data.candidateName,
              date: data.date || data.interviewDate,
              knowledgeAppsMaps: data.knowledgeAppsMaps,
              previousExperience: data.previousExperience,
              workUnderPressure: data.workUnderPressure,
              immediateReadiness: data.immediateReadiness,
              deliveryExperience: data.deliveryExperience,
              operationsRating: data.operationsRating,
              recommendationByExp: data.recommendationByExp,
              operationsNotes: data.operationsNotes,
              interviewResult: data.interviewResult,
              operationsManagerName: data.operationsManagerName,
              companyName: companyName,
              letterheadId: data.letterheadId,
            }}
          />
        </div>
      )}
    </div>
  );
}
