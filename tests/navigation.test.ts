import assert from "node:assert/strict";
import test from "node:test";
import {centerChannelInList, DiscordNavigator} from "../src/discord/navigation.ts";
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

test("centers the navigated channel in Discord's channel list", () => {
  const calls: ScrollIntoViewOptions[] = [];
  const element = {scrollIntoView: (options: ScrollIntoViewOptions) => calls.push(options)};
  const documentRoot = {
    querySelector: (selector: string) => selector === '[data-list-item-id="channels___thread-id"]' ? element : null
  } as unknown as Document;
  assert.equal(centerChannelInList(documentRoot, "guild-id", "thread-id"), true);
  assert.deepEqual(calls, [{block: "center", inline: "nearest", behavior: "auto"}]);
});

test("navigates direct messages through the @me route", () => {
  const routes: string[] = [];
  const navigator = new DiscordNavigator({
    getStore: () => undefined,
    getByStrings: () => (route: string) => routes.push(route),
    getModule: () => undefined
  });
  navigator.navigate({...thread, kind: "dm", guildId: "@me", groupDm: false});
  assert.deepEqual(routes, ["/channels/@me/thread-id"]);
});
