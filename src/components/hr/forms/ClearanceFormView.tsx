import React from "react";

export interface ClearanceFormData {
  employeeName: string;
  iqamaNo: string;
  employeeNo?: string;
  jobTitle?: string;
  department?: string;
  decisionNo?: string;
  decisionDate?: string;
  reason?: "leave" | "transfer" | "resignation" | "death" | "other";
  otherReason?: string;
  companyName?: string;
}

export function ClearanceFormView({ data }: { data: ClearanceFormData }) {
  const currentReason = data.reason || "resignation";
  const iqamaDigits = (data.iqamaNo || "").padEnd(10, " ").slice(0, 10).split("");

  return (
    <div className="bg-white text-black p-4 md:p-6 rounded-xl border-2 border-black font-sans leading-tight text-right dir-rtl shadow-xs page-break-inside-avoid print-container text-xs">
      {/* Title */}
      <div className="text-center mb-3 border-b-2 border-black pb-2">
        <h1 className="text-xs md:text-sm font-extrabold text-gray-900 mb-0.5">
          {data.companyName || "شركة اكسبرس جابت"}
        </h1>
        <h2 className="text-xl md:text-2xl font-black text-black inline-block px-6">
          نموذج إخلاء طرف
        </h2>
      </div>

      {/* Section (أ) / Section A */}
      <div className="mb-3 border-2 border-black rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-3 py-0.5 font-extrabold border-b border-black text-center text-xs">
          ( أ )
        </div>
        <table className="w-full border-collapse text-xs text-right font-bold">
          <tbody>
            {/* Row 1: Iqama Digits */}
            <tr className="border-b border-black">
              <td className="p-1.5 border-l border-black bg-gray-50/80 w-1/4">رقم الإقامة</td>
              <td colSpan={3} className="p-1.5">
                <div className="flex items-center gap-1 justify-start dir-ltr">
                  {iqamaDigits.map((digit, index) => (
                    <span
                      key={index}
                      className="w-5 h-5 border border-black inline-flex items-center justify-center font-black text-xs bg-white"
                    >
                      {digit.trim()}
                    </span>
                  ))}
                </div>
              </td>
            </tr>

            {/* Row 2: Name & Employee No */}
            <tr className="border-b border-black">
              <td className="p-1.5 border-l border-black bg-gray-50/80">الاسم</td>
              <td className="p-1.5 border-l border-black font-extrabold">{data.employeeName || "................................................"}</td>
              <td className="p-1.5 border-l border-black bg-gray-50/80">رقم الموظف</td>
              <td className="p-1.5 font-extrabold">{data.employeeNo || (data.iqamaNo ? data.iqamaNo.slice(-5) : "........")}</td>
            </tr>

            {/* Row 3: Job Title, Department */}
            <tr className="border-b border-black">
              <td className="p-1.5 border-l border-black bg-gray-50/80">الوظيفة</td>
              <td className="p-1.5 border-l border-black font-extrabold">{data.jobTitle || "سائق مندوب توصيل"}</td>
              <td className="p-1.5 border-l border-black bg-gray-50/80">الإدارة / القسم</td>
              <td className="p-1.5 font-extrabold">{data.department || "إدارة التشغيل والعمليات"}</td>
            </tr>

            {/* Row 4: Decision No & Date */}
            <tr className="border-b border-black">
              <td className="p-1.5 border-l border-black bg-gray-50/80">رقم قرار طي القيد</td>
              <td className="p-1.5 border-l border-black font-extrabold">{data.decisionNo || "...................."}</td>
              <td className="p-1.5 border-l border-black bg-gray-50/80">تاريخه</td>
              <td className="p-1.5 font-extrabold">{data.decisionDate || " / / 2026م"}</td>
            </tr>

            {/* Row 5: Reasons */}
            <tr>
              <td className="p-1.5 border-l border-black bg-gray-50/80">أسبابه</td>
              <td colSpan={3} className="p-1.5">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] ${currentReason === "leave" ? "bg-black text-white font-bold" : "bg-white"}`}>
                      {currentReason === "leave" ? "✓" : ""}
                    </span>
                    <span>إجازة</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] ${currentReason === "transfer" ? "bg-black text-white font-bold" : "bg-white"}`}>
                      {currentReason === "transfer" ? "✓" : ""}
                    </span>
                    <span>للنقل</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] ${currentReason === "resignation" ? "bg-black text-white font-bold" : "bg-white"}`}>
                      {currentReason === "resignation" ? "✓" : ""}
                    </span>
                    <span>لاستقالته</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] ${currentReason === "death" ? "bg-black text-white font-bold" : "bg-white"}`}>
                      {currentReason === "death" ? "✓" : ""}
                    </span>
                    <span>للوفاة</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <span className={`w-3.5 h-3.5 border border-black inline-flex items-center justify-center text-[10px] ${currentReason === "other" ? "bg-black text-white font-bold" : "bg-white"}`}>
                      {currentReason === "other" ? "✓" : ""}
                    </span>
                    <span>أخرى {data.otherReason ? `(${data.otherReason})` : ""}</span>
                  </label>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section (ب) / Section B */}
      <div className="mb-3 border-2 border-black rounded-lg p-2 text-center bg-gray-50/40">
        <div className="font-extrabold text-xs mb-1">( ب )</div>
        <p className="font-extrabold text-xs mb-3">
          الموضحة بياناته أعلاه خالي الطرف من العهد
        </p>

        <div className="flex justify-around items-center pt-1 font-bold text-xs">
          <div>
            <span>الختم</span>
            <div className="h-8 border border-dashed border-gray-400 rounded-md w-24 mt-0.5 inline-flex items-center justify-center text-[10px] text-gray-400">الختم الرسمي</div>
          </div>
          <div>
            <span>مدير عام إدارة شؤون الموظفين</span>
            <p className="mt-3 text-gray-400 font-normal">........................................................</p>
          </div>
        </div>
      </div>

      {/* Section (ج) / Section C: Clearances Grid 1 to 6 */}
      <div className="space-y-2">
        {/* Item 1 */}
        <div className="border border-black rounded-md p-2 space-y-1">
          <div className="flex justify-between items-center font-extrabold text-xs">
            <span>جـ / 1</span>
            <div className="flex gap-4">
              <span>☐ مطالب بعهدة ( ................................................. )</span>
              <span>☐ غير مطالب</span>
            </div>
          </div>
          <div className="flex justify-between items-center text-xs font-bold pt-0.5">
            <span>المدير المباشر</span>
            <span>التوقيع: ............................</span>
            <span>الختم</span>
          </div>
        </div>

        {/* Item 2 */}
        <div className="border border-black rounded-md p-2 space-y-1">
          <div className="flex justify-between items-center font-extrabold text-xs">
            <span>جـ / 2</span>
            <div className="flex gap-4">
              <span>☐ مطالب بعهدة ( عينية ) ( ................................................. )</span>
              <span>☐ غير مطالب</span>
            </div>
          </div>
          <div className="flex justify-between items-center text-xs font-bold pt-0.5">
            <span>مسئول المخازن</span>
            <span>التوقيع: ............................</span>
            <span>الختم</span>
          </div>
        </div>

        {/* Item 3 */}
        <div className="border border-black rounded-md p-2 space-y-1">
          <div className="flex justify-between items-center font-extrabold text-xs">
            <span>جـ / 3</span>
            <div className="flex gap-4">
              <span>☐ مطالب بعهدة ( نقدية )</span>
              <span>☐ غير مطالب</span>
            </div>
          </div>
          <div className="flex justify-between items-center text-xs font-bold pt-0.5">
            <span>مسئول الحسابات</span>
            <span>التوقيع: ............................</span>
            <span>الختم</span>
          </div>
        </div>

        {/* Item 4 */}
        <div className="border border-black rounded-md p-2 space-y-1">
          <div className="flex justify-between items-center font-extrabold text-xs">
            <span>جـ / 4</span>
            <div className="flex gap-4">
              <span>☐ مطالب بعهدة ( عينية )</span>
              <span>☐ غير مطالب</span>
            </div>
          </div>
          <div className="flex justify-between items-center text-xs font-bold pt-0.5">
            <span>الموارد البشرية</span>
            <span>التوقيع: ............................</span>
            <span>الختم</span>
          </div>
        </div>

        {/* Item 5 */}
        <div className="border border-black rounded-md p-2 space-y-1">
          <div className="flex justify-between items-center font-extrabold text-xs">
            <span>جـ / 5</span>
            <div className="flex gap-4">
              <span>☐ مطالب بعهدة ( عينية )</span>
              <span>☐ غير مطالب</span>
            </div>
          </div>
          <div className="flex justify-between items-center text-xs font-bold pt-0.5">
            <span>مسئول إدارة الخدمات والصيانة</span>
            <span>التوقيع: ............................</span>
            <span>الختم</span>
          </div>
        </div>

        {/* Item 6 */}
        <div className="border-2 border-black rounded-md p-2 space-y-1.5 bg-gray-50/30">
          <div className="font-extrabold text-xs">جـ / 6</div>
          <div className="text-xs font-bold space-y-0.5">
            <p>سعادة مدير عام إدارة شؤون الموظفين المحترم</p>
            <div className="flex justify-between text-[11px] font-semibold text-gray-700">
              <span>الرقم: ....................</span>
              <span>التاريخ: / / 2026م</span>
            </div>
            <p className="pt-0.5">
              وحيث تم إجراء اللازم ولا يوجد على المذكور عهد، آمل إستكمال إجراءات منحه إخلاء طرف حسب المتبع.
            </p>
          </div>

          <div className="flex justify-between items-center text-xs font-extrabold pt-1">
            <span>مدير عام إدارة</span>
            <span>التوقيع: ........................................</span>
          </div>
        </div>
      </div>
    </div>
  );
}
