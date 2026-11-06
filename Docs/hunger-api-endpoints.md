# هنقرستيشن — عقود API

تنفيذ Backend فقط. المسار الأساسي `/api/hunger`. يلزم تفعيل `Features:Hunger`؛ المسارات المالية تحتاج أيضًا `Features:HungerFinance`. المصادقة والصلاحيات ونطاق منصة HUNGER تتحقق خادميًا. الأخطاء المتوقعة تستخدم ProblemDetails، والتزامن/المعاينة القديمة يعيدان 409.

## Remaining backend contracts (Task 5)

| Method | Path | Permission / behavior |
|---|---|---|
| GET | `/accounts/template` | `hunger.accounts.import`; complete Sheet1 account input template |
| POST | `/accounts/imports/{previewId}/confirm` | `hunger.accounts.import` plus existing field grants; **JSON resolutions required**, see below |
| GET | `/accounts/deferred-reminders?dueThrough=2026-11-04` | `hunger.read`; due/overdue deferred accounts, sorted by due date then external ID/GUID |
| GET | `/accounts/export?format=xlsx` | `hunger.performance.export` plus `hunger.read`; all matching accounts; also supports `format=csv` |
| GET | `/wallets?page=1&pageSize=50` | `hunger.finance.read`; observed per-account balances and effective receipt totals |
| GET | `/wallets/export?format=csv` | `hunger.finance.read`; all matching wallets, CSV or XLSX |
| GET | `/accounts/{accountId}/wallet-history?page=1&pageSize=50` | `hunger.finance.read`; account financial events, associated remittance/confirmation/reversal events and wallet observations |

Account preview row statuses: `New` (valid account absent), `Unchanged`, `ChangedField`, `ConflictingOwner`, `MissingAccount` (absent with unresolved prerequisites). Each row includes `platformId`, `matchedAccountId`, `changes[]` with `field/existing/incoming`, `error`, and the independent `assignmentIssue`. Errors do not disappear when a row needs review. No employee is created and an unresolved source rider never creates an assignment.

Confirmation body example:

```json
{"resolutions":[{"rowNumber":2,"action":"Create"},{"rowNumber":3,"action":"Keep"},{"rowNumber":4,"action":"Update"},{"rowNumber":5,"action":"ReplaceOwner"},{"rowNumber":6,"action":"Skip"}]}
```

Every preview row needs exactly one decision, including unchanged and rejected rows. `Create` requires no existing match, known owner/city and a permitted platform (an optional resolution `platformId` supplies an otherwise unresolved platform). `Update` accepts changed fields only. `ReplaceOwner` explicitly resolves a conflicting owner and applies the displayed incoming field values. `Keep` preserves an existing account; `Skip` writes no business data for that row. Rejected rows can only be skipped. Duplicated/missing/unknown decisions reject the entire confirmation before mutation. Revalidation covers accounts, employees, rider profiles, city mappings, details and assignments. A stale/expired preview returns 409. Same-preview replay requires the same canonical decisions and returns the durable result; changed decisions return 409. Creation uses a stable database GUID and an independent unique internal code; it never opens a rider assignment. Wallet review/confirm remains mandatory for assignment, with either balance sign allowed and **no special negative-balance approval**.

`dueThrough` defaults to today's Riyadh date and cannot be in the future. Reminder results contain account/platform IDs, external ID, due date and overdue days. The registered trusted job hook `IHungerDeferredReminderQuery.FindDueAsync(platformId, dueThrough, ct)` works without an HTTP current user and validates the explicit Hunger platform and feature flag. It shares the endpoint's query. Neither call changes disposition, grants activation, sends messages, nor creates assignments. Scheduling a job is independent of this read hook; manual audited disposition activation remains required.

Wallet filters accept all account filters under `accounts.*` (for example `accounts.ownerIqama`, `accounts.actualRiderIqama`, `accounts.operatingCityId`) plus inclusive `balanceFrom`, `balanceThrough`, `balanceEqual`, and `receiptState=None|Pending|PartiallyConfirmed|Confirmed`. All filters combine with AND before count, pagination and export. Account export accepts the same flat account filters as `/accounts`. Added account filters include actual rider ID/name/iqama/phone; source rider name/iqama; sponsor ID/name; payment/compensation models; source status; usage status; latest quality segment; inclusive quality rank/score ranges, score equality; and deferred date ranges. A missing observed value does not satisfy a numeric comparison.

Wallet `mobileBalance` is the latest dated wallet-review observation, with `observedOn` and evidence. It is **not** a live platform balance or an inferred sum of unrelated treasury movements. No observation means null, including for calculated period/attributed balances. Prior-close evidence and matched adjustments produce the period analysis; unknown prior close remains null. Restricted rights remain separately displayed. Receipt totals use effective remittance-line confirmed amounts, so reversals reduce confirmed receipts. A company withdrawal becomes confirmed on proven arrival; a supervisor withdrawal remains pending remittance after arrival. `pendingArrival` is separate from `pendingReceipts`; neither replenishes charging custody. History event amounts retain their original event scope (a batch may span multiple accounts); observation and event lists each have independent totals and use the requested page. Exports contain the wallet snapshot, including evidence and observation date, with no credentials.

