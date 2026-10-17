# Ninja frontend handoff

Updated 15 October 2026: use the [complete endpoint reference](ninja-full-api-reference.md) and [system guide](ninja-system-details.md) for the enriched account identities, account detail/status controls and aggregate reports. These additions are source changes and require backend publication; historical deployment notes below do not confirm current route availability.

The new [saved sheet-checkup workflow](ninja-account-sheet-updates.md) adds upload history, separate provider statuses/suspension, missing-account/city/iqama problems and editable upload notes. Its five endpoints require `AddNinjaAccountSheetReviews` before backend publication. It never changes main account fields. Use the dedicated guide for its report screen, filters, total counts and concurrency handling.

The hosted Ninja database migration is applied and verified as of 12 October 2026. **Publish the updated backend before enabling these screens**; API publication was not part of the database update. The known hosted API origin is `https://gat.premiumasp.net`. Its health endpoint responded, but its Swagger endpoint returned 500 during deployment verification, so availability of the live Ninja routes is unconfirmed.

Use [ninja-api-contracts.ts](ninja-api-contracts.ts) for all request/response types and a framework-neutral fetch client. [Backend reference](ninja-backend-api.md) explains the business rules; [deployment evidence](ninja-hosted-deployment-20261012.md) records the actual database changes.

## Transport and dates

- Bearer authentication uses the existing ERP access token. JSON field names are camelCase. Successful responses contain the object directly, with no `data` or `result` envelope.
- IDs are GUID strings. Captain IDs and phone numbers are text; preserve leading zeroes.
- Send business dates as `YYYY-MM-DD` directly from the date input. Do not convert date-only values through UTC `Date.toISOString()`.
- Assignment, return and upload dates cannot be after the current day in **Asia/Riyadh**. Password deadlines are UTC timestamps; display them with an explicit Riyadh timezone. The server is authoritative when a timer differs from the browser clock.
- Page defaults are `page=1&pageSize=50`, maximum size 100. Responses are `{ items, page, pageSize }` with no total count. Use Next/Load more; a full final page can require one additional empty request. Reports require inclusive `from` and `to` dates.
- Keep passwords only in temporary form state; clear after submission. Responses expose `hasPassword`, never the password. Do not persist requests with plaintext passwords in browser storage, analytics or logs.

## Endpoint map

| Method | Endpoint | Body / response |
| --- | --- | --- |
| GET | `/api/ninja/accounts?page=1&pageSize=50` | `NinjaPage<NinjaAccountResponse>` |
| GET | `/api/ninja/accounts/{accountId}` | `NinjaAccountResponse` |
| PUT | `/api/ninja/accounts/{accountId}/status` | `NinjaAccountStatusRequest` → `NinjaAccountResponse` |
| POST | `/api/ninja/accounts/compare` | Multipart `file` → `NinjaAccountComparisonResponse` |
| POST | `/api/ninja/accounts/{accountId}/assign` | `NinjaAssignRequest` → `NinjaLifecycleResponse` |
| POST | `/api/ninja/accounts/{accountId}/return` | `NinjaReturnRequest` → `NinjaLifecycleResponse` |
| PUT | `/api/ninja/accounts/{accountId}/credentials` | `NinjaCredentialRequest` → `NinjaCredentialResponse` |
| POST | `/api/ninja/performance/import` | Multipart `reportDate`, `file` → `NinjaImportResponse` |
| POST | `/api/ninja/deductions/import` | Multipart `reportDate`, `file` → `NinjaImportResponse` |
| GET | `/api/ninja/performance?from=2026-10-01&to=2026-10-12` | `NinjaPage<NinjaPerformanceResponse>` |
| GET | `/api/ninja/deductions?from=2026-10-01&to=2026-10-12` | `NinjaPage<NinjaDeductionResponse>` |
| GET | `/api/ninja/reports/performance` | `NinjaPerformanceReport` |
| GET | `/api/ninja/reports/daily` | `NinjaPage<NinjaDailyReport>` |
| GET | `/api/ninja/reports/riders` | `NinjaPage<NinjaRiderReport>` |

Both report reads accept optional `accountId`, `riderId`, `page` and `pageSize`. `riderId` filters the **actual rider recorded on that day**.

