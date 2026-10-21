# Shared-day account handovers

Implemented for Jahez, Ninja, Chefz Freelancer, and the generic platform lifecycle. This is a backend change; applying the migration and deploying the API are separate release steps. Existing local changes are retained.

## Operator behavior

When returning an account, optionally record the outgoing rider's **own contribution for that account on the return's effective Riyadh date**. The figures are not cumulative account counters. A blank/null means unknown; zero means confirmed zero. Returning without figures remains supported.

When two riders share a day with six orders, an outgoing count of two gives the final rider four. With three successive assignments, counts two and three against nine reported orders give the final assignment four. The final assignment may already be returned and may belong to a rider who used the account earlier that day.

Missing figures block only an import that needs those metrics. For example, missing Ninja money figures do not block the orders/hours import. Supply all preceding riders' relevant fields, including confirmed zeros, to resolve a shared day. A declared final-rider figure must match the calculated remainder. Counts and hours cannot have negative remainders. Ninja deductions retain their existing signed report semantics.

Chefz FullTime accounts remain exclusive for each inclusive calendar day. Same-day reassignment, conflicting start-date edits, and conversion of shared-day history to FullTime are rejected. The SAR 25 daily fee remains unchanged.

## Existing lifecycle contracts

The following request bodies gain an optional `dayUsage` object:

- Generic `POST /api/platform-accounts/{id}/release` (`ReleaseSimplePlatformAccountRequest`).
- Legacy assignment close (`ClosePlatformAssignmentRequest`).
- Ninja account return (`NinjaReturnRequest`).
- Jahez operation creation/update (`JahezOperationCreate`) when mode is Withdraw or SettleAndWithdraw.

For example, add this to the existing Ninja return body:

```json
{
  "effectiveTo": "2026-10-21",
  "phoneNumber": "0501234567",
  "newPassword": null,
  "reason": "Account returned for reassignment",
  "rowVersion": "CURRENT_ASSIGNMENT_ROWVERSION",
  "dayUsage": {
    "ordersCount": 2,
    "workingHours": 3,
    "collectedAmount": null,
    "deductionsAmount": null
  }
}
```

All figures are optional. Integer fields are `ordersCount`, `totalValidOffers`, `declinedOffers`, and `missedOffers`. `workingHours` supports eight decimal places in the range 0–24; collected/deduction amounts support two decimal places. Collected amounts and counts are nonnegative; deductions can be signed. Unsupported metrics do not participate in a platform's import.

Jahez stores draft input as `dayUsageJson` on the operation, preserves it through edits/approvals, and applies it only when withdrawal executes. A Settle-only operation cannot carry withdrawal usage. Generic/Ninja usage, assignment closure, and credential changes share the existing save boundary.

## Supplementary API

`GET /api/platform-accounts/{id}/day-usage?date=2026-10-21` returns the actual eligible assignments, rider IDs, resolved sequence or null, saved figures, missing field names, and usage rowversions. It does not create rows. The assignment's own rowversion and the usage rowversion are different tokens.

`PUT` on the same URL takes every eligible assignment exactly once, in handover order:

```json
{
  "assignments": [
    {
      "assignmentId": "FIRST_ASSIGNMENT_GUID",
      "figures": { "ordersCount": 2, "workingHours": 3 },
      "rowVersion": "FIRST_USAGE_ROWVERSION"
    },
    {
      "assignmentId": "FINAL_ASSIGNMENT_GUID",
      "figures": null,
      "rowVersion": "FINAL_USAGE_ROWVERSION"
    }
  ],
  "reason": "Complete missing handover figures"
}
```

`figures: null` leaves an existing figure object unchanged. A supplied figure object replaces all its fields; omitted individual fields become unknown. Send the complete current object when changing only some fields. A participant without a saved usage row has a null rowversion; GET again after every PUT. A reordered list must agree with assignment dates and cannot create overlapping multi-day periods.

The service checks the account's ClientPlatform permission scope. Reads require Ninja/Jahez read permission or generic assignment read. Updates require Ninja assignment-delete plus account-update, Jahez handover-update plus withdraw, or generic assignment-update. No new permission seeds are needed. Authentication is required.

