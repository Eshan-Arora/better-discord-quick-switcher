# Better Quick Switcher

A private BetterDiscord plugin that replaces Discord's `Cmd+K` experience with a compact, server-scoped navigator. Channels and threads are first-class peers; other servers appear only as server-level destinations.

## Local environment (verified 2026-08-19)

- macOS on Apple Silicon
- Discord Stable: `/Applications/Discord.app`, app version `0.0.407`
- Discord data: `~/Library/Application Support/discord`
- BetterDiscord `1.13.14`, installed with the official CLI into Discord Stable
- BetterDiscord data: `~/Library/Application Support/BetterDiscord`
- Plugin output directory: `~/Library/Application Support/BetterDiscord/plugins`
- Node `24.19.0` through NVM, npm `11.17.0`
- Git `2.50.1`; Homebrew `6.0.18`

The source repository is independent from both Discord and BetterDiscord. The file in BetterDiscord's plugin directory is generated output.

## Development

```sh
nvm use
npm install
npm run dev
```

`npm run dev` watches the source, rebuilds `dist/BetterQuickSwitcher.plugin.js`, and copies it to the detected BetterDiscord plugin folder. Toggling the plugin off and on in Discord's BetterDiscord plugin settings is the fastest verified reload; `Cmd+R` remains the fallback.

The plugin directory is detected by platform. To override it without committing a machine-specific path, either export `BETTERDISCORD_PLUGIN_DIR` or create an ignored `.env.local`:

```sh
BETTERDISCORD_PLUGIN_DIR="/path/to/BetterDiscord/plugins"
```

Useful commands:

```sh
npm run build       # build dist only; does not require Discord
npm test            # pure fuzzy/ranking tests
npm run typecheck
npm run check       # typecheck, tests, production build
```

## Behavior

- `Cmd+K` opens or closes the custom switcher and suppresses the stock switcher.
- Empty query: mentions, unread destinations, and decayed usage history determine the order.
- Typed query: fuzzy name match dominates; thread parent names provide weaker context.
- `Up`/`Down` or `Ctrl+K`/`Ctrl+J` moves selection, `Enter` navigates, and `Esc` closes.
- Current-server text channels and client-known threads are searchable.
- Other servers' internal destinations are excluded; the servers themselves remain selectable.
- Visit counts and timestamps are stored locally through BetterDiscord's scoped data API.

## Architecture and Discord updates

Discord internals are isolated to:

- `src/discord/stores.ts`: current guild, channel/thread collection, permissions, unread state
- `src/discord/navigation.ts`: Discord route transitions

Everything else uses plain `Destination` objects. When a Discord update breaks the plugin, first update BetterDiscord, then inspect console warnings from `BetterQuickSwitcher`. Usually only one of those two adapter files should need adjustment.

Thread coverage in v1 is intentionally limited to threads already present in Discord's local `ChannelStore` (`getAllThreadsForGuild`). It does not fetch comprehensive archived-thread history.

## Manual verification checklist

1. Enable **Better Quick Switcher** under Discord Settings → BetterDiscord → Plugins.
2. Press `Cmd+K`; confirm only the custom palette appears.
3. Confirm current-server text channels appear and other-server channels do not.
4. Confirm an active/joined thread appears as a peer result with its parent only in metadata.
5. Search a thread by its own partial name, then by parent + thread context.
6. Navigate to a channel, a thread, and another server with `Enter`.
7. Confirm unread channels and threads rise to the top on an empty query.
8. Disable and re-enable the plugin; confirm stock `Cmd+K` returns while disabled and no duplicate listener appears after re-enabling.

### Verified on this machine

The v1 loop and behavior were exercised live in Discord Stable: watch/rebuild/copy, plugin discovery, enable/disable cleanup, stock switcher restoration, custom `Cmd+K`, current-server channel and thread results, thread-name and parent-context search, channel/thread navigation, server switching, and re-scoping after a server switch. Unread ordering was observed live; mention-count support is wired to Discord's read-state store but no known live mention was available during verification.

## BetterDiscord maintenance

BetterDiscord was installed with the official CLI. Re-running the following updates/reinstalls the Stable injection without coupling this repository to BetterDiscord source:

```sh
bdcli install --channel stable
```

No BetterDiscord source checkout is required.
