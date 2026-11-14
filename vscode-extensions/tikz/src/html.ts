// HTML for the preview. No vscode dependency.

import type { MarkdownIt, TikzBlock } from "./markdown";
import type { TexError } from "./tex";
import { escapeHtml } from "./util";

export type FigureState = "ok" | "pending" | "error" | "untrusted";

export function figureHtml(block: TikzBlock, state: FigureState, body: string, caption: string, adaptToTheme: boolean): string {
  const id = block.id ? ` id="${escapeHtml(block.id)}"` : "";
  return (
    `<figure class="tikz-figure code-line${adaptToTheme ? " tikz-adapt" : ""}" data-line="${block.fenceLine}" data-tikz-state="${state}"${id}>` +
    `<div class="tikz-body">${body}</div>${caption}</figure>\n`
  );
}

export function captionHtml(block: TikzBlock, env: unknown, md: MarkdownIt): string {
  if (!block.caption?.trim()) return "";
  const html = String(md.renderInline(block.caption, env))
    // Line numbers inside the caption refer to the caption source, not the document.
    .replace(/ data-line="\d+"/g, "")
    // Other plugins (e.g. the built-in Mermaid one) emit per-render markers with fixed ids.
    .replace(/<span id="markdown-mermaid"[^>]*><\/span>/g, "")
    .trim();
  return `<figcaption>${html}</figcaption>`;
}

export const placeholderHtml = `<div class="tikz-placeholder">Rendering TikZ…</div>`;

export function staleHtml(svg: string | undefined): string {
  return svg ? `<div class="tikz-stale">${svg}</div>` : "";
}

export function untrustedHtml(code: string): string {
  return `<div class="tikz-untrusted"><div class="tikz-placeholder">TikZ: not rendered in an untrusted workspace</div><pre><code>${escapeHtml(code)}</code></pre></div>`;
}

export function errorHtml(errors: TexError[], block?: TikzBlock): string {
  return errors
    .map((e) => {
      const excerpt = cleanExcerpt(e, block);
      return (
        `<div class="tikz-error"><div class="tikz-error-title">TikZ: ${escapeHtml(e.message)}</div>` +
        (excerpt ? `<pre>${escapeHtml(excerpt)}</pre>` : "") +
        `</div>`
      );
    })
    .join("");
}

const BOILERPLATE = /^(See the .* documentation for explanation\.|Type {1,2}H <return> {1,2}for immediate help\.|\s*\.\.\.\s*)$/;

/**
 * Drop the line repeated in the title and TeX's boilerplate, and rewrite
 * `l.<n>` to the line number in the Markdown file.
 */
function cleanExcerpt(e: TexError, block?: TikzBlock): string {
  const lines = e.excerpt.split("\n");
  if (lines[0]?.replace(/^!\s*/, "") === e.message) lines.shift();
  const mdLine = block && e.codeLine !== undefined ? block.codeLine + e.codeLine + 1 : undefined;
  return lines
    .filter((l) => !BOILERPLATE.test(l))
    .map((l) => (mdLine !== undefined ? l.replace(/^l\.\d+/, `l.${mdLine}`) : l))
    .join("\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
