// markdown-it integration: ```tikz fences and ::: {#fig:...} divs.
//
// markdown-it types are not a dependency; the few members used are typed here.

import { isTikz, parseAttrBlock, parseInfo } from "./attrs";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type MarkdownIt = any;
type Token = any;
type StateBlock = any;

export interface TikzBlock {
  code: string;
  id: string;
  /** Caption source: inline Markdown (attribute form) or blocks (div form). */
  caption?: { kind: "inline" | "block"; src: string };
  /** 0-based first line of the figure (the fence, or the ::: of the div form). */
  startLine: number;
  /** 0-based line of the opening fence in the Markdown source. */
  fenceLine: number;
  /** 0-based line of the first line of code. */
  codeLine: number;
}

export interface Host {
  /** Called once per top-level render, before any figure. */
  beginRender(env: any): void;
  /** Called once per top-level render, after all figures. */
  endRender(env: any): void;
  renderFigure(block: TikzBlock, env: any, md: MarkdownIt): string;
}

const DIV_OPEN = /^ {0,3}(:{3,})\s*\{([^}]*)\}\s*:*\s*$/;
const DIV_OPEN_ANY = /^ {0,3}:{3,}\s*\S/;
const DIV_CLOSE = /^ {0,3}:{3,}\s*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;

export function tikzPlugin(md: MarkdownIt, host: Host): void {
  // Top-level render hooks (renderInline/render for captions nest inside).
  let depth = 0;
  const render = md.renderer.render.bind(md.renderer);
  md.renderer.render = (tokens: Token[], options: any, env: any) => {
    env = env ?? {};
    if (depth === 0) host.beginRender(env);
    depth++;
    try {
      return render(tokens, options, env);
    } finally {
      depth--;
      if (depth === 0) host.endRender(env);
    }
  };

  // Attribute form and plain ```tikz.
  const fence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens: Token[], idx: number, options: any, env: any, self: any) => {
    const t = tokens[idx];
    const attr = parseInfo(t.info);
    if (!isTikz(attr) || !t.map) return fence(tokens, idx, options, env, self);
    const caption = attr.attrs["caption"];
    return host.renderFigure(
      {
        code: t.content,
        id: attr.id,
        caption: caption !== undefined ? { kind: "inline", src: caption } : undefined,
        startLine: t.map[0],
        fenceLine: t.map[0],
        codeLine: t.map[0] + 1,
      },
      env,
      md,
    );
  };

  // Div form.
  md.block.ruler.before("fence", "tikz_div", tikzDiv, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
  md.renderer.rules.tikz_figure = (tokens: Token[], idx: number, _o: any, env: any) =>
    host.renderFigure(tokens[idx].meta as TikzBlock, env, md);
}

function line(state: StateBlock, i: number): string {
  return state.src.slice(state.bMarks[i] + state.tShift[i], state.eMarks[i]);
}

function tikzDiv(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  if (state.sCount[startLine] - state.blkIndent >= 4) return false;
  const open = DIV_OPEN.exec(line(state, startLine));
  if (!open) return false;
  const attr = parseAttrBlock(open[2]);
  if (!attr || !attr.id.startsWith("fig:")) return false;

  // First non-blank line must open a tikz fence.
  let i = startLine + 1;
  while (i < endLine && state.isEmpty(i)) i++;
  if (i >= endLine) return false;
  const f = FENCE.exec(line(state, i));
  if (!f || f[1][0] === "`" && f[2].includes("`") || !isTikz(parseInfo(f[2]))) return false;
  const fenceLine = i;
  const marker = f[1];

  // Closing fence.
  i++;
  const codeStart = i;
  for (; i < endLine; i++) {
    const m = FENCE.exec(line(state, i));
    if (m && m[1][0] === marker[0] && m[1].length >= marker.length && m[2].trim() === "") break;
  }
  if (i >= endLine) return false;
  const codeEnd = i;

  // Closing ::: (skipping nested divs and code fences).
  let depth = 0;
  let inFence: string | undefined;
  let close = -1;
  for (i = codeEnd + 1; i < endLine; i++) {
    const l = line(state, i);
    const m = FENCE.exec(l);
    if (inFence) {
      if (m && m[1][0] === inFence[0] && m[1].length >= inFence.length && m[2].trim() === "") inFence = undefined;
      continue;
    }
    if (m) {
      inFence = m[1];
      continue;
    }
    if (DIV_CLOSE.test(l)) {
      if (depth === 0) {
        close = i;
        break;
      }
      depth--;
    } else if (DIV_OPEN_ANY.test(l)) {
      depth++;
    }
  }
  if (close < 0) return false;
  if (silent) return true;

  const block: TikzBlock = {
    code: state.getLines(codeStart, codeEnd, state.sCount[fenceLine], true),
    id: attr.id,
    caption: { kind: "block", src: state.getLines(codeEnd + 1, close, state.blkIndent, false).trim() },
    startLine,
    fenceLine,
    codeLine: codeStart,
  };
  const token = state.push("tikz_figure", "figure", 0);
  token.block = true;
  token.map = [startLine, close + 1];
  token.meta = block;
  state.line = close + 1;
  return true;
}
