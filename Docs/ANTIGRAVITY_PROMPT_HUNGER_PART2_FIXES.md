# Prompt for Antigravity — HungerStation part 2 fixes

Copy everything below the line into Antigravity (agent mode).

---

Review found that some part 2 screens read field names the backend does **not** send, so they will show blanks or wrong paging against the real API. Fix only these points. Same rules as before: frontend only, only `src/lib/hunger/*` and `src/app/admin/hunger/**`, no `any`, no eslint-disable, don't commit. Keep `npx tsc --noEmit` and `npx eslint src/app/admin/hunger src/lib/hunger` at 0 errors.

These are the **exact** backend response shapes (JSON is camelCase):

```
HungerPerformanceReport {
  items: HungerPerformanceRow[],
  totalRecords: number,          // NOT totalCount
  completedOrders: number,       // grand totals for the full filtered range
  workingHours: number,
  distinctAccounts: number,      // NOT distinctAccountsCount
  distinctRiders: number,        // NOT distinctRidersCount
  groupBy: "account" | "rider",
  period: "day" | "month",
  layout: "vertical" | "horizontal"
}

HungerPerformanceRow {
  entityId: string,              // accountId when groupBy=account, riderProfileId when groupBy=rider
  period: string,                // "YYYY-MM-DD" (day) or first day of month (month)
  completedOrders: number, workingHours: number,
  workedDays: number, qualifiedDays: number, unknownDays: number,
  scheduledDays: number, elapsedDays: number, remainingDays: number,
  acceptedOrders: number | null, stackedOrders: number | null,
  rejectedOrders: number | null, cancelledOrders: number | null, noShowCount: number | null,
  sponsorship: string, actualVehicle: string, actualVehicleType: string,
  target: number | null, deficit: number | null, targetAchieved: boolean | null,
  forecast: number | null, requiredPace: number | null, forecastObservedOrders: number,
  coverageThrough: string,       // per row, NOT on the report
  alerts: string[],
  catalog: { ruleId, code, kind, metric, period, actual: number | null, threshold, matches: boolean, severity, evidence }[]
}

HungerWalletHistory {
  events: [...], observations: [...],
  totalEvents: number, totalObservations: number,   // use these for the two pagers
  page: number, pageSize: number
}
```

## Fixes

1. **`getHungerPerformanceReport` in `src/lib/hunger/api.ts`**: read `totalRecords`, `distinctAccounts`, `distinctRiders`, and the grand totals `completedOrders` / `workingHours` (map them into the existing `totals` the tab shows). Update `HungerPerformanceRowItem` / report types in `types.ts` to the shape above. Remove fields the backend never sends (`periods`, `cells`, `periodKeys`, `mandatoryDays*`, report-level `coverageThrough`) instead of keeping dead fallbacks.

2. **Row identity and labels** (`PerformanceReportTab.tsx`): the row has only `entityId`. Use `entityId` for the React key together with `period`. For the label, look the id up client-side: when `groupBy=account` use the Hunger accounts list (`getAllHungerAccounts`, already in api.ts) → show external account ID + owner name; when `groupBy=rider` match `entityId` against the accounts' `actualRider.riderProfileId` / `sourceActualRider.riderProfileId` → show rider name. Load that lookup once per tab visit (cache it), and fall back to the short id if not found.

3. **Period column**: use `row.period` (format as date for day, `YYYY-MM` for month).

4. **Horizontal layout**: the backend returns flat rows (one per entity per period); layout is only a display hint. Build the horizontal table client-side: group rows by `entityId`, columns = sorted distinct `period` values, each cell shows the chosen metric (add a small selector: completed orders / hours / worked days). Vertical layout = the flat rows as they are.

5. **Coverage**: show `row.coverageThrough` per row (and in the header show the earliest coverageThrough across the loaded rows). Forecast "لا يوجد توقع موثوق" when `forecast` is null.

6. **Mandatory days**: the backend reports these inside `alerts` (strings) and `catalog` (code/metric). Show mandatory-day and missing-coverage alerts by filtering `alerts` / `catalog` entries whose code or text mentions MandatoryDays / coverage, instead of the non-existent `mandatoryDays` array.

7. **Wallet history** (`WalletsTab.tsx` + `getHungerWalletHistory`): use `totalEvents` and `totalObservations` for the two pagers.

8. Write a short report of what you changed.
