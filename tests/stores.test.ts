import assert from "node:assert/strict";
import test from "node:test";
import {orderedGuildIds} from "../src/discord/stores.ts";

test("flattens Discord sidebar and folder order", () => {
  const tree = {
    root: {
      type: "root",
      children: [
        {type: "guild", id: "top", children: []},
        {
          type: "folder",
          id: "folder",
          children: [
            {type: "guild", id: "folder-first", children: []},
            {type: "guild", id: "folder-second", children: []}
          ]
        },
        {type: "guild", id: "bottom", children: []}
      ]
    }
  };
  assert.deepEqual(orderedGuildIds(tree), ["top", "folder-first", "folder-second", "bottom"]);
});
