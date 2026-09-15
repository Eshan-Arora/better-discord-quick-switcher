import * as esbuild from "esbuild";
import { access, copyFile, mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const outfile = path.join(root, "dist", "BetterQuickSwitcher.plugin.js");
const isWatch = process.argv.includes("--watch");
const shouldInstall = process.argv.includes("--install");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));

const banner = `/**
 * @name BetterQuickSwitcher
 * @author Eshan
 * @description Server-scoped, unread-aware navigation where channels and threads are peers.
 * @version ${packageJson.version}
 */`;

async function readLocalPluginDir() {
  try {
    const contents = await readFile(path.join(root, ".env.local"), "utf8");
    const line = contents.split(/\r?\n/).find((entry) => entry.startsWith("BETTERDISCORD_PLUGIN_DIR="));
    return line
      ?.slice("BETTERDISCORD_PLUGIN_DIR=".length)
      .trim()
      .replace(/^['\"]|['\"]$/g, "");
  } catch {
    return undefined;
  }
}

async function detectPluginDir() {
  const configured = process.env.BETTERDISCORD_PLUGIN_DIR || (await readLocalPluginDir());
  if (configured) return path.resolve(configured);

  if (process.platform === "darwin") {
    return path.join(homedir(), "Library", "Application Support", "BetterDiscord", "plugins");
  }
  if (process.platform === "win32" && process.env.APPDATA) {
    return path.join(process.env.APPDATA, "BetterDiscord", "plugins");
  }
  return path.join(homedir(), ".config", "BetterDiscord", "plugins");
}

let pluginDir;
async function installArtifact() {
  pluginDir ??= await detectPluginDir();
  try {
    await access(pluginDir);
  } catch {
    throw new Error(`BetterDiscord plugin directory does not exist: ${pluginDir}`);
  }
  const destination = path.join(pluginDir, path.basename(outfile));
  await copyFile(outfile, destination);
  console.log(`[BetterQuickSwitcher] Installed ${destination}`);
}

await mkdir(path.dirname(outfile), { recursive: true });

const options = {
  entryPoints: [path.join(root, "src", "entry.cts")],
  outfile,
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: ["chrome120"],
  sourcemap: isWatch ? "inline" : false,
  legalComments: "none",
  banner: { js: banner },
  define: { __DEV__: JSON.stringify(isWatch) },
  logLevel: "info",
  plugins: shouldInstall
    ? [
        {
          name: "install-betterdiscord-plugin",
          setup(build) {
            build.onEnd(async (result) => {
              if (result.errors.length) return;
              try {
                await installArtifact();
              } catch (error) {
                console.error(`[BetterQuickSwitcher] ${error instanceof Error ? error.message : String(error)}`);
              }
            });
          },
        },
      ]
    : [],
};

if (isWatch) {
  const context = await esbuild.context(options);
  await context.watch();
  console.log("[BetterQuickSwitcher] Watching for changes. Press Ctrl+C to stop.");
} else {
  await esbuild.build(options);
  console.log(`[BetterQuickSwitcher] Built ${outfile}`);
}
