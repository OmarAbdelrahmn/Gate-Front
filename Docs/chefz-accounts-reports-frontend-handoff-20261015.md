# Chefz frontend handoff: accounts, two-account riders, performance and money

15 October 2026. This is the implementation contract for the updates requested in this chat. It supersedes older descriptions of the Chefz one-account limit, account-list envelope and performance response fields. No frontend source was modified.

## 1. Deployment state and implementation scope

| Layer | State |
| --- | --- |
| Backend source | Implemented and built successfully; 71 Chefz workflow checks passed |
| Hosted database | Verified directly: 19/19 compatibility checks passed; no migration or data update required |
| Hosted API binaries | **Not deployed by this task. Publish the updated API before expecting the hosted HTTP behavior below.** |
| Frontend | Implement using this handoff and the existing application design/client patterns |

The [hosted readiness record](chefz-hosted-readiness-20261015.md) contains the checks and evidence. The database already permits two assignment slots. The application-service exception that allows two Chefz accounts is code, not a database setting; a database-only action cannot activate it on an older API.

Use the application's configured API origin and authenticated client. Do not use the database server hostname as an HTTP API address. After API deployment, verify `GET /api/chefz/accounts` returns `summary`/`sponsors`, and verify a performance import returns `riders[].accounts[]` before enabling the new screens. Use authorized test data for assignment/import smoke tests; do not import the illustrative example files into production.

## 2. Files to give the frontend engineer

- [Complete TypeScript entry point](chefz-accounts-and-reports-contracts.ts): re-exports all Chefz account, summary, performance, money, settings and statistics types, plus base account/assignment requests, responses and URL helpers.
- [Underlying Chefz contracts](chefz-new-endpoints-contracts.ts): keep alongside the entry point because it is imported relatively.
- [Complete JSON examples](chefz-account-updates-examples/README.md): illustrative account response, daily import, account/rider performance report, money import and assignment-limit response. These are synthetic, not hosted financial data.
- [Assignment rules and fee decision](chefz-two-accounts-per-rider.md), [status contract](chefz-account-status-control.md), [live summary contract](chefz-account-counts.md).
- Existing ancillary module details: [settings/statistics/reminders](chefz-new-endpoints-frontend-handoff.md), [order import details](chefz-order-settlements-frontend-handoff.md), [original module handoff](chefz-frontend-handoff.md). Where an older example conflicts with this document, use this document and the TypeScript contracts.

All GUIDs and external/report IDs are strings. Dates are `YYYY-MM-DD` Riyadh calendar dates; preserve date-input strings without converting them through UTC JavaScript timestamps. JSON uses camelCase. Monetary JSON values are numbers, with server amounts rounded to two decimals. Display the returned amounts using the existing SAR formatter; use the backend's financial calculations rather than rebuilding them with JavaScript floating-point arithmetic. Acceptance rates are percentage points: `66.67` means 66.67%, not 0.6667.

## 3. Permissions and routes

Use the existing session/refresh flow and permission checks. Do not determine access solely from a role name. Chefz permissions require the configured Chefz client-platform scope; generic base-account and assignment actions have their own permissions.

