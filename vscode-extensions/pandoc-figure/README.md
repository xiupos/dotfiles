# Pandoc Figures in Markdown Preview

VS Code 標準の Markdown プレビューで、Pandoc と同じように画像を図として表示する拡張。

```md
![曲線．$x(τ)$ は **パラメータ** $τ$ で表される．](img/curve.svg){#fig:curve width=50%}
```

- **段落に画像が1つだけ**で、alt（`[...]` の中）が空でないとき、図（`<figure>`）にして alt をキャプションとして表示する。
  キャプションは Markdown として描くので、数式や強調もそのまま出る。
- 文中の画像、alt が空の画像、リンクの中の画像、詰まったリストの中の画像は図にしない（Pandoc の implicit_figures と同じ）。
- 画像の直後の `{...}` を Pandoc の属性として読み、本文からは消す。
  - `width` / `height`：表示の大きさ（単位は `px`、`cm`、`mm`、`in`、`%`。単位なしは `px`）
  - `.class`：画像のクラス
  - `#id`：図なら `<figure>` の id、文中の画像なら `<img>` の id
- 図番号の表示と `[@fig:…]` の解決はしない。

設定はない。外部コマンドを使わないので、信頼されていないワークスペースでも動く。
` ```tikz ` の図は [tikz](../tikz/README.md) 拡張が描く（見た目を揃えてある）。
