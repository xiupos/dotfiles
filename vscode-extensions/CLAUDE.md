# vscode-extensions

個人用の VS Code 拡張を置く場所。chezmoi のソースディレクトリ（`~/.local/share/chezmoi`）の中にあるが、
`.chezmoiignore` でホームには展開しない。インストールは `.chezmoiscripts/run_onchange_after_vscode-extensions.sh.tmpl`
が `scripts/install.sh` を呼んで行う。

## 守ること

- `chezmoi apply` は実行しない（ホームディレクトリが書き換わる）。確認は `chezmoi diff` / `chezmoi apply --dry-run` まで。
- コミットの接頭辞は `vscode-extensions:`（Pandoc の設定なら `pandoc:`）。
- 実行時の依存は Node の標準モジュールだけ。esbuild で1ファイルにバンドルし、`vsce package --no-dependencies` で包む。
- 依存の区分（ルートの `package.json`）：
  - `dependencies`：ビルドとパッケージに要るもの（esbuild、vsce）。`install.sh` は `npm ci --omit=dev` でこれだけを入れる。
  - `devDependencies`：型検査とテスト（typescript、`@types/*`、mocha、`@vscode/test-electron`、playwright-core）。
  - install script（esbuild の postinstall など）は `allowScripts` で拒否してある。なくても動く。

## 検証

- **統合テスト**（普段はこれで回す）：`scripts/test-integration.sh [拡張名] [trusted|untrusted]`
  - VSCodium を `scripts/fetch-codium.sh` が**バージョン固定の URL** から `.cache/` に取得する（最新版の問い合わせはしない）。
    上げるときは `VERSION` を手で書き換える。
  - **VSCodium を実画面に出さない。** Wayland のセッションでは、Electron は `WAYLAND_DISPLAY` があると
    `xvfb-run` の下でも実画面に出る。スクリプトは `WAYLAND_DISPLAY` と `ELECTRON_OZONE_PLATFORM_HINT` を外して
    `xvfb-run` で起動し、VSCodium には `--ozone-platform=x11` を付ける。`runTest.js` / `screenshot.js` は
    `xvfb-run` の外で直接起動すると中止する（`test/workspace.ts` の `ensureHeadless`）。必ずスクリプト経由で実行する。
  - `--no-sandbox --disable-gpu`、`--user-data-dir` と `--extensions-dir` は毎回新しい一時ディレクトリ。
    D-Bus、GPU、Fontconfig の警告は無視してよい。
  - `@vscode/test-electron` は常に `--disable-workspace-trust` を付けるので、Workspace Trust を確かめるテストは
    VSCodium を直接起動する（`tikz/test/runTest.ts` の `runUntrusted`）。
  - プレビューに渡る HTML は `vscode.commands.executeCommand('markdown.api.render', document)` で文字列として取れる。
- **スクリーンショット**（節目ごと。1回に1分ほどかかる）：`scripts/screenshot.sh <拡張> [出力先]`（Playwright の `_electron.launch`）。
  既定の出力先は `<拡張>/screenshots/`（git では無視）。
  撮った PNG は Read で目で確かめる。

## 拡張を追加する手順

1. `<name>/` を作り、`package.json`（`publisher: xiupos`、`main: ./dist/extension.js`）、`esbuild.mjs`、
   `tsconfig.json`（`../tsconfig.base.json` を継承）、`.vscodeignore`、`src/`、`test/` を置く。`tikz/` を手本にする。
2. ルートの `package.json` の `workspaces` に `<name>` を足し、`npm install`。
3. `<name>/package.json` の scripts に `build`、`typecheck`、`test`、`package` を用意する
   （`install.sh` は `npm run package` で `dist/<name>.vsix` ができることを前提にする）。
4. `<name>/CLAUDE.md` に、その拡張に固有のルールを書く。
