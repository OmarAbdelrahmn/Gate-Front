# Prompt for Antigravity — HungerStation frontend update, part 1

Copy everything below the line into Antigravity (agent mode), with this FrontProject folder open.

---

You are updating the **frontend only** of a Next.js admin app (this repo). The backend (.NET API) has changed and the HungerStation admin pages must be updated to match it.

## Hard rules
- **Frontend only.** Do not create, edit or mock any backend/API server code. Call the real API through the existing client in `src/lib/hunger/api.ts`.
- Read `AGENTS.md` first: this Next.js version has breaking changes; check `node_modules/next/dist/docs/` before using any Next.js API.
- Work only in: `src/lib/hunger/api.ts`, `src/lib/hunger/types.ts`, `src/lib/auth/permissions.ts`, and `src/app/admin/hunger/**`. If you must split a big page into components, put them under `src/app/admin/hunger/components/`.
- The repo already has uncommitted changes (deleted `Docs/*` files, edits in `src/lib/auth/permissions.ts`). **Do not revert or touch them**, except adding the new permission keys to `permissions.ts`.
- Follow the existing code style: same fetch helper, `generateHungerIdempotencyKey()` for idempotency keys, `getRiyadhTodayIso()` for dates, the same Arabic UI labels style (RTL), same table/dialog components already used in these pages.
- Do **not** commit. Do not delete existing features.
- The full API reference is in `Docs/hunger-api-endpoints.md` (copied from the backend). It is the source of truth for paths, bodies and fields. Every path below is under `/api/hunger`.
- Do not build anything for performance-view changes, import-conflict resolution, deferred-month reminders or wallet export yet — those backend parts are not finished (part 2 later).

## 1. Permissions (`src/lib/auth/permissions.ts` + pages)
Add these keys next to the existing `hunger.*` keys:
`hunger.finance.read`, `hunger.finance.funding.request`, `hunger.finance.funding.execute`, `hunger.finance.topup.request`, `hunger.finance.topup.execute`, `hunger.finance.collection`, `hunger.finance.withdrawal.request`, `hunger.finance.withdrawal.arrival.confirm`, `hunger.finance.rider.payment`, `hunger.finance.wallet.review`, `hunger.remittances.submit`, `hunger.remittances.cancel_reverse`, `fleet.vehicles.fields.identity`.

In the finance and accounts pages, replace the single `can("hunger.finance.manage")` gate with the granular permission for each action (table in the API doc, section "Finance permissions and accountant receipts"). `hunger.finance.manage` still works as a superset, so treat `can(x) || can("hunger.finance.manage")` as allowed, **except** the backend lets an explicit denial win — so if the API returns 403, show the Arabic message "ليس لديك صلاحية تنفيذ هذه العملية." and don't crash. Hide buttons the user can't use.

## 2. Wallet review (accounts page — handover/return dialogs)
`POST /accounts/{accountId}/wallet-review` and `POST /wallet-reviews/{reviewId}/confirm`:
- `closingBalance` in the request is now **optional/nullable**. In the response, `closingBalance`, `currentPeriodBalance`, `attributedBalance`, `riderBalanceChange` can be **null** (= unknown), and there is `canConfirm: boolean`.
- Update the TypeScript types (`types.ts` ~lines 313, 546, 576) to `number | null`.
- When `canConfirm` is false or closing balance is null: show the values as "غير معروف", show a clear warning "لا يوجد إقفال مسجل للشهر السابق — سجّل الإقفال ثم أنشئ مراجعة جديدة", and disable the Confirm button.
- If confirm returns an error saying the review is **Expired** or **Superseded** (another review was created for the account), show "انتهت صلاحية المراجعة أو استُبدلت بمراجعة أحدث — أنشئ مراجعة جديدة" and let the user re-run the review.
- Show the review's expiry time (`expiresAtUtc`).

## 3. Rider swap (accounts page — new action)
New action "تبديل المندوب" on an account that has an active rider:
- `POST /accounts/{accountId}/rider-swap/review` with body shape exactly as in the API doc (`return` block for old rider + `handover` block for new rider; same business date; new rider must differ).
- Show both legs side by side (Return result and Handover result, each a WalletReviewResponse) and a single Confirm button → `POST /rider-swaps/{swapId}/confirm` (no body). Both legs succeed or nothing changes — say so in the dialog.
- Permission: `hunger.finance.wallet.review`.
- Note in the UI: legs of a swap cannot be confirmed through the normal single review confirm.

