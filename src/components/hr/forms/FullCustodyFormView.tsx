import React from "react";
import { Check, CheckSquare, Square, Car, Shield, RotateCcw, AlertTriangle, FileCheck, CheckCircle2 } from "lucide-react";
import { LetterheadHeader, LetterheadFooter, LetterheadWatermark, LetterheadId } from "./LetterheadHeader";

export interface CustodyItemHandover {
  id: string;
  selected: boolean;
  nameAr: string;
  nameEn: string;
  quantity: string | number;
  unitPrice: string | number;
  condition: string;
}

export interface CustodyItemReturn {
  id: string;
  selected: boolean;
  nameAr: string;
  nameEn: string;
  unitPrice: string | number;
  originalQty: string | number;
  returnedQty: string | number;
  missingQty: string | number;
}

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

export interface FullCustodyFormData {
  // Model selection (which of the 3 to print)
  selectedModels: {
    handover: boolean;
    returnCustody: boolean;
    fleetPolicy: boolean;
  };
  language: "ar" | "en" | "both";

  // General & Letterhead info
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
  handoverItems: CustodyItemHandover[];
  handoverCustodyNotes?: string;
  handoverExteriorCondition: "excellent" | "good" | "remarks";
  handoverParts: VehicleInspectionPart[];
  handoverSpareTire: "present" | "not_present" | "remarks";
  handoverFaults: { id: number; checked: boolean; text: string }[];
  handoverVisibleScratches?: string;
  handoverAttachments: {
    front: boolean;
    rear: boolean;
    sides: boolean;
    interior: boolean;
    odometer: boolean;
    damages: boolean;
  };

  // Model 2: Return
  returnItems: CustodyItemReturn[];
  returnCustodyNotes?: string;
  returnExteriorCondition: "excellent" | "good" | "remarks";
  returnParts: VehicleInspectionPart[];
  returnSpareTire: "present" | "not_present" | "remarks";
  returnFaults: { id: number; checked: boolean; text: string }[];
  returnVisibleScratches?: string;
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

  // Interactive callbacks
  onToggleModel?: (model: "handover" | "returnCustody" | "fleetPolicy") => void;
  onToggleHandoverItem?: (id: string) => void;
  onToggleReturnItem?: (id: string) => void;
  onTogglePolicyTerm?: (id: number) => void;
  onToggleAttachment?: (type: "handover" | "return", key: string) => void;
  onToggleFault?: (type: "handover" | "return", id: number) => void;
  onSelectExteriorCondition?: (type: "handover" | "return", val: "excellent" | "good" | "remarks") => void;
  onSelectSpareTire?: (type: "handover" | "return", val: "present" | "not_present" | "remarks") => void;
}

export const INITIAL_CUSTODY_ITEMS: { id: string; nameAr: string; nameEn: string; unitPrice: string | number; defaultSelected: boolean; defaultQty: number; defaultCondition: string }[] = [
  { id: "phone", nameAr: "هاتف جوال", nameEn: "Mobile Phone", unitPrice: 800, defaultSelected: true, defaultQty: 1, defaultCondition: "ممتازة وسليم" },
  { id: "car_charger", nameAr: "شاحن سيارة بمنفذي USB", nameEn: "Dual USB Car Charger", unitPrice: 100, defaultSelected: true, defaultQty: 1, defaultCondition: "جديد وسليم" },
  { id: "phone_holder", nameAr: "قاعدة جوال", nameEn: "Phone Mount / Holder", unitPrice: 100, defaultSelected: true, defaultQty: 1, defaultCondition: "سليم" },
  { id: "charging_cable", nameAr: "سلك شحن جوال", nameEn: "Phone Charging Cable", unitPrice: 50, defaultSelected: true, defaultQty: 1, defaultCondition: "جديد" },
  { id: "sim_card", nameAr: "شريحة اتصال وبيانات", nameEn: "Mobile SIM & Data Card", unitPrice: 250, defaultSelected: true, defaultQty: 1, defaultCondition: "نشطة وجاهزة" },
  { id: "camera", nameAr: "كاميرا EZVIZ", nameEn: "EZVIZ Security Camera", unitPrice: 350, defaultSelected: false, defaultQty: 1, defaultCondition: "جديدة بالكرتون" },
  { id: "car", nameAr: "سيارة", nameEn: "Company Car", unitPrice: "تُحدد", defaultSelected: true, defaultQty: 1, defaultCondition: "سليمة ومفحوصة" },
  { id: "helmet", nameAr: "خوذة", nameEn: "Safety Helmet", unitPrice: 200, defaultSelected: false, defaultQty: 1, defaultCondition: "مطابقة للمواصفات" },
  { id: "bike_box", nameAr: "صندوق دراجة نارية", nameEn: "Motorcycle Box", unitPrice: 100, defaultSelected: false, defaultQty: 1, defaultCondition: "سليم" },
  { id: "delivery_bag", nameAr: "حقيبة توصيل", nameEn: "Thermal Delivery Bag", unitPrice: 150, defaultSelected: true, defaultQty: 1, defaultCondition: "جديدة معتمدة" },
  { id: "tshirt", nameAr: "تيشيرت", nameEn: "Uniform T-Shirt", unitPrice: 75, defaultSelected: true, defaultQty: 2, defaultCondition: "جديد" },
  { id: "pants", nameAr: "بنطلون", nameEn: "Uniform Pants", unitPrice: 70, defaultSelected: true, defaultQty: 2, defaultCondition: "جديد" },
  { id: "shoes", nameAr: "حذاء", nameEn: "Work Shoes", unitPrice: 100, defaultSelected: true, defaultQty: 1, defaultCondition: "جديد" },
  { id: "safety", nameAr: "سيفتي", nameEn: "Safety Shoes / Gear", unitPrice: 200, defaultSelected: false, defaultQty: 1, defaultCondition: "مطابق" },
  { id: "vest", nameAr: "صدرية", nameEn: "Reflective Vest", unitPrice: 150, defaultSelected: true, defaultQty: 1, defaultCondition: "سليمة" },
  { id: "motorcycle", nameAr: "دراجة نارية", nameEn: "Motorcycle", unitPrice: "تُحدد", defaultSelected: false, defaultQty: 1, defaultCondition: "سليمة وجاهزة" },
];

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

