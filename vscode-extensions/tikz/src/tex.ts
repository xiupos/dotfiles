// The preview preamble, its format dump, and pdflatex -> pdftocairo. No vscode dependency.

import { spawn } from "node:child_process";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export const sha256 = (...parts: string[]) => crypto.createHash("sha256").update(parts.map((p) => `${p.length}:${p}`).join("")).digest("hex");

export type Log = (msg: string) => void;

export interface TexConfig {
  pdflatex: string;
  pdftocairo: string;
  timeout: number;
}

export type RenderResult =
  | { ok: true; svg: string }
  /** `transient` failures are not written to disk and are retried after a configuration change. */
  | { ok: false; message: string; detail: string; transient?: "missing-command" | "timeout" | "error" };

const fail = (message: string, detail = "", transient?: "missing-command" | "timeout" | "error"): RenderResult => ({ ok: false, message, detail, transient });

// ---- preamble

export interface PreambleConfig {
  files: string[];
  extra: string;
  japanese: boolean;
}

export interface Preamble {
  /** Up to (not including) \begin{document}. */
  text: string;
  /** Of `text` and the contents of the \input files. */
  hash: string;
  /** Directories of the \input files, for TEXINPUTS. */
  dirs: string[];
}

/** Close to the head of Pandoc's LaTeX template for -d article-ja / book-ja. */
export function buildPreamble(cfg: PreambleConfig, workspace: string | undefined): Preamble {
  const lines = [
    "\\PassOptionsToPackage{dvipsnames,svgnames,x11names}{xcolor}",
    "\\documentclass[border=2pt]{standalone}", // no [tikz]: it would drop non-tikzpicture content such as \xymatrix
    "\\usepackage{xcolor}",
    "\\usepackage{amsmath,amssymb}",
    "\\usepackage[T1]{fontenc}",
    "\\usepackage{lmodern}",
  ];
  if (cfg.japanese) lines.push("\\usepackage[whole]{bxcjkjatype}");
  const contents: string[] = [];
  const dirs = new Set<string>();
  for (const f of cfg.files) {
    let p = f.replace(/\$\{workspaceFolder\}/g, workspace ?? "").replace(/^~(?=\/|$)/, os.homedir());
    if (!path.isAbsolute(p) && workspace) p = path.join(workspace, p);
    if (!path.isAbsolute(p) || !fs.existsSync(p)) throw new Error(`preamble file not found: ${p}`);
    contents.push(fs.readFileSync(p, "utf8"));
    dirs.add(path.dirname(p));
    lines.push(`\\input{${p}}`);
  }
  if (cfg.extra.trim()) lines.push(cfg.extra.trimEnd());
  const text = lines.join("\n") + "\n";
  return { text, hash: sha256(text, ...contents), dirs: [...dirs] };
}

// ---- processes

interface Run {
  code: number | null;
  output: string;
  timedOut: boolean;
  error?: NodeJS.ErrnoException;
}

