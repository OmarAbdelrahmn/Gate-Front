# Ninja accounts and daily reports

Current source reference (15 October 2026): [all 19 Ninja endpoints](ninja-full-api-reference.md) and [system, permissions, identity, status and reporting details](ninja-system-details.md). Account reads embed separate owner/actual-rider names, phones and iqamas. Account detail/status and aggregate reports need API publication but no migration. The subsequent [saved sheet checkups, status observations and upload notes](ninja-account-sheet-updates.md) add five endpoints and require the separate `AddNinjaAccountSheetReviews` migration; main accounts are not modified by checkups.

This module uses existing platform accounts with platform code `NINJA`. Create the platform and its accounts through `/api/platforms` and `/api/platform-accounts`. Set each account's `externalAccountId` to the exact Captain ID from Ninja's reports. Keep identifiers as strings, including any leading zeroes.

The API stores locally recorded credentials. There is no Ninja provider integration to change a password or phone on Ninja's servers; an operator must perform the permitted change there and record it here. Password values are encrypted with the existing platform credential protector and never included in responses, notifications or audit snapshots.

## Account operations

`POST /api/ninja/accounts/compare` accepts a multipart owner-account workbook with `المعرف`, `الاسم`, `المدينة`, `رقم الهوية`. It returns accounts missing from either side, matching accounts and owner/name/city differences. This is read-only and uses registered owner identity, never the currently assigned rider. See [comparison endpoint and frontend handoff](ninja-account-comparison-frontend-handoff.md). No schema migration is required for this addition.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/ninja/accounts?page=1&pageSize=50` | List Ninja accounts, current assigned rider, phone and password change deadline |
| GET | `/api/ninja/accounts/{accountId}` | Enriched account detail, owner and actual-rider identity |
| PUT | `/api/ninja/accounts/{accountId}/status` | Active, Suspended, Retired or Archived using account rowversion |
| POST | `/api/ninja/accounts/{accountId}/assign` | Assign to a rider and record the phone and optional new password atomically |
| POST | `/api/ninja/accounts/{accountId}/return` | Return an account and record its replacement phone and password atomically |
| PUT | `/api/ninja/accounts/{accountId}/credentials` | Update the phone and/or password after assignment or return |

The existing generic assignment, release and password rotation routes reject Ninja accounts with `ninja.use_workflow`. Use Ninja routes for these operations. Existing generic account creation/update and assignment/credential history reads remain available. Account listing includes `currentAssignmentId` and `assignmentRowVersion` (both null when unassigned). Use the assignment token for return, and the distinct account `rowVersion` for later credential updates.

Assignment body:

```json
{
  "actualRiderProfileId": "00000000-0000-0000-0000-000000000001",
  "effectiveFrom": "2026-10-12",
  "phoneNumber": "0501234567",
  "newPassword": "optional-new-password",
  "reason": "Assigned to new rider",
  "wasBackdated": false,
  "backdatedReason": null
}
```

Return body:

```json
{
  "effectiveTo": "2026-10-12",
  "phoneNumber": "0507654321",
  "newPassword": "replacement-password",
  "reason": "Rider returned account",
  "rowVersion": "assignment-rowversion-from-assignment-response",
  "status": "Ended"
}
```

Assignment and return respond with `{ assignment, credentials }`. `assignment` follows the existing simplified platform assignment contract. `credentials` contains:

```typescript
type NinjaCredentials = {
  accountId: string;
  phoneNumber: string | null;
  hasPassword: boolean;
  passwordChanged: boolean;
  passwordChangeAllowedAtUtc: string | null;
  notification: {
    code: "ninja.password_cooldown";
    messageAr: string;
    messageEn: string;
    changeAllowedAtUtc: string;
  } | null;
  rowVersion: string; // account rowversion, distinct from assignment rowversion
};
```

Password rules:

- Only passwords have a cooldown. Phone updates apply immediately on every assignment/return.
- A changed password starts a 72-hour cooldown using the actual UTC recording time. Backdating an assignment never backdates the cooldown.
- Assignment accepts `newPassword: null` to retain the password. Recording the same password does not create another credential version or restart the clock.
- During the cooldown, assignment/return succeeds, the requested password is not saved, and the current password remains. The response includes the notification above; a warning is also saved in the requesting user's notification inbox with the expiry set to the deadline. Show the warning to the user and display the UTC deadline in Riyadh time.
- Once the cooldown has elapsed, returning an account requires a new password different from the current password. The exact 72-hour boundary permits changing it.
- A skipped password is not queued or changed automatically. At the deadline, an operator can submit the desired password through the credentials endpoint.
- For later updates, send `{ newPassword, phoneNumber, reason, rowVersion }`. Either credential input may be null to leave it unchanged. Use the **account** rowversion from the account list or previous credentials response. A locked password returns `passwordChanged: false` and a notification; a supplied phone still updates.

Assignments retain the existing shared assignment/salary-account rules and official ownership/registration history. The shared active-account cap is currently **one** per rider in this checkout; Chefz's two-account exception does not apply to Ninja. Assignment end dates are inclusive. Assignment/return/reassignment can proceed on the same date, including during the password cooldown. Reports from a day with multiple historical assignments for the same account are rejected because daily totals cannot be split reliably; no rider is selected arbitrarily.

## Daily uploads and reads

| Method | Route | Input |
| --- | --- | --- |
| POST | `/api/ninja/performance/import` | Multipart `reportDate` (`YYYY-MM-DD`) and `file` (`.xlsx`) |
| POST | `/api/ninja/deductions/import` | Multipart `reportDate` and `file` |
| GET | `/api/ninja/performance` | `from`, `to`, optional `accountId`, `riderId`, `page`, `pageSize` |
| GET | `/api/ninja/deductions` | Same date/filter/page inputs |
| GET | `/api/ninja/reports/performance` | Range totals/coverage; `from`, `to`, optional `accountId`, `riderId` |
| GET | `/api/ninja/reports/daily` | Daily aggregates, same filters plus pagination |
| GET | `/api/ninja/reports/riders` | Historical rider aggregates and person details, same filters plus pagination |

Both supplied workbooks have no report date column, so the uploader must select the date explicitly. Future dates and empty dates are rejected. The business day uses Riyadh time.

The performance parser reads only `Captain ID`, `Total Orders`, and `Total Working Hours`; additional columns are ignored. Orders must be nonnegative whole numbers, hours must be between 0 and 24, and hours are persisted to eight decimal places. Zero orders and zero working hours are valid observations.

The deductions parser reads `CAPTAIN ID`, `labels.TotalCollectedAmountAtDelivery`, and `TOTAL DEDUCTIONS`. Header matching ignores case and surrounding whitespace, including the trailing space in the supplied Captain ID header. The collected amount is preserved separately from deductions. Monetary values retain two decimals; deduction signs are preserved exactly, including negative amounts and positive adjustments. The collected amount cannot be negative. No payroll posting or settlement is created by this import.

Both imports match Captain ID to a Ninja account, find exactly one active/ended assignment covering the report date, and persist the account ID, assignment ID, **actual rider profile ID**, date, source row and import provenance. The registered owner is never used as a fallback. Historical records continue belonging to the original assigned rider after reassignment or account archival.

An import is all-or-nothing. Any invalid row, duplicate Captain ID, unknown account, missing/ambiguous assignment or conflicting existing daily value prevents every row in that file from being saved. The response is:

```typescript
type NinjaImportResponse = {
  importId: string | null;
  reportDate: string;
  importedRows: number;
  skippedRows: number;
  issues: { rowNumber: number; captainId: string | null; message: string }[];
};
```

Check `issues` even when HTTP status is 200. Show row numbers and messages so the user can fix the file/account history. Re-uploading identical account/day values skips those rows. Different values or assignment attribution return issues; existing daily records are never overwritten. File hashes prevent duplicate import batches; unique database indexes also protect account/day records during concurrent uploads. An import conflict returns HTTP 409 and can be retried after refreshing.

Read responses are `{ items, page, pageSize }`; page size defaults to 50 and is limited to 100. Performance records contain `id`, `accountId`, `assignmentId`, `riderProfileId`, `reportDate`, `captainId`, `totalOrders`, `totalWorkingHours`. Deduction records replace the performance metrics with `totalCollectedAmountAtDelivery` and `totalDeductions`.

Limits: 10 MiB uploaded, 40 MiB expanded XLSX contents, 2,000 ZIP entries, 10,000 data rows and 200 columns. Exactly one worksheet must contain all required headers in its first row. Duplicate required headers and formulas in imported fields are rejected. Cancellation propagates through upload, parsing and persistence.

## Authorization

The module reuses existing permissions and enforces client-platform scope in the service:

| Operation | Permissions |
| --- | --- |
| Account/performance/deduction reads | `platform_accounts.read` |
| Both daily imports | `platform_accounts.update` |
| Assignment | `platform_assignments.create` and `platform_accounts.update` |
| Return | `platform_assignments.delete` and `platform_accounts.update` |
| Phone update | `platform_accounts.update` |
| Any supplied new password | Additionally `platform_credentials.rotate` |

## Database and verification

The application migration `AddNinjaAccountsDailyPerformanceAndDeductions` adds only four Ninja tables: `ninja.NinjaAccountDetails`, `ninja.NinjaDailyImports`, `ninja.NinjaDailyPerformance`, and `ninja.NinjaDailyDeductions`. Account rowversion coordinates password/phone writes with assignment/return changes. Credentials, assignment history and cooldown notifications commit in a single save transaction. The generated deployment SQL is `database/scripts/ninja-application.sql`; it assumes the application database already has prior migrations through `20261012093719_AddChefzOrderSettlementImports`.

Focused tests cover cooldown/phone behavior, the exact deadline, unchanged-password handling, required return passwords, historical attribution, negative deductions, duplicates, conflicting values, missing/overlapping assignments, authorization and generic-route restrictions. Set `NINJA_PERFORMANCE_SAMPLE` and `NINJA_DEDUCTIONS_SAMPLE` to validate the supplied files without editing them. Set `NINJA_SQL_TEST_SERVER` to a working local SQL Server to run the isolated database rowversion/rollback test; it creates and deletes a uniquely named `NinjaTests_*` database.

The hosted database migration was applied and verified on 12 October 2026 at approximately 16:15 Riyadh time. All four tables, nine foreign keys, two check constraints and four non-primary unique indexes were verified using a fresh connection after commit. Existing lifecycle/credential data was preserved; no daily data was imported and the hosted target contained zero Ninja accounts. See [deployment evidence](ninja-hosted-deployment-20261012.md). The updated API binary still needs publishing; frontend implementation and provider integration are separate work. See [frontend handoff](ninja-frontend-handoff.md) and [TypeScript contracts/client](ninja-api-contracts.ts).

Verification on 12 October 2026:

- Solution build succeeded with no warnings/errors; EF reported no pending model changes.
- Ninja and shared platform regression checks: 35 passed, one SQL integration test skipped. Both supplied workbooks were parsed successfully using the production importer.
- Broad domain/API surface suite: 281 passed, three existing failures in `FuelCardApiSurfaceTests.MonthlyUsageCarriesOneRiderAndEmployeeAndImportIsMultipart` (nullable rider ID), `ControllerAuthorizationAuditTests.OnlyExplicitPublicEntryPointsAreAnonymous` (existing fuel-card import action), and `ControllerAuthorizationAuditTests.ControllersDoNotRestrictAccessByRoleName` (existing maintenance correction action). Their underlying source files were unchanged by this work.
- Scoped Ninja/Chefz authorization and the Jahez assignment restriction regression: 12 passed. Together with the Ninja/shared platform tests, 47 focused checks passed.
- SQL Server LocalDB instances failed to start on this machine; the isolated SQL workflow test remains skipped. Hosted schema application and SQL constraint verification subsequently succeeded, without running lifecycle mutation tests against production. The temporary failed Ninja LocalDB instance was removed.
- After adding assignment ID/rowversion to account listing for the frontend return form, the Ninja suite passed again: seven passed and one local SQL integration test skipped.
