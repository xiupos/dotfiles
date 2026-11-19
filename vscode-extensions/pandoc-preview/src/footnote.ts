// markdown-it plugin: footnotes at the end of each section instead of the end of the document.
// No vscode dependency.
//
// Works on the tokens of markdown-it-footnote (the Markdown Footnotes extension), which puts
// every footnote into one footnote_block at the end. Each footnote is moved to just before the
// first heading (outside lists and quotes) after its first reference (a footnote referenced only from another
// footnote goes with that one). The core rule is pushed last, so it runs after footnote_tail
// whatever the order in which the plugins are loaded.

export function footnotePlugin(md: any): void {
  md.core.ruler.push("pandoc_footnote_sections", (state: any) => {
    const tokens: any[] = state.tokens;
    const start = tokens.findIndex((t) => t.type === "footnote_block_open");
    const end = tokens.findIndex((t) => t.type === "footnote_block_close");
    if (start < 0 || end < start) return;

    // Split the block into footnotes, and find the first reference to each one.
    const notes: { id: number; tokens: any[] }[] = [];
    const firstRef = new Map<number, number>(); // id → token index in the body, or -1 - id of the footnote it is in
    const findRefs = (t: any, where: number) => {
      for (const c of t.children ?? []) if (c.type === "footnote_ref" && !firstRef.has(c.meta.id)) firstRef.set(c.meta.id, where);
    };
    tokens.slice(0, start).forEach((t, i) => findRefs(t, i));
    for (let i = start + 1; i < end; i++) {
      if (tokens[i].type === "footnote_open") notes.push({ id: tokens[i].meta.id, tokens: [] });
      notes.at(-1)?.tokens.push(tokens[i]);
    }
    for (const n of notes) n.tokens.forEach((t) => findRefs(t, -1 - n.id));

    // Insertion point: the first heading outside lists and quotes after the reference (or the end).
    const headings = tokens.slice(0, start).flatMap((t, i) => (t.type === "heading_open" && t.level === 0 ? [i] : []));
    const target = (id: number, seen = new Set<number>()): number => {
      const where = firstRef.get(id) ?? start;
      if (where >= 0) return headings.find((h) => h > where) ?? start;
      const parent = -1 - where;
      if (seen.has(parent)) return start;
      seen.add(id);
      return target(parent, seen);
    };
    const groups = new Map<number, typeof notes>();
    for (const n of notes) {
      const at = target(n.id);
      groups.set(at, [...(groups.get(at) ?? []), n]);
    }

    // Rebuild: the body with a footnote block (numbered from its first footnote) at each point.
    const out: any[] = [];
    const flush = (at: number) => {
      const group = groups.get(at)?.sort((a, b) => a.id - b.id);
      if (!group) return;
      const open = new state.Token("pandoc_footnotes_open", "", 1);
      open.meta = { start: group[0].id + 1 };
      out.push(open, ...group.flatMap((n) => n.tokens), tokens[end]);
    };
    tokens.slice(0, start).forEach((t, i) => {
      flush(i);
      out.push(t);
    });
    flush(start);
    state.tokens = out.concat(tokens.slice(end + 1));
  });

  // The same HTML as footnote_block_open, with the number of the first footnote.
  md.renderer.rules.pandoc_footnotes_open = (tokens: any[], idx: number, options: any) =>
    `<hr class="footnotes-sep"${options.xhtmlOut ? " /" : ""}>\n<section class="footnotes">\n` +
    `<ol class="footnotes-list"${tokens[idx].meta.start > 1 ? ` start="${tokens[idx].meta.start}"` : ""}>\n`;
}
