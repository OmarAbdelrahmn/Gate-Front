# Chefz frontend handoff — workbook updates

**15 October 2026:** [Account status control](chefz-account-status-control.md) documents the new backend status service and endpoint. Account responses now include `status`, `statusReason`, and `accountRowVersion`; workbook `dashboardStatus` is independent metadata.

Updated 11 October 2026. This document describes the implemented backend contracts for the new Chefz screens. Use the existing authenticated API client and configured API origin. All paths below begin with `/api/chefz`.

## Hosted database status

The hosted database `db67927` already has migration `20261011191524_AddChefzWorkbookReportsAndStatistics` applied. Fresh verification on 11 October 2026 confirmed 465 Chefz accounts, 464 workbook-configured account details, one performance settings record, three sponsor-statistics records, zero Chefz assignments, and zero daily performance records. Every workbook account matched its stored values. The authorized reset removed 3 assignments and 6 old daily records. Other platform accounts and assignments were verified unchanged during the reset transaction.

Both IDs `2506752275` and `2507652275` are retained as different people. `2506752275` is configured from the workbook but has no registered owner linked. `2507652275` retains its original owner and appears as `Unconfigured` until Chefz details are entered. Before importing new performance, restore the appropriate account-to-rider assignments through the existing assignment workflow. Historical reports initially show missing data because the old history was explicitly cleared.

The database update is applied. **The updated API binaries still require deployment to the hosted API before these new routes can be used there.** Database verification does not establish HTTP route availability. This task does not change the API origin or publish frontend screens.

## Request conventions

- Authentication: `Authorization: Bearer <accessToken>` through the shared authenticated client.
- JSON reads: `Accept: application/json`. JSON writes: also `Content-Type: application/json`.
- Date-only values: `YYYY-MM-DD`; retain them as calendar dates in the UI rather than shifting them through UTC conversion. Business dates are Riyadh dates.
- JSON properties use camelCase. Account type is a string. Rates in reports/settings use percentage points: `80` means 80%. Account `commissionRate` is a fraction: `0.15` means 15%.
- Account IDs, rider IDs, and sponsor IDs are UUIDs. The external account/iqama number is a string; do not pass it into a UUID route/query parameter.
- Paginated responses are `{ items, page, pageSize }`, without total count or next-page metadata. Default page is 1 and size is 50. Valid page range is 1–100000, size 1–100. Fetch until a page contains fewer than `pageSize` items.
- Save the returned `rowVersion` token. Send it unchanged on updates and statistics deletion, replacing it with the new returned token after each save. Encode query-string tokens using `URLSearchParams`.
- Successful JSON actions return HTTP 200, including statistics creation. Statistics deletion returns HTTP 204 with no body. JSON responses contain the returned DTO directly; there is no `data` or `result` envelope.

## New endpoint inventory

| Method | Path | Input | Success response | Permission |
| --- | --- | --- | --- | --- |
| GET | `/settings/performance` | None | `ChefzSettingsResponse` | `chefz.read` |
| PUT | `/settings/performance` | `ChefzSettingsRequest` JSON | `ChefzSettingsResponse` | `chefz.accounts.update` |
| GET | `/sponsor-statistics` | `page`, `pageSize` | `ChefzPage<ChefzStatisticsResponse>` | `chefz.read` |
| GET | `/sponsor-statistics/{sponsorId}` | Sponsor UUID | `ChefzStatisticsResponse` | `chefz.read` |
| POST | `/sponsor-statistics/{sponsorId}` | `ChefzStatisticsRequest` JSON | `ChefzStatisticsResponse` | `chefz.accounts.update` |
| PUT | `/sponsor-statistics/{sponsorId}` | `ChefzStatisticsRequest` JSON | `ChefzStatisticsResponse` | `chefz.accounts.update` |
| DELETE | `/sponsor-statistics/{sponsorId}` | Query `rowVersion` | 204, no body | `chefz.accounts.update` |
| GET | `/reports/riders` | Account/rider filter, ending year/month/half, `halves` | `ChefzRiderReport` | `chefz.read` |
| GET | `/reports/management` | `reportDate`, optional `sponsorId` | `ChefzManagementReport[]` | `chefz.read` |
| GET | `/reminders` | `page`, `pageSize` | `ChefzPage<ChefzAccountReminder>` | `chefz.read` |

