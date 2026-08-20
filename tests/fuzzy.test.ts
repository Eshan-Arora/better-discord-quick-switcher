import assert from "node:assert/strict";
import test from "node:test";
import {fuzzyScore, normalizeSearchText} from "../src/search/fuzzy.ts";

test("normalizes channel separators and case", () => {
  assert.equal(normalizeSearchText("#Project-Maintenance"), "project maintenance");
});

test("prefers exact and substring matches", () => {
  const exact = fuzzyScore("calibration", "calibration");
  const substring = fuzzyScore("calibration", "Device calibration issue");
  const subsequence = fuzzyScore("clbrtn", "Device calibration issue");
  assert.ok(exact !== null && substring !== null && subsequence !== null);
  assert.ok(exact > substring);
  assert.ok(substring > subsequence);
});

test("rejects unrelated candidates", () => {
  assert.equal(fuzzyScore("calibration", "general"), null);
});
