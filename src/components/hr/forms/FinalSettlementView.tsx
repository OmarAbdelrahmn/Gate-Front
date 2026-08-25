import React from "react";

export interface FinalSettlementData {
  employeeName: string;
  iqamaNo: string;
  nationality?: string;
  jobTitle?: string;
  companyName?: string;
  endDate?: string;
  date?: string;
}

export function FinalSettlementView({ data }: { data: FinalSettlementData }) {
  const iqamaDigits = (data.iqamaNo || "").padEnd(10, " ").slice(0, 10).split("");
  const company = data.companyName || "شركة اكسبرس جابت";
  const formattedEndDate = data.endDate || data.date || "2026/08/25";

  return (
    <div className="bg-white text-black p-6 md:p-8 rounded-xl border-2 border-black font-sans leading-relaxed text-right dir-rtl shadow-xs page-break-inside-avoid print-container text-xs md:text-sm">
      {/* Title */}
      <div className="text-center mb-4">
        <div className="border-2 border-black px-6 py-1.5 inline-block rounded-md bg-gray-50/50">
          <h2 className="text-xl md:text-2xl font-black text-black tracking-wide">
            نموذج / إقرار المخالصة النهائية
          </h2>
        </div>
      </div>

      {/* Main Container Box */}
      <div className="border-2 border-black rounded-lg p-4 md:p-5 space-y-3 bg-white">
        {/* Name & Nationality Row */}
        <div className="flex flex-wrap items-center justify-between font-bold text-xs md:text-sm border-b border-black pb-2.5">
          <div className="flex items-center gap-2">
            <span>أقر أنا الموقع أدناه:</span>
            <span className="font-extrabold text-sm md:text-base underline">{data.employeeName || "........................................................"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>الجنسية:</span>
            <span className="font-extrabold text-sm md:text-base underline">{data.nationality || "...................."}</span>
          </div>
        </div>

        {/* Iqama Digits Row */}
        <div className="flex items-center gap-3 border-b border-black pb-2.5 font-bold text-xs">
          <span>رقم الهوية:</span>
          <div className="flex items-center gap-1 dir-ltr">
            {iqamaDigits.map((digit, index) => (
              <span
                key={index}
                className="w-5 h-5 border border-black inline-flex items-center justify-center font-black text-xs bg-white"
              >
                {digit.trim()}
              </span>
            ))}
          </div>
        </div>

        {/* Arabic Legal Declaration */}
        <div className="space-y-1.5 text-xs font-semibold leading-relaxed text-justify pt-0.5">
          <p>
            والذي أعمل بوظيفة: <strong className="font-extrabold underline">{data.jobTitle || "مندوب توصيل"}</strong> أنني قد استلمت كافة حقوقي وكامل مستحقاتي من <strong className="font-extrabold underline">{company}</strong> وذلك حتى تاريخ{" "}
            <strong className="font-extrabold underline inline-block">{formattedEndDate}</strong> طبقاً لنظام العمل ولوائح الشركة وعقد العمل المحرر بيني وبين الشركة وذلك بمناسبة انتهاء رابطة العمل بيننا،
            وبموجب هذا الإقرار أصبح طرف الشركة خالصة وليس لي أية حقوق لديها وبهذا أكون قد أبرأت ذمة الشركة من أية حقوق براءة تامة ومطلقة.
          </p>
          <p>
            وبموجب هذا الإقرار ليس لي الحق نهائياً بالرجوع على الشركة بشيء والمطالبة بأية حقوق. وأقر بأنني قد وقعت هذا الإقرار وأنا بكامل الحالة المعتبرة شرعاً وأتعهد أنا المذكور أنا بنقل كفالتي من الشركة إلى شركة أخرى مدة أقصاها 30يوماً من تاريخ توقيع المخالصة.
          </p>
          <p className="font-extrabold text-center pt-0.5 text-xs">
            وهذا إقرار مخالصة مني بذلك.
          </p>
        </div>

        {/* English Legal Declaration */}
        <div className="border-t border-black pt-2.5 text-[10px] md:text-[11px] font-medium leading-tight text-left dir-ltr text-gray-800 space-y-1 font-mono">
          <p>
            And who works in a position :<strong>{data.jobTitle || "delivery representative"}</strong> that I have received all my rights and full dues from <strong>"{company}"</strong> Company until the date of <strong>{formattedEndDate}</strong> in accordance with the work system and the company's regulations and the work contract written between me and the company on the occasion of the end of the labor association between us ,and under this acknowledgment the company's party became pure and I have no rights to it ,and thus I have absolved the company of any full and absolute patent rights ,and under this acknowledgment I have no final right to refer to the company with anything and claim any rights .I acknowledge that I have signed this declaration in full condition considered Shariah ,and I undertake to transfer my guarantee from the company to another company for a maximum period of 30 days from the date of signing the clearance .This is an acknowledgment of my clearance of that.
          </p>
        </div>

        {/* Section: المقر بما فيه */}
        <div className="border-2 border-black rounded-md overflow-hidden mt-3">
          <div className="bg-gray-100 p-1 text-center font-extrabold text-xs border-b border-black">
            المقر بما فيه
          </div>
          <table className="w-full text-xs font-bold border-collapse">
            <tbody>
              <tr className="border-b border-black">
                <td className="p-1.5 border-l border-black bg-gray-50 w-1/4">الإسم:</td>
                <td className="p-1.5 font-extrabold text-xs md:text-sm">{data.employeeName || "........................................................"}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1.5 border-l border-black bg-gray-50">التوقيع:</td>
                <td className="p-1.5 text-gray-400 font-normal">........................................................</td>
              </tr>
              <tr>
                <td className="p-1.5 border-l border-black bg-gray-50">التاريخ:</td>
                <td className="p-1.5 font-extrabold">{data.date || " / / 2026م"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section: الموارد البشرية | المالية */}
        <div className="border-2 border-black rounded-md overflow-hidden mt-2">
          <div className="grid grid-cols-2 bg-gray-100 text-center font-extrabold text-xs border-b border-black">
            <div className="p-1 border-l border-black">الموارد البشرية</div>
            <div className="p-1">المالية</div>
          </div>
          <table className="w-full text-xs font-bold border-collapse">
            <tbody>
              <tr className="border-b border-black">
                <td className="p-1.5 border-l border-black bg-gray-50 w-1/6">الإسم:</td>
                <td className="p-1.5 border-l border-black w-1/3"></td>
                <td className="p-1.5 border-l border-black bg-gray-50 w-1/6">الإسم:</td>
                <td className="p-1.5"></td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1.5 border-l border-black bg-gray-50">التوقيع:</td>
                <td className="p-1.5 border-l border-black"></td>
                <td className="p-1.5 border-l border-black bg-gray-50">التوقيع:</td>
                <td className="p-1.5"></td>
              </tr>
              <tr>
                <td className="p-1.5 border-l border-black bg-gray-50">التاريخ:</td>
                <td className="p-1.5 border-l border-black"></td>
                <td className="p-1.5 border-l border-black bg-gray-50">التاريخ:</td>
                <td className="p-1.5"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
