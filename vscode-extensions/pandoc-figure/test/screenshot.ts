// Screenshots of the preview (run via scripts/screenshot.sh pandoc-figure [outDir]).
import * as path from "path";
import { findExtRoot, makeWorkspace, takeScreenshots } from "../../shared/testing";

const extRoot = findExtRoot(__dirname);

takeScreenshots({
  extRoot,
  workspace: () => makeWorkspace(path.join(extRoot, "test", "fixtures")),
  files: ["figures.md"],
  outDir: path.resolve(process.argv[2] || path.join(extRoot, "screenshots")),
  ready: () => document.querySelectorAll(".pandoc-figure img").length > 0,
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