| Action | Method and route | Permission | Success body |
| --- | --- | --- | --- |
| Accounts with live counts | GET `/api/chefz/accounts?page=1&pageSize=50` | `chefz.read` | `ChefzAccountsResponse` |
| Chefz account details | GET `/api/chefz/accounts/{accountId}` | `chefz.read` | `ChefzAccountResponse` |
| Save Chefz configuration | PUT same account route | `chefz.accounts.update` | `ChefzAccountResponse` |
| Change lifecycle status | PUT `/api/chefz/accounts/{accountId}/status` | `chefz.accounts.update` | `ChefzAccountResponse` |
| Daily performance upload | POST `/api/chefz/performance/import` | `chefz.performance.import` | `ChefzImportResponse` |
| Stored daily rows | GET `/api/chefz/performance?from=...&to=...` | `chefz.read` | `ChefzPage<ChefzPerformanceResponse>` |
| Rider/account performance report | GET `/api/chefz/reports/riders` | `chefz.read` | `ChefzRiderReport` |
| Money-sheet preview | POST `/api/chefz/settlements/orders/preview` | `chefz.read` | `ChefzOrderSettlementImportResponse` |
| Money-sheet save | POST `/api/chefz/settlements/orders/import` | `chefz.settlements.create` | Same money-import response |
| Saved money import | GET `/api/chefz/settlements/orders/imports/{importId}` | `chefz.read` | Same money-import response |
| Wallet preview | POST `/api/chefz/settlements/preview` | `chefz.read` | `ChefzSettlementResponse` |
| Wallet save | POST `/api/chefz/settlements` | `chefz.settlements.create` | `ChefzSettlementResponse` |
| Saved settlements | GET `/api/chefz/settlements` | `chefz.read` | `ChefzPage<ChefzSettlementResponse>` |
| Platform lookup | GET `/api/platforms` | `platform_accounts.read` | Bare array |
| Base account list/detail | GET `/api/platform-accounts`, GET `/{id}` | `platform_accounts.read` | Bare array / `BasePlatformAccount` |
| Create/edit base account | POST `/api/platform-accounts`, PUT `/{id}` | `platform_accounts.create` / `.update` | `BasePlatformAccount` |
| Take an account | POST `/api/platform-accounts/{id}/assign` | `platform_assignments.create` | `PlatformAssignment` |
| Return an account | POST `/api/platform-accounts/{id}/release` | `platform_assignments.delete` | `PlatformAssignment` |
| Assignment history | GET `/api/platform-accounts/{id}/assignment-history` | `platform_assignments.read` | Bare assignment array |
| Performance settings | GET / PUT `/api/chefz/settings/performance` | `chefz.read` / `chefz.accounts.update` | `ChefzSettingsResponse` |
| Sponsor statistics list | GET `/api/chefz/sponsor-statistics` | `chefz.read` | `ChefzPage<ChefzStatisticsResponse>` |
| Sponsor statistics detail/create/edit/delete | GET / POST / PUT / DELETE `/api/chefz/sponsor-statistics/{sponsorId}` | Read: `chefz.read`; writes: `chefz.accounts.update` | Response record; DELETE 204 |
| Management report | GET `/api/chefz/reports/management?reportDate=...&sponsorId=...` | `chefz.read` | Bare report array |
| Owner reminder badges | GET `/api/chefz/reminders` | `chefz.read` | `ChefzPage<ChefzAccountReminder>` |
| Read/set Chefz password | GET / PUT `/api/chefz/accounts/{id}/password` | `platform_credentials.read` / `.rotate` | GET JSON string; PUT 204 |

Pagination: Chefz pages default to page 1 / size 50; valid page 1–100000, size 1–100. Only the **accounts** page now includes `totalCount`, `summary`, and `sponsors`; other Chefz pages retain `{items,page,pageSize}`. Base platform/account and history endpoints return bare arrays. Use existing rider and sponsor selectors (`/api/riders`, `/api/sponsors`) with their existing `riders.read` and `sponsors.read` permissions.

## 4. Account screen: data sources and counts

Use the existing hosted `SHIFTZ` platform, ID `01a02a0d-845d-7535-ac25-1e1f0c8e5808`. Supported Chefz codes are CHEFZ, THECHEFZ, CHEFSZ and SHIFTZ; never create another platform to enable this feature.

Fetch the Chefz list for configuration and totals. Fetch the base account list for owner, sponsor/city names, payment model, current actual rider and assignment token. Join `chefz.accountId` to `base.id`; registered owner and actual rider are different relationships.

The Chefz list now returns:

```text
items: ChefzAccountResponse[]
page: number
pageSize: number
totalCount: number
summary: { total, taken, notTaken, available, assigned, suspended, retired, archived }
sponsors: [{ sponsorId, sponsorNameAr, sponsorNameEn, counts: same count fields }]
```

Every total is across all non-deleted Chefz accounts, independently of the requested page. An empty page still returns the totals. `taken` means a non-deleted open rider link (`effectiveTo == null`), including retained links on Suspended/Retired/Archived accounts. `notTaken` does not mean Available. The five lifecycle status counts are separate from taken/notTaken and add to `total`.

Render overall count cards and a sponsor breakdown table. The null-sponsor group is labelled خارج الكفالة. Sponsor grouping follows the account's sponsor, not the actual rider's current HR sponsor. These are computed live; they are independent of the manually maintained sponsor workbook-statistics table.

The Chefz list accepts **only** `page` and `pageSize`. For existing server-side status/sponsor/rider filters, use the base list with `platformId` plus optional `accountId`, `operatingCityId`, `sponsorId`, `ownerRiderProfileId`, `actualRiderProfileId`, `status`, `paymentModel`, `currentOnly`, `includeArchived`. `currentOnly=true` selects accounts with an open assignment. An unknown extra filter sent to the Chefz list will not filter its totals or items. Label the Chefz summary as global when displaying a filtered base table.

Normal Chefz lifecycle Archived records remain in the Chefz list and are reversible. Soft-deleted records from older generic archive workflows remain outside the Chefz status endpoint; `includeArchived` on the base API is a separate historical/deleted-record facility.

Suggested table columns: external account ID; report ID; registered owner; actual rider; sponsor; city; Freelancer/FullTime/Unconfigured type; lifecycle status; operational-block badge; account actions. A rider can appear on two account rows. Preserve arrays when indexing accounts by rider; do not keep only the first match.

## 5. Status controls and concurrency

The reference image is the five-state filter. Keep its five options, with Arabic labels: متاح / معيّن / موقوف / مستبعد / مؤرشف. For the edit action, offer Suspended, Retired, Archived and استعادة الحالة التلقائية (`Active`). Available and Assigned are automatic.

```http
PUT /api/chefz/accounts/{accountId}/status
Content-Type: application/json
```

```json
{ "status": "Suspended", "rowVersion": "<accountRowVersion>", "reason": "Optional reason, at most 500 trimmed characters" }
```

Accepted status-action strings are case sensitive: `Suspended`, `Retired`, `Archived`, `Active`. Active restores Assigned if an open rider link exists, otherwise Available, and clears the status reason. Status changes retain the rider link and its history. An informational sentence in the action should explain that returning the account is a separate operation. A manual status does not end assignment days or stop FullTime billing by itself.

The `dashboardStatus` field (`active`, `Block By CHEFZ`, `The supervisor suspended`) remains workbook metadata. Editing it no longer changes lifecycle status; do not use it for lifecycle filters or badges.

| Operation | Correct token |
| --- | --- |
| Lifecycle status PUT | `ChefzAccountResponse.accountRowVersion` sent as request `rowVersion` |
| Chefz configuration PUT | `ChefzAccountResponse.rowVersion` (Chefz details token) |
| Base account PUT | Base account `rowVersion` |
| Return an account | Current assignment's `rowVersion` |
| Settings/statistics update/delete | Latest token from that feature's GET |

On stale-token 409, reload before retrying; do not silently resubmit an old decision. Missing/null required body fields may fail model binding with 400. Use returned error codes/details for classification. After every successful write, invalidate/refetch account detail, base account/current assignment, account list and live summaries. Refetch GETs are also authoritative for `isOperationallyBlocked` and `operationalBlockReason`; some write responses do not recompute that annotation.

## 6. Two Chefz accounts on one rider

Use the existing assignment endpoint; there is no new second-account endpoint or override flag.

```http
POST /api/platform-accounts/{accountId}/assign
Content-Type: application/json
```

