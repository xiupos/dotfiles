// pdflatex / pdftocairo invocation, format dumping and log parsing.
// No vscode dependency.

import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { Preamble } from "./preamble";
import { sha256 } from "./util";

export interface TexConfig {
  pdflatex: string;
  pdftocairo: string;
  timeout: number;
}

export interface TexError {
  /** 0-based line within the figure code, if the error points into it. */
  codeLine?: number;
  message: string;
  excerpt: string;
}

export type RenderResult =
  | { ok: true; svg: string }
  | {
      ok: false;
      errors: TexError[];
      /** Not worth persisting (timeout, missing command): retried after restart or config change. */
      transient?: boolean;
    };

export type Logger = (msg: string) => void;

interface RunResult {
  code: number | null;
  output: string;
  timedOut: boolean;
  spawnError?: NodeJS.ErrnoException;
}

function run(cmd: string, args: string[], opts: { cwd: string; env?: NodeJS.ProcessEnv; timeout: number }): Promise<RunResult> {
  return new Promise((resolve) => {
    let output = "";
    let timedOut = false;
    let child;
    try {
      child = spawn(cmd, args, { cwd: opts.cwd, env: opts.env, stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      resolve({ code: null, output, timedOut, spawnError: e as NodeJS.ErrnoException });
      return;
    }
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, opts.timeout);
    child.stdout.on("data", (d) => (output += d));
    child.stderr.on("data", (d) => (output += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ code: null, output, timedOut, spawnError: e });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, output, timedOut });
    });
  });
}

function texEnv(dirs: string[]): NodeJS.ProcessEnv {
  const prev = process.env.TEXINPUTS;
  // A trailing empty entry keeps the default search path.
  const texinputs = [...dirs, prev ?? ""].join(path.delimiter);
  return { ...process.env, TEXINPUTS: texinputs.endsWith(path.delimiter) ? texinputs : texinputs + path.delimiter, max_print_line: "10000" };
}

/** Extract `! ...` errors and their context from a TeX log. */
export function parseLog(log: string, codeStartTexLine: number, codeLines: number): TexError[] {
  const lines = log.split(/\r?\n/);
  const errors: TexError[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.startsWith("!") || /^!\s+==> Fatal error/.test(l)) continue;
    const excerpt = [l];
    let texLine: number | undefined;
    for (let j = i + 1; j < lines.length && j < i + 16; j++) {
      excerpt.push(lines[j]);
      const m = /^l\.(\d+)/.exec(lines[j]);
      if (m) {
        texLine = Number(m[1]);
        if (j + 1 < lines.length && lines[j + 1].trim()) excerpt.push(lines[j + 1]);
        break;
      }
    }
    let codeLine: number | undefined;
    if (texLine !== undefined) {
      const k = texLine - codeStartTexLine;
      if (k >= 0 && k < codeLines) codeLine = k;
    }
    errors.push({ codeLine, message: l.replace(/^!\s*/, ""), excerpt: excerpt.join("\n").trimEnd() });
    i += excerpt.length - 1;
  }
  return errors;
}

function missing(cmd: string, setting: string): RenderResult {
  return { ok: false, transient: true, errors: [{ message: `command not found: ${cmd} (setting ${setting})`, excerpt: "" }] };
}

/** Formats dumped with mylatexformat, keyed by preamble + pdflatex version. */
export class Formats {
  private versions = new Map<string, Promise<string>>();
  private dumps = new Map<string, Promise<string | undefined>>();

  constructor(private dir: string, private log: Logger) {}

  private version(cfg: TexConfig): Promise<string> {
    let v = this.versions.get(cfg.pdflatex);
    if (!v) {
      v = run(cfg.pdflatex, ["--version"], { cwd: os.tmpdir(), timeout: 10000 }).then((r) => r.output.split("\n")[0] ?? "");
      this.versions.set(cfg.pdflatex, v);
    }
    return v;
  }

  /** Path of the format without `.fmt`, or undefined if dumping failed. */
  async get(preamble: Preamble, cfg: TexConfig): Promise<string | undefined> {
    const key = sha256(preamble.hash, await this.version(cfg)).slice(0, 32);
    let p = this.dumps.get(key);
    if (!p) {
      p = this.dump(key, preamble, cfg);
      this.dumps.set(key, p);
    }
    return p;
  }

