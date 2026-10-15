# Frontend handoff: Chefz bulk order settlements — التصفيات

**Date:** 12 October 2026. **Audience:** the Logistics ERP frontend developer. **Status:** backend source and contracts are prepared. **The hosted database migration was applied and independently verified on 12 October 2026 at 12:55 Riyadh time. The new API has not been published by this task.** The frontend screen described here is implementation work. See [the hosted deployment record](chefz-order-settlement-hosted-deployment-20261012.md).

Use this document together with [TypeScript contracts](chefz-new-endpoints-contracts.ts) and [backend rules/deployment notes](chefz-order-settlements.md). The example amounts and people below are synthetic. The supplied Excel workbook is a format reference, not real financial data to seed or import.

## 1. What to add

Extend the existing **شيفز → التصفيات** screen, suggested existing route `/chefz/settlements`. Add **تصفية من ملف الطلبات** beside the existing manual wallet settlement action. Open a full-width page/panel with an upload area, a preview grouped by cycle, issues, and a save action. Keep the existing manual settlement flow available.

The operator uploads one `.xlsx` file. The backend determines all months and cycles from each order's Date, matches each Driver ID to a configured Chefz account, identifies the actual rider assigned on that date, calculates the rider/company amounts, and returns the result. The operator reviews the preview and saves the same file.

No year/month/half, report-date, account-type, rider-selection, wallet-start, or wallet-end input is needed for the bulk flow. A cycle tab/filter can change the visible results locally; saving submits the whole uploaded file, including every cycle. Do not present a visible-cycle filter as a partial-save option.

## 2. Endpoints and authorization

All paths are relative to the existing authenticated API client. Reuse the application's current authentication, session expiry, error handling, and permission checks.

| Action | Method/path | Permission | Body/result |
| --- | --- | --- | --- |
| Preview | `POST /api/chefz/settlements/orders/preview` | `chefz.read` | Multipart field `file`; returns `ChefzOrderSettlementImportResponse`. |
| Save | `POST /api/chefz/settlements/orders/import` | `chefz.settlements.create` | Multipart field `file`; revalidates and atomically saves the whole valid batch. |
| Reopen a saved batch | `GET /api/chefz/settlements/orders/imports/{importId}` | `chefz.read` | Returns the saved rider/cycle results and account breakdowns. |
| Existing history | `GET /api/chefz/settlements?accountId={optionalGuid}&riderId={optionalGuid}&page=1&pageSize=50` | `chefz.read` | Returns individual assignment/cycle records, including wallet and order sources. |

`pageSize` for existing history is 1–100. Bulk preview/saved-batch results are not paginated. There is no new batch-list endpoint, server-side search, cycle-selective import, download/export, payment execution, edit-saved-batch, or delete-batch endpoint. Do not invent requests for these actions. Display filters/search on an already returned bulk result may run locally.

Users with `chefz.read` may upload for preview and view results. Only users with `chefz.settlements.create` may save. Backend authorization is still authoritative. No new permission definition or Identity migration is needed.

Send `FormData`, not JSON or base64. Let the browser set the multipart boundary. Remove any default JSON Content-Type in the existing API client for these requests. Send no extra `reportDate`, `year`, `month`, `half`, or `assignmentId`.

```ts
import {
  chefzPaths,
  type ChefzOrderSettlementImportResponse,
  type ChefzProblemDetails,
} from './chefz-new-endpoints-contracts';

// Adapt this injected function to the existing authenticated client.
// It must preserve FormData and handle existing session/token behavior.
type AuthenticatedFetch = (path: string, init: RequestInit) => Promise<Response>;

export async function uploadOrderSettlements(
  send: AuthenticatedFetch,
  file: File,
  mode: 'preview' | 'save',
  signal?: AbortSignal,
): Promise<ChefzOrderSettlementImportResponse> {
  const body = new FormData();
  body.append('file', file, file.name);
  const path = mode === 'preview'
    ? chefzPaths.orderSettlementPreview
    : chefzPaths.orderSettlementImport;
  const response = await send(path, { method: 'POST', body, signal });
  const payload = await response.json();
  if (!response.ok) {
    const problem = payload as ChefzProblemDetails;
    throw Object.assign(new Error(problem.detail ?? problem.title ?? 'تعذر معالجة الملف.'), {
      status: response.status,
      problem,
    });
  }
  return payload as ChefzOrderSettlementImportResponse;
}
```

