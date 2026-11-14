# pandoc-figure

共通のルールは `../CLAUDE.md`。仕様は `README.md`。

- `src/figure.ts`：markdown-it のプラグイン。core rule（`pandoc_figure`）で図にする画像と属性を決めてトークンの `meta` に書き、
  `paragraph_open` / `paragraph_close` / `image` の renderer で `<figure>` と `<figcaption>` を出す。
  VS Code の Markdown エンジンは画像の `src` を書き換える renderer を持つので、既存の `image` の rule を必ず呼ぶ。
- 「図になる条件」は Pandoc に合わせる。変えるときは `test/fixtures/figures.md` を
  `pandoc -t native` に通し、`Figure` になる画像が拡張の判定と一致することを確かめる。
- 属性の解釈は `../shared/pandoc-attrs.ts`（tikz と共通）。
- 検証：`../scripts/test-integration.sh pandoc-figure`、節目に `../scripts/screenshot.sh pandoc-figure`。
