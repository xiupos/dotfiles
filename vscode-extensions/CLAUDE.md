# vscode-extensions

個人用の VS Code 拡張。chezmoi のソースディレクトリの中にあるが、`.chezmoiignore` でホームには展開しない。
`chezmoi apply` で `.chezmoiscripts/run_onchange_after_vscode-extensions.sh.tmpl` が `scripts/install.sh` を呼び、
変わった拡張だけを `code` / `codium` に入れる。

| 拡張 | 内容 |
|---|---|
| `pandoc-preview/` | プレビューを Pandoc の出力に近づける：` ```tikz ` を pdflatex で描いた図に、段落に1つだけの画像をキャプション付きの図にする |

## 守ること

- 全体の `chezmoi apply` は実行しない（ホームが書き換わる）。確認は `chezmoi diff` まで。
- コミットの接頭辞は `vscode-extensions:`（Pandoc の設定なら `pandoc:`）。
- 小さく保つ。人が全部を読める量にし、テストは要点だけにする。
- TypeScript は Node がそのまま実行できる書き方にする（import は `.ts` まで書く、`enum` やコンストラクタ引数のプロパティは使わない。
  `tsconfig.base.json` の `erasableSyntaxOnly`）。パッケージは `"type": "module"`、拡張の出力は CommonJS の `dist/extension.cjs`。
- 実行時の依存は Node の標準モジュールだけ。esbuild で1ファイルにバンドルする。`vscode` を import するのは `src/extension.ts` だけにして、
  ほかはテストから直接読めるようにする。
- 依存（ルートの `package.json`）：`dependencies` はビルドとパッケージに要るもの（`install.sh` が `npm ci --omit=dev` で入れる）、
  `devDependencies` は型検査とテスト。esbuild などの install script は `allowScripts` で拒否してある（なくても動く）。

## 検証

- `npm test`（各拡張で `node --test test/*.test.ts`）と `npm run typecheck`。markdown-it にプラグインを載せて HTML を確かめる。
  tikz は実際に pdflatex で `test/fixtures/` を描く。
- VS Code の中での動き（設定、キャッシュ、プレビューの更新、見た目）は自動テストにしていない。ユーザーが手元で確かめる。
  自分で確かめる必要があるときは、次の手順を一度きりのスクリプトで行う（コミットしない）：
  - **実画面に出さない。** Wayland では Electron は `xvfb-run` の下でも `WAYLAND_DISPLAY` の画面に出る。
    `env -u WAYLAND_DISPLAY -u ELECTRON_OZONE_PLATFORM_HINT xvfb-run -a <Electron 本体> --ozone-platform=x11 --no-sandbox --disable-gpu` で起動する。
    `/usr/bin/code` はユーザーのフラグを足してすぐ戻るランチャーなので、本体（`/usr/share/code/code`）を直接起動する。
  - `--user-data-dir` と `--extensions-dir` は毎回新しい一時ディレクトリにし、`--disable-workspace-trust` を付ける
    （Workspace Trust を確かめるときは付けない）。
  - `--extensionDevelopmentPath=<拡張>`（複数可）と `--extensionTestsPath=<script.cjs>` を渡すと、`exports.run()` が拡張ホストで実行され、
    終わると VS Code も終了する。その中で `vscode.commands.executeCommand("markdown.api.render", markdownOrDocument)` を呼ぶと、
    プレビューに渡る HTML が文字列で取れる。tikz は描画が非同期なので、一度呼んで数秒待ってからもう一度呼ぶ。
  - 見た目を見るなら Playwright の `_electron.launch` で起動し、ユーザー設定の
    `"workbench.editorAssociations": { "*.md": "vscode.markdown.preview.editor" }` で Markdown をプレビューとして直接開く。
    プレビューは iframe の中にあり、隠れたタブのものも残る（高さ 0）ので、`window.innerHeight > 0` のフレームを選ぶ。
  - 本体以外の版で試すなら VSCodium を GitHub Releases の版を固定した URL から取る（環境によっては最新版を問い合わせる API に届かない）。
    `@vscode/test-electron` は常に `--disable-workspace-trust` を付けるので、Workspace Trust の確認には使えない。

## 拡張を追加する手順

1. `<name>/` に `package.json`（`publisher: xiupos`、`main: ./dist/extension.cjs`、`activationEvents` 必須、
   scripts の `build` / `typecheck` / `test` / `package`）、`tsconfig.json`、`.vscodeignore`、`src/`、`test/` を置く。`pandoc-preview/` が手本。
   `package` は `dist/<name>.vsix` を作ること（`install.sh` がそれを入れる）。
2. ルートの `package.json` の `workspaces` に足して `npm install`。
3. `<name>/CLAUDE.md` に固有のルールを書き、上の表に1行足す。
