# Pandoc Preview

VS Code 標準の Markdown プレビューを、Pandoc（`-d article-ja` / `-d book-ja` など）の出力に近づける拡張。

- ` ```tikz ` のブロックを、本物の pdflatex で描いた図にする
- 段落に1つだけの画像を、alt をキャプションにした図にする

図番号の表示と `[@fig:…]` の解決はしない（PDF では pandoc-crossref が行う）。

## TikZ の図

````md
```{.tikz #fig:circle caption="半径 $r$ の円"}
\begin{tikzpicture} \draw (0,0) circle (1); \end{tikzpicture}
```

```tikz
\begin{tikzcd} A \arrow[r, "f"] & B \end{tikzcd}
```
````

- 先頭のクラスが `tikz` のフェンスが対象（` ```tikz {#fig:x} ` の形も可）。中身は環境（`tikzpicture`、`tikzcd`、`\xymatrix{…}` など）だけを書き、
  プリアンブルや `\begin{document}` は書かない。
- `#id`（参照するなら `fig:` で始める）か `caption` があれば番号付きの図、どちらもなければ番号なしの図。
- `caption` は Markdown（数式、強調、引用 `[@key]`）。引用符の中で `\` がエスケープになるのは ASCII 記号の前だけ（`\alpha` はそのまま。Pandoc と同じ）。
  バッククォートを書くときはフェンスを `~~~{.tikz …}` にする（CommonMark は ```` ``` ```` の行にバッククォートを許さない）。

**Pandoc では**（`~/.local/share/pandoc/filters/tikz.lua`）、番号付きの図は `Figure` 要素になり、pandoc-crossref が番号を振って `[@fig:…]` を `\cref` にする。
番号なしの図は `\begin{figure}\centering … \end{figure}`。フィルタは `common-base.yaml` で `include-files.lua` の直後、
`unicode-math.lua`（キャプションの `$α$` を変換させるため）と `pandoc-crossref` より前に置く。

**プレビューでは**、図ごとに pdflatex → pdftocairo で SVG を作って埋め込む。

- 入力が止まって 0.5 秒ほどで描き直し、その間は直前の図を薄く表示する。結果はキャッシュし、同じ図は二度コンパイルしない。
- エラーは TeX のログの該当部分を枠で表示する。
- ダークテーマでは図の黒を文字色に、白を背景色にする（薄い塗りの上の黒文字は読みにくくなるので、気になれば `tikz.preview.adaptToTheme` をオフ）。
- 信頼されていないワークスペースでは描画しない。

プリアンブルは Pandoc のテンプレートの冒頭に合わせ、`standalone` クラスに `xcolor`、`amsmath`、`fontenc`、`lmodern`、
（和文用の）`bxcjkjatype` を読み込み、`tikz.preamble.files` を `\input` する。mylatexformat でフォーマットにダンプして速くする（1枚 約 0.6 秒）。

必要なもの：`pdflatex`（TeX Live。`standalone`、`mylatexformat`、`bxcjkjatype`）、`pdftocairo`（poppler）、
和文には `font-ja.sty` の TTF（chezmoi の `.chezmoiexternal.toml` で `TEXMFHOME` に入る）。

| 設定 | 既定値 | 説明 |
|---|---|---|
| `tikz.preamble.files` | `~/.local/share/pandoc/includes/` の `common.sty`、`font-ja.sty` | `\input` するファイル。`~`、`${workspaceFolder}`、ワークスペースからの相対パス。プロジェクト独自の `.sty` はワークスペース設定で足す |
| `tikz.preamble.extra` | `""` | 追加の LaTeX |
| `tikz.preamble.japanese` | `true` | `bxcjkjatype` を読み込む |
| `tikz.preview.adaptToTheme` | `true` | ダークテーマに合わせて黒と白を置き換える |
| `tikz.preview.scale` | `1.3` | PDF での大きさに対する表示倍率 |
| `tikz.render.delay` / `timeout` / `concurrency` | `500` / `20000` / `2` | 描画までの待ち（ms）、pdflatex を止めるまで（ms）、同時に描く数 |
| `tikz.path.pdflatex` / `tikz.path.pdftocairo` | `pdflatex` / `pdftocairo` | |

コマンド：**TikZ: Clear Rendered Figure Cache**（キャッシュを消す）、**TikZ: Rebuild Preamble Format**
（`\input` の先でさらに読むファイルを変えたときに使う）、**TikZ: Show Log**。

## 画像の図

```md
![曲線．$x(τ)$ は **パラメータ** $τ$ で表される．](img/curve.svg){#fig:curve width=50%}
```

- 段落に画像が1つだけで alt が空でなければ図にして、alt を Markdown としてキャプションに描く（Pandoc の implicit_figures）。
  文中の画像、alt が空の画像、リンクの中の画像、詰まったリストの中の画像は図にしない。
- 画像の直後の `{...}` は Pandoc の属性として読み、本文から消す。`width` / `height`（`px`、`cm`、`mm`、`in`、`%`。単位なしは `px`）は表示の大きさ、
  `.class` は画像のクラス、`#id` は図（文中の画像なら画像）の id になる。

## やらないこと

図番号・参照の解決、PNG / PDF への書き出し、` ```{=latex} ` の中の TikZ のプレビュー、TikZ の `width=` 属性、subfig、
`::: {#fig:x}` で囲む書き方（`caption` 属性で足りる）。
