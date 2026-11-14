import * as assert from "assert";
import * as vscode from "vscode";
import { api, figures, renderDoc, wsFile } from "./helpers";

describe("untrusted workspace", () => {
  it("does not compile and says so", async () => {
    assert.strictEqual(vscode.workspace.isTrusted, false);
    const a = await api();
    const doc = await vscode.workspace.openTextDocument(wsFile("syntax.md"));
    const html = await renderDoc(doc);
    await a.whenIdle();
    const figs = figures(html);
    assert.strictEqual(figs.length, 4);
    for (const f of figs) {
      assert.strictEqual(f.state, "untrusted");
      assert.match(f.html, /untrusted workspace/);
    }
    assert.strictEqual(a.compiledCount(), 0);
  });
});
