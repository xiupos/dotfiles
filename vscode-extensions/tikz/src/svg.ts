// Post-processing of pdftocairo SVG for inline embedding.

/**
 * Make ids unique within the preview page (pdftocairo always uses
 * glyph-0-0, clip-0, ... and figures would otherwise share each other's
 * glyphs), drop the XML declaration, and scale the displayed size
 * (width/height only; the viewBox keeps the drawing intact).
 */
export function prepareSvg(svg: string, prefix: string, scale = 1): string {
  return svg
    .replace(/^<\?xml[^>]*>\s*/, "")
    .replace(/<svg\b[^>]*>/, (tag) => scaleSize(tag, scale))
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="${prefix}-${id}"`)
    .replace(/\b(xlink:)?href="#([^"]+)"/g, (_, x, id) => `${x ?? ""}href="#${prefix}-${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}-${id})`);
}

function scaleSize(tag: string, scale: number): string {
  if (scale === 1) return tag;
  return tag.replace(/\b(width|height)="([\d.]+)(pt|px)?"/g, (_, attr, n, unit) => `${attr}="${+(Number(n) * scale).toFixed(3)}${unit ?? ""}"`);
}
