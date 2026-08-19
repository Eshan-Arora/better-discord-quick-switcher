import type {Destination, DestinationSnapshot} from "../types.ts";

interface WebpackApi {
  getStore(name: string): any;
}

interface LoggerApi {
  warn(...values: unknown[]): void;
}

interface DiscordChannel {
  id: string;
  name?: string;
  type?: number | string;
  guild_id?: string;
  guildId?: string;
  parent_id?: string;
  parentId?: string;
  last_message_id?: string;
  lastMessageId?: string;
  recipients?: string[];
  position?: number;
  rawPosition?: number;
  isThread?: () => boolean;
  isHidden?: () => boolean;
  getRecipientId?: () => string | undefined;
}

function safely<T>(operation: () => T, fallback: T): T {
  try {
    return operation();
  } catch {
    return fallback;
  }
}

function collectChannelObjects(value: unknown, output: Map<string, DiscordChannel>, seen = new Set<object>(), depth = 0): void {
  if (!value || typeof value !== "object" || depth > 6 || seen.has(value)) return;
  seen.add(value);

  const possible = value as Partial<DiscordChannel>;
  if (typeof possible.id === "string" && (
    typeof possible.name === "string"
    || possible.type !== undefined
    || Array.isArray(possible.recipients)
    || typeof possible.getRecipientId === "function"
  )) {
    output.set(possible.id, possible as DiscordChannel);
    return;
  }

  if (value instanceof Map) {
    for (const entry of value.values()) collectChannelObjects(entry, output, seen, depth + 1);
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) collectChannelObjects(entry, output, seen, depth + 1);
    return;
  }

  for (const entry of Object.values(value)) {
    if (typeof entry !== "function") collectChannelObjects(entry, output, seen, depth + 1);
  }
}

function listValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return [...value];
  if (value instanceof Map) return [...value.values()];
  if (value && typeof (value as {toArray?: unknown}).toArray === "function") {
    return safely(() => (value as {toArray(): unknown[]}).toArray(), []);
  }
  if (value && typeof (value as {[Symbol.iterator]?: unknown})[Symbol.iterator] === "function") {
    return safely(() => [...value as Iterable<unknown>], []);
  }
  return [];
}

interface GuildTreeNode {
  type?: string;
  id?: string;
  children?: GuildTreeNode[];
}

export function orderedGuildIds(tree: unknown): string[] {
  const root = (tree as {root?: GuildTreeNode} | null)?.root;
  const ordered: string[] = [];
  const visit = (node: GuildTreeNode | undefined): void => {
    if (!node) return;
    if (node.type === "guild" && typeof node.id === "string") ordered.push(node.id);
    for (const child of node.children ?? []) visit(child);
  };
  visit(root);
  return ordered;
}

