# Pandoc

## 使い方

```bash
# 英文レポート / 和文レポート
pandoc -d article test.md -o test.pdf
pandoc -d article-ja test.md -o test.pdf

# 英文書籍 / 和文書籍
pandoc -d book test.md -o test.pdf
pandoc -d book-ja test.md -o test.pdf
```

### 文献の引用

`[@Kugo:1989]` のようにキーを書くだけで、Refdir のライブラリ (`$REFDIR`、なければ `~/Literature`) から引用される。
biblatex + biber で、スタイルは `hepja` (`~/.local/share/texmf/tex/latex/hepja`)：JHEP 風の引用順の番号で、`langid = {japanese}` の文献は和文の書き方 (姓名、『書名』、訳者) になる。

latexmk が LaTeX の各回の後に `refdir bib` で引用分を `<job>-refdir.bib` に書き出す (`~/.latexmkrc`)。
ライブラリにないキーは INSPIRE の texkey として Refdir に追加される。
