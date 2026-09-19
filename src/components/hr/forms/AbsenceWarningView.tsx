import React from "react";

export interface AbsenceWarningData {
  language: "ar" | "en" | "both";
  companyName?: string;
  date?: string;
  warningNumber?: string;
  warningDegree?: "first" | "second" | "final";
  employeeName?: string;
  iqamaNo?: string;
  startDate?: string;
  startDay?: string;
  endDate?: string;
  executiveDirector?: string;
  notes?: string;
}

const DAY_MAP: Record<string, { ar: string; en: string }> = {
  السبت: { ar: "السبت", en: "Saturday" },
  الأحد: { ar: "الأحد", en: "Sunday" },
  الاثنين: { ar: "الاثنين", en: "Monday" },
  الثلاثاء: { ar: "الثلاثاء", en: "Tuesday" },
  الأربعاء: { ar: "الأربعاء", en: "Wednesday" },
  الخميس: { ar: "الخميس", en: "Thursday" },
  الجمعة: { ar: "الجمعة", en: "Friday" },
  Saturday: { ar: "السبت", en: "Saturday" },
  Sunday: { ar: "الأحد", en: "Sunday" },
  Monday: { ar: "الاثنين", en: "Monday" },
  Tuesday: { ar: "الثلاثاء", en: "Tuesday" },
  Wednesday: { ar: "الأربعاء", en: "Wednesday" },
  Thursday: { ar: "الخميس", en: "Thursday" },
  Friday: { ar: "الجمعة", en: "Friday" },
};

const WARNING_DEGREE_MAP: Record<
  "first" | "second" | "final",
  { ar: string; en: string }
> = {
  first: { ar: "الإنذار الأول", en: "First Warning" },
  second: { ar: "الإنذار الثاني", en: "Second Warning" },
  final: { ar: "الإنذار النهائي", en: "Final Warning" },
};

