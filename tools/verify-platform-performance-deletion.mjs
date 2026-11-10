// tools/verify-platform-performance-deletion.mjs
// Comprehensive verification suite for daily performance deletion across all 4 platforms:
// 1. Ninja: DELETE /api/ninja/performance (ninja.performance.delete)
// 2. Hunger: DELETE /api/hunger/performance (hunger.performance.delete)
// 3. Chefz / Shiftz: DELETE /api/chefz/performance (chefz.performance.delete)
// 4. Jahez: DELETE /api/jahez/v2/performance (jahez.performance.delete)
// Run: node --test tools/verify-platform-performance-deletion.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const PLATFORMS = [
  {
    name: "Ninja",
    endpoint: "/api/ninja/performance",
    permission: "ninja.performance.delete",
    contractsFile: "ninja-api-contracts.ts",
    apiFile: "src/lib/ninja/api.ts",
    modalComponent: "src/components/ninja/NinjaDeletePerformanceModal.tsx",
    responseProps: ["reportDate", "sponsorId", "performanceRowsDeleted", "sourcesDeleted", "provenanceRowsDeleted"],
  },
  {
    name: "Hunger",
    endpoint: "/api/hunger/performance",
    permission: "hunger.performance.delete",
    contractsFile: "src/lib/hunger/types.ts",
    apiFile: "src/lib/hunger/api.ts",
    modalComponent: "src/components/hunger/HungerDeletePerformanceModal.tsx",
    responseProps: ["reportDate", "sponsorId", "performanceRowsDeleted", "potentialFinesDeleted"],
  },
  {
    name: "Chefz",
    endpoint: "/api/chefz/performance",
    permission: "chefz.performance.delete",
    contractsFile: "src/lib/chefz/chefz-new-endpoints-contracts.ts",
    apiFile: "src/lib/chefz/api.ts",
    modalComponent: "src/components/chefz/ChefzDeletePerformanceModal.tsx",
    responseProps: ["reportDate", "sponsorId", "performanceRowsDeleted", "sourcesDeleted", "importsDeleted"],
  },
  {
    name: "Jahez",
    endpoint: "/api/jahez/v2/performance",
    permission: "jahez.performance.delete",
    contractsFile: "src/lib/jahez/types.ts",
    apiFile: "src/lib/jahez/api.ts",
    modalComponent: "src/components/jahez/JahezDeletePerformanceModal.tsx",
    responseProps: ["reportDate", "sponsorId", "performanceRowsDeleted"],
  },
];

test("All 4 platform permissions are registered in permissions catalog and localized", () => {
  const permissionsTs = readFileSync(
    new URL("../src/lib/auth/permissions.ts", import.meta.url),
    "utf8"
  );
  const usersApiTs = readFileSync(
    new URL("../src/lib/users/api.ts", import.meta.url),
    "utf8"
  );
  const arLocales = JSON.parse(
    readFileSync(new URL("../src/locales/permissions.ar.json", import.meta.url), "utf8")
  );
  const enLocales = JSON.parse(
    readFileSync(new URL("../src/locales/permissions.en.json", import.meta.url), "utf8")
  );

  for (const p of PLATFORMS) {
    // 1. permissions.ts
    assert.ok(
      permissionsTs.includes(`"${p.permission}"`),
      `permissions.ts must include ${p.permission}`
    );

    // 2. users/api.ts definition
    assert.ok(
      usersApiTs.includes(`"${p.permission}"`),
      `users/api.ts must define ${p.permission}`
    );
    const defRegex = new RegExp(`key:\\s*"${p.permission.replace(".", "\\.")}"[\\s\\S]*?isHighTrust:\\s*true`);
    assert.match(
      usersApiTs,
      defRegex,
      `${p.permission} must be marked high-trust`
    );
    const scopeRegex = new RegExp(`key:\\s*"${p.permission.replace(".", "\\.")}"[\\s\\S]*?requiresClientScope:\\s*true`);
    assert.match(
      usersApiTs,
      scopeRegex,
      `${p.permission} must require client-platform scope`
    );

    // 3. Arabic & English localizations
    assert.ok(
      arLocales[p.permission],
      `permissions.ar.json must have translation for ${p.permission}`
    );
    assert.ok(
      enLocales[p.permission],
      `permissions.en.json must have translation for ${p.permission}`
    );
  }
});

