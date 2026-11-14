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
