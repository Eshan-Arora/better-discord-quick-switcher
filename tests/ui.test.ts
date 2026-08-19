import assert from "node:assert/strict";
import test from "node:test";
import {destinationSymbol} from "../src/ui/QuickSwitcher.ts";

test("uses distinct symbols for every destination type", () => {
  const symbols = [
    destinationSymbol("dm"),
    destinationSymbol("channel"),
    destinationSymbol("thread"),
    destinationSymbol("guild")
  ];
  assert.deepEqual(symbols, ["@", "#", "◉", "◆"]);
  assert.equal(new Set(symbols).size, symbols.length);
});
