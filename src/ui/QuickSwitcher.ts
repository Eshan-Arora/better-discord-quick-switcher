import {rankDestinations, type RankedDestination} from "../search/ranking.ts";
import type {Destination, DestinationSnapshot, NavigationHistory} from "../types.ts";

interface QuickSwitcherOptions {
  snapshot: DestinationSnapshot;
  history: NavigationHistory;
  onChoose(destination: Destination): void;
  onClose(): void;
}

export class QuickSwitcher {
  private root: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private list: HTMLDivElement | null = null;
  private results: RankedDestination[] = [];
  private selectedIndex = 0;

  constructor(private readonly options: QuickSwitcherOptions) {}

  open(): void {
    this.close(false);
    this.root = document.createElement("div");
    this.root.className = "bqs-overlay";
    this.root.addEventListener("mousedown", this.onBackdropMouseDown);

    const dialog = document.createElement("div");
    dialog.className = "bqs-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Better Quick Switcher");

    const searchWrap = document.createElement("div");
    searchWrap.className = "bqs-search-wrap";
    this.input = document.createElement("input");
    this.input.className = "bqs-search";
    this.input.type = "text";
    this.input.autocomplete = "off";
    this.input.spellcheck = false;
    this.input.placeholder = this.options.snapshot.currentGuildName
      ? `Go somewhere in ${this.options.snapshot.currentGuildName}…`
      : "Choose a server…";
    this.input.setAttribute("aria-label", "Search destinations");
    this.input.addEventListener("input", this.onInput);
    this.input.addEventListener("keydown", this.onInputKeyDown, true);
    searchWrap.append(this.input);

    this.list = document.createElement("div");
    this.list.className = "bqs-list";
    this.list.setAttribute("role", "listbox");

    const footer = document.createElement("div");
    footer.className = "bqs-footer";
    const scope = document.createElement("span");
    scope.textContent = this.options.snapshot.currentGuildName ?? "No active server";
    const help = document.createElement("span");
    help.textContent = "↑↓ navigate   ↵ open   esc close";
    footer.append(scope, help);

    dialog.append(searchWrap, this.list, footer);
    this.root.append(dialog);
    document.body.append(this.root);
    this.refresh();
    requestAnimationFrame(() => this.input?.focus());
  }

  close(notify = true): void {
    if (!this.root) return;
    this.root.removeEventListener("mousedown", this.onBackdropMouseDown);
    this.input?.removeEventListener("input", this.onInput);
    this.input?.removeEventListener("keydown", this.onInputKeyDown, true);
    this.root.remove();
    this.root = null;
    this.input = null;
    this.list = null;
    if (notify) this.options.onClose();
  }

  private readonly onInput = (): void => {
    this.selectedIndex = 0;
    this.refresh();
  };

  private readonly onInputKeyDown = (event: KeyboardEvent): void => {
    const ctrlNavigation = event.ctrlKey && !event.metaKey;
    const moveDown = event.key === "ArrowDown" || (ctrlNavigation && event.key.toLowerCase() === "j");
    const moveUp = event.key === "ArrowUp" || (ctrlNavigation && event.key.toLowerCase() === "k");
    if (moveDown || moveUp) {
      event.preventDefault();
      event.stopPropagation();
      const delta = moveDown ? 1 : -1;
      this.selectedIndex = (this.selectedIndex + delta + this.results.length) % Math.max(1, this.results.length);
      this.render();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      const destination = this.results[this.selectedIndex];
      if (destination) this.options.onChoose(destination);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }
  };

  private readonly onBackdropMouseDown = (event: MouseEvent): void => {
    if (event.target === this.root) this.close();
  };

  private refresh(): void {
    this.results = rankDestinations(
      this.options.snapshot.destinations,
      this.input?.value ?? "",
      this.options.history
    ).slice(0, 60);
    this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.results.length - 1));
    this.render();
  }

  private render(): void {
    if (!this.list) return;
    this.list.replaceChildren();
    if (!this.results.length) {
      const empty = document.createElement("div");
      empty.className = "bqs-empty";
      empty.textContent = this.input?.value ? "No matching destinations" : "No destinations available";
      this.list.append(empty);
      return;
    }

    this.results.forEach((destination, index) => {
      const row = document.createElement("div");
      row.id = `bqs-result-${index}`;
      row.className = "bqs-result";
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(index === this.selectedIndex));
      row.addEventListener("mousemove", () => {
        if (this.selectedIndex !== index) {
          this.selectedIndex = index;
          this.render();
        }
      });
      row.addEventListener("mousedown", (event) => event.preventDefault());
      row.addEventListener("click", () => this.options.onChoose(destination));

      const name = document.createElement("div");
      name.className = "bqs-name";
      name.textContent = destination.kind === "channel" ? `#${destination.name}` : destination.name;

      const meta = document.createElement("div");
      meta.className = "bqs-meta";
      meta.textContent = destination.kind === "thread"
        ? `Thread${destination.parentChannelName ? ` · #${destination.parentChannelName}` : ""}`
        : destination.kind === "guild" ? "Server" : "Channel";

      const badges = document.createElement("div");
      badges.className = "bqs-badges";
      if (destination.unread) {
        const unread = document.createElement("span");
        unread.textContent = destination.unreadCount > 0 ? `${destination.unreadCount} unread` : "unread";
        badges.append(unread);
      }
      if (destination.mentions > 0) {
        const mention = document.createElement("span");
        mention.className = "bqs-mention";
        mention.textContent = String(destination.mentions);
        mention.title = `${destination.mentions} mention${destination.mentions === 1 ? "" : "s"}`;
        badges.append(mention);
      }

      row.append(name, meta, badges);
      this.list?.append(row);
      if (index === this.selectedIndex) {
        this.input?.setAttribute("aria-activedescendant", row.id);
        row.scrollIntoView({block: "nearest"});
      }
    });
  }
}
