// Shared by runTest.ts and screenshot.ts: a fresh temporary workspace with
// the fixtures, and launch arguments for VSCodium in a container.
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/** vscode-extensions/tikz */
export const extRoot = path.resolve(__dirname, "..", "..");
/** chezmoi source directory */
export const chezmoiRoot = path.resolve(extRoot, "..", "..");
export const pandocIncludes = path.join(chezmoiRoot, "private_dot_local", "private_share", "pandoc", "includes");

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

export function launchArgs(opts: { workspaceTrust?: boolean } = {}): string[] {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "tikz-user-"));
  const extDir = fs.mkdtempSync(path.join(os.tmpdir(), "tikz-exts-"));
  const args = ["--no-sandbox", "--disable-gpu", "--user-data-dir", userData, "--extensions-dir", extDir, "--skip-welcome", "--skip-release-notes"];
  if (!opts.workspaceTrust) args.push("--disable-workspace-trust");
  return args;
}
