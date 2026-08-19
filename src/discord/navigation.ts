import type {Destination} from "../types.ts";

interface WebpackApi {
  getStore(name: string): any;
  getByKeys?: (...keys: string[]) => any;
  getByStrings?: (...values: any[]) => any;
  getModule(filter: (module: any) => boolean, options?: Record<string, unknown>): any;
}

export function centerChannelInList(documentRoot: Document, guildId: string, channelId: string): boolean {
  const route = `/channels/${guildId}/${channelId}`;
  const element = documentRoot.querySelector<HTMLElement>(`[data-list-item-id="channels___${channelId}"]`)
    ?? documentRoot.querySelector<HTMLElement>(`a[href="${route}"]`);
  if (!element) return false;
  element.scrollIntoView({block: "center", inline: "nearest", behavior: "auto"});
  return true;
}

export class DiscordNavigator {
  private readonly webpack: WebpackApi;
  private centerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(webpack: WebpackApi) {
    this.webpack = webpack;
  }

  navigate(destination: Destination): void {
    const transitionTo = this.getTransitionFunction();
    if (!transitionTo) throw new Error("Discord navigation module is unavailable");

    if (destination.kind === "guild") {
      const route = this.guildRoute(destination.guildId);
      transitionTo(route);
      const channelId = route.split("/")[3];
      if (channelId) this.scheduleCenter(destination.guildId, channelId);
      return;
    }
    transitionTo(`/channels/${destination.guildId}/${destination.id}`);
    this.scheduleCenter(destination.guildId, destination.id);
  }

  stop(): void {
    if (this.centerTimer) clearTimeout(this.centerTimer);
    this.centerTimer = null;
  }

  private guildRoute(guildId: string): string {
    const SelectedChannelStore = this.webpack.getStore("SelectedChannelStore");
    const GuildChannelStore = this.webpack.getStore("GuildChannelStore");
    const recentChannelId = this.tryCall(() => SelectedChannelStore?.getLastSelectedChannelId?.(guildId))
      ?? this.tryCall(() => SelectedChannelStore?.getMostRecentSelectedTextChannelId?.(guildId));
    const defaultChannel = this.tryCall(() => GuildChannelStore?.getDefaultChannel?.(guildId));
    const channelId = recentChannelId ?? defaultChannel?.id;
    return channelId ? `/channels/${guildId}/${channelId}` : `/channels/${guildId}`;
  }

  private getTransitionFunction(): ((path: string) => void) | null {
    const currentExport = this.webpack.getByStrings?.(
      "transitionTo - Transitioning to ",
      {searchExports: true}
    );
    if (typeof currentExport === "function") return currentExport;

    const keyedModule = this.webpack.getByKeys?.("transitionTo");
    if (typeof keyedModule?.transitionTo === "function") return keyedModule.transitionTo.bind(keyedModule);

    const discovered = this.webpack.getModule(
      (candidate) => typeof candidate === "function"
        && Function.prototype.toString.call(candidate).includes("transitionTo - Transitioning to "),
      {searchExports: true}
    );
    if (typeof discovered === "function") return discovered;

    const legacyModule = this.webpack.getModule(
      (module) => typeof module?.transitionTo === "function",
      {searchExports: true}
    );
    return typeof legacyModule?.transitionTo === "function"
      ? legacyModule.transitionTo.bind(legacyModule)
      : null;
  }

  private scheduleCenter(guildId: string, channelId: string, attempt = 0): void {
    if (typeof document === "undefined") return;
    if (this.centerTimer) clearTimeout(this.centerTimer);
    const delays = [0, 80, 180, 350, 650];
    this.centerTimer = setTimeout(() => {
      this.centerTimer = null;
      if (centerChannelInList(document, guildId, channelId)) return;
      if (attempt + 1 < delays.length) this.scheduleCenter(guildId, channelId, attempt + 1);
    }, delays[attempt]);
  }

  private tryCall<T>(operation: () => T): T | undefined {
    try {
      return operation();
    } catch {
      return undefined;
    }
  }
}
