# Jahez transferred rider debts — complete frontend handoff

Date: 21 October 2026. Scope: withdrawal with approved debt transfer, manager approval amounts, the indebted-rider list, full repayment, and treatment of withdrawal without settlement.

## 1. Delivery status and integration files

This document describes the current local backend source. The changes have not been confirmed deployed to the hosted API. Coordinate API deployment before enabling the new frontend actions. The main ERP frontend is outside this repository.

Use these companion files:

- [Complete TypeScript contracts](jahez-v2-api-contracts.ts).
- [Fetch client with existing authentication integration](jahez-v2-client.ts).
- [Arabic change contract](jahez-transferred-rider-debts-20261021.md).
- [Base Jahez V2 screens and workflows](jahez-v2-frontend-handoff-ar.md).
- [Enriched approval response contract](jahez-requests-enriched-response.md).

Keep the existing ERP Arabic RTL layout and authorization system. The screen names and Arabic copy below are frontend implementation requirements; the JSON field names and API routes are backend contracts.

## 2. Business rules

| Topic | Required behavior |
|---|---|
| Dashboard amount | Staff manually enters signed `net` from the Jahez dashboard. Label: «مديونية داشبورد جاهز المدخلة». |
| Commission | Backend calculates unpaid commission. Display its returned value; do not implement a second commission calculator. |
| Formula | `remaining = net + commission`. The new `amounts` object exposes the same split as `dashboardDebt`, `commission`, and `total`. |
| Transfer eligibility | `mode=2`, `transferToRider=true`, positive total, `fund=null`, and a separate manager approval. |
| Account withdrawal | Ends the original rider assignment. It does not move the debt onto a replacement rider. |
| Operational block | Transferred debt no longer blocks the rider on Keeta, Chefz or Ninja. This applies to pre-existing transferred debts after the backend update. |
| Independent suspensions | Preserve actual account/assignment suspension states and their reasons. Financial repayment does not reactivate independently suspended accounts. |
| Repayment | Actual collection of the entire selected debt or all transferred debts of one rider. No partial repayment or write-off in these endpoints. |
| Administrative debt/fees | Separate records; do not add them again to the transferred total or automatically populate `net` from them. |
| Cleared status | Means the covered transferred debts have been paid, not that every obligation in the ERP has been cleared. |

Default commission is currently SAR 15 per eligible day; approved percentage policies and previous settlements can change the result. Always trust preview/operation responses.

## 3. Authentication, transport and permissions

Base path: `/api/jahez/v2`.

Every request uses the ERP bearer token. JSON mutations use `Content-Type: application/json`. Every mutation described here, except preview, requires `Idempotency-Key` (nonblank, maximum 150 characters).

All permissions are evaluated in the Jahez client-platform scope; a permission on another platform is insufficient. Frontend checks control visibility, while the API remains authoritative.

| Action | Required permissions |
|---|---|
| Read preview, debt lists, approval lists/details | `jahez.read` |
| Create settlement-and-withdrawal draft | `jahez.settle` and `jahez.withdraw` |
| Submit transfer approval request | `jahez.requests.transfer.create` |
| Approve transfer and execute withdrawal | `jahez.requests.transfer.approve`, `jahez.settle`, `jahez.withdraw` |
| Reject transfer | `jahez.requests.transfer.approve` |
| Repay one/all transferred debts | `jahez.transferred-debt.repay` and `jahez.money.receive` |
| Read money movements | `jahez.cashbox.read` |

The operation/request mutation controllers also require `jahez.read`; include it alongside the listed action permissions. The requester cannot decide their own request. Hide their approve/reject actions; handle API 403 as authoritative. Reads do not grant mutation rights.

## 4. Endpoints

Paths in this table are relative to the base path.

