# vscode-extensions

個人用の VS Code 拡張を置く場所。chezmoi のソースディレクトリ（`~/.local/share/chezmoi`）の中にあるが、
`.chezmoiignore` でホームには展開しない。インストールは `.chezmoiscripts/run_onchange_after_vscode-extensions.sh.tmpl`
が `scripts/install.sh` を呼んで行う。

## 守ること

- `chezmoi apply` は実行しない（ホームディレクトリが書き換わる）。確認は `chezmoi diff` / `chezmoi apply --dry-run` まで。
- この中と `.chezmoiignore`、`.chezmoiscripts/` の追加スクリプト以外を変えるときは、理由を添えて先に確認を取る。
- コミットはマイルストーンごと、接頭辞は `vscode-extensions:`（Pandoc の設定なら `pandoc:`）。push はしない。
- 実行時の依存は Node の標準モジュールだけ。esbuild で1ファイルにバンドルし、`vsce package --no-dependencies` で包む。
- 依存の区分（ルートの `package.json`）：
  - `dependencies`：ビルドとパッケージに要るもの（esbuild、vsce）。`install.sh` は `npm ci --omit=dev` でこれだけを入れる。
  - `devDependencies`：型検査とテスト（typescript、`@types/*`、mocha、`@vscode/test-electron`、playwright-core）。
  - install script（esbuild の postinstall など）は `allowScripts` で拒否してある。なくても動く。

## 検証

- **統合テスト**（普段はこれで回す）：`scripts/test-integration.sh [拡張名] [trusted|untrusted]`
  - VSCodium を `scripts/fetch-codium.sh` が**バージョン固定の URL** から `.cache/` に取得する（最新版の問い合わせはしない）。
    上げるときは `VERSION` を手で書き換える。
  - `xvfb-run` の下で起動。`--no-sandbox --disable-gpu`、`--user-data-dir` と `--extensions-dir` は毎回新しい一時ディレクトリ。
    D-Bus、GPU、Fontconfig の警告は無視してよい。
  - `@vscode/test-electron` は常に `--disable-workspace-trust` を付けるので、Workspace Trust を確かめるテストは
    VSCodium を直接起動する（`tikz/test/runTest.ts` の `runUntrusted`）。
  - プレビューに渡る HTML は `vscode.commands.executeCommand('markdown.api.render', document)` で文字列として取れる。
- **スクリーンショット**（節目ごと。1回に数十秒かかる）：`node <拡張>/out/test/screenshot.js`（Playwright の `_electron.launch`）。
  撮った PNG は Read で目で確かめる。
- 最終確認はユーザーが手元の VS Code 本体で行う。

## 拡張を追加する手順

1. `<name>/` を作り、`package.json`（`publisher: xiupos`、`main: ./dist/extension.js`）、`esbuild.mjs`、
   `tsconfig.json`（`../tsconfig.base.json` を継承）、`.vscodeignore`、`src/`、`test/` を置く。`tikz/` を手本にする。
2. ルートの `package.json` の `workspaces` に `<name>` を足し、`npm install`。
3. `<name>/package.json` の scripts に `build`、`typecheck`、`test`、`package` を用意する
   （`install.sh` は `npm run package` で `dist/<name>.vsix` ができることを前提にする）。
4. `<name>/CLAUDE.md` に、その拡張に固有のルールを書く。