This sample adapter is illustrative. The existing HTTP client may already unwrap bodies or normalize errors; preserve that behavior rather than adding a second token/session mechanism.

## 3. File validation and prerequisites

Accept `.xlsx` only, with a nonzero size up to **10 × 1024 × 1024 bytes**. Client checks improve feedback; the backend validates the workbook content. Do not require an exact MIME type, since browsers sometimes supply an empty or generic type.

The backend also limits processing to 50,000 data rows, 200 columns, and 40 MB uncompressed. The multipart request limit is 11 MB to accommodate file overhead. Exactly one worksheet must contain the required headers on row 1. Header matching ignores case and repeated whitespace; `Driver   Delivery Fees` is valid.

| Excel header | Required? | Meaning |
| --- | --- | --- |
| `Date` | Yes | Order's calendar date; determines the cycle and actual assignment. |
| `Driver ID` | Yes | String matching key for the Chefz account's `reportIdNumber`. |
| `Driver Delivery Fees` | Yes | Delivery earnings before the requested 15% reduction. |
| `Driver Tip` | Yes | Added directly. |
| `Driver Compensate` | Yes | Added directly. |
| `Deduction Amount` | Yes | Its magnitude is subtracted. |
| `Bonus Amount` | No | Added directly; missing column means zero. |
| `Chef Order ID` | No | Duplicate nonblank IDs for the same Driver ID block processing. |

Other workbook columns do not determine the payout or identity. Blank financial cells are zero. Negative fee/tip/compensation/bonus values are reversals. Positive or negative deduction notation represents a deduction. Values may have at most two decimal places and an absolute value up to SAR 1 billion per processed financial cell. Formulas in processed fields are rejected. Blank order IDs are permitted for adjustment rows.

Supported Date values: native Excel dates/date-times or text `yyyy-MM-dd`, `yyyy/MM/dd`, `dd/MM/yyyy`, or `d/M/yyyy`. The calendar date is used, without shifting it through the browser timezone. Treat returned `YYYY-MM-DD` values as date-only strings, not UTC instants.

Before import, configure the account's `accountType` and `reportIdNumber` using the existing account-details flow. The sheet's Driver ID may differ from `externalAccountId`. Unknown/unconfigured mappings block saving. Reuse existing account-edit and assignment screens for corrections; the upload screen must not guess account types or create employees/accounts from workbook names.

## 4. Cycle and rider attribution

For every source row:

1. Read its Date and determine that calendar month.
2. Days 1–15 form cycle 1; day 16 through month end form cycle 2.
3. Match Driver ID to the configured Chefz account.
4. Find exactly one Active or Ended assignment covering the order date, including both effective boundary dates.
5. Attribute the money to that assignment's actual `riderProfileId`, using the employee name returned by the backend.

An account-owner name or sheet Driver Name is not the payment recipient. If an account changes riders mid-cycle, each rider receives the orders belonging to their dates. Several accounts/assignments for the same rider are combined into one rider/cycle row. The nested `accounts` array retains the calculation for each assignment/cycle; it can contain several rows for the same account if that rider used it in distinct assignment periods.

For example, one file containing 15 September, 16 September, 30 September, 1 October, 15 October, and 16 October yields four separate cycles. The upload date has no effect. Leap-year month ends are supported.

Use `(riderProfileId, periodFrom)` as the preview rider-row key. Use `(assignmentId, periodFrom)` as the nested detail key. Preview detail `id` is the empty GUID, so it cannot be used as a unique React/table key. Saved detail IDs are real settlement GUIDs. Use `riderProfileId` for identity; names are display text.

## 5. Calculation and display rules

The backend owns all financial calculations. Render its results; do not recalculate payouts from Excel in the browser.

```text
deliveryFeesAfterVat = round(total delivery fees for this rider/cycle × 0.85, 2)
vatAmount = deliveryFees − deliveryFeesAfterVat
netEarnings = deliveryFeesAfterVat + tips + compensation + bonuses − deductions

Freelancer: companyAmount = round(netEarnings × 0.15, 2)
FullTime:   companyAmount = assignedDays × 25 SAR
riderAmount = netEarnings − companyAmount
```

