# vscode-extensions

個人用の VS Code 拡張を置く場所。chezmoi のソースディレクトリ（`~/.local/share/chezmoi`）の中にあるが、
`.chezmoiignore` でホームには展開しない。インストールは `.chezmoiscripts/run_onchange_after_vscode-extensions.sh.tmpl`
が `scripts/install.sh` を呼んで行う。

| 拡張 | 内容 |
|---|---|
| `tikz/` | ` ```tikz ` を pdflatex で描いてプレビューに出す（Pandoc フィルタと記法を共有） |
| `pandoc-figure/` | 段落に1つだけの画像を、alt をキャプションにした図として出す（Pandoc の implicit_figures） |

`shared/` は拡張どうしで共有するコード（`pandoc-attrs.ts`：Pandoc の属性の解釈、`testing.ts`：VSCodium の起動、
統合テスト、スクリーンショット）。各拡張の esbuild がバンドルするので、実行時の依存にはならない。
`shared/` を変えると、`install.sh` は全部の拡張を入れ直す。

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
    `xvfb-run` の外で直接起動すると中止する（`shared/testing.ts` の `ensureHeadless`）。必ずスクリプト経由で実行する。
  - `--no-sandbox --disable-gpu`、`--user-data-dir` と `--extensions-dir` は毎回新しい一時ディレクトリ。
    D-Bus、GPU、Fontconfig の警告は無視してよい。
  - `@vscode/test-electron` は常に `--disable-workspace-trust` を付けるので、Workspace Trust を確かめるテストは
    VSCodium を直接起動する（`shared/testing.ts` の `runIntegrationTests` で `workspaceTrust: true` にした実行）。
  - プレビューに渡る HTML は `vscode.commands.executeCommand('markdown.api.render', document)` で文字列として取れる。
- **スクリーンショット**（節目ごと。1回に1分ほどかかる）：`scripts/screenshot.sh <拡張> [出力先]`（Playwright の `_electron.launch`）。
  既定の出力先は `<拡張>/screenshots/`（git では無視）。
  撮った PNG は Read で目で確かめる。

## 拡張を追加する手順

1. `<name>/` を作り、`package.json`（`publisher: xiupos`、`main: ./dist/extension.js`）、`esbuild.mjs`、
   `tsconfig.json`（`../tsconfig.base.json` を継承）、`.vscodeignore`、`src/`、`test/` を置く。小さな手本は `pandoc-figure/`。
   - `test/runTest.ts` は `shared/testing.ts` の `runIntegrationTests`、`test/screenshot.ts` は `takeScreenshots` を呼ぶだけにする
     （`scripts/test-integration.sh` / `scripts/screenshot.sh` が `out/test/runTest.js` / `out/test/screenshot.js` を実行する）。
   - mocha の入口は `test/suite/index.ts`（実行の種類は環境変数 `TEST_MODE`）。
2. ルートの `package.json` の `workspaces` に `<name>` を足し、`npm install`。
3. `<name>/package.json` の scripts に `build`、`typecheck`、`test`、`package` を用意する
   （`install.sh` は `npm run package` で `dist/<name>.vsix` ができることを前提にする）。
4. `<name>/CLAUDE.md` に、その拡張に固有のルールを書き、上の表に1行足す。
