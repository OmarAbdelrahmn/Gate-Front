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
    const lower = activeCarrier.toLowerCase();
    if (name === "STC") return lower.includes("stc") || lower.includes("اس تي سي");
    if (name === "موبايلي") return lower.includes("موبايلي") || lower.includes("mobily");
    if (name === "زين") return lower.includes("زين") || lower.includes("zain");
    if (name === "سلام") return lower.includes("سلام") || lower.includes("salam");
    if (name === "أخرى") {
      const known = ["stc", "اس تي سي", "موبايلي", "mobily", "زين", "zain", "سلام", "salam"];
      return !known.some((k) => lower.includes(k)) || lower.includes("أخرى");
    }
    return lower.includes(name.toLowerCase());
  };

  return (
    <div
      className="relative bg-white text-black p-5 md:p-8 print:p-3.5 print:py-2.5 rounded-xl border-2 border-black font-sans leading-normal text-right dir-rtl shadow-xs page-break-inside-avoid print-container print-page-frame min-h-[900px] md:min-h-[960px] flex flex-col justify-between overflow-hidden"
    >
      {/* Background Watermark Image if letterhead is set */}
      <LetterheadWatermark letterheadId={data.letterheadId} />

      <div className="relative z-10 space-y-3 print:space-y-1.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header if letterheadId is active */}
          {data.letterheadId && data.letterheadId !== "standard" ? (
            <LetterheadHeader
              letterheadId={data.letterheadId}
              companyName={compName}
              date={data.date}
              refNo={formNo}
            />
          ) : (
            <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-1.5">
              <div>
                <h1 className="text-lg font-black">{compName}</h1>
                <p className="text-[11px] font-semibold text-gray-700">إدارة الأسطول والاتصالات (Fleet & SIMs)</p>
              </div>
              <div className="text-left text-[11px] font-bold font-mono">
                <p>التاريخ: {data.date || "____ / ____ / ________ م"}</p>
                <p>رقم النموذج: {formNo}</p>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="text-center my-1.5 print:my-0.5">
            <h2 className="text-xl md:text-2xl print:text-lg font-black tracking-wide text-black border-b-2 border-black inline-block pb-0.5 px-4">
              نموذج استلام شريحة جوال
            </h2>
          </div>

          {/* Basic Form Information Header Strip */}
          <div className="flex justify-between items-center text-xs print:text-[11px] font-bold bg-gray-50/80 p-2 print:p-1 rounded-md border border-black/30 mb-2 print:mb-1">
            <div>
              <span className="text-gray-700">اسم الشركة: </span>
              <span className="font-extrabold text-black">{compName}</span>
            </div>
            <div>
              <span className="text-gray-700">التاريخ: </span>
              <span className="font-extrabold text-black dir-ltr inline-block">{formattedDate}</span>
            </div>
            <div>
              <span className="text-gray-700">رقم النموذج: </span>
              <span className="font-extrabold text-black font-mono">{formNo}</span>
            </div>
          </div>

          {/* Section 1: Employee Information (أقر أنا الموظف) */}
          <div className="space-y-1.5 print:space-y-0.5 pt-1">
            <h3 className="text-xs sm:text-sm print:text-[12px] font-black text-black border-r-3 border-black pr-1.5">
              أقر أنا الموظف
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 print:gap-y-0.5 text-xs sm:text-sm print:text-[11px] font-semibold pr-1">
              <div className="flex items-center gap-1.5">
                <span className="font-bold min-w-[75px]">الاسم:</span>
                <span className="border-b border-dotted border-black flex-1 px-1 font-bold underline decoration-1 underline-offset-2">
                  {data.riderName || "........................................................"}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold min-w-[100px]">رقم الهوية / الإقامة:</span>
                <span dir="rtl" className="border-b border-dotted border-black flex-1 px-1 font-mono font-bold dir-rtl inline-block">
                  {data.iqamaNo || "...................................."}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold min-w-[75px]">المسمى الوظيفي:</span>
                <span className="border-b border-dotted border-black flex-1 px-1">
                  {data.jobTitle || "سائق مندوب توصيل"}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold min-w-[100px]">رقم الموظف:</span>
                <span className="border-b border-dotted border-black flex-1 px-1 font-mono">
                  {data.employeeCode || "...................................."}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: SIM Specifications (بيانات شريحة الجوال) */}
          <div className="space-y-1.5 print:space-y-0.5 pt-2 print:pt-1">
            <h3 className="text-xs sm:text-sm print:text-[12px] font-black text-black border-r-3 border-black pr-1.5">
              بأنني استلمت من الشركة شريحة جوال بالبيانات التالية:
            </h3>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 print:gap-y-0.5 font-semibold text-xs sm:text-sm print:text-[11px] pr-1">
              {/* Carrier Selector Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold min-w-[75px]">اسم المشغل:</span>
                <div className="flex items-center gap-1.5 text-xs flex-wrap">
                  {["STC", "موبايلي", "زين", "سلام", "أخرى"].map((carrier) => {
                    const selected = isCarrierSelected(carrier);
                    return (
                      <span
                        key={carrier}
                        className={`px-1.5 py-0.5 rounded border text-[10px] sm:text-xs font-bold flex items-center gap-1 ${
                          selected
                            ? "border-black bg-black text-white"
                            : "border-black/40 text-black bg-white"
                        }`}
                      >
                        <span
                          className="inline-block size-1.5 rounded-full border border-black flex-shrink-0"
                          style={{ background: selected ? '#fff' : '#000' }}
                        />
                        {carrier}
                      </span>
                    );
                  })}
                  {activeCarrier && isCarrierSelected("أخرى") && activeCarrier !== "أخرى" && (
                    <span className="font-bold text-[11px] underline px-0.5">({activeCarrier})</span>
                  )}
                </div>
              </div>

              {/* Phone Number */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold min-w-[75px]">رقم الجوال:</span>
                <span className="border-b border-dotted border-black flex-1 px-1 font-mono font-black text-xs sm:text-sm dir-ltr text-right">
                  {data.phoneNumber || "...................................."}
                </span>
              </div>

              {/* SIM Serial (ICCID) */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold min-w-[125px]">الرقم التسلسلي (SIM):</span>
                <span className="border-b border-dotted border-black flex-1 px-1 font-mono font-bold text-xs dir-ltr text-right">
                  {data.iccid || "...................................."}
                </span>
              </div>

              {/* Receipt Date */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold min-w-[75px]">تاريخ الاستلام:</span>
                <span className="border-b border-dotted border-black flex-1 px-1 font-mono font-bold dir-ltr text-right">
                  {receiptDate}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Declaration & Undertaking Text (التعهد) */}
          <div className="p-2.5 print:p-2 rounded-lg border border-black bg-gray-50/60 my-2 print:my-1">
            <p className="text-xs sm:text-sm print:text-[11px] font-semibold leading-relaxed text-black text-justify">
              وأتعهد بالمحافظة على الشريحة واستخدامها للأغراض الرسمية الخاصة بالعمل فقط، وعدم تسليمها لأي شخص آخر دون موافقة الشركة، وأتحمل المسؤولية الكاملة عن أي سوء استخدام أو فقدان أو إهمال، وألتزم بإعادتها عند طلب الشركة أو عند انتهاء العلاقة التعاقدية.
            </p>
          </div>
        </div>

        {/* Section 4: Signatures & Approvals (التوقيع والاعتماد) */}
        <div className="grid grid-cols-2 gap-4 pt-2 print:pt-1 border-t-2 border-black font-bold text-xs sm:text-sm print:text-[11px]">
          {/* Employee Signature Column */}
          <div className="space-y-1.5 print:space-y-1 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="whitespace-nowrap">اسم الموظف:</span>
              <span className="border-b border-dotted border-black flex-1 px-1 font-bold">
                {data.riderName || "...................................."}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="whitespace-nowrap">التوقيع:</span>
              <span className="border-b border-dotted border-black flex-1 font-normal text-gray-500">
                ....................................
              </span>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <span className="whitespace-nowrap">البصمة:</span>
              <div className="w-20 h-11 print:w-18 print:h-10 rounded border border-dashed border-black/50 flex items-center justify-center text-[10px] text-gray-400 font-normal">
                (البصمة هنا)
              </div>
            </div>
          </div>

          {/* Delivery Officer Signature Column */}
          <div className="space-y-1.5 print:space-y-1 pr-2 border-r border-black/30">
            <div className="font-extrabold text-black text-xs sm:text-sm border-b border-black/30 pb-0.5">
              مسؤول التسليم
            </div>

            <div className="flex items-center gap-1.5">
              <span className="whitespace-nowrap">الاسم:</span>
              <span className="border-b border-dotted border-black flex-1 px-1 font-bold">
                {data.responsibleEmployeeName || "مسؤول الموارد البشرية"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="whitespace-nowrap">التوقيع:</span>
              <span className="border-b border-dotted border-black flex-1 font-normal text-gray-500">
                ....................................
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-1 text-[11px]">
                <span className="whitespace-nowrap">التاريخ:</span>
                <span className="font-mono dir-ltr">{data.date || "____/____/________"}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] whitespace-nowrap">الختم:</span>
                <div className="w-18 h-10 rounded border border-dashed border-black/40 flex items-center justify-center text-[9px] text-gray-400 font-normal text-center">
                  ختم الشركة
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer if letterheadId is active */}
      {data.letterheadId && data.letterheadId !== "standard" && (
        <div className="relative z-10 pt-2 print:pt-1">
          <LetterheadFooter letterheadId={data.letterheadId} />
        </div>
      )}
    </div>
  );
}
