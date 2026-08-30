import React from "react";
import { Mail, Phone, MapPin } from "lucide-react";

export type LetterheadId = "express" | "bawaba" | "commercial" | "standard";

export interface LetterheadInfo {
  id: LetterheadId;
  titleAr: string;
  titleEn: string;
  companyName: string;
  taxNumber: string;
  crNumber: string;
  fileName: string;
  badgeTone: string;
  colorGradient: string;
  logoUrl?: string;
  watermarkUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export const LETTERHEAD_TEMPLATES: LetterheadInfo[] = [
  {
    id: "express",
    titleAr: "ورقة مروس اكسبرس (02)",
    titleEn: "Express Gate Company",
    companyName: "شركة اكسبرس جابت",
    taxNumber: "314514350400003",
    crNumber: "4030362130",
    fileName: "ورقة مروس اكسبرس 02.docx",
    badgeTone: "red",
    colorGradient: "from-red-600 via-blue-700 to-[#1167c9]",
    logoUrl: "/letterheads/express_logo.svg",
    watermarkUrl: "/letterheads/express_watermark.jpeg",
    email: "ibrahim@albawaba-mq.com",
    phone: "+966 50 465 3753",
    address: "Jeddah, Al-Safa District, Prince Mutaib Street (Al-Arbaeen)",
  },
  {
    id: "bawaba",
    titleAr: "ورقة مروس شركة البوابة",
    titleEn: "Albawaba Almogbla Company",
    companyName: "شركة ألبوابا الموكبلا",
    taxNumber: "314632439400003",
    crNumber: "4030362130",
    fileName: "ورقة مروس شركة البوابة.docx",
    badgeTone: "blue",
    colorGradient: "from-blue-700 via-amber-600 to-slate-900",
    logoUrl: "/letterheads/albawaba_logo.svg",
    watermarkUrl: "/letterheads/albawaba_watermark.jpeg",
    email: "ibrahim@albawaba-mq.com",
    phone: "+966 50 465 3753",
    address: "Jeddah, Al-Safa District, Prince Mutaib Street (Al-Arbaeen)",
  },
  {
    id: "commercial",
    titleAr: "ورقة مروس التجارية",
    titleEn: "Albawaba Almuqblah Commercial",
    companyName: "مؤسسة البوابة المقبلة للتجارة",
    taxNumber: "314514350400003",
    crNumber: "4030362130",
    fileName: "ورقة مروس التجارية.docx",
    badgeTone: "amber",
    colorGradient: "from-emerald-700 via-slate-800 to-emerald-900",
    logoUrl: "/letterheads/commercial_logo.png",
    watermarkUrl: "/letterheads/commercial_watermark.png",
    email: "ibrahim@albawaba-mq.com",
    phone: "+966 50 465 3753",
    address: "Jeddah, Al-Safa District",
  },
  {
    id: "standard",
    titleAr: "ورقة بيضاء (بدون خلفية)",
    titleEn: "Standard Blank Letterhead",
    companyName: "شركة اكسبرس جابت",
    taxNumber: "314514350400003",
    crNumber: "4030362130",
    fileName: "",
    badgeTone: "slate",
    colorGradient: "from-slate-700 to-slate-900",
  },
];

export function LetterheadWatermark({ letterheadId = "express" }: { letterheadId?: LetterheadId }) {
  const current = LETTERHEAD_TEMPLATES.find((t) => t.id === letterheadId) || LETTERHEAD_TEMPLATES[0];

  if (letterheadId === "standard" || !current.watermarkUrl) return null;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 print-force-background"
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      {/* Centered Watermark Image with subtle opacity */}
      <img
        src={current.watermarkUrl}
        alt="Watermark"
        className="w-[500px] max-w-[85%] max-h-[75%] object-contain opacity-[0.10] select-none mix-blend-multiply"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      />
    </div>
  );
}