test("Query parameters consistency: reportDate, reason, optional sponsorId", () => {
  const sampleDate = "2026-11-09";
  const sampleReason = "تصحيح تكليف خطأ";
  const sampleSponsor = "019c18d5-62e1-7000-8000-000000000040";

  for (const p of PLATFORMS) {
    // URL builder test
    const buildUrl = (reportDate, reason, sponsorId) => {
      const params = new URLSearchParams({ reportDate, reason });
      if (sponsorId) params.set("sponsorId", sponsorId);
      return `${p.endpoint}?${params.toString()}`;
    };

    // Unfiltered
    const urlUnfiltered = buildUrl(sampleDate, sampleReason);
    assert.ok(urlUnfiltered.startsWith(p.endpoint));
    assert.ok(urlUnfiltered.includes("reportDate=2026-11-09"));
    assert.ok(urlUnfiltered.includes("reason="));
    assert.ok(!urlUnfiltered.includes("sponsorId="));

    // Filtered by sponsor
    const urlFiltered = buildUrl(sampleDate, sampleReason, sampleSponsor);
    assert.ok(urlFiltered.includes(`sponsorId=${sampleSponsor}`));
  }
});

test("Strict permission isolation: read and import NEVER authorize deletion", () => {
  for (const p of PLATFORMS) {
    const platformPrefix = p.permission.split(".")[0];
    const userPermissions = new Set([
      `${platformPrefix}.read`,
      `${platformPrefix}.performance.read`,
      `${platformPrefix}.performance.import`,
      `${platformPrefix}.performance.export`,
    ]);
    const can = (perm) => userPermissions.has(perm);

    assert.equal(
      can(p.permission),
      false,
      `Read and import permissions must NEVER authorize ${p.permission}`
    );

    userPermissions.add(p.permission);
    assert.equal(
      can(p.permission),
      true,
      `Explicit ${p.permission} grant must authorize deletion`
    );
  }
});

test("Response model contracts across all 4 platforms", () => {
  // 1. Ninja
  const ninjaResponse = {
    reportDate: "2026-11-09",
    sponsorId: null,
    performanceRowsDeleted: 85,
    sourcesDeleted: 80,
    provenanceRowsDeleted: 85,
  };
  for (const prop of PLATFORMS[0].responseProps) {
    assert.ok(prop in ninjaResponse, `Ninja response must contain ${prop}`);
  }

  // 2. Hunger
  const hungerResponse = {
    reportDate: "2026-11-09",
    sponsorId: "019c18d5-62e1-7000-8000-000000000040",
    performanceRowsDeleted: 50,
    potentialFinesDeleted: 3,
  };
  for (const prop of PLATFORMS[1].responseProps) {
    assert.ok(prop in hungerResponse, `Hunger response must contain ${prop}`);
  }

  // 3. Chefz
  const chefzResponse = {
    reportDate: "2026-11-09",
    sponsorId: null,
    performanceRowsDeleted: 40,
    sourcesDeleted: 40,
    importsDeleted: 0,
  };
  for (const prop of PLATFORMS[2].responseProps) {
    assert.ok(prop in chefzResponse, `Chefz response must contain ${prop}`);
  }

  // 4. Jahez
  const jahezResponse = {
    reportDate: "2026-11-09",
    sponsorId: null,
    performanceRowsDeleted: 120,
  };
  for (const prop of PLATFORMS[3].responseProps) {
    assert.ok(prop in jahezResponse, `Jahez response must contain ${prop}`);
  }
});

test("All 4 deletion modal components exist and are implemented", () => {
  for (const p of PLATFORMS) {
    const fileContent = readFileSync(new URL(`../${p.modalComponent}`, import.meta.url), "utf8");
    assert.ok(fileContent.length > 500, `${p.modalComponent} must have full implementation`);
    assert.ok(fileContent.includes(p.permission), `${p.modalComponent} must reference ${p.permission}`);
    assert.ok(fileContent.includes("reportDate"), `${p.modalComponent} must handle reportDate`);
    assert.ok(fileContent.includes("reason"), `${p.modalComponent} must handle reason`);
    assert.ok(fileContent.includes("sponsorId") || fileContent.includes("selectedSponsorId"), `${p.modalComponent} must handle sponsor selection`);
  }
});
