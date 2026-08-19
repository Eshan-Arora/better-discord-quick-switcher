import assert from "node:assert/strict";
import test from "node:test";
import {destinationIconDefinitions} from "../src/ui/QuickSwitcher.ts";

test("uses distinct SVG geometry for every destination type", () => {
  const signatures = Object.values(destinationIconDefinitions).map(({paths}) => paths.join("|"));
  assert.equal(signatures.length, 4);
  assert.equal(new Set(signatures).size, signatures.length);
  assert.equal(destinationIconDefinitions.channel.filled, true);
  assert.equal(destinationIconDefinitions.thread.filled, true);
});
