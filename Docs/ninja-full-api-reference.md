# Full Ninja API reference

Updated 15 October 2026 from `NinjaController`, `INinjaService` and their contracts. These are source-code contracts; the updated backend must be published before clients use the additions. See [system behavior and permissions](ninja-system-details.md), [typed requests/responses and fetch client](ninja-api-contracts.ts), and [comparison details](ninja-account-comparison-frontend-handoff.md).

The hosted sheet-checkup database migration is now [applied and verified](ninja-account-sheet-reviews-hosted-deployment-20261015.md). The five new services have a dedicated [frontend handoff](ninja-sheet-checkup-services-frontend-handoff.md). Updated API publication remains pending.

## Common conventions

- Base path: `/api/ninja`; send the ERP bearer token using `Authorization: Bearer <access-token>`.
- JSON property names are camelCase. Successful responses are returned directly without a `data` envelope. All Ninja operations below return HTTP 200 on success.
- IDs are GUID strings. Captain IDs, iqamas and phone numbers are strings; retain leading zeroes.
- Business dates use `YYYY-MM-DD` and Riyadh calendar dates. Instants use ISO 8601 UTC timestamps. Date ranges are inclusive.
- `page` defaults to 1 and accepts 1–100000; `pageSize` defaults to 50 and accepts 1–100. Existing account/daily/report pages use `{ items, page, pageSize }`. Saved sheet-checkup pages additionally include `totalCount`. An empty page is valid.
- Account and assignment rowversions are separate Base64 concurrency tokens. Refresh after writes/conflicts. Neither token is a password or date.
- Multipart uploads use the exact field names below. Let the HTTP client set the multipart boundary.

## Complete Ninja endpoint inventory

The permission names below are checked against the `NINJA` client-platform scope. `read` means `platform_accounts.read`; `update` means `platform_accounts.update`.

| # | Method | Route | Permission | Success contract |
| --- | --- | --- | --- | --- |
| 1 | GET | `/api/ninja/accounts` | read | `NinjaPage<NinjaAccountResponse>` |
| 2 | GET | `/api/ninja/accounts/{accountId}` | read | `NinjaAccountResponse` |
| 3 | PUT | `/api/ninja/accounts/{accountId}/status` | update | `NinjaAccountResponse` |
| 4 | POST | `/api/ninja/accounts/compare` | read | `NinjaAccountComparisonResponse` |
| 5 | POST | `/api/ninja/accounts/{accountId}/assign` | `platform_assignments.create` + update | `NinjaLifecycleResponse` |
| 6 | POST | `/api/ninja/accounts/{accountId}/return` | `platform_assignments.delete` + update | `NinjaLifecycleResponse` |
| 7 | PUT | `/api/ninja/accounts/{accountId}/credentials` | update | `NinjaCredentialResponse` |
| 8 | POST | `/api/ninja/performance/import` | update | `NinjaImportResponse` |
| 9 | POST | `/api/ninja/deductions/import` | update | `NinjaImportResponse` |
| 10 | GET | `/api/ninja/performance` | read | `NinjaPage<NinjaPerformanceResponse>` |
| 11 | GET | `/api/ninja/deductions` | read | `NinjaPage<NinjaDeductionResponse>` |
| 12 | GET | `/api/ninja/reports/performance` | read | `NinjaPerformanceReport` |
| 13 | GET | `/api/ninja/reports/daily` | read | `NinjaPage<NinjaDailyReport>` |
| 14 | GET | `/api/ninja/reports/riders` | read | `NinjaPage<NinjaRiderReport>` |
| 15 | POST | `/api/ninja/accounts/sheet-updates` | update | `NinjaAccountUpdateUploadResponse` |
| 16 | GET | `/api/ninja/accounts/sheet-updates` | read | `NinjaAccountUpdatePage<NinjaAccountUpdateUploadResponse>` |
| 17 | GET | `/api/ninja/accounts/sheet-updates/{uploadId}` | read | `NinjaAccountUpdateUploadResponse` |
| 18 | GET | `/api/ninja/accounts/sheet-updates/{uploadId}/rows` | read | `NinjaAccountUpdatePage<NinjaAccountUpdateRowResponse>` |
| 19 | PUT | `/api/ninja/accounts/sheet-updates/{uploadId}/note` | update | `NinjaAccountUpdateUploadResponse` |

For endpoints 5–7, any non-null `newPassword` additionally requires `platform_credentials.rotate`. This applies even when cooldown retains the old password.

