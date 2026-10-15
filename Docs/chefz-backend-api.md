# Chefz account details, wallet settlements, and daily performance

**15 October 2026:** [Account status control](chefz-account-status-control.md) adds `PUT /api/chefz/accounts/{accountId}/status`, account status/reason/concurrency fields, and the separation between lifecycle `status` and workbook `dashboardStatus`.

The [account list response counts](chefz-account-counts.md) add `totalCount`, overall `summary`, and per-sponsor `sponsors` counts to `GET /api/chefz/accounts`.

[Two Chefz accounts per rider](chefz-two-accounts-per-rider.md) allows a second active Chefz account through the existing assignment services without relaxing other platform rules.

Daily performance upload/read and rider reports now include named rider/account breakdowns. Money import responses retain their separate per-account earnings/fees under each rider; FullTime fees are confirmed as 25 SAR per account/day. See the linked two-account contract and [TypeScript response types](chefz-new-endpoints-contracts.ts).

**12 October 2026:** [Bulk order settlements](chefz-order-settlements.md) add Excel preview/import and saved-batch endpoints. Order dates derive the cycles automatically; tips, compensation, bonuses, deductions, and actual rider assignments determine each payout. The new application migration is applied and independently verified on hosted `db67927`; deploy the updated API to expose these routes. See [the deployment record](chefz-order-settlement-hosted-deployment-20261012.md).

**11 October 2026:** [Workbook updates](chefz-workbook-updates.md) add editable performance settings, multi-half rider reports, sponsor statistics CRUD, management reports and owner reminders. The authorized account reset has been applied to the hosted database; both disputed IDs are retained as separate people. Deploy the updated API binaries to expose the new routes.

This repository supplies the backend API. The Chefz module extends the existing platform accounts and assignment history; it does not create duplicate rider records. Base route: `/api/chefz`.

## Account setup

Use the existing hosted platform `SHIFTZ` (شفز), or a platform with code `CHEFZ`, `THECHEFZ`, or `CHEFSZ`. Create its accounts through `/api/platform-accounts`, and assign actual riders using the existing assign/release endpoints. Do not create a second platform to replace hosted `SHIFTZ`.

For each account, `PUT /api/chefz/accounts/{accountId}`:

```json
{
  "accountType": "Freelancer",
  "reportIdNumber": null,
  "rowVersion": null
}
```

Types are `Freelancer` and `FullTime`, independent of the general platform salary/pay-per-order setting. The report ID defaults to the registered owner's iqama number, then the external account ID if no owner identity is available. Supply `reportIdNumber` when Chefz uses a different ID. IDs are strings; Arabic digits are normalized. One report ID identifies one Chefz account. On subsequent edits send the `rowVersion` returned by GET.

`GET /accounts/{accountId}` and paginated `GET /accounts?page=1&pageSize=50` return configured details, fixed commission/daily fee, `hasPassword`, and row version. The existing platform-account list supplies accounts that still need configuration.

`PUT /accounts/{accountId}/password` accepts `{"password":"<account password>","reason":"initial setup"}`. Passwords use the existing AES-GCM encrypted credential version history and preserve the exact password. `GET /accounts/{accountId}/password` returns the latest password only to users with credential-read access and disables HTTP caching. Regular account responses contain no password or ciphertext. Existing credential-rotation and history endpoints remain compatible.

## تصفية: two periods each month

`POST /settlements/preview` calculates without saving. `POST /settlements` saves an immutable settlement. Both accept:

```json
{
  "assignmentId": "<existing account assignment GUID>",
  "year": 2026,
  "month": 10,
  "half": 1,
  "startWalletAmount": 0,
  "endWalletAmount": 500
}
```

- Half 1: days 1–15, inclusive.
- Half 2: day 16 through the actual month end, including February/leap years.
- Gross earnings = end wallet − start wallet.
- Freelancer: company amount = gross × 15%, rounded to two decimals; rider amount = gross − company amount.
- Full-time: company amount = 25 SAR × inclusive assigned days intersecting this period; rider amount = gross − company amount. Days begin on the account handover date and stop on its return date.

| Type | Start | End | Days | Gross | Company | Rider |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Freelancer, first half | 0 | 500 | 15 | 500 | 75 | 425 |
| Freelancer, second half | 500 | 1000 | 16 | 500 | 75 | 425 |
| Freelancer, after boundary reset | 0 | 500 | 16 | 500 | 75 | 425 |
| FullTime, days 1–15 | 0 | 500 | 15 | 500 | 375 | 125 |

Enter each half's actual start and end balance independently; the previous ending wallet is never automatically used as the next starting wallet. After a boundary reset, enter zero for the new starting wallet. Ending balances below starting balances are rejected: a reset within a period cannot be inferred from only two balances. Amounts require at most two decimal places.

