# Prompt for Antigravity — HungerStation frontend update, part 2

Copy everything below the line into Antigravity (agent mode), with this FrontProject folder open.

---

You are continuing the **frontend-only** update of the HungerStation admin pages in this Next.js app. Part 1 (permissions, wallet review, rider swap, withdrawals, requests, remittances, adjustments, account filters) is already done — keep it working and reuse its components and helpers.

## Hard rules (same as part 1)
- **Frontend only.** Do not create, edit or mock any backend/API code. Call the real API through `src/lib/hunger/api.ts`.
- Read `AGENTS.md` first (this Next.js version has breaking changes).
- Work only in `src/lib/hunger/api.ts`, `src/lib/hunger/types.ts`, `src/app/admin/hunger/**` (new components go in `src/app/admin/hunger/components/`). Do not touch other files; do not revert existing uncommitted changes.
- Same style as existing pages: Arabic RTL labels, existing table/dialog/filter components (`TableHeaderColumnFilter` etc.), `generateHungerIdempotencyKey()`, `getRiyadhTodayIso()`, `getHungerErrorMessage()`.
- **No `any` types** in new code — define proper interfaces in `types.ts`. Also replace the `any` you added in part 1 at `src/lib/hunger/api.ts` around lines 966 and 1522 (pending collections / paged normalizer) with real types.
- Do **not** commit.
- Source of truth: `Docs/hunger-api-endpoints.md` (refreshed). Sections: "Task 4: performance (R20-R27)" and "Remaining backend contracts (Task 5)". All paths are under `/api/hunger`.

## 1. Performance report (operations page — new tab "الأداء")
- `GET /reports/performance` with `HungerPerformanceQuery`: `from`, `through` (max 367 days), `groupBy=account|rider`, `period=day|month`, `layout=vertical|horizontal`, optional `accountId`, `riderId`, `cityId`, `sponsorId`, `actualVehicle` (Company/Private/Mixed/Unknown), `actualVehicleType`, `targetAchieved` (true/false), `page`, `pageSize` (≤100), plus `accounts.*` account filters (reuse `AccountsFilterPanel` from part 1, prefixing keys with `accounts.`).
- Toggles for group by (حساب / مندوب), period (يومي / شهري), layout (رأسي / أفقي). Layout is display only: in horizontal layout show dates/months as columns; in vertical as rows.
- Columns: WorkedDays (أيام عمل), QualifiedDays (أيام مؤهلة ≥ 8 ساعات), UnknownDays (أيام غير معروفة), hours, completed / accepted / stacked / rejected / cancelled orders, NoShow count, target, deficit, achievement, forecast, required pace, `coverageThrough`.
- Show null as "غير معروف" — never as 0. When the forecast is not reliable (gaps / coverage alert), show "لا يوجد توقع موثوق" instead of a number.
- Show distinct account/rider counts and totals from the response (they cover the full filtered range, not just the page).
- Expandable row details: alerts list and `catalog` evaluations (rule code, metric, actual, threshold, severity, date, deficit).
- Mandatory days (Thursday/Friday/Saturday): highlight missing coverage and known zero-work separately.
- Export button → `GET /reports/performance/export` with the same filters (permission `hunger.performance.export`).

## 2. Alert & target catalog (operations page — existing "alerts" tab)
- Extend the create form for `POST /alert-rules` with: `metric` (WorkingHours, CompletedOrders, WorkedDays, QualifiedDays, NoShowCount, RejectedOrders, CancelledOrders, AcceptedOrders, StackedOrders), `operator` (LessThan, LessThanOrEqual, GreaterThan, GreaterThanOrEqual, Equal), `kind` (Alert / Target), `period` (Day / Month), `operatingCityId` (empty = all cities), `effectiveThrough` (optional), keeping existing fields. Severity options: High, Critical, Warning, Info.
- Each save creates a new version — show the version history per rule (read-only), and mark which version is currently effective. Explain that a disabled city version suppresses the rule for that city (used for approved exemptions).
- Permission: existing `hunger.alerts.manage`.

