import * as assert from "assert";
import { isTikz, parseInfo } from "../../src/attrs";

describe("attrs", () => {
  it("parses plain and attribute info strings like Pandoc", () => {
    assert.deepStrictEqual(parseInfo("tikz"), { id: "", classes: ["tikz"], attrs: {} });
    assert.deepStrictEqual(parseInfo("tikz {#fig:a}"), { id: "fig:a", classes: ["tikz"], attrs: {} });
    assert.deepStrictEqual(parseInfo('{.tikz #fig:circle caption="半径 $r$ の円"}'), {
      id: "fig:circle",
      classes: ["tikz"],
      attrs: { caption: "半径 $r$ の円" },
    });
  });

  it("unescapes only backslash + ASCII punctuation (as pandoc 3.13 does)", () => {
    // pandoc: caption="a $\alpha$ \"q\" \\ b \$x"  ->  a $\alpha$ "q" \ b $x
    const a = parseInfo('{.tikz caption="a $\\alpha$ \\"q\\" \\\\ b \\$x"}');
    assert.strictEqual(a?.attrs.caption, 'a $\\alpha$ "q" \\ b $x');
  });

  it("requires tikz to be the first class", () => {
    assert.ok(isTikz(parseInfo("{.tikz .foo}")));
    assert.ok(!isTikz(parseInfo("{.foo .tikz}")));
    assert.ok(!isTikz(parseInfo("python")));
    assert.ok(!isTikz(parseInfo("")));
  });
});

import { prepareSvg } from "../../src/svg";

describe("svg", () => {
  const svg = '<?xml version="1.0"?>\n<svg width="100pt" height="20.5pt" viewBox="0 0 100 20.5"><use href="#glyph-0-1"/><g id="glyph-0-1" clip-path="url(#clip-0)"/></svg>';
  it("scales width/height but not the viewBox, and prefixes ids", () => {
    const out = prepareSvg(svg, "p", 1.5);
    assert.match(out, /^<svg width="150pt" height="30.75pt" viewBox="0 0 100 20.5">/);
    assert.match(out, /href="#p-glyph-0-1"/);
    assert.match(out, /id="p-glyph-0-1"/);
    assert.match(out, /url\(#p-clip-0\)/);
  });
});
