import React from "react";

export interface PromissoryNoteData {
  riderName: string;
  iqamaNo: string;
  nationality: string;
  amount: number | string;
  amountInWords: string;
  issueDate: string;
  issueCity: string;
  paymentCity: string;
  companyName: string;
  companyCr: string;
  dueDate: string;
}

export function PromissoryNoteView({ data }: { data: PromissoryNoteData }) {
  const formattedAmount = data.amount
    ? Number(data.amount).toLocaleString("en-US", { minimumFractionDigits: 0 })
    : "15000";

  return (
    <div className="bg-white text-black p-6 md:p-8 rounded-xl border-2 border-black font-sans leading-relaxed text-right dir-rtl shadow-xs page-break-inside-avoid print-container">
      {/* Document Title */}
      <div className="text-center my-4">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-wide">
          (سند لأمر)
        </h2>
      </div>

      {/* Top Details Table */}
      <div className="flex justify-center mb-6">
        <table className="border-collapse border-2 border-black text-center min-w-[260px] max-w-[340px] text-xs md:text-sm font-bold">
          <tbody>
            <tr>
              <td className="border-2 border-black p-1.5 bg-gray-100/60 font-bold w-1/2">
                تاريخ التحرير
              </td>
              <td className="border-2 border-black p-1.5 w-1/2">
                {data.issueDate || "2026/08/25"}
              </td>
            </tr>
            <tr>
              <td className="border-2 border-black p-1.5 bg-gray-100/60 font-bold">
                مكان التحرير
              </td>
              <td className="border-2 border-black p-1.5">
                {data.issueCity || "مدينة جده"}
              </td>
            </tr>
            <tr>
              <td className="border-2 border-black p-1.5 bg-gray-100/60 font-bold">
                مكان الوفاء
              </td>
              <td className="border-2 border-black p-1.5">
                {data.paymentCity || "مدينة جده"}
              </td>
            </tr>
            <tr>
              <td className="border-2 border-black p-1.5 bg-gray-100/60 font-bold">
                المبلغ
              </td>
              <td className="border-2 border-black p-1.5 dir-ltr text-center font-extrabold text-base">
                ( {formattedAmount} ريال )
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Main Legal Declaration Body */}
      <div className="space-y-4 text-sm md:text-base leading-relaxed px-2 md:px-4 mb-6 font-medium">
        <p>
          أتعهد أنا الموقع أدناه بأن أدفع بدون قيد أو شرط بموجب هذا السند لأمر:{" "}
          <strong className="font-extrabold text-black">
            {data.companyName || "شركة ألبوابا الموكبلا"}
          </strong>{" "}
          سجل تجاري رقم: (
          <span className="font-bold">{data.companyCr || "4030362130"}</span>) - المبلغ وقدره (
          <span className="font-bold">{formattedAmount}</span>){" "}
          <strong className="underline font-bold">
            {data.amountInWords || "خمسة عشر ألف ريال سعودي لا غير"}
          </strong>.
        </p>

        <p className="font-bold">
          تاريخ استحقاق الوفاء: {data.dueDate || "عند الطلب"}.
        </p>

        <p className="pt-1 text-gray-900 font-medium text-xs md:text-sm">
          ولحامل هذا السند حق الرجوع بلا مصروفات وبدون إخطار أو عمل احتجاج لعدم الوفاء.
        </p>
      </div>

      {/* Promisor Table */}
      <div className="flex justify-center mb-6">
        <table className="border-collapse border-2 border-black w-full max-w-[500px] text-right text-xs md:text-sm font-bold">
          <tbody>
            <tr>
              <td className="border-2 border-black p-2 bg-gray-100/60 font-bold w-1/3 text-center">
                محرر السند
              </td>
              <td className="border-2 border-black p-2 font-bold px-3">
                {data.riderName || "........................................................"}
              </td>
            </tr>
            <tr>
              <td className="border-2 border-black p-2 bg-gray-100/60 font-bold text-center">
                الجنسية
              </td>
              <td className="border-2 border-black p-2 font-bold px-3">
                {data.nationality || "........................................................"}
              </td>
            </tr>
            <tr>
              <td className="border-2 border-black p-2 bg-gray-100/60 font-bold text-center">
                رقم الإقامة
              </td>
              <td className="border-2 border-black p-2 font-bold px-3">
                {data.iqamaNo || "........................................................"}
              </td>
            </tr>
            <tr>
              <td className="border-2 border-black p-2 bg-gray-100/60 font-bold text-center h-[45px] vertical-middle">
                التوقيع
              </td>
              <td className="border-2 border-black p-2"></td>
            </tr>
            <tr>
              <td className="border-2 border-black p-2 bg-gray-100/60 font-bold text-center h-[55px] vertical-middle">
                البصمة
              </td>
              <td className="border-2 border-black p-2"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Legal Citation */}
      <div className="text-center border-t-2 border-dashed border-gray-400 pt-3 mt-4 text-xs font-bold text-gray-800">
        ** هذا السند واجب الدفع بموجب نظام الأوراق التجارية وقرار مجلس الوزراء رقم 692 بتاريخ 1383/9/26هـ والمتروج بالمرسوم الملكي رقم 37 في 1383/10/11هـ
      </div>
    </div>
  );
}