For endpoints 15–19, see the [complete sheet-checkup contract](ninja-account-sheet-updates.md), including multipart upload, saved notes, original sheet statuses, row problems, matching rules, filters and deployment SQL. These checkups do not change main accounts and require the new `AddNinjaAccountSheetReviews` migration. The no-new-migration statement in earlier status/reporting notes applies only to those earlier additions.

## 1. List accounts

`GET /api/ninja/accounts?page=1&pageSize=50`

Lists current visible Ninja accounts, including manually suspended, retired and archived accounts. Orders by Captain ID then account ID. Parameters are `page` and `pageSize` only; use the shared account directory for its advanced filters.

The following account contract is shared by list items, account detail and status responses. Example data is fictional:

```json
{
  "accountId": "00000000-0000-0000-0000-000000000001",
  "captainId": "00272578",
  "status": "Assigned",
  "ownerEmployeeId": "00000000-0000-0000-0000-000000000002",
  "actualRiderProfileId": "00000000-0000-0000-0000-000000000003",
  "phoneNumber": "0503333333",
  "hasPassword": true,
  "passwordChangeAllowedAtUtc": "2026-10-16T09:00:00+00:00",
  "rowVersion": "AQ==",
  "currentAssignmentId": "00000000-0000-0000-0000-000000000004",
  "assignmentRowVersion": "Ag==",
  "owner": {
    "employeeId": "00000000-0000-0000-0000-000000000002",
    "nameAr": "مالك الحساب",
    "nameEn": "Account Owner",
    "phoneNumber": "0501111111",
    "iqamaNo": "2000000001"
  },
  "actualRider": {
    "employeeId": "00000000-0000-0000-0000-000000000005",
    "nameAr": "المندوب المستخدم",
    "nameEn": "Assigned Rider",
    "phoneNumber": "0502222222",
    "iqamaNo": "2000000002"
  },
  "statusReason": null,
  "code": "NINJA-1",
  "operatingCityId": "00000000-0000-0000-0000-000000000006",
  "sponsorId": "00000000-0000-0000-0000-000000000007",
  "isOperationallyBlocked": false,
  "operationalBlockReason": null
}
```

`owner` and `actualRider` contain employee details, not ERP login-user details. The top-level phone is the Ninja account phone. Each nested phone comes from the respective employee primary phone. NameEn/phone/iqama may be null. An unassigned account has null `actualRiderProfileId`, `actualRider`, `currentAssignmentId` and `assignmentRowVersion`. Missing/deleted person references return a null nested object without inventing owner/user data. `ownerEmployeeId` and `sponsorId` can also be null for existing records.

`hasPassword` reports whether any credential version exists; password values are never returned. The deadline can be in the past and does not itself mean the password is currently locked.

Account responses also expose nullable `latestSheetStatus`, `latestSheetSuspended`, `latestSheetUploadId`, `sheetUpdatedAtUtc` from the latest matched saved sheet row. These are separate observations; the main `status` remains the ERP operational status. No account fields are written by a checkup.

## 2. Account detail

`GET /api/ninja/accounts/{accountId}`

Returns the enriched account contract above. Missing or inaccessible accounts return an appropriate error rather than a null success. This is the recommended refresh after assignment, return or credential edits.

## 3. Change account status

`PUT /api/ninja/accounts/{accountId}/status`, JSON:

```json
{ "status": "Suspended", "rowVersion": "AQ==", "reason": "Under review" }
```

`status` and the latest account `rowVersion` are required. Exact accepted values: `Active`, `Suspended`, `Retired`, `Archived`. Optional `reason` is trimmed and limited to 500 characters.

`Active` restores automatic status: `Assigned` if an open assignment exists, otherwise `Available`; it clears the reason. The other three states preserve assignment, owner, credentials and history. `Archived` remains visible and does not soft-delete. An assignment cannot be created until the status is `Available`. Return preserves manual status. `Active` is rejected while the current rider has an outstanding operational debt block.

Use this endpoint for existing Ninja status changes. Generic account update services reject status/reason changes or platform moves for existing Ninja accounts with `ninja.use_workflow`.

## 4. Compare account workbook

`POST /api/ninja/accounts/compare`, multipart field `file` containing `.xlsx`, maximum 10 MiB. No report date is needed. Required headers are `المعرف`, `الاسم`, `المدينة`, `رقم الهوية`.

The response contains:

| Field | Shape |
| --- | --- |
| `fileName`, `comparedAtUtc` | Source name and UTC comparison timestamp |
| `comparisonCompleted`, `ignoredFooterRows` | Completion flag and ignored footer count |
| `summary` | Counts: `sheetAccounts`, `systemAccounts`, `matchingAccounts`, `differentAccounts`, `sheetOnlyAccounts`, `systemOnlyAccounts` |
| `matchingAccounts`, `differentAccounts` | Arrays of `{ sheet, system, differences }` |
| `sheetOnlyAccounts` | `{ sheet, possibleSystemAccounts, possibleSystemAccountCount }[]` |
| `systemOnlyAccounts` | System-account array |
| `issues` | `{ rowNumber, captainId, message }[]` |