```json
{
  "actualRiderProfileId": "<rider-profile-GUID>",
  "effectiveFrom": "2026-10-15",
  "reason": "Account handover",
  "wasBackdated": false,
  "backdatedReason": null
}
```

Use the actual rider profile GUID, not employee ID, registered owner ID or external account ID. The selected account must be Available and not already linked. The rider must be eligible. Backdated assignments require a reason when `wasBackdated` is true.

For Chefz, a rider with one existing Chefz account can take a second; a third is rejected. Both active accounts must belong to the Chefz family. The generic one-account policy and other platforms' dedicated workflows are unchanged. Do not globally change the frontend's account limit to two or enable a generic Chefz/other-platform pair. Existing separate Jahez rules remain owned by Jahez.

The one-Salary-account restriction remains: allowed payment pairs are PayPerOrder + PayPerOrder or PayPerOrder + Salary. Chefz `Freelancer`/`FullTime` type is independent of this payment model; do not map FullTime to Salary automatically.

Respect operational/debt blocks. `rider.jahez_debt_block` is a business conflict; show the returned reason, not a generic retry loop. The admin lifecycle control cannot bypass this restriction when restoring Active. There is no frontend override flag.

Return one account using:

```http
POST /api/platform-accounts/{accountId}/release
```

```json
{ "effectiveTo": "2026-10-15", "status": "Ended", "reason": "Returned", "rowVersion": "<current-assignment-rowVersion>" }
```

`status` is Ended or Cancelled. End date must be on/after the assignment start. Returning one account leaves the other account linked and frees only the returned slot. It makes that account Available unless a manual Suspended/Retired/Archived choice is being preserved.

For assignment-limit 409, inspect the root `assignmentLimit` extension: `maximumActiveAccounts`, `maximumSalaryAccounts`, `activeAccounts[]`, `allowedPaymentModels[]`. Chefz third-account failures report maximum 2; generic/mixed failures retain maximum 1. Show the current accounts and return/change-payment actions allowed by the user's permissions. Do not infer capacity from only the currently displayed page.

## 7. Daily-performance upload and account breakdown

POST `/api/chefz/performance/import` as multipart FormData containing `reportDate` and `file`. Use a `.xlsx` file up to 10 MiB; the HTTP body ceiling is 11 MiB. Do not set Content-Type manually for FormData, because the browser must include its boundary.

The selected report date applies to the file. It must be a valid non-future Riyadh date. One worksheet must contain these headers: `Id Number`, `Total Valid Offers`, `Accepted Offers`, `Declined Offers`, `Missed Offers`, `Acceptance Rate`. Maximum 10000 data rows / 200 columns. IDs remain strings; Arabic digits are normalized by the backend. Matching is report ID -> Chefz account -> the account's actual dated rider assignment, never the registered owner as fallback.

The existing upload counters/issues remain, with a new breakdown:

```text
ChefzImportResponse
  importId, reportDate, importedRows, skippedRows, issues[]
  riders[]
    riderProfileId, riderName
    accounts[]
      id, accountId, externalAccountId, assignmentId, riderProfileId, riderName
      reportDate, reportIdNumber
      totalValidOffers, acceptedOffers, declinedOffers, missedOffers, acceptanceRate
```

Render **one section per rider and one visible row per account**. Include both account identifier and spreadsheet report ID. Totals can be additional information; they must not replace account rows. Two accounts on one rider remain two rows. Rows that were unchanged/skipped are also included in `riders[].accounts[]` on successful replay, so imported/skipped counters are not the rendered row count.

HTTP 200 with `issues.length > 0` is a failed/invalid import result, not success: show row number, ID and message. Such a batch does not partially write valid rows. `riders` is empty for invalid batches. There is no separate performance preview endpoint.

