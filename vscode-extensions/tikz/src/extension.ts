import * as path from "path";
import * as vscode from "vscode";
import { Host, MarkdownIt, TikzBlock, tikzPlugin } from "./markdown";
import { buildPreamble, Preamble, PreambleError } from "./preamble";
import { ResultCache, Scheduler } from "./renderer";
import { prepareSvg } from "./svg";
import { compile, Formats, RenderResult, TexConfig, TexError } from "./tex";
import { escapeHtml, sha256 } from "./util";

interface RenderState {
  index: number;
  diags: vscode.Diagnostic[];
  preamble?: Preamble | PreambleError;
}

export interface TikzApi {
  extendMarkdownIt(md: MarkdownIt): MarkdownIt;
  /** For tests: resolves when no figure is waiting or compiling. */
  whenIdle(): Promise<void>;
  /** For tests: number of pdflatex compilations started. */
  compiledCount(): number;
}

export function activate(context: vscode.ExtensionContext): TikzApi {
  const out = vscode.window.createOutputChannel("TikZ");
  const log = (msg: string) => out.appendLine(`[${new Date().toISOString()}] ${msg}`);
  const diagnostics = vscode.languages.createDiagnosticCollection("tikz");
  const storage = context.globalStorageUri.fsPath;
  const version: string = context.extension.packageJSON.version;

  const cache = new ResultCache(path.join(storage, "svg"));
  const formats = new Formats(path.join(storage, "fmt"), log);
  const lastGood = new Map<string, string>();
  let notifiedMissing = false;

  let refreshTimer: NodeJS.Timeout | undefined;
  const refresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined;
      void vscode.commands.executeCommand("markdown.preview.refresh");
    }, 100);
  };

  const scheduler = new Scheduler(
    cache,
    () => vscode.workspace.getConfiguration("tikz").get<number>("render.concurrency", 2),
    (_key, r) => {
      if (!r.ok && r.transient && !notifiedMissing && r.errors[0]?.message.startsWith("command not found")) {
        notifiedMissing = true;
        void vscode.window.showErrorMessage(`TikZ: ${r.errors[0].message}`);
      }
      refresh();
    },
  );

  const texConfig = (scope: vscode.Uri | undefined): TexConfig => {
    const c = vscode.workspace.getConfiguration("tikz", scope);
    return {
      pdflatex: c.get<string>("path.pdflatex", "pdflatex"),
      pdftocairo: c.get<string>("path.pdftocairo", "pdftocairo"),
      timeout: c.get<number>("render.timeout", 20000),
    };
  };

  const workspaceFolder = (doc: vscode.Uri | undefined): string | undefined =>
    (doc && vscode.workspace.getWorkspaceFolder(doc)?.uri.fsPath) ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  const preambleFor = (doc: vscode.Uri | undefined): Preamble => {
    const c = vscode.workspace.getConfiguration("tikz", doc);
    return buildPreamble(
      {
        files: c.get<string[]>("preamble.files", []),
        extra: c.get<string>("preamble.extra", ""),
        japanese: c.get<boolean>("preamble.japanese", true),
      },
      workspaceFolder(doc),
    );
  };

  const docOf = (env: any): vscode.Uri | undefined => (env?.currentDocument instanceof vscode.Uri ? env.currentDocument : undefined);

  const stateOf = (env: any): RenderState => (env.__tikz ??= { index: 0, diags: [] });

  const host: Host = {
    beginRender(env) {
      env.__tikz = { index: 0, diags: [] } satisfies RenderState;
    },
    endRender(env) {
      const doc = docOf(env);
      if (doc && vscode.workspace.isTrusted) diagnostics.set(doc, stateOf(env).diags);
    },
    renderFigure(block, env, md) {
      const st = stateOf(env);
      const doc = docOf(env);
      const slot = `${doc?.toString() ?? "<string>"}#${st.index++}`;
      const caption = renderCaption(block, env, md);
      const adapt = vscode.workspace.getConfiguration("tikz", doc).get<boolean>("preview.adaptToTheme", true);
      const fig = (state: string, body: string) =>
        `<figure class="tikz-figure code-line${adapt ? " tikz-adapt" : ""}" data-line="${block.startLine}" data-tikz-state="${state}"${block.id ? ` id="${escapeHtml(block.id)}"` : ""}>` +
        `<div class="tikz-body">${body}</div>${caption}</figure>\n`;

      if (!vscode.workspace.isTrusted) {
        return fig("untrusted", `<div class="tikz-untrusted"><div class="tikz-placeholder">TikZ: このワークスペースは信頼されていないため描画しません</div><pre><code>${escapeHtml(block.code)}</code></pre></div>`);
      }

      if (!st.preamble) {
        try {
          st.preamble = preambleFor(doc);
        } catch (e) {
          st.preamble = e instanceof PreambleError ? e : new PreambleError(String(e));
        }
      }
      if (st.preamble instanceof PreambleError) {
        st.diags.push(diag(block, { message: st.preamble.message, excerpt: "" }));
        return fig("error", errorBox([{ message: st.preamble.message, excerpt: "" }]));
      }
      const preamble = st.preamble;

      const key = sha256(version, preamble.hash, block.code);
      const prefix = `tikz-${key.slice(0, 10)}`;
      const stale = () => {
        const prev = lastGood.get(slot);
        return prev ? `<div class="tikz-stale">${prev}</div>` : "";
      };
      const result = cache.get(key);
      if (result?.ok) {
        const svg = prepareSvg(result.svg, prefix);
        lastGood.set(slot, svg);
        return fig("ok", svg);
      }
      if (result && !result.ok) {
        for (const e of result.errors) st.diags.push(diag(block, e));
        return fig("error", errorBox(result.errors) + stale());
      }

      const delay = vscode.workspace.getConfiguration("tikz", doc).get<number>("render.delay", 500);
      const dirs = [workspaceFolder(doc), doc?.scheme === "file" ? path.dirname(doc.fsPath) : undefined].filter((d): d is string => !!d);
      const cfg = texConfig(doc);
      scheduler.request(slot, key, delay, () => compile(block.code, preamble, formats, cfg, { dirs }, log));
      return fig("pending", stale() || `<div class="tikz-placeholder">TikZ を描画中…</div>`);
    },
  };

  const diag = (block: TikzBlock, e: TexError): vscode.Diagnostic => {
    const line = e.codeLine !== undefined ? block.codeLine + e.codeLine : block.fenceLine;
    const d = new vscode.Diagnostic(new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER), e.message, vscode.DiagnosticSeverity.Error);
    d.source = "tikz";
    return d;
  };

  context.subscriptions.push(
    out,
    diagnostics,
    vscode.commands.registerCommand("tikz.clearCache", async () => {
      scheduler.cancelAll();
      cache.clear();
      lastGood.clear();
      log("cache cleared");
      refresh();
    }),
    vscode.commands.registerCommand("tikz.rebuildFormat", async () => {
      scheduler.cancelAll();
      await formats.clear();
      cache.clear();
      log("formats cleared; they are rebuilt on the next render");
      refresh();
    }),
    vscode.commands.registerCommand("tikz.showLog", () => out.show()),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration("tikz")) return;
      cache.dropTransient();
      notifiedMissing = false;
      refresh();
    }),
    vscode.workspace.onDidGrantWorkspaceTrust(() => refresh()),
    vscode.workspace.onDidCloseTextDocument((d) => diagnostics.delete(d.uri)),
    { dispose: () => scheduler.cancelAll() },
  );

  log(`activated (version ${version}, storage ${storage})`);

  return {
    extendMarkdownIt(md: MarkdownIt) {
      tikzPlugin(md, host);
      return md;
    },
    whenIdle: () => scheduler.idle(),
    compiledCount: () => scheduler.compiled,
  };
}

function renderCaption(block: TikzBlock, env: any, md: MarkdownIt): string {
  if (!block.caption || !block.caption.src.trim()) return "";
  const html = block.caption.kind === "inline" ? md.renderInline(block.caption.src, env) : md.render(block.caption.src, env);
  // Line numbers inside the caption refer to the caption source, not the document.
  return `<figcaption>${String(html).replace(/ data-line="\d+"/g, "").trim()}</figcaption>`;
}

function errorBox(errors: TexError[]): string {
  return errors
    .map(
      (e) =>
        `<div class="tikz-error"><div class="tikz-error-title">TikZ: ${escapeHtml(e.message)}</div>` +
        (e.excerpt && e.excerpt !== `! ${e.message}` ? `<pre>${escapeHtml(e.excerpt)}</pre>` : "") +
        `</div>`,
    )
    .join("");
}

export function deactivate(): void {}

// Re-export for tests that exercise the pure modules through the bundle.
export type { RenderResult };
