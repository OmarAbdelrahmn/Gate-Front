# Shared-day backend verification — 21 October 2026

Implementation details, API examples, and rollout requirements are in [shared-account-day-handovers.md](shared-account-day-handovers.md).

## Results

| Check | Result |
| --- | --- |
| Full solution build | Passed; zero warnings and errors |
| New Fleet allocation/lifecycle/source/migration checks | 20 passed; one SQL Server runtime test skipped |
| New Jahez automatic allocation and withdrawal-draft checks | 2 passed |
| Full Fleet suite | 1,115 passed, 1 failed, 24 skipped |
| Full Jahez suite | 210 passed, 18 skipped |
| Full domain/API surface suite | 282 passed, 3 failed |
| EF model versus application migration | No pending model changes |
| SQL Server migration generation/model tests | Passed without connecting to a database |
| Live migration, deployment, or financial corrections | Not performed |

The new checks cover `2 + 4`, `2 + 3 + 4`, repeated riders, blank versus zero, invalid remainders/final declarations, optional returns, Ninja metric independence, Chefz financial row amounts and source conservation, weighted offer shares, FullTime restrictions, ambiguous legacy history, genuine overlaps, Riyadh midnight, supplementary permissions/concurrency tokens, and a newly configured platform using shared logic.

The SQL Server test uses a disposable database when `NINJA_SQL_TEST_SERVER` is configured. It exercises real application locks, concurrent identical imports, source/usage uniqueness, amount constraints, and generated rowversions. LocalDB instance `LogisticsERPVerify` failed to start, so this environment could not establish runtime SQL transaction/constraint behavior or execute the historical backfill. EF InMemory tests do not establish those guarantees.

## Unrelated failures retained

- `NinjaWorkflowTests.StatusValidationPermissionsConcurrencyAndDebtBlockPreventMutations`: expects transferred debt to block operations; the separate working-tree debt changes now disable that block.
- `FuelCardApiSurfaceTests.MonthlyUsageCarriesOneRiderAndEmployeeAndImportIsMultipart`: expects `Guid`, while the existing fuel-card response exposes `Guid?`.
- `ControllerAuthorizationAuditTests.OnlyExplicitPublicEntryPointsAreAnonymous`: the expected list omits existing anonymous fuel-card import actions.
- `ControllerAuthorizationAuditTests.ControllersDoNotRestrictAccessByRoleName`: the existing maintenance correction endpoint has a role restriction.

These failures concern other working-tree behavior and were not changed for the shared-day implementation.

## Database release artifacts

- [Application migration SQL](../database/scripts/platform-account-day-allocations.sql): idempotent upgrade from `20261019114428_UseGranularJahezTreasuryPermissions` to `20261021071103_AddPlatformAccountDayAllocations`. Review and test against a disposable/restored database before deploying. The backfill executes dynamically so newly added source columns are bound after schema changes in an idempotent batch.
- [Read-only reconciliation report](../database/scripts/platform-account-day-allocation-verification.sql): checks source-versus-allocation totals and identities, unresolved sequences, FullTime overlaps, and retained Chefz money-row totals. It performs no corrections and has not been run against live data.

The migration copies existing daily observations into source records without changing allocation IDs or rider attribution. Historical Chefz settlements remain intact; historical order rows are not invented. Downgrade guards refuse to discard new allocation/usage/financial evidence. Existing API instances must be stopped/upgraded together with this schema change; older import code cannot safely write the new allocation schema.