Reuploading daily data corrects only the corresponding account/date row and retains its identity. Exact replay normally reports zero imported and the applicable skipped rows. Reuploading an older file after a later correction can intentionally restore its figures: the backend rechecks current rows, rather than treating every old file hash as an immutable no-op. Keep selected-file/date context visible and refresh stored rows after upload.

GET `/api/chefz/performance?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&pageSize=50` returns stored rows, now with rider name and external account ID. Optional `accountId` and `riderId` combine with AND. It uses `ChefzPage`, not a rider-group envelope.

## 8. Rider/account performance report

GET `/api/chefz/reports/riders?year=2026&month=9&half=2&halves=1&riderId=<profileId>`. Supply accountId, riderId, or both; when both are supplied, they combine with AND. `half=1` is days 1–15; half 2 is days 16–month end. `halves` is 1–120, ending at the selected half.

Keep the existing `halves`, `selectedSummary`, `allTimeSummary`, combined `daily`, and `messages`. New `accounts[]` entries contain:

```text
accountId, externalAccountId, riderProfileId, riderName
summary: ChefzReportSummary for this account/rider within the requested period
daily[]: ChefzPerformanceResponse source metrics for this account/rider
```

Display each account's selected-period summary and daily rows before or alongside combined totals. An account used by different riders over the period has separate account/rider entries. Stable group key: account ID + rider profile ID; stable daily key: performance row ID. The nested daily data uses `reportDate`; the older combined daily rating data uses `date` and a different shape.

Combined acceptance is weighted from counts, not an average of per-account percentages. Missing dates are not fabricated as zero performance. No-data rates/averages/ratings may be null and have explicit messages. Account breakdown entries cover recorded data; the existing top-level half/messages structure remains the missing-data indicator. Management reports count actual riders within each sponsor, so two accounts do not turn one rider into two people. Account counts and rider counts are different metrics.

## 9. Money-sheet preview, save and account breakdown

POST FormData containing only `file` to `/api/chefz/settlements/orders/preview` or `/import`. The file's Date column determines cycles; do not send or impose a different month/half. XLSX limit 10 MiB, body ceiling 11 MiB, maximum 50000 data rows / 200 columns.

Required columns: `Date`, `Driver ID`, `Driver Delivery Fees`, `Deduction Amount`, `Driver Compensate`, `Driver Tip`. Optional: `Chef Order ID`, `Bonus Amount`. Repeated whitespace in headers is normalized. Numeric financial cells are limited to two decimal places; blank monetary cells become zero. Signed deduction inputs are normalized to an absolute deduction. Formula cells in consumed order fields are rejected. If order IDs are present, duplicate Driver ID/order ID pairs are reported.

Driver ID identifies the account via `reportIdNumber`; the assignment on each order date identifies the payable rider. Import dates can therefore split one account across historical riders, and one rider can receive rows from both accounts.

The money response already has the required structure:

```text
importId, isPreview, alreadyImported, canSave, sourceRows
netEarnings, companyAmount, riderAmount, issues[]
riders[] (one group per rider AND half-month cycle)
  riderProfileId, riderName, periodFrom, periodTo, amounts, sourceRows
  accounts[] (one row per account assignment/cycle)
    id, accountId, driverId, assignmentId, riderProfileId, riderName, accountType
    periodFrom, periodTo, chargedFrom, chargedTo, assignedDays, sourceRows
    deliveryFees, vatAmount, deliveryFeesAfterVat, tips, compensation, bonuses, deductions
    netEarnings, companyAmount, riderAmount
```

Render each rider/cycle section with **every account row visible**, including the account's company amount and rider amount. Combined rider totals are additional rows/cards. Do not merge all accounts into a single summary row. A rider can appear in multiple half-month groups. Use rider profile ID + periodFrom as the group key; use account ID + assignment ID + periodFrom as the preview row key, since preview record IDs are empty GUIDs and one account may have more than one historical assignment.

### Fees and amounts

