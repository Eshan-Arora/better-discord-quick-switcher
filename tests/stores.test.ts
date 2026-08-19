import assert from "node:assert/strict";
import test from "node:test";
import {orderedGuildIds, privateChannelName} from "../src/discord/stores.ts";

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

test("derives direct and unnamed group DM names from recipients", () => {
  const users = new Map([
    ["u1", {id: "u1", globalName: "Ada", username: "ada"}],
    ["u2", {id: "u2", username: "Grace"}]
  ]);
  const UserStore = {getUser: (id: string) => users.get(id)};
  assert.equal(privateChannelName({id: "d1", type: 1, recipients: ["u1"]}, UserStore), "Ada");
  assert.equal(privateChannelName({id: "d2", type: 3, recipients: ["u1", "u2"]}, UserStore), "Ada, Grace");
});