For the owner-account workbook comparison added on 13 October, use [the dedicated handoff](ninja-account-comparison-frontend-handoff.md). It reports accounts missing from either side and owner/name/city differences without changing records. It requires only `platform_accounts.read`, needs no report date and is distinct from daily performance/deduction imports.

## Accounts screen and prerequisites

List Captain ID, account status, registered owner, actual assigned rider, phone, password-recorded indicator and password change deadline. Use `owner` and `actualRider` for their names, employee phones and iqamas; no directory request is needed. The root `phoneNumber` is the separate Ninja login phone. Null actual rider means unassigned or unavailable; `actualRiderProfileId` distinguishes a missing person reference from no assignment. Null phone means it has not been recorded.

Offer Assign, Return and Update phone/password actions according to permissions and account state. Assign is for an available account. Return is for an account with `currentAssignmentId`; its form also needs `assignmentRowVersion`. Load the accounts again after each successful write.

Offer status controls to users with `platform_accounts.update`: Active, Suspended, Retired and Archived. Send the latest account rowversion. Active derives Available/Assigned from the open assignment; manual states preserve assignments and returning preserves a manual state. An operational debt block prevents restoration to Active. See the full reference for response fields and error handling.

For reports, use inclusive `from`/`to`, at most 366 days, ending no later than today in Riyadh, plus optional account/rider filters. Summary totals cover all matching facts; daily/rider reports paginate grouped rows. Show imported-record/day coverage so missing uploads are distinguishable from true zeroes. Keep signed deductions and show null productivity when hours are zero. There are no Ninja acceptance ratings or payout calculations.

The migration did not seed accounts: **the hosted database contained zero Ninja accounts at deployment**. Use existing ERP setup screens and endpoints to create/check the platform with code `NINJA`, then create its accounts through `/api/platform-accounts`. Set `externalAccountId` to the Captain ID used in the workbook. The generic creation contract also requires operating city, active sponsor, owner rider profile, internal code, supported payment model and an initial account status such as `Available`. The owner must have a rider profile. The actual rider is selected separately when assigning.

Reuse `/api/platforms`, `/api/riders` and the existing catalog pickers. Keep existing account/history pages available. Generic assignment, release and password rotation endpoints return `ninja.use_workflow` for Ninja accounts: wire the actions to the Ninja endpoints above.

## Assignment form

Required fields: actual rider, effective date, new rider's phone. Offer an optional new password and a reason; if the date precedes today, require `wasBackdated: true` and a nonempty `backdatedReason`. Assignment uses a rider **profile ID**, not an employee ID or Captain ID. Existing assignment limits still apply: at most two accounts per rider and only one salary account.

```json
{
  "actualRiderProfileId": "00000000-0000-0000-0000-000000000001",
  "effectiveFrom": "2026-10-12",
  "phoneNumber": "0501234567",
  "newPassword": null,
  "reason": "Assigned to rider",
  "wasBackdated": false,
  "backdatedReason": null
}
```

With `newPassword: null`, the existing password remains. An unlocked different password is saved and starts a 72-hour cooldown. Assignment does not require a rowversion input; concurrent conflicts still return 409.

## Return form and record versions

Required fields: effective end date, replacement phone, reason. Use status `Ended` for a normal return. Send `rowVersion` from **the assignment**, as `account.assignmentRowVersion` or `previousResponse.assignment.rowVersion`.

```json
{
  "effectiveTo": "2026-10-12",
  "phoneNumber": "0507654321",
  "newPassword": null,
  "reason": "Rider returned account",
  "rowVersion": "BASE64_ASSIGNMENT_TOKEN_FROM_API",
  "status": "Ended"
}
```

This null-password example is valid **during an active cooldown**. When there is no active cooldown, require a different new password before submitting a return. If no password has ever been recorded, return also requires a new password. The end date cannot precede the assignment start date. End dates are inclusive for report attribution.

| Operation | Token to submit as `rowVersion` |
| --- | --- |
| Return | Account list `assignmentRowVersion` or lifecycle `assignment.rowVersion` |
| Update phone/password | Account list `rowVersion` or latest `credentials.rowVersion` |