- The existing rule retains 85% of delivery fees after the 15% deduction labelled VAT in this module. It is not a division by 1.15. Use returned `vatAmount` and `deliveryFeesAfterVat`.
- `netEarnings = deliveryFeesAfterVat + tips + compensation + bonuses - deductions`.
- Freelancer: 15% company commission on net earnings, reconciled with the existing rider/cycle rounding rules.
- FullTime: **25 SAR per account per assigned calendar day**, using the inclusive intersection of assignment and cycle dates. Two FullTime accounts held on the same day incur 50 SAR for that day. Charge days are not limited to days with rows/orders in the sheet.
- `riderAmount = netEarnings - companyAmount`. Negative balances are valid; display their sign. Do not clamp them to zero or label every signed balance as money paid out.
- VAT and Freelancer commission are reconciled at rider/cycle level, with any cent adjustment allocated deterministically to an account row. Display returned account amounts; do not independently round every child and replace server totals.

Illustration for the completed second half of September: account A held Sep 16–30 has 15 fee days (375 SAR); account B held Sep 20–30 has 11 fee days (275 SAR). For two FullTime accounts the company total is 650 SAR, not 375 and not a single 25 SAR daily rider fee. The complete money example shows both accounts, their own source amounts and deductions, and the signed combined balance.

### Save/retry behavior

Preview first. Enable save only when `canSave` is true and issues are empty; submit the same file bytes to the import route. Preview writes nothing. A future charged-through date prevents saving while preview remains possible; do not override the backend's decision.

On success retain the returned import ID and load `/settlements/orders/imports/{importId}` for the saved view. Exact same-file replay returns `alreadyImported=true` and the existing batch; do not present it as a second financial posting. Renaming the same bytes does not change its hash. Resaving/rebuilding an Excel file can change its hash; existing assignment/period records still prevent duplicate settlements. Changed reimports that conflict are returned as issues and are not partial financial updates. There is no money-import overwrite endpoint.

Show all `issues` even on HTTP 200. On timeout, read/refetch before retrying the same bytes. Chefz does not require Jahez's Idempotency-Key header. Do not combine money-sheet figures with a wallet settlement for the same assignment/cycle: the shared settlement key protects that overlap.

## 10. Wallet, ancillary screens and identity rules

Wallet preview/save payload:

```json
{ "assignmentId": "<assignment-GUID>", "year": 2026, "month": 9, "half": 2, "startWalletAmount": 0, "endWalletAmount": 100 }
```

Wallet delta is end minus start; nonnegative amounts with at most two decimals are required and end must be at least start. FullTime fees remain per account/day, so save each of a rider's two assignments separately. The exact same saved assignment/period/wallet request returns the same settlement; a changed request conflicts. Future charged days cannot be saved. GET `/settlements` accepts optional accountId/riderId plus paging; inspect `source` (`Wallet` or `Orders`) and `importId` when displaying rows. Its `grossEarnings` means wallet delta for Wallet, but net after the imported fee/addition/deduction rules for Orders.

Chefz configuration PUT requires `accountType` (Freelancer or FullTime), and accepts reportIdNumber, details rowVersion, vehicleType (Car/Motorcycle), and dashboardStatus. New/unconfigured details need no old details token. Existing details require it. Prefill and send the existing reportIdNumber on normal edits: omitted/blank mapping recalculates from owner iqama, then external ID. An Unconfigured account cannot be used for a successful financial import until its mapping/type is supplied.

Performance settings use GET/PUT with the current token and the complete settings request from the TypeScript file. The backend validates descending A/B/C thresholds and acceptance ranges; keep null/no-data ratings distinct from real zeros.

Sponsor statistics are the workbook's editable table, not the live account summary. GET/POST/PUT use the sponsor route and current feature token; DELETE takes URL-encoded `rowVersion` in the query string and returns 204. Preserve nullable `workingWithoutPerformance` instead of converting it to zero.