All permissions also require the existing Chefz platform client scope. Use the application permission state to hide write controls for read-only users. No new B3 account-status permission was added.

## 1. Performance settings screen

Load with `GET /api/chefz/settings/performance`. Its response is `{ settings, rowVersion }`; `settings.rowVersion` also contains the same token. PUT expects the flat settings object, not this response envelope. A typical save is `{ ...response.settings, rowVersion: response.rowVersion }`.

Example PUT body using the seeded values; replace the token with the actual GET token:

```json
{
  "overallAOrders": 80,
  "overallBOrders": 60,
  "overallCOrders": 40,
  "dailyAOrders": 7,
  "dailyBOrders": 5,
  "dailyCOrders": 3,
  "aAcceptanceRate": 80,
  "bAcceptanceRate": 70,
  "cAcceptanceRate": 60,
  "changeAfterNoOrderDays": 2,
  "followUpOnZeroOrdersWithMissedOffers": true,
  "rowVersion": "<token-from-get>"
}
```

UI: show overall and daily order thresholds, the A/B/C acceptance thresholds, days without orders, and the zero-orders-with-missed-offers follow-up switch. Require positive integer order thresholds with A > B > C separately for overall and daily. Rates must satisfy 100 ≥ A ≥ B ≥ C ≥ 0 and have at most two decimals. `changeAfterNoOrderDays` is an integer from 1 to 365. All fields are submitted together.

The backend evaluates A, then B, then C, then D; a category requires both its order threshold and acceptance threshold. A includes orders above 100. A lower acceptance rate can reduce the category even when orders exceed a higher threshold. `CHANGE` overrides the overall rating after more than the configured number of consecutive observed zero-order days at the end of the observed sequence. With the default 2, the trigger is 3 days. Missing uploads interrupt the sequence; new orders clear it. Daily zero orders plus positive missed offers gives `متابعه شديدة` when the switch is enabled. Reports use the current settings, so saving thresholds changes the classification of future report requests, including reports for past dates.

## 2. Rider / account performance report

Example:

```text
GET /api/chefz/reports/riders?accountId=<accountUuid>&year=2026&month=10&half=2&halves=4
```

| Parameter | Required | Meaning |
| --- | --- | --- |
| accountId | At least one of accountId/riderId | Chefz account UUID |
| riderId | At least one of accountId/riderId | Actual rider profile UUID |
| year | Yes | Ending year, 1–9999 |
| month | Yes | Ending month, 1–12 |
| half | Yes | Ending half, 1 or 2 |
| halves | Yes | Number of consecutive calendar halves, 1–120 |

Supplying both IDs restricts results to that account AND that rider. The ending half is included. Half 1 is days 1–15; half 2 is day 16 through the actual month end. October half 2 with `halves=4` returns September half 1, September half 2, October half 1, and October half 2. The selected ending half may include future dates; reports use whatever stored data exists and do not fabricate future values.

Response fields:

| Field | UI behavior |
| --- | --- |
| accountId / riderId | Echoed filters; either may be null |
| requestedHalves | Display requested period count |
| halves | All requested periods, oldest first, including missing periods |
| selectedSummary | Totals/rating over the selected window's existing data |
| allTimeSummary | Totals/rating over ALL stored history matching the same account/rider filters, including history outside the selected window |
| daily | Observed dates in the selected window, oldest first; summed across matching rows |
| messages | Arabic missing-period messages; display them visibly |

A half contains `from`, `to`, `daysWithData`, `orders`, nullable `acceptanceRate`, nullable `rating`, and nullable `message`. A summary contains `halvesWithData`, `daysWithData`, `orders`, nullable `averageOrdersPerHalf`, nullable `acceptanceRate`, and nullable `rating`. A daily row contains `date`, `orders`, `validOffers`, `missedOffers`, nullable `acceptanceRate`, and `rating`.

Illustrative response excerpt for two available halves out of four (daily rows and echoed filters omitted here):

