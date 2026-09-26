import React from "react";

export interface CashCustodyPromissoryData {
  riderName: string;
  iqamaNo: string;
  jobTitle?: string;
  department?: string;
  companyName?: string;
  date: string;
  custodyType?: string;
  amount: number | string;
  amountInWords?: string;
  promissoryDate?: string;
  promissoryNo?: string;
  deliveryMethod?: "cash" | "bank";
  bankAccountNo?: string;
}

export function CashCustodyPromissoryView({ data }: { data: CashCustodyPromissoryData }) {
  const formattedAmount = data.amount
    ? Number(data.amount).toLocaleString("en-US", { minimumFractionDigits: 0 })
    : "";

  return (
    <div className="bg-white text-black p-3 sm:p-5 print:p-2.5 rounded-xl border-2 border-black font-sans leading-normal text-right dir-rtl shadow-xs space-y-2.5 print:space-y-1 my-1">
      {/* Title */}
      <div className="text-center my-1 print:my-0.5">
        <h2 className="text-xl md:text-2xl print:text-base font-black tracking-wide text-black underline underline-offset-4">
          نموذج استلام عهدة نقدية لسند امر
        </h2>
      </div>

      {/* Header Info */}
      <div className="space-y-1 print:space-y-0 print:flex print:justify-between text-xs sm:text-sm print:text-[11px] font-bold text-gray-800">
        <div>
          اسم الشركة: <span className="font-extrabold">{data.companyName || "شركة اكسبرس جابت"}</span>
        </div>
        <div>
          التاريخ: <span>{data.date || "____ / ____ / ________م"}</span>
        </div>
      </div>

      {/* Employee Data Section */}
      <div className="space-y-1.5 print:space-y-0.5 pt-1.5 print:pt-0.5 border-t border-gray-300">
        <h3 className="font-extrabold text-sm md:text-base print:text-xs underline">
          بيانات الموظف (المستلم):
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-1.5 print:gap-x-4 print:gap-y-0.5 text-xs sm:text-sm print:text-[11px] font-semibold pr-1 print:pr-0">
          <div>
            الاسم رباعياً : <span className="font-bold border-b border-dotted border-black px-2">{data.riderName || "........................................................"}</span>
          </div>
          <div>
            رقم الهوية / الإقامة : <span dir="rtl" className="font-bold border-b border-dotted border-black px-2 dir-rtl inline-block">{data.iqamaNo || "...................................."}</span>
          </div>
          <div>
            المسمى الوظيفي : <span className="font-bold border-b border-dotted border-black px-2">{data.jobTitle || "سائق مندوب توصيل"}</span>
          </div>
          <div>
            القسم / الإدارة : <span className="font-bold border-b border-dotted border-black px-2">{data.department || "إدارة العمليات والتشغيل"}</span>
          </div>
        </div>
      </div>

      {/* Acknowledgment & Undertaking Section */}
      <div className="space-y-2 print:space-y-1 pt-1.5 print:pt-0.5">
        <h3 className="font-extrabold text-sm md:text-base print:text-xs underline">
          الإقرار والتعهد:
        </h3>
        <p className="text-xs sm:text-sm print:text-[11px] leading-relaxed print:leading-snug font-semibold text-gray-900 pr-1 print:pr-0">
          أقر أنا الموظف الموضحة بياناتي أعلاه، بأنني استلمت من شركة :{" "}
          <span className="font-bold border-b border-dotted border-black px-1">{data.companyName || "شركة اكسبرس جابت"}</span>{" "}
          عهدة وهي :{" "}
          <span className="font-bold border-b border-dotted border-black px-1">{data.custodyType || "عهدة نقدية للأعمال التشغيلية"}</span>{" "}
          بمبلغ وقدره ({" "}
          <span className="font-bold underline px-1 dir-ltr inline-block">{formattedAmount || "............"}</span>{" "}
          ريال سعودي) {data.amountInWords ? `(${data.amountInWords}) ` : ""}فقط لا غير، وذلك على سبيل العهدة النقدية المؤقتة/المستمرة الخاصة بأعمال الشركة.
        </p>
        <p className="text-xs sm:text-sm print:text-[11px] leading-relaxed print:leading-snug font-semibold text-gray-900 pr-1 print:pr-0">
          وقد قمت بتحرير وتوقيع سند لأمر لصالح الشركة بتاريخ{" "}
          <span className="font-bold border-b border-dotted border-black px-1">{data.promissoryDate || data.date || "____ / ____ / ________م"}</span>{" "}
          بقيمة العهدة المذكورة كضمان مالي للمحافظة على هذه العهدة وتسويتها ورقم السند :{" "}
          <span className="font-bold border-b border-dotted border-black px-1">{data.promissoryNo || "........................"}</span>
        </p>
      </div>

      {/* Commitments Bullet List */}
      <div className="space-y-1.5 print:space-y-0.5 pt-1.5 print:pt-0.5">
        <h3 className="font-extrabold text-sm md:text-base print:text-xs underline">
          وأتعهد بالتالي:
        </h3>
        <ul className="space-y-1 print:space-y-0.5 text-xs sm:text-sm print:text-[10px] leading-normal print:leading-tight font-semibold text-gray-900 pr-4 print:pr-3 list-disc list-inside">
          <li>
            استخدام العهدة فقط للأغراض المحددة لها والمتعلقة بنشاط الشركة، وفق اللوائح الداخلية.
          </li>
          <li>
            إعادة مبلغ العهدة أو تسوية العهدة بالكامل فور طلب إدارة الشركة، أو عند تقديم الاستقالة/إنهاء الخدمات لأي سبب كان.
          </li>
          <li>
            أقر بمسؤوليتي المالية والشخصية الكاملة عن أي سوء استخدام لهذه العهدة، ويحق للشركة اتخاذ الإجراءات النظامية واستيفاء قيمتها من السند لأمر المذكور أعلاه وفق الأنظمة المرعية.
          </li>
        </ul>
      </div>

      {/* Custody and Note Data Section */}
      <div className="space-y-1.5 print:space-y-0.5 pt-1.5 print:pt-0.5 border-t border-gray-300">
        <h3 className="font-extrabold text-sm md:text-base print:text-xs underline">
          بيانات العهدة والسند:
        </h3>
        <div className="space-y-1 print:space-y-0.5 text-xs sm:text-sm print:text-[11px] font-semibold pr-1 print:pr-0">
          <div>
            • مبلغ العهدة: <span className="font-bold underline dir-ltr inline-block px-1">{formattedAmount || "............"}</span> ريال سعودي
          </div>
          <div className="flex flex-wrap items-center gap-3 print:gap-2">
            <span>• طريقة التسليم:</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <span className="w-4 h-4 print:w-3.5 print:h-3.5 border border-black inline-flex items-center justify-center font-bold text-xs print:text-[10px]">
                {data.deliveryMethod === "cash" || !data.deliveryMethod ? "✓" : ""}
              </span>
              <span>نقداً</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <span className="w-4 h-4 print:w-3.5 print:h-3.5 border border-black inline-flex items-center justify-center font-bold text-xs print:text-[10px]">
                {data.deliveryMethod === "bank" ? "✓" : ""}
              </span>
              <span>تحويل بنكي (رقم الحساب: <span className="border-b border-dotted border-black px-2">{data.bankAccountNo || "........................................"}</span>)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Signatures Section */}
      <div className="pt-2 print:pt-1 border-t border-gray-300">
        <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-3 print:gap-4 items-start">
          {/* Employee Signature */}
          <div className="space-y-1.5 print:space-y-0.5">
            <h3 className="font-extrabold text-sm md:text-base print:text-xs underline">
              توقيع المستلم (الموظف):
            </h3>
            <div className="space-y-1 print:space-y-0.5 text-xs sm:text-sm print:text-[11px] font-semibold pr-1 print:pr-0">
              <div>
                الاسم : <span className="font-bold">{data.riderName || "........................................"}</span>
              </div>
              <div>
                التوقيع : <span className="font-bold">........................................</span>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <span>البصمة (السبابة اليمنى) :</span>
                <span className="w-16 h-10 print:w-14 print:h-8 border border-dashed border-gray-400 rounded-xs inline-block"></span>
              </div>
            </div>
          </div>

          {/* Deliverer Signature */}
          <div className="space-y-1.5 print:space-y-0.5 border-r-0 md:border-r print:border-r border-gray-300 pr-0 md:pr-4 print:pr-3">
            <h3 className="font-extrabold text-sm md:text-base print:text-xs underline">
              توقيع المسلّم (المسؤول المالي / الموارد البشرية):
            </h3>
            <div className="space-y-1 print:space-y-0.5 text-xs sm:text-sm print:text-[11px] font-semibold pr-1 print:pr-0">
              <div>
                الاسم : <span className="font-bold">........................................</span>
              </div>
              <div>
                التوقيع : <span className="font-bold">........................................</span>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <span>ختم الشركة :</span>
                <span className="w-16 h-10 print:w-14 print:h-8 border border-dashed border-gray-400 rounded-xs inline-block"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
