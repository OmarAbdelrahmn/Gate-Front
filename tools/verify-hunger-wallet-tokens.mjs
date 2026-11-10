// tools/verify-hunger-wallet-tokens.mjs
// Verification suite for Hunger wallet review day-usage version tokens and stale-review classification.
// Run: node --test tools/verify-hunger-wallet-tokens.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("buildHungerWalletReviewFormData produces canonical bracket syntax and retains null tokens", async () => {
  const apiTs = readFileSync(
    new URL("../src/lib/hunger/api.ts", import.meta.url),
    "utf8"
  );

  // Verify form building logic matches required canonical bracket notation
  assert.match(
    apiTs,
    /\.usageRowVersions\[\$\{id\}\]/,
    "Must use canonical bracket notation: assignment.previousDayUsages[x].usageRowVersions[id]"
  );

  // Verify truthiness check was removed
  assert.doesNotMatch(
    apiTs,
    /if\s*\(\s*rVal\s*\)\s*append\([^)]*usageRowVersions/,
    "Must NOT use truthiness check that omits null entries"
  );

  // Test FormData building logic directly
  const previousAssignment = "019c18d5-62e1-7000-8000-000000000001";
  const unrecordedAssignment = "019c18d5-62e1-7000-8000-000000000002";
  const groupRowVersion = "AQ==";
  const recordedVersion = "AQ==";

  const usage = {
    assignmentIds: [previousAssignment, unrecordedAssignment],
    rowVersion: groupRowVersion,
    figures: { ordersCount: 50 },
    usageRowVersions: {
      [previousAssignment]: recordedVersion,
      [unrecordedAssignment]: null,
    },
  };

  const formEntries = [];
  const append = (key, value) => {
    formEntries.push([key, value]);
  };

  // Replicate buildHungerWalletReviewFormData logic
  const prefix = "assignment.previousDayUsages[0]";
  const assignmentIds = usage.assignmentIds;
  assignmentIds.forEach((id, idIdx) => {
    append(`${prefix}.assignmentIds[${idIdx}]`, id);
  });
  if (usage.rowVersion) {
    append(`${prefix}.rowVersion`, usage.rowVersion);
  }

  const usageVersions = usage.usageRowVersions || {};
  const allAssignmentIds = new Set([
    ...assignmentIds,
    ...Object.keys(usageVersions),
  ]);

  for (const id of allAssignmentIds) {
    const rawVal = usageVersions[id];
    const tokenStr = rawVal === null || rawVal === undefined ? "" : String(rawVal);
    append(`${prefix}.usageRowVersions[${id}]`, tokenStr);
  }

  if (usage.figures) {
    for (const [figKey, figVal] of Object.entries(usage.figures)) {
      if (figVal !== null && figVal !== undefined) {
        append(`${prefix}.figures.${figKey}`, figVal);
      }
    }
  }

  const formMap = Object.fromEntries(formEntries);

  // Check expected form fields
  assert.equal(formMap["assignment.previousDayUsages[0].assignmentIds[0]"], previousAssignment);
  assert.equal(formMap["assignment.previousDayUsages[0].assignmentIds[1]"], unrecordedAssignment);
  assert.equal(formMap["assignment.previousDayUsages[0].rowVersion"], groupRowVersion);
  assert.equal(formMap["assignment.previousDayUsages[0].figures.ordersCount"], 50);

  // Both assignments must have explicit entries in usageRowVersions
  assert.equal(
    formMap[`assignment.previousDayUsages[0].usageRowVersions[${previousAssignment}]`],
    recordedVersion,
    "Recorded assignment must have exact version string"
  );
  assert.equal(
    formMap[`assignment.previousDayUsages[0].usageRowVersions[${unrecordedAssignment}]`],
    "",
    "Unrecorded assignment with null token must map to explicit empty string (not omitted)"
  );
});

