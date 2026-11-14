// markdown-it: hand ```tikz fences to `render`. No vscode dependency.

import { parseInfo } from "./attrs.ts";

export interface TikzBlock {
  code: string;
  /** Inline Markdown from the `caption` attribute. */
  caption?: string;
  /** 0-based line of the opening fence. */
  line: number;
}

export function tikzPlugin(md: any, render: (block: TikzBlock, env: any) => string): void {
  const fence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens: any[], idx: number, options: any, env: any, self: any) => {
    const t = tokens[idx];
    const a = parseInfo(t.info);
    if (a?.classes[0] !== "tikz" || !t.map) return fence(tokens, idx, options, env, self);
    return render({ code: t.content, caption: a.attrs.caption, line: t.map[0] }, env ?? {});
  };
}
