# Deployment, verification and hosted performance import

## Migration and API activation

Apply these additive migrations in order:

1. Application: `20261026180608_AddNinjaEvaluationSuggestions`.
2. Identity: `20261026180713_GrantNinjaEvaluationPermissions`.

Reviewed idempotent SQL is in `database/scripts/ninja-evaluation-application.sql` and `database/scripts/ninja-evaluation-identity.sql`. It creates only the nine Ninja evaluation tables, the v1 policy, the two permission definitions and system-admin grants. Existing role-permission IDs are preserved.

The hosted deployment helper `tools/Apply-NinjaEvaluationSchema.ps1` restricts the target to `db67927`, checks both migration histories, refuses unrelated/destructive changes, rehearses both scripts with rollback, and verifies existing performance/deduction counts and fingerprints. Apply requires a matching rehearsal and creates a server COPY_ONLY checksum backup. On this host, RESTORE VERIFYONLY is denied; backup completion and exact affected-row verification are recorded separately rather than claiming a verified restore.

The schema was applied on **26 October 2026 at 21:25 Riyadh time**. Nine tables, two permission definitions and the policy were independently verified afterward. Existing performance and deduction records were preserved.

Deploy the new API binary after the schema update. Enable new routes with:

```text
Features__NinjaEvaluation=true
```

Default is false. Database migration alone does not publish endpoints. The legacy performance path also requires the new tables because it now saves artifacts/provenance. Roll back an API release by disabling the flag and restoring the prior binary; retain the additive schema, imported facts and history. Do not drop populated history tables as a rollback shortcut.

## October workbook

The source has 3,072 rows and 202 Captain IDs for 1–24 October. Its fingerprint is `A896FD10B2348F506D0E0661934DC32D65ABA0EB9C34813A54131250B3AFCE70`.

The user explicitly authorized a **separate 3,032-row validated subset**, holding 40 unresolved rows. The selected subset has 42,042 orders and 34,855.86666662 working hours. Use `Total Working Hours` from the original workbook, not its separate average-hours metric.

The selection is matched by account ID and historical assignment dates. It does not change assignment periods or use owners as rider fallbacks. Thirty-seven held rows lack an assignment covering their dates; three shared-day rows lack declared earlier-holder orders/hours.

Evidence is under `outputs/ninja-performance-20261026/`:

- `row-mapping.json`: per-source-row account and assignment mapping.
- `source-review.json`, `selection-summary.json`: validation and selection controls.
- `unresolved-rows-review.md`: all 40 held rows and existing history context.
- `approved-performance.csv`: the distinct selected batch, with original row numbers and original-workbook fingerprint.
- `schema-rehearsal.json`, `schema-applied.json`, `server-backup.xml`: schema and backup evidence.
- `rehearsal.json`, `apply.json`, `verify.json`: import rehearsal, commit and independent readback, when each step has completed.

`tools/LogisticsERP.NinjaPerformance` is a maintenance utility for this exact authorized workbook/selection. It checks the source and selection fingerprints, verifies the existing non-development Omar audit actor, takes ordered account locks and uses the same import engine as the API. It preserves the complete original workbook and the distinct selected CSV in database artifacts. Every imported source/share retains the original workbook row and provenance evidence reference.

Rehearsal inserts and validates the selected rows inside a transaction, then rolls back and verifies preservation. Apply requires the exact same input revision and selection fingerprint. Verify performs an independent read and checks every selected row's values, historical assignment, rider and original row number. Existing 25–26 October sources and shares remain unchanged.

## Checks

Final checks: solution build passes with zero warnings/errors; 147 focused Ninja/allocation tests and 55 Ninja API/authorization/HTTP tests pass. Ten environment-dependent SQL/workbook cases are skipped. TypeScript contracts/client pass strict compilation. Both EF contexts report no pending model changes.

A broader existing authorization audit was also run: four checks pass and two fail in unchanged Import/Maintenance controllers (`OnlyExplicitPublicEntryPointsAreAnonymous`, `ControllersDoNotRestrictAccessByRoleName`). Their source matches HEAD and was not changed by this feature. These broader failures are recorded rather than hidden or repaired as part of Ninja.

```powershell
dotnet build LogisticsERP.slnx
dotnet test tests/LogisticsERP.Fleet.UnitTests/LogisticsERP.Fleet.UnitTests.csproj --filter "FullyQualifiedName~Ninja|FullyQualifiedName~PlatformAccountDayAllocationTests"
dotnet test tests/LogisticsERP.Jahez.Tests/LogisticsERP.Jahez.Tests.csproj --filter "FullyQualifiedName~Ninja"
dotnet ef migrations has-pending-model-changes --context ApplicationDbContext --project src/LogisticsERP.Infrastructure/LogisticsERP.Infrastructure.csproj
dotnet ef migrations has-pending-model-changes --context IdentityDbContext --project src/LogisticsERP.Infrastructure/LogisticsERP.Infrastructure.csproj
```

Tests cover contract boundaries, independent rider amounts, data gaps, zero observations, calendar-month attendance, handover weights, stale/expired previews, idempotence, immutable snapshots, filtered export and endpoint permissions. The obsolete transferred-debt blocking assertion was updated to the existing no-suspension runtime policy; evaluation does not alter that policy.

The local SQL Server LocalDB instance failed to start, and Docker Desktop is unavailable. Disposable-provider tests requiring `NINJA_SQL_TEST_SERVER` remain environment-dependent. The real hosted schema rehearsal and approved-import rehearsal additionally exercise SQL Server constraints, transactions and rollback. Never point a disposable test fixture at the hosted application database.

The first fresh restore exposed a vulnerable transitive PKCS package. Infrastructure now pins `System.Security.Cryptography.Pkcs` 10.0.13, the patched version listed by [Microsoft's advisory](https://github.com/dotnet/runtime/security/advisories/GHSA-846f-f764-76mx); dependency-audit warnings were not suppressed.

## Readiness boundaries

Frontend implementation and official invoice comparison remain outside this delivery. Missing history or shared-day declarations must be reviewed before the remaining rows can be imported. New permissions must be granted through existing ERP access management where needed; an existing direct-grant user does not automatically receive new rights merely because they can read Ninja.
