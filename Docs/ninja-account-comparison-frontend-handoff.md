# Ninja account comparison upload

Added on 13 October 2026. Upload an owner-account workbook and compare it with the existing Ninja accounts. The user confirmed that `رقم الهوية` identifies the **registered owner**, and requested **comparison only**. This operation never updates account numbers, cities, employee details, assignment history, passwords, phones or daily reports. It needs no database migration. Publish the updated API before using the new endpoint.

## Request

`POST /api/ninja/accounts/compare`

Send multipart FormData with one required `file` field containing `.xlsx`; no report date is needed. Bearer authentication and `platform_accounts.read` for the Ninja client-platform scope are required. Do not manually set multipart Content-Type.

The workbook must have exactly one worksheet with these headers in row 1; header surrounding spaces are ignored and column order can vary:

| Header | Meaning |
| --- | --- |
| `المعرف` | Captain ID / platform account number, matched to `ExternalAccountId` |
| `الاسم` | Registered owner's name |
| `المدينة` | Account operating city |
| `رقم الهوية` | Registered owner's national ID / Iqama, compared with employee `IqamaNo` |

Identifiers stay as strings. Arabic/Persian digits are normalized; leading zeroes are preserved. Numeric cells must be nonnegative whole numbers below 10^15; long identifiers should be text. Zero-only numeric formats preserve leading zeroes. National ID must have ten digits. Name and city are required, maximum 200 characters each. Duplicate Captain IDs, formulas in compared fields, missing headers or invalid rows stop the comparison. An owner identity appearing on multiple account rows is allowed.

The provider's footer rows `الصفوف في كل صفحة` and pagination text such as `200 من 200-1` are ignored only when their other compared cells are empty and they occur after the account rows. Arbitrary invalid IDs are reported rather than silently ignored. The supplied sample parsed as **163 account rows and two footer rows**.

Limits: 10 MiB upload, 40 MiB expanded ZIP contents, 2,000 ZIP entries, 10,000 account rows, 200 columns. At most 10,000 system accounts can be compared in one response. There is no paging on this bounded comparison result.

## Response and UI sections

The HTTP 200 response is `NinjaAccountComparisonResponse`; [TypeScript types and client](ninja-api-contracts.ts) include `api.compareAccounts(file)`.

| UI label | Response collection | Meaning |
| --- | --- | --- |
| In sheet, missing from system / موجودة في الملف وغير موجودة في النظام | `sheetOnlyAccounts` | Captain ID is absent from scoped Ninja accounts |
| In system, missing from sheet / موجودة في النظام وغير موجودة في الملف | `systemOnlyAccounts` | System Captain ID is absent from the workbook |
| Different details / بيانات مختلفة | `differentAccounts` | Same Captain ID with different owner identity, name or city |
| Matching accounts / حسابات متطابقة | `matchingAccounts` | Same Captain ID and matching compared details |

`summary` has a count for each collection plus `sheetAccounts` and `systemAccounts`. `comparedAtUtc` is the comparison time. The invariants on a completed response are:

```text
sheetAccounts = matchingAccounts + differentAccounts + sheetOnlyAccounts
systemAccounts = matchingAccounts + differentAccounts + systemOnlyAccounts
```

Each matching/different entry contains `sheet`, `system` and `differences`. Display workbook row number, account number and side-by-side sheet/system owner and city values. Difference fields are `ownerNationalId`, `ownerName` and `city`. System data includes account GUID, internal code, status, owner employee GUID, national ID, Arabic/English owner names and city names/code.

When an account number is present only in the sheet, `possibleSystemAccounts` can contain system-only accounts with the same owner national ID. These suggest an account-number change for review. They remain in their original missing-account sections and are not treated as matched. Multiple candidates are possible. Up to 20 candidates are included; `possibleSystemAccountCount` gives the full count. Do not offer an automatic update action in this workflow.

## Matching rules

Captain ID is the primary key for presence comparison, after trimming and digit normalization. A leading-zero ID is distinct from an ID without the zero. Name comparison ignores case and repeated whitespace and accepts either stored Arabic or English owner name. City comparison accepts the stored city code, Arabic name or English name with the same case/whitespace normalization. It does not guess spelling variants or transliterate names.

The registered employee comes from the account's `RegisteredEmployeeId`. The currently assigned rider is not consulted. City comes from the account's operating city, not the employee's current city. An unavailable owner or city reference remains visible and is flagged as a detail difference.

Only Ninja accounts in the caller's allowed platform scope are read. All account statuses, including archived, are compared; soft-deleted accounts are excluded. Other platforms cannot appear in the report. Normalization collisions between system Captain IDs stop comparison rather than choosing a record arbitrarily.

## Validation and states

Check `comparisonCompleted` and `issues`, even when HTTP status is 200. A false value means the file or system IDs need correction before a reliable comparison can be shown. Render `issues` with row number, Captain ID when available and message. Missing-account/difference collections are empty in that state; summary values are diagnostic, not a completed comparison. Do not show a misleading "all matched" message.

```typescript
const report = await api.compareAccounts(file);
if (!report.comparisonCompleted) {
  showRowIssues(report.issues);
} else {
  showComparison(report.summary, report);
}
```

Disable the submit button while loading, show an empty state for each empty category, and retain the report until the next upload or explicit clear. Do not store national IDs in browser analytics or persistent cache. Existing ProblemDetails handling covers 400 for transport/limits, 403 for missing scope/permission and upload middleware errors such as 413/415.

No comparison batch, workbook or result is saved server-side. Re-uploading recalculates against current records. No password cooldown is involved because this operation never changes credentials. Existing manual account-edit screens remain separate.

## Verification

Focused checks cover the actual workbook/footer format, registered owner versus assigned rider, name/city/identity differences, presence in both directions, owner-based account-number hints, archived/deleted/other-platform exclusion, malformed rows/formulas/duplicate IDs, permission denial, missing references, identifier normalization and SQL query translation. A comparison followed by a save is checked to leave lifecycle, credential, notification and daily-report records unchanged.

Ninja workflow suite after this addition: **15 passed, 1 skipped**, including all eight new comparison checks and the supplied sample workbook. The existing local SQL lifecycle integration test remains skipped because a working local SQL Server is unavailable; the new comparison query was verified to translate with the SQL Server provider without a database connection.

The API built successfully, and all four Ninja authorization checks passed, including granted/denied access on `/api/ninja/accounts/compare` with the Ninja platform scope. This task implemented and verified the backend and handoff; it did not publish the API or execute the comparison against hosted account data.
