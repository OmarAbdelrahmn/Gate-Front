import React from "react";
import { LetterheadHeader, LetterheadFooter, LetterheadWatermark, type LetterheadId } from "./LetterheadHeader";

export interface CashDisbursementData {
  riderName: string;
  iqamaNo: string;
  amount: number | string;
  amountInWords: string;
  reason: string;
  date: string;
  showDoubleVoucher?: boolean;
  companyName?: string;
  letterheadId?: LetterheadId;
}

export function CashDisbursementView({ data }: { data: CashDisbursementData }) {
  const formattedAmount = data.amount
    ? Number(data.amount).toLocaleString("en-US", { minimumFractionDigits: 0 })
    : "0";

  const isDouble = data.showDoubleVoucher !== false;

  const renderSingleVoucher = (footerTitle3: string) => (
    <div className={`relative overflow-hidden bg-white text-black rounded-xl border-2 border-black font-sans leading-snug text-right dir-rtl shadow-xs page-break-inside-avoid ${isDouble ? 'p-3.5 sm:p-4 print:p-3' : 'p-6'}`}>
      {/* Background Watermark Image */}
      <LetterheadWatermark letterheadId={data.letterheadId} />

      <div className="relative z-10 space-y-2">
        {/* Header */}
        <LetterheadHeader
          letterheadId={data.letterheadId}
          companyName={data.companyName}
          date={data.date}
          refNo={data.iqamaNo ? data.iqamaNo.slice(-4) : undefined}
        />

        {/* Main Title */}
        <div className={`text-center ${isDouble ? 'my-1.5' : 'my-3'}`}>
          <h2 className={`font-black underline tracking-widest inline-block border-b-2 border-black ${isDouble ? 'text-xl pb-0.5' : 'text-2xl pb-1'}`}>
            طــــلـب صــرف نـقــدى
          </h2>
        </div>

        {/* Date Line */}
        <div className={`flex justify-end font-bold text-sm ${isDouble ? 'mb-2' : 'mb-4'}`}>
          <span>تاريخ : {data.date || "...... / ...... / 2026"}</span>
        </div>

        {/* Main Container Box */}
        <div className={`border-2 border-black rounded-xl text-sm font-semibold bg-gray-50/50 ${isDouble ? 'p-3 mb-2.5 space-y-2' : 'p-5 mb-4 space-y-4 text-md'}`}>
          <div className="flex items-center gap-2">
            <span className="font-bold whitespace-nowrap min-w-[80px]">الاسم :-</span>
            <span className="border-b border-dotted border-black flex-1 px-2 py-0.5 text-sm font-bold min-h-[24px]">
              {data.riderName || "...................................................................."}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold whitespace-nowrap min-w-[80px]">مبلغاً وقدره :-</span>
            <span className="font-bold dir-ltr dir-rtl">(&nbsp;{formattedAmount}&nbsp;)</span>
            <span className="border-b border-dotted border-black flex-1 px-2 py-0.5 text-sm font-bold min-h-[24px]">
              {data.amountInWords || "...................................................................."}
            </span>
            <span className="font-bold whitespace-nowrap">ريال لاغير</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold whitespace-nowrap min-w-[80px]">وذلك قيمة :-</span>
            <span className="border-b border-dotted border-black flex-1 px-2 py-0.5 text-sm font-bold min-h-[24px]">
              {data.reason || "...................................................................."}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 text-xs md:text-sm">
            <div className="flex items-center gap-1">
              <span className="font-bold whitespace-nowrap">الاسم :-</span>
              <span className="border-b border-dotted border-black flex-1 text-center font-bold">
                {data.riderName || ".................."}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold whitespace-nowrap">التوقيع :-</span>
              <span className="border-b border-dotted border-black flex-1 text-center font-bold">
                ..................
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold whitespace-nowrap">رقم الهوية :-</span>
              <span className="border-b border-dotted border-black flex-1 text-center font-bold">
                {data.iqamaNo || ".................."}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Signatures Box */}
        <div className={`border-2 border-black rounded-xl bg-gray-50/50 ${isDouble ? 'p-3 pb-8 min-h-[70px]' : 'p-4 pb-12 min-h-[95px]'}`}>
          <div className="grid grid-cols-3 w-full text-center font-bold text-xs md:text-sm">
            <div>مدير الموارد البشرية</div>
            <div>المدير المالي</div>
            <div>{footerTitle3}</div>
          </div>
        </div>

        {!isDouble && <LetterheadFooter letterheadId={data.letterheadId} />}
      </div>
    </div>
  );

  return (
    <div className={`print-container text-black ${isDouble ? 'space-y-3 print:space-y-2' : 'space-y-6'}`}>
      {/* Top Copy */}
      {renderSingleVoucher("الإدارة")}

      {/* Double Voucher layout if enabled */}
      {isDouble && (
        <>
          <div className="border-b-2 border-dashed border-black my-2 print:my-1.5 relative flex justify-center items-center">
            <span className="bg-white px-3 text-[11px] font-bold text-gray-500 print:hidden">
              قطع / النسخة الثانية
            </span>
          </div>

          {/* Bottom Copy */}
          {renderSingleVoucher("المدير العام")}
        </>
      )}
    </div>
  );
}
