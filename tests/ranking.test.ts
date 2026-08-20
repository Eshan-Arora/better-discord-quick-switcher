import assert from "node:assert/strict";
import test from "node:test";
import {rankDestinations} from "../src/search/ranking.ts";
import type {Destination} from "../src/types.ts";

const DAY = 24 * 60 * 60 * 1000;

const base: Destination[] = [
  {kind: "channel", id: "channel-read", guildId: "g1", name: "project-maintenance", unread: false, unreadCount: 0, mentions: 0, muted: false, position: 1},
  {kind: "thread", id: "thread-unread", guildId: "g1", name: "Device calibration issue", parentChannelId: "channel-read", parentChannelName: "project-maintenance", unread: true, unreadCount: 5, mentions: 0, muted: false, position: 2},
  {kind: "guild", id: "g2", guildId: "g2", name: "Example Community", unread: false, unreadCount: 0, mentions: 0, muted: false, position: 99}
];

test("empty query ranks unread threads above read channels and servers", () => {
  const ranked = rankDestinations(base, "", {});
  assert.deepEqual(ranked.map(({id}) => id), ["thread-unread", "channel-read", "g2"]);
});

test("thread name is searchable without its parent", () => {
  const ranked = rankDestinations(base, "calibration", {});
  assert.equal(ranked[0]?.id, "thread-unread");
});

test("parent channel contributes weak context", () => {
  const ranked = rankDestinations(base, "calibration maintenance", {});
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
    {...base[0], id: "archive", name: "legacy-maintenance", lastActivityAt: now - 5 * 365 * DAY},
    {...base[0], id: "active", name: "project-maintenance", lastActivityAt: now - 2 * DAY}
  ];
  const ranked = rankDestinations(destinations, "main", {
    archive: {visits: 1, lastVisited: now - 60_000}
  }, now);
  assert.equal(ranked[0]?.id, "active");
});

test("sidebar order decides close non-exact server matches", () => {
  const destinations: Destination[] = [
    {...base[2], id: "organizers", name: "Regional Event Organizers", position: 0},
    {...base[2], id: "community", name: "Regional Community", position: 8}
  ];
  assert.equal(rankDestinations(destinations, "regional", {})[0]?.id, "organizers");
});

test("an exact server name still beats sidebar order", () => {
  const destinations: Destination[] = [
    {...base[2], id: "organizers", name: "Regional Event Organizers", position: 0},
    {...base[2], id: "community", name: "Regional Community", position: 30}
  ];
  assert.equal(rankDestinations(destinations, "Regional Community", {})[0]?.id, "community");
});

test("unread DMs rank ahead of mentions and unread server destinations", () => {
  const destinations: Destination[] = [
    {...base[0], id: "mention", unread: true, mentions: 2},
    {...base[1], id: "unread-thread"},
    {...base[0], kind: "dm", guildId: "@me", id: "dm", name: "Person One", unread: true, position: 0}
  ];
  assert.equal(rankDestinations(destinations, "", {})[0]?.id, "dm");
});

test("a server with a mention follows an unread DM and precedes read DMs", () => {
  const destinations: Destination[] = [
    {...base[0], kind: "dm", guildId: "@me", id: "mentioned-dm", name: "Person One", unread: true, unreadCount: 1, mentions: 1, position: 0},
    {...base[2], id: "mentioned-server", name: "Example Organization", unread: true, mentions: 1, position: 5},
    {...base[0], kind: "dm", guildId: "@me", id: "recent-dm", name: "Recent DM", position: 1, lastActivityAt: Date.now()}
  ];
  assert.deepEqual(rankDestinations(destinations, "", {}).map(({id}) => id), ["mentioned-dm", "mentioned-server", "recent-dm"]);
});

test("DM names participate in normal typed search", () => {
  const destinations: Destination[] = [
    ...base,
    {...base[0], kind: "dm", guildId: "@me", id: "dm", name: "Person One", unread: false, position: 0}
  ];
  assert.equal(rankDestinations(destinations, "person one", {})[0]?.id, "dm");
});

test("a strong server match beats an old weakly matching group DM", () => {
  const now = 2_000_000_000_000;
  const destinations: Destination[] = [
    {...base[0], kind: "dm", guildId: "@me", id: "old-dm", name: "Person Two, project_helper", groupDm: true, position: 0, lastActivityAt: now - 5 * 365 * DAY},
    {...base[2], id: "project-team", name: "Project Team", position: 0}
  ];
  assert.equal(rankDestinations(destinations, "project", {}, now)[0]?.id, "project-team");
});

test("an exact DM match still beats a merely prefixed server", () => {
  const destinations: Destination[] = [
    {...base[0], kind: "dm", guildId: "@me", id: "dm", name: "Task", position: 20},
    {...base[2], id: "taskforce-team", name: "Taskforce Team", position: 0}
  ];
  assert.equal(rankDestinations(destinations, "task", {})[0]?.id, "dm");
});

test("read DMs do not crowd out current-server destinations on an empty query", () => {
  const destinations: Destination[] = [
    {...base[0], id: "channel", name: "Current channel"},
    {...base[0], kind: "dm", guildId: "@me", id: "dm", name: "Recent DM", position: 0, lastActivityAt: Date.now()}
  ];
  assert.equal(rankDestinations(destinations, "", {})[0]?.id, "channel");
});

test("stale read group DMs fall behind manually ordered servers", () => {
  const now = 2_000_000_000_000;
  const destinations: Destination[] = [
    {...base[0], kind: "dm", guildId: "@me", id: "old-group-a", name: "Old Group Alpha", groupDm: true, position: 0, lastActivityAt: now - 5 * 365 * DAY},
    {...base[0], kind: "dm", guildId: "@me", id: "old-group-b", name: "Old Group Beta", groupDm: true, position: 1, lastActivityAt: now - 4 * 365 * DAY},
    {...base[2], id: "top-server", name: "Top Server", position: 0},
    {...base[2], id: "later-server", name: "Later Server", position: 20}
  ];
  assert.deepEqual(
    rankDestinations(destinations, "", {}, now).map(({id}) => id),
    ["top-server", "later-server", "old-group-b", "old-group-a"]
  );
});

test("a genuinely recent and used read DM can still outrank an ordinary server", () => {
  const now = 2_000_000_000_000;
  const destinations: Destination[] = [
    {...base[0], kind: "dm", guildId: "@me", id: "active-dm", name: "Active DM", position: 50, lastActivityAt: now - 60_000},
    {...base[2], id: "server", name: "Server", position: 0}
  ];
  const ranked = rankDestinations(destinations, "", {
    "active-dm": {visits: 2, lastVisited: now - 60_000}
  }, now);
  assert.equal(ranked[0]?.id, "active-dm");
});
