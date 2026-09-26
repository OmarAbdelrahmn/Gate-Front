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
    <div className="text-black font-sans leading-loose text-right dir-rtl space-y-6">
      {/* Title */}
      <div className="text-center mb-1">
        <h2 className="text-2xl font-black tracking-wide text-black underline underline-offset-4">
          نموذج استلام عهدة نقدية لسند امر
        </h2>
      </div>

      {/* Employee Data Section */}
      <div className="space-y-3 pt-3 border-t border-gray-400">
        <h3 className="font-extrabold text-base underline">
          بيانات الموظف (المستلم):
        </h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-base font-semibold pr-2">
          <div>
            الاسم رباعياً:{" "}
            <span className="font-bold border-b border-dotted border-black px-1">
              {data.riderName || "........................................................"}
            </span>
          </div>
          <div>
            رقم الهوية / الإقامة:{" "}
            <span className="font-bold border-b border-dotted border-black px-1">
              {data.iqamaNo || "...................................."}
            </span>
          </div>
          <div>
            المسمى الوظيفي:{" "}
            <span className="font-bold border-b border-dotted border-black px-1">
              {data.jobTitle || "سائق مندوب توصيل"}
            </span>
          </div>
          <div>
            القسم / الإدارة:{" "}
            <span className="font-bold border-b border-dotted border-black px-1">
              {data.department || "إدارة العمليات والتشغيل"}
            </span>
          </div>
        </div>
      </div>

      {/* Acknowledgment & Undertaking Section */}
      <div className="space-y-3 pt-3">
        <h3 className="font-extrabold text-base underline">الإقرار والتعهد:</h3>
        <p className="text-base leading-loose font-semibold text-gray-900 pr-2">
          أقر أنا الموظف الموضحة بياناتي أعلاه، بأنني استلمت من شركة :{" "}
          <span className="font-bold border-b border-dotted border-black px-1">
            {data.companyName || "شركة اكسبرس جابت"}
          </span>{" "}
          عهدة وهي :{" "}
          <span className="font-bold border-b border-dotted border-black px-1">
            {data.custodyType || "عهدة نقدية للأعمال التشغيلية"}
          </span>{" "}
          بمبلغ وقدره ({" "}
          <span className="font-bold underline px-1 dir-ltr inline-block">
            {formattedAmount || "............"}
          </span>{" "}
          ريال سعودي) {data.amountInWords ? `(${data.amountInWords}) ` : ""}فقط لا غير، وذلك على سبيل العهدة النقدية المؤقتة/المستمرة الخاصة بأعمال الشركة.
        </p>
        <p className="text-base leading-loose font-semibold text-gray-900 pr-2">
          وقد قمت بتحرير وتوقيع سند لأمر لصالح الشركة بتاريخ{" "}
          <span className="font-bold border-b border-dotted border-black px-1">
            {data.promissoryDate || data.date || "____ / ____ / ________م"}
          </span>{" "}
          بقيمة العهدة المذكورة كضمان مالي للمحافظة على هذه العهدة وتسويتها ورقم السند :{" "}
          <span className="font-bold border-b border-dotted border-black px-1">
            {data.promissoryNo || "........................"}
          </span>
        </p>
      </div>

      {/* Commitments Bullet List */}
      <div className="space-y-3 pt-2">
        <h3 className="font-extrabold text-base underline">وأتعهد بالتالي:</h3>
        <ul className="space-y-3 text-base font-semibold text-gray-900 pr-4 list-disc list-inside">
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
      <div className="space-y-2 pt-3 border-t border-gray-400">
        <h3 className="font-extrabold text-base underline">بيانات العهدة والسند:</h3>
        <div className="space-y-3 text-base font-semibold pr-2">
          <div>
            • مبلغ العهدة:{" "}
            <span className="font-bold underline dir-ltr inline-block px-1">
              {formattedAmount || "............"}
            </span>{" "}
            ريال سعودي -
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
              <span>
                تحويل بنكي (رقم الحساب:{" "}
                <span className="border-b border-dotted border-black px-2">
                  {data.bankAccountNo || "........................................"}
                </span>
                )
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Signatures Section */}
      <div className="pt-2 border-t border-gray-400">
        <div className="grid grid-cols-2 gap-6 items-start">
          {/* Employee Signature */}
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-base underline">
              توقيع المستلم (الموظف):
            </h3>
            <div className="space-y-1.5 text-base font-semibold pr-1">
              <div>
                الاسم :{" "}
                <span className="font-bold">
                  {data.riderName || "........................................"}
                </span>
              </div>
              <div>
                التوقيع : <span className="font-bold">........................................</span>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <span>البصمة (السبابة اليمنى) :</span>
                <span className="w-16 h-10 border border-dashed border-gray-400 rounded-xs inline-block" />
              </div>
            </div>
          </div>

          {/* Deliverer Signature */}
          <div className="space-y-1.5 border-r border-gray-300 pr-4">
            <h3 className="font-extrabold text-base underline">
              توقيع المسلّم (المسؤول المالي / الموارد البشرية):
            </h3>
            <div className="space-y-1.5 text-base font-semibold pr-1">
              <div>
                الاسم : <span className="font-bold">........................................</span>
              </div>
              <div>
                التوقيع : <span className="font-bold">........................................</span>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <span>ختم الشركة :</span>
                <span className="w-16 h-10 border border-dashed border-gray-400 rounded-xs inline-block" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
