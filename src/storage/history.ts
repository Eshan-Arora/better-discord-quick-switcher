import type {Destination, NavigationHistory} from "../types.ts";

interface DataApi {
  load<T>(key: string): T;
  save(key: string, value: unknown): void;
}

export class HistoryStore {
  private history: NavigationHistory;

  constructor(private readonly data: DataApi) {
    this.history = this.load();
  }

  getSnapshot(): NavigationHistory {
    return {...this.history};
  }

  record(destination: Destination, now = Date.now()): void {
    const previous = this.history[destination.id];
    this.history[destination.id] = {
      visits: Math.min((previous?.visits ?? 0) + 1, 1_000_000),
      lastVisited: now
    };
    this.data.save("history", this.history);
  }

  private load(): NavigationHistory {
    const stored = this.data.load<unknown>("history");
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};

    const valid: NavigationHistory = {};
    for (const [id, value] of Object.entries(stored)) {
      if (!value || typeof value !== "object") continue;
      const visits = Reflect.get(value, "visits");
      const lastVisited = Reflect.get(value, "lastVisited");
      if (typeof visits !== "number" || typeof lastVisited !== "number") continue;
      valid[id] = {visits: Math.max(0, visits), lastVisited: Math.max(0, lastVisited)};
    }
    return valid;
  }
}
