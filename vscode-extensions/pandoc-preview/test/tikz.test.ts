import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import MarkdownIt from "markdown-it";
import { parseInfo } from "../src/attrs.ts";
import { tikzPlugin, type TikzBlock } from "../src/tikz.ts";
import { buildPreamble, compile, Formats } from "../src/tex.ts";

const fixtures = path.join(import.meta.dirname, "fixtures");
// The preamble files from the chezmoi source, not the copy applied to ~.
const includes = path.resolve(import.meta.dirname, "../../../private_dot_local/private_share/pandoc/includes");

/** The tikz blocks of a fixture, as the preview sees them. */
function blocks(file: string): TikzBlock[] {
  const found: TikzBlock[] = [];
  const md = new MarkdownIt();
  tikzPlugin(md, (b) => (found.push(b), "<figure></figure>"));
  md.render(fs.readFileSync(path.join(fixtures, file), "utf8"));
  return found;
}

test("fence info strings are read like Pandoc", () => {
  assert.deepEqual(parseInfo("tikz {#fig:a}"), { id: "fig:a", classes: ["tikz"], attrs: {} });
  assert.deepEqual(parseInfo('{.tikz #fig:a caption="a $\\alpha$ \\"q\\" \\\\ b"}'), {
    id: "fig:a",
    classes: ["tikz"],
    attrs: { caption: 'a $\\alpha$ "q" \\ b' },
  });
  assert.equal(parseInfo("{.foo .tikz}")?.classes[0], "foo");
});

test("tikz fences reach the renderer with id, caption and line", () => {
  const bs = blocks("syntax.md");
  assert.deepEqual(
    bs.map((b) => [b.id, b.line]),
    [["fig:circle", 5], ["fig:cd", 14], ["fig:nocap", 21], ["", 30]],
  );
  assert.match(bs[1].caption ?? "", /^可換図式．\$h \\circ f/);
  assert.match(bs[0].code, /^\\begin\{tikzpicture\}/);
});

test("the fixtures compile with pdflatex, and errors are reported", async () => {
  const preamble = buildPreamble({ files: [`${includes}/common.sty`, `${includes}/font-ja.sty`], extra: "", japanese: true }, undefined);
  const formats = new Formats(fs.mkdtempSync(path.join(os.tmpdir(), "tikz-test-")), () => {});
  const cfg = { pdflatex: "pdflatex", pdftocairo: "pdftocairo", timeout: 60000 };
  const run = (b: TikzBlock) => compile(b.code, preamble, formats, cfg, []);

  for (const r of await Promise.all([...blocks("syntax.md"), ...blocks("samples.md")].map(run))) {
    assert.ok(r.ok, r.ok ? "" : `${r.message}\n${r.detail}`);
    assert.match(r.svg, /<svg[\s\S]*<\/svg>/);
  }
  const errors = await Promise.all(blocks("error.md").map(run));
  assert.deepEqual(
    errors.map((r) => !r.ok && r.message),
    ["Undefined control sequence.", "Package tikz Error: Giving up on this path. Did you forget a semicolon?."],
  );
});
