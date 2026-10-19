# مرجع ربط API — خزائن جاهز

هذه العقود مطابقة لـ`JahezTreasuryController` وعقود الخدمة الحالية. اقرأ [الشاشات](01-screens-and-workflows-ar.md) لفهم متى يستدعى كل إجراء. المرجع الكامل لأنواع البيانات: [TypeScript](../jahez-treasury-api-contracts.ts)، و[عميل الطلبات](../jahez-treasury-client.ts).

## 1. القواعد المشتركة

الجذر: `/api/jahez/v3/treasury`.

```http
Authorization: Bearer <access-token>
Content-Type: application/json
Idempotency-Key: <key-for-this-command>
```

`Content-Type` عند إرسال JSON، و`Idempotency-Key` لكل POST وPUT. لا تحتاجه GET. جميع طلبات JSON الناجحة في هذا المتحكم تعيد HTTP 200 والقيمة مباشرة، بدون غلاف `data` أو `isSuccess`. تنزيل التقرير يعيد ملفاً ثنائياً.

الحقول بصيغة camelCase، والـenums أرقام. المبالغ JSON numbers وليست نصوصاً منسقة بفواصل أو رمز عملة. استخدم دقة هللتين ولا تجعل جمع الكسور العشرية في JavaScript المرجع المالي النهائي. المعرفات strings داخل الربط فقط. `rowVersion` سلسلة Base64 معتمة: خزّنها وأعد إرسالها كما وردت، ولا تفكها أو تولدها في المتصفح.

`DateOnly`: مثل `2026-10-06` بدون منطقة زمنية. `Instant`: مثل `2026-10-06T20:00:00Z`. اعرض الطوابع الزمنية في الرياض. نطاق التقرير من بداية `fromDate` إلى نهاية `toDate` بتوقيت الرياض، والتاريخان مطلوبان حتى لتقرير المحضر.

### إعادة المحاولة والتزامن

أنشئ مفتاحاً واحداً عند تثبيت محتوى الأمر. الاحتفاظ به في حالة النموذج يمنع النقر المزدوج أو انقطاع الشبكة من تكرار الأثر المالي. نفس المفتاح مع نفس الأمر والمحتوى يعيد النتيجة المحفوظة، ونفس المفتاح مع محتوى مختلف يسبب 409. لا تنشئ مفتاحاً جديداً لمجرد انتهاء مهلة الشبكة.

عند تغيير مبلغ أو نسخة أو سبب، فهذا محتوى جديد: أعد التحميل عند الحاجة، ثم استخدم مفتاحاً جديداً للإجراء المصحح. التعارض المتزامن القابل لإعادة المحاولة دون تعديل المحتوى يمكن إعادته بالمفتاح نفسه. فحص الصلاحية يظل سارياً عند إعادة الطلب؛ لا تعتبر الاستجابة القديمة تصريحاً دائماً.

### الترقيم والفلاتر

`TreasuryFilter`:

| الحقل | النوع | المعنى |
|---|---|---|
| `fromDate` / `toDate` | DateOnly مطلوبان | تاريخ بداية ونهاية، بترتيب صحيح |
| `subAccountId` | معرف اختياري | حساب ترحيل بعينه، وليس كل أبناء حساب تجميعي |
| `sponsorId` | معرف اختياري | كفيل الملكية |
| `purpose` | TreasuryPurpose اختياري | غرض الحساب المالي؛ ليس غرض حركة V2 |
| `page` | عدد، افتراضي 1 | بين 1 و100000 |
| `pageSize` | عدد، افتراضي 50 | بين 1 و100 |

الصفحات العامة تعيد `{items, page, pageSize}` **بدون `totalCount` أو `hasMore`**. استخدم السابق/التالي؛ الصفحة ذات عدد أقل من الحجم تعني النهاية، وإذا امتلأت يمكن طلب التالية وقد تكون فارغة. لا تعرض عدد صفحات نهائياً مخترعاً. التقارير وحدها تعيد `totalMovements` وفق تعريفها في [دليل التقارير](03-reports-and-exports-ar.md).

## 2. القيم الثابتة

| النوع | القيم |
|---|---|
| `TreasuryLocation` | Supervisor=1، Central=2، Bank=3، PetroApp=4 |
| `TreasuryPurpose` | Settlement=1، AccountFee=2، Combined=3 |
| `TreasuryDirections` | InOnly=1، OutOnly=2، Dual=3 |
| `TreasuryEntryKind` | Business=1، Transfer=2، Opening=3، Adjustment=4، Reversal=5 |
| `TreasurySource` | Fee=1، Operation=2، Debt=3، Movement=4 |
| `PetroEvidenceKind` | Funding=1، Statement=2 |
| حالة التسليم | Pending=1، Confirmed=2، Cancelled=3 |
| `JahezMoneyFund` القديم | Cashbox=1، PetroApp=2، Bank=3، بدون تغيير |
| غرض حركة V2 | Settlement=1، Fuel=2، AccountFee=3، TransferredDebtRepayment=4 |

