// Pandoc-style attribute parsing for fence info strings and fenced divs.
//
//   tikz                          -> classes [tikz]
//   tikz {#fig:a}                 -> classes [tikz], id fig:a
//   {.tikz #fig:a caption="..."}  -> classes [tikz], id fig:a, caption
//
// Quoted values follow Pandoc: a backslash before ASCII punctuation is an
// escape (\" -> ", \\ -> \, \$ -> $); any other backslash is kept, so
// caption="$\alpha$" stays "$\alpha$".

export interface Attr {
  id: string;
  classes: string[];
  attrs: Record<string, string>;
}

const PUNCT = /[!-/:-@[-`{-~]/;

function unescape(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && i + 1 < s.length && PUNCT.test(s[i + 1])) {
      out += s[++i];
    } else {
      out += s[i];
    }
  }
  return out;
}

/** Parse the inside of `{...}`. Returns undefined if it is not valid. */
function parseAttrBlock(src: string): Attr | undefined {
  const attr: Attr = { id: "", classes: [], attrs: {} };
  let i = 0;
  const n = src.length;
  while (i < n) {
    while (i < n && /\s/.test(src[i])) i++;
    if (i >= n) break;
    const c = src[i];
    if (c === "#" || c === ".") {
      let j = i + 1;
      while (j < n && !/[\s{}]/.test(src[j])) j++;
      const name = src.slice(i + 1, j);
      if (!name) return undefined;
      if (c === "#") attr.id = name;
      else attr.classes.push(name);
      i = j;
      continue;
    }
    const m = /^([A-Za-z_][\w:.-]*)=/.exec(src.slice(i));
    if (!m) return undefined;
    const key = m[1];
    i += m[0].length;
    let value: string;
    if (src[i] === '"' || src[i] === "'") {
      const q = src[i];
      let j = i + 1;
      while (j < n && src[j] !== q) j += src[j] === "\\" ? 2 : 1;
      if (j >= n) return undefined;
      value = unescape(src.slice(i + 1, j));
      i = j + 1;
    } else {
      let j = i;
      while (j < n && !/\s/.test(src[j])) j++;
      value = src.slice(i, j);
      i = j;
    }
    attr.attrs[key] = value;
  }
  return attr;
}

/** Parse a fence info string (`tikz`, `tikz {#id}`, `{.tikz ...}`). */
export function parseInfo(info: string): Attr | undefined {
  const s = info.trim();
  if (!s) return undefined;
  if (s.startsWith("{")) {
    if (!s.endsWith("}")) return undefined;
    return parseAttrBlock(s.slice(1, -1));
  }
  const m = /^([^\s{]+)\s*(?:\{(.*)\})?\s*$/.exec(s);
  if (!m) return { id: "", classes: [s.split(/\s+/)[0]], attrs: {} };
  const rest = m[2] !== undefined ? parseAttrBlock(m[2]) : { id: "", classes: [], attrs: {} };
  if (!rest) return undefined;
  return { ...rest, classes: [m[1], ...rest.classes] };
}

/** The Lua filter treats a block as TikZ when its *first* class is `tikz`. */
export function isTikz(attr: Attr | undefined): attr is Attr {
  return !!attr && attr.classes[0] === "tikz";
}
