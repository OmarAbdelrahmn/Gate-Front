# Ninja sheet-checkup services

Updated 15 October 2026. The **hosted database migration is applied and verified**; the updated API binary still needs publishing before these endpoints can be used. See [deployment evidence](ninja-account-sheet-reviews-hosted-deployment-20261015.md).

These services save account checkups independently from main Ninja accounts. They do not change account status, city, owner, iqama, phone, password or assignments. The frontend displays the original sheet values beside the ERP comparison captured when the upload was saved.

## Authentication and permissions

Use the existing ERP bearer access token. All five routes check the `NINJA` client-platform scope. Successful responses are direct camelCase JSON, without a `data` envelope.

- `platform_accounts.update`: upload a sheet or edit its note.
- `platform_accounts.read`: list uploads, read summaries and read rows.

IDs are GUID strings. Captain IDs, phones and iqamas remain text. UTC timestamps should be displayed in `Asia/Riyadh`. No report-date input is required for these account checkups.

## 1. Upload and save a checkup

`POST /api/ninja/accounts/sheet-updates`

Send multipart form data:

| Field | Input |
| --- | --- |
| `file` | Required `.xlsx`, maximum 10 MiB |
| `note` | Optional upload note, maximum 4000 trimmed characters |

Let the HTTP client set the multipart boundary. Required headers are `المعرف`, `الاسم`, `المدينة`, `رقم الهوية`, `الحالة`; `موقوف` is optional. The original Ninja export with a blank A1 account-ID header is also supported when its remaining headers match the known provider layout. Trailing provider footers are ignored.

The service matches `المعرف` to a Ninja account's `externalAccountId`. It never searches by iqama as a replacement key and never creates missing accounts. Original sheet status and suspension are saved separately from the ERP operational status.

Success returns `NinjaAccountUpdateUploadResponse`:

```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "fileName": "accounts.xlsx",
  "sheetName": "Sheet1",
  "contentHash": "<SHA-256 of the uploaded file>",
  "note": "Review accounts missing from the ERP",
  "createdAtUtc": "2026-10-15T14:00:00+00:00",
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

Show the saved upload summary immediately, then load its rows. Problem counts overlap; `rowsWithProblems` counts each affected row once. A file containing valid rows with missing accounts or incorrect city/iqama data is saved successfully with those row problems.

## 2. List saved uploads

`GET /api/ninja/accounts/sheet-updates?page=1&pageSize=50`

Returns newest uploads first, with the same metadata/summary objects:

```text
{ items: NinjaAccountUpdateUploadResponse[], page, pageSize, totalCount }
```

`totalCount` is the number of authorized saved uploads. Page starts at 1; page size is 1–100. Display filename, upload time, note, found/not-found/problem counts and sheet-status counts.

## 3. Read an upload summary

`GET /api/ninja/accounts/sheet-updates/{uploadId}`

Returns one `NinjaAccountUpdateUploadResponse`. Use it to reopen a checkup and refresh its current note and rowversion before editing. Earlier comparisons remain saved even if the main account later changes.

## 4. Read rows and problems

`GET /api/ninja/accounts/sheet-updates/{uploadId}/rows`

Optional filters:

| Query | Meaning |
| --- | --- |
| `matchStatus` | `Found`, `NotFound` or `Ambiguous` |
| `sheetStatus` | Original sheet status, e.g. `NAQL_BLOCKED` |
| `problemsOnly` | `true` to show only rows with problems; defaults to false |
| `page`, `pageSize` | Defaults 1 and 50; page size maximum 100 |

Filters combine with AND. Rows sort by source row number. `totalCount` reflects the active filters.

```text
{
  items: [{
    id, sourceRowNumber, captainId,
    sheetOwnerName, sheetCity, sheetIqamaNo, sheetStatus,
    sheetSuspended: true | false | null,
    matchStatus: "Found" | "NotFound" | "Ambiguous",
    system: {
      accountId, captainId, accountCode, status,
      ownerEmployeeId, ownerNameAr, ownerNameEn, ownerIqamaNo, ownerStatus,
      operatingCityId, cityCode, cityNameAr, cityNameEn
    } | null,
    problems: [{ code, messageAr, messageEn }]
  }],
  page, pageSize, totalCount
}
```

For `NotFound`, display **موجود في الملف وغير موجود في النظام** and keep the original sheet status visible. `system` is null. `Ambiguous` means more than one ERP account normalized to that Captain ID; the service has not chosen a match.

The system values compare against the registered owner, not the actual assigned rider. City matching accepts the ERP city code or Arabic/English name, ignoring case and repeated whitespace.

Show every returned problem, because one row can have several:

| Problem code | Display meaning |
| --- | --- |
| `AccountNotFound` | Sheet account was not found in visible authorized Ninja accounts |
| `AccountAmbiguous` | Multiple ERP accounts match the normalized Captain ID |
| `CityMismatch` | Sheet city differs from the ERP account city |
| `SheetCityMissing`, `SystemCityMissing` | One side has no resolvable city |
| `SheetIqamaInvalid` | Sheet iqama is not ten digits |
| `OwnerMissing`, `OwnerIqamaMissing` | ERP owner or owner iqama is unavailable |
| `IqamaMismatch` | Sheet iqama differs from the registered owner's ERP iqama |
| `OwnerNotWorking` | Owner's ERP status is not Active; message includes that status |
| `NaqlBlocked` | Sheet status is `NAQL_BLOCKED` |
| `SheetSuspended` | Sheet `موقوف` flag is true |
| `SheetStatusMissing` | Sheet status is blank |

Keep `NaqlBlocked` separate from the ERP iqama/owner checks. It reports the provider's export, not an independent government iqama-validity check. Keep `sheetStatus`, `sheetSuspended`, and `system.status` as separate columns. Null suspension means the source did not provide a value.

## 5. Edit or clear the upload note

`PUT /api/ninja/accounts/sheet-updates/{uploadId}/note`

```json
{ "note": "Operations reviewed the missing accounts", "rowVersion": "AQ==" }
```

Send the latest **upload** rowversion, not an account or assignment token. Null/blank note clears it. Success returns updated upload metadata/summary; replace the local rowversion. Row snapshots remain unchanged. On HTTP 409, reload the upload and let the user reconcile their note.

## Additional account-read fields

Existing Ninja account list/detail responses also expose:

```text
latestSheetStatus: string | null
latestSheetSuspended: boolean | null
latestSheetUploadId: Guid | null
sheetUpdatedAtUtc: UTC timestamp | null
```

These are derived from the latest saved `Found` row. They do not update the main account table. The main `status` remains the ERP operational status. If a newer sheet omits an account, its last known observation remains available; use the timestamp to show its age.

## Error handling and persistence

Malformed files/headers, duplicate Captain IDs, formulas or invalid suspension values return HTTP 400 / `ninja.account_sheet_invalid` with top-level `issues: [{ rowNumber, captainId, message }]`; no upload or rows are saved. Other invalid inputs use `ninja.invalid`. Handle standard 401/403, missing upload 404 and concurrency/storage conflict 409.

Saved data includes parsed rows, original statuses/flags, file hash/name, comparison snapshots, uploader/time and the editable note. Original workbook bytes are not retained for download. Reuploading the same workbook creates a separate checkup against the current ERP and does not overwrite earlier reports.

Use the [TypeScript contracts and client](ninja-api-contracts.ts): `uploadAccountSheet`, `accountSheetUploads`, `accountSheetUpload`, `accountSheetRows`, `updateAccountSheetNote`.

See the [complete matching, validation and storage guide](ninja-account-sheet-updates.md) and [all Ninja endpoints](ninja-full-api-reference.md).
