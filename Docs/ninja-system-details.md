# Ninja system details

Source contract updated 15 October 2026. This describes the code in this checkout. Publishing the API is required to make these changes available to clients. The account detail/status/performance additions need no schema changes. The subsequent [separate saved-sheet checkup workflow](ninja-account-sheet-updates.md) uses `20261015134151_AddNinjaAccountSheetReviews`, which adds two tables and no permission seeds. That migration was [applied and verified on the hosted database](ninja-account-sheet-reviews-hosted-deployment-20261015.md) at 16:53:16 Riyadh time on 15 October 2026; API publication remains pending.

Read the [complete endpoint reference](ninja-full-api-reference.md), [TypeScript contracts and client](ninja-api-contracts.ts), and [account workbook comparison guide](ninja-account-comparison-frontend-handoff.md).

## What Ninja does

The ERP tracks accounts on the client platform whose code is exactly `NINJA`. A Captain ID is the account's `externalAccountId`, stored as text, including leading zeros. The ERP records registered ownership, actual rider assignments, account status, locally recorded phone/password versions, uploaded daily performance, and deductions.

This is an ERP module, not a live Ninja provider API connection. Saving a phone or password records an operator's change in the ERP; it does not update Ninja's servers. Imports do not create payroll entries, settlements, or payments.

## Owner, user and phone definitions

| Response value | Source and meaning |
| --- | --- |
| `ownerEmployeeId` | `PlatformRiderAccount.RegisteredEmployeeId`: the registered owner |
| `owner` | Owner's employee ID, Arabic/English names, primary phone and iqama |
| `actualRiderProfileId` | Rider profile on the account assignment with no end date |
| `actualRider` | Assigned rider's employee ID, Arabic/English names, primary phone and iqama |
| `phoneNumber` at account root | Recorded Ninja login/contact phone from `NinjaAccountDetails` |
| `owner.phoneNumber`, `actualRider.phoneNumber` | Employee primary phones, independent of the login phone |

An account can have an owner and no user. `actualRider` is null when unassigned; the owner is never substituted for the user. A missing/deleted employee returns a null person object while retaining the stored identity IDs. Missing employee phone, English name or iqama returns null in that field. Iqamas and phones stay strings.

Both account list and account detail use the same response projection. The status endpoint also returns this enriched account response. A caller does not need separate employee directory requests to display these fields. Lifecycle responses retain their existing `{ assignment, credentials }` shape; refresh account detail after assignment or return.

## Permissions and access

Ninja uses the existing ERP platform permissions; there is no separate `ninja.*` permission family and Ninja account owners/riders do not automatically receive ERP login permissions. Access belongs to authenticated ERP users through their configured role/user grants and scopes.

The authorization handler resolves the `NINJA` platform for `/api/ninja/*` and checks a `ClientPlatform` scope targeting its platform ID. The service also checks scope, including additional permissions needed by combined operations. A permission for a different client platform does not authorize Ninja. Existing broader grants apply according to the ERP permission checker.

| Action | Required permission keys |
| --- | --- |
| Account list/detail/comparison, raw daily records, all three aggregate reports | `platform_accounts.read` |
| Change status, change login phone, import performance/deductions | `platform_accounts.update` |
| Assign | `platform_assignments.create` **and** `platform_accounts.update` |
| Return | `platform_assignments.delete` **and** `platform_accounts.update` |
| Supply any `newPassword` | Also `platform_credentials.rotate`, even if cooldown retains the old value |
| Generic account creation | `platform_accounts.create` |
| Generic account metadata updates | `platform_accounts.update` |
| Assignment history | `platform_assignments.read` |
| Credential version metadata history | `platform_credentials.read` |

Grant the keys needed for the operator's work with the Ninja platform scope through the existing ERP access management. `reports.read` and Chefz permissions are not used by Ninja report endpoints. Person names, phones and iqamas are included under Ninja account/report read access; there is no additional field-level permission in this module. Existing seed roles are defaults; actual grants and scopes determine access.

## Status controls

`PUT /api/ninja/accounts/{accountId}/status` accepts `Active`, `Suspended`, `Retired`, or `Archived` and the current **account** rowversion.

| Requested status | Result |
| --- | --- |
| `Active` | `Assigned` when an assignment has no end date; otherwise `Available`. Clears `statusReason`. |
| `Suspended` | Keeps current assignment/history and stores optional reason. Blocks new assignments. |
| `Retired` | Same preservation rules; account remains readable. |
| `Archived` | Same preservation rules; this action is not a soft delete. |

