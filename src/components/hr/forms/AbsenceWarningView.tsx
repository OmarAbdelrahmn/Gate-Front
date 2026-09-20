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

const COMPANY_EN_MAP: Record<string, string> = {
  "شركة اكسبرس جايت": "Express Gate Company",
  "شركة اكسبرس جابت": "Express Gate Company",
  "شركة ألبوابا الموكبلا": "Albawaba Almogbla Company",
  "شركة البوابة المقبلة": "Albawaba Almogbla Company",
  "مؤسسة البوابة المقبلة للتجارة": "Albawaba Almuqblah Commercial",
};

const EXECUTIVE_DIRECTOR_EN_MAP: Record<string, string> = {
  "المدير التنفيذي": "Executive Director",
  "المدير العام": "General Manager",
  "مسؤول الموارد البشرية": "HR Manager",
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

  const companyNameEn =
    COMPANY_EN_MAP[companyName] ||
    (companyName.includes("اكسبرس")
      ? "Express Gate Company"
      : companyName.includes("البوابة") || companyName.includes("ألبوابا")
      ? "Albawaba Almogbla Company"
      : companyName);

  const executiveDirectorEn =
    EXECUTIVE_DIRECTOR_EN_MAP[executiveDirector] ||
    (executiveDirector === "المدير التنفيذي" ? "Executive Director" : executiveDirector);

  // Render Arabic Version Block
  const renderArabicContent = (isCompact = false) => (
    <div className={`space-y-3.5 text-right font-sans text-black ${isCompact ? "text-xs md:text-sm" : "text-sm md:text-base"}`} dir="rtl">
      {/* Title only when NOT compact (in single language mode) */}
      {!isCompact && (
        <div className="text-center pt-1 pb-3 border-b-2 border-black">
          <h1 className="text-2xl md:text-3xl font-black text-black tracking-wide">
            إنذار بالانقطاع عن العمل
          </h1>
          <p className="text-xs font-semibold text-gray-600 mt-1">
            (وفق المادة 80 من نظام العمل السعودي)
          </p>
        </div>
      )}

      {/* Header Info: Date & Warning Number */}
      <div className="flex justify-between items-center text-xs md:text-sm font-bold text-gray-900 border-b border-gray-300 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="font-black">التاريخ:</span>
          <span className="font-extrabold underline">{formattedDate} م</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-black">الإنذار رقم:</span>
          <span className="font-extrabold underline px-1">({warningNumber || "1"})</span>
        </div>
      </div>

      {/* Recipient */}
      <div className="space-y-2 font-bold text-xs md:text-sm text-gray-900 pt-0.5">
        <div className="flex items-baseline gap-2">
          <span className="font-black whitespace-nowrap min-w-[70px]">إلى الموظف /</span>
          <span className="border-b border-black border-dotted flex-1 min-w-0 font-extrabold px-1 truncate">
            {employeeName || ""}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-black whitespace-nowrap min-w-[110px]">رقم الهوية / الإقامة /</span>
          <span className="border-b border-black border-dotted flex-1 min-w-0 font-extrabold px-1 font-mono">
            {iqamaNo || ""}
          </span>
        </div>
      </div>

      {/* Salutation */}
      <div className="font-extrabold text-black pt-1">
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
      <div className="pt-1 font-bold text-black">
        وتفضلوا بقبول فائق الاحترام والتقدير،،،
      </div>

      {/* Divider */}
      <div className="border-b border-gray-400 my-2" />

      {/* Footer / Signatures */}
      <div className="space-y-2 font-bold text-gray-900 text-xs md:text-sm">
        <div className="flex items-baseline gap-2">
          <span className="font-black whitespace-nowrap min-w-[85px]">اسم الشركة /</span>
          <span className="border-b border-black flex-1 min-w-0 font-extrabold px-1 truncate">
            {companyName}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-black whitespace-nowrap min-w-[85px]">المدير التنفيذي /</span>
          <span className="border-b border-black flex-1 min-w-0 font-extrabold px-1 truncate">
            {executiveDirector}
          </span>
        </div>
        <div className="flex items-baseline gap-2 pt-1">
          <span className="font-black whitespace-nowrap min-w-[85px]">التوقيع /</span>
          <span className="border-b border-black border-dotted flex-1 min-h-[16px]"></span>
        </div>
        <div className="flex items-baseline gap-2 pt-2">
          <span className="font-black whitespace-nowrap min-w-[85px]">الختم /</span>
          <span className="border-b border-black border-dotted flex-1 min-h-[16px]"></span>
        </div>
      </div>
    </div>
  );

  // Render English Version Block
  const renderEnglishContent = (isCompact = false) => (
    <div className={`space-y-3.5 text-left font-sans text-black ${isCompact ? "text-xs md:text-sm" : "text-sm md:text-base"}`} dir="ltr">
      {/* Title only when NOT compact (in single language mode) */}
      {!isCompact && (
        <div className="text-center pt-1 pb-3 border-b-2 border-black">
          <h1 className="text-2xl md:text-3xl font-black text-black tracking-wide">
            Notice of Absence from Work
          </h1>
          <p className="text-xs font-semibold text-gray-600 mt-1">
            (Under Article 80 of Saudi Labor Law)
          </p>
        </div>
      )}

      {/* Header Info: Date & Notice Number */}
      <div className="flex justify-between items-center text-xs md:text-sm font-bold text-gray-900 border-b border-gray-300 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="font-black">DATE:</span>
          <span className="font-extrabold underline">{formattedDate} G</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-black">Notice No.:</span>
          <span className="font-extrabold underline px-1">({warningNumber || "1"})</span>
        </div>
      </div>

      {/* Recipient */}
      <div className="space-y-2 font-bold text-xs md:text-sm text-gray-900 pt-0.5">
        <div className="flex items-baseline gap-2">
          <span className="font-black whitespace-nowrap min-w-[110px]">Employee Name:</span>
          <span className="border-b border-black border-dotted flex-1 min-w-0 font-extrabold px-1 truncate">
            {employeeName || ""}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-black whitespace-nowrap min-w-[110px]">Iqama / ID No.:</span>
          <span className="border-b border-black border-dotted flex-1 min-w-0 font-extrabold px-1 font-mono">
            {iqamaNo || ""}
          </span>
        </div>
      </div>

      {/* Salutation */}
      <div className="font-extrabold text-black pt-1">
        Dear Employee,
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
      <div className="pt-1 font-bold text-black">
        Please accept our highest regards and respect.
      </div>

      {/* Divider */}
      <div className="border-b border-gray-400 my-2" />

      {/* Footer / Signatures */}
      <div className="space-y-2 font-bold text-gray-900 text-xs md:text-sm">
        <div className="flex items-baseline gap-2">
          <span className="font-black whitespace-nowrap min-w-[125px]">Company Name:</span>
          <span className="border-b border-black flex-1 min-w-0 font-extrabold px-1 truncate">
            {companyNameEn}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-black whitespace-nowrap min-w-[125px]">Executive Director:</span>
          <span className="border-b border-black flex-1 min-w-0 font-extrabold px-1 truncate">
            {executiveDirectorEn}
          </span>
        </div>
        <div className="flex items-baseline gap-2 pt-1">
          <span className="font-black whitespace-nowrap min-w-[125px]">Signature:</span>
          <span className="border-b border-black border-dotted flex-1 min-h-[16px]"></span>
        </div>
        <div className="flex items-baseline gap-2 pt-2">
          <span className="font-black whitespace-nowrap min-w-[125px]">Stamp:</span>
          <span className="border-b border-black border-dotted flex-1 min-h-[16px]"></span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white text-black p-4 md:p-6 rounded-xl border-2 border-black font-sans leading-normal shadow-xs page-break-inside-avoid print-container flex flex-col justify-between">
      {/* 1. Arabic Only */}
      {language === "ar" && renderArabicContent(false)}

      {/* 2. English Only */}
      {language === "en" && renderEnglishContent(false)}

      {/* 3. Both Languages (Bilingual Side-by-Side) */}
      {language === "both" && (
        <div className="space-y-4">
          {/* Dual Main Header */}
          <div className="text-center border-b-2 border-black pb-3">
            <h1 className="text-xl md:text-2xl font-black text-black tracking-wide">
              إنذار بالانقطاع عن العمل
            </h1>
            <h2 className="text-base md:text-lg font-bold text-gray-800 tracking-wide mt-0.5">
              Notice of Absence from Work
            </h2>
            <p className="text-[11px] font-semibold text-gray-600 mt-1">
              (وفق المادة 80 من نظام العمل السعودي / Under Article 80 of Saudi Labor Law)
            </p>
          </div>

          {/* Two Columns: Arabic on Right (RTL), English on Left (LTR) */}
          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2">
            {/* Right Column: Arabic */}
            <div className="pb-4 md:pb-0 md:pl-5 border-b md:border-b-0 md:border-l-2 border-black">
              {renderArabicContent(true)}
            </div>

            {/* Left Column: English */}
            <div className="pt-4 md:pt-0 md:pr-5">
              {renderEnglishContent(true)}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Legal Notice / Ref */}
      <div className="mt-4 pt-2.5 border-t border-gray-300 text-center text-[10px] md:text-xs font-bold text-gray-500">
        {language === "en"
          ? "Official Labor Notice - Article (80) Saudi Labor Law"
          : language === "ar"
          ? "إشعار إنذار نظامي رسمي - المادة (80) نظام العمل السعودي"
          : "إشعار إنذار نظامي رسمي ثنائي اللغة - المادة (80) نظام العمل السعودي | Official Bilingual Labor Notice - Article 80"}
      </div>
    </div>
  );
}