Tokens are opaque Base64 strings. Keep them separate. On 409, refetch the current account/assignment, explain that the record changed, and let the user review the form again. Do not resubmit automatically with a newer token.

## Password cooldown, phone changes and notifications

The 3-day rule is **72 hours for passwords only**. A phone change applies immediately on assignment or return. Backdating the business date never backdates the password timer. Recording an unchanged password does not restart the timer.

If `passwordChangeAllowedAtUtc` is in the future, show a warning and the deadline. Allow assignment/return and phone updates to continue. The UI can disable the password input during cooldown and send null. The server also protects against a supplied password: it retains the old one and completes the permitted phone/lifecycle changes.

After a successful lifecycle response, read `credentials.notification`. If present, show the operation as successful with a warning; do not display "Password changed." Use `passwordChanged` for that message. A credentials update returns the same fields directly. The warning code is `ninja.password_cooldown`, with `messageAr`, `messageEn` and `changeAllowedAtUtc`.

```json
{
  "code": "ninja.password_cooldown",
  "messageAr": "لم تتغير كلمة المرور؛ يمكن تغييرها بعد الموعد الموضح.",
  "messageEn": "Password retained. It can be changed after the shown deadline.",
  "changeAllowedAtUtc": "2026-10-15T10:00:00Z"
}
```

Messages above are illustrative; display the server's localized text and format its timestamp. A warning is also persisted for the requesting user in the existing notification inbox (`/api/notifications`, event type `ninja.password_cooldown`). It expires at the deadline. The immediate response warning works even if the user cannot read the inbox. No scheduled password change exists: a skipped input is discarded, and an operator submits a new change later.

For subsequent changes use:

```json
{
  "newPassword": null,
  "phoneNumber": "0501234567",
  "reason": "Updated contact phone",
  "rowVersion": "BASE64_ACCOUNT_TOKEN_FROM_API"
}
```

At least one of `newPassword` / `phoneNumber` must be nonnull. Phone: trimmed, maximum 32 characters, at least seven digits; only digits, `+`, spaces, hyphens and parentheses. Password: nonblank when supplied, maximum 4096 characters. Reason: nonblank, maximum 1000 trimmed characters. Pass null rather than an empty password field.

These endpoints record credentials in ERP. They do not call Ninja to change the live password or phone. Make the operator's manual Ninja update step clear in the form instructions; do not claim the provider account was changed automatically.

## Daily upload screens

Provide separate Performance and Deductions tabs, each with an explicit report date and one `.xlsx` file. The supplied sheets contain no report date column. Do not infer the date from upload time or filename.

| Upload | Required workbook headers | Persisted values |
| --- | --- | --- |
| Performance | `Captain ID`, `Total Orders`, `Total Working Hours` | Captain ID, orders, decimal hours |
| Deductions | `CAPTAIN ID`, `labels.TotalCollectedAmountAtDelivery`, `TOTAL DEDUCTIONS` | Captain ID, collected amount, signed deductions |

Header matching ignores case and surrounding spaces. Other columns are ignored. Exactly one sheet must contain all required headers in row 1. Reject formulas in imported fields. Maximum file size 10 MiB, maximum 10,000 data rows and 200 columns; the parser also limits expanded ZIP size to 40 MiB and ZIP entries to 2,000.

Orders: nonnegative whole number. Hours: 0–24 inclusive, stored to eight decimals. Amounts: at most two decimal places; collected amount nonnegative, deductions signed. The supplied deductions workbook includes negative values; preserve these signs. Zero metrics are valid.

Use `FormData` with keys **`reportDate`** and **`file`**, adding Bearer authorization. Do not set multipart Content-Type manually; the browser supplies the boundary. The provided client implements this.

```typescript
const outcome = await api.importPerformance(selectedDate, file);
if (outcome.issues.length > 0) {
  // Render rowNumber, captainId and message; no rows from this file were saved.
} else {
  // Show importedRows and skippedRows; reload the report for selectedDate.
}
```

The import is all-or-nothing. **HTTP 200 does not alone mean the file was accepted**. When `issues` is nonempty, `importId` is null and no rows are saved; render an issue table rather than a success toast. Unknown Captain IDs, duplicate IDs, invalid metrics, missing assignment, overlapping assignment histories and differing existing data all produce issues.