export function guildIconUrl(guild: {id: string; icon?: string | null}): string | undefined {
  if (!guild.icon) return undefined;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=64`;
}

function channelGuildId(channel: DiscordChannel): string | undefined {
  return channel.guild_id ?? channel.guildId;
}

function parentId(channel: DiscordChannel): string | undefined {
  return channel.parent_id ?? channel.parentId;
}

function snowflakeTimestamp(id: string | undefined): number | undefined {
  if (!id) return undefined;
  try {
    return Number(BigInt(id) >> 22n) + 1_420_070_400_000;
  } catch {
    return undefined;
  }
}

function isChannelMuted(store: any, guildId: string | null, channelId: string): boolean {
  if (typeof store?.isGuildOrCategoryOrChannelMuted === "function") {
    try {
      return store.isGuildOrCategoryOrChannelMuted(guildId, channelId) === true;
    } catch {
      // Fall through to the narrower API used by older Discord builds.
    }
  }
  return safely(() => store?.isChannelMuted?.(guildId, channelId) === true, false);
}

function isPrivateChannel(channel: DiscordChannel): boolean {
  if (typeof channel.type === "number") return channel.type === 1 || channel.type === 3;
  return channel.type === "DM" || channel.type === "GROUP_DM";
}

function isGroupDm(channel: DiscordChannel): boolean {
  return channel.type === 3 || channel.type === "GROUP_DM";
}

interface DiscordUser {
  id: string;
  username?: string;
  globalName?: string;
  displayName?: string;
}

export function privateChannelName(channel: DiscordChannel, UserStore: any): string {
  if (isGroupDm(channel) && channel.name?.trim()) return channel.name.trim();
  const recipientIds = channel.recipients?.length
    ? channel.recipients
    : [safely(() => channel.getRecipientId?.(), undefined)].filter((id): id is string => Boolean(id));
  const names = recipientIds.map((userId) => {
    const user = safely<DiscordUser | undefined>(() => UserStore?.getUser?.(userId), undefined);
    return user?.globalName || user?.displayName || user?.username;
  }).filter((name): name is string => Boolean(name));
  if (names.length) return names.join(", ");
  return isGroupDm(channel) ? "Unnamed group" : "Direct Message";
}

function isThread(channel: DiscordChannel): boolean {
  if (safely(() => channel.isThread?.() === true, false)) return true;
  if (typeof channel.type === "number") return channel.type === 10 || channel.type === 11 || channel.type === 12;
  return typeof channel.type === "string" && channel.type.includes("THREAD");
}

function isTextChannel(channel: DiscordChannel): boolean {
  if (typeof channel.type === "number") return channel.type === 0 || channel.type === 5;
  return channel.type === "GUILD_TEXT" || channel.type === "GUILD_ANNOUNCEMENT" || channel.type === "GUILD_NEWS";
}

export class DiscordDestinationStore {
  private readonly webpack: WebpackApi;
  private readonly logger: LoggerApi;

  constructor(webpack: WebpackApi, logger: LoggerApi) {
    this.webpack = webpack;
    this.logger = logger;
  }

  snapshot(): DestinationSnapshot {
    const warnings: string[] = [];
    const SelectedGuildStore = this.webpack.getStore("SelectedGuildStore");
    const GuildStore = this.webpack.getStore("GuildStore");
    const GuildChannelStore = this.webpack.getStore("GuildChannelStore");
    const ChannelStore = this.webpack.getStore("ChannelStore");
    const ReadStateStore = this.webpack.getStore("ReadStateStore");
    const PermissionStore = this.webpack.getStore("PermissionStore");
    const UserGuildSettingsStore = this.webpack.getStore("UserGuildSettingsStore");
    const JoinedThreadsStore = this.webpack.getStore("JoinedThreadsStore");
    const SortedGuildStore = this.webpack.getStore("SortedGuildStore");
    const PrivateChannelSortStore = this.webpack.getStore("PrivateChannelSortStore");
    const PrivateChannelReadStateStore = this.webpack.getStore("PrivateChannelReadStateStore");
    const UserStore = this.webpack.getStore("UserStore");

    if (!SelectedGuildStore) warnings.push("SelectedGuildStore unavailable");
    if (!GuildStore) warnings.push("GuildStore unavailable");
    if (!ChannelStore) warnings.push("ChannelStore unavailable");
    if (!GuildChannelStore) warnings.push("GuildChannelStore unavailable");
    if (!ReadStateStore) warnings.push("ReadStateStore unavailable");

    const currentGuildId = safely(() => SelectedGuildStore?.getGuildId?.() ?? null, null);
    const guilds = safely<Record<string, {id: string; name?: string; icon?: string | null}>>(() => GuildStore?.getGuilds?.() ?? {}, {});
    const currentGuildName = currentGuildId ? guilds[currentGuildId]?.name ?? null : null;
    const destinations: Destination[] = [];
    const guildOrder = new Map(
      orderedGuildIds(safely(() => SortedGuildStore?.getGuildsTree?.(), null))
        .map((guildId, index) => [guildId, index])
    );

    const privateChannels = new Map<string, DiscordChannel>();
    collectChannelObjects(safely(() => ChannelStore?.getMutablePrivateChannels?.(), null), privateChannels);
    collectChannelObjects(safely(() => ChannelStore?.getSortedPrivateChannels?.(), null), privateChannels);
    const privateChannelIds = listValues(safely(() => PrivateChannelSortStore?.getPrivateChannelIds?.(), null));
    const privateOrder = new Map(
      privateChannelIds
        .map((value) => typeof value === "string" ? value : (value as {id?: unknown} | null)?.id)
        .filter((id): id is string => typeof id === "string")
        .map((channelId, index) => [channelId, index])
    );
    const unreadPrivateIds = new Set(
      listValues(safely(() => PrivateChannelReadStateStore?.getUnreadPrivateChannelIds?.(), null))
        .filter((id): id is string => typeof id === "string")
    );

    for (const channel of privateChannels.values()) {
      if (!isPrivateChannel(channel)) continue;
      const mentions = Math.max(0, safely(() => Number(ReadStateStore?.getMentionCount?.(channel.id) ?? 0), 0));
      const rawUnreadCount = Math.max(0, safely(() => Number(ReadStateStore?.getUnreadCount?.(channel.id) ?? 0), 0));
      const muted = isChannelMuted(UserGuildSettingsStore, null, channel.id);
      const rawUnread = unreadPrivateIds.has(channel.id)
        || safely(() => ReadStateStore?.hasUnread?.(channel.id) === true, false)
        || mentions > 0
        || rawUnreadCount > 0;
      destinations.push({
        kind: "dm",
        id: channel.id,
        guildId: "@me",
        name: privateChannelName(channel, UserStore),
        groupDm: isGroupDm(channel),
        unread: mentions > 0 || (rawUnread && !muted),
        unreadCount: muted && mentions === 0 ? 0 : rawUnreadCount,
        mentions,
        muted,
        lastActivityAt: snowflakeTimestamp(channel.lastMessageId ?? channel.last_message_id),
        position: privateOrder.get(channel.id) ?? Number.MAX_SAFE_INTEGER
      });
    }

    if (currentGuildId && ChannelStore) {
      const channels = new Map<string, DiscordChannel>();
      collectChannelObjects(
        safely(() => ChannelStore.getMutableGuildChannelsForGuild?.(currentGuildId), null),
        channels
      );
      collectChannelObjects(
        safely(() => GuildChannelStore?.getSelectableChannels?.(currentGuildId), null),
        channels
      );
      collectChannelObjects(
        safely(() => GuildChannelStore?.getChannels?.(currentGuildId), null),
        channels
      );
      collectChannelObjects(
        safely(() => ChannelStore.getAllThreadsForGuild?.(currentGuildId), null),
        channels
      );

      for (const channel of channels.values()) {
        if (channelGuildId(channel) !== currentGuildId || !channel.name) continue;
        const thread = isThread(channel);
        if (!thread && !isTextChannel(channel)) continue;
        if (safely(() => channel.isHidden?.() === true, false)) continue;
        if (PermissionStore && !safely(() => PermissionStore.can(1024n, channel), true)) continue;

        const channelParentId = parentId(channel);
        const parent = channelParentId
          ? safely<DiscordChannel | undefined>(() => ChannelStore.getChannel?.(channelParentId), undefined)
          : undefined;
        const mentions = Math.max(0, safely(() => Number(ReadStateStore?.getMentionCount?.(channel.id) ?? 0), 0));
        const rawUnreadCount = Math.max(0, safely(() => Number(ReadStateStore?.getUnreadCount?.(channel.id) ?? 0), 0));
        const muted = isChannelMuted(UserGuildSettingsStore, currentGuildId, channel.id)
          || (thread && safely(() => JoinedThreadsStore?.isMuted?.(channel.id) === true, false));
        const rawUnread = safely(() => ReadStateStore?.hasUnread?.(channel.id) === true, false)
          || mentions > 0
          || rawUnreadCount > 0;
        // Muting suppresses ordinary unread priority, but an explicit mention remains actionable.
        const unread = mentions > 0 || (rawUnread && !muted);
        const unreadCount = muted && mentions === 0 ? 0 : rawUnreadCount;

        destinations.push({
          kind: thread ? "thread" : "channel",
          id: channel.id,
          guildId: currentGuildId,
          name: channel.name,
          parentChannelId: thread ? channelParentId : undefined,
          parentChannelName: thread ? parent?.name : undefined,
          unread,
          unreadCount,
          mentions,
          muted,
          lastActivityAt: snowflakeTimestamp(channel.lastMessageId ?? channel.last_message_id),
          position: channel.rawPosition ?? channel.position ?? Number.MAX_SAFE_INTEGER
        });
      }
    }

    for (const guild of Object.values(guilds)) {
      if (!guild?.id || guild.id === currentGuildId) continue;
      destinations.push({
        kind: "guild",
        id: guild.id,
        guildId: guild.id,
        name: guild.name || "Unnamed server",
        iconUrl: guildIconUrl(guild),
        unread: false,
        unreadCount: 0,
        mentions: 0,
        muted: false,
        position: guildOrder.get(guild.id) ?? Number.MAX_SAFE_INTEGER
      });
    }

    if (warnings.length) this.logger.warn("Discord integration warnings:", warnings);
    return {currentGuildId, currentGuildName, destinations, warnings};
  }
}