All supported workbook input tables now have templates: `/accounts/template` (Sheet1), `/quality/template` (Quality MTD), `/operations/template` (daily operations). Each has the existing preview and confirm route; derived reports are not import targets. JSON financial actions remain their documented typed action contracts, not new spreadsheet import surfaces. Account template identity/phone columns use text formatting. CSV uses UTF-8 BOM, quotes fields and escapes formula-like user text; XLSX writes text values without formulas.

Quality/operation exports accept `riderId` with the same allocation membership rule as their report endpoint, and optional `accounts.*` filters. Operation export also accepts exact, case-insensitive `captainClassification`. Performance report/export share `accounts.*` in `HungerPerformanceQuery` alongside their existing rider/city/sponsor/vehicle/target filters. Source quality/operation columns retain **account source metrics** even when filtered by a rider; performance `groupBy=rider` exports attributed rider metrics. No account totals are relabeled as rider totals.

Daily operations add optional `CaptainClassification` (up to 100 characters) to template, input, persistence, operation report and export. It is the original source label on `reportDate`, independent from quality `segment`, internal catalog results and NoShow. Legacy workbooks may omit it; null stays unknown. Reimport with a different classification conflicts instead of overwriting. No classification or NoShow count posts a monetary penalty without the separate invoice evidence workflow.

The verification runner's `--verify-accounts` mode reads **every 100-row page**, checks stable count and unique account IDs, and summarizes all rows; no workbook option is needed for verification. Apply mode now requires `--resolutions <reviewed-json-file>` and emits classified preview rows for review. This task does not run that hosted import tool against an external database.

Disposable finance concurrency tests are enabled with `LOGISTICS_HUNGER_SQL_TESTS=1` and optional `LOGISTICS_HUNGER_SQL_TEST_CONNECTION`, or the existing `HUNGER_SQL_TEST_SERVER`. Every test overrides the database name with a random `LogisticsHungerFinanceTest_*` catalog, uses SQL Server schema/rowversions/application locks, independent contexts and concurrent calls, and deletes only its own database. Without opt-in they are reported skipped. Covered races: duplicate wallet confirm, duplicate withdrawal arrival, and competing partial receipt confirmations exceeding the remainder.

## Shared account context and filters (Task 3)

`GET /api/hunger/accounts` uses the shared platform business context, authorized by scoped `hunger.read`. No extra platform-read grant is required. Optional `from`/`through` are inclusive Saudi dates, defaulting to this month's first day and today. Reversed/future ranges and ranges over 366 days return 400. Dates select vehicle/SIM context; existing assignment, person, status and monthly usage fields retain their current-list meaning.

`actualVehiclePeriods` intersects platform assignments with fleet custody using half-open UTC intervals (`fromUtc`, `throughUtc`). Substitute custody resolves `RealRider.iqamaNo` to an employee/rider profile; ambiguous identities and overlapping custody remain unknown. `actualVehicleOwnership` is `Company`, `Private`, `Mixed` or `Unknown`. Verified gaps have `Private` ownership without inventing a type or plate. The separate `actualVehicleCustodyStatus` is `None` for verified absence, `Assigned` for one vehicle, `Mixed` for multiple vehicles or vehicle/gap periods, and `Unknown` for missing assignment evidence or conflicting custody. Type/plate summarize period values with `Mixed` when values differ. No manufacturer is returned. `contextVerifiedAtUtc` records the read time. Registered type/plate/serial remain independent.

`simOwnership` comes from normalized phone matching and ownership history. `sim` returns `simId`, `ownership`, `responsibleEmployeeId`, `holderRiderProfileId`, `carrier`, `reason` and dated `ownershipPeriods` with evidence. `simHolder` and `simResponsibleEmployee` resolve the people independently. Multiple distinct holders return no single holder with an explanation; duplicate phone mapping returns `Unknown`. `sourceSimOwnership` preserves the imported label as source data. An absent SIM is `Private` only when `Features:VerifiedCompanySimRegistry` explicitly enables the verified-registry policy; otherwise it is `Unknown`.

Filters combine with AND **before** total count and pagination. Text filters trim the search and use case-insensitive contains. State filters use case-insensitive equality; IDs use equality. Empty text is ignored. `disposition` remains a compatibility alias for `operationalDisposition` and takes precedence when supplied. Reads are batched across authorized accounts before filtering.

| Group | Query parameters |
|---|---|
| Account | `externalAccountId`, `accountCode` |
| Owner | `ownerEmployeeId`, `ownerName`, `ownerNameEn`, `ownerIqama`, `ownerPhone`, `ownerNationality`, `ownerEmployeeStatus`, `ownerRelationshipType` |
| Registration | `phoneNumber`, `operatingCityId`, `operatingCityNameAr`, `registryIdentifier`, `settlementModel` |
| Registered vehicle | `registeredVehicleType`, `registeredVehiclePlate`, `registeredVehicleSerial` |
| Actual vehicle | `actualVehicleType`, `actualVehiclePlate`, `actualVehicleOwnership` (state), `actualVehicleCustodyStatus` (state) |
| SIM | `simOwnership` (state), `sourceSimOwnership`, `simResponsibleEmployeeId`, `simHolderRiderProfileId`, `simResponsibleName`, `simResponsibleIqama`, `simResponsiblePhone`, `simHolderName`, `simHolderIqama`, `simHolderPhone` |
| Account state | `operationalDisposition` (state), `assignmentStatus` (state) |

