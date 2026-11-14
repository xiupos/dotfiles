# tikz

共通のルールは `../CLAUDE.md`。仕様は `SPEC.md`（実装を変えたら SPEC も直す）。

## 構成

- `src/markdown.ts`：` ```tikz ` のフェンスを描画関数に渡す markdown-it のプラグイン。
- `src/tex.ts`：プリアンブル、フォーマットのダンプ、pdflatex → pdftocairo、ログからのエラーの抜き出し。
- `src/cache.ts`：結果のキャッシュ（メモリとディスク）と、debounce・同時実行数つきのキュー。
- `src/extension.ts`：VS Code とつなぐ部分（設定、HTML、コマンド）。`vscode` を使うのはここだけ。`media/preview.css`：見た目とテーマ対応。

## 守ること

- **記法は Pandoc フィルタと一致させる。** 記法を変えるときは、chezmoi ソースの
  `private_dot_local/private_share/pandoc/filters/tikz.lua` も同じに変え、両方を確かめる。
  - Pandoc 側は、実際の文書と同じ defaults（例：`-d book-ja -d zotero --lua-filter ja-spacing.lua`）で `test/fixtures/` を PDF にし、
    `pdftotext` で図番号と参照、`pdftoppm` で見た目を確かめる。ホームではなく chezmoi ソースの設定で動かすには：
    ソースの `pandoc/` を一時ディレクトリの `pandoc/` にコピーし（`include-files.lua` はホームから）、`XDG_DATA_HOME` をその
    一時ディレクトリにして、mise の pandoc / pandoc-crossref の**実体**を PATH の先頭に置いて実行する。
    `--data-dir` だけだと defaults の継承先がホームから読まれる。`XDG_DATA_HOME` を変えたまま `mise exec` を呼ぶと mise がツールを入れ直す。
  - ラベルなしの ` ```tikz ` の出力（`\begin{figure}\centering … \end{figure}`）は変えない。既存の文書が使っている。
- `test/fixtures/` は Pandoc と拡張のテストで共有する。dotfiles は公開リポジトリなので、未公開の原稿をコピーしない。
- テストのプリアンブルは chezmoi **ソース**の `pandoc/includes/` を使う。ホームの適用済みのコピーに依存しない。
- キャッシュの参照は render の段階で行う（VS Code はトークンを文書のバージョンごとにキャッシュするため、parse の段階では古くなる）。
- 拡張のバージョンはキャッシュのキーに入っている。描画結果が変わる変更（プリアンブルの組み立て、コンパイル方法）をしたら `version` を上げる。

## 検証

`npm test`（約 5 秒。pdflatex で `test/fixtures/` を描く）と `npm run typecheck`。VS Code の中で確かめる手順は `../CLAUDE.md`。