خصوصاً: PetroApp في **الموقع المالي =4**، وفي **صندوق V2 =2**. AccountFee في غرض الحساب المالي =2، وفي غرض الحركة =3. استخدم enums منفصلة ولا تنقل الرقم بينهما مباشرة.

## 3. الحسابات والأرصدة والدفتر

| الطريقة والمسار بعد الجذر | الطلب | الاستجابة | الصلاحية |
|---|---|---|---|
| GET `accounts` | بدون body | `TreasuryAccount[]` | treasury.read |
| POST `accounts` | `TreasuryAccountCreate` | `TreasuryAccount` | treasury.accounts.create |
| PUT `accounts/{id}` | `TreasuryAccountUpdate` | `TreasuryAccount` | treasury.accounts.update |
| GET `balances` | بدون فلاتر | `TreasuryBalance[]` | treasury.read |
| GET `journal` | TreasuryFilter في query | `Page<TreasuryJournalRow>` | treasury.read |

أسماء الصلاحيات المختصرة في الجداول تبدأ بـ`jahez.`، إلا `financial-reports.*` التي تبدأ كذلك بـ`jahez.`.

حقول الإنشاء: `{code,nameAr,nameEn,parentId,sponsorId,location,purpose,allowedDirections,isDefault?}`. التعديل: `{nameAr,nameEn,isActive,rowVersion}`. لا يوجد DELETE أو تعديل ملكية الحساب.

`TreasuryAccount` يعيد حقول التعريف السابقة إضافة إلى `id,isPosting,isDefault,isActive,rowVersion` وحقول التدقيق. `TreasuryBalance` يعيد `{subAccountId,code,nameAr,parentId,sponsorId,location,isPosting,balance}`. لا تعيد الأرصدة رصيداً متاحاً للصرف أو رصيداً محجوزاً منفصلاً.

`TreasuryJournalRow`:

| الحقول | استخدامها |
|---|---|
| `posting` | القيد نفسه: الموقع الحسابي والكفيل والمبلغ الموقع ونوع القيد ووقته ومرجعه وسببه ومنفذه |
| `accountCode, accountNameAr, sponsorNameAr` | تسميات العرض؛ استخدم الاسم بدلاً من المعرف |
| `driverId, driverNameAr, iqamaNo` | المندوب الفعلي إذا كانت الحركة تخص مندوباً |
| `platformAccountId, operationId, transferredDebtId` | روابط داخلية للسجلات الأصلية، nullable |
| `businessPurpose` | غرض حركة V2 عند وجود حركة أصلية |
| `isReconciled` | حالة إدراج وتسوية الحركة |

`posting` يحتوي `id,subAccountId,sponsorId,moneyMovementId,cashboxHandoverId,batchId,revision,reversesPostingId,kind,amount,occurredAtUtc,actorUserId,actorNameAr,reference,reason,createdAtUtc,createdByUserId`. لا تعرض المعرفات أو `batchId` للمستخدم، واستخدمها داخلياً لروابط التفاصيل والتصحيح. قيود التاريخ append-only ولا تحمل `rowVersion` كتحديث قابل للتحرير.

## 4. التحويل والقبض والصرف والعكس

| الطريقة والمسار | Body | الاستجابة | الصلاحية |
|---|---|---|---|
| POST `transfers` | `{fromAccountId,toAccountId,amount,reference,reason,occurredAtUtc?}` | string: معرف الربط الداخلي | treasury.transfers.create |
| POST `cash-entries` | `{subAccountId,amount,kind,reference,reason,occurredAtUtc?}` | `TreasuryPosting` | treasury.entries.create إذا Business؛ وإلا treasury.adjust |
| POST `reversals` | `{postingId,reference,reason}` | string: معرف الربط الداخلي | treasury.adjust |

المرجع مطلوب حتى 500 حرف، والسبب مطلوب حتى 2000 حرف. التحويل موجب، وحركة القبض/الصرف مبلغ موقع غير صفر. الأنواع المقبولة في `cash-entries`: 1 أو3 أو4 فقط. لا ترسل Transfer أوReversal إلى هذه الواجهة.