| Method | Path | Response / use |
|---|---|---|
| POST | `/operations/preview` | `Preview`; calculate without saving. |
| POST | `/operations` | `Operation`; create Ready draft. |
| PUT | `/operations/{id}` | `Operation`; update Ready draft with `{ values, rowVersion }`. |
| GET | `/operations?page=1&pageSize=50` | `Page<Operation>`; operation history. |
| POST | `/requests` | `Approval`; submit manager request. |
| GET | `/requests?page=1&pageSize=50` | `Page<ApprovalRequestRow>`; enriched request list. |
| GET | `/requests/{id}` | `ApprovalDetails`; `{ request, decisions }`. |
| POST | `/requests/{id}/decision` | `Approval`; approve/reject. |
| GET | `/riders/transferred-debts?page=1&pageSize=50` | `Page<RiderTransferredDebtSummary>`; one row per rider with unpaid transferred debt. |
| GET | `/riders/{riderId}/transferred-debts?page=1&pageSize=50` | `Page<TransferredDebtRow>`; that rider's unpaid debts. |
| POST | `/riders/{riderId}/transferred-debts/repayment` | `RiderDebtRepaymentResponse`; repay all unpaid transferred debts of that rider. |
| GET | `/transferred-debts?page=1&pageSize=50` | `Page<TransferredDebtRow>`; historical debts including paid records. |
| POST | `/transferred-debts/{id}/repayment` | `TransferredDebt`; repay one complete debt. |
| GET | `/accounts/{accountId}?page=1&pageSize=50` | `AccountDetails`; original handovers, operations and related history. |
| POST | `/operations/{id}/execute` | Ordinary non-transfer settlement/withdrawal only; transfer approval executes its own operation. |

Success responses are HTTP 200 JSON objects, without an additional `data` wrapper.

All `Page<T>` responses above contain `items`, `page`, `pageSize`, with no `totalCount` or `hasNextPage`. Page starts at 1, page size is 1–100, and page is capped at 100000. Use Previous/Next; a short page ends navigation, and a full page can be followed by an empty page. Do not display an invented global row count or sum only loaded pages as the full rider balance. These endpoints do not accept search, sorting or date-filter parameters. Any local filter must be explicitly limited to the loaded page.

## 5. Screen: settlement, withdrawal and transfer

Entry: the assigned account's existing operation action. Resolve the **actual user rider** and the original `handoverId`; do not use the account owner as the debtor.

Required fields:

| Field | Frontend behavior |
|---|---|
| Rider/account | Read-only name, iqama and external account number. |
| Mode | «تصفية وسحب» for a new transfer (`mode=2`). |
| Dashboard amount | Signed SAR numeric input, maximum absolute value 1,000,000,000; prefer two decimal places. |
| Through date | `YYYY-MM-DD`; within the original session; for withdrawal equals the Riyadh calendar date of `effectiveAtUtc`. |
| Effective time | ISO instant with an explicit UTC offset; no future time, no time before session start. |
| Reason | Required non-whitespace, maximum 2000 characters. |
| Transfer toggle | «ترحيل كامل المستحق على المندوب». Enabled only for positive preview total and mode 2. |
| Fund/payment reference | Hidden/cleared when transferring; send `fund=null`, no actual payment reference. |

Debounce previews and ignore stale responses after inputs change. Clear old totals or mark them stale while preview is pending. Display `problems` if `commissionComplete=false`; prevent continuation until a complete preview is available. Server recalculates on save and approval.

Example request used for both preview and draft creation (replace IDs/dates; monetary results below are illustrative):

```json
{
  "handoverId": "019e0000-0000-7000-8000-000000000001",
  "mode": 2,
  "throughDate": "2026-10-21",
  "effectiveAtUtc": "2026-10-21T09:00:00+03:00",
  "net": 1000,
  "reason": "سحب الحساب وترحيل المستحق على المندوب",
  "fund": null,
  "purpose": 1,
  "transferToRider": true,
  "paymentReference": null
}
```

The preview returns `net`, `commission`, `remaining`, `direction`, `allowedFunds`, `withdrawsAccount`, `commissionComplete`, `problems`, `calculationJson`, and sponsor metadata. A valid transfer has `direction=1` and `allowedFunds=[]`; this does **not** authorize recording a receipt now.

Display a financial summary before saving:

```text
مديونية داشبورد جاهز المدخلة       1,000.00 ر.س
العمولة المستحقة                    150.00 ر.س
إجمالي الترحيل                    1,150.00 ر.س
```

Positive `net` is due from the rider; negative `net` offsets commission. Keep its sign in the breakdown. Transfer is unavailable if the resulting total is zero or negative.

Sequence:

1. Preview using `POST /operations/preview`.
2. Save with `POST /operations` and its own idempotency key. The result is Ready; no debt/receipt/withdrawal has happened.
3. Submit a request with a different idempotency key:

```json
{
  "handoverId": "019e0000-0000-7000-8000-000000000001",
  "kind": 4,
  "operationId": "019e0000-0000-7000-8000-000000000002",
  "reason": "اعتماد ترحيل المستحق على المندوب"
}
```

4. Mark the operation UnderReview and the request Pending after success. Refresh the saved operation/request from reads.
5. Show «بانتظار اعتماد المدير». Do not invoke `/operations/{id}/execute` for this transfer.

If request submission fails after the draft was saved, retain its operation ID. Retry request submission; do not create another draft. Only one unexecuted operation per handover is allowed.

Updating a Ready draft requires the latest Base64 `rowVersion`; updating UnderReview or Executed operations is not allowed through draft update. If commission changed before approval, refresh and follow the existing settlement-adjustment workflow (`kind=5`, `adjustmentTarget=1`) rather than approving stale figures or blindly retrying approval.

### Optional withdrawal-day figures

The current backend also supports optional `dayUsage` on operation creation/update. It belongs only to modes 2/3; send null/omit for mode 1. It is independent of dashboard debt/commission and does not replace either value.

Supported nullable fields are `ordersCount`, `workingHours`, `collectedAmount`, `deductionsAmount`, `totalValidOffers`, `declinedOffers`, `missedOffers`. Do not convert blanks to zeros. Counts are nonnegative integers, working hours are 0–24 with at most two decimals, collected amount is nonnegative, and amount fields are bounded to an absolute 1,000,000,000 with at most two decimals. Deductions may be signed. Preserve existing day-allocation flows if the frontend already integrates them; this handoff does not introduce a separate day-allocation screen. Returned operations may contain serialized `dayUsageJson`.

## 6. Screen: manager approval

Show these fields before enabling the decision:

- Actual rider: `request.userRider.nameAr`, `iqamaNo`, `mobile`.
- Original account: `request.account.externalAccountId`, code, city and sponsor.
- Assignment: `request.assignment.startedAtUtc`, `endedAtUtc`, commission start and original period.
- Settlement end: `request.operation.throughDate`; reason from `request.reason`.
- Financial split from `amounts`: manually entered dashboard amount, company commission, total transferred.
- Requester ID/status and decision history; resolve display names using the existing ERP user lookup if available.

The `amounts` location varies by response:

| Response | Path |
|---|---|
| POST request / POST decision | `response.amounts` |
| GET request list | `response.items[i].amounts` |
| GET request detail | `response.request.amounts` |

```json
{
  "dashboardDebt": 1000,
  "commission": 150,
  "total": 1150
}
```

Use the returned `amounts`; do not calculate manager totals from `proposedNet` / `proposedCommission`. Those fields belong to adjustment proposals. `operation.calculatedCommission` is calculation evidence; `operation.commission` is the commission used in the financial result, including an approved override.

For nonfinancial request types, `amounts=null` is normal. For a transfer request without linked financial details, display «تفاصيل العملية غير متاحة» and require refresh/review rather than rendering zero amounts. Related historic entities may be null; keep the request visible.

Approval body:

```json
{ "approve": true, "reason": "تمت مراجعة مديونية الداشبورد والعمولة واعتماد الترحيل" }
```

Rejection body:

```json
{ "approve": false, "reason": "يلزم مراجعة مبلغ الداشبورد" }
```

This is a financial decision: use a confirmation dialog showing the same three amounts and the rider. Its primary label is «اعتماد السحب وترحيل المستحق». Do not add editable financial fields to this decision dialog; corrections use the separate adjustment workflow.

Approval executes withdrawal, creates the transferred debt and marks the operation Executed/Transferred. No cash is collected and no rider block is created. Rejection returns the operation to Ready with no withdrawal or money movement. Refresh account detail/list, requests, operations, debt summary and cross-platform assignment/history after successful approval.

The GET amounts reflect the linked operation's current values. The decisions array includes saved `decisionJson` for audit evidence; use the saved decision evidence when displaying historical decision values.

## 7. Screen: riders with outstanding transferred debts

Location: the existing Jahez money area, tab «مديونيات المناديب المرحلة». This is the actionable list, not the account list.

Fetch `GET /riders/transferred-debts?page=1&pageSize=50`.

