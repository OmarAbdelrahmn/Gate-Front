# Ninja account sheet checkups

Source contract: 15 October 2026. This workflow saves sheet checkups separately from the main accounts. It never changes ERP account status/city/owner, employee iqamas, assignments, phones, passwords, daily performance or deductions.

The hosted migration `20261015134151_AddNinjaAccountSheetReviews` was applied and independently verified on **15 October 2026 at 16:53:16 Riyadh time**, preserving all 301 Ninja accounts and 107 assignment records. The updated API binary still needs publishing before enabling the workflow. See [hosted deployment evidence](ninja-account-sheet-reviews-hosted-deployment-20261015.md) and the [new services handoff](ninja-sheet-checkup-services-frontend-handoff.md). [Idempotent deployment SQL](../database/scripts/ninja-account-sheet-reviews.sql) and [verification SQL](../database/scripts/verify-ninja-account-sheet-reviews.sql) are supplied; the script baseline is `20261015080537_ResetJahezToAccountsOnlyV2`.

## User flow

1. Select a Ninja account export and optionally enter a note for the upload.
2. Upload it and display its summary, original sheet-status counts, and saved note.
3. Load its rows. Show Captain ID, sheet name/city/iqama/status/suspension, ERP values alongside them, match result, and all problem messages. A row may have several problems.
4. Provide filters for missing accounts (`NotFound`), any problems, and exact sheet status such as `NAQL_BLOCKED`.
5. Edit or clear the upload's note using its latest rowversion. Users can reopen prior uploads; their original comparisons do not change.

This repository supplies the API and frontend contract; clients render the report using these responses. There is no automatic correction/apply action.

## Sheet format and matching

Required row-1 headers: `المعرف`, `الاسم`, `المدينة`, `رقم الهوية`, `الحالة`. `موقوف` is optional. Columns can appear in any order. The exact original provider export with blank A1 is also supported only when B1:H1 match `الصورة`, `الاسم`, `المدينة`, `رقم الهوية`, `البريد الإلكتروني`, `الحالة`, `موقوف`. In that layout A is the Captain ID column. Arbitrary blank headers are not treated as IDs.

Only the account fields above are parsed. Email, images, creation-time strings and action columns are ignored. Workbook text is data, never executable instructions. Neither this process nor testing edits the source workbook.

Captain ID from `المعرف` matches the Ninja account's `externalAccountId`, not the ERP GUID and not the iqama. IDs are trimmed, digit-normalized and kept as strings, including leading zeros. Numeric IDs must be nonnegative whole numbers below 10^15; zero-only Excel number formats preserve leading zeroes. Two system IDs normalizing to the same Captain ID produce `Ambiguous`; the service never selects a first match. Duplicate Captain IDs inside one sheet reject that file.

Matching is limited to visible accounts on the authorized platform code `NINJA`. Manually archived accounts remain visible; soft-deleted and other-platform accounts are not matched. It does not match an unknown account by name/iqama or create a replacement account. The check supports at most 10,000 sheet accounts and 10,000 visible system accounts.

The two recognized provider footer forms (`الصفوف في كل صفحة` and the numeric Arabic range) are ignored only as trailing rows with no other values. Arbitrary invalid IDs are rejected. Exactly one worksheet must contain the required header set. Duplicate headers, formulas in parsed fields, invalid IDs and invalid suspension values reject the whole upload before persistence.

`موقوف` accepts boolean cells or True/False, 1/0, نعم/لا strings. Missing/blank means null, distinct from false. Provider statuses are preserved as text, including unknown future statuses. `ACTIVE`, `NAQL_BLOCKED`, and the separate `موقوف` flag are not mapped to ERP account statuses.

Blank or malformed text iqamas, blank city/status values, missing owners, and city/iqama differences are saved as row problems rather than preventing users from reviewing the rest of the file. Non-integral/out-of-range numeric identifier cells are structural errors. All persisted rows belong to one atomic save. Transport/structural errors return HTTP 400 and save no upload/rows.

Limits: `.xlsx`, 10 MiB uploaded, 40 MiB expanded ZIP contents, 2,000 ZIP entries, 200 columns, 10,000 account rows plus limited trailing footers. File name <=255 characters; note <=4000 trimmed characters.

## Permissions

All permissions below require the Ninja `ClientPlatform` scope. The controller and service both enforce access.

| Action | Permission |
| --- | --- |
| Upload a sheet; edit its note | `platform_accounts.update` |
| List uploads; read a summary or rows | `platform_accounts.read` |

No new permission keys are added. A read-only operator can review but cannot upload/edit notes. An update-only operator can save and receive the upload result without needing an extra read grant. The editable note does not grant write access to main accounts.

## Endpoints

