import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";
import MarkdownIt from "markdown-it";
import footnote from "markdown-it-footnote";
import { footnotePlugin } from "../src/footnote.ts";

const src = fs.readFileSync(path.join(import.meta.dirname, "fixtures", "footnotes.md"), "utf8");
// Our plugin first: the Markdown Footnotes extension may be loaded after it.
const md = new MarkdownIt();
footnotePlugin(md);
md.use(footnote);
const html = md.render(src);
/** Footnote ids in each block, and the text right after the block. */
const blocks = [...html.matchAll(/<ol class="footnotes-list"([^>]*)>([\s\S]*?)<\/section>\n(.{0,20})/g)].map((m) => ({
  start: m[1],
  ids: [...m[2].matchAll(/<li id="fn(\d+)"/g)].map((l) => +l[1]),
  next: m[3],
}));

test("footnotes go to the end of the section of their first reference", () => {
  assert.deepEqual(blocks.map((b) => b.ids), [[1, 2], [3], [4, 5]]);
  assert.match(blocks[0].next, /^<h2>第1.1節/);
  assert.match(blocks[1].next, /^<h1>第2節/);
  assert.equal(blocks[2].next, "");
});

test("each block is numbered from its first footnote", () => {
  assert.deepEqual(blocks.map((b) => b.start), ["", ' start="3"', ' start="4"']);
  assert.match(html, /<li id="fn3" class="footnote-item"><p><em>強調<\/em> を含む/);
});

test("without footnotes nothing changes", () => {
  const plain = new MarkdownIt().use(footnote);
  const text = "# a\n\nb\n\n## c\n";
  assert.equal(md.render(text), plain.render(text));
});