The VAT rule is the user's requested 15% subtraction from delivery fees. It does not reduce tips, compensation, or bonuses. Round to two decimals away from zero. Combining accounts/assignments may require a cent adjustment; the backend reconciles VAT once per rider/cycle and commission across that rider's freelancer accounts. Individual breakdown values can therefore include a cent residual; display them as returned.

Full-time `assignedDays` counts inclusive calendar days where the assignment intersects the cycle, including days without orders. It applies per full-time account assignment. The assignment contributes only to cycles represented by its uploaded source rows. Overlapping full-time assignment days block saving, even when the overlap has no source orders. If a rider uses both freelancer and full-time accounts, the backend calculates each account type's company share and returns their combined rider amount.

A full-time assignment from the 5th through the 15th incurs 11 × 25 = SAR 275. A complete first-cycle assignment incurs 15 × 25 = SAR 375. A second cycle in a 31-day month contains 16 days, so a full-cycle assignment incurs SAR 400.

Synthetic monetary example:

| Item | SAR |
| --- | ---: |
| Summed delivery fees | 1,000.00 |
| Delivery fees after reduction | 850.00 |
| Tips | 20.00 |
| Compensation | 30.00 |
| Bonuses | 50.00 |
| Deductions | 100.00 |
| Net earnings | 850.00 |
| Freelancer company share | 127.50 |
| Freelancer rider share | 722.50 |
| Full-time company share, if assigned for 15 days | 375.00 |
| Full-time rider share in that alternative | 475.00 |

Negative net/company/rider values are preserved. A negative rider amount is a balance due, not a payout of zero. Do not use `Math.max(0, amount)` or remove minus signs. The freelancer percentage preserves the sign of net earnings. Saving records the settlement; it does not transfer money.

`sourceRows` is the number of financial report rows, including adjustments. Label it **عدد صفوف التقرير**, not **عدد الطلبات المكتملة**.

## 6. Response contracts

The full interfaces are exported in `chefz-new-endpoints-contracts.ts`:

| Interface | Purpose |
| --- | --- |
| `ChefzOrderSettlementImportResponse` | Batch status, all rider/cycle results, totals, issues. |
| `ChefzRiderCycleSettlement` | One actual rider in one cycle, with monetary totals and `accounts`. |
| `ChefzOrderSettlementResponse` | One account assignment in one cycle, including type and charged days. |
| `ChefzImportIssue` | Excel row, matching Driver ID, and Arabic message. |

Top-level status fields:

| Field | Frontend interpretation |
| --- | --- |
| `importId` | Null means this response has no saved batch. Non-null identifies an already saved batch. |
| `isPreview` | True for a preview action, including a preview of an already imported file. |
| `alreadyImported` | True when identical file bytes were previously saved; returned amounts are the original saved snapshots. |
| `canSave` | True only for a valid, unsaved preview. False on save responses and already-imported files. |
| `sourceRows` | Parsed source-row count. On a malformed file this is not a claim that all rows were valid. |
| `riders` | Results grouped by actual rider and cycle. May be empty for parsing/matching failures. |
| `netEarnings`, `companyAmount`, `riderAmount` | Aggregate totals across all returned riders/cycles. |
| `issues` | Validation and save blockers; examine even when HTTP status is 200. |

Every rider result contains `riderProfileId`, `riderName`, `periodFrom`, `periodTo`, `sourceRows`, `deliveryFees`, `vatAmount`, `deliveryFeesAfterVat`, `tips`, `compensation`, `bonuses`, `deductions`, `netEarnings`, `companyAmount`, `riderAmount`, and `accounts`.

Each account detail adds `id`, `accountId`, `driverId`, `assignmentId`, `accountType`, `chargedFrom`, `chargedTo`, and `assignedDays`, and also contains the rider/cycle identifiers and the same monetary fields. All currency values are JSON numbers in SAR. Account types are exactly `Freelancer` and `FullTime`. IDs are strings and dates are `YYYY-MM-DD`.

Synthetic valid preview (one freelancer account; all identifiers are illustrative):

