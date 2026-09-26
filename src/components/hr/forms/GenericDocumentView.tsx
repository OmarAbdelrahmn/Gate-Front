import React from "react";
import type { FormTemplate } from "./FormTemplateRegistry";
import { LetterheadHeader, LetterheadFooter, LetterheadWatermark, type LetterheadId } from "./LetterheadHeader";

export interface GenericDocumentData {
  riderName: string;
  iqamaNo: string;
  nationality: string;
  amount: number | string;
  amountInWords: string;
  reason: string;
  date: string;
  city: string;
  notes?: string;
  companyName?: string;
  letterheadId?: LetterheadId;
}

export function GenericDocumentView({
  template,
  data,
}: {
  template: FormTemplate;
  data: GenericDocumentData;
}) {
  const formattedAmount = data.amount
    ? Number(data.amount).toLocaleString("en-US", { minimumFractionDigits: 0 })
    : "";

  return (
    <div className="relative bg-white text-black p-6 md:p-8 print:p-4 rounded-xl border-2 border-black font-sans leading-relaxed text-right dir-rtl shadow-xs page-break-inside-avoid print-container min-h-[960px] print:min-h-0 print:h-auto flex flex-col justify-between overflow-hidden print:overflow-visible">
      {/* Background Watermark Image */}
      <LetterheadWatermark letterheadId={data.letterheadId} />

      <div className="relative z-10 space-y-4 print:space-y-2">
        {/* Header */}
        <LetterheadHeader
          letterheadId={data.letterheadId}
          companyName={data.companyName}
          date={data.date}
          refNo={data.iqamaNo ? data.iqamaNo.slice(-4) : undefined}
        />

        {/* Document Title */}
        <div className="text-center my-4 print:my-1.5">
          <h2 className="text-xl md:text-2xl print:text-lg font-black underline tracking-wide inline-block border-b-2 border-black pb-1">
            {template.titleAr}
          </h2>
        </div>

        {/* Employee / Delegate Info Box */}
        <div className="border-2 border-black rounded-xl p-4 print:p-2.5 mb-4 print:mb-2 bg-gray-50/50 space-y-2 print:space-y-1 font-semibold text-sm print:text-xs">
          <h3 className="font-extrabold text-base print:text-xs text-black border-b border-black pb-1.5 print:pb-1 mb-2 print:mb-1">
            بيانات المندوب / الموظف المعني
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:gap-1.5">
            <div>
              <span className="font-bold text-gray-700">اسم الموظف/المندوب: </span>
              <span className="font-extrabold text-black">{data.riderName || "لم يتم التحديد"}</span>
            </div>
            <div>
              <span className="font-bold text-gray-700">رقم الإقامة / الهوية: </span>
              <span dir="rtl" className="font-extrabold text-black dir-rtl inline-block">{data.iqamaNo || "لم يتم التحديد"}</span>
            </div>
            <div>
              <span className="font-bold text-gray-700">الجنسية: </span>
              <span className="font-extrabold text-black">{data.nationality || "غير محددة"}</span>
            </div>
            <div>
              <span className="font-bold text-gray-700">المدينة / الفرع: </span>
              <span className="font-extrabold text-black">{data.city || "مدينة جده"}</span>
            </div>
          </div>
        </div>

        {/* Template Specific Payload / Content */}
        <div className="border-2 border-black rounded-xl p-4 print:p-2.5 mb-6 print:mb-2 space-y-3 print:space-y-1.5 font-medium text-base print:text-xs leading-relaxed bg-white">
          <h3 className="font-extrabold text-base print:text-xs text-black border-b border-black pb-1.5 print:pb-1">
            تفاصيل النموذج والإقرار الرسمي
          </h3>

          {template.requiresAmount && (
            <div className="bg-gray-100/80 p-3 print:p-2 rounded-lg border border-black/30 font-bold text-sm print:text-xs space-y-1 print:space-y-0.5">
              <p>
                المبلغ المالي المعني: <span className="text-base print:text-xs underline dir-ltr font-extrabold">({formattedAmount} ريال)</span>
              </p>
              <p>
                المبلغ تفقيطاً بالعربية: <span className="underline font-extrabold">{data.amountInWords || "........................................................"}</span>
              </p>
            </div>
          )}

          {template.requiresReason && (
            <p>
              <strong className="font-bold">السبب / الغرض من هذا الإجراء:</strong>{" "}
              <span>{data.reason || "................................................................................................."}</span>
            </p>
          )}

          <p className="pt-1 print:pt-0.5 text-sm print:text-xs">
            بموجب هذا النموذج المعتمد رسمياً لدى إدارة الموارد البشرية، يقر الطرف المذكور أعلاه بصحة كافة البيانات المدونة بعاليه ويكون هذا المستند حجة رسمية وإثباتاً إدارياً وقانونياً عند الحاجة.
          </p>

          {data.notes && (
            <div className="pt-2 print:pt-1 border-t border-dashed border-gray-300 text-sm print:text-xs">
              <span className="font-bold">ملاحظات إضافية: </span>
              <span>{data.notes}</span>
            </div>
          )}
        </div>

        {/* Signatures Table */}
        <div className="border-2 border-black rounded-xl p-4 print:p-2.5 bg-gray-50/50 mt-6 print:mt-2">
          <h4 className="font-extrabold text-sm print:text-xs mb-4 print:mb-2 text-center border-b border-black pb-1.5 print:pb-1">
            التوقيعات والاعتمادات الرسمية
          </h4>
          <div className="grid grid-cols-3 text-center gap-3 font-bold text-xs md:text-sm print:text-xs">
            <div className="space-y-6 print:space-y-2">
              <p>توقيع صاحب الطلب / المندوب</p>
              <p className="text-gray-400 font-normal">.................................</p>
            </div>
            <div className="space-y-6 print:space-y-2">
              <p>مسؤول الموارد البشرية</p>
              <p className="text-gray-400 font-normal">.................................</p>
            </div>
            <div className="space-y-6 print:space-y-2">
              <p>اعتماد المدير التنفيذي</p>
              <p className="text-gray-400 font-normal">.................................</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 print:mt-1">
        <LetterheadFooter letterheadId={data.letterheadId} />
      </div>
    </div>
  );
}
