import assert from "node:assert/strict";
import test from "node:test";
import {rankDestinations} from "../src/search/ranking.ts";
import type {Destination} from "../src/types.ts";

const DAY = 24 * 60 * 60 * 1000;

const base: Destination[] = [
  {kind: "channel", id: "channel-read", guildId: "g1", name: "boat-maintenance", unread: false, unreadCount: 0, mentions: 0, muted: false, position: 1},
  {kind: "thread", id: "thread-unread", guildId: "g1", name: "FJ 7 centerboard issue", parentChannelId: "channel-read", parentChannelName: "boat-maintenance", unread: true, unreadCount: 5, mentions: 0, muted: false, position: 2},
  {kind: "guild", id: "g2", guildId: "g2", name: "Husky Sailing", unread: false, unreadCount: 0, mentions: 0, muted: false, position: 99}
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

test("muted ordinary unread is ignored for empty-query priority", () => {
  const destinations: Destination[] = [
    {...base[0], id: "muted", name: "z-muted", unread: true, unreadCount: 50, muted: true},
    {...base[0], id: "read", name: "a-read"}
  ];
  const ranked = rankDestinations(destinations, "", {});
  assert.deepEqual(ranked.map(({id}) => id), ["read", "muted"]);
});

test("recent channel activity breaks close fuzzy matches", () => {
  const now = 2_000_000_000_000;
  const destinations: Destination[] = [
    {...base[0], id: "archive", name: "b2s-maintenance", lastActivityAt: now - 5 * 365 * DAY},
    {...base[0], id: "active", name: "boat-maintenance", lastActivityAt: now - 2 * DAY}
  ];
  const ranked = rankDestinations(destinations, "main", {
    archive: {visits: 1, lastVisited: now - 60_000}
  }, now);
  assert.equal(ranked[0]?.id, "active");
});

test("sidebar order decides close non-exact server matches", () => {
  const destinations: Destination[] = [
    {...base[2], id: "organizers", name: "PNW Competition Organizers", position: 0},
    {...base[2], id: "cubing", name: "PNW Cubing", position: 8}
  ];
  assert.equal(rankDestinations(destinations, "pnw", {})[0]?.id, "organizers");
});

test("an exact server name still beats sidebar order", () => {
  const destinations: Destination[] = [
    {...base[2], id: "organizers", name: "PNW Competition Organizers", position: 0},
    {...base[2], id: "cubing", name: "PNW Cubing", position: 30}
  ];
  assert.equal(rankDestinations(destinations, "PNW Cubing", {})[0]?.id, "cubing");
});

test("unread DMs rank ahead of mentions and unread server destinations", () => {
  const destinations: Destination[] = [
    {...base[0], id: "mention", unread: true, mentions: 2},
    {...base[1], id: "unread-thread"},
    {...base[0], kind: "dm", guildId: "@me", id: "dm", name: "Ada", unread: true, position: 0}
  ];
  assert.equal(rankDestinations(destinations, "", {})[0]?.id, "dm");
});

test("a server with a mention follows an unread DM and precedes read DMs", () => {
  const destinations: Destination[] = [
    {...base[0], kind: "dm", guildId: "@me", id: "ori", name: "Ori", unread: true, unreadCount: 1, mentions: 1, position: 0},
    {...base[2], id: "wyc", name: "Washington Yacht Club", unread: true, mentions: 1, position: 5},
    {...base[0], kind: "dm", guildId: "@me", id: "recent-dm", name: "Recent DM", position: 1, lastActivityAt: Date.now()}
  ];
  assert.deepEqual(rankDestinations(destinations, "", {}).map(({id}) => id), ["ori", "wyc", "recent-dm"]);
});

test("DM names participate in normal typed search", () => {
  const destinations: Destination[] = [
    ...base,
    {...base[0], kind: "dm", guildId: "@me", id: "dm", name: "Ada Lovelace", unread: false, position: 0}
  ];
  assert.equal(rankDestinations(destinations, "ada", {})[0]?.id, "dm");
});

test("a strong server match beats an old weakly matching group DM", () => {
  const now = 2_000_000_000_000;
  const destinations: Destination[] = [
    {...base[0], kind: "dm", guildId: "@me", id: "old-dm", name: "Stephen, oculina_sp", groupDm: true, position: 0, lastActivityAt: now - 5 * 365 * DAY},
    {...base[2], id: "shopify", name: "Shopify Fall 2026 Interns", position: 0}
  ];
  assert.equal(rankDestinations(destinations, "shop", {}, now)[0]?.id, "shopify");
});

test("an exact DM match still beats a merely prefixed server", () => {
  const destinations: Destination[] = [
    {...base[0], kind: "dm", guildId: "@me", id: "dm", name: "Shop", position: 20},
    {...base[2], id: "shopify", name: "Shopify Fall 2026 Interns", position: 0}
  ];
  assert.equal(rankDestinations(destinations, "shop", {})[0]?.id, "dm");
});

test("read DMs do not crowd out current-server destinations on an empty query", () => {
  const destinations: Destination[] = [
    {...base[0], id: "channel", name: "Current channel"},
    {...base[0], kind: "dm", guildId: "@me", id: "dm", name: "Recent DM", position: 0, lastActivityAt: Date.now()}
  ];
  assert.equal(rankDestinations(destinations, "", {})[0]?.id, "channel");
});
