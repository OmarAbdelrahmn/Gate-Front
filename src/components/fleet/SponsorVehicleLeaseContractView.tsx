"use client";

import React from "react";
import { Mail, Phone, MapPin, Printer } from "lucide-react";
import type { SponsorVehicleLeaseAgreement } from "@/lib/fleet/vehicle-account-assignments-api";

interface ContractViewProps {
  agreement: SponsorVehicleLeaseAgreement;
  lessorCrNo?: string;
  lessorUnifiedNo?: string;
  lessorRepresentative?: string;
  lesseeCrNo?: string;
  lesseeUnifiedNo?: string;
  lesseeRepresentative?: string;
  onPrint?: () => void;
}

export function SponsorVehicleLeaseContractView({
  agreement,
  lessorCrNo = "4031283351",
  lessorUnifiedNo = "7034861059",
  lessorRepresentative = "ممدوح سالم عبد الوهاب خليفة",
  lesseeCrNo = "4030551794",
  lesseeUnifiedNo = "7038745530",
  lesseeRepresentative = "نادية عبد الهادي شريقي المحمادي",
  onPrint,
}: ContractViewProps) {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const agreementDateFormatted = agreement.agreementDate || agreement.effectiveFrom || "2026-03-26";
  const lessorName = agreement.lessorSponsorNameAr || "شركة إكسبارس جايت";
  const lesseeName = agreement.lesseeSponsorNameAr || "مؤسسة البوابة المقبلة للتجارة";

  return (
    <div className="space-y-8 font-sans text-black dir-rtl print:p-0">
      {/* Top Action Bar (Hidden on print) */}
      <div className="print:hidden flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl shadow-md">
        <div>
          <h2 className="text-base font-extrabold flex items-center gap-2">
            <span>معاينة طباعة عقد تأجير المركبات (PDF)</span>
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            عقد رسمـي مكوّن من 3 صفحات مطابق للنسخة القانونية المعتمدة لشركة إكسبارس جايت.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-[#1167c9] hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all"
        >
          <Printer className="h-4 w-4" />
          <span>طباعة / تصدير إلى PDF</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 1 */}
      {/* ========================================================================= */}
      <div className="relative bg-white text-black w-full max-w-[210mm] mx-auto p-8 rounded-xl border border-gray-300 print:border-none print:shadow-none shadow-xl print-container min-h-[297mm] flex flex-col justify-between overflow-hidden page-break-after: always print:mb-0">
        {/* Background Watermark Image */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
          style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
        >
          <img
            src="/letterheads/express_watermark.jpeg"
            alt="Watermark"
            className="w-[550px] max-w-[85%] max-h-[75%] object-contain opacity-[0.10] select-none mix-blend-multiply"
            style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
          />
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-between space-y-4">
          <div>
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3 mb-4">
              <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                <img
                  src="/letterheads/express_logo.svg"
                  alt="Express Gate Logo"
                  className="max-w-full max-h-full object-contain"
                  style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
                />
              </div>

              <div className="text-right space-y-0.5">
                <h1 className="text-xl font-black text-black tracking-tight">شركة اكسبارس جايت</h1>
                <p className="text-xs font-bold text-gray-700 dir-ltr text-right">Express Gate Company</p>
                <p className="text-xs font-bold text-gray-800">
                  رقم التسجيل الضريبي: <span className="font-mono font-bold">314514350400003</span>
                </p>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-4">
              <h2 className="text-2xl font-black tracking-wide inline-block border-b-2 border-black pb-1">
                اتفاقية تأجير مركبات
              </h2>
            </div>

            {/* Contract Body - Page 1 */}
            <div className="space-y-4 text-xs font-medium leading-relaxed">
              <p className="text-justify font-bold">
                بعون الله تعالى، تم الاتفاق في يوم الموافق <span className="font-mono font-extrabold underline">{agreementDateFormatted}</span>م في مدينة جدة، بين كل من:
              </p>

              {/* Sponsor 1: Lessor */}
              <div className="border border-black p-3 rounded-lg bg-gray-50/50 space-y-1">
                <h3 className="font-extrabold text-sm border-b border-black/40 pb-1 text-black">
                  الطرف الأول (المؤجر):
                </h3>
                <p className="font-black text-sm text-black">{lessorName}</p>
                <p>
                  سجل تجاري رقم: <span className="font-mono font-bold">({lessorCrNo})</span> - الرقم الوطني الموحد: <span className="font-mono font-bold">({lessorUnifiedNo})</span>، صادر من مدينة جدة.
                </p>
                <p>العنوان: مدينة جدة، المملكة العربية السعودية.</p>
                <p>
                  ويمثلها في هذا العقد المدير التنفيذي السيد / <span className="font-bold">{lessorRepresentative}</span>.
                </p>
              </div>

              {/* Sponsor 2: Lessee */}
              <div className="border border-black p-3 rounded-lg bg-gray-50/50 space-y-1">
                <h3 className="font-extrabold text-sm border-b border-black/40 pb-1 text-black">
                  الطرف الثاني (المستأجر):
                </h3>
                <p className="font-black text-sm text-black">{lesseeName}</p>
                <p>
                  سجل تجاري رقم: <span className="font-mono font-bold">({lesseeCrNo})</span> - الرقم الوطني الموحد: <span className="font-mono font-bold">({lesseeUnifiedNo})</span>، صادر من مدينة جدة.
                </p>
                <p>العنوان: مدينة جدة، المملكة العربية السعودية.</p>
                <p>
                  ويمثلها في هذا العقد المدير أو الوكيل المفوض السيد / <span className="font-bold">{lesseeRepresentative}</span>.
                </p>
              </div>

              {/* Preamble */}
              <div className="space-y-1">
                <h4 className="font-bold text-sm underline">التمهيد:</h4>
                <p className="text-justify leading-relaxed">
                  لما كان المؤجر يمارس نشاط تأجير السيارات وصيانتها وتشغيلها وفقاً لنظامه الأساسي وأحكام الشريعة الإسلامية، وحيث أبدى المستأجر رغبته في استئجار سيارات مملوكة للمؤجر بالمواصفات المبينة في هذه الاتفاقية؛ وبعد إقرار طرفي الاتفاقية بأهليتهما القانونية والشرعية للتعاقد، فقد اتفقا على إبرام هذه الاتفاقية وفقاً للبنود التالية:
                </p>
              </div>

              {/* Article 1 */}
              <div className="space-y-1">
                <h4 className="font-bold text-xs underline">البند الأول: التمهيد والملحقات</h4>
                <p>
                  يعتبر التمهيد السابق، وكافة الملحقات، وطلبات التأجير ذات العلاقة، جزءاً لا يتجزأ من هذه الاتفاقية وتقرأ وتفسر معها.
                </p>
              </div>

              {/* Article 2 */}
              <div className="space-y-1">
                <h4 className="font-bold text-xs underline">البند الثاني: مدة عقد التأجير ومواصفات السيارات</h4>
                <ol className="list-decimal list-inside space-y-1 pr-2">
                  <li>
                    اتفق الطرفان على أن تكون مدة عقد التأجير (سنة واحدة). وتحدد مواصفات السيارات تفصيلاً بناءً على طلبات التأجير المقدمة من قبل المستأجر (الطرف الثاني)، والتي يجب أن تتضمن نوع السيارة وموديلها، وتكون مختومة بختم المستأجر ومعتمدة من قبل شخص مأذون له كتابةً.
                  </li>
                  <li>بناءً على طلب التأجير، يتم تحرير "عقد تأجير فرعي" من قبل المؤجر لكل سيارة، ويعتبر ملزماً للطرفين.</li>
                  <li>
                    يقر المستأجر بأنه ملزم باستلام السيارات المطابقة للمواصفات المذكورة في طلب التأجير، ولا يحق له الرجوع أو الاعتراض متى كانت مطابقة، ويكون مسؤولاً مسؤولية كاملة عن استخدامها وفقاً لتعليمات المصنع.
                  </li>
                </ol>
              </div>

              {/* Article 3 */}
              <div className="space-y-1">
                <h4 className="font-bold text-xs underline">البند الثالث: الدعم الفني والصيانة الدورية</h4>
                <ol className="list-decimal list-inside space-y-1 pr-2">
                  <li>
                    يكفل المؤجر تقديم خدمات الصيانة والإصلاحات طوال فترة التأجير. يلتزم المستأجر بإحضار المركبات لمركز الصيانة المعتمد لدى المؤجر كل (10,000 كم) كحد أقصى لعمل الصيانة الدورية. يتحمل المستأجر أي خسائر ناتجة عن تأخره في إجراء الصيانة، بما في ذلك فقدان ضمان الوكيل.
                  </li>
                  <li>
                    يتم تبديل الإطارات على حساب المؤجر كلما قطعت السيارة (50,000 كم). وما يتعدى ذلك يكون على حساب المستأجر. ولا يشمل ذلك الإطارات الناتجة عن سوء الاستخدام أو السير في طرق وعرة.
                  </li>
                  <li>في حالة حدوث عطل، يقوم المستأجر بإبلاغ المؤجر رسمياً، ويتولى المؤجر سحب السيارة وفحصها وإصلاحها في مراكز الصيانة التابعة له.</li>
                  <li>
                    إذا ثبت أن الأعطال ناتجة عن إهمال المستأجر أو عدم التزامه بجدول الصيانة، أو قيامه بإصلاحات خارج مراكز المؤجر المعتمدة، يلتزم المستأجر بدفع تكاليف الإصلاح كاملة دون مرافعة؛ وفي حال النزاع حول سبب العطل، يكون تقرير "وكالة السيارة المعتمدة" هو الفصل بين الطرفين.
                  </li>
                  <li>يلتزم المستأجر بالمحافظة على السيارة، وعدم العبث بأجزائها، والتأكد المستمر من مستوى الزيوت والماء وضغط الإطارات.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Page 1 Footer */}
          <div className="mt-4 pt-2 border-t border-gray-800 text-[10px] font-bold text-gray-800 flex justify-between items-center dir-rtl">
            <div className="flex gap-4">
              <span>ibrahim@albawaba-mq.com</span>
              <span>+966 50 465 3753</span>
            </div>
            <div>Jeddah, Al-Safa District, Prince Mutaib Street</div>
            <div className="font-mono">صفحة 1 من 3</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 2 */}
      {/* ========================================================================= */}
      <div className="relative bg-white text-black w-full max-w-[210mm] mx-auto p-8 rounded-xl border border-gray-300 print:border-none print:shadow-none shadow-xl print-container min-h-[297mm] flex flex-col justify-between overflow-hidden page-break-after: always print:mb-0">
        {/* Background Watermark Image */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
          style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
        >
          <img
            src="/letterheads/express_watermark.jpeg"
            alt="Watermark"
            className="w-[550px] max-w-[85%] max-h-[75%] object-contain opacity-[0.10] select-none mix-blend-multiply"
            style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
          />
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-between space-y-4">
          <div>
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3 mb-4">
              <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                <img
                  src="/letterheads/express_logo.svg"
                  alt="Express Gate Logo"
                  className="max-w-full max-h-full object-contain"
                  style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
                />
              </div>

              <div className="text-right space-y-0.5">
                <h1 className="text-xl font-black text-black tracking-tight">شركة اكسبارس جايت</h1>
                <p className="text-xs font-bold text-gray-700 dir-ltr text-right">Express Gate Company</p>
                <p className="text-xs font-bold text-gray-800">
                  رقم التسجيل الضريبي: <span className="font-mono font-bold">314514350400003</span>
                </p>
              </div>
            </div>

            {/* Articles Page 2 */}
            <div className="space-y-3.5 text-xs font-medium leading-relaxed">
              {/* Article 4 */}
              <div className="space-y-1">
                <h4 className="font-bold text-xs underline">البند الرابع: التأمين وإصلاح الحوادث</h4>
                <ol className="list-decimal list-inside space-y-1 pr-2">
                  <li>السيارات المؤجرة مؤمنة "تأميناً شاملاً" على نفقة المؤجر. ويقر المستأجر باطلاعه على شروط وثيقة التأمين وموافقته عليها.</li>
                  <li>
                    في حالة وقوع حادث، يجب على المستأجر إبلاغ المؤجر فوراً وتسليمه المستندات (تقرير المرور/نجم). لا يجوز للمستأجر إجراء أي تسوية، أو صلح، أو إصلاح دون موافقة المؤجر الكتابية.
                  </li>
                  <li>في حال تعرض السيارة للسرقة وعدم توفر المفتاح الأصلي مع المستأجر، يتحمل المستأجر قيمة السيارة بالكامل.</li>
                  <li>
                    يتحمل المستأجر قيمة "نسبة التحمل" المحددة بوثيقة التأمين بمبلغ (3,000 ريال سعودي غير شاملة ضريبة القيمة المضافة) إذا كان المتسبب بالحوادث بأي نسبة، أو إذا قُيّد الحادث ضد مجهول (طرف واحد).
                  </li>
                  <li>
                    المستأجر مسؤول بالكامل عن أي مخالفات مرورية تُسجل على المركبات في نظام (نجم)، ويتعهد بدفعها أو تفويض المؤجر بخصمها، ويتحمل أي تعويضات تنتج عن مخالفات جسيمة (قطع إشارة، عكس سير، تفحيط ...إلخ) لا يغطيها التأمين.
                  </li>
                </ol>
              </div>

              {/* Article 5 */}
              <div className="space-y-1">
                <h4 className="font-bold text-xs underline">البند الخامس: السيارة البديلة</h4>
                <ol className="list-decimal list-inside space-y-1 pr-2">
                  <li>إذا زادت مدة إصلاح السيارة أو صيانتها عن (3 أيام عمل) ما عدا يوم الجمعة، يتعهد المؤجر بتوفير سيارة بديلة للمستأجر من نفس الفئة.</li>
                  <li>يشترط لتوفير السيارة البديلة في حالة الحوادث أن يقوم المستأجر بإكمال وتفويض كافة الإجراءات والمستندات الرسمية المذكورة في البند الرابع.</li>
                  <li>
                    في حال عدم قيام المؤجر بتوفير سيارة بديلة بعد مرور (يومي عمل) من إشعاره وتسليمه المستندات، يحق للمستأجر استئجار سيارة من نفس الفئة، ويتم خصم قيمتها من الدفعة الشهرية للمركبة المتعطلة (بموجب فواتير رسمية).
                  </li>
                  <li>
                    إذا احتفظ المستأجر بالسيارة البديلة لفترة تزيد عن (يوم عمل كامل) بعد إخطاره بانتهاء صيانة سيارته الأصلية، يلتزم بدفع قيمة الإيجار اليومي للسيارة البديلة عن كل يوم تأخير.
                  </li>
                </ol>
              </div>

              {/* Article 6 */}
              <div className="space-y-1">
                <h4 className="font-bold text-xs underline">البند السادس: استعمال ومسؤولية المستأجر عن السيارة</h4>
                <ol className="list-decimal list-inside space-y-1 pr-2">
                  <li>يتعهد المستأجر بعدم تأجير السيارات من الباطن، وقصر قيادتها على موظفيه والدائمين لديه فقط.</li>
                  <li>يتعهد المستأجر بعدم استخدام السيارات في أي أعمال تخالف الشريعة الإسلامية أو أنظمة المملكة العربية السعودية.</li>
                  <li>يلتزم المستأجر بدفع أي مطالبات مالية حكومية أو غير حكومية تقع على السيارات أثناء فترة العقد، حتى وإن ظهرت تلك المطالبات بعد انتهاء العقد.</li>
                  <li>لا يحق للمستأجر تغيير صفة السيارات أو بيعها أو التنازل عنها، ولا يجوز إخراجها خارج المملكة إلا بموافقة خطية مسبقة من المؤجر.</li>
                  <li>في حال تأخر المستأجر عن سداد الفواتير في موعد استحقاقها، يحق للمؤجر استعادة السيارات والمطالبة بالتعويضات المناسبة.</li>
                </ol>
              </div>

              {/* Article 7 */}
              <div className="space-y-1">
                <h4 className="font-bold text-xs underline">البند السابع: إنهاء الاتفاقية أو الإلغاء المبكر</h4>
                <ol className="list-decimal list-inside space-y-1 pr-2">
                  <li>عقد الإيجار ملزم للطرفين لمدته كاملة (سنة). لا يحق للمستأجر إنهاء الاتفاقية أو رد السيارات قبل نهاية المدة المحـددة.</li>
                  <li>
                    في حال تمسك المستأجر برغبته في إنهاء العقد وإرجاع السيارات مبكراً، يلتزم بدفع مبلغ وقدره (3,450 ريال سعودي شاملة الضريبة) عن كل سيارة كشرط جزائي، بالإضافة إلى تصفية كافة المديونيات المستحقة.
                  </li>
                  <li>يحق للمؤجر فسخ العقد واسترداد السيارات في حال ثبوت إهمال المستأجر وسوء استخدامه المكرر للسيارات، وذلك بعد إنذاره ومنحه مهلة (3 أيام) لتصحيح الوضع.</li>
                  <li>
                    يلتزم المستأجر بإعادة السيارات عند انتهاء العقد بحالتها الطبيعية وفقاً للاستهلاك العادي، ويتحمل تكاليف إصلاح أي أضرار ناتجة عن سوء الاستخدام غير المغطاة بالتأمين.
                  </li>
                </ol>
              </div>

              {/* Article 8 */}
              <div className="space-y-1">
                <h4 className="font-bold text-xs underline">البند الثامن: تفويض واستعادة السيارات المؤجرة</h4>
                <ol className="list-decimal list-inside space-y-1 pr-2">
                  <li>
                    يُفوض المستأجر المؤجر تفويضاً صريحاً ومطلقاً بتتبع واستعادة المركبات المستأجرة بأي وسيلة يراها المؤجر مناسبة (من مكان العمل، المسكن، أو الشارع) دون الحاجة لإصدار أمر قضائي، وذلك في حال تأخر المستأجر عن سداد (قسطين متتاليين) من الإيجار.
                  </li>
                  <li>يخلي المستأجر طرف المؤجر من أي مسؤولية قانونية أو مطالبات تنتج عن عملية سحب السيارات وفقاً لهذا البند، ويتحمل المستأجر تكاليف السحب.</li>
                </ol>
              </div>

              {/* Article 9 */}
              <div className="space-y-1">
                <h4 className="font-bold text-xs underline">البند التاسع: الاختصاص القضائي</h4>
                <p>
                  تخضع هذه الاتفاقية للأنظمة المعمول بها في المملكة العربية السعودية. وفي حال نشوء أي نزاع -لا سمح الله- تعذر حله ودياً، تكون المحاكم المختصة بمدينة جدة هي الجهة المعنية بالنظر والفصل فيه.
                </p>
              </div>

              {/* Article 10 */}
              <div className="space-y-1">
                <h4 className="font-bold text-xs underline">البند العاشر: الضرائب والرسوم الحكومية</h4>
                <p>
                  الأسعار المتفق عليها لا تشمل ضريبة القيمة المضافة (VAT) أو أي رسوم حكومية أخرى. يتم إضافة الضريبة والرسوم تلقائياً على الفواتير وفقاً للأنظمة الصادرة من الجهات المختصة في المملكة.
                </p>
              </div>

              {/* Article 11 */}
              <div className="space-y-1">
                <h4 className="font-bold text-xs underline">البند الحادي عشر: شروط الدفع</h4>
                <p>يتعهد المستأجر (الطرف الثاني) بسداد قيمة الإيجار الشهري للسيارات (مقدماً) في بداية كل شهر ميلادي.</p>
              </div>
            </div>
          </div>

          {/* Page 2 Footer */}
          <div className="mt-4 pt-2 border-t border-gray-800 text-[10px] font-bold text-gray-800 flex justify-between items-center dir-rtl">
            <div className="flex gap-4">
              <span>ibrahim@albawaba-mq.com</span>
              <span>+966 50 465 3753</span>
            </div>
            <div>Jeddah, Al-Safa District, Prince Mutaib Street</div>
            <div className="font-mono">صفحة 2 من 3</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 3 */}
      {/* ========================================================================= */}
      <div className="relative bg-white text-black w-full max-w-[210mm] mx-auto p-8 rounded-xl border border-gray-300 print:border-none print:shadow-none shadow-xl print-container min-h-[297mm] flex flex-col justify-between overflow-hidden">
        {/* Background Watermark Image */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
          style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
        >
          <img
            src="/letterheads/express_watermark.jpeg"
            alt="Watermark"
            className="w-[550px] max-w-[85%] max-h-[75%] object-contain opacity-[0.10] select-none mix-blend-multiply"
            style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
          />
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-between space-y-4">
          <div>
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3 mb-4">
              <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                <img
                  src="/letterheads/express_logo.svg"
                  alt="Express Gate Logo"
                  className="max-w-full max-h-full object-contain"
                  style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
                />
              </div>

              <div className="text-right space-y-0.5">
                <h1 className="text-xl font-black text-black tracking-tight">شركة اكسبارس جايت</h1>
                <p className="text-xs font-bold text-gray-700 dir-ltr text-right">Express Gate Company</p>
                <p className="text-xs font-bold text-gray-800">
                  رقم التسجيل الضريبي: <span className="font-mono font-bold">314514350400003</span>
                </p>
              </div>
            </div>

            {/* Article 12 Header */}
            <div className="space-y-2 mb-4">
              <h4 className="font-bold text-sm underline text-black">البند الثاني عشر: بيانات المركبات المؤجرة</h4>
              <p className="text-xs font-medium">
                يقر الطرفان بأن المركبات محل هذا التعاقد هي الموضحة بياناتها في الجدول أدناه، وتطبق عليها كافة أحكام هذه الاتفاقية:
              </p>
            </div>

            {/* Leased Vehicles Table */}
            <div className="overflow-x-auto border-2 border-black rounded-lg mb-6">
              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-gray-100 text-black font-extrabold border-b-2 border-black">
                  <tr>
                    <th className="border-l border-black p-2 text-center w-10">م</th>
                    <th className="border-l border-black p-2 text-center">رقم اللوحة</th>
                    <th className="border-l border-black p-2 text-center">الرقم التسلسلي</th>
                    <th className="border-l border-black p-2 text-center">رقم الهيكل (Chassis No)</th>
                    <th className="border-l border-black p-2 text-center w-24">سنة الصنع</th>
                    <th className="p-2 text-center">رقم الأصل / التسجيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-black font-mono">
                  {agreement.vehicles && agreement.vehicles.length > 0 ? (
                    agreement.vehicles.map((v, idx) => (
                      <tr key={v.id || idx} className="hover:bg-gray-50 border-b border-black">
                        <td className="border-l border-black p-2 text-center font-bold">{idx + 1}</td>
                        <td className="border-l border-black p-2 text-center font-bold">
                          {v.plateNumberAr || v.plateNumberEn || "أ ط س 1081"}
                        </td>
                        <td className="border-l border-black p-2 text-center font-bold">
                          {v.registrationNumber || v.serialNumber || "280604220"}
                        </td>
                        <td className="border-l border-black p-2 text-center font-bold dir-ltr">
                          {v.chassisNo || v.vin || `LS5A2ASE${idx}TD${914087 + idx}`}
                        </td>
                        <td className="border-l border-black p-2 text-center font-bold">
                          {v.modelYear || "2026"}
                        </td>
                        <td className="p-2 text-center font-bold">{v.assetNumber || `VEH-${idx + 1}`}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-500 font-sans">
                        لا توجد مركبات مسجلة في هذا العقد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Conclusion and Signatures */}
            <div className="space-y-4 mt-6">
              <div className="border border-black p-3 rounded-lg bg-gray-50/70 text-xs font-bold leading-relaxed text-justify">
                <h4 className="font-extrabold text-xs underline mb-1">الخاتمة والتوقيع:</h4>
                <p>
                  تمت قراءة هذه الاتفاقية والموافقة على جميع بنودها. وحُررت من نسختين أصليتين باللغة العربية، تسلم كل طرف نسخة للعمل بموجبها أمام كافة الدوائر الحكومية والقضائية والضريبية.
                </p>
              </div>

              {/* Signature Blocks */}
              <div className="grid grid-cols-2 gap-4 border-2 border-black rounded-xl p-4 bg-white">
                {/* Lessor Signature */}
                <div className="space-y-3 text-xs border-l border-black pl-3">
                  <h4 className="font-black text-sm text-black border-b border-black pb-1">الطرف الأول (المؤجر):</h4>
                  <p className="font-extrabold text-black">{lessorName}</p>
                  <p>الاسم: <span className="font-bold">{lessorRepresentative}</span></p>
                  <p className="pt-2">التوقيع: ...............................................</p>
                  <p className="font-mono">التاريخ: {agreementDateFormatted}</p>
                  <div className="pt-4 text-center border-t border-dashed border-gray-400 mt-2">
                    <span className="text-gray-400 font-bold text-[11px] block">ختم الشركة / الختم الرسمي</span>
                    <div className="h-16 border border-gray-300 rounded-lg mt-1 flex items-center justify-center text-gray-300 font-mono text-[10px]">
                      [الختم الرسمي للمؤجر]
                    </div>
                  </div>
                </div>

                {/* Lessee Signature */}
                <div className="space-y-3 text-xs pr-1">
                  <h4 className="font-black text-sm text-black border-b border-black pb-1">الطرف الثاني (المستأجر):</h4>
                  <p className="font-extrabold text-black">{lesseeName}</p>
                  <p>الاسم: <span className="font-bold">{lesseeRepresentative}</span></p>
                  <p className="pt-2">التوقيع: ...............................................</p>
                  <p className="font-mono">التاريخ: {agreementDateFormatted}</p>
                  <div className="pt-4 text-center border-t border-dashed border-gray-400 mt-2">
                    <span className="text-gray-400 font-bold text-[11px] block">ختم المؤسسة / المستأجر</span>
                    <div className="h-16 border border-gray-300 rounded-lg mt-1 flex items-center justify-center text-gray-300 font-mono text-[10px]">
                      [ختم الكفيل المستأجر]
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Page 3 Footer */}
          <div className="mt-4 pt-2 border-t border-gray-800 text-[10px] font-bold text-gray-800 flex justify-between items-center dir-rtl">
            <div className="flex gap-4">
              <span>ibrahim@albawaba-mq.com</span>
              <span>+966 50 465 3753</span>
            </div>
            <div>Jeddah, Al-Safa District, Prince Mutaib Street</div>
            <div className="font-mono">صفحة 3 من 3</div>
          </div>
        </div>
      </div>
    </div>
  );
}
