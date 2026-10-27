# CSV/XLSX performance imports

## Routes

| Route | Behavior |
|---|---|
| `GET /api/ninja/performance/imports/template?mode=Daily` | XLSX template without a date column; explicit report date required |
| `GET /api/ninja/performance/imports/template?mode=MultiDay` | XLSX template with `Date` |
| `POST /api/ninja/performance/imports/preview` | Multipart file and options; preview only, no performance written |
| `POST /api/ninja/performance/imports/{id}/confirm` | Resend the exact file; validates and commits all dates atomically |

All require `ninja.performance.import`. Preview is bound to the authenticated user, expires after 30 minutes, and records the source fingerprint and assignment/responsibility/context versions. A replay of a successful confirmation returns its original receipt without duplicating performance.

## Headers and options

Required headers: `Captain ID`, `Total Orders`, `Total Working Hours`; MultiDay also requires `Date`. Other columns are retained in the original artifact but are not used as eligibility metrics in v1.

Multipart option fields:

| Field | Values/default |
|---|---|
| `mode` | `Daily` (default), `MultiDay` |
| `reportDate` | Required for Daily; absent for MultiDay |
| `hoursUnit` | `DecimalHours` (default), `Duration`, `ExcelDays` |
| `dateFormat` | `yyyy-MM-dd` (default), `dd/MM/yyyy`, `MM/dd/yyyy` for text dates |
| `encoding` | `utf-8` (default), `windows-1256` for CSV |
| `delimiter` | comma (default), semicolon, or a tab for CSV |

Typed Excel dates are interpreted as dates. Typed Excel durations are converted using their actual cell type. `Duration` converts `08:30:00` to 8.5. Reject daily durations exceeding 24 hours, including `24:00:01`. Do not interpret 8:30 as decimal 8.30 or infer report dates from filenames/download times.

The supplied October workbook has typed dates plus US-format text dates for 23–24 October: use `mode=MultiDay`, `hoursUnit=Duration`, `dateFormat=MM/dd/yyyy`. Import `Total Working Hours`; do not substitute the separate `Avg Working Hours` column.

Limits: 10 MiB file, 10,000 data rows, 200 columns, 2,000 ZIP entries and 40 MiB expanded XLSX. Captain IDs remain strings, required formulas are rejected, and orders must be nonnegative integers. Repeated Captain IDs on different dates are valid; repeated account/day rows in one file are rejected.

## Preview

Response: `previewId`, `expiresAtUtc`, `contentHash`, `inputRevision`, `canConfirm`, and `rows[]`. Rows have the original row number, Captain ID, date, matched account, normalized orders/hours, status and issues.

Statuses: `New`, `Identical`, `Conflict`, `UnknownAccount`, `UnresolvedAllocation`, `Invalid`. A response can be HTTP 200 with `canConfirm=false`; always inspect it.

## Historical attribution

Match Captain ID to the permitted Ninja account, then find assignments covering that **business date**. Never use today's assignee for an older date or fall back to the account owner.

The existing allocator requires earlier holders' declared orders and hours, and assigns the remainder to the last holder. Explicit zero differs from missing. Sequence establishes order, not responsibility weights. Overlaps beyond a boundary day remain forbidden.

If a date has no assignment, or shared-day declarations are absent, confirmation fails. The system does not invent history, split equally, or guess from names/hours.

## Confirmation and consistency

- Recheck permission, file fingerprint, ownership of preview, expiry and current assignment/usage/responsibility/context versions.
- Changed input versions produce 409 `ninja.preview_stale`; expired preview produces 409 `ninja.preview_expired`.
- Identical saved values are skipped; conflicting values remain untouched.
- Stage all dates, sources, shares, original artifact, provenance and receipt under one save transaction and ordered account locks.
- Any invalid row prevents the entire batch. A separately authorized subset requires a selection manifest and a distinct validated batch; it is not silent partial acceptance.

Confirmation returns `artifactId`, `importedRows`, `skippedRows`, and date-specific `days[]` receipts. Originals are retained once; duplicate originals refer to the existing artifact. Source totals and rider shares remain separate.

## Legacy compatibility

`POST /api/ninja/performance/import` still accepts a single-date XLSX with `reportDate` and returns the existing `NinjaImportResponse`. It now shares allocation/commit logic and records provenance. The legacy deductions route is unchanged. Apply the new database migration **before deploying the new binary**, even while new evaluation endpoints are disabled.
