import Mocha from "mocha";

export function run(): Promise<void> {
  const mocha = new Mocha({ ui: "bdd", timeout: 180000, color: true });
  mocha.suite.emit("pre-require", globalThis, "suite", mocha);
  if (process.env.TEST_MODE === "untrusted") {
    require("./untrusted.test");
  } else {
    require("./attrs.test");
    require("./render.test");
    require("./edit.test");
  }
  return new Promise((resolve, reject) => mocha.run((failures) => (failures ? reject(new Error(`${failures} tests failed`)) : resolve())));
}
