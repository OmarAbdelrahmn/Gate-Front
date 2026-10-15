# Chefz accounts response counts

`GET /api/chefz/accounts?page=1&pageSize=50` retains `items`, `page`, and `pageSize`, and adds `totalCount`, `summary`, and `sponsors`. Existing account items keep their fields. This is a backend-only change.

Counts cover the complete non-deleted Chefz account set across CHEFZ/THECHEFZ/CHEFSZ/SHIFTZ, independently of pagination. The summary also appears when the requested page is empty. Archived lifecycle accounts remain included; soft-deleted accounts and other platforms are excluded.

Example shape (counts are illustrative):

```json
{
  "items": [],
  "page": 100,
  "pageSize": 50,
  "totalCount": 4,
  "summary": {
    "total": 4,
    "taken": 2,
    "notTaken": 2,
    "available": 1,
    "assigned": 1,
    "suspended": 1,
    "retired": 0,
    "archived": 1
  },
  "sponsors": [
    {
      "sponsorId": "<sponsor GUID>",
      "sponsorNameAr": "اسم الكفيل",
      "sponsorNameEn": "Sponsor name",
      "counts": {
        "total": 3,
        "taken": 2,
        "notTaken": 1,
        "available": 1,
        "assigned": 1,
        "suspended": 1,
        "retired": 0,
        "archived": 0
      }
    },
    {
      "sponsorId": null,
      "sponsorNameAr": "خارج الكفالة",
      "sponsorNameEn": null,
      "counts": {
        "total": 1,
        "taken": 0,
        "notTaken": 1,
        "available": 0,
        "assigned": 0,
        "suspended": 0,
        "retired": 0,
        "archived": 1
      }
    }
  ]
}
```

- `taken` counts distinct accounts with a non-deleted rider assignment where `effectiveTo == null`, including links retained while the account is Suspended, Retired, or Archived. Date-closed links do not count. Duplicate open links cannot inflate the account count.
- `notTaken` is `total - taken`; it does not imply the account is available to assign.
- `available`, `assigned`, `suspended`, `retired`, and `archived` count the lifecycle `status`, independently of rider linkage. Their sum is `total`.
- Sponsor grouping uses the account's `sponsorId`, rather than the current rider's HR sponsor. Only sponsors with Chefz accounts are included. Accounts without a sponsor form the null-ID group. If a referenced sponsor is soft deleted, its account group retains the sponsor ID and uses the fallback Arabic label كفيل غير متاح.
- An empty Chefz dataset returns zero counts and an empty sponsors array.

The existing `chefz.read` permission, platform scope checks, page validation (page size 1–100), and Problem Details behavior remain in effect. The counts are computed from current account/assignment data on every request; they do not use manually entered sponsor workbook statistics. Queries run sequentially without a snapshot transaction, so a simultaneous edit can appear between the page and aggregate queries; refetch after a write when a synchronized screen is needed.

The aggregation runs in SQL and materializes grouped counts rather than every account. The sponsor list is ordered by Arabic name, then ID. No schema migration is required.

Verification: the final solution build succeeded with zero warnings and zero errors. All 46 runnable Chefz workflow checks passed, with seven optional checks skipped. Coverage includes the four Chefz platform codes, all lifecycle statuses, sponsor/no-sponsor grouping, taken versus Assigned, duplicate and soft-deleted links, other-platform/deleted-account exclusion, empty datasets/pages, changing a status, permission/pagination validation, and SQL Server query translation (`GROUP BY`, distinct account IDs and a left join). SQL execution remains unavailable because LocalDB fails to start. Test commands use isolated build output and the existing dependency-audit workaround documented in [status control](chefz-account-status-control.md).