```json
{
  "items": [{
    "riderProfileId": "019e0000-0000-7000-8000-000000000003",
    "userRider": {
      "employeeId": "019e0000-0000-7000-8000-000000000004",
      "riderProfileId": "019e0000-0000-7000-8000-000000000003",
      "nameAr": "أحمد محمد",
      "nameEn": null,
      "iqamaNo": "2000000001",
      "mobile": "0500000001",
      "sponsorId": null
    },
    "unpaidDebtCount": 2,
    "outstandingAmount": 1150,
    "amounts": { "dashboardDebt": 1000, "commission": 150, "total": 1150 }
  }],
  "page": 1,
  "pageSize": 50
}
```

Table columns:

| Label | Source |
|---|---|
| المندوب | `userRider.nameAr` |
| الإقامة | `userRider.iqamaNo` |
| الجوال | `userRider.mobile` |
| عدد المديونيات | `unpaidDebtCount` |
| مديونية الداشبورد | `amounts.dashboardDebt` |
| العمولة | `amounts.commission` |
| إجمالي المستحق المرحّل | `outstandingAmount` |
| Actions | «التفاصيل», «سداد كامل المستحق المرحّل» |

Each rider appears once regardless of the number of debts. Summary ordering is by rider ID; do not promise newest-first. Use `riderProfileId` as the stable row key. A debtor remains visible if the rider was archived or the account was reassigned.

`outstandingAmount` is authoritative for repayment. If `amounts=null`, show «تفاصيل التقسيم غير متاحة» while keeping the total. Never replace missing financial detail with zero. If `userRider=null`, show the rider ID and an unavailable-identity label rather than hiding the obligation. A backend consistency check can reject repayment if original references are missing/inconsistent; display that error for review.

Empty copy: «لا توجد مديونيات مرحلة غير مسددة». It does not mean there are no deferred settlements or other fees.

## 8. Drawer/page: rider debt details

Fetch `GET /riders/{riderId}/transferred-debts?page=1&pageSize=50`.

Use each debt's `id` as its row key. Display:

- `assignment.externalAccountId`: original Jahez account number.
- `assignment.startedAtUtc` / `endedAtUtc`: original rider operating period.
- `sourceOperation.throughDate`: settlement cutoff.
- `sourceOperation.net`, `commission`, `remaining`: the financial breakdown.
- `amount`: stored debt amount; this is the amount owed for the obligation.
- `createdAtUtc`, `sourceOperation.reason`, `approvedRequestId`: history and approval navigation.
- `userRider`: recorded debtor, never the account's current rider/registered owner.

The response is the existing `TransferredDebtRow`, including audit fields and Base64 `rowVersion`. `assignment` and `sourceOperation` may be null. Keep the debt row visible. Detail order is descending creation time, then debt ID.

Only unpaid debts are returned here. For paid history, use the existing paginated `/transferred-debts` endpoint; it does not accept a rider filter. Do not present client filtering of one history page as a complete rider history.

## 9. Full rider repayment modal

Title: «سداد كامل المستحق المرحّل».

Show rider identity, unpaid debt count, dashboard/commission breakdown if available, and the read-only `outstandingAmount`. Inputs: reference and reason. Fund is fixed to `1` (cashbox) under the current transferred-debt repayment policy. Bank/PetroApp are not valid for this bulk action. No custom amount, partial amount, discount, waiver or debt-adjustment input.

Load a fresh summary before asking the user to confirm. The displayed total becomes `expectedAmount`. The server checks the full current total again; it never treats this as a freely editable repayment amount.

```http
POST /api/jahez/v2/riders/{riderId}/transferred-debts/repayment
Authorization: Bearer <ERP access token>
Content-Type: application/json
Idempotency-Key: <stable UUID for this confirmed payment>
```

```json
{
  "expectedAmount": 1150,
  "fund": 1,
  "reference": "RCPT-20261021-001",
  "reason": "تحصيل كامل المديونيات المرحلة على المندوب"
}
```

Successful response:

```json
{
  "riderProfileId": "019e0000-0000-7000-8000-000000000003",
  "paidAmount": 1150,
  "paidDebtIds": [
    "019e0000-0000-7000-8000-000000000005",
    "019e0000-0000-7000-8000-000000000006"
  ],
  "remainingAmount": 0
}
```