```json
{
  "requestedHalves": 4,
  "halves": [
    { "from": "2026-09-01", "to": "2026-09-15", "daysWithData": 0, "orders": 0, "acceptanceRate": null, "rating": null, "message": "لا توجد بيانات للفترة 2026-09-01 إلى 2026-09-15." },
    { "from": "2026-09-16", "to": "2026-09-30", "daysWithData": 0, "orders": 0, "acceptanceRate": null, "rating": null, "message": "لا توجد بيانات للفترة 2026-09-16 إلى 2026-09-30." },
    { "from": "2026-10-01", "to": "2026-10-15", "daysWithData": 15, "orders": 80, "acceptanceRate": 80, "rating": "A", "message": null },
    { "from": "2026-10-16", "to": "2026-10-31", "daysWithData": 10, "orders": 60, "acceptanceRate": 75, "rating": "B", "message": null }
  ],
  "selectedSummary": { "halvesWithData": 2, "daysWithData": 25, "orders": 140, "averageOrdersPerHalf": 70, "acceptanceRate": 77.78, "rating": "B" },
  "allTimeSummary": { "halvesWithData": 2, "daysWithData": 25, "orders": 140, "averageOrdersPerHalf": 70, "acceptanceRate": 77.78, "rating": "B" },
  "messages": ["لا توجد بيانات للفترة 2026-09-01 إلى 2026-09-15.", "لا توجد بيانات للفترة 2026-09-16 إلى 2026-09-30."]
}
```

These sample figures are illustrative, not current hosted performance. Do not count the two missing halves as zeros in averages: 140 / 2 = 70. Orders mean accepted offers. Acceptance is computed from total accepted / total valid offers, weighted across the original rows. No valid offers means a null rate. A partially observed half contributes one observed half; expose `daysWithData` so admins can see incomplete coverage. Overall ratings use average orders per observed half, while each individual half uses its own total. The backend owns ratings; the frontend must not recalculate them from the rounded display average.

Empty data is still HTTP 200: missing half rows have `message`, summary observed counts are zero, summary average/rate/rating are null, and `daily` is empty. Render `لا توجد بيانات` / `—` rather than a D rating or 0% for unavailable values. A real observed zero remains a zero. Keep historical performance attached to the actual rider; registered account ownership is not the report's rider identity.

## 3. Sponsor statistics table and CRUD

Build the worksheet layout as category rows with a column per sponsor. Use response `sponsorNameAr` as the column heading and UUID `sponsorId` as the stable key. The company total is the sum of sponsor `sponsorshipCount`; the seeded value is 399. This is a manual sponsorship statistic, distinct from the live Chefz account total 465. Categories overlap and are not required to add up to sponsorship totals.

| Request/values field | Arabic row label |
| --- | --- |
| sponsorshipCount | عدد الكفالات |
| working | يعمل |
| notWorking | لا يعمل |
| blocked | بلوك |
| permanentlyBlocked | بلوك نهائي |
| updateBlocked | بلوك تحديث |
| uploaded | تم الرفع |
| privateLicense | خصوصي |
| pendingUpload | جاري الرفع |
| noLicense | لا يوجد رخصة |
| managementSuspended | إيقاف من الإدارة |
| motorcycle | دباب |
| workingOutsideSponsorship | يعمل بدون كفالة |
| workingWithoutPerformance | يعمل ولكن لا يوجد في الأداء |

Hosted sponsor IDs and seeded source totals:

| Sponsor UUID | Registry name returned by the database | Sponsor number | Sponsorship total |
| --- | --- | --- | --- |
| `019c18d5-62e1-7000-8000-000000000041` | البوابا الموكبلا | 7015658094 | 199 |
| `019c18d5-62e1-7000-8000-000000000042` | اكسبرس جايت | 7034861059 | 155 |
| `019c18d5-62e1-7000-8000-000000000040` | البوابة المقبلة للتجارة | 7038745530 | 45 |

Fetch these dynamically; the table above helps initial integration. Do not identify sponsors by display label or array position.

Read one sponsor:

```text
GET /api/chefz/sponsor-statistics/019c18d5-62e1-7000-8000-000000000041
```

Response shape is `{ id, sponsorId, sponsorNameAr, values, rowVersion }`; `values.rowVersion` repeats the same token. Creation and update accept a flat values object, not the response envelope. Example PUT body for the 199-total sponsor, replacing the token:

