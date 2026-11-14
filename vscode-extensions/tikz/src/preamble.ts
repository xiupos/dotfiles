// Preview preamble: mimics the head of Pandoc's LaTeX template for
// -d article-ja / -d book-ja, then \input's the configured files.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { sha256 } from "./util";

export interface PreambleConfig {
  files: string[];
  extra: string;
  japanese: boolean;
}

export interface Preamble {
  /** LaTeX up to (not including) \begin{document}. Ends with a newline. */
  text: string;
  /** Number of lines of `text`. */
  lines: number;
  /** Hash of `text` and the contents of every \input file. */
  hash: string;
  /** Directories of the \input files (added to TEXINPUTS). */
  dirs: string[];
}

export class PreambleError extends Error {}

export function resolvePath(p: string, workspaceFolder: string | undefined): string {
  let s = p.replace(/\$\{workspaceFolder\}/g, workspaceFolder ?? "");
  if (s === "~" || s.startsWith("~/")) s = path.join(os.homedir(), s.slice(1));
  if (!path.isAbsolute(s)) {
    if (!workspaceFolder) throw new PreambleError(`relative preamble path without a workspace folder: ${p}`);
    s = path.join(workspaceFolder, s);
  }
  return path.normalize(s);
}

export function buildPreamble(cfg: PreambleConfig, workspaceFolder: string | undefined): Preamble {
  const parts: string[] = [
    "\\PassOptionsToPackage{dvipsnames,svgnames,x11names}{xcolor}",
    "\\documentclass[border=2pt]{standalone}",
    "\\usepackage{xcolor}",
    "\\usepackage{amsmath,amssymb}",
    "\\usepackage[T1]{fontenc}",
    "\\usepackage{lmodern}",
  ];
  if (cfg.japanese) parts.push("\\usepackage[whole]{bxcjkjatype}");
  const contents: string[] = [];
  const dirs: string[] = [];
  for (const f of cfg.files) {
    const abs = resolvePath(f, workspaceFolder);
    let body: string;
    try {
      body = fs.readFileSync(abs, "utf8");
    } catch {
      throw new PreambleError(`preamble file not found: ${abs}`);
    }
    contents.push(body);
    if (!dirs.includes(path.dirname(abs))) dirs.push(path.dirname(abs));
    parts.push(`\\input{${abs}}`);
  }
  if (cfg.extra.trim()) parts.push(cfg.extra.replace(/\s+$/, ""));
  const text = parts.join("\n") + "\n";
  return {
    text,
    lines: text.split("\n").length - 1,
    hash: sha256(text, ...contents),
    dirs,
  };
}
