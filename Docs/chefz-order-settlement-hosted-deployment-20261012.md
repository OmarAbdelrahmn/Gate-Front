# Chefz order-settlement hosted database deployment

Applied and independently verified on **12 October 2026, 12:55 Riyadh time** (`2026-10-12T09:55:52.8054401Z`).

| Item | Verified result |
| --- | --- |
| Hosted target | `db67927.public.databaseasp.net` / `db67927` |
| Application migration | `20261012093719_AddChefzOrderSettlementImports` recorded with EF version `10.0.11`. |
| New table | `chefz.OrderSettlementImports` exists. |
| Added settlement columns | All 11 exist on `chefz.WalletSettlements`: Source, ImportId, DriverId, RiderName, SourceRows, DeliveryFees, VatAmount, Tips, Compensation, Bonuses, Deductions. |
| Check constraints | `CK_ChefzSettlement_Amounts` and `CK_ChefzOrderImport_Rows` enabled and trusted. |
| Indexes | Unique assignment/cycle index preserved; import-reference index and unique content-hash index verified. |
| Foreign key | Settlement-to-import foreign key enabled and trusted. |
| Existing settlement values | Compared in both directions against a transaction-local snapshot; unchanged. |
| Financial records | Zero settlements before/after; zero order-import rows inserted. |
| Sample workbook | Not imported. |
| API publication | Not performed; updated API deployment is still required. |

The required previous migration `20261011191524_AddChefzWorkbookReportsAndStatistics` was present. Preflight found no partially applied order-settlement schema. Only the targeted order-settlement migration was run, without an account reset, assignment changes, unrelated pending migrations, or an Identity update.

`tools/Apply-ChefzOrderSettlementMigration.ps1 -Apply` applied the prepared idempotent SQL inside one transaction with `XACT_ABORT`, a lock timeout, a backup of existing settlement/migration records, and pre-commit validation. A second connection independently verified the committed migration, table, columns, trusted constraints, and record counts.

Deployment evidence is saved in `outputs/chefz-order-settlement-migration-20261012T095552Z/`:

- `before.xml`: existing records and migration history before application.
- `applied-script.sql`: exact SQL used.
- `verification.json` and `verification.xml`: transaction verification and script hash.
- `post-commit-verification.xml`: independent committed-state verification.

SQL SHA-256: `2657DB93C7CB3854EADE88AA34EFCA77D512DA14D54C66D8D40C524CDC05148F`.

Hosted schema verification passed. This does not establish that the running hosted API exposes the new HTTP endpoints or that the frontend is implemented. Deploy the updated API and integrate the screen using [the frontend handoff](chefz-order-settlements-frontend-handoff.md).
