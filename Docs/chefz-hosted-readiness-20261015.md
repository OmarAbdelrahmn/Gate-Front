# Chefz hosted database readiness — 15 October 2026

Verified directly against `db67927.public.databaseasp.net` / `db67927` at approximately **11:00 Riyadh time, 15 October 2026** (`08:00 UTC`). Exact UTC time is recorded in the JSON evidence.

**Result: all 19 compatibility checks passed. No new Chefz schema migration or hosted data update is required for the account-status, counts, two-account assignment, or report-breakdown changes.** These changes live in API services and response contracts. The updated API must still be published; this database verification does not establish that the hosted HTTP API is running the new code.

The verification was read-only: no schema changes, assignments, account status updates, report imports, settlement changes, role grants or unrelated migrations were performed.

| Verified prerequisite | Hosted result |
| --- | --- |
| Core Chefz migration | `20261010112122_AddChefzAccountsSettlementsAndPerformance` present |
| Workbook/report migration | `20261011191524_AddChefzWorkbookReportsAndStatistics` present |
| Money-import migration | `20261012093719_AddChefzOrderSettlementImports` present |
| Chefz Identity migration | `20261010112140_GrantChefzPermissions` present |
| Account concurrency | Account `RowVersion` present |
| Rider capacity storage | Slot column and enabled, trusted constraint permitting slots 1 and 2 |
| Rider-only index | Non-unique; no unique rider-only index prevents two accounts |
| Active rider slots | Unique `(RiderProfileId, RiderAccountSlot)` with active/non-deleted filter |
| One rider per account | Unique active account index present |
| Salary rule | Unique active Salary-per-rider index present |
| Report ID matching | Unique Chefz report ID index present |
| Daily imports | Unique account/date index present |
| Money imports | Unique assignment/period and file-hash indexes present |
| Money arithmetic | Existing settlement check constraint enabled and trusted |
| Operational blocking dependency | Existing `jahez.JahezTransferredDebt` table present; no Jahez change was applied by this verification |
| Permissions | Four Chefz permission definitions and four `SYSTEM_ADMIN` grants present |
| Data health | No duplicate open account assignments, duplicate rider slots or invalid stored settlement arithmetic |

The hosted Chefz platform is the existing `SHIFTZ` record, GUID `01a02a0d-845d-7535-ac25-1e1f0c8e5808`. Do not create a replacement Chefz platform.

Observed counts at verification time, which may change through normal operations:

| Status | Accounts | With open rider assignment |
| --- | ---: | ---: |
| Available | 77 | 0 |
| Assigned | 216 | 216 |
| Suspended | 172 | 0 |
| Retired | 0 | 0 |
| Archived | 0 | 0 |
| Total | 465 | 216 |

There were 216 riders with one active Chefz account and no riders with two at that instant. No assignments were created to demonstrate the new rule; it becomes usable when the updated API is deployed.

Evidence: [verification JSON](../outputs/chefz-account-updates-hosted-20261015T080009Z/verification.json), [executed SQL](../outputs/chefz-account-updates-hosted-20261015T080009Z/verification.sql), [XML results](../outputs/chefz-account-updates-hosted-20261015T080009Z/verification.xml).

Re-run from the repository root with `./tools/Verify-ChefzHostedAccountUpdates.ps1`. The tool reads the existing configured connection without printing credentials and refuses a different hosted target. SQL is limited to session settings and SELECT queries. Do not run the old workbook reset/import scripts to enable these features.

Release order: publish the updated API through the normal hosting process, verify the new HTTP response shapes with an authorized session, then integrate the frontend using the [complete handoff](chefz-accounts-reports-frontend-handoff-20261015.md). No frontend source was changed in this task.
