import React from "react";

export interface ResignationFormData {
  employeeName: string;
  iqamaNo: string;
  nationality?: string;
  mobile?: string;
  employeeNo?: string;
  city?: string;
  effectiveDay?: string;
  effectiveDate?: string;
  reasonText?: string;
  companyName?: string;
}

export function ResignationFormView({ data }: { data: ResignationFormData }) {
  return (
    <div className="bg-white text-black p-8 md:p-12 rounded-xl border-2 border-black font-sans leading-relaxed text-right dir-rtl shadow-xs page-break-inside-avoid print-container text-sm md:text-base">
      {/* Title */}
      <div className="text-center mb-8 border-b-2 border-black pb-3">
        <h1 className="text-sm md:text-base font-extrabold text-gray-900 mb-1">
          {data.companyName || "شركة اكسبرس جابت"}
        </h1>
        <h2 className="text-2xl md:text-3xl font-black text-black inline-block px-8">
          طلب استقالة
        </h2>
      </div>

      {/* Employee Details Table */}
      <table className="w-full border-collapse border-2 border-black mb-8 font-bold text-xs md:text-sm">
        <tbody>
          <tr className="border-b border-black">
            <td className="border-l border-black p-2.5 w-1/2">
              <span>الاسم: </span>
              <span className="font-extrabold text-sm underline">{data.employeeName || "........................................................"}</span>
            </td>
            <td className="p-2.5 w-1/2">
              <span>رقم الهوية: </span>
              <span className="font-extrabold text-sm underline">{data.iqamaNo || "...................................."}</span>
            </td>
          </tr>

          <tr className="border-b border-black">
            <td className="border-l border-black p-2.5">
              <span>الجنسية: </span>
              <span className="font-extrabold text-sm underline">{data.nationality || "...................................."}</span>
            </td>
            <td className="p-2.5">
              <span>رقم الجوال: </span>
              <span className="font-extrabold text-sm underline">{data.mobile || "...................................."}</span>
            </td>
          </tr>

          <tr>
            <td className="border-l border-black p-2.5">
              <span>الرقم الوظيفي: </span>
              <span className="font-extrabold text-sm underline">{data.employeeNo || (data.iqamaNo ? data.iqamaNo.slice(-5) : "........")}</span>
            </td>
            <td className="p-2.5">
              <span>المدينة: </span>
              <span className="font-extrabold text-sm underline">{data.city || "جدة"}</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Recipient & Salutation */}
      <div className="flex justify-between items-center font-extrabold text-base md:text-lg mb-4">
        <span>السيد مدير الموارد البشرية</span>
        <span>المحترم</span>
      </div>

      <div className="text-center font-extrabold text-lg md:text-xl my-6">
        تحية طيبة وبعد،،
      </div>

      {/* Request Content */}
      <div className="space-y-4 font-bold leading-loose text-sm md:text-base mb-8">
        <p className="leading-loose">
          الرجاء التكرم بالموافقة على قبول استقالتي من العمل وذلك اعتباراً من يوم{" "}
          <span className="border-b-2 border-black px-4 font-extrabold text-black inline-block">
            {data.effectiveDay || "...................."}
          </span>
        </p>

        <p className="leading-loose">
          الموافق{" "}
          <span className="border-b-2 border-black px-6 font-extrabold text-black inline-block">
            {data.effectiveDate || " / / 2026م"}
          </span>
        </p>

        <div className="pt-2">
          <p className="font-extrabold mb-2">وذلك بسبب :</p>
          <div className="border-2 border-black rounded-xl p-4 bg-gray-50/50 min-h-[110px] font-normal leading-relaxed text-sm">
            {data.reasonText ? (
              <p className="whitespace-pre-wrap">{data.reasonText}</p>
            ) : (
              <div className="space-y-3 text-gray-400">
                <p>................................................................................................................................................</p>
                <p>................................................................................................................................................</p>
                <p>................................................................................................................................................</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Signatures & Fingerprint */}
      <div className="flex justify-end gap-8 pt-4 font-extrabold text-sm md:text-base">
        <div className="space-y-3 text-center">
          <div className="flex items-center gap-3">
            <span>التوقيع : </span>
            <div className="w-44 h-12 border-2 border-black rounded-lg bg-gray-50 inline-flex items-center justify-center text-xs text-gray-400 font-normal">
              مكان التوقيع
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span>البصمة : </span>
            <div className="w-44 h-12 border-2 border-black rounded-lg bg-gray-50 inline-flex items-center justify-center text-xs text-gray-400 font-normal">
              مكان البصمة
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