Primary action: «تأكيد قبض 1,150.00 ر.س». Keep it disabled during submission. This is a record of money actually received, not a promise to collect later.

Backend effects: one linked receipt per debt, using the same supplied reference, full debt paid metadata, treasury postings following each original obligation's sponsor ownership. The operation is atomic; failure rolls back all receipts and paid flags. Multiple linked money movements with one reference are expected, not duplicate payments.

After success, refresh the grouped rider list, open debt details, historical transferred-debt records, money movements and any visible treasury balances. The rider disappears from the unpaid list if no new debt was subsequently added. Success copy: «تم سداد جميع المديونيات المرحلة بقيمة … ر.س». Avoid «تمت تصفية جميع التزامات المندوب».

For one-debt repayment, the existing `/transferred-debts/{debtId}/repayment` accepts `{ fund: 1, reference, reason, purpose: 4 }` with the same two repayment/receive permissions. It returns a debt object, not the bulk response. Do not expose two competing primary actions for the same intention.

## 10. Retry, stale data and errors

Create one idempotency key for each confirmed mutation. Preserve it together with the exact payload through network errors, timeouts and token-refresh retries. A replay with the same key/body returns the saved result. A different payload under the same key returns 409. Do not generate a new key merely because the first response was lost. Refresh authoritative state after a replay because later operations may already have occurred.

After a confirmed business rejection that requires changed input, refresh, show the new values for review, then create a new key for the newly confirmed action. Never silently update `expectedAmount` and retry payment for a different amount.

| Condition | Frontend response |
|---|---|
| 400 invalid input | Show `detail`, preserve form values and focus the invalid field if identified. |
| 401 | Use the existing token refresh/login flow; preserve pending mutation identity. |
| 403 | Show authorization failure. Do not continue with optimistic state changes. |
| 404 | Refresh/remove stale navigation; distinguish a missing request from an API version not yet deployed. |
| 409 changed total | Reload summary/details, display the changed amount, require fresh confirmation. |
| 409 no outstanding debt | Refresh; another user may have already paid it. |
| 409 commission changed | Refresh and route to the existing adjustment workflow; no blind approval retry. |
| 409 request decided / operation state changed | Refresh request/operation and remove stale actions. |
| 409 historic reference/ownership inconsistency | Show backend message and route to review; do not discard the debt. |
| 409 transient transaction conflict | Retry the unchanged action with the same key as advised by the response. |
| Network error / 5xx | Payment outcome may be unknown; retain the key/body and offer a safe retry. |

Errors use ProblemDetails, for example:

```json
{
  "status": 409,
  "title": "تعارض في البيانات",
  "detail": "تغير إجمالي المديونية؛ أعد تحميل المبالغ قبل السداد.",
  "errorCode": "jahez.conflict",
  "correlationId": "server-trace-id"
}
```

Use `status` and `errorCode` where possible; most Jahez conflicts share one code, so show the actual `detail` rather than relying exclusively on text matching. Include `correlationId` in support details. Validation responses can also include field-specific extensions or framework validation errors.

## 11. Withdrawal without settlement: supported flow and gaps

`mode=3` closes the assignment with `paymentStatus=4` (Deferred). Its own net/commission/remaining are zero because it records an operational withdrawal, not a finalized financial calculation. Display «مسحوب دون تصفية» / «تصفية مؤجلة»; never display «مسدد» based on those zeros.

It creates no transferred debt and no automatic manager transfer request. It is therefore absent from the new unpaid transferred-debt list.

The original period remains available under account details: `handovers` and `operations` from `GET /accounts/{accountId}`. Later settlement must use that old `handoverId`, not `account.currentHandoverId` and not the replacement rider. Use mode 1, `transferToRider=false`, a cutoff no later than the old period end, and the manual dashboard amount. Preview calculates remaining commission for the old session. Show the backend-selected receipt/disbursement direction and allowed funds. For a nonzero ordinary settlement, provide the actual payment reference; then save and execute the ordinary operation. This does not close or settle the new rider's session.

Important API boundaries:

- There is no dedicated paginated endpoint for all withdrawn-but-unsettled riders in this change. Do not label the transferred-debt list as covering them.
- A historical Deferred operation remains historical after a later settlement; do not use its existence alone to claim the rider is still unpaid. Inspect later executed settlement operations and cutoffs.
- Do not infer «بريء ذمة» from an empty transferred-debt list.
- Explicit transfer currently requires mode 2 on an open session. A previously closed session cannot simply be submitted as a second settlement-and-withdrawal transfer. Later cash settlement of the old period is supported; converting deferred closed periods into transferred debts would require an additional backend workflow.

