import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";
import MarkdownIt from "markdown-it";
import { figurePlugin } from "../src/figure.ts";

const md = new MarkdownIt();
figurePlugin(md);
const html = md.render(fs.readFileSync(path.join(import.meta.dirname, "fixtures", "figures.md"), "utf8"));
const figures = [...html.matchAll(/<figure[^>]*>[\s\S]*?<\/figure>/g)].map((m) => m[0]);

test("an image alone in a paragraph becomes a figure with a Markdown caption", () => {
  assert.equal(figures.length, 2);
  assert.match(figures[0], /^<figure class="pandoc-figure"><img /);
  assert.match(figures[0], /<figcaption>曲線．.*<strong>パラメータ<\/strong>/);
  assert.match(figures[1], /<figcaption>キャプションだけの図<\/figcaption>/);
});

test("attributes are removed from the text, other braces are kept", () => {
  assert.doesNotMatch(html, /\{#fig|\{\.icon| id=| class="icon"/);
  assert.match(html, /文中の画像 <img [^>]*> は図にならず，属性は消える．<img [^>]*>\{属性ではない\} の括弧は残る/);
});

test("empty alt, linked images and tight lists stay inline (as in Pandoc)", () => {
  assert.match(html, /<p><img src="img\/box.svg" alt=""><\/p>/);
  assert.match(html, /<a [^>]*><img [^>]*alt="リンクの中の画像"/);
  assert.match(html, /<li><img [^>]*alt="リストの中の画像"/);
});
