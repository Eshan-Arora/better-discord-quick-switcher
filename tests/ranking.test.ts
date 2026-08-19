import assert from "node:assert/strict";
import test from "node:test";
import {rankDestinations} from "../src/search/ranking.ts";
import type {Destination} from "../src/types.ts";

const base: Destination[] = [
  {kind: "channel", id: "channel-read", guildId: "g1", name: "boat-maintenance", unread: false, unreadCount: 0, mentions: 0, position: 1},
  {kind: "thread", id: "thread-unread", guildId: "g1", name: "FJ 7 centerboard issue", parentChannelId: "channel-read", parentChannelName: "boat-maintenance", unread: true, unreadCount: 5, mentions: 0, position: 2},
  {kind: "guild", id: "g2", guildId: "g2", name: "Husky Sailing", unread: false, unreadCount: 0, mentions: 0, position: 99}
];

test("empty query ranks unread threads above read channels and servers", () => {
  const ranked = rankDestinations(base, "", {});
  assert.deepEqual(ranked.map(({id}) => id), ["thread-unread", "channel-read", "g2"]);
});

test("thread name is searchable without its parent", () => {
  const ranked = rankDestinations(base, "centerboard", {});
  assert.equal(ranked[0]?.id, "thread-unread");
});

test("parent channel contributes weak context", () => {
  const ranked = rankDestinations(base, "maintenance center", {});
  assert.equal(ranked[0]?.id, "thread-unread");
});

test("recent decayed usage breaks text-match ties", () => {
  const now = 2_000_000_000_000;
  const destinations: Destination[] = [
    {...base[0], id: "old", name: "planning-old"},
    {...base[0], id: "recent", name: "planning-new"}
  ];
  const ranked = rankDestinations(destinations, "planning", {
    old: {visits: 100, lastVisited: now - 365 * 24 * 60 * 60 * 1000},
    recent: {visits: 5, lastVisited: now - 60 * 1000}
  }, now);
  assert.equal(ranked[0]?.id, "recent");
});
