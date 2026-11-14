import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { buildPreamble } from "../../src/preamble";
import { compile, Formats } from "../../src/tex";
import { pandocIncludes } from "../workspace";
import { api, figures, renderDoc, renderSettled, wsFile } from "./helpers";

const fig = (body: string) => `# 編集\n\n\`\`\`{.tikz #fig:e caption="編集中"}\n\\begin{tikzpicture}\n${body}\n\\end{tikzpicture}\n\`\`\`\n`;

async function setText(doc: vscode.TextDocument, text: string): Promise<void> {
  const e = new vscode.WorkspaceEdit();
  e.replace(doc.uri, new vscode.Range(0, 0, doc.lineCount, 0), text);
  assert.ok(await vscode.workspace.applyEdit(e));
}

describe("editing", () => {
  let doc: vscode.TextDocument;

  before(async () => {
    fs.writeFileSync(wsFile("edit.md").fsPath, fig("\\draw (0,0) -- (1,0);"));
    doc = await vscode.workspace.openTextDocument(wsFile("edit.md"));
  });

  it("keeps the previous SVG faded while re-rendering", async () => {
    const a = await api();
    assert.strictEqual(figures(await renderSettled(doc))[0].state, "ok");
    const n = a.compiledCount();

    await setText(doc, fig("\\draw (0,0) -- (1,1);"));
    const during = figures(await renderDoc(doc))[0];
    assert.strictEqual(during.state, "pending");
    assert.match(during.html, /<div class="tikz-stale"><svg/);

    await a.whenIdle();
    assert.strictEqual(figures(await renderDoc(doc))[0].state, "ok");
    assert.strictEqual(a.compiledCount(), n + 1);
  });

  it("debounces edits: only the last version is compiled", async () => {
    const a = await api();
    const cfg = vscode.workspace.getConfiguration("tikz");
    await cfg.update("render.delay", 400, vscode.ConfigurationTarget.Workspace);
    try {
      const n = a.compiledCount();
      for (const x of [2, 3, 4, 5]) {
        await setText(doc, fig(`\\draw (0,0) -- (${x},1);`));
        await renderDoc(doc);
      }
      await a.whenIdle();
      assert.strictEqual(a.compiledCount(), n + 1);
      assert.strictEqual(figures(await renderDoc(doc))[0].state, "ok");
    } finally {
      await cfg.update("render.delay", undefined, vscode.ConfigurationTarget.Workspace);
    }
  });

  it("reports an error, then clears the diagnostic once fixed", async () => {
    await setText(doc, fig("\\draw (0,0) -- (1,0);\n\\nosuchmacro"));
    const err = figures(await renderSettled(doc))[0];
    assert.strictEqual(err.state, "error");
    assert.match(err.html, /<div class="tikz-stale"><svg/);
    let diags = vscode.languages.getDiagnostics(doc.uri);
    assert.strictEqual(diags.length, 1);
    assert.match(doc.lineAt(diags[0].range.start.line).text, /\\nosuchmacro/);

    await setText(doc, fig("\\draw (0,0) -- (1,0);"));
    assert.strictEqual(figures(await renderDoc(doc))[0].state, "ok"); // cached from the first test
    diags = vscode.languages.getDiagnostics(doc.uri);
    assert.strictEqual(diags.length, 0);
  });

  it("recompiles after TikZ: Clear Rendered Figure Cache", async () => {
    const a = await api();
    await renderSettled(doc);
    const n = a.compiledCount();
    await vscode.commands.executeCommand("tikz.clearCache");
    const html = await renderSettled(doc);
    assert.strictEqual(figures(html)[0].state, "ok");
    assert.strictEqual(a.compiledCount(), n + 1);
  });
});

describe("compile without a format", () => {
  it("maps TeX line numbers back to the figure code", async () => {
    class NoFormats extends Formats {
      override async get(): Promise<undefined> {
        return undefined;
      }
    }
    const preamble = buildPreamble({ files: [path.join(pandocIncludes, "common.sty")], extra: "", japanese: false }, undefined);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tikz-nofmt-"));
    const cfg = { pdflatex: "pdflatex", pdftocairo: "pdftocairo", timeout: 30000 };
    const ok = await compile("\\begin{tikzpicture}\\draw (0,0) -- (1,1);\\end{tikzpicture}\n", preamble, new NoFormats(tmp, () => {}), cfg, { dirs: [] }, () => {});
    assert.ok(ok.ok);
    const bad = await compile("\\begin{tikzpicture}\n\\draw (0,0) -- (1,1);\n\\oops\n\\end{tikzpicture}\n", preamble, new NoFormats(tmp, () => {}), cfg, { dirs: [] }, () => {});
    assert.ok(!bad.ok);
    assert.strictEqual(bad.errors[0].codeLine, 2);
  });
});
