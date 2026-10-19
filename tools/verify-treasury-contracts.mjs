// Read-only DTO compatibility check against the actual .NET checkout.
// Run: node tools/verify-treasury-contracts.mjs "C:/path/to/Logistic ERP"
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";

const backendRoot = process.argv[2] || process.env.LOGISTICS_BACKEND_ROOT;
if (!backendRoot) throw new Error("Pass the backend checkout path as the first argument.");
const backend = readFileSync(resolve(backendRoot, "src/LogisticsERP.Application/Features/Jahez/JahezTreasuryContracts.cs"), "utf8");
const frontend = ts.createSourceFile("types.ts", readFileSync(new URL("../src/lib/jahez/treasury/types.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);

for (const [record, contract] of [
  ["TreasuryAccountPeriod", "TreasuryReportAccountRow"],
  ["TreasuryReport", "TreasuryReport"],
  ["PetroReconciliation", "PetroReconciliationRow"],
  ["TreasuryFilter", "TreasuryFilter"],
  ["TreasuryHandoverPreview", "TreasuryHandoverPreview"],
  ["TreasuryHandoverDetail", "TreasuryHandoverDetail"],
  ["TreasuryHandoverConfirm", "TreasuryHandoverConfirm"],
  ["TreasuryCashCreate", "TreasuryCashEntryCreate"],
  ["TreasuryTransferCreate", "TreasuryTransferCreate"],
  ["PetroEvidenceCreate", "PetroEvidenceCreate"],
]) {
  test(`${contract} matches ${record} JSON field names`, () => {
    const parameters = backend.match(new RegExp(`record ${record}\\(([\\s\\S]*?)\\);`));
    assert.ok(parameters, `Missing backend record ${record}`);
    const expected = parameters[1].split(",").map(parameter => {
      const name = parameter.split("=")[0].trim().split(/\s+/).at(-1);
      return name[0].toLowerCase() + name.slice(1);
    }).sort();
    const declaration = frontend.statements.find(statement => ts.isInterfaceDeclaration(statement) && statement.name.text === contract);
    assert.ok(declaration, `Missing frontend interface ${contract}`);
    const actual = declaration.members.map(member => member.name.getText(frontend)).sort();
    assert.deepEqual(actual, expected);
  });
}

function loadApi() {
  const requests = [];
  const exports = {};
  const mock = {
    authFetch: async (url, init) => { requests.push({ url, init }); return {}; },
    authDownload: async url => { requests.push({ url }); return { blob: "test-blob", fileName: "document" }; },
  };
  const source = readFileSync(new URL("../src/lib/jahez/treasury/api.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  vm.runInNewContext(outputText, {
    exports, Headers, URLSearchParams,
    require: name => {
      if (name === "../../auth/api") return mock;
      if (name === "../../auth/token-store" || name === "./types") return {};
      throw new Error(`Unexpected API dependency ${name}`);
    },
  });
  return { api: exports, requests };
}

test("journal and report calls preserve filters and their endpoint", async () => {
  const { api, requests } = loadApi();
  const filter = { fromDate: "2026-10-01", toDate: "2026-10-19", sponsorId: "sponsor", subAccountId: "account", purpose: 2, page: 3, pageSize: 50 };
  await api.getTreasuryJournal(filter);
  await api.getTreasuryReport("petroapp", filter);
  for (const [index, path] of ["journal", "reports/petroapp"].entries()) {
    const url = new URL(requests[index].url, "https://example.invalid");
    assert.equal(url.pathname, `/api/jahez/v3/treasury/${path}`);
    for (const [key, value] of Object.entries(filter)) assert.equal(url.searchParams.get(key), String(value));
  }
});

test("exports retain filters and a usable extension when the server filename is unavailable", async () => {
  const { api, requests } = loadApi();
  for (const format of ["pdf", "xlsx"]) {
    const download = await api.exportTreasuryReport("petroapp", format, { fromDate: "2026-10-01", toDate: "2026-10-19", sponsorId: "sponsor" });
    assert.ok(download.fileName.endsWith(`.${format}`));
    assert.equal(download.blob, "test-blob");
    const url = new URL(requests.at(-1).url, "https://example.invalid");
    assert.equal(url.searchParams.get("format"), format);
    assert.equal(url.searchParams.get("sponsorId"), "sponsor");
    assert.equal(url.searchParams.has("page"), false);
  }
});

test("handover confirmation sends the exact cash counts, rowversion and retry key", async () => {
  const { api, requests } = loadApi();
  const body = { cashCounts: [{ subAccountId: "fees", amount: 12.5 }, { subAccountId: "settlements", amount: 0 }], reason: "matched", rowVersion: "rowversion" };
  await api.confirmTreasuryHandover("handover", body, "same-retry-key");
  const request = requests[0];
  assert.equal(request.url, "/api/jahez/v3/treasury/handovers/handover/confirm");
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers.get("Idempotency-Key"), "same-retry-key");
  assert.deepEqual(JSON.parse(request.init.body), body);
});
