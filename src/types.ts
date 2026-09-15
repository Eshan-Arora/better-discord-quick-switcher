export type DestinationKind = "channel" | "thread" | "guild" | "dm";

export interface Destination {
  kind: DestinationKind;
  id: string;
  guildId: string;
  name: string;
  parentChannelId?: string;
  parentChannelName?: string;
  groupDm?: boolean;
  iconUrl?: string;
  groupDmAvatarUrls?: readonly string[];
  unread: boolean;
  unreadCount: number;
  mentions: number;
  muted: boolean;
  lastActivityAt?: number;
  position: number;
}

export interface HistoryEntry {
  visits: number;
  lastVisited: number;
}

export type NavigationHistory = Record<string, HistoryEntry>;

export interface DestinationSnapshot {
  currentGuildId: string | null;
  currentGuildName: string | null;
  destinations: Destination[];
  warnings: string[];
}