Invalid inputs use existing Problem Details conventions. Usage conflicts return 409; details include account/date/assignment/metric where applicable. Import row issues retain the existing HTTP 200 response convention and prevent the whole import from saving. Reload/repreview after completing missing fields or a concurrency conflict.

## Import and report behavior

Ninja and Chefz performance retain account/day source totals separately from rider allocations. Imported row counts still count source spreadsheet observations, not the number of rider shares. Ninja report record counts use distinct sources; monetary and performance totals sum allocated shares.

Chefz performance uses `ordersCount` as Accepted Offers, and splits valid/declined/missed offers independently. Rider acceptance rates use allocated accepted/valid offers (zero when valid offers are zero); the original reported percentage remains on the source. Corrected uploads update the source and all its allocations atomically, preserving the existing correction and replay behavior.

For Chefz money, group rows by account/date and preserve ascending **original worksheet row number**. Every row consumes one count, including blank order IDs and adjustment rows. The first N rows belong to the first rider, the next N to the next rider, and all remaining rows to the final rider. All monetary components move together. Existing VAT extraction, commission, cash deduction, half-month cycles, and cent reconciliation then apply to each rider's totals. Money-row counts need not equal Accepted Offers in a different performance source.

New Chefz money imports retain every parsed row with its assignment and usage sequence. Identical-file replays return saved settlement snapshots. Changed files colliding with an existing settlement retain the existing conflict behavior.

Jahez daily previews expose `resolvedAllocations`, used by commit after revalidation. Existing manual splits remain supported but must reconcile to the daily total and cannot contradict saved handover figures. Timestamp-based transaction attribution is unchanged. Saved automatic dispatch rows link to available day-usage evidence. Committed previews use their saved dispatch shares.

## Corrections and concurrency

Usage metrics referenced by a saved import cannot be changed through the supplementary API. Unrelated, unimported metrics can still be completed. Saved allocation order is protected, and later assignments cannot be inserted into a boundary day that has already been allocated. Generic close operations cannot discard previously imported performance or settlement days. Preserve explicit existing replacement workflows; this change does not add automatic financial restatement.

SQL Server writers take exclusive, per-account application locks before relevant reads through commit; multi-account locks are acquired in GUID order. Nested Ninja/generic operations share the connection and retain the outer lock. Existing Jahez serializable transactions and idempotency receipts remain in place. Usage reorder operations release/reassign unique sequence slots within one database transaction. Usage changes retain audited before/after values and correction reasons.

## Database release and verification

Application migration: `20261021071103_AddPlatformAccountDayAllocations`.

It adds `app.PlatformAccountDayUsages`, Ninja performance/deduction sources, Chefz performance sources and imported order rows, source links on daily allocations, a nullable Jahez dispatch usage link, and Jahez operation draft usage JSON. It backfills each existing performance/deduction observation into a source with the same ID, retaining the original allocation ID, actual rider, dates, import references, and totals. Existing Chefz money settlements are unchanged; original order rows are not fabricated.

Boundary usage records are backfilled only for assignment start/end dates. Sequences are inferred only for a single holder, a date-established two-holder boundary, or nonoverlapping Jahez sessions with reliable timestamps. Other legacy shared-day orders remain unresolved. Never order legacy riders by GUID.

Apply the migration before deploying the matching API. Older API versions cannot safely import shared-day reports against the new schema. Downgrade refuses to discard populated usage figures, row evidence, split allocations, or withdrawal draft evidence; preserve the database and use a forward correction once this feature has data.

Run [the read-only verification script](../database/scripts/platform-account-day-allocation-verification.sql) after migration. Reconciliation and identity mismatch result sets should be empty; unresolved-order and FullTime-conflict result sets identify history needing review. The script performs no data correction.

Tests cover allocation conservation, optional/zero figures, three holders/repeated riders, actual report metrics, exact money rows, legacy ambiguity/overlap, midnight boundaries, withdrawal drafts, and migration SQL/model shape. `NINJA_SQL_TEST_SERVER` enables the disposable SQL Server shared-day concurrency and constraint test. LocalDB failed to start in this environment, so SQL runtime checks require a working test server before release.

Frontend contract additions: [shared-account-day-usage-contracts.ts](shared-account-day-usage-contracts.ts). Future platforms can use the same lifecycle and `IPlatformAccountDayAllocationService`; a new report format supplies its parsed totals and metric mapping.