## 3. Potential fines from NoShow (operations page — new tab "غرامات محتملة")
- `GET /potential-fines?from&through` → table: account, rider, source day, NoShow shifts count (it is a count of shifts, **not money**), status (Potential / Invoiced / Waived), evidence.
- Actions on `Potential` rows → `POST /potential-fines/{id}/resolve`:
  - "مفوترة" (Invoiced): requires `invoiceDocumentId` (pick from settlement documents of kind invoice), `invoiceSourceKey`, `evidence`, `rowVersion`.
  - "إعفاء" (Waived): `evidence`, `rowVersion`, no invoice.
- Both are final. Show a note: "لا تُنشئ الغرامة المحتملة دينًا على المندوب ولا قيدًا ماليًا."
- On 409 (row version changed) reload and tell the user.
- Permission: `hunger.finance.manage`.

## 4. Operations import & report additions (operations page)
- Template download now has optional columns `AcceptedOrders`, `StackedOrders`, `HoursUnit`, `CaptainClassification` — no UI change needed besides showing these new fields in the import preview and the operations report table/export.
- In the preview, show the hours unit used (DecimalHours / Duration / FractionOfDay) and surface row errors (formulas, negative, >24 hours).
- Operations export and quality export accept `riderId` and `accounts.*` filters; operations export also `captainClassification`. Add these to the existing export dialogs.

## 5. Account import with conflict resolution (accounts page)
- Template: `GET /accounts/template` (button "تحميل القالب").
- Preview rows now have `status`: New, Unchanged, ChangedField, ConflictingOwner, MissingAccount; plus `matchedAccountId`, `changes[]` (`field`, `existing`, `incoming`), `error`, `assignmentIssue`.
- Show a review table with a status badge per row and an expandable before/after list of `changes`.
- Every row needs exactly one decision via a dropdown: Create, Update, ReplaceOwner, Keep, Skip. Allowed options per status:
  - New → Create / Skip (Create may need a `platformId` choice if unresolved)
  - Unchanged → Keep / Skip
  - ChangedField → Update / Keep / Skip
  - ConflictingOwner → ReplaceOwner / Keep / Skip
  - MissingAccount or rows with `error` → Skip only
- "Apply to all of this status" helper is welcome. The confirm button stays disabled until every row has a decision.
- Confirm: `POST /accounts/imports/{previewId}/confirm` with `{ "resolutions": [{ "rowNumber", "action", "platformId"? }] }`. On 409 (stale/expired preview) tell the user to run the preview again.
- Note in UI: creating an account never assigns a rider — assignment still goes through wallet review.

## 6. Deferred-month reminders (accounts page)
- `GET /accounts/deferred-reminders?dueThrough=YYYY-MM-DD` (default today, cannot be in the future) → a small panel/badge "حسابات مؤجلة مستحقة" with count, and a table: external ID, due date, overdue days, link to open the account.
- Read only — activation is still the existing manual disposition change.

## 7. Account export (accounts page)
- "تصدير" button → `GET /accounts/export?format=xlsx|csv` with the current account filters. Permission `hunger.performance.export` + `hunger.read`.
- Add the new account filters to `AccountsFilterPanel`: actual rider ID/name/iqama/phone, source rider name/iqama, sponsor ID/name, payment/compensation model, source status, usage status, latest quality segment, quality rank range / score range / score equal, deferred date range.

## 8. Wallets page (finance page — new tab "المحافظ")
- `GET /wallets?page&pageSize` with filters: all account filters as `accounts.*`, plus `balanceFrom`, `balanceThrough`, `balanceEqual`, `receiptState` (None / Pending / PartiallyConfirmed / Confirmed). Permission `hunger.finance.read`.
- Columns: account, `mobileBalance` + `observedOn` + evidence (label it "آخر رصيد مُلاحظ" — it is NOT a live platform balance), period balance, attributed balance, restricted rights, pending arrival, pending receipts, confirmed receipts. Null → "غير معروف".
- Export → `GET /wallets/export?format=csv|xlsx` with the same filters.
- Row action "السجل" → `GET /accounts/{accountId}/wallet-history?page&pageSize`: two separately paged lists — financial events (with linked remittance/confirmation/reversal) and wallet observations. Note that a batch amount may cover several accounts.

## 9. Finish
- Run `npx tsc --noEmit` and `npx eslint src/app/admin/hunger src/lib/hunger` — no new errors, and no `any`.
- Write a short report at the end: files changed, what was done per section 1–8, anything skipped or unclear.
