// Integration tests (run via scripts/test-integration.sh pandoc-figure).
import * as path from "path";
import { findExtRoot, makeWorkspace, runIntegrationTests } from "../../shared/testing";

const extRoot = findExtRoot(__dirname);

runIntegrationTests(extRoot, [{ name: "default", workspace: makeWorkspace(path.join(extRoot, "test", "fixtures")) }], process.argv[2]).catch((e) => {
  console.error(e);
  process.exit(1);
});