```json
{
  "sponsorshipCount": 199,
  "working": 89,
  "notWorking": 0,
  "blocked": 2,
  "permanentlyBlocked": 1,
  "updateBlocked": 1,
  "uploaded": 0,
  "privateLicense": 17,
  "pendingUpload": 2,
  "noLicense": 0,
  "managementSuspended": 0,
  "motorcycle": 87,
  "workingOutsideSponsorship": 9,
  "workingWithoutPerformance": null,
  "rowVersion": "<token-from-get>"
}
```

All counts are nonnegative integers. `workingWithoutPerformance` may be null; its source label did not have a number, so render it as an empty/unknown value until entered. Creation requires an existing sponsor; omit `rowVersion` for POST. Existing statistics return 409 on POST. Update uses the latest token. Deletion soft-deletes the statistics record only, leaving the sponsor and platform accounts intact. A new record can subsequently be created for that sponsor.

```typescript
const query = new URLSearchParams({ rowVersion: response.rowVersion });
// Use the shared client, handling the 204 response without JSON parsing.
const path = `/api/chefz/sponsor-statistics/${response.sponsorId}?${query}`;
```

Refresh that sponsor's column after create/update and remove it after delete. On 409, refetch and show the latest values before retrying. Reapply the user's edits only after comparing them with the refreshed record.

## 4. Management report

```text
GET /api/chefz/reports/management?reportDate=2026-10-11
GET /api/chefz/reports/management?reportDate=2026-10-11&sponsorId=<sponsorUuid>
```

`reportDate` is required and must be a valid date no later than today in Riyadh. Omit `sponsorId` to return all sponsors. The response is an array even when one sponsor is selected. These are calculated operational figures, separate from the manually edited sponsor-statistics table.

| Response field | Arabic report row / meaning |
| --- | --- |
| sponsorId | Stable sponsor UUID |
| sponsorNameAr | اسم الشركة |
| application | التطبيق (`ذا شفز`) |
| reportDate | تاريخ التقرير |
| performanceDate | تاريخ الأداء (اليوم السابق لتاريخ التقرير) |
| cycleFrom | بداية الدورة نصف الشهرية |
| cycleOrders | إجمالي عدد طلبات الدورة حتى اليوم السابق |
| accountsBelowThreeOrdersInCycle | عدد الحسابات بأقل من 3 طلبات خلال الدورة |
| ridersWithOrdersYesterday | عدد المناديب الذين نفذوا طلبات في اليوم السابق |
| ridersWithThreeOrFewerOrdersYesterday | عدد المناديب بثلاثة طلبات أو أقل في اليوم السابق |
| ridersWithMoreThanThreeOrdersYesterday | عدد المناديب بأكثر من ثلاثة طلبات في اليوم السابق |

For report date 11 October, performance date is 10 October and cycle begins 1 October. On the 1st or 16th, the cycle is the half containing yesterday, so the previous half is reported. Cycle order counts group by account, daily counts by actual rider. Accounts without performance are counted below three in this management roster report. Daily low-order counts include assigned riders without a daily row as zero. The rider-performance report instead exposes missing data explicitly. Sponsor grouping uses current account sponsor membership.

Use one report card/table per sponsor and display both report and performance dates. No server PDF/XLSX export route is added here; a frontend print view may use this returned report.

## 5. Reminder badges

```text
GET /api/chefz/reminders?page=1&pageSize=100
```

Response is paginated. Each reminder includes `accountId`, `ownerEmployeeId`, `ownerName`, `ownerStatus`, `condition`, and Arabic `message`.

| Condition | Trigger | Suggested badge |
| --- | --- | --- |
| OutsideSponsorship | Registered owner is `OutsideRider` or has no sponsor | اقترب من البلوك |
| FinalExit | Registered owner's status is `Terminated` | خروج نهائي — معرض للبلوك |

`FinalExit` takes precedence if both conditions apply. The owner is the registered account owner, not its currently assigned rider. Reminders are computed from current HR state and disappear when the condition no longer holds. Accounts without a registered owner are not returned by this endpoint. Refresh after HR sponsorship/status changes and when entering the Chefz screen; no push subscription, acknowledgement, archive, or reminder-write endpoint is added. B3 is excluded.

