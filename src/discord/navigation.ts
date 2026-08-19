import type {Destination} from "../types.ts";

interface WebpackApi {
  getStore(name: string): any;
  getByKeys?: (...keys: string[]) => any;
  getByStrings?: (...values: any[]) => any;
  getModule(filter: (module: any) => boolean, options?: Record<string, unknown>): any;
}

export class DiscordNavigator {
  private readonly webpack: WebpackApi;

  constructor(webpack: WebpackApi) {
    this.webpack = webpack;
  }

  navigate(destination: Destination): void {
    const transitionTo = this.getTransitionFunction();
    if (!transitionTo) throw new Error("Discord navigation module is unavailable");

    if (destination.kind === "guild") {
      transitionTo(this.guildRoute(destination.guildId));
      return;
    }
    transitionTo(`/channels/${destination.guildId}/${destination.id}`);
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

  private tryCall<T>(operation: () => T): T | undefined {
    try {
      return operation();
    } catch {
      return undefined;
    }
  }
}
