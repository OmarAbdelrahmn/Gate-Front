// Frontend verification and contract test suite for Ninja performance evaluation and suggested earnings.
// Run: node --test tools/verify-ninja-evaluation.mjs
import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";

function loadEvaluationClientModule() {
  const requests = [];
  const exports = {};
  const mockAuthApi = {
    authFetch: async (url, init) => {
      requests.push({ type: "json", url, init });
      return { ok: true };
    },
    authDownload: async (url) => {
      requests.push({ type: "blob", url });
      return { blob: "mock-xlsx-blob", fileName: "document" };
    },
  };

  const source = readFileSync(
    new URL("../src/lib/ninja/evaluation-client.ts", import.meta.url),
    "utf8"
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });

  vm.runInNewContext(outputText, {
    exports,
    Headers,
    URLSearchParams,
    FormData,
    File,
    Blob,
    Date,
    Intl,
    Math,
    Number,
    String,
    Object,
    Array,
    Map,
    Set,
    require: (name) => {
      if (name === "../auth/api") return mockAuthApi;
      if (name === "./evaluation-contracts") return {};
      throw new Error(`Unexpected module import: ${name}`);
    },
  });

  return { mod: exports, requests };
}

test("Authoritative TypeScript contracts match Docs/contracts.ts exactly", () => {
  const docsContracts = ts.createSourceFile(
    "docs-contracts.ts",
    readFileSync(new URL("../Docs/contracts.ts", import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true
  );
  const appContracts = ts.createSourceFile(
    "evaluation-contracts.ts",
    readFileSync(
      new URL("../src/lib/ninja/evaluation-contracts.ts", import.meta.url),
      "utf8"
    ),
    ts.ScriptTarget.Latest,
    true
  );

  const docsInterfaces = docsContracts.statements.filter(
    ts.isInterfaceDeclaration
  );
  assert.ok(docsInterfaces.length >= 20, "Expected at least 20 interfaces in Docs/contracts.ts");

  for (const docsIface of docsInterfaces) {
    const name = docsIface.name.text;
    const appIface = appContracts.statements.find(
      (s) => ts.isInterfaceDeclaration(s) && s.name.text === name
    );
    assert.ok(appIface, `Missing interface ${name} in src/lib/ninja/evaluation-contracts.ts`);

    const expectedMembers = docsIface.members
      .map((m) => m.name.getText(docsContracts))
      .sort();
    const actualMembers = appIface.members
      .map((m) => m.name.getText(appContracts))
      .sort();
    assert.deepEqual(
      actualMembers,
      expectedMembers,
      `Interface ${name} member mismatch`
    );
  }
});

test("Evaluation client combines all filters with AND and preserves query parameters", async () => {
  const { mod, requests } = loadEvaluationClientModule();
  const query = {
    year: 2026,
    month: 10,
    asOf: "2026-10-24",
    view: "riders",
    accountId: "acc-guid-1",
    riderId: "rider-guid-1",
    cityId: "city-guid-1",
    sponsorId: "sponsor-guid-1",
    pricingType: "BIKE",
    status: "BelowTarget",
    search: "CAP-991",
    page: 2,
    pageSize: 50,
  };

  await mod.ninjaEvaluationClient.evaluate(query);
  assert.equal(requests.length, 1);
  const url = new URL(requests[0].url, "https://example.invalid");
  assert.equal(url.pathname, "/api/ninja/evaluation");
  for (const [k, v] of Object.entries(query)) {
    assert.equal(url.searchParams.get(k), String(v));
  }
});

test("Full evaluation loads every supported API page and preserves filters and order", async () => {
  const { mod } = loadEvaluationClientModule();
  const requests = [];
  const query = { year: 2026, month: 10, status: "BelowTarget", sponsorId: "sponsor-1", page: 4, pageSize: 25 };
  const report = await mod.loadAllNinjaEvaluation(query, async (request) => {
    requests.push(request);
    const start = (request.page - 1) * 100;
    return {
      page: request.page, pageSize: 100,
      summary: { totalRows: 203, observedOrders: 999 },
      items: Array.from({ length: Math.min(100, 203 - start) }, (_, index) => ({ key: String(start + index) })),
    };
  });
  assert.equal(report.items.length, 203);
  assert.equal(report.items[202].key, "202");
  assert.equal(report.summary.observedOrders, 999);
  assert.deepEqual(requests.map(r => r.page), [1, 2, 3]);
  assert.ok(requests.every(r => r.pageSize === 100 && r.sponsorId === "sponsor-1" && r.status === "BelowTarget"));
});

test("Full evaluation never reports a partial or changing result as complete", async () => {
  const { mod } = loadEvaluationClientModule();
  const query = { year: 2026, month: 10 };
  await assert.rejects(() => mod.loadAllNinjaEvaluation(query, async ({ page }) => ({
    page, pageSize: 100, summary: { totalRows: page === 1 ? 101 : 102 },
    items: Array.from({ length: page === 1 ? 100 : 1 }, (_, index) => ({ key: `${page}-${index}` })),
  })), /changed while loading/);
  await assert.rejects(() => mod.loadAllNinjaEvaluation(query, async () => ({
    page: 1, pageSize: 100, summary: { totalRows: 10 }, items: [{ key: "only-one" }],
  })), /complete evaluation could not be loaded/);
});

test("URL searchParams serialization and parsing round-trips all filters cleanly", () => {
  const { mod } = loadEvaluationClientModule();
  const original = {
    year: 2026,
    month: 10,
    asOf: "2026-10-24",
    view: "accounts",
    accountId: "acc-123",
    riderId: "rider-456",
    cityId: "city-789",
    sponsorId: "sponsor-321",
    pricingType: "CAR",
    status: "TargetAchieved",
    search: "أحمد",
    page: 3,
    pageSize: 25,
  };

  const searchParams = mod.buildEvaluationUrlSearchParams(original);
  const parsed = mod.parseEvaluationQueryFromSearchParams(searchParams, {
    year: 2026,
    month: 1,
  });

  assert.deepEqual(JSON.parse(JSON.stringify(parsed)), original);
});

test("Permissions are strictly enforced and never inferred from ninja.read", () => {
  const { mod } = loadEvaluationClientModule();

  // 1. User with ONLY ninja.read
  const readOnlyPerms = mod.resolveNinjaEvaluationPermissions(
    (p) => p === "ninja.read"
  );
  assert.equal(readOnlyPerms.canRead, true);
  assert.equal(
    readOnlyPerms.canImport,
    false,
    "ninja.read must NEVER grant ninja.performance.import"
  );
  assert.equal(
    readOnlyPerms.canManage,
    false,
    "ninja.read must NEVER grant ninja.evaluation.manage"
  );
  assert.equal(
    readOnlyPerms.canExport,
    false,
    "ninja.read alone must NEVER grant export"
  );

  // 2. User with ninja.evaluation.export but WITHOUT ninja.read
  const exportWithoutRead = mod.resolveNinjaEvaluationPermissions(
    (p) => p === "ninja.evaluation.export"
  );
  assert.equal(
    exportWithoutRead.canExport,
    false,
    "Export requires BOTH ninja.read AND ninja.evaluation.export"
  );

  // 3. User with BOTH ninja.read AND ninja.evaluation.export
  const exportWithRead = mod.resolveNinjaEvaluationPermissions(
    (p) => p === "ninja.read" || p === "ninja.evaluation.export"
  );
  assert.equal(exportWithRead.canExport, true);

  // 4. User with ninja.performance.import
  const importPerms = mod.resolveNinjaEvaluationPermissions(
    (p) => p === "ninja.performance.import"
  );
  assert.equal(importPerms.canImport, true);
  assert.equal(importPerms.canManage, false);
});

test("Money and metric formatters never display 0 for null/unknown values and preserve required labels", () => {
  const { mod } = loadEvaluationClientModule();

  // Null must never format as 0
  const nullMoneyAr = mod.formatSuggestedCurrency(null, "ar");
  const nullMoneyEn = mod.formatSuggestedCurrency(null, "en");
  assert.ok(!nullMoneyAr.includes("0"), "Null money in Arabic must not display 0");
  assert.ok(!nullMoneyEn.includes("0"), "Null money in English must not display 0");
  assert.equal(nullMoneyAr, "غير متاح / غير محسوم");

  // Confirmed 0 formats as 0.00
  const zeroMoneyEn = mod.formatSuggestedCurrency(0, "en");
  assert.equal(zeroMoneyEn, "0.00 SAR");

  // Ended assignment with unmet target (requiredDailyRate = null, remainingOrders > 0) -> "لا وقت متبقٍ"
  const endedUnmetAr = mod.formatRequiredDailyRate(null, 45, "ar");
  assert.ok(endedUnmetAr.includes("لا وقت متبقٍ"));

  // Required English and Arabic labels exist
  assert.equal(
    mod.NINJA_EVALUATION_REQUIRED_LABELS.en.suggestedThroughCutoff("2026-10-24"),
    "Suggested amount through 2026-10-24"
  );
  assert.equal(
    mod.NINJA_EVALUATION_REQUIRED_LABELS.en.projectedAmountIfPaceContinues,
    "Projected amount if current pace continues"
  );
  assert.equal(
    mod.NINJA_EVALUATION_REQUIRED_LABELS.en.basedOnOrdersAndHoursOnly,
    "Based on orders and hours only"
  );
  assert.equal(
    mod.NINJA_EVALUATION_REQUIRED_LABELS.en.invoicePending,
    "Awaiting Ninja’s monthly invoice"
  );
  assert.equal(
    mod.NINJA_EVALUATION_REQUIRED_LABELS.ar.suggestedThroughCutoff,
    "المبلغ المقترح حتى حد البيانات"
  );
  assert.equal(
    mod.NINJA_EVALUATION_REQUIRED_LABELS.ar.projectedAmountIfPaceContinues,
    "المبلغ المتوقع إذا استمر المعدل الحالي"
  );
  assert.equal(
    mod.NINJA_EVALUATION_REQUIRED_LABELS.ar.orderAmountBeforeAttendance,
    "الاقتراح حسب الطلبات قبل تعديل الحضور"
  );
  assert.equal(
    mod.NINJA_EVALUATION_REQUIRED_LABELS.ar.attendanceReduction15,
    "تخفيض تقديري للحضور 15%"
  );
  assert.equal(
    mod.NINJA_EVALUATION_REQUIRED_LABELS.ar.invoicePending,
    "بانتظار فاتورة نينجا الشهرية"
  );
});

test("Day detail, policy, context, responsibility, snapshot, export, and staged import endpoints match API contract", async () => {
  const { mod, requests } = loadEvaluationClientModule();

  // 1. Day detail
  await mod.ninjaEvaluationClient.day("acc-1", "2026-10-14");
  assert.equal(
    requests.at(-1).url,
    "/api/ninja/evaluation/accounts/acc-1/days/2026-10-14"
  );

  // 2. Policy
  await mod.ninjaEvaluationClient.policy();
  assert.equal(requests.at(-1).url, "/api/ninja/evaluation/policy");

  // 3. Context GET & PUT
  await mod.ninjaEvaluationClient.context("acc-1");
  assert.equal(requests.at(-1).url, "/api/ninja/evaluation/accounts/acc-1/context");

  const contextPayload = {
    expectedRevisionId: "rev-1",
    confirmedFirstDeliveryDate: "2026-10-01",
    pricingPeriods: [{ from: "2026-10-01", to: "2026-10-31", pricingType: "BIKE" }],
    reason: "Verified pricing",
    reviewedSnapshotId: null,
  };
  await mod.ninjaEvaluationClient.setContext("acc-1", contextPayload);
  assert.equal(requests.at(-1).init.method, "PUT");
  assert.deepEqual(JSON.parse(requests.at(-1).init.body), contextPayload);

  // 4. Responsibility GET & PUT
  await mod.ninjaEvaluationClient.responsibility("acc-1", 2026, 10);
  assert.equal(
    requests.at(-1).url,
    "/api/ninja/evaluation/accounts/acc-1/responsibility?year=2026&month=10"
  );

  const respPayload = {
    year: 2026,
    month: 10,
    expectedRevisionId: null,
    lines: [
      { assignmentId: "a1", date: "2026-10-14", weight: 0.5 },
      { assignmentId: "a2", date: "2026-10-14", weight: 0.5 },
    ],
    reason: "Handover split",
    reviewedSnapshotId: null,
  };
  await mod.ninjaEvaluationClient.setResponsibility("acc-1", respPayload);
  assert.equal(requests.at(-1).init.method, "PUT");
  assert.deepEqual(JSON.parse(requests.at(-1).init.body), respPayload);

  // 5. Export full filtered result
  const exp = await mod.downloadNinjaEvaluationExport({
    year: 2026,
    month: 10,
    view: "riders",
    sponsorId: "sp-1",
  });
  assert.ok(exp.fileName.endsWith(".xlsx"));
  assert.equal(
    requests.at(-1).url,
    "/api/ninja/evaluation/export?year=2026&month=10&view=riders&sponsorId=sp-1"
  );

  // 6. Staged Import Template, Preview, and Confirm
  await mod.downloadNinjaImportTemplate("MultiDay");
  assert.equal(
    requests.at(-1).url,
    "/api/ninja/performance/imports/template?mode=MultiDay"
  );

  const dummyFile = new File(["Captain ID,Total Orders,Total Working Hours\nC1,15,8.5"], "oct.csv", {
    type: "text/csv",
  });
  await mod.ninjaEvaluationClient.preview(dummyFile, {
    mode: "Daily",
    reportDate: "2026-10-24",
    hoursUnit: "DecimalHours",
    dateFormat: "yyyy-MM-dd",
  });
  assert.equal(requests.at(-1).url, "/api/ninja/performance/imports/preview");
  assert.equal(requests.at(-1).init.method, "POST");
  assert.ok(requests.at(-1).init.body instanceof FormData);
  assert.equal(requests.at(-1).init.body.get("mode"), "Daily");
  assert.equal(requests.at(-1).init.body.get("reportDate"), "2026-10-24");

  await mod.ninjaEvaluationClient.confirm("prev-guid-99", dummyFile);
  assert.equal(
    requests.at(-1).url,
    "/api/ninja/performance/imports/prev-guid-99/confirm"
  );
  assert.equal(requests.at(-1).init.method, "POST");
  assert.ok(requests.at(-1).init.body instanceof FormData);
});

test("Subrow breakdown groups multi-account or multi-assignment rider days accurately", () => {
  const { mod } = loadEvaluationClientModule();
  const sampleRow = {
    key: "rider-1",
    accountIds: ["acc-1", "acc-2"],
    captainIds: ["CAP-1", "CAP-2"],
    assignmentIds: ["asg-1", "asg-2"],
    days: [
      {
        date: "2026-10-01",
        accountId: "acc-1",
        captainId: "CAP-1",
        assignmentId: "asg-1",
        pricingType: "BIKE",
        responsibility: 1,
        orders: 16,
        hours: 8.5,
        target: 15,
        gap: 1,
        hoursStatus: "Qualified",
        coverage: "Complete",
      },
      {
        date: "2026-10-15",
        accountId: "acc-2",
        captainId: "CAP-2",
        assignmentId: "asg-2",
        pricingType: "CAR",
        responsibility: 1,
        orders: 18,
        hours: 9.0,
        target: 15.33,
        gap: 2.67,
        hoursStatus: "Qualified",
        coverage: "Complete",
      },
    ],
  };

  const subrows = mod.buildRowBreakdownSubrows(sampleRow);
  assert.equal(subrows.length, 2);
  assert.equal(subrows[0].captainId, "CAP-1");
  assert.deepEqual([...subrows[0].pricingTypes], ["BIKE"]);
  assert.equal(subrows[0].totalOrders, 16);
  assert.equal(subrows[1].captainId, "CAP-2");
  assert.deepEqual([...subrows[1].pricingTypes], ["CAR"]);
  assert.equal(subrows[1].totalOrders, 18);
});

test("Error handling maps 409 ninja.preview_stale and ninja.preview_expired and preview status metadata", () => {
  const { mod } = loadEvaluationClientModule();

  // Check preview row status metadata
  const newMeta = mod.getPreviewRowStatusMeta("New", "ar");
  assert.equal(newMeta.isBlocking, false);

  const identicalMeta = mod.getPreviewRowStatusMeta("Identical", "en");
  assert.equal(identicalMeta.isBlocking, false);

  for (const blockingStatus of [
    "Conflict",
    "UnknownAccount",
    "UnresolvedAllocation",
    "Invalid",
  ]) {
    const meta = mod.getPreviewRowStatusMeta(blockingStatus, "ar");
    assert.equal(
      meta.isBlocking,
      true,
      `Expected ${blockingStatus} to be blocking`
    );
  }

  // Verify getFriendlyErrorMessage in src/lib/auth/api.ts handles ninja.preview_stale and ninja.preview_expired
  const authApiSource = readFileSync(
    new URL("../src/lib/auth/api.ts", import.meta.url),
    "utf8"
  );
  assert.ok(
    authApiSource.includes('"ninja.preview_stale"'),
    "src/lib/auth/api.ts must handle ninja.preview_stale"
  );
  assert.ok(
    authApiSource.includes('"ninja.preview_expired"'),
    "src/lib/auth/api.ts must handle ninja.preview_expired"
  );
});
