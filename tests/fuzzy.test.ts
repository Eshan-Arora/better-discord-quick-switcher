import assert from "node:assert/strict";
import test from "node:test";
import {fuzzyScore, normalizeSearchText} from "../src/search/fuzzy.ts";

test("normalizes channel separators and case", () => {
  assert.equal(normalizeSearchText("#Boat-Maintenance"), "boat maintenance");
});

test("prefers exact and substring matches", () => {
  const exact = fuzzyScore("centerboard", "centerboard");
  const substring = fuzzyScore("centerboard", "FJ 7 centerboard issue");
  const subsequence = fuzzyScore("cntbrd", "FJ 7 centerboard issue");
  assert.ok(exact !== null && substring !== null && subsequence !== null);
  assert.ok(exact > substring);
  assert.ok(substring > subsequence);
});

test("rejects unrelated candidates", () => {
  assert.equal(fuzzyScore("centerboard", "general"), null);
});
