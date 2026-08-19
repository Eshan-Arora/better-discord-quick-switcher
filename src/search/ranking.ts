import type {Destination, NavigationHistory} from "../types.ts";
import {fuzzyScore} from "./fuzzy.ts";

const DAY = 24 * 60 * 60 * 1000;

export interface RankedDestination extends Destination {
  score: number;
}

export function decayedUsage(entry: NavigationHistory[string] | undefined, now = Date.now()): number {
  if (!entry || entry.visits <= 0 || entry.lastVisited <= 0) return 0;
  const age = Math.max(0, now - entry.lastVisited);
  const frequency = Math.log1p(entry.visits) * Math.exp(-age / (45 * DAY));
  const recency = Math.exp(-age / (7 * DAY));
  return frequency * 0.65 + recency * 0.35;
}

export function recentActivity(lastActivityAt: number | undefined, now = Date.now()): number {
  if (!lastActivityAt || lastActivityAt <= 0) return 0;
  const age = Math.max(0, now - lastActivityAt);
  return Math.exp(-age / (90 * DAY));
}

function textualScore(destination: Destination, query: string): number | null {
  const primary = fuzzyScore(query, destination.name);
  const contextual = destination.kind === "thread" && destination.parentChannelName
    ? fuzzyScore(query, `${destination.name} ${destination.parentChannelName}`)
    : null;
  if (primary === null && contextual === null) return null;
  return Math.max(primary ?? 0, (contextual ?? 0) * 0.68);
}

export function rankDestinations(
  destinations: Destination[],
  query: string,
  history: NavigationHistory,
  now = Date.now()
): RankedDestination[] {
  const trimmedQuery = query.trim();
  const isEmpty = trimmedQuery.length === 0;
  const ranked: RankedDestination[] = [];

  for (const destination of destinations) {
    const usage = decayedUsage(history[destination.id], now);
    const activity = recentActivity(destination.lastActivityAt, now);
    const actionableUnread = destination.unread && (!destination.muted || destination.mentions > 0);
    let score: number;

    if (isEmpty) {
      const scopeBase = destination.kind === "guild" ? -5_000 : 1_000;
      score = scopeBase
        + (destination.mentions > 0 ? 8_000 + Math.log1p(destination.mentions) * 300 : 0)
        + (actionableUnread ? 3_000 : 0)
        + (actionableUnread ? Math.min(destination.unreadCount, 100) * 5 : 0)
        + usage * 700
        + activity * 200;
    } else {
      const match = textualScore(destination, trimmedQuery);
      if (match === null) continue;
      score = match * (destination.kind === "guild" ? 850 : 1_000)
        + (destination.kind === "guild" ? 0 : 60)
        + (destination.mentions > 0 ? 140 : 0)
        + (actionableUnread ? 70 : 0)
        + usage * 25
        + activity * 60;
    }

    ranked.push({...destination, score});
  }

  return ranked.sort((left, right) =>
    right.score - left.score
    || left.name.localeCompare(right.name)
  );
}
