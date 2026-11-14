// Test helpers shared by the extensions: VSCodium launching (never on the real
// display), integration test runs and preview screenshots.
// Bundled into each extension's out/test/*.js, so paths are passed in, not
// derived from __dirname.
import { execFileSync, spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/** The extension directory above `dir` (the one with esbuild.mjs). */
export function findExtRoot(dir: string): string {
  for (let d = dir; d !== path.dirname(d); d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, "esbuild.mjs"))) return d;
  }
  throw new Error(`extension root not found above ${dir}`);
}

/**
 * VSCodium must never appear on the real screen. The scripts run it under
 * xvfb-run; here Wayland is also taken away (Electron would otherwise prefer
 * WAYLAND_DISPLAY over the virtual X server) and anything started outside
 * xvfb-run is refused.
 */
export function ensureHeadless(): void {
  delete process.env.WAYLAND_DISPLAY;
  delete process.env.ELECTRON_OZONE_PLATFORM_HINT;
  if (!/xvfb-run/.test(process.env.XAUTHORITY ?? "") && !process.env.ALLOW_REAL_DISPLAY) {
    throw new Error("refusing to start VSCodium on the real display: run under xvfb-run (scripts/test-integration.sh, scripts/screenshot.sh)");
  }
}

export function codiumPath(extRoot: string): string {
  if (process.env.CODIUM) return process.env.CODIUM;
  return execFileSync(path.join(extRoot, "..", "scripts", "fetch-codium.sh"), { encoding: "utf8" }).trim();
}

/** A fresh workspace with a copy of `fixtures` and the given workspace settings. */
export function makeWorkspace(fixtures: string, settings: Record<string, unknown> = {}): string {
  const ws = fs.mkdtempSync(path.join(os.tmpdir(), "vsx-ws-"));
  fs.cpSync(fixtures, ws, { recursive: true });
  fs.mkdirSync(path.join(ws, ".vscode"), { recursive: true });
  fs.writeFileSync(path.join(ws, ".vscode", "settings.json"), JSON.stringify(settings, null, 2));
  return ws;
}

/**
 * VSCodium arguments: X11 only (i.e. the virtual display), fresh user data and
 * extensions directories, optional user settings.
 */
export function launchArgs(opts: { workspaceTrust?: boolean; userSettings?: Record<string, unknown> } = {}): string[] {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "vsx-user-"));
  const extDir = fs.mkdtempSync(path.join(os.tmpdir(), "vsx-exts-"));
  if (opts.userSettings) {
    fs.mkdirSync(path.join(userData, "User"));
    fs.writeFileSync(path.join(userData, "User", "settings.json"), JSON.stringify(opts.userSettings, null, 2));
  }
  const args = ["--ozone-platform=x11", "--no-sandbox", "--disable-gpu", "--disable-updates", "--skip-welcome", "--skip-release-notes"];
  args.push("--user-data-dir", userData, "--extensions-dir", extDir);
  if (!opts.workspaceTrust) args.push("--disable-workspace-trust");
  return args;
}

export interface TestRun {
  /** Passed to the suite as TEST_MODE. */
  name: string;
  workspace: string;
  /** Keep Workspace Trust enabled (the workspace starts untrusted). */
  workspaceTrust?: boolean;
}

/**
 * Run the mocha suite at out/test/suite/index.js once per run.
 * @vscode/test-electron always passes --disable-workspace-trust, so runs with
 * Workspace Trust launch VSCodium directly with otherwise the same arguments.
 */