## 12. Numeric statuses and display

JSON enums are numbers, not enum names.

| Field | Values |
|---|---|
| Operation mode | 1 Settle; 2 SettleAndWithdraw; 3 Withdraw |
| Operation status | 1 Ready; 2 UnderReview; 3 Executed |
| Payment status | 1 None; 2 Paid; 3 Transferred; 4 Deferred |
| Approval kind | 4 SettlementTransfer (backend enum name is ResetAccount) |
| Approval status | 1 Pending; 2 Approved; 3 Rejected; 4 Cancelled |
| Direction | 0 None; 1 Receipt; 2 Disbursement |
| Fund | 1 Cashbox; 2 PetroApp; 3 Bank — validity depends on the action |

Format SAR to two decimal places for display. Preserve signed dashboard values in breakdowns. Use a decimal/money helper rather than binary floating-point arithmetic for frontend validation; returned backend monetary values remain authoritative. Render DateOnly without timezone conversion. Render instants in Asia/Riyadh. Never derive the Riyadh business day using the browser's local timezone.

Provide distinct loading, empty, unavailable-data, permission-denied and failed-request states. Use labelled form inputs, keyboard-accessible dialogs, visible focus, inline errors, and text labels in addition to colors. On small screens preserve rider identity, total due and the primary action; place detailed columns in the drawer/scrollable table.

## 13. Client usage

Use the existing `jahezClient(baseUrl, tokenProvider)`. New methods are already included:

```ts
const riders = await api.ridersWithTransferredDebts(1, 50);
const debts = await api.riderTransferredDebts(riderId, 1, 50);
const result = await api.repayRiderTransferredDebts(riderId, {
  expectedAmount: selectedRider.outstandingAmount,
  fund: 1,
  reference,
  reason,
}, paymentKey); // retain key + exact body if the response is lost
```

The client provides typed requests/errors and bearer headers. It does not persist keys, implement token refresh, manage cache invalidation or decide mutation retry policy; integrate those with existing ERP infrastructure.

## 14. Frontend acceptance checklist

- Transfer form accepts a manually entered signed dashboard value and displays backend commission and total.
- A positive transfer of dashboard 1000 plus commission 150 shows 1150 to both requester and manager.
- Pending requests and Ready drafts create no receipt or debt and do not withdraw the account.
- Requester cannot approve their own request; approval/rejection reasons are required.
- Approval withdraws the original assignment and creates debt without operational blocking.
- Rejection restores Ready and does not change money or account assignment.
- One rider with two debts appears once in the grouped list; detail shows both debts.
- Reassigned accounts retain the original debtor and financial split.
- Missing/archived related identities do not hide debts; missing breakdown is not shown as zero.
- Full repayment uses the authoritative rider total even when debt details span multiple pages.
- Invalid fund, blank/long reference, missing reason and changed total show appropriate errors.
- Lost-response retry with the same key creates no duplicate receipt.
- Changed-total conflict requires a new user review before any different payment is submitted.
- A backend failure leaves the UI unpaid and triggers refresh; no optimistic financial completion.
- Successful repayment refreshes lists and treasury data; transferred-debt balance becomes zero.
- Independent account suspensions remain independent; there is no debt-driven block badge.
- Deferred withdrawals remain distinct and their later settlements use the old session, leaving a replacement rider unaffected.
- No unsupported server filters, total counts, partial repayments, write-offs or closed-session transfers are invented.

## 15. Validation and release limitations

Latest focused run for this change: 16 passed, 3 opt-in SQL cases skipped. The broader Jahez run had 205 passed, 18 skipped and 3 failures asserting model/migration consistency in the workspace. Opt-in SQL runtime verification could not complete because the local SQL Server instance failed to start. These results do not establish hosted deployment or production SQL transaction verification.

Before release, confirm the updated API is deployed, verify permissions with real scoped roles, complete SQL integration checks on a working disposable database and run the frontend acceptance flow against the deployed API. This debt change itself introduces no new persisted fields; separate day-usage/model changes in the workspace have their own migration requirements.
