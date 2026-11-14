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
  assert.match(figures[0], /^<figure class="pandoc-figure" id="fig:curve"><img [^>]*style="width: 50%"/);
  assert.match(figures[0], /<figcaption>曲線．.*<strong>パラメータ<\/strong>/);
  assert.match(figures[1], /<figcaption>キャプションだけの図<\/figcaption>/);
});

test("attributes are applied and removed from the text", () => {
  assert.doesNotMatch(html, /\{#fig|\{width/);
  assert.match(html, /文中の画像 <img [^>]*style="width: 24px"[^>]*> は図にならず/);
});

test("empty alt, linked images and tight lists stay inline (as in Pandoc)", () => {
  assert.match(html, /<p><img src="img\/box.svg" alt=""><\/p>/);
  assert.match(html, /<a [^>]*><img [^>]*alt="リンクの中の画像"/);
  assert.match(html, /<li><img [^>]*alt="リストの中の画像"/);
});
