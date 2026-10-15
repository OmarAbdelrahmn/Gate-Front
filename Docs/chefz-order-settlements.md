# Chefz bulk order settlements — التصفيات من ملف الطلبات

For the complete screen flow, response examples, state handling, Arabic labels, and acceptance checks, use [the detailed frontend handoff](chefz-order-settlements-frontend-handoff.md). The hosted database migration was applied and independently verified on 12 October 2026; API deployment is still pending. See [the deployment record](chefz-order-settlement-hosted-deployment-20261012.md).

Implemented 12 October 2026 in the .NET backend. This checkout contains the backend only. The application migration is applied to hosted `db67927`; deploy the updated API before connecting a frontend. The supplied workbook is a sample for read-only parser verification; it has not been imported into the company database.

## Workflow and endpoints

Add **رفع ملف الطلبات للتصفية** to the existing Chefz settlement screen. Send an Excel file, preview all cycles/riders, then save the same file. No manual wallet amounts, report date, year, month, half, or assignment ID are required.

| Method and route | Input | Permission | Behavior |
| --- | --- | --- | --- |
| `POST /api/chefz/settlements/orders/preview` | multipart `file` | `chefz.read` | Calculates results without saving. |
| `POST /api/chefz/settlements/orders/import` | multipart `file` | `chefz.settlements.create` | Revalidates and saves the whole batch atomically if there are no issues. |
| `GET /api/chefz/settlements/orders/imports/{importId}` | saved import GUID | `chefz.read` | Returns saved amounts and attribution snapshots. |

Both upload actions return `ChefzOrderSettlementImportResponse` (see TypeScript contracts). Business row/matching/conflict issues appear in `issues` with HTTP 200, `importId: null`, and no saved records. File metadata and authorization failures use existing Problem Details responses. A concurrent database conflict returns HTTP 409.

`canSave` is true only on a valid, unsaved preview with no issues. A successful import has a non-null `importId`, `isPreview: false`, and no issues. Reuploading identical file bytes returns the original import and amounts with `alreadyImported: true`, even if renamed or account details later changed. Do not treat a response with `importId: null` as saved. Repreview after editing the file or fixing assignments/account types. A preview does not reserve amounts or assignments; save always recalculates.

Limits: 10 MB file, 50,000 rows, 200 columns, 40 MB uncompressed. Exactly one worksheet must contain required headers in its first row. Header matching ignores case and repeated whitespace, including the extra spaces in `Driver   Delivery Fees`.

## Date cycles and actual riders

Each row's `Date` determines its month and half-month cycle: days 1–15, or day 16 through that month's final calendar day. Different months/cycles in one file produce separate outputs automatically. Leap years are supported. Rows are never grouped by upload time. Dates may be native Excel dates or text in `yyyy-MM-dd`, `yyyy/MM/dd`, `dd/MM/yyyy`, or `d/M/yyyy` format. Excel date-times use their calendar date.

`Driver ID` matches account details' `reportIdNumber`; this string key preserves leading zeros. Numeric IDs and Arabic digits are normalized. Configure the account type (`Freelancer`/`FullTime`) and report key first. Workbook names/team labels do not determine identity or account type.

For each order, exactly one Active or Ended rider assignment must cover its date, using inclusive `effectiveFrom` / `effectiveTo`. The payable rider/name come from that assignment's `RiderProfile` and `Employee`, never the registered account owner or workbook name. Missing/overlapping assignments block the whole save. A transfer within a cycle divides orders between the appropriate actual riders. Several accounts/assignments for one rider are consolidated in one rider/cycle row with expandable account details.

## Money rules

| Column | Treatment |
| --- | --- |
| `Driver Delivery Fees` | Sum per actual rider/cycle, then retain 85%. |
| `Driver Tip` | Add directly. |
| `Driver Compensate` | Add directly. |
| `Bonus Amount` | Add directly, as confirmed by the user. Optional column; absent means zero. |
| `Deduction Amount` | Subtract its magnitude; positive and negative deduction notation both represent a deduction. |

