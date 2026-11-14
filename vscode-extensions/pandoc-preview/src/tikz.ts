// markdown-it: hand ```tikz fences to `render`, and read Pandoc attributes. No vscode dependency.

export interface TikzBlock {
  code: string;
  /** Inline Markdown from the `caption` attribute. */
  caption?: string;
  /** 0-based line of the opening fence. */
  line: number;
}

// One item of `{#id .class key=value key="quoted value"}`. The id is accepted but not kept.
const ITEM = /\s*(?:#[^\s{}]+|\.([^\s{}]+)|([\w:.-]+)=(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^\s"']+)))/y;
// In quoted values a backslash escapes ASCII punctuation only (as in Pandoc), so "$\alpha$" keeps it.
const unescape = (s: string) => s.replace(/\\([!-/:-@[-`{-~])/g, "$1");

/** The classes and key=value pairs of Pandoc attributes (the inside of `{...}`), or undefined if not valid. */
export function parseAttrs(src: string): { classes: string[]; attrs: Record<string, string> } | undefined {
  const classes: string[] = [];
  const attrs: Record<string, string> = {};
  ITEM.lastIndex = 0;
  while (src.slice(ITEM.lastIndex).trim()) {
    const m = ITEM.exec(src);
    if (!m) return undefined;
    if (m[1]) classes.push(m[1]);
    else if (m[2]) attrs[m[2]] = m[5] ?? unescape(m[3] ?? m[4]);
  }
  return { classes, attrs };
}

/** For a tikz fence info string (`tikz`, `tikz {...}`, `{.tikz ...}`: the first class is tikz), its caption. */
export function tikzFence(info: string): { caption?: string } | undefined {
  const m = /^\s*([^\s{]*)\s*(?:\{(.*)\})?\s*$/.exec(info);
  const a = m && (m[2] !== undefined ? parseAttrs(m[2]) : { classes: [], attrs: {} });
  if (!a || (m[1] || a.classes[0]) !== "tikz") return undefined;
  return { caption: a.attrs.caption };
}

export function tikzPlugin(md: any, render: (block: TikzBlock, env: any) => string): void {
  const fence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens: any[], idx: number, options: any, env: any, self: any) => {
    const t = tokens[idx];
    const f = tikzFence(t.info);
    if (!f || !t.map) return fence(tokens, idx, options, env, self);
    return render({ code: t.content, caption: f.caption, line: t.map[0] }, env ?? {});
  };
}
