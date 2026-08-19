import assert from "node:assert/strict";
import test from "node:test";
import {DiscordNavigator} from "../src/discord/navigation.ts";
import type {Destination} from "../src/types.ts";

const thread: Destination = {
  kind: "thread",
  id: "thread-id",
  guildId: "guild-id",
  name: "Thread",
  unread: false,
  unreadCount: 0,
  mentions: 0,
  muted: false,
  position: 0
};

test("uses Discord's current string-discovered transition export", () => {
  const routes: string[] = [];
  const navigator = new DiscordNavigator({
    getStore: () => undefined,
    getByStrings: () => (route: string) => routes.push(route),
    getModule: () => undefined
  });
  navigator.navigate(thread);
  assert.deepEqual(routes, ["/channels/guild-id/thread-id"]);
});

test("falls back to a transitionTo module", () => {
  const routes: string[] = [];
  const navigator = new DiscordNavigator({
    getStore: () => undefined,
    getByKeys: () => ({transitionTo: (route: string) => routes.push(route)}),
    getModule: () => undefined
  });
  navigator.navigate(thread);
  assert.deepEqual(routes, ["/channels/guild-id/thread-id"]);
});
