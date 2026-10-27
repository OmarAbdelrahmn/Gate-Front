# Ninja evaluation API

## GET `/api/ninja/evaluation`

Requires `ninja.read` and the feature flag. Returns the complete date grid for each paginated row, including dates without performance and planned future days.

```http
GET /api/ninja/evaluation?year=2026&month=10&view=riders&page=1&pageSize=50
GET /api/ninja/evaluation?year=2026&month=10&view=accounts&accountId=<guid>&asOf=2026-10-24
```

| Query | Meaning |
|---|---|
| `year`, `month` | Required calendar month; no future month |
| `asOf` | Optional Riyadh business date within that month, no later than today |
| `view` | `riders` (default) or `accounts` |
| `accountId`, `riderId` | Historical facts/assignment identity; filters combine with AND |
| `cityId`, `sponsorId` | Account city and establishment/sponsor; sponsor is not inferred to be invoice supplier |
| `pricingType` | `CAR` or `BIKE`; selects rows containing that pricing type, retaining their full context |
| `status` | `TargetAchieved`, `BelowTarget`, or `Unknown` |
| `search` | Rider name or Captain ID, up to 200 characters |
| `page`, `pageSize` | Page 1..100000; size 1..100, default 50 |

Absent `asOf`, use the latest imported performance date in the selected account/rider scope; with no performance, use today or month-end for a historical month. No file timestamp is used as a business date.

## Response structure

- `year`, `month`, `today`, `requestedAsOf`, `view`.
- `policyVersion`, `inputRevision`, `computedAtUtc`: calculation version, deterministic input fingerprint and UTC run time.
- `summary`: entire filtered result before paging, account/rider counts, observed totals, suggested total or null, rows without suggestions, mixed-cutoff indicator and account comparisons.
- `items`: report rows. The rider roster comes from historical assignments, including riders without uploaded performance.
- `page`, `pageSize`.

Each row has identity IDs, Captain IDs, assignment IDs, available city/establishment names, `days[]`, `observed`, `evaluated`, `periodTarget`, `targetDueToday`, `attendance`, `suggestedMoney`, `forecast`, `continuationScenario`, `otherEligibility` and `reasons`.

`observed` includes available records through `requestedAsOf`. `evaluated` stops at the latest continuously complete scheduled date. A later record does not fill an earlier missing date. `latestImportedDate`, `latestCompleteDate` and `dataDelayDays` remain separate.

`otherEligibility` exposes Acceptance/Timing/Uniform/LeaveCompliance as `Unknown`. Do not infer acceptance from completed orders or map an unrelated workbook compliance percentage to a contractual condition.

## Daily cells

`date`, `accountId`, `captainId`, historical `assignmentId`/`riderProfileId`, `pricingType`, `responsibility`, `orders`, `hours`, `target`, `gap`, `hoursStatus`, `coverage`, `sourceId`, `importId`, `sourceRowNumber`, `allocationOrigin`, `importedAtUtc`.

| Field | Values |
|---|---|
| `coverage` | `Complete`, `Missing`, `AllocationMismatch` |
| `hoursStatus` | `Qualified`, `ShortHours`, `PartialShiftUnknown`, `Unknown`, `NotScheduled` |
| `allocationOrigin` | `Reported`, `Declared`, `Remainder`, `LegacyUnknown` |

An account cell's hours use the source total. A rider cell uses only that rider's share. Two riders with three and five hours do not individually pass the eight-hour rule just because the source has eight hours.

## GET `/api/ninja/evaluation/accounts/{id}/days/{date}`

Returns `{ source, riders }`: the account's day and each historical holder's day. This is the drawer/drilldown endpoint; do not substitute today's rider.

## GET `/api/ninja/evaluation/export`

Same filters, but exports the entire filtered result regardless of requested page. Requires both read and export permissions. Returns XLSX with Suggestions, Daily and Metadata sheets, including cutoff, input version, assumptions and invoice-pending status. Unknown values remain explicit and untrusted strings are written as text cells.

## Errors and empty results

400: invalid date/query/input. 403: denied or feature disabled. 404: referenced account/rider/snapshot not available. 409: stale revision, expired/stale preview or frozen-period review required. Missing data or unresolved pricing/responsibility produces row reasons and null dependent fields, not a failed report. An authorized empty scope succeeds with an empty `items` array.