export async function runIntegrationTests(extRoot: string, runs: TestRun[], only?: string): Promise<void> {
  ensureHeadless();
  const exe = codiumPath(extRoot);
  const extensionTestsPath = path.join(extRoot, "out", "test", "suite", "index.js");
  for (const run of runs) {
    if (only && run.name !== only) continue;
    console.log(`--- ${run.name} (workspace ${run.workspace})`);
    if (!run.workspaceTrust) {
      const { runTests } = await import("@vscode/test-electron");
      await runTests({
        vscodeExecutablePath: exe,
        extensionDevelopmentPath: extRoot,
        extensionTestsPath,
        launchArgs: [run.workspace, ...launchArgs()],
        extensionTestsEnv: { TEST_MODE: run.name },
      });
      continue;
    }
    const args = [run.workspace, ...launchArgs({ workspaceTrust: true }), "--no-cached-data", `--extensionTestsPath=${extensionTestsPath}`, `--extensionDevelopmentPath=${extRoot}`];
    await new Promise<void>((resolve, reject) => {
      const p = spawn(exe, args, { stdio: "inherit", env: { ...process.env, TEST_MODE: run.name } });
      p.on("error", reject);
      p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${run.name} run failed with code ${code}`))));
    });
  }
}

export interface ScreenshotOptions {
  extRoot: string;
  /** Called once per theme. */
  workspace: () => string;
  files: string[];
  outDir: string;
  /** Runs inside the preview frame: true once the content is ready to be captured. */
  ready: () => boolean;
}

const THEMES = [
  { name: "light", id: "Default Light Modern" },
  { name: "dark", id: "Default Dark Modern" },
];

/**
 * Screenshots of the real Markdown preview (Playwright _electron), in a light
 * and a dark theme. Markdown files open straight into the preview via
 * workbench.editorAssociations.
 */
export async function takeScreenshots(o: ScreenshotOptions): Promise<void> {
  ensureHeadless();
  const { _electron: electron } = await import("playwright-core");
  fs.mkdirSync(o.outDir, { recursive: true });
  const exe = codiumPath(o.extRoot);

  for (const theme of THEMES) {
    const userSettings = {
      "workbench.colorTheme": theme.id,
      "workbench.editorAssociations": { "*.md": "vscode.markdown.preview.editor" },
      "workbench.startupEditor": "none",
      "workbench.tips.enabled": false,
      "window.titleBarStyle": "custom",
      "chat.disableAIFeatures": true,
    };
    const app = await electron.launch({
      executablePath: exe,
      env: { ...process.env } as Record<string, string>,
      args: [o.workspace(), ...launchArgs({ userSettings }), `--extensionDevelopmentPath=${o.extRoot}`],
      timeout: 60000,
    });
    try {
      const page = await app.firstWindow();
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setBounds({ x: 0, y: 0, width: 1400, height: 1000 }));
      await page.waitForSelector(".monaco-workbench", { timeout: 60000 });
      await page.waitForTimeout(2000);
      for (const file of o.files) {
        await page.keyboard.press("Control+P");
        await page.waitForTimeout(500);
        await page.keyboard.type(file);
        await page.waitForTimeout(800);
        await page.keyboard.press("Enter");
        const frame = await previewFrame(page, file, o.ready);
        await page.waitForTimeout(800);
        const height = await frame.evaluate(() => document.body.scrollHeight);
        const view = await frame.evaluate(() => window.innerHeight);
        const shots = Math.min(3, Math.ceil(height / view));
        for (let i = 0; i < shots; i++) {
          await frame.evaluate((y) => window.scrollTo(0, y), i * (view - 80));
          await page.waitForTimeout(400);
          const out = path.join(o.outDir, `${theme.name}-${path.basename(file, ".md")}-${i + 1}.png`);
          await page.screenshot({ path: out });
          console.log(out);
        }
      }
    } finally {
      await app.close();
    }
  }
}

type Page = Awaited<ReturnType<Awaited<ReturnType<typeof import("playwright-core")["_electron"]["launch"]>>["firstWindow"]>>;
type Frame = ReturnType<Page["frames"]>[number];

/** The visible preview frame, once `ready` holds in it. */
async function previewFrame(page: Page, file: string, ready: () => boolean, timeout = 60000): Promise<Frame> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    for (const f of page.frames()) {
      try {
        // Previews of other tabs stay loaded but hidden (zero height).
        if ((await f.evaluate(() => window.innerHeight > 0)) && (await f.evaluate(ready))) return f;
      } catch {
        // Frame detached or not scriptable yet.
      }
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`preview of ${file} did not settle`);
}
