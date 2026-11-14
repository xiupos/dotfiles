// markdown-it plugin: Pandoc implicit figures and image attributes. No vscode dependency.
//
//   ![Caption with *Markdown* and $math$](img.png){#fig:x width=75%}
//
// - An image with non-empty alt text alone in a paragraph becomes <figure>, with the
//   alt text rendered as inline Markdown in <figcaption> (Pandoc's implicit_figures).
//   Images in tight list items (Pandoc: Plain, not Para) and in links stay inline.
// - `{...}` right after an image is read as Pandoc attributes and removed from the text:
//   width/height become CSS sizes, .class a class, #id the id of the figure (or image).

import { parseAttrs, type Attr } from "../../shared/pandoc-attrs.ts";

/** Pandoc sizes: px, cm, mm, in, inch or %; no unit means px. */
function cssSize(v: string | undefined): string | undefined {
  const m = v?.match(/^(\d*\.?\d+)(px|cm|mm|in|inch|%)?$/);
  return m ? m[1] + (m[2] === "inch" ? "in" : (m[2] ?? "px")) : undefined;
}

function applyAttrs(img: any, a: Attr, withId: boolean): void {
  const style = (["width", "height"] as const).flatMap((k) => (cssSize(a.attrs[k]) ? [`${k}: ${cssSize(a.attrs[k])}`] : [])).join("; ");
  if (style) img.attrJoin("style", style);
  for (const c of a.classes) img.attrJoin("class", c);
  if (withId && a.id) img.attrSet("id", a.id);
}

export function figurePlugin(md: any): void {
  md.core.ruler.after("inline", "pandoc_figure", (state: any) => {
    const tokens = state.tokens;
    tokens.forEach((t: any, i: number) => {
      if (t.type !== "inline") return;
      // Attributes: `{...}` at the start of the text right after an image.
      t.children.forEach((img: any, k: number) => {
        const next = t.children[k + 1];
        const m = img.type === "image" && next?.type === "text" && next.content.match(/^\{([^{}]*)\}/);
        const attr = m && parseAttrs(m[1]);
        if (!attr) return;
        next.content = next.content.slice(m[0].length);
        img.meta = { ...img.meta, attr };
      });
      // Figure: the only (non-blank) child of a visible paragraph is an image with alt text.
      const rest = t.children.filter((c: any) => c.type !== "softbreak" && !(c.type === "text" && !c.content.trim()));
      const [open, close] = [tokens[i - 1], tokens[i + 1]];
      if (open?.type !== "paragraph_open" || open.hidden || close?.type !== "paragraph_close") return;
      if (rest.length !== 1 || rest[0].type !== "image" || !rest[0].children.length) return;
      rest[0].meta = { ...rest[0].meta, figure: true };
      open.meta = { ...open.meta, figure: true, id: rest[0].meta.attr?.id };
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
    if (t.meta.id) t.attrSet("id", t.meta.id);
    return `<figure${self.renderAttrs(t)}>`;
  };
  rules.paragraph_close = (tokens: any[], idx: number, options: any, env: any, self: any) =>
    tokens[idx].meta?.figure ? "</figure>\n" : call(paragraph_close, tokens, idx, options, env, self);
  rules.image = (tokens: any[], idx: number, options: any, env: any, self: any) => {
    const t = tokens[idx];
    if (t.meta?.attr) applyAttrs(t, t.meta.attr, !t.meta.figure);
    const html = call(image, tokens, idx, options, env, self);
    return t.meta?.figure ? `${html}<figcaption>${self.renderInline(t.children, options, env)}</figcaption>` : html;
  };
}
