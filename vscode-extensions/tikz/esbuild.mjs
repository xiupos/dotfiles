// Bundles the extension (and, with --tests, the integration tests).
import * as esbuild from "esbuild";
import { existsSync } from "fs";

const common = { bundle: true, platform: "node", format: "cjs", target: "node20", sourcemap: true, logLevel: "warning" };

if (process.argv.includes("--tests")) {
  await esbuild.build({
    ...common,
    entryPoints: ["test/runTest.ts", "test/suite/index.ts", "test/screenshot.ts"].filter((f) => existsSync(f)),
    outdir: "out/test",
    outbase: "test",
    external: ["vscode", "mocha", "@vscode/test-electron", "playwright-core"],
  });
} else {
  await esbuild.build({
    ...common,
    entryPoints: ["src/extension.ts"],
    outfile: "dist/extension.js",
    external: ["vscode"],
    minify: false,
  });
}