في التشغيل بعد التفعيل احذف `occurredAtUtc` من الطلب؛ إرسال وقت مخصص مرفوض. شروط الحسابات والرصيد موضحة في [الشاشات](01-screens-and-workflows-ar.md). الاتجاه المقيد للحساب يحكم الحركة التجارية، وليس شرطاً لإلغاء طرف التحويل الداخلي المصرح.

مثال TypeScript يستخدم معرفات مأخوذة من حسابات API، وليس أسماء ترسل مكانها:

```ts
import { createJahezTreasuryClient } from '../jahez-treasury-client';
import { TreasuryLocation, TreasuryPurpose } from '../jahez-treasury-api-contracts';

const treasury = createJahezTreasuryClient(apiBase, () => accessToken);
const accounts = await treasury.accounts();
const source = accounts.find(a => a.isPosting && a.isActive &&
  a.sponsorId === selectedSponsorId && a.location === TreasuryLocation.Central &&
  (a.purpose === TreasuryPurpose.Settlement || a.purpose === TreasuryPurpose.Combined));
const destination = accounts.find(a => a.isPosting && a.isActive &&
  a.sponsorId === selectedSponsorId && a.location === TreasuryLocation.Supervisor &&
  a.purpose === TreasuryPurpose.Settlement && a.isDefault);
if (!source || !destination) throw new Error('حسابات التمويل غير مهيأة');

// Store this key with the frozen payload until its result is known.
const commandKey = crypto.randomUUID();
await treasury.transfer({
  fromAccountId: source.id, toAccountId: destination.id, amount: 500,
  reference: 'تمويل تشغيل أكتوبر / سند 15', reason: 'توفير نقدية تصفيات البوابة',
}, commandKey);
```

## 5. التسليمات

| الطريقة والمسار | المدخلات | الاستجابة | الصلاحية |
|---|---|---|---|
| GET `handovers/preview` | query: `businessDate` | `TreasuryHandoverPreview` | cashbox.read |
| GET `handovers` | query: `page=1&pageSize=50` | `Page<TreasuryHandover>`، نسخ V3 | cashbox.read |
| GET `handovers/{id}` | معرف المحضر | `TreasuryHandoverDetail` | cashbox.read |
| POST `handovers` | `{businessDate,reason}` | `TreasuryHandoverDetail` | cashbox.submit |
| POST `handovers/{id}/confirm` | `{cashCounts:[{subAccountId,amount}],reason,rowVersion}` | `TreasuryHandoverDetail` | cashbox.confirm |
| POST `handovers/{id}/cancel` | `{reason,rowVersion}` | `TreasuryHandoverDetail` | cashbox.submit، ومقدم المحضر نفسه |

القائمة لا تقبل فلاتر كفيل أو حالة أو تاريخ من الخادم حالياً. لا توحِ للمستخدم أن تصفية صفحة محلية تطبق على كل التاريخ. قراءة التفاصيل يمكن أن ترجع محضراً قديماً، لكن قائمة V3 تعيد `treasuryVersion=3` فقط.

`TreasuryHandoverPreview` يعيد `{businessDate,lines,physicalCash,bankActivity,petroAppActivity,movementCount}`. ليس فيه `rowVersion` للمعاينة. `TreasuryHandoverDetail` يعيد `{handover,lines}`.

حقول `handover` المهمة: `id,treasuryVersion,documentNumber,businessDate,status,requestedByUserId,requestedByNameAr,cashboxAmount,petroAppAmount,bankAmount,movementCount,reason,accountantUserId,accountantNameAr,confirmedAtUtc,confirmationReason,cancelledAtUtc,cancellationReason,rowVersion,createdAtUtc` وبقية التدقيق.

السطر يعيد `{id,handoverId,subAccountId,accountCode,accountNameAr,sponsorId,sponsorNameAr,sponsorIdentifier,amount,movementCount,createdAtUtc,createdByUserId}`. في المعاينة معرفات السطور/المحضر ليست مستندات معتمدة؛ لا تعتمد عليها لإنشاء الطلب. اربط الحساب لمعرفة الموقع والغرض، واحتفظ بالسطور المثبتة من استجابة التقديم.

مثال إعداد payload التأكيد من مبالغ **أدخلها المحاسب**:

```ts
const detail = await treasury.handover(handoverId);
const accountsById = new Map((await treasury.accounts()).map(a => [a.id, a]));
const cashLines = detail.lines.filter(line => {
  const account = accountsById.get(line.subAccountId);
  if (!account) throw new Error('تعذر تحديد حساب سطر التسليم');
  return account.location === TreasuryLocation.Supervisor;
});
const cashCounts = cashLines.map(line => {
  const actual = countedAmounts.get(line.subAccountId); // UI state after physical counting
  if (actual === undefined || actual !== line.amount)
    throw new Error('يجب مطابقة كل حساب نقدي على حدة');
  return { subAccountId: line.subAccountId, amount: actual };
});
await treasury.confirmHandover(handoverId, {
  cashCounts, reason: confirmationReason, rowVersion: detail.handover.rowVersion,
}, confirmationCommandKey);
```

