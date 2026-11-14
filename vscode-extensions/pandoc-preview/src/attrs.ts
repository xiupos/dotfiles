// Pandoc attributes: `{#id .class key=value key="quoted value"}`.
// In quoted values a backslash escapes ASCII punctuation only (as in pandoc),
// so caption="$\alpha$" keeps its backslash.

export interface Attr {
  id: string;
  classes: string[];
  attrs: Record<string, string>;
}

const ITEM = /\s*(?:#([^\s{}]+)|\.([^\s{}]+)|([\w:.-]+)=(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^\s"']+)))/y;
const unescape = (s: string) => s.replace(/\\([!-/:-@[-`{-~])/g, "$1");

/** The inside of `{...}`, or undefined if it is not valid. */
export function parseAttrs(src: string): Attr | undefined {
  const a: Attr = { id: "", classes: [], attrs: {} };
  ITEM.lastIndex = 0;
  while (src.slice(ITEM.lastIndex).trim()) {
    const m = ITEM.exec(src);
    if (!m) return undefined;
    if (m[1]) a.id = m[1];
    else if (m[2]) a.classes.push(m[2]);
    else a.attrs[m[3]] = m[6] ?? unescape(m[4] ?? m[5]);
  }
  return a;
}

/** A fence info string: `tikz`, `tikz {#id}` or `{.tikz #id ...}`. */
export function parseInfo(info: string): Attr | undefined {
  const m = /^\s*([^\s{]*)\s*(?:\{(.*)\})?\s*$/.exec(info);
  const a = m && (m[2] !== undefined ? parseAttrs(m[2]) : { id: "", classes: [], attrs: {} });
  if (!a) return undefined;
  if (m[1]) a.classes.unshift(m[1]);
  return a;
}
