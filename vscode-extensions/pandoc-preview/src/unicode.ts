// Unicode math symbols in tikz code -> LaTeX commands, with the table of the Pandoc filter
// unicode-math.lua (read from the file itself) and the same spacing rule. No vscode dependency.

import * as fs from "node:fs";

export interface UnicodeMath {
  convert: (code: string) => string;
  /** Number of symbols read from the filter. */
  size: number;
}

// One entry of the `symbols` table: `  ["α"] = "\\alpha",` (commented-out entries start with `--`).
const ENTRY = /^\s*\["((?:\\.|[^"\\])*)"\]\s*=\s*"((?:\\.|[^"\\])*)"\s*,?\s*$/gm;
const unescape = (s: string) => s.replace(/\\(.)/g, "$1");

// is_alpha_num of unicode-math.lua.
function isAlphaNum(cp: number | undefined): boolean {
  if (cp === undefined) return false;
  return (
    (cp >= 0x30 && cp <= 0x39) ||
    (cp >= 0x41 && cp <= 0x5a) ||
    (cp >= 0x61 && cp <= 0x7a) ||
    (cp >= 0xc0 && cp <= 0x24f && cp !== 0xd7 && cp !== 0xf7) ||
    (cp >= 0x370 && cp <= 0x3ff) ||
    (cp >= 0x1f00 && cp <= 0x1fff) ||
    (cp >= 0x400 && cp <= 0x4ff) ||
    (cp >= 0x2100 && cp <= 0x214f) ||
    (cp >= 0x1d400 && cp <= 0x1d7ff)
  );
}

/** The conversion of unicode-math.lua at `file`. Throws if the file has no symbols. */
export function loadUnicodeMath(file: string): UnicodeMath {
  const symbols = new Map<string, string>();
  for (const m of fs.readFileSync(file, "utf8").matchAll(ENTRY)) symbols.set(unescape(m[1]), unescape(m[2]));
  if (!symbols.size) throw new Error(`no symbols found in ${file}`);
  const convert = (code: string) => {
    const chars = [...code];
    return chars.map((ch, i) => {
      const r = symbols.get(ch);
      return r === undefined ? ch : isAlphaNum(chars[i + 1]?.codePointAt(0)) ? r + " " : r;
    }).join("");
  };
  return { convert, size: symbols.size };
}
