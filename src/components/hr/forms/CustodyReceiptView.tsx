import React from "react";

export interface CustodyReceiptData {
  riderName: string;
  iqamaNo: string;
  nationality: string;
  jobTitle?: string;
  date: string;
  companyName?: string;
  custodyItemsText?: string;
}

export function CustodyReceiptView({ data }: { data: CustodyReceiptData }) {
  return (
    <div className="bg-white text-black p-5 sm:p-6 md:p-7 print:p-3.5 print:py-3 rounded-xl border-2 border-black font-sans text-right dir-rtl shadow-xs flex flex-col justify-between my-1 sm:my-2 min-h-[660px] md:min-h-[720px] print:min-h-0">
      {/* Top Section */}
      <div className="space-y-3.5 sm:space-y-4 print:space-y-2">
        {/* Document Title */}
        <div className="text-center pt-1 pb-1 print:pb-0.5">
          <h2 className="text-2xl sm:text-3xl print:text-xl font-black tracking-wide text-black underline underline-offset-8 inline-block">
            إقرار وتعهد استلام عهدة
          </h2>
        </div>

        {/* Date Line Top Right */}
        <div className="flex justify-start font-bold text-sm print:text-xs text-gray-800 pb-0.5">
          <span>التاريخ: {data.date || "   /   /      م"}</span>
        </div>

        {/* Employee Info Block */}
        <div className="border border-black rounded-lg p-3 print:p-2 bg-gray-50/60 font-semibold text-xs sm:text-sm print:text-[12px] space-y-1.5 print:space-y-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-bold text-gray-700">اسم المستلم (الموظف): </span>
              <span className="font-black text-black">{data.riderName || "........................................................"}</span>
            </div>
            <div>
              <span className="font-bold text-gray-700">رقم الهوية / الإقامة: </span>
              <span dir="rtl" className="font-black text-black dir-rtl inline-block">{data.iqamaNo || "...................................."}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-bold text-gray-700">الجنسية: </span>
              <span className="font-black text-black">{data.nationality || "...................."}</span>
            </div>
            <div>
              <span className="font-bold text-gray-700">المسمى الوظيفي: </span>
              <span className="font-black text-black">{data.jobTitle || "سائق مندوب توصيل"}</span>
            </div>
          </div>
        </div>

        {/* Custody Items Table */}
        <div className="space-y-1.5 print:space-y-1">
          <h3 className="font-extrabold text-sm print:text-xs text-black border-b border-black pb-1">
            بيانات وتفاصيل العهدة المسلّمة:
          </h3>
          <table className="w-full border-collapse border border-black text-center text-xs print:text-[11.5px] font-semibold">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1.5 print:p-1 w-10">م</th>
                <th className="border border-black p-1.5 print:p-1 text-right pr-2">بيان العهدة / الصنف</th>
                <th className="border border-black p-1.5 print:p-1 w-24">العدد / الكمية</th>
                <th className="border border-black p-1.5 print:p-1 w-28">حالة العهدة</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1.5 print:p-1 font-bold">1</td>
                <td className="border border-black p-1.5 print:p-1 text-right pr-2">مركبة توصيل (سيارة / دراجة نارية) مع المفتاح ورخصة السير</td>
                <td className="border border-black p-1.5 print:p-1">1</td>
                <td className="border border-black p-1.5 print:p-1">ممتازة وسليمة</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 print:p-1 font-bold">2</td>
                <td className="border border-black p-1.5 print:p-1 text-right pr-2">صندوق حفظ طلبات حراري / حقيبة توصيل معتمدة</td>
                <td className="border border-black p-1.5 print:p-1">1</td>
                <td className="border border-black p-1.5 print:p-1">جديدة</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 print:p-1 font-bold">3</td>
                <td className="border border-black p-1.5 print:p-1 text-right pr-2">شريحة اتصال / هاتف جوال تشغيلي</td>
                <td className="border border-black p-1.5 print:p-1">1</td>
                <td className="border border-black p-1.5 print:p-1">جاهزة للعمل</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 print:p-1 font-bold">4</td>
                <td className="border border-black p-1.5 print:p-1 text-right pr-2">خوذة أمان وسترة فسفورية عاكسة للسلامة المهنية</td>
                <td className="border border-black p-1.5 print:p-1">1 طقم</td>
                <td className="border border-black p-1.5 print:p-1">سليمة ومطابقة</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legal Undertaking Clauses */}
        <div className="space-y-1.5 print:space-y-1 text-xs sm:text-sm print:text-[12px] leading-relaxed font-semibold text-gray-900 px-1">
          <p className="font-extrabold text-black">بنود الإقرار والتعهد:</p>
          <ul className="list-disc list-inside space-y-1 print:space-y-0.5 text-gray-800 pr-1">
            <li>أقر باستلام كافة الأصناف والمعدات الموضحة أعلاه بحالة جيدة وخالية من أي عيوب تشغيلية.</li>
            <li>أتعهد بالمحافظة التامة على هذه العهدة واستخدامها فقط في الأغراض المخصصة لأعمال الشركة.</li>
            <li>أتحمل المسؤولية النظامية والمالية الكاملة عن أي تلفيات، فقدان، أو مخالفات مرورية ناتجة عن إهمالي.</li>
            <li>أتعهد بإعادة العهدة فوراً إلى إدارة الشركة عند طلبها أو عند انتهاء أو إنهاء خدماتي لأي سبب.</li>
          </ul>
          <p className="pt-1.5 font-bold text-black text-xs sm:text-sm print:text-[12.5px]">
            وهذا إقرار مني وتعهد ملزم التزاماً قانونياً ونظامياً، والله على ما أقول شهيد.
          </p>
        </div>
      </div>

      {/* Bottom Section: Signatures */}
      <div className="space-y-3 print:space-y-1.5 pt-3 print:pt-1.5 border-t border-black/60">
        <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm print:text-[12px] font-bold">
          {/* Employee */}
          <div className="space-y-1.5 print:space-y-1">
            <p className="font-black text-black border-b border-black pb-1">المقر بما فيه (المستلم):</p>
            <p>الاسم: <span className="font-bold underline">{data.riderName || "................................"}</span></p>
            <p>التوقيع: ................................</p>
            <div className="flex items-center gap-2 pt-0.5">
              <span>البصمة:</span>
              <span className="inline-flex items-center justify-center w-20 h-12 print:w-18 print:h-11 border-2 border-dashed border-gray-400 rounded-md text-[10px] text-gray-400 font-normal">
                الإبهام
              </span>
            </div>
          </div>

          {/* HR / Custody Manager */}
          <div className="space-y-1.5 print:space-y-1 border-r border-gray-300 pr-3">
            <p className="font-black text-black border-b border-black pb-1">مسؤول العهد / الموارد البشرية:</p>
            <p>الاسم: ................................</p>
            <p>التوقيع: ................................</p>
            <div className="flex items-center gap-2 pt-0.5">
              <span>ختم الشركة:</span>
              <span className="inline-flex items-center justify-center w-20 h-12 print:w-18 print:h-11 border-2 border-dashed border-gray-400 rounded-md text-[10px] text-gray-400 font-normal">
                الختم الرسمي
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
