// Shared by runTest.ts and screenshot.ts: a fresh temporary workspace with
// the fixtures, and launch arguments for VSCodium in a container.
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/** vscode-extensions/tikz (found upwards, since bundles live at different depths under out/) */
export const extRoot = (() => {
  for (let d = __dirname; d !== path.dirname(d); d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, "esbuild.mjs"))) return d;
  }
  throw new Error(`extension root not found above ${__dirname}`);
})();
/** chezmoi source directory */
export const chezmoiRoot = path.resolve(extRoot, "..", "..");
export const pandocIncludes = path.join(chezmoiRoot, "private_dot_local", "private_share", "pandoc", "includes");

/**
 * VSCodium must never appear on the user's screen. The scripts run it under
 * xvfb-run; here Wayland is also taken away (Electron would otherwise prefer
 * WAYLAND_DISPLAY over the virtual X server) and anything started outside
 * xvfb-run is refused.
 */
export function ensureHeadless(): void {
  delete process.env.WAYLAND_DISPLAY;
  delete process.env.ELECTRON_OZONE_PLATFORM_HINT;
  if (!/xvfb-run/.test(process.env.XAUTHORITY ?? "") && !process.env.TIKZ_ALLOW_REAL_DISPLAY) {
    throw new Error("refusing to start VSCodium on the real display: run under xvfb-run (scripts/test-integration.sh, scripts/screenshot.sh)");
  }
}

export function codiumPath(): string {
  if (process.env.CODIUM) return process.env.CODIUM;
  return execFileSync(path.join(extRoot, "..", "scripts", "fetch-codium.sh"), { encoding: "utf8" }).trim();
}

export function makeWorkspace(settings: Record<string, unknown> = {}): string {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "tikz-ws-"));
  fs.cpSync(path.join(extRoot, "test", "fixtures"), ws, { recursive: true });
  fs.mkdirSync(path.join(ws, ".vscode"));
  fs.writeFileSync(
    path.join(ws, ".vscode", "settings.json"),
    JSON.stringify(
      {
        // Use the preamble from the chezmoi source, not the applied copy in ~.
        "tikz.preamble.files": [path.join(pandocIncludes, "common.sty"), path.join(pandocIncludes, "font-ja.sty")],
        "tikz.render.delay": 50,
        ...settings,
      },
      null,
      2,
    ),
  );
  return ws;
}

/**
 * VSCodium arguments: X11 only (i.e. the virtual display), fresh user data and
 * extensions directories, optional user settings.
 */
export function launchArgs(opts: { workspaceTrust?: boolean; userSettings?: Record<string, unknown> } = {}): string[] {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "tikz-user-"));
  const extDir = fs.mkdtempSync(path.join(os.tmpdir(), "tikz-exts-"));
  if (opts.userSettings) {
    fs.mkdirSync(path.join(userData, "User"));
    fs.writeFileSync(path.join(userData, "User", "settings.json"), JSON.stringify(opts.userSettings, null, 2));
  }
  const args = ["--ozone-platform=x11", "--no-sandbox", "--disable-gpu", "--disable-updates", "--skip-welcome", "--skip-release-notes"];
  args.push("--user-data-dir", userData, "--extensions-dir", extDir);
  if (!opts.workspaceTrust) args.push("--disable-workspace-trust");
  return args;
}
