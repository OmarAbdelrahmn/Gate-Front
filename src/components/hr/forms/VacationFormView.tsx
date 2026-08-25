import React from "react";

export interface VacationFormData {
  applicantName: string;
  employeeNo: string;
  joiningDate?: string;
  date?: string;
  jobTitle?: string;
  department?: string;
  telExt?: string;
  startDate?: string;
  endDate?: string;
  vacationDays?: number | string;
  vacationType?: "annual" | "emergency" | "sick" | "unpaid" | "other";
  otherReasonText?: string;
  supervisorRecommendation?: "approved_covered" | "approved_need_cover" | "rejected";
  supervisorName?: string;
  supervisorJobTitle?: string;
}

export function VacationFormView({ data }: { data: VacationFormData }) {
  const currentVacationType = data.vacationType || "annual";

  return (
    <div className="bg-white text-black p-6 md:p-8 rounded-xl border-2 border-black font-sans leading-snug text-right dir-rtl shadow-xs page-break-inside-avoid print-container">
      {/* Title Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl md:text-2xl font-black text-black">
          نموذج طلب إجازة
        </h2>
        <h3 className="text-base md:text-lg font-bold text-gray-700 dir-ltr">
          Vacation Form
        </h3>
      </div>

      {/* Top Header Meta Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-xs md:text-sm font-bold">
        {/* Right Column (Arabic primary) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="min-w-[110px]">التاريخ / Date:</span>
            <span className="border-b border-black flex-1 px-2 font-extrabold min-h-[22px]">
              {data.date || "2026/08/25"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="min-w-[110px]">اسم مقدم الطلب / Name of Applicant:</span>
            <span className="border-b border-black flex-1 px-2 font-extrabold min-h-[22px]">
              {data.applicantName || "........................................................"}
            </span>
          </div>
        </div>

        {/* Left Column */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="min-w-[110px]">تاريخ الالتحاق / Joining Date:</span>
            <span className="border-b border-black flex-1 px-2 font-extrabold min-h-[22px]">
              {data.joiningDate || "...................................."}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="min-w-[110px]">الرقم الوظيفي / Employee No.:</span>
            <span className="border-b border-black flex-1 px-2 font-extrabold min-h-[22px]">
              {data.employeeNo || "...................................."}
            </span>
          </div>
        </div>
      </div>

      {/* Main Form Data Table */}
      <table className="w-full border-collapse border-2 border-black mb-6 text-xs md:text-sm font-bold text-center">
        <tbody>
          <tr>
            <td className="border-2 border-black p-2 bg-gray-50/80 w-1/3 text-right pr-3">
              المسمى الوظيفي / Job Title
            </td>
            <td colSpan={3} className="border-2 border-black p-2 text-right pr-3 font-extrabold">
              {data.jobTitle || "سائق مندوب توصيل"}
            </td>
          </tr>

          <tr>
            <td className="border-2 border-black p-2 bg-gray-50/80 text-right pr-3">
              الإدارة / Department
            </td>
            <td className="border-2 border-black p-2 text-right pr-3 font-extrabold">
              {data.department || "إدارة العمليات والتشغيل"}
            </td>
            <td className="border-2 border-black p-2 bg-gray-50/80 text-right pr-3">
              رقم الهاتف/ تحويلة / Tel/Ext
            </td>
            <td className="border-2 border-black p-2 text-right pr-3 font-extrabold">
              {data.telExt || "........................"}
            </td>
          </tr>

          <tr>
            <td className="border-2 border-black p-2 bg-gray-50/80 text-right pr-3">
              تاريخ بدء الإجازة / Vacation Starting Date
            </td>
            <td className="border-2 border-black p-2 font-extrabold">
              {data.startDate || "2026/09/01"}
            </td>
            <td className="border-2 border-black p-2 bg-gray-50/80 text-right pr-3">
              تاريخ انتهاء الإجازة / Vacation Ending Date
            </td>
            <td className="border-2 border-black p-2 font-extrabold">
              {data.endDate || "2026/09/15"}
            </td>
          </tr>

          <tr>
            <td colSpan={2} className="border-2 border-black p-2 bg-gray-50/80 text-right pr-3">
              عدد الأيام / Vacation Days
            </td>
            <td colSpan={2} className="border-2 border-black p-2 font-extrabold text-base">
              {data.vacationDays || "15"} يوم
            </td>
          </tr>

          {/* Vacation Type Selection Grid */}
          <tr>
            <td className="border-2 border-black p-3 bg-gray-50/80 text-right pr-3">
              <div>نوع الإجازة</div>
              <div className="text-[11px] text-gray-600">Vacation Type</div>
            </td>
            <td colSpan={3} className="border-2 border-black p-3 text-right">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {/* Annual */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className={`w-4 h-4 border-2 border-black inline-flex items-center justify-center font-bold text-xs ${currentVacationType === "annual" ? "bg-black text-white" : "bg-white"}`}>
                    {currentVacationType === "annual" ? "✓" : ""}
                  </span>
                  <div>
                    <div>سنوية</div>
                    <div className="italic text-[10px] text-gray-600">Annual leave</div>
                  </div>
                </label>

                {/* Emergency */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className={`w-4 h-4 border-2 border-black inline-flex items-center justify-center font-bold text-xs ${currentVacationType === "emergency" ? "bg-black text-white" : "bg-white"}`}>
                    {currentVacationType === "emergency" ? "✓" : ""}
                  </span>
                  <div>
                    <div>طارئة</div>
                    <div className="italic text-[10px] text-gray-600">Emergency</div>
                  </div>
                </label>

                {/* Sick */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className={`w-4 h-4 border-2 border-black inline-flex items-center justify-center font-bold text-xs ${currentVacationType === "sick" ? "bg-black text-white" : "bg-white"}`}>
                    {currentVacationType === "sick" ? "✓" : ""}
                  </span>
                  <div>
                    <div>مرضية</div>
                    <div className="italic text-[10px] text-gray-600">Sick leave</div>
                  </div>
                </label>

                {/* Without pay */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className={`w-4 h-4 border-2 border-black inline-flex items-center justify-center font-bold text-xs ${currentVacationType === "unpaid" ? "bg-black text-white" : "bg-white"}`}>
                    {currentVacationType === "unpaid" ? "✓" : ""}
                  </span>
                  <div>
                    <div>بدون راتب</div>
                    <div className="italic text-[10px] text-gray-600">Without pay</div>
                  </div>
                </label>
              </div>

              {/* Other reasons */}
              <div className="mt-3 pt-2 border-t border-gray-300 flex items-center gap-2 text-xs">
                <span className={`w-4 h-4 border-2 border-black inline-flex items-center justify-center font-bold text-xs ${currentVacationType === "other" ? "bg-black text-white" : "bg-white"}`}>
                  {currentVacationType === "other" ? "✓" : ""}
                </span>
                <span>لأسباب أخرى (حددها) / For another reason (Define it):</span>
                <span className="border-b border-black flex-1 px-2 font-bold min-h-[20px]">
                  {data.otherReasonText || "........................................................"}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Employee Signature Row */}
      <div className="flex justify-between items-center mb-6 px-4 text-xs md:text-sm font-bold">
        <div className="flex items-center gap-2 w-1/2">
          <span>توقيع الموظف / Employee's Signature:</span>
          <span className="border-b border-black flex-1 min-h-[20px]"></span>
        </div>
        <div className="flex items-center gap-2 w-1/3">
          <span>التاريخ / Date:</span>
          <span className="border-b border-black flex-1 px-2 text-center min-h-[20px]">
            {data.date || "2026/08/25"}
          </span>
        </div>
      </div>

      {/* Immediate Supervisor's Recommendation Box */}
      <div className="border-2 border-black rounded-xl p-4 mb-6 bg-gray-50/50 space-y-3">
        <h4 className="font-extrabold text-xs md:text-sm text-center border-b border-black pb-2">
          رأي المدير المباشر / Immediate Supervisor's recommendation
        </h4>

        {/* Options Grid */}
        <div className="space-y-2 text-xs font-bold px-2">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-black inline-flex items-center justify-center font-bold text-xs bg-white"></span>
            <span>موافق وقد تم تأمين البديل / Approved and we covered his work</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-black inline-flex items-center justify-center font-bold text-xs bg-white"></span>
            <span>موافق ولكن نحتاج من يحل محله / Approved and we need who cover his position</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-black inline-flex items-center justify-center font-bold text-xs bg-white"></span>
            <span>غير موافق / Not approved</span>
          </div>
        </div>

        {/* Supervisor Table */}
        <table className="w-full border-collapse border border-black mt-3 text-xs font-bold text-center">
          <tbody>
            <tr>
              <td className="border border-black p-1.5 bg-gray-100 w-1/4">الاسم / Name</td>
              <td className="border border-black p-1.5 w-1/4">{data.supervisorName || "........................"}</td>
              <td className="border border-black p-1.5 bg-gray-100 w-1/4">المسمى الوظيفي / Job Title</td>
              <td className="border border-black p-1.5 w-1/4">{data.supervisorJobTitle || "مشرف العمليات"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Final Signatures Footer */}
      <div className="grid grid-cols-2 gap-6 pt-2 text-xs md:text-sm font-bold">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span>توقيع المدير المباشر / Line manager's Signature:</span>
            <span className="border-b border-black flex-1 min-h-[20px]"></span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span>التاريخ / Date:</span>
            <span className="border-b border-black w-32 px-2 text-center">/ /</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span>توقيع مدير الإدارة / Department Manager Signature:</span>
            <span className="border-b border-black flex-1 min-h-[20px]"></span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span>التاريخ / Date:</span>
            <span className="border-b border-black w-32 px-2 text-center">/ /</span>
          </div>
        </div>
      </div>
    </div>
  );
}
