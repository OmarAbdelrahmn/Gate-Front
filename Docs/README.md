# Ninja performance and suggested earnings

Backend implementation: 26 October 2026. This pack describes **suggestions for monitoring**, not actual salary or Ninja's final settlement. Official invoice processing is outside v1.

## Read in this order

1. [Performance evaluation endpoints](01-performance-api.md): report queries, coverage, historical assignments, daily drilldown.
2. [Suggested money](02-suggested-money.md): contract rates, proration, hours, forecasts and examples.
3. [Performance imports](03-performance-imports.md): CSV/XLSX, preview/confirm, atomicity and provenance.
4. [Frontend integration](04-frontend-handoff-ar.md): Arabic labels, horizontal grid and UI states.
5. [Services and persistence](05-services-and-data.md): service boundaries, tables, revisions and snapshots.
6. [Deployment and verification](06-deployment-and-verification.md): migrations, feature flag, tests and hosted import evidence.

Use [TypeScript contracts](contracts.ts) and [the transport-injected client](client.ts) with the application's authenticated HTTP client. All paths are below `/api/ninja`.

## Status and permissions

New routes require the new API binary **and** `Features:NinjaEvaluation=true` (`Features__NinjaEvaluation=true` as an environment variable). The repository default is false. A successful database migration does not deploy or enable the API.

| Action | Permission, scoped to Ninja |
|---|---|
| Reports, policy, context, responsibility reads, snapshot reads | `ninja.read` |
| Preview, confirmation, input template | `ninja.performance.import` |
| Context/responsibility revisions and snapshot creation | `ninja.evaluation.manage` |
| XLSX export | `ninja.evaluation.export` plus `ninja.read` |

Only system administrators receive the two new grants by default. Reading Ninja never grants import/manage/export. The legacy Ninja controller and its 19 endpoints retain their routes and response shapes.

## Core distinctions

- Account results use account/day source totals; rider results use saved historical assignment shares.
- Planned responsibility distributes targets; actual attendance does not reduce the target.
- Missing data is unknown, not zero or absence.
- Acceptance, timing, uniform and leave-compliance are unknown in v1. They do not create invented penalties.
- `suggestedMoney`, `forecast.suggestedMoney`, and account/rider comparisons are advisory. `actualInvoiceAmount` remains null.
- The evaluation services never write payroll, treasury, payment, debt, invoice or operational-status records.
