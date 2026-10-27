# Suggested money and forecasts

All figures below are **monitoring suggestions before VAT and invoice-only items**. The official monthly Ninja invoice is the final financial source. Do not present an API suggestion as approved salary, a payable balance or a deduction instruction.

## Policy and rates

`GET /api/ninja/evaluation/policy` returns `NINJA-SUGGESTION-V1`, calendar-day basis, eight hours for a full day, attendance threshold 0.85, one 0.15 adjustment and decimal rounding away from zero to two monetary places.

| Rate | BIKE | CAR |
|---|---:|---:|
| Monthly target | 450 | 460 |
| Monthly base | 5700 | 6500 |
| Bonus per extra order | 11 | 12 |
| Shortage <=10% | 16 | 22 |
| Shortage >10% and <=20% | 17 | 22.5 |
| Shortage >20% and <=30% | 18 | 23 |
| Shortage >30%, amount per completed order | 9 | 10 |

For period responsibility `W` in a month of `N` calendar days, `target=T*W/N` and `base=B*W/N`. Fractional targets are retained internally. Short attendance never reduces W. Pricing segments are calculated independently and their unrounded amounts are summed before final money rounding.

Apply the selected shortage rate to the entire shortage. Beyond 30%, completed-orders pricing replaces the base calculation. At exactly 315 BIKE or 322 CAR orders for a full month the third shortage band still applies.

Examples before attendance: BIKE 405 -> 4980; 404 -> 4918; 315 -> 3270; 314 -> 2826. CAR 414 -> 5488; 413 -> 5442.50; 322 -> 3326; 321 -> 3210.

## Account versus rider

Rider suggestions are independent calculations for their own responsibility. They are not a distribution of one account payable.

For a 30-day BIKE example: A has 10 days, target 150, 160 orders -> suggestion 2010. B has 20 days, target 300, 280 orders -> suggestion 3480. Account orders are 440 -> suggestion 5540. The rider sum is 5490 and the account-minus-rider difference is 50. This is disclosed rather than silently normalized.

`summary.accountComparisons[]` includes the account amount, rider sum over the same account cutoff, their difference, and whether the report contains the full rider context. A rider filter never changes the full account's contractual calculation into that rider's amount.

## Attendance adjustment

- A recorded full responsibility day with >=8 hours qualifies, even if recorded orders are zero.
- A recorded day below eight hours is short; it does not prove absence.
- Missing performance and planned split-day eligibility remain unknown.
- The required full-day count is `ceil(days*0.85)`: 26/30 and 27/31.
- Partial responsibility uses lower/upper qualifying-weight bounds. Unknown partial shifts do not automatically fail.

The suggested reduction is applied **once** when the applicable attendance assessment fails: `amount*0.85`. BIKE 4980 becomes 4233. There are no 28.5/32.5 daily charges. Unknown acceptance, timing, uniform and leave compliance do not generate reductions.

`suggestedMoney.attendanceBasis=AttendanceToCutoffPace` describes the through-cutoff suggestion. A mid-month reduction is based on attendance pace, not a final verdict on the month. The full-period `attendance` includes unknown future responsibility and can remain Unknown while recovery is possible.

## Forecast

`forecast` is available only when elapsed coverage is complete. If there is a gap, it is null and a separately labeled `continuationScenario` may be available from the complete prefix.

```text
dailyRunRate = evaluatedOrders / elapsedResponsibility
projectedOrders = evaluatedOrders + dailyRunRate * remainingResponsibility
remainingOrders = max(periodTarget - evaluatedOrders, 0)
requiredDailyRate = remainingOrders / remainingResponsibility
```

No division by zero: an ended assignment has no remaining responsibility and `requiredDailyRate=null`. Show “لا وقت متبقٍ” when its target is unmet. Open assignments are explicitly labeled `ContinueCurrentAssignment`; known ended periods use `PeriodEnded`.

Projected attendance extends the observed qualifying rate over remaining full days, retaining partial-day uncertainty. Its amount uses `attendanceBasis=ProjectedAttendance` and labels the reduction as projected. `attendanceRecoverable` shows whether enough potential responsibility remains to reach 85%.

Each suggested money object includes `orderAmount`, `suggestedAmount`, `attendanceReduction`, `attendanceBasis`, `segments`, `provisional=true`, `basis=CompletedOrdersAndWorkingHoursOnly`, `invoiceStatus=PendingExternalInvoice`, and `actualInvoiceAmount=null`.

Collection and signed deduction imports are not subtracted from these suggestions. Fuel support, special bonuses, NAQIL, penalties, refunds and VAT remain outside the estimate until their real invoice workflow is supplied.
