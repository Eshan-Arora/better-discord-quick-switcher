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
  position?: number;
  rawPosition?: number;
  isThread?: () => boolean;
  isHidden?: () => boolean;
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
  if (typeof possible.id === "string" && typeof possible.name === "string") {
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

function channelGuildId(channel: DiscordChannel): string | undefined {
  return channel.guild_id ?? channel.guildId;
}

function parentId(channel: DiscordChannel): string | undefined {
  return channel.parent_id ?? channel.parentId;
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
  constructor(private readonly webpack: WebpackApi, private readonly logger: LoggerApi) {}

  snapshot(): DestinationSnapshot {
    const warnings: string[] = [];
    const SelectedGuildStore = this.webpack.getStore("SelectedGuildStore");
    const GuildStore = this.webpack.getStore("GuildStore");
    const GuildChannelStore = this.webpack.getStore("GuildChannelStore");
    const ChannelStore = this.webpack.getStore("ChannelStore");
    const ReadStateStore = this.webpack.getStore("ReadStateStore");
    const PermissionStore = this.webpack.getStore("PermissionStore");

    if (!SelectedGuildStore) warnings.push("SelectedGuildStore unavailable");
    if (!GuildStore) warnings.push("GuildStore unavailable");
    if (!ChannelStore) warnings.push("ChannelStore unavailable");
    if (!GuildChannelStore) warnings.push("GuildChannelStore unavailable");
    if (!ReadStateStore) warnings.push("ReadStateStore unavailable");

    const currentGuildId = safely(() => SelectedGuildStore?.getGuildId?.() ?? null, null);
    const guilds = safely<Record<string, {id: string; name?: string}>>(() => GuildStore?.getGuilds?.() ?? {}, {});
    const currentGuildName = currentGuildId ? guilds[currentGuildId]?.name ?? null : null;
    const destinations: Destination[] = [];

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
        const unreadCount = Math.max(0, safely(() => Number(ReadStateStore?.getUnreadCount?.(channel.id) ?? 0), 0));
        const unread = safely(() => ReadStateStore?.hasUnread?.(channel.id) === true, false) || mentions > 0 || unreadCount > 0;

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
        unread: false,
        unreadCount: 0,
        mentions: 0,
        position: Number.MAX_SAFE_INTEGER
      });
    }

    if (warnings.length) this.logger.warn("Discord integration warnings:", warnings);
    return {currentGuildId, currentGuildName, destinations, warnings};
  }
}
