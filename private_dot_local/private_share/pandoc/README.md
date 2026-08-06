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

### Zotero文献の引用

Better BibTeX の auto-export 先 (`~/Zotero/better-bibtex/my-library.bib`) を natbib+JHEP.bst で引用。
`-d zotero` は必ず最後に指定すること！

```bash
pandoc -d article -d zotero test.md -o test.pdf
pandoc -d book-ja -d zotero test.md -o test.pdf
```
