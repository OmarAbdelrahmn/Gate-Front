# Chefz workbook updates

**15 October 2026:** [Account status control](chefz-account-status-control.md) adds an independent lifecycle status endpoint. Editing workbook `dashboardStatus` no longer changes the lifecycle `status`.

The workbook `داش شيفز مطلوووووووووب222.xlsx` defines the account replacement data, rating settings, sponsor statistics, management report fields and reminders. Workbook text is reference data; the requested scope comes from the user's message. B3 on the last sheet is excluded.

## Accounts and the one-time reset

463 existing accounts are matched by `ExternalAccountId` to `Id Number`. Workbook ID `2506752275` is a new unlinked account; existing account `2507652275` is retained because the user explicitly confirmed they are different people. There are 465 Chefz accounts after the update, 464 configured from the workbook. The retained account appears as `Unconfigured` until its Chefz settings are supplied; its owner and metadata are unchanged. Sponsor numbers resolve to existing `Sponsor.EmployerIdentityNumber`; all workbook account cities are Jeddah. Account details now include `vehicleType` (`Car` or `Motorcycle`) and `dashboardStatus` (`active`, `Block By CHEFZ`, `The supervisor suspended`). Existing Chefz account responses expose these fields plus sponsor/city IDs. Freelancer/FullTime settlement rules remain unchanged.

The authorized reset deletes Chefz rider assignments, assignment events, dependent daily performance and wallet settlements. It removes unused performance import receipts. Passwords, registered owners and other platform accounts are retained. `tools/Apply-ChefzWorkbookUpdate.ps1` runs schema deployment and reset together in one transaction, backs up the source rows to `outputs/chefz-workbook-update-<timestamp>/before.xml`, saves the extracted source JSON, records an audit event, and verifies other platform accounts/assignments did not change. It refuses unmatched accounts, ambiguous sponsors, owner mismatches or Jahez financial references. It is a one-time operation; it refuses to overwrite existing sponsor statistics.

## Editable performance settings

`GET /api/chefz/settings/performance` returns `{ settings, rowVersion }`. `PUT` accepts the settings fields and latest `rowVersion`. Writes require `chefz.accounts.update` and Chefz client scope; reads use `chefz.read` and that scope. Existing permissions are reused without introducing the B3 permission change.

Defaults saved by the migration:

| Setting | Overall / half | Daily |
| --- | --- | --- |
| A orders / acceptance | 80 / 80% | 7 / 80% |
| B orders / acceptance | 60 / 70% | 5 / 70% |
| C orders / acceptance | 40 / 60% | 3 / 60% |
| D | Below qualifying thresholds | Below qualifying thresholds |

Evaluate A, then B, then C, then D, requiring both order and acceptance thresholds. A includes more than 100 orders. An account with high order volume and a lower acceptance rate can qualify for a lower category. These choices extend the sheet's otherwise incomplete bands. Orders mean `Accepted Offers`, the order metric available in the existing daily import. Aggregate acceptance is `sum(Accepted Offers) / sum(Total Valid Offers) * 100`; it is not an average of daily percentages. Zero valid offers returns an unavailable (`null`) acceptance rate.

`changeAfterNoOrderDays: 2` produces `CHANGE` after more than two consecutive recorded zero-order days at the end of the observed sequence. New orders clear the streak. Missing dates interrupt the sequence. `followUpOnZeroOrdersWithMissedOffers: true` returns daily rating `متابعه شديدة` when accepted offers are zero and missed offers are positive.

## Rider / account report

`GET /api/chefz/reports/riders?accountId=<guid>&year=2026&month=10&half=2&halves=4`

Supply an account ID, a rider ID, or both. `halves` ranges from 1 to 120, ending in the selected inclusive calendar half (days 1–15 or 16–month end). The response returns every requested half in chronological order, observed daily results, `selectedSummary`, `allTimeSummary`, and missing-period messages. A half with no data has `rating: null` and a message. Zero orders on an observed day remain a real zero. Reports preserve the actual rider stored with historical daily performance; filtering by rider never assigns past performance to a replacement rider.

For two available halves out of four requested, `halvesWithData` is 2, the other two halves have missing-data messages, and average orders divides by 2. Overall selected rating uses average orders per observed half so selecting more halves does not inflate the rating. All-time rating similarly averages over all observed halves. Daily acceptance and overall acceptance are weighted using original counts. `daysWithData` exposes incomplete half coverage; missing days are not inserted as zero into performance ratings. No-data summaries have zero observed counts, `null` average/rate/rating, and explicit missing messages.