| Method | Route | Request / response |
| --- | --- | --- |
| POST | `/api/ninja/accounts/sheet-updates` | Multipart `file`, optional `note` → upload metadata/summary |
| GET | `/api/ninja/accounts/sheet-updates` | `page=1&pageSize=50` → paginated upload metadata/summaries, newest first |
| GET | `/api/ninja/accounts/sheet-updates/{uploadId}` | One saved upload's metadata/summary/note |
| GET | `/api/ninja/accounts/sheet-updates/{uploadId}/rows` | Paginated saved rows and problems |
| PUT | `/api/ninja/accounts/sheet-updates/{uploadId}/note` | JSON `{ note, rowVersion }` → updated upload metadata/summary |

Rows accept optional `matchStatus=Found|NotFound|Ambiguous`, `sheetStatus`, `problemsOnly=false`, `page=1`, `pageSize=50`. Filters combine with AND. `sheetStatus` uses the database's string comparison/collation. Page must be 1–100000; page size 1–100. Responses include `totalCount` for the active filters; source rows sort ascending. Empty results use `items: []`.

Successful requests return HTTP 200 and camelCase JSON directly, with the existing ERP bearer authentication. The original workbook bytes are not retained or offered for download: parsed account rows, file/sheet names, source row numbers, SHA-256 file hash, statuses, comparison snapshots, uploader/time and note are persisted. Reuploading an identical file creates a new checkup with its own note and comparison snapshot; the hash is provenance, not an idempotency key. This lets the same sheet be checked again against a changed ERP.

### Upload metadata and summary

```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "fileName": "accounts.xlsx",
  "sheetName": "Sheet1",
  "contentHash": "<64-character-SHA256>",
  "note": "Check the missing accounts with operations",
  "createdAtUtc": "2026-10-15T13:00:00+00:00",
  "createdByUserId": "00000000-0000-0000-0000-000000000002",
  "updatedAtUtc": null,
  "rowVersion": "AQ==",
  "ignoredFooterRows": 2,
  "summary": {
    "totalRows": 2,
    "foundRows": 1,
    "notFoundRows": 1,
    "ambiguousRows": 0,
    "rowsWithProblems": 2,
    "cityMismatchRows": 1,
    "iqamaProblemRows": 1,
    "naqlBlockedRows": 1,
    "suspendedRows": 1
  },
  "sheetStatuses": [
    { "sheetStatus": "ACTIVE", "count": 1 },
    { "sheetStatus": "NAQL_BLOCKED", "count": 1 }
  ]
}
```

Counts overlap: a blocked row can also have a wrong city and iqama mismatch. `rowsWithProblems` counts each affected row once. `foundRows + notFoundRows + ambiguousRows = totalRows`. City-problem counts include missing sheet/system cities. Iqama-problem counts include malformed sheet iqamas, owner/iqama unavailability, mismatches, and non-active owner ERP status. Neither count includes `NAQL_BLOCKED`; that provider flag has its own count.

List response: `{ items: [uploadMetadata], page, pageSize, totalCount }`.

### Row response

```json
{
  "items": [{
    "id": "00000000-0000-0000-0000-000000000003",
    "sourceRowNumber": 2,
    "captainId": "00272578",
    "sheetOwnerName": "Owner from export",
    "sheetCity": "JEDDAH",
    "sheetIqamaNo": "2000000002",
    "sheetStatus": "NAQL_BLOCKED",
    "sheetSuspended": true,
    "matchStatus": "Found",
    "system": {
      "accountId": "00000000-0000-0000-0000-000000000004",
      "captainId": "00272578",
      "accountCode": "NINJA-1",
      "status": "Available",
      "ownerEmployeeId": "00000000-0000-0000-0000-000000000005",
      "ownerNameAr": "مالك الحساب",
      "ownerNameEn": "Registered Owner",
      "ownerIqamaNo": "2000000001",
      "ownerStatus": "Active",
      "operatingCityId": "00000000-0000-0000-0000-000000000006",
      "cityCode": "RIYADH",
      "cityNameAr": "الرياض",
      "cityNameEn": "Riyadh"
    },
    "problems": [
      { "code": "CityMismatch", "messageAr": "مدينة الملف تختلف عن مدينة الحساب في النظام.", "messageEn": "The sheet city differs from the ERP account city." },
      { "code": "IqamaMismatch", "messageAr": "هوية الملف لا تطابق هوية صاحب الحساب في النظام.", "messageEn": "The sheet iqama differs from the registered owner's ERP iqama." },
      { "code": "NaqlBlocked", "messageAr": "الحساب محظور في نقل حسب حالة الملف.", "messageEn": "The sheet reports NAQL_BLOCKED." }
    ]
  }],
  "page": 1,
  "pageSize": 50,
  "totalCount": 1
}
```

Examples use fictional identities. Show messages returned by the server. The `system` object is the comparison captured at upload time, not a live reread. `NotFound` and `Ambiguous` have `system: null` while still preserving the sheet's name, city, iqama, status and suspension flag. The iqama being compared is the registered owner's, never the current actual rider's.

### Problem codes and meaning

