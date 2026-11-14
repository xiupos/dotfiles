// markdown-it integration: ```tikz fences.
//
// markdown-it types are not a dependency; the few members used are typed here.

import { isTikz, parseInfo } from "../../shared/pandoc-attrs";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type MarkdownIt = any;
type Token = any;

export interface TikzBlock {
  code: string;
  id: string;
  /** Caption source (inline Markdown), from the `caption` attribute. */
  caption?: string;
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

export function tikzPlugin(md: MarkdownIt, host: Host): void {
  // Top-level render hooks (renderInline for captions nests inside).
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

  const fence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens: Token[], idx: number, options: any, env: any, self: any) => {
    const t = tokens[idx];
    const attr = parseInfo(t.info);
    if (!isTikz(attr) || !t.map) return fence(tokens, idx, options, env, self);
    return host.renderFigure(
      {
        code: t.content,
        id: attr.id,
        caption: attr.attrs["caption"],
        fenceLine: t.map[0],
        codeLine: t.map[0] + 1,
      },
      env,
      md,
    );
  };
}