function run(cmd: string, args: string[], cwd: string, timeout: number, dirs: string[] = []): Promise<Run> {
  // TEXINPUTS: a trailing separator keeps the default search path. max_print_line: no wrapped log lines.
  const env = { ...process.env, TEXINPUTS: [...dirs, process.env.TEXINPUTS ?? ""].join(path.delimiter) + path.delimiter, max_print_line: "10000" };
  return new Promise((resolve) => {
    const r: Run = { code: null, output: "", timedOut: false };
    const child = spawn(cmd, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    const timer = setTimeout(() => ((r.timedOut = true), child.kill("SIGKILL")), timeout);
    child.stdout.on("data", (d) => (r.output += d));
    child.stderr.on("data", (d) => (r.output += d));
    child.on("error", (e) => (clearTimeout(timer), resolve({ ...r, error: e })));
    child.on("close", (code) => (clearTimeout(timer), resolve({ ...r, code })));
  });
}

/** The failure of a run that did not start or did not finish. */
function runFailure(r: Run, cmd: string, setting: string, timeout: number): RenderResult | undefined {
  if (r.error?.code === "ENOENT") return fail(`command not found: ${cmd} (setting ${setting})`, "", "missing-command");
  if (r.error) return fail(r.error.message, "", "error");
  if (r.timedOut) return fail(`${path.basename(cmd)} timed out after ${timeout} ms (setting tikz.render.timeout)`, "", "timeout");
}

const BOILERPLATE = /^(See the .* documentation for explanation\.|Type {1,2}H <return> {1,2}for immediate help\.|\s*\.\.\.\s*|\s*)$/;

/** The first `! ...` error of a TeX log, with its context up to the `l.<n>` line. */
export function texError(log: string): { message: string; detail: string } | undefined {
  const lines = log.split(/\r?\n/);
  const i = lines.findIndex((l) => l.startsWith("!") && !/^!\s+==> Fatal error/.test(l));
  if (i < 0) return undefined;
  const end = lines.findIndex((l, j) => j > i && /^l\.\d+/.test(l));
  const context = lines.slice(i + 1, end < 0 ? i + 8 : end + 2).filter((l) => !BOILERPLATE.test(l));
  return { message: lines[i].replace(/^!\s*/, ""), detail: context.join("\n") };
}

// ---- format dump

/** Preambles dumped with mylatexformat, keyed by preamble + pdflatex version. */
export class Formats {
  dir: string;
  log: Log;
  private dumps = new Map<string, Promise<string | undefined>>();
  private version?: Promise<string>;

  constructor(dir: string, log: Log) {
    this.dir = dir;
    this.log = log;
  }

  /** The format path without `.fmt`, or undefined if it cannot be dumped. */
  async get(preamble: Preamble, cfg: TexConfig): Promise<string | undefined> {
    this.version ??= run(cfg.pdflatex, ["--version"], os.tmpdir(), 10000).then((r) => r.output.split("\n")[0]);
    const key = sha256(preamble.hash, await this.version).slice(0, 32);
    if (!this.dumps.has(key)) this.dumps.set(key, this.dump(key, preamble, cfg));
    return this.dumps.get(key);
  }

  private async dump(key: string, preamble: Preamble, cfg: TexConfig): Promise<string | undefined> {
    const target = path.join(this.dir, key);
    if (fs.existsSync(target + ".fmt")) return target;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tikz-fmt-"));
    try {
      // mylatexformat stops at \begin{document}; without it the run ends in "Emergency stop".
      fs.writeFileSync(path.join(tmp, "preamble.tex"), preamble.text + "\\begin{document}\\end{document}\n");
      const args = ["-ini", "-interaction=nonstopmode", "-halt-on-error", "-no-shell-escape", `-jobname=${key}`, "&pdflatex", "mylatexformat.ltx", "preamble.tex"];
      const r = await run(cfg.pdflatex, args, tmp, Math.max(cfg.timeout, 60000), preamble.dirs);
      if (r.code !== 0) {
        const e = texError(fs.existsSync(path.join(tmp, key + ".log")) ? fs.readFileSync(path.join(tmp, key + ".log"), "utf8") : r.output);
        this.log(`format dump failed, loading the preamble every time: ${e?.message ?? r.error?.message ?? `exit ${r.code}`}`);
        return undefined;
      }
      fs.mkdirSync(this.dir, { recursive: true });
      fs.copyFileSync(path.join(tmp, key + ".fmt"), target + ".fmt");
      this.log(`format dumped: ${target}.fmt`);
      return target;
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  clear(): void {
    this.dumps.clear();
    this.version = undefined;
    fs.rmSync(this.dir, { recursive: true, force: true });
  }
}

// ---- compile

export async function compile(code: string, preamble: Preamble, formats: Formats, cfg: TexConfig, dirs: string[]): Promise<RenderResult> {
  const fmt = await formats.get(preamble, cfg);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tikz-"));
  try {
    // With a format the preamble is already loaded.
    fs.writeFileSync(path.join(tmp, "fig.tex"), (fmt ? "" : preamble.text) + `\\begin{document}\n${code.trimEnd()}\n\\end{document}\n`);
    const args = ["-interaction=nonstopmode", "-halt-on-error", "-no-shell-escape", ...(fmt ? [`-fmt=${fmt}`] : []), "fig.tex"];
    const t0 = Date.now();
    const r = await run(cfg.pdflatex, args, tmp, cfg.timeout, [...dirs, ...preamble.dirs]);
    formats.log(`pdflatex ${fmt ? "(format)" : "(full preamble)"}: exit ${r.code} in ${Date.now() - t0} ms`);
    const rf = runFailure(r, cfg.pdflatex, "tikz.path.pdflatex", cfg.timeout);
    if (rf) return rf;
    if (r.code !== 0 || !fs.existsSync(path.join(tmp, "fig.pdf"))) {
      const log = fs.existsSync(path.join(tmp, "fig.log")) ? fs.readFileSync(path.join(tmp, "fig.log"), "utf8") : r.output;
      const e = texError(log);
      return e ? fail(e.message, e.detail) : fail(`pdflatex failed (exit ${r.code})`, log.split("\n").slice(-20).join("\n"));
    }
    const c = await run(cfg.pdftocairo, ["-svg", "fig.pdf", "fig.svg"], tmp, cfg.timeout);
    const cf = runFailure(c, cfg.pdftocairo, "tikz.path.pdftocairo", cfg.timeout);
    if (cf) return cf;
    if (c.code !== 0) return fail(`pdftocairo failed (exit ${c.code})`, c.output.trim());
    return { ok: true, svg: fs.readFileSync(path.join(tmp, "fig.svg"), "utf8") };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
