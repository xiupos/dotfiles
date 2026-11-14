import * as path from "path";
import * as vscode from "vscode";
import { captionHtml, errorHtml, figureHtml, FigureState, placeholderHtml, staleHtml, untrustedHtml } from "./html";
import { Host, MarkdownIt, TikzBlock, tikzPlugin } from "./markdown";
import { buildPreamble, Preamble, PreambleError } from "./preamble";
import { ResultCache, Scheduler } from "./renderer";
import { prepareSvg } from "./svg";
import { compile, Formats, TexConfig, TexError } from "./tex";
import { sha256 } from "./util";

interface Settings {
  tex: TexConfig;
  preamble: { files: string[]; extra: string; japanese: boolean };
  adaptToTheme: boolean;
  scale: number;
  delay: number;
}

function settingsFor(doc: vscode.Uri | undefined): Settings {
  const c = vscode.workspace.getConfiguration("tikz", doc);
  return {
    tex: {
      pdflatex: c.get("path.pdflatex", "pdflatex"),
      pdftocairo: c.get("path.pdftocairo", "pdftocairo"),
      timeout: c.get("render.timeout", 20000),
    },
    preamble: {
      files: c.get("preamble.files", []),
      extra: c.get("preamble.extra", ""),
      japanese: c.get("preamble.japanese", true),
    },
    adaptToTheme: c.get("preview.adaptToTheme", true),
    scale: c.get("preview.scale", 1.3),
    delay: c.get("render.delay", 500),
  };
}

/** Per top-level render of one document (stored in the markdown-it env). */
interface RenderState {
  doc: vscode.Uri | undefined;
  index: number;
  diags: vscode.Diagnostic[];
  settings: Settings;
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
  /** Last successful SVG per figure slot, shown faded while re-rendering. */
  const lastGood = new Map<string, string>();
  let notifiedMissing = false;

  let refreshTimer: NodeJS.Timeout | undefined;
  const refresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => void vscode.commands.executeCommand("markdown.preview.refresh"), 100);
  };

  const scheduler = new Scheduler(
    cache,
    () => vscode.workspace.getConfiguration("tikz").get("render.concurrency", 2),
    (_key, r) => {
      if (!r.ok && r.transient === "missing-command" && !notifiedMissing) {
        notifiedMissing = true;
        void vscode.window.showErrorMessage(`TikZ: ${r.errors[0].message}`);
      }
      refresh();
    },
  );

  const workspaceFolder = (doc: vscode.Uri | undefined): string | undefined =>
    (doc && vscode.workspace.getWorkspaceFolder(doc)?.uri.fsPath) ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  const newState = (env: any): RenderState => {
    const doc = env?.currentDocument instanceof vscode.Uri ? env.currentDocument : undefined;
    return { doc, index: 0, diags: [], settings: settingsFor(doc) };
  };
  const stateOf = (env: any): RenderState => (env.__tikz ??= newState(env));

  const preambleOf = (st: RenderState): Preamble | PreambleError => {
    if (!st.preamble) {
      try {
        st.preamble = buildPreamble(st.settings.preamble, workspaceFolder(st.doc));
      } catch (e) {
        st.preamble = e instanceof PreambleError ? e : new PreambleError(String(e));
      }
    }
    return st.preamble;
  };

  const renderFigure = (block: TikzBlock, env: any, md: MarkdownIt): string => {
    const st = stateOf(env);
    const { doc, settings } = st;
    const slot = `${doc?.toString() ?? "<string>"}#${st.index++}`;
    const fig = (state: FigureState, body: string) => figureHtml(block, state, body, captionHtml(block, env, md), settings.adaptToTheme);

    if (!vscode.workspace.isTrusted) return fig("untrusted", untrustedHtml(block.code));

    const preamble = preambleOf(st);
    if (preamble instanceof PreambleError) {
      const e = { message: preamble.message, excerpt: "" };
      st.diags.push(diagnostic(block, e));
      return fig("error", errorHtml([e]));
    }

    const key = sha256(version, preamble.hash, block.code);
    const result = cache.get(key);
    if (result?.ok) {
      const svg = prepareSvg(result.svg, `tikz-${key.slice(0, 10)}`, settings.scale);
      lastGood.set(slot, svg);
      return fig("ok", svg);
    }
    const stale = staleHtml(lastGood.get(slot));
    if (result) {
      for (const e of result.errors) st.diags.push(diagnostic(block, e));
      return fig("error", errorHtml(result.errors, block) + stale);
    }

    const dirs = [workspaceFolder(doc), doc?.scheme === "file" ? path.dirname(doc.fsPath) : undefined].filter((d): d is string => !!d);
    scheduler.request(slot, key, settings.delay, () => compile(block.code, preamble, formats, settings.tex, { dirs }, log));
    return fig("pending", stale || placeholderHtml);
  };

  const host: Host = {
    beginRender(env) {
      env.__tikz = newState(env);
    },
    endRender(env) {
      const { doc, diags } = stateOf(env);
      if (doc && vscode.workspace.isTrusted) diagnostics.set(doc, diags);
    },
    renderFigure,
  };

  context.subscriptions.push(
    out,
    diagnostics,
    vscode.commands.registerCommand("tikz.clearCache", () => {
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
    vscode.workspace.onDidGrantWorkspaceTrust(refresh),
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

/** A diagnostic on the Markdown line of the error, or on the fence if it cannot be mapped. */
function diagnostic(block: TikzBlock, e: TexError): vscode.Diagnostic {
  const line = e.codeLine !== undefined ? block.codeLine + e.codeLine : block.fenceLine;
  const d = new vscode.Diagnostic(new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER), e.message, vscode.DiagnosticSeverity.Error);
  d.source = "tikz";
  return d;
}

export function deactivate(): void {}
