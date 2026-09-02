import React from "react";
import { LetterheadHeader, LetterheadFooter, LetterheadWatermark, type LetterheadId } from "./LetterheadHeader";

export interface SimHandoverReceiptData {
  companyName?: string;
  date?: string;
  formNumber?: string;
  riderName?: string;
  iqamaNo?: string;
  jobTitle?: string;
  employeeCode?: string;
  carrierName?: string;
  phoneNumber?: string;
  iccid?: string;
  receiptDate?: string;
  responsibleEmployeeName?: string;
  letterheadId?: LetterheadId;
  notes?: string;
}

export function SimHandoverReceiptView({ data }: { data: SimHandoverReceiptData }) {
  const compName = data.companyName || "شركة اكسبرس جابت";
  const formattedDate = data.date || "____ / ____ / ________ م";
  const formNo = data.formNumber || "SIM-2026/001";
  const receiptDate = data.receiptDate || formattedDate;
  const activeCarrier = (data.carrierName || "").trim();

  // Helper to determine carrier badge/checkbox state
  const isCarrierSelected = (name: string) => {
    if (!activeCarrier) return false;
    return activeCarrier.toLowerCase().includes(name.toLowerCase());
  };

  return (
    <div className="relative bg-white text-black p-6 md:p-10 rounded-xl border-2 border-black font-sans leading-relaxed text-right dir-rtl shadow-xs page-break-inside-avoid print-container min-h-[920px] flex flex-col justify-between overflow-hidden">
      {/* Background Watermark Image if letterhead is set */}
      <LetterheadWatermark letterheadId={data.letterheadId} />

      <div className="relative z-10 space-y-6">
        {/* Header Header if letterheadId is active */}
        {data.letterheadId && data.letterheadId !== "standard" ? (
          <LetterheadHeader
            letterheadId={data.letterheadId}
            companyName={compName}
            date={data.date}
            refNo={formNo}
          />
        ) : (
          <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-2">
            <div>
              <h1 className="text-xl font-black">{compName}</h1>
              <p className="text-xs font-semibold text-gray-700">إدارة الأسطول والاتصالات (Fleet & SIMs)</p>
            </div>
            <div className="text-left text-xs font-bold font-mono">
              <p>التاريخ: {data.date || "____ / ____ / ________ م"}</p>
              <p>رقم النموذج: {formNo}</p>
            </div>
          </div>
        )}

        {/* Title */}
        <div className="text-center my-4">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-wide text-black border-b-2 border-black inline-block pb-1 px-4">
            نموذج استلام شريحة جوال
          </h2>
        </div>

        {/* Basic Form Information Header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm md:text-base font-bold bg-gray-50/80 p-3 rounded-lg border border-black/30">
          <div>
            <span className="text-gray-700">اسم الشركة: </span>
            <span className="font-extrabold text-black">{compName}</span>
          </div>
          <div className="text-center">
            <span className="text-gray-700">التاريخ: </span>
            <span className="font-extrabold text-black dir-ltr inline-block">{formattedDate}</span>
          </div>
          <div className="text-left">
            <span className="text-gray-700">رقم النموذج: </span>
            <span className="font-extrabold text-black font-mono">{formNo}</span>
          </div>
        </div>

        {/* Section 1: Employee Information (أقر أنا الموظف) */}
        <div className="space-y-3 pt-2">
          <h3 className="text-base md:text-lg font-black text-black border-r-4 border-black pr-2">
            أقر أنا الموظف
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm md:text-base font-semibold pr-2">
            <div className="flex items-center gap-2">
              <span className="font-bold min-w-[120px]">الاسم:</span>
              <span className="border-b-2 border-dotted border-black flex-1 px-2 font-bold underline decoration-1 underline-offset-4">
                {data.riderName || "...................................................................."}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold min-w-[140px]">رقم الهوية / الإقامة:</span>
              <span className="border-b-2 border-dotted border-black flex-1 px-2 font-mono font-bold">
                {data.iqamaNo || "...................................................................."}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold min-w-[120px]">المسمى الوظيفي:</span>
              <span className="border-b-2 border-dotted border-black flex-1 px-2">
                {data.jobTitle || "سائق مندوب توصيل"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold min-w-[140px]">رقم الموظف:</span>
              <span className="border-b-2 border-dotted border-black flex-1 px-2 font-mono">
                {data.employeeCode || "...................................................................."}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: SIM Specifications (بيانات شريحة الجوال) */}
        <div className="space-y-4 pt-2">
          <h3 className="text-base md:text-lg font-black text-black border-r-4 border-black pr-2">
            بأنني استلمت من الشركة شريحة جوال بالبيانات التالية:
          </h3>

          <div className="space-y-3 font-semibold text-sm md:text-base pr-2">
            {/* Carrier Name Selector Badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold min-w-[120px]">اسم المشغل:</span>
              <div className="flex items-center gap-4 text-sm md:text-base">
                {["موبايلي", "زين", "STC", "أخرى"].map((carrier) => {
                  const selected = isCarrierSelected(carrier);
                  return (
                    <span
                      key={carrier}
                      className={`px-3 py-1 rounded-md border text-xs md:text-sm font-bold flex items-center gap-1.5 ${
                        selected
                          ? "border-black bg-black text-white"
                          : "border-black/40 text-black bg-white"
                      }`}
                    >
                      <span className="inline-block size-3 rounded-full border border-black flex-shrink-0 bg-white" style={{ background: selected ? '#000' : '#fff' }} />
                      {carrier}
                    </span>
                  );
                })}
              </div>
              {activeCarrier && (
                <span className="font-extrabold text-black bg-gray-100 px-2.5 py-0.5 rounded border border-gray-300">
                  ({activeCarrier})
                </span>
              )}
            </div>

            {/* Phone Number */}
            <div className="flex items-center gap-2">
              <span className="font-bold min-w-[120px]">رقم الجوال:</span>
              <span className="border-b-2 border-dotted border-black flex-1 px-2 font-mono font-black text-base md:text-lg dir-ltr text-right">
                {data.phoneNumber || "...................................................................."}
              </span>
            </div>

            {/* SIM Serial (ICCID) */}
            <div className="flex items-center gap-2">
              <span className="font-bold min-w-[170px]">الرقم التسلسلي للشريحة (SIM):</span>
              <span className="border-b-2 border-dotted border-black flex-1 px-2 font-mono font-bold text-sm md:text-base dir-ltr text-right">
                {data.iccid || "...................................................................."}
              </span>
            </div>

            {/* Receipt Date */}
            <div className="flex items-center gap-2">
              <span className="font-bold min-w-[120px]">تاريخ الاستلام:</span>
              <span className="border-b-2 border-dotted border-black flex-1 px-2 font-mono font-bold dir-ltr text-right">
                {receiptDate}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Declaration & Undertaking Text (التعهد) */}
        <div className="p-4 rounded-xl border-2 border-black bg-gray-50/60 my-4">
          <p className="text-sm md:text-base font-semibold leading-relaxed text-black text-justify">
            وأتعهد بالمحافظة على الشريحة واستخدامها للأغراض الرسمية الخاصة بالعمل فقط، وعدم تسليمها لأي شخص آخر دون موافقة الشركة، وأتحمل المسؤولية الكاملة عن أي سوء استخدام أو فقدان أو إهمال، وألتزم بإعادتها عند طلب الشركة أو عند انتهاء العلاقة التعاقدية.
          </p>
        </div>

        {/* Section 4: Signatures & Approvals (التوقيع والاعتماد) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t-2 border-black font-bold text-sm md:text-base">
          {/* Employee Signature Column */}
          <div className="space-y-4 pr-2">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">اسم الموظف:</span>
              <span className="border-b-2 border-dotted border-black flex-1 px-2 font-bold">
                {data.riderName || "........................................................"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">التوقيع:</span>
              <span className="border-b-2 border-dotted border-black flex-1 h-8"></span>
            </div>

            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">البصمة:</span>
              <div className="w-32 h-16 rounded border-2 border-dashed border-black/50 flex items-center justify-center text-xs text-gray-400 font-normal">
                (البصمة هنا)
              </div>
            </div>
          </div>

          {/* Delivery Officer Signature Column */}
          <div className="space-y-4 pr-2 border-r-0 md:border-r-2 md:border-black/30 md:pr-4">
            <div className="font-extrabold text-black text-base border-b border-black/30 pb-1">
              مسؤول التسليم
            </div>

            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">الاسم:</span>
              <span className="border-b-2 border-dotted border-black flex-1 px-2 font-bold">
                {data.responsibleEmployeeName || "........................................................"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">التوقيع:</span>
              <span className="border-b-2 border-dotted border-black flex-1 h-8"></span>
            </div>

            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">التاريخ:</span>
              <span className="border-b-2 border-dotted border-black flex-1 px-2 font-mono dir-ltr text-right">
                {data.date || "____ / ____ / ________ م"}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="whitespace-nowrap">ختم الشركة:</span>
              <div className="w-24 h-16 rounded-full border-2 border-dashed border-black/40 flex items-center justify-center text-[10px] text-gray-400 font-normal text-center">
                ختم الشركة
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer if letterheadId is active */}
      {data.letterheadId && data.letterheadId !== "standard" && (
        <div className="relative z-10 pt-4">
          <LetterheadFooter letterheadId={data.letterheadId} />
        </div>
      )}
    </div>
  );
}
