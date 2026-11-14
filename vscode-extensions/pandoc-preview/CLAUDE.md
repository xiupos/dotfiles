# pandoc-preview

共通のルールは `../CLAUDE.md`。使い方と仕様は `README.md`（実装を変えたら README も直す）。

## 構成

- `src/extension.ts`：VS Code とつなぐ部分（設定、TikZ の図の HTML、コマンド）。`vscode` を使うのはここだけ。
- `src/attrs.ts`：Pandoc の属性 `{#id .class key=value}` の解釈。
- `src/tikz.ts`：` ```tikz ` のフェンスを描画関数に渡す markdown-it のプラグイン。
- `src/tex.ts`：プリアンブル、フォーマットのダンプ、pdflatex → pdftocairo、ログからのエラーの抜き出し。
- `src/cache.ts`：結果のキャッシュ（メモリと globalStorage）と、debounce・同時実行数つきのキュー。
- `src/figure.ts`：画像の図の markdown-it のプラグイン（core rule で決めて `meta` に書き、renderer で `<figure>` にする）。
- `media/preview.css`：見た目とテーマ対応。`test/`：`node:test` とサンプル。

## 守ること

- **TikZ の記法は Pandoc フィルタと一致させる。** 変えるときは chezmoi ソースの
  `private_dot_local/private_share/pandoc/filters/tikz.lua` も同じに変え、両方を確かめる。
  ラベルなしの ` ```tikz ` の出力（`\begin{figure}\centering … \end{figure}`）は既存の文書が使っているので変えない。
- Pandoc 側の確認：実際の文書と同じ defaults（例：`-d book-ja -d zotero --lua-filter ja-spacing.lua`）で `test/fixtures/` を PDF にし、
  `pdftotext` で図番号と参照、`pdftoppm` で見た目を確かめる。ホームではなく chezmoi ソースの設定で動かすには、ソースの `pandoc/` を
  一時ディレクトリの `pandoc/` にコピーし（`include-files.lua` はホームから）、`XDG_DATA_HOME` をその一時ディレクトリにして、
  mise の pandoc / pandoc-crossref の**実体**を PATH の先頭に置く。`--data-dir` だけだと defaults の継承先がホームから読まれる。
  `XDG_DATA_HOME` を変えたまま `mise exec` を呼ぶと mise がツールを入れ直す。
- **画像の図になる条件は Pandoc に合わせる。** 変えるときは `test/fixtures/figures.md` を `pandoc -t native` に通し、
  `Figure` になる画像が一致することを確かめる。
- VS Code の Markdown エンジンについて：
  - トークンを文書のバージョンごとにキャッシュするので、TikZ の結果の参照は render の段階（`renderer.rules.fence`）で行う。
  - 画像の `src` を書き換える renderer を持つので、`image` などの既存の rule は必ず呼ぶ。
  - HTML をサニタイズしないので、SVG はインラインで埋め込める（id には図ごとの接頭辞を付ける。pdftocairo の id は毎回同じ）。
  - `md.renderInline` の結果には、組み込みの Mermaid 拡張の `<span id="markdown-mermaid">` と `data-line` が入るので消す。
- `test/fixtures/` は Pandoc と拡張のテストで共有する。dotfiles は公開リポジトリなので、未公開の原稿をコピーしない。
- テストのプリアンブルは chezmoi **ソース**の `pandoc/includes/` を使う（ホームの適用済みのコピーに依存しない）。
- 拡張のバージョンはキャッシュのキーに入っている。TikZ の描画結果が変わる変更をしたら `version` を上げる。

## 検証

`npm test`（約 5 秒。pdflatex で `test/fixtures/` を描く）と `npm run typecheck`。VS Code の中で確かめる手順は `../CLAUDE.md`。
