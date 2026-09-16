import React from "react";
import {
  LetterheadHeader,
  LetterheadFooter,
  LetterheadWatermark,
  LETTERHEAD_TEMPLATES,
  type LetterheadId,
} from "./LetterheadHeader";

export interface FinalSettlementData {
  employeeName?: string;
  iqamaNo?: string;
  nationality?: string;
  jobTitle?: string;
  jobTitleEn?: string;
  companyName?: string;
  companyNameEn?: string;
  endDate?: string;
  date?: string;
  letterheadId?: LetterheadId;
}

export function FinalSettlementView({ data }: { data: FinalSettlementData }) {
  const currentLetterhead = LETTERHEAD_TEMPLATES.find((t) => t.id === data.letterheadId);
  const companyName = data.companyName || currentLetterhead?.companyName || "شركة اكسبرس جايت";
  const companyNameEn = data.companyNameEn || currentLetterhead?.titleEn || "Express Gate Company";
  const isStandard = !data.letterheadId || data.letterheadId === "standard";

  const iqamaDigits = (data.iqamaNo || "").replace(/\D/g, "").padEnd(10, " ").slice(0, 10).split("");
  const formattedEndDate = data.endDate || "   /   /   ";
  const formattedEndDateEn = data.endDate || "   /   /   ";

  return (
    <div className="relative overflow-hidden bg-white text-black p-4 md:p-8 font-sans leading-relaxed text-right dir-rtl shadow-sm page-break-inside-avoid print-container min-h-[960px] flex flex-col justify-between">
      {/* Background Watermark Image from Letterhead */}
      <LetterheadWatermark letterheadId={data.letterheadId} />

      <div className="relative z-10 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* If an official letterhead is selected (not standard), show the corporate header */}
          {!isStandard && (
            <div className="mb-3">
              <LetterheadHeader
                letterheadId={data.letterheadId}
                companyName={companyName}
                date={data.date}
                refNo={data.iqamaNo ? data.iqamaNo.slice(-4) : undefined}
              />
            </div>
          )}

          {/* Top Title Box */}
          <div className="text-center mb-3">
            <div className="border border-black px-6 py-1.5 inline-block bg-gray-50/70">
              <h2 className="text-lg md:text-xl font-black text-black tracking-wide">
                نموذج / إقرار المخالصة النهائية
              </h2>
            </div>
          </div>

          {/* Main Inner Container with classic double border */}
          <div className="border-4 border-double border-black p-4 md:p-6 space-y-4 bg-white/80 backdrop-blur-[0.5px]">
            {/* Name & Nationality Row */}
            <div className="font-bold text-xs md:text-sm text-right leading-loose">
              <span>أقر أنا الموقع أدناه: </span>
              <span className="font-black underline px-2">
                {data.employeeName || "_________________________________"}
              </span>
              <span> / الجنسية: </span>
              <span className="font-black underline px-2">
                {data.nationality || "_____________________"}
              </span>
            </div>

            {/* Iqama Digits Row */}
            <div className="flex items-center gap-3 font-bold text-xs md:text-sm">
              <span>رقم الهوية :</span>
              <div dir="ltr" className="inline-flex border border-black bg-white">
                {iqamaDigits.map((digit, index) => (
                  <span
                    key={index}
                    className="w-6 h-6 md:w-7 md:h-7 border-r border-black last:border-r-0 inline-flex items-center justify-center font-black text-xs md:text-sm text-black"
                  >
                    {digit.trim()}
                  </span>
                ))}
              </div>
            </div>

            {/* Arabic Legal Declaration */}
            <div className="space-y-2 text-xs md:text-sm font-medium leading-relaxed text-justify">
              <p>
                والذي أعمل بوظيفة: <span className="font-bold">{data.jobTitle || "مندوب توصيل"}</span> أنني قد استلمت كافة حقوقي وكامل مستحقاتي من {companyName} وذلك حتى تاريخ{" "}
                <span className="font-bold">{formattedEndDate}</span> طبقاً لنظام العمل ولوائح الشركة وعقد العمل المحرر بيني وبين الشركة وذلك بمناسبة انتهاء رابطة العمل بيننا،
                وبموجب هذا الإقرار أصبح طرف الشركة خالصاً وليس لي أية حقوق لديها، وبهذا أكون قد أبرأت ذمة الشركة من أية حقوق براءة تامة ومطلقة،
                وبموجب هذا الإقرار ليس لي الحق نهائياً بالرجوع على الشركة بشيء والمطالبة بأية حقوق. وأقر بأنني قد وقعت هذا الإقرار وأنا بكامل الحالة المعتبرة شرعاً،
                واتعهد انا المذكور انا بنقل كفالتي من الشركة الى شركة أخرى مدة أقصاها 30يوم من تاريخ توقيع المخالصة.
              </p>
              <p className="font-bold text-right">
                وهذا إقرار مخالصة مني بذلك.
              </p>
            </div>

            {/* English Legal Declaration */}
            <div dir="ltr" className="text-left text-[11px] md:text-xs font-normal leading-relaxed text-justify pt-1">
              <p>
                And who works in a position :<span className="font-semibold">{data.jobTitleEn || "delivery representative"}</span> that I have received all my rights and full dues from <strong className="font-black">{companyNameEn}</strong> until the date of <span className="font-semibold">{formattedEndDateEn}</span> in accordance with the work system and the company's regulations and the work contract written between me and the company on the occasion of the end of the labor association between us ,and under this acknowledgment the company's party became pure and I have no rights to it ,and thus I have absolved the company of any full and absolute patent rights ,and under this acknowledgment I have no final right to refer to the company with anything and claim any rights .I acknowledge that I have signed this declaration in full condition considered Shariah ,and I undertake to transfer my guarantee from the company to another company for a maximum period of 30 days from the date of signing the clearance .This is an acknowledgment of my clearance of that.
              </p>
            </div>

            {/* Table 1: المقر بما فيه */}
            <div className="border border-black overflow-hidden mt-3 bg-white">
              <div className="bg-gray-100/90 py-1 text-center font-black text-xs md:text-sm border-b border-black">
                المقر بما فيه
              </div>
              <table className="w-full text-xs md:text-sm font-bold border-collapse">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="p-2 border-l border-black bg-gray-50/70 w-28 md:w-36 text-right">
                      الإسم:
                    </td>
                    <td className="p-2 font-black">
                      {data.employeeName || ""}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-2 border-l border-black bg-gray-50/70 text-right">
                      التوقيع:
                    </td>
                    <td className="p-2 h-9 md:h-10">
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 border-l border-black bg-gray-50/70 text-right">
                      التاريخ:
                    </td>
                    <td className="p-2 font-bold">
                      {data.date || ""}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table 2: المالية | الموارد البشرية */}
            <div className="border border-black overflow-hidden mt-2 bg-white">
              <table className="w-full text-xs md:text-sm font-bold border-collapse">
                <thead>
                  <tr className="border-b border-black bg-gray-100/90 text-center font-black">
                    <th className="p-1.5 border-l border-black w-28 md:w-36 bg-gray-50/50"></th>
                    <th className="p-1.5 border-l border-black w-[calc((100%-7rem)/2)] md:w-[calc((100%-9rem)/2)]">
                      الموارد البشرية
                    </th>
                    <th className="p-1.5 w-[calc((100%-7rem)/2)] md:w-[calc((100%-9rem)/2)]">
                      المالية
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-black">
                    <td className="p-2 border-l border-black bg-gray-50/70 text-right">
                      الإسم:
                    </td>
                    <td className="p-2 border-l border-black font-semibold">
                    </td>
                    <td className="p-2 font-semibold">
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-2 border-l border-black bg-gray-50/70 text-right">
                      التوقيع:
                    </td>
                    <td className="p-2 border-l border-black h-9 md:h-10">
                    </td>
                    <td className="p-2 h-9 md:h-10">
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 border-l border-black bg-gray-50/70 text-right">
                      التاريخ:
                    </td>
                    <td className="p-2 border-l border-black font-semibold">
                    </td>
                    <td className="p-2 font-semibold">
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* If official letterhead selected, show footer */}
        {!isStandard && (
          <div className="pt-2">
            <LetterheadFooter letterheadId={data.letterheadId} />
          </div>
        )}
      </div>
    </div>
  );
}
