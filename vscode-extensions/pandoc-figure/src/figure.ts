// markdown-it plugin: Pandoc implicit figures and image attributes.
//
//   ![Caption with *Markdown* and $math$](img.png){#fig:x width=75%}
//
// - An image with non-empty alt text that is alone in a paragraph becomes
//   <figure> with the alt text, rendered as inline Markdown, as <figcaption>
//   (Pandoc's implicit_figures). Images in tight list items (Pandoc: Plain,
//   not Para) and inside links stay inline.
// - `{...}` right after any image is read as Pandoc attributes and removed
//   from the text: width/height become CSS sizes, .classes become classes,
//   #id goes on the figure (or on the image if it is not a figure).
//
// No vscode dependency; markdown-it types are not a dependency either.

import { Attr, parseAttrBlock } from "../../shared/pandoc-attrs";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type MarkdownIt = any;
type Token = any;

interface ImageMeta {
  attr?: Attr;
  /** Set on images that are rendered as figures. */
  figure?: boolean;
}

export function figurePlugin(md: MarkdownIt): void {
  md.core.ruler.after("inline", "pandoc_figure", (state: any) => {
    const tokens: Token[] = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type !== "inline" || !t.children) continue;
      takeImageAttributes(t.children);
      const open = tokens[i - 1];
      const close = tokens[i + 1];
      if (open?.type !== "paragraph_open" || close?.type !== "paragraph_close" || open.hidden) continue;
      const img = soleImage(t.children);
      if (!img || !img.children?.length) continue;
      img.meta = { ...img.meta, figure: true } satisfies ImageMeta;
      open.meta = { ...open.meta, figure: true, figureId: (img.meta as ImageMeta).attr?.id };
      close.meta = { ...close.meta, figure: true };
    }
  });

  const paragraphOpen = md.renderer.rules.paragraph_open;
  md.renderer.rules.paragraph_open = (tokens: Token[], idx: number, options: any, env: any, self: any) => {
    const t = tokens[idx];
    if (!t.meta?.figure) return render(paragraphOpen, tokens, idx, options, env, self);
    t.attrJoin("class", "pandoc-figure");
    if (t.meta.figureId) t.attrSet("id", t.meta.figureId);
    return `<figure${self.renderAttrs(t)}>`;
  };

  const paragraphClose = md.renderer.rules.paragraph_close;
  md.renderer.rules.paragraph_close = (tokens: Token[], idx: number, options: any, env: any, self: any) =>
    tokens[idx].meta?.figure ? "</figure>\n" : render(paragraphClose, tokens, idx, options, env, self);

  const image = md.renderer.rules.image;
  md.renderer.rules.image = (tokens: Token[], idx: number, options: any, env: any, self: any) => {
    const t = tokens[idx];
    const meta: ImageMeta = t.meta ?? {};
    if (meta.attr) applyAttributes(t, meta.attr, !meta.figure);
    const html = render(image, tokens, idx, options, env, self);
    if (!meta.figure) return html;
    return `${html}<figcaption>${self.renderInline(t.children, options, env)}</figcaption>`;
  };
}

function render(rule: any, tokens: Token[], idx: number, options: any, env: any, self: any): string {
  return rule ? rule(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
}

/** The only image of an inline run, ignoring surrounding whitespace. */
function soleImage(children: Token[]): Token | undefined {
  const rest = children.filter((c) => !(c.type === "text" && c.content.trim() === "") && c.type !== "softbreak");
  return rest.length === 1 && rest[0].type === "image" ? rest[0] : undefined;
}

/** Move `{...}` that directly follows an image from the text into the image's meta. */
function takeImageAttributes(children: Token[]): void {
  for (let k = 0; k < children.length - 1; k++) {
    const img = children[k];
    const next = children[k + 1];
    if (img.type !== "image" || next.type !== "text") continue;
    const m = /^\{([^{}]*)\}/.exec(next.content);
    const attr = m && parseAttrBlock(m[1]);
    if (!attr) continue;
    next.content = next.content.slice(m[0].length);
    img.meta = { ...img.meta, attr } satisfies ImageMeta;
  }
}

/** Pandoc sizes: a number with px, cm, mm, in, inch or %; no unit means px. */
function cssSize(v: string | undefined): string | undefined {
  const m = v && /^(\d+(?:\.\d+)?|\.\d+)(px|cm|mm|in|inch|%)?$/.exec(v.trim());
  if (!m) return undefined;
  return m[1] + (m[2] === "inch" ? "in" : (m[2] ?? "px"));
}

function applyAttributes(img: Token, attr: Attr, withId: boolean): void {
  const style = [
    ["width", cssSize(attr.attrs["width"])],
    ["height", cssSize(attr.attrs["height"])],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
  if (style) img.attrJoin("style", style);
  for (const c of attr.classes) img.attrJoin("class", c);
  if (withId && attr.id) img.attrSet("id", attr.id);
}