Example: `/api/hunger/accounts?from=2026-11-01&through=2026-11-04&ownerName=Ahmed&actualVehicleCustodyStatus=None&simOwnership=Company&page=1&pageSize=50`.

`fleet.vehicles.fields.identity` is a separate sensitive permission, seeded to SystemAdmin only. Existing vehicle changes to asset/VIN/type/model/manufacturer and identity corrections require it when identity changes; registration transitions require it alongside their existing action permission. Existing plate/serial correction rules remain in force. Creation and the create-only import keep their current authorization behavior. No blanket grant is added to other roles, and this permission does not authorize changes to a platform account's registered vehicle.

## الحسابات والتأسيس

| Method | المسار | الوظيفة |
|---|---|---|
| GET | `/accounts?disposition=&page=1&pageSize=50` | الحسابات، صاحب الحساب، المستخدم الوارد في المصدر والمستخدم المكلف فعليًا كحقول مستقلة |
| POST | `/accounts/imports/preview` | multipart: `file`؛ مطابقة Sheet1 بالإقامة ورقم معرف المنصة |
| POST | `/accounts/imports/{previewId}/confirm` | اعتماد أصحاب الحسابات وبيانات المصدر؛ لا يفتح تكليفات مالية تلقائيًا |
| PUT | `/accounts/{accountId}/disposition` | `disposition, reason, deferredUntil, rowVersion` |

التصنيفات: `Normal`, `Problem`, `AdministrativeStop`, `Blocked`, `DeferredNextMonth`. التفعيل يدوي. إيقاف الحساب لا يمحو تكليفًا أو ينشئ حركة مالية. راجع [قواعد الاستيراد](hunger-import-rules.md).

تعيد عناصر قائمة الحسابات أيضًا `owner` و`actualRider` و`sourceActualRider`، ويحتوي كل شخص على `employeeId, riderProfileId, nameAr, nameEn, iqamaNo, phoneNumber`. يعرض `actualRider` التكليف النشط فقط؛ ويعرض `sourceActualRider` المستخدم المطابق في الملف حتى إذا لم يُنشأ التكليف. تتضمن العناصر معلومات المدينة والسجل والهاتف والتسوية والشريحة والمركبة المسجلة وبيانات التكليف وسبب الحالة. الحساب بلا تصنيف موثق يعاد `Unknown` بدل افتراض `Normal`.

حقول إضافية: `currentAssignmentId`, `assignmentFrom`, `assignmentRowVersion`, `compensationModel`, `paymentModel`, `accountCode`, `operatingCityId`, `operatingCityNameAr`, `sponsorId`, `sponsorNameAr`, `simOwnership`, `registeredVehiclePlate`, `registeredVehicleSerial`, `actualVehicleType`, `actualVehiclePlate`, `actualVehicleOwnership`, `sourceVehicleDescription`, `sourceAssignmentFrom`, `dispositionReason`, `monthlyUsageStatus`, `usageMonth`, `latestQualitySegment`, `latestQualityRank`, `latestQualityScore`, `latestQualityReportDate`, `hasPassword`, `lastAssignmentEvent`, `lastAssignmentEventAtUtc`. كائنات الأشخاص تضيف `nationality`, `employeeStatus`, `relationshipType`. لا تعاد كلمة المرور في القائمة.

يمكن أن تكون حالة استخدام الشهر `Used` بدليل تكليف فعلي (`monthlyUsageSource=Assignment`) أو بدليل مستورد مسجل في الشهر يشير إلى حساب يعمل وهوية مستخدم وتاريخ استلام وصل (`ImportedSource`). لا يلزم أن تكون هوية المستخدم مطابقة حتى تشير حالة التشغيل المثبتة في المصدر إلى الاستخدام؛ في هذه الحالة لا ينشأ ملف شخص تلقائيًا. الدليل المستورد لا ينشئ تكليفًا فعليًا؛ يظل `actualRider` و`assignmentStatus` معبرين عن بيانات التكليف الحقيقي، و`sourceActualRider` عن الملف. لا يتكرر استنتاج الاستخدام تلقائيًا في شهر لاحق دون دليل جديد؛ يعاد `Unknown` عندما لا يوجد دليل حديث أو تكليف للشهر.

`reportedCurrentRider` يعرض المندوب النشط المثبت، وإن لم يوجد يعرض مستخدم الملف للحساب العامل فقط. `currentRiderSource` يوضح `Assignment` أو `ImportedSource` أو `None`، ولا يغير أي تكليف أو واقعة مالية.

## الجودة والتشغيل

