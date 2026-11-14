// Post-processing of pdftocairo SVG for inline embedding.

/**
 * Make ids unique within the preview page (pdftocairo always uses
 * glyph-0-0, clip-0, ... and figures would otherwise share each other's
 * glyphs) and drop the XML declaration.
 */
export function prepareSvg(svg: string, prefix: string): string {
  return svg
    .replace(/^<\?xml[^>]*>\s*/, "")
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="${prefix}-${id}"`)
    .replace(/\b(xlink:)?href="#([^"]+)"/g, (_, x, id) => `${x ?? ""}href="#${prefix}-${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}-${id})`);
}
