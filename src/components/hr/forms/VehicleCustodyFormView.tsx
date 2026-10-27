import React from "react";
import { Check, Car, Shield, RotateCcw } from "lucide-react";
import { LetterheadHeader, LetterheadFooter, LetterheadWatermark, LetterheadId } from "./LetterheadHeader";

export interface VehicleInspectionPart {
  id: string;
  nameAr: string;
  nameEn: string;
  condition: string;
}

export interface PolicyTermItem {
  id: number;
  selected: boolean;
  textAr: string;
  textEn: string;
}

export interface VehicleCustodyFormData {
  selectedModels: {
    handover: boolean;
    returnVehicle: boolean;
    fleetPolicy: boolean;
  };
  language: "ar" | "en" | "both";

  letterheadId?: LetterheadId;
  companyName?: string;
  recordNumber?: string;
  date?: string;
  time?: string;
  branch?: string;
  prevDeliveryRef?: string;

  // Rider info
  riderName?: string;
  iqamaNo?: string;
  nationality?: string;
  mobile?: string;
  jobTitle?: string;
  riderCode?: string;

  // Vehicle info
  vehicleType?: string;
  makeModel?: string;
  color?: string;
  plateNumber?: string;
  chassisNumber?: string;
  serialNumber?: string;
  odometer?: string;
  fuelLevel?: string;
  keysCount?: string;
  registrationStatus?: string;

  // Model 1: Handover
  handoverExteriorCondition: "excellent" | "good" | "remarks";
  handoverParts: VehicleInspectionPart[];
  handoverSpareTire: "present" | "not_present" | "remarks";
  handoverFaults: { id: number; checked: boolean; text: string }[];
  handoverVisibleScratches?: string;
  handoverVehicleNotes?: string;
  handoverAttachments: {
    front: boolean;
    rear: boolean;
    sides: boolean;
    interior: boolean;
    odometer: boolean;
    damages: boolean;
  };

  // Model 2: Return
  returnExteriorCondition: "excellent" | "good" | "remarks";
  returnParts: VehicleInspectionPart[];
  returnSpareTire: "present" | "not_present" | "remarks";
  returnFaults: { id: number; checked: boolean; text: string }[];
  returnVisibleScratches?: string;
  returnVehicleNotes?: string;
  returnAttachments: {
    front: boolean;
    rear: boolean;
    sides: boolean;
    interior: boolean;
    odometer: boolean;
    damages: boolean;
  };

  // Model 3: Policy
  policyTerms: PolicyTermItem[];

  // Administration / Signatures
  companyRepName?: string;
  companyRepTitle?: string;

  // Callbacks
  onToggleModel?: (model: "handover" | "returnVehicle" | "fleetPolicy") => void;
  onTogglePolicyTerm?: (id: number) => void;
  onToggleAttachment?: (type: "handover" | "return", key: string) => void;
  onToggleFault?: (type: "handover" | "return", id: number) => void;
  onSelectExteriorCondition?: (type: "handover" | "return", val: "excellent" | "good" | "remarks") => void;
  onSelectSpareTire?: (type: "handover" | "return", val: "present" | "not_present" | "remarks") => void;
}

export const INITIAL_VEHICLE_PARTS: { id: string; nameAr: string; nameEn: string; defaultCondition: string }[] = [
  { id: "front_bumper", nameAr: "الصدام الأمامي", nameEn: "Front Bumper", defaultCondition: "سليم" },
  { id: "rear_bumper", nameAr: "الصدام الخلفي", nameEn: "Rear Bumper", defaultCondition: "سليم" },
  { id: "doors", nameAr: "الأبواب", nameEn: "Doors", defaultCondition: "سليمة" },
  { id: "glass_mirrors", nameAr: "الزجاج والمرايا", nameEn: "Glass & Mirrors", defaultCondition: "سليمة ونظيفة" },
  { id: "tires", nameAr: "الإطارات", nameEn: "Tires", defaultCondition: "جيدة ومطابقة" },
  { id: "lights", nameAr: "الأنوار والإشارات", nameEn: "Lights & Signals", defaultCondition: "تعمل بالكامل" },
  { id: "ac", nameAr: "المكيف", nameEn: "Air Conditioner (A/C)", defaultCondition: "يعمل بكفاءة" },
  { id: "engine", nameAr: "المحرك", nameEn: "Engine", defaultCondition: "ممتاز وطبيعي" },
  { id: "brakes", nameAr: "الفرامل", nameEn: "Brakes", defaultCondition: "ممتازة" },
  { id: "battery", nameAr: "البطارية", nameEn: "Battery", defaultCondition: "سليمة ومشحونة" },
  { id: "interior_seats", nameAr: "الداخلية والمقاعد", nameEn: "Interior & Seats", defaultCondition: "نظيفة وسليمة" },
];

export const INITIAL_POLICY_TERMS: { id: number; textAr: string; textEn: string }[] = [
  {
    id: 1,
    textAr: "يتحمل المندوب قيمة فتح ملف الحادث المروري الذي يخص مركبة الشركة، وقدرها 2,500 ريال، عند تحديد نسبة مسؤوليته عن الحادث من 25% إلى 100%.",
    textEn: "The rider bears the cost of opening the traffic accident file for the company vehicle, amounting to SAR 2,500, when their liability percentage for the accident is determined between 25% and 100%.",
  },
  {
    id: 2,
    textAr: "لا يحق للموظف إجراء أي تغيير على مركبة الشركة المسلّمة إليه، سواء في الهيكل الخارجي أو الداخلي.",
    textEn: "The employee is not entitled to make any modifications to the company vehicle assigned to him, whether to the exterior body or interior.",
  },
  {
    id: 3,
    textAr: "عند حجز موعد لصيانة المركبة، يجب على المشرف إبلاغ قسم الأسطول بموعد دخولها وخروجها، وتأكيد ذلك رسميًا عبر البريد الإلكتروني.",
    textEn: "When booking a maintenance appointment for the vehicle, the supervisor must notify the Fleet Department of its entry and exit times and officially confirm it via email.",
  },
  {
    id: 4,
    textAr: "يلتزم المندوب المستلم لمركبة الشركة بنظافتها من الداخل والخارج. ومن يخالف ذلك يتحمل غرامة مالية قدرها 100 ريال.",
    textEn: "The rider receiving the company vehicle commits to keeping it clean inside and out. Any violation incurs a penalty of SAR 100.",
  },
  {
    id: 5,
    textAr: "يُمنع تسليم مركبة الشركة إلى أي مندوب دون التفويض الرسمي، وتُحاسب إدارة العمل من يخالف ذلك.",
    textEn: "It is strictly prohibited to hand over the company vehicle to any rider without official authorization; violators will be held accountable by operations management.",
  },
  {
    id: 6,
    textAr: "لا يحق للمندوب احتجاز مركبة الشركة أو إيقافها عن العمل مهما كانت الظروف. وفي حال المخالفة تُخصم قيمة إيجارها اليومي من راتبه الشهري.",
    textEn: "The rider has no right to withhold the company vehicle or idle it under any circumstances. In case of violation, its daily rental value is deducted from his monthly salary.",
  },
  {
    id: 7,
    textAr: "في حال فقدان طفاية الحريق أو شنطة العدة أو الإطار الاحتياطي، يتحمل المندوب قيمة المفقود.",
    textEn: "In case of losing the fire extinguisher, tool kit, or spare tire, the rider bears the replacement cost.",
  },
  {
    id: 8,
    textAr: "في حال وجود تلف أو ضرر في الفرش الداخلي للمركبة، بما في ذلك آثار الحريق أو التدخين، يُخصم مبلغ 250 ريالًا عن كل تلف أو ضرر. ويحق للشركة زيادة المبلغ بحسب حجم التلفيات.",
    textEn: "In case of damage or wear to the vehicle's interior upholstery, including burns or smoking marks, SAR 250 is deducted per damage. The company reserves the right to increase the amount based on damage extent.",
  },
  {
    id: 9,
    textAr: "في حال فقدان مفتاح المركبة، يلتزم المندوب المستلم لها بسداد مبلغ 1,500 ريال.",
    textEn: "In case of losing the vehicle key, the assigned rider commits to paying SAR 1,500.",
  },
  {
    id: 10,
    textAr: "يلتزم المندوب بعدم ترك المركبة ومفتاح التشغيل داخلها وهي في وضع التشغيل. ويتحمل كامل المسؤولية عن الأضرار الناجمة عن هذا الإهمال، بما فيها قيمة الإيجار والأضرار خلال الفترة من تاريخ السرقة إلى تاريخ إنهاء موضوعها.",
    textEn: "The rider commits never to leave the vehicle running with the key inside. He bears full responsibility for damages resulting from this negligence, including rental costs and damages from theft date until final resolution.",
  },
  {
    id: 11,
    textAr: "يلتزم المشرف المباشر بمتابعة حوادث مركبة المندوب ومشاركتها مع قسم الأسطول، مع تقارير نجم أو المرور. وفي حال عدم التجاوب، تُبلغ الإدارة العليا لاتخاذ الإجراء اللازم بحق المندوب ومشرفه المباشر.",
    textEn: "The direct supervisor must follow up on rider vehicle accidents and share them with the Fleet Department along with Najm or Traffic Police reports. Non-compliance is escalated to senior management.",
  },
  {
    id: 12,
    textAr: "عند عدم تجاوب المشرف المباشر مع المعلومات المتعلقة بالأسطول، يرفع قسم الأسطول الأمر رسميًا بالبريد الإلكتروني إلى المدير المباشر لاتخاذ الإجراءات اللازمة.",
    textEn: "Upon non-responsiveness of the direct supervisor regarding fleet information, the Fleet Department officially escalates the matter via email to the direct manager.",
  },
  {
    id: 13,
    textAr: "يُمنع استخدام مركبة الشركة خارج أوقات الدوام الرسمي أو اصطحاب أشخاص آخرين مع المندوب. وعند ثبوت المخالفة يُخصم إيجار يوم قدره 400 ريال، وتُضاعف قيمة الخصم في حال التكرار.",
    textEn: "Using the company vehicle outside official working hours or carrying unauthorized passengers is prohibited. Violations incur a daily rental deduction of SAR 400, doubled for repeat offenses.",
  },
  {
    id: 14,
    textAr: "عند وقوع حادث مروري لمركبة الشركة خارج أوقات الدوام الرسمي، يتحمل مستلم المركبة جميع الأضرار، إضافة إلى قيمة إيجارها من تاريخ دخولها الصيانة حتى خروجها منها.",
    textEn: "In the event of a traffic accident outside official working hours, the vehicle custodian bears all damages plus rental value from the date of maintenance entry until release.",
  },
];

