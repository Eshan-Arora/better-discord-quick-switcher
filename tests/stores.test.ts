import assert from "node:assert/strict";
import test from "node:test";
import {
  groupDmAvatarUrls,
  guildIconUrl,
  guildMentionCount,
  isPrivateChannelUnread,
  orderedGuildIds,
  privateChannelIconUrl,
  privateChannelName,
  userAvatarUrl
} from "../src/discord/stores.ts";

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
    ["u1", {id: "u1", globalName: "Person One", username: "person_one"}],
    ["u2", {id: "u2", username: "person_two"}]
  ]);
  const UserStore = {getUser: (id: string) => users.get(id)};
  assert.equal(privateChannelName({id: "d1", type: 1, recipients: ["u1"]}, UserStore), "Person One");
  assert.equal(privateChannelName({id: "d2", type: 3, recipients: ["u1", "u2"]}, UserStore), "Person One, person_two");
});

test("builds Discord CDN guild icon URLs and handles iconless servers", () => {
  assert.equal(guildIconUrl({id: "g1", icon: "hash"}), "https://cdn.discordapp.com/icons/g1/hash.webp?size=64");
  assert.equal(guildIconUrl({id: "g2", icon: null}), undefined);
});

test("reads aggregate mention counts for server destinations", () => {
  const GuildReadStateStore = {getMentionCount: (guildId: string) => guildId === "mentioned-guild" ? 2 : 0};
  assert.equal(guildMentionCount(GuildReadStateStore, "mentioned-guild"), 2);
  assert.equal(guildMentionCount(GuildReadStateStore, "other"), 0);
  assert.equal(guildMentionCount(undefined, "mentioned-guild"), 0);
});

test("builds direct-message avatar and group-DM icon URLs", () => {
  const users = new Map([
    ["u1", {id: "100000000000000000", avatar: "avatar-hash", username: "person_one"}]
  ]);
  const UserStore = {getUser: (id: string) => users.get(id)};
  assert.equal(
    privateChannelIconUrl({id: "d1", type: 1, recipients: ["u1"]}, UserStore),
    "https://cdn.discordapp.com/avatars/100000000000000000/avatar-hash.webp?size=64"
  );
  assert.equal(
    privateChannelIconUrl({id: "g1", type: 3, icon: "group-hash"}, UserStore),
    "https://cdn.discordapp.com/channel-icons/g1/group-hash.webp?size=64"
  );
  assert.equal(privateChannelIconUrl({id: "g2", type: 3}, UserStore), undefined);
});

test("builds iconless group-DM facepiles from the first two recipients", () => {
  const users = new Map([
    ["u1", {id: "100000000000000000", avatar: "first-hash", username: "first"}],
    ["u2", {id: "200000000000000000", avatar: "second-hash", username: "second"}],
    ["u3", {id: "300000000000000000", avatar: "third-hash", username: "third"}]
  ]);
  const UserStore = {getUser: (id: string) => users.get(id)};

  assert.deepEqual(
    groupDmAvatarUrls({id: "g1", type: 3, recipients: ["u1", "u2", "u3"]}, UserStore),
    [
      "https://cdn.discordapp.com/avatars/100000000000000000/first-hash.webp?size=64",
      "https://cdn.discordapp.com/avatars/200000000000000000/second-hash.webp?size=64"
    ]
  );
  assert.deepEqual(
    groupDmAvatarUrls({id: "g2", type: 3, icon: "group-hash", recipients: ["u1", "u2"]}, UserStore),
    []
  );
  assert.deepEqual(groupDmAvatarUrls({id: "d1", type: 1, recipients: ["u1"]}, UserStore), []);
});

test("uses Discord default avatars when a DM recipient has no custom avatar", () => {
  assert.equal(
    userAvatarUrl({id: "100000000000000000", avatar: null, discriminator: "1234"}),
    "https://cdn.discordapp.com/embed/avatars/4.png"
  );
});

test("dedicated private-channel unread state overrides stale generic state", () => {
  const staleReadState = {
    hasUnread: () => true
  };
  assert.equal(isPrivateChannelUnread("stale-dm", new Set(), staleReadState, 4), false);
  assert.equal(isPrivateChannelUnread("unread-dm", new Set(["unread-dm"]), staleReadState, 0), true);
});

test("falls back to generic private-channel unread state when its dedicated store is unavailable", () => {
  assert.equal(isPrivateChannelUnread("dm", null, {hasUnread: () => true}, 0), true);
  assert.equal(isPrivateChannelUnread("dm", null, {hasUnread: () => false}, 2), true);
  assert.equal(isPrivateChannelUnread("dm", null, {hasUnread: () => false}, 0), false);
});
