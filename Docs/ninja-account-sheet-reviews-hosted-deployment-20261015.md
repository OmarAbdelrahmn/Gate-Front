# Ninja sheet checkups: hosted database deployment

Applied and independently verified on **15 October 2026 at 16:53:16 Riyadh time** (13:53:16 UTC).

| Item | Result |
| --- | --- |
| Hosted server | `db67927.public.databaseasp.net` |
| Database | `db67927` |
| Migration | `20261015134151_AddNinjaAccountSheetReviews` |
| EF product version | `10.0.11` |
| Migration record | Present after commit, checked through a reopened connection |
| New tables | `ninja.NinjaAccountUpdateUploads`, `ninja.NinjaAccountUpdateRows` |
| New columns | 35 across the two tables |
| Non-primary indexes | Five enabled, including two unique upload/row indexes |
| Foreign keys | Three trusted, enabled, restrictive keys |
| Check constraints | One trusted/enabled match-status constraint |
| Upload rowversion | SQL Server `rowversion`, verified |
| Saved uploads / rows after deployment | 0 / 0 |

The migration was executed inside an explicit transaction with a migration application lock. The required base Ninja migration and prepared baseline `20261015080537_ResetJahezToAccountsOnlyV2` were already present. No unrelated migration was applied.

## Existing data preservation

Before applying the schema, temporary database snapshots captured all Ninja account values, assignments and encrypted credential-version records. Comparisons in both directions verified equality before commit. No raw identities or credential ciphertext were exported in the evidence files.

- All **301 Ninja accounts**, including their rowversions, remained unchanged.
- All **107 Ninja assignment records** remained unchanged.
- Credential versions remained unchanged (zero existing Ninja versions).
- Row counts for the four existing Ninja detail/import/performance/deduction tables remained unchanged.
- No workbook was imported and no checkup/note was created by the migration.

The committed schema, constraints, indexes and migration record were checked again after closing and reopening the connection. This confirms database readiness; it does not establish that the updated API binary is published. API publication and application-level hosted request testing remain separate.

## Reproducibility and evidence

Migration SQL SHA-256:

```text
F58C0096568B61F427A26CD8F23224BC744D7588CEF376EF1C561E8856480A4E
```

- [Applied SQL](../database/scripts/ninja-account-sheet-reviews.sql)
- [Read-only verification SQL](../database/scripts/verify-ninja-account-sheet-reviews.sql)
- [Deployment tool with preflight and preservation checks](../tools/Apply-NinjaAccountSheetReviews.ps1)
- [Machine-readable deployment result](../outputs/ninja-account-sheet-reviews-migration-20261015T135315Z/verification.json)
- [Post-commit verification](../outputs/ninja-account-sheet-reviews-migration-20261015T135315Z/post-commit-verification.xml)
- [Column/index/foreign-key inventory](../outputs/ninja-account-sheet-reviews-migration-20261015T135315Z/schema-verification.xml)

The deployment tool defaults to a read-only preflight. Its `-Apply` mode applies the reviewed additive migration and checks existing data inside the same transaction. Reapplying the idempotent SQL does not create duplicate tables or migration history entries.

For an API rollback, retain the two new tables and history. Dropping them would discard saved sheet checkups and notes once users begin uploading.

See the [new services handoff](ninja-sheet-checkup-services-frontend-handoff.md) and [complete feature guide](ninja-account-sheet-updates.md).
