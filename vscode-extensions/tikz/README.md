# TikZ Markdown Preview

VS Code 標準の Markdown プレビューで、` ```tikz ` のコードブロックを本物の pdflatex で描画する拡張。
Pandoc（`~/.local/share/pandoc/filters/tikz.lua`）と同じ記法で、キャプション・ラベル付きの図も書ける。

## 記法

````md
```{.tikz #fig:circle caption="半径 $r$ の円"}
\begin{tikzpicture}
  \draw (0,0) circle (1);
\end{tikzpicture}
```

```{.tikz #fig:cd caption="可換図式．$h \circ f = k \circ g$．引用 [@key] も書ける．"}
\begin{tikzcd} A \arrow[r, "f"] & B \end{tikzcd}
```

```tikz
\begin{tikzpicture} \draw (0,0) -- (1,1); \end{tikzpicture}
```

[@fig:circle] と [@fig:cd] を見よ．
````

- 中身は環境（`tikzpicture`、`tikzcd`、`\xymatrix{…}` など）だけを書く。プリアンブルや `\begin{document}` は書かない。
- `caption` は Markdown として扱われる（数式、強調、引用）。
- `caption` にインラインコード（`` ` ``）を書くときは、フェンスを `~~~{.tikz …}` にする（VS Code のプレビューは ```` ``` ```` の行にバッククォートを許さない）。
- ラベルもキャプションもない ` ```tikz ` は、PDF では番号なしの図になる。
- Pandoc では `#fig:` の図に pandoc-crossref が番号を振り、`[@fig:…]` が `\cref` になる。
  **プレビューでは図番号を出さず、`[@fig:…]` も解決しない。**

## プレビューの動き

- 入力が止まって 0.5 秒ほどで描き直す。描き直している間は、直前の図を薄く表示する。
- 結果は拡張の保存領域（globalStorage）にキャッシュされる。同じ図は二度コンパイルしない。
- エラーはプレビューに枠で表示する（TeX のログの該当部分）。
- ダークテーマでは、図の黒を文字色に、白を背景色に置き換える。薄い色で塗った上の黒文字は読みにくくなるので、
  気になるときは `tikz.preview.adaptToTheme` をオフにする。
- 信頼されていないワークスペースでは描画しない。

## 必要なもの

- `pdflatex`（TeX Live。`standalone`、`mylatexformat`、`bxcjkjatype` と、プリアンブルで使うパッケージ）
- `pdftocairo`（poppler）
- 和文には `font-ja.sty` の TTF（chezmoi の `.chezmoiexternal.toml` で `TEXMFHOME` に入る）

## 設定

| 設定 | 既定値 | 説明 |
|---|---|---|
| `tikz.preamble.files` | `common.sty`、`font-ja.sty`（`~/.local/share/pandoc/includes/`） | プリアンブルに `\input` するファイル。`~`、`${workspaceFolder}`、ワークスペースからの相対パス |
| `tikz.preamble.extra` | `""` | 追加の LaTeX |
| `tikz.preamble.japanese` | `true` | `bxcjkjatype` を読み込む（和文用） |
| `tikz.preview.adaptToTheme` | `true` | ダークテーマに合わせて黒と白を置き換える |
| `tikz.preview.scale` | `1.3` | 図の表示倍率（PDF での大きさに対して）。プレビューの幅より大きくはならない |
| `tikz.render.delay` | `500` | 最後の編集から描画までの待ち時間（ms） |
| `tikz.render.timeout` | `20000` | pdflatex を止めるまでの時間（ms） |
| `tikz.render.concurrency` | `2` | 同時にコンパイルする図の数 |
| `tikz.path.pdflatex` | `pdflatex` | |
| `tikz.path.pdftocairo` | `pdftocairo` | |

プロジェクト独自のプリアンブルがあるときは、ワークスペースの `.vscode/settings.json` で足す：

```json
{
  "tikz.preamble.files": [
    "~/.local/share/pandoc/includes/common.sty",
    "~/.local/share/pandoc/includes/font-ja.sty",
    "extra.sty"
  ]
}
```

## コマンド

- **TikZ: Clear Rendered Figure Cache**：描画結果のキャッシュを消す
- **TikZ: Rebuild Preamble Format**：プリアンブルのフォーマット（`.fmt`）を作り直す。
  `\input` したファイルの中からさらに読み込んでいるファイルを変えたときに使う
- **TikZ: Show Log**：コンパイルのログ（出力チャネル「TikZ」）を開く

## インストールと開発

`chezmoi apply` で `.chezmoiscripts/run_onchange_after_vscode-extensions.sh.tmpl` が
`vscode-extensions/scripts/install.sh` を呼び、`code` と `codium` に入れる。
仕様は [SPEC.md](SPEC.md)、開発のルールは [CLAUDE.md](CLAUDE.md) と [../CLAUDE.md](../CLAUDE.md)。
