// Integration tests (run via scripts/test-integration.sh tikz [trusted|untrusted]).
import { runIntegrationTests } from "../../shared/testing";
import { extRoot, tikzWorkspace } from "./workspace";

runIntegrationTests(
  extRoot,
  [
    { name: "trusted", workspace: tikzWorkspace() },
    { name: "untrusted", workspace: tikzWorkspace(), workspaceTrust: true },
  ],
  process.argv[2],
).catch((e) => {
  console.error(e);
  process.exit(1);
});