The three manual states can be switched directly. Setting a manual state does not return the account or end its assignment. Returning an account preserves its manual state and reason; an ordinary assigned account becomes `Available`. Restore with `Active` before assigning again. Reasons are trimmed, optional, and limited to 500 characters. Status edits are audited through the existing persistence interceptor and participate in account rowversion concurrency even if the requested state matches the stored state.

An outstanding transferred Jahez debt can operationally block the current Ninja rider. Reads expose `isOperationallyBlocked` and `operationalBlockReason`. Restoring `Active` is rejected with `rider.jahez_debt_block` while this block exists. Status selection cannot clear the debt. Assignment independently checks this restriction.

Use the Ninja status route to change status/reason on an existing Ninja account. Both simplified and legacy generic metadata update services reject changing its status/reason or moving it to another platform with `ninja.use_workflow`. Metadata edits that retain these fields remain supported, subject to existing reference and ownership rules.

## Assignment and return

An assignment selects an actual rider independently from the registered owner. The account must be `Available`, have no open assignment, and pass existing rider availability, owner registration, supported payment model and assignment-limit checks. The shared `PlatformAccountAssignmentPolicy.MaximumActiveAccountsPerRider` is currently **1** in this checkout (a temporary restriction). Ninja follows this limit and the salary-account checks. Chefz has a separate two-account exception; it does not apply to Ninja. A rider's historical performance can still span multiple accounts after returns/reassignments.

Supply a valid phone on each assignment and return. Phone updates, credentials, assignment changes/events and cooldown notifications commit together. New assignment dates in the past require `wasBackdated: true`, the existing backdate reason/validation, and appropriate history consistency. Dates cannot be in the future according to Riyadh time.

Assignment end dates are inclusive. A same-day return/reassignment is allowed, but a daily upload covering multiple assignments is rejected because it cannot identify a single actual user for the daily total. The ERP never credits the owner as a fallback.

Generic assignment, release, and credential rotation routes reject Ninja accounts with `ninja.use_workflow`; use the dedicated Ninja routes.

## Credentials

Passwords are encrypted using the existing platform credential protector, versioned immutably, and absent from all responses and notifications. The configured encryption key must be available to the API.

A changed password starts a 72-hour cooldown based on actual UTC recording time. Phone changes apply immediately. Supplying the existing password does not create another version or restart the cooldown. Assignment may keep the existing password. A return after cooldown requires a different password; a return during cooldown succeeds while retaining the current password. An account without a password also requires a new one on return.

During cooldown, the response includes `passwordChanged: false` and a bilingual `ninja.password_cooldown` notification with the UTC deadline. A warning is also saved in the requesting user's ERP notification inbox. A skipped password is not queued; an operator submits it again after the deadline. At exactly the deadline, a change is allowed. Display deadlines in `Asia/Riyadh`.

Use the **assignment** `assignmentRowVersion` to return an account. Use the **account** `rowVersion` for status or credential changes. Both are Base64 tokens, not timestamps. Reload after HTTP 409; never silently overwrite a newer write.

## Daily imports and attribution

Both imports require `.xlsx`, an explicit `reportDate`, and at most 10 MiB. The date cannot be empty or in the future. Only one worksheet may contain all required headers in its first row. Header matching ignores case and surrounding whitespace. Formula cells in imported fields and duplicate required headers are rejected.

Performance reads `Captain ID`, `Total Orders`, `Total Working Hours`. Orders are nonnegative integers; working hours are 0–24 with up to eight decimal places. Zero values are real observations.

Deductions reads `CAPTAIN ID`, `labels.TotalCollectedAmountAtDelivery`, `TOTAL DEDUCTIONS`. Collected money must be nonnegative. Monetary precision is two decimal places. Deductions preserve their sign; positive adjustments and negative deductions are not converted to absolute values.

Captain IDs must match exactly one authorized Ninja account. Exactly one active/ended historical assignment must cover the report date. Each saved row stores the account, assignment and actual rider IDs, source row, date and import provenance. These IDs are fixed after import and do not change when ownership or current user changes.

Each file is all-or-nothing. Any invalid/unknown/ambiguous/conflicting row prevents the entire file from saving. Identical existing account/day values are skipped; conflicting values/attribution are rejected and never overwritten. Hashes deduplicate batches; unique account/day indexes protect stored daily rows. Read `issues` even on HTTP 200: any issues mean no rows were committed.

Limits: 40 MiB expanded workbook data, 2,000 ZIP entries, 10,000 data rows, 200 columns. Cancellation flows through upload, parsing and persistence.

