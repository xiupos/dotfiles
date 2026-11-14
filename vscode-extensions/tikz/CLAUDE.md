# tikz

共通のルールは `../CLAUDE.md`。仕様は `SPEC.md`（実装を変えたら SPEC も直す）。

## 構成

- `src/attrs.ts`：Pandoc 風の属性の解釈。
- `src/markdown.ts`：markdown-it への組み込み（`fence` の差し替え、`renderer.render` の包み）。
- `src/preamble.ts`：プレビュー用プリアンブル。`src/tex.ts`：pdflatex / pdftocairo、フォーマットのダンプ、ログの解析。
- `src/renderer.ts`：キャッシュと debounce 付きのキュー。`src/svg.ts`：id の接頭辞。`media/preview.css`：見た目とテーマ対応。
- `src/extension.ts`：VS Code とつなぐ部分（設定、Diagnostics、コマンド、HTML）。`vscode` を使うのはここだけ。

## 守ること

- **記法は Pandoc フィルタと一致させる。** 記法を変えるときは、chezmoi ソースの
  `private_dot_local/private_share/pandoc/filters/tikz.lua` も同じに変え、両方を確かめる。
  - Pandoc 側の確認は SPEC.md 2 節の「確認方法」の手順で、修論と同じ defaults（`-d book-ja -d zotero --lua-filter ja-spacing.lua`）で
    `test/fixtures/` を PDF にし、`pdftotext` で図番号と参照、`pdftoppm` で見た目を確かめる。
  - ラベルなしの ` ```tikz ` の出力は、以前の `codeblock.lua` と同じでなければならない。
- `test/fixtures/` は Pandoc と拡張のテストで共有する。dotfiles は公開リポジトリなので、未公開の原稿をコピーしない。
- テストのプリアンブルは chezmoi **ソース**の `pandoc/includes/` を使う（`test/workspace.ts`）。ホームの適用済みのコピーに依存しない。
- キャッシュの参照は render の段階で行う（VS Code はトークンを文書のバージョンごとにキャッシュするため、parse の段階では古くなる）。
- 拡張のバージョンはキャッシュのキーに入っている。描画結果が変わる変更（プリアンブルの組み立て、コンパイル方法）をしたら `version` を上げる。

## 検証

- 普段：`../scripts/test-integration.sh tikz`（`npm test` でも同じ）。型検査は `npm run typecheck`。
- 節目：`../scripts/screenshot.sh tikz` で `screenshots/` に撮り、ライト・ダーク、エラー表示、キャプションを目で確かめる。