لا تحذف سطراً نقدياً صفرياً، ولا تمرر السطور الرقمية. إذا كان المحضر يحتوي نشاطاً رقمياً فقط فقد تكون `cashCounts=[]`؛ الخادم يحدد المطابقة. لا ترسل هوية المحاسب من المتصفح؛ تؤخذ من الجلسة المصادق عليها.

## 6. أدلة بترو آب

| الطريقة والمسار | المدخلات | الاستجابة | الصلاحية |
|---|---|---|---|
| GET `petroapp/evidence` | TreasuryFilter | `Page<PetroEvidence>` | treasury.read |
| POST `petroapp/evidence` | `PetroEvidenceCreate` | `PetroEvidence` | treasury.petroapp-evidence.create |

على الرغم من اشتراكه في نوع الفلتر، مسار الأدلة يستخدم التاريخ والكفيل والترقيم فقط؛ `subAccountId` و`purpose` لا يرشحان أدلة المحفظة. لا تعرضهما كفلاتر فعالة لتلك القائمة.

```json
{
  "sponsorId": "<selected-sponsor-id-from-api>",
  "kind": 1,
  "businessDate": "2026-10-06",
  "amount": 1000,
  "allocatedCollections": 900,
  "reference": "إشعار تمويل المحفظة / 42",
  "reason": "إثبات التمويل وفق إشعار المحفظة",
  "replacesId": null
}
```

النص بين `<...>` عنصر توضيحي يجب استبداله بالمعرف الحقيقي في الربط، ولا يعرض كاسم للمستخدم. التمويل والتخصيص غير سالبين. في `kind=2` المبلغ رصيد بيان وتخصيص التحصيل صفر. الاستجابة تزيد `id` والتدقيق، وتحفظ `replacesId` أوnull. لا ينشئ الطلب قيد قبض مندوب أو تحويلاً للخزينة.

## 7. التقارير والتنزيل

| الطريقة والمسار | المدخلات | الاستجابة | الصلاحية |
|---|---|---|---|
| GET `reports/{type}` | TreasuryFilter و`handoverId?` | `TreasuryReport` | financial-reports.read |
| GET `reports/{type}/export` | نفس الفلاتر و`format=xlsx` أو`pdf` | ملف | financial-reports.read + financial-reports.export |

`type`: `movements`, `subaccounts`, `trading`, `petroapp`, `handover`. المحضر يحتاج `handoverId` مؤكداً. تفاصيل حقول JSON والحسابات والتنزيل في [الملف الثالث](03-reports-and-exports-ar.md).

## 8. أدوات الترحيل — مالية مخولة فقط

كل هذه المسارات تتطلب `jahez.treasury.adjust`. لا تستدعها عند تحميل شاشة مشرف عادية.

| الطريقة والمسار | المدخلات | الاستجابة |
|---|---|---|
| GET `migration/readiness` | لا شيء | `TreasuryReadiness` |
| GET `migration/attribution-review` | `page,pageSize` | `Page<TreasuryAttributionReview>` |
| POST `migration/attributions` | `{source,sourceId,sponsorId,evidence}` | `TreasuryOwnership` |
| POST `migration/backfill` | `{reason}` | عدد الحركات المرحلة في الدفعة |
| POST `migration/balance-verifications` | `{subAccountId,balance,reference,reason}` | `TreasuryVerification` |
| POST `migration/activate` | `{rowVersion,reason}` | `TreasuryState` |

`TreasuryReadiness`: `isActive,rowVersion,unresolvedMovements,unresolvedFees,unresolvedExecutedOperations,pendingLegacyHandovers,unverifiedAccounts`. حقل unresolvedMovements يشمل الملكيات غير المحسومة للحركات والديون. اسم pendingLegacyHandovers مستخدم في العقد؛ الاستعلام الحالي يعد كل المحاضر المعلقة، فلا تستخدمه كحصر مضمون لنسخ V2.

`unverifiedAccounts` معرفات حسابات داخلية؛ حولها إلى أسماء عبر `accounts`. `TreasuryAttributionReview` يعيد `source,sourceId,platformAccountId,currentSponsorId,requiresFinanceDecision,evidenceJson`. اعرض الكفيل الحالي للمقارنة فقط، ولا تملأ به قرار التاريخ تلقائياً. تحليل evidenceJson يكون دفاعياً، وقد يحتاج مراجع إضافية من النسخ الاحتياطية.

