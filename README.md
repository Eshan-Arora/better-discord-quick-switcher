# Better Quick Switcher

A BetterDiscord plugin that replaces Discord's `Cmd+K` switcher with a server-scoped navigator. It searches channels and threads in the current server, keeps recent DMs available, and shows other servers without mixing in all of their channels.

## Features

- Search text channels and locally known threads in the current server.
- Search recent and open direct messages from anywhere.
- Switch to another server without including its channels in the current results.
- Prioritize mentions, unmuted unread destinations, recent activity, and frequently visited destinations.
- Match names fuzzily, with channel and thread context available for close matches.
- Keep muted destinations searchable without boosting ordinary unread activity.
- Scroll the selected channel into view after navigation when Discord's channel list is available.

## Controls

| Key | Action |
| --- | --- |
| `Cmd+K` | Open or close the switcher |
| `Up` / `Down` | Move the selection |
| `Ctrl+K` / `Ctrl+J` | Move the selection |
| `Enter` | Open the selected destination |
| `Esc` | Close the switcher |

While the plugin is enabled, it suppresses Discord's stock `Cmd+K` switcher.

## Ranking

With an empty query, explicit mentions and unmuted unread destinations rank highest. Recent message activity and locally recorded visits influence the remaining order. Unread DMs appear ahead of server destinations, while stale read DMs fall below servers. Server order follows Discord's sidebar and folder arrangement.

With a typed query, fuzzy name matching is the main signal. Recent activity and visit history break close matches, and a thread's parent channel provides additional context.

## Data and scope

Visit counts and timestamps are stored locally through BetterDiscord's data API. The plugin does not maintain a separate account or remote service.

Thread search is limited to threads already present in Discord's local `ChannelStore`. It does not fetch a complete archive of old threads.

## Development

The project requires Node.js 24 or newer. The included `.nvmrc` selects the expected version.

```sh
nvm use
npm install
npm run dev
```

`npm run dev` watches the source, rebuilds `dist/BetterQuickSwitcher.plugin.js`, and copies the result to the detected BetterDiscord plugin directory. Reload a development build by toggling the plugin off and on in Discord; use `Cmd+R` if needed.

The source repository is separate from Discord and BetterDiscord. The file placed in BetterDiscord's plugin directory is generated output.

To override the detected plugin directory, export `BETTERDISCORD_PLUGIN_DIR` or set it in an ignored `.env.local` file:

```sh
BETTERDISCORD_PLUGIN_DIR="/path/to/BetterDiscord/plugins"
```

### Commands

```sh
npm run build       # Build dist without installing the plugin
npm test            # Run the test suite
npm run typecheck   # Check TypeScript types
npm run check       # Run typecheck, tests, and a production build
```

## Discord compatibility

Code that depends on Discord internals is kept in two adapters:

- `src/discord/stores.ts` handles guilds, channels, threads, permissions, and unread state.
- `src/discord/navigation.ts` handles route changes.

If a Discord update breaks the plugin, update or reinstall BetterDiscord first, then check the developer console for `BetterQuickSwitcher` warnings. Reinstall BetterDiscord for Stable with:

```sh
bdcli install --channel stable
```