| Method | المسار | المدخلات الأساسية |
|---|---|---|
| GET | `/quality/template` | تنزيل قالب الجودة التراكمي |
| POST | `/quality/imports/preview` | multipart: `file, reportDate` |
| POST | `/quality/imports/{previewId}/confirm` | اعتماد الصفوف الصحيحة وإعادة توازن السجل التالي |
| GET | `/quality/imports/{importId}` | نتيجة الجودة المعتمدة للمستخدم المخول |
| POST | `/quality/{sourceId}/reallocate` | `rowVersion, reason`؛ إعادة تخصيص بعد استكمال أدلة الاستخدام |
| GET | `/reports/quality` | `month, accountId?, riderId?, page, pageSize` |
| GET | `/reports/quality/export` | `month, accountId?`؛ كامل النطاق المسموح |
| GET | `/operations/template` | تنزيل قالب التشغيل اليومي |
| POST | `/operations/imports/preview` | multipart: `file, reportDate` |
| POST | `/operations/imports/{previewId}/confirm` | اعتماد دفعة التشغيل السليمة |
| GET | `/reports/operations` | `from, through, accountId?, riderId?, page, pageSize`؛ فترة حتى سنة |
| GET | `/reports/operations/export` | `from, through, accountId?` |
| PUT | `/operations/{sourceId}/manual` | `orders?, hours?, reason, rowVersion`؛ المقارنة دون تغيير المصدر |
| GET | `/reports/summary` | `month`؛ المخزون والتكليف والتصنيف والأفراد بأبعاد منفصلة |
| GET | `/alert-rules` | سجل نسخ قواعد المتابعة |
| POST | `/alert-rules` | `platformId, code, threshold, severity, effectiveFrom, enabled, evidenceReference` |

`month` تاريخ ISO مثل `2026-11-01`. حجم الصفحة 1–100. سجلات الأداء تمثل مصدر المعرف وتعرض `allocations` مستقلة؛ فلتر المندوب يحدد حصص الإجماليات، ولا يحول لقطة تصنيف المعرف إلى تقييم شخصي. تصنيف الجودة A=1 وB=2 وهكذا. التقرير الشهري يجمع الفروق، ويعرض أحدث لقطة حسب تاريخ التقرير لكل حساب ظاهر في الصفحة.

قواعد التنبيه المتاحة: `HoursCritical` (افتراضي أقل من 8)، `HoursFollowUp` (أقل من 10)، `NoShowPositive` (أكبر من 0). الدرجات `Critical/Warning/Info`. النسخ مؤرخة؛ NoShow تنبيه متابعة محتمل وليس غرامة. الصفر معروف، وغياب المعلومة ليس صفرًا.

## المحافظ والتوريد

| Method | المسار | الوظيفة |
|---|---|---|
| PUT | `/finance/configuration` | اعتماد ربط حسابات المشرف: `platformId, supervisorEmployeeId, sponsorId, custodySubAccountId, collectionsSubAccountId, walletSubAccountId, riderClearingSubAccountId, evidenceReference, isActive, rowVersion?` |
| POST | `/finance/events` | واقعة مالية موثقة بمفتاح منع تكرار |
| GET | `/finance/events` | `platformId, supervisorEmployeeId, page, pageSize`؛ الوقائع ورصيد العهدة والمعلق |
| POST | `/finance/remittances` | `platformId, supervisorEmployeeId, sources:[{sourceEventId,amount}], idempotencyKey, businessDate, evidenceReference` |
| POST | `/finance/remittances/{remittanceId}/confirm` | `destinationSubAccountId, sources?, idempotencyKey, businessDate, evidenceReference`؛ حذف sources يؤكد كل المتبقي |
| POST | `/accounts/{accountId}/wallet-review` | تحليل الرصيد وربطه بطلب التسليم أو الاستلام |
| POST | `/wallet-reviews/{reviewId}/confirm` | تنفيذ التكليف وواقعة المحفظة في معاملة واحدة |
| POST | `/finance/settlement-documents` | تسجيل أدلة `Invoice/MonthClose/Adjustment` ومطابقتها؛ لا يعيد قيد سلف |
| GET | `/finance/settlement-documents` | `platformId, month, accountId?, page, pageSize` |

أنواع `/finance/events`: `Funding`, `TopUpAdvance`, `TopUpCollected`, `Collection`, `WithdrawalCompany`, `WithdrawalSupervisor`, `RiderPayment`. الطلب يحتوي `platformId, supervisorEmployeeId, kind, amount, accountId?, riderProfileId?, counterSubAccountId?, relatedEventId?, businessDate, idempotencyKey, evidenceReference`. مبالغ تحويل الأموال موجبة؛ إشارة **رصيد المحفظة** مستقلة عنها. التحصيل/الصرف يرتبط بواقعة ذمة صحيحة؛ لا يتجاوز المتبقي. التوريد لا يعيد تمويل العهدة تلقائيًا.

طلب مراجعة المحفظة:

