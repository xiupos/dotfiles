// Integration tests: VSCodium + @vscode/test-electron (run under xvfb-run).
import { spawn } from "child_process";
import * as path from "path";
import { runTests } from "@vscode/test-electron";
import { codiumPath, extRoot, launchArgs, makeWorkspace } from "./workspace";

const extensionTestsPath = path.join(extRoot, "out", "test", "suite", "index.js");

/**
 * @vscode/test-electron always passes --disable-workspace-trust, so the
 * untrusted case launches VSCodium directly with otherwise the same arguments.
 */
function runUntrusted(exe: string, ws: string): Promise<void> {
  const args = [
    ws,
    ...launchArgs({ workspaceTrust: true }),
    "--disable-updates",
    "--no-cached-data",
    `--extensionTestsPath=${extensionTestsPath}`,
    `--extensionDevelopmentPath=${extRoot}`,
  ];
  return new Promise((resolve, reject) => {
    const p = spawn(exe, args, { stdio: "inherit", env: { ...process.env, TIKZ_TEST_MODE: "untrusted" } });
    p.on("error", reject);
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`untrusted run failed with code ${code}`))));
  });
}

async function main() {
  const exe = codiumPath();
  const only = process.argv[2];

  if (!only || only === "trusted") {
    const ws = makeWorkspace();
    console.log(`--- trusted (workspace ${ws})`);
    await runTests({
      vscodeExecutablePath: exe,
      extensionDevelopmentPath: extRoot,
      extensionTestsPath,
      launchArgs: [ws, ...launchArgs()],
      extensionTestsEnv: { TIKZ_TEST_MODE: "trusted" },
    });
  }

  if (!only || only === "untrusted") {
    const ws = makeWorkspace();
    console.log(`--- untrusted (workspace ${ws})`);
    await runUntrusted(exe, ws);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