```json
{
  "importId": null,
  "isPreview": true,
  "alreadyImported": false,
  "canSave": true,
  "sourceRows": 2,
  "riders": [
    {
      "riderProfileId": "11111111-1111-4111-8111-111111111111",
      "riderName": "مندوب تجريبي",
      "periodFrom": "2026-09-01",
      "periodTo": "2026-09-15",
      "sourceRows": 2,
      "deliveryFees": 1000,
      "vatAmount": 150,
      "deliveryFeesAfterVat": 850,
      "tips": 20,
      "compensation": 30,
      "bonuses": 50,
      "deductions": 100,
      "netEarnings": 850,
      "companyAmount": 127.5,
      "riderAmount": 722.5,
      "accounts": [
        {
          "id": "00000000-0000-0000-0000-000000000000",
          "accountId": "22222222-2222-4222-8222-222222222222",
          "driverId": "1234567890",
          "assignmentId": "33333333-3333-4333-8333-333333333333",
          "riderProfileId": "11111111-1111-4111-8111-111111111111",
          "riderName": "مندوب تجريبي",
          "accountType": "Freelancer",
          "periodFrom": "2026-09-01",
          "periodTo": "2026-09-15",
          "chargedFrom": "2026-09-01",
          "chargedTo": "2026-09-15",
          "assignedDays": 15,
          "sourceRows": 2,
          "deliveryFees": 1000,
          "vatAmount": 150,
          "deliveryFeesAfterVat": 850,
          "tips": 20,
          "compensation": 30,
          "bonuses": 50,
          "deductions": 100,
          "netEarnings": 850,
          "companyAmount": 127.5,
          "riderAmount": 722.5
        }
      ]
    }
  ],
  "netEarnings": 850,
  "companyAmount": 127.5,
  "riderAmount": 722.5,
  "issues": []
}
```

## 7. UI layout and Arabic labels

Use the existing ERP shell, typography, colors, permission-aware actions, Arabic-first RTL layout, and number formatting. Do not introduce a separate app shell.

| Element | Label/content |
| --- | --- |
| Page/panel title | **تصفية شيفز من ملف الطلبات** |
| Upload action | **اختيار ملف Excel** |
| Preview action | **معاينة التصفية** |
| Save action | **حفظ التصفيات** |
| Replace file | **تغيير الملف** |
| View saved result | **عرض التصفية المحفوظة** |
| Explanatory text | **تُحدد الفترة من تاريخ كل طلب: من 1 إلى 15، ومن 16 إلى نهاية الشهر. تُحسب المبالغ للمندوب المكلّف بالحساب بتاريخ الطلب.** |
| Completeness reminder | **ارفع التقرير الكامل للفترة قبل حفظ التصفيات.** |

Show selected filename and size, then loading state. After preview, show a cycle switcher using the returned `periodFrom`/`periodTo`; if multiple cycles are present, show the number of cycles in the file. Display a concise batch summary: rider/cycle-row count, distinct rider count if useful, source rows, net total, **إجمالي المبالغ للمندوبين**, and **إجمالي حصة الشركة**. Keep all-file totals distinct from a filtered cycle subtotal.

Rider table:

| Field | Arabic label |
| --- | --- |
| `riderName` | المندوب الفعلي |
| `periodFrom` / `periodTo` | فترة التصفية |
| `sourceRows` | عدد صفوف التقرير |
| `deliveryFees` | رسوم التوصيل |
| `vatAmount` | خصم الضريبة |
| `deliveryFeesAfterVat` | رسوم التوصيل بعد الضريبة |
| `tips` | الإكراميات |
| `compensation` | التعويض |
| `bonuses` | البونص |
| `deductions` | الخصومات |
| `netEarnings` | صافي الدخل |
| `riderAmount` | للمندوب |
| `companyAmount` | للشركة |

Prioritize **المندوب الفعلي**, cycle, **للمندوب**, and **للشركة** in the default view. The full earnings breakdown can be expandable to avoid an unreadable narrow table. The nested account view shows **رقم الحساب في التقرير** (`driverId`), account type (**فريلانسر** / **دوام كامل**), **فترة التكليف المحتسبة**, assigned days, and financial detail. The nested row represents an assignment, so repeated account IDs are allowed.

