// Screenshots of the preview (run via scripts/screenshot.sh tikz [outDir]).
import * as path from "path";
import { takeScreenshots } from "../../shared/testing";
import { extRoot, tikzWorkspace } from "./workspace";

takeScreenshots({
  extRoot,
  workspace: tikzWorkspace,
  files: ["syntax.md", "samples.md", "error.md"],
  outDir: path.resolve(process.argv[2] || path.join(extRoot, "screenshots")),
  ready: () => {
    const figs = [...document.querySelectorAll(".tikz-figure")];
    return figs.length > 0 && figs.every((e) => e.getAttribute("data-tikz-state") !== "pending");
  },
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