## Performance reports

The three new `/reports/*` endpoints accept inclusive `from`/`to` dates, with up to 366 calendar days and `to` no later than today in Riyadh. Optional `accountId` and `riderId` filters are combined with AND. A rider filter uses the historical rider stored in each fact, never today's assignee.

| Report | Contents |
| --- | --- |
| `reports/performance` | Selected range totals, distinct performance/deduction dates, accounts and riders with data |
| `reports/daily` | One row per observed date, earliest date first; paginated |
| `reports/riders` | One row per historical rider, names/phone/iqama, coverage counts and metrics; orders descending then rider ID; paginated |

Metrics are performance record count, deduction record count, total orders, total working hours, orders per working hour, collected money and signed deductions. Productivity is total orders divided by total hours, rounded to four decimals; it is null when hours are zero. It is a weighted range ratio, not the average of daily ratios.

Performance and deductions are independent observations. A date/rider with deductions only still appears. Records from both sources are combined with `UNION ALL` and aggregated in SQL, avoiding duplicated money/orders from cross-joining facts. Pages are applied after grouping; summary totals always cover the complete selected range. Page size is 1–100, default 50; page is 1–100000. There is no total-count field.

Missing uploads do not mean zero performance: missing dates are omitted from the daily report; record and coverage counts distinguish missing data from uploaded zeroes. An empty summary has zero counts/totals and null productivity. An empty daily/rider result has `items: []`. Account/rider filters that reference unknown records are rejected; an existing authorized account with no data returns an empty result.

Reports include history for manually archived and legacy soft-deleted accounts. Person details come from currently visible employee records and can be null if removed; stored rider IDs and totals remain available. No Chefz acceptance rate or A/B/C/CHANGE rating is fabricated because Ninja uploads have no offer/acceptance fields and no Ninja rating thresholds were requested. There is no net-pay calculation.

## Storage and operational boundaries

Shared platform accounts, employees/riders, registrations/assignments/events, encrypted credential versions, audit entries and notifications remain the system of record. Ninja adds:

| Table | Purpose |
| --- | --- |
| `ninja.NinjaAccountDetails` | One login phone per platform account |
| `ninja.NinjaDailyImports` | Date/type, filename/hash and imported/skipped counts |
| `ninja.NinjaDailyPerformance` | One performance row per account/date, historical rider attribution |
| `ninja.NinjaDailyDeductions` | One deductions row per account/date, historical rider attribution |

The existing `AddNinjaAccountsDailyPerformanceAndDeductions` migration is required for a fresh environment. Account detail/status/performance reporting introduced no schema or seed change. The newer saved-sheet checkups add `ninja.NinjaAccountUpdateUploads` and `ninja.NinjaAccountUpdateRows` with immutable comparison snapshots and editable upload notes; they never update the main accounts. See the [checkup guide and deployment SQL](ninja-account-sheet-updates.md). Earlier hosted migration/import documents are historical evidence and do not establish that the current API code is published.

## Verification

Regression coverage lives in `NinjaWorkflowTests*` and `NinjaAuthorizationTests`. It covers identity separation/null handling, status lifecycle/validation/permissions/debt blocks, independent report metrics, historic attribution, signed deductions, missing/zero data, date/pagination boundaries, platform scope and SQL Server translation. Shared platform/Chefz tests protect the touched generic service behavior.

SQL translation tests compile the real provider queries using intercepted empty readers; they do not establish database execution plans, rowversion behavior or production performance. The existing disposable SQL lifecycle test requires `NINJA_SQL_TEST_SERVER`; sample workbook checks require `NINJA_PERFORMANCE_SAMPLE`, `NINJA_DEDUCTIONS_SAMPLE` and `NINJA_ACCOUNTS_SAMPLE` as described in their tests. No hosted account mutations are performed by ordinary verification.

Verification on 15 October 2026:

- Solution build succeeded with zero warnings/errors.
- Ninja, Chefz and shared platform regression selection: 125 passed, 10 optional SQL/sample checks skipped. Two additional account-metadata/report-scope regressions added afterward passed in focused runs, for 127 distinct workflow checks.
- Ninja/Chefz scoped authorization: 22 passed. Total distinct focused checks passed: 149.
- The real SQL Server provider compiled all three aggregate report queries and account-list joins/pagination successfully using intercepted readers.
- All 14 Ninja controller routes are present in the full API reference, and local links in the four Ninja Markdown guides resolve.
- No database migration, hosted publication or production mutation was performed for this update.