Use two decimals and SAR formatting, with numeric cells/IDs/date ranges in LTR subregions inside RTL. Do not timezone-shift date-only fields. Negative amounts need both a minus sign and an explanatory balance label; color alone is insufficient. Use accessible loading/status messages and visible keyboard focus. On small screens, keep rider/company totals visible and move detailed columns into labeled cards or an accessible scrollable area.

## 8. State transitions and save rules

| State | Behavior |
| --- | --- |
| Empty | File chooser visible; preview/save disabled. |
| File selected | Preview available after extension/size checks; save disabled. |
| Previewing | Disable duplicate preview/save requests; show progress/loading without an invented percent. |
| Valid unsaved preview | Render results; enable save only with create permission, `canSave`, empty issues, and the same selected file. |
| Preview with issues | Render issue list and any returned totals; save disabled. |
| Saving | Disable repeated clicks, retain original File object, send it to the import endpoint. |
| Saved | Render the save response, saved import ID/link, and saved status; save disabled. |
| Already imported | Render original saved result and **تم حفظ هذا الملف سابقاً**; save disabled. |
| Transport/problem failure | Keep selected file; show error and appropriate retry/repreview action. |

Changing the file invalidates the entire preview immediately. Abort or ignore older in-flight preview responses so a slow response for file A cannot enable saving file B. Local table filters do not invalidate preview, but they do not change the saved scope.

Preview does not persist a draft or reserve amounts. Saving recalculates from current account details and assignment history. The final saved result is authoritative; replace preview data with the save response. Do not imply that preview locks account type, name, assignment, or amounts.

Success requires a non-null `importId`, empty `issues`, and `isPreview: false` for the save action. HTTP 200 alone is insufficient. For a save retry with `alreadyImported: true`, use the returned saved result as success and do not create another request to pay it again. Saving is all-or-nothing: no separate per-rider save buttons or automatic retries for individual rows.

On save success, invalidate the existing Chefz settlement-history query. Optionally reopen `GET /settlements/orders/imports/{importId}` to render the saved snapshot, using the ID returned by the server. There is no need to retain the file for reopening a saved batch.

If a save request times out and the commit outcome is unknown, retrying the identical file is safe from duplicate settlement creation. The server returns the existing batch when the first save committed. If a simultaneous import returns 409, repreview/retry the identical file and interpret the returned status; do not change amounts or overwrite saved data.

## 9. Errors and blockers

For HTTP 200 responses, inspect `issues` first. Each issue contains `rowNumber`, `idNumber`, and `message`. `rowNumber` is the Excel row number, including row 1 for headers. A value of zero is a file/cycle-level issue; render **عام** instead of **صف 0**. `idNumber` refers to the uploaded Driver ID, not the actual rider's own residency number.

Show a readable issue table with **الصف**, **رقم الحساب في التقرير**, and **سبب التعذر**. Display the server's Arabic message as text. Do not render workbook or error content as raw HTML. A response may have proposal totals and cycle-level save blockers; do not label that response as saved.

| Condition | Expected frontend handling |
| --- | --- |
| Malformed workbook, missing/duplicate headers, invalid money/date/Driver ID | Show row/file issues; allow selecting a corrected file. |
| Unknown/unconfigured account or invalid type | Show the Driver ID; offer the existing account-settings route if the user may edit it. |
| Missing or overlapping assignment | Show date/Driver ID issue; link to existing account assignment history where available. Never substitute the owner. |
| Duplicate nonblank order ID for the same Driver ID | Show the duplicate issue; no automatic deduplication in the browser. |
| Future charged end date | Preview may show amounts; save remains blocked until the assigned days have ended in Riyadh time. |
| Existing settlement for assignment/cycle | Show conflict; do not overwrite or attempt another settlement method. |
| HTTP 400 | Existing Problem Details/file-metadata validation. |
| HTTP 401/403 | Reuse session-expiry/permission handling. |
| HTTP 409 | Save conflict, including concurrent imports; reload/repreview. |
| HTTP 413 | File/request exceeds server/proxy limit. |
| Network/server error | Keep file selection; show retry. Do not report success. |

The saved file-byte hash makes identical uploads idempotent, including renamed files. A resaved/edited workbook can have different bytes; if it overlaps an existing assignment/cycle, the whole save is blocked rather than replacing financial history. Manual wallet settlements and order imports share that same uniqueness rule.

