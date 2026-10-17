# Ninja hosted database deployment — 12 October 2026

The Ninja application database migration was committed on `db67927.public.databaseasp.net`, database `db67927`, at approximately **16:15 Riyadh time** (13:15 UTC). A fresh connection verified the committed migration and schema after the deployment transaction completed.

Migration: `20261012130259_AddNinjaAccountsDailyPerformanceAndDeductions`.
Prerequisite verified: `20261012093719_AddChefzOrderSettlementImports`.

| Verified item | Result |
| --- | --- |
| Ninja tables | 4 |
| Trusted foreign keys | 9 |
| Trusted check constraints | 2 |
| Unique indexes, excluding primary keys | 4 |
| Existing Ninja accounts, assignments and credentials | Preserved |
| Daily report rows imported | 0 |
| Existing Ninja accounts | 0 |

Created tables: `ninja.NinjaAccountDetails`, `ninja.NinjaDailyImports`, `ninja.NinjaDailyPerformance`, `ninja.NinjaDailyDeductions`. Verification also checked the account/detail rowversion columns and the performance/money decimal scales.

The deployer took a before-state snapshot, compared the existing Ninja lifecycle and encrypted credential rows before committing, and checked that report row counts were unchanged. Only the prepared Ninja schema migration was applied; there was no account creation or workbook import and no identity migration was required. The supplied workbooks need explicit report dates and matching accounts with assignment history before they can be imported.

## Evidence and repeatable tooling

- [Verification summary](../outputs/ninja-migration-20261012T131509Z/verification.json)
- [Fresh-connection verification](../outputs/ninja-migration-20261012T131509Z/post-commit-verification.xml)
- [Deployment verification](../outputs/ninja-migration-20261012T131509Z/verification.xml)
- [Exact applied SQL](../outputs/ninja-migration-20261012T131509Z/applied-script.sql)
- [Deployment tool](../tools/Apply-NinjaMigration.ps1)
- [Schema assertions](../database/scripts/verify-ninja-migration.sql)

Applied SQL SHA-256: `CF22EE88B21DBFA4B84593BCC4EFE01384E6E3840B1629C0C81C0754D36E2A10`.
Verification timestamp: `2026-10-12T13:15:09.9326630Z`.

Run `./tools/Apply-NinjaMigration.ps1` for a read-only preflight. `-Apply` enables the guarded, idempotent migration. It uses the configured database connection without printing credentials, verifies the expected target, and rejects an inconsistent partial schema. The failed first deployment attempt encountered a SQL identifier error before schema changes; its transaction was rolled back and the corrected attempt above succeeded.

## API publication status

This operation updated the hosted database. The updated API binary has **not been published by this task**. Publish the backend containing Ninja routes and the account-list assignment tokens before enabling the frontend module.

Read-only checks of `https://gat.premiumasp.net` returned HTTP 200 for `/health/live` and HTTP 500 for `/swagger/v1/swagger.json`; these checks do not confirm the deployed Ninja routes. Once the API is published, verify Swagger and authenticated Ninja account listing with an appropriately scoped user, then test the UI with deliberately created test accounts and explicit report dates.

Latest Ninja workflow tests: **7 passed, 1 skipped**. The skipped test needs a working local SQL Server and exercises workflow rowversion/transaction behavior in a disposable database. The hosted deployment verified actual schema constraints, but did not execute lifecycle writes or financial imports in production.

Frontend integration: [handoff](ninja-frontend-handoff.md), [TypeScript contracts and client](ninja-api-contracts.ts), [backend reference](ninja-backend-api.md).