export function AbsenceWarningView({ data }: { data: AbsenceWarningData }) {
  const {
    language = "both",
    companyName = "شركة اكسبرس جايت",
    date,
    warningNumber = "1",
    warningDegree = "first",
    employeeName,
    iqamaNo,
    startDate,
    startDay = "السبت",
    endDate,
    executiveDirector = "المدير التنفيذي",
  } = data;

  const formattedDate = date || "..... / ..... / 2026";
  const formattedStartDate = startDate || "..... / ..... / 2026";
  const formattedEndDate = endDate || "..... / ..... / 2026";

  const resolvedDay = DAY_MAP[startDay] || { ar: startDay, en: startDay };
  const resolvedDegree = WARNING_DEGREE_MAP[warningDegree] || WARNING_DEGREE_MAP.first;

  // Render Arabic Version Block
  const renderArabicContent = (isCompact = false) => (
    <div className={`space-y-5 text-right font-sans text-black ${isCompact ? "text-sm" : "text-base"}`} dir="rtl">
      {/* Title */}
      <div className="text-center pt-1 pb-3">
        <h1 className={`font-black tracking-wide text-black ${isCompact ? "text-xl" : "text-2xl md:text-3xl"}`}>
          إنذار بالانقطاع عن العمل
        </h1>
      </div>

      {/* Header Info */}
      <div className="space-y-1.5 font-bold text-gray-900 pr-1">
        <div className="flex items-center gap-2">
          <span className="font-black">التاريخ:</span>
          <span className="font-extrabold underline px-1">{formattedDate} م</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-black">الإنذار رقم</span>
          <span className="font-extrabold underline px-1">( {warningNumber || "1"} )</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-b-2 border-black my-3" />

      {/* Recipient */}
      <div className="space-y-2 font-bold text-gray-900 pr-1">
        <div className="flex items-start gap-2">
          <span className="font-black whitespace-nowrap">إلى الموظف /</span>
          <span className="font-extrabold underline px-1">
            {employeeName || "...................................................................."}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="font-black whitespace-nowrap">رقم الهوية/الإقامة /</span>
          <span className="font-extrabold underline px-1">
            {iqamaNo || "...................................................................."}
          </span>
        </div>
      </div>

      {/* Salutation */}
      <div className="font-extrabold text-black pt-2">
        السلام عليكم ورحمة الله وبركاته، أما بعد:
      </div>

      {/* Paragraph 1 */}
      <p className="leading-relaxed font-semibold text-gray-900 text-justify">
        إشارة إلى عقد العمل المبرم بينكم وبين الشركة، نفيدكم بأنه قد لوحظ تغيبكم وانقطاعكم عن العمل دون إشعار مسبق أو عذر مشروع اعتبارًا من تاريخ يوم{" "}
        <span className="font-black underline px-1">{resolvedDay.ar}</span> الموافق{" "}
        <span className="font-black underline px-1">{formattedStartDate} م</span> وحتى تاريخ{" "}
        <span className="font-black underline px-1">{formattedEndDate} م</span>.
      </p>

      {/* Paragraph 2 */}
      <p className="leading-relaxed font-semibold text-gray-900 text-justify">
        ويُعد هذا الانقطاع مخالفة صريحة لما تقضي به أحكام المادة (80) الفقرة (2) والفقرة (7) من نظام العمل السعودي، ولائحة تنظيم العمل المعتمدة لدى الشركة. وقد تم تحرير هذا{" "}
        <span className="font-black underline px-1">{resolvedDegree.ar}</span> لتصحيح الوضع ومباشرة العمل فورًا.
      </p>

      {/* Closing */}
      <div className="pt-2 font-bold text-black">
        وتفضلوا بقبول فائق الاحترام والتقدير،،،
      </div>

      {/* Divider */}
      <div className="border-b-2 border-black my-4" />

      {/* Footer / Signatures */}
      <div className="space-y-3 font-bold text-gray-900 pt-2 pr-1">
        <div className="flex items-center gap-2">
          <span className="font-black whitespace-nowrap">اسم الشركة /</span>
          <span className="font-extrabold underline px-1">{companyName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-black whitespace-nowrap">المدير التنفيذي /</span>
          <span className="font-extrabold underline px-1">{executiveDirector}</span>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="font-black whitespace-nowrap">التوقيع /</span>
          <span className="font-medium">....................................................................</span>
        </div>
        <div className="flex items-center gap-2 pt-4">
          <span className="font-black whitespace-nowrap">الختم /</span>
          <span className="font-medium">....................................................................</span>
        </div>
      </div>
    </div>
  );

  // Render English Version Block
  const renderEnglishContent = (isCompact = false) => (
    <div className={`space-y-5 text-left font-sans text-black ${isCompact ? "text-sm" : "text-base"}`} dir="ltr">
      {/* Title */}
      <div className="text-center pt-1 pb-3">
        <h1 className={`font-black tracking-wide text-black ${isCompact ? "text-xl" : "text-2xl md:text-3xl"}`}>
          Notice of Absence from Work
        </h1>
      </div>

      {/* Header Info */}
      <div className="space-y-1.5 font-bold text-gray-900 pl-1">
        <div className="flex items-center gap-2">
          <span className="font-black">DATE:</span>
          <span className="font-extrabold underline px-1">{formattedDate} G</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-black">Notice No.</span>
          <span className="font-extrabold underline px-1">( {warningNumber || "1"} )</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-b-2 border-black my-3" />

      {/* Recipient */}
      <div className="space-y-2 font-bold text-gray-900 pl-1">
        <div className="flex items-start gap-2">
          <span className="font-black whitespace-nowrap">Employee Name :</span>
          <span className="font-extrabold underline px-1">
            {employeeName || "...................................................................."}
          </span>
        </div>
        {iqamaNo && (
          <div className="flex items-start gap-2">
            <span className="font-black whitespace-nowrap">Iqama / ID No. :</span>
            <span className="font-extrabold underline px-1">{iqamaNo}</span>
          </div>
        )}
      </div>

      {/* Salutation */}
      <div className="font-extrabold text-black pt-2">
        Dear Employee
      </div>

      {/* Paragraph 1 */}
      <p className="leading-relaxed font-semibold text-gray-900 text-justify">
        With reference to the employment contract concluded between you and the company, we inform you that it has been observed that you were absent from work without prior notice or a legitimate excuse starting from{" "}
        <span className="font-black underline px-1">{resolvedDay.en}</span>,{" "}
        <span className="font-black underline px-1">{formattedStartDate} G</span>, until{" "}
        <span className="font-black underline px-1">{formattedEndDate} G</span>.
      </p>

      {/* Paragraph 2 */}
      <p className="leading-relaxed font-semibold text-gray-900 text-justify">
        This constitutes a clear violation of Article 80, Paragraph (2) and Paragraph (7) of the Saudi Labor Law, as well as the company&apos;s approved work organization regulations. Accordingly, this{" "}
        <span className="font-black underline px-1">{resolvedDegree.en}</span> has been issued for you to resume work immediately.
      </p>

      {/* Closing */}
      <div className="pt-2 font-bold text-black">
        Please accept our highest regards and respect.
      </div>

      {/* Divider */}
      <div className="border-b-2 border-black my-4" />

      {/* Footer / Signatures */}
      <div className="space-y-3 font-bold text-gray-900 pt-2 pl-1">
        <div className="flex items-center gap-2">
          <span className="font-black whitespace-nowrap">Company Name................................................... :</span>
          <span className="font-extrabold underline px-1">{companyName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-black whitespace-nowrap">Executive Director............................................... :</span>
          <span className="font-extrabold underline px-1">{executiveDirector}</span>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="font-black whitespace-nowrap">Signature........................................................... :</span>
          <span className="font-medium">....................................................................</span>
        </div>
        <div className="flex items-center gap-2 pt-4">
          <span className="font-black whitespace-nowrap">Stamp................................................................. :</span>
          <span className="font-medium">....................................................................</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white text-black p-6 md:p-10 rounded-xl border-2 border-black font-sans leading-relaxed shadow-xs page-break-inside-avoid print-container min-h-[750px] flex flex-col justify-between">
      {/* 1. Arabic Only */}
      {language === "ar" && renderArabicContent(false)}

      {/* 2. English Only */}
      {language === "en" && renderEnglishContent(false)}

      {/* 3. Both Languages (Bilingual Side-by-Side) */}
      {language === "both" && (
        <div className="space-y-6">
          {/* Dual Main Header */}
          <div className="text-center border-b-2 border-black pb-4">
            <h1 className="text-2xl md:text-3xl font-black text-black tracking-wide">
              إنذار بالانقطاع عن العمل
            </h1>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 tracking-wide mt-1">
              Notice of Absence from Work
            </h2>
            <p className="text-xs font-semibold text-gray-600 mt-1">
              (وفق المادة 80 من نظام العمل السعودي / Under Article 80 of Saudi Labor Law)
            </p>
          </div>

          {/* Two Columns: Arabic on Right (RTL), English on Left (LTR) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 print:gap-6">
            {/* Right Column: Arabic */}
            <div className="border-b md:border-b-0 md:border-l-2 border-black pb-6 md:pb-0 md:pl-6 print:border-b-0 print:border-l-2 print:pl-6">
              {renderArabicContent(true)}
            </div>

            {/* Left Column: English */}
            <div className="pt-2 md:pt-0">
              {renderEnglishContent(true)}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Legal Notice / Ref */}
      <div className="mt-8 pt-3 border-t border-gray-300 text-center text-xs font-bold text-gray-500 print:text-[10px]">
        {language === "en"
          ? "Official Labor Notice - Article (80) Saudi Labor Law"
          : language === "ar"
          ? "إشعار إنذار نظامي رسمي - المادة (80) نظام العمل السعودي"
          : "إشعار إنذار نظامي رسمي ثنائي اللغة - المادة (80) نظام العمل السعودي | Official Bilingual Labor Notice - Article 80"}
      </div>
    </div>
  );
}
