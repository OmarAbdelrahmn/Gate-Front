import React from "react";
import { Check, Package, RotateCcw } from "lucide-react";
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

export interface CustodyItemsFormData {
  selectedModels: {
    handover: boolean;
    returnCustody: boolean;
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

  // Model 1: Handover
  handoverItems: CustodyItemHandover[];
  handoverCustodyNotes?: string;

  // Model 2: Return
  returnItems: CustodyItemReturn[];
  returnCustodyNotes?: string;

  // Signatures
  companyRepName?: string;
  companyRepTitle?: string;

  // Callbacks
  onToggleModel?: (model: "handover" | "returnCustody") => void;
  onToggleHandoverItem?: (id: string) => void;
  onToggleReturnItem?: (id: string) => void;
}

export const INITIAL_PHYSICAL_CUSTODY_ITEMS: {
  id: string;
  nameAr: string;
  nameEn: string;
  unitPrice: string | number;
  defaultSelected: boolean;
  defaultQty: number;
  defaultCondition: string;
}[] = [
  { id: "phone", nameAr: "هاتف جوال", nameEn: "Mobile Phone", unitPrice: 800, defaultSelected: true, defaultQty: 1, defaultCondition: "ممتازة وسليم" },
  { id: "car_charger", nameAr: "شاحن سيارة بمنفذي USB", nameEn: "Dual USB Car Charger", unitPrice: 100, defaultSelected: true, defaultQty: 1, defaultCondition: "جديد وسليم" },
  { id: "phone_holder", nameAr: "قاعدة جوال", nameEn: "Phone Mount / Holder", unitPrice: 100, defaultSelected: true, defaultQty: 1, defaultCondition: "سليم" },
  { id: "charging_cable", nameAr: "سلك شحن جوال", nameEn: "Phone Charging Cable", unitPrice: 50, defaultSelected: true, defaultQty: 1, defaultCondition: "جديد" },
  { id: "sim_card", nameAr: "شريحة اتصال وبيانات", nameEn: "Mobile SIM & Data Card", unitPrice: 250, defaultSelected: true, defaultQty: 1, defaultCondition: "نشطة وجاهزة" },
  { id: "camera", nameAr: "كاميرا EZVIZ", nameEn: "EZVIZ Security Camera", unitPrice: 350, defaultSelected: false, defaultQty: 1, defaultCondition: "جديدة بالكرتون" },
  { id: "helmet", nameAr: "خوذة سلامة", nameEn: "Safety Helmet", unitPrice: 200, defaultSelected: false, defaultQty: 1, defaultCondition: "مطابقة للمواصفات" },
  { id: "bike_box", nameAr: "صندوق دراجة نارية", nameEn: "Motorcycle Box", unitPrice: 100, defaultSelected: false, defaultQty: 1, defaultCondition: "سليم" },
  { id: "delivery_bag", nameAr: "حقيبة توصيل حرارية معتمدة", nameEn: "Thermal Delivery Bag", unitPrice: 150, defaultSelected: true, defaultQty: 1, defaultCondition: "جديدة معتمدة" },
  { id: "tshirt", nameAr: "تيشيرت زي رسمي", nameEn: "Uniform T-Shirt", unitPrice: 75, defaultSelected: true, defaultQty: 2, defaultCondition: "جديد" },
  { id: "pants", nameAr: "بنطلون زي رسمي", nameEn: "Uniform Pants", unitPrice: 70, defaultSelected: true, defaultQty: 2, defaultCondition: "جديد" },
  { id: "shoes", nameAr: "حذاء عمل", nameEn: "Work Shoes", unitPrice: 100, defaultSelected: true, defaultQty: 1, defaultCondition: "جديد" },
  { id: "safety", nameAr: "سيفتي ومعدات حماية", nameEn: "Safety Shoes / Gear", unitPrice: 200, defaultSelected: false, defaultQty: 1, defaultCondition: "مطابق" },
  { id: "vest", nameAr: "صدرية فسفورية عاكسة", nameEn: "Reflective Vest", unitPrice: 150, defaultSelected: true, defaultQty: 1, defaultCondition: "سليمة" },
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

export function CustodyItemsFormView({ data }: { data: CustodyItemsFormData }) {
  const {
    selectedModels = { handover: true, returnCustody: false },
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
    handoverItems = [],
    handoverCustodyNotes = "",
    returnItems = [],
    returnCustodyNotes = "",
    companyRepName = "مسؤول قسم العهد والتشغيل",
    companyRepTitle = "مشرف العهد والمستودع",
    onToggleHandoverItem,
    onToggleReturnItem,
  } = data;

  const resolvedDate = date || ".... / .... / ........";
  const hasAnyModelSelected = selectedModels.handover || selectedModels.returnCustody;

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
      {!hasAnyModelSelected && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg text-amber-900 text-center font-bold">
          ⚠️ يرجى تحديد نموذج واحد على الأقل من نماذج العهدة العينية أدناه للطباعة أو المعاينة.
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODEL 1: نموذج تسليم عهدة عينية وتجهيزات (Custody Items Handover)          */}
      {/* ========================================================================= */}
      {selectedModels.handover && (
        <div className="relative bg-white text-black p-5 sm:p-7 print:p-3.5 print:py-3 rounded-xl border-2 border-black font-sans leading-relaxed shadow-xs min-h-[960px] print:min-h-[275mm] flex flex-col justify-between overflow-visible print:overflow-visible print-page-flow">
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
                  <Package className="w-5 h-5 text-black print:hidden" />
                  <h1 className="text-lg sm:text-xl font-black text-black tracking-wide">
                    {isAr && "نموذج تسليم عهدة عينية وتجهيزات للمندوب"}
                    {isEn && "Custody Items & Equipment Handover Form to Rider"}
                    {isBoth && (
                      <div className="space-y-0.5">
                        <div>نموذج تسليم عهدة عينية وتجهيزات للمندوب</div>
                        <div className="text-xs sm:text-sm font-bold text-gray-700 dir-ltr">
                          Custody Items & Equipment Handover Form to Rider
                        </div>
                      </div>
                    )}
                  </h1>
                </div>

                {/* Subtitle Line */}
                <div className="mt-1 text-xs font-extrabold text-gray-900 flex flex-wrap justify-between items-center gap-2 bg-gray-100 p-1.5 rounded-sm border border-gray-400">
                  <span>{t("رقم المحضر:", "Record No:")} <b className="text-black">{recordNumber}</b></span>
                  <span>{t("التاريخ:", "Date:")} <b className="text-black">{resolvedDate}</b></span>
                  <span>{t("الوقت:", "Time:")} <b className="text-black">{time || "........"}</b></span>
                  <span>{t("الفرع:", "Branch:")} <b className="text-black">{branch || "المركز الرئيسي"}</b></span>
                </div>
              </div>

              {/* Rider Details Grid */}
              <div className="border border-black rounded-sm p-2 bg-gray-50/70 text-xs font-semibold mb-3 space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="font-bold text-gray-700">{t("اسم المستلم (الموظف):", "Receiver Name:")} </span>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-gray-300">
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

              {/* بیان العهدة المسلّمة (Delivered Custody Table) */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-black text-xs sm:text-sm text-black border-r-4 border-black pr-1.5">
                    {t("بيان العهدة والأدوات العينية المسلّمة:", "Delivered Custody Items Statement:")}
                  </h3>
                  <span className="text-[10.5px] text-gray-700 font-bold">
                    {t("(حدد الأصناف المسلمة فعلياً وتأكد من الكمية والحالة)", "(Check delivered items & verify conditions)")}
                  </span>
                </div>
                <table className="w-full border-collapse border border-black text-center text-xs print:text-[11px]">
                  <thead>
                    <tr className="bg-gray-100 font-black border-b border-black">
                      <th className="border border-black p-1 w-8 sm:w-10">✓</th>
                      <th className="border border-black p-1 text-right pr-2">{t("بيان الصنف / العهدة", "Item Description")}</th>
                      <th className="border border-black p-1 w-14 sm:w-16">{t("العدد", "Qty")}</th>
                      <th className="border border-black p-1 w-20 sm:w-24">{t("القيمة التقديرية", "Unit (SAR)")}</th>
                      <th className="border border-black p-1 text-right pr-2">{t("الحالة الراهنة", "Condition")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {handoverItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50/80 transition-colors ${item.selected ? "bg-amber-50/40 print:bg-transparent font-bold" : "opacity-60 text-gray-600 font-normal"}`}
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
                        <td className="border border-black p-1 font-semibold">{item.unitPrice} ريال</td>
                        <td className="border border-black p-1 text-right pr-2">{item.condition}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[10px] font-bold text-gray-800 mt-1 leading-snug">
                  {t(
                    "تُحدد الأصناف المسلمة فعلياً بالمربعات، وتُسجل الكميات والحالة فقط. القيم تقديرية للوحدة لأغراض الضمان والمسؤولية وليست خصماً تلقائياً.",
                    "Only checked items are actually delivered. Values are estimated unit replacement values for liability purposes and not an automatic deduction."
                  )}
                </p>
                {handoverCustodyNotes && (
                  <p className="text-xs font-semibold text-gray-900 mt-1 p-1.5 bg-gray-50 border border-gray-300 rounded-xs">
                    <b>{t("ملاحظات تفصيلية حول العهدة:", "Custody notes:")}</b> {handoverCustodyNotes}
                  </p>
                )}
              </div>

              {/* الإقرار والتعهد (Handover Acknowledgment) */}
              <div className="border border-black rounded-sm p-2.5 bg-gray-50/90 text-[11px] sm:text-xs leading-relaxed space-y-1 mb-3">
                <h4 className="font-black text-black underline text-xs sm:text-sm">
                  {t("الإقرار والتعهد النظامي:", "Custody Undertaking & Legal Acknowledgment:")}
                </h4>
                <p className="text-gray-900 font-semibold text-justify">
                  {t(
                    `أقر أنا الموقع أدناه باستلام الأصناف المؤشر عليها أعلاه فقط بالكميات والحالات المسجلة من ${companyName} بحالة سليمة وجاهزة للاستخدام. وأتعهد بالمحافظة التامة عليها واستخدامها لأغراض العمل المعتمدة فقط، وعدم التفريط فيها أو إعارتها أو تسليمها لأي شخص آخر دون إذن مسبق. كما أتعهد بإعادتها كاملة وسليمة للشركة عند انتهاء خدمتي أو متى طُلب مني ذلك، وأتحمل كامل المسؤولية المالية والنظامية عن أي تلف أو فقدان ناتج عن الإهمال أو سوء الاستخدام وفق لائحة الشركة وسياساتها.`,
                    `I, the undersigned, acknowledge receiving only the checked custody items with the recorded quantities and conditions from ${companyName} in good working order. I undertake to preserve them, utilize them strictly for business purposes, never transfer or lend them to third parties without prior written consent, and return them in good condition upon employment cessation or company request. I bear full financial and legal responsibility for loss or damage resulting from negligence or misuse.`
                  )}
                </p>
              </div>

              {/* Signatures Table */}
              <table className="w-full border-collapse border border-black text-center text-xs font-semibold mb-2">
                <thead>
                  <tr className="bg-gray-100 font-black border-b border-black">
                    <th className="border border-black p-1.5 w-5/12">{t("المستلم (الموظف / المندوب)", "Receiving Custodian")}</th>
                    <th className="border border-black p-1.5 w-5/12">{t("ممثل قسم العهد والتشغيل", "Delivering Representative")}</th>
                    <th className="border border-black p-1.5 w-2/12">{t("بصمة المستلم", "Thumbprint")}</th>
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
                      <div className="pt-2"><span className="font-bold text-gray-700">{t("التوقيع والختم:", "Signature & Seal:")} </span>....................................</div>
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

            {/* Footer */}
            <LetterheadFooter letterheadId={letterheadId} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODEL 2: نموذج استرداد عهدة عينية وتجهيزات (Custody Items Return)          */}
      {/* ========================================================================= */}
      {selectedModels.returnCustody && (
        <div
          className={`relative bg-white text-black p-5 sm:p-7 print:p-3.5 print:py-3 rounded-xl border-2 border-black font-sans leading-relaxed shadow-xs min-h-[960px] print:min-h-[275mm] flex flex-col justify-between overflow-visible print:overflow-visible print-page-flow ${
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
                  <RotateCcw className="w-5 h-5 text-black print:hidden" />
                  <h1 className="text-lg sm:text-xl font-black text-black tracking-wide">
                    {isAr && "نموذج استرداد عهدة عينية وتجهيزات من المندوب"}
                    {isEn && "Custody Items & Equipment Return Form from Rider"}
                    {isBoth && (
                      <div className="space-y-0.5">
                        <div>نموذج استرداد عهدة عينية وتجهيزات من المندوب</div>
                        <div className="text-xs sm:text-sm font-bold text-gray-700 dir-ltr">
                          Custody Items & Equipment Return Form from Rider
                        </div>
                      </div>
                    )}
                  </h1>
                </div>

                {/* Subtitle Line */}
                <div className="mt-1 text-xs font-extrabold text-gray-900 flex flex-wrap justify-between items-center gap-2 bg-gray-100 p-1.5 rounded-sm border border-gray-400">
                  <span>{t("رقم المحضر:", "Record No:")} <b className="text-black">{recordNumber}</b></span>
                  <span>{t("مرجع التسليم السابق:", "Previous Handover Ref:")} <b className="text-black">{prevDeliveryRef}</b></span>
                  <span>{t("التاريخ:", "Date:")} <b className="text-black">{resolvedDate}</b></span>
                  <span>{t("الوقت:", "Time:")} <b className="text-black">{time || "........"}</b></span>
                </div>
              </div>

              {/* Rider Details Grid */}
              <div className="border border-black rounded-sm p-2 bg-gray-50/70 text-xs font-semibold mb-3 space-y-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="font-bold text-gray-700">{t("اسم الموظف المسلّم:", "Returning Custodian:")} </span>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-gray-300">
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

              {/* بیان العهدة المستردة (Returned Custody Table with original/returned/missing) */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-black text-xs sm:text-sm text-black border-r-4 border-black pr-1.5">
                    {t("بيان العهدة المستردة وحصر النواقص:", "Returned Custody Statement & Discrepancies:")}
                  </h3>
                  <span className="text-[10.5px] text-gray-700 font-bold">
                    {t("(حدد الأصناف المستردة وافحص الكميات المستلمة والنواقص)", "(Verify returned items & missing quantities)")}
                  </span>
                </div>
                <table className="w-full border-collapse border border-black text-center text-xs print:text-[11px]">
                  <thead>
                    <tr className="bg-gray-100 font-black border-b border-black">
                      <th className="border border-black p-1 w-8 sm:w-10">✓</th>
                      <th className="border border-black p-1 text-right pr-2">{t("الصنف", "Item Description")}</th>
                      <th className="border border-black p-1 w-20 sm:w-24">{t("الوحدة (ريال)", "Unit (SAR)")}</th>
                      <th className="border border-black p-1 w-14 sm:w-16">{t("الأصلي", "Original")}</th>
                      <th className="border border-black p-1 w-14 sm:w-16 text-emerald-800">{t("المعاد", "Returned")}</th>
                      <th className="border border-black p-1 w-14 sm:w-16 text-red-700 font-black">{t("الناقص", "Missing")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50/80 transition-colors ${item.selected ? "bg-amber-50/40 print:bg-transparent font-bold" : "opacity-60 text-gray-600 font-normal"}`}
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
                        <td className="border border-black p-1 font-semibold">{item.unitPrice} ريال</td>
                        <td className="border border-black p-1">{item.originalQty}</td>
                        <td className="border border-black p-1 font-bold text-emerald-800">{item.returnedQty}</td>
                        <td className="border border-black p-1 font-bold text-red-700">
                          {Number(item.missingQty) > 0 ? item.missingQty : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[10px] font-bold text-gray-800 mt-1 leading-snug">
                  {t(
                    "تُحدد الأصناف المستردة فعلياً، وتُسجل الكميات المعادة والنواقص. هذا المحضر لإثبات الاسترجاع الفعلي للأصناف الموضحة.",
                    "Only checked items are actually received. Shortages are documented and cross-checked with initial handover report."
                  )}
                </p>
                {returnCustodyNotes && (
                  <p className="text-xs font-semibold text-gray-900 mt-1 p-1.5 bg-gray-50 border border-gray-300 rounded-xs">
                    <b>{t("ملاحظات الاسترداد والنواقص:", "Discrepancy notes:")}</b> {returnCustodyNotes}
                  </p>
                )}
              </div>

              {/* الإقرار بالاسترداد (Return Acknowledgment) */}
              <div className="border border-black rounded-sm p-2.5 bg-gray-50/90 text-[11px] sm:text-xs leading-relaxed space-y-1 mb-3">
                <h4 className="font-black text-black underline text-xs sm:text-sm">
                  {t("محضر وإقرار استرداد العهدة العينية:", "Custody Recovery Report & Acknowledgment:")}
                </h4>
                <p className="text-gray-900 font-semibold text-justify">
                  {t(
                    `أقر أنا ممثل قسم العهد في ${companyName} باسترداد الأصناف المؤشر عليها أعلاه فقط من الموظف المسلّم، بالكميات والحالات المسجلة بعد المعاينة والعد وإثبات النواقص والتلفيات إن وجدت. ويقر الموظف بأن هذا المحضر يمثل ما قام بتسليمه فعلياً للشركة. هذا المحضر لإثبات استرداد الأصناف المسجلة فقط ولا يعد إخلاء طرف مالي نهائي إلا بعد تسوية الفروق والنواقص مع الإدارة المالية.`,
                    `I, representative of the Custody Department at ${companyName}, acknowledge the return of only the checked custody items with the recorded quantities and conditions after verification. The employee confirms this report accurately reflects what was actually returned. This report proves custody recovery only and does not constitute full financial clearance until discrepancies are settled.`
                  )}
                </p>
              </div>

              {/* Signatures Table */}
              <table className="w-full border-collapse border border-black text-center text-xs font-semibold mb-2">
                <thead>
                  <tr className="bg-gray-100 font-black border-b border-black">
                    <th className="border border-black p-1.5 w-5/12">{t("الموظف المسلّم", "Returning Employee")}</th>
                    <th className="border border-black p-1.5 w-5/12">{t("ممثل قسم العهد المستلم", "Receiving Representative")}</th>
                    <th className="border border-black p-1.5 w-2/12">{t("بصمة الموظف", "Thumbprint")}</th>
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
                      <div className="pt-2"><span className="font-bold text-gray-700">{t("التوقيع والختم:", "Signature & Seal:")} </span>....................................</div>
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

            {/* Footer */}
            <LetterheadFooter letterheadId={letterheadId} />
          </div>
        </div>
      )}
    </div>
  );
}