`Date`, `Driver ID`, and fees/tips/compensation/deduction headers are required. Blank financial cells mean zero. Values support at most two decimal places and absolute values up to SAR 1 billion per source cell. Negative fee/tip/compensation/bonus values represent reversals. Formulas in processed fields are rejected; upload original values. `Chef Order ID` is optional; repeated nonblank IDs for the same Driver ID are rejected. Blank order IDs are allowed for adjustment rows. `sourceRows` counts financial source rows, not necessarily completed orders.

```text
deliveryFeesAfterVat = round(sum(deliveryFees) × 0.85, 2)
vatAmount = sum(deliveryFees) − deliveryFeesAfterVat
netEarnings = deliveryFeesAfterVat + tips + compensation + bonuses − deductions

Freelancer companyAmount = round(netEarnings × 0.15, 2)
FullTime companyAmount = assignedCalendarDays × SAR 25
riderAmount = netEarnings − companyAmount
```

The specified VAT rule is a 15% subtraction from delivery fees. Tips, compensation, and bonuses are not reduced by VAT. Round to two decimals away from zero. VAT is reconciled once per rider/cycle after combining assignments/accounts; freelancer commission is reconciled across that rider's freelancer accounts. Cent residuals are allocated deterministically to the largest contributing account detail. Details exactly match rider/import totals.

Full-time days are inclusive calendar days where the account assignment intersects the cycle, including days without orders. Overlapping assignment dates during charged full-time days block saving even if no source order falls on the overlap, preventing a day being charged twice. The charge applies per full-time account assignment, preserving the existing wallet-settlement rule. An assignment contributes only to cycles represented by its source rows. A partial file does not establish that every order is present; upload the complete cycle report before saving. For mixed account types, compute each type's share on its account details and add results to the rider row.

Negative net/rider amounts are kept, not clamped to zero. A negative rider amount means a balance due rather than a payout. The freelancer percentage also preserves the sign of the net total. Saving records a settlement; it does not execute a bank transfer.

## Preview and saving

Group the table by cycle and display **المندوب الفعلي**, **رسوم التوصيل**, **خصم الضريبة**, **الإكراميات**, **التعويض**, **البونص**, **الخصومات**, **صافي الدخل**, **للمندوب**, and **للشركة**. Expand a rider to show account type, Driver ID, charged dates, and full-time assigned days. The response contains aggregate `netEarnings`, `companyAmount`, and `riderAmount` for a totals footer. Keep signs/numbers visible in RTL. Show row-specific issues beside the upload and disable save unless `canSave` is true.

Assignments whose charged end date is after today's Riyadh date can be previewed but cannot be saved. Manual wallet and order settlements share the unique key `(assignmentId, periodFrom)`, so an assignment/cycle cannot be paid twice through different methods. A changed file colliding with any existing cycle blocks the whole batch. Saved amounts are append-only snapshots; account-detail changes do not rewrite them.

`GET /api/chefz/settlements` includes order settlements alongside wallet settlements. Its response adds `source` (`Wallet`/`Orders`), `importId`, `sourceRows`, `deliveryFees`, `vatAmount`, `tips`, `compensation`, `bonuses`, and `deductions`. On order settlements `grossEarnings` is the computed net amount; legacy wallet start/end fields are zero. Use `source` for the appropriate breakdown. Existing wallet inputs/calculations remain supported.

## Deployment

`AddChefzOrderSettlementImports` was applied to the hosted application DbContext on 12 October 2026 after the existing Chefz migrations. It added `chefz.OrderSettlementImports` and order-source/breakdown columns on `chefz.WalletSettlements`, preserving existing wallet values and retaining `source = Wallet` for legacy rows. The amount constraint, assignment/cycle uniqueness, and import foreign key were verified. No new permission or Identity migration was required.

Targeted idempotent SQL: `database/scripts/chefz-order-settlements.sql`, applied and verified on hosted `db67927`. The sample was not imported as live financial data. SQL Server workflow tests use disposable databases when `CHEFZ_SQL_TESTS=1`; local execution currently fails because the installed LocalDB engine cannot start. This local limitation is separate from the successful hosted schema verification.