Management reporting requires a non-future reportDate and optionally sponsorId. It reports the previous day and that day's current half-month cycle. Reminder badges refer to the registered owner: OutsideSponsorship or FinalExit, with FinalExit taking precedence. They are in-system computed badges, not external notifications.

Password PUT payload is `{password,reason}`; GET returns a JSON string. Use existing reveal/rotate permissions, do not persist revealed values in table/cache/logs, and handle 204 without JSON parsing. Password rotation has no idempotency receipt: refetch state before repeating a timed-out rotation.

## 11. Error and UI-state handling

Expected errors use Problem Details with `status`, `detail`, root `errorCode`, `correlationId`, optional `field`, and optional root `assignmentLimit`. Bind field errors to the form. Preserve the correlation ID for support.

| Outcome | UI behavior |
| --- | --- |
| 400 / binding validation | Show required/invalid field or file input; do not retry unchanged input |
| 401 | Existing authentication/refresh flow |
| 403 | Access-denied state; permission hiding is supplementary to server authorization |
| 404 | Reload/leave missing account/import; preserve unsaved input where useful |
| 409 `Chefz.Conflict` | Refresh stale records; require a fresh decision/token |
| 409 `platform.rider_account_limit_reached` | Show maximum and active-account details; no generic retry loop |
| 409 `platform.rider_salary_account_limit_reached` | Explain one-Salary restriction and use allowedPaymentModels metadata when provided |
| 409 `rider.jahez_debt_block` | Display the operational block reason; do not offer a bypass |
| 413 / 415 | File/body too large or wrong media type |
| 429 / transient 5xx / network timeout | Keep selection/context, respect retry guidance and refetch before replaying writes |
| HTTP 200 + import issues | Row-level import failure/conflict; show issues and do not announce success |

Use existing loading, empty, saving, saved, blocked and error patterns. Disable duplicate submission while an action is in flight. Keep account identifiers visible in confirmation/result states. In Arabic RTL views, isolate GUIDs, report IDs and numeric values for readability; keep money signs and date strings intact.

## 12. Acceptance checks for frontend integration

1. Load global and sponsor counts, paginate, and verify totals do not shrink to the visible page. An empty page still shows global totals.
2. Verify owner and actual rider are displayed separately. One rider on two account rows must not lose the second account in local state.
3. Suspend/retire/archive an assigned account; verify its rider is retained. Restore Active and check Assigned; return it and check manual-status preservation or Available.
4. Take a second Chefz account on the same eligible rider; verify both are Assigned. A third must show maximum 2 and both active accounts. Generic/mixed-platform behavior must remain unchanged.
5. Verify the one-Salary restriction and operational-block state are still enforced. Returning one account must leave the other linked.
6. Upload two daily account rows for one rider: show two account rows and one rider. Correct only account B and verify A is unchanged. Replay and verify skipped rows remain visible in the response.
7. In rider reports, show each account's summary/daily rows, plus combined totals and weighted acceptance. Preserve separate historical rider/account entries.
8. Preview/save two-account money data, keeping every account's amounts, dates, fee days and deductions visible. Verify 25 SAR per account/day, signed negative balances, and totals matching the server.
9. Replay the same money file and confirm the existing import is shown. Changed conflicting money data must show issues without another posting.
10. Verify stale account/details/assignment tokens are not interchanged. Refetch all relevant caches after writes.
11. Verify missing performance data stays null/unavailable with messages, and that registered-owner reminders never identify the payable rider by mistake.
12. Complete these HTTP checks against the **deployed updated API**. Hosted database readiness alone is not a frontend acceptance result.

Backend validation evidence: the final solution build passed with zero warnings/errors; 71 Chefz workflow checks passed, including two-account daily/money/wallet coverage. Separate regression checks passed for 13 Ninja cases and the four generic one-account policy cases. Local SQL runtime/concurrency tests remain unavailable due to LocalDB startup; the hosted read-only checks verify schema/index readiness without creating financial or assignment test data.