دليل قرار الملكية مطلوب حتى 2000 حرف. راجع رسوم الأصل وتصفياته أولاً؛ ملكية الدين تتبع الأصل ولا تقبل قراراً متناقضاً معه. الترحيل حتى 500 حركة و100 محضر في الدفعة. الطلب المعاد بمفتاحه يعيد العدد نفسه؛ الدفعة التالية تحتاج مفتاحاً جديداً. العدد صفر وحده ليس علامة جاهزية أو نهاية مراجعة الملكية.

إثبات الرصيد لا يغيره: `balance` يجب أن يساوي الدفتر الفعلي وأن يكون غير سالب. تغيير القيود بعد الإثبات قد يجعل الحساب يحتاج إثباتاً جديداً. التفعيل يتطلب مراجعة مكتملة، وكل الحركات والمحاضر القديمة المعاد بناؤها، وإثبات جميع الحسابات النشطة حتى الصفرية. عدادات readiness ليست بديلاً عن تحقق activate النهائي، الذي يمكن أن يرفض متطلبات ترحيل إضافية.

لا توجد واجهة تعطيل بعد التفعيل. هذه أدوات انتقال يدوية، ولا ينبغي ربطها بمؤقت أو تشغيل تلقائي عند كل تحميل. تفاصيل التمويل التاريخي ومسؤولية المطابقة في [دليل الترحيل](../jahez-treasury-v3-ar.md).

## 9. معالجة الأخطاء

الشكل المعتاد لأخطاء العمل:

```json
{
  "type": "https://httpstatuses.io/409",
  "title": "تعارض في البيانات",
  "status": 409,
  "detail": "الرصيد المتاح لهذا الكفيل غير كافٍ أو محجوز للتسليم؛ سجل التمويل أولاً.",
  "instance": "/api/jahez/v3/treasury/transfers",
  "errorCode": "jahez.conflict",
  "correlationId": "<support-correlation-reference>"
}
```

قد توجد `field` أوتفاصيل تحقق، وقد تختلف أخطاء ربط ASP.NET أو المصادقة عن هذا الشكل. اقرأ body بحذر، واحتفظ برسالة بديلة إذا لم يكن JSON. العميل المرفق يرمي `TreasuryApiError` مع `status` و`problem` ولا يختار نص الإشعار تلقائياً.

| الحالة | سلوك الواجهة |
|---|---|
| 400 / `jahez.invalid_request` | أظهر detail في النموذج؛ صحح الحقل، لا تعاود بلا تعديل |
| 401 | اتبع دورة تجديد الدخول الحالية؛ لا تعلن نجاح الأمر |
| 403 / `jahez.forbidden` | رسالة رفض صلاحية/نطاق؛ راجع الأزرار والجلسة |
| 404 / `jahez.not_found` | السجل غير متاح؛ أعد القائمة |
| 409 / `jahez.conflict` | اعرض السبب وأعد البيانات اللازمة؛ تعارض التمويل ليس تعارض نسخة فقط |
| خطأ شبكة/5xx | احتفظ بالمفتاح والمحتوى، واعرض إعادة محاولة ورقم تتبع عند توفره |

أسباب 409 تتضمن عدم التفعيل، عدم التمويل، الرصيد المحجوز، كفيل تغير بعد إعداد عملية V2، حساب افتراضي متداخل، طلب تسليم معلق، نسخة قديمة، مرجع بترو آب مكرر، وقيد مقفل. لا يوجد رمز فرعي مختلف ثابت لكل سبب في هذه الإضافة؛ لا تبنِ قرارات مالية على مطابقة جملة عربية.

استثناء ترقية V2: الرسالة تحتوي `treasury_upgrade_required` داخل `detail`، بينما `errorCode` يبقى `jahez.conflict`. وجّه المستخدم إلى شاشة تسليم V3 ولا تكرر كتابة V2. لا تتوقع errorCode باسم `treasury_upgrade_required`.

## 10. حدود التكامل الحالية

لا تفترض وجود بحث خادمي جديد في المحاضر أو webhook أو live updates أو totalCount عام أو reservedBalance أو رفع مرفقات دليل أو شهادة توقيع رقمية. استخدم التحديث بعد الأوامر وزر تحديث يدوي. إذا احتاجت الواجهة قدرة إضافية، سجلها كتغيير عقد منفصل؛ لا تعرض وظيفة شكلية على أنها مدعومة.