```json
{
  "action": "Deliver",
  "riderProfileId": "RIDER_GUID",
  "supervisorEmployeeId": "SUPERVISOR_EMPLOYEE_GUID",
  "businessDate": "2026-11-01",
  "mobileBalance": "-100.00",
  "closingBalance": 0,
  "provenAdjustments": 0,
  "walletEvidence": "وثيقة/مرجع المصدر",
  "closingEvidence": null,
  "adjustmentEvidence": null,
  "assignment": {
    "actualRiderProfileId": "RIDER_GUID",
    "effectiveFrom": "2026-11-01",
    "reason": "تسليم حساب هنقر",
    "wasBackdated": true,
    "backdatedReason": "تأسيس موثق من الملف",
    "compensationModel": "Commission"
  }
}
```

القيم الموجبة والسالبة والصفر مقبولة في التسليم والاستلام دون استثناء خاص للإشارة. يمكن إرسال الرصيد عددًا أو نصًا موقعًا مثل `"+100.00"` و`"-100.00"`. عند `Return` أرسل `return:{effectiveTo,status:"Ended",reason,rowVersion}` بدل `assignment`، واجعل المندوب مطابقًا لحامل التكليف. استكمل تقسيم اليوم من `assignment-context` و`previousDayUsages` وفق الآلية المشتركة؛ لا يلزم إدخال حقول الجودة عند التسليم.

`CurrentPeriodBalance = MobileBalance - (ClosingBalance + ProvenAdjustments)` ثم تعزل الحقوق المحجوزة. الإغلاق والتسويات غير الصفرية يجب أن تطابق مستندات معتمدة. التسليم الموجب يسجل سلفة، والتسليم السالب رصيدًا لصالح المستلم؛ الاستلام الموجب رصيد لصالح السابق، والسالب التزام عليه. لا يغيّر API الرصيد لدى هنقر خارجيًا.

## المكونات المشتركة لكل المنصات

| Method | المسار | المدخلات |
|---|---|---|
| GET | `/api/platform-accounts/{accountId}/business-context` | `from, through`؛ سياق المركبة والشريحة وتاريخ الملكية |
| PUT | `/api/platform-accounts/{accountId}/business` | حقول الاتصال والسجل والتسوية والمركبة المسجلة، و`effectiveFrom, reason, rowVersion` |
| POST | `/api/platform-accounts/{accountId}/credentials/reveal` | `reason`؛ صلاحية مستقلة، no-store، وتدقيق دون السر |
| PUT | `/api/platform-accounts/sim-cards/{simId}/ownership` | `ownership, evidenceReference, effectiveFrom, rowVersion` |

تعديل أي مجموعة حقول يتطلب صلاحيتها المستقلة؛ طلب يضم تغييرًا غير مخول يرفض كاملًا. المركبة المسجلة لا تعاد كتابتها من عهد الحركة، وملكية الشريحة لا تستنتج من اسم المسؤول. الربط غير المثبت يبقى Unknown.


## Hunger wallet package v2.1

All finance endpoints require the Hunger and HungerFinance feature flags and an authorized HUNGER platform scope. Permissions are split by action below. `hunger.finance.manage` remains a scoped compatibility superset of the finance permissions; an explicit denial of a granular permission overrides that superset. Settlement document capture/reconciliation retain their existing manage gate.

| Method | Path | Request / behavior |
|---|---|---|
| POST | `/api/hunger/accounts/{accountId}/wallet-review` | `closingBalance` is nullable. Response includes `closingBalance`, nullable `currentPeriodBalance`, `attributedBalance`, `riderBalanceChange`, and `canConfirm`. |
| POST | `/api/hunger/wallet-reviews/{reviewId}/confirm` | Returns a validation error when the prior close is unknown; record the close and create a fresh review. |
| POST | `/api/hunger/finance/settlement-documents` | Adjustment requires `sourceDocumentType`, `sourceReference`, `closingSnapshotId`; starts `Unmatched`. |
| POST | `/api/hunger/finance/settlement-documents/{documentId}/reconcile` | `{closingSnapshotId,evidenceReference}` explicitly matches the adjustment to its recorded month close. |
| POST | `/api/hunger/finance/events` | Withdrawal creates `PendingArrival`; see required fields below. |
| POST | `/api/hunger/finance/withdrawals/{withdrawalId}/confirm-arrival` | `{idempotencyKey,businessDate,evidenceReference}` records arrival evidence and posts the wallet-to-destination transfer once. |
| POST | `/api/hunger/finance/withdrawals/{withdrawalId}/cancel` | Same body, with cancellation evidence; allowed only while `PendingArrival`, releases reservations without treasury postings. |

A missing prior close is Unknown, even if the caller supplies zero. Zero is legitimate only when the account has no earlier assignments, usage, contributions, financial events, or settlement history. Existing negative-balance handover policy is unchanged.

An adjustment's `invoicePeriod` is the month being adjusted and must equal its linked MonthClose's `chargeFrom`. The economic source key is `(accountId, invoicePeriod, sourceDocumentType, sourceReference)`, independent of `idempotencyKey`. Reusing the source with a different key returns a conflict. Only `Matched` adjustments linked to the specific prior close and observed by the review date enter posted A. Capturing a source alone never matches it.

Withdrawal kinds remain `WithdrawalCompany` and `WithdrawalSupervisor`. In addition to the existing money fields, supply:

```json
{
  "sourceWalletBalance": 100.00,
  "destinationType": "Company",
  "destinationOwnerId": "SPONSOR_GUID",
  "counterSubAccountId": "COMPANY_BANK_SUBACCOUNT_GUID",
  "transferReference": "HS-transfer-123",
  "transferDate": "2026-11-01",
  "againstReservedRights": false
}
```

`sourceWalletBalance` captures the observed wallet snapshot at request time. `transferDate` must equal `businessDate`. Company ownership uses the configured Sponsor and a Bank/Central treasury account explicitly belonging to that Sponsor. Supervisor ownership uses the configured supervisor Employee and their approved Supervisor collections account (`destinationType: "Supervisor"`). `againstReservedRights: true` requires `relatedEventId` pointing to the positive WalletReturn being withdrawn; withdrawals cannot bypass reserved rights by omitting the flag/source. Pending requests reserve the source amount and linked rights; no destination treasury posting or remittance source exists until arrival. Cancellation preserves the audit record. Arrival/cancel retries with the same key and body return the existing outcome; conflicting terminal transitions fail.

Migration compatibility: historical withdrawals retain their already-posted behavior as `Arrived`. Historical adjustments are made `Unmatched` and excluded from posted A until their economic source and close are verified; recreate verified adjustments through the documented capture/reconciliation workflow. The migration is supplied for review, not applied to a database by this change.

## Wallet review integrity and rider swaps (R17)

Creating any wallet review supersedes every earlier unconfirmed review for that account, across users, including both legs of a pending swap. Expired or Superseded reviews cannot confirm. Confirmed standalone reviews retain their idempotent replay response.

Changes to account/assignment, daily usage/contributions, quality snapshots, operations, financial rights events, or settlement documents invalidate pending reviews in the same SaveChanges. Platform invoices also invalidate account reviews even when the invoice has no account ID. The confirmation revision hash includes these sources, including platform-wide invoices and related financial events. Invalidation for platform finance/settlement changes is conservative and may require a fresh review of other accounts on that platform.

Both endpoints below require `hunger.finance.wallet.review` and the existing platform scope and finance feature checks:

| Method | Path under `/api/hunger` | Behavior |
|---|---|---|
| POST | `/accounts/{accountId}/rider-swap/review` | Creates linked Return and Handover reviews from one balance/evidence payload. |
| POST | `/rider-swaps/{swapId}/confirm` | Confirms both reviews atomically; repeating a successful confirmation returns the same result. No body. |

Swap review body:

```json
{
  "return": {
    "action": "Return",
    "riderProfileId": "OLD_RIDER_GUID",
    "supervisorEmployeeId": "SUPERVISOR_GUID",
    "businessDate": "2026-11-01",
    "mobileBalance": 100,
    "closingBalance": 0,
    "provenAdjustments": 0,
    "walletEvidence": "current-wallet-evidence",
    "return": {
      "effectiveTo": "2026-11-01",
      "status": "Ended",
      "reason": "rider swap",
      "rowVersion": "BASE64_ASSIGNMENT_ROW_VERSION",
      "dayUsage": { "ordersCount": 0 }
    }
  },
  "handover": {
    "actualRiderProfileId": "NEW_RIDER_GUID",
    "effectiveFrom": "2026-11-01",
    "reason": "rider swap",
    "wasBackdated": false
  }
}
```

The handover must use a different rider and the same business date. Both reviews retain the same evidence and input revision. Response: `{swapId, return: WalletReviewResponse, handover: WalletReviewResponse}`. Confirmation returns `{swapId, return: WalletConfirmation, handover: WalletConfirmation}`. Neither leg can be confirmed through the standalone review confirmation endpoint. The old rider's positive entitlement is reserved before calculating the new rider's amount: with 100 attributable to the old rider, Return credits 100 and Handover attributes 0. Negative balances keep the existing policy and require no special approval.

Any balance/source change or replacement review requires fresh evidence and a new paired review. Unknown prior close blocks financial confirmation. Both lifecycle operations, events, review results and audit writes share one database transaction: failure of either leg rolls back everything. Existing assignment, concurrency and daily allocation checks still apply. A provider without relational transactions cannot confirm a swap.

## Finance permissions and accountant receipts (R15/R16)

| Action | Permission |
|---|---|
| Finance events, settlement document lists, pending collections | `hunger.finance.read` |
| Request funding / execute funding | `hunger.finance.funding.request` / `hunger.finance.funding.execute` |
| Request top-up / execute either top-up kind | `hunger.finance.topup.request` / `hunger.finance.topup.execute` |
| Collect rider payment | `hunger.finance.collection` |
| Request or cancel pending withdrawal | `hunger.finance.withdrawal.request` |
| Confirm withdrawal arrival | `hunger.finance.withdrawal.arrival.confirm` |
| Pay rider | `hunger.finance.rider.payment` |
| Review wallet and confirm reviewed handover/return | `hunger.finance.wallet.review` (existing assignment permissions still apply) |
| Create/submit remittance | `hunger.remittances.submit` |
| Accountant confirms actual receipt | `hunger.remittances.confirm` |
| Cancel receipt batch / reverse confirmation | `hunger.remittances.cancel_reverse` |
| Configure finance mapping | `hunger.finance.configure` |

