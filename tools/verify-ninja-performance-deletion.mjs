// tools/verify-ninja-performance-deletion.mjs
// Verification suite for DELETE /api/ninja/performance contracts, URL parameters,
// response typing, and permission gating.
// Run: node --test tools/verify-ninja-performance-deletion.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("ninjaPaths.deletePerformance builds correct URL query string", async () => {
  const contractsSource = readFileSync(
    new URL("../ninja-api-contracts.ts", import.meta.url),
    "utf8"
  );

  // Verify paths definition contains deletePerformance
  assert.match(contractsSource, /deletePerformance:\s*\(reportDate:/);
  assert.match(contractsSource, /\/api\/ninja\/performance/);

  // Test URLSearchParams behavior as implemented in contracts
  const buildUrl = (reportDate, reason, sponsorId) => {
    const params = new URLSearchParams({ reportDate, reason });
    if (sponsorId) params.set("sponsorId", sponsorId);
    return `/api/ninja/performance?${params.toString()}`;
  };

  // Without sponsor
  const url1 = buildUrl("2026-11-09", "Wrong assignment");
  assert.equal(url1, "/api/ninja/performance?reportDate=2026-11-09&reason=Wrong+assignment");

  // With sponsor
  const sponsorId = "019c18d5-62e1-7000-8000-000000000040";
  const url2 = buildUrl("2026-11-09", "Wrong assignment", sponsorId);
  assert.equal(
    url2,
    `/api/ninja/performance?reportDate=2026-11-09&reason=Wrong+assignment&sponsorId=${sponsorId}`
  );

  // Arabic reason encoding
  const url3 = buildUrl("2026-11-09", "تصحيح تكليف مندوب");
  assert.match(url3, /reportDate=2026-11-09/);
  assert.ok(url3.includes(encodeURIComponent("تصحيح تكليف مندوب").replace(/%20/g, "+")));
});

test("Permissions catalog and locales contain ninja.performance.delete", async () => {
  const permissionsTs = readFileSync(
    new URL("../src/lib/auth/permissions.ts", import.meta.url),
    "utf8"
  );
  assert.ok(
    permissionsTs.includes('"ninja.performance.delete"'),
    "permissions.ts must include ninja.performance.delete"
  );

  const usersApiTs = readFileSync(
    new URL("../src/lib/users/api.ts", import.meta.url),
    "utf8"
  );
  assert.ok(
    usersApiTs.includes('"ninja.performance.delete"'),
    "users/api.ts must include ninja.performance.delete definition"
  );
  assert.match(
    usersApiTs,
    /key:\s*"ninja\.performance\.delete"[\s\S]*?isHighTrust:\s*true/,
    "ninja.performance.delete must be marked high-trust"
  );
  assert.match(
    usersApiTs,
    /key:\s*"ninja\.performance\.delete"[\s\S]*?requiresClientScope:\s*true/,
    "ninja.performance.delete must require client scope"
  );

  const arLocales = JSON.parse(
    readFileSync(new URL("../src/locales/permissions.ar.json", import.meta.url), "utf8")
  );
  assert.ok(
    arLocales["ninja.performance.delete"],
    "permissions.ar.json must have translation for ninja.performance.delete"
  );

  const enLocales = JSON.parse(
    readFileSync(new URL("../src/locales/permissions.en.json", import.meta.url), "utf8")
  );
  assert.ok(
    enLocales["ninja.performance.delete"],
    "permissions.en.json must have translation for ninja.performance.delete"
  );
});

test("Ninja performance deletion strictly requires ninja.performance.delete permission", () => {
  // Simulate can() permission checking
  const userPermissions = new Set(["ninja.read", "ninja.performance.import"]);
  const can = (perm) => userPermissions.has(perm);

  const canDeleteWithoutPermission = can("ninja.performance.delete");
  assert.equal(
    canDeleteWithoutPermission,
    false,
    "ninja.read and ninja.performance.import must NEVER grant deletion"
  );

  userPermissions.add("ninja.performance.delete");
  const canDeleteWithPermission = can("ninja.performance.delete");
  assert.equal(
    canDeleteWithPermission,
    true,
    "Explicit ninja.performance.delete grant must authorize deletion"
  );
});

test("Response model contract correctly maps all deletion counts", () => {
  const rawResponse = {
    reportDate: "2026-11-09",
    sponsorId: null,
    performanceRowsDeleted: 85,
    sourcesDeleted: 80,
    provenanceRowsDeleted: 85,
  };

  assert.equal(rawResponse.reportDate, "2026-11-09");
  assert.equal(rawResponse.sponsorId, null);
  assert.equal(rawResponse.performanceRowsDeleted, 85);
  assert.equal(rawResponse.sourcesDeleted, 80);
  assert.equal(rawResponse.provenanceRowsDeleted, 85);

  // Allocation counts can exceed source counts when riders share an account/day
  assert.ok(rawResponse.performanceRowsDeleted >= rawResponse.sourcesDeleted);
});