export function LetterheadHeader({
  letterheadId = "express",
  companyName,
  date,
  refNo,
}: {
  letterheadId?: LetterheadId;
  companyName?: string;
  date?: string;
  refNo?: string;
}) {
  const current = LETTERHEAD_TEMPLATES.find((t) => t.id === letterheadId) || LETTERHEAD_TEMPLATES[0];
  const effectiveCompanyName = companyName || current.companyName;

  if (letterheadId === "standard") {
    return (
      <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-4 text-black font-sans">
        <div>
          <h1 className="text-lg font-extrabold">{effectiveCompanyName}</h1>
          <p className="text-xs font-semibold text-gray-700">إدارة الموارد البشرية والشؤون الإدارية</p>
        </div>
        <div className="text-left text-xs font-bold">
          <p>التاريخ: {date || "2026/08/30"}</p>
          <p>الرقم المرجعي: {refNo || "1024"}</p>
        </div>
      </div>
    );
  }

  if (letterheadId === "bawaba") {
    return (
      <div className="mb-4 text-black dir-rtl print:mb-2 relative z-10" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-3">
          {/* Logo on Left (RTL layout) */}
          {current.logoUrl && (
            <div className="w-16 h-16 shrink-0 flex items-center justify-center">
              <img
                src={current.logoUrl}
                alt="Logo"
                className="max-w-full max-h-full object-contain"
                style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
              />
            </div>
          )}
          
          {/* Company Titles on Right */}
          <div className="text-right space-y-0.5">
            <h1 className="text-lg md:text-xl font-black text-gray-900 tracking-tight">{effectiveCompanyName}</h1>
            <p className="text-xs font-bold text-gray-700 dir-ltr text-right">{current.titleEn}</p>
            <p className="text-xs font-bold text-gray-600">الرقم الضريبي: <span className="font-mono">{current.taxNumber}</span></p>
          </div>
        </div>

        {/* Metadata line */}
        <div className="flex justify-between items-center text-xs font-bold text-gray-700 pt-2 px-1">
          <span>إدارة الموارد البشرية والشؤون الإدارية</span>
          <div className="flex gap-4 font-mono">
            <span>التاريخ: {date || "2026/08/30"}</span>
            <span>الرقم المرجعي: {refNo || "BW-1024"}</span>
          </div>
        </div>
      </div>
    );
  }

  if (letterheadId === "commercial") {
    return (
      <div className="mb-4 text-black dir-rtl print:mb-2 relative z-10" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
        <div className="flex justify-between items-start border-b-2 border-emerald-800 pb-3">
          {current.logoUrl && (
            <div className="w-16 h-16 shrink-0 flex items-center justify-center">
              <img
                src={current.logoUrl}
                alt="Logo"
                className="max-w-full max-h-full object-contain"
                style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
              />
            </div>
          )}
          
          <div className="text-right space-y-0.5">
            <h1 className="text-lg md:text-xl font-black text-emerald-950 tracking-tight">{effectiveCompanyName}</h1>
            <p className="text-xs font-bold text-emerald-800 dir-ltr text-right">{current.titleEn}</p>
            <p className="text-xs font-bold text-gray-600">الرقم الضريبي: <span className="font-mono">{current.taxNumber}</span></p>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs font-bold text-gray-700 pt-2 px-1">
          <span>مؤسسة تجارية معتمدة</span>
          <div className="flex gap-4 font-mono">
            <span>التاريخ: {date || "2026/08/30"}</span>
            <span>الرقم المرجعي: {refNo || "CR-1024"}</span>
          </div>
        </div>
      </div>
    );
  }

  // Default: Express 02
  return (
    <div className="mb-4 text-black dir-rtl print:mb-2 relative z-10" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
      <div className="flex justify-between items-start border-b-2 border-blue-900 pb-3">
        {current.logoUrl && (
          <div className="w-16 h-16 shrink-0 flex items-center justify-center">
            <img
              src={current.logoUrl}
              alt="Logo"
              className="max-w-full max-h-full object-contain"
              style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
            />
          </div>
        )}
        
        <div className="text-right space-y-0.5">
          <h1 className="text-lg md:text-xl font-black text-blue-950 tracking-tight">{effectiveCompanyName}</h1>
          <p className="text-xs font-bold text-red-600 dir-ltr text-right">{current.titleEn}</p>
          <p className="text-xs font-bold text-gray-600">رقم التسجيل الضريبي: <span className="font-mono">{current.taxNumber}</span></p>
        </div>
      </div>

      <div className="flex justify-between items-center text-xs font-bold text-gray-700 pt-2 px-1">
        <span>إدارة الموارد البشرية والعمليات اللوجستية</span>
        <div className="flex gap-4 font-mono">
          <span>التاريخ: {date || "2026/08/30"}</span>
          <span>الرقم المرجعي: {refNo || "EX-1024"}</span>
        </div>
      </div>
    </div>
  );
}

export function LetterheadFooter({ letterheadId = "express" }: { letterheadId?: LetterheadId }) {
  if (letterheadId === "standard") return null;

  const current = LETTERHEAD_TEMPLATES.find((t) => t.id === letterheadId) || LETTERHEAD_TEMPLATES[0];

  return (
    <div
      className="mt-6 pt-3 border-t-2 border-gray-800 text-xs font-bold text-gray-800 dir-rtl print:mt-4 relative z-10"
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
        {current.email && (
          <div className="flex items-center gap-1.5 dir-ltr">
            <Mail size={13} className="text-gray-700 shrink-0" />
            <span>{current.email}</span>
          </div>
        )}
        {current.phone && (
          <div className="flex items-center gap-1.5 dir-ltr">
            <Phone size={13} className="text-gray-700 shrink-0" />
            <span>{current.phone}</span>
          </div>
        )}
        {current.address && (
          <div className="flex items-center gap-1.5 dir-ltr">
            <MapPin size={13} className="text-gray-700 shrink-0" />
            <span>{current.address}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function LetterheadFrame({
  letterheadId = "express",
  companyName,
  date,
  refNo,
  children,
}: {
  letterheadId?: LetterheadId;
  companyName?: string;
  date?: string;
  refNo?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative bg-white text-black p-6 md:p-8 rounded-xl border-2 border-black font-sans leading-relaxed text-right dir-rtl shadow-xs page-break-inside-avoid print-container min-h-[960px] flex flex-col justify-between overflow-hidden">
      <LetterheadWatermark letterheadId={letterheadId} />

      <div className="relative z-10 flex-1 flex flex-col justify-between">
        <div>
          <LetterheadHeader
            letterheadId={letterheadId}
            companyName={companyName}
            date={date}
            refNo={refNo}
          />
          <div className="pt-2">{children}</div>
        </div>

        <LetterheadFooter letterheadId={letterheadId} />
      </div>
    </div>
  );
}