`POST /api/hunger/finance/events` preserves the existing execution contract, checking the permission for its `kind` in the service. Funding/top-up requests can instead be saved with `POST /api/hunger/finance/requests` (same `HungerMoneyRequest` body), which returns `Requested` without posting or changing custody. `POST /api/hunger/finance/requests/{requestId}/execute` requires the corresponding execute permission, revalidates all financial rules, atomically marks the request `Executed` and posts once. Its execution key is derived from the request ID. The immutable request captures the amount, scope, source and evidence.

| Method | Path under `/api/hunger/finance` | Behavior |
|---|---|---|
| POST | `/remittances/drafts` | `HungerRemittanceRequest`: `platformId, supervisorEmployeeId, sources: [{sourceEventId, amount}], idempotencyKey, businessDate, evidenceReference`. Creates `Draft` and reserves sources. |
| POST | `/remittances/{remittanceId}/submit` | Action body below; `Draft` → `Submitted`. |
| POST | `/remittances` | Compatibility shortcut: create and submit in one operation. |
| POST | `/remittances/{remittanceId}/confirm` | Creates an immutable confirmation plus source allocations and treasury postings; updates batch to `PartiallyConfirmed` or `Confirmed`. |
| POST | `/remittances/{remittanceId}/cancel` | Action body; only Draft/Submitted with no historical confirmation. Releases reservations, preserves lines and audit event. |
| POST | `/receipt-confirmations/{confirmationId}/reverse` | Action body; reverses the entire selected confirmation exactly once, preserves original allocations/postings, adds opposite postings, and restores batch/source remaining amounts. |
| GET | `/pending-collections?platformId=...&supervisorEmployeeId=...&page=1&pageSize=50` | Independently paged outstanding batches and sources, with total counts. Batch and source amounts include confirmed and remaining amounts. Source totals include collections not yet assigned to a batch. |

Submit/cancel/reverse action body: `{ "idempotencyKey": "unique-key", "businessDate": "2026-11-02", "evidenceReference": "bank-receipt", "reason": "documented reason" }`. Keys are unique per platform across financial events; replay with the same payload returns the original outcome, conflicting payloads return 409. Dates must not precede the affected event or be in the future. Cancellation is prohibited even after all historical confirmations were reversed; resubmit restored amounts for confirmation instead.

Confirmation body:

```json
{
  "destinationSubAccountId": "COMPANY_BANK_OR_CENTRAL_ACCOUNT_GUID",
  "destinationType": "Company",
  "destinationOwnerId": "CONFIGURED_SPONSOR_GUID",
  "sources": [{ "sourceEventId": "COLLECTION_GUID", "amount": 60.00 }],
  "idempotencyKey": "receipt-60",
  "businessDate": "2026-11-02",
  "evidenceReference": "bank-receipt-60"
}
```

Use `sources` for partial amounts; alternatively omit it and provide `selectedSourceIds` to confirm those sources' complete remaining amounts. Omit both to confirm all remaining amounts. Empty/duplicate/foreign selections and over-confirmations are rejected atomically. Destination ownership is verified against the configured Sponsor and Bank/Central account; omitted owner/type default to that Company for compatibility, with the same ownership validation. A supervisor's destination is not an accountant's company receipt. Receipt confirmation never replenishes charging custody.

Writes share the existing platform/supervisor SQL Server application locks and one SaveChanges transaction, including allocations, status, audit and balanced postings. The generated application migration maps historical Posted remittance batches to their derived lifecycle status and reconstructs historical confirmation allocations from saved request JSON in creation order. Migration validation rejects inconsistent historical allocation totals rather than silently guessing. Identity seed grants are appended for SystemAdmin without shifting existing grant IDs; custom roles retain their scoped manage compatibility.


## Task 4: performance (R20-R27)

| Method | Path under `/api/hunger` | Permission / contract |
|---|---|---|
| GET | `/reports/performance` | `hunger.read`; `HungerPerformanceQuery` below. |
| GET | `/reports/performance/export` | `hunger.performance.export` and scoped read; same filters; exports all results regardless of page. |
| GET | `/potential-fines?from=2026-11-01&through=2026-11-30` | `hunger.read`; immutable source day/count, lifecycle state and row version. |
| POST | `/potential-fines/{id}/resolve` | `hunger.finance.manage`; `{status: "Invoiced"|"Waived", invoiceDocumentId, invoiceSourceKey, evidence, rowVersion}`. |

Performance query: `from`, `through` (inclusive, at most 367 dates), `groupBy=account|rider`, `period=day|month`, `layout=vertical|horizontal`, optional `accountId`, `riderId`, `cityId` (OperatingCity), `sponsorId`, `actualVehicle=Company|Private|Mixed|Unknown`, `actualVehicleType` (for example Car, Motorcycle, Mixed, Unknown), `targetAchieved=true|false`, `page=1`, `pageSize=50` (maximum 100). Layout is presentation metadata; grouping and period change server aggregation. Sponsor filters use account sponsorship for account grouping and employee sponsorship for rider grouping. Mixed vehicle ownership is derived from historical actual vehicle periods, including changes within a day. Current exceptions retain historical performance. Distinct account/rider counts and totals use the full filtered range before paging.

