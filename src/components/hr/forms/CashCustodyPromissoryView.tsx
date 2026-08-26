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
    <div className="bg-white text-black p-6 md:p-10 rounded-xl border-2 border-black font-sans leading-relaxed text-right dir-rtl shadow-xs page-break-inside-avoid print-container min-h-[750px] space-y-6">
      {/* Title */}
      <div className="text-center my-2">
        <h2 className="text-xl md:text-2xl font-black tracking-wide text-black">
          نموذج استلام عهدة نقدية لسند امر
        </h2>
      </div>

      {/* Header Info */}
      <div className="space-y-1.5 text-sm md:text-base font-bold">
        <div>
          اسم الشركة: <span className="font-extrabold">{data.companyName || "شركة اكسبرس جابت"}</span>
        </div>
        <div>
          التاريخ: <span>{data.date || "____ / ____ / ________م"}</span>
        </div>
      </div>

      {/* Employee Data Section */}
      <div className="space-y-2 pt-2 border-t border-gray-300">
        <h3 className="font-extrabold text-base md:text-lg underline">
          بيانات الموظف (المستلم):
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm md:text-base font-semibold pr-2">
          <div>
            الاسم رباعياً : <span className="font-bold border-b border-dotted border-black px-2">{data.riderName || "........................................................"}</span>
          </div>
          <div>
            رقم الهوية / الإقامة : <span className="font-bold border-b border-dotted border-black px-2">{data.iqamaNo || "...................................."}</span>
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
      <div className="space-y-3 pt-2">
        <h3 className="font-extrabold text-base md:text-lg underline">
          الإقرار والتعهد:
        </h3>
        <p className="text-sm md:text-base leading-relaxed font-semibold text-gray-900 pr-2">
          أقر أنا الموظف الموضحة بياناتي أعلاه، بأنني استلمت من شركة :{" "}
          <span className="font-bold border-b border-dotted border-black px-1">{data.companyName || "شركة اكسبرس جابت"}</span>{" "}
          عهدة وهي :{" "}
          <span className="font-bold border-b border-dotted border-black px-1">{data.custodyType || "عهدة نقدية للأعمال التشغيلية"}</span>{" "}
          بمبلغ وقدره ({" "}
          <span className="font-bold underline px-1 dir-ltr inline-block">{formattedAmount || "............"}</span>{" "}
          ريال سعودي) {data.amountInWords ? `(${data.amountInWords}) ` : ""}فقط لا غير، وذلك على سبيل العهدة النقدية المؤقتة/المستمرة الخاصة بأعمال الشركة.
        </p>
        <p className="text-sm md:text-base leading-relaxed font-semibold text-gray-900 pr-2">
          وقد قمت بتحرير وتوقيع سند لأمر لصالح الشركة بتاريخ{" "}
          <span className="font-bold border-b border-dotted border-black px-1">{data.promissoryDate || data.date || "____ / ____ / ________م"}</span>{" "}
          بقيمة العهدة المذكورة كضمان مالي للمحافظة على هذه العهدة وتسويتها ورقم السند :{" "}
          <span className="font-bold border-b border-dotted border-black px-1">{data.promissoryNo || "........................"}</span>
        </p>
      </div>

      {/* Commitments Bullet List */}
      <div className="space-y-2 pt-2">
        <h3 className="font-extrabold text-base md:text-lg underline">
          وأتعهد بالتالي:
        </h3>
        <ul className="space-y-2 text-sm md:text-base font-semibold text-gray-900 pr-4 list-disc list-inside">
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
      <div className="space-y-2 pt-2 border-t border-gray-300">
        <h3 className="font-extrabold text-base md:text-lg underline">
          بيانات العهدة والسند:
        </h3>
        <div className="space-y-2 text-sm md:text-base font-semibold pr-2">
          <div>
            • مبلغ العهدة: <span className="font-bold underline dir-ltr inline-block px-1">{formattedAmount || "............"}</span> ريال سعودي -
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span>• طريقة التسليم:</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <span className="w-4 h-4 border border-black inline-flex items-center justify-center font-bold text-xs">
                {data.deliveryMethod === "cash" || !data.deliveryMethod ? "✓" : ""}
              </span>
              <span>نقداً</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <span className="w-4 h-4 border border-black inline-flex items-center justify-center font-bold text-xs">
                {data.deliveryMethod === "bank" ? "✓" : ""}
              </span>
              <span>تحويل بنكي (رقم الحساب: <span className="border-b border-dotted border-black px-2">{data.bankAccountNo || "........................................"}</span>)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Employee Signature */}
      <div className="space-y-3 pt-3 border-t border-gray-300">
        <h3 className="font-extrabold text-base md:text-lg underline">
          توقيع المستلم (الموظف):
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm md:text-base font-semibold pr-2 items-center">
          <div>
            الاسم - <span className="font-bold">{data.riderName || "........................................"}</span>
          </div>
          <div>
            التوقيع - <span className="font-bold">........................................</span>
          </div>
          <div className="flex items-center gap-2">
            <span>البصمة (السبابة اليمنى) -</span>
            <span className="w-16 h-12 border border-dashed border-gray-400 rounded-xs inline-block"></span>
          </div>
        </div>
      </div>

      {/* Deliverer Signature */}
      <div className="space-y-3 pt-3 border-t border-gray-300">
        <h3 className="font-extrabold text-base md:text-lg underline">
          توقيع المسلّم (المسؤول المالي / الموارد البشرية):
        </h3>
        <div className="text-sm md:text-base font-semibold pr-2">
          التوقيع : <span className="font-bold">........................................................</span>
        </div>
      </div>
    </div>
  );
}
