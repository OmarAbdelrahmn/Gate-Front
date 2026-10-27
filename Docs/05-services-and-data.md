# Services, revisions and persistence

## Components

| Component | Responsibility |
|---|---|
| `NinjaSuggestionCalculator` | Pure decimal calculation of prorated targets/bases, shortage bands, attendance bounds and money rounding; no database or accounting dependencies |
| `INinjaEvaluationService` / `NinjaEvaluationService` | Authorized monthly read models, coverage, separate account/rider calculations, context/responsibility revisions, snapshots, XLSX export |
| `INinjaPerformanceImportService` / `NinjaPerformanceImportService` | Templates, user-bound 30-minute previews, confirmation, original artifacts and receipts |
| `NinjaPerformanceParser` | CSV/XLSX normalization, dates, explicit units, duplicate and value validation |
| `NinjaPerformanceImportEngine` | Prepare all date-specific records and provenance without tracking or saving; the caller owns account locks and one commit |
| Existing `PlatformAccountDayAllocationService` | Historical holders, declaration requirements, handover order, remainder, overlap protection and reconciliation |
| Existing `NinjaService` | Legacy routes; performance import delegates to the common core, preserving its original parser and response |

Read queries are no-tracking and bounded to a selected month. Account/date and provenance lookups avoid rescanning the complete fact collection for each cell. Filtering and summaries happen before paging. Source totals and shares are never added together, and deductions are not joined into evaluation facts.

## New `ninja` tables

| Table | Data |
|---|---|
| `SuggestionPolicies` | Immutable policy version and definition; seeded v1 |
| `EvaluationContexts` | Account revision, predecessor, confirmed first-delivery date, dated pricing overrides, reason and reviewed snapshot |
| `ResponsibilityRevisions` | Account/month revision, predecessor, reason and reviewed snapshot |
| `ResponsibilityLines` | Revision/date/assignment weight, decimal(18,8), unique per revision/date/assignment and constrained 0..1 |
| `PerformancePreviews` | Creator, source hash, parsing options, input fingerprint and expiry |
| `PerformanceArtifacts` | Confirmed originals, fingerprint, filename/format, receipt and reference to an already retained identical original |
| `PerformanceImportArtifacts` | Links one artifact to existing date-specific import headers |
| `AllocationProvenance` | Source/assignment origin and evidence reference, unique per source/assignment |
| `EvaluationSnapshots` | Query, input revision, policy, authorized account IDs, immutable result JSON, reason, frozen state and predecessor |

All are history records: UUIDv7 IDs, UTC creation metadata and immutable after insert. Foreign keys use restricted deletion. Revision IDs serve as optimistic concurrency tokens; ordered SQL account locks and unique revision indexes enforce concurrent writers. Existing application rowversions remain part of import input fingerprints.

No tenant model, payroll model or separate editable performance ledger is introduced. Coverage is derived. Legacy missing originals/provenance remain unknown; there is no automatic reconstruction from names or current owners.

## Context API

`GET /api/ninja/evaluation/accounts/{id}/context` returns current `revisionId`/`revision`, confirmed start and pricing periods.

```json
{
  "expectedRevisionId": null,
  "confirmedFirstDeliveryDate": "2026-10-01",
  "pricingPeriods": [{"from":"2026-10-01","to":"2026-10-31","pricingType":"BIKE"}],
  "reason": "Verified first delivery and pricing reference",
  "reviewedSnapshotId": null
}
```

Send this to PUT on the same route. Subsequent changes must provide the last revision ID. Periods cannot overlap. A confirmed first-delivery date cannot contradict an earlier saved positive-order source. Do not infer that date from the first available upload.

## Responsibility API

GET with `year` and `month` returns the current explicit lines. Unspecified sole-holder days default to weight 1; an unspecified shared day remains unresolved.

PUT replaces the account/month's explicit schedule with a new revision:

```json
{
  "year": 2026,
  "month": 10,
  "expectedRevisionId": null,
  "lines": [
    {"assignmentId":"<earlier-guid>","date":"2026-10-14","weight":0.5},
    {"assignmentId":"<later-guid>","date":"2026-10-14","weight":0.5}
  ],
  "reason": "Reviewed planned handover responsibility",
  "reviewedSnapshotId": null
}
```

Every specified day must include each eligible assignment once, and weights total exactly one. Short hours never rewrite weights. The revision does not change imported shares or assignment history.

## Snapshots

POST `/api/ninja/evaluation/snapshots`:

```json
{
  "query":{"year":2026,"month":10,"view":"riders","asOf":"2026-10-24"},
  "reason":"Supervisor monitoring review",
  "freeze":true,
  "supersedesId":null,
  "expectedInputRevision":"<revision returned by GET>"
}
```

GET `/api/ninja/evaluation/snapshots/{id}` reads that immutable result after rechecking account scope. Snapshot creation always includes the complete filtered result, not just a page. `supersedesId` creates a corrected snapshot of the same query scope; it never updates the predecessor.

Context/responsibility changes affecting frozen monitoring results require the applicable latest frozen snapshot ID and a reason. Changes create new versions; prior snapshots stay intact. Freeze is a monitoring control, not financial approval. Later imports may change live results without rewriting saved snapshots.

Audit records retain identity, actor, hashes and metadata; original workbook bytes and large snapshot result JSON are retained once in their owning records rather than copied into the audit payload.
