# tikz — 仕様

` ```tikz ` ブロックを、Pandoc（`pandoc/filters/tikz.lua`）では図に、VS Code 標準の Markdown プレビュー（拡張 `xiupos.tikz`）では
pdflatex で描いた SVG にする。記法は両者で共通。

## 1. 記法

````md
```{.tikz #fig:circle caption="半径 $r$ の円"}
\begin{tikzpicture} \draw (0,0) circle (1); \end{tikzpicture}
```

```tikz
\begin{tikzpicture} \draw (0,0) -- (1,1); \end{tikzpicture}
```
````

- 先頭のクラスが `tikz` のフェンスが対象。` ```tikz {#fig:x} ` の形も可。中身は環境（`tikzpicture`、`tikzcd`、`\xymatrix{…}` など）だけを書く。
- `#id`（参照するなら `fig:` で始める）と `caption` は任意。どちらかがあれば番号付きの図、どちらもなければ番号なしの図。
- `caption` は Markdown（数式、強調、引用 `[@key]`）。引用符の中では ASCII 記号の前の `\` だけがエスケープ（pandoc と同じ。`\alpha` はそのまま）。
- `caption` にバッククォートを書くときは `~~~{.tikz …}` を使う（CommonMark は ```` ``` ```` の情報文字列にバッククォートを許さない）。

## 2. Pandoc（`filters/tikz.lua`）

- 番号なし：RawBlock `\begin{figure}\centering … \end{figure}`（以前の `codeblock.lua` と同一の出力）。
- 番号付き：`Figure` 要素（中身は RawBlock、キャプションは Markdown の AST）。番号と `\label` は pandoc-crossref が付け、`[@fig:…]` は `\cref` になる。
- 位置指定（`[htbp]`）は付けない。
- `common-base.yaml` の `filters` で `include-files.lua` の直後に置く。`unicode-math.lua` より前（キャプションの `$α$` を変換させるため）、
  `pandoc-crossref` より前（番号を振らせるため）。
- pandoc 3.13 では `Figure` の中身が `\hypertarget` で包まれないので、tikz-cd の `&` はそのまま通る（3.1.3 では壊れた。再発したら `lrbox` で figure の外に組む）。

## 3. プレビュー

```html
<figure class="tikz-figure code-line tikz-adapt" data-line="<フェンスの行>" data-tikz-state="ok" id="fig:circle">
  <div class="tikz-body"><svg …>…</svg></div>
  <figcaption>…</figcaption>
</figure>
```

- 図番号の表示と `[@fig:…]` の解決はしない。`:::` の div には触れない。
- SVG はインラインで埋め込む（プレビューはサニタイズしない）。id には `tikz-<キーの先頭10桁>-` を付けて衝突を防ぐ。
- 大きさは PDF の `tikz.preview.scale` 倍（SVG の `width` / `height` だけを書き換える）。プレビューの幅を超えない。
- キャプションは `md.renderInline`（KaTeX が効く）。中の `data-line` と Mermaid 拡張の `<span id="markdown-mermaid">` は消す。

| `data-tikz-state` | 表示 |
|---|---|
| `ok` | SVG |
| `pending` | 同じブロックの直前の SVG を薄く。なければ「Rendering TikZ…」 |
| `error` | エラーの枠 + 直前の SVG を薄く |
| `untrusted` | 「TikZ: not rendered in an untrusted workspace」+ ソース |

「同じブロック」は文書の URI と、何番目の tikz ブロックかで決める。

**テーマ**：`tikz.preview.adaptToTheme` がオンなら、CSS で `fill` / `stroke` が黒（`rgb(0%, 0%, 0%)`）と色指定なしの要素を
`currentColor`、白を `var(--vscode-editor-background)` にする。SVG は書き換えない。薄い塗りの上の黒文字はダークで読みにくくなる。

## 4. 描画

1. **プリアンブル**（6 節）を描画ごとに組み立て、ファイルの中身ごとハッシュを取る。
2. **フォーマット**：mylatexformat でダンプ（ダンプ元はプリアンブル + `\begin{document}\end{document}`）。
   キーは `hash(プリアンブル + pdflatex --version)`、`globalStorageUri/fmt/` に置く。失敗したら毎回プリアンブルを読み込む。
3. **コンパイル**：図ごとの一時ディレクトリで
   `pdflatex -interaction=nonstopmode -halt-on-error -no-shell-escape [-fmt=…] fig.tex` → `pdftocairo -svg`。
   `TEXINPUTS` に Markdown のディレクトリ、ワークスペース、プリアンブルのファイルのディレクトリを足す。`max_print_line=10000`。
   タイムアウトで SIGKILL、同時実行数に上限。
4. **キャッシュ**：キーは `hash(拡張のバージョン + プリアンブル + コード)`。メモリと `globalStorageUri/svg/`。
   エラーもキャッシュする。タイムアウトとコマンドが見つからない場合はメモリだけ（設定の変更で捨てる）。
5. **debounce**：ブロックのコードが変わったら `tikz.render.delay` 待ってから積む。待つ間に変われば予約を取り消す。
6. 描画が終わったら、100 ms の debounce をかけて `markdown.preview.refresh` を1回呼ぶ。

VS Code はトークンを文書のバージョンごとにキャッシュするので、結果の参照は render の段階（`renderer.rules.fence`）で行う。
描画の開始と終了は `md.renderer.render` を包んで知る（`renderInline` による入れ子は数えない）。
実行時の依存は Node の標準モジュールのみ。

## 5. エラー

- **プレビュー**：ログの `!` 行から `l.<n>` 行までを枠で出す。見出しと重複する行、TeX の定型文は除き、`l.<n>` は Markdown の行番号（1 始まり）に直す。
- **Problems**：Diagnostics（source `tikz`）を Markdown の行に出す。換算できないエラーはフェンスの行。直れば消え、文書を閉じても消える。
- プリアンブルのファイルがなければ各ブロックにエラー。コマンドが見つからなければ一度だけ通知。
- 出力チャネル「TikZ」に、ダンプ、所要時間、エラーを出す。

## 6. プリアンブルと設定

```latex
\PassOptionsToPackage{dvipsnames,svgnames,x11names}{xcolor}
\documentclass[border=2pt]{standalone}        % tikz オプションなし（\xymatrix などを通すため）
\usepackage{xcolor}
\usepackage{amsmath,amssymb}
\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage[whole]{bxcjkjatype}               % tikz.preamble.japanese
\input{<tikz.preamble.files>}                 % 順に、絶対パスで
<tikz.preamble.extra>
```

| 設定 | 既定値 |
|---|---|
| `tikz.preamble.files` | `~/.local/share/pandoc/includes/` の `common.sty`、`font-ja.sty`（`~`、`${workspaceFolder}`、相対パス可） |
| `tikz.preamble.extra` | `""` |
| `tikz.preamble.japanese` | `true` |
| `tikz.preview.adaptToTheme` | `true` |
| `tikz.preview.scale` | `1.3` |
| `tikz.render.delay` / `timeout` / `concurrency` | `500` ms / `20000` ms / `2` |
| `tikz.path.pdflatex` / `tikz.path.pdftocairo` | `pdflatex` / `pdftocairo` |

- Pandoc の defaults は読まない。プロジェクト独自の `.sty` はワークスペース設定で足す。
- `\input` の先でさらに読むファイルはハッシュに入らない（「TikZ: Rebuild Preamble Format」で作り直す）。

## 7. Workspace Trust とコマンド

- `untrustedWorkspaces: limited`。信頼されていなければコンパイルしない。`tikz.path.*`、`tikz.preamble.files`、`tikz.preamble.extra` は restricted。
- `tikz.clearCache`：SVG のキャッシュと直前の SVG を消す。`tikz.rebuildFormat`：フォーマットと SVG のキャッシュを消す。`tikz.showLog`：出力チャネルを開く。

## 8. やらないこと

図番号・参照の解決、TikZJax、PNG / PDF への書き出し、公開、` ```{=latex} ` 内の TikZ のプレビュー、`width=` 属性、subfig、
div 形式（`::: {#fig:x}` で囲む書き方。caption 属性で足りるため）。

## 9. テスト

- `test/fixtures/`：Pandoc と拡張で共有するサンプル（`syntax.md`、`samples.md`、`error.md`）。
- `scripts/test-integration.sh tikz`：VSCodium で `markdown.api.render` の HTML と Diagnostics を検査する。
- `scripts/screenshot.sh tikz`：実際のプレビューをライト・ダークで撮る。