function CustomBox({
  checked,
  onClick,
  labelAr,
  labelEn,
  language,
  className = "",
  size = "md",
}: {
  checked: boolean;
  onClick?: () => void;
  labelAr?: string;
  labelEn?: string;
  language: "ar" | "en" | "both";
  className?: string;
  size?: "sm" | "md";
}) {
  const boxDimension =
    size === "sm"
      ? "w-4 h-4 print:w-3.5 print:h-3.5 text-xs print:text-[9px]"
      : "w-5 h-5 print:w-4 print:h-4 text-sm print:text-xs";
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 print:gap-1 select-none ${isClickable ? "cursor-pointer hover:opacity-80" : ""} ${className}`}
    >
      <div
        className={`${boxDimension} border-2 border-black rounded-xs flex items-center justify-center font-black transition-colors shrink-0 ${checked ? "bg-black text-white print:bg-black print:text-white" : "bg-white text-transparent print:bg-white"
          }`}
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        {checked && <Check size={size === "sm" ? 11 : 13} strokeWidth={3.5} className="text-white" />}
      </div>
      {(labelAr || labelEn) && (
        <span className="font-bold text-gray-900 leading-tight text-xs print:text-[9.5px]">
          {language === "ar" && labelAr}
          {language === "en" && (labelEn || labelAr)}
          {language === "both" && (
            <span>
              {labelAr} {labelEn && <span className="text-[10.5px] print:text-[8.5px] font-medium text-gray-700 dir-ltr">({labelEn})</span>}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

export function VehicleCustodyFormView({ data }: { data: VehicleCustodyFormData }) {
  const {
    selectedModels = { handover: true, returnVehicle: false, fleetPolicy: true },
    language = "both",
    letterheadId = "express",
    companyName = "شركة اكسبرس جايت",
    recordNumber = "REC-2026/001",
    date = "",
    time = "10:00 ص",
    branch = "الفرع الرئيسي - جدة",
    prevDeliveryRef = "REC-2026/HANDOVER-001",
    riderName = "",
    iqamaNo = "",
    nationality = "",
    mobile = "",
    jobTitle = "سائق مندوب توصيل",
    riderCode = "",
    vehicleType = "سيارة",
    makeModel = "تويوتا يارس 2024",
    color = "أبيض",
    plateNumber = "أ ب ج 1234",
    chassisNumber = "JT1234567890ABCD",
    serialNumber = "SN-987654",
    odometer = "45,200",
    fuelLevel = "ممتلئ (Full)",
    keysCount = "2",
    registrationStatus = "سارية ومجددة",
    handoverExteriorCondition = "excellent",
    handoverParts = [],
    handoverSpareTire = "present",
    handoverFaults = [],
    handoverVisibleScratches = "",
    handoverVehicleNotes = "",
    handoverAttachments = { front: true, rear: true, sides: true, interior: true, odometer: true, damages: false },
    returnExteriorCondition = "good",
    returnParts = [],
    returnSpareTire = "present",
    returnFaults = [],
    returnVisibleScratches = "",
    returnVehicleNotes = "",
    returnAttachments = { front: true, rear: true, sides: true, interior: true, odometer: true, damages: false },
    policyTerms = [],
    companyRepName = "مسؤول قسم الأسطول والتشغيل",
    companyRepTitle = "مشرف الأسطول والعهد",
    onTogglePolicyTerm,
    onToggleAttachment,
    onToggleFault,
    onSelectExteriorCondition,
    onSelectSpareTire,
  } = data;

  const resolvedDate = date || ".... / .... / ........";
  const hasAnyModelSelected = selectedModels.handover || selectedModels.returnVehicle || selectedModels.fleetPolicy;

  const isAr = language === "ar";
  const isEn = language === "en";
  const isBoth = language === "both";

  const t = (ar: string, en: string) => {
    if (isAr) return ar;
    if (isEn) return en;
    return `${ar} / ${en}`;
  };

  // Fleet policy pagination logic:
  // Page 2 needs room for the Legal Acknowledgment Box + Signatures Table + Letterhead Footer.
  // Therefore, Page 2 can hold at most 5 terms comfortably without overflowing an A4 page.
  // Page 1 only has terms and a continuation banner, so it easily holds 8 to 10 terms.
  const splitIndex = policyTerms.length > 7 ? Math.max(7, policyTerms.length - 5) : policyTerms.length;
  const policyPage1Terms = policyTerms.slice(0, splitIndex);
  const policyPage2Terms = policyTerms.slice(splitIndex);

  return (
    <div className="space-y-6 print:space-y-0" dir={isEn ? "ltr" : "rtl"}>
      {!hasAnyModelSelected && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg text-amber-900 text-center font-bold">
          ⚠️ يرجى تحديد نموذج واحد على الأقل من نماذج المركبة أدناه للطباعة أو المعاينة.
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODEL 1: نموذج تسليم مركبة للمندوب (Vehicle Handover Form)                */}
      {/* ========================================================================= */}
      {selectedModels.handover && (
        <div className="relative bg-white text-black p-4 sm:p-6 print:p-2.5 print:py-2 rounded-xl border-2 border-black font-sans leading-normal print:leading-tight shadow-xs min-h-[960px] print:min-h-[275mm] flex flex-col justify-between overflow-visible print:overflow-visible print-page-flow">
          <LetterheadWatermark letterheadId={letterheadId} />

          <div className="relative z-10 flex-1 flex flex-col justify-between">
            <div>
              {/* Header */}
              <LetterheadHeader
                letterheadId={letterheadId}
                companyName={companyName}
                date={date}
                refNo={recordNumber}
                compact
              />

              {/* Title Section */}
              <div className="text-center pt-1 pb-1 print:py-0.5 border-b border-black mb-1.5 print:mb-1">
                <div className="flex items-center justify-center gap-1.5">
                  <Car className="w-4 h-4 text-black print:hidden" />
                  <h1 className="text-base sm:text-lg print:text-[13.5px] font-black text-black tracking-wide leading-tight">
                    {isAr && "نموذج تسليم مركبة للمندوب"}
                    {isEn && "Company Vehicle Handover Form to Rider"}
                    {isBoth && (
                      <div className="space-y-0.5">
                        <div>نموذج تسليم مركبة للمندوب</div>
                        <div className="text-xs print:text-[10px] font-bold text-gray-700 dir-ltr">
                          Company Vehicle Handover Form to Rider
                        </div>
                      </div>
                    )}
                  </h1>
                </div>

                {/* Subtitle Line */}
                <div className="mt-0.5 text-xs print:text-[9.5px] font-extrabold text-gray-900 flex flex-wrap justify-between items-center gap-1.5 bg-gray-100 p-1 print:py-0.5 rounded-sm border border-gray-400">
                  <span>{t("رقم المحضر:", "Record No:")} <b className="text-black">{recordNumber}</b></span>
                  <span>{t("التاريخ:", "Date:")} <b className="text-black">{resolvedDate}</b></span>
                  <span>{t("الوقت:", "Time:")} <b className="text-black">{time || "........"}</b></span>
                  <span>{t("الفرع:", "Branch:")} <b className="text-black">{branch || "المركز الرئيسي"}</b></span>
                </div>
              </div>

              {/* Rider Details Grid */}
              <div className="border border-black rounded-sm p-1.5 print:p-1 bg-gray-50/70 text-xs print:text-[10px] font-semibold mb-1.5 print:mb-1 space-y-0.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 print:gap-1">
                  <div>
                    <span className="font-bold text-gray-700">{t("اسم المندوب المستلم:", "Rider Name:")} </span>
                    <span className="font-black text-black">{riderName || "...................................."}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("رقم الهوية / الإقامة:", "ID / Iqama No:")} </span>
                    <span className="font-black text-black dir-ltr inline-block">{iqamaNo || "...................."}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("الجوال:", "Mobile:")} </span>
                    <span className="font-black text-black dir-ltr inline-block">{mobile || "...................."}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 print:gap-1 pt-0.5 border-t border-gray-300">
                  <div>
                    <span className="font-bold text-gray-700">{t("المسمى الوظيفي:", "Job Title:")} </span>
                    <span className="font-black text-black">{jobTitle || "سائق مندوب توصيل"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("الجنسية:", "Nationality:")} </span>
                    <span className="font-black text-black">{nationality || "...................."}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("رقم المندوب / الكود:", "Rider Code:")} </span>
                    <span className="font-black text-black">{riderCode || "...................."}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Details Block */}
              <div className="border border-black rounded-sm p-1.5 print:p-1 bg-gray-50/70 text-xs print:text-[10px] font-semibold mb-1.5 print:mb-1 space-y-0.5">
                <div className="font-black text-black border-b border-black pb-0.5 text-xs print:text-[10.5px] flex justify-between items-center">
                  <span>{t("بيانات ومواصفات المركبة المسلّمة:", "Delivered Vehicle Specification & Details:")}</span>
                  <span className="text-[11px] print:text-[10px] font-bold text-[#1167c9]">{vehicleType}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 print:gap-1 pt-0.5">
                  <div>
                    <span className="font-bold text-gray-700">{t("الماركة والموديل:", "Make & Model:")} </span>
                    <span className="font-black text-black">{makeModel || "............"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("اللون:", "Color:")} </span>
                    <span className="font-black text-black">{color || "............"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("اللوحة:", "Plate No:")} </span>
                    <span className="font-black text-black">{plateNumber || "............"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("رقم الهيكل (VIN):", "Chassis No:")} </span>
                    <span className="font-black text-black dir-ltr inline-block text-[11px] print:text-[9.5px]">{chassisNumber || "............"}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 print:gap-1 pt-0.5 border-t border-gray-300">
                  <div>
                    <span className="font-bold text-gray-700">{t("الرقم التسلسلي:", "Serial No:")} </span>
                    <span className="font-black text-black dir-ltr inline-block text-[11px] print:text-[9.5px]">{serialNumber || "............"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("قراءة العداد:", "Odometer:")} </span>
                    <span className="font-black text-black">{odometer ? `${odometer} كم` : "............"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("مستوى الوقود:", "Fuel Level:")} </span>
                    <span className="font-black text-black">{fuelLevel || "............"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("المفاتيح / الرخصة:", "Keys / Registration:")} </span>
                    <span className="font-black text-black text-[11px] print:text-[9.5px]">{keysCount} مفتاح | {registrationStatus}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Inspection Table (2 Columns) */}
              <div className="mb-1.5 print:mb-1">
                <div className="flex flex-wrap justify-between items-center mb-0.5 border-b border-black pb-0.5">
                  <h3 className="font-black text-xs print:text-[10.5px] text-black">
                    {t("فحص ومعاينة أجزاء المركبة وقت التسليم:", "Vehicle Inspection Checklist at Handover:")}
                  </h3>
                  <div className="flex items-center gap-2 print:gap-1.5 text-xs print:text-[10px]">
                    <span className="font-bold text-gray-800">{t("الهيكل الخارجي:", "Exterior Body:")}</span>
                    <CustomBox
                      checked={handoverExteriorCondition === "excellent"}
                      onClick={() => onSelectExteriorCondition && onSelectExteriorCondition("handover", "excellent")}
                      labelAr="ممتازة"
                      labelEn="Excellent"
                      language={language}
                      size="sm"
                    />
                    <CustomBox
                      checked={handoverExteriorCondition === "good"}
                      onClick={() => onSelectExteriorCondition && onSelectExteriorCondition("handover", "good")}
                      labelAr="جيدة"
                      labelEn="Good"
                      language={language}
                      size="sm"
                    />
                    <CustomBox
                      checked={handoverExteriorCondition === "remarks"}
                      onClick={() => onSelectExteriorCondition && onSelectExteriorCondition("handover", "remarks")}
                      labelAr="ملاحظات"
                      labelEn="Remarks"
                      language={language}
                      size="sm"
                    />
                  </div>
                </div>

                {/* 2-column Inspection Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mb-1">
                  <table className="w-full border-collapse border border-black text-xs print:text-[9.5px]">
                    <thead>
                      <tr className="bg-gray-100 font-bold border-b border-black">
                        <th className="border border-black p-0.5 px-1.5 text-right w-7/12">{t("موضع الفحص", "Part")}</th>
                        <th className="border border-black p-0.5 px-1.5 text-right w-5/12">{t("الحالة", "Condition")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {handoverParts.slice(0, Math.ceil(handoverParts.length / 2)).map((part) => (
                        <tr key={part.id}>
                          <td className="border border-black p-0.5 px-1.5 font-bold text-right bg-gray-50/50 leading-tight">
                            {isAr && part.nameAr}
                            {isEn && part.nameEn}
                            {isBoth && `${part.nameAr} / ${part.nameEn}`}
                          </td>
                          <td className="border border-black p-0.5 px-1.5 text-right font-medium leading-tight">{part.condition || "سليم"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <table className="w-full border-collapse border border-black text-xs print:text-[9.5px]">
                    <thead>
                      <tr className="bg-gray-100 font-bold border-b border-black">
                        <th className="border border-black p-0.5 px-1.5 text-right w-7/12">{t("موضع الفحص", "Part")}</th>
                        <th className="border border-black p-0.5 px-1.5 text-right w-5/12">{t("الحالة", "Condition")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {handoverParts.slice(Math.ceil(handoverParts.length / 2)).map((part) => (
                        <tr key={part.id}>
                          <td className="border border-black p-0.5 px-1.5 font-bold text-right bg-gray-50/50 leading-tight">
                            {isAr && part.nameAr}
                            {isEn && part.nameEn}
                            {isBoth && `${part.nameAr} / ${part.nameEn}`}
                          </td>
                          <td className="border border-black p-0.5 px-1.5 text-right font-medium leading-tight">{part.condition || "سليم"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Spare Tire, Faults & Attachments */}
                <div className="border border-black rounded-sm p-1.5 print:p-1 bg-gray-50/60 text-xs print:text-[9.5px] space-y-1 print:space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2 print:gap-1.5">
                    <span className="font-extrabold text-black">{t("الاستبنة ومعدات تغيير الإطار:", "Spare Tire & Tools:")}</span>
                    <CustomBox
                      checked={handoverSpareTire === "present"}
                      onClick={() => onSelectSpareTire && onSelectSpareTire("handover", "present")}
                      labelAr="موجودة"
                      labelEn="Present"
                      language={language}
                      size="sm"
                    />
                    <CustomBox
                      checked={handoverSpareTire === "not_present"}
                      onClick={() => onSelectSpareTire && onSelectSpareTire("handover", "not_present")}
                      labelAr="غير موجودة"
                      labelEn="Not Present"
                      language={language}
                      size="sm"
                    />
                    <CustomBox
                      checked={handoverSpareTire === "remarks"}
                      onClick={() => onSelectSpareTire && onSelectSpareTire("handover", "remarks")}
                      labelAr="يوجد ملاحظات"
                      labelEn="Remarks"
                      language={language}
                      size="sm"
                    />
                  </div>

                  {/* Faults Checklist */}
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-black block">{t("الأعطال أو المشاكل الموجودة:", "Existing Faults or Issues:")}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5 text-[10.5px] print:text-[9px]">
                      {handoverFaults.map((fault) => (
                        <div key={fault.id} className="flex items-center gap-1">
                          <CustomBox
                            checked={fault.checked}
                            onClick={() => onToggleFault && onToggleFault("handover", fault.id)}
                            language={language}
                            size="sm"
                          />
                          <span className={fault.checked ? "font-bold text-black" : "text-gray-600"}>{fault.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {handoverVisibleScratches && (
                    <div className="text-[10px] print:text-[9px]">
                      <span className="font-extrabold text-black">{t("الخدوش أو التلفيات الظاهرة:", "Visible scratches / damages:")} </span>
                      <span className="font-medium text-gray-800">{handoverVisibleScratches}</span>
                    </div>
                  )}

                  {/* Attachments */}
                  <div className="pt-0.5 border-t border-gray-300">
                    <span className="font-extrabold text-black ml-2">{t("مرفقات حالة وفحص المركبة:", "Condition Photos & Evidence:")}</span>
                    <div className="inline-flex flex-wrap gap-2 print:gap-1.5 text-[10px] print:text-[9px] pt-0.5">
                      <CustomBox
                        checked={handoverAttachments.front}
                        onClick={() => onToggleAttachment && onToggleAttachment("handover", "front")}
                        labelAr="صور أمامية"
                        labelEn="Front"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={handoverAttachments.rear}
                        onClick={() => onToggleAttachment && onToggleAttachment("handover", "rear")}
                        labelAr="صور خلفية"
                        labelEn="Rear"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={handoverAttachments.sides}
                        onClick={() => onToggleAttachment && onToggleAttachment("handover", "sides")}
                        labelAr="صور الجانبين"
                        labelEn="Sides"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={handoverAttachments.interior}
                        onClick={() => onToggleAttachment && onToggleAttachment("handover", "interior")}
                        labelAr="صور الداخلية"
                        labelEn="Interior"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={handoverAttachments.odometer}
                        onClick={() => onToggleAttachment && onToggleAttachment("handover", "odometer")}
                        labelAr="صورة العداد"
                        labelEn="Odometer"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={handoverAttachments.damages}
                        onClick={() => onToggleAttachment && onToggleAttachment("handover", "damages")}
                        labelAr="صور التلفيات"
                        labelEn="Damages"
                        language={language}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehicle Undertaking */}
              <div className="border border-black rounded-sm p-1.5 print:p-1 bg-gray-50/90 text-xs print:text-[9.5px] leading-snug print:leading-tight space-y-0.5 mb-1.5 print:mb-1">
                <h4 className="font-black text-black underline text-xs print:text-[10px]">
                  {t("الإقرار والتعهد الخاص بالمركبة:", "Vehicle Custody Undertaking & Legal Acknowledgment:")}
                </h4>
                {isBoth ? (
                  <div className="space-y-0.5">
                    <p className="text-gray-900 font-bold text-justify text-[10px] print:text-[8.5px] leading-snug print:leading-tight">
                      {`أقر أنا المندوب الموقع أدناه باستلام المركبة الموضحة بياناتها أعلاه بحالتها الراهنة من ${companyName}، وأقر بمعاينتها وفحص كافة أجزائها وإثبات الخدوش والتلفيات والملاحظات المسجلة. وأتعهد بالمحافظة التامة عليها واستخدامها لأغراض العمل التابعة للشركة فقط، والالتزام بأنظمة المرور وقواعد السلامة، وعدم تسليمها أو تمكين أي شخص آخر من قيادتها، وإبلاغ إدارة الأسطول فوراً عن أي حادث أو عطل، والالتزام ببنود سياسة قسم الأسطول المعتمدة.`}
                    </p>
                    <p className="text-gray-700 font-medium text-justify text-[9.5px] print:text-[8px] leading-snug print:leading-tight dir-ltr">
                      {`I, the undersigned rider, acknowledge receiving the above-detailed vehicle in its recorded condition from ${companyName}. I confirm inspecting all components and verifying noted scratches and damages. I undertake to maintain it, use it exclusively for authorized business purposes, adhere strictly to traffic and safety regulations, never hand it over to unauthorized persons, immediately report any accident or breakdown to the Fleet Department, and abide by all approved Fleet Policy regulations.`}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-900 font-bold text-justify text-[10.5px] print:text-[9px] leading-snug print:leading-tight">
                    {isAr
                      ? `أقر أنا المندوب الموقع أدناه باستلام المركبة الموضحة بياناتها أعلاه بحالتها الراهنة من ${companyName}، وأقر بمعاينتها وفحص كافة أجزائها وإثبات الخدوش والتلفيات والملاحظات المسجلة. وأتعهد بالمحافظة التامة عليها واستخدامها لأغراض العمل التابعة للشركة فقط، والالتزام بأنظمة المرور وقواعد السلامة، وعدم تسليمها أو تمكين أي شخص آخر من قيادتها، وإبلاغ إدارة الأسطول فوراً عن أي حادث أو عطل، والالتزام ببنود سياسة قسم الأسطول المعتمدة.`
                      : `I, the undersigned rider, acknowledge receiving the above-detailed vehicle in its recorded condition from ${companyName}. I confirm inspecting all components and verifying noted scratches and damages. I undertake to maintain it, use it exclusively for authorized business purposes, adhere strictly to traffic and safety regulations, never hand it over to unauthorized persons, immediately report any accident or breakdown to the Fleet Department, and abide by all approved Fleet Policy regulations.`}
                  </p>
                )}
              </div>

              {/* Signatures Table */}
              <table className="w-full border-collapse border border-black text-center text-xs print:text-[9.5px] font-semibold mb-0.5">
                <thead>
                  <tr className="bg-gray-100 font-black border-b border-black">
                    <th className="border border-black p-1 print:p-0.5 w-5/12">{t("المندوب المستلم", "Receiving Rider")}</th>
                    <th className="border border-black p-1 print:p-0.5 w-5/12">{t("مسؤول / مشرف الأسطول المسلّم", "Handing Fleet Supervisor")}</th>
                    <th className="border border-black p-1 print:p-0.5 w-2/12">{t("بصمة المندوب", "Thumbprint")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-1 print:p-0.5 text-right align-top space-y-0.5">
                      <div><span className="font-bold text-gray-700">{t("الاسم:", "Name:")} </span>{riderName || "...................................."}</div>
                      <div className="pt-0.5"><span className="font-bold text-gray-700">{t("التوقيع:", "Signature:")} </span>....................................</div>
                    </td>
                    <td className="border border-black p-1 print:p-0.5 text-right align-top space-y-0.5">
                      <div><span className="font-bold text-gray-700">{t("الاسم:", "Name:")} </span>{companyRepName}</div>
                      <div><span className="font-bold text-gray-700">{t("الصفة:", "Title:")} </span>{companyRepTitle}</div>
                      <div className="pt-0.5"><span className="font-bold text-gray-700">{t("التوقيع والختم:", "Sign & Seal:")} </span>....................................</div>
                    </td>
                    <td className="border border-black p-0.5 align-middle text-center bg-gray-50/40">
                      <div className="w-12 h-12 print:w-11 print:h-11 border border-dashed border-gray-400 mx-auto flex items-center justify-center text-[8.5px] text-gray-500">
                        {t("موضع البصمة", "Thumbprint")}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <LetterheadFooter letterheadId={letterheadId} compact />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODEL 2: نموذج استرداد واستلام مركبة من المندوب (Return Form)             */}
      {/* ========================================================================= */}
      {selectedModels.returnVehicle && (
        <div
          className={`relative bg-white text-black p-4 sm:p-6 print:p-2.5 print:py-2 rounded-xl border-2 border-black font-sans leading-normal print:leading-tight shadow-xs min-h-[960px] print:min-h-[275mm] flex flex-col justify-between overflow-visible print:overflow-visible print-page-flow ${selectedModels.handover ? "print:break-before-page" : ""
            }`}
        >
          <LetterheadWatermark letterheadId={letterheadId} />

          <div className="relative z-10 flex-1 flex flex-col justify-between">
            <div>
              {/* Header */}
              <LetterheadHeader
                letterheadId={letterheadId}
                companyName={companyName}
                date={date}
                refNo={recordNumber}
                compact
              />

              {/* Title Section */}
              <div className="text-center pt-1 pb-1 print:py-0.5 border-b border-black mb-1.5 print:mb-1">
                <div className="flex items-center justify-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-black print:hidden" />
                  <h1 className="text-base sm:text-lg print:text-[13.5px] font-black text-black tracking-wide leading-tight">
                    {isAr && "نموذج استرداد واستلام مركبة من المندوب"}
                    {isEn && "Vehicle Return & Recovery Form from Rider"}
                    {isBoth && (
                      <div className="space-y-0.5">
                        <div>نموذج استرداد واستلام مركبة من المندوب</div>
                        <div className="text-xs print:text-[10px] font-bold text-gray-700 dir-ltr">
                          Vehicle Return & Recovery Form from Rider
                        </div>
                      </div>
                    )}
                  </h1>
                </div>

                <div className="mt-0.5 text-xs print:text-[9.5px] font-extrabold text-gray-900 flex flex-wrap justify-between items-center gap-1.5 bg-gray-100 p-1 print:py-0.5 rounded-sm border border-gray-400">
                  <span>{t("رقم المحضر:", "Record No:")} <b className="text-black">{recordNumber}</b></span>
                  <span>{t("مرجع التسليم السابق:", "Previous Handover Ref:")} <b className="text-black">{prevDeliveryRef}</b></span>
                  <span>{t("التاريخ:", "Date:")} <b className="text-black">{resolvedDate}</b></span>
                  <span>{t("الوقت:", "Time:")} <b className="text-black">{time || "........"}</b></span>
                </div>
              </div>

              {/* Rider Details Grid */}
              <div className="border border-black rounded-sm p-1.5 print:p-1 bg-gray-50/70 text-xs print:text-[10px] font-semibold mb-1.5 print:mb-1 space-y-0.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 print:gap-1">
                  <div>
                    <span className="font-bold text-gray-700">{t("اسم المندوب المسلّم:", "Returning Rider:")} </span>
                    <span className="font-black text-black">{riderName || "...................................."}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("رقم الهوية / الإقامة:", "ID / Iqama No:")} </span>
                    <span className="font-black text-black dir-ltr inline-block">{iqamaNo || "...................."}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("الجوال:", "Mobile:")} </span>
                    <span className="font-black text-black dir-ltr inline-block">{mobile || "...................."}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 print:gap-1 pt-0.5 border-t border-gray-300">
                  <div>
                    <span className="font-bold text-gray-700">{t("المسمى الوظيفي:", "Job Title:")} </span>
                    <span className="font-black text-black">{jobTitle || "سائق مندوب توصيل"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("الجنسية:", "Nationality:")} </span>
                    <span className="font-black text-black">{nationality || "...................."}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("رقم المندوب / الكود:", "Rider Code:")} </span>
                    <span className="font-black text-black">{riderCode || "...................."}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Details Block */}
              <div className="border border-black rounded-sm p-1.5 print:p-1 bg-gray-50/70 text-xs print:text-[10px] font-semibold mb-1.5 print:mb-1 space-y-0.5">
                <div className="font-black text-black border-b border-black pb-0.5 text-xs print:text-[10.5px] flex justify-between items-center">
                  <span>{t("بيانات المركبة المستردة:", "Returned Vehicle Specification:")}</span>
                  <span className="text-[11px] print:text-[10px] font-bold text-[#1167c9]">{vehicleType}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 print:gap-1 pt-0.5">
                  <div>
                    <span className="font-bold text-gray-700">{t("الماركة والموديل:", "Make & Model:")} </span>
                    <span className="font-black text-black">{makeModel || "............"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("اللون:", "Color:")} </span>
                    <span className="font-black text-black">{color || "............"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("اللوحة:", "Plate No:")} </span>
                    <span className="font-black text-black">{plateNumber || "............"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("رقم الهيكل (VIN):", "Chassis No:")} </span>
                    <span className="font-black text-black dir-ltr inline-block text-[11px] print:text-[9.5px]">{chassisNumber || "............"}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 print:gap-1 pt-0.5 border-t border-gray-300">
                  <div>
                    <span className="font-bold text-gray-700">{t("الرقم التسلسلي:", "Serial No:")} </span>
                    <span className="font-black text-black dir-ltr inline-block text-[11px] print:text-[9.5px]">{serialNumber || "............"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("العداد عند الاسترداد:", "Return Odometer:")} </span>
                    <span className="font-black text-black">{odometer ? `${odometer} كم` : "............"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("مستوى الوقود:", "Fuel Level:")} </span>
                    <span className="font-black text-black">{fuelLevel || "............"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("المفاتيح / الرخصة:", "Keys / Registration:")} </span>
                    <span className="font-black text-black text-[11px] print:text-[9.5px]">{keysCount} مفتاح | {registrationStatus}</span>
                  </div>
                </div>
              </div>

              {/* Vehicle Return Inspection Table */}
              <div className="mb-1.5 print:mb-1">
                <div className="flex flex-wrap justify-between items-center mb-0.5 border-b border-black pb-0.5">
                  <h3 className="font-black text-xs print:text-[10.5px] text-black">
                    {t("فحص ومعاينة المركبة وقت الاسترداد:", "Vehicle Inspection Checklist at Return:")}
                  </h3>
                  <div className="flex items-center gap-2 print:gap-1.5 text-xs print:text-[10px]">
                    <span className="font-bold text-gray-800">{t("الهيكل الخارجي:", "Exterior Body:")}</span>
                    <CustomBox
                      checked={returnExteriorCondition === "excellent"}
                      onClick={() => onSelectExteriorCondition && onSelectExteriorCondition("return", "excellent")}
                      labelAr="ممتازة"
                      labelEn="Excellent"
                      language={language}
                      size="sm"
                    />
                    <CustomBox
                      checked={returnExteriorCondition === "good"}
                      onClick={() => onSelectExteriorCondition && onSelectExteriorCondition("return", "good")}
                      labelAr="جيدة"
                      labelEn="Good"
                      language={language}
                      size="sm"
                    />
                    <CustomBox
                      checked={returnExteriorCondition === "remarks"}
                      onClick={() => onSelectExteriorCondition && onSelectExteriorCondition("return", "remarks")}
                      labelAr="ملاحظات"
                      labelEn="Remarks"
                      language={language}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mb-1">
                  <table className="w-full border-collapse border border-black text-xs print:text-[9.5px]">
                    <thead>
                      <tr className="bg-gray-100 font-bold border-b border-black">
                        <th className="border border-black p-0.5 px-1.5 text-right w-7/12">{t("موضع الفحص", "Part")}</th>
                        <th className="border border-black p-0.5 px-1.5 text-right w-5/12">{t("الحالة والملاحظة", "Condition")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnParts.slice(0, Math.ceil(returnParts.length / 2)).map((part) => (
                        <tr key={part.id}>
                          <td className="border border-black p-0.5 px-1.5 font-bold text-right bg-gray-50/50 leading-tight">
                            {isAr && part.nameAr}
                            {isEn && part.nameEn}
                            {isBoth && `${part.nameAr} / ${part.nameEn}`}
                          </td>
                          <td className="border border-black p-0.5 px-1.5 text-right font-medium leading-tight">{part.condition || "سليم"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <table className="w-full border-collapse border border-black text-xs print:text-[9.5px]">
                    <thead>
                      <tr className="bg-gray-100 font-bold border-b border-black">
                        <th className="border border-black p-0.5 px-1.5 text-right w-7/12">{t("موضع الفحص", "Part")}</th>
                        <th className="border border-black p-0.5 px-1.5 text-right w-5/12">{t("الحالة والملاحظة", "Condition")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnParts.slice(Math.ceil(returnParts.length / 2)).map((part) => (
                        <tr key={part.id}>
                          <td className="border border-black p-0.5 px-1.5 font-bold text-right bg-gray-50/50 leading-tight">
                            {isAr && part.nameAr}
                            {isEn && part.nameEn}
                            {isBoth && `${part.nameAr} / ${part.nameEn}`}
                          </td>
                          <td className="border border-black p-0.5 px-1.5 text-right font-medium leading-tight">{part.condition || "سليم"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Spare tire, Faults & Attachments */}
                <div className="border border-black rounded-sm p-1.5 print:p-1 bg-gray-50/60 text-xs print:text-[9.5px] space-y-1 print:space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2 print:gap-1.5">
                    <span className="font-extrabold text-black">{t("الاستبنة ومعدات تغيير الإطار:", "Spare Tire & Tools:")}</span>
                    <CustomBox
                      checked={returnSpareTire === "present"}
                      onClick={() => onSelectSpareTire && onSelectSpareTire("return", "present")}
                      labelAr="موجودة"
                      labelEn="Present"
                      language={language}
                      size="sm"
                    />
                    <CustomBox
                      checked={returnSpareTire === "not_present"}
                      onClick={() => onSelectSpareTire && onSelectSpareTire("return", "not_present")}
                      labelAr="غير موجودة"
                      labelEn="Not Present"
                      language={language}
                      size="sm"
                    />
                    <CustomBox
                      checked={returnSpareTire === "remarks"}
                      onClick={() => onSelectSpareTire && onSelectSpareTire("return", "remarks")}
                      labelAr="يوجد ملاحظات"
                      labelEn="Remarks"
                      language={language}
                      size="sm"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <span className="font-extrabold text-black block">{t("الأعطال أو المشاكل المرصودة عند الاسترداد:", "Recorded Issues / Damages at Return:")}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5 text-[10.5px] print:text-[9px]">
                      {returnFaults.map((fault) => (
                        <div key={fault.id} className="flex items-center gap-1">
                          <CustomBox
                            checked={fault.checked}
                            onClick={() => onToggleFault && onToggleFault("return", fault.id)}
                            language={language}
                            size="sm"
                          />
                          <span className={fault.checked ? "font-bold text-black" : "text-gray-600"}>{fault.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {returnVisibleScratches && (
                    <div className="text-[10px] print:text-[9px]">
                      <span className="font-extrabold text-black">{t("الخدوش أو التلفيات الظاهرة:", "Visible scratches / damages:")} </span>
                      <span className="font-medium text-gray-800">{returnVisibleScratches}</span>
                    </div>
                  )}

                  <div className="pt-0.5 border-t border-gray-300">
                    <span className="font-extrabold text-black ml-2">{t("مرفقات حالة وفحص الاسترداد:", "Recovery Condition Photos:")}</span>
                    <div className="inline-flex flex-wrap gap-2 print:gap-1.5 text-[10px] print:text-[9px] pt-0.5">
                      <CustomBox
                        checked={returnAttachments.front}
                        onClick={() => onToggleAttachment && onToggleAttachment("return", "front")}
                        labelAr="صور أمامية"
                        labelEn="Front"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={returnAttachments.rear}
                        onClick={() => onToggleAttachment && onToggleAttachment("return", "rear")}
                        labelAr="صور خلفية"
                        labelEn="Rear"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={returnAttachments.sides}
                        onClick={() => onToggleAttachment && onToggleAttachment("return", "sides")}
                        labelAr="صور الجانبين"
                        labelEn="Sides"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={returnAttachments.interior}
                        onClick={() => onToggleAttachment && onToggleAttachment("return", "interior")}
                        labelAr="صور الداخلية"
                        labelEn="Interior"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={returnAttachments.odometer}
                        onClick={() => onToggleAttachment && onToggleAttachment("return", "odometer")}
                        labelAr="صورة العداد"
                        labelEn="Odometer"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={returnAttachments.damages}
                        onClick={() => onToggleAttachment && onToggleAttachment("return", "damages")}
                        labelAr="صور التلفيات"
                        labelEn="Damages"
                        language={language}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recovery Acknowledgment */}
              <div className="border border-black rounded-sm p-1.5 print:p-1 bg-gray-50/90 text-xs print:text-[9.5px] leading-snug print:leading-tight space-y-0.5 mb-1.5 print:mb-1">
                <h4 className="font-black text-black underline text-xs print:text-[10px]">
                  {t("محضر وإقرار استرداد المركبة:", "Official Vehicle Recovery Report & Acknowledgment:")}
                </h4>
                {isBoth ? (
                  <div className="space-y-0.5">
                    <p className="text-gray-900 font-bold text-justify text-[10px] print:text-[8.5px] leading-snug print:leading-tight">
                      {`أقر أنا ممثل قسم الأسطول باسترداد المركبة الموضحة بياناتها أعلاه من المندوب، بالعداد والمواصفات والحالة المسجلة بعد المعاينة وحصر التلفيات والأعطال. ويقر المندوب بصحة الفحص المسجل ومطابقته لواقع المركبة الفعلي وقت التسليم للشركة. هذا المحضر لإثبات استرداد المركبة وتتم مراجعة الفروق مع محضر التسليم السابق لإنهاء الإجراءات.`}
                    </p>
                    <p className="text-gray-700 font-medium text-justify text-[9.5px] print:text-[8px] leading-snug print:leading-tight dir-ltr">
                      {`I, representative of the Fleet Department, acknowledge the return of the above-detailed vehicle from the rider with the recorded odometer reading, condition, and noted damages. The rider confirms the accuracy of this inspection report reflecting actual vehicle status at recovery. Discrepancies shall be cross-referenced with the initial handover report.`}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-900 font-bold text-justify text-[10.5px] print:text-[9px] leading-snug print:leading-tight">
                    {isAr
                      ? `أقر أنا ممثل قسم الأسطول باسترداد المركبة الموضحة بياناتها أعلاه من المندوب، بالعداد والمواصفات والحالة المسجلة بعد المعاينة وحصر التلفيات والأعطال. ويقر المندوب بصحة الفحص المسجل ومطابقته لواقع المركبة الفعلي وقت التسليم للشركة. هذا المحضر لإثبات استرداد المركبة وتتم مراجعة الفروق مع محضر التسليم السابق لإنهاء الإجراءات.`
                      : `I, representative of the Fleet Department, acknowledge the return of the above-detailed vehicle from the rider with the recorded odometer reading, condition, and noted damages. The rider confirms the accuracy of this inspection report reflecting actual vehicle status at recovery. Discrepancies shall be cross-referenced with the initial handover report.`}
                  </p>
                )}
              </div>

              {/* Signatures Table */}
              <table className="w-full border-collapse border border-black text-center text-xs print:text-[9.5px] font-semibold mb-0.5">
                <thead>
                  <tr className="bg-gray-100 font-black border-b border-black">
                    <th className="border border-black p-1 print:p-0.5 w-5/12">{t("المندوب المسلّم", "Returning Rider")}</th>
                    <th className="border border-black p-1 print:p-0.5 w-5/12">{t("ممثل قسم الأسطول المستلم", "Receiving Fleet Representative")}</th>
                    <th className="border border-black p-1 print:p-0.5 w-2/12">{t("بصمة المندوب", "Thumbprint")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-1 print:p-0.5 text-right align-top space-y-0.5">
                      <div><span className="font-bold text-gray-700">{t("الاسم:", "Name:")} </span>{riderName || "...................................."}</div>
                      <div className="pt-0.5"><span className="font-bold text-gray-700">{t("التوقيع:", "Signature:")} </span>....................................</div>
                    </td>
                    <td className="border border-black p-1 print:p-0.5 text-right align-top space-y-0.5">
                      <div><span className="font-bold text-gray-700">{t("الاسم:", "Name:")} </span>{companyRepName}</div>
                      <div><span className="font-bold text-gray-700">{t("الصفة:", "Title:")} </span>{companyRepTitle}</div>
                      <div className="pt-0.5"><span className="font-bold text-gray-700">{t("التوقيع والختم:", "Sign & Seal:")} </span>....................................</div>
                    </td>
                    <td className="border border-black p-0.5 align-middle text-center bg-gray-50/40">
                      <div className="w-12 h-12 print:w-11 print:h-11 border border-dashed border-gray-400 mx-auto flex items-center justify-center text-[8.5px] text-gray-500">
                        {t("موضع البصمة", "Thumbprint")}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <LetterheadFooter letterheadId={letterheadId} compact />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODEL 3: بنود سياسة قسم الأسطول (Fleet Department Policy Terms)           */}
      {/* ========================================================================= */}
      {selectedModels.fleetPolicy && (
        <>
          {/* PAGE 1: Terms 1 through splitIndex */}
          <div
            className={`relative bg-white text-black p-4 sm:p-6 print:p-2.5 print:py-2 rounded-xl border-2 border-black font-sans leading-normal print:leading-tight shadow-xs min-h-[960px] print:min-h-[275mm] flex flex-col justify-between overflow-visible print:overflow-visible print-page-flow ${selectedModels.handover || selectedModels.returnVehicle ? "print:break-before-page" : ""
              }`}
          >
            <LetterheadWatermark letterheadId={letterheadId} />

            <div className="relative z-10 flex-1 flex flex-col justify-between">
              <div>
                {/* Header */}
                <LetterheadHeader
                  letterheadId={letterheadId}
                  companyName={companyName}
                  date={date}
                  refNo={recordNumber}
                  compact
                />

                {/* Title Section */}
                <div className="text-center pt-1 pb-1 print:py-0.5 border-b border-black mb-1.5 print:mb-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <Shield className="w-4 h-4 text-black print:hidden" />
                    <h1 className="text-base sm:text-lg print:text-[13.5px] font-black text-black tracking-wide leading-tight">
                      {isAr && (policyTerms.length > 7 ? "بنود سياسة قسم الأسطول (الجزء الأول)" : "بنود سياسة قسم الأسطول")}
                      {isEn && (policyTerms.length > 7 ? "Fleet Department Policy Terms (Part 1)" : "Fleet Department Policy Terms")}
                      {isBoth && (
                        <div className="space-y-0.5">
                          <div>{policyTerms.length > 7 ? "بنود سياسة قسم الأسطول (الجزء الأول)" : "بنود سياسة قسم الأسطول"}</div>
                          <div className="text-xs print:text-[10px] font-bold text-gray-700 dir-ltr">
                            {policyTerms.length > 7 ? "Fleet Policy Terms & Regulations (Part 1)" : "Fleet Policy Terms & Regulations"}
                          </div>
                        </div>
                      )}
                    </h1>
                  </div>

                  <div className="mt-0.5 text-xs print:text-[9.5px] font-extrabold text-gray-900 flex justify-between items-center bg-gray-100 p-1 print:py-0.5 rounded-sm border border-gray-400">
                    <span>{companyName}</span>
                    <span>{t("تاريخ الإقرار:", "Date:")} <b className="text-black">{resolvedDate}</b></span>
                  </div>
                </div>

                {/* Terms List (Page 1) */}
                <div className="space-y-1 print:space-y-0.5 mb-1.5 print:mb-1 text-xs print:text-[9.5px]">
                  {policyPage1Terms.map((term, index) => (
                    <div
                      key={term.id}
                      onClick={() => onTogglePolicyTerm && onTogglePolicyTerm(term.id)}
                      className={`p-1 print:p-0.5 px-1.5 print:px-1 border rounded-sm transition-colors cursor-pointer flex items-start gap-1.5 print:gap-1 ${term.selected
                          ? "border-black bg-gray-50/60 print:bg-transparent"
                          : "border-gray-300 opacity-60 bg-gray-100/40"
                        }`}
                    >
                      <div className="pt-0.5 shrink-0">
                        <CustomBox
                          checked={term.selected}
                          language={language}
                          size="sm"
                        />
                      </div>
                      <div className="flex-1 font-semibold text-gray-900 leading-snug print:leading-tight">
                        <span className="font-bold text-black ml-1">({index + 1})</span>
                        {isAr && term.textAr}
                        {isEn && term.textEn}
                        {isBoth && (
                          <div className="space-y-0.5">
                            <div className="text-black font-bold">{term.textAr}</div>
                            <div className="text-[10px] print:text-[8.5px] text-gray-700 font-medium dir-ltr">{term.textEn}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* If policyTerms <= 7, render Acknowledgment & Signatures right on Page 1 */}
                {policyTerms.length <= 7 && (
                  <>
                    <div className="border border-black rounded-sm p-1.5 print:p-1 bg-gray-50/90 text-xs print:text-[9.5px] leading-snug print:leading-tight space-y-0.5 mb-1.5 print:mb-1">
                      <h4 className="font-black text-black underline text-xs print:text-[10px]">
                        {t("إقرار بالاطلاع والالتزام:", "Acknowledgment of Review & Compliance:")}
                      </h4>
                      {isBoth ? (
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-gray-900 text-[10px] print:text-[8.5px] leading-snug print:leading-tight">
                            {`أقر بأنني اطلعت على كافة بنود سياسة قسم الأسطول الواردة أعلاه (${policyTerms.length} بنداً) وفهمت مضمونها بالكامل، وأتعهد بالالتزام التام بكافة ما ورد فيها دون أي إخلال.`}
                          </p>
                          <p className="font-medium text-gray-700 text-[9.5px] print:text-[8px] leading-snug print:leading-tight dir-ltr">
                            {`I acknowledge that I have read all ${policyTerms.length} policy terms set forth above, fully understood their content, and undertake to strictly comply with all provisions without violation.`}
                          </p>
                        </div>
                      ) : (
                        <p className="font-extrabold text-gray-900 text-[10.5px] print:text-[9px] leading-snug print:leading-tight">
                          {isAr
                            ? `أقر بأنني اطلعت على كافة بنود سياسة قسم الأسطول الواردة أعلاه (${policyTerms.length} بنداً) وفهمت مضمونها بالكامل، وأتعهد بالالتزام التام بكافة ما ورد فيها دون أي إخلال.`
                            : `I acknowledge that I have read all ${policyTerms.length} policy terms set forth above, fully understood their content, and undertake to strictly comply with all provisions without violation.`}
                        </p>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 print:gap-1 pt-0.5 border-t border-gray-400 text-xs print:text-[9.5px] font-semibold">
                        <div>
                          <span className="font-bold text-gray-700">{t("الاسم:", "Name:")} </span>
                          <span className="font-black text-black">{riderName || "...................................."}</span>
                        </div>
                        <div>
                          <span className="font-bold text-gray-700">{t("الجنسية:", "Nationality:")} </span>
                          <span className="font-black text-black">{nationality || "...................."}</span>
                        </div>
                        <div>
                          <span className="font-bold text-gray-700">{t("رقم الهوية / الإقامة:", "ID / Iqama No:")} </span>
                          <span className="font-black text-black dir-ltr inline-block">{iqamaNo || "...................."}</span>
                        </div>
                      </div>
                    </div>

                    <table className="w-full border-collapse border border-black text-center text-xs print:text-[9.5px] font-semibold mb-0.5">
                      <thead>
                        <tr className="bg-gray-100 font-black border-b border-black">
                          <th className="border border-black p-1 print:p-0.5 w-8/12">{t("توقيع وإقرار المندوب", "Rider Signature & Undertaking")}</th>
                          <th className="border border-black p-1 print:p-0.5 w-4/12">{t("بصمة المندوب", "Rider Thumbprint")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-black p-1 print:p-0.5 text-right align-top space-y-0.5">
                            <div className="grid grid-cols-2 gap-1.5 print:gap-1">
                              <div>
                                <span className="font-bold text-gray-700">{t("الجوال:", "Mobile:")} </span>
                                <span className="font-black text-black dir-ltr inline-block">{mobile || "...................."}</span>
                              </div>
                              <div>
                                <span className="font-bold text-gray-700">{t("التاريخ:", "Date:")} </span>
                                <span className="font-black text-black">{resolvedDate}</span>
                              </div>
                            </div>
                            <div className="pt-0.5">
                              <span className="font-bold text-gray-700">{t("التوقيع:", "Signature:")} </span>
                              ........................................................
                            </div>
                          </td>
                          <td className="border border-black p-0.5 align-middle text-center bg-gray-50/40">
                            <div className="w-12 h-12 print:w-11 print:h-11 border border-dashed border-gray-400 mx-auto flex items-center justify-center text-[8.5px] text-gray-500">
                              {t("موضع البصمة", "Thumbprint")}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </>
                )}

                {/* Continuation note when terms span across 2 pages */}
                {policyTerms.length > 7 && (
                  <div className="text-center p-1 print:p-0.5 bg-gray-100 border border-gray-400 rounded-xs text-[10.5px] print:text-[9px] font-bold text-gray-800">
                    {t(
                      `← تتمة بنود سياسة قسم الأسطول (البنود ${policyPage1Terms.length + 1} - ${policyTerms.length}) وإقرار الالتزام والتوقيع في الصفحة التالية (2/2)`,
                      `← Continued on next page (2/2): Policy terms (${policyPage1Terms.length + 1} - ${policyTerms.length}), undertaking acknowledgment, and signatures`
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <LetterheadFooter letterheadId={letterheadId} compact />
            </div>
          </div>

          {/* PAGE 2: Terms (splitIndex + 1) through end + Legal Acknowledgment & Signatures */}
          {policyTerms.length > 7 && (
            <div className="relative bg-white text-black p-4 sm:p-6 print:p-2.5 print:py-2 rounded-xl border-2 border-black font-sans leading-normal print:leading-tight shadow-xs min-h-[960px] print:min-h-[275mm] flex flex-col justify-between overflow-visible print:overflow-visible print-page-flow print:break-before-page">
              <LetterheadWatermark letterheadId={letterheadId} />

              <div className="relative z-10 flex-1 flex flex-col justify-between">
                <div>
                  {/* Header */}
                  <LetterheadHeader
                    letterheadId={letterheadId}
                    companyName={companyName}
                    date={date}
                    refNo={recordNumber}
                    compact
                  />

                  {/* Title Section (Continued) */}
                  <div className="text-center pt-1 pb-1 print:py-0.5 border-b border-black mb-1.5 print:mb-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <Shield className="w-4 h-4 text-black print:hidden" />
                      <h1 className="text-base sm:text-lg print:text-[13.5px] font-black text-black tracking-wide leading-tight">
                        {isAr && "بنود سياسة قسم الأسطول (الجزء الثاني - تابع)"}
                        {isEn && "Fleet Department Policy Terms (Part 2 - Continued)"}
                        {isBoth && (
                          <div className="space-y-0.5">
                            <div>بنود سياسة قسم الأسطول (الجزء الثاني - تابع)</div>
                            <div className="text-xs print:text-[10px] font-bold text-gray-700 dir-ltr">
                              Fleet Policy Terms & Regulations (Part 2 - Continued)
                            </div>
                          </div>
                        )}
                      </h1>
                    </div>

                    <div className="mt-0.5 text-xs print:text-[9.5px] font-extrabold text-gray-900 flex justify-between items-center bg-gray-100 p-1 print:py-0.5 rounded-sm border border-gray-400">
                      <span>{companyName}</span>
                      <span>{t("تاريخ الإقرار:", "Date:")} <b className="text-black">{resolvedDate}</b></span>
                    </div>
                  </div>

                  {/* Terms List (Page 2) */}
                  <div className="space-y-1 print:space-y-0.5 mb-1.5 print:mb-1 text-xs print:text-[9.5px]">
                    {policyPage2Terms.map((term, index) => (
                      <div
                        key={term.id}
                        onClick={() => onTogglePolicyTerm && onTogglePolicyTerm(term.id)}
                        className={`p-1 print:p-0.5 px-1.5 print:px-1 border rounded-sm transition-colors cursor-pointer flex items-start gap-1.5 print:gap-1 ${term.selected
                            ? "border-black bg-gray-50/60 print:bg-transparent"
                            : "border-gray-300 opacity-60 bg-gray-100/40"
                          }`}
                      >
                        <div className="pt-0.5 shrink-0">
                          <CustomBox
                            checked={term.selected}
                            language={language}
                            size="sm"
                          />
                        </div>
                        <div className="flex-1 font-semibold text-gray-900 leading-snug print:leading-tight">
                          <span className="font-bold text-black ml-1">({policyPage1Terms.length + index + 1})</span>
                          {isAr && term.textAr}
                          {isEn && term.textEn}
                          {isBoth && (
                            <div className="space-y-0.5">
                              <div className="text-black font-bold">{term.textAr}</div>
                              <div className="text-[10px] print:text-[8.5px] text-gray-700 font-medium dir-ltr">{term.textEn}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* إقرار بالاطلاع (Policy Acknowledgment) */}
                  <div className="border border-black rounded-sm p-1.5 print:p-1 bg-gray-50/90 text-xs print:text-[9.5px] leading-snug print:leading-tight space-y-0.5 mb-1.5 print:mb-1">
                    <h4 className="font-black text-black underline text-xs print:text-[10px]">
                      {t("إقرار بالاطلاع والالتزام:", "Acknowledgment of Review & Compliance:")}
                    </h4>
                    {isBoth ? (
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-gray-900 text-[10px] print:text-[8.5px] leading-snug print:leading-tight">
                          {`أقر بأنني اطلعت على كافة بنود سياسة قسم الأسطول الواردة أعلاه (${policyTerms.length} بنداً) وفهمت مضمونها بالكامل، وأتعهد بالالتزام التام بكافة ما ورد فيها دون أي إخلال.`}
                        </p>
                        <p className="font-medium text-gray-700 text-[9.5px] print:text-[8px] leading-snug print:leading-tight dir-ltr">
                          {`I acknowledge that I have read all ${policyTerms.length} policy terms set forth above, fully understood their content, and undertake to strictly comply with all provisions without violation.`}
                        </p>
                      </div>
                    ) : (
                      <p className="font-extrabold text-gray-900 text-[10.5px] print:text-[9px] leading-snug print:leading-tight">
                        {isAr
                          ? `أقر بأنني اطلعت على كافة بنود سياسة قسم الأسطول الواردة أعلاه (${policyTerms.length} بنداً) وفهمت مضمونها بالكامل، وأتعهد بالالتزام التام بكافة ما ورد فيها دون أي إخلال.`
                          : `I acknowledge that I have read all ${policyTerms.length} policy terms set forth above, fully understood their content, and undertake to strictly comply with all provisions without violation.`}
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 print:gap-1 pt-0.5 border-t border-gray-400 text-xs print:text-[9.5px] font-semibold">
                      <div>
                        <span className="font-bold text-gray-700">{t("الاسم:", "Name:")} </span>
                        <span className="font-black text-black">{riderName || "...................................."}</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-700">{t("الجنسية:", "Nationality:")} </span>
                        <span className="font-black text-black">{nationality || "...................."}</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-700">{t("رقم الهوية / الإقامة:", "ID / Iqama No:")} </span>
                        <span className="font-black text-black dir-ltr inline-block">{iqamaNo || "...................."}</span>
                      </div>
                    </div>
                  </div>

                  {/* Policy Signatures */}
                  <table className="w-full border-collapse border border-black text-center text-xs print:text-[9.5px] font-semibold mb-0.5">
                    <thead>
                      <tr className="bg-gray-100 font-black border-b border-black">
                        <th className="border border-black p-1 print:p-0.5 w-8/12">{t("توقيع وإقرار المندوب", "Rider Signature & Undertaking")}</th>
                        <th className="border border-black p-1 print:p-0.5 w-4/12">{t("بصمة المندوب", "Rider Thumbprint")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black p-1 print:p-0.5 text-right align-top space-y-0.5">
                          <div className="grid grid-cols-2 gap-1.5 print:gap-1">
                            <div>
                              <span className="font-bold text-gray-700">{t("الجوال:", "Mobile:")} </span>
                              <span className="font-black text-black dir-ltr inline-block">{mobile || "...................."}</span>
                            </div>
                            <div>
                              <span className="font-bold text-gray-700">{t("التاريخ:", "Date:")} </span>
                              <span className="font-black text-black">{resolvedDate}</span>
                            </div>
                          </div>
                          <div className="pt-0.5">
                            <span className="font-bold text-gray-700">{t("التوقيع:", "Signature:")} </span>
                            ........................................................
                          </div>
                        </td>
                        <td className="border border-black p-0.5 align-middle text-center bg-gray-50/40">
                          <div className="w-12 h-12 print:w-11 print:h-11 border border-dashed border-gray-400 mx-auto flex items-center justify-center text-[8.5px] text-gray-500">
                            {t("موضع البصمة", "Thumbprint")}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <LetterheadFooter letterheadId={letterheadId} compact />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
