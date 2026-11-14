// tikz-specific test setup (generic helpers live in ../../shared/testing.ts).
import * as path from "path";
import { findExtRoot, makeWorkspace } from "../../shared/testing";

export const extRoot = findExtRoot(__dirname);
/** chezmoi source directory */
export const chezmoiRoot = path.resolve(extRoot, "..", "..");
export const pandocIncludes = path.join(chezmoiRoot, "private_dot_local", "private_share", "pandoc", "includes");

/** A workspace with the fixtures, using the preamble from the chezmoi source (not the applied copy in ~). */
export function tikzWorkspace(): string {
  return makeWorkspace(path.join(extRoot, "test", "fixtures"), {
    "tikz.preamble.files": [path.join(pandocIncludes, "common.sty"), path.join(pandocIncludes, "font-ja.sty")],
    "tikz.render.delay": 50,
  });
}