Fetch all reminder pages when rendering badges across the account table; match reminders by `accountId`. A single reminder page may not cover the current account page because the two lists contain different populations. Keep a separate warning for an unlinked owner if the existing platform-account screen exposes that field.

## 6. Changed existing account contracts

Existing routes remain:

```text
GET /api/chefz/accounts?page=1&pageSize=100
GET /api/chefz/accounts/{accountId}
PUT /api/chefz/accounts/{accountId}
```

The full read response now contains:

```typescript
interface ChefzAccountResponse {
  accountId: string;
  externalAccountId: string;
  reportIdNumber: string;
  accountType: 'Freelancer' | 'FullTime' | 'Unconfigured';
  commissionRate: number;
  dailyFee: number;
  hasPassword: boolean;
  rowVersion: string;
  sponsorId: string | null;
  operatingCityId: string | null;
  vehicleType: 'Car' | 'Motorcycle' | 'Unknown';
  dashboardStatus: string;
}
```

`Unconfigured` is a read-only state; do not send it as an account type in PUT. Its rowVersion is an empty string because no details row exists, vehicle type is `Unknown`, and dashboard status falls back to the generic platform status (`Available`, `Assigned`, `Suspended`, `Retired`, or `Archived`). Commission/daily fee are zero until details are configured. Keep these accounts visible with an `إعداد الحساب مطلوب` badge and disable settlement submission until the type is configured.

PUT accepts `accountType` (Freelancer/FullTime), optional `reportIdNumber`, optional `rowVersion`, optional `vehicleType` (Car/Motorcycle), and optional `dashboardStatus` (active/Block By CHEFZ/The supervisor suspended). Updating existing details requires their current rowVersion. Creating details for an unconfigured account does not require a details token. Omitted report ID resolves from the registered owner's iqama, then the external account ID. Omitted vehicle/status fields preserve existing values; new detail defaults are Car/active. Existing details edits use `chefz.accounts.update`; the new reminder feature does not add a B3 status permission or require new status-edit controls.

After an account update, use the returned record and refresh the relevant account list. Sponsor/city fields are read-only in this Chefz details PUT; continue using the existing platform-account workflow to change them. Dashboard status updates also synchronize the platform status: active is Assigned when there is a current active assignment, otherwise Available; the two suspension labels map to Suspended.

Password, settlement, daily-performance read, and daily-performance import endpoints retain their previous contracts documented in [the original frontend handoff](chefz-frontend-handoff.md). The performance import still requires an actual assignment on the uploaded report date, so imports initially fail with row issues until assignments are added after the reset.

## Errors and acceptance checks

Handle JSON Problem Details through the existing application error handler. Business errors include `Chefz.Invalid` (400), `Chefz.Forbidden` (403), `Chefz.NotFound` (404), and `Chefz.Conflict` (409). Authentication can return 401; model binding failures use the application's normal 400 problem response. Display `detail` and retain `errorCode`/`correlationId` for support. A missing half is a successful report response, not a 404.

Frontend acceptance checks:

1. Read-only users can view reports/reminders/statistics but cannot edit settings or statistics.
2. Account pages include both disputed IDs and label unconfigured details correctly.
3. Settings save uses a flat body and latest token; invalid threshold ordering blocks submission.
4. Four requested halves with two present show four rows, two missing messages, and averages over two present halves.
5. No-data reports show null rate/rating as unavailable and do not turn them into 0% or D.
6. Sponsor columns use sponsor UUIDs; seeded totals remain 199/155/45 and unknown working-without-performance remains null.
7. Statistics POST/PUT use flat bodies; DELETE handles 204 and URL-encodes the token; 409 refreshes stale values.
8. Management report uses yesterday consistently, including the 1st/16th boundary.
9. Reminder badges use registered owner conditions, with FinalExit taking precedence; B3 is omitted.
10. After deploying the API, smoke-test all ten new routes through the authenticated frontend client. Hosted database verification alone is insufficient for this check.

Use [chefz-new-endpoints-contracts.ts](chefz-new-endpoints-contracts.ts) for matching TypeScript types and URL helpers. Backend implementation and tests are linked from [the workbook implementation notes](chefz-workbook-updates.md).
