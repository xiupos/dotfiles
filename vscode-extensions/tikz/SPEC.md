# tikz — 仕様書

Pandoc（Markdown → LaTeX → PDF）で書く文書の ` ```tikz ` ブロックを、
VS Code 標準の Markdown プレビューで本物の TeX によって描画する拡張と、
同じ記法を解釈する Pandoc フィルタ（`~/.local/share/pandoc/filters/tikz.lua`）の仕様。

拡張 ID は `xiupos.tikz`。

---

## 0. 調査結果（M0）

### dotfiles の Pandoc 設定

- defaults は `article` / `book` と、それぞれの和文版 `article-ja` / `book-ja`（`bxjsarticle` / `bxjsbook`、`pdflatex`、`pandoc` オプション）。
  和文版は `common-lang-ja.yaml` を通して `font-ja.sty`（Source Han の TTF を `bxcjkjatype` で使う）、`cleveref-ja.sty`、`amsthm-ja.sty` を読み込む。
- `common.sty` は tikz、pgfplots、tikz-cd、xy、tikz-feynhand、braids と各種 TikZ ライブラリ、`subfig`、`caption`、`cleveref` などを読み込む。
- Pandoc のテンプレート自体も、`xcolor`（`dvipsnames,svgnames,x11names`）、`amsmath,amssymb`、`fontenc[T1]`、`lmodern` を読み込む。
- フィルタの順序（`common-base.yaml`）：
  `include-files.lua` → `unicode-math.lua` → `pandoc-crossref` → `citeproc` → `fenced-divs.lua` → `codeblock.lua` → `url-encode.lua` → `dedupe-table-label.lua`
- `codeblock.lua` は TikZ の処理だけをしている（`figure` + `\centering` で包む。キャプションなし、図番号なし）。
- `metadata.cref: true` なので、`[@fig:x]` は `\cref{fig:x}` になる。

### 修論（`~/Researches/thesis_MSc`）

- ビルド：`just`（既定のレシピは `book`）→ `pandoc -d book-ja -d zotero --lua-filter ja-spacing.lua thesis.md -o thesis.pdf`。
  各章は `include-files.lua` で読み込む。
- **TikZ の図は1つもない。** 図はすべて Excalidraw の SVG を
  `![キャプション](./img/x.excalidraw.svg){#fig:01a1969f-… width=100%}` の形で入れている。
  ラベルは UUID 風（`fig:` + 英数字とハイフン）。ラベルのない図もある。
- 参照は `[@fig:…]`、`[@sec:…]`。`\begin{figure}`、subfig は使っていない。

### 参考：実際に TikZ を使っている文書（`~/Researches/IU/ja_commentary/book`）

- `-d book-ja` に、プロジェクト独自の `skill-extra-book.sty`（`\usetikzlibrary{backgrounds, fit}`、`\pgfplotsset{compat=1.18}`、`tensor`、`\input{notation_glossary.tex}` など）を追加している。
- `tikzpicture` が 11 個。どれも ` ```tikz ` ではなく、` ```{=latex} ` の中に
  `\begin{figure}[htbp]\centering … \caption{…}\label{fig:2.chiral}\end{figure}` を手で書いている。
  ` ```tikz ` だとキャプションとラベルを付けられなかったため。
- ノードの中に和文が多い（`{スカラー $\phi$}`、`align=center` と `\\` で改行など）。

### 事前の動作確認

- `standalone` + テンプレート相当のパッケージ + `bxcjkjatype[whole]` + `common.sty` + `font-ja.sty` で、和文ノードを含む図が pdflatex で通り、`pdftocairo -svg` で SVG になる。
- mylatexformat で上のプリアンブルをダンプできる（`.fmt` は約 9.8 MB）。
  1枚あたり：毎回読み込む場合は約 1.3 秒、ダンプしたフォーマットを使う場合は約 0.58 秒。ダンプ自体は約 1.2 秒。
  ダンプ元のファイルは、プリアンブルの後に `\begin{document}\end{document}` が必要（ないと Emergency stop）。
- pandoc 3.13 + pandoc-crossref 0.3.26a では、`Figure` の中身が `\hypertarget{…}{…}` で包まれず、
  tikz-cd の `&` もそのまま出力された（`lrbox` での回避は不要な見込み。M1 で PDF まで通して確定する）。
- `pdftocairo` の SVG では、黒は `rgb(0%, 0%, 0%)` で表される。

---

## 1. 記法

Pandoc と拡張で共通。ブロックの中身は環境（`tikzpicture`、`tikzcd` など）だけを書き、
`\documentclass`、プリアンブル、`\begin{document}` は書かない。

### 1.1 属性形式

````md
```{.tikz #fig:circle caption="半径 $r$ の円"}
\begin{tikzpicture} \draw (0,0) circle (1); \end{tikzpicture}
```
````

- クラスの先頭が `tikz` のフェンス。
- `#id`：任意。参照するなら `fig:` で始める。
- `caption="…"`：任意。中身は **Markdown** として解釈する（数式、強調、引用 `[@key]` も可）。
- id か caption のどちらかがあれば「キャプション付きの図」、どちらもなければ 1.3 と同じ扱い。

### 1.2 div 形式

````md
::: {#fig:cd}
```tikz
\begin{tikzcd} A \arrow[r] & B \end{tikzcd}
```

長いキャプション．$A \to B$ や **強調**、引用 [@key] も書ける．
:::
````

- 条件：div の id が `fig:` で始まり、かつ div の**最初のブロック**が tikz のフェンス。
  （tikz のフェンスは ` ```tikz ` でも `{.tikz}` でもよい。フェンス側の id や caption 属性は無視する。）
- 残りのブロック（段落いくつでも）がキャプションになる。
- 条件を満たさない div（`.screen`、`.proof` など）には何もしない。

### 1.3 従来の形式

````md
```tikz
\begin{tikzpicture} ... \end{tikzpicture}
```
````

ラベルもキャプションもない図。Pandoc の出力は今までと完全に同じ。

---

## 2. Pandoc での出力（`filters/tikz.lua`）

| 記法 | 出力 |
|---|---|
| 1.3 従来形式 | `\begin{figure}` `\centering` 中身 `\end{figure}`（RawBlock、従来どおり。図番号なし） |
| 1.1 / 1.2 | Pandoc の `Figure` 要素（中身は RawBlock の LaTeX、キャプションは Markdown の AST、id はそのまま）。番号付けと `\label` は pandoc-crossref に任せる |

- `[@fig:…]` は pandoc-crossref が解決する（`cref: true` なら `\cref{…}`）。
- id はあるがキャプションがない場合：番号付きの図で、キャプションは空（PDF では「図3」とだけ出る）。
- キャプションはあるが id がない場合：番号付きの図で、参照はできない。
- float の位置指定（`[htbp]`）は付けない（Pandoc の画像の図と同じ）。

### フィルタの位置

`common-base.yaml` の `filters` で、**`include-files.lua` の直後、`unicode-math.lua` より前**に置く。

- `pandoc-crossref` より前：crossref に `Figure` として番号を振らせるため。
- `unicode-math.lua` より前：caption 属性の文字列はこのフィルタで初めて AST になるので、
  後ろに置くとキャプション内の `$α$` などが変換されず、pdflatex でエラーになる。
- `include-files.lua` より後：取り込んだ章の中のブロックも処理するため。

`codeblock.lua` は TikZ の処理しかしていないため削除し、`tikz.lua` で置き換える。

### `\hypertarget` 問題

pandoc 3.1.3 では `Figure` の中身が `\hypertarget{id}{…}` の引数に入り、tikz-cd の `&` が壊れたため、
試作では `lrbox` で figure の外に組んでいた。pandoc 3.13 + pandoc-crossref 0.3.26a では包まれず、
tikz-cd を含む文書が `-d book-ja -d zotero` / `-d article-ja -d zotero` で PDF まで通ったので、**`lrbox` は使わない**。
pandoc を上げて再発したら `lrbox` 方式に戻す。

### M1 での確認結果

- `test/fixtures/syntax.md` と `samples.md`（＋キャプション中の引用）を、修論と同じ
  `-d book-ja -d zotero --lua-filter ja-spacing.lua` と `-d article-ja …` で PDF にした。
  図1〜11 の番号、`\cref` による参照（「図 1 と 11」）、キャプション中の `α` の変換、キャプション中の natbib 引用、
  div 形式の複数段落のキャプション、tikz-cd / pgfplots / tikz-feynhand / braids / xy-pic がすべて正しく出た。
- 従来形式の出力は、旧 `codeblock.lua` と1文字も違わない。
- `xy-pic` の `\xymatrix` を単独で書くと、`\centering` があっても左寄せになる（従来形式でも同じ。TeX の挙動）。
- 確認方法：chezmoi のソースの `pandoc/` を `XDG_DATA_HOME` 下にコピーし（`include-files.lua` はホームから）、
  mise の pandoc / pandoc-crossref の実体を PATH の先頭に置いて実行する。
  `--data-dir` だけでは、defaults の `defaults:` で継承する先がホームの `~/.local/share/pandoc` から読まれてしまう。
  `mise exec` を `XDG_DATA_HOME` を変えた状態で呼ぶと、mise がツールを入れ直してしまうので注意。

---

## 3. プレビューでの表示

対象は VS Code 標準の Markdown プレビュー（`markdown.markdownItPlugins` → `extendMarkdownIt`）。

### 3.1 HTML

```html
<figure class="tikz-figure" data-line="…">
  <div class="tikz-svg">…インライン SVG…</div>
  <figcaption>…md.renderInline / md.render したキャプション…</figcaption>
</figure>
```

- 見た目は Markdown の画像と同程度。中央寄せ、横幅がはみ出す場合は縮小（`max-width: 100%`）。
- 図番号は表示しない。`[@fig:…]` は解決しない（本文中でもキャプション中でもテキストのまま）。
- キャプション：属性形式は `md.renderInline`、div 形式は残りのブロックを `md.render` 相当で描く。
  標準プレビューの数式（KaTeX）がキャプションにも効くことを M2 で確認する。
- SVG はインラインで埋め込む（ダークテーマで `currentColor` を効かせるため）。
  `pdftocairo` の SVG は `glyph0-1`、`clip1` のような id を使うので、図ごとに id へ接頭辞を付けて衝突を防ぐ。
  - 標準プレビューのサニタイズでインライン SVG が消える場合は、`<img src="data:image/svg+xml;base64,…">` に切り替え、
    ダークテーマには CSS の `filter` で対応する（M2 で確認して決め、ここを更新する）。
- 1.2 の div 形式は自前の block rule で処理し、`:::` の行はプレビューに出さない。条件を満たさない div には触れない。

### 3.2 状態ごとの表示

| 状態 | 表示 |
|---|---|
| キャッシュあり | SVG + キャプション |
| 描画中（初回） | プレースホルダー（「TikZ を描画中…」）+ キャプション |
| 描画中（2回目以降） | 同じブロックで最後に成功した SVG を薄く表示 + キャプション |
| エラー | 枠付きのエラー表示（4 節）+ キャプション。直前の SVG があれば薄く併記 |
| 信頼されていないワークスペース | 「Workspace Trust がないため TikZ を描画しません」+ ソースを `<pre>` で表示 |

「同じブロック」は、文書の URI とブロックの出現順（何番目の tikz ブロックか）で識別する。

### 3.3 ダークテーマ

設定 `tikz.preview.adaptToTheme`（既定 `true`）がオンのとき、SVG の
黒（`rgb(0%, 0%, 0%)`、`#000` など）を `currentColor` に、白を背景色（`var(--vscode-editor-background)` 相当）に置き換える。
その他の色はそのまま。

---

## 4. 描画の流れ

1. **プリアンブルを組み立てる**（6 節）。
2. **フォーマットをダンプする**：`pdflatex -ini -jobname=<hash> "&pdflatex" mylatexformat.ltx <src>`。
   キーは `hash(プリアンブルの内容 + pdflatex --version の1行目)`。`globalStorageUri/fmt/` に置く。
   ダンプに失敗したら、そのプリアンブルでは毎回読み込む通常のコンパイルに切り替える（ログに理由を出す）。
3. **コンパイル**：図ごとに一時ディレクトリを作り、
   `pdflatex -interaction=nonstopmode -halt-on-error -no-shell-escape` を実行 → `pdftocairo -svg`。
   - `TEXINPUTS` に Markdown ファイルのディレクトリとワークスペースのルートを足す（`\input`、`\includegraphics` の相対パス用）。
   - タイムアウト（`tikz.render.timeout`、既定 20 秒）で kill。同時実行数の上限（`tikz.render.concurrency`、既定 2）。
4. **キャッシュ**：キーは `hash(拡張のバージョン + プリアンブルのハッシュ + 図のコード)`。メモリと `globalStorageUri/svg/` の両方。
5. **プレビューの更新**：描画が終わったら debounce をかけて `markdown.preview.refresh` を1回だけ呼ぶ。
   入力が止まってから約 0.5 秒後に描画を始める（打鍵ごとにコンパイルしない）。

依存は Node の標準モジュールのみ（`child_process`、`fs`、`crypto`、`path`、`os`）。esbuild で1ファイルにバンドルする。
外部コマンドとして `pdflatex`、`pdftocairo` を使う（パスは設定で変更可能）。

---

## 5. エラー時の挙動

- **プレビュー**：TeX のログから `!` で始まる行と、その後ろ数行（`l.<n>` の行まで）を抜き出し、枠で表示する。
  ログが読めない場合（タイムアウト、コマンドが見つからない等）は、その理由を表示する。
- **Problems パネル**：Diagnostics（source: `tikz`）を出す。
  行番号は、コンパイルに使ったファイルでの行番号から、ブロックの前に付けた行数（プリアンブルなど）を差し引き、
  **Markdown ファイルの行番号に換算**する。プリアンブル内のエラーなど換算できないものは、フェンスの開始行に付ける。
- エラーになった結果もキャッシュする（同じコードを何度もコンパイルしない）。プリアンブルが変われば作り直す。
- 出力チャネル「TikZ」に、実行したコマンド、所要時間、ログの場所を出す。
- `pdflatex` / `pdftocairo` が見つからないときは、一度だけ通知を出し、各ブロックにはエラーとして表示する。

---

## 6. プレビュー用プリアンブルの決め方

Pandoc の `-d article-ja` / `-d book-ja` の出力に近づける。組み立て順：

```latex
\PassOptionsToPackage{dvipsnames,svgnames,x11names}{xcolor}
\documentclass[border=2pt]{standalone}      % tikz オプションの有無は M2 で検証して決める
\usepackage{xcolor}
\usepackage{amsmath,amssymb}
\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage[whole]{bxcjkjatype}              % tikz.preamble.japanese が true のとき
\input{<tikz.preamble.files の各ファイル>}   % 順に
<tikz.preamble.extra>
```

| 設定 | 既定値 | 説明 |
|---|---|---|
| `tikz.preamble.files` | `["~/.local/share/pandoc/includes/common.sty", "~/.local/share/pandoc/includes/font-ja.sty"]` | 読み込むファイル。`~`、`${workspaceFolder}`、ワークスペースからの相対パスが使える。ワークスペース設定で上書きして、プロジェクト独自の `.sty` を足せる |
| `tikz.preamble.extra` | `""` | 追加の LaTeX |
| `tikz.preamble.japanese` | `true` | `bxcjkjatype` を読み込み、和文を通す。`font-ja.sty` は `\setminchofont` があるときだけ効くので、この設定と組みで使う |
| `tikz.preview.adaptToTheme` | `true` | 3.3 |
| `tikz.render.timeout` | `20000`（ms） | |
| `tikz.render.concurrency` | `2` | |
| `tikz.path.pdflatex` / `tikz.path.pdftocairo` | `pdflatex` / `pdftocairo` | |

- 文書クラスの違い（`bxjsbook` と `standalone`）による文字の大きさの差は再現しない（どちらも 10pt 相当の本文フォントで描かれる。12pt の文書では PDF の図の文字の方が大きく見える場合がある）。
- `font-ja.sty` は TTF のパスを `TEXMFHOME` から探す。拡張は VS Code の環境変数をそのまま子プロセスに渡す。

---

## 7. やらないこと

- プレビューでの図番号の表示、`[@fig:…]` の解決、pandoc-crossref の再現
- node-tikzjax / TikZJax による描画
- PNG・PDF への書き出し
- Marketplace / Open VSX への公開
- ` ```{=latex} ` の raw ブロックの中にある `tikzpicture` のプレビュー
- `width=` などの大きさの属性（Pandoc 側でも未対応。8 節の候補）
- subfig（1つの図に複数の TikZ）

---

## 8. 修論・既存文書の書き方との食い違いと提案

1. **修論には TikZ がない。** 動作確認用のサンプルは、IU の解説書の 11 個の `tikzpicture` を元に作るのが現実的。
   ただし dotfiles は公開リポジトリなので、そのままコピーしてよいかは確認したい（代案：構造だけ真似た自作サンプル）。
2. **既存の TikZ は raw LaTeX の figure で書かれている。** この記法なら次のように置き換えられ、プレビューもできる：
   ````md
   ::: {#fig:2.chiral}
   ```tikz
   \begin{tikzpicture}[>=Stealth,node distance=10mm] … \end{tikzpicture}
   ```

   カイラル多重項の成分と超対称変換の関係…
   :::
   ````
   移行は任意。既存の raw ブロックはそのまま動く。
3. **プロジェクト独自のプリアンブル**（`skill-extra-book.sty` など）は、ワークスペース設定の `tikz.preamble.files` に追加する。
   Pandoc の defaults を自動で読み取ることはしない（defaults の継承や `${.}` の解決を再現するのは割に合わない）。
4. **float の位置**：既存の raw 図は `[htbp]`、Pandoc の `Figure` は位置指定なし。揃えたい場合は Pandoc の変数 `fig-pos: htbp` を使える（defaults の変更になるので、今回は行わない）。
5. **大きさの指定**：修論の画像は `width=75%` などを使っている。TikZ でも `width=` を `\resizebox` などに変換する案があるが、今回はやらない（将来の候補）。
