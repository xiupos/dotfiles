import * as path from "path";
import * as vscode from "vscode";
import type { TikzApi } from "../../src/extension";

export async function api(): Promise<TikzApi> {
  const ext = vscode.extensions.getExtension<TikzApi>("xiupos.tikz");
  if (!ext) throw new Error("extension xiupos.tikz not found");
  return ext.activate();
}

export function wsFile(name: string): vscode.Uri {
  const root = vscode.workspace.workspaceFolders![0].uri.fsPath;
  return vscode.Uri.file(path.join(root, name));
}

export async function renderDoc(doc: vscode.TextDocument | string): Promise<string> {
  return (await vscode.commands.executeCommand<string>("markdown.api.render", doc)) ?? "";
}

/** Render, wait for the figures to compile, render again. */
export async function renderSettled(doc: vscode.TextDocument | string): Promise<string> {
  const a = await api();
  await renderDoc(doc);
  await a.whenIdle();
  return renderDoc(doc);
}

export interface Fig {
  state: string;
  id?: string;
  line: number;
  html: string;
  caption?: string;
}

export function figures(html: string): Fig[] {
  const re = /<figure class="tikz-figure[^"]*" data-line="(\d+)" data-tikz-state="(\w+)"(?: id="([^"]*)")?>([\s\S]*?)<\/figure>/g;
  const out: Fig[] = [];
  for (const m of html.matchAll(re)) {
    const cap = /<figcaption>([\s\S]*?)<\/figcaption>/.exec(m[4]);
    out.push({ line: Number(m[1]), state: m[2], id: m[3], html: m[4], caption: cap?.[1] });
  }
  return out;
}
