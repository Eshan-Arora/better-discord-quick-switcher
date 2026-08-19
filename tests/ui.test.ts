import assert from "node:assert/strict";
import test from "node:test";
import {destinationIconPaths} from "../src/ui/QuickSwitcher.ts";

test("uses distinct SVG geometry for every destination type", () => {
  const signatures = Object.values(destinationIconPaths).map((paths) => paths.join("|"));
  assert.equal(signatures.length, 4);
  assert.equal(new Set(signatures).size, signatures.length);
  assert.equal(destinationIconPaths.channel.length, 4);
});
