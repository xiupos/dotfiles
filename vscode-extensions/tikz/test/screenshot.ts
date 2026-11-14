// Screenshots of the real Markdown preview in VSCodium (Playwright _electron).
//   scripts/screenshot.sh tikz [outDir]   (runs this under xvfb-run)
// Opens each fixture (Markdown files open straight into the preview via
// workbench.editorAssociations) in a light and a dark theme.
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { _electron as electron, Frame, Page } from "playwright-core";
import { codiumPath, ensureHeadless, extRoot, headlessFlags, makeWorkspace } from "./workspace";

const THEMES = [
  { name: "light", id: "Default Light Modern" },
  { name: "dark", id: "Default Dark Modern" },
];
const FILES = ["syntax.md", "samples.md", "error.md"];

async function previewFrame(page: Page, file: string, timeout = 60000): Promise<Frame> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    for (const f of page.frames()) {
      try {
        const st = await f.evaluate(() => {
          const figs = [...document.querySelectorAll(".tikz-figure")];
          return { n: figs.length, pending: figs.filter((e) => e.getAttribute("data-tikz-state") === "pending").length, title: document.querySelector("h1")?.textContent ?? "" };
        });
        if (st.n > 0 && st.pending === 0) return f;
      } catch {
        // Frame detached or not scriptable yet.
      }
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`preview of ${file} did not settle`);
}

async function main() {
  ensureHeadless();
  const outDir = path.resolve(process.argv[2] || path.join(extRoot, "screenshots"));
  fs.mkdirSync(outDir, { recursive: true });
  const exe = codiumPath();

  for (const theme of THEMES) {
    const ws = makeWorkspace();
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), "tikz-shot-user-"));
    const extDir = fs.mkdtempSync(path.join(os.tmpdir(), "tikz-shot-exts-"));
    fs.mkdirSync(path.join(userData, "User"), { recursive: true });
    fs.writeFileSync(
      path.join(userData, "User", "settings.json"),
      JSON.stringify({
        "workbench.colorTheme": theme.id,
        "workbench.editorAssociations": { "*.md": "vscode.markdown.preview.editor" },
        "workbench.startupEditor": "none",
        "workbench.tips.enabled": false,
        "window.titleBarStyle": "custom",
        "chat.disableAIFeatures": true,
      }),
    );
    const app = await electron.launch({
      executablePath: exe,
      env: { ...process.env } as Record<string, string>,
      args: [ws, ...headlessFlags, "--disable-workspace-trust", "--skip-welcome", "--skip-release-notes", "--disable-updates", "--user-data-dir", userData, "--extensions-dir", extDir, `--extensionDevelopmentPath=${extRoot}`],
      timeout: 60000,
    });
    try {
      const page = await app.firstWindow();
      await app.evaluate(({ BrowserWindow }) => {
        const w = BrowserWindow.getAllWindows()[0];
        w.setBounds({ x: 0, y: 0, width: 1400, height: 1000 });
      });
      await page.waitForSelector(".monaco-workbench", { timeout: 60000 });
      await page.waitForTimeout(2000);
      for (const file of FILES) {
        await page.keyboard.press("Control+P");
        await page.waitForTimeout(500);
        await page.keyboard.type(file);
        await page.waitForTimeout(800);
        await page.keyboard.press("Enter");
        const frame = await previewFrame(page, file);
        await page.waitForTimeout(800);
        const height = await frame.evaluate(() => document.body.scrollHeight);
        const view = await frame.evaluate(() => window.innerHeight);
        const shots = Math.min(3, Math.ceil(height / view));
        for (let i = 0; i < shots; i++) {
          await frame.evaluate((y) => window.scrollTo(0, y), i * (view - 80));
          await page.waitForTimeout(400);
          const out = path.join(outDir, `${theme.name}-${path.basename(file, ".md")}-${i + 1}.png`);
          await page.screenshot({ path: out });
          console.log(out);
        }
      }
    } finally {
      await app.close();
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
