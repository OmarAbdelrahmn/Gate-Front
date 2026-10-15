# Chefz: two active accounts per rider

A rider can now take up to two Chefz accounts simultaneously. The exception applies to the existing Chefz platform family: CHEFZ, THECHEFZ, CHEFSZ and SHIFTZ. Both current accounts must be Chefz accounts; the exception does not enable a generic mixed-platform pair or change other platforms' rules. The shared default remains one account. Jahez's separate workflow and its existing limits remain unchanged.

Both assignment routes enforce the exception:

- `POST /api/platform-accounts/{id}/assign`
- The existing legacy `IPlatformOperationsService.AssignAccountAsync` path.

The first Chefz account uses an available rider slot and the second uses the other slot. Taking a third returns HTTP 409 with the existing `platform.rider_account_limit_reached` error and `assignmentLimit.maximumActiveAccounts: 2`, the two current account records, and an empty `allowedPaymentModels` array. Other-platform/mixed generic failures continue to report the original one-account limit. An open assignment still consumes a slot while an account is Suspended, Retired or Archived.

Returning either account closes only that account's rider link, applies its normal Available/manual-status behavior, and frees its slot for another Chefz account. The other account stays assigned. Account totals count both accounts as taken, even though they belong to one rider.

The existing payment rule still allows at most one Salary account per rider: two PayPerOrder accounts or one PayPerOrder plus one Salary account are supported. Chefz `Freelancer`/`FullTime` account type is a separate setting from the platform payment model. Both generic account edit paths now use the Chefz exception when validating payment-model changes on an assigned account, so an allowed two-account pair can still be edited.

The existing permissions, rider eligibility, Jahez debt/operational blocks, ownership validation, one-rider-per-account rule and history retention remain in effect. The same account cannot be taken by a second rider. The default `PlatformAccountAssignmentPolicy` and all non-Chefz platform workflows are unchanged.

## Daily performance and money breakdowns

The user confirmed the FullTime fee is **25 SAR per account per assigned day**. Two FullTime accounts held on the same day therefore incur 50 SAR for that day. Each account retains its own assigned-day range, account type, fees, earnings, deductions and settlement. The existing fee formulas are retained.

Money-sheet preview, save and saved-import read responses already expose `riders[].accounts[]`. Each account row includes `accountId`, spreadsheet `driverId`, `assignmentId`, the actual `riderProfileId`, account type, charged dates/days, delivery fees, VAT, tips, compensation, bonuses, deductions, net earnings, company amount and rider amount. Rider totals remain alongside these account rows. Two accounts on one rider produce two account rows within that rider's cycle group; one account never overwrites the other. Wallet settlements also remain separate by assignment and half-month.

Daily performance upload responses now add `riders[]`, containing each actual rider's ID/name and `accounts[]` with one row per account in that uploaded file, including unchanged/skipped rows on a replay. Each row includes the account GUID/external account ID, assignment GUID, spreadsheet report ID, date and all performance counts/rate. The paginated performance-read response also includes `externalAccountId` and `riderName` on each row. Invalid uploads return an empty riders array and the existing issues, with no partial writes.

`GET /api/chefz/reports/riders` also adds `accounts[]` to its existing response. Each entry identifies an account and actual historical rider, gives that pair's summary over the requested period, and returns its own `daily[]` source metrics. An account used by different riders over the selected period yields separate account/rider entries. Entries cover recorded data; missing-day/half messages remain at the existing top level. Combined daily and period totals remain available alongside this breakdown and use weighted acceptance rates.

Example structure (identifiers/metrics omitted):

```text
Money import:        riders -> each rider -> accounts -> each account's amounts
Performance import:  riders -> each rider -> accounts -> each account's daily metrics
Rider report:        accounts -> each account + rider -> summary and daily metrics
```

Performance matching remains by report ID to account and then that account's dated rider assignment. A daily reupload corrects only the matching account/date row. Money imports keep their existing immutable assignment/period keys and hash-based replay protection. Account breakdowns preserve the established VAT and freelancer commission rounding reconciliation; FullTime charges stay per account.

No database migration or frontend change is required. The database already has rider slots 1 and 2, unique active account and rider-slot indexes, and the one-Salary-account index. Those existing constraints continue to protect simultaneous writes. SQL runtime/concurrency verification remains unavailable locally because LocalDB fails to start; query translation and service behavior are tested separately.

## Verification — 15 October 2026

- Final solution build: zero warnings and zero errors, using isolated output and the dependency-audit flag documented in [account status control](chefz-account-status-control.md).
- Final Chefz workflow run: **71 passed, 7 optional checks skipped**. This includes both assignment service paths, all four Chefz codes, third-account rejection, generic/mixed-platform rejection, slot reuse, payment-model edits and SQL query translation.
- The two-account daily-report regression verifies separate uploaded rows and IDs, weighted combined acceptance, separate account summaries, named riders, correction/replay behavior, and one rider in management counts.
- Four money-import cases cover Freelancer/Freelancer, FullTime/FullTime, and both mixed account-type orders. They verify each account's identity, assignment dates, amounts and deductions, one combined rider payout, preview/read consistency, replay protection and rejected changed reimports without leaked writes.
- Two wallet cases verify separate settlements for two accounts on the same rider, FullTime fees per account/day, Freelancer amounts, stable replay IDs and rejection of changed saved amounts.
- Regression checks also passed for 13 Ninja cases and all four existing generic one-account-policy cases. SQL Server execution and concurrent-write tests remain unavailable because the local instance fails to start; no production data was changed.