Sheet objects contain `rowNumber`, `captainId`, `ownerName`, `city`, `ownerNationalId`. System objects contain `accountId`, `captainId`, `accountCode`, `status`, `ownerEmployeeId`, `ownerNationalId`, `ownerNameAr`, `ownerNameEn`, `operatingCityId`, `cityCode`, `cityNameAr`, `cityNameEn`. A difference is `{ field, sheetValue, systemValue }` for `ownerNationalId`, `ownerName` or `city`.

Comparison uses registered ownership and city, not the actual rider. Possible matches are review hints, limited to 20 per sheet row, with a separate full candidate count. It never imports or edits accounts. Check `comparisonCompleted` and `issues` even on HTTP 200. Invalid workbooks/ambiguous system identifiers do not produce a misleading missing-account result. See the [dedicated comparison guide](ninja-account-comparison-frontend-handoff.md) for normalization, footer and matching rules.

## 5. Assign account

`POST /api/ninja/accounts/{accountId}/assign`, JSON:

```json
{
  "actualRiderProfileId": "00000000-0000-0000-0000-000000000003",
  "effectiveFrom": "2026-10-15",
  "phoneNumber": "0503333333",
  "newPassword": null,
  "reason": "Handed to rider",
  "wasBackdated": false,
  "backdatedReason": null
}
```

Required fields: rider profile, effective date, valid phone. `newPassword`/`reason` are optional; backdating defaults to false and requires a valid backdate reason when used. Account must be available and rider/owner/assignment rules must pass. The phone is required even if the password stays unchanged.

Success is `{ assignment, credentials }`. Assignment fields:

```text
id, accountId, paymentModel,
actualRiderProfileId, actualEmployeeId, actualRiderNameAr, actualRiderNameEn,
effectiveFrom, effectiveTo, status, startReason, endReason,
wasBackdated, backdatedReason, assignedByUserId, endedByUserId, rowVersion
```

Dates are date-only; `effectiveTo`, nameEn, reasons, and endedByUserId may be null. `rowVersion` here belongs to the assignment. Credential fields are documented in section 7. Owner/actual-rider person objects are obtained from account detail after the operation.

## 6. Return account

`POST /api/ninja/accounts/{accountId}/return`, JSON:

```json
{
  "effectiveTo": "2026-10-15",
  "phoneNumber": "0504444444",
  "newPassword": "replacement-password",
  "reason": "Account returned",
  "rowVersion": "Ag==",
  "status": "Ended"
}
```

Use the **assignment** token, from `assignmentRowVersion` in account reads or `assignment.rowVersion` in a lifecycle response. `status` defaults to `Ended`; shared release rules also accept `Cancelled`. Required: date, valid replacement phone, reason and assignment token. The end date cannot precede the assignment start or be in the future. It is inclusive for historical attribution.

After password cooldown, a different new password is required. During cooldown, null or supplied passwords retain the old value and the operation returns a warning. Success is the same lifecycle contract as assign. A normal assigned account becomes available; a manually suspended/retired/archived account retains its status and reason.

## 7. Update recorded credentials

`PUT /api/ninja/accounts/{accountId}/credentials`, JSON:

```json
{
  "newPassword": null,
  "phoneNumber": "0505555555",
  "reason": "Updated account contact phone",
  "rowVersion": "AQ=="
}
```

At least one of `newPassword`, `phoneNumber` must be non-null. Reason is required, trimmed, maximum 1000 characters. A supplied phone must contain at least seven digits, maximum 32 characters, and may additionally contain `+`, spaces, hyphens and parentheses. A supplied password must be nonblank and at most 4096 characters. Use the **account** rowversion.

`NinjaCredentialResponse`:

```json
{
  "accountId": "00000000-0000-0000-0000-000000000001",
  "phoneNumber": "0505555555",
  "hasPassword": true,
  "passwordChanged": false,
  "passwordChangeAllowedAtUtc": "2026-10-16T09:00:00+00:00",
  "notification": {
    "code": "ninja.password_cooldown",
    "messageAr": "لم تتغير كلمة المرور؛ يمكن تغييرها بعد الموعد المحدد.",
    "messageEn": "Password retained. It can be changed after the deadline.",
    "changeAllowedAtUtc": "2026-10-16T09:00:00+00:00"
  },
  "rowVersion": "Aw=="
}
```

