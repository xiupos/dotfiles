import * as assert from "assert";
import * as vscode from "vscode";
import { api, figures, renderDoc, renderSettled, wsFile } from "./helpers";

describe("render", () => {
  it("renders captioned and plain figures with SVG and captions", async () => {
    const doc = await vscode.workspace.openTextDocument(wsFile("syntax.md"));
    const html = await renderSettled(doc);
    const figs = figures(html);
    assert.deepStrictEqual(
      figs.map((f) => [f.state, f.id ?? ""]),
      [
        ["ok", "fig:circle"],
        ["ok", "fig:cd"],
        ["ok", "fig:nocap"],
        ["ok", ""],
      ],
    );
    for (const f of figs) assert.match(f.html, /<svg[\s\S]*<\/svg>/);

    // Inline Markdown caption, math rendered by the built-in KaTeX plugin.
    assert.match(figs[0].caption!, /半径/);
    assert.match(figs[0].caption!, /class="katex/);
    assert.match(figs[0].caption!, /<strong>Unicode<\/strong>/);

    assert.match(figs[1].caption!, /^可換図式．/);
    assert.match(figs[1].caption!, /<strong>強調<\/strong>/);

    // No caption for #fig:nocap and the legacy block.
    assert.strictEqual(figs[2].caption, undefined);
    assert.strictEqual(figs[3].caption, undefined);

    // Divs are not touched.
    assert.match(html, /::: \{\.proof\}/);

    // data-line points at the opening line (scroll sync).
    const lines = doc.getText().split("\n");
    assert.match(lines[figs[0].line], /^```\{\.tikz #fig:circle/);
    assert.match(lines[figs[1].line], /^```\{\.tikz #fig:cd/);

    // Ids are prefixed per figure so that glyphs do not collide.
    assert.ok(!/id="glyph-/.test(html));
  });

  it("serves the second render from the cache", async () => {
    const a = await api();
    const doc = await vscode.workspace.openTextDocument(wsFile("syntax.md"));
    await renderSettled(doc);
    const before = a.compiledCount();
    const html = await renderDoc(doc);
    assert.ok(figures(html).every((f) => f.state === "ok"));
    assert.strictEqual(a.compiledCount(), before);
  });

  it("supports `tikz {#fig:x}` and plain string input", async () => {
    const md = "```tikz {#fig:x}\n\\begin{tikzpicture}\\draw (0,0) -- (1,0);\\end{tikzpicture}\n```\n";
    const figs = figures(await renderSettled(md));
    assert.strictEqual(figs.length, 1);
    assert.strictEqual(figs[0].state, "ok");
    assert.strictEqual(figs[0].id, "fig:x");
  });

  it("shows TeX errors in the preview and as diagnostics on the Markdown line", async () => {
    const doc = await vscode.workspace.openTextDocument(wsFile("error.md"));
    const figs = figures(await renderSettled(doc));
    assert.deepStrictEqual(
      figs.map((f) => f.state),
      ["error", "error"],
    );
    assert.match(figs[0].html, /class="tikz-error"/);
    assert.match(figs[0].html, /Undefined control sequence/);
    assert.match(figs[0].caption!, /壊れた図/);
    // l.<n> in the excerpt is the Markdown line (1-based), TeX boilerplate is dropped.
    assert.match(figs[0].html, /<pre>l\.6 +\\undefinedmacro/);
    assert.ok(!/immediate help/.test(figs[1].html));

    const diags = vscode.languages.getDiagnostics(doc.uri).filter((d) => d.source === "tikz");
    assert.strictEqual(diags.length, 2);
    const lines = doc.getText().split("\n");
    assert.match(lines[diags[0].range.start.line], /\\undefinedmacro/);
    assert.match(diags[0].message, /Undefined control sequence/);
    // The missing semicolon is reported where TeX notices it, inside the second block.
    const secondFence = lines.findIndex((l, i) => i > diags[0].range.start.line && l === "```tikz");
    assert.ok(diags[1].range.start.line > secondFence, `diag line ${diags[1].range.start.line} after fence ${secondFence}`);
  });

  it("renders the sample figures (Japanese, pgfplots, feynhand, braids, xy)", async () => {
    const doc = await vscode.workspace.openTextDocument(wsFile("samples.md"));
    const figs = figures(await renderSettled(doc));
    assert.strictEqual(figs.length, 7);
    for (const f of figs) assert.strictEqual(f.state, "ok", `${f.id}: ${f.html.slice(0, 300)}`);
    // ~~~ fence: the caption attribute may contain backticks.
    assert.strictEqual(figs[0].id, "fig:multiplet");
    assert.match(figs[0].caption!, /<code>align=center<\/code>/);
  });
});