## Sponsor statistics CRUD

| Verb | Path | Behavior |
| --- | --- | --- |
| GET | `/api/chefz/sponsor-statistics?page=1&pageSize=50` | List, max 100 per page |
| GET | `/api/chefz/sponsor-statistics/{sponsorId}` | Read one sponsor's record |
| POST | Same sponsor path | Create; existing record returns 409 |
| PUT | Same sponsor path | Update with current `rowVersion` |
| DELETE | Same sponsor path + `?rowVersion=<url-encoded token>` | Soft delete with current token |

Request fields map directly to the sheet:

| Field | Arabic label |
| --- | --- |
| sponsorshipCount | عدد الكفلات |
| working | يعمل |
| notWorking | لا يعمل |
| blocked | بلوك |
| permanentlyBlocked | بلوك نهائي |
| updateBlocked | بلوك تحديث |
| uploaded | تم الرفع |
| privateLicense | خصوصي |
| pendingUpload | جاري الرفع |
| noLicense | لا يوجد رخصة |
| managementSuspended | ايقاف من الإدارة |
| motorcycle | دباب |
| workingOutsideSponsorship | يعمل بدون كفالة |
| workingWithoutPerformance | يعمل ولاكن لا يوجد في الإداء |

Each record contains the sponsor GUID, sponsor name, `values`, and `rowVersion`. Counts are independent manual values, not automatically recalculated or forced to sum: the worksheet's categories overlap. Seed the 199/155/45 sponsor totals and category counts exactly as supplied. `workingWithoutPerformance` is nullable because its explanatory label has no numeric value in the source sheet. The sheet's company total 399 is the sum of these three totals, distinct from the 464 account rows. Frontends can lay out the same category rows across sponsor columns using these records; no frontend application is present in this repository.

## Management report

`GET /api/chefz/reports/management?reportDate=2026-10-11&sponsorId=<optional-guid>`

Returns one row per sponsor (all sponsors when no ID is supplied): company name, application, report date, yesterday's performance date, cycle start, cycle orders through yesterday, accounts below three cycle orders, riders with orders yesterday, riders with at most three yesterday, and riders above three yesterday. Cycle uses the half containing yesterday, so a report on the 1st/16th reports the completed preceding half. Conflicting example dates on rows 8/9 are resolved using the sheet's stated yesterday rule.

Counts group by account for cycle counts and by actual rider for daily counts. Daily low-order counts include the roster assigned on yesterday plus riders with daily records. Accounts without cycle performance are below three for this management roster count. Performance reports instead expose missing data explicitly. Current account sponsor membership determines grouping.

## Reminders

`GET /api/chefz/reminders?page=1&pageSize=50` returns current reminder badges for the registered account owner, including owner name/status and condition. B1: `OutsideRider` or no sponsor gives `OutsideSponsorship`. B2: `Terminated` gives `FinalExit`, as explicitly chosen by the user. Final exit takes precedence when both apply. The reminders are computed from current HR state on every request, so they appear/disappear when that state changes. This is an in-system reminder/badge API; no email or external message is sent. B3 is excluded.

## Deployment / verification

Application migration: `20261011191524_AddChefzWorkbookReportsAndStatistics`. The incremental schema script is `database/scripts/chefz-workbook-reports.sql`. The reset SQL is `database/scripts/chefz-workbook-reset.sql`, parameterized by the extracted source JSON. Schema deployment and data update do not publish the API binaries to the hosted server: deploy the updated API through the normal hosting process to expose the new endpoints.

Focused tests cover rating boundaries, missing dates, two halves out of four, actual rider filters, settings validation/concurrency, statistics CRUD and soft deletion, management aggregation, owner reminders, and authorization. SQL Server checks should additionally exercise the report aggregation queries and rowversion behavior; InMemory checks alone do not establish SQL translation or SQL concurrency.

Applied to hosted `db67927` on 11 October 2026: 463 account updates plus one new account, retained distinct account `2507652275`, 3 assignments and 6 daily performance records removed, 464 workbook detail rows, one settings row and three statistics rows. Direct comparison to every source account returned zero mismatches. Other platform accounts/assignments were checked inside the transaction. The source and full pre-update table backup are in `outputs/chefz-workbook-update-20261011T192347Z/`. Read-only hosted SQL tests execute the real report queries against SQL Server; write behavior is covered by the focused workflow tests, with disposable LocalDB coverage skipped because the local SQL instance is unavailable.