Saved settlements snapshot the account type, actual rider, assignment, period, charged days, wallet amounts, and result. Use a separate assignment's wallet readings if the account changes riders within a half. Negative full-time rider amounts remain negative (amount owed), rather than being silently clamped to zero. Saving is allowed once the charged date range has finished in Riyadh time; preview supports future periods. The operation records a settlement calculation and does not claim a cash payout was made.

One saved settlement exists per assignment and half-month. Repeating the same wallet readings returns the saved record; different readings return HTTP 409. History is append-only. `GET /settlements?accountId=...&riderId=...&page=1&pageSize=50` retrieves history; filters are optional.

## Daily orders/performance upload

`POST /performance/import` uses multipart form fields `file` (xlsx, max 10 MiB) and `reportDate` (`YYYY-MM-DD`). The supplied driver report has no report date, so it must be chosen explicitly. Dates are business calendar dates in Riyadh; future dates are rejected. The supplied Excel file is treated as data.

Exactly one worksheet must contain these headers in row 1 (extra columns are allowed):

| Matching field | Saved performance fields |
| --- | --- |
| Id Number | Total Valid Offers, Accepted Offers, Declined Offers, Missed Offers, Acceptance Rate |

The importer resolves Id Number to account details, finds the actual account assignment active on the report date, and records all five values on that rider. A registered owner is never substituted for the actual rider. Historical ended assignments are valid when the report date lies within their inclusive range. Multiple assignments on a handover day are reported as ambiguous and require corrected dates.

Counts must be nonnegative integers. Acceptance rate is stored in percentage points (`66.67` = `66.67%`), accepting percent text and Excel numeric cells formatted as percentages. The file's supplied rate is preserved to two decimals. Limits: 10,000 data rows, 200 columns, and 40 MiB uncompressed workbook contents.

Validation is all-or-nothing. Missing/duplicate IDs, invalid metrics, unmatched accounts, or missing/ambiguous assignments produce row-level `issues`, `importId: null`, and zero imported rows. No records are saved or updated from that file. For each account/date in a valid upload, new rows are inserted and changed rows update the existing record in place, including its metrics, report identity, source row, import receipt, and assignment/rider resolved for that date. `importedRows` counts inserts plus updates; identical daily rows count as `skippedRows`. Accounts absent from the upload and other dates remain unchanged. SQL unique indexes enforce one daily record per account/date and one import receipt per file hash/date. Previously uploaded file/date pairs reuse their receipt but revalidate against current daily data, so uploading an older file after a correction reapplies its values. Receipt counts describe the original import; response counts describe this upload. Corrections preserve record IDs and creation metadata and produce update audit entries. No schema migration is required.

`GET /performance?from=2026-10-01&to=2026-10-31&accountId=...&riderId=...&page=1&pageSize=50` retrieves saved daily values. Dates are required; account/rider filters are optional. Page size is bounded to 100.

## Permissions and schema deployment

New permissions: `chefz.read`, `chefz.accounts.update`, `chefz.performance.import`, `chefz.settlements.create`. Password actions use `platform_credentials.read` and `platform_credentials.rotate`. The controller and service check access; the service checks the Chefz platform client scope. The system-admin role receives the new permissions; other users need explicit grants and appropriate client scopes. Records retain normal audit and dataset-version behavior.

Apply the application migration `AddChefzAccountsSettlementsAndPerformance` first, then the identity migration `GrantChefzPermissions`, using the deployment connection string:

```powershell
dotnet ef database update --context ApplicationDbContext --project src/LogisticsERP.Infrastructure
dotnet ef database update --context IdentityDbContext --project src/LogisticsERP.Infrastructure
```

The migration adds the `chefz` schema and four tables without changing existing rider/account data. No sample financial data or performance is imported automatically.

Incremental idempotent deployment scripts are in `database/scripts/chefz-application.sql` and `database/scripts/chefz-identity.sql`. Apply application first. They target a database already at the preceding repository migrations.

Focused verification:

```powershell
$env:CHEFZ_SAMPLE_PATH = '<absolute path to the supplied workbook>'
$env:CHEFZ_SQL_TESTS = '1' # optional disposable SQL Server LocalDB coverage
dotnet test tests/LogisticsERP.Fleet.UnitTests --filter FullyQualifiedName~ChefzWorkflowTests
```

Verification on 2026-10-10: initial solution build and 11 Chefz checks passed, including the supplied workbook. Both EF contexts reported no pending model changes. The broader related test run passed 560 cases; two existing controller-authorization expectations failed for pre-existing anonymous import actions and a role-restricted maintenance action. Neither failure concerns Chefz endpoints. Hosted database `db67927` now has both Chefz migrations applied; the four tables, uniqueness indexes, four permission definitions, and system-admin role grants were verified directly in SQL. The preceding `AllowLowerVehicleReturnOdometer` migration was also pending and was applied in migration order. Disposable LocalDB workflow testing remains unavailable because that local instance fails to start. See [the full frontend handoff](chefz-frontend-handoff.md) for integration details and deployment boundaries.

