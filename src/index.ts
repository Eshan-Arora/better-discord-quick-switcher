import {DiscordNavigator} from "./discord/navigation.ts";
import {DiscordDestinationStore} from "./discord/stores.ts";
import {HistoryStore} from "./storage/history.ts";
import {QuickSwitcher} from "./ui/QuickSwitcher.ts";
import {styles} from "./ui/styles.ts";

const PLUGIN_NAME = "BetterQuickSwitcher";

export default class BetterQuickSwitcherPlugin {
  private api: BdApi | null = null;
  private destinations: DiscordDestinationStore | null = null;
  private navigator: DiscordNavigator | null = null;
  private history: HistoryStore | null = null;
  private switcher: QuickSwitcher | null = null;

  start(): void {
    if (this.api) this.stop();
    this.api = new BdApi(PLUGIN_NAME);
    this.destinations = new DiscordDestinationStore(this.api.Webpack, this.api.Logger);
    this.navigator = new DiscordNavigator(this.api.Webpack);
    this.history = new HistoryStore(this.api.Data);
    this.api.DOM.addStyle(styles);
    window.addEventListener("keydown", this.onGlobalKeyDown, true);
    this.api.Logger.info(`Started${__DEV__ ? " (development build)" : ""}`);
    this.api.UI.showToast("Better Quick Switcher enabled", {type: "success", timeout: 2500});
  }

  stop(): void {
    window.removeEventListener("keydown", this.onGlobalKeyDown, true);
    this.navigator?.stop();
    this.switcher?.close(false);
    this.switcher = null;
    this.api?.DOM.removeStyle();
    this.api?.Logger.info("Stopped and cleaned up");
    this.destinations = null;
    this.navigator = null;
    this.history = null;
    this.api = null;
  }

  private readonly onGlobalKeyDown = (event: KeyboardEvent): void => {
    if (!event.metaKey || event.ctrlKey || event.altKey || event.key.toLowerCase() !== "k") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.repeat) return;
    if (this.switcher) {
      this.switcher.close();
      return;
    }
    this.open();
  };

  private open(): void {
    if (!this.destinations || !this.history || !this.api) return;
    try {
      const snapshot = this.destinations.snapshot();
      this.switcher = new QuickSwitcher({
        snapshot,
        history: this.history.getSnapshot(),
        onChoose: (destination) => {
          this.switcher?.close(false);
          this.switcher = null;
          try {
            this.navigator?.navigate(destination);
            this.history?.record(destination);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.api?.Logger.error("Navigation failed", error);
            this.api?.UI.showToast(`Better Quick Switcher: ${message}`, {type: "error"});
          }
        },
        onClose: () => {
          this.switcher = null;
        }
      });
      this.switcher.open();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.api.Logger.error("Could not open", error);
      this.api.UI.showToast(`Better Quick Switcher: ${message}`, {type: "error"});
    }
  }
}