| Code | Meaning |
| --- | --- |
| `AccountNotFound` | Captain ID is in the sheet but not in visible authorized Ninja accounts |
| `AccountAmbiguous` | Multiple ERP account IDs normalize to that Captain ID; no match selected |
| `SheetIqamaInvalid` | Sheet iqama is not exactly ten digits |
| `OwnerMissing` | Registered owner is absent/deleted/unavailable |
| `OwnerIqamaMissing` | Owner exists but no iqama is recorded in the ERP |
| `IqamaMismatch` | Sheet iqama differs from the registered owner's ERP iqama |
| `OwnerNotWorking` | Owner's ERP status is not `Active`; the actual ERP status is included in the message |
| `SheetCityMissing` | City is blank in the export |
| `SystemCityMissing` | ERP operating/global city cannot be resolved |
| `CityMismatch` | Sheet city matches none of the ERP city's code, Arabic name or English name |
| `SheetStatusMissing` | The export has a blank account status |
| `NaqlBlocked` | Provider status is `NAQL_BLOCKED`, independently of ERP iqama/employee checks |
| `SheetSuspended` | `موقوف` is true |

City comparisons ignore case and repeated/outer whitespace. No speculative city aliases are invented. `NAQL_BLOCKED` reports what the provider export says; it does not establish the government's current residency validity or the precise block cause. `OwnerNotWorking` is an ERP employment-status check, not a legal iqama validity check. Both remain visible separately as requested.

### Notes and concurrency

```json
{ "note": "Operations reviewed missing accounts", "rowVersion": "AQ==" }
```

The upload's token is distinct from all account/assignment tokens. Null/blank note clears it. Notes are trimmed and limited to 4000 characters. Every edit participates in upload rowversion concurrency and is recorded by the ERP audit interceptor. Stale/invalid tokens return HTTP 409; reload the upload and let the user reconcile their note. Row snapshots are append-only and cannot be edited by the note endpoint.

### Latest sheet data on account reads

Existing Ninja account list/detail/status responses add nullable `latestSheetStatus`, `latestSheetSuspended`, `latestSheetUploadId`, `sheetUpdatedAtUtc`. They are derived from the latest saved **Found** row for that account. Main `status` remains the ERP operational status. No account table fields or rowversions are written by uploads. An upload missing an account does not erase its previous observation; old sheet snapshots remain available. These fields are an upload-time observation, not a live provider integration or an automatic enforcement rule.

### Errors

- HTTP 400 / `ninja.account_sheet_invalid`: malformed workbook structure/rows; `issues` is a top-level ProblemDetails extension with `{ rowNumber, captainId, message }[]`. Nothing is saved.
- HTTP 400 / `ninja.invalid`: invalid filename/size/note/filter/page.
- HTTP 401/403: existing ERP authentication/permission/scope checks.
- HTTP 404: unknown saved upload.
- HTTP 409 / `ninja.conflict`: stale note token or storage conflict.
- HTTP 413: upload middleware size limit.

Valid account discrepancies are successful saved checkups with row problems; they are not upload errors.

## Persistence and deployment

`ninja.NinjaAccountUpdateUploads` stores the upload scope, file/sheet/hash, note, creator/time and audit/concurrency fields. `ninja.NinjaAccountUpdateRows` stores source fields, match classification, flags and immutable ERP/problem JSON snapshots. Restricting foreign keys prevent removing referenced history. Unique `(UploadId, CaptainId)` and `(UploadId, SourceRowNumber)` indexes prevent duplicate rows. An account/time index supports latest sheet reads.

The generated migration creates only these two tables and indexes/constraints. It changes no main account columns or data. Apply the reviewed SQL before publishing the updated API, because account reads now consult the new observation table. Keep both tables when rolling back an API binary; dropping them would lose checkup history and notes.

Frontend TypeScript types and five client methods are included in [ninja-api-contracts.ts](ninja-api-contracts.ts). Broader [Ninja endpoint reference](ninja-full-api-reference.md) and [system guide](ninja-system-details.md) retain the account, assignment and performance workflows.

## Verification on 15 October 2026

- Solution/API builds succeeded with zero warnings/errors. EF reports no pending model changes after the new migration.
- Focused Ninja/Chefz/shared-platform workflows: 134 passed, 10 optional SQL/sample checks skipped. Scoped authorization: 30 passed. Total: 164 focused checks passed.
- The supplied export was parsed read-only through the production parser: 163 account rows, two footer rows, 84 `NAQL_BLOCKED`, 79 `ACTIVE`, 59 suspended. No source file was modified or imported into a hosted database.
- Tests cover separate data persistence, unchanged main-account fields/rowversion, status/problem combinations, not-found/ambiguous matches, filtering/counts, editable/clearable notes, stale tokens, immutable snapshots, permission separation and the original blank-ID-header format.
- The real SQL Server provider compiled the account lookup, latest-sheet selection, upload-list pagination and summary aggregates using intercepted readers. This checks translation, not live application queries or production performance. The SQL script was subsequently applied to the hosted database at 16:53:16 Riyadh time, with schema, constraints, indexes and migration history independently verified; see the deployment evidence above.
- All 19 Ninja controller routes are documented; local links resolve. The migration/snapshot additions are limited to the two new Ninja entities.