Messages above are illustrative; use the response text. `notification` is null when no cooldown warning is generated. The deadline is null when no password has been recorded. Password changes start a 72-hour clock at actual UTC time, independent of backdated assignment dates. Matching the current password does not restart it. Phone changes apply immediately. A skipped password is not queued for automatic execution.

## 8–9. Import performance or deductions

`POST /api/ninja/performance/import` or `POST /api/ninja/deductions/import`.

Multipart fields:

| Field | Required value |
| --- | --- |
| `reportDate` | Explicit date, no later than today in Riyadh |
| `file` | Nonempty `.xlsx`, maximum 10 MiB |

Performance columns: `Captain ID`, `Total Orders`, `Total Working Hours`. Deductions columns: `CAPTAIN ID`, `labels.TotalCollectedAmountAtDelivery`, `TOTAL DEDUCTIONS`. Header matching ignores case and surrounding whitespace. Additional columns are ignored. Exactly one sheet must have all headers in row 1.

Performance orders are nonnegative whole numbers; hours are 0–24 at eight-decimal precision. Money is two-decimal precision; collected amount is nonnegative, deductions retain signed values. Invalid/formula/duplicate rows, unknown accounts, missing/overlapping assignments or conflicting saved rows reject the whole file. The record is credited to the one actual rider assigned on the selected date. Existing matching values are skipped; saved facts are never overwritten.

```json
{
  "importId": "00000000-0000-0000-0000-000000000008",
  "reportDate": "2026-10-15",
  "importedRows": 10,
  "skippedRows": 2,
  "issues": []
}
```

Validation failures found inside a workbook return HTTP 200 with `importId: null`, zero imported/skipped counts and nonempty `issues`. Each issue contains `rowNumber`, nullable `captainId`, and `message`. The frontend must inspect these fields. File/date/type-level validation can instead return HTTP 400. Concurrent storage conflicts return HTTP 409.

Workbook expansion limits are 40 MiB, 2,000 ZIP entries, 10,000 data rows and 200 columns. Imports do not post financial transactions or change account status.

## 10–11. Read raw daily records

`GET /api/ninja/performance?from=2026-10-01&to=2026-10-15`

`GET /api/ninja/deductions?from=2026-10-01&to=2026-10-15`

Required query values: `from`, `to`, with nonempty start and end >= start. Optional GUID filters: `accountId`, `riderId`; optional `page`, `pageSize`. These existing raw-record endpoints do not apply the new aggregate reports' 366-day/future-end validation. Filters use stored historical account and actual rider IDs; unmatched filters return an empty page. Rows sort by report date descending then record ID.

Performance item:

```json
{
  "id": "00000000-0000-0000-0000-000000000009",
  "accountId": "00000000-0000-0000-0000-000000000001",
  "assignmentId": "00000000-0000-0000-0000-000000000004",
  "riderProfileId": "00000000-0000-0000-0000-000000000003",
  "reportDate": "2026-10-15",
  "captainId": "00272578",
  "totalOrders": 18,
  "totalWorkingHours": 6
}
```

A deduction item has the same identity/date fields, replacing orders/hours with `totalCollectedAmountAtDelivery` and `totalDeductions`. Records remain attributed to the original rider after reassignment or account archival.

## 12. Selected-range performance summary

`GET /api/ninja/reports/performance?from=2026-10-01&to=2026-10-15`

Required: `from`, `to`, inclusive, no more than 366 calendar days, no later than today in Riyadh. Optional: `accountId`, `riderId`, combined with AND. No pagination; the summary covers the full selection. Unknown/inaccessible account filters return not-found; unknown rider IDs return not-found. Filters referencing existing records with no matching daily observations return zero totals.

```json
{
  "from": "2026-10-01",
  "to": "2026-10-15",
  "accountId": null,
  "riderId": null,
  "daysWithPerformance": 1,
  "daysWithDeductions": 1,
  "accountsWithData": 1,
  "ridersWithData": 1,
  "metrics": {
    "performanceRecords": 1,
    "deductionRecords": 1,
    "totalOrders": 18,
    "totalWorkingHours": 6,
    "ordersPerWorkingHour": 3,
    "totalCollectedAmountAtDelivery": 100,
    "totalDeductions": -10
  }
}
```

Coverage counts are distinct dates/accounts/riders across the selected facts, not current assignment counts. `ordersPerWorkingHour` is total orders / total hours, rounded to four decimal places, or null when total hours are zero. Deduction-only days contribute money and deduction coverage; they do not add a performance record or performance day. No-data summaries have zero totals/counts and null productivity.