`WorkedDays` derives from positive observed imported daily hours; `QualifiedDays` counts distinct identity/date totals of at least 8 hours. These are different measures (qualified days are a subset). Missing hours or allocation stay unknown; a known zero is not an unknown day. Assignment/status snapshots and import creation timestamps never prove work. `UnknownDays` counts elapsed scheduled dates with no observed hours. A partly covered rider date can have observed work, with a separate coverage alert and no reliable forecast. Future scheduled dates count as remaining responsibility, never unknown or absence. Planned and cancelled assignments are excluded. Ended assignments stop at their inclusive end date.

The operational import template adds optional `AcceptedOrders`, `StackedOrders` and `HoursUnit`. Counts stay independent from completed/rejected/cancelled/NoShow. `HoursUnit` is `DecimalHours`, `Duration` (`hh:mm` or `hh:mm:ss`), or `FractionOfDay` (multiply by 24). Existing templates without a unit column retain their declared decimal-hours convention. A blank unit also means DecimalHours. A time-typed Excel cell requires Duration. Blank hours remain null. Formulas, negative values and daily hours over 24 are rejected; monthly report sums may exceed 24. Hours are normalized to the existing decimal(18,8) storage precision before allocation, with the source unit retained; display rounding is not used for alerts. Examples: `08:30:00/Duration` = `8.5/DecimalHours` = `0.3541666666666667/FractionOfDay` (within source precision). Optional accepted/stacked counts are attributed to a rider only when the source has one unambiguous rider; split-day counts remain unknown where no metric allocation exists.

Manual comparison is independent: imported completed minus manual orders, or null when manual is absent. Updating/clearing the manual comparison does not replace imported evidence.

Alert catalog additions to `POST /alert-rules`: `metric`, `operator`, `kind=Alert|Target`, `period=Day|Month`, `operatingCityId` (nullable platform-wide scope), `effectiveThrough` (inclusive, optional), alongside the existing platform/code/threshold/severity/effectiveFrom/enabled/evidenceReference. Supported metrics: WorkingHours, CompletedOrders, WorkedDays, QualifiedDays, NoShowCount, RejectedOrders, CancelledOrders, AcceptedOrders, StackedOrders. Operators: LessThan, LessThanOrEqual, GreaterThan, GreaterThanOrEqual, Equal. Severity: High, Critical (compatibility), Warning, Info. Each POST creates an immutable version; historical versions remain readable. City overrides precede platform defaults, then latest effective date/creation/ID wins. Disabled versions suppress that scoped rule. No automatic default order/day target (including legacy 14/450/26) is installed.

Default internal hours rules: `<8` High, `8.. <10` Warning, `>=10` no short-hours alert, comparing unrounded hours. Thursday/Friday/Saturday are mandatory on actual scheduled responsibility dates, with known zero-work and missing coverage reported separately. Disabled city/date-scoped `MandatoryDays` catalog versions can document approved calendar exemptions. No assignment, Planned or Cancelled means no scheduled mandatory duty. A deferred month without an actual assignment creates no duty. Captain classifications and unapproved contractual penalties never create debt or an automatic operating block.

Catalog evaluations include rule ID, evidence, code, metric, actual, threshold, severity, date, match and target deficit. Monthly targets use scheduled responsibility divided by calendar month length, not attended hours. A shared day without known scheduled rider weights leaves the rider target unresolved instead of splitting equally. The row-level target/deficit/achievement/forecast summarizes one monthly CompletedOrders target code, combining its effective date/city versions; all other metrics remain independently visible in `catalog`. Coverage cutoff is the earlier of the requested through date and the previous completed Riyadh business date (`coverageThrough`). Monthly rows extend scheduled responsibility through the last requested month end, so a partial-month data query still forecasts to month end; observed source totals remain limited to the requested dates. Forecast uses `forecastObservedOrders` through that cutoff; row totals may additionally include an imported current day. Actual vehicle type and ownership are independent dimensions. For elapsed responsibility `e` and remaining `r`, orders `O`, target `T`: forecast `O + O/e*r`; required pace `max(T-O,0)/r`. `e=0` has no run rate; `r=0` returns the observed end result with no required pace. Gaps suppress a reliable forecast. Export includes the requested scope and cutoff, with complete Alerts and Catalog worksheets (the main sheet contains their counts), avoiding Excel cell-length truncation of rule evidence.

Positive NoShow shifts create one `Potential` fine per operational source, atomically with import; replay creates no duplicate. The number is shifts, not days or money. Resolve to `Invoiced` only with a Matched invoice covering the same account/source day and the specified canonical source line. An invoice line may declare optional `noShowCount` in `HungerInvoiceSourceLine`. Several daily reviews can share that canonical monthly line only within its observed shift count; without a count, only one source can be linked. A rider-specific line requires the same unambiguous source rider. Waive with evidence and no invoice reference. Both transitions check the row version and are terminal; no transition posts rider debt, treasury entries, or account blocks. Invoice capture likewise remains separate from rider accounting.
