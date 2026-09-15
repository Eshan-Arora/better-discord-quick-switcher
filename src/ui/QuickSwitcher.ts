import {rankDestinations, type RankedDestination} from "../search/ranking.ts";
import type {Destination, DestinationSnapshot, NavigationHistory} from "../types.ts";

interface QuickSwitcherOptions {
  snapshot: DestinationSnapshot;
  history: NavigationHistory;
  onChoose(destination: Destination): void;
  onClose(): void;
}

interface DestinationIconDefinition {
  filled: boolean;
  fillRule?: "evenodd";
  paths: readonly string[];
}

export const destinationIconDefinitions: Record<Destination["kind"], DestinationIconDefinition> = {
  channel: {
    filled: true,
    fillRule: "evenodd",
    paths: ["M10.99 3.16A1 1 0 1 0 9 2.84L8.15 8H4a1 1 0 0 0 0 2h3.82l-.67 4H3a1 1 0 1 0 0 2h3.82l-.8 4.84a1 1 0 0 0 1.97.32L8.85 16h4.97l-.8 4.84a1 1 0 0 0 1.97.32l.86-5.16H20a1 1 0 1 0 0-2h-3.82l.67-4H21a1 1 0 1 0 0-2h-3.82l.8-4.84a1 1 0 1 0-1.97-.32L15.15 8h-4.97l.8-4.84ZM14.15 14l.67-4H9.85l-.67 4h4.97Z"]
  },
  thread: {
    filled: true,
    paths: ["M12 2.81a1 1 0 0 1 0-1.41l.36-.36a1 1 0 0 1 1.41 0l9.2 9.2a1 1 0 0 1 0 1.4l-.7.7a1 1 0 0 1-1.3.13l-9.54-6.72a1 1 0 0 1-.08-1.58l1-1L12 2.8ZM12 21.2a1 1 0 0 1 0 1.41l-.35.35a1 1 0 0 1-1.41 0l-9.2-9.19a1 1 0 0 1 0-1.41l.7-.7a1 1 0 0 1 1.3-.12l9.54 6.72a1 1 0 0 1 .07 1.58l-1 1 .35.36ZM15.66 16.8a1 1 0 0 1-1.38.28l-8.49-5.66A1 1 0 1 1 6.9 9.76l8.49 5.65a1 1 0 0 1 .27 1.39ZM17.1 14.25a1 1 0 1 0 1.11-1.66L9.73 6.93a1 1 0 0 0-1.11 1.66l8.49 5.66Z"]
  },
  guild: {
    filled: false,
    paths: ["M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 19 10.5H5A1.5 1.5 0 0 1 3.5 9V6A1.5 1.5 0 0 1 5 4.5Z", "M5 13.5h14a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18v-3A1.5 1.5 0 0 1 5 13.5Z", "M7 7.5h.01", "M7 16.5h.01"]
  },
  dm: {
    filled: false,
    paths: ["M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z", "M5 20c.7-4.2 3.1-6.3 7-6.3s6.3 2.1 7 6.3"]
  }
};

function createDestinationIcon(kind: Destination["kind"]): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  const definition = destinationIconDefinitions[kind];
  svg.setAttribute("fill", definition.filled ? "currentColor" : "none");
  svg.setAttribute("stroke", definition.filled ? "none" : "currentColor");
  if (!definition.filled) {
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
  }
  for (const pathData of definition.paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    if (definition.fillRule) {
      path.setAttribute("fill-rule", definition.fillRule);
      path.setAttribute("clip-rule", definition.fillRule);
    }
    svg.append(path);
  }
  return svg;
}

export class QuickSwitcher {
  private readonly options: QuickSwitcherOptions;
  private root: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private list: HTMLDivElement | null = null;
  private results: RankedDestination[] = [];
  private selectedIndex = 0;

  constructor(options: QuickSwitcherOptions) {
    this.options = options;
  }

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

      const symbol = document.createElement("div");
      symbol.className = "bqs-symbol";
      symbol.dataset.kind = destination.kind;
      if (destination.iconUrl) {
        const image = document.createElement("img");
        image.className = "bqs-destination-image";
        image.dataset.kind = destination.kind;
        image.src = destination.iconUrl;
        image.alt = "";
        image.draggable = false;
        symbol.append(image);
      } else if (destination.groupDmAvatarUrls?.length) {
        if (destination.groupDmAvatarUrls.length === 1) {
          const image = document.createElement("img");
          image.className = "bqs-destination-image";
          image.dataset.kind = "dm";
          image.src = destination.groupDmAvatarUrls[0];
          image.alt = "";
          image.draggable = false;
          symbol.append(image);
        } else {
          const facepile = document.createElement("div");
          facepile.className = "bqs-group-dm-facepile";
          destination.groupDmAvatarUrls.slice(0, 2).forEach((url, avatarIndex) => {
            const image = document.createElement("img");
            image.className = `bqs-group-dm-avatar bqs-group-dm-avatar-${avatarIndex === 0 ? "back" : "front"}`;
            image.src = url;
            image.alt = "";
            image.draggable = false;
            facepile.append(image);
          });
          symbol.append(facepile);
        }
      } else {
        symbol.append(createDestinationIcon(destination.kind));
      }
      symbol.title = destination.kind === "guild" ? "Server"
        : destination.kind === "dm" ? (destination.groupDm ? "Group DM" : "Direct Message")
          : destination.kind === "thread" ? "Thread" : "Channel";
      symbol.setAttribute("aria-hidden", "true");

      const name = document.createElement("div");
      name.className = "bqs-name";
      name.textContent = destination.name;

      const meta = document.createElement("div");
      meta.className = "bqs-meta";
      meta.textContent = destination.kind === "thread"
        ? `Thread${destination.parentChannelName ? ` · #${destination.parentChannelName}` : ""}`
        : destination.kind === "guild" ? "Server"
          : destination.kind === "dm" ? (destination.groupDm ? "Group DM" : "Direct Message")
            : "Channel";

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

      row.append(symbol, name, meta, badges);
      this.list?.append(row);
      if (index === this.selectedIndex) {
        this.input?.setAttribute("aria-activedescendant", row.id);
        row.scrollIntoView({block: "nearest"});
      }
    });
  }
}