  private async dump(key: string, preamble: Preamble, cfg: TexConfig): Promise<string | undefined> {
    const target = path.join(this.dir, key);
    if (fs.existsSync(target + ".fmt")) return target;
    await fs.promises.mkdir(this.dir, { recursive: true });
    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "tikz-fmt-"));
    try {
      await fs.promises.writeFile(path.join(tmp, "preamble.tex"), preamble.text + "\\begin{document}\\end{document}\n");
      const t0 = Date.now();
      const r = await run(
        cfg.pdflatex,
        ["-ini", "-interaction=nonstopmode", "-halt-on-error", "-no-shell-escape", `-jobname=${key}`, "&pdflatex", "mylatexformat.ltx", "preamble.tex"],
        { cwd: tmp, env: texEnv(preamble.dirs), timeout: Math.max(cfg.timeout, 60000) },
      );
      const fmt = path.join(tmp, key + ".fmt");
      if (r.code !== 0 || !fs.existsSync(fmt)) {
        const why = r.spawnError ? r.spawnError.message : r.timedOut ? "timed out" : `exit ${r.code}`;
        const log = await fs.promises.readFile(path.join(tmp, key + ".log"), "utf8").catch(() => "");
        const errs = parseLog(log, 0, 0).map((e) => e.excerpt).join("\n");
        this.log(`format dump failed (${why}); falling back to loading the preamble every time\n${errs}`);
        return undefined;
      }
      await fs.promises.copyFile(fmt, target + ".fmt.tmp");
      await fs.promises.rename(target + ".fmt.tmp", target + ".fmt");
      this.log(`format dumped in ${Date.now() - t0} ms: ${target}.fmt`);
      return target;
    } finally {
      await fs.promises.rm(tmp, { recursive: true, force: true });
    }
  }

  async clear(): Promise<void> {
    this.dumps.clear();
    this.versions.clear();
    await fs.promises.rm(this.dir, { recursive: true, force: true });
  }
}

export interface CompileOptions {
  /** Extra TEXINPUTS directories (Markdown file dir, workspace folder). */
  dirs: string[];
}

export async function compile(code: string, preamble: Preamble, formats: Formats, cfg: TexConfig, opts: CompileOptions, log: Logger): Promise<RenderResult> {
  const fmt = await formats.get(preamble, cfg);
  const body = code.endsWith("\n") ? code : code + "\n";
  const codeLines = body.split("\n").length - 1;
  // With a format, the preamble is already loaded and the file starts at \begin{document}.
  const head = fmt ? "" : preamble.text;
  const src = head + "\\begin{document}\n" + body + "\\end{document}\n";
  const codeStartTexLine = (fmt ? 0 : preamble.lines) + 2;

  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "tikz-"));
  try {
    await fs.promises.writeFile(path.join(tmp, "fig.tex"), src);
    const t0 = Date.now();
    const args = ["-interaction=nonstopmode", "-halt-on-error", "-no-shell-escape"];
    if (fmt) args.push(`-fmt=${fmt}`);
    args.push("fig.tex");
    const r = await run(cfg.pdflatex, args, { cwd: tmp, env: texEnv([...opts.dirs, ...preamble.dirs]), timeout: cfg.timeout });
    if (r.spawnError) return r.spawnError.code === "ENOENT" ? missing(cfg.pdflatex, "tikz.path.pdflatex") : { ok: false, transient: true, errors: [{ message: r.spawnError.message, excerpt: "" }] };
    if (r.timedOut) return { ok: false, transient: true, errors: [{ message: `pdflatex timed out after ${cfg.timeout} ms (setting tikz.render.timeout)`, excerpt: "" }] };
    const texLog = await fs.promises.readFile(path.join(tmp, "fig.log"), "utf8").catch(() => "");
    log(`pdflatex ${fmt ? "(format)" : "(full preamble)"} exit ${r.code} in ${Date.now() - t0} ms`);
    if (r.code !== 0 || !fs.existsSync(path.join(tmp, "fig.pdf"))) {
      const errors = parseLog(texLog, codeStartTexLine, codeLines);
      if (errors.length === 0) {
        const tail = (texLog || r.output).split("\n").slice(-20).join("\n");
        errors.push({ message: `pdflatex failed (exit ${r.code})`, excerpt: tail });
      }
      return { ok: false, errors };
    }
    const c = await run(cfg.pdftocairo, ["-svg", "fig.pdf", "fig.svg"], { cwd: tmp, timeout: cfg.timeout });
    if (c.spawnError) return c.spawnError.code === "ENOENT" ? missing(cfg.pdftocairo, "tikz.path.pdftocairo") : { ok: false, transient: true, errors: [{ message: c.spawnError.message, excerpt: "" }] };
    if (c.code !== 0) return { ok: false, transient: c.timedOut, errors: [{ message: `pdftocairo failed (exit ${c.code})`, excerpt: c.output.trim() }] };
    const svg = await fs.promises.readFile(path.join(tmp, "fig.svg"), "utf8");
    return { ok: true, svg };
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
}
