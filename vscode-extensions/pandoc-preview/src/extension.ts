import * as path from "node:path";
import * as vscode from "vscode";
import { ResultCache, Scheduler } from "./cache.ts";
import { figurePlugin } from "./figure.ts";
import { tikzPlugin, type TikzBlock } from "./tikz.ts";
import { buildPreamble, compile, Formats, sha256, type Preamble, type RenderResult } from "./tex.ts";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Unique ids (pdftocairo always uses glyph-0-0, clip-0, ...) and the display size. */
function prepareSvg(svg: string, prefix: string, scale: number): string {
  return svg
    .replace(/^<\?xml[^>]*>\s*/, "")
    .replace(/<svg\b[^>]*>/, (tag) => tag.replace(/\b(width|height)="([\d.]+)(\w*)"/g, (_, a, n, u) => `${a}="${(+n * scale).toFixed(3)}${u}"`))
    .replace(/\bid="([^"]+)"/g, `id="${prefix}-$1"`)
    .replace(/\b((?:xlink:)?href)="#([^"]+)"/g, `$1="#${prefix}-$2"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`);
}

const errorHtml = (r: { message: string; detail: string }) =>
  `<div class="tikz-error"><div class="tikz-error-title">TikZ: ${esc(r.message)}</div>${r.detail ? `<pre>${esc(r.detail)}</pre>` : ""}</div>`;

export function activate(context: vscode.ExtensionContext) {
  const out = vscode.window.createOutputChannel("TikZ");
  const log = (msg: string) => out.appendLine(`[${new Date().toISOString()}] ${msg}`);
  const storage = context.globalStorageUri.fsPath;
  const version: string = context.extension.packageJSON.version;
  const cache = new ResultCache(path.join(storage, "svg"));
  const formats = new Formats(path.join(storage, "fmt"), log);
  /** Last successful SVG per figure (document + fence line), shown faded while re-rendering. */
  const lastGood = new Map<string, string>();
  let notified = false;

  let refreshTimer: NodeJS.Timeout | undefined;
  const refresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => vscode.commands.executeCommand("markdown.preview.refresh"), 100);
  };
  const scheduler = new Scheduler(
    cache,
    () => vscode.workspace.getConfiguration("tikz").get("render.concurrency", 2),
    (r: RenderResult) => {
      if (!r.ok && r.transient === "missing-command" && !notified) {
        notified = true;
        vscode.window.showErrorMessage(`TikZ: ${r.message}`);
      }
      refresh();
    },
  );

  function renderFigure(block: TikzBlock, env: any, md: any): string {
    const doc: vscode.Uri | undefined = env.currentDocument instanceof vscode.Uri ? env.currentDocument : undefined;
    const c = vscode.workspace.getConfiguration("tikz", doc);
    const caption = block.caption?.trim()
      ? `<figcaption>${md
          .renderInline(block.caption, env)
          .replace(/ data-line="\d+"/g, "") // lines of the caption source, not of the document
          .replace(/<span id="markdown-mermaid"[^>]*><\/span>/g, "")}</figcaption>` // marker the built-in Mermaid plugin adds to every render
      : "";
    const figure = (state: string, body: string) =>
      `<figure class="tikz-figure code-line${c.get("preview.adaptToTheme", true) ? " tikz-adapt" : ""}" data-line="${block.line}" data-tikz-state="${state}">` +
      `<div class="tikz-body">${body}</div>${caption}</figure>\n`;

    if (!vscode.workspace.isTrusted) {
      return figure("untrusted", `<div class="tikz-placeholder">TikZ: not rendered in an untrusted workspace</div><pre><code>${esc(block.code)}</code></pre>`);
    }
    const workspace = (doc && vscode.workspace.getWorkspaceFolder(doc)?.uri.fsPath) ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    let preamble: Preamble;
    try {
      preamble = buildPreamble({ files: c.get("preamble.files", []), extra: c.get("preamble.extra", ""), japanese: c.get("preamble.japanese", true) }, workspace);
    } catch (e) {
      return figure("error", errorHtml({ message: String((e as Error).message), detail: "" }));
    }

    const slot = `${doc ?? ""}#${block.line}`;
    const key = sha256(version, preamble.hash, block.code);
    const result = cache.get(key);
    if (result?.ok) {
      const svg = prepareSvg(result.svg, `tikz-${key.slice(0, 10)}`, c.get("preview.scale", 1.3));
      lastGood.set(slot, svg);
      return figure("ok", svg);
    }
    const stale = lastGood.has(slot) ? `<div class="tikz-stale">${lastGood.get(slot)}</div>` : "";
    if (result) return figure("error", errorHtml(result) + stale);

    const tex = { pdflatex: c.get("path.pdflatex", "pdflatex"), pdftocairo: c.get("path.pdftocairo", "pdftocairo"), timeout: c.get("render.timeout", 20000) };
    const dirs = [workspace, doc?.scheme === "file" ? path.dirname(doc.fsPath) : undefined].filter((d) => d !== undefined);
    scheduler.request(slot, key, c.get("render.delay", 500), () => compile(block.code, preamble, formats, tex, dirs));
    return figure("pending", stale || `<div class="tikz-placeholder">Rendering TikZ…</div>`);
  }

  context.subscriptions.push(
    out,
    vscode.commands.registerCommand("tikz.clearCache", () => {
      scheduler.cancelAll();
      cache.clear();
      lastGood.clear();
      refresh();
    }),
    vscode.commands.registerCommand("tikz.rebuildFormat", () => {
      scheduler.cancelAll();
      formats.clear();
      cache.clear();
      refresh();
    }),
    vscode.commands.registerCommand("tikz.showLog", () => out.show()),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration("tikz")) return;
      cache.dropTransient();
      notified = false;
      refresh();
    }),
    vscode.workspace.onDidGrantWorkspaceTrust(refresh),
    { dispose: () => scheduler.cancelAll() },
  );

  return {
    extendMarkdownIt(md: any) {
      tikzPlugin(md, (block, env) => renderFigure(block, env, md));
      figurePlugin(md);
      return md;
    },
  };
}

export function deactivate() {}