Identical existing account/day rows are skipped. If there are no issues and `importedRows=0` with `skippedRows>0`, show "Already imported". A changed workbook cannot overwrite prior daily values. There is no correction/delete endpoint in this handoff.

Every row is linked to exactly one active/ended assignment covering the selected day and frozen to that assignment's actual rider. The official owner is never used as a fallback. Assignment/return/reassignment on one date is permitted, but daily totals for that day can be ambiguous and are rejected. Show the server issue and have the operator resolve the account history; do not assign the totals arbitrarily.

Sample inspection: `الاداء اليومي.xlsx` contains 72 data rows and `الخصومات.xlsx` contains 10. Neither was imported into the hosted database by this task. Deductions are stored as daily records; this module does not post them into payroll or settlements.

## Report tables and filters

Use date range, account and actual rider filters. Display performance columns Date, Captain ID, Actual rider, Total orders, Total working hours. For deductions display Date, Captain ID, Actual rider, Collected amount, Signed deductions. Render collected and deduction amounts to two decimals; keep the raw returned values for calculation/export. Decimal hours may be displayed as a rounded decimal or formatted duration, with the underlying precision retained.

Resolve `riderProfileId` to the actual rider's name, rather than using `ownerEmployeeId`. Preserve record `assignmentId` for history links. Reassignment does not change already-imported historical attribution. A page response is not a complete period total; do not label page sums as full-period totals unless every page has been fetched. No aggregate or export endpoint is added here.

## Permissions and errors

Permissions must apply to the Ninja client-platform scope. Backend checks remain authoritative.

| UI action | Required permissions |
| --- | --- |
| Accounts, performance and deductions reads | `platform_accounts.read` |
| Import either sheet | `platform_accounts.update` |
| Assign | `platform_assignments.create` + `platform_accounts.update` |
| Return | `platform_assignments.delete` + `platform_accounts.update` |
| Change phone | `platform_accounts.update` |
| Supply any new password | Also `platform_credentials.rotate` |
| Rider picker / notification inbox | `riders.read` / `notifications.read` respectively |

The password permission is needed even if a supplied password would be skipped during cooldown. Users without it can send null for assignment and for a locked return; after cooldown, a return requires a permitted operator to provide a new password. Existing platform/account setup screens keep their own permissions.

Non-success responses use ProblemDetails. Render `detail` and optional `field`, `details` or model-validation `errors`; retain `correlationId` for support. Handle 401 through existing session renewal, 403 as unavailable permission/scope, 400 as validation, 404 as a missing account and 409 by refetching. Upload middleware can also reject a request with 413/415. Business-invalid file content normally returns 400 or an HTTP 200 issue list, so handle both.

Known module error codes: `ninja.not_found`, `ninja.forbidden`, `ninja.invalid`, `ninja.conflict`, `ninja.use_workflow`. Shared assignment rules can return existing HR/platform error codes; do not assume all codes start with `ninja.`.

## Acceptance checks after backend publication

| Scenario | Expected frontend behavior |
| --- | --- |
| Assign with a permitted new password | Actual rider and phone update; password changed indicator and 72-hour deadline |
| Assign or return during cooldown | Operation succeeds, phone updates, password retained, warning shown |
| Return after deadline with null/unchanged password | Validation error; require a different password |
| Update phone alone during cooldown | Phone updates; cooldown warning; password stays unchanged |
| Stale assignment/account token | 409; reload and review the relevant record |
| Owner differs from assigned rider | Daily reports show the actual rider |
| One invalid upload row | Issue table; zero rows saved from the entire file |
| Identical upload repeated | Skipped rows information, no duplicated records |
| Conflicting data or two assignments covering a day | Issue table; no overwrite or arbitrary attribution |
| Negative deduction / zero performance | Sign and zeros displayed correctly |
| No Ninja accounts / no read permission | Setup empty state / permission state respectively |

Verify both Arabic RTL and English presentation, especially phone/Captain IDs, signed money, date inputs, password deadlines and row-level upload errors. Finish with authenticated hosted smoke checks after API publication; the database deployment alone does not validate frontend integration.