// Helper Checkbox Component with high-contrast print style
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
  const boxDimension = size === "sm" ? "w-4 h-4 text-xs" : "w-5 h-5 text-sm";
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 select-none ${isClickable ? "cursor-pointer hover:opacity-80" : ""} ${className}`}
    >
      <div
        className={`${boxDimension} border-2 border-black rounded-xs flex items-center justify-center font-black transition-colors ${
          checked ? "bg-black text-white print:bg-black print:text-white" : "bg-white text-transparent print:bg-white"
        }`}
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        {checked && <Check size={size === "sm" ? 12 : 14} strokeWidth={3.5} className="text-white" />}
      </div>
      {(labelAr || labelEn) && (
        <span className="font-bold text-gray-900 leading-tight">
          {language === "ar" && labelAr}
          {language === "en" && (labelEn || labelAr)}
          {language === "both" && (
            <span>
              {labelAr} {labelEn && <span className="text-[11px] font-medium text-gray-700 dir-ltr">({labelEn})</span>}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

export function FullCustodyFormView({ data }: { data: FullCustodyFormData }) {
  const {
    selectedModels = { handover: true, returnCustody: false, fleetPolicy: true },
    language = "both",
    letterheadId = "commercial",
    companyName = "مؤسسة البوابة المقبلة للتجارة",
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
    handoverItems = [],
    handoverCustodyNotes = "",
    handoverExteriorCondition = "excellent",
    handoverParts = [],
    handoverSpareTire = "present",
    handoverFaults = [],
    handoverVisibleScratches = "",
    handoverAttachments = { front: true, rear: true, sides: true, interior: true, odometer: true, damages: false },
    returnItems = [],
    returnCustodyNotes = "",
    returnExteriorCondition = "good",
    returnParts = [],
    returnSpareTire = "present",
    returnFaults = [],
    returnVisibleScratches = "",
    returnAttachments = { front: true, rear: true, sides: true, interior: true, odometer: true, damages: false },
    policyTerms = [],
    companyRepName = "مسؤول قسم الأسطول والتشغيل",
    companyRepTitle = "مشرف الأسطول والعهد",
    onToggleModel,
    onToggleHandoverItem,
    onToggleReturnItem,
    onTogglePolicyTerm,
    onToggleAttachment,
    onToggleFault,
    onSelectExteriorCondition,
    onSelectSpareTire,
  } = data;

  const resolvedDate = date || ".... / .... / ........";

  // Check if at least one model is selected
  const hasAnyModelSelected = selectedModels.handover || selectedModels.returnCustody || selectedModels.fleetPolicy;

  // Bilingual / Arabic / English Helpers
  const isAr = language === "ar";
  const isEn = language === "en";
  const isBoth = language === "both";

  const t = (ar: string, en: string) => {
    if (isAr) return ar;
    if (isEn) return en;
    return `${ar} / ${en}`;
  };

  return (
    <div className="space-y-6 print:space-y-0" dir={isEn ? "ltr" : "rtl"}>
      {/* Top Warning Banner if NO model selected */}
      {!hasAnyModelSelected && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg text-amber-900 text-center font-bold">
          ⚠️ يرجى تحديد نموذج واحد على الأقل من النماذج الثلاثة أدناه للطباعة أو المعاينة.
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODEL 1: نموذج تسليم مركبة وعهدة للمندوب (Vehicle & Custody Handover)    */}
      {/* ========================================================================= */}
      {selectedModels.handover && (
        <div className="relative bg-white text-black p-5 sm:p-7 print:p-3.5 print:py-3 rounded-xl border-2 border-black font-sans leading-relaxed shadow-xs min-h-[960px] flex flex-col justify-between overflow-hidden print-page-frame">
          <LetterheadWatermark letterheadId={letterheadId} />

          <div className="relative z-10 flex-1 flex flex-col justify-between">
            <div>
              {/* Header */}
              <LetterheadHeader
                letterheadId={letterheadId}
                companyName={companyName}
                date={date}
                refNo={recordNumber}
              />

              {/* Title Section */}
              <div className="text-center pt-2 pb-2 border-b-2 border-black mb-3">
                <div className="flex items-center justify-center gap-2">
                  <Car className="w-6 h-6 text-black print:hidden" />
                  <h1 className="text-xl sm:text-2xl font-black text-black tracking-wide">
                    {isAr && "نموذج تسليم مركبة وعهدة للمندوب"}
                    {isEn && "Vehicle & Custody Handover Form to Rider"}
                    {isBoth && (
                      <div className="space-y-0.5">
                        <div>نموذج تسليم مركبة وعهدة للمندوب</div>
                        <div className="text-sm sm:text-base font-bold text-gray-700 dir-ltr">
                          Vehicle & Custody Handover Form to Rider
                        </div>
                      </div>
                    )}
                  </h1>
                </div>

                {/* Subtitle Line */}
                <div className="mt-1 text-xs sm:text-sm font-extrabold text-gray-900 flex flex-wrap justify-between items-center gap-2 bg-gray-100 p-1.5 rounded-sm border border-gray-400">
                  <span>{t("رقم المحضر:", "Record No:")} <b className="text-black">{recordNumber}</b></span>
                  <span>{t("التاريخ:", "Date:")} <b className="text-black">{resolvedDate}</b></span>
                  <span>{t("الوقت:", "Time:")} <b className="text-black">{time || "........"}</b></span>
                  <span>{t("الفرع:", "Branch:")} <b className="text-black">{branch || "المركز الرئيسي"}</b></span>
                </div>
              </div>

              {/* Acknowledgment Header Notice */}
              <div className="text-center bg-gray-50 border border-black rounded-sm py-1 px-2 mb-2.5">
                <p className="font-black text-xs sm:text-sm text-black">
                  {t(
                    `إقرار استلام العهدة من ${companyName}`,
                    `Custody Receipt Acknowledgment from ${companyName}`
                  )}
                </p>
              </div>

              {/* Rider Details Grid */}
              <div className="border border-black rounded-sm p-2 bg-gray-50/70 text-xs sm:text-[13px] font-semibold mb-2.5 space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  <div>
                    <span className="font-bold text-gray-700">{t("اسم المندوب:", "Rider Name:")} </span>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 border-t border-gray-300">
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
              <div className="border border-black rounded-sm p-2 bg-gray-50/70 text-xs sm:text-[12.5px] font-semibold mb-2.5 space-y-1">
                <div className="font-black text-black border-b border-black pb-0.5 text-xs flex justify-between items-center">
                  <span>{t("بيانات المركبة إن شملتها العهدة:", "Vehicle Details (if included in custody):")}</span>
                  <span className="text-[11px] font-medium text-gray-600">{vehicleType}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
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
                    <span className="font-bold text-gray-700">{t("رقم الهيكل:", "Chassis No:")} </span>
                    <span className="font-black text-black dir-ltr inline-block text-[11px]">{chassisNumber || "............"}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 border-t border-gray-300">
                  <div>
                    <span className="font-bold text-gray-700">{t("الرقم التسلسلي:", "Serial No:")} </span>
                    <span className="font-black text-black dir-ltr inline-block text-[11px]">{serialNumber || "............"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("العداد:", "Odometer:")} </span>
                    <span className="font-black text-black">{odometer ? `${odometer} كم` : "............"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("الوقود:", "Fuel Level:")} </span>
                    <span className="font-black text-black">{fuelLevel || "............"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("المفاتيح / الرخصة:", "Keys / Registration:")} </span>
                    <span className="font-black text-black">{keysCount} مفتاح | {registrationStatus}</span>
                  </div>
                </div>
              </div>

              {/* بيان العهدة المسلّمة (Delivered Custody Table) */}
              <div className="mb-2.5">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-black text-xs sm:text-sm text-black border-r-4 border-black pr-1.5">
                    {t("بيان العهدة المسلّمة:", "Delivered Custody Statement:")}
                  </h3>
                  <span className="text-[10.5px] text-gray-700 font-bold">
                    {t("(حدد الأصناف المسلمة فعلياً)", "(Check actual delivered items)")}
                  </span>
                </div>
                <table className="w-full border-collapse border border-black text-center text-xs print:text-[11px]">
                  <thead>
                    <tr className="bg-gray-100 font-black border-b border-black">
                      <th className="border border-black p-1 w-8 sm:w-10">✓</th>
                      <th className="border border-black p-1 text-right pr-2">{t("الصنف", "Item Description")}</th>
                      <th className="border border-black p-1 w-14 sm:w-16">{t("عدد", "Qty")}</th>
                      <th className="border border-black p-1 w-20 sm:w-24">{t("الوحدة (ريال)", "Unit (SAR)")}</th>
                      <th className="border border-black p-1 text-right pr-2">{t("الحالة", "Condition")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {handoverItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50/80 transition-colors ${item.selected ? "bg-amber-50/40 print:bg-transparent font-bold" : "opacity-70 text-gray-600 font-normal"}`}
                      >
                        <td className="border border-black p-1 text-center">
                          <CustomBox
                            checked={item.selected}
                            onClick={() => onToggleHandoverItem && onToggleHandoverItem(item.id)}
                            language={language}
                            size="sm"
                          />
                        </td>
                        <td className="border border-black p-1 text-right pr-2">
                          <span className={item.selected ? "font-black text-black" : ""}>
                            {isAr && item.nameAr}
                            {isEn && item.nameEn}
                            {isBoth && `${item.nameAr} / ${item.nameEn}`}
                          </span>
                        </td>
                        <td className="border border-black p-1">{item.quantity}</td>
                        <td className="border border-black p-1 font-semibold">{item.unitPrice}</td>
                        <td className="border border-black p-1 text-right pr-2">{item.condition}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[10px] sm:text-[10.5px] font-bold text-gray-800 mt-1 leading-snug">
                  {t(
                    "تُحدد الأصناف الفعلية بالمربعات، وتُسجل الكميات والحالة فقط. القيم تقديرية للوحدة، وليست خصمًا تلقائيًا. قيمة السيارة أو الدراجة النارية تُحدد من سجل المركبة الفعلية.",
                    "Actual items are indicated with checkboxes; only quantities and conditions are recorded. Values are estimated per unit and are not an automatic deduction. Vehicle value is determined from the official asset record."
                  )}
                </p>
                {handoverCustodyNotes && (
                  <p className="text-xs font-semibold text-gray-900 mt-0.5">
                    <b>{t("حالة العهدة وملاحظاتها:", "Custody condition & notes:")}</b> {handoverCustodyNotes}
                  </p>
                )}
              </div>

              {/* فحص المركبة وقت الاستلام (Vehicle Inspection Table) */}
              <div className="mb-2.5">
                <div className="flex flex-wrap justify-between items-center mb-1 border-b border-black pb-0.5">
                  <h3 className="font-black text-xs sm:text-sm text-black">
                    {t("فحص المركبة وقت الاستلام:", "Vehicle Inspection at Handover:")}
                  </h3>
                  {/* Exterior Body Checkboxes */}
                  <div className="flex items-center gap-3 text-xs">
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

                {/* Grid of Parts Inspection */}
                <table className="w-full border-collapse border border-black text-xs print:text-[11px] mb-1.5">
                  <thead>
                    <tr className="bg-gray-100 font-bold border-b border-black">
                      <th className="border border-black p-1 text-right pr-2 w-1/3 sm:w-1/4">{t("موضع الفحص", "Inspection Area")}</th>
                      <th className="border border-black p-1 text-right pr-2">{t("الحالة أو الملاحظة", "Condition / Remarks")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {handoverParts.map((part) => (
                      <tr key={part.id}>
                        <td className="border border-black p-1 font-bold text-right pr-2 bg-gray-50/50">
                          {isAr && part.nameAr}
                          {isEn && part.nameEn}
                          {isBoth && `${part.nameAr} / ${part.nameEn}`}
                        </td>
                        <td className="border border-black p-1 text-right pr-2 font-medium">{part.condition || "سليم"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Spare tire & attachments */}
                <div className="border border-black rounded-sm p-2 bg-gray-50/60 text-xs space-y-1.5">
                  <div className="flex flex-wrap items-center gap-3">
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

                  {/* Faults List */}
                  <div className="space-y-1">
                    <span className="font-extrabold text-black block">{t("الأعطال أو المشاكل الموجودة:", "Existing Faults or Issues:")}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                      {handoverFaults.map((fault) => (
                        <div key={fault.id} className="flex items-center gap-1.5">
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

                  {/* Visible scratches */}
                  {handoverVisibleScratches && (
                    <div className="text-[11px]">
                      <span className="font-extrabold text-black">{t("الخدوش أو التلفيات الظاهرة:", "Visible scratches / damages:")} </span>
                      <span className="font-medium text-gray-800">{handoverVisibleScratches}</span>
                    </div>
                  )}

                  {/* Attachments */}
                  <div className="pt-1 border-t border-gray-300">
                    <span className="font-extrabold text-black ml-2">{t("مرفقات حالة المركبة:", "Condition Attachments:")}</span>
                    <div className="inline-flex flex-wrap gap-2.5 sm:gap-4 text-[11px] pt-0.5">
                      <CustomBox
                        checked={handoverAttachments.front}
                        onClick={() => onToggleAttachment && onToggleAttachment("handover", "front")}
                        labelAr="صور أمامية"
                        labelEn="Front Photos"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={handoverAttachments.rear}
                        onClick={() => onToggleAttachment && onToggleAttachment("handover", "rear")}
                        labelAr="صور خلفية"
                        labelEn="Rear Photos"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={handoverAttachments.sides}
                        onClick={() => onToggleAttachment && onToggleAttachment("handover", "sides")}
                        labelAr="صور الجانبين"
                        labelEn="Sides Photos"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={handoverAttachments.interior}
                        onClick={() => onToggleAttachment && onToggleAttachment("handover", "interior")}
                        labelAr="صور الداخلية"
                        labelEn="Interior Photos"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={handoverAttachments.odometer}
                        onClick={() => onToggleAttachment && onToggleAttachment("handover", "odometer")}
                        labelAr="صورة العداد"
                        labelEn="Odometer Photo"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={handoverAttachments.damages}
                        onClick={() => onToggleAttachment && onToggleAttachment("handover", "damages")}
                        labelAr="صور الأعطال والتلفيات"
                        labelEn="Damages Photos"
                        language={language}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* الإقرار والتعهد (Handover Acknowledgment) */}
              <div className="border border-black rounded-sm p-2.5 bg-gray-50/90 text-[11px] sm:text-xs leading-relaxed space-y-1 mb-3">
                <h4 className="font-black text-black underline text-xs sm:text-sm">
                  {t("الإقرار والتعهد:", "Acknowledgment & Legal Undertaking:")}
                </h4>
                <p className="text-gray-900 font-semibold text-justify">
                  {t(
                    `أقر باستلام الأصناف المؤشر عليها فقط بالكميات والحالات المسجلة من ${companyName}. وفي حال استلام مركبة، أقر بمعاينتها وإثبات الأعطال والملاحظات والخدوش والتلفيات الموجودة وقت الاستلام. وأتعهد بالمحافظة عليها واستخدامها للعمل، وعدم إساءة استخدامها أو تسليمها لأي شخص آخر دون موافقة المنشأة، وإبلاغ المسؤول المختص فور حدوث عطل أو حادث أو تلف، وعدم إجراء إصلاحات أو تعديلات دون الرجوع إلى المنشأة. وأتحمل المسؤولية عن الأضرار أو المخالفات أو التلفيات الناتجة عن الإهمال أو سوء الاستخدام خلال فترة استلامي، وفق أنظمة وسياسات المنشأة.`,
                    `I hereby acknowledge receipt of only the checked items with the recorded quantities and conditions from ${companyName}. In case of receiving a vehicle, I acknowledge inspecting it and documenting existing faults, remarks, scratches, and damages at the time of receipt. I undertake to maintain it, use it exclusively for work, not misuse it or hand it over to any other person without company consent, notify the supervisor immediately upon any breakdown, accident, or damage, and make no repairs or modifications without prior company approval. I bear full responsibility for damages, violations, or defects resulting from negligence or misuse during my custody period, in accordance with company rules and policies.`
                  )}
                </p>
              </div>

              {/* Signatures Table */}
              <table className="w-full border-collapse border border-black text-center text-xs font-semibold mb-2">
                <thead>
                  <tr className="bg-gray-100 font-black border-b border-black">
                    <th className="border border-black p-1.5 w-5/12">{t("المندوب المستلم", "Receiving Rider")}</th>
                    <th className="border border-black p-1.5 w-5/12">{t("ممثل الشركة المسلّم", "Delivering Company Representative")}</th>
                    <th className="border border-black p-1.5 w-2/12">{t("بصمة المندوب", "Rider Thumbprint")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2 text-right align-top space-y-1">
                      <div><span className="font-bold text-gray-700">{t("الاسم:", "Name:")} </span>{riderName || "...................................."}</div>
                      <div className="pt-2"><span className="font-bold text-gray-700">{t("التوقيع:", "Signature:")} </span>....................................</div>
                    </td>
                    <td className="border border-black p-2 text-right align-top space-y-1">
                      <div><span className="font-bold text-gray-700">{t("الاسم:", "Name:")} </span>{companyRepName}</div>
                      <div><span className="font-bold text-gray-700">{t("الصفة:", "Title:")} </span>{companyRepTitle}</div>
                      <div><span className="font-bold text-gray-700">{t("التوقيع:", "Signature:")} </span>....................................</div>
                      <div><span className="font-bold text-gray-700">{t("ختم المنشأة:", "Seal:")} </span>....................................</div>
                    </td>
                    <td className="border border-black p-2 align-middle text-center bg-gray-50/40">
                      <div className="w-16 h-20 border border-dashed border-gray-400 mx-auto flex items-center justify-center text-[10px] text-gray-500">
                        {t("موضع البصمة", "Thumbprint")}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Letterhead Footer */}
            <LetterheadFooter letterheadId={letterheadId} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODEL 2: نموذج استرداد مركبة وعهدة من المندوب (Return / Recovery Form)   */}
      {/* ========================================================================= */}
      {selectedModels.returnCustody && (
        <div
          className={`relative bg-white text-black p-5 sm:p-7 print:p-3.5 print:py-3 rounded-xl border-2 border-black font-sans leading-relaxed shadow-xs min-h-[960px] flex flex-col justify-between overflow-hidden print-page-frame ${
            selectedModels.handover ? "print:break-before-page" : ""
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
              />

              {/* Title Section */}
              <div className="text-center pt-2 pb-2 border-b-2 border-black mb-3">
                <div className="flex items-center justify-center gap-2">
                  <RotateCcw className="w-6 h-6 text-black print:hidden" />
                  <h1 className="text-xl sm:text-2xl font-black text-black tracking-wide">
                    {isAr && "نموذج استرداد مركبة وعهدة من المندوب"}
                    {isEn && "Vehicle & Custody Return / Recovery Form from Rider"}
                    {isBoth && (
                      <div className="space-y-0.5">
                        <div>نموذج استرداد مركبة وعهدة من المندوب</div>
                        <div className="text-sm sm:text-base font-bold text-gray-700 dir-ltr">
                          Vehicle & Custody Return / Recovery Form from Rider
                        </div>
                      </div>
                    )}
                  </h1>
                </div>

                {/* Subtitle Line */}
                <div className="mt-1 text-xs sm:text-sm font-extrabold text-gray-900 flex flex-wrap justify-between items-center gap-2 bg-gray-100 p-1.5 rounded-sm border border-gray-400">
                  <span>{t("رقم المحضر:", "Record No:")} <b className="text-black">{recordNumber}</b></span>
                  <span>{t("مرجع التسليم السابق:", "Previous Handover Ref:")} <b className="text-black">{prevDeliveryRef}</b></span>
                  <span>{t("التاريخ:", "Date:")} <b className="text-black">{resolvedDate}</b></span>
                  <span>{t("الوقت:", "Time:")} <b className="text-black">{time || "........"}</b></span>
                </div>
              </div>

              {/* Rider Details Grid */}
              <div className="border border-black rounded-sm p-2 bg-gray-50/70 text-xs sm:text-[13px] font-semibold mb-2.5 space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  <div>
                    <span className="font-bold text-gray-700">{t("اسم المندوب المسلّم:", "Returning Rider Name:")} </span>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 border-t border-gray-300">
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
              <div className="border border-black rounded-sm p-2 bg-gray-50/70 text-xs sm:text-[12.5px] font-semibold mb-2.5 space-y-1">
                <div className="font-black text-black border-b border-black pb-0.5 text-xs flex justify-between items-center">
                  <span>{t("بيانات المركبة المستردة:", "Returned Vehicle Details:")}</span>
                  <span className="text-[11px] font-medium text-gray-600">{vehicleType}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
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
                    <span className="font-bold text-gray-700">{t("رقم الهيكل:", "Chassis No:")} </span>
                    <span className="font-black text-black dir-ltr inline-block text-[11px]">{chassisNumber || "............"}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 border-t border-gray-300">
                  <div>
                    <span className="font-bold text-gray-700">{t("الرقم التسلسلي:", "Serial No:")} </span>
                    <span className="font-black text-black dir-ltr inline-block text-[11px]">{serialNumber || "............"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("العداد عند الاسترداد:", "Return Odometer:")} </span>
                    <span className="font-black text-black">{odometer ? `${odometer} كم` : "............"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("الوقود:", "Fuel Level:")} </span>
                    <span className="font-black text-black">{fuelLevel || "............"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">{t("المفاتيح / الرخصة:", "Keys / Registration:")} </span>
                    <span className="font-black text-black">{keysCount} مفتاح | {registrationStatus}</span>
                  </div>
                </div>
              </div>

              {/* بيان العهدة المستردة (Returned Custody Table with original/returned/missing) */}
              <div className="mb-2.5">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-black text-xs sm:text-sm text-black border-r-4 border-black pr-1.5">
                    {t("بيان العهدة المستردة:", "Returned Custody Statement:")}
                  </h3>
                  <span className="text-[10.5px] text-gray-700 font-bold">
                    {t("(حدد الأصناف المستردة ونواقصها)", "(Check returned items and discrepancies)")}
                  </span>
                </div>
                <table className="w-full border-collapse border border-black text-center text-xs print:text-[11px]">
                  <thead>
                    <tr className="bg-gray-100 font-black border-b border-black">
                      <th className="border border-black p-1 w-8 sm:w-10">✓</th>
                      <th className="border border-black p-1 text-right pr-2">{t("الصنف", "Item Description")}</th>
                      <th className="border border-black p-1 w-20 sm:w-24">{t("الوحدة (ريال)", "Unit (SAR)")}</th>
                      <th className="border border-black p-1 w-14 sm:w-16">{t("أصلي", "Original")}</th>
                      <th className="border border-black p-1 w-14 sm:w-16">{t("معاد", "Returned")}</th>
                      <th className="border border-black p-1 w-14 sm:w-16 text-red-700 font-black">{t("ناقص", "Missing")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50/80 transition-colors ${item.selected ? "bg-amber-50/40 print:bg-transparent font-bold" : "opacity-70 text-gray-600 font-normal"}`}
                      >
                        <td className="border border-black p-1 text-center">
                          <CustomBox
                            checked={item.selected}
                            onClick={() => onToggleReturnItem && onToggleReturnItem(item.id)}
                            language={language}
                            size="sm"
                          />
                        </td>
                        <td className="border border-black p-1 text-right pr-2">
                          <span className={item.selected ? "font-black text-black" : ""}>
                            {isAr && item.nameAr}
                            {isEn && item.nameEn}
                            {isBoth && `${item.nameAr} / ${item.nameEn}`}
                          </span>
                        </td>
                        <td className="border border-black p-1 font-semibold">{item.unitPrice}</td>
                        <td className="border border-black p-1">{item.originalQty}</td>
                        <td className="border border-black p-1 font-bold text-emerald-800">{item.returnedQty}</td>
                        <td className="border border-black p-1 font-bold text-red-700">
                          {Number(item.missingQty) > 0 ? item.missingQty : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[10px] sm:text-[10.5px] font-bold text-gray-800 mt-1 leading-snug">
                  {t(
                    "تُحدد الأصناف الفعلية بالمربعات، وتُسجل الكميات والحالة فقط. القيم تقديرية للوحدة، وليست خصمًا تلقائيًا. قيمة السيارة أو الدراجة النارية تُحدد من سجل المركبة الفعلية.",
                    "Actual items are indicated with checkboxes; only quantities and conditions are recorded. Values are estimated per unit and are not an automatic deduction. Vehicle value is determined from the official asset record."
                  )}
                </p>
                {returnCustodyNotes && (
                  <p className="text-xs font-semibold text-gray-900 mt-0.5">
                    <b>{t("حالة العهدة وملاحظاتها:", "Custody condition & notes:")}</b> {returnCustodyNotes}
                  </p>
                )}
              </div>

              {/* فحص المركبة وقت الاسترداد (Vehicle Return Inspection) */}
              <div className="mb-2.5">
                <div className="flex flex-wrap justify-between items-center mb-1 border-b border-black pb-0.5">
                  <h3 className="font-black text-xs sm:text-sm text-black">
                    {t("فحص المركبة وقت الاسترداد:", "Vehicle Inspection at Return:")}
                  </h3>
                  {/* Exterior Body Checkboxes */}
                  <div className="flex items-center gap-3 text-xs">
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

                {/* Grid of Parts Inspection */}
                <table className="w-full border-collapse border border-black text-xs print:text-[11px] mb-1.5">
                  <thead>
                    <tr className="bg-gray-100 font-bold border-b border-black">
                      <th className="border border-black p-1 text-right pr-2 w-1/3 sm:w-1/4">{t("موضع الفحص", "Inspection Area")}</th>
                      <th className="border border-black p-1 text-right pr-2">{t("الحالة أو الملاحظة", "Condition / Remarks")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnParts.map((part) => (
                      <tr key={part.id}>
                        <td className="border border-black p-1 font-bold text-right pr-2 bg-gray-50/50">
                          {isAr && part.nameAr}
                          {isEn && part.nameEn}
                          {isBoth && `${part.nameAr} / ${part.nameEn}`}
                        </td>
                        <td className="border border-black p-1 text-right pr-2 font-medium">{part.condition || "سليم"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Spare tire & attachments */}
                <div className="border border-black rounded-sm p-2 bg-gray-50/60 text-xs space-y-1.5">
                  <div className="flex flex-wrap items-center gap-3">
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

                  {/* Faults List */}
                  <div className="space-y-1">
                    <span className="font-extrabold text-black block">{t("الأعطال أو المشاكل الموجودة:", "Existing Faults or Issues:")}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                      {returnFaults.map((fault) => (
                        <div key={fault.id} className="flex items-center gap-1.5">
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

                  {/* Visible scratches */}
                  {returnVisibleScratches && (
                    <div className="text-[11px]">
                      <span className="font-extrabold text-black">{t("الخدوش أو التلفيات الظاهرة:", "Visible scratches / damages:")} </span>
                      <span className="font-medium text-gray-800">{returnVisibleScratches}</span>
                    </div>
                  )}

                  {/* Attachments */}
                  <div className="pt-1 border-t border-gray-300">
                    <span className="font-extrabold text-black ml-2">{t("مرفقات حالة المركبة:", "Condition Attachments:")}</span>
                    <div className="inline-flex flex-wrap gap-2.5 sm:gap-4 text-[11px] pt-0.5">
                      <CustomBox
                        checked={returnAttachments.front}
                        onClick={() => onToggleAttachment && onToggleAttachment("return", "front")}
                        labelAr="صور أمامية"
                        labelEn="Front Photos"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={returnAttachments.rear}
                        onClick={() => onToggleAttachment && onToggleAttachment("return", "rear")}
                        labelAr="صور خلفية"
                        labelEn="Rear Photos"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={returnAttachments.sides}
                        onClick={() => onToggleAttachment && onToggleAttachment("return", "sides")}
                        labelAr="صور الجانبين"
                        labelEn="Sides Photos"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={returnAttachments.interior}
                        onClick={() => onToggleAttachment && onToggleAttachment("return", "interior")}
                        labelAr="صور الداخلية"
                        labelEn="Interior Photos"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={returnAttachments.odometer}
                        onClick={() => onToggleAttachment && onToggleAttachment("return", "odometer")}
                        labelAr="صورة العداد"
                        labelEn="Odometer Photo"
                        language={language}
                        size="sm"
                      />
                      <CustomBox
                        checked={returnAttachments.damages}
                        onClick={() => onToggleAttachment && onToggleAttachment("return", "damages")}
                        labelAr="صور الأعطال والتلفيات"
                        labelEn="Damages Photos"
                        language={language}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* الإقرار بالاسترداد (Return Acknowledgment) */}
              <div className="border border-black rounded-sm p-2.5 bg-gray-50/90 text-[11px] sm:text-xs leading-relaxed space-y-1 mb-3">
                <h4 className="font-black text-black underline text-xs sm:text-sm">
                  {t("الإقرار:", "Official Recovery Acknowledgment:")}
                </h4>
                <p className="text-gray-900 font-semibold text-justify">
                  {t(
                    `أقر أنا ممثل ${companyName} باسترداد الأصناف المؤشر عليها فقط من المندوب، بالكميات والحالات المسجلة بعد المعاينة وإثبات الأعطال والتلفيات والنواقص. ويقر المندوب بأن هذا المحضر يعكس ما سلّمه فعليًا. هذا المحضر لإثبات الاسترداد فقط، ولا يُعد إخلاء طرف ماليًا أو إثباتًا لاسترداد أصناف غير مسجلة فيه. وتُراجع الفروق مع محضر التسليم السابق والمرفقات قبل تحديد أي مسؤولية.`,
                    `I, representative of ${companyName}, acknowledge the return of only the checked items from the rider, with the recorded quantities and conditions after inspection and documentation of faults, damages, and shortages. The rider confirms that this report accurately reflects what was actually handed over. This report is solely to prove recovery and does not constitute financial clearance or proof of recovery of unregistered items. Discrepancies shall be cross-referenced with the previous handover report and attachments before assigning any liability.`
                  )}
                </p>
              </div>

              {/* Signatures Table */}
              <table className="w-full border-collapse border border-black text-center text-xs font-semibold mb-2">
                <thead>
                  <tr className="bg-gray-100 font-black border-b border-black">
                    <th className="border border-black p-1.5 w-5/12">{t("المندوب المسلّم", "Returning Rider")}</th>
                    <th className="border border-black p-1.5 w-5/12">{t("ممثل الشركة المستلم", "Receiving Company Representative")}</th>
                    <th className="border border-black p-1.5 w-2/12">{t("بصمة المندوب", "Rider Thumbprint")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2 text-right align-top space-y-1">
                      <div><span className="font-bold text-gray-700">{t("الاسم:", "Name:")} </span>{riderName || "...................................."}</div>
                      <div className="pt-2"><span className="font-bold text-gray-700">{t("التوقيع:", "Signature:")} </span>....................................</div>
                    </td>
                    <td className="border border-black p-2 text-right align-top space-y-1">
                      <div><span className="font-bold text-gray-700">{t("الاسم:", "Name:")} </span>{companyRepName}</div>
                      <div><span className="font-bold text-gray-700">{t("الصفة:", "Title:")} </span>{companyRepTitle}</div>
                      <div><span className="font-bold text-gray-700">{t("التوقيع:", "Signature:")} </span>....................................</div>
                      <div><span className="font-bold text-gray-700">{t("ختم المنشأة:", "Seal:")} </span>....................................</div>
                    </td>
                    <td className="border border-black p-2 align-middle text-center bg-gray-50/40">
                      <div className="w-16 h-20 border border-dashed border-gray-400 mx-auto flex items-center justify-center text-[10px] text-gray-500">
                        {t("موضع البصمة", "Thumbprint")}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Letterhead Footer */}
            <LetterheadFooter letterheadId={letterheadId} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODEL 3: بنود سياسة قسم الأسطول (Fleet Department Policy Terms)           */}
      {/* ========================================================================= */}
      {selectedModels.fleetPolicy && (
        <div
          className={`relative bg-white text-black p-5 sm:p-7 print:p-3.5 print:py-3 rounded-xl border-2 border-black font-sans leading-relaxed shadow-xs min-h-[960px] flex flex-col justify-between overflow-hidden print-page-frame ${
            selectedModels.handover || selectedModels.returnCustody ? "print:break-before-page" : ""
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
              />

              {/* Title Section */}
              <div className="text-center pt-2 pb-2 border-b-2 border-black mb-3">
                <div className="flex items-center justify-center gap-2">
                  <Shield className="w-6 h-6 text-black print:hidden" />
                  <h1 className="text-xl sm:text-2xl font-black text-black tracking-wide">
                    {isAr && "بنود سياسة قسم الأسطول"}
                    {isEn && "Fleet Department Policy Terms & Regulations"}
                    {isBoth && (
                      <div className="space-y-0.5">
                        <div>بنود سياسة قسم الأسطول</div>
                        <div className="text-sm sm:text-base font-bold text-gray-700 dir-ltr">
                          Fleet Department Policy Terms & Regulations
                        </div>
                      </div>
                    )}
                  </h1>
                </div>

                <div className="mt-1 text-xs sm:text-sm font-extrabold text-gray-900 flex justify-between items-center bg-gray-100 p-1.5 rounded-sm border border-gray-400">
                  <span>{companyName}</span>
                  <span>{t("تاريخ الإقرار:", "Acknowledgment Date:")} <b className="text-black">{resolvedDate}</b></span>
                </div>
              </div>

              {/* 14 Policy Terms Checklist */}
              <div className="space-y-1.5 mb-4 text-xs sm:text-[12.5px]">
                {policyTerms.map((term, index) => (
                  <div
                    key={term.id}
                    onClick={() => onTogglePolicyTerm && onTogglePolicyTerm(term.id)}
                    className={`p-2 border rounded-sm transition-colors cursor-pointer flex items-start gap-2.5 ${
                      term.selected
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
                    <div className="flex-1 font-semibold text-gray-900 leading-normal">
                      <span className="font-bold text-black ml-1">({index + 1})</span>
                      {isAr && term.textAr}
                      {isEn && term.textEn}
                      {isBoth && (
                        <div className="space-y-0.5">
                          <div className="text-black">{term.textAr}</div>
                          <div className="text-[11px] text-gray-700 font-medium dir-ltr">{term.textEn}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* إقرار بالاطلاع (Policy Acknowledgment) */}
              <div className="border border-black rounded-sm p-3 bg-gray-50/90 text-xs sm:text-sm leading-relaxed mb-3 space-y-1.5">
                <h4 className="font-black text-black underline">
                  {t("إقرار بالاطلاع والالتزام:", "Acknowledgment of Review & Compliance:")}
                </h4>
                <p className="font-extrabold text-gray-900">
                  {t(
                    "أقر بأنني اطلعت على البنود الواردة أعلاه وفهمت مضمونها بالكامل، وأتعهد بالالتزام التام بكافة ما ورد فيها دون أي إخلال.",
                    "I acknowledge that I have read the terms set forth above, fully understood their content, and undertake to strictly comply with all provisions without violation."
                  )}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-gray-400 text-xs font-semibold">
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
              <table className="w-full border-collapse border border-black text-center text-xs font-semibold mb-2">
                <thead>
                  <tr className="bg-gray-100 font-black border-b border-black">
                    <th className="border border-black p-1.5 w-8/12">{t("توقيع وإقرار المندوب", "Rider Signature & Undertaking")}</th>
                    <th className="border border-black p-1.5 w-4/12">{t("بصمة المندوب", "Rider Thumbprint")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2.5 text-right align-top space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-bold text-gray-700">{t("الجوال:", "Mobile:")} </span>
                          <span className="font-black text-black dir-ltr inline-block">{mobile || "...................."}</span>
                        </div>
                        <div>
                          <span className="font-bold text-gray-700">{t("التاريخ:", "Date:")} </span>
                          <span className="font-black text-black">{resolvedDate}</span>
                        </div>
                      </div>
                      <div className="pt-2">
                        <span className="font-bold text-gray-700">{t("التوقيع:", "Signature:")} </span>
                        ........................................................
                      </div>
                    </td>
                    <td className="border border-black p-2.5 align-middle text-center bg-gray-50/40">
                      <div className="w-20 h-24 border border-dashed border-gray-400 mx-auto flex items-center justify-center text-[10px] text-gray-500">
                        {t("موضع البصمة", "Thumbprint")}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Letterhead Footer */}
            <LetterheadFooter letterheadId={letterheadId} />
          </div>
        </div>
      )}
    </div>
  );
}