## 13. Daily trend report

`GET /api/ninja/reports/daily?from=2026-10-01&to=2026-10-15&page=1&pageSize=50`

Same dates and optional account/rider filters as the summary, plus pagination. One row per date observed in either performance or deductions; order is earliest first. Missing dates are omitted, not turned into invented zero-performance rows.

```text
{ items: [{ date: "2026-10-15", metrics: NinjaReportMetrics }], page: 1, pageSize: 50 }
```

`metrics` is the exact contract in section 12. A date may have only a deduction record or an uploaded zero-performance observation; use the record counts to distinguish them.

## 14. Rider performance report

`GET /api/ninja/reports/riders?from=2026-10-01&to=2026-10-15&page=1&pageSize=50`

Same dates and optional filters, plus pagination. One row per historically attributed rider, ordered by total orders descending then rider ID. Totals combine that rider's selected account history, including different accounts and previous users of the currently selected account.

```text
{
  items: [{
    riderProfileId: Guid,
    rider: { employeeId, nameAr, nameEn, phoneNumber, iqamaNo } | null,
    accountsWithData: number,
    daysWithPerformance: number,
    daysWithDeductions: number,
    metrics: NinjaReportMetrics
  }],
  page: 1,
  pageSize: 50
}
```

`rider` is currently visible employee identity information; null means the person reference is unavailable, not that the totals belong to the owner. Historical rider IDs and totals remain. No ratings, acceptance rates, net salaries or payouts are implied by this report.

## Shared ERP endpoints used for setup and history

These remain outside `/api/ninja` and keep their existing ERP contracts and authorization rules:

| Method | Route | Use / permission |
| --- | --- | --- |
| GET/POST | `/api/platforms` | Read/create platform with `code: "NINJA"`; `platform_accounts.read` / `platform_accounts.create` |
| GET | `/api/platform-accounts` | Directory with account/platform/city/sponsor/owner/actual-rider/status/payment-model filters; `platform_accounts.read` |
| GET | `/api/platform-accounts/{id}` | Generic account detail; `platform_accounts.read` |
| POST | `/api/platform-accounts` | Create account; `platform_accounts.create` |
| PUT | `/api/platform-accounts/{id}` | Update metadata retaining Ninja status/reason/platform; `platform_accounts.update` |
| GET | `/api/platform-accounts/{id}/assignment-history` | Assignment history; `platform_assignments.read` |
| GET | `/api/platform-accounts/{id}/credential-history` | Credential version metadata only; `platform_credentials.read` |

Generic creation JSON (`SimplePlatformAccountUpsertRequest`) includes `platformId`, `operatingCityId`, `sponsorId`, `ownerRiderProfileId`, `code`, `externalAccountId`, `userName`, `paymentModel`, `status`, `statusReason`, `acquisitionDate`, `startDate`, `endDate`, `notes`, `archiveReason`, `rowVersion`. Null is accepted for optional fields; on creation, rowversion is null. Choose `Available`, `Suspended` or `Retired`, not `Assigned`/`Archived`. Payment model is `PayPerOrder` or `Salary` and must be supported by the platform. The sponsor must be active, the city valid and the owner a rider profile. Existing uniqueness and ownership rules still apply.

Generic `/assign`, `/release`, `/rotate-credential` operations reject Ninja accounts; use sections 5–7. The shared routes' scope resolution remains their own ERP behavior; Ninja's dedicated scoped reads/actions are the preferred operational interface.

## Errors and client handling

| HTTP | Typical cause |
| --- | --- |
| 400 | Invalid date, status, phone, rowversion format at binding, page limits, workbook format, password/reason rules |
| 401 | Missing/invalid ERP authentication |
| 403 | Missing permission or Ninja platform scope |
| 404 | Missing account or invalid explicit report entity filter |
| 409 | Stale account/assignment token, unavailable account, conflicting import, operational debt block, use of generic restricted workflow |
| 413 | Transport upload limit exceeded |

Business errors use the shared ProblemDetails mapping. Ninja error codes are `ninja.invalid`, `ninja.forbidden`, `ninja.not_found`, `ninja.conflict`, `ninja.use_workflow`. Shared platform workflows may return their existing detailed codes; operational debt blocking uses `rider.jahez_debt_block`. ASP.NET binding errors may use an `errors` dictionary instead of a business code. Preserve the message and correlation/trace information.

Treat cooldown notices as successful actions with retained passwords. Treat import `issues` or an incomplete comparison as rejected/incomplete work even when HTTP 200. After successful status/lifecycle/credential writes, refresh account detail and replace both tokens from the server.
