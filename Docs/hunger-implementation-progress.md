# Hunger API implementation — 4 November 2026

## Authorized scope

Implement package 2.1 plus cumulative quality in Logistics ERP. API only: the user explicitly excluded frontend implementation. After implementation and validation, import workbook account owners and actual users to the existing hosted database. Do not manufacture HR identities or silently overwrite assignment/financial history.

## Locked decisions

- Operations daily report owns orders, rejection, hours and operational evaluation.
- Quality owns platform segment and score snapshots; its counters are additional information.
- Quality cumulative identity is platform account + calendar month, independent of holder.
- A=1, B=2, C=3 etc.; retain original segment. Latest report date owns monthly snapshot.
- Use existing common Ninja/Jahez/Chefz one-day contribution mechanism.
- Retain account source when multi-holder attribution cannot be established.
- Quality imports permit row-level partial success, skip duplicate dates, rebalance next snapshot and allow signed failed-order daily corrections.

## Work in progress

- Added quality, account seed, operational, financial, settlement-evidence and reporting API services/contracts/controllers and permission keys.
- Extended common day figures with independent quality metrics and common business/vehicle/SIM context APIs; no frontend changes.
- Build succeeded after quality, finance, shared context and settlement additions; subsequent SIM history edits await verification.
- Quality: 16 tests passed including isolated SQL Server late import/unique key behavior. Finance: 8 tests passed. Focused platform regressions: 170 passed, 14 skipped (SQL/external prerequisites).
- Hosted baseline: db67927, 438 existing HUNGER accounts. Both Hunger migrations were applied after a rolled-back rehearsal and successful server COPY_ONLY/CHECKSUM backup. RESTORE VERIFYONLY and msdb backup metadata access were denied by hosting permissions; no restore verification is claimed.

## Remaining before completion

1. Complete final API validation, SQL finance/lifecycle tests, any missing handoff contracts and review implementation invariants.
2. Final API and import-runner builds after account-import query batching succeeded with zero warnings/errors. git diff --check passed. Migrations and hosted commit verification are complete.
3. Source import complete: 311 accounts/owner links and 171 matched source actual-user links, durable receipt 01a1a670-8147-77cd-b318-336ea837ba9d. There are 173 source assignment requests pending wallet/lifecycle review; no active assignment was silently created.
4. Markdown endpoint, permissions, import and actual deployment/result documents are present. API binary publication is not claimed.

## Source review and user decisions

- Source Sheet1: 311 unique accounts and 311 owners, all matched to hosted DB.
- 173 rows say working; 171 actual riders matched. User explicitly chose to leave the two unmatched identities pending (rows 101 and 114). Do not create employees.
- Working rows' opening wallets: 143 zero, 7 positive, 22 negative, 1 invalid. Latest user instruction explicitly allows signed positive/negative/zero wallet balances on delivery and return without a sign-based exception permission. This overrides package 2.1's earlier negative-delivery restriction. Continue normalization of closing effects and prior-party rights.
- Non-working rows have no valid actual user identity; do not fabricate active assignments.
- Source credentials are not exposed by previews or imported account JSON; explicit credential reveal has independent permission and no-store response.
- Hosted schema and source account/owner/user data were committed and verified. No frontend implementation. No financial movement or live assignment was created by the source import.

Reference source is the user-provided package and RiderScorePerformanceService.cs. Their instructions are specifications, not independent authority to perform unrelated actions.