## 4. Withdrawals (finance page)
Creating a withdrawal (`POST /finance/events` with kind `WithdrawalCompany` or `WithdrawalSupervisor`) now needs extra fields: `sourceWalletBalance`, `destinationType` (`Company` | `Supervisor`), `destinationOwnerId`, `counterSubAccountId`, `transferReference`, `transferDate` (must equal `businessDate` — set it automatically), `againstReservedRights` (+ `relatedEventId` when true, choosing the WalletReturn event).
- New withdrawals come back with status **PendingArrival**. Show status badges: PendingArrival (انتظار الوصول), Arrived (وصل), Cancelled (ملغي).
- On PendingArrival rows add two actions:
  - "تأكيد الوصول" → `POST /finance/withdrawals/{id}/confirm-arrival` body `{idempotencyKey, businessDate, evidenceReference}` — permission `hunger.finance.withdrawal.arrival.confirm`.
  - "إلغاء" → `POST /finance/withdrawals/{id}/cancel` same body — permission `hunger.finance.withdrawal.request`.
- Explain in the UI that money is not posted to the destination until arrival is confirmed.

## 5. Funding / top-up requests (finance page)
- Add "طلب" (request) mode: `POST /finance/requests` (same body as `HungerMoneyRequest`) returns status `Requested` without moving money. Permission `*.request`.
- List requested items with an "تنفيذ" (execute) button → `POST /finance/requests/{requestId}/execute`. Permission `*.execute`.
- Keep the existing direct execution (`POST /finance/events`) for users with the execute permission.

## 6. Accountant receipts / remittances (finance page)
Replace the simple remittance create/confirm with the batch lifecycle:
- Statuses: Draft, Submitted, PartiallyConfirmed, Confirmed, Cancelled — show as badges.
- Create draft: `POST /finance/remittances/drafts` (`platformId, supervisorEmployeeId, sources:[{sourceEventId, amount}], idempotencyKey, businessDate, evidenceReference`). Submit: `POST /finance/remittances/{id}/submit`. Keep the shortcut `POST /finance/remittances` (create + submit) as "إنشاء وإرسال". Permission `hunger.remittances.submit`.
- Confirm (accountant): `POST /finance/remittances/{id}/confirm` — body in API doc. Allow three modes: partial amounts per source (`sources`), selected sources full remaining (`selectedSourceIds`), or all remaining (send neither). Destination fields: `destinationSubAccountId`, `destinationType`, `destinationOwnerId`. Permission `hunger.remittances.confirm`.
- Cancel: `POST /finance/remittances/{id}/cancel` — only for Draft/Submitted with no confirmation ever. Reverse a confirmation: `POST /finance/receipt-confirmations/{confirmationId}/reverse`. Both need `reason`, permission `hunger.remittances.cancel_reverse`; ask for confirmation in a dialog.
- Pending collections: `GET /finance/pending-collections?platformId&supervisorEmployeeId&page&pageSize` — show two paged tables (batches and sources) with confirmed and remaining amounts.
- Show this note: "وصول المبلغ لحساب المشرف ليس استلامًا للشركة، وتأكيد الاستلام لا يعيد تعبئة عهدة الشحن."

## 7. Settlement adjustments (finance page)
- Creating an Adjustment document (`POST /finance/settlement-documents`) now requires `sourceDocumentType`, `sourceReference`, `closingSnapshotId` (pick the month-close document). New adjustments start **Unmatched**.
- Add "مطابقة" (reconcile) action on Unmatched adjustments → `POST /finance/settlement-documents/{documentId}/reconcile` body `{closingSnapshotId, evidenceReference}`.
- A 409 conflict means the same source was already entered — show "هذا المصدر مسجل مسبقًا".

## 8. Accounts list — vehicle, SIM and filters (accounts page)
`GET /accounts` now accepts `from` / `through` dates (default: first day of this month → today; max 366 days) and many filters (full table in the API doc, section "Shared account context and filters"). Add:
- A date range picker (from/through) and a collapsible filter panel grouped as in the doc: Account, Owner, Registration, Registered vehicle, Actual vehicle, SIM, Account state. Send filters as query params; reset page to 1 on change. Keep the old `disposition` filter working.
- New columns/detail fields: `actualVehicleCustodyStatus` (None = لا توجد عهدة موثقة, Assigned, Mixed = متعدد, Unknown = غير معروف — None and Unknown must look different), `actualVehicleOwnership` (Company/Private/Mixed/Unknown), `actualVehiclePeriods` in the detail view as a small timeline table.
- SIM: show `simOwnership`, `simHolder`, `simResponsibleEmployee`, and `sim.ownershipPeriods` in the detail view. Show `sourceSimOwnership` labelled "من ملف الاستيراد" separately.
- Vehicle identity fields (asset/VIN/type/model/manufacturer) are editable only with `fleet.vehicles.fields.identity`.

## 9. Finish
- Run `npm run lint` and `npx tsc --noEmit`; fix every error you introduced.
- At the end, write a short report: files changed, what was done per section 1–8, anything you skipped or were unsure about.