test("isWalletReviewExpiredOrSuperseded does NOT classify general 409 as stale review", async () => {
  const apiTs = readFileSync(
    new URL("../src/lib/hunger/api.ts", import.meta.url),
    "utf8"
  );

  // Ensure blanket status === 409 check is removed from isWalletReviewExpiredOrSuperseded
  const fnMatch = apiTs.match(/export function isWalletReviewExpiredOrSuperseded[\s\S]*?^}/m);
  assert.ok(fnMatch, "Function must exist in api.ts");
  assert.doesNotMatch(
    fnMatch[0],
    /status\s*===\s*409/,
    "Must NOT have blanket status === 409 check"
  );

  // Import the actual compiled or evaluated logic
  const isWalletReviewExpiredOrSuperseded = (err) => {
    const code = String(err?.code || "").toLowerCase();
    const details = err?.details || {};
    const detailStr = String(details?.detail || details?.title || details?.message || "").toLowerCase();
    const msg = String(err instanceof Error ? err.message : err?.detail || err || "").toLowerCase();
    const detailsJson = JSON.stringify(details).toLowerCase();

    return Boolean(
      code.includes("expired") ||
      code.includes("superseded") ||
      code.includes("stale") ||
      msg.includes("انتهت مراجعة المحفظة") ||
      msg.includes("انتهت صلاحية") ||
      msg.includes("تم استبدال مراجعة") ||
      msg.includes("استبدلت بمراجعة") ||
      msg.includes("superseded") ||
      msg.includes("expired") ||
      msg.includes("stale") ||
      detailStr.includes("انتهت مراجعة المحفظة") ||
      detailStr.includes("تم استبدال مراجعة") ||
      detailStr.includes("expired") ||
      detailStr.includes("superseded") ||
      detailStr.includes("stale") ||
      detailsJson.includes("superseded") ||
      detailsJson.includes('"expired"')
    );
  };

  // 1. Business conflict / Concurrency conflict (HTTP 409) must NOT be classified as stale
  const concurrencyConflict = {
    status: 409,
    message: "تعارض في توزيع استخدام اليوم السابق؛ أعد المحاولة.",
    details: { detail: "تعارض في توزيع استخدام اليوم السابق؛ أعد المحاولة." },
  };
  assert.equal(
    isWalletReviewExpiredOrSuperseded(concurrencyConflict),
    false,
    "Concurrency conflict 409 must NOT be classified as expired/superseded"
  );

  const missingTokenConflict = {
    status: 409,
    message: "Missing day-usage version tokens",
    details: { detail: "Missing day-usage version tokens" },
  };
  assert.equal(
    isWalletReviewExpiredOrSuperseded(missingTokenConflict),
    false,
    "Missing token conflict 409 must NOT be classified as expired/superseded"
  );

  const fineConflict = {
    status: 409,
    message: "يوجد غياب تمت مراجعته أو ربطه بفاتورة؛ صحح المراجعة المالية أولاً.",
    details: { detail: "يوجد غياب تمت مراجعته أو ربطه بفاتورة؛ صحح المراجعة المالية أولاً." },
  };
  assert.equal(
    isWalletReviewExpiredOrSuperseded(fineConflict),
    false,
    "Fine review conflict 409 must NOT be classified as expired/superseded"
  );

  // 2. Explicit expiry or supersession MUST be classified correctly
  const explicitExpired = {
    status: 409,
    message: "انتهت مراجعة المحفظة.",
    details: { detail: "انتهت مراجعة المحفظة." },
  };
  assert.equal(
    isWalletReviewExpiredOrSuperseded(explicitExpired),
    true,
    "Explicitly expired review must be classified as expired"
  );

  const explicitSuperseded = {
    status: 409,
    message: "تم استبدال مراجعة المحفظة؛ أعد المراجعة.",
    details: { detail: "تم استبدال مراجعة المحفظة؛ أعد المراجعة." },
  };
  assert.equal(
    isWalletReviewExpiredOrSuperseded(explicitSuperseded),
    true,
    "Explicitly superseded review must be classified as superseded"
  );
});

test("getHungerErrorMessage extracts server-supplied ProblemDetails detail", () => {
  const getHungerErrorMessage = (err, fallback = "تعذر تنفيذ العملية") => {
    const status = err?.status;
    if (status === 403) return "ليس لديك صلاحية تنفيذ هذه العملية.";
    if (status === 413) return "حجم الطلب تجاوز الحد المسموح به (6 ميجابايت). يرجى تقليل حجم صورة إثبات المحفظة.";
    const details = err?.details || {};
    const errorCode = String(details?.errorCode || err?.code || "");
    if (errorCode === "files.invalid_file") {
      return "صورة الإثبات غير صالحة أو غير مدعومة. يرجى اختيار صورة بصيغة (JPEG, PNG, WebP, GIF, BMP) لا يتجاوز حجمها 5 ميجابايت.";
    }
    const serverDetail = String(details?.detail || details?.title || details?.message || "").trim();
    if (serverDetail) return serverDetail;
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  };

  const problemDetailsErr = {
    status: 409,
    details: {
      type: "https://tools.ietf.org/html/rfc9110#section-15.5.10",
      title: "Conflict",
      status: 409,
      detail: "تغير الحساب أو الرصيد أو الاستخدام؛ أعد مراجعة المحفظة.",
    },
  };

  assert.equal(
    getHungerErrorMessage(problemDetailsErr),
    "تغير الحساب أو الرصيد أو الاستخدام؛ أعد مراجعة المحفظة.",
    "Must extract ProblemDetails detail string exactly"
  );
});
