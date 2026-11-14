# tikz — 仕様書

Pandoc（Markdown → LaTeX → PDF）で書く文書の ` ```tikz ` ブロックを、
VS Code 標準の Markdown プレビューで本物の TeX によって描画する拡張（`xiupos.tikz`）と、
同じ記法を解釈する Pandoc フィルタ（chezmoi ソースの `private_dot_local/private_share/pandoc/filters/tikz.lua`）の仕様。

---

## 0. 背景（M0 の調査）

### dotfiles の Pandoc 設定

- defaults は `article` / `book` と、和文版 `article-ja` / `book-ja`（`bxjsarticle` / `bxjsbook`、`pdflatex`、`pandoc` オプション）。
  和文版は `common-lang-ja.yaml` を通して `font-ja.sty`（Source Han の TTF を `bxcjkjatype` で使う）、`cleveref-ja.sty`、`amsthm-ja.sty` を読み込む。
- `common.sty` は tikz、pgfplots、tikz-cd、xy、tikz-feynhand、braids と各種 TikZ ライブラリ、`subfig`、`caption`、`cleveref` などを読み込む。
- Pandoc のテンプレートは、`xcolor`（`dvipsnames,svgnames,x11names`）、`amsmath,amssymb`、`fontenc[T1]`、`lmodern` を読み込む。
- `metadata.cref: true` なので、`[@fig:x]` は `\cref{fig:x}` になる。
- 以前の `codeblock.lua` は TikZ の処理だけをしていた（`figure` + `\centering` で包む。キャプションなし、図番号なし）。

### 修論（`~/Researches/thesis_MSc`）

- ビルドは `just`（既定は `book`）：`pandoc -d book-ja -d zotero --lua-filter ja-spacing.lua thesis.md -o thesis.pdf`。章は `include-files.lua` で取り込む。
- **TikZ の図はない。** 図はすべて Excalidraw の SVG で、`![キャプション](./img/x.svg){#fig:01a1969f-… width=75%}` の形。
  ラベルは `fig:` + UUID 風。参照は `[@fig:…]`。`\begin{figure}`、subfig は使っていない。
- 今後 TikZ を使うときは、この仕様の記法に合わせる（既存の書き方に合わせる必要はない）。

### 事前の測定

- 和文ノードを含む図 1 枚：プリアンブルを毎回読み込むと約 1.3 秒、mylatexformat でダンプしたフォーマットを使うと約 0.58 秒。ダンプは約 1.2 秒、`.fmt` は約 10 MB。

---

## 1. 記法

Pandoc と拡張で共通。ブロックの中身は環境（`tikzpicture`、`tikzcd`、`\xymatrix{…}` など）だけを書き、
`\documentclass`、プリアンブル、`\begin{document}` は書かない。

### 1.1 属性形式

````md
```{.tikz #fig:circle caption="半径 $r$ の円"}
\begin{tikzpicture} \draw (0,0) circle (1); \end{tikzpicture}
```
````

- 先頭のクラスが `tikz` のフェンス（`{.foo .tikz}` は対象外）。` ```tikz {#fig:circle} ` の形も使える（Pandoc と同じ）。
- `#id`：任意。参照するなら `fig:` で始める。
- `caption="…"`：任意。中身は **Markdown** として解釈する（数式、強調、引用 `[@key]` も可）。
  引用符の中では、ASCII 記号の前のバックスラッシュだけがエスケープになる（`\"` → `"`、`\\` → `\`、`\$` → `$`）。
  `\alpha` はそのまま残る。pandoc 3.13 の挙動に合わせてある。
- id か caption のどちらかがあれば番号付きの図、どちらもなければ 1.2 と同じ扱い。
- caption にインラインコード（バッククォート）を書くときは、チルダのフェンス `~~~{.tikz …}` を使う。
  CommonMark（VS Code のプレビュー）では、バッククォートのフェンスの情報文字列にバッククォートを書けないため。
  Pandoc はどちらのフェンスでも受け付ける。

### 1.2 従来の形式

````md
```tikz
\begin{tikzpicture} ... \end{tikzpicture}
```
````

ラベルもキャプションもない図。Pandoc の出力は以前の `codeblock.lua` と1文字も違わない。

---

## 2. Pandoc での出力（`filters/tikz.lua`）

| 記法 | 出力 |
|---|---|
| 1.2 従来形式 | RawBlock：`\begin{figure}` `\centering` 中身 `\end{figure}`（図番号なし） |
| 1.1 属性形式 | Pandoc の `Figure` 要素（中身は RawBlock の LaTeX、キャプションは Markdown の AST、id はそのまま）。番号付けと `\label` は pandoc-crossref に任せる |

- `[@fig:…]` は pandoc-crossref が解決する（`cref: true` なら `\cref{…}`）。
- id はあるがキャプションがない場合：番号付きの図で、キャプションは空（PDF では「図3」とだけ出る）。
- キャプションはあるが id がない場合：番号付きの図で、参照はできない。
- float の位置指定（`[htbp]`）は付けない（Pandoc の画像の図と同じ）。揃えたい場合は Pandoc の変数 `fig-pos` を使える。

### フィルタの位置

`common-base.yaml` の `filters` で、**`include-files.lua` の直後、`unicode-math.lua` より前**。

- `pandoc-crossref` より前：crossref に `Figure` として番号を振らせるため。
- `unicode-math.lua` より前：caption 属性の文字列はこのフィルタで初めて AST になるので、後ろに置くと
  キャプション内の `$α$` などが変換されず、pdflatex でエラーになる。
- `include-files.lua` より後：取り込んだ章の中のブロックも処理するため。

### `\hypertarget` 問題

pandoc 3.1.3 では `Figure` の中身が `\hypertarget{id}{…}` の引数に入り、tikz-cd の `&` が壊れたため、
試作では `lrbox` で figure の外に組んでいた。pandoc 3.13 + pandoc-crossref 0.3.26a では包まれず、
tikz-cd を含む文書が PDF まで通るので、**`lrbox` は使わない**。pandoc を上げて再発したら `lrbox` 方式に戻す。

### 確認結果（M1）

- `test/fixtures/syntax.md` と `samples.md`（＋キャプション中の引用）を、修論と同じ
  `-d book-ja -d zotero --lua-filter ja-spacing.lua` と `-d article-ja …` で PDF にした。
  図1〜11 の番号、`\cref` による参照（「図 1 と 11」）、キャプション中の `α` の変換、キャプション中の natbib 引用、
  `~~~` フェンスのキャプション中のコード、tikz-cd / pgfplots / tikz-feynhand / braids / xy-pic がすべて正しく出た。
- `\xymatrix` を単独で書くと、`\centering` があっても左寄せになる（従来形式でも同じ。TeX の挙動）。
- 確認方法：chezmoi のソースの `pandoc/` を一時ディレクトリの `pandoc/` にコピーし（`include-files.lua` はホームから）、
  `XDG_DATA_HOME` をその一時ディレクトリにして、mise の pandoc / pandoc-crossref の実体を PATH の先頭に置いて実行する。
  - `--data-dir` だけでは、defaults の `defaults:` で継承する先がホームの `~/.local/share/pandoc` から読まれる。
  - `XDG_DATA_HOME` を変えたまま `mise exec` を呼ぶと、mise がツールを入れ直してしまう。

---

## 3. プレビューでの表示

対象は VS Code 標準の Markdown プレビュー（`markdown.markdownItPlugins` → `extendMarkdownIt`）。

### 3.1 HTML

```html
<figure class="tikz-figure code-line tikz-adapt" data-line="12" data-tikz-state="ok" id="fig:circle">
  <div class="tikz-body"><svg …>…</svg></div>
  <figcaption>…</figcaption>
</figure>
```

- 見た目は Markdown の画像と同程度。中央寄せ、はみ出す場合は縮小（`max-width: 100%`）。
  大きさは PDF での大きさの `tikz.preview.scale` 倍（既定 1.3）。TeX の pt をそのまま CSS の pt にすると（1pt = 1.333px）、
  10pt の文字が本文（14px）より小さく見えるため。SVG の `width` / `height` だけを書き換え、`viewBox` はそのまま。
  描画時に掛けるので、キャッシュは倍率に依存しない。
- 図番号は表示しない。`[@fig:…]` は解決しない（本文でもキャプションでもテキストのまま）。
- キャプション：`md.renderInline` で描く。標準プレビューの数式（KaTeX）がキャプションにも効く。
  キャプションの中の `data-line`（キャプションのソース内の行番号なので、スクロール同期を乱す）と、
  組み込みの Mermaid 拡張が描画ごとに差し込む空の `<span id="markdown-mermaid">`（id が重複する）は消す。
- `data-line` はフェンスの行。`class="code-line"` と合わせてスクロール同期に使われる。
- SVG は**インラインで埋め込む**。標準プレビューは HTML をサニタイズしないことを VSCodium 1.143 のソースと実画面で確認した。
  `pdftocairo` の SVG は `glyph-0-1`、`clip-0` のような id を使うので、`tikz-<キーの先頭10桁>-` を接頭辞に付けて衝突を防ぐ。
- `:::` の div には触れない。

### 3.2 状態ごとの表示（`data-tikz-state`）

| 状態 | 表示 |
|---|---|
| `ok` | SVG + キャプション |
| `pending`（初回） | プレースホルダー「Rendering TikZ…」+ キャプション |
| `pending`（2回目以降） | 同じブロックで最後に成功した SVG を薄く（`opacity: 0.4`）表示 + キャプション |
| `error` | 枠付きのエラー表示（5 節）+ 直前の SVG を薄く + キャプション |
| `untrusted` | 「TikZ: not rendered in an untrusted workspace」+ ソースを `<pre>` で |

「同じブロック」は、文書の URI とブロックの出現順（何番目の tikz ブロックか）で識別する。

### 3.3 ダークテーマ

設定 `tikz.preview.adaptToTheme`（既定 `true`）がオンのとき、`<figure>` に `tikz-adapt` クラスを付け、CSS で
`fill` / `stroke` が `rgb(0%, 0%, 0%)`（黒）の要素を `currentColor` に、`rgb(100%, 100%, 100%)`（白）の要素を
`var(--vscode-editor-background)` にする。色の指定がない要素（既定の黒）も `currentColor` になる。その他の色はそのまま。
SVG 自体は書き換えないので、キャッシュはテーマに依存しない。

制限：薄い色で塗った領域の上の黒文字も `currentColor`（ダークでは明るい色）になるので、読みにくくなる
（例：`\fill[blue!30]` の上のノード）。気になる図では設定をオフにする。

---

## 4. 描画の流れ

1. **プリアンブルを組み立てる**（6 節）。描画（1回のプレビュー更新）ごとに1回、ファイルを読んでハッシュを取る。
2. **フォーマットをダンプする**：`pdflatex -ini -jobname=<key> "&pdflatex" mylatexformat.ltx preamble.tex`。
   ダンプ元は、プリアンブルの後に `\begin{document}\end{document}` を付けたもの（ないと Emergency stop）。
   キーは `hash(プリアンブルのハッシュ + pdflatex --version の1行目)`。`globalStorageUri/fmt/<key>.fmt` に置く。
   ダンプに失敗したら、そのプリアンブルでは毎回読み込む通常のコンパイルにする（出力チャネルに理由を出す）。
3. **コンパイル**：図ごとに一時ディレクトリを作り、
   `pdflatex -interaction=nonstopmode -halt-on-error -no-shell-escape [-fmt=<絶対パス>] fig.tex` → `pdftocairo -svg`。
   - フォーマットありの `fig.tex` は `\begin{document}` から始まる（コードは 2 行目から）。なしの場合はプリアンブルを前に付ける。
   - `TEXINPUTS` に、Markdown ファイルのディレクトリ、ワークスペースのルート、プリアンブルのファイルがあるディレクトリを足す。
   - `max_print_line=10000` にしてログの折り返しを止める。
   - スタンダロンのクラスは `[border=2pt]{standalone}`（`tikz` オプションなし）。`tikz` オプションだと
     `tikzpicture` ごとに別ページになり、`\xymatrix` のような tikzpicture 以外の中身が扱えないため。
   - タイムアウト（`tikz.render.timeout`、既定 20 秒）で SIGKILL。同時実行数の上限（`tikz.render.concurrency`、既定 2）。
4. **キャッシュ**：キーは `hash(拡張のバージョン + プリアンブルのハッシュ + 図のコード)`。
   メモリと `globalStorageUri/svg/<key>.json` の両方。エラーの結果もキャッシュする（同じコードを何度もコンパイルしない）。
   ただしタイムアウトやコマンドが見つからない場合はメモリだけに置き、設定の変更や再起動で捨てる。
5. **debounce**：あるブロックに新しいコードが来たら、`tikz.render.delay`（既定 500 ms）待ってからキューに積む。
   その間に同じブロックのコードがまた変われば、前の予約を取り消す。
6. **プレビューの更新**：描画が終わったら 100 ms の debounce をかけて `markdown.preview.refresh` を1回呼ぶ。

VS Code の Markdown エンジンは文書のバージョンごとにトークンをキャッシュするので、
キャッシュの参照は parse の段階ではなく render の段階（`renderer.rules`）で行う。
1回の描画の開始と終了は `md.renderer.render` を包んで知る（キャプションの `renderInline` による入れ子の呼び出しは数えない）。

実行時の依存は Node の標準モジュールのみ（`child_process`、`fs`、`crypto`、`path`、`os`）。esbuild で1ファイルにバンドルする。
外部コマンドとして `pdflatex`（mylatexformat、bxcjkjatype を含む TeX Live）と `pdftocairo`（poppler）を使う。

---

## 5. エラー時の挙動

- **プレビュー**：TeX のログから `!` で始まる行（`! ==> Fatal error occurred` は除く）と、`l.<n>` の行までを抜き出し、枠で表示する。
  - 枠の見出しはエラーの1行目。抜粋からは見出しと同じ行と、TeX の定型文（「See the … documentation for explanation.」
    「Type H <return> for immediate help.」「...」）を除く。
  - 抜粋の `l.<n>` は、**Markdown ファイルの行番号（1 始まり）**に書き換える。
  - ログが読めない場合（タイムアウト、コマンドが見つからない等）は、その理由を表示する。
- **Problems パネル**：Diagnostics（source `tikz`）を出す。行は「ブロックのコードの先頭行 + (TeX の行番号 − TeX ファイルでのコードの開始行)」。
  プリアンブル内のエラーなど換算できないものは、フェンスの行に付ける。直れば次の描画で消える。文書を閉じると消す。
- **プリアンブルのファイルが見つからない**ときは、各ブロックにエラーとして表示する。
- **コマンドが見つからない**ときは、一度だけ通知を出す。
- 出力チャネル「TikZ」に、フォーマットのダンプ、各コンパイルの所要時間、エラーを出す。

---

## 6. プレビュー用プリアンブル

Pandoc の `-d article-ja` / `-d book-ja` の出力に近づける：

```latex
\PassOptionsToPackage{dvipsnames,svgnames,x11names}{xcolor}
\documentclass[border=2pt]{standalone}
\usepackage{xcolor}
\usepackage{amsmath,amssymb}
\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage[whole]{bxcjkjatype}              % tikz.preamble.japanese が true のとき
\input{<tikz.preamble.files の各ファイル>}   % 順に、絶対パスで
<tikz.preamble.extra>
```

| 設定 | 既定値 | 説明 |
|---|---|---|
| `tikz.preamble.files` | `["~/.local/share/pandoc/includes/common.sty", "~/.local/share/pandoc/includes/font-ja.sty"]` | `~`、`${workspaceFolder}`、ワークスペースからの相対パスが使える。プロジェクト独自の `.sty` はワークスペース設定で足す |
| `tikz.preamble.extra` | `""` | 追加の LaTeX |
| `tikz.preamble.japanese` | `true` | `bxcjkjatype` を読み込む。`font-ja.sty` は `\setminchofont` があるときだけ効くので組みで使う |
| `tikz.preview.adaptToTheme` | `true` | 3.3 |
| `tikz.preview.scale` | `1.3` | 3.1 |
| `tikz.render.delay` | `500`（ms） | 4 節の 5 |
| `tikz.render.timeout` | `20000`（ms） | |
| `tikz.render.concurrency` | `2` | |
| `tikz.path.pdflatex` / `tikz.path.pdftocairo` | `pdflatex` / `pdftocairo` | |

- Pandoc の defaults は読み取らない（継承や `${.}` の解決を再現するのは割に合わない）。
- `\input` したファイルがさらに `\input` するファイルの変更は、ハッシュに入らない。「TikZ: Rebuild Preamble Format」で作り直す。
- 文書クラスの違い（`bxjsbook` 12pt と `standalone` 10pt）による文字の大きさの差は再現しない。
- `font-ja.sty` は TTF を `TEXMFHOME` から探す。拡張は VS Code の環境変数をそのまま子プロセスに渡す。

---

## 7. Workspace Trust とコマンド

- `capabilities.untrustedWorkspaces.supported: "limited"`。信頼されていないワークスペースではコンパイルせず、3.2 の表示にする。
  `tikz.path.*`、`tikz.preamble.files`、`tikz.preamble.extra` は restricted 設定。信頼されたら再描画する。
- コマンド：
  - `TikZ: Clear Rendered Figure Cache`（`tikz.clearCache`）：SVG のキャッシュ（メモリとディスク）と「直前の SVG」を消す。
  - `TikZ: Rebuild Preamble Format`（`tikz.rebuildFormat`）：フォーマットと SVG のキャッシュを消す。次の描画で作り直す。
  - `TikZ: Show Log`（`tikz.showLog`）：出力チャネルを開く。

---

## 8. やらないこと

- プレビューでの図番号の表示、`[@fig:…]` の解決、pandoc-crossref の再現
- node-tikzjax / TikZJax による描画
- PNG・PDF への書き出し
- Marketplace / Open VSX への公開
- ` ```{=latex} ` の raw ブロックの中の `tikzpicture` のプレビュー
- `width=` などの大きさの属性（Pandoc 側でも未対応）
- subfig（1つの図に複数の TikZ）
- div 形式（`::: {#fig:x}` の中に tikz のフェンスとキャプションの段落を書く形）。一度実装したが、属性形式の caption も
  Markdown として解釈されるので不要と判断して削除した。`::: {#fig:…}` で囲んでも、Pandoc では div のまま
  pandoc-crossref に渡り（中身が画像でないので図にならない）、プレビューでは `:::` の行がそのまま出る

---

## 9. テスト

- `test/fixtures/`：Pandoc と拡張で共有するサンプル（`syntax.md` は記法、`samples.md` は和文ノード・pgfplots・tikz-feynhand・braids・xy-pic など、`error.md` はエラー）。
  修論に TikZ がないため自作。
- 統合テスト（`scripts/test-integration.sh tikz`）：VSCodium + `@vscode/test-electron`。`markdown.api.render` の HTML を検査する。
  キャプション付きの図と従来の図、`~~~` フェンス、キャッシュ、`tikz {#fig:x}`、エラー表示と Diagnostics、サンプル全部、直前の SVG を薄く表示、debounce、
  エラーからの回復、キャッシュの削除、フォーマットなしの行番号換算、信頼されていないワークスペース。
- スクリーンショット（`scripts/screenshot.sh tikz`）：Playwright で実際のプレビューをライト・ダークで撮る。
