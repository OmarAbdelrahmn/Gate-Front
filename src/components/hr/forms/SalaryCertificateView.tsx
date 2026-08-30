import React from "react";
import { LetterheadHeader, LetterheadFooter, LetterheadWatermark, type LetterheadId } from "./LetterheadHeader";

export interface SalaryCertificateData {
  employeeName: string;
  iqamaNo: string;
  jobTitle?: string;
  salaryAmount: number | string;
  salaryInWords?: string;
  companyName?: string;
  date?: string;
  allowancesDetail?: string;
  letterheadId?: LetterheadId;
}

export function SalaryCertificateView({ data }: { data: SalaryCertificateData }) {
  const formattedSalary = data.salaryAmount
    ? Number(data.salaryAmount).toLocaleString("en-US", { minimumFractionDigits: 0 })
    : "0";

  return (
    <div className="relative bg-white text-black p-6 md:p-10 rounded-xl border-2 border-black font-sans leading-relaxed text-right dir-rtl shadow-xs page-break-inside-avoid print-container min-h-[960px] flex flex-col justify-between overflow-hidden">
      {/* Background Watermark Image */}
      <LetterheadWatermark letterheadId={data.letterheadId} />

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <LetterheadHeader
          letterheadId={data.letterheadId}
          companyName={data.companyName}
          date={data.date}
          refNo={data.iqamaNo ? data.iqamaNo.slice(-4) : undefined}
        />

        {/* Title */}
        <div className="text-center my-6">
          <h2 className="text-2xl md:text-3xl font-black underline tracking-widest inline-block border-b-2 border-black pb-1">
            تعـريـف راتــب
          </h2>
        </div>

        {/* Main Body Text */}
        <div className="space-y-5 text-sm md:text-base leading-relaxed px-2 md:px-6 my-6 font-medium">
          <p className="text-base font-bold">
            تشهد / <strong className="font-extrabold text-lg">{data.companyName || "شركة اكسبرس جابت"}</strong> بأن الموظف:
          </p>

          <div className="border-2 border-black rounded-xl p-4 bg-gray-50/50 space-y-2.5 font-bold text-sm my-4">
            <div className="flex items-center gap-2">
              <span className="min-w-[140px] text-gray-700">اسم الموظف:</span>
              <span className="text-black font-black text-base underline">{data.employeeName || "........................................................"}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="min-w-[140px] text-gray-700">رقم الهوية/الإقامة :</span>
              <span className="text-black font-black text-base underline">{data.iqamaNo || "........................................................"}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="min-w-[140px] text-gray-700">المسمى الوظيفي:</span>
              <span className="text-black font-black text-base underline">{data.jobTitle || "سائق مندوب توصيل"}</span>
            </div>
          </div>

          <p className="text-base leading-relaxed">
            يعمل لدينا حتى تاريخه وهو على رأس العمل، ويتقاضى راتباً شهرياً قدره:{" "}
            <strong className="text-lg underline font-black dir-ltr inline-block">({formattedSalary})</strong>{" "}
            ريال سعودي
          </p>

          <div className="text-sm md:text-base font-bold bg-gray-100/90 p-3 rounded-lg border border-black/30">
            (كتابةً: <span className="underline font-black text-black">{data.salaryInWords || "خمسة عشر ألف ريال سعودي لا غير"}</span> {data.allowancesDetail || "شامل جميع البدلات"})
          </div>

          <p className="pt-2 text-xs md:text-sm font-semibold text-gray-800">
            وقد أُعطي هذا التعريف بناءً على طلبه دون أدنى مسؤولية على الشركة.
          </p>

          <div className="text-center pt-4 font-extrabold text-base md:text-lg">
            وتفضلوا بقبول فائق الاحترام.
          </div>
        </div>

        {/* Signatures & Stamp */}
        <div className="border-2 border-black rounded-xl p-4 bg-gray-50/50 mt-8 pb-10">
          <div className="grid grid-cols-2 text-center gap-4 font-bold text-xs md:text-sm">
            <div className="space-y-4">
              <p className="font-extrabold text-sm">إدارة الموارد البشرية</p>
              <div className="pt-6 text-gray-400 font-normal">التوقيع: .................................</div>
            </div>
            <div className="space-y-4">
              <p className="font-extrabold text-sm">ختم الشركة / المصادقة</p>
              <div className="pt-6 text-gray-400 font-normal">الختم الرسمي</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10">
        <LetterheadFooter letterheadId={data.letterheadId} />
      </div>
    </div>
  );
}
