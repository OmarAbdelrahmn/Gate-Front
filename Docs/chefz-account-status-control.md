# Chefz account status control

The account status dropdown uses `status`: Available (متاح), Assigned (معيّن), Suspended (موقوف), Retired (مستبعد), Archived (مؤرشف).

[Account response counts](chefz-account-counts.md) documents the full-dataset and per-sponsor status/taken totals now returned with the account list.

Available and Assigned follow the rider assignment automatically. Taking an available account sets Assigned; returning it sets Available. An admin can select Suspended, Retired or Archived, switch freely among those three, and restore automatic status with Active. An existing open rider assignment stays linked when an admin changes status; changing status does not close it or change settlement dates. Release the rider explicitly when their use ends.

## Update an account status

`PUT /api/chefz/accounts/{accountId}/status`

Requires `chefz.accounts.update` with Chefz client-platform scope, including the supported CHEFZ, THECHEFZ, CHEFSZ and SHIFTZ codes. It does not require the broader generic platform-account update permission.

```json
{
  "status": "Suspended",
  "rowVersion": "<latest accountRowVersion>",
  "reason": "Optional admin note, up to 500 characters"
}
```

Accepted `status` values are `Suspended`, `Retired`, `Archived`, and `Active` (case sensitive). Available and Assigned cannot be set manually through this endpoint. Active calculates Assigned when there is an open rider assignment (`effectiveTo == null`), otherwise Available, and clears the status reason. It does not create a rider assignment. The existing assignment APIs still apply their rider/account eligibility rules and reject taking accounts in any of the three manual statuses.

Success is HTTP 200 with the updated `ChefzAccountResponse`. Both Chefz account GET endpoints and account details PUT now include:

```ts
status: 'Available' | 'Assigned' | 'Suspended' | 'Retired' | 'Archived';
statusReason: string | null;
accountRowVersion: string; // Base account token, used by the status endpoint.
rowVersion: string;        // Existing Chefz details token, used by details PUT.
```

Invalid status or a reason longer than 500 characters returns 400; insufficient permission returns 403; a missing or non-Chefz account returns 404; missing, malformed or stale row versions and database conflicts return 409. Reload the account after 409. Status changes use the existing account audit trail, including the actor and UTC time.

## Screen wiring

- Keep all five statuses in the filter shown in the reference image. The existing `GET /api/platform-accounts?platformId=...&status=...` supports those filter values. Chefz account list responses also contain `status` directly.
- Use a separate row/detail action labelled تغيير الحالة with Suspended, Retired, Archived and استعادة الحالة التلقائية (Active). Show Available and Assigned as automatic states, not manual choices. Show the action only with `chefz.accounts.update`.
- Send the latest `accountRowVersion` as `rowVersion` in the status request, then replace the row with the returned response and refresh the base account/assignment query. Do not reuse the Chefz details `rowVersion` for status updates.
- When an open rider assignment exists, explain that changing status retains the rider link. The release action remains separate.
- An Archived status set through this endpoint or the simple Chefz account PUT is reversible and does not soft delete the account; it stays visible and can be filtered or restored. Previously soft-deleted records are outside this endpoint's scope.
- Returning a rider preserves Suspended, Retired or Archived and its reason. Restore Active explicitly before assigning a new rider.

`dashboardStatus` remains workbook metadata (`active`, `Block By CHEFZ`, `The supervisor suspended`). Account details PUT now edits that metadata without changing the lifecycle `status`. Existing frontend code that used `dashboardStatus` to change account lifecycle must call the new status endpoint. Filtering and status badges must use `status`.

The existing generic simple account PUT also accepts the three manual statuses for Chefz accounts with an open rider link, retains that link, and keeps Archived accounts accessible. Its existing generic permission, full account payload and account concurrency token requirements still apply. Prefer the dedicated Chefz status endpoint for the status action.

No database migration is needed. This is a backend-only change at the user's request; no frontend source was changed. Deploy the updated API through the normal deployment process.

## Verification — 15 October 2026

- The final compiled Chefz workflow checks passed 46 runnable cases, including the manual transition matrix, automatic status on both assignment/release paths, generic account editing with a rider, metadata isolation, permissions, invalid inputs, stale-token validation, and the [account summary counts](chefz-account-counts.md). Ten Chefz controller/authorization checks also passed.
- An earlier broader run passed 924 tests, skipped 17 optional checks, and failed the existing `AccidentNotificationTests.NotificationTieBreakerAndAccidentSchemaTranslateForSqlServerWithoutConnecting` assertion on `HasPendingModelChanges`. This change adds no entity properties or migrations.
- Four optional SQL-backed Chefz checks were attempted and could not initialize their disposable databases because SQL Server LocalDB fails to start. Database rowversion/concurrent-write behavior remains unverified locally.
- The final solution build succeeded with zero warnings and zero errors. Intermediate builds were blocked by concurrent Jahez workflow edits; the final build includes the completed Chefz status/counts changes.
- Commands used isolated output directories under `.codex-tmp`, with `-p:NuGetAudit=false` because the existing `System.Security.Cryptography.Pkcs` 9.0.11 dependency produces NU1902/NU1903 restore errors under the repository's warnings-as-errors policy. No dependency or audit policy files were changed.
