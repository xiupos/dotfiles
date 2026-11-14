// markdown-it plugin: Pandoc implicit figures. No vscode dependency.
//
//   ![Caption with *Markdown* and $math$](img.png){#fig:x}
//
// - An image with non-empty alt text alone in a paragraph becomes <figure>, with the
//   alt text rendered as inline Markdown in <figcaption> (Pandoc's implicit_figures).
//   Images in tight list items (Pandoc: Plain, not Para) and in links stay inline.
// - Pandoc attributes `{...}` right after an image are removed from the text (unused here).

import { parseAttrs } from "./attrs.ts";

export function figurePlugin(md: any): void {
  md.core.ruler.after("inline", "pandoc_figure", (state: any) => {
    const tokens = state.tokens;
    tokens.forEach((t: any, i: number) => {
      if (t.type !== "inline") return;
      // Drop attributes: valid `{...}` at the start of the text right after an image.
      t.children.forEach((img: any, k: number) => {
        const next = t.children[k + 1];
        const m = img.type === "image" && next?.type === "text" && next.content.match(/^\{([^{}]*)\}/);
        if (m && parseAttrs(m[1])) next.content = next.content.slice(m[0].length);
      });
      // Figure: the only (non-blank) child of a visible paragraph is an image with alt text.
      const rest = t.children.filter((c: any) => c.type !== "softbreak" && !(c.type === "text" && !c.content.trim()));
      const [open, close] = [tokens[i - 1], tokens[i + 1]];
      if (open?.type !== "paragraph_open" || open.hidden || close?.type !== "paragraph_close") return;
      if (rest.length !== 1 || rest[0].type !== "image" || !rest[0].children.length) return;
      rest[0].meta = { ...rest[0].meta, figure: true };
      open.meta = { ...open.meta, figure: true };
      close.meta = { ...close.meta, figure: true };
    });
  });

  // Keep the previous rules: VS Code's image rule resolves `src`.
  const rules = md.renderer.rules;
  const call = (rule: any, tokens: any[], idx: number, options: any, env: any, self: any) =>
    rule ? rule(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
  const { paragraph_open, paragraph_close, image } = rules;

  rules.paragraph_open = (tokens: any[], idx: number, options: any, env: any, self: any) => {
    const t = tokens[idx];
    if (!t.meta?.figure) return call(paragraph_open, tokens, idx, options, env, self);
    t.attrJoin("class", "pandoc-figure");
    return `<figure${self.renderAttrs(t)}>`;
  };
  rules.paragraph_close = (tokens: any[], idx: number, options: any, env: any, self: any) =>
    tokens[idx].meta?.figure ? "</figure>\n" : call(paragraph_close, tokens, idx, options, env, self);
  rules.image = (tokens: any[], idx: number, options: any, env: any, self: any) => {
    const t = tokens[idx];
    const html = call(image, tokens, idx, options, env, self);
    return t.meta?.figure ? `${html}<figcaption>${self.renderInline(t.children, options, env)}</figcaption>` : html;
  };
}