## 10. Existing settlement history compatibility

`GET /api/chefz/settlements` still returns `ChefzPage<ChefzSettlementResponse>`, with `items`, `page`, and `pageSize`. Its existing filters are optional `accountId` and `riderId`. It does not accept date, source, or import filters. A client filter over one fetched page must not be presented as an exhaustive server-wide search.

The individual settlement response now contains:

| Field | Meaning |
| --- | --- |
| `source` | `Wallet` or `Orders`; badge **رصيد المحفظة** / **ملف الطلبات**. |
| `importId` | Saved order batch GUID, or null for manual wallet settlements. |
| `sourceRows` | Source report rows for this assignment/cycle. |
| `deliveryFees`, `vatAmount`, `tips`, `compensation`, `bonuses`, `deductions` | Financial source breakdown for order settlements. |
| `grossEarnings` | Wallet delta for `Wallet`; computed net earnings after VAT/additions/deductions for `Orders`. |
| `startWalletAmount`, `endWalletAmount` | Wallet values for `Wallet`; both zero for `Orders`. |

Do not derive `grossEarnings` from wallet values when `source === 'Orders'`; the returned zero wallet fields are not a zero-income claim. Use `grossEarnings`, `companyAmount`, and `riderAmount`. Open the saved batch using its `importId` to obtain names and rider-grouped details. Preserve existing wallet forms and requests.

## 11. Deployment handoff and verification

Hosted database status for this addition is **applied and verified**; API publication and frontend integration remain pending:

| Item | Status |
| --- | --- |
| Backend implementation and contracts | Prepared locally. |
| Migration `20261012093719_AddChefzOrderSettlementImports` | Applied to hosted `db67927` and independently verified on 12 October 2026. |
| `database/scripts/chefz-order-settlements.sql` | Applied; idempotent application-only script and backup/verification retained. |
| Hosted API publication | Not performed by this task. |
| Frontend page/integration | To implement using this handoff. |
| Sample financial records | Not imported. |

Remaining deployment sequence: publish the updated API, then enable the frontend feature. The application migration/targeted SQL has already been applied after `20261011191524_AddChefzWorkbookReportsAndStatistics`. It added `chefz.OrderSettlementImports`, 11 source/breakdown columns and an import foreign key on `chefz.WalletSettlements`, and extended the amount constraint. Existing settlement values were verified unchanged; the unique assignment/cycle index is preserved. No Identity change was needed. Rollback is blocked when order-import history exists, protecting saved financial history.

Verified locally: solution build with zero warnings/errors; 22 Chefz calculation/parser/workflow tests and 9 Chefz authorization tests passed. The supplied order sample was checked read-only. Disposable LocalDB workflow tests could not run because that engine fails to start. Separately, the authorized hosted schema migration succeeded: the migration record, import table, all 11 columns, trusted checks/foreign key, and three relevant indexes were verified, including an independent post-commit read. No import/settlement rows were added. End-to-end hosted import/concurrency behavior and HTTP availability still require API deployment and appropriate controlled tests.

Frontend acceptance checks:

1. Native Excel dates on days 15/16 and month-end produce the correct distinct cycles; multi-month files keep their cycles separate.
2. An account transfer within a cycle shows two actual riders, with no payout attributed automatically to the owner.
3. Fees are reduced once after combining them; tips, compensation, bonuses, and deductions match returned totals.
4. Freelancer/company amounts and full-time calendar-day fees render correctly; multiple account types can appear under one rider.
5. Replacing a file clears old preview/save eligibility, and stale responses cannot restore it.
6. HTTP 200 with issues never shows a saved success message. `rowNumber: 0` appears as a general issue.
7. Preview and saved rows use stable composite keys, not the preview's empty GUID.
8. Read-only users can preview but cannot save; unauthorized requests are handled by the shared auth client.
9. Identical-file reupload opens the original saved result; a different file colliding with a settled cycle is blocked.
10. Negative amounts, large numbers, Arabic names, source-row counts, and SAR signs remain legible on mobile and in RTL.
11. Save updates the history screen, renders the authoritative save response, and distinguishes order settlements from wallet settlements.
12. No sample data is posted to the live import endpoint during UI verification.
