import * as assert from "assert";
import * as path from "path";
import * as vscode from "vscode";

async function render(name: string): Promise<string> {
  const root = vscode.workspace.workspaceFolders![0].uri.fsPath;
  const doc = await vscode.workspace.openTextDocument(path.join(root, name));
  return (await vscode.commands.executeCommand<string>("markdown.api.render", doc)) ?? "";
}

/** <figure ...>...</figure> blocks. */
function figures(html: string): { open: string; body: string }[] {
  return [...html.matchAll(/(<figure[^>]*>)([\s\S]*?)<\/figure>/g)].map((m) => ({ open: m[1], body: m[2] }));
}

describe("pandoc-figure", () => {
  let html: string;
  before(async () => {
    html = await render("figures.md");
  });

  it("turns an image alone in a paragraph into a figure with a Markdown caption", () => {
    const figs = figures(html);
    assert.strictEqual(figs.length, 2, html);

    const [curve, box] = figs;
    assert.match(curve.open, /class="[^"]*pandoc-figure/);
    assert.match(curve.open, /id="fig:curve"/);
    assert.match(curve.open, /data-line="2"/);
    assert.match(curve.body, /<img [^>]*style="width: 50%"/);
    assert.match(curve.body, /<figcaption>曲線．/);
    assert.match(curve.body, /<figcaption>[\s\S]*class="katex[\s\S]*<\/figcaption>/);
    assert.match(curve.body, /<strong>パラメータ<\/strong>/);
    assert.match(curve.body, /\[@key\]/);

    assert.doesNotMatch(box.open, /id=/);
    assert.match(box.body, /<figcaption>キャプションだけの図<\/figcaption>/);
  });

  it("keeps the built-in image handling (resolved src)", () => {
    assert.match(figures(html)[0].body, /data-src="img\/curve.svg"/);
  });

  it("removes {...} attributes from the text and applies them to inline images", () => {
    assert.doesNotMatch(html, /\{#fig:curve|\{width=/);
    assert.match(html, /文中の画像 <img [^>]*style="width: 24px"[^>]*> は図にならず/);
  });

  it("leaves images with empty alt, inside links and in tight lists inline", () => {
    const outside = html.replace(/<figure[\s\S]*?<\/figure>/g, "");
    assert.match(outside, /<p[^>]*><img [^>]*alt=""[^>]*><\/p>/);
    assert.match(outside, /<a [^>]*><img [^>]*alt="リンクの中の画像"/);
    assert.match(outside, /<li[^>]*><img [^>]*alt="リストの中の画像"/);
  });
});
